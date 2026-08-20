import { useCallback, useEffect, useRef, useState } from 'react';

export interface VoiceRecordingResult {
  /** Base64-encoded audio data, ready to send to the API. */
  audioData: string | null;
  /** MIME type of the captured audio (e.g. "audio/webm;codecs=opus"). */
  audioMimeType: string | null;
  /** Final transcript produced by local speech-to-text (may be empty if unsupported). */
  transcript: string;
}

interface SpeechRecognitionEventResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: { readonly transcript: string };
}

interface SpeechRecognitionEvent {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionEventResult[];
}

interface SpeechRecognitionErrorEvent {
  readonly error?: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function blobToBase64(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

/**
 * Records microphone audio (via MediaRecorder) while simultaneously transcribing
 * speech to text using the browser's local SpeechRecognition API (Web Speech API).
 * Speech recognition runs entirely in the browser — no audio is sent to a cloud
 * transcription service. If speech recognition is unsupported, audio-only capture
 * still works and the user can type the text manually.
 */
export function useVoiceRecorder() {
  const speechSupported = getSpeechRecognitionCtor() !== null;

  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [micError, setMicError] = useState<string | null>(null);
  const [result, setResult] = useState<VoiceRecordingResult>({
    audioData: null,
    audioMimeType: null,
    transcript: '',
  });

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const finalTranscriptRef = useRef('');

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    recorderRef.current = null;

    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {
        // already stopped
      }
    }
    recognitionRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    setRecording(false);
    setInterimText('');
  }, []);

  const reset = useCallback(() => {
    setResult({ audioData: null, audioMimeType: null, transcript: '' });
    setTranscript('');
    setInterimText('');
    setMicError(null);
  }, []);

  const start = useCallback(async () => {
    setMicError(null);
    setTranscript('');
    setInterimText('');
    finalTranscriptRef.current = '';
    chunksRef.current = [];
    setResult({ audioData: null, audioMimeType: null, transcript: '' });

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicError('Microphone access was denied or is unavailable.');
      return;
    }
    streamRef.current = stream;

    // Audio capture via MediaRecorder.
    try {
      const mimeType =
        ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(
          (type) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type),
        ) ?? '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        const audioData = await blobToBase64(blob);
        setResult({
          audioData,
          audioMimeType: blob.type || null,
          transcript: finalTranscriptRef.current.trim(),
        });
      };
      recorder.start();
      recorderRef.current = recorder;
    } catch {
      setMicError('Audio recording is not supported in this browser.');
    }

    // Local speech-to-text.
    const Ctor = getSpeechRecognitionCtor();
    if (Ctor) {
      try {
        const recognition = new Ctor();
        recognition.lang = 'en-US';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event) => {
          let final = '';
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const item = event.results[i];
            if (item.isFinal) final += item[0].transcript;
            else interim += item[0].transcript;
          }
          if (final) finalTranscriptRef.current = `${finalTranscriptRef.current} ${final}`.trim();
          setTranscript(finalTranscriptRef.current);
          setInterimText(interim);
        };
        recognition.onerror = (event) => {
          if (event.error && event.error !== 'aborted' && event.error !== 'no-speech') {
            setMicError(`Speech recognition error: ${event.error}`);
          }
        };
        recognition.onend = () => {
          // Continuous recognition can end on its own; nothing to do here.
        };
        recognition.start();
        recognitionRef.current = recognition;
      } catch {
        // Speech recognition unavailable — audio-only recording still works.
      }
    }

    setRecording(true);
  }, []);

  useEffect(() => stop, [stop]);

  return {
    recording,
    transcript,
    interimText,
    micError,
    result,
    speechSupported,
    start,
    stop,
    reset,
  };
}
