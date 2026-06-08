import '../../styles/page.css';
import './AdminPage.css';

import {
  faChartLine,
  faCog,
  faFileAlt,
  faUsers
} from '@fortawesome/free-solid-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useNavigate } from 'react-router-dom';

function AdminPage() {
  const navigate = useNavigate();

  return (
    <div className="admin-page">
      <section className="section">
        <div className="section-header">
          <h2>ADMIN DASHBOARD</h2>
        </div>

        <div className="admin-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '20px',
          marginTop: '30px'
        }}>
          <div className="admin-card" onClick={() => navigate('/admin/users')} style={{ 
            padding: '30px', 
            background: 'white', 
            borderRadius: '8px', 
            border: '1px solid #e0e0e0',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}>
            <FontAwesomeIcon icon={faUsers} size="2x" style={{ color: '#cfff04', marginBottom: '15px' }} />
            <h3>User Management</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>Manage users and permissions</p>
          </div>

          <div className="admin-card" style={{ 
            padding: '30px', 
            background: 'white', 
            borderRadius: '8px', 
            border: '1px solid #e0e0e0',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}>
            <FontAwesomeIcon icon={faChartLine} size="2x" style={{ color: '#cfff04', marginBottom: '15px' }} />
            <h3>Analytics</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>View platform statistics</p>
          </div>

          <div className="admin-card" style={{ 
            padding: '30px', 
            background: 'white', 
            borderRadius: '8px', 
            border: '1px solid #e0e0e0',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}>
            <FontAwesomeIcon icon={faFileAlt} size="2x" style={{ color: '#cfff04', marginBottom: '15px' }} />
            <h3>Content</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>Manage videos and content</p>
          </div>

          <div className="admin-card" style={{ 
            padding: '30px', 
            background: 'white', 
            borderRadius: '8px', 
            border: '1px solid #e0e0e0',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}>
            <FontAwesomeIcon icon={faCog} size="2x" style={{ color: '#cfff04', marginBottom: '15px' }} />
            <h3>Settings</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>Platform configuration</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AdminPage;
