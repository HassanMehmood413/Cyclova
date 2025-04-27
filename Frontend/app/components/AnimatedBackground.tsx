'use client';

import { useEffect, useState } from 'react';
import '../styles/animated-background.css';
import Image from 'next/image';

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  speedX: number;
  speedY: number;
  opacity: number;
}

const AnimatedBackground = () => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  useEffect(() => {
    // Generate initial particles
    const colors = [
      'rgba(255, 107, 149, 0.3)',
      'rgba(113, 87, 255, 0.3)',
      'rgba(76, 217, 123, 0.3)'
    ];
    
    const initialParticles: Particle[] = [];
    const particleCount = window.innerWidth < 768 ? 15 : 30;
    
    for (let i = 0; i < particleCount; i++) {
      initialParticles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 15 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.3 + 0.1
      });
    }
    
    setParticles(initialParticles);
    
    // Animation loop
    let animationFrameId: number;
    
    const animate = () => {
      setParticles(prevParticles => 
        prevParticles.map(particle => {
          // Update position
          let newX = particle.x + particle.speedX;
          let newY = particle.y + particle.speedY;
          
          // Bounce off edges
          if (newX < 0 || newX > window.innerWidth) {
            particle.speedX *= -1;
            newX = particle.x + particle.speedX;
          }
          
          if (newY < 0 || newY > window.innerHeight) {
            particle.speedY *= -1;
            newY = particle.y + particle.speedY;
          }
          
          return {
            ...particle,
            x: newX,
            y: newY
          };
        })
      );
      
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
    
    // Handle window resize
    const handleResize = () => {
      setParticles(prevParticles => 
        prevParticles.map(particle => ({
          ...particle,
          x: Math.min(particle.x, window.innerWidth),
          y: Math.min(particle.y, window.innerHeight)
        }))
      );
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  return (
    <div className="animated-background">
      <div className="hero-image-container">
        <Image 
          src="/images/hero-image.jpg"
          alt="Women's health and wellness"
          fill
          className={`hero-image ${imageLoaded ? 'loaded' : ''}`}
          priority
          onLoad={() => setImageLoaded(true)}
          sizes="100vw"
        />
        <div className="hero-overlay"></div>
      </div>
      
      {particles.map((particle, index) => (
        <div
          key={index}
          className="particle"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            opacity: particle.opacity,
          }}
        />
      ))}
    </div>
  );
};

export default AnimatedBackground; 