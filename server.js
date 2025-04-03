const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

// Load environment variables
const dotenvPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(dotenvPath)) {
  require('dotenv').config({ path: dotenvPath });
}

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const PORT = process.env.PORT || 3001;

// Transaction type definitions
const TRANSACTION_TYPE = {
  TRANSFER: 'transfer',
  GM_EDIT: 'gm_edit',
  RESET: 'reset'
};

// Transaction history for each room
const transactionHistory = {
  'room1': [],
  'room2': [],
  'room3': [],
  'room4': [],
  'room5': [],
  'room6': [],
  'room7': [],
  'room8': [],
  'room9': [],
  'room10': [],
  'room11': [],
  'gm': [] // GM room has all transactions
};

// Add a new transaction
const addTransaction = (fromRoomId, toRoomId, amount, type) => {
  const timestamp = new Date().toISOString();
  const transaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp,
    type,
    from: fromRoomId,
    to: toRoomId,
    amount
  };
  
  // Add to GM history (GM sees all transactions)
  transactionHistory['gm'].push(transaction);
  
  // For transfers, add to both source and destination rooms' history
  if (type === TRANSACTION_TYPE.TRANSFER) {
    if (fromRoomId !== 'gm') {
      transactionHistory[fromRoomId].push(transaction);
    }
    if (toRoomId !== 'gm') {
      transactionHistory[toRoomId].push(transaction);
    }
  }
  
  // For GM edits, add to the affected room's history
  if (type === TRANSACTION_TYPE.GM_EDIT) {
    if (toRoomId !== 'gm') {
      transactionHistory[toRoomId].push(transaction);
    }
  }
  
  return transaction;
};

// Room data
const rooms = {
  'room1': { id: 'room1', name: 'Room 1', points: 20, players: [] },
  'room2': { id: 'room2', name: 'Room 2', points: 20, players: [] },
  'room3': { id: 'room3', name: 'Room 3', points: 20, players: [] },
  'room4': { id: 'room4', name: 'Room 4', points: 20, players: [] },
  'room5': { id: 'room5', name: 'Room 5', points: 20, players: [] },
  'room6': { id: 'room6', name: 'Room 6', points: 20, players: [] },
  'room7': { id: 'room7', name: 'Room 7', points: 20, players: [] },
  'room8': { id: 'room8', name: 'Room 8', points: 20, players: [] },
  'room9': { id: 'room9', name: 'Room 9', points: 20, players: [] },
  'room10': { id: 'room10', name: 'Room 10', points: 20, players: [] },
  'room11': { id: 'room11', name: 'Room 11', points: 20, players: [] },
  'gm': { id: 'gm', name: 'GM Room', points: 0, players: [] },
};

// Helper to check if a room is empty
const isRoomEmpty = (roomId) => {
  return rooms[roomId].players.length === 0;
};

// Helper to check if a room is available for a player to join
const isRoomAvailable = (roomId) => {
  // All rooms can only have one player at a time (including GM)
  return isRoomEmpty(roomId);
};

// Helper to filter confidential data from room objects
const filterRoomData = (roomData, forRoomId) => {
  const result = {};
  
  Object.keys(roomData).forEach(roomId => {
    // Create a copy of the room
    const room = { ...roomData[roomId] };
    
    // Hide point values for rooms other than the player's current room and GM
    if (roomId !== forRoomId && forRoomId !== 'gm') {
      room.points = '?';
    }
    
    result[roomId] = room;
  });
  
  return result;
};

// Helper to get room transaction history
const getRoomTransactionHistory = (roomId) => {
  if (roomId === 'gm') {
    // Sort by timestamp, most recent first
    return [...transactionHistory['gm']].sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
  }
  
  return [...transactionHistory[roomId]].sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );
};

// Helper to check if a room is valid for point transfer
const isValidTransferTarget = (roomId) => {
  // GM room is always a valid transfer target
  if (roomId === 'gm') {
    return true;
  }
  // Regular rooms are only valid if they have at least one player
  return !isRoomEmpty(roomId);
};

// Helper to check if all rooms are empty
const areAllRoomsEmpty = () => {
  // Check if all rooms from room1 to room11 are empty
  for (let i = 1; i <= 11; i++) {
    const roomId = `room${i}`;
    if (rooms[roomId].players.length > 0) {
      return false;
    }
  }
  return true;
};

// Reset all room points if all rooms are empty
const resetRoomPointsIfAllEmpty = () => {
  if (areAllRoomsEmpty()) {
    console.log('All rooms are empty, resetting all points to 20');
    
    // Reset all room points to 20
    for (let i = 1; i <= 11; i++) {
      const roomId = `room${i}`;
      rooms[roomId].points = 20;
    }
    
    // Add a reset transaction to the GM history
    addTransaction('system', 'all_rooms', 20, 'reset');
  }
};

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? [
            'https://forest-1-va6j.onrender.com', 
            'https://forest-1.onrender.com', 
            'https://*.onrender.com'
          ] 
        : '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
  });

  io.on('connection', (socket) => {
    console.log('New client connected', socket.id);
    
    // Track user's current room for sending filtered data
    let currentUserRoom = null;
    
    // Send initial room data to the client (without points)
    socket.emit('allRoomsUpdate', filterRoomData(rooms, null));

    // Handle joining a room
    socket.on('joinRoom', (roomId) => {
      console.log(`Client ${socket.id} attempting to join room ${roomId}`);
      
      // Check if room exists and is available
      if (rooms[roomId] && isRoomAvailable(roomId)) {
        if (!rooms[roomId].players.includes(socket.id)) {
          // First, leave any current room
          Object.keys(rooms).forEach(existingRoomId => {
            if (rooms[existingRoomId].players.includes(socket.id)) {
              // Remove player from current room
              rooms[existingRoomId].players = rooms[existingRoomId].players.filter(
                (playerId) => playerId !== socket.id
              );
              socket.leave(existingRoomId);
              
              // Notify about the update
              io.emit('roomUpdate', rooms[existingRoomId]);
            }
          });
          
          // Now add player to the new room
          rooms[roomId].players.push(socket.id);
          socket.join(roomId);
          
          // Update the user's current room
          currentUserRoom = roomId;
          
          // Get room transaction history
          const history = getRoomTransactionHistory(roomId);
          
          // Notify clients about the update
          io.emit('roomUpdate', rooms[roomId]);
          socket.emit('allRoomsUpdate', filterRoomData(rooms, roomId));
          socket.emit('transactionHistory', history);
          
          // Send success message to client
          socket.emit('joinRoomResult', { 
            success: true, 
            roomId,
            points: rooms[roomId].points,
            history
          });
        }
      } else {
        // Room is not available or doesn't exist
        console.log(`Room ${roomId} is not available for client ${socket.id}`);
        socket.emit('joinRoomResult', { 
          success: false, 
          roomId,
          message: rooms[roomId] ? 'Room is already occupied' : 'Room does not exist'
        });
      }
    });

    // Handle leaving a room
    socket.on('leaveRoom', (roomId) => {
      console.log(`Client ${socket.id} left room ${roomId}`);
      
      if (rooms[roomId]) {
        // Remove player from room
        rooms[roomId].players = rooms[roomId].players.filter(
          (playerId) => playerId !== socket.id
        );
        
        socket.leave(roomId);
        currentUserRoom = null;
        
        // Check if all rooms are empty and reset points if needed
        resetRoomPointsIfAllEmpty();
        
        // Notify clients about the update
        io.emit('roomUpdate', rooms[roomId]);
        socket.emit('allRoomsUpdate', filterRoomData(rooms, null));
      }
    });

    // Handle transferring points between rooms
    socket.on('transferPoints', (from, to, amount) => {
      console.log(`Transfer ${amount} points from ${from} to ${to}`);
      
      // Check if target room is valid for transfer (GM or has players)
      if (!isValidTransferTarget(to)) {
        console.log(`Transfer to room ${to} rejected: room is empty`);
        socket.emit('transferPointsResult', { 
          success: false, 
          message: 'Can only transfer points to GM room or rooms with players'
        });
        return;
      }
      
      if (rooms[from] && rooms[to] && amount > 0 && rooms[from].points >= amount) {
        rooms[from].points -= amount;
        rooms[to].points += amount;
        
        // Add transaction to history
        const transaction = addTransaction(from, to, amount, TRANSACTION_TYPE.TRANSFER);
        
        // Get updated history for the current room
        const history = getRoomTransactionHistory(from);
        
        // Notify clients about the update
        io.emit('roomUpdate', rooms[from]);
        io.emit('roomUpdate', rooms[to]);
        
        // Send filtered updates to all clients
        io.sockets.sockets.forEach(clientSocket => {
          const clientRoom = Array.from(clientSocket.rooms).find(room => room !== clientSocket.id);
          clientSocket.emit('allRoomsUpdate', filterRoomData(rooms, clientRoom));
          
          // Send transaction history to involved rooms
          if (clientRoom === from || clientRoom === to || clientRoom === 'gm') {
            clientSocket.emit('transactionHistory', getRoomTransactionHistory(clientRoom));
            
            // If this is the specific room getting new transaction
            if (clientRoom === from) {
              clientSocket.emit('newTransaction', transaction);
            }
          }
        });
        
        // Send success message
        socket.emit('transferPointsResult', { 
          success: true,
          transaction,
          history
        });
      } else {
        socket.emit('transferPointsResult', { 
          success: false, 
          message: 'Invalid transfer: insufficient points or invalid rooms'
        });
      }
    });

    // GM only - update room points directly
    socket.on('updateRoomPoints', (roomId, points) => {
      console.log(`GM updating ${roomId} points to ${points}`);
      
      // Check if user is in GM room
      if (rooms['gm'].players.includes(socket.id) && rooms[roomId]) {
        const oldPoints = rooms[roomId].points;
        rooms[roomId].points = points;
        
        // Add transaction to history
        const transaction = addTransaction('gm', roomId, points, TRANSACTION_TYPE.GM_EDIT);
        
        // Update GM's transaction history
        const gmHistory = getRoomTransactionHistory('gm');
        
        // Notify clients about the update
        io.emit('roomUpdate', rooms[roomId]);
        
        // Send filtered updates to all clients
        io.sockets.sockets.forEach(clientSocket => {
          const clientRoom = Array.from(clientSocket.rooms).find(room => room !== clientSocket.id);
          clientSocket.emit('allRoomsUpdate', filterRoomData(rooms, clientRoom));
          
          // Send transaction history to involved rooms
          if (clientRoom === roomId || clientRoom === 'gm') {
            clientSocket.emit('transactionHistory', getRoomTransactionHistory(clientRoom));
          }
        });
        
        // Send update to GM
        socket.emit('pointsUpdated', {
          roomId,
          oldPoints,
          newPoints: points,
          transaction,
          history: gmHistory
        });
      }
    });

    // Handle request for transaction history
    socket.on('getTransactionHistory', (roomId) => {
      if (currentUserRoom === roomId || currentUserRoom === 'gm') {
        const history = getRoomTransactionHistory(roomId);
        socket.emit('transactionHistory', history);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected', socket.id);
      
      // Remove player from all rooms
      Object.keys(rooms).forEach(roomId => {
        if (rooms[roomId].players.includes(socket.id)) {
          rooms[roomId].players = rooms[roomId].players.filter(
            (playerId) => playerId !== socket.id
          );
          
          // Notify clients about the update
          io.emit('roomUpdate', rooms[roomId]);
        }
      });
      
      // Check if all rooms are empty and reset points if needed
      resetRoomPointsIfAllEmpty();
      
      // Update all clients with the latest room data (filtered)
      io.sockets.sockets.forEach(clientSocket => {
        const clientRoom = Array.from(clientSocket.rooms).find(room => room !== clientSocket.id);
        clientSocket.emit('allRoomsUpdate', filterRoomData(rooms, clientRoom));
      });
    });
  });

  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on ${process.env.NODE_ENV === 'production' ? 'your production URL' : `http://localhost:${PORT}`}`);
  });
}); 