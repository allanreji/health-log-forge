import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Info, AlertCircle, XCircle } from "lucide-react";

interface SystemLog {
  id: string;
  timestamp: string;
  source: string;
  level: string;
  message: string;
  is_anomaly: boolean;
  ip_address: string | null;
}

const SystemLogsView = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from("system_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(20);

      if (!error && data) {
        setLogs(data);
      }
      setLoading(false);
    };

    fetchLogs();

    const channel = supabase
      .channel("logs-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "system_logs" }, fetchLogs)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "info":
        return <Info className="h-4 w-4 text-info" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "critical":
        return <XCircle className="h-4 w-4 text-critical" />;
      default:
        return null;
    }
  };

  const getLevelVariant = (level: string) => {
    switch (level) {
      case "info":
        return "secondary";
      case "warning":
        return "warning";
      case "error":
        return "destructive";
      case "critical":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>UNIX System Logs</CardTitle>
        <CardDescription>Real-time system monitoring and security events</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No logs found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} className={log.is_anomaly ? "bg-warning/5" : ""}>
                  <TableCell>{getLevelIcon(log.level)}</TableCell>
                  <TableCell>
                    <Badge variant={getLevelVariant(log.level) as any}>{log.level}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{log.source}</TableCell>
                  <TableCell className="max-w-md truncate">{log.message}</TableCell>
                  <TableCell className="font-mono text-sm">{log.ip_address || "N/A"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemLogsView;
