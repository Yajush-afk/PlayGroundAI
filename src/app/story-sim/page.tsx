"use client";

import { BookOpen } from "lucide-react";
import { ComingSoon } from "@/components/layout/ComingSoon";

export default function StorySimPage() {
  return (
    <ComingSoon
      eyebrow="Narrative Chamber"
      phase="Role system in development"
      icon={BookOpen}
      title="Story Simulation"
      description="Assign roles to different AI models and watch an interactive narrative unfold based on your prompts."
    />
  );
}
