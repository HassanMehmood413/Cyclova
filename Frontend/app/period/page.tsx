'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';
import '../styles/period-tracker.css';

interface PeriodData {
  start_date: string;
  end_date?: string;
  cycle_length?: number;
  period_length?: number;
}

interface Symptom {
  date: string;
  symptom_type: string;
  severity: number;
  notes?: string;
}

interface Mood {
  date: string;
  mood_type: string;
  intensity: number;
  notes?: string;
}

interface PeriodHistory {
  symptoms: Symptom[];
  moods: Mood[];
  period_details: {
    cycle_length?: number;
    period_length?: number;
  };
}

interface PredictionData {
  next_period_start: string;
  next_period_end?: string;
}

export default function PeriodTracker() {
  const { token } = useAuth();
  const [periodData, setPeriodData] = useState<PeriodData | null>(null);
  const [periodHistory, setPeriodHistory] = useState<PeriodHistory | null>(null);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Form states for creating new entries
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cycleLength, setCycleLength] = useState<number | undefined>();
  const [periodLength, setPeriodLength] = useState<number | undefined>();
  
  // New symptom form
  const [symptomDate, setSymptomDate] = useState('');
  const [symptomType, setSymptomType] = useState('');
  const [symptomSeverity, setSymptomSeverity] = useState(1);
  const [symptomNotes, setSymptomNotes] = useState('');
  
  // New mood form
  const [moodDate, setMoodDate] = useState('');
  const [moodType, setMoodType] = useState('');
  const [moodIntensity, setMoodIntensity] = useState(1);
  const [moodNotes, setMoodNotes] = useState('');

  useEffect(() => {
    if (token) {
      fetchPeriodData();
    }
  }, [token]);

  const fetchPeriodData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/periodcare/tracker', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          setPeriodData(null);
        } else {
          throw new Error('Failed to fetch period data');
        }
      } else {
        const data = await response.json();
        setPeriodData(data);
        
        // Also fetch history and prediction
        fetchHistory();
        fetchPrediction();
      }
    } catch (err) {
      setError('Error loading period tracker data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch('/periodcare/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch period history');
      }

      const data = await response.json();
      setPeriodHistory(data);
    } catch (err) {
      console.error('Error fetching period history:', err);
    }
  };

  const fetchPrediction = async () => {
    try {
      const response = await fetch('/periodcare/predict-next-period', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch period prediction');
      }

      const data = await response.json();
      setPrediction(data);
    } catch (err) {
      console.error('Error fetching period prediction:', err);
    }
  };

  const setupPeriodTracker = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const response = await fetch('/periodcare/tracker', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate || undefined,
          cycle_length: cycleLength,
          period_length: periodLength
        })
      });

      if (!response.ok) {
        throw new Error('Failed to set up period tracker');
      }

      // Refresh data
      fetchPeriodData();
    } catch (err) {
      setError('Error setting up period tracker. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addSymptom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/periodcare/symptoms', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: symptomDate,
          symptom_type: symptomType,
          severity: symptomSeverity,
          notes: symptomNotes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add symptom');
      }

      // Reset form and refresh history
      setSymptomDate('');
      setSymptomType('');
      setSymptomSeverity(1);
      setSymptomNotes('');
      fetchHistory();
    } catch (err) {
      setError('Error adding symptom. Please try again.');
      console.error(err);
    }
  };

  const addMood = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/periodcare/moods', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: moodDate,
          mood_type: moodType,
          intensity: moodIntensity,
          notes: moodNotes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add mood');
      }

      // Reset form and refresh history
      setMoodDate('');
      setMoodType('');
      setMoodIntensity(1);
      setMoodNotes('');
      fetchHistory();
    } catch (err) {
      setError('Error adding mood. Please try again.');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your period tracker...</p>
      </div>
    );
  }

  if (!periodData) {
    return (
      <div className="tracker-setup-container">
        <div className="tracker-card">
          <h1>Set Up Your Period Tracker</h1>
          <p>Help us personalize your period tracking experience.</p>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={setupPeriodTracker}>
            <div className="form-control">
              <label htmlFor="startDate">Start date of your last period</label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            
            <div className="form-control">
              <label htmlFor="endDate">End date (optional)</label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <div className="form-control">
                <label htmlFor="cycleLength">Average cycle length (days)</label>
                <input
                  type="number"
                  id="cycleLength"
                  value={cycleLength || ''}
                  onChange={(e) => setCycleLength(e.target.value ? parseInt(e.target.value) : undefined)}
                  min="21"
                  max="45"
                  placeholder="28"
                />
              </div>
              
              <div className="form-control">
                <label htmlFor="periodLength">Average period length (days)</label>
                <input
                  type="number"
                  id="periodLength"
                  value={periodLength || ''}
                  onChange={(e) => setPeriodLength(e.target.value ? parseInt(e.target.value) : undefined)}
                  min="1"
                  max="10"
                  placeholder="5"
                />
              </div>
            </div>
            
            <button type="submit" className="btn btn-primary">
              Start Tracking
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Calculate days until next period
  const daysUntilNext = prediction ? 
    Math.round((new Date(prediction.next_period_start).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 
    null;

  return (
    <div className="period-tracker-container">
      <div className="period-tracker-header">
        <h1>Period Tracker</h1>
        
        {prediction && (
          <div className="next-period">
            <h2>Next Period</h2>
            <div className="next-period-info">
              <div className="date-display">
                {new Date(prediction.next_period_start).toLocaleDateString(undefined, { 
                  month: 'short', 
                  day: 'numeric' 
                })}
                {prediction.next_period_end && ` - ${new Date(prediction.next_period_end).toLocaleDateString(undefined, { 
                  month: 'short', 
                  day: 'numeric' 
                })}`}
              </div>
              {daysUntilNext !== null && (
                <div className="days-counter">
                  <span className="days-number">{daysUntilNext}</span>
                  <span className="days-label">days away</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="tracker-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'symptoms' ? 'active' : ''}`}
          onClick={() => setActiveTab('symptoms')}
        >
          Symptoms
        </button>
        <button 
          className={`tab-btn ${activeTab === 'moods' ? 'active' : ''}`}
          onClick={() => setActiveTab('moods')}
        >
          Mood
        </button>
        <button 
          className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          Calendar
        </button>
      </div>
      
      <div className="tracker-content">
        {activeTab === 'overview' && (
          <div className="overview-content">
            <div className="period-details-card">
              <h2>Your Cycle Details</h2>
              <div className="cycle-info">
                <div className="info-item">
                  <span className="info-label">Cycle Length</span>
                  <span className="info-value">{periodData.cycle_length || 'Not set'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Period Length</span>
                  <span className="info-value">{periodData.period_length || 'Not set'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Last Period</span>
                  <span className="info-value">
                    {new Date(periodData.start_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="quick-actions">
              <Link href="/appointment" className="quick-action-card">
                <div className="quick-action-icon appointment-icon"></div>
                <h3>Book Appointment</h3>
                <p>Schedule a gynecological check-up</p>
              </Link>
              
              <div 
                className="quick-action-card" 
                onClick={() => setActiveTab('symptoms')}
              >
                <div className="quick-action-icon symptom-icon"></div>
                <h3>Log Symptoms</h3>
                <p>Track how you're feeling today</p>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'symptoms' && (
          <div className="symptoms-container">
            <div className="add-symptom-card">
              <h2>Add New Symptom</h2>
              <form onSubmit={addSymptom}>
                <div className="form-control">
                  <label htmlFor="symptomDate">Date</label>
                  <input
                    type="date"
                    id="symptomDate"
                    value={symptomDate}
                    onChange={(e) => setSymptomDate(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-control">
                  <label htmlFor="symptomType">Symptom</label>
                  <select
                    id="symptomType"
                    value={symptomType}
                    onChange={(e) => setSymptomType(e.target.value)}
                    required
                  >
                    <option value="">Select a symptom</option>
                    <option value="cramps">Cramps</option>
                    <option value="headache">Headache</option>
                    <option value="backache">Backache</option>
                    <option value="nausea">Nausea</option>
                    <option value="fatigue">Fatigue</option>
                    <option value="bloating">Bloating</option>
                    <option value="breast tenderness">Breast Tenderness</option>
                    <option value="spotting">Spotting</option>
                    <option value="acne">Acne</option>
                  </select>
                </div>
                
                <div className="form-control">
                  <label htmlFor="symptomSeverity">Severity (1-5)</label>
                  <div className="intensity-selector">
                    {[1, 2, 3, 4, 5].map(level => (
                      <button
                        key={level}
                        type="button"
                        className={`intensity-btn ${symptomSeverity === level ? 'active' : ''}`}
                        onClick={() => setSymptomSeverity(level)}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="form-control">
                  <label htmlFor="symptomNotes">Notes (optional)</label>
                  <textarea
                    id="symptomNotes"
                    value={symptomNotes}
                    onChange={(e) => setSymptomNotes(e.target.value)}
                    rows={3}
                  ></textarea>
                </div>
                
                <button type="submit" className="btn btn-primary">
                  Save Symptom
                </button>
              </form>
            </div>
            
            <div className="symptom-history-card">
              <h2>Recent Symptoms</h2>
              {periodHistory && periodHistory.symptoms.length > 0 ? (
                <div className="symptom-list">
                  {periodHistory.symptoms.slice(0, 5).map((symptom, index) => (
                    <div key={index} className="symptom-item">
                      <div className="symptom-date">
                        {new Date(symptom.date).toLocaleDateString(undefined, { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                      <div className="symptom-details">
                        <div className="symptom-name">{symptom.symptom_type}</div>
                        <div className="symptom-severity">
                          Severity: {symptom.severity}
                        </div>
                      </div>
                      {symptom.notes && (
                        <div className="symptom-notes">{symptom.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-data">No symptoms recorded yet.</p>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'moods' && (
          <div className="moods-container">
            <div className="add-mood-card">
              <h2>Log Your Mood</h2>
              <form onSubmit={addMood}>
                <div className="form-control">
                  <label htmlFor="moodDate">Date</label>
                  <input
                    type="date"
                    id="moodDate"
                    value={moodDate}
                    onChange={(e) => setMoodDate(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-control">
                  <label htmlFor="moodType">Mood</label>
                  <select
                    id="moodType"
                    value={moodType}
                    onChange={(e) => setMoodType(e.target.value)}
                    required
                  >
                    <option value="">Select a mood</option>
                    <option value="happy">Happy</option>
                    <option value="sad">Sad</option>
                    <option value="sensitive">Sensitive</option>
                    <option value="anxious">Anxious</option>
                    <option value="irritable">Irritable</option>
                    <option value="calm">Calm</option>
                    <option value="energetic">Energetic</option>
                    <option value="tired">Tired</option>
                    <option value="stressed">Stressed</option>
                  </select>
                </div>
                
                <div className="form-control">
                  <label htmlFor="moodIntensity">Intensity (1-5)</label>
                  <div className="intensity-selector">
                    {[1, 2, 3, 4, 5].map(level => (
                      <button
                        key={level}
                        type="button"
                        className={`intensity-btn ${moodIntensity === level ? 'active' : ''}`}
                        onClick={() => setMoodIntensity(level)}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="form-control">
                  <label htmlFor="moodNotes">Notes (optional)</label>
                  <textarea
                    id="moodNotes"
                    value={moodNotes}
                    onChange={(e) => setMoodNotes(e.target.value)}
                    rows={3}
                  ></textarea>
                </div>
                
                <button type="submit" className="btn btn-primary">
                  Save Mood
                </button>
              </form>
            </div>
            
            <div className="mood-history-card">
              <h2>Recent Moods</h2>
              {periodHistory && periodHistory.moods.length > 0 ? (
                <div className="mood-list">
                  {periodHistory.moods.slice(0, 5).map((mood, index) => (
                    <div key={index} className="mood-item">
                      <div className="mood-date">
                        {new Date(mood.date).toLocaleDateString(undefined, { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                      <div className="mood-details">
                        <div className="mood-name">{mood.mood_type}</div>
                        <div className="mood-intensity">
                          Intensity: {mood.intensity}
                        </div>
                      </div>
                      {mood.notes && (
                        <div className="mood-notes">{mood.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-data">No moods recorded yet.</p>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'calendar' && (
          <div className="calendar-container">
            <div className="calendar-card">
              <h2>Period Calendar</h2>
              <p className="calendar-placeholder">
                Calendar view is under development. Check back soon for a visual representation of your cycle.
              </p>
              <div className="calendar-stats">
                <div className="stat-item">
                  <div className="stat-label">Average Cycle</div>
                  <div className="stat-value">
                    {periodHistory && periodHistory.period_details.cycle_length ? 
                      `${periodHistory.period_details.cycle_length} days` : 'N/A'}
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Average Period</div>
                  <div className="stat-value">
                    {periodHistory && periodHistory.period_details.period_length ? 
                      `${periodHistory.period_details.period_length} days` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 