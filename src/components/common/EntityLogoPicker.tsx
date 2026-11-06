import './EntityLogoPicker.css';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IMAGE_ACCEPT } from '../../utils/image';
import { faImage } from '@fortawesome/free-solid-svg-icons';
import { useRef } from 'react';

export interface EntityLogoPickerProps {
  /** Resolved logo URL, or null when the entity has none. */
  logoUrl?: string | null;
  /** Entity name, used for the preview's alt text. */
  name?: string | null;
  /** Preview size in pixels. Defaults to 88. */
  size?: number;
  /** Swaps the actions for a spinner while an upload or removal is running. */
  busy?: boolean;
  /** Hides the actions entirely, leaving just the preview. */
  readOnly?: boolean;
  /** Hands the chosen file to the owner, which validates and uploads it. */
  onFileSelected: (file: File) => void;
  /** Clears the logo. Only rendered when the entity has one. */
  onRemove?: () => void;
}

/**
 * Square preview of an entity's logo plus its upload/replace/remove actions.
 * The picker owns nothing but the hidden file input — the owner does the write.
 */
export function EntityLogoPicker({
  logoUrl,
  name,
  size = 88,
  busy = false,
  readOnly = false,
  onFileSelected,
  onRemove,
}: EntityLogoPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const label = name ? `${name} logo` : 'Logo';

  const openPicker = () => {
    if (!readOnly && !busy) fileInputRef.current?.click();
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Clear the input so picking the same file twice still fires a change.
    event.target.value = '';
    if (file) onFileSelected(file);
  };

  return (
    <div className="logo-picker">
      <div className="logo-picker-preview" style={{ width: size, height: size }}>
        {logoUrl ? (
          <img className="logo-picker-img" src={logoUrl} alt={`${label} preview`} />
        ) : (
          <FontAwesomeIcon icon={faImage} className="logo-picker-placeholder" />
        )}
        {busy && (
          <span className="logo-picker-busy">
            <span className="logo-picker-spinner" />
          </span>
        )}
      </div>

      {!readOnly && (
        <div className="logo-picker-actions">
          <div className="logo-picker-buttons">
            <button type="button" className="secondary-btn" onClick={openPicker} disabled={busy}>
              <FontAwesomeIcon icon={faImage} />
              {logoUrl ? 'Replace logo' : 'Upload logo'}
            </button>
            {logoUrl && onRemove && (
              <button
                type="button"
                className="logo-picker-remove"
                onClick={onRemove}
                disabled={busy}
              >
                Remove logo
              </button>
            )}
          </div>
          <span className="logo-picker-hint">Any image &middot; squared and trimmed, on white</span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="logo-picker-input"
        aria-label={`Choose a ${label.toLowerCase()}`}
        onChange={handleChange}
      />
    </div>
  );
}

export default EntityLogoPicker;
