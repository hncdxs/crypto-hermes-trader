import React, { useEffect, useState } from 'react';
import { api } from '../api';

interface Indicator {
  name: string;
  params: Record<string, number>;
}

interface Strategy {
  id: string;
  name: string;
  indicators: Indicator[];
  description: string;
  status: string;
  current_version: string;
  created_at: string;
  updated_at: string;
}

const INDICATOR_TEMPLATES: Record<string, Record<string, number>> = {
  MA: { period: 5 },
  EMA: { period: 12 },
  MACD: { fast: 12, slow: 26, signal: 9 },
  RSI: { period: 14 },
  VOL: {},
};

const INDICATOR_OPTIONS = Object.keys(INDICATOR_TEMPLATES);

export default function Strategies() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIndicators, setEditIndicators] = useState<Indicator[]>([]);
  const [editDescription, setEditDescription] = useState('');
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [cloneName, setCloneName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadStrategies = () => {
    api.listStrategies().then(setStrategies).catch(() => {});
  };

  useEffect(() => {
    loadStrategies();
  }, []);

  const selected = strategies.find((s) => s.id === selectedId);

  const selectStrategy = (id: string) => {
    setSelectedId(id);
    const s = strategies.find((st) => st.id === id);
    if (s) {
      setEditName(s.name);
      setEditIndicators(s.indicators?.length > 0 ? s.indicators.map((i) => ({ ...i, params: { ...i.params } })) : []);
      setEditDescription(s.description || '');
    }
  };

  const handleNew = () => {
    setSelectedId(null);
    setEditName('');
    setEditIndicators([]);
    setEditDescription('');
  };

  const addIndicator = (name: string) => {
    setEditIndicators([...editIndicators, { name, params: { ...INDICATOR_TEMPLATES[name] } }]);
  };

  const removeIndicator = (idx: number) => {
    setEditIndicators(editIndicators.filter((_, i) => i !== idx));
  };

  const updateIndicatorParam = (idx: number, key: string, value: number) => {
    const updated = editIndicators.map((ind, i) => {
      if (i !== idx) return ind;
      return { ...ind, params: { ...ind.params, [key]: value } };
    });
    setEditIndicators(updated);
  };

  const handleSave = async () => {
    const payload = { name: editName, indicators: editIndicators, description: editDescription };
    try {
      if (selectedId) {
        await api.updateStrategy(selectedId, payload);
      } else {
        await api.createStrategy(payload);
      }
      await loadStrategies();
    } catch (e: any) {
      alert('保存失败: ' + e.message);
    }
  };

  const handleClone = async () => {
    if (!selectedId || !cloneName.trim()) return;
    try {
      await api.cloneStrategy(selectedId, cloneName.trim());
      setShowCloneDialog(false);
      setCloneName('');
      await loadStrategies();
    } catch (e: any) {
      alert('另存失败: ' + e.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    try {
      await api.deleteStrategy(selectedId);
      setShowDeleteConfirm(false);
      setSelectedId(null);
      await loadStrategies();
    } catch (e: any) {
      alert('删除失败: ' + e.message);
    }
  };

  const availableIndicators = INDICATOR_OPTIONS.filter(
    (n) => !editIndicators.find((i) => i.name === n)
  );

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 20 }}>📝 策略管理</h1>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* ── 左侧列表 ── */}
        <div style={{ width: 280, flexShrink: 0 }}>
          {strategies.map((s) => (
            <div
              key={s.id}
              onClick={() => selectStrategy(s.id)}
              style={{
                ...cardStyle,
                border: selectedId === s.id ? '1px solid #22d3ee' : '1px solid #1e293b',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>📄 {s.name}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                {s.current_version} · {new Date(s.updated_at).toLocaleDateString()}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                {s.indicators?.length || 0} 个指标
              </div>
            </div>
          ))}
          <button style={addBtnStyle} onClick={handleNew}>+ 新建策略</button>
        </div>

        {/* ── 右侧编辑区 ── */}
        <div style={{ flex: 1 }}>
          <div style={cardStyle}>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>策略名称</label>
              <input style={inputStyle} value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="策略名称" />
            </div>

            {/* 指标 */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>指标</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {editIndicators.map((ind, idx) => (
                  <div key={idx} style={indicatorCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 12, color: '#22d3ee' }}>{ind.name}</span>
                      <span onClick={() => removeIndicator(idx)} style={{ color: '#fb7185', cursor: 'pointer', fontSize: 11 }}>✕</span>
                    </div>
                    {Object.entries(ind.params).map(([key, val]) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: '#64748b' }}>{key}:</span>
                        {ind.name === 'VOL' ? (
                          <span style={{ fontSize: 11, color: '#34d399' }}>✅</span>
                        ) : (
                          <input
                            style={{ ...inputStyle, width: 50, padding: '2px 4px', fontSize: 11 }}
                            type="number"
                            value={val}
                            onChange={(e) => updateIndicatorParam(idx, key, Number(e.target.value))}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              {availableIndicators.length > 0 && (
                <select
                  style={{ ...inputStyle, width: 'auto' }}
                  value=""
                  onChange={(e) => { if (e.target.value) addIndicator(e.target.value); }}
                >
                  <option value="">+ 添加指标</option>
                  {availableIndicators.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              )}
            </div>

            {/* 描述 */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>策略描述</label>
              <textarea
                style={{ ...inputStyle, minHeight: 300, resize: 'vertical', fontFamily: 'monospace', lineHeight: 1.6 }}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="输入策略逻辑、规则和参数说明..."
              />
            </div>

            {/* 操作按钮 */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnPrimaryStyle} onClick={handleSave}>
                💾 保存
              </button>
              {selectedId && (
                <>
                  <button style={btnStyle} onClick={() => { setShowCloneDialog(true); setCloneName(''); }}>
                    📋 另存副本
                  </button>
                  <button style={{ ...btnStyle, color: '#fb7185' }} onClick={() => setShowDeleteConfirm(true)}>
                    🗑️ 删除
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 另存副本对话框 ── */}
      {showCloneDialog && (
        <div style={overlayStyle} onClick={() => setShowCloneDialog(false)}>
          <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 12, fontSize: 15 }}>📋 另存副本</h3>
            <input style={inputStyle} value={cloneName} onChange={(e) => setCloneName(e.target.value)} placeholder="输入新策略名称" autoFocus />
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button style={btnStyle} onClick={() => setShowCloneDialog(false)}>取消</button>
              <button style={btnPrimaryStyle} onClick={handleClone} disabled={!cloneName.trim()}>确认</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 删除确认对话框 ── */}
      {showDeleteConfirm && (
        <div style={overlayStyle} onClick={() => setShowDeleteConfirm(false)}>
          <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 8, fontSize: 15 }}>🗑️ 确认删除</h3>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>
              确定要删除「{selected?.name}」吗？如果策略正在使用中，删除将被禁止。
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={btnStyle} onClick={() => setShowDeleteConfirm(false)}>取消</button>
              <button style={{ ...btnPrimaryStyle, background: '#dc2626' }} onClick={handleDelete}>确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.5)',
  border: '1px solid #1e293b',
  borderRadius: 10,
  padding: 14,
  marginBottom: 8,
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
  boxSizing: 'border-box',
};

const indicatorCardStyle: React.CSSProperties = {
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: 8,
  padding: '8px 10px',
  minWidth: 120,
};

const btnStyle: React.CSSProperties = {
  padding: '7px 16px',
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 6,
  color: '#94a3b8',
  cursor: 'pointer',
  fontSize: 12,
};

const btnPrimaryStyle: React.CSSProperties = {
  padding: '7px 16px',
  background: '#22d3ee',
  border: 'none',
  borderRadius: 6,
  color: '#020617',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
};

const addBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 8,
  color: '#94a3b8',
  cursor: 'pointer',
  fontSize: 13,
  marginTop: 4,
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
};

const dialogStyle: React.CSSProperties = {
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 12,
  padding: 24,
  minWidth: 360,
};
