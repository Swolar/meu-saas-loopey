import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import Login from './Login';
import { getApiUrl, authFetch } from './config';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('loopey_token');
      if (token) {
        try {
          const res = await authFetch('/api/me');
          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
          } else {
            // Token invalid or expired
            localStorage.removeItem('loopey_token');
            localStorage.removeItem('loopey_user');
          }
        } catch (err) {
          console.error('Auth check failed:', err);
          localStorage.removeItem('loopey_token');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const handleLogin = (data) => {
    setUser(data.user);
    localStorage.setItem('loopey_token', data.token);
    localStorage.setItem('loopey_user', JSON.stringify(data.user));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('loopey_token');
    localStorage.removeItem('loopey_user');
  };

  if (loading) return null; // Or a loading spinner

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
        <Route 
          path="/" 
          element={user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/dashboard/:siteId" 
          element={user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
      </Routes>
    </Router>
  );
}

export default App;
