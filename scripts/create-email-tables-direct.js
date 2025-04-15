/**
 * Script to create email tables directly in the database
 * 
 * Usage: node scripts/create-email-tables-direct.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createEmailTables() {
  console.log('Creating email tables...');

  try {
    // Create email_templates table
    const { error: templateError } = await supabase.rpc('create_email_templates_table');
    
    if (templateError) {
      console.error('Error creating email_templates table:', templateError);
      
      // Try direct SQL if RPC fails
      console.log('Trying direct SQL...');
      const { error: directTemplateError } = await supabase.query(`
        CREATE TABLE IF NOT EXISTS public.email_templates (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT UNIQUE NOT NULL,
          subject TEXT NOT NULL,
          html_content TEXT NOT NULL,
          text_content TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
        );
        
        COMMENT ON TABLE public.email_templates IS 'Stores email templates for notifications.';
      `);
      
      if (directTemplateError) {
        console.error('Error creating email_templates table with direct SQL:', directTemplateError);
        return;
      }
    }
    
    console.log('Email templates table created successfully');
    
    // Create email_logs table
    const { error: logError } = await supabase.rpc('create_email_logs_table');
    
    if (logError) {
      console.error('Error creating email_logs table:', logError);
      
      // Try direct SQL if RPC fails
      console.log('Trying direct SQL...');
      const { error: directLogError } = await supabase.query(`
        CREATE TABLE IF NOT EXISTS public.email_logs (
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
      `);
      
      if (directLogError) {
        console.error('Error creating email_logs table with direct SQL:', directLogError);
        return;
      }
    }
    
    console.log('Email logs table created successfully');
    
    // Enable RLS on tables
    const { error: rlsError } = await supabase.query(`
      ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
    `);
    
    if (rlsError) {
      console.error('Error enabling RLS on email tables:', rlsError);
      return;
    }
    
    console.log('RLS enabled on email tables');
    
    // Create policies for email_templates
    const { error: templatePolicyError } = await supabase.query(`
      CREATE POLICY "Email templates are viewable by authenticated users"
        ON public.email_templates
        FOR SELECT
        TO authenticated
        USING (true);
    `);
    
    if (templatePolicyError) {
      console.error('Error creating policy for email_templates:', templatePolicyError);
      return;
    }
    
    console.log('Email templates policy created successfully');
    
    // Create policies for email_logs
    const { error: logPolicyError } = await supabase.query(`
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
    `);
    
    if (logPolicyError) {
      console.error('Error creating policies for email_logs:', logPolicyError);
      return;
    }
    
    console.log('Email logs policies created successfully');
    
    // Insert default email templates
    const { error: insertError } = await supabase
      .from('email_templates')
      .upsert([
        {
          name: 'enrichment_complete',
          subject: 'Your LinkedIn connections have been enriched!',
          html_content: '<h1>Enrichment Complete</h1><p>Your LinkedIn connections have been enriched with additional data. You can now view insights on your dashboard.</p>',
          text_content: 'Enrichment Complete\n\nYour LinkedIn connections have been enriched with additional data. You can now view insights on your dashboard.',
        },
        {
          name: 'comparison_request',
          subject: 'Network Comparison Request',
          html_content: '<h1>Network Comparison Request</h1><p>A user has requested to compare their LinkedIn network with yours. Click the link below to accept or reject this request.</p>',
          text_content: 'Network Comparison Request\n\nA user has requested to compare their LinkedIn network with yours. Click the link below to accept or reject this request.',
        },
        {
          name: 'comparison_complete',
          subject: 'Your Network Comparison is Ready',
          html_content: '<h1>Network Comparison Complete</h1><p>Your network comparison is now ready. Click the link below to view the results.</p>',
          text_content: 'Network Comparison Complete\n\nYour network comparison is now ready. Click the link below to view the results.',
        },
      ], {
        onConflict: 'name',
      });
    
    if (insertError) {
      console.error('Error inserting default email templates:', insertError);
      return;
    }
    
    console.log('Default email templates inserted successfully');
    
    console.log('Email tables setup completed successfully');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createEmailTables()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
