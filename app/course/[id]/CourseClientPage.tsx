"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { BookCourse, UserProgress, ChatMessage } from "../../types";
import { defaultBooks } from "../../data/defaultBooks";
import SyllabusRoadmap from "../../components/SyllabusRoadmap";
import MilestoneStudy from "../../components/MilestoneStudy";

export default function CourseClientPage({ id }: { id: string }) {
  const router = useRouter();
  const bookId = id;

  const [book, setBook] = useState<BookCourse | null>(null);
  const [activeMilestoneIndex, setActiveMilestoneIndex] = useState(0);
  const [progresses, setProgresses] = useState<Record<string, UserProgress>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Find book
    let foundBook = defaultBooks.find(b => b.id === bookId);
    if (!foundBook) {
      try {
        const storedCustom = localStorage.getItem("progressive_study_custom_books");
        if (storedCustom) {
          const parsed: BookCourse[] = JSON.parse(storedCustom);
          foundBook = parsed.find(b => b.id === bookId);
        }
      } catch (e) { console.error(e); }
    }

    if (foundBook) {
      setBook(foundBook);
    } else {
      router.replace("/"); // Not found, go home
    }

    // 2. Load progress
    try {
      const storedProgress = localStorage.getItem("progressive_study_progress");
      if (storedProgress) {
        setProgresses(JSON.parse(storedProgress));
      }
    } catch (e) {}

    setLoading(false);
  }, [bookId, router]);

  if (loading || !book) return <div className="p-8 text-center text-slate-500">Loading course...</div>;

  const getBookProgress = (id: string): UserProgress => {
    return progresses[id] || { bookId: id, completedMilestones: [], quizScores: {}, chats: {} };
  };
  const activeProgress = getBookProgress(bookId);
  const activeMilestone = book.milestones[activeMilestoneIndex];

  const handlePassMilestone = (scorePercentage: number) => {
    const bookProgress = getBookProgress(bookId);
    const completedSet = new Set(bookProgress.completedMilestones);
    if (scorePercentage >= 66) completedSet.add(activeMilestoneIndex);

    const currentHighScore = bookProgress.quizScores[activeMilestoneIndex] || 0;
    const newScores = {
      ...bookProgress.quizScores,
      [activeMilestoneIndex]: Math.max(currentHighScore, scorePercentage),
    };

    const updatedProgress = {
      ...progresses,
      [bookId]: {
        ...bookProgress,
        completedMilestones: Array.from(completedSet),
        quizScores: newScores,
      },
    };
    setProgresses(updatedProgress);
    localStorage.setItem("progressive_study_progress", JSON.stringify(updatedProgress));
  };

  const handleSaveChats = (chats: ChatMessage[]) => {
    const bookProgress = getBookProgress(bookId);
    const updatedProgress = {
      ...progresses,
      [bookId]: {
        ...bookProgress,
        chats: {
          ...bookProgress.chats,
          [activeMilestoneIndex]: chats,
        },
      },
    };
    setProgresses(updatedProgress);
    localStorage.setItem("progressive_study_progress", JSON.stringify(updatedProgress));
  };

  return (
    <div className="w-full flex-grow flex flex-col">
      {/* Top Hero */}
      <section className="bg-slate-900 text-white pt-8 pb-12 border-b border-slate-800 shadow-inner">
        <div className="max-w-7xl mx-auto px-6">
          <button onClick={() => router.push("/")} className="text-slate-400 hover:text-white text-xs font-bold font-mono mb-6 transition-colors">
            ← 返回藏书阁
          </button>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-indigo-400 font-bold text-xs tracking-widest uppercase mb-2">
                当前研读课程
              </p>
              <h1 className="text-3xl font-bold mb-3">{book.title}</h1>
              <p className="text-slate-300 text-sm max-w-2xl">{book.description}</p>
            </div>
            <div className="text-right hidden sm:block">
               <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                 <p className="text-xs text-slate-400 mb-1">通关进度</p>
                 <p className="text-xl font-mono font-bold text-emerald-400">
                    {Math.round((activeProgress.completedMilestones.length / book.milestones.length) * 100)}%
                 </p>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto w-full px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-grow">
        <aside className="lg:col-span-4 h-full lg:sticky lg:top-24">
          <SyllabusRoadmap
            milestones={book.milestones}
            currentMilestoneIndex={activeMilestoneIndex}
            onSelectMilestone={(index) => {
              setActiveMilestoneIndex(index);
              // scroll to content on mobile (and desktop for consistent UX)
              setTimeout(() => {
                document.getElementById('milestone-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 50);
            }}
            progress={activeProgress}
          />
        </aside>

        <section id="milestone-content" className="lg:col-span-8 h-full flex flex-col bg-white rounded-3xl shadow-sm border border-slate-200 p-2 scroll-mt-24">
          <MilestoneStudy
            milestone={activeMilestone}
            milestoneIndex={activeMilestoneIndex}
            onPassMilestone={handlePassMilestone}
            completed={activeProgress.completedMilestones.includes(activeMilestoneIndex)}
            savedChats={activeProgress.chats[activeMilestoneIndex] || []}
            onSaveChats={handleSaveChats}
          />
        </section>
      </main>
    </div>
  );
}
