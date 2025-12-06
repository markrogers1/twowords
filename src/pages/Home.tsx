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

      <p className="subtitle">Safe sharing. Instant networking.</p>

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
            <h3>No phone numbers. No socials. No strangers.</h3>
            <p>You get a <strong>random two-word code</strong> like <span className="highlight">ninja | waffle</span>.</p>
            <p>And only people you <strong>choose to share it with</strong> can find you.</p>
            <p><strong>Double opt-in:</strong> They say your words → You <strong>accept</strong> → Connection made.</p>
            <ul>
              <li>No one sees your phone number</li>
              <li>No one sees your Instagram, LinkedIn, etc.</li>
              <li>No spam, no creeps, no noise</li>
              <li>You control who enters your network</li>
            </ul>
            <p>Share by <strong>voice</strong>, <strong>bump phones</strong>, or <strong>QR</strong>.</p>
            <p><em>Networking — but make it safe.</em></p>
            <button className="cta-btn" onClick={() => { setShowInfoModal(false); navigate('/signup'); }}>Get Started</button>
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="modal active" onClick={() => setShowShareModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowShareModal(false)}>×</button>
            <h3>Get Started</h3>
            <p>Create your account to get your unique two words and start connecting safely.</p>
            <button className="cta-btn" onClick={() => { setShowShareModal(false); navigate('/signup'); }}>Sign Up</button>
          </div>
        </div>
      )}
    </div>
  );
}
