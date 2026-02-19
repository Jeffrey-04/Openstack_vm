import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import apiService from '../services/api';
import toast from 'react-hot-toast';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/common/EmptyState';

function MyVMs() {
  const location = useLocation();
  const isClient = location.pathname.startsWith('/client');
  const [vms, setVMs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    loadVMs();
  }, []);

  const loadVMs = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiService.getVMs();
      setVMs(result.servers || []);
    } catch (err) {
      console.error('Error loading VMs:', err);
      setError('Impossible de charger vos VMs');
    } finally {
      setLoading(false);
    }
  };

  const handleVMAction = async (vmId, action) => {
    if (action === 'delete' && !window.confirm('Êtes-vous sûr de vouloir supprimer cette VM ?')) {
      return;
    }

    try {
      setActionLoading({ ...actionLoading, [vmId]: action });
      
      if (action === 'delete') {
        await apiService.deleteVM(vmId);
      } else {
        await apiService.vmAction(vmId, action);
      }

      // Reload VMs after action
      setTimeout(() => {
        loadVMs();
        setActionLoading({ ...actionLoading, [vmId]: null });
      }, 1000);

    } catch (err) {
      console.error('Error performing action:', err);
      toast.error(err.response?.data?.error?.message || err.message || 'Erreur lors de l\'action');
      setActionLoading((prev) => ({ ...prev, [vmId]: null }));
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'ACTIVE': 'badge-success',
      'SHUTOFF': 'badge-danger',
      'BUILD': 'badge-warning',
      'ERROR': 'badge-danger',
      'PAUSED': 'badge-warning',
      'SUSPENDED': 'badge-warning'
    };
    return statusMap[status] || 'badge-info';
  };

  const getStatusText = (status) => {
    const statusTextMap = {
      ACTIVE: 'Actif',
      SHUTOFF: 'Arrêté',
      BUILD: 'En construction',
      ERROR: 'Erreur',
      PAUSED: 'En pause',
      SUSPENDED: 'Suspendu',
    };
    return statusTextMap[status] || status;
  };

  if (loading) {
    return (
      <div>
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <Skeleton variant="title" width="40%" />
            <Skeleton variant="text" width="60%" style={{ marginTop: '0.5rem' }} />
          </div>
        </div>
        <div className="grid grid-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card">
              <Skeleton variant="title" width="60%" style={{ marginBottom: '1rem' }} />
              <Skeleton variant="button" width={80} style={{ marginBottom: '1rem' }} />
              <Skeleton variant="line" count={3} />
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <Skeleton variant="button" width={100} />
                <Skeleton variant="button" width={100} />
                <Skeleton variant="button" width={100} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <strong>Erreur:</strong> {error}
        <button onClick={loadVMs} className="btn btn-sm btn-primary" style={{ marginLeft: '1rem' }}>
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <h1 className="card-title">💻 Mes Machines Virtuelles</h1>
          <p className="card-subtitle">Gérez toutes vos VMs en un seul endroit</p>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
          <div>
            <strong>{vms.length}</strong> VM{vms.length > 1 ? 's' : ''} totale{vms.length > 1 ? 's' : ''}
          </div>
          <button onClick={loadVMs} className="btn btn-sm btn-secondary">
            🔄 Actualiser
          </button>
        </div>
      </div>

      {vms.length === 0 ? (
        <EmptyState
          title="Aucune machine virtuelle"
          message="Créez votre première VM en quelques clics."
          action={
            <Link
              to={isClient ? '/client/create' : '/admin/create'}
              className="btn btn-primary"
            >
              Créer une VM
            </Link>
          }
        />
      ) : (
        <div className="grid grid-2">
          {vms.map((vm) => (
            <div key={vm.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    <Link to={isClient ? `/client/vms/${vm.id}` : `/admin/vms/${vm.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {vm.name}
                    </Link>
                  </h3>
                  <span className={`badge ${getStatusBadge(vm.status)}`}>
                    {getStatusText(vm.status)}
                  </span>
                </div>
                <div style={{ fontSize: '2rem' }}>💻</div>
              </div>

              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>ID:</strong> <code style={{ fontSize: '0.875rem' }}>{vm.id.substring(0, 8)}...</code>
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Créé:</strong> {new Date(vm.created).toLocaleDateString('fr-FR')}
                </div>
                {vm.addresses && Object.keys(vm.addresses).length > 0 && (
                  <div>
                    <strong>IP:</strong> {Object.values(vm.addresses)[0]?.[0]?.addr || 'N/A'}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Link
                  to={isClient ? `/client/vms/${vm.id}` : `/admin/vms/${vm.id}`}
                  className="btn btn-sm btn-primary"
                >
                  Voir détail
                </Link>
                {vm.status === 'SHUTOFF' ? (
                  <button
                    onClick={() => handleVMAction(vm.id, 'start')}
                    disabled={actionLoading[vm.id]}
                    className="btn btn-sm btn-success"
                  >
                    {actionLoading[vm.id] === 'start' ? '⏳' : '▶️'} Démarrer
                  </button>
                ) : vm.status === 'ACTIVE' ? (
                  <button
                    onClick={() => handleVMAction(vm.id, 'stop')}
                    disabled={actionLoading[vm.id]}
                    className="btn btn-sm btn-warning"
                  >
                    {actionLoading[vm.id] === 'stop' ? '⏳' : '⏹️'} Arrêter
                  </button>
                ) : null}

                {vm.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleVMAction(vm.id, 'reboot')}
                    disabled={actionLoading[vm.id]}
                    className="btn btn-sm btn-secondary"
                  >
                    {actionLoading[vm.id] === 'reboot' ? '⏳' : '🔄'} Redémarrer
                  </button>
                )}

                <button
                  onClick={() => handleVMAction(vm.id, 'delete')}
                  disabled={actionLoading[vm.id]}
                  className="btn btn-sm btn-danger"
                >
                  {actionLoading[vm.id] === 'delete' ? '⏳' : '🗑️'} Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginTop: '2rem', background: '#dbeafe' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>ℹ️ Astuce</h3>
        <p style={{ color: '#1e40af', marginBottom: '0' }}>
          Vous pouvez également gérer vos VMs depuis le dashboard OpenStack pour des options avancées.
        </p>
      </div>
    </div>
  );
}

export default MyVMs;

