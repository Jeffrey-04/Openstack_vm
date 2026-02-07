import React from 'react';
import './EmptyState.css';

/**
 * État vide avec style géométrique (aligné Auth/Offres).
 * @param {string} title - Titre
 * @param {string} message - Description
 * @param {React.ReactNode} action - Bouton/lien CTA optionnel
 * @param {string} variant - 'default' | 'compact'
 */
export default function EmptyState({ title, message, action, variant = 'default' }) {
  return (
    <div className={`empty-state empty-state--${variant}`}>
      <div className="empty-state-shapes">
        <div className="empty-state-shape empty-state-shape-1" />
        <div className="empty-state-shape empty-state-shape-2" />
        <div className="empty-state-shape empty-state-shape-3" />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {message && <p className="empty-state-message">{message}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
