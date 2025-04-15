import { supabase } from './supabase';
import { Profile } from '../types';
import { sendEmail } from './emailService';

// Batch size for enrichment processing
const ENRICHMENT_BATCH_SIZE = 100;

/**
 * Enriches a profile using the Gemini API
 */
export const enrichProfile = async (profile: Profile): Promise<Partial<Profile>> => {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    
    // Prepare the prompt for Gemini
    const prompt = `
      Analyze this LinkedIn profile and extract the following information in JSON format:
      
      Name: ${profile.full_name}
      Title: ${profile.title || 'N/A'}
      Company: ${profile.company || 'N/A'}
      
      Return ONLY a valid JSON object with these fields:
      {
        "seniority_level": "IC" | "Manager" | "Executive",
        "job_function": "string",
        "industry": "string",
        "company_size": "string",
        "skills": ["string"],
        "company_location": "string",
        "is_public": boolean,
        "founded_year": "string"
      }
      
      Do not include any explanations, just the JSON object.
    `;
    
    // Call the Gemini API
    const response = await fetch(`${apiUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const generatedText = data.candidates[0].content.parts[0].text;
    
    // Extract the JSON object from the response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from Gemini response');
    }
    
    const enrichedData = JSON.parse(jsonMatch[0]);
    
    // Convert skills array to PostgreSQL array format if it exists
    if (enrichedData.skills && Array.isArray(enrichedData.skills)) {
      enrichedData.skills = enrichedData.skills;
    } else {
      enrichedData.skills = [];
    }
    
    return {
      role_level: enrichedData.seniority_level as 'IC' | 'Manager' | 'Executive',
      job_function: enrichedData.job_function,
      industry: enrichedData.industry,
      company_size: enrichedData.company_size,
      skills: enrichedData.skills,
      company_location: enrichedData.company_location,
      is_public: enrichedData.is_public,
      founded_year: enrichedData.founded_year,
      enriched_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error enriching profile:', error);
    return fallbackEnrichment(profile);
  }
};

/**
 * Fallback enrichment when the Gemini API fails
 */
const fallbackEnrichment = (profile: Profile): Partial<Profile> => {
  // Extract role level from title
  let roleLevel: 'IC' | 'Manager' | 'Executive' = 'IC';
  const title = profile.title?.toLowerCase() || '';
  
  if (title.includes('ceo') || title.includes('chief') || title.includes('president') || 
      title.includes('founder') || title.includes('owner') || title.includes('partner')) {
    roleLevel = 'Executive';
  } else if (title.includes('manager') || title.includes('director') || 
             title.includes('head of') || title.includes('lead')) {
    roleLevel = 'Manager';
  }
  
  // Extract job function from title
  let jobFunction = 'Other';
  if (title.includes('engineer') || title.includes('developer') || title.includes('programmer')) {
    jobFunction = 'Engineering';
  } else if (title.includes('sales') || title.includes('account')) {
    jobFunction = 'Sales';
  } else if (title.includes('market')) {
    jobFunction = 'Marketing';
  } else if (title.includes('product')) {
    jobFunction = 'Product';
  } else if (title.includes('design')) {
    jobFunction = 'Design';
  } else if (title.includes('data') || title.includes('analyst')) {
    jobFunction = 'Data';
  } else if (title.includes('hr') || title.includes('human resources') || title.includes('recruit')) {
    jobFunction = 'HR';
  } else if (title.includes('finance') || title.includes('account')) {
    jobFunction = 'Finance';
  }
  
  // Extract industry from company
  let industry = 'Other';
  const company = profile.company?.toLowerCase() || '';
  
  if (company.includes('tech') || company.includes('software') || company.includes('app') || 
      company.includes('digital') || company.includes('computer')) {
    industry = 'Technology';
  } else if (company.includes('bank') || company.includes('finance') || company.includes('capital') || 
             company.includes('invest') || company.includes('fund')) {
    industry = 'Finance';
  } else if (company.includes('health') || company.includes('medical') || company.includes('hospital') || 
             company.includes('pharma')) {
    industry = 'Healthcare';
  } else if (company.includes('edu') || company.includes('school') || company.includes('university') || 
             company.includes('college')) {
    industry = 'Education';
  } else if (company.includes('retail') || company.includes('shop') || company.includes('store')) {
    industry = 'Retail';
  }
  
  // Extract skills from title and industry
  const skills: string[] = [];
  
  if (jobFunction === 'Engineering') {
    skills.push('Programming', 'Software Development');
    if (title.includes('frontend') || title.includes('front-end') || title.includes('ui')) {
      skills.push('Frontend Development', 'JavaScript', 'React');
    } else if (title.includes('backend') || title.includes('back-end') || title.includes('api')) {
      skills.push('Backend Development', 'API Design', 'Databases');
    } else if (title.includes('full')) {
      skills.push('Full Stack Development', 'JavaScript', 'Databases');
    } else if (title.includes('mobile')) {
      skills.push('Mobile Development', 'iOS', 'Android');
    } else if (title.includes('devops') || title.includes('cloud')) {
      skills.push('DevOps', 'Cloud Computing', 'CI/CD');
    }
  } else if (jobFunction === 'Sales') {
    skills.push('Sales', 'Negotiation', 'Client Relationship Management');
  } else if (jobFunction === 'Marketing') {
    skills.push('Marketing', 'Social Media', 'Content Creation');
    if (title.includes('digital')) {
      skills.push('Digital Marketing', 'SEO', 'SEM');
    }
  } else if (jobFunction === 'Product') {
    skills.push('Product Management', 'User Experience', 'Roadmapping');
  } else if (jobFunction === 'Design') {
    skills.push('Design', 'User Experience', 'Visual Design');
    if (title.includes('ux')) {
      skills.push('UX Design', 'User Research', 'Wireframing');
    } else if (title.includes('ui')) {
      skills.push('UI Design', 'Visual Design', 'Design Systems');
    }
  }
  
  return {
    role_level: roleLevel,
    job_function: jobFunction,
    industry: industry,
    company_size: company.length > 20 ? 'Large' : 'Small/Medium',
    skills: skills,
    company_location: 'Unknown',
    is_public: company.includes('inc') || company.includes('corp') || company.includes('ltd'),
    founded_year: 'Unknown',
    enriched_at: new Date().toISOString(),
  };
};

/**
 * Enriches profiles in batches
 */
export const enrichProfiles = async (userId: string): Promise<void> => {
  try {
    // Get profiles that need enrichment (not yet enriched)
    const { data: connections, error: connectionsError } = await supabase
      .from('connections')
      .select('profile_id')
      .eq('user_id', userId);
    
    if (connectionsError) {
      throw connectionsError;
    }
    
    if (!connections.length) {
      console.log('No connections found for enrichment');
      return;
    }
    
    const profileIds = connections.map(c => c.profile_id);
    
    // Get profiles that need enrichment
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', profileIds)
      .is('enriched_at', null);
    
    if (profilesError) {
      throw profilesError;
    }
    
    if (!profiles.length) {
      console.log('No profiles found for enrichment');
      return;
    }
    
    console.log(`Enriching ${profiles.length} profiles in batches of ${ENRICHMENT_BATCH_SIZE}`);
    
    // Process profiles in batches
    for (let i = 0; i < profiles.length; i += ENRICHMENT_BATCH_SIZE) {
      const batch = profiles.slice(i, i + ENRICHMENT_BATCH_SIZE);
      
      // Process each profile in the batch
      const enrichmentPromises = batch.map(async (profile) => {
        const enrichedData = await enrichProfile(profile);
        
        // Update the profile with enriched data
        const { error: updateError } = await supabase
          .from('profiles')
          .update(enrichedData)
          .eq('id', profile.id);
        
        if (updateError) {
          console.error(`Error updating profile ${profile.id}:`, updateError);
        }
        
        return { profileId: profile.id, success: !updateError };
      });
      
      // Wait for all profiles in the batch to be processed
      await Promise.all(enrichmentPromises);
      
      console.log(`Processed batch ${i / ENRICHMENT_BATCH_SIZE + 1} of ${Math.ceil(profiles.length / ENRICHMENT_BATCH_SIZE)}`);
    }
    
    // Send email notification
    await sendEmail(userId, 'enrichment_complete');
    
    console.log('Enrichment process completed');
  } catch (error) {
    console.error('Error in enrichment process:', error);
    throw error;
  }
};

/**
 * Get enrichment progress for a user
 */
export const getEnrichmentProgress = async (userId: string): Promise<{ total: number; enriched: number; percentage: number }> => {
  try {
    // Get total number of connections
    const { count: totalCount, error: totalError } = await supabase
      .from('connections')
      .select('profile_id', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (totalError) {
      throw totalError;
    }
    
    // Get number of enriched connections
    const { data: connections, error: connectionsError } = await supabase
      .from('connections')
      .select('profile_id')
      .eq('user_id', userId);
    
    if (connectionsError) {
      throw connectionsError;
    }
    
    if (!connections.length) {
      return { total: 0, enriched: 0, percentage: 0 };
    }
    
    const profileIds = connections.map(c => c.profile_id);
    
    const { count: enrichedCount, error: enrichedError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .in('id', profileIds)
      .not('enriched_at', 'is', null);
    
    if (enrichedError) {
      throw enrichedError;
    }
    
    const total = totalCount || 0;
    const enriched = enrichedCount || 0;
    const percentage = total > 0 ? Math.round((enriched / total) * 100) : 0;
    
    return { total, enriched, percentage };
  } catch (error) {
    console.error('Error getting enrichment progress:', error);
    return { total: 0, enriched: 0, percentage: 0 };
  }
};
