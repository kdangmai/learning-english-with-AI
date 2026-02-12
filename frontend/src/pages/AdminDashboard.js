import React, { useState, useEffect } from 'react';
import { useUserStore } from '../store/store';
import Modal from '../components/common/Modal';
import ConfirmModal from '../components/common/ConfirmModal';
import { useToast } from '../context/ToastContext';
import './AdminDashboard.css';

export default function AdminDashboard() {
    const { user } = useUserStore();
    const { success, error, info } = useToast();
    const [activeTab, setActiveTab] = useState('users'); // 'users' | 'apikeys' | 'config'
    const [loading, setLoading] = useState(false);

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
        fullName: ''
    });

    // Edit User State
    const [editUser, setEditUser] = useState(null); // null when closed, object when open

    // Form State
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyValue, setNewKeyValue] = useState('');
    const [config, setConfig] = useState({});
    const [originalConfig, setOriginalConfig] = useState({});

    // Models are now loaded from the backend
    // Models are now loaded from the backend
    const [availableModels, setAvailableModels] = useState([]);

    // Monitoring State
    const [keyStats, setKeyStats] = useState({ stats: {}, cooldowns: {} });

    useEffect(() => {
        let interval;
        if (activeTab === 'users') {
            fetchUsers();
        } else if (activeTab === 'apikeys') {
            fetchApiKeys();
            fetchKeyStats(); // Initial fetch
            interval = setInterval(fetchKeyStats, 5000); // Poll every 5s
        } else if (activeTab === 'config') {
            fetchConfig();
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeTab]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/users', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            if (data.success) {
                setUsers(data.users);
            }
        } catch (error) {
            console.error('Fetch users error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchKeyStats = async () => {
        try {
            const response = await fetch('/api/admin/api-keys/stats', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            if (data.success) {
                setKeyStats({
                    stats: data.stats || {},
                    cooldowns: data.cooldowns || {}
                });
            }
        } catch (error) {
            console.error('Fetch stats error:', error);
        }
    };

    const fetchApiKeys = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/api-keys', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            if (data.success) {
                // Merge masked keys with full keys for copy functionality
                // We rely on index matching or ID matching
                const mergedKeys = data.keys.map(maskedKey => {
                    const fullKeyObj = data.fullKeys.find(fk => fk._id === maskedKey._id);
                    return { ...maskedKey, fullKey: fullKeyObj ? fullKeyObj.key : '' };
                });
                setApiKeys(mergedKeys);
                setSelectedKeys(new Set()); // Reset selection on refresh
            }
        } catch (error) {
            console.error('Fetch keys error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/config', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            if (data.success) {
                setConfig(data.config);
                setOriginalConfig(data.config);
                setAvailableModels(data.models || []);
            }
        } catch (error) {
            console.error('Fetch config error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConfigChange = (key, value) => {
        // Only update local state
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveConfig = async () => {
        // Find changed keys
        const changedKeys = Object.keys(config).filter(key => config[key] !== originalConfig[key]);

        if (changedKeys.length === 0) return;

        try {
            // Update each changed setting
            for (const key of changedKeys) {
                await fetch('/api/admin/config', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ key, value: config[key] })
                });
            }

            setOriginalConfig({ ...config }); // Sync original with current
            success('Changes saved successfully!');

        } catch (error) {
            console.error('Save config error:', error);
            error('Failed to save settings.');
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(newUserData)
            });
            const data = await response.json();

            if (data.success) {
                success(`User ${data.user.username} created successfully!`);
                setShowAddUserModal(false);
                setNewUserData({ username: '', email: '', password: '', role: 'user', fullName: '' });
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
            password: '' // Reset password field for security/optionality
        });
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/users/${editUser._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(editUser)
            });
            const data = await response.json();

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

    const handleTestAllKeys = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/api-keys/test-all', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
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
        // if (!window.confirm(`Are you sure you want to activate ${selectedKeys.size} keys?`)) return; 
        // Activation is non-destructive, maybe no confirm needed? Let's verify with popup result.

        try {
            const response = await fetch('/api/admin/api-keys/activate-batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ ids: Array.from(selectedKeys) })
            });
            const data = await response.json();
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
                    const response = await fetch('/api/admin/api-keys/delete-batch', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({ ids: Array.from(selectedKeys) })
                    });
                    const data = await response.json();
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
            const response = await fetch('/api/admin/api-keys', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ name: newKeyName, key: newKeyValue })
            });
            const data = await response.json();
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

    const handleTestKey = async () => {
        if (!newKeyValue) return error("Please enter an API Key to test.");
        await performKeyTest(newKeyValue, 'test-btn');
    };

    const handleTestExistingKey = async (key) => {
        if (!key) return error("Key not available for testing.");
        await performKeyTest(key);
    };

    const performKeyTest = async (key, btnId = null) => {
        let originalText = '';
        if (btnId) {
            originalText = document.getElementById(btnId).innerText;
            document.getElementById(btnId).innerText = "Testing...";
            document.getElementById(btnId).disabled = true;
        }

        try {
            const response = await fetch('/api/admin/api-keys/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ key: key })
            });
            const data = await response.json();

            if (data.success) {
                success(`✅ ${data.message}`);
            } else {
                error(`❌ Error: ${data.message}`);
                // Refresh list if key was auto-deactivated
                if (data.keyDeactivated) {
                    fetchApiKeys();
                }
            }
        } catch (error) {
            console.error("Test error", error);
            error("System error during test.");
        } finally {
            if (btnId) {
                document.getElementById(btnId).innerText = originalText;
                document.getElementById(btnId).disabled = false;
            }
        }
    };

    const handleActivateKey = async (id) => {
        try {
            const response = await fetch(`/api/admin/api-keys/${id}/toggle`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            if (data.success) {
                fetchApiKeys(); // Refresh to show active status update
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
                    const response = await fetch(`/api/admin/api-keys/${id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });
                    const data = await response.json();
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

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            success('API Key copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy: ', err);
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

    return (
        <div className="admin-dashboard">
            <div className="admin-header">
                <h1>Admin Dashboard</h1>
            </div>

            <div className="admin-tabs">
                <button
                    className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    Manage Users
                </button>
                <button
                    className={`admin-tab-btn ${activeTab === 'config' ? 'active' : ''}`}
                    onClick={() => setActiveTab('config')}
                >
                    AI Model Config
                </button>
                <button
                    className={`admin-tab-btn ${activeTab === 'apikeys' ? 'active' : ''}`}
                    onClick={() => setActiveTab('apikeys')}
                >
                    API Keys
                </button>
            </div>

            <div className="admin-content-card">
                {activeTab === 'users' ? (
                    <div className="users-section">
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
                            <button className="round-add-btn" onClick={() => setShowAddUserModal(true)} title="Add New User">
                                +
                            </button>
                        </div>
                        <div className="data-table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Level</th>
                                        <th>Joined</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="5" style={{ textAlign: 'center' }}>Loading...</td></tr>
                                    ) : users.map(u => (
                                        <tr key={u._id}>
                                            <td>
                                                <div style={{ fontWeight: '600' }}>{u.username}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{u.fullName || 'No Name'}</div>
                                            </td>
                                            <td>{u.email}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <button
                                                        className="action-btn"
                                                        onClick={() => handleEditClick(u)}
                                                        style={{ background: '#fef3c7', color: '#d97706', borderColor: '#fde68a' }}
                                                        title="Edit User"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                                                        {u.role}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>{u.currentLevel}</td>
                                            <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : activeTab === 'config' ? (
                    <div className="config-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                                <h3>Quản lý cấu hình model AI</h3>
                            </div>
                            {JSON.stringify(config) !== JSON.stringify(originalConfig) && (
                                <button className="add-key-btn" onClick={handleSaveConfig}>
                                    Save
                                </button>
                            )}
                        </div>

                        <div className="config-grid">
                            {[
                                { key: 'chatbot_model', label: '💬 Chatbot Tự Do', desc: 'Trò chuyện tự do (General Chat).' },

                                { key: 'translation_model', label: '🔤 Dịch Câu (Helper)', desc: 'Hỗ trợ dịch câu Việt-Anh trong Chatbot.' },
                                { key: 'translation_eval_model', label: '📝 Chấm Điểm Dịch', desc: 'Đánh giá bài tập dịch câu (Translation Practice).' },

                                { key: 'roleplay_chat_model', label: '🎭 Roleplay (Chat)', desc: 'Phản hồi hội thoại đóng vai (Nhanh).' },
                                { key: 'roleplay_report_model', label: '📊 Roleplay (Report)', desc: 'Tạo báo cáo nhận xét sau khi kết thúc (Thông minh).' },

                                { key: 'upgrade_model', label: '✍️ Nâng Cấp Câu', desc: 'Viết lại câu chuẩn C1/C2.' },
                                { key: 'vocabulary_model', label: '📚 Gợi Ý Từ Vựng', desc: 'Hỗ trợ gợi ý từ vựng và cấu trúc (Hints).' },

                                { key: 'grammar_model', label: '📝 Tạo Bài Tập Ngữ Pháp', desc: 'Sinh câu hỏi MCQ, điền từ, tìm lỗi.' },

                                { key: 'pronunciation_eval_model', label: '🗣️ Chấm Điểm Phát Âm', desc: 'Phân tích Text-to-Speech (Cần chính xác).' },
                                { key: 'pronunciation_gen_model', label: '🔄 Tạo Câu Luyện Nói', desc: 'Sinh câu mẫu để luyện phát âm.' }
                            ].map(item => (
                                <div key={item.key} className="config-card">
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
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
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
                                <button type="button" id="test-btn" className="test-btn-fancy" onClick={handleTestKey}>
                                    ⚡ Test Connection
                                </button>
                                <button type="submit" className="add-key-btn">
                                    ➕ Add Key
                                </button>
                            </div>
                        </form>

                        <div className="bulk-actions-bar" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    className="test-all-btn"
                                    onClick={handleTestAllKeys}
                                    style={{
                                        background: '#2563eb', color: 'white', border: 'none',
                                        padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600'
                                    }}
                                >
                                    🧪 Test ALL Keys
                                </button>
                            </div>

                            {selectedKeys.size > 0 && (
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        className="activate-batch-btn"
                                        onClick={handleBatchActivate}
                                        style={{
                                            background: '#16a34a', color: 'white', border: 'none',
                                            padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600'
                                        }}
                                    >
                                        ✅ Activate Selected ({selectedKeys.size})
                                    </button>
                                    <button
                                        className="delete-batch-btn"
                                        onClick={handleBatchDelete}
                                        style={{
                                            background: '#dc2626', color: 'white', border: 'none',
                                            padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600'
                                        }}
                                    >
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
                                        <tr><td colSpan="6" style={{ textAlign: 'center' }}>Loading...</td></tr>
                                    ) : apiKeys.map(k => {
                                        // Match stats
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
                                                        style={{ marginLeft: '10px', cursor: 'pointer', background: 'none', border: 'none', fontSize: '1.2em' }}
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
                                                    <button
                                                        className={`action-btn ${k.isActive ? 'btn-deactivate' : 'btn-activate'}`}
                                                        onClick={() => handleActivateKey(k._id)}
                                                        style={{
                                                            background: k.isActive ? '#fee2e2' : '#f0fdf4',
                                                            color: k.isActive ? '#ef4444' : '#15803d',
                                                            borderColor: k.isActive ? '#fecaca' : '#bbf7d0',
                                                            marginRight: '8px'
                                                        }}
                                                    >
                                                        {k.isActive ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                    <button
                                                        className="action-btn btn-test-key"
                                                        onClick={() => handleTestExistingKey(k.fullKey)}
                                                        style={{
                                                            background: '#e0f2fe',
                                                            color: '#0284c7',
                                                            borderColor: '#7dd3fc',
                                                            marginRight: '8px'
                                                        }}
                                                    >
                                                        ⚡ Test
                                                    </button>
                                                    <button
                                                        className="action-btn btn-delete"
                                                        onClick={() => handleDeleteKey(k._id)}
                                                    >
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
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
                </form>
            </Modal>

            {/* Edit User Modal */}
            <Modal
                isOpen={!!editUser}
                onClose={() => setEditUser(null)}
                title="✏️ Edit User"
                footer={(
                    <>
                        <button type="button" className="cancel-btn" onClick={() => setEditUser(null)}>Cancel</button>
                        <button
                            type="submit"
                            form="editUserForm"
                            className="start-btn"
                            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </>
                )}
            >
                {editUser && (
                    <form id="editUserForm" onSubmit={handleUpdateUser}>
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
                        <div className="form-group">
                            <label>New Password (Optional)</label>
                            <input
                                type="password"
                                value={editUser.password}
                                onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                                minLength={6}
                                placeholder="Leave blank to keep current"
                            />
                        </div>
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
