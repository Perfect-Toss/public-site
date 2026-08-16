import '../../styles/page.css';
import './AccountPage.css';

import {
  faBell,
  faCamera,
  faLock,
  faPalette,
  faUser
} from '@fortawesome/free-solid-svg-icons';
import { useRef, useState } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { StyledSelect } from '../common';
import { useAuth } from '../../contexts/useAuth';

function AccountPage() {
  const { currentUser, firebaseUser } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string>(firebaseUser?.photoURL || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getInitials = (email: string | null | undefined) => {
    if (!email) return '?';
    return email.charAt(0).toUpperCase();
  };

  return (
    <div className="account-page">
      <section className="section">
        <div className="section-header">
          <h2>Account Settings</h2>
        </div>

        <div className="account-content" style={{ marginTop: '30px' }}>
          {/* Profile Section */}
          <div className="settings-section" style={{ 
            background: 'white', 
            padding: '30px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid #e0e0e0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
              <FontAwesomeIcon icon={faUser} style={{ marginRight: '10px', color: '#cfff04' }} />
              <h3>Profile Information</h3>
            </div>
            <div style={{ marginLeft: '30px' }}>
              {/* Avatar Section */}
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '10px' }}>Profile Picture</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div 
                    onClick={handleAvatarClick}
                    style={{ 
                      position: 'relative',
                      width: '100px', 
                      height: '100px', 
                      borderRadius: '50%', 
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: '3px solid #e0e0e0',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#cfff04';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e0e0e0';
                    }}
                  >
                    {avatarUrl ? (
                      <img 
                        src={avatarUrl} 
                        alt="Profile" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : (
                      <div style={{ 
                        width: '100%', 
                        height: '100%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        backgroundColor: '#cfff04',
                        fontSize: '36px',
                        fontWeight: '700',
                        color: '#1a1f24'
                      }}>
                        {getInitials(currentUser?.email)}
                      </div>
                    )}
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'rgba(0, 0, 0, 0.6)',
                      color: 'white',
                      padding: '8px',
                      textAlign: 'center',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px'
                    }}>
                      <FontAwesomeIcon icon={faCamera} />
                      <span>Change</span>
                    </div>
                  </div>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <div>
                    <button 
                      className="secondary-btn" 
                      onClick={handleAvatarClick}
                      style={{ marginBottom: '8px', display: 'block' }}
                    >
                      Upload Photo
                    </button>
                    <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>
                      JPG, PNG or GIF. Max size 5MB.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Email</label>
                <p style={{ color: '#666' }}>{currentUser?.email || 'Not set'}</p>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Display Name</label>
                <p style={{ color: '#666' }}>{firebaseUser?.displayName || 'Not set'}</p>
              </div>
              <button className="secondary-btn">Edit Profile</button>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="settings-section" style={{ 
            background: 'white', 
            padding: '30px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid #e0e0e0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
              <FontAwesomeIcon icon={faBell} style={{ marginRight: '10px', color: '#cfff04' }} />
              <h3>Notifications</h3>
            </div>
            <div style={{ marginLeft: '30px' }}>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <input type="checkbox" defaultChecked style={{ marginRight: '10px' }} />
                <span>Email notifications</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <input type="checkbox" defaultChecked style={{ marginRight: '10px' }} />
                <span>Push notifications</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <input type="checkbox" style={{ marginRight: '10px' }} />
                <span>Weekly digest</span>
              </label>
            </div>
          </div>

          {/* Security Section */}
          <div className="settings-section" style={{ 
            background: 'white', 
            padding: '30px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid #e0e0e0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
              <FontAwesomeIcon icon={faLock} style={{ marginRight: '10px', color: '#cfff04' }} />
              <h3>Security</h3>
            </div>
            <div style={{ marginLeft: '30px' }}>
              <button className="secondary-btn" style={{ marginBottom: '10px' }}>Change Password</button>
              <br />
              <button className="secondary-btn">Enable Two-Factor Authentication</button>
            </div>
          </div>

          {/* Preferences Section */}
          <div className="settings-section" style={{ 
            background: 'white', 
            padding: '30px', 
            borderRadius: '8px', 
            border: '1px solid #e0e0e0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
              <FontAwesomeIcon icon={faPalette} style={{ marginRight: '10px', color: '#cfff04' }} />
              <h3>Preferences</h3>
            </div>
            <div style={{ marginLeft: '30px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Theme</label>
                <StyledSelect defaultValue="Light">
                  <option>Light</option>
                  <option>Dark</option>
                  <option>Auto</option>
                </StyledSelect>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AccountPage;
