import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import Navigation from '../components/Navigation';
import { formatDistanceToNow } from 'date-fns';

const RETAILER_LABELS = {
  home_depot: 'Home Depot',
  lowes: "Lowe's",
  walmart: 'Walmart',
};

export default function Alerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAlerts(); }, [user]);

  async function loadAlerts() {
    if (!user) return;
    const { data } = await supabase
      .from('alerts_sent')
      .select(`*, deals(product_name, clearance_price, original_price, discount_percent, retailer, category)`)
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(100);

    setAlerts(data || []);
    setLoading(false);

    // Mark all as opened
    await supabase
      .from('alerts_sent')
      .update({ was_opened: true })
      .eq('user_id', user.id)
      .eq('was_opened', false);
  }

  const unreadCount = alerts.filter(a => !a.was_opened).length;

  return (
    <div className="app-layout">
      <div className="top-nav">
        <div className="nav-logo">
          <span className="nav-logo-text">Alert <span>History</span></span>
        </div>
        {unreadCount > 0 && (
          <div style={{
            background: 'var(--accent)', color: 'var(--bg-primary)',
            borderRadius: 12, padding: '2px 8px',
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
          }}>
            {unreadCount} new
          </div>
        )}
      </div>

      <div className="page-content">
        {loading ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Loading alerts...</p>
        ) : alerts.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-state-icon" viewBox="0 0 64 64" fill="none">
              <path d="M32 8a20 20 0 0 0-20 20c0 18-8 24-8 24h56s-8-6-8-24A20 20 0 0 0 32 8z" stroke="#A0ADB8" strokeWidth="2"/>
              <path d="M26.5 52a5.5 5.5 0 0 0 11 0" stroke="#A0ADB8" strokeWidth="2"/>
            </svg>
            <h3 className="empty-state-title">No alerts yet</h3>
            <p className="empty-state-desc">
              When ClearanceRadar finds deals matching your filters, they'll appear here.
            </p>
          </div>
        ) : (
          <div>
            <div className="section-header">
              <span className="section-title">{alerts.length} TOTAL ALERTS</span>
            </div>
            {alerts.map(alert => (
              <div key={alert.id} className="alert-item">
                <div className={`alert-dot ${alert.was_opened ? 'read' : ''}`} />
                <div className="alert-content">
                  <div className="alert-title">
                    {alert.deals?.product_name || 'Deal Alert'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    {alert.deals?.retailer && (
                      <span className={`retailer-badge ${alert.deals.retailer}`} style={{ fontSize: 9, padding: '2px 6px' }}>
                        {RETAILER_LABELS[alert.deals.retailer]}
                      </span>
                    )}
                    {alert.deals?.clearance_price && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                        ${parseFloat(alert.deals.clearance_price).toFixed(2)}
                      </span>
                    )}
                    {alert.deals?.discount_percent && (
                      <span style={{ fontSize: 11, color: 'var(--accent)' }}>
                        -{alert.deals.discount_percent}%
                      </span>
                    )}
                  </div>
                  <div className="alert-meta">
                    <span>{formatDistanceToNow(new Date(alert.sent_at), { addSuffix: true })}</span>
                    <span>via {alert.notification_type}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Navigation />
    </div>
  );
}
