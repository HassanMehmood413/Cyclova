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

interface PregnancySymptom {
  id?: number;
  date: string;
  symptom: string;
  severity: number;
  notes: string;
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
  const [showSymptomForm, setShowSymptomForm] = useState(false);
  
  // Extended setup form data
  const [setupData, setSetupData] = useState({
    last_period: '',
    known_due_date: '',
    first_pregnancy: false,
    pre_pregnancy_weight: '',
    height: '',
    doctor_name: '',
    doctor_contact: ''
  });
  
  // Symptom tracking form data
  const [symptomData, setSymptomData] = useState<PregnancySymptom>({
    date: new Date().toISOString().split('T')[0],
    symptom: '',
    severity: 3,
    notes: ''
  });
  
  // Symptoms history
  const [symptoms, setSymptoms] = useState<PregnancySymptom[]>([]);

  useEffect(() => {
    if (token) {
      fetchPregnancyData();
      fetchSymptoms();
      
      // Set a timeout to detect if loading takes too long
      const timeoutId = setTimeout(() => {
        if (loading) {
          setIsTimeout(true);
          setLoading(false);
          setError('Loading timeout. The server may be temporarily unavailable.');
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

  const fetchSymptoms = async () => {
    try {
      const response = await fetch('/pregnancy/symptoms', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSymptoms(data);
      }
    } catch (err) {
      console.error('Error fetching symptoms:', err);
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
        body: JSON.stringify(setupData),
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

  const handleSymptomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/pregnancy/symptoms', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(symptomData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save symptom');
      }
      
      // Reset form and refresh symptoms
      setSymptomData({
        date: new Date().toISOString().split('T')[0],
        symptom: '',
        severity: 3,
        notes: ''
      });
      setShowSymptomForm(false);
      
      // Add the new symptom to the list without refetching
      const newSymptom = await response.json();
      setSymptoms([...symptoms, newSymptom]);
      
    } catch (err) {
      console.error('Error saving symptom:', err);
      setError('Failed to save symptom. Please try again.');
      setTimeout(() => setError(null), 3000);
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
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setShowSetup(true)}
              className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 transition-colors"
            >
              Set Up Pregnancy Tracker
            </button>
            <Link href="/periodscare" className="bg-pink-100 text-pink-700 px-6 py-2 rounded-md hover:bg-pink-200 transition-colors">
              Go to Period Care
            </Link>
          </div>
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
          
          <form onSubmit={setupPregnancyTracker} className="pregnancy-setup-form">
            <div className="form-section">
              <h3>Pregnancy Details</h3>
              
              <div className="form-control">
                <label htmlFor="last_period">First day of last period *</label>
                <input
                  type="date"
                  id="last_period"
                  value={setupData.last_period}
                  onChange={(e) => setSetupData({...setupData, last_period: e.target.value})}
                  required
                />
                <div className="form-helper">This helps us calculate your due date</div>
              </div>
              
              <div className="form-control">
                <label htmlFor="known_due_date">Due date (if already known)</label>
                <input
                  type="date"
                  id="known_due_date"
                  value={setupData.known_due_date}
                  onChange={(e) => setSetupData({...setupData, known_due_date: e.target.value})}
                />
                <div className="form-helper">If your doctor has already provided a due date</div>
              </div>
              
              <div className="form-checkbox">
                <input
                  type="checkbox"
                  id="first_pregnancy"
                  checked={setupData.first_pregnancy}
                  onChange={(e) => setSetupData({...setupData, first_pregnancy: e.target.checked})}
                />
                <label htmlFor="first_pregnancy">This is my first pregnancy</label>
              </div>
            </div>
            
            <div className="form-section">
              <h3>Health Information</h3>
              
              <div className="form-control">
                <label htmlFor="pre_pregnancy_weight">Pre-pregnancy weight (kg)</label>
                <input
                  type="number"
                  id="pre_pregnancy_weight"
                  value={setupData.pre_pregnancy_weight}
                  onChange={(e) => setSetupData({...setupData, pre_pregnancy_weight: e.target.value})}
                />
              </div>
              
              <div className="form-control">
                <label htmlFor="height">Height (cm)</label>
                <input
                  type="number"
                  id="height"
                  value={setupData.height}
                  onChange={(e) => setSetupData({...setupData, height: e.target.value})}
                />
              </div>
            </div>
            
            <div className="form-section">
              <h3>Doctor Information</h3>
              
              <div className="form-control">
                <label htmlFor="doctor_name">Doctor's Name</label>
                <input
                  type="text"
                  id="doctor_name"
                  value={setupData.doctor_name}
                  onChange={(e) => setSetupData({...setupData, doctor_name: e.target.value})}
                />
              </div>
              
              <div className="form-control">
                <label htmlFor="doctor_contact">Doctor's Contact</label>
                <input
                  type="text"
                  id="doctor_contact"
                  value={setupData.doctor_contact}
                  onChange={(e) => setSetupData({...setupData, doctor_contact: e.target.value})}
                />
              </div>
            </div>
            
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Start Tracking My Pregnancy
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowSetup(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Main dashboard
  return (
    <div className="container mx-auto py-8 px-4 md:px-8">
      <div className="navigation-links mb-6">
        <Link href="/periodscare" className="text-pink-600 hover:text-pink-800 transition-colors">
          ← Back to Period Care
        </Link>
      </div>
      
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
        
        <div className="quick-actions">
          <button 
            className="quick-action-btn"
            onClick={() => setShowSymptomForm(!showSymptomForm)}
          >
            {showSymptomForm ? 'Hide Symptom Form' : 'Log Pregnancy Symptom'}
          </button>
        </div>
        
        {showSymptomForm && (
          <div className="symptom-form-container">
            <h2>Log Pregnancy Symptom</h2>
            <form onSubmit={handleSymptomSubmit}>
              <div className="form-control">
                <label htmlFor="symptom_date">Date:</label>
                <input 
                  type="date" 
                  id="symptom_date" 
                  value={symptomData.date} 
                  onChange={(e) => setSymptomData({...symptomData, date: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-control">
                <label htmlFor="symptom_type">Symptom:</label>
                <select 
                  id="symptom_type" 
                  value={symptomData.symptom} 
                  onChange={(e) => setSymptomData({...symptomData, symptom: e.target.value})} 
                  required
                >
                  <option value="">Select a symptom</option>
                  <option value="nausea">Nausea/Morning Sickness</option>
                  <option value="fatigue">Fatigue</option>
                  <option value="back_pain">Back Pain</option>
                  <option value="headache">Headache</option>
                  <option value="cramps">Cramps</option>
                  <option value="mood_swings">Mood Swings</option>
                  <option value="food_cravings">Food Cravings</option>
                  <option value="breast_tenderness">Breast Tenderness</option>
                  <option value="leg_cramps">Leg Cramps</option>
                  <option value="heartburn">Heartburn</option>
                  <option value="swelling">Swelling (Edema)</option>
                  <option value="insomnia">Insomnia</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-control">
                <label htmlFor="severity">Severity (1-5):</label>
                <input 
                  type="range" 
                  id="severity" 
                  min="1" 
                  max="5" 
                  value={symptomData.severity} 
                  onChange={(e) => setSymptomData({...symptomData, severity: parseInt(e.target.value)})} 
                />
                <span>{symptomData.severity}</span>
              </div>
              <div className="form-control">
                <label htmlFor="notes">Notes:</label>
                <textarea 
                  id="notes" 
                  value={symptomData.notes} 
                  onChange={(e) => setSymptomData({...symptomData, notes: e.target.value})}
                ></textarea>
              </div>
              <div className="form-buttons">
                <button type="submit" className="submit-btn">Save</button>
                <button type="button" className="cancel-btn" onClick={() => setShowSymptomForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}
        
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
            className={`tab-btn ${activeTab === 'symptoms' ? 'active' : ''}`}
            onClick={() => setActiveTab('symptoms')}
          >
            Symptoms
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
          
          {activeTab === 'symptoms' && (
            <div className="symptoms-tab">
              <h2>Tracked Symptoms</h2>
              {symptoms.length > 0 ? (
                <div className="symptoms-list">
                  {symptoms.map((s, index) => (
                    <div key={s.id || index} className="symptom-item">
                      <div className="symptom-date">{new Date(s.date).toLocaleDateString()}</div>
                      <div className="symptom-name">{s.symptom.replace('_', ' ')}</div>
                      <div className="symptom-severity">
                        <div className="severity-label">Severity:</div>
                        <div className="severity-bar">
                          <div 
                            className="severity-fill" 
                            style={{width: `${(s.severity / 5) * 100}%`}}
                          ></div>
                        </div>
                        <div className="severity-value">{s.severity}/5</div>
                      </div>
                      {s.notes && <div className="symptom-notes">{s.notes}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-symptoms">
                  <p>No symptoms logged yet. Use the "Log Pregnancy Symptom" button to start tracking.</p>
                </div>
              )}
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