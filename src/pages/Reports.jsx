import { useState, useEffect } from 'react';
import { Search, Filter, Download, FileText, Printer, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { generateReportPDF } from '../utils/pdfGenerator';

export default function Reports() {
    const { user } = useAuth();
    const [reports, setReports] = useState([]);
    const [filteredReports, setFilteredReports] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedShift, setSelectedShift] = useState('');
    const [loading, setLoading] = useState(true);

    const SHIFT_MAP = {
        '1': '06:00 às 14:00',
        '2': '14:00 às 22:00',
        '3': '22:00 às 06:00',
        'Comercial': '08:00 às 17:00'
    };

    useEffect(() => {
        if (user?.company_id) {
            fetchReports();
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchReports = async () => {
        try {
            const { data: compData } = await supabase
                .from('companies')
                .select('target_oee')
                .eq('id', user.company_id)
                .single();
            const targetOee = compData?.target_oee || 80;

            const { data, error } = await supabase
                .from('shifts')
                .select(`
                    id, date, shift_number, target, net_production, produced_gross, refuse, downtimes, scraps, notes,
                    machines ( code, name, target_per_shift ),
                    operators ( name ),
                    parts ( name )
                `)
                .eq('company_id', user.company_id)
                .order('date', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formatted = data.map(shift => {
                const target = shift.target || shift.machines?.target_per_shift || 1;
                const oee = Math.round((shift.net_production / target) * 100) || 0;
                const perf = Math.round((shift.produced_gross / target) * 100) || 0;
                const refusePerc = shift.produced_gross > 0 ? ((shift.refuse / shift.produced_gross) * 100).toFixed(1) : 0;
                
                let shiftDisplay = `Turno ${shift.shift_number}`;
                if (shift.shift_number === SHIFT_MAP['1']) shiftDisplay = 'Turno 1';
                else if (shift.shift_number === SHIFT_MAP['2']) shiftDisplay = 'Turno 2';
                else if (shift.shift_number === SHIFT_MAP['3']) shiftDisplay = 'Turno 3';
                else if (shift.shift_number === SHIFT_MAP['Comercial']) shiftDisplay = 'Comercial';
                else if (['1', '2', '3'].includes(String(shift.shift_number))) shiftDisplay = `Turno ${shift.shift_number}`;

                return {
                    id: shift.id.substring(0, 8),
                    originalId: shift.id,
                    date: new Date(shift.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
                    shift: shiftDisplay,
                    machine: shift.machines?.code || 'Desconhecida',
                    operator: shift.operators?.name || 'Desconhecido',
                    part: shift.parts?.name || 'N/A',
                    target: target,
                    produced_gross: shift.produced_gross,
                    refuse: shift.refuse,
                    perf: perf,
                    refusePerc: refusePerc,
                    net: shift.net_production,
                    oee: oee > 100 ? 100 : oee,
                    targetOee: targetOee,
                    status: 'Fechado',
                    downtimes: shift.downtimes || [],
                    scraps: shift.scraps || [],
                    notes: shift.notes || ''
                };
            });
            setReports(formatted);
            setFilteredReports(formatted);
        } catch (error) {
            console.error("Erro ao carregar relatórios", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGeneratePDF = () => {
        try {
            generateReportPDF(filteredReports, user?.company_id ? user?.full_name : 'PRODIXON', selectedDate, selectedShift);
        } catch (error) {
            console.error(error);
            alert(`Erro ao gerar PDF: ${error.message}`);
        }
    };

    const handleDeleteReport = async (originalId) => {
        if (!window.confirm("Certeza absoluta que deseja deletar este turno? Essa ação não pode ser desfeita e os dados de eficiência do Dashboard serão alterados.")) {
            return;
        }

        try {
            const { error } = await supabase.from('shifts').delete().eq('id', originalId);
            if (error) throw error;

            // Remove locally avoiding a new fetch
            const updatedReports = reports.filter(rp => rp.originalId !== originalId);
            setReports(updatedReports);
            setFilteredReports(filteredReports.filter(rp => rp.originalId !== originalId));
            alert("Turno deletado com sucesso!");
        } catch (err) {
            console.error("Erro ao deletar turno", err);
            alert("Erro ao tentar deletar turno: " + err.message);
        }
    };

    const filterData = (term, date, shift) => {
        let filtered = reports;

        if (term) {
            const lowerTerm = term.toLowerCase();
            filtered = filtered.filter(rp =>
                rp.machine.toLowerCase().includes(lowerTerm) ||
                rp.operator.toLowerCase().includes(lowerTerm) ||
                rp.id.toLowerCase().includes(lowerTerm) ||
                rp.part.toLowerCase().includes(lowerTerm) // Added part to search filter
            );
        }

        if (date) {
            // A data do input YYYY-MM-DD precisa ser comparada com a data do relatorio que esta em DD/MM/YYYY local
            const [year, month, day] = date.split('-');
            const formattedDateFilter = `${day}/${month}/${year}`;
            filtered = filtered.filter(rp => rp.date === formattedDateFilter);
        }

        if (shift) {
            filtered = filtered.filter(rp => {
                if (shift === 'Comercial') return rp.shift === 'Comercial';
                return rp.shift === `Turno ${shift}`;
            });
        }

        setFilteredReports(filtered);
    };

    const handleSearch = (e) => {
        const term = e.target.value.toLowerCase();
        setSearchTerm(term);
        filterData(term, selectedDate, selectedShift);
    };

    const handleDateChange = (e) => {
        const date = e.target.value;
        setSelectedDate(date);
        filterData(searchTerm, date, selectedShift);
    };

    const handleShiftChange = (e) => {
        const shift = e.target.value;
        setSelectedShift(shift);
        filterData(searchTerm, selectedDate, shift);
    };

    return (
        <div className="reports-container animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="text-gradient">Relatórios e Exportação</h1>
                    <p className="text-secondary">Acesse o histórico de produção e gere PDFs</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-outline" onClick={() => window.print()}>
                        <Printer size={18} /> Imprimir
                    </button>
                    <button className="btn btn-primary" onClick={handleGeneratePDF}>
                        <Download size={18} /> Exportar PDF
                    </button>
                </div>
            </div>

            <div className="glass-panel table-container">
                <div className="table-toolbar">
                    <div className="filters-group">
                        <div className="search-box">
                            <Search size={18} className="text-muted" />
                            <input
                                type="text"
                                placeholder="Buscar por ID, Máquina, Operador..."
                                className="input-transparent"
                                value={searchTerm}
                                onChange={handleSearch}
                            />
                        </div>

                        <div className="search-box date-filter" style={{ width: 'auto', padding: '0.25rem 1rem', minWidth: '150px', flex: '1 1 auto' }}>
                            <Filter size={16} className="text-muted" />
                            <input
                                type="date"
                                className="input-transparent"
                                style={{ colorScheme: 'dark' }}
                                value={selectedDate}
                                onChange={handleDateChange}
                            />
                            {selectedDate && (
                                <button className="btn-icon" onClick={() => handleDateChange({ target: { value: '' } })} style={{ padding: '0.2rem' }}>
                                    <span style={{ fontSize: '12px' }}>✕</span>
                                </button>
                            )}
                        </div>

                        <div className="search-box" style={{ width: 'auto', padding: '0.25rem 1rem', minWidth: '150px', flex: '1 1 auto' }}>
                            <select 
                                className="input-transparent"
                                value={selectedShift}
                                onChange={handleShiftChange}
                                style={{ cursor: 'pointer' }}
                            >
                                <option value="" style={{ color: '#000' }}>Todos os Turnos</option>
                                <option value="1" style={{ color: '#000' }}>Turno 1 (Manhã)</option>
                                <option value="2" style={{ color: '#000' }}>Turno 2 (Tarde)</option>
                                <option value="3" style={{ color: '#000' }}>Turno 3 (Noite)</option>
                                <option value="Comercial" style={{ color: '#000' }}>Comercial</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Data / Turno</th>
                                <th>Máquina</th>
                                <th>Operador</th>
                                <th>Peça</th>
                                <th>Produção Líq.</th>
                                <th>OEE</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReports.map((rp, index) => (
                                <tr key={rp.id} className="animate-slide-up" style={{ animationDelay: (index * 50) + 'ms' }}>
                                    <td><span className="text-secondary">#{rp.id}</span></td>
                                    <td>
                                        <div className="fw-600">{rp.date}</div>
                                        <div className="text-sm text-secondary">{rp.shift}</div>
                                    </td>
                                    <td><strong>{rp.machine}</strong></td>
                                    <td>{rp.operator}</td>
                                    <td>{rp.part}</td>
                                    <td>{rp.net} un</td>
                                    <td>
                                        <span className={"badge " + (rp.oee >= rp.targetOee ? 'badge-success' : rp.oee >= (rp.targetOee - 15) ? 'badge-primary' : 'badge-danger')}>
                                            {rp.oee}%
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                className="btn-icon"
                                                title="Ver Detalhes"
                                                onClick={() => {
                                                    const scStr = Array.isArray(rp.scraps) && rp.scraps.length > 0 ? rp.scraps.map(s => `${s.quantity} un: ${s.reason}`).join(', ') : 'Nenhum';
                                                    const dwStr = Array.isArray(rp.downtimes) && rp.downtimes.length > 0 ? rp.downtimes.map(d => `${d.minutes} min: ${d.reason}`).join(', ') : 'Nenhuma';
                                                    alert(`DETALHES DO TURNO #${rp.id}\n\nData: ${rp.date} | ${rp.shift}\nMáquina: ${rp.machine}\nOperador: ${rp.operator}\nPeça: ${rp.part}\n\n-- PRODUÇÃO --\nLíquida: ${rp.net} un (OEE: ${rp.oee}%)\nBruta: ${rp.produced_gross} un\nRefugo Total: ${rp.refuse} un\n\n-- MOTIVOS DE REFUGO --\n${scStr}\n\n-- PARADAS DE MÁQUINA --\n${dwStr}\n\n-- OBSERVAÇÕES --\n${rp.notes || 'Nenhuma'}`);
                                                }}
                                            >
                                                <FileText size={18} className="text-primary" />
                                            </button>
                                            <button
                                                className="btn-icon hover-danger"
                                                title="Excluir Turno"
                                                onClick={() => handleDeleteReport(rp.originalId)}
                                            >
                                                <Trash2 size={18} className="text-danger" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
        .reports-container { display: flex; flex-direction: column; gap: 2rem; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 1rem; }
        .header-actions { display: flex; gap: 1rem; }
        
        .table-container { padding: 1.5rem; overflow: hidden; }
        .table-toolbar { margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
        .filters-group { display: flex; gap: 1rem; flex-wrap: wrap; width: 100%; }
        
        .search-box { display: flex; align-items: center; gap: 0.5rem; background: rgba(0,0,0,0.2); padding: 0.5rem 1rem; border-radius: var(--border-radius-md); border: 1px solid var(--border-color); width: 300px; max-width: 100%; }
        .input-transparent { background: transparent; border: none; color: white; outline: none; width: 100%; }
        .filter-btn { padding: 0.5rem 1rem; font-size: 0.85rem; }
        
        .table-responsive { overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; }
        .custom-table { width: 100%; border-collapse: collapse; min-width: 800px; }
        .custom-table th { text-align: left; padding: 1rem; color: var(--text-secondary); font-weight: 600; font-size: 0.85rem; text-transform: uppercase; border-bottom: 2px solid var(--border-color); }
        .custom-table td { padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.95rem; }
        .custom-table tbody tr:hover { background: rgba(255,255,255,0.02); }
        
        .fw-600 { font-weight: 600; }
        .text-sm { font-size: 0.8rem; }
        
        .btn-icon { background: transparent; border: none; cursor: pointer; padding: 0.5rem; border-radius: var(--border-radius-sm); transition: var(--transition-fast); }
        .btn-icon:hover { background: rgba(255,255,255,0.1); }
        .hover-danger:hover { background: rgba(239, 68, 68, 0.1); }
      `}</style>
        </div>
    );
}
