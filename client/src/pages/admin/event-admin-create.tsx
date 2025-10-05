import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation } from 'wouter';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import type { Event } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';

const formSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  email: z.string().email('Invalid email address'),
  fullName: z.string().min(2, 'Full name is required'),
  eventId: z.string().min(1, 'Please select an event'),
});

type FormData = z.infer<typeof formSchema>;

export default function EventAdminCreatePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['/api/events/unassigned'],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
      email: '',
      fullName: '',
      eventId: '',
    },
  });

  async function onSubmit(data: FormData) {
    try {
      // Create the event admin user
      const response = await apiRequest('POST', '/api/auth/register', {
        username: data.username,
        password: data.password,
        email: data.email,
        fullName: data.fullName,
        role: 'event_admin',
      });

      const result = await response.json();

      // Assign the newly created admin to the selected event
      if (result && result.user) {
        await apiRequest('POST', `/api/events/${data.eventId}/admins`, {
          adminId: result.user.id,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events/unassigned'] });

      toast({
        title: 'Event Admin created',
        description: 'The event admin account has been created and assigned to the event successfully',
      });

      setLocation('/admin/event-admins');
    } catch (error: any) {
      toast({
        title: 'Creation failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation('/admin/event-admins')}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Event Admins
          </Button>
          <h1 className="text-3xl font-bold text-gray-900" data-testid="heading-create-admin">Create Event Admin</h1>
          <p className="text-gray-600 mt-1">Create a new event administrator account</p>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} data-testid="input-fullname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter username" {...field} data-testid="input-username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email" {...field} data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter password" {...field} data-testid="input-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="eventId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign to Event</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!events || events.length === 0}>
                        <FormControl>
                          <SelectTrigger data-testid="select-event">
                            <SelectValue placeholder={
                              eventsLoading 
                                ? "Loading events..." 
                                : (!events || events.length === 0) 
                                  ? "No events available - create an event first"
                                  : "Select an event"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {events?.map((event) => (
                            <SelectItem key={event.id} value={event.id}>
                              {event.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation('/admin/event-admins')}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting} data-testid="button-submit">
                    {form.formState.isSubmitting ? 'Creating...' : 'Create Event Admin'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
