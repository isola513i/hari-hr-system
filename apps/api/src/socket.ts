import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { query } from './db';

let io: SocketIOServer | null = null;

// In-memory availability status map for fast lookups
export interface UserStatus {
  status: 'online' | 'busy' | 'away' | 'offline';
  statusMessage: string;
  updatedAt: string;
}

const statusMap = new Map<string, UserStatus>();

// Track which socket belongs to which employee
const socketToEmployee = new Map<string, string>();

export const getStatusMap = () => statusMap;

export const initializeSocket = (httpServer: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://hari-hr-system.vercel.app',
        'https://hari-hr-system-api.vercel.app',
        process.env.FRONTEND_URL || '',
      ].filter(Boolean),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Load persisted statuses from DB on startup
  loadStatusesFromDB();

  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Client joins with their employeeId and a role-based room
    socket.on('user-status:join', (employeeId: unknown, role?: unknown) => {
      if (!employeeId || typeof employeeId !== 'string') return;
      socketToEmployee.set(socket.id, employeeId);

      // Join role-based room for targeted broadcasts
      if (typeof role === 'string' && ['HR_ADMIN', 'MANAGER', 'FINANCE', 'EMPLOYEE'].includes(role)) {
        socket.join(`room:${role.toLowerCase()}`);
      }
      socket.join(`employee:${employeeId}`);

      // If user had no status in memory, set to online
      if (!statusMap.has(employeeId)) {
        const now = new Date().toISOString();
        statusMap.set(employeeId, { status: 'online', statusMessage: '', updatedAt: now });
        persistStatus(employeeId, 'online', '');
      } else {
        // User reconnected — restore to their last non-offline status or set online
        const current = statusMap.get(employeeId)!;
        if (current.status === 'offline') {
          const now = new Date().toISOString();
          statusMap.set(employeeId, { ...current, status: 'online', updatedAt: now });
          persistStatus(employeeId, 'online', current.statusMessage);
        }
      }

      // Broadcast this user's current status (HR admin and managers need to see all)
      const userStatus = statusMap.get(employeeId)!;
      io!.to('room:hr_admin').to('room:manager').emit('user-status:changed', { employeeId, ...userStatus });
      socket.emit('user-status:changed', { employeeId, ...userStatus });

      // Send the full status map to the newly connected client
      const allStatuses: Record<string, UserStatus> = {};
      statusMap.forEach((val, key) => { allStatuses[key] = val; });
      socket.emit('user-status:initial', allStatuses);
    });

    // Client updates their own status
    socket.on('user-status:update', (data: { status: string; statusMessage?: string }) => {
      const employeeId = socketToEmployee.get(socket.id);
      if (!employeeId) return;

      const validStatuses = ['online', 'busy', 'away'];
      if (!validStatuses.includes(data.status)) return;

      const status = data.status as 'online' | 'busy' | 'away';
      const now = new Date().toISOString();
      const statusMessage = typeof data.statusMessage === 'string'
        ? data.statusMessage.slice(0, 100)
        : statusMap.get(employeeId)?.statusMessage ?? '';
      statusMap.set(employeeId, { status, statusMessage, updatedAt: now });

      // Persist to DB
      persistStatus(employeeId, status, statusMessage);

      // Broadcast to HR admin and managers only (targeted instead of all clients)
      io!.to('room:hr_admin').to('room:manager').emit('user-status:changed', { employeeId, status, statusMessage, updatedAt: now });
      socket.emit('user-status:changed', { employeeId, status, statusMessage, updatedAt: now });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      const employeeId = socketToEmployee.get(socket.id);
      if (employeeId) {
        socketToEmployee.delete(socket.id);

        // Check if this employee has any other active sockets
        const hasOtherSockets = Array.from(socketToEmployee.values()).includes(employeeId);
        if (!hasOtherSockets) {
          const now = new Date().toISOString();
          const current = statusMap.get(employeeId);
          statusMap.set(employeeId, {
            status: 'offline',
            statusMessage: current?.statusMessage ?? '',
            updatedAt: now,
          });
          persistStatus(employeeId, 'offline', current?.statusMessage ?? '');
          io!.to('room:hr_admin').to('room:manager').emit('user-status:changed', {
            employeeId,
            status: 'offline',
            statusMessage: current?.statusMessage ?? '',
            updatedAt: now,
          });
        }
      }
    });
  });

  return io;
};

async function loadStatusesFromDB() {
  try {
    const result = await query(
      `SELECT id, availability_status, status_message FROM employees WHERE availability_status IS NOT NULL`
    );
    const now = new Date().toISOString();
    for (const row of result.rows) {
      // On server startup nobody is connected yet, so all users start as offline.
      // Their status_message is preserved so it restores when they reconnect.
      statusMap.set(row.id, {
        status: 'offline',
        statusMessage: row.status_message || '',
        updatedAt: now,
      });
    }
    console.log(`Loaded ${result.rows.length} employees into status map (all offline until they connect)`);
  } catch (err) {
    // Column may not exist yet if migration hasn't run
    console.log('Could not load availability statuses from DB (migration may not have run yet)');
  }
}

async function persistStatus(employeeId: string, status: string, statusMessage: string) {
  try {
    await query(
      `UPDATE employees SET availability_status = $1, status_message = $2 WHERE id = $3`,
      [status, statusMessage, employeeId]
    );
  } catch (err) {
    // Silently fail if columns don't exist yet
    console.error('Failed to persist availability status:', err);
  }
}

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

// Event emitters for notifications
export const emitNotificationCreated = (notification: any) => {
  if (io) {
    io.emit('notification:new', notification);
  }
};

export const emitNotificationRefresh = () => {
  if (io) {
    io.emit('notification:refresh');
  }
};

// Event emitters for expense claims
export const emitExpenseClaimCreated = (expenseClaim: any) => {
  if (io) {
    io.emit('expense-claim:created', expenseClaim);
  }
};

export const emitExpenseClaimUpdated = (expenseClaim: any) => {
  if (io) {
    io.emit('expense-claim:updated', expenseClaim);
  }
};

export const emitExpenseClaimDeleted = (id: string) => {
  if (io) {
    io.emit('expense-claim:deleted', { id });
  }
};

// Event emitters for attendance
export const emitAttendanceUpdated = (attendance: any) => {
  if (io) {
    io.emit('attendance:updated', attendance);
  }
};

// Event emitters for employee profile changes
export const emitEmployeeUpdated = (employee: any) => {
  if (io) {
    io.emit('employee:updated', employee);
  }
};

// Event emitters for org chart changes
export const emitOrgChartUpdated = () => {
  if (io) {
    io.emit('orgchart:updated');
  }
};

// Event emitters for payroll processing
export const emitPayrollProcessed = (payroll: any) => {
  if (io) {
    io.emit('payroll:processed', payroll);
  }
};

// Event emitters for performance review assignments
export const emitPerformanceReviewAssigned = (review: any) => {
  if (io) {
    io.emit('performance-review:assigned', review);
  }
};

// Event emitters for training completion
export const emitTrainingCompleted = (training: any) => {
  if (io) {
    io.emit('training:completed', training);
  }
};

// Event emitters for compliance status changes
export const emitComplianceStatusChanged = (item: any) => {
  if (io) {
    io.emit('compliance:status-changed', item);
  }
};
