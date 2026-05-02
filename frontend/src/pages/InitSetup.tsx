import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function InitSetup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testOkxStatus, setTestOkxStatus] = useState<string | null>(null);

  // LLM config
  const [llmProvider, setLlmProvider] = useState('deepseek');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmModel, setLlmModel] = useState('deepseek-chat');
  const [llmBaseUrl, setLlmBaseUrl] = useState('');

  // Exchange account
  const [exName, setExName] = useState('OKX-主账户');
  const [exType, setExType] = useState<'demo' | 'live'>('demo');
  const [exApiKey, setExApiKey] = useState('');
  const [exSecretKey, setExSecretKey] = useState('');
  const [exPassphrase, setExPassphrase] = useState('');
  const [exSite, setExSite] = useState<'global' | 'eea' | 'us'>('global');

  useEffect(() => {
    api.getInitStatus()
      .then((res) => {
        if ((res as any).initialized) {
          navigate('/dashboard', { replace: true });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.setupInit({
        llm_config: {
          provider: llmProvider,
          api_key: llmApiKey,
          model: llmModel,
          base_url: llmBaseUrl,
        },
        exchange_account: {
          name: exName,
          type: exType,
          api_key: exApiKey,
          secret_key: exSecretKey,
          passphrase: exPassphrase,
          site: exSite,
        },
      });
      navigate('/dashboard', { replace: true });
    } catch (e: any) {
      alert('初始化失败: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestOkx = async () => {
    setTestOkxStatus('测试中...');
    try {
      const res = await fetch('/api/init/okx/test', { method: 'POST' });
      const data = await res.json();
      setTestOkxStatus(data.status === 'ok' ? '✅ 连接成功' : '❌ 连接失败');
    } catch {
      setTestOkxStatus('❌ 连接失败');
    }
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
    setLlmModel(providerModels[llmProvider]?.[0] || '');
    setLlmBaseUrl(providerBaseUrls[llmProvider] || '');
  }, [llmProvider]);

  if (loading) {
    return <div style={{ color: '#64748b', textAlign: 'center', paddingTop: 80 }}>检查初始化状态...</div>;
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>🚀 项目初始化</h1>
      <p style={{ color: '#94a3b8', marginBottom: 28, fontSize: 13 }}>
        首次运行需要配置 LLM 和交易所账户
      </p>

      {/* ── LLM 配置 ── */}
      <section style={sectionStyle}>
        <h2 style={{ fontSize: 16, marginBottom: 16, color: '#22d3ee' }}>🤖 LLM 配置</h2>

        <div style={fieldStyle}>
          <label style={labelStyle}>Provider</label>
          <select style={inputStyle} value={llmProvider} onChange={(e) => setLlmProvider(e.target.value)}>
            <option value="deepseek">DeepSeek</option>
            <option value="openai">OpenAI</option>
            <option value="minimax">MiniMax</option>
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>API Key</label>
          <input style={inputStyle} type="password" value={llmApiKey} onChange={(e) => setLlmApiKey(e.target.value)} placeholder="sk-..." />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Model</label>
          <select style={inputStyle} value={llmModel} onChange={(e) => setLlmModel(e.target.value)}>
            {providerModels[llmProvider]?.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Base URL</label>
          <input style={inputStyle} value={llmBaseUrl} onChange={(e) => setLlmBaseUrl(e.target.value)} placeholder="https://api.deepseek.com" />
        </div>
      </section>

      {/* ── 交易所账户 ── */}
      <section style={sectionStyle}>
        <h2 style={{ fontSize: 16, marginBottom: 16, color: '#34d399' }}>🏛️ 交易所账户</h2>

        <div style={fieldStyle}>
          <label style={labelStyle}>账户名称</label>
          <input style={inputStyle} value={exName} onChange={(e) => setExName(e.target.value)} placeholder="OKX-主账户" />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>账户类型</label>
          <div style={{ display: 'flex', gap: 16 }}>
            <label style={{ color: '#94a3b8', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="radio" checked={exType === 'demo'} onChange={() => setExType('demo')} /> 模拟盘 (Demo)
            </label>
            <label style={{ color: '#94a3b8', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="radio" checked={exType === 'live'} onChange={() => setExType('live')} /> 实盘 (Live)
            </label>
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>API Key</label>
          <input style={inputStyle} type="password" value={exApiKey} onChange={(e) => setExApiKey(e.target.value)} placeholder="okx-api-key" />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Secret Key</label>
          <input style={inputStyle} type="password" value={exSecretKey} onChange={(e) => setExSecretKey(e.target.value)} placeholder="okx-secret-key" />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Passphrase</label>
          <input style={inputStyle} type="password" value={exPassphrase} onChange={(e) => setExPassphrase(e.target.value)} placeholder="okx-passphrase" />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Site</label>
          <select style={inputStyle} value={exSite} onChange={(e) => setExSite(e.target.value as any)}>
            <option value="global">Global</option>
            <option value="eea">EEA</option>
            <option value="us">US</option>
          </select>
        </div>

        <button style={miniBtnStyle} onClick={handleTestOkx}>
          🔌 测试连接
        </button>
        {testOkxStatus && (
          <span style={{ marginLeft: 10, fontSize: 13, color: '#94a3b8' }}>{testOkxStatus}</span>
        )}
      </section>

      <button
        style={{
          ...btnStyle,
          background: '#22d3ee',
          color: '#020617',
          fontWeight: 600,
          fontSize: 16,
          padding: '12px 40px',
          marginTop: 8,
          opacity: saving ? 0.6 : 1,
        }}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? '保存中...' : '🚀 保存并进入看板'}
      </button>
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.5)',
  border: '1px solid #1e293b',
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
};

const fieldStyle: React.CSSProperties = {
  marginBottom: 12,
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
};

const btnStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 14,
};

const miniBtnStyle: React.CSSProperties = {
  padding: '6px 16px',
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 6,
  color: '#94a3b8',
  cursor: 'pointer',
  fontSize: 12,
};
