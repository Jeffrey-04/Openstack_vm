import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DollarSign, ShoppingCart, Server, Users } from 'lucide-react';
import apiService from '../../services/api';
import toast from 'react-hot-toast';
import Skeleton from '../../components/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import './ClientOverview.css';

/* Sales Dashboard: vives couleurs (rose, orange, vert, violet, bleu) */
const KPI_COLORS = {
  pink: { bg: '#fdf2f8', border: '#f9a8d4', text: '#be185d', icon: '#ec4899' },
  orange: { bg: '#fff7ed', border: '#fdba74', text: '#c2410c', icon: '#f97316' },
  green: { bg: '#f0fdf4', border: '#86efac', text: '#15803d', icon: '#22c55e' },
  purple: { bg: '#faf5ff', border: '#c4b5fd', text: '#6d28d9', icon: '#8b5cf6' },
};
const CHART_COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#eab308', '#8b5cf6', '#ec4899'];

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
    { name: 'Arrêtés', value: stoppedCount, color: CHART_COLORS[2] },
    { name: 'Autres', value: Math.max(0, otherCount), color: CHART_COLORS[4] },
  ].filter((d) => d.value > 0);
  if (pieData.length === 0) pieData = [{ name: 'Aucune VM', value: 1, color: '#94a3b8' }];

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

  const trendPct = vms.length > 0 ? (activeCount / vms.length * 100).toFixed(1) : '0';

  if (!loading && vms.length === 0) {
    return (
      <div className="dashboard-figma sales-dashboard">
        <EmptyState
          title="Aucune VM pour l'instant"
          message="Créez votre première machine virtuelle pour commencer. Vous pourrez suivre l'usage, accéder en SSH et à la console, et être facturé à la demi-heure."
          action={
            <Link to="/client/create" className="btn btn-primary">
              Créer ma première VM
            </Link>
          }
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard-figma sales-dashboard">
        <div className="sales-kpi-row">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="card" height={110} className="sales-kpi-card" />
          ))}
        </div>
        <div className="dashboard-figma-grid">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="card" height={240} className="dashboard-figma-card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-figma sales-dashboard">
      {/* 4 KPI colorées style Sales Dashboard */}
      <div className="sales-kpi-row">
        <div className="sales-kpi-card" style={{ background: KPI_COLORS.pink.bg, borderColor: KPI_COLORS.pink.border }}>
          <div className="sales-kpi-icon" style={{ background: KPI_COLORS.pink.icon }}>
            <DollarSign size={20} color="#fff" />
          </div>
          <div className="sales-kpi-content">
            <div className="sales-kpi-value" style={{ color: KPI_COLORS.pink.text }}>{vms.length}</div>
            <div className="sales-kpi-label">Total VPS</div>
            <div className="sales-kpi-trend sales-trend-up">+{trendPct}% actifs</div>
          </div>
        </div>
        <div className="sales-kpi-card" style={{ background: KPI_COLORS.orange.bg, borderColor: KPI_COLORS.orange.border }}>
          <div className="sales-kpi-icon" style={{ background: KPI_COLORS.orange.icon }}>
            <ShoppingCart size={20} color="#fff" />
          </div>
          <div className="sales-kpi-content">
            <div className="sales-kpi-value" style={{ color: KPI_COLORS.orange.text }}>{activeCount}</div>
            <div className="sales-kpi-label">VPS actifs</div>
            <div className="sales-kpi-trend sales-trend-up">+{vms.length ? ((activeCount / vms.length) * 100).toFixed(0) : 0}% cette semaine</div>
          </div>
        </div>
        <div className="sales-kpi-card" style={{ background: KPI_COLORS.green.bg, borderColor: KPI_COLORS.green.border }}>
          <div className="sales-kpi-icon" style={{ background: KPI_COLORS.green.icon }}>
            <Server size={20} color="#fff" />
          </div>
          <div className="sales-kpi-content">
            <div className="sales-kpi-value" style={{ color: KPI_COLORS.green.text }}>{vms.length}</div>
            <div className="sales-kpi-label">Machines</div>
            <div className="sales-kpi-trend sales-trend-up">sur la plateforme</div>
          </div>
        </div>
        <div className="sales-kpi-card" style={{ background: KPI_COLORS.purple.bg, borderColor: KPI_COLORS.purple.border }}>
          <div className="sales-kpi-icon" style={{ background: KPI_COLORS.purple.icon }}>
            <Users size={20} color="#fff" />
          </div>
          <div className="sales-kpi-content">
            <div className="sales-kpi-value" style={{ color: KPI_COLORS.purple.text }}>{stoppedCount}</div>
            <div className="sales-kpi-label">VPS arrêtés</div>
            <div className="sales-kpi-trend">{stoppedCount > 0 ? 'En pause' : '—'}</div>
          </div>
        </div>
      </div>

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
                <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[6, 6, 0, 0]} name="Actifs" />
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

        {/* Card 5: Activité récente — Dernières VMs */}
        <div className="dashboard-figma-card dashboard-figma-card-trend">
          <div className="dashboard-figma-card-head">
            <h3 className="dashboard-figma-card-title">Activité récente</h3>
            <Link to="/client/vms" className="dashboard-figma-link">Voir tout</Link>
          </div>
          <p className="dashboard-figma-period">Dernières machines créées ou modifiées.</p>
          {vms.length === 0 ? (
            <p className="dashboard-figma-muted">Aucune VM</p>
          ) : (
            <ul className="dashboard-figma-list" style={{ marginTop: '0.5rem' }}>
              {[...vms]
                .sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0))
                .slice(0, 5)
                .map((vm) => (
                  <li key={vm.id} className="dashboard-figma-list-item">
                    <span className="dashboard-figma-list-item-name">{vm.name || vm.id?.slice(0, 8)}</span>
                    <span className="dashboard-figma-list-item-meta">
                      {vm.status === 'ACTIVE' ? 'Actif' : vm.status === 'SHUTOFF' ? 'Arrêté' : vm.status} — {vm.created ? new Date(vm.created).toLocaleDateString('fr-FR') : '—'}
                    </span>
                    <Link to={`/client/vms/${vm.id}`} className="dashboard-figma-list-link">Voir</Link>
                  </li>
                ))}
            </ul>
          )}
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
