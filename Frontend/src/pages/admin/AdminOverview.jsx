import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../../services/api';
import './AdminOverview.css';

export default function AdminOverview() {
  const [stats, setStats] = useState({
    totalVMs: 0,
    activeVMs: 0,
    suspendedVMs: 0,
    totalUsers: 12,
    activeUsers: 8,
    monthlyRevenue: 0,
  });
  const [vms, setVMs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics] = useState({
    cpu: 2,
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
      const activeCount = servers.filter((vm) => vm.status === 'ACTIVE').length;
      const suspendedCount = servers.filter((vm) => vm.status === 'SHUTOFF').length;
      const monthlyRev = servers.length * 25 * 0.8;
      setStats({
        totalVMs: servers.length,
        activeVMs: activeCount,
        suspendedVMs: suspendedCount,
        totalUsers: 12,
        activeUsers: 8,
        monthlyRevenue: monthlyRev,
      });
    } catch (err) {
      console.error('Error loading admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      ACTIVE: 'admin-status-running',
      SHUTOFF: 'admin-status-paused',
      BUILD: 'admin-status-building',
      ERROR: 'admin-status-error',
    };
    return map[status] || 'admin-status-unknown';
  };

  const getStatusText = (status) => {
    const map = {
      ACTIVE: 'Actif',
      SHUTOFF: 'Arrêté',
      BUILD: 'En construction',
      ERROR: 'Erreur',
      PAUSED: 'En pause',
      SUSPENDED: 'Suspendu',
    };
    return map[status] || status;
  };

  if (loading) {
    return (
      <div className="admin-dashboard-loading">
        <div className="admin-spinner" />
        <p>Chargement du dashboard admin...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-kpi-row">
        <div className="admin-card admin-kpi-card" title="Exemple de VPS – Ubuntu KVM">
          <span className="admin-kpi-os">Ubuntu</span>
          <span className="admin-kpi-meta">KVM 4</span>
          <span className="admin-kpi-status admin-kpi-status-running">Actif</span>
        </div>
        <div className="admin-card admin-kpi-card" title="Nombre total de VPS sur la plateforme">
          <div className="admin-kpi-value">{stats.totalVMs}</div>
          <div className="admin-kpi-label">Total VPS</div>
        </div>
        <div className="admin-card admin-kpi-card" title="VPS actuellement en cours d’exécution">
          <div className="admin-kpi-value">{stats.activeVMs}</div>
          <div className="admin-kpi-label">VPS Actifs</div>
        </div>
        <div className="admin-card admin-kpi-card" title="VPS arrêtés ou suspendus">
          <div className="admin-kpi-value">{stats.suspendedVMs}</div>
          <div className="admin-kpi-label">VPS Suspendus</div>
        </div>
        <div className="admin-card admin-kpi-card" title="Nombre d’utilisateurs inscrits">
          <div className="admin-kpi-value">{stats.totalUsers}</div>
          <div className="admin-kpi-label">Total Utilisateurs</div>
        </div>
      </div>

      <div className="admin-overview-section">
        <h2 className="admin-section-title">Utilisation des ressources (plateforme)</h2>
        <div className="admin-metrics-grid">
          <div className="admin-card admin-metric-card">
            <div className="admin-metric-label">CPU</div>
            <div className="admin-metric-value">{metrics.cpu}%</div>
            <div className="admin-metric-bar">
              <div className="admin-metric-fill" style={{ width: `${metrics.cpu}%` }} />
            </div>
          </div>
          <div className="admin-card admin-metric-card">
            <div className="admin-metric-label">Mémoire</div>
            <div className="admin-metric-value">{metrics.memory}%</div>
            <div className="admin-metric-bar">
              <div className="admin-metric-fill" style={{ width: `${metrics.memory}%` }} />
            </div>
          </div>
          <div className="admin-card admin-metric-card">
            <div className="admin-metric-label">Disque</div>
            <div className="admin-metric-value">{metrics.diskUsed} GB / {metrics.diskTotal} GB</div>
            <div className="admin-metric-bar">
              <div className="admin-metric-fill" style={{ width: `${(metrics.diskUsed / metrics.diskTotal) * 100}%` }} />
            </div>
          </div>
          <div className="admin-card admin-metric-card">
            <div className="admin-metric-label">Trafic entrant</div>
            <div className="admin-metric-value">{metrics.trafficIn} MB</div>
            <div className="admin-metric-bar admin-metric-bar-line" />
          </div>
          <div className="admin-card admin-metric-card">
            <div className="admin-metric-label">Trafic sortant</div>
            <div className="admin-metric-value">{metrics.trafficOut} MB</div>
            <div className="admin-metric-bar admin-metric-bar-line" />
          </div>
          <div className="admin-card admin-metric-card">
            <div className="admin-metric-label">Bande passante</div>
            <div className="admin-metric-value">{metrics.bandwidthUsed} TB / {metrics.bandwidthTotal} TB</div>
            <div className="admin-metric-bar">
              <div className="admin-metric-fill" style={{ width: '0%' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="admin-overview-section">
        <h2 className="admin-section-title">Sécurité et opérations</h2>
        <div className="admin-security-grid">
          <Link to="/admin/settings" className="admin-card admin-security-card">
            <span className="admin-security-value">0</span>
            <span className="admin-security-label">Clés SSH</span>
            <span className="admin-security-arrow">→</span>
          </Link>
          <Link to="/admin/settings" className="admin-card admin-security-card">
            <span className="admin-security-value">6</span>
            <span className="admin-security-label">Règles pare-feu</span>
            <span className="admin-security-arrow">→</span>
          </Link>
          <Link to="/admin/settings" className="admin-card admin-security-card">
            <span className="admin-security-value">4</span>
            <span className="admin-security-label">Snapshots et sauvegardes</span>
            <span className="admin-security-arrow">→</span>
          </Link>
          <Link to="/admin/settings" className="admin-card admin-security-card">
            <span className="admin-security-value admin-security-value-muted">Non installé</span>
            <span className="admin-security-label">Scanner malware</span>
            <span className="admin-security-arrow">→</span>
          </Link>
        </div>
      </div>

      <div className="admin-overview-section">
        <h2 className="admin-section-title">Liste des VPS Cloud</h2>
        <div className="admin-card admin-table-card">
          <div className="admin-table-actions">
            <Link to="/admin/create" className="admin-btn admin-btn-add">
              Ajouter Nouveau
            </Link>
          </div>
          <div className="admin-vm-cards">
            {vms.slice(0, 10).map((vm) => (
              <div key={vm.id} className="admin-vm-card">
                <div className="admin-vm-card-header">
                  <span className="admin-vm-icon">▣</span>
                  <strong>{vm.name}</strong>
                  <span className={`admin-status-badge ${getStatusBadge(vm.status)}`}>
                    {getStatusText(vm.status)}
                  </span>
                </div>
                <div className="admin-vm-card-body">
                  <div><span className="admin-vm-card-label">Config</span> {vm.flavor?.vcpus || 4} vCPU, {vm.flavor?.ram ? (vm.flavor.ram / 1024).toFixed(0) : 8} GB RAM</div>
                  <div><span className="admin-vm-card-label">OS</span> {vm.image?.name || 'Ubuntu 22.04'}</div>
                  <div><span className="admin-vm-card-label">IP</span> <code className="admin-ip-address">{vm.addresses && Object.values(vm.addresses)[0]?.[0]?.addr || '—'}</code></div>
                </div>
                <div className="admin-action-buttons">
                  <button type="button" className="admin-btn-icon" title="Voir détails">👁</button>
                  <button type="button" className="admin-btn-icon" title="Modifier">✏</button>
                </div>
              </div>
            ))}
            {vms.length === 0 && <p className="admin-table-empty">Aucune VM disponible</p>}
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Configuration</th>
                  <th>Système d&apos;exploitation</th>
                  <th>Adresse IP</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vms.slice(0, 10).map((vm) => (
                  <tr key={vm.id}>
                    <td>
                      <div className="admin-vm-name-cell">
                        <span className="admin-vm-icon">▣</span>
                        {vm.name}
                      </div>
                    </td>
                    <td>
                      <div className="admin-vm-config">
                        {vm.flavor?.vcpus || 4} vCPU - {vm.flavor?.ram ? (vm.flavor.ram / 1024).toFixed(0) : 8} GB RAM
                      </div>
                    </td>
                    <td>
                      <div className="admin-os-cell">
                        {vm.image?.name || 'Ubuntu 22.04'}
                      </div>
                    </td>
                    <td>
                      <code className="admin-ip-address">
                        {vm.addresses && Object.values(vm.addresses)[0]?.[0]?.addr || '—'}
                      </code>
                    </td>
                    <td>
                      <span className={`admin-status-badge ${getStatusBadge(vm.status)}`}>
                        {getStatusText(vm.status)}
                      </span>
                    </td>
                    <td>
                      <div className="admin-action-buttons">
                        <button type="button" className="admin-btn-icon" title="Voir détails">👁</button>
                        <button type="button" className="admin-btn-icon" title="Modifier">✏</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {vms.length === 0 && (
                  <tr>
                    <td colSpan="6" className="admin-table-empty">
                      Aucune VM disponible
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {vms.length > 10 && (
            <div className="admin-table-pagination">
              <span>Affichage de 1 à 10 sur {vms.length} VMs</span>
              <div className="admin-pagination-btns">
                <button type="button" className="admin-btn-pagination">Précédent</button>
                <button type="button" className="admin-btn-pagination admin-btn-pagination-active">1</button>
                <button type="button" className="admin-btn-pagination">Suivant</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="admin-quick-stats">
        <div className="admin-card admin-quick-stat">
          <span className="admin-quick-stat-icon">👥</span>
          <div>
            <div className="admin-quick-stat-value">{stats.totalUsers}</div>
            <div className="admin-quick-stat-label">Utilisateurs totaux</div>
          </div>
        </div>
        <div className="admin-card admin-quick-stat">
          <span className="admin-quick-stat-icon">✅</span>
          <div>
            <div className="admin-quick-stat-value">{stats.activeUsers}</div>
            <div className="admin-quick-stat-label">Utilisateurs actifs</div>
          </div>
        </div>
        <div className="admin-card admin-quick-stat">
          <span className="admin-quick-stat-icon">💰</span>
          <div>
            <div className="admin-quick-stat-value">${stats.monthlyRevenue.toFixed(0)}</div>
            <div className="admin-quick-stat-label">Revenus ce mois</div>
          </div>
        </div>
        <div className="admin-card admin-quick-stat">
          <span className="admin-quick-stat-icon">📈</span>
          <div>
            <div className="admin-quick-stat-value">+12%</div>
            <div className="admin-quick-stat-label">Croissance</div>
          </div>
        </div>
      </div>
    </div>
  );
}
