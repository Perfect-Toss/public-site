import './OrganizationCard.css';

import type { Entity } from '../../api/api.entities';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link } from 'react-router-dom';
import { faBuilding } from '@fortawesome/free-solid-svg-icons';

export interface OrganizationCardProps {
  organization: Entity;
}

/** Organization tile shared by the home page and the organizations list. */
export function OrganizationCard({ organization }: OrganizationCardProps) {
  return (
    <Link to={`/organizations/${organization.id}`} className="organization-card">
      {/* One fixed box for both branches, so a tile is the same height with or
          without a logo. */}
      <span className="org-card-mark">
        {organization.logoUrl ? (
          // The name sits right below, so the logo is decorative.
          <img className="org-card-logo" src={organization.logoUrl} alt="" />
        ) : (
          <FontAwesomeIcon icon={faBuilding} className="org-icon" />
        )}
      </span>
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
