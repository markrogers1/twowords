import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile, Message, Connection } from '../lib/supabase';
import { encryptMessage, decryptMessage, generateEncryptionKey } from '../lib/encryption';
import '../styles/chat.css';

export function Chat() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [connections, setConnections] = useState<(Connection & { otherUser: Profile })[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [messages, setMessages] = useState<(Message & { from_profile?: Profile })[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadConnections();
  }, [user, navigate]);

  useEffect(() => {
    if (selectedConnection) {
      loadMessages(selectedConnection);
      const subscription = supabase
        .channel('messages')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `to_user_id=eq.${user?.id}`,
        }, () => {
          loadMessages(selectedConnection);
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [selectedConnection, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConnections = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('connections')
      .select('*, profiles!connections_user_one_id_fkey(*), profiles!connections_user_two_id_fkey(*)')
      .or(`user_one_id.eq.${user.id},user_two_id.eq.${user.id}`);

    if (error) {
      console.error('Error loading connections:', error);
      return;
    }

    const connectionsWithProfiles = data?.map((conn: any) => {
      const otherUser = conn.user_one_id === user.id
        ? conn.profiles
        : conn.profiles;

      return {
        ...conn,
        otherUser: Array.isArray(otherUser) ? otherUser[0] : otherUser,
      };
    }) || [];

    setConnections(connectionsWithProfiles);
    setLoading(false);
  };

  const loadMessages = async (connectionId: string) => {
    const connection = connections.find(c => c.id === connectionId);
    if (!connection || !user) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*, profiles!messages_from_user_id_fkey(*)')
      .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${connection.otherUser.id}),and(from_user_id.eq.${connection.otherUser.id},to_user_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    const messagesWithProfiles = data?.map((msg: any) => ({
      ...msg,
      from_profile: Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles,
    })) || [];

    setMessages(messagesWithProfiles);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConnection || !user) return;

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

    setNewMessage('');
    loadMessages(selectedConnection);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const selectedUser = connections.find(c => c.id === selectedConnection)?.otherUser;

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="chat-container">
      <div className="chat-sidebar">
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
            <button className="icon-btn" onClick={() => navigate('/profile')}>👤</button>
            <button className="icon-btn" onClick={() => navigate('/connections')}>➕</button>
            <button className="icon-btn" onClick={handleSignOut}>🚪</button>
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
                <div className="connection-avatar">
                  {conn.otherUser.first_name[0]}{conn.otherUser.last_name[0]}
                </div>
                <div className="connection-info">
                  <div className="connection-name">
                    {conn.otherUser.first_name} {conn.otherUser.last_name}
                  </div>
                  <div className="connection-username">
                    {conn.otherUser.word_one} | {conn.otherUser.word_two}
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
              <div className="chat-user-info">
                <div className="chat-avatar">
                  {selectedUser.first_name[0]}{selectedUser.last_name[0]}
                </div>
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
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
