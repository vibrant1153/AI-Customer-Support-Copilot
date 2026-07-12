# CopilotAI — AI Customer Support Copilot

An AI-powered customer support platform that reads incoming support emails, drafts replies grounded in your own knowledge base, and either surfaces them in a dedicated inbox for review or pushes them directly into Gmail as threaded draft replies — never sending anything without human approval.

Built as a solo indie/entrepreneurial project targeting small-to-mid-size SaaS and e-commerce companies.

## Live Demo

- **App:** [ai-customer-support-copilot-omega.vercel.app](https://ai-customer-support-copilot-omega.vercel.app)
- **Landing page:** same URL, root route

## Why This Exists

Most support inboxes get overwhelmed faster than small teams can hire. This tool drafts a reply for every incoming email, grounded strictly in the org's own documentation — if the knowledge base doesn't cover something, it says so honestly instead of guessing, and every draft ships with a confidence score so a human knows what to double-check before sending.

## Two Ways to Work

| | **Hosted Inbox** | **Gmail Native** |
|---|---|---|
| Where tickets live | This app's own database | The customer's real Gmail account |
| Where drafts are reviewed | This app's `/inbox` page | Directly inside Gmail, as a draft reply |
| Setup required | None beyond signup | Gmail OAuth connection |

Every organization can switch between modes at any time in Settings. Nothing about the knowledge base or AI pipeline changes between modes — only where the draft ends up.

## Core Features

- **Multi-tenant architecture** — every organization's documents, emails, and drafts are fully isolated via Supabase Row Level Security, scoped by `org_id`
- **Document ingestion & RAG** — upload PDF/TXT knowledge base documents; text is extracted, chunked, and embedded via Gemini (`gemini-embedding-001`, 768-dim vectors) into Postgres via `pgvector`
- **Grounded draft generation** — Gemini 2.5 Flash drafts a reply using only retrieved knowledge base context, with a structured JSON response including a 0-100 confidence score and reasoning
- **Approve / Reject / Regenerate workflow** — human review gate before anything is sent or pushed to Gmail; rejected drafts can be regenerated after updating the knowledge base
- **Gmail integration** — OAuth connection, manual/automated sync of real inbox messages (filtered to exclude newsletters and automated notifications via `List-Unsubscribe` header detection), and threaded draft-reply creation via the Gmail API
- **Bring Your Own Key (BYOK)** — each organization can optionally use its own free Gemini API key, so usage never competes with other orgs' quotas
- **Automation pipeline** — a single endpoint syncs new Gmail messages and drafts replies for all of them in one pass; designed to be triggered by a scheduled job (Vercel Cron, or any external scheduler) for hands-off operation

## Tech Stack

```
Framework:        Next.js 16 (App Router)
Language:         TypeScript
Styling:          Tailwind CSS
Icons:            lucide-react
Database:         Supabase (Postgres + pgvector)
Auth:             Supabase Auth
Storage:          Supabase Storage
PDF Extraction:   unpdf
Embeddings:       Gemini (gemini-embedding-001)
Generation:       Gemini 2.5 Flash
Gmail API:        googleapis
Deployment:       Vercel
```

## Project Structure

```
app/
├── page.tsx                    # Public landing page
├── login/, register/           # Auth
├── dashboard/                  # Org overview
├── knowledge-base/             # Document upload & management
├── inbox/                      # Hosted Inbox mode UI
├── settings/                   # Gmail connection, reply mode, BYOK, pending/rejected drafts
└── api/
    ├── process-document/       # Extraction -> chunking -> embedding pipeline
    ├── retrieve-context/       # RAG similarity search
    ├── generate-draft/         # Draft generation (manual, Hosted Inbox)
    ├── drafts/[id]/            # Approve/reject (pushes to Gmail if Gmail Native)
    ├── drafts/pending/         # Pending drafts list
    ├── drafts/rejected/        # Rejected drafts list
    ├── drafts/[id]/regenerate/ # Re-run retrieval + generation
    ├── auth/gmail/             # OAuth connect/callback
    ├── gmail/sync/             # Manual Gmail sync
    ├── automation/run/         # System-wide automation (cron-ready, secret-protected)
    ├── automation/run-for-org/ # Manual per-org automation trigger
    └── org/                    # reply-mode and gemini-key settings

lib/
├── supabase/                   # Browser/server clients, auth middleware
├── processing/                 # Text extraction, chunking, embedding
├── ai/                         # Draft generation
├── google/                     # Gmail OAuth client, message parsing, draft creation
└── automation/                 # Shared sync + draft pipeline logic
```

## Database Schema

Core tables (all with Row Level Security scoped by `org_id`):

- `organizations` — includes `reply_mode` (`hosted` | `gmail_native`) and `gemini_api_key` (BYOK)
- `profiles` — extends `auth.users`, links to `organizations`
- `documents`, `document_chunks` — knowledge base, with `embedding vector(768)`
- `customer_emails` — support tickets, includes Gmail linkage fields (`gmail_message_id`, `gmail_thread_id`, `gmail_message_id_header`)
- `ai_drafts` — generated drafts with `confidence_score`, `reasoning`, `status`
- `email_connections` — per-org Gmail OAuth refresh tokens

Plus a Postgres function `match_document_chunks` for `pgvector` cosine similarity search.

## Environment Variables

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GEMINI_API_KEY=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=          # e.g. https://yourdomain.com/api/auth/gmail/callback
NEXT_PUBLIC_APP_URL=          # e.g. https://yourdomain.com

CRON_SECRET=                  # any random string, protects the system-wide automation endpoint
```

## Local Setup

1. `npm install`
2. Set up a Supabase project, enable the `vector` extension, and run the SQL migrations
3. Enable the Gmail API in Google Cloud Console, create an OAuth client (Web application), add `http://localhost:3000/api/auth/gmail/callback` as an authorized redirect URI
4. Copy `.env.local.example` to `.env.local` and fill in all values above
5. `npm run dev`

## Known Limitations (Honest, Current State)

- **OAuth refresh tokens and BYOK Gemini keys are stored as plain text** — functional for testing, needs application-level encryption before real customer data is involved
- **Google OAuth app is in Testing mode** — capped at 100 manually-added test users until Google's verification process is completed
- **Automation requires manual triggering or an external scheduler** — no built-in real-time trigger (Gmail push notifications via Pub/Sub were deliberately deferred due to setup complexity)
- **No email sending for Hosted Inbox mode yet** — approved drafts in Hosted mode are marked approved but not yet dispatched via an email provider

## Roadmap / Not Yet Built

- Analytics dashboard
- Billing (Stripe)
- Real-time Gmail push notifications
- Team/multi-agent support per organization
