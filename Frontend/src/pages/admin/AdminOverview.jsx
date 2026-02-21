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
      <div className="dashboard-figma admin-dashboard-figma">
        <div className="dashboard-figma-grid admin-dashboard-figma-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="card" height={120} className="dashboard-figma-card" />
          ))}
        </div>
        <div className="admin-figma-table-skeleton">
          <Skeleton variant="card" height={280} />
        </div>
        <div className="dashboard-figma-grid admin-dashboard-figma-quick">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="card" height={90} className="dashboard-figma-card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-figma admin-dashboard-figma">
      {/* Ligne 1: KPIs type Figma (Revenue-style) */}
      <div className="dashboard-figma-grid admin-dashboard-figma-grid">
        <div className="dashboard-figma-card dashboard-figma-card-revenue">
          <div className="dashboard-figma-card-head">
            <h3 className="dashboard-figma-card-title">Total VPS</h3>
            <Link to="/admin/vms" className="dashboard-figma-link">Voir rapport</Link>
          </div>
          <div className="dashboard-figma-metric">{stats.totalVMs}</div>
          <p className="dashboard-figma-period">VPS sur la plateforme.</p>
        </div>
        <div className="dashboard-figma-card dashboard-figma-card-revenue">
          <div className="dashboard-figma-card-head">
            <h3 className="dashboard-figma-card-title">VPS Actifs</h3>
            <Link to="/admin/vms" className="dashboard-figma-link">Voir rapport</Link>
          </div>
          <div className="dashboard-figma-metric">{stats.activeVMs}</div>
          <div className="dashboard-figma-trend dashboard-figma-trend-up">↑ En cours d&apos;exécution</div>
          <p className="dashboard-figma-period">Cette semaine.</p>
        </div>
        <div className="dashboard-figma-card dashboard-figma-card-revenue">
          <div className="dashboard-figma-card-head">
            <h3 className="dashboard-figma-card-title">VPS Suspendus</h3>
            <Link to="/admin/vms" className="dashboard-figma-link">Voir rapport</Link>
          </div>
          <div className="dashboard-figma-metric">{stats.suspendedVMs}</div>
          <p className="dashboard-figma-period">Arrêtés ou en pause.</p>
        </div>
        <div className="dashboard-figma-card dashboard-figma-card-revenue">
          <div className="dashboard-figma-card-head">
            <h3 className="dashboard-figma-card-title">Total Utilisateurs</h3>
            <Link to="/admin/users" className="dashboard-figma-link">Voir rapport</Link>
          </div>
          <div className="dashboard-figma-metric">{stats.totalUsers}</div>
          <p className="dashboard-figma-period">Inscrits sur la plateforme.</p>
        </div>
      </div>

      {/* Ligne 2: Liste VPS (carte pleine largeur) */}
      <div className="dashboard-figma-card admin-figma-table-card">
        <div className="dashboard-figma-card-head">
          <h3 className="dashboard-figma-card-title">Liste des VPS Cloud</h3>
          <div className="admin-figma-table-actions">
            <Link to="/admin/create" className="admin-btn admin-btn-add">
              Ajouter Nouveau
            </Link>
            <Link to="/admin/vms" className="dashboard-figma-link">Voir rapport</Link>
          </div>
        </div>
        <div className="admin-vm-cards">
          {vms.slice(0, 10).map((vm) => (
            <div key={vm.id} className="admin-vm-card">
              <div className="admin-vm-card-header">
                <span className="admin-vm-icon" aria-hidden="true" />
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
                <Link to={`/admin/vms/${vm.id}`} className="admin-btn-icon" title="Voir détails">Voir</Link>
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
                      <span className="admin-vm-icon" aria-hidden="true" />
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
                      <Link to={`/admin/vms/${vm.id}`} className="admin-btn-icon" title="Voir détails">Voir</Link>
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

      {/* Ligne 3: Quick stats type Figma */}
      <div className="dashboard-figma-grid admin-dashboard-figma-quick">
        <div className="dashboard-figma-card admin-figma-quick-stat">
          <div className="dashboard-figma-card-title">Utilisateurs totaux</div>
          <div className="dashboard-figma-metric">{stats.totalUsers}</div>
        </div>
        <div className="dashboard-figma-card admin-figma-quick-stat">
          <div className="dashboard-figma-card-title">Utilisateurs actifs</div>
          <div className="dashboard-figma-metric">{stats.activeUsers}</div>
        </div>
        <div className="dashboard-figma-card admin-figma-quick-stat">
          <div className="dashboard-figma-card-title">Revenus ce mois</div>
          <div className="dashboard-figma-metric">{stats.monthlyRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 })}</div>
        </div>
        <div className="dashboard-figma-card admin-figma-quick-stat">
          <div className="dashboard-figma-card-title">Croissance revenus</div>
          <div className={`dashboard-figma-metric ${stats.revenueGrowth >= 0 ? 'dashboard-figma-trend-up' : 'dashboard-figma-trend-down'}`}>
            {stats.revenueGrowth >= 0 ? '+' : ''}{stats.revenueGrowth.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}
