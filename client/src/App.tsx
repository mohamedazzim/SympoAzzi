import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import AdminDashboard from "@/pages/admin/dashboard";
import EventsPage from "@/pages/admin/events";
import EventCreatePage from "@/pages/admin/event-create";
import EventEditPage from "@/pages/admin/event-edit";
import EventDetailsPage from "@/pages/admin/event-details";
import EventAdminsPage from "@/pages/admin/event-admins";
import EventAdminCreatePage from "@/pages/admin/event-admin-create";
import EventAdminEditPage from "@/pages/admin/event-admin-edit";
import ReportsPage from "@/pages/admin/reports";
import ReportGenerateEventPage from "@/pages/admin/report-generate-event";
import ReportGenerateSymposiumPage from "@/pages/admin/report-generate-symposium";
import DownloadReportsPage from "@/pages/reports";
import EventAdminDashboard from "@/pages/event-admin/dashboard";
import EventAdminEventsPage from "@/pages/event-admin/events";
import EventAdminEventDetailsPage from "@/pages/event-admin/event-details";
import EventRulesPage from "@/pages/event-admin/event-rules";
import EventRoundsPage from "@/pages/event-admin/event-rounds";
import RoundCreatePage from "@/pages/event-admin/round-create";
import RoundEditPage from "@/pages/event-admin/round-edit";
import RoundQuestionsPage from "@/pages/event-admin/round-questions";
import RoundRulesPage from "@/pages/event-admin/round-rules";
import QuestionCreatePage from "@/pages/event-admin/question-create";
import QuestionsBulkUploadPage from "@/pages/event-admin/questions-bulk-upload";
import EventParticipantsPage from "@/pages/event-admin/event-participants";
import AllParticipantsPage from "@/pages/event-admin/all-participants";
import ParticipantDashboard from "@/pages/participant/dashboard";
import ParticipantEventsPage from "@/pages/participant/events";
import ParticipantEventDetailsPage from "@/pages/participant/event-details";
import TakeTestPage from "@/pages/participant/take-test";
import TestResultsPage from "@/pages/participant/test-results";
import MyTestsPage from "@/pages/participant/my-tests";
import LeaderboardPage from "@/pages/participant/leaderboard";
import RegistrationFormsPage from "@/pages/admin/registration-forms";
import RegistrationFormCreatePage from "@/pages/admin/registration-form-create";
import AdminRegistrationsPage from "@/pages/admin/registrations";
import RegistrationCommitteePage from "@/pages/admin/registration-committee";
import RegistrationCommitteeCreatePage from "@/pages/admin/registration-committee-create";
import RegistrationCommitteeDashboard from "@/pages/registration-committee/dashboard";
import RegistrationCommitteeRegistrationsPage from "@/pages/registration-committee/registrations";
import OnSpotRegistrationPage from "@/pages/registration-committee/on-spot-registration";
import PublicRegistrationFormPage from "@/pages/public/registration-form";
import SuperAdminOverridesPage from "@/pages/admin/super-admin-overrides";
import EmailLogsPage from "@/pages/admin/email-logs";
import AdminSettingsPage from "@/pages/admin/settings";

function ProtectedRoute({ 
  component: Component, 
  allowedRoles 
}: { 
  component: () => JSX.Element; 
  allowedRoles?: string[] 
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      <Route path="/">
        {user ? (
          user.role === 'super_admin' ? <Redirect to="/admin/dashboard" /> :
          user.role === 'event_admin' ? <Redirect to="/event-admin/dashboard" /> :
          user.role === 'registration_committee' ? <Redirect to="/registration-committee/dashboard" /> :
          <Redirect to="/participant/dashboard" />
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      <Route path="/register/:slug" component={PublicRegistrationFormPage} />

      <Route path="/admin/dashboard">
        <ProtectedRoute component={AdminDashboard} allowedRoles={['super_admin']} />
      </Route>
      <Route path="/admin/events">
        <ProtectedRoute component={EventsPage} allowedRoles={['super_admin']} />
      </Route>
      <Route path="/admin/events/new">
        <ProtectedRoute component={EventCreatePage} allowedRoles={['super_admin']} />
      </Route>
      <Route path="/admin/events/:id/edit">
        <ProtectedRoute component={EventEditPage} allowedRoles={['super_admin']} />
      </Route>
      <Route path="/admin/events/:id">
        <ProtectedRoute component={EventDetailsPage} allowedRoles={['super_admin']} />
      </Route>
      <Route path="/admin/event-admins">
        <ProtectedRoute component={EventAdminsPage} allowedRoles={['super_admin']} />
      </Route>
      <Route path="/admin/event-admins/create">
        <ProtectedRoute component={EventAdminCreatePage} allowedRoles={['super_admin']} />
      </Route>
      <Route path="/admin/event-admins/:id/edit">
        <ProtectedRoute component={EventAdminEditPage} allowedRoles={['super_admin']} />
      </Route>
      <Route path="/admin/reports">
        <ProtectedRoute component={ReportsPage} allowedRoles={['super_admin']} />
      </Route>
      <Route path="/admin/reports/generate/event">
        <ProtectedRoute component={ReportGenerateEventPage} allowedRoles={['super_admin']} />
      </Route>
      <Route path="/admin/reports/generate/symposium">
        <ProtectedRoute component={ReportGenerateSymposiumPage} allowedRoles={['super_admin']} />
      </Route>
      <Route path="/admin/registration-forms">
        <ProtectedRoute component={RegistrationFormsPage} allowedRoles={['super_admin']} />
      </Route>
      <Route path="/admin/registration-forms/create">
        <ProtectedRoute component={RegistrationFormCreatePage} allowedRoles={['super_admin']} />
      </Route>
      <Route path="/admin/registrations">
        <ProtectedRoute component={AdminRegistrationsPage} allowedRoles={['super_admin']} />
      </Route>
      <Route path="/admin/registration-committee">
        <ProtectedRoute component={RegistrationCommitteePage} allowedRoles={['super_admin']} />
      </Route>
      <Route path="/admin/registration-committee/create">
        <ProtectedRoute component={RegistrationCommitteeCreatePage} allowedRoles={['super_admin']} />
      </Route>
      <Route path="/admin/super-admin-overrides">
        <ProtectedRoute component={SuperAdminOverridesPage} allowedRoles={['super_admin']} />
      </Route>
      <Route path="/admin/email-logs">
        <ProtectedRoute component={EmailLogsPage} allowedRoles={['super_admin', 'event_admin']} />
      </Route>
      <Route path="/admin/settings">
        <ProtectedRoute component={AdminSettingsPage} allowedRoles={['super_admin']} />
      </Route>

      <Route path="/registration-committee/dashboard">
        <ProtectedRoute component={RegistrationCommitteeDashboard} allowedRoles={['registration_committee']} />
      </Route>
      <Route path="/registration-committee/registrations">
        <ProtectedRoute component={RegistrationCommitteeRegistrationsPage} allowedRoles={['registration_committee']} />
      </Route>
      <Route path="/registration-committee/on-spot-registration">
        <ProtectedRoute component={OnSpotRegistrationPage} allowedRoles={['registration_committee']} />
      </Route>

      <Route path="/event-admin/dashboard">
        <ProtectedRoute component={EventAdminDashboard} allowedRoles={['event_admin']} />
      </Route>
      <Route path="/event-admin/events">
        <ProtectedRoute component={EventAdminEventsPage} allowedRoles={['event_admin']} />
      </Route>
      <Route path="/event-admin/events/:eventId/rules">
        <ProtectedRoute component={EventRulesPage} allowedRoles={['event_admin']} />
      </Route>
      <Route path="/event-admin/events/:eventId/rounds/new">
        <ProtectedRoute component={RoundCreatePage} allowedRoles={['event_admin']} />
      </Route>
      <Route path="/event-admin/events/:eventId/rounds/:roundId/edit">
        <ProtectedRoute component={RoundEditPage} allowedRoles={['event_admin']} />
      </Route>
      <Route path="/event-admin/events/:eventId/rounds">
        <ProtectedRoute component={EventRoundsPage} allowedRoles={['event_admin']} />
      </Route>
      <Route path="/event-admin/rounds/:roundId/questions/new">
        <ProtectedRoute component={QuestionCreatePage} allowedRoles={['event_admin']} />
      </Route>
      <Route path="/event-admin/rounds/:roundId/questions/bulk-upload">
        <ProtectedRoute component={QuestionsBulkUploadPage} allowedRoles={['event_admin']} />
      </Route>
      <Route path="/event-admin/rounds/:roundId/questions">
        <ProtectedRoute component={RoundQuestionsPage} allowedRoles={['event_admin']} />
      </Route>
      <Route path="/event-admin/rounds/:roundId/rules">
        <ProtectedRoute component={RoundRulesPage} allowedRoles={['event_admin']} />
      </Route>
      <Route path="/event-admin/events/:eventId/participants">
        <ProtectedRoute component={EventParticipantsPage} allowedRoles={['event_admin']} />
      </Route>
      <Route path="/event-admin/events/:eventId">
        <ProtectedRoute component={EventAdminEventDetailsPage} allowedRoles={['event_admin']} />
      </Route>
      <Route path="/event-admin/participants">
        <ProtectedRoute component={AllParticipantsPage} allowedRoles={['event_admin']} />
      </Route>

      <Route path="/reports">
        <ProtectedRoute component={DownloadReportsPage} allowedRoles={['super_admin', 'event_admin']} />
      </Route>

      <Route path="/participant/dashboard">
        <ProtectedRoute component={ParticipantDashboard} allowedRoles={['participant']} />
      </Route>
      <Route path="/participant/rounds/:roundId/test">
        <Redirect to="/participant/dashboard" />
      </Route>
      <Route path="/participant/events/:eventId">
        <ProtectedRoute component={ParticipantEventsPage} allowedRoles={['participant']} />
      </Route>
      <Route path="/participant/events">
        <ProtectedRoute component={ParticipantEventsPage} allowedRoles={['participant']} />
      </Route>
      <Route path="/participant/test/:attemptId">
        <ProtectedRoute component={TakeTestPage} allowedRoles={['participant']} />
      </Route>
      <Route path="/participant/results/:attemptId">
        <ProtectedRoute component={TestResultsPage} allowedRoles={['participant']} />
      </Route>
      <Route path="/participant/my-tests">
        <ProtectedRoute component={MyTestsPage} allowedRoles={['participant']} />
      </Route>
      <Route path="/participant/rounds/:roundId/leaderboard">
        <ProtectedRoute component={LeaderboardPage} allowedRoles={['participant']} />
      </Route>
      <Route path="/participant/events/:eventId/leaderboard">
        <ProtectedRoute component={LeaderboardPage} allowedRoles={['participant']} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WebSocketProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </WebSocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
