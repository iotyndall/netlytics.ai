import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats } from '../services/api';
import { DashboardStats } from '../types';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch dashboard stats on component mount
  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const data = await getDashboardStats(user.id);
        setStats(data);
      } catch (err) {
        setError('Failed to fetch dashboard stats');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [user]);
  
  // Prepare chart data
  const prepareTimelineData = () => {
    if (!stats) return null;
    
    const years = Object.keys(stats.connectionsByYear).sort();
    const counts = years.map(year => stats.connectionsByYear[year]);
    
    return {
      labels: years,
      datasets: [
        {
          label: 'Connections',
          data: counts,
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
        },
      ],
    };
  };
  
  const prepareCompanyData = () => {
    if (!stats || !stats.topCompanies.length) return null;
    
    return {
      labels: stats.topCompanies.map(item => item.company || 'Unknown'),
      datasets: [
        {
          data: stats.topCompanies.map(item => item.count),
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
            'rgba(255, 159, 64, 0.6)',
            'rgba(199, 199, 199, 0.6)',
            'rgba(83, 102, 255, 0.6)',
            'rgba(40, 159, 64, 0.6)',
            'rgba(210, 199, 199, 0.6)',
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(199, 199, 199, 1)',
            'rgba(83, 102, 255, 1)',
            'rgba(40, 159, 64, 1)',
            'rgba(210, 199, 199, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };
  };
  
  const prepareTitleData = () => {
    if (!stats || !stats.topTitles.length) return null;
    
    return {
      labels: stats.topTitles.map(item => item.title || 'Unknown'),
      datasets: [
        {
          label: 'Titles',
          data: stats.topTitles.map(item => item.count),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgb(75, 192, 192)',
          borderWidth: 1,
        },
      ],
    };
  };
  
  const timelineData = prepareTimelineData();
  const companyData = prepareCompanyData();
  const titleData = prepareTitleData();
  
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Network Insights
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Analytics and visualizations of your LinkedIn network
              </p>
            </div>
            
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
                <p className="mt-2 text-sm text-gray-500">Loading insights...</p>
              </div>
            ) : error ? (
              <div className="text-center py-10">
                <p className="text-red-500">{error}</p>
              </div>
            ) : !stats ? (
              <div className="text-center py-10">
                <p className="text-gray-500">No data available</p>
              </div>
            ) : (
              <div className="border-t border-gray-200">
                {/* Summary Stats */}
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.totalConnections}
                    </div>
                    <div className="text-sm text-gray-500">Total Connections</div>
                  </div>
                  <div className="text-center mt-4 sm:mt-0">
                    <div className="text-2xl font-bold text-blue-600">
                      {Object.keys(stats.connectionsByYear).length}
                    </div>
                    <div className="text-sm text-gray-500">Years of Networking</div>
                  </div>
                  <div className="text-center mt-4 sm:mt-0">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.topCompanies.length}
                    </div>
                    <div className="text-sm text-gray-500">Companies Represented</div>
                  </div>
                </div>
                
                {/* Timeline Chart */}
                <div className="px-4 py-5 sm:p-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">
                    Connection Growth Over Time
                  </h4>
                  <div className="h-64">
                    {timelineData ? (
                      <Line
                        data={timelineData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                              title: {
                                display: true,
                                text: 'Number of Connections',
                              },
                            },
                            x: {
                              title: {
                                display: true,
                                text: 'Year',
                              },
                            },
                          },
                        }}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-gray-500">No timeline data available</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Company and Title Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4 py-5 sm:p-6">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">
                      Top Companies
                    </h4>
                    <div className="h-64">
                      {companyData ? (
                        <Pie
                          data={companyData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'right',
                                labels: {
                                  boxWidth: 12,
                                },
                              },
                            },
                          }}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <p className="text-gray-500">No company data available</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">
                      Top Titles
                    </h4>
                    <div className="h-64">
                      {titleData ? (
                        <Bar
                          data={titleData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            indexAxis: 'y',
                            scales: {
                              x: {
                                beginAtZero: true,
                              },
                            },
                            plugins: {
                              legend: {
                                display: false,
                              },
                            },
                          }}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <p className="text-gray-500">No title data available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Export Button */}
                <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={() => {
                      // Export functionality would go here
                      alert('Export functionality will be implemented in a future update');
                    }}
                  >
                    Export Data
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
