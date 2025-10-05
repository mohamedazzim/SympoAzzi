import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, CheckCircle, Clock, Download } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import RegistrationCommitteeLayout from "@/components/layouts/RegistrationCommitteeLayout";
import type { Registration, Event } from "@shared/schema";

export default function RegistrationCommitteeDashboard() {
  const { toast } = useToast();
  
  const { data: registrations } = useQuery<Registration[]>({
    queryKey: ['/api/registrations'],
  });

  const { data: events } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const totalRegistrations = registrations?.length || 0;
  const pendingRegistrations = registrations?.filter(r => r.paymentStatus === 'pending').length || 0;
  const approvedRegistrations = registrations?.filter(r => r.paymentStatus === 'paid').length || 0;

  const approvedList = registrations?.filter(r => r.paymentStatus === 'paid') || [];

  const getEventName = (eventId: string) => {
    const event = events?.find(e => e.id === eventId);
    return event?.name || eventId;
  };

  const getFieldValue = (submittedData: Record<string, string>, fieldLabel: string): string => {
    const entries = Object.entries(submittedData);
    
    if (fieldLabel.toLowerCase().includes('name')) {
      const nameEntry = entries.find(([k, v]) => 
        v && typeof v === 'string' && v.includes(' ') && !v.includes('@')
      );
      return nameEntry ? nameEntry[1] : 'N/A';
    }
    
    if (fieldLabel.toLowerCase().includes('email')) {
      const emailEntry = entries.find(([k, v]) => 
        v && typeof v === 'string' && v.includes('@')
      );
      return emailEntry ? emailEntry[1] : 'N/A';
    }
    
    return 'N/A';
  };

  const downloadPDF = () => {
    if (approvedList.length === 0) {
      toast({
        title: "No Data",
        description: "No approved participants to download",
        variant: "destructive",
      });
      return;
    }

    const content = approvedList.map((reg, index) => {
      const name = getFieldValue(reg.submittedData, 'name');
      const email = getFieldValue(reg.submittedData, 'email');
      const eventNames = reg.selectedEvents?.map(id => getEventName(id)).join(', ') || 'None';
      return `${index + 1}. ${name} - ${email} - Events: ${eventNames}`;
    }).join('\n');

    const fullContent = `APPROVED PARTICIPANTS LIST\n\nTotal Approved: ${approvedList.length}\n\n${content}`;

    const blob = new Blob([fullContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `approved-participants-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Participant list has been downloaded",
    });
  };

  return (
    <RegistrationCommitteeLayout>
      <div className="container mx-auto p-6 max-w-6xl" data-testid="page-reg-committee-dashboard">
        <div className="mb-6">
          <h1 className="text-3xl font-bold" data-testid="heading-dashboard">Dashboard</h1>
          <p className="text-muted-foreground">Registration Committee Overview</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-6">
          <Card data-testid="card-total">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total">{totalRegistrations}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-pending">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600" data-testid="stat-pending">{pendingRegistrations}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-approved">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="stat-approved">{approvedRegistrations}</div>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="card-quick-actions">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage registration approvals</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Link href="/registration-committee/registrations">
              <Button data-testid="button-view-registrations">
                <ClipboardList className="h-4 w-4 mr-2" />
                View All Registrations
              </Button>
            </Link>
            <Button 
              variant="outline" 
              onClick={downloadPDF}
              disabled={approvedList.length === 0}
              data-testid="button-download-pdf"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Approved List
            </Button>
          </CardContent>
        </Card>

        {approvedList.length > 0 && (
          <Card data-testid="card-approved-list">
            <CardHeader>
              <CardTitle>Approved Participants</CardTitle>
              <CardDescription>All approved and registered participants</CardDescription>
            </CardHeader>
            <CardContent>
              <Table data-testid="table-approved">
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Selected Events</TableHead>
                    <TableHead>Approved Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedList.map((registration, index) => (
                    <TableRow key={registration.id} data-testid={`row-approved-${registration.id}`}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell data-testid={`text-name-${registration.id}`}>
                        {getFieldValue(registration.submittedData, 'name')}
                      </TableCell>
                      <TableCell data-testid={`text-email-${registration.id}`}>
                        {getFieldValue(registration.submittedData, 'email')}
                      </TableCell>
                      <TableCell data-testid={`text-events-${registration.id}`}>
                        <div className="flex flex-wrap gap-1">
                          {registration.selectedEvents && registration.selectedEvents.length > 0 ? (
                            registration.selectedEvents.map((eventId) => (
                              <Badge key={eventId} variant="outline" className="text-xs">
                                {getEventName(eventId)}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">No events</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-date-${registration.id}`}>
                        {registration.processedAt 
                          ? new Date(registration.processedAt).toLocaleDateString()
                          : new Date(registration.submittedAt).toLocaleDateString()
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </RegistrationCommitteeLayout>
  );
}
