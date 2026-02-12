import { useState, useRef, useCallback } from 'react';
import { useToast } from '../context/ToastContext';

export default function useAudioRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const { error: showError } = useToast();

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Prefer webm, fallback to mp4 or default
            let mimeType = 'audio/webm';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/mp4';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = ''; // Default
                }
            }

            const options = mimeType ? { mimeType } : undefined;
            const mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            return true;
        } catch (error) {
            console.error("Error accessing microphone:", error);
            showError("Could not access microphone. Please check permissions.");
            return false;
        }
    }, [showError]);

    const stopRecording = useCallback(() => {
        return new Promise((resolve, reject) => {
            const mediaRecorder = mediaRecorderRef.current;
            if (!mediaRecorder || mediaRecorder.state === 'inactive') {
                resolve(null);
                return;
            }

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });

                // Stop all tracks
                mediaRecorder.stream.getTracks().forEach(track => track.stop());

                // Convert to Base64
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => {
                    const base64data = reader.result;
                    resolve({
                        blob,
                        base64: base64data, // Includes data:audio/webm;base64,... prefix
                        mimeType: mediaRecorder.mimeType
                    });
                };
                reader.onerror = reject;

                setIsRecording(false);
                mediaRecorderRef.current = null;
                chunksRef.current = [];
            };

            mediaRecorder.stop();
        });
    }, []);

    return {
        isRecording,
        startRecording,
        stopRecording
    };
}
