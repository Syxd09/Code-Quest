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
  const [revealLoading, setRevealLoading] = useState(false);
  const [nextQuestionLoading, setNextQuestionLoading] = useState(false);

  useEffect(() => {
    if (!gameId) return;

    const fetchData = async () => {
      console.log("AdminDashboard fetchData called");
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log("No user found, redirecting to auth");
          toast.error("Please sign in");
          navigate("/auth");
          return;
        }

        console.log("Fetching admin game data");
        const { data: gameData, error: gameError } = await supabase
          .from("games")
          .select("*")
          .eq("id", gameId)
          .maybeSingle();

        if (gameError) throw gameError;
        if (!gameData) {
          console.log("Game not found");
          toast.error("Game not found");
          navigate("/");
          return;
        }

        if (gameData.admin_id !== user.id) {
          console.log("Unauthorized access attempt");
          toast.error("Unauthorized");
          navigate("/");
          return;
        }

        setGame(gameData);

        console.log("Fetching questions data");
        const { data: questionsData } = await supabase
          .from("questions")
          .select("*")
          .eq("game_id", gameId)
          .order("order_index");

        setQuestions(questionsData || []);

        console.log("Fetching participants data");
        const { data: participantsData } = await supabase
          .from("participants")
          .select("*")
          .eq("game_id", gameId)
          .order("score", { ascending: false });

        setParticipants(participantsData || []);
        console.log("AdminDashboard fetchData completed");
      } catch (error: any) {
        console.error("Error in AdminDashboard fetchData:", error);
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
        (payload) => {
          console.log("Participants table change detected:", payload);
          fetchData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "questions", filter: `game_id=eq.${gameId}` },
        (payload) => {
          console.log("Questions table change detected:", payload);
          fetchData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        (payload) => {
          console.log("Games table change detected:", payload);
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, navigate]);

  const updateGameStatus = async (status: "waiting" | "started" | "paused" | "ended") => {
    try {
      const updates: any = { status, updated_at: new Date().toISOString() };
      
      // When starting, set the first question if not already set
      if (status === "started" && !game?.current_question_id && questions.length > 0) {
        updates.current_question_id = questions[0].id;
      }

      const { error } = await supabase
        .from("games")
        .update(updates)
        .eq("id", gameId);

      if (error) throw error;
      toast.success(`Game ${status}`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const revealAnswer = async () => {
    if (revealLoading) return;
    console.log("Reveal Answer button clicked");
    setRevealLoading(true);
    try {
      if (!game?.current_question_id) {
        console.log("No active question to reveal");
        toast.error("No active question to reveal");
        return;
      }

      console.log("Updating game settings to reveal answer");
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

      console.log("Answer revealed successfully");
      toast.success("Answer revealed to participants");
    } catch (error: any) {
      console.error("Error revealing answer:", error);
      toast.error(error.message);
    } finally {
      setRevealLoading(false);
    }
  };

  const nextQuestion = async () => {
    if (nextQuestionLoading) return;
    console.log("Next Question button clicked");
    setNextQuestionLoading(true);
    const currentIndex = questions.findIndex((q) => q.id === game?.current_question_id);
    console.log("Current question index:", currentIndex);
    const nextQ = questions[currentIndex + 1];

    if (!nextQ) {
      console.log("No more questions available");
      toast.error("No more questions");
      setNextQuestionLoading(false);
      return;
    }

    console.log("Moving to next question:", nextQ.id);
    try {
      const { error } = await supabase
        .from("games")
        .update({ current_question_id: nextQ.id, updated_at: new Date().toISOString() })
        .eq("id", gameId);

      if (error) throw error;
      console.log("Successfully moved to next question");
      toast.success("Moved to next question");
    } catch (error: any) {
      console.error("Error moving to next question:", error);
      toast.error(error.message);
    } finally {
      setNextQuestionLoading(false);
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
      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 md:mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{game.title}</h1>
            <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2">
              <Badge variant="outline" className="text-sm md:text-lg px-3 md:px-4 py-1">
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
                className="text-xs md:text-sm"
              >
                {game.status}
              </Badge>
            </div>
          </div>
          <Button onClick={() => setShowQR(true)} variant="outline" className="w-full md:w-auto touch-manipulation min-h-[44px]">
            <QrCode className="w-4 h-4 mr-2" />
            Show QR Code
          </Button>
        </div>

        <div className="grid gap-4 md:gap-6 mb-4 md:mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Game Controls</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                onClick={() => updateGameStatus("started")}
                disabled={game.status === "started"}
                className="flex-1 md:flex-none min-h-[44px] touch-manipulation"
              >
                <Play className="w-4 h-4 mr-2" />
                Start
              </Button>
              <Button
                onClick={() => updateGameStatus("paused")}
                disabled={game.status !== "started"}
                variant="secondary"
                className="flex-1 md:flex-none min-h-[44px] touch-manipulation"
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
              <Button onClick={revealAnswer} variant="outline" className="flex-1 md:flex-none min-h-[44px] touch-manipulation" disabled={revealLoading}>
                <Eye className="w-4 h-4 mr-2" />
                {revealLoading ? "Revealing..." : "Reveal Answer"}
              </Button>
              <Button onClick={nextQuestion} variant="outline" className="flex-1 md:flex-none min-h-[44px] touch-manipulation" disabled={nextQuestionLoading}>
                <SkipForward className="w-4 h-4 mr-2" />
                {nextQuestionLoading ? "Loading..." : "Next Question"}
              </Button>
              <Button
                onClick={() => updateGameStatus("ended")}
                variant="destructive"
                className="flex-1 md:flex-none min-h-[44px] touch-manipulation"
              >
                <StopCircle className="w-4 h-4 mr-2" />
                End Game
              </Button>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="questions" className="w-full">
          <TabsList className="grid w-full grid-cols-3 text-xs md:text-sm">
            <TabsTrigger value="questions" className="text-xs md:text-sm">Questions</TabsTrigger>
            <TabsTrigger value="participants" className="text-xs md:text-sm">Participants ({participants.length})</TabsTrigger>
            <TabsTrigger value="leaderboard" className="text-xs md:text-sm">Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowQuestionForm(true)} className="min-h-[44px] touch-manipulation">
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
