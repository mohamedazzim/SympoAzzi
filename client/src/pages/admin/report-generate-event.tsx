import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { FileText, Loader2 } from 'lucide-react';
import type { Event } from '@shared/schema';

export default function ReportGenerateEventPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const generateReportMutation = useMutation({
    mutationFn: async (eventId: string) => {
      return await apiRequest('/api/reports/generate/event', 'POST', { eventId });
    },
    onSuccess: () => {
      toast({
        title: 'Report Generated',
        description: 'Event report has been generated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      setLocation('/admin/reports');
    },
    onError: (error: Error) => {
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate report',
        variant: 'destructive',
      });
    },
  });

  const handleGenerate = () => {
    if (!selectedEventId) {
      toast({
        title: 'Event Required',
        description: 'Please select an event to generate a report',
        variant: 'destructive',
      });
      return;
    }
    generateReportMutation.mutate(selectedEventId);
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="heading-generate-event-report">
            Generate Event Report
          </h1>
          <p className="text-gray-600 mt-1">
            Create a comprehensive report for a specific event including participant data, scores, and violations
          </p>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Event Selection
            </CardTitle>
            <CardDescription>
              Select an event to generate a detailed report with all rounds, questions, participant scores, and violation logs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="event-select">Event</Label>
              {eventsLoading ? (
                <div className="text-sm text-gray-500" data-testid="loading-events">Loading events...</div>
              ) : !events || events.length === 0 ? (
                <div className="text-sm text-gray-500" data-testid="no-events">
                  No events available. Please create an event first.
                </div>
              ) : (
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger id="event-select" data-testid="select-event">
                    <SelectValue placeholder="Select an event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id} data-testid={`option-event-${event.id}`}>
                        {event.name} ({event.type} - {event.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Report Contents</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Event details and configuration</li>
                <li>• Round-by-round analysis with questions</li>
                <li>• Participant scores and rankings</li>
                <li>• Violation logs and proctoring data</li>
                <li>• Question-wise performance statistics</li>
                <li>• Leaderboard for each round</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleGenerate}
                disabled={!selectedEventId || generateReportMutation.isPending}
                className="flex-1"
                data-testid="button-generate"
              >
                {generateReportMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Report
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation('/admin/reports')}
                disabled={generateReportMutation.isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
