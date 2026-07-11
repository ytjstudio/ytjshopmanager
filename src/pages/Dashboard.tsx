import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Package,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Plus,
  ArrowRight,
  BarChart3,
} from "lucide-react";

interface DashboardStats {
  totalItems: number;
  totalSales: number;
  totalRevenue: number;
  todaySales: number;
}

export default function Dashboard() {
  const { profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0,
    totalSales: 0,
    totalRevenue: 0,
    todaySales: 0,
  });

  useEffect(() => {
    if (!loading && !profile) {
      navigate("/auth");
    }
  }, [profile, loading, navigate]);

  useEffect(() => {
    if (profile?.status === "active") {
      fetchStats();
    }
  }, [profile]);

  const fetchStats = async () => {
    if (!profile) return;

    try {
      // Fetch total items
      const { count: itemsCount } = await supabase
        .from("items")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", profile.id);

      // Fetch sales data
      const { data: salesData } = await supabase
        .from("sales")
        .select("total_amount, created_at")
        .eq("profile_id", profile.id);

      const today = new Date().toISOString().split("T")[0];
      const todaySalesData = salesData?.filter(
        (sale) => sale.created_at.split("T")[0] === today
      );

      setStats({
        totalItems: itemsCount || 0,
        totalSales: salesData?.length || 0,
        totalRevenue: salesData?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0,
        todaySales: todaySalesData?.length || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const isActive = profile?.status === "active";

  const statCards = [
    {
      title: "Total Items",
      value: stats.totalItems,
      icon: Package,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      title: "Total Sales",
      value: stats.totalSales,
      icon: ShoppingCart,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Today's Sales",
      value: stats.todaySales,
      icon: TrendingUp,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Total Revenue",
      value: `₦${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {profile?.business_name}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with your business today.
            </p>
          </div>

          {isActive && (
            <div className="flex gap-3">
              <Button onClick={() => navigate("/inventory")} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
              <Button onClick={() => navigate("/sale")} className="gradient-success hover:opacity-90">
                <ShoppingCart className="mr-2 h-4 w-4" />
                New Sale
              </Button>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        {isActive ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat, index) => (
              <Card
                key={stat.title}
                className="card-hover animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
                  <Package className="h-8 w-8 text-warning" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Account Pending Activation</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Complete your payment and enter your activation code to unlock all features including inventory management, sales tracking, and reporting.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        {isActive && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="card-hover cursor-pointer" onClick={() => navigate("/inventory")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Manage Inventory
                </CardTitle>
                <CardDescription>
                  Add, update, or remove items from your inventory
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="w-full justify-between">
                  Go to Inventory
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="card-hover cursor-pointer" onClick={() => navigate("/sale")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-success" />
                  Process Sale
                </CardTitle>
                <CardDescription>
                  Create a new sale and generate receipt
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="w-full justify-between">
                  Start New Sale
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="card-hover cursor-pointer" onClick={() => navigate("/sales")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-info" />
                  View Reports
                </CardTitle>
                <CardDescription>
                  Analyze your sales performance and trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="w-full justify-between">
                  View Sales Report
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
