import {
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Link, useInRouterContext } from 'react-router-dom';
import { AuthContext } from '../../contexts/useAuth';
import type { Handedness } from '../../api/api.users';
import { useUserProfile } from '../../hooks/useUserProfile';
import { formatHeight, formatUstaRating } from '../../utils/profile';
import { getDisplayName } from '../../utils/user';
import { UserAvatar, type UserAvatarProps } from './UserAvatar';
import { useSnackbar } from './useSnackbar';
import './UserInfo.css';

/** Avatar diameter in the profile card. */
const CARD_AVATAR_SIZE = 44;
/** How long the pointer must rest on the chip before the card appears. */
const OPEN_DELAY_MS = 300;
/** Grace period so crossing from the chip onto the card doesn't close it. */
const CLOSE_DELAY_MS = 150;
/** Gap between the chip and the card. */
const CARD_GAP = 8;
/** Card width, fixed so it can be measured and clamped before it paints. */
const CARD_WIDTH = 248;

/** The embedded user shape plus the profile facts the card can show. */
export type UserInfoUser = UserAvatarProps['user'] & {
  id?: string | null;
  ustaRating?: number | null;
  heightInInches?: number | null;
  handedness?: Handedness | null;
};

export interface UserInfoProps {
  user: UserInfoUser;
  /** Avatar diameter in pixels. */
  size?: number;
  /** Render the email as visible text next to the display name. */
  showEmail?: boolean;
  /** Whether to render the avatar. Set false for compact text-only layouts. */
  showAvatar?: boolean;
  /** Small label rendered above the display name. */
  supertext?: ReactNode;
  /** Replaces the built-in profile card on click. */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}

/**
 * Displays a user's avatar and display name (falling back to the email), with
 * an optional label above it. Resting on the chip opens a profile card with the
 * account's facts; clicking pins it (and releases it) unless the caller supplies
 * its own `onClick`. Right-clicking copies "{email} <{display name}>" to the
 * clipboard and shows a snackbar.
 */
export function UserInfo({
  user,
  size,
  showEmail = false,
  showAvatar = true,
  supertext,
  onClick,
  className,
}: UserInfoProps) {
  const { showSnackbar } = useSnackbar();
  const auth = useContext(AuthContext);
  const inRouter = useInRouterContext();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);
  const cardId = useId();
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const displayName = getDisplayName(user);
  const email = user.email || '';
  const hasEmail = Boolean(email);
  // A user with no name and no email has no profile to show.
  const hasProfile = displayName !== '-';
  const isInteractive = Boolean(onClick) || hasProfile || hasEmail;

  // A video, review or event only carries a slim user reference, so the card
  // reads the account itself — as an admin, which is who may read another's.
  const profile = useUserProfile(user.id, Boolean(open && auth?.isAdmin));
  const cardUser = profile ?? user;
  const cardName = getDisplayName(cardUser);
  const cardEmail = cardUser.email ?? '';
  const facts = [
    cardUser.ustaRating != null && {
      label: 'USTA rating',
      value: formatUstaRating(cardUser.ustaRating),
    },
    cardUser.heightInInches != null && {
      label: 'Height',
      value: formatHeight(cardUser.heightInInches),
    },
    cardUser.handedness && { label: 'Plays', value: cardUser.handedness },
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact));

  // The profile lives behind the admin-only /admin/users/{id} route.
  const profileUserId = user.id ?? cardUser.id;
  const profileHref =
    inRouter && auth?.isAdmin && profileUserId ? `/admin/users/${profileUserId}` : null;

  const cancelOpen = useCallback(() => window.clearTimeout(openTimer.current), []);
  const cancelClose = useCallback(() => window.clearTimeout(closeTimer.current), []);

  const closeCard = useCallback(() => {
    cancelOpen();
    cancelClose();
    setPinned(false);
    setOpen(false);
  }, [cancelOpen, cancelClose]);

  useEffect(() => {
    return () => {
      cancelOpen();
      cancelClose();
    };
  }, [cancelOpen, cancelClose]);

  const scheduleOpen = useCallback(() => {
    cancelClose();
    if (open) return;
    cancelOpen();
    openTimer.current = window.setTimeout(() => setOpen(true), OPEN_DELAY_MS);
  }, [open, cancelOpen, cancelClose]);

  const scheduleClose = useCallback(() => {
    cancelOpen();
    if (pinned) return;
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }, [pinned, cancelOpen, cancelClose]);

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

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (onClick) {
        onClick(event);
        return;
      }
      if (!hasProfile) return;
      // The chip usually sits inside a clickable row; pinning must not also
      // trigger the row's own action.
      event.stopPropagation();
      cancelOpen();
      cancelClose();
      if (pinned) {
        setPinned(false);
        setOpen(false);
      } else {
        setPinned(true);
        setOpen(true);
      }
    },
    [onClick, hasProfile, pinned, cancelOpen, cancelClose],
  );

  const handleBlur = useCallback((event: FocusEvent<HTMLButtonElement>) => {
    const next = event.relatedTarget as Node | null;
    // Tabbing onto the card's link must not close it from under the pointer.
    if (next && cardRef.current?.contains(next)) return;
    scheduleClose();
  }, [scheduleClose]);

  // While the card is up, Escape and an outside click dismiss it, and scrolling
  // or resizing closes it (a fixed panel anchored to a moved chip lies).
  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeCard();
    };
    const onDown = (event: Event) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (cardRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      closeCard();
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', closeCard, true);
    window.addEventListener('resize', closeCard);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', closeCard, true);
      window.removeEventListener('resize', closeCard);
    };
  }, [open, closeCard]);

  // Anchor to the avatar+name block, not the button: rows like the access list
  // stretch `.user-info` to fill the row, which would centre the card on the row.
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const anchor = textRef.current ?? buttonRef.current;
    const card = cardRef.current;
    if (!anchor || !card) return;

    const a = anchor.getBoundingClientRect();
    const { height } = card.getBoundingClientRect();
    const margin = 8;

    const left = Math.min(
      Math.max(a.left + a.width / 2 - CARD_WIDTH / 2, margin),
      window.innerWidth - CARD_WIDTH - margin,
    );
    const below = a.bottom + CARD_GAP;
    const top =
      below + height > window.innerHeight - margin
        ? Math.max(margin, a.top - height - CARD_GAP)
        : below;

    setPos({ top, left });
  }, [open, facts.length, cardEmail]);

  const classes = ['user-info', className].filter(Boolean).join(' ');

  const ariaLabel =
    !onClick && hasProfile
      ? `View ${displayName}`
      : hasEmail
        ? `Copy ${email} <${displayName}> to clipboard (right click)`
        : displayName;

  const cardBody = (
    <>
      <UserAvatar user={cardUser} size={CARD_AVATAR_SIZE} />
      <span className="user-info-card-name">{cardName}</span>
      {cardEmail && <span className="user-info-card-email">{cardEmail}</span>}
      {facts.length > 0 && (
        <div className="user-info-card-facts">
          {facts.map((fact) => (
            <span key={fact.label} className="user-info-card-fact">
              <span className="user-info-card-fact-label">{fact.label}</span>
              <span className="user-info-card-fact-value">{fact.value}</span>
            </span>
          ))}
        </div>
      )}
    </>
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={classes}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        onFocus={scheduleOpen}
        onBlur={handleBlur}
        disabled={!isInteractive}
        aria-label={ariaLabel}
        aria-describedby={open ? cardId : undefined}
      >
        {showAvatar && <UserAvatar user={user} size={size} />}
        <span className="user-info-text" ref={textRef}>
          {supertext && <span className="user-info-supertext">{supertext}</span>}
          <span className="user-info-lines">
            <span className="user-info-name">{displayName}</span>
            {showEmail && hasEmail && <span className="user-info-email">{email}</span>}
          </span>
        </span>
      </button>
      {open &&
        createPortal(
          <div
            ref={cardRef}
            id={cardId}
            role="tooltip"
            className="user-info-card"
            style={{
              top: pos?.top ?? 0,
              left: pos?.left ?? 0,
              visibility: pos ? 'visible' : 'hidden',
            }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            {profileHref ? (
              <Link
                className="user-info-card-body user-info-card-body-link"
                to={profileHref}
                onClick={closeCard}
              >
                {cardBody}
              </Link>
            ) : (
              <div className="user-info-card-body">{cardBody}</div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

export default UserInfo;
