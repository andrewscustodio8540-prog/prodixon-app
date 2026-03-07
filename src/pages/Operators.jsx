import { useState, useEffect } from 'react';
import { Plus, Search, Users, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function Operators() {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newOperator, setNewOperator] = useState({ registration_code: '', name: '' });
  const { user } = useAuth();

  useEffect(() => {
    if (user?.company_id) {
      fetchOperators();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchOperators = async () => {
    try {
      const { data, error } = await supabase
        .from('operators')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOperators(data || []);
    } catch (err) {
      console.error("Erro ao buscar operadores", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOperator = async (e) => {
    e.preventDefault();
    if (!user?.company_id) {
      alert("Ação negada: O seu usuário ainda não está vinculado a uma 'Empresa' no banco de dados. Configure o 'company_id' na tabela 'profiles'.");
      return;
    }
    try {
      const { data, error } = await supabase
        .from('operators')
        .insert([{
          company_id: user.company_id,
          registration_code: newOperator.registration_code,
          name: newOperator.name,
          active: true
        }])
        .select();

      if (error) throw error;
      setOperators([data[0], ...operators]);
      setIsAdding(false);
      setNewOperator({ registration_code: '', name: '' });
    } catch (err) {
      console.error("Erro ao adicionar operador", err);
      alert(`Erro ao adicionar operador: ${err.message || 'Verifique se a matrícula já existe ou se você tem permissão.'}`);
    }
  };

  return (
    <div className="operators-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-gradient">Gestão de Operadores</h1>
          <p className="text-secondary">Controle da equipe de chão de fábrica</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAdding(!isAdding)}>
          <Plus size={18} /> Novo Operador
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddOperator} className="glass-panel animate-slide-up" style={{ padding: '1.5rem', marginBottom: '0.5rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)', fontSize: '1.1rem' }}>Cadastrar Novo Operador</h3>
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-group custom-input" style={{ marginBottom: 0 }}>
              <input type="text" className="input-field" placeholder="Matrícula" required value={newOperator.registration_code} onChange={e => setNewOperator({ ...newOperator, registration_code: e.target.value })} style={{ paddingLeft: '1rem' }} />
            </div>
            <div className="form-group custom-input" style={{ marginBottom: 0 }}>
              <input type="text" className="input-field" placeholder="Nome Completo" required value={newOperator.name} onChange={e => setNewOperator({ ...newOperator, name: e.target.value })} style={{ paddingLeft: '1rem' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline" onClick={() => setIsAdding(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Salvar Operador</button>
          </div>
        </form>
      )}

      <div className="glass-panel table-container">
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={18} className="text-muted" />
            <input type="text" placeholder="Buscar operador..." className="input-transparent" />
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Matrícula</th>
              <th>Nome Completo</th>
              <th>Cargo</th>
              <th>Turno Padrão</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {operators.map((op, index) => (
              <tr key={op.id} className="animate-slide-up" style={{ animationDelay: (index * 10) + 'ms' }}>
                <td><strong>{op.registration_code}</strong></td>
                <td>
                  <div className="flex-center gap-2">
                    <div className="avatar-small">
                      {op.name.charAt(0)}
                    </div>
                    {op.name}
                  </div>
                </td>
                <td><span className="text-secondary">Operador de Máquina</span></td>
                <td><span className={"badge " + (op.active ? 'badge-primary' : 'badge-danger')}>{op.active ? 'Ativo' : 'Inativo'}</span></td>
                <td className="text-right actions-cell">
                  <button className="btn-icon"><Edit2 size={16} /></button>
                  <button className="btn-icon text-danger"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {operators.length === 0 && !loading && (
              <tr>
                <td colSpan="5" className="text-center py-4 text-muted" style={{ textAlign: 'center', padding: '2rem' }}>Nenhum operador cadastrado.</td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan="5" className="text-center py-4 text-muted" style={{ textAlign: 'center', padding: '2rem' }}>Carregando operadores...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        /* Reuse most tables styles from Machines via global composition, but specific ones below */
        .operators-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        
        /* Similar Layouts extracted to avoid repetition in large projects, kept inline here for MVP */
        .page-header { display: flex; justify-content: space-between; align-items: center; }
        .table-container { padding: 1.5rem; overflow: hidden; }
        .table-toolbar { margin-bottom: 1.5rem; display: flex; justify-content: space-between; }
        .search-box { display: flex; align-items: center; gap: 0.5rem; background: rgba(0,0,0,0.2); padding: 0.5rem 1rem; border-radius: var(--border-radius-md); border: 1px solid var(--border-color); width: 300px; }
        .input-transparent { background: transparent; border: none; color: white; outline: none; width: 100%; }
        
        .custom-table { width: 100%; border-collapse: collapse; }
        .custom-table th { text-align: left; padding: 1rem; color: var(--text-secondary); font-weight: 600; font-size: 0.85rem; text-transform: uppercase; border-bottom: 2px solid var(--border-color); }
        .custom-table td { padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.95rem; }
        .custom-table tbody tr:hover { background: rgba(255,255,255,0.02); }
        
        .text-right { text-align: right; }
        .flex-center { display: flex; align-items: center; }
        .gap-2 { gap: 0.5rem; }
        
        .avatar-small {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--primary-color);
        }

        .btn-icon { background: transparent; border: none; color: var(--text-secondary); cursor: pointer; padding: 0.5rem; border-radius: var(--border-radius-sm); transition: var(--transition-fast); }
        .btn-icon:hover { background: rgba(255,255,255,0.1); color: white; }
        .text-danger { color: var(--danger-color) !important; }
        
        .actions-cell {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
        }
      `}</style>
    </div >
  );
}
