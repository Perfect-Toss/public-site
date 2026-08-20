import { useEffect } from 'react';

export interface UseModalKeyboardOptions {
  /** Whether the modal is currently open. The listener only runs while true. */
  active: boolean;
  /** Called when Escape is pressed (cancel/close). */
  onCancel: () => void;
  /** Optional primary action called when Enter is pressed. */
  onAccept?: () => void;
  /** When true, Escape/Enter are ignored (e.g. while submitting). */
  busy?: boolean;
}

/**
 * Dialog-level keyboard handling for modals: Escape cancels, Enter accepts the
 * primary action (when provided). Listens on `document` so it works even when
 * no element inside the modal has focus, and only while `active` is true.
 */
export function useModalKeyboard({
  active,
  onCancel,
  onAccept,
  busy = false,
}: UseModalKeyboardOptions) {
  useEffect(() => {
    if (!active) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        if (!busy) onCancel();
      } else if (ev.key === 'Enter' && onAccept) {
        const tag = (ev.target as HTMLElement)?.tagName;
        // Let buttons/inputs/textareas handle Enter themselves.
        if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
          return;
        }
        if (!busy) {
          ev.preventDefault();
          onAccept();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active, onCancel, onAccept, busy]);
}
