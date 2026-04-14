import { useState, useEffect } from 'react';
import { NavLink, Routes, Route, useNavigate } from 'react-router-dom';
import './HomePage.css';
import { logout } from '../../firebase/auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome,
  faVideo, 
  faBuilding, 
  faUser, 
  faRightFromBracket,
  faUserShield
} from '@fortawesome/free-solid-svg-icons';
import HomeView, { type PendingReview, type TrendingContent } from './views/HomeView';
import VideosView from './views/VideosView';
import OrganizationsView from './views/OrganizationsView';
import AdminView from './views/AdminView';
import AccountView from './views/AccountView';
import type { Entity } from '../../api/api';
import { fetchEntities } from '../../api/api';

function HomePage() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Entity[]>([]);
  const [pendingReviews] = useState<PendingReview[]>([]);
  const [trendingContent] = useState<TrendingContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // TODO: Replace with actual admin check from Firebase auth or user context
  const [isAdmin] = useState(true); // Set to true for testing, will be dynamic in production

  useEffect(() => {
    loadData();
    
    // Clean up URL query parameters after authentication
    const url = new URL(window.location.href);
    if (url.search) {
      // Remove common auth-related query parameters
      const paramsToRemove = ['apiKey', 'oobCode', 'mode', 'lang', 'continueUrl'];
      let hasAuthParams = false;
      
      paramsToRemove.forEach(param => {
        if (url.searchParams.has(param)) {
          url.searchParams.delete(param);
          hasAuthParams = true;
        }
      });
      
      // If we removed any auth params, update the URL without reloading
      if (hasAuthParams) {
        window.history.replaceState({}, document.title, url.pathname);
      }
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch entities (organizations)
      const orgsData = await fetchEntities();
      setOrganizations(orgsData);

      // TODO: Fetch pending reviews and trending content when endpoints are available
      // const [reviewsData, trendingData] = await Promise.all([
      //   fetchPendingReviews(),
      //   fetchTrendingContent(),
      // ]);
      // setPendingReviews(reviewsData);
      // setTrendingContent(trendingData);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

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
            <NavLink 
              to="/admin"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon"><FontAwesomeIcon icon={faUserShield} /></span>
              <span>ADMIN</span>
            </NavLink>
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
        <Routes>
          <Route 
            path="/" 
            element={
              <HomeView 
                organizations={organizations}
                pendingReviews={pendingReviews}
                trendingContent={trendingContent}
                loading={loading}
                error={error}
                onRetry={loadData}
              />
            } 
          />
          <Route path="/videos" element={<VideosView />} />
          <Route path="/organizations" element={<OrganizationsView />} />
          {isAdmin && <Route path="/admin" element={<AdminView />} />}
          <Route path="/account" element={<AccountView />} />
        </Routes>
      </main>
    </div>
  );
}

export default HomePage;
