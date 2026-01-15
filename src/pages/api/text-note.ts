/**
 * Text Note API Endpoint
 *
 * Accepts user-provided text input and formats it as a SOAP note using Groq Llama.
 * Used for "Quick Note" feature where users paste or type clinical notes instead of recording.
 *
 * Flow:
 * 1. Validate Firebase ID token (authenticate user)
 * 2. Validate text input (not empty, reasonable length)
 * 3. Call Groq Llama with SOAP system prompt
 * 4. Return formatted SOAP note
 *
 * SECURITY: Firebase authentication required. No PHI logging. HIPAA compliant.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { groq } from '@/lib/groq';
import { getPromptForNoteType, type NoteType } from '@/lib/prompts';
import { adminAuth } from '@/lib/firebase-admin';

interface TextNoteRequest {
  text: string;
  idToken: string;
  noteType?: NoteType;
  customInstructions?: string;
}

interface TextNoteResponse {
  output: string;  // RENAMED from soapNote for multi-format support
}

interface TextNoteError {
  error: string;
  details?: string;
}

/**
 * Maximum text length (10,000 characters)
 * Prevents abuse and excessive API costs
 */
const MAX_TEXT_LENGTH = 10000;

/**
 * Text Note Handler
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TextNoteResponse | TextNoteError>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, idToken, noteType = 'soap', customInstructions } = req.body as TextNoteRequest;

    // Validate Firebase ID token
    if (!idToken) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'Firebase ID token required',
      });
    }

    try {
      await adminAuth.verifyIdToken(idToken);
    } catch (authError) {
      console.error('Firebase auth verification failed:', authError);
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'Invalid or expired Firebase token',
      });
    }

    // Validate text input
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Invalid input',
        details: 'Text is required and must be a string',
      });
    }

    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      return res.status(400).json({
        error: 'Invalid input',
        details: 'Text cannot be empty',
      });
    }

    if (trimmedText.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({
        error: 'Invalid input',
        details: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters`,
      });
    }

    // Validate custom type requires custom instructions
    if (noteType === 'custom' && !customInstructions?.trim()) {
      return res.status(400).json({
        error: 'Invalid input',
        details: 'Custom instructions required for custom note type',
      });
    }

    console.log(`Formatting text note as ${noteType}...`);

    // Get appropriate system prompt based on note type
    const systemPrompt = getPromptForNoteType(noteType, customInstructions);

    // Call Groq API to format text as clinical note
    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: trimmedText },
      ],
      temperature: 0.1,
    });

    const output = completion.choices[0]?.message?.content || '';

    if (!output) {
      throw new Error('Empty response from Groq API');
    }

    // IMPORTANT: Do NOT log the clinical note (PHI)
    console.log('Text note formatted successfully');

    return res.status(200).json({ output });
  } catch (error) {
    console.error('Text note API error:', error);

    // Check for rate limiting
    if (error && typeof error === 'object' && 'status' in error) {
      const statusError = error as { status?: number };
      if (statusError.status === 429) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          details: 'Too many requests. Please wait a moment and try again.',
        });
      }
    }

    return res.status(500).json({
      error: 'Failed to format text note',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
