import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QuizQuestion } from "@/components/QuizQuestion";
import { Leaderboard } from "@/components/Leaderboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedScore } from "@/components/AnimatedScore";
import { ScoreSparkline } from "@/components/ScoreSparkline";
import { motion } from "framer-motion";

const PlayQuiz = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [participant, setParticipant] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previousScore, setPreviousScore] = useState(0);

  useEffect(() => {
    if (!gameId) return;

    const sessionData = localStorage.getItem(`quiz_session_${gameId}`);
    if (!sessionData) {
      navigate(`/join/${gameId}`);
      return;
    }

    const { userId } = JSON.parse(sessionData);

    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          localStorage.setItem('redirectTo', window.location.pathname);
          navigate('/auth');
          return;
        }
        const { data: gameData, error: gameError } = await supabase
          .from("games")
          .select("*")
          .eq("id", gameId)
          .maybeSingle();

        if (gameError) throw gameError;
        if (!gameData) {
          toast.error("Game not found");
          navigate(`/join/${gameId}`);
          return;
        }
        setGame(gameData);

        const { data: participantData, error: participantError } = await supabase
          .from("participants")
          .select("*")
          .eq("game_id", gameId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (participantError) throw participantError;
        if (!participantData) {
          navigate(`/join/${gameId}`);
          return;
        }
        setPreviousScore(participant?.score || 0);
        setParticipant(participantData);

        if (gameData.current_question_id) {
          const { data: questionData, error: questionError } = await supabase
            .from("questions")
            .select("*")
            .eq("id", gameData.current_question_id)
            .maybeSingle();

          if (!questionError && questionData) {
            setCurrentQuestion(questionData);
          } else {
            setCurrentQuestion(null);
          }
        } else {
          setCurrentQuestion(null);
        }

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
        { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants", filter: `game_id=eq.${gameId}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!game || !participant) {
    return null;
  }

  if (participant.status === "eliminated") {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold text-destructive mb-4">Eliminated</h2>
            <p className="text-muted-foreground">
              You have been eliminated from the quiz due to multiple cheat attempts.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">{game.title}</h1>
            <p className="text-white/80 mt-1">Hello, {participant.name}!</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-white border-white/30 relative">
              Score: <AnimatedScore score={participant.score} />
              <ScoreSparkline score={participant.score} previousScore={previousScore} />
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

        {game.status === "waiting" && (
          <Card>
            <CardContent className="pt-6 text-center">
              <h2 className="text-2xl font-bold mb-2">Waiting to start...</h2>
              <p className="text-muted-foreground">
                The quiz will begin shortly. Get ready!
              </p>
            </CardContent>
          </Card>
        )}

        {game.status === "started" && currentQuestion && (
          <QuizQuestion
            question={currentQuestion}
            gameId={gameId!}
            participantId={participant.id}
            revealSettings={game.settings}
          />
        )}

        {game.status === "ended" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="shadow-2xl border-2">
              <CardHeader className="text-center bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                <motion.div
                  initial={{ y: -30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <CardTitle className="text-4xl mb-2">🏆 Game Over! 🏆</CardTitle>
                  <CardDescription className="text-lg">
                    Thanks for playing! Here are the final results:
                  </CardDescription>
                </motion.div>
              </CardHeader>
              <CardContent className="pt-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Leaderboard participants={participants} highlightId={participant.id} />
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {(game.status === "paused" || !currentQuestion) && game.status !== "ended" && game.status !== "waiting" && (
          <Card>
            <CardContent className="pt-6 text-center">
              <h2 className="text-2xl font-bold mb-2">Please wait...</h2>
              <p className="text-muted-foreground">
                The admin will start the next question shortly.
              </p>
            </CardContent>
          </Card>
        )}

        {game.status !== "ended" && (
          <div className="mt-8">
            <Leaderboard participants={participants} highlightId={participant.id} />
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayQuiz;
