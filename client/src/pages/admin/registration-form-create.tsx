import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocation } from "wouter";
import { Plus, Trash2, Check, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/layouts/AdminLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { nanoid } from "nanoid";
import type { Event, RegistrationForm } from "@shared/schema";

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number';
  required: boolean;
  placeholder?: string;
}

export default function RegistrationFormCreatePage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [formFields, setFormFields] = useState<FormField[]>([
    { id: nanoid(), label: 'Full Name', type: 'text', required: true, placeholder: 'Enter your full name' },
    { id: nanoid(), label: 'Email', type: 'email', required: true, placeholder: 'your.email@example.com' },
  ]);
  const [createdForm, setCreatedForm] = useState<RegistrationForm | null>(null);

  const { data: events } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const createFormMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/registration-forms', { 
        title, 
        description, 
        formFields 
      });
      const form = await response.json();
      return form;
    },
    onSuccess: (data) => {
      setCreatedForm(data);
      queryClient.invalidateQueries({ queryKey: ['/api/registration-forms/all'] });
      toast({
        title: "Success",
        description: "Registration form created successfully",
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

  const addField = () => {
    setFormFields([...formFields, {
      id: nanoid(),
      label: '',
      type: 'text',
      required: false,
      placeholder: ''
    }]);
  };

  const removeField = (id: string) => {
    setFormFields(formFields.filter(f => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFormFields(formFields.map(f => 
      f.id === id ? { ...f, ...updates } : f
    ));
  };

  const handleCreate = () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a form title",
        variant: "destructive",
      });
      return;
    }

    if (formFields.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one field",
        variant: "destructive",
      });
      return;
    }

    const hasEmptyLabels = formFields.some(f => !f.label.trim());
    if (hasEmptyLabels) {
      toast({
        title: "Error",
        description: "All fields must have a label",
        variant: "destructive",
      });
      return;
    }

    createFormMutation.mutate();
  };

  const copyLink = () => {
    if (createdForm) {
      const link = `${window.location.origin}/register/${createdForm.formSlug}`;
      navigator.clipboard.writeText(link);
      toast({
        title: "Link copied",
        description: "Registration form link copied to clipboard",
      });
    }
  };

  if (!events || events.length === 0) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle>No Events Available</CardTitle>
              <CardDescription>
                You need to create at least one event before creating a registration form.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setLocation('/admin/events/create')} data-testid="button-create-event">
                Create Event
              </Button>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  if (createdForm) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6 max-w-3xl" data-testid="page-form-created">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" data-testid="heading-success">
                <Check className="h-6 w-6 text-green-600" />
                Registration Form Created Successfully
              </CardTitle>
              <CardDescription>Share this link with participants to register for events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="font-semibold text-sm">Shareable Link:</label>
                <div className="mt-2 p-3 bg-muted rounded-md break-all font-mono text-sm" data-testid="text-shareable-link">
                  {window.location.origin}/register/{createdForm.formSlug}
                </div>
              </div>

              <div>
                <label className="font-semibold text-sm">Form Title:</label>
                <p className="mt-1 text-lg">{createdForm.title}</p>
              </div>

              {createdForm.description && (
                <div>
                  <label className="font-semibold text-sm">Description:</label>
                  <p className="mt-1 text-muted-foreground">{createdForm.description}</p>
                </div>
              )}

              <div>
                <label className="font-semibold text-sm">Form Fields ({formFields.length}):</label>
                <div className="mt-2 space-y-2">
                  {formFields.map((field) => (
                    <div key={field.id} className="p-3 bg-muted/50 rounded-md" data-testid={`field-${field.id}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{field.label}</span>
                        <span className="text-sm text-muted-foreground capitalize">
                          {field.type} {field.required && '• Required'}
                        </span>
                      </div>
                      {field.placeholder && (
                        <p className="text-xs text-muted-foreground mt-1">Placeholder: {field.placeholder}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={copyLink} data-testid="button-copy-link">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
                <Button variant="outline" onClick={() => setLocation('/admin/registration-forms')} data-testid="button-view-all">
                  View All Forms
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 max-w-6xl" data-testid="page-create-form">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2" data-testid="heading-create-form">Create Registration Form</h1>
          <p className="text-muted-foreground">Design a custom registration form for your symposium events</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Form Details</CardTitle>
                <CardDescription>Set the title and description for your registration form</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Form Title *</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., 2025 Symposium Registration"
                    className="text-lg"
                    data-testid="input-title"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide additional information about the registration process..."
                    className="min-h-[80px]"
                    data-testid="input-description"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Form Fields</CardTitle>
                <CardDescription>Add and configure fields for collecting participant information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formFields.map((field, index) => (
                  <Card key={field.id} className="border-2" data-testid={`field-card-${field.id}`}>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Field Label *</label>
                            <Input
                              value={field.label}
                              onChange={(e) => updateField(field.id, { label: e.target.value })}
                              placeholder="e.g., Full Name"
                              data-testid={`input-label-${field.id}`}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Field Type</label>
                              <Select 
                                value={field.type} 
                                onValueChange={(value: any) => updateField(field.id, { type: value })}
                              >
                                <SelectTrigger data-testid={`select-type-${field.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Text</SelectItem>
                                  <SelectItem value="email">Email</SelectItem>
                                  <SelectItem value="tel">Phone</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Placeholder (Optional)</label>
                              <Input
                                value={field.placeholder || ''}
                                onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                                placeholder="Enter placeholder..."
                                data-testid={`input-placeholder-${field.id}`}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`required-${field.id}`}
                              checked={field.required}
                              onCheckedChange={(checked) => updateField(field.id, { required: !!checked })}
                              data-testid={`checkbox-required-${field.id}`}
                            />
                            <label 
                              htmlFor={`required-${field.id}`}
                              className="text-sm font-medium cursor-pointer"
                            >
                              Required field
                            </label>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeField(field.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          data-testid={`button-delete-${field.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button
                  onClick={addField}
                  variant="outline"
                  className="w-full border-dashed border-2"
                  data-testid="button-add-field"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </Button>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                onClick={handleCreate}
                disabled={createFormMutation.isPending}
                className="flex-1"
                data-testid="button-create"
              >
                {createFormMutation.isPending ? 'Creating...' : 'Create Registration Form'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation('/admin/registration-forms')}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-6">
              <Card>
                <CardHeader className="bg-blue-50 dark:bg-blue-950">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    Live Preview
                  </CardTitle>
                  <CardDescription>How participants will see the form</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6 min-h-[400px]">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="text-xl font-semibold" data-testid="preview-title">
                      {title || 'Form Title Will Appear Here'}
                    </h3>
                    {description && (
                      <p className="text-sm text-muted-foreground mt-2" data-testid="preview-description">
                        {description}
                      </p>
                    )}
                    {!description && (
                      <p className="text-sm text-muted-foreground mt-2 italic">
                        Add a description to show here
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 pt-4">
                    {formFields.length > 0 ? (
                      formFields.map((field) => (
                        <div key={field.id} className="space-y-1" data-testid={`preview-field-${field.id}`}>
                          <label className="text-sm font-medium block">
                            {field.label || 'Field Label'} {field.required && <span className="text-destructive">*</span>}
                          </label>
                          <Input
                            type={field.type}
                            placeholder={field.placeholder || `Enter ${field.label || 'value'}...`}
                            disabled
                            className="bg-muted/50 border-2"
                          />
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm italic">No fields added yet</p>
                        <p className="text-xs mt-1">Click "Add Field" to start building your form</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      ℹ️ This is a live preview. Changes appear instantly.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
