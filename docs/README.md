# Netlytics.ai - LinkedIn Richer App

Netlytics.ai helps professionals unlock the value of their LinkedIn network by parsing, enriching, and analyzing their connection data. Upload your exported `.csv` from LinkedIn and get AI-enhanced insights into your network's structure, trends, and opportunities.

## 🔍 What It Does

- Upload and parse LinkedIn connection exports
- Create and enrich profiles with roles, companies, and tags
- Visualize trends across industries, connection time, job changes
- Filter and search contacts for targeted outreach
- (Coming Soon) AI-powered outreach and segmentation tools

---

## 📁 Features

### ✅ Core Features

| Feature                  | Description |
|--------------------------|-------------|
| CSV/ZIP Upload           | Drag & drop LinkedIn `.csv` or `.zip` |
| Profile Creation         | Create unique profile records with conflict handling |
| Connection Linking       | Links uploaded profiles to your account |
| Dashboard                | Timeline, role, and company-level trends |
| Search & Filter          | Text search and metadata filters |
| Auth                     | Google OAuth via Supabase |

### 🧠 Coming Soon (Planned)

- Role seniority detection
- Industry classification
- AI-generated connection tags
- GPT-powered outreach messages
- Network cluster detection

---

## 🧱 Architecture

### Frontend
- Framework: **React.js** (Vercel)
- Pages: Upload, Profile Table, Insights Dashboard
- Auth: Supabase Google OAuth

### Backend
- Platform: **Supabase**
- DB: Postgres
- Functions:
  - `upsert_profile_batch`
  - `batch_insert_connections`

### Database Tables
- `profiles`: Enriched profile data
- `connections`: Links user to profiles
- `users`: Authenticated users
- `upload_logs` (planned): Upload history

---

## ⚙️ Setup Instructions

```bash
# Clone the repo
git clone https://github.com/iotyndall/netlytics.git
cd netlytics

# Install dependencies
npm install

# Start local dev server
npm run dev
