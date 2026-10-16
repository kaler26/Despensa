import { useCallback, useEffect, useRef, useState } from 'react';

// Declaración de tipos para Web Speech API
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export const useSpeechRecognition = (): UseSpeechRecognitionReturn => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const finalTranscriptRef = useRef<string>('');
  const recognitionRef = useRef<any>(null);
  const win = typeof window !== 'undefined' ? (window as unknown as IWindow) : null;
  const SpeechRecognitionAPI = win?.SpeechRecognition || win?.webkitSpeechRecognition;
  const isSupported = Boolean(SpeechRecognitionAPI);

  useEffect(() => {
    if (!SpeechRecognitionAPI) return;

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-ES';

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';

        // Iterar únicamente desde event.resultIndex para evitar procesar fragmentos previos
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          const text = item[0]?.transcript || '';

          if (item.isFinal) {
            const cleanText = text.trim();
            if (cleanText) {
              finalTranscriptRef.current += (finalTranscriptRef.current ? ' ' : '') + cleanText;
            }
          } else {
            interimTranscript += text;
          }
        }

        const liveText = interimTranscript.trim();
        const fullText = (
          finalTranscriptRef.current +
          (liveText ? (finalTranscriptRef.current ? ' ' : '') + liveText : '')
        ).trim();

        setTranscript(fullText);
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          // No se detectó voz en un tiempo; no es un error crítico
          return;
        }
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setError('Permiso de micrófono denegado. Permite el acceso al micrófono en el navegador.');
        } else {
          setError(`Error de reconocimiento de voz (${event.error})`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch {
      // Ignorar fallo de inicialización
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignorar
        }
      }
    };
  }, [SpeechRecognitionAPI]);

  const startListening = useCallback(() => {
    setError(null);
    finalTranscriptRef.current = '';
    setTranscript('');
    if (!recognitionRef.current) {
      if (!isSupported) {
        setError('El reconocimiento de voz no está soportado en este navegador.');
      }
      return;
    }
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      // Si ya estaba iniciado
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
      setIsListening(false);
    } catch {
      // Ignorar
    }
  }, []);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
    setError(null);
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
};
