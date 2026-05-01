import React from 'react';

export default function Strategies() {
  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>📝 策略管理</h1>
      <p style={{ color: '#94a3b8', marginBottom: 24 }}>用 Markdown 写交易策略，支持版本迭代</p>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* 策略列表 */}
        <div style={{ width: 300 }}>
          <div style={cardStyle}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>📄 VegasMeanReversion</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>v2 (使用中) • 2026-05-01</div>
          </div>
          <div style={{ ...cardStyle, opacity: 0.6 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>📄 GridBot</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>v1 • 2026-04-28</div>
          </div>
          <button style={addBtnStyle}>+ 新建策略</button>
        </div>

        {/* 编辑器 */}
        <div style={{ flex: 1 }}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontWeight: 600 }}>VegasMeanReversion v2</span>
              <span style={{ fontSize: 12, color: '#22d3ee' }}>使用中 🟢</span>
            </div>
            <textarea
              style={{
                width: '100%',
                height: 400,
                background: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: 6,
                color: '#e2e8f0',
                padding: 12,
                fontSize: 13,
                fontFamily: 'monospace',
                resize: 'vertical',
              }}
              defaultValue={`# AI自动交易员策略
## 1. 角色与核心设定
你是一名严格执行量化规则的AI交易执行代理...

## 2. 指标与参数
RSI(14): 超卖≤30 | 超买≥70
维加斯通道: EMA144 & EMA169
ATR缓冲: ATR(14)
硬性风控线: 多仓止损≥入场价×0.9925`}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button style={btnStyle}>保存为新版本 v3</button>
              <button style={btnStyle}>另存为新策略</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.5)',
  border: '1px solid #1e293b',
  borderRadius: 8,
  padding: 12,
  marginBottom: 8,
  cursor: 'pointer',
};

const btnStyle: React.CSSProperties = {
  padding: '6px 14px',
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 6,
  color: '#94a3b8',
  cursor: 'pointer',
  fontSize: 12,
};

const addBtnStyle: React.CSSProperties = {
  ...btnStyle,
  width: '100%',
  padding: '10px',
  marginTop: 8,
};
