import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Chat from './pages/Chat';
import Strategies from './pages/Strategies';
import Traders from './pages/Traders';
import Dashboard from './pages/Dashboard';
import ExchangeManager from './pages/ExchangeManager';
import './index.css';

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

/* ── Nav items ── */
const NAV_ITEMS = [
  { path: '/dashboard', label: '📊 看板', icon: '' },
  { path: '/chat', label: '💬 对话', icon: '' },
  { path: '/strategies', label: '📝 策略管理', icon: '' },
  { path: '/traders', label: '🤖 交易员', icon: '' },
  { path: '/exchange', label: '🏛️ 交易所', icon: '' },
];

function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}>
        {/* ═══ 侧边导航 ═══ */}
        <nav style={{
          width: 200,
          flexShrink: 0,
          background: C.card,
          borderRight: `1px solid ${C.border}`,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}>
          {/* Logo */}
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            marginBottom: 24,
            padding: '8px 0',
            background: `linear-gradient(135deg, ${C.purple}, ${C.cyan})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.5px',
          }}>
            🤖 Crypto AI Trader
          </div>

          {/* Version tag */}
          <div style={{
            fontSize: 10, color: C.muted, marginBottom: 16, padding: '2px 8px',
            background: C.bg, borderRadius: 4, border: `1px solid ${C.border}`,
            textAlign: 'center',
          }}>
            v0.1.0 · Hermes
          </div>

          {/* Nav links */}
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => isActive ? 'nav-active' : ''}
              style={navLinkStyle}
            >
              {({ isActive }) => (
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: isActive ? C.cyan : C.muted,
                  fontWeight: isActive ? 600 : 400,
                  transition: 'color 0.15s',
                }}>
                  <span style={{
                    width: 4, height: 4, borderRadius: '50%',
                    background: isActive ? C.cyan : 'transparent',
                    boxShadow: isActive ? `0 0 6px ${C.cyan}` : 'none',
                  }} />
                  {item.label}
                </span>
              )}
            </NavLink>
          ))}

          {/* Spacer + status footer */}
          <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: C.muted }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: `0 0 4px ${C.green}` }} />
              <span>Hermes 引擎</span>
            </div>
          </div>
        </nav>

        {/* ═══ 主内容 ═══ */}
        <main style={{
          flex: 1,
          padding: 24,
          overflow: 'auto',
          maxHeight: '100vh',
        }}>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/strategies" element={<Strategies />} />
            <Route path="/traders" element={<Traders />} />
            <Route path="/exchange" element={<ExchangeManager />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </main>
      </div>

      <style>{`
        .nav-active {
          background: rgba(0, 206, 201, 0.06) !important;
          border: 1px solid rgba(0, 206, 201, 0.15) !important;
        }
        .nav-active:hover {
          background: rgba(0, 206, 201, 0.1) !important;
        }
      `}</style>
    </BrowserRouter>
  );
}

const navLinkStyle: React.CSSProperties = {
  display: 'block',
  padding: '7px 12px',
  borderRadius: 6,
  textDecoration: 'none',
  border: '1px solid transparent',
  transition: 'all 0.15s',
};

export default App;
