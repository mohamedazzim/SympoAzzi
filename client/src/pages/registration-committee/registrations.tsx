import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Copy, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import RegistrationCommitteeLayout from "@/components/layouts/RegistrationCommitteeLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Registration, Event } from "@shared/schema";

export default function RegistrationCommitteeRegistrationsPage() {
  const { toast } = useToast();
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [credentials, setCredentials] = useState<{
    main: { username: string; password: string; email: string };
    events: Array<{ eventId: string; eventName: string; eventUsername: string; eventPassword: string }>;
  } | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);

  const { data: registrations, isLoading } = useQuery<Registration[]>({
    queryKey: ['/api/registrations'],
  });

  const { data: events } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const approveMutation = useMutation({
    mutationFn: async (registrationId: string) => {
      const response = await apiRequest('PATCH', `/api/registrations/${registrationId}/approve`);
      const result = await response.json();
      return result;
    },
    onSuccess: (data) => {
      setCredentials({
        main: data.mainCredentials,
        events: data.eventCredentials || [],
      });
      setShowCredentials(true);
      setSelectedRegistration(null);
      queryClient.invalidateQueries({ queryKey: ['/api/registrations'] });
      toast({
        title: "Success",
        description: "Registration approved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
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

  const getFieldValue = (submittedData: Record<string, string>, fieldLabel: string): string => {
    for (const [key, value] of Object.entries(submittedData)) {
      const lowerLabel = fieldLabel.toLowerCase();
      const lowerValue = value?.toString().toLowerCase() || '';
      
      if (key.toLowerCase().includes(lowerLabel)) {
        return value;
      }
    }
    
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

  const copyAllCredentials = () => {
    if (credentials) {
      let text = `Main Account Credentials:\nUsername: ${credentials.main.username}\nPassword: ${credentials.main.password}\nEmail: ${credentials.main.email}\n\n`;
      
      if (credentials.events && credentials.events.length > 0) {
        text += `Event-Specific Credentials:\n`;
        credentials.events.forEach((event) => {
          text += `\n${event.eventName}:\nEvent Username: ${event.eventUsername}\nEvent Password: ${event.eventPassword}\n`;
        });
      }
      
      navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "All credentials copied to clipboard",
      });
    }
  };

  return (
    <RegistrationCommitteeLayout>
      <div className="container mx-auto p-6 max-w-7xl" data-testid="page-reg-committee-registrations">
        <div className="mb-6">
          <h1 className="text-3xl font-bold" data-testid="heading-registrations">Registrations</h1>
          <p className="text-muted-foreground">Review and approve participant registrations</p>
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
                    <TableHead>Actions</TableHead>
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
                      <TableCell>
                        {registration.paymentStatus === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => setSelectedRegistration(registration)}
                            data-testid={`button-approve-${registration.id}`}
                          >
                            Approve
                          </Button>
                        )}
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

        <Dialog open={!!selectedRegistration} onOpenChange={(open) => !open && setSelectedRegistration(null)}>
          <DialogContent data-testid="dialog-approve">
            <DialogHeader>
              <DialogTitle data-testid="dialog-title">Approve Registration</DialogTitle>
              <DialogDescription data-testid="dialog-description">
                Review the registration details and mark as paid to create participant credentials
              </DialogDescription>
            </DialogHeader>
            {selectedRegistration && (
              <div className="space-y-3" data-testid="registration-details">
                <div className="space-y-2">
                  <h3 className="font-semibold text-base">Submitted Information:</h3>
                  {Object.entries(selectedRegistration.submittedData).map(([key, value]) => (
                    <div key={key} className="text-sm">
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <span className="font-medium">Selected Events: </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedRegistration.selectedEvents && selectedRegistration.selectedEvents.length > 0 ? (
                      selectedRegistration.selectedEvents.map((eventId) => (
                        <Badge key={eventId} variant="secondary">
                          {getEventName(eventId)}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-sm">No events selected</span>
                    )}
                  </div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md text-sm">
                  <p className="font-medium mb-1">What will happen:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Participant account will be created</li>
                    <li>• User will be registered for all {selectedRegistration.selectedEvents?.length || 0} selected event(s)</li>
                    <li>• Login credentials will be generated</li>
                  </ul>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedRegistration(null)} data-testid="button-cancel">
                Cancel
              </Button>
              <Button
                onClick={() => selectedRegistration && approveMutation.mutate(selectedRegistration.id)}
                disabled={approveMutation.isPending}
                data-testid="button-confirm-approve"
              >
                {approveMutation.isPending ? 'Approving...' : 'Mark as Paid & Create Account'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showCredentials} onOpenChange={setShowCredentials}>
          <DialogContent className="max-w-3xl" data-testid="dialog-credentials">
            <DialogHeader>
              <DialogTitle data-testid="credentials-title">
                <CheckCircle className="h-6 w-6 text-green-600 inline mr-2" />
                Registration Approved
              </DialogTitle>
              <DialogDescription data-testid="credentials-description">
                Participant account created successfully. Share these credentials with the participant.
              </DialogDescription>
            </DialogHeader>
            {credentials && (
              <div className="space-y-4" data-testid="credentials-info">
                <div className="p-4 bg-gray-50 rounded-md">
                  <h3 className="font-semibold mb-2">Main Account Credentials</h3>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="font-medium">Username: </span>
                      <code data-testid="text-main-username">{credentials.main.username}</code>
                    </div>
                    <div>
                      <span className="font-medium">Password: </span>
                      <code data-testid="text-main-password">{credentials.main.password}</code>
                    </div>
                    <div>
                      <span className="font-medium">Email: </span>
                      <code data-testid="text-main-email">{credentials.main.email}</code>
                    </div>
                  </div>
                </div>

                {credentials.events && credentials.events.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Event-Specific Credentials</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      These credentials will be visible to event admins for their respective events.
                    </p>
                    <div className="space-y-2">
                      {credentials.events.map((event) => (
                        <div key={event.eventId} className="p-3 bg-blue-50 rounded-md" data-testid={`event-cred-${event.eventId}`}>
                          <p className="font-semibold text-blue-900 mb-1">{event.eventName}</p>
                          <div className="text-sm space-y-0.5">
                            <div>
                              <span className="font-medium">Event Username: </span>
                              <code className="text-xs">{event.eventUsername}</code>
                            </div>
                            <div>
                              <span className="font-medium">Event Password: </span>
                              <code className="text-xs">{event.eventPassword}</code>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Important: These credentials will only be shown once. Make sure to save and share them with the participant.
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={copyAllCredentials} variant="outline" data-testid="button-copy-credentials">
                <Copy className="h-4 w-4 mr-2" />
                Copy All Credentials
              </Button>
              <Button onClick={() => {
                setShowCredentials(false);
                setCredentials(null);
              }} data-testid="button-close-credentials">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RegistrationCommitteeLayout>
  );
}
