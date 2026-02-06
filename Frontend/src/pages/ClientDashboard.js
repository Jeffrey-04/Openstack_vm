import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../services/api';
import './ClientDashboard.css';

function ClientDashboard() {
  const [stats, setStats] = useState({
    totalVMs: 0,
    activeVMs: 0,
    stoppedVMs: 0,
    monthlySpend: 0
  });

  const [vms, setVMs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    loadDashboardData();
    loadRecentActivity();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const vmsResult = await apiService.getVMs();
      const servers = vmsResult.servers || [];
      setVMs(servers);

      const activeCount = servers.filter(vm => vm.status === 'ACTIVE').length;
      const stoppedCount = servers.filter(vm => vm.status === 'SHUTOFF').length;
      const monthlySpend = servers.length * 25; // $25 average per VM

      setStats({
        totalVMs: servers.length,
        activeVMs: activeCount,
        stoppedVMs: stoppedCount,
        monthlySpend
      });

    } catch (err) {
      console.error('Error loading client dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivity = () => {
    // Mock recent activity
    setRecentActivity([
      { action: 'VM créée', vm: 'web-server-01', time: 'Il y a 2 heures', icon: '✨' },
      { action: 'VM démarrée', vm: 'database-prod', time: 'Il y a 5 heures', icon: '▶️' },
      { action: 'VM arrêtée', vm: 'test-server', time: 'Hier', icon: '⏹️' },
      { action: 'Configuration mise à jour', vm: 'api-server', time: 'Il y a 2 jours', icon: '⚙️' }
    ]);
  };

  const handleVMAction = async (vmId, action) => {
    try {
      if (action === 'delete') {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette VM ?')) {
          return;
        }
        await apiService.deleteVM(vmId);
      } else {
        await apiService.vmAction(vmId, action);
      }
      
      // Reload data
      setTimeout(() => loadDashboardData(), 1000);
    } catch (err) {
      console.error('Error performing action:', err);
      alert(`Erreur: ${err.message}`);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'ACTIVE': '#10b981',
      'SHUTOFF': '#ef4444',
      'BUILD': '#f59e0b',
      'ERROR': '#dc2626'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusText = (status) => {
    const texts = {
      'ACTIVE': 'En ligne',
      'SHUTOFF': 'Arrêté',
      'BUILD': 'En construction',
      'ERROR': 'Erreur'
    };
    return texts[status] || status;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Chargement de votre espace...</p>
      </div>
    );
  }

  return (
    <div className="client-dashboard">
      {/* Welcome Header */}
      <div className="welcome-header">
        <div>
          <h1>👋 Bonjour, Client!</h1>
          <p className="welcome-subtitle">Voici un aperçu de vos machines virtuelles</p>
        </div>
        <Link to="/create" className="btn-create-vm">
          <span>➕</span> Créer une Nouvelle VM
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="stats-overview">
        <div className="stat-box stat-box-primary">
          <div className="stat-box-header">
            <span className="stat-icon">💻</span>
            <span className="stat-trend positive">+2 ce mois</span>
          </div>
          <div className="stat-number">{stats.totalVMs}</div>
          <div className="stat-title">Total de VMs</div>
          <div className="stat-footer">
            <Link to="/my-vms" className="stat-link">Voir tout →</Link>
          </div>
        </div>

        <div className="stat-box stat-box-success">
          <div className="stat-box-header">
            <span className="stat-icon">✅</span>
            <span className="stat-trend positive">+15%</span>
          </div>
          <div className="stat-number">{stats.activeVMs}</div>
          <div className="stat-title">VMs Actives</div>
          <div className="stat-footer">
            <span className="stat-percentage">{stats.totalVMs > 0 ? ((stats.activeVMs / stats.totalVMs) * 100).toFixed(0) : 0}% du total</span>
          </div>
        </div>

        <div className="stat-box stat-box-warning">
          <div className="stat-box-header">
            <span className="stat-icon">⏸️</span>
            <span className="stat-trend neutral">0%</span>
          </div>
          <div className="stat-number">{stats.stoppedVMs}</div>
          <div className="stat-title">VMs Arrêtées</div>
          <div className="stat-footer">
            <span className="stat-percentage">{stats.totalVMs > 0 ? ((stats.stoppedVMs / stats.totalVMs) * 100).toFixed(0) : 0}% du total</span>
          </div>
        </div>

        <div className="stat-box stat-box-info">
          <div className="stat-box-header">
            <span className="stat-icon">💰</span>
            <span className="stat-trend positive">-5%</span>
          </div>
          <div className="stat-number">${stats.monthlySpend}</div>
          <div className="stat-title">Dépenses Mensuelles</div>
          <div className="stat-footer">
            <Link to="/marketplace" className="stat-link">Optimiser →</Link>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {/* VMs Grid */}
        <div className="vms-section">
          <div className="section-header">
            <h2>Mes Machines Virtuelles</h2>
            <div className="section-actions">
              <button className="btn-filter">
                <span>🔍</span> Filtrer
              </button>
              <button className="btn-refresh" onClick={loadDashboardData}>
                <span>🔄</span> Actualiser
              </button>
            </div>
          </div>

          {vms.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h3>Aucune VM pour le moment</h3>
              <p>Créez votre première machine virtuelle pour commencer</p>
              <Link to="/create" className="btn-primary-large">
                Créer ma première VM
              </Link>
            </div>
          ) : (
            <div className="vms-grid">
              {vms.map((vm) => (
                <div key={vm.id} className="vm-card">
                  <div className="vm-card-header">
                    <div className="vm-card-title">
                      <span className="vm-card-icon">💻</span>
                      <h3>{vm.name}</h3>
                    </div>
                    <div 
                      className="vm-status-indicator"
                      style={{ backgroundColor: getStatusColor(vm.status) }}
                      title={getStatusText(vm.status)}
                    ></div>
                  </div>

                  <div className="vm-card-body">
                    <div className="vm-info-row">
                      <span className="vm-info-label">Statut</span>
                      <span 
                        className="vm-info-value"
                        style={{ color: getStatusColor(vm.status) }}
                      >
                        {getStatusText(vm.status)}
                      </span>
                    </div>
                    <div className="vm-info-row">
                      <span className="vm-info-label">ID</span>
                      <span className="vm-info-value vm-id">
                        {vm.id.substring(0, 8)}...
                      </span>
                    </div>
                    <div className="vm-info-row">
                      <span className="vm-info-label">Adresse IP</span>
                      <span className="vm-info-value vm-ip">
                        {vm.addresses && Object.values(vm.addresses)[0]?.[0]?.addr || 'N/A'}
                      </span>
                    </div>
                    <div className="vm-info-row">
                      <span className="vm-info-label">Créé le</span>
                      <span className="vm-info-value">
                        {new Date(vm.created).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>

                  <div className="vm-card-footer">
                    {vm.status === 'SHUTOFF' && (
                      <button 
                        className="btn-vm-action btn-start"
                        onClick={() => handleVMAction(vm.id, 'start')}
                      >
                        <span>▶️</span> Démarrer
                      </button>
                    )}
                    {vm.status === 'ACTIVE' && (
                      <>
                        <button 
                          className="btn-vm-action btn-stop"
                          onClick={() => handleVMAction(vm.id, 'stop')}
                        >
                          <span>⏹️</span> Arrêter
                        </button>
                        <button 
                          className="btn-vm-action btn-restart"
                          onClick={() => handleVMAction(vm.id, 'reboot')}
                        >
                          <span>🔄</span> Redémarrer
                        </button>
                      </>
                    )}
                    <button 
                      className="btn-vm-action btn-delete"
                      onClick={() => handleVMAction(vm.id, 'delete')}
                    >
                      <span>🗑️</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="dashboard-sidebar">
          {/* Quick Actions */}
          <div className="sidebar-card">
            <h3 className="sidebar-title">Actions Rapides</h3>
            <div className="quick-actions">
              <Link to="/create" className="quick-action-btn">
                <span className="quick-action-icon">➕</span>
                <div>
                  <div className="quick-action-title">Créer VM</div>
                  <div className="quick-action-desc">Nouvelle machine</div>
                </div>
              </Link>
              <Link to="/marketplace" className="quick-action-btn">
                <span className="quick-action-icon">🛒</span>
                <div>
                  <div className="quick-action-title">Marketplace</div>
                  <div className="quick-action-desc">Explorer les offres</div>
                </div>
              </Link>
              <a href="/dashboard" target="_blank" className="quick-action-btn">
                <span className="quick-action-icon">🔧</span>
                <div>
                  <div className="quick-action-title">OpenStack</div>
                  <div className="quick-action-desc">Console avancée</div>
                </div>
              </a>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="sidebar-card">
            <h3 className="sidebar-title">Activité Récente</h3>
            <div className="activity-list">
              {recentActivity.map((activity, index) => (
                <div key={index} className="activity-item">
                  <span className="activity-icon">{activity.icon}</span>
                  <div className="activity-content">
                    <div className="activity-action">{activity.action}</div>
                    <div className="activity-vm">{activity.vm}</div>
                    <div className="activity-time">{activity.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Usage Stats */}
          <div className="sidebar-card usage-card">
            <h3 className="sidebar-title">Utilisation</h3>
            <div className="usage-item">
              <div className="usage-header">
                <span>Ressources CPU</span>
                <span className="usage-value">65%</span>
              </div>
              <div className="usage-bar">
                <div className="usage-progress" style={{ width: '65%' }}></div>
              </div>
            </div>
            <div className="usage-item">
              <div className="usage-header">
                <span>Mémoire</span>
                <span className="usage-value">48%</span>
              </div>
              <div className="usage-bar">
                <div className="usage-progress" style={{ width: '48%' }}></div>
              </div>
            </div>
            <div className="usage-item">
              <div className="usage-header">
                <span>Stockage</span>
                <span className="usage-value">72%</span>
              </div>
              <div className="usage-bar">
                <div className="usage-progress usage-progress-warning" style={{ width: '72%' }}></div>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="sidebar-card support-card">
            <div className="support-icon">💬</div>
            <h3>Besoin d'aide ?</h3>
            <p>Notre équipe support est là pour vous assister</p>
            <button className="btn-support">
              Contacter le Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClientDashboard;

