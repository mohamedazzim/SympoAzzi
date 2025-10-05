import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import AdminLayout from '@/components/layouts/AdminLayout';
import EventAdminLayout from '@/components/layouts/EventAdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2, FileSpreadsheet, FileText } from 'lucide-react';
import type { Event } from '@shared/schema';

export default function ReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [format, setFormat] = useState<'excel' | 'pdf'>('excel');
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: user?.role === 'super_admin' ? ['/api/events'] : ['/api/events/admin/assigned'],
  });

  const handleDownload = async () => {
    if (!selectedEvent) {
      toast({
        title: 'No Event Selected',
        description: 'Please select an event to download the report',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsDownloading(true);

      let url = '';
      if (selectedEvent === 'symposium') {
        url = `/api/reports/export/symposium/${format}`;
      } else {
        url = `/api/reports/export/event/${selectedEvent}/${format}`;
      }

      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate report');
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `report_${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`;

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      toast({
        title: 'Download Complete',
        description: `${format.toUpperCase()} report has been downloaded successfully`,
      });
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: error instanceof Error ? error.message : 'Failed to download report',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const Layout = user?.role === 'super_admin' ? AdminLayout : EventAdminLayout;

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="heading-download-reports">Download Reports</h1>
          <p className="text-gray-600 mt-1">Export event and symposium reports in Excel or PDF format</p>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Generate Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="event-select">Select Event</Label>
              {eventsLoading ? (
                <div className="text-sm text-gray-500" data-testid="loading-events">Loading events...</div>
              ) : (
                <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                  <SelectTrigger id="event-select" data-testid="select-event">
                    <SelectValue placeholder="Select an event" />
                  </SelectTrigger>
                  <SelectContent>
                    {user?.role === 'super_admin' && (
                      <SelectItem value="symposium" data-testid="option-symposium">
                        All Events (Symposium)
                      </SelectItem>
                    )}
                    {events?.map((event) => (
                      <SelectItem key={event.id} value={event.id} data-testid={`option-event-${event.id}`}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Format</Label>
              <RadioGroup value={format} onValueChange={(value) => setFormat(value as 'excel' | 'pdf')} data-testid="radio-format">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="excel" id="excel" data-testid="radio-excel" />
                  <Label htmlFor="excel" className="flex items-center gap-2 cursor-pointer font-normal">
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    Excel (.xlsx)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pdf" id="pdf" data-testid="radio-pdf" />
                  <Label htmlFor="pdf" className="flex items-center gap-2 cursor-pointer font-normal">
                    <FileText className="h-4 w-4 text-red-600" />
                    PDF (.pdf)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Button 
              onClick={handleDownload} 
              disabled={isDownloading || !selectedEvent}
              className="w-full"
              data-testid="button-download-report"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                Event Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Download detailed reports for individual events including:
              </p>
              <ul className="mt-2 text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Event overview and statistics</li>
                <li>Round-wise performance details</li>
                <li>Participant scores and rankings</li>
                <li>Complete leaderboard</li>
              </ul>
            </CardContent>
          </Card>

          {user?.role === 'super_admin' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Symposium Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Download comprehensive symposium-wide reports including:
                </p>
                <ul className="mt-2 text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Overall symposium statistics</li>
                  <li>Event summaries and comparisons</li>
                  <li>Top performers across all events</li>
                  <li>Participation and completion rates</li>
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
