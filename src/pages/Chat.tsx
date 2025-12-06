import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile, Message, Connection } from '../lib/supabase';
import { encryptMessage, decryptMessage, generateEncryptionKey } from '../lib/encryption';
import { playNotificationSound } from '../lib/notifications';
import { Onboarding } from '../components/Onboarding';
import '../styles/chat.css';

export function Chat() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [connections, setConnections] = useState<(Connection & { otherUser: Profile })[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showImagePermissionModal, setShowImagePermissionModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef<number>(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadConnections();
    checkOnboarding();
  }, [user, navigate]);

  const checkOnboarding = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .maybeSingle();

    if (!error && data && !data.onboarding_completed) {
      setShowOnboarding(true);
    }
  };

  useEffect(() => {
    if (selectedConnection) {
      loadMessages(selectedConnection);
      lastMessageCountRef.current = 0;

      const subscription = supabase
        .channel('messages')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `to_user_id=eq.${user?.id}`,
        }, () => {
          loadMessages(selectedConnection);

          if (lastMessageCountRef.current > 0) {
            playNotificationSound();

            if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
              const connection = connections.find(c => c.id === selectedConnection);
              if (connection) {
                new Notification('New message', {
                  body: `${connection.otherUser.first_name} sent you a message`,
                  icon: '/icon-192.png',
                });
              }
            }
          }
          lastMessageCountRef.current++;
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [selectedConnection, user?.id, connections]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConnections = async () => {
    if (!user) return;

    const { data: connectionsData, error } = await supabase
      .from('connections')
      .select('*')
      .or(`user_one_id.eq.${user.id},user_two_id.eq.${user.id}`)
      .eq('status', 'accepted');

    if (error) {
      console.error('Error loading connections:', error);
      return;
    }

    const connectionsWithProfiles = await Promise.all(
      (connectionsData || []).map(async (conn) => {
        const otherUserId = conn.user_one_id === user.id ? conn.user_two_id : conn.user_one_id;

        const { data: otherUser } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', otherUserId)
          .maybeSingle();

        return {
          ...conn,
          otherUser: otherUser!,
        };
      })
    );

    setConnections(connectionsWithProfiles);
    setLoading(false);
  };

  const loadMessages = async (connectionId: string) => {
    const connection = connections.find(c => c.id === connectionId);
    if (!connection || !user) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${connection.otherUser.id}),and(from_user_id.eq.${connection.otherUser.id},to_user_id.eq.${user.id})`)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data || []);
  };

  const handleGrantImagePermission = async () => {
    if (!selectedConnection || !user) return;

    const connection = connections.find(c => c.id === selectedConnection);
    if (!connection) return;

    const isUserOne = connection.user_one_id === user.id;
    const updateField = isUserOne ? 'user_one_allows_images' : 'user_two_allows_images';

    const { error } = await supabase
      .from('connections')
      .update({ [updateField]: true })
      .eq('id', selectedConnection);

    if (error) {
      console.error('Error granting image permission:', error);
      return;
    }

    setShowImagePermissionModal(false);
    loadConnections();
  };

  const canSendImages = (connection: Connection & { otherUser: Profile }) => {
    if (!user) return false;
    const isUserOne = connection.user_one_id === user.id;
    return isUserOne ? connection.user_two_allows_images : connection.user_one_allows_images;
  };

  const hasGrantedImagePermission = (connection: Connection & { otherUser: Profile }) => {
    if (!user) return false;
    const isUserOne = connection.user_one_id === user.id;
    return isUserOne ? connection.user_one_allows_images : connection.user_two_allows_images;
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConnection || !user || !profile) return;

    const connection = connections.find(c => c.id === selectedConnection);
    if (!connection) return;

    const encryptionKey = generateEncryptionKey(user.id, connection.otherUser.id);
    const encryptedContent = encryptMessage(newMessage, encryptionKey);

    const { error } = await supabase.from('messages').insert({
      from_user_id: user.id,
      to_user_id: connection.otherUser.id,
      encrypted_content: encryptedContent,
    });

    if (error) {
      console.error('Error sending message:', error);
      return;
    }

    const messagePreview = newMessage.length > 50 ? newMessage.substring(0, 50) + '...' : newMessage;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipientId: connection.otherUser.id,
            title: `${profile.first_name} ${profile.last_name}`,
            body: messagePreview,
            url: '/chat',
          }),
        });
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
    }

    setNewMessage('');
    loadMessages(selectedConnection);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleBackToList = () => {
    setSelectedConnection(null);
  };

  const selectedUser = connections.find(c => c.id === selectedConnection)?.otherUser;

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <>
      {showOnboarding && user && (
        <Onboarding
          userId={user.id}
          onComplete={() => setShowOnboarding(false)}
        />
      )}
      <div className="chat-container">
        <div className={`chat-sidebar ${isMobile && selectedConnection ? 'hidden' : ''}`}>
        <div className="sidebar-header">
          <div className="profile-section">
            <h2 className="sidebar-title">TWO | WORDS</h2>
            {profile && (
              <div className="user-words">
                <span className="user-word">{profile.word_one}</span>
                <span className="word-separator">|</span>
                <span className="user-word">{profile.word_two}</span>
              </div>
            )}
          </div>
          <div className="sidebar-actions">
            <button className="action-btn" onClick={() => navigate('/profile')}>Profile</button>
            <button className="action-btn" onClick={() => navigate('/connections')}>Add</button>
            <button className="action-btn logout-btn" onClick={handleSignOut}>Exit</button>
          </div>
        </div>

        <div className="connections-list">
          {connections.length === 0 ? (
            <div className="empty-state">
              <p>No connections yet</p>
              <button className="add-connection-btn" onClick={() => navigate('/connections')}>
                Add Connection
              </button>
            </div>
          ) : (
            connections.map((conn) => (
              <button
                key={conn.id}
                className={`connection-item ${selectedConnection === conn.id ? 'active' : ''}`}
                onClick={() => setSelectedConnection(conn.id)}
              >
                {conn.otherUser.profile_image_url ? (
                  <img
                    src={conn.otherUser.profile_image_url}
                    alt={`${conn.otherUser.first_name} ${conn.otherUser.last_name}`}
                    className="connection-avatar-image"
                  />
                ) : (
                  <div className="connection-avatar">
                    {conn.otherUser.first_name[0]}{conn.otherUser.last_name[0]}
                  </div>
                )}
                <div className="connection-info">
                  <div className="connection-name">
                    {conn.otherUser.first_name} {conn.otherUser.last_name}
                  </div>
                  <div className="connection-username">
                    {conn.otherUser.word_one} | {conn.otherUser.word_two}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#9CA3AF',
                    marginTop: '0.125rem'
                  }}>
                    {conn.tier === 'random' && '🎲 Just Met'}
                    {conn.tier === 'acquaintance' && '👋 Acquaintance'}
                    {conn.tier === 'friend' && '👤 Friend'}
                    {conn.tier === 'close_friend' && '⭐ Close Friend'}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="chat-main">
        {selectedConnection && selectedUser ? (
          <>
            <div className="chat-header">
              <button className="back-to-list-btn" onClick={handleBackToList}>←</button>
              <div
                className="chat-user-info"
                onClick={() => navigate(`/contact/${selectedUser.id}`)}
                style={{ cursor: 'pointer' }}
              >
                {selectedUser.profile_image_url ? (
                  <img
                    src={selectedUser.profile_image_url}
                    alt={`${selectedUser.first_name} ${selectedUser.last_name}`}
                    className="chat-avatar-image"
                  />
                ) : (
                  <div className="chat-avatar">
                    {selectedUser.first_name[0]}{selectedUser.last_name[0]}
                  </div>
                )}
                <div>
                  <div className="chat-user-name">
                    {selectedUser.first_name} {selectedUser.last_name}
                  </div>
                  <div className="chat-user-username">
                    {selectedUser.word_one} | {selectedUser.word_two}
                  </div>
                </div>
              </div>
            </div>

            <div className="messages-container">
              {messages.map((msg) => {
                const isOwn = msg.from_user_id === user?.id;
                const encryptionKey = generateEncryptionKey(
                  user?.id || '',
                  selectedUser.id
                );
                const decryptedContent = decryptMessage(msg.encrypted_content, encryptionKey);

                return (
                  <div key={msg.id} className={`message ${isOwn ? 'own' : 'other'}`}>
                    <div className="message-content">{decryptedContent}</div>
                    <div className="message-time">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {msg.expires_at && (
                        <span style={{ marginLeft: '0.5rem', opacity: 0.6 }}>
                          • Expires in {Math.round((new Date(msg.expires_at).getTime() - Date.now()) / (1000 * 60 * 60))}h
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {selectedConnection && (() => {
              const connection = connections.find(c => c.id === selectedConnection);
              if (!connection) return null;

              const userHasGranted = hasGrantedImagePermission(connection);
              const otherUserHasGranted = canSendImages(connection);

              return (
                <>
                  {(!userHasGranted || !otherUserHasGranted) && (
                    <div style={{
                      padding: '0.75rem',
                      background: '#FEF3C7',
                      borderTop: '1px solid #F59E0B',
                      fontSize: '0.85rem',
                      color: '#92400E',
                      textAlign: 'center'
                    }}>
                      {!userHasGranted && (
                        <div style={{ marginBottom: '0.5rem' }}>
                          <strong>{selectedUser?.first_name}</strong> cannot send you images yet.{' '}
                          <button
                            onClick={() => setShowImagePermissionModal(true)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#D97706',
                              textDecoration: 'underline',
                              cursor: 'pointer',
                              padding: 0,
                              font: 'inherit'
                            }}
                          >
                            Allow images
                          </button>
                        </div>
                      )}
                      {!otherUserHasGranted && (
                        <div>
                          <strong>{selectedUser?.first_name}</strong> hasn't granted you permission to send images yet.
                        </div>
                      )}
                    </div>
                  )}
                </>
              );
            })()}

            <form className="message-input-container" onSubmit={sendMessage}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="message-input"
              />
              <button type="submit" className="send-btn">Send</button>
            </form>
          </>
        ) : (
          <div className="empty-chat">
            <div className="empty-chat-content">
              <h3>Select a connection to start chatting</h3>
              <p>Your messages are encrypted end-to-end</p>
              <p style={{ fontSize: '0.9rem', color: '#6B7280', marginTop: '1rem' }}>
                All messages automatically delete after 24 hours
              </p>
            </div>
          </div>
        )}
      </div>

      {showImagePermissionModal && selectedUser && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowImagePermissionModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Allow Images from {selectedUser.first_name}?</h3>
            <div style={{
              background: '#FEF3C7',
              padding: '1rem',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem',
              fontSize: '0.9rem',
              color: '#92400E'
            }}>
              <strong>For your safety:</strong> Only allow images from people you trust. This permission lets {selectedUser.first_name} send you photos and images in this chat.
            </div>
            <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: '#4B5563' }}>
              By allowing images, you'll be able to see any photos or images that {selectedUser.first_name} sends you. You can revoke this permission at any time from their profile.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => setShowImagePermissionModal(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.5rem',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                Not Now
              </button>
              <button
                onClick={handleGrantImagePermission}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: 'none',
                  borderRadius: '0.5rem',
                  background: '#3B82F6',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}
              >
                Allow Images
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
