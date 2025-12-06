import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile, ConnectionRequest } from '../lib/supabase';
import '../styles/connections.css';

export function Connections() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchWords, setSearchWords] = useState({ word1: '', word2: '', country: 'US' });
  const [searchResult, setSearchResult] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<(ConnectionRequest & { from_profile: Profile; to_profile: Profile })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadRequests();
  }, [user, navigate]);

  const loadRequests = async () => {
    if (!user) return;

    const { data: requestsData, error } = await supabase
      .from('connection_requests')
      .select('*')
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      .eq('status', 'pending');

    if (error) {
      console.error('Error loading requests:', error);
      return;
    }

    const requestsWithProfiles = await Promise.all(
      (requestsData || []).map(async (req) => {
        const { data: fromProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', req.from_user_id)
          .maybeSingle();

        const { data: toProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', req.to_user_id)
          .maybeSingle();

        return {
          ...req,
          from_profile: fromProfile!,
          to_profile: toProfile!,
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

  const sendConnectionRequest = async (toUserId: string) => {
    if (!user) return;

    const { data: existingRequest } = await supabase
      .from('connection_requests')
      .select('*')
      .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${user.id})`)
      .maybeSingle();

    if (existingRequest) {
      setError('Connection request already exists');
      return;
    }

    const { data: existingConnection } = await supabase
      .from('connections')
      .select('*')
      .or(`and(user_one_id.eq.${user.id},user_two_id.eq.${toUserId}),and(user_one_id.eq.${toUserId},user_two_id.eq.${user.id})`)
      .maybeSingle();

    if (existingConnection) {
      setError('Already connected with this user');
      return;
    }

    const { error } = await supabase.from('connection_requests').insert({
      from_user_id: user.id,
      to_user_id: toUserId,
      status: 'pending',
    });

    if (error) {
      setError('Failed to send connection request');
      return;
    }

    setSearchResult(null);
    setSearchWords({ word1: '', word2: '', country: 'US' });
    alert('Connection request sent!');
    loadRequests();
  };

  const handleAcceptRequest = async (requestId: string, fromUserId: string) => {
    if (!user) return;

    const { error: updateError } = await supabase
      .from('connection_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error updating request:', updateError);
      return;
    }

    const [userId1, userId2] = [user.id, fromUserId].sort();

    const { error: connectionError } = await supabase.from('connections').insert({
      user_one_id: userId1,
      user_two_id: userId2,
    });

    if (connectionError) {
      console.error('Error creating connection:', connectionError);
      return;
    }

    loadRequests();
  };

  const handleRejectRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('connection_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (error) {
      console.error('Error rejecting request:', error);
      return;
    }

    loadRequests();
  };

  const incomingRequests = requests.filter(r => r.to_user_id === user?.id);
  const outgoingRequests = requests.filter(r => r.from_user_id === user?.id);

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
                <div className="result-avatar">
                  {searchResult.first_name[0]}{searchResult.last_name[0]}
                </div>
                <div className="result-info">
                  <h3>{searchResult.first_name} {searchResult.last_name}</h3>
                  <p className="result-username">{searchResult.word_one} | {searchResult.word_two}</p>
                  <p className="result-country">{searchResult.country}</p>
                </div>
                <button
                  className="connect-btn"
                  onClick={() => sendConnectionRequest(searchResult.id)}
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
                  <div className="request-avatar">
                    {req.from_profile.first_name[0]}{req.from_profile.last_name[0]}
                  </div>
                  <div className="request-info">
                    <h3>{req.from_profile.first_name} {req.from_profile.last_name}</h3>
                    <p>{req.from_profile.word_one} | {req.from_profile.word_two}</p>
                  </div>
                  <div className="request-actions">
                    <button
                      className="accept-btn"
                      onClick={() => handleAcceptRequest(req.id, req.from_user_id)}
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
                  <div className="request-avatar">
                    {req.to_profile.first_name[0]}{req.to_profile.last_name[0]}
                  </div>
                  <div className="request-info">
                    <h3>{req.to_profile.first_name} {req.to_profile.last_name}</h3>
                    <p>{req.to_profile.word_one} | {req.to_profile.word_two}</p>
                    <p className="request-status">Pending</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
