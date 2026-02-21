import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import apiService from '../../services/api';
import toast from 'react-hot-toast';
import Skeleton from '../../components/Skeleton';
import './ClientOverview.css';

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd'];
const TREND_UP = '#059669';
const TREND_DOWN = '#dc2626';

export default function ClientOverview() {
  const [vms, setVMs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const vmsResult = await apiService.getVMs();
      const servers = vmsResult.servers || [];
      setVMs(servers);
    } catch (err) {
      console.error('Error loading client dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const activeCount = vms.filter((vm) => vm.status === 'ACTIVE').length;
  const stoppedCount = vms.filter((vm) => vm.status === 'SHUTOFF').length;
  const otherCount = vms.length - activeCount - stoppedCount;

  let pieData = [
    { name: 'Actifs', value: activeCount, color: CHART_COLORS[0] },
    { name: 'Arrêtés', value: stoppedCount, color: CHART_COLORS[1] },
    { name: 'Autres', value: Math.max(0, otherCount), color: CHART_COLORS[2] },
  ].filter((d) => d.value > 0);
  if (pieData.length === 0) pieData = [{ name: 'Aucune VM', value: 1, color: '#e5e7eb' }];

  const barData =
    vms.length > 0
      ? vms.slice(0, 7).map((vm, i) => ({
          name: vm.name || `VM ${i + 1}`,
          value: vm.status === 'ACTIVE' ? 1 : 0,
          total: 1,
        }))
      : [{ name: '—', value: 0, total: 1 }];

  const lineData =
    vms.length > 0
      ? vms.slice(0, 6).map((_, i) => ({
          name: `${i + 1}`,
          actifs: Math.min(activeCount, i + 1),
          total: i + 1,
        }))
      : [{ name: '1', actifs: 0, total: 0 }];

  const primaryVm = vms[0];
  const firstAddr = primaryVm?.addresses && Object.values(primaryVm.addresses)[0]?.[0]?.addr;
  const sshLine = firstAddr ? `ssh root@${firstAddr}` : 'ssh root@—';

  const copySsh = () => {
    if (sshLine.includes('—')) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(sshLine).then(() => toast.success('Commande copiée.')).catch(() => toast.error('Copie impossible.'));
    }
  };

  if (loading) {
    return (
      <div className="dashboard-figma">
        <div className="dashboard-figma-grid">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="card" height={240} className="dashboard-figma-card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-figma">
      <div className="dashboard-figma-grid">
        {/* Card 1: Revenue-style — VPS principal */}
        <div className="dashboard-figma-card dashboard-figma-card-revenue">
          <div className="dashboard-figma-card-head">
            <h3 className="dashboard-figma-card-title">VPS</h3>
            <Link to="/client/vms" className="dashboard-figma-link">Voir rapport</Link>
          </div>
          <div className="dashboard-figma-metric">{vms.length}</div>
          <div className="dashboard-figma-trend dashboard-figma-trend-up">
            ↑ {vms.length > 0 ? activeCount : 0} actif{vms.length > 0 && activeCount !== 1 ? 's' : ''} cette semaine
          </div>
          <p className="dashboard-figma-period">VPS sur la plateforme.</p>
          <div className="dashboard-figma-chart-wrap">
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} name="Actifs" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="dashboard-figma-legend">
            <span className="dashboard-figma-legend-dot" style={{ background: CHART_COLORS[0] }} /> Actifs
          </div>
        </div>

        {/* Card 2: Order Time — Répartition */}
        <div className="dashboard-figma-card dashboard-figma-card-donut">
          <div className="dashboard-figma-card-head">
            <h3 className="dashboard-figma-card-title">Répartition</h3>
            <Link to="/client/vms" className="dashboard-figma-link">Voir rapport</Link>
          </div>
          <p className="dashboard-figma-period">État des VPS.</p>
          <div className="dashboard-figma-donut-wrap">
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={56}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name} ${value}`}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="dashboard-figma-legend dashboard-figma-legend-row">
            {pieData.map((d, i) => (
              <span key={i} className="dashboard-figma-legend-item">
                <span className="dashboard-figma-legend-dot" style={{ background: d.color }} /> {d.name} {pieData.length > 1 && `${d.value}`}
              </span>
            ))}
          </div>
        </div>

        {/* Card 3: Rating-style — Accès & état */}
        <div className="dashboard-figma-card dashboard-figma-card-rating">
          <h3 className="dashboard-figma-card-title">Accès & état</h3>
          <p className="dashboard-figma-desc">Accès root et statut de votre VPS principal.</p>
          <div className="dashboard-figma-rating-row">
            <div className="dashboard-figma-rating-circle">
              <span className="dashboard-figma-rating-value">{primaryVm ? (primaryVm.status === 'ACTIVE' ? 100 : 0) : '—'}</span>
              <span className="dashboard-figma-rating-label">Dispo</span>
            </div>
            <div className="dashboard-figma-rating-circle">
              <span className="dashboard-figma-rating-value">{vms.length}</span>
              <span className="dashboard-figma-rating-label">VPS</span>
            </div>
            <div className="dashboard-figma-rating-circle">
              <span className="dashboard-figma-rating-value">{activeCount}</span>
              <span className="dashboard-figma-rating-label">Actifs</span>
            </div>
          </div>
          <div className="dashboard-figma-ssh">
            <span className="dashboard-figma-card-label">Accès root</span>
            <div className="dashboard-figma-ssh-row">
              <code className="dashboard-figma-ssh-line">{sshLine}</code>
              <button type="button" className="dashboard-figma-btn-copy" onClick={copySsh}>Copier</button>
            </div>
          </div>
        </div>

        {/* Card 4: Most Ordered — Mes VMs */}
        <div className="dashboard-figma-card dashboard-figma-card-list">
          <h3 className="dashboard-figma-card-title">Mes VMs</h3>
          <p className="dashboard-figma-desc">Dernières machines virtuelles.</p>
          <ul className="dashboard-figma-list">
            {vms.length === 0 ? (
              <li className="dashboard-figma-list-empty">Aucune VM</li>
            ) : (
              vms.slice(0, 4).map((vm) => (
                <li key={vm.id} className="dashboard-figma-list-item">
                  <span className="dashboard-figma-list-thumb" aria-hidden="true">{vm.name?.[0] || 'V'}</span>
                  <div className="dashboard-figma-list-content">
                    <span className="dashboard-figma-list-name">{vm.name || `VM ${vm.id?.slice(0, 8)}`}</span>
                    <span className="dashboard-figma-list-meta">{vm.status === 'ACTIVE' ? 'Actif' : 'Arrêté'}</span>
                  </div>
                  <Link to={`/client/vms/${vm.id}`} className="dashboard-figma-list-link">Voir</Link>
                </li>
              ))
            )}
          </ul>
          <Link to="/client/vms" className="dashboard-figma-card-footer-link">Voir toutes les VMs</Link>
        </div>

        {/* Card 5: Order trend — Activité */}
        <div className="dashboard-figma-card dashboard-figma-card-trend">
          <div className="dashboard-figma-card-head">
            <h3 className="dashboard-figma-card-title">Activité</h3>
            <Link to="/client/vms" className="dashboard-figma-link">Voir rapport</Link>
          </div>
          <div className="dashboard-figma-metric">{vms.length}</div>
          <div className={`dashboard-figma-trend ${activeCount >= (vms.length || 1) ? 'dashboard-figma-trend-up' : 'dashboard-figma-trend-down'}`}>
            {activeCount >= (vms.length || 1) ? '↑' : '↓'} {vms.length} VPS au total
          </div>
          <p className="dashboard-figma-period">VPS sur la plateforme.</p>
          <div className="dashboard-figma-chart-wrap">
            <ResponsiveContainer width="100%" height={100}>
              <LineChart data={lineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis hide />
                <Tooltip />
                <Line type="monotone" dataKey="actifs" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} name="Actifs" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="dashboard-figma-legend">
            <span className="dashboard-figma-legend-dot" style={{ background: CHART_COLORS[0] }} /> Actifs
          </div>
        </div>
      </div>

      {vms.length === 0 && (
        <div className="dashboard-figma-cta">
          <h3>Créer votre premier VPS</h3>
          <p>Démarrez en quelques clics avec une machine virtuelle prête à l&apos;emploi.</p>
          <Link to="/client/create" className="dashboard-figma-btn-primary">Créer une VM</Link>
        </div>
      )}
    </div>
  );
}
