import React, { useState, useEffect } from 'react';
import './Toast.css';

/**
 * Toast Component for Notifications
 * @param {string} message - Notification text
 * @param {string} type - 'success', 'error', 'info', 'warning'
 * @param {function} onClose - function to dismiss
 * @param {number} duration - auto dismiss duration in ms (default 3000)
 */
export default function Toast({ message, type = 'info', onClose, duration = 3000 }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
        if (duration) {
            const timer = setTimeout(() => {
                handleClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            if (onClose) onClose();
        }, 300); // wait for animation
    };

    if (!message) return null;

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    return (
        <div className={`toast-notification ${type} ${isVisible ? 'show' : 'hide'}`}>
            <span className="toast-icon">{icons[type] || 'ℹ️'}</span>
            <span className="toast-message">{message}</span>
            <button className="toast-close" onClick={handleClose}>&times;</button>
        </div>
    );
}

/**
 * Toast Container to stack multiple toasts (Simple version)
 */
export const ToastContainer = ({ toasts, removeToast }) => {
    return (
        <div className="toast-container-wrapper">
            {toasts.map(t => (
                <Toast
                    key={t.id}
                    {...t}
                    onClose={() => removeToast(t.id)}
                />
            ))}
        </div>
    );
};
