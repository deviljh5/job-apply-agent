# Job Apply Agent

An AI-powered job application agent inspired by fastapply.co. Features resume upload & AI parsing, job matching, AI-tailored resumes, Chrome extension auto-fill, and Gmail email tracking.

**🚀 Zero-cost deployment supported — Demo mode works without OpenAI API key.**

## Features

- **Resume Management** - Upload PDF, AI parsing extracts structured data (or demo mode with templates)
- **Job Discovery** - Aggregate jobs from multiple sources with smart matching
- **AI Resume Tailoring** - Generate tailored resumes & cover letters per job (AI-powered or template-based)
- **Chrome Extension** - Auto-fill job applications on Greenhouse, Lever, Workday, etc.
- **Application Tracking** - Track status, email sync, interview pipeline
- **Gmail Integration** - Auto-read application emails, classify & update status

## Tech Stack

- Next.js 16 + TypeScript + Tailwind CSS + shadcn/ui
- Prisma + SQLite (dev) / PostgreSQL (prod)
- NextAuth.js + Google OAuth
- OpenAI GPT-4o-mini for AI features (optional — demo mode available)
- Google APIs for Gmail sync (optional)
- Chrome Extension (Manifest V3)

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your API keys (or leave defaults for demo mode)

# Initialize database
npx prisma migrate dev

# Run dev server
npm run dev
```

Open http://localhost:3000

## Deployment

### Zero-Cost Deployment (Recommended)

Deploy completely for free using:
- **Vercel** (Hobby plan — free)
- **Neon** (PostgreSQL — free tier)
- **GitHub** (public repo — free)
- **Demo mode** (no OpenAI API key needed — free)

**Total cost: $0/month**

See [DEPLOYMENT.md](DEPLOYMENT.md) for the complete step-by-step guide.

### Quick Deploy to Vercel

1. Push to GitHub
2. Import to [Vercel](https://vercel.com/new)
3. Configure environment variables (use `.env.example` as reference)
4. Deploy

**Note:** Leave `OPENAI_API_KEY` as default to enable **Demo mode** (zero AI costs). All features work with template-based responses.

## Demo Mode vs AI Mode

| Feature | Demo Mode (Free) | AI Mode (Paid) |
|---------|-----------------|----------------|
| Resume Parsing | Template data | AI-extracted from PDF |
| Resume Tailoring | Keyword-based templates | AI-rewritten content |
| Cover Letter | Template generation | AI-personalized letter |
| Email Classification | Keyword matching | AI semantic analysis |
| ATS Score | Keyword matching | AI-optimized scoring |

**Switch to AI mode:** Add `OPENAI_API_KEY` to environment variables and redeploy.

## Project Structure

```
job-apply-agent/
├── src/
│   ├── app/              # Next.js app routes (pages + API)
│   ├── components/       # UI components (shadcn/ui)
│   └── lib/              # Utilities & services
├── prisma/               # Database schema
├── chrome-extension/     # Browser extension (load in dev mode)
├── DEPLOYMENT.md         # Complete deployment guide
└── .env.example          # Environment variables template
```

## Chrome Extension

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → Select `chrome-extension/dist/`
4. Extension auto-detects job pages and offers auto-fill

Supported platforms: Greenhouse, Lever, Workday, LinkedIn, Indeed, Ashby, Glassdoor, ZipRecruiter, AngelList

## Environment Variables

```bash
# Required
DATABASE_URL="postgresql://..."      # Or SQLite for local dev
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret"
GOOGLE_CLIENT_ID="..."               # For OAuth login
GOOGLE_CLIENT_SECRET="..."

# Optional (leave default for demo mode)
OPENAI_API_KEY="your-openai-api-key" # For AI features
GMAIL_CLIENT_ID="..."                # For email sync
GMAIL_CLIENT_SECRET="..."
ADZUNA_APP_ID="..."                  # For real job aggregation
```

See `.env.example` for full reference.

## License

MIT

---

**Built with ❤️ for job seekers.**
