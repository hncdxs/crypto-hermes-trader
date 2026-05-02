import React, { useEffect, useState } from 'react';
import { api } from '../api';

interface Summary {
  running_traders: number;
  strategies: number;
  decisions_24h: number;
}

interface Decision {
  id: string;
  trader_name: string;
  strategy_name: string;
  symbol: string;
  signal: string;
  confidence: number;
  scan_interval: string;
  monitor_output: string;
  master_chain: string;
  decision_chain: any[];
  created_at: string;
}

interface Position {
  id: string;
  trader_name: string;
  strategy_name: string;
  symbol: string;
  side: string;
  open_price: number | null;
  close_price: number | null;
  quantity: number | null;
  pnl: number | null;
  fee: number | null;
  open_time: string;
  close_time: string | null;
  status: string;
}

const SCAN_INTERVALS = ['', '1m', '5m', '15m', '30m', '1h'];

function signalColor(signal: string): string {
  switch (signal) {
    case 'long': return '#34d399';
    case 'short': return '#fb7185';
    case 'close': return '#fbbf24';
    case 'hold': return '#94a3b8';
    default: return '#94a3b8';
  }
}

function signalLabel(signal: string): string {
  switch (signal) {
    case 'long': return '📈 做多';
    case 'short': return '📉 做空';
    case 'close': return '🔒 平仓';
    case 'hold': return '⏸ 持仓';
    default: return signal;
  }
}

function sideColor(side: string): string {
  return side === 'long' ? '#34d399' : '#fb7185';
}

function formatTime(t: string): string {
  try {
    return new Date(t).toLocaleString('zh-CN', { hour12: false });
  } catch {
    return t;
  }
}

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary>({ running_traders: 0, strategies: 0, decisions_24h: 0 });
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [periodFilter, setPeriodFilter] = useState('');
  const [expandedDecisions, setExpandedDecisions] = useState<Set<string>>(new Set());

  const loadData = async () => {
    try {
      const [s, d, p] = await Promise.all([
        api.getDashboardSummary(),
        api.getDecisions(periodFilter || undefined),
        api.getPositions(),
      ]);
      setSummary(s);
      setDecisions(d.decisions || []);
      setPositions(p.positions || []);
    } catch {}
  };

  useEffect(() => {
    loadData();
  }, [periodFilter]);

  const toggleExpand = (id: string) => {
    setExpandedDecisions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div>
      {/* ── 顶部概览卡片 ── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <div style={statCardStyle}>
          <div style={{ color: '#64748b', fontSize: 12 }}>运行中的交易员</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#22d3ee' }}>{summary.running_traders}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ color: '#64748b', fontSize: 12 }}>策略总数</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#a78bfa' }}>{summary.strategies}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ color: '#64748b', fontSize: 12 }}>24h 决策数</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#34d399' }}>{summary.decisions_24h}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* ── 左栏：决策列表 ── */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, color: '#34d399' }}>📋 决策列表</h3>
            <select
              style={filterSelectStyle}
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
            >
              <option value="">全部周期</option>
              {SCAN_INTERVALS.filter(Boolean).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {decisions.length === 0 && (
            <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: 40 }}>暂无决策数据</div>
          )}

          {decisions.map((d) => (
            <div key={d.id} style={decisionCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
                  {formatTime(d.created_at)} [{d.scan_interval}]
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  {d.trader_name} · {d.strategy_name}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 14 }}>{d.symbol}</span>
                  <span style={{ marginLeft: 10, color: signalColor(d.signal), fontWeight: 600, fontSize: 13 }}>
                    {signalLabel(d.signal)}
                  </span>
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>
                    置信度: {(d.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <span
                  onClick={() => toggleExpand(d.id)}
                  style={{ color: '#64748b', fontSize: 12, cursor: 'pointer' }}
                >
                  {expandedDecisions.has(d.id) ? '▲ 收起' : '▼ 展开'}
                </span>
              </div>
              {expandedDecisions.has(d.id) && (
                <div style={{ marginTop: 10, borderTop: '1px solid #1e293b', paddingTop: 10 }}>
                  {d.monitor_output && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: '#a78bfa', marginBottom: 4 }}>🔍 Monitor 输出:</div>
                      <pre style={preStyle}>{d.monitor_output}</pre>
                    </div>
                  )}
                  {d.master_chain && (
                    <div>
                      <div style={{ fontSize: 11, color: '#fbbf24', marginBottom: 4 }}>👑 Master 思维链:</div>
                      <pre style={preStyle}>{d.master_chain}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── 右栏：当前持仓 ── */}
        <div style={{ width: 400, flexShrink: 0 }}>
          <h3 style={{ fontSize: 15, color: '#a78bfa', marginBottom: 12 }}>📦 当前持仓</h3>

          {positions.length === 0 && (
            <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: 40 }}>无持仓数据</div>
          )}

          {positions.map((p) => (
            <div key={p.id} style={positionCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{p.symbol}</span>
                <span style={{ color: sideColor(p.side), fontWeight: 600, fontSize: 13 }}>
                  {p.side === 'long' ? '📈 多头' : '📉 空头'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>开仓价</span>
                  <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{p.open_price?.toLocaleString() || '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>数量</span>
                  <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{p.quantity || '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>盈亏</span>
                  <span style={{ color: p.pnl && p.pnl >= 0 ? '#34d399' : '#fb7185', fontFamily: 'monospace' }}>
                    {p.pnl != null ? `${p.pnl >= 0 ? '+' : ''}${p.pnl.toFixed(2)}` : '-'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>交易员</span>
                  <span style={{ color: '#94a3b8' }}>{p.trader_name}</span>
                </div>
              </div>
            </div>
          ))}

          {/* ── 持仓表格 ── */}
          {positions.length > 0 && (
            <div style={{ ...cardStyle, marginTop: 12, overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#64748b', borderBottom: '1px solid #1e293b' }}>
                    <th style={thStyle}>币种</th>
                    <th style={thStyle}>方向</th>
                    <th style={thStyle}>开仓价</th>
                    <th style={thStyle}>盈亏</th>
                    <th style={thStyle}>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #0f172a' }}>
                      <td style={tdStyle}>{p.symbol}</td>
                      <td style={{ ...tdStyle, color: sideColor(p.side) }}>{p.side === 'long' ? '多头' : '空头'}</td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{p.open_price?.toLocaleString() || '-'}</td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', color: p.pnl && p.pnl >= 0 ? '#34d399' : '#fb7185' }}>
                        {p.pnl != null ? `${p.pnl >= 0 ? '+' : ''}${p.pnl.toFixed(2)}` : '-'}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ color: p.status === 'open' ? '#22d3ee' : '#64748b' }}>
                          {p.status === 'open' ? '🟢 持有中' : '🔒 已平仓'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const statCardStyle: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.5)',
  border: '1px solid #1e293b',
  borderRadius: 12,
  padding: '16px 20px',
  flex: 1,
};

const cardStyle: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.5)',
  border: '1px solid #1e293b',
  borderRadius: 10,
  padding: 14,
};

const decisionCardStyle: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.5)',
  border: '1px solid #1e293b',
  borderRadius: 10,
  padding: 14,
  marginBottom: 8,
};

const positionCardStyle: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.5)',
  border: '1px solid #1e293b',
  borderRadius: 10,
  padding: 14,
  marginBottom: 8,
};

const preStyle: React.CSSProperties = {
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: 6,
  padding: 10,
  fontSize: 11,
  fontFamily: 'monospace',
  color: '#94a3b8',
  lineHeight: 1.6,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  maxHeight: 200,
  overflow: 'auto',
};

const filterSelectStyle: React.CSSProperties = {
  padding: '6px 10px',
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: 6,
  color: 'white',
  fontSize: 12,
  outline: 'none',
};

const thStyle: React.CSSProperties = {
  padding: '6px 8px',
  textAlign: 'left',
  fontWeight: 500,
};

const tdStyle: React.CSSProperties = {
  padding: '8px',
};
