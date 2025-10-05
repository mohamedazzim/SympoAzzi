import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Printer, ArrowLeft, FileDown } from 'lucide-react';
import EventAdminLayout from '@/components/layouts/EventAdminLayout';
import type { Event } from '@shared/schema';

interface EventCredentialWithDetails {
  id: string;
  participantUserId: string;
  eventId: string;
  eventUsername: string;
  eventPassword: string;
  createdAt: Date;
  participant: {
    id: string;
    username: string;
    email: string;
    fullName: string;
  };
  event: Event;
  paymentStatus?: 'pending' | 'paid' | 'declined';
}

export default function EventParticipantsPage() {
  const { eventId } = useParams();
  const [, setLocation] = useLocation();
  
  const { data: event } = useQuery<Event>({
    queryKey: ['/api/events', eventId],
    enabled: !!eventId,
  });
  
  const { data: credentials = [], isLoading } = useQuery<EventCredentialWithDetails[]>({
    queryKey: [`/api/events/${eventId}/event-credentials`],
    enabled: !!eventId,
  });
  
  const handleDownloadIdPass = (credentialId: string) => {
    window.open(`/api/event-credentials/${credentialId}/id-pass`, '_blank');
  };

  const getPaymentStatusBadge = (status?: string) => {
    const statusValue = status || 'pending';
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive', color: string }> = {
      paid: { variant: 'default', color: 'bg-green-100 text-green-800' },
      pending: { variant: 'secondary', color: 'bg-yellow-100 text-yellow-800' },
      declined: { variant: 'destructive', color: 'bg-red-100 text-red-800' },
    };

    const badgeInfo = variants[statusValue] || variants.pending;

    return (
      <Badge className={badgeInfo.color} data-testid={`badge-payment-${statusValue}`}>
        {statusValue.toUpperCase()}
      </Badge>
    );
  };

  const handleExport = () => {
    const headers = ['Participant Name', 'Event Name', 'Event Username', 'Event Password', 'Payment Status', 'Signature'];
    const rows = credentials.map(c => [
      c.participant.fullName,
      c.event.name,
      c.eventUsername,
      c.eventPassword,
      (c.paymentStatus || 'pending').toUpperCase(),
      '________________',
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event?.name || 'event'}-participants.csv`;
    a.click();
  };
  
  const handlePrint = () => {
    const printContent = `
      <html>
        <head>
          <title>Participant List - ${event?.name || 'Event'}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            h1 { color: #333; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <h1>${event?.name || 'Event'} - Participant List</h1>
          <table>
            <thead>
              <tr>
                <th>Participant Name</th>
                <th>Event Username</th>
                <th>Event Password</th>
                <th>Signature</th>
              </tr>
            </thead>
            <tbody>
              ${credentials.map(c => `
                <tr>
                  <td>${c.participant.fullName}</td>
                  <td>${c.eventUsername}</td>
                  <td>${c.eventPassword}</td>
                  <td>________________</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };
  
  return (
    <EventAdminLayout>
      <div className="p-8">
        <Button
          variant="ghost"
          onClick={() => setLocation('/event-admin/events')}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to My Events
        </Button>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold" data-testid="heading-participants">Event Participants</h1>
            <p className="text-muted-foreground mt-2">{event?.name}</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleExport} 
              variant="outline" 
              data-testid="button-export"
              disabled={credentials.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button 
              onClick={handlePrint} 
              variant="outline" 
              data-testid="button-print"
              disabled={credentials.length === 0}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Participants ({credentials.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8" data-testid="loading-credentials">
                Loading credentials...
              </div>
            ) : credentials.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-credentials">
                No participants registered for this event yet
              </div>
            ) : (
              <Table data-testid="table-credentials">
                <TableHeader>
                  <TableRow>
                    <TableHead>Participant Name</TableHead>
                    <TableHead>Event Username</TableHead>
                    <TableHead>Event Password</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Registration Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {credentials.map((cred) => (
                    <TableRow key={cred.id} data-testid={`row-credential-${cred.id}`}>
                      <TableCell data-testid={`text-name-${cred.id}`}>
                        {cred.participant.fullName}
                      </TableCell>
                      <TableCell className="font-mono" data-testid={`text-username-${cred.id}`}>
                        {cred.eventUsername}
                      </TableCell>
                      <TableCell className="font-mono" data-testid={`text-password-${cred.id}`}>
                        {cred.eventPassword}
                      </TableCell>
                      <TableCell data-testid={`text-payment-${cred.id}`}>
                        {getPaymentStatusBadge(cred.paymentStatus)}
                      </TableCell>
                      <TableCell data-testid={`text-date-${cred.id}`}>
                        {new Date(cred.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadIdPass(cred.id)}
                          data-testid={`button-download-pdf-${cred.id}`}
                        >
                          <FileDown className="h-4 w-4 mr-2" />
                          ID Pass
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </EventAdminLayout>
  );
}
