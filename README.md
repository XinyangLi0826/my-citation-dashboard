# LLM Psychology Citation Network Dashboard

This project is an interactive visualization dashboard for exploring citation relationships between large language model research and psychology theories.

The dashboard supports analysis of cross domain knowledge flows through topic clusters citation timelines and theory level distributions.

# Features

• Bipartite graph visualization between LLM topics and psychology topics  
• Interactive node selection and highlighting  
• Citation flow line chart with overall and topic specific views  
• Multi series citation trends for selected LLM topics  
• Theory and subtopic exploration within psychology clusters  
• Citation distribution bar chart for individual theories  
• Light and dark theme toggle  

# Tech Stack

Frontend
React · Vite · TypeScript · Tailwind CSS · Recharts · D3.js · Wouter

Backend
Node.js (ESM) · Express · Drizzle ORM

Database
PostgreSQL · Neon (Serverless Postgres)

Deployment
Render · Neon

# Live Demo

🔗 Deployed on Render
👉 https://my-citation-dashboard.onrender.com/

Note: The service may take a few seconds to wake up if idle (Render free tier behavior).

# Project Structure
.
├── client/                 # Frontend (React + Vite)
│   └── src/
├── server/                 # Express backend
│   ├── routes.ts
│   ├── db.ts
│   ├── migrate-data.ts
│   └── vite.ts
├── shared/                 # Shared schema & types
├── dist/                   # Production build output
│   ├── index.js             # Bundled server
│   └── public/              # Built frontend assets
├── drizzle.config.ts
├── package.json
└── README.md

# Environment Variables

Create a .env file (for local development):

DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
PORT=5000


On Render, configure these in Environment → Environment Variables:

DATABASE_URL (Neon connection string)
PORT (Render provides this automatically, no need to set manually)

# Local Development

1. Clone the repository
git clone https://github.com/isle-dev/citation-dashboard.git
cd citation-dashboard

2. Install dependencies
npm install

3. Configure environment variables
Create a .env file in the project root:
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
PORT=5000

4. Run database migrations / seed data
npm run db:push
npx tsx server/migrate-data.ts

5. Start the development server
npm run dev

Visit:
👉 http://localhost:5000

# Interaction Guide

Click an LLM node
→ Right-top chart switches to multi-series citation trends.

Click a Psychology node
→ Bottom-left table shows subtopics & theories.

Click a theory
→ Bottom-right bar chart shows citation distribution across LLM topics.

Reset
→ Return to overall citation trends.

# Author

Xinyang Li  
Master of Science in Computer Science  
Johns Hopkins University


