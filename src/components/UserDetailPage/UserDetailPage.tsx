import '../../styles/page.css';
import './UserDetailPage.css';

import {
  faArrowLeft,
  faCheckCircle,
  faSpinner,
  faUser,
} from '@fortawesome/free-solid-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchUserById, type User } from '../../api/api';

/* ─── Helpers ─────────────────────────────────────────────────────── */

function getInitials(user: User): string {
  const first = user.firstName?.trim() ?? '';
  const last = user.lastName?.trim() ?? '';
  const f = first.charAt(0);
  const l = last.charAt(0);
  if (f && l) return `${f}${l}`.toUpperCase();
  if (f) return f.toUpperCase();
  return (user.email?.charAt(0) ?? '?').toUpperCase();
}

function getDisplayName(user: User): string {
  const first = user.firstName?.trim() ?? '';
  const last = user.lastName?.trim() ?? '';
  const full = [first, last].filter(Boolean).join(' ');
  return full || user.email || '-';
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function renderRoleBadges(roles?: string[] | null) {
  if (!roles || roles.length === 0) return <span style={{ color: '#999', fontSize: 12 }}>—</span>;
  return roles.map((r) => (
    <span key={r} className={`role-badge ${r.toLowerCase()}`}>
      {r}
    </span>
  ));
}

/* ─── Component ───────────────────────────────────────────────────── */

function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetchUserById(id)
      .then(setUser)
      .catch((err) => {
        console.error('Failed to load user:', err);
        setError('Could not load user details.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="user-detail-page">
      <button className="user-detail-back" onClick={() => navigate('/admin/users')}>
        <FontAwesomeIcon icon={faArrowLeft} />
        Back to Users
      </button>

      <section className="section">
        {loading && (
          <div className="detail-loading">
            <FontAwesomeIcon icon={faSpinner} size="3x" spin />
            <p>Loading user details...</p>
          </div>
        )}

        {!loading && error && (
          <div className="detail-error">
            <FontAwesomeIcon icon={faUser} size="3x" style={{ opacity: 0.3 }} />
            <h3>Failed to load user</h3>
            <p>{error}</p>
            <button className="primary-btn" onClick={() => navigate('/admin/users')}>
              <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: 6 }} />
              Back to Users
            </button>
          </div>
        )}

        {!loading && !error && !user && (
          <div className="detail-error">
            <FontAwesomeIcon icon={faUser} size="3x" style={{ opacity: 0.3 }} />
            <h3>User not found</h3>
            <p>The requested user could not be found.</p>
            <button className="primary-btn" onClick={() => navigate('/admin/users')}>
              <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: 6 }} />
              Back to Users
            </button>
          </div>
        )}

        {!loading && !error && user && (
          <div className="user-detail-card">
            <div className="user-detail-header">
              <div className="user-detail-avatar-large">{getInitials(user)}</div>
              <div className="user-detail-heading">
                <h2>{getDisplayName(user)}</h2>
                <p className="email">{user.email || '-'}</p>
              </div>
            </div>

            <div className="user-detail-body">
              {/* Roles & Status */}
              <div className="user-detail-section">
                <h3>Roles &amp; Status</h3>
                <div className="detail-grid">
                  <div className="detail-field">
                    <span className="detail-field-label">Roles</span>
                    <span className="detail-field-value detail-roles-list">
                      {renderRoleBadges(user.roles)}
                    </span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-field-label">Status</span>
                    <span className="detail-field-value">
                      {user.isDeleted ? (
                        <span style={{ color: '#999' }}>Inactive</span>
                      ) : user.isEmailVerified ? (
                        <span style={{ color: '#4caf50' }}>
                          <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: 4 }} />
                          Verified
                        </span>
                      ) : (
                        <span style={{ color: '#ff9800' }}>Pending</span>
                      )}
                    </span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-field-label">Terms Accepted</span>
                    <span className="detail-field-value">
                      {user.acceptedTerms ? (
                        <span style={{ color: '#4caf50' }}>Yes</span>
                      ) : (
                        <span style={{ color: '#999' }}>No</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Personal Info */}
              <div className="user-detail-section">
                <h3>Personal Info</h3>
                <div className="detail-grid">
                  <div className="detail-field">
                    <span className="detail-field-label">First Name</span>
                    <span className="detail-field-value">{user.firstName || '-'}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-field-label">Last Name</span>
                    <span className="detail-field-value">{user.lastName || '-'}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-field-label">Height</span>
                    <span className="detail-field-value">
                      {user.heightInInches != null ? `${user.heightInInches} in` : '-'}
                    </span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-field-label">Birthdate</span>
                    <span className="detail-field-value">{formatDate(user.birthdate)}</span>
                  </div>
                </div>
              </div>

              {/* System Info */}
              <div className="user-detail-section">
                <h3>System Info</h3>
                <div className="detail-grid">
                  <div className="detail-field">
                    <span className="detail-field-label">Created</span>
                    <span className="detail-field-value">{formatDate(user.createdAt)}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-field-label">Last Modified</span>
                    <span className="detail-field-value">{formatDate(user.lastModifiedAt)}</span>
                  </div>
                  <div className="detail-field full-width">
                    <span className="detail-field-label">User ID</span>
                    <span className="detail-field-value mono">{user.id}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default UserDetailPage;
