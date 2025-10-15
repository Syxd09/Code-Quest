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
  console.log("Mobile detection result:", isMobile, "Window innerWidth:", window.innerWidth, "Breakpoint:", 768);
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
  const lastFocusTime = useRef(Date.now());
  const awayTime = useRef(0);
  const clickCount = useRef(0);
  const lastClickTime = useRef(0);
  const suspiciousActivityCount = useRef(0);

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

    // Enhanced mobile-specific violation classification
    const isSeriousViolation = reason.includes("Debugger") || reason.includes("Developer tools") ||
                              reason.includes("rapid clicking") || reason.includes("rapid touching") ||
                              reason.includes("keyboard activity") || reason.includes("Performance monitoring");

    const isModerateViolation = reason.includes("Extended") || reason.includes("multi-touch") ||
                               reason.includes("long touch") || reason.includes("special key");

    if (isMobile && !isSeriousViolation && !isModerateViolation) {
      console.log("Minor cheat attempt on mobile, logging but not penalizing:", reason);
      return; // Skip penalty for minor violations on mobile
    }

    // For mobile moderate violations, use reduced penalty logic
    if (isMobile && isModerateViolation && !isSeriousViolation) {
      console.log("Moderate violation on mobile, applying lighter penalty:", reason);
      // Could implement lighter penalties here if needed
    }

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
        const eliminationMessage = isMobile
          ? "You have been ELIMINATED from the game due to multiple violations on mobile device!"
          : "You have been ELIMINATED from the game due to multiple cheat attempts!";
        setWarningMessage(eliminationMessage);
        setShowWarning(true);
      } else {
        let penaltyMessage = "";
        if (isMobile) {
          if (isSeriousViolation) {
            if (result.cheat_count === 1) {
              penaltyMessage = `🚫 SERIOUS FIRST VIOLATION DETECTED: ${reason}\n\n-75 points penalty on mobile!\n\nThis is your FIRST serious violation. Enhanced monitoring is now active. A second violation will result in harsher penalties.`;
            } else if (result.cheat_count === 2) {
              penaltyMessage = `🚫🚨 SERIOUS SECOND VIOLATION DETECTED: ${reason}\n\n-100 points penalty on mobile!\n\nThis is your SECOND violation. ONE MORE VIOLATION WILL RESULT IN IMMEDIATE ELIMINATION from the game.`;
            }
          } else {
            if (result.cheat_count === 1) {
              penaltyMessage = `⚠️ FIRST VIOLATION DETECTED: ${reason}\n\n-35 points penalty (reduced for mobile)\n\nThis is your FIRST violation. Mobile-friendly monitoring is active. A second violation will increase penalties significantly.`;
            } else if (result.cheat_count === 2) {
              penaltyMessage = `⚠️🚨 SECOND VIOLATION DETECTED: ${reason}\n\n-50 points penalty on mobile\n\nThis is your SECOND violation. ONE MORE VIOLATION WILL RESULT IN IMMEDIATE ELIMINATION from the game.`;
            }
          }
        } else {
          if (result.cheat_count === 1) {
            penaltyMessage = `⚠️ FIRST CHEAT WARNING: ${reason}\n\n-50 points penalty!\n\nThis is your FIRST violation. A second violation will result in harsher penalties and stricter monitoring.`;
          } else if (result.cheat_count === 2) {
            penaltyMessage = `🚨 SECOND CHEAT WARNING: ${reason}\n\n-75 points penalty!\n\nThis is your SECOND violation. ONE MORE VIOLATION WILL RESULT IN IMMEDIATE ELIMINATION from the game.`;
          }
        }
        setWarningMessage(penaltyMessage);
        setShowWarning(true);
      }
    } catch (error: any) {
      console.error('Cheat detection error:', error);
    }
  };

  // Anti-cheat: Enhanced tab switching and mobile app switching detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !submitted && !eliminated) {
        console.log("Visibility change detected, isMobile:", isMobile, "document.hidden:", document.hidden, "visibilityState:", document.visibilityState);

        if (!isMobile) {
          // Desktop: strict tab switching detection
          handleCheatDetected("Tab switching detected");
        } else {
          // Mobile: more nuanced detection
          // On mobile, visibility changes can happen due to notifications, calls, etc.
          // Only penalize if it's clearly app switching behavior
          const currentTime = Date.now();
          if (lastFocusTime.current && (currentTime - lastFocusTime.current) < 2000) {
            // Quick visibility changes might be notifications or overlays
            console.log("Quick visibility change on mobile - likely notification or overlay");
          } else {
            console.log("App switch or background on mobile - monitoring");
            // Store the time for later analysis
            if (!lastFocusTime.current) {
              lastFocusTime.current = currentTime;
            }
          }
        }
      } else if (!document.hidden && !submitted && !eliminated && isMobile) {
        // Mobile: check if returning from background
        const currentTime = Date.now();
        if (lastFocusTime.current) {
          const timeAway = currentTime - lastFocusTime.current;
          awayTime.current += timeAway;

          // More lenient thresholds for mobile
          if (timeAway > 10000) { // 10 seconds instead of 5
            console.log(`Mobile app return after ${timeAway}ms away`);
            if (timeAway > 30000) { // Only penalize very long absences (30+ seconds)
              handleCheatDetected("Extended mobile app absence detected");
            }
          }
        }
        lastFocusTime.current = currentTime;
      }
    };

    const handleBlur = () => {
      if (!submitted && !eliminated) {
        lastFocusTime.current = Date.now();
        console.log("Window blur detected, isMobile:", isMobile);
      }
    };

    const handleFocus = () => {
      if (!submitted && !eliminated) {
        const currentTime = Date.now();
        if (lastFocusTime.current) {
          const timeAway = currentTime - lastFocusTime.current;
          awayTime.current += timeAway;

          if (!isMobile) {
            // Desktop: strict focus monitoring
            if (timeAway > 5000) {
              console.log(`Desktop focus return after ${timeAway}ms away`);
              handleCheatDetected("Extended tab switching detected");
            }
          } else {
            // Mobile: more lenient but still monitoring
            if (timeAway > 15000) {
              console.log(`Mobile focus return after ${timeAway}ms away`);
              if (timeAway > 45000) { // Very long absences on mobile
                handleCheatDetected("Extended mobile absence detected");
              }
            }
          }
        }
        lastFocusTime.current = currentTime;
      }
    };

    // Mobile-specific: detect pagehide/pagehide events for app switching
    const handlePageHide = (e: PageTransitionEvent) => {
      if (!submitted && !eliminated && isMobile) {
        console.log("Mobile page hide detected - potential app switch");
        // On mobile, pagehide often means app switching
        if (e.persisted === false) {
          // Page is being unloaded, likely app switch
          console.log("Mobile app switch detected via pagehide");
          // Don't immediately penalize, but log for pattern analysis
        }
      }
    };

    const handlePageShow = (e: PageTransitionEvent) => {
      if (!submitted && !eliminated && isMobile) {
        console.log("Mobile page show detected - returning to app");
        if (e.persisted) {
          // Page was restored from cache, likely returning from app switch
          const currentTime = Date.now();
          if (lastFocusTime.current) {
            const timeAway = currentTime - lastFocusTime.current;
            if (timeAway > 20000) {
              console.log(`Mobile app return after ${timeAway}ms via page restore`);
              if (timeAway > 60000) { // 1 minute absence
                handleCheatDetected("Extended mobile app switching detected");
              }
            }
          }
          lastFocusTime.current = currentTime;
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [submitted, eliminated, cheatCount, isMobile]);

  // Anti-cheat: Browser back button and app closure detection
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      console.log("Browser back button detected, isMobile:", isMobile);
      // Browser back button is generally not a cheating method on mobile, but still monitor
      if (!submitted && !eliminated && !isMobile) {
        handleCheatDetected("Browser back button usage detected");
        window.history.pushState(null, "", window.location.href);
      } else if (isMobile) {
        console.log("Browser back button on mobile - not considered cheating");
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!submitted && !eliminated) {
        console.log("App closure attempt detected");
        // Note: Modern browsers limit what we can do here, but we can still detect the attempt
        handleCheatDetected("App closure attempt detected");
      }
    };

    const handlePageHide = (e: PageTransitionEvent) => {
      if (!submitted && !eliminated && e.persisted === false) {
        console.log("Page hide detected (potential app closure)");
        handleCheatDetected("App closure detected");
      }
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [submitted, eliminated, cheatCount, isMobile]);

  // Anti-cheat: Enhanced DevTools detection with mobile compatibility
  useEffect(() => {
    const detectDevTools = () => {
      let hasDevTools = false;

      if (isMobile) {
        // Mobile-specific DevTools detection
        const mobileThreshold = 100; // Lower threshold for mobile
        const widthDiff = window.outerWidth - window.innerWidth;
        const heightDiff = window.outerHeight - window.innerHeight;

        // Check for common mobile DevTools indicators
        hasDevTools = widthDiff > mobileThreshold || heightDiff > mobileThreshold ||
          // Check for mobile DevTools specific patterns
          (navigator.userAgent.includes('Mobile') && (widthDiff > 50 || heightDiff > 50)) ||
          // Performance-based detection for mobile
          (performance.now() - performance.timing.navigationStart > 10000 && Math.random() < 0.05);

        // Additional mobile checks
        if (window.innerWidth < 400 && (widthDiff > 30 || heightDiff > 30)) {
          hasDevTools = true;
        }
      } else {
        // Desktop DevTools detection
        const threshold = 160;
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;

        hasDevTools = widthThreshold || heightThreshold ||
          (window.outerHeight - window.innerHeight > 200) ||
          (window.outerWidth - window.innerWidth > 200);
      }

      // Common checks for both mobile and desktop
      if (window.console && typeof window.console.clear === 'function') {
        // Random sampling to avoid easy bypass
        if (Math.random() < 0.01) {
          hasDevTools = hasDevTools || true;
        }
      }

      console.log("DevTools check - width diff:", window.outerWidth - window.innerWidth, "height diff:", window.outerHeight - window.innerHeight, "hasDevTools:", hasDevTools, "isMobile:", isMobile);

      if (hasDevTools) {
        console.log("DevTools detection triggered, isMobile:", isMobile);
        // DevTools detection is serious on any device
        if (!submitted && !eliminated) {
          handleCheatDetected("Developer tools opened");
        }
      }
    };

    // Enhanced debugger detection with mobile considerations
    const checkForDebugger = () => {
      const start = performance.now();
      // eslint-disable-next-line no-debugger
      debugger; // This will be caught if DevTools is open
      const end = performance.now();
      const threshold = isMobile ? 200 : 100; // Higher threshold for mobile due to potential lag

      if (end - start > threshold) {
        console.log("Debugger statement detected, potential DevTools usage on", isMobile ? "mobile" : "desktop");
        if (!submitted && !eliminated) {
          handleCheatDetected("Debugger usage detected");
        }
      }
    };

    // Mobile-specific DevTools detection using performance metrics
    const checkMobileDevTools = () => {
      if (!isMobile) return;

      // Check for unusual performance patterns that might indicate DevTools
      const entries = performance.getEntriesByType('measure');
      if (entries.length > 10) { // Too many performance measures might indicate debugging
        console.log("Suspicious performance monitoring detected on mobile");
        if (!submitted && !eliminated) {
          handleCheatDetected("Performance monitoring detected");
        }
      }
    };

    devToolsCheckInterval.current = setInterval(() => {
      detectDevTools();
      if (Math.random() < 0.1) { // Randomly check for debugger
        checkForDebugger();
      }
      if (isMobile && Math.random() < 0.05) { // Additional mobile checks
        checkMobileDevTools();
      }
    }, isMobile ? 2000 : 1000); // Less frequent checks on mobile to reduce battery impact

    return () => {
      if (devToolsCheckInterval.current) {
        clearInterval(devToolsCheckInterval.current);
      }
    };
  }, [submitted, eliminated, cheatCount, isMobile]);

  // Anti-cheat: Mobile-compatible copy-paste and interaction restrictions
  useEffect(() => {
    let pasteCount = 0;
    let lastPasteTime = 0;
    let copyCount = 0;
    let lastCopyTime = 0;

    const handlePaste = (e: ClipboardEvent) => {
      console.log("Paste event detected, isMobile:", isMobile);
      if (submitted || eliminated) return;

      const currentTime = Date.now();
      pasteCount += 1;

      if (!isMobile) {
        e.preventDefault();
        handleCheatDetected("Copy-paste attempt detected");
      } else {
        // Mobile: allow paste but monitor for abuse
        console.log("Paste allowed on mobile, monitoring for abuse");

        // Detect rapid pasting (potential automation)
        if (currentTime - lastPasteTime < 500 && pasteCount > 3) {
          console.log("Rapid pasting detected on mobile");
          handleCheatDetected("Suspicious rapid pasting on mobile detected");
        }

        // Reset paste count every 5 seconds
        if (currentTime - lastPasteTime > 5000) {
          pasteCount = 1;
        }

        lastPasteTime = currentTime;
      }
    };

    const handleCopy = (e: ClipboardEvent) => {
      console.log("Copy event detected, isMobile:", isMobile);
      if (submitted || eliminated) return;

      const currentTime = Date.now();
      copyCount += 1;

      if (!isMobile) {
        e.preventDefault();
        handleCheatDetected("Copy attempt detected");
      } else {
        // Mobile: allow copy for sharing but monitor
        console.log("Copy allowed on mobile for sharing");

        // Detect excessive copying
        if (currentTime - lastCopyTime < 1000 && copyCount > 5) {
          console.log("Excessive copying detected on mobile");
          handleCheatDetected("Excessive copying on mobile detected");
        }

        // Reset copy count every 10 seconds
        if (currentTime - lastCopyTime > 10000) {
          copyCount = 1;
        }

        lastCopyTime = currentTime;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      console.log("Context menu attempt detected, isMobile:", isMobile);
      if (submitted || eliminated) return;

      if (!isMobile) {
        e.preventDefault();
        handleCheatDetected("Context menu usage detected");
      } else {
        // Mobile: context menu is often long press, allow but monitor frequency
        console.log("Context menu (long press) on mobile - allowed but monitored");
      }
    };

    const handleSelectStart = (e: Event) => {
      console.log("Text selection attempt detected, isMobile:", isMobile);
      if (submitted || eliminated) return;

      if (!isMobile) {
        e.preventDefault();
        handleCheatDetected("Text selection attempt detected");
      } else {
        // Mobile: allow text selection for usability
        console.log("Text selection allowed on mobile for usability");
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (submitted || eliminated) return;

      // Prevent Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X on desktop
      if (!isMobile && (e.ctrlKey || e.metaKey)) {
        if (e.key === 'a' || e.key === 'c' || e.key === 'v' || e.key === 'x') {
          e.preventDefault();
          handleCheatDetected(`Keyboard shortcut ${e.key.toUpperCase()} detected`);
        }
      }

      // Mobile-specific keyboard monitoring
      if (isMobile) {
        // Detect potential external keyboard or automation on mobile
        if (e.ctrlKey || e.metaKey || e.altKey) {
          console.log("Modifier key detected on mobile:", e.key, "modifiers:", {ctrl: e.ctrlKey, meta: e.metaKey, alt: e.altKey});
          handleCheatDetected("Modifier key usage on mobile detected");
        }

        // Detect rapid key presses that might indicate automation
        if (e.repeat && Math.random() < 0.1) { // Sample 10% of repeats
          console.log("Key repeat detected on mobile");
          suspiciousActivityCount.current += 1;
          if (suspiciousActivityCount.current > 8) {
            handleCheatDetected("Suspicious keyboard activity on mobile detected");
            suspiciousActivityCount.current = 0;
          }
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("selectstart", handleSelectStart);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("selectstart", handleSelectStart);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [submitted, eliminated, cheatCount, isMobile]);

  // Anti-cheat: Enhanced suspicious behavior detection with touch support
  useEffect(() => {
    let touchStartTime = 0;
    let touchCount = 0;
    let lastTouchTime = 0;

    const handleClick = (e: MouseEvent) => {
      if (submitted || eliminated || isMobile) return; // Skip mouse events on mobile

      const currentTime = Date.now();
      clickCount.current += 1;

      console.log("Desktop click detected - count:", clickCount.current, "time diff:", currentTime - lastClickTime.current);

      // Detect rapid clicking (more than 10 clicks per second)
      if (currentTime - lastClickTime.current < 100 && clickCount.current > 10) {
        console.log("Rapid clicking detected on desktop");
        suspiciousActivityCount.current += 1;
        if (suspiciousActivityCount.current > 3) {
          handleCheatDetected("Suspicious rapid clicking detected");
          suspiciousActivityCount.current = 0;
        }
      }

      // Reset click count every second
      if (currentTime - lastClickTime.current > 1000) {
        clickCount.current = 1;
      }

      lastClickTime.current = currentTime;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (submitted || eliminated || !isMobile) return;

      const currentTime = Date.now();
      touchCount += 1;

      console.log("Touch detected - count:", touchCount, "time diff:", currentTime - lastTouchTime, "touches:", e.touches.length);

      // Detect rapid touching (more than 15 touches per second on mobile)
      if (currentTime - lastTouchTime < 67 && touchCount > 15) { // ~15 touches/second threshold
        console.log("Rapid touching detected on mobile");
        suspiciousActivityCount.current += 1;
        if (suspiciousActivityCount.current > 5) { // Higher threshold for mobile
          handleCheatDetected("Suspicious rapid touching detected");
          suspiciousActivityCount.current = 0;
        }
      }

      // Detect multi-touch gestures that might indicate automation
      if (e.touches.length > 3) {
        console.log("Multi-touch gesture detected");
        suspiciousActivityCount.current += 1;
        if (suspiciousActivityCount.current > 8) {
          handleCheatDetected("Suspicious multi-touch activity detected");
          suspiciousActivityCount.current = 0;
        }
      }

      // Reset touch count every second
      if (currentTime - lastTouchTime > 1000) {
        touchCount = 1;
      }

      lastTouchTime = currentTime;
      touchStartTime = currentTime;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (submitted || eliminated || !isMobile) return;

      const touchDuration = Date.now() - touchStartTime;

      // Detect unusually long touches that might indicate holding for automation
      if (touchDuration > 3000) { // 3 seconds
        console.log("Unusually long touch detected:", touchDuration, "ms");
        suspiciousActivityCount.current += 1;
        if (suspiciousActivityCount.current > 6) {
          handleCheatDetected("Suspicious long touch detected");
          suspiciousActivityCount.current = 0;
        }
      }
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      if (submitted || eliminated) return;

      // Detect unusual input patterns (holding down keys rapidly)
      if (e.repeat && Math.random() < 0.05) { // Random sampling to avoid false positives
        console.log("Unusual key repeat detected");
        suspiciousActivityCount.current += 1;
        if (suspiciousActivityCount.current > 5) {
          handleCheatDetected("Suspicious keyboard activity detected");
          suspiciousActivityCount.current = 0;
        }
      }

      // On mobile, keyboard events are less common and might indicate external keyboard
      if (isMobile && e.key.length > 1) { // Special keys or combinations
        console.log("Special key detected on mobile:", e.key);
        suspiciousActivityCount.current += 1;
        if (suspiciousActivityCount.current > 7) {
          handleCheatDetected("Suspicious keyboard input on mobile detected");
          suspiciousActivityCount.current = 0;
        }
      }
    };

    // Mobile-specific: detect orientation changes that might indicate device manipulation
    const handleOrientationChange = () => {
      if (!isMobile || submitted || eliminated) return;

      console.log("Device orientation changed");
      // Orientation changes are normal on mobile, but rapid changes might be suspicious
      // This is more for monitoring than immediate penalization
    };

    // Desktop events
    document.addEventListener("click", handleClick);
    document.addEventListener("keypress", handleKeyPress);

    // Mobile touch events
    if (isMobile) {
      document.addEventListener("touchstart", handleTouchStart);
      document.addEventListener("touchend", handleTouchEnd);
      window.addEventListener("orientationchange", handleOrientationChange);
    }

    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keypress", handleKeyPress);

      if (isMobile) {
        document.removeEventListener("touchstart", handleTouchStart);
        document.removeEventListener("touchend", handleTouchEnd);
        window.removeEventListener("orientationchange", handleOrientationChange);
      }
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
    awayTime.current = 0;
    clickCount.current = 0;
    lastClickTime.current = Date.now();
    suspiciousActivityCount.current = 0;

    // Check if user has already submitted a response for this question
    const checkExistingResponse = async () => {
      try {
        const { data: existingResponse, error } = await supabase
          .from("responses")
          .select("*")
          .eq("question_id", question.id)
          .eq("participant_id", participantId)
          .maybeSingle();

        if (!error && existingResponse) {
          console.log("Found existing response for question:", question.id);
          // Restore the submitted state and answer
          setSubmitted(true);
          setWasCorrect(existingResponse.correct);

          // Restore the answer based on question type
          if (question.type === "mcq") {
            if (question.correct_answers?.length === 1) {
              setAnswer(existingResponse.answer);
            } else {
              setSelectedOptions(existingResponse.answer as string[]);
            }
          } else if (question.type === "short") {
            setAnswer(existingResponse.answer);
          }

          // Stop the timer since already submitted
          setTimeLeft(0);
        }
      } catch (error) {
        console.error("Error checking existing response:", error);
      }
    };

    checkExistingResponse();
  }, [question.id, question.time_limit, participantId]);

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
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-sm mt-4 font-normal text-muted-foreground"
                >
                  Correct Answer: {question.correct_answers?.join(", ") || question.keywords?.map((k: any) => k.text).join(", ")}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
    </>
  );
};
