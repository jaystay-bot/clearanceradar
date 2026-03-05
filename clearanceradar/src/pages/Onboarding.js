import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'Tools & Hardware', 'Appliances', 'Outdoor & Garden',
  'Flooring', 'Lighting', 'Paint', 'Plumbing',
  'Storage', 'Electronics', 'Seasonal', 'Building Materials',
  'Kitchen', 'Bath', 'Smart Home', 'All Categories'
];

const RETAILERS = [
  { id: 'home_depot', label: 'Home Depot', color: '#FF6700' },
  { id: 'lowes', label: "Lowe's", color: '#4A9EFF' },
  { id: 'walmart', label: 'Walmart', color: '#00BFFF' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [filters, setFilters] = useState({
    filter_name: 'My Deals',
    retailers: ['home_depot', 'lowes', 'walmart'],
    categories: [],
    min_discount_percent: 30,
    min_price: '',
    max_price: '',
    zip_code: '',
    radius_miles: 25,
  });

  function toggleRetailer(id) {
    setFilters(f => ({
      ...f,
      retailers: f.retailers.includes(id)
        ? f.retailers.filter(r => r !== id)
        : [...f.retailers, id]
    }));
  }

  function toggleCategory(cat) {
    if (cat === 'All Categories') {
      setFilters(f => ({ ...f, categories: [] }));
      return;
    }
    setFilters(f => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter(c => c !== cat)
        : [...f.categories, cat]
    }));
  }

  async function saveAndGo() {
    if (filters.retailers.length === 0) {
      toast.error('Select at least one retailer');
      return;
    }
    if (!filters.zip_code) {
      toast.error('Enter your zip code');
      return;
    }

    setSaving(true);
    try {
      await supabase.from('user_filters').insert({
        user_id: user.id,
        filter_name: filters.filter_name,
        retailers: filters.retailers,
        categories: filters.categories.length > 0 ? filters.categories : null,
        min_discount_percent: filters.min_discount_percent,
        min_price: filters.min_price ? parseFloat(filters.min_price) : null,
        max_price: filters.max_price ? parseFloat(filters.max_price) : null,
        zip_code: filters.zip_code,
        radius_miles: filters.radius_miles,
        is_active: true,
      });

      // Update user zip code
      await supabase.from('users').update({ zip_code: filters.zip_code }).eq('id', user.id);

      toast.success('Alerts activated! 🎯');
      navigate('/');
    } catch (err) {
      toast.error('Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '0' }}>
      {/* Header */}
      <div style={{
        background: 'rgba(10,15,30,0.95)',
        borderBottom: '1px solid var(--border)',
        padding: '20px 20px 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="#00FF85" strokeWidth="1.5" strokeOpacity="0.4"/>
            <circle cx="16" cy="16" r="8" stroke="#00FF85" strokeWidth="1.5" strokeOpacity="0.6"/>
            <circle cx="16" cy="16" r="4" fill="#00FF85"/>
          </svg>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700 }}>
            Clearance<span style={{ color: 'var(--accent)' }}>Radar</span>
          </span>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 4, paddingBottom: 0 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: s <= step ? 'var(--accent)' : 'var(--border)',
              transition: 'background 0.3s'
            }} />
          ))}
        </div>
      </div>

      <div style={{ padding: '24px 20px', maxWidth: 430, margin: '0 auto' }}>

        {/* Step 1 - Retailers & Location */}
        {step === 1 && (
          <div className="fade-in">
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Which stores?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
              Select the retailers you want to monitor for clearance deals.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
              {RETAILERS.map(r => (
                <button
                  key={r.id}
                  onClick={() => toggleRetailer(r.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '16px',
                    background: filters.retailers.includes(r.id) ? 'rgba(0,255,133,0.05)' : 'var(--bg-card)',
                    border: `1px solid ${filters.retailers.includes(r.id) ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 12,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 8,
                    background: `${r.color}20`,
                    border: `1px solid ${r.color}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 18 }}>
                      {r.id === 'home_depot' ? '🏠' : r.id === 'lowes' ? '🔨' : '🛒'}
                    </span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{r.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {r.id === 'home_depot' ? 'Clearance scanned every 15 min' : 'Clearance scanned every 30 min'}
                    </div>
                  </div>
                  {filters.retailers.includes(r.id) && (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="var(--accent)">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>

            <div className="form-group">
              <label className="form-label">Your Zip Code</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. 23510"
                maxLength={5}
                value={filters.zip_code}
                onChange={e => setFilters(f => ({ ...f, zip_code: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Search Radius — {filters.radius_miles} miles</label>
              <input
                type="range"
                className="range-slider"
                min={5} max={100} step={5}
                value={filters.radius_miles}
                onChange={e => setFilters(f => ({ ...f, radius_miles: parseInt(e.target.value) }))}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                <span>5 mi</span><span>100 mi</span>
              </div>
            </div>

            <button className="btn btn-primary btn-full" onClick={() => setStep(2)}>
              Next →
            </button>
          </div>
        )}

        {/* Step 2 - Discount & Price */}
        {step === 2 && (
          <div className="fade-in">
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>What's a good deal?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
              Set your minimum discount and price range. We only alert you when items match.
            </p>

            <div className="form-group">
              <label className="form-label">
                Minimum Discount — <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{filters.min_discount_percent}% OFF</span>
              </label>
              <input
                type="range"
                className="range-slider"
                min={10} max={90} step={5}
                value={filters.min_discount_percent}
                onChange={e => setFilters(f => ({ ...f, min_discount_percent: parseInt(e.target.value) }))}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                <span>10%</span><span>90%</span>
              </div>
            </div>

            {/* Quick preset buttons */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              {[30, 40, 50, 70].map(pct => (
                <button
                  key={pct}
                  onClick={() => setFilters(f => ({ ...f, min_discount_percent: pct }))}
                  className={`checkbox-btn ${filters.min_discount_percent === pct ? 'selected' : ''}`}
                  style={{ flex: 1 }}
                >
                  {pct}%+
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Min Price ($)</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="No min"
                  value={filters.min_price}
                  onChange={e => setFilters(f => ({ ...f, min_price: e.target.value }))}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Max Price ($)</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="No max"
                  value={filters.max_price}
                  onChange={e => setFilters(f => ({ ...f, max_price: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => setStep(3)}>Next →</button>
            </div>
          </div>
        )}

        {/* Step 3 - Categories */}
        {step === 3 && (
          <div className="fade-in">
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Categories</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
              Pick what you flip. Leave all unselected to see everything.
            </p>

            <div className="checkbox-group" style={{ marginBottom: 28 }}>
              <button
                className={`checkbox-btn ${filters.categories.length === 0 ? 'selected' : ''}`}
                onClick={() => toggleCategory('All Categories')}
              >
                All Categories
              </button>
              {CATEGORIES.filter(c => c !== 'All Categories').map(cat => (
                <button
                  key={cat}
                  className={`checkbox-btn ${filters.categories.includes(cat) ? 'selected' : ''}`}
                  onClick={() => toggleCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Summary */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-accent)',
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Alert Summary</div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.8 }}>
                <div>📍 Within <span style={{ color: 'var(--accent)' }}>{filters.radius_miles} miles</span> of <span style={{ color: 'var(--accent)' }}>{filters.zip_code || '...'}</span></div>
                <div>🏪 <span style={{ color: 'var(--accent)' }}>{filters.retailers.length}</span> retailer{filters.retailers.length !== 1 ? 's' : ''}</div>
                <div>💰 At least <span style={{ color: 'var(--accent)' }}>{filters.min_discount_percent}% off</span></div>
                <div>🏷️ {filters.categories.length === 0 ? <span style={{ color: 'var(--accent)' }}>All categories</span> : <span style={{ color: 'var(--accent)' }}>{filters.categories.length} categories</span>}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(2)}>← Back</button>
              <button
                className="btn btn-primary"
                style={{ flex: 2 }}
                onClick={saveAndGo}
                disabled={saving}
              >
                {saving ? 'Activating...' : '🎯 Activate Alerts'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
