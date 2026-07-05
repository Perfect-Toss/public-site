import './AdminDevicesPage.css';

import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { faDesktop, faLayerGroup, faPlus, faTablet } from '@fortawesome/free-solid-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const TAB_LABELS: Record<string, string> = {
  machines: 'Machine',
  tablets: 'Tablet',
  'tablet-types': 'Tablet Type',
} as const;

const TAB_NEW_ROUTES: Record<string, string> = {
  machines: '/admin/devices/machines/new',
  tablets: '/admin/devices/tablets/new',
  'tablet-types': '/admin/devices/tablet-types/new',
} as const;

function AdminDevicesPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from the current path
  const pathSegment = location.pathname.split('/').pop() ?? '';
  const activeTab = pathSegment in TAB_LABELS ? pathSegment : 'machines';

  const handleAdd = () => {
    navigate(TAB_NEW_ROUTES[activeTab] ?? '/admin/devices/machines/new');
  };

  return (
    <div className="admin-devices-page">
      <section className="section">
        <div className="section-header">
          <h2>DEVICE MANAGEMENT</h2>
        </div>

        <button
          className="fab"
          onClick={handleAdd}
          title={'Add ' + (TAB_LABELS[activeTab] ?? 'Item')}
        >
          <FontAwesomeIcon icon={faPlus} />
        </button>

        {/* ─── Tabs ──────────────────────────────────────────── */}
        <div className="device-tab-bar">
          <NavLink
            to="/admin/devices/machines"
            className={({ isActive }) => `device-tab-btn ${isActive ? 'active' : ''}`}
          >
            <FontAwesomeIcon icon={faDesktop} />
            Machines
          </NavLink>
          <NavLink
            to="/admin/devices/tablets"
            className={({ isActive }) => `device-tab-btn ${isActive ? 'active' : ''}`}
          >
            <FontAwesomeIcon icon={faTablet} />
            Tablets
          </NavLink>
          <NavLink
            to="/admin/devices/tablet-types"
            className={({ isActive }) => `device-tab-btn ${isActive ? 'active' : ''}`}
          >
            <FontAwesomeIcon icon={faLayerGroup} />
            Tablet Types
          </NavLink>
        </div>

        {/* ─── Tab Content ───────────────────────────────────── */}
        <div className="device-tab-content">
          <Outlet />
        </div>
      </section>
    </div>
  );
}

export default AdminDevicesPage;
