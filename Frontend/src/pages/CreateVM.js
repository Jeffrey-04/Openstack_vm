import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiService from '../services/api';

function CreateVM() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedFlavorFromMarketplace = location.state?.selectedFlavor;

  const [formData, setFormData] = useState({
    name: '',
    flavorRef: selectedFlavorFromMarketplace?.id || '',
    imageRef: '',
    networkId: ''
  });

  const [flavors, setFlavors] = useState([]);
  const [images, setImages] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    try {
      setLoading(true);
      setError(null);

      const [flavorsResult, imagesResult, networksResult] = await Promise.all([
        apiService.getFlavors(),
        apiService.getImages(),
        apiService.getNetworks()
      ]);

      setFlavors(flavorsResult.flavors || []);
      setImages(imagesResult.images || []);
      setNetworks(networksResult.networks || []);

      // Auto-select first private network if available
      const privateNetwork = networksResult.networks?.find(n => n.name === 'private' || !n['router:external']);
      if (privateNetwork && !formData.networkId) {
        setFormData(prev => ({ ...prev, networkId: privateNetwork.id }));
      }

    } catch (err) {
      console.error('Error loading resources:', err);
      setError('Impossible de charger les ressources');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.flavorRef || !formData.imageRef) {
      alert('Veuillez remplir tous les champs requis');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const result = await apiService.createVM(formData);
      
      alert('VM créée avec succès ! Elle sera prête dans quelques minutes.');
      navigate('/my-vms');

    } catch (err) {
      console.error('Error creating VM:', err);
      setError(err.response?.data?.error?.message || 'Erreur lors de la création de la VM');
    } finally {
      setCreating(false);
    }
  };

  const getSelectedFlavor = () => {
    return flavors.find(f => f.id === formData.flavorRef);
  };

  const getSelectedImage = () => {
    return images.find(i => i.id === formData.imageRef);
  };

  const formatRAM = (ram) => {
    if (ram >= 1024) {
      return `${(ram / 1024).toFixed(0)} GB`;
    }
    return `${ram} MB`;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'white' }}>Chargement du formulaire...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <h1 className="card-title">➕ Créer une Machine Virtuelle</h1>
          <p className="card-subtitle">Configurez et déployez votre nouvelle VM</p>
        </div>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        {/* Formulaire */}
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem' }}>Configuration</h2>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              <strong>Erreur:</strong> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">
                📝 Nom de la VM <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="form-control"
                placeholder="ex: mon-serveur-web"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                💿 Image Système <span style={{ color: 'red' }}>*</span>
              </label>
              <select
                name="imageRef"
                value={formData.imageRef}
                onChange={handleChange}
                className="form-control"
                required
              >
                <option value="">-- Choisir une image --</option>
                {images.map(image => (
                  <option key={image.id} value={image.id}>
                    {image.name} {image.size ? `(${(image.size / 1024 / 1024).toFixed(0)} MB)` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                ⚙️ Configuration (Flavor) <span style={{ color: 'red' }}>*</span>
              </label>
              <select
                name="flavorRef"
                value={formData.flavorRef}
                onChange={handleChange}
                className="form-control"
                required
              >
                <option value="">-- Choisir une configuration --</option>
                {flavors.map(flavor => (
                  <option key={flavor.id} value={flavor.id}>
                    {flavor.name} - {flavor.vcpus} vCPU, {formatRAM(flavor.ram)}, {flavor.disk}GB - ${flavor.price}/mois
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                🌐 Réseau
              </label>
              <select
                name="networkId"
                value={formData.networkId}
                onChange={handleChange}
                className="form-control"
              >
                <option value="">-- Auto (réseau par défaut) --</option>
                {networks.map(network => (
                  <option key={network.id} value={network.id}>
                    {network.name} {network['router:external'] ? '(Public)' : '(Privé)'}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button
                type="submit"
                disabled={creating}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                {creating ? '⏳ Création en cours...' : '🚀 Créer la VM'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/my-vms')}
                className="btn btn-secondary"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>

        {/* Récapitulatif */}
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem' }}>📋 Récapitulatif</h2>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', marginBottom: '0.75rem' }}>
              <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Nom</div>
              <div style={{ fontWeight: 'bold' }}>{formData.name || 'Non spécifié'}</div>
            </div>

            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', marginBottom: '0.75rem' }}>
              <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Image</div>
              <div style={{ fontWeight: 'bold' }}>{getSelectedImage()?.name || 'Non sélectionnée'}</div>
            </div>

            {getSelectedFlavor() && (
              <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', marginBottom: '0.75rem' }}>
                <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Configuration</div>
                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{getSelectedFlavor().name}</div>
                <div style={{ fontSize: '0.875rem', color: '#4b5563' }}>
                  <div>💾 RAM: {formatRAM(getSelectedFlavor().ram)}</div>
                  <div>⚡ vCPUs: {getSelectedFlavor().vcpus}</div>
                  <div>💿 Disque: {getSelectedFlavor().disk} GB</div>
                </div>
              </div>
            )}
          </div>

          {getSelectedFlavor() && (
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '1.5rem',
              borderRadius: '8px',
              textAlign: 'center',
              color: 'white'
            }}>
              <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Coût estimé</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                ${getSelectedFlavor().price}
              </div>
              <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>par mois</div>
            </div>
          )}

          <div className="alert alert-info" style={{ marginTop: '1.5rem' }}>
            <strong>ℹ️ Info:</strong> Votre VM sera prête dans 2-5 minutes après la création.
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '2rem', background: '#fef3c7' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>⚠️ Important</h3>
        <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8', color: '#92400e', margin: 0 }}>
          <li>Assurez-vous d'avoir sélectionné la bonne image système</li>
          <li>La configuration peut être modifiée après la création (resize)</li>
          <li>Les VMs sont facturées à l'heure d'utilisation</li>
          <li>N'oubliez pas d'arrêter vos VMs quand vous ne les utilisez pas</li>
        </ul>
      </div>
    </div>
  );
}

export default CreateVM;

