📊 Chama Manager

A Chama (savings group) management system built with Node.js, Express, and PostgreSQL (Supabase).

It helps manage:

👥 Members
💰 Contributions
🏦 Loans
📄 Member statements (PDF export)
📊 Reports (CSV/Excel export)
🔔 Notifications
⚖️ Fines and penalties
🚀 Tech Stack
Node.js + Express
PostgreSQL (Supabase)
JWT Authentication
PDFKit (statements)
XLSX (exports)
Helmet + Rate Limiting (security)
📦 Setup Instructions

1. Clone project
   git clone <your-repo-url>
   cd chama-system
2. Install dependencies
   npm install
3. Environment setup

Create a .env file:

SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
DATABASE_URL=your_supabase_pooler_connection
JWT_SECRET=your_secret_key
PORT=5000 4. Run server
Development
npm run dev
Production
npm start
🌐 API Base URL
http://localhost:5000/api
🔐 Authentication

Most routes are protected using JWT:

Authorization: Bearer <token>
📌 Core Features
👥 Members
Add member
View members
Paginated listing
💰 Contributions
Record monthly contributions
Prevent duplicate monthly entries
🏦 Loans
Issue loans with interest
Record repayments
Track balance and status
📄 Statements
View member financial summary
Download PDF statement
📊 Export Data
Export contributions → CSV / Excel
Export loans → CSV / Excel
🔔 Notifications
In-app notifications system
Manual + system-generated alerts
⚖️ Fines
Assign fines
Track outstanding balances
Record payments
🧠 Security Features
Helmet (HTTP headers protection)
Rate limiting (brute force protection)
JWT authentication
Role-based access control (admin only actions)
📁 Project Structure
server/
controllers/
routes/
middleware/
services/
utils/
config/
server.js
⚠️ Important Notes
Never commit .env to GitHub
Use Supabase Session Pooler on Windows
Ensure PostgreSQL connection is active before running server
📌 Author

Built for learning and real-world Chama digitization.
