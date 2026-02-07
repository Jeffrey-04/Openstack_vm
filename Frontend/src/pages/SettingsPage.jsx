import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import './SettingsPage.css';

export default function SettingsPage() {
  const { user: contextUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiService
      .getMe()
      .then((res) => {
        if (!cancelled && res.user) setProfile(res.user);
      })
      .catch((err) => {
        if (!cancelled) setError('Impossible de charger le profil.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const user = profile || contextUser;

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-loading">
          <div className="settings-spinner" />
          <p>Chargement du profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2 className="settings-title">Paramètres</h2>
        <p className="settings-subtitle">Votre compte et préférences.</p>
      </div>

      <div className="settings-card settings-card-profile">
        <h3 className="settings-card-title">Profil</h3>
        {error ? (
          <p className="settings-error">{error}</p>
        ) : (
          <dl className="settings-dl">
            <div className="settings-dl-row">
              <dt>Email</dt>
              <dd>{user?.email || '—'}</dd>
            </div>
            <div className="settings-dl-row">
              <dt>Nom</dt>
              <dd>{user?.name || 'Non renseigné'}</dd>
            </div>
            <div className="settings-dl-row">
              <dt>Rôle</dt>
              <dd>{user?.role === 'admin' ? 'Administrateur' : 'Client'}</dd>
            </div>
          </dl>
        )}
      </div>

      <div className="settings-card">
        <h3 className="settings-card-title">Sécurité</h3>
        <p className="settings-muted">
          La modification du mot de passe sera disponible prochainement.
        </p>
      </div>
    </div>
  );
}
