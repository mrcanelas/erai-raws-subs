import { createRequire } from "node:module";
import type { InstallLinks } from "../utils/url.js";

const require = createRequire(import.meta.url);
const { version: VERSION } = require("../../package.json") as {
  version: string;
};

export type ConfigureFormValues = {
  username?: string;
  preferredLanguage?: string;
  preferredOnly?: boolean;
};

export type ConfigurePageOptions = {
  error?: string;
  values?: ConfigureFormValues;
  connected?: boolean;
  links?: InstallLinks;
};

const GITHUB_REPO = "https://github.com/mrcanelas/erai-raws-subs";
const FLAG_CDN = "https://hatscripts.github.io/circle-flags/flags";
const BRAND_LOGO = "/logo.png";
const FAVICON = "/favicon.png";

const LANGUAGES: Array<{ code: string; label: string; country: string }> = [
  { code: "eng", label: "English", country: "us" },
  { code: "spa", label: "Spanish", country: "es" },
  { code: "por", label: "Portuguese (Brazil)", country: "br" },
  { code: "fre", label: "French", country: "fr" },
  { code: "ger", label: "German", country: "de" },
  { code: "ita", label: "Italian", country: "it" },
  { code: "ara", label: "Arabic", country: "sa" },
  { code: "rus", label: "Russian", country: "ru" },
  { code: "jpn", label: "Japanese", country: "jp" },
  { code: "chi", label: "Chinese", country: "cn" },
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function flagUrl(country: string): string {
  return `${FLAG_CDN}/${country}.svg`;
}

const ICONS = {
  eye: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeOff: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-4.86"/><path d="m2 2 20 20"/></svg>`,
  logout: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`,
  alert: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`,
  shield: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>`,
  external: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`,
  github: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>`,
  bug: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>`,
  chevron: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`,
};

const STYLE = `
  :root {
    color-scheme: dark;
    --background: #0b0d12;
    --foreground: #f4f6fb;
    --card: #12161f;
    --muted: #9aa3b5;
    --border: rgba(255, 255, 255, 0.1);
    --input: #0f131a;
    --primary: #7c6cff;
    --primary-hover: #8f82ff;
    --success: #34d399;
    --warning: #fbbf24;
    --destructive: #f87171;
    --secondary: rgba(255, 255, 255, 0.06);
    --radius: 16px;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    background: var(--background);
    color: var(--foreground);
  }
  .shell {
    width: min(42rem, 100%);
    margin: 0 auto;
    padding: 2.5rem 1.25rem 3.5rem;
  }
  header.brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 2rem;
  }
  .brand-mark {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.75rem;
    overflow: hidden;
    flex: 0 0 auto;
    background: var(--secondary);
  }
  .brand-mark img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }
  .brand h1 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    letter-spacing: -0.02em;
  }
  .brand p {
    margin: 0.15rem 0 0;
    color: var(--muted);
    font-size: 0.875rem;
  }
  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.5rem;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  }
  /* Prefer direct shell children so scripts between cards don't break spacing. */
  .shell > .card { margin-top: 1.25rem; }
  .shell > header.brand + .card { margin-top: 0; }
  .card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }
  .card h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }
  .card .hint {
    margin: 0.35rem 0 0;
    color: var(--muted);
    font-size: 0.875rem;
    line-height: 1.45;
  }
  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    border-radius: 999px;
    padding: 0.25rem 0.65rem;
    font-size: 0.75rem;
    font-weight: 500;
    white-space: nowrap;
    flex: 0 0 auto;
  }
  .status-pill .dot {
    width: 0.375rem;
    height: 0.375rem;
    border-radius: 50%;
  }
  .status-idle {
    background: var(--secondary);
    color: var(--muted);
  }
  .status-idle .dot { background: var(--muted); }
  .status-connected {
    background: color-mix(in srgb, var(--success) 15%, transparent);
    color: var(--success);
  }
  .status-connected .dot { background: var(--success); }
  .status-error {
    background: color-mix(in srgb, var(--destructive) 15%, transparent);
    color: var(--destructive);
  }
  .status-error .dot { background: var(--destructive); }
  .field { margin-bottom: 1rem; }
  .field label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
  }
  .control { position: relative; }
  .control input {
    width: 100%;
    height: 2.5rem;
    padding: 0 2.5rem 0 0.85rem;
    border-radius: 0.65rem;
    border: 1px solid var(--border);
    background: var(--input);
    color: var(--foreground);
    font-size: 0.9375rem;
  }
  .control input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 25%, transparent);
  }
  .control input:disabled { opacity: 0.65; }
  .toggle-eye {
    position: absolute;
    inset: 0 0 0 auto;
    width: 2.5rem;
    border: none;
    background: transparent;
    color: var(--muted);
    display: grid;
    place-items: center;
    cursor: pointer;
  }
  .toggle-eye:hover { color: var(--foreground); }
  .btn {
    appearance: none;
    border: 1px solid transparent;
    border-radius: 0.65rem;
    height: 2.5rem;
    padding: 0 1rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
  .btn-primary {
    width: 100%;
    background: var(--primary);
    color: white;
  }
  .btn-primary:hover { background: var(--primary-hover); }
  .btn-outline {
    background: transparent;
    color: var(--foreground);
    border-color: var(--border);
  }
  .btn-outline:hover { background: var(--secondary); }
  .btn-sm {
    height: 2rem;
    padding: 0 0.75rem;
    font-size: 0.8125rem;
    width: auto;
  }
  .error {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    margin: 0 0 1rem;
    padding: 0.75rem;
    border-radius: 0.65rem;
    border: 1px solid color-mix(in srgb, var(--destructive) 40%, transparent);
    background: color-mix(in srgb, var(--destructive) 10%, transparent);
    color: var(--destructive);
    font-size: 0.875rem;
  }
  .error svg { flex: 0 0 auto; margin-top: 0.1rem; }
  .connected-box {
    border: 1px solid var(--border);
    background: color-mix(in srgb, var(--secondary) 70%, transparent);
    border-radius: 0.75rem;
    padding: 1rem;
  }
  .connected-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }
  .connected-row .email {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .connected-row .sub {
    margin: 0.2rem 0 0;
    color: var(--muted);
    font-size: 0.75rem;
  }
  .install {
    display: grid;
    gap: 0.65rem;
    margin-top: 1rem;
  }
  .install a.manifest {
    word-break: break-all;
    font-size: 0.75rem;
    color: var(--muted);
    border: 1px solid var(--border);
    border-radius: 0.65rem;
    padding: 0.75rem 0.85rem;
    text-decoration: none;
    background: var(--input);
  }
  .secure-note {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    margin-top: 1rem;
    color: var(--muted);
    font-size: 0.75rem;
    line-height: 1.45;
  }
  .secure-note svg {
    flex: 0 0 auto;
    margin-top: 0.1rem;
  }
  .stack { margin-top: 1.25rem; display: grid; gap: 1.25rem; }
  .select { position: relative; }
  .select-trigger {
    width: 100%;
    height: 2.5rem;
    padding: 0 2.5rem 0 0.75rem;
    border-radius: 0.65rem;
    border: 1px solid var(--border);
    background: var(--input);
    color: var(--foreground);
    font-size: 0.9375rem;
    display: flex;
    align-items: center;
    gap: 0.65rem;
    cursor: pointer;
    text-align: left;
  }
  .select-trigger:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 25%, transparent);
  }
  .select-trigger[aria-disabled="true"] {
    cursor: default;
    opacity: 0.7;
  }
  .select-trigger .chevron {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--muted);
    pointer-events: none;
    display: grid;
  }
  .select[data-open="true"] .select-trigger .chevron {
    transform: translateY(-50%) rotate(180deg);
  }
  .select-menu {
    position: absolute;
    z-index: 30;
    top: calc(100% + 0.35rem);
    left: 0;
    right: 0;
    max-height: 16rem;
    overflow-y: auto;
    padding: 0.35rem;
    border-radius: 0.75rem;
    border: 1px solid var(--border);
    background: var(--card);
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
    display: none;
  }
  .select[data-open="true"] .select-menu { display: block; }
  .select-option {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    width: 100%;
    padding: 0.55rem 0.65rem;
    border: none;
    background: transparent;
    color: var(--foreground);
    font-size: 0.875rem;
    border-radius: 0.55rem;
    cursor: pointer;
    text-align: left;
  }
  .select-option:hover,
  .select-option[aria-selected="true"] {
    background: color-mix(in srgb, var(--primary) 16%, transparent);
  }
  .flag-icon {
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 50%;
    display: block;
    flex: 0 0 auto;
    object-fit: cover;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12);
  }
  .divider {
    height: 1px;
    background: var(--border);
    border: none;
    margin: 0;
  }
  .pref-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }
  .pref-row .copy { padding-right: 0.5rem; }
  .pref-row .title {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 500;
  }
  .pref-row .desc {
    margin: 0.35rem 0 0;
    color: var(--muted);
    font-size: 0.75rem;
    line-height: 1.4;
  }
  .switch {
    position: relative;
    width: 2.75rem;
    height: 1.55rem;
    flex: 0 0 auto;
    margin-top: 0.1rem;
  }
  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  .switch .slider {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    background: #2a3140;
    cursor: pointer;
    transition: 0.2s;
  }
  .switch .slider::before {
    content: "";
    position: absolute;
    width: 1.2rem;
    height: 1.2rem;
    left: 0.18rem;
    top: 0.18rem;
    border-radius: 50%;
    background: white;
    transition: 0.2s;
  }
  .switch input:checked + .slider { background: var(--primary); }
  .switch input:checked + .slider::before { transform: translateX(1.2rem); }
  .switch input:disabled + .slider { opacity: 0.6; cursor: default; }
  .updates-row,
  .about-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .version {
    border-radius: 999px;
    background: var(--secondary);
    color: var(--muted);
    padding: 0.15rem 0.65rem;
    font-size: 0.75rem;
    font-weight: 500;
  }
  .about-list {
    list-style: none;
    margin: 1rem 0 0;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 0.75rem;
    overflow: hidden;
  }
  .about-list li + li { border-top: 1px solid var(--border); }
  .about-list a {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    color: var(--foreground);
    text-decoration: none;
    font-size: 0.875rem;
    background: var(--card);
  }
  .about-list a:hover { background: color-mix(in srgb, var(--primary) 8%, transparent); }
  .about-list .left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .about-list .left svg,
  .about-list > a > svg { color: var(--muted); }
  .disclaimer {
    margin: 1rem 0 0;
    color: var(--muted);
    font-size: 0.75rem;
    line-height: 1.55;
  }
  footer {
    margin-top: 2rem;
    text-align: center;
    color: var(--muted);
    font-size: 0.75rem;
  }
`;

function statusPill(connected: boolean, hasError: boolean): string {
  if (connected) {
    return `<span class="status-pill status-connected"><span class="dot"></span>${ICONS.check} Connected</span>`;
  }
  if (hasError) {
    return `<span class="status-pill status-error"><span class="dot"></span> Auth failed</span>`;
  }
  return `<span class="status-pill status-idle"><span class="dot"></span> Not connected</span>`;
}

function aboutLink(href: string, icon: string, label: string): string {
  return `<li>
    <a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">
      <span class="left">${icon}<span>${escapeHtml(label)}</span></span>
      ${ICONS.external}
    </a>
  </li>`;
}

function layout(body: string, scripts = ""): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Erai-Raws Subtitle Addon — Configuration</title>
  <meta name="description" content="Configure your Erai-Raws Stremio subtitle addon: sign in, choose your preferred subtitle language, and manage preferences." />
  <meta property="og:title" content="Erai-Raws Subtitle Addon — Configuration" />
  <meta property="og:description" content="Configure your Erai-Raws Stremio subtitle addon: sign in, choose your preferred subtitle language, and manage preferences." />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary" />
  <link rel="icon" type="image/png" sizes="32x32" href="${FAVICON}" />
  <style>${STYLE}</style>
</head>
<body>
  <div class="shell">
    <header class="brand">
      <img src="${BRAND_LOGO}" alt="Erai-Raws Subtitle Addon" width="40" height="40" />
      <div>
        <h1>Erai-Raws Subtitle Addon</h1>
        <p>Configuration • Stremio addon</p>
      </div>
    </header>
    ${body}
    <footer>Made for Stremio • Erai-Raws Subtitle Addon</footer>
  </div>
  ${scripts}
  <script>
    (function () {
      var button = document.getElementById("toggle-password");
      var input = document.getElementById("password");
      if (!button || !input) return;
      button.addEventListener("click", function () {
        var hidden = input.type === "password";
        input.type = hidden ? "text" : "password";
        button.innerHTML = hidden
          ? ${JSON.stringify(ICONS.eyeOff)}
          : ${JSON.stringify(ICONS.eye)};
        button.setAttribute("aria-label", hidden ? "Hide password" : "Show password");
      });
    })();
  </script>
</body>
</html>`;
}

export function renderConfigurePage(options: ConfigurePageOptions = {}): string {
  const values = options.values ?? {};
  const preferredLanguage = values.preferredLanguage ?? "eng";
  const preferredOnly = values.preferredOnly ?? true;
  const connected = Boolean(options.connected && options.links);
  const hasError = Boolean(options.error);
  const username = values.username ?? "";

  const selectedLanguage =
    LANGUAGES.find((language) => language.code === preferredLanguage) ??
    LANGUAGES[0];

  const optionButtons = LANGUAGES.map((language) => {
    const isSelected = language.code === selectedLanguage.code;
    return `
      <button
        type="button"
        class="select-option"
        role="option"
        data-value="${language.code}"
        data-country="${language.country}"
        aria-selected="${isSelected ? "true" : "false"}"
        ${connected ? "disabled" : ""}
      >
        <img class="flag-icon" src="${escapeHtml(flagUrl(language.country))}" alt="" width="20" height="20" />
        <span>${escapeHtml(language.label)}</span>
      </button>`;
  }).join("");

  const accountBody = connected
    ? `
      <div class="connected-box">
        <div class="connected-row">
          <div class="min-w-0">
            <p class="email">${escapeHtml(username || "Signed in")}</p>
            <p class="sub">You are signed in to Erai-Raws.</p>
          </div>
          <a class="btn btn-outline btn-sm" href="/configure">${ICONS.logout} Sign out</a>
        </div>
      </div>
      <div class="install">
        <a class="btn btn-primary" href="${escapeHtml(options.links!.installUrl)}">Install in Stremio</a>
        <a class="manifest" href="${escapeHtml(options.links!.manifestUrl)}">${escapeHtml(options.links!.manifestUrl)}</a>
      </div>
    `
    : `
      ${
        hasError
          ? `<div class="error">${ICONS.alert}<span>${escapeHtml(options.error!)}</span></div>`
          : ""
      }
      <form method="post" action="/configure">
        <div class="field">
          <label for="username">Email</label>
          <div class="control">
            <input id="username" name="username" type="email" autocomplete="email" required
              value="${escapeHtml(username)}" placeholder="you@example.com" />
          </div>
        </div>
        <div class="field">
          <label for="password">Password</label>
          <div class="control">
            <input id="password" name="password" type="password" autocomplete="current-password" required placeholder="••••••••" />
            <button type="button" class="toggle-eye" id="toggle-password" aria-label="Show password">${ICONS.eye}</button>
          </div>
        </div>
        <input type="hidden" name="preferredLanguage" id="preferredLanguageMirror" value="${escapeHtml(preferredLanguage)}" />
        <input type="hidden" name="preferredOnly" id="preferredOnlyMirror" value="${preferredOnly ? "1" : "0"}" />
        <button class="btn btn-primary" type="submit">Sign in</button>
      </form>
    `;

  const accountCard = `
    <section class="card">
      <div class="card-head">
        <div>
          <h2>Erai-Raws Account</h2>
          <p class="hint">Sign in to fetch subtitles from your account.</p>
        </div>
        ${statusPill(connected, hasError)}
      </div>
      ${accountBody}
      <div class="secure-note">
        ${ICONS.shield}
        <p>Your credentials are used only to access subtitles from Erai-Raws and are stored encrypted on this server. They are never sent to Stremio.</p>
      </div>
    </section>
  `;

  const preferencesCard = `
    <section class="card">
      <h2>Subtitle Preferences</h2>
      <p class="hint">Customize how subtitles are shown in Stremio.</p>
      <div class="stack">
        <div class="field" style="margin-bottom:0">
          <label id="preferredLanguageLabel">Preferred language</label>
          <div class="select" id="languageSelect" data-open="false">
            <button
              type="button"
              class="select-trigger"
              id="languageTrigger"
              aria-haspopup="listbox"
              aria-expanded="false"
              aria-labelledby="preferredLanguageLabel"
              ${connected ? 'aria-disabled="true"' : ""}
            >
              <img
                class="flag-icon"
                id="languageTriggerFlag"
                src="${escapeHtml(flagUrl(selectedLanguage.country))}"
                alt=""
                width="20"
                height="20"
              />
              <span id="languageTriggerLabel">${escapeHtml(selectedLanguage.label)}</span>
              <span class="chevron">${ICONS.chevron}</span>
            </button>
            <div class="select-menu" role="listbox" aria-labelledby="preferredLanguageLabel">
              ${optionButtons}
            </div>
          </div>
        </div>
        <hr class="divider" />
        <div class="pref-row">
          <div class="copy">
            <p class="title">Show only preferred language</p>
            <p class="desc">When off, all available subtitle languages are shown.</p>
          </div>
          <label class="switch">
            <input type="checkbox" id="preferredOnly" ${preferredOnly ? "checked" : ""} ${connected ? "disabled" : ""} />
            <span class="slider"></span>
          </label>
        </div>
      </div>
    </section>
  `;

  const preferencesScript = `
    <script>
      (function () {
        var only = document.getElementById("preferredOnly");
        var onlyMirror = document.getElementById("preferredOnlyMirror");
        var languageMirror = document.getElementById("preferredLanguageMirror");
        var root = document.getElementById("languageSelect");
        var trigger = document.getElementById("languageTrigger");
        var triggerFlag = document.getElementById("languageTriggerFlag");
        var triggerLabel = document.getElementById("languageTriggerLabel");
        var disabled = ${connected ? "true" : "false"};

        function syncOnly() {
          if (onlyMirror && only) onlyMirror.value = only.checked ? "1" : "0";
        }
        if (only) only.addEventListener("change", syncOnly);
        syncOnly();

        if (disabled || !root || !trigger) return;

        var options = Array.prototype.slice.call(
          root.querySelectorAll(".select-option")
        );

        function setOpen(open) {
          root.setAttribute("data-open", open ? "true" : "false");
          trigger.setAttribute("aria-expanded", open ? "true" : "false");
        }

        function choose(option) {
          var value = option.getAttribute("data-value");
          var country = option.getAttribute("data-country");
          var label = option.querySelector("span").textContent;
          if (languageMirror) languageMirror.value = value;
          if (triggerLabel) triggerLabel.textContent = label;
          if (triggerFlag && country) {
            triggerFlag.src = ${JSON.stringify(FLAG_CDN + "/")} + country + ".svg";
          }
          options.forEach(function (item) {
            item.setAttribute(
              "aria-selected",
              item === option ? "true" : "false"
            );
          });
          setOpen(false);
        }

        trigger.addEventListener("click", function (event) {
          event.stopPropagation();
          setOpen(root.getAttribute("data-open") !== "true");
        });

        options.forEach(function (option) {
          option.addEventListener("click", function () {
            choose(option);
          });
        });

        document.addEventListener("click", function (event) {
          if (!root.contains(event.target)) setOpen(false);
        });
        document.addEventListener("keydown", function (event) {
          if (event.key === "Escape") setOpen(false);
        });
      })();
    </script>
  `;

  const updatesCard = `
    <section class="card">
      <div class="updates-row">
        <div>
          <h2>Updates</h2>
          <p class="hint">See what's new in the latest release.</p>
        </div>
        <a class="btn btn-outline btn-sm" href="${escapeHtml(GITHUB_REPO + "/releases")}" target="_blank" rel="noreferrer">
          What's New ${ICONS.external}
        </a>
      </div>
    </section>
  `;

  const aboutCard = `
    <section class="card">
      <div class="about-head">
        <h2>About</h2>
        <span class="version">v${VERSION}</span>
      </div>
      <ul class="about-list">
        ${aboutLink(GITHUB_REPO, ICONS.github, "GitHub repository")}
        ${aboutLink(`${GITHUB_REPO}/issues/new`, ICONS.bug, "Report an issue")}
        ${aboutLink("https://www.erai-raws.info/", ICONS.external, "Erai-Raws website")}
      </ul>
      <p class="disclaimer">
        This addon is a community project and is not affiliated with, endorsed by, or associated with Erai-Raws.
      </p>
    </section>
  `;

  return layout(
    `${accountCard}${preferencesCard}${updatesCard}${aboutCard}`,
    preferencesScript,
  );
}

/** @deprecated Prefer renderConfigurePage */
export function renderConfigureForm(options: { error?: string } = {}): string {
  return renderConfigurePage(options);
}

/** @deprecated Prefer renderConfigurePage */
export function renderConfigureSuccess(links: InstallLinks): string {
  return renderConfigurePage({ connected: true, links });
}
