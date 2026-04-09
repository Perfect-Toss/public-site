import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuilding, faPlus } from '@fortawesome/free-solid-svg-icons';

function OrganizationsView() {
  return (
    <div className="organizations-view">
      <section className="section">
        <div className="section-header">
          <h2>MY ORGANIZATIONS</h2>
          <button className="add-btn">
            <FontAwesomeIcon icon={faPlus} />
            <span>Add Organization</span>
          </button>
        </div>

        <div className="organizations-grid">
          {/* Placeholder for organizations */}
          <div className="empty-state-large">
            <FontAwesomeIcon icon={faBuilding} size="3x" style={{ opacity: 0.3 }} />
            <h3>No organizations yet</h3>
            <p>Create or join an organization to get started</p>
            <button className="primary-btn" style={{ marginTop: '20px' }}>
              <FontAwesomeIcon icon={faPlus} />
              <span style={{ marginLeft: '8px' }}>Create Organization</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default OrganizationsView;
