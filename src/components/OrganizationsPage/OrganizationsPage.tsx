import '../../styles/page.css';
import './OrganizationsPage.css';

import { faBuilding, faPlus, faSearch, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useMemo, useState } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEntityStore } from '../../stores/entityStore';
import { useNavigate } from 'react-router-dom';

function OrganizationsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { entityMap, loading, error, loadEntities } = useEntityStore();
  const organizations = useMemo(() => entityMap['root'] ?? [], [entityMap]);

  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  // TODO: Replace with actual user role from API/AuthContext
  const canCreateOrganization = true; // Will check for EntityAdmin, Admin, or SuperUser roles

  const handleCreateOrganization = () => {
    // TODO: Implement create organization functionality
    console.log('Create organization clicked');
  };

  const filteredOrganizations = organizations.filter(org =>
    org.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="organizations-page">
      <section className="section">
        <div className="section-header">
          <div className="header-actions">
            <div className="search-box">
              <FontAwesomeIcon icon={faSearch} className="search-icon" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        </div>

        {canCreateOrganization && (
          <button 
            className="fab" 
            onClick={handleCreateOrganization}
            title="Create Organization"
          >
            <FontAwesomeIcon icon={faPlus} />
          </button>
        )}

        <div className="organizations-grid">
          {loading && (
            <div className="empty-state-large">
              <FontAwesomeIcon icon={faSpinner} size="3x" spin style={{ opacity: 0.5 }} />
              <p>Loading organizations...</p>
            </div>
          )}
          {!loading && error && (
            <div className="empty-state-large">
              <FontAwesomeIcon icon={faBuilding} size="3x" style={{ opacity: 0.3 }} />
              <h3>Failed to load organizations</h3>
              <p>{error}</p>
            </div>
          )}
          {!loading && !error && filteredOrganizations.length === 0 && (
            <div className="empty-state-large">
              <FontAwesomeIcon icon={faBuilding} size="3x" style={{ opacity: 0.3 }} />
              <h3>No organizations yet</h3>
              <p>Create or join an organization to get started</p>
            </div>
          )}
          {!loading && !error && filteredOrganizations.map(org => (
            <div key={org.id} className="organization-card" onClick={() => org.id && navigate(`/organizations/${org.id}`)}>
              <FontAwesomeIcon icon={faBuilding} className="org-icon" />
              <div className="org-details">
                <h3 className="org-name">{org.name}</h3>
                {org.description && <p className="org-description">{org.description}</p>}
                {org.entityType && <span className="org-type">{org.entityType}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default OrganizationsPage;
