import { ImageResponse } from "next/og";

// Brand share card for pages without a real uploaded image (see DEFAULT_IMAGE in lib/seo.ts).
// Palette from styles/tokens.css: ink black, white, brand red. No photo, no claims: name, tagline and domain only.
export function GET() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#111111", color: "#ffffff", padding: 80 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ width: 88, height: 88, background: "#ffffff", color: "#111111", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56, fontWeight: 800 }}>P</div>
          <div style={{ fontSize: 44, fontWeight: 800 }}>PhonePhotography.in</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.1 }}>Smartphone photographers across India</div>
          <div style={{ marginTop: 28, fontSize: 34, color: "#ebebeb" }}>Compare packages, view portfolios and contact photographers directly.</div>
        </div>
        <div style={{ width: 160, height: 10, background: "#d9232d" }} />
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
