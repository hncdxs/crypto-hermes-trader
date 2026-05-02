import React, { useEffect, useState } from 'react';
import { api } from '../api';

interface Strategy {
  id: string;
  name: string;
}

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

interface AgentConfig {
  agent_type: string;
  temperature: number;
  system_prompt: string;
}

const PERIODS = ['5m', '15m', '1h', '4h', '1d', '1w'];
const SCAN_INTERVALS = ['1m', '5m', '15m', '30m', '1h'];
const TRADE_TYPES = ['spot', 'swap-cross', 'swap-isolated'];

const emptyTrader = {
  name: '',
  strategy_id: '',
  main_period: '5m',
  ref_period: '1h',
  scan_interval: '5m',
  trade_type: 'spot',
  symbols: [] as string[],
  llm_config_id: '',
  exchange_account_id: '',
  executor_temp: 0.3,
  risk_temp: 0.3,
  status: 'stopped',
};

export default function Traders() {
  const [traders, setTraders] = useState<Trader[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [llmConfigs, setLlmConfigs] = useState<any[]>([]);
  const [exchangeAccounts, setExchangeAccounts] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyTrader });
  const [symbolInput, setSymbolInput] = useState('');
  const [agentConfigs, setAgentConfigs] = useState<AgentConfig[]>([
    { agent_type: 'monitor', temperature: 0.3, system_prompt: '' },
    { agent_type: 'master', temperature: 0.3, system_prompt: '' },
    { agent_type: 'executor', temperature: 0.3, system_prompt: '' },
    { agent_type: 'risk', temperature: 0.3, system_prompt: '' },
  ]);
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadData = async () => {
    try {
      const [t, s] = await Promise.all([
        api.listTraders(),
        api.listStrategies(),
      ]);
      setTraders(t);
      setStrategies(s.map((st: any) => ({ id: st.id, name: st.name })));
    } catch {}
    try {
      const l = await api.getLLMConfigs();
      setLlmConfigs((l as any).configs || []);
    } catch {}
    try {
      const e = await api.getExchangeAccounts();
      setExchangeAccounts((e as any).accounts || []);
    } catch {}
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedTrader = traders.find((t) => t.id === selectedId);

  const selectTrader = (id: string) => {
    setSelectedId(id);
    const t = traders.find((tr) => tr.id === id);
    if (t) {
      setForm({
        name: t.name,
        strategy_id: t.strategy_id || '',
        main_period: t.main_period,
        ref_period: t.ref_period,
        scan_interval: t.scan_interval,
        trade_type: t.trade_type,
        symbols: t.symbols || [],
        llm_config_id: t.llm_config_id || '',
        exchange_account_id: t.exchange_account_id || '',
        executor_temp: t.executor_temp,
        risk_temp: t.risk_temp,
        status: t.status,
      });
    }
  };

  const handleNew = () => {
    setSelectedId(null);
    setForm({ ...emptyTrader });
    setSymbolInput('');
  };

  const addSymbol = (sym: string) => {
    const s = sym.toUpperCase().trim();
    if (s && !form.symbols.includes(s)) {
      setForm({ ...form, symbols: [...form.symbols, s] });
    }
    setSymbolInput('');
  };

  const removeSymbol = (sym: string) => {
    setForm({ ...form, symbols: form.symbols.filter((s) => s !== sym) });
  };

  useEffect(() => {
    setAgentConfigs((prev) =>
      prev.map((ac) => {
        if (ac.agent_type === 'executor') return { ...ac, temperature: form.executor_temp };
        if (ac.agent_type === 'risk') return { ...ac, temperature: form.risk_temp };
        return ac;
      })
    );
  }, [form.executor_temp, form.risk_temp]);

  const updateAgentPrompt = (type: string, val: string) => {
    setAgentConfigs((prev) =>
      prev.map((ac) => (ac.agent_type === type ? { ...ac, system_prompt: val } : ac))
    );
  };

  const handleSave = async () => {
    const payload = {
      name: form.name,
      strategy_id: form.strategy_id,
      main_period: form.main_period,
      ref_period: form.ref_period,
      scan_interval: form.scan_interval,
      trade_type: form.trade_type,
      symbols: form.symbols,
      llm_config_id: form.llm_config_id || null,
      exchange_account_id: form.exchange_account_id || null,
      executor_temp: form.executor_temp,
      risk_temp: form.risk_temp,
    };
    try {
      if (selectedId) {
        await api.updateTrader(selectedId, payload);
      } else {
        await api.createTrader(payload);
      }
      await loadData();
    } catch (e: any) {
      alert('保存失败: ' + e.message);
    }
  };

  const handleStartStop = async () => {
    if (!selectedId) return;
    try {
      if (selectedTrader?.status === 'running') {
        await api.stopTrader(selectedId);
      } else {
        await api.startTrader(selectedId);
      }
      await loadData();
    } catch (e: any) {
      alert('操作失败: ' + e.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    try {
      await api.deleteTrader(selectedId);
      setShowDeleteConfirm(false);
      setSelectedId(null);
      await loadData();
    } catch (e: any) {
      alert('删除失败: ' + e.message);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 20 }}>🤖 交易员管理</h1>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* ── 左侧列表 ── */}
        <div style={{ width: 280, flexShrink: 0 }}>
          {traders.map((t) => (
            <div
              key={t.id}
              onClick={() => selectTrader(t.id)}
              style={{
                ...cardStyle,
                border: selectedId === t.id ? '1px solid #22d3ee' : '1px solid #1e293b',
                cursor: 'pointer',
                opacity: t.status === 'stopped' ? 0.6 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>🤖 {t.name}</span>
                <span style={{ fontSize: 11, color: t.status === 'running' ? '#22d3ee' : '#64748b' }}>
                  {t.status === 'running' ? '🟢 运行中' : '⏸ 已停止'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 6, lineHeight: 1.6 }}>
                {t.strategy_name && <>策略: {t.strategy_name}<br /></>}
                {t.main_period} · {t.trade_type} · {t.symbols?.length || 0} 币种
              </div>
            </div>
          ))}
          <button style={addBtnStyle} onClick={handleNew}>+ 新建交易员</button>
        </div>

        {/* ── 右侧编辑区 ── */}
        <div style={{ flex: 1 }}>
          <div style={cardStyle}>
            {/* 基本字段 */}
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label style={labelStyle}>名称</label>
                <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="交易员名称" />
              </div>
              <div>
                <label style={labelStyle}>策略</label>
                <select style={inputStyle} value={form.strategy_id} onChange={(e) => setForm({ ...form, strategy_id: e.target.value })}>
                  <option value="">选择策略</option>
                  {strategies.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>主周期</label>
                <select style={inputStyle} value={form.main_period} onChange={(e) => setForm({ ...form, main_period: e.target.value })}>
                  {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>参考周期</label>
                <select style={inputStyle} value={form.ref_period} onChange={(e) => setForm({ ...form, ref_period: e.target.value })}>
                  {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>扫描周期</label>
                <select style={inputStyle} value={form.scan_interval} onChange={(e) => setForm({ ...form, scan_interval: e.target.value })}>
                  {SCAN_INTERVALS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>交易类型</label>
                <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                  {TRADE_TYPES.map((tt) => (
                    <label key={tt} style={{ color: '#94a3b8', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input type="radio" checked={form.trade_type === tt} onChange={() => setForm({ ...form, trade_type: tt })} />
                      {tt === 'spot' ? '现货' : tt === 'swap-cross' ? '永续-全仓' : '永续-逐仓'}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>监控币种</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                  {form.symbols.map((sym) => (
                    <span key={sym} style={tagStyle}>
                      {sym} <span onClick={() => removeSymbol(sym)} style={{ cursor: 'pointer', marginLeft: 4, color: '#fb7185' }}>✕</span>
                    </span>
                  ))}
                </div>
                <input
                  style={inputStyle}
                  value={symbolInput}
                  onChange={(e) => setSymbolInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSymbol(symbolInput); } }}
                  placeholder="输入交易对后 Enter 添加"
                />
              </div>
              <div>
                <label style={labelStyle}>LLM 配置</label>
                <select style={inputStyle} value={form.llm_config_id} onChange={(e) => setForm({ ...form, llm_config_id: e.target.value })}>
                  <option value="">默认 LLM</option>
                  {llmConfigs.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name || c.provider}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>交易所账户</label>
                <select style={inputStyle} value={form.exchange_account_id} onChange={(e) => setForm({ ...form, exchange_account_id: e.target.value })}>
                  <option value="">选择账户</option>
                  {exchangeAccounts.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Executor 温度</label>
                <input style={inputStyle} type="number" step="0.05" min="0" max="2" value={form.executor_temp} onChange={(e) => setForm({ ...form, executor_temp: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label style={labelStyle}>Risk 温度</label>
                <input style={inputStyle} type="number" step="0.05" min="0" max="2" value={form.risk_temp} onChange={(e) => setForm({ ...form, risk_temp: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>

            {/* ── 子代理系统提示词 ── */}
            <div style={{ marginTop: 20 }}>
              <div
                onClick={() => setShowAgentPanel(!showAgentPanel)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#22d3ee', fontSize: 13, fontWeight: 600, marginBottom: showAgentPanel ? 12 : 0 }}
              >
                {showAgentPanel ? '▼' : '▶'} 子代理系统提示词设置
              </div>
              {showAgentPanel && agentConfigs.map((ac) => (
                <div key={ac.agent_type} style={{ marginBottom: 12 }}>
                  <label style={{ ...labelStyle, color: ac.agent_type === 'master' ? '#a78bfa' : ac.agent_type === 'executor' ? '#34d399' : ac.agent_type === 'risk' ? '#fb923c' : '#94a3b8' }}>
                    {ac.agent_type.toUpperCase()} system_prompt (温度: {ac.temperature})
                  </label>
                  <textarea
                    style={{ ...inputStyle, minHeight: 80, resize: 'vertical', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.5 }}
                    value={ac.system_prompt}
                    onChange={(e) => updateAgentPrompt(ac.agent_type, e.target.value)}
                    placeholder={`${ac.agent_type} 代理系统提示词...`}
                  />
                </div>
              ))}
            </div>

            {/* ── 操作按钮 ── */}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button style={btnPrimaryStyle} onClick={handleSave}>💾 保存</button>
              {selectedId && (
                <>
                  <button
                    style={{
                      ...btnStyle,
                      background: selectedTrader?.status === 'running' ? '#92400e' : '#065f46',
                      color: selectedTrader?.status === 'running' ? '#fbbf24' : '#34d399',
                    }}
                    onClick={handleStartStop}
                  >
                    {selectedTrader?.status === 'running' ? '⏹ 停止' : '▶️ 启动'}
                  </button>
                  <button style={{ ...btnStyle, color: '#fb7185' }} onClick={() => setShowDeleteConfirm(true)}>
                    🗑️ 删除
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 删除确认 ── */}
      {showDeleteConfirm && (
        <div style={overlayStyle} onClick={() => setShowDeleteConfirm(false)}>
          <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 8, fontSize: 15 }}>🗑️ 确认删除</h3>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>
              确定要删除交易员「{selectedTrader?.name}」吗？关联的配置和记录也将被删除。
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={btnStyle} onClick={() => setShowDeleteConfirm(false)}>取消</button>
              <button style={{ ...btnPrimaryStyle, background: '#dc2626' }} onClick={handleDelete}>确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.5)',
  border: '1px solid #1e293b',
  borderRadius: 10,
  padding: 14,
  marginBottom: 8,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  color: '#64748b',
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: 6,
  color: 'white',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

const tagStyle: React.CSSProperties = {
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 4,
  padding: '2px 8px',
  fontSize: 11,
  color: '#94a3b8',
  display: 'inline-flex',
  alignItems: 'center',
};

const btnStyle: React.CSSProperties = {
  padding: '7px 16px',
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 6,
  color: '#94a3b8',
  cursor: 'pointer',
  fontSize: 12,
};

const btnPrimaryStyle: React.CSSProperties = {
  padding: '7px 16px',
  background: '#22d3ee',
  border: 'none',
  borderRadius: 6,
  color: '#020617',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
};

const addBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 8,
  color: '#94a3b8',
  cursor: 'pointer',
  fontSize: 13,
  marginTop: 4,
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
};

const dialogStyle: React.CSSProperties = {
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 12,
  padding: 24,
  minWidth: 360,
};
