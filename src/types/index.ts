// User profile from LinkedIn
export interface Profile {
  id: string;
  full_name: string;
  linkedin_url: string;
  email?: string;
  company?: string;
  title?: string;
  created_at: string;
  // Enrichment fields
  role_level?: 'IC' | 'Manager' | 'Executive';
  job_function?: string;
  industry?: string;
  company_size?: string;
  skills?: string[];
  company_location?: string;
  is_public?: boolean;
  founded_year?: string;
  enriched_at?: string;
  // Additional fields for enrichment (Phase 2)
  tags?: string[];
}

// Connection between a user and a profile
export interface Connection {
  id: string;
  user_id: string;
  profile_id: string;
  connected_on: string;
  created_at: string;
  // Include the profile data when fetched with join
  profiles: Profile;
}

// Upload log
export interface UploadLog {
  id: string;
  user_id: string;
  timestamp: string;
  num_profiles: number;
  num_connections: number;
}

// User
export interface User {
  id: string;
  email: string;
  created_at: string;
}

// LinkedIn CSV format
export interface LinkedInContact {
  'First Name': string;
  'Last Name': string;
  'Email Address'?: string;
  'Company'?: string;
  'Position'?: string;
  'Connected On'?: string;
  'Profile URL'?: string;
  // Additional fields from Contacts.csv
  'Emails'?: string[];
  'Phone Numbers'?: string[];
  // Additional fields from PhoneNumbers.csv
  'Phone Number'?: string;
  'Phone Type'?: string;
  // Additional fields from Whatsapp Phone Numbers.csv
  'WhatsApp Number'?: string;
  'Is WhatsApp Number'?: boolean;
  // Additional fields from Invitations.csv
  'Invitation Status'?: 'OUTGOING' | 'INCOMING' | string;
  'Invitation Sent At'?: string;
  'Invitation Message'?: string;
  // Additional fields from messages.csv
  'Last Message Date'?: string;
  'Last Message Content'?: string;
  // Source tracking
  'Source'?: 'connection' | 'contact' | 'invitation' | 'message' | string;
}

// Dashboard stats
export interface DashboardStats {
  totalConnections: number;
  connectionsByYear: Record<string, number>;
  topCompanies: Array<{ company: string; count: number }>;
  topTitles: Array<{ title: string; count: number }>;
  topIndustries?: Array<{ industry: string; count: number }>;
  topSkills?: Array<{ skill: string; count: number }>;
  seniorityBreakdown?: Array<{ role_level: string; count: number }>;
}

// Email template
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  text_content: string;
  created_at: string;
  updated_at: string;
}

// Email log
export interface EmailLog {
  id: string;
  user_id: string;
  template_id?: string;
  recipient: string;
  subject: string;
  status: string;
  error?: string;
  sent_at: string;
}

// Comparison session
export interface ComparisonSession {
  id: string;
  user_a_id: string;
  user_b_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  created_at: string;
  completed_at?: string;
}

// Comparison result
export interface ComparisonResult {
  id: string;
  session_id: string;
  result_type: 'mutual_connection' | 'predicted_match' | 'overlapping_tag';
  profile_a_id?: string;
  profile_b_id?: string;
  score?: number;
  details?: Record<string, any>;
  created_at: string;
}

// GNN node
export interface GnnNode {
  node_id: string;
  embedding?: number[];
  type: 'profile' | 'company' | 'industry' | 'keyword';
  source_user_ids: string[];
  created_at: string;
}

// GNN edge
export interface GnnEdge {
  id: string;
  source_id: string;
  target_id: string;
  edge_type: 'connection' | 'affiliation' | 'title_similarity' | 'mutual';
  weight?: number;
  properties?: Record<string, any>;
  created_at: string;
}

// GNN node profile
export interface GnnNodeProfile {
  node_id: string;
  profile_id: string;
  user_id: string;
  created_at: string;
}

// GNN model metadata
export interface GnnModelMetadata {
  id: string;
  version: string;
  parameters?: Record<string, any>;
  created_at: string;
}

// GNN processing log
export interface GnnProcessingLog {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  details?: Record<string, any>;
  created_at: string;
}

// GNN node embedding
export interface GnnNodeEmbedding {
  node_id: string;
  model_id: string;
  embedding: number[];
  created_at: string;
}

// GNN community cluster
export interface GnnCommunityCluster {
  node_id: string;
  model_id: string;
  cluster_id: number;
  created_at: string;
}

// GNN prediction
export interface GnnPrediction {
  id: string;
  source_node_id: string;
  target_node_id: string;
  model_id: string;
  score: number;
  reason?: string;
  created_at: string;
}

// Enrichment progress
export interface EnrichmentProgress {
  total: number;
  enriched: number;
  percentage: number;
}
