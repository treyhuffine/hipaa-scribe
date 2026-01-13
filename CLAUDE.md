This was initialized from a fresh Next.js application. It uses tailwind and Typescript. We will use Shadcn (install components via the CLI if one is missing)

I'm building a minimalist (in the sense of data management) HIPAA compliant voice transcribing app for my wife. We'll keep as much in browser as possible and only use the cloud to call Groq and get STT and reformatted as a good note with a Groq LLM. We will have an encryption method to store encrypted data on the client. We'll use HIPAA compliant session and screen management.

It will be a Next.js app with tailwind and Shadcn UI and TS. We will start from fresh builds in the latest. We'll use the pages router for next.js (NOT the app router)

DO NOT USE THE APP ROUTER IN NEXT.JS. JUST THE PAGES ROUTER. ./src/pages
