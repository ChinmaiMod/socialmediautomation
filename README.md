# Social Media Automation

AI-powered social media automation system with viral content analysis and multi-platform scheduling.

## Features

🤖 **AI-Powered Content Generation**
- Generate viral content using Claude Opus 4, GPT-4.5, Gemini 2.5 Pro, and more
- 39+ AI models available via OpenRouter
- Configurable models for different tasks (content, analysis, research)

📊 **Trend Research**
- Automatic trending topic discovery
- 7-day recency validation
- Current product version tracking (Gemini 2.5, GPT-4.5, etc.)

🔗 **Multi-Platform Support**
- LinkedIn
- Facebook
- Instagram
- Pinterest

⏰ **Automated Scheduling**
- Cron-based posting (8am, 2pm, 7pm daily)
- Batch processing
- Engagement tracking

🔐 **Secure Authentication**
- Supabase Auth with email/password
- Row Level Security (RLS)
- User-scoped data isolation

🎨 **Modern UI**
- Built with Next.js 14 & Tailwind CSS
- Real-time dashboard
- Model selection interface

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Vercel Serverless Functions
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenRouter API (Claude, GPT, Gemini, etc.)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- OpenRouter API key
- Social media platform API credentials

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ChinmaiMod/socialmediautomation.git
cd socialmediautomation
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:
```env
# OpenRouter AI
OPENROUTER_API_KEY=sk-or-xxxxx
OPENROUTER_MODEL=anthropic/claude-sonnet-4

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Security
CRON_SECRET=random_secure_string

# Application
APP_URL=http://localhost:3000
NODE_ENV=development

# Social Media (configure as needed)
LINKEDIN_CLIENT_ID=xxxxx
LINKEDIN_CLIENT_SECRET=xxxxx
FACEBOOK_APP_ID=xxxxx
FACEBOOK_APP_SECRET=xxxxx
PINTEREST_APP_ID=xxxxx
PINTEREST_APP_SECRET=xxxxx
```

4. Set up Supabase database:
- The migrations are in the documentation
- Run them in your Supabase SQL editor
- Or use the Supabase MCP if you have it configured

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### First Time Setup

1. Navigate to `/register` to create an account
2. Log in at `/login`
3. Connect your social media accounts
4. Configure AI models in Settings
5. Start generating content!

## Deployment

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ChinmaiMod/socialmediautomation)

Or manually:

```bash
npm run deploy
```

### Environment Variables on Vercel

Add all environment variables from `.env.example` to your Vercel project settings.

### Supabase Configuration

1. Go to your Supabase project
2. Run the database migrations (see `socialmediaautomation.md`)
3. Configure Authentication settings:
   - Enable email/password
   - Set Site URL to your Vercel URL
   - Add redirect URLs

## Documentation

- **[AUTH_SETUP.md](AUTH_SETUP.md)** - Authentication setup guide
- **[socialmediaautomation.md](socialmediaautomation.md)** - Complete system documentation

## Available AI Models (December 2025)

### Premium Tier
- Claude Opus 4, Claude Sonnet 4
- GPT-4.5 Turbo, GPT-4o, OpenAI o1
- Gemini 2.5 Pro, Grok 2

### Standard Tier
- Claude 3.5 Haiku, GPT-4o Mini, o1/o3 Mini
- Gemini 2.5 Flash, DeepSeek R1
- Mistral Large

### Budget Tier (Some Free)
- Gemini 2.0 Flash (Free)
- DeepSeek R1 (Free)
- Llama 3.3 70B, Qwen 2.5 72B

## Project Structure

```
├── app/
│   ├── api/           # API routes
│   ├── login/         # Login page
│   ├── register/      # Registration page
│   ├── settings/      # Settings page
│   └── page.tsx       # Dashboard
├── components/
│   └── settings/      # UI components
├── lib/
│   ├── ai/            # AI integration (OpenRouter)
│   ├── social/        # Social media APIs
│   ├── utils/         # Utilities
│   ├── auth.ts        # Authentication helpers
│   └── db.ts          # Database operations
├── middleware.ts      # Auth middleware
└── vercel.json        # Vercel config (cron jobs)
```

## Contributing

Contributions are welcome! Please read the documentation first.

## License

MIT

## Author

[ChinmaiMod](https://github.com/ChinmaiMod)

## Support

For issues and questions, please open a GitHub issue.
