import React from 'react';
import './styles/globals.css';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import AnimatedBackground from './components/AnimatedBackground';

export const metadata = {
  title: 'Cyclova - Women\'s Health Companion',
  description: 'Your complete women\'s health tracking and care platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          <AnimatedBackground />
          <Navbar />
          <main className="main-content">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
} 