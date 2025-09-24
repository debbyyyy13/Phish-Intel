import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const login = async (email, password) => {
        try {
            const response = await api.post('/api/v1/auth/login', { email, password });
            const { token, user } = response.data;
            
            localStorage.setItem('token', token);
            setUser(user);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.response?.data?.message || 'Login failed' };
        }
    };

    const loginWithGoogle = () => {
        window.location.href = `${import.meta.env.VITE_API_URL}/api/v1/auth/google`;
    };

    const signup = async (userData) => {
        try {
            const response = await api.post('/api/v1/auth/signup', userData);
            const { token, user } = response.data;
            
            localStorage.setItem('token', token);
            setUser(user);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.response?.data?.message || 'Signup failed' };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            // Verify token and get user data
            api.get('/api/v1/auth/me')
                .then(response => setUser(response.data.user))
                .catch(() => logout())
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    return (
        <AuthContext.Provider value={{
            user,
            login,
            loginWithGoogle,
            signup,
            logout,
            loading
        }}>
            {children}
        </AuthContext.Provider>
    );
};