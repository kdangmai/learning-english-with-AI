import React from 'react';
import './Modal.css';

/**
 * Reusable Confirm Dialog — replaces native window.confirm()
 */
export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'Xác nhận',
    message = 'Bạn có chắc chắn muốn thực hiện hành động này?',
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    variant = 'danger'
}) {
    if (!isOpen) return null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    const variantConfig = {
        danger: {
            color: '#ef4444',
            bg: 'linear-gradient(135deg, #ef4444, #dc2626)',
            lightBg: '#fef2f2',
            icon: '⚠️',
            headerBg: 'linear-gradient(120deg, #ef4444 0%, #f97316 100%)'
        },
        warning: {
            color: '#f59e0b',
            bg: 'linear-gradient(135deg, #f59e0b, #d97706)',
            lightBg: '#fffbeb',
            icon: '❓',
            headerBg: 'linear-gradient(120deg, #f59e0b 0%, #eab308 100%)'
        },
        info: {
            color: '#6366f1',
            bg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            lightBg: '#eef2ff',
            icon: 'ℹ️',
            headerBg: 'linear-gradient(120deg, #6366f1 0%, #8b5cf6 100%)'
        }
    };

    const config = variantConfig[variant] || variantConfig.danger;

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-container" style={{ maxWidth: '420px' }}>
                <div className="modal-header" style={{ background: config.headerBg }}>
                    <h2>{config.icon} {title}</h2>
                    <button className="modal-close-btn" onClick={onClose} aria-label="Close">
                        &times;
                    </button>
                </div>
                <div className="modal-body">
                    <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '14px',
                        padding: '8px 0'
                    }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: config.lightBg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.2rem',
                            flexShrink: 0
                        }}>
                            {config.icon}
                        </div>
                        <p style={{
                            fontSize: '0.92rem',
                            color: '#475569',
                            lineHeight: 1.6,
                            margin: 0,
                            flex: 1
                        }}>
                            {message}
                        </p>
                    </div>
                </div>
                <div className="modal-footer">
                    <button
                        className="confirm-cancel-btn"
                        onClick={onClose}
                        style={{
                            padding: '10px 22px',
                            borderRadius: '10px',
                            border: '1.5px solid #e2e8f0',
                            background: '#fff',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.88rem',
                            color: '#64748b',
                            transition: 'all 0.2s'
                        }}
                    >
                        {cancelText}
                    </button>
                    <button
                        className="confirm-action-btn"
                        onClick={() => { onConfirm(); onClose(); }}
                        style={{
                            padding: '10px 22px',
                            borderRadius: '10px',
                            border: 'none',
                            background: config.bg,
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.88rem',
                            boxShadow: `0 4px 12px ${config.color}40`,
                            transition: 'all 0.2s'
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
