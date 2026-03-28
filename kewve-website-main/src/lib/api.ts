// Get API URL - use environment variable or construct from current origin
const getApiBaseUrl = (): string => {
  // Always check environment variable first
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  if (typeof window !== 'undefined') {
    // Client-side: construct API URL from current origin
    const origin = window.location.origin;
    // If on localhost, use localhost:5000
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return 'http://localhost:5000/api';
    }
    // For production, assume API is on same domain
    return `${origin}/api`;
  }
  
  // Server-side: default to localhost
  return 'http://localhost:5000/api';
};

// Get auth token from tab-scoped session storage first.
export const getClientAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;

  const sessionToken = sessionStorage.getItem('authToken');
  if (sessionToken) return sessionToken;

  // Backward compatibility: migrate legacy localStorage token into this tab's session.
  const legacyToken = localStorage.getItem('authToken');
  if (legacyToken) {
    sessionStorage.setItem('authToken', legacyToken);
    localStorage.removeItem('authToken');
    return legacyToken;
  }

  return null;
};

// Set auth token in tab-scoped session storage.
export const setAuthToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('authToken', token);
    // Clear any shared legacy token to avoid cross-tab session collisions.
    localStorage.removeItem('authToken');
  }
};

// Remove auth token from both stores (legacy cleanup).
export const removeAuthToken = (): void => {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('authToken');
    localStorage.removeItem('authToken');
  }
};

// API request helper
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getClientAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const apiUrl = getApiBaseUrl();
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const isNetwork =
      raw === 'Failed to fetch' ||
      raw.includes('NetworkError') ||
      raw.toLowerCase().includes('network');
    throw new Error(
      isNetwork
        ? 'Could not reach the API. Check your network connection, that the backend is running, and that NEXT_PUBLIC_API_URL points to it (e.g. http://localhost:5000/api for local dev).'
        : raw,
    );
  }

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const error = await response.json();
      errorMessage = error.message || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }

    if (response.status === 401 && errorMessage === `HTTP error! status: 401`) {
      errorMessage = 'Authentication failed. Please check your credentials.';
    } else if (response.status === 404 && errorMessage === `HTTP error! status: 404`) {
      errorMessage =
        'API endpoint not found. Check NEXT_PUBLIC_API_URL and that the backend exposes this route.';
    }

    throw new Error(errorMessage);
  }

  return response.json();
};

// Auth API
export const authAPI = {
  register: async (data: {
    email: string;
    password: string;
    name: string;
    role?: 'buyer' | 'producer';
    businessName?: string;
    country?: string;
  }) => {
    const response = await apiRequest<{
      success: boolean;
      data: {
        user: any;
        token?: string;
        requiresEmailVerification?: boolean;
        emailVerificationToken?: string;
      };
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (response.success && response.data.token) {
      setAuthToken(response.data.token);
    }
    return response;
  },

  login: async (data: { email: string; password: string; expectedRole?: 'buyer' | 'producer' }) => {
    const response = await apiRequest<{
      success: boolean;
      data: { user: any; token: string };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (response.success && response.data.token) {
      setAuthToken(response.data.token);
    }
    return response;
  },

  getCurrentUser: async () => {
    return apiRequest<{
      success: boolean;
      data: { user: any };
    }>('/auth/me');
  },

  enableBuyerRole: async () => {
    return apiRequest<{
      success: boolean;
      data: { user: any };
      message?: string;
    }>('/auth/enable-buyer-role', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  updateProfile: async (data: {
    name?: string;
    /** Profile country (buyers & producers); distinct from buyer delivery address country */
    country?: string;
    stripeConnectAccountId?: string;
    savedDeliveryAddress?: {
      line1: string;
      line2?: string;
      city: string;
      postalCode: string;
      country: string;
      phone?: string;
      company?: string;
    } | null;
  }) => {
    return apiRequest<{
      success: boolean;
      data: { user: any };
    }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  stripeConnectStart: async () => {
    return apiRequest<{
      success: boolean;
      url?: string;
      accountId?: string;
      message?: string;
    }>('/stripe/connect', { method: 'POST' });
  },

  stripeConnectStatus: async () => {
    return apiRequest<{
      success: boolean;
      data?: {
        hasAccount?: boolean;
        accountId?: string | null;
        detailsSubmitted?: boolean;
        chargesEnabled?: boolean;
        payoutsEnabled?: boolean;
        /** Saved acct_ was created in the opposite Stripe mode vs STRIPE_SECRET_KEY */
        stripeModeMismatch?: boolean;
      };
      message?: string;
    }>('/stripe/connect/status');
  },

  logout: () => {
    removeAuthToken();
  },
};

// Assessment API
export const assessmentAPI = {
  getAssessment: async () => {
    return apiRequest<{
      success: boolean;
      data: any;
    }>('/assessment');
  },

  saveAssessment: async (data: any) => {
    return apiRequest<{
      success: boolean;
      data: any;
    }>('/assessment', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateAssessment: async (data: any) => {
    return apiRequest<{
      success: boolean;
      data: any;
    }>('/assessment', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updateChecklist: async (checklistState: any) => {
    return apiRequest<{
      success: boolean;
      data: any;
    }>('/assessment/checklist', {
      method: 'PUT',
      body: JSON.stringify({ checklistState }),
    });
  },

  uploadDocument: async (file: File, category?: string) => {
    const token = getClientAuthToken();
    const formData = new FormData();
    formData.append('document', file);
    if (category) {
      formData.append('category', category);
    }

    const apiUrl = getApiBaseUrl();
    const response = await fetch(`${apiUrl}/assessment/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = 'Upload failed';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },

  deleteDocument: async (documentId: string) => {
    return apiRequest<{
      success: boolean;
    }>(`/assessment/documents/${documentId}`, {
      method: 'DELETE',
    });
  },
};

// Trade Profile API
export const tradeProfileAPI = {
  getProfile: async () => {
    return apiRequest<{
      success: boolean;
      data: any;
    }>('/trade-profile');
  },

  saveProfile: async (data: {
    companyName: string;
    country: string;
    description: string;
    yearsOfExperience: string;
    marketsPreviouslyExportedTo: string;
    monthlyProductionCapacity: string;
    processingMethods: string;
    packagingFormats: string;
    storageFacilities: string;
    sustainabilityPractices: string;
    traceabilitySystems: string;
    completedSections: number[];
  }) => {
    return apiRequest<{
      success: boolean;
      data: any;
    }>('/trade-profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

export type SearchProductHit = {
  _id: string;
  name?: string;
  category?: string;
  kind: 'catalog' | 'mine';
};

export type SearchTransactionHit = {
  _id: string;
  /** Last 4 hex chars of request id — same as Orders "Ref" column */
  refSuffix: string;
  productName?: string;
  volumeKg?: number;
  status?: string;
  market?: string;
  role: 'buyer' | 'producer';
};

export type SearchScope = 'all' | 'products' | 'trades';

export const searchAPI = {
  search: async (q: string, opts?: { scope?: SearchScope }) => {
    const params = new URLSearchParams({ q });
    if (opts?.scope && opts.scope !== 'all') params.set('scope', opts.scope);
    return apiRequest<{
      success: boolean;
      data: { products: SearchProductHit[]; transactions: SearchTransactionHit[] };
    }>(`/search?${params.toString()}`);
  },
};

// Product API
export const productAPI = {
  getProducts: async (opts?: { catalog?: 'buyer' }) => {
    const q = opts?.catalog === 'buyer' ? '?catalog=buyer' : '';
    return apiRequest<{
      success: boolean;
      data: any[];
    }>(`/products${q}`);
  },

  getProduct: async (id: string, opts?: { catalog?: 'buyer' }) => {
    const q = opts?.catalog === 'buyer' ? '?catalog=buyer' : '';
    return apiRequest<{
      success: boolean;
      data: any;
    }>(`/products/${id}${q}`);
  },

  createProduct: async (data: any) => {
    return apiRequest<{
      success: boolean;
      data: any;
    }>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  createProductWithCompliance: async (data: any, files: File[]) => {
    const token = getClientAuthToken();
    const formData = new FormData();
    Object.entries(data || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null) formData.append(k, String(v));
    });
    for (const file of files || []) {
      formData.append('documents', file);
    }
    const apiUrl = getApiBaseUrl();
    const response = await fetch(`${apiUrl}/products`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });
    if (!response.ok) {
      let errorMessage = 'Failed to create product';
      try {
        const err = await response.json();
        errorMessage = err.message || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    return response.json();
  },

  updateProduct: async (id: string, data: any) => {
    return apiRequest<{
      success: boolean;
      data: any;
    }>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  uploadImage: async (id: string, file: File) => {
    const token = getClientAuthToken();
    const formData = new FormData();
    formData.append('image', file);

    const apiUrl = getApiBaseUrl();
    const response = await fetch(`${apiUrl}/products/${id}/image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = 'Image upload failed';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },

  uploadComplianceDocument: async (productId: string, file: File) => {
    const token = getClientAuthToken();
    const formData = new FormData();
    formData.append('document', file);

    const apiUrl = getApiBaseUrl();
    const response = await fetch(`${apiUrl}/products/${productId}/compliance-documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = 'Upload failed';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },
  uploadComplianceDocuments: async (productId: string, files: File[]) => {
    const token = getClientAuthToken();
    const formData = new FormData();
    for (const file of files || []) {
      formData.append('documents', file);
    }
    const apiUrl = getApiBaseUrl();
    const response = await fetch(`${apiUrl}/products/${productId}/compliance-documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    if (!response.ok) {
      let errorMessage = 'Upload failed';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    return response.json();
  },

  deleteComplianceDocument: async (productId: string, docId: string) => {
    return apiRequest<{ success: boolean; data: any }>(
      `/products/${productId}/compliance-documents/${docId}`,
      { method: 'DELETE' }
    );
  },

  getComplianceDocumentUrl: (productId: string, docId: string) => {
    const apiUrl = getApiBaseUrl();
    const token = getClientAuthToken();
    const params = new URLSearchParams();
    if (token) params.set('token', token);
    return `${apiUrl}/products/${productId}/compliance-documents/${docId}/file?${params.toString()}`;
  },

  getImageUrl: (id: string, opts?: { catalog?: 'buyer' }) => {
    const apiUrl = getApiBaseUrl();
    const token = getClientAuthToken();
    const params = new URLSearchParams();
    if (token) params.set('token', token);
    if (opts?.catalog === 'buyer') params.set('catalog', 'buyer');
    return `${apiUrl}/products/${id}/image?${params.toString()}`;
  },

  deleteProduct: async (id: string) => {
    return apiRequest<{
      success: boolean;
      data: any;
    }>(`/products/${id}`, {
      method: 'DELETE',
    });
  },
};

// Buyer Request API
export const buyerRequestAPI = {
  create: async (data: {
    productId: string;
    volumeKg: number;
    market: string;
    timeline: string;
    packagingFormat?: string;
    deliveryAddress: {
      line1: string;
      line2?: string;
      city: string;
      postalCode: string;
      country: string;
      phone?: string;
      company?: string;
    };
  }) => {
    return apiRequest<{ success: boolean; data: any; message?: string }>('/buyer-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  list: async () => {
    return apiRequest<{ success: boolean; data: any[] }>('/buyer-requests');
  },
  getById: async (id: string) => {
    return apiRequest<{ success: boolean; data: any }>(`/buyer-requests/${id}`);
  },
  createTradeCheckoutSession: async (id: string) => {
    return apiRequest<{ success: boolean; url?: string; message?: string }>(`/buyer-requests/${id}/trade/checkout-session`, {
      method: 'POST',
    });
  },
  syncTradeCheckout: async (id: string, sessionId: string) => {
    return apiRequest<{ success: boolean; data: any; sync?: { applied?: boolean; alreadyPaid?: boolean } }>(
      `/buyer-requests/${id}/trade/sync-checkout`,
      {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      }
    );
  },
  updateStatus: async (id: string, status: 'pending' | 'in_review' | 'matched' | 'closed') => {
    return apiRequest<{ success: boolean; data: any }>(`/buyer-requests/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
  producerDecision: async (
    id: string,
    body: { decision: 'accepted' | 'declined'; reason?: string; productId?: string }
  ) => {
    return apiRequest<{ success: boolean; data: any }>(`/buyer-requests/${id}/trade/producer-decision`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },
  generateInvoice: async (
    id: string,
    body?: { additionalFeesCents?: number; additionalFeesNote?: string }
  ) => {
    return apiRequest<{ success: boolean; data: any }>(`/buyer-requests/${id}/trade/invoice`, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    });
  },
  markInvoicePaid: async (id: string) => {
    return apiRequest<{ success: boolean; data: any }>(`/buyer-requests/${id}/trade/invoice/mark-paid`, {
      method: 'PUT',
    });
  },
  updateTradeFulfillment: async (
    id: string,
    status: 'none' | 'processing' | 'dispatched' | 'delivered' | 'cancelled' | 'completed',
    opts?: { reason?: string; productId?: string }
  ) => {
    return apiRequest<{ success: boolean; data: any }>(`/buyer-requests/${id}/trade/fulfillment`, {
      method: 'PUT',
      body: JSON.stringify({
        status,
        ...(opts?.reason != null && String(opts.reason).trim() ? { reason: String(opts.reason).trim() } : {}),
        ...(opts?.productId ? { productId: String(opts.productId) } : {}),
      }),
    });
  },
  buyerReceipt: async (id: string, body: { receipt: 'received_ok' | 'received_issues'; notes?: string }) => {
    return apiRequest<{ success: boolean; data: any }>(`/buyer-requests/${id}/trade/buyer-receipt`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },
};

// Aggregation API
export const aggregationAPI = {
  getProducerEligibleClusters: async () => {
    return apiRequest<{ success: boolean; data: any[] }>('/clusters/eligible');
  },
  joinCluster: async (clusterId: string, payload: { productId: string; committedKg: number }) => {
    return apiRequest<{ success: boolean; data: any }>(`/clusters/${clusterId}/join`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getBuyerClusters: async () => {
    return apiRequest<{ success: boolean; data: any[] }>('/buyer/clusters');
  },
  getMyPurchasedClusters: async () => {
    return apiRequest<{ success: boolean; data: any[] }>('/buyer/clusters/my-purchases');
  },
  getClusterQuote: async (clusterId: string, params: { volumeKg: number; market?: string; timeline?: string }) => {
    const q = new URLSearchParams({
      volumeKg: String(params.volumeKg),
      market: params.market || 'EU',
      timeline: params.timeline || 'ASAP',
    });
    return apiRequest<{ success: boolean; data: any }>(`/buyer/clusters/${clusterId}/quote?${q.toString()}`);
  },
  createClusterCheckoutSession: async (
    clusterId: string,
    payload: { volumeKg: number; market: string; timeline: string }
  ) => {
    return apiRequest<{ success: boolean; url?: string; totalCents?: number; message?: string }>(
      `/buyer/clusters/${clusterId}/checkout-session`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
  },
  syncClusterCheckout: async (clusterId: string, sessionId: string) => {
    return apiRequest<{ success: boolean; data: any; sync?: any }>(`/buyer/clusters/${clusterId}/sync-checkout`, {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  },
  submitClusterReceipt: async (clusterId: string, body: { receipt: 'received_ok' | 'received_issues'; notes?: string }) => {
    return apiRequest<{ success: boolean; data: any }>(`/buyer/clusters/${clusterId}/receipt`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },
  getMyClusterSettlements: async () => {
    return apiRequest<{ success: boolean; data: any[] }>('/clusters/my-settlements');
  },
  /** Producer marks own cluster settlement line as delivered (admin verifies / accepts). */
  updateProducerClusterSupply: async (clusterId: string, entryId: string) => {
    return apiRequest<{ success: boolean; data: any }>(
      `/clusters/${clusterId}/settlement/entries/${entryId}/supply`,
      { method: 'PUT', body: JSON.stringify({ supplyStatus: 'delivered' }) }
    );
  },
};

// Admin token helpers (separate from producer token)
const getAdminToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('adminToken');
};

export const setAdminToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('adminToken', token);
  }
};

export const removeAdminToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('adminToken');
  }
};

const adminRequest = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const apiUrl = getApiBaseUrl();
  const response = await fetch(`${apiUrl}${endpoint}`, { ...options, headers });
  if (!response.ok) {
    let msg = `HTTP error! status: ${response.status}`;
    try { const err = await response.json(); msg = err.message || msg; } catch {}
    throw new Error(msg);
  }
  return response.json();
};

// Admin API
export type AdminSearchScope = 'all' | 'products' | 'trades' | 'clusters' | 'producers';

export type AdminSearchData = {
  products: Array<{ _id: string; name?: string; category?: string }>;
  buyerRequests: Array<{
    _id: string;
    refSuffix: string;
    productName?: string;
    buyerName?: string;
    status?: string;
    market?: string;
  }>;
  clusters: Array<{ _id: string; productName?: string; clusterId?: string; status?: string }>;
  producers: Array<{ _id: string; name?: string; email?: string }>;
};

export const adminAPI = {
  search: async (q: string, opts?: { scope?: AdminSearchScope }) => {
    const params = new URLSearchParams({ q });
    if (opts?.scope && opts.scope !== 'all') params.set('scope', opts.scope);
    return adminRequest<{ success: boolean; data: AdminSearchData }>(`/admin/search?${params.toString()}`);
  },

  login: async (data: { email: string; password: string }) => {
    const apiUrl = getApiBaseUrl();
    const response = await fetch(`${apiUrl}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (result.success && result.data?.token) {
      setAdminToken(result.data.token);
    }
    return result;
  },
  getMe: async () => {
    return adminRequest<{ success: boolean; data: { user: any } }>('/admin/me');
  },
  getStats: async () => {
    return adminRequest<{ success: boolean; data: any }>('/admin/stats');
  },
  getBuyerRequests: async () => {
    return adminRequest<{ success: boolean; data: any[] }>('/admin/buyer-requests');
  },
  updateBuyerRequestStatus: async (id: string, status: 'pending' | 'in_review' | 'matched' | 'closed') => {
    return adminRequest<{ success: boolean; data: any }>(`/admin/buyer-requests/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
  autoMatchBuyerRequest: async (id: string) => {
    return adminRequest<{ success: boolean; data: any; message?: string }>(`/admin/buyer-requests/${id}/auto-match`, {
      method: 'POST',
    });
  },
  updateBuyerRequestMatchPlan: async (
    id: string,
    allocations: Array<{ producerId: string; productId: string; allocatedKg: number }>
  ) => {
    return adminRequest<{ success: boolean; data: any; message?: string }>(`/admin/buyer-requests/${id}/match-plan`, {
      method: 'PUT',
      body: JSON.stringify({ allocations }),
    });
  },
  /** After producer cancelled a paid order — pick a new product (single) or allocations[] (aggregation). */
  reassignPaidCancellation: async (
    id: string,
    body: { productId?: string; allocations?: Array<{ producerId: string; productId: string; allocatedKg: number }>; buyerNote?: string }
  ) => {
    return adminRequest<{ success: boolean; data: any; message?: string }>(
      `/admin/buyer-requests/${id}/reassign-paid-cancellation`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );
  },
  finalizePaidCancellation: async (id: string, body: { reason: string; buyerNote?: string }) => {
    return adminRequest<{ success: boolean; data: any; message?: string }>(
      `/admin/buyer-requests/${id}/cancel-paid-cancellation`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );
  },
  /** Aggregation trades only — issues buyer invoice (same totals as producer flow for single-supplier). */
  sendBuyerRequestTradeInvoice: async (
    id: string,
    body?: { additionalFeesCents?: number; additionalFeesNote?: string }
  ) => {
    return adminRequest<{ success: boolean; data: any; message?: string }>(`/admin/buyer-requests/${id}/trade/invoice`, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    });
  },
  markBuyerRequestInvoicePaid: async (id: string) => {
    return adminRequest<{ success: boolean; data: any; message?: string }>(`/admin/buyer-requests/${id}/trade/invoice/mark-paid`, {
      method: 'PUT',
    });
  },
  refundBuyerRequestTrade: async (id: string, body?: { amountCents?: number; note?: string }) => {
    return adminRequest<{ success: boolean; data: any; message?: string; refundId?: string }>(
      `/admin/buyer-requests/${id}/trade/refund`,
      {
        method: 'POST',
        body: JSON.stringify(body ?? {}),
      }
    );
  },
  updateAdminTradeFulfillment: async (
    id: string,
    status: 'none' | 'processing' | 'dispatched' | 'delivered' | 'cancelled' | 'completed'
  ) => {
    return adminRequest<{ success: boolean; data: any }>(`/admin/buyer-requests/${id}/trade/fulfillment`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
  appendTradeIssueNote: async (id: string, body: string) => {
    return adminRequest<{ success: boolean; data: any }>(`/admin/buyer-requests/${id}/trade/issue-note`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  },
  resolveTradeIssues: async (
    id: string,
    body: {
      closeAsReceivedOk?: boolean;
      /** Public message visible to buyer and producer */
      resolutionNote?: string;
      /** @deprecated use resolutionNote */
      adminNotes?: string;
      refundBuyer?: boolean;
      refundAmountCents?: number;
    }
  ) => {
    return adminRequest<{ success: boolean; data: any }>(`/admin/buyer-requests/${id}/trade/resolve-issues`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },
  getPayoutQueue: async () => {
    return adminRequest<{ success: boolean; data: any[] }>('/admin/accounts/payout-queue');
  },
  getPayoutHistory: async () => {
    return adminRequest<{ success: boolean; data: any[] }>('/admin/accounts/payout-history');
  },
  initiateProducerPayout: async (body: {
    requestId: string;
    passcode: string;
    producerId?: string;
    productId?: string;
    amountCents?: number;
  }) => {
    return adminRequest<{ success: boolean; data?: any; message?: string; transferId?: string }>(
      '/admin/accounts/payout',
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );
  },
  getProducers: async () => {
    return adminRequest<{ success: boolean; data: any[] }>('/admin/producers');
  },
  getProducer: async (id: string) => {
    return adminRequest<{ success: boolean; data: any }>(`/admin/producer/${id}`);
  },
  getDocumentUrl: (producerId: string, docId: string) => {
    const apiUrl = getApiBaseUrl();
    const token = getAdminToken();
    return `${apiUrl}/admin/producer/${producerId}/document/${docId}?token=${token}`;
  },
  reviewDocument: async (
    producerId: string,
    docId: string,
    action: 'approved' | 'rejected' | 'pending',
    reason?: string
  ) => {
    return adminRequest<{ success: boolean; message: string; data: any }>(
      `/admin/producer/${producerId}/document/${docId}/review`,
      {
        method: 'PUT',
        body: JSON.stringify({ action, reason }),
      }
    );
  },
  verifyProducer: async (producerId: string) => {
    return adminRequest<{ success: boolean; message: string }>(
      `/admin/producer/${producerId}/verify`,
      { method: 'PUT' }
    );
  },
  getProducts: async () => {
    return adminRequest<{ success: boolean; data: any[] }>('/admin/products');
  },
  getProduct: async (id: string) => {
    return adminRequest<{ success: boolean; data: any }>(`/admin/products/${id}`);
  },
  getProductImageUrl: (productId: string) => {
    const apiUrl = getApiBaseUrl();
    const token = getAdminToken();
    return `${apiUrl}/admin/products/${productId}/image?token=${token}`;
  },
  getProductComplianceDocumentUrl: (productId: string, docId: string) => {
    const apiUrl = getApiBaseUrl();
    const token = getAdminToken();
    return `${apiUrl}/admin/products/${productId}/compliance-documents/${docId}/file?token=${token}`;
  },
  reviewProductComplianceDocument: async (
    productId: string,
    docId: string,
    action: 'approved' | 'rejected' | 'pending',
    reason?: string
  ) => {
    return adminRequest<{ success: boolean; message: string; data: any }>(
      `/admin/products/${productId}/compliance-documents/${docId}/review`,
      {
        method: 'PUT',
        body: JSON.stringify({ action, reason }),
      }
    );
  },
  reviewProduct: async (productId: string, action: 'approved' | 'rejected', reason?: string) => {
    return adminRequest<{ success: boolean; message: string; data: any }>(
      `/admin/products/${productId}/review`,
      {
        method: 'PUT',
        body: JSON.stringify({ action, reason }),
      }
    );
  },
  deleteProduct: async (productId: string) => {
    return adminRequest<{ success: boolean; message: string; data: any }>(`/admin/products/${productId}`, {
      method: 'DELETE',
    });
  },
  getDiscountCodes: async () => {
    return adminRequest<{ success: boolean; data: any[] }>('/admin/discount-codes');
  },
  createDiscountCode: async (data: { code: string; discountPercent?: number }) => {
    return adminRequest<{ success: boolean; message: string; data: any }>('/admin/discount-codes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  toggleDiscountCode: async (id: string) => {
    return adminRequest<{ success: boolean; message: string; data: any }>(`/admin/discount-codes/${id}/toggle`, {
      method: 'PUT',
    });
  },
  getClusters: async () => {
    return adminRequest<{ success: boolean; data: any[] }>('/admin/clusters');
  },
  createCluster: async (data: {
    clusterId?: string;
    productName: string;
    category: string;
    productForm?: string;
    targetMarket: 'UK' | 'EU' | 'Both';
    /** Producers must have this country on their profile to join; omit for legacy / any country */
    supplyCountry?: string;
    minimumExportVolumeKg: number;
    availabilityWindow?: string;
    specificationSummary?: string;
  }) => {
    return adminRequest<{ success: boolean; data: any; message?: string }>('/admin/clusters', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  deleteCluster: async (id: string) => {
    return adminRequest<{ success: boolean; message?: string }>(`/admin/clusters/${id}`, {
      method: 'DELETE',
    });
  },
  updateClusterStatus: async (id: string, status: 'open' | 'pending' | 'ready' | 'closed') => {
    return adminRequest<{ success: boolean; data: any }>(`/admin/clusters/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
  reviewClusterContribution: async (
    clusterId: string,
    contributionId: string,
    action: 'approved' | 'rejected',
    notes?: string
  ) => {
    return adminRequest<{ success: boolean; data: any }>(`/admin/clusters/${clusterId}/contributions/${contributionId}`, {
      method: 'PUT',
      body: JSON.stringify({ action, notes }),
    });
  },
  addClusterContribution: async (
    clusterId: string,
    payload: {
      producerEmail?: string;
      producerId?: string;
      productId?: string;
      productName?: string;
      committedKg: number;
      status?: 'pending' | 'approved' | 'rejected';
    }
  ) => {
    return adminRequest<{ success: boolean; data: any; message?: string }>(`/admin/clusters/${clusterId}/contributions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  removeClusterContribution: async (clusterId: string, contributionId: string) => {
    return adminRequest<{ success: boolean; data: any; message?: string }>(
      `/admin/clusters/${clusterId}/contributions/${contributionId}`,
      { method: 'DELETE' }
    );
  },
  updateClusterSettlementSupply: async (
    clusterId: string,
    entryId: string,
    supplyStatus: 'pending' | 'delivered' | 'verified' | 'accepted'
  ) => {
    return adminRequest<{ success: boolean; data: any; payoutWarning?: string }>(
      `/admin/clusters/${clusterId}/settlement/entries/${entryId}/supply`,
      { method: 'PUT', body: JSON.stringify({ supplyStatus }) }
    );
  },
  updateClusterDelivery: async (
    clusterId: string,
    body:
      | { mode: 'buyer_profile' }
      | {
          mode: 'custom';
          address: {
            line1: string;
            line2?: string;
            city: string;
            postalCode: string;
            country: string;
            phone?: string;
            company?: string;
          };
        }
  ) => {
    return adminRequest<{ success: boolean; data: any }>(`/admin/clusters/${clusterId}/delivery`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },
  retryClusterSettlementPayout: async (clusterId: string, entryId: string) => {
    return adminRequest<{ success: boolean; data: any; message?: string }>(
      `/admin/clusters/${clusterId}/settlement/entries/${entryId}/payout`,
      { method: 'POST' }
    );
  },
  updateClusterSettlementPayoutAmount: async (clusterId: string, entryId: string, amountCents: number) => {
    return adminRequest<{ success: boolean; data: any; message?: string }>(
      `/admin/clusters/${clusterId}/settlement/entries/${entryId}/payout-amount`,
      { method: 'PUT', body: JSON.stringify({ amountCents }) }
    );
  },
  resolveClusterIssues: async (clusterId: string, body: { closeAsReceivedOk?: boolean; adminNotes?: string }) => {
    return adminRequest<{ success: boolean; data: any }>(`/admin/clusters/${clusterId}/resolve-issues`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },
  refundClusterPurchase: async (clusterId: string, body?: { amountCents?: number; note?: string }) => {
    return adminRequest<{ success: boolean; data: any; message?: string; refundId?: string }>(`/admin/clusters/${clusterId}/refund`, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    });
  },
};
