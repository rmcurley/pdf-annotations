# Admin User Invitation Setup

## Overview

The admin user invitation feature allows administrators to invite new users to the platform via email. This requires setting up the Supabase Service Role Key.

## Setup Instructions

### 1. Get Your Service Role Key

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Project Settings** (gear icon in the sidebar)
4. Click on **API** in the settings menu
5. Scroll down to the **Project API keys** section
6. Copy the **service_role** key (click the eye icon to reveal it)

### 2. Add to Environment Variables

Add the service role key to your `.env.local` file:

```bash
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key-here
```

**⚠️ IMPORTANT SECURITY NOTES:**
- The service role key has **full admin privileges** to your database
- **NEVER** commit this key to version control
- **NEVER** expose it on the client side (use only in API routes)
- Make sure `.env.local` is in your `.gitignore`

### 3. Restart Development Server

After adding the environment variable, restart your Next.js dev server:

```bash
npm run dev
```

### 4. Configure Supabase Email Templates (Optional)

You can customize the invitation email template in Supabase:

1. Go to **Authentication** > **Email Templates** in your Supabase Dashboard
2. Select **Invite user**
3. Customize the email content as needed
4. Save changes

## How It Works

### Invitation Flow

1. **Admin enters email** in the User Management modal
2. **API route validates** the request:
   - Checks if requester is an admin
   - Validates email format
   - Verifies service role key is configured
3. **Supabase creates user** and sends invitation email
4. **User receives email** with a link to set their password
5. **User clicks link**, sets password, and gains access
6. **Admin sees new user** in the user list

### Technical Details

- **API Route**: `/app/api/admin/invite-user/route.ts`
- **Method**: POST
- **Requires**: Admin authentication
- **Uses**: Supabase Admin SDK with service role key
- **Returns**: Success message or error

### User Profile Creation

When a user accepts the invitation and signs up:
- A user record is automatically created in `auth.users`
- A trigger creates a corresponding record in `public.users`
- Default role is set to `member`
- Admin can then edit the user to assign projects and change role

## Testing

### Test the Invitation Flow

1. Log in as an admin user
2. Navigate to the Admin page (admin icon in sidebar)
3. Enter an email address in the invitation field
4. Click "Invite User"
5. Check that:
   - Success toast appears
   - User list refreshes
   - Invited user appears in the list

### Check Email

The invited user should receive an email with:
- Subject: "You have been invited"
- A link to set their password
- The link redirects to `/auth/callback` after completion

## Troubleshooting

### "Server configuration error: SUPABASE_SERVICE_ROLE_KEY not set"

**Solution**: Make sure you've added the service role key to `.env.local` and restarted the dev server.

### "Failed to send invitation"

**Possible causes:**
- Invalid email format
- Email already exists in the system
- Supabase email sending is disabled
- SMTP configuration issues

**Solution**: Check the browser console and server logs for detailed error messages.

### "Forbidden - Admin access required"

**Solution**: Make sure you're logged in as a user with `role = 'admin'` in the `public.users` table.

### User doesn't receive email

**Check:**
1. Supabase email settings are configured
2. Email provider (SMTP) is set up correctly
3. Check spam folder
4. Verify email address is correct

## Production Deployment

When deploying to production:

1. **Set environment variables** on your hosting platform:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (your production domain)

2. **Configure email provider** in Supabase for reliable delivery:
   - Go to **Project Settings** > **Auth**
   - Set up custom SMTP (SendGrid, Mailgun, etc.)
   - This ensures emails don't go to spam

3. **Test thoroughly** in production before announcing to users

## Security Best Practices

✅ **DO:**
- Store service role key in environment variables only
- Use it only in server-side API routes
- Validate admin permissions before any operations
- Log invitation activities for audit trails
- Rotate keys periodically

❌ **DON'T:**
- Commit service role key to git
- Use service role key on client side
- Share service role key publicly
- Use in client components

## Related Files

- `/app/api/admin/invite-user/route.ts` - API route handler
- `/components/admin-modal.tsx` - Admin UI component
- `/.env.local` - Environment variables (not in git)
- `/middleware.ts` - Route protection

## Support

If you encounter issues, check:
1. Server logs (terminal running `npm run dev`)
2. Browser console (Network tab)
3. Supabase Dashboard > Logs
4. This documentation

For Supabase-specific issues, see: https://supabase.com/docs/guides/auth
