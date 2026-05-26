import '../../styles/page.css';
import './OrganizationsPage.css';

import { faBuilding, faPlus, faSearch } from '@fortawesome/free-solid-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';

function OrganizationsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // TODO: Replace with actual user role from API/AuthContext
  const canCreateOrganization = true; // Will check for EntityAdmin, Admin, or SuperUser roles

  const handleCreateOrganization = () => {
    // TODO: Implement create organization functionality
    console.log('Create organization clicked');
  };

  return (
    <div className="organizations-page">
      <section className="section">
        <div className="section-header">
          <h2>ORGANIZATIONS</h2>
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
            {canCreateOrganization && (
              <button 
                className="primary-btn icon-only-btn" 
                onClick={handleCreateOrganization}
                title="Create Organization"
              >
                <FontAwesomeIcon icon={faPlus} />
              </button>
            )}
          </div>
        </div>

        <div className="organizations-grid">
          <div className="empty-state-large">
            <FontAwesomeIcon icon={faBuilding} size="3x" style={{ opacity: 0.3 }} />
            <h3>No organizations yet</h3>
            <p>Create or join an organization to get started</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default OrganizationsPage;
