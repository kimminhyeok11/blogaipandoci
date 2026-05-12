"use client";

import { useCallback, useEffect, useState } from "react";

interface AutoSaveData {
  title: string;
  content: string;
  excerpt: string;
  tags: string;
  timestamp?: string;
}

export function useAutoSave(editSlug: string | null) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const getAutoSaveKey = useCallback(
    (key: string) => {
      return editSlug ? `blog_edit_${editSlug}_${key}` : `blog_draft_${key}`;
    },
    [editSlug]
  );

  const save = useCallback(
    (data: AutoSaveData) => {
      if (typeof window === "undefined") return;

      localStorage.setItem(getAutoSaveKey("title"), data.title);
      localStorage.setItem(getAutoSaveKey("content"), data.content);
      localStorage.setItem(getAutoSaveKey("excerpt"), data.excerpt);
      localStorage.setItem(getAutoSaveKey("tags"), data.tags);
      localStorage.setItem(getAutoSaveKey("timestamp"), new Date().toISOString());
      setLastSaved(new Date());
    },
    [getAutoSaveKey]
  );

  const load = useCallback(() => {
    if (typeof window === "undefined") return null;

    const savedTitle = localStorage.getItem(getAutoSaveKey("title"));
    const savedContent = localStorage.getItem(getAutoSaveKey("content"));
    const savedExcerpt = localStorage.getItem(getAutoSaveKey("excerpt"));
    const savedTags = localStorage.getItem(getAutoSaveKey("tags"));
    const savedTimestamp = localStorage.getItem(getAutoSaveKey("timestamp"));

    if (savedTitle || savedContent || savedExcerpt || savedTags) {
      return {
        title: savedTitle ?? "",
        content: savedContent ?? "",
        excerpt: savedExcerpt ?? "",
        tags: savedTags ?? "",
        timestamp: savedTimestamp ? new Date(savedTimestamp) : null,
        hasData: true,
      };
    }
    return null;
  }, [getAutoSaveKey]);

  const clear = useCallback(() => {
    if (typeof window === "undefined") return;

    localStorage.removeItem(getAutoSaveKey("title"));
    localStorage.removeItem(getAutoSaveKey("content"));
    localStorage.removeItem(getAutoSaveKey("excerpt"));
    localStorage.removeItem(getAutoSaveKey("tags"));
    localStorage.removeItem(getAutoSaveKey("timestamp"));
    setLastSaved(null);
  }, [getAutoSaveKey]);

  useEffect(() => {
    const saved = load();
    if (saved?.timestamp) {
      setLastSaved(saved.timestamp);
    }
  }, [load]);

  return { save, load, clear, lastSaved, setLastSaved };
}
