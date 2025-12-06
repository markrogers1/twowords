import { useState } from 'react';
import { supabase } from '../lib/supabase';
import '../styles/onboarding.css';

interface OnboardingProps {
  userId: string;
  onComplete: () => void;
}

export function Onboarding({ userId, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  const handleComplete = async () => {
    await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', userId);

    onComplete();
  };

  const handleNext = () => {
    if (step < 2) {
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
          </div>
        </div>

        <div className="onboarding-content">
          {step === 1 && (
            <div className="onboarding-step">
              <div className="step-icon">📱</div>
              <h3>Add to Home Screen</h3>
              <p>For the best experience, add TWO | WORDS to your home screen:</p>

              {isIOS ? (
                <div className="step-instructions">
                  <div className="instruction-item">
                    <span className="instruction-number">1</span>
                    <p>Tap the <strong>Share</strong> button at the bottom of Safari</p>
                  </div>
                  <div className="instruction-item">
                    <span className="instruction-number">2</span>
                    <p>Scroll down and tap <strong>"Add to Home Screen"</strong></p>
                  </div>
                  <div className="instruction-item">
                    <span className="instruction-number">3</span>
                    <p>Tap <strong>"Add"</strong> in the top right corner</p>
                  </div>
                </div>
              ) : (
                <div className="step-instructions">
                  <div className="instruction-item">
                    <span className="instruction-number">1</span>
                    <p>Tap the <strong>menu</strong> button (three dots) in your browser</p>
                  </div>
                  <div className="instruction-item">
                    <span className="instruction-number">2</span>
                    <p>Select <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></p>
                  </div>
                  <div className="instruction-item">
                    <span className="instruction-number">3</span>
                    <p>Confirm by tapping <strong>"Add"</strong> or <strong>"Install"</strong></p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="onboarding-step">
              <div className="step-icon">🔔</div>
              <h3>Enable Notifications</h3>
              <p>Stay connected and never miss a message:</p>

              <div className="step-instructions">
                <div className="instruction-item">
                  <span className="instruction-number">1</span>
                  <p>Go to your <strong>Profile</strong> page (tap the profile icon)</p>
                </div>
                <div className="instruction-item">
                  <span className="instruction-number">2</span>
                  <p>Find the <strong>Notifications</strong> section</p>
                </div>
                <div className="instruction-item">
                  <span className="instruction-number">3</span>
                  <p>Tap <strong>"Enable Notifications"</strong> and allow when prompted</p>
                </div>
              </div>

              <div className="notification-note">
                <p>You'll receive notifications when you get new messages, even when the app is closed.</p>
              </div>
            </div>
          )}
        </div>

        <div className="onboarding-actions">
          <button className="skip-btn" onClick={handleSkip}>
            Skip Tour
          </button>
          <button className="next-btn" onClick={handleNext}>
            {step < 2 ? 'Next' : 'Get Started'}
          </button>
        </div>
      </div>
    </div>
  );
}
