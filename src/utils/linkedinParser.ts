import { LinkedInContact, Profile } from '../types';

/**
 * Parse CSV content into an array of LinkedIn contacts
 */
export const parseCSV = (csvContent: string): LinkedInContact[] => {
  const lines = csvContent.split('\n');
  
  // Extract header row and find column indices
  const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
  
  const contacts: LinkedInContact[] = [];
  
  // Process each line (skip header)
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines
    
    // Split the line by comma, but respect quoted values
    const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
    
    // Clean up the values (remove quotes)
    const cleanValues = values.map(val => val.replace(/"/g, '').trim());
    
    // Create contact object by mapping headers to values
    const contact: Partial<LinkedInContact> = {};
    headers.forEach((header, index) => {
      if (cleanValues[index]) {
        contact[header as keyof LinkedInContact] = cleanValues[index];
      }
    });
    
    // Only add if we have at least first and last name
    if (contact['First Name'] && contact['Last Name']) {
      contacts.push(contact as LinkedInContact);
    }
  }
  
  return contacts;
};

/**
 * Convert LinkedIn contacts to profile objects
 */
export const contactsToProfiles = (contacts: LinkedInContact[]): Profile[] => {
  return contacts.map(contact => {
    const fullName = `${contact['First Name']} ${contact['Last Name']}`.trim();
    
    return {
      id: crypto.randomUUID(), // Will be replaced by DB-generated ID
      full_name: fullName,
      linkedin_url: contact['Profile URL'] || '',
      email: contact['Email Address'],
      company: contact['Company'],
      title: contact['Position'],
      created_at: new Date().toISOString(),
    };
  });
};

/**
 * Normalize and validate a profile
 */
export const normalizeProfile = (profile: Profile): Profile => {
  // Normalize fields
  const normalized: Profile = {
    ...profile,
    full_name: profile.full_name.trim(),
    linkedin_url: profile.linkedin_url.trim(),
    email: profile.email?.trim().toLowerCase(),
    company: profile.company?.trim(),
    title: profile.title?.trim(),
  };
  
  // Validate essential fields
  if (!normalized.full_name) {
    throw new Error('Profile must have a name');
  }
  
  if (!normalized.linkedin_url) {
    throw new Error('Profile must have a LinkedIn URL');
  }
  
  return normalized;
};

/**
 * Extract connection date from LinkedIn format
 */
export const parseConnectionDate = (dateStr?: string): string => {
  if (!dateStr) return new Date().toISOString();
  
  // LinkedIn format is typically MM/DD/YYYY
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [month, day, year] = parts;
    return new Date(`${year}-${month}-${day}`).toISOString();
  }
  
  return new Date().toISOString();
};
