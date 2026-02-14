import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { adminAPI } from '../services/api';
import { useUserStore } from '../store/store';
import Modal from '../components/common/Modal';
import ConfirmModal from '../components/common/ConfirmModal';
import { useToast } from '../context/ToastContext';
import './AdminDashboard.css';

// Level colors for user badges
const LEVEL_COLORS = {
    beginner: '#94a3b8', elementary: '#22c55e', intermediate: '#3b82f6',
    'upper-intermediate': '#8b5cf6', advanced: '#f59e0b', expert: '#ef4444',
    master: '#ec4899', legend: '#eab308'
};

export default function AdminDashboard() {
    const { user } = useUserStore();
    const { success, error } = useToast();
    const [activeTab, setActiveTab] = useState('users');
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState(''); // Text to show while loading

    // Data State
    const [users, setUsers] = useState([]);
    const [apiKeys, setApiKeys] = useState([]);
    const [selectedKeys, setSelectedKeys] = useState(new Set());


    // Add User State
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState(null);
    const [newUserData, setNewUserData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'user',
        fullName: '',
        currentLevel: 'beginner',
        xp: 0,
        isEmailVerified: false
    });

    // Edit User State
    const [editUser, setEditUser] = useState(null);
    // Edit Key State
    const [editKey, setEditKey] = useState(null);
    const fileInputRef = useRef(null);

    // Search / Filter
    const [userSearch, setUserSearch] = useState('');
    const [userRoleFilter, setUserRoleFilter] = useState('all');
    const [userSort, setUserSort] = useState('newest');

    // Form State
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyValue, setNewKeyValue] = useState('');
    const [config, setConfig] = useState({});
    const [originalConfig, setOriginalConfig] = useState({});

    // Models loaded from backend
    const [availableModels, setAvailableModels] = useState([]);

    // Monitoring State
    const [keyStats, setKeyStats] = useState({ stats: {}, cooldowns: {} });

    // Server Logs State
    const [serverLogs, setServerLogs] = useState([]);
    const [logStats, setLogStats] = useState({ info: 0, warn: 0, error: 0, debug: 0 });
    const [logFilter, setLogFilter] = useState({ level: 'all', source: 'all', search: '' });
    const [logPage, setLogPage] = useState(1);
    const [logTotalPages, setLogTotalPages] = useState(1);
    const [logTotal, setLogTotal] = useState(0);

    // Track which key is being tested
    const [testingKeyId, setTestingKeyId] = useState(null);

    // Cache: prevent re-fetching tab data when switching tabs
    const tabDataLoaded = useRef({ users: false, apikeys: false, config: false });

    // Memoized config comparison
    const hasConfigChanges = useMemo(() => {
        const keys = Object.keys(config);
        return keys.some(key => config[key] !== originalConfig[key]);
    }, [config, originalConfig]);

    // Filtered and sorted users
    const filteredUsers = useMemo(() => {
        let result = [...users];

        // Search filter
        if (userSearch.trim()) {
            const q = userSearch.toLowerCase();
            result = result.filter(u =>
                u.username.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                (u.fullName && u.fullName.toLowerCase().includes(q))
            );
        }

        // Role filter
        if (userRoleFilter !== 'all') {
            result = result.filter(u => u.role === userRoleFilter);
        }

        // Sort
        switch (userSort) {
            case 'newest':
                result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'oldest':
                result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case 'name':
                result.sort((a, b) => (a.fullName || a.username).localeCompare(b.fullName || b.username));
                break;
            case 'xp':
                result.sort((a, b) => (b.xp || 0) - (a.xp || 0));
                break;
            default: break;
        }

        return result;
    }, [users, userSearch, userRoleFilter, userSort]);

    // System stats computation
    const computedStats = useMemo(() => {
        if (!users.length) return null;
        const totalUsers = users.length;
        const adminCount = users.filter(u => u.role === 'admin').length;
        const verifiedCount = users.filter(u => u.isEmailVerified).length;
        const totalXP = users.reduce((sum, u) => sum + (u.xp || 0), 0);
        const activeKeys = apiKeys.filter(k => k.isActive).length;

        return {
            totalUsers,
            adminCount,
            verifiedCount,
            totalXP,
            activeKeys,
            totalKeys: apiKeys.length,
            verifiedPercent: totalUsers > 0 ? Math.round((verifiedCount / totalUsers) * 100) : 0
        };
    }, [users, apiKeys]);

    useEffect(() => {
        let interval;
        if (activeTab === 'users') {
            if (!tabDataLoaded.current.users) fetchUsers();
        } else if (activeTab === 'apikeys') {
            if (!tabDataLoaded.current.apikeys) fetchApiKeys();
            fetchKeyStats();
            interval = setInterval(fetchKeyStats, 5000);
        } else if (activeTab === 'config') {
            if (!tabDataLoaded.current.config) fetchConfig();
        } else if (activeTab === 'logs') {
            fetchServerLogs();
        }
        return () => {
            if (interval) clearInterval(interval);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, logPage, logFilter]);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setLoadingText('Loading users...');
        try {
            const { data } = await adminAPI.getUsers();
            if (data.success) {
                setUsers(data.users);
                tabDataLoaded.current.users = true;
            }
        } catch (err) {
            console.error('Fetch users error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchKeyStats = useCallback(async () => {
        try {
            const { data } = await adminAPI.getApiKeyStats();
            if (data.success) {
                setKeyStats({
                    stats: data.stats || {},
                    cooldowns: data.cooldowns || {}
                });
            }
        } catch (err) {
            console.error('Fetch stats error:', err);
        }
    }, []);

    const fetchApiKeys = useCallback(async () => {
        setLoading(true);
        setLoadingText('Loading API keys...');
        try {
            const { data } = await adminAPI.getApiKeys();
            if (data.success) {
                const fullKeyMap = {};
                (data.fullKeys || []).forEach(fk => { fullKeyMap[fk._id] = fk.key; });
                const mergedKeys = data.keys.map(maskedKey => ({
                    ...maskedKey,
                    fullKey: fullKeyMap[maskedKey._id] || ''
                }));
                setApiKeys(mergedKeys);
                setSelectedKeys(new Set());
                tabDataLoaded.current.apikeys = true;
            }
        } catch (err) {
            console.error('Fetch keys error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchConfig = useCallback(async () => {
        setLoading(true);
        setLoadingText('Loading config...');
        try {
            const { data } = await adminAPI.getConfig();
            if (data.success) {
                setConfig(data.config);
                setOriginalConfig(data.config);
                setAvailableModels(data.models || []);
                tabDataLoaded.current.config = true;
            }
        } catch (err) {
            console.error('Fetch config error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleConfigChange = useCallback((key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    }, []);

    const handleSaveConfig = async () => {
        const changedKeys = Object.keys(config).filter(key => config[key] !== originalConfig[key]);
        if (changedKeys.length === 0) return;

        try {
            for (const key of changedKeys) {
                await adminAPI.updateConfig(key, config[key]);
            }

            setOriginalConfig({ ...config });
            success('Changes saved successfully!');
        } catch (error) {
            console.error('Save config error:', error);
            error('Failed to save settings.');
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        setLoadingText('Creating user...');
        try {
            const { data } = await adminAPI.createUser(newUserData);

            if (data.success) {
                success(`User ${data.user.username} created successfully!`);
                setShowAddUserModal(false);
                setNewUserData({ username: '', email: '', password: '', role: 'user', fullName: '', currentLevel: 'beginner', xp: 0, isEmailVerified: false });
                fetchUsers();
            } else {
                error(data.message);
            }
        } catch (err) {
            console.error(err);
            error('Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (user) => {
        setEditUser({
            ...user,
            password: ''
        });
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        setLoadingText('Updating user...');
        try {
            const { data } = await adminAPI.updateUser(editUser._id, editUser);

            if (data.success) {
                success('User information updated successfully!');
                setEditUser(null);
                fetchUsers();
            } else {
                error(data.message);
            }
        } catch (err) {
            console.error(err);
            error('Failed to update user');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId, username) => {
        setConfirmConfig({
            title: 'Delete User',
            message: `Are you sure you want to delete user "${username}"? This will remove all their data permanently.`,
            variant: 'danger',
            confirmText: 'Delete User',
            onConfirm: async () => {
                try {
                    const { data } = await adminAPI.deleteUser(userId);
                    if (data.success) {
                        success(`User "${username}" deleted successfully`);
                        setConfirmConfig(null);
                        fetchUsers();
                    } else {
                        error(data.message || 'Failed to delete user');
                    }
                } catch (err) {
                    console.error(err);
                    error('Failed to delete user');
                }
            }
        });
    };

    const handleTestAllKeys = async () => {
        setLoading(true);
        setLoadingText('Testing all keys (this may take a moment)...');
        try {
            const { data } = await adminAPI.testAllApiKeys();
            if (data.success) {
                const { total, success: successCount, failed } = data.results;
                success(`Tested ${total} keys.\n✅ Success: ${successCount}\n❌ Failed/Deactivated: ${failed}`);
                fetchApiKeys();
            } else {
                error('Test Failed: ' + data.message);
            }
        } catch (err) {
            console.error(err);
            error('Test existing key error');
        } finally {
            setLoading(false);
        }
    };

    const handleBatchActivate = async () => {
        if (selectedKeys.size === 0) return;
        try {
            const { data } = await adminAPI.activateBatchApiKeys(Array.from(selectedKeys));
            if (data.success) {
                success(data.message);
                fetchApiKeys();
            } else {
                error('Activation Failed: ' + data.message);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleBatchDelete = async () => {
        if (selectedKeys.size === 0) return;

        setConfirmConfig({
            title: 'Delete API Keys',
            message: `Are you sure you want to delete ${selectedKeys.size} keys? This action cannot be undone.`,
            variant: 'danger',
            confirmText: 'Delete',
            onConfirm: async () => {
                try {
                    const { data } = await adminAPI.deleteBatchApiKeys(Array.from(selectedKeys));
                    if (data.success) {
                        success(data.message);
                        setSelectedKeys(new Set());
                        fetchApiKeys();
                        setConfirmConfig(null);
                    } else {
                        error('Delete Failed: ' + data.message);
                    }
                } catch (error) {
                    console.error(error);
                    error('Delete Failed');
                }
            }
        });
    };

    const toggleSelection = (id) => {
        const newSet = new Set(selectedKeys);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedKeys(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedKeys.size === apiKeys.length) {
            setSelectedKeys(new Set());
        } else {
            setSelectedKeys(new Set(apiKeys.map(k => k._id)));
        }
    };

    const handleAddKey = async (e) => {
        e.preventDefault();
        if (!newKeyValue) return error('Key is required');

        try {
            const { data } = await adminAPI.createApiKey({ name: newKeyName, key: newKeyValue });
            if (data.success) {
                setNewKeyName('');
                setNewKeyValue('');
                fetchApiKeys();
                success('API Key added successfully');
            } else {
                error('Failed to add key: ' + data.message);
            }
        } catch (error) {
            console.error('Add key error:', error);
        }
    };

    const performKeyTest = useCallback(async (key, isNewKey = false) => {
        setTestingKeyId(isNewKey ? '__new__' : key);

        try {
            const { data } = await adminAPI.testApiKey(key);

            if (data.success) {
                success(`✅ ${data.message}`);
            } else {
                error(`❌ Error: ${data.message}`);
                if (data.keyDeactivated) {
                    tabDataLoaded.current.apikeys = false;
                    fetchApiKeys();
                }
            }
        } catch (err) {
            console.error("Test error", err);
        } finally {
            setTestingKeyId(null);
        }
    }, [success, error, fetchApiKeys]);

    const handleTestKey = useCallback(async () => {
        if (!newKeyValue) return error("Please enter an API Key to test.");
        await performKeyTest(newKeyValue, true);
    }, [newKeyValue, error, performKeyTest]);

    const handleTestExistingKey = useCallback(async (key) => {
        if (!key) return error("Key not available for testing.");
        await performKeyTest(key);
    }, [error, performKeyTest]);

    const handleActivateKey = async (id) => {
        try {
            const { data } = await adminAPI.toggleApiKey(id);
            if (data.success) {
                fetchApiKeys();
            } else {
                error(data.message);
            }
        } catch (error) {
            console.error('Activate key error:', error);
        }
    };

    const handleDeleteKey = async (id) => {
        setConfirmConfig({
            title: 'Delete API Key',
            message: 'Are you sure you want to delete this key? This action cannot be undone.',
            variant: 'danger',
            confirmText: 'Delete',
            onConfirm: async () => {
                try {
                    const { data } = await adminAPI.deleteApiKey(id);
                    if (data.success) {
                        fetchApiKeys();
                        success('API Key deleted successfully');
                        setConfirmConfig(null);
                    } else {
                        error(data.message);
                    }
                } catch (error) {
                    console.error('Delete key error:', error);
                    error('Delete key error');
                }
            }
        });
    };

    const handleUpdateKey = async (e) => {
        e.preventDefault();
        setLoading(true);
        setLoadingText('Updating key...');
        try {
            const { data } = await adminAPI.updateApiKey(editKey._id, editKey);
            if (data.success) {
                success('API Key updated successfully');
                setEditKey(null);
                fetchApiKeys();
            } else {
                error(data.message);
            }
        } catch (err) {
            console.error('Update key error:', err);
            error('Failed to update key');
        } finally {
            setLoading(false);
        }
    };

    const handleExportKeys = () => {
        if (apiKeys.length === 0) return error("No keys to export");
        const content = apiKeys.map(k => `${k.name || 'Untitled'}|${k.fullKey}`).join('\n');
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `api_keys_export_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        success("Keys exported to text file");
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target.result;
                const lines = text.split(/\r?\n/);
                const keysToImport = [];

                for (const line of lines) {
                    if (!line.trim()) continue;
                    const parts = line.split('|');
                    if (parts.length >= 2) {
                        keysToImport.push({
                            name: parts[0].trim(),
                            key: parts[1].trim()
                        });
                    }
                }

                if (keysToImport.length === 0) {
                    return error("No valid keys found (format: Name|Key)");
                }

                setLoading(true);
                setLoadingText(`Importing ${keysToImport.length} keys...`);
                const { data } = await adminAPI.importApiKeys(keysToImport);
                if (data.success) {
                    success(data.message);
                    fetchApiKeys();
                } else {
                    error(data.message);
                }
            } catch (err) {
                console.error("Import error", err);
                error("Failed to import keys");
            } finally {
                setLoading(false);
                e.target.value = ''; // Reset input
            }
        };
        reader.readAsText(file);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            success('API Key copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    };

    // --- Server Logs ---
    const fetchServerLogs = useCallback(async () => {
        setLoading(true);
        setLoadingText('Loading server logs...');
        try {
            const params = { page: logPage, limit: 50 };
            if (logFilter.level !== 'all') params.level = logFilter.level;
            if (logFilter.source !== 'all') params.source = logFilter.source;
            if (logFilter.search) params.search = logFilter.search;

            const { data } = await adminAPI.getServerLogs(params);
            if (data.success) {
                setServerLogs(data.logs);
                setLogStats(data.stats);
                setLogTotalPages(data.totalPages);
                setLogTotal(data.total);
            }
        } catch (err) {
            console.error('Fetch logs error:', err);
        } finally {
            setLoading(false);
        }
    }, [logPage, logFilter]);

    const handleClearLogs = async () => {
        setConfirmConfig({
            title: 'Clear Server Logs',
            message: 'Are you sure you want to clear all server logs? This action cannot be undone.',
            variant: 'danger',
            confirmText: 'Clear All',
            onConfirm: async () => {
                try {
                    const { data } = await adminAPI.clearServerLogs({});
                    if (data.success) {
                        success(data.message);
                        setConfirmConfig(null);
                        fetchServerLogs();
                    }
                } catch (err) {
                    console.error(err);
                    error('Failed to clear logs');
                }
            }
        });
    };

    if (!user || user.role !== 'admin') {
        return (
            <div className="admin-dashboard">
                <div className="admin-content-card" style={{ textAlign: 'center', color: '#ef4444' }}>
                    <h2>Access Denied</h2>
                    <p>You do not have permission to view this page.</p>
                </div>
            </div>
        );
    }

    const TABS = [
        { key: 'users', icon: '👥', label: 'Users', count: users.length },
        { key: 'config', icon: '🤖', label: 'AI Config', count: null },
        { key: 'apikeys', icon: '🔑', label: 'API Keys', count: apiKeys.length },
        { key: 'logs', icon: '📋', label: 'Server Logs', count: logTotal || null },
    ];

    return (
        <div className="admin-dashboard">
            {/* Admin Hero Header */}
            <div className="admin-hero">
                <div className="admin-hero-content">
                    <div className="admin-hero-left">
                        <h1>🛡️ Admin Dashboard</h1>
                        <p className="admin-hero-subtitle">Quản lý hệ thống và người dùng</p>
                    </div>
                    <div className="admin-hero-right">
                        <div className="admin-avatar">
                            <span>{user?.username?.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="admin-user-info">
                            <span className="admin-user-name">{user?.fullName || user?.username}</span>
                            <span className="admin-user-role">Administrator</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Overview Cards */}
            {computedStats && (
                <div className="admin-stats-grid">
                    <div className="admin-stat-card" style={{ '--card-accent': '#6366f1' }}>
                        <div className="admin-stat-icon">👥</div>
                        <div className="admin-stat-info">
                            <span className="admin-stat-value">{computedStats.totalUsers}</span>
                            <span className="admin-stat-label">Total Users</span>
                        </div>
                    </div>
                    <div className="admin-stat-card" style={{ '--card-accent': '#22c55e' }}>
                        <div className="admin-stat-icon">✅</div>
                        <div className="admin-stat-info">
                            <span className="admin-stat-value">{computedStats.verifiedPercent}%</span>
                            <span className="admin-stat-label">Verified</span>
                        </div>
                    </div>
                    <div className="admin-stat-card" style={{ '--card-accent': '#f59e0b' }}>
                        <div className="admin-stat-icon">⭐</div>
                        <div className="admin-stat-info">
                            <span className="admin-stat-value">{computedStats.totalXP.toLocaleString()}</span>
                            <span className="admin-stat-label">Total XP</span>
                        </div>
                    </div>
                    <div className="admin-stat-card" style={{ '--card-accent': '#8b5cf6' }}>
                        <div className="admin-stat-icon">🔑</div>
                        <div className="admin-stat-info">
                            <span className="admin-stat-value">{computedStats.activeKeys}/{computedStats.totalKeys}</span>
                            <span className="admin-stat-label">Active Keys</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="admin-tabs">
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        className={`admin-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        <span className="tab-icon">{tab.icon}</span>
                        <span className="tab-label">{tab.label}</span>
                        {tab.count !== null && (
                            <span className="tab-count">{tab.count}</span>
                        )}
                    </button>
                ))}
            </div>

            <div className="admin-content-card">
                {/* ==================== USERS TAB ==================== */}
                {activeTab === 'users' ? (
                    <div className="users-section">
                        {/* Toolbar */}
                        <div className="users-toolbar">
                            <div className="toolbar-left">
                                <div className="search-input-wrap">
                                    <span className="search-icon">🔍</span>
                                    <input
                                        type="text"
                                        placeholder="Search by name, email..."
                                        value={userSearch}
                                        onChange={e => setUserSearch(e.target.value)}
                                        className="search-input"
                                    />
                                    {userSearch && (
                                        <button className="search-clear" onClick={() => setUserSearch('')}>×</button>
                                    )}
                                </div>
                                <select
                                    value={userRoleFilter}
                                    onChange={e => setUserRoleFilter(e.target.value)}
                                    className="toolbar-select"
                                >
                                    <option value="all">All Roles</option>
                                    <option value="admin">Admin</option>
                                    <option value="user">User</option>
                                </select>
                                <select
                                    value={userSort}
                                    onChange={e => setUserSort(e.target.value)}
                                    className="toolbar-select"
                                >
                                    <option value="newest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                    <option value="name">By Name</option>
                                    <option value="xp">By XP</option>
                                </select>
                            </div>
                            <div className="toolbar-right">
                                <span className="user-count-label">
                                    {filteredUsers.length} / {users.length} users
                                </span>
                                <button className="round-add-btn" onClick={() => setShowAddUserModal(true)} title="Add New User">
                                    +
                                </button>
                            </div>
                        </div>

                        <div className="data-table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>User Info</th>
                                        <th>Role</th>
                                        <th>Level</th>
                                        <th>XP</th>
                                        <th style={{ textAlign: 'center' }}>Verified</th>
                                        <th>Joined</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                                            <div className="loading-spinner"></div>
                                            <p>{loadingText || 'Loading...'}</p>
                                        </td></tr>
                                    ) : filteredUsers.length === 0 ? (
                                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                            {userSearch ? 'No users match your search' : 'No users found'}
                                        </td></tr>
                                    ) : filteredUsers.map(u => (
                                        <tr key={u._id}>
                                            <td>
                                                <div className="user-info-cell">
                                                    <div className="user-avatar" style={{ background: `hsl(${(u.username.length * 50) % 360}, 70%, 60%)` }}>
                                                        {u.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="user-details">
                                                        <span className="user-name">{u.fullName || u.username}</span>
                                                        <span className="user-email">{u.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                                                    {u.role === 'admin' ? '🛡️ Admin' : '👤 User'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`level-badge-pill ${u.currentLevel || 'beginner'}`} style={{ color: LEVEL_COLORS[u.currentLevel || 'beginner'] }}>
                                                    {u.currentLevel || 'Beginner'}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{ fontWeight: '600', color: '#6366f1' }}>{u.xp?.toLocaleString() || 0} XP</span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {u.isEmailVerified ? (
                                                    <span style={{ color: '#22c55e', fontSize: '1.2rem', fontWeight: 'bold' }} title="Verified">✓</span>
                                                ) : (
                                                    <span style={{ color: '#e2e8f0', fontSize: '1.5rem', lineHeight: '1' }} title="Not Verified">•</span>
                                                )}
                                            </td>
                                            <td style={{ color: '#64748b', fontSize: '0.9rem' }}>
                                                {new Date(u.createdAt).toLocaleDateString()}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div className="action-btns-group">
                                                    <button className="btn-icon-edit" onClick={() => handleEditClick(u)} title="Edit User">✏️</button>
                                                    {u.role !== 'admin' && (
                                                        <button className="btn-icon-delete" onClick={() => handleDeleteUser(u._id, u.username)} title="Delete User">🗑️</button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                ) : activeTab === 'config' ? (
                    /* ==================== CONFIG TAB ==================== */
                    <div className="config-section">
                        <div className="config-header">
                            <div>
                                <h3>🤖 Quản lý cấu hình model AI</h3>
                                <p className="config-subtitle">Cấu hình model AI cho từng tính năng trong ứng dụng</p>
                            </div>
                            {hasConfigChanges && (
                                <button className="save-config-btn" onClick={handleSaveConfig}>
                                    💾 Save Changes
                                </button>
                            )}
                        </div>

                        <div className="config-grid">
                            {[
                                { key: 'chatbot_model', label: '💬 Chatbot Tự Do', desc: 'Trò chuyện tự do (General Chat).', group: 'chat' },
                                { key: 'translation_model', label: '🔤 Dịch Câu (Helper)', desc: 'Hỗ trợ dịch câu Việt-Anh trong Chatbot.', group: 'chat' },
                                { key: 'translation_eval_model', label: '📝 Chấm Điểm Dịch', desc: 'Đánh giá bài tập dịch câu (Translation Practice).', group: 'eval' },
                                { key: 'roleplay_chat_model', label: '🎭 Roleplay (Chat)', desc: 'Phản hồi hội thoại đóng vai (Nhanh).', group: 'roleplay' },
                                { key: 'roleplay_report_model', label: '📊 Roleplay (Report)', desc: 'Tạo báo cáo nhận xét sau khi kết thúc (Thông minh).', group: 'roleplay' },
                                { key: 'upgrade_model', label: '✍️ Nâng Cấp Câu', desc: 'Viết lại câu chuẩn C1/C2.', group: 'writing' },
                                { key: 'vocabulary_model', label: '📚 Gợi Ý Từ Vựng', desc: 'Hỗ trợ gợi ý từ vựng và cấu trúc (Hints).', group: 'vocab' },
                                { key: 'grammar_model', label: '📝 Tạo Bài Tập Ngữ Pháp', desc: 'Sinh câu hỏi MCQ, điền từ, tìm lỗi.', group: 'grammar' },
                                { key: 'pronunciation_eval_model', label: '🗣️ Chấm Điểm Phát Âm', desc: 'Phân tích Text-to-Speech (Cần chính xác).', group: 'pron' },
                                { key: 'pronunciation_gen_model', label: '🔄 Tạo Câu Luyện Nói', desc: 'Sinh câu mẫu để luyện phát âm.', group: 'pron' }
                            ].map(item => {
                                const isChanged = config[item.key] !== originalConfig[item.key];
                                return (
                                    <div key={item.key} className={`config-card ${isChanged ? 'config-changed' : ''}`}>
                                        <div className="config-info">
                                            <h4>{item.label}</h4>
                                            <p>{item.desc}</p>
                                        </div>
                                        <select
                                            value={config[item.key] || ''}
                                            onChange={(e) => handleConfigChange(item.key, e.target.value)}
                                            className="model-select"
                                        >
                                            {availableModels.map(m => (
                                                <option key={m.value} value={m.value}>{m.label}</option>
                                            ))}
                                        </select>
                                        {isChanged && <div className="config-changed-dot" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                ) : activeTab === 'apikeys' ? (
                    /* ==================== API KEYS TAB ==================== */
                    <div className="apikeys-section">
                        <form className="add-key-form" onSubmit={handleAddKey}>
                            <input
                                type="text"
                                placeholder="Key Name (e.g. My Personal Key)"
                                value={newKeyName}
                                onChange={e => setNewKeyName(e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="Gemini API Key (AIza...)"
                                value={newKeyValue}
                                onChange={e => setNewKeyValue(e.target.value)}
                                required
                            />

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="button" className="test-btn-fancy" onClick={handleTestKey} disabled={testingKeyId === '__new__'}>
                                    {testingKeyId === '__new__' ? '⏳ Testing...' : '⚡ Test Connection'}
                                </button>
                                <button type="submit" className="add-key-btn">
                                    ➕ Add Key
                                </button>
                            </div>
                        </form>

                        <div className="bulk-actions-bar">
                            <div className="bulk-left" style={{ gap: '10px', display: 'flex' }}>
                                <button className="action-btn-styled test-all" onClick={handleTestAllKeys}>
                                    🧪 Test ALL Keys
                                </button>
                                <button className="action-btn-styled export" onClick={handleExportKeys} style={{ background: '#0ea5e9', color: 'white', border: 'none', padding: '0 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                                    📤 Export
                                </button>
                                <button className="action-btn-styled import" onClick={handleImportClick} style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '0 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                                    📥 Import
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    accept=".txt"
                                    onChange={handleFileChange}
                                />
                            </div>

                            {selectedKeys.size > 0 && (
                                <div className="bulk-right">
                                    <button className="action-btn-styled activate" onClick={handleBatchActivate}>
                                        ✅ Activate Selected ({selectedKeys.size})
                                    </button>
                                    <button className="action-btn-styled danger" onClick={handleBatchDelete}>
                                        🗑️ Delete Selected ({selectedKeys.size})
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="data-table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40px' }}>
                                            <input
                                                type="checkbox"
                                                checked={apiKeys.length > 0 && selectedKeys.size === apiKeys.length}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                        <th>Name</th>
                                        <th>Key (Masked)</th>
                                        <th>Status</th>
                                        <th style={{ textAlign: 'center' }}>Monitoring</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading && apiKeys.length === 0 ? (
                                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                                            <div className="loading-spinner"></div>
                                            <p>{loadingText || 'Loading...'}</p>
                                        </td></tr>
                                    ) : apiKeys.map(k => {
                                        const stat = keyStats.stats[k.fullKey] || { uses: 0, failures: 0, lastUsed: 0 };
                                        const cooldown = keyStats.cooldowns[k.fullKey] || 0;
                                        const isCooldown = Date.now() < cooldown;
                                        const cooldownLeft = isCooldown ? Math.ceil((cooldown - Date.now()) / 1000) : 0;

                                        return (
                                            <tr key={k._id} className={`${selectedKeys.has(k._id) ? 'row-selected' : ''} ${isCooldown ? 'row-cooldown' : ''}`}>
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedKeys.has(k._id)}
                                                        onChange={() => toggleSelection(k._id)}
                                                    />
                                                </td>
                                                <td>{k.name}</td>
                                                <td style={{ fontFamily: 'monospace' }}>
                                                    {k.keyMasked}
                                                    <button
                                                        onClick={() => copyToClipboard(k.fullKey)}
                                                        className="copy-btn"
                                                        title="Copy full key"
                                                    >
                                                        📋
                                                    </button>
                                                </td>
                                                <td>
                                                    <span className={`badge ${k.isActive ? 'badge-active' : 'badge-inactive'}`}>
                                                        {k.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center', minWidth: '180px' }}>
                                                    {isCooldown ? (
                                                        <div className="cooldown-container">
                                                            <div className="progress-bar-bg">
                                                                <div
                                                                    className="progress-bar-fill cooldown"
                                                                    style={{ width: `${(cooldownLeft / 60) * 100}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className="progress-text warning">⏳ Cooling down: {cooldownLeft}s</span>
                                                        </div>
                                                    ) : (
                                                        <div className="stats-container">
                                                            {stat.uses + stat.failures > 0 ? (
                                                                <>
                                                                    <div className="progress-bar-bg">
                                                                        <div
                                                                            className="progress-bar-fill success"
                                                                            style={{ width: `${(stat.uses / (stat.uses + stat.failures)) * 100}%` }}
                                                                        ></div>
                                                                    </div>
                                                                    <div className="stats-details">
                                                                        <span className="stat-success">✓ {stat.uses}</span>
                                                                        <span className="stat-rate">
                                                                            {Math.round((stat.uses / (stat.uses + stat.failures)) * 100)}%
                                                                        </span>
                                                                        <span className="stat-failure">✕ {stat.failures}</span>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <span className="text-muted" style={{ fontSize: '0.8rem' }}>No Data</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="action-btns-group">
                                                        <button
                                                            className={`action-btn ${k.isActive ? 'btn-deactivate' : 'btn-activate'}`}
                                                            onClick={() => handleActivateKey(k._id)}
                                                        >
                                                            {k.isActive ? 'Deactivate' : 'Activate'}
                                                        </button>
                                                        <button
                                                            className="action-btn btn-edit"
                                                            onClick={() => setEditKey(k)}
                                                            style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}
                                                            title="Edit Key"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            className="action-btn btn-test-key"
                                                            onClick={() => handleTestExistingKey(k.fullKey)}
                                                        >
                                                            ⚡ Test
                                                        </button>
                                                        <button
                                                            className="action-btn btn-delete"
                                                            onClick={() => handleDeleteKey(k._id)}
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* ==================== SERVER LOGS TAB ==================== */
                    <div className="logs-section">
                        {/* Log Stats Cards */}
                        <div className="log-stats-row">
                            <div className="log-stat-chip info"><span className="log-stat-dot"></span> Info: {logStats.info}</div>
                            <div className="log-stat-chip warn"><span className="log-stat-dot"></span> Warn: {logStats.warn}</div>
                            <div className="log-stat-chip error"><span className="log-stat-dot"></span> Error: {logStats.error}</div>
                            <div className="log-stat-chip debug"><span className="log-stat-dot"></span> Debug: {logStats.debug}</div>
                        </div>

                        {/* Log Toolbar */}
                        <div className="logs-toolbar">
                            <div className="toolbar-left">
                                <select
                                    value={logFilter.level}
                                    onChange={e => { setLogFilter(f => ({ ...f, level: e.target.value })); setLogPage(1); }}
                                    className="toolbar-select"
                                >
                                    <option value="all">All Levels</option>
                                    <option value="info">ℹ️ Info</option>
                                    <option value="warn">⚠️ Warning</option>
                                    <option value="error">❌ Error</option>
                                    <option value="debug">🔍 Debug</option>
                                </select>
                                <select
                                    value={logFilter.source}
                                    onChange={e => { setLogFilter(f => ({ ...f, source: e.target.value })); setLogPage(1); }}
                                    className="toolbar-select"
                                >
                                    <option value="all">All Sources</option>
                                    <option value="auth">🔐 Auth</option>
                                    <option value="api">🔗 API</option>
                                    <option value="system">⚙️ System</option>
                                    <option value="database">🗄️ Database</option>
                                    <option value="email">📧 Email</option>
                                    <option value="ai">🤖 AI</option>
                                    <option value="admin">🛡️ Admin</option>
                                </select>
                                <div className="search-input-wrap">
                                    <span className="search-icon">🔍</span>
                                    <input
                                        type="text"
                                        placeholder="Search logs..."
                                        value={logFilter.search}
                                        onChange={e => { setLogFilter(f => ({ ...f, search: e.target.value })); setLogPage(1); }}
                                        className="search-input"
                                    />
                                </div>
                            </div>
                            <div className="toolbar-right">
                                <span className="user-count-label">{logTotal} logs</span>
                                <button className="btn-clear-logs" onClick={handleClearLogs} title="Clear All Logs">
                                    🗑️ Clear
                                </button>
                            </div>
                        </div>

                        {/* Log Entries — Terminal Style */}
                        <div className="log-terminal">
                            <div className="log-terminal-header">
                                <span className="terminal-dot red"></span>
                                <span className="terminal-dot yellow"></span>
                                <span className="terminal-dot green"></span>
                                <span className="terminal-title">Server Logs</span>
                            </div>
                            <div className="log-terminal-body">
                                {loading ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                        <div className="loading-spinner"></div>
                                        <p>{loadingText || 'Loading...'}</p>
                                    </div>
                                ) : serverLogs.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                        📭 No logs found
                                    </div>
                                ) : serverLogs.map(log => (
                                    <div key={log._id} className={`log-entry log-level-${log.level}`}>
                                        <div className="log-entry-header">
                                            <span className={`log-badge log-badge-${log.level}`}>
                                                {log.level === 'info' ? 'ℹ️' : log.level === 'warn' ? '⚠️' : log.level === 'error' ? '❌' : '🔍'}
                                                {' '}{log.level.toUpperCase()}
                                            </span>
                                            <span className={`log-source-badge log-source-${log.source}`}>{log.source}</span>
                                            <span className="log-time">{new Date(log.createdAt).toLocaleString()}</span>
                                            {log.userId && (
                                                <span className="log-user">👤 {log.userId.username || log.userId.email || 'Unknown'}</span>
                                            )}
                                            {log.ip && <span className="log-ip">🌐 {log.ip}</span>}
                                        </div>
                                        <div className="log-message">{log.message}</div>
                                        {log.details && (
                                            <details className="log-details">
                                                <summary>Details</summary>
                                                <pre>{JSON.stringify(log.details, null, 2)}</pre>
                                            </details>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Pagination */}
                        {logTotalPages > 1 && (
                            <div className="log-pagination">
                                <button
                                    className="pagination-btn"
                                    disabled={logPage <= 1}
                                    onClick={() => setLogPage(p => Math.max(1, p - 1))}
                                >
                                    ← Prev
                                </button>
                                <span className="pagination-info">Page {logPage} / {logTotalPages}</span>
                                <button
                                    className="pagination-btn"
                                    disabled={logPage >= logTotalPages}
                                    onClick={() => setLogPage(p => Math.min(logTotalPages, p + 1))}
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Add User Modal */}
            <Modal
                isOpen={showAddUserModal}
                onClose={() => setShowAddUserModal(false)}
                title="👤 Create New User"
                footer={(
                    <>
                        <button type="button" className="cancel-btn" onClick={() => setShowAddUserModal(false)}>Cancel</button>
                        <button type="submit" form="addUserForm" className="start-btn" disabled={loading}>
                            {loading ? 'Confirm Create' : 'Create User'}
                        </button>
                    </>
                )}
            >
                <form id="addUserForm" onSubmit={handleCreateUser}>
                    <div className="form-group">
                        <label>Username *</label>
                        <input
                            type="text"
                            value={newUserData.username}
                            onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                            required
                            minLength={3}
                            placeholder="Enter unique username"
                        />
                    </div>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input
                            type="text"
                            value={newUserData.fullName}
                            onChange={(e) => setNewUserData({ ...newUserData, fullName: e.target.value })}
                            placeholder="Enter full name"
                        />
                    </div>
                    <div className="form-group">
                        <label>Email *</label>
                        <input
                            type="email"
                            value={newUserData.email}
                            onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                            required
                            placeholder="user@example.com"
                        />
                    </div>
                    <div className="form-group">
                        <label>Password *</label>
                        <input
                            type="password"
                            value={newUserData.password}
                            onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                            required
                            minLength={6}
                            placeholder="Min 6 characters"
                        />
                    </div>
                    <div className="form-group">
                        <label>Role</label>
                        <select
                            value={newUserData.role}
                            onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                        >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Level</label>
                        <select
                            value={newUserData.currentLevel}
                            onChange={(e) => setNewUserData({ ...newUserData, currentLevel: e.target.value })}
                        >
                            {['beginner', 'elementary', 'intermediate', 'upper-intermediate', 'advanced', 'expert', 'master', 'legend'].map(lvl => (
                                <option key={lvl} value={lvl}>{lvl}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>XP</label>
                        <input
                            type="number"
                            value={newUserData.xp}
                            onChange={(e) => setNewUserData({ ...newUserData, xp: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                    <div className="form-group checkbox-group">
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px' }}>
                            <input
                                type="checkbox"
                                checked={newUserData.isEmailVerified}
                                onChange={(e) => setNewUserData({ ...newUserData, isEmailVerified: e.target.checked })}
                                style={{ width: '20px', height: '20px' }}
                            />
                            <span>Verified Email Address</span>
                        </label>
                    </div>
                </form>
            </Modal>

            {/* Edit User Modal */}
            <Modal
                maxWidth="800px"
                isOpen={!!editUser}
                onClose={() => setEditUser(null)}
                title="✏️ Update User Profile"
                footer={(
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <button type="button" className="cancel-btn" onClick={() => setEditUser(null)}>Cancel</button>
                        <button
                            type="submit"
                            form="editUserForm"
                            className="start-btn"
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : '💾 Save Changes'}
                        </button>
                    </div>
                )}
            >
                {editUser && (
                    <form id="editUserForm" onSubmit={handleUpdateUser} className="edit-user-form-grid">
                        <div className="form-section">
                            <h5 className="section-title">👤 Personal Info</h5>
                            <div className="form-group">
                                <label>Username</label>
                                <input
                                    type="text"
                                    value={editUser.username}
                                    onChange={(e) => setEditUser({ ...editUser, username: e.target.value })}
                                    required
                                    minLength={3}
                                />
                            </div>
                            <div className="form-group">
                                <label>Full Name</label>
                                <input
                                    type="text"
                                    value={editUser.fullName}
                                    onChange={(e) => setEditUser({ ...editUser, fullName: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={editUser.email}
                                    onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-section">
                            <h5 className="section-title">⚙️ Stats & Settings</h5>

                            <div className="form-row-2">
                                <div className="form-group">
                                    <label>Role</label>
                                    <select
                                        value={editUser.role}
                                        onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                                    >
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Level</label>
                                    <select
                                        value={editUser.currentLevel || 'beginner'}
                                        onChange={(e) => setEditUser({ ...editUser, currentLevel: e.target.value })}
                                    >
                                        {['beginner', 'elementary', 'intermediate', 'upper-intermediate', 'advanced', 'expert', 'master', 'legend'].map(lvl => (
                                            <option key={lvl} value={lvl}>{lvl}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-row-2">
                                <div className="form-group">
                                    <label>XP</label>
                                    <input
                                        type="number"
                                        value={editUser.xp || 0}
                                        onChange={(e) => setEditUser({ ...editUser, xp: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Streak (Days)</label>
                                    <input
                                        type="number"
                                        value={editUser.streak || 0}
                                        onChange={(e) => setEditUser({ ...editUser, streak: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-group checkbox-group">
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px' }}>
                                    <input
                                        type="checkbox"
                                        checked={editUser.isEmailVerified || false}
                                        onChange={(e) => setEditUser({ ...editUser, isEmailVerified: e.target.checked })}
                                        style={{ width: '20px', height: '20px' }}
                                    />
                                    <span>Verified Email Address</span>
                                </label>
                            </div>

                            <div className="form-group">
                                <label>Change Password (Optional)</label>
                                <input
                                    type="password"
                                    value={editUser.password || ''}
                                    onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                                    minLength={6}
                                    placeholder="Enter to change password"
                                    style={{ borderColor: editUser.password ? '#f59e0b' : '#e2e8f0' }}
                                />
                            </div>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Edit Key Modal */}
            <Modal
                isOpen={!!editKey}
                onClose={() => setEditKey(null)}
                title="✏️ Edit API Key"
                footer={(
                    <>
                        <button type="button" className="cancel-btn" onClick={() => setEditKey(null)}>Cancel</button>
                        <button type="submit" form="editKeyForm" className="start-btn" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </>
                )}
            >
                {editKey && (
                    <form id="editKeyForm" onSubmit={handleUpdateKey}>
                        <div className="form-group">
                            <label>Name</label>
                            <input
                                type="text"
                                value={editKey.name}
                                onChange={(e) => setEditKey({ ...editKey, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Key Value</label>
                            <input
                                type="text"
                                value={editKey.fullKey}
                                onChange={(e) => setEditKey({ ...editKey, fullKey: e.target.value, key: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Model</label>
                            <input
                                type="text"
                                value={editKey.model || 'gemini-2.5-flash'}
                                onChange={(e) => setEditKey({ ...editKey, model: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Provider</label>
                            <select
                                value={editKey.provider || 'gemini'}
                                onChange={(e) => setEditKey({ ...editKey, provider: e.target.value })}
                            >
                                <option value="gemini">Gemini</option>
                                <option value="openai">OpenAI</option>
                            </select>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Global Confirm Modal */}
            <ConfirmModal
                isOpen={!!confirmConfig}
                onClose={() => setConfirmConfig(null)}
                onConfirm={confirmConfig?.onConfirm || (() => { })}
                title={confirmConfig?.title}
                message={confirmConfig?.message}
                variant={confirmConfig?.variant || 'danger'}
                confirmText={confirmConfig?.confirmText}
            />

        </div >
    );
}
