import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import EventAdminLayout from '@/components/layouts/EventAdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Edit, FileQuestion, Clock, Play, Square, RotateCcw, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Round, Event } from '@shared/schema';

function CountdownTimer({ round, onTimeExpired }: { round: Round; onTimeExpired?: (roundId: string) => void }) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [hasNotified, setHasNotified] = useState(false);

  useEffect(() => {
    if (round.status !== 'in_progress' || !round.startedAt) {
      setHasNotified(false);
      return;
    }

    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const startedAt = new Date(round.startedAt!).getTime();
      const durationMs = round.duration * 60 * 1000;
      const elapsed = now - startedAt;
      const remaining = Math.max(0, durationMs - elapsed);
      return Math.floor(remaining / 1000);
    };

    setTimeRemaining(calculateTimeRemaining());

    const interval = setInterval(() => {
      const newTimeRemaining = calculateTimeRemaining();
      setTimeRemaining(newTimeRemaining);
      
      // Notify parent when time expires (only once)
      if (newTimeRemaining === 0 && onTimeExpired && !hasNotified) {
        onTimeExpired(round.id);
        setHasNotified(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [round, onTimeExpired, hasNotified]);

  if (round.status === 'not_started') {
    return <span className="text-gray-400" data-testid={`timer-not-started-${round.id}`}>-- : --</span>;
  }

  if (round.status === 'completed') {
    return <span className="text-gray-500" data-testid={`timer-completed-${round.id}`}>Completed</span>;
  }

  if (timeRemaining === null) {
    return <span className="text-gray-400">--:--</span>;
  }

  const totalMinutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  let displayText: string;
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    displayText = `${hours}h ${mins}m`;
  } else {
    displayText = `${totalMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  let colorClass = 'text-green-600';
  if (timeRemaining < 300) {
    colorClass = 'text-red-600 font-semibold';
  } else if (timeRemaining < 900) {
    colorClass = 'text-yellow-600 font-semibold';
  }

  return (
    <span className={colorClass} data-testid={`timer-${round.id}`}>
      {displayText}
    </span>
  );
}

export default function EventRoundsPage() {
  const { eventId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [restartRoundId, setRestartRoundId] = useState<string | null>(null);
  const [expiredRoundIds, setExpiredRoundIds] = useState<Set<string>>(new Set());

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ['/api/events', eventId],
    enabled: !!eventId,
  });

  const { data: rounds, isLoading: roundsLoading } = useQuery<Round[]>({
    queryKey: ['/api/events', eventId, 'rounds'],
    enabled: !!eventId,
    refetchInterval: 5000,
  });

  // Clear expired round IDs for rounds that are no longer in progress
  useEffect(() => {
    if (rounds) {
      setExpiredRoundIds(prev => {
        const newSet = new Set(prev);
        // Remove rounds that are no longer in progress
        rounds.forEach(round => {
          if (round.status !== 'in_progress') {
            newSet.delete(round.id);
          }
        });
        return newSet;
      });
    }
  }, [rounds]);

  const startRoundMutation = useMutation({
    mutationFn: async (roundId: string) => {
      return apiRequest('POST', `/api/rounds/${roundId}/start`, {});
    },
    onSuccess: () => {
      toast({
        title: 'Round Started',
        description: 'Participants can now begin the test',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'rounds'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to start round',
        variant: 'destructive',
      });
    }
  });

  const endRoundMutation = useMutation({
    mutationFn: async (roundId: string) => {
      return apiRequest('POST', `/api/rounds/${roundId}/end`, {});
    },
    onSuccess: () => {
      toast({
        title: 'Round Ended',
        description: 'Round has been marked as completed',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'rounds'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to end round',
        variant: 'destructive',
      });
    }
  });

  const restartRoundMutation = useMutation({
    mutationFn: async (roundId: string) => {
      return apiRequest('POST', `/api/rounds/${roundId}/restart`, {});
    },
    onSuccess: () => {
      toast({
        title: 'Round Restarted',
        description: 'Round restarted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'rounds'] });
      setRestartRoundId(null);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to restart round',
        variant: 'destructive',
      });
      setRestartRoundId(null);
    }
  });

  const publishResultsMutation = useMutation({
    mutationFn: async (roundId: string) => {
      return apiRequest('POST', `/api/rounds/${roundId}/publish-results`, {});
    },
    onSuccess: () => {
      toast({
        title: 'Results Published',
        description: 'Participants can now view their results',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'rounds'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to publish results',
        variant: 'destructive',
      });
    }
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      not_started: 'secondary',
      in_progress: 'default',
      completed: 'destructive',
    };

    const labels: Record<string, string> = {
      not_started: 'Not Started',
      in_progress: 'In Progress',
      completed: 'Completed',
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (eventLoading || roundsLoading) {
    return (
      <EventAdminLayout>
        <div className="p-8">
          <div className="text-center py-12" data-testid="loading-rounds">Loading rounds...</div>
        </div>
      </EventAdminLayout>
    );
  }

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
              <h1 className="text-3xl font-bold text-gray-900" data-testid="heading-rounds">Rounds Management</h1>
              <p className="text-gray-600 mt-1">{event?.name}</p>
            </div>
            <Button
              onClick={() => setLocation(`/event-admin/events/${eventId}/rounds/new`)}
              data-testid="button-create-round"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Round
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Event Rounds</CardTitle>
          </CardHeader>
          <CardContent>
            {!rounds || rounds.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-600" data-testid="no-rounds">
                  No rounds created yet
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Create your first round to add questions and manage test sessions
                </p>
                <Button
                  onClick={() => setLocation(`/event-admin/events/${eventId}/rounds/new`)}
                  className="mt-4"
                  data-testid="button-create-first"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Round
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Round #</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time Remaining</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rounds.map((round) => (
                    <TableRow key={round.id} data-testid={`row-round-${round.id}`}>
                      <TableCell className="font-medium" data-testid={`text-round-number-${round.id}`}>
                        Round {round.roundNumber}
                      </TableCell>
                      <TableCell>{round.name}</TableCell>
                      <TableCell>{round.duration} minutes</TableCell>
                      <TableCell>{getStatusBadge(round.status)}</TableCell>
                      <TableCell>
                        <CountdownTimer 
                          round={round} 
                          onTimeExpired={(roundId) => {
                            setExpiredRoundIds(prev => new Set(prev).add(roundId));
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {round.status === 'not_started' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => startRoundMutation.mutate(round.id)}
                              disabled={startRoundMutation.isPending}
                              data-testid={`button-start-${round.id}`}
                              title="Start Round"
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Start
                            </Button>
                          )}
                          {round.status === 'in_progress' && !expiredRoundIds.has(round.id) && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => endRoundMutation.mutate(round.id)}
                              disabled={endRoundMutation.isPending}
                              data-testid={`button-end-${round.id}`}
                              title="End Round"
                            >
                              <Square className="h-4 w-4 mr-1" />
                              End
                            </Button>
                          )}
                          {round.status === 'completed' && !round.resultsPublished && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => publishResultsMutation.mutate(round.id)}
                              disabled={publishResultsMutation.isPending}
                              data-testid={`button-publish-results-${round.id}`}
                              title="Publish Results"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Publish Results
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRestartRoundId(round.id)}
                            disabled={restartRoundMutation.isPending}
                            data-testid={`button-restart-round-${round.id}`}
                            title="Restart Round"
                            className="border-orange-500 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/event-admin/events/${eventId}/rounds/${round.id}/edit`)}
                            data-testid={`button-edit-${round.id}`}
                            title="Edit Round"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/event-admin/rounds/${round.id}/questions`)}
                            data-testid={`button-questions-${round.id}`}
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

        <AlertDialog open={!!restartRoundId} onOpenChange={(open) => !open && setRestartRoundId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restart Round?</AlertDialogTitle>
              <AlertDialogDescription>
                This will reset the round to 'Not Started' and delete ALL participant test attempts. 
                Participants will be able to retake the test. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => restartRoundId && restartRoundMutation.mutate(restartRoundId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Restart Round
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </EventAdminLayout>
  );
}
