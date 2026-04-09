import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVideo, faFilter } from '@fortawesome/free-solid-svg-icons';

function VideosView() {
  return (
    <div className="videos-view">
      <section className="section">
        <div className="section-header">
          <h2>MY VIDEOS</h2>
          <div className="header-actions">
            <button className="filter-btn">
              <FontAwesomeIcon icon={faFilter} />
              <span>Filter</span>
            </button>
          </div>
        </div>

        <div className="videos-grid">
          {/* Placeholder for video content */}
          <div className="empty-state-large">
            <FontAwesomeIcon icon={faVideo} size="3x" style={{ opacity: 0.3 }} />
            <h3>No videos yet</h3>
            <p>Your video library will appear here once you start uploading content</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default VideosView;
