import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      console.error('[Login] Erreur:', err?.response?.data || err?.message, err);
      const msg =
        err.response?.data?.error?.message ||
        (err.response?.status === 0 || err.code === 'ERR_NETWORK' ? 'Connexion au serveur impossible.' : 'Connexion impossible');
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="card-header">
          <h1 className="card-title">Connexion</h1>
          <p className="card-subtitle">Accédez à votre espace VM Marketplace</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email</label>
            <input id="login-email" type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" autoComplete="email" required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Mot de passe</label>
            <input id="login-password" type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%' }}>
            {submitting ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <p className="auth-footer">Pas encore de compte ? <Link to="/register">Créer un compte</Link></p>
      </div>
    </div>
  );
}
