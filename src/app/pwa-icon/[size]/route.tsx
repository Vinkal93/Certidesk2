import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(_req: Request, context: { params: Promise<{ size: string }> }) {
  const { size: rawSize } = await context.params;
  const parsed = Number(rawSize);
  const size = parsed === 512 ? 512 : 192;
  const radius = Math.round(size * 0.22);
  const fontSize = Math.round(size * 0.42);

  return new ImageResponse(
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #0052ff 100%)",
        borderRadius: radius,
        color: "#ffffff",
        fontWeight: 800,
        fontSize,
        letterSpacing: "-0.04em",
        fontFamily: "sans-serif",
      }}
    >
      CD
    </div>,
    {
      width: size,
      height: size,
    }
  );
}
