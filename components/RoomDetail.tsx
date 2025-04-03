'use client';

import React, { useState } from 'react';
import { RoomData, Transaction, TRANSACTION_TYPE } from '@/lib/socket';
import { useRooms } from '@/lib/roomContext';

interface RoomDetailProps {
  room: RoomData;
}

// Helper function to format timestamp
const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

// Helper function to format transaction text
const formatTransaction = (transaction: Transaction, roomId: string) => {
  switch(transaction.type) {
    case TRANSACTION_TYPE.TRANSFER:
      if (transaction.from === roomId) {
        return `Sent ${transaction.amount} points to ${transaction.to === 'gm' ? 'GM Room' : `Room ${transaction.to.replace('room', '')}`}`;
      } else if (transaction.to === roomId) {
        return `Received ${transaction.amount} points from ${transaction.from === 'gm' ? 'GM Room' : `Room ${transaction.from.replace('room', '')}`}`;
      }
      return `${transaction.from === 'gm' ? 'GM Room' : `Room ${transaction.from.replace('room', '')}`} sent ${transaction.amount} points to ${transaction.to === 'gm' ? 'GM Room' : `Room ${transaction.to.replace('room', '')}`}`;
    
    case TRANSACTION_TYPE.GM_EDIT:
      return `GM set points to ${transaction.amount}`;
    
    case TRANSACTION_TYPE.RESET:
      return 'All rooms reset to 20 points';
      
    default:
      return `Transaction: ${transaction.type} - ${transaction.amount} points`;
  }
};

const RoomDetail: React.FC<RoomDetailProps> = ({ room }) => {
  const { rooms, transactions, transferPoints, leaveRoom, updateRoomPoints, isGM, error } = useRooms();
  const [transferAmount, setTransferAmount] = useState(0);
  const [targetRoom, setTargetRoom] = useState('');
  const [editPoints, setEditPoints] = useState(room.points.toString());
  const [transferError, setTransferError] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  
  // GM Control Panel State
  const [selectedRoomForEdit, setSelectedRoomForEdit] = useState<string>('');
  const [gmEditPoints, setGmEditPoints] = useState<string>('');
  const [isUpdatingPoints, setIsUpdatingPoints] = useState(false);

  // Handle point transfer
  const handleTransfer = async () => {
    if (transferAmount > 0 && targetRoom && targetRoom !== room.id) {
      setIsTransferring(true);
      setTransferError(null);
      
      try {
        const result = await transferPoints(room.id, targetRoom, transferAmount);
        if (result.success) {
          // Reset form on success
          setTransferAmount(0);
          setTargetRoom('');
        } else {
          setTransferError(result.message || 'Failed to transfer points');
        }
      } catch (err) {
        setTransferError('An error occurred during transfer');
      } finally {
        setIsTransferring(false);
      }
    }
  };

  // Handle point update (GM only)
  const handlePointUpdate = () => {
    if (isGM) {
      const points = parseInt(editPoints);
      if (!isNaN(points) && points >= 0) {
        updateRoomPoints(room.id, points);
      }
    }
  };
  
  // Handle GM updating points for any room
  const handleGMRoomPointUpdate = () => {
    if (isGM && selectedRoomForEdit) {
      setIsUpdatingPoints(true);
      try {
        const points = parseInt(gmEditPoints);
        if (!isNaN(points) && points >= 0) {
          updateRoomPoints(selectedRoomForEdit, points);
          // Reset fields on successful update
          setSelectedRoomForEdit('');
          setGmEditPoints('');
        }
      } finally {
        setIsUpdatingPoints(false);
      }
    }
  };
  
  // Handle room selection for GM control panel
  const handleRoomSelectionChange = (roomId: string) => {
    // Ensure roomId is never undefined before setting state
    setSelectedRoomForEdit(roomId || '');
    if (roomId && rooms[roomId]) {
      const pointValue = rooms[roomId].points;
      setGmEditPoints(typeof pointValue === 'number' ? pointValue.toString() : '0');
    } else {
      setGmEditPoints('');
    }
  };

  // Determine which rooms are valid transfer targets
  // Only GM room or rooms with players are valid targets
  const validTransferTargets = Object.values(rooms).filter(r => 
    r.id !== room.id && (r.id === 'gm' || r.players.length > 0)
  );
  
  // Get all rooms except GM room for the GM control panel
  const allRoomsExceptGM = Object.values(rooms).filter(r => r.id !== 'gm');

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{room.name}</h2>
        <button 
          className="btn btn-danger"
          onClick={leaveRoom}
        >
          Leave Room
        </button>
      </div>

      <div className="text-lg mb-4">
        <p>
          Points: {
            typeof room.points === 'number' 
              ? <span className="font-bold">{room.points}</span>
              : <span className="italic text-gray-500">Confidential</span>
          }
        </p>
        <p>Players: <span className="font-bold">{room.players.length}</span></p>
      </div>

      {/* Display transfer error message if any */}
      {transferError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
          {transferError}
        </div>
      )}
      
      {/* Display global error message if any */}
      {error && !transferError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      {room.id !== 'gm' && (
        <div className="border-t pt-4 mt-4">
          <h3 className="text-xl font-semibold mb-2">Transfer Points</h3>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max={typeof room.points === 'number' ? room.points : 0}
              className="input w-24"
              value={transferAmount || ''}
              onChange={(e) => setTransferAmount(parseInt(e.target.value) || 0)}
              placeholder="Amount"
              disabled={isTransferring || typeof room.points !== 'number'}
            />
            <select 
              className="input flex-1"
              value={targetRoom || ''}
              onChange={(e) => setTargetRoom(e.target.value || '')}
              disabled={isTransferring}
            >
              <option value="">Select Room</option>
              {validTransferTargets.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.id !== 'gm' ? `(${r.players.length} players)` : ''}
                </option>
              ))}
            </select>
            <button 
              className="btn btn-primary"
              onClick={handleTransfer}
              disabled={
                isTransferring || 
                !transferAmount || 
                !targetRoom || 
                typeof room.points !== 'number' || 
                transferAmount > room.points
              }
            >
              {isTransferring ? 'Transferring...' : 'Transfer'}
            </button>
          </div>
          {validTransferTargets.length === 0 && (
            <p className="text-yellow-600 mt-2">
              No rooms available for transfer. You can only transfer to GM room or rooms with players.
            </p>
          )}
        </div>
      )}

      {/* Transaction History */}
      <div className="border-t pt-4 mt-4">
        <h3 className="text-xl font-semibold mb-2">Transaction History</h3>
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 max-h-60 overflow-y-auto">
          {transactions && transactions.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {transactions.map(transaction => (
                <li key={transaction.id} className="py-2">
                  <div className="flex flex-col">
                    <div className="text-sm">
                      {formatTransaction(transaction, room.id)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTimestamp(transaction.timestamp)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-center py-2">No transaction history</p>
          )}
        </div>
      </div>

      {/* GM Controls for Current Room */}
      {isGM && room.id !== 'gm' && (
        <div className="border-t pt-4 mt-4">
          <h3 className="text-xl font-semibold mb-2">GM Controls</h3>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              className="input w-24"
              value={editPoints}
              onChange={(e) => setEditPoints(e.target.value)}
              placeholder="Points"
            />
            <button 
              className="btn btn-primary"
              onClick={handlePointUpdate}
            >
              Update Points
            </button>
          </div>
        </div>
      )}
      
      {/* GM Room Control Panel */}
      {room.id === 'gm' && (
        <div className="border-t pt-4 mt-4">
          <h3 className="text-xl font-semibold mb-2">GM Control Panel</h3>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-700 mb-3">Edit points for any room:</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {allRoomsExceptGM.map(r => (
                <div key={r.id} className="flex justify-between items-center p-2 border rounded bg-white">
                  <div>
                    <span className="font-medium">{r.name}: </span>
                    <span className="text-gray-700">
                      {typeof r.points === 'number' 
                        ? `${r.points} points` 
                        : 'Confidential'}
                    </span>
                    {r.players.length > 0 && <span className="ml-2 text-green-600">• Active</span>}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4">
              <label className="block text-gray-700 mb-2">Select room to edit:</label>
              <div className="flex flex-wrap gap-3">
                <select 
                  className="input flex-1"
                  value={selectedRoomForEdit || ''}
                  onChange={(e) => handleRoomSelectionChange(e.target.value || '')}
                  disabled={isUpdatingPoints}
                >
                  <option value="">Select Room</option>
                  {allRoomsExceptGM.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Currently: {typeof r.points === 'number' ? `${r.points} points` : 'Confidential'})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  className="input w-32"
                  value={gmEditPoints}
                  onChange={(e) => setGmEditPoints(e.target.value)}
                  placeholder="New Points"
                  disabled={!selectedRoomForEdit || isUpdatingPoints}
                />
                <button 
                  className="btn btn-primary"
                  onClick={handleGMRoomPointUpdate}
                  disabled={!selectedRoomForEdit || !gmEditPoints || isUpdatingPoints}
                >
                  {isUpdatingPoints ? 'Updating...' : 'Update Points'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomDetail; 