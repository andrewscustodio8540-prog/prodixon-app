import { useState, useEffect } from 'react';
import { Save, Calendar, Clock, Calculator, ClipboardList, Plus, Trash2, AlertTriangle, Timer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function ShiftEntry() {
    const { user } = useAuth();
    const [machines, setMachines] = useState([]);
    const [operators, setOperators] = useState([]);
    const [parts, setParts] = useState([]);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        date: new Date().toLocaleDateString('en-CA'),
        shiftPreset: '1',
        startTime: '06:00',
        endTime: '14:00',
        machine: '',
        operator: '',
        part: '',
        target: '',
        produced: '',
        notes: '',
        downtimes: [],
        scraps: []
    });

    const DOWNTIME_CATEGORIES = ['Manutenção', 'Utilidades', 'Operacional'];
    const DOWNTIME_REASONS = {
        'Manutenção': ['Fresa', 'Alarme máquina', 'Prensa pneumática', 'Lavadora', 'Troca de inserto/ferramenta'],
        'Utilidades': ['Ar Comprimido/Energia', 'Falta de embalagem', 'Fluído refrigerante', 'Falta de Inserto/ferramenta', 'Falta de instrumentos', 'Falta de componentes almoxarifado', 'Falta peças brutas'],
        'Operacional': ['Limpeza', 'Refeição', 'Correção de medida', 'Falta de operador', 'Setup/Preparação', 'Reunião Treinamento', 'Outros']
    };

    const SCRAP_REASONS = [
        'Porosidade', 'Usinagem deslocada', 'Dimensional', 'Falta de material',
        'Falha de Usinagem', 'Rebarba', 'Solda fria', 'Trinca', 'Batida',
        'Agarre', 'Vazamento Alto', 'Vazamento - impregna', 'Outros'
    ];

    useEffect(() => {
        if (user?.company_id) {
            fetchInitialData();
        }
    }, [user]);

    const fetchInitialData = async () => {
        try {
            const [machinesRes, operatorsRes, partsRes] = await Promise.all([
                supabase.from('machines').select('*').eq('status', 'Ativa'),
                supabase.from('operators').select('*').eq('active', true),
                supabase.from('parts').select('*')
            ]);

            if (machinesRes.error) throw machinesRes.error;
            if (operatorsRes.error) throw operatorsRes.error;
            if (partsRes.error) throw partsRes.error;

            setMachines(machinesRes.data || []);
            setOperators(operatorsRes.data || []);
            setParts(partsRes.data || []);
        } catch (error) {
            console.error("Erro ao carregar dados iniciais", error);
        }
    };

    // Derived state calculations
    const producedNum = Number(formData.produced) || 0;

    // Total refuse is now calculated from the sum of all scrap entries
    const refuseNum = formData.scraps.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

    const netProduction = Math.max(0, producedNum - refuseNum);

    const target = Number(formData.target) || 0;
    const efficiency = target > 0 ? ((netProduction / target) * 100).toFixed(1) : 0;

    const handleMachineChange = (e) => {
        const machineId = e.target.value;
        const selectedM = machines.find(m => m.id === machineId);
        setFormData({
            ...formData,
            machine: machineId,
            target: ''
        });
    };

    const handleShiftPresetChange = (e) => {
        const preset = e.target.value;
        let start = formData.startTime;
        let end = formData.endTime;

        if (preset === '1') { start = '06:00'; end = '14:00'; }
        else if (preset === '2') { start = '14:00'; end = '22:00'; }
        else if (preset === '3') { start = '22:00'; end = '06:00'; }
        else if (preset === 'comercial') { start = '08:00'; end = '18:00'; }

        setFormData({
            ...formData,
            shiftPreset: preset,
            startTime: start,
            endTime: end
        });
    };

    // --- Actions for Paradas (Downtime) ---
    const handleAddDowntime = () => {
        setFormData({
            ...formData,
            downtimes: [...formData.downtimes, { category: '', reason: '', minutes: '' }]
        });
    };

    const handleRemoveDowntime = (index) => {
        const newDowntimes = formData.downtimes.filter((_, i) => i !== index);
        setFormData({ ...formData, downtimes: newDowntimes });
    };

    const handleDowntimeChange = (index, field, value) => {
        const newDowntimes = [...formData.downtimes];
        newDowntimes[index][field] = value;
        // Se mudou a categoria, reseta o motivo
        if (field === 'category') newDowntimes[index].reason = '';
        setFormData({ ...formData, downtimes: newDowntimes });
    };

    // --- Actions for Não Conformidades (Scrap) ---
    const handleAddScrap = () => {
        setFormData({
            ...formData,
            scraps: [...formData.scraps, { reason: '', quantity: '' }]
        });
    };

    const handleRemoveScrap = (index) => {
        const newScraps = formData.scraps.filter((_, i) => i !== index);
        setFormData({ ...formData, scraps: newScraps });
    };

    const handleScrapChange = (index, field, value) => {
        const newScraps = [...formData.scraps];
        newScraps[index][field] = value;
        setFormData({ ...formData, scraps: newScraps });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!user?.company_id) {
            alert("Ação negada: O seu usuário ainda não está vinculado a uma 'Empresa' no banco de dados. Configure o 'company_id' na tabela 'profiles'.");
            return;
        }

        if (!formData.machine || !formData.operator || !formData.part) {
            alert("Selecione máquina, operador e peça.");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.from('shifts').insert([{
                company_id: user.company_id,
                date: formData.date,
                shift_number: `${formData.startTime} às ${formData.endTime}`,
                machine_id: formData.machine,
                operator_id: formData.operator,
                part_id: formData.part,
                target: target,
                produced_gross: producedNum,
                refuse: refuseNum,
                notes: formData.notes,
                downtimes: formData.downtimes,
                scraps: formData.scraps,
                created_by: user.id
            }]);

            if (error) throw error;

            alert('Turno finalizado e salvo com sucesso!');
            setFormData({ ...formData, target: '', produced: '', notes: '', downtimes: [], scraps: [] });
        } catch (err) {
            console.error("Erro ao salvar turno", err);
            alert('Erro ao salvar o turno. ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="shift-entry-container animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="text-gradient">Fechamento de Turno</h1>
                    <p className="text-secondary">Lançamento de produção e refugo</p>
                </div>
            </div>

            <div className="entry-content">
                <form onSubmit={handleSubmit} className="entry-form glass-panel animate-slide-up">
                    <h3 className="section-title"><ClipboardList size={20} /> Dados do Turno</h3>

                    <div className="form-row">
                        <div className="form-group flex-1">
                            <label className="form-label">Data</label>
                            <div className="input-with-icon">
                                <Calendar className="input-icon" size={16} />
                                <input
                                    type="date"
                                    className="input-field pl-4"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group flex-1">
                            <label className="form-label">Turno (Atalho)</label>
                            <div className="input-with-icon">
                                <Clock className="input-icon" size={16} />
                                <select
                                    className="input-field pl-4"
                                    value={formData.shiftPreset}
                                    onChange={handleShiftPresetChange}
                                >
                                    <option value="1">Turno 1</option>
                                    <option value="2">Turno 2</option>
                                    <option value="3">Turno 3</option>
                                    <option value="comercial">Comercial</option>
                                    <option value="custom">Personalizado</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group flex-1">
                            <label className="form-label">Horário do Turno</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <div className="input-with-icon" style={{ flex: 1 }}>
                                    <Clock className="input-icon" size={16} />
                                    <input
                                        type="time"
                                        className="input-field pl-4"
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                        required
                                    />
                                </div>
                                <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>até</span>
                                <div className="input-with-icon" style={{ flex: 1 }}>
                                    <Clock className="input-icon" size={16} />
                                    <input
                                        type="time"
                                        className="input-field pl-4"
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group flex-1">
                            <label className="form-label">Máquina</label>
                            <select
                                className="input-field"
                                value={formData.machine}
                                onChange={handleMachineChange}
                                required
                            >
                                <option value="">Selecione uma máquina...</option>
                                {machines.map(mq => (
                                    <option key={mq.id} value={mq.id}>{mq.code} - {mq.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group flex-1">
                            <label className="form-label">Operador</label>
                            <select
                                className="input-field"
                                value={formData.operator}
                                onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                                required
                            >
                                <option value="">Selecione o operador...</option>
                                {operators.map(op => (
                                    <option key={op.id} value={op.id}>{op.registration_code} - {op.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group flex-1" style={{ maxWidth: '50%' }}>
                            <label className="form-label">Peça / Produto</label>
                            <select
                                className="input-field"
                                value={formData.part}
                                onChange={(e) => setFormData({ ...formData, part: e.target.value })}
                                required
                            >
                                <option value="">Selecione a peça produzida...</option>
                                {parts.map(p => (
                                    <option key={p.id} value={p.id}>{p.part_number} - {p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="divider"></div>

                    <h3 className="section-title"><Calculator size={20} /> Produção</h3>

                    <div className="form-row">
                        <div className="form-group flex-1">
                            <label className="form-label">Meta do Turno</label>
                            <input
                                type="number"
                                className="input-field"
                                placeholder="0"
                                value={formData.target}
                                onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                                min="1"
                                required
                            />
                        </div>

                        <div className="form-group flex-1">
                            <label className="form-label">Total Produzido (Bruto)</label>
                            <input
                                type="number"
                                className="input-field highlight-input"
                                placeholder="0"
                                value={formData.produced}
                                onChange={(e) => setFormData({ ...formData, produced: e.target.value })}
                                min="0"
                                required
                            />
                        </div>
                    </div>

                    {/* --- APONTAMENTO DE NÃO CONFORMIDADES (REFUGO) --- */}
                    <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
                        <h4 style={{ margin: 0, color: 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertTriangle size={18} /> Não Conformidades (Refugo)
                        </h4>
                        <button type="button" className="btn btn-outline btn-small border-danger text-danger" onClick={handleAddScrap}>
                            <Plus size={16} /> Adicionar Refugo
                        </button>
                    </div>

                    {formData.scraps.length === 0 ? (
                        <p className="text-secondary text-sm">Nenhum refugo apontado. Total de perdas: 0 un.</p>
                    ) : (
                        <div className="dynamic-list">
                            {formData.scraps.map((sc, index) => (
                                <div key={index} className="dynamic-item glass-panel animate-slide-up" style={{ padding: '1rem', marginBottom: '0.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239, 68, 68, 0.05)' }}>
                                    <div className="form-group flex-1" style={{ marginBottom: 0 }}>
                                        <label className="form-label text-sm text-danger">Motivo do Refugo</label>
                                        <select
                                            className="input-field border-danger"
                                            value={sc.reason}
                                            onChange={(e) => handleScrapChange(index, 'reason', e.target.value)}
                                            required
                                        >
                                            <option value="">Selecione o motivo...</option>
                                            {SCRAP_REASONS.map(reason => (
                                                <option key={reason} value={reason}>{reason}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group" style={{ width: '120px', marginBottom: 0 }}>
                                        <label className="form-label text-sm text-danger">Quantidade</label>
                                        <input
                                            type="number"
                                            className="input-field border-danger"
                                            placeholder="Ex: 5"
                                            value={sc.quantity}
                                            onChange={(e) => handleScrapChange(index, 'quantity', e.target.value)}
                                            min="1"
                                            required
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        className="btn-icon hover-danger"
                                        onClick={() => handleRemoveScrap(index)}
                                        style={{ marginTop: '1.8rem' }}
                                        title="Remover refugo"
                                    >
                                        <Trash2 size={18} className="text-danger" />
                                    </button>
                                </div>
                            ))}
                            <div style={{ textAlign: 'right', marginTop: '0.5rem', fontWeight: 600, color: 'var(--danger-color)' }}>
                                Total de Refugo: {refuseNum} un
                            </div>
                        </div>
                    )}

                    {/* --- APONTAMENTO DE PARADAS --- */}
                    <div className="divider"></div>
                    <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="section-title" style={{ margin: 0 }}><Timer size={20} /> Paradas de Máquina</h3>
                        <button type="button" className="btn btn-outline btn-small" onClick={handleAddDowntime}>
                            <Plus size={16} /> Adicionar Parada
                        </button>
                    </div>

                    {formData.downtimes.length === 0 ? (
                        <p className="text-secondary text-sm">Nenhuma parada registrada. Clique em "Adicionar Parada" se a máquina ficou inativa.</p>
                    ) : (
                        <div className="dynamic-list">
                            {formData.downtimes.map((dw, index) => (
                                <div key={index} className="dynamic-item glass-panel animate-slide-up" style={{ padding: '1rem', marginBottom: '0.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div className="form-group flex-1" style={{ marginBottom: 0 }}>
                                        <label className="form-label text-sm">Categoria</label>
                                        <select
                                            className="input-field"
                                            value={dw.category}
                                            onChange={(e) => handleDowntimeChange(index, 'category', e.target.value)}
                                            required
                                        >
                                            <option value="">Selecione...</option>
                                            {DOWNTIME_CATEGORIES.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group flex-1" style={{ marginBottom: 0 }}>
                                        <label className="form-label text-sm">Motivo da Parada</label>
                                        <select
                                            className="input-field"
                                            value={dw.reason}
                                            onChange={(e) => handleDowntimeChange(index, 'reason', e.target.value)}
                                            required
                                            disabled={!dw.category}
                                        >
                                            <option value="">Selecione o motivo...</option>
                                            {dw.category && DOWNTIME_REASONS[dw.category].map(reason => (
                                                <option key={reason} value={reason}>{reason}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group" style={{ width: '120px', marginBottom: 0 }}>
                                        <label className="form-label text-sm">Minutos</label>
                                        <input
                                            type="number"
                                            className="input-field"
                                            placeholder="Ex: 30"
                                            value={dw.minutes}
                                            onChange={(e) => handleDowntimeChange(index, 'minutes', e.target.value)}
                                            min="1"
                                            required
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        className="btn-icon hover-danger"
                                        onClick={() => handleRemoveDowntime(index)}
                                        style={{ marginTop: '1.8rem' }}
                                        title="Remover parada"
                                    >
                                        <Trash2 size={18} className="text-danger" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="form-actions" style={{ marginTop: '2rem' }}>
                        <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
                            <Save size={20} /> {loading ? 'Salvando...' : 'Finalizar Turno'}
                        </button>
                    </div>
                </form>

                <div className="summary-panel glass-panel animate-fade-in delay-200">
                    <h3 className="summary-title">Resumo Calculado</h3>

                    <div className="calc-card">
                        <span className="calc-label">Produção Bruta</span>
                        <span className="calc-value">{producedNum} <small>un</small></span>
                    </div>

                    <div className="calc-card text-danger">
                        <span className="calc-label">- Refugo</span>
                        <span className="calc-value">{refuseNum} <small>un</small></span>
                    </div>

                    <div className="calc-divider"></div>

                    <div className="calc-card result">
                        <span className="calc-label">Produção Líquida</span>
                        <span className="calc-value text-success">{netProduction} <small>un</small></span>
                    </div>

                    {formData.machine && (
                        <div className="efficiency-box mt-4">
                            <div className="eff-header">
                                <span>Eficiência da Máquina</span>
                                <span className={`eff-value ${efficiency >= 100 ? 'text-success' : efficiency >= 80 ? 'text-warning' : 'text-danger'}`}>
                                    {efficiency}%
                                </span>
                            </div>
                            <div className="progress-bar-container mt-2">
                                <div
                                    className={`progress-bar ${efficiency >= 100 ? 'success' : efficiency >= 80 ? 'warning' : 'danger'}`}
                                    style={{ width: `${Math.min(efficiency, 100)}%` }}
                                ></div>
                            </div>
                            <p className="target-info mt-2">Meta: {target} un</p>
                        </div>
                    )}
                </div>
            </div >

            <style>{`
        .shift-entry-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .page-header { margin-bottom: 0.5rem; }

        .entry-content {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
          align-items: start;
        }

        .entry-form, .summary-panel {
          padding: 2rem;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.1rem;
          margin-bottom: 1.5rem;
          color: var(--text-primary);
        }

        .form-row {
          display: flex;
          gap: 1.5rem;
        }

        .flex-1 { flex: 1; }

        .input-with-icon { position: relative; }
        .input-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }
        .pl-4 { padding-left: 2.5rem !important; }

        .divider {
          height: 1px;
          background: var(--border-color);
          margin: 2rem 0;
        }

        .highlight-input {
          font-size: 1.2rem !important;
          font-weight: 600;
          height: 3rem;
        }

        .border-danger {
          border-color: rgba(248, 81, 73, 0.5) !important;
          font-size: 1.2rem !important;
          height: 3rem;
        }
        
        .border-danger:focus { border-color: var(--danger-color) !important; box-shadow: 0 0 0 3px rgba(248, 81, 73, 0.2) !important; }
        .text-danger { color: var(--danger-color); }

        .form-actions {
          margin-top: 2rem;
          display: flex;
          justify-content: flex-end;
        }

        .btn-large {
          padding: 0.8rem 2rem;
          font-size: 1rem;
        }

        /* Summary Panel */
        .summary-title {
          font-size: 1rem;
          margin-bottom: 1.5rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .calc-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0;
          font-size: 1.1rem;
        }

        .calc-value { font-family: var(--font-family-display); font-weight: 600; }
        .calc-divider { height: 1px; background: rgba(255,255,255,0.1); margin: 0.5rem 0; }
        
        .calc-card.result {
          font-size: 1.4rem;
          padding: 1rem 0;
        }

        .text-success { color: var(--success-color); }

        .efficiency-box {
          background: rgba(0,0,0,0.2);
          padding: 1.5rem;
          border-radius: var(--border-radius-md);
          border: 1px solid var(--border-color);
        }

        .eff-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 600;
        }

        .eff-value {
          font-size: 1.5rem;
          font-family: var(--font-family-display);
        }

        .text-warning { color: var(--warning-color); }

        .progress-bar-container { width: 100%; height: 8px; background: var(--bg-surface-elevated); border-radius: 4px; overflow: hidden; }
        .progress-bar { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
        .progress-bar.success { background: var(--success-color); }
        .progress-bar.warning { background: var(--warning-color); }
        .progress-bar.danger { background: var(--danger-color); }
        
        .mt-2 { margin-top: 0.5rem; }
        .mt-4 { margin-top: 1.5rem; }
        
        .target-info {
          font-size: 0.8rem;
          color: var(--text-secondary);
          text-align: right;
        }

        @media (max-width: 900px) {
          .entry-content { grid-template-columns: 1fr; }
          .form-row { flex-direction: column; gap: 1rem; }
        }
      `}</style>
        </div>
    );
}
