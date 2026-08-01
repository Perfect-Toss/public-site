import '../../styles/page.css';
import '../../styles/admin-form.css';
import './AdminTagsPage.css';

import type { CreateTagRequest, UpdateTagRequest } from '../../api/api.tags';
import {
  faArrowLeft,
  faCheck,
  faSpinner,
  faTags,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { HexColorPicker } from 'react-colorful';
import { colorFor } from '../../utils/color';
import { useTagStore } from '../../stores/tagStore';

const DEFAULT_COLOR = '#3498db';

function TagFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    colorHex: DEFAULT_COLOR,
  });
  // Whether the color was explicitly picked by the user. When false, the color
  // auto-derives from the name as the user types.
  const [colorManual, setColorManual] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loadingEntity, setLoadingEntity] = useState(false);

  const { loadTags, loadTagById, createTag, updateTag } = useTagStore();

  // Load tag data for editing
  useEffect(() => {
    if (id) {
      setLoadingEntity(true);
      loadTagById(id)
        .then((tag) => {
          if (tag) {
            setFormData({
              name: tag.name ?? '',
              colorHex: tag.colorHex ?? DEFAULT_COLOR,
            });
            // Treat the tag's saved color as intentional so editing the name
            // doesn't silently override it.
            setColorManual(true);
          }
        })
        .catch(() => {
          setResult({ type: 'error', message: 'Failed to load tag.' });
        })
        .finally(() => setLoadingEntity(false));
    }
  }, [id, loadTagById]);

  const handleSubmit = useCallback(async () => {
    const name = formData.name.trim();
    if (!name) return;

    // Frontend guard: don't create/rename to a tag name that already exists.
    // Read fresh store state after any load so the check isn't stale.
    if (useTagStore.getState().tags.length === 0) {
      await loadTags();
    }
    const currentTags = useTagStore.getState().tags;
    const isDuplicate = currentTags.some(
      (t) => t.name?.trim().toLowerCase() === name.toLowerCase() && t.id !== id
    );
    if (isDuplicate) {
      setResult({ type: 'error', message: `A tag named "${name}" already exists.` });
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      if (isEditing && id) {
        const dto: UpdateTagRequest = {
          name,
          colorHex: formData.colorHex || null,
          isGlobal: true,
        };
        await updateTag(id, dto);
        setResult({ type: 'success', message: 'Tag updated successfully!' });
      } else {
        const dto: CreateTagRequest = {
          name,
          colorHex: formData.colorHex || null,
          isGlobal: true,
        };
        await createTag(dto);
        setResult({ type: 'success', message: 'Tag created successfully!' });
      }

      setTimeout(() => {
        navigate('/admin/reference/tags');
      }, 1200);
    } catch (err) {
      setResult({ type: 'error', message: err instanceof Error ? err.message : 'An error occurred.' });
    } finally {
      setSubmitting(false);
    }
  }, [formData, isEditing, id, navigate, loadTags, createTag, updateTag]);

  if (loadingEntity) {
    return (
      <div className="admin-tags-page admin-form-page">
        <section className="section">
          <div className="loading-container" style={{ minHeight: 200 }}>
            <FontAwesomeIcon icon={faSpinner} spin size="2x" />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="admin-tags-page admin-form-page">
      <section className="section">
        <div className="section-header">
          <button className="back-btn" onClick={() => navigate('/admin/reference/tags')}>
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Back</span>
          </button>
          <h2>{isEditing ? 'Edit Tag' : 'Add Tag'}</h2>
          <div />
        </div>

        {result && (
          <div className={`import-result ${result.type}`} style={{ marginBottom: 20 }}>
            <FontAwesomeIcon
              icon={result.type === 'success' ? faCheck : faTimes}
              style={{ marginRight: 8 }}
            />
            {result.message}
          </div>
        )}

        <div className="admin-form-card">
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              autoFocus
              placeholder="e.g. Forehand, Footwork, Topspin"
              value={formData.name}
              onChange={(e) => {
                const name = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  name,
                  // Auto-pick a color from the name until the user picks one manually
                  colorHex: colorManual
                    ? prev.colorHex
                    : name.trim()
                      ? colorFor(name, { forceDark: true })
                      : prev.colorHex,
                }));
              }}
            />
          </div>

          <div className="form-group">
            <label>Color</label>
            <div className="tag-picker">
              <div className="tag-picker-preview">
                <span className="tag-swatch" style={{ background: formData.colorHex }} />
                <span className="tag-color-value">{formData.colorHex?.toUpperCase()}</span>
              </div>
              <HexColorPicker
                color={formData.colorHex}
                onChange={(color) => {
                  setColorManual(true);
                  setFormData((prev) => ({ ...prev, colorHex: color }));
                }}
              />
            </div>
          </div>

          <div className="form-actions">
            <button className="cancel-btn" onClick={() => navigate('/admin/reference/tags')}>
              Cancel
            </button>
            <button
              className="submit-btn"
              onClick={handleSubmit}
              disabled={submitting || !formData.name.trim()}
            >
              {submitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 8 }} />
                  Saving...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faTags} style={{ marginRight: 6 }} />
                  {isEditing ? 'Update Tag' : 'Create Tag'}
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default TagFormPage;
