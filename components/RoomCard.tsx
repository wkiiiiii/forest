'use client';

import React from 'react';
import { RoomData } from '@/lib/socket';

interface RoomCardProps {
  room: RoomData;
  isSelected: boolean;
  isJoining?: boolean;
  isAvailable?: boolean;
  onClick: () => void;
}

const RoomCard: React.FC<RoomCardProps> = ({ 
  room, 
  isSelected, 
  isJoining = false, 
  isAvailable = true, 
  onClick 
}) => {
  // Determine card style based on state
  const cardClassNames = [
    'room-card',
    isSelected ? 'room-card-selected' : '',
    !isAvailable && !isSelected ? 'opacity-60 border-gray-300 cursor-not-allowed' : '',
    isJoining ? 'animate-pulse' : ''
  ].filter(Boolean).join(' ');

  // Handle click - prevent if room is not available
  const handleClick = () => {
    if (isAvailable || isSelected) {
      onClick();
    }
  };

  return (
    <div 
      className={cardClassNames} 
      onClick={handleClick}
    >
      <h3 className="text-lg font-semibold">
        {room.name}
        {!isAvailable && !isSelected && <span className="ml-2 text-red-500 text-sm">(Occupied)</span>}
        {isJoining && <span className="ml-2 text-blue-500 text-sm">(Joining...)</span>}
      </h3>
      <div className="flex justify-between items-center mt-2">
        <span className="text-gray-600">
          Players: <span className="font-bold">{room.players.length}</span>
        </span>
      </div>
    </div>
  );
};

export default RoomCard; 