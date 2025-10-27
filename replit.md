# Interactive Citation Network Visualization Dashboard

## Overview

This application is an interactive data visualization dashboard that explores the citation network connections between Large Language Model (LLM) research papers and psychology theories. The system analyzes and visualizes how modern AI/ML research references foundational psychological frameworks, enabling researchers to understand cross-disciplinary knowledge flows.

The dashboard presents clustered academic papers from both domains, revealing patterns in how LLM research draws upon psychological theories like Cognitive Behavioral Therapy, Motivational Interviewing, and the Dark Triad personality traits.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- **React 18** with TypeScript for type-safe component development
- **Vite** as the build tool and development server, providing fast HMR and optimized production builds
- **Wouter** for lightweight client-side routing (replaces React Router)

**UI Component System**
- **Shadcn/ui** component library built on Radix UI primitives, configured in "new-york" style
- **Tailwind CSS** for utility-first styling with custom HSL-based color system
- Custom design tokens defined for academic data visualization (see `design_guidelines.md`)
- Dark/light theme support with CSS variables for dynamic theming

**Data Visualization**
- **D3.js v7** for custom bipartite graph visualization showing LLM-to-Psychology citation networks
  - Node labels rendered in two lines using SVG tspan elements to prevent text overlap
  - Intelligent text splitting at word boundaries for optimal readability
  - **Psychology color palette**: Social-Clinical (#BD463D red), Education (#D38341 orange), Language (#DDB405 yellow), Social Cognition (#739B5F green), Neural Mechanisms (#6388B5 blue), Psychometrics & JDM (#865FA9 purple)
  - **LLM color palette**: 8 distinct colors for Multimodal Learning, Educational Application, Model Adaptation & Efficiency, etc.
- **Recharts** for standard charts (line charts, bar charts)
  - Line chart dynamically matches selected LLM node color from BipartiteGraph
  - Enhanced line visualization with 3px stroke and 5px dots for clarity
- Custom interactive components: BipartiteGraph, CitationLineChart, TheoryBarChart, TheoryTable
- **Consistent naming**: All visualizations use unified cluster labels from clusterLabels.ts mapping
- **Color-coded visualization**: 
  - TheoryTable uses psychology cluster colors from BipartiteGraph with opacity-based intensity mapping (0.15-0.6) to represent citation counts - higher citations appear darker
  - CitationLineChart uses LLM cluster colors to match selected nodes in BipartiteGraph
  - TheoryBarChart uses LLM cluster colors for bars to match BipartiteGraph nodes

**State Management**
- **TanStack Query (React Query)** for async state management and data fetching
- Local component state with React hooks for UI interactions
- Custom hooks (`useVisualizationData`) to encapsulate data loading and transformation logic

**Design Approach**
The project follows a specialized design system combining Material Design principles with academic data visualization best practices. Key design decisions:
- Information clarity prioritized over visual effects
- Sophisticated color coding for academic categorization (8 distinct hues for LLM topics, 6 for psychology topics)
- Professional research-grade aesthetic inspired by Observable and Semantic Scholar
- HSL color space for consistent theming across light/dark modes

### Backend Architecture

**Server Framework**
- **Express.js** for HTTP server and API routing
- Minimal backend currently configured - primary purpose is serving the Vite frontend in development and static files in production
- Session management infrastructure present but not actively used (connect-pg-simple for session store)

**Development vs Production**
- Development: Vite middleware integrated into Express for HMR and fast refresh
- Production: Express serves pre-built static assets from `dist/public`
- Custom error handling middleware for consistent API error responses

**Data Storage Strategy**
- **Static JSON files** stored in `client/public/data/` containing pre-processed citation network data
- No active database queries at runtime - all data is pre-clustered and analyzed
- In-memory storage abstraction (`MemStorage`) provided for potential future user features

The decision to use static JSON files was made because:
1. Citation network data is read-only and pre-computed
2. No real-time updates required
3. Simplifies deployment and reduces infrastructure requirements
4. Faster initial load times with client-side data processing

### Data Architecture

**Dataset Structure**
The application works with multiple interconnected JSON datasets:

1. **LLM Paper Clusters** (`clustered_papers_5_*.json`): Grouped LLM research papers by topic (Multimodal Learning, Educational Application, Model Adaptation, etc.)
2. **Psychology Reference Clusters** (`clustered_refs_5_*.json`): Grouped psychology papers by subdomain (Social-Clinical, Education, Language, etc.)
3. **Theory Pool** (`psych_theory_pool_*.json`): Maps psychological theories to their citation counts and associated papers
4. **Paper Metadata** (`filtered_papers_5_info_*.json`): Detailed publication information including venues, authors, abstracts
5. **Reference Metadata** (`filtered_refs_5_info_*.json`): Metadata for cited psychology papers

**Data Loading Pattern**
- Client-side data loader (`lib/dataLoader.ts`) provides typed interfaces for all datasets
- Async loading with Promise.all for parallel fetching
- Custom hook (`useVisualizationData`) transforms raw JSON into visualization-ready formats
- Data processing includes cluster number extraction, theory ranking, citation time series generation

### External Dependencies

**Core UI Libraries**
- **@radix-ui/react-*** (multiple primitives): Accessible, unstyled component primitives for building the UI
- **class-variance-authority**: Type-safe variant styling for component APIs
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library

**Data Visualization**
- **d3**: Core visualization library for custom graph rendering
- **recharts**: Composable charting library for standard visualizations
- **@types/d3**: TypeScript definitions for D3

**State & Data Management**
- **@tanstack/react-query**: Server state management and caching
- **@hookform/resolvers + zod**: Form validation (infrastructure present for future features)

**Database & ORM (Configured but Not Active)**
- **drizzle-orm**: TypeScript ORM
- **drizzle-kit**: Schema migration toolkit  
- **@neondatabase/serverless**: Neon Postgres driver
- PostgreSQL configuration present in `drizzle.config.ts` and schema defined in `shared/schema.ts`

Note: While Drizzle and Postgres are configured, the current application does not use a database. The infrastructure exists for potential future features requiring persistent storage (user accounts, saved visualizations, annotations).

**Build & Development Tools**
- **vite**: Build tool and dev server
- **@vitejs/plugin-react**: React Fast Refresh for Vite
- **esbuild**: JavaScript bundler for server-side code
- **tsx**: TypeScript execution for Node.js (development)
- **@replit/vite-plugin-***: Replit-specific development enhancements

**Typography**
- **Inter**: Primary interface font (Google Fonts)
- **JetBrains Mono**: Monospace font for code or technical content (Google Fonts)