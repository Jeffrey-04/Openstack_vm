import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiService from '../../services/api';
import Skeleton from '../../components/Skeleton';
import './AdminOverview.css';

const PAGE_SIZE = 10;

export default function AdminVMs() {
  const [vms, setVms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionVmId, setActionVmId] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadVms();
  }, []);

  const loadVms = async () => {
    try {
      setLoading(true);
      const res = await apiService.getAdminVms();
      setVms(res.servers || []);
    } catch (err) {
      console.error('Load admin VMs:', err);
      toast.error('Impossible de charger la liste des VMs.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = { ACTIVE: 'admin-status-running', SHUTOFF: 'admin-status-paused', BUILD: 'admin-status-building', ERROR: 'admin-status-error' };
    return map[status] || 'admin-status-unknown';
  };
  const getStatusText = (status) => {
    const map = { ACTIVE: 'Actif', SHUTOFF: 'Arrêté', BUILD: 'En construction', ERROR: 'Erreur', PAUSED: 'En pause', SUSPENDED: 'Suspendu' };
    return map[status] || status;
  };

  const handleAdminVmAction = async (vm, action) => {
    const id = vm.dbId || vm.id;
    if (!id) return;
    setActionVmId(id);
    try {
      await apiService.adminVmAction(id, action);
      toast.success(action === 'stop' ? 'VM arrêtée.' : action === 'start' ? 'VM démarrée.' : 'VM redémarrée.');
      loadVms();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Erreur');
    } finally {
      setActionVmId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(vms.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const pageVms = vms.slice(start, start + PAGE_SIZE);

  if (loading) {
    return (
      <div className="dashboard-figma admin-dashboard-figma">
        <div className="admin-figma-table-skeleton">
          <Skeleton variant="card" height={320} />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-figma admin-dashboard-figma">
      <div className="dashboard-figma-card admin-figma-table-card">
        <div className="dashboard-figma-card-head">
          <h3 className="dashboard-figma-card-title">Liste des VMs</h3>
          <div className="admin-figma-table-actions">
            <Link to="/admin/create" className="admin-btn admin-btn-add">
              Créer une VM
            </Link>
            <Link to="/admin" className="dashboard-figma-link">Retour à l’overview</Link>
          </div>
        </div>
        <div className="admin-vm-cards">
          {pageVms.map((vm) => (
            <div key={vm.id} className="admin-vm-card">
              <div className="admin-vm-card-header">
                <span className="admin-vm-icon" aria-hidden="true" />
                <strong>{vm.name}</strong>
                <span className={`admin-status-badge ${getStatusBadge(vm.status)}`}>{getStatusText(vm.status)}</span>
              </div>
              <div className="admin-vm-card-body">
                <div><span className="admin-vm-card-label">Config</span> {vm.flavor?.vcpus || 4} vCPU, {vm.flavor?.ram ? (vm.flavor.ram / 1024).toFixed(0) : 8} GB RAM</div>
                <div><span className="admin-vm-card-label">OS</span> {vm.image?.name || '—'}</div>
                <div><span className="admin-vm-card-label">IP</span> <code className="admin-ip-address">{vm.addresses && Object.values(vm.addresses)[0]?.[0]?.addr || '—'}</code></div>
              </div>
              <div className="admin-action-buttons">
                <Link to={`/admin/vms/${vm.id}`} className="admin-btn-icon" title="Voir détails">Voir</Link>
                {vm.status === 'ACTIVE' && (
                  <button type="button" className="admin-btn-icon admin-btn-stop" onClick={() => handleAdminVmAction(vm, 'stop')} disabled={actionVmId === (vm.dbId || vm.id)} title="Arrêter la VM">
                    {actionVmId === (vm.dbId || vm.id) ? '…' : 'Arrêter'}
                  </button>
                )}
                {vm.status === 'SHUTOFF' && (
                  <button type="button" className="admin-btn-icon admin-btn-start" onClick={() => handleAdminVmAction(vm, 'start')} disabled={actionVmId === (vm.dbId || vm.id)} title="Démarrer la VM">
                    {actionVmId === (vm.dbId || vm.id) ? '…' : 'Démarrer'}
                  </button>
                )}
              </div>
            </div>
          ))}
          {vms.length === 0 && <p className="admin-table-empty">Aucune VM</p>}
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Configuration</th>
                <th>Système d’exploitation</th>
                <th>Adresse IP</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageVms.map((vm) => (
                <tr key={vm.id}>
                  <td><div className="admin-vm-name-cell"><span className="admin-vm-icon" aria-hidden="true" />{vm.name}</div></td>
                  <td><div className="admin-vm-config">{vm.flavor?.vcpus || 4} vCPU - {vm.flavor?.ram ? (vm.flavor.ram / 1024).toFixed(0) : 8} GB RAM</div></td>
                  <td><div className="admin-os-cell">{vm.image?.name || '—'}</div></td>
                  <td><code className="admin-ip-address">{vm.addresses && Object.values(vm.addresses)[0]?.[0]?.addr || '—'}</code></td>
                  <td><span className={`admin-status-badge ${getStatusBadge(vm.status)}`}>{getStatusText(vm.status)}</span></td>
                  <td>
                    <div className="admin-action-buttons">
                      <Link to={`/admin/vms/${vm.id}`} className="admin-btn-icon" title="Voir détails">Voir</Link>
                      {vm.status === 'ACTIVE' && (
                        <button type="button" className="admin-btn-icon admin-btn-stop" onClick={() => handleAdminVmAction(vm, 'stop')} disabled={actionVmId === (vm.dbId || vm.id)}>Arrêter</button>
                      )}
                      {vm.status === 'SHUTOFF' && (
                        <button type="button" className="admin-btn-icon admin-btn-start" onClick={() => handleAdminVmAction(vm, 'start')} disabled={actionVmId === (vm.dbId || vm.id)}>Démarrer</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {vms.length === 0 && (
                <tr><td colSpan="6" className="admin-table-empty">Aucune VM</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {vms.length > PAGE_SIZE && (
          <div className="admin-table-pagination">
            <span>Affichage de {start + 1} à {Math.min(start + PAGE_SIZE, vms.length)} sur {vms.length} VMs</span>
            <div className="admin-pagination-btns">
              <button type="button" className="admin-btn-pagination" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Précédent</button>
              <span className="admin-btn-pagination admin-btn-pagination-active" style={{ pointerEvents: 'none' }}>{page}</span>
              <button type="button" className="admin-btn-pagination" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Suivant</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
