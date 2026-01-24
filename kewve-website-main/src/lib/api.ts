const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
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

  uploadDocument: async (file: File) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('document', file);

    const response = await fetch(`${API_BASE_URL}/assessment/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || 'Upload failed');
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
