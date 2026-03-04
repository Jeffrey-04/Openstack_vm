import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Skeleton from '../../components/Skeleton';
import './AdminUsers.css';

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [togglingId, setTogglingId] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    loadUsers();
  }, [pagination.page, search]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.getAdminUsers({
        page: pagination.page,
        limit: pagination.limit,
        search
      });
      setUsers(res.users || []);
      setPagination(prev => ({
        ...prev,
        total: res.pagination?.total || 0,
        totalPages: res.pagination?.totalPages || 0
      }));
    } catch (err) {
      console.error('Load users error:', err);
      setError('Impossible de charger les utilisateurs.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    loadUsers();
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getRoleBadge = (role) => {
    return role === 'admin' ? 'admin-badge' : 'client-badge';
  };

  const handleToggleActive = async (u) => {
    if (u.id === currentUser?.id) return;
    setTogglingId(u.id);
    try {
      await apiService.updateAdminUser(u.id, { isActive: !u.isActive });
      toast.success(u.isActive ? 'Utilisateur désactivé.' : 'Utilisateur réactivé.');
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Erreur');
    } finally {
      setTogglingId(null);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="admin-users">
        <div className="admin-users-header">
          <Skeleton variant="title" width="30%" />
          <Skeleton variant="button" width={200} />
        </div>
        <div className="admin-users-table-wrapper">
          <table className="admin-users-table">
            <thead>
              <tr>
                <th><Skeleton variant="text" width="80%" /></th>
                <th><Skeleton variant="text" width="60%" /></th>
                <th><Skeleton variant="text" width="50%" /></th>
                <th><Skeleton variant="text" width="40%" /></th>
                <th><Skeleton variant="text" width="40%" /></th>
                <th><Skeleton variant="text" width="60%" /></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td><Skeleton variant="text" /></td>
                  <td><Skeleton variant="text" width="70%" /></td>
                  <td><Skeleton variant="button" width={60} /></td>
                  <td><Skeleton variant="text" width="30%" /></td>
                  <td><Skeleton variant="text" width="30%" /></td>
                  <td><Skeleton variant="text" width="50%" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-users">
      <div className="admin-users-header">
        <h1>Gestion des utilisateurs</h1>
        <form onSubmit={handleSearch} className="admin-users-search">
          <input
            type="text"
            placeholder="Rechercher par email ou nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-users-search-input"
          />
          <button type="submit" className="admin-users-search-btn">Rechercher</button>
        </form>
      </div>

      {error && (
        <div className="admin-users-error">
          {error}
        </div>
      )}

      <div className="admin-users-table-wrapper">
        <table className="admin-users-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Nom</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th>VMs</th>
              <th>Factures</th>
              <th>Date d'inscription</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="8" className="admin-users-empty">
                  {search ? 'Aucun utilisateur trouvé.' : 'Aucun utilisateur.'}
                </td>
              </tr>
            ) : (
              users.map((user, idx) => (
                <tr key={user.id} className="list-item" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <td className="admin-users-email">{user.email}</td>
                  <td>{user.name || '—'}</td>
                  <td>
                    <span className={`admin-users-role ${getRoleBadge(user.role)}`}>
                      {user.role === 'admin' ? 'Admin' : 'Client'}
                    </span>
                  </td>
                  <td>
                    <span className={user.isActive !== false ? 'admin-users-status-active' : 'admin-users-status-inactive'}>
                      {user.isActive !== false ? 'Actif' : 'Désactivé'}
                    </span>
                  </td>
                  <td>{user.vmCount || 0}</td>
                  <td>{user.invoiceCount || 0}</td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td>
                    {user.id !== currentUser?.id && (
                      <button
                        type="button"
                        className={`admin-users-btn-toggle ${user.isActive !== false ? 'admin-users-btn-deactivate' : 'admin-users-btn-activate'}`}
                        onClick={() => handleToggleActive(user)}
                        disabled={togglingId === user.id}
                        title={user.isActive !== false ? 'Désactiver l\'utilisateur' : 'Réactiver l\'utilisateur'}
                      >
                        {togglingId === user.id ? '…' : (user.isActive !== false ? 'Désactiver' : 'Réactiver')}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="admin-users-pagination">
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1}
            className="admin-users-pagination-btn"
          >
            Précédent
          </button>
          <span className="admin-users-pagination-info">
            Page {pagination.page} sur {pagination.totalPages} ({pagination.total} utilisateurs)
          </span>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page >= pagination.totalPages}
            className="admin-users-pagination-btn"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}
