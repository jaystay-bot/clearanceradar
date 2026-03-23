import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

const RETAILER_LABELS = {
  home_depot: 'Home Depot',
  lowes: "Lowe's",
  walmart: 'Walmart',
};

export default function DealCard({ deal, onFlag, isNew }) {
  const [showDetail, setShowDetail] = useState(false);
  const [flagged, setFlagged] = useState(false);

  const profit = deal.original_price && deal.clearance_price
    ? (deal.original_price - deal.clearance_price).toFixed(2)
    : null;

  const timeAgo = deal.first_seen
    ? formatDistanceToNow(new Date(deal.first_seen), { addSuffix: true })
    : '';

  function handleFlag(e) {
    e.stopPropagation();
    if (!flagged) {
      setFlagged(true);
      onFlag(deal.id);
    }
  }

  function openMap() {
    const query = encodeURIComponent(`${RETAILER_LABELS[deal.retailer] || deal.retailer} ${deal.store_id || ''}`);
    window.open(`https://maps.google.com/maps?q=${query}`, '_blank');
  }

  return (
    <>
      <div className={`deal-card ${isNew ? 'new-deal' : ''}`} onClick={() => setShowDetail(true)}>
        <div className="deal-retailer">
          <span className={`retailer-badge ${deal.retailer}`}>
            {RETAILER_LABELS[deal.retailer] || deal.retailer}
          </span>
          {deal.category && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{deal.category}</span>
          )}
        </div>

        <div className="deal-name">{deal.name}</div>

        <div className="deal-prices">
          <span className="deal-clearance-price">
            ${parseFloat(deal.clearance_price || 0).toFixed(2)}
          </span>
          {deal.original_price && (
            <span className="deal-original-price">
              ${parseFloat(deal.original_price).toFixed(2)}
            </span>
          )}
          {deal.discount_percent && (
            <span className="deal-discount-badge">-{deal.discount_percent}%</span>
          )}
        </div>

        {profit && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'rgba(0,255,133,0.08)', border: '1px solid rgba(0,255,133,0.2)',
            borderRadius: 6, padding: '3px 8px', marginBottom: 8,
          }}>
            <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
              💰 Save ${profit}
            </span>
          </div>
        )}

        <div className="deal-meta">
          <span className="deal-store">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            {deal.store_id || 'Nearby'}
            {deal.in_stock === false && (
              <span className="deal-qty" style={{ marginLeft: 6 }}>Out of stock</span>
            )}
          </span>
          <span className="deal-time">{timeAgo}</span>
        </div>
      </div>

      {/* Deal Detail Modal */}
      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />

            <span className={`retailer-badge ${deal.retailer}`} style={{ marginBottom: 12, display: 'inline-block' }}>
              {RETAILER_LABELS[deal.retailer]}
            </span>

            <h2 className="modal-title">{deal.name}</h2>

            {deal.image_url && (
              <img
                src={deal.image_url}
                alt={deal.name}
                style={{ width: '100%', borderRadius: 10, marginBottom: 16, objectFit: 'contain', maxHeight: 200, background: 'var(--bg-secondary)' }}
              />
            )}

            <div className="deal-prices" style={{ marginBottom: 16 }}>
              <span className="deal-clearance-price" style={{ fontSize: 28 }}>
                ${parseFloat(deal.clearance_price || 0).toFixed(2)}
              </span>
              {deal.original_price && (
                <span className="deal-original-price" style={{ fontSize: 18 }}>
                  ${parseFloat(deal.original_price).toFixed(2)}
                </span>
              )}
              {deal.discount_percent && (
                <span className="deal-discount-badge" style={{ fontSize: 14 }}>-{deal.discount_percent}%</span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Category</div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{deal.category || 'General'}</div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>In Stock</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: deal.in_stock === false ? 'var(--warning)' : 'var(--text-primary)' }}>
                  {deal.in_stock === false ? 'Out of stock' : deal.in_stock === true ? 'In stock' : 'Unknown'}
                </div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Store</div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                  {deal.store_id || 'Nearby'}
                </div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Verified</div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                  {deal.last_seen ? formatDistanceToNow(new Date(deal.last_seen), { addSuffix: true }) : 'Recently'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {deal.store_id && (
                <button className="btn btn-primary btn-full" onClick={openMap}>
                  📍 Get Directions
                </button>
              )}
              {deal.url && (
                <a
                  href={deal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-full"
                >
                  View on {RETAILER_LABELS[deal.retailer]}
                </a>
              )}
              <button
                className="btn btn-danger btn-full"
                onClick={handleFlag}
                disabled={flagged}
              >
                {flagged ? '✓ Flagged for review' : '⚑ Flag as inaccurate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
