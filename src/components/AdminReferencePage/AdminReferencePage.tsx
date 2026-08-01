import AdminSectionPage from '../AdminSectionPage';

/** Reference section: tablet types and tags. */
function AdminReferencePage() {
  return (
    <AdminSectionPage
      tabLabels={{
        'tablet-types': 'Tablet Type',
        tags: 'Tag',
      }}
      tabNewRoutes={{
        'tablet-types': '/admin/reference/tablet-types/new',
        tags: '/admin/reference/tags/new',
      }}
      defaultTab="tablet-types"
    />
  );
}

export default AdminReferencePage;
