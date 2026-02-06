import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import Dashboard from './pages/Dashboard';
import Marketplace from './pages/Marketplace';
import MyVMs from './pages/MyVMs';
import CreateVM from './pages/CreateVM';
import AdminDashboard from './pages/AdminDashboard';
import ClientDashboard from './pages/ClientDashboard';
import Login from './pages/Login';
import Register from './pages/Register';

function Navigation() {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem('darkMode') === 'true';
    } catch { return false; }
  });
  React.useEffect(() => {
    if (darkMode) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
    try { localStorage.setItem('darkMode', darkMode); } catch (_) {}
  }, [darkMode]);

  const isActive = (path) => {
    return location.pathname === path ? 'nav-link active' : 'nav-link';
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-brand">
          <span className="brand-icon">☁️</span>
          <span className="brand-text">VM Marketplace</span>
        </Link>
        <div className="nav-links">
          <Link to="/" className={isActive('/')}>
            <span>📊</span> Dashboard
          </Link>
          <Link to="/marketplace" className={isActive('/marketplace')}>
            <span>🛒</span> Marketplace
          </Link>
          <Link to="/my-vms" className={isActive('/my-vms')}>
            <span>💻</span> Mes VMs
          </Link>
          <Link to="/create" className={isActive('/create')}>
            <span>➕</span> Créer VM
          </Link>
          <Link to="/admin" className={isActive('/admin')}>
            <span>👨‍💼</span> Admin
          </Link>
          <Link to="/client" className={isActive('/client')}>
            <span>👤</span> Client
          </Link>
          <a href="/dashboard" target="_blank" rel="noopener noreferrer" className="nav-link openstack-link">
            <span>🔧</span> OpenStack
          </a>
          <button type="button" className="nav-link" onClick={() => setDarkMode((d) => !d)} title={darkMode ? 'Mode clair' : 'Mode sombre'} aria-label={darkMode ? 'Mode clair' : 'Mode sombre'}>
            {darkMode ? '☀️' : '🌙'}
          </button>
          {isAuthenticated ? (
            <>
              <span className="nav-user">{user?.name || user?.email}</span>
              <button type="button" className="btn btn-sm btn-secondary" onClick={logout}>
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={isActive('/login')}>Connexion</Link>
              <Link to="/register" className={isActive('/register')}>Inscription</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Navigation />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/my-vms" element={<MyVMs />} />
              <Route path="/create" element={<CreateVM />} />
              <Route path="/admin" element={<PrivateRoute requireAdmin><AdminDashboard /></PrivateRoute>} />
              <Route path="/client" element={<PrivateRoute><ClientDashboard /></PrivateRoute>} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <footer className="footer">
            <p>© 2024 VM Marketplace - Propulsé par OpenStack</p>
          </footer>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;

