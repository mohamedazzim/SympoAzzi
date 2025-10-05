import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import EventAdminLayout from '@/components/layouts/EventAdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Edit, FileQuestion, Trash2 } from 'lucide-react';
import type { Question } from '@shared/schema';

export default function RoundQuestionsPage() {
  const { roundId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: questions, isLoading } = useQuery<Question[]>({
    queryKey: ['/api/rounds', roundId, 'questions'],
    enabled: !!roundId,
  });

  const getQuestionTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      mcq: 'bg-blue-100 text-blue-800',
      true_false: 'bg-green-100 text-green-800',
      short_answer: 'bg-yellow-100 text-yellow-800',
      coding: 'bg-purple-100 text-purple-800',
    };

    return (
      <Badge className={colors[type] || 'bg-gray-100 text-gray-800'}>
        {type.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <EventAdminLayout>
        <div className="p-8">
          <div className="text-center py-12" data-testid="loading-questions">Loading questions...</div>
        </div>
      </EventAdminLayout>
    );
  }

  return (
    <EventAdminLayout>
      <div className="p-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Rounds
          </Button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900" data-testid="heading-questions">Questions Management</h1>
              <p className="text-gray-600 mt-1">Manage questions for this round</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setLocation(`/event-admin/rounds/${roundId}/questions/bulk-upload`)}
                data-testid="button-bulk-upload"
              >
                <FileQuestion className="mr-2 h-4 w-4" />
                Bulk Upload
              </Button>
              <Button
                onClick={() => setLocation(`/event-admin/rounds/${roundId}/questions/new`)}
                data-testid="button-create-question"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Question
              </Button>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Round Questions</CardTitle>
          </CardHeader>
          <CardContent>
            {!questions || questions.length === 0 ? (
              <div className="text-center py-12">
                <FileQuestion className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-600" data-testid="no-questions">
                  No questions added yet
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Create your first question to build the test
                </p>
                <Button
                  onClick={() => setLocation(`/event-admin/rounds/${roundId}/questions/new`)}
                  className="mt-4"
                  data-testid="button-create-first"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Question
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Q#</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((question) => (
                    <TableRow key={question.id} data-testid={`row-question-${question.id}`}>
                      <TableCell className="font-medium" data-testid={`text-question-number-${question.id}`}>
                        {question.questionNumber}
                      </TableCell>
                      <TableCell>{getQuestionTypeBadge(question.questionType)}</TableCell>
                      <TableCell className="max-w-md truncate">
                        {question.questionText}
                      </TableCell>
                      <TableCell>{question.points}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/event-admin/rounds/${roundId}/questions/${question.id}/edit`)}
                            data-testid={`button-edit-${question.id}`}
                            title="Edit Question"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
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
