import React from 'react';

export default function Init() {
  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>🚀 项目初始化</h1>
      <p style={{ color: '#94a3b8', marginBottom: 24 }}>给项目注入灵魂 — 配置 LLM 和交易所</p>

      {/* Step 1: LLM 配置 */}
      <section style={sectionStyle}>
        <h2 style={{ fontSize: 16, marginBottom: 12, color: '#22d3ee' }}>1️⃣ 配置 LLM（灵魂注入）</h2>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>LLM 提供商</label>
          <select style={inputStyle} defaultValue="minimax">
            <option value="minimax">MiniMax (国内版)</option>
            <option value="deepseek">DeepSeek</option>
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>API Key</label>
          <input type="password" style={inputStyle} placeholder="输入 API Key" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Model</label>
          <select style={inputStyle} defaultValue="MiniMax-M2.7">
            <option>MiniMax-M2.7</option>
            <option>MiniMax-M2.5</option>
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Base URL（自动填充）</label>
          <input style={{ ...inputStyle, background: '#0f172a', color: '#64748b' }} value="https://api.minimaxi.com/anthropic" readOnly />
        </div>
      </section>

      {/* Step 2: OKX */}
      <section style={sectionStyle}>
        <h2 style={{ fontSize: 16, marginBottom: 12, color: '#34d399' }}>2️⃣ OKX AI Trade Kit</h2>
        <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>
          配置 LLM 后将自动检测并安装 OKX Trade Kit
        </p>
        <button style={btnStyle} disabled>检测安装状态...</button>
      </section>

      {/* Step 3: 交易所账户 */}
      <section style={sectionStyle}>
        <h2 style={{ fontSize: 16, marginBottom: 12, color: '#a78bfa' }}>3️⃣ 交易所账户</h2>
        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}>暂无账户，点击添加</p>
        <button style={btnStyle}>+ 添加 OKX 账户</button>
      </section>

      {/* Step 4: 子代理 */}
      <section style={sectionStyle}>
        <h2 style={{ fontSize: 16, marginBottom: 12, color: '#fb923c' }}>4️⃣ 默认子代理</h2>
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr', marginBottom: 12 }}>
          {['🤖 主代理', '🔍 盯盘代理', '⚡ 下单代理', '🛡️ 风控代理'].map(name => (
            <div key={name} style={{ padding: '8px 12px', border: '1px solid #1e293b', borderRadius: 6, fontSize: 13, color: '#94a3b8' }}>
              {name}
            </div>
          ))}
        </div>
        <p style={{ color: '#94a3b8', fontSize: 12 }}>✅ 所有子代理共用主 LLM，可在设置中为重要子代理配置备用 LLM</p>
      </section>

      <button style={{ ...btnStyle, background: '#22d3ee', color: '#020617', fontWeight: 600, fontSize: 16, padding: '12px 32px', marginTop: 20 }}>
        🚀 完成初始化
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
  fontSize: 14,
};

const btnStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 6,
  color: '#94a3b8',
  cursor: 'pointer',
  fontSize: 13,
};
