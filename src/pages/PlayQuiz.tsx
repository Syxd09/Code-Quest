import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QuizQuestion } from "@/components/QuizQuestion";
import { Leaderboard } from "@/components/Leaderboard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedScore } from "@/components/AnimatedScore";
import { ScoreSparkline } from "@/components/ScoreSparkline";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

const PlayQuiz = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();

  const [game, setGame] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [participant, setParticipant] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previousScore, setPreviousScore] = useState(0);
  const [cachedParticipants, setCachedParticipants] = useState<any[]>([]);
  const [cachedGame, setCachedGame] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

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
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          localStorage.setItem("redirectTo", window.location.pathname);
          navigate("/auth");
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
        setCachedGame(gameData);

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
        setCachedParticipants(participantsData || []);
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
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          console.log("[DEBUG] Game update received:", payload);
          // Debounce updates to prevent excessive re-renders
          setTimeout(() => {
            console.log("[DEBUG] Fetching data after game update");
            fetchData();
          }, 100);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "participants",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          console.log("[DEBUG] Participant update received:", payload);
          // Debounce updates to prevent excessive re-renders
          setTimeout(() => {
            console.log("[DEBUG] Fetching data after participant update");
            fetchData();
          }, 100);
        }
      )
      .subscribe((status) => {
        console.log("[DEBUG] Subscription status:", status);
        setConnectionStatus(status === 'SUBSCRIBED' ? 'connected' : status === 'CLOSED' ? 'disconnected' : 'connecting');
      });

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
      <div className="min-h-screen bg-gradient-to-br from-red-950 via-black to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <Card className="bg-black/50 border border-red-800/40 shadow-[0_0_30px_-10px_rgba(255,0,0,0.6)] backdrop-blur-md text-center rounded-2xl overflow-hidden">
            <CardContent className="pt-8 pb-10 px-6">
              <motion.div
                initial={{ rotate: -20, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="flex justify-center mb-4"
              >
                <AlertTriangle className="w-16 h-16 text-red-500 animate-pulse drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]" />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-3xl font-extrabold text-red-500 mb-3 tracking-wide"
              >
                Eliminated
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-gray-300 text-sm leading-relaxed"
              >
                You have been{" "}
                <span className="text-red-400 font-semibold">eliminated</span>{" "}
                from the quiz due to multiple cheat attempts.
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-8"
              >
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 text-sm font-semibold rounded-full border border-red-600 text-red-400 hover:bg-red-600 hover:text-white transition-all duration-300 shadow-[0_0_10px_rgba(255,0,0,0.4)]"
                >
                  Try Again
                </button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 md:mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">{game.title}</h1>
            <p className="text-white/80 mt-1 text-sm md:text-base">Hello, {participant.name}!</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <Badge variant="outline" className="text-white border-white/30 relative text-sm md:text-base">
              Score: <AnimatedScore score={participant.score} />
              <ScoreSparkline
                score={participant.score}
                previousScore={previousScore}
              />
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

            <Badge
              variant={
                connectionStatus === "connected"
                  ? "default"
                  : connectionStatus === "connecting"
                  ? "secondary"
                  : "destructive"
              }
              className="text-xs md:text-sm"
            >
              {connectionStatus === "connected" ? "🟢 Online" : connectionStatus === "connecting" ? "🟡 Connecting..." : "🔴 Offline"}
            </Badge>
          </div>
        </div>

        {game.status === "waiting" && (
          <Card>
            <CardContent className="pt-6 text-center px-4">
              <h2 className="text-xl md:text-2xl font-bold mb-2">Waiting to start...</h2>
              <p className="text-muted-foreground text-sm md:text-base">
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
              <CardHeader className="text-center bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-4">
                <motion.div
                  initial={{ y: -30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <CardTitle className="text-2xl md:text-4xl mb-2">🏆 Game Over! 🏆</CardTitle>
                  <CardDescription className="text-base md:text-lg">
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
                  <Leaderboard
                    participants={participants}
                    highlightId={participant.id}
                  />
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {(game.status === "paused" ||
          !currentQuestion) &&
          game.status !== "ended" &&
          game.status !== "waiting" && (
            <Card>
              <CardContent className="pt-6 text-center px-4">
                <h2 className="text-xl md:text-2xl font-bold mb-2">Please wait...</h2>
                <p className="text-muted-foreground text-sm md:text-base">
                  The admin will start the next question shortly.
                </p>
              </CardContent>
            </Card>
          )}

        {game.status !== "ended" && (
          <div className="mt-8">
            <Leaderboard
              participants={participants}
              highlightId={participant.id}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayQuiz;
