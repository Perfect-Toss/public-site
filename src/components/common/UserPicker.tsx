import './UserPicker.css';

import type { Role, User } from '../../api/api.users';
import { filterUsers, getDisplayName } from '../../utils/user';
import { useMemo, useState } from 'react';

import type { ReactNode } from 'react';
import { TruncatedText } from './TruncatedText';
import { UserAvatar } from './UserAvatar';
import { VirtualizedSelect } from './VirtualizedSelect';

/** Props both selection modes share. */
export interface UserPickerBaseProps {
  /** Every user that may be picked, in any order — the list is sorted by name. */
  users: User[];
  id?: string;
  name?: string;
  disabled?: boolean;
  /** Shown when nothing is selected. */
  placeholder?: string;
  searchPlaceholder?: string;
  listHeight?: number;
  className?: string;
  /** Keep only users holding at least one of these roles, e.g. only coaches. */
  onlyRoles?: readonly Role[];
  /** Shown when the list has nothing to offer, in place of the built-in wording. */
  emptyMessage?: string;
}

/** Pick exactly one user. */
export interface UserPickerSingleProps extends UserPickerBaseProps {
  multiple: false;
  /** Selected user id, or null/'' for none. */
  value?: string | null;
  onChange: (value: string | null) => void;
}

/** Pick zero or more users — the default. */
export interface UserPickerMultiProps extends UserPickerBaseProps {
  multiple?: true;
  /** Selected user ids. */
  values: readonly string[];
  onChange: (values: string[]) => void;
  /** Pills shown in the trigger before the rest collapse into a "+N more" pill. */
  maxPills?: number;
}

export type UserPickerProps = UserPickerSingleProps | UserPickerMultiProps;

const DEFAULT_MAX_PILLS = 3;
/** Roles shown on a row before the rest collapse into a "+N" chip. */
const MAX_ROLES = 3;

/**
 * One user row — avatar, name, muted email and role chips. Owns the `.up-*`
 * presentation for both single- and multi-select modes.
 */
function UserOptionRow({ user }: { user: User }) {
  const roles = user.roles ?? [];
  const shownRoles = roles.slice(0, MAX_ROLES);
  const hiddenRoles = roles.length - shownRoles.length;

  return (
    <span className="up-row">
      <UserAvatar user={user} size={24} />
      <TruncatedText className="up-name" text={getDisplayName(user)} />
      {user.email ? <TruncatedText className="up-email" text={user.email} /> : null}
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
}

/**
 * Dropdown for picking users. Multi-select by default; `multiple={false}` gives
 * single-select, which swaps the selection props for `value`/`onChange` — a
 * discriminated union, so each mode only accepts its own API.
 *
 * Each row shows the avatar, name, email and the user's roles, and typing
 * filters on name and email. The list stays alphabetical, and `onlyRoles`
 * restricts it to users holding one of the given roles (e.g. an organizer
 * picker wants coaches).
 */
export function UserPicker(props: UserPickerProps) {
  const {
    users,
    id,
    name,
    disabled,
    placeholder = 'Select users',
    searchPlaceholder = 'Search users...',
    listHeight,
    className,
    onlyRoles,
    emptyMessage = 'No users found',
  } = props;

  const isSingle = props.multiple === false;
  const selectedValues: readonly string[] =
    props.multiple === false ? (props.value ? [props.value] : []) : props.values;
  const maxPills =
    props.multiple === false ? DEFAULT_MAX_PILLS : (props.maxPills ?? DEFAULT_MAX_PILLS);

  const [search, setSearch] = useState('');

  const rows = useMemo(
    () => filterUsers(users, { query: search, roles: onlyRoles }),
    [users, search, onlyRoles],
  );

  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  const emptyMessageText = search.trim() ? 'No users match your search' : emptyMessage;

  // Adapt the uniform id list to the active mode's callback shape.
  function commit(next: string[]) {
    if (props.multiple === false) {
      props.onChange(next[0] ?? null);
    } else {
      props.onChange(next);
    }
  }

  function renderRow(user: User): ReactNode {
    return <UserOptionRow user={user} />;
  }

  function renderTrigger(selectedIds: readonly string[]): ReactNode {
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
            <TruncatedText className="up-pill-label" text={pill.label} />
            <span
              role="button"
              tabIndex={-1}
              aria-label={`Remove ${pill.label}`}
              className="up-pill-remove"
              onClick={(e) => {
                e.stopPropagation();
                commit(selectedValues.filter((value) => value !== pill.id));
              }}
            >
              ×
            </span>
          </span>
        ))}
        {hiddenCount > 0 && <span className="up-pill up-pill-more">+{hiddenCount} more</span>}
      </span>
    );
  }

  return (
    <VirtualizedSelect<User>
      id={id}
      name={name}
      disabled={disabled}
      className={className}
      multiple={!isSingle}
      items={rows}
      value={isSingle ? (selectedValues[0] ?? '') : undefined}
      onChange={isSingle ? (value) => commit(value ? [value] : []) : undefined}
      values={isSingle ? undefined : selectedValues}
      onChangeValues={isSingle ? undefined : commit}
      clearable
      getOptionValue={(user) => user.id}
      getOptionLabel={(user) => getDisplayName(user)}
      renderOption={renderRow}
      renderTrigger={isSingle ? undefined : renderTrigger}
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
