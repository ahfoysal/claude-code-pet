"use client";

import { useEffect, useState } from "react";

const FPS: Record<string, number> = {
  idle: 1.6,
  work: 3,
  notification: 3,
  taskDone: 3,
  success: 3,
  error: 2.5,
  stop: 1.2,
  sessionStart: 3,
};

export default function PetSprite({
  pet = "clawd",
  state = "idle",
  size = 128,
  className = "",
}: {
  pet?: string;
  state?: string;
  size?: number;
  className?: string;
}) {
  const [frame, setFrame] = useState(0);
  const fps = FPS[state] ?? 2;

  useEffect(() => {
    setFrame(0);
    const id = setInterval(() => setFrame((f) => (f + 1) % 2), 1000 / fps);
    return () => clearInterval(id);
  }, [state, fps]);

  const src = `/pets/${pet}/${state}-${frame + 1}.svg`;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${pet} ${state}`}
      width={size}
      height={(size * 20) / 24}
      className={`pixel select-none ${className}`}
      draggable={false}
    />
  );
}
