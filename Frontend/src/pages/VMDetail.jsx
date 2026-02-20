import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiService from '../services/api';
import toast from 'react-hot-toast';
import Skeleton from '../components/Skeleton';
import { UsageChart } from '../components/charts/UsageChart';
import './VMDetail.css';

function copyToClipboard(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    return Promise.resolve(true);
  } catch (e) {
    return Promise.resolve(false);
  } finally {
    document.body.removeChild(textarea);
  }
}

const STATUS_MAP = {
  ACTIVE: { label: 'En cours d\'exécution', class: 'vm-detail-status-running' },
  SHUTOFF: { label: 'Arrêté', class: 'vm-detail-status-stopped' },
  BUILD: { label: 'En construction', class: 'vm-detail-status-building' },
  ERROR: { label: 'Erreur', class: 'vm-detail-status-error' },
  PAUSED: { label: 'En pause', class: 'vm-detail-status-paused' },
  SUSPENDED: { label: 'Suspendu', class: 'vm-detail-status-paused' }
};

function VMDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isClient = window.location.pathname.startsWith('/client');
  const basePath = isClient ? '/client' : '/admin';

  const [vm, setVm] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [scalingHistory, setScalingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [consoleLoading, setConsoleLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadVm();
  }, [id]);

  useEffect(() => {
    if (!vm || vm.status !== 'BUILD') return;
    const interval = setInterval(() => {
      apiService.getVM(id).then((res) => {
        const server = res.server;
        if (server) setVm(server);
      }).catch(() => {});
    }, 6000);
    return () => clearInterval(interval);
  }, [id, vm?.status]);

  const loadVm = async () => {
    try {
      setLoading(true);
      const [serverRes, policyRes, metricsRes, historyRes] = await Promise.all([
        apiService.getVM(id).catch(() => ({ server: null })),
        apiService.getVmScalingPolicy(id).catch(() => ({ policy: null })),
        apiService.getVmMetrics(id).catch(() => ({ metrics: {} })),
        apiService.getVmScalingHistory(id).catch(() => ({ history: [] }))
      ]);
      setVm(serverRes.server || null);
      setPolicy(policyRes.policy || null);
      setMetrics(metricsRes.metrics || {});
      setScalingHistory(historyRes.history || []);
    } catch (err) {
      console.error('Load VM detail:', err);
      toast.error('Impossible de charger la VM');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    if (action === 'delete' && !window.confirm('Supprimer cette VM ? Cette action est irréversible.')) return;
    try {
      setActionLoading(true);
      if (action === 'delete') {
        await apiService.deleteVM(id);
        toast.success('VM supprimée');
        navigate(`${basePath}/vms`);
        return;
      }
      await apiService.vmAction(id, action);
      toast.success(action === 'reboot' ? 'Redémarrage en cours' : action === 'start' ? 'Démarrage en cours' : 'Arrêt en cours');
      setTimeout(loadVm, 2000);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Erreur lors de l\'action');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopy = (text, label) => {
    copyToClipboard(text).then((ok) => {
      if (ok) toast.success(`${label} copié`);
      else toast.error('Copie impossible');
    });
  };

  if (loading && !vm) {
    return (
      <div className="vm-detail">
        <div className="vm-detail-header">
          <Skeleton variant="title" width="40%" />
          <Skeleton variant="text" width="60%" />
        </div>
        <div className="vm-detail-cards">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="card" height={100} className="vm-detail-card" />
          ))}
        </div>
      </div>
    );
  }

  if (!vm) {
    return (
      <div className="vm-detail vm-detail-error">
        <p>VM introuvable.</p>
        <Link to={`${basePath}/vms`} className="vm-detail-back">Retour aux VMs</Link>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[vm.status] || { label: vm.status, class: 'vm-detail-status-unknown' };
  const firstAddr = vm.addresses && Object.values(vm.addresses)[0]?.[0]?.addr;
  const sshLine = firstAddr ? `ssh root@${firstAddr}` : '';
  const flavor = vm.flavor || {};
  const ramGb = flavor.ram != null ? (flavor.ram / 1024).toFixed(0) : '—';
  const osName = vm.image?.name || 'Ubuntu';
  const osShort = osName.split(' ')[0] || 'Ubuntu';

  const cpuMetric = (metrics.cpu_util || [])[0]?.value;
  const memMetric = (metrics.memory_usage || metrics.mem_util || [])[0]?.value;
  const chartData = useMemo(() => {
    const cpu = (metrics.cpu_util || []).slice(0, 30).reverse();
    const mem = (metrics.memory_usage || metrics.mem_util || []).slice(0, 30).reverse();
    const byTime = {};
    cpu.forEach((p) => {
      const t = p.timestamp ? new Date(p.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
      if (!byTime[t]) byTime[t] = { name: t, cpu_util: undefined, memory_usage: undefined };
      byTime[t].cpu_util = p.value;
    });
    mem.forEach((p) => {
      const t = p.timestamp ? new Date(p.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
      if (!byTime[t]) byTime[t] = { name: t, cpu_util: undefined, memory_usage: undefined };
      byTime[t].memory_usage = p.value;
    });
    return Object.values(byTime).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [metrics.cpu_util, metrics.memory_usage, metrics.mem_util]);
  const hasChartData = chartData.length > 1;

  return (
    <div className="vm-detail">
      <div className="vm-detail-breadcrumb">
        <Link to={basePath}>Accueil</Link>
        <span className="vm-detail-breadcrumb-sep">/</span>
        <Link to={`${basePath}/vms`}>Mes VMs</Link>
        <span className="vm-detail-breadcrumb-sep">/</span>
        <span>{vm.name || vm.id}</span>
      </div>

      <div className="vm-detail-top">
        <div className="vm-detail-card vm-detail-card-os">
          <span className="vm-detail-os-logo">{osShort}</span>
          <span className="vm-detail-os-version">{osName}</span>
          <span className="vm-detail-plan">KVM {flavor.vcpus || '—'}</span>
          <span className={`vm-detail-status ${statusInfo.class}`}>{statusInfo.label}</span>
        </div>
        <div className="vm-detail-card vm-detail-card-access">
          <div className="vm-detail-card-label">Accès root</div>
          <div className="vm-detail-ssh-row">
            <code>{sshLine || 'Aucune IP pour le moment'}</code>
            {sshLine && (
              <button type="button" className="vm-detail-btn-copy" onClick={() => handleCopy(sshLine, 'Commande SSH')}>
                Copier
              </button>
            )}
          </div>
        </div>
        <div className="vm-detail-card vm-detail-card-password">
          <div className="vm-detail-card-label">Mot de passe root</div>
          <Link to={`${basePath}/settings`} className="vm-detail-link">Modifier</Link>
        </div>
        <div className="vm-detail-card vm-detail-card-actions">
          {vm.status === 'ACTIVE' && (
            <button type="button" className="vm-detail-btn vm-detail-btn-restart" onClick={() => handleAction('reboot')} disabled={actionLoading}>
              Redémarrer le VPS
            </button>
          )}
          {vm.status === 'SHUTOFF' && (
            <button type="button" className="vm-detail-btn vm-detail-btn-start" onClick={() => handleAction('start')} disabled={actionLoading}>
              Démarrer
            </button>
          )}
          {vm.status === 'ACTIVE' && (
            <button type="button" className="vm-detail-btn vm-detail-btn-stop" onClick={() => handleAction('stop')} disabled={actionLoading}>
              Arrêter
            </button>
          )}
          <button type="button" className="vm-detail-btn vm-detail-btn-more" title="Autres actions">...</button>
        </div>
      </div>

      <section className="vm-detail-section">
        <h2 className="vm-detail-section-title">Utilisation des ressources</h2>
        <div className="vm-detail-metrics">
          <div className="vm-detail-card vm-detail-metric-card">
            <div className="vm-detail-metric-label">Utilisation du CPU</div>
            <div className="vm-detail-metric-value">{cpuMetric != null ? `${Math.round(cpuMetric)}%` : '—'}</div>
            <div className="vm-detail-metric-bar">
              <div className="vm-detail-metric-fill" style={{ width: `${cpuMetric != null ? Math.min(100, cpuMetric) : 0}%` }} />
            </div>
          </div>
          <div className="vm-detail-card vm-detail-metric-card">
            <div className="vm-detail-metric-label">Utilisation de la mémoire</div>
            <div className="vm-detail-metric-value">{memMetric != null ? `${Math.round(memMetric)}%` : '—'}</div>
            <div className="vm-detail-metric-bar">
              <div className="vm-detail-metric-fill" style={{ width: `${memMetric != null ? Math.min(100, memMetric) : 0}%` }} />
            </div>
          </div>
          <div className="vm-detail-card vm-detail-metric-card">
            <div className="vm-detail-metric-label">Utilisation du disque</div>
            <div className="vm-detail-metric-value">— / {flavor.disk || '—'} GB</div>
            <div className="vm-detail-metric-bar"><div className="vm-detail-metric-fill" style={{ width: '0%' }} /></div>
          </div>
          <div className="vm-detail-card vm-detail-metric-card">
            <div className="vm-detail-metric-label">Trafic entrant</div>
            <div className="vm-detail-metric-value">—</div>
          </div>
          <div className="vm-detail-card vm-detail-metric-card">
            <div className="vm-detail-metric-label">Trafic sortant</div>
            <div className="vm-detail-metric-value">—</div>
          </div>
          <div className="vm-detail-card vm-detail-metric-card">
            <div className="vm-detail-metric-label">Bande passante</div>
            <div className="vm-detail-metric-value">—</div>
          </div>
        </div>
        {hasChartData && (
          <div className="vm-detail-charts" style={{ marginTop: '1.5rem' }}>
            <UsageChart
              data={chartData}
              dataKeys={[
                { key: 'cpu_util', color: '#6366f1', name: 'CPU %' },
                { key: 'memory_usage', color: '#22c55e', name: 'Mémoire %' }
              ]}
              title="CPU et mémoire dans le temps"
              height={220}
            />
          </div>
        )}
      </section>

      <section className="vm-detail-section">
        <h2 className="vm-detail-section-title">Sécurité et sauvegardes</h2>
        <div className="vm-detail-security">
          <Link to={`${basePath}/settings`} className="vm-detail-card vm-detail-security-card">
            <span className="vm-detail-security-value">0</span>
            <span className="vm-detail-security-label">Clé SSH</span>
            <span className="vm-detail-security-arrow">→</span>
          </Link>
          <div className="vm-detail-card vm-detail-security-card">
            <span className="vm-detail-security-value">0</span>
            <span className="vm-detail-security-label">Règles de pare-feu</span>
            <span className="vm-detail-security-arrow">→</span>
          </div>
          <div className="vm-detail-card vm-detail-security-card">
            <span className="vm-detail-security-value">—</span>
            <span className="vm-detail-security-label">Snapshot et sauvegardes</span>
          </div>
          <div className="vm-detail-card vm-detail-security-card">
            <span className="vm-detail-security-value vm-detail-security-muted">Non installé</span>
            <span className="vm-detail-security-label">Scanner malware</span>
          </div>
        </div>
      </section>

      <section className="vm-detail-section">
        <h2 className="vm-detail-section-title">Informations du VPS</h2>
        <div className="vm-detail-info-table">
          <div className="vm-detail-info-row">
            <span className="vm-detail-info-label">Emplacement du serveur</span>
            <span className="vm-detail-info-value">—</span>
          </div>
          <div className="vm-detail-info-row">
            <span className="vm-detail-info-label">Système d'exploitation</span>
            <span className="vm-detail-info-value">{osName}</span>
          </div>
          <div className="vm-detail-info-row">
            <span className="vm-detail-info-label">Nom d'hôte</span>
            <span className="vm-detail-info-value">{vm.name || vm.id?.slice(0, 8)}</span>
          </div>
          <div className="vm-detail-info-row">
            <span className="vm-detail-info-label">Nom d'utilisateur SSH</span>
            <span className="vm-detail-info-value">
              root
              <button type="button" className="vm-detail-btn-icon" onClick={() => handleCopy('root', 'Nom d\'utilisateur')} title="Copier">Copier</button>
            </span>
          </div>
          <div className="vm-detail-info-row">
            <span className="vm-detail-info-label">IPv4</span>
            <span className="vm-detail-info-value">
              {firstAddr || '—'}
              {firstAddr && (
                <button type="button" className="vm-detail-btn-icon" onClick={() => handleCopy(firstAddr, 'Adresse IP')} title="Copier">Copier</button>
              )}
            </span>
          </div>
        </div>
      </section>

      <section className="vm-detail-section">
        <h2 className="vm-detail-section-title">Plan actuel</h2>
        <div className="vm-detail-plan-info">
          <div className="vm-detail-info-row">
            <span className="vm-detail-info-label">Plan actuel</span>
            <span className="vm-detail-info-value">
              {flavor.name || `KVM ${flavor.vcpus || '—'}`}
              <Link to={`${basePath}/create`} className="vm-detail-link vm-detail-link-btn">Améliorer</Link>
            </span>
          </div>
          <div className="vm-detail-info-row">
            <span className="vm-detail-info-label">Cœurs CPU</span>
            <span className="vm-detail-info-value">{flavor.vcpus ?? '—'}</span>
          </div>
          <div className="vm-detail-info-row">
            <span className="vm-detail-info-label">Mémoire</span>
            <span className="vm-detail-info-value">{ramGb} GB</span>
          </div>
          <div className="vm-detail-info-row">
            <span className="vm-detail-info-label">Espace disque</span>
            <span className="vm-detail-info-value">{flavor.disk ?? '—'} GB</span>
          </div>
        </div>
      </section>

      {policy && (
        <section className="vm-detail-section">
          <h2 className="vm-detail-section-title">Scaling automatique</h2>
          <div className="vm-detail-card vm-detail-scaling-card">
            <p>Seuil scale up : <strong>{policy.thresholdHigh}%</strong> — Seuil scale down : <strong>{policy.thresholdLow}%</strong></p>
            <p className="vm-detail-scaling-note">Le scale up ajoute des ressources (règle admin). Le scale down restaure la configuration initiale lorsque l'utilisation redescend sous le seuil bas.</p>
            {scalingHistory.length > 0 && (
              <div className="vm-detail-history">
                <h4>Historique des scale</h4>
                <ul>
                  {scalingHistory.slice(0, 10).map((e) => (
                    <li key={e.id}>
                      {e.action} — {new Date(e.timestamp).toLocaleString('fr-FR')}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="vm-detail-section vm-detail-terminal-section">
        <h2 className="vm-detail-section-title">Accès terminal</h2>
        <div className="vm-detail-card vm-detail-terminal-card">
          <p>Pour utiliser votre VM, connectez-vous en <strong>SSH</strong> depuis votre ordinateur :</p>
          <ol>
            <li>Ouvrez un terminal (Linux/macOS) ou PuTTY (Windows).</li>
            <li>Collez la commande : <code>{sshLine || 'ssh root@VOTRE_IP'}</code></li>
            <li>Entrez le mot de passe root (modifiable dans Paramètres).</li>
          </ol>
          {vm.status === 'ACTIVE' && (
            <div style={{ marginTop: '1rem' }}>
              <button
                type="button"
                className="vm-detail-btn vm-detail-btn-restart"
                disabled={consoleLoading}
                onClick={async () => {
                  setConsoleLoading(true);
                  try {
                    const res = await apiService.getVmConsole(id);
                    if (res?.url) window.open(res.url, '_blank', 'noopener,noreferrer');
                    else toast.error('Console non disponible');
                  } catch (e) {
                    toast.error(e.response?.data?.error?.message || 'Impossible d\'ouvrir la console');
                  } finally {
                    setConsoleLoading(false);
                  }
                }}
              >
                {consoleLoading ? 'Ouverture...' : 'Accéder à la console'}
              </button>
            </div>
          )}
          <p className="vm-detail-terminal-note">
            Une console navigateur (noVNC) peut être disponible depuis le dashboard OpenStack si votre hébergeur l'expose.
          </p>
        </div>
      </section>

      <div className="vm-detail-footer-actions">
        <Link to={`${basePath}/vms`} className="vm-detail-back">← Retour aux VMs</Link>
        <button type="button" className="vm-detail-btn vm-detail-btn-danger" onClick={() => handleAction('delete')} disabled={actionLoading}>
          Supprimer la VM
        </button>
      </div>
    </div>
  );
}

export default VMDetail;
