import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVideo, faSearch } from '@fortawesome/free-solid-svg-icons';
import { useState } from 'react';

function VideosView() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="videos-view">
      <section className="section">
        <div className="section-header">
          <h2>VIDEOS</h2>
          <div className="header-actions">
            <div className="search-box">
              <FontAwesomeIcon icon={faSearch} className="search-icon" />
              <input
                type="text"
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
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
