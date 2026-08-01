import AdminSectionPage from '../AdminSectionPage';

/** Devices section: machines and tablets. */
function AdminDevicesPage() {
  return (
    <AdminSectionPage
      tabLabels={{
        machines: 'Machine',
        tablets: 'Tablet',
      }}
      tabNewRoutes={{
        machines: '/admin/devices/machines/new',
        tablets: '/admin/devices/tablets/new',
      }}
      defaultTab="machines"
    />
  );
}

export default AdminDevicesPage;

