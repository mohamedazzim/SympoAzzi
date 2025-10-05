# WebSocket Events Documentation

## Overview

The BootFeet 2K26 Symposium Management System uses WebSocket communication for real-time updates across the platform. This enables instant notifications for registration updates, round status changes, admin overrides, and result publishing.

## Connection

- **Endpoint**: `window.location.origin`
- **Authentication**: JWT token passed in `auth.token` during handshake
- **Reconnection**: Automatic with exponential backoff (1000ms delay, 5 attempts)

## Client Usage

```typescript
import { useWebSocket } from '@/hooks/useWebSocket';

// In your component
const { isConnected, socket } = useWebSocket();
```

The WebSocket connection is automatically established when a user is authenticated and disconnects on logout.

## Events

### 1. registrationUpdate

Sent when a new participant registers for an event.

**Recipients**: 
- Super Admin
- Registration Committee
- Event Admins (for their events)

**Payload**:
```typescript
{
  type: 'new_registration',
  eventId: string,
  registration: {
    id: string,
    participantId: string,
    fullName: string,
    email: string,
    eventName: string,
    ...
  }
}
```

**Triggered by**:
- POST `/api/registration-forms/:slug/submit` - Public registration
- POST `/api/registration-committee/participants` - On-spot registration

---

### 2. roundStatus

Sent when a round's status changes (start/end/restart).

**Recipients**: 
- Super Admin
- Event Admins (for their events)
- All connected users (via `roundStatusPublic`)

**Payload**:
```typescript
{
  eventId: string,
  roundId: string,
  status: 'not_started' | 'in_progress' | 'completed',
  round: {
    id: string,
    name: string,
    description: string,
    duration: number,
    startTime: Date,
    endTime: Date,
    ...
  }
}
```

**Triggered by**:
- POST `/api/rounds/:roundId/start` - Start round
- POST `/api/rounds/:roundId/end` - End round
- POST `/api/rounds/:roundId/restart` - Restart round

---

### 3. roundStatusPublic

Public broadcast of round status changes to all connected users.

**Recipients**: All connected users

**Payload**: Same as `roundStatus` event

---

### 4. overrideAction

Sent when a super admin performs an override action.

**Recipients**: 
- Super Admin
- Event Admins (if event-related override)

**Payload**:
```typescript
{
  action: string, // 'override_event', 'delete_event', 'override_question', etc.
  targetType: 'event' | 'question' | 'round',
  targetId: string,
  changes: {
    before?: any,
    after?: any,
    ...
  },
  timestamp: Date
}
```

**Triggered by**:
- PUT `/api/super-admin/events/:eventId/override` - Override event
- DELETE `/api/super-admin/events/:eventId/override` - Delete event
- PUT `/api/super-admin/questions/:questionId/override` - Override question
- DELETE `/api/super-admin/questions/:questionId/override` - Delete question
- PUT `/api/super-admin/rounds/:roundId/override` - Override round

---

### 5. resultPublished

Sent when a participant's test results are published.

**Recipients**: Specific participant only

**Payload**:
```typescript
{
  eventId: string,
  result: {
    id: string,
    userId: string,
    roundId: string,
    status: 'completed',
    totalScore: number,
    submittedAt: Date,
    completedAt: Date,
    ...
  }
}
```

**Triggered by**:
- POST `/api/attempts/:attemptId/submit` - Submit test attempt

---

## Room-based Architecture

Users are automatically joined to rooms based on their role and assignments:

### Super Admin
- Room: `super_admin`
- Receives: All events

### Event Admin
- Rooms: `event:{eventId}` for each assigned event
- Receives: Events for their assigned events only

### Participant
- Room: `participant:{userId}`
- Receives: Only their own result notifications and public round status updates

### Registration Committee
- Room: `registration_committee`
- Receives: Registration updates

## RBAC Filtering

The WebSocket system implements role-based access control:

- **Super Admin**: Receives ALL events across the system
- **Event Admin**: Receives events ONLY for their assigned events
- **Participant**: Receives ONLY their own result notifications
- **Registration Committee**: Receives registration updates

## Error Handling

- **Authentication Errors**: Connection rejected if invalid/missing JWT token
- **Reconnection**: Automatic reconnection with exponential backoff
- **Connection Errors**: Logged to console for debugging

## UI Integration

All layouts display a live connection status indicator when WebSocket is connected:

```tsx
{isConnected && (
  <Badge variant="outline" className="ml-2" data-testid="badge-websocket-connected">
    <Circle className="w-2 h-2 mr-1 fill-green-500 text-green-500" />
    Live
  </Badge>
)}
```

## Testing

To test WebSocket functionality:

1. Open the application in multiple browser tabs with different user roles
2. Perform actions that trigger WebSocket events
3. Verify that the appropriate users receive notifications in real-time
4. Check the browser console for connection logs

## Security

- All WebSocket connections require valid JWT authentication
- Users only receive events they're authorized to see based on their role
- Event-specific data is filtered by user's event assignments
