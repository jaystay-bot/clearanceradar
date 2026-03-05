import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import Navigation from '../components/Navigation';
import { formatDistanceToNow } from 'date-fns';

const RETAILER_LABELS = { home_depot: 'Home Depot', lowes: "Lowe's", walmart: 'Walmart' };

function DealCard({ deal, onFlag }) {
  const [showDetail, setShowDetail] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const profit = deal.original_price && deal.clearance_price ? (deal.original_price - deal.clearance_price).toFixed(2) : null;
  const timeAgo = deal.first_seen_at ? formatDistanceToNow(new Date(deal.first_seen_at), { addSuffix: true }) : '';

  return (
    <>
      <div className="deal-card" onClick={() => setShowDetail(true)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span className={`retailer-badge ${deal.retailer}`}>{RETAILER_LABELS[deal.retailer]}</span>
          {deal.category && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{deal.category}</span>}
        </div>
        <div className="deal-name">{deal.product_name}</div>
        <div className="deal-prices">
          <span className="deal-clearance-price">${parseFloat(deal.clearance_price || 0).toFixed(2)}</span>
          {deal.original_price && <span className="deal-original-price">${parseFloat(deal.original_price).toFixed(2)}</span>}
          {deal.discount_percent && <span className="deal-discount-badge">-{deal.discount_percent}%</span>}
        </div>
        {profit && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(0,255,133,0.08)', border: '1px solid rgba(0,255,133,0.2)', borderRadius: 6, padding: '3px 8px', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>💰 Save ${profit}</span>
          </div>
        )}
        <div className="deal-meta">
          <span className="deal-store">📍 {deal.store_locations?.city || 'Nearby'}</span>
          <span className="deal-time">{timeAgo}</span>
        </div>
      </div>

      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <span className={`retailer-badge ${deal.retailer}`} style={{ marginBottom: 12, display: 'inline-block' }}>{RETAILER_LABELS[deal.retailer]}</span>
            <h2 className="modal-title">{deal.product_name}</h2>
            <div className="deal-prices" style={{ marginBottom: 16 }}>
              <span className="deal-clearance-price" style={{ fontSize: 28 }}>${parseFloat(deal.clearance_price || 0).toFixed(2)}</span>
              {deal.original_price && <span className="deal-original-price" style={{ fontSize: 18 }}>${parseFloat(deal.original_price).toFixed(2)}</span>}
              {deal.discount_percent && <span className="deal-discount-badge" style={{ fontSize: 14 }}>-{deal.discount_percent}%</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {deal.product_url && <a href={deal.product_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-full">View on {RETAILER_LABELS[deal.retailer]}</a>}
              <button className="btn btn-danger btn-full" disabled={flagged} onClick={(e) => { e.stopPropagation(); setFlagged(true); onFlag(deal.id); }}>
                {flagged ? '✓ Flagged' : '⚑ Flag as inaccurate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, today: 0, avgDiscount: 0 });

  useEffect(() => { loadDeals(); loadStats(); }, [filter]);

  async function loadDeals() {
    setLoading(true);
    try {
      let query = supabase.from('deals').select('*, store_locations(*)').eq('is_active', true).order('first_seen_at', { ascending: false }).limit(50);
      if (filter !== 'all') query = query.eq('retailer', filter);
      const { data } = await query;
      setDeals(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function loadStats() {
    const today = new Date(); today.setHours(0,0,0,0);
    const { data } = await supabase.from('deals').select('discount_percent, first_seen_at').eq('is_active', true);
    if (data) {
      setStats({
        total: data.length,
        today: data.filter(d => new Date(d.first_seen_at) >= today).length,
        avgDiscount: data.length > 0 ? Math.round(data.reduce((s, d) => s + (d.discount_percent || 0), 0) / data.length) : 0,
      });
    }
  }

  async function flagDeal(dealId) {
    const { data: deal } = await supabase.from('deals').select('flagged_count').eq('id', dealId).single();
    if (deal) await supabase.from('deals').update({ flagged_count: (deal.flagged_count || 0) + 1 }).eq('id', dealId);
  }

  const retailers = [{ id: 'all', label: 'All' }, { id: 'home_depot', label: 'Home Depot' }, { id: 'lowes', label: "Lowe's" }, { id: 'walmart', label: 'Walmart' }];

  return (
    <div className="app-layout">
      <div className="top-nav">
        <div className="nav-logo">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="#00FF85" strokeWidth="1.5" strokeOpacity="0.4"/>
            <circle cx="16" cy="16" r="8" stroke="#00FF85" strokeWidth="1.5" strokeOpacity="0.6"/>
            <circle cx="16" cy="16" r="4" fill="#00FF85"/>
            <line x1="16" y1="16" x2="28" y2="9" stroke="#00FF85" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="nav-logo-text">Clearance<span>Radar</span></span>
          <span className="nav-badge">LIVE</span>
        </div>
        <div className="live-indicator"><div className="live-dot" />SCANNING</div>
      </div>
      <div className="page-content">
        <div className="stats-row">
          <div className="stat-card"><span className="stat-value">{stats.total}</span><span className="stat-label">Active Deals</span></div>
          <div className="stat-card"><span className="stat-value">{stats.today}</span><span className="stat-label">Found Today</span></div>
          <div className="stat-card"><span className="stat-value">{stats.avgDiscount}%</span><span className="stat-label">Avg Discount</span></div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
          {retailers.map(r => (
            <button key={r.id} onClick={() => setFilter(r.id)} style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${filter === r.id ? 'var(--accent)' : 'var(--border)'}`, background: filter === r.id ? 'var(--accent-dim)' : 'var(--bg-card)', color: filter === r.id ? 'var(--accent)' : 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
              {r.label}
            </button>
          ))}
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div className="radar-pulse" style={{ margin: '0 auto 16px' }}><div className="pulse-ring"/><div className="pulse-ring"/><div className="pulse-ring"/></div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Scanning for deals...</p>
          </div>
        ) : deals.length === 0 ? (
          <div className="empty-state">
            <h3 className="empty-state-title">No deals found yet</h3>
            <p className="empty-state-desc">ClearanceRadar is scanning stores now. Deals appear here automatically.</p>
            <button className="btn btn-secondary" onClick={() => navigate('/filters')}>Adjust Filters</button>
          </div>
        ) : (
          <div>
            <div className="section-header">
              <span className="section-title">{deals.length} DEALS FOUND</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            {deals.map(deal => <DealCard key={deal.id} deal={deal} onFlag={flagDeal} />)}
          </div>
        )}
      </div>
      <Navigation />
    </div>
  );
}