import React, { useState, useEffect, useRef } from "react";
import { Milestone, ChatMessage, KeyConcept } from "../types";
import {
  BookOpen,
  Volume2,
  VolumeX,
  Sparkles,
  HelpCircle,
  Award,
  Send,
  RefreshCw,
  CheckCircle,
  XCircle,
  ArrowRight,
  MessageSquareCode,
  Info,
  Play,
  Pause,
  SkipBack,
  SkipForward,
} from "lucide-react";

function cleanMarkdownSymbols(text: string): string {
  if (!text) return "";
  
  const trimmed = text.trim();
  // Filter out dividers or lines consisting entirely of -, *, _, or spaces
  if (/^[-\*_ \s]+$/.test(trimmed)) {
    return "";
  }

  let cleaned = text;

  // Strip headers like ###, ##, # at the start of sentence
  cleaned = cleaned.replace(/^#+\s+/, "");

  // Strip markdown bold/italic symbols (***, **, *, ___, __, _)
  cleaned = cleaned.replace(/\*\*\*/g, "");
  cleaned = cleaned.replace(/\*\*/g, "");
  cleaned = cleaned.replace(/\*/g, "");
  cleaned = cleaned.replace(/___/g, "");
  cleaned = cleaned.replace(/__/g, "");
  cleaned = cleaned.replace(/_/g, "");

  // Strip inline code backticks (`)
  cleaned = cleaned.replace(/`/g, "");

  // Strip list bullets like "- ", "* ", "+ ", "• " at the start of a sentence
  cleaned = cleaned.replace(/^[\s\-\*\+•]+\s*/, "");

  // Strip blockquote symbols like "> " at the start
  cleaned = cleaned.replace(/^>\s*/, "");

  return cleaned.trim();
}

function cleanTextForSpeech(text: string): string {
  if (!text) return "";

  let cleaned = text;

  // 1. Remove markdown bold/italic tags and headers
  cleaned = cleaned.replace(/[\*\#_`>]/g, "");

  // 2. Remove any emojis & pictographs (Unicode Blocks)
  try {
    cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1F000}-\u{1F0BF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{2B50}\u{2B55}\u{2934}\u{2935}\u{2B05}-\u{2B07}\u{2B1B}\u{2B1C}\u{3297}\u{3299}\u{303D}\u{3030}\u{200d}]/gu, "");
  } catch (e) {
    // Fallback if unicode property escape regex fails in an old environment
    cleaned = cleaned.replace(/[\u2700-\u27BF]|[\u2600-\u26FF]|[\u1F000-\u1F9FF]/g, "");
  }

  // Also manually target typical emojis/symbols in Japanese courses
  cleaned = cleaned.replace(/[🔑💡🔊👀🌟★☆●◆■▲▼◀▶••☕🍲🍣🚅🚆🚇🚌🚕🛫🛬🛂🛃🛄🚪🛒🛍️🏨❤️🎌😊]/g, "");

  // 3. Completely remove colons and middle dots to prevent them from being pronounced as "点" (dot) or "冒号" (colon)
  cleaned = cleaned.replace(/[:：∶ː⁚·•・]/g, "");

  // 4. Replace wave dash and tilde with space (so it doesn't read "wave dash" or "波浪号")
  cleaned = cleaned.replace(/[〜~]/g, " ");

  // 5. Clean extra spaces
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

function splitTextIntoSentences(title: string, summary: string): string[] {
  const list: string[] = [];
  
  const cleanTitle = cleanMarkdownSymbols(title);
  if (cleanTitle) {
    list.push(cleanTitle);
  }

  if (summary && summary.trim()) {
    // Split by newlines to keep dialog line and translation together
    const lines = summary.split("\n");
    lines.forEach((line) => {
      const cleaned = cleanMarkdownSymbols(line);
      if (cleaned) {
        list.push(cleaned);
      }
    });
  }
  return list;
}

interface AudioSegment {
  text: string;
  lang: "ja-JP" | "zh-CN" | "zh-HK";
}

function parseTextToSegments(text: string, useCantonese: boolean): AudioSegment[] {
  const chineseLang = useCantonese ? "zh-HK" : "zh-CN";
  const segments: AudioSegment[] = [];

  if (!text) return segments;

  // 1. Remove all square brackets and their contents (which are Romaji pronunciation annotations)
  let cleanedText = text.replace(/\[[^\]]*\]/g, "");

  // 2. Remove any parenthesis that contains ONLY Latin characters/spaces (Romaji without Kana/Kanji)
  cleanedText = cleanedText.replace(/\(([^)]*)\)/g, (match, p1) => {
    const hasCn = /[\u4e00-\u9fa5]/.test(p1);
    const hasJp = /[\u3040-\u309F\u30A0-\u30FF]/.test(p1);
    // Keep it if it has Chinese/Japanese characters or contains a slash '/' (usually meaning translation)
    if (hasCn || hasJp || p1.includes("/")) {
      return match;
    }
    return "";
  });

  cleanedText = cleanedText.replace(/（([^）]*)）/g, (match, p1) => {
    const hasCn = /[\u4e00-\u9fa5]/.test(p1);
    const hasJp = /[\u3040-\u309F\u30A0-\u30FF]/.test(p1);
    if (hasCn || hasJp || p1.includes("/")) {
      return `(${p1})`; // uniform to half-width for subsequent processing
    }
    return "";
  });

  // Process parenthesized parts and non-parenthesized parts in order.
  const parts = cleanedText.split(/(\([^)]+\))/g);

  for (let part of parts) {
    if (!part) continue;

    if (part.startsWith("(") && part.endsWith(")")) {
      const content = part.slice(1, -1).trim();
      
      // Case 1: Contains a slash '/' (e.g. "Sumimasen. / 不好意思，打扰一下。")
      if (content.includes("/")) {
        const slashIdx = content.indexOf("/");
        const beforeSlash = content.slice(0, slashIdx).trim();
        const afterSlash = content.slice(slashIdx + 1).trim();

        // Check if beforeSlash has Chinese or Japanese characters
        const beforeHasCn = /[\u4e00-\u9fa5]/.test(beforeSlash);
        const beforeHasJp = /[\u3040-\u309F\u30A0-\u30FF]/.test(beforeSlash);
        if (beforeHasCn || beforeHasJp) {
          segments.push({
            text: beforeSlash,
            lang: beforeHasJp ? "ja-JP" : chineseLang,
          });
        }

        // Check if afterSlash has Chinese or Japanese characters
        const afterHasCn = /[\u4e00-\u9fa5]/.test(afterSlash);
        const afterHasJp = /[\u3040-\u309F\u30A0-\u30FF]/.test(afterSlash);
        if (afterHasCn || afterHasJp) {
          segments.push({
            text: afterSlash,
            lang: afterHasJp ? "ja-JP" : chineseLang,
          });
        }
      } else {
        // Case 2: No slash. Let's see if it has Chinese or Japanese.
        const hasCn = /[\u4e00-\u9fa5]/.test(content);
        const hasJp = /[\u3040-\u309F\u30A0-\u30FF]/.test(content);
        if (hasCn || hasJp) {
          segments.push({
            text: content,
            lang: hasJp ? "ja-JP" : chineseLang,
          });
        }
      }
    } else {
      // Non-parenthesized text. Could contain mixed Chinese and Japanese (e.g. "游客：すみません。")
      let subParts: string[] = [];
      const colonMatch = part.match(/^([^：:]+[:：])\s*(.*)$/);
      if (colonMatch) {
        subParts.push(colonMatch[1]);
        if (colonMatch[2]) {
          subParts.push(colonMatch[2]);
        }
      } else {
        subParts.push(part);
      }

      for (let subPart of subParts) {
        const trimmed = subPart.trim();
        if (!trimmed) continue;

        const hasKana = /[\u3040-\u309F\u30A0-\u30FF]/.test(trimmed);
        if (hasKana) {
          segments.push({
            text: trimmed,
            lang: "ja-JP",
          });
        } else {
          segments.push({
            text: trimmed,
            lang: chineseLang,
          });
        }
      }
    }
  }

  return segments
    .map((seg) => {
      // Clean up text specifically for speech (remove emojis, format symbols, remove colons)
      let t = cleanTextForSpeech(seg.text);
      t = t.replace(/[()（）]/g, "").trim();
      return { ...seg, text: t };
    })
    .filter((seg) => seg.text.length > 0);
}

interface MilestoneStudyProps {
  milestone: Milestone;
  milestoneIndex: number;
  onPassMilestone: (scorePercentage: number) => void;
  completed: boolean;
  savedChats: ChatMessage[];
  onSaveChats: (chats: ChatMessage[]) => void;
}

type TabType = "reading" | "concepts" | "chat" | "quiz";

export default function MilestoneStudy({
  milestone,
  milestoneIndex,
  onPassMilestone,
  completed,
  savedChats,
  onSaveChats,
}: MilestoneStudyProps) {
  const [activeTab, setActiveTab] = useState<TabType>("reading");

  // Advanced Audiobook Player States
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [audioLang, setAudioLang] = useState<"mandarin" | "cantonese">("mandarin");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState<number>(0);
  const [audiobookPlaying, setAudiobookPlaying] = useState<boolean>(false);

  // Voice Speech (TTS) states
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const audiobookSentences = React.useMemo(() => {
    return splitTextIntoSentences(milestone.title, milestone.summary);
  }, [milestone]);

  // Concept card flip states
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});

  // Chat states
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(savedChats);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Quiz states
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, boolean>>({}); // records correctness

  // Reset tab-specific state when switching milestones
  useEffect(() => {
    setActiveTab("reading");
    setFlippedCards({});
    setQuizStarted(false);
    setCurrentQuestionIdx(0);
    setSelectedOption(null);
    setQuizScore(0);
    setQuizFinished(false);
    setQuizAnswers({});
    setChatMessages(savedChats);
    stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [milestoneIndex]);

  // Sync chats back to App state
  useEffect(() => {
    onSaveChats(chatMessages);
  }, [chatMessages]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (activeTab === "chat" && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeTab]);

  // Load and update SpeechSynthesis voices
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    synthRef.current = window.speechSynthesis;

    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
      stopSpeaking();
    };
  }, []);

  // Filter voices based on selected dialect (Mandarin vs Cantonese)
  const filteredVoices = React.useMemo(() => {
    const langCode = audioLang === "cantonese" ? "zh-hk" : "zh-cn";
    return availableVoices.filter((v) => {
      const l = v.lang.toLowerCase().replace("_", "-");
      if (audioLang === "cantonese") {
        return (
          l.includes("zh-hk") ||
          l.includes("zh-mo") ||
          v.name.includes("Cantonese") ||
          v.name.includes("粤语") ||
          v.name.includes("Hong Kong")
        );
      } else {
        return (
          l.includes("zh-cn") ||
          l.includes("zh-sg") ||
          l.includes("zh-tw") ||
          v.name.includes("Mandarin") ||
          v.name.includes("普通话") ||
          v.name.includes("Putonghua") ||
          v.name.includes("Mainland")
        );
      }
    });
  }, [availableVoices, audioLang]);

  // Filter voices for Japanese native speech
  const japaneseVoices = React.useMemo(() => {
    return availableVoices.filter((v) => {
      const l = v.lang.toLowerCase().replace("_", "-");
      return l.includes("ja-jp") || v.name.includes("Japanese") || v.name.includes("日本語");
    });
  }, [availableVoices]);

  // Select premium Japanese voice if available
  const selectedJapaneseVoice = React.useMemo(() => {
    if (japaneseVoices.length > 0) {
      const premiumVoice = japaneseVoices.find((v) =>
        v.name.includes("Google") ||
        v.name.includes("Microsoft") ||
        v.name.includes("Premium") ||
        v.name.includes("Neural") ||
        v.name.includes("Siri")
      );
      return premiumVoice || japaneseVoices[0];
    }
    return null;
  }, [japaneseVoices]);

  // Sync default selected voice name when dialect/filteredVoices change
  useEffect(() => {
    if (filteredVoices.length > 0) {
      const premiumVoice = filteredVoices.find((v) =>
        v.name.includes("Google") ||
        v.name.includes("Microsoft") ||
        v.name.includes("Premium") ||
        v.name.includes("Neural") ||
        v.name.includes("Tingting") ||
        v.name.includes("Sinji") ||
        v.name.includes("Xiaoxiao") ||
        v.name.includes("Siri")
      );
      setSelectedVoiceName(premiumVoice ? premiumVoice.name : filteredVoices[0].name);
    } else {
      setSelectedVoiceName("");
    }
  }, [filteredVoices]);

  // --- Voice Speech (TTS) Functions ---
  const playSentence = (index: number) => {
    if (!synthRef.current) return;

    // Stop current voice synthesis
    synthRef.current.cancel();

    if (index < 0 || index >= audiobookSentences.length) {
      setAudiobookPlaying(false);
      return;
    }

    setCurrentSentenceIdx(index);
    setAudiobookPlaying(true);

    const rawText = audiobookSentences[index];
    const segments = parseTextToSegments(rawText, audioLang === "cantonese");

    if (segments.length === 0) {
      // If no text to speak, skip to the next sentence
      setTimeout(() => {
        playSentence(index + 1);
      }, 50);
      return;
    }

    // Helper to play segments recursively in sequence
    const playSeg = (segIndex: number) => {
      if (!synthRef.current || !audiobookPlaying) return;

      if (segIndex >= segments.length) {
        // Finished all segments in this sentence. Play next sentence.
        setTimeout(() => {
          if (index + 1 < audiobookSentences.length) {
            playSentence(index + 1);
          } else {
            setAudiobookPlaying(false);
            setCurrentSentenceIdx(0);
          }
        }, 450); // Natural pause between sentences
        return;
      }

      const segment = segments[segIndex];
      const utterance = new SpeechSynthesisUtterance(segment.text);

      // Configure language and voice
      if (segment.lang === "ja-JP") {
        utterance.lang = "ja-JP";
        if (selectedJapaneseVoice) {
          utterance.voice = selectedJapaneseVoice;
        }
      } else {
        utterance.lang = segment.lang; // "zh-CN" or "zh-HK"
        if (selectedVoiceName) {
          const voice = availableVoices.find((v) => v.name === selectedVoiceName);
          if (voice) {
            utterance.voice = voice;
          }
        }
      }

      utterance.rate = playbackRate;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        // Play next segment after a brief natural gap (e.g. 150ms)
        setTimeout(() => {
          if (utteranceRef.current === utterance) {
            playSeg(segIndex + 1);
          }
        }, 150);
      };

      utterance.onerror = (e) => {
        console.log("Segment play error:", e);
        if (e.error !== "interrupted" && e.error !== "canceled") {
          // Fallback: continue to next segment
          playSeg(segIndex + 1);
        }
      };

      utteranceRef.current = utterance;
      synthRef.current.speak(utterance);
    };

    // Start playing the first segment
    playSeg(0);
  };

  const pauseAudiobook = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setAudiobookPlaying(false);
  };

  const resumeAudiobook = () => {
    playSentence(currentSentenceIdx);
  };

  const toggleSpeech = () => {
    if (showAudioPlayer) {
      pauseAudiobook();
      setShowAudioPlayer(false);
    } else {
      setShowAudioPlayer(true);
      setTimeout(() => playSentence(0), 100);
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setAudiobookPlaying(false);
    setIsSpeaking(false);
  };

  // --- Concept Cards Flipping ---
  const handleCardClick = (idx: number) => {
    setFlippedCards((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  // Speak concept term in Japanese
  const speakConceptTerm = (term: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card from flipping when clicking pronunciation button!
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    // Extract Japanese characters by stripping out all English, Romaji in square brackets, and Hiragana/English annotations in parentheses
    let jpText = term;
    jpText = jpText.replace(/\[[^\]]*\]/g, "");
    jpText = jpText.replace(/\([^)]*\)/g, "").replace(/（[^）]*）/g, "").trim();
    
    const utterance = new SpeechSynthesisUtterance(jpText);
    utterance.lang = "ja-JP";
    if (selectedJapaneseVoice) {
      utterance.voice = selectedJapaneseVoice;
    }
    utterance.rate = 0.85; // Slightly slower for clear learning
    
    window.speechSynthesis.speak(utterance);
  };


  // --- Chat Functions ---
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isChatLoading) return;

    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setChatInput("");
    setIsChatLoading(true);
    setChatError(null);

    try {
      const response = await fetch("/api/chat-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestoneTitle: milestone.title,
          milestoneSummary: milestone.summary,
          keyConcepts: milestone.keyConcepts,
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        try {
          const errData = JSON.parse(errText);
          throw new Error(errData.error || "API returned an error");
        } catch (e) {
          throw new Error(`Server Error: ${errText.slice(0, 100)}`);
        }
      }

      const data = await response.json();
      const aiMessage: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: "assistant",
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setChatMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      console.error(err);
      setChatError(err.message || "连接学习助教失败，请稍后重试。");
    } finally {
      setIsChatLoading(false);
    }
  };

  const clearChat = () => {
    setChatMessages([]);
  };

  // Pre-packed prompt recommendations
  const smartSuggestions = [
    `请用一个通俗的故事，帮我解释这一关的核心概念`,
    `我不太懂这里的 "${milestone.keyConcepts[0]?.term || "核心概念"}"，能举例说明吗？`,
    `我想知道这些观点，怎样应用到我日常的生活和工作中？`,
  ];

  // --- Quiz Functions ---
  const handleOptionSelect = (optionIdx: number) => {
    if (selectedOption !== null) return; // Prevent double selecting
    setSelectedOption(optionIdx);

    const isCorrect = optionIdx === milestone.quizQuestions[currentQuestionIdx].correctIndex;
    if (isCorrect) {
      setQuizScore((prev) => prev + 1);
    }
    
    setQuizAnswers((prev) => ({
      ...prev,
      [currentQuestionIdx]: isCorrect,
    }));
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    if (currentQuestionIdx < milestone.quizQuestions.length - 1) {
      setCurrentQuestionIdx((prev) => prev + 1);
    } else {
      setQuizFinished(true);
      // Calculate score percentage
      const finalPercentage = Math.round((quizScore / milestone.quizQuestions.length) * 100);
      onPassMilestone(finalPercentage);
    }
  };

  const restartQuiz = () => {
    setCurrentQuestionIdx(0);
    setSelectedOption(null);
    setQuizScore(0);
    setQuizFinished(false);
    setQuizAnswers({});
    setQuizStarted(true);
  };

  return (
    <div id="milestone-study-panel" className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-full min-h-[580px]">
      {/* Panel Tab Buttons */}
      <div id="study-panel-tabs" className="bg-slate-50 border-b border-slate-100 px-6 pt-4 flex gap-4 overflow-x-auto scrollbar-none">
        <button
          onClick={() => { setActiveTab("reading"); stopSpeaking(); }}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all relative ${
            activeTab === "reading"
              ? "text-indigo-600 font-bold"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          深度精读
          {activeTab === "reading" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
          )}
        </button>

        <button
          onClick={() => { setActiveTab("concepts"); stopSpeaking(); }}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all relative ${
            activeTab === "concepts"
              ? "text-indigo-600 font-bold"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Info className="w-4 h-4" />
          核心概念
          <span className="bg-indigo-50 text-indigo-600 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
            {milestone.keyConcepts.length}
          </span>
          {activeTab === "concepts" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
          )}
        </button>

        <button
          onClick={() => { setActiveTab("chat"); stopSpeaking(); }}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all relative ${
            activeTab === "chat"
              ? "text-indigo-600 font-bold"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          AI 助教答疑
          {activeTab === "chat" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
          )}
        </button>

        <button
          onClick={() => { setActiveTab("quiz"); stopSpeaking(); }}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all relative ${
            activeTab === "quiz"
              ? "text-indigo-600 font-bold"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          里程碑测试
          {completed ? (
            <span className="bg-emerald-100 text-emerald-700 text-[9px] px-1.5 py-0.2 rounded-full font-bold">
              已通关
            </span>
          ) : (
            <span className="bg-rose-100 text-rose-700 text-[9px] px-1.5 py-0.2 rounded-full font-bold animate-pulse">
              待通关
            </span>
          )}
          {activeTab === "quiz" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
          )}
        </button>
      </div>

      {/* Main Tab Contents */}
      <div id="study-panel-body" className="flex-1 p-6 overflow-y-auto">
        
        {/* TAB 1: READING SECTION */}
        {activeTab === "reading" && (
          <div id="reading-tab-view" className="space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-snug">
                {milestone.title}
              </h1>
              
              {/* Voice TTS Button */}
              <button
                onClick={toggleSpeech}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all shadow-sm ${
                  showAudioPlayer
                    ? "bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {showAudioPlayer ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-indigo-600" />
                    <span>关闭听书</span>
                    {audiobookPlaying && (
                      <div className="flex gap-0.5 items-end h-3 ml-1">
                        <div className="w-0.5 h-2 bg-indigo-500 rounded animate-wave-1 animate-pulse" />
                        <div className="w-0.5 h-3 bg-indigo-500 rounded animate-wave-2 animate-pulse" />
                        <div className="w-0.5 h-1 bg-indigo-500 rounded animate-wave-3 animate-pulse" />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>听书模式</span>
                  </>
                )}
              </button>
            </div>

            {/* AUDIOBOOK PLAYER CONSOLE */}
            {showAudioPlayer && (
              <div className="bg-gradient-to-r from-slate-50 to-indigo-50/40 rounded-3xl border border-indigo-100/70 p-5 shadow-xs space-y-4 animate-fadeIn">
                {/* Header info */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-indigo-100/50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">智能 AI 听书播放器</h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {audiobookPlaying ? "正在为您朗读文章要点..." : "已暂停 - 点击播放或选择句子开始"}
                      </p>
                    </div>
                  </div>
                  
                  {/* Lang Switcher */}
                  <div className="flex items-center gap-2">
                    <div className="bg-slate-200/50 p-0.5 rounded-lg flex text-[11px] font-medium text-slate-700 border border-slate-200">
                      <button
                        onClick={() => {
                          setAudioLang("mandarin");
                          if (audiobookPlaying) {
                            setTimeout(() => playSentence(currentSentenceIdx), 50);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-md transition-all ${
                          audioLang === "mandarin" ? "bg-white text-indigo-600 shadow-xs font-bold" : "hover:text-slate-900"
                        }`}
                      >
                        普通话
                      </button>
                      <button
                        onClick={() => {
                          setAudioLang("cantonese");
                          if (audiobookPlaying) {
                            setTimeout(() => playSentence(currentSentenceIdx), 50);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-md transition-all ${
                          audioLang === "cantonese" ? "bg-white text-indigo-600 shadow-xs font-bold" : "hover:text-slate-900"
                        }`}
                      >
                        粤语 (繁)
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        pauseAudiobook();
                        setShowAudioPlayer(false);
                      }}
                      className="text-slate-400 hover:text-slate-600 text-[11px] px-2 py-1 rounded-md hover:bg-slate-200/50 transition-all font-medium"
                    >
                      隐藏
                    </button>
                  </div>
                </div>

                {/* Slider / Actions */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  {/* Select Voice & Speed Control */}
                  <div className="md:col-span-6 flex flex-wrap gap-4 items-center">
                    {/* Voice Select */}
                    <div className="flex-1 min-w-[140px] space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        声线角色 ({filteredVoices.length}种可选)
                      </label>
                      <select
                        value={selectedVoiceName}
                        onChange={(e) => {
                          setSelectedVoiceName(e.target.value);
                          if (audiobookPlaying) {
                            setTimeout(() => playSentence(currentSentenceIdx), 50);
                          }
                        }}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {filteredVoices.length > 0 ? (
                          filteredVoices.map((voice) => (
                            <option key={voice.name} value={voice.name}>
                              {voice.name} ({voice.lang})
                            </option>
                          ))
                        ) : (
                          <option value="">系统默认声音</option>
                        )}
                      </select>
                    </div>

                    {/* Playback Rate */}
                    <div className="w-[110px] space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>播放语速</span>
                        <span className="text-indigo-600 font-mono font-bold">{playbackRate}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.75"
                        max="1.5"
                        step="0.05"
                        value={playbackRate}
                        onChange={(e) => {
                          const rate = parseFloat(e.target.value);
                          setPlaybackRate(rate);
                          if (audiobookPlaying) {
                            setTimeout(() => playSentence(currentSentenceIdx), 50);
                          }
                        }}
                        className="w-full accent-indigo-600 h-1 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Play controls & Seek */}
                  <div className="md:col-span-6 flex items-center gap-4">
                    {/* Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        disabled={currentSentenceIdx === 0}
                        onClick={() => playSentence(Math.max(0, currentSentenceIdx - 1))}
                        className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 flex items-center justify-center transition-all shadow-xs"
                        title="上一句"
                      >
                        <SkipBack className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={audiobookPlaying ? pauseAudiobook : resumeAudiobook}
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition-all shadow-sm ${
                          audiobookPlaying ? "bg-rose-500 hover:bg-rose-600" : "bg-indigo-600 hover:bg-indigo-700"
                        }`}
                      >
                        {audiobookPlaying ? (
                          <Pause className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        )}
                      </button>

                      <button
                        disabled={currentSentenceIdx === audiobookSentences.length - 1}
                        onClick={() => playSentence(Math.min(audiobookSentences.length - 1, currentSentenceIdx + 1))}
                        className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 flex items-center justify-center transition-all shadow-xs"
                        title="下一句"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Progress Slider */}
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono font-bold">
                        <span>第 {currentSentenceIdx + 1} / {audiobookSentences.length} 句</span>
                        <span>{Math.round(((currentSentenceIdx + 1) / audiobookSentences.length) * 100)}%</span>
                      </div>
                      
                      <input
                        type="range"
                        min="0"
                        max={audiobookSentences.length - 1}
                        value={currentSentenceIdx}
                        onChange={(e) => {
                          const idx = parseInt(e.target.value, 10);
                          setCurrentSentenceIdx(idx);
                          playSentence(idx);
                        }}
                        className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Core Text Box */}
            <div className="bg-slate-50/50 rounded-3xl border border-slate-200/60 p-6 md:p-8">
              <div className="text-slate-700 leading-relaxed font-sans text-base tracking-wide space-y-4">
                {showAudioPlayer ? (
                  <div className="space-y-3 leading-loose">
                    {audiobookSentences.map((sentence, idx) => {
                      const isActive = idx === currentSentenceIdx;
                      const isTitle = idx === 0; // The first element is our title
                      
                      if (isTitle) {
                        return (
                          <p key={idx} className="mb-4">
                            <span
                              onClick={() => playSentence(idx)}
                              className={`cursor-pointer transition-all p-1 rounded-lg border text-lg font-bold ${
                                isActive
                                  ? "bg-amber-100 text-slate-900 border-amber-300 font-bold px-2 shadow-xs"
                                  : "bg-indigo-50/30 text-indigo-950 border-indigo-100 hover:bg-indigo-100/50"
                              }`}
                              title="点击这句播放"
                            >
                              {sentence}
                            </span>
                          </p>
                        );
                      }
                      
                      return (
                        <span
                          key={idx}
                          onClick={() => playSentence(idx)}
                          className={`inline-block mr-2 cursor-pointer transition-all p-1.5 rounded-lg border text-base ${
                            isActive
                              ? "bg-amber-100 text-slate-900 border-amber-300 font-medium px-2.5 shadow-xs scale-[1.01]"
                              : "bg-transparent border-transparent text-slate-700 hover:bg-indigo-50/40 hover:text-slate-900 hover:border-slate-200"
                          }`}
                          title="点击这句播放"
                        >
                          {sentence}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap leading-relaxed">{milestone.summary}</div>
                )}
              </div>
            </div>

            {/* Hint Card */}
            <div className="flex items-start gap-3 bg-indigo-50/50 rounded-xl p-4 border border-indigo-50 text-indigo-700">
              <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold">💡 学习建议</p>
                <p className="leading-relaxed">
                  阅读完核心材料后，建议切换至 <b>核心概念</b> 掌握专业名词，或进入 <b>AI 助教</b> 探讨深层哲思，最后挑战 <b>里程碑测试</b> 解锁下一关！
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONCEPTS CARD SECTION */}
        {activeTab === "concepts" && (
          <div id="concepts-tab-view" className="space-y-6 max-w-4xl mx-auto">
            <div className="text-center max-w-md mx-auto mb-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-1">
                🔑 核心概念与词汇
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                点击这些卡片翻面，查看对核心术语的深度哲学释义与多维解释
              </p>
            </div>

            {/* Flippable Concept Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
              {milestone.keyConcepts.map((concept, idx) => {
                const isFlipped = flippedCards[idx] || false;
                return (
                  <div
                    key={idx}
                    id={`concept-card-wrapper-${idx}`}
                    onClick={() => handleCardClick(idx)}
                    className="h-48 cursor-pointer group perspective"
                  >
                    <div
                      className={`relative w-full h-full duration-500 preserve-3d ${
                        isFlipped ? "rotate-y-180" : ""
                      }`}
                    >
                      {/* CARD FRONT: TERM */}
                      <div className="absolute inset-0 backface-hidden bg-white border border-slate-200 hover:border-indigo-300 rounded-3xl shadow-xs p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest font-mono">
                            Concept {idx + 1}
                          </span>
                          <button
                            onClick={(e) => speakConceptTerm(concept.term, e)}
                            className="p-2 rounded-full hover:bg-indigo-50 text-indigo-500 transition-colors flex items-center justify-center shrink-0"
                            title="日语发音"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-center py-4">
                          <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 duration-300">
                            {concept.term}
                          </h3>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                          <span className="flex items-center gap-1 hover:text-indigo-500" onClick={(e) => speakConceptTerm(concept.term, e)}>
                            🔊 点击发音
                          </span>
                          <span>点击翻看释义 ↺</span>
                        </div>
                      </div>

                      {/* CARD BACK: DEFINITION */}
                      <div className="absolute inset-0 backface-hidden rotate-y-180 bg-indigo-950 text-white rounded-3xl shadow-xs p-6 flex flex-col justify-between border border-indigo-900">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest font-mono">
                            Definition
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => speakConceptTerm(concept.term, e)}
                              className="p-1.5 rounded-full hover:bg-indigo-900 text-indigo-300 transition-colors flex items-center justify-center shrink-0"
                              title="日语发音"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex-1 flex items-center justify-center py-2 overflow-y-auto">
                          <p className="text-xs text-indigo-50 font-medium leading-relaxed text-center whitespace-pre-wrap">
                            {concept.definition}
                          </p>
                        </div>
                        <div className="text-[9px] text-indigo-300/70 text-center">
                          点击卡片返回 ↺
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: AI STUDY BUDDY GROUNDED CHAT */}
        {activeTab === "chat" && (
          <div id="chat-tab-view" className="flex flex-col h-full max-w-3xl mx-auto space-y-4">
            {/* Header info */}
            <div className="flex items-center justify-between bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 px-4 text-xs">
              <div className="flex items-center gap-2 text-indigo-800">
                <MessageSquareCode className="w-4 h-4 text-indigo-500" />
                <span>
                  当前已被 grounded 在：<b>{milestone.title.slice(0, 20)}...</b> 的知识域内
                </span>
              </div>
              <button
                onClick={clearChat}
                className="text-slate-400 hover:text-red-500 transition-colors text-[11px] font-semibold"
              >
                重置对话
              </button>
            </div>

            {/* Chat message flow container */}
            <div className="flex-1 min-h-[250px] max-h-[380px] overflow-y-auto border border-slate-200/60 rounded-3xl bg-slate-50/30 p-4 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 text-lg font-bold">
                    🎓
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-slate-700">我是你的专属书友 BookMate</h3>
                    <p className="text-[11px] text-slate-400 max-w-sm leading-relaxed">
                      你可以向我提问任何关于本书、本关内容的问题，我会精准为您答疑解惑。
                    </p>
                  </div>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-sm space-y-1 ${
                        msg.role === "user"
                          ? "bg-indigo-600 text-white rounded-br-none"
                          : "bg-white border border-slate-100 text-slate-800 rounded-bl-none"
                      }`}
                    >
                      <div className="font-sans whitespace-pre-wrap">{msg.content}</div>
                      <div
                        className={`text-[9px] text-right mt-1 ${
                          msg.role === "user" ? "text-indigo-200" : "text-slate-400"
                        }`}
                      >
                        {msg.timestamp}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-none p-3.5 shadow-sm space-y-2">
                    <div className="flex gap-1.5 items-center">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
              {chatError && (
                <div className="text-center py-2 text-xs text-red-500 bg-red-50 rounded-xl border border-red-100 font-medium">
                  {chatError}
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Smart Prompt Suggestions */}
            {chatMessages.length === 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                  💡 猜你想问 (Smart suggestions)
                </p>
                <div className="flex flex-wrap gap-2">
                  {smartSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSendMessage(suggestion)}
                      className="text-[11px] text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-100 transition-all text-left font-medium"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input field */}
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSendMessage(chatInput);
                  }
                }}
                placeholder="在此输入您的疑问，例如：怎么把这个精神运用到工作中？..."
                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => handleSendMessage(chatInput)}
                disabled={!chatInput.trim() || isChatLoading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-xs font-bold transition-all flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: QUIZ TESTING SECTION */}
        {activeTab === "quiz" && (
          <div id="quiz-tab-view" className="space-y-6 max-w-2xl mx-auto">
            {/* 1. QUIZ NOT STARTED */}
            {!quizStarted && !quizFinished && (
              <div className="text-center py-10 space-y-6">
                <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto text-3xl">
                  📝
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <h2 className="text-base font-bold text-slate-800">阶段通关能力测试</h2>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    本测试包含 <b>{milestone.quizQuestions.length} 道高阶理解性选择题</b>。
                    需要答对 <b>{Math.ceil(milestone.quizQuestions.length * 0.66)} 道题及以上 (分数 &gt;= 66%)</b> 方可顺利通关本阶段并解锁下一关！
                  </p>
                </div>

                {completed && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 max-w-xs mx-auto text-[11px] text-emerald-700 font-medium">
                    🏆 您之前已经成功通过本关测试！
                  </div>
                )}

                <button
                  onClick={() => setQuizStarted(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md shadow-indigo-100 transition-all inline-flex items-center gap-1.5"
                >
                  <span>立即开始测试</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* 2. QUIZ RUNNING */}
            {quizStarted && !quizFinished && (
              <div className="space-y-6">
                {/* Quiz Header Progress */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold text-slate-500">
                    问题 {currentQuestionIdx + 1} / {milestone.quizQuestions.length}
                  </span>
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-mono">
                    当前正确数: {quizScore}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${((currentQuestionIdx + 1) / milestone.quizQuestions.length) * 100}%`,
                    }}
                  />
                </div>

                {/* Question */}
                <div className="bg-slate-50/50 border border-slate-200/60 rounded-3xl p-5">
                  <h3 className="text-sm font-bold text-slate-800 leading-relaxed">
                    {milestone.quizQuestions[currentQuestionIdx].question}
                  </h3>
                </div>

                {/* Options list */}
                <div className="space-y-3">
                  {milestone.quizQuestions[currentQuestionIdx].options.map((option, idx) => {
                    const isSelected = selectedOption === idx;
                    const correctIdx = milestone.quizQuestions[currentQuestionIdx].correctIndex;
                    const isCorrectOption = idx === correctIdx;
                    
                    let btnClass = "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/50";
                    let stateIcon = null;

                    if (selectedOption !== null) {
                      // Once user made a choice
                      if (isCorrectOption) {
                        btnClass = "border-emerald-500 bg-emerald-50/55 text-emerald-900";
                        stateIcon = <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />;
                      } else if (isSelected) {
                        btnClass = "border-red-500 bg-red-50/55 text-red-900";
                        stateIcon = <XCircle className="w-4 h-4 text-red-600 shrink-0" />;
                      } else {
                        btnClass = "border-slate-100 bg-slate-50/30 text-slate-400";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleOptionSelect(idx)}
                        disabled={selectedOption !== null}
                        className={`w-full text-left p-4 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 transition-all duration-200 ${btnClass}`}
                      >
                        <span className="leading-relaxed">{option}</span>
                        {stateIcon}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation block when answer is selected */}
                {selectedOption !== null && (
                  <div className="bg-indigo-50/30 rounded-3xl border border-indigo-50 p-5 space-y-2 animate-fade-in">
                    <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-indigo-600" />
                      名师精讲释义 (Explanation)
                    </h4>
                    <p className="text-xs text-indigo-950/80 leading-relaxed whitespace-pre-wrap">
                      {milestone.quizQuestions[currentQuestionIdx].explanation}
                    </p>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleNextQuestion}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                      >
                        <span>
                          {currentQuestionIdx < milestone.quizQuestions.length - 1
                            ? "下一题"
                            : "完成测试"}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. QUIZ FINISHED RESULTS */}
            {quizFinished && (
              <div className="text-center py-10 space-y-6">
                {quizScore >= Math.ceil(milestone.quizQuestions.length * 0.66) ? (
                  // PASS CARD
                  <div className="space-y-4 max-w-md mx-auto">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-3xl">
                      🏆
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-base font-bold text-slate-800">恭喜！您成功通关本阶段！</h2>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        您在本次阶段测试中取得了 <b>{quizScore}/{milestone.quizQuestions.length}</b> 的好成绩 (
                        {Math.round((quizScore / milestone.quizQuestions.length) * 100)}分)。下一学习里程碑已为您成功开启！
                      </p>
                    </div>
                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full font-mono">
                        PASS (及格分 &gt;= 66%)
                      </span>
                    </div>
                  </div>
                ) : (
                  // FAIL CARD
                  <div className="space-y-4 max-w-md mx-auto">
                    <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto text-3xl">
                      🌿
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-base font-bold text-slate-800">遗憾未通关，继续加油！</h2>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        您的得分为 <b>{quizScore}/{milestone.quizQuestions.length}</b> ({Math.round((quizScore / milestone.quizQuestions.length) * 100)}分)。
                        不要灰心，您可以返回<b>深度精读</b>复习要点，或者向 <b>AI 助教</b> 提问解惑后再次发起挑战！
                      </p>
                    </div>
                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full font-mono">
                        FAILED (及格分 &gt;= 66%)
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-center gap-3 pt-4">
                  <button
                    onClick={restartQuiz}
                    className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>重新测试</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
