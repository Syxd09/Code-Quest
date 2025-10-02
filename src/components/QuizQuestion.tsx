import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock, Lightbulb } from "lucide-react";

interface QuizQuestionProps {
  question: any;
  gameId: string;
  participantId: string;
  revealSettings?: any;
}

export const QuizQuestion = ({ question, gameId, participantId, revealSettings }: QuizQuestionProps) => {
  const [timeLeft, setTimeLeft] = useState(question.time_limit);
  const [answer, setAnswer] = useState<any>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const tabSwitchCount = useRef(0);

  // Anti-cheat: Tab visibility detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !submitted) {
        tabSwitchCount.current += 1;
        if (tabSwitchCount.current >= 3) {
          supabase.from("cheat_logs").insert({
            game_id: gameId,
            participant_id: participantId,
            reason: "Multiple tab switches detected"
          });
          toast.error("Warning: Tab switching detected!");
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [submitted, gameId, participantId]);

  // Reset state when question changes
  useEffect(() => {
    setTimeLeft(question.time_limit);
    setAnswer(null);
    setSelectedOptions([]);
    setSubmitted(false);
    setShowHint(false);
    setHintUsed(false);
    setShowReveal(false);
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
        finalAnswer = answer;
        correct = question.correct_answers?.includes(answer);
      } else if (question.type === "checkbox") {
        finalAnswer = selectedOptions;
        correct =
          selectedOptions.length === question.correct_answers?.length &&
          selectedOptions.every((opt) => question.correct_answers.includes(opt));
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

      const { error } = await supabase.from("responses").insert({
        game_id: gameId,
        question_id: question.id,
        participant_id: participantId,
        answer: finalAnswer,
        correct,
        time_taken: timeTaken,
        points_awarded: pointsAwarded,
        idempotency_key: `${participantId}-${question.id}-${Date.now()}`,
      });

      if (error) throw error;

      const { data: participant } = await supabase
        .from("participants")
        .select("score")
        .eq("id", participantId)
        .single();

      if (participant) {
        await supabase
          .from("participants")
          .update({ score: participant.score + pointsAwarded })
          .eq("id", participantId);
      }

      setSubmitted(true);
      setWasCorrect(correct);

      if (!autoSubmit) {
        toast.success(
          correct
            ? `Correct! +${pointsAwarded} points`
            : "Incorrect. Better luck next time!"
        );
      }
    } catch (error: any) {
      if (!error.message.includes("duplicate key")) {
        toast.error(error.message);
      }
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

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold">{timeLeft}s</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {question.points} points
            </div>
          </div>
          <Progress value={progress} className="mb-4" />
          <CardTitle className="text-xl">{question.text}</CardTitle>
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
            <RadioGroup value={answer} onValueChange={setAnswer} disabled={submitted}>
              {question.options?.map((option: string, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`option-${index}`} disabled={submitted} />
                  <Label 
                    htmlFor={`option-${index}`} 
                    className={`flex-1 ${submitted ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {question.type === "checkbox" && (
            <div className="space-y-2">
              {question.options?.map((option: string, index: number) => (
                <div key={index} className="flex items-center space-x-2">
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
                  />
                  <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          )}

          {question.type === "short" && (
            <Input
              value={answer || ""}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer..."
              disabled={submitted}
            />
          )}

          <Button
            onClick={() => handleSubmit()}
            disabled={submitted || submitting || (!answer && selectedOptions.length === 0)}
            className="w-full shadow-button"
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
                className={`p-6 rounded-xl text-center font-bold text-2xl shadow-lg ${
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
  );
};
