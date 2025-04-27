'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import '../styles/pregnancy-tracker.css';

interface MilestoneGroup {
  [key: string]: {
    id: number;
    name: string;
    completed: boolean;
  }[];
}

interface PregnancyData {
  current_week: number;
  due_date: string;
  last_period: string;
  baby_size_info: string;
  progress_percentage: number;
  trimester: string;
  current_day?: number;
  milestones: MilestoneGroup;
}

export default function PregnancyTracker() {
  const { token } = useAuth();
  const [pregnancyData, setPregnancyData] = useState<PregnancyData | null>(null);
  const [lastPeriod, setLastPeriod] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isTimeout, setIsTimeout] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    if (token) {
      fetchPregnancyData();
      
      // Set a timeout to detect if loading takes too long
      const timeoutId = setTimeout(() => {
        if (loading) {
          setIsTimeout(true);
          setLoading(false);
          setError('Loading timeout. The server may be temporarily unavailable.');
          // Remove automatic setShowSetup(true) here
        }
      }, 20000); // 20 seconds timeout
      
      return () => clearTimeout(timeoutId);
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchPregnancyData = async () => {
    try {
      setLoading(true);
      setIsTimeout(false);
      setError(null);
      // Don't reset setup state here
      
      // Abort controller for fetch timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch('/pregnancy/data', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          // No tracker found, but don't automatically show setup form
          setPregnancyData(null);
          // Remove automatic setShowSetup(true) here
        } else {
          throw new Error(`Failed to fetch pregnancy data: ${response.status} ${response.statusText}`);
        }
      } else {
        const data = await response.json();
        setPregnancyData(data);
        
        // Fetch insights
        fetchInsights();
      }
    } catch (err: any) {
      console.error('Error fetching pregnancy data:', err);
      if (err.name === 'AbortError') {
        setError('Request timed out. Please check your internet connection and try again.');
      } else {
        setError('Error loading pregnancy tracker data. Please try again later.');
      }
      setPregnancyData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch('/pregnancy/insights', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to fetch insights');
      }

      const data = await response.json();
      setInsights(data.insights);
    } catch (err) {
      console.error('Error fetching insights:', err);
      // Don't set error state for insights - non-critical
    }
  };

  const setupPregnancyTracker = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch('/pregnancy/calculate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          last_period: lastPeriod
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to set up pregnancy tracker: ${response.status} ${response.statusText}`);
      }

      // Get the response data directly instead of refetching
      const data = await response.json();
      setPregnancyData(data);
      
      // Fetch insights after setup
      fetchInsights();
    } catch (err: any) {
      console.error('Error setting up tracker:', err);
      if (err.name === 'AbortError') {
        setError('Request timed out. Please check your internet connection and try again.');
      } else {
        setError('Error setting up pregnancy tracker. Please try again with a valid date.');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateMilestone = async (trimester: string, milestoneName: string, completed: boolean) => {
    try {
      const response = await fetch('/pregnancy/milestones/update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          milestone_updates: [
            {
              trimester,
              milestone: milestoneName,
              completed
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update milestone');
      }

      // Get updated milestones directly
      const updatedMilestones = await response.json();
      
      // Update the pregnancyData with new milestones
      if (pregnancyData) {
        setPregnancyData({
          ...pregnancyData,
          milestones: updatedMilestones
        });
      }
    } catch (err) {
      console.error('Error updating milestone:', err);
      // Show a temporary error message
      setError('Error updating milestone. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-8">
        <h1 className="text-3xl font-bold mb-6 text-purple-800">Pregnancy Tracker</h1>
        
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading your pregnancy tracker...</p>
        </div>
      </div>
    );
  }

  // Show timeout error with retry button
  if (isTimeout) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-8">
        <h1 className="text-3xl font-bold mb-6 text-purple-800">Pregnancy Tracker</h1>
        
        <div className="bg-red-50 p-4 rounded-lg mb-6">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => {
              setIsTimeout(false);
              setLoading(true);
              fetchPregnancyData();
            }}
            className="mt-3 bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show no pregnancy data message with set up option
  if (!pregnancyData && !showSetup) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-8">
        <h1 className="text-3xl font-bold mb-6 text-purple-800">Pregnancy Tracker</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-2xl font-semibold text-purple-700 mb-4">No Pregnancy Tracker Found</h2>
          <p className="mb-4 text-gray-600">
            It looks like you haven't set up your pregnancy tracker yet. Setting up a tracker helps you monitor your pregnancy journey.
          </p>
          <button
            onClick={() => setShowSetup(true)}
            className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 transition-colors"
          >
            Set Up Pregnancy Tracker
          </button>
        </div>
      </div>
    );
  }

  // Show setup form
  if (showSetup) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-8">
        <h1 className="text-3xl font-bold mb-6 text-purple-800">Pregnancy Tracker</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-2xl font-semibold text-purple-700 mb-4">Set Up Your Pregnancy Tracker</h2>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={setupPregnancyTracker}>
            <div className="form-control">
              <label htmlFor="lastPeriod">First day of last period</label>
              <input
                type="date"
                id="lastPeriod"
                value={lastPeriod}
                onChange={(e) => setLastPeriod(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Calculate Due Date
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Rest of the component remains unchanged
  return (
    <div className="container mx-auto py-8 px-4 md:px-8">
      <h1 className="text-3xl font-bold mb-6 text-purple-800">Pregnancy Tracker</h1>
      
      <div className="pregnancy-tracker-container">
        <div className="tracker-header">
          <div className="tracker-overview">
            <h1>Your Pregnancy Journey</h1>
            <div className="week-badge">Week {pregnancyData?.current_week}</div>
            <p className="trimester-info">{pregnancyData?.trimester}</p>
          </div>
          
          <div className="tracker-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${pregnancyData?.progress_percentage}%` }}
              ></div>
            </div>
            <div className="progress-info">
              <p>Due date: {pregnancyData?.due_date ? new Date(pregnancyData.due_date).toLocaleDateString() : 'Loading...'}</p>
              <p>{pregnancyData?.current_week ? Math.max(0, Math.floor(40 - pregnancyData.current_week)) : '?'} weeks to go</p>
            </div>
          </div>
        </div>
        
        {/* Show error message if there's an error */}
        {error && <div className="error-message">{error}</div>}
        
        <div className="tracker-tabs">
          <button 
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab-btn ${activeTab === 'milestones' ? 'active' : ''}`}
            onClick={() => setActiveTab('milestones')}
          >
            Milestones
          </button>
          <button 
            className={`tab-btn ${activeTab === 'insights' ? 'active' : ''}`}
            onClick={() => setActiveTab('insights')}
          >
            AI Insights
          </button>
        </div>
        
        <div className="tracker-content">
          {activeTab === 'overview' && pregnancyData && (
            <div className="overview-tab">
              <div className="due-date-card">
                <h2>Due Date</h2>
                <div className="due-date">{pregnancyData?.due_date}</div>
                <div className="week-day">
                  <strong>Week {pregnancyData?.current_week}</strong>
                  {pregnancyData?.current_day !== undefined && `, Day ${pregnancyData?.current_day}`}
                </div>
              </div>

              <div className="trimester-progress">
                <h3>Trimester {pregnancyData?.trimester}</h3>
                <div className="progress-bar">
                  <div
                    className="progress"
                    style={{ width: `${(pregnancyData?.current_week / 40) * 100}%` }}
                  ></div>
                </div>
                <div className="progress-text">
                  {pregnancyData?.current_week} weeks out of 40
                </div>
              </div>

              <div className="baby-size">
                <h3>Baby Size Comparison</h3>
                <div className="baby-icon">🍐</div>
                <p>{pregnancyData?.baby_size_info}</p>
              </div>
            </div>
          )}
          
          {activeTab === 'milestones' && pregnancyData && (
            <div className="milestones-tab">
              <h2>Pregnancy Milestones</h2>
              <div className="milestone-list">
                {pregnancyData.milestones[pregnancyData.trimester].map((milestone) => (
                  <div key={milestone.id} className={`milestone ${milestone.completed ? 'completed' : ''}`}>
                    <div className="milestone-checkbox">
                      <input
                        type="checkbox"
                        checked={milestone.completed}
                        onChange={() => {
                          if (pregnancyData) {
                            updateMilestone(pregnancyData.trimester, milestone.name, !milestone.completed);
                          }
                        }}
                      />
                    </div>
                    <div className="milestone-content">
                      <h3>{milestone.name}</h3>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'insights' && pregnancyData && (
            <div className="insights-tab">
              <h2>AI Insights</h2>
              {insights ? (
                <div className="insights-content">
                  <p>{insights}</p>
                </div>
              ) : (
                <div className="loading-insights">
                  <div className="loading-spinner"></div>
                  <p>Generating personalized insights...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 