import { useQuery } from '@tanstack/react-query';
import { useRoute, useLocation } from 'wouter';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Edit, Plus } from 'lucide-react';
import type { Event, User, Round, Participant } from '@shared/schema';

export default function EventDetailsPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/admin/events/:id');
  const eventId = params?.id;

  const { data: event, isLoading } = useQuery<Event>({
    queryKey: ['/api/events', eventId],
    enabled: !!eventId,
  });

  const { data: eventAdmins } = useQuery<User[]>({
    queryKey: ['/api/events', eventId, 'admins'],
    enabled: !!eventId,
  });

  const { data: rounds } = useQuery<Round[]>({
    queryKey: ['/api/events', eventId, 'rounds'],
    enabled: !!eventId,
  });

  const { data: participants } = useQuery<Participant[]>({
    queryKey: ['/api/events', eventId, 'participants'],
    enabled: !!eventId,
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-8">
          <div className="text-center" data-testid="loading-event">Loading event...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!event) {
    return (
      <AdminLayout>
        <div className="p-8">
          <div className="text-center text-red-600">Event not found</div>
        </div>
      </AdminLayout>
    );
  }

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
    <AdminLayout>
      <div className="p-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation('/admin/events')}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900" data-testid="heading-event-name">{event.name}</h1>
              <p className="text-gray-600 mt-1">{event.description}</p>
            </div>
            <div className="flex gap-2">
              {getStatusBadge(event.status)}
              <Button onClick={() => setLocation(`/admin/events/${eventId}/edit`)} data-testid="button-edit-event">
                <Edit className="mr-2 h-4 w-4" />
                Edit Event
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize" data-testid="text-event-type">{event.type}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Rounds</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-rounds-count">{rounds?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Participants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-participants-count">{participants?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Admins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-admins-count">{eventAdmins?.length || 0}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="rounds" data-testid="tab-rounds">Rounds</TabsTrigger>
            <TabsTrigger value="admins" data-testid="tab-admins">Event Admins</TabsTrigger>
            <TabsTrigger value="participants" data-testid="tab-participants">Participants</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Event Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Description</p>
                  <p className="mt-1" data-testid="text-description">{event.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Start Date</p>
                    <p className="mt-1" data-testid="text-start-date">
                      {event.startDate ? new Date(event.startDate).toLocaleString() : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">End Date</p>
                    <p className="mt-1" data-testid="text-end-date">
                      {event.endDate ? new Date(event.endDate).toLocaleString() : 'Not set'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Created At</p>
                  <p className="mt-1" data-testid="text-created-at">
                    {new Date(event.createdAt).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rounds">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Event Rounds</CardTitle>
                  <Button size="sm" onClick={() => setLocation(`/admin/events/${eventId}/rounds/new`)} data-testid="button-create-round">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Round
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!rounds || rounds.length === 0 ? (
                  <div className="text-center py-8 text-gray-500" data-testid="no-rounds">
                    No rounds created yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Round</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rounds.map((round) => (
                        <TableRow key={round.id} data-testid={`row-round-${round.id}`}>
                          <TableCell>{round.roundNumber}</TableCell>
                          <TableCell>{round.name}</TableCell>
                          <TableCell>{round.duration} min</TableCell>
                          <TableCell>
                            <Badge variant={round.status === 'active' ? 'default' : 'secondary'}>
                              {round.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLocation(`/admin/rounds/${round.id}`)}
                              data-testid={`button-view-round-${round.id}`}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admins">
            <Card>
              <CardHeader>
                <CardTitle>Assigned Event Admins</CardTitle>
                <CardDescription className="mt-2">
                  Event admins are assigned when creating a new admin account. To add more admins to this event, create a new event admin and select this event.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!eventAdmins || eventAdmins.length === 0 ? (
                  <div className="text-center py-8 text-gray-500" data-testid="no-admins">
                    No event admins assigned yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Username</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eventAdmins.map((admin) => (
                        <TableRow key={admin.id} data-testid={`row-admin-${admin.id}`}>
                          <TableCell>{admin.fullName}</TableCell>
                          <TableCell>{admin.email}</TableCell>
                          <TableCell>{admin.username}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="participants">
            <Card>
              <CardHeader>
                <CardTitle>Registered Participants</CardTitle>
              </CardHeader>
              <CardContent>
                {!participants || participants.length === 0 ? (
                  <div className="text-center py-8 text-gray-500" data-testid="no-participants">
                    No participants registered yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Total Participants: <span className="font-semibold">{participants.length}</span>
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Registered At</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {participants.map((participant) => (
                          <TableRow key={participant.id} data-testid={`row-participant-${participant.id}`}>
                            <TableCell>{new Date(participant.registeredAt).toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant={participant.status === 'completed' ? 'default' : 'secondary'}>
                                {participant.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
