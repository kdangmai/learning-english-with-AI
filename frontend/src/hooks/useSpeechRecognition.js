import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext';

/**
 * Custom hook for speech recognition (Web Speech API)
 * @param {function} onTranscript - Callback when transcript is received
 * @param {string} lang - Language code (default 'en-US')
 * @returns {object} { isListening, toggleListening }
 */
export default function useSpeechRecognition(onTranscript, lang = 'en-US') {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);
    const { warning } = useToast();
    const onTranscriptRef = useRef(onTranscript);

    // Update ref if callback changes
    useEffect(() => {
        onTranscriptRef.current = onTranscript;
    }, [onTranscript]);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false; // Stop after one sentence usually
            recognition.interimResults = false;
            recognition.lang = lang;

            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);

            recognition.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
            };

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                if (onTranscriptRef.current) {
                    onTranscriptRef.current(transcript);
                }
            };

            recognitionRef.current = recognition;

            return () => {
                if (recognitionRef.current) {
                    recognitionRef.current.abort(); // Cleanup
                }
            };
        }
    }, [lang]); // Only recreate if language changes

    const toggleListening = useCallback(() => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.start();
                } catch (e) {
                    // Sometimes start() throws if already started
                    console.error(e);
                }
            } else {
                warning("Trình duyệt của bạn không hỗ trợ nhận dạng giọng nói.");
            }
        }
    }, [isListening, warning]);

    return { isListening, toggleListening };
}
