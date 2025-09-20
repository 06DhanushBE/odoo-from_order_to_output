# Manufacturing Management System

## Overview

This is a full-stack manufacturing management web application designed to help businesses create, track, and manage manufacturing orders. The system provides comprehensive functionality for managing bills of materials (BOMs), tracking inventory levels, and overseeing the complete manufacturing workflow from planning to completion.

The application serves manufacturing companies that need to organize their production processes, manage raw materials and components, and track order status through various stages of completion. It supports role-based access control for different types of users including managers, operators, and administrators.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18+ with modern hooks and functional components
- **UI Library**: Material-UI (MUI) for consistent, professional styling
- **Routing**: React Router DOM for client-side navigation
- **State Management**: React Context API for authentication and global state
- **Build Tool**: Vite for fast development and optimized production builds
- **Styling**: Emotion for CSS-in-JS styling capabilities

### Backend Architecture
- **Framework**: Flask (Python) providing RESTful API endpoints
- **Database ORM**: SQLAlchemy for database operations and model definitions
- **Authentication**: JWT (JSON Web Tokens) for secure API access
- **CORS**: Flask-CORS for cross-origin resource sharing
- **Security**: Werkzeug for password hashing and security utilities

### Database Design
The system uses a relational database structure with the following core entities:
- **Users**: Role-based user management (Manager, Operator, Admin)
- **Manufacturing Orders**: Central entity tracking production orders with status workflow
- **Bills of Materials (BOMs)**: Recipe definitions for manufacturing products
- **Components**: Raw materials and parts inventory tracking
- **BOM Components**: Many-to-many relationship between BOMs and required components
- **Work Orders**: Detailed task tracking within manufacturing orders

The database schema supports complex manufacturing workflows with proper foreign key relationships and enumerated status fields for consistent state management.

### API Structure
- RESTful API design with clear endpoint naming conventions
- JWT-based authentication middleware for protected routes
- Structured error handling and response formatting
- API versioning through URL prefixes (/api/)

### Authentication & Authorization
- JWT token-based authentication system
- Role-based access control with three user types
- Automatic token refresh and logout on expiration
- Secure password hashing using Werkzeug utilities

## External Dependencies

### Frontend Dependencies
- **@emotion/react & @emotion/styled**: CSS-in-JS styling system
- **@mui/material & @mui/icons-material**: Material Design component library
- **axios**: HTTP client for API communication
- **react-router-dom**: Client-side routing
- **vite**: Modern build tool and development server

### Backend Dependencies
- **Flask**: Lightweight web framework for Python
- **Flask-SQLAlchemy**: Database ORM integration
- **Flask-CORS**: Cross-origin resource sharing support
- **PyJWT**: JSON Web Token implementation
- **python-dotenv**: Environment variable management
- **Werkzeug**: Security utilities for password hashing

### Database
- **PostgreSQL**: Primary database for persistent data storage
- Expected to be configured via DATABASE_URL environment variable
- SQLAlchemy provides database abstraction layer

## Recent Changes

**September 20, 2025**: Complete manufacturing management application implemented with all specified requirements:
- Full-stack application with React frontend and Flask backend
- Complete PostgreSQL database schema with all entities and relationships
- JWT authentication system with protected routes  
- All required API endpoints for manufacturing orders, BOMs, inventory, and dashboard
- Material-UI interface with professional layout and navigation
- Sample data seeded including admin user (admin@example.com / admin123)
- Both development servers configured and running successfully

### Development Environment
- **Frontend Server**: React with Vite running on port 5000 with Material-UI components
- **Backend Server**: Flask API running on port 8000 with JWT authentication
- **Database**: PostgreSQL with complete schema and sample data
- Environment variable configuration for database connections and secrets
- CORS configuration for cross-origin requests between frontend and backend