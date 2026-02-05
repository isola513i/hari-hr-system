import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

export const initializeSocket = (httpServer: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        process.env.FRONTEND_URL || '',
      ].filter(Boolean),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeSocket first.');
  }
  return io;
};

// Event emitters for leave requests
export const emitLeaveRequestCreated = (leaveRequest: any) => {
  if (io) {
    io.emit('leave-request:created', leaveRequest);
  }
};

export const emitLeaveRequestUpdated = (leaveRequest: any) => {
  if (io) {
    io.emit('leave-request:updated', leaveRequest);
  }
};

export const emitLeaveRequestDeleted = (id: string) => {
  if (io) {
    io.emit('leave-request:deleted', { id });
  }
};
