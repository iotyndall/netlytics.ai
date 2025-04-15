# Netlytics.ai

Netlytics.ai is a web application that enables users to upload and analyze their exported LinkedIn connection data. The app enriches this data with additional metadata and insights to help users better understand, organize, and take action on their professional networks.

## Features

- **LinkedIn Data Import**: Upload your LinkedIn connections export (.csv or .zip) and visualize your network
- **Profile Enrichment**: Automatically enrich profiles with additional metadata using AI (Gemini API)
- **Network Analytics**: Gain insights into your professional network with interactive dashboards
- **Graph Neural Network**: Advanced network analysis using GNN for connection recommendations
- **Network Comparison**: Compare your network with other users to find mutual connections and potential introductions
- **Email Notifications**: Receive updates on enrichment progress and network insights

## Technology Stack

- **Frontend**: React + Vite, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Authentication**: Supabase Auth with Google OAuth
- **AI/ML**: Google Gemini API for profile enrichment, Graph Neural Networks for recommendations
- **Email**: SendGrid for email notifications

## Project Structure

```
netlytics.ai/
├── docs/                  # Documentation
├── public/                # Static assets
├── src/
│   ├── components/        # React components
│   ├── context/           # React context providers
│   ├── pages/             # Page components
│   ├── services/          # Service modules
│   │   ├── api.ts         # API service
│   │   ├── emailService.ts # Email service
│   │   ├── enrichmentService.ts # Profile enrichment service
│   │   ├── gnnService.ts  # Graph Neural Network service
│   │   ├── index.ts       # Service barrel file
│   │   └── supabase.ts    # Supabase client
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   ├── App.css            # Global styles
│   ├── App.tsx            # Main App component
│   ├── index.css          # Entry CSS file
│   └── main.tsx           # Entry point
├── supabase/
│   ├── functions/         # Edge Functions
│   ├── migrations/        # Database migrations
│   └── schema.sql         # Database schema
├── .env                   # Environment variables
├── package.json           # Dependencies and scripts
├── tailwind.config.js     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── vite.config.ts         # Vite configuration
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Supabase account
- Google Cloud account (for Gemini API)
- SendGrid account (for email notifications)

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Gemini API Configuration
VITE_GEMINI_API_KEY=your_gemini_api_key

# Email Service Configuration
VITE_SENDGRID_API_KEY=your_sendgrid_api_key
VITE_FROM_EMAIL=noreply@yourdomain.com
VITE_FROM_NAME=Your App Name
```

### Supabase Setup

1. Create a new Supabase project
2. Set up Google OAuth:
   - Go to Authentication > Providers > Google
   - Enable Google OAuth
   - Add your Google OAuth credentials
3. Run the database schema:
   - Go to SQL Editor
   - Copy the contents of `supabase/schema.sql`
   - Run the SQL script

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/netlytics.ai.git
   cd netlytics.ai
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

## Features in Detail

### LinkedIn Data Import

Users can upload their LinkedIn connections export file (.csv or .zip containing Connections.csv). The application parses the file, extracts relevant information, and stores it in the database.

### Profile Enrichment

The application uses the Google Gemini API to enrich profiles with additional metadata:

- Seniority level (IC/Manager/Executive)
- Job function
- Company industry
- Company size
- Skills
- Company location
- Public/private status
- Company founding year

### Network Analytics

The dashboard provides various insights into the user's professional network:

- Timeline: Connection counts per year/month
- Role breakdown: Top titles and levels
- Industry and company distribution
- Skills analysis

### Graph Neural Network

The application uses Graph Neural Networks for advanced network analysis:

- Node representation: Profiles, companies, industries
- Edge representation: Connections, affiliations, similarities
- Community detection: Identify clusters in your network
- Link prediction: Recommend potential connections

### Network Comparison

Users can compare their networks with other users to find:

- Mutual connections
- Potential introductions
- Overlapping industries and companies

### Email Notifications

The application sends email notifications for:

- Enrichment completion
- Network comparison requests
- New connection recommendations

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/my-new-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
