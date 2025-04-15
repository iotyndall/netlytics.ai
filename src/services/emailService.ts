import { supabase } from './supabase';

/**
 * Send an email to a user using a template
 */
export const sendEmail = async (userId: string, templateName: string, data: Record<string, any> = {}): Promise<boolean> => {
  try {
    // Get the user's email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      console.error('Error getting user email:', userError);
      return false;
    }
    
    // Get the email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('name', templateName)
      .single();
    
    if (templateError || !template) {
      console.error('Error getting email template:', templateError);
      return false;
    }
    
    // Replace placeholders in the template
    let htmlContent = template.html_content;
    let textContent = template.text_content;
    let subject = template.subject;
    
    // Replace placeholders in the content
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      htmlContent = htmlContent.replace(placeholder, String(value));
      textContent = textContent.replace(placeholder, String(value));
      subject = subject.replace(placeholder, String(value));
    });
    
    // Send the email using SendGrid
    const apiKey = import.meta.env.VITE_SENDGRID_API_KEY;
    const fromEmail = import.meta.env.VITE_FROM_EMAIL;
    const fromName = import.meta.env.VITE_FROM_NAME;
    
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: user.email }],
            subject: subject,
          },
        ],
        from: {
          email: fromEmail,
          name: fromName,
        },
        content: [
          {
            type: 'text/plain',
            value: textContent,
          },
          {
            type: 'text/html',
            value: htmlContent,
          },
        ],
      }),
    });
    
    if (!response.ok) {
      throw new Error(`SendGrid API error: ${response.status} ${response.statusText}`);
    }
    
    // Log the email
    await supabase.from('email_logs').insert({
      user_id: userId,
      template_id: template.id,
      recipient: user.email,
      subject: subject,
      status: 'sent',
    });
    
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    
    // Log the error
    try {
      await supabase.from('email_logs').insert({
        user_id: userId,
        template_id: null,
        recipient: '',
        subject: templateName,
        status: 'error',
        error: String(error),
      });
    } catch (logError) {
      console.error('Error logging email error:', logError);
    }
    
    return false;
  }
};

/**
 * Get email logs for a user
 */
export const getEmailLogs = async (userId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error getting email logs:', error);
    return [];
  }
};
