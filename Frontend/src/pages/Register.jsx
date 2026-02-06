import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register({ email, password, name: name || undefined });
      navigate('/', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.error?.details?.[0]?.msg || 'Inscription impossible';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="card-header">
          <h1 className="card-title">Créer un compte</h1>
          <p className="card-subtitle">Rejoignez la plateforme VM Marketplace</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">Nom (optionnel)</label>
            <input
              id="reg-name"
              type="text"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Votre nom"
              autoComplete="name"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Mot de passe (min. 8 caractères, 1 chiffre)</label>
            <input
              id="reg-password"
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%' }}>
            {submitting ? 'Inscription...' : 'S\'inscrire'}
          </button>
        </form>
        <p className="auth-footer">
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
