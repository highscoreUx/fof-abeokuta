import { loginPath } from "@/lib/routes";
import type { PlatformEvent } from "@/types";

export function buildDefaultLandingHtml(event: PlatformEvent): string {
  const formattedDate = new Date(event.date).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const signIn = loginPath();
  const liveBadge =
    event.status === "LIVE"
      ? `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#ecfdf5;color:#059669;font-size:12px;font-weight:600;">Live</span>`
      : "";

  return `
<body>
  <header style="display:flex;align-items:center;justify-content:space-between;padding:20px 48px;border-bottom:1px solid #eee;">
    <div style="font-size:15px;font-weight:700;">Friends of Figma</div>
    <a href="${signIn}" style="font-size:14px;font-weight:600;color:#0084ff;text-decoration:none;">Sign in</a>
  </header>
  <section style="padding:80px 48px;background:linear-gradient(180deg,#f8fafc 0%,#fff 100%);">
    <div style="max-width:720px;">
      ${liveBadge}
      <h1 style="margin:16px 0 8px;font-size:42px;line-height:1.1;font-weight:700;color:#111;">${escapeHtml(event.title)}</h1>
      <p style="margin:0 0 12px;font-size:18px;color:#666;">${escapeHtml(formattedDate)}</p>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#555;">${escapeHtml(event.description ?? "Drag blocks from the panel to build your event landing page.")}</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        <a href="${signIn}" style="display:inline-flex;align-items:center;padding:10px 18px;border-radius:8px;background:#0084ff;color:#fff;font-size:14px;font-weight:600;text-decoration:none;">Sign in to event</a>
        <a href="#why" style="display:inline-flex;align-items:center;padding:10px 18px;border-radius:8px;border:1px solid #ddd;background:#fff;color:#333;font-size:14px;font-weight:600;text-decoration:none;">Learn more</a>
      </div>
    </div>
  </section>
  <section id="why" style="padding:64px 48px;background:#f9fafb;">
    <h2 style="margin:0 0 32px;text-align:center;font-size:28px;font-weight:700;color:#111;">Why attend</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;max-width:960px;margin:0 auto;">
      ${featureCard("Talks", "Live sessions and workshops.")}
      ${featureCard("Activities", "Quizzes, voting, and games.")}
      ${featureCard("Network", "Meet your local community.")}
    </div>
  </section>
  <section style="padding:64px 48px;">
    <div style="max-width:560px;margin:0 auto;padding:40px;border-radius:16px;background:#0084ff;color:#fff;text-align:center;">
      <h2 style="margin:0 0 8px;font-size:24px;font-weight:700;">Ready to join?</h2>
      <p style="margin:0 0 20px;font-size:14px;color:rgba(255,255,255,0.85);">Sign in to participate in everything at this event.</p>
      <a href="${signIn}" style="display:inline-flex;padding:10px 18px;border-radius:8px;background:#fff;color:#111;font-size:14px;font-weight:600;text-decoration:none;">Get started</a>
    </div>
  </section>
  <footer style="padding:20px;text-align:center;font-size:12px;color:#999;border-top:1px solid #eee;">/${escapeHtml(event.slug)}</footer>
</body>`;
}

function featureCard(title: string, description: string) {
  return `
    <div style="padding:24px;border-radius:12px;background:#fff;border:1px solid #eee;">
      <div style="width:32px;height:32px;border-radius:8px;background:#eff6ff;margin-bottom:12px;"></div>
      <h3 style="margin:0 0 6px;font-size:15px;font-weight:700;color:#111;">${escapeHtml(title)}</h3>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#666;">${escapeHtml(description)}</p>
    </div>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const DEFAULT_LANDING_CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Inter, system-ui, sans-serif; }
`;
