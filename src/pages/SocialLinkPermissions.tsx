import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile } from '../lib/supabase';
import '../styles/social-link-permissions.css';

interface Connection {
  id: string;
  user_one_id: string;
  user_two_id: string;
  connection_type: 'friend' | 'business';
  status: string;
  otherProfile?: Profile;
}

interface Visibility {
  id?: string;
  connection_id: string;
  is_visible: boolean;
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

export function SocialLinkPermissions() {
  const navigate = useNavigate();
  const { linkId } = useParams<{ linkId: string }>();
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [visibilities, setVisibilities] = useState<Record<string, Visibility>>({});
  const [linkInfo, setLinkInfo] = useState<{ platform: string; url: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !linkId) {
      navigate('/social-links');
      return;
    }
    loadData();
  }, [user, linkId, navigate]);

  const loadData = async () => {
    if (!user || !linkId) return;

    const { data: link } = await supabase
      .from('social_links')
      .select('platform, url')
      .eq('id', linkId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!link) {
      navigate('/social-links');
      return;
    }

    setLinkInfo(link);

    const { data: connectionsData } = await supabase
      .from('connections')
      .select('*')
      .or(`user_one_id.eq.${user.id},user_two_id.eq.${user.id}`)
      .eq('status', 'accepted');

    if (connectionsData) {
      const connectionsWithProfiles = await Promise.all(
        connectionsData.map(async (conn) => {
          const otherUserId = conn.user_one_id === user.id ? conn.user_two_id : conn.user_one_id;

          const { data: otherProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', otherUserId)
            .maybeSingle();

          return {
            ...conn,
            otherProfile: otherProfile!,
          };
        })
      );

      setConnections(connectionsWithProfiles);
    }

    const { data: visibilityData } = await supabase
      .from('social_link_visibility')
      .select('*')
      .eq('social_link_id', linkId);

    const visibilityMap: Record<string, Visibility> = {};
    (visibilityData || []).forEach((v) => {
      visibilityMap[v.connection_id] = v;
    });
    setVisibilities(visibilityMap);
  };

  const handleToggleVisibility = async (connectionId: string, currentlyVisible: boolean) => {
    if (!linkId || !user) return;

    const message = currentlyVisible
      ? 'Are you sure you want to hide this link from this contact?'
      : 'Are you sure you want to show this link to this contact? They will be able to see your profile URL.';

    if (!confirm(message)) return;

    setLoading(true);

    const visibility = visibilities[connectionId];

    if (visibility?.id) {
      const { error } = await supabase
        .from('social_link_visibility')
        .update({ is_visible: !currentlyVisible })
        .eq('id', visibility.id);

      if (error) {
        console.error('Error updating visibility:', error);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from('social_link_visibility')
        .insert({
          social_link_id: linkId,
          connection_id: connectionId,
          is_visible: !currentlyVisible,
          user_id: user.id,
        });

      if (error) {
        console.error('Error inserting visibility:', error);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    await loadData();
  };

  if (!linkInfo) {
    return <div className="loading">Loading...</div>;
  }

  const platformInfo = PLATFORMS[linkInfo.platform] || { name: linkInfo.platform, color: '#6B7280', textColor: '#FFFFFF', icon: '🔗' };

  return (
    <div className="permissions-container">
      <div className="permissions-header">
        <button className="back-btn" onClick={() => navigate('/social-links')}>← Back to Social Links</button>
        <h1>Manage Visibility</h1>
      </div>

      <div className="permissions-content">
        <div className="link-info-card">
          <div
            className="platform-icon-large"
            style={{ backgroundColor: platformInfo.color, color: platformInfo.textColor }}
          >
            {platformInfo.icon}
          </div>
          <div>
            <h2>{platformInfo.name}</h2>
            <a
              href={linkInfo.url.startsWith('http') ? linkInfo.url : `https://${linkInfo.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="link-url"
            >
              {linkInfo.url}
            </a>
          </div>
        </div>

        <div className="permissions-intro">
          <p>Control who can see this link. By default, all links are hidden. Enable visibility for specific contacts below.</p>
        </div>

        {connections.length === 0 ? (
          <div className="no-connections">
            <p>You don't have any connections yet. Once you connect with people, you can control who sees this link.</p>
          </div>
        ) : (
          <div className="connections-list">
            <h3>Your Connections</h3>
            {connections.map((conn) => {
              const isVisible = visibilities[conn.id]?.is_visible || false;
              return (
                <div key={conn.id} className="connection-item">
                  {conn.otherProfile?.profile_image_url ? (
                    <img
                      src={conn.otherProfile.profile_image_url}
                      alt={`${conn.otherProfile.first_name} ${conn.otherProfile.last_name}`}
                      className="connection-avatar-image"
                    />
                  ) : (
                    <div className="connection-avatar">
                      {conn.otherProfile?.first_name[0]}{conn.otherProfile?.last_name[0]}
                    </div>
                  )}
                  <div className="connection-info">
                    <h4>{conn.otherProfile?.first_name} {conn.otherProfile?.last_name}</h4>
                    <p>{conn.otherProfile?.word_one} | {conn.otherProfile?.word_two}</p>
                    <span className="connection-type-badge">
                      {conn.connection_type === 'business' ? 'Business' : 'Friend'}
                    </span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={() => handleToggleVisibility(conn.id, isVisible)}
                      disabled={loading}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <span className="visibility-label">
                    {isVisible ? 'Visible' : 'Hidden'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
