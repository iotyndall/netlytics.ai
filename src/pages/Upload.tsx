import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { processUploadedFile } from '../utils/fileUpload';
import { contactsToProfiles, normalizeProfile, parseConnectionDate } from '../utils/linkedinParser';
import { upsertProfiles, batchInsertConnections, logUpload } from '../services/api';
import { LinkedInContact, Profile } from '../types';

const Upload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<LinkedInContact[]>([]);
  
  // Handle file selection
  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    
    try {
      // Process the file (CSV or ZIP)
      const extractedContacts = await processUploadedFile(selectedFile);
      setContacts(extractedContacts);
    } catch (err) {
      setError((err as Error).message);
      setFile(null);
    }
  };
  
  // Handle file input change
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };
  
  // Handle drag events
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };
  
  // Handle file upload button click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  // Process and upload the data
  const handleProcessData = async () => {
    if (!user || !contacts.length) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    
    try {
      // Convert contacts to profiles
      const profiles = contactsToProfiles(contacts);
      
      // Normalize and validate profiles
      const normalizedProfiles: Profile[] = [];
      for (const profile of profiles) {
        try {
          const normalized = normalizeProfile(profile);
          normalizedProfiles.push(normalized);
        } catch (err) {
          console.warn('Skipping invalid profile:', err);
        }
      }
      
      setUploadProgress(20);
      
      // Upsert profiles to database
      const savedProfiles = await upsertProfiles(normalizedProfiles);
      
      setUploadProgress(50);
      
      if (savedProfiles.length === 0) {
        throw new Error('Failed to save profiles');
      }
      
      // Create connections
      const connections = savedProfiles.map((profile, index) => {
        const contact = contacts[index];
        return {
          user_id: user.id,
          profile_id: profile.id,
          connected_on: parseConnectionDate(contact['Connected On']),
        };
      });
      
      // Batch insert connections
      const savedConnections = await batchInsertConnections(connections);
      
      setUploadProgress(80);
      
      // Log the upload
      await logUpload(user.id, savedProfiles.length, savedConnections.length);
      
      setUploadProgress(100);
      
      // Navigate to connections page
      setTimeout(() => {
        navigate('/connections');
      }, 1000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Upload LinkedIn Connections
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Upload your exported LinkedIn connections file to get started
              </p>
            </div>
            
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <div
                className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${
                  isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Upload a file</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".csv,.zip"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">CSV or ZIP up to 10MB</p>
                </div>
              </div>
              
              {file && (
                <div className="mt-4">
                  <div className="flex items-center">
                    <svg
                      className="h-5 w-5 text-green-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="ml-2 text-sm text-gray-700">
                      {file.name} ({(file.size / 1024).toFixed(2)} KB)
                    </span>
                  </div>
                  
                  <div className="mt-2">
                    <span className="text-sm text-gray-700">
                      {contacts.length} contacts found
                    </span>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="mt-4 text-sm text-red-600">
                  <p>{error}</p>
                </div>
              )}
              
              {isUploading && (
                <div className="mt-4">
                  <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                          Processing
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold inline-block text-blue-600">
                          {uploadProgress}%
                        </span>
                      </div>
                    </div>
                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                      <div
                        style={{ width: `${uploadProgress}%` }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
              <button
                type="button"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={handleProcessData}
                disabled={!file || isUploading || contacts.length === 0}
              >
                {isUploading ? 'Processing...' : 'Process Data'}
              </button>
            </div>
          </div>
          
          <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                How to Export LinkedIn Connections
              </h3>
            </div>
            
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>Log in to your LinkedIn account</li>
                <li>
                  Click on "Me" in the top navigation bar, then select "Settings & Privacy"
                </li>
                <li>
                  Go to the "Data privacy" section and click on "Get a copy of your data"
                </li>
                <li>
                  Select "Connections" and click "Request archive"
                </li>
                <li>
                  LinkedIn will email you when your data is ready to download
                </li>
                <li>
                  Download the ZIP file and upload it here, or extract and upload the Connections.csv file
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload;
