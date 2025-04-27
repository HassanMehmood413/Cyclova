'use client';

import { useEffect, useState, useRef } from 'react';
import '../styles/animated-assistant.css';

const AnimatedAssistant = () => {
  const [isActive, setIsActive] = useState(false);
  const [pulseSize, setPulseSize] = useState(1);
  const pulseInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Start the pulsing animation
    pulseInterval.current = setInterval(() => {
      setPulseSize(prev => prev === 1 ? 1.05 : 1);
    }, 1500);

    // Set active after a delay
    const timeout = setTimeout(() => {
      setIsActive(true);
    }, 1000);

    return () => {
      if (pulseInterval.current) clearInterval(pulseInterval.current);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className={`assistant-container ${isActive ? 'active' : ''}`}>
      <div className="assistant-wrapper" style={{ transform: `scale(${pulseSize})` }}>
        {/* Brain visualization */}
        <div className="assistant-brain">
          <div className="neural-network">
            {Array(12).fill(0).map((_, i) => (
              <div key={i} className="neuron" style={{
                top: `${15 + Math.sin(i * 0.5) * 35}%`,
                left: `${15 + Math.cos(i * 0.5) * 35}%`,
                animationDelay: `${i * 0.2}s`
              }}>
                <div className="synapse"></div>
              </div>
            ))}
            
            {Array(20).fill(0).map((_, i) => (
              <div key={i} className="connection" style={{
                top: `${10 + Math.random() * 80}%`,
                left: `${10 + Math.random() * 80}%`,
                width: `${20 + Math.random() * 60}%`,
                transform: `rotate(${Math.random() * 360}deg)`,
                animationDelay: `${i * 0.1}s`
              }}>
              </div>
            ))}
          </div>
        </div>
        
        {/* Circle border */}
        <div className="assistant-border"></div>
        
        {/* Glowing effect */}
        <div className="assistant-glow"></div>
      </div>
      
      {/* Text underneath */}
      <div className="assistant-text">
        <div className="text-line">AI Assistant</div>
        <div className="text-dots">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
      </div>
    </div>
  );
};

export default AnimatedAssistant; 