import React, { useEffect, useState, useCallback } from 'react';

/* ── Types ── */
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

interface ThinkingLog {
  id: string;
  trader_name: string;
  prompt_summary: string;
  output: string;
  status_code: string;
  created_at: string;
}

interface TraderCard {
  id: string;
  name: string;
  strategy_name: string;
  symbols: string[];
  scan_interval: string;
  status: string;
  last_scan_time?: string;
  last_signal?: string;
}

/* ── Colors ── */
const C = {
  bg: '#0a0a0f',
  card: '#12121a',
  border: '#1e1e2e',
  purple: '#6c5ce7',
  cyan: '#00cec9',
  green: '#00b894',
  red: '#d63031',
  yellow: '#fdcb6e',
  text: '#cdd6f4',
  muted: '#585b70',
  dim: '#313244',
};

/* ── Helpers ── */
function signalColor(signal: string): string {
  switch (signal) {
    case 'long': case 'buy': return C.green;
    case 'short': case 'sell': return C.red;
    case 'close': return C.yellow;
    case 'hold': return C.muted;
    default: return C.muted;
  }
}

function signalLabel(signal: string): string {
  switch (signal) {
    case 'buy': return '📈 买入';
    case 'sell': return '📉 卖出';
    case 'long': return '📈 做多';
    case 'short': return '📉 做空';
    case 'close': return '🔒 平仓';
    case 'hold': return '⏸ 持仓';
    default: return signal;
  }
}

function statusColor(st: string): string {
  return st === 'running' ? C.green : C.muted;
}

function fmtTime(t: string): string {
  try {
    return new Date(t).toLocaleString('zh-CN', { hour12: false });
  } catch {
    return t;
  }
}

function fmtTimeShort(t: string): string {
  try {
    return new Date(t).toLocaleTimeString('zh-CN', { hour12: false });
  } catch {
    return t;
  }
}

const API = '';

async function get<T>(url: string, params?: Record<string, string>): Promise<T> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const res = await fetch(`${API}${url}${qs}`, { headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* ── Styles ── */
const s = {
  section: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, marginBottom: 12 } as React.CSSProperties,
  label: { display: 'block', fontSize: 11, color: C.muted, marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.5px' } as React.CSSProperties,
};

/* ═══════════════ 看板 Dashboard ═══════════════ */
export default function Dashboard() {
  const [hermesStatus, setHermesStatus] = useState<'online' | 'offline' | 'loading'>('loading');
  const [traders, setTraders] = useState<TraderCard[]>([]);
  const [thinkingLogs, setThinkingLogs] = useState<ThinkingLog[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      // Hermes status
      try {
        const hs = await get<any>('/api/chat/hermes-status');
        setHermesStatus(hs.running ? 'online' : 'offline');
      } catch {
        setHermesStatus('offline');
      }

      // Running traders — try multiple endpoints
      try {
        const rt = await get<{ traders: TraderCard[] }>('/api/dashboard/traders');
        setTraders(rt.traders || []);
      } catch {
        try {
          const t = await get<TraderCard[]>('/api/traders?status=running');
          setTraders(Array.isArray(t) ? t : []);
        } catch {
          setTraders([]);
        }
      }

      // Thinking logs
      try {
        const tl = await get<{ logs: ThinkingLog[] }>('/api/dashboard/thinking-logs');
        setThinkingLogs(tl.logs?.slice(0, 20) || []);
      } catch {
        setThinkingLogs([]);
      }

      // Recent decisions
      try {
        const d = await get<{ decisions: Decision[] }>('/api/dashboard/decisions');
        setDecisions(d.decisions?.slice(0, 10) || []);
      } catch {
        setDecisions([]);
      }
    } catch {}
  }, []);

  useEffect(() => { loadAll(); const iv = setInterval(loadAll, 10000); return () => clearInterval(iv); }, [loadAll]);

  return (
    <div style={{ padding: '0 4px', animation: 'fadeIn 0.3s ease' }}>
      {/* ═══ 标题栏 ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20, fontWeight: 700, background: `linear-gradient(135deg, ${C.purple}, ${C.cyan})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            🤖 Crypto AI Trader
          </span>
          <span style={{ fontSize: 10, background: 'rgba(108,92,231,0.15)', color: C.purple, padding: '2px 8px', borderRadius: 4, border: `1px solid rgba(108,92,231,0.3)` }}>
            Hermes 驱动
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: hermesStatus === 'online' ? C.green : hermesStatus === 'offline' ? C.red : C.yellow,
            boxShadow: hermesStatus === 'online' ? `0 0 6px ${C.green}` : 'none',
            animation: hermesStatus === 'online' ? 'pulse 2s ease-in-out infinite' : 'none',
          }} />
          <span style={{ fontSize: 11, color: C.muted }}>
            {hermesStatus === 'online' ? '运行中' : hermesStatus === 'offline' ? '离线' : '检测中...'}
          </span>
        </div>
      </div>

      {/* ═══ 第一行 — 运行中交易员卡片 ═══ */}
      <div style={s.section}>
        <div style={{ ...s.label, marginBottom: 10 }}>📡 运行中交易员</div>
        {traders.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
            暂无运行中的交易员
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
            {traders.map((t) => (
              <div key={t.id} className="animate-slide" style={{
                flex: '0 0 220px',
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: 12,
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Top accent bar */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${C.purple}, ${C.cyan})` }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{t.name}</span>
                  <span style={{ fontSize: 10, color: statusColor(t.status), background: `${statusColor(t.status)}15`, padding: '1px 6px', borderRadius: 3, border: `1px solid ${statusColor(t.status)}30` }}>
                    {t.status === 'running' ? '● 运行中' : '● 已停止'}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.8 }}>
                  <div>📋 {t.strategy_name || '无策略'}</div>
                  <div>💱 {t.symbols?.join(', ') || '-'}</div>
                  <div>⏱ {t.scan_interval || '-'}</div>
                  {t.last_scan_time && <div>🕐 {fmtTimeShort(t.last_scan_time)}</div>}
                </div>
                {t.last_signal && (
                  <div style={{ marginTop: 8, padding: '4px 8px', background: `${signalColor(t.last_signal)}12`, borderRadius: 4, fontSize: 11, fontWeight: 600, color: signalColor(t.last_signal), textAlign: 'center' }}>
                    {signalLabel(t.last_signal)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ 第二行 — 思维链实时日志 ═══ */}
      <div style={s.section}>
        <div style={{ ...s.label, marginBottom: 10 }}>⎯ Hermes 思维链实时日志 ⎯</div>
        {thinkingLogs.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
            暂无思维链日志
          </div>
        ) : (
          <div style={{ maxHeight: 240, overflowY: 'auto', fontSize: 12, fontFamily: 'monospace', lineHeight: 1.7 }}>
            {thinkingLogs.map((log) => (
              <div key={log.id}>
                <div
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  style={{ display: 'flex', gap: 8, padding: '3px 6px', borderRadius: 4, cursor: 'pointer', color: C.dim, transition: 'background 0.15s', background: expandedLog === log.id ? 'rgba(108,92,231,0.08)' : 'transparent' }}
                  onMouseEnter={(e) => { if (expandedLog !== log.id) e.currentTarget.style.background = 'rgba(30,30,46,0.5)'; }}
                  onMouseLeave={(e) => { if (expandedLog !== log.id) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ color: C.muted, flexShrink: 0 }}>[{fmtTimeShort(log.created_at)}]</span>
                  <span style={{ color: C.purple, flexShrink: 0 }}>{log.trader_name}</span>
                  <span style={{ color: C.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>| {log.prompt_summary}</span>
                  <span style={{
                    flexShrink: 0,
                    color: log.status_code === '200' || log.status_code === 'success' ? C.green : log.status_code === 'error' ? C.red : C.yellow,
                    fontSize: 10,
                  }}>
                    [{log.status_code}]
                  </span>
                </div>
                {expandedLog === log.id && log.output && (
                  <pre style={{
                    margin: '2px 0 4px 16px',
                    padding: 8,
                    background: '#0a0a0f',
                    border: `1px solid ${C.border}`,
                    borderRadius: 4,
                    fontSize: 11,
                    color: C.dim,
                    lineHeight: 1.5,
                    maxHeight: 200,
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {log.output}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ 第三行 — 最近决策列表 ═══ */}
      <div style={s.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={s.label}>📋 最近决策</span>
          <span style={{ fontSize: 10, color: C.muted }}>最近 10 条 · 每 10 秒自动刷新</span>
        </div>
        {decisions.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
            暂无决策数据
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>时间</th>
                  <th>交易对</th>
                  <th>信号</th>
                  <th>置信度</th>
                  <th>分析摘要</th>
                </tr>
              </thead>
              <tbody>
                {decisions.map((d) => (
                  <tr key={d.id} className="animate-fade">
                    <td style={{ fontSize: 12, color: C.muted, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {fmtTimeShort(d.created_at)}
                    </td>
                    <td style={{ fontWeight: 600, color: C.text }}>
                      {d.symbol}
                      <span style={{ fontSize: 10, color: C.muted, marginLeft: 4 }}>[{d.scan_interval}]</span>
                    </td>
                    <td>
                      <span style={{
                        color: signalColor(d.signal),
                        fontWeight: 600,
                        fontSize: 12,
                        background: `${signalColor(d.signal)}12`,
                        padding: '2px 8px',
                        borderRadius: 4,
                      }}>
                        {signalLabel(d.signal)}
                      </span>
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="progress-bar" style={{ flex: 1 }}>
                          <div className="progress-bar-fill" style={{
                            width: `${d.confidence}%`,
                            background: d.confidence >= 70 ? C.green : d.confidence >= 40 ? C.yellow : C.red,
                          }} />
                        </div>
                        <span style={{ fontSize: 11, color: C.muted, fontFamily: 'monospace', minWidth: 30 }}>{d.confidence}%</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: C.dim, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.master_chain?.slice(0, 80) || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
