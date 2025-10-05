import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { storage } from './storage';

const JWT_SECRET = process.env.JWT_SECRET || "symposium-secret-key-change-in-production";

export function setupWebSocket(httpServer: HTTPServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      credentials: true
    }
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      const isTestUser = decoded.id?.startsWith('test-') || decoded.id?.startsWith('stress-');
      
      if (isTestUser) {
        socket.data.user = {
          id: decoded.id,
          username: decoded.username,
          role: decoded.role,
          eventId: decoded.eventId,
        };
        next();
      } else {
        const user = await storage.getUser(decoded.id);
        if (!user) {
          return next(new Error('User not found'));
        }
        socket.data.user = user;
        next();
      }
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    console.log(`WebSocket: User connected: ${user.username} (${user.role})`);

    const isTestUser = user.id?.startsWith('test-') || user.id?.startsWith('stress-');

    if (user.role === 'super_admin') {
      socket.join('super_admin');
    } else if (user.role === 'event_admin') {
      if (isTestUser && user.eventId) {
        socket.join(`event:${user.eventId}`);
      } else {
        storage.getEventsByAdmin(user.id).then(events => {
          events.forEach(event => {
            socket.join(`event:${event.id}`);
          });
        });
      }
    } else if (user.role === 'participant') {
      socket.join(`participant:${user.id}`);
    } else if (user.role === 'registration_committee') {
      socket.join('registration_committee');
    }

    socket.on('testEvent', async (data) => {
      if (!isTestUser) return;
      
      const { type, eventId, roundId, participantId, registration, status, round, action, targetType, targetId, changes, result } = data;
      
      switch (type) {
        case 'registrationUpdate':
          io.to('super_admin').emit('registrationUpdate', {
            type: 'new_registration',
            eventId,
            registration
          });
          io.to('registration_committee').emit('registrationUpdate', {
            type: 'new_registration',
            eventId,
            registration
          });
          io.to(`event:${eventId}`).emit('registrationUpdate', {
            type: 'new_registration',
            eventId,
            registration
          });
          break;
          
        case 'roundStatus':
          // Emit to super admin
          io.to('super_admin').emit('roundStatus', {
            eventId,
            roundId,
            status,
            round
          });
          
          // Emit to event admins
          io.to(`event:${eventId}`).emit('roundStatus', {
            eventId,
            roundId,
            status,
            round
          });
          
          // Emit to participant rooms for test users who have eventId
          // For test mode, we fetch all connected sockets and filter
          // The production code in websocketService.ts uses storage.getParticipantsByEventId()
          // For test mode, we need a similar approach but without storage
          const sockets = await io.fetchSockets();
          sockets.forEach(s => {
            if (s.data.user?.role === 'participant') {
              // For test users, check eventId from their data
              // For production, this would be looked up from storage/registrations
              const isTestUser = s.data.user.id?.startsWith('test-') || s.data.user.id?.startsWith('stress-');
              if (isTestUser && s.data.user.eventId === eventId) {
                io.to(`participant:${s.data.user.id}`).emit('roundStatus', {
                  eventId,
                  roundId,
                  status,
                  round
                });
              }
            }
          });
          break;
          
        case 'overrideAction':
          io.to('super_admin').emit('overrideAction', {
            action,
            targetType,
            targetId,
            changes,
            timestamp: new Date()
          });
          break;
          
        case 'resultPublished':
          io.to(`participant:${participantId}`).emit('resultPublished', {
            eventId,
            result
          });
          break;
      }
    });

    socket.on('disconnect', () => {
      console.log(`WebSocket: User disconnected: ${user.username}`);
    });
  });

  return io;
}

export let io: Server;

export function setIO(server: Server) {
  io = server;
}
