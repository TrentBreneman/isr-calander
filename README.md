# iSolvRisk Calendar

A simple, modern, Apple-style calendar for our company built with Next.js, Supabase, and TypeScript.

## Features
- **Apple Calendar UI**: Clean, professional design inspired by the Apple Calendar experience.
- **Authentication**: Secure login and session management powered by Supabase Auth.
- **Persistent Events**: All events are stored in a Supabase PostgreSQL database for cross-device access.
- **Continuous Multi-Day Events**: Events spanning multiple days are rendered as single, continuous bars across the week.
- **Smart Time Positioning**: Timed events are positioned vertically within their day cell based on their hour (8 AM at the top, 8 PM at the bottom).
- **12h Time Format**: Clear, readable time labels in standard 12-hour format.
- **Apple Calendar Sync**: Export your events to an `.ics` file for easy syncing with Apple Calendar and other calendar apps.
- **Responsive Design**: Optimized for everything from mobile devices to large laptop screens, fitting perfectly within the viewport.

## Getting Started

First, install the dependencies:

```bash
npm install
```

Set up your environment variables in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the calendar.

## How to use
- **Authentication**: Sign in with your company credentials to access your personal calendar.
- **Add Event**: Click the "+" button on any day or use the "Add Event" button in the header.
- **Edit/Delete Event**: Click on an existing event to open the edit modal, where you can update details or delete the event.
- **Export**: Use the "Sync to Apple Calendar" button to download your events in ICS format.
- **Navigation**: Use the arrows to change months or click "Today" to return to the current date.

## Deployment

The project is configured for automated deployment to `israutomizer.com` using:

```bash
npm run deploy
```
