import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/home.css';

const WORDS = [
  "ninja", "waffle", "disco", "penguin", "grumpy", "avocado",
  "laser", "pickle", "cosmic", "donut", "sneaky", "taco",
  "fuzzy", "rocket", "bouncy", "sloth", "glitter", "burrito",
  "zippy", "muffin"
];

export function Home() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [word1, setWord1] = useState("ninja");
  const [word2, setWord2] = useState("waffle");
  const [isSpinning, setIsSpinning] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isBumping, setIsBumping] = useState(false);

  const getRandomWord = () => WORDS[Math.floor(Math.random() * WORDS.length)];

  const spinAndStop = () => {
    if (isSpinning) return;
    setIsSpinning(true);

    let spins = 0;
    const maxSpins = 12 + Math.floor(Math.random() * 8);
    const finalWord1 = getRandomWord();
    const finalWord2 = getRandomWord();

    const interval = setInterval(() => {
      setWord1(getRandomWord());
      setWord2(getRandomWord());
      spins++;

      if (spins >= maxSpins) {
        clearInterval(interval);
        setWord1(finalWord1);
        setWord2(finalWord2);
        setIsSpinning(false);
        setTimeout(spinAndStop, 3000 + Math.random() * 2000);
      }
    }, 80);
  };

  const doubleBumpLogo = () => {
    setIsBumping(true);
    setTimeout(() => setIsBumping(false), 800);
  };

  useEffect(() => {
    setTimeout(spinAndStop, 1000);
    setTimeout(() => {
      doubleBumpLogo();
      setInterval(doubleBumpLogo, 4000);
    }, 2000);
  }, []);

  useEffect(() => {
    if (profile) {
      navigate('/chat');
    }
  }, [profile, navigate]);

  return (
    <div className="home-container">
      <div className="top-bar">
        <button className="info-btn" onClick={() => setShowInfoModal(true)}>i</button>
        <button className="login-btn" onClick={() => navigate('/login')}>Login</button>
      </div>

      <button className={`logo-btn ${isBumping ? 'bumping' : ''}`} onClick={() => setShowShareModal(true)}>
        <span className="logo-text">TWO</span>
        <span className="logo-bar">|</span>
        <span className="logo-text">WORDS</span>
      </button>

      <p className="subtitle">Connect safely. Share your two words, not your number.</p>

      <div className="search-bar">
        <div className="bubble">{word1}</div>
        <div className="separator">|</div>
        <div className="bubble">{word2}</div>
      </div>

      <button className="mic-btn" aria-label="Speak two words">
        <svg className="mic-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15a.993.993 0 0 0-.98-.85c-.61 0-1.09.54-1 1.14.26 3 2.71 5.46 5.91 5.46s5.65-2.46 5.91-5.46c.09-.6-.39-1.14-1-1.14z"/>
        </svg>
      </button>

      <div className="examples">
        Try: <strong>{word1} | {word2}</strong> • <strong>disco | penguin</strong> • <strong>grumpy | avocado</strong>
      </div>

      {showInfoModal && (
        <div className="modal active" onClick={() => setShowInfoModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowInfoModal(false)}>×</button>
            <h3>Privacy-First Contact Sharing</h3>

            <div style={{ background: '#F0F9FF', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>
                <strong>Meet someone new?</strong> Don't give out your phone number or Instagram right away. Share your two words instead.
              </p>
            </div>

            <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>How it works:</h4>
            <ul style={{ lineHeight: '1.7' }}>
              <li>You get a unique two-word code like <span className="highlight">ninja | waffle</span></li>
              <li>Share it with someone you meet (by voice, text, or QR)</li>
              <li>They search for your words and send a request</li>
              <li><strong>You accept</strong> - now you can chat and share links safely</li>
            </ul>

            <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>You stay in control:</h4>
            <ul style={{ lineHeight: '1.7' }}>
              <li>No one sees your phone number</li>
              <li>Choose who sees your Instagram, Snapchat, LinkedIn, etc.</li>
              <li>Set relationship levels: Just Met, Friend, Close Friend</li>
              <li>Messages are encrypted - only you and your connection can read them</li>
              <li>No spam, no creeps, no noise</li>
            </ul>

            <div style={{ background: '#ECFDF5', padding: '1rem', borderRadius: '0.5rem', marginTop: '1.5rem' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#065F46' }}>
                <strong>Perfect for:</strong> Parties, events, classes, networking, or anywhere you meet new people and want to stay connected without oversharing.
              </p>
            </div>

            <button className="cta-btn" onClick={() => { setShowInfoModal(false); navigate('/signup'); }}>Get Started</button>
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="modal active" onClick={() => setShowShareModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowShareModal(false)}>×</button>
            <h3>Ready to Connect Safely?</h3>
            <p style={{ fontSize: '1rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              Create your account and get your unique two-word code. Start meeting people without giving out your phone number or social media.
            </p>
            <div style={{ background: '#F9FAFB', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#4B5563' }}>
                <strong>What you'll get:</strong><br/>
                • Your unique two-word code<br/>
                • Encrypted messaging<br/>
                • Control over who sees your social links<br/>
                • A safer way to network
              </p>
            </div>
            <button className="cta-btn" onClick={() => { setShowShareModal(false); navigate('/signup'); }}>Create Account</button>
          </div>
        </div>
      )}
    </div>
  );
}
