import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "CertiDesk Pro — Institute & Certificate Management SaaS";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 65%, #2563eb 100%)",
        color: "#ffffff",
        padding: "64px 72px",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          fontSize: "28px",
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "#3b82f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px",
            fontWeight: 800,
          }}
        >
          CD
        </div>
        <span>CertiDesk Pro</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div
          style={{
            fontSize: "54px",
            fontWeight: 800,
            lineHeight: 1.12,
            letterSpacing: "-0.03em",
            maxWidth: "960px",
          }}
        >
          Institute, Student, Marksheet &amp; Certificate Management SaaS
        </div>
        <div
          style={{
            fontSize: "26px",
            color: "#dbeafe",
            maxWidth: "880px",
            lineHeight: 1.4,
          }}
        >
          Manage admissions, batches, attendance, fees, examinations, marksheets, and
          verifiable certificates from one prepaid multi-tenant workspace.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "24px",
          fontSize: "20px",
          color: "#bfdbfe",
          fontWeight: 600,
        }}
      >
        <span>• Self-Service Registration</span>
        <span>• Prepaid Razorpay Wallet</span>
        <span>• Public Certificate Verification</span>
      </div>
    </div>,
    { ...size }
  );
}
