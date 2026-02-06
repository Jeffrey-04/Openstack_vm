import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../services/api';
import './AdminDashboard.css';

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalVMs: 0,
    activeVMs: 0,
    suspendedVMs: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalUsers: 12,
    activeUsers: 8
  });

  const [vms, setVMs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const vmsResult = await apiService.getVMs();
      const flavorsResult = await apiService.getFlavors();
      
      const servers = vmsResult.servers || [];
      setVMs(servers);

      // Calculate statistics
      const activeCount = servers.filter(vm => vm.status === 'ACTIVE').length;
      const suspendedCount = servers.filter(vm => vm.status === 'SHUTOFF').length;
      
      // Calculate revenue (mock data)
      const totalRev = servers.length * 25; // Average $25 per VM
      const monthlyRev = totalRev * 0.8;

      setStats({
        totalVMs: servers.length,
        activeVMs: activeCount,
        suspendedVMs: suspendedCount,
        totalRevenue: totalRev * 12, // Annual
        monthlyRevenue: monthlyRev,
        totalUsers: 12,
        activeUsers: 8
      });

      // Generate usage data for chart
      generateUsageData();
      generateRevenueData();

    } catch (err) {
      console.error('Error loading admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateUsageData = () => {
    const data = [];
    const ranges = ['10-20%', '20-30%', '30-40%', '40-50%', '50-60%', '60-70%', '70-80%', '80-90%', '90-100%'];
    ranges.forEach(range => {
      data.push({
        range,
        value: Math.floor(Math.random() * 300) + 50
      });
    });
    setUsageData(data);
  };

  const generateRevenueData = () => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'];
    const data = months.map(month => ({
      month,
      revenue: Math.floor(Math.random() * 10000) + 5000,
      expenses: Math.floor(Math.random() * 5000) + 2000
    }));
    setRevenueData(data);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'ACTIVE': 'status-running',
      'SHUTOFF': 'status-paused',
      'BUILD': 'status-building',
      'ERROR': 'status-error'
    };
    return statusMap[status] || 'status-unknown';
  };

  const getStatusText = (status) => {
    const statusTextMap = {
      'ACTIVE': 'Running',
      'SHUTOFF': 'Paused',
      'BUILD': 'Building',
      'ERROR': 'Error'
    };
    return statusTextMap[status] || status;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Chargement du dashboard admin...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="admin-header">
        <div>
          <h1>Dashboard Administrateur</h1>
          <p className="admin-subtitle">Vue d'ensemble complète de la plateforme</p>
        </div>
        <div className="admin-header-actions">
          <button className="btn-icon">
            <span>🔔</span>
          </button>
          <button className="btn-icon">
            <span>⚙️</span>
          </button>
          <div className="admin-profile">
            <img src="https://ui-avatars.com/api/?name=Admin&background=667eea&color=fff" alt="Admin" />
            <div>
              <div className="admin-name">Alexandra</div>
              <div className="admin-role">admin</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card-admin">
          <div className="stat-icon stat-icon-primary">
            <span>💻</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalVMs}+</div>
            <div className="stat-label">Total VPS</div>
          </div>
        </div>

        <div className="stat-card-admin">
          <div className="stat-icon stat-icon-success">
            <span>✅</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.activeVMs}+</div>
            <div className="stat-label">VPS Actifs</div>
          </div>
        </div>

        <div className="stat-card-admin">
          <div className="stat-icon stat-icon-warning">
            <span>⏸️</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.suspendedVMs}+</div>
            <div className="stat-label">VPS Suspendus</div>
          </div>
        </div>

        <div className="stat-card-admin">
          <div className="stat-icon stat-icon-info">
            <span>📊</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalUsers}+</div>
            <div className="stat-label">Total Utilisateurs</div>
          </div>
        </div>
      </div>

      <div className="dashboard-row">
        {/* Usage Summary */}
        <div className="dashboard-card usage-card">
          <div className="card-header-admin">
            <h3>Résumé d'Utilisation</h3>
            <select className="date-filter">
              <option>Janvier</option>
              <option>Février</option>
              <option>Mars</option>
            </select>
          </div>
          <div className="usage-chart">
            {usageData.map((item, index) => (
              <div key={index} className="usage-bar-container">
                <div 
                  className="usage-bar" 
                  style={{ height: `${(item.value / 300) * 100}%` }}
                ></div>
                <div className="usage-label">{item.range}</div>
              </div>
            ))}
          </div>
          <div className="usage-legend">
            <span>$ 10</span>
            <span>$ 50</span>
            <span>$ 100</span>
            <span>$ 150</span>
            <span>$ 200</span>
            <span>$ 250</span>
            <span>$ 300</span>
          </div>
        </div>

        {/* Balance Summary */}
        <div className="dashboard-card balance-card">
          <div className="card-header-admin">
            <h3>Résumé des Finances</h3>
            <select className="date-filter">
              <option>Janvier</option>
              <option>Février</option>
              <option>Mars</option>
            </select>
          </div>
          <div className="balance-items">
            <div className="balance-item">
              <div className="balance-label">Revenus Totaux</div>
              <div className="balance-value">${stats.totalRevenue.toFixed(2)}</div>
            </div>
            <div className="balance-item">
              <div className="balance-label">Solde Actuel</div>
              <div className="balance-value balance-value-primary">${stats.monthlyRevenue.toFixed(2)}</div>
            </div>
            <div className="balance-item">
              <div className="balance-label">Dépenses ce Mois</div>
              <div className="balance-value">${(stats.monthlyRevenue * 0.4).toFixed(2)}</div>
            </div>
          </div>
          <div className="balance-actions">
            <button className="btn-download">
              <span>📥</span> Télécharger CSV
            </button>
            <button className="btn-add-balance">
              <span>➕</span> Ajouter Solde
            </button>
          </div>
        </div>
      </div>

      {/* VMs List */}
      <div className="dashboard-card vms-list-card">
        <div className="card-header-admin">
          <h3>Liste des VPS Cloud</h3>
          <div className="card-actions">
            <button className="btn-add-new">
              <span>➕</span> Ajouter Nouveau
            </button>
            <button className="btn-view-all">
              Voir Tout <span>▼</span>
            </button>
          </div>
        </div>
        
        <div className="table-container">
          <table className="vms-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Configuration</th>
                <th>Système d'Exploitation</th>
                <th>Adresse IP</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vms.slice(0, 5).map((vm, index) => (
                <tr key={vm.id}>
                  <td>
                    <div className="vm-name-cell">
                      <span className="vm-icon">💻</span>
                      {vm.name}
                    </div>
                  </td>
                  <td>
                    <div className="vm-config">
                      {vm.flavor?.vcpus || 4} vCPU - {vm.flavor?.ram ? (vm.flavor.ram / 1024).toFixed(0) : 8} GB RAM
                    </div>
                  </td>
                  <td>
                    <div className="os-cell">
                      <span className="os-icon">🪟</span>
                      {vm.image?.name || 'Ubuntu 22.04'}
                    </div>
                  </td>
                  <td>
                    <code className="ip-address">
                      {vm.addresses && Object.values(vm.addresses)[0]?.[0]?.addr || '192.168.1.1'}
                    </code>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusBadge(vm.status)}`}>
                      {getStatusText(vm.status)}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-action" title="Voir détails">
                        <span>👁️</span>
                      </button>
                      <button className="btn-action" title="Modifier">
                        <span>✏️</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {vms.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                    Aucune VM disponible
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {vms.length > 5 && (
          <div className="table-pagination">
            <div>Affichage de 1 à 5 sur {vms.length} VMs</div>
            <div className="pagination-buttons">
              <button className="btn-pagination">Précédent</button>
              <button className="btn-pagination active">1</button>
              <button className="btn-pagination">2</button>
              <button className="btn-pagination">Suivant</button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="quick-stat-card">
          <span className="quick-stat-icon">👥</span>
          <div>
            <div className="quick-stat-value">{stats.totalUsers}</div>
            <div className="quick-stat-label">Utilisateurs Totaux</div>
          </div>
        </div>
        <div className="quick-stat-card">
          <span className="quick-stat-icon">✅</span>
          <div>
            <div className="quick-stat-value">{stats.activeUsers}</div>
            <div className="quick-stat-label">Utilisateurs Actifs</div>
          </div>
        </div>
        <div className="quick-stat-card">
          <span className="quick-stat-icon">💰</span>
          <div>
            <div className="quick-stat-value">${stats.monthlyRevenue.toFixed(0)}</div>
            <div className="quick-stat-label">Revenus ce Mois</div>
          </div>
        </div>
        <div className="quick-stat-card">
          <span className="quick-stat-icon">📈</span>
          <div>
            <div className="quick-stat-value">+12%</div>
            <div className="quick-stat-label">Croissance</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;

