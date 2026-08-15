import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getHealth } from '../services/api';
import LoginModal from './LoginModal';

export default function Layout() {
  const navigate = useNavigate();
  const [health, setHealth] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser(payload);
      } catch (err) {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, [token]);

  const handleLoginSuccess = (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    if (window.location.pathname === '/urls') {
      navigate('/');
    }
  };

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const data = await getHealth();
        setHealth(data);
      } catch {
        setHealth({ status: 'error' });
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-layout">
      {/* Top Glassmorphic Navigation Header */}
      <header className="app-header">
        <div className="header-container">
          <NavLink to="/" className="header-logo">
            <span className="header-logo-icon">⚡</span>
            <h1>SHORTIFY</h1>
          </NavLink>

          {/* Desktop Navigation Links */}
          <nav className="header-nav">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
              📊 Dashboard
            </NavLink>
            <NavLink to="/urls" className={({ isActive }) => isActive ? 'active' : ''}>
              🔗 My URLs
            </NavLink>
          </nav>

          {/* Right Section: Auth & Health Indicator & Hamburger Toggle */}
          <div className="header-right">
            {user ? (
              <div className="user-profile-nav">
                <div className="user-avatar" title={user.email} aria-label={user.email}>
                  {user.email.charAt(0).toUpperCase()}
                </div>
                <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
                  Sign Out
                </button>
              </div>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={() => setLoginModalOpen(true)}>
                Sign In
              </button>
            )}

            <div className="health-indicator-pill">
              <div className={`health-dot ${health?.status === 'ok' ? '' : 'error'}`}></div>
              <span>{health?.status === 'ok' ? 'System Active' : 'Checking...'}</span>
            </div>

            <button
              className="mobile-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Nav Menu */}
        <div className={`mobile-nav-dropdown ${mobileMenuOpen ? 'open' : ''}`}>
          <NavLink
            to="/"
            end
            className={({ isActive }) => isActive ? 'active' : ''}
            onClick={() => setMobileMenuOpen(false)}
          >
            📊 Dashboard
          </NavLink>
          <NavLink
            to="/urls"
            className={({ isActive }) => isActive ? 'active' : ''}
            onClick={() => setMobileMenuOpen(false)}
          >
            🔗 My URLs
          </NavLink>
          <div className="mobile-health-container">
            <div className={`health-dot ${health?.status === 'ok' ? '' : 'error'}`}></div>
            <span>{health?.status === 'ok' ? 'System Active' : 'Checking...'}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        <div className="main-container">
          <Outlet context={{ token, user, logout: handleLogout, openLogin: () => setLoginModalOpen(true) }} />
        </div>
      </main>

      {/* Login Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
