import {
  User,
  ItemCatalog,
  SerializedUnit,
  TransactionLedger,
  Task,
  CustomerIssue,
  TechnicianRequisition,
  StockSummaryItem,
  DashboardStats,
  StockMovementPayload,
  SwapDevicePayload
} from '../models/types.ts';

const TOKEN_KEY = 'ont_auth_token';

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setStoredToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearStoredToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || `HTTP error ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  login: async (email?: string, userId?: string): Promise<{ token: string; user: User }> => {
    const data = await request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, userId })
    });
    setStoredToken(data.token);
    return data;
  },

  getCurrentUser: (): Promise<User> => request<User>('/auth/me'),
  getUsers: (): Promise<User[]> => request<User[]>('/users'),

  // Dashboard
  getDashboardStats: (): Promise<DashboardStats> => request<DashboardStats>('/dashboard/stats'),

  // Catalog & Stock
  getCatalog: (): Promise<ItemCatalog[]> => request<ItemCatalog[]>('/catalog'),
  getStockSummary: (): Promise<StockSummaryItem[]> => request<StockSummaryItem[]>('/stock/summary'),

  // Serialized Units
  getSerializedUnits: (params?: { status?: string; search?: string; sku?: string }): Promise<SerializedUnit[]> => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.sku) query.set('sku', params.sku);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<SerializedUnit[]>(`/serialized${qs}`);
  },

  updateSerializedUnit: (assetId: string, updates: Partial<SerializedUnit>): Promise<{ success: boolean; unit: SerializedUnit }> => {
    return request<{ success: boolean; unit: SerializedUnit }>(`/serialized/${assetId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  // Transactions & Ledger
  executeStockMovement: (payload: StockMovementPayload): Promise<{ success: boolean; message: string; transaction: TransactionLedger }> => {
    return request<{ success: boolean; message: string; transaction: TransactionLedger }>('/transactions/move', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  getAuditLedger: (): Promise<TransactionLedger[]> => request<TransactionLedger[]>('/transactions/ledger'),

  // Tasks
  getTasks: (): Promise<Task[]> => request<Task[]>('/tasks'),
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'stockReadyAt'>): Promise<Task> => {
    return request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(task)
    });
  },
  updateTaskStatus: (taskId: string, status: Task['status']): Promise<Task> => {
    return request<Task>(`/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  // Issues & Equipment Swapping
  getIssues: (): Promise<CustomerIssue[]> => request<CustomerIssue[]>('/issues'),
  swapCustomerDevice: (payload: SwapDevicePayload): Promise<{ success: boolean; message: string; issue: CustomerIssue }> => {
    return request<{ success: boolean; message: string; issue: CustomerIssue }>('/issues/swap', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Requisitions
  getRequisitions: (): Promise<TechnicianRequisition[]> => request<TechnicianRequisition[]>('/requisitions'),
  createRequisition: (sku: string, quantity: number, reason: string): Promise<TechnicianRequisition> => {
    return request<TechnicianRequisition>('/requisitions', {
      method: 'POST',
      body: JSON.stringify({ sku, quantity, reason })
    });
  },
  updateRequisitionAction: (reqId: string, action: 'Approved' | 'Rejected'): Promise<TechnicianRequisition> => {
    return request<TechnicianRequisition>(`/requisitions/${reqId}/action`, {
      method: 'PATCH',
      body: JSON.stringify({ action })
    });
  },

  // Excelize-Compatible Excel Exports
  downloadExcelReport: async (): Promise<void> => {
    return api.downloadMasterExcel();
  },

  downloadMasterExcel: async (): Promise<void> => {
    const token = getStoredToken();
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const res = await fetch('/api/export/master', { headers });
    if (!res.ok) throw new Error('Failed to generate master Excel report');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ont_master_report_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  downloadLedgerExcel: async (): Promise<void> => {
    const token = getStoredToken();
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const res = await fetch('/api/export/ledger', { headers });
    if (!res.ok) throw new Error('Failed to generate transaction ledger Excel report');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ont_transaction_ledger_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  downloadSerializedExcel: async (): Promise<void> => {
    const token = getStoredToken();
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const res = await fetch('/api/export/serialized', { headers });
    if (!res.ok) throw new Error('Failed to generate serialized units Excel report');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ont_serialized_units_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
};
