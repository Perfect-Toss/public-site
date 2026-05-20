import './DashboardView.css';

import { useEffect, useMemo, useState } from 'react';

import type { EventLogUserSummary } from '../../../api/api';
import { fetchEventLogSummary } from '../../../api/api';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function formatMonthLabel(year: number, month: number) {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function getDisplayName(row: EventLogUserSummary): string {
  const first = row.firstName?.trim() ?? '';
  const last = row.lastName?.trim() ?? '';
  const full = [first, last].filter(Boolean).join(' ');
  return full || '-';
}

function DashboardView() {
  const [summaryData, setSummaryData] = useState<EventLogUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSummary();
  }, []);

  async function loadSummary() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchEventLogSummary();
      setSummaryData(data);
    } catch (err) {
      console.error('Failed to load event log summary:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Collect all unique month keys across all users, ensuring at least 6 months shown
  const allMonths = useMemo(() => {
    const monthSet = new Set<string>();
    summaryData.forEach((user) => {
      user.monthlyData?.forEach((m) => {
        if (m.year != null && m.month != null) {
          monthSet.add(formatMonthKey(m.year, m.month));
        }
      });
    });
    // Pad to at least 6 months ending with the current month
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthSet.add(formatMonthKey(d.getFullYear(), d.getMonth() + 1));
    }
    return Array.from(monthSet).sort().reverse();
  }, [summaryData]);

  // Build a lookup: userId -> monthKey -> monthly summary
  const dataByUser = useMemo(() => {
    const map = new Map<string, Map<string, { videosCaptured: number; daysUsed: number }>>();
    summaryData.forEach((user) => {
      const monthMap = new Map<string, { videosCaptured: number; daysUsed: number }>();
      user.monthlyData?.forEach((m) => {
        if (m.year != null && m.month != null) {
          monthMap.set(formatMonthKey(m.year, m.month), {
            videosCaptured: m.videosCaptured ?? 0,
            daysUsed: m.daysUsed ?? 0,
          });
        }
      });
      map.set(user.userId ?? user.email ?? '', monthMap);
    });
    return map;
  }, [summaryData]);

  if (loading) {
    return (
      <div className="dashboard-view">
        <section className="section">
          <div className="section-header">
            <h2>USAGE DASHBOARD</h2>
          </div>
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            Loading dashboard data…
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-view">
        <section className="section">
          <div className="section-header">
            <h2>USAGE DASHBOARD</h2>
          </div>
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: '#e53935', marginBottom: '16px' }}>{error}</p>
            <button
              onClick={loadSummary}
              style={{
                padding: '8px 20px',
                background: '#cfff04',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '13px',
              }}
            >
              RETRY
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="dashboard-view">
      <section className="section">
        <div className="section-header">
          <h2>USAGE DASHBOARD</h2>
          <p style={{ color: '#666', fontSize: '13px', margin: '4px 0 0' }}>
            Event log summary grouped by user — videos captured &amp; days used per month
          </p>
        </div>

        <div className="dashboard-scroll-wrapper">
          <table className="dashboard-table">
            <thead>
              {/* Row 1: static headers + month group headers */}
              <tr>
                <th rowSpan={2} className="th-static th-email">Email</th>
                <th rowSpan={2} className="th-static">Name</th>
                {allMonths.map((key) => {
                  const [year, month] = key.split('-').map(Number);
                  return (
                    <th key={key} colSpan={2} className="th-month-group">
                      {formatMonthLabel(year, month)}
                    </th>
                  );
                })}
              </tr>
              {/* Row 2: sub-column headers for each month */}
              <tr>
                {allMonths.map((key) => (
                  <>
                    <th key={`${key}-v`} className="th-sub">Videos</th>
                    <th key={`${key}-d`} className="th-sub">Days Used</th>
                  </>
                ))}
              </tr>
            </thead>
            <tbody>
              {summaryData.length === 0 ? (
                <tr>
                  <td
                    colSpan={2 + allMonths.length * 2}
                    style={{ textAlign: 'center', padding: '32px', color: '#999' }}
                  >
                    No data available.
                  </td>
                </tr>
              ) : (
                summaryData.map((user) => {
                  const userKey = user.userId ?? user.email ?? '';
                  const monthMap = dataByUser.get(userKey);
                  return (
                    <tr key={userKey}>
                      <td className="td-email">{user.email || '-'}</td>
                      <td className="td-name">{getDisplayName(user)}</td>
                      {allMonths.map((mk) => {
                        const entry = monthMap?.get(mk);
                        return (
                          <>
                            <td key={`${mk}-v`} className="td-num td-month-start">
                              {entry != null ? entry.videosCaptured : '-'}
                            </td>
                            <td key={`${mk}-d`} className="td-num">
                              {entry != null ? entry.daysUsed : '-'}
                            </td>
                          </>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default DashboardView;
