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
import { groq } from '@/lib/groq';
import { getPromptForNoteType, type NoteType } from '@/lib/prompts';

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
  output: string;  // RENAMED from soapNote for multi-format support
}

interface ScribeError {
  error: string;
  details?: string;
}

/**
 * Parse multipart form data
 *
 * Extracts audio file, sessionId, and optional noteType/customInstructions from the request.
 */
async function parseForm(req: NextApiRequest): Promise<{
  audioPath: string;
  sessionId: string;
  noteType: NoteType;
  customInstructions?: string;
}> {
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

      // Extract noteType (optional, defaults to 'soap')
      const noteTypeField = Array.isArray(fields.noteType) ? fields.noteType[0] : fields.noteType;
      const noteType: NoteType = (noteTypeField as NoteType) || 'soap';

      // Extract customInstructions (optional, required only for custom type)
      const customInstructions = Array.isArray(fields.customInstructions)
        ? fields.customInstructions[0]
        : fields.customInstructions;

      // Validation for custom type
      if (noteType === 'custom' && !customInstructions) {
        reject(new Error('Custom instructions required for custom note type'));
        return;
      }

      resolve({
        audioPath: audioFile.filepath,
        sessionId,
        noteType,
        customInstructions,
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
    const { audioPath: path, sessionId, noteType, customInstructions } = await parseForm(req);
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

    // Step 2: Format clinical note with Groq Llama
    console.log(`Generating ${noteType} note...`);

    // Get appropriate system prompt based on note type
    const systemPrompt = getPromptForNoteType(noteType, customInstructions);

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript },
      ],
      temperature: 0.1,
    });

    const output = completion.choices[0]?.message?.content || '';

    // IMPORTANT: Do NOT log the clinical note (PHI)
    console.log('Clinical note generated');

    // Cleanup: Delete temporary audio file
    if (audioPath) {
      try {
        fs.unlinkSync(audioPath);
      } catch (cleanupError) {
        console.error('Failed to delete temp file:', cleanupError);
        // Non-critical error, continue
      }
    }

    // Return transcript and formatted clinical note
    return res.status(200).json({
      transcript,
      output,
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
