import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import '../styles/social-links.css';

interface SocialLink {
  id: string;
  user_id: string;
  platform: string;
  url: string;
  category: 'personal' | 'business';
  created_at: string;
}

interface PlatformInfo {
  name: string;
  color: string;
  icon: string;
  placeholder: string;
  category: 'personal' | 'business';
}

const PLATFORMS: Record<string, PlatformInfo> = {
  instagram: { name: 'Instagram', color: '#E4405F', icon: '📷', placeholder: 'instagram.com/yourhandle', category: 'personal' },
  snapchat: { name: 'Snapchat', color: '#FFFC00', icon: '👻', placeholder: 'snapchat.com/add/yourname', category: 'personal' },
  facebook: { name: 'Facebook', color: '#1877F2', icon: '👤', placeholder: 'facebook.com/yourprofile', category: 'personal' },
  twitter: { name: 'Twitter/X', color: '#000000', icon: '🐦', placeholder: 'twitter.com/yourhandle', category: 'personal' },
  tiktok: { name: 'TikTok', color: '#000000', icon: '🎵', placeholder: 'tiktok.com/@yourhandle', category: 'personal' },
  whatsapp: { name: 'WhatsApp', color: '#25D366', icon: '💬', placeholder: 'wa.me/yourphonenumber', category: 'personal' },
  linkedin: { name: 'LinkedIn', color: '#0A66C2', icon: '💼', placeholder: 'linkedin.com/in/yourprofile', category: 'business' },
  github: { name: 'GitHub', color: '#181717', icon: '💻', placeholder: 'github.com/yourusername', category: 'business' },
  website: { name: 'Website', color: '#6B7280', icon: '🌐', placeholder: 'yourwebsite.com', category: 'business' },
  email: { name: 'Email', color: '#EA4335', icon: '✉️', placeholder: 'your.email@example.com', category: 'business' },
};

export function SocialLinks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('instagram');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadLinks();
  }, [user, navigate]);

  const loadLinks = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('social_links')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading links:', error);
      return;
    }

    setLinks(data || []);
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !url.trim()) return;

    setLoading(true);
    setError('');

    const platformInfo = PLATFORMS[selectedPlatform];

    const { error: insertError } = await supabase
      .from('social_links')
      .insert({
        user_id: user.id,
        platform: selectedPlatform,
        url: url.trim(),
        category: platformInfo.category,
      });

    if (insertError) {
      setError('Failed to add link');
      console.error(insertError);
      setLoading(false);
      return;
    }

    setUrl('');
    setShowAddForm(false);
    setLoading(false);
    await loadLinks();
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this link?')) return;

    await supabase.from('social_link_visibility').delete().eq('social_link_id', linkId);

    const { error } = await supabase
      .from('social_links')
      .delete()
      .eq('id', linkId);

    if (error) {
      console.error('Error deleting link:', error);
      return;
    }

    await loadLinks();
  };

  const personalLinks = links.filter(l => PLATFORMS[l.platform]?.category === 'personal');
  const businessLinks = links.filter(l => PLATFORMS[l.platform]?.category === 'business');

  return (
    <div className="social-links-container">
      <div className="social-links-header">
        <button className="back-btn" onClick={() => navigate('/profile')}>← Back to Profile</button>
        <h1>Social Links</h1>
      </div>

      <div className="social-links-content">
        <div className="social-links-intro">
          <p>Add your social media links and control who can see them. You can show different links to friends vs business contacts.</p>
        </div>

        <div className="links-section">
          <div className="section-header">
            <h2>Personal Links</h2>
            <button
              className="add-link-btn"
              onClick={() => {
                setSelectedPlatform('instagram');
                setShowAddForm(true);
              }}
            >
              + Add Link
            </button>
          </div>

          {personalLinks.length === 0 && (
            <p className="no-links-message">No personal links added yet</p>
          )}

          <div className="links-grid">
            {personalLinks.map((link) => {
              const platformInfo = PLATFORMS[link.platform];
              return (
                <div key={link.id} className="link-card">
                  <div
                    className="platform-icon"
                    style={{ backgroundColor: platformInfo.color }}
                  >
                    {platformInfo.icon}
                  </div>
                  <div className="link-info">
                    <h3>{platformInfo.name}</h3>
                    <a
                      href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-url"
                    >
                      {link.url}
                    </a>
                  </div>
                  <div className="link-actions">
                    <button
                      className="manage-btn"
                      onClick={() => navigate(`/social-links/${link.id}/permissions`)}
                    >
                      Manage Visibility
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteLink(link.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="links-section">
          <h2>Business Links</h2>

          {businessLinks.length === 0 && (
            <p className="no-links-message">No business links added yet</p>
          )}

          <div className="links-grid">
            {businessLinks.map((link) => {
              const platformInfo = PLATFORMS[link.platform];
              return (
                <div key={link.id} className="link-card">
                  <div
                    className="platform-icon"
                    style={{ backgroundColor: platformInfo.color }}
                  >
                    {platformInfo.icon}
                  </div>
                  <div className="link-info">
                    <h3>{platformInfo.name}</h3>
                    <a
                      href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-url"
                    >
                      {link.url}
                    </a>
                  </div>
                  <div className="link-actions">
                    <button
                      className="manage-btn"
                      onClick={() => navigate(`/social-links/${link.id}/permissions`)}
                    >
                      Manage Visibility
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteLink(link.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add Social Link</h2>
            <form onSubmit={handleAddLink}>
              <div className="form-group">
                <label>Platform</label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="platform-select"
                >
                  <optgroup label="Personal">
                    {Object.entries(PLATFORMS)
                      .filter(([_, info]) => info.category === 'personal')
                      .map(([key, info]) => (
                        <option key={key} value={key}>
                          {info.icon} {info.name}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Business">
                    {Object.entries(PLATFORMS)
                      .filter(([_, info]) => info.category === 'business')
                      .map(([key, info]) => (
                        <option key={key} value={key}>
                          {info.icon} {info.name}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              <div className="form-group">
                <label>URL</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={PLATFORMS[selectedPlatform].placeholder}
                  className="url-input"
                  required
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
