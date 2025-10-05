import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import ParticipantLayout from '@/components/layouts/ParticipantLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/lib/auth';
import { ArrowLeft, Calendar, Clock, FileText, Shield, CheckCircle } from 'lucide-react';
import type { Event, EventRules, Round } from '@shared/schema';

export default function ParticipantEventDetailsPage() {
  const { eventId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ['/api/events', eventId],
    enabled: !!eventId,
  });

  const { data: rules, isLoading: rulesLoading } = useQuery<EventRules>({
    queryKey: ['/api/events', eventId, 'rules'],
    enabled: !!eventId,
  });

  const { data: rounds, isLoading: roundsLoading } = useQuery<Round[]>({
    queryKey: ['/api/events', eventId, 'rounds'],
    enabled: !!eventId,
    refetchInterval: 5000,
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/events/${eventId}/participants`, {});
    },
    onSuccess: () => {
      toast({
        title: 'Registration successful',
        description: 'You have been registered for this event',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'participants'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Registration failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (eventLoading || rulesLoading || roundsLoading) {
    return (
      <ParticipantLayout>
        <div className="p-8">
          <div className="text-center py-12" data-testid="loading-event">Loading event details...</div>
        </div>
      </ParticipantLayout>
    );
  }

  if (!event) {
    return (
      <ParticipantLayout>
        <div className="p-8">
          <div className="text-center py-12">Event not found</div>
        </div>
      </ParticipantLayout>
    );
  }

  return (
    <ParticipantLayout>
      <div className="p-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation('/participant/events')}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900" data-testid="heading-event-name">{event.name}</h1>
              <p className="text-gray-600 mt-1">Event Details and Registration</p>
            </div>
            <Badge variant="default" className="text-base px-4 py-2">
              {event.status}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>About This Event</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap" data-testid="text-description">
                  {event.description}
                </p>
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="text-sm text-gray-500">Type</div>
                      <div className="font-medium capitalize">{event.type}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="text-sm text-gray-500">Start Date</div>
                      <div className="font-medium">
                        {event.startDate ? new Date(event.startDate).toLocaleDateString() : 'TBD'}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {rounds && rounds.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Event Rounds</CardTitle>
                  <CardDescription>This event has {rounds.length} round(s)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {rounds.map((round) => {
                      const startTestMutation = useMutation({
                        mutationFn: async () => {
                          return apiRequest('POST', `/api/events/${eventId}/rounds/${round.id}/start`, {});
                        },
                        onSuccess: (data: any) => {
                          toast({
                            title: 'Test started',
                            description: 'You can now take the test',
                          });
                          setLocation(`/participant/test/${data.id}`);
                        },
                        onError: (error: any) => {
                          toast({
                            title: 'Failed to start test',
                            description: error.message,
                            variant: 'destructive',
                          });
                        },
                      });

                      return (
                        <div
                          key={round.id}
                          className="flex justify-between items-center p-4 border rounded-lg"
                          data-testid={`card-round-${round.id}`}
                        >
                          <div className="flex-1">
                            <div className="font-medium">Round {round.roundNumber}: {round.name}</div>
                            {round.description && (
                              <div className="text-sm text-gray-600 mt-1">{round.description}</div>
                            )}
                            <div className="flex items-center gap-4 mt-2">
                              <div>
                                <div className="text-xs text-gray-500">Duration</div>
                                <div className="text-sm font-medium">{round.duration} mins</div>
                              </div>
                              <Badge variant="outline">{round.status}</Badge>
                            </div>
                          </div>
                          <div className="flex-shrink-0 ml-4">
                            {round.status === 'not_started' && (
                              <Button
                                disabled
                                data-testid={`button-start-test-${round.id}`}
                              >
                                Not Started
                              </Button>
                            )}
                            {round.status === 'in_progress' && (
                              <Button
                                onClick={() => startTestMutation.mutate()}
                                disabled={startTestMutation.isPending}
                                data-testid={`button-start-test-${round.id}`}
                              >
                                {startTestMutation.isPending ? 'Starting...' : 'Take Test'}
                              </Button>
                            )}
                            {round.status === 'completed' && (
                              <Button
                                variant="outline"
                                disabled
                                data-testid={`button-start-test-${round.id}`}
                              >
                                Completed
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {rules && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    <CardTitle>Proctoring Rules</CardTitle>
                  </div>
                  <CardDescription>Please review these rules carefully before registering</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {rules.forceFullscreen && (
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-medium">Fullscreen Mode Required</div>
                          <div className="text-sm text-gray-600">You must stay in fullscreen during the test</div>
                        </div>
                      </div>
                    )}
                    {rules.noTabSwitch && (
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-medium">No Tab Switching</div>
                          <div className="text-sm text-gray-600">Switching tabs will be detected and logged</div>
                        </div>
                      </div>
                    )}
                    {rules.noRefresh && (
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-medium">No Page Refresh</div>
                          <div className="text-sm text-gray-600">Refreshing the page is not allowed</div>
                        </div>
                      </div>
                    )}
                    {rules.disableShortcuts && (
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-medium">Keyboard Shortcuts Disabled</div>
                          <div className="text-sm text-gray-600">Copy, paste, and print shortcuts are blocked</div>
                        </div>
                      </div>
                    )}
                    {rules.autoSubmitOnViolation && (
                      <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <FileText className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-medium text-yellow-900">Auto-Submit on Violation</div>
                          <div className="text-sm text-yellow-800">
                            Test will be auto-submitted if you exceed {rules.maxTabSwitchWarnings} violations
                          </div>
                        </div>
                      </div>
                    )}
                    {rules.additionalRules && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <div className="font-medium mb-2">Additional Rules:</div>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">{rules.additionalRules}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Registration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-6 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-3xl font-bold text-green-600">
                    {rounds?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Total Rounds</div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => registerMutation.mutate()}
                  disabled={registerMutation.isPending || event.status !== 'active'}
                  data-testid="button-register"
                >
                  {registerMutation.isPending ? 'Registering...' : 'Register for Event'}
                </Button>

                {event.status !== 'active' && (
                  <p className="text-sm text-center text-gray-500">
                    Registration is currently {event.status === 'draft' ? 'not open' : 'closed'}
                  </p>
                )}

                <div className="text-xs text-center text-gray-500 pt-4 border-t">
                  By registering, you agree to follow all proctoring rules and event guidelines
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ParticipantLayout>
  );
}
