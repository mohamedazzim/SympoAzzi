import { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, Circle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from '@/contexts/WebSocketContext';

interface ParticipantLayoutProps {
  children: ReactNode;
}

export default function ParticipantLayout({ children }: ParticipantLayoutProps) {
  const { user, logout } = useAuth();
  const { isConnected } = useWebSocket();

  const { data: credentialData } = useQuery<any>({
    queryKey: ['/api/participants/my-credential'],
    enabled: user?.role === 'participant',
  });

  const eventName = credentialData?.event?.name || 'Event';
  const participantName = user?.fullName || user?.email?.split('@')[0] || user?.username || 'Participant';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900" data-testid="heading-symposium">
              BootFeet 2K26
            </h1>
            <span className="text-gray-400">|</span>
            <span className="text-sm text-gray-700" data-testid="text-event-name">
              {eventName}
            </span>
            <span className="text-gray-400">|</span>
            <span className="text-sm text-gray-700" data-testid="text-participant-name">
              {participantName}
            </span>
            {isConnected && (
              <Badge variant="outline" className="ml-2" data-testid="badge-websocket-connected">
                <Circle className="w-2 h-2 mr-1 fill-green-500 text-green-500" />
                Live
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Logout</span>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
