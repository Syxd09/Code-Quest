import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

interface QuestionFormProps {
  open: boolean;
  onClose: () => void;
  gameId: string;
  orderIndex: number;
  question?: any;
}

export const QuestionForm = ({
  open,
  onClose,
  gameId,
  orderIndex,
  question,
}: QuestionFormProps) => {
  const [type, setType] = useState(question?.type || "mcq");
  const [text, setText] = useState(question?.text || "");
  const [options, setOptions] = useState<string[]>(question?.options || ["", "", "", ""]);
  const [correctAnswers, setCorrectAnswers] = useState<number[]>([]);
  const [keywords, setKeywords] = useState(question?.keywords?.map((k: any) => k.text).join(", ") || "");
  const [points, setPoints] = useState(question?.points || 100);
  const [timeLimit, setTimeLimit] = useState(question?.time_limit || 30);
  const [hint, setHint] = useState(question?.hint || "");
  const [hintPenalty, setHintPenalty] = useState(question?.hint_penalty || 10);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const questionData: any = {
        game_id: gameId,
        type,
        text,
        points,
        time_limit: timeLimit,
        hint: hint || null,
        hint_penalty: hintPenalty,
        order_index: question?.order_index ?? orderIndex,
      };

      if (type === "mcq" || type === "checkbox") {
        questionData.options = options.filter((o) => o.trim());
        questionData.correct_answers = correctAnswers.map((i) => options[i]);
      } else if (type === "short") {
        questionData.keywords = keywords
          .split(",")
          .map((k) => ({ text: k.trim(), weight: 1, required: false }))
          .filter((k) => k.text);
      }

      if (question) {
        const { error } = await supabase
          .from("questions")
          .update(questionData)
          .eq("id", question.id);

        if (error) throw error;
        toast.success("Question updated!");
      } else {
        const { error } = await supabase
          .from("questions")
          .insert(questionData);

        if (error) throw error;
        toast.success("Question created!");
      }

      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const addOption = () => {
    setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
    setCorrectAnswers(correctAnswers.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i)));
  };

  const toggleCorrectAnswer = (index: number) => {
    if (type === "mcq") {
      setCorrectAnswers([index]);
    } else {
      if (correctAnswers.includes(index)) {
        setCorrectAnswers(correctAnswers.filter((i) => i !== index));
      } else {
        setCorrectAnswers([...correctAnswers, index]);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{question ? "Edit Question" : "Add Question"}</DialogTitle>
          <DialogDescription>
            Create a question for your quiz
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Question Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mcq">Multiple Choice (Single Answer)</SelectItem>
                <SelectItem value="checkbox">Multiple Choice (Multiple Answers)</SelectItem>
                <SelectItem value="short">Short Answer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Question Text</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter your question..."
              required
            />
          </div>

          {(type === "mcq" || type === "checkbox") && (
            <div className="space-y-2">
              <Label>Options</Label>
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Checkbox
                    checked={correctAnswers.includes(index)}
                    onCheckedChange={() => toggleCorrectAnswer(index)}
                  />
                  <Input
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...options];
                      newOptions[index] = e.target.value;
                      setOptions(newOptions);
                    }}
                    placeholder={`Option ${index + 1}`}
                  />
                  {options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addOption} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Option
              </Button>
            </div>
          )}

          {type === "short" && (
            <div className="space-y-2">
              <Label>Keywords (comma-separated)</Label>
              <Input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g., photosynthesis, chlorophyll, sunlight"
              />
              <p className="text-sm text-muted-foreground">
                Partial credit is awarded based on matched keywords
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Points</Label>
              <Input
                type="number"
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Time Limit (seconds)</Label>
              <Input
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                min={5}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Hint (optional)</Label>
            <Input
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="Provide a helpful hint..."
            />
          </div>

          <div className="space-y-2">
            <Label>Hint Penalty</Label>
            <Input
              type="number"
              value={hintPenalty}
              onChange={(e) => setHintPenalty(Number(e.target.value))}
              min={0}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : question ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
