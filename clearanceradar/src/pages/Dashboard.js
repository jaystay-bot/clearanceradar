import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import Navigation from '../components/Navigation';
import DealCard from '../components/DealCard';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, today: 0, avgDiscount: 0 });

  useEffect(() => {
    loadDeals();
    loadStats();
    // Refresh every 5 minutes
    const interval = setInterval(loadDeals, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, filter]);

  async function loadDeals() {
    if (!user) return;
    setLoading(true);
    try {
      // Get user's active filters
      const { data: userFilters } = await supabase
        .from('user_filters')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Build query for deals
      let query = supabase
        .from('deals')
        .select('*')
        .order('first_seen', { ascending: false })
        .limit(50);

      // Apply retailer filter
      if (filter !== 'all') {
        query = query.eq('retailer', filter);
      } else if (userFilters && userFilters.length > 0) {
        const retailers = [...new Set(userFilters.flatMap(f => f.retailers || []))];
        if (retailers.length > 0) query = query.in('retailer', retailers);
      }

      // Apply minimum discount from filters if set
      if (userFilters && userFilters.length > 0) {
        const minDiscount = Math.min(...userFilters.map(f => f.min_discount_percent || 0));
        if (minDiscount > 0) query = query.gte('discount_percent', minDiscount);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDeals(data || []);
    } catch (err) {
      console.error('Error loading deals:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    if (!user) return;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: allDeals } = await supabase
        .from('deals')
        .select('discount_percent, first_seen');

      if (allDeals) {
        const todayDeals = allDeals.filter(d => new Date(d.first_seen) >= today);
        const avgDiscount = allDeals.length > 0
          ? Math.round(allDeals.reduce((sum, d) => sum + (d.discount_percent || 0), 0) / allDeals.length)
          : 0;

        setStats({
          total: allDeals.length,
          today: todayDeals.length,
          avgDiscount,
        });
      }
    } catch (err) {
      console.error('Stats error:', err);
    }
  }

  async function flagDeal(dealId) {
    try {
      await supabase.rpc('increment_flag_count', { deal_id: dealId });
      toast.success('Deal flagged for review');
    } catch (err) {
      toast.error('Could not flag deal');
    }
  }

  const retailers = [
    { id: 'all', label: 'All' },
    { id: 'home_depot', label: 'Home Depot' },
    { id: 'lowes', label: "Lowe's" },
    { id: 'walmart', label: 'Walmart' },
  ];

  return (
    <div className="app-layout">
      {/* Top Nav */}
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
        <div className="live-indicator">
          <div className="live-dot" />
          SCANNING
        </div>
      </div>

      <div className="page-content">
        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Active Deals</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.today}</span>
            <span className="stat-label">Found Today</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.avgDiscount}%</span>
            <span className="stat-label">Avg Discount</span>
          </div>
        </div>

        {/* Retailer Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
          {retailers.map(r => (
            <button
              key={r.id}
              onClick={() => setFilter(r.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: `1px solid ${filter === r.id ? 'var(--accent)' : 'var(--border)'}`,
                background: filter === r.id ? 'var(--accent-dim)' : 'var(--bg-card)',
                color: filter === r.id ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Deal Feed */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div className="radar-pulse" style={{ margin: '0 auto 16px' }}>
              <div className="pulse-ring"></div>
              <div className="pulse-ring delay-1"></div>
              <div className="pulse-ring delay-2"></div>
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="14" stroke="#00FF85" strokeWidth="2"/>
                <circle cx="16" cy="16" r="3" fill="#00FF85"/>
              </svg>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Scanning for deals...</p>
          </div>
        ) : deals.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-state-icon" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="30" stroke="#A0ADB8" strokeWidth="2"/>
              <circle cx="32" cy="32" r="18" stroke="#A0ADB8" strokeWidth="2"/>
              <circle cx="32" cy="32" r="6" stroke="#A0ADB8" strokeWidth="2"/>
            </svg>
            <h3 className="empty-state-title">No deals found yet</h3>
            <p className="empty-state-desc">
              ClearanceRadar is scanning stores now. New deals appear here automatically when they match your filters.
            </p>
            <button className="btn btn-secondary" onClick={() => navigate('/filters')}>
              Adjust Filters
            </button>
          </div>
        ) : (
          <div>
            <div className="section-header">
              <span className="section-title">{deals.length} DEALS FOUND</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Updated {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {deals.map((deal, i) => (
              <DealCard key={deal.id} deal={deal} onFlag={flagDeal} isNew={i < 3} />
            ))}
          </div>
        )}
      </div>

      <Navigation />
    </div>
  );
}
