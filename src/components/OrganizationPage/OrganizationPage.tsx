import '../../styles/page.css';
import './OrganizationPage.css';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import {
  faBuildingUser,
  faCalendarDays,
  faChevronLeft,
  faCog,
  faListCheck,
  faSitemap,
  faSpinner,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';

import type { Entity } from '../../api/api.entities';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEntityStore } from '../../stores/entityStore';
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

  const { entities, loadEntities, loadEntityById } = useEntityStore();

  // The breadcrumb names the organization's ancestors, so the flat list has to
  // be on hand; a visit from the organizations page usually finds it loaded.
  useEffect(() => {
    if (entities.length === 0) loadEntities();
  }, [entities.length, loadEntities]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    loadEntityById(id)
      .then((entity) => {
        setOrganization(entity);
      })
      .catch(() => {
        setError('Failed to load organization. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [id, loadEntityById]);

  const handleUpdated = (updated: Entity) => {
    setOrganization(updated);
  };

  /** The organization's ancestors, root first, for the breadcrumb. */
  const ancestors = useMemo(() => {
    if (!organization) return [];
    const byId = new Map(entities.map((entity) => [entity.id, entity]));
    const chain: Entity[] = [];
    const seen = new Set<string>([organization.id]);
    let parentId = organization.parentEntityId ?? null;
    while (parentId && !seen.has(parentId)) {
      const parent = byId.get(parentId);
      if (!parent) break;
      chain.unshift(parent);
      seen.add(parentId);
      parentId = parent.parentEntityId ?? null;
    }
    return chain;
  }, [organization, entities]);

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
        <Link className="back-btn" to="/organizations">
          <FontAwesomeIcon icon={faChevronLeft} />
          Organizations
        </Link>
        {ancestors.map((ancestor) => (
          <Fragment key={ancestor.id}>
            <span className="breadcrumb-separator">/</span>
            <Link className="breadcrumb-link" to={`/organizations/${ancestor.id}`}>
              {ancestor.name}
            </Link>
          </Fragment>
        ))}
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
        <NavLink
          to="events"
          className={({ isActive }) => `org-tab${isActive ? ' active' : ''}`}
        >
          <FontAwesomeIcon icon={faCalendarDays} />
          Events
        </NavLink>
        <NavLink
          to="event-instances"
          className={({ isActive }) => `org-tab${isActive ? ' active' : ''}`}
        >
          <FontAwesomeIcon icon={faListCheck} />
          Event Instances
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
