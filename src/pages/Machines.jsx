import { useState, useEffect } from 'react';
import { Plus, Search, MoreVertical, Factory, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function Machines() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newMachine, setNewMachine] = useState({ code: '', name: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ code: '', name: '', status: '' });
  const { user } = useAuth();

  useEffect(() => {
    if (user?.company_id) {
      fetchMachines();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchMachines = async () => {
    try {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMachines(data || []);
    } catch (err) {
      console.error("Erro ao buscar máquinas", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMachine = async (e) => {
    e.preventDefault();
    if (!user?.company_id) {
      alert("Ação negada: O seu usuário ainda não está vinculado a uma 'Empresa' no banco de dados. Configure o 'company_id' na tabela 'profiles'.");
      return;
    }
    try {
      const { data, error } = await supabase
        .from('machines')
        .insert([{
          company_id: user.company_id,
          code: newMachine.code,
          name: newMachine.name,
          status: 'Ativa'
        }])
        .select();

      if (error) throw error;
      setMachines([data[0], ...machines]);
      setIsAdding(false);
      setNewMachine({ code: '', name: '' });
    } catch (err) {
      console.error("Erro ao adicionar máquina", err);
      alert(`Erro ao adicionar máquina: ${err.message || 'Verifique se o código já existe ou se você tem permissão.'}`);
    }
  };

  const handleEdit = (machine) => {
    setEditingId(machine.id);
    setEditForm({ code: machine.code, name: machine.name, status: machine.status });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ code: '', name: '', status: '' });
  };

  const handleSaveEdit = async (id) => {
    try {
      const { error } = await supabase
        .from('machines')
        .update({
          code: editForm.code,
          name: editForm.name,
          status: editForm.status
        })
        .eq('id', id);

      if (error) throw error;

      setMachines(machines.map(mq => mq.id === id ? { ...mq, ...editForm } : mq));
      setEditingId(null);
      alert('Máquina atualizada com sucesso!');
    } catch (err) {
      console.error("Erro ao atualizar máquina", err);
      alert(`Erro ao atualizar: ${err.message}`);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Tem certeza que deseja excluir a máquina "${name}"? Essa ação não pode ser desfeita e pode falhar se existirem apontamentos de turno vinculados a ela.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('machines')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMachines(machines.filter(mq => mq.id !== id));
      alert('Máquina excluída com sucesso!');
    } catch (err) {
      console.error("Erro ao excluir máquina", err);

      // Foreign key violation mapping
      if (err.message?.includes('violates foreign key constraint') || err.code === '23503') {
        alert(`Erro: Você não pode excluir esta máquina pois já existem Lançamentos de Turno vinculados a ela.\nRecomendação: Edite a máquina e mude o status para 'Inativa'.`);
      } else {
        alert(`Erro ao excluir: ${err.message}`);
      }
    }
  };

  return (
    <div className="machines-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-gradient">Gestão de Máquinas</h1>
          <p className="text-secondary">Cadastre e gerencie as metas do maquinário</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAdding(!isAdding)}>
          <Plus size={18} /> Nova Máquina
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddMachine} className="glass-panel animate-slide-up" style={{ padding: '1.5rem', marginBottom: '0.5rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)', fontSize: '1.1rem' }}>Cadastrar Nova Máquina</h3>
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-group custom-input" style={{ marginBottom: 0 }}>
              <input type="text" className="input-field" placeholder="Código (ex: MQ-01)" required value={newMachine.code} onChange={e => setNewMachine({ ...newMachine, code: e.target.value })} style={{ paddingLeft: '1rem' }} />
            </div>
            <div className="form-group custom-input" style={{ marginBottom: 0 }}>
              <input type="text" className="input-field" placeholder="Nome da Máquina" required value={newMachine.name} onChange={e => setNewMachine({ ...newMachine, name: e.target.value })} style={{ paddingLeft: '1rem' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline" onClick={() => setIsAdding(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Salvar Máquina</button>
          </div>
        </form>
      )}

      <div className="glass-panel table-container">
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={18} className="text-muted" />
            <input type="text" placeholder="Buscar máquina..." className="input-transparent" />
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Cód</th>
              <th>Nome da Máquina</th>
              <th>Status</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {machines.map((mq, index) => (
              mq.id === editingId ? (
                <tr key={`edit-${mq.id}`} className="animate-fade-in" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                  <td>
                    <input type="text" className="input-field" value={editForm.code} onChange={e => setEditForm(prev => ({ ...prev, code: e.target.value }))} style={{ width: '100px', padding: '0.4rem' }} />
                  </td>
                  <td>
                    <input type="text" className="input-field" value={editForm.name} onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))} style={{ padding: '0.4rem' }} />
                  </td>
                  <td>
                    <select className="input-field" value={editForm.status} onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))} style={{ padding: '0.4rem', width: '120px' }}>
                      <option value="Ativa">Ativa</option>
                      <option value="Inativa">Inativa</option>
                    </select>
                  </td>
                  <td className="text-right actions-cell">
                    <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => handleSaveEdit(mq.id)}>Salvar</button>
                    <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={handleCancelEdit}>Cancelar</button>
                  </td>
                </tr>
              ) : (
                <tr key={mq.id} className="animate-slide-up" style={{ animationDelay: (index * 10) + 'ms' }}>
                  <td><strong>{mq.code}</strong></td>
                  <td>
                    <div className="flex-center gap-2">
                      <Factory size={16} className="text-primary" />
                      {mq.name}
                    </div>
                  </td>
                  <td>
                    <span className={"badge " + (mq.status === 'Ativa' ? 'badge-success' : 'badge-danger')}>
                      {mq.status}
                    </span>
                  </td>
                  <td className="text-right actions-cell">
                    <button className="btn-icon" onClick={() => handleEdit(mq)} title="Editar"><Edit2 size={16} /></button>
                    <button className="btn-icon text-danger" onClick={() => handleDelete(mq.id, mq.name)} title="Excluir"><Trash2 size={16} /></button>
                  </td>
                </tr>
              )
            ))}
            {machines.length === 0 && !loading && (
              <tr>
                <td colSpan="5" className="text-center py-4 text-muted">Nenhuma máquina cadastrada.</td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan="5" className="text-center py-4 text-muted">Carregando máquinas...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .machines-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .table-container {
          padding: 1.5rem;
          overflow: hidden;
        }

        .table-toolbar {
          margin-bottom: 1.5rem;
          display: flex;
          justify-content: space-between;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(0,0,0,0.2);
          padding: 0.5rem 1rem;
          border-radius: var(--border-radius-md);
          border: 1px solid var(--border-color);
          width: 300px;
        }

        .input-transparent {
          background: transparent;
          border: none;
          color: white;
          outline: none;
          width: 100%;
        }

        .custom-table {
          width: 100%;
          border-collapse: collapse;
        }

        .custom-table th {
          text-align: left;
          padding: 1rem;
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 0.85rem;
          text-transform: uppercase;
          border-bottom: 2px solid var(--border-color);
        }

        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .py-4 { padding-top: 2rem; padding-bottom: 2rem; }

        .custom-table td {
          padding: 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          font-size: 0.95rem;
        }

        .custom-table tbody tr:hover {
          background: rgba(255,255,255,0.02);
        }

        .flex-center {
          display: flex;
          align-items: center;
        }

        .gap-2 { gap: 0.5rem; }

        .btn-icon {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: var(--border-radius-sm);
          transition: var(--transition-fast);
        }

        .btn-icon:hover {
          background: rgba(255,255,255,0.1);
          color: white;
        }

        .text-danger { color: var(--danger-color) !important; }
        .text-primary { color: var(--primary-color); }
        
        .actions-cell {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
        }
      `}</style>
    </div>
  );
}
