# Arrow PH Setup Guide

This guide helps you set up the project after remixing it to ensure all features work correctly.

## Required Steps After Remixing

### 1. Database Setup
The project requires Supabase database tables to function. Run these scripts in order:

1. **Create Tables**: Run `scripts/01-create-tables.sql`
2. **Insert Permanent Token**: Run `scripts/02-insert-permanent-token.sql`

### 2. Environment Variables
Ensure these environment variables are set in your Vercel project:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 3. Supabase Integration
Make sure Supabase integration is connected in your project settings.

## Features

### Token System
- **48-hour tokens**: Users can generate temporary access tokens
- **24-hour cooldown**: Prevents spam token generation
- **Permanent token**: Admin access with token "permanent"

### Admin Panel
Access the admin panel at `/salvadoronlyadminpanel` to:
- View all generated tokens
- Monitor user sessions
- Delete tokens if needed
- View usage statistics

### Streaming
- Live TV channels with EPG (Electronic Program Guide)
- Multiple channel sources
- Real-time program information

## Troubleshooting

### "Generate Token" Button Not Appearing
- Check if database tables exist
- Verify Supabase integration is connected
- Run the setup scripts if tables are missing

### Database Errors
- Ensure all required tables are created
- Check environment variables are set correctly
- Verify Supabase connection

### EPG Not Loading
- EPG sources may be temporarily unavailable
- The app will continue to work without EPG data
- Check console for specific EPG fetch errors
