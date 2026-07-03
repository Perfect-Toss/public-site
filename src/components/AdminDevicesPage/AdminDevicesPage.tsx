import './AdminDevicesPage.css';

import { faDesktop, faLayerGroup, faPlus, faTablet } from '@fortawesome/free-solid-svg-icons';

import AdminMachinesPage, { type AdminMachinesPageHandle } from '../AdminMachinesPage';
import AdminTabletTypesPage, { type AdminTabletTypesPageHandle } from '../AdminTabletTypesPage';
import AdminTabletsPage, { type AdminTabletsPageHandle } from '../AdminTabletsPage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useRef, useState } from 'react';

type DeviceTab = 'machines' | 'tablets' | 'tablet-types';

function AdminDevicesPage() {
  const [activeTab, setActiveTab] = useState<DeviceTab>('machines');
  const machinesRef = useRef<AdminMachinesPageHandle>(null);
  const tabletsRef = useRef<AdminTabletsPageHandle>(null);
  const tabletTypesRef = useRef<AdminTabletTypesPageHandle>(null);

  const handleAdd = () => {
    if (activeTab === 'machines') {
      machinesRef.current?.openAddForm();
    } else if (activeTab === 'tablets') {
      tabletsRef.current?.openAddForm();
    } else if (activeTab === 'tablet-types') {
      tabletTypesRef.current?.openAddForm();
    }
  };

  const showAddButton = true;

  return (
    <div className="admin-devices-page">
      <section className="section">
        <div className="section-header">
          <h2>DEVICE MANAGEMENT</h2>
        </div>

        {showAddButton && (
          <button
            className="fab"
            onClick={handleAdd}
            title={'Add ' + (activeTab === 'machines' ? 'Machine' : activeTab === 'tablets' ? 'Tablet' : 'Tablet Type')}
          >
            <FontAwesomeIcon icon={faPlus} />
          </button>
        )}

        {/* ─── Tabs ──────────────────────────────────────────── */}
        <div className="device-tab-bar">
          <button
            className={`device-tab-btn ${activeTab === 'machines' ? 'active' : ''}`}
            onClick={() => setActiveTab('machines')}
          >
            <FontAwesomeIcon icon={faDesktop} />
            Machines
          </button>
          <button
            className={`device-tab-btn ${activeTab === 'tablets' ? 'active' : ''}`}
            onClick={() => setActiveTab('tablets')}
          >
            <FontAwesomeIcon icon={faTablet} />
            Tablets
          </button>
          <button
            className={`device-tab-btn ${activeTab === 'tablet-types' ? 'active' : ''}`}
            onClick={() => setActiveTab('tablet-types')}
          >
            <FontAwesomeIcon icon={faLayerGroup} />
            Tablet Types
          </button>
        </div>

        {/* ─── Tab Content ───────────────────────────────────── */}
        <div className="device-tab-content">
          {activeTab === 'machines' && <AdminMachinesPage ref={machinesRef} />}
          {activeTab === 'tablets' && <AdminTabletsPage ref={tabletsRef} />}
          {activeTab === 'tablet-types' && <AdminTabletTypesPage ref={tabletTypesRef} />}
        </div>
      </section>
    </div>
  );
}

export default AdminDevicesPage;
