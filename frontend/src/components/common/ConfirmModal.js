import React from 'react';
import './Modal.css';

/**
 * Reusable Confirm Dialog — replaces native window.confirm()
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Called when user cancels
 * @param {function} onConfirm - Called when user confirms
 * @param {string} title - Dialog title
 * @param {string} message - Confirmation message
 * @param {string} confirmText - Text for confirm button (default "Xác nhận")
 * @param {string} cancelText - Text for cancel button (default "Hủy")
 * @param {string} variant - 'danger' | 'warning' | 'info' (default 'danger')
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

    const variantColors = {
        danger: '#ef4444',
        warning: '#f59e0b',
        info: '#6366f1'
    };

    const variantIcons = {
        danger: '⚠️',
        warning: '❓',
        info: 'ℹ️'
    };

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-container" style={{ maxWidth: '420px' }}>
                <div className="modal-header">
                    <h2>{variantIcons[variant]} {title}</h2>
                    <button className="modal-close-btn" onClick={onClose} aria-label="Close">
                        &times;
                    </button>
                </div>
                <div className="modal-body">
                    <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                        {message}
                    </p>
                </div>
                <div className="modal-footer">
                    <button
                        className="cancel-btn"
                        onClick={onClose}
                        style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600 }}
                    >
                        {cancelText}
                    </button>
                    <button
                        className="confirm-action-btn"
                        onClick={() => { onConfirm(); onClose(); }}
                        style={{
                            padding: '8px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            background: variantColors[variant] || variantColors.danger,
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: 600
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
