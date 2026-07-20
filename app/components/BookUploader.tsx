import React, { useState, useRef } from "react";
import { BookCourse } from "../types";
import { Upload, FileText, Sparkles, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";

interface BookUploaderProps {
  onSyllabusGenerated: (course: BookCourse) => void;
}

export default function BookUploader({ onSyllabusGenerated }: BookUploaderProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = [
    "正在通读与分析书籍核心结构...",
    "正在智取并提炼章节中的核心论点及学术词汇...",
    "正在为您量身编制循序渐进的5个里程碑教材与导读...",
    "正在针对各个里程碑精心智编匹配微测试题...",
    "排版就绪！正在为您拼装个性化的学习大地图...",
  ];

  // Increment step for better loading UX
  const startStepAnimation = () => {
    setGenerationStep(0);
    const interval = setInterval(() => {
      setGenerationStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          return prev;
        }
      });
    }, 4000);
    return interval;
  };

  const handleTextFileRead = (file: File) => {
    if (file.type !== "text/plain" && !file.name.endsWith(".txt") && !file.name.endsWith(".md")) {
      setError("仅支持导入 .txt 或 .md 格式的纯文本文件。");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setContent(e.target.result as string);
        // Pre-populate title from file name if empty
        if (!title) {
          const cleanName = file.name.replace(/\.[^/.]+$/, "");
          setTitle(`《${cleanName}》`);
        }
        setError(null);
      }
    };
    reader.onerror = () => {
      setError("读取文件失败，请检查文件编码或损坏情况。");
    };
    reader.readAsText(file);
  };

  // Drag-and-drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleTextFileRead(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files.length > 0) {
      handleTextFileRead(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError("请先输入书籍/课程名称，并提供相应的章节文本内容或上传文本文件。");
      return;
    }

    setIsGenerating(true);
    setError(null);
    const intervalId = startStepAnimation();

    try {
      const response = await fetch("/api/generate-syllabus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: content.trim().substring(0, 50000), // Safety limit for input tokens
        }),
      });

      clearInterval(intervalId);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "课程大纲生成失败");
      }

      const generatedSyllabus = await response.json();
      
      // Assemble new course object
      const newCourse: BookCourse = {
        id: `custom-${Date.now()}`,
        title: generatedSyllabus.bookTitle || title.trim(),
        description: generatedSyllabus.description || "自定义导入的学习书目",
        milestones: generatedSyllabus.milestones,
        isCustom: true,
      };

      onSyllabusGenerated(newCourse);
      
      // Clear inputs on success
      setTitle("");
      setContent("");
    } catch (err: any) {
      console.error(err);
      setError(
        err.message || 
        "生成失败。这可能是由于您的 API 密钥未配置、输入文本包含 sensitive 话题、或网络连接超时。请前往 'Settings > Secrets' 确认并重试。"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div id="book-uploader-container" className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 md:p-8 space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
          导入新书定制专属学习路线
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          将您自己的两本书或任意学习材料，复制或拖入下方。AI 将动态将其编译成由 5 个关卡组成的循序渐进课程！
        </p>
      </div>

      {isGenerating ? (
        /* DYNAMIC LOADING SCREEN */
        <div id="syllabus-generating-loader" className="py-12 flex flex-col items-center justify-center text-center space-y-6">
          <div className="relative">
            {/* Spinning ring */}
            <div className="w-14 h-14 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-xs">
              🧠
            </div>
          </div>

          <div className="space-y-2 max-w-sm">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">
              AI 智能排版建构中...
            </h3>
            
            {/* Steps indicator */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 shadow-inner min-h-[50px] flex items-center justify-center">
              <p className="text-xs font-medium text-indigo-600 animate-pulse">
                {steps[generationStep]}
              </p>
            </div>

            {/* Stepper Dots */}
            <div className="flex justify-center gap-1.5 pt-1">
              {steps.map((_, sIdx) => (
                <div
                  key={sIdx}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    sIdx === generationStep ? "bg-indigo-600 w-3" : "bg-indigo-100"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* INPUT FORM */
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Title Input */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              书名或课题名称 (Title)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：《精益创业论》、《JavaScript 异步编程》"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
              required
            />
          </div>

          {/* DRAG-AND-DROP FILE UPLOAD & TEXT AREA COMPONENT */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              书籍主要内容或章节段落
            </label>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-2 ${
                isDragging
                  ? "border-indigo-500 bg-indigo-50/20"
                  : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".txt,.md"
                className="hidden"
              />
              <Upload className={`w-6 h-6 ${isDragging ? "text-indigo-600 animate-bounce" : "text-slate-400"}`} />
              <div className="text-xs">
                <span className="text-indigo-600 font-bold hover:underline">点击上传文件</span> 或将纯文本 (.txt / .md) 拖到此处
              </div>
              <p className="text-[10px] text-slate-400">
                支持导入含有多章或大量段落的文件，AI 将智能分切出 5 阶段精研课
              </p>
            </div>
          </div>

          {/* Paste Text Area */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                或直接粘贴文本内容
              </span>
              {content && (
                <span className="text-[10px] text-slate-400 font-mono">
                  字数: {content.length}
                </span>
              )}
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="在此粘贴本书的大纲、核心章节、重点课文或要点总结。字数越多，生成的教辅及考题越精准深刻..."
              rows={5}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
              required
            />
          </div>

          {/* Error display */}
          {error && (
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-rose-700 flex items-start gap-2.5 text-xs">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              <div className="space-y-1">
                <p className="font-bold">生成遇到错误</p>
                <p className="leading-relaxed text-[11px]">{error}</p>
              </div>
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 animate-spin-slow" />
            <span>智能编译专属循序渐进课程</span>
          </button>
        </form>
      )}
    </div>
  );
}
