import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Server,
  ShoppingCart,
  PlusCircle,
  Settings,
  CreditCard,
  Box,
  TrendingUp,
  Users,
  Cloud,
  Menu,
  Search,
  Bell,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './DashboardLayout.css';

const ICON_MAP = {
  LayoutDashboard,
  Server,
  ShoppingCart,
  PlusCircle,
  Settings,
  CreditCard,
  Box,
  TrendingUp,
  Users,
  Cloud,
  Menu,
  Search,
  Bell,
  ChevronDown,
};

const CLIENT_SIDEBAR_ITEMS = [
  { label: 'Overview', path: '/client', icon: 'LayoutDashboard' },
  { label: 'Mes VMs', path: '/client/vms', icon: 'Server' },
  { label: 'Marketplace', path: '/client/marketplace', icon: 'ShoppingCart' },
  { label: 'Créer une VM', path: '/client/create', icon: 'PlusCircle' },
  { label: 'OpenStack', path: '/dashboard', external: true, icon: 'Settings' },
  { label: 'Paramètres', path: '/client/settings', icon: 'Settings' },
  { label: 'Facturation', path: '/client/billing', icon: 'CreditCard' },
];

const ADMIN_SIDEBAR_ITEMS = [
  { label: 'Overview', path: '/admin', icon: 'LayoutDashboard' },
  { label: 'VMs', path: '/admin/vms', icon: 'Server' },
  { label: 'Créer une VM', path: '/admin/create', icon: 'PlusCircle' },
  { label: 'Modèles VM', path: '/admin/vm-templates', icon: 'Box' },
  { label: 'Règle scale up', path: '/admin/scale-up-rule', icon: 'TrendingUp' },
  { label: 'Utilisateurs', path: '/admin/users', icon: 'Users' },
  { label: 'Facturation', path: '/admin/billing', icon: 'CreditCard' },
  { label: 'Paramètres', path: '/admin/settings', icon: 'Settings' },
];

const TITLE_MAP = {
  client: { '': ['Overview', 'VPS - VM Marketplace - Overview'], vms: ['Mes VMs', 'VPS - Mes machines'], marketplace: ['Marketplace', 'VPS - Offres'], create: ['Créer une VM', 'VPS - Nouvelle machine'], settings: ['Paramètres', 'VPS - Paramètres'], billing: ['Facturation', 'VPS - Facturation'] },
  admin: { '': ['Overview', 'Admin - VM Marketplace - Overview'], vms: ['VMs', 'Admin - Liste des VMs'], create: ['Créer une VM', 'Admin - Nouvelle machine'], 'vm-templates': ['Modèles VM', 'Admin - Modèles VM'], 'scale-up-rule': ['Règle scale up', 'Admin - Scale up'], users: ['Utilisateurs', 'Admin - Utilisateurs'], billing: ['Facturation', 'Admin - Facturation'], settings: ['Paramètres', 'Admin - Paramètres'] },
};

const SEGMENT_LABELS = {
  client: { '': 'Overview', vms: 'Mes VMs', marketplace: 'Marketplace', create: 'Créer une VM', settings: 'Paramètres', billing: 'Facturation' },
  admin: { '': 'Overview', vms: 'VMs', create: 'Créer une VM', 'vm-templates': 'Modèles VM', 'scale-up-rule': 'Règle scale up', users: 'Utilisateurs', billing: 'Facturation', settings: 'Paramètres' },
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
            <span className="sidebar-brand-icon"><Cloud size={24} /></span>
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
                <span className="sidebar-item-icon">{React.createElement(ICON_MAP[item.icon] || Settings, { size: 18 })}</span>
                <span className="sidebar-item-label">{item.label}</span>
              </a>
            ) : (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
              >
                <span className="sidebar-item-icon">{React.createElement(ICON_MAP[item.icon] || Settings, { size: 18 })}</span>
                <span className="sidebar-item-label">{item.label}</span>
              </Link>
            )
          )}
        </nav>
        <div className="sidebar-pro-card">
          <p className="sidebar-pro-card-title">VM Pro</p>
          <p className="sidebar-pro-card-desc">Toutes les fonctionnalités avancées.</p>
          <a href="/client/billing" className="sidebar-pro-card-btn">En savoir plus</a>
        </div>
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
            <Menu size={24} />
          </button>
          <div className="topbar-breadcrumb topbar-breadcrumb-left">
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
          <div className="topbar-search-wrap">
            <Search size={18} className="topbar-search-icon" />
            <input
              type="search"
              className="topbar-search"
              placeholder="Rechercher"
              aria-label="Rechercher"
            />
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
            <button type="button" className="topbar-icon-btn" aria-label="Notifications">
              <Bell size={20} />
            </button>
            <div className="topbar-user topbar-user-dropdown">
              <span className="topbar-user-avatar">
                {user?.name?.[0] || user?.email?.[0] || '?'}
              </span>
              <div>
                <span className="topbar-user-name">{user?.name || user?.email || 'User'}</span>
                <span className="topbar-user-role">{type === 'admin' ? 'Admin' : 'Client'}</span>
              </div>
              <ChevronDown size={16} className="topbar-user-chevron" />
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
