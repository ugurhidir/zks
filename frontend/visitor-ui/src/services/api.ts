import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

// Create an axios instance for public routes
const publicApi = axios.create({
    baseURL: `${API_URL}/api`,
});

// Create another axios instance for authenticated routes
const privateApi = axios.create({
    baseURL: `${API_URL}/api`,
});

// Add a request interceptor to the private api instance
privateApi.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle auth errors
privateApi.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Token is invalid or expired
            localStorage.removeItem('authToken');
            // Redirect to login page
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// --- Authentication APIs ---
export const login = async (username:string, password:string) => {
    // We use the public endpoint for login
    const response = await publicApi.post('/login', { username, password });
    return response.data;
};

// --- Public Visitor APIs ---
export const validateVisitor = (visitorData:any) => {
    return publicApi.post('/validate', visitorData);
};

export const createVisitor = (visitorData:any) => {
    return publicApi.post('/visitors', visitorData);
};

// --- Protected Staff APIs ---
export const getActiveVisitors = () => {
    return privateApi.get('/visitors/active');
};

export const getPastVisitors = () => {
    return privateApi.get('/visitors/past');
};

export const deactivateVisitor = (id:string | number) => {
    return privateApi.put(`/visitors/${id}/deactivate`);
};

// --- Admin User Management APIs ---
export const getUsers = (params?: { search?: string; role?: string; page?: number; limit?: number }) => {
    return privateApi.get('/users', { params });
};

export const createUser = (userData:any) => {
    return privateApi.post('/users', userData);
};

export const deleteUser = (id:string | number) => {
    return privateApi.delete(`/users/${id}`);
};

export const updateUser = (id:string | number, userData:any) => {
    return privateApi.put(`/users/${id}`, userData);
};

// --- Settings APIs ---
export const getSettings = () => {
    return publicApi.get('/settings');
};

export const updateSettings = (settingsData:any) => {
    return privateApi.put('/settings', settingsData);
};

export const uploadPdf = (file: File) => {
    const formData = new FormData();
    formData.append('pdf', file);
    return privateApi.post('/upload/pdf', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
};

// --- Metrics APIs ---
export const getVisitorMetrics = () => {
    return privateApi.get('/metrics/visitors');
};
