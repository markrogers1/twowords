import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  checkNotificationStatus
} from '../lib/notifications';
import '../styles/profile.css';

export function Profile() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [notificationStatus, setNotificationStatus] = useState<{
    supported: boolean;
    permission: NotificationPermission;
    subscribed: boolean;
  }>({ supported: false, permission: 'default', subscribed: false });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    const status = await checkNotificationStatus();
    setNotificationStatus(status);
  };

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        await subscribeToPushNotifications();
        await checkStatus();
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      alert('Failed to enable notifications. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setIsLoading(true);
    try {
      await unsubscribeFromPushNotifications();
      await checkStatus();
    } catch (error) {
      console.error('Error disabling notifications:', error);
      alert('Failed to disable notifications. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!profile) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <button className="back-btn" onClick={() => navigate('/chat')}>← Back to Chat</button>

        <div className="profile-header">
          <div className="profile-avatar-large">
            {profile.first_name[0]}{profile.last_name[0]}
          </div>
          <h1>{profile.first_name} {profile.last_name}</h1>
        </div>

        <div className="profile-words-display">
          <div className="words-label">Your Two Words</div>
          <div className="words-display">
            <span className="word-large">{profile.word_one}</span>
            <span className="separator-large">|</span>
            <span className="word-large">{profile.word_two}</span>
          </div>
          <div className="words-description">
            Share these words with people you want to connect with
          </div>
        </div>

        <div className="profile-details">
          <div className="detail-item">
            <div className="detail-label">Email</div>
            <div className="detail-value">{profile.email}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Country</div>
            <div className="detail-value">{profile.country}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Member Since</div>
            <div className="detail-value">
              {new Date(profile.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        {notificationStatus.supported && (
          <div className="profile-info-box">
            <h3>Notifications</h3>
            <div className="notification-settings">
              <p>
                {notificationStatus.subscribed
                  ? 'Notifications are enabled. You will receive alerts for new messages.'
                  : 'Enable notifications to get alerts when you receive messages, even when the app is closed.'}
              </p>
              {notificationStatus.permission === 'denied' && (
                <p className="notification-warning">
                  Notifications are blocked. Please enable them in your browser settings.
                </p>
              )}
              {notificationStatus.permission !== 'denied' && (
                <button
                  onClick={notificationStatus.subscribed ? handleDisableNotifications : handleEnableNotifications}
                  disabled={isLoading}
                  className="notification-btn"
                >
                  {isLoading ? 'Processing...' : notificationStatus.subscribed ? 'Disable Notifications' : 'Enable Notifications'}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="profile-info-box">
          <h3>How it works</h3>
          <ul>
            <li>Your two words are unique to you in your country</li>
            <li>Share them with people you want to connect with</li>
            <li>They can find you by searching your two words</li>
            <li>You accept their request to connect</li>
            <li>All messages are encrypted end-to-end</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
