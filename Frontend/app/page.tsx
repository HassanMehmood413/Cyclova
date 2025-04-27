'use client';

import Link from 'next/link';
import './styles/home.css';
import AnimatedAssistant from './components/AnimatedAssistant';
import { useEffect, useState } from 'react';

export default function Home() {
  const [loaded, setLoaded] = useState(false);
  
  useEffect(() => {
    // Set loaded state after component mounts to ensure client-side rendering
    setLoaded(true);
  }, []);

  return (
    <main className="home-container">
      <div className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Your Complete <span className="gradient-text">Women's Health</span> Companion
          </h1>
          <p className="hero-subtitle">
            Cyclova helps you track, understand, and take control of your reproductive health with personalized insights and timely reminders.
          </p>
          <div className="hero-buttons">
            <Link href="/register" className="btn btn-primary">Get Started</Link>
            <Link href="/about" className="btn btn-outline">Learn More</Link>
          </div>
        </div>
        <div className="hero-image">
          <div className="image-container">
            <div className="glow-effect"></div>
            {loaded && <div className="assistant-wrapper-hero"><AnimatedAssistant /></div>}
          </div>
        </div>
      </div>

      <section className="features">
        <h2 className="section-title">Our Features</h2>
        <div className="features-grid">
          <Link href="/pregnancy" className="feature-card">
            <div className="feature-icon pregnancy-icon"></div>
            <h3>Pregnancy Tracker</h3>
            <p>Track your pregnancy journey with weekly updates, milestone reminders, and health recommendations.</p>
          </Link>
          <Link href="/periodscare" className="feature-card">
            <div className="feature-icon period-icon"></div>
            <h3>Period Care</h3>
            <p>Track your menstrual cycle, symptoms, and moods with our intuitive period tracker.</p>
          </Link>
          <Link href="/appointment" className="feature-card">
            <div className="feature-icon appointment-icon"></div>
            <h3>Smart Appointments</h3>
            <p>Easily book appointments with healthcare providers using our AI-powered scheduling assistant.</p>
          </Link>
        </div>
      </section>

      <section className="features-detail">
        <div className="detail-content">
          <h2>Powered by Advanced AI</h2>
          <p>Cyclova uses artificial intelligence to provide personalized health insights, smart appointment scheduling, and predictive health analytics.</p>
          <ul className="feature-list">
            <li>Personalized health recommendations</li>
            <li>Natural language appointment booking</li>
            <li>Predictive cycle tracking</li>
            <li>Intelligent symptom analysis</li>
          </ul>
          <Link href="/how-it-works" className="btn btn-secondary">How It Works</Link>
        </div>
        <div className="detail-visual">
          {loaded && <AnimatedAssistant />}
        </div>
      </section>

      <section className="testimonials">
        <h2 className="section-title">What Our Users Say</h2>
        <div className="testimonial-slider">
          <div className="testimonial-card">
            <div className="quote-mark">"</div>
            <p className="testimonial-text">Cyclova has been a game-changer for me. The pregnancy tracker provides such detailed information each week, and I love how it connects with my calendar for appointments.</p>
            <div className="testimonial-author">
              <div className="author-avatar">JD</div>
              <div className="author-name">Jane Doe</div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="cta-content">
          <h2>Ready to Take Control of Your Health?</h2>
          <p>Join thousands of women who are using Cyclova to monitor their health and make informed decisions.</p>
          <Link href="/register" className="btn btn-primary">Sign Up Now</Link>
        </div>
      </section>
    </main>
  );
} 