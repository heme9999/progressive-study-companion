import "./globals.css";
import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LibreStep 循序渐进智能学习助手 - AI驱动的沉浸式学习规划平台",
  description: "LibreStep 循序渐进智能学习助手，提供AI驱动的书籍研读、自定义学习路线规划、阶段测试与智能伴学对话等功能，帮助你高效、系统地掌握任何新知识。",
  verification: {
    google: "wMz2VDeMwD8R6yiCgJIqFD_wM2wSzrSEauzvCtzKHyw",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
        
        {/* GLOBAL NAVBAR */}
        <header id="app-navbar" className="h-16 border-b border-slate-200 bg-white sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto h-full px-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold font-display shadow-sm shadow-indigo-100">
                📚
              </div>
              <div>
                <a href="/" className="text-slate-950 font-display font-bold text-base tracking-tight flex items-center gap-1.5 hover:text-indigo-600 transition-colors">
                  LibreStep 循序渐进智能学习
                  <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-mono">
                    PRO
                  </span>
                </a>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="w-9 h-9 rounded-full bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center font-display font-bold text-xs text-indigo-600 uppercase">
                HM
              </div>
            </div>
          </div>
        </header>

        {children}

        {/* FOOTER */}
        <footer id="app-footer" className="bg-white border-t border-slate-200 py-8 text-center text-xs text-slate-400 mt-auto">
          <p className="font-semibold text-slate-600 font-display">
            循序渐进智能学习助手 —— 让每一本好书，都成为您登天阶梯
          </p>
          <p className="text-[10px] mt-1.5 text-slate-400 font-mono">
            © 2026 Progressive Study Hub • Powered by Gemini 3.5 Flash & Next.js.
          </p>
        </footer>

      </body>
    </html>
  );
}
