import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Award, Ban } from "lucide-react";
import { AnimatedScore } from "./AnimatedScore";

interface LeaderboardProps {
  participants: any[];
  highlightId?: string;
}

export const Leaderboard = ({ participants, highlightId }: LeaderboardProps) => {
  const sortedParticipants = [...participants].sort((a, b) => b.score - a.score);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 1:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 2:
        return <Award className="w-5 h-5 text-orange-600" />;
      default:
        return null;
    }
  };

  if (sortedParticipants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          No participants yet
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
          <Trophy className="w-5 h-5 text-primary" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sortedParticipants.map((participant, index) => {
            const isEliminated = participant.status === "eliminated";

            return (
              <motion.div
                key={participant.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  isEliminated
                    ? "bg-destructive/10 border-destructive opacity-60"
                    : participant.id === highlightId
                    ? "bg-primary/10 border-primary"
                    : "bg-card"
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 text-center font-bold flex-shrink-0">
                    {isEliminated ? (
                      <Ban className="w-5 h-5 text-destructive mx-auto" />
                    ) : (
                      getRankIcon(index) || <span className="text-sm md:text-base">#{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium flex items-center gap-2 text-sm md:text-base ${isEliminated ? "line-through text-muted-foreground" : ""}`}>
                      <span className="truncate">{participant.name}</span>
                      {isEliminated && (
                        <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded flex-shrink-0">
                          ELIMINATED
                        </span>
                      )}
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground">
                      <AnimatedScore score={participant.score} /> points
                      {participant.cheat_count > 0 && !isEliminated && (
                        <span className="ml-2 text-xs text-destructive">
                          ({participant.cheat_count} cheats)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
