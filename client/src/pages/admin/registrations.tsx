import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AdminLayout from "@/components/layouts/AdminLayout";
import type { Registration, Event } from "@shared/schema";

export default function AdminRegistrationsPage() {
  const { data: registrations, isLoading } = useQuery<Registration[]>({
    queryKey: ['/api/registrations'],
  });

  const { data: events } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const getEventName = (eventId: string) => {
    const event = events?.find(e => e.id === eventId);
    return event?.name || eventId;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'declined':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 max-w-7xl" data-testid="page-admin-registrations">
        <div className="mb-6">
          <h1 className="text-3xl font-bold" data-testid="heading-registrations">All Registrations</h1>
          <p className="text-muted-foreground">View and manage event registrations</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Registration Submissions</CardTitle>
            <CardDescription>All registration form submissions from participants</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div data-testid="loading-registrations">Loading registrations...</div>
            ) : registrations && registrations.length > 0 ? (
              <Table data-testid="table-registrations">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Selected Events</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registrations.map((registration: any) => (
                    <TableRow key={registration.id} data-testid={`row-registration-${registration.id}`}>
                      <TableCell data-testid={`text-name-${registration.id}`}>
                        {registration.participantName || 'N/A'}
                      </TableCell>
                      <TableCell data-testid={`text-email-${registration.id}`}>
                        {registration.participantEmail || 'N/A'}
                      </TableCell>
                      <TableCell data-testid={`text-events-${registration.id}`}>
                        <div className="flex flex-wrap gap-1">
                          {registration.selectedEvents && registration.selectedEvents.length > 0 ? (
                            registration.selectedEvents.map((eventId: string) => (
                              <Badge key={eventId} variant="outline" className="text-xs">
                                {getEventName(eventId)}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">No events</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(registration.paymentStatus)} data-testid={`badge-status-${registration.id}`}>
                          {registration.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-submitted-${registration.id}`}>
                        {new Date(registration.submittedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-registrations">
                No registrations yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
