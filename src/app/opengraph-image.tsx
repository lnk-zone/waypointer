import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Waypointer — Career Transition Support";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
        }}
      >
        {/* W Mark */}
        <svg width="80" height="80" viewBox="0 0 48 48" fill="none">
          <rect
            width="48"
            height="48"
            rx="10.5"
            fill="rgba(255,255,255,0.15)"
          />
          <path
            d="M11 14L17.5 34L24 20L30.5 34L37 12"
            stroke="white"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Brand name */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 600,
            color: "white",
            marginTop: 24,
            letterSpacing: "0.5px",
          }}
        >
          Waypointer
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 24,
            color: "rgba(255,255,255,0.7)",
            marginTop: 12,
          }}
        >
          Career transition support for every employee
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
