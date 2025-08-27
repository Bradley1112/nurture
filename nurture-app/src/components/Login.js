
import React, { useState } from 'react';
import { login } from '../firebase/auth';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>🌱 Welcome Back</h1>
        <p className="text-center mb-6" style={{opacity: 0.9}}>
          Continue your learning journey
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="📧 Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="🔒 Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={!email || !password}>
            {!email || !password ? '🌿 Please fill all fields' : '🚀 Continue Learning'}
          </button>
          {error && <p className="error">⚠️ {error}</p>}
        </form>
        <p className="text-center mt-6" style={{fontSize: 'var(--text-sm)', opacity: 0.8}}>
          New to Nurture? <a href="/signup" style={{color: 'var(--vibrant-leaf)', textDecoration: 'none'}}>Create an account</a>
        </p>
      </div>
    </div>
  );
}

export default Login;
