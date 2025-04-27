# Cyclova Frontend

The frontend application for Cyclova - a comprehensive women's health platform with pregnancy tracking, period care, and appointment scheduling features.

## Features

- **Dark Theme**: Beautiful dark UI with animations and gradients
- **Authentication**: Login and registration system
- **Pregnancy Tracker**: Track pregnancy journey with milestones and insights
- **Period Care**: Track periods, symptoms, and moods
- **Appointment Booking**: AI-powered appointment booking assistant

## Tech Stack

- **Next.js**: React framework for production
- **TypeScript**: Static typing
- **CSS Modules**: For styling (no Tailwind)
- **Context API**: For state management

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository
2. Navigate to the Frontend directory

```bash
cd Frontend
```

3. Install dependencies

```bash
npm install
```

4. Start the development server

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Backend Integration

This frontend is designed to work with the Cyclova Backend. Make sure the backend server is running on the expected endpoint.

## Development

The project is structured as follows:

- `app/`: Next.js app directory
  - `components/`: Reusable UI components
  - `context/`: React context providers
  - `styles/`: CSS files
  - `services/`: API service functions

## Building for Production

```bash
npm run build
```

This will create an optimized production build in the `.next` folder. 