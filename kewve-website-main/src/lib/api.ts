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
