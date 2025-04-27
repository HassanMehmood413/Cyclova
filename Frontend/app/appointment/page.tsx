'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/appointment.css';

interface Message {
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export default function AppointmentBooking() {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat with greeting from AI assistant
  useEffect(() => {
    setMessages([
      {
        content: "Hi there! I'm Sam, your appointment assistant. How can I help you today?",
        sender: 'ai',
        timestamp: new Date()
      }
    ]);
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim()) return;
    
    // Add user message to chat
    const userMessage: Message = {
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    
    try {
      // Send message to AI agent
      const response = await fetch('/appointment/chat_with_agent', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_input: userMessage.content
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response from agent');
      }
      
      const data = await response.json();
      
      // Add AI response to chat
      const aiMessage: Message = {
        content: data.response,
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error communicating with appointment agent:', error);
      
      // Add error message
      const errorMessage: Message = {
        content: "I'm sorry, I encountered an error. Please try again later.",
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="appointment-container">
      <div className="appointment-header">
        <h1>Book Your Appointment</h1>
        <p>Chat with Sam, our AI assistant, to schedule your next appointment</p>
      </div>
      
      <div className="chat-container">
        <div className="chat-messages">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`message ${message.sender === 'user' ? 'user-message' : 'ai-message'}`}
            >
              <div className="message-content">{message.content}</div>
              <div className="message-time">{formatTime(message.timestamp)}</div>
            </div>
          ))}
          
          {isLoading && (
            <div className="message ai-message">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        <form className="chat-input-container" onSubmit={sendMessage}>
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
          />
          <button 
            type="submit" 
            className="send-button"
            disabled={isLoading || !inputMessage.trim()}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </div>
      
      <div className="appointment-info">
        <h2>What can Sam help you with?</h2>
        <div className="info-cards">
          <div className="info-card">
            <div className="info-icon schedule-icon"></div>
            <h3>Schedule Appointments</h3>
            <p>Book a new appointment at your preferred date and time</p>
          </div>
          
          <div className="info-card">
            <div className="info-icon reschedule-icon"></div>
            <h3>Reschedule</h3>
            <p>Change the date or time of your existing appointment</p>
          </div>
          
          <div className="info-card">
            <div className="info-icon cancel-icon"></div>
            <h3>Cancel Appointments</h3>
            <p>Cancel an appointment that you no longer need</p>
          </div>
        </div>
      </div>
    </div>
  );
} 