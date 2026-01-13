/**
 * Scribe API Endpoint
 *
 * Processes audio recordings to generate transcripts and SOAP notes.
 * Flow:
 * 1. Validate recording session (one-time use, time-limited)
 * 2. Transcribe audio with Groq Whisper Turbo
 * 3. Format transcript into SOAP note with Groq Llama 3.3 70B
 * 4. Return transcript and SOAP note
 *
 * SECURITY: No PHI logging, stateless processing, session validation required.
 * Recording sessions prevent token expiration issues during long recordings (up to 60min).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import { adminDb } from '@/lib/firebase-admin';
import { groq, SOAP_SYSTEM_PROMPT } from '@/lib/groq';

/**
 * Disable Next.js body parser to handle multipart/form-data manually
 */
export const config = {
  api: {
    bodyParser: false,
  },
};

interface ScribeResponse {
  transcript: string;
  soapNote: string;
}

interface ScribeError {
  error: string;
  details?: string;
}

/**
 * Parse multipart form data
 *
 * Extracts audio file and sessionId from the request.
 */
async function parseForm(req: NextApiRequest): Promise<{ audioPath: string; sessionId: string }> {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: 100 * 1024 * 1024, // 100MB max
      keepExtensions: true,
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(new Error('Failed to parse form data'));
        return;
      }

      // Extract sessionId
      const sessionId = Array.isArray(fields.sessionId) ? fields.sessionId[0] : fields.sessionId;

      if (!sessionId) {
        reject(new Error('Missing sessionId'));
        return;
      }

      // Extract audio file
      const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio;

      if (!audioFile) {
        reject(new Error('Missing audio file'));
        return;
      }

      resolve({
        audioPath: audioFile.filepath,
        sessionId,
      });
    });
  });
}

/**
 * Scribe API Handler
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ScribeResponse | ScribeError>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let audioPath: string | null = null;

  try {
    // Parse multipart form data
    const { audioPath: path, sessionId } = await parseForm(req);
    audioPath = path;

    // Validate recording session
    let userId: string;
    try {
      const sessionDoc = await adminDb.collection('recording-sessions').doc(sessionId).get();

      if (!sessionDoc.exists) {
        console.error('Recording session not found:', sessionId);
        return res.status(401).json({ error: 'Invalid session' });
      }

      const session = sessionDoc.data();

      if (!session) {
        console.error('Session data missing:', sessionId);
        return res.status(401).json({ error: 'Invalid session' });
      }

      // Validate session status
      if (session.status !== 'active') {
        console.error('Recording session already used:', sessionId);
        return res.status(401).json({ error: 'Session already used' });
      }

      // Validate session not expired
      if (Date.now() > session.expiresAt) {
        console.error('Recording session expired:', sessionId);
        return res.status(401).json({ error: 'Session expired' });
      }

      userId = session.userId;

      // Delete session (one-time use)
      await adminDb.collection('recording-sessions').doc(sessionId).delete();

      console.log(`Session ${sessionId} validated and deleted for user ${userId}`);
    } catch (error) {
      console.error('Session validation failed:', error);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Step 1: Transcribe audio with Groq Whisper
    console.log('Transcribing audio...');

    const audioFile = fs.createReadStream(audioPath);

    const transcriptionResponse = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3-turbo',
      response_format: 'text',
      temperature: 0.0,
    });

    const transcript =
      typeof transcriptionResponse === 'string'
        ? transcriptionResponse
        : transcriptionResponse.text;

    // IMPORTANT: Do NOT log the transcript (PHI)
    console.log('Transcription complete');

    // Step 2: Format SOAP note with Groq Llama
    console.log('Generating SOAP note...');

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: SOAP_SYSTEM_PROMPT },
        { role: 'user', content: transcript },
      ],
      temperature: 0.1,
    });

    const soapNote = completion.choices[0]?.message?.content || '';

    // IMPORTANT: Do NOT log the SOAP note (PHI)
    console.log('SOAP note generated');

    // Cleanup: Delete temporary audio file
    if (audioPath) {
      try {
        fs.unlinkSync(audioPath);
      } catch (cleanupError) {
        console.error('Failed to delete temp file:', cleanupError);
        // Non-critical error, continue
      }
    }

    // Return transcript and SOAP note
    return res.status(200).json({
      transcript,
      soapNote,
    });
  } catch (error) {
    console.error('Scribe API error:', error);

    // Cleanup: Delete temporary audio file on error
    if (audioPath) {
      try {
        fs.unlinkSync(audioPath);
      } catch (cleanupError) {
        console.error('Failed to delete temp file:', cleanupError);
      }
    }

    return res.status(500).json({
      error: 'Failed to process audio',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
