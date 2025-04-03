# Game Room System

A multiplayer game room system built with Next.js and Socket.io.

## Features

- Room-based game system with 11 standard rooms and 1 GM room
- Points system starting at 20 points per room
- Point transfer between rooms
- Room persistence (points are remembered when players leave/rejoin)
- Room reset when all players leave
- GM controls for editing room points

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

2. Start the Socket.io server:
   ```bash
   npm run server
   # or for development with auto-restart
   npm run dev:server
   ```

3. In a separate terminal, start the Next.js development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## How It Works

- The Socket.io server runs on port 3001 and handles all real-time communication
- The Next.js application connects to the Socket.io server to get real-time updates
- When a player joins a room, they can see the current state of that room including points
- Points can be transferred between rooms
- When all players leave a room, its points reset to 20
- The GM room has special privileges to edit points in any room

## Implementation Details

- Next.js for the frontend
- Socket.io for real-time communication
- Tailwind CSS for styling
- React context for state management

## Project Structure

- `/app` - Next.js pages
- `/components` - React components
- `/lib` - Socket.io client setup and context providers
- `/styles` - Global styles
- `server.js` - Custom Socket.io server implementation 