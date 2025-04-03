import { io, Socket } from 'socket.io-client';

// Transaction type definitions
export const TRANSACTION_TYPE = {
  TRANSFER: 'transfer',
  GM_EDIT: 'gm_edit',
  RESET: 'reset'
};

// Transaction interface
export interface Transaction {
  id: string;
  timestamp: string;
  type: string;
  from: string;
  to: string;
  amount: number;
}

// Types for our socket events
export interface ServerToClientEvents {
  roomUpdate: (roomData: RoomData) => void;
  allRoomsUpdate: (rooms: Record<string, RoomData>) => void;
  joinRoomResult: (result: JoinRoomResult) => void;
  transferPointsResult: (result: TransferPointsResult) => void;
  transactionHistory: (transactions: Transaction[]) => void;
  newTransaction: (transaction: Transaction) => void;
  pointsUpdated: (result: PointsUpdatedResult) => void;
}

export interface ClientToServerEvents {
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  transferPoints: (from: string, to: string, amount: number) => void;
  updateRoomPoints: (roomId: string, points: number) => void; // For GM only
  getTransactionHistory: (roomId: string) => void;
}

// Room data structure
export interface RoomData {
  id: string;
  name: string;
  points: number | string; // Can be '?' for hidden points
  players: string[];
}

// Result types
export interface JoinRoomResult {
  success: boolean;
  roomId: string;
  points?: number;
  history?: Transaction[];
  message?: string;
}

export interface TransferPointsResult {
  success: boolean;
  transaction?: Transaction;
  history?: Transaction[];
  message?: string;
}

export interface PointsUpdatedResult {
  roomId: string;
  oldPoints: number;
  newPoints: number;
  transaction: Transaction;
  history: Transaction[];
}

// Initialize socket
let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export const initializeSocket = () => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      autoConnect: true,
      reconnection: true,
    });
  }
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initializeSocket();
  }
  return socket;
}; 