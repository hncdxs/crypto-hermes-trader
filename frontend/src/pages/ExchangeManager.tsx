import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function ExchangeManager() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'demo', api_key: '', secret_key: '', passphrase: '', site: 'global' });
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => { loadAccounts(); }, []);

  const loadAccounts = async () => {
    try {
      const r = await api.listExchangeAccounts();
      setAccounts(r.accounts || []);
    } catch {} finally { setLoading(false); }
  };

  const handleTestConnection = async () => {
    setTestResult('测试中...');
    try {
      const r = await api.testExchangeConnection(form);
      setTestResult(r.status === 'ok' ? '✅ 连接成功' : '❌ 连接失败: ' + (r.detail || ''));
    } catch (e: any) {
      setTestResult('❌ 错误: ' + e.message);
    }
  };

  const handleTestSaved = async (id: string) => {
    try {
      const r = await api.testSavedExchangeConnection(id);
      alert(r.status === 'ok' ? '✅ 连接成功' : '❌ 连接失败');
    } catch (e: any) {
      alert('❌ 错误: ' + e.message);
    }
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await api.updateExchangeAccount(editing.id, form);
      } else {
        await api.createExchangeAccount(form);
      }
      setShowForm(false);
      setEditing(null);
      loadAccounts();
    } catch (e: any) {
      alert('保存失败: ' + e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除？')) return;
    try {
      await api.deleteExchangeAccount(id);
      loadAccounts();
    } catch (e: any) {
      alert('删除失败: ' + e.message);
    }
  };

  const startEdit = (acct: any) => {
    setEditing(acct);
    setForm({
      name: acct.name,
      type: acct.type,
      api_key: acct.api_key || '',
      secret_key: acct.secret_key || '',
      passphrase: acct.passphrase || '',
      site: acct.site || 'global',
    });
    setShowForm(true);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, color: 'white', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 };
  const btnStyle: React.CSSProperties = { border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 };
  const cellStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid #1e293b', fontSize: 13, color: '#e2e8f0' };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>🏛️ 交易所管理</h1>
          <p style={{ color: '#94a3b8', fontSize: 13 }}>管理交易所账户连接</p>
        </div>
        <button style={{ ...btnStyle, background: '#22d3ee', color: '#020617', fontWeight: 600, padding: '8px 20px' }} onClick={() => { setEditing(null); setForm({ name: '', type: 'demo', api_key: '', secret_key: '', passphrase: '', site: 'global' }); setShowForm(true); }}>
          ➕ 添加账户
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid #1e293b', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, marginBottom: 16, color: '#34d399' }}>{editing ? '✏️ 编辑账户' : '➕ 添加账户'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelStyle}>名称</label><input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <label style={labelStyle}>类型</label>
              <select style={inputStyle} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="demo">模拟盘 (Demo)</option>
                <option value="live">实盘 (Live)</option>
              </select>
            </div>
            <div><label style={labelStyle}>API Key</label><input style={inputStyle} type="password" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} /></div>
            <div><label style={labelStyle}>Secret Key</label><input style={inputStyle} type="password" value={form.secret_key} onChange={(e) => setForm({ ...form, secret_key: e.target.value })} /></div>
            <div><label style={labelStyle}>Passphrase</label><input style={inputStyle} type="password" value={form.passphrase} onChange={(e) => setForm({ ...form, passphrase: e.target.value })} /></div>
            <div>
              <label style={labelStyle}>Site</label>
              <select style={inputStyle} value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })}>
                <option value="global">Global</option>
                <option value="eea">EEA</option>
                <option value="us">US</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button style={{ ...btnStyle, background: '#22d3ee', color: '#020617', fontWeight: 600, padding: '8px 24px' }} onClick={handleSave}>💾 保存</button>
            <button style={{ ...btnStyle, background: '#1e293b', color: '#94a3b8', padding: '8px 16px', border: '1px solid #334155' }} onClick={handleTestConnection}>🔌 测试连接</button>
            {testResult && <span style={{ fontSize: 13, color: '#94a3b8', alignSelf: 'center' }}>{testResult}</span>}
            <button style={{ ...btnStyle, background: '#1e293b', color: '#94a3b8', padding: '8px 16px', border: '1px solid #334155', marginLeft: 'auto' }} onClick={() => setShowForm(false)}>✕ 取消</button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color: '#64748b', fontSize: 13 }}>加载中...</p>
      ) : accounts.length === 0 ? (
        <p style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: 40 }}>暂无交易所账户，点击上方按钮添加。</p>
      ) : (
        <div style={{ border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0f172a' }}>
                <th style={cellStyle}>名称</th>
                <th style={cellStyle}>类型</th>
                <th style={cellStyle}>Site</th>
                <th style={cellStyle}>默认</th>
                <th style={cellStyle}>创建时间</th>
                <th style={{ ...cellStyle, textAlign: 'right' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td style={cellStyle}>{a.name}</td>
                  <td style={cellStyle}>
                    <span style={{ color: a.type === 'live' ? '#f87171' : '#34d399', fontSize: 12, background: a.type === 'live' ? 'rgba(248,113,113,0.1)' : 'rgba(52,211,153,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                      {a.type === 'live' ? '实盘' : '模拟'}
                    </span>
                  </td>
                  <td style={cellStyle}>{a.site}</td>
                  <td style={cellStyle}>{a.is_default ? '✅' : '-'}</td>
                  <td style={cellStyle}>{new Date(a.created_at).toLocaleString()}</td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>
                    <button style={{ ...btnStyle, color: '#22d3ee', background: 'transparent', marginRight: 8 }} onClick={() => startEdit(a)}>✏️</button>
                    <button style={{ ...btnStyle, color: '#94a3b8', background: 'transparent', marginRight: 8 }} onClick={() => handleTestSaved(a.id)}>🔌</button>
                    <button style={{ ...btnStyle, color: '#f87171', background: 'transparent' }} onClick={() => handleDelete(a.id)}>🗑️</button>
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
