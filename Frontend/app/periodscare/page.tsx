'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';
import '../styles/periodscare.css';

export default function PeriodsCare() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    // Initial data fetching if needed
    setLoading(false);
  }, [token]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="period-care-container">
      <h1 className="page-title">Period Care</h1>
      
      <div className="feature-cards">
        <Link href="/period" className="feature-card">
          <div className="card-icon period-tracker-icon"></div>
          <h2>Period Tracker</h2>
          <p>Track your cycle, symptoms, and moods</p>
        </Link>
        
        <Link href="/appointments" className="feature-card">
          <div className="card-icon appointment-icon"></div>
          <h2>Doctor Appointments</h2>
          <p>Schedule and manage your gynecological appointments</p>
        </Link>
        
        <div className="feature-card" onClick={() => window.location.href = '#resources'}>
          <div className="card-icon resources-icon"></div>
          <h2>Educational Resources</h2>
          <p>Learn about menstrual health and self-care</p>
        </div>
      </div>
      
      <section id="resources" className="resources-section">
        <h2>Menstrual Health Resources</h2>
        
        <div className="resource-cards">
          <div className="resource-card">
            <h3>Understanding Your Cycle</h3>
            <p>Your menstrual cycle is more than just your period. Learn about the four phases of the menstrual cycle and how they affect your body and mood.</p>
            <ul>
              <li>Menstrual phase: When bleeding occurs</li>
              <li>Follicular phase: When eggs mature</li>
              <li>Ovulation phase: When an egg is released</li>
              <li>Luteal phase: When the body prepares for possible pregnancy</li>
            </ul>
          </div>
          
          <div className="resource-card">
            <h3>Managing Period Pain</h3>
            <p>Period pain (dysmenorrhea) is common but shouldn't disrupt your life. Try these methods for relief:</p>
            <ul>
              <li>Heat therapy with warm compresses or heating pads</li>
              <li>Gentle exercise like walking or yoga</li>
              <li>Over-the-counter pain relievers as directed</li>
              <li>Relaxation techniques such as deep breathing</li>
              <li>Consult your doctor if pain is severe or worsening</li>
            </ul>
          </div>
          
          <div className="resource-card">
            <h3>Sustainable Period Products</h3>
            <p>Consider these eco-friendly alternatives to traditional period products:</p>
            <ul>
              <li>Menstrual cups: Reusable silicone cups that collect blood</li>
              <li>Period underwear: Absorbent, washable underwear</li>
              <li>Reusable cloth pads: Washable fabric pads</li>
              <li>Organic cotton products: Biodegradable tampons and pads</li>
            </ul>
          </div>
        </div>
      </section>
      
      <section className="faq-section">
        <h2>Frequently Asked Questions</h2>
        
        <div className="faq-items">
          <div className="faq-item">
            <h3>How long should my period last?</h3>
            <p>Most periods last between 3-7 days. If your period regularly lasts longer than 7 days, consult with your healthcare provider.</p>
          </div>
          
          <div className="faq-item">
            <h3>Is it normal to have irregular periods?</h3>
            <p>Some variation in cycle length is normal. Factors like stress, weight changes, excessive exercise, and certain medical conditions can cause irregularity. If you're concerned about your cycle, speak with your doctor.</p>
          </div>
          
          <div className="faq-item">
            <h3>When should I see a doctor about period concerns?</h3>
            <p>Consider consulting your healthcare provider if you experience: periods lasting longer than 7 days, severe pain, very heavy bleeding, significant irregularity, or missed periods (if not pregnant).</p>
          </div>
        </div>
      </section>
    </div>
  );
} 