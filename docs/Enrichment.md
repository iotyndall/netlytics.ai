Netlytics.ai Enrichment Process Requirements

1. Overview

This document defines the technical and functional requirements for the Enrichment Process within Netlytics.ai. It outlines how uploaded LinkedIn CSV connection data is parsed, enriched using AI (Gemini API), and integrated into the application’s insights dashboard. This also includes batch processing mechanics, fallback logic, error handling, and recent infrastructure improvements.

2. Functional Objectives

Allow users to upload LinkedIn .csv or .zip files

Parse and normalize raw connection data

Enrich connections with:

Seniority level

Job function

Company industry

Company size

Skills

Company location

Public/private status

Company founding year

Store enriched data for use in dashboards and filtering

Notify users upon completion

3. Upload & Processing Workflow

Step-by-Step

User exports LinkedIn connections from LinkedIn UI

User uploads .csv or .zip file to the Netlytics Upload page

Client parses file → validates structure

upsertProfilesBatch is called via RPC

storeConnections saves connections in batches of 200

enrichmentService enriches in batches of 100

Email notification is sent upon completion

Batch Sizes

Storage batch size: 200

Enrichment batch size: 100

4. Enrichment Logic

Primary Method

API: Google Gemini (LLM)

Input: Name, Title, Company, Connected Date

Output: JSON with fields:

seniority_level

job_function

industry

company_size

skills[]

company_location

is_public

founded_year

Fallback Method

Rule-based enrichment if Gemini fails

Pattern matching:

Infer seniority from title keywords

Match company names to industry database

Skills based on NLP keyword extraction

5. Dashboard Integration

All enriched data is visualized via the Dashboard UI:

Charts: Industry breakdown, Seniority pyramid, Skills cloud

Table: Full connection list

Export: CSV with enriched fields

Real-time polling with progress updates

Filter by enriched metadata

6. Notifications

Email sent on enrichment completion

Email templates created and validated with:

create-email-tables-direct.js

check-email-templates.js
