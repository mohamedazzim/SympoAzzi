import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import ParticipantLayout from '@/components/layouts/ParticipantLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Trophy, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import type { TestAttempt } from '@shared/schema';

export default function MyTestsPage() {
  const [, setLocation] = useLocation();

  const { data: attempts, isLoading } = useQuery<(TestAttempt & { 
    round: { name: string; event: { name: string } } 
  })[]>({
    queryKey: ['/api/participants/my-attempts'],
  });

  const getStatusBadge = (status: string) => {
    const config = {
      in_progress: { variant: 'secondary' as const, icon: Clock, label: 'In Progress' },
      completed: { variant: 'default' as const, icon: CheckCircle, label: 'Completed' },
      auto_submitted: { variant: 'destructive' as const, icon: AlertCircle, label: 'Auto-Submitted' },
      disqualified: { variant: 'destructive' as const, icon: XCircle, label: 'Disqualified' },
    };

    const { variant, icon: Icon, label } = config[status as keyof typeof config] || config.completed;

    return (
      <Badge variant={variant}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  };

  return (
    <ParticipantLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="heading-my-tests">
            My Tests
          </h1>
          <p className="text-gray-600 mt-1">View your test history and results</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12" data-testid="loading-tests">
            Loading test history...
          </div>
        ) : !attempts || attempts.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-600" data-testid="no-tests">
                  No tests taken yet
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Your test attempts will appear here once you start taking tests
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Test History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Round</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attempts.map((attempt) => (
                    <TableRow key={attempt.id} data-testid={`row-attempt-${attempt.id}`}>
                      <TableCell className="font-medium" data-testid={`text-event-${attempt.id}`}>
                        {attempt.round?.event?.name || 'N/A'}
                      </TableCell>
                      <TableCell data-testid={`text-round-${attempt.id}`}>
                        {attempt.round?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {attempt.totalScore !== null && attempt.totalScore !== undefined ? (
                          <span className="font-semibold text-blue-600" data-testid={`text-score-${attempt.id}`}>
                            {attempt.totalScore} points
                          </span>
                        ) : (
                          <span className="text-gray-400">Pending</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(attempt.status)}</TableCell>
                      <TableCell data-testid={`text-completed-${attempt.id}`}>
                        {attempt.completedAt 
                          ? new Date(attempt.completedAt).toLocaleString()
                          : attempt.status === 'in_progress'
                          ? 'In Progress'
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        {attempt.status !== 'in_progress' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/participant/results/${attempt.id}`)}
                            data-testid={`button-results-${attempt.id}`}
                          >
                            <Trophy className="h-4 w-4 mr-1" />
                            View Results
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </ParticipantLayout>
  );
}
