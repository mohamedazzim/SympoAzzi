import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Edit, Trash2, Eye, Download } from 'lucide-react';
import type { Event, Question, Round, AuditLog, User } from '@shared/schema';
import { format } from 'date-fns';

export default function SuperAdminOverridesPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('events');

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2" data-testid="heading-super-admin-overrides">
            Super Admin Overrides
          </h1>
          <p className="text-gray-600 text-lg" data-testid="text-description">
            Manage all events, questions, and view audit logs
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3" data-testid="tabs-list">
            <TabsTrigger value="events" data-testid="tab-events">Events</TabsTrigger>
            <TabsTrigger value="questions" data-testid="tab-questions">Questions</TabsTrigger>
            <TabsTrigger value="audit-logs" data-testid="tab-audit-logs">Audit Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            <EventsTab />
          </TabsContent>

          <TabsContent value="questions">
            <QuestionsTab />
          </TabsContent>

          <TabsContent value="audit-logs">
            <AuditLogsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function EventsTab() {
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    type: '',
    category: 'technical' as 'technical' | 'non_technical',
    status: '',
    reason: '',
  });

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const editMutation = useMutation({
    mutationFn: async (data: typeof editForm) => {
      const response = await apiRequest(
        'PUT',
        `/api/super-admin/events/${selectedEvent?.id}/override`,
        data
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Event updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      setEditDialogOpen(false);
      setSelectedEvent(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        'DELETE',
        `/api/super-admin/events/${selectedEvent?.id}/override`,
        { reason: deleteReason }
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Event deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      setDeleteDialogOpen(false);
      setSelectedEvent(null);
      setDeleteReason('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleEditClick = (event: Event) => {
    setSelectedEvent(event);
    setEditForm({
      name: event.name,
      description: event.description,
      type: event.type,
      category: event.category,
      status: event.status,
      reason: '',
    });
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (event: Event) => {
    setSelectedEvent(event);
    setDeleteDialogOpen(true);
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return 'N/A';
    const user = users?.find(u => u.id === userId);
    return user?.fullName || 'Unknown';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle data-testid="title-events-override">Events Override</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3" data-testid="loading-events">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : !events || events.length === 0 ? (
          <div className="text-center py-8 text-gray-500" data-testid="no-events">
            No events available
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id} data-testid={`row-event-${event.id}`}>
                  <TableCell className="font-medium" data-testid={`text-event-name-${event.id}`}>
                    {event.name}
                  </TableCell>
                  <TableCell>{event.type}</TableCell>
                  <TableCell>
                    <Badge data-testid={`badge-status-${event.id}`}>{event.status}</Badge>
                  </TableCell>
                  <TableCell>{getUserName(event.createdBy)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(event)}
                        data-testid={`button-edit-event-${event.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(event)}
                        data-testid={`button-delete-event-${event.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-edit-event">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>
              Override event details. Please provide a reason for this change.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="event-name">Name</Label>
              <Input
                id="event-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                data-testid="input-event-name"
              />
            </div>
            <div>
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                data-testid="textarea-event-description"
              />
            </div>
            <div>
              <Label htmlFor="event-type">Type</Label>
              <Input
                id="event-type"
                value={editForm.type}
                onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                data-testid="input-event-type"
              />
            </div>
            <div>
              <Label htmlFor="event-category">Category</Label>
              <Select
                value={editForm.category}
                onValueChange={(value: 'technical' | 'non_technical') =>
                  setEditForm({ ...editForm, category: value })
                }
              >
                <SelectTrigger id="event-category" data-testid="select-event-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="non_technical">Non-Technical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="event-status">Status</Label>
              <Input
                id="event-status"
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                data-testid="input-event-status"
              />
            </div>
            <div>
              <Label htmlFor="event-reason">Reason for Override</Label>
              <Textarea
                id="event-reason"
                value={editForm.reason}
                onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                placeholder="Explain why this override is necessary..."
                data-testid="textarea-event-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={() => editMutation.mutate(editForm)}
              disabled={editMutation.isPending}
              data-testid="button-save-event"
            >
              {editMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-event">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event? This action cannot be undone and will
              remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Label htmlFor="delete-reason">Reason for Deletion</Label>
            <Textarea
              id="delete-reason"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Explain why this deletion is necessary..."
              data-testid="textarea-delete-reason"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function QuestionsTab() {
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  
  const [editForm, setEditForm] = useState({
    questionText: '',
    points: 0,
    correctAnswer: '',
    reason: '',
  });

  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const { data: rounds, isLoading: roundsLoading } = useQuery<Round[]>({
    queryKey: ['/api/events', selectedEventId, 'rounds'],
    enabled: !!selectedEventId,
  });

  const { data: questions, isLoading: questionsLoading } = useQuery<Question[]>({
    queryKey: ['/api/rounds', selectedRoundId, 'questions'],
    enabled: !!selectedRoundId,
  });

  const editMutation = useMutation({
    mutationFn: async (data: typeof editForm) => {
      const response = await apiRequest(
        'PUT',
        `/api/super-admin/questions/${selectedQuestion?.id}/override`,
        data
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Question updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/rounds', selectedRoundId, 'questions'] });
      setEditDialogOpen(false);
      setSelectedQuestion(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        'DELETE',
        `/api/super-admin/questions/${selectedQuestion?.id}/override`,
        { reason: deleteReason }
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Question deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/rounds', selectedRoundId, 'questions'] });
      setDeleteDialogOpen(false);
      setSelectedQuestion(null);
      setDeleteReason('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleEditClick = (question: Question) => {
    setSelectedQuestion(question);
    setEditForm({
      questionText: question.questionText,
      points: question.points,
      correctAnswer: question.correctAnswer || '',
      reason: '',
    });
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (question: Question) => {
    setSelectedQuestion(question);
    setDeleteDialogOpen(true);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle data-testid="title-questions-override">Questions Override</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 mb-6">
          <div>
            <Label htmlFor="select-event">Select Event</Label>
            <Select value={selectedEventId} onValueChange={(value) => {
              setSelectedEventId(value);
              setSelectedRoundId('');
            }}>
              <SelectTrigger id="select-event" data-testid="select-event">
                <SelectValue placeholder="Choose an event..." />
              </SelectTrigger>
              <SelectContent>
                {events?.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedEventId && (
            <div>
              <Label htmlFor="select-round">Select Round</Label>
              <Select value={selectedRoundId} onValueChange={setSelectedRoundId}>
                <SelectTrigger id="select-round" data-testid="select-round">
                  <SelectValue placeholder="Choose a round..." />
                </SelectTrigger>
                <SelectContent>
                  {rounds?.map((round) => (
                    <SelectItem key={round.id} value={round.id}>
                      {round.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {!selectedRoundId ? (
          <div className="text-center py-8 text-gray-500" data-testid="no-round-selected">
            Please select an event and round to view questions
          </div>
        ) : questionsLoading ? (
          <div className="space-y-3" data-testid="loading-questions">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : !questions || questions.length === 0 ? (
          <div className="text-center py-8 text-gray-500" data-testid="no-questions">
            No questions available for this round
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question Text</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Points</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions.map((question) => (
                <TableRow key={question.id} data-testid={`row-question-${question.id}`}>
                  <TableCell className="max-w-md" data-testid={`text-question-text-${question.id}`}>
                    {truncateText(question.questionText, 100)}
                  </TableCell>
                  <TableCell>{question.questionType}</TableCell>
                  <TableCell>{question.points}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(question)}
                        data-testid={`button-edit-question-${question.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(question)}
                        data-testid={`button-delete-question-${question.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-edit-question">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
            <DialogDescription>
              Override question details. Please provide a reason for this change.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="question-text">Question Text</Label>
              <Textarea
                id="question-text"
                value={editForm.questionText}
                onChange={(e) => setEditForm({ ...editForm, questionText: e.target.value })}
                rows={4}
                data-testid="textarea-question-text"
              />
            </div>
            <div>
              <Label htmlFor="question-points">Points</Label>
              <Input
                id="question-points"
                type="number"
                value={editForm.points}
                onChange={(e) => setEditForm({ ...editForm, points: parseInt(e.target.value) || 0 })}
                data-testid="input-question-points"
              />
            </div>
            <div>
              <Label htmlFor="question-answer">Correct Answer</Label>
              <Input
                id="question-answer"
                value={editForm.correctAnswer}
                onChange={(e) => setEditForm({ ...editForm, correctAnswer: e.target.value })}
                data-testid="input-question-answer"
              />
            </div>
            <div>
              <Label htmlFor="question-reason">Reason for Override</Label>
              <Textarea
                id="question-reason"
                value={editForm.reason}
                onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                placeholder="Explain why this override is necessary..."
                data-testid="textarea-question-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              data-testid="button-cancel-edit-question"
            >
              Cancel
            </Button>
            <Button
              onClick={() => editMutation.mutate(editForm)}
              disabled={editMutation.isPending}
              data-testid="button-save-question"
            >
              {editMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-question">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Label htmlFor="delete-question-reason">Reason for Deletion</Label>
            <Textarea
              id="delete-question-reason"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Explain why this deletion is necessary..."
              data-testid="textarea-delete-question-reason"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-question">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-question"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function AuditLogsTab() {
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    adminId: '',
    targetType: '',
    startDate: '',
    endDate: '',
  });
  const [viewChangesDialog, setViewChangesDialog] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 50;

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (filters.adminId) params.append('adminId', filters.adminId);
    if (filters.targetType) params.append('targetType', filters.targetType);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  };

  const { data: logs, isLoading } = useQuery<AuditLog[]>({
    queryKey: ['/api/super-admin/audit-logs', filters],
    queryFn: async () => {
      const response = await fetch(`/api/super-admin/audit-logs${buildQueryString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      return response.json();
    },
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const superAdmins = users?.filter(u => u.role === 'super_admin') || [];

  const paginatedLogs = logs?.slice(
    (currentPage - 1) * logsPerPage,
    currentPage * logsPerPage
  ) || [];

  const totalPages = Math.ceil((logs?.length || 0) / logsPerPage);

  const handleViewChanges = (log: AuditLog) => {
    setSelectedLog(log);
    setViewChangesDialog(true);
  };

  const exportToCSV = () => {
    if (!logs || logs.length === 0) {
      toast({
        title: 'No data',
        description: 'No audit logs to export',
        variant: 'destructive',
      });
      return;
    }

    const headers = ['Timestamp', 'Admin', 'Action', 'Target Type', 'Target Name', 'Reason'];
    const rows = logs.map(log => [
      format(new Date(log.timestamp), 'PPpp'),
      log.adminUsername,
      log.action,
      log.targetType,
      log.targetName || 'N/A',
      log.reason || 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: 'Audit logs exported to CSV',
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle data-testid="title-audit-logs">Audit Logs</CardTitle>
          <Button
            onClick={exportToCSV}
            disabled={!logs || logs.length === 0}
            data-testid="button-export-csv"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <Label htmlFor="filter-admin">Admin</Label>
            <Select
              value={filters.adminId}
              onValueChange={(value) => setFilters({ ...filters, adminId: value })}
            >
              <SelectTrigger id="filter-admin" data-testid="select-filter-admin">
                <SelectValue placeholder="All admins" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All admins</SelectItem>
                {superAdmins.map((admin) => (
                  <SelectItem key={admin.id} value={admin.id}>
                    {admin.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="filter-target-type">Target Type</Label>
            <Select
              value={filters.targetType}
              onValueChange={(value) => setFilters({ ...filters, targetType: value })}
            >
              <SelectTrigger id="filter-target-type" data-testid="select-filter-target-type">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All types</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="question">Question</SelectItem>
                <SelectItem value="round">Round</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="filter-start-date">Start Date</Label>
            <Input
              id="filter-start-date"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              data-testid="input-filter-start-date"
            />
          </div>

          <div>
            <Label htmlFor="filter-end-date">End Date</Label>
            <Input
              id="filter-end-date"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              data-testid="input-filter-end-date"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3" data-testid="loading-logs">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : !logs || logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500" data-testid="no-logs">
            No audit logs found
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target Type</TableHead>
                  <TableHead>Target Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.map((log) => (
                  <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                    <TableCell data-testid={`text-timestamp-${log.id}`}>
                      {format(new Date(log.timestamp), 'PPpp')}
                    </TableCell>
                    <TableCell>{log.adminUsername}</TableCell>
                    <TableCell>
                      <Badge data-testid={`badge-action-${log.id}`}>{log.action}</Badge>
                    </TableCell>
                    <TableCell>{log.targetType}</TableCell>
                    <TableCell>{log.targetName || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewChanges(log)}
                        data-testid={`button-view-changes-${log.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6" data-testid="pagination">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  data-testid="button-prev-page"
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600" data-testid="text-page-info">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  data-testid="button-next-page"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={viewChangesDialog} onOpenChange={setViewChangesDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" data-testid="dialog-view-changes">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Viewing changes for {selectedLog?.action} on {selectedLog?.targetType}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Basic Information</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Admin:</span> {selectedLog?.adminUsername}
                </div>
                <div>
                  <span className="text-gray-600">Action:</span> {selectedLog?.action}
                </div>
                <div>
                  <span className="text-gray-600">Target Type:</span> {selectedLog?.targetType}
                </div>
                <div>
                  <span className="text-gray-600">Target Name:</span> {selectedLog?.targetName || 'N/A'}
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Timestamp:</span>{' '}
                  {selectedLog && format(new Date(selectedLog.timestamp), 'PPpp')}
                </div>
                {selectedLog?.reason && (
                  <div className="col-span-2">
                    <span className="text-gray-600">Reason:</span> {selectedLog.reason}
                  </div>
                )}
                {selectedLog?.ipAddress && (
                  <div className="col-span-2">
                    <span className="text-gray-600">IP Address:</span> {selectedLog.ipAddress}
                  </div>
                )}
              </div>
            </div>

            {selectedLog?.changes ? (
              <div>
                <h3 className="font-semibold mb-2">Changes</h3>
                <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-x-auto" data-testid="text-changes-json">
                  {JSON.stringify(selectedLog.changes, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button onClick={() => setViewChangesDialog(false)} data-testid="button-close-changes">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
