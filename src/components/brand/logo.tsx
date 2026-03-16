import { cn } from "@/lib/utils";

interface WaypointerLogoProps {
  size?: number;
  variant?: "mark" | "full" | "wordmark";
  className?: string;
}

function WaypointerMark({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="48" height="48" rx="10.5" fill="#2563EB" />
      <path
        d="M11 14L17.5 34L24 20L30.5 34L37 12"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WaypointerLogo({
  size = 32,
  variant = "full",
  className,
}: WaypointerLogoProps) {
  const fontSize = Math.round(size * 0.53);

  if (variant === "mark") {
    return (
      <div className={cn("inline-flex items-center", className)}>
        <WaypointerMark size={size} />
      </div>
    );
  }

  if (variant === "wordmark") {
    return (
      <span
        className={cn("font-semibold text-primary", className)}
        style={{ fontSize: `${fontSize}px`, lineHeight: `${size}px` }}
      >
        Waypointer
      </span>
    );
  }

  return (
    <div
      className={cn("inline-flex items-center", className)}
      style={{ gap: `${Math.round(size * 0.25)}px` }}
    >
      <WaypointerMark size={size} />
      <span
        className="font-semibold text-primary"
        style={{ fontSize: `${fontSize}px`, lineHeight: `${size}px` }}
      >
        Waypointer
      </span>
    </div>
  );
}
