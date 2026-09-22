import './UserPicker.css';

import type { Role, User } from '../../api/api.users';
import { filterUsers, getDisplayName } from '../../utils/user';
import { useCallback, useMemo, useState } from 'react';

import type { ReactNode } from 'react';
import { UserAvatar } from './UserAvatar';
import { VirtualizedSelect } from './VirtualizedSelect';

export interface UserPickerProps {
  /** Every user that may be picked, in any order — the list is sorted by name. */
  users: User[];
  /** Selected user ids. */
  values: readonly string[];
  onChange: (values: string[]) => void;
  id?: string;
  name?: string;
  disabled?: boolean;
  /** Shown when nothing is selected. */
  placeholder?: string;
  searchPlaceholder?: string;
  listHeight?: number;
  className?: string;
  /** Pills shown in the trigger before the rest collapse into a "+N more" pill. */
  maxPills?: number;
  /** Keep only users holding at least one of these roles, e.g. only coaches. */
  onlyRoles?: readonly Role[];
  /** Shown when the list has nothing to offer, in place of the built-in wording. */
  emptyMessage?: string;
}

const DEFAULT_MAX_PILLS = 3;
/** Roles shown on a row before the rest collapse into a "+N" chip. */
const MAX_ROLES = 3;

/**
 * Multi-select dropdown for picking users.
 *
 * Each row shows the avatar, name, email and the user's roles, and typing
 * filters on name and email. The list stays alphabetical, and `onlyRoles`
 * restricts it to users holding one of the given roles (e.g. an organizer
 * picker wants coaches).
 */
export function UserPicker({
  users,
  values,
  onChange,
  id,
  name,
  disabled,
  placeholder = 'Select users',
  searchPlaceholder = 'Search users...',
  listHeight,
  className,
  maxPills = DEFAULT_MAX_PILLS,
  onlyRoles,
  emptyMessage = 'No users found',
}: UserPickerProps) {
  const [search, setSearch] = useState('');

  const rows = useMemo(
    () => filterUsers(users, { query: search, roles: onlyRoles }),
    [users, search, onlyRoles],
  );

  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  const emptyMessageText = search.trim() ? 'No users match your search' : emptyMessage;

  const renderRow = useCallback((user: User): ReactNode => {
    const roles = user.roles ?? [];
    const shownRoles = roles.slice(0, MAX_ROLES);
    const hiddenRoles = roles.length - shownRoles.length;

    return (
      <span className="up-row">
        <UserAvatar user={user} size={24} />
        <span className="up-name">{getDisplayName(user)}</span>
        {user.email ? <span className="up-email">{user.email}</span> : null}
        {roles.length > 0 && (
          <span className="up-roles" title={roles.join(', ')}>
            {shownRoles.map((role) => (
              <span key={role} className={`up-role ${role.toLowerCase()}`}>
                {role}
              </span>
            ))}
            {hiddenRoles > 0 && <span className="up-role">+{hiddenRoles}</span>}
          </span>
        )}
      </span>
    );
  }, []);

  const renderTrigger = useCallback(
    (selectedIds: readonly string[]): ReactNode => {
      if (selectedIds.length === 0) return null;

      const pills = selectedIds.map((selectedId) => {
        const user = usersById.get(selectedId);
        return { id: selectedId, label: user ? getDisplayName(user) : selectedId };
      });
      // Once the pills no longer fit, keep one slot for the overflow counter.
      const visibleCount = pills.length > maxPills ? Math.max(1, maxPills - 1) : pills.length;
      const visible = pills.slice(0, visibleCount);
      const hiddenCount = pills.length - visibleCount;

      return (
        <span className="up-pills">
          {visible.map((pill) => (
            <span key={pill.id} className="up-pill">
              <span className="up-pill-label">{pill.label}</span>
              <span
                role="button"
                tabIndex={-1}
                aria-label={`Remove ${pill.label}`}
                className="up-pill-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(values.filter((value) => value !== pill.id));
                }}
              >
                ×
              </span>
            </span>
          ))}
          {hiddenCount > 0 && <span className="up-pill up-pill-more">+{hiddenCount} more</span>}
        </span>
      );
    },
    [usersById, maxPills, onChange, values],
  );

  return (
    <VirtualizedSelect<User>
      id={id}
      name={name}
      disabled={disabled}
      className={className}
      multiple
      items={rows}
      values={values}
      onChangeValues={onChange}
      clearable
      getOptionValue={(user) => user.id}
      getOptionLabel={(user) => getDisplayName(user)}
      renderOption={renderRow}
      renderTrigger={renderTrigger}
      // The rows already carry the search text and the role filter, so the
      // built-in label filter must not narrow them a second time.
      filterItems={() => true}
      onSearchChange={setSearch}
      searchPlaceholder={searchPlaceholder}
      placeholder={placeholder}
      emptyMessage={emptyMessageText}
      listHeight={listHeight}
    />
  );
}
