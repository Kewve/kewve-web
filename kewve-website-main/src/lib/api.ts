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

// Get auth token from localStorage
const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('authToken');
};

// Set auth token in localStorage
export const setAuthToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('authToken', token);
  }
};

// Remove auth token from localStorage
export const removeAuthToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('authToken');
  }
};

// API request helper
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const apiUrl = getApiBaseUrl();
  const response = await fetch(`${apiUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const error = await response.json();
      errorMessage = error.message || errorMessage;
    } catch {
      // If response is not JSON, use status text
      errorMessage = response.statusText || errorMessage;
    }
    
    // Provide more helpful error messages
    if (response.status === 0 || response.status === 500) {
      errorMessage = 'Unable to connect to server. Please check if the backend is running.';
    } else if (response.status === 401) {
      errorMessage = 'Authentication failed. Please check your credentials.';
    } else if (response.status === 404) {
      errorMessage = 'API endpoint not found. Please check the API URL configuration.';
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
    businessName?: string;
    country?: string;
  }) => {
    const response = await apiRequest<{
      success: boolean;
      data: { user: any; token: string };
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (response.success && response.data.token) {
      setAuthToken(response.data.token);
    }
    return response;
  },

  login: async (data: { email: string; password: string }) => {
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

  updateProfile: async (data: { name: string }) => {
    return apiRequest<{
      success: boolean;
      data: { user: any };
    }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
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
    const token = getToken();
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

// Product API
export const productAPI = {
  getProducts: async () => {
    return apiRequest<{
      success: boolean;
      data: any[];
    }>('/products');
  },

  getProduct: async (id: string) => {
    return apiRequest<{
      success: boolean;
      data: any;
    }>(`/products/${id}`);
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
    const token = getToken();
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

  getImageUrl: (id: string) => {
    const apiUrl = getApiBaseUrl();
    const token = getToken();
    return `${apiUrl}/products/${id}/image?token=${token}`;
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
export const adminAPI = {
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
  reviewDocument: async (producerId: string, docId: string, action: 'approved' | 'rejected', reason?: string) => {
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
  reviewProduct: async (productId: string, action: 'approved' | 'rejected', reason?: string) => {
    return adminRequest<{ success: boolean; message: string; data: any }>(
      `/admin/products/${productId}/review`,
      {
        method: 'PUT',
        body: JSON.stringify({ action, reason }),
      }
    );
  },
};
