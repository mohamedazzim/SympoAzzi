import { useParams, useLocation } from 'wouter';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import EventAdminLayout from '@/components/layouts/EventAdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ArrowLeft, Upload, FileJson, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface ParsedQuestion {
  questionNumber: number;
  questionText: string;
  points: number;
  questionType: string;
  options?: string[];
  correctAnswer?: string;
}

export default function QuestionsBulkUploadPage() {
  const { roundId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  const uploadMutation = useMutation({
    mutationFn: async (questions: ParsedQuestion[]) => {
      return apiRequest('POST', `/api/rounds/${roundId}/questions/bulk`, { questions });
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Questions uploaded',
        description: data.message || `Successfully created ${data.created} questions`,
      });
      if (data.errors && data.errors.length > 0) {
        toast({
          title: 'Some questions failed',
          description: `${data.errors.length} questions had errors`,
          variant: 'destructive',
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/rounds', roundId, 'questions'] });
      setLocation(`/event-admin/rounds/${roundId}/questions`);
    },
    onError: (error: any) => {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setParsedQuestions([]);
    setParseErrors([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseFile(content, file.name);
    };
    reader.readAsText(file);
  };

  const parseFile = (content: string, fileName: string) => {
    const errors: string[] = [];
    const questions: ParsedQuestion[] = [];

    try {
      if (fileName.endsWith('.json')) {
        const data = JSON.parse(content);
        if (!Array.isArray(data)) {
          errors.push('JSON file must contain an array of questions');
          setParseErrors(errors);
          return;
        }

        data.forEach((q, index) => {
          if (!q.questionNumber || !q.questionText) {
            errors.push(`Question ${index + 1}: Missing questionNumber or questionText`);
            return;
          }

          questions.push({
            questionNumber: q.questionNumber,
            questionText: q.questionText,
            points: q.points || 1,
            questionType: 'multiple_choice',
            options: q.options || [],
            correctAnswer: q.correctAnswer || '',
          });
        });
      } else if (fileName.endsWith('.csv')) {
        const lines = content.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          errors.push('CSV file is empty');
          setParseErrors(errors);
          return;
        }

        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const values = line.split(',').map(v => v.trim());
          
          if (values.length < 3) {
            errors.push(`Line ${i + 1}: Insufficient columns`);
            continue;
          }

          const questionNumber = parseInt(values[0]);
          const questionText = values[1];
          const points = parseInt(values[2]) || 1;
          
          if (isNaN(questionNumber) || !questionText) {
            errors.push(`Line ${i + 1}: Invalid questionNumber or questionText`);
            continue;
          }

          const options: string[] = [];
          let correctAnswer = '';

          if (values.length >= 8) {
            options.push(values[3], values[4], values[5], values[6]);
            correctAnswer = values[7];
          }

          questions.push({
            questionNumber,
            questionText,
            points,
            questionType: 'multiple_choice',
            options: options.length > 0 ? options : undefined,
            correctAnswer: correctAnswer || undefined,
          });
        }
      } else {
        errors.push('Unsupported file format. Please upload .csv or .json file');
      }
    } catch (error: any) {
      errors.push(`Parse error: ${error.message}`);
    }

    setParsedQuestions(questions);
    setParseErrors(errors);
  };

  const handleUpload = () => {
    if (parsedQuestions.length === 0) {
      toast({
        title: 'No questions to upload',
        description: 'Please select a valid file with questions',
        variant: 'destructive',
      });
      return;
    }

    uploadMutation.mutate(parsedQuestions);
  };

  return (
    <EventAdminLayout>
      <div className="p-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation(`/event-admin/rounds/${roundId}/questions`)}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Questions
          </Button>
          <div className="flex items-center gap-3">
            <Upload className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900" data-testid="heading-bulk-upload">
                Bulk Upload Questions
              </h1>
              <p className="text-gray-600 mt-1">Upload multiple questions at once via CSV or JSON</p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload File</CardTitle>
              <CardDescription>
                Choose a CSV or JSON file containing your questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">Select File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileChange}
                  data-testid="input-file"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-green-600" />
                    <span className="font-medium">CSV Format</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    questionNumber,questionText,points,option1,option2,option3,option4,correctAnswer
                  </p>
                  <p className="text-xs text-gray-500">
                    Example: 1,What is 2+2?,1,2,3,4,5,4
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileJson className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">JSON Format</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Array of question objects
                  </p>
                  <pre className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
{`[{
  "questionNumber": 1,
  "questionText": "What is 2+2?",
  "points": 1,
  "options": ["2","3","4","5"],
  "correctAnswer": "4"
}]`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>

          {parseErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">Parsing Errors:</div>
                <ul className="list-disc list-inside space-y-1">
                  {parseErrors.map((error, index) => (
                    <li key={index} className="text-sm">{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {parsedQuestions.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Preview Questions</CardTitle>
                    <CardDescription>
                      Review {parsedQuestions.length} questions before uploading
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    {parsedQuestions.length} Questions Ready
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Q#</TableHead>
                        <TableHead>Question</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Options</TableHead>
                        <TableHead>Answer</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedQuestions.map((q, index) => (
                        <TableRow key={index} data-testid={`row-question-${index}`}>
                          <TableCell>{q.questionNumber}</TableCell>
                          <TableCell className="max-w-xs truncate">{q.questionText}</TableCell>
                          <TableCell>{q.points}</TableCell>
                          <TableCell>
                            {q.options ? (
                              <span className="text-sm text-gray-600">
                                {q.options.length} options
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">None</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{q.correctAnswer || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending || parsedQuestions.length === 0}
                    data-testid="button-upload"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploadMutation.isPending ? 'Uploading...' : `Upload ${parsedQuestions.length} Questions`}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation(`/event-admin/rounds/${roundId}/questions`)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </EventAdminLayout>
  );
}
