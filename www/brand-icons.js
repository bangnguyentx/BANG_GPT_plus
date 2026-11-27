/**
 * API AI v6.0 — 24 Authentic Full-Color Brand SVG Icons (100% Offline Ready)
 * Supports Admin Global Overrides, User Custom Square Uploads (96x96 WebP/PNG) & Auto Favicon Detection
 */
(function () {
  "use strict";
  const BRAND_SVGS = {
    gmail: `<svg viewBox="0 0 32 32" fill="none"><path d="M4 9.5v14a2 2 0 0 0 2 2h3V14.8l7 5.2 7-5.2V25.5h3a2 2 0 0 0 2-2v-14l-12 8.8L4 9.5Z" fill="#EA4335"/><path d="M4 9.5a2.5 2.5 0 0 1 4-2l8 6 8-6a2.5 2.5 0 0 1 4 2v1.8l-12 8.9-12-8.9V9.5Z" fill="#C5221F"/><path d="M4 11.3V23.5a2 2 0 0 0 2 2h3V14.8l-5-3.5Z" fill="#4285F4"/><path d="M28 11.3V23.5a2 2 0 0 1-2 2h-3V14.8l5-3.5Z" fill="#34A853"/><path d="M23 14.8l5-3.5V9.5a2.5 2.5 0 0 0-4-2l-1 .75V14.8Z" fill="#FBBC04"/></svg>`,
    gdrive: `<svg viewBox="0 0 32 32" fill="none"><path d="M11.6 5.5h8.8l8.4 14.5-4.4 7.5H7.6L3.2 20 11.6 5.5Z" fill="#0F9D58"/><path d="M20.4 5.5H11.6l8.4 14.5h8.8L20.4 5.5Z" fill="#FFBA00"/><path d="M7.6 27.5h16.8l4.4-7.5H12L7.6 27.5Z" fill="#4285F4"/><path d="M11.6 5.5 3.2 20l4.4 7.5L16 13 11.6 5.5Z" fill="#0F9D58"/></svg>`,
    gcal: `<svg viewBox="0 0 32 32" fill="none"><rect x="4" y="4" width="24" height="24" rx="5" fill="#4285F4"/><rect x="8.5" y="9" width="15" height="14.5" rx="2" fill="#FFFFFF"/><path d="M28 21.5 21.5 28H24a4 4 0 0 0 4-4v-2.5Z" fill="#EA4335"/><path d="M4 21.5V24a4 4 0 0 0 4 4h2.5L4 21.5Z" fill="#34A853"/><path d="M28 10.5V8a4 4 0 0 0-4-4h-2.5L28 10.5Z" fill="#FBBC04"/><text x="16" y="20" text-anchor="middle" font-size="10.5" font-weight="700" font-family="system-ui,sans-serif" fill="#1A73E8">31</text></svg>`,
    slack: `<svg viewBox="0 0 32 32" fill="none"><rect x="13" y="4" width="4" height="10" rx="2" fill="#36C5F0"/><circle cx="10.5" cy="11.5" r="2.2" fill="#36C5F0"/><rect x="18" y="13" width="10" height="4" rx="2" fill="#2EB67D"/><circle cx="20.5" cy="10.5" r="2.2" fill="#2EB67D"/><rect x="15" y="18" width="4" height="10" rx="2" fill="#ECB22E"/><circle cx="21.5" cy="20.5" r="2.2" fill="#ECB22E"/><rect x="4" y="15" width="10" height="4" rx="2" fill="#E01E5A"/><circle cx="11.5" cy="21.5" r="2.2" fill="#E01E5A"/></svg>`,
    airtable: `<svg viewBox="0 0 32 32" fill="none"><path d="M16 5 4.5 9.8 16 14.6l11.5-4.8L16 5Z" fill="#FCB400"/><path d="M17.2 16.4v10.2l10.6-4.4V12l-10.6 4.4Z" fill="#18BFFF"/><path d="M14.8 16.4 4.2 12v10.2l10.6 4.4V16.4Z" fill="#F82B60"/></svg>`,
    gsheets: `<svg viewBox="0 0 32 32" fill="none"><path d="M8 3.5h11l7 7V26a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 6 26V6A2.5 2.5 0 0 1 8 3.5Z" fill="#0F9D58"/><path d="M19 3.5v5a2 2 0 0 0 2 2h5l-7-7Z" fill="#87CEAC"/><rect x="10" y="14.5" width="12" height="9" rx="1" stroke="#FFFFFF" stroke-width="1.6"/><path d="M10 19h12M15.5 14.5v9" stroke="#FFFFFF" stroke-width="1.5"/></svg>`,
    gdocs: `<svg viewBox="0 0 32 32" fill="none"><path d="M8 3.5h11l7 7V26a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 6 26V6A2.5 2.5 0 0 1 8 3.5Z" fill="#4285F4"/><path d="M19 3.5v5a2 2 0 0 0 2 2h5l-7-7Z" fill="#A1C2FA"/><path d="M10.5 15.5h11M10.5 19h11M10.5 22.5h7" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    supabase: `<svg viewBox="0 0 32 32" fill="none"><path d="M17.7 27.6c-.7.9-2.2.4-2.2-.8V17.5h10.2c1.4 0 2.2 1.6 1.3 2.7l-9.3 7.4Z" fill="#3ECF8E"/><path d="M14.3 4.4c.7-.9 2.2-.4 2.2.8v9.3H6.3c-1.4 0-2.2-1.6-1.3-2.7l9.3-7.4Z" fill="#24B47E"/></svg>`,
    confluence: `<svg viewBox="0 0 32 32" fill="none"><path d="M6 21.8c-.4.7-.9 1.6-1.2 2.2a1 1 0 0 0 .4 1.3l4.6 2.6a1 1 0 0 0 1.4-.4c.3-.5.7-1.3 1.2-2.1 2-3.4 4.1-3 7.8-1.2l4.4 2.1a1 1 0 0 0 1.3-.5l2.1-4.9a1 1 0 0 0-.5-1.3c-1.5-.7-4.5-2.1-6.5-3.1-6.2-3-11.5-2.6-15 5.3Z" fill="#2684FF"/><path d="M26 10.2c.4-.7.9-1.6 1.2-2.2a1 1 0 0 0-.4-1.3L22.2 4a1 1 0 0 0-1.4.4c-.3.5-.7 1.3-1.2 2.1-2 3.4-4.1 3-7.8 1.2L7.4 5.6a1 1 0 0 0-1.3.5L4 11a1 1 0 0 0 .5 1.3c1.5.7 4.5 2.1 6.5 3.1 6.2 3 11.5 2.6 15-5.2Z" fill="#0052CC"/></svg>`,
    jira: `<svg viewBox="0 0 32 32" fill="none"><path d="M26.5 4.5H15.2a5.2 5.2 0 0 0 5.2 5.2h2.1v2a5.2 5.2 0 0 0 5.2 5.2V5.7a1.2 1.2 0 0 0-1.2-1.2Z" fill="#2684FF"/><path d="M20.8 10.2H9.5a5.2 5.2 0 0 0 5.2 5.2h2.1v2a5.2 5.2 0 0 0 5.2 5.2V11.4a1.2 1.2 0 0 0-1.2-1.2Z" fill="#1868DB"/><path d="M15.1 15.9H3.8a5.2 5.2 0 0 0 5.2 5.2h2.1v2a5.2 5.2 0 0 0 5.2 5.2V17.1a1.2 1.2 0 0 0-1.2-1.2Z" fill="#0052CC"/></svg>`,
    clickup: `<svg viewBox="0 0 32 32" fill="none"><path d="M7.5 16.5 16 9l8.5 7.5" stroke="#FF02F0" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.5 21.5c2 2.6 4.7 4 7.5 4s5.5-1.4 7.5-4" stroke="#7B68EE" stroke-width="3.6" stroke-linecap="round"/></svg>`,
    dropbox: `<svg viewBox="0 0 32 32" fill="none"><path d="m10.2 6-6.7 4.3 6.7 4.3 5.8-3.8L10.2 6Zm11.6 0L16 10.8l5.8 3.8 6.7-4.3L21.8 6ZM3.5 18.9l6.7 4.3 5.8-3.8-6.7-4.3-5.8 3.8Zm18.3-3.8-5.8 3.8 5.8 3.8 6.7-4.3-6.7-3.3ZM16 20.6l-5.8 3.8-1.9-1.2v1.6L16 29l7.7-4.2v-1.6l-1.9 1.2-5.8-3.8Z" fill="#0061FF"/></svg>`,
    figma: `<svg viewBox="0 0 32 32" fill="none"><path d="M12 4.5h4v7.5h-4a3.75 3.75 0 0 1 0-7.5Z" fill="#F24E1E"/><path d="M16 4.5h4a3.75 3.75 0 1 1 0 7.5h-4V4.5Z" fill="#FF7262"/><path d="M12 12h4v7.5h-4a3.75 3.75 0 0 1 0-7.5Z" fill="#A259FF"/><circle cx="19.75" cy="15.75" r="3.75" fill="#1ABCFE"/><path d="M12 19.5h4v3.75a3.75 3.75 0 1 1-4-3.75Z" fill="#0ACF83"/></svg>`,
    hubspot: `<svg viewBox="0 0 32 32" fill="none"><circle cx="16.5" cy="17.5" r="6" stroke="#FF7A59" stroke-width="3.2"/><circle cx="22.5" cy="9.5" r="2.6" fill="#FF7A59"/><circle cx="9" cy="12" r="2.2" fill="#FF7A59"/><circle cx="24" cy="23.5" r="2.4" fill="#FF7A59"/><path d="M19.5 13 21.5 10.5M12 14.5 10.5 13M20.8 21.2 22.8 22.6" stroke="#FF7A59" stroke-width="2.4" stroke-linecap="round"/></svg>`,
    onedrive: `<svg viewBox="0 0 32 32" fill="none"><path d="M13 11a7 7 0 0 1 13.1 2.2A5.2 5.2 0 0 1 24.8 23H9.5a5.5 5.5 0 0 1-.8-10.9A7 7 0 0 1 13 11Z" fill="#0364B8"/><path d="M13 11a7 7 0 0 1 8.8-1.4l-6.6 7.8L8.7 12.1A7 7 0 0 1 13 11Z" fill="#0078D4"/><path d="M21.8 9.6A7 7 0 0 1 26.1 13.2 5.2 5.2 0 0 1 24.8 23h-9.6l6.6-13.4Z" fill="#28A8EA"/></svg>`,
    outlook: `<svg viewBox="0 0 32 32" fill="none"><rect x="12" y="6" width="16" height="20" rx="2.5" fill="#0078D4"/><path d="M12 10l8 5 8-5" stroke="#50E6FF" stroke-width="2" stroke-linecap="round"/><rect x="4" y="9" width="14" height="14" rx="2.5" fill="#0364B8"/><circle cx="11" cy="16" r="3.6" stroke="#FFFFFF" stroke-width="2.1"/></svg>`,
    salesforce: `<svg viewBox="0 0 32 32" fill="none"><path d="M12.2 9.2a6.4 6.4 0 0 1 10.4 1.6 5 5 0 0 1 4.6 8.2 4.8 4.8 0 0 1-4.3 5.5H9.6a5.4 5.4 0 0 1-1.3-10.6 5.6 5.6 0 0 1 3.9-4.7Z" fill="#00A1E0"/><text x="16" y="19.5" text-anchor="middle" font-size="7.5" font-weight="700" font-family="system-ui,sans-serif" fill="#FFFFFF">cloud</text></svg>`,
    whatsapp: `<svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="15.5" r="11.5" fill="#25D366"/><path d="m7.2 26.8 2.2-5.2 4.2 3-6.4 2.2Z" fill="#25D366"/><path d="M12.4 10.7c-.3-.6-.6-.6-.9-.6h-.8c-.3 0-.8.1-1.2.6s-1.5 1.5-1.5 3.6 1.5 4.2 1.8 4.5c.2.3 3 4.8 7.5 6.5 3.7 1.4 4.4 1.1 5.2 1 .8-.1 2.5-1 2.9-2 .3-1 .3-1.9.2-2-.1-.2-.4-.3-.9-.5s-2.5-1.2-2.9-1.4c-.4-.1-.7-.2-1 .2-.3.5-1.1 1.4-1.4 1.7-.3.3-.5.3-1 .1s-2-.7-3.8-2.3c-1.4-1.3-2.3-2.8-2.6-3.3-.3-.5 0-.7.2-1 .2-.2.5-.5.7-.8.2-.3.3-.5.4-.8.1-.3 0-.6-.1-.8l-1-2.5Z" fill="#FFFFFF"/></svg>`,
    youtube: `<svg viewBox="0 0 32 32" fill="none"><rect x="3" y="7" width="26" height="18" rx="5.5" fill="#FF0000"/><path d="M13.5 12v8l7-4-7-4Z" fill="#FFFFFF"/></svg>`,
    zendesk: `<svg viewBox="0 0 32 32" fill="none"><path d="M6 8h9v11L6 8Z" fill="#03363D"/><path d="M15 24a4.5 4.5 0 1 1-9 0h9Z" fill="#03363D"/><path d="M26 24h-9V13l9 11Z" fill="#17494D"/><path d="M17 8a4.5 4.5 0 1 1 9 0h-9Z" fill="#17494D"/></svg>`,
    calcom: `<svg viewBox="0 0 32 32" fill="none"><rect x="4" y="4" width="24" height="24" rx="6" fill="#111111"/><text x="16" y="20" text-anchor="middle" font-size="11" font-weight="800" font-family="system-ui,sans-serif" fill="#FFFFFF">Cal</text></svg>`,
    notion: `<svg viewBox="0 0 32 32" fill="none"><rect x="5" y="4.5" width="22" height="23" rx="4" fill="#FFFFFF" stroke="#18181B" stroke-width="2"/><path d="M11 22V10.5l9.5 11.5V10.5" stroke="#18181B" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    x: `<svg viewBox="0 0 32 32" fill="none"><rect x="4" y="4" width="24" height="24" rx="6" fill="#09090B"/><path d="M10 9.5h3.2l3.8 5.2 4.5-5.2h2.2l-5.7 6.5 6.2 8.5H21l-4.2-5.7-5 5.7H9.6l6.2-7-5.8-8Z" fill="#FFFFFF"/></svg>`,
    github: `<svg viewBox="0 0 32 32" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M16 4.5a11.5 11.5 0 0 0-3.64 22.41c.58.11.79-.25.79-.55v-2.16c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.76 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.39-5.26 5.67.42.36.79 1.06.79 2.14v3.17c0 .31.21.67.8.55A11.5 11.5 0 0 0 16 4.5Z" fill="#181717"/></svg>`
  };

  window.BRAND_CONNECTOR_SVGS = BRAND_SVGS;

  window.getConnectorIconHtml = function (id, customUrl = "", size = 38) {
    const adminIcons = window.V50?.publicAuthCfg?.connectorIcons || window.S?.adminData?.config?.connector_icons || {};
    const url = (customUrl || adminIcons[id] || "").trim();
    const boxStyle = `width:${size}px;height:${size}px;`;
    if (url && /^(https?:\/\/|data:image\/)/i.test(url)) {
      const safe = url.replace(/"/g, "&quot;");
      return `<span class="cx-conn-brand-box is-photo" style="${boxStyle}"><img src="${safe}" alt="" loading="lazy" /></span>`;
    }
    const svg = BRAND_SVGS[id];
    if (svg) return `<span class="cx-conn-brand-box" style="${boxStyle}">${svg}</span>`;
    return `<span class="cx-conn-brand-box" style="${boxStyle}"><svg viewBox="0 0 24 24" fill="none" stroke="#18181b" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg></span>`;
  };

  window.detectFaviconFromUrl = function (rawUrl) {
    try {
      const u = new URL(String(rawUrl || "").trim());
      if (u.protocol !== "http:" && u.protocol !== "https:") return "";
      return `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(u.hostname)}`;
    } catch { return ""; }
  };

  window.compressSquareIconFile = function (file, size = 96) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error("Thiếu tệp ảnh"));
      const fr = new FileReader();
      fr.onerror = () => reject(new Error("Không đọc được ảnh"));
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Định dạng ảnh không hợp lệ"));
        img.onload = () => {
          const cv = document.createElement("canvas");
          cv.width = size; cv.height = size;
          const ctx = cv.getContext("2d");
          const s = Math.min(img.width, img.height);
          const sx = (img.width - s) / 2, sy = (img.height - s) / 2;
          ctx.clearRect(0, 0, size, size);
          ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
          let out = cv.toDataURL("image/webp", 0.88);
          if (!out.startsWith("data:image/webp")) out = cv.toDataURL("image/png");
          resolve(out);
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  };
})();
