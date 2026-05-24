import { useEffect, useState } from "react";

type ModalAnimationState = "open" | "closing" | "closed";

export function useModalAnimation(isOpen: boolean, durationMs = 160) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [state, setState] = useState<ModalAnimationState>(isOpen ? "open" : "closed");

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setState("open");
      return;
    }

    if (!shouldRender) {
      setState("closed");
      return;
    }

    setState("closing");
    const timer = setTimeout(() => {
      setShouldRender(false);
      setState("closed");
    }, durationMs);

    return () => clearTimeout(timer);
  }, [isOpen, durationMs, shouldRender]);

  return { shouldRender, state };
}
