# WebDev CRM - Copilot Instructions

## Project Overview
An open-source CRM (Customer Relationship Management) system designed for web development businesses.

## Tech Stack
- **Backend**: Node.js with Express.js
- **Database**: SQLite with better-sqlite3
- **Frontend**: React with TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: JWT tokens
- **API**: RESTful architecture

## Project Structure
```
crm/
├── backend/           # Express.js API server
│   ├── src/
│   │   ├── routes/    # API route handlers
│   │   ├── models/    # Database models
│   │   ├── middleware/# Auth & validation middleware
│   │   └── utils/     # Helper functions
│   └── database/      # SQLite database files
├── frontend/          # React TypeScript app
│   ├── src/
│   │   ├── components/# Reusable UI components
│   │   ├── pages/     # Page components
│   │   ├── hooks/     # Custom React hooks
│   │   ├── services/  # API service functions
│   │   └── types/     # TypeScript interfaces
└── docs/              # Documentation
```

## Key Features
- Client & Company Management
- Project Tracking (Proposals → Active → Completed)
- Invoice & Payment Tracking
- Lead/Opportunity Pipeline
- Task & Deadline Management
- Notes & Communication History
- Dashboard with KPIs

## Development Guidelines
- Use TypeScript for type safety
- Follow RESTful API conventions
- Use async/await for database operations
- Implement proper error handling
- Write clear, documented code
