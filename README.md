# AURA — AI-powered University Resident Assistant

> An AI-powered web app that helps University of Georgia students get instant, accurate answers about dorm policies, find their RA, schedule meetings, check if items are recyclable, and stay informed about campus events — all in one place.

**GitHub Repository:** [github.com/DaBoB6868/dorm-ra-bot](https://github.com/DaBoB6868/dorm-ra-bot)

---

## Team Members

- **Ayush Singh**
- **Spencer Hicks**
- **Chris Soro**
- **Piyush Roy**

---

## Purpose of the Project

Resident Assistants (RAs) at UGA repeatedly answer the same questions — quiet hours, guest policies, lockout procedures, maintenance requests. Students often don't know where to look or who to contact, especially late at night when the front desk is busy.

**AURA** solves this by providing a 24/7 AI assistant that:
- Instantly answers policy questions using official UGA Housing documents
- Helps students find and schedule meetings with their specific RA
- Identifies whether everyday items are recyclable using phone-camera AI
- Surfaces upcoming UGA campus events
- Provides one-tap emergency contacts with geolocation-based nearest front desk lookup

The goal is to reduce the repetitive workload on RAs while making dorm life information immediately accessible to every resident.

---

## How We Built It

We used **VS Code** as our primary development environment with **GitHub Copilot** as an AI pair-programming assistant throughout the entire development process. The project was built iteratively — starting with a basic chat interface and progressively adding features like the RAG pipeline, RA directory, recycling checker, and mobile-first redesign.

### Core Architecture

The app is built on **Next.js 16** with **TypeScript** and **React 19**, giving us a full-stack framework where both the frontend UI and backend API routes live in one codebase. **Tailwind CSS v4** handles all styling with a mobile-first responsive approach.

### AI & RAG Pipeline

The chatbot uses **Retrieval-Augmented Generation (RAG)** — rather than relying on the LLM's training data alone, we feed it real UGA policy documents at query time:

1. **Knowledge Base** — We converted 8 official UGA policy documents into structured JSON files stored in `backend/jsons/` (Community Guide, Academic Honesty Policy, Code of Conduct Parts 1–3, Computer Use Policy, Non-Discrimination & Anti-Harassment Policy, and Programs Serving Minors Policy).

2. **Keyword Routing** — When a student asks a question, the system maps ~80+ keywords (e.g., "quiet hours," "guest," "plagiarism," "harassment") to the relevant JSON document sections and extracts only the pertinent policy text.

3. **Context Injection** — The matched policy text is injected into the LLM prompt alongside the student's question and conversation history, so the AI generates answers grounded in official UGA policies — not hallucinations.

4. **LLM Generation** — The assembled prompt is sent to **OpenRouter's API** (routed to GPT-3.5-turbo) via **LangChain**, which returns a context-aware, policy-accurate response with source attribution.

5. **Building-Aware Responses** — If a student provides their dorm location, the system looks up building-specific phone numbers, front desk info, and RA on-call numbers from the Community Guide.

### Recycling Vision AI

The Recycle Checker uses a two-step AI pipeline:
1. **Object Identification** — The uploaded photo is sent to **Google Gemini 2.0 Flash** (via OpenRouter) as a vision model to identify the main object in the image.
2. **Classification** — The identified object is then classified as recyclable, compostable, landfill, or hazardous using **GPT-3.5-turbo** with structured JSON output, including disposal tips.

Images are compressed client-side (max 1024px, 70% JPEG quality) before upload to keep requests fast and under size limits.

### Email Scheduling

The RA appointment system uses **Nodemailer** with **Gmail SMTP** to send confirmation emails to both the student and their selected RA. Students pick a date/time with a native `datetime-local` picker and select a reason from pre-built suggestion chips (or type a custom one).

### API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/chat` | POST | RAG-powered chat with rate limiting (25/min) |
| `/api/recycle` | POST | Vision AI recycling classification (10/min) |
| `/api/schedule` | POST | RA appointment booking with email confirmation |
| `/api/ra-directory` | GET | Fetch list of RAs with dorm/floor info |
| `/api/events` | GET | Scrape upcoming UGA campus events |
| `/api/documents` | POST/GET | PDF upload and document management |

### Responsive Design

The app has two distinct layouts:
- **Desktop (≥1024px)** — 12-column grid with RA directory, chat, events panel, FAQ, and recycle checker all visible simultaneously
- **Mobile (<1024px)** — Bottom tab bar navigation with 5 tabs (Chat, Find RA, Events, Recycle, FAQ) for thumb-friendly one-handed use

---

## Challenges We Ran Into

1. **Mobile Camera Integration** — The initial implementation used `getUserMedia()` to stream video to a `<canvas>`, which required explicit camera permissions and felt clunky. We switched to the native `<input type="file" capture="environment">` approach, which opens the phone's native camera picker seamlessly.

2. **413 Payload Too Large Errors** — Phone cameras produce multi-megabyte images that exceeded API size limits. We solved this by implementing client-side image compression using a `<canvas>` element to resize images to a max of 1024px and re-encode as 70% quality JPEG before uploading.

3. **Schedule API Field Mismatch** — The frontend was sending field names (`name`, `email`, `when`) that didn't match what the backend expected (`studentName`, `studentEmail`, `preferredTime`). This caused silent "Invalid request" errors that were hidden by a catch-all error handler. We fixed both the field mapping and added specific validation error messages.

4. **Rate Limiting from Scratch** — Without a Redis instance, we built an in-memory sliding-window rate limiter that tracks request timestamps per IP address, with automatic cleanup of stale entries every 5 minutes. Chat is limited to 25 requests/min and recycling to 10 requests/min.

5. **Vercel Read-Only Filesystem** — The schedule persistence logic writes to `backend/data/schedules.json`, but Vercel's serverless functions have a read-only filesystem. We made file persistence best-effort (try/catch around writes) so the email still sends even when disk writes fail.

6. **Redundant UI Elements Across Devices** — Buttons that made sense on mobile (like "Gallery" for photo picker) were confusing on desktop where "Upload Photo" already opens a standard file dialog. We used responsive CSS classes (`sm:hidden`) to conditionally show/hide elements per device type.

---

## Accomplishments That We're Proud Of

- **Full RAG pipeline** that answers questions using real UGA Housing policy documents — not generic AI responses — with source attribution so students know exactly where the info comes from.
- **Vision-based recycling checker** that lets students point their phone camera at an item and get an instant classification with disposal tips.
- **Geolocation-powered emergency banner** that detects the student's nearest front desk based on their GPS coordinates and provides one-tap calling.
- **Complete mobile-first redesign** with a bottom tab bar that makes the app feel like a native mobile app, while maintaining a full desktop dashboard layout.
- **Production-ready hardening** including rate limiting, input validation (2000 char max, 30-message history cap), error boundaries, and proper HTTP status codes (429 for rate limits, 413 for payloads).
- **End-to-end email flow** where students can find their RA by dorm, pick a date/time, select a reason, and both parties receive a formatted confirmation email via Gmail SMTP.

---

## What We Learned

- **RAG architecture** — How to build a retrieval-augmented generation pipeline from scratch: structuring knowledge bases, implementing keyword routing, injecting context into LLM prompts, and handling source attribution.
- **Vision AI APIs** — How to chain multiple AI models (Gemini for image recognition → GPT for classification) with fallback logic when the primary model fails.
- **Mobile-first design thinking** — Desktop-first designs don't translate well to phones. We learned to design for thumbs first (bottom navigation, large touch targets, 44px minimum) and then expand for desktop.
- **API integration patterns** — Working with OpenRouter as a unified gateway to multiple AI models (GPT-3.5-turbo, Gemini 2.0 Flash), Nodemailer for SMTP, and the UGA campus events system.
- **Production concerns** — Rate limiting, input validation, image compression, error boundaries, and handling platform constraints like Vercel's read-only filesystem are all things you don't think about until deployment breaks.
- **GitHub Copilot workflow** — Using Copilot as a pair programmer for rapid prototyping, debugging complex async issues, and iterating on UI/UX across multiple sessions.

---

## What's Next for AURA

1. **Persistent Vector Database** — Replace the in-memory store with Pinecone or Supabase pgvector for persistent, scalable document search across server restarts.
2. **User Authentication** — Add UGA CAS / OAuth login so students see personalized info (their dorm, their RA, their past conversations).
3. **Document Management Dashboard** — Admin panel for RAs to upload new policy documents, update community guides, and manage the knowledge base without code changes.
4. **Additional File Types** — Support .docx, .txt, and .xlsx uploads in addition to PDFs and JSONs.
5. **Streaming Responses** — Implement real-time token streaming in the chat UI so students see the AI "typing" in real time via Server-Sent Events.
6. **Multi-University Support** — Generalize the platform so any university's housing department can deploy their own instance with their own policy documents.
7. **Analytics Dashboard** — Track most-asked questions, peak usage times, and recycling statistics to give RAs and housing staff actionable insights.
8. **Push Notifications** — Notify students about upcoming RA meetings, building-wide events, and emergency alerts.

---

## Tools & Frameworks Utilized (Credits)

| Tool / Framework | Purpose | Link |
|-----------------|---------|------|
| **Next.js 16** | Full-stack React framework (frontend + API routes) | [nextjs.org](https://nextjs.org) |
| **React 19** | UI component library | [react.dev](https://react.dev) |
| **TypeScript 5** | Type-safe JavaScript | [typescriptlang.org](https://www.typescriptlang.org) |
| **Tailwind CSS v4** | Utility-first CSS framework | [tailwindcss.com](https://tailwindcss.com) |
| **LangChain** | LLM orchestration & RAG pipeline | [langchain.com](https://www.langchain.com) |
| **OpenRouter API** | Unified gateway to GPT-3.5-turbo & Gemini models | [openrouter.ai](https://openrouter.ai) |
| **OpenAI GPT-3.5-turbo** | Chat AI & recycling classification (via OpenRouter) | [openai.com](https://openai.com) |
| **Google Gemini 2.0 Flash** | Vision AI for object identification (via OpenRouter) | [ai.google.dev](https://ai.google.dev) |
| **Nodemailer** | Email sending via Gmail SMTP | [nodemailer.com](https://nodemailer.com) |
| **Lucide React** | Icon library | [lucide.dev](https://lucide.dev) |
| **Vercel** | Deployment & hosting platform | [vercel.com](https://vercel.com) |
| **GitHub Copilot** | AI pair-programming assistant | [github.com/features/copilot](https://github.com/features/copilot) |
| **VS Code** | Primary development environment | [code.visualstudio.com](https://code.visualstudio.com) |
| **pdf-parse** | PDF text extraction | [npmjs.com/package/pdf-parse](https://www.npmjs.com/package/pdf-parse) |
| **Zod** | Runtime schema validation | [zod.dev](https://zod.dev) |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Main page (desktop grid + mobile tabs)
│   ├── layout.tsx                # Root layout with ErrorBoundary, SEO meta
│   ├── globals.css               # Global styles, safe-area, touch targets
│   └── api/
│       ├── chat/route.ts         # RAG chat endpoint (rate limited)
│       ├── recycle/route.ts      # Vision AI recycling classifier
│       ├── schedule/route.ts     # RA appointment booking + email
│       ├── ra-directory/route.ts # RA listing endpoint
│       ├── events/route.ts       # UGA campus events scraper
│       └── documents/route.ts    # PDF upload & management
├── components/
│   ├── ChatComponent.tsx         # AI chat interface with quick questions
│   ├── RASelector.tsx            # RA directory + appointment scheduling
│   ├── RecycleChecker.tsx        # Camera/upload recycling classifier
│   ├── UGAEventsPanel.tsx        # Campus events feed
│   ├── FAQSection.tsx            # Common questions accordion
│   ├── EmergencyBanner.tsx       # Emergency contacts + geolocation
│   ├── ScheduleModal.tsx         # Appointment form modal
│   ├── Navigation.tsx            # Top nav bar with resource links
│   ├── ErrorBoundary.tsx         # Global error handler
│   └── PDFUploadComponent.tsx    # PDF document uploader
└── lib/
    ├── rag-service.ts            # RAG pipeline (keyword routing + LLM)
    ├── embeddings.ts             # TF-IDF embeddings with stemming
    ├── vector-store.ts           # In-memory cosine similarity search
    ├── pdf-loader.ts             # PDF text extraction
    ├── rate-limit.ts             # Sliding-window rate limiter
    └── building-mappings.json    # UGA dorm building lookup data

backend/
├── jsons/                        # 8 UGA policy JSON knowledge bases
│   ├── community_guide.json
│   ├── academic_honesty_policy.json
│   ├── code_of_conduct_part1-3.json
│   ├── computer_use_policy.json
│   ├── minors_policy.json
│   └── ndah_policy.json
└── data/
    └── schedules.json            # Persisted appointment records
```

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/DaBoB6868/dorm-ra-bot.git
cd dorm-ra-bot

# 2. Install dependencies
npm install

# 3. Create .env.local with your API keys
#    OPENAI_API_KEY=your-openrouter-key
#    GMAIL_USER=your-gmail@gmail.com
#    GMAIL_APP_PASSWORD=your-app-password

# 4. Run the development server
npm run dev

# 5. Open http://localhost:3000
```
- **PDF**: pdf-parse, pdfjs-dist
- **Icons**: Lucide React

## Customization

### Change System Prompt
Edit `src/lib/rag-service.ts`

### Modify Appearance
Tailwind classes in component files

### Different LLM/Embeddings
Update `src/lib/rag-service.ts` and `src/lib/embeddings.ts`

## Troubleshooting

- **API Key Error**: Check `.env.local` and restart dev server
- **PDF Upload Fails**: Ensure valid PDF, check console for errors
- **Slow Responses**: First query slower due to embeddings
- **Build Error**: Run `npm install --legacy-peer-deps`

## Future Enhancements

- Persistent vector database (Pinecone, Supabase)
- User authentication
- Document management dashboard
- Support for more file types
- Streaming responses
- Analytics and usage metrics

## License

MIT License - Free to use for educational and commercial projects

## Support

For issues or questions, refer to:
- [Next.js Docs](https://nextjs.org/docs)
- [OpenAI Docs](https://platform.openai.com/docs)
- [LangChain Docs](https://python.langchain.com)

---

**Built with ❤️ using Next.js and LangChain**
