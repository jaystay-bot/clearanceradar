import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import Navigation from '../components/Navigation';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'Tools & Hardware', 'Appliances', 'Outdoor & Garden',
  'Flooring', 'Lighting', 'Paint', 'Plumbing',
  'Storage', 'Electronics', 'Seasonal', 'Building Materials',
  'Kitchen', 'Bath', 'Smart Home',
];

const RETAILER_LABELS = {
  home_depot: 'Home Depot',
  lowes: "Lowe's",
  walmart: 'Walmart',
};

export default function Filters() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingFilter, setEditingFilter] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadFilters(); }, [user]);

  async function loadFilters() {
    if (!user) return;
    const { data } = await supabase
      .from('user_filters')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    setFilters(data || []);
    setLoading(false);
  }

  async function toggleFilter(filterId, currentState) {
    await supabase.from('user_filters').update({ is_active: !currentState }).eq('id', filterId);
    loadFilters();
    toast.success(`Filter ${!currentState ? 'activated' : 'paused'}`);
  }

  async function deleteFilter(filterId) {
    await supabase.from('user_filters').delete().eq('id', filterId);
    loadFilters();
    toast.success('Filter deleted');
  }

  async function saveFilter(filterData) {
    setSaving(true);
    try {
      if (filterData.id) {
        await supabase.from('user_filters').update(filterData).eq('id', filterData.id);
        toast.success('Filter updated');
      } else {
        await supabase.from('user_filters').insert({ ...filterData, user_id: user.id });
        toast.success('Filter created');
      }
      setEditingFilter(null);
      loadFilters();
    } catch (err) {
      toast.error('Could not save filter');
    } finally {
      setSaving(false);
    }
  }

  const newFilter = {
    filter_name: 'New Filter',
    retailers: ['home_depot', 'lowes', 'walmart'],
    categories: [],
    min_discount_percent: 30,
    min_price: '',
    max_price: '',
    zip_code: user?.zip_code || '',
    radius_miles: 25,
    is_active: true,
  };

  return (
    <div className="app-layout">
      <div className="top-nav">
        <div className="nav-logo">
          <span className="nav-logo-text">My <span>Filters</span></span>
        </div>
        <button
          className="btn btn-primary"
          style={{ padding: '8px 14px', fontSize: 13 }}
          onClick={() => setEditingFilter(newFilter)}
        >
          + New
        </button>
      </div>

      <div className="page-content">
        {loading ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Loading...</p>
        ) : filters.length === 0 ? (
          <div className="empty-state">
            <h3 className="empty-state-title">No filters yet</h3>
            <p className="empty-state-desc">Create a filter to start receiving deal alerts.</p>
            <button className="btn btn-primary" onClick={() => setEditingFilter(newFilter)}>
              Create Filter
            </button>
          </div>
        ) : (
          filters.map(f => (
            <div key={f.id} className="filter-item">
              <div className="filter-header">
                <span className="filter-name">{f.filter_name}</span>
                <label className="toggle">
                  <input type="checkbox" checked={f.is_active} onChange={() => toggleFilter(f.id, f.is_active)} />
                  <span className="toggle-slider" />
                </label>
              </div>
              <div className="filter-tags">
                {(f.retailers || []).map(r => (
                  <span key={r} className="filter-tag">{RETAILER_LABELS[r] || r}</span>
                ))}
                <span className="filter-tag">{f.min_discount_percent}%+ off</span>
                {f.zip_code && <span className="filter-tag">📍 {f.zip_code} • {f.radius_miles}mi</span>}
                {f.min_price && <span className="filter-tag">${f.min_price}+</span>}
                {f.max_price && <span className="filter-tag">Under ${f.max_price}</span>}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn btn-secondary" style={{ flex: 1, padding: '8px', fontSize: 13 }}
                  onClick={() => setEditingFilter(f)}>Edit</button>
                <button className="btn btn-danger" style={{ padding: '8px 14px', fontSize: 13 }}
                  onClick={() => deleteFilter(f.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      <Navigation />

      {/* Edit Modal */}
      {editingFilter && (
        <FilterModal
          filter={editingFilter}
          onSave={saveFilter}
          onClose={() => setEditingFilter(null)}
          saving={saving}
        />
      )}
    </div>
  );
}

function FilterModal({ filter, onSave, onClose, saving }) {
  const [data, setData] = useState({ ...filter });

  function toggleRetailer(r) {
    setData(d => ({
      ...d,
      retailers: d.retailers.includes(r) ? d.retailers.filter(x => x !== r) : [...d.retailers, r]
    }));
  }

  function toggleCategory(c) {
    setData(d => ({
      ...d,
      categories: d.categories?.includes(c) ? d.categories.filter(x => x !== c) : [...(d.categories || []), c]
    }));
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h3 className="modal-title">{data.id ? 'Edit Filter' : 'New Filter'}</h3>

        <div className="form-group">
          <label className="form-label">Filter Name</label>
          <input className="form-input" value={data.filter_name}
            onChange={e => setData(d => ({ ...d, filter_name: e.target.value }))} />
        </div>

        <div className="form-group">
          <label className="form-label">Retailers</label>
          <div className="checkbox-group">
            {['home_depot', 'lowes', 'walmart'].map(r => (
              <button key={r} className={`checkbox-btn ${data.retailers?.includes(r) ? 'selected' : ''}`}
                onClick={() => toggleRetailer(r)}>
                {r === 'home_depot' ? 'Home Depot' : r === 'lowes' ? "Lowe's" : 'Walmart'}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Min Discount — {data.min_discount_percent}% OFF</label>
          <input type="range" className="range-slider" min={10} max={90} step={5}
            value={data.min_discount_percent}
            onChange={e => setData(d => ({ ...d, min_discount_percent: parseInt(e.target.value) }))} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group">
            <label className="form-label">Zip Code</label>
            <input className="form-input" maxLength={5} value={data.zip_code || ''}
              onChange={e => setData(d => ({ ...d, zip_code: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Radius (mi)</label>
            <input className="form-input" type="number" value={data.radius_miles || 25}
              onChange={e => setData(d => ({ ...d, radius_miles: parseInt(e.target.value) }))} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Categories (optional)</label>
          <div className="checkbox-group">
            {CATEGORIES.map(c => (
              <button key={c} className={`checkbox-btn ${data.categories?.includes(c) ? 'selected' : ''}`}
                onClick={() => toggleCategory(c)} style={{ fontSize: 12 }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => onSave(data)} disabled={saving}>
            {saving ? 'Saving...' : 'Save Filter'}
          </button>
        </div>
      </div>
    </div>
  );
}
