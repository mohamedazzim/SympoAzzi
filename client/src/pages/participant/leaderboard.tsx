import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import ParticipantLayout from '@/components/layouts/ParticipantLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Trophy, Medal, Award, Clock } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  totalScore: number;
  maxScore?: number;
  submittedAt: Date;
}

export default function LeaderboardPage() {
  const { roundId, eventId } = useParams();
  const [, setLocation] = useLocation();

  const { data: leaderboard, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: roundId ? ['/api/rounds', roundId, 'leaderboard'] : ['/api/events', eventId, 'leaderboard'],
    enabled: !!(roundId || eventId),
  });

  if (isLoading) {
    return (
      <ParticipantLayout>
        <div className="p-8">
          <div className="text-center py-12" data-testid="loading-leaderboard">Loading leaderboard...</div>
        </div>
      </ParticipantLayout>
    );
  }

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <ParticipantLayout>
        <div className="p-8 max-w-6xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Card>
            <CardContent className="text-center py-12">
              <Trophy className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600">No results available yet</p>
            </CardContent>
          </Card>
        </div>
      </ParticipantLayout>
    );
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" data-testid={`icon-rank-1`} />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" data-testid={`icon-rank-2`} />;
    if (rank === 3) return <Award className="h-6 w-6 text-amber-600" data-testid={`icon-rank-3`} />;
    return <span className="text-gray-600 font-medium w-6 text-center" data-testid={`text-rank-${rank}`}>{rank}</span>;
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (rank === 2) return 'bg-gray-100 text-gray-800 border-gray-300';
    if (rank === 3) return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-white text-gray-800 border-gray-200';
  };

  return (
    <ParticipantLayout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="h-8 w-8 text-yellow-500" />
            <h1 className="text-3xl font-bold text-gray-900" data-testid="heading-leaderboard">
              Leaderboard
            </h1>
          </div>
          <p className="text-gray-600">
            {roundId ? 'Round Rankings' : 'Event Rankings'} • {leaderboard.length} Participants
          </p>
        </div>

        {/* Top 3 Podium */}
        {leaderboard.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* 2nd Place */}
            <Card className="mt-8 bg-gray-50 border-2 border-gray-300" data-testid="card-podium-2">
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-2">
                  <Medal className="h-12 w-12 text-gray-400" />
                </div>
                <CardTitle className="text-lg">2nd Place</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="font-semibold text-gray-900 mb-1" data-testid="text-podium-2-name">{leaderboard[1].userName}</p>
                <p className="text-2xl font-bold text-gray-700" data-testid="text-podium-2-score">
                  {leaderboard[1].totalScore}
                  {leaderboard[1].maxScore && <span className="text-sm text-gray-500"> / {leaderboard[1].maxScore}</span>}
                </p>
              </CardContent>
            </Card>

            {/* 1st Place */}
            <Card className="bg-yellow-50 border-2 border-yellow-400" data-testid="card-podium-1">
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-2">
                  <Trophy className="h-16 w-16 text-yellow-500" />
                </div>
                <CardTitle className="text-xl">1st Place</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="font-semibold text-gray-900 mb-1 text-lg" data-testid="text-podium-1-name">{leaderboard[0].userName}</p>
                <p className="text-3xl font-bold text-yellow-600" data-testid="text-podium-1-score">
                  {leaderboard[0].totalScore}
                  {leaderboard[0].maxScore && <span className="text-sm text-gray-500"> / {leaderboard[0].maxScore}</span>}
                </p>
              </CardContent>
            </Card>

            {/* 3rd Place */}
            <Card className="mt-8 bg-amber-50 border-2 border-amber-400" data-testid="card-podium-3">
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-2">
                  <Award className="h-12 w-12 text-amber-600" />
                </div>
                <CardTitle className="text-lg">3rd Place</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="font-semibold text-gray-900 mb-1" data-testid="text-podium-3-name">{leaderboard[2].userName}</p>
                <p className="text-2xl font-bold text-amber-700" data-testid="text-podium-3-score">
                  {leaderboard[2].totalScore}
                  {leaderboard[2].maxScore && <span className="text-sm text-gray-500"> / {leaderboard[2].maxScore}</span>}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Full Leaderboard Table */}
        <Card>
          <CardHeader>
            <CardTitle>Complete Rankings</CardTitle>
            <CardDescription>Ranked by score, then by submission time (earlier submissions rank higher)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Rank</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((entry) => (
                  <TableRow 
                    key={entry.userId} 
                    className={entry.rank <= 3 ? 'bg-gray-50' : ''}
                    data-testid={`row-participant-${entry.rank}`}
                  >
                    <TableCell>
                      <div className="flex items-center justify-center">
                        <Badge 
                          variant="outline" 
                          className={`${getRankBadgeColor(entry.rank)} flex items-center gap-1 px-3 py-1`}
                        >
                          {getRankIcon(entry.rank)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium" data-testid={`text-name-${entry.rank}`}>
                      {entry.userName}
                    </TableCell>
                    <TableCell className="text-right font-semibold" data-testid={`text-score-${entry.rank}`}>
                      {entry.totalScore}
                      {entry.maxScore && <span className="text-gray-500 text-sm font-normal"> / {entry.maxScore}</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm text-gray-600" data-testid={`text-time-${entry.rank}`}>
                      <div className="flex items-center justify-end gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(entry.submittedAt).toLocaleString()}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-center">
          <Button
            onClick={() => setLocation('/participant/dashboard')}
            size="lg"
            data-testid="button-dashboard"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </ParticipantLayout>
  );
}
