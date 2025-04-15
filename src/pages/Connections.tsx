import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserConnections, searchConnections } from '../services/api';
import { Connection } from '../types';

const Connections = () => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [filteredConnections, setFilteredConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    company: '',
    title: '',
    connectedOnStart: '',
    connectedOnEnd: '',
  });
  
  // Fetch connections on component mount
  useEffect(() => {
    const fetchConnections = async () => {
      if (!user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const data = await getUserConnections(user.id);
        setConnections(data);
        setFilteredConnections(data);
      } catch (err) {
        setError('Failed to fetch connections');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchConnections();
  }, [user]);
  
  // Handle search and filter
  const handleSearch = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Format filters for API
      const apiFilters: Record<string, any> = {};
      
      if (filters.company) {
        apiFilters['profiles.company'] = filters.company;
      }
      
      if (filters.title) {
        apiFilters['profiles.title'] = filters.title;
      }
      
      if (filters.connectedOnStart) {
        apiFilters.connected_on_start = filters.connectedOnStart;
      }
      
      if (filters.connectedOnEnd) {
        apiFilters.connected_on_end = filters.connectedOnEnd;
      }
      
      const data = await searchConnections(user.id, searchQuery, apiFilters);
      setFilteredConnections(data);
    } catch (err) {
      setError('Failed to search connections');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Reset filters
  const resetFilters = () => {
    setSearchQuery('');
    setFilters({
      company: '',
      title: '',
      connectedOnStart: '',
      connectedOnEnd: '',
    });
    setFilteredConnections(connections);
  };
  
  // Handle filter changes
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Your LinkedIn Connections
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  {filteredConnections.length} connections found
                </p>
              </div>
              
              <div>
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={() => window.location.href = '/upload'}
                >
                  Upload More
                </button>
              </div>
            </div>
            
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                    Search
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="search"
                      id="search"
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Name, company, title..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                    Company
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="company"
                      id="company"
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Filter by company"
                      value={filters.company}
                      onChange={handleFilterChange}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Title
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="title"
                      id="title"
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Filter by title"
                      value={filters.title}
                      onChange={handleFilterChange}
                    />
                  </div>
                </div>
                
                <div className="sm:col-span-2 lg:col-span-1">
                  <label htmlFor="connectedOnStart" className="block text-sm font-medium text-gray-700">
                    Connected Between
                  </label>
                  <div className="mt-1 flex space-x-2">
                    <input
                      type="date"
                      name="connectedOnStart"
                      id="connectedOnStart"
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      value={filters.connectedOnStart}
                      onChange={handleFilterChange}
                    />
                    <input
                      type="date"
                      name="connectedOnEnd"
                      id="connectedOnEnd"
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      value={filters.connectedOnEnd}
                      onChange={handleFilterChange}
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={resetFilters}
                >
                  Reset
                </button>
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={handleSearch}
                >
                  Search
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              {loading ? (
                <div className="text-center py-10">
                  <svg
                    className="animate-spin h-10 w-10 text-blue-500 mx-auto"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">Loading connections...</p>
                </div>
              ) : error ? (
                <div className="text-center py-10">
                  <p className="text-red-500">{error}</p>
                </div>
              ) : filteredConnections.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-500">No connections found</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Name
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Title
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Company
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Connected On
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredConnections.map((connection) => {
                      const profile = connection.profiles;
                      return (
                        <tr key={connection.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                  <span className="text-gray-500 font-medium">
                                    {profile.full_name.split(' ').map((n: string) => n[0]).join('')}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {profile.full_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {profile.email || 'No email'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{profile.title || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{profile.company || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(connection.connected_on).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <a
                              href={profile.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View Profile
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Connections;
