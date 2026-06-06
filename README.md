# InterviewPrep AI 🎙️

An AI-powered mock interview platform. Upload a CV, paste a job description, and face a realistic **voice interview** tailored to your skills — with **teacher-mode** explanations and a final readiness report.

Built with **Next.js (full-stack)** + **MongoDB** + **Gemini** (LLM) + **Groq Whisper** (STT) + **ElevenLabs** (voice).

## Features
- 📄 **Resume + JD analysis** — extracts skills, matches to the job, finds gaps
- 🧠 **AI question generation** — tailored MERN / Next.js / Node questions, easy→hard
- 🗣️ **Voice interview** — AI speaks questions (ElevenLabs, browser fallback), you answer by mic (Web Speech API)
- 👨‍🏫 **Teacher mode** — wrong/partial answers get a clear explanation + example
- 📊 **Evaluation report** — technical, communication, confidence & overall readiness %

## Stack (all free tiers)
| Layer | Tech |
|---|---|
| Frontend + Backend | Next.js 15 (App Router, API routes) |
| Database | MongoDB Atlas + Mongoose |
| LLM | Google Gemini (`gemini-2.0-flash`) |
| Speech-to-text | Groq Whisper (server) / browser Web Speech API (primary) |
| Voice (TTS) | ElevenLabs / browser SpeechSynthesis fallback |

## Setup
1. Copy `.env.example` to `.env` and fill in your keys:
   ```
   GEMINI_API_KEY=...
   MONGODB_URI=...
   GROQ_API_KEY=...
   ELEVENLABS_API_KEY=...
   ```
2. Install & run:
   ```bash
   npm install
   npm run dev
   ```
3. Open http://localhost:3000

## Flow
`/` → `/setup` (upload CV + JD) → `/interview/[id]` (voice room) → `/interview/[id]/results` (report)

## API routes
| Method | Route | Purpose |
|---|---|---|
| POST | `/api/resume` | Parse CV (file or text) → skills |
| POST | `/api/job` | Parse job description |
| POST | `/api/interview` | Match + generate questions |
| GET | `/api/interview/[id]` | Interview + questions (room view) |
| POST | `/api/interview/[id]/answer` | Evaluate answer + teacher mode |
| POST | `/api/interview/[id]/complete` | Build final report |
| GET | `/api/interview/[id]/report` | Report + per-question review |
| POST | `/api/tts` | ElevenLabs text-to-speech |
| POST | `/api/stt` | Groq Whisper speech-to-text |

## Roadmap (Phase 2/3)
- Auth + user history & progress graphs
- Background job queue (BullMQ) for parsing/evaluation
- Vector DB (Pinecone/Chroma) for a reusable question bank + resume RAG
- Stripe subscriptions, coding-question runner

> ⚠️ Keys in `.env` are gitignored. Rotate any key that has been shared in plaintext.
