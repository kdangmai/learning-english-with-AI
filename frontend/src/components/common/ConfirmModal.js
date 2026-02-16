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
            lightBg: 'rgba(239, 68, 68, 0.12)',
            icon: '⚠️',
            headerBg: 'linear-gradient(120deg, rgba(239, 68, 68, 0.3) 0%, rgba(249, 115, 22, 0.3) 100%)'
        },
        warning: {
            color: '#f59e0b',
            bg: 'linear-gradient(135deg, #f59e0b, #d97706)',
            lightBg: 'rgba(245, 158, 11, 0.12)',
            icon: '❓',
            headerBg: 'linear-gradient(120deg, rgba(245, 158, 11, 0.3) 0%, rgba(234, 179, 8, 0.3) 100%)'
        },
        info: {
            color: '#6366f1',
            bg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            lightBg: 'rgba(99, 102, 241, 0.12)',
            icon: 'ℹ️',
            headerBg: 'linear-gradient(120deg, rgba(99, 102, 241, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)'
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
                            color: 'var(--text-secondary, #94a3b8)',
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
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            background: 'rgba(255, 255, 255, 0.06)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.88rem',
                            color: 'var(--text-secondary, #94a3b8)',
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
