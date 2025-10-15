import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock, Lightbulb, AlertTriangle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface QuizQuestionProps {
  question: any;
  gameId: string;
  participantId: string;
  revealSettings?: any;
}

export const QuizQuestion = ({ question, gameId, participantId, revealSettings }: QuizQuestionProps) => {
  const isMobile = useIsMobile();
  const [timeLeft, setTimeLeft] = useState(question.time_limit);
  const [answer, setAnswer] = useState<any>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [cheatCount, setCheatCount] = useState(0);
  const [eliminated, setEliminated] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const tabSwitchCount = useRef(0);
  const devToolsCheckInterval = useRef<NodeJS.Timeout>();

  // Load initial cheat count with grace period for mobile joins
  useEffect(() => {
    const loadCheatCount = async () => {
      const { data } = await supabase
        .from("participants")
        .select("cheat_count, status")
        .eq("id", participantId)
        .single();

      if (data) {
        // Grace period of 3 seconds for initial joins, especially on mobile
        const gracePeriod = 3000;
        console.log(`Activating anti-cheat after ${gracePeriod}ms grace period for mobile-friendly experience`);

        setTimeout(() => {
          setCheatCount(data.cheat_count || 0);
          if (data.status === "eliminated") {
            setEliminated(true);
          }
        }, gracePeriod);
      }
    };
    loadCheatCount();
  }, [participantId]);

  const handleCheatDetected = async (reason: string) => {
    if (submitted || eliminated) return;

    console.log(`Cheat detected: ${reason}, isMobile: ${isMobile}`);

    try {
      const { data, error } = await supabase.rpc('handle_cheat_detection', {
        p_participant_id: participantId,
        p_game_id: gameId,
        p_reason: reason
      });

      if (error) throw error;

      const result = data as { success?: boolean; cheat_count: number; score: number; status: string; error?: string };

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setCheatCount(result.cheat_count);

      if (result.status === 'eliminated') {
        setEliminated(true);
        setWarningMessage("You have been ELIMINATED from the game due to multiple cheat attempts!");
        setShowWarning(true);
      } else {
        setWarningMessage(`⚠️ CHEAT DETECTED: ${reason}\n\n-50 points penalty!\n\nWarning ${result.cheat_count}/3: One more strike and you'll be eliminated!`);
        setShowWarning(true);
      }
    } catch (error: any) {
      console.error('Cheat detection error:', error);
    }
  };

  // Anti-cheat: Tab visibility detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !submitted && !eliminated) {
        console.log("Tab visibility change detected, isMobile:", isMobile);
        if (!isMobile) {
          handleCheatDetected("Tab switching detected");
        } else {
          console.log("Ignoring tab switch on mobile device");
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [submitted, eliminated, cheatCount, isMobile]);

  // Anti-cheat: Browser back button detection
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      console.log("Browser back button detected, isMobile:", isMobile);
      if (!submitted && !eliminated && !isMobile) {
        handleCheatDetected("Browser back button usage detected");
        window.history.pushState(null, "", window.location.href);
      } else if (isMobile) {
        console.log("Ignoring browser back button on mobile device");
      }
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, [submitted, eliminated, cheatCount, isMobile]);

  // Anti-cheat: DevTools detection
  useEffect(() => {
    const detectDevTools = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;

      if (widthThreshold || heightThreshold) {
        console.log("DevTools detection triggered, isMobile:", isMobile);
        if (!submitted && !eliminated && !isMobile) {
          handleCheatDetected("Developer tools opened");
        } else if (isMobile) {
          console.log("Ignoring DevTools detection on mobile device");
        }
      }
    };

    devToolsCheckInterval.current = setInterval(detectDevTools, 1000);

    return () => {
      if (devToolsCheckInterval.current) {
        clearInterval(devToolsCheckInterval.current);
      }
    };
  }, [submitted, eliminated, cheatCount, isMobile]);

  // Anti-cheat: Copy-paste detection
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      console.log("Paste event detected, isMobile:", isMobile);
      if (!submitted && !eliminated && !isMobile) {
        e.preventDefault();
        handleCheatDetected("Copy-paste attempt detected");
      } else if (isMobile) {
        console.log("Allowing paste on mobile device");
      }
    };

    const handleCopy = (e: ClipboardEvent) => {
      console.log("Copy event detected, isMobile:", isMobile);
      if (!submitted && !eliminated && !isMobile) {
        e.preventDefault();
        handleCheatDetected("Copy attempt detected");
      } else if (isMobile) {
        console.log("Allowing copy on mobile device");
      }
    };

    document.addEventListener("paste", handlePaste);
    document.addEventListener("copy", handleCopy);

    return () => {
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("copy", handleCopy);
    };
  }, [submitted, eliminated, cheatCount, isMobile]);

  // Reset state when question changes
  useEffect(() => {
    console.log("Question changed, resetting state. New question ID:", question.id);
    setTimeLeft(question.time_limit);
    setAnswer(null);
    setSelectedOptions([]);
    setSubmitted(false);
    setShowHint(false);
    setHintUsed(false);
    setShowReveal(false);
    setShowWarning(false);
    tabSwitchCount.current = 0;
  }, [question.id, question.time_limit]);

  useEffect(() => {
    if (submitted) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!submitted) {
            handleSubmit(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [question.id, submitted]);

  const handleSubmit = async (autoSubmit = false) => {
    if (submitted || submitting) return;

    setSubmitting(true);

    try {
      const timeTaken = question.time_limit - timeLeft;
      let finalAnswer: any;
      let correct = false;

      if (question.type === "mcq") {
        if (question.correct_answers?.length === 1) {
          finalAnswer = answer;
          correct = question.correct_answers?.includes(answer);
        } else {
          finalAnswer = selectedOptions;
          correct =
            selectedOptions.length === question.correct_answers?.length &&
            selectedOptions.every((opt) => question.correct_answers.includes(opt));
        }
      } else if (question.type === "short") {
        finalAnswer = answer;
        const keywords = question.keywords?.map((k: any) => k.text.toLowerCase()) || [];
        const answerLower = (answer || "").toLowerCase();
        correct = keywords.some((keyword: string) => answerLower.includes(keyword));
      }

      const timeFactor = Math.max(0.1, timeLeft / question.time_limit);
      let pointsAwarded = correct ? Math.round(question.points * timeFactor) : 0;
      
      // Deduct hint penalty if hint was used
      if (hintUsed && correct) {
        pointsAwarded = Math.max(0, pointsAwarded - (question.hint_penalty || 10));
      }

      const { data, error } = await supabase.rpc('submit_response', {
        p_game_id: gameId,
        p_question_id: question.id,
        p_participant_id: participantId,
        p_answer: finalAnswer,
        p_correct: correct,
        p_time_taken: timeTaken,
        p_points_awarded: pointsAwarded,
        p_idempotency_key: `${participantId}-${question.id}-${Date.now()}`,
      });

      if (error) throw error;

      const result = data as { success?: boolean; points_awarded?: number; error?: string };
      
      if (result.error) {
        if (result.error === 'Response already submitted') {
          // Silently ignore duplicate submissions
          setSubmitted(true);
          setWasCorrect(correct);
          return;
        }
        throw new Error(result.error);
      }

      setSubmitted(true);
      setWasCorrect(correct);

      if (!autoSubmit) {
        toast.success(
          correct
            ? `Correct! +${result.points_awarded} points`
            : "Incorrect. Better luck next time!"
        );
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (revealSettings?.reveal_question_id === question.id && submitted) {
      setShowReveal(true);
      const timer = setTimeout(() => setShowReveal(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [revealSettings, question.id, submitted]);

  const handleHintClick = () => {
    setShowHint(true);
    setHintUsed(true);
    toast.info(`Hint revealed! -${question.hint_penalty || 10} points penalty`);
  };

  const progress = (timeLeft / question.time_limit) * 100;

  if (eliminated) {
    return (
      <Card className="shadow-card border-destructive border-2">
        <CardContent className="pt-6 text-center">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-destructive mb-2">ELIMINATED</h2>
          <p className="text-lg text-muted-foreground mb-4">Game Over</p>
          <p className="text-muted-foreground">
            You have been eliminated from the quiz due to multiple cheat attempts.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-6 h-6" />
              {eliminated ? "ELIMINATED!" : "CHEAT WARNING!"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base whitespace-pre-line">
              {warningMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Button onClick={() => setShowWarning(false)} className="mt-4">
            {eliminated ? "Exit Game" : "I Understand"}
          </Button>
        </AlertDialogContent>
      </AlertDialog>

      <motion.div
        key={question.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <span className="text-xl md:text-2xl font-bold">{timeLeft}s</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {question.points} points
            </div>
          </div>
          <Progress value={progress} className="mb-4" />
          <CardTitle className="text-lg md:text-xl leading-relaxed">{question.text}</CardTitle>
          {question.hint && !showHint && !submitted && (
            <Button
              onClick={handleHintClick}
              variant="outline"
              size="sm"
              className="mt-2"
              disabled={hintUsed}
            >
              <Lightbulb className="w-4 h-4 mr-2" />
              Get Hint (-{question.hint_penalty || 10} points)
            </Button>
          )}
          <AnimatePresence>
            {showHint && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-blue-500/10 border border-blue-500 rounded-lg p-3 text-blue-700 dark:text-blue-300"
              >
                💡 {question.hint}
              </motion.div>
            )}
          </AnimatePresence>
        </CardHeader>
        <CardContent className="space-y-4">
          {question.type === "mcq" && (
            <>
              {question.correct_answers?.length === 1 ? (
                <RadioGroup value={answer} onValueChange={setAnswer} disabled={submitted}>
                  {question.options?.map((option: string, index: number) => (
                    <div key={index} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value={option} id={`option-${index}`} disabled={submitted} className="mt-1" />
                      <Label
                        htmlFor={`option-${index}`}
                        className={`flex-1 text-sm md:text-base leading-relaxed ${submitted ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                      >
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <div className="space-y-3">
                  {question.options?.map((option: string, index: number) => (
                    <div key={index} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <Checkbox
                        id={`option-${index}`}
                        checked={selectedOptions.includes(option)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedOptions([...selectedOptions, option]);
                          } else {
                            setSelectedOptions(selectedOptions.filter((o) => o !== option));
                          }
                        }}
                        disabled={submitted}
                        className="mt-1"
                      />
                      <Label htmlFor={`option-${index}`} className="flex-1 text-sm md:text-base leading-relaxed cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {question.type === "short" && (
            <Input
              value={answer || ""}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer..."
              disabled={submitted}
              className="text-base md:text-lg py-3"
            />
          )}

          <Button
            onClick={() => handleSubmit()}
            disabled={submitted || submitting || (!answer && selectedOptions.length === 0) || (question.type === "mcq" && question.correct_answers?.length > 1 && selectedOptions.length === 0)}
            className="w-full shadow-button text-base md:text-lg py-3 md:py-4 min-h-[48px] touch-manipulation"
            size="lg"
          >
            {submitted ? "Submitted" : submitting ? "Submitting..." : "Submit Answer"}
          </Button>

          {submitted && !showReveal && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-muted-foreground"
            >
              Waiting for admin to reveal answer...
            </motion.div>
          )}

          <AnimatePresence>
            {showReveal && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: 50 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1, 
                  y: 0,
                  transition: {
                    type: "spring",
                    stiffness: 260,
                    damping: 20
                  }
                }}
                exit={{ opacity: 0, scale: 0.5, y: -50 }}
                className={`p-4 md:p-6 rounded-xl text-center font-bold text-xl md:text-2xl shadow-lg ${
                  wasCorrect
                    ? "bg-gradient-to-r from-green-500/30 to-emerald-500/30 text-green-700 dark:text-green-300 border-2 border-green-500"
                    : "bg-gradient-to-r from-red-500/30 to-rose-500/30 text-red-700 dark:text-red-300 border-2 border-red-500"
                }`}
              >
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: wasCorrect ? [0, 10, -10, 0] : [0, -10, 10, 0]
                  }}
                  transition={{ duration: 0.5 }}
                >
                  {wasCorrect ? "🎉 Correct!" : "💔 Incorrect"}
                </motion.div>
                {wasCorrect && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-sm mt-2 font-normal"
                  >
                    Great job! Keep it up!
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
    </>
  );
};
