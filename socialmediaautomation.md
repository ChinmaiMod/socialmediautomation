# Social Media Automation

**Repository:** https://github.com/ChinmaiMod/socialmediautomation

---

(Instagram/Pinterest)
  - CTR: Weight slider + Threshold input
  - **Visual:** Pie chart showing weight distribution
  
- **Viral Score Calculator:**
  - Minimum viral score slider (0-100)
  - Real-time calculation showing example
  - Test with historical post data
  
- **Timeframe:**
  - Radio buttons: 24h, 48h, 72h, Custom
  - Custom hours input
  
- **Comparison Method:**
  - Radio buttons: 
    - vs. Account Average
    - vs. Niche Average
    - Absolute Thresholds
  - Buttons: "High Engagement", "Maximum Reach", "Quality Interactions"
  - Custom save option

### 9.5 Content Generation Page
**Manual Generation Interface:**
- **Niche Selection:** Dropdown to filter accounts
- **Account Selection:** Multi-select checkboxes
- **Trend Input:** 
  - Auto-research button
  - Manual topic input
  - Recent trends dropdown
  - **Recency Guard:** Only surfaces topics posted within the last 7 days and validates they reference current product/version naming (e.g., rejects "Gemini Flash 2" if current version is 3)
- **Preview:** 
  - Tabs for each platform
  - Post preview cards
  - Edit capability
  - Predicted viral score indicator
- **Generate Button:** Large, prominent
- **Post Now / Schedule:** Action buttons

### 9.6 Analytics Dashboard
**Sections:**

**1. Overview Cards (Top Row):**
- Total posts (with growth %)
- Viral posts (with viral rate %)
- Avg engagement (with trend)
- Best performing niche

**2. Charts Row:**
- Line chart: Viral score over time (30 days)
- Bar chart: Posts by platform
- Pie chart: Engagement type distribution

**3. Performance Tables:**
- Top 10 performing posts
  - Columns: Date, Account, Platform, Content preview, Viral score, Engagement
  - Sort by any column
  - Click to view details
  
- Account Performance
  - Columns: Account name, Platform, Posts count, Viral rate, Avg engagement
  - Color-coded performance indicators

**4. Insights Panel:**
- Best posting times heatmap (day/hour)
- Most engaging topics (word cloud or list)
- Trending hooks library
- Platform comparison chart

**5. Filters:**
- Date range picker
- Platform filter
- Niche filter
- Viral only toggle
- Account selector

### 9.7 Viral Patterns Library Page
**Display:**
- Searchable/filterable collection of viral patterns
- Each pattern card shows:
  - Hook example
  - Content structure
  - Emotional trigger
  - Success rate
  - Usage count
  - Platform tags
  - Niche tags
- "Use this pattern" button → pre-fills generation
- Pattern details modal with examples
- Add custom pattern button

### 9.8 Post History Page
**Features:**
- Timeline view of all posts
- Filterable by:
  - Account
  - Platform
  - Date range
  - Viral status
  - Niche
- Each post item shows:
  - Timestamp
  - Account name
  - Platform icon
  - Content snippet
  - Current metrics
  - Viral score (color-coded)
  - View details button
- Post details modal:
  - Full content
  - All metrics over time (chart)
  - Trend it was based on
  - Predicted vs actual performance
  - Similar successful posts

### 9.9 Settings Page
**Tabs:**

**General Settings:**
- App timezone
- Default posting schedule
- Notification preferences
- API key management (OpenRouter, others)

**AI Model Settings:**
- **Default Model Selection:** Dropdown to select default AI model for all operations
- **Task-Specific Models:**
  - Content Generation Model: Premium tier recommended (Claude Opus 4, Claude Sonnet 4, GPT-4.5 Turbo, GPT-4o, OpenAI o1, Gemini 2.5 Pro, Grok 2)
  - Analysis Model: Standard tier recommended (Claude 3.5 Haiku, GPT-4o Mini, OpenAI o1/o3 Mini, Gemini 2.5 Flash, DeepSeek R1, Mistral Large)
  - Research Model: Standard tier recommended (models with good reasoning for trend research)
  - Simple Tasks Model: Budget tier available (Gemini 2.0 Flash Free, DeepSeek R1 Free, Llama 3.3 70B, Qwen 2.5 72B)
- **Model Tiers (December 2025):**
  - Premium: Claude Opus 4, Claude Sonnet 4, GPT-4.5 Turbo, GPT-4o, OpenAI o1, Gemini 2.5 Pro, Grok 2
  - Standard: Claude 3.5 Haiku, GPT-4o Mini, o1/o3 Mini, Gemini 2.5 Flash, DeepSeek R1, Mistral Large
  - Budget: Gemini 2.0 Flash (Free), DeepSeek R1 (Free), Llama 3.3 70B, Qwen 2.5 72B, Mistral Nemo
- **Test Model Button:** Send test prompt to verify model is working
- **Live Model Fetch:** Toggle to fetch available models from OpenRouter API
- **Custom Model Input:** Allow entering custom OpenRouter model IDs

**Automation Settings:**
- Cron schedule editor
- Enable/disable automation
- Batch size (posts per run)
- Error handling preferences

**Security:**
- Cron secret regeneration
- Access token management
- Webhook setup
- API rate limits

**Integrations:**
- OpenRouter API key (for AI model access)
- Social platform app credentials
- Analytics integrations
- Notification channels (email, Slack)

**Backup & Export:**
- Export all data
- Import configurations
- Backup settings
- Restore from backup

> **UI-Based Configuration:** All settings on this page (and throughout the app) are stored in Supabase and editable via the front-end UI. No developer access or `.env` file changes are required after initial deployment. Any authorized user can manage API keys, schedules, and integrations directly from the browser.

---

## 10. DEPLOYMENT SPECIFICATIONS

> **Database Requirement:** All persistent data must live inside a Supabase project (Postgres + storage). No alternative databases are supported in this blueprint.

### 10.1 File Structure
```
social-automation/
├── api/
│   ├── post.js                 # Manual posting endpoint
│   ├── cron.js                 # Automated cron job
│   ├── analytics.js            # Fetch analytics data
│   ├── accounts.js             # Account CRUD operations
│   ├── trends.js               # Trend research endpoint (7-day recency + version relevance filter)
│   └── patterns.js             # Viral patterns management
├── lib/
│   ├── db.js                   # Supabase client
│   ├── social/
│   │   ├── linkedin.js
│   │   ├── facebook.js
│   │   ├── instagram.js
│   │   └── pinterest.js
│   ├── ai/
│   │   ├── openrouter.js       # OpenRouter API client (multi-model support)
│   │   ├── trends.js           # Trend research logic (validates sources <7 days old, current version refs)
│   │   ├── content.js          # Content generation
│   │   └── analysis.js         # Viral analysis
│   └── utils/
│       ├── validation.js
│       ├── scoring.js
│       └── formatting.js
├── components/                 # React components
│   ├── Dashboard.jsx
│   ├── AccountManager.jsx
│   ├── NicheConfig.jsx
│   ├── ViralDefinition.jsx
│   ├── ContentGenerator.jsx
│   ├── Analytics.jsx
│   └── ...
├── pages/                      # Next.js pages (if using)
├── public/                     # Static assets
├── styles/                     # CSS/Tailwind
├── package.json
├── vercel.json                 # Vercel config with crons
├── .env.example                # Environment template
├── .gitignore
└── README.md
```

### 10.2 Environment Variables
```bash
# OpenRouter AI (https://openrouter.ai)
# Get your API key from: https://openrouter.ai/keys
OPENROUTER_API_KEY=sk-or-xxxxx

# Default model (can be overridden in UI settings)
# Available models by tier:
#   Premium: anthropic/claude-sonnet-4, openai/gpt-4o, google/gemini-2.5-pro
#   Standard: anthropic/claude-3.5-haiku, openai/gpt-4o-mini, google/gemini-2.5-flash
#   Budget: google/gemini-2.0-flash-exp:free, meta-llama/llama-3.1-70b-instruct
OPENROUTER_MODEL=anthropic/claude-sonnet-4

# Security
CRON_SECRET=random_secure_string_here

# Application
APP_URL=https://your-app.vercel.app
NODE_ENV=production

# Supabase (required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx
SUPABASE_DB_URL=postgresql://user:pass@db.supabase.co:5432/postgres
SUPABASE_JWT_SECRET=xxxxx

# LinkedIn
LINKEDIN_CLIENT_ID=xxxxx
LINKEDIN_CLIENT_SECRET=xxxxx

# Facebook/Instagram (Meta)
FACEBOOK_APP_ID=xxxxx
FACEBOOK_APP_SECRET=xxxxx

# Pinterest
PINTEREST_APP_ID=xxxxx
PINTEREST_APP_SECRET=xxxxx

# Optional: Notifications
SLACK_WEBHOOK_URL=xxxxx
SENDGRID_API_KEY=xxxxx

# Optional: Analytics
SENTRY_DSN=xxxxx
GOOGLE_ANALYTICS_ID=xxxxx
```

### 10.3 Vercel Configuration (vercel.json)
```json
{
  "version": 2,
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 8,14,19 * * *"
    }
  ],
  "functions": {
    "api/cron.js": {
      "maxDuration": 60,
      "memory": 1024
    },
    "api/post.js": {
      "maxDuration": 30,
      "memory": 512
    },
    "api/trends.js": {
      "maxDuration": 45,
      "memory": 512
    },
    "api/analytics.js": {
      "maxDuration": 20,
      "memory": 256
    }
  },
  "env": {
    "NODE_ENV": "production"
  },
  "build": {
    "env": {
      "NEXT_PUBLIC_API_URL": "@app_url"
    }
  }
}
```

### 10.4 Dependencies (package.json)
```json
{
  "name": "social-automation",
  "version": "2.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "deploy": "vercel --prod"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "next": "^14.0.0",
    
    "openai": "^4.20.0",  // OpenRouter uses OpenAI-compatible API
    "axios": "^1.6.0",
    
    "@supabase/supabase-js": "^2.45.0",
    
    "uuid": "^9.0.0",
    "date-fns": "^3.0.0",
    
    "recharts": "^2.10.0",
    "lucide-react": "^0.300.0",
    
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-slider": "^1.1.2",
    
    "tailwindcss": "^3.4.0",
    "clsx": "^2.1.0",
    "class-variance-authority": "^0.7.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/react": "^18.2.0",
    "@types/node": "^20.10.0"
  }
}
```

### 10.5 Deployment Steps
1. **Prepare Code:**
  - Clone/create repository
  - Add all files from structure above
  - Configure .gitignore
  - Provision Supabase project (capture URL, anon key, service role key)

2. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

3. **Login to Vercel:**
   ```bash
   vercel login
   ```

4. **Link Project:**
   ```bash
   vercel link
   ```

5. **Set Environment Variables:**
   ```bash
    vercel env add OPENROUTER_API_KEY
    vercel env add OPENROUTER_MODEL
    vercel env add CRON_SECRET
    vercel env add SUPABASE_URL
    vercel env add SUPABASE_ANON_KEY
    vercel env add SUPABASE_SERVICE_ROLE_KEY
    vercel env add SUPABASE_DB_URL
    vercel env add SUPABASE_JWT_SECRET
    # ... add all other vars
   ```

6. **Deploy:**
   ```bash
   vercel --prod
   ```

7. **Verify Cron:**
   - Check Vercel dashboard → Crons tab
   - View logs for execution confirmation

8. **Test Endpoints:**
   ```bash
   # Test manual post
   curl -X POST https://your-app.vercel.app/api/post \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   
   # Test cron (with secret)
   curl https://your-app.vercel.app/api/cron?secret=YOUR_SECRET
   ```

### 10.6 Configuration Persistence (Supabase UI)
- **Tables:**
  - `app_settings` for global toggles (timezone, schedules, viral score defaults)
  - `platform_credentials` for OAuth tokens/keys (stored encrypted with Supabase's column-level encryption or using KMS helpers)
  - `automation_profiles` for per-account batch sizes, cron preferences, and notification targets
- **Front-end workflows:**
  - Every settings form writes via Supabase client mutations; no configuration relies on static `.env` updates post-deploy.
  - Audit columns (`created_by`, `updated_by`, `updated_at`) ensure traceability when multiple teammates adjust settings.
- **Access control:**
  - RLS policies restrict edits to authenticated app users while allowing read-only access for viewers (e.g., stakeholders).
  - Service role functions (cron, posting) read the same tables, so UI changes propagate instantly to automation.
- **Portability:**
  - Provide "Export configuration" action that dumps these tables to JSON so new users can onboard without developer intervention.

---

## 11. TESTING REQUIREMENTS

### 11.1 Unit Tests
- Database operations (CRUD)
- Viral score calculations
- Content generation prompts
- API integrations (mocked)
- Validation functions
- Trend recency validator (rejects topics older than 7 days or with outdated version references)

### 11.2 Integration Tests
- End-to-end posting flow
- Cron job execution
- Engagement tracking
- Pattern analysis
- Multi-account handling

### 11.3 Manual Testing Checklist
- [ ] Add account for each platform
- [ ] Configure niche settings
- [ ] Define viral metrics
- [ ] Generate test posts
- [ ] Verify API calls to social platforms
- [ ] Check cron execution in logs
- [ ] Monitor engagement tracking
- [ ] Review analytics accuracy
- [ ] Test all UI interactions
- [ ] Verify error handling
- [ ] Check token refresh logic
- [ ] Test rate limit handling

---

## 12. SECURITY CONSIDERATIONS

### 12.1 Token Management
- **Never store tokens in database plaintext**
- Use environment variables for all secrets
- Implement token encryption at rest
- Auto-refresh expired tokens
- Rotate tokens regularly
- Log token usage for audit

### 12.2 API Security
- Validate cron secret on every request
- Rate limit all endpoints
- Input validation on all user data
- SQL injection prevention (use parameterized queries)
- XSS protection in UI
- CSRF tokens for state-changing operations

### 12.3 Data Privacy
- Encrypt sensitive user data
- GDPR compliance (data export, deletion)
- Clear retention policies
- Audit logs for data access
- Secure backup procedures

---

## 13. MONITORING & ALERTS

### 13.1 Application Monitoring
**Metrics to Track:**
- Cron job success/failure rate
- API response times
- Database query performance
- Error rates by endpoint
- Token refresh failures
- Social API rate limit hits

**Tools:**
- Vercel Analytics (free tier)
- Sentry for error tracking
- Custom logging to external service
- Uptime monitoring (UptimeRobot, Pingdom)

### 13.2 Alert Configuration
**Trigger alerts on:**
- Cron job failures (consecutive 3+ failures)
- Database connection errors
- Social API authentication failures
- Viral score anomalies (sudden drop)
- High error rates (>5% of requests)
- Token expiry warnings (7 days before)

**Notification Channels:**
- Email
- Slack webhook
- SMS (critical only)
- In-app notifications

### 13.3 Logging Strategy
```javascript
// Log levels
const LOG_LEVELS = {
  ERROR: 'error',      // System failures
  WARN: 'warn',        // Degraded performance
  INFO: 'info',        // Normal operations
  DEBUG: 'debug'       // Development details
};

// Log structure
{
  level: 'info',
  timestamp: '2024-12-02T10:00:00Z',
  source: 'api/cron',
  accountId: 'uuid',
  action: 'post_created',
  details: { ... },
  duration: 1234,  // ms
  success: true
}
```

---

## 14. PERFORMANCE OPTIMIZATION

### 14.1 Caching Strategy
- Cache trending topics (6-hour TTL, purge any source older than 7 days)
- Cache viral patterns (24-hour TTL)
- Cache account configurations (1-hour TTL)
- Cache generated content for retries
- Use Vercel Edge caching for static assets

### 14.2 Database Optimization
- Index frequently queried fields (account_id, platform, posted_at)
- Use connection pooling
- Implement read replicas for analytics
- Archive old posts (>90 days) to separate table
- Batch insert for engagement checks

### 14.3 API Optimization
- Parallel processing for multiple accounts
- Queue system for rate-limited APIs
- Batch social media posts when possible
- Implement circuit breakers for failing services
- Use compression for large payloads

---

## 15. MAINTENANCE & UPDATES

### 15.1 Regular Maintenance Tasks
**Weekly:**
- Review cron logs for errors
- Check token expiry dates
- Monitor database size
- Review top performing posts

**Monthly:**
- Update dependencies
- Rotate access tokens
- Backup database
- Review and update viral patterns
- Analyze niche performance

**Quarterly:**
- Full security audit
- Performance optimization review
- User feedback incorporation
- Feature roadmap update

### 15.2 Update Procedures
1. Test in development environment
2. Create backup of production database
3. Deploy during low-traffic hours
4. Monitor error rates post-deploy
5. Have rollback plan ready
6. Document all changes

---

## 16. FUTURE ENHANCEMENTS (Phase 2)

### 16.1 Advanced Features
- AI-powered image generation for posts
- Video content support
- Competitor analysis
- Sentiment analysis on comments
- Auto-reply to comments
- Influencer collaboration suggestions
- Content calendar view
- A/B testing framework
- Multi-language support
- WhatsApp Business API integration

### 16.2 Machine Learning Integration
- Predictive viral scoring (ML model)
- Optimal posting time prediction per account
- Content recommendation engine
- Audience segmentation
- Trend prediction (before they trend)
- Automated hashtag optimization

### 16.3 Enterprise Features
- Team collaboration (multiple users)
- Role-based access control
- White-label options
- Custom branding
- Advanced reporting
- API access for integrations
- Webhook support
- SLA guarantees

---

## 17. COST ANALYSIS

### 17.1 Infrastructure Costs (Monthly)
- **Vercel Hosting:** FREE (Hobby tier)
  - 100 GB-hours execution
  - Sufficient for 3-5 posts/day to 20+ accounts
  
- **Database (Supabase):**
  - Supabase Free tier: 500MB Postgres, 1GB bandwidth
  - Scale to Pro: ~$10-25/month depending on row/storage usage
  
- **OpenRouter API:** ~$3-15/month (varies by model choice)
  - Supports multiple models: Claude, GPT-4o, Gemini, Llama, etc.
  - ~90 API calls/month (3 posts/day × 30 days)
  - Cost varies by model: Claude Sonnet ~$3/month, GPT-4o ~$5/month, Gemini Flash ~$1/month
  - Trend research: ~$1-3/month
  - Content generation: ~$1-5/month
  - Viral analysis: ~$1-2/month

**Total Estimated Cost:** $3-10/month (free tier infra) to $20-40/month (scaled)

### 17.2 ROI Considerations
**Value Provided:**
- Manual posting time saved: 30-60 min/day = $500-1000/month (at $20/hr)
- Content ideation time: 15-30 min/day = $200-400/month
- Trend research time: 20 min/day = $200-300/month
- Analytics review: 15 min/day = $150-250/month

**Total Value:** $1000-2000/month
**ROI:** 100-200x return on investment

---

## 18. SUCCESS METRICS

### 18.1 System Performance KPIs
- Cron job success rate: >99%
- Average post generation time: <30 seconds
- API uptime: >99.9%
- Error rate: <1%
- Database query time: <100ms average

### 18.2 Content Performance KPIs
- Viral rate: Target 10-20% of posts
- Average engagement increase: +30% vs manual posting
- Time-to-viral: <48 hours
- Audience growth rate: +5-10% monthly
- Best posting time accuracy: >80%

### 18.3 Business Impact KPIs
- Time saved per account: 60+ min/day
- Cost per post: <$0.50
- Reach increase: +50% within 3 months
- Lead generation: Track conversions from posts
- Brand awareness: Track mention increase

---

## SUMMARY FOR COPILOT

**Create a full-stack social media automation system with these CRITICAL requirements:**

1. **Multi-Account Support:** Unlimited accounts for LinkedIn, Facebook, Instagram, Pinterest
2. **Niche-Based Intelligence:** Each account has configurable niche, keywords, audience, tone
3. **Viral Content Analysis:** Custom viral definitions with weighted metrics (likes, shares, comments, views, saves, CTR)
4. **Trend Research:** AI researches trending topics SPECIFIC to each account's niche
5. **Reverse Engineering:** System analyzes viral content in niche to extract patterns and replicate success
6. **Automated Posting:** Vercel cron jobs (3x daily, configurable times)
7. **Engagement Tracking:** Monitor post performance at 1hr, 6hr, 24hr, 48hr, 72hr checkpoints
8. **Analytics Dashboard:** Comprehensive reporting with charts, tables, insights
9. **Platform-Specific Content:** Different post formats optimized for each platform
10. **Production-Ready:** Error handling, security, monitoring, scalability

**Technology Stack:**
- Frontend: React with Tailwind CSS
- Backend: Vercel serverless functions (Node.js)
- Database: Supabase (Postgres + storage)
- AI: OpenRouter API (multi-model: Claude, GPT-4o, Gemini, etc.)
- Deployment: Vercel with cron jobs
- APIs: LinkedIn, Facebook, Instagram, Pinterest official APIs

**Key Differentiators:**
- Niche-specific trend research (not generic trends)
- Custom viral metric definitions per account
- Reverse-engineering of successful viral content
- Pattern library of proven viral formulas
- Predictive viral scoring
- Multi-account batch processing

Generate production-ready code following these specifications exactly.

---

## 20. DEVELOPMENT GUIDELINES

### 20.1 TDD Guard Best Practices
Follow Test-Driven Development strictly:
1. **Write tests first** – Before implementing any feature, write failing tests that define expected behavior
2. **Red-Green-Refactor** – Run tests (red), write minimal code to pass (green), then refactor
3. **Small increments** – Each change should be testable in isolation
4. **100% coverage goal** – All business logic must have corresponding tests

### 20.2 No Breaking Changes Policy
- **Test existing functionality before changes** – Run full test suite before starting any modification
- **Test after changes** – Run full test suite after every change to ensure nothing is broken
- **Backward compatibility** – New features must not alter existing API contracts or database schemas without migration
- **Feature flags** – Use feature flags for experimental functionality that might affect existing users

### 20.3 Dependency Management
- **No circular dependencies** – Code modules must have clear, one-way dependency flow
- **Loose coupling** – Components should depend on abstractions, not concrete implementations
- **Explicit imports** – All dependencies must be explicitly declared in package.json
- **Lock versions** – Use exact versions or lock files to ensure reproducible builds

### 20.4 Supabase MCP Integration
- **Schema changes via MCP** – Use Supabase MCP tools (`apply_migration`, `execute_sql`) for all database modifications
- **Migration naming** – Use descriptive snake_case names: `add_trending_topics_recency_filter`
- **Test migrations locally** – Verify migrations on a development branch before applying to production
- **RLS policies** – Always define Row Level Security policies for new tables

### 20.5 GitHub Deployment Workflow
```bash
# Pre-deployment checklist
1. Run all tests: npm test
2. Check for lint errors: npm run lint
3. Verify build: npm run build
4. Commit with descriptive message
5. Push to GitHub: git push origin main
6. Verify CI/CD pipeline passes
7. Deploy to Vercel: vercel --prod
```

### 20.6 Code Review Checklist
- [ ] All new code has corresponding tests
- [ ] Existing tests still pass
- [ ] No hardcoded secrets or credentials
- [ ] Database migrations are reversible
- [ ] API changes are documented
- [ ] Error handling is comprehensive
- [ ] Logging is appropriate (no sensitive data)
- [ ] Performance impact is acceptable