import type { InstallLinks } from "../utils/url.js";

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const LANGUAGES: Array<{ code: string; label: string; flag: string }> = [
  { code: "por", label: "Português (Brasil)", flag: "🇧🇷" },
  { code: "eng", label: "English", flag: "🇺🇸" },
  { code: "spa", label: "Español", flag: "🇪🇸" },
  { code: "fre", label: "Français", flag: "🇫🇷" },
  { code: "ita", label: "Italiano", flag: "🇮🇹" },
  { code: "ger", label: "Deutsch", flag: "🇩🇪" },
  { code: "jpn", label: "日本語", flag: "🇯🇵" },
  { code: "chi", label: "中文", flag: "🇨🇳" },
];

const STYLE = `
  :root {
    color-scheme: dark;
    --bg: #0b0e14;
    --bg-elevated: #12161f;
    --bg-input: #0f131a;
    --border: rgba(255, 255, 255, 0.08);
    --border-strong: rgba(255, 255, 255, 0.14);
    --text: #f4f6fb;
    --muted: #9aa3b5;
    --accent: #5865f2;
    --accent-hover: #6b76f5;
    --success: #2ecc71;
    --danger: #ff6b7a;
    --radius: 14px;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    font-family: Inter, "Segoe UI", system-ui, -apple-system, sans-serif;
    background:
      radial-gradient(ellipse 80% 50% at 50% -10%, rgba(88, 101, 242, 0.18), transparent),
      var(--bg);
    color: var(--text);
  }
  .shell {
    width: min(560px, 100%);
    margin: 0 auto;
    padding: 28px 18px 40px;
  }
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 28px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--muted);
    font-size: 14px;
    font-weight: 600;
  }
  .brand-mark {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: linear-gradient(135deg, #7b5cff, #5865f2);
    display: grid;
    place-items: center;
    color: white;
    font-size: 13px;
    font-weight: 800;
  }
  .close {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--muted);
    display: grid;
    place-items: center;
    text-decoration: none;
    font-size: 18px;
  }
  .hero {
    text-align: center;
    margin-bottom: 22px;
  }
  .hero h1 {
    margin: 0 0 8px;
    font-size: 28px;
    letter-spacing: -0.03em;
  }
  .hero p {
    margin: 0;
    color: var(--muted);
    font-size: 15px;
  }
  .card {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    margin-bottom: 14px;
  }
  .card h2 {
    margin: 0 0 6px;
    font-size: 17px;
  }
  .card .hint {
    margin: 0 0 16px;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.45;
  }
  .field { margin-bottom: 12px; }
  .field label {
    display: block;
    margin-bottom: 7px;
    font-size: 13px;
    color: var(--muted);
  }
  .control {
    position: relative;
  }
  .control .icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--muted);
    font-size: 15px;
    pointer-events: none;
  }
  .control input,
  .control select {
    width: 100%;
    height: 46px;
    padding: 0 42px 0 40px;
    border-radius: 11px;
    border: 1px solid var(--border-strong);
    background: var(--bg-input);
    color: var(--text);
    font-size: 15px;
  }
  .control input:focus,
  .control select:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(88, 101, 242, 0.2);
  }
  .toggle-eye {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    border: none;
    background: transparent;
    color: var(--muted);
    width: 34px;
    height: 34px;
    border-radius: 8px;
    cursor: pointer;
  }
  .row-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
  }
  .btn {
    appearance: none;
    border: none;
    border-radius: 11px;
    height: 42px;
    padding: 0 18px;
    font-size: 14px;
    font-weight: 650;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .btn-primary {
    background: var(--accent);
    color: white;
  }
  .btn-primary:hover { background: var(--accent-hover); }
  .btn-ghost {
    background: transparent;
    color: var(--text);
    border: 1px solid var(--border-strong);
  }
  .btn-ghost:hover { background: rgba(255,255,255,0.04); }
  .pref-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding-top: 4px;
  }
  .pref-row span {
    font-size: 14px;
    color: var(--text);
  }
  .switch {
    position: relative;
    width: 46px;
    height: 26px;
    flex: 0 0 auto;
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
    width: 20px;
    height: 20px;
    left: 3px;
    top: 3px;
    border-radius: 50%;
    background: white;
    transition: 0.2s;
  }
  .switch input:checked + .slider {
    background: var(--accent);
  }
  .switch input:checked + .slider::before {
    transform: translateX(20px);
  }
  .info-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .status-block strong {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }
  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #6b7385;
  }
  .dot.ok { background: var(--success); box-shadow: 0 0 0 4px rgba(46, 204, 113, 0.15); }
  .status-block p {
    margin: 6px 0 0;
    color: var(--muted);
    font-size: 13px;
  }
  .updates {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .updates p {
    margin: 6px 0 0;
    color: var(--muted);
    font-size: 13px;
  }
  .error {
    margin: 0 0 14px;
    padding: 12px 14px;
    border-radius: 11px;
    background: rgba(255, 107, 122, 0.1);
    border: 1px solid rgba(255, 107, 122, 0.35);
    color: #ffb4bc;
    font-size: 13px;
  }
  .install {
    margin-top: 14px;
    display: grid;
    gap: 10px;
  }
  .install a.secondary {
    word-break: break-all;
    font-weight: 500;
    font-size: 12px;
    color: var(--muted);
    border: 1px solid var(--border-strong);
    background: var(--bg-input);
    border-radius: 11px;
    padding: 12px 14px;
    text-decoration: none;
  }
  .footer {
    margin-top: 22px;
    text-align: center;
    color: #6f778a;
    font-size: 12px;
    line-height: 1.55;
  }
`;

function languageOptions(selected = "por"): string {
  return LANGUAGES.map((language) => {
    const isSelected = language.code === selected ? " selected" : "";
    return `<option value="${language.code}"${isSelected}>${language.flag} ${escapeHtml(language.label)}</option>`;
  }).join("");
}

function layout(body: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Erai-Raws Subtitle Addon</title>
  <style>${STYLE}</style>
</head>
<body>
  <div class="shell">
    <div class="topbar">
      <div class="brand">
        <div class="brand-mark">S</div>
        <span>Stremio</span>
      </div>
      <a class="close" href="/" title="Fechar" aria-label="Fechar">×</a>
    </div>
    <div class="hero">
      <h1>Erai-Raws Subtitle Addon</h1>
      <p>Configure suas preferências e autenticação</p>
    </div>
    ${body}
    <div class="footer">
      Erai-Raws Subtitle Addon v0.1.0<br />
      Não afiliado ao Erai-Raws. Uso apenas para fins educacionais.
    </div>
  </div>
  <script>
    (function () {
      var button = document.getElementById("toggle-password");
      var input = document.getElementById("password");
      if (!button || !input) return;
      button.addEventListener("click", function () {
        var hidden = input.type === "password";
        input.type = hidden ? "text" : "password";
        button.textContent = hidden ? "🙈" : "👁";
        button.setAttribute("aria-label", hidden ? "Ocultar senha" : "Mostrar senha");
      });
    })();
  </script>
</body>
</html>`;
}

export function renderConfigurePage(options: ConfigurePageOptions = {}): string {
  const values = options.values ?? {};
  const preferredLanguage = values.preferredLanguage ?? "por";
  const preferredOnly = values.preferredOnly ?? true;
  const connected = Boolean(options.connected && options.links);
  const error = options.error
    ? `<div class="error">${escapeHtml(options.error)}</div>`
    : "";

  const accountCard = connected
    ? `
      <section class="card">
        <h2>Conta Erai-Raws</h2>
        <p class="hint">Sua conta foi validada. As credenciais ficam cifradas neste servidor e nunca são enviadas ao Stremio.</p>
        <div class="install">
          <a class="btn btn-primary" href="${escapeHtml(options.links!.installUrl)}">Instalar no Stremio</a>
          <a class="secondary" href="${escapeHtml(options.links!.manifestUrl)}">${escapeHtml(options.links!.manifestUrl)}</a>
        </div>
      </section>
    `
    : `
      <section class="card">
        <h2>Conta Erai-Raws</h2>
        <p class="hint">Informe sua conta do Erai-Raws para autenticar e liberar as legendas ASS no Stremio.</p>
        ${error}
        <form method="post" action="/configure">
          <div class="field">
            <label for="username">E-mail</label>
            <div class="control">
              <span class="icon" aria-hidden="true">✉</span>
              <input id="username" name="username" type="text" autocomplete="username" required
                value="${escapeHtml(values.username ?? "")}" placeholder="seu@email.com" />
            </div>
          </div>
          <div class="field">
            <label for="password">Senha</label>
            <div class="control">
              <span class="icon" aria-hidden="true">🔒</span>
              <input id="password" name="password" type="password" autocomplete="current-password" required placeholder="••••••••" />
              <button type="button" class="toggle-eye" id="toggle-password" aria-label="Mostrar senha">👁</button>
            </div>
          </div>
          <input type="hidden" name="preferredLanguage" id="preferredLanguageMirror" value="${escapeHtml(preferredLanguage)}" />
          <input type="hidden" name="preferredOnly" id="preferredOnlyMirror" value="${preferredOnly ? "1" : "0"}" />
          <div class="row-actions">
            <button class="btn btn-primary" type="submit">Entrar</button>
          </div>
        </form>
      </section>
    `;

  const preferencesCard = `
    <section class="card">
      <h2>Preferências</h2>
      <div class="field">
        <label for="preferredLanguage">Idioma preferencial</label>
        <div class="control">
          <span class="icon" aria-hidden="true">🌐</span>
          <select id="preferredLanguage" name="preferredLanguage" ${connected ? "disabled" : ""}>
            ${languageOptions(preferredLanguage)}
          </select>
        </div>
      </div>
      <div class="pref-row">
        <span>Mostrar apenas idioma preferencial</span>
        <label class="switch">
          <input type="checkbox" id="preferredOnly" ${preferredOnly ? "checked" : ""} ${connected ? "disabled" : ""} />
          <span class="slider"></span>
        </label>
      </div>
    </section>
    <script>
      (function () {
        var language = document.getElementById("preferredLanguage");
        var only = document.getElementById("preferredOnly");
        var languageMirror = document.getElementById("preferredLanguageMirror");
        var onlyMirror = document.getElementById("preferredOnlyMirror");
        function sync() {
          if (languageMirror && language) languageMirror.value = language.value;
          if (onlyMirror && only) onlyMirror.value = only.checked ? "1" : "0";
        }
        if (language) language.addEventListener("change", sync);
        if (only) only.addEventListener("change", sync);
        sync();
      })();
    </script>
  `;

  const infoCard = `
    <section class="card">
      <div class="info-row">
        <div class="status-block">
          <strong><span class="dot ${connected ? "ok" : ""}"></span>${connected ? "Conectado" : "Desconectado"}</strong>
          <p>${connected ? "Autenticação válida. Você já pode instalar o addon." : "Status da conexão com o Erai-Raws."}</p>
        </div>
        ${
          connected
            ? `<a class="btn btn-ghost" href="/configure">Sair</a>`
            : `<button class="btn btn-ghost" type="button" disabled>Sair</button>`
        }
      </div>
    </section>
  `;

  const updatesCard = `
    <section class="card">
      <div class="updates">
        <div>
          <h2>Atualizações</h2>
          <p>Verifique as novidades e alterações do addon.</p>
        </div>
        <a class="btn btn-ghost" href="#changelog">
          Ver changelog ↗
        </a>
      </div>
    </section>
  `;

  return layout(`${accountCard}${preferencesCard}${infoCard}${updatesCard}`);
}

/** @deprecated Prefer renderConfigurePage */
export function renderConfigureForm(options: { error?: string } = {}): string {
  return renderConfigurePage(options);
}

/** @deprecated Prefer renderConfigurePage */
export function renderConfigureSuccess(links: InstallLinks): string {
  return renderConfigurePage({ connected: true, links });
}
