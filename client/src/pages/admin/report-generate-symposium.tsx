import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { FileText, Loader2, BarChart3 } from 'lucide-react';

export default function ReportGenerateSymposiumPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/reports/generate/symposium', 'POST', {});
    },
    onSuccess: () => {
      toast({
        title: 'Report Generated',
        description: 'Symposium-wide report has been generated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      setLocation('/admin/reports');
    },
    onError: (error: Error) => {
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate report',
        variant: 'destructive',
      });
    },
  });

  const handleGenerateClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmGenerate = () => {
    setShowConfirmDialog(false);
    generateReportMutation.mutate();
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="heading-generate-symposium-report">
            Generate Symposium Report
          </h1>
          <p className="text-gray-600 mt-1">
            Create a comprehensive report aggregating data from all events in the symposium
          </p>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Symposium-wide Report
            </CardTitle>
            <CardDescription>
              Generate an aggregate report containing overall statistics, event summaries, top performers, and completion rates across all events
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Report Contents</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Overview of all events and their status</li>
                <li>• Total participants and event admins</li>
                <li>• Event summaries with completion rates</li>
                <li>• Top 20 performers across all events</li>
                <li>• Aggregate violation statistics</li>
                <li>• Cross-event analytics and trends</li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium text-amber-900 mb-2">Note</h4>
              <p className="text-sm text-amber-800">
                This report will aggregate data from <strong>all events</strong> in the system. 
                Generation may take a few moments depending on the amount of data.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleGenerateClick}
                disabled={generateReportMutation.isPending}
                className="flex-1"
                data-testid="button-generate"
              >
                {generateReportMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Symposium Report
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation('/admin/reports')}
                disabled={generateReportMutation.isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>

        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent data-testid="dialog-confirm">
            <AlertDialogHeader>
              <AlertDialogTitle>Generate Symposium Report?</AlertDialogTitle>
              <AlertDialogDescription>
                This will create a comprehensive report aggregating data from all events in the system. 
                This operation may take a few moments to complete.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-dialog-cancel">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmGenerate} data-testid="button-dialog-confirm">
                Generate Report
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
