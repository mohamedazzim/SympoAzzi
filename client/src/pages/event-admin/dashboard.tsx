import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import EventAdminLayout from '@/components/layouts/EventAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Play, Users, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Event } from '@shared/schema';

interface MyEventResponse {
  event: Event;
  participantCount: number;
}

export default function EventAdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<MyEventResponse>({
    queryKey: ['/api/event-admin/my-event'],
  });

  if (isLoading) {
    return (
      <EventAdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your event...</p>
          </div>
        </div>
      </EventAdminLayout>
    );
  }

  if (!data || !data.event) {
    return (
      <EventAdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Event Assigned</h2>
            <p className="text-gray-600">You have not been assigned to any event yet.</p>
            <p className="text-gray-600 mt-1">Please contact your administrator.</p>
          </div>
        </div>
      </EventAdminLayout>
    );
  }

  const { event, participantCount } = data;

  return (
    <EventAdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-12">
            <h1 
              className="text-5xl font-bold text-gray-900 mb-4"
              data-testid="text-event-name"
            >
              {event.name}
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {event.description}
            </p>
            <div className="mt-6 inline-flex items-center px-4 py-2 rounded-full bg-indigo-100 text-indigo-800">
              <span className="text-sm font-medium">
                Status: <span className="font-bold capitalize">{event.status}</span>
              </span>
            </div>
          </div>

          {/* Stats Card */}
          <Card className="mb-8 border-2 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
              <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                <Users className="h-6 w-6 text-indigo-600" />
                <span>Participant Statistics</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="py-8">
              <div className="text-center">
                <div 
                  className="text-6xl font-bold text-indigo-600 mb-2"
                  data-testid="text-participant-count"
                >
                  {participantCount}
                </div>
                <p className="text-xl text-gray-600">Total Participants</p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Manage Settings Button */}
            <Card 
              className="cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-2 hover:border-indigo-400"
              onClick={() => setLocation(`/event-admin/events/${event.id}`)}
            >
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 mb-6 shadow-lg">
                    <Settings className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Manage Settings
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Configure event details, rules, and participant management
                  </p>
                  <Button 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 text-lg font-semibold"
                    data-testid="button-manage-settings"
                  >
                    Open Settings
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Test Control Button */}
            <Card 
              className="cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-2 hover:border-purple-400"
              onClick={() => setLocation(`/event-admin/events/${event.id}/rounds`)}
            >
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 mb-6 shadow-lg">
                    <Play className="h-10 w-10 text-white ml-1" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Test Control
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Manage rounds, questions, and monitor test progress
                  </p>
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 text-lg font-semibold"
                    data-testid="button-test-control"
                  >
                    Manage Tests
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Event Info Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Event Type: <span className="font-semibold capitalize">{event.type}</span>
              {' • '}
              Category: <span className="font-semibold capitalize">{event.category.replace('_', ' ')}</span>
            </p>
          </div>
        </div>
      </div>
    </EventAdminLayout>
  );
}
