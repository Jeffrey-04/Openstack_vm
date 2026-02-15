import React, { useState, useEffect } from 'react';
import apiService from '../services/api';
import toast from 'react-hot-toast';
import './BillingPage.css';

export default function BillingPage() {
  const [invoices, setInvoices] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsForm, setPrefsForm] = useState({
    paymentMode: 'manual',
    cardNumber: '',
    cardExpiry: '',
    cardCvv: '',
    brand: 'TEST'
  });

  useEffect(() => {
    loadInvoices();
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const res = await apiService.getBillingPreferences();
      if (res.preferences) {
        setPreferences(res.preferences);
        setPrefsForm((prev) => ({
          ...prev,
          paymentMode: res.preferences.paymentMode || 'manual'
        }));
      }
    } catch (err) {
      console.error('Load preferences:', err);
    }
  };

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    apiService
      .getInvoice(selectedId)
      .then((res) => {
        if (!cancelled && res.invoice) setDetail(res.invoice);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => { cancelled = true; };
  }, [selectedId]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.getInvoices();
      setInvoices(res.invoices || []);
    } catch (err) {
      console.error('Billing load:', err);
      setError('Impossible de charger les factures.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (id) => {
    const url = apiService.getInvoiceDownloadUrl(id);
    window.open(url, '_blank');
  };

  const handlePay = async (id) => {
    try {
      setPayingId(id);
      await apiService.payInvoice(id);
      toast.success('Facture marquée comme payée.');
      await loadInvoices();
      if (selectedId === id) {
        const res = await apiService.getInvoice(id);
        setDetail(res.invoice || null);
      }
    } catch (err) {
      console.error('Pay invoice:', err);
      toast.error(err.response?.data?.error?.message || 'Erreur lors du paiement.');
    } finally {
      setPayingId(null);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatAmount = (amount, currency = 'XAF') => {
    if (amount == null) return '—';
    return `${Number(amount).toLocaleString('fr-FR')} ${currency}`;
  };

  const statusLabel = (status) => {
    const map = { pending: 'En attente', paid: 'Payée', overdue: 'En retard' };
    return map[status] || status;
  };

  const statusClass = (status) => {
    const map = { pending: 'billing-status-pending', paid: 'billing-status-paid', overdue: 'billing-status-overdue' };
    return map[status] || '';
  };

  const handleSavePreferences = async () => {
    try {
      setPrefsSaving(true);
      await apiService.updateBillingPreferences({
        paymentMode: prefsForm.paymentMode,
        card: prefsForm.paymentMode === 'auto' ? {
          cardNumber: prefsForm.cardNumber,
          cardExpiry: prefsForm.cardExpiry,
          cardCvv: prefsForm.cardCvv,
          brand: prefsForm.brand || 'TEST'
        } : undefined
      });
      await loadPreferences();
      toast.success('Préférences enregistrées.');
    } catch (err) {
      console.error('Save preferences:', err);
      toast.error(err.response?.data?.error?.message || 'Erreur lors de l’enregistrement.');
    } finally {
      setPrefsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="billing-page">
        <div className="billing-loading">
          <div className="billing-spinner" />
          <p>Chargement des factures...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="billing-page">
        <div className="billing-error">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="billing-page">
      <div className="billing-header">
        <h2 className="billing-title">Facturation</h2>
        <p className="billing-subtitle">Consultez et téléchargez vos factures.</p>
      </div>

      <section className="billing-card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="billing-card-title">Préférences de paiement</h3>
        <div className="billing-preferences">
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Mode de règlement</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="radio"
                  name="paymentMode"
                  checked={prefsForm.paymentMode === 'manual'}
                  onChange={() => setPrefsForm((p) => ({ ...p, paymentMode: 'manual' }))}
                />
                Manuel (je paie chaque facture à la main)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="radio"
                  name="paymentMode"
                  checked={prefsForm.paymentMode === 'auto'}
                  onChange={() => setPrefsForm((p) => ({ ...p, paymentMode: 'auto' }))}
                />
                Automatique (débit quotidien)
              </label>
            </div>
          </div>
          {prefsForm.paymentMode === 'auto' && (
            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: 8, marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                Carte de paiement (fictive, environnement TEST)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.75rem', maxWidth: 400 }}>
                <input
                  type="text"
                  placeholder="Numéro (ex: 4242424242424242)"
                  value={prefsForm.cardNumber}
                  onChange={(e) => setPrefsForm((p) => ({ ...p, cardNumber: e.target.value }))}
                  className="billing-input"
                  maxLength={19}
                />
                <input
                  type="text"
                  placeholder="MM/AA"
                  value={prefsForm.cardExpiry}
                  onChange={(e) => setPrefsForm((p) => ({ ...p, cardExpiry: e.target.value }))}
                  className="billing-input"
                  maxLength={5}
                />
                <input
                  type="text"
                  placeholder="CVV"
                  value={prefsForm.cardCvv}
                  onChange={(e) => setPrefsForm((p) => ({ ...p, cardCvv: e.target.value }))}
                  className="billing-input"
                  maxLength={4}
                  style={{ width: 80 }}
                />
              </div>
              {preferences?.card?.hasCard && (
                <div style={{ fontSize: '0.875rem', color: '#059669', marginTop: '0.5rem' }}>
                  Carte enregistrée (•••• {preferences.card.last4}) {preferences.card.isTest && '(TEST)'}
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            className="billing-btn billing-btn-pay"
            onClick={handleSavePreferences}
            disabled={prefsSaving}
          >
            {prefsSaving ? 'Enregistrement…' : 'Enregistrer les préférences'}
          </button>
        </div>
      </section>

      <div className="billing-grid">
        <section className="billing-list-card billing-card">
          <h3 className="billing-card-title">Mes factures</h3>
          {invoices.length === 0 ? (
            <p className="billing-empty">Aucune facture pour le moment.</p>
          ) : (
            <ul className="billing-list">
              {invoices.map((inv) => (
                <li
                  key={inv.id}
                  className={`billing-list-item ${selectedId === inv.id ? 'active' : ''}`}
                >
                  <button
                    type="button"
                    className="billing-list-item-btn"
                    onClick={() => setSelectedId(inv.id)}
                  >
                    <span className="billing-list-item-num">{inv.invoiceNumber}</span>
                    <span className="billing-list-item-date">{formatDate(inv.generatedAt)}</span>
                    <span className={`billing-list-item-status ${statusClass(inv.status)}`}>
                      {statusLabel(inv.status)}
                    </span>
                    <span className="billing-list-item-amount">{formatAmount(inv.totalAmount, inv.currency)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="billing-detail-card billing-card">
          <h3 className="billing-card-title">Détail</h3>
          {!selectedId ? (
            <p className="billing-empty">Sélectionnez une facture.</p>
          ) : loadingDetail ? (
            <div className="billing-loading-inline">
              <div className="billing-spinner" />
            </div>
          ) : detail ? (
            <div className="billing-detail">
              <div className="billing-detail-row">
                <span className="billing-detail-label">N° facture</span>
                <span className="billing-detail-value">{detail.invoiceNumber}</span>
              </div>
              <div className="billing-detail-row">
                <span className="billing-detail-label">Période</span>
                <span className="billing-detail-value">
                  {formatDate(detail.periodStart)} → {formatDate(detail.periodEnd)}
                </span>
              </div>
              <div className="billing-detail-row">
                <span className="billing-detail-label">Statut</span>
                <span className={`billing-detail-value ${statusClass(detail.status)}`}>
                  {statusLabel(detail.status)}
                </span>
              </div>
              <div className="billing-detail-row">
                <span className="billing-detail-label">Total</span>
                <span className="billing-detail-value billing-detail-total">
                  {formatAmount(detail.totalAmount, detail.currency)}
                </span>
              </div>
              {detail.items && detail.items.length > 0 && (
                <div className="billing-detail-items">
                  <div className="billing-detail-label">Lignes</div>
                  <table className="billing-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Qté</th>
                        <th>Prix unit.</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.description}</td>
                          <td>{item.quantity}</td>
                          <td>{formatAmount(item.unitPrice, detail.currency)}</td>
                          <td>{formatAmount(item.total, detail.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="billing-detail-actions">
                <button
                  type="button"
                  className="billing-btn billing-btn-download"
                  onClick={() => handleDownload(detail.id)}
                >
                  Télécharger PDF
                </button>
                {detail.status === 'pending' && (
                  <button
                    type="button"
                    className="billing-btn billing-btn-pay"
                    onClick={() => handlePay(detail.id)}
                    disabled={payingId === detail.id}
                  >
                    {payingId === detail.id ? 'Paiement…' : 'Marquer payée'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="billing-empty">Facture introuvable.</p>
          )}
        </section>
      </div>
    </div>
  );
}
