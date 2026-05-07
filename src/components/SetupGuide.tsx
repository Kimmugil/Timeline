"use client";

import { useState } from "react";

type Step = {
  title: string;
  desc: string;
  icon: string;
  color: string;
};

type Props = {
  steps: Step[];
  title: string;
};

export default function SetupGuide({ steps, title }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="font-semibold text-sm text-slate-600">📋 {title}</span>
        <span className="text-slate-400 text-xs">{open ? "▲ 접기" : "▼ 펼치기"}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {steps.map((step, i) => (
            <div
              key={i}
              className="rounded-lg p-4 border"
              style={{
                backgroundColor: step.color + "10",
                borderColor: step.color + "33",
              }}
            >
              <div className="text-2xl mb-2">{step.icon}</div>
              <p className="font-semibold text-sm text-slate-800 mb-1">{step.title}</p>
              <p className="text-slate-500 text-xs leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
