import React from 'react';

export default function Dashboard() {
  return (
    <div>
      {/* 页头 */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>🤖 交易员-01</h1>
        <p style={{ fontSize: 12, color: '#64748b' }}>
          MiniMax M2.5 &nbsp;|&nbsp; OKX-实盘 &nbsp;|&nbsp; VegasMeanRev v2
        </p>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        {/* 左栏：战绩 */}
        <div style={{ width: 260 }}>
          <div style={cardStyle}>
            <h3 style={{ fontSize: 14, marginBottom: 12, color: '#22d3ee' }}>📊 战绩</h3>
            <div style={statItemStyle}>
              <span style={{ color: '#64748b', fontSize: 12 }}>胜率</span>
              <span style={{ fontSize: 24, fontWeight: 700, color: '#34d399' }}>68.7%</span>
            </div>
            <div style={statItemStyle}>
              <span style={{ color: '#64748b', fontSize: 12 }}>总盈亏</span>
              <span style={{ fontSize: 24, fontWeight: 700, color: '#34d399' }}>+2,450 USDT</span>
            </div>
            <div style={statItemStyle}>
              <span style={{ color: '#64748b', fontSize: 12 }}>手续费</span>
              <span style={{ fontSize: 14, color: '#fb7185' }}>-123 USDT</span>
            </div>
            <div style={statItemStyle}>
              <span style={{ color: '#64748b', fontSize: 12 }}>交易次数</span>
              <span style={{ fontSize: 14 }}>47</span>
            </div>
            <div style={statItemStyle}>
              <span style={{ color: '#64748b', fontSize: 12 }}>监控交易对</span>
              <span style={{ fontSize: 14 }}>6</span>
            </div>
            <div style={statItemStyle}>
              <span style={{ color: '#64748b', fontSize: 12 }}>当前仓位</span>
              <span style={{ fontSize: 14, color: '#22d3ee' }}>1 (BTC多头)</span>
            </div>
          </div>
        </div>

        {/* 中栏：决策流程 */}
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 14, marginBottom: 12, color: '#34d399' }}>📋 最近决策</h3>

          {/* 决策卡片 */}
          <div style={decisionCardStyle}>
            <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 8 }}>
              14:30 [BTC] K线收盘触发
            </div>
            <div style={decisionRowStyle}>
              <span style={checkStyle}>✅</span> RSI(14)=28.3 ≤ 30
            </div>
            <div style={decisionRowStyle}>
              <span style={checkStyle}>✅</span> 维加斯通道方向: 向下
            </div>
            <div style={decisionRowStyle}>
              <span style={checkStyle}>✅</span> 4H连续3根低点下移
            </div>
            <div style={{ ...decisionRowStyle, color: '#22d3ee', fontWeight: 600 }}>
              🟢 → 开多 Long_Rev
            </div>
            <details style={{ marginTop: 8 }}>
              <summary style={{ fontSize: 12, color: '#64748b', cursor: 'pointer' }}>▼ 展开思维链</summary>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 8, lineHeight: 1.8 }}>
                🤔 盯盘代理: 开始检查 BTC/USDT...<br />
                🧮 Python引擎: 计算 EMA144=68120, RSI=28.3...<br />
                ✅ 条件全部满足: 通知主代理<br />
                👑 主代理: 决策 — 开多 Long_Rev<br />
                ⚡ 下单代理: 市价买入 BTC 100U<br />
                ✅ 成交 @67420, 止损 @66914 已挂
              </div>
            </details>
          </div>

          <div style={decisionCardStyle}>
            <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 8 }}>
              13:15 [ETH] K线收盘触发
            </div>
            <div style={decisionRowStyle}>
              <span style={{ color: '#fb7185' }}>❌</span> RSI=55 未超卖
            </div>
            <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
              ⏭ 无信号，跳过
            </div>
          </div>
        </div>
      </div>

      {/* 底部：历史仓位表格 */}
      <div style={{ ...cardStyle, marginTop: 16 }}>
        <h3 style={{ fontSize: 14, marginBottom: 12, color: '#a78bfa' }}>📂 历史仓位</h3>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: '#64748b', borderBottom: '1px solid #1e293b' }}>
              <th style={thStyle}>交易对</th>
              <th style={thStyle}>方向</th>
              <th style={thStyle}>开仓价</th>
              <th style={thStyle}>平仓价</th>
              <th style={thStyle}>盈亏</th>
              <th style={thStyle}>手续费</th>
              <th style={thStyle}>持仓时间</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #0f172a' }}>
              <td style={tdStyle}>BTC</td>
              <td style={{ ...tdStyle, color: '#34d399' }}>多头</td>
              <td style={tdStyle}>67,420</td>
              <td style={tdStyle}>68,900</td>
              <td style={{ ...tdStyle, color: '#34d399' }}>+1,480</td>
              <td style={tdStyle}>-12.5</td>
              <td style={tdStyle}>2h 15m</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #0f172a' }}>
              <td style={tdStyle}>ETH</td>
              <td style={{ ...tdStyle, color: '#fb7185' }}>空头</td>
              <td style={tdStyle}>3,120</td>
              <td style={tdStyle}>3,080</td>
              <td style={{ ...tdStyle, color: '#34d399' }}>+40</td>
              <td style={tdStyle}>-3.2</td>
              <td style={tdStyle}>45m</td>
            </tr>
            <tr>
              <td style={tdStyle}>SOL</td>
              <td style={{ ...tdStyle, color: '#34d399' }}>多头</td>
              <td style={tdStyle}>145</td>
              <td style={tdStyle}>142</td>
              <td style={{ ...tdStyle, color: '#fb7185' }}>-30</td>
              <td style={tdStyle}>-2.1</td>
              <td style={tdStyle}>1h 30m</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.5)',
  border: '1px solid #1e293b',
  borderRadius: 12,
  padding: 16,
};

const statItemStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 0',
  borderBottom: '1px solid #0f172a',
};

const decisionCardStyle: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.5)',
  border: '1px solid #1e293b',
  borderRadius: 8,
  padding: 14,
  marginBottom: 10,
};

const decisionRowStyle: React.CSSProperties = {
  padding: '2px 0',
  fontSize: 13,
  color: '#e2e8f0',
};

const checkStyle: React.CSSProperties = {
  color: '#34d399',
  marginRight: 6,
};

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontWeight: 500,
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
};
