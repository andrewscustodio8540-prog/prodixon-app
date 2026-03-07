import { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Tag, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function Parts() {
    const { user } = useAuth();
    const [parts, setParts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    // Form state
    const [partNumber, setPartNumber] = useState('');
    const [name, setName] = useState('');

    useEffect(() => {
        if (user?.company_id) {
            fetchParts();
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchParts = async () => {
        try {
            const { data, error } = await supabase
                .from('parts')
                .select('*')
                .eq('company_id', user.company_id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setParts(data || []);
        } catch (error) {
            console.error("Erro ao carregar peças", error);
            alert("Erro ao carregar peças: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPart = async (e) => {
        e.preventDefault();
        if (!user?.company_id) {
            alert("Erro: Usuário não vinculado a uma empresa.");
            return;
        }

        try {
            const { data, error } = await supabase
                .from('parts')
                .insert([
                    {
                        company_id: user.company_id,
                        part_number: partNumber,
                        name: name
                    }
                ])
                .select();

            if (error) throw error;

            setParts([data[0], ...parts]);
            setIsAdding(false);
            setPartNumber('');
            setName('');
            alert("Peça castrada com sucesso!");
        } catch (error) {
            console.error("Erro ao adicionar peça", error);
            alert("Erro ao salvar peça: " + error.message);
        }
    };

    const handleDeletePart = async (id) => {
        if (!window.confirm("Certeza que deseja remover esta peça?")) return;

        try {
            const { error } = await supabase
                .from('parts')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setParts(parts.filter(p => p.id !== id));
        } catch (error) {
            console.error("Erro ao remover peça", error);
            alert("Erro ao remover: " + error.message);
        }
    };

    return (
        <div className="section-container parts-container animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="text-gradient">Peças (Part Numbers)</h1>
                    <p className="text-secondary">Gerencie o catálogo de peças produzidas</p>
                </div>
                {!isAdding && (
                    <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
                        <Plus size={18} /> Nova Peça
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="glass-panel add-form-panel animate-slide-up">
                    <h3 className="section-title">Cadastrar Nova Peça</h3>
                    <form onSubmit={handleAddPart} className="add-form">
                        <div className="form-group flex-1">
                            <label className="form-label">Part Number (Código)</label>
                            <div className="input-with-icon">
                                <Tag className="input-icon" size={16} />
                                <input
                                    type="text"
                                    className="input-field pl-4"
                                    placeholder="Ex: PN-1025-X"
                                    value={partNumber}
                                    onChange={(e) => setPartNumber(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group flex-1">
                            <label className="form-label">Nome / Descrição</label>
                            <div className="input-with-icon">
                                <FileText className="input-icon" size={16} />
                                <input
                                    type="text"
                                    className="input-field pl-4"
                                    placeholder="Ex: Eixo Traseiro Menor"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-actions" style={{ alignItems: 'flex-end', display: 'flex', paddingBottom: '0.2rem' }}>
                            <button type="button" className="btn btn-outline" onClick={() => setIsAdding(false)}>
                                Cancelar
                            </button>
                            <button type="submit" className="btn btn-primary">
                                Salvar Peça
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="glass-panel list-panel mt-4">
                {loading ? (
                    <p className="text-center text-muted py-4">Carregando peças...</p>
                ) : parts.length === 0 ? (
                    <div className="empty-state text-center py-4">
                        <Tag size={48} className="text-muted mx-auto mb-2" />
                        <p className="text-muted">Nenhuma peça cadastrada ainda.</p>
                        <p className="text-sm text-secondary">Clique em "Nova Peça" para começar a rastrear o que você produz.</p>
                    </div>
                ) : (
                    <div className="grid-list">
                        {parts.map(part => (
                            <div key={part.id} className="card-item glass-panel">
                                <div className="card-item-header">
                                    <h4 className="card-item-title">{part.part_number}</h4>
                                    <button
                                        className="btn-icon hover-danger"
                                        onClick={() => handleDeletePart(part.id)}
                                        title="Remover"
                                    >
                                        <Trash2 size={16} className="text-danger" />
                                    </button>
                                </div>
                                <div className="card-item-body">
                                    <p className="text-secondary">{part.name}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style>{`
            .parts-container { display: flex; flex-direction: column; gap: 2rem; }
            .page-header { display: flex; justify-content: space-between; align-items: flex-end; }
            .add-form-panel { padding: 1.5rem; border-left: 4px solid var(--primary-color); }
            .add-form { display: flex; gap: 1rem; flex-wrap: wrap; }
            .list-panel { padding: 1.5rem; }
            .grid-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
            .card-item { padding: 1.25rem; background: rgba(255,255,255,0.03); border-radius: var(--border-radius-md); border: 1px solid var(--border-color); }
            .card-item-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; }
            .card-item-title { font-size: 1.1rem; font-weight: 600; }
            .btn-icon { background: none; border: none; cursor: pointer; padding: 0.4rem; border-radius: 4px; transition: var(--transition-fast); }
            .hover-danger:hover { background: rgba(239, 68, 68, 0.15); }
            .mt-4 { margin-top: 1.5rem; }
            .empty-state { padding: 3rem 1rem; }
            .mx-auto { margin-left: auto; margin-right: auto; }
            .mb-2 { margin-bottom: 0.5rem; }
            `}</style>
        </div>
    );
}
