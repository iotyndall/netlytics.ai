# Graph Neural Network Matching System for Netlytics.ai

## 1. Overview
This document outlines the technical and functional requirements for the Graph Neural Network (GNN) system that powers multi-user network matching in Netlytics.ai. The system is designed to:
- Model relationships across multiple user-uploaded LinkedIn networks
- Learn latent patterns between connection profiles
- Predict potential matches, introductions, or opportunities
- Support a "Comparison Report" feature where two users share networks for mutual benefit analysis

---

## 2. Objectives
- Establish a graph-based representation of users and their connections
- Enrich the graph with metadata for better embedding generation
- Train or apply GNN models to identify:
  - Similar profiles (homophily)
  - Predictive matches (link prediction)
  - Clusters (communities of mutual interest)
- Enable users to share graphs or compare networks
- Score and rank possible introductions and opportunities

---

## 3. Key Features

### 3.1 Graph Construction
- Nodes: Individual `profiles` from each user's LinkedIn export
- Edges:
  - `connection`: a link between user and profile
  - `shared_affiliation`: same company, industry, school, etc.
  - `similar_title`: high cosine similarity between embeddings
  - `mutual_appearance`: same profile appears in multiple users' networks

### 3.2 Node Embedding Generation
- Each `profile` node is embedded using:
  - Gemini-generated sentence embedding from name, title, company, and summary
  - Additional tags and keywords
  - Connection metadata

### 3.3 GNN Architecture (Pluggable / TBD)
- Use `GraphSAGE` or `GCN` for link prediction
- Batch training with Supabase vector data or export to dedicated ML layer (e.g., PyTorch Geometric + FastAPI)
- Optional: Use precomputed embedding similarity for simpler tasks

### 3.4 Prediction & Ranking
- Match strength = similarity score + connection overlap + community clustering
- Score ranked introductions between users:
  - “You know X, Ian knows Y. Connect them for Z reason.”
- Highlight high-potential but unconnected nodes

### 3.5 Comparison Report Feature
- Allow two users to opt into graph comparison
- Generate a ranked list of:
  - Shared connections
  - Non-overlapping connections with similar roles/companies
  - Predicted strong introductions
- Format as a downloadable PDF or interactive web report

---

## 4. Graph Schema

### Table: `gnn_nodes`
- `node_id` (VARCHAR, PK)
- `embedding` (FLOAT8[])
- `type` (ENUM: profile, company, industry, keyword)
- `source_user_ids` (UUID[])
- `created_at` (TIMESTAMP)

### Table: `gnn_edges`
- `id` (BIGINT, PK)
- `source_id` (VARCHAR)
- `target_id` (VARCHAR)
- `edge_type` (VARCHAR): connection, affiliation, title_similarity, mutual
- `weight` (FLOAT)
- `properties` (JSONB)
- `created_at` (TIMESTAMPTZ)

### Table: `gnn_node_profiles`
- `node_id` (VARCHAR)
- `profile_id` (VARCHAR)
- `user_id` (UUID)
- `created_at` (TIMESTAMPTZ)

---

## 5. APIs & Endpoints

### Internal
- `generate_node_embeddings(profile_ids[])`
- `create_gnn_edges(user_id)`
- `rank_matches(user_id)`
- `compare_networks(user_a_id, user_b_id)`

### Client-Facing (via Supabase Edge Functions)
- `POST /rank-matches`: returns top 20 ranked matches for user
- `POST /compare-networks`: returns comparison report between two users

---

## 6. UI Requirements

### Insights Tab
- "Top Suggested Intros"
- "Strongest New Matches"
- Link to each profile

### Comparison Report
- Match categories:
  - Mutual Connections
  - Predicted Matches
  - Overlapping Tags / Companies
- Visual cluster chart (D3.js or similar)
- Download PDF

---

## 7. Future Enhancements
- GNN fine-tuning with user feedback
- Collaborative filtering using engagement data
- Temporal graphs (connection strength decay)
- Group matching (recommendation across multiple users)

---

## 8. Success Metrics
- Precision of top 10 recommended intros
- Engagement with comparison reports
- Growth of cross-user edge density
- Graph quality metrics (clustering coefficient, modularity)

