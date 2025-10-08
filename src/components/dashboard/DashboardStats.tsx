import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, AlertTriangle, Activity } from "lucide-react";

const DashboardStats = () => {
  const [stats, setStats] = useState({
    patients: 0,
    billing: 0,
    anomalies: 0,
    networkEvents: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [patients, billing, logs, network] = await Promise.all([
        supabase.from("patients").select("*", { count: "exact", head: true }),
        supabase.from("billing").select("amount").eq("status", "pending"),
        supabase.from("system_logs").select("*", { count: "exact", head: true }).eq("is_anomaly", true),
        supabase.from("network_events").select("*", { count: "exact", head: true }),
      ]);

      const totalBilling = billing.data?.reduce((sum, b) => sum + Number(b.amount), 0) || 0;

      setStats({
        patients: patients.count || 0,
        billing: totalBilling,
        anomalies: logs.count || 0,
        networkEvents: network.count || 0,
      });
    };

    fetchStats();

    const logsChannel = supabase
      .channel("logs-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "system_logs" }, fetchStats)
      .subscribe();

    const networkChannel = supabase
      .channel("network-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "network_events" }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(logsChannel);
      supabase.removeChannel(networkChannel);
    };
  }, []);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Active Patients</CardTitle>
          <Users className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.patients}</div>
          <p className="text-xs text-muted-foreground mt-1">Total registered patients</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Pending Billing</CardTitle>
          <DollarSign className="h-4 w-4 text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${stats.billing.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">Unpaid invoices</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Security Anomalies</CardTitle>
          <AlertTriangle className="h-4 w-4 text-warning" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.anomalies}</div>
          <p className="text-xs text-muted-foreground mt-1">Detected anomalies</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Network Events</CardTitle>
          <Activity className="h-4 w-4 text-info" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.networkEvents}</div>
          <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardStats;
