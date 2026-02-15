import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminScaleUpRule() {
  const [rule, setRule] = useState({ deltaVcpus: 2, deltaRamMb: 4096, isActive: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiService.getAdminScaleUpRule();
      if (res.rule) setRule((prev) => ({ ...prev, ...res.rule }));
    } catch (err) {
      console.error(err);
      toast.error('Impossible de charger la règle.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await apiService.putAdminScaleUpRule(rule);
      toast.success('Règle enregistrée.');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Erreur.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="card"><p>Chargement…</p></div>;
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 className="card-title">Règle de scale up globale</h2>
        <p className="card-subtitle">Lors d’un scale up, les VMs reçoivent ces ressources en plus (appliqué à toutes les VMs).</p>
      </div>

      <div className="card" style={{ maxWidth: 420 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">+ vCPUs (à ajouter au scale up)</label>
            <input
              type="number"
              min={1}
              value={rule.deltaVcpus}
              onChange={(e) => setRule((p) => ({ ...p, deltaVcpus: Number(e.target.value) || 0 }))}
              className="form-control"
            />
          </div>
          <div className="form-group">
            <label className="form-label">+ RAM (Mo, à ajouter au scale up)</label>
            <input
              type="number"
              min={0}
              value={rule.deltaRamMb}
              onChange={(e) => setRule((p) => ({ ...p, deltaRamMb: Number(e.target.value) || 0 }))}
              className="form-control"
            />
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={rule.isActive}
                onChange={(e) => setRule((p) => ({ ...p, isActive: e.target.checked }))}
              />
              Règle active (scale up autorisé)
            </label>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer la règle'}
          </button>
        </form>
      </div>
    </div>
  );
}
