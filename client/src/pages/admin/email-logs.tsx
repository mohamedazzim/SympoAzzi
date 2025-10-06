import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Mail, Filter, Download, Eye, Search, Calendar as CalendarIcon, Send, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { EmailLog } from '@shared/schema';
import type { DateRange } from 'react-day-picker';
import { apiRequest, queryClient } from '@/lib/queryClient';

export default function EmailLogsPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [templateTypeFilter, setTemplateTypeFilter] = useState<string>('all');
  const [searchEmail, setSearchEmail] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const [testEmailDialogOpen, setTestEmailDialogOpen] = useState<boolean>(false);
  const [testEmailAddress, setTestEmailAddress] = useState<string>('');
  const [testEmailName, setTestEmailName] = useState<string>('Test User');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; messageId?: string } | null>(null);
  const logsPerPage = 50;

  const buildQueryKey = () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.append('status', statusFilter);
    if (templateTypeFilter !== 'all') params.append('templateType', templateTypeFilter);
    if (dateRange?.from) params.append('startDate', dateRange.from.toISOString());
    if (dateRange?.to) params.append('endDate', dateRange.to.toISOString());
    
    const queryString = params.toString();
    return queryString ? `/api/email-logs?${queryString}` : '/api/email-logs';
  };

  const { data: emailLogs, isLoading } = useQuery<EmailLog[]>({
    queryKey: [buildQueryKey()],
  });

  const filteredLogs = emailLogs?.filter(log => {
    if (searchEmail && !log.recipientEmail.toLowerCase().includes(searchEmail.toLowerCase())) {
      return false;
    }
    return true;
  }) || [];

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const paginatedLogs = filteredLogs.slice((page - 1) * logsPerPage, page * logsPerPage);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'sent':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const exportToCSV = () => {
    if (!filteredLogs || filteredLogs.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There are no email logs to export.',
        variant: 'destructive'
      });
      return;
    }

    const headers = ['Sent At', 'Recipient Name', 'Recipient Email', 'Subject', 'Template Type', 'Status', 'Error Message'];
    const rows = filteredLogs.map(log => [
      format(new Date(log.sentAt), 'yyyy-MM-dd HH:mm:ss'),
      log.recipientName || 'N/A',
      log.recipientEmail,
      log.subject,
      log.templateType,
      log.status,
      log.errorMessage || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Export successful',
      description: `Exported ${filteredLogs.length} email logs to CSV.`
    });
  };

  const testEmailMutation = useMutation({
    mutationFn: async (emailData: { to: string; name: string }) => {
      const response = await apiRequest('POST', '/api/test-email', emailData);
      return response;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-logs'] });
      if (data.success) {
        setTestResult({
          success: true,
          message: `Test email sent successfully to ${testEmailAddress}`,
          messageId: data.messageId
        });
        toast({
          title: 'Test email sent successfully',
          description: `Email sent to ${testEmailAddress}. Message ID: ${data.messageId || 'N/A'}`,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Unknown error occurred'
        });
        toast({
          title: 'Failed to send test email',
          description: data.error || 'Unknown error occurred',
          variant: 'destructive'
        });
      }
    },
    onError: (error: any) => {
      setTestResult({
        success: false,
        message: error.message || 'Failed to send test email'
      });
      toast({
        title: 'Error sending test email',
        description: error.message || 'Failed to send test email',
        variant: 'destructive'
      });
    }
  });

  const handleSendTestEmail = () => {
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address',
        variant: 'destructive'
      });
      return;
    }
    setTestResult(null);
    testEmailMutation.mutate({
      to: testEmailAddress,
      name: testEmailName
    });
  };

  const templateTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'registration_approved', label: 'Registration Approved' },
    { value: 'credentials_distribution', label: 'Credentials Distribution' },
    { value: 'test_start_reminder', label: 'Test Start Reminder' },
    { value: 'result_published', label: 'Result Published' }
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">
              Email Logs
            </h1>
            <p className="text-gray-600 mt-1">
              Monitor and manage all email notifications sent by the system
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Dialog open={testEmailDialogOpen} onOpenChange={setTestEmailDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  data-testid="button-open-test-email"
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <Send className="h-4 w-4" />
                  Test Email
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Test SMTP Configuration</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="test-email-address">Email Address</Label>
                    <Input
                      id="test-email-address"
                      type="email"
                      placeholder="test@example.com"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      data-testid="input-test-email-address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="test-email-name">Recipient Name</Label>
                    <Input
                      id="test-email-name"
                      type="text"
                      placeholder="Test User"
                      value={testEmailName}
                      onChange={(e) => setTestEmailName(e.target.value)}
                      data-testid="input-test-email-name"
                    />
                  </div>
                  {testResult && (
                    <Alert variant={testResult.success ? 'default' : 'destructive'} data-testid="alert-test-result">
                      {testResult.success ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      <AlertTitle>{testResult.success ? 'Success' : 'Failed'}</AlertTitle>
                      <AlertDescription>
                        {testResult.message}
                        {testResult.messageId && (
                          <div className="mt-2 text-xs">
                            <strong>Message ID:</strong> {testResult.messageId}
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                  <Button
                    onClick={handleSendTestEmail}
                    disabled={testEmailMutation.isPending}
                    data-testid="button-send-test-email"
                    className="w-full"
                  >
                    {testEmailMutation.isPending ? 'Sending...' : 'Send Test Email'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              onClick={exportToCSV}
              data-testid="button-export-csv"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export to CSV
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger data-testid="select-status-filter">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Template Type</Label>
                <Select
                  value={templateTypeFilter}
                  onValueChange={setTemplateTypeFilter}
                >
                  <SelectTrigger data-testid="select-template-filter">
                    <SelectValue placeholder="Select template type" />
                  </SelectTrigger>
                  <SelectContent>
                    {templateTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      data-testid="button-date-range"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange?.to ? (
                          <>
                            {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}
                          </>
                        ) : (
                          format(dateRange.from, "MMM dd, yyyy")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                      data-testid="calendar-date-range"
                    />
                  </PopoverContent>
                </Popover>
                {dateRange?.from && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDateRange(undefined)}
                    className="mt-2 w-full"
                    data-testid="button-clear-dates"
                  >
                    Clear dates
                  </Button>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Search Email</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by email..."
                    value={searchEmail}
                    onChange={(e) => {
                      setSearchEmail(e.target.value);
                      setPage(1);
                    }}
                    className="pl-10"
                    data-testid="input-search-email"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Logs
              {filteredLogs && (
                <span className="text-sm font-normal text-gray-500" data-testid="text-log-count">
                  ({filteredLogs.length} total)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No email logs found</h3>
                <p className="text-gray-500">
                  {searchEmail
                    ? 'No emails match your search criteria.'
                    : 'Email logs will appear here once emails are sent.'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Recipient Name</TableHead>
                        <TableHead>Recipient Email</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Template Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLogs.map((log) => (
                        <TableRow key={log.id} data-testid={`row-email-log-${log.id}`}>
                          <TableCell className="font-medium" data-testid={`text-timestamp-${log.id}`}>
                            {format(new Date(log.sentAt), 'MMM dd, yyyy HH:mm')}
                          </TableCell>
                          <TableCell data-testid={`text-recipient-name-${log.id}`}>
                            {log.recipientName || '-'}
                          </TableCell>
                          <TableCell data-testid={`text-recipient-email-${log.id}`}>
                            {log.recipientEmail}
                          </TableCell>
                          <TableCell data-testid={`text-subject-${log.id}`}>
                            {log.subject}
                          </TableCell>
                          <TableCell data-testid={`text-template-type-${log.id}`}>
                            <span className="text-xs font-medium">
                              {log.templateType.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </TableCell>
                          <TableCell data-testid={`badge-status-${log.id}`}>
                            <Badge variant={getStatusBadgeVariant(log.status)}>
                              {log.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedLog(log)}
                                  data-testid={`button-view-details-${log.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Email Log Details</DialogTitle>
                                </DialogHeader>
                                {selectedLog && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-sm font-medium text-gray-500">Sent At</label>
                                        <p className="text-sm mt-1" data-testid="dialog-text-sent-at">
                                          {format(new Date(selectedLog.sentAt), 'PPpp')}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-gray-500">Status</label>
                                        <div className="mt-1">
                                          <Badge variant={getStatusBadgeVariant(selectedLog.status)} data-testid="dialog-badge-status">
                                            {selectedLog.status.toUpperCase()}
                                          </Badge>
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-gray-500">Recipient Name</label>
                                        <p className="text-sm mt-1" data-testid="dialog-text-recipient-name">
                                          {selectedLog.recipientName || '-'}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-gray-500">Recipient Email</label>
                                        <p className="text-sm mt-1" data-testid="dialog-text-recipient-email">
                                          {selectedLog.recipientEmail}
                                        </p>
                                      </div>
                                      <div className="col-span-2">
                                        <label className="text-sm font-medium text-gray-500">Subject</label>
                                        <p className="text-sm mt-1" data-testid="dialog-text-subject">
                                          {selectedLog.subject}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-gray-500">Template Type</label>
                                        <p className="text-sm mt-1" data-testid="dialog-text-template-type">
                                          {selectedLog.templateType.replace(/_/g, ' ').toUpperCase()}
                                        </p>
                                      </div>
                                      {selectedLog.errorMessage && (
                                        <div className="col-span-2">
                                          <label className="text-sm font-medium text-gray-500">Error Message</label>
                                          <p className="text-sm mt-1 text-red-600" data-testid="dialog-text-error-message">
                                            {selectedLog.errorMessage}
                                          </p>
                                        </div>
                                      )}
                                      {selectedLog.metadata != null && (
                                        <div className="col-span-2">
                                          <label className="text-sm font-medium text-gray-500">Metadata</label>
                                          <pre className="text-xs mt-1 bg-gray-50 p-3 rounded-md overflow-x-auto" data-testid="dialog-text-metadata">
                                            {JSON.stringify(selectedLog.metadata, null, 2) as string}
                                          </pre>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-500" data-testid="text-pagination-info">
                      Showing {(page - 1) * logsPerPage + 1} to {Math.min(page * logsPerPage, filteredLogs.length)} of {filteredLogs.length} logs
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        data-testid="button-prev-page"
                      >
                        Previous
                      </Button>
                      <span className="text-sm" data-testid="text-current-page">
                        Page {page} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        data-testid="button-next-page"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
