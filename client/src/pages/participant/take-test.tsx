import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useRef } from 'react';
import ParticipantLayout from '@/components/layouts/ParticipantLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Clock, AlertTriangle, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import type { TestAttempt, Question, Answer, Round, RoundRules, Participant } from '@shared/schema';

interface TestAttemptWithDetails extends TestAttempt {
  round: Round;
  questions: (Question & { questionText: string })[];
  answers: Answer[];
}

export default function TakeTestPage() {
  const { attemptId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [violationCount, setViolationCount] = useState(0);
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [violationMessage, setViolationMessage] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [timeWarningMessage, setTimeWarningMessage] = useState('');
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  
  // Ref to track test status for event handlers
  const testStatusRef = useRef<string>('in_progress');
  const hasShown5MinWarning = useRef(false);
  const hasShown1MinWarning = useRef(false);

  const { data: attempt, isLoading } = useQuery<TestAttemptWithDetails>({
    queryKey: ['/api/attempts', attemptId],
    enabled: !!attemptId,
  });

  // Update ref when attempt status changes
  useEffect(() => {
    if (attempt?.status) {
      testStatusRef.current = attempt.status;
    }
  }, [attempt?.status]);

  const { data: rules } = useQuery<RoundRules>({
    queryKey: ['/api/rounds', attempt?.roundId, 'rules'],
    enabled: !!attempt?.roundId,
  });

  const { data: currentRound } = useQuery<Round>({
    queryKey: ['/api/rounds', attempt?.roundId],
    queryFn: async () => {
      if (!attempt?.roundId) return null;
      const response = await fetch(`/api/rounds/${attempt.roundId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.json();
    },
    enabled: !!attempt?.roundId && hasStarted,
    refetchInterval: 5000,
  });

  const { data: participant } = useQuery<Participant | null>({
    queryKey: ['/api/participants/my-registrations', attempt?.userId, attempt?.round?.eventId],
    queryFn: async () => {
      if (!attempt?.userId || !attempt?.round?.eventId) return null;
      const response = await fetch(`/api/participants/my-registrations`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const participants: Participant[] = await response.json();
      return participants.find((p: Participant) => p.eventId === attempt.round.eventId && p.userId === attempt.userId) || null;
    },
    enabled: !!attempt?.userId && !!attempt?.round?.eventId,
  });

  // Mutations defined early to avoid TDZ issues
  const disqualifyMutation = useMutation({
    mutationFn: async () => {
      if (!participant?.id) throw new Error('Participant not found');
      return apiRequest('PATCH', `/api/participants/${participant.id}/disqualify`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/participants'] });
    },
  });

  const submitTestMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/attempts/${attemptId}/submit`, {});
    },
    onSuccess: () => {
      // Update test status to prevent fullscreen cleanup
      testStatusRef.current = 'completed';
      
      toast({
        title: 'Test submitted',
        description: 'Your test has been submitted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/attempts', attemptId] });
      setLocation(`/participant/results/${attemptId}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Submission failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Initialize answers from existing data
  useEffect(() => {
    if (attempt?.answers) {
      const answerMap: Record<string, string> = {};
      attempt.answers.forEach((ans) => {
        answerMap[ans.questionId] = ans.answer;
      });
      setAnswers(answerMap);
    }
  }, [attempt]);

  // Initialize timer
  useEffect(() => {
    if (attempt?.round && attempt.startedAt) {
      const duration = attempt.round.duration * 60; // Convert to seconds
      const startTime = new Date(attempt.startedAt).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, duration - elapsed);
      setTimeRemaining(remaining);
    }
  }, [attempt]);

  // Auto-submit when round is ended by admin
  useEffect(() => {
    if (currentRound?.status === 'completed' && attempt?.status === 'in_progress' && hasStarted) {
      toast({
        title: 'Round Ended',
        description: 'The admin has ended this round. Your test will be auto-submitted.',
        variant: 'destructive',
      });
      setTimeout(() => submitTestMutation.mutate(), 2000);
    }
  }, [currentRound?.status, attempt?.status, hasStarted, submitTestMutation, toast]);

  // Timer countdown with warnings
  useEffect(() => {
    if (!attempt || !hasStarted) return;

    if (timeRemaining <= 0 && attempt.status === 'in_progress') {
      submitTestMutation.mutate();
      return;
    }

    // Show 5 minute warning
    if (timeRemaining === 300 && !hasShown5MinWarning.current) {
      hasShown5MinWarning.current = true;
      setTimeWarningMessage('5 minutes remaining!');
      setShowTimeWarning(true);
      toast({
        title: 'Time Warning',
        description: '5 minutes remaining in your test',
        variant: 'default',
      });
      setTimeout(() => setShowTimeWarning(false), 5000);
    }

    // Show 1 minute warning
    if (timeRemaining === 60 && !hasShown1MinWarning.current) {
      hasShown1MinWarning.current = true;
      setTimeWarningMessage('1 minute remaining!');
      setShowTimeWarning(true);
      toast({
        title: 'Time Warning',
        description: '1 minute remaining in your test',
        variant: 'destructive',
      });
      setTimeout(() => setShowTimeWarning(false), 5000);
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, attempt, hasStarted, submitTestMutation, toast]);

  // Handle fullscreen start - ALWAYS enforce fullscreen
  const handleBeginTest = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setHasStarted(true);
    } catch (err) {
      console.error('Failed to enter fullscreen:', err);
      toast({
        title: 'Fullscreen required',
        description: 'Please allow fullscreen mode to start the test',
        variant: 'destructive',
      });
    }
  };

  // Handle re-entering fullscreen
  const handleReenterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setShowFullscreenModal(false);
    } catch (err) {
      console.error('Failed to re-enter fullscreen:', err);
      toast({
        title: 'Fullscreen required',
        description: 'Please allow fullscreen mode to continue',
        variant: 'destructive',
      });
    }
  };

  const logViolation = useCallback((type: string) => {
    if (!attemptId) return;

    apiRequest('POST', `/api/attempts/${attemptId}/violations`, { type }).catch(console.error);

    setViolationCount(prev => {
      const newCount = prev + 1;
      
      if (newCount === 1) {
        // First violation - Show warning
        setViolationMessage('⚠️ You are not allowed to use shortcuts or leave the test screen. Further attempts will eliminate you.');
        setShowViolationWarning(true);
        toast({
          title: '⚠️ Warning #1',
          description: 'You are not allowed to use shortcuts or leave the test screen. Further attempts will eliminate you.',
          variant: 'destructive',
        });
        setTimeout(() => setShowViolationWarning(false), 5000);
      } else if (newCount === 2) {
        // Second violation - Final warning
        setViolationMessage('⚠️ Final warning! Another attempt will eliminate you.');
        setShowViolationWarning(true);
        toast({
          title: '⚠️ Warning #2 - FINAL WARNING',
          description: 'Another attempt will eliminate you from this event.',
          variant: 'destructive',
        });
        setTimeout(() => setShowViolationWarning(false), 5000);
      } else if (newCount >= 3) {
        // Third violation - Eliminate
        setViolationMessage('❌ You have been eliminated for violating event rules.');
        setShowViolationWarning(true);
        toast({
          title: '❌ ELIMINATED',
          description: 'You have been eliminated for violating event rules. Your test will be auto-submitted.',
          variant: 'destructive',
        });
        
        disqualifyMutation.mutate();
        setTimeout(() => submitTestMutation.mutate(), 2000);
      }
      
      return newCount;
    });
  }, [attemptId, disqualifyMutation, submitTestMutation, toast]);

  // Fullscreen enforcement after test started - ALWAYS enforce
  useEffect(() => {
    if (!hasStarted) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && testStatusRef.current === 'in_progress') {
        logViolation('fullscreen_exit');
        // Don't allow re-entering if already eliminated (3+ violations)
        if (violationCount < 3) {
          setShowFullscreenModal(true);
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [hasStarted, logViolation, violationCount]);

  // Cleanup fullscreen only on unmount
  useEffect(() => {
    return () => {
      if (document.fullscreenElement && testStatusRef.current !== 'in_progress') {
        document.exitFullscreen().catch(console.error);
      }
    };
  }, []);

  // Back button prevention
  useEffect(() => {
    if (!hasStarted) return;

    // Push a state to history to prevent back navigation
    window.history.pushState(null, '', window.location.href);

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.href);
      toast({
        title: 'Navigation blocked',
        description: 'You cannot use the back button during the test',
        variant: 'destructive',
      });
      logViolation('back_button');
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasStarted, toast, logViolation]);

  // Tab switch detection with visibilitychange - ALWAYS monitor
  useEffect(() => {
    if (!hasStarted) return;

    const handleVisibilityChange = () => {
      if (document.hidden && attempt?.status === 'in_progress') {
        logViolation('tab_switch');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [attempt?.status, hasStarted, logViolation]);

  // Backup tab switch detection with blur/focus - ALWAYS monitor
  useEffect(() => {
    if (!hasStarted) return;

    const handleBlur = () => {
      if (attempt?.status === 'in_progress') {
        logViolation('tab_switch');
      }
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [attempt?.status, hasStarted, logViolation]);

  // Enhanced keyboard shortcuts blocking
  useEffect(() => {
    if (!hasStarted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // Block refresh shortcuts (F5, Ctrl+R, Cmd+R)
      if (
        e.key === 'F5' ||
        (e.ctrlKey && e.key === 'r') ||
        (e.metaKey && e.key === 'r')
      ) {
        e.preventDefault();
        toast({
          title: 'Action blocked',
          description: 'Refresh is disabled during the test',
          variant: 'destructive',
        });
        logViolation('refresh_attempt');
        return;
      }

      // Block close window/tab shortcuts (Alt+F4, Cmd+Q, Ctrl+W, Cmd+W)
      if (
        (e.altKey && e.key === 'F4') ||
        (e.metaKey && e.key === 'q') ||
        (e.ctrlKey && e.key === 'w') ||
        (e.metaKey && e.key === 'w')
      ) {
        e.preventDefault();
        toast({
          title: 'Action blocked',
          description: 'You cannot close the window during the test',
          variant: 'destructive',
        });
        return;
      }

      // Block backspace outside input fields (back navigation)
      if (e.key === 'Backspace' && !isInputField) {
        e.preventDefault();
        toast({
          title: 'Action blocked',
          description: 'Backspace navigation is disabled during the test',
          variant: 'destructive',
        });
        return;
      }

      // Block Alt+Tab (triggers violation)
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        logViolation('alt_tab');
        return;
      }

      // Block F11 fullscreen toggle (triggers violation)
      if (e.key === 'F11') {
        e.preventDefault();
        logViolation('f11_fullscreen');
        return;
      }

      // Block Ctrl+T new tab (triggers violation)
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        logViolation('ctrl_t');
        return;
      }

      // Block developer tools and other shortcuts - ALWAYS enforce
      if (
        (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'p')) ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J') ||
        (e.ctrlKey && e.key === 'u')
      ) {
        e.preventDefault();
        logViolation('restricted_shortcut');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [hasStarted, toast, logViolation]);

  // Prevent refresh - ALWAYS enforce
  useEffect(() => {
    if (!hasStarted) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      logViolation('refresh');
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasStarted, logViolation]);

  const saveAnswerMutation = useMutation({
    mutationFn: async ({ questionId, answer }: { questionId: string; answer: string }) => {
      return apiRequest('POST', `/api/attempts/${attemptId}/answers`, { questionId, answer });
    },
  });

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
    saveAnswerMutation.mutate({ questionId, answer });
  };

  const handleSubmit = () => {
    if (!attempt?.questions) return;

    const answeredCount = Object.keys(answers).length;
    const totalQuestions = attempt.questions.length;

    if (answeredCount < totalQuestions) {
      setShowSubmitConfirm(true);
      return;
    }

    submitTestMutation.mutate();
  };

  const confirmSubmit = () => {
    setShowSubmitConfirm(false);
    submitTestMutation.mutate();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <ParticipantLayout>
        <div className="p-8">
          <div className="text-center py-12" data-testid="loading-test">Loading test...</div>
        </div>
      </ParticipantLayout>
    );
  }

  if (!attempt || attempt.status !== 'in_progress') {
    return (
      <ParticipantLayout>
        <div className="p-8">
          <div className="text-center py-12">Test not available or already completed</div>
          <div className="text-center mt-4">
            <Button onClick={() => setLocation('/participant/dashboard')} data-testid="button-back-dashboard">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </ParticipantLayout>
    );
  }

  const currentQuestion = attempt.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / attempt.questions.length) * 100;

  // Show begin test screen
  if (!hasStarted) {
    return (
      <ParticipantLayout>
        <div className="p-8 max-w-3xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Ready to Start Test?</CardTitle>
              <CardDescription className="text-base mt-2">
                {attempt.round.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important Instructions:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>You have {attempt.round.duration} minutes to complete this test</li>
                    <li>Answer all {attempt.questions.length} questions</li>
                    <li className="text-red-600 font-medium">You MUST stay in fullscreen mode</li>
                    <li className="text-red-600 font-medium">Do NOT switch tabs or windows</li>
                    <li className="text-red-600 font-medium">Do NOT refresh the page</li>
                    <li className="text-red-600 font-medium">All shortcuts (Alt+Tab, Ctrl+R, F5, etc.) are disabled</li>
                    <li className="text-red-600 font-bold">
                      ⚠️ WARNING: 3 violations will auto-eliminate you from the event
                    </li>
                  </ul>
                </AlertDescription>
              </Alert>

              {rules?.additionalRules && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="font-medium mb-2">Additional Rules:</div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {rules.additionalRules}
                  </div>
                </div>
              )}

              <div className="text-center pt-4">
                <Button
                  onClick={handleBeginTest}
                  size="lg"
                  className="px-8"
                  data-testid="button-begin-test"
                >
                  Begin Test in Fullscreen
                </Button>
                <p className="text-sm text-gray-500 mt-3">
                  Click the button above to start your test
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </ParticipantLayout>
    );
  }

  return (
    <ParticipantLayout>
      {/* Fullscreen Violation Modal - Blocking */}
      {showFullscreenModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl">Fullscreen Required</CardTitle>
              <CardDescription>
                You must stay in fullscreen mode during the test
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 text-center">
                A violation has been logged. Click the button below to return to fullscreen mode and continue your test.
              </p>
              <Button
                onClick={handleReenterFullscreen}
                className="w-full"
                size="lg"
                data-testid="button-reenter-fullscreen"
              >
                Return to Fullscreen
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Submit Confirmation Modal - In Fullscreen */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <CardTitle className="text-xl">Submit Test?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 text-center">
                You have answered {Object.keys(answers).length} out of {attempt?.questions.length} questions. 
                Are you sure you want to submit?
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowSubmitConfirm(false)}
                  variant="outline"
                  className="flex-1"
                  data-testid="button-cancel-submit"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmSubmit}
                  className="flex-1"
                  data-testid="button-confirm-submit"
                >
                  Submit Test
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="p-8 max-w-5xl mx-auto">
        {/* Header with timer and progress */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" data-testid="heading-test-name">
              {attempt.round.name}
            </h1>
            <p className="text-gray-600">
              Question {currentQuestionIndex + 1} of {attempt.questions.length}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {rules?.autoSubmitOnViolation && (
              <Badge variant="outline" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                Violations: {violationCount}/3
              </Badge>
            )}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              timeRemaining < 300 ? 'bg-red-100' : 'bg-blue-100'
            }`}>
              <Clock className={`h-5 w-5 ${timeRemaining < 300 ? 'text-red-600' : 'text-blue-600'}`} />
              <span className={`font-mono text-lg font-bold ${
                timeRemaining < 300 ? 'text-red-900' : 'text-blue-900'
              }`} data-testid="text-timer">
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>
        </div>

        {/* Time Warning */}
        {showTimeWarning && (
          <Alert className="mb-6 bg-orange-50 border-orange-200">
            <Clock className="h-4 w-4 text-orange-600" />
            <AlertDescription>
              <strong>Time Alert:</strong> {timeWarningMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Violation Warning */}
        {showViolationWarning && (
          <Alert className="mb-6 bg-yellow-50 border-yellow-200">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription>
              <strong>Warning:</strong> {violationMessage || 'Violation detected.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Progress Bar */}
        <div className="mb-6">
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl" data-testid="heading-question">
                  Question {currentQuestion.questionNumber}
                </CardTitle>
                <Badge variant="secondary" className="mt-2">
                  {currentQuestion.points} {currentQuestion.points === 1 ? 'point' : 'points'}
                </Badge>
              </div>
              <Badge>
                {currentQuestion.questionType.replace('_', ' ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-lg" data-testid="text-question">
              {String(currentQuestion.questionText || '')}
            </div>

            {/* Multiple Choice */}
            {currentQuestion.questionType === 'multiple_choice' && currentQuestion.options && (
              <RadioGroup
                value={answers[currentQuestion.id] || ''}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
              >
                {Array.isArray(currentQuestion.options) ? currentQuestion.options.map((option: any, index: number) => (
                  <div key={index} className="flex items-center space-x-2 p-3 rounded border hover:bg-gray-50">
                    <RadioGroupItem value={String(option)} id={`option-${index}`} data-testid={`radio-option-${index}`} />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                      {String(option)}
                    </Label>
                  </div>
                )) : null}
              </RadioGroup>
            )}

            {/* True/False */}
            {currentQuestion.questionType === 'true_false' && (
              <RadioGroup
                value={answers[currentQuestion.id] || ''}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
              >
                <div className="flex items-center space-x-2 p-3 rounded border hover:bg-gray-50">
                  <RadioGroupItem value="true" id="true" data-testid="radio-true" />
                  <Label htmlFor="true" className="flex-1 cursor-pointer">True</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded border hover:bg-gray-50">
                  <RadioGroupItem value="false" id="false" data-testid="radio-false" />
                  <Label htmlFor="false" className="flex-1 cursor-pointer">False</Label>
                </div>
              </RadioGroup>
            )}

            {/* Short Answer or Coding */}
            {(currentQuestion.questionType === 'short_answer' || currentQuestion.questionType === 'coding') && (
              <Textarea
                placeholder={
                  currentQuestion.questionType === 'coding'
                    ? 'Write your code here...'
                    : 'Type your answer here...'
                }
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                className="min-h-[200px] font-mono"
                data-testid="input-answer"
              />
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
                data-testid="button-previous"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              <div className="flex gap-2">
                {currentQuestionIndex < attempt.questions.length - 1 ? (
                  <Button
                    onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                    data-testid="button-next"
                  >
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={submitTestMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="button-submit-test"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {submitTestMutation.isPending ? 'Submitting...' : 'Submit Test'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question Navigator */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Question Navigator</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-10 gap-2">
              {attempt.questions.map((q, index) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`p-2 rounded text-sm font-medium transition-colors ${
                    index === currentQuestionIndex
                      ? 'bg-blue-600 text-white'
                      : answers[q.id]
                      ? 'bg-green-100 text-green-900 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                  data-testid={`button-question-${index + 1}`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 rounded"></div>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-100 rounded"></div>
                <span>Not Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-600 rounded"></div>
                <span>Current</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ParticipantLayout>
  );
}
