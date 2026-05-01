import React from 'react';

export default function Traders() {
  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>🤖 交易员管理</h1>
      <p style={{ color: '#94a3b8', marginBottom: 24 }}>创建交易员实例，配置 LLM、交易所和策略</p>

      {/* 交易员列表 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <div style={{ ...traderCardStyle, borderColor: '#22d3ee' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>🤖 交易员-01</span>
            <span style={{ color: '#22d3ee', fontSize: 12 }}>🟢 运行中</span>
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
            模型: MiniMax M2.5<br />
            交易所: OKX-实盘<br />
            策略: VegasMeanRev v2
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            <button style={miniBtn}>📊 看板</button>
            <button style={miniBtn}>⏸ 停止</button>
            <button style={miniBtn}>✏️ 编辑</button>
          </div>
        </div>

        <div style={{ ...traderCardStyle, opacity: 0.6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>🤖 交易员-02</span>
            <span style={{ color: '#64748b', fontSize: 12 }}>⏸ 已停止</span>
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
            模型: DeepSeek<br />
            交易所: OKX-模拟盘<br />
            策略: GridBot v1
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            <button style={miniBtn}>▶️ 启动</button>
            <button style={miniBtn}>✏️ 编辑</button>
          </div>
        </div>
      </div>

      {/* 创建交易员表单 */}
      <div style={formCardStyle}>
        <h2 style={{ fontSize: 16, marginBottom: 16 }}>创建新交易员</h2>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label style={labelStyle}>名称</label>
            <input style={inputStyle} placeholder="交易员名称" />
          </div>
          <div>
            <label style={labelStyle}>交易所</label>
            <select style={inputStyle}>
              <option>OKX-实盘-主账户</option>
              <option>OKX-模拟盘-01</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>LLM</label>
            <select style={inputStyle}>
              <option>MiniMax M2.5</option>
              <option>DeepSeek</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>策略</label>
            <select style={inputStyle}>
              <option>VegasMeanReversion v2</option>
              <option>GridBot v1</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <button style={btnStyle}>💾 保存</button>
          <button style={{ ...btnStyle, background: '#22d3ee', color: '#020617' }}>💾 保存并启动</button>
        </div>
      </div>
    </div>
  );
}

const traderCardStyle: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.5)',
  border: '1px solid #1e293b',
  borderRadius: 8,
  padding: 14,
  width: 280,
};

const formCardStyle: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.5)',
  border: '1px solid #1e293b',
  borderRadius: 12,
  padding: 20,
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
};

const btnStyle: React.CSSProperties = {
  padding: '8px 20px',
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 6,
  color: '#94a3b8',
  cursor: 'pointer',
  fontSize: 13,
};

const miniBtn: React.CSSProperties = {
  padding: '4px 10px',
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 4,
  color: '#94a3b8',
  cursor: 'pointer',
  fontSize: 11,
};
