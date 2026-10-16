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

  const recognitionRef = useRef<any>(null);
  const win = typeof window !== 'undefined' ? (window as unknown as IWindow) : null;
  const SpeechRecognitionAPI = win?.SpeechRecognition || win?.webkitSpeechRecognition;
  const isSupported = Boolean(SpeechRecognitionAPI);

  useEffect(() => {
    if (!SpeechRecognitionAPI) return;

    try {
      const recognition = new SpeechRecognitionAPI();
      // continuous = false es fundamental para evitar el bug de duplicación/repetición en Chrome Android
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'es-ES';

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let resultText = '';
        for (let i = 0; i < event.results.length; i++) {
          resultText += event.results[i][0].transcript;
        }
        setTranscript(resultText.trim());
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
          recognitionRef.current.abort();
        } catch {
          // Ignorar
        }
      }
    };
  }, [SpeechRecognitionAPI]);

  const startListening = useCallback(() => {
    setError(null);
    setTranscript('');
    if (!recognitionRef.current) {
      if (!isSupported) {
        setError('El reconocimiento de voz no está soportado en este navegador.');
      }
      return;
    }
    try {
      recognitionRef.current.abort();
    } catch {
      // Ignorar si no estaba activo
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
