"use client";

import { useState, useCallback } from "react";

export interface WriteFormState {
  title: string;
  content: string;
  excerpt: string;
  tags: string;
}

export function useWriteForm(initialState?: Partial<WriteFormState>) {
  const [title, setTitle] = useState(initialState?.title ?? "");
  const [content, setContent] = useState(initialState?.content ?? "");
  const [excerpt, setExcerpt] = useState(initialState?.excerpt ?? "");
  const [tags, setTags] = useState(initialState?.tags ?? "");

  const reset = useCallback(() => {
    setTitle("");
    setContent("");
    setExcerpt("");
    setTags("");
  }, []);

  const setForm = useCallback((data: Partial<WriteFormState>) => {
    if (data.title !== undefined) setTitle(data.title);
    if (data.content !== undefined) setContent(data.content);
    if (data.excerpt !== undefined) setExcerpt(data.excerpt);
    if (data.tags !== undefined) setTags(data.tags);
  }, []);

  const isEmpty = !title && !content && !excerpt && !tags;
  const hasContent = Boolean(title || content);

  return {
    title,
    setTitle,
    content,
    setContent,
    excerpt,
    setExcerpt,
    tags,
    setTags,
    reset,
    setForm,
    isEmpty,
    hasContent,
  };
}
