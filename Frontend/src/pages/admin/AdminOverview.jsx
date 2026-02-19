import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../../services/api';
import Skeleton from '../../components/Skeleton';
import './AdminOverview.css';

export default function AdminOverview() {
  const [stats, setStats] = useState({
    totalVMs: 0,
    activeVMs: 0,
    suspendedVMs: 0,
    totalUsers: 0,
    activeUsers: 0,
    monthlyRevenue: 0,
    revenueGrowth: 0,
  });
  const [vms, setVMs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [vmsResult, statsResult] = await Promise.all([
        apiService.getVMs(),
        apiService.getAdminStats()
      ]);
      const servers = vmsResult.servers || [];
      setVMs(servers);
      const activeCount = servers.filter((vm) => vm.status === 'ACTIVE').length;
      const suspendedCount = servers.filter((vm) => vm.status === 'SHUTOFF').length;
      
      if (statsResult.stats) {
        setStats({
          totalVMs: servers.length,
          activeVMs: activeCount,
          suspendedVMs: suspendedCount,
          totalUsers: statsResult.stats.totalUsers || 0,
          activeUsers: statsResult.stats.activeUsers || 0,
          monthlyRevenue: statsResult.stats.monthlyRevenue || 0,
          revenueGrowth: statsResult.stats.revenueGrowth || 0,
        });
      } else {
        setStats({
          totalVMs: servers.length,
          activeVMs: activeCount,
          suspendedVMs: suspendedCount,
          totalUsers: 0,
          activeUsers: 0,
          monthlyRevenue: 0,
          revenueGrowth: 0,
        });
      }
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
      <div className="admin-dashboard">
        <div className="admin-kpi-row">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="card" height={100} className="admin-card admin-kpi-card" />
          ))}
        </div>
        <div className="admin-overview-section">
          <div style={{ marginBottom: '1rem' }}>
            <Skeleton variant="title" width="50%" />
          </div>
          <div className="admin-card admin-table-card">
            <Skeleton variant="line" count={5} />
          </div>
        </div>
        <div className="admin-quick-stats">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="card" height={80} className="admin-card admin-quick-stat" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-kpi-row">
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
            <div className="admin-quick-stat-value">{stats.monthlyRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 })}</div>
            <div className="admin-quick-stat-label">Revenus ce mois</div>
          </div>
        </div>
        <div className="admin-card admin-quick-stat">
          <span className="admin-quick-stat-icon">📈</span>
          <div>
            <div className="admin-quick-stat-value">{stats.revenueGrowth >= 0 ? '+' : ''}{stats.revenueGrowth.toFixed(1)}%</div>
            <div className="admin-quick-stat-label">Croissance revenus</div>
          </div>
        </div>
      </div>
    </div>
  );
}
