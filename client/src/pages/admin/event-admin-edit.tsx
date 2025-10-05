import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useRoute } from 'wouter';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import type { User } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';

const editFormSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').or(z.literal('')),
  email: z.string().email('Invalid email address').or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters').or(z.literal('')),
});

type FormData = z.infer<typeof editFormSchema>;

export default function EventAdminEditPage() {
  const [, navigate] = useLocation();
  const [, params] = useRoute('/admin/event-admins/:id/edit');
  const { toast } = useToast();
  const adminId = params?.id;

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const admin = users?.find(user => user.id === adminId);

  const form = useForm<FormData>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (admin) {
      form.reset({
        username: admin.username,
        email: admin.email,
        password: '',
      });
    }
  }, [admin, form]);

  async function onSubmit(data: FormData) {
    const updates: any = {};
    if (data.username?.trim()) updates.username = data.username.trim();
    if (data.email?.trim()) updates.email = data.email.trim();
    if (data.password?.trim()) updates.password = data.password.trim();

    if (Object.keys(updates).length === 0) {
      toast({
        title: 'No changes',
        description: 'Please update at least one field',
        variant: 'destructive',
      });
      return;
    }

    try {
      await apiRequest('PATCH', `/api/users/${adminId}/credentials`, updates);
      
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      
      toast({
        title: 'Admin updated',
        description: 'Admin credentials have been updated successfully',
      });
      
      navigate('/admin/event-admins');
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-8">
          <div className="text-center py-8" data-testid="loading-admin">Loading admin data...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!admin) {
    return (
      <AdminLayout>
        <div className="p-8">
          <div className="text-center py-8 text-gray-500" data-testid="admin-not-found">
            Admin not found
          </div>
          <div className="text-center">
            <Button onClick={() => navigate('/admin/event-admins')} data-testid="button-back-to-list">
              Back to Event Admins
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/event-admins')}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Event Admins
          </Button>
          <h1 className="text-3xl font-bold text-gray-900" data-testid="heading-edit-admin">Edit Event Admin</h1>
          <p className="text-gray-600 mt-1">Update credentials for {admin.fullName}</p>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Admin Credentials</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter new username (optional)" {...field} data-testid="input-username" />
                      </FormControl>
                      <FormDescription>
                        Leave empty to keep current username
                      </FormDescription>
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
                        <Input type="email" placeholder="Enter new email (optional)" {...field} data-testid="input-email" />
                      </FormControl>
                      <FormDescription>
                        Leave empty to keep current email
                      </FormDescription>
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
                        <Input type="password" placeholder="Enter new password (optional)" {...field} data-testid="input-password" />
                      </FormControl>
                      <FormDescription>
                        Leave empty to keep current password
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/admin/event-admins')}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={form.formState.isSubmitting} 
                    data-testid="button-submit"
                  >
                    {form.formState.isSubmitting ? 'Updating...' : 'Update Admin'}
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
