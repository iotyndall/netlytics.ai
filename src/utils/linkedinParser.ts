import { LinkedInContact, Profile } from '../types';

/**
 * Parse CSV content into an array of LinkedIn contacts
 */
export const parseCSV = (csvContent: string): LinkedInContact[] => {
  // Split content into lines
  const lines = csvContent.split('\n');
  
  // Find the actual header row (which starts with "First Name" or similar)
  let headerRowIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('First Name') || 
        lines[i].includes('First Name,Last Name') || 
        lines[i].includes('First Name,')) {
      headerRowIndex = i;
      break;
    }
  }
  
  // If we couldn't find the header row, try a different approach
  if (headerRowIndex === -1) {
    console.warn('Could not find header row starting with "First Name", trying alternative approach');
    // Look for any row that might be a header (contains multiple commas and common field names)
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      if (lines[i].includes(',') && 
          (lines[i].includes('Name') || lines[i].includes('Email') || lines[i].includes('URL'))) {
        headerRowIndex = i;
        break;
      }
    }
    
    // If we still can't find a header row, use the first line as a fallback
    if (headerRowIndex === -1) {
      headerRowIndex = 0;
      console.warn('Using first line as header row as fallback');
    }
  }
  
  console.log(`Using line ${headerRowIndex + 1} as header row: "${lines[headerRowIndex].substring(0, 50)}..."`);
  
  // Extract header row and find column indices
  const headerLine = lines[headerRowIndex];
  const headers = headerLine.split(',').map(header => header.trim().replace(/"/g, ''));
  
  const contacts: LinkedInContact[] = [];
  let skippedLines = 0;
  
  // Process each line (skip header and notes)
  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    if (!lines[i].trim()) {
      skippedLines++;
      continue; // Skip empty lines
    }
    
    try {
      // Split the line by comma, but respect quoted values
      // This regex matches either:
      // 1. A quoted string (which may contain commas)
      // 2. An unquoted value that doesn't contain commas
      const values = lines[i].match(/("([^"]|"")*"|[^,]*)(,|$)/g) || [];
      
      if (values.length === 0) {
        skippedLines++;
        continue; // Skip lines that couldn't be parsed
      }
      
      // Clean up the values (remove quotes and trailing commas)
      const cleanValues = values.map(val => 
        val.replace(/^"|"$|,$/g, '') // Remove quotes at start/end and trailing commas
           .replace(/""/g, '"')      // Replace double quotes with single quotes
           .trim()
      );
      
      // Create contact object by mapping headers to values
      const contact: Partial<LinkedInContact> = {};
      
      // Only process up to the number of headers we have
      const maxIndex = Math.min(headers.length, cleanValues.length);
      
      for (let j = 0; j < maxIndex; j++) {
        if (cleanValues[j]) {
          // Type assertion to handle the string assignment
          (contact as any)[headers[j]] = cleanValues[j];
        }
      }
      
      // Only add if we have at least first and last name
      if (contact['First Name'] && contact['Last Name']) {
        contacts.push(contact as LinkedInContact);
      } else {
        skippedLines++;
      }
    } catch (error) {
      console.warn(`Error parsing line ${i + 1}: ${error}`);
      skippedLines++;
    }
  }
  
  console.log(`Parsed ${contacts.length} contacts from CSV, skipped ${skippedLines} lines`);
  
  return contacts;
};

/**
 * Parse Contacts.csv content into an array of LinkedIn contacts
 */
export const parseContactsCSV = (csvContent: string): Record<string, Partial<LinkedInContact>> => {
  const lines = csvContent.split('\n');
  
  // Extract header row
  const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
  
  // Find indices for important columns
  const firstNameIndex = headers.findIndex(h => h === 'FirstName');
  const lastNameIndex = headers.findIndex(h => h === 'LastName');
  const emailsIndex = headers.findIndex(h => h === 'Emails');
  const phoneNumbersIndex = headers.findIndex(h => h === 'PhoneNumbers');
  const companiesIndex = headers.findIndex(h => h === 'Companies');
  const titleIndex = headers.findIndex(h => h === 'Title');
  
  const contactsMap: Record<string, Partial<LinkedInContact>> = {};
  
  // Process each line (skip header)
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines
    
    // Split the line by comma, but respect quoted values
    const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
    
    // Clean up the values (remove quotes)
    const cleanValues = values.map(val => val.replace(/"/g, '').trim());
    
    if (cleanValues.length <= 1) continue; // Skip lines with insufficient data
    
    const firstName = firstNameIndex >= 0 ? cleanValues[firstNameIndex] : '';
    const lastName = lastNameIndex >= 0 ? cleanValues[lastNameIndex] : '';
    
    if (!firstName || !lastName) continue; // Skip entries without name
    
    const fullName = `${firstName} ${lastName}`;
    
    // Create or update contact object
    if (!contactsMap[fullName]) {
      contactsMap[fullName] = {
        'First Name': firstName,
        'Last Name': lastName
      };
    }
    
    // Add emails if available
    if (emailsIndex >= 0 && cleanValues[emailsIndex]) {
      const emails = cleanValues[emailsIndex].split(' ').filter(Boolean);
      contactsMap[fullName]['Emails'] = emails;
      
      // If we don't have an email address yet, use the first one
      if (!contactsMap[fullName]['Email Address'] && emails.length > 0) {
        contactsMap[fullName]['Email Address'] = emails[0];
      }
    }
    
    // Add phone numbers if available
    if (phoneNumbersIndex >= 0 && cleanValues[phoneNumbersIndex]) {
      contactsMap[fullName]['Phone Numbers'] = cleanValues[phoneNumbersIndex]
        .split(' ')
        .filter(Boolean);
    }
    
    // Add company if available
    if (companiesIndex >= 0 && cleanValues[companiesIndex] && cleanValues[companiesIndex] !== 'null') {
      contactsMap[fullName]['Company'] = cleanValues[companiesIndex];
    }
    
    // Add position/title if available
    if (titleIndex >= 0 && cleanValues[titleIndex] && cleanValues[titleIndex] !== 'null') {
      contactsMap[fullName]['Position'] = cleanValues[titleIndex];
    }
  }
  
  return contactsMap;
};

/**
 * Parse PhoneNumbers.csv content
 */
export const parsePhoneNumbersCSV = (csvContent: string): Record<string, string[]> => {
  const lines = csvContent.split('\n');
  
  // Skip empty lines and headers
  const phoneNumbers: string[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Extract phone number
    const phoneNumber = line.replace(/[^\d+]/g, '').trim();
    if (phoneNumber) {
      phoneNumbers.push(phoneNumber);
    }
  }
  
  return { 'Phone Numbers': phoneNumbers };
};

/**
 * Parse WhatsApp Phone Numbers.csv content
 */
export const parseWhatsAppNumbersCSV = (csvContent: string): Record<string, { number: string, isWhatsApp: boolean }[]> => {
  const lines = csvContent.split('\n');
  
  // Extract header row
  const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
  
  // Find indices for important columns
  const numberIndex = headers.findIndex(h => h === 'Number');
  const isWhatsAppIndex = headers.findIndex(h => h === 'Is_WhatsApp_Number');
  
  const whatsappNumbers: { number: string, isWhatsApp: boolean }[] = [];
  
  // Process each line (skip header)
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines
    
    // Split the line by comma
    const values = lines[i].split(',').map(val => val.trim());
    
    if (values.length <= 1) continue; // Skip lines with insufficient data
    
    const number = numberIndex >= 0 ? values[numberIndex].replace(/[^\d+]/g, '') : '';
    const isWhatsApp = isWhatsAppIndex >= 0 ? values[isWhatsAppIndex].toLowerCase() === 'true' : false;
    
    if (number) {
      whatsappNumbers.push({ number, isWhatsApp });
    }
  }
  
  return { 'WhatsApp Numbers': whatsappNumbers };
};

/**
 * Parse Invitations.csv content into LinkedIn contacts
 */
export const parseInvitationsCSV = (csvContent: string): Record<string, Partial<LinkedInContact>> => {
  const lines = csvContent.split('\n');
  
  // Extract header row
  const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
  
  // Find indices for important columns
  const fromIndex = headers.findIndex(h => h === 'From');
  const toIndex = headers.findIndex(h => h === 'To');
  const sentAtIndex = headers.findIndex(h => h === 'Sent At');
  const messageIndex = headers.findIndex(h => h === 'Message');
  const directionIndex = headers.findIndex(h => h === 'Direction');
  const inviterProfileUrlIndex = headers.findIndex(h => h === 'inviterProfileUrl');
  const inviteeProfileUrlIndex = headers.findIndex(h => h === 'inviteeProfileUrl');
  
  const contactsMap: Record<string, Partial<LinkedInContact>> = {};
  
  // Process each line (skip header)
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines
    
    // Split the line by comma, but respect quoted values
    const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
    
    // Clean up the values (remove quotes)
    const cleanValues = values.map(val => val.replace(/"/g, '').trim());
    
    if (cleanValues.length <= 1) continue; // Skip lines with insufficient data
    
    const direction = directionIndex >= 0 ? cleanValues[directionIndex] : '';
    
    // For outgoing invitations, the recipient is the contact
    // For incoming invitations, the sender is the contact
    let contactName = '';
    let profileUrl = '';
    
    if (direction === 'OUTGOING' && toIndex >= 0) {
      contactName = cleanValues[toIndex];
      profileUrl = inviteeProfileUrlIndex >= 0 ? cleanValues[inviteeProfileUrlIndex] : '';
    } else if (direction === 'INCOMING' && fromIndex >= 0) {
      contactName = cleanValues[fromIndex];
      profileUrl = inviterProfileUrlIndex >= 0 ? cleanValues[inviterProfileUrlIndex] : '';
    } else {
      continue; // Skip if we can't determine the contact
    }
    
    // Skip if the contact name is the user's own name
    if (contactName === 'Ian Tyndall') continue;
    
    // Extract first and last name
    const nameParts = contactName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    if (!firstName) continue; // Skip if we can't extract a first name
    
    // Create or update contact object
    if (!contactsMap[contactName]) {
      contactsMap[contactName] = {
        'First Name': firstName,
        'Last Name': lastName,
        'Profile URL': profileUrl,
        'Source': 'invitation'
      };
    }
    
    // Add invitation details
    contactsMap[contactName]['Invitation Status'] = direction;
    
    if (sentAtIndex >= 0) {
      contactsMap[contactName]['Invitation Sent At'] = cleanValues[sentAtIndex];
    }
    
    if (messageIndex >= 0 && cleanValues[messageIndex]) {
      contactsMap[contactName]['Invitation Message'] = cleanValues[messageIndex];
    }
  }
  
  return contactsMap;
};

/**
 * Parse messages.csv content into LinkedIn contacts
 */
export const parseMessagesCSV = (csvContent: string): Record<string, Partial<LinkedInContact>> => {
  const lines = csvContent.split('\n');
  
  // Extract header row
  const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
  
  // Find indices for important columns
  const fromIndex = headers.findIndex(h => h === 'FROM');
  const toIndex = headers.findIndex(h => h === 'TO');
  const dateIndex = headers.findIndex(h => h === 'DATE');
  const contentIndex = headers.findIndex(h => h === 'CONTENT');
  const senderProfileUrlIndex = headers.findIndex(h => h === 'SENDER PROFILE URL');
  const recipientProfileUrlIndex = headers.findIndex(h => h === 'RECIPIENT PROFILE URLS');
  
  const contactsMap: Record<string, Partial<LinkedInContact>> = {};
  const processedConversations = new Set<string>();
  
  // Process each line (skip header)
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines
    
    // Split the line by comma, but respect quoted values
    const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
    
    // Clean up the values (remove quotes)
    const cleanValues = values.map(val => val.replace(/"/g, '').trim());
    
    if (cleanValues.length <= 1) continue; // Skip lines with insufficient data
    
    const from = fromIndex >= 0 ? cleanValues[fromIndex] : '';
    const to = toIndex >= 0 ? cleanValues[toIndex] : '';
    
    // Skip if we can't determine the participants
    if (!from || !to) continue;
    
    // Determine if the user is the sender or recipient
    const isUserSender = from === 'Ian Tyndall';
    
    // Get the contact name (the other person in the conversation)
    const contactName = isUserSender ? to : from;
    
    // Skip if the contact is the user (self-messages)
    if (contactName === 'Ian Tyndall') continue;
    
    // Get the profile URL
    const profileUrl = isUserSender 
      ? (recipientProfileUrlIndex >= 0 ? cleanValues[recipientProfileUrlIndex] : '')
      : (senderProfileUrlIndex >= 0 ? cleanValues[senderProfileUrlIndex] : '');
    
    // Extract first and last name
    const nameParts = contactName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    if (!firstName) continue; // Skip if we can't extract a first name
    
    // Create or update contact object
    if (!contactsMap[contactName]) {
      contactsMap[contactName] = {
        'First Name': firstName,
        'Last Name': lastName,
        'Profile URL': profileUrl,
        'Source': 'message'
      };
    }
    
    // Add message details (only for the most recent message)
    if (dateIndex >= 0 && contentIndex >= 0) {
      const date = cleanValues[dateIndex];
      const content = cleanValues[contentIndex];
      
      // Update if this is a more recent message or if we don't have a date yet
      if (date && (!contactsMap[contactName]['Last Message Date'] || 
          date > contactsMap[contactName]['Last Message Date']!)) {
        contactsMap[contactName]['Last Message Date'] = date;
        contactsMap[contactName]['Last Message Content'] = content;
      }
    }
  }
  
  return contactsMap;
};

/**
 * Convert LinkedIn contacts to profile objects
 */
export const contactsToProfiles = (contacts: LinkedInContact[]): Profile[] => {
  return contacts.map(contact => {
    const fullName = `${contact['First Name']} ${contact['Last Name']}`.trim();
    
    // Determine the best email to use
    let email = contact['Email Address'];
    if (!email && contact['Emails'] && contact['Emails'].length > 0) {
      // Use the first email from the Emails array if Email Address is not available
      email = contact['Emails'][0];
    }
    
    // Create a profile with all available information
    const profile: Profile = {
      id: crypto.randomUUID(), // Will be replaced by DB-generated ID
      full_name: fullName,
      linkedin_url: contact['Profile URL'] || '',
      email: email,
      company: contact['Company'],
      title: contact['Position'],
      created_at: new Date().toISOString(),
    };
    
    // Add additional metadata as tags
    const tags: string[] = [];
    
    // Add source as a tag
    if (contact['Source']) {
      tags.push(`source:${contact['Source']}`);
    }
    
    // Add phone numbers as tags
    if (contact['Phone Numbers'] && contact['Phone Numbers'].length > 0) {
      contact['Phone Numbers'].forEach(phone => {
        tags.push(`phone:${phone}`);
      });
    }
    
    if (contact['Phone Number']) {
      tags.push(`phone:${contact['Phone Number']}`);
    }
    
    // Add WhatsApp number as a tag
    if (contact['WhatsApp Number'] && contact['Is WhatsApp Number']) {
      tags.push(`whatsapp:${contact['WhatsApp Number']}`);
    }
    
    // Add multiple emails as tags
    if (contact['Emails'] && contact['Emails'].length > 0) {
      contact['Emails'].forEach((email, index) => {
        // Skip the primary email that's already in the profile.email field
        if (index === 0 && email === profile.email) return;
        tags.push(`email:${email}`);
      });
    }
    
    // Add invitation status as a tag
    if (contact['Invitation Status']) {
      tags.push(`invitation:${contact['Invitation Status'].toLowerCase()}`);
      
      // Add invitation date if available
      if (contact['Invitation Sent At']) {
        const date = new Date(contact['Invitation Sent At']);
        if (!isNaN(date.getTime())) {
          tags.push(`invitation_date:${date.toISOString().split('T')[0]}`);
        }
      }
    }
    
    // Add message information as tags
    if (contact['Last Message Date']) {
      const date = new Date(contact['Last Message Date']);
      if (!isNaN(date.getTime())) {
        tags.push(`last_message:${date.toISOString().split('T')[0]}`);
      }
    }
    
    // Only add tags if we have any
    if (tags.length > 0) {
      profile.tags = tags;
    }
    
    return profile;
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
  
  try {
    // LinkedIn format is typically MM/DD/YYYY
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const [month, day, year] = parts;
        return new Date(`${year}-${month}-${day}`).toISOString();
      }
    }
    
    // Handle "DD MMM YYYY" format (e.g., "06 Apr 2025")
    if (dateStr.match(/\d{1,2}\s[A-Za-z]{3}\s\d{4}/)) {
      return new Date(dateStr).toISOString();
    }
    
    // Handle ISO format (e.g., "2025-04-06T13:41:37 UTC")
    if (dateStr.includes('-') && dateStr.includes(':')) {
      return new Date(dateStr).toISOString();
    }
    
    // Handle "MM/DD/YY HH:MM AM/PM" format (e.g., "4/6/25 8:35 AM")
    if (dateStr.match(/\d{1,2}\/\d{1,2}\/\d{2}\s\d{1,2}:\d{2}\s[AP]M/)) {
      // Convert 2-digit year to 4-digit year
      const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2})\s(.*)/);
      if (match) {
        const [_, month, day, shortYear, timeStr] = match;
        const year = `20${shortYear}`; // Assume 20xx for 2-digit years
        return new Date(`${year}-${month}-${day} ${timeStr}`).toISOString();
      }
    }
    
    // Try to parse as a date directly
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch (error) {
    console.warn(`Failed to parse date: ${dateStr}`, error);
  }
  
  // Default to current date if parsing fails
  return new Date().toISOString();
};
