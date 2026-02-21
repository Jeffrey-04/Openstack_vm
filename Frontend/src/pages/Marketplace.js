import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../services/api';
import './Marketplace.css';

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
    if (ram >= 1024) return `${(ram / 1024).toFixed(0)} GB`;
    return `${ram} MB`;
  };

  const formatPriceFCFA = (price) => {
    if (price == null) return '—';
    return `${Number(price).toLocaleString('fr-FR')} FCFA`;
  };

  /* Design image 1: 3 plans type Basic / Developer / Advanced. On mappe les flavors sur 3 cartes; si plus de 3, on prend les 3 premiers ou on crée des paliers. */
  const planBasic = flavors[0] || { name: 'Basic', ram: 1024, vcpus: 1, disk: 25, price: 5000 };
  const planDeveloper = flavors[1] || flavors[0] || { name: 'Developer', ram: 5120, vcpus: 2, disk: 256, price: 15000 };
  const planAdvanced = flavors[2] || flavors[1] || flavors[0] || { name: 'Advanced', ram: 25600, vcpus: 4, disk: 1024, price: 45000 };

  const plans = [
    {
      id: planBasic.id || 'basic',
      name: 'Basic',
      description: 'Idéal pour les projets légers et les tests.',
      price: planBasic.price,
      ram: planBasic.ram,
      storage: planBasic.disk,
      ssd: Math.min(planBasic.disk || 10, 10),
      support: '1 an',
      flavor: planBasic,
      mostUsed: false,
    },
    {
      id: planDeveloper.id || 'developer',
      name: 'Developer',
      description: 'Équilibre parfait pour le développement et les petites applications.',
      price: planDeveloper.price,
      ram: planDeveloper.ram,
      storage: planDeveloper.disk,
      ssd: Math.min(planDeveloper.disk || 100, 100),
      support: 'Support à vie',
      flavor: planDeveloper,
      mostUsed: true,
    },
    {
      id: planAdvanced.id || 'advanced',
      name: 'Advanced',
      description: 'Pour les applications exigeantes et la production.',
      price: planAdvanced.price,
      ram: planAdvanced.ram,
      storage: planAdvanced.disk,
      ssd: Math.min(planAdvanced.disk || 240, 240),
      support: 'Support à vie',
      flavor: planAdvanced,
      mostUsed: false,
    },
  ];

  if (loading) {
    return (
      <div className="marketplace-wrap">
        <div className="marketplace-loading">
          <div className="marketplace-spinner" />
          <p>Chargement du marketplace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="marketplace-wrap">
        <div className="marketplace-error">
          <strong>Erreur</strong> {error}
          <button type="button" onClick={loadFlavors} className="marketplace-btn-retry">Réessayer</button>
        </div>
      </div>
    );
  }

  return (
    <div className="marketplace-wrap">
      <div className="marketplace-cards">
        {plans.map((plan) => (
          <div key={plan.id} className="marketplace-card">
            {plan.mostUsed && (
              <div className="marketplace-card-badge">Le plus utilisé</div>
            )}
            <h3 className="marketplace-card-title">{plan.name}</h3>
            <p className="marketplace-card-desc">{plan.description}</p>
            <div className="marketplace-price-wrap">
              <span className="marketplace-price-main">{formatPriceFCFA(plan.price).replace(/\sFCFA$/, '')}</span>
              <span className="marketplace-price-decimal"> FCFA</span>
            </div>
            <p className="marketplace-price-period">Par mois</p>
            <ul className="marketplace-features">
              <li>{formatRAM(plan.ram)} RAM</li>
              <li>{plan.storage} GB Stockage</li>
              <li>{plan.ssd} GB SSD</li>
              <li>{plan.support} Support</li>
            </ul>
            <Link
              to="/client/create"
              state={{ selectedFlavor: plan.flavor }}
              className="marketplace-btn-buy"
            >
              Acheter
            </Link>
          </div>
        ))}
      </div>
      <div className="marketplace-footer-note">
        <p>Tous les prix sont mensuels en FCFA. Pas de frais cachés. Annulez à tout moment.</p>
      </div>
    </div>
  );
}

export default Marketplace;
