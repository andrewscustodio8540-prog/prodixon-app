import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Factory, Lock, Mail, User, Building, ArrowRight, KeyRound } from 'lucide-react';

export default function Register() {
    const [step, setStep] = useState(1); // 1: Select Type, 2: Form
    const [accountType, setAccountType] = useState(null); // 'new_company' or 'join_company'

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [joinCode, setJoinCode] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');

    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMsg('');

        try {
            let companyIdToJoin = null;

            // 1. If joining an existing company, verify the join code first
            if (accountType === 'join_company') {
                const { data: companies, error: fetchErr } = await supabase
                    .from('companies')
                    .select('id, name')
                    .eq('join_code', joinCode)
                    .single();

                if (fetchErr || !companies) {
                    throw new Error("Código de Convite inválido ou não encontrado.");
                }
                companyIdToJoin = companies.id;
            }

            // 2. Register the user in Supabase Auth
            // We pass the company_id and role via user_metadata so the trigger automatically inserts it
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        company_id: companyIdToJoin, // Will be null if creating a new company
                        role: accountType === 'join_company' ? 'operator' : 'admin'
                    }
                }
            });

            if (authError) throw authError;

            // 3. If creating a new company, we need to insert the company now
            // Since the trigger already created a profile (with role admin, but no company_id yet),
            // we create the company and then update the profile.
            if (accountType === 'new_company' && authData.user) {

                // Wait briefly for the trigger to finish creating the profile
                await new Promise(resolve => setTimeout(resolve, 500));

                const { data: newCompany, error: compErr } = await supabase
                    .from('companies')
                    .insert([{ name: companyName }])
                    .select()
                    .single();

                if (compErr) throw compErr;

                // Update the admin's profile with the new company ID
                const { error: profUpdateErr } = await supabase
                    .from('profiles')
                    .update({ company_id: newCompany.id })
                    .eq('id', authData.user.id);

                if (profUpdateErr) throw profUpdateErr;
            }

            setSuccessMsg("Conta criada com sucesso! Redirecionando...");
            setTimeout(() => {
                navigate('/dashboard');
            }, 1500);

        } catch (err) {
            console.error(err);
            setError(err.message || "Erro ao criar conta.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="orb orb-1"></div>
            <div className="orb orb-2"></div>

            <div className="login-card glass-panel animate-slide-up" style={{ maxWidth: '480px' }}>
                <div className="login-header">
                    <div className="logo-container" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                        <img src="/logo.jpg" alt="PRODIXON Logo" className="logo-image-large" style={{ width: '200px', height: '120px', borderRadius: '12px', objectFit: 'contain' }} />
                    </div>
                    <h1 className="text-gradient-primary">Criar Conta</h1>
                    <p className="subtitle">Bem-vindo ao PRODIXON SaaS</p>
                </div>

                {error && <div className="alert alert-error animate-fade-in">{error}</div>}
                {successMsg && <div className="alert alert-success animate-fade-in">{successMsg}</div>}

                {step === 1 ? (
                    <div className="account-type-selection animate-fade-in">
                        <h3 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>Como você deseja entrar?</h3>

                        <button
                            className="type-card glass-panel hover-glow"
                            onClick={() => { setAccountType('new_company'); setStep(2); }}
                        >
                            <div className="type-icon primary"><Building size={24} /></div>
                            <div className="type-info">
                                <h4>Criar Nova Empresa</h4>
                                <p>Sou Administrador / Dono e quero iniciar a gestão da minha fábrica.</p>
                            </div>
                            <ArrowRight size={20} className="type-arrow" />
                        </button>

                        <button
                            className="type-card glass-panel hover-glow"
                            onClick={() => { setAccountType('join_company'); setStep(2); }}
                        >
                            <div className="type-icon success"><KeyRound size={24} /></div>
                            <div className="type-info">
                                <h4>Entrar com Código</h4>
                                <p>Sou Operador/Supervisor e recebi um Código de Convite da minha empresa.</p>
                            </div>
                            <ArrowRight size={20} className="type-arrow" />
                        </button>

                        <div className="login-footer">
                            Já tem uma conta? <Link to="/login" className="text-primary hover-underline">Fazer Login</Link>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleRegister} className="login-form animate-slide-up">

                        <button type="button" className="btn-back" onClick={() => setStep(1)}>
                            &larr; Voltar
                        </button>

                        <h3 style={{ marginBottom: '1.5rem', marginTop: '0.5rem', color: accountType === 'new_company' ? 'var(--primary-color)' : '#3fb950' }}>
                            {accountType === 'new_company' ? 'Dados da Nova Empresa' : 'Entrar via Convite'}
                        </h3>

                        {accountType === 'join_company' ? (
                            <div className="form-group custom-input">
                                <label className="form-label font-bold text-success">Código de Convite (Fornecido pelo Admin)</label>
                                <div className="input-with-icon">
                                    <KeyRound className="input-icon text-success" size={18} />
                                    <input
                                        type="text"
                                        className="input-field border-success"
                                        placeholder="Ex: PRDX-A1B2"
                                        value={joinCode}
                                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                        required
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="form-group custom-input">
                                <label className="form-label">Nome da sua Empresa</label>
                                <div className="input-with-icon">
                                    <Factory className="input-icon" size={18} />
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="Indústria XPTO Ltda"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <hr style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '1.5rem 0' }} />

                        <div className="form-group custom-input">
                            <label className="form-label">Nome Completo</label>
                            <div className="input-with-icon">
                                <User className="input-icon" size={18} />
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="João da Silva"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group custom-input">
                            <label className="form-label">E-mail Corporativo</label>
                            <div className="input-with-icon">
                                <Mail className="input-icon" size={18} />
                                <input
                                    type="email"
                                    className="input-field"
                                    placeholder="joao@empresa.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group custom-input">
                            <label className="form-label">Senha de Acesso</label>
                            <div className="input-with-icon">
                                <Lock className="input-icon" size={18} />
                                <input
                                    type="password"
                                    className="input-field"
                                    placeholder="Mínimo 6 caracteres"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className={`btn ${accountType === 'join_company' ? 'btn-success' : 'btn-primary'} btn-block ${loading ? 'loading' : ''}`}
                            disabled={loading}
                            style={accountType === 'join_company' ? { background: '#2ea043', borderColor: '#2ea043' } : {}}
                        >
                            {loading ? 'Processando...' : (
                                <>Criar Conta {accountType === 'join_company' ? 'como Operador' : 'e Empresa'} <ArrowRight size={18} /></>
                            )}
                        </button>
                    </form>
                )}
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
          padding: 2.5rem;
          margin: 1rem;
        }

        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .type-card {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 1.5rem;
          margin-bottom: 1rem;
          cursor: pointer;
          border: 1px solid rgba(255,255,255,0.05);
          text-align: left;
          width: 100%;
          transition: all 0.3s ease;
        }

        .type-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255,255,255,0.2);
        }

        .type-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .type-icon.primary { background: rgba(0, 102, 255, 0.15); color: #58a6ff; }
        .type-icon.success { background: rgba(46, 160, 67, 0.15); color: #3fb950; }

        .type-info h4 {
          margin: 0 0 0.25rem 0;
          font-size: 1.1rem;
        }
        
        .type-info p {
          margin: 0;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .type-arrow {
          margin-left: auto;
          color: var(--text-muted);
          transition: transform 0.3s;
        }

        .type-card:hover .type-arrow {
          transform: translateX(5px);
          color: white;
        }

        .btn-back {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 0.9rem;
          padding: 0;
        }
        .btn-back:hover { color: white; }

        /* Login base styles reused */
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

        .alert-success {
          background: rgba(46, 160, 67, 0.1);
          border: 1px solid rgba(46, 160, 67, 0.4);
          color: #3fb950;
          padding: 0.75rem 1rem;
          border-radius: var(--border-radius-md);
          font-size: 0.85rem;
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .custom-input .input-with-icon { position: relative; }
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
        .border-success:focus { border-color: #3fb950 !important; box-shadow: 0 0 0 3px rgba(46, 160, 67, 0.2) !important; }

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
          font-size: 0.9rem;
          color: var(--text-muted);
          padding-top: 1.5rem;
        }
        .hover-underline:hover { text-decoration: underline; }
      `}</style>
        </div>
    );
}
