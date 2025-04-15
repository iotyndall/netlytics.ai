# Netlytics.ai Enrichment Process Requirements

## 1. Overview

This document defines the technical and functional requirements for the Enrichment Process within Netlytics.ai. It outlines how uploaded LinkedIn CSV connection data is parsed, enriched using AI (Gemini API), and integrated into the application's insights dashboard. This also includes batch processing mechanics, fallback logic, error handling, and recent infrastructure improvements.

## 2. Functional Objectives

- Allow users to upload LinkedIn .csv or .zip files
- Parse and normalize raw connection data
- Enrich connections with:
  - Seniority level
  - Job function
  - Company industry
  - Company size
  - Skills
  - Company location
  - Public/private status
  - Company founding year
- Store enriched data for use in dashboards and filtering
- Notify users upon completion

## 3. Upload & Processing Workflow

### Step-by-Step

1. User exports LinkedIn connections from LinkedIn UI
2. User uploads .csv or .zip file to the Netlytics Upload page
3. Client parses file → validates structure
4. upsertProfilesBatch is called via RPC
5. storeConnections saves connections in batches of 200
6. enrichmentService enriches in batches of 100
7. Email notification is sent upon completion

### Batch Sizes

- Storage batch size: 200
- Enrichment batch size: 100

### LinkedIn Data Export Processing

The system processes LinkedIn data exports in both CSV and ZIP formats:

1. **ZIP File Processing**:
   - Extracts and processes multiple files from the LinkedIn data export:
     - `Connections.csv`: Primary source of contacts
     - `Contacts.csv`: Additional contact information
     - `Invitations.csv`: Pending/sent invitations
     - `messages.csv`: Message history
     - `PhoneNumbers.csv`: Phone numbers
     - `WhatsApp Phone Numbers.csv`: WhatsApp numbers
   - Merges contact information from all available files
   - Handles multi-line headers and notes in CSV files
   - Robust error handling to continue processing despite malformed lines

2. **CSV File Processing**:
   - Intelligently detects the type of CSV file based on content and filename
   - Supports direct upload of individual CSV files from the LinkedIn export
   - Handles various CSV formats and structures

3. **Contact Information Extraction**:
   - Extracts comprehensive contact details including:
     - Names, email addresses, phone numbers
     - Company and position information
     - Connection dates
     - LinkedIn profile URLs
     - Invitation status and messages
     - Message history
   - Tracks the source of each piece of information

## 4. Enrichment Logic

### Primary Method

- API: Google Gemini (LLM)
- Input: Name, Title, Company, Connected Date
- Output: JSON with fields:
  - seniority_level
  - job_function
  - industry
  - company_size
  - skills[]
  - company_location
  - is_public
  - founded_year

### Fallback Method

- Rule-based enrichment if Gemini fails
- Pattern matching:
  - Infer seniority from title keywords
  - Match company names to industry database
  - Skills based on NLP keyword extraction

## 5. Dashboard Integration

All enriched data is visualized via the Dashboard UI:

- Charts: Industry breakdown, Seniority pyramid, Skills cloud
- Table: Full connection list
- Export: CSV with enriched fields
- Real-time polling with progress updates
- Filter by enriched metadata

## 6. Notifications

- Email sent on enrichment completion
- Email templates created and validated with:
  - create-email-tables-direct.js
  - check-email-templates.js
