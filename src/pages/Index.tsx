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
  className="flex items-center justify-center mb-16 space-x-6"
>
  <div className="flex flex-row items-center space-x-6 bg-slate-800 p-6 rounded-lg">
  {/* Logo image */}
  <img
    src="public/DSBA-LOGO.png"
    alt="Dayananda Sagar Business Academy Logo"
    className="w-32 h-32 object-contain"
  />

  {/* Academy name text */}
  <div>
    <span className="text-3xl md:text-5xl font-bold text-white">
      Dayananda Sagar Business Academy
    </span>
  </div>
  </div>
</motion.div>


    {/* Action Cards */}
    {/* Action Cards */}
<div className="flex items-center justify-center mb-16">
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.6, delay: 0.2 }}
    className="w-full max-w-md"
  >
    <Card className="shadow-card hover:shadow-button transition-shadow">
      <CardHeader>
        <CardTitle>Create Quiz</CardTitle>
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
</div>
  </div>
</div>
  );
};

export default Index;
