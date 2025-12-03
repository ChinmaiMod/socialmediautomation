# Social Media Automation - Authentication Guide

## Overview

This application uses **Supabase Authentication** to secure all functionality. Users must register and log in to access the dashboard and features.

## Authentication Features

### ✅ User Registration
- Full name, email, and password required
- Minimum 6-character password
- Email verification (configurable in Supabase)
- Automatic user profile creation

### ✅ User Login
- Email and password authentication
- Session management with cookies
- Auto-redirect after login

### ✅ Protected Routes
- All routes except `/login` and `/register` require authentication
- Middleware automatically redirects unauthenticated users to login
- User session persists across page refreshes

### ✅ Row Level Security (RLS)
- Database tables are secured with RLS policies
- Users can only access their own data:
  - Niches
  - Accounts
  - Posts
  - Automation profiles
  - Audit logs
- Shared resources (viral patterns, trending topics, models) are read-only

## Setup Instructions

### 1. Configure Supabase Environment Variables

Add these to your `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 2. Database Migrations

All necessary migrations have been applied:
- ✅ `add_user_id_columns_for_auth` - Adds user_id columns to tables
- ✅ `update_rls_policies_for_auth` - Configures Row Level Security
- ✅ User profiles table with auto-creation trigger

### 3. Supabase Auth Settings

In your Supabase dashboard (Authentication > Settings):

1. **Email Auth**: Enable email/password authentication
2. **Email Confirmation**: 
   - Disable for development (instant access)
   - Enable for production (verify email first)
3. **Site URL**: Set to your app URL (e.g., `http://localhost:3000` or `https://your-app.vercel.app`)
4. **Redirect URLs**: Add your login callback URL

### 4. Test the Authentication

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000`
   - Should redirect to `/login`

3. Click "Create one" to go to `/register`
   - Register a new account
   - Check email for verification (if enabled)

4. Sign in at `/login`
   - Access the dashboard
   - Your email shows in the sidebar
   - Click "Sign Out" to log out

## Authentication Flow

```
User visits any protected route
  ↓
Middleware checks session
  ↓
No session? → Redirect to /login
  ↓
Has session? → Allow access
  ↓
User's data filtered by user_id in database
```

## User Profile

When a user registers, a profile is automatically created in the `user_profiles` table:

```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- full_name: TEXT
- company_name: TEXT (optional)
- avatar_url: TEXT (optional)
- plan: TEXT (free/pro/enterprise)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

## API Routes & Authentication

API routes can access the authenticated user:

```typescript
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Get the user from the request
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // User is authenticated, proceed with logic
  // Database queries will automatically filter by user_id via RLS
}
```

## Security Notes

1. **Never expose `SUPABASE_SERVICE_ROLE_KEY`** in client-side code
2. **RLS policies** prevent users from accessing each other's data
3. **Middleware** protects all routes automatically
4. **User sessions** are managed securely by Supabase
5. **Password requirements**: Minimum 6 characters (configurable in Supabase)

## Troubleshooting

### "Unauthorized" errors
- Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly
- Verify user is logged in (check browser DevTools > Application > Cookies)

### Redirects to login unexpectedly
- Session may have expired (default: 7 days)
- Clear cookies and log in again

### Can't see my data
- Check RLS policies in Supabase dashboard
- Ensure `user_id` column is set correctly when creating records

### Email not sending
- Check Supabase Auth settings
- For development, disable email confirmation
- For production, configure SMTP settings

## Next Steps

Once authentication is working:
1. Connect social media accounts
2. Generate AI-powered content
3. Schedule posts
4. Track analytics

All features are automatically scoped to the logged-in user!
