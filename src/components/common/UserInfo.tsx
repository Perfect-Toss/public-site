import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { getDisplayName } from '../../utils/user';
import { UserAvatar, type UserAvatarProps } from './UserAvatar';
import { useSnackbar } from './useSnackbar';
import './UserInfo.css';

export interface UserInfoProps {
  user: UserAvatarProps['user'];
  /** Avatar diameter in pixels. */
  size?: number;
  /** Render the email as visible text next to the display name. */
  showEmail?: boolean;
  /** Whether to render the avatar. Set false for compact text-only layouts. */
  showAvatar?: boolean;
  className?: string;
}

/**
 * Displays a user's avatar + display name. Hovering shows a tooltip with the
 * user's email (rendered in a portal so overflow ancestors can't clip it).
 * Right-clicking copies "{email} <{display name}>" to the clipboard and shows
 * a snackbar confirmation.
 */
export function UserInfo({ user, size, showEmail = false, showAvatar = true, className }: UserInfoProps) {
  const { showSnackbar } = useSnackbar();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipId = useId();
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);

  const displayName = getDisplayName(user);
  const email = user.email || '';
  const hasEmail = Boolean(email);
  const tooltipText = hasEmail ? email : undefined;

  const handleContextMenu = useCallback(
    async (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (!hasEmail || !navigator.clipboard) return;
      try {
        await navigator.clipboard.writeText(`${email} <${displayName}>`);
        showSnackbar(`Copied "${email} <${displayName}>" to clipboard`);
      } catch {
        showSnackbar('Could not copy to clipboard', 'error');
      }
    },
    [email, displayName, hasEmail, showSnackbar],
  );

  const positionTooltip = useCallback(() => {
    const el = buttonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setTooltipPos({ top: rect.top, left: rect.left + rect.width / 2 });
  }, []);

  const showTooltip = useCallback(() => {
    if (!hasEmail) return;
    positionTooltip();
  }, [hasEmail, positionTooltip]);

  const hideTooltip = useCallback(() => setTooltipPos(null), []);

  // Close the tooltip on scroll/resize: mouseleave doesn't fire when the
  // button scrolls away from a stationary pointer, so hide it explicitly.
  useEffect(() => {
    if (!tooltipPos) return;
    window.addEventListener('scroll', hideTooltip, true);
    window.addEventListener('resize', hideTooltip);
    return () => {
      window.removeEventListener('scroll', hideTooltip, true);
      window.removeEventListener('resize', hideTooltip);
    };
  }, [tooltipPos, hideTooltip]);

  const classes = ['user-info', className].filter(Boolean).join(' ');

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={classes}
        onContextMenu={handleContextMenu}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        disabled={!hasEmail}
        aria-label={hasEmail ? `Copy ${email} <${displayName}> to clipboard (right click)` : displayName}
        aria-describedby={tooltipPos ? tooltipId : undefined}
      >
        {showAvatar && <UserAvatar user={user} size={size} />}
        <span className="user-info-name">{displayName}</span>
        {showEmail && <span className="user-info-email">{email}</span>}
      </button>
      {tooltipPos &&
        createPortal(
          <div
            id={tooltipId}
            className="user-info-tooltip"
            role="tooltip"
            style={{ top: tooltipPos.top, left: tooltipPos.left }}
          >
            {tooltipText}
          </div>,
          document.body,
        )}
    </>
  );
}

export default UserInfo;
