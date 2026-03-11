import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CreditCard, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Pricing() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    // Link pre-configurado gerado no Painel do Stripe
    // Em produção, isso viria das variáveis de ambiente
    const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/test_123456789";

    const handleSubscribe = () => {
        if (!user?.company_id) {
            alert("Erro crítico: Empresa não vinculada ao usuário.");
            return;
        }
        setLoading(true);

        // Pass the company_id as client_reference_id so the webhook knows who paid
        const checkoutUrl = `${STRIPE_PAYMENT_LINK}?client_reference_id=${user.company_id}&prefilled_email=${encodeURIComponent(user.email)}`;

        window.location.href = checkoutUrl;
    };

    const isTrialing = user?.subscription_status === 'trialing';
    const isCanceled = user?.subscription_status === 'canceled';

    // Format end date if exists
    const endDate = user?.subscription_end_date
        ? new Date(user.subscription_end_date).toLocaleDateString('pt-BR')
        : 'N/A';

    return (
        <div className="pricing-container animate-fade-in">
            <div className="pricing-content">

                {/* Header Alert area */}
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    {isTrialing ? (
                        <div className="status-badge pulse-warning">
                            <Zap size={20} className="text-warning" />
                            <span>Você está no Período de Teste. Ele encerra em <strong>{endDate}</strong>.</span>
                        </div>
                    ) : (
                        <div className="status-badge pulse-danger">
                            <AlertTriangle size={20} className="text-danger" />
                            <span>Sua assinatura está inativa ou expirada.</span>
                        </div>
                    )}

                    <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '1rem', marginTop: '1rem' }}>
                        {isTrialing ? 'Aproveite o PRODIXON SaaS' : 'Ative sua Assinatura'}
                    </h1>
                    <p className="text-secondary" style={{ maxWidth: '600px', margin: '0 auto', fontSize: '1.1rem' }}>
                        Para continuar utilizando o sistema de gestão de produção em sua plenitude, assine o nosso plano corporativo.
                    </p>
                </div>

                {/* Pricing Card */}
                <div className="pricing-card glass-panel animate-slide-up delay-200">
                    <div className="pricing-header">
                        <h3>Plano Corporativo</h3>
                        <div className="price">
                            <span className="currency">R$</span>
                            <span className="amount">349</span>
                            <span className="period">/mês</span>
                        </div>
                        <p className="text-secondary text-sm">Cobrado mensalmente. Cancele quando quiser.</p>
                    </div>

                    <div className="pricing-features">
                        <div className="feature">
                            <CheckCircle2 size={18} className="text-success" />
                            <span><strong>Múltiplos Operadores</strong> e Supervisores</span>
                        </div>
                        <div className="feature">
                            <CheckCircle2 size={18} className="text-success" />
                            <span><strong>Máquinas Ilimitadas</strong> e cadastro de peças</span>
                        </div>
                        <div className="feature">
                            <CheckCircle2 size={18} className="text-success" />
                            <span><strong>Dashboard em Tempo Real</strong> completo e Mobile-first</span>
                        </div>
                        <div className="feature">
                            <CheckCircle2 size={18} className="text-success" />
                            <span><strong>Geração de Relatórios</strong> detalhados</span>
                        </div>
                        <div className="feature">
                            <CheckCircle2 size={18} className="text-success" />
                            <span>Motivos de Parada e Refugo Customizáveis</span>
                        </div>
                    </div>

                    <button
                        className="btn btn-primary btn-block btn-large mt-4"
                        onClick={handleSubscribe}
                        disabled={loading}
                    >
                        {loading ? 'Redirecionando de forma segura...' : (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <CreditCard size={20} /> Assinar Agora <ArrowRight size={18} />
                            </span>
                        )}
                    </button>

                    <div className="secure-checkout">
                        <ShieldCheck size={16} className="text-success" />
                        <span>Pagamento 100% seguro pelo Stripe. Aceitamos PIX e Cartão de Crédito.</span>
                    </div>
                </div>

                {/* Admin Warning for restricted operators */}
                {user?.role !== 'admin' && (
                    <div className="operator-warning glass-panel animate-fade-in delay-300">
                        Você é um Operador vinculado a esta empresa.
                        Peça para o Administrador da conta realizar a assinatura para liberar o sistema.
                    </div>
                )}

            </div>

            <style>{`
        .pricing-container {
          min-height: calc(100vh - 4rem);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .pricing-content {
          width: 100%;
          max-width: 800px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border-radius: 30px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
        }

        .pulse-warning { box-shadow: 0 0 15px rgba(210, 153, 34, 0.2); border-color: rgba(210, 153, 34, 0.4); }
        .pulse-danger { box-shadow: 0 0 15px rgba(248, 81, 73, 0.2); border-color: rgba(248, 81, 73, 0.4); }

        .pricing-card {
          width: 100%;
          max-width: 450px;
          padding: 2.5rem;
          background: linear-gradient(180deg, rgba(30, 35, 45, 0.9) 0%, rgba(13, 17, 23, 0.95) 100%);
          border-top: 4px solid var(--primary-color);
        }

        .pricing-header {
          text-align: center;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 2rem;
          margin-bottom: 2rem;
        }

        .pricing-header h3 {
          color: var(--primary-color);
          text-transform: uppercase;
          letter-spacing: 1px;
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }

        .price {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          gap: 0.25rem;
          margin-bottom: 0.5rem;
        }

        .currency { font-size: 1.5rem; font-weight: 600; color: var(--text-secondary); margin-top: 0.5rem; }
        .amount { font-size: 4rem; font-weight: 800; line-height: 1; }
        .period { font-size: 1rem; color: var(--text-secondary); align-self: flex-end; margin-bottom: 0.75rem; }

        .pricing-features {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .feature {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 1.05rem;
        }

        .btn-large {
          padding: 1rem;
          font-size: 1.1rem;
          border-radius: 8px;
        }

        .secure-checkout {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 1.5rem;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .operator-warning {
          margin-top: 2rem;
          padding: 1rem 2rem;
          border-color: rgba(210, 153, 34, 0.4);
          color: #d29922;
          text-align: center;
          max-width: 450px;
        }
      `}</style>
        </div>
    );
}
