import { useParams, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useMemo } from 'react';
import EventAdminLayout from '@/components/layouts/EventAdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { insertRoundSchema } from '@shared/schema';
import type { Round } from '@shared/schema';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';

const formSchema = insertRoundSchema.extend({
  startTime: z.string().min(1, 'Start time is required'),
});

type FormData = z.infer<typeof formSchema>;

export default function RoundEditPage() {
  const { eventId, roundId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: round, isLoading } = useQuery<Round>({
    queryKey: ['/api/rounds', roundId],
    enabled: !!roundId,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    values: round ? {
      eventId: round.eventId,
      name: round.name,
      description: round.description || '',
      roundNumber: round.roundNumber,
      duration: round.duration,
      status: round.status,
      startTime: round.startTime ? new Date(round.startTime).toISOString().slice(0, 16) : '',
    } : undefined,
  });

  const startTime = form.watch('startTime');
  const duration = form.watch('duration');

  const calculatedEndTime = useMemo(() => {
    if (!startTime || !duration) return null;
    const start = new Date(startTime);
    const end = new Date(start.getTime() + duration * 60 * 1000);
    return end.toLocaleString();
  }, [startTime, duration]);

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const start = new Date(data.startTime);
      const end = new Date(start.getTime() + data.duration * 60 * 1000);

      const roundData = {
        ...data,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      };

      return apiRequest('PATCH', `/api/rounds/${roundId}`, roundData);
    },
    onSuccess: () => {
      toast({
        title: 'Round updated',
        description: 'The round has been updated successfully',
      });

      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'rounds'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rounds', roundId] });
      setLocation(`/event-admin/events/${eventId}/rounds`);
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  async function onSubmit(data: FormData) {
    updateMutation.mutate(data);
  }

  if (isLoading) {
    return (
      <EventAdminLayout>
        <div className="p-8">
          <div className="text-center py-12" data-testid="loading-round">Loading round...</div>
        </div>
      </EventAdminLayout>
    );
  }

  if (!round) {
    return (
      <EventAdminLayout>
        <div className="p-8">
          <div className="text-center py-12" data-testid="error-round-not-found">Round not found</div>
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
            onClick={() => setLocation(`/event-admin/events/${eventId}/rounds`)}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Rounds
          </Button>
          <h1 className="text-3xl font-bold text-gray-900" data-testid="heading-edit-round">Edit Round</h1>
          <p className="text-gray-600 mt-1">Update round details</p>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Round Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Round Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Preliminary Round, Final Round" {...field} data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe this round..."
                          className="min-h-[100px]"
                          {...field}
                          value={field.value || ''}
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="roundNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Round Number</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-round-number"
                          />
                        </FormControl>
                        <FormDescription>Sequential round number</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (minutes)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-duration"
                          />
                        </FormControl>
                        <FormDescription>Test duration</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          data-testid="input-start-time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {calculatedEndTime && (
                  <div className="rounded-md bg-muted p-4" data-testid="text-calculated-end-time">
                    <p className="text-sm font-medium">Calculated End Time</p>
                    <p className="text-sm text-muted-foreground">{calculatedEndTime}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button type="submit" disabled={updateMutation.isPending} data-testid="button-update">
                    {updateMutation.isPending ? 'Updating...' : 'Update Round'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation(`/event-admin/events/${eventId}/rounds`)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </EventAdminLayout>
  );
}
