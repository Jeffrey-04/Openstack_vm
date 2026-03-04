import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import apiService from '../services/api';
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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut
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
  ChevronLeft,
  ChevronRight,
  LogOut,
};

const CLIENT_SIDEBAR_ITEMS = [
  { label: 'Overview', path: '/client', icon: 'LayoutDashboard' },
  { label: 'Mes VMs', path: '/client/vms', icon: 'Server' },
  { label: 'Marketplace', path: '/client/marketplace', icon: 'ShoppingCart' },
  { label: 'Créer une VM', path: '/client/create', icon: 'PlusCircle' },
  { label: 'Paramètres', path: '/client/settings', icon: 'Settings' },
  { label: 'Facturation', path: '/client/billing', icon: 'CreditCard' },
];

const ADMIN_SIDEBAR_ITEMS = [
  { label: 'Overview', path: '/admin', icon: 'LayoutDashboard' },
  { label: 'VMs', path: '/admin/vms', icon: 'Server' },
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

function HealthIndicator() {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    apiService.getOpenstackStatus()
      .then((res) => setStatus(res.connected ? 'ok' : 'error'))
      .catch(() => setStatus('error'));
  }, []);
  if (status === null) return null;
  return (
    <div className={`sidebar-health ${status === 'ok' ? 'sidebar-health-ok' : 'sidebar-health-error'}`} title={status === 'ok' ? 'OpenStack connecté' : 'Service indisponible'}>
      <span className="sidebar-health-dot" aria-hidden="true" />
      <span className="sidebar-health-label">{status === 'ok' ? 'OpenStack OK' : 'Hors ligne'}</span>
    </div>
  );
}

const SEARCH_RESULTS_MAX = 8;

function filterVmsByQuery(servers, query) {
  if (!Array.isArray(servers) || !query || !query.trim()) return [];
  const q = query.trim().toLowerCase();
  return servers.filter((s) => {
    const name = (s.name || '').toLowerCase();
    const id = (s.id || '').toLowerCase();
    const dbId = String(s.dbId || '').toLowerCase();
    return name.includes(q) || id.includes(q) || dbId.includes(q);
  }).slice(0, SEARCH_RESULTS_MAX);
}

export default function DashboardLayout({ type = 'client' }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchCacheRef = useRef(null);
  const searchWrapRef = useRef(null);

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

  const userWrapRef = useRef(null);
  const notifWrapRef = useRef(null);
  useEffect(() => {
    const close = (e) => {
      if (userWrapRef.current && !userWrapRef.current.contains(e.target)) setUserMenuOpen(false);
      if (notifWrapRef.current && !notifWrapRef.current.contains(e.target)) setNotifOpen(false);
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const loadNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await apiService.getNotifications();
      setNotifications(res.notifications || []);
      setNotifUnreadCount(res.unreadCount ?? 0);
    } catch {
      setNotifications([]);
      setNotifUnreadCount(0);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (notifOpen) loadNotifications();
  }, [notifOpen, loadNotifications]);

  useEffect(() => {
    const interval = setInterval(loadNotifications, 45000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleMarkNotifRead = async (id) => {
    try {
      await apiService.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
      setNotifUnreadCount((c) => Math.max(0, c - 1));
    } catch (_) {}
  };

  const handleMarkAllNotifsRead = async () => {
    try {
      await apiService.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
      setNotifUnreadCount(0);
    } catch (_) {}
  };

  const loadSearchCache = useCallback(async () => {
    if (searchCacheRef.current) return;
    setSearchLoading(true);
    try {
      const data = type === 'admin' ? await apiService.getAdminVms() : await apiService.getVms();
      const list = data.servers || [];
      searchCacheRef.current = list;
    } catch {
      searchCacheRef.current = [];
    } finally {
      setSearchLoading(false);
    }
  }, [type]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    if (searchCacheRef.current) {
      setSearchResults(filterVmsByQuery(searchCacheRef.current, searchQuery));
      setSearchOpen(true);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (!searchLoading && searchQuery.trim() && searchCacheRef.current) {
      setSearchResults(filterVmsByQuery(searchCacheRef.current, searchQuery));
      setSearchOpen(true);
    }
  }, [searchLoading, searchQuery]);

  return (
    <div className="dashboard-layout">
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : 'collapsed'} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <Link to={type === 'client' ? '/client' : '/admin'} className="sidebar-brand">
            <span className="sidebar-brand-icon"><Cloud size={24} /></span>
            <div className="sidebar-brand-text-wrap">
              <span className="sidebar-brand-text">VM Marketplace</span>
              <span className="sidebar-brand-tagline">VPS à la demande</span>
            </div>
          </Link>
          <button
            type="button"
            className="sidebar-collapse-toggle"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label={sidebarOpen ? 'Réduire le menu' : 'Ouvrir le menu'}
          >
            {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
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
        <div className="sidebar-footer">
          <HealthIndicator />
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
          <div className="topbar-search-wrap" ref={searchWrapRef}>
            <Search size={18} className="topbar-search-icon" aria-hidden="true" />
            <input
              type="search"
              className="topbar-search"
              placeholder="Rechercher une VM..."
              aria-label="Rechercher une VM par nom ou ID"
              aria-expanded={searchOpen}
              aria-autocomplete="list"
              value={searchQuery}
              onFocus={() => {
                loadSearchCache();
                if (searchQuery.trim()) setSearchOpen(true);
              }}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchOpen(false);
                  e.target.blur();
                }
              }}
            />
            {searchOpen && searchQuery.trim() && (
              <div className="topbar-search-dropdown" role="listbox">
                {searchLoading ? (
                  <p className="topbar-search-dropdown-empty">Chargement...</p>
                ) : searchResults.length === 0 ? (
                  <p className="topbar-search-dropdown-empty">Aucune VM trouvée</p>
                ) : (
                  <ul className="topbar-search-results" role="listbox">
                    {searchResults.map((vm) => (
                      <li key={vm.id || vm.dbId}>
                        <Link
                          to={`${basePath}/vms/${vm.id}`}
                          className="topbar-search-result-item"
                          role="option"
                          onClick={() => {
                            setSearchQuery('');
                            setSearchOpen(false);
                          }}
                        >
                          <Server size={16} className="topbar-search-result-icon" />
                          <span className="topbar-search-result-name">{vm.name || vm.id}</span>
                          <span className="topbar-search-result-status">{vm.status === 'ACTIVE' ? 'Actif' : vm.status === 'SHUTOFF' ? 'Arrêté' : vm.status || '—'}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <div className="topbar-actions">
            <div className="topbar-notif-wrap" ref={notifWrapRef}>
              <button
                type="button"
                className="topbar-icon-btn topbar-notif-btn"
                aria-label="Notifications"
                aria-expanded={notifOpen}
                onClick={() => { setNotifOpen((o) => !o); setUserMenuOpen(false); }}
              >
                <Bell size={20} />
                {notifUnreadCount > 0 && (
                  <span className="topbar-notif-badge" aria-hidden="true">{notifUnreadCount > 99 ? '99+' : notifUnreadCount}</span>
                )}
              </button>
              {notifOpen && (
                <div className="topbar-dropdown topbar-dropdown-notif" role="menu">
                  <div className="topbar-notif-header">
                    <span>Notifications</span>
                    {notifications.some((n) => !n.readAt) && (
                      <button type="button" className="topbar-notif-read-all" onClick={handleMarkAllNotifsRead}>
                        Tout marquer lu
                      </button>
                    )}
                  </div>
                  {notifLoading && notifications.length === 0 ? (
                    <p className="topbar-dropdown-empty">Chargement...</p>
                  ) : notifications.length === 0 ? (
                    <p className="topbar-dropdown-empty">Aucune notification</p>
                  ) : (
                    <ul className="topbar-notif-list">
                      {notifications.map((n) => (
                        <li key={n.id}>
                          {n.link ? (
                            <Link
                              to={n.link}
                              className={`topbar-notif-item ${!n.readAt ? 'topbar-notif-unread' : ''}`}
                              onClick={() => { handleMarkNotifRead(n.id); setNotifOpen(false); }}
                            >
                              <span className="topbar-notif-item-title">{n.title}</span>
                              {n.message && <span className="topbar-notif-item-msg">{n.message}</span>}
                            </Link>
                          ) : (
                            <button
                              type="button"
                              className={`topbar-notif-item ${!n.readAt ? 'topbar-notif-unread' : ''}`}
                              onClick={() => handleMarkNotifRead(n.id)}
                            >
                              <span className="topbar-notif-item-title">{n.title}</span>
                              {n.message && <span className="topbar-notif-item-msg">{n.message}</span>}
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div className="topbar-user-wrap" ref={userWrapRef}>
              <button
                type="button"
                className="topbar-user topbar-user-dropdown"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                onClick={() => { setUserMenuOpen((o) => !o); setNotifOpen(false); }}
              >
                <span className="topbar-user-avatar">
                  {user?.name?.[0] || user?.email?.[0] || '?'}
                </span>
                <div>
                  <span className="topbar-user-name">{user?.name || user?.email || 'User'}</span>
                  <span className="topbar-user-role">{type === 'admin' ? 'Admin' : 'Client'}</span>
                </div>
                <ChevronDown size={16} className="topbar-user-chevron" />
              </button>
              {userMenuOpen && (
                <div className="topbar-dropdown topbar-dropdown-user" role="menu">
                  <Link to={type === 'client' ? '/client/settings' : '/admin/settings'} className="topbar-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                    <Settings size={16} /> Paramètres
                  </Link>
                  <button type="button" className="topbar-dropdown-item topbar-dropdown-item-danger" onClick={() => { setUserMenuOpen(false); logout(); }}>
                    <LogOut size={16} /> Déconnexion
                  </button>
                </div>
              )}
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
