import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuilding } from '@fortawesome/free-solid-svg-icons';

export interface EntityGroupHeaderProps {
  /** The organization the rows below belong to. */
  name: string;
  /** False when the rows belong to a sub-organization of this page's org. */
  isCurrent: boolean;
  /** Row count already formatted, e.g. "3 events". */
  countLabel: string;
}

/** Header that separates one organization's rows from another's in the org tabs. */
export function EntityGroupHeader({ name, isCurrent, countLabel }: EntityGroupHeaderProps) {
  return (
    <div className="org-entity-header">
      <FontAwesomeIcon icon={faBuilding} className="org-entity-icon" />
      <span className="org-entity-name">{name}</span>
      {!isCurrent && <span className="org-entity-badge">Sub-org</span>}
      <span className="org-entity-count">{countLabel}</span>
    </div>
  );
}
