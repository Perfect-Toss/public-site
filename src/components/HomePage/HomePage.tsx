import './HomePage.css';

import { APP_VERSION, IS_PRODUCTION, formatVersion } from '../../version';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  faBookBookmark,
  faBuilding,
  faCalendarDays,
  faChartBar,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faChevronUp,
  faEllipsis,
  faHome,
  faRightFromBracket,
  faScrewdriverWrench,
  faSitemap,
  faTag,
  faUser,
  faUsers,
  faVideo
} from '@fortawesome/free-solid-svg-icons';
import { type IconDefinition } from '@fortawesome/fontawesome-svg-core';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { STORAGE_KEYS } from '../../utils/constants';
import { logout } from '../../firebase/auth';
import { useAuth } from '../../contexts/useAuth';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';

/** Sub-navigation link lists for the admin accordion groups. */
const DEVICE_SUB_LINKS = [
  { to: '/admin/devices/machines', label: 'Machines' },
  { to: '/admin/devices/tablets', label: 'Tablets' },
] as const;

const REFERENCE_SUB_LINKS = [
  { to: '/admin/reference/tablet-types', label: 'Tablet Types' },
  { to: '/admin/reference/tags', label: 'Tags' },
] as const;

/**
 * Destinations pinned to the mobile tab bar. Everything else lives in the
 * "More" sheet — these four are the ones reached daily.
 */
const MOBILE_TABS = [
  { to: '/', label: 'Home', icon: faHome, end: true },
  { to: '/organizations', label: 'Orgs', icon: faBuilding, end: false },
  { to: '/events', label: 'Events', icon: faCalendarDays, end: false },
  { to: '/videos', label: 'Videos', icon: faVideo, end: false },
] as const;

/** True when the active route is not one of the tab bar's own destinations. */
function isMoreActive(pathname: string) {
  return !MOBILE_TABS.some((tab) =>
    tab.end ? pathname === tab.to : pathname.startsWith(tab.to),
  );
}

function NavLinks({ links }: { links: readonly { to: string; label: string }[] }) {
  return (
    <>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) => `nav-group-child ${isActive ? 'active' : ''}`}
        >
          {link.label}
        </NavLink>
      ))}
    </>
  );
}

interface NavGroupProps {
  label: string;
  icon: IconDefinition;
  expanded: boolean;
  onToggle: () => void;
  /** When true, the group contains the active route and cannot be collapsed. */
  locked?: boolean;
  collapsed: boolean;
  children: React.ReactNode;
}

/**
 * Collapsible sidebar nav group. In the expanded sidebar the children render
 * inline as an accordion; in the collapsed/narrow sidebar they appear in a
 * flyout positioned next to the group header. A group with an active child is
 * locked open.
 */
function NavGroup({ label, icon, expanded, onToggle, locked = false, collapsed, children }: NavGroupProps) {
  const headerRef = useRef<HTMLDivElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);

  // Position the flyout flush against (slightly overlapping) the header so
  // there is no dead zone between them when moving the mouse across — the
  // hover would otherwise be lost and the flyout would vanish. Fixed so it
  // escapes the scrollable nav container; max-height keeps it on screen.
  const positionFlyout = () => {
    const header = headerRef.current;
    const flyout = flyoutRef.current;
    if (!header || !flyout) return;
    const rect = header.getBoundingClientRect();
    flyout.style.position = 'fixed';
    flyout.style.left = `${rect.right - 4}px`;
    flyout.style.top = `${rect.top}px`;
  };

  return (
    <div className="nav-group">
      <div
        ref={headerRef}
        className={`nav-item nav-group-header${locked ? ' locked' : ''}`}
        onClick={locked ? undefined : onToggle}
        onMouseEnter={positionFlyout}
        role="button"
        tabIndex={locked ? -1 : 0}
        aria-expanded={expanded}
        aria-disabled={locked}
        onKeyDown={(e) => {
          if (locked) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <span className="nav-icon"><FontAwesomeIcon icon={icon} /></span>
        {!collapsed && <span className="nav-group-label">{label}</span>}
        {!collapsed && (
          <FontAwesomeIcon
            icon={expanded ? faChevronUp : faChevronDown}
            className="nav-group-chevron"
          />
        )}
      </div>

      {/* Inline accordion children (expanded sidebar) */}
      <div className={`nav-group-children${expanded ? ' open' : ''}`}>
        {children}
      </div>

      {/* Flyout submenu (collapsed / narrow sidebar) */}
      <div ref={flyoutRef} className="nav-group-flyout" onMouseEnter={positionFlyout}>
        <div className="nav-group-flyout-title">{label}</div>
        {children}
      </div>
    </div>
  );
}

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `nav-item ${isActive ? 'active' : ''}`;

interface MobileSheetProps {
  open: boolean;
  isAdmin: boolean;
  versionLabel: string;
  versionTitle?: string;
  onClose: () => void;
  onLogout: () => void;
}

/**
 * Bottom sheet behind the tab bar's "More" button. It carries everything the
 * tab bar can't hold (account, logout, the admin section, the version) and is
 * only visible under the mobile breakpoint — see HomePage.css.
 */
function MobileSheet({
  open,
  isAdmin,
  versionLabel,
  versionTitle,
  onClose,
  onLogout,
}: MobileSheetProps) {
  return (
    <>
      <div
        className={`mobile-sheet-backdrop${open ? ' open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`mobile-sheet${open ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="More navigation"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <div className="mobile-sheet-grip" aria-hidden="true" />

        <nav className="mobile-sheet-body">
          <NavLink to="/account" className={navItemClass}>
            <span className="nav-icon"><FontAwesomeIcon icon={faUser} /></span>
            <span>ACCOUNT</span>
          </NavLink>

          {isAdmin && (
            <>
              <div className="nav-spacer" />
              <div className="nav-section-label">Admin</div>

              <NavLink to="/admin/dashboard" className={navItemClass}>
                <span className="nav-icon"><FontAwesomeIcon icon={faChartBar} /></span>
                <span>DASHBOARD</span>
              </NavLink>

              <div className="nav-section-label">Devices</div>
              <NavLinks links={DEVICE_SUB_LINKS} />

              <div className="nav-section-label">Reference</div>
              <NavLinks links={REFERENCE_SUB_LINKS} />

              <NavLink to="/admin/organizations" className={navItemClass}>
                <span className="nav-icon"><FontAwesomeIcon icon={faSitemap} /></span>
                <span>ORGANIZATIONS</span>
              </NavLink>

              <NavLink to="/admin/users" className={navItemClass}>
                <span className="nav-icon"><FontAwesomeIcon icon={faUsers} /></span>
                <span>USERS</span>
              </NavLink>
            </>
          )}

          <button type="button" className="nav-item" onClick={onLogout}>
            <span className="nav-icon"><FontAwesomeIcon icon={faRightFromBracket} /></span>
            <span>LOGOUT</span>
          </button>

          <div className="sidebar-version" title={versionTitle}>
            {versionLabel}
          </div>
        </nav>
      </div>
    </>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useLocalStorage(STORAGE_KEYS.SIDEBAR_COLLAPSED, false);
  const [devicesExpanded, setDevicesExpanded] = useLocalStorage(STORAGE_KEYS.DEVICES_NAV_EXPANDED, true);
  const [referenceExpanded, setReferenceExpanded] = useLocalStorage(STORAGE_KEYS.REFERENCE_NAV_EXPANDED, true);
  const [sheetOpen, setSheetOpen] = useState(false);

  const isDevicesRoute = location.pathname.startsWith('/admin/devices');
  const isReferenceRoute = location.pathname.startsWith('/admin/reference');

  // ── Collapsed-sidebar tooltip (JS-positioned so the scroll container
  //    doesn't clip it; pure-CSS tooltips are cut off by overflow-x) ──
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const tooltipTargetRef = useRef<HTMLElement | null>(null);

  const positionTooltip = useCallback((el: HTMLElement) => {
    const text = el.getAttribute('data-tooltip');
    if (!text) return;
    const rect = el.getBoundingClientRect();
    setTooltip({ text, x: rect.right + 12, y: rect.top + rect.height / 2 });
  }, []);

  const handleNavMouseOver = (e: React.MouseEvent<HTMLElement>) => {
    if (!collapsed) {
      tooltipTargetRef.current = null;
      setTooltip(null);
      return;
    }
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-tooltip]');
    if (el) {
      if (tooltipTargetRef.current !== el) {
        tooltipTargetRef.current = el;
        positionTooltip(el);
      }
    } else {
      tooltipTargetRef.current = null;
      setTooltip(null);
    }
  };

  const handleNavMouseLeave = () => {
    tooltipTargetRef.current = null;
    setTooltip(null);
  };

  const handleNavScroll = () => {
    if (tooltipTargetRef.current) {
      positionTooltip(tooltipTargetRef.current);
    }
  };

  // Auto-expand the group whose route is active
  useEffect(() => {
    if (isDevicesRoute && !devicesExpanded) {
      setDevicesExpanded(true);
    }
  }, [isDevicesRoute, devicesExpanded, setDevicesExpanded]);

  useEffect(() => {
    if (isReferenceRoute && !referenceExpanded) {
      setReferenceExpanded(true);
    }
  }, [isReferenceRoute, referenceExpanded, setReferenceExpanded]);

  useEffect(() => {
    // Clean up URL query parameters after authentication
    const url = new URL(window.location.href);
    if (url.search) {
      const paramsToRemove = ['apiKey', 'oobCode', 'mode', 'lang', 'continueUrl'];
      let hasAuthParams = false;
      
      paramsToRemove.forEach(param => {
        if (url.searchParams.has(param)) {
          url.searchParams.delete(param);
          hasAuthParams = true;
        }
      });
      
      if (hasAuthParams) {
        window.history.replaceState({}, document.title, url.pathname);
      }
    }
  }, []);

  const handleLogout = async () => {
    setSheetOpen(false);
    const { success } = await logout();
    if (success) {
      console.log('Successfully logged out');
    }
  };

  // The sheet is a navigation surface — any route change dismisses it.
  useEffect(() => {
    setSheetOpen(false);
  }, [location.pathname]);

  // While the sheet covers the page: Escape closes it and the page behind it
  // holds still, so a scroll gesture doesn't leak through to the content.
  useEffect(() => {
    if (!sheetOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSheetOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [sheetOpen]);

  return (
    <div className={`home-page${collapsed ? ' sidebar-collapsed' : ''}`}>
      {/* Sidebar */}
      <aside
        className={`sidebar${collapsed ? ' collapsed' : ''}`}
        onMouseOver={handleNavMouseOver}
        onMouseLeave={handleNavMouseLeave}
      >
        <div className="sidebar-header">
          <div 
            className="logo" 
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer' }}
          >
            <div className="logo-icon"></div>
            {!collapsed && <span className="logo-text">PERFECT TOSS</span>}
          </div>
        </div>

        <nav className="sidebar-nav" onScroll={handleNavScroll}>
          <NavLink 
            to="/"
            end
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            data-tooltip="Home"
          >
            <span className="nav-icon"><FontAwesomeIcon icon={faHome} /></span>
            {!collapsed && <span>HOME</span>}
          </NavLink>

          <NavLink 
            to="/organizations"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            data-tooltip="Organizations"
          >
            <span className="nav-icon"><FontAwesomeIcon icon={faBuilding} /></span>
            {!collapsed && <span>ORGANIZATIONS</span>}
          </NavLink>

          <NavLink 
            to="/events"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            data-tooltip="Events"
          >
            <span className="nav-icon"><FontAwesomeIcon icon={faCalendarDays} /></span>
            {!collapsed && <span>EVENTS</span>}
          </NavLink>

          <NavLink 
            to="/videos"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            data-tooltip="Videos"
          >
            <span className="nav-icon"><FontAwesomeIcon icon={faVideo} /></span>
            {!collapsed && <span>VIDEOS</span>}
          </NavLink>

          {isAdmin && (
            <>
              <div className="nav-spacer" />
              <div className="nav-section-label">Admin</div>
              <NavLink
                to="/admin/dashboard"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                data-tooltip="Dashboard"
              >
                <span className="nav-icon"><FontAwesomeIcon icon={faChartBar} /></span>
                {!collapsed && <span>DASHBOARD</span>}
              </NavLink>

              {/* Devices accordion */}
              <NavGroup
                label="DEVICES"
                icon={faScrewdriverWrench}
                expanded={devicesExpanded}
                onToggle={() => setDevicesExpanded(!devicesExpanded)}
                locked={isDevicesRoute}
                collapsed={collapsed}
              >
                <NavLinks links={DEVICE_SUB_LINKS} />
              </NavGroup>

              {/* Reference accordion */}
              <NavGroup
                label="REFERENCE"
                icon={faBookBookmark}
                expanded={referenceExpanded}
                onToggle={() => setReferenceExpanded(!referenceExpanded)}
                locked={isReferenceRoute}
                collapsed={collapsed}
              >
                <NavLinks links={REFERENCE_SUB_LINKS} />
              </NavGroup>

              <NavLink
                to="/admin/organizations"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                data-tooltip="Organizations"
              >
                <span className="nav-icon"><FontAwesomeIcon icon={faSitemap} /></span>
                {!collapsed && <span>ORGANIZATIONS</span>}
              </NavLink>
              <NavLink
                to="/admin/users"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                data-tooltip="Users"
              >
                <span className="nav-icon"><FontAwesomeIcon icon={faUsers} /></span>
                {!collapsed && <span>USERS</span>}
              </NavLink>
            </>
          )}
        </nav>

        {/* Divider between the scrollable nav and the account section */}
        <div className="nav-account-divider" />

        <NavLink 
          to="/account"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          data-tooltip="Account"
        >
          <span className="nav-icon"><FontAwesomeIcon icon={faUser} /></span>
          {!collapsed && <span>ACCOUNT</span>}
        </NavLink>

        <button 
          className="nav-item logout-button"
          onClick={handleLogout}
          data-tooltip="Logout"
        >
          <span className="nav-icon"><FontAwesomeIcon icon={faRightFromBracket} /></span>
          {!collapsed && <span>LOGOUT</span>}
        </button>

        {collapsed ? (
          <div
            className="sidebar-version collapsed"
            data-tooltip={
              IS_PRODUCTION
                ? formatVersion()
                : `${formatVersion()} · built ${new Date(APP_VERSION.buildTime).toLocaleString()}`
            }
          >
            <FontAwesomeIcon icon={faTag} />
          </div>
        ) : (
          <div
            className="sidebar-version"
            title={
              IS_PRODUCTION
                ? undefined
                : `Built ${new Date(APP_VERSION.buildTime).toLocaleString()}`
            }
          >
            {formatVersion()}
          </div>
        )}

        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          data-tooltip={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronLeft} />
        </button>
      </aside>

      {/* JS-rendered tooltip for the collapsed sidebar */}
      {tooltip && collapsed && (
        <div className="sidebar-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.text}
        </div>
      )}

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* ── Mobile shell (visible under the mobile breakpoint) ── */}
      <header className="mobile-topbar">
        <button
          type="button"
          className="mobile-topbar-logo"
          onClick={() => navigate('/')}
          aria-label="Perfect Toss home"
        >
          <span className="logo-icon" />
          <span className="logo-text">PERFECT TOSS</span>
        </button>
      </header>

      <nav className="mobile-tabbar" aria-label="Primary">
        {MOBILE_TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => `mobile-tab ${isActive ? 'active' : ''}`}
          >
            <FontAwesomeIcon icon={tab.icon} className="mobile-tab-icon" />
            <span className="mobile-tab-label">{tab.label}</span>
          </NavLink>
        ))}

        <button
          type="button"
          className={`mobile-tab ${isMoreActive(location.pathname) ? 'active' : ''}`}
          onClick={() => setSheetOpen((open) => !open)}
          aria-expanded={sheetOpen}
          aria-haspopup="dialog"
        >
          <FontAwesomeIcon icon={faEllipsis} className="mobile-tab-icon" />
          <span className="mobile-tab-label">More</span>
        </button>
      </nav>

      <MobileSheet
        open={sheetOpen}
        isAdmin={isAdmin}
        versionLabel={formatVersion()}
        versionTitle={
          IS_PRODUCTION
            ? undefined
            : `Built ${new Date(APP_VERSION.buildTime).toLocaleString()}`
        }
        onClose={() => setSheetOpen(false)}
        onLogout={handleLogout}
      />
    </div>
  );
}

export default HomePage;
