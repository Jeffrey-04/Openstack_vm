import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../../services/api';
import toast from 'react-hot-toast';
import './ClientOverview.css';

export default function ClientOverview() {
  const [vms, setVMs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    cpu: 12,
    memory: 9,
    diskUsed: 6,
    diskTotal: 200,
    trafficIn: 0.1,
    trafficOut: 0,
    bandwidthUsed: 0,
    bandwidthTotal: 16,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const vmsResult = await apiService.getVMs();
      const servers = vmsResult.servers || [];
      setVMs(servers);
      if (servers.length > 0) {
        setMetrics((m) => ({
          ...m,
          diskUsed: Math.min(m.diskUsed + servers.length * 2, m.diskTotal),
        }));
      }
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
    navigator.clipboard.writeText(sshLine);
    toast.success('Commande copiée dans le presse-papiers.');
  };

  if (loading) {
    return (
      <div className="client-dashboard-loading">
        <div className="spinner" />
        <p>Chargement de votre espace...</p>
      </div>
    );
  }

  return (
    <div className="client-dashboard">
      <div className="client-overview-row client-vps-info">
        <div className="client-card client-vps-card">
          <div className="client-vps-os">
            <span className="client-vps-os-logo">Ubuntu</span>
            <span className="client-vps-os-version">22.04</span>
          </div>
          <div className="client-vps-meta">KVM {vms.length > 0 ? '1' : '0'}</div>
          <span className={`client-vps-status ${statusClass}`}>{statusLabel}</span>
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

      <div className="client-overview-section">
        <h2 className="client-section-title">Utilisation des ressources</h2>
        <div className="client-metrics-grid">
          <div className="client-card client-metric-card">
            <div className="client-metric-label">CPU</div>
            <div className="client-metric-value">{metrics.cpu}%</div>
            <div className="client-metric-bar">
              <div className="client-metric-fill" style={{ width: `${metrics.cpu}%` }} />
            </div>
          </div>
          <div className="client-card client-metric-card">
            <div className="client-metric-label">Mémoire</div>
            <div className="client-metric-value">{metrics.memory}%</div>
            <div className="client-metric-bar">
              <div className="client-metric-fill" style={{ width: `${metrics.memory}%` }} />
            </div>
          </div>
          <div className="client-card client-metric-card">
            <div className="client-metric-label">Disque</div>
            <div className="client-metric-value">{metrics.diskUsed} GB / {metrics.diskTotal} GB</div>
            <div className="client-metric-bar">
              <div className="client-metric-fill" style={{ width: `${(metrics.diskUsed / metrics.diskTotal) * 100}%` }} />
            </div>
          </div>
          <div className="client-card client-metric-card">
            <div className="client-metric-label">Trafic entrant</div>
            <div className="client-metric-value">{metrics.trafficIn} MB</div>
            <div className="client-metric-bar client-metric-bar-line" />
          </div>
          <div className="client-card client-metric-card">
            <div className="client-metric-label">Trafic sortant</div>
            <div className="client-metric-value">{metrics.trafficOut} MB</div>
            <div className="client-metric-bar client-metric-bar-line" />
          </div>
          <div className="client-card client-metric-card">
            <div className="client-metric-label">Bande passante</div>
            <div className="client-metric-value">{metrics.bandwidthUsed} TB / {metrics.bandwidthTotal} TB</div>
            <div className="client-metric-bar">
              <div className="client-metric-fill client-metric-fill-circle" style={{ width: '0%' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="client-overview-section">
        <h2 className="client-section-title">Sécurité et sauvegardes</h2>
        <div className="client-security-grid">
          <Link to="/client/settings" className="client-card client-security-card">
            <span className="client-security-value">0</span>
            <span className="client-security-label">Clé SSH</span>
            <span className="client-security-arrow">→</span>
          </Link>
          <Link to="/client/settings" className="client-card client-security-card">
            <span className="client-security-value">6</span>
            <span className="client-security-label">Règles pare-feu</span>
            <span className="client-security-arrow">→</span>
          </Link>
          <Link to="/client/settings" className="client-card client-security-card">
            <span className="client-security-value">4</span>
            <span className="client-security-label">Snapshots et sauvegardes</span>
            <span className="client-security-arrow">→</span>
          </Link>
          <Link to="/client/settings" className="client-card client-security-card">
            <span className="client-security-value client-security-value-muted">Non installé</span>
            <span className="client-security-label">Scanner malware</span>
            <span className="client-security-arrow">→</span>
          </Link>
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
