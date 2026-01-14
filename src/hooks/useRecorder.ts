/**
 * useRecorder Hook
 *
 * Manages audio recording with MediaRecorder API.
 * Implements closure pattern to capture vault secret at recording start,
 * ensuring encryption can complete even if session locks mid-recording.
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useVault } from '@/context/VaultContext';
import { useAuth } from '@/context/AuthContext';
import { deriveVaultKey, encryptData } from '@/lib/crypto';
import { getBrowserSalt, saveEncryptedNoteForUser } from '@/lib/storage';
import { SESSION_CONFIG } from '@/lib/constants';

export type RecordingStatus = 'idle' | 'recording' | 'processing' | 'complete' | 'error';

export function useRecorder() {
  const { user } = useAuth();
  const { getVaultSecretForRecording, setRecordingInProgress } = useVault();

  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Captured at recording start — survives screen lock
  const capturedSecretRef = useRef<string | null>(null);
  const capturedUidRef = useRef<string | null>(null);
  const capturedSessionIdRef = useRef<string | null>(null);
  const capturedDurationRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    try {
      // Capture vault secret and uid BEFORE starting
      // These are held in closure even if screen locks mid-recording
      const secret = getVaultSecretForRecording();
      if (!secret || !user) {
        throw new Error('Vault not unlocked');
      }
      capturedSecretRef.current = secret;
      capturedUidRef.current = user.uid;

      // Create recording session (verifies auth, lasts 90min)
      const idToken = await user.getIdToken();
      const sessionResponse = await fetch('/api/recording-session/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!sessionResponse.ok) {
        throw new Error('Failed to create recording session');
      }

      const { sessionId } = await sessionResponse.json();
      capturedSessionIdRef.current = sessionId;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Use captured values — not current state
        const secret = capturedSecretRef.current;
        const uid = capturedUidRef.current;
        const sessionId = capturedSessionIdRef.current;
        const recordedDuration = capturedDurationRef.current;

        if (!secret || !uid || !sessionId) {
          setError('Session expired during recording');
          setStatus('error');
          return;
        }

        try {
          setStatus('processing');

          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

          // Call API to transcribe and generate SOAP note
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          formData.append('sessionId', sessionId);

          const response = await fetch('/api/scribe', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Transcription failed');
          }

          const { transcript, soapNote } = await response.json();

          // Get browser_salt for Layer 2 encryption
          const browserSalt = await getBrowserSalt(uid);

          // Encrypt using captured secret + browser_salt
          const key = await deriveVaultKey(secret, browserSalt);
          const noteData = JSON.stringify({
            transcript,
            soapNote,
            duration: recordedDuration,
            createdAt: Date.now(),
          });
          const encrypted = await encryptData(key, noteData);

          // Save encrypted note with user-specific key
          await saveEncryptedNoteForUser({
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            iv: encrypted.iv,
            data: encrypted.ciphertext,
          }, uid);

          // Small delay to ensure IndexedDB transaction commits
          await new Promise(resolve => setTimeout(resolve, 100));

          // Trigger notes refresh via custom event
          window.dispatchEvent(new CustomEvent('noteAdded'));

          setStatus('complete');
        } catch (err) {
          console.error('Processing error:', err);
          setError(err instanceof Error ? err.message : 'Processing failed');
          setStatus('error');
        } finally {
          // Clear captured secrets
          capturedSecretRef.current = null;
          capturedUidRef.current = null;
          capturedSessionIdRef.current = null;
          capturedDurationRef.current = 0;

          // Stop all tracks
          streamRef.current?.getTracks().forEach((track) => track.stop());
          streamRef.current = null;

          // Update recording state
          setRecordingInProgress(false);
        }
      };

      mediaRecorder.start(1000); // Collect in 1-second chunks
      mediaRecorderRef.current = mediaRecorder;
      setStatus('recording');
      setDuration(0);
      capturedDurationRef.current = 0;
      setError(null);
      setRecordingInProgress(true);

      // Duration counter
      durationIntervalRef.current = setInterval(() => {
        setDuration((d) => {
          const newDuration = d + 1;
          capturedDurationRef.current = newDuration;
          return newDuration;
        });
      }, 1000);

      // Max recording timeout
      maxTimeoutRef.current = setTimeout(() => {
        stopRecording();
      }, SESSION_CONFIG.MAX_RECORDING_MS);
    } catch (err) {
      console.error('Recording error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      setStatus('error');
      setRecordingInProgress(false);
    }
  }, [user, getVaultSecretForRecording, setRecordingInProgress]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setDuration(0);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      if (maxTimeoutRef.current) clearTimeout(maxTimeoutRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return {
    status,
    duration,
    remainingTime: Math.max(0, SESSION_CONFIG.MAX_RECORDING_MS / 1000 - duration),
    error,
    startRecording,
    stopRecording,
    reset,
    stream: streamRef.current,
  };
}
