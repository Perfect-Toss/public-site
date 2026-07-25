import '../../styles/page.css';
import '../../styles/admin-form.css';
import './AdminTabletTypesPage.css';

import type { CreateTabletTypeRequest, UpdateTabletTypeRequest } from '../../api/api.tabletTypes';
import {
  faArrowLeft,
  faCheck,
  faSpinner,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTabletStore } from '../../stores/tabletStore';

function TabletTypeFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    model: '',
    size: '',
    memory: '',
    camera: '',
    price: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loadingEntity, setLoadingEntity] = useState(false);

  const { loadTabletTypeById, createTabletType, updateTabletType } = useTabletStore();

  // Load tablet type data for editing
  useEffect(() => {
    if (id) {
      setLoadingEntity(true);
      loadTabletTypeById(id)
        .then((type) => {
          if (type) {
            setFormData({
              model: type.model ?? '',
              size: type.size ?? '',
              memory: type.memory ?? '',
              camera: type.camera ?? '',
              price: type.price != null ? String(type.price) : '',
            });
          }
        })
        .catch(() => {
          setResult({ type: 'error', message: 'Failed to load tablet type.' });
        })
        .finally(() => setLoadingEntity(false));
    }
  }, [id, loadTabletTypeById]);

  const handleSubmit = useCallback(async () => {
    if (!formData.model.trim()) return;

    setSubmitting(true);
    setResult(null);

    try {
      const priceValue = formData.price ? parseFloat(formData.price) : undefined;

      if (isEditing && id) {
        const dto: UpdateTabletTypeRequest = {
          model: formData.model.trim() || undefined,
          size: formData.size.trim() || undefined,
          memory: formData.memory.trim() || undefined,
          camera: formData.camera.trim() || undefined,
          price: !isNaN(priceValue!) ? priceValue : undefined,
        };
        await updateTabletType(id, dto);
        setResult({ type: 'success', message: 'Tablet type updated successfully!' });
      } else {
        const dto: CreateTabletTypeRequest = {
          model: formData.model.trim() || undefined,
          size: formData.size.trim() || undefined,
          memory: formData.memory.trim() || undefined,
          camera: formData.camera.trim() || undefined,
          price: !isNaN(priceValue!) ? priceValue : undefined,
        };
        await createTabletType(dto);
        setResult({ type: 'success', message: 'Tablet type created successfully!' });
      }

      setTimeout(() => {
        navigate('/admin/devices/tablet-types');
      }, 1200);
    } catch (err) {
      setResult({ type: 'error', message: err instanceof Error ? err.message : 'An error occurred.' });
    } finally {
      setSubmitting(false);
    }
  }, [formData, isEditing, id, navigate, createTabletType, updateTabletType]);

  if (loadingEntity) {
    return (
    <div className="admin-tablet-types-page admin-form-page">
        <section className="section">
          <div className="loading-container" style={{ minHeight: 200 }}>
            <FontAwesomeIcon icon={faSpinner} spin size="2x" />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="admin-tablet-types-page admin-form-page">
      <section className="section">
        <div className="section-header">
          <button className="back-btn" onClick={() => navigate('/admin/devices/tablet-types')}>
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Back</span>
          </button>
          <h2>{isEditing ? 'EDIT TABLET TYPE' : 'ADD TABLET TYPE'}</h2>
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
            <label>Model *</label>
            <input
              type="text"
              placeholder="e.g. iPad Pro 12.9"
              value={formData.model}
              onChange={(e) => setFormData((prev) => ({ ...prev, model: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label>Size</label>
            <input
              type="text"
              placeholder="e.g. 12.9 inches"
              value={formData.size}
              onChange={(e) => setFormData((prev) => ({ ...prev, size: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label>Memory</label>
            <input
              type="text"
              placeholder="e.g. 256GB"
              value={formData.memory}
              onChange={(e) => setFormData((prev) => ({ ...prev, memory: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label>Camera</label>
            <input
              type="text"
              placeholder="e.g. 12MP Wide"
              value={formData.camera}
              onChange={(e) => setFormData((prev) => ({ ...prev, camera: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label>Price ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 799.99"
              value={formData.price}
              onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
            />
          </div>

          <div className="form-actions">
            <button className="cancel-btn" onClick={() => navigate('/admin/devices/tablet-types')}>
              Cancel
            </button>
            <button
              className="submit-btn"
              onClick={handleSubmit}
              disabled={submitting || !formData.model.trim()}
            >
              {submitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 8 }} />
                  Saving...
                </>
              ) : (
                <>
                  {isEditing ? 'Update Tablet Type' : 'Create Tablet Type'}
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default TabletTypeFormPage;
