import { faBuilding, faPlus, faSitemap, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';

import type { Entity } from '../../../api/api.entities';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { OrganizationPageContext } from '../OrganizationPage';
import { useEntityStore } from '../../../stores/entityStore';

function SubOrgsView() {
  const { organization, isAdmin } = useOutletContext<OrganizationPageContext>();
  const navigate = useNavigate();

  const [subOrgs, setSubOrgs] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState('');

  const { loadChildEntities, createEntity } = useEntityStore();

  useEffect(() => {
    if (!organization.id) return;
    setLoading(true);
    setError(null);
    loadChildEntities(organization.id)
      .then(setSubOrgs)
      .catch(() => setError('Failed to load sub-organizations.'))
      .finally(() => setLoading(false));
  }, [organization.id, loadChildEntities]);

  async function handleCreate() {
    if (!newName.trim() || !organization.id) return;
    setCreating(true);
    try {
      const created = await createEntity({
        name: newName,
        description: newDescription,
        entityType: newType,
        parentEntityId: organization.id,
      });
      if (created) {
        setSubOrgs((prev) => [...prev, created as Entity]);
      }
      setShowForm(false);
      setNewName('');
      setNewDescription('');
      setNewType('');
    } catch {
      // TODO: surface error toast
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      {isAdmin && !showForm && (
        <button className="fab" onClick={() => setShowForm(true)} title="Add Sub-Organization">
          <FontAwesomeIcon icon={faPlus} />
        </button>
      )}

      {isAdmin && showForm && (
        <div className="info-card" style={{ marginBottom: 20 }}>
          <div className="edit-form">
            <div className="form-field">
              <label>Name *</label>
              <input
                type="text"
                placeholder="Sub-organization name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Description</label>
              <textarea
                placeholder="Optional description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Type</label>
              <input
                type="text"
                placeholder="e.g. Team, Division"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
              />
            </div>
            <div className="form-actions">
              <button
                className="primary-btn"
                style={{ padding: '9px 18px', fontSize: 13 }}
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
              <button className="secondary-btn" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="empty-state-large">
          <FontAwesomeIcon icon={faSpinner} size="2x" spin style={{ opacity: 0.5 }} />
          <p>Loading sub-organizations...</p>
        </div>
      )}

      {!loading && error && (
        <div className="empty-state-large"><p>{error}</p></div>
      )}

      {!loading && !error && subOrgs.length === 0 && (
        <div className="empty-state-large">
          <FontAwesomeIcon icon={faSitemap} size="3x" style={{ opacity: 0.2 }} />
          <h3>No sub-organizations</h3>
          <p>This organization has no child organizations yet.</p>
        </div>
      )}

      {!loading && !error && subOrgs.length > 0 && (
        <div className="sub-orgs-grid">
          {subOrgs.map((org) => (
            <div
              key={org.id}
              className="organization-card"
              onClick={() => navigate(`/organizations/${org.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <FontAwesomeIcon icon={faBuilding} className="org-icon" />
              <div className="org-details">
                <h3 className="org-name">{org.name}</h3>
                {org.description && <p className="org-description">{org.description}</p>}
                {org.entityType && <span className="org-type">{org.entityType}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SubOrgsView;
