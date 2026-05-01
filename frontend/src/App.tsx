import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Init from './pages/Init';
import Strategies from './pages/Strategies';
import Traders from './pages/Traders';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#020617', color: 'white', fontFamily: 'monospace' }}>
        {/* 侧边导航 */}
        <nav style={{ width: 200, padding: 20, borderRight: '1px solid #1e293b' }}>
          <h2 style={{ fontSize: 16, marginBottom: 20 }}>🤖 Crypto AI Trader</h2>
          <NavLink to="/init" style={navStyle}>🚀 项目初始化</NavLink>
          <NavLink to="/strategies" style={navStyle}>📝 策略</NavLink>
          <NavLink to="/traders" style={navStyle}>🤖 交易员</NavLink>
          <NavLink to="/dashboard" style={navStyle}>📊 看板</NavLink>
        </nav>

        {/* 主内容 */}
        <main style={{ flex: 1, padding: 24 }}>
          <Routes>
            <Route path="/init" element={<Init />} />
            <Route path="/strategies" element={<Strategies />} />
            <Route path="/traders" element={<Traders />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="*" element={<Init />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

const navStyle: React.CSSProperties = {
  display: 'block',
  padding: '8px 12px',
  marginBottom: 4,
  borderRadius: 6,
  color: '#94a3b8',
  textDecoration: 'none',
  fontSize: 14,
};

export default App;
