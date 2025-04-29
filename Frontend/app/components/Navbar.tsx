'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Don't render authenticated content until client-side
  if (!isMounted) {
    return (
      <nav className="navbar">
        <div className="navbar-container">
          <Link href="/" className="navbar-logo">
            Cyclova
          </Link>
          <div className="menu-icon" onClick={toggleMenu}>
            <span className="menu-icon-bar"></span>
            <span className="menu-icon-bar"></span>
            <span className="menu-icon-bar"></span>
          </div>
          <ul className={isMenuOpen ? 'nav-menu active' : 'nav-menu'}>
            <li className="nav-item">
              <Link href="/" className="nav-link">
                Home
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    );
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link href="/" className="navbar-logo">
          Cyclova
        </Link>
        <div className="menu-icon" onClick={toggleMenu}>
          <span className="menu-icon-bar"></span>
          <span className="menu-icon-bar"></span>
          <span className="menu-icon-bar"></span>
        </div>
        <ul className={isMenuOpen ? 'nav-menu active' : 'nav-menu'}>
          <li className="nav-item">
            <Link href="/" className="nav-link">
              Home
            </Link>
          </li>

          {/* Display these options only when user is logged in */}
          {user && (
            <>
              <li className="nav-item">
                <Link href="/periodscare" className="nav-link">
                  Period Care
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/pregnancy" className="nav-link">
                  Pregnancy
                </Link>
              </li>

              <li className="nav-item username-display">
                <span className="nav-link welcome-text">
                  Welcome, {user.username}
                </span>
              </li>
              <li className="nav-item logout-button">
                <button onClick={logout} className="nav-link logout-btn">
                  Logout
                </button>
              </li>
            </>
          )}

          {/* Display login/register only when user is NOT logged in */}
          {!user && (
            <>
              <li className="nav-item">
                <Link href="/login" className="nav-link">
                  Login
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/register" className="nav-link">
                  Register
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
} 