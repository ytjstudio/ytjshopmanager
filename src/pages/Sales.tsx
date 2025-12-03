import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { BarChart3, TrendingUp, Calendar, Download, FileText } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface Sale {
  id: string;
  total_amount: number;
  created_at: string;
}

interface SalesByDate {
  date: string;
  count: number;
  total: number;
}

export default function Sales() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesByDate, setSalesByDate] = useState<SalesByDate[]>([]);
  const [dateRange, setDateRange] = useState("7");

  useEffect(() => {
    if (!loading && !profile) {
      navigate("/auth");
    }
    if (!loading && profile?.status !== "active") {
      navigate("/dashboard");
    }
  }, [profile, loading, navigate]);

  useEffect(() => {
    if (profile?.status === "active") {
      fetchSales();
    }
  }, [profile, dateRange]);

  const fetchSales = async () => {
    if (!profile) return;

    const startDate = startOfDay(subDays(new Date(), parseInt(dateRange)));

    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .eq("profile_id", profile.id)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching sales",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSales(data || []);

      // Group by date
      const grouped = (data || []).reduce((acc: Record<string, SalesByDate>, sale) => {
        const date = format(new Date(sale.created_at), "yyyy-MM-dd");
        if (!acc[date]) {
          acc[date] = { date, count: 0, total: 0 };
        }
        acc[date].count += 1;
        acc[date].total += Number(sale.total_amount);
        return acc;
      }, {});

      setSalesByDate(Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date)));
    }
  };

  const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
  const totalSales = sales.length;
  const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;

  const exportToCSV = () => {
    const headers = ["Date", "Time", "Amount"];
    const rows = sales.map((sale) => [
      format(new Date(sale.created_at), "yyyy-MM-dd"),
      format(new Date(sale.created_at), "HH:mm:ss"),
      Number(sale.total_amount).toFixed(2),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export complete",
      description: "Sales report has been downloaded.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Sales Report</h1>
            <p className="text-muted-foreground mt-1">
              View and analyze your sales performance
            </p>
          </div>

          <div className="flex gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={exportToCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">R {totalRevenue.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-xl bg-success/10">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold">{totalSales}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Average Sale</p>
                  <p className="text-2xl font-bold">R {averageSale.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-xl bg-info/10">
                  <BarChart3 className="h-6 w-6 text-info" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales by Date */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Sales Summary by Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            {salesByDate.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg">No sales data</h3>
                <p className="text-muted-foreground">
                  Sales will appear here once you make your first sale
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Transactions</TableHead>
                      <TableHead className="text-right">Total Revenue</TableHead>
                      <TableHead className="text-right">Average</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesByDate.map((day) => (
                      <TableRow key={day.date}>
                        <TableCell className="font-medium">
                          {format(new Date(day.date), "EEE, MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">{day.count}</TableCell>
                        <TableCell className="text-right font-semibold text-success">
                          R {day.total.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          R {(day.total / day.count).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sales.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No transactions yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.slice(0, 20).map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>
                          {format(new Date(sale.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(sale.created_at), "h:mm a")}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          R {Number(sale.total_amount).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
