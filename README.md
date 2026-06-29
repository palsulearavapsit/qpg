# AI Question Paper Generator (QPG)

An academically rigorous, premium web application designed for university faculty and Heads of Departments (HOD) to manage study materials, extract key topics, and dynamically generate balanced academic question papers using Gemini AI.

---

## 🚀 Key Features

### 1. Syllabus & Module Workspaces
- **Module Segmentation**: Every subject is structured into **6 Modules** + a dedicated **Past Year Papers** section.
- **Independent Module Detail views**: Opening a module workspace presents a dedicated folder-like interface to:
  - Drag & drop study files (PDF, DOCX, PPT, TXT).
  - Inspect uploaded documents (with filename prefixing automatically managed under the hood).
  - Delete notes instantly.
  - View AI-extracted concepts/topics associated only with notes inside that module.

### 2. Unit Test Generator
- **Module Multi-Select Selector**: Permit teachers to choose which modules (1–6) are covered in the test (defaults to Module 1 & 2 for UT1).
- **Checklist-Driven Topic Mappings**: AI concepts from the selected modules are compiled as checklist inputs. Teachers can manually check/uncheck concepts before generation.
- **Strict 20-Mark Unit Test Generation**:
  - Dynamically parses the custom marking scheme split (e.g. `8 + 7 + 5`).
  - Supports structural question options (e.g., Q1A OR Q1B carrying matching marks, difficulty levels, and time weight).
- **Interactive Review Panel**:
  - Inline question text editing directly on the academic paper preview.
  - One-click question regeneration (replaces selected questions with alternative matching marks/topics/difficulty from a local question database).
  - Re-order questions (shift questions up/down).
  - Save papers to database archives.
  - Export directly to Microsoft Word (DOCX format) or Print to PDF.

### 3. Head of Department (HOD) Dashboard
- Monitor registered department teachers, assigned subjects, and generated papers count.
- Departmental archives: Browse and inspect all question papers generated across all subjects.
- Metrics stats: Track total faculty, tracked subjects, generated papers, and total uploaded study materials.

---

## 🛠️ Technology Stack

- **Core**: HTML5, Vanilla JavaScript (ES6), CSS3 custom design tokens (Inter & Outfit fonts, glassmorphism UI).
- **Database & Authentication**: Supabase (supabase-js SDK).
- **AI Model**: Gemini API (`gemini-2.5-flash` model) for concept extraction and paper generation.
- **Serverless**: Vercel Serverless Function (secure environment variable delivery).

---

## ⚙️ Setup and Installation

### Prerequisites
- Python 3.x installed (for running the local file server).
- A Supabase Project URL and Anon Key.
- A Gemini API Key from Google AI Studio.

### Steps
1. Clone the repository and navigate into the project directory.
2. Create a `.env` file at the root directory with the following variables:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-supabase-anon-key-here
   GEMINI_API_KEY=your-gemini-api-key-here
   ```
3. Alternatively, configure them directly inside `config.js`.
4. Run the startup script to start the local file server:
   ```bash
   python run.py
   ```
5. The script will automatically open the application in your default browser at **http://127.0.0.1:8000/index.html**.

---

## 🔒 Authentication Guidelines
* Access is strictly restricted to department members.
* Email registrations and logins require an address ending with `@apsit.edu.in`.
