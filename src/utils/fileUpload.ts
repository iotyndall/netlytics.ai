import JSZip from 'jszip';
import { LinkedInContact } from '../types';
import { 
  parseCSV, 
  parseContactsCSV, 
  parsePhoneNumbersCSV, 
  parseWhatsAppNumbersCSV,
  parseInvitationsCSV,
  parseMessagesCSV
} from './linkedinParser';

/**
 * Check if a file is a valid CSV or ZIP file
 */
export const isValidFileType = (file: File): boolean => {
  const validTypes = ['text/csv', 'application/zip', 'application/x-zip-compressed'];
  return validTypes.includes(file.type);
};

/**
 * Check if a file is within the size limit (10MB)
 */
export const isValidFileSize = (file: File): boolean => {
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  return file.size <= maxSize;
};

/**
 * Process a CSV file and return LinkedIn contacts
 */
export const processCSVFile = async (file: File): Promise<LinkedInContact[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const csvContent = event.target?.result as string;
        const fileName = file.name.toLowerCase();
        const contactsMap: Record<string, Partial<LinkedInContact>> = {};
        
        // Determine the type of CSV file based on the filename and content
        if (fileName.includes('connection') || csvContent.includes('First Name,Last Name') || csvContent.includes('Profile URL')) {
          // Process as Connections.csv
          const contacts = parseCSV(csvContent);
          contacts.forEach(contact => {
            const fullName = `${contact['First Name']} ${contact['Last Name']}`;
            contact['Source'] = 'connection';
            contactsMap[fullName] = contact;
          });
          console.log(`Processed ${contacts.length} contacts from Connections CSV`);
        } else if (fileName.includes('contact') || csvContent.includes('FirstName') || csvContent.includes('LastName')) {
          // Process as Contacts.csv
          const additionalContacts = parseContactsCSV(csvContent);
          Object.entries(additionalContacts).forEach(([fullName, contactInfo]) => {
            const typedContactInfo = contactInfo as Partial<LinkedInContact>;
            typedContactInfo['Source'] = 'contact';
            contactsMap[fullName] = typedContactInfo;
          });
          console.log(`Processed ${Object.keys(additionalContacts).length} contacts from Contacts CSV`);
        } else if (fileName.includes('invitation') || csvContent.includes('Direction') || csvContent.includes('inviterProfileUrl')) {
          // Process as Invitations.csv
          const invitationContacts = parseInvitationsCSV(csvContent);
          Object.entries(invitationContacts).forEach(([fullName, contactInfo]) => {
            const typedContactInfo = contactInfo as Partial<LinkedInContact>;
            typedContactInfo['Source'] = 'invitation';
            contactsMap[fullName] = typedContactInfo;
          });
          console.log(`Processed ${Object.keys(invitationContacts).length} contacts from Invitations CSV`);
        } else if (fileName.includes('message') || csvContent.includes('CONVERSATION ID') || csvContent.includes('SENDER PROFILE URL')) {
          // Process as messages.csv
          const messageContacts = parseMessagesCSV(csvContent);
          Object.entries(messageContacts).forEach(([fullName, contactInfo]) => {
            const typedContactInfo = contactInfo as Partial<LinkedInContact>;
            typedContactInfo['Source'] = 'message';
            contactsMap[fullName] = typedContactInfo;
          });
          console.log(`Processed ${Object.keys(messageContacts).length} contacts from Messages CSV`);
        } else {
          // Try to process as Connections.csv by default
          try {
            const contacts = parseCSV(csvContent);
            if (contacts.length > 0) {
              contacts.forEach(contact => {
                const fullName = `${contact['First Name']} ${contact['Last Name']}`;
                contact['Source'] = 'connection';
                contactsMap[fullName] = contact;
              });
              console.log(`Processed ${contacts.length} contacts from CSV file`);
            } else {
              throw new Error('No contacts found in the CSV file');
            }
          } catch (parseError) {
            reject(new Error('Failed to parse CSV file. The format is not recognized.'));
            return;
          }
        }
        
        // Check if we found any contacts
        if (Object.keys(contactsMap).length === 0) {
          reject(new Error('No contacts found in the CSV file. Please make sure the file contains valid LinkedIn data.'));
          return;
        }
        
        // Convert the map back to an array
        resolve(Object.values(contactsMap) as LinkedInContact[]);
      } catch (error) {
        console.error('Error processing CSV file:', error);
        reject(new Error(`Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read CSV file'));
    };
    
    reader.readAsText(file);
  });
};

/**
 * Process a ZIP file and extract LinkedIn contacts from multiple CSV files
 */
export const processZIPFile = async (file: File): Promise<LinkedInContact[]> => {
  try {
    const zipData = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(zipData);
    
    // Look for relevant CSV files in the ZIP archive
    const connectionsFile = zip.file(/connections\.csv$/i)[0];
    const contactsFile = zip.file(/contacts\.csv$/i)[0];
    const phoneNumbersFile = zip.file(/phone\s*numbers\.csv$/i)[0];
    const whatsappNumbersFile = zip.file(/whatsapp\s*phone\s*numbers\.csv$/i)[0];
    const invitationsFile = zip.file(/invitations\.csv$/i)[0];
    const messagesFile = zip.file(/messages\.csv$/i)[0];
    
    // Create a map of contacts by full name for easier merging
    const contactsMap: Record<string, Partial<LinkedInContact>> = {};
    
    // Process Connections.csv if available (primary source of contacts)
    if (connectionsFile) {
      try {
        console.log('Starting to process Connections.csv...');
        const connectionsContent = await connectionsFile.async('string');
        
        // Log the first few lines to help with debugging
        const firstFewLines = connectionsContent.split('\n').slice(0, 5).join('\n');
        console.log(`First few lines of Connections.csv:\n${firstFewLines}`);
        
        const contacts = parseCSV(connectionsContent);
        
        if (contacts.length > 0) {
          contacts.forEach(contact => {
            const fullName = `${contact['First Name']} ${contact['Last Name']}`;
            contact['Source'] = 'connection';
            contactsMap[fullName] = contact;
          });
          
          console.log(`Successfully processed ${contacts.length} contacts from Connections.csv`);
          
          // Log a sample contact for debugging
          if (contacts.length > 0) {
            console.log('Sample contact from Connections.csv:', JSON.stringify(contacts[0]));
          }
        } else {
          console.warn('No contacts found in Connections.csv');
        }
      } catch (error) {
        console.error('Failed to process Connections.csv:', error);
      }
    } else {
      console.warn('Connections.csv not found in the ZIP archive');
    }
    
    // Process Contacts.csv if available
    if (contactsFile) {
      try {
        const contactsContent = await contactsFile.async('string');
        const additionalContacts = parseContactsCSV(contactsContent);
        
        // Merge additional contact information
        Object.entries(additionalContacts).forEach(([fullName, contactInfo]) => {
          const typedContactInfo = contactInfo as Partial<LinkedInContact>;
          
          if (contactsMap[fullName]) {
            // Merge with existing contact
            if (typedContactInfo['Emails'] && typedContactInfo['Emails'].length > 0) {
              contactsMap[fullName]['Emails'] = typedContactInfo['Emails'];
              
              // If no email address yet, use the first one from Contacts.csv
              if (!contactsMap[fullName]['Email Address'] && typedContactInfo['Email Address']) {
                contactsMap[fullName]['Email Address'] = typedContactInfo['Email Address'];
              }
            }
            
            if (typedContactInfo['Phone Numbers']) {
              contactsMap[fullName]['Phone Numbers'] = typedContactInfo['Phone Numbers'];
            }
            
            // Update company and position if not already set
            if (!contactsMap[fullName]['Company'] && typedContactInfo['Company']) {
              contactsMap[fullName]['Company'] = typedContactInfo['Company'];
            }
            
            if (!contactsMap[fullName]['Position'] && typedContactInfo['Position']) {
              contactsMap[fullName]['Position'] = typedContactInfo['Position'];
            }
            
            // Update source if it's not already set
            if (!contactsMap[fullName]['Source']) {
              contactsMap[fullName]['Source'] = 'contact';
            }
          } else if (typedContactInfo['First Name'] && typedContactInfo['Last Name']) {
            // Add as a new contact if it has first and last name
            typedContactInfo['Source'] = 'contact';
            contactsMap[fullName] = typedContactInfo;
          }
        });
        
        console.log(`Processed ${Object.keys(additionalContacts).length} contacts from Contacts.csv`);
      } catch (error) {
        console.warn('Failed to process Contacts.csv:', error);
      }
    }
    
    // Process PhoneNumbers.csv if available
    if (phoneNumbersFile) {
      try {
        const phoneNumbersContent = await phoneNumbersFile.async('string');
        const phoneNumbers = parsePhoneNumbersCSV(phoneNumbersContent);
        
        // Add phone numbers to user's own profile
        // This is typically for the user's own phone numbers, not connections
        // We could store this separately if needed
        
        console.log(`Processed PhoneNumbers.csv`);
      } catch (error) {
        console.warn('Failed to process PhoneNumbers.csv:', error);
      }
    }
    
    // Process WhatsApp Phone Numbers.csv if available
    if (whatsappNumbersFile) {
      try {
        const whatsappContent = await whatsappNumbersFile.async('string');
        const whatsappNumbers = parseWhatsAppNumbersCSV(whatsappContent);
        
        // Add WhatsApp numbers to user's own profile
        // This is typically for the user's own WhatsApp numbers, not connections
        // We could store this separately if needed
        
        console.log(`Processed WhatsApp Phone Numbers.csv`);
      } catch (error) {
        console.warn('Failed to process WhatsApp Phone Numbers.csv:', error);
      }
    }
    
    // Process Invitations.csv if available
    if (invitationsFile) {
      try {
        const invitationsContent = await invitationsFile.async('string');
        const invitationContacts = parseInvitationsCSV(invitationsContent);
        
        // Merge invitation contacts
        Object.entries(invitationContacts).forEach(([fullName, contactInfo]) => {
          const typedContactInfo = contactInfo as Partial<LinkedInContact>;
          
          if (contactsMap[fullName]) {
            // Merge with existing contact
            if (typedContactInfo['Invitation Status']) {
              contactsMap[fullName]['Invitation Status'] = typedContactInfo['Invitation Status'];
            }
            
            if (typedContactInfo['Invitation Sent At']) {
              contactsMap[fullName]['Invitation Sent At'] = typedContactInfo['Invitation Sent At'];
            }
            
            if (typedContactInfo['Invitation Message']) {
              contactsMap[fullName]['Invitation Message'] = typedContactInfo['Invitation Message'];
            }
            
            // Update Profile URL if not already set
            if (!contactsMap[fullName]['Profile URL'] && typedContactInfo['Profile URL']) {
              contactsMap[fullName]['Profile URL'] = typedContactInfo['Profile URL'];
            }
          } else if (typedContactInfo['First Name'] && typedContactInfo['Last Name']) {
            // Add as a new contact
            contactsMap[fullName] = typedContactInfo as LinkedInContact;
          }
        });
        
        console.log(`Processed ${Object.keys(invitationContacts).length} contacts from Invitations.csv`);
      } catch (error) {
        console.warn('Failed to process Invitations.csv:', error);
      }
    }
    
    // Process messages.csv if available
    if (messagesFile) {
      try {
        const messagesContent = await messagesFile.async('string');
        const messageContacts = parseMessagesCSV(messagesContent);
        
        // Merge message contacts
        Object.entries(messageContacts).forEach(([fullName, contactInfo]) => {
          const typedContactInfo = contactInfo as Partial<LinkedInContact>;
          
          if (contactsMap[fullName]) {
            // Merge with existing contact
            if (typedContactInfo['Last Message Date']) {
              contactsMap[fullName]['Last Message Date'] = typedContactInfo['Last Message Date'];
            }
            
            if (typedContactInfo['Last Message Content']) {
              contactsMap[fullName]['Last Message Content'] = typedContactInfo['Last Message Content'];
            }
            
            // Update Profile URL if not already set
            if (!contactsMap[fullName]['Profile URL'] && typedContactInfo['Profile URL']) {
              contactsMap[fullName]['Profile URL'] = typedContactInfo['Profile URL'];
            }
          } else if (typedContactInfo['First Name'] && typedContactInfo['Last Name']) {
            // Add as a new contact
            contactsMap[fullName] = typedContactInfo as LinkedInContact;
          }
        });
        
        console.log(`Processed ${Object.keys(messageContacts).length} contacts from messages.csv`);
      } catch (error) {
        console.warn('Failed to process messages.csv:', error);
      }
    }
    
    // Check if we found any contacts
    if (Object.keys(contactsMap).length === 0) {
      throw new Error('No contacts found in the ZIP archive. Please make sure the file contains valid LinkedIn data.');
    }
    
    // Convert the map back to an array
    return Object.values(contactsMap) as LinkedInContact[];
  } catch (error) {
    console.error('Error processing ZIP file:', error);
    throw new Error(`Failed to process ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Process an uploaded file (CSV or ZIP) and return LinkedIn contacts
 */
export const processUploadedFile = async (file: File): Promise<LinkedInContact[]> => {
  if (!isValidFileType(file)) {
    throw new Error('Invalid file type. Please upload a CSV or ZIP file.');
  }
  
  if (!isValidFileSize(file)) {
    throw new Error('File too large. Maximum size is 10MB.');
  }
  
  if (file.type === 'text/csv') {
    return processCSVFile(file);
  } else {
    return processZIPFile(file);
  }
};
