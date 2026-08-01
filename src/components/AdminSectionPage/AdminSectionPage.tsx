import './AdminSectionPage.css';

import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

interface AdminSectionPageProps {
  /** Maps a path segment to a human label for the title/FAB tooltip, e.g. { machines: 'Machine' }. */
  tabLabels: Record<string, string>;
  /** Maps a path segment to the "new" route for that sub-section, e.g. { machines: '/admin/devices/machines/new' }. */
  tabNewRoutes: Record<string, string>;
  /** The sub-section used when no known segment is matched. */
  defaultTab: string;
}

/**
 * Generic admin section shell: a section header titled after the active
 * sub-section, a floating "+ Add" action, and an outlet for the sub-section
 * pages. Sub-navigation lives in the sidebar.
 */
function AdminSectionPage({ tabLabels, tabNewRoutes, defaultTab }: AdminSectionPageProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine the active sub-section from the current path
  const tabKey = Object.keys(tabLabels).find((key) =>
    location.pathname.includes(`/${key}`)
  );
  const activeTab = tabKey && tabKey in tabLabels ? tabKey : defaultTab;
  const activeLabel = tabLabels[activeTab] ?? '';

  const handleAdd = () => {
    navigate(tabNewRoutes[activeTab] ?? tabNewRoutes[defaultTab]);
  };

  return (
    <div className="admin-section-page">
      <section className="section">
        <div className="section-header">
          <h2>{activeLabel} Management</h2>
        </div>

        <button
          className="fab"
          onClick={handleAdd}
          title={'Add ' + (tabLabels[activeTab] ?? 'Item')}
        >
          <FontAwesomeIcon icon={faPlus} />
        </button>

        {/* ─── Sub-section Content (nav lives in the sidebar) ─────── */}
        <div className="admin-section-content">
          <Outlet />
        </div>
      </section>
    </div>
  );
}

export default AdminSectionPage;
