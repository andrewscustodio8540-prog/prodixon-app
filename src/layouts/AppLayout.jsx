import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BarChart3,
  Factory,
  Users,
  ClipboardList,
  FileBox,
  LogOut,
  Menu,
  X,
  Tag,
  Settings as SettingsIcon,
  Shield
} from 'lucide-react';
import { useState } from 'react';

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: <BarChart3 size={20} />, label: 'Dashboard' },
    { to: '/shift-entry', icon: <ClipboardList size={20} />, label: 'Lançar Turno' },
    { to: '/machines', icon: <Factory size={20} />, label: 'Máquinas' },
    { to: '/operators', icon: <Users size={20} />, label: 'Operadores' },
    { to: '/parts', icon: <Tag size={20} />, label: 'Peças' },
    { to: '/reports', icon: <FileBox size={20} />, label: 'Relatórios' },
    { to: '/team', icon: <Shield size={20} />, label: 'Equipe' },
    { to: '/settings', icon: <SettingsIcon size={20} />, label: 'Configurações' },
  ];

  return (
    <div className="app-container">
      {/* Mobile Topbar */}
      <div className="mobile-topbar glass-panel d-md-none">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src="/logo.jpg" alt="Logo" className="logo-image-small-mobile" style={{ width: '90px', height: '50px', borderRadius: '4px', objectFit: 'contain' }} />
          <div className="logo-text text-gradient-primary">PRODIXON</div>
        </div>
        <button className="btn-icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`sidebar glass-panel ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/logo.jpg" alt="Logo" className="logo-image-small" style={{ width: '120px', height: '60px', borderRadius: '8px', objectFit: 'contain' }} />
          <h2 className="logo-text text-gradient-primary">PRODIXON</h2>
        </div>

        <nav className="sidebar-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.email?.charAt(0).toUpperCase() || 'A'}</div>
            <div className="user-details">
              <span className="user-name">{user?.email || 'Admin User'}</span>
              <span className="user-role badge badge-primary">Admin</span>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-outline btn-logout">
            <LogOut size={16} /> Parar Sessão
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <div className="content-wrapper animate-fade-in">
          <Outlet />
        </div>
      </main>

      <style>{`
        .app-container {
          display: flex;
          min-height: 100vh;
          width: 100%;
          background: radial-gradient(circle at top right, var(--bg-surface-elevated) 0%, var(--bg-color) 40%);
        }

        .mobile-topbar {
          display: none;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 50;
          border-radius: 0 0 16px 16px;
          border-top: none;
        }

        .btn-icon {
          background: transparent;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
        }

        .sidebar {
          width: 280px;
          display: flex;
          flex-direction: column;
          margin: 1rem;
          border-radius: var(--border-radius-xl);
          transition: transform var(--transition-normal);
          z-index: 40;
        }

        .sidebar-header {
          padding: 2rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        .logo-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-family: var(--font-family-display);
          color: white;
          box-shadow: var(--shadow-glow);
        }

        .logo-text {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
        }

        .logo-image-small {
          width: 120px;
          height: 60px;
          border-radius: 8px;
          object-fit: contain;
        }

        .logo-image-small-mobile {
          width: 90px;
          height: 50px;
          border-radius: 4px;
          object-fit: contain;
        }

        .sidebar-nav {
          flex: 1;
          padding: 1.5rem 1rem;
          overflow-y: auto;
        }

        .sidebar-nav ul {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.8rem 1rem;
          border-radius: var(--border-radius-md);
          color: var(--text-secondary);
          font-weight: 500;
          transition: all var(--transition-fast);
        }

        .nav-link:hover {
          color: var(--text-primary);
          background: rgba(255,255,255,0.05);
          transform: translateX(4px);
        }

        .nav-link.active {
          color: white;
          background: linear-gradient(90deg, rgba(0, 102, 255, 0.2) 0%, transparent 100%);
          border-left: 3px solid var(--primary-color);
        }

        .nav-link.active svg {
          color: var(--primary-color);
        }

        .sidebar-footer {
          padding: 1.5rem;
          border-top: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }

        .user-details {
          display: flex;
          flex-direction: column;
        }

        .user-name {
          font-weight: 600;
          font-size: 0.9rem;
          width: 140px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-role {
          font-size: 0.65rem;
          align-self: flex-start;
          margin-top: 0.2rem;
        }

        .btn-logout {
          width: 100%;
          justify-content: center;
        }

        .main-content {
          flex: 1;
          height: 100vh;
          overflow-y: auto;
          position: relative;
        }

        .content-wrapper {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        @media (max-width: 768px) {
          .d-md-none { display: flex; }
          .app-container { flex-direction: column; }
          
          .sidebar {
            position: fixed;
            top: 70px;
            left: -1rem;
            bottom: 0;
            width: calc(100% - 2rem);
            margin: 0 1rem 1rem 1rem;
            transform: translateX(-120%);
          }

          .sidebar.open {
            transform: translateX(0);
          }

          .main-content {
            margin-top: 70px;
            height: calc(100vh - 70px);
          }
          
          .content-wrapper { padding: 1rem; }
        }
      `}</style>
    </div>
  );
}
