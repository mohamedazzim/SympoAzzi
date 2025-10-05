import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, UserCheck } from 'lucide-react';
import AdminLayout from '@/components/layouts/AdminLayout';

export default function RegistrationCommitteePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'super_admin')) {
      setLocation('/login');
    }
  }, [user, authLoading, setLocation]);

  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/users'],
    enabled: !!user && user.role === 'super_admin',
  });

  const committeeUsers = users.filter(u => u.role === 'registration_committee');

  if (authLoading || isLoading) {
    return (
      <AdminLayout>
        <div className="p-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Registration Committee</h1>
            <p className="text-gray-600 mt-2">Manage registration committee members</p>
          </div>
          <Button
            onClick={() => setLocation('/admin/registration-committee/create')}
            data-testid="button-create-committee-user"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Committee User
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Committee Members ({committeeUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {committeeUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No registration committee members yet.</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setLocation('/admin/registration-committee/create')}
                  data-testid="button-create-first-committee"
                >
                  Create First Committee Member
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {committeeUsers.map((user) => (
                    <TableRow key={user.id} data-testid={`row-committee-${user.id}`}>
                      <TableCell className="font-medium">{user.fullName}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Active
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
