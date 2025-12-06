import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
}

const PLATFORMS: Record<string, { name: string; color: string; icon: string }> = {
  instagram: { name: 'Instagram', color: '#E4405F', icon: '📷' },
  snapchat: { name: 'Snapchat', color: '#FFFC00', icon: '👻' },
  facebook: { name: 'Facebook', color: '#1877F2', icon: '👤' },
  twitter: { name: 'Twitter/X', color: '#000000', icon: '🐦' },
  tiktok: { name: 'TikTok', color: '#000000', icon: '🎵' },
  whatsapp: { name: 'WhatsApp', color: '#25D366', icon: '💬' },
  linkedin: { name: 'LinkedIn', color: '#0A66C2', icon: '💼' },
  github: { name: 'GitHub', color: '#181717', icon: '💻' },
  website: { name: 'Website', color: '#6B7280', icon: '🌐' },
  email: { name: 'Email', color: '#EA4335', icon: '✉️' },
};

export function ContactProfile() {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(true);

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
      .select('id, connection_type')
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
              <span className="connection-type-badge">
                {connection.connection_type === 'business' ? 'Business Contact' : 'Friend'}
              </span>
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
                    const platformInfo = PLATFORMS[link.platform];
                    return (
                      <a
                        key={link.id}
                        href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-link-btn"
                        style={{ backgroundColor: platformInfo.color }}
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
                    const platformInfo = PLATFORMS[link.platform];
                    return (
                      <a
                        key={link.id}
                        href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-link-btn"
                        style={{ backgroundColor: platformInfo.color }}
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
