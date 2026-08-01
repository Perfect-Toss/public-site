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
import { useTagStore } from '../../stores/tagStore';

const DEFAULT_COLOR = '#3498db';

function TagFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    colorHex: DEFAULT_COLOR,
    isGlobal: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loadingEntity, setLoadingEntity] = useState(false);

  const { loadTagById, createTag, updateTag } = useTagStore();

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
              isGlobal: Boolean(tag.isGlobal),
            });
          }
        })
        .catch(() => {
          setResult({ type: 'error', message: 'Failed to load tag.' });
        })
        .finally(() => setLoadingEntity(false));
    }
  }, [id, loadTagById]);

  const handleSubmit = useCallback(async () => {
    if (!formData.name.trim()) return;

    setSubmitting(true);
    setResult(null);

    try {
      if (isEditing && id) {
        const dto: UpdateTagRequest = {
          name: formData.name.trim(),
          colorHex: formData.colorHex || null,
          isGlobal: formData.isGlobal,
        };
        await updateTag(id, dto);
        setResult({ type: 'success', message: 'Tag updated successfully!' });
      } else {
        const dto: CreateTagRequest = {
          name: formData.name.trim(),
          colorHex: formData.colorHex || null,
          isGlobal: formData.isGlobal,
        };
        await createTag(dto);
        setResult({ type: 'success', message: 'Tag created successfully!' });
      }

      setTimeout(() => {
        navigate('/admin/devices/tags');
      }, 1200);
    } catch (err) {
      setResult({ type: 'error', message: err instanceof Error ? err.message : 'An error occurred.' });
    } finally {
      setSubmitting(false);
    }
  }, [formData, isEditing, id, navigate, createTag, updateTag]);

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
          <button className="back-btn" onClick={() => navigate('/admin/devices/tags')}>
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Back</span>
          </button>
          <h2>{isEditing ? 'EDIT TAG' : 'ADD TAG'}</h2>
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
              placeholder="e.g. Forehand, Footwork, Topspin"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label>Color</label>
            <div className="tag-color-row">
              <input
                type="color"
                value={formData.colorHex}
                onChange={(e) => setFormData((prev) => ({ ...prev, colorHex: e.target.value }))}
              />
              <input
                type="text"
                placeholder="e.g. #3498db"
                value={formData.colorHex}
                onChange={(e) => setFormData((prev) => ({ ...prev, colorHex: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.isGlobal}
                onChange={(e) => setFormData((prev) => ({ ...prev, isGlobal: e.target.checked }))}
              />
              Global tag (visible to all users — requires admin)
            </label>
          </div>

          <div className="form-actions">
            <button className="cancel-btn" onClick={() => navigate('/admin/devices/tags')}>
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
