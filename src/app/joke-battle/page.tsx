import { Laugh } from "lucide-react";
import { ComingSoon } from "@/components/layout/ComingSoon";

export default function JokeBattlePage() {
  return (
    <ComingSoon
      eyebrow="Comedy Duel"
      phase="Writers' room prototyping"
      icon={Laugh}
      title="Joke Battle"
      description="Two AI models go head-to-head with their best punchlines. The audience decides who gets the last laugh."
    />
  );
}
