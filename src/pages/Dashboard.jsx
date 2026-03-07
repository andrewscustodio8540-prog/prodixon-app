import { useState, useEffect } from 'react';
import { TrendingUp, Settings, AlertCircle, CheckCircle2, Calendar, Factory } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.company_id) {
      fetchDashboardData(selectedDate);
    } else {
      setLoading(false);
    }
  }, [user, selectedDate]);

  const fetchDashboardData = async (dateStr) => {
    try {

      const { data: machinesData, error: mErr } = await supabase
        .from('machines')
        .select('*')
        .eq('company_id', user.company_id);

      const { data: shiftsData, error: sErr } = await supabase
        .from('shifts')
        .select('*, machines(code, name, target_per_shift)')
        .eq('company_id', user.company_id)
        .eq('date', dateStr);

      if (mErr || sErr) throw (mErr || sErr);

      const activeMachines = machinesData?.filter(m => m.status === 'Ativa').length || 0;
      const totalMachines = machinesData?.length || 0;

      let totalProduced = 0;
      let totalRefuse = 0;
      let totalTargetProcessed = 0;
      const machinePerformances = {};

      shiftsData?.forEach(shift => {
        totalProduced += shift.net_production;
        totalRefuse += shift.refuse;

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
        machinePerformances[mId].produced += shift.net_production;
        machinePerformances[mId].target += shiftTarget;
        totalTargetProcessed += shiftTarget;
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
          status: eff >= 90 ? 'excellent' : eff >= 75 ? 'good' : eff >= 50 ? 'warning' : 'danger'
        };
      });

      const top5 = [...ranking].sort((a, b) => b.eff - a.eff).slice(0, 5);

      setChartData(ranking);

      setStats({
        totalProduced,
        totalTarget: totalTargetProcessed > 0 ? totalTargetProcessed : 1,
        activeMachines,
        totalMachines,
        oeeGeneral: oeeGeneral > 100 ? 100 : oeeGeneral,
        refuse: totalRefuse
      });
      setMachineRanking(top5);

    } catch (err) {
      console.error("Erro ao carregar Dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <div>
          <h1 className="text-gradient">Visão Geral da Produção</h1>
          <p className="text-secondary">Acompanhamento em tempo real do turno atual</p>
        </div>
        <div className="header-actions">
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
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card glass-panel animate-slide-up delay-100">
          <div className="kpi-icon-wrapper success">
            <TrendingUp size={24} />
          </div>
          <div className="kpi-content">
            <p className="kpi-label">Produção Líquida</p>
            <h3 className="kpi-value">{stats.totalProduced.toLocaleString()} <span className="text-sm">un</span></h3>
            <p className="kpi-meta text-success">
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
            <p className="kpi-meta text-warning">
              {stats.totalProduced + stats.refuse > 0 ? ((stats.refuse / (stats.totalProduced + stats.refuse)) * 100).toFixed(1) : 0}% de perda
            </p>
          </div>
        </div>

        <div className="kpi-card glass-panel animate-slide-up delay-300">
          <div className="kpi-icon-wrapper primary">
            <CheckCircle2 size={24} />
          </div>
          <div className="kpi-content">
            <p className="kpi-label">OEE Geral</p>
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
        <div className="chart-section glass-panel animate-fade-in delay-200">
          <h3 className="section-title">Produção x Meta (Turno Atual)</h3>
          <div className="chart-placeholder">
            {chartData.length === 0 ? (
              <p className="text-muted text-center" style={{ width: '100%' }}>Sem dados para exibir.</p>
            ) : (
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
            )}
          </div>
        </div>

        <div className="ranking-section glass-panel animate-fade-in delay-300">
          <h3 className="section-title">Ranking de Máquinas (Eficiência)</h3>
          <div className="ranking-list">
            {machineRanking.length === 0 && <p className="text-muted text-center py-4">Nenhuma produção registrada hoje.</p>}
            {machineRanking.map((mq, i) => (
              <div key={i} className="ranking-item">
                <div className="ranking-pos">#{i + 1}</div>
                <div className="ranking-info">
                  <h4>{mq.name}</h4>
                  <span className="text-secondary">{mq.id}</span>
                </div>
                <div className="ranking-score">
                  <span className={"score-badge " + mq.status}>{mq.eff}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

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
          grid-template-columns: 2fr 1fr;
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
          background: var(--bg-surface-elevated);
          left: 0;
          z-index: 1;
        }

        .bar.actual {
          background: linear-gradient(180deg, var(--primary-color) 0%, var(--primary-hover) 100%);
          right: 0;
          z-index: 2;
          box-shadow: 0 0 10px var(--primary-glow);
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

        .score-badge.excellent { background: rgba(46, 160, 67, 0.15); color: #3fb950; }
        .score-badge.good { background: rgba(0, 102, 255, 0.15); color: #58a6ff; }
        .score-badge.warning { background: rgba(210, 153, 34, 0.15); color: #d29922; }
        .score-badge.danger { background: rgba(248, 81, 73, 0.15); color: #ff7b72; }

        @media (max-width: 900px) {
          .dashboard-content { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
