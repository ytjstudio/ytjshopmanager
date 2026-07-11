import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import ActivationModal from "./ActivationModal";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Store,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Package, label: "Inventory", href: "/inventory" },
  { icon: ShoppingCart, label: "New Sale", href: "/sale" },
  { icon: BarChart3, label: "Sales Report", href: "/sales" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, isAdmin, signOut, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false);

  const isPending = profile?.status === "pending" && !isAdmin;

  useEffect(() => {
    if (!loading && isPending) {
      setShowActivationModal(true);
    }
  }, [isPending, loading]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Store className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">Ruto Shop</span>
          </div>
        </div>
        
        {isPending && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowActivationModal(true)}
            className="text-warning border-warning/50"
          >
            <AlertCircle className="h-4 w-4 mr-1" />
            Activate
          </Button>
        )}
      </header>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border z-50 transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-border">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Store className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">Ruto Shop</h1>
              <p className="text-xs text-muted-foreground">Manager</p>
            </div>
          </div>

          {/* Business Info */}
          {profile && (
            <div className="px-4 py-4 border-b border-border">
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="font-medium text-sm truncate">{profile.business_name}</p>
                <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                {isPending && (
                  <div className="mt-2 flex items-center gap-1 text-warning text-xs">
                    <AlertCircle className="h-3 w-3" />
                    Pending activation
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              const isDisabled = isPending && item.href !== "/dashboard" && item.href !== "/settings";

              return (
                <Link
                  key={item.href}
                  to={isDisabled ? "#" : item.href}
                  onClick={(e) => {
                    if (isDisabled) {
                      e.preventDefault();
                      setShowActivationModal(true);
                    }
                    setSidebarOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    isDisabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                  {isDisabled && <AlertCircle className="h-4 w-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          {/* Sign Out */}
          <div className="p-4 border-t border-border">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>

      {/* Activation Modal */}
      <ActivationModal
        open={showActivationModal}
        onOpenChange={setShowActivationModal}
      />
    </div>
  );
}
