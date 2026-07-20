"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookCourse, UserProgress } from "../types";
import { defaultBooks } from "../data/defaultBooks";
import BookUploader from "../components/BookUploader";
import { Trash2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [books, setBooks] = useState<BookCourse[]>(defaultBooks);
  const [progresses, setProgresses] = useState<Record<string, UserProgress>>({});
  const [showUploader, setShowUploader] = useState(false);

  useEffect(() => {
    try {
      const storedCustomBooks = localStorage.getItem("progressive_study_custom_books");
      if (storedCustomBooks) {
        const parsed: BookCourse[] = JSON.parse(storedCustomBooks);
        setBooks([...defaultBooks, ...parsed]);
      }
    } catch (e) {
      console.error("Error reading custom books:", e);
    }

    try {
      const storedProgress = localStorage.getItem("progressive_study_progress");
      if (storedProgress) {
        setProgresses(JSON.parse(storedProgress));
      }
    } catch (e) {
      console.error("Error reading progress:", e);
    }
  }, []);

  const getBookProgress = (bookId: string): UserProgress => {
    return (
      progresses[bookId] || {
        bookId,
        completedMilestones: [],
        quizScores: {},
        chats: {},
      }
    );
  };

  const handleSyllabusGenerated = (newCourse: BookCourse) => {
    const updatedBooks = [...books, newCourse];
    setBooks(updatedBooks);
    
    const customBooksOnly = updatedBooks.filter((b) => b.isCustom);
    localStorage.setItem("progressive_study_custom_books", JSON.stringify(customBooksOnly));

    setShowUploader(false);
    router.push(`/course/${newCourse.id}`);
  };

  const handleDeleteBook = (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("确定要删除这本自定义书籍及其所有学习进度吗？")) return;

    const updatedBooks = books.filter((b) => b.id !== bookId);
    setBooks(updatedBooks);

    const customBooksOnly = updatedBooks.filter((b) => b.isCustom);
    localStorage.setItem("progressive_study_custom_books", JSON.stringify(customBooksOnly));

    const updatedProgresses = { ...progresses };
    delete updatedProgresses[bookId];
    setProgresses(updatedProgresses);
    localStorage.setItem("progressive_study_progress", JSON.stringify(updatedProgresses));
  };

  return (
    <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-8">
      {/* UPLOADER */}
      {showUploader && (
        <section className="mb-12">
           <BookUploader onSyllabusGenerated={handleSyllabusGenerated} />
        </section>
      )}

      {/* BOOKSHELF */}
      <section id="bento-bookshelf-section" className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
              📚 研学藏书阁 (Study Bookshelf)
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              管理您的推荐书籍和自定义研学教材
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {books.map((book) => {
            const bookProgress = getBookProgress(book.id);
            const completedCount = bookProgress.completedMilestones.length;

            return (
              <div
                key={book.id}
                onClick={() => router.push(`/course/${book.id}`)}
                className="group bg-slate-50 rounded-2xl border border-slate-200 p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:border-indigo-300 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className={`w-12 h-16 rounded-lg border-r-4 shrink-0 shadow-xs flex items-center justify-center font-bold text-lg select-none ${
                    book.id.includes("japanese")
                      ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                      : "bg-indigo-50 border-indigo-400 text-indigo-700"
                  }`}>
                    {book.title.slice(0, 1)}
                  </div>
                  
                  <div className="text-right flex flex-col items-end">
                    <span className="px-2.5 py-0.5 bg-white text-slate-500 rounded-full text-[10px] font-medium border border-slate-200 shadow-sm">
                      开始学习 →
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-indigo-600 transition-colors">
                    {book.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium font-sans mt-1">
                    {book.isCustom ? "自定义导入" : "官方精选推荐"}
                  </p>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-200/60">
                  <div className="flex justify-between text-[10px] font-bold mb-1.5">
                    <span className="text-slate-500 font-sans">研学进度</span>
                    <span className="text-indigo-600 font-mono">{Math.round((completedCount / book.milestones.length) * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${(completedCount / book.milestones.length) * 100}%` }}
                    />
                  </div>
                  
                  {book.isCustom && (
                    <div className="flex justify-end mt-3">
                      <button
                        onClick={(e) => handleDeleteBook(book.id, e)}
                        className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors text-[10px] font-semibold flex items-center gap-0.5"
                        title="删除此书"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>移除</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* ADD BOOK CARD */}
          <div
            onClick={() => setShowUploader(true)}
            className="bg-indigo-50/50 rounded-2xl border border-indigo-100 p-6 flex flex-col justify-center items-center text-center hover:bg-indigo-100/40 hover:border-indigo-200 transition-all cursor-pointer shadow-xs min-h-[190px]"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg mb-3 shadow-sm shadow-indigo-200">
              +
            </div>
            <p className="font-bold text-indigo-900 text-sm font-display">导入新书定制路线</p>
            <p className="text-xs text-slate-500 mt-2 max-w-[160px] leading-relaxed">
              上传纯文本或粘贴材料，AI 即刻编制 5 阶段专属学习线路！
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
