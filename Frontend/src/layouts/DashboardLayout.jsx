import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './DashboardLayout.css';

const CLIENT_SIDEBAR_ITEMS = [
  { label: 'Overview', path: '/client', icon: '◉' },
  { label: 'Mes VMs', path: '/client/vms', icon: '▣' },
  { label: 'Marketplace', path: '/client/marketplace', icon: '◇' },
  { label: 'Créer une VM', path: '/client/create', icon: '⊕' },
  { label: 'OpenStack', path: '/dashboard', external: true, icon: '⚙' },
  { label: 'Paramètres', path: '/client/settings', icon: '⚙' },
  { label: 'Facturation', path: '/client/billing', icon: '◈' },
];

const ADMIN_SIDEBAR_ITEMS = [
  { label: 'Overview', path: '/admin', icon: '◉' },
  { label: 'VMs', path: '/admin/vms', icon: '▣' },
  { label: 'Créer une VM', path: '/admin/create', icon: '⊕' },
  { label: 'Utilisateurs', path: '/admin/users', icon: '◐' },
  { label: 'Facturation', path: '/admin/billing', icon: '◈' },
  { label: 'Paramètres', path: '/admin/settings', icon: '⚙' },
];

const TITLE_MAP = {
  client: { '': ['Overview', 'VPS - VM Marketplace - Overview'], vms: ['Mes VMs', 'VPS - Mes machines'], marketplace: ['Marketplace', 'VPS - Offres'], create: ['Créer une VM', 'VPS - Nouvelle machine'], settings: ['Paramètres', 'VPS - Paramètres'], billing: ['Facturation', 'VPS - Facturation'] },
  admin: { '': ['Overview', 'Admin - VM Marketplace - Overview'], vms: ['VMs', 'Admin - Liste des VMs'], create: ['Créer une VM', 'Admin - Nouvelle machine'], users: ['Utilisateurs', 'Admin - Utilisateurs'], billing: ['Facturation', 'Admin - Facturation'], settings: ['Paramètres', 'Admin - Paramètres'] },
};

const SEGMENT_LABELS = {
  client: { '': 'Overview', vms: 'Mes VMs', marketplace: 'Marketplace', create: 'Créer une VM', settings: 'Paramètres', billing: 'Facturation' },
  admin: { '': 'Overview', vms: 'VMs', create: 'Créer une VM', users: 'Utilisateurs', billing: 'Facturation', settings: 'Paramètres' },
};

export default function DashboardLayout({ type = 'client' }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const basePath = type === 'client' ? '/client' : '/admin';
  const pathSuffix = location.pathname.replace(basePath, '') || '';
  const segment = pathSuffix.replace(/^\//, '') || '';
  const map = TITLE_MAP[type] || TITLE_MAP.client;
  const segLabels = SEGMENT_LABELS[type] || SEGMENT_LABELS.client;
  const [title, subtitle] = map[segment] || map[''] || ['Overview', 'VM Marketplace'];
  const breadcrumbItems = [{ path: basePath, label: segLabels[''] || 'Overview' }];
  if (segment) breadcrumbItems.push({ path: `${basePath}/${segment}`, label: segLabels[segment] || segment });

  const sidebarItems = type === 'admin' ? ADMIN_SIDEBAR_ITEMS : CLIENT_SIDEBAR_ITEMS;

  const isActive = (path) => {
    if (path === '/client' || path === '/admin') return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="dashboard-layout">
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : 'collapsed'} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <Link to={type === 'client' ? '/client' : '/admin'} className="sidebar-brand">
            <span className="sidebar-brand-icon">☁</span>
            <span className="sidebar-brand-text">VM Marketplace</span>
          </Link>
        </div>
        <nav className="sidebar-nav">
          {sidebarItems.map((item) =>
            item.external ? (
              <a
                key={item.path}
                href={item.path}
                target="_blank"
                rel="noopener noreferrer"
                className="sidebar-item"
              >
                <span className="sidebar-item-icon">{item.icon}</span>
                <span className="sidebar-item-label">{item.label}</span>
              </a>
            ) : (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
              >
                <span className="sidebar-item-icon">{item.icon}</span>
                <span className="sidebar-item-label">{item.label}</span>
              </Link>
            )
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="sidebar-user-avatar">
              {user?.name?.[0] || user?.email?.[0] || '?'}
            </span>
            <span className="sidebar-user-name">{user?.name || user?.email || 'User'}</span>
          </div>
          <button type="button" className="sidebar-logout" onClick={logout}>
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <button
            type="button"
            className="topbar-menu-toggle"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label="Menu"
          >
            ☰
          </button>
          <div className="topbar-breadcrumb">
            <nav className="breadcrumb" aria-label="Fil d'Ariane">
              {breadcrumbItems.map((item, i) => (
                <span key={item.path}>
                  {i > 0 && <span className="breadcrumb-sep"> › </span>}
                  {i === breadcrumbItems.length - 1 ? (
                    <span className="breadcrumb-current">{item.label}</span>
                  ) : (
                    <Link to={item.path} className="breadcrumb-link">{item.label}</Link>
                  )}
                </span>
              ))}
            </nav>
            <h1 className="topbar-title">{title}</h1>
            {subtitle && <p className="topbar-subtitle">{subtitle}</p>}
          </div>
          <div className="topbar-actions">
            <a
              href="/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="topbar-btn topbar-btn-terminal"
            >
              Terminal
            </a>
            <div className="topbar-user">
              <span className="topbar-user-avatar">
                {user?.name?.[0] || user?.email?.[0] || '?'}
              </span>
              <span className="topbar-user-name">{user?.name || user?.email || 'User'}</span>
            </div>
          </div>
        </header>
        <div className="dashboard-content">
          <Outlet />
        </div>
      </div>

      <div
        className={`dashboard-overlay ${mobileMenuOpen ? 'visible' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
        role="presentation"
      />
    </div>
  );
}
