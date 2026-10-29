import './ViewAsBanner.css';

import { faUserSecret, faXmark } from '@fortawesome/free-solid-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { getDisplayName } from '../../utils/user';
import { stopViewAs, useViewAsTarget } from '../../stores/viewAsStore';

/**
 * Strip that keeps an emulated session obvious and ends it on click. Renders
 * nothing unless the app is being viewed as another account.
 */
export function ViewAsBanner() {
  const target = useViewAsTarget();
  if (!target) return null;

  return (
    <div className="view-as-banner" role="status">
      <FontAwesomeIcon icon={faUserSecret} className="view-as-banner-icon" />
      <span className="view-as-banner-text">
        Viewing as <strong>{getDisplayName(target)}</strong>
        {target.email ? ` (${target.email})` : ''} — read-only
      </span>
      <button type="button" className="view-as-banner-exit" onClick={stopViewAs}>
        <FontAwesomeIcon icon={faXmark} />
        Exit
      </button>
    </div>
  );
}
