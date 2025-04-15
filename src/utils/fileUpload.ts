import JSZip from 'jszip';
import { LinkedInContact } from '../types';
import { parseCSV } from './linkedinParser';

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
    
    reader.onload = (event) => {
      try {
        const csvContent = event.target?.result as string;
        const contacts = parseCSV(csvContent);
        resolve(contacts);
      } catch (error) {
        reject(new Error('Failed to parse CSV file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read CSV file'));
    };
    
    reader.readAsText(file);
  });
};

/**
 * Process a ZIP file and extract LinkedIn contacts from Connections.csv
 */
export const processZIPFile = async (file: File): Promise<LinkedInContact[]> => {
  try {
    const zipData = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(zipData);
    
    // Look for Connections.csv in the ZIP file
    const connectionsFile = zip.file(/connections\.csv$/i)[0];
    
    if (!connectionsFile) {
      throw new Error('No Connections.csv file found in the ZIP archive');
    }
    
    const csvContent = await connectionsFile.async('string');
    return parseCSV(csvContent);
  } catch (error) {
    throw new Error('Failed to process ZIP file');
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
