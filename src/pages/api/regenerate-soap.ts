/**
 * Regenerate SOAP Note API Endpoint
 *
 * Accepts original transcript + user corrections/additions,
 * calls Groq Llama to regenerate an improved SOAP note.
 *
 * Flow:
 * 1. Validate request body (transcript + userInput)
 * 2. Build prompt with original transcript and user input
 * 3. Call Groq Llama with SOAP system prompt
 * 4. Return regenerated SOAP note
 *
 * SECURITY: No session validation needed (notes are client-side encrypted).
 * No PHI logging.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { groq, SOAP_SYSTEM_PROMPT } from '@/lib/groq';

interface RegenerateSoapRequest {
  transcript: string;
  userInput: string;
  originalSoapNote?: string;
}

interface RegenerateSoapResponse {
  soapNote: string;
}

interface RegenerateSoapError {
  error: string;
  details?: string;
}

/**
 * Regenerate SOAP Note Handler
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RegenerateSoapResponse | RegenerateSoapError>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transcript, userInput, originalSoapNote } = req.body as RegenerateSoapRequest;

    // Validate inputs
    if (!transcript || !userInput) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'transcript and userInput are required',
      });
    }

    // Build prompt with context
    const prompt = `
Original Clinical Transcript:
${transcript}

Additional Information/Corrections from Provider:
${userInput}

Please regenerate the SOAP note incorporating the additional information above.
${originalSoapNote ? `\n\nPrevious SOAP Note (for reference):\n${originalSoapNote}` : ''}
    `.trim();

    console.log('Regenerating SOAP note with user input...');

    // Call Groq API with same system prompt and model as original
    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: SOAP_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
    });

    const soapNote = completion.choices[0]?.message?.content || '';

    // IMPORTANT: Do NOT log the SOAP note (PHI)
    console.log('SOAP note regenerated successfully');

    return res.status(200).json({ soapNote });
  } catch (error) {
    console.error('Regenerate SOAP API error:', error);

    return res.status(500).json({
      error: 'Failed to regenerate SOAP note',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
