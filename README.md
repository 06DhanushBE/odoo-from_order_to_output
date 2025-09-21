# Manufacturing Management System

A comprehensive manufacturing management system built with Flask backend and React frontend.
# DEMO VIDEO

[Watch the demo video here on Google Drive](https://drive.google.com/drive/folders/1zsdynef9unJqkYJBdu-NwWQuXv5HsHeR?usp=sharing)

## Features
- 📦 **Stock Management**: Track inventory levels with real-time updates and price tracking
- 🏭 **Manufacturing Orders**: Complete order lifecycle management
- 📋 **Bill of Materials**: Manage product components and recipes
- 👷 **Work Orders**: Track production tasks and assignments
- 👤 **User Profiles**: User management with avatar upload and settings
- 📊 **Dashboard**: Real-time analytics and KPIs
- 🤖 **AI Reports**: Generate intelligent reports and insights using Groq LLM
- 📄 **PDF Export**: Export manufacturing reports and analytics
- 🔒 **Secure Authentication**: JWT-based auth with password reset

## Tech Stack
- **Backend**: Flask, PostgreSQL, SQLAlchemy, JWT Auth
- **Frontend**: React, Material-UI, Axios
- **Database**: PostgreSQL with Flask-Migrate
- **AI**: Groq LLM, LangChain, Plotly for visualizations
- **Security**: Environment-based configuration, .gitignore protection

## Quick Start

### 1. Environment Setup
```bash
# Copy and configure environment variables
cp backend/example.env backend/.env
# Edit backend/.env with your actual credentials
```
See [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md) for detailed setup instructions.

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python app.py
```

### 3. Frontend Setup  
```bash
cd frontend
npm install
npm run dev
```

### 4. Database Setup
- PostgreSQL required (configure in `.env`)
- Migrations run automatically on startup
