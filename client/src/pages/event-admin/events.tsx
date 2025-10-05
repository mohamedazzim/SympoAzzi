import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import EventAdminLayout from '@/components/layouts/EventAdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Eye, Settings, Users, FileQuestion } from 'lucide-react';
import type { Event } from '@shared/schema';

export default function EventAdminEventsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const myEvents = events || [];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      draft: 'secondary',
      active: 'default',
      completed: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {status}
      </Badge>
    );
  };

  return (
    <EventAdminLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="heading-my-events">My Events</h1>
          <p className="text-gray-600 mt-1">Manage your assigned events</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Assigned Events</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8" data-testid="loading-events">Loading events...</div>
            ) : myEvents.length === 0 ? (
              <div className="text-center py-8 text-gray-500" data-testid="no-events">
                No events assigned to you yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myEvents.map((event) => (
                    <TableRow key={event.id} data-testid={`row-event-${event.id}`}>
                      <TableCell className="font-medium" data-testid={`text-event-name-${event.id}`}>
                        {event.name}
                      </TableCell>
                      <TableCell className="capitalize">{event.type}</TableCell>
                      <TableCell>{getStatusBadge(event.status)}</TableCell>
                      <TableCell>
                        {event.startDate ? new Date(event.startDate).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/event-admin/events/${event.id}`)}
                            data-testid={`button-view-${event.id}`}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/event-admin/events/${event.id}/rules`)}
                            data-testid={`button-rules-${event.id}`}
                            title="Configure Rules"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/event-admin/events/${event.id}/rounds`)}
                            data-testid={`button-rounds-${event.id}`}
                            title="Manage Rounds"
                          >
                            <FileQuestion className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/event-admin/events/${event.id}/participants`)}
                            data-testid={`button-participants-${event.id}`}
                            title="View Participants"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </EventAdminLayout>
  );
}
