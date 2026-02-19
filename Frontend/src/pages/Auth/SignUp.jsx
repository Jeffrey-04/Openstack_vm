import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthVisual from '../../components/AuthVisual';
import '../../pages/Auth.css';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await register({
        email,
        password,
        name: name || undefined,
        role: isAdmin ? 'admin' : 'client',
      });
      const role = data?.user?.role || 'client';
      navigate(role === 'admin' ? '/admin' : '/client', { replace: true });
    } catch (err) {
      const data = err.response?.data;
      const errObj = data?.error;
      const details = errObj?.details;
      const firstDetail = Array.isArray(details) ? details[0] : null;
      const msg =
        errObj?.message ||
        (firstDetail && (firstDetail.msg || firstDetail.message)) ||
        data?.message ||
        (err.response?.status === 0 || err.code === 'ERR_NETWORK'
          ? 'Connexion au serveur impossible.'
          : 'Inscription impossible');
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-split">
      <div className="auth-split-form">
        <Link to="/login" className="auth-logo" aria-label="VM Marketplace">
          <span className="auth-logo-icon">☁</span>
          <span>VM Marketplace</span>
        </Link>
        <h1>Créer un compte</h1>
        <p className="auth-subtitle">
          Inscrivez-vous pour accéder à la plateforme (client ou administrateur).
        </p>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-alert" role="alert">
              {error}
            </div>
          )}
          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-email">Email *</label>
            <div className="auth-input-wrap without-toggle">
              <input
                id="reg-email"
                type="email"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Adresse email"
                autoComplete="email"
                required
              />
            </div>
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-name">Nom (optionnel)</label>
            <div className="auth-input-wrap without-toggle">
              <input
                id="reg-name"
                type="text"
                className="auth-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Votre nom"
                autoComplete="name"
              />
            </div>
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-password">Mot de passe * (min. 8 caractères)</label>
            <div className="auth-input-wrap">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <button
                type="button"
                className="auth-toggle-password"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Masquer' : 'Afficher'}
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>
          <div className="auth-field">
            <label className="auth-checkbox-label">
              <input
                type="checkbox"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
              />
              <span>Créer un compte <strong>administrateur</strong></span>
            </label>
            <p className="auth-field-hint">Cochez pour accéder à l’espace admin (gestion des modèles VM, règles de scaling, etc.).</p>
          </div>
          <button type="submit" className="auth-btn-submit" disabled={submitting}>
            {submitting ? 'Inscription...' : 'Créer mon compte'}
          </button>
        </form>
        <p className="auth-footer-text">
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </div>
      <div className="auth-split-visual">
        <AuthVisual />
      </div>
    </div>
  );
}
