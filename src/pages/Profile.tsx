import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  checkNotificationStatus
} from '../lib/notifications';
import '../styles/profile.css';

export function Profile() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const [notificationStatus, setNotificationStatus] = useState<{
    supported: boolean;
    permission: NotificationPermission;
    subscribed: boolean;
  }>({ supported: false, permission: 'default', subscribed: false });
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/avatar.${fileExt}`;

      if (profile.profile_image_url) {
        const oldPath = profile.profile_image_url.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('avatars').remove([`${profile.id}/${oldPath}`]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_image_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setImagePreview(publicUrl);
      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
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
          <div className="profile-avatar-container">
            {(imagePreview || profile.profile_image_url) ? (
              <img
                src={imagePreview || profile.profile_image_url}
                alt="Profile"
                className="profile-avatar-image"
              />
            ) : (
              <div className="profile-avatar-large">
                {profile.first_name[0]}{profile.last_name[0]}
              </div>
            )}
            <label className="avatar-upload-label" htmlFor="avatar-upload">
              {uploading ? 'Uploading...' : '📷'}
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
              className="avatar-upload-input"
            />
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

        <div className="profile-info-box">
          <h3>Notifications</h3>
          <div className="notification-settings">
            {!notificationStatus.supported ? (
              <div>
                <p className="notification-warning">
                  Push notifications are not available on this device.
                </p>
                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  iOS devices do not support push notifications in any browser due to Apple restrictions. Please use an Android device or desktop computer to receive message notifications.
                </p>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>

        <div className="profile-info-box">
          <h3>Social Links</h3>
          <p>Manage your social media links and control who can see them.</p>
          <button
            className="social-links-btn"
            onClick={() => navigate('/social-links')}
          >
            Manage Social Links
          </button>
        </div>

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
