import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../../services/api';
import toast from 'react-hot-toast';
import Skeleton from '../../components/Skeleton';
import './ClientOverview.css';

export default function ClientOverview() {
  const [vms, setVMs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const vmsResult = await apiService.getVMs();
      const servers = vmsResult.servers || [];
      setVMs(servers);
    } catch (err) {
      console.error('Error loading client dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const primaryVm = vms[0];
  const status = primaryVm?.status || 'SHUTOFF';
  const statusLabel = status === 'ACTIVE' ? 'Actif' : 'Arrêté';
  const statusClass = status === 'ACTIVE' ? 'status-running' : 'status-stopped';
  const firstAddr = primaryVm?.addresses && Object.values(primaryVm.addresses)[0]?.[0]?.addr;
  const sshLine = firstAddr ? `ssh root@${firstAddr}` : 'ssh root@—';

  const copySsh = () => {
    if (sshLine.includes('—')) return;
    const copyToClipboard = (text) => {
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
      }
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        return Promise.resolve(true);
      } catch (e) {
        return Promise.resolve(false);
      } finally {
        document.body.removeChild(textarea);
      }
    };
    copyToClipboard(sshLine).then((ok) => {
      if (ok) toast.success('Commande copiée dans le presse-papiers.');
      else toast.error('Copie impossible. Copiez la commande manuellement.');
    });
  };

  if (loading) {
    return (
      <div className="client-dashboard">
        <div className="client-overview-row client-vps-info">
          <Skeleton variant="card" height={120} className="client-card" />
          <Skeleton variant="card" height={120} className="client-card" />
          <Skeleton variant="card" height={120} className="client-card" />
          <Skeleton variant="card" height={120} className="client-card" />
        </div>
        <div className="client-overview-section">
          <div style={{ marginBottom: '1rem' }}>
            <Skeleton variant="title" width="40%" />
          </div>
          <div className="client-metrics-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="card" height={100} className="client-card" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="client-dashboard">
      <div className="client-overview-row client-vps-info">
        <div className="client-card client-vps-card">
          {primaryVm ? (
            <>
              <div className="client-vps-os">
                <span className="client-vps-os-logo">{primaryVm.image?.name?.split(' ')[0] || 'Ubuntu'}</span>
                <span className="client-vps-os-version">{primaryVm.image?.name?.match(/\d+\.\d+/)?.[0] || '22.04'}</span>
              </div>
              <div className="client-vps-meta">{primaryVm.name || `VM ${vms.length}`}</div>
              <span className={`client-vps-status ${statusClass}`}>{statusLabel}</span>
            </>
          ) : (
            <>
              <div className="client-vps-os">
                <span className="client-vps-os-logo">—</span>
              </div>
              <div className="client-vps-meta">Aucune VM</div>
              <span className={`client-vps-status ${statusClass}`}>—</span>
            </>
          )}
        </div>
        <div className="client-card client-access-card">
          <div className="client-card-label">Accès root</div>
          <div className="client-ssh-row">
            <code className="client-ssh-line">{sshLine}</code>
            <button type="button" className="client-btn-copy" onClick={copySsh} title="Copier">
              Copier
            </button>
          </div>
        </div>
        <div className="client-card client-password-card">
          <div className="client-card-label">Mot de passe root</div>
          <Link to="/client/settings" className="client-link-change">Changer</Link>
        </div>
        <div className="client-card client-actions-card">
          <Link to="/client/vms" className="client-btn client-btn-reboot">Reboot VPS</Link>
          <button type="button" className="client-btn client-btn-more" aria-label="Menu">⋯</button>
        </div>
      </div>


      {vms.length === 0 && (
        <div className="client-cta-card">
          <h3>Créer votre premier VPS</h3>
          <p>Démarrez en quelques clics avec une machine virtuelle prête à l&apos;emploi.</p>
          <Link to="/client/create" className="client-btn client-btn-primary">Créer une VM</Link>
        </div>
      )}
    </div>
  );
}
