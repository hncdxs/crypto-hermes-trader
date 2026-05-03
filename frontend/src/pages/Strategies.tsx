import React, { useEffect, useState } from 'react';

/* ── Types ── */
interface Indicator {
  name: string;
  params: Record<string, number>;
}

interface Strategy {
  id: string;
  name: string;
  indicators: Indicator[];
  description: string;
  status: string;
  current_version: string;
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

async function post<T>(url: string, body: any): Promise<T> {
  const res = await fetch(`${API}${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function put<T>(url: string, body: any): Promise<T> {
  const res = await fetch(`${API}${url}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function del(url: string): Promise<void> {
  const res = await fetch(`${API}${url}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
}

const INDICATOR_TEMPLATES: Record<string, Record<string, number>> = {
  MA: { period: 5 },
  EMA: { period: 12 },
  MACD: { fast: 12, slow: 26, signal: 9 },
  RSI: { period: 14 },
  VOL: {},
  BOLL: { period: 20, std: 2 },
  STOCH: { k: 14, d: 3 },
};

const INDICATOR_OPTIONS = Object.keys(INDICATOR_TEMPLATES);

function fmtTime(t: string): string {
  try { return new Date(t).toLocaleString('zh-CN', { hour12: false }); } catch { return t; }
}

/* ── Shared styles ── */
const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  color: C.text,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

const labelS: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  color: C.muted,
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const btnS: React.CSSProperties = {
  padding: '7px 16px',
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  color: C.text,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
  transition: 'all 0.15s',
};

const btnPrimaryS: React.CSSProperties = {
  ...btnS,
  background: `linear-gradient(135deg, ${C.purple}, #5a4bd1)`,
  border: 'none',
  color: '#fff',
  fontWeight: 600,
};

/* ═══════════════ 策略管理 Strategies ═══════════════ */
export default function Strategies() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [mode, setMode] = useState<'list' | 'edit'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [description, setDescription] = useState('');
  const [showCloneDlg, setShowCloneDlg] = useState(false);
  const [cloneName, setCloneName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const s = await get<Strategy[]>('/api/strategies');
      setStrategies(s);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const selected = strategies.find((s) => s.id === selectedId);

  const selectStrategy = (id: string) => {
    setSelectedId(id);
    const s = strategies.find((st) => st.id === id);
    if (s) {
      setName(s.name);
      setIndicators(s.indicators?.length > 0 ? s.indicators.map((i) => ({ ...i, params: { ...i.params } })) : []);
      setDescription(s.description || '');
      setMode('edit');
    }
  };

  const handleNew = () => {
    setSelectedId(null);
    setName('');
    setIndicators([]);
    setDescription('');
    setMode('edit');
  };

  const addIndicator = (indName: string) => {
    setIndicators([...indicators, { name: indName, params: { ...INDICATOR_TEMPLATES[indName] } }]);
  };

  const removeIndicator = (idx: number) => {
    setIndicators(indicators.filter((_, i) => i !== idx));
  };

  const updateIndicatorParam = (idx: number, key: string, value: number) => {
    setIndicators(indicators.map((ind, i) => i === idx ? { ...ind, params: { ...ind.params, [key]: value } } : ind));
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = { name, indicators, description };
    try {
      if (selectedId) {
        await put(`/api/strategies/${selectedId}`, payload);
      } else {
        await post('/api/strategies', payload);
      }
      await load();
      if (selectedId) setSelectedId(null);
      setMode('list');
    } catch (e: any) {
      alert('❌ 保存失败: ' + e.message);
    }
    setSaving(false);
  };

  const handleClone = async () => {
    if (!selectedId || !cloneName.trim()) return;
    try {
      await post(`/api/strategies/${selectedId}/clone`, { new_name: cloneName.trim() });
      setShowCloneDlg(false);
      setCloneName('');
      await load();
    } catch (e: any) {
      alert('❌ 另存失败: ' + e.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    try {
      await del(`/api/strategies/${selectedId}`);
      setShowDeleteConfirm(false);
      setSelectedId(null);
      setMode('list');
      await load();
    } catch (e: any) {
      alert('❌ 删除失败: ' + e.message);
    }
  };

  const availableIndicators = INDICATOR_OPTIONS.filter((n) => !indicators.find((i) => i.name === n));

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* ═══ 顶部切换 ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setMode('list')} style={{ ...btnS, background: mode === 'list' ? C.dim + '60' : C.card, color: mode === 'list' ? C.cyan : C.muted, fontWeight: mode === 'list' ? 600 : 400 }}>
            📋 策略列表
          </button>
          <button onClick={() => setMode('edit')} style={{ ...btnS, background: mode === 'edit' ? C.dim + '60' : C.card, color: mode === 'edit' ? C.cyan : C.muted, fontWeight: mode === 'edit' ? 600 : 400 }}>
            ✏️ 编辑模式
          </button>
        </div>
        <button onClick={handleNew} style={btnPrimaryS}>➕ 新建策略</button>
      </div>

      {/* ═══ 列表模式 ═══ */}
      {mode === 'list' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {strategies.length === 0 && (
            <div style={{ color: C.muted, fontSize: 14, textAlign: 'center', padding: 40, gridColumn: '1 / -1' }}>暂无策略，点击「➕ 新建策略」开始</div>
          )}
          {strategies.map((s, idx) => (
            <div
              key={s.id}
              onClick={() => selectStrategy(s.id)}
              className="animate-slide"
              style={{
                background: C.card,
                border: `1px solid ${selectedId === s.id ? C.purple : C.border}`,
                borderRadius: 8,
                padding: 14,
                cursor: 'pointer',
                transition: 'all 0.15s',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => { if (selectedId !== s.id) e.currentTarget.style.borderColor = C.dim; }}
              onMouseLeave={(e) => { if (selectedId !== s.id) e.currentTarget.style.borderColor = C.border; }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: selectedId === s.id ? `linear-gradient(90deg, ${C.purple}, ${C.cyan})` : 'transparent' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>📄 {s.name}</span>
                <span style={{ fontSize: 10, color: s.status === 'active' ? C.green : C.muted, background: s.status === 'active' ? `${C.green}15` : `${C.muted}15`, padding: '1px 6px', borderRadius: 3 }}>
                  {s.status === 'active' ? '● 启用' : '○ 停用'}
                </span>
              </div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.8 }}>
                <div>📊 {s.indicators?.length || 0} 个指标</div>
                <div>🔄 v{s.current_version || '-'}</div>
                <div>🕐 {fmtTime(s.updated_at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ 编辑模式 ═══ */}
      {mode === 'edit' && (
        <div style={{ display: 'flex', gap: 16 }}>
          {/* 左栏: 基本信息 + 指标 */}
          <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
              <div style={{ ...labelS, marginBottom: 8 }}>📋 基本信息</div>
              <label style={labelS}>策略名称</label>
              <input style={inputBase} value={name} onChange={(e) => setName(e.target.value)} placeholder="输入策略名称..." />
            </div>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14, flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={labelS}>📊 指标配置</span>
                {availableIndicators.length > 0 && (
                  <select
                    style={{ ...inputBase, width: 'auto', padding: '4px 8px', fontSize: 11 }}
                    value=""
                    onChange={(e) => { if (e.target.value) addIndicator(e.target.value); }}
                  >
                    <option value="">+ 添加指标</option>
                    {availableIndicators.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                )}
              </div>

              {indicators.length === 0 && (
                <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: 20 }}>暂无指标，点击上方添加</div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {indicators.map((ind, idx) => (
                  <div key={idx} className="animate-slide" style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.cyan }}>{ind.name}</span>
                      <span onClick={() => removeIndicator(idx)} style={{ color: C.red, cursor: 'pointer', fontSize: 13 }}>✕</span>
                    </div>
                    {Object.entries(ind.params).map(([key, val]) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <span style={{ fontSize: 11, color: C.muted }}>{key}:</span>
                        {ind.name === 'VOL' ? (
                          <span style={{ fontSize: 11, color: C.green }}>✅</span>
                        ) : (
                          <input
                            style={{ ...inputBase, width: 60, padding: '2px 6px', fontSize: 11 }}
                            type="number"
                            value={val}
                            onChange={(e) => updateIndicatorParam(idx, key, Number(e.target.value))}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右栏: Markdown Prompt 编辑器 */}
          <div style={{ flex: '0 0 60%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ ...labelS, marginBottom: 8 }}>📝 策略逻辑 / Prompt</div>
              <div style={{ flex: 1, position: 'relative', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
                {/* Line numbers gutter */}
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 36, background: C.card, borderRight: `1px solid ${C.border}`, padding: '8px 0', textAlign: 'right', overflow: 'hidden' }}>
                  {description.split('\n').map((_, i) => (
                    <div key={i} style={{ padding: '0 8px', fontSize: 11, lineHeight: '20px', color: C.muted }}>{i + 1}</div>
                  ))}
                  {description === '' && <div style={{ padding: '0 8px', fontSize: 11, lineHeight: '20px', color: C.muted }}>1</div>}
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={'## 策略逻辑\n\n在此编写策略的完整逻辑描述...\n\n### 入场条件\n- RSI < 30 时做多\n- RSI > 70 时做空\n\n### 出场条件\n- 移动止损 2%\n- 固定止盈 5%\n'}
                  style={{
                    width: '100%',
                    height: '100%',
                    minHeight: 400,
                    padding: '8px 10px 8px 44px',
                    background: 'transparent',
                    border: 'none',
                    color: C.text,
                    fontSize: 14,
                    lineHeight: '20px',
                    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                    resize: 'none',
                    outline: 'none',
                    whiteSpace: 'pre-wrap',
                    overflow: 'auto',
                  }}
                />
              </div>
            </div>

            {/* 底部按钮 */}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={handleSave} style={btnPrimaryS} disabled={saving || !name.trim()}>
                {saving ? '💾 保存中...' : '💾 保存'}
              </button>
              {selectedId && (
                <>
                  <button onClick={() => { setShowCloneDlg(true); setCloneName(''); }} style={btnS}>📋 另存为</button>
                  <button onClick={() => setShowDeleteConfirm(true)} style={{ ...btnS, color: C.red }}>🗑️ 删除</button>
                </>
              )}
              <button onClick={() => setMode('list')} style={{ ...btnS, marginLeft: 'auto' }}>✕ 取消</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 另存为对话框 ── */}
      {showCloneDlg && (
        <div style={overlay} onClick={() => setShowCloneDlg(false)}>
          <div style={dialog} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: C.text }}>📋 另存为副本</h3>
            <input style={inputBase} value={cloneName} onChange={(e) => setCloneName(e.target.value)} placeholder="输入新策略名称..." autoFocus />
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button style={btnS} onClick={() => setShowCloneDlg(false)}>取消</button>
              <button style={btnPrimaryS} onClick={handleClone} disabled={!cloneName.trim()}>确认</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 删除确认 ── */}
      {showDeleteConfirm && (
        <div style={overlay} onClick={() => setShowDeleteConfirm(false)}>
          <div style={dialog} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: C.text }}>🗑️ 确认删除</h3>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 12, lineHeight: 1.6 }}>
              确定要删除「<span style={{ color: C.text }}>{selected?.name}</span>」吗？<br/>如果策略正在使用中，删除将被禁止。
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={btnS} onClick={() => setShowDeleteConfirm(false)}>取消</button>
              <button style={{ ...btnPrimaryS, background: C.red }} onClick={handleDelete}>确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
};

const dialog: React.CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: 24,
  minWidth: 360,
  maxWidth: 440,
};
