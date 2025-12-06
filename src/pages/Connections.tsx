import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile, Connection } from '../lib/supabase';
import '../styles/connections.css';

export function Connections() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchWords, setSearchWords] = useState({ word1: '', word2: '', country: 'US' });
  const [searchResult, setSearchResult] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<(Connection & { otherProfile: Profile })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connectionTier, setConnectionTier] = useState<'random' | 'acquaintance' | 'friend' | 'close_friend'>('friend');
  const [connectionType, setConnectionType] = useState<'friend' | 'business'>('friend');
  const [acceptingRequestId, setAcceptingRequestId] = useState<string | null>(null);
  const [acceptTier, setAcceptTier] = useState<'random' | 'acquaintance' | 'friend' | 'close_friend'>('friend');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadRequests();
  }, [user, navigate]);

  const loadRequests = async () => {
    if (!user) return;

    const { data: connectionsData, error } = await supabase
      .from('connections')
      .select('*')
      .or(`user_one_id.eq.${user.id},user_two_id.eq.${user.id}`)
      .eq('status', 'pending');

    if (error) {
      console.error('Error loading requests:', error);
      return;
    }

    const requestsWithProfiles = await Promise.all(
      (connectionsData || []).map(async (conn) => {
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

    setRequests(requestsWithProfiles);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSearchResult(null);
    setLoading(true);

    if (!searchWords.word1 || !searchWords.word2) {
      setError('Please enter both words');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('word_one', searchWords.word1.toLowerCase().trim())
      .eq('word_two', searchWords.word2.toLowerCase().trim())
      .eq('country', searchWords.country)
      .maybeSingle();

    if (error) {
      setError('Error searching for user');
      setLoading(false);
      return;
    }

    if (!data) {
      setError('No user found with those words in that country');
      setLoading(false);
      return;
    }

    if (data.id === user?.id) {
      setError('This is you!');
      setLoading(false);
      return;
    }

    setSearchResult(data);
    setLoading(false);
  };

  const sendConnectionRequest = async (toUserId: string, type: 'friend' | 'business', tier: 'random' | 'acquaintance' | 'friend' | 'close_friend') => {
    if (!user) return;

    const { data: existingConnection } = await supabase
      .from('connections')
      .select('*')
      .or(`and(user_one_id.eq.${user.id},user_two_id.eq.${toUserId}),and(user_one_id.eq.${toUserId},user_two_id.eq.${user.id})`)
      .maybeSingle();

    if (existingConnection) {
      if (existingConnection.status === 'pending') {
        setError('Connection request already exists');
      } else {
        setError('Already connected with this user');
      }
      return;
    }

    const [userId1, userId2] = [user.id, toUserId].sort();

    const { error } = await supabase.from('connections').insert({
      user_one_id: userId1,
      user_two_id: userId2,
      status: 'pending',
      requester_id: user.id,
      connection_type: type,
      tier: tier,
    });

    if (error) {
      setError('Failed to send connection request');
      return;
    }

    setSearchResult(null);
    setSearchWords({ word1: '', word2: '', country: 'US' });
    setConnectionType('friend');
    setConnectionTier('friend');
    alert('Connection request sent!');
    loadRequests();
  };

  const handleAcceptRequest = async (connectionId: string, tier: 'random' | 'acquaintance' | 'friend' | 'close_friend') => {
    if (!user) return;

    const { error } = await supabase
      .from('connections')
      .update({ status: 'accepted', tier: tier })
      .eq('id', connectionId);

    if (error) {
      console.error('Error accepting request:', error);
      return;
    }

    setAcceptingRequestId(null);
    setAcceptTier('friend');
    loadRequests();
  };

  const handleRejectRequest = async (connectionId: string) => {
    const { error } = await supabase
      .from('connections')
      .update({ status: 'rejected' })
      .eq('id', connectionId);

    if (error) {
      console.error('Error rejecting request:', error);
      return;
    }

    loadRequests();
  };

  const incomingRequests = requests.filter(r => r.requester_id !== user?.id);
  const outgoingRequests = requests.filter(r => r.requester_id === user?.id);

  return (
    <div className="connections-container">
      <div className="connections-header">
        <button className="back-btn" onClick={() => navigate('/chat')}>← Back to Chat</button>
        <h1>Find Connections</h1>
      </div>

      <div className="connections-content">
        <div className="search-section">
          <h2>Search by Two Words</h2>
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-inputs">
              <input
                type="text"
                value={searchWords.word1}
                onChange={(e) => setSearchWords({ ...searchWords, word1: e.target.value })}
                placeholder="First word"
                className="word-input"
              />
              <span className="word-separator">|</span>
              <input
                type="text"
                value={searchWords.word2}
                onChange={(e) => setSearchWords({ ...searchWords, word2: e.target.value })}
                placeholder="Second word"
                className="word-input"
              />
            </div>
            <select
              value={searchWords.country}
              onChange={(e) => setSearchWords({ ...searchWords, country: e.target.value })}
              className="country-select"
            >
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
            </select>
            <button type="submit" className="search-btn" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>

          {error && <div className="error-message">{error}</div>}

          {searchResult && (
            <div className="search-result">
              <div className="result-card">
                {searchResult.profile_image_url ? (
                  <img
                    src={searchResult.profile_image_url}
                    alt={`${searchResult.first_name} ${searchResult.last_name}`}
                    className="result-avatar-image"
                  />
                ) : (
                  <div className="result-avatar">
                    {searchResult.first_name[0]}{searchResult.last_name[0]}
                  </div>
                )}
                <div className="result-info">
                  <h3>{searchResult.first_name} {searchResult.last_name}</h3>
                  <p className="result-username">{searchResult.word_one} | {searchResult.word_two}</p>
                  <p className="result-country">{searchResult.country}</p>
                  <div className="connection-type-selector">
                    <label className="connection-type-label">
                      <input
                        type="radio"
                        name="connectionType"
                        value="friend"
                        checked={connectionType === 'friend'}
                        onChange={() => setConnectionType('friend')}
                      />
                      <span>Friend</span>
                    </label>
                    <label className="connection-type-label">
                      <input
                        type="radio"
                        name="connectionType"
                        value="business"
                        checked={connectionType === 'business'}
                        onChange={() => setConnectionType('business')}
                      />
                      <span>Business</span>
                    </label>
                  </div>
                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem', display: 'block' }}>Relationship Level:</label>
                    <select
                      value={connectionTier}
                      onChange={(e) => setConnectionTier(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #D1D5DB',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem'
                      }}
                    >
                      <option value="random">Just Met / Random</option>
                      <option value="acquaintance">Acquaintance</option>
                      <option value="friend">Friend</option>
                      <option value="close_friend">Close Friend</option>
                    </select>
                  </div>
                </div>
                <button
                  className="connect-btn"
                  onClick={() => sendConnectionRequest(searchResult.id, connectionType, connectionTier)}
                >
                  Send Request
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="requests-section">
          {incomingRequests.length > 0 && (
            <div className="requests-group">
              <h2>Incoming Requests</h2>
              {incomingRequests.map((req) => (
                <div key={req.id} className="request-card">
                  {req.otherProfile.profile_image_url ? (
                    <img
                      src={req.otherProfile.profile_image_url}
                      alt={`${req.otherProfile.first_name} ${req.otherProfile.last_name}`}
                      className="request-avatar-image"
                    />
                  ) : (
                    <div className="request-avatar">
                      {req.otherProfile.first_name[0]}{req.otherProfile.last_name[0]}
                    </div>
                  )}
                  <div className="request-info">
                    <h3>{req.otherProfile.first_name} {req.otherProfile.last_name}</h3>
                    <p>{req.otherProfile.word_one} | {req.otherProfile.word_two}</p>
                    <p className="connection-type-badge">
                      {req.connection_type === 'business' ? 'Business Contact' : 'Friend'}
                    </p>
                  </div>
                  <div className="request-actions">
                    <button
                      className="accept-btn"
                      onClick={() => {
                        setAcceptingRequestId(req.id);
                        setAcceptTier('friend');
                      }}
                    >
                      Accept
                    </button>
                    <button
                      className="reject-btn"
                      onClick={() => handleRejectRequest(req.id)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {outgoingRequests.length > 0 && (
            <div className="requests-group">
              <h2>Pending Requests</h2>
              {outgoingRequests.map((req) => (
                <div key={req.id} className="request-card">
                  {req.otherProfile.profile_image_url ? (
                    <img
                      src={req.otherProfile.profile_image_url}
                      alt={`${req.otherProfile.first_name} ${req.otherProfile.last_name}`}
                      className="request-avatar-image"
                    />
                  ) : (
                    <div className="request-avatar">
                      {req.otherProfile.first_name[0]}{req.otherProfile.last_name[0]}
                    </div>
                  )}
                  <div className="request-info">
                    <h3>{req.otherProfile.first_name} {req.otherProfile.last_name}</h3>
                    <p>{req.otherProfile.word_one} | {req.otherProfile.word_two}</p>
                    <p className="request-status">Pending</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {acceptingRequestId && (
        <div className="modal-overlay" onClick={() => setAcceptingRequestId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h2>Accept Connection</h2>
            <p style={{ marginBottom: '1rem', color: '#6B7280' }}>Choose how you'd like to categorize this connection:</p>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem', display: 'block' }}>Relationship Level:</label>
              <select
                value={acceptTier}
                onChange={(e) => setAcceptTier(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #D1D5DB',
                  borderRadius: '0.5rem',
                  fontSize: '1rem'
                }}
              >
                <option value="random">Just Met / Random</option>
                <option value="acquaintance">Acquaintance</option>
                <option value="friend">Friend</option>
                <option value="close_friend">Close Friend</option>
              </select>
              <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6B7280' }}>
                This helps control what information you share with them.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setAcceptingRequestId(null)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.5rem',
                  background: 'white',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleAcceptRequest(acceptingRequestId, acceptTier)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: 'none',
                  borderRadius: '0.5rem',
                  background: '#10B981',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
