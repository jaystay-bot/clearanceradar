import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [scraperLogs, setScraperLogs] = useState([]);
  const [deals, setDeals] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [usersRes, dealsRes, logsRes] = await Promise.all([
        supabase.from('users').select('subscription_status, created_at'),
        supabase.from('deals').select('retailer, is_active, discount_percent, created_at').eq('is_active', true),
        supabase.from('scraper_logs').select('*').order('started_at', { ascending: false }).limit(20),
      ]);

      const usersData = usersRes.data || [];
      const dealsData = dealsRes.data || [];

      const today = new Date(); today.setHours(0,0,0,0);
      const mrr = usersData.filter(u => u.subscription_status === 'active').length * 19.99;
      const trialUsers = usersData.filter(u => u.subscription_status === 'trial').length;

      setStats({
        totalUsers: usersData.length,
        activeUsers: usersData.filter(u => u.subscription_status === 'active').length,
        trialUsers,
        mrr: mrr.toFixed(2),
        totalDeals: dealsData.length,
        newUsersToday: usersData.filter(u => new Date(u.created_at) >= today).length,
        hdDeals: dealsData.filter(d => d.retailer === 'home_depot').length,
        lowesDeals: dealsData.filter(d => d.retailer === 'lowes').length,
        walmartDeals: dealsData.filter(d => d.retailer === 'walmart').length,
      });

      setUsers(usersData);
      setDeals(dealsData);
      setScraperLogs(logsRes.data || []);
    } catch (err) {
      console.error('Admin load error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="loading-screen"><p>Loading admin...</p></div>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '20px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="#00FF85" strokeWidth="1.5"/>
            <circle cx="16" cy="16" r="4" fill="#00FF85"/>
          </svg>
          <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700 }}>
            ClearanceRadar <span style={{ color: 'var(--accent)' }}>Admin</span>
          </h1>
        </div>

        {/* Key Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'MRR', value: `$${stats.mrr}` },
            { label: 'Active Users', value: stats.activeUsers },
            { label: 'Trial Users', value: stats.trialUsers },
            { label: 'Total Users', value: stats.totalUsers },
            { label: 'Active Deals', value: stats.totalDeals },
            { label: 'New Today', value: stats.newUsersToday },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Deals by Retailer */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>DEALS BY RETAILER</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#FF6700', fontFamily: 'var(--font-mono)' }}>{stats.hdDeals}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Home Depot</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#4A9EFF', fontFamily: 'var(--font-mono)' }}>{stats.lowesDeals}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Lowe's</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#00BFFF', fontFamily: 'var(--font-mono)' }}>{stats.walmartDeals}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Walmart</div>
            </div>
          </div>
        </div>

        {/* Scraper Logs */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 12 }}>SCRAPER LOGS</div>
          {scraperLogs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No scraper runs yet</p>
          ) : (
            scraperLogs.map(log => (
              <div key={log.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid var(--border)',
                fontSize: 12,
              }}>
                <div>
                  <span style={{
                    display: 'inline-block', padding: '2px 6px', borderRadius: 4,
                    background: log.status === 'success' ? 'var(--accent-dim)' : 'rgba(255,68,68,0.1)',
                    color: log.status === 'success' ? 'var(--accent)' : 'var(--danger)',
                    fontSize: 10, fontWeight: 700, marginRight: 8,
                  }}>
                    {log.status?.toUpperCase()}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{log.retailer || 'all'}</span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  +{log.deals_added} deals • {new Date(log.started_at).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>

        <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={loadData}>
          Refresh
        </button>
      </div>
    </div>
  );
}
