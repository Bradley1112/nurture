
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
    if (!dateString || typeof dateString !== 'string') return false;
    
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!regex.test(dateString)) {
      return false;
    }
    
    const [day, month, year] = dateString.split('/');
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    
    // Check if month is valid (1-12)
    if (monthNum < 1 || monthNum > 12) {
      return false;
    }
    
    // Check if day is valid (1-31)
    if (dayNum < 1 || dayNum > 31) {
      return false;
    }
    
    // Check if year is reasonable (current year to 10 years in future)
    const currentYear = new Date().getFullYear();
    if (yearNum < currentYear || yearNum > currentYear + 10) {
      return false;
    }
    
    // Create date and validate it's a real date (handles leap years, etc.)
    const date = new Date(yearNum, monthNum - 1, dayNum);
    const isValidDate = date.getDate() === dayNum && 
                       date.getMonth() === monthNum - 1 && 
                       date.getFullYear() === yearNum;
    
    if (!isValidDate) {
      return false;
    }
    
    // Check if it's today or in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inputDate = new Date(yearNum, monthNum - 1, dayNum);
    
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
      const regex = /^\d{2}\/\d{2}\/\d{4}$/;
      if (!regex.test(examDate)) {
        setError('Please use the format dd/mm/yyyy (e.g., 25/12/2025)');
      } else {
        const [day, month, year] = examDate.split('/');
        const inputDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (inputDate < today) {
          setError('Exam date must be today or in the future');
        } else if (parseInt(month) < 1 || parseInt(month) > 12) {
          setError('Month must be between 01 and 12');
        } else if (parseInt(day) < 1 || parseInt(day) > 31) {
          setError('Day must be between 01 and 31');
        } else {
          setError('Please enter a valid date');
        }
      }
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
                type="text"
                placeholder="📅 Next exam date (e.g., 15/03/2025)"
                value={examDate}
                onChange={(e) => {
                  const value = e.target.value;
                  setExamDate(value);
                  // Clear error when user starts typing a potentially valid format
                  if (error && error.includes('format') && value.length >= 8) {
                    setError(null);
                  }
                }}
                pattern="\d{2}/\d{2}/\d{4}"
                title="Please enter date in dd/mm/yyyy format (e.g., 15/03/2025)"
                required
                style={{
                  borderColor: examDate && !validateDate(examDate) && examDate.length >= 8 ? 
                    'var(--error-red)' : undefined
                }}
              />
              {examDate && examDate.length >= 8 && !validateDate(examDate) && (
                <p style={{ 
                  fontSize: 'var(--text-sm)', 
                  color: 'var(--error-red)', 
                  margin: '4px 0 0 0',
                  textAlign: 'left'
                }}>
                  ⚠️ Please use format: dd/mm/yyyy (e.g., 15/03/2025)
                </p>
              )}
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
