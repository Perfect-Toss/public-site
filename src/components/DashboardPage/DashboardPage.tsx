import '../../styles/page.css';
import './DashboardPage.css';

import React, { useEffect, useMemo, useState } from 'react';
import { faSortDown, faSortUp } from '@fortawesome/free-solid-svg-icons';

import type { EventLogUserSummary } from '../../api/api.eventLogs';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEventLogStore } from '../../stores/eventLogStore';

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

function DashboardPage() {
  const { summary: summaryData, summaryLoading: loading, summaryError: error, loadSummary } = useEventLogStore();

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const allMonths = useMemo(() => {
    const monthSet = new Set<string>();
    summaryData.forEach((user) => {
      user.monthlyData?.forEach((m) => {
        if (m.year != null && m.month != null) {
          monthSet.add(formatMonthKey(m.year, m.month));
        }
      });
    });
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthSet.add(formatMonthKey(d.getFullYear(), d.getMonth() + 1));
    }
    return Array.from(monthSet).sort().reverse();
  }, [summaryData]);

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

  /* ─── Sorting ─────────────────────────────────────────────── */

  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = () => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const sortedData = useMemo(() => {
    return [...summaryData].sort((a, b) => {
      const emailA = (a.email ?? '').toLowerCase();
      const emailB = (b.email ?? '').toLowerCase();
      return sortDirection === 'asc'
        ? emailA.localeCompare(emailB)
        : emailB.localeCompare(emailA);
    });
  }, [summaryData, sortDirection]);

  const renderSortIcon = () => {
    if (sortDirection === 'asc') {
      return <FontAwesomeIcon icon={faSortUp} style={{ marginLeft: 4 }} />;
    }
    return <FontAwesomeIcon icon={faSortDown} style={{ marginLeft: 4 }} />;
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <section className="section">
          <div className="section-header">
            <h2>Usage Dashboard</h2>
          </div>
          <div className="loading-container">
            <div className="spinner" />
            <p>Loading dashboard data…</p>
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <section className="section">
          <div className="section-header">
            <h2>Usage Dashboard</h2>
          </div>
          <div className="error-container">
            <p>{error}</p>
            <button className="retry-button" onClick={loadSummary}>
              RETRY
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <section className="section">
        <div className="section-header">
          <h2>Usage Dashboard</h2>
          <p className="dashboard-description">
            Event log summary grouped by user — videos captured &amp; days used per month
          </p>
        </div>

        <div className="dashboard-table-wrapper">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th rowSpan={2} className="th-static th-email sortable-header" onClick={handleSort}>
                  Email{renderSortIcon()}
                </th>
                {allMonths.map((key) => {
                  const [year, month] = key.split('-').map(Number);
                  return (
                    <th key={key} colSpan={2} className="th-month-group">
                      {formatMonthLabel(year, month)}
                    </th>
                  );
                })}
              </tr>
              <tr>
                {allMonths.map((key) => (
                  <React.Fragment key={key}>
                    <th key={`${key}-v`} className="th-sub">Videos</th>
                    <th key={`${key}-d`} className="th-sub">Days Used</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={1 + allMonths.length * 2}
                    className="empty-state"
                  >
                    No data available.
                  </td>
                </tr>
              ) : (
                sortedData.map((user) => {
                  const userKey = user.userId ?? user.email ?? '';
                  const monthMap = dataByUser.get(userKey);
                  return (
                    <tr key={userKey}>
                      <td className="td-email">
                        {user.email || '-'}
                        {getDisplayName(user) !== '-' && (
                          <span className="td-name-inline"> [{getDisplayName(user)}]</span>
                        )}
                      </td>
                      {allMonths.map((mk) => {
                        const entry = monthMap?.get(mk);
                        return (
                          <React.Fragment key={mk}>
                            <td key={`${mk}-v`} className="td-num td-month-start">
                              {entry != null ? entry.videosCaptured : '-'}
                            </td>
                            <td key={`${mk}-d`} className="td-num">
                              {entry != null ? entry.daysUsed : '-'}
                            </td>
                          </React.Fragment>
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

export default DashboardPage;
