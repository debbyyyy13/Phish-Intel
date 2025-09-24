import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/axios';

const ConfigContext = createContext();

export const useConfig = () => {
    const context = useContext(ConfigContext);
    if (!context) {
        throw new Error('useConfig must be used within a ConfigProvider');
    }
    return context;
};

export const ConfigProvider = ({ children }) => {
    const [config, setConfig] = useState({});
    const [loading, setLoading] = useState(true);

    const fetchConfig = async () => {
        try {
            const response = await api.get('/api/v1/config');
            setConfig(response.data.data);
        } catch (error) {
            console.error('Failed to fetch config:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateConfig = async (newConfig) => {
        try {
            const response = await api.put('/api/v1/config', { settings: newConfig });
            setConfig(response.data.data);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    return (
        <ConfigContext.Provider value={{
            config,
            updateConfig,
            loading,
            refetch: fetchConfig
        }}>
            {children}
        </ConfigContext.Provider>
    );
};