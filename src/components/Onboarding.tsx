import { useState } from 'react';
import { supabase } from '../lib/supabase';
import '../styles/onboarding.css';

interface OnboardingProps {
  userId: string;
  onComplete: () => void;
}

export function Onboarding({ userId, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);

  const handleComplete = async () => {
    await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', userId);

    onComplete();
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        <div className="onboarding-header">
          <h2>Welcome to TWO | WORDS</h2>
          <div className="onboarding-progress">
            <div className={`progress-dot ${step >= 1 ? 'active' : ''}`}></div>
            <div className={`progress-dot ${step >= 2 ? 'active' : ''}`}></div>
            <div className={`progress-dot ${step >= 3 ? 'active' : ''}`}></div>
            <div className={`progress-dot ${step >= 4 ? 'active' : ''}`}></div>
          </div>
        </div>

        <div className="onboarding-content">
          {step === 1 && (
            <div className="onboarding-step">
              <div className="step-icon">🔒</div>
              <h3>Your Privacy Comes First</h3>
              <p style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
                Met someone new? Want to stay in touch but not ready to share your phone number or Instagram?
              </p>
              <div style={{ background: '#F0F9FF', padding: '1rem', borderRadius: '0.75rem', marginTop: '1rem' }}>
                <p style={{ fontSize: '0.95rem', margin: 0 }}>
                  <strong>TWO | WORDS</strong> gives you a safe way to connect. Just share your two unique words, and only people you approve can reach you.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="onboarding-step">
              <div className="step-icon">✨</div>
              <h3>How It Works</h3>
              <div className="step-instructions">
                <div className="instruction-item">
                  <span className="instruction-number">1</span>
                  <p>You get a unique two-word code (like <strong>ninja | waffle</strong>)</p>
                </div>
                <div className="instruction-item">
                  <span className="instruction-number">2</span>
                  <p>Share it with someone you meet - by voice, text, or QR code</p>
                </div>
                <div className="instruction-item">
                  <span className="instruction-number">3</span>
                  <p>They search for your words and send a connection request</p>
                </div>
                <div className="instruction-item">
                  <span className="instruction-number">4</span>
                  <p><strong>You accept</strong> - now you can chat and share links safely</p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="onboarding-step">
              <div className="step-icon">🎯</div>
              <h3>You Control Everything</h3>
              <div className="step-instructions">
                <div className="instruction-item">
                  <span className="instruction-number">✓</span>
                  <p>Choose who sees your Instagram, Snapchat, LinkedIn, etc.</p>
                </div>
                <div className="instruction-item">
                  <span className="instruction-number">✓</span>
                  <p>Set relationship levels: Just Met, Acquaintance, Friend, Close Friend</p>
                </div>
                <div className="instruction-item">
                  <span className="instruction-number">✓</span>
                  <p>Show personal links to friends, business links to contacts</p>
                </div>
                <div className="instruction-item">
                  <span className="instruction-number">✓</span>
                  <p>Messages are encrypted - only you and your connection can read them</p>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="onboarding-step">
              <div className="step-icon">🚀</div>
              <h3>Ready to Get Started!</h3>
              <p style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>
                For the best experience:
              </p>
              <div className="step-instructions">
                <div className="instruction-item">
                  <span className="instruction-number">1</span>
                  <p><strong>Add to Home Screen</strong> - Use TWO | WORDS like a native app</p>
                </div>
                <div className="instruction-item">
                  <span className="instruction-number">2</span>
                  <p><strong>Enable Notifications</strong> - Never miss a message (go to Profile)</p>
                </div>
                <div className="instruction-item">
                  <span className="instruction-number">3</span>
                  <p><strong>Add Your Links</strong> - Set up your social media in Profile</p>
                </div>
              </div>
              <div style={{ background: '#ECFDF5', padding: '1rem', borderRadius: '0.75rem', marginTop: '1rem' }}>
                <p style={{ fontSize: '0.9rem', margin: 0, color: '#065F46' }}>
                  <strong>Pro Tip:</strong> Share your words with people you meet at parties, events, classes, or work. It's the safest first contact.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="onboarding-actions">
          <button className="skip-btn" onClick={handleSkip}>
            Skip Tour
          </button>
          <button className="next-btn" onClick={handleNext}>
            {step < 4 ? 'Next' : 'Get Started'}
          </button>
        </div>
      </div>
    </div>
  );
}
