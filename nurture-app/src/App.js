
import React, { useState, useEffect } from 'react';
import './App.css';
import { auth } from './firebase/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import EvaluationQuiz from './components/EvaluationQuiz';
import QuizSession from './components/QuizSession';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <div className="App">
          <nav>
            <div className="nav-brand">
              Nurture
            </div>
            <div className="nav-links">
              {user ? (
                <button onClick={() => auth.signOut()}>Logout</button>
              ) : (
                <>
                  <Link to="/login">Login</Link>
                  <Link to="/signup">Sign Up</Link>
                </>
              )}
            </div>
          </nav>
          {/* App routes */}
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Private routes */}
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/quiz" element={<PrivateRoute><EvaluationQuiz /></PrivateRoute>} />
            <Route path="/quiz-session" element={<PrivateRoute><QuizSession /></PrivateRoute>} />

            {/* Redirect to dashboard if logged in, otherwise to login */}
            <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
