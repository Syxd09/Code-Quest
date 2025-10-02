import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock } from "lucide-react";

interface QuizQuestionProps {
  question: any;
  gameId: string;
  participantId: string;
}

export const QuizQuestion = ({ question, gameId, participantId }: QuizQuestionProps) => {
  const [timeLeft, setTimeLeft] = useState(question.time_limit);
  const [answer, setAnswer] = useState<any>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
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
      const pointsAwarded = correct ? Math.round(question.points * timeFactor) : 0;

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
        </CardHeader>
        <CardContent className="space-y-4">
          {question.type === "mcq" && (
            <RadioGroup value={answer} onValueChange={setAnswer} disabled={submitted}>
              {question.options?.map((option: string, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
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

          {submitted && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-muted-foreground"
            >
              Waiting for admin to reveal answer...
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
