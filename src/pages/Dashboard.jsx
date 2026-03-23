import { useState, useEffect } from 'react';
import { TrendingUp, Settings, AlertCircle, CheckCircle2, Calendar, Factory, BarChart2, LayoutDashboard, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalProduced: 0,
    totalTarget: 1,
    activeMachines: 0,
    totalMachines: 0,
    oeeGeneral: 0,
    refuse: 0
  });

  const [machineRanking, setMachineRanking] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));

  // Shift Filter State
  const [selectedShiftFilter, setSelectedShiftFilter] = useState('ALL');

  // Chart Data States
  const [downtimeData, setDowntimeData] = useState([]);
  const [scrapData, setScrapData] = useState([]);

  // Detailed Table Data State
  const [detailedShifts, setDetailedShifts] = useState([]);

  const [activeTab, setActiveTab] = useState('overview');
  const [availableMachines, setAvailableMachines] = useState([]);
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [selectedMachineShift, setSelectedMachineShift] = useState('ALL');
  const [machineData, setMachineData] = useState({ loading: false, shifts: [] });
  const [shiftSummaryData, setShiftSummaryData] = useState(null);
  
  const fetchMachineDetails = async () => {
    if (!selectedMachineId) return;
    setMachineData({ loading: true, shifts: [] });
    try {
      const { data: shiftsData, error: sErr } = await supabase
        .from('shifts')
        .select(`*, machines(code, name, target_per_shift), operators(name, registration_code), parts(name, part_number)`)
        .eq('company_id', user.company_id)
        .eq('machine_id', selectedMachineId)
        .eq('date', selectedDate)
        .order('created_at', { ascending: false });

      if (sErr) throw sErr;
      setMachineData({ loading: false, shifts: shiftsData || [] });
    } catch (err) {
      console.error(err);
      setMachineData({ loading: false, shifts: [] });
    }
  };

  useEffect(() => {
    if (user?.company_id && activeTab === 'machine_details') {
      fetchMachineDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.company_id, activeTab, selectedMachineId, selectedDate]);
  const [analysisPeriod, setAnalysisPeriod] = useState('daily');
  const [analysisDate, setAnalysisDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [analysisData, setAnalysisData] = useState({
    loading: false,
    overallOee: 0,
    totalProduced: 0,
    totalRefuse: 0,
    shiftBreakdown: []
  });

  const SHIFT_MAP = {
    '1': '06:00 às 14:00',
    '2': '14:00 às 22:00',
    '3': '22:00 às 06:00',
    'comercial': '08:00 às 18:00'
  };

  useEffect(() => {
    if (user?.company_id && activeTab === 'oee_analysis') {
      fetchAnalysisData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.company_id, activeTab, analysisPeriod, analysisDate]);

  const fetchAnalysisData = async () => {
    setAnalysisData(prev => ({ ...prev, loading: true }));
    try {
      const [y, m, d] = analysisDate.split('-');
      let startDate = new Date(y, m - 1, d);
      let endDate = new Date(y, m - 1, d);

      if (analysisPeriod === 'weekly') {
        const day = startDate.getDay();
        const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
        startDate.setDate(diff);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
      } else if (analysisPeriod === 'monthly') {
        startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      }

      const startStr = startDate.toLocaleDateString('en-CA');
      const endStr = endDate.toLocaleDateString('en-CA');

      const { data: shiftsData, error: sErr } = await supabase
        .from('shifts')
        .select('*, machines(code, name, target_per_shift)')
        .eq('company_id', user.company_id)
        .gte('date', startStr)
        .lte('date', endStr);

      if (sErr) throw sErr;

      let totalProduced = 0;
      let totalRefuse = 0;
      let totalTarget = 0;
      const shiftMap = {};

      shiftsData?.forEach(shift => {
        const prod = shift.net_production !== undefined ? shift.net_production : Math.max(0, (shift.produced_gross || 0) - (shift.refuse || 0));
        const ref = shift.refuse || 0;
        const targ = shift.target || shift.machines?.target_per_shift || 1;
        const sName = shift.shift_number || 'Sem Turno';

        totalProduced += prod;
        totalRefuse += ref;
        totalTarget += targ;

        if (!shiftMap[sName]) shiftMap[sName] = { produced: 0, target: 0, refuse: 0 };
        shiftMap[sName].produced += prod;
        shiftMap[sName].target += targ;
        shiftMap[sName].refuse += ref;
      });

      const overallOee = totalTarget > 0 ? Math.round((totalProduced / totalTarget) * 100) : 0;

      const shiftBreakdown = Object.entries(shiftMap).map(([name, data]) => ({
        name,
        produced: data.produced,
        refuse: data.refuse,
        oee: data.target > 0 ? Math.round((data.produced / data.target) * 100) : 0
      })).sort((a, b) => b.oee - a.oee);

      setAnalysisData({
        loading: false,
        overallOee: Math.min(overallOee, 100),
        totalProduced,
        totalRefuse,
        shiftBreakdown
      });
    } catch (err) {
      console.error('Error fetching analysis', err);
      setAnalysisData(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    if (user?.company_id) {
      fetchDashboardData(selectedDate, selectedShiftFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.company_id, selectedDate, selectedShiftFilter]);

  const fetchDashboardData = async (dateStr, shiftFilter) => {
    try {
      const { data: compData } = await supabase
        .from('companies')
        .select('target_oee, max_refuse_perc')
        .eq('id', user.company_id)
        .single();
      
      const companyTargetOee = compData?.target_oee || 80;
      const companyMaxRefuse = compData?.max_refuse_perc !== undefined && compData?.max_refuse_perc !== null ? compData.max_refuse_perc : 5;

      const { data: machinesData, error: mErr } = await supabase
        .from('machines')
        .select('*')
        .eq('company_id', user.company_id);

      const { data: shiftsData, error: sErr } = await supabase
        .from('shifts')
        .select(`
          *, 
          machines(code, name, target_per_shift),
          operators(name, registration_code),
          parts(name, part_number)
        `)
        .eq('company_id', user.company_id)
        .eq('date', dateStr);

      if (mErr || sErr) throw (mErr || sErr);

      // Filter shifts based on user selection
      const filteredShifts = shiftFilter === 'ALL'
        ? shiftsData
        : shiftsData?.filter(s => s.shift_number === SHIFT_MAP[shiftFilter]);

      const activeMachines = machinesData?.filter(m => m.status === 'Ativa').length || 0;
      const totalMachines = machinesData?.length || 0;

      let totalProduced = 0;
      let totalRefuse = 0;
      let totalTargetProcessed = 0;
      const machinePerformances = {};
      const downtimeAggregator = {};
      const scrapAggregator = {};

      filteredShifts?.forEach(shift => {
        const prod = shift.net_production !== undefined ? shift.net_production : Math.max(0, (shift.produced_gross || 0) - (shift.refuse || 0));
        totalProduced += prod;
        totalRefuse += shift.refuse || 0;

        const mId = shift.machine_id;
        const shiftTarget = shift.target || shift.machines?.target_per_shift || 1;

        if (!machinePerformances[mId]) {
          machinePerformances[mId] = {
            id: shift.machines?.code,
            name: shift.machines?.name,
            produced: 0,
            target: 0
          };
        }
        machinePerformances[mId].produced += prod;
        machinePerformances[mId].target += shiftTarget;
        totalTargetProcessed += shiftTarget;

        // Aggregate Downtimes
        if (shift.downtimes && Array.isArray(shift.downtimes)) {
          shift.downtimes.forEach(dw => {
            if (dw.reason) {
              downtimeAggregator[dw.reason] = (downtimeAggregator[dw.reason] || 0) + Number(dw.minutes || 0);
            }
          });
        }

        // Aggregate Scraps
        if (shift.scraps && Array.isArray(shift.scraps)) {
          shift.scraps.forEach(sc => {
            if (sc.reason) {
              scrapAggregator[sc.reason] = (scrapAggregator[sc.reason] || 0) + Number(sc.quantity || 0);
            }
          });
        }
      });

      const oeeGeneral = totalTargetProcessed > 0 ? Math.round((totalProduced / totalTargetProcessed) * 100) : 0;

      const ranking = Object.values(machinePerformances).map(m => {
        const eff = Math.round((m.produced / m.target) * 100);
        return {
          id: m.id,
          name: m.name,
          produced: m.produced,
          target: m.target,
          eff: eff,
          status: eff >= companyTargetOee ? 'excellent' : eff >= (companyTargetOee - 15) ? 'good' : eff >= (companyTargetOee - 30) ? 'warning' : 'danger'
        };
      });

      const top5 = [...ranking].sort((a, b) => b.eff - a.eff).slice(0, 5);

      // Prepare Chart Data mapping
      const chartDowntime = Object.entries(downtimeAggregator)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      const chartScrap = Object.entries(scrapAggregator)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Prepare Detailed Shifts Data mapping
      const detailedTableData = filteredShifts?.map(shift => {
        const targ = shift.target || shift.machines?.target_per_shift || 1;
        const prodGross = shift.produced_gross || 0;
        const ref = shift.refuse || 0;
        const prodNet = shift.net_production !== undefined ? shift.net_production : Math.max(0, prodGross - ref);
        const eff = Math.round((prodNet / targ) * 100);

        return {
          id: shift.id,
          machineName: `${shift.machines?.code || '--'} - ${shift.machines?.name || 'Desconhecida'}`,
          operatorName: shift.operators?.name || 'Desconhecido',
          partName: `${shift.parts?.part_number || '--'} - ${shift.parts?.name || 'Sem Peça'}`,
          target: targ,
          producedGross: prodGross,
          refuse: ref,
          producedNet: prodNet,
          oee: eff,
          status: eff >= companyTargetOee ? 'success' : eff >= (companyTargetOee - 15) ? 'primary' : eff >= (companyTargetOee - 30) ? 'warning' : 'danger'
        };
      }).sort((a, b) => a.machineName.localeCompare(b.machineName) || b.oee - a.oee) || [];

      setChartData(ranking);
      setDowntimeData(chartDowntime);
      setScrapData(chartScrap);
      setDetailedShifts(detailedTableData);

      // --- Shift Summary Calculation ---
      const shiftAggregation = {};
      let dailyTarget = 0;
      let dailyProduced = 0;
      let dailyRefuse = 0;

      shiftsData?.forEach(shift => {
        const sName = SHIFT_MAP[shift.shift_number] || `Turno ${shift.shift_number}`;
        const targ = shift.target || shift.machines?.target_per_shift || 1;
        const prodGross = shift.produced_gross || 0;
        const ref = shift.refuse || 0;
        const prodNet = shift.net_production !== undefined ? shift.net_production : Math.max(0, prodGross - ref);

        if (!shiftAggregation[sName]) {
          shiftAggregation[sName] = { name: sName, target: 0, produced: 0, refuse: 0, gross: 0 };
        }
        shiftAggregation[sName].target += targ;
        shiftAggregation[sName].produced += prodNet;
        shiftAggregation[sName].gross += prodGross;
        shiftAggregation[sName].refuse += ref;
        
        dailyTarget += targ;
        dailyProduced += prodNet;
        dailyRefuse += ref;
      });

      const shiftSummaryList = Object.values(shiftAggregation).map(s => {
        const oee = s.target > 0 ? Math.round((s.produced / s.target) * 100) : 0;
        return {
          ...s,
          oee,
          status: oee >= companyTargetOee ? 'success' : oee >= (companyTargetOee - 15) ? 'primary' : oee >= (companyTargetOee - 30) ? 'warning' : 'danger'
        };
      }).sort((a, b) => b.oee - a.oee);

      setShiftSummaryData({
        dailyTarget,
        dailyProduced,
        dailyRefuse,
        dailyOee: dailyTarget > 0 ? Math.round((dailyProduced / dailyTarget) * 100) : 0,
        shifts: shiftSummaryList
      });
      // --------------------------------

      const activeMacs = machinesData?.filter(m => m.status === 'Ativa') || [];
      setAvailableMachines(activeMacs);
      if (!selectedMachineId && activeMacs.length > 0) {
        setSelectedMachineId(activeMacs[0].id);
      }

      setStats({
        totalProduced,
        totalTarget: totalTargetProcessed > 0 ? totalTargetProcessed : 1,
        activeMachines,
        totalMachines,
        oeeGeneral: oeeGeneral > 100 ? 100 : oeeGeneral,
        refuse: totalRefuse,
        targetOee: companyTargetOee,
        maxRefuse: companyMaxRefuse
      });
      setMachineRanking(top5);

    } catch (err) {
      console.error("Erro ao carregar Dashboard", err);
    }
  };

  const PIE_COLORS = ['#ff4d4f', '#ff7a45', '#ffa940', '#fadb14', '#bae637', '#73d13d', '#36cfc9', '#40a9ff', '#597ef7', '#9254de', '#f759ab'];

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-gradient">Dashboard de Produção</h1>
          <p className="text-secondary">Monitore o turno atual e o histórico de eficiência (OEE)</p>
        </div>

        {/* Custom Tab Switcher */}
        <div className="tab-switcher glass-panel" style={{ display: 'flex', padding: '4px', borderRadius: '12px', gap: '4px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <button
            className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-outline'}`}
            style={{ border: 'none', whiteSpace: 'nowrap' }}
            onClick={() => setActiveTab('overview')}
          >
            <LayoutDashboard size={18} /> Resumo Diário
          </button>
          <button
            className={`btn ${activeTab === 'machine_details' ? 'btn-primary' : 'btn-outline'}`}
            style={{ border: 'none', whiteSpace: 'nowrap' }}
            onClick={() => setActiveTab('machine_details')}
          >
            <Factory size={18} /> Análise por Máquina
          </button>
          <button
            className={`btn ${activeTab === 'shift_summary' ? 'btn-primary' : 'btn-outline'}`}
            style={{ border: 'none', whiteSpace: 'nowrap' }}
            onClick={() => setActiveTab('shift_summary')}
          >
            <CheckCircle2 size={18} /> Produção por Turno
          </button>
          <button
            className={`btn ${activeTab === 'oee_analysis' ? 'btn-primary' : 'btn-outline'}`}
            style={{ border: 'none', whiteSpace: 'nowrap' }}
            onClick={() => setActiveTab('oee_analysis')}
          >
            <BarChart2 size={18} /> Análise Histórica (OEE)
          </button>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <>
          <div className="header-actions filter-container glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '0.75rem 1.5rem', borderRadius: '12px' }}>
            <div className="shift-filters" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Filter size={18} className="text-muted mr-2" />
              <button
                className={`shift-pill ${selectedShiftFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setSelectedShiftFilter('ALL')}
              >
                Geral (Todos)
              </button>
              <button
                className={`shift-pill ${selectedShiftFilter === '1' ? 'active' : ''}`}
                onClick={() => setSelectedShiftFilter('1')}
              >
                Turno 1
              </button>
              <button
                className={`shift-pill ${selectedShiftFilter === '2' ? 'active' : ''}`}
                onClick={() => setSelectedShiftFilter('2')}
              >
                Turno 2
              </button>
              <button
                className={`shift-pill ${selectedShiftFilter === '3' ? 'active' : ''}`}
                onClick={() => setSelectedShiftFilter('3')}
              >
                Turno 3
              </button>
              <button
                className={`shift-pill ${selectedShiftFilter === 'comercial' ? 'active' : ''}`}
                onClick={() => setSelectedShiftFilter('comercial')}
              >
                Comercial
              </button>
            </div>

            <div className="search-box date-filter" style={{ width: 'auto', padding: '0.25rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Calendar size={18} className="text-muted" style={{ marginRight: '8px' }} />
              <input
                type="date"
                className="input-transparent"
                style={{ colorScheme: 'dark', border: 'none', background: 'transparent', color: 'white', outline: 'none' }}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>

          {/* KPI Cards */}
          <div className="kpi-grid">
            <div className="kpi-card glass-panel animate-slide-up delay-100">
              <div className="kpi-icon-wrapper success">
                <TrendingUp size={24} />
              </div>
              <div className="kpi-content">
                <p className="kpi-label">Produção Líquida {selectedShiftFilter !== 'ALL' && '(Turno)'}</p>
                <h3 className="kpi-value">{stats.totalProduced.toLocaleString()} <span className="text-sm">un</span></h3>
                <p className={`kpi-meta ${((stats.totalProduced / stats.totalTarget) * 100) >= (stats.targetOee || 80) ? 'text-success' : 'text-warning'}`}>
                  {((stats.totalProduced / stats.totalTarget) * 100).toFixed(1)}% da Meta
                </p>
              </div>
            </div>

            <div className="kpi-card glass-panel animate-slide-up delay-200">
              <div className="kpi-icon-wrapper warning">
                <AlertCircle size={24} />
              </div>
              <div className="kpi-content">
                <p className="kpi-label">Refugo Total</p>
                <h3 className="kpi-value">{stats.refuse.toLocaleString()} <span className="text-sm">un</span></h3>
                <p className={`kpi-meta ${stats.totalProduced + stats.refuse > 0 && ((stats.refuse / (stats.totalProduced + stats.refuse)) * 100) > (stats.maxRefuse || 5) ? 'text-danger' : 'text-success'}`}>
                  {stats.totalProduced + stats.refuse > 0 ? ((stats.refuse / (stats.totalProduced + stats.refuse)) * 100).toFixed(1) : 0}% de perda
                </p>
              </div>
            </div>

            <div className="kpi-card glass-panel animate-slide-up delay-300">
              <div className="kpi-icon-wrapper primary">
                <CheckCircle2 size={24} />
              </div>
              <div className="kpi-content">
                <p className="kpi-label">OEE do Recorte</p>
                <h3 className="kpi-value">{stats.oeeGeneral}%</h3>
                <div className="progress-bar-container mt-2">
                  <div
                    className="progress-bar primary"
                    style={{ width: stats.oeeGeneral + '%' }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="kpi-card glass-panel animate-slide-up delay-300">
              <div className="kpi-icon-wrapper outline">
                <Factory size={24} />
              </div>
              <div className="kpi-content">
                <p className="kpi-label">Máquinas Ativas</p>
                <h3 className="kpi-value">{stats.activeMachines} <span className="text-sm text-secondary">/ {stats.totalMachines}</span></h3>
                <p className="kpi-meta text-primary">{stats.totalMachines > 0 ? Math.round((stats.activeMachines / stats.totalMachines) * 100) : 0}% em operação</p>
              </div>
            </div>
          </div>

          {/* Main Charts & Rankings Area */}
          <div className="dashboard-content">
            <div className="chart-section glass-panel animate-fade-in delay-200" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 className="section-title">Análise de Paradas de Máquina (Minutos)</h3>
              <div className="chart-placeholder" style={{ flex: 1, height: '300px', padding: 0 }}>
                {downtimeData.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <p className="text-muted text-center" style={{ width: '100%' }}>Nenhuma parada registrada.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={downtimeData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                      <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
                      <YAxis stroke="#888" tick={{ fill: '#888' }} />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '8px' }}
                      />
                      <Bar dataKey="value" name="Minutos Parados" radius={[4, 4, 0, 0]}>
                        {downtimeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="ranking-section glass-panel animate-fade-in delay-300">
              <h3 className="section-title">Análise de Refugos e Perdas (Qtd)</h3>
              <div className="chart-placeholder" style={{ flex: 1, height: '300px', padding: 0 }}>
                {scrapData.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <p className="text-muted text-center" style={{ width: '100%' }}>Nenhum refugo registrado.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={scrapData}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {scrapData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="ranking-section glass-panel animate-fade-in delay-300" style={{ gridColumn: '1 / -1' }}>
              <h3 className="section-title">Ranking de Máquinas (Eficiência do Recorte)</h3>
              <div className="chart-placeholder" style={{ height: '200px', padding: 0 }}>
                {chartData.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <p className="text-muted text-center" style={{ width: '100%' }}>Sem dados para exibir.</p>
                  </div>
                ) : (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div className="bar-chart-mock">
                      {chartData.map((item, i) => {
                        const actualHeight = Math.min((item.produced / item.target) * 100, 100);
                        return (
                          <div key={i} className="bar-group" title={`${item.name} - Prod: ${item.produced} / Meta: ${item.target}`}>
                            <div className="bar target" style={{ height: '100%' }}></div>
                            <div className="bar actual" style={{ height: `${actualHeight}%` }}></div>
                            <span className="bar-label">{item.id}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="chart-legend" style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: 'auto', paddingTop: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: 'rgba(46, 160, 67, 0.8)' }}></div>
                        <span className="text-sm font-medium">Meta do Turno</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: 'linear-gradient(180deg, #0066ff 0%, #0052cc 100%)' }}></div>
                        <span className="text-sm font-medium">Produzido Líquido</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Nova Seção: Tabela Detalhada por Peça */}
            <div className="detailed-table-section glass-panel animate-fade-in delay-300" style={{ gridColumn: '1 / -1', padding: '1.5rem', marginTop: '0.5rem' }}>
              <h3 className="section-title">Detalhamento por Máquina e Peça</h3>
              <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <table className="custom-table" style={{ minWidth: '900px' }}>
                  <thead>
                    <tr>
                      <th>Máquina</th>
                      <th>Peça Produzida</th>
                      <th>Operador</th>
                      <th className="text-center">Meta</th>
                      <th className="text-center">Gross (Bruto)</th>
                      <th className="text-center">Refugo</th>
                      <th className="text-center">Líquido</th>
                      <th className="text-center">OEE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailedShifts.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">Nenhum lançamento no período filtrado.</td>
                      </tr>
                    ) : (
                      detailedShifts.map((row) => (
                        <tr key={row.id}>
                          <td style={{ whiteSpace: 'nowrap' }}><strong>{row.machineName}</strong></td>
                          <td><span className="text-secondary">{row.partName}</span></td>
                          <td style={{ whiteSpace: 'nowrap' }}>{row.operatorName}</td>
                          <td className="text-center" style={{ fontWeight: '500' }}>{row.target}</td>
                          <td className="text-center" style={{ fontWeight: '500' }}>{row.producedGross}</td>
                          <td className="text-center text-danger" style={{ fontWeight: 'bold' }}>{row.refuse}</td>
                          <td className="text-center text-success" style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>{row.producedNet}</td>
                          <td className="text-center">
                            <span className={`badge badge-${row.status}`} style={{ fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}>
                              {row.oee}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </>
      ) : activeTab === 'machine_details' ? (
        <div className="machine-details-tab animate-fade-in">
          <div className="filter-bar glass-panel" style={{ display: 'flex', gap: '1rem', padding: '1rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="form-group" style={{ marginBottom: 0, minWidth: '250px' }}>
              <label className="form-label text-sm">Selecione a Máquina</label>
              <select
                className="input-field"
                style={{ padding: '0.5rem 1rem' }}
                value={selectedMachineId}
                onChange={(e) => setSelectedMachineId(e.target.value)}
              >
                <option value="">-- Selecione uma Máquina --</option>
                {availableMachines.map(m => (
                  <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0, minWidth: '180px' }}>
              <label className="form-label text-sm">Turno (Ocultar Restante)</label>
              <select
                className="input-field"
                style={{ padding: '0.5rem 1rem' }}
                value={selectedMachineShift}
                onChange={(e) => setSelectedMachineShift(e.target.value)}
              >
                <option value="ALL">Todos (Comparativo)</option>
                <option value="1">Turno 1 (06:00 - 14:00)</option>
                <option value="2">Turno 2 (14:00 - 22:00)</option>
                <option value="3">Turno 3 (22:00 - 06:00)</option>
                <option value="comercial">Comercial</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, maxWidth: '200px' }}>
              <label className="form-label text-sm">Data de Referência</label>
              <div className="input-with-icon">
                <Calendar className="input-icon" size={16} style={{ left: '10px' }} />
                <input
                  type="date"
                  className="input-field"
                  style={{ paddingLeft: '2.2rem', padding: '0.5rem 1rem 0.5rem 2.2rem', colorScheme: 'dark' }}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {machineData.loading ? (
             <div className="text-center py-4"><div className="text-secondary">Carregando dados da máquina...</div></div>
          ) : machineData.shifts.length === 0 ? (
             <div className="glass-panel text-center py-4"><p className="text-muted">Nenhum apontamento encontrado para esta máquina nesta data.</p></div>
          ) : (
             <div className="grid-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {machineData.shifts.filter(s => selectedMachineShift === 'ALL' || s.shift_number === SHIFT_MAP[selectedMachineShift] || String(s.shift_number) === selectedMachineShift).length === 0 ? (
                   <p className="text-muted text-center py-4">Nenhum lançamento ocorreu na máquina/data para o turno selecionado.</p>
                ) : (
                   machineData.shifts
                     .filter(s => selectedMachineShift === 'ALL' || s.shift_number === SHIFT_MAP[selectedMachineShift] || String(s.shift_number) === selectedMachineShift)
                     .map(shift => {
                        const targ = shift.target || shift.machines?.target_per_shift || 1;
                   const prodGross = shift.produced_gross || 0;
                   const ref = shift.refuse || 0;
                   const prodNet = shift.net_production !== undefined ? shift.net_production : Math.max(0, prodGross - ref);
                   const eff = Math.round((prodNet / targ) * 100);
                   const badgeClass = eff >= 90 ? 'success' : eff >= 75 ? 'primary' : eff >= 50 ? 'warning' : 'danger';
                   
                   return (
                     <div key={shift.id} className="shift-card glass-panel" style={{ padding: '1.5rem', borderLeft: `4px solid var(--${badgeClass === 'primary' ? 'primary-color' : badgeClass + '-color'})` }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                         <div>
                           <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{SHIFT_MAP[shift.shift_number] || `Turno ${shift.shift_number}`}</h3>
                           <p className="text-secondary" style={{ marginTop: '0.25rem' }}>{shift.parts?.name || 'Sem Peça Selecionada'} (Cód: {shift.parts?.part_number}) — Operador: {shift.operators?.name}</p>
                         </div>
                         <div style={{ textAlign: 'right' }}>
                           <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-family-display)' }} className={`text-${badgeClass}`}>
                             {eff}%
                           </div>
                           <div className="text-secondary text-sm">OEE do Lote</div>
                         </div>
                       </div>
                       
                       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
                             <div className="text-sm text-secondary">Meta</div>
                             <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{targ} un</div>
                          </div>
                          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
                             <div className="text-sm text-secondary">Produção Bruta</div>
                             <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{prodGross} un</div>
                          </div>
                          <div style={{ background: 'rgba(248, 81, 73, 0.1)', padding: '0.75rem', borderRadius: '8px' }}>
                             <div className="text-sm text-danger">Refugo Total</div>
                             <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }} className="text-danger">{ref} un</div>
                          </div>
                          <div style={{ background: 'rgba(46, 160, 67, 0.1)', padding: '0.75rem', borderRadius: '8px' }}>
                             <div className="text-sm text-success">Produção Líquida</div>
                             <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }} className="text-success">{prodNet} un</div>
                          </div>
                       </div>
                       
                       <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '2rem' }}>
                          <div>
                             <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Settings size={16} className="text-danger" /> Motivos de Parada</h4>
                             {(!shift.downtimes || shift.downtimes.length === 0) ? (
                                <p className="text-secondary text-sm">Sem paradas registradas.</p>
                             ) : (
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                   {shift.downtimes.map((dw, idx) => (
                                      <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                         <span className="text-sm">{dw.reason}</span>
                                         <span className="text-sm font-bold text-danger">{dw.minutes} min</span>
                                      </li>
                                   ))}
                                </ul>
                             )}
                          </div>
                          <div>
                             <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertCircle size={16} className="text-warning" /> Detalhamento de Refugo</h4>
                             {(!shift.scraps || shift.scraps.length === 0) ? (
                                <p className="text-secondary text-sm">Sem código de refugo registrado.</p>
                             ) : (
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                   {shift.scraps.map((sc, idx) => (
                                      <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                         <span className="text-sm">{sc.reason}</span>
                                         <span className="text-sm font-bold text-warning">{sc.quantity} un</span>
                                      </li>
                                   ))}
                                </ul>
                             )}
                          </div>
                       </div>
                     </div>
                   );
                })
             )}
             </div>
          )}
        </div>
      ) : activeTab === 'shift_summary' ? (
        <div className="shift-summary-tab animate-fade-in">
          <div className="filter-bar glass-panel" style={{ display: 'flex', gap: '1rem', padding: '1rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, maxWidth: '200px' }}>
              <label className="form-label text-sm">Data de Referência</label>
              <div className="input-with-icon">
                <Calendar className="input-icon" size={16} style={{ left: '10px' }} />
                <input
                  type="date"
                  className="input-field"
                  style={{ paddingLeft: '2.2rem', padding: '0.5rem 1rem 0.5rem 2.2rem', colorScheme: 'dark' }}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {!shiftSummaryData ? (
             <div className="text-center py-4"><div className="text-secondary">Carregando comparativo dos turnos...</div></div>
          ) : shiftSummaryData.shifts.length === 0 ? (
             <div className="glass-panel text-center py-4"><p className="text-muted">Nenhum turno registrado para esta data.</p></div>
          ) : (
             <>
                {/* Consolidado do Dia */}
                <div className="glass-panel main-consolidated" style={{ padding: '2rem', marginBottom: '2rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.2) 100%)', border: '1px solid rgba(255,255,255,0.1)' }}>
                   <h2 style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Consolidado do Dia</h2>
                   <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '2rem' }}>
                      <div>
                         <div className="text-sm text-secondary mb-1">OEE Global</div>
                         <div style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1, color: `var(--${shiftSummaryData.dailyOee >= 75 ? 'success' : shiftSummaryData.dailyOee >= 50 ? 'warning' : 'danger'}-color)` }}>{shiftSummaryData.dailyOee}%</div>
                      </div>
                      <div>
                         <div className="text-sm text-secondary mb-1">Total Produzido</div>
                         <div style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2 }} className="text-primary">{shiftSummaryData.dailyProduced.toLocaleString()} un</div>
                      </div>
                      <div>
                         <div className="text-sm text-secondary mb-1">Total Refugado</div>
                         <div style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2 }} className="text-danger">{shiftSummaryData.dailyRefuse.toLocaleString()} un</div>
                      </div>
                   </div>
                </div>

                <h3 className="section-title">Desempenho por Turno (Ranking)</h3>
                <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                   {shiftSummaryData.shifts.map((shift, index) => (
                      <div key={index} className="shift-card glass-panel animate-slide-up" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden', animationDelay: (index * 100) + 'ms' }}>
                         <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: `var(--${shift.status === 'primary' ? 'primary-color' : shift.status + '-color'})` }}></div>
                         
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.3rem' }}>{shift.name}</h3>
                            <div style={{ textAlign: 'right' }}>
                               <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-family-display)' }} className={`text-${shift.status}`}>
                                  {shift.oee}%
                               </div>
                               <div className="text-secondary text-sm">OEE</div>
                            </div>
                         </div>
                         
                         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
                               <div className="text-sm text-secondary">Produção Líquida</div>
                               <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }} className="text-success">{shift.produced.toLocaleString()}</div>
                               <div className="text-sm text-muted mt-1">Meta: {shift.target.toLocaleString()}</div>
                            </div>
                            <div style={{ background: 'rgba(248, 81, 73, 0.1)', padding: '0.75rem', borderRadius: '8px' }}>
                               <div className="text-sm text-danger">Refugo</div>
                               <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }} className="text-danger">{shift.refuse.toLocaleString()}</div>
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             </>
          )}
        </div>
      ) : (
        /* --- OEE ANALYSIS TAB --- */
        <div className="oee-analysis-tab animate-fade-in">
          <div className="filter-bar glass-panel" style={{ display: 'flex', gap: '1rem', padding: '1rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="form-group" style={{ marginBottom: 0, minWidth: '150px' }}>
              <label className="form-label text-sm">Visualizar por</label>
              <select
                className="input-field"
                style={{ padding: '0.5rem 1rem' }}
                value={analysisPeriod}
                onChange={(e) => setAnalysisPeriod(e.target.value)}
              >
                <option value="daily">Diário (Um dia específico)</option>
                <option value="weekly">Semanal (Semana da data)</option>
                <option value="monthly">Mensal (Mês da data)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0, flex: 1, maxWidth: '200px' }}>
              <label className="form-label text-sm">Data de Referência</label>
              <div className="input-with-icon">
                <Calendar className="input-icon" size={16} style={{ left: '10px' }} />
                <input
                  type={analysisPeriod === 'monthly' ? "month" : "date"}
                  className="input-field"
                  style={{ paddingLeft: '2.2rem', padding: '0.5rem 1rem 0.5rem 2.2rem', colorScheme: 'dark' }}
                  value={analysisPeriod === 'monthly' ? analysisDate.substring(0, 7) : analysisDate}
                  onChange={(e) => {
                    let nextVal = e.target.value;
                    if (analysisPeriod === 'monthly') nextVal += '-01';
                    setAnalysisDate(nextVal);
                  }}
                />
              </div>
            </div>
          </div>

          {analysisData.loading ? (
            <div className="text-center py-4"><div className="text-secondary">Carregando dados...</div></div>
          ) : (
            <>
              <div className="kpi-grid" style={{ marginBottom: '2rem' }}>
                <div className="kpi-card glass-panel" style={{ borderTop: '4px solid var(--primary-color)' }}>
                  <div className="kpi-content">
                    <p className="kpi-label">OEE Geral do Período</p>
                    <h3 className="kpi-value">{analysisData.overallOee}%</h3>
                    <div className="progress-bar-container mt-2">
                      <div className={`progress-bar ${analysisData.overallOee >= 80 ? 'success' : analysisData.overallOee >= 50 ? 'warning' : 'danger'}`} style={{ width: analysisData.overallOee + '%' }}></div>
                    </div>
                  </div>
                </div>

                <div className="kpi-card glass-panel">
                  <div className="kpi-content">
                    <p className="kpi-label">Produção Líquida</p>
                    <h3 className="kpi-value text-success">{analysisData.totalProduced.toLocaleString()} un</h3>
                  </div>
                </div>

                <div className="kpi-card glass-panel">
                  <div className="kpi-content">
                    <p className="kpi-label">Total Refugado</p>
                    <h3 className="kpi-value text-danger">{analysisData.totalRefuse.toLocaleString()} un</h3>
                  </div>
                </div>
              </div>

              <div className="shift-breakdown glass-panel" style={{ padding: '1.5rem' }}>
                <h3 className="section-title">OEE Separado por Turno</h3>
                {analysisData.shiftBreakdown.length === 0 ? (
                  <p className="text-center text-muted py-4">Nenhum log de turno encontrado para esse período.</p>
                ) : (
                  <div className="grid-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {analysisData.shiftBreakdown.map((shift, i) => (
                      <div key={i} className="shift-item glass-panel" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid ${shift.oee >= 80 ? 'var(--success-color)' : shift.oee >= 50 ? 'var(--warning-color)' : 'var(--danger-color)'}` }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{shift.name}</h4>
                          <div className="text-sm text-secondary mt-1">Prod Líquida: {shift.produced.toLocaleString()} un | Refugo: {shift.refuse.toLocaleString()} un</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-family-display)' }}>
                            <span style={{ color: shift.oee >= 80 ? 'var(--success-color)' : shift.oee >= 50 ? 'var(--warning-color)' : 'var(--danger-color)' }}>{shift.oee}%</span>
                          </div>
                          <div className="text-secondary text-sm">Eficiência</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        .dashboard-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 1rem;
          flex-wrap: wrap;
        }
        
        .shift-pill {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            color: var(--text-secondary);
            padding: 0.4rem 1rem;
            border-radius: 20px;
            font-size: 0.85rem;
            cursor: pointer;
            transition: all 0.2s ease;
            font-weight: 500;
        }
        
        .shift-pill:hover {
            background: rgba(255,255,255,0.1);
            color: var(--text-primary);
        }
        
        .shift-pill.active {
            background: var(--primary-color);
            color: white;
            border-color: var(--primary-color);
            box-shadow: 0 0 10px rgba(0, 102, 255, 0.3);
        }

        .header-actions {
          display: flex;
          gap: 1rem;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
        }

        .kpi-card {
          padding: 1.5rem;
          display: flex;
          align-items: flex-start;
          gap: 1.25rem;
        }

        .kpi-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .kpi-icon-wrapper.success { background: rgba(46, 160, 67, 0.15); color: #3fb950; }
        .kpi-icon-wrapper.warning { background: rgba(210, 153, 34, 0.15); color: #d29922; }
        .kpi-icon-wrapper.primary { background: rgba(0, 102, 255, 0.15); color: #58a6ff; }
        .kpi-icon-wrapper.outline { background: var(--bg-surface); border: 1px solid var(--border-color); color: var(--text-secondary); }

        .kpi-content {
          flex: 1;
        }

        .kpi-label {
          font-size: 0.85rem;
          color: var(--text-secondary);
          font-weight: 500;
          margin-bottom: 0.25rem;
        }

        .kpi-value {
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0 0 0.25rem 0;
          font-family: var(--font-family-display);
        }

        .kpi-meta {
          font-size: 0.75rem;
          font-weight: 500;
        }
        
        .text-sm {
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .progress-bar-container {
          width: 100%;
          height: 6px;
          background: var(--bg-surface-elevated);
          border-radius: 3px;
          overflow: hidden;
        }
        
        .progress-bar {
          height: 100%;
          border-radius: 3px;
        }
        .progress-bar.primary { background: var(--primary-color); }
        .mt-2 { margin-top: 0.5rem; }

        .dashboard-content {
          display: grid;
          grid-template-columns: 3fr 2fr;
          gap: 1.5rem;
        }

        .section-title {
          font-size: 1.1rem;
          margin-bottom: 1.5rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--border-color);
        }

        .chart-section, .ranking-section {
          padding: 1.5rem;
        }

        /* Mock Chart CSS */
        .chart-placeholder {
          height: 250px;
          display: flex;
          align-items: flex-end;
          padding-top: 1rem;
        }
        
        .bar-chart-mock {
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: space-around;
          align-items: flex-end;
          gap: 10px;
          padding-bottom: 35px;
        }

        .bar-group {
          flex: 1;
          height: 100%;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: flex-end;
          max-width: 50px;
        }

        .bar {
          position: absolute;
          bottom: 0;
          width: 50%;
          border-radius: 4px 4px 0 0;
        }

        .bar.target {
          background: rgba(46, 160, 67, 0.8); /* Green */
          left: 0;
          z-index: 1;
        }

        .bar.actual {
          background: linear-gradient(180deg, #0066ff 0%, #0052cc 100%); /* Blue */
          right: 0;
          z-index: 2;
          box-shadow: 0 0 10px rgba(0, 102, 255, 0.5);
        }

        .bar-label {
          position: absolute;
          bottom: -30px;
          font-size: 0.75rem;
          color: var(--text-secondary);
          width: 150%;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          left: 50%;
          transform: translateX(-50%);
        }

        /* Ranking CSS */
        .ranking-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .ranking-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem;
          background: rgba(255,255,255,0.02);
          border-radius: var(--border-radius-md);
          border: 1px solid transparent;
          transition: var(--transition-fast);
        }

        .ranking-item:hover {
          background: rgba(255,255,255,0.05);
          border-color: var(--border-color);
        }

        .ranking-pos {
          font-weight: 700;
          color: var(--text-secondary);
          width: 30px;
        }

        .ranking-info {
          flex: 1;
        }

        .ranking-info h4 {
          font-size: 0.95rem;
          margin-bottom: 0.2rem;
        }

        .score-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.85rem;
        }

        .custom-table th {
          text-align: left;
          padding: 1.25rem 1rem;
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 0.85rem;
          text-transform: uppercase;
          white-space: nowrap;
          position: sticky;
          top: 0;
          background-color: #0f172a; /* Cor sólida para tapar o scroll atrás */
          z-index: 10;
          box-shadow: inset 0 -2px 0 var(--border-color); /* Usando shadow como borda que acompanha no scroll */
        }

        .text-right { text-align: right; }
        .text-center { text-align: center !important; }
        .py-4 { padding-top: 2rem; padding-bottom: 2rem; }

        .custom-table td {
          padding: 1.25rem 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          font-size: 1rem;
          vertical-align: middle;
        }

        .custom-table tbody tr:hover {
          background: rgba(255,255,255,0.05);
        }

        .score-badge.excellent { background: rgba(46, 160, 67, 0.15); color: #3fb950; }
        .score-badge.good { background: rgba(0, 102, 255, 0.15); color: #58a6ff; }
        .score-badge.warning { background: rgba(210, 153, 34, 0.15); color: #d29922; }
        .score-badge.danger { background: rgba(248, 81, 73, 0.15); color: #ff7b72; }

        @media (max-width: 900px) {
          .dashboard-content { grid-template-columns: 1fr; }
          .page-header { flex-direction: column; align-items: stretch; }
          .tab-switcher { width: 100%; justify-content: space-between; }
          .tab-switcher .btn { flex: 1; justify-content: center; }
          .filter-container { flex-direction: column; align-items: flex-start !important; gap: 1rem; }
          .shift-filters { flex-wrap: wrap; }
        }
      `}</style>
    </div>
  );
}
