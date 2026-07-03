// API Configuration
const API_BASE_URL = 'https://civic-resolve.onrender.com';

// Helper function with retry logic
const fetchWithRetry = async (url, options, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            return response;
        } catch (error) {
            console.log(`Fetch attempt ${i + 1} failed:`, error.message);
            if (i === retries - 1) throw error;
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
    }
};

// Helper function for making API requests with authentication
const apiRequest = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');

    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        headers: {
            ...defaultHeaders,
            ...options.headers
        },
        ...options
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            // If unauthorized, clear token and redirect to login
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login.html';
                return;
            }
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
};

// Authentication API endpoints
const authAPI = {
    login: (credentials) => {
        return fetch(`${API_BASE_URL}/api/v1/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials)
        }).then(response => response.json());
    },

    register: (userData) => {
        return fetch(`${API_BASE_URL}/api/v1/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        }).then(response => response.json());
    },

    logout: () => {
        return apiRequest('/api/v1/users/logout', {
            method: 'POST'
        });
    },

    getCurrentUser: () => {
        return apiRequest('/api/v1/users/current-user', {
            method: 'GET'
        });
    }
};

// Reports API endpoints - Updated with retry logic and better error handling
const reportsAPI = {
    submit: async (formData) => {
        const token = localStorage.getItem('token');

        console.log('Token debug info:', {
            hasToken: !!token,
            tokenLength: token ? token.length : 0,
            tokenPrefix: token ? token.substring(0, 20) + '...' : 'none',
            tokenType: typeof token
        });

        if (!token) {
            throw new Error('No authentication token found. Please log in again.');
        }

        try {
            const response = await fetchWithRetry(`${API_BASE_URL}/api/v1/reports/submit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    // Don't set Content-Type for FormData - browser sets it with boundary
                },
                body: formData
            }, 3); // Retry up to 3 times

            console.log('Report submission response:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (parseError) {
                    console.error('Failed to parse error response:', parseError);
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                console.error('API Error Response:', errorData);
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Success response data:', data);
            return data;

        } catch (error) {
            console.error('Submit request failed:', error);

            // Handle specific error types
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                throw new Error('Network connection failed. Please check your internet connection and try again.');
            } else if (error.name === 'AbortError') {
                throw new Error('Request timed out. Please try again.');
            } else {
                throw error;
            }
        }
    },

    getMyReports: () => {
        return apiRequest('/api/v1/reports/my-reports', {
            method: 'GET'
        });
    },

    getReportById: (reportId) => {
        return apiRequest(`/api/v1/reports/${reportId}`, {
            method: 'GET'
        });
    },

    getAllReports: () => {
        return apiRequest('/api/v1/reports/all', {
            method: 'GET'
        });
    },

    updateReportStatus: (reportId, data) => apiRequest(`/api/v1/admin/reports/${reportId}/status`, {
        method: 'PUT',
        body: JSON.stringify(data),
    })
};

// Categories API endpoints
const categoriesAPI = {
    getAll: () => {
        return apiRequest('/api/v1/categories/all', {
            method: 'GET'
        });
    }
};

// Token validation function - simplified to avoid unnecessary logouts
const validateToken = async () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            return false;
        }

        const response = await authAPI.getCurrentUser();
        return response && response.success;
    } catch (error) {
        console.error('Token validation failed:', error);
        // Don't automatically redirect on validation failure
        return false;
    }
};

const notificationsAPI = {
    getMyNotifications: () => {
        return apiRequest('/api/v1/notifications/my-notifications', {
            method: 'GET'
        });
    },
};

const analyticsAPI = {
    getDashboardData: () => apiRequest('/api/v1/analytics/dashboard'),
};

// Make APIs globally available
window.authAPI = authAPI;
window.reportsAPI = reportsAPI;
window.analyticsAPI = analyticsAPI;
window.categoriesAPI = categoriesAPI;
window.notificationsAPI = notificationsAPI;
window.validateToken = validateToken;

// Wait for API to be ready function
window.waitForAPI = () => {
    return new Promise((resolve) => {
        if (window.authAPI && window.reportsAPI) {
            resolve();
        } else {
            setTimeout(() => {
                resolve();
            }, 100);
        }
    });
};

console.log('API client loaded successfully');
