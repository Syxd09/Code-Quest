import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserCircle } from "lucide-react";

const JoinGame = () => {
  const { joinCode } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const fetchGame = async () => {
      if (!joinCode) return;

      try {
        // Use secure function to lookup game without exposing admin_id
        const { data, error } = await supabase
          .rpc('find_game_by_join_code', {
            p_join_code: joinCode.toUpperCase()
          });

        if (error) throw error;
        
        if (!data || data.length === 0) {
          throw new Error("Game not found");
        }
        
        setGame(data[0]);
      } catch (error: any) {
        toast.error("Game not found");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [joinCode, navigate]);

  useEffect(() => {
    const pending = localStorage.getItem('join_intent');
    if (pending) {
      try {
        const { name: savedName } = JSON.parse(pending);
        if (savedName) setName(savedName);
      } catch {}
    }
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    setJoining(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Persist intent and redirect to auth, then back here
        localStorage.setItem('join_intent', JSON.stringify({ name: name.trim(), joinCode }));
        localStorage.setItem('redirectTo', window.location.pathname);
        toast.message("Please sign in to join the quiz");
        navigate('/auth');
        return;
      }

      const fingerprint = `${navigator.userAgent}-${Date.now()}`;

      const { error } = await supabase.from("participants").insert({
        user_id: user.id,
        name: name.trim(),
        game_id: game.id,
        fingerprint,
      });

      if (error) throw error;

      localStorage.setItem(
        `quiz_session_${game.id}`,
        JSON.stringify({ userId: user.id, name, fingerprint })
      );
      localStorage.removeItem('join_intent');
      localStorage.removeItem('redirectTo');

      toast.success("Joined successfully!");
      navigate(`/play/${game.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to join game");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!game) {
    return null;
  }

    return (
   <div className="min-h-screen flex flex-col md:flex-row">
     {/* Left Side - Image (60%) - Hidden on mobile */}
     <div className="w-full md:w-3/5 hidden md:block">
       <img
         src="/your-image-path.jpg"
         alt="Quiz Illustration"
         className="w-full h-full object-cover"
       />
     </div>

     {/* Right Side - Join Game (40%) */}
     <div className="w-full md:w-2/5 flex items-center justify-center p-4 md:p-6 bg-gradient-hero min-h-screen md:min-h-0">
       <motion.div
         initial={{ opacity: 0, scale: 0.95 }}
         animate={{ opacity: 1, scale: 1 }}
         transition={{ duration: 0.5 }}
         className="w-full max-w-md px-4"
       >
         <Card className="shadow-card">
           <CardHeader className="text-center">
             <UserCircle className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-primary" />
             <CardTitle className="text-xl md:text-2xl">{game.title}</CardTitle>
             <CardDescription className="text-sm md:text-base">Enter your name to join the quiz</CardDescription>
           </CardHeader>
           <CardContent>
             <form onSubmit={handleJoin} className="space-y-4">
               <div className="space-y-2">
                 <Label htmlFor="name" className="text-sm md:text-base">Your Name</Label>
                 <Input
                   id="name"
                   type="text"
                   placeholder="Enter your name..."
                   value={name}
                   onChange={(e) => {
                     setName(e.target.value);
                     localStorage.setItem(
                       "join_intent",
                       JSON.stringify({ name: e.target.value, joinCode })
                     );
                   }}
                   autoFocus
                   required
                   className="text-base md:text-lg py-3"
                 />
               </div>
               <Button
                 type="submit"
                 className="w-full shadow-button text-base md:text-lg py-3 min-h-[48px] touch-manipulation"
                 disabled={joining}
               >
                 {joining ? "Joining..." : "Join Quiz"}
               </Button>
             </form>
           </CardContent>
         </Card>
       </motion.div>
     </div>
   </div>
 );

};

export default JoinGame;
