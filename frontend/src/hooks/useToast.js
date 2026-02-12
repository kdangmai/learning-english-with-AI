import { useState, useCallback, useRef } from 'react';

let idCounter = 0;

/**
 * Reusable Toast Hook
 * Usage:
 *   const { toasts, addToast, removeToast, success, error, warning, info } = useToast();
 *   success('Saved!');
 *   error('Something failed');
 */
export default function useToast() {
    const [toasts, setToasts] = useState([]);
    const toastsRef = useRef([]);

    const removeToast = useCallback((id) => {
        toastsRef.current = toastsRef.current.filter(t => t.id !== id);
        setToasts([...toastsRef.current]);
    }, []);

    const addToast = useCallback((message, type = 'info', duration = 3500) => {
        const id = ++idCounter;
        const toast = { id, message, type, duration };
        toastsRef.current = [...toastsRef.current, toast];
        setToasts([...toastsRef.current]);

        if (duration) {
            setTimeout(() => removeToast(id), duration);
        }
        return id;
    }, [removeToast]);

    const success = useCallback((msg, dur) => addToast(msg, 'success', dur), [addToast]);
    const error = useCallback((msg, dur) => addToast(msg, 'error', dur), [addToast]);
    const warning = useCallback((msg, dur) => addToast(msg, 'warning', dur), [addToast]);
    const info = useCallback((msg, dur) => addToast(msg, 'info', dur), [addToast]);

    return { toasts, addToast, removeToast, success, error, warning, info };
}
