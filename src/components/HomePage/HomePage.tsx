import './HomePage.css';

import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  faBuilding,
  faChartBar,
  faChevronLeft,
  faChevronRight,
  faHome,
  faMicrochip,
  faRightFromBracket,
  faUser,
  faUsers,
  faVideo
} from '@fortawesome/free-solid-svg-icons';
import { useEffect, useState } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { logout } from '../../firebase/auth';

function HomePage() {
  const navigate = useNavigate();

  // TODO: Replace with actual admin check from Firebase auth or user context
  const [isAdmin] = useState(true); // Set to true for testing, will be dynamic in production
  const [collapsed, setCollapsed] = useState(false);

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
    <div className={`home-page${collapsed ? ' sidebar-collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
        <div className="sidebar-header">
          <div 
            className="logo" 
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer' }}
          >
            <div className="logo-icon"></div>
            {!collapsed && <span className="logo-text">PERFECT TOSS</span>}
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink 
            to="/"
            end
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            data-tooltip="Home"
          >
            <span className="nav-icon"><FontAwesomeIcon icon={faHome} /></span>
            {!collapsed && <span>HOME</span>}
          </NavLink>

          <NavLink 
            to="/organizations"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            data-tooltip="Organizations"
          >
            <span className="nav-icon"><FontAwesomeIcon icon={faBuilding} /></span>
            {!collapsed && <span>ORGANIZATIONS</span>}
          </NavLink>

          <NavLink 
            to="/videos"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            data-tooltip="Videos"
          >
            <span className="nav-icon"><FontAwesomeIcon icon={faVideo} /></span>
            {!collapsed && <span>VIDEOS</span>}
          </NavLink>

          {isAdmin && (
            <>
              <div className="nav-spacer" />
              <NavLink
                to="/admin/dashboard"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                data-tooltip="Dashboard"
              >
                <span className="nav-icon"><FontAwesomeIcon icon={faChartBar} /></span>
                {!collapsed && <span>DASHBOARD</span>}
              </NavLink>
              <NavLink
                to="/admin/devices"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                data-tooltip="Devices"
              >
                <span className="nav-icon"><FontAwesomeIcon icon={faMicrochip} /></span>
                {!collapsed && <span>DEVICES</span>}
              </NavLink>
              <NavLink
                to="/admin/organizations"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                data-tooltip="Organizations"
              >
                <span className="nav-icon"><FontAwesomeIcon icon={faBuilding} /></span>
                {!collapsed && <span>ORGANIZATIONS</span>}
              </NavLink>
              <NavLink
                to="/admin/users"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                data-tooltip="Users"
              >
                <span className="nav-icon"><FontAwesomeIcon icon={faUsers} /></span>
                {!collapsed && <span>USERS</span>}
              </NavLink>
            </>
          )}
        </nav>

        <NavLink 
          to="/account"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          data-tooltip="Account"
        >
          <span className="nav-icon"><FontAwesomeIcon icon={faUser} /></span>
          {!collapsed && <span>ACCOUNT</span>}
        </NavLink>

        <button 
          className="nav-item logout-button"
          onClick={handleLogout}
          data-tooltip="Logout"
        >
          <span className="nav-icon"><FontAwesomeIcon icon={faRightFromBracket} /></span>
          {!collapsed && <span>LOGOUT</span>}
        </button>

        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          data-tooltip={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronLeft} />
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
