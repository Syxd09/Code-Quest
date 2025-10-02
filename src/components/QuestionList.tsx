import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QuestionForm } from "./QuestionForm";

interface QuestionListProps {
  questions: any[];
  gameId: string;
  orderIndex: number;
}

export const QuestionList = ({ questions, gameId, orderIndex }: QuestionListProps) => {
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const deleteQuestion = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const { error } = await supabase.from("questions").delete().eq("id", id);
      if (error) throw error;
      toast.success("Question deleted!");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          No questions yet. Click "Add Question" to get started.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {editingQuestion && (
        <QuestionForm
          open={!!editingQuestion}
          onClose={() => setEditingQuestion(null)}
          gameId={gameId}
          orderIndex={orderIndex}
          question={editingQuestion}
        />
      )}

    <div className="space-y-4">
      {questions.map((question, index) => (
        <Card key={question.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">Q{index + 1}</Badge>
                  <Badge>{question.type.toUpperCase()}</Badge>
                  <Badge variant="secondary">{question.points} pts</Badge>
                  <Badge variant="secondary">{question.time_limit}s</Badge>
                </div>
                <CardTitle className="text-lg">{question.text}</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setEditingQuestion(question)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteQuestion(question.id)}
                >
                  <Trash className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          </CardHeader>
          {(question.type === "mcq" || question.type === "checkbox") && (
            <CardContent>
              <div className="space-y-2">
                {question.options?.map((option: string, i: number) => (
                  <div
                    key={i}
                    className={`p-2 rounded-md border ${
                      question.correct_answers?.includes(option)
                        ? "bg-success-light border-success"
                        : "bg-muted"
                    }`}
                  >
                    {option}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
    </>
  );
};
