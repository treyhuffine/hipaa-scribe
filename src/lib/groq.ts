/**
 * Groq SDK Initialization
 *
 * Initializes the Groq API client for:
 * - Whisper Turbo: Speech-to-text transcription
 * - Llama 3.3 70B: Clinical note formatting (multiple formats supported)
 */

import Groq from 'groq-sdk';

/**
 * Groq API client instance
 *
 * Initialized with API key from environment variable.
 * Used server-side only (API routes).
 */
export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * NOTE: All clinical note type prompts and configurations have been moved to
 * /src/lib/prompts.ts for centralized management of multiple note formats.
 *
 * This file now re-exports for backward compatibility.
 */

/**
 * SOAP System Prompt
 *
 * @deprecated Import from '@/lib/prompts' instead. This re-export is maintained for backward compatibility.
 *
 * Instructs the LLM to transform clinical transcripts into professionally formatted SOAP notes.
 * Implements medical terminology conversion, PII redaction, and structured output format.
 */
export { SOAP_SYSTEM_PROMPT } from '@/lib/prompts';
