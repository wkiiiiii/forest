'use client';

import { useEffect } from 'react';
import { RoomProvider } from '@/lib/roomContext';
import RoomList from '@/components/RoomList';
import RoomDetail from '@/components/RoomDetail';
import { useRooms } from '@/lib/roomContext';
import { initializeSocket } from '@/lib/socket';

// Main content component
const GameContent = () => {
  const { rooms, currentRoom } = useRooms();
  
  // Get the current room data if we're in a room
  const currentRoomData = currentRoom ? rooms[currentRoom] : null;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Game Room System</h1>
      
      {currentRoomData ? (
        // Show only room detail when in a room
        <div className="mb-8">
          <RoomDetail room={currentRoomData} />
        </div>
      ) : (
        // Show room selection when not in a room
        <>
          <div className="text-center mb-8">
            <p className="text-lg">Select a room to join</p>
          </div>
          
          <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">Available Rooms</h2>
            <RoomList />
          </div>
        </>
      )}
    </div>
  );
};

// Home page with provider
export default function Home() {
  // Initialize socket on client side
  useEffect(() => {
    initializeSocket();
  }, []);

  return (
    <RoomProvider>
      <GameContent />
    </RoomProvider>
  );
} 