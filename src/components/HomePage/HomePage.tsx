import './HomePage.css';

import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  faBuilding,
  faChartBar,
  faHome,
  faMicrochip,
  faRightFromBracket,
  faUser,
  faUserShield,
  faUsers,
  faVideo
} from '@fortawesome/free-solid-svg-icons';
import { useEffect, useState } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { logout } from '../../firebase/auth';

function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();

  // TODO: Replace with actual admin check from Firebase auth or user context
  const [isAdmin] = useState(true); // Set to true for testing, will be dynamic in production

  useEffect(() => {
    // Clean up URL query parameters after authentication
    const url = new URL(window.location.href);
    if (url.search) {
      const paramsToRemove = ['apiKey', 'oobCode', 'mode', 'lang', 'continueUrl'];
      let hasAuthParams = false;
      
      paramsToRemove.forEach(param => {
        if (url.searchParams.has(param)) {
          url.searchParams.delete(param);
          hasAuthParams = true;
        }
      });
      
      if (hasAuthParams) {
        window.history.replaceState({}, document.title, url.pathname);
      }
    }
  }, []);

  const handleLogout = async () => {
    const { success } = await logout();
    if (success) {
      console.log('Successfully logged out');
    }
  };

  return (
    <div className="home-page">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div 
            className="logo" 
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer' }}
          >
            <div className="logo-icon"></div>
            <span className="logo-text">PERFECT TOSS</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink 
            to="/"
            end
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon"><FontAwesomeIcon icon={faHome} /></span>
            <span>HOME</span>
          </NavLink>

          <NavLink 
            to="/organizations"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon"><FontAwesomeIcon icon={faBuilding} /></span>
            <span>ORGANIZATIONS</span>
          </NavLink>

          <NavLink 
            to="/videos"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon"><FontAwesomeIcon icon={faVideo} /></span>
            <span>VIDEOS</span>
          </NavLink>

          {isAdmin && (
            <div className="nav-group">
              <NavLink
                to="/admin"
                end
                className={({ isActive }) => {
                  const isSubActive = !isActive && location.pathname.startsWith('/admin/');
                  return `nav-item ${isActive ? 'active' : ''} ${isSubActive ? 'nav-item--parent-active' : ''}`;
                }}
              >
                <span className="nav-icon"><FontAwesomeIcon icon={faUserShield} /></span>
                <span>ADMIN</span>
              </NavLink>
              {location.pathname.startsWith('/admin') && (
                <div className="nav-sub-items">
                  <NavLink
                    to="/admin/dashboard"
                    className={({ isActive }) => `nav-item nav-sub-item ${isActive ? 'active' : ''}`}
                  >
                    <span className="nav-icon"><FontAwesomeIcon icon={faChartBar} /></span>
                    <span>DASHBOARD</span>
                  </NavLink>
                  <NavLink
                    to="/admin/devices"
                    className={({ isActive }) => `nav-item nav-sub-item ${isActive ? 'active' : ''}`}
                  >
                    <span className="nav-icon"><FontAwesomeIcon icon={faMicrochip} /></span>
                    <span>DEVICES</span>
                  </NavLink>
                  <NavLink
                    to="/admin/organizations"
                    className={({ isActive }) => `nav-item nav-sub-item ${isActive ? 'active' : ''}`}
                  >
                    <span className="nav-icon"><FontAwesomeIcon icon={faBuilding} /></span>
                    <span>ORGANIZATIONS</span>
                  </NavLink>
                  <NavLink
                    to="/admin/users"
                    className={({ isActive }) => `nav-item nav-sub-item ${isActive ? 'active' : ''}`}
                  >
                    <span className="nav-icon"><FontAwesomeIcon icon={faUsers} /></span>
                    <span>USERS</span>
                  </NavLink>
                </div>
              )}
            </div>
          )}
        </nav>

        <NavLink 
          to="/account"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <span className="nav-icon"><FontAwesomeIcon icon={faUser} /></span>
          <span>ACCOUNT</span>
        </NavLink>

        <button 
          className="nav-item logout-button"
          onClick={handleLogout}
        >
          <span className="nav-icon"><FontAwesomeIcon icon={faRightFromBracket} /></span>
          <span>LOGOUT</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default HomePage;
