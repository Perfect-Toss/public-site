import './OrganizationCard.css';

import { faBuilding } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link } from 'react-router-dom';

import type { Entity } from '../../api/api.entities';

export interface OrganizationCardProps {
  organization: Entity;
}

/** Organization tile shared by the home page and the organizations list. */
export function OrganizationCard({ organization }: OrganizationCardProps) {
  return (
    <Link to={`/organizations/${organization.id}`} className="organization-card">
      <FontAwesomeIcon icon={faBuilding} className="org-icon" />
      <div className="org-details">
        <h3 className="org-name">{organization.name}</h3>
        {organization.description && (
          <p className="org-description">{organization.description}</p>
        )}
        {organization.entityType && <span className="org-type">{organization.entityType}</span>}
      </div>
    </Link>
  );
}
