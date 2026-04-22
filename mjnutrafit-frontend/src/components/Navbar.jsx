import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Home,
  LayoutDashboard,
  FileText,
  TrendingUp,
  Users,
  LogOut,
  Menu,
  X,
  Settings,
  ChevronDown,
  Target,
  ClipboardList,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const Navbar = () => {
  const {
    isAuthenticated,
    userRole,
    logout,
    firstName,
    lastName,
    userEmail,
    profilePicture,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => {
    if (path === "/dashboard" || path === "/coach-dashboard") {
      return (
        location.pathname === "/dashboard" || location.pathname === "/coach-dashboard"
      );
    }
    return location.pathname === path;
  };

  const activityPath = "/activity";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isValidProfilePicture = (url) => {
    return !!(url && typeof url === "string" && url.trim().length > 0);
  };

  const displayLabel = () => {
    if (firstName?.trim() || lastName?.trim()) {
      return [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ");
    }
    if (userEmail && typeof userEmail === "string") {
      const part = userEmail.split("@")[0];
      return part || "Account";
    }
    return "Account";
  };

  if (!isAuthenticated) {
    return (
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link
            to="/"
            className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent"
          >
            MJNutraFit
          </Link>
          <div className="flex gap-4 items-center">
            <Link to="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  const isCoach = userRole === "coach";

  const userDropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-3 py-1.5 h-auto hover:bg-primary/10"
        >
          <Avatar className="w-8 h-8">
            <AvatarImage
              src={
                isValidProfilePicture(profilePicture) ? profilePicture : undefined
              }
              alt={displayLabel()}
            />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
              {firstName?.[0]?.toUpperCase() ||
                lastName?.[0]?.toUpperCase() ||
                (userEmail ? userEmail[0]?.toUpperCase() : "U")}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-semibold text-foreground">
            {displayLabel()}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayLabel()}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {userRole === "client" && (
          <DropdownMenuItem asChild>
            <Link
              to="/profile/fitness"
              className={cn(
                "cursor-pointer flex items-center",
                location.pathname === "/profile/fitness" && "bg-accent"
              )}
            >
              <Target className="mr-2 h-4 w-4" />
              <span>Your Goal</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link
            to="/profile"
            className={cn(
              "cursor-pointer flex items-center",
              isActive("/profile") && "bg-accent"
            )}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Profile Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link
            to={isCoach ? "/coach-dashboard" : "/dashboard"}
            className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent flex items-center gap-2"
          >
            <Home className="w-6 h-6" />
            MJNutraFit
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link to={isCoach ? "/coach-dashboard" : "/dashboard"}>
              <Button
                variant={
                  isActive(isCoach ? "/coach-dashboard" : "/dashboard")
                    ? "default"
                    : "ghost"
                }
                className="flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Button>
            </Link>
            <Link to="/plans">
              <Button
                variant={isActive("/plans") ? "default" : "ghost"}
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Plans
              </Button>
            </Link>
            {userRole === "client" && (
              <Link to="/ai-coach">
                <Button
                  variant={isActive("/ai-coach") ? "default" : "ghost"}
                  className="flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  AI Coach
                </Button>
              </Link>
            )}
            <Link to={activityPath}>
              <Button
                variant={isActive(activityPath) ? "default" : "ghost"}
                className="flex items-center gap-2"
              >
                <ClipboardList className="w-4 h-4" />
                {isCoach ? "Activity" : "My activity"}
              </Button>
            </Link>
            <Link to="/progress">
              <Button
                variant={isActive("/progress") ? "default" : "ghost"}
                className="flex items-center gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                {isCoach ? "Review Progress" : "My Progress"}
              </Button>
            </Link>
            {isCoach && (
              <Link to="/coach-dashboard">
                <Button
                  variant={isActive("/coach-dashboard") ? "default" : "ghost"}
                  className="flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  My Clients
                </Button>
              </Link>
            )}
            {userDropdown}
          </div>

          <Button
            variant="ghost"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t pt-4 space-y-2">
            <Link
              to={isCoach ? "/coach-dashboard" : "/dashboard"}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Button
                variant={
                  isActive(isCoach ? "/coach-dashboard" : "/dashboard")
                    ? "default"
                    : "ghost"
                }
                className="w-full justify-start flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Button>
            </Link>
            <Link to="/plans" onClick={() => setMobileMenuOpen(false)}>
              <Button
                variant={isActive("/plans") ? "default" : "ghost"}
                className="w-full justify-start flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Plans
              </Button>
            </Link>
            {userRole === "client" && (
              <Link to="/ai-coach" onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant={isActive("/ai-coach") ? "default" : "ghost"}
                  className="w-full justify-start flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  AI Coach
                </Button>
              </Link>
            )}
            <Link to={activityPath} onClick={() => setMobileMenuOpen(false)}>
              <Button
                variant={isActive(activityPath) ? "default" : "ghost"}
                className="w-full justify-start flex items-center gap-2"
              >
                <ClipboardList className="w-4 h-4" />
                {isCoach ? "Activity" : "My activity"}
              </Button>
            </Link>
            <Link to="/progress" onClick={() => setMobileMenuOpen(false)}>
              <Button
                variant={isActive("/progress") ? "default" : "ghost"}
                className="w-full justify-start flex items-center gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                {isCoach ? "Review Progress" : "My Progress"}
              </Button>
            </Link>
            {isCoach && (
              <Link to="/coach-dashboard" onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant={isActive("/coach-dashboard") ? "default" : "ghost"}
                  className="w-full justify-start flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  My Clients
                </Button>
              </Link>
            )}
            <div className="flex items-center gap-3 px-3 py-3 mb-2 border-b border-border bg-primary/5 rounded-md">
              <Avatar className="w-10 h-10">
                <AvatarImage
                  src={
                    isValidProfilePicture(profilePicture)
                      ? profilePicture
                      : undefined
                  }
                  alt={displayLabel()}
                />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-base">
                  {firstName?.[0]?.toUpperCase() ||
                    lastName?.[0]?.toUpperCase() ||
                    (userEmail ? userEmail[0]?.toUpperCase() : "U")}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-foreground truncate">
                  {displayLabel()}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {userEmail}
                </span>
              </div>
            </div>
            <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
              <Button
                variant={isActive("/profile") ? "default" : "ghost"}
                className="w-full justify-start flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Profile Settings
              </Button>
            </Link>
            <Button
              variant="ghost"
              className="w-full justify-start flex items-center gap-2 text-destructive hover:text-destructive"
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
