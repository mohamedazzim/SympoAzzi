import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, CheckCircle, Trash2, Pencil, UserPlus, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import RegistrationCommitteeLayout from "@/components/layouts/RegistrationCommitteeLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Event, User, EventCredential } from "@shared/schema";

const onSpotFormSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  selectedEvents: z.array(z.string()).min(1, "At least one event must be selected"),
});

type OnSpotFormData = z.infer<typeof onSpotFormSchema>;

type OnSpotParticipant = User & {
  eventCredentials: Array<EventCredential & { event: Event }>;
};

export default function OnSpotRegistrationPage() {
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<{
    participant: { id: string; fullName: string; email: string; phone?: string | null };
    mainCredentials: { username: string; password: string; email: string };
    eventCredentials: Array<{ eventId: string; eventName: string; eventUsername: string; eventPassword: string }>;
  } | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<OnSpotParticipant | null>(null);
  const [deletingParticipant, setDeletingParticipant] = useState<OnSpotParticipant | null>(null);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  const form = useForm<OnSpotFormData>({
    resolver: zodResolver(onSpotFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      selectedEvents: [],
    },
  });

  const editForm = useForm<{ fullName: string; email: string; phone: string }>({
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
    },
  });

  const { data: events } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const { data: participants, isLoading } = useQuery<OnSpotParticipant[]>({
    queryKey: ['/api/registration-committee/participants'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: OnSpotFormData) => {
      const response = await apiRequest('POST', '/api/registration-committee/participants', data);
      const result = await response.json();
      return result;
    },
    onSuccess: (data) => {
      setCredentials(data);
      setShowCredentials(true);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/registration-committee/participants'] });
      toast({
        title: "Success",
        description: "Participant registered successfully",
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { fullName: string; email: string; phone: string } }) => {
      const response = await apiRequest('PATCH', `/api/registration-committee/participants/${id}`, data);
      const result = await response.json();
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/registration-committee/participants'] });
      setEditingParticipant(null);
      toast({
        title: "Success",
        description: "Participant updated successfully",
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/registration-committee/participants/${id}`);
      const result = await response.json();
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/registration-committee/participants'] });
      setDeletingParticipant(null);
      toast({
        title: "Success",
        description: "Participant deleted successfully",
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

  const activeEvents = events?.filter(e => e.status === 'active') || [];
  const technicalEvents = activeEvents.filter(e => e.category === 'technical');
  const nonTechnicalEvents = activeEvents.filter(e => e.category === 'non_technical');

  const selectedEvents = form.watch('selectedEvents');
  const selectedTechnicalCount = selectedEvents?.filter(id => 
    technicalEvents.some(e => e.id === id)
  ).length || 0;
  const selectedNonTechnicalCount = selectedEvents?.filter(id => 
    nonTechnicalEvents.some(e => e.id === id)
  ).length || 0;

  const copyAllCredentials = () => {
    if (credentials) {
      let text = `Main Account Credentials:\nUsername: ${credentials.mainCredentials.username}\nPassword: ${credentials.mainCredentials.password}\nEmail: ${credentials.mainCredentials.email}\n\n`;
      
      if (credentials.eventCredentials && credentials.eventCredentials.length > 0) {
        text += `Event-Specific Credentials:\n`;
        credentials.eventCredentials.forEach((event) => {
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

  const copyCredential = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  const onSubmit = (data: OnSpotFormData) => {
    createMutation.mutate(data);
  };

  const handleEdit = (participant: OnSpotParticipant) => {
    setEditingParticipant(participant);
    editForm.reset({
      fullName: participant.fullName,
      email: participant.email,
      phone: participant.phone || "",
    });
  };

  const onEditSubmit = (data: { fullName: string; email: string; phone: string }) => {
    if (editingParticipant) {
      updateMutation.mutate({ id: editingParticipant.id, data });
    }
  };

  const handleExportCSV = async () => {
    try {
      setExportingCSV(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/registration-committee/participants/export/csv', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to export CSV');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'participants-credentials.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "CSV exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to export CSV",
        variant: "destructive",
      });
    } finally {
      setExportingCSV(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExportingPDF(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/registration-committee/participants/export/pdf', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to export PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'participants-credentials.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "PDF exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to export PDF",
        variant: "destructive",
      });
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <RegistrationCommitteeLayout>
      <div className="container mx-auto p-6 max-w-7xl" data-testid="page-on-spot-registration">
        <div className="mb-6">
          <h1 className="text-3xl font-bold" data-testid="heading-on-spot-registration">On-Spot Registration</h1>
          <p className="text-muted-foreground">Register participants directly and manage on-spot registrations</p>
        </div>

        <div className="grid gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <UserPlus className="inline h-5 w-5 mr-2" />
                Register New Participant
              </CardTitle>
              <CardDescription>Create a new participant account with event registration</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-create-participant">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter full name" data-testid="input-fullname" />
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
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="Enter email" data-testid="input-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} type="tel" placeholder="Enter phone number" data-testid="input-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="selectedEvents"
                    render={() => (
                      <FormItem>
                        <FormLabel>Select Events *</FormLabel>
                        <FormDescription>
                          Maximum 1 technical and 1 non-technical event
                        </FormDescription>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          {technicalEvents.length > 0 && (
                            <div className="space-y-2">
                              <h3 className="font-medium text-sm">Technical Events</h3>
                              {technicalEvents.map((event) => (
                                <FormField
                                  key={event.id}
                                  control={form.control}
                                  name="selectedEvents"
                                  render={({ field }) => {
                                    return (
                                      <FormItem
                                        key={event.id}
                                        className="flex flex-row items-start space-x-3 space-y-0"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(event.id)}
                                            disabled={!field.value?.includes(event.id) && selectedTechnicalCount >= 1}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...field.value, event.id])
                                                : field.onChange(
                                                    field.value?.filter((value) => value !== event.id)
                                                  );
                                            }}
                                            data-testid={`checkbox-event-${event.id}`}
                                          />
                                        </FormControl>
                                        <FormLabel className="font-normal cursor-pointer">
                                          {event.name}
                                        </FormLabel>
                                      </FormItem>
                                    );
                                  }}
                                />
                              ))}
                            </div>
                          )}
                          {nonTechnicalEvents.length > 0 && (
                            <div className="space-y-2">
                              <h3 className="font-medium text-sm">Non-Technical Events</h3>
                              {nonTechnicalEvents.map((event) => (
                                <FormField
                                  key={event.id}
                                  control={form.control}
                                  name="selectedEvents"
                                  render={({ field }) => {
                                    return (
                                      <FormItem
                                        key={event.id}
                                        className="flex flex-row items-start space-x-3 space-y-0"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(event.id)}
                                            disabled={!field.value?.includes(event.id) && selectedNonTechnicalCount >= 1}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...field.value, event.id])
                                                : field.onChange(
                                                    field.value?.filter((value) => value !== event.id)
                                                  );
                                            }}
                                            data-testid={`checkbox-event-${event.id}`}
                                          />
                                        </FormControl>
                                        <FormLabel className="font-normal cursor-pointer">
                                          {event.name}
                                        </FormLabel>
                                      </FormItem>
                                    );
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create Participant'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>On-Spot Registered Participants</CardTitle>
                  <CardDescription>Participants you have registered on-spot</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleExportCSV}
                    disabled={exportingCSV || !participants || participants.length === 0}
                    data-testid="button-export-csv"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {exportingCSV ? 'Exporting...' : 'Export CSV'}
                  </Button>
                  <Button
                    onClick={handleExportPDF}
                    disabled={exportingPDF || !participants || participants.length === 0}
                    data-testid="button-export-pdf"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {exportingPDF ? 'Exporting...' : 'Export PDF'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div data-testid="loading-participants">Loading participants...</div>
              ) : participants && participants.length > 0 ? (
                <Table data-testid="table-participants">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Events</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participants.map((participant) => (
                      <TableRow key={participant.id} data-testid={`row-participant-${participant.id}`}>
                        <TableCell data-testid={`text-name-${participant.id}`}>
                          {participant.fullName}
                        </TableCell>
                        <TableCell data-testid={`text-email-${participant.id}`}>
                          {participant.email}
                        </TableCell>
                        <TableCell data-testid={`text-phone-${participant.id}`}>
                          {participant.phone || 'N/A'}
                        </TableCell>
                        <TableCell data-testid={`text-events-${participant.id}`}>
                          <div className="flex flex-wrap gap-1">
                            {participant.eventCredentials && participant.eventCredentials.length > 0 ? (
                              participant.eventCredentials.map((cred: EventCredential & { event: Event }) => (
                                <Badge key={cred.id} variant="outline" className="text-xs">
                                  {cred.event.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">No events</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-created-${participant.id}`}>
                          {new Date(participant.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(participant)}
                              data-testid={`button-edit-${participant.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeletingParticipant(participant)}
                              data-testid={`button-delete-${participant.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-participants">
                  No on-spot registered participants yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={showCredentials} onOpenChange={setShowCredentials}>
          <DialogContent className="max-w-3xl" data-testid="dialog-credentials">
            <DialogHeader>
              <DialogTitle data-testid="credentials-title">
                <CheckCircle className="h-6 w-6 text-green-600 inline mr-2" />
                Participant Created Successfully
              </DialogTitle>
              <DialogDescription data-testid="credentials-description">
                Share these credentials with the participant. This will only be shown once.
              </DialogDescription>
            </DialogHeader>
            {credentials && (
              <div className="space-y-4" data-testid="credentials-info">
                <div className="p-4 bg-gray-50 rounded-md">
                  <h3 className="font-semibold mb-2">Main Account Credentials</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">Username: </span>
                        <code data-testid="text-main-username">{credentials.mainCredentials.username}</code>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyCredential(credentials.mainCredentials.username, "Username")}
                        data-testid="button-copy-username"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">Password: </span>
                        <code data-testid="text-main-password">{credentials.mainCredentials.password}</code>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyCredential(credentials.mainCredentials.password, "Password")}
                        data-testid="button-copy-password"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">Email: </span>
                        <code data-testid="text-main-email">{credentials.mainCredentials.email}</code>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyCredential(credentials.mainCredentials.email, "Email")}
                        data-testid="button-copy-email"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                {credentials.eventCredentials && credentials.eventCredentials.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Event-Specific Credentials</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      These credentials will be visible to event admins for their respective events.
                    </p>
                    <div className="border rounded-md">
                      <Table data-testid="table-event-credentials">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Event Name</TableHead>
                            <TableHead>Username</TableHead>
                            <TableHead>Password</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {credentials.eventCredentials.map((event) => (
                            <TableRow key={event.eventId} data-testid={`row-event-cred-${event.eventId}`}>
                              <TableCell className="font-medium" data-testid={`text-event-name-${event.eventId}`}>
                                {event.eventName}
                              </TableCell>
                              <TableCell>
                                <code className="text-sm bg-gray-100 px-2 py-1 rounded" data-testid={`text-event-username-${event.eventId}`}>
                                  {event.eventUsername}
                                </code>
                              </TableCell>
                              <TableCell>
                                <code className="text-sm bg-gray-100 px-2 py-1 rounded" data-testid={`text-event-password-${event.eventId}`}>
                                  {event.eventPassword}
                                </code>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-1 justify-end">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => copyCredential(event.eventUsername, `${event.eventName} Username`)}
                                    data-testid={`button-copy-event-username-${event.eventId}`}
                                    title="Copy Username"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => copyCredential(event.eventPassword, `${event.eventName} Password`)}
                                    data-testid={`button-copy-event-password-${event.eventId}`}
                                    title="Copy Password"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
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
              <Button onClick={copyAllCredentials} variant="outline" data-testid="button-copy-all-credentials">
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

        <Dialog open={!!editingParticipant} onOpenChange={(open) => !open && setEditingParticipant(null)}>
          <DialogContent data-testid="dialog-edit">
            <DialogHeader>
              <DialogTitle data-testid="dialog-edit-title">Edit Participant</DialogTitle>
              <DialogDescription data-testid="dialog-edit-description">
                Update participant details
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Full Name</label>
                  <Input {...editForm.register("fullName")} placeholder="Full Name" data-testid="input-edit-fullname" />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input {...editForm.register("email")} type="email" placeholder="Email" data-testid="input-edit-email" />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <Input {...editForm.register("phone")} placeholder="Phone" data-testid="input-edit-phone" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingParticipant(null)} data-testid="button-cancel-edit">
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-edit">
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deletingParticipant} onOpenChange={(open) => !open && setDeletingParticipant(null)}>
          <DialogContent data-testid="dialog-delete">
            <DialogHeader>
              <DialogTitle data-testid="dialog-delete-title">Delete Participant</DialogTitle>
              <DialogDescription data-testid="dialog-delete-description">
                Are you sure you want to delete this participant? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {deletingParticipant && (
              <div className="py-2" data-testid="delete-participant-details">
                <p className="font-medium">{deletingParticipant.fullName}</p>
                <p className="text-sm text-muted-foreground">{deletingParticipant.email}</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingParticipant(null)} data-testid="button-cancel-delete">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deletingParticipant && deleteMutation.mutate(deletingParticipant.id)}
                disabled={deleteMutation.isPending}
                data-testid="button-confirm-delete"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RegistrationCommitteeLayout>
  );
}
