import React, { useEffect, useState } from 'react';

/* ── Types ── */
interface ExchangeAccount {
  id: string;
  name: string;
  type: string;
  api_key: string;
  secret_key: string;
  passphrase: string;
  site: string;
  is_default: boolean;
  created_at: string;
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
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function put<T>(url: string, body: any): Promise<T> {
  const res = await fetch(`${API}${url}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
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

const inputBase: React.CSSProperties = {
  width: '100%', padding: '7px 10px', background: C.bg, border: `1px solid ${C.border}`,
  borderRadius: 6, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box',
};

const labelS: React.CSSProperties = {
  display: 'block', fontSize: 11, color: C.muted, marginBottom: 4,
  textTransform: 'uppercase', letterSpacing: '0.5px',
};

const btnS: React.CSSProperties = {
  padding: '7px 16px', background: C.card, border: `1px solid ${C.border}`,
  borderRadius: 6, color: C.text, cursor: 'pointer', fontSize: 12, fontWeight: 500,
  transition: 'all 0.15s',
};

const btnPrimaryS: React.CSSProperties = {
  ...btnS, background: `linear-gradient(135deg, ${C.purple}, #5a4bd1)`, border: 'none', color: '#fff', fontWeight: 600,
};

/* ═══════════════ 交易所管理 ExchangeManager ═══════════════ */
export default function ExchangeManager() {
  const [accounts, setAccounts] = useState<ExchangeAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ExchangeAccount | null>(null);
  const [form, setForm] = useState({ name: '', type: 'demo', api_key: '', secret_key: '', passphrase: '', site: 'global' });
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await get<{ accounts: ExchangeAccount[] }>('/api/exchange');
      setAccounts(r.accounts || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', type: 'demo', api_key: '', secret_key: '', passphrase: '', site: 'global' });
    setTestResult(null);
    setShowForm(true);
  };

  const openEdit = (a: ExchangeAccount) => {
    setEditing(a);
    setForm({
      name: a.name,
      type: a.type,
      api_key: a.api_key || '',
      secret_key: a.secret_key || '',
      passphrase: a.passphrase || '',
      site: a.site || 'global',
    });
    setTestResult(null);
    setShowForm(true);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult('⏳ 测试中...');
    try {
      const r = await post<any>('/api/exchange/test', form);
      setTestResult(r.status === 'success' ? '✅ 连接成功' : '❌ 连接失败: ' + (r.detail || '未知错误'));
    } catch (e: any) {
      setTestResult('❌ 错误: ' + e.message);
    }
    setTesting(false);
  };

  const handleTestSaved = async (id: string) => {
    setTestResult('⏳ 测试中...');
    try {
      const r = await post<any>(`/api/exchange/${id}/test`);
      setTestResult(r.status === 'success' ? '✅ 连接成功' : '❌ 连接失败: ' + (r.detail || ''));
    } catch (e: any) {
      setTestResult('❌ 错误: ' + e.message);
    }
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await put(`/api/exchange/${editing.id}`, form);
      } else {
        await post('/api/exchange', form);
      }
      setShowForm(false);
      setEditing(null);
      await load();
    } catch (e: any) {
      alert('❌ 保存失败: ' + e.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除交易所账户「${name}」？`)) return;
    try {
      await del(`/api/exchange/${id}`);
      await load();
    } catch (e: any) {
      alert('❌ 删除失败: ' + e.message);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* ═══ 顶部 ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>🏛️ 交易所账户</span>
        <button onClick={openNew} style={btnPrimaryS}>➕ 添加账户</button>
      </div>

      {/* ═══ 编辑弹窗 ═══ */}
      {showForm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }} onClick={() => setShowForm(false)}>
          <div style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 24, minWidth: 480, maxWidth: 540,
          }} onClick={(e) => e.stopPropagation()} className="animate-slide">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                {editing ? '✏️ 编辑账户' : '➕ 添加账户'}
              </span>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={labelS}>名称</label>
                <input style={inputBase} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="交易所名称" />
              </div>
              <div>
                <label style={labelS}>类型</label>
                <select style={inputBase} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="demo">模拟盘 (Demo)</option>
                  <option value="live">实盘 (Live)</option>
                </select>
              </div>
              <div>
                <label style={labelS}>API Key</label>
                <input style={inputBase} type="password" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} placeholder="输入 API Key" />
              </div>
              <div>
                <label style={labelS}>Secret Key</label>
                <input style={inputBase} type="password" value={form.secret_key} onChange={(e) => setForm({ ...form, secret_key: e.target.value })} placeholder="输入 Secret Key" />
              </div>
              <div>
                <label style={labelS}>Passphrase</label>
                <input style={inputBase} type="password" value={form.passphrase} onChange={(e) => setForm({ ...form, passphrase: e.target.value })} placeholder="可选" />
              </div>
              <div>
                <label style={labelS}>Site</label>
                <select style={inputBase} value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })}>
                  <option value="global">Global</option>
                  <option value="eea">EEA</option>
                  <option value="us">US</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={handleSave} style={btnPrimaryS} disabled={!form.name.trim()}>💾 保存</button>
              <button onClick={handleTestConnection} style={btnS} disabled={testing}>
                {testing ? '⏳ 测试中...' : '🔌 测试连接'}
              </button>
              {testResult && (
                <span style={{
                  fontSize: 11, color: testResult.includes('✅') ? C.green : testResult.includes('❌') ? C.red : C.yellow,
                }}>{testResult}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ 表格 ═══ */}
      {loading ? (
        <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: 40 }}>⏳ 加载中...</div>
      ) : accounts.length === 0 ? (
        <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏛️</div>
          <div>暂无交易所账户</div>
          <div style={{ fontSize: 12, marginTop: 8, color: C.dim }}>点击上方「➕ 添加账户」开始</div>
        </div>
      ) : (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.bg }}>
                <th style={{ padding: '10px 12px', fontSize: 11, color: C.muted, textAlign: 'left', borderBottom: `1px solid ${C.border}`, textTransform: 'uppercase', letterSpacing: '0.5px' }}>名称</th>
                <th style={{ padding: '10px 12px', fontSize: 11, color: C.muted, textAlign: 'left', borderBottom: `1px solid ${C.border}`, textTransform: 'uppercase', letterSpacing: '0.5px' }}>类型</th>
                <th style={{ padding: '10px 12px', fontSize: 11, color: C.muted, textAlign: 'left', borderBottom: `1px solid ${C.border}`, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Site</th>
                <th style={{ padding: '10px 12px', fontSize: 11, color: C.muted, textAlign: 'left', borderBottom: `1px solid ${C.border}`, textTransform: 'uppercase', letterSpacing: '0.5px' }}>默认</th>
                <th style={{ padding: '10px 12px', fontSize: 11, color: C.muted, textAlign: 'left', borderBottom: `1px solid ${C.border}`, textTransform: 'uppercase', letterSpacing: '0.5px' }}>创建时间</th>
                <th style={{ padding: '10px 12px', fontSize: 11, color: C.muted, textAlign: 'right', borderBottom: `1px solid ${C.border}`, textTransform: 'uppercase', letterSpacing: '0.5px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="animate-fade">
                  <td style={{ padding: '10px 12px', fontSize: 13, color: C.text, borderBottom: `1px solid ${C.border}` }}>{a.name}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, borderBottom: `1px solid ${C.border}` }}>
                    <span style={{
                      color: a.type === 'live' ? C.red : C.green,
                      background: a.type === 'live' ? `${C.red}12` : `${C.green}12`,
                      padding: '2px 8px', borderRadius: 4, fontSize: 11,
                    }}>
                      {a.type === 'live' ? '🔴 实盘' : '🟢 模拟'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: C.dim, borderBottom: `1px solid ${C.border}` }}>{a.site}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: C.muted, borderBottom: `1px solid ${C.border}` }}>{a.is_default ? '✅' : '-'}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: C.dim, fontFamily: 'monospace', borderBottom: `1px solid ${C.border}` }}>{fmtTime(a.created_at)}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, textAlign: 'right', borderBottom: `1px solid ${C.border}` }}>
                    <button onClick={() => openEdit(a)} style={{ background: 'none', border: 'none', color: C.cyan, cursor: 'pointer', fontSize: 13, marginRight: 8 }} title="编辑">✏️</button>
                    <button onClick={() => handleTestSaved(a.id)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13, marginRight: 8 }} title="测试连接">🔌</button>
                    <button onClick={() => handleDelete(a.id, a.name)} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 13 }} title="删除">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
