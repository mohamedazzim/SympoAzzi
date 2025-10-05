import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import EventAdminLayout from '@/components/layouts/EventAdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Edit, FileQuestion, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Event, Round } from '@shared/schema';

interface EventCredentialWithDetails {
  id: string;
  participantUserId: string;
  eventId: string;
  eventUsername: string;
  eventPassword: string;
  testEnabled: boolean;
  enabledAt: Date | null;
  enabledBy: string | null;
  createdAt: Date;
  participant: {
    id: string;
    username: string;
    email: string;
    fullName: string;
  };
}

export default function EventDetailsPage() {
  const [, setLocation] = useLocation();
  const { eventId } = useParams();
  const { toast } = useToast();

  const { data: event, isLoading } = useQuery<Event>({
    queryKey: ['/api/events', eventId],
    enabled: !!eventId,
  });

  const { data: rounds } = useQuery<Round[]>({
    queryKey: ['/api/events', eventId, 'rounds'],
    enabled: !!eventId,
  });

  const { data: credentials = [] } = useQuery<EventCredentialWithDetails[]>({
    queryKey: [`/api/events/${eventId}/event-credentials`],
    enabled: !!eventId,
  });

  const enableTestMutation = useMutation({
    mutationFn: async (credentialId: string) => {
      return apiRequest('PATCH', `/api/event-credentials/${credentialId}/enable-test`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/event-credentials`] });
      toast({
        title: 'Test Enabled',
        description: 'Participant can now take the test',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to enable test access',
        variant: 'destructive',
      });
    },
  });

  const disableTestMutation = useMutation({
    mutationFn: async (credentialId: string) => {
      return apiRequest('PATCH', `/api/event-credentials/${credentialId}/disable-test`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/event-credentials`] });
      toast({
        title: 'Test Disabled',
        description: 'Participant test access has been disabled',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to disable test access',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <EventAdminLayout>
        <div className="p-8">
          <div className="text-center" data-testid="loading-event">Loading event...</div>
        </div>
      </EventAdminLayout>
    );
  }

  if (!event) {
    return (
      <EventAdminLayout>
        <div className="p-8">
          <div className="text-center text-red-600">Event not found</div>
        </div>
      </EventAdminLayout>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      draft: 'secondary',
      upcoming: 'secondary',
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
          <Button
            variant="ghost"
            onClick={() => setLocation('/event-admin/events')}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Events
          </Button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900" data-testid="heading-event-name">{event.name}</h1>
              <p className="text-gray-600 mt-1" data-testid="text-event-description">{event.description}</p>
            </div>
            <div className="flex gap-2">
              {getStatusBadge(event.status)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
              <div className="text-2xl font-bold" data-testid="text-participants-count">{credentials.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="rounds" data-testid="tab-rounds">Rounds</TabsTrigger>
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
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <div className="mt-1" data-testid="text-status">
                    {getStatusBadge(event.status)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rounds">
            <Card>
              <CardHeader>
                <CardTitle>Event Rounds</CardTitle>
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
                        <TableHead>Round #</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Start Time</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rounds.map((round) => (
                        <TableRow key={round.id} data-testid={`row-round-${round.id}`}>
                          <TableCell className="font-medium">{round.roundNumber}</TableCell>
                          <TableCell>{round.name}</TableCell>
                          <TableCell>{round.duration} min</TableCell>
                          <TableCell>
                            {getStatusBadge(round.status)}
                          </TableCell>
                          <TableCell>
                            {round.startTime ? new Date(round.startTime).toLocaleString() : 'Not scheduled'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setLocation(`/event-admin/events/${eventId}/rounds/${round.id}/edit`)}
                                data-testid={`button-edit-round-${round.id}`}
                                title="Edit Round"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setLocation(`/event-admin/rounds/${round.id}/questions`)}
                                data-testid={`button-manage-round-${round.id}`}
                                title="Manage Questions"
                              >
                                <FileQuestion className="h-4 w-4" />
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
          </TabsContent>

          <TabsContent value="participants">
            <Card>
              <CardHeader>
                <CardTitle>Registered Participants</CardTitle>
              </CardHeader>
              <CardContent>
                {credentials.length === 0 ? (
                  <div className="text-center py-8 text-gray-500" data-testid="no-participants">
                    No participants registered yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Participant Name</TableHead>
                        <TableHead>Event Username</TableHead>
                        <TableHead>Registration Date</TableHead>
                        <TableHead>Test Access</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {credentials.map((cred) => (
                        <TableRow key={cred.id} data-testid={`row-participant-${cred.id}`}>
                          <TableCell data-testid={`text-name-${cred.id}`}>
                            {cred.participant.fullName}
                          </TableCell>
                          <TableCell className="font-mono" data-testid={`text-username-${cred.id}`}>
                            {cred.eventUsername}
                          </TableCell>
                          <TableCell data-testid={`text-date-${cred.id}`}>
                            {new Date(cred.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell data-testid={`text-test-status-${cred.id}`}>
                            {cred.testEnabled ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Enabled
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <XCircle className="h-3 w-3" />
                                Disabled
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {cred.testEnabled ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => disableTestMutation.mutate(cred.id)}
                                disabled={disableTestMutation.isPending}
                                data-testid={`button-disable-test-${cred.id}`}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Disable Test
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => enableTestMutation.mutate(cred.id)}
                                disabled={enableTestMutation.isPending}
                                data-testid={`button-enable-test-${cred.id}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Enable Test
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </EventAdminLayout>
  );
}
