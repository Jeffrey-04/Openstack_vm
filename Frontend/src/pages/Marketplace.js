import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../services/api';

function Marketplace() {
  const [flavors, setFlavors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFlavors();
  }, []);

  const loadFlavors = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiService.getFlavors();
      setFlavors(result.flavors || []);
    } catch (err) {
      console.error('Error loading flavors:', err);
      setError('Impossible de charger les configurations');
    } finally {
      setLoading(false);
    }
  };

  const formatRAM = (ram) => {
    if (ram >= 1024) {
      return `${(ram / 1024).toFixed(0)} GB`;
    }
    return `${ram} MB`;
  };

  const formatPriceFCFA = (price) => {
    if (price == null) return '—';
    return `${Number(price).toLocaleString('fr-FR')} FCFA`;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'white' }}>Chargement du marketplace...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <strong>Erreur:</strong> {error}
        <button onClick={loadFlavors} className="btn btn-sm btn-primary" style={{ marginLeft: '1rem' }}>
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <h1 className="card-title">Marketplace</h1>
          <p className="card-subtitle">Choisissez la configuration parfaite pour votre machine virtuelle</p>
        </div>
      </div>

      {flavors.length === 0 ? (
        <div className="alert alert-info">
          <strong>Info:</strong> Aucune configuration disponible pour le moment.
        </div>
      ) : (
        <div className="grid grid-3">
          {flavors.map((flavor) => (
            <div key={flavor.id} className="card" style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                <span className="badge badge-info">{flavor.name}</span>
              </div>
              
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#64748b' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
                  {flavor.name}
                </h3>
              </div>

              <div style={{ marginBottom: '1.5rem', borderTop: '2px solid #f3f4f6', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ color: '#6b7280' }}>RAM:</span>
                  <strong>{formatRAM(flavor.ram)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ color: '#6b7280' }}>vCPUs:</span>
                  <strong>{flavor.vcpus}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ color: '#6b7280' }}>Disque:</span>
                  <strong>{flavor.disk} GB</strong>
                </div>
              </div>

              <div style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                padding: '1rem', 
                borderRadius: '8px',
                textAlign: 'center',
                marginBottom: '1rem'
              }}>
                <div style={{ color: 'white', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  À partir de
                </div>
                <div style={{ color: 'white', fontSize: '2rem', fontWeight: 'bold' }}>
                  {formatPriceFCFA(flavor.price)}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
                  par mois
                </div>
              </div>

              <Link 
                to="/client/create" 
                state={{ selectedFlavor: flavor }}
                className="btn btn-primary" 
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Créer avec cette config
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginTop: '2rem', background: '#fef3c7' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Tarification transparente</h3>
        <p style={{ color: '#92400e', marginBottom: '0' }}>
          Tous les prix sont mensuels en FCFA. Pas de frais cachés. Annulez à tout moment.
          Facturation à l'heure pour plus de flexibilité.
        </p>
      </div>
    </div>
  );
}

export default Marketplace;

