import '../../styles/page.css';
import '../AdminUsersPage/AdminUsersPage.css';

import { faCheckCircle, faPlus, faSpinner, faTimesCircle, faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { useCallback, useState } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useNavigate } from 'react-router-dom';
import { createUser, fetchAllUsers, type CreateUserDto, type User } from '../../api/api.users';
import { usePageData } from '../../hooks/usePageData';

function AddUserPage() {
  const navigate = useNavigate();
  const { load } = usePageData<User[]>([]);

  const [addForm, setAddForm] = useState({ firstName: '', lastName: '', email: '' });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addResult, setAddResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleAddUser = useCallback(async () => {
    if (!addForm.email?.trim()) return;
    setAddSubmitting(true);
    setAddResult(null);
    try {
      const dto: CreateUserDto = {
        firstName: addForm.firstName.trim() || undefined,
        lastName: addForm.lastName.trim() || undefined,
        email: addForm.email.trim(),
      };
      await createUser(dto);
      setAddResult({ type: 'success', message: 'User created successfully!' });
      setAddForm({ firstName: '', lastName: '', email: '' });
      load(fetchAllUsers);
    } catch (err) {
      setAddResult({ type: 'error', message: err instanceof Error ? err.message : 'Failed to create user.' });
    } finally {
      setAddSubmitting(false);
    }
  }, [addForm, load]);

  return (
    <div className="admin-users-page">
      <section className="section">
        <div className="org-breadcrumb" style={{ marginBottom: 16 }}>
          <button className="back-btn" onClick={() => navigate('/admin/users')}>
            <FontAwesomeIcon icon={faChevronLeft} />
            Users
          </button>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Add User</span>
        </div>

        <div className="section-header">
          <h2>ADD USER</h2>
        </div>

        <div className="modal-body" style={{ maxWidth: 480, padding: 0 }}>
          {addResult && (
            <div className={`import-result ${addResult.type}`} style={{ marginBottom: 16 }}>
              {addResult.type === 'success' ? (
                <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: 8 }} />
              ) : (
                <FontAwesomeIcon icon={faTimesCircle} style={{ marginRight: 8 }} />
              )}
              {addResult.message}
            </div>
          )}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="add-first">First Name</label>
              <input
                id="add-first"
                type="text"
                placeholder="Jane"
                value={addForm.firstName}
                onChange={(e) => setAddForm((f) => ({ ...f, firstName: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="add-last">Last Name</label>
              <input
                id="add-last"
                type="text"
                placeholder="Doe"
                value={addForm.lastName}
                onChange={(e) => setAddForm((f) => ({ ...f, lastName: e.target.value }))}
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="add-email">Email *</label>
            <input
              id="add-email"
              type="email"
              placeholder="jane@example.com"
              value={addForm.email}
              onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="modal-actions" style={{ borderTop: 'none', paddingTop: 0, marginTop: 8 }}>
            <button className="cancel-btn" onClick={() => navigate('/admin/users')}>
              Cancel
            </button>
            <button className="submit-btn" disabled={!addForm.email.trim() || addSubmitting} onClick={handleAddUser}>
              {addSubmitting ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faPlus} style={{ marginRight: 6 }} />}
              Create User
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AddUserPage;
