import { useState, useEffect, useCallback } from 'react';

interface SpeechRecognitionResult {
  transcript: string;
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
}

interface UseSpeechRecognitionReturn extends SpeechRecognitionResult {
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<any>(null);

  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (!isSupported) {
      setError('お使いのブラウザは音声認識に対応していません');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();

    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'ja-JP';

    recognitionInstance.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognitionInstance.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPart;
        } else {
          interimTranscript += transcriptPart;
        }
      }

      if (finalTranscript) {
        setTranscript(finalTranscript);
      } else if (interimTranscript) {
        setTranscript(interimTranscript);
      }
    };

    recognitionInstance.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === 'no-speech') {
        setError('音声が検出されませんでした');
      } else if (event.error === 'audio-capture') {
        setError('マイクが見つかりません');
      } else if (event.error === 'not-allowed') {
        setError('マイクへのアクセスが拒否されました');
      } else {
        setError('音声認識エラーが発生しました');
      }
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
    };

    setRecognition(recognitionInstance);

    return () => {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
    };
  }, [isSupported]);

  const startListening = useCallback(() => {
    if (recognition && !isListening) {
      setTranscript('');
      setError(null);
      try {
        recognition.start();
      } catch (error) {
        console.error('Failed to start recognition:', error);
        setError('音声認識を開始できませんでした');
      }
    }
  }, [recognition, isListening]);

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      recognition.stop();
    }
  }, [recognition, isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  return {
    transcript,
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}

