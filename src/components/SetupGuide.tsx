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
    <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#232938] transition-colors"
      >
        <span className="font-semibold text-sm text-[#94a3b8]">📋 {title}</span>
        <span className="text-[#94a3b8] text-xs">{open ? "▲ 접기" : "▼ 펼치기"}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {steps.map((step, i) => (
            <div
              key={i}
              className="rounded-lg p-4 border"
              style={{
                backgroundColor: step.color + "11",
                borderColor: step.color + "44",
              }}
            >
              <div className="text-2xl mb-2">{step.icon}</div>
              <p className="font-semibold text-sm text-white mb-1">{step.title}</p>
              <p className="text-[#94a3b8] text-xs leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
