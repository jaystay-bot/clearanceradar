import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import Navigation from '../components/Navigation';
import { formatDistanceToNow } from 'date-fns';

const RETAILER_LABELS = { home_depot: 'Home Depot', lowes: "Lowe's", walmart: 'Walmart' };

export default function Alerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAlerts(); }, [user]);

  async function loadAlerts() {
    if (!user) return;
    const { data } = await supabase.from('alerts_sent').select('*, deals(product_name, clearance_price, discount_percent, retailer)').eq('user_id', user.id).order('sent_at', { ascending: false }).limit(100);
    setAlerts(data || []);
    setLoading(false);
    await supabase.from('alerts_sent').update({ was_opened: true }).eq('user_id', user.id).eq('was_opened', false);
  }

  return (
    <div className="app-layout">
      <div className="top-nav">
        <div className="nav-logo"><span className="nav-logo-text">Alert <span>History</span></span></div>
      </div>
      <div className="page-content">
        {loading ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Loading...</p>
        : alerts.length === 0 ? (
          <div className="empty-state">
            <h3 className="empty-state-title">No alerts yet</h3>
            <p className="empty-state-desc">When deals match your filters they'll appear here.</p>
          </div>
        ) : alerts.map(alert => (
          <div key={alert.id} className="alert-item">
            <div className={`alert-dot ${alert.was_opened ? 'read' : ''}`} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>{alert.deals?.product_name || 'Deal Alert'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                {alert.deals?.retailer && <span className={`retailer-badge ${alert.deals.retailer}`} style={{ fontSize: 9, padding: '2px 6px' }}>{RETAILER_LABELS[alert.deals.retailer]}</span>}
                {alert.deals?.clearance_price && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>${parseFloat(alert.deals.clearance_price).toFixed(2)}</span>}
                {alert.deals?.discount_percent && <span style={{ fontSize: 11, color: 'var(--accent)' }}>-{alert.deals.discount_percent}%</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDistanceToNow(new Date(alert.sent_at), { addSuffix: true })}</div>
            </div>
          </div>
        ))}
      </div>
      <Navigation />
    </div>
  );
}