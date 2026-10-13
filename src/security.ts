// ---------------------------------------------------------------------------
// Security Guardrails & Pre-Flight Sanitizer (global safe-fetching standard)
// ---------------------------------------------------------------------------

export function isSafeAndSecureUrl(urlStr: string): string | null {
  if (!urlStr || typeof urlStr !== "string") return null;
  try {
    let clean = urlStr.trim();
    if (clean.startsWith("http://")) {
      clean = clean.replace("http://", "https://");
    }
    const parsed = new URL(clean);
    if (parsed.protocol !== "https:") return null;

    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || /^(\d{1,3}\.){3}\d{1,3}$/.test(host)) return null;
    if (/\.(xyz|top|work|click|link|cc|to|gq|cf|tk|ml|zip|exe|apk)$/i.test(host)) return null;

    // faithfinder.app is NOT owned by FaithFinder — never emit links to it.
    const blacklist = ["stlcatholic.org", "faithfinder.app"];
    if (blacklist.some((b) => host === b || host.endsWith("." + b))) return null;

    return parsed.toString();
  } catch {
    return null;
  }
}
