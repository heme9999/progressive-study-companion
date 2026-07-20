import React from "react";
import { Milestone, UserProgress } from "../types";
import { CheckCircle2, Compass, Lock, Award, BookOpen } from "lucide-react";

interface SyllabusRoadmapProps {
  milestones: Milestone[];
  currentMilestoneIndex: number;
  onSelectMilestone: (index: number) => void;
  progress: UserProgress;
}

export default function SyllabusRoadmap({
  milestones,
  currentMilestoneIndex,
  onSelectMilestone,
  progress,
}: SyllabusRoadmapProps) {
  const totalMilestones = milestones.length;
  const completedCount = progress.completedMilestones.length;
  const percentage = Math.round((completedCount / totalMilestones) * 100);

  return (
    <div id="syllabus-roadmap-container" className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 md:p-8">
      {/* Progress Header */}
      <div id="roadmap-header" className="mb-6 pb-6 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 font-display">
            <Compass className="w-4 h-4 text-emerald-500 animate-spin-slow" />
            学习路径地图 (Learning Path)
          </h2>
          <span className="text-[10px] font-mono font-medium text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
            已完成 {completedCount}/{totalMilestones}
          </span>
        </div>
        
            {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-2">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-slate-400 font-medium mb-3">
          <span>踏上旅程</span>
          <span>通关进度: {percentage}%</span>
          <span>融会贯通</span>
        </div>
        <div className="text-[11px] text-indigo-600 bg-indigo-50/50 rounded-lg p-2 flex items-center gap-1.5 font-medium border border-indigo-100/40">
          <span className="text-xs">💡</span>
          <span><b>自由选关已开启：</b>您已解除通关限制，可以直接点选下方任意阶段进行学习与测试！</span>
        </div>
      </div>

      {/* Vertical Timeline */}
      <div id="roadmap-timeline" className="relative pl-2">
        {/* Continuous track line */}
        <div className="absolute left-[21px] top-4 bottom-4 w-0.5 bg-slate-100" />

        <div className="space-y-6">
          {milestones.map((milestone, idx) => {
            const isCompleted = progress.completedMilestones.includes(idx);
            const isActive = idx === currentMilestoneIndex;
            // A milestone is unlocked if it is the first one, completed, or if the previous one is completed
            // USER REQUEST: 解除通关锁，可以任意选择主体，故此处始终设为 true
            const isUnlocked = true;

            let statusIcon = <Lock className="w-4 h-4 text-slate-400" />;
            let iconBgClass = "bg-slate-50 border-slate-200 text-slate-400";
            let itemBgClass = "border-slate-50 opacity-60";
            let hoverClass = "";

            if (isCompleted) {
              statusIcon = <CheckCircle2 className="w-4 h-4 text-white" />;
              iconBgClass = "bg-emerald-500 border-emerald-500 text-white";
              itemBgClass = "border-emerald-100 bg-emerald-50/20";
              hoverClass = "hover:border-emerald-200 hover:bg-emerald-50/40 cursor-pointer";
            } else if (isActive) {
              statusIcon = <Compass className="w-4 h-4 text-white" />;
              iconBgClass = "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100 animate-pulse";
              itemBgClass = "border-indigo-100 bg-indigo-50/35 ring-1 ring-indigo-50/50";
              hoverClass = "cursor-pointer";
            } else if (isUnlocked) {
              statusIcon = <BookOpen className="w-4 h-4 text-slate-600" />;
              iconBgClass = "bg-white border-slate-300 text-slate-600";
              itemBgClass = "border-slate-200 bg-white";
              hoverClass = "hover:border-slate-300 hover:bg-slate-50/50 cursor-pointer";
            }

            return (
              <div
                key={idx}
                id={`roadmap-item-${idx}`}
                onClick={() => isUnlocked && onSelectMilestone(idx)}
                className={`relative flex items-start gap-4 p-3 rounded-xl border transition-all duration-300 ${itemBgClass} ${hoverClass}`}
              >
                {/* Visual Connector Circle */}
                <div
                  className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full border-2 transition-all duration-300 ${iconBgClass}`}
                >
                  {statusIcon}
                </div>

                {/* Milestone Text Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      STAGE {idx + 1}
                    </span>
                    <span
                      className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md font-mono ${
                        milestone.difficulty === "Easy"
                          ? "bg-sky-50 text-sky-600"
                          : milestone.difficulty === "Medium"
                          ? "bg-amber-50 text-amber-600"
                          : "bg-rose-50 text-rose-600"
                      }`}
                    >
                      {milestone.difficulty}
                    </span>
                  </div>
                  <h3
                    className={`text-xs font-semibold truncate ${
                      isActive ? "text-indigo-900" : "text-slate-700"
                    }`}
                  >
                    {milestone.title.replace(/^第.*?阶段：/, "")}
                  </h3>
                  
                  {isCompleted && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-600 font-medium">
                      <Award className="w-3 h-3" />
                      已通关
                      {progress.quizScores[idx] !== undefined && (
                        <span className="font-mono">({progress.quizScores[idx]}分)</span>
                      )}
                    </div>
                  )}

                  {!isUnlocked && (
                    <span className="text-[10px] text-slate-400 italic block mt-0.5">
                      需要通过前一关解锁
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
