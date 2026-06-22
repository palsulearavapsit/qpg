# AI Question Paper Generator for Teachers

An advanced, responsive, and glassmorphic Single Page Application (SPA) designed to automate the process of academic question paper creation. The application supports user authentication (Teachers and HODs), document uploading with keyword-based concept extraction, and question paper generation using a custom rules-based question pool or real-time query compilation via the Google Gemini API.

## 🌟 Features

- **Double Roles Support**:
  - **Teachers**: Add/select subjects, upload notes/study guides, select syllabus topics, customize marking splits, generate Unit Tests & Semester Exams, edit/regenerate questions, and export papers.
  - **HOD (Head of Department)**: Access departmental stats, track registered faculty, view subjects, and review generated papers.
- **AI-Powered Concept Extraction**: Simulates or parses documents on-the-fly to list core syllabus concepts.
- **Two Generation Engines**:
  - **Google Gemini API**: Dynamic API generation for custom subjects when a `GEMINI_API_KEY` is provided.
  - **Rules-Based Offline Engine**: Instantly generates Machine Learning (ML) papers out-of-the-box using a database of 30+ pre-categorized questions mapped by mark values and cognitive difficulty.
- **Interactive Review Workspace**: Edit question text inline, swap/regenerate options, and re-order questions.
- **Multiple Export Formats**:
  - **Print PDF**: Uses custom `@media print` CSS rules for high-fidelity vector PDF print layouts.
  - **Word Document (DOC)**: Formats HTML into MS Word compliant editable files.
- **Supabase Integration**: Native user auth and PostgreSQL database syncing.
- **Safe Environment Variables**: Integrates a client-side `.env` dynamic loader with a secure `.gitignore` file to protect credential keys.

---

## 🛠️ Setup Instructions

### 1. Database Setup
Copy the contents of `schema.sql` into the **SQL Editor** of your [Supabase Console](https://supabase.com) and click **Run**. This will create the required tables (`profiles`, `subjects`, `materials`, `papers`), safety constraints, Row-Level Security (RLS) policies, and optimization indexes.

### 2. Add Credentials
Create a `.env` file in the root directory (based on `.env` or configuration defaults) and insert your credentials:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
GEMINI_API_KEY=your-gemini-api-key-here
```

### 3. Run Locally
Open `index.html` directly in your browser or run a simple local web server in the directory:
```bash
# Using NodeJS
npx serve .

# Using Python
python -m http.server 8000
```

---

## 📁 Project Architecture
```text
├── index.html       # Single Page Application container
├── style.css        # Responsive styling and print templates
├── app.js           # Navigation router and page events handler
├── database.js      # Supabase database client interface
├── ai_engine.js     # Topic extraction & Gemini query generator
├── config.js        # Fallback parameters and .env file fetch parser
├── schema.sql       # Database schema creation commands
├── .env             # Environment credentials configuration (ignored)
├── .gitignore       # Git rules excluding environment secrets
└── README.md        # Project guide and manuals
```
