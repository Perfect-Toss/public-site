import '../../styles/page.css';
import './OrganizationPage.css';

import {
  faBuildingUser,
  faChevronLeft,
  faCog,
  faSitemap,
  faSpinner,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { NavLink, Outlet, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { Entity } from '../../api/api';
import { fetchEntityById } from '../../api/api';
import { useNavigate } from 'react-router-dom';

// TODO: Replace with real role check from AuthContext / current user API
const MOCK_IS_ADMIN = true;

export interface OrganizationPageContext {
  organization: Entity;
  isAdmin: boolean;
  onUpdated: (updated: Entity) => void;
}

function OrganizationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [organization, setOrganization] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TODO: Replace with real role check
  const isAdmin = MOCK_IS_ADMIN;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetchEntityById(id)
      .then((entity) => {
        setOrganization(entity);
      })
      .catch(() => {
        setError('Failed to load organization. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpdated = (updated: Entity) => {
    setOrganization(updated);
  };

  if (loading) {
    return (
      <div className="org-page">
        <div className="empty-state-large">
          <FontAwesomeIcon icon={faSpinner} size="3x" spin style={{ opacity: 0.5 }} />
          <p>Loading organization...</p>
        </div>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="org-page">
        <div className="empty-state-large">
          <FontAwesomeIcon icon={faBuildingUser} size="3x" style={{ opacity: 0.3 }} />
          <h3>Organization not found</h3>
          <p>{error ?? 'The requested organization could not be found.'}</p>
          <button className="primary-btn" onClick={() => navigate('/organizations')}>
            Back to Organizations
          </button>
        </div>
      </div>
    );
  }

  const context: OrganizationPageContext = { organization, isAdmin, onUpdated: handleUpdated };

  return (
    <div className="org-page">
      {/* Breadcrumb */}
      <div className="org-breadcrumb">
        <button className="back-btn" onClick={() => navigate('/organizations')}>
          <FontAwesomeIcon icon={faChevronLeft} />
          Organizations
        </button>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{organization.name}</span>
      </div>

      {/* Page Header */}
      <div className="org-header">
        <div className="org-header-info">
          <div className="org-avatar">
            <FontAwesomeIcon icon={faBuildingUser} />
          </div>
          <div>
            <h1 className="org-title">{organization.name}</h1>
            {organization.entityType && (
              <span className="org-type-badge">{organization.entityType}</span>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <nav className="org-tabs">
        <NavLink
          to=""
          end
          className={({ isActive }) => `org-tab${isActive ? ' active' : ''}`}
        >
          <FontAwesomeIcon icon={faBuildingUser} />
          Overview
        </NavLink>
        <NavLink
          to="members"
          className={({ isActive }) => `org-tab${isActive ? ' active' : ''}`}
        >
          <FontAwesomeIcon icon={faUsers} />
          Members
        </NavLink>
        <NavLink
          to="sub-orgs"
          className={({ isActive }) => `org-tab${isActive ? ' active' : ''}`}
        >
          <FontAwesomeIcon icon={faSitemap} />
          Sub-Organizations
        </NavLink>
        {isAdmin && (
          <NavLink
            to="settings"
            className={({ isActive }) => `org-tab${isActive ? ' active' : ''}`}
          >
            <FontAwesomeIcon icon={faCog} />
            Settings
          </NavLink>
        )}
      </nav>

      {/* Tab Content */}
      <div className="org-tab-content">
        <Outlet context={context} />
      </div>
    </div>
  );
}

export default OrganizationPage;
