# WebDev CRM

An open-source Customer Relationship Management system designed specifically for web development businesses and freelancers.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![React](https://img.shields.io/badge/react-18.2.0-61dafb.svg)

## ✨ Features

- **📋 Task Management** - Task-centered dashboard with due dates, priorities, and project linking
- **👥 Client & Company Management** - Organize contacts and organizations
- **📁 Project Tracking** - Track projects from proposal to completion with budgets and hours
- **💰 Invoicing** - Create invoices with line items, track payments, manage overdue accounts
- **🎯 Lead Pipeline** - Manage sales pipeline with lead finder and website auditing tools
- **📝 Notes & Activity** - Keep detailed communication history for all contacts
- **📊 Dashboard** - KPIs, revenue tracking, and task overview at a glance

## 🛠️ Tech Stack

**Backend:**
- Node.js + Express.js
- SQLite with better-sqlite3
- JWT Authentication
- RESTful API

**Frontend:**
- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/webdev-crm.git
   cd webdev-crm
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings (optional)
   ```

4. **Initialize the database**
   ```bash
   npm run init-db
   ```

5. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

6. **Start the servers**

   Backend (from `/backend`):
   ```bash
   npm start
   ```

   Frontend (from `/frontend`):
   ```bash
   npm run dev
   ```

7. **Open the app**
   - Frontend: http://localhost:3000
   - API: http://localhost:3001


> ⚠️ Change the default password after first login!

## 📁 Project Structure

```
webdev-crm/
├── backend/
│   ├── src/
│   │   ├── index.js          # Express server entry
│   │   ├── database/         # SQLite setup & init
│   │   ├── middleware/       # Auth middleware
│   │   └── routes/           # API routes
│   └── database/             # SQLite database file
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── context/          # React context (Auth)
│   │   ├── pages/            # Page components
│   │   ├── services/         # API service layer
│   │   └── types/            # TypeScript interfaces
│   └── index.html
└── README.md
```

## 🔌 API Endpoints

| Resource | Endpoints |
|----------|-----------|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Companies | `GET/POST /api/companies`, `GET/PUT/DELETE /api/companies/:id` |
| Clients | `GET/POST /api/clients`, `GET/PUT/DELETE /api/clients/:id` |
| Projects | `GET/POST /api/projects`, `GET/PUT/DELETE /api/projects/:id`, `POST /api/projects/:id/hours` |
| Invoices | `GET/POST /api/invoices`, `GET/PUT/DELETE /api/invoices/:id`, items & payments endpoints |
| Leads | `GET/POST /api/leads`, `GET/PUT/DELETE /api/leads/:id`, `POST /api/leads/:id/convert` |
| Tasks | `GET/POST /api/tasks`, `GET/PUT/DELETE /api/tasks/:id`, `POST /api/tasks/:id/complete` |
| Notes | `GET/POST /api/notes`, `GET/PUT/DELETE /api/notes/:id` |
| Dashboard | `GET /api/dashboard/stats`, `GET /api/dashboard/revenue` |

## 🎨 Screenshots

*Coming soon*

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by HubSpot's clean UI design
- Built for web developers, by web developers

---

Made with ❤️ for the freelance web development community
