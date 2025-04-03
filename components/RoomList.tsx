'use client';

import React, { useState } from 'react';
import RoomCard from './RoomCard';
import { useRooms } from '@/lib/roomContext';

const RoomList: React.FC = () => {
  const { rooms, joinRoom, currentRoom, error } = useRooms();
  const [joiningRoom, setJoiningRoom] = useState<string | null>(null);

  // Handle room selection
  const handleRoomSelect = async (roomId: string) => {
    // Don't do anything if already in this room
    if (currentRoom === roomId) return;
    
    setJoiningRoom(roomId);
    
    try {
      const result = await joinRoom(roomId);
      // Joining is handled by the context through event listeners
    } catch (err) {
      console.error('Error joining room:', err);
    } finally {
      setJoiningRoom(null);
    }
  };
  
  // Check if a room is available (empty or GM room)
  const isRoomAvailable = (roomId: string) => {
    if (roomId === 'gm') return true;
    return rooms[roomId].players.length === 0;
  };

  return (
    <div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.values(rooms).map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            isSelected={currentRoom === room.id}
            isJoining={joiningRoom === room.id}
            isAvailable={isRoomAvailable(room.id)}
            onClick={() => handleRoomSelect(room.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default RoomList; 