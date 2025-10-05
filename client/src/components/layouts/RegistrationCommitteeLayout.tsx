import { Link, useLocation } from "wouter";
import { ClipboardList, Home, LogOut, UserPlus, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useWebSocket } from "@/contexts/WebSocketContext";

export default function RegistrationCommitteeLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { isConnected } = useWebSocket();

  const isActive = (path: string) => location === path;

  return (
    <div className="flex min-h-screen" data-testid="layout-registration-committee">
      <aside className="w-64 border-r bg-muted/40 p-4" data-testid="sidebar">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold" data-testid="sidebar-title">Registration Committee</h2>
            {isConnected && (
              <Badge variant="outline" data-testid="badge-websocket-connected">
                <Circle className="w-2 h-2 mr-1 fill-green-500 text-green-500" />
                Live
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground" data-testid="sidebar-subtitle">
            {user?.fullName}
          </p>
        </div>
        
        <nav className="space-y-2" data-testid="nav">
          <Link href="/registration-committee/dashboard">
            <Button
              variant={isActive("/registration-committee/dashboard") ? "default" : "ghost"}
              className="w-full justify-start"
              data-testid="link-dashboard"
            >
              <Home className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          
          <Link href="/registration-committee/registrations">
            <Button
              variant={isActive("/registration-committee/registrations") ? "default" : "ghost"}
              className="w-full justify-start"
              data-testid="link-registrations"
            >
              <ClipboardList className="mr-2 h-4 w-4" />
              Registrations
            </Button>
          </Link>

          <Link href="/registration-committee/on-spot-registration">
            <Button
              variant={isActive("/registration-committee/on-spot-registration") ? "default" : "ghost"}
              className="w-full justify-start"
              data-testid="link-on-spot-registration"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              On-Spot Registration
            </Button>
          </Link>
        </nav>

        <div className="mt-auto pt-6">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={logout}
            data-testid="button-logout"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>
      
      <main className="flex-1" data-testid="main-content">
        {children}
      </main>
    </div>
  );
}
