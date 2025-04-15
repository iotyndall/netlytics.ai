/**
 * Script to check and create email templates
 * 
 * Usage: node scripts/check-email-templates.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Define default email templates
const defaultTemplates = [
  {
    name: 'enrichment_complete',
    subject: 'Your LinkedIn connections have been enriched!',
    html_content: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your LinkedIn connections have been enriched!</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          h1 {
            color: #0077B5;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            background-color: #0077B5;
            color: white;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 4px;
            margin-top: 20px;
          }
          .footer {
            margin-top: 40px;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #eee;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <h1>Enrichment Complete!</h1>
        <p>Good news! Your LinkedIn connections have been successfully enriched with additional data.</p>
        <p>We've analyzed your network and added the following information to your connections:</p>
        <ul>
          <li>Seniority levels (IC, Manager, Executive)</li>
          <li>Job functions</li>
          <li>Company industries</li>
          <li>Company sizes</li>
          <li>Skills</li>
          <li>Company locations</li>
          <li>Company public/private status</li>
          <li>Company founding years</li>
        </ul>
        <p>You can now explore these insights on your dashboard and gain a deeper understanding of your professional network.</p>
        <a href="{{dashboardUrl}}" class="button">View Your Dashboard</a>
        <div class="footer">
          <p>This email was sent by Netlytics.ai. If you have any questions, please contact us at support@netlytics.ai.</p>
          <p>© 2025 Netlytics.ai. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
    text_content: `
      Enrichment Complete!

      Good news! Your LinkedIn connections have been successfully enriched with additional data.

      We've analyzed your network and added the following information to your connections:
      - Seniority levels (IC, Manager, Executive)
      - Job functions
      - Company industries
      - Company sizes
      - Skills
      - Company locations
      - Company public/private status
      - Company founding years

      You can now explore these insights on your dashboard and gain a deeper understanding of your professional network.

      View Your Dashboard: {{dashboardUrl}}

      This email was sent by Netlytics.ai. If you have any questions, please contact us at support@netlytics.ai.
      © 2025 Netlytics.ai. All rights reserved.
    `,
  },
  {
    name: 'comparison_request',
    subject: 'Network Comparison Request',
    html_content: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Network Comparison Request</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          h1 {
            color: #0077B5;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            background-color: #0077B5;
            color: white;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 4px;
            margin-top: 20px;
            margin-right: 10px;
          }
          .button.secondary {
            background-color: #666;
          }
          .footer {
            margin-top: 40px;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #eee;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <h1>Network Comparison Request</h1>
        <p>Hello,</p>
        <p><strong>{{requesterName}}</strong> has requested to compare their LinkedIn network with yours.</p>
        <p>Network comparison allows you to discover:</p>
        <ul>
          <li>Mutual connections you share</li>
          <li>Potential introductions to valuable contacts</li>
          <li>Overlapping industries and companies</li>
          <li>Complementary skills and expertise</li>
        </ul>
        <p>Your data privacy is important to us. Only aggregated statistics and mutual connections will be shared, and you can revoke access at any time.</p>
        <div>
          <a href="{{acceptUrl}}" class="button">Accept Request</a>
          <a href="{{rejectUrl}}" class="button secondary">Decline</a>
        </div>
        <div class="footer">
          <p>This email was sent by Netlytics.ai. If you have any questions, please contact us at support@netlytics.ai.</p>
          <p>© 2025 Netlytics.ai. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
    text_content: `
      Network Comparison Request

      Hello,

      {{requesterName}} has requested to compare their LinkedIn network with yours.

      Network comparison allows you to discover:
      - Mutual connections you share
      - Potential introductions to valuable contacts
      - Overlapping industries and companies
      - Complementary skills and expertise

      Your data privacy is important to us. Only aggregated statistics and mutual connections will be shared, and you can revoke access at any time.

      Accept Request: {{acceptUrl}}
      Decline: {{rejectUrl}}

      This email was sent by Netlytics.ai. If you have any questions, please contact us at support@netlytics.ai.
      © 2025 Netlytics.ai. All rights reserved.
    `,
  },
  {
    name: 'comparison_complete',
    subject: 'Your Network Comparison is Ready',
    html_content: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Network Comparison is Ready</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          h1 {
            color: #0077B5;
            margin-bottom: 20px;
          }
          .stats {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
          }
          .stat {
            margin-bottom: 10px;
          }
          .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #0077B5;
          }
          .button {
            display: inline-block;
            background-color: #0077B5;
            color: white;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 4px;
            margin-top: 20px;
          }
          .footer {
            margin-top: 40px;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #eee;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <h1>Your Network Comparison is Ready!</h1>
        <p>Good news! Your network comparison with <strong>{{otherUserName}}</strong> is now complete.</p>
        <div class="stats">
          <div class="stat">
            <div class="stat-number">{{mutualConnectionsCount}}</div>
            <div>Mutual Connections</div>
          </div>
          <div class="stat">
            <div class="stat-number">{{potentialIntrosCount}}</div>
            <div>Potential Introductions</div>
          </div>
          <div class="stat">
            <div class="stat-number">{{overlappingTagsCount}}</div>
            <div>Overlapping Tags</div>
          </div>
        </div>
        <p>View the full comparison report to discover:</p>
        <ul>
          <li>Who you both know</li>
          <li>Potential valuable introductions</li>
          <li>Shared industries and companies</li>
          <li>Complementary skills and expertise</li>
        </ul>
        <a href="{{reportUrl}}" class="button">View Full Report</a>
        <div class="footer">
          <p>This email was sent by Netlytics.ai. If you have any questions, please contact us at support@netlytics.ai.</p>
          <p>© 2025 Netlytics.ai. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
    text_content: `
      Your Network Comparison is Ready!

      Good news! Your network comparison with {{otherUserName}} is now complete.

      Stats:
      - {{mutualConnectionsCount}} Mutual Connections
      - {{potentialIntrosCount}} Potential Introductions
      - {{overlappingTagsCount}} Overlapping Tags

      View the full comparison report to discover:
      - Who you both know
      - Potential valuable introductions
      - Shared industries and companies
      - Complementary skills and expertise

      View Full Report: {{reportUrl}}

      This email was sent by Netlytics.ai. If you have any questions, please contact us at support@netlytics.ai.
      © 2025 Netlytics.ai. All rights reserved.
    `,
  },
];

async function checkAndCreateEmailTemplates() {
  console.log('Checking email templates...');

  try {
    // Check if email_templates table exists
    const { data: tableExists, error: tableError } = await supabase.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'email_templates'
      );
    `);
    
    if (tableError) {
      console.error('Error checking if email_templates table exists:', tableError);
      return;
    }
    
    if (!tableExists || !tableExists[0] || !tableExists[0].exists) {
      console.log('Email templates table does not exist. Please run create-email-tables-direct.js first.');
      return;
    }
    
    console.log('Email templates table exists');
    
    // Get existing templates
    const { data: existingTemplates, error: templatesError } = await supabase
      .from('email_templates')
      .select('name');
    
    if (templatesError) {
      console.error('Error getting existing templates:', templatesError);
      return;
    }
    
    const existingTemplateNames = existingTemplates.map(template => template.name);
    console.log('Existing templates:', existingTemplateNames);
    
    // Insert missing templates
    for (const template of defaultTemplates) {
      if (!existingTemplateNames.includes(template.name)) {
        console.log(`Creating template: ${template.name}`);
        
        const { error: insertError } = await supabase
          .from('email_templates')
          .insert(template);
        
        if (insertError) {
          console.error(`Error creating template ${template.name}:`, insertError);
        } else {
          console.log(`Template ${template.name} created successfully`);
        }
      } else {
        console.log(`Template ${template.name} already exists`);
      }
    }
    
    console.log('Email templates check completed');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkAndCreateEmailTemplates()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
