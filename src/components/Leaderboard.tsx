import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Award } from "lucide-react";

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
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sortedParticipants.map((participant, index) => (
            <motion.div
              key={participant.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                participant.id === highlightId
                  ? "bg-primary/10 border-primary"
                  : "bg-card"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 text-center font-bold">
                  {getRankIcon(index) || `#${index + 1}`}
                </div>
                <div>
                  <div className="font-medium">{participant.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {participant.score} points
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
