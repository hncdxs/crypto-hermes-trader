const BASE = '';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

export const api = {
  // ── Init ──
  getInitStatus: () => request<{ initialized: boolean }>('/api/init/status'),
  setupInit: (data: { llm_config: any; exchange_account: any }) =>
    request<{ status: string }>('/api/init/setup', { method: 'POST', body: JSON.stringify(data) }),

  getLLMConfigs: () => request<{ configs: any[] }>('/api/init/llm'),
  createLLMConfig: (data: any) =>
    request<any>('/api/init/llm', { method: 'POST', body: JSON.stringify(data) }),
  updateLLMConfig: (id: string, data: any) =>
    request<any>(`/api/init/llm/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLLMConfig: (id: string) =>
    request<any>(`/api/init/llm/${id}`, { method: 'DELETE' }),
  getExchangeAccounts: () => request<{ accounts: any[] }>('/api/init/exchange'),

  // ── Hermes ──
  getHermesStatus: () => request<any>('/api/init/hermes/status'),
  startHermes: () => request<any>('/api/init/hermes/start', { method: 'POST' }),
  stopHermes: () => request<any>('/api/init/hermes/stop', { method: 'POST' }),
  chatWithHermes: (messages: string) =>
    request<any>('/api/init/hermes/chat', { method: 'POST', body: JSON.stringify({ messages }) }),
  listAgentConfigs: (trader_id?: string) =>
    request<{ configs: any[] }>(`/api/init/agent-configs${trader_id ? `?trader_id=${trader_id}` : ''}`),
  updateAgentConfig: (id: string, data: any) =>
    request<any>(`/api/init/agent-configs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Exchange ──
  listExchangeAccounts: () => request<{ accounts: any[] }>('/api/exchange'),
  createExchangeAccount: (data: any) =>
    request<any>('/api/exchange', { method: 'POST', body: JSON.stringify(data) }),
  updateExchangeAccount: (id: string, data: any) =>
    request<any>(`/api/exchange/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExchangeAccount: (id: string) =>
    request<any>(`/api/exchange/${id}`, { method: 'DELETE' }),
  testExchangeConnection: (data: any) =>
    request<any>('/api/exchange/test', { method: 'POST', body: JSON.stringify(data) }),
  testSavedExchangeConnection: (id: string) =>
    request<any>(`/api/exchange/${id}/test`, { method: 'POST' }),

  // ── Strategies ──
  listStrategies: () => request<any[]>('/api/strategies'),
  getStrategy: (id: string) => request<any>(`/api/strategies/${id}`),
  createStrategy: (data: { name: string; indicators: any[]; description: string }) =>
    request<any>('/api/strategies', { method: 'POST', body: JSON.stringify(data) }),
  updateStrategy: (id: string, data: { name?: string; indicators?: any[]; description?: string }) =>
    request<any>(`/api/strategies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  cloneStrategy: (id: string, newName: string) =>
    request<any>(`/api/strategies/${id}/clone`, { method: 'POST', body: JSON.stringify({ new_name: newName }) }),
  deleteStrategy: (id: string) =>
    request<any>(`/api/strategies/${id}`, { method: 'DELETE' }),

  // ── Traders ──
  listTraders: () => request<any[]>('/api/traders'),
  getTrader: (id: string) => request<any>(`/api/traders/${id}`),
  createTrader: (data: any) =>
    request<any>('/api/traders', { method: 'POST', body: JSON.stringify(data) }),
  updateTrader: (id: string, data: any) =>
    request<any>(`/api/traders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTrader: (id: string) =>
    request<any>(`/api/traders/${id}`, { method: 'DELETE' }),
  startTrader: (id: string) =>
    request<any>(`/api/traders/${id}/start`, { method: 'POST' }),
  stopTrader: (id: string) =>
    request<any>(`/api/traders/${id}/stop`, { method: 'POST' }),

  // ── Dashboard ──
  getDashboardSummary: () =>
    request<{ running_traders: number; strategies: number; decisions_24h: number }>('/api/dashboard/summary'),
  getDecisions: (period?: string) =>
    request<{ decisions: any[] }>(`/api/dashboard/decisions${period ? `?period=${period}` : ''}`),
  getPositions: (status?: string) =>
    request<{ positions: any[] }>(`/api/dashboard/positions${status ? `?status=${status}` : ''}`),
  getRunningTraders: () => request<{ traders: any[] }>('/api/dashboard/traders'),
};
