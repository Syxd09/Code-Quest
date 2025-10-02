import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QrCode, Play, Pause, Eye, SkipForward, StopCircle, Plus } from "lucide-react";
import { QRCodeModal } from "@/components/QRCodeModal";
import { QuestionForm } from "@/components/QuestionForm";
import { QuestionList } from "@/components/QuestionList";
import { ParticipantList } from "@/components/ParticipantList";
import { Leaderboard } from "@/components/Leaderboard";

const AdminDashboard = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;

    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Please sign in");
          navigate("/auth");
          return;
        }

        const { data: gameData, error: gameError } = await supabase
          .from("games")
          .select("*")
          .eq("id", gameId)
          .single();

        if (gameError) throw gameError;

        if (gameData.admin_id !== user.id) {
          toast.error("Unauthorized");
          navigate("/");
          return;
        }

        setGame(gameData);

        const { data: questionsData } = await supabase
          .from("questions")
          .select("*")
          .eq("game_id", gameId)
          .order("order_index");

        setQuestions(questionsData || []);

        const { data: participantsData } = await supabase
          .from("participants")
          .select("*")
          .eq("game_id", gameId)
          .order("score", { ascending: false });

        setParticipants(participantsData || []);
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants", filter: `game_id=eq.${gameId}` },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "questions", filter: `game_id=eq.${gameId}` },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, navigate]);

  const updateGameStatus = async (status: "waiting" | "started" | "paused" | "ended") => {
    try {
      const { error } = await supabase
        .from("games")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", gameId);

      if (error) throw error;
      toast.success(`Game ${status}`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const revealAnswer = async () => {
    try {
      if (!game?.current_question_id) {
        toast.error("No active question to reveal");
        return;
      }

      await supabase
        .from("games")
        .update({ 
          settings: { 
            ...game.settings, 
            reveal_question_id: game.current_question_id,
            reveal_timestamp: Date.now()
          } 
        })
        .eq("id", gameId);
      
      toast.success("Answer revealed to participants");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const nextQuestion = async () => {
    const currentIndex = questions.findIndex((q) => q.id === game?.current_question_id);
    const nextQ = questions[currentIndex + 1];

    if (!nextQ) {
      toast.error("No more questions");
      return;
    }

    try {
      const { error } = await supabase
        .from("games")
        .update({ current_question_id: nextQ.id, updated_at: new Date().toISOString() })
        .eq("id", gameId);

      if (error) throw error;
      toast.success("Moved to next question");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!game) {
    return <div className="min-h-screen flex items-center justify-center">Game not found</div>;
  }

  const joinUrl = `${window.location.origin}/join/${game.join_code}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{game.title}</h1>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant="outline" className="text-lg px-4 py-1">
                {game.join_code}
              </Badge>
              <Badge
                variant={
                  game.status === "started"
                    ? "default"
                    : game.status === "paused"
                    ? "secondary"
                    : "outline"
                }
              >
                {game.status}
              </Badge>
            </div>
          </div>
          <Button onClick={() => setShowQR(true)} variant="outline">
            <QrCode className="w-4 h-4 mr-2" />
            Show QR Code
          </Button>
        </div>

        <div className="grid gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Game Controls</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                onClick={() => updateGameStatus("started")}
                disabled={game.status === "started"}
              >
                <Play className="w-4 h-4 mr-2" />
                Start
              </Button>
              <Button
                onClick={() => updateGameStatus("paused")}
                disabled={game.status !== "started"}
                variant="secondary"
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
              <Button onClick={revealAnswer} variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                Reveal Answer
              </Button>
              <Button onClick={nextQuestion} variant="outline">
                <SkipForward className="w-4 h-4 mr-2" />
                Next Question
              </Button>
              <Button
                onClick={() => updateGameStatus("ended")}
                variant="destructive"
              >
                <StopCircle className="w-4 h-4 mr-2" />
                End Game
              </Button>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="questions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="participants">Participants ({participants.length})</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowQuestionForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </div>
            <QuestionList questions={questions} gameId={gameId!} orderIndex={questions.length} />
          </TabsContent>

          <TabsContent value="participants">
            <ParticipantList participants={participants} gameId={gameId!} />
          </TabsContent>

          <TabsContent value="leaderboard">
            <Leaderboard participants={participants} />
          </TabsContent>
        </Tabs>
      </div>

      {showQR && (
        <QRCodeModal
          open={showQR}
          onClose={() => setShowQR(false)}
          joinCode={game.join_code}
          joinUrl={joinUrl}
        />
      )}

      {showQuestionForm && (
        <QuestionForm
          open={showQuestionForm}
          onClose={() => setShowQuestionForm(false)}
          gameId={gameId!}
          orderIndex={questions.length}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
