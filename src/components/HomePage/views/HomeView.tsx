import '../../../styles/page.css';

import { faBuilding, faPlay } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useMemo, useState } from 'react';

import DrillsSection from './DrillsSection';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { OrganizationCard } from '../../common';
import { useEntityStore } from '../../../stores/entityStore';

export interface PendingReview {
  id: string;
  club: string;
  date: string;
  clinic: string;
  instructor: string;
  duration: string;
  status: string;
}

function HomeView() {
  const [pendingReviews] = useState<PendingReview[]>([]);

  const { entityMap, loading: storeLoading, error: storeError, loadEntities } = useEntityStore();
  const organizations = useMemo(() => entityMap['root'] ?? [], [entityMap]);

  // Entities the store already holds stay on screen while it refreshes them, so
  // returning to this page does not show the loading state again.
  const loading = storeLoading && organizations.length === 0;
  const error = organizations.length === 0 ? storeError : null;

  useEffect(() => {
    loadEntities();
  }, [loadEntities]);
  return (
    <>
      {/* Loading State */}
      {loading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your data...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="error-container">
          <p>{error}</p>
          <button onClick={() => loadEntities()} className="retry-button">Retry</button>
        </div>
      )}

      {/* Content - only show when not loading and no error */}
      {!loading && !error && (
        <>
          {/* Organizations Section */}
          <section className="section">
            <div className="organizations-scroll">
              {organizations.length > 0 ? (
                organizations.map(org => (
                  <OrganizationCard key={org.id} organization={org} />
                ))
              ) : (
                <div className="empty-state-large">
                  <FontAwesomeIcon icon={faBuilding} size="3x" style={{ opacity: 0.3 }} />
                  <h3>No organizations yet</h3>
                  <p>Create or join an organization to get started</p>
                </div>
              )}
            </div>
          </section>

          {/* Pending Review Section — hidden when there is nothing to review */}
          {pendingReviews.length > 0 && (
            <section className="section">
              <div className="section-header">
                <h2>Pending Review</h2>
                <button className="view-all-btn">VIEW ALL</button>
              </div>

              <div className="reviews-list">
                {pendingReviews.map(review => (
                  <div key={review.id} className="review-card">
                    <div className="review-thumbnail">
                      <div className="play-button">
                        <FontAwesomeIcon icon={faPlay} />
                      </div>
                      <span className="duration">{review.duration}</span>
                    </div>

                    <div className="review-details">
                      <div className="review-header">
                        <h3 className="review-club">{review.club}</h3>
                        <span className="review-date">{review.date}</span>
                      </div>
                      <p className="review-clinic">{review.clinic}</p>
                      <p className="review-instructor">{review.instructor}</p>
                    </div>

                    <div className="review-status">
                      <span>{review.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Drills — public YouTube videos */}
          <DrillsSection />
        </>
      )}
    </>
  );
}

export default HomeView;
