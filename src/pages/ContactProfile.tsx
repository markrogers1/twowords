import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { DarkModeToggle } from '../components/DarkModeToggle';
import { supabase, Profile } from '../lib/supabase';
import '../styles/contact-profile.css';

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  category: 'personal' | 'business';
}

interface Connection {
  id: string;
  connection_type: 'friend' | 'business';
  tier: 'random' | 'acquaintance' | 'friend' | 'close_friend';
  user_one_id: string;
  user_two_id: string;
  user_one_allows_images: boolean;
  user_two_allows_images: boolean;
}

const PLATFORMS: Record<string, { name: string; color: string; textColor: string; icon: string }> = {
  instagram: { name: 'Instagram', color: '#E4405F', textColor: '#FFFFFF', icon: 'IG' },
  snapchat: { name: 'Snapchat', color: '#FFFC00', textColor: '#000000', icon: 'SC' },
  facebook: { name: 'Facebook', color: '#1877F2', textColor: '#FFFFFF', icon: 'f' },
  x: { name: 'X', color: '#000000', textColor: '#FFFFFF', icon: '𝕏' },
  tiktok: { name: 'TikTok', color: '#000000', textColor: '#FFFFFF', icon: 'TT' },
  whatsapp: { name: 'WhatsApp', color: '#25D366', textColor: '#FFFFFF', icon: 'WA' },
  linkedin: { name: 'LinkedIn', color: '#0A66C2', textColor: '#FFFFFF', icon: 'in' },
  github: { name: 'GitHub', color: '#181717', textColor: '#FFFFFF', icon: 'GH' },
  website: { name: 'Website', color: '#6B7280', textColor: '#FFFFFF', icon: '🌐' },
  email: { name: 'Email', color: '#EA4335', textColor: '#FFFFFF', icon: '✉️' },
};

export function ContactProfile() {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTier, setEditingTier] = useState(false);
  const [newTier, setNewTier] = useState<'random' | 'acquaintance' | 'friend' | 'close_friend'>('friend');

  useEffect(() => {
    if (!user || !userId) {
      navigate('/chat');
      return;
    }
    loadProfile();
  }, [user, userId, navigate]);

  const loadProfile = async () => {
    if (!user || !userId) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!profileData) {
      navigate('/chat');
      return;
    }

    setProfile(profileData);

    const { data: connectionData } = await supabase
      .from('connections')
      .select('id, connection_type, tier, user_one_id, user_two_id, user_one_allows_images, user_two_allows_images')
      .or(`and(user_one_id.eq.${user.id},user_two_id.eq.${userId}),and(user_one_id.eq.${userId},user_two_id.eq.${user.id})`)
      .eq('status', 'accepted')
      .maybeSingle();

    if (!connectionData) {
      setLoading(false);
      return;
    }

    setConnection(connectionData);

    const { data: visibleLinks } = await supabase
      .from('social_link_visibility')
      .select('social_link_id')
      .eq('connection_id', connectionData.id)
      .eq('is_visible', true);

    if (visibleLinks && visibleLinks.length > 0) {
      const linkIds = visibleLinks.map(v => v.social_link_id);

      const { data: linksData } = await supabase
        .from('social_links')
        .select('id, platform, url, category')
        .in('id', linkIds)
        .eq('user_id', userId);

      setSocialLinks(linksData || []);
    }

    setLoading(false);
  };

  const handleUpdateTier = async () => {
    if (!connection) return;

    const { error } = await supabase
      .from('connections')
      .update({ tier: newTier })
      .eq('id', connection.id);

    if (error) {
      console.error('Error updating tier:', error);
      return;
    }

    setConnection({ ...connection, tier: newTier });
    setEditingTier(false);
  };

  const handleToggleImagePermission = async () => {
    if (!connection || !user) return;

    const isUserOne = connection.user_one_id === user.id;
    const currentPermission = isUserOne ? connection.user_one_allows_images : connection.user_two_allows_images;
    const updateField = isUserOne ? 'user_one_allows_images' : 'user_two_allows_images';

    const { error } = await supabase
      .from('connections')
      .update({ [updateField]: !currentPermission })
      .eq('id', connection.id);

    if (error) {
      console.error('Error updating image permission:', error);
      return;
    }

    setConnection({
      ...connection,
      [updateField]: !currentPermission,
    });
  };

  const hasGrantedImagePermission = () => {
    if (!connection || !user) return false;
    const isUserOne = connection.user_one_id === user.id;
    return isUserOne ? connection.user_one_allows_images : connection.user_two_allows_images;
  };

  const otherUserHasGrantedPermission = () => {
    if (!connection || !user) return false;
    const isUserOne = connection.user_one_id === user.id;
    return isUserOne ? connection.user_two_allows_images : connection.user_one_allows_images;
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!profile) {
    return <div className="loading">Profile not found</div>;
  }

  const personalLinks = socialLinks.filter(l => l.category === 'personal');
  const businessLinks = socialLinks.filter(l => l.category === 'business');

  return (
    <div className="contact-profile-container">
      <div style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 10 }}>
        <DarkModeToggle />
      </div>
      <div className="contact-profile-header">
        <button className="back-btn" onClick={() => navigate('/chat')}>← Back to Chat</button>
        <h1>Contact Profile</h1>
      </div>

      <div className="contact-profile-content">
        <div className="profile-card">
          <div className="profile-avatar-section">
            {profile.profile_image_url ? (
              <img
                src={profile.profile_image_url}
                alt={`${profile.first_name} ${profile.last_name}`}
                className="profile-avatar-image"
              />
            ) : (
              <div className="profile-avatar">
                {profile.first_name[0]}{profile.last_name[0]}
              </div>
            )}
          </div>
          <h2>{profile.first_name} {profile.last_name}</h2>
          <div className="profile-words">
            <span>{profile.word_one}</span>
            <span className="separator">|</span>
            <span>{profile.word_two}</span>
          </div>
          <div className="profile-meta">
            <p>{profile.country}</p>
            {connection && (
              <>
                <span className="connection-type-badge">
                  {connection.connection_type === 'business' ? 'Business Contact' : 'Friend'}
                </span>
                <div style={{ marginTop: '1rem', padding: '1rem', background: '#F9FAFB', borderRadius: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Relationship Level:</label>
                    <button
                      onClick={() => {
                        setNewTier(connection.tier);
                        setEditingTier(!editingTier);
                      }}
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.25rem 0.5rem',
                        background: 'white',
                        border: '1px solid #D1D5DB',
                        borderRadius: '0.25rem',
                        cursor: 'pointer'
                      }}
                    >
                      {editingTier ? 'Cancel' : 'Change'}
                    </button>
                  </div>
                  {!editingTier ? (
                    <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                      {connection.tier === 'random' && '🎲 Just Met / Random'}
                      {connection.tier === 'acquaintance' && '👋 Acquaintance'}
                      {connection.tier === 'friend' && '👤 Friend'}
                      {connection.tier === 'close_friend' && '⭐ Close Friend'}
                    </div>
                  ) : (
                    <div>
                      <select
                        value={newTier}
                        onChange={(e) => setNewTier(e.target.value as any)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #D1D5DB',
                          borderRadius: '0.25rem',
                          fontSize: '0.875rem',
                          marginBottom: '0.5rem'
                        }}
                      >
                        <option value="random">Just Met / Random</option>
                        <option value="acquaintance">Acquaintance</option>
                        <option value="friend">Friend</option>
                        <option value="close_friend">Close Friend</option>
                      </select>
                      <button
                        onClick={handleUpdateTier}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          background: '#10B981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.25rem',
                          cursor: 'pointer',
                          fontWeight: '500',
                          fontSize: '0.875rem'
                        }}
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '1rem', padding: '1rem', background: '#F0F9FF', borderRadius: '0.5rem', border: '1px solid #BFDBFE' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1E40AF', display: 'block', marginBottom: '0.25rem' }}>
                        Image Permissions
                      </label>
                      <div style={{ fontSize: '0.75rem', color: '#3B82F6', marginBottom: '0.75rem' }}>
                        Control whether {profile.first_name} can send you images
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'white', borderRadius: '0.375rem' }}>
                    <div>
                      <div style={{ fontSize: '0.875rem', color: '#374151', fontWeight: '500' }}>
                        {hasGrantedImagePermission() ? '✓ Images Allowed' : '⊘ Images Blocked'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.125rem' }}>
                        {hasGrantedImagePermission()
                          ? `${profile.first_name} can send you images`
                          : `${profile.first_name} cannot send you images`
                        }
                      </div>
                    </div>
                    <button
                      onClick={handleToggleImagePermission}
                      style={{
                        padding: '0.5rem 1rem',
                        background: hasGrantedImagePermission() ? '#EF4444' : '#10B981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontWeight: '500',
                        fontSize: '0.875rem'
                      }}
                    >
                      {hasGrantedImagePermission() ? 'Revoke' : 'Allow'}
                    </button>
                  </div>
                  {!otherUserHasGrantedPermission() && (
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '0.5rem',
                      background: '#FEF3C7',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      color: '#92400E'
                    }}>
                      {profile.first_name} hasn't granted you permission to send images yet.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {socialLinks.length === 0 ? (
          <div className="no-links-card">
            <p>This contact hasn't shared any social links with you yet.</p>
          </div>
        ) : (
          <>
            {personalLinks.length > 0 && (
              <div className="social-links-section">
                <h3>Personal</h3>
                <div className="social-links-grid">
                  {personalLinks.map((link) => {
                    const platformInfo = PLATFORMS[link.platform] || { name: link.platform, color: '#6B7280', textColor: '#FFFFFF', icon: '🔗' };
                    return (
                      <a
                        key={link.id}
                        href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-link-btn"
                        style={{ backgroundColor: platformInfo.color, color: platformInfo.textColor }}
                        title={platformInfo.name}
                      >
                        <span className="social-icon">{platformInfo.icon}</span>
                        <span className="social-name">{platformInfo.name}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {businessLinks.length > 0 && (
              <div className="social-links-section">
                <h3>Business</h3>
                <div className="social-links-grid">
                  {businessLinks.map((link) => {
                    const platformInfo = PLATFORMS[link.platform] || { name: link.platform, color: '#6B7280', textColor: '#FFFFFF', icon: '🔗' };
                    return (
                      <a
                        key={link.id}
                        href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-link-btn"
                        style={{ backgroundColor: platformInfo.color, color: platformInfo.textColor }}
                        title={platformInfo.name}
                      >
                        <span className="social-icon">{platformInfo.icon}</span>
                        <span className="social-name">{platformInfo.name}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
