import '../../styles/page.css';
import '../AdminUsersPage/AdminUsersPage.css';

import { faCheckCircle, faChevronLeft, faFileImport, faSpinner, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { useCallback, useState } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../stores/userStore';

/* ─── Bulk CSV Parser ─────────────────────────────────────────────── */

function parseCsvUsers(raw: string): { firstName?: string; lastName?: string; email?: string }[] {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  // If first line looks like a header, try to detect columns
  const headerLine = lines[0].toLowerCase();
  const hasHeader =
    headerLine.includes('email') ||
    headerLine.includes('first') ||
    headerLine.includes('last') ||
    headerLine.includes('name');

  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line) => {
    const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
    // Try to parse as: firstName, lastName, email  or  email, firstName, lastName
    if (parts.length >= 3) {
      // Heuristic: if first part contains @, order is email, first, last
      if (parts[0].includes('@')) {
        return { firstName: parts[1] || undefined, lastName: parts[2] || undefined, email: parts[0] || undefined };
      }
      return { firstName: parts[0] || undefined, lastName: parts[1] || undefined, email: parts[2] || undefined };
    }
    if (parts.length === 2) {
      if (parts[0].includes('@')) {
        return { email: parts[0] || undefined, lastName: parts[1] || undefined };
      }
      return { firstName: parts[0] || undefined, email: parts[1] || undefined };
    }
    return { email: parts[0] || undefined };
  });
}

function BulkImportPage() {
  const navigate = useNavigate();
  const { createAthletes, createCoaches, loadUsers } = useUserStore();

  const [bulkType, setBulkType] = useState<'athletes' | 'coaches'>('athletes');
  const [bulkCsv, setBulkCsv] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleBulkImport = useCallback(async () => {
    if (!bulkCsv.trim()) return;
    setBulkSubmitting(true);
    setBulkResult(null);
    try {
      const parsed = parseCsvUsers(bulkCsv);
      if (parsed.length === 0) {
        setBulkResult({ type: 'error', message: 'No valid user data found in the input.' });
        setBulkSubmitting(false);
        return;
      }

      if (bulkType === 'athletes') {
        await createAthletes({ athletes: parsed });
      } else {
        await createCoaches({ coaches: parsed });
      }

      setBulkResult({
        type: 'success',
        message: `Successfully imported ${parsed.length} ${bulkType}.`,
      });
      setBulkCsv('');
      loadUsers();
    } catch (err) {
      setBulkResult({ type: 'error', message: err instanceof Error ? err.message : 'Bulk import failed.' });
    } finally {
      setBulkSubmitting(false);
    }
  }, [bulkCsv, bulkType, createAthletes, createCoaches, loadUsers]);

  return (
    <div className="admin-users-page">
      <section className="section">
        <div className="org-breadcrumb" style={{ marginBottom: 16 }}>
          <button className="back-btn" onClick={() => navigate('/admin/users')}>
            <FontAwesomeIcon icon={faChevronLeft} />
            Users
          </button>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Bulk Import</span>
        </div>

        <div className="section-header">
          <h2>Bulk Import</h2>
        </div>

        <div className="bulk-import-section" style={{ marginTop: 0 }}>
          <h4>Bulk Import Users</h4>
          <p>Paste a comma-separated list of users below. Supported formats:</p>

          <div className="import-type-toggle">
            <button
              className={`import-type-btn ${bulkType === 'athletes' ? 'active' : ''}`}
              onClick={() => setBulkType('athletes')}
            >
              Athletes
            </button>
            <button
              className={`import-type-btn ${bulkType === 'coaches' ? 'active' : ''}`}
              onClick={() => setBulkType('coaches')}
            >
              Coaches
            </button>
          </div>

          <div className="form-group">
            <label htmlFor="bulk-csv">User Data (CSV)</label>
            <textarea
              id="bulk-csv"
              placeholder={
                'firstName,lastName,email\nJane,Doe,jane@example.com\nJohn,Smith,john@example.com'
              }
              rows={6}
              value={bulkCsv}
              onChange={(e) => setBulkCsv(e.target.value)}
            />
            <span className="helper-text">
              Columns: <code>firstName, lastName, email</code> or <code>email, firstName, lastName</code>. 
              Header row is optional.
            </span>
          </div>

          {bulkResult && (
            <div className={`import-result ${bulkResult.type}`}>
              {bulkResult.type === 'success' ? (
                <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: 8 }} />
              ) : (
                <FontAwesomeIcon icon={faTimesCircle} style={{ marginRight: 8 }} />
              )}
              {bulkResult.message}
            </div>
          )}

          <div className="modal-actions" style={{ borderTop: 'none', paddingTop: 12, marginTop: 0 }}>
            <button className="cancel-btn" onClick={() => navigate('/admin/users')}>
              Cancel
            </button>
            <button
              className="submit-btn"
              disabled={!bulkCsv.trim() || bulkSubmitting}
              onClick={handleBulkImport}
            >
              {bulkSubmitting ? (
                <FontAwesomeIcon icon={faSpinner} spin />
              ) : (
                <FontAwesomeIcon icon={faFileImport} style={{ marginRight: 6 }} />
              )}
              Import {bulkType === 'athletes' ? 'Athletes' : 'Coaches'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default BulkImportPage;
