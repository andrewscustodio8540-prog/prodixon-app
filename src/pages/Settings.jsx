import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Plus, Trash2, Edit2, Check, X, Layers, AlertOctagon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('downtime');

    // Downtime State
    const [downtimeReasons, setDowntimeReasons] = useState([]);
    const [loadingDowntime, setLoadingDowntime] = useState(true);
    const [isAddingDowntime, setIsAddingDowntime] = useState(false);
    const [newDowntime, setNewDowntime] = useState({ category: 'Manutenção', reason: '', active: true });

    // Scrap State
    const [scrapReasons, setScrapReasons] = useState([]);
    const [loadingScrap, setLoadingScrap] = useState(true);
    const [isAddingScrap, setIsAddingScrap] = useState(false);
    const [newScrap, setNewScrap] = useState({ reason: '', active: true });

    const CATEGORIES = ['Manutenção', 'Utilidades', 'Operacional', 'Setup', 'Outros'];

    useEffect(() => {
        if (user?.company_id) {
            if (activeTab === 'downtime') fetchDowntimeReasons();
            else fetchScrapReasons();
        }
    }, [user, activeTab]);

    // --- DOWNTIME FUNCTIONS ---
    const fetchDowntimeReasons = async () => {
        setLoadingDowntime(true);
        try {
            const { data, error } = await supabase
                .from('downtime_reasons')
                .select('*')
                .order('category', { ascending: true })
                .order('reason', { ascending: true });

            if (error) throw error;
            setDowntimeReasons(data || []);
        } catch (err) {
            console.error("Erro ao buscar motivos de parada", err);
        } finally {
            setLoadingDowntime(false);
        }
    };

    const handleAddDowntime = async (e) => {
        e.preventDefault();
        if (!user?.company_id) return;
        try {
            const { data, error } = await supabase
                .from('downtime_reasons')
                .insert([{
                    company_id: user.company_id,
                    category: newDowntime.category,
                    reason: newDowntime.reason,
                    active: newDowntime.active
                }])
                .select();

            if (error) {
                if (error.code === '23505') throw new Error("Esse motivo já existe nesta categoria.");
                throw error;
            }

            setDowntimeReasons([...downtimeReasons, data[0]].sort((a, b) => a.category.localeCompare(b.category)));
            setIsAddingDowntime(false);
            setNewDowntime({ category: 'Manutenção', reason: '', active: true });
        } catch (err) {
            alert(`Erro: ${err.message}`);
        }
    };

    const handleToggleDowntimeActive = async (id, currentStatus) => {
        try {
            const { error } = await supabase
                .from('downtime_reasons')
                .update({ active: !currentStatus })
                .eq('id', id);
            if (error) throw error;
            setDowntimeReasons(downtimeReasons.map(r => r.id === id ? { ...r, active: !currentStatus } : r));
        } catch (err) {
            alert(`Erro ao atualizar status: ${err.message}`);
        }
    };

    const handleDeleteDowntime = async (id, reason) => {
        if (!window.confirm(`Excluir permanentemente o motivo: "${reason}"?`)) return;
        try {
            const { error } = await supabase.from('downtime_reasons').delete().eq('id', id);
            if (error) throw error;
            setDowntimeReasons(downtimeReasons.filter(r => r.id !== id));
        } catch (err) {
            alert(`Erro: ${err.message}`);
        }
    };

    // --- SCRAP FUNCTIONS ---
    const fetchScrapReasons = async () => {
        setLoadingScrap(true);
        try {
            const { data, error } = await supabase
                .from('scrap_reasons')
                .select('*')
                .order('reason', { ascending: true });

            if (error) throw error;
            setScrapReasons(data || []);
        } catch (err) {
            console.error("Erro ao buscar motivos de refugo", err);
        } finally {
            setLoadingScrap(false);
        }
    };

    const handleAddScrap = async (e) => {
        e.preventDefault();
        if (!user?.company_id) return;
        try {
            const { data, error } = await supabase
                .from('scrap_reasons')
                .insert([{
                    company_id: user.company_id,
                    reason: newScrap.reason,
                    active: newScrap.active
                }])
                .select();

            if (error) {
                if (error.code === '23505') throw new Error("Esse motivo de refugo já está cadastrado.");
                throw error;
            }

            setScrapReasons([...scrapReasons, data[0]].sort((a, b) => a.reason.localeCompare(b.reason)));
            setIsAddingScrap(false);
            setNewScrap({ reason: '', active: true });
        } catch (err) {
            alert(`Erro: ${err.message}`);
        }
    };

    const handleToggleScrapActive = async (id, currentStatus) => {
        try {
            const { error } = await supabase
                .from('scrap_reasons')
                .update({ active: !currentStatus })
                .eq('id', id);
            if (error) throw error;
            setScrapReasons(scrapReasons.map(r => r.id === id ? { ...r, active: !currentStatus } : r));
        } catch (err) {
            alert(`Erro ao atualizar status: ${err.message}`);
        }
    };

    const handleDeleteScrap = async (id, reason) => {
        if (!window.confirm(`Excluir permanentemente o refugo: "${reason}"?`)) return;
        try {
            const { error } = await supabase.from('scrap_reasons').delete().eq('id', id);
            if (error) throw error;
            setScrapReasons(scrapReasons.filter(r => r.id !== id));
        } catch (err) {
            alert(`Erro: ${err.message}`);
        }
    };

    return (
        <div className="settings-container animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="text-gradient">Configurações Gerais</h1>
                    <p className="text-secondary">Gerencie suas listas personalizadas</p>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
                <div className="tabs-header">
                    <button
                        className={`tab-btn ${activeTab === 'downtime' ? 'active' : ''}`}
                        onClick={() => setActiveTab('downtime')}
                    >
                        <Layers size={18} /> Paradas de Máquina
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'scrap' ? 'active' : ''}`}
                        onClick={() => setActiveTab('scrap')}
                    >
                        <AlertOctagon size={18} /> Motivos de Refugo
                    </button>
                </div>

                <div className="tab-content" style={{ padding: '2rem' }}>
                    {/* Aba de Paradas de Máquina */}
                    {activeTab === 'downtime' && (
                        <div className="animate-fade-in">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0, fontWeight: 600 }}>Causas de Parada de Máquina</h3>
                                <button className="btn btn-primary btn-small" onClick={() => setIsAddingDowntime(!isAddingDowntime)}>
                                    <Plus size={16} /> Nova Parada
                                </button>
                            </div>

                            {isAddingDowntime && (
                                <form onSubmit={handleAddDowntime} className="glass-panel animate-slide-up" style={{ padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid var(--primary-color)' }}>
                                    <div className="form-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                            <label className="form-label text-sm">Categoria</label>
                                            <select required className="input-field" value={newDowntime.category} onChange={(e) => setNewDowntime({ ...newDowntime, category: e.target.value })}>
                                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                                            <label className="form-label text-sm">Motivo Específico</label>
                                            <input required type="text" className="input-field" placeholder="Ex: Falta de Ferramenta" value={newDowntime.reason} onChange={(e) => setNewDowntime({ ...newDowntime, reason: e.target.value })} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                        <button type="button" className="btn btn-outline" onClick={() => setIsAddingDowntime(false)}>Cancelar</button>
                                        <button type="submit" className="btn btn-primary">Salvar Motivo</button>
                                    </div>
                                </form>
                            )}

                            <div className="table-responsive">
                                <table className="custom-table">
                                    <thead>
                                        <tr>
                                            <th>Categoria</th>
                                            <th>Motivo Específico</th>
                                            <th>Status</th>
                                            <th className="text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loadingDowntime ? (
                                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Carregando...</td></tr>
                                        ) : downtimeReasons.length === 0 ? (
                                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Nenhum motivo cadastrado. As listas padrões serão usadas caso esteja vazio.</td></tr>
                                        ) : (
                                            downtimeReasons.map(r => (
                                                <tr key={r.id}>
                                                    <td><strong>{r.category}</strong></td>
                                                    <td>{r.reason}</td>
                                                    <td>
                                                        <span
                                                            className={`badge ${r.active ? 'badge-success' : 'badge-danger'}`}
                                                            style={{ cursor: 'pointer' }}
                                                            onClick={() => handleToggleDowntimeActive(r.id, r.active)}
                                                            title="Clique para alternar status"
                                                        >
                                                            {r.active ? 'Ativo' : 'Inativo'}
                                                        </span>
                                                    </td>
                                                    <td className="text-right actions-cell">
                                                        <button className="btn-icon hover-danger" onClick={() => handleDeleteDowntime(r.id, r.reason)} title="Excluir"><Trash2 size={16} className="text-danger" /></button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Aba de Motivos de Refugo */}
                    {activeTab === 'scrap' && (
                        <div className="animate-fade-in">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0, fontWeight: 600 }}>Motivos de Não Conformidades / Refugo</h3>
                                <button className="btn btn-primary btn-small" onClick={() => setIsAddingScrap(!isAddingScrap)}>
                                    <Plus size={16} /> Novo Refugo
                                </button>
                            </div>

                            {isAddingScrap && (
                                <form onSubmit={handleAddScrap} className="glass-panel animate-slide-up" style={{ padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid var(--danger-color)' }}>
                                    <div className="form-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                            <label className="form-label text-sm text-danger">Motivo de Refugo</label>
                                            <input required type="text" className="input-field border-danger" placeholder="Ex: Porosidade excessiva" value={newScrap.reason} onChange={(e) => setNewScrap({ ...newScrap, reason: e.target.value })} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                        <button type="button" className="btn btn-outline btn-small" onClick={() => setIsAddingScrap(false)}>Cancelar</button>
                                        <button type="submit" className="btn btn-primary btn-small" style={{ background: 'var(--danger-color)' }}>Salvar Refugo</button>
                                    </div>
                                </form>
                            )}

                            <div className="table-responsive">
                                <table className="custom-table">
                                    <thead>
                                        <tr>
                                            <th>Motivo de Refugo</th>
                                            <th>Status</th>
                                            <th className="text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loadingScrap ? (
                                            <tr><td colSpan="3" style={{ textAlign: 'center', padding: '2rem' }}>Carregando...</td></tr>
                                        ) : scrapReasons.length === 0 ? (
                                            <tr><td colSpan="3" style={{ textAlign: 'center', padding: '2rem' }}>Nenhum motivo cadastrado. A lista padrão será usada caso esteja vazio.</td></tr>
                                        ) : (
                                            scrapReasons.map(r => (
                                                <tr key={r.id}>
                                                    <td><strong>{r.reason}</strong></td>
                                                    <td>
                                                        <span
                                                            className={`badge ${r.active ? 'badge-success' : 'badge-danger'}`}
                                                            style={{ cursor: 'pointer' }}
                                                            onClick={() => handleToggleScrapActive(r.id, r.active)}
                                                            title="Clique para alternar status"
                                                        >
                                                            {r.active ? 'Ativo' : 'Inativo'}
                                                        </span>
                                                    </td>
                                                    <td className="text-right actions-cell">
                                                        <button className="btn-icon hover-danger" onClick={() => handleDeleteScrap(r.id, r.reason)} title="Excluir"><Trash2 size={16} className="text-danger" /></button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
        .settings-container { display: flex; flex-direction: column; gap: 2rem; }
        .page-header { margin-bottom: 0.5rem; }
        
        .tabs-header {
          display: flex;
          border-bottom: 1px solid var(--border-color);
          background: rgba(0,0,0,0.2);
        }
        
        .tab-btn {
          padding: 1rem 2rem;
          background: none;
          border: none;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
          border-bottom: 2px solid transparent;
        }
        
        .tab-btn:hover { color: white; background: rgba(255,255,255,0.02); }
        .tab-btn.active { color: var(--primary-color); border-bottom-color: var(--primary-color); background: rgba(0, 102, 255, 0.05); }
        
        .table-responsive { overflow-x: auto; width: 100%; }
        .custom-table { width: 100%; border-collapse: collapse; min-width: 600px; }
        .custom-table th { text-align: left; padding: 1rem; color: var(--text-secondary); font-size: 0.85rem; text-transform: uppercase; border-bottom: 1px solid var(--border-color); }
        .custom-table td { padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.95rem; }
        
        .text-right { text-align: right; }
        .actions-cell { display: flex; justify-content: flex-end; gap: 0.5rem; }
        .btn-icon { background: transparent; border: none; cursor: pointer; padding: 0.5rem; border-radius: 4px; position: relative; z-index: 10; pointer-events: auto; }
        .btn-icon:hover { background: rgba(255,255,255,0.1); }
        
        .border-danger { border-color: rgba(248, 81, 73, 0.5) !important; }
        .border-danger:focus { border-color: var(--danger-color) !important; box-shadow: 0 0 0 3px rgba(248, 81, 73, 0.2) !important; }
        
        @media (max-width: 768px) {
          .tabs-header { flex-direction: column; }
          .form-row { flex-direction: column; }
        }
      `}</style>
        </div>
    );
}
