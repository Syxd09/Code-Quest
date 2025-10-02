import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ParticipantListProps {
  participants: any[];
  gameId: string;
}

export const ParticipantList = ({ participants, gameId }: ParticipantListProps) => {
  const eliminateParticipant = async (id: string) => {
    if (!confirm("Are you sure you want to eliminate this participant?")) return;

    try {
      const { error } = await supabase
        .from("participants")
        .update({ status: "eliminated" })
        .eq("id", id);

      if (error) throw error;
      toast.success("Participant eliminated!");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (participants.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          No participants yet. Share the join code to get started!
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Participants ({participants.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3">
                <div>
                  <div className="font-medium">{participant.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Score: {participant.score} • Cheats: {participant.cheat_count}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    participant.status === "active"
                      ? "default"
                      : participant.status === "eliminated"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {participant.status}
                </Badge>
                {participant.status === "active" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => eliminateParticipant(participant.id)}
                  >
                    <UserX className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
