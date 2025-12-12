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
React TypeScript Vite Tailwind CSS Recharts D3

Backend  
Node.js Express Drizzle ORM

Database  
PostgreSQL

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

# Author

Xinyang Li  
Master of Science in Computer Science  
Johns Hopkins University


