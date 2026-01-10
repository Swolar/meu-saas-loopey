import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ArrowRight } from 'lucide-react';
import { getApiUrl } from './config';

const Login = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = isRegistering ? '/api/register' : '/api/login';
    
    try {
      const response = await fetch(getApiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (data.success) {
        if (isRegistering) {
            // After register, auto login or ask to login
            // For better UX, let's just log them in or switch to login mode
            setIsRegistering(false);
            setError('Conta criada! Por favor faça login.');
            setLoading(false);
        } else {
            onLogin(data);
            navigate('/');
        }
      }
    } catch (err) {
      console.error('Login error details:', err);
      setError(err.message + (err.message === 'Failed to fetch' ? ' (Erro de Conexão - Verifique se o servidor está rodando)' : ''));
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: 'radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%)',
      backgroundImage: 'radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(225,39%,30%,1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(339,49%,30%,1) 0, transparent 50%)',
      backgroundColor: '#0f172a',
      color: '#e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(10px)',
        padding: '2.5rem',
        borderRadius: '1.5rem',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <img src="/logo.svg" alt="LoopeyLive Logo" style={{ height: '80px', objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            {isRegistering ? 'Criar Conta' : 'Bem-vindo de volta'}
          </h1>
          <p style={{ color: '#94a3b8' }}>
            {isRegistering ? 'Preencha os dados para começar' : 'Entre para acessar seu painel'}
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            marginBottom: '1.5rem',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#cbd5e1' }}>
              Usuário
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '0.5rem',
                  color: 'white',
                  outline: 'none'
                }}
                placeholder="Seu usuário"
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#cbd5e1' }}>
              Senha
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem 0.875rem 2.5rem',
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid #334155',
                  borderRadius: '0.75rem',
                  color: 'white',
                  outline: 'none',
                  fontSize: '0.95rem',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#006fee'}
                onBlur={(e) => e.target.style.borderColor = '#334155'}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#006fee',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Processando...' : (isRegistering ? 'Criar Conta' : 'Entrar')}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#94a3b8' }}>
          {isRegistering ? 'Já tem uma conta?' : 'Não tem uma conta?'}
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#006fee',
              fontWeight: '600',
              cursor: 'pointer',
              marginLeft: '0.25rem'
            }}
          >
            {isRegistering ? 'Entrar' : 'Registrar-se'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
