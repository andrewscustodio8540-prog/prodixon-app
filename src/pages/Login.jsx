import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Factory, Lock, Mail, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('admin@empresa.com');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
      // Wait for AuthContext redirect or force redirect
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Falha ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Background Orbs */}
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>

      <div className="login-card glass-panel animate-slide-up">
        <div className="login-header">
          <div className="logo-container" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <img src="/logo.jpg" alt="PRODIXON Logo" className="logo-image-large" style={{ width: '240px', height: '160px', borderRadius: '16px', objectFit: 'contain' }} />
          </div>
          <h1 className="text-gradient-primary">PRODIXON</h1>
          <p className="subtitle">Sistema de Gestão de Produção</p>
        </div>

        {error && (
          <div className="alert alert-error animate-fade-in">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group custom-input">
            <label className="form-label">E-mail Corporativo</label>
            <div className="input-with-icon">
              <Mail className="input-icon" size={18} />
              <input
                type="email"
                className="input-field"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group custom-input">
            <div className="label-row">
              <label className="form-label">Senha</label>
              <a href="#" className="forgot-password">Esqueceu a senha?</a>
            </div>
            <div className="input-with-icon">
              <Lock className="input-icon" size={18} />
              <input
                type="password"
                className="input-field"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className={`btn btn-primary btn-block ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? 'Autenticando...' : (
              <>Entrar no Sistema <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        <div className="login-footer">
          Desenvolvido com padrão corporativo multitenant.
        </div>
      </div>

      <style>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          background: #0d1117;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.5;
          z-index: 0;
        }

        .orb-1 {
          width: 400px;
          height: 400px;
          background: var(--primary-glow);
          top: -100px;
          left: -100px;
        }

        .orb-2 {
          width: 300px;
          height: 300px;
          background: rgba(0, 240, 255, 0.2);
          bottom: -50px;
          right: -50px;
        }

        .login-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 420px;
          padding: 3rem 2.5rem;
          margin: 1rem;
        }

        .login-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .logo-container {
          display: flex;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        .logo-image-large {
          height: 120px;
          object-fit: contain;
          border-radius: 16px;
          box-shadow: 0 10px 25px var(--primary-glow);
        }

        .logo-icon-large {
          width: 64px;
          height: 64px;
          margin: 0 auto 1.5rem auto;
          border-radius: 16px;
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 25px var(--primary-glow);
        }

        .subtitle {
          color: var(--text-secondary);
          font-size: 0.95rem;
          margin-top: 0.5rem;
        }

        .alert-error {
          background: rgba(248, 81, 73, 0.1);
          border: 1px solid rgba(248, 81, 73, 0.4);
          color: #ff7b72;
          padding: 0.75rem 1rem;
          border-radius: var(--border-radius-md);
          font-size: 0.85rem;
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .forgot-password {
          font-size: 0.8rem;
          font-weight: 500;
        }

        .custom-input .input-with-icon {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          transition: color var(--transition-fast);
        }

        .custom-input .input-field {
          padding-left: 3rem;
          background: rgba(13, 17, 23, 0.5);
        }

        .custom-input .input-field:focus + .input-icon,
        .custom-input .input-field:not(:placeholder-shown) ~ .input-icon {
          color: var(--primary-color);
        }

        .btn-block {
          width: 100%;
          margin-top: 1rem;
          padding: 0.85rem;
          font-size: 1rem;
          font-weight: 600;
        }

        .btn-primary.loading {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .login-footer {
          margin-top: 2rem;
          text-align: center;
          font-size: 0.75rem;
          color: var(--text-muted);
          border-top: 1px solid var(--border-color);
          padding-top: 1.5rem;
        }
      `}</style>
    </div>
  );
}
