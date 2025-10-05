import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import ParticipantLayout from '@/components/layouts/ParticipantLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, Clock, Users, ArrowRight } from 'lucide-react';
import type { Event } from '@shared/schema';

export default function ParticipantEventsPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const filteredEvents = events?.filter(event => 
    event.status === 'active' && 
    (event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     event.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  return (
    <ParticipantLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="heading-browse-events">
            Browse Events
          </h1>
          <p className="text-gray-600 mt-1">Discover available symposium events</p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search events by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-events"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12" data-testid="loading-events">
            Loading events...
          </div>
        ) : filteredEvents.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-600" data-testid="no-events">
                  {searchQuery ? 'No events match your search' : 'No active events available'}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {searchQuery ? 'Try adjusting your search terms' : 'Check back later for upcoming events'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event) => (
              <Card key={event.id} className="hover:shadow-lg transition-shadow" data-testid={`card-event-${event.id}`}>
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-xl" data-testid={`text-event-name-${event.id}`}>
                      {event.name}
                    </CardTitle>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {event.description || 'No description available'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>
                        {event.startDate 
                          ? new Date(event.startDate).toLocaleDateString()
                          : 'Date TBA'}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>
                        {event.endDate
                          ? `Ends ${new Date(event.endDate).toLocaleDateString()}`
                          : 'Duration TBA'}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="h-4 w-4 mr-2" />
                      <span className="capitalize">{event.type || 'General'} Event</span>
                    </div>
                    <Button
                      onClick={() => setLocation(`/participant/events/${event.id}`)}
                      className="w-full mt-4"
                      data-testid={`button-view-${event.id}`}
                    >
                      View Details
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ParticipantLayout>
  );
}
