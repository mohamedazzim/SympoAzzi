import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { RegistrationForm, Event } from "@shared/schema";

interface EventWithRounds extends Event {
  rounds?: Array<{ startTime: Date; endTime: Date }>;
}

export default function PublicRegistrationFormPage() {
  const { toast } = useToast();
  const [, params] = useRoute("/register/:slug");
  const slug = params?.slug || "";
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  const [selectedNonTech, setSelectedNonTech] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const { data: form, isLoading: isLoadingForm } = useQuery<RegistrationForm>({
    queryKey: [`/api/registration-forms/${slug}`],
    enabled: !!slug,
  });

  const { data: events, isLoading: isLoadingEvents } = useQuery<EventWithRounds[]>({
    queryKey: ['/api/events/for-registration'],
    enabled: !!form && form.isActive,
  });

  const submitMutation = useMutation({
    mutationFn: async (payload: { submittedData: Record<string, string>; selectedEvents: string[] }) => {
      await apiRequest('POST', `/api/registration-forms/${slug}/submit`, payload);
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Success",
        description: "Your registration has been submitted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const technicalEvents = events?.filter(e => e.category === 'technical') || [];
  const nonTechnicalEvents = events?.filter(e => e.category === 'non_technical') || [];

  const hasTimeOverlap = (event1Id: string, event2Id: string): boolean => {
    if (!events) return false;
    
    const e1 = events.find(e => e.id === event1Id);
    const e2 = events.find(e => e.id === event2Id);
    
    if (!e1 || !e2 || !e1.rounds || !e2.rounds) return false;

    for (const r1 of e1.rounds) {
      for (const r2 of e2.rounds) {
        const start1 = new Date(r1.startTime);
        const end1 = new Date(r1.endTime);
        const start2 = new Date(r2.startTime);
        const end2 = new Date(r2.endTime);
        
        if (start1 < end2 && start2 < end1) {
          return true;
        }
      }
    }
    
    return false;
  };

  const isEventDisabled = (eventId: string, category: 'technical' | 'non_technical'): boolean => {
    const otherSelected = category === 'technical' ? selectedNonTech : selectedTech;
    if (!otherSelected) return false;
    
    return hasTimeOverlap(eventId, otherSelected);
  };

  const formatEventTime = (event: EventWithRounds): string => {
    if (!event.rounds || event.rounds.length === 0) return 'Time TBA';
    
    const firstRound = event.rounds[0];
    const startDate = new Date(firstRound.startTime);
    const endDate = new Date(firstRound.endTime);
    
    return `${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form) return;

    const errors: string[] = [];
    
    form.formFields.forEach((field) => {
      const value = formData[field.id]?.trim();
      
      if (field.required && !value) {
        errors.push(`${field.label} is required`);
        return;
      }

      if (value) {
        if (field.type === 'email' && !validateEmail(value)) {
          errors.push(`Please enter a valid email address for ${field.label}`);
        }
        
        if (field.type === 'tel' && !validatePhone(value)) {
          errors.push(`Please enter a valid 10-digit mobile number for ${field.label}`);
        }
      }
    });

    const selectedEvents = [selectedTech, selectedNonTech].filter(Boolean) as string[];
    
    if (selectedEvents.length === 0) {
      errors.push("Please select at least one event");
    }

    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors.join(", "),
        variant: "destructive",
      });
      return;
    }

    submitMutation.mutate({ submittedData: formData, selectedEvents });
  };

  const handleChange = (fieldId: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  if (isLoadingForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30" data-testid="loading-form">
        <div className="text-center">
          <p className="text-lg">Loading registration form...</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30" data-testid="form-not-found">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-lg font-medium">Registration form not found</p>
            <p className="text-sm text-muted-foreground mt-2">
              The registration link you followed may be invalid or expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!form.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30" data-testid="form-inactive">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <p className="text-lg font-medium">Registration Currently Unavailable</p>
            <p className="text-sm text-muted-foreground mt-2">
              This registration form is currently inactive. Please check back later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30" data-testid="success-page">
        <Card className="max-w-lg">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-20 w-20 text-green-600 mx-auto mb-4" data-testid="success-icon" />
            <h2 className="text-3xl font-bold mb-3" data-testid="success-title">Registration Submitted!</h2>
            <p className="text-muted-foreground mb-4" data-testid="success-message">
              Thank you for registering. Your application is now pending approval from the registration committee.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-left">
              <p className="font-semibold mb-2">What happens next?</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Your registration will be reviewed by the registration committee</li>
                <li>• Login credentials will be provided to you after approval</li>
                <li>• Please contact the organizing team for updates on your registration status</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 py-8" data-testid="page-registration-form">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <Card className="border-2">
          <CardHeader className="space-y-3">
            <CardTitle className="text-3xl" data-testid="form-title">{form.title}</CardTitle>
            {form.description && (
              <CardDescription className="text-base" data-testid="form-description">
                {form.description}
              </CardDescription>
            )}
          </CardHeader>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Personal Information</CardTitle>
              <CardDescription>Please fill in your details below</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.formFields.map((field) => (
                <div key={field.id} className="space-y-2" data-testid={`field-${field.id}`}>
                  <Label htmlFor={field.id} className="text-sm font-medium">
                    {field.label} {field.required && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    id={field.id}
                    type={field.type}
                    placeholder={field.placeholder || ''}
                    value={formData[field.id] || ""}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    required={field.required}
                    data-testid={`input-${field.id}`}
                    className="max-w-xl"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {isLoadingEvents ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">Loading available events...</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Event Selection</CardTitle>
                <CardDescription>
                  Choose the events you'd like to participate in. You can select one technical and one non-technical event.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {technicalEvents.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">Technical Events</h3>
                      <Badge variant="secondary">Select 1</Badge>
                    </div>
                    <RadioGroup value={selectedTech || ''} onValueChange={setSelectedTech}>
                      <div className="space-y-3">
                        {technicalEvents.map((event) => {
                          const disabled = isEventDisabled(event.id, 'technical');
                          return (
                            <div
                              key={event.id}
                              className={`border rounded-lg p-4 transition-colors ${
                                selectedTech === event.id ? 'border-primary bg-primary/5' : 
                                disabled ? 'border-muted bg-muted/30 opacity-60' : 
                                'border-border hover:border-primary/50'
                              }`}
                              data-testid={`event-${event.id}`}
                            >
                              <div className="flex items-start gap-3">
                                <RadioGroupItem 
                                  value={event.id} 
                                  id={`tech-${event.id}`}
                                  disabled={disabled}
                                  data-testid={`radio-tech-${event.id}`}
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  <Label
                                    htmlFor={`tech-${event.id}`}
                                    className={`font-semibold text-base ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                  >
                                    {event.name}
                                  </Label>
                                  {event.description && (
                                    <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-2">📅 {formatEventTime(event)}</p>
                                  {disabled && (
                                    <p className="text-xs text-destructive mt-2">⚠️ Time conflict with selected event</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {nonTechnicalEvents.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">Non-Technical Events</h3>
                      <Badge variant="secondary">Select 1</Badge>
                    </div>
                    <RadioGroup value={selectedNonTech || ''} onValueChange={setSelectedNonTech}>
                      <div className="space-y-3">
                        {nonTechnicalEvents.map((event) => {
                          const disabled = isEventDisabled(event.id, 'non_technical');
                          return (
                            <div
                              key={event.id}
                              className={`border rounded-lg p-4 transition-colors ${
                                selectedNonTech === event.id ? 'border-primary bg-primary/5' : 
                                disabled ? 'border-muted bg-muted/30 opacity-60' : 
                                'border-border hover:border-primary/50'
                              }`}
                              data-testid={`event-${event.id}`}
                            >
                              <div className="flex items-start gap-3">
                                <RadioGroupItem 
                                  value={event.id} 
                                  id={`nontech-${event.id}`}
                                  disabled={disabled}
                                  data-testid={`radio-nontech-${event.id}`}
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  <Label
                                    htmlFor={`nontech-${event.id}`}
                                    className={`font-semibold text-base ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                  >
                                    {event.name}
                                  </Label>
                                  {event.description && (
                                    <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-2">📅 {formatEventTime(event)}</p>
                                  {disabled && (
                                    <p className="text-xs text-destructive mt-2">⚠️ Time conflict with selected event</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {technicalEvents.length === 0 && nonTechnicalEvents.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No events are currently available for registration.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="submit"
              size="lg"
              disabled={submitMutation.isPending || isLoadingEvents}
              data-testid="button-submit"
              className="min-w-[200px]"
            >
              {submitMutation.isPending ? 'Submitting...' : 'Submit Registration'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
