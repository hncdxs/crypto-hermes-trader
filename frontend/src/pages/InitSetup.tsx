import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api';

const TAB_KEYS = ['llm', 'agents', 'chat'] as const;
type TabKey = (typeof TAB_KEYS)[number];
const TAB_LABELS: Record<TabKey, string> = { llm: '🤖 LLM 配置', agents: '🧠 子代理提示词', chat: '💬 对话' };

const DEFAULT_AGENT_PROMPTS: Record<string, string> = {
  monitor: `你是 Monitor Agent，负责监控市场行情。
每 5 分钟检查一次价格走势，判断是否需要通知 Master Agent。
重点关注：成交量异常、突破关键位置、重大新闻事件。`,
  master: `你是 Master Agent，负责制定交易策略。
根据 Monitor Agent 的信号决定买入/卖出/观望。
考虑仓位管理、风险控制、市场情绪。`,
  executor: `你是 Executor Agent，负责执行 Master Agent 的决策。
按指定价格和数量下单，支持市价单和限价单。
下完单后反馈成交结果。`,
  risk: `你是 Risk Agent，负责风控检查。
检查每笔交易是否符合止损规则、仓位限制、最大亏损限制。
不合规的交易直接否决。`,
};

export default function InitSetup() {
  const navigate = (url: string) => {
    window.location.hash = `#${url}`;
    window.location.reload();
  };

  const [tab, setTab] = useState<TabKey>('llm');
  const [llmConfigs, setLlmConfigs] = useState<any[]>([]);
  const [llmProvider, setLlmProvider] = useState('deepseek');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmModel, setLlmModel] = useState('deepseek-chat');
  const [llmBaseUrl, setLlmBaseUrl] = useState('https://api.deepseek.com');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [hermesStatus, setHermesStatus] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [hermesRunning, setHermesRunning] = useState(false);
  const [traders, setTraders] = useState<any[]>([]);
  const [selectedTrader, setSelectedTrader] = useState<string>('');
  const [agentConfigs, setAgentConfigs] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatReply, setChatReply] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHermesStatus();
    loadLlmConfigs();
    loadTraders();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatReply]);

  const loadHermesStatus = async () => {
    setStatusLoading(true);
    try {
      const s = await api.getHermesStatus();
      setHermesStatus(s);
      setHermesRunning(s.running);
    } catch {
      setHermesStatus({ installed: false, running: false, version: null });
    }
    setStatusLoading(false);
  };

  const loadLlmConfigs = async () => {
    try {
      const r = await api.getLLMConfigs();
      setLlmConfigs(r.configs);
    } catch {}
  };

  const loadTraders = async () => {
    try {
      const t = await api.listTraders();
      setTraders(t);
    } catch {}
  };

  const loadAgentConfigs = async (traderId?: string) => {
    try {
      const r = await api.listAgentConfigs(traderId || undefined);
      setAgentConfigs(r.configs);
    } catch {}
  };

  useEffect(() => {
    if (tab === 'agents') loadAgentConfigs(selectedTrader);
  }, [tab, selectedTrader]);

  const handleSaveLLM = async () => {
    setSaving(true);
    try {
      if (llmConfigs.length > 0) {
        await api.updateLLMConfig(llmConfigs[0].id, {
          provider: llmProvider,
          api_key: llmApiKey,
          model: llmModel,
          base_url: llmBaseUrl,
        });
      } else {
        await api.createLLMConfig({
          provider: llmProvider,
          api_key: llmApiKey,
          model: llmModel,
          base_url: llmBaseUrl,
        });
      }
      setSavedMsg('✅ 已保存');
      loadLlmConfigs();
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (e: any) {
      setSavedMsg('❌ ' + e.message);
    }
    setSaving(false);
  };

  const handleStartStopHermes = async () => {
    try {
      if (hermesRunning) {
        await api.stopHermes();
      } else {
        await api.startHermes();
      }
      setTimeout(loadHermesStatus, 2000);
    } catch {}
  };

  const handleAgentPromptChange = (id: string, field: string, value: any) => {
    setAgentConfigs((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  const handleSaveAgentConfig = async (id: string) => {
    const cfg = agentConfigs.find((a) => a.id === id);
    if (!cfg) return;
    try {
      await api.updateAgentConfig(id, {
        system_prompt: cfg.system_prompt,
        temperature: cfg.temperature,
      });
      setSavedMsg('✅ 提示词已保存');
      setTimeout(() => setSavedMsg(''), 2000);
    } catch (e: any) {
      setSavedMsg('❌ ' + e.message);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    setChatLoading(true);
    setChatReply('思考中...');
    try {
      const r = await api.chatWithHermes(chatInput);
      setChatReply(r.reply || '(无回复)');
    } catch (e: any) {
      setChatReply('错误: ' + e.message);
    }
    setChatLoading(false);
  };

  const providerModels: Record<string, string[]> = {
    deepseek: ['deepseek-chat', 'deepseek-reasoner'],
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    minimax: ['MiniMax-M2.7', 'MiniMax-M2.5'],
  };

  const providerBaseUrls: Record<string, string> = {
    deepseek: 'https://api.deepseek.com',
    openai: 'https://api.openai.com/v1',
    minimax: 'https://api.minimaxi.com/anthropic',
  };

  useEffect(() => {
    const models = providerModels[llmProvider];
    if (models) {
      setLlmModel(models[0]);
      setLlmBaseUrl(providerBaseUrls[llmProvider] || '');
    }
  }, [llmProvider]);

  const s: React.CSSProperties = {
    section: { background: 'rgba(15,23,42,0.5)', border: '1px solid #1e293b', borderRadius: 12, padding: 20, marginBottom: 16 },
    label: { display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 },
    input: { width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, color: 'white', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const },
    inputDark: { width: '100%', padding: '8px 12px', background: '#020617', border: '1px solid #1e293b', borderRadius: 6, color: 'white', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const },
    select: { width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, color: 'white', fontSize: 13, outline: 'none' },
    btn: { border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
    miniBtn: { padding: '6px 16px', background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#94a3b8', cursor: 'pointer', fontSize: 13 },
    field: { marginBottom: 12 },
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    background: active ? 'rgba(34,211,238,0.15)' : 'transparent',
    color: active ? '#22d3ee' : '#64748b',
    fontWeight: active ? 600 : 400,
  });

  const textareaStyle: React.CSSProperties = {
    ...s.inputDark,
    minHeight: 120,
    resize: 'vertical' as const,
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>⚙️ 系统设置</h1>
      <p style={{ color: '#94a3b8', marginBottom: 20, fontSize: 13 }}>
        LLM 配置 · 子代理提示词 · 与主代理对话
      </p>

      {/* Tab 切换 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #1e293b', paddingBottom: 8 }}>
        {TAB_KEYS.map((k) => (
          <button key={k} style={tabStyle(tab === k)} onClick={() => setTab(k)}>
            {TAB_LABELS[k]}
          </button>
        ))}
      </div>

      {/* ═══════════════ Tab: LLM ═══════════════ */}
      {tab === 'llm' && (
        <>
          <section style={s.section}>
            <h2 style={{ fontSize: 15, marginBottom: 16, color: '#22d3ee' }}>🤖 LLM 配置</h2>
            <div style={s.field}>
              <label style={s.label}>Provider</label>
              <select style={s.select} value={llmProvider} onChange={(e) => setLlmProvider(e.target.value)}>
                <option value="deepseek">DeepSeek</option>
                <option value="openai">OpenAI</option>
                <option value="minimax">MiniMax</option>
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>API Key</label>
              <input style={s.input} type="password" value={llmApiKey} onChange={(e) => setLlmApiKey(e.target.value)} placeholder="sk-..." />
            </div>
            <div style={s.field}>
              <label style={s.label}>Model</label>
              <select style={s.select} value={llmModel} onChange={(e) => setLlmModel(e.target.value)}>
                {providerModels[llmProvider]?.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Base URL</label>
              <input style={s.input} value={llmBaseUrl} onChange={(e) => setLlmBaseUrl(e.target.value)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button style={{ ...s.btn, background: '#22d3ee', color: '#020617', fontWeight: 600, padding: '8px 24px' }} onClick={handleSaveLLM} disabled={saving}>
                {saving ? '保存中...' : '💾 保存'}
              </button>
              {savedMsg && <span style={{ fontSize: 13, color: savedMsg.includes('✅') ? '#34d399' : '#f87171' }}>{savedMsg}</span>}
            </div>
          </section>

          {/* ── Hermes Agent 管理 ── */}
          <section style={s.section}>
            <h2 style={{ fontSize: 15, marginBottom: 16, color: '#f59e0b' }}>⚡ Hermes Agent</h2>
            {statusLoading ? (
              <span style={{ color: '#64748b', fontSize: 13 }}>检查中...</span>
            ) : hermesStatus?.installed ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13 }}>
                <span style={{ color: '#34d399' }}>✅ 已安装</span>
                <span style={{ color: hermesRunning ? '#34d399' : '#f87171' }}>
                  {hermesRunning ? '🟢 运行中' : '🔴 已停止'}
                </span>
                <span style={{ color: '#94a3b8' }}>版本: {hermesStatus.version || '未知'}</span>
                <button style={s.miniBtn} onClick={handleStartStopHermes}>
                  {hermesRunning ? '⏹️ 停止' : '▶️ 启动'}
                </button>
              </div>
            ) : (
              <span style={{ color: '#f87171', fontSize: 13 }}>❌ 未安装</span>
            )}
          </section>
        </>
      )}

      {/* ═══════════════ Tab: 子代理提示词 ═══════════════ */}
      {tab === 'agents' && (
        <section style={s.section}>
          <h2 style={{ fontSize: 15, marginBottom: 16, color: '#a78bfa' }}>🧠 子代理提示词</h2>
          {traders.length > 0 && (
            <div style={s.field}>
              <label style={s.label}>选择交易员</label>
              <select style={s.select} value={selectedTrader} onChange={(e) => setSelectedTrader(e.target.value)}>
                <option value="">全部</option>
                {traders.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}
          {agentConfigs.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: 13 }}>暂无 agent 配置，请先创建交易员。</p>
          ) : (
            agentConfigs.map((cfg) => (
              <div key={cfg.id} style={{ ...s.section, marginBottom: 12, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ color: '#22d3ee', fontWeight: 600, fontSize: 14 }}>{cfg.role}</span>
                  <span style={{ color: '#64748b', fontSize: 11 }}>交易员: {cfg.trader_id?.slice(0, 8)}...</span>
                </div>
                <div style={s.field}>
                  <label style={s.label}>System Prompt</label>
                  <textarea
                    style={textareaStyle}
                    value={cfg.system_prompt || ''}
                    onChange={(e) => handleAgentPromptChange(cfg.id, 'system_prompt', e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 120 }}>
                    <label style={s.label}>Temperature</label>
                    <input
                      style={s.input}
                      type="number"
                      step={0.1}
                      min={0}
                      max={2}
                      value={cfg.temperature ?? 0.3}
                      onChange={(e) => handleAgentPromptChange(cfg.id, 'temperature', parseFloat(e.target.value))}
                    />
                  </div>
                  <button style={{ ...s.miniBtn, marginTop: 18 }} onClick={() => handleSaveAgentConfig(cfg.id)}>
                    💾 保存
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {/* ═══════════════ Tab: 对话 ═══════════════ */}
      {tab === 'chat' && (
        <section style={s.section}>
          <h2 style={{ fontSize: 15, marginBottom: 16, color: '#34d399' }}>💬 与主代理对话</h2>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              style={{ ...s.input, flex: 1 }}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="输入你想问主代理的问题..."
              onKeyDown={(e) => e.key === 'Enter' && handleChat()}
            />
            <button style={{ ...s.btn, background: '#22d3ee', color: '#020617', fontWeight: 600, padding: '8px 20px' }} onClick={handleChat} disabled={chatLoading}>
              {chatLoading ? '发送中...' : '发送'}
            </button>
          </div>
          {chatReply && (
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: 16, fontSize: 13, color: '#e2e8f0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {chatReply}
            </div>
          )}
          <div ref={chatEndRef} />
        </section>
      )}

      {savedMsg && tab !== 'llm' && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: savedMsg.includes('✅') ? '#34d399' : '#f87171' }}>
          {savedMsg}
        </div>
      )}
    </div>
  );
}
