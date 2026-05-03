import React, { useEffect, useState, useRef } from 'react';

/* ── Types ── */
interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

interface ToolCall {
  tool: string;
  input: string;
  output: string;
}

interface HermesChatResponse {
  reply: string;
  tool_calls?: ToolCall[];
  thinking?: string;
  chain?: ToolCall[];
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

async function post<T>(url: string, body: any): Promise<T> {
  const res = await fetch(`${API}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(`${API}${url}`, { headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* ── Preset questions ── */
const PRESETS = [
  '📊 当前市场状况如何？',
  '🛠️ 帮我检查系统运行状态',
  '📈 查看最近的交易信号',
  '⚙️ 配置新策略需要什么？',
];

/* ═══════════════ 对话 Chat ═══════════════ */
export default function Chat() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [expandedTool, setExpandedTool] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setInput('');
    setLoading(true);
    setToolCalls([]);

    try {
      const r = await post<HermesChatResponse>('/api/chat', { message: msg });
      setMessages(prev => [...prev, { role: 'assistant', content: r.reply || '(无回复)' }]);

      // Extract tool calls from response
      const calls: ToolCall[] = [];
      if (r.tool_calls) calls.push(...r.tool_calls);
      if (r.chain) calls.push(...r.chain);
      if (r.thinking) calls.push({ tool: 'thinking', input: '', output: r.thinking });
      setToolCalls(calls);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ 错误: ' + e.message }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 100px)', animation: 'fadeIn 0.3s ease' }}>
      {/* ═══ 左侧 — 对话区 ═══ */}
      <div style={{ flex: '0 0 60%', display: 'flex', flexDirection: 'column', border: `1px solid ${C.border}`, borderRadius: 8, background: C.card, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>💬</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>与 Hermes 对话</span>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setToolCalls([]); }}
              style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 4, padding: '4px 10px', color: C.muted, cursor: 'pointer', fontSize: 11 }}
            >
              🗑️ 清空
            </button>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.length === 0 && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
              <div style={{ fontSize: 11, color: C.muted }}>开始和 Hermes 对话吧</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '80%', maxWidth: 400 }}>
                {PRESETS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(p)}
                    style={{
                      padding: '8px 14px',
                      background: C.bg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      color: C.dim,
                      fontSize: 12,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = C.purple}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = C.border}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className="animate-slide" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              <span style={{ fontSize: 10, color: C.muted, marginBottom: 3, marginLeft: msg.role === 'user' ? 'auto' : 0, marginRight: msg.role === 'user' ? 0 : 'auto' }}>
                {msg.role === 'user' ? '🧑 你' : '🤖 Hermes'}
              </span>
              <div style={{
                padding: '10px 14px',
                borderRadius: 10,
                fontSize: 13,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                background: msg.role === 'user' ? C.purple : C.bg,
                color: msg.role === 'user' ? '#fff' : C.text,
                border: msg.role === 'user' ? 'none' : `1px solid ${C.border}`,
                borderBottomRightRadius: msg.role === 'user' ? 2 : 10,
                borderBottomLeftRadius: msg.role === 'user' ? 10 : 2,
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, color: C.muted, fontSize: 12, padding: '10px 14px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, borderBottomLeftRadius: 2 }}>
              <span className="animate-blink" style={{ fontSize: 16 }}>🤖</span>
              <span>思考中<span className="animate-blink">...</span></span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息，按 Enter 发送..."
            disabled={loading}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              color: C.text,
              fontSize: 13,
              outline: 'none',
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            style={{
              padding: '8px 18px',
              background: C.purple,
              border: 'none',
              borderRadius: 6,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !input.trim() ? 0.5 : 1,
            }}
          >
            {loading ? '⋯' : '发送 ➤'}
          </button>
        </div>
      </div>

      {/* ═══ 右侧 — 思维链展开面板 ═══ */}
      <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', border: `1px solid ${C.border}`, borderRadius: 8, background: C.card, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13 }}>🧠</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>思维链展开</span>
          <span style={{ fontSize: 10, color: C.muted, marginLeft: 'auto' }}>
            {toolCalls.length > 0 ? `${toolCalls.length} 个工具调用` : '等待对话...'}
          </span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {toolCalls.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
              <span style={{ fontSize: 24, opacity: 0.3 }}>🔮</span>
              <span style={{ fontSize: 11, color: C.muted, textAlign: 'center' }}>
                对话后这里会显示 Hermes 的<br/>工具调用和思考过程
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {toolCalls.map((tc, i) => (
                <div key={i} className="animate-slide" style={{
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  overflow: 'hidden',
                }}>
                  <div
                    onClick={() => setExpandedTool(expandedTool === i ? null : i)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 10px',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = C.dim + '40'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{
                      fontSize: 10,
                      background: tc.tool === 'thinking' ? 'rgba(253,203,110,0.15)' : 'rgba(108,92,231,0.15)',
                      color: tc.tool === 'thinking' ? C.yellow : C.purple,
                      padding: '1px 6px',
                      borderRadius: 3,
                      fontWeight: 600,
                    }}>
                      {tc.tool === 'thinking' ? '💭 think' : `🔧 ${tc.tool}`}
                    </span>
                    <span style={{ fontSize: 11, color: C.muted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tc.input?.slice(0, 60) || '(无输入)'}
                    </span>
                    <span style={{ fontSize: 10, color: C.dim }}>
                      {expandedTool === i ? '▲' : '▼'}
                    </span>
                  </div>
                  {expandedTool === i && (
                    <div style={{ borderTop: `1px solid ${C.border}` }}>
                      {tc.input && (
                        <div style={{ padding: '8px 10px', borderBottom: `1px solid ${C.border}` }}>
                          <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>输入:</div>
                          <pre style={{ fontSize: 11, color: C.dim, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5, margin: 0 }}>{tc.input}</pre>
                        </div>
                      )}
                      <div style={{ padding: '8px 10px' }}>
                        <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>输出:</div>
                        <pre style={{ fontSize: 11, color: C.cyan, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5, maxHeight: 200, overflow: 'auto', margin: 0 }}>
                          {tc.output || '(空)'}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
