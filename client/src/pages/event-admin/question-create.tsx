import { useParams, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import EventAdminLayout from '@/components/layouts/EventAdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { insertQuestionSchema } from '@shared/schema';
import { z } from 'zod';
import { ArrowLeft, Plus, X } from 'lucide-react';

const formSchema = insertQuestionSchema.omit({ 
  options: true, 
  correctAnswer: true,
  expectedOutput: true,
  testCases: true 
}).extend({
  questionType: z.enum(['mcq', 'true_false', 'short_answer', 'coding']),
});

type FormData = z.infer<typeof formSchema>;

export default function QuestionCreatePage() {
  const { roundId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [questionType, setQuestionType] = useState<string>('mcq');
  const [mcqOptions, setMcqOptions] = useState<string[]>(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState<string>('');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      roundId: roundId || '',
      questionType: 'mcq',
      questionText: '',
      questionNumber: 1,
      points: 1,
    },
  });

  async function onSubmit(data: FormData) {
    try {
      const questionData: any = {
        ...data,
        roundId,
      };

      if (questionType === 'mcq') {
        const validOptions = mcqOptions.filter(opt => opt.trim() !== '');
        if (validOptions.length < 2) {
          toast({
            title: 'Invalid options',
            description: 'Please provide at least 2 options for MCQ',
            variant: 'destructive',
          });
          return;
        }
        if (!correctAnswer) {
          toast({
            title: 'Missing correct answer',
            description: 'Please select the correct answer',
            variant: 'destructive',
          });
          return;
        }
        questionData.options = validOptions;
        questionData.correctAnswer = correctAnswer;
      } else if (questionType === 'true_false') {
        questionData.options = ['True', 'False'];
        questionData.correctAnswer = correctAnswer || 'True';
      } else if (questionType === 'short_answer') {
        questionData.correctAnswer = correctAnswer || null;
      } else if (questionType === 'coding') {
        questionData.expectedOutput = correctAnswer || null;
      }

      await apiRequest('POST', `/api/rounds/${roundId}/questions`, questionData);

      toast({
        title: 'Question created',
        description: 'The question has been added successfully',
      });

      queryClient.invalidateQueries({ queryKey: ['/api/rounds', roundId, 'questions'] });
      setLocation(`/event-admin/rounds/${roundId}/questions`);
    } catch (error: any) {
      toast({
        title: 'Creation failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  }

  const updateMcqOption = (index: number, value: string) => {
    const newOptions = [...mcqOptions];
    newOptions[index] = value;
    setMcqOptions(newOptions);
  };

  const addMcqOption = () => {
    setMcqOptions([...mcqOptions, '']);
  };

  const removeMcqOption = (index: number) => {
    if (mcqOptions.length > 2) {
      setMcqOptions(mcqOptions.filter((_, i) => i !== index));
    }
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
          <h1 className="text-3xl font-bold text-gray-900" data-testid="heading-create-question">Create New Question</h1>
          <p className="text-gray-600 mt-1">Add a new question to the round</p>
        </div>

        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Question Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="questionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question Type</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          setQuestionType(value);
                        }} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-type">
                            <SelectValue placeholder="Select question type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="mcq">Multiple Choice (MCQ)</SelectItem>
                          <SelectItem value="true_false">True/False</SelectItem>
                          <SelectItem value="short_answer">Short Answer</SelectItem>
                          <SelectItem value="coding">Coding Question</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="questionNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Question Number</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-question-number"
                          />
                        </FormControl>
                        <FormDescription>Sequential question number</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="points"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Points</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-points"
                          />
                        </FormControl>
                        <FormDescription>Points for this question</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="questionText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question Text</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter the question..."
                          className="min-h-[120px]"
                          {...field}
                          data-testid="input-question-text"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {questionType === 'mcq' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <FormLabel>Answer Options</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addMcqOption}
                        data-testid="button-add-option"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Option
                      </Button>
                    </div>
                    {mcqOptions.map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder={`Option ${index + 1}`}
                          value={option}
                          onChange={(e) => updateMcqOption(index, e.target.value)}
                          data-testid={`input-option-${index}`}
                        />
                        {mcqOptions.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMcqOption(index)}
                            data-testid={`button-remove-option-${index}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <div>
                      <FormLabel>Correct Answer</FormLabel>
                      <Select value={correctAnswer} onValueChange={setCorrectAnswer}>
                        <SelectTrigger data-testid="select-correct-answer">
                          <SelectValue placeholder="Select correct answer" />
                        </SelectTrigger>
                        <SelectContent>
                          {mcqOptions.filter(opt => opt.trim() !== '').map((option, index) => (
                            <SelectItem key={index} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {questionType === 'true_false' && (
                  <div>
                    <FormLabel>Correct Answer</FormLabel>
                    <Select value={correctAnswer || 'True'} onValueChange={setCorrectAnswer}>
                      <SelectTrigger data-testid="select-true-false">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="True">True</SelectItem>
                        <SelectItem value="False">False</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {questionType === 'short_answer' && (
                  <div>
                    <FormLabel>Expected Answer (Optional)</FormLabel>
                    <FormDescription className="mb-2">
                      Provide a sample answer for reference (manual grading may be required)
                    </FormDescription>
                    <Input
                      placeholder="Expected answer..."
                      value={correctAnswer}
                      onChange={(e) => setCorrectAnswer(e.target.value)}
                      data-testid="input-expected-answer"
                    />
                  </div>
                )}

                {questionType === 'coding' && (
                  <div>
                    <FormLabel>Expected Output (Optional)</FormLabel>
                    <FormDescription className="mb-2">
                      Describe the expected output or test cases
                    </FormDescription>
                    <Textarea
                      placeholder="Describe expected output or test cases..."
                      value={correctAnswer}
                      onChange={(e) => setCorrectAnswer(e.target.value)}
                      className="min-h-[100px]"
                      data-testid="input-expected-output"
                    />
                  </div>
                )}

                <div className="flex gap-3">
                  <Button type="submit" data-testid="button-create">
                    Create Question
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
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </EventAdminLayout>
  );
}
