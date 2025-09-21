# Environment Setup Guide

This guide explains how to set up environment variables for the Manufacturing System.

## Quick Start

1. **Copy the example file:**
   ```bash
   cp backend/example.env backend/.env
   ```

2. **Edit the .env file:**
   Open `backend/.env` and replace placeholder values with your actual credentials.

3. **Required Variables:**
   - `DATABASE_URL` - Your database connection string
   - `SECRET_KEY` - Flask secret key (generate a random string)
   - `JWT_SECRET_KEY` - JWT signing key (different from SECRET_KEY)
   - `GROQ_API_KEY` - Your Groq API key for AI features

## Getting API Keys

### Groq API Key (Required for AI Features)
1. Visit [Groq Console](https://console.groq.com/)
2. Sign up for a free account
3. Create an API key
4. Copy the key to your `.env` file

### Email Configuration (Optional)
For Gmail, you need an App Password:
1. Enable 2-Factor Authentication
2. Visit [App Passwords](https://myaccount.google.com/apppasswords)
3. Generate an app password
4. Use this password in the `.env` file

## Security Notes

- ✅ **example.env** - Safe to commit (contains no real credentials)
- ❌ **.env** - Never commit (contains real credentials)
- ✅ The `.gitignore` file already excludes `.env` files

## Testing Your Setup

```bash
# Test database connection
python -c "from app import app, db; app.app_context().push(); print('Database:', 'OK' if db.engine.connect() else 'FAILED')"

# Test Groq API
python -c "from ai_service import ai_report_generator; ai_report_generator._ensure_llm_initialized(); print('Groq API: OK')"
```

## Troubleshooting

### Database Issues
- Check your PostgreSQL is running
- Verify connection string format
- Ensure database exists

### API Issues  
- Verify Groq API key format (starts with `gsk_`)
- Check API key permissions
- Ensure internet connection

### Email Issues
- Use App Password for Gmail (not regular password)
- Check SMTP settings for your provider
- Verify firewall allows SMTP connections