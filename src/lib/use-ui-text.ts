"use client";

import { useState, useEffect, useCallback } from "react";

export function useUiText() {
  const [texts, setTexts] = useState<Record<string, string>>({});

  const fetchTexts = useCallback(async () => {
    try {
      const res = await fetch("/api/ui-text");
      const data = await res.json();
      setTexts(data.texts || {});
    } catch {
      // 조용히 실패 — fallback 값 사용
    }
  }, []);

  useEffect(() => {
    fetchTexts();
  }, [fetchTexts]);

  const t = (key: string, fallback = "") => texts[key] ?? fallback;

  return { t, refreshTexts: fetchTexts };
}
