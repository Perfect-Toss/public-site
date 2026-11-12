import './OrganizationCard.css';

import type { CSSProperties } from 'react';
import type { Entity } from '../../api/api.entities';
import { Link } from 'react-router-dom';

export interface OrganizationCardProps {
  organization: Entity;
}

/** Organization tile shared by the home page and the organizations list. */
export function OrganizationCard({ organization }: OrganizationCardProps) {
  return (
    <Link
      to={`/organizations/${organization.id}`}
      className="organization-card"
      style={
        organization.logoUrl
          ? ({ '--org-logo': `url("${organization.logoUrl}")` } as CSSProperties)
          : undefined
      }
    >
      <div className="org-details">
        <h3 className="org-name">{organization.name}</h3>
      </div>
    </Link>
  );
}

