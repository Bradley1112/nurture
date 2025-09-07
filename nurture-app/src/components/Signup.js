
import React, { useState } from 'react';
import { signup } from '../firebase/auth';
import { useNavigate } from 'react-router-dom';

function Signup() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [level, setLevel] = useState('');
  const [examDate, setExamDate] = useState('');
  const [targetYear, setTargetYear] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const validateDate = (dateString) => {
    if (!dateString) return false;
    
    // dateString is now in YYYY-MM-DD format from date input
    const inputDate = new Date(dateString);
    
    // Check if it's a valid date
    if (isNaN(inputDate.getTime())) {
      return false;
    }
    
    // Check if it's today or in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    inputDate.setHours(0, 0, 0, 0);
    
    return inputDate >= today;
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    setError(null);
    
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    setStep(2);
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    setError(null);
    
    // Validate all academic info fields
    if (!level || !examDate || !targetYear) {
      setError('Please complete all academic information');
      return;
    }
    
    // Validate date format
    if (!validateDate(examDate)) {
      setError('Exam date must be today or in the future');
      return;
    }
    
    try {
      await signup(name, email, password, level, examDate, targetYear);
      navigate('/quiz');
    } catch (error) {
      setError(error.message);
    }
  };

  const goBackToStep1 = () => {
    setError(null);
    setStep(1);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Progress Indicator */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          marginBottom: 'var(--space-6)',
          gap: 'var(--space-2)'
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: step >= 1 ? 'var(--vibrant-leaf)' : 'var(--pinstripe-green)',
            transition: 'all var(--transition-normal)'
          }} />
          <div style={{
            width: '20px',
            height: '2px',
            backgroundColor: step >= 2 ? 'var(--vibrant-leaf)' : 'var(--pinstripe-green)',
            alignSelf: 'center',
            transition: 'all var(--transition-normal)'
          }} />
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: step >= 2 ? 'var(--vibrant-leaf)' : 'var(--pinstripe-green)',
            transition: 'all var(--transition-normal)'
          }} />
        </div>

        {step === 1 ? (
          // Step 1: Basic Information
          <>
            <h1>🌱 Start Growing</h1>
            <p className="text-center mb-6" style={{opacity: 0.9}}>
              Create your account to begin
            </p>
            <form onSubmit={handleStep1Submit}>
              <input
                type="text"
                placeholder="🧑‍🎓 Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <input
                type="email"
                placeholder="📧 Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="🔒 Create password (min. 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength="6"
              />
              <button type="submit" disabled={!name.trim() || !email.trim() || !password.trim()}>
                {!name.trim() || !email.trim() || !password.trim() ? 
                  '🌿 Fill all fields' : '➡️ Next: Academic Info'}
              </button>
              {error && <p className="error">⚠️ {error}</p>}
            </form>
          </>
        ) : (
          // Step 2: Academic Information
          <>
            <h1>📚 Academic Details</h1>
            <p className="text-center mb-6" style={{opacity: 0.9}}>
              Tell us about your studies
            </p>
            <form onSubmit={handleStep2Submit}>
              <select 
                value={level} 
                onChange={(e) => setLevel(e.target.value)}
                required
                style={{appearance: 'none'}}
              >
                <option value="">📚 Select your level</option>
                <option value="Sec 1">Secondary 1</option>
                <option value="Sec 2">Secondary 2</option>
                <option value="Sec 3">Secondary 3</option>
                <option value="Sec 4">Secondary 4</option>
              </select>
              <input
                type="date"
                placeholder="📅 Select your next exam date"
                value={examDate}
                onChange={(e) => {
                  const value = e.target.value;
                  setExamDate(value);
                  // Clear error when user selects a valid date
                  if (error && validateDate(value)) {
                    setError(null);
                  }
                }}
                min={new Date().toISOString().split('T')[0]} // Set minimum date to today
                required
                style={{
                  borderColor: examDate && !validateDate(examDate) ? 
                    'var(--error-red)' : undefined
                }}
              />
              <select 
                value={targetYear} 
                onChange={(e) => setTargetYear(e.target.value)}
                required
                style={{appearance: 'none'}}
              >
                <option value="">🎯 Target O-level year</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2028">2028</option>
              </select>
              
              <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
                <button 
                  type="button" 
                  onClick={goBackToStep1}
                  className="btn-secondary"
                  style={{ flex: 1 }}
                >
                  ⬅️ Back
                </button>
                <button 
                  type="submit" 
                  disabled={!level || !examDate || !targetYear}
                  style={{ flex: 2 }}
                >
                  {!level || !examDate || !targetYear ? 
                    '🌿 Complete fields' : '🚀 Begin Learning Journey'}
                </button>
              </div>
              {error && <p className="error">⚠️ {error}</p>}
            </form>
          </>
        )}

        <p className="text-center mt-6" style={{fontSize: 'var(--text-sm)', opacity: 0.8}}>
          Already growing with us? <a href="/login" style={{color: 'var(--vibrant-leaf)', textDecoration: 'none'}}>Sign in</a>
        </p>
      </div>
    </div>
  );
}

export default Signup;
