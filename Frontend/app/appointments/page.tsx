'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';
import '../styles/appointments.css';

export default function Appointments() {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [doctorName, setDoctorName] = useState('');
  const [doctorEmail, setDoctorEmail] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [reason, setReason] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    if (token) {
      fetchAppointments();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      
      // For demo, we're just setting loading to false
      // In a real app, you would fetch appointments from the backend
      setAppointments([]);
      setLoading(false);
    } catch (err) {
      setError('Error loading appointments. Please try again.');
      console.error(err);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const response = await fetch('/periodcare/appointments/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          doctor_name: doctorName,
          doctor_email: doctorEmail,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          reason,
          location
        })
      });

      if (!response.ok) {
        throw new Error('Failed to schedule appointment');
      }

      // Reset form
      setDoctorName('');
      setDoctorEmail('');
      setAppointmentDate('');
      setAppointmentTime('');
      setReason('');
      setLocation('');
      
      // Refresh appointments list
      fetchAppointments();
      
      setLoading(false);
    } catch (err) {
      setError('Error scheduling appointment. Please try again.');
      console.error(err);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="appointments-container">
      <h1 className="page-title">Doctor Appointments</h1>
      
      <div className="appointments-content">
        <div className="appointment-form-card">
          <h2>Schedule New Appointment</h2>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <div className="form-control">
                <label htmlFor="doctorName">Doctor's Name</label>
                <input
                  type="text"
                  id="doctorName"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  required
                />
              </div>
              
              <div className="form-control">
                <label htmlFor="doctorEmail">Doctor's Email (optional)</label>
                <input
                  type="email"
                  id="doctorEmail"
                  value={doctorEmail}
                  onChange={(e) => setDoctorEmail(e.target.value)}
                />
              </div>
            </div>
            
            <div className="form-group">
              <div className="form-control">
                <label htmlFor="appointmentDate">Date</label>
                <input
                  type="date"
                  id="appointmentDate"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  required
                />
              </div>
              
              <div className="form-control">
                <label htmlFor="appointmentTime">Time</label>
                <input
                  type="time"
                  id="appointmentTime"
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="form-control">
              <label htmlFor="reason">Reason for Visit</label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              ></textarea>
            </div>
            
            <div className="form-control">
              <label htmlFor="location">Location</label>
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>
            
            <button type="submit" className="btn btn-primary">
              Schedule Appointment
            </button>
          </form>
        </div>
        
        <div className="appointments-list-card">
          <h2>Your Upcoming Appointments</h2>
          
          {appointments.length === 0 ? (
            <p className="no-appointments">You have no scheduled appointments.</p>
          ) : (
            <div className="appointments-list">
              {/* Appointment items would be mapped here */}
            </div>
          )}
          
          <div className="health-reminders">
            <h3>Health Checkup Reminders</h3>
            <ul>
              <li>Schedule annual gynecological exams</li>
              <li>Get regular Pap smears as recommended by your doctor</li>
              <li>Consider HPV vaccination if you haven't already</li>
              <li>Perform regular breast self-exams</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 