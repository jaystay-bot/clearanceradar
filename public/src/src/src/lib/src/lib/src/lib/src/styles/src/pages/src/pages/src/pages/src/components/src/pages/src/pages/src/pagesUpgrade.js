import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import Navigation from '../components/Navigation';
import toast from 'react-hot-toast';

const RETAILER_LABELS = { home_depot: 'Home Depot', lowes: "Lowe's", walmart: 'Walmart' };

export default function Filters() {
  const { user } = useAuth();
  const [filters, setFilters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingFilter, setEditingFilter] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadFilters(); }, [user]);

  async function loadFilters() {
    if (!user) return;
    const { data } = await supabase.from('user_filters').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
    setFilters(data || []);
    setLoading(false);
  }

  async function toggleFilter(id, current) {
    await supabase.from('user_filters').update({ is_active: !current }).eq('id', id);
    loadFilters();
    toast.success(`Filter ${!current ? 'activated' : 'paused'}`);
  }

  async function deleteFilter(id) {
    await supabase.from('user_filters').delete().eq('id', id);
    loadFilters();
    toast.success('Filter deleted');
  }

  async function saveFilter(data) {
    setSaving(true);
    try {
      if (data.id) { await supabase.from('user_filters').update(data).eq('id', data.id); }
      else { await supabase.from('user_filters').insert({ ...data, user_id: user.id }); }
      toast.success(data.id ? 'Filter updated' : 'Filter created');
      setEditingFilter(null);
      loadFilters();
    } catch { toast.error('Could not save filter'); }
    finally { setSaving(false); }
  }

  const newFilter = { filter_name: 'New Filter', retailers: ['home_depot', 'lowes', 'walmart'], categories: [], min_discount_percent: 30, zip_code: user?.zip_code || '', radius_miles: 25, is_active: true };

  return (
    <div className="app-layout">
      <div className="top-nav">
        <div className="nav-logo"><span className="nav-logo-text">My <span>Filters</span></span></div>
        <button className="btn btn-primary" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => setEditingFilter(newFilter)}>+ New</button>
      </div>
      <div className="page-content">
        {loading ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Loading...</p>
        : filters.length === 0 ? (
          <div className="empty-state">
            <h3 className="empty-state-title">No filters yet</h3>
            <p className="empty-state-desc">Create a filter to start receiving deal alerts.</p>
            <button className="btn btn-primary" onClick={() => setEditingFilter(newFilter)}>Create Filter</button>
          </div>
        ) : filters.map(f => (
          <div key={f.id} className="filter-item">
            <div className="filter-header">
              <span className="filter-name">{f.filter_name}</span>
              <label className="toggle"><input type="checkbox" checked={f.is_active} onChange={() => toggleFilter(f.id, f.is_active)} /><span className="toggle-slider" /></label>
            </div>
            <div className="filter-tags">
              {(f.retailers || []).map(r => <span key={r} className="filter-tag">{RETAILER_LABELS[r]}</span>)}
              <span className="filter-tag">{f.min_discount_percent}%+ off</span>
              {f.zip_code && <span className="filter-tag">📍 {f.zip_code} • {f.radius_miles}mi</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-secondary" style={{ flex: 1, padding: 8, fontSize: 13 }} onClick={() => setEditingFilter(f)}>Edit</button>
              <button className="btn btn-danger" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => deleteFilter(f.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      <Navigation />
      {editingFilter && (
        <div className="modal-overlay" onClick={() => setEditingFilter(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 className="modal-title">{editingFilter.id ? 'Edit Filter' : 'New Filter'}</h3>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={editingFilter.filter_name} onChange={e => setEditingFilter(f => ({ ...f, filter_name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Retailers</label>
              <div className="checkbox-group">
                {['home_depot', 'lowes', 'walmart'].map(r => (
                  <button key={r} className={`checkbox-btn ${editingFilter.retailers?.includes(r) ? 'selected' : ''}`}
                    onClick={() => setEditingFilter(f => ({ ...f, retailers: f.retailers?.includes(r) ? f.retailers.filter(x => x !== r) : [...(f.retailers || []), r] }))}>
                    {RETAILER_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Min Discount — {editingFilter.min_discount_percent}%</label>
              <input type="range" className="range-slider" min={10} max={90} step={5} value={editingFilter.min_discount_percent} onChange={e => setEditingFilter(f => ({ ...f, min_discount_percent: parseInt(e.target.value) }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Zip Code</label>
                <input className="form-input" maxLength={5} value={editingFilter.zip_code || ''} onChange={e => setEditingFilter(f => ({ ...f, zip_code: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Radius (mi)</label>
                <input className="form-input" type="number" value={editingFilter.radius_miles || 25} onChange={e => setEditingFilter(f => ({ ...f, radius_miles: parseInt(e.target.value) }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingFilter(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => saveFilter(editingFilter)} disabled={saving}>{saving ? 'Saving...' : 'Save Filter'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}