import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Users, Trophy, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const [gameTitle, setGameTitle] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const createGame = async () => {
    if (!gameTitle.trim()) {
      toast.error("Please enter a game title");
      return;
    }

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please sign in to create a game");
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("games")
        .insert([{
          title: gameTitle,
          admin_id: user.id,
          join_code: "",
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success("Game created successfully!");
      navigate(`/admin/${data.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create game");
    } finally {
      setIsCreating(false);
    }
  };

  const joinGame = () => {
    if (!joinCode.trim()) {
      toast.error("Please enter a join code");
      return;
    }
    navigate(`/join/${joinCode.toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-medium">Live Quiz Platform</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Intercollegiate
            <br />
            Live Quiz
          </h1>
          
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Create engaging live quizzes with real-time scoring, leaderboards, and anti-cheat features
          </p>
        </motion.div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="shadow-card hover:shadow-button transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Create Quiz
                </CardTitle>
                <CardDescription>Start a new live quiz session</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Enter quiz title..."
                  value={gameTitle}
                  onChange={(e) => setGameTitle(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && createGame()}
                />
                <Button
                  onClick={createGame}
                  disabled={isCreating}
                  className="w-full shadow-button"
                >
                  {isCreating ? "Creating..." : "Create Quiz"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="shadow-card hover:shadow-button transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-secondary" />
                  Join Quiz
                </CardTitle>
                <CardDescription>Enter a code to join an existing quiz</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Enter join code..."
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === "Enter" && joinGame()}
                  className="uppercase"
                />
                <Button
                  onClick={joinGame}
                  variant="secondary"
                  className="w-full"
                >
                  Join Quiz
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto"
        >
          {[
            {
              icon: Zap,
              title: "Real-time Scoring",
              description: "Time-based points with instant feedback",
            },
            {
              icon: Users,
              title: "Live Leaderboard",
              description: "Animated rankings update in real-time",
            },
            {
              icon: Trophy,
              title: "Anti-cheat System",
              description: "Automatic detection and elimination",
            },
          ].map((feature, i) => (
            <Card key={i} className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="pt-6">
                <feature.icon className="w-8 h-8 text-white mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-white/80 text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
