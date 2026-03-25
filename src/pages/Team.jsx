import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Shield, ShieldAlert, KeyRound, Copy, CheckCircle2, User, UserCog, Trash2, Target, Percent } from 'lucide-react';

export default function Team() {
    const { user } = useAuth();
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [companyDetails, setCompanyDetails] = useState(null);
    const [copied, setCopied] = useState(false);
    const [targetOee, setTargetOee] = useState(80);
    const [maxRefuse, setMaxRefuse] = useState(5);
    const [savingSettings, setSavingSettings] = useState(false);

    useEffect(() => {
        if (user?.company_id) {
            fetchTeamData();
        }
    }, [user]);

    const fetchTeamData = async () => {
        setLoading(true);
        try {
            // Fetch Company Details (for Join Code)
            const { data: compData, error: compErr } = await supabase
                .from('companies')
                .select('*')
                .eq('id', user.company_id)
                .single();

            if (compErr) throw compErr;
            setCompanyDetails(compData);
            if (compData.target_oee) setTargetOee(compData.target_oee);
            if (compData.max_refuse_perc !== undefined && compData.max_refuse_perc !== null) setMaxRefuse(compData.max_refuse_perc);

            // Fetch Team Members
            // Note: We are fetching from the `profiles` table which stores the app user data
            const { data: profilesData, error: profErr } = await supabase
                .from('profiles')
                .select('*')
                .eq('company_id', user.company_id)
                .order('role', { ascending: true }) // admin first
                .order('full_name', { ascending: true });

            if (profErr) throw profErr;
            setTeamMembers(profilesData || []);

        } catch (err) {
            console.error("Erro ao buscar dados da equipe", err);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (companyDetails?.join_code) {
            navigator.clipboard.writeText(companyDetails.join_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setSavingSettings(true);
        try {
            const cleanTarget = String(targetOee).replace(/[^0-9.,]/g, '').replace(',', '.');
            const cleanRefuse = String(maxRefuse).replace(/[^0-9.,]/g, '').replace(',', '.');
            
            const parsedTarget = Number(cleanTarget);
            const parsedRefuse = Number(cleanRefuse);
            
            if (isNaN(parsedTarget) || isNaN(parsedRefuse) || cleanTarget === '' || cleanRefuse === '') {
               alert("Valores inválidos. Use apenas números, ponto ou vírgula. (Não insira símbolo de %)");
               setSavingSettings(false);
               return;
            }

            const { error } = await supabase
                .from('companies')
                .update({ 
                    target_oee: parsedTarget, 
                    max_refuse_perc: parsedRefuse 
                })
                .eq('id', user.company_id);
            if (error) throw error;
            alert("Metas atualizadas com sucesso!");
        } catch (err) {
            alert(`Erro ao salvar metas: ${err.message}`);
        } finally {
            setSavingSettings(false);
        }
    };

    const handleRemoveMember = async (memberId, memberName) => {
        if (memberId === user.id) {
            alert("Você não pode remover a si mesmo da empresa.");
            return;
        }
        if (!window.confirm(`Tem certeza que deseja remover "${memberName || 'o membro'}" do sistema da empresa? Ele perderá totalmente o acesso de leitura/edição.`)) {
            return;
        }
        try {
            // "Kick" user from company by setting company_id to null
            const { error } = await supabase
                .from('profiles')
                .update({ company_id: null, role: 'operator' })
                .eq('id', memberId);

            if (error) throw error;
            setTeamMembers(teamMembers.filter(m => m.id !== memberId));
            alert("Membro removido com sucesso!");
        } catch (err) {
            alert(`Erro ao remover: ${err.message}`);
        }
    };

    const handleRoleChange = async (memberId, newRole) => {
        if (memberId === user.id) {
            alert("Você não pode alterar seu próprio nível de acesso.");
            return;
        }

        // Check if trying to remove the last admin
        if (newRole !== 'admin') {
            const remainingAdmins = teamMembers.filter(m => m.role === 'admin' && m.id !== memberId);
            if (remainingAdmins.length === 0) {
                alert("A empresa precisa ter pelo menos um Administrador.");
                return;
            }
        }

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', memberId);

            if (error) throw error;

            // Update local state
            setTeamMembers(teamMembers.map(m => m.id === memberId ? { ...m, role: newRole } : m));
        } catch (err) {
            alert(`Erro ao alterar permissão: ${err.message}`);
        }
    };

    if (user?.role !== 'admin') {
        return (
            <div className="settings-container animate-fade-in">
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', borderColor: 'rgba(248, 81, 73, 0.3)' }}>
                    <ShieldAlert size={48} className="text-danger" style={{ margin: '0 auto 1rem auto' }} />
                    <h2 className="text-gradient">Acesso Restrito</h2>
                    <p className="text-secondary">Apenas Administradores podem gerenciar a equipe e os acessos da empresa.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="settings-container animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="text-gradient">Gestão de Equipe</h1>
                    <p className="text-secondary">Convide e gerencie os acessos dos seus funcionários</p>
                </div>
            </div>

            <div className="dashboard-content team-grid">

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignSelf: 'start' }}>
                    {/* Settings Panel */}
                    <div className="glass-panel animate-slide-up">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div className="kpi-icon-wrapper primary" style={{ width: '40px', height: '40px' }}><Target size={20} /></div>
                            <h3 style={{ margin: 0 }}>Política de Qualidade</h3>
                        </div>
                        <p className="text-sm text-secondary" style={{ marginBottom: '1.5rem' }}>
                            Defina as metas da sua empresa. Esses valores ajustarão as cores verde, amarelo e vermelho do Dashboard.
                        </p>
                        <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label className="text-secondary text-sm" style={{ display: 'block', marginBottom: '0.5rem' }}>Meta de Produtividade (OEE %)</label>
                                <div className="search-box" style={{ width: '100%' }}>
                                    <Target size={16} className="text-muted" />
                                    <input 
                                        type="number" 
                                        className="input-transparent" 
                                        min="1" max="100" 
                                        value={targetOee} 
                                        onChange={(e) => setTargetOee(e.target.value)} 
                                        required 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-secondary text-sm" style={{ display: 'block', marginBottom: '0.5rem' }}>Tolerância Máxima de Refugo (%)</label>
                                <div className="search-box" style={{ width: '100%' }}>
                                    <Percent size={16} className="text-muted" />
                                    <input 
                                        type="text" 
                                        className="input-transparent" 
                                        value={maxRefuse} 
                                        onChange={(e) => setMaxRefuse(e.target.value)} 
                                        required 
                                        placeholder="Ex: 0.8"
                                    />
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }} disabled={savingSettings}>
                                {savingSettings ? 'Salvando...' : 'Salvar Metas'}
                            </button>
                        </form>
                    </div>

                    {/* Invite Code Panel */}
                    <div className="glass-panel animate-slide-up">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <div className="kpi-icon-wrapper success" style={{ width: '40px', height: '40px' }}><KeyRound size={20} /></div>
                        <h3 style={{ margin: 0 }}>Código de Convite</h3>
                    </div>

                    <p className="text-sm text-secondary" style={{ marginBottom: '1.5rem' }}>
                        Compartilhe este código com seus funcionários. Eles devem usá-lo na tela de <strong>Criar Conta</strong> para entrarem automaticamente na sua empresa como Operadores.
                    </p>

                    <div className="join-code-box" onClick={copyToClipboard}>
                        {loading ? 'Carregando...' : companyDetails?.join_code || '---'}
                        <button className="btn-icon">
                            {copied ? <CheckCircle2 size={18} className="text-success" /> : <Copy size={18} />}
                        </button>
                    </div>
                    {copied && <span className="text-success text-sm" style={{ display: 'block', textAlign: 'center', marginTop: '0.5rem' }}>Código copiado!</span>}
                    </div>
                </div>

                {/* Team Members List */}
                <div className="glass-panel animate-fade-in delay-200" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="kpi-icon-wrapper primary" style={{ width: '40px', height: '40px' }}><Shield size={20} /></div>
                        <h3 style={{ margin: 0 }}>Membros da Empresa</h3>
                    </div>

                    <div className="table-responsive">
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th>Usuário</th>
                                    <th>Nível de Acesso</th>
                                    <th className="text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="3" style={{ textAlign: 'center', padding: '2rem' }}>Carregando equipe...</td></tr>
                                ) : teamMembers.length === 0 ? (
                                    <tr><td colSpan="3" style={{ textAlign: 'center', padding: '2rem' }}>Nenhum membro encontrado.</td></tr>
                                ) : (
                                    teamMembers.map(member => (
                                        <tr key={member.id} className={member.id === user.id ? 'current-user-row' : ''}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <div className="user-avatar-small">
                                                        {member.role === 'admin' ? <UserCog size={16} /> : <User size={16} />}
                                                    </div>
                                                    <div>
                                                        <strong>{member.full_name || 'Usuário Sem Nome'}</strong>
                                                        {member.id === user.id && <span className="badge badge-primary" style={{ marginLeft: '8px', fontSize: '0.65rem' }}>Você</span>}
                                                        <div className="text-sm text-secondary" style={{ fontSize: '0.8rem' }}>ID: {member.id.substring(0, 8)}...</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <select
                                                    className={`role-select ${member.role}`}
                                                    value={member.role}
                                                    onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                                    disabled={member.id === user.id}
                                                >
                                                    <option value="admin">Administrador</option>
                                                    <option value="operator">Operador</option>
                                                </select>
                                            </td>
                                            <td className="text-right actions-cell" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                <button
                                                    className="btn-icon hover-danger"
                                                    title="Remover Acesso"
                                                    onClick={() => handleRemoveMember(member.id, member.full_name)}
                                                    disabled={member.id === user.id}
                                                    style={{ opacity: member.id === user.id ? 0.3 : 1 }}
                                                >
                                                    <Trash2 size={18} className={member.id === user.id ? 'text-muted' : 'text-danger'} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            <style>{`
        .settings-container { display: flex; flex-direction: column; gap: 2rem; }
        .page-header { margin-bottom: 0.5rem; }
        
        .dashboard-content {
          display: grid;
          gap: 1.5rem;
        }
        
        .team-grid {
          grid-template-columns: minmax(300px, 1fr) 2fr;
        }

        .search-box { display: flex; align-items: center; gap: 0.5rem; background: rgba(0,0,0,0.2); padding: 0.5rem 1rem; border-radius: var(--border-radius-md); border: 1px solid var(--border-color); }
        .input-transparent { background: transparent; border: none; color: white; outline: none; width: 100%; }

        .join-code-box {
          background: rgba(46, 160, 67, 0.1);
          border: 1px dashed rgba(46, 160, 67, 0.5);
          border-radius: 8px;
          padding: 1.25rem;
          font-family: monospace;
          font-size: 1.5rem;
          font-weight: 700;
          color: #3fb950;
          text-align: center;
          letter-spacing: 2px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .join-code-box:hover {
          background: rgba(46, 160, 67, 0.15);
          border-color: #3fb950;
        }

        .table-responsive { overflow-x: auto; width: 100%; }
        .custom-table { width: 100%; border-collapse: collapse; min-width: 500px; }
        .custom-table th { text-align: left; padding: 1rem 1.5rem; color: var(--text-secondary); font-size: 0.85rem; text-transform: uppercase; border-bottom: 1px solid var(--border-color); background: rgba(0,0,0,0.2); }
        .custom-table td { padding: 1rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.95rem; vertical-align: middle; }
        
        .current-user-row { background: rgba(0, 102, 255, 0.03); }

        .user-avatar-small {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
        }

        .role-select {
          background: rgba(13, 17, 23, 0.8);
          border: 1px solid var(--border-color);
          color: white;
          padding: 0.4rem 0.75rem;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          outline: none;
        }

        .role-select:focus { border-color: var(--primary-color); }
        .role-select:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .role-select.admin { color: #58a6ff; border-color: rgba(0, 102, 255, 0.3); }
        .role-select.operator { color: #3fb950; border-color: rgba(46, 160, 67, 0.3); }

        .btn-icon { background: transparent; border: none; cursor: pointer; padding: 0.5rem; border-radius: var(--border-radius-sm); transition: var(--transition-fast); }
        .hover-danger:hover { background: rgba(239, 68, 68, 0.1); }

        @media (max-width: 900px) {
          .team-grid { grid-template-columns: 1fr; }
        }
      `}</style>
        </div>
    );
}
