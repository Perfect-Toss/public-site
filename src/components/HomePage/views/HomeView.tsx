import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faCircle } from '@fortawesome/free-solid-svg-icons';
import type { Entity } from '../../../api/api';

export interface PendingReview {
  id: string;
  club: string;
  date: string;
  clinic: string;
  instructor: string;
  duration: string;
  status: string;
}

export interface TrendingContent {
  id: string;
  title: string;
}

interface HomeViewProps {
  organizations: Entity[];
  pendingReviews: PendingReview[];
  trendingContent: TrendingContent[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function HomeView({ organizations, pendingReviews, trendingContent, loading, error, onRetry }: HomeViewProps) {
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
          <button onClick={onRetry} className="retry-button">Retry</button>
        </div>
      )}

      {/* Content - only show when not loading and no error */}
      {!loading && !error && (
        <>
          {/* Organizations Section */}
          <section className="section">
            <div className="section-header">
              <h2>ORGANIZATIONS</h2>
              <button className="view-all-btn">VIEW ALL</button>
            </div>

            <div className="organizations-grid">
              {organizations.length > 0 ? (
                organizations.map(org => (
                  <div key={org.id} className="organization-card">
                    <div className="org-logo">
                      <FontAwesomeIcon icon={faCircle} />
                    </div>
                    <h3 className="org-name">{org.name}</h3>
                    {org.description && <p className="org-description">{org.description}</p>}
                  </div>
                ))
              ) : (
                <p className="empty-state">No organizations found</p>
              )}
            </div>
          </section>

          {/* Pending Review Section */}
          <section className="section">
            <div className="section-header">
              <h2>PENDING REVIEW</h2>
              <button className="view-all-btn">VIEW ALL</button>
            </div>

            <div className="reviews-list">
              {pendingReviews.length > 0 ? (
                pendingReviews.map(review => (
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
                ))
              ) : (
                <p className="empty-state">No pending reviews</p>
              )}
            </div>
          </section>

          {/* Trending Content Section */}
          <section className="section">
            <div className="section-header">
              <h2>TRENDING CONTENT</h2>
            </div>
            <div className="trending-placeholder">
              {trendingContent.length > 0 ? (
                <div className="trending-list">
                  <p>Trending content coming soon</p>
                </div>
              ) : (
                <p>No trending content available</p>
              )}
            </div>
          </section>
        </>
      )}
    </>
  );
}

export default HomeView;
