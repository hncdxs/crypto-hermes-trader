import React, { useEffect, useState } from 'react';

/* ── Types ── */
interface Trader {
  id: string;
  name: string;
  strategy_id: string | null;
  strategy_name: string | null;
  main_period: string;
  ref_period: string;
  scan_interval: string;
  trade_type: string;
  symbols: string[];
  llm_config_id: string | null;
  exchange_account_id: string | null;
  executor_temp: number;
  risk_temp: number;
  status: string;
  created_at: string;
  updated_at: string;
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

const API = '';

async function get<T>(url: string): Promise<T> {
  const res = await fetch(`${API}${url}`, { headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function post<T>(url: string, body?: any): Promise<T> {
  const res = await fetch(`${API}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function del(url: string): Promise<void> {
  const res = await fetch(`${API}${url}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
}

function fmtTime(t: string): string {
  try { return new Date(t).toLocaleString('zh-CN', { hour12: false }); } catch { return t; }
}

const labelS: React.CSSProperties = {
  display: 'block',
  fontSize: 11, color: C.muted, marginBottom: 4,
  textTransform: 'uppercase', letterSpacing: '0.5px',
};

const inputBase: React.CSSProperties = {
  width: '100%', padding: '7px 10px', background: C.bg, border: `1px solid ${C.border}`,
  borderRadius: 6, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box',
};

const btnS: React.CSSProperties = {
  padding: '7px 16px', background: C.card, border: `1px solid ${C.border}`,
  borderRadius: 6, color: C.text, cursor: 'pointer', fontSize: 12, fontWeight: 500,
  transition: 'all 0.15s',
};

const btnPrimaryS: React.CSSProperties = {
  ...btnS, background: `linear-gradient(135deg, ${C.purple}, #5a4bd1)`, border: 'none', color: '#fff', fontWeight: 600,
};

/* ═══════════════ 交易员 Traders ═══════════════ */
export default function Traders() {
  const [traders, setTraders] = useState<Trader[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [operating, setOperating] = useState<string | null>(null);

  const load = async () => {
    try {
      const t = await get<Trader[]>('/api/traders');
      setTraders(Array.isArray(t) ? t : []);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const handleStartStop = async (id: string, currentStatus: string) => {
    setOperating(id);
    try {
      if (currentStatus === 'running') {
        await post(`/api/traders/${id}/stop`);
      } else {
        await post(`/api/traders/${id}/start`);
      }
      await load();
    } catch (e: any) {
      alert('❌ 操作失败: ' + e.message);
    }
    setOperating(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除交易员「${name}」？`)) return;
    try {
      await del(`/api/traders/${id}`);
      if (expandedId === id) setExpandedId(null);
      await load();
    } catch (e: any) {
      alert('❌ 删除失败: ' + e.message);
    }
  };

  const tradeTypeLabel: Record<string, string> = {
    spot: '现货', 'swap-cross': '永续-全仓', 'swap-isolated': '永续-逐仓',
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>🤖 交易员列表</span>
        <a href="#/strategies" style={{ fontSize: 12, color: C.purple }}>需要先创建策略？</a>
      </div>

      {traders.length === 0 ? (
        <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
          <div>暂无交易员</div>
          <div style={{ fontSize: 12, marginTop: 8 }}>请先创建策略后再创建交易员</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
          {traders.map((t, idx) => (
            <div key={t.id} className="animate-slide" style={{
              background: C.card,
              border: `1px solid ${expandedId === t.id ? C.purple : C.border}`,
              borderRadius: 8,
              overflow: 'hidden',
              transition: 'border-color 0.15s',
            }}>
              {/* Card header */}
              <div
                onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                style={{ padding: 12, cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>🤖 {t.name}</span>
                  <span style={{
                    fontSize: 10,
                    color: t.status === 'running' ? C.green : C.muted,
                    background: t.status === 'running' ? `${C.green}15` : `${C.muted}15`,
                    padding: '1px 6px', borderRadius: 3,
                  }}>
                    {t.status === 'running' ? '● 运行中' : '● 已停止'}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.8 }}>
                  <div>📋 策略: <span style={{ color: C.text }}>{t.strategy_name || '未关联'}</span></div>
                  <div>💱 交易对: <span style={{ color: C.text }}>{t.symbols?.join(', ') || '-'}</span></div>
                </div>
              </div>

              {/* Actions bar */}
              <div style={{ padding: '8px 12px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                <button
                  onClick={() => handleStartStop(t.id, t.status)}
                  disabled={operating === t.id}
                  style={{
                    padding: '4px 12px',
                    background: t.status === 'running' ? `${C.yellow}20` : `${C.green}20`,
                    border: `1px solid ${t.status === 'running' ? C.yellow + '50' : C.green + '50'}`,
                    borderRadius: 4,
                    color: t.status === 'running' ? C.yellow : C.green,
                    cursor: operating === t.id ? 'wait' : 'pointer',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {operating === t.id ? '⋯' : t.status === 'running' ? '⏹ 停止' : '▶️ 启动'}
                </button>
                <button
                  onClick={() => handleDelete(t.id, t.name)}
                  style={{
                    padding: '4px 8px',
                    background: 'none',
                    border: `1px solid ${C.border}`,
                    borderRadius: 4,
                    color: C.red,
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                >
                  🗑️
                </button>
              </div>

              {/* Expanded details */}
              {expandedId === t.id && (
                <div style={{ padding: '0 12px 12px', borderTop: `1px solid ${C.border}`, marginTop: 0 }}>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 2 }}>
                    <div><span style={{ color: C.muted }}>⏱ 扫描周期:</span> <span style={{ color: C.text }}>{t.scan_interval}</span></div>
                    <div><span style={{ color: C.muted }}>📊 主周期:</span> <span style={{ color: C.text }}>{t.main_period}</span></div>
                    <div><span style={{ color: C.muted }}>📈 参考周期:</span> <span style={{ color: C.text }}>{t.ref_period}</span></div>
                    <div><span style={{ color: C.muted }}>🏛️ 交易类型:</span> <span style={{ color: C.text }}>{tradeTypeLabel[t.trade_type] || t.trade_type}</span></div>
                    <div><span style={{ color: C.muted }}>🧠 Executor 温度:</span> <span style={{ color: C.text }}>{t.executor_temp}</span></div>
                    <div><span style={{ color: C.muted }}>⚠️ Risk 温度:</span> <span style={{ color: C.text }}>{t.risk_temp}</span></div>
                    <div><span style={{ color: C.muted }}>🔌 LLM 配置:</span> <span style={{ color: C.text }}>{t.llm_config_id ? `ID: ${t.llm_config_id.slice(0, 8)}...` : '默认'}</span></div>
                    <div><span style={{ color: C.muted }}>🏦 交易所:</span> <span style={{ color: C.text }}>{t.exchange_account_id ? `ID: ${t.exchange_account_id.slice(0, 8)}...` : '未配置'}</span></div>
                    <div><span style={{ color: C.muted }}>🕐 创建时间:</span> <span style={{ color: C.text }}>{fmtTime(t.created_at)}</span></div>
                    <div><span style={{ color: C.muted }}>🕐 更新时间:</span> <span style={{ color: C.text }}>{fmtTime(t.updated_at)}</span></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
