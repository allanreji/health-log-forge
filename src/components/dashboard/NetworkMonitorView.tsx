import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Shield, AlertTriangle } from "lucide-react";

interface NetworkEvent {
  id: string;
  timestamp: string;
  event_type: string;
  source_ip: string;
  destination_ip: string | null;
  port: number | null;
  protocol: string | null;
  status: string | null;
  is_suspicious: boolean;
}

const NetworkMonitorView = () => {
  const [events, setEvents] = useState<NetworkEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from("network_events")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(20);

      if (!error && data) {
        setEvents(data);
      }
      setLoading(false);
    };

    fetchEvents();

    const channel = supabase
      .channel("network-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "network_events" }, fetchEvents)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Network Activity Monitor
        </CardTitle>
        <CardDescription>Real-time network traffic analysis and threat detection</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading network events...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No network events found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Event Type</TableHead>
                <TableHead>Source IP</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Protocol</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id} className={event.is_suspicious ? "bg-destructive/5" : ""}>
                  <TableCell>
                    {event.is_suspicious ? (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    ) : (
                      <Shield className="h-4 w-4 text-success" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={event.is_suspicious ? "destructive" : "secondary"}>
                      {event.event_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{event.source_ip}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {event.destination_ip || "N/A"}
                    {event.port && `:${event.port}`}
                  </TableCell>
                  <TableCell>{event.protocol || "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{event.status || "N/A"}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
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

export default NetworkMonitorView;
