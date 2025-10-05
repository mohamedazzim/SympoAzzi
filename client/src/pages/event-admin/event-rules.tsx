import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import EventAdminLayout from '@/components/layouts/EventAdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ArrowLeft, Shield, AlertTriangle } from 'lucide-react';
import type { EventRules, Event } from '@shared/schema';

const rulesFormSchema = z.object({
  noRefresh: z.boolean(),
  noTabSwitch: z.boolean(),
  forceFullscreen: z.boolean(),
  disableShortcuts: z.boolean(),
  autoSubmitOnViolation: z.boolean(),
  maxTabSwitchWarnings: z.number().min(0).max(10),
  additionalRules: z.string().optional(),
});

type RulesFormData = z.infer<typeof rulesFormSchema>;

export default function EventRulesPage() {
  const { eventId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ['/api/events', eventId],
    enabled: !!eventId,
  });

  const { data: rules, isLoading: rulesLoading } = useQuery<EventRules>({
    queryKey: ['/api/events', eventId, 'rules'],
    enabled: !!eventId,
  });

  const form = useForm<RulesFormData>({
    resolver: zodResolver(rulesFormSchema),
    defaultValues: {
      noRefresh: true,
      noTabSwitch: true,
      forceFullscreen: true,
      disableShortcuts: true,
      autoSubmitOnViolation: true,
      maxTabSwitchWarnings: 2,
      additionalRules: '',
    },
    values: rules ? {
      noRefresh: rules.noRefresh,
      noTabSwitch: rules.noTabSwitch,
      forceFullscreen: rules.forceFullscreen,
      disableShortcuts: rules.disableShortcuts,
      autoSubmitOnViolation: rules.autoSubmitOnViolation,
      maxTabSwitchWarnings: rules.maxTabSwitchWarnings,
      additionalRules: rules.additionalRules || '',
    } : undefined,
  });

  const updateRulesMutation = useMutation({
    mutationFn: async (data: RulesFormData) => {
      return apiRequest('PATCH', `/api/events/${eventId}/rules`, data);
    },
    onSuccess: () => {
      toast({
        title: 'Rules updated',
        description: 'Event proctoring rules have been updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'rules'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  async function onSubmit(data: RulesFormData) {
    updateRulesMutation.mutate(data);
  }

  if (eventLoading || rulesLoading) {
    return (
      <EventAdminLayout>
        <div className="p-8">
          <div className="text-center py-12" data-testid="loading-rules">Loading rules...</div>
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
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-indigo-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900" data-testid="heading-rules">Event Proctoring Rules</h1>
              <p className="text-gray-600 mt-1">{event?.name}</p>
            </div>
          </div>
        </div>

        <div className="max-w-3xl">
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">Important Notice</p>
                  <p className="text-sm text-yellow-800 mt-1">
                    These rules enforce test integrity by controlling participant behavior during the exam.
                    Changes will apply to all future test attempts.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configure Proctoring Rules</CardTitle>
              <CardDescription>
                Set up automated monitoring and violation handling for this event
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="forceFullscreen"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base" data-testid="label-fullscreen">
                            Force Fullscreen Mode
                          </FormLabel>
                          <FormDescription>
                            Require participants to stay in fullscreen during the test
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-fullscreen"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="noTabSwitch"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base" data-testid="label-tab-switch">
                            Disable Tab Switching
                          </FormLabel>
                          <FormDescription>
                            Detect and log when participants switch browser tabs
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-tab-switch"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="noRefresh"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base" data-testid="label-no-refresh">
                            Block Page Refresh
                          </FormLabel>
                          <FormDescription>
                            Prevent participants from refreshing the test page
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-no-refresh"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="disableShortcuts"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base" data-testid="label-shortcuts">
                            Disable Keyboard Shortcuts
                          </FormLabel>
                          <FormDescription>
                            Block common keyboard shortcuts like copy, paste, print
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-shortcuts"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="autoSubmitOnViolation"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 border-red-200 bg-red-50">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base text-red-900" data-testid="label-auto-submit">
                            Auto-Submit on Violation
                          </FormLabel>
                          <FormDescription className="text-red-700">
                            Automatically submit test when violation limit is exceeded
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-auto-submit"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxTabSwitchWarnings"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel data-testid="label-max-warnings">Maximum Tab Switch Warnings</FormLabel>
                        <FormDescription>
                          Number of tab switch warnings before action is taken (if auto-submit is enabled)
                        </FormDescription>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="10"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-max-warnings"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="additionalRules"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel data-testid="label-additional-rules">Additional Rules</FormLabel>
                        <FormDescription>
                          Optional: Add any additional instructions or rules for participants
                        </FormDescription>
                        <FormControl>
                          <Textarea
                            placeholder="e.g., No calculators allowed, Keep camera on at all times"
                            className="min-h-[100px]"
                            {...field}
                            data-testid="input-additional-rules"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={updateRulesMutation.isPending}
                      data-testid="button-save"
                    >
                      {updateRulesMutation.isPending ? 'Saving...' : 'Save Rules'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLocation('/event-admin/events')}
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
      </div>
    </EventAdminLayout>
  );
}
