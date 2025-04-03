'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { RoomData, Transaction, getSocket } from './socket';

interface RoomContextType {
  rooms: Record<string, RoomData>;
  currentRoom: string | null;
  transactions: Transaction[];
  joinRoom: (roomId: string) => Promise<{ success: boolean; message?: string }>;
  leaveRoom: () => void;
  transferPoints: (fromRoomId: string, toRoomId: string, amount: number) => Promise<{ success: boolean; transaction?: Transaction; message?: string }>;
  updateRoomPoints: (roomId: string, points: number) => void; // GM only
  isGM: boolean;
  error: string | null;
  getTransactionHistory: (roomId: string) => void;
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export const RoomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rooms, setRooms] = useState<Record<string, RoomData>>({});
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Determine if the user is in the GM room
  const isGM = currentRoom === 'gm';

  useEffect(() => {
    const socket = getSocket();
    
    // Listen for room updates
    socket.on('roomUpdate', (roomData) => {
      setRooms(prev => ({
        ...prev,
        [roomData.id]: roomData
      }));
    });

    // Listen for all rooms update
    socket.on('allRoomsUpdate', (roomsData) => {
      setRooms(roomsData);
    });
    
    // Listen for join room results
    socket.on('joinRoomResult', (result) => {
      if (result.success) {
        setCurrentRoom(result.roomId);
        
        // Set transaction history if provided
        if (result.history) {
          setTransactions(result.history);
        }
        
        setError(null);
      } else {
        setError(result.message || 'Failed to join room');
        // Keep the current room if join failed
      }
    });
    
    // Listen for transfer points results
    socket.on('transferPointsResult', (result) => {
      if (!result.success) {
        setError(result.message || 'Failed to transfer points');
      } else {
        setError(null);
        // Update transactions if provided
        if (result.history) {
          setTransactions(result.history);
        }
      }
    });
    
    // Listen for transaction history updates
    socket.on('transactionHistory', (history) => {
      setTransactions(history);
    });
    
    // Listen for new transactions
    socket.on('newTransaction', (transaction) => {
      setTransactions(prev => [transaction, ...prev]);
    });
    
    // Listen for GM points updates
    socket.on('pointsUpdated', (result) => {
      if (result.history) {
        setTransactions(result.history);
      }
    });
    
    // Set player ID
    setPlayerId(socket.id);

    // Cleanup on unmount
    return () => {
      socket.off('roomUpdate');
      socket.off('allRoomsUpdate');
      socket.off('joinRoomResult');
      socket.off('transferPointsResult');
      socket.off('transactionHistory');
      socket.off('newTransaction');
      socket.off('pointsUpdated');
    };
  }, []);

  // Join a room
  const joinRoom = (roomId: string): Promise<{ success: boolean; message?: string }> => {
    return new Promise((resolve) => {
      const socket = getSocket();
      
      // Set up a one-time listener for the result
      const handleJoinResult = (result: { success: boolean; roomId: string; message?: string }) => {
        resolve(result);
        socket.off('joinRoomResult', handleJoinResult);
      };
      
      socket.on('joinRoomResult', handleJoinResult);
      
      // Send join room request
      socket.emit('joinRoom', roomId);
    });
  };

  // Leave the current room
  const leaveRoom = () => {
    if (currentRoom) {
      const socket = getSocket();
      socket.emit('leaveRoom', currentRoom);
      setCurrentRoom(null);
      // Clear transactions when leaving a room
      setTransactions([]);
    }
  };

  // Transfer points between rooms
  const transferPoints = (fromRoomId: string, toRoomId: string, amount: number): Promise<{ success: boolean; transaction?: Transaction; message?: string }> => {
    return new Promise((resolve) => {
      if (fromRoomId && toRoomId && amount > 0) {
        const socket = getSocket();
        
        // Set up a one-time listener for the result
        const handleTransferResult = (result: { success: boolean; transaction?: Transaction; message?: string }) => {
          resolve(result);
          socket.off('transferPointsResult', handleTransferResult);
        };
        
        socket.on('transferPointsResult', handleTransferResult);
        
        // Send transfer request
        socket.emit('transferPoints', fromRoomId, toRoomId, amount);
      } else {
        resolve({ success: false, message: 'Invalid transfer parameters' });
      }
    });
  };

  // Update room points (GM only)
  const updateRoomPoints = (roomId: string, points: number) => {
    if (isGM && roomId && points >= 0) {
      const socket = getSocket();
      socket.emit('updateRoomPoints', roomId, points);
    }
  };
  
  // Request transaction history for a room
  const getTransactionHistory = (roomId: string) => {
    const socket = getSocket();
    socket.emit('getTransactionHistory', roomId);
  };

  return (
    <RoomContext.Provider
      value={{
        rooms,
        currentRoom,
        transactions,
        joinRoom,
        leaveRoom,
        transferPoints,
        updateRoomPoints,
        isGM,
        error,
        getTransactionHistory
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};

export const useRooms = () => {
  const context = useContext(RoomContext);
  if (context === undefined) {
    throw new Error('useRooms must be used within a RoomProvider');
  }
  return context;
}; 