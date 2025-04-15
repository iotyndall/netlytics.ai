-- Create profiles table with enrichment fields
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    linkedin_url TEXT UNIQUE NOT NULL,
    email TEXT,
    company TEXT,
    title TEXT,
    -- Enrichment fields
    role_level TEXT, -- 'IC', 'Manager', 'Executive'
    job_function TEXT,
    industry TEXT,
    company_size TEXT,
    skills TEXT[],
    company_location TEXT,
    is_public BOOLEAN,
    founded_year TEXT,
    -- Additional fields
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    enriched_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE public.profiles IS 'Stores public profile information for each user.';

-- Create connections table
CREATE TABLE public.connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    connected_on TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(user_id, profile_id)
);

COMMENT ON TABLE public.connections IS 'Stores user connections imported from LinkedIn. Can be uploaded via CSV or ZIP file.';

-- Create upload_logs table
CREATE TABLE public.upload_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    num_profiles INTEGER NOT NULL,
    num_connections INTEGER NOT NULL
);

COMMENT ON TABLE public.upload_logs IS 'Tracks upload history for each user.';

-- Create users table (extends auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.users IS 'Stores user data.';

-- Create email_templates table
CREATE TABLE public.email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.email_templates IS 'Stores email templates for notifications.';

-- Create email_logs table
CREATE TABLE public.email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.email_templates(id),
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL,
    error TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.email_logs IS 'Tracks sent email notifications.';

-- Create comparison_sessions table
CREATE TABLE public.comparison_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_a_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_b_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- 'pending', 'accepted', 'rejected', 'completed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE public.comparison_sessions IS 'Tracks network comparison sessions between users.';

-- Create comparison_results table
CREATE TABLE public.comparison_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.comparison_sessions(id) ON DELETE CASCADE,
    result_type TEXT NOT NULL, -- 'mutual_connection', 'predicted_match', 'overlapping_tag'
    profile_a_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    profile_b_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    score FLOAT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.comparison_results IS 'Stores results of network comparisons.';

-- Create GNN tables
CREATE TABLE public.gnn_nodes (
    node_id TEXT PRIMARY KEY,
    embedding FLOAT8[],
    type TEXT NOT NULL, -- 'profile', 'company', 'industry', 'keyword'
    source_user_ids UUID[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.gnn_nodes IS 'Stores nodes representing entities (users, connections) within a user''s graph.';

CREATE TABLE public.gnn_edges (
    id BIGSERIAL PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES public.gnn_nodes(node_id) ON DELETE CASCADE,
    target_id TEXT NOT NULL REFERENCES public.gnn_nodes(node_id) ON DELETE CASCADE,
    edge_type TEXT NOT NULL, -- 'connection', 'affiliation', 'title_similarity', 'mutual'
    weight FLOAT,
    properties JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.gnn_edges IS 'Stores edges representing relationships between nodes in a user''s graph.';

CREATE TABLE public.gnn_node_profiles (
    node_id TEXT NOT NULL REFERENCES public.gnn_nodes(node_id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    PRIMARY KEY (node_id, profile_id, user_id)
);

COMMENT ON TABLE public.gnn_node_profiles IS 'Maps internal GNN node IDs to external profile identifiers (public.profiles) and the owning user (auth.users).';

CREATE TABLE public.gnn_model_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version TEXT NOT NULL,
    parameters JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.gnn_model_metadata IS 'Stores metadata about trained GNN models, including version, parameters, and training date.';

CREATE TABLE public.gnn_processing_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.gnn_processing_log IS 'Tracks GNN processing jobs.';

CREATE TABLE public.gnn_node_embeddings (
    node_id TEXT NOT NULL REFERENCES public.gnn_nodes(node_id) ON DELETE CASCADE,
    model_id UUID NOT NULL REFERENCES public.gnn_model_metadata(id) ON DELETE CASCADE,
    embedding FLOAT8[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    PRIMARY KEY (node_id, model_id)
);

COMMENT ON TABLE public.gnn_node_embeddings IS 'Stores vector embeddings for nodes generated by specific GNN model versions.';

CREATE TABLE public.gnn_community_clusters (
    node_id TEXT NOT NULL REFERENCES public.gnn_nodes(node_id) ON DELETE CASCADE,
    model_id UUID NOT NULL REFERENCES public.gnn_model_metadata(id) ON DELETE CASCADE,
    cluster_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    PRIMARY KEY (node_id, model_id)
);

COMMENT ON TABLE public.gnn_community_clusters IS 'Stores community/cluster assignments for nodes based on GNN model analysis.';

CREATE TABLE public.gnn_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_node_id TEXT NOT NULL REFERENCES public.gnn_nodes(node_id) ON DELETE CASCADE,
    target_node_id TEXT NOT NULL REFERENCES public.gnn_nodes(node_id) ON DELETE CASCADE,
    model_id UUID NOT NULL REFERENCES public.gnn_model_metadata(id) ON DELETE CASCADE,
    score FLOAT NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.gnn_predictions IS 'Stores link prediction scores between nodes generated by a GNN model.';

-- Create stored procedures for analytics

-- Get connections by year
CREATE OR REPLACE FUNCTION public.get_connections_by_year(user_id_param UUID)
RETURNS TABLE (
    year TEXT,
    count BIGINT
)
LANGUAGE SQL
AS $$
    SELECT 
        TO_CHAR(connected_on, 'YYYY') AS year,
        COUNT(*) AS count
    FROM 
        public.connections
    WHERE 
        user_id = user_id_param
    GROUP BY 
        year
    ORDER BY 
        year;
$$;

-- Get top companies
CREATE OR REPLACE FUNCTION public.get_top_companies(user_id_param UUID, limit_param INTEGER)
RETURNS TABLE (
    company TEXT,
    count BIGINT
)
LANGUAGE SQL
AS $$
    SELECT 
        p.company,
        COUNT(*) AS count
    FROM 
        public.connections c
    JOIN 
        public.profiles p ON c.profile_id = p.id
    WHERE 
        c.user_id = user_id_param
        AND p.company IS NOT NULL
        AND p.company != ''
    GROUP BY 
        p.company
    ORDER BY 
        count DESC
    LIMIT 
        limit_param;
$$;

-- Get top titles
CREATE OR REPLACE FUNCTION public.get_top_titles(user_id_param UUID, limit_param INTEGER)
RETURNS TABLE (
    title TEXT,
    count BIGINT
)
LANGUAGE SQL
AS $$
    SELECT 
        p.title,
        COUNT(*) AS count
    FROM 
        public.connections c
    JOIN 
        public.profiles p ON c.profile_id = p.id
    WHERE 
        c.user_id = user_id_param
        AND p.title IS NOT NULL
        AND p.title != ''
    GROUP BY 
        p.title
    ORDER BY 
        count DESC
    LIMIT 
        limit_param;
$$;

-- Get top industries
CREATE OR REPLACE FUNCTION public.get_top_industries(user_id_param UUID, limit_param INTEGER)
RETURNS TABLE (
    industry TEXT,
    count BIGINT
)
LANGUAGE SQL
AS $$
    SELECT 
        p.industry,
        COUNT(*) AS count
    FROM 
        public.connections c
    JOIN 
        public.profiles p ON c.profile_id = p.id
    WHERE 
        c.user_id = user_id_param
        AND p.industry IS NOT NULL
        AND p.industry != ''
    GROUP BY 
        p.industry
    ORDER BY 
        count DESC
    LIMIT 
        limit_param;
$$;

-- Get top skills
CREATE OR REPLACE FUNCTION public.get_top_skills(user_id_param UUID, limit_param INTEGER)
RETURNS TABLE (
    skill TEXT,
    count BIGINT
)
LANGUAGE SQL
AS $$
    SELECT 
        skill,
        COUNT(*) AS count
    FROM 
        public.connections c
    JOIN 
        public.profiles p ON c.profile_id = p.id,
        UNNEST(p.skills) AS skill
    WHERE 
        c.user_id = user_id_param
    GROUP BY 
        skill
    ORDER BY 
        count DESC
    LIMIT 
        limit_param;
$$;

-- Get seniority breakdown
CREATE OR REPLACE FUNCTION public.get_seniority_breakdown(user_id_param UUID)
RETURNS TABLE (
    role_level TEXT,
    count BIGINT
)
LANGUAGE SQL
AS $$
    SELECT 
        COALESCE(p.role_level, 'Unknown') AS role_level,
        COUNT(*) AS count
    FROM 
        public.connections c
    JOIN 
        public.profiles p ON c.profile_id = p.id
    WHERE 
        c.user_id = user_id_param
    GROUP BY 
        role_level
    ORDER BY 
        count DESC;
$$;

-- Upsert profiles batch
CREATE OR REPLACE FUNCTION public.upsert_profile_batch(profiles JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB = '{}';
    profile JSONB;
    inserted_profile RECORD;
BEGIN
    FOR profile IN SELECT * FROM jsonb_array_elements(profiles)
    LOOP
        INSERT INTO public.profiles (
            full_name,
            linkedin_url,
            email,
            company,
            title
        ) VALUES (
            profile->>'full_name',
            profile->>'linkedin_url',
            profile->>'email',
            profile->>'company',
            profile->>'title'
        )
        ON CONFLICT (linkedin_url) 
        DO UPDATE SET
            full_name = EXCLUDED.full_name,
            email = COALESCE(EXCLUDED.email, public.profiles.email),
            company = COALESCE(EXCLUDED.company, public.profiles.company),
            title = COALESCE(EXCLUDED.title, public.profiles.title)
        RETURNING id, linkedin_url INTO inserted_profile;
        
        result = result || jsonb_build_object(inserted_profile.linkedin_url, inserted_profile.id);
    END LOOP;
    
    RETURN result;
END;
$$;

-- Set up Row Level Security (RLS)

-- Enable RLS on tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparison_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparison_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gnn_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gnn_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gnn_node_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gnn_model_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gnn_processing_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gnn_node_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gnn_community_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gnn_predictions ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Profiles can be inserted by authenticated users"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Profiles can be updated by authenticated users"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (true);

-- Create policies for connections
CREATE POLICY "Users can view their own connections"
    ON public.connections
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connections"
    ON public.connections
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections"
    ON public.connections
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections"
    ON public.connections
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create policies for upload_logs
CREATE POLICY "Users can view their own upload logs"
    ON public.upload_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own upload logs"
    ON public.upload_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Create policies for users
CREATE POLICY "Users can view their own user data"
    ON public.users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own user data"
    ON public.users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Create policies for email_templates
CREATE POLICY "Email templates are viewable by authenticated users"
    ON public.email_templates
    FOR SELECT
    TO authenticated
    USING (true);

-- Create policies for email_logs
CREATE POLICY "Users can view their own email logs"
    ON public.email_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email logs"
    ON public.email_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Create policies for comparison_sessions
CREATE POLICY "Users can view their own comparison sessions"
    ON public.comparison_sessions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

CREATE POLICY "Users can insert their own comparison sessions"
    ON public.comparison_sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_a_id);

CREATE POLICY "Users can update their own comparison sessions"
    ON public.comparison_sessions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- Create policies for comparison_results
CREATE POLICY "Users can view their own comparison results"
    ON public.comparison_results
    FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.comparison_sessions cs
        WHERE cs.id = session_id
        AND (cs.user_a_id = auth.uid() OR cs.user_b_id = auth.uid())
    ));

-- Create policies for GNN tables
CREATE POLICY "Users can view GNN nodes they have access to"
    ON public.gnn_nodes
    FOR SELECT
    TO authenticated
    USING (auth.uid() = ANY(source_user_ids) OR EXISTS (
        SELECT 1 FROM public.gnn_node_profiles gnp
        WHERE gnp.node_id = node_id AND gnp.user_id = auth.uid()
    ));

CREATE POLICY "Users can view GNN edges they have access to"
    ON public.gnn_edges
    FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.gnn_nodes gn
        WHERE (gn.node_id = source_id OR gn.node_id = target_id)
        AND auth.uid() = ANY(gn.source_user_ids)
    ) OR EXISTS (
        SELECT 1 FROM public.gnn_node_profiles gnp
        WHERE (gnp.node_id = source_id OR gnp.node_id = target_id)
        AND gnp.user_id = auth.uid()
    ));

CREATE POLICY "Users can view their own GNN node profiles"
    ON public.gnn_node_profiles
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can view GNN model metadata"
    ON public.gnn_model_metadata
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can view their own GNN processing logs"
    ON public.gnn_processing_log
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can view GNN node embeddings they have access to"
    ON public.gnn_node_embeddings
    FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.gnn_nodes gn
        WHERE gn.node_id = node_id
        AND auth.uid() = ANY(gn.source_user_ids)
    ) OR EXISTS (
        SELECT 1 FROM public.gnn_node_profiles gnp
        WHERE gnp.node_id = node_id
        AND gnp.user_id = auth.uid()
    ));

CREATE POLICY "Users can view GNN community clusters they have access to"
    ON public.gnn_community_clusters
    FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.gnn_nodes gn
        WHERE gn.node_id = node_id
        AND auth.uid() = ANY(gn.source_user_ids)
    ) OR EXISTS (
        SELECT 1 FROM public.gnn_node_profiles gnp
        WHERE gnp.node_id = node_id
        AND gnp.user_id = auth.uid()
    ));

CREATE POLICY "Users can view GNN predictions they have access to"
    ON public.gnn_predictions
    FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.gnn_nodes gn
        WHERE (gn.node_id = source_node_id OR gn.node_id = target_node_id)
        AND auth.uid() = ANY(gn.source_user_ids)
    ) OR EXISTS (
        SELECT 1 FROM public.gnn_node_profiles gnp
        WHERE (gnp.node_id = source_node_id OR gnp.node_id = target_node_id)
        AND gnp.user_id = auth.uid()
    ));

-- Create trigger to create user record when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Create default email templates
INSERT INTO public.email_templates (name, subject, html_content, text_content)
VALUES
    ('enrichment_complete', 'Your LinkedIn connections have been enriched!', 
     '<h1>Enrichment Complete</h1><p>Your LinkedIn connections have been enriched with additional data. You can now view insights on your dashboard.</p>', 
     'Enrichment Complete\n\nYour LinkedIn connections have been enriched with additional data. You can now view insights on your dashboard.'),
    
    ('comparison_request', 'Network Comparison Request', 
     '<h1>Network Comparison Request</h1><p>A user has requested to compare their LinkedIn network with yours. Click the link below to accept or reject this request.</p>', 
     'Network Comparison Request\n\nA user has requested to compare their LinkedIn network with yours. Click the link below to accept or reject this request.'),
    
    ('comparison_complete', 'Your Network Comparison is Ready', 
     '<h1>Network Comparison Complete</h1><p>Your network comparison is now ready. Click the link below to view the results.</p>', 
     'Network Comparison Complete\n\nYour network comparison is now ready. Click the link below to view the results.');
