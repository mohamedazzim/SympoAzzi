import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import ParticipantLayout from '@/components/layouts/ParticipantLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertTriangle, Trophy } from 'lucide-react';
import type { TestAttempt, Question, Answer, Round, Event } from '@shared/schema';

interface TestAttemptWithDetails extends TestAttempt {
  round: Round;
  questions: Question[];
  answers: Answer[];
  event?: Event;
  eventEnded?: boolean;
}

export default function TestResultsPage() {
  const { attemptId } = useParams();
  const [, setLocation] = useLocation();

  const { data: attempt, isLoading } = useQuery<TestAttemptWithDetails>({
    queryKey: ['/api/attempts', attemptId],
    enabled: !!attemptId,
  });

  if (isLoading) {
    return (
      <ParticipantLayout>
        <div className="p-8">
          <div className="text-center py-12" data-testid="loading-results">Loading results...</div>
        </div>
      </ParticipantLayout>
    );
  }

  if (!attempt) {
    return (
      <ParticipantLayout>
        <div className="p-8">
          <div className="text-center py-12">Test results not found</div>
        </div>
      </ParticipantLayout>
    );
  }

  // Check if event has ended - CRITICAL: Default to false to hide results until event ends
  const eventEnded = attempt.eventEnded ?? false;

  // If event hasn't ended, show submission confirmation
  if (!eventEnded) {
    return (
      <ParticipantLayout>
        <div className="p-8 max-w-3xl mx-auto">
          <Card className="border-2 border-green-200 bg-green-50">
            <CardHeader>
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" data-testid="icon-submission-success" />
                <CardTitle className="text-2xl text-green-900">Submission Received</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <p className="text-green-800 text-lg font-semibold" data-testid="text-submission-message">
                  Submission Received
                </p>
                <p className="text-green-700 text-base" data-testid="text-wait-message">
                  Wait till the test duration completely
                </p>
                <p className="text-sm text-green-600 mt-2" data-testid="text-results-info">
                  Your scores and correct answers will be visible after the test duration ends.
                </p>
                {attempt.event?.endDate && (
                  <p className="text-sm text-green-600" data-testid="text-event-end-time">
                    Event ends: {new Date(attempt.event.endDate).toLocaleString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          <div className="mt-6 flex justify-center">
            <Button
              onClick={() => setLocation('/participant/dashboard')}
              size="lg"
              data-testid="button-back-to-dashboard"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </ParticipantLayout>
    );
  }

  const scorePercentage = attempt.maxScore ? (attempt.totalScore! / attempt.maxScore) * 100 : 0;
  const totalQuestions = attempt.questions.length;
  const answeredQuestions = attempt.answers.length;
  const correctAnswers = attempt.answers.filter(a => a.isCorrect).length;

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-blue-600';
    if (percentage >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-50 border-green-200';
    if (percentage >= 60) return 'bg-blue-50 border-blue-200';
    if (percentage >= 40) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <ParticipantLayout>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation('/participant/dashboard')}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900" data-testid="heading-results">
            Test Results
          </h1>
          <p className="text-gray-600 mt-1">{attempt.round.name}</p>
        </div>

        {/* Score Overview */}
        <Card className={`mb-6 border-2 ${getScoreBg(scorePercentage)}`}>
          <CardHeader>
            <CardTitle className="text-center text-2xl">Your Score</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className={`text-6xl font-bold ${getScoreColor(scorePercentage)}`} data-testid="text-score">
              {attempt.totalScore} / {attempt.maxScore}
            </div>
            <div className="text-2xl text-gray-600 mt-2" data-testid="text-percentage">
              {scorePercentage.toFixed(1)}%
            </div>
            <Progress value={scorePercentage} className="mt-4 h-3" />
          </CardContent>
        </Card>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Questions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="text-total-questions">{totalQuestions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Answered</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600" data-testid="text-answered">{answeredQuestions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Correct</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600" data-testid="text-correct">{correctAnswers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Incorrect</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600" data-testid="text-incorrect">
                {answeredQuestions - correctAnswers}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Test Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Status</span>
              <Badge variant={attempt.status === 'completed' ? 'default' : 'destructive'}>
                {attempt.status}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Started At</span>
              <span className="font-medium">
                {new Date(attempt.startedAt).toLocaleString()}
              </span>
            </div>
            {attempt.submittedAt && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Submitted At</span>
                <span className="font-medium">
                  {new Date(attempt.submittedAt).toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Duration</span>
              <span className="font-medium">{attempt.round.duration} minutes</span>
            </div>
          </CardContent>
        </Card>

        {/* Violations (if any) */}
        {(attempt.tabSwitchCount! > 0 || attempt.refreshAttemptCount! > 0) && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <CardTitle>Proctoring Violations</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {attempt.tabSwitchCount! > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Tab Switches</span>
                  <Badge variant="outline" className="bg-white">
                    {attempt.tabSwitchCount}
                  </Badge>
                </div>
              )}
              {attempt.refreshAttemptCount! > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Refresh Attempts</span>
                  <Badge variant="outline" className="bg-white">
                    {attempt.refreshAttemptCount}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Question-wise Results */}
        <Card>
          <CardHeader>
            <CardTitle>Question-wise Results</CardTitle>
            <CardDescription>Detailed breakdown of your answers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {attempt.questions.map((question, index) => {
              const answer = attempt.answers.find(a => a.questionId === question.id);
              const isCorrect = answer?.isCorrect;
              const isAutoGraded = question.questionType === 'multiple_choice' || question.questionType === 'true_false';

              return (
                <div
                  key={question.id}
                  className="p-4 border rounded-lg"
                  data-testid={`card-question-${index + 1}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex-shrink-0">
                        {isCorrect ? (
                          <CheckCircle className="h-6 w-6 text-green-600" data-testid={`icon-correct-${index + 1}`} />
                        ) : isCorrect === false ? (
                          <XCircle className="h-6 w-6 text-red-600" data-testid={`icon-incorrect-${index + 1}`} />
                        ) : (
                          <Clock className="h-6 w-6 text-gray-400" data-testid={`icon-pending-${index + 1}`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          Question {question.questionNumber}: {question.questionText}
                        </div>
                        <Badge variant="outline" className="mt-2">
                          {question.questionType.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Points</div>
                      <div className="font-bold">
                        <span className={isCorrect ? 'text-green-600' : 'text-gray-600'}>
                          {answer?.pointsAwarded || 0}
                        </span>
                        <span className="text-gray-400"> / {question.points}</span>
                      </div>
                    </div>
                  </div>

                  {answer && (
                    <div className="mt-3 pl-9">
                      <div className="text-sm">
                        <span className="text-gray-600">Your Answer: </span>
                        <span className="font-medium">{answer.answer}</span>
                      </div>
                      {isAutoGraded && question.correctAnswer && (
                        <div className="text-sm mt-1">
                          <span className="text-gray-600">Correct Answer: </span>
                          <span className="font-medium text-green-600">{question.correctAnswer}</span>
                        </div>
                      )}
                      {!isAutoGraded && (
                        <div className="text-sm mt-1 text-gray-500 italic">
                          This answer requires manual grading
                        </div>
                      )}
                    </div>
                  )}

                  {!answer && (
                    <div className="mt-3 pl-9">
                      <div className="text-sm text-gray-500 italic">
                        Not answered
                      </div>
                      {isAutoGraded && question.correctAnswer && (
                        <div className="text-sm mt-1">
                          <span className="text-gray-600">Correct Answer: </span>
                          <span className="font-medium text-green-600">{question.correctAnswer}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-center gap-4">
          <Button
            onClick={() => setLocation(`/participant/rounds/${attempt.roundId}/leaderboard`)}
            size="lg"
            variant="default"
            data-testid="button-leaderboard"
          >
            <Trophy className="mr-2 h-5 w-5" />
            See Leaderboard
          </Button>
          <Button
            onClick={() => setLocation('/participant/dashboard')}
            size="lg"
            variant="outline"
            data-testid="button-finish"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </ParticipantLayout>
  );
}
