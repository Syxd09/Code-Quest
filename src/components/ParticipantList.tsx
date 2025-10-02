import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserX, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ParticipantListProps {
  participants: any[];
  gameId: string;
}

export const ParticipantList = ({ participants, gameId }: ParticipantListProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const removeParticipant = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently remove ${name}?`)) return;

    try {
      const { error } = await supabase
        .from("participants")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Participant removed!");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const openEditDialog = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
    setDialogOpen(true);
  };

  const updateParticipantName = async () => {
    if (!editingId || !editName.trim()) return;

    try {
      const { error } = await supabase
        .from("participants")
        .update({ name: editName.trim() })
        .eq("id", editingId);

      if (error) throw error;
      toast.success("Name updated!");
      setDialogOpen(false);
      setEditingId(null);
      setEditName("");
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
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Participant Name</DialogTitle>
            <DialogDescription>
              Change the participant's display name. This will update everywhere.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter new name"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={updateParticipantName}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(participant.id, participant.name)}
                    title="Edit name"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  {participant.status === "active" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => eliminateParticipant(participant.id)}
                      title="Eliminate participant"
                    >
                      <UserX className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeParticipant(participant.id, participant.name)}
                    title="Remove participant"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
};
