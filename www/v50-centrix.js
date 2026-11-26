/* ============================================================================
   API AI v5.0 — CENTRIX REBUILD ENGINE (Web PWA + Android APK + Worker v4.0+)
   - Zero-scope-bug centralized state (window.V50) + window.VIEW_RENDERERS router
   - True OLED Dark / Soft Graphite / Crisp Light + 12 Accent Swatches + Font/Anim
   - Real Google OAuth + Auto Trial + Profile (18 Interests & Avatar)
   - Real VietQR Napas 247 + SePay/Casso Auto-Webhook + Wallet + 10-min Auto-Poll
   - CentriX 5 Hubs: Tasks · Resources · Agents (+Tutors) · Studio · Connectors (+Skills)
   - Admin Console Pro: Health Lights, Revenue KPI, Order Filter/Search, User Filter/Search
   - Chat Stability Guards: safe renderMd, model auto-heal, stale run auto-recovery
   ============================================================================ */
(function () {
  "use strict";
  if (window.__V50_LOADED__) return;
  window.__V50_LOADED__ = true;

  const isNativeApk = () => Boolean(window.Capacitor?.isNativePlatform?.());
  const fmtVnd = n => Number(n || 0).toLocaleString("vi-VN") + " đ";

  // Centralized global UI state — NEVER rely on private IIFE `let` inside inline HTML handlers!
  const V50 = (window.V50 = {
    modelTab: "all",
    pricingTier: "pro",
    pricingMonths: 1,
    billingData: null,
    usageDays: 30,
    usageModel: "all",
    resTab: "pages",
    agentsTab: "teams",
    studioTab: "image",
    connTab: "connectors",
    connSearch: "",
    mcpAuthType: "none",
    mcpTestedTools: [],
    profileDraft: null,
    adminUserSearch: "",
    adminUserTier: "all",
    adminOrderFilter: "all",
    adminOrderSearch: "",
    publicAuthCfg: { googleEnabled: false, googleClientId: "", trialEnabled: true, trialDays: 14, trialTokens: 60000 }
  });

  let qrPollTimer = null;

  /* =========================================================================
     1. CHAT STABILITY GUARDS + SAFE MARKDOWN + QUICK FILL + HARDWARE BACK
     ========================================================================= */
  const _origRenderMdV50 = window.renderMd;
  if (typeof _origRenderMdV50 === "function") {
    window.renderMd = function (md) {
      try {
        return _origRenderMdV50(md);
      } catch (e) {
        console.warn("renderMd fallback:", e);
        return `<p>${esc(String(md || "")).replace(/\n/g, "<br>")}</p>`;
      }
    };
  }

  const _origSendPromptV50 = window.sendPrompt;
  if (typeof _origSendPromptV50 === "function") {
    window.sendPrompt = async function (overrideText = null, opts = {}) {
      try {
        // Auto-clear any stale run stuck > 6 minutes so user is never permanently blocked
        if (S.activeRuns && S.activeChatId && S.activeRuns.has(S.activeChatId)) {
          const r = S.activeRuns.get(S.activeChatId);
          if (r && r.startedAt && (Date.now() - r.startedAt > 360000)) {
            S.activeRuns.delete(S.activeChatId);
            if (typeof window.syncGlobalStreamingUi === "function") window.syncGlobalStreamingUi();
          }
        }
        // Auto-heal selectedModel if it's missing or locked
        if (Array.isArray(S.models) && S.models.length) {
          const cur = S.models.find(m => m.id === S.cfg.selectedModel && m.allowed);
          if (!cur) {
            const ok = S.models.find(m => m.allowed && m.id !== "auto") || S.models.find(m => m.allowed) || S.models[0];
            if (ok) { S.cfg.selectedModel = ok.id; dbPut("kv", S.cfg).catch(() => {}); }
          }
        }
        if (document.body.dataset.view !== "chat") switchView("chat");
      } catch {}
      return _origSendPromptV50(overrideText, opts);
    };
  }

  window.cxQuickFill = function (txt) {
    haptic("tap");
    const ta = document.getElementById("prompt-in");
    if (!ta) return;
    ta.value = txt || "";
    if (typeof autoGrow === "function") autoGrow();
    if (typeof updateOrbButton === "function") updateOrbButton();
    ta.focus();
  };

  // Escape key & Android Hardware Back — never trapped on any screen!
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (document.getElementById("modal-bg")?.classList.contains("open")) return closeModal();
    if (document.getElementById("sheet-tools-bg")?.classList.contains("open")) return closeToolsSheet();
    if (document.getElementById("sheet-settings-bg")?.classList.contains("open")) return closeSettingsSheet();
    if (document.getElementById("sidebar")?.classList.contains("open")) return toggleSidebar(false);
    const cur = document.body.dataset.view || "chat";
    if (cur !== "chat") switchView("chat");
  });

  if (window.Capacitor?.Plugins?.App?.addListener) {
    try {
      window.Capacitor.Plugins.App.addListener("backButton", () => {
        if (document.getElementById("modal-bg")?.classList.contains("open")) return closeModal();
        if (document.getElementById("sheet-tools-bg")?.classList.contains("open")) return closeToolsSheet();
        if (document.getElementById("sidebar")?.classList.contains("open")) return toggleSidebar(false);
        const cur = document.body.dataset.view || "chat";
        if (cur !== "chat") return switchView("chat");
      });
    } catch {}
  }

  /* =========================================================================
     2. WEB LANDING PAGE, PWA SERVICE WORKER & GOOGLE OAUTH
     ========================================================================= */
  if ("serviceWorker" in navigator && !isNativeApk() && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  async function loadPublicAuthConfig() {
    try {
      const r = await apiFetch("/public/auth-config", { auth: false });
      if (r.ok) V50.publicAuthCfg = await r.json();
    } catch {}
    initGoogleIdentitySdk();
  }

  function initGoogleIdentitySdk() {
    const cid = (V50.publicAuthCfg?.googleClientId || "").trim();
    const wrap = document.getElementById("google-gsi-btn");
    const fb = document.getElementById("btn-google-fallback");
    if (!cid || isNativeApk() || !window.google?.accounts?.id || !wrap) {
      if (wrap) wrap.style.display = "none";
      if (fb) fb.style.display = "inline-flex";
      return;
    }
    try {
      window.google.accounts.id.initialize({
        client_id: cid,
        callback: resp => { if (resp?.credential) submitGoogleCredential(resp.credential); }
      });
      wrap.innerHTML = "";
      wrap.style.display = "flex";
      window.google.accounts.id.renderButton(wrap, {
        theme: "filled_black", size: "large", shape: "pill", text: "continue_with", width: 320, locale: "vi"
      });
      if (fb) fb.style.display = "none";
    } catch {
      if (wrap) wrap.style.display = "none";
      if (fb) fb.style.display = "inline-flex";
    }
  }

  window.triggerGoogleSignIn = function () {
    haptic("tap");
    const cid = (V50.publicAuthCfg?.googleClientId || "").trim();
    if (!cid) {
      showToast("Admin chưa dán Google OAuth Client ID trong Quản trị → VietQR & Google", "warn");
      return;
    }
    if (isNativeApk()) {
      openModal(`<h3 style="font-size:16.5px;font-weight:600;margin-bottom:6px;">Đăng nhập Google trên Android APK</h3>
        <p style="font-size:13px;color:var(--ink-2);line-height:1.55;margin-bottom:12px;">Google hạn chế đăng nhập OAuth bên trong WebView nhúng của APK. Bạn hãy đăng nhập bằng Email/Mật khẩu ngay trên app, hoặc mở bản Web trên Chrome để liên kết Google 1 chạm.</p>
        <div style="display:flex;justify-content:flex-end;"><button type="button" class="btn-p tap" onclick="closeModal()">Đã hiểu</button></div>`);
      return;
    }
    if (window.google?.accounts?.id) {
      initGoogleIdentitySdk();
      try { window.google.accounts.id.prompt(); } catch {}
    } else {
      showToast("Đang tải dịch vụ Google, thử lại sau 2 giây...", "warn");
    }
  };

  async function submitGoogleCredential(credential) {
    showToast("Đang xác thực tài khoản Google...");
    try {
      const r = await apiFetch("/auth/google", {
        method: "POST",
        auth: false,
        body: { credential, deviceId: S.cfg.deviceId }
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Đăng nhập Google thất bại");
      S.cfg.token = data.token;
      await dbPut("kv", S.cfg);
      document.getElementById("web-landing")?.classList.remove("open");
      await onSessionReady(data.user, data.models, data.system);
      haptic("ok");
      showToast(data.isNew ? "Chào mừng bạn! Đã tặng gói dùng thử Trial miễn phí" : `Đã đăng nhập ${data.user.email}`, "ok");
    } catch (e) {
      haptic("err");
      showToast(e.message, "err");
    }
  }

  window.closeWebLandingToAuth = function (tab = "login") {
    haptic("tap");
    document.getElementById("web-landing")?.classList.remove("open");
    showAuthGate(true);
    setTimeout(() => { setAuthTab(tab); initGoogleIdentitySdk(); }, 40);
  };

  const _origShowAuthGateV50 = window.showAuthGate;
  window.showAuthGate = function (show) {
    if (typeof _origShowAuthGateV50 === "function") _origShowAuthGateV50(show);
    const wl = document.getElementById("web-landing");
    if (wl) {
      if (show && !isNativeApk() && !window.__SKIP_WEB_LANDING__) {
        wl.classList.add("open");
        window.__SKIP_WEB_LANDING__ = true;
      } else if (!show) {
        wl.classList.remove("open");
      }
    }
    if (show) setTimeout(initGoogleIdentitySdk, 120);
  };

  /* =========================================================================
     3. THEME SYSTEM (OLED / GRAPHITE / LIGHT + 12 ACCENTS + FONT + ANIMATION)
     ========================================================================= */
  const ACCENT_PALETTES = [
    { id: "cobalt",  name: "Cobalt",  hex: "#3b82f6" },
    { id: "indigo",  name: "Indigo",  hex: "#6366f1" },
    { id: "violet",  name: "Violet",  hex: "#8b5cf6" },
    { id: "rose",    name: "Rose",    hex: "#f43f5e" },
    { id: "coral",   name: "Coral",   hex: "#f97316" },
    { id: "amber",   name: "Amber",   hex: "#eab308" },
    { id: "emerald", name: "Emerald", hex: "#10b981" },
    { id: "teal",    name: "Teal",    hex: "#14b8a6" },
    { id: "sky",     name: "Sky",     hex: "#0ea5e9" },
    { id: "pink",    name: "Pink",    hex: "#ec4899" },
    { id: "lime",    name: "Lime",    hex: "#84cc16" },
    { id: "mono",    name: "Trắng",   hex: "#e4e4e7" }
  ];

  function normalizeSurfaceId(raw) {
    if (raw === "light") return "light";
    if (raw === "graphite") return "graphite";
    return "oled";
  }

  window.applyTheme = function () {
    const surf = normalizeSurfaceId(S.cfg?.surfaceTheme);
    document.body.dataset.surface = surf;
    document.body.dataset.accent = S.cfg?.accentColor || "cobalt";
    document.body.dataset.fontScale = S.cfg?.fontScale || "md";
    document.body.dataset.anim = S.cfg?.animMode || "snappy";
    document.body.classList.toggle("low-power-motion", Boolean(S.cfg?.lowPowerMotion || S.cfg?.animMode === "off"));
    const w = document.getElementById("wallpaper");
    if (w) {
      if (S.cfg?.wallpaper) { w.style.backgroundImage = `url(${S.cfg.wallpaper})`; w.classList.add("custom"); }
      else { w.style.backgroundImage = ""; w.classList.remove("custom"); }
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute("content", surf === "light" ? "#f5f5f7" : (surf === "graphite" ? "#0e0e11" : "#000000"));
    document.querySelectorAll("[data-iq]").forEach(b => b.classList.toggle("lg-active", b.dataset.iq === S.cfg?.imgQuality));
  };

  window.setSurfaceTheme = function (id) {
    S.cfg.surfaceTheme = normalizeSurfaceId(id);
    dbPut("kv", S.cfg).catch(() => {});
    window.applyTheme();
    haptic("switch");
    document.querySelectorAll(".v38-surface-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.surf === S.cfg.surfaceTheme));
  };

  window.setAccentColor = function (id) {
    S.cfg.accentColor = id;
    dbPut("kv", S.cfg).catch(() => {});
    window.applyTheme();
    haptic("switch");
    openAppearanceModal();
  };

  window.setFontScale = function (sc) {
    S.cfg.fontScale = sc;
    dbPut("kv", S.cfg).catch(() => {});
    window.applyTheme();
    haptic("tap");
    openAppearanceModal();
  };

  window.setAnimMode = function (mode) {
    S.cfg.animMode = mode;
    S.cfg.lowPowerMotion = mode === "off";
    dbPut("kv", S.cfg).catch(() => {});
    window.applyTheme();
    haptic("switch");
    openAppearanceModal();
  };

  window.openAppearanceModal = function () {
    const curSurf = normalizeSurfaceId(S.cfg?.surfaceTheme);
    const curAcc = S.cfg?.accentColor || "cobalt";
    const curFs = S.cfg?.fontScale || "md";
    const curAnim = S.cfg?.animMode || "snappy";

    openModal(`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <h3 style="font-size:17px;font-weight:600;margin:0;">Giao diện &amp; Màu nhấn</h3>
        <button type="button" class="mini-act tap" onclick="closeModal()">${ICON_X}</button>
      </div>
      <div style="font-size:12px;color:var(--ink-3);margin-bottom:4px;">12 Màu nhấn (Accent)</div>
      <div class="cx-swatch-grid">
        ${ACCENT_PALETTES.map(a => `<button type="button" class="cx-swatch-btn tap ${curAcc === a.id ? "active" : ""}" data-acc="${a.id}" style="background:${a.hex};" onclick="setAccentColor('${a.id}')" title="${esc(a.name)}">${curAcc === a.id ? `<svg width="14" height="14" fill="none" stroke="${a.id === "mono" ? "#09090b" : "#ffffff"}" stroke-width="2.6" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>` : ""}</button>`).join("")}
      </div>

      <div style="font-size:12px;color:var(--ink-3);margin-bottom:4px;">Chủ đề nền</div>
      <div class="v38-surface-grid">
        ${[["oled","Đen OLED","Tuyền #000","sw-oled"],["graphite","Graphite","Xám trầm","sw-graphite"],["light","Sáng","Tinh gọn","sw-light"]].map(([id, n, sub, cls]) =>
          `<button type="button" class="v38-surface-btn tap-soft ${curSurf === id ? "active" : ""}" data-surf="${id}" onclick="setSurfaceTheme('${id}')">
            <div class="v38-surface-swatch ${cls}"><span class="v38-surface-dot"></span></div>
            <span class="v38-surface-name">${n}</span><span class="v38-surface-sub">${sub}</span>
          </button>`
        ).join("")}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div>
          <label class="f-lbl" style="margin-top:0;">Cỡ chữ</label>
          <div style="display:flex;gap:4px;">
            ${[["sm","Nhỏ"],["md","Vừa"],["lg","Lớn"]].map(([k, l]) =>
              `<button type="button" class="btn-s tap ${curFs === k ? "lg-active" : ""}" style="flex:1;height:34px;padding:0;font-size:12px;" onclick="setFontScale('${k}')">${l}</button>`
            ).join("")}
          </div>
        </div>
        <div>
          <label class="f-lbl" style="margin-top:0;">Hoạt ảnh</label>
          <div style="display:flex;gap:4px;">
            ${[["off","Tắt"],["snappy","Nhanh"],["elegant","Mượt"]].map(([k, l]) =>
              `<button type="button" class="btn-s tap ${curAnim === k ? "lg-active" : ""}" style="flex:1;height:34px;padding:0;font-size:12px;" onclick="setAnimMode('${k}')">${l}</button>`
            ).join("")}
          </div>
        </div>
      </div>

      <div class="s-row" onclick="S.cfg.haptics=!S.cfg.haptics;dbPut('kv',S.cfg);this.querySelector('.sw').classList.toggle('on',S.cfg.haptics);haptic('ok')"><span>Rung phản hồi xúc giác</span><div class="sw ${S.cfg.haptics ? "on" : ""}"></div></div>
      <div style="display:flex;gap:8px;margin-top:10px;">
        <button type="button" class="btn-s tap" style="flex:1;" onclick="document.getElementById('in-wall').click()">Đổi ảnh nền</button>
        <button type="button" class="btn-s tap" style="flex:1;" onclick="S.cfg.wallpaper='';dbPut('kv',S.cfg);applyTheme();showToast('Đã đặt nền mặc định')">Nền mặc định</button>
        <button type="button" class="btn-p tap" onclick="closeModal()">Xong</button>
      </div>`);
  };

  /* =========================================================================
     4. QUOTA RING, GREETING HERO & MODEL PICKER WITH 5-STEP REASONING SLIDER
     ========================================================================= */
  function getRemainingQuotaPct() {
    const u = S.user;
    if (!u) return 100;
    if (u.role === "admin") return 100;
    const lim = Number(u.limits?.daily_tokens || 0);
    if (!lim) return 0;
    const rem = Math.max(0, lim - Number(u.dailyTokens || 0));
    return Math.max(0, Math.min(100, Math.round((rem / lim) * 100)));
  }

  function updateQuotaRingAndGreeting() {
    const pct = getRemainingQuotaPct();
    const pctEl = document.getElementById("quota-ring-pct");
    const arcEl = document.getElementById("quota-ring-arc");
    if (pctEl) pctEl.textContent = S.user?.role === "admin" ? "∞" : `${pct}%`;
    if (arcEl) {
      const circ = 56.5;
      arcEl.setAttribute("stroke-dashoffset", String(circ - (circ * pct) / 100));
      arcEl.setAttribute("stroke", pct <= 15 ? "var(--danger)" : (pct <= 35 ? "var(--warn)" : "var(--accent)"));
    }

    const av = document.getElementById("sb-avatar");
    if (av && S.user) {
      if (S.user.avatarUrl) {
        av.innerHTML = `<img src="${esc(S.user.avatarUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
      } else {
        av.textContent = (S.user.name || S.user.email || "A").charAt(0).toUpperCase();
      }
      const em = document.getElementById("sb-user-email");
      if (em) em.textContent = S.user.name || S.user.email;
    }

    const h = document.getElementById("hero-title");
    if (h && !S.activeTeamId && !S.activeTutorId && S.cfg.workMode !== "task" && S.user) {
      const hr = new Date().getHours();
      const greet = hr < 11 ? "Chào buổi sáng" : (hr < 14 ? "Chào buổi trưa" : (hr < 18 ? "Chào buổi chiều" : "Chào buổi tối"));
      const firstName = (S.user.name || S.user.email.split("@")[0]).trim().split(/\s+/).pop();
      h.textContent = `${greet}, ${firstName}.`;
    }
  }

  window.openQuotaRingPopup = function () {
    haptic("tap");
    const u = S.user || {};
    const pct = getRemainingQuotaPct();
    const remTok = Math.max(0, Number(u.limits?.daily_tokens || 0) - Number(u.dailyTokens || 0));
    const expTxt = u.expiresAt ? `đến ${new Date(u.expiresAt).toLocaleDateString("vi-VN")}` : (u.role === "admin" ? "Toàn quyền" : "Chưa kích hoạt");
    openModal(`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <h3 style="font-size:16.5px;font-weight:600;margin:0;">Số dư gói &amp; Ví</h3>
        <button type="button" class="mini-act tap" onclick="closeModal()">${ICON_X}</button>
      </div>
      <div class="cx-group-card" style="margin-bottom:12px;">
        <div class="cx-wallet-split">
          <div class="cx-wallet-cell" style="cursor:pointer;" onclick="closeModal();openTopupWalletModal()">
            <span class="cx-wallet-lbl">Số dư ví</span>
            <span class="cx-wallet-val">${fmtVnd(u.walletBalanceVnd || 0)}</span>
            <span class="cx-wallet-sub" style="color:var(--accent-ink);">+ Nạp VietQR</span>
          </div>
          <div class="cx-wallet-cell">
            <span class="cx-wallet-lbl">Số dư gói hôm nay</span>
            <span class="cx-wallet-val" style="color:var(--ok-ink);">${u.role === "admin" ? "∞" : pct + "%"}</span>
            <span class="cx-wallet-sub">${esc(u.planLabel || "Trial")} · ${esc(expTxt)}</span>
          </div>
        </div>
        <div style="padding:10px 14px;font-size:12.5px;color:var(--ink-2);" class="num">
          Còn lại hôm nay: <b style="color:var(--ink);">${u.role === "admin" ? "Không giới hạn" : remTok.toLocaleString("vi-VN") + " token"}</b>${u.bonusTokens ? ` · Dự phòng: <b style="color:var(--accent-ink);">+${Number(u.bonusTokens).toLocaleString("vi-VN")}</b>` : ""}
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button type="button" class="btn-p tap" style="flex:1;" onclick="closeModal();switchView('pricing')">Nâng cấp / Nạp VietQR</button>
        <button type="button" class="btn-s tap" onclick="closeModal();switchView('usage')">Thống kê</button>
      </div>`);
  };

  window.setCxModelTab = function (tab, ev) {
    if (ev) ev.stopPropagation();
    V50.modelTab = tab;
    haptic("tap");
    window.renderModelDropdown();
  };

  window.renderModelDropdown = function () {
    const m = S.models.find(x => x.id === S.cfg.selectedModel) || S.models.find(x => x.allowed) || S.models[0];
    const t = THINK_LEVELS.find(x => x.id === S.cfg.thinkingLevel) || THINK_LEVELS[2];
    const topEl = document.getElementById("top-model-text");
    if (topEl) topEl.textContent = `${m?.short || m?.title || "API AI"} · ${t.title}`;

    const fam = mod => {
      const k = `${mod.id || ""} ${mod.mapped || ""} ${mod.title || ""}`.toLowerCase();
      if (mod.id === "auto" || mod.mapped === "auto") return "auto";
      if (k.includes("gpt") || k.includes("o1") || k.includes("o3") || k.includes("codex")) return "gpt";
      if (k.includes("claude") || k.includes("sonnet") || k.includes("opus") || k.includes("fable")) return "claude";
      return "other";
    };

    const filtered = S.models.filter(it => {
      if (V50.modelTab === "all") return true;
      return fam(it) === V50.modelTab || (V50.modelTab === "gpt" && fam(it) === "auto");
    });

    const tabsHtml = `<div class="cx-mod-tabs">
      ${[["all","Tất cả"],["gpt","GPT"],["claude","Claude"],["other","Khác"]].map(([k, l]) =>
        `<button type="button" class="cx-mod-tab ${V50.modelTab === k ? "active" : ""}" onclick="setCxModelTab('${k}',event)">${l}</button>`
      ).join("")}
    </div>`;

    const rowsHtml = filtered.map(it => {
      const locked = !it.allowed, sel = it.id === S.cfg.selectedModel;
      const tierTag = locked
        ? `<span class="tag-st tier-${it.min_tier || "ultra"}">${esc(it.min_tier_label || "Nâng cấp")}</span>`
        : (it.cost_label ? `<span class="tag-quiet num">${esc(it.cost_label)}</span>` : "");
      return `<button type="button" class="drop-opt tap-soft ${sel ? "selected" : ""} ${locked ? "locked" : ""}" onclick="pickModel('${esc(it.id)}',${locked},'${esc(it.min_tier_label || "")}')">
        <span class="opt-check">${sel ? ICON_CHECK : (locked ? ICON_LOCK : "")}</span>
        <div class="opt-main">
          <div class="opt-title">${esc(it.title)} ${tierTag}</div>
          <div class="opt-sub">${esc(it.sub || it.mapped)}</div>
        </div>
      </button>`;
    }).join("") || `<div style="padding:10px;font-size:12px;color:var(--ink-3);text-align:center;">Không có model trong nhóm này</div>`;

    const modOpts = document.getElementById("model-opts");
    if (modOpts) modOpts.innerHTML = tabsHtml + rowsHtml;

    const lvIdx = Math.max(0, THINK_LEVELS.findIndex(x => x.id === (S.cfg.thinkingLevel || "high")));
    const thinkOpts = document.getElementById("thinking-opts");
    if (thinkOpts) {
      thinkOpts.innerHTML = `<div class="cx-reason-box" onclick="event.stopPropagation()">
        <div class="cx-reason-head">
          <span>Mức suy luận</span>
          <strong style="color:var(--accent-ink);">${esc(THINK_LEVELS[lvIdx]?.title || "Cao")}</strong>
        </div>
        <input type="range" class="cx-reason-slider" min="0" max="${THINK_LEVELS.length - 1}" step="1" value="${lvIdx}" oninput="pickThinkBySlider(this.value)" />
        <div class="cx-reason-labels">
          ${THINK_LEVELS.map(lv => `<span>${esc(lv.title.split(" ")[0])}</span>`).join("")}
        </div>
      </div>`;
    }
  };

  window.pickThinkBySlider = function (idx) {
    const lv = THINK_LEVELS[Number(idx)] || THINK_LEVELS[2];
    if (lv) pickThink(lv.id);
  };

  /* =========================================================================
     5. FULL-PAGE CENTRIX SETTINGS & PROFILE (18 INTERESTS + AVATAR)
     ========================================================================= */
  window.openCentrixSettings = function () { switchView("settings"); };

  window.renderCentrixSettingsPage = function () {
    const box = document.getElementById("settings-page-body");
    if (!box) return;
    const u = S.user || {};
    const pct = getRemainingQuotaPct();
    const expStr = u.expiresAt ? `đến ${new Date(u.expiresAt).toLocaleDateString("vi-VN")}` : (u.role === "admin" ? "Toàn quyền" : "Chưa kích hoạt");
    const surfLbl = { oled: "Đen OLED", graphite: "Graphite", light: "Sáng" }[normalizeSurfaceId(S.cfg?.surfaceTheme)] || "Đen OLED";

    box.innerHTML = `
      <div class="cx-page-head">
        <button type="button" class="cx-back-circle tap" onclick="switchView('chat')" aria-label="Đóng">${ICON_X}</button>
        <h2 class="cx-page-title">Cài đặt</h2>
        <span style="width:38px;"></span>
      </div>

      <div class="cx-group-card">
        <button type="button" class="cx-row tap-soft" onclick="switchView('profile')">
          <span class="cx-row-l"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M5 20a7 7 0 0 1 14 0"/></svg><span>Tài khoản</span></span>
          <span class="cx-row-r"><span>${esc(u.email || "-")}</span><span>›</span></span>
        </button>
        <div class="cx-wallet-split">
          <div class="cx-wallet-cell" style="cursor:pointer;" onclick="openTopupWalletModal()">
            <span class="cx-wallet-lbl">Số dư ví</span>
            <span class="cx-wallet-val">${fmtVnd(u.walletBalanceVnd || 0)}</span>
            <span class="cx-wallet-sub" style="color:var(--accent-ink);">+ Nạp tiền VietQR</span>
          </div>
          <div class="cx-wallet-cell" style="cursor:pointer;" onclick="switchView('pricing')">
            <span class="cx-wallet-lbl">Số dư gói</span>
            <span class="cx-wallet-val">${u.role === "admin" ? "100%" : pct + "%"}</span>
            <span class="cx-wallet-sub">${esc(u.planLabel || "Trial")} · ${esc(expStr)}</span>
          </div>
        </div>
        <button type="button" class="cx-row tap-soft" onclick="switchView('pricing')">
          <span class="cx-row-l"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 2 15 9l7 3-7 3-3 7-3-7-7-3 7-3Z"/></svg><span>Nâng cấp gói</span></span>
          <span class="cx-row-r">›</span>
        </button>
        <button type="button" class="cx-row tap-soft" onclick="switchView('usage')">
          <span class="cx-row-l"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="m7 14 3-3 3 3 4-5"/></svg><span>Mức sử dụng và giới hạn</span></span>
          <span class="cx-row-r">›</span>
        </button>
      </div>

      <div class="cx-group-card">
        <button type="button" class="cx-row tap-soft" onclick="openMemoryAndCustomizeModal()">
          <span class="cx-row-l">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>
            <div>
              <div>Tùy chỉnh API AI</div>
              <div style="font-size:12px;color:var(--ink-3);">Cá nhân hóa, bộ nhớ (${(S.memories || []).length} mục), kết nối</div>
            </div>
          </span>
          <span class="cx-row-r">›</span>
        </button>
      </div>

      <div class="cx-group-card">
        <button type="button" class="cx-row tap-soft" onclick="openAppearanceModal()">
          <span class="cx-row-l"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2m10-10h-2M4 12H2"/></svg><span>Giao diện và màu nhấn</span></span>
          <span class="cx-row-r"><span>${esc(surfLbl)}</span><span>›</span></span>
        </button>
        <button type="button" class="cx-row tap-soft" onclick="switchView('connectors')">
          <span class="cx-row-l"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg><span>Trình kết nối &amp; MCP</span></span>
          <span class="cx-row-r">›</span>
        </button>
        <button type="button" class="cx-row tap-soft" onclick="openBackupRestoreModal()">
          <span class="cx-row-l"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg><span>Dung lượng &amp; Sao lưu (.json)</span></span>
          <span class="cx-row-r">›</span>
        </button>
        <button type="button" class="cx-row tap-soft" onclick="checkAppUpdate(false)">
          <span class="cx-row-l"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg><span>Giới thiệu (API AI v5.0)</span></span>
          <span class="cx-row-r"><span>v${esc(META.verName || "5.0")}</span><span>›</span></span>
        </button>
        <button type="button" class="cx-row tap-soft" onclick="openAdvancedSettingsModal()">
          <span class="cx-row-l"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12"/></svg><span>Nâng cao (Key, Voucher${u.role === "admin" ? ", Server" : ""})</span></span>
          <span class="cx-row-r">›</span>
        </button>
      </div>

      <div class="cx-group-card">
        <button type="button" class="cx-row tap-soft" onclick="openSupportContact('telegram')">
          <span class="cx-row-l"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>Báo lỗi ứng dụng</span></span>
          <span class="cx-row-r">›</span>
        </button>
        <button type="button" class="cx-row tap-soft" onclick="openSupportContact('zalo')">
          <span class="cx-row-l"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></svg><span>Trung tâm trợ giúp</span></span>
          <span class="cx-row-r">›</span>
        </button>
        <button type="button" class="cx-row tap-soft" onclick="openPrivacyInfoModal()">
          <span class="cx-row-l"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg><span>Trung tâm quyền riêng tư</span></span>
          <span class="cx-row-r">›</span>
        </button>
      </div>

      <div class="cx-group-card">
        <button type="button" class="cx-row tap-soft" style="color:var(--danger-ink);" onclick="logoutUser()">
          <span class="cx-row-l"><svg fill="none" stroke="currentColor" style="color:var(--danger-ink);" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg><span>Đăng xuất</span></span>
        </button>
      </div>`;
  };

  window.openAdvancedSettingsModal = function () {
    const isAdmin = S.user?.role === "admin";
    openModal(`<h3 style="font-size:17px;font-weight:600;margin-bottom:10px;">Cài đặt Nâng cao</h3>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <button type="button" class="btn-p tap" style="width:100%;" onclick="closeModal();showKeyGate(true)">Nhập hoặc gia hạn Key bản quyền</button>
        <button type="button" class="btn-blue tap" style="width:100%;" onclick="closeModal();openRedeemGiftModal()">Nhập Mã quà tặng (Voucher)</button>
        <button type="button" class="btn-s tap" style="width:100%;" onclick="closeModal();openSelfChangePasswordModal()">Đổi mật khẩu</button>
        ${isAdmin ? `<button type="button" class="btn-s tap" style="width:100%;" onclick="closeModal();openServerUrlModal()">Địa chỉ Server Cloudflare (Admin)</button>` : ""}
        <button type="button" class="btn-s tap" style="width:100%;" onclick="closeModal()">Đóng</button>
      </div>`);
  };

  window.openPrivacyInfoModal = function () {
    openModal(`<h3 style="font-size:17px;font-weight:600;margin-bottom:6px;">Trung tâm quyền riêng tư</h3>
      <p style="font-size:13px;color:var(--ink-2);line-height:1.55;">• Lịch sử chat, tệp ZIP giải nén và hồ sơ của bạn được lưu cục bộ trên máy và đồng bộ bảo mật riêng theo Email trên Cloudflare D1.<br/>• Bạn toàn quyền xuất sao lưu <code>.json</code> hoặc xóa trí nhớ / đoạn chat bất kỳ lúc nào.</p>
      <div style="display:flex;justify-content:flex-end;margin-top:12px;"><button type="button" class="btn-p tap" onclick="closeModal()">Đã hiểu</button></div>`);
  };

  window.openMemoryAndCustomizeModal = function () {
    const agg = S.user?.memoryAggressiveness || S.cfg?.memoryAggressiveness || "medium";
    const aggIdx = agg === "low" ? 0 : (agg === "high" ? 2 : 1);
    openModal(`<h3 style="font-size:17px;font-weight:600;margin-bottom:6px;">Tùy chỉnh &amp; Bộ nhớ AI</h3>
      <div class="s-row" onclick="togglePersonal();this.querySelector('.sw').classList.toggle('on',S.cfg.personalIntel)">
        <span>Bật Trí thông minh cá nhân &amp; Bộ nhớ</span>
        <div class="sw ${S.cfg.personalIntel ? "on" : ""}"></div>
      </div>
      <div class="cx-reason-box" style="margin:8px 0 12px;">
        <div class="cx-reason-head">
          <span>Sự quyết liệt của Bộ nhớ</span>
          <strong id="mem-agg-lbl" style="color:var(--accent-ink);">${agg === "low" ? "Thấp" : (agg === "high" ? "Cao" : "Trung bình")}</strong>
        </div>
        <input type="range" class="cx-reason-slider" min="0" max="2" step="1" value="${aggIdx}" oninput="setMemoryAggressiveness(this.value)" />
        <div class="cx-reason-labels"><span>Thấp</span><span>Trung bình</span><span>Cao</span></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button type="button" class="btn-p tap" style="flex:1;" onclick="closeModal();switchView('import')">Quản lý ${(S.memories || []).length} mục Trí nhớ</button>
        <button type="button" class="btn-s tap" onclick="closeModal();switchView('profile')">Sở thích Hồ sơ</button>
      </div>`);
  };

  window.setMemoryAggressiveness = function (idx) {
    const val = Number(idx) === 0 ? "low" : (Number(idx) === 2 ? "high" : "medium");
    S.cfg.memoryAggressiveness = val;
    if (S.user) S.user.memoryAggressiveness = val;
    dbPut("kv", S.cfg).catch(() => {});
    const lbl = document.getElementById("mem-agg-lbl");
    if (lbl) lbl.textContent = val === "low" ? "Thấp" : (val === "high" ? "Cao" : "Trung bình");
    apiFetch("/profile", { method: "POST", body: { memoryAggressiveness: val } }).catch(() => {});
  };

  const PROFILE_INTERESTS = [
    "Sáng tạo nội dung", "Lập trình & Phát triển", "Thiết kế & Sáng tạo",
    "Học tập & Nghiên cứu", "Kinh doanh & Chiến lược", "Tiếp thị & Quảng bá",
    "Sản phẩm & Quản lý", "Bán hàng & Chăm sóc khách hàng", "Vận hành & Quản trị",
    "Con người & Nhân sự", "Tài chính & Pháp lý", "Nền kinh tế nhà sáng tạo",
    "Đầu tư & Tài chính", "Gia đình & Nuôi dạy con", "Sức khỏe & Thói quen",
    "Sở thích & Văn hóa", "Cuộc sống cá nhân", "Lĩnh vực khác"
  ];

  window.v50SetProfileField = function (key, val) {
    if (V50.profileDraft) V50.profileDraft[key] = val;
  };

  window.renderProfilePage = function () {
    const box = document.getElementById("profile-page-body");
    if (!box) return;
    const u = S.user || {};
    if (!V50.profileDraft || V50.profileDraft.email !== u.email) {
      V50.profileDraft = {
        email: u.email || "",
        name: u.name || "",
        username: u.username || "",
        avatarUrl: u.avatarUrl || "",
        interests: Array.isArray(u.interests) ? [...u.interests] : []
      };
    }
    const pd = V50.profileDraft;

    box.innerHTML = `
      <div class="cx-page-head">
        <button type="button" class="cx-back-circle tap" onclick="switchView('settings')" aria-label="Quay lại"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>
        <h2 class="cx-page-title">Hồ sơ</h2>
        <button type="button" class="btn-p tap" style="height:36px;padding:0 16px;font-size:13px;" onclick="saveProfileChanges()">Lưu</button>
      </div>

      <div style="font-size:14px;font-weight:600;margin-bottom:8px;">Tài khoản</div>
      <div style="font-size:12.5px;color:var(--ink-2);">Ảnh đại diện</div>
      <div class="cx-avatar-row">
        <div class="cx-avatar-big">${pd.avatarUrl ? `<img src="${esc(pd.avatarUrl)}" alt="Avatar"/>` : esc((pd.name || u.email || "A").charAt(0).toUpperCase())}</div>
        <button type="button" class="btn-s tap" onclick="document.getElementById('in-avatar').click()">Cập nhật ảnh đại diện</button>
      </div>

      <label class="f-lbl">Họ và tên</label>
      <input class="field" value="${esc(pd.name)}" oninput="v50SetProfileField('name',this.value)" placeholder="Nhập họ và tên của bạn" />

      <label class="f-lbl">Tên người dùng</label>
      <input class="field" value="${esc(pd.username)}" oninput="v50SetProfileField('username',this.value)" placeholder="Nhập tên người dùng gồm chữ, số hoặc dấu gạch dưới..." />

      <label class="f-lbl" style="margin-top:16px;">Sở thích (${pd.interests.length} đã chọn — cá nhân hóa câu trả lời AI)</label>
      <div class="cx-interest-grid">
        ${PROFILE_INTERESTS.map(tag => {
          const on = pd.interests.includes(tag);
          return `<button type="button" class="cx-int-chip tap-soft ${on ? "active" : ""}" onclick="toggleProfileInterest('${esc(tag)}')">${on ? "✓ " : ""}${esc(tag)}</button>`;
        }).join("")}
      </div>

      <div class="div-line" style="margin:20px 0;"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:16px;">
        <div>
          <strong style="font-size:14.5px;">Mật khẩu</strong>
          <div style="font-size:12.5px;color:var(--ink-3);margin-top:2px;">${u.hasPassword ? "Đổi mật khẩu đăng nhập cho tài khoản này." : "Tài khoản Google — thiết lập thêm mật khẩu dự phòng."}</div>
        </div>
        <button type="button" class="btn-s tap" onclick="openSelfChangePasswordModal()">${u.hasPassword ? "Đổi mật khẩu" : "Thiết lập mật khẩu"}</button>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:16px;">
        <div>
          <strong style="font-size:14.5px;">Địa chỉ email</strong>
          <div style="font-size:13px;color:var(--ink-2);margin-top:2px;">${esc(u.email || "-")}</div>
        </div>
        <span class="tag-st st-active">Đã xác minh</span>
      </div>

      <div>
        <strong style="font-size:14.5px;">Tài khoản đã kết nối</strong>
        <div class="cx-group-card" style="margin-top:8px;">
          <div class="cx-row">
            <span class="cx-row-l"><span>Google OAuth</span></span>
            <span class="tag-st ${u.googleConnected ? "st-active" : "st-unused"}">${u.googleConnected ? "Đã kết nối" : "Chưa liên kết"}</span>
          </div>
        </div>
      </div>`;
  };

  window.toggleProfileInterest = function (tag) {
    if (!V50.profileDraft) return;
    haptic("tap");
    const i = V50.profileDraft.interests.indexOf(tag);
    if (i >= 0) V50.profileDraft.interests.splice(i, 1);
    else V50.profileDraft.interests.push(tag);
    renderProfilePage();
  };

  window.handleAvatarPick = async function (files) {
    const f = files?.[0]; if (!f) return;
    try {
      const p = await processImageFile(f);
      const img = new Image();
      img.src = p.dataUrl;
      await new Promise(res => { img.onload = res; img.onerror = res; });
      const cv = document.createElement("canvas");
      cv.width = 160; cv.height = 160;
      const ctx = cv.getContext("2d");
      const sz = Math.min(img.width || 160, img.height || 160);
      ctx.drawImage(img, ((img.width || sz) - sz) / 2, ((img.height || sz) - sz) / 2, sz, sz, 0, 0, 160, 160);
      if (V50.profileDraft) V50.profileDraft.avatarUrl = cv.toDataURL("image/jpeg", 0.82);
      renderProfilePage();
      haptic("ok");
      showToast("Đã chọn ảnh đại diện · Bấm Lưu để đồng bộ");
    } catch (e) { showToast("Không đọc được ảnh: " + e.message, "err"); }
    const el = document.getElementById("in-avatar"); if (el) el.value = "";
  };

  window.saveProfileChanges = async function () {
    if (!V50.profileDraft) return;
    try {
      const r = await apiFetch("/profile", { method: "POST", body: V50.profileDraft });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Lưu hồ sơ thất bại");
      if (d.user) S.user = { ...S.user, ...d.user };
      syncAccountUI();
      updateQuotaRingAndGreeting();
      haptic("ok");
      showToast("Đã lưu hồ sơ cá nhân!", "ok");
    } catch (e) { haptic("err"); showToast(e.message, "err"); }
  };

  /* =========================================================================
     6. PRICING, WALLET TOP-UP & AUTOMATIC VIETQR NAPAS 247 POLLING
     ========================================================================= */
  window.v50SetPricingTier = function (t) { V50.pricingTier = t; haptic("tap"); window.paintPricingPage(); };
  window.v50SetPricingMonths = function (m) { V50.pricingMonths = Number(m) || 1; haptic("tap"); window.paintPricingPage(); };

  window.paintPricingPage = function () {
    const box = document.getElementById("pricing-page-body");
    if (!box) return;
    const plans = V50.billingData?.plans || [
      { id: "classic", label: "Classic", price1m: 19000, price3m: 48000, price12m: 160000, dailyMsgs: 25, dailyTokens: 35000, maxDevices: 1, models: ["GPT 6 Luna"] },
      { id: "pro", label: "Pro", price1m: 49000, price3m: 125000, price12m: 412000, dailyMsgs: 180, dailyTokens: 350000, maxDevices: 2, models: ["GPT 6 Luna", "GPT 6.2 Sol", "GPT 6.2 Astra"] },
      { id: "pro_max", label: "Pro Max", price1m: 99000, price3m: 252000, price12m: 832000, dailyMsgs: 500, dailyTokens: 1200000, maxDevices: 3, allowTeams: true, allowGithub: true, models: ["Full GPT", "Sonnet 5", "Opus 5.5"] },
      { id: "ultra", label: "Ultra", price1m: 169000, price3m: 431000, price12m: 1420000, dailyMsgs: -1, dailyTokens: 5000000, maxDevices: 5, allowTeams: true, allowGithub: true, models: ["Tất cả Model + Fable 5.1"] }
    ];
    const p = plans.find(x => x.id === V50.pricingTier) || plans[1];
    const price = V50.pricingMonths === 12 ? p.price12m : (V50.pricingMonths === 3 ? p.price3m : p.price1m);
    const powerLvl = { classic: 1, pro: 2, pro_max: 3, ultra: 4 }[p.id] || 2;
    const disc = V50.billingData?.discounts || { m3: 15, m12: 30 };
    const u = S.user || {};
    const walletVnd = V50.billingData?.walletBalanceVnd ?? u.walletBalanceVnd ?? 0;

    box.innerHTML = `
      <div class="cx-page-head">
        <button type="button" class="cx-back-circle tap" onclick="switchView('settings')" aria-label="Quay lại"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>
        <h2 class="cx-page-title">Gói dịch vụ</h2>
        <button type="button" class="ws-chip-btn ok tap" onclick="openTopupWalletModal()">+ Nạp ví</button>
      </div>

      <div class="cx-mod-tabs" style="margin-bottom:10px;">
        ${plans.map(pl => `<button type="button" class="cx-mod-tab ${V50.pricingTier === pl.id ? "active" : ""}" onclick="v50SetPricingTier('${pl.id}')">${esc(pl.label)}</button>`).join("")}
      </div>

      <div style="display:flex;gap:6px;margin-bottom:12px;">
        ${[[1,"1 tháng",""],[3,"3 tháng",`-${disc.m3}%`],[12,"1 năm",`-${disc.m12}%`]].map(([m, lbl, badge]) =>
          `<button type="button" class="btn-s tap ${V50.pricingMonths === m ? "lg-active" : ""}" style="flex:1;height:36px;font-size:12px;" onclick="v50SetPricingMonths(${m})">${lbl} ${badge ? `<b>${badge}</b>` : ""}</button>`
        ).join("")}
      </div>

      <div class="cx-tier-hero t-${esc(p.id)}">
        <div style="font-size:26px;font-weight:700;letter-spacing:-0.02em;">${esc(p.label)}</div>
        <div style="font-size:13px;opacity:0.9;margin-top:2px;">${p.allowTeams ? "Mở khóa Đội Tác nhân Graph, Gia sư AI &amp; GitHub Repo" : "Trò chuyện đa model, đọc ZIP/PDF &amp; Office Studio"}</div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:22px;">
          <div>
            <div style="font-size:11.5px;opacity:0.85;">Sức dùng</div>
            <div class="cx-power-bars">${[1,2,3,4].map(i => `<span class="cx-power-bar ${i <= powerLvl ? "on" : ""}"></span>`).join("")}</div>
          </div>
          <div style="text-align:right;">
            <div class="num" style="font-size:24px;font-weight:700;">${fmtVnd(price)}</div>
            <div style="font-size:12px;opacity:0.88;">${V50.pricingMonths === 12 ? "1 năm (365 ngày)" : `${V50.pricingMonths} tháng`}</div>
          </div>
        </div>
      </div>

      <div class="cx-group-card">
        <div class="cx-row"><div class="cx-row-l"><div><strong class="num">${Number(p.dailyTokens || 0).toLocaleString("vi-VN")} token / ngày</strong><div style="font-size:12px;color:var(--ink-3);">Làm mới 00:00 mỗi ngày · ${p.dailyMsgs < 0 ? "Tin nhắn không giới hạn" : p.dailyMsgs + " tin/ngày"}</div></div></div></div>
        <div class="cx-row"><div class="cx-row-l"><div><strong>Models mở khóa</strong><div style="font-size:12px;color:var(--ink-3);">${esc((p.models || []).join(" · "))}</div></div></div></div>
        <div class="cx-row"><div class="cx-row-l"><div><strong>Số dư ví: <span class="num" style="color:var(--ok-ink);">${fmtVnd(walletVnd)}</span></strong><div style="font-size:12px;color:var(--ink-3);">Tối đa ${p.maxDevices} thiết bị · Quét VietQR kích hoạt tự động</div></div></div></div>
      </div>

      <button type="button" class="btn-p tap" style="width:100%;height:48px;font-size:15px;margin-bottom:8px;" onclick="createVietQrOrder('plan','${p.id}',${V50.pricingMonths})">Nâng cấp lên ${esc(p.label)} qua VietQR</button>
      <div style="display:flex;gap:8px;margin-bottom:14px;">
        <button type="button" class="btn-s tap" style="flex:1;" onclick="payPlanWithWallet('${p.id}',${V50.pricingMonths})">Trả bằng Ví (${fmtVnd(walletVnd)})</button>
        <button type="button" class="btn-s tap" onclick="showKeyGate(true)">Nhập mã Key</button>
      </div>

      <div style="text-align:center;margin-bottom:16px;">
        <button type="button" style="color:var(--accent-ink);font-size:13px;font-weight:500;" onclick="openPaymentHistoryModal()">Xem lịch sử thanh toán (${(V50.billingData?.orders || []).length})</button>
      </div>

      <div class="cx-group-card" style="padding:14px;">
        <strong style="font-size:14px;display:block;margin-bottom:4px;">Gói đang sử dụng</strong>
        <div style="font-size:13px;color:var(--ink-2);">${esc(u.planLabel || "Chưa kích hoạt")}${u.expiresAt ? ` · Hiệu lực đến ${new Date(u.expiresAt).toLocaleDateString("vi-VN")}` : ""}</div>
      </div>`;
  };

  window.renderPricingPage = async function () {
    window.paintPricingPage();
    try {
      const r = await apiFetch("/billing/plans");
      if (r.ok) { V50.billingData = await r.json(); window.paintPricingPage(); }
    } catch {}
  };

  window.openTopupWalletModal = function () {
    openModal(`<h3 style="font-size:17px;font-weight:600;margin-bottom:4px;">Nạp tiền vào Ví qua VietQR</h3>
      <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:10px;">Tiền nạp vào Ví dùng để mua hoặc gia hạn gói tức thì 1 chạm.</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
        ${[50000, 100000, 200000, 500000].map(v => `<button type="button" class="btn-s tap" style="height:34px;font-size:12.5px;" onclick="document.getElementById('topup-amt').value='${v}'">${fmtVnd(v)}</button>`).join("")}
      </div>
      <label class="f-lbl">Số tiền muốn nạp (VNĐ, tối thiểu 10.000đ)</label>
      <input id="topup-amt" type="number" class="field num" value="100000" min="10000" step="10000" />
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
        <button type="button" class="btn-s tap" onclick="closeModal()">Hủy</button>
        <button type="button" class="btn-p tap" onclick="commitTopupOrder()">Tạo mã VietQR</button>
      </div>`);
  };

  window.commitTopupOrder = function () {
    const v = Number(document.getElementById("topup-amt")?.value || 0);
    closeModal();
    window.createVietQrOrder("topup", "pro", 1, v);
  };

  window.createVietQrOrder = async function (orderType, tier, months, amountVnd = 0) {
    showToast("Đang tạo mã chuyển khoản VietQR...");
    try {
      const r = await apiFetch("/billing/order/create", { method: "POST", body: { orderType, tier, months, amountVnd } });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Không tạo được đơn VietQR");
      openVietQrPaymentModal(d.order, d.qrUrl, d.bank, d.autoWebhookReady);
    } catch (e) { haptic("err"); showToast(e.message, "err"); }
  };

  function stopQrPolling() { if (qrPollTimer) { clearInterval(qrPollTimer); qrPollTimer = null; } }

  window.openVietQrPaymentModal = function (order, qrUrl, bank, autoReady) {
    stopQrPolling();
    const startTs = Date.now();
    openModal(`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <h3 style="font-size:16.5px;font-weight:600;margin:0;">Chuyển khoản ngân hàng</h3>
        <button type="button" class="mini-act tap" onclick="closeVietQrModal()">${ICON_X}</button>
      </div>
      <div id="v50-qr-status-bar" class="mem-chip-row" style="border:1px solid var(--accent-rim);background:var(--accent-soft);margin-bottom:10px;align-items:flex-start;">
        <div style="font-size:12px;color:var(--info-ink);line-height:1.45;">
          <b>Đang chờ thanh toán</b><br/>
          ${autoReady ? "Tự kiểm tra đơn này tối đa 10 phút. Chuyển đúng nội dung là hệ thống tự kích hoạt ngay!" : "Quét mã chuyển đúng nội dung rồi bấm Kiểm tra thanh toán (hoặc chờ Admin duyệt)."}
        </div>
      </div>
      ${qrUrl ? `<div class="cx-qr-frame"><img src="${esc(qrUrl)}" alt="VietQR Napas 247" /></div>` : ""}
      <div class="num" style="text-align:center;font-size:24px;font-weight:700;margin:8px 0 12px;">${fmtVnd(order.amount_vnd)}</div>
      <div class="cx-group-card" style="padding:4px 14px;margin-bottom:12px;">
        <div class="cx-bank-row"><span style="color:var(--ink-3);">Ngân hàng</span><b>${esc(bank.bankName || bank.bankId)}</b></div>
        <div class="cx-bank-row"><span style="color:var(--ink-3);">Chủ tài khoản</span><b>${esc(bank.accountName)}</b></div>
        <div class="cx-bank-row"><span style="color:var(--ink-3);">Số tài khoản</span><span style="display:inline-flex;align-items:center;gap:6px;"><b class="num">${esc(bank.accountNo)}</b><button type="button" class="ws-chip-btn tap" onclick="copyText('${esc(bank.accountNo)}','Đã copy STK')">Copy</button></span></div>
        <div class="cx-bank-row"><span style="color:var(--ink-3);">Nội dung CK</span><span style="display:inline-flex;align-items:center;gap:6px;"><b class="num" style="color:var(--accent-ink);">${esc(order.order_code)}</b><button type="button" class="ws-chip-btn accent tap" onclick="copyText('${esc(order.order_code)}','Đã copy nội dung CK')">Copy</button></span></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button type="button" class="btn-s tap" onclick="closeVietQrModal();openPaymentHistoryModal()">Lịch sử</button>
        <button type="button" class="btn-p tap" style="flex:1;" onclick="checkVietQrOrderNow('${esc(order.order_code)}',false)">Kiểm tra thanh toán</button>
        <button type="button" class="btn-s tap" onclick="closeVietQrModal()">Đóng</button>
      </div>`);

    qrPollTimer = setInterval(() => {
      if (Date.now() - startTs > 10 * 60 * 1000 || !document.getElementById("v50-qr-status-bar")) {
        stopQrPolling();
        return;
      }
      window.checkVietQrOrderNow(order.order_code, true);
    }, 5000);
  };

  window.closeVietQrModal = function () { stopQrPolling(); closeModal(); };

  window.checkVietQrOrderNow = async function (code, silent = false) {
    try {
      const r = await apiFetch(`/billing/order/status?code=${encodeURIComponent(code)}`);
      const d = await r.json();
      if (!r.ok) { if (!silent) showToast(d.error || "Không kiểm tra được", "err"); return; }
      if (d.order?.status === "paid") {
        stopQrPolling();
        if (d.user) S.user = d.user;
        if (Array.isArray(d.models)) S.models = d.models;
        syncAccountUI(); renderModelDropdown(); updateQuotaRingAndGreeting();
        closeModal(); haptic("ok");
        showToast("Thanh toán thành công! Đã kích hoạt gói & cập nhật số dư.", "ok");
        renderPricingPage();
        return;
      }
      if (!silent) showToast("Đang chờ tiền về ngân hàng (tự kiểm tra mỗi 5 giây)...", "warn");
    } catch (e) { if (!silent) showToast(e.message, "err"); }
  };

  window.payPlanWithWallet = async function (tier, months) {
    try {
      const r = await apiFetch("/billing/pay-with-wallet", { method: "POST", body: { tier, months } });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Thanh toán bằng ví thất bại");
      if (d.user) S.user = d.user;
      if (Array.isArray(d.models)) S.models = d.models;
      syncAccountUI(); renderModelDropdown(); updateQuotaRingAndGreeting();
      haptic("ok"); showToast("Đã nâng cấp gói thành công bằng Số dư ví!", "ok");
      renderPricingPage();
    } catch (e) { haptic("err"); showToast(e.message, "err"); }
  };

  window.openPaymentHistoryModal = function () {
    const orders = V50.billingData?.orders || [];
    const wtx = V50.billingData?.walletTxs || [];
    openModal(`<h3 style="font-size:16.5px;font-weight:600;margin-bottom:8px;">Lịch sử thanh toán &amp; Ví</h3>
      <div style="max-height:55dvh;overflow-y:auto;display:flex;flex-direction:column;gap:6px;">
        ${orders.map(o => `<div class="mem-chip-row">
          <div style="flex:1;min-width:0;">
            <strong class="num" style="font-size:12.5px;">${esc(o.order_code)} · ${fmtVnd(o.amount_vnd)}</strong>
            <div style="font-size:11.5px;color:var(--ink-3);">${o.order_type === "topup" ? "Nạp ví" : `Gói ${TIER_LABELS[o.tier] || o.tier} (${o.months}T)`} · ${new Date(o.created_at).toLocaleString("vi-VN")}</div>
          </div>
          <span class="tag-st ${o.status === "paid" ? "st-active" : (o.status === "pending" ? "st-pending" : "st-revoked")}">${o.status === "paid" ? "Đã thanh toán" : (o.status === "pending" ? "Đang chờ" : "Đã hủy")}</span>
        </div>`).join("") || `<div style="font-size:12.5px;color:var(--ink-3);">Chưa có đơn hàng nào.</div>`}
        ${wtx.length ? `<div style="font-size:12px;color:var(--ink-2);margin-top:8px;font-weight:500;">Biến động Ví</div>` + wtx.map(t => `<div class="mem-chip-row">
          <span style="font-size:12px;flex:1;">${esc(t.note)}</span>
          <b class="num" style="color:${t.amount_vnd >= 0 ? "var(--ok-ink)" : "var(--danger-ink)"};">${t.amount_vnd >= 0 ? "+" : ""}${fmtVnd(t.amount_vnd)}</b>
        </div>`).join("") : ""}
      </div>
      <div style="display:flex;justify-content:flex-end;margin-top:10px;"><button type="button" class="btn-p tap" onclick="closeModal()">Đóng</button></div>`);
  };

  /* =========================================================================
     7. USAGE ANALYTICS PAGE
     ========================================================================= */
  window.v50SetUsageDays = function (d) { V50.usageDays = Number(d) || 30; window.renderUsagePage(); };
  window.v50SetUsageModel = function (m) { V50.usageModel = m || "all"; window.renderUsagePage(); };

  window.renderUsagePage = async function () {
    const box = document.getElementById("usage-page-body");
    if (!box) return;
    box.innerHTML = `<div class="cx-page-head"><button type="button" class="cx-back-circle tap" onclick="switchView('settings')">‹</button><h2 class="cx-page-title">Mức sử dụng &amp; giới hạn</h2><span style="width:38px;"></span></div><div class="card-item"><div class="skel-line" style="width:65%;margin-bottom:8px;"></div><div class="skel-line" style="width:100%;height:96px;"></div></div>`;
    let stats = { totalTokens: 0, totalReqs: 0, byModel: [], byDay: [] };
    try {
      const r = await apiFetch(`/usage/stats?days=${V50.usageDays}&model=${encodeURIComponent(V50.usageModel)}`);
      if (r.ok) stats = await r.json();
    } catch {}

    const maxDayTok = Math.max(1, ...(stats.byDay || []).map(d => d.tokens));
    const u = S.user || {};
    const pct = getRemainingQuotaPct();

    box.innerHTML = `
      <div class="cx-page-head">
        <button type="button" class="cx-back-circle tap" onclick="switchView('settings')" aria-label="Quay lại"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>
        <h2 class="cx-page-title">Mức sử dụng &amp; giới hạn</h2>
        <span style="width:38px;"></span>
      </div>

      <div class="v38-stat-grid">
        <div class="v38-stat-box"><span class="v38-stat-val num" style="color:var(--ok-ink);">${u.role === "admin" ? "∞" : pct + "%"}</span><span class="v38-stat-lbl">Còn lại hôm nay</span></div>
        <div class="v38-stat-box"><span class="v38-stat-val num">${Number(stats.totalReqs || 0)}</span><span class="v38-stat-lbl">Lượt (${V50.usageDays}d)</span></div>
        <div class="v38-stat-box"><span class="v38-stat-val num" style="color:var(--accent-ink);">${Math.round((stats.totalTokens || 0) / 1000)}K</span><span class="v38-stat-lbl">Token (${V50.usageDays}d)</span></div>
      </div>

      <div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;">
        ${[7, 30, 90].map(d => `<button type="button" class="btn-s tap ${V50.usageDays === d ? "lg-active" : ""}" style="height:34px;padding:0 12px;font-size:12px;" onclick="v50SetUsageDays(${d})">${d} ngày</button>`).join("")}
        <select class="field" style="flex:1;min-height:34px;height:34px;padding:0 12px;font-size:12.5px;" onchange="v50SetUsageModel(this.value)">
          <option value="all" ${V50.usageModel === "all" ? "selected" : ""}>Tất cả Model</option>
          ${(S.models || []).filter(m => m.id !== "auto").map(m => `<option value="${esc(m.id)}" ${V50.usageModel === m.id ? "selected" : ""}>${esc(m.short || m.title)}</option>`).join("")}
        </select>
      </div>

      <div class="card-item">
        <strong style="font-size:13.5px;display:block;margin-bottom:8px;">Biểu đồ tiêu thụ theo ngày</strong>
        ${(stats.byDay || []).length ? `<div class="cx-usage-bars">${stats.byDay.slice(-14).map(d => {
          const h = Math.max(8, Math.round((d.tokens / maxDayTok) * 84));
          return `<div class="cx-usage-col" title="${d.date}: ${d.tokens.toLocaleString()} tok"><div class="cx-usage-bar" style="height:${h}px;"></div><span class="cx-usage-lbl">${d.date.slice(8)}</span></div>`;
        }).join("")}</div>` : `<div style="font-size:12.5px;color:var(--ink-3);">Chưa có dữ liệu sử dụng trong khoảng này.</div>`}
      </div>

      <div class="card-item">
        <strong style="font-size:13.5px;display:block;margin-bottom:8px;">Chi tiết theo Model</strong>
        ${(stats.byModel || []).map(m => `<div class="mem-chip-row" style="margin-bottom:5px;">
          <span style="font-family:var(--font-mono);font-size:12.5px;">${esc(m.model_id)}</span>
          <span class="num" style="color:var(--accent-ink);">${m.reqs} lượt · ${Math.round(m.tokens / 1000).toLocaleString("vi-VN")}K tok</span>
        </div>`).join("") || `<div style="font-size:12.5px;color:var(--ink-3);">Chưa có lượt gọi model nào.</div>`}
      </div>`;
  };

  /* =========================================================================
     8. CENTRIX 5 HUBS: TASKS · RESOURCES · AGENTS (+TUTORS) · STUDIO · CONNECTORS (+SKILLS)
     ========================================================================= */
  S.tasks = S.tasks || [];
  S.resources = S.resources || [];
  S.connectors = S.connectors || [];

  const TASK_TEMPLATES = [
    { title: "Ôn 5 câu Toán 12 & mẹo Casio mỗi tối", priority: "high", schedule: "daily", assigneeType: "tutor", prompt: "Giao 5 câu Toán 12 trọng tâm ôn thi THPT Quốc gia, có 2 câu bẫy hay sai và hướng dẫn bấm Casio nhanh." },
    { title: "Tổng hợp kèo Trading phiên Âu / Mỹ", priority: "high", schedule: "daily", assigneeType: "team", prompt: "Tổng hợp cấu trúc thị trường, vùng thanh khoản chính và kế hoạch giao dịch kỷ luật cho phiên hôm nay." },
    { title: "Viết báo cáo tiến độ tuần gọn sắc", priority: "med", schedule: "weekly", assigneeType: "model", prompt: "Lập báo cáo tổng kết tuần gồm: 3 việc đã hoàn thành, 2 vướng mắc chính và kế hoạch ưu tiên tuần tới." }
  ];

  // HUB 1: TASKS
  window.renderTasksPage = async function () {
    const box = document.getElementById("tasks-body");
    if (!box) return;
    S.tasks = await dbAll("tasks").catch(() => S.tasks || []);
    const pendingCnt = S.tasks.filter(t => t.status !== "done").length;
    const sbCnt = document.getElementById("sb-tasks-cnt");
    if (sbCnt) { sbCnt.style.display = pendingCnt ? "inline-block" : "none"; sbCnt.textContent = String(pendingCnt); }

    box.innerHTML = `
      <div class="cx-page-head">
        <div class="cx-head-left">
          <button type="button" class="cx-back-circle tap" onclick="switchView('chat')" aria-label="Quay lại"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>
          <div><h2 class="cx-page-title" style="margin:0;">Nhiệm vụ</h2><div style="font-size:12px;color:var(--ink-3);">Giao việc cho Tác nhân / Gia sư / Model</div></div>
        </div>
        <button type="button" class="btn-p tap" style="height:36px;padding:0 14px;font-size:12.5px;" onclick="openTaskEditorModal(null)">+ Tạo mới</button>
      </div>

      <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:10px;scrollbar-width:none;">
        ${TASK_TEMPLATES.map((tpl, i) => `<button type="button" class="ws-chip-btn tap" onclick="createTaskFromTemplate(${i})">+ Mẫu: ${esc(tpl.title.slice(0, 26))}</button>`).join("")}
      </div>

      ${S.tasks.length ? S.tasks.map(tk => {
        const prioCls = tk.priority === "high" ? "cx-prio-high" : (tk.priority === "low" ? "cx-prio-low" : "cx-prio-med");
        const prioLbl = tk.priority === "high" ? "Cao" : (tk.priority === "low" ? "Thấp" : "Trung bình");
        const schedLbl = tk.schedule === "daily" ? "Hàng ngày" : (tk.schedule === "weekly" ? "Hàng tuần" : "Một lần");
        return `<div class="cx-task-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
            <label style="display:flex;align-items:flex-start;gap:8px;flex:1;min-width:0;cursor:pointer;">
              <input type="checkbox" ${tk.status === "done" ? "checked" : ""} onchange="toggleTaskDone('${tk.id}',this.checked)" style="width:17px;height:17px;margin-top:2px;accent-color:var(--accent);" />
              <div style="min-width:0;">
                <strong style="font-size:14.5px;${tk.status === "done" ? "text-decoration:line-through;opacity:0.6;" : ""}">${esc(tk.title)}</strong>
                <div style="font-size:12px;color:var(--ink-3);margin-top:2px;">${esc(tk.assigneeLabel || "Model mặc định")} · ${schedLbl}${tk.dueTime ? ` · ${esc(tk.dueTime)}` : ""}</div>
              </div>
            </label>
            <span class="tag-st ${prioCls}">${prioLbl}</span>
          </div>
          ${tk.prompt ? `<div style="font-size:12.5px;color:var(--ink-2);line-height:1.45;">${esc(tk.prompt.slice(0, 150))}${tk.prompt.length > 150 ? "..." : ""}</div>` : ""}
          ${(tk.checklist || []).length ? `<div style="font-size:11.5px;color:var(--ink-3);">Checklist: ${tk.checklist.filter(c => c.done).length}/${tk.checklist.length} mục</div>` : ""}
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button type="button" class="btn-blue tap" style="height:34px;font-size:12px;" onclick="runTaskNow('${tk.id}')">Chạy ngay</button>
            <button type="button" class="btn-s tap" style="height:34px;font-size:12px;" onclick="openTaskEditorModal('${tk.id}')">Sửa</button>
            <button type="button" class="btn-danger tap" style="height:34px;font-size:12px;" onclick="deleteTaskItem('${tk.id}')">Xóa</button>
          </div>
        </div>`;
      }).join("") : `<div class="card-item" style="text-align:center;color:var(--ink-2);padding:28px 16px;">Chưa có nhiệm vụ nào. Bấm <b>+ Tạo mới</b> hoặc chọn 1 mẫu phía trên để giao việc cho Tác nhân / Gia sư.</div>`}`;
  };

  window.openTaskEditorModal = function (id) {
    const tk = id ? S.tasks.find(x => x.id === id) : null;
    const teamsOpts = (S.teams || []).map(t => `<option value="team:${esc(t.id)}" ${tk?.assigneeRef === "team:" + t.id ? "selected" : ""}>Đội ngũ: ${esc(t.name)}</option>`).join("");
    const tutorOpts = (S.tutors || []).map(t => `<option value="tutor:${esc(t.id)}" ${tk?.assigneeRef === "tutor:" + t.id ? "selected" : ""}>Gia sư: ${esc(t.name)} (${esc(t.subject)})</option>`).join("");
    openModal(`<h3 style="font-size:16.5px;font-weight:600;margin-bottom:6px;">${tk ? "Sửa nhiệm vụ" : "Tạo nhiệm vụ mới"}</h3>
      <label class="f-lbl">Tiêu đề nhiệm vụ</label>
      <input id="tk-title" class="field" value="${esc(tk?.title || "")}" placeholder="VD: Ôn 5 câu Toán 12 & soi bẫy mỗi tối" />
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div><label class="f-lbl">Độ ưu tiên</label><select id="tk-prio" class="field"><option value="high" ${tk?.priority==="high"?"selected":""}>Cao</option><option value="med" ${!tk||tk.priority==="med"?"selected":""}>Trung bình</option><option value="low" ${tk?.priority==="low"?"selected":""}>Thấp</option></select></div>
        <div><label class="f-lbl">Lịch chạy lặp</label><select id="tk-sched" class="field"><option value="once" ${!tk||tk.schedule==="once"?"selected":""}>Một lần</option><option value="daily" ${tk?.schedule==="daily"?"selected":""}>Hàng ngày</option><option value="weekly" ${tk?.schedule==="weekly"?"selected":""}>Hàng tuần</option></select></div>
      </div>
      <div style="display:grid;grid-template-columns:1.3fr 0.7fr;gap:8px;">
        <div><label class="f-lbl">Giao cho</label><select id="tk-ass" class="field"><option value="model:auto">Model Chat hiện tại</option>${teamsOpts}${tutorOpts}</select></div>
        <div><label class="f-lbl">Giờ nhắc</label><input id="tk-time" type="time" class="field num" value="${esc(tk?.dueTime || "20:00")}" /></div>
      </div>
      <label class="f-lbl">Hướng dẫn thực hiện cho AI</label>
      <textarea id="tk-prompt" class="field" rows="3" placeholder="Mô tả chi tiết đầu ra bạn muốn AI tạo khi chạy tác vụ...">${esc(tk?.prompt || "")}</textarea>
      <label class="f-lbl">Checklist đầu ra (mỗi dòng 1 mục)</label>
      <textarea id="tk-chk" class="field" rows="2" placeholder="Đúng trọng tâm&#10;Có ví dụ cụ thể">${esc((tk?.checklist || []).map(c => c.text).join("\n"))}</textarea>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
        <button type="button" class="btn-s tap" onclick="closeModal()">Hủy</button>
        <button type="button" class="btn-p tap" onclick="saveTaskItem('${tk?.id || ""}')">Lưu nhiệm vụ</button>
      </div>`);
  };

  window.saveTaskItem = async function (id) {
    const title = document.getElementById("tk-title")?.value.trim();
    if (!title) return showToast("Nhập tiêu đề nhiệm vụ", "warn");
    const sel = document.getElementById("tk-ass");
    const assigneeRef = sel?.value || "model:auto";
    const assigneeLabel = sel?.options?.[sel.selectedIndex]?.text || "Model hiện tại";
    const chkLines = (document.getElementById("tk-chk")?.value || "").split("\n").map(s => s.trim()).filter(Boolean);
    const obj = {
      id: id || ("task-" + Date.now()),
      title,
      priority: document.getElementById("tk-prio")?.value || "med",
      schedule: document.getElementById("tk-sched")?.value || "once",
      dueTime: document.getElementById("tk-time")?.value || "",
      assigneeRef, assigneeLabel,
      prompt: document.getElementById("tk-prompt")?.value.trim() || title,
      checklist: chkLines.map(text => ({ text, done: false })),
      status: "todo",
      updatedAt: Date.now()
    };
    await dbPut("tasks", obj).catch(() => {});
    apiFetch("/sync/tasks", { method: "POST", body: obj }).catch(() => {});
    S.tasks = await dbAll("tasks").catch(() => [obj]);
    closeModal(); renderTasksPage(); haptic("ok");
    showToast(`Đã lưu nhiệm vụ "${title}"`, "ok");
  };

  window.createTaskFromTemplate = async function (idx) {
    const tpl = TASK_TEMPLATES[idx]; if (!tpl) return;
    let ref = "model:auto", lbl = "Model hiện tại";
    if (tpl.assigneeType === "team" && S.teams?.[0]) { ref = "team:" + S.teams[0].id; lbl = "Đội ngũ: " + S.teams[0].name; }
    if (tpl.assigneeType === "tutor" && S.tutors?.[0]) { ref = "tutor:" + S.tutors[0].id; lbl = "Gia sư: " + S.tutors[0].name; }
    const obj = { id: "task-" + Date.now(), title: tpl.title, priority: tpl.priority, schedule: tpl.schedule, dueTime: "20:00", assigneeRef: ref, assigneeLabel: lbl, prompt: tpl.prompt, checklist: [], status: "todo", updatedAt: Date.now() };
    await dbPut("tasks", obj).catch(() => {});
    apiFetch("/sync/tasks", { method: "POST", body: obj }).catch(() => {});
    S.tasks = await dbAll("tasks").catch(() => [obj]);
    renderTasksPage(); haptic("ok"); showToast("Đã thêm mẫu nhiệm vụ!", "ok");
  };

  window.toggleTaskDone = async function (id, done) {
    const tk = S.tasks.find(x => x.id === id); if (!tk) return;
    tk.status = done ? "done" : "todo";
    await dbPut("tasks", tk).catch(() => {});
    apiFetch("/sync/tasks", { method: "POST", body: tk }).catch(() => {});
    renderTasksPage();
  };

  window.deleteTaskItem = async function (id) {
    await dbDel("tasks", id).catch(() => {});
    apiFetch("/sync/tasks/" + encodeURIComponent(id), { method: "DELETE" }).catch(() => {});
    S.tasks = S.tasks.filter(x => x.id !== id);
    renderTasksPage();
  };

  window.runTaskNow = function (id) {
    const tk = S.tasks.find(x => x.id === id); if (!tk) return;
    const ref = tk.assigneeRef || "model:auto";
    if (ref.startsWith("team:")) openTeamWorkspace(ref.slice(5));
    else if (ref.startsWith("tutor:")) openTutorWorkspace(ref.slice(6));
    else { S.activeTeamId = null; S.activeTutorId = null; switchView("chat"); }
    const chkTxt = (tk.checklist || []).length ? `\n\nCHECKLIST BẮT BUỘC:\n${tk.checklist.map(c => "- " + c.text).join("\n")}` : "";
    sendPrompt(`[NHIỆM VỤ: ${tk.title}]\n${tk.prompt}${chkTxt}`);
  };

  // HUB 2: RESOURCES
  window.renderResourcesPage = function (tab = V50.resTab) {
    V50.resTab = tab || "pages";
    const box = document.getElementById("resources-body");
    if (!box) return;
    const header = `<div class="cx-page-head">
        <div class="cx-head-left">
          <button type="button" class="cx-back-circle tap" onclick="switchView('chat')" aria-label="Quay lại"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>
          <div><h2 class="cx-page-title" style="margin:0;">Tài nguyên</h2><div style="font-size:12px;color:var(--ink-3);">boi-canh.md · Tệp/ZIP · Thư viện · Trí nhớ</div></div>
        </div>
        <button type="button" class="btn-p tap" style="height:36px;padding:0 14px;font-size:12.5px;" onclick="openSharedContextEditor(null)">+ Trang</button>
      </div>
      <div class="v38-tab-bar">
        <button type="button" class="v38-tab-btn tap ${V50.resTab === "pages" ? "active" : ""}" onclick="renderResourcesPage('pages')">boi-canh.md (${(S.contexts || []).length})</button>
        <button type="button" class="v38-tab-btn tap ${V50.resTab === "library" ? "active" : ""}" onclick="renderResourcesPage('library')">Thư viện &amp; Nhật ký</button>
        <button type="button" class="v38-tab-btn tap ${V50.resTab === "memory" ? "active" : ""}" onclick="renderResourcesPage('memory')">Trí nhớ (${(S.memories || []).length})</button>
      </div>`;

    if (V50.resTab === "pages") {
      box.innerHTML = header + `<div style="display:flex;gap:6px;margin-bottom:10px;">
        <button type="button" class="btn-s tap" style="flex:1;height:36px;font-size:12.5px;" onclick="document.getElementById('in-doc').click();switchView('chat')">Tải tệp / ZIP vào Chat</button>
        <button type="button" class="btn-s tap" style="flex:1;height:36px;font-size:12.5px;" onclick="openMergeTrashToContextModal()">Gộp nhiều ghi chú</button>
      </div>` + ((S.contexts || []).map(c => `<div class="card-item">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <strong style="font-family:var(--font-mono);font-size:13.5px;">${esc(c.title)}</strong>
          <span class="tag-quiet num">${Math.max(1, Math.round((c.content || "").length / 1024))}KB</span>
        </div>
        <div style="font-size:12.5px;color:var(--ink-2);margin-top:5px;white-space:pre-line;">${esc((c.content || "").slice(0, 180))}${(c.content || "").length > 180 ? "..." : ""}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">
          <button type="button" class="btn-p tap" style="height:34px;font-size:12px;" onclick="attachSharedContext('${c.id}');switchView('chat')">Gắn vào Chat</button>
          <button type="button" class="btn-s tap" style="height:34px;font-size:12px;" onclick="openSharedContextEditor('${c.id}')">Sửa trang</button>
          <button type="button" class="btn-danger tap" style="height:34px;font-size:12px;" onclick="deleteSharedContext('${c.id}');renderResourcesPage('pages')">Xóa</button>
        </div>
      </div>`).join("") || `<div class="card-item" style="color:var(--ink-3);text-align:center;">Chưa có trang tài nguyên nào. Bấm <b>+ Trang</b> để tạo file <code>boi-canh.md</code> dùng chung cho mọi Model.</div>`);
    } else if (V50.resTab === "library") {
      box.innerHTML = header + `<div id="res-lib-host"></div>`;
      const origLibBox = document.getElementById("lib-body");
      if (typeof renderLibrary === "function") renderLibrary();
      const host = document.getElementById("res-lib-host");
      if (host && origLibBox) host.innerHTML = origLibBox.innerHTML;
    } else {
      box.innerHTML = header + `<div class="card-item">
        <label class="f-lbl" style="margin-top:0;">Thêm dữ kiện trí nhớ nhanh</label>
        <div style="display:flex;gap:6px;">
          <input id="res-mem-in" class="field" placeholder="VD: Tôi thích câu trả lời thực chiến ngắn gọn..." />
          <button type="button" class="btn-p tap" onclick="v50AddResMemory()">Lưu</button>
        </div>
      </div>` + (S.memories || []).map(m => `<div class="mem-chip-row" style="margin-bottom:6px;">
        <span style="flex:1;font-size:13px;">${esc(m.content)}</span>
        <button type="button" class="mini-act tap" onclick="delMemory('${m.id}').then(()=>renderResourcesPage('memory'))">${ICON_X}</button>
      </div>`).join("");
    }
  };

  window.v50AddResMemory = async function () {
    const v = document.getElementById("res-mem-in")?.value.trim();
    if (!v) return;
    await addQuickMemory(v);
    renderResourcesPage("memory");
  };

  // HUB 3: AGENTS (TEAMS GRAPH SWARM + GIA SƯ AI + 1-SENTENCE BUILDER)
  window.renderAgentsHubPage = function (tab = V50.agentsTab) {
    V50.agentsTab = tab || "teams";
    const box = document.getElementById("agents-body");
    if (!box) return;
    const header = `<div class="cx-page-head">
        <div class="cx-head-left">
          <button type="button" class="cx-back-circle tap" onclick="switchView('chat')" aria-label="Quay lại"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>
          <div><h2 class="cx-page-title" style="margin:0;">Tác nhân</h2><div style="font-size:12px;color:var(--ink-3);">Đội Agent Đồ thị · Gia sư AI · Kiến trúc sư</div></div>
        </div>
        ${V50.agentsTab === "tutors"
          ? `<button type="button" class="btn-p tap" style="height:36px;padding:0 14px;font-size:12.5px;" onclick="openTutorEditor()">+ Gia sư</button>`
          : `<button type="button" class="btn-p tap" style="height:36px;padding:0 14px;font-size:12.5px;" onclick="openTeamEditor()">+ Team</button>`}
      </div>
      <div class="v38-tab-bar">
        <button type="button" class="v38-tab-btn tap ${V50.agentsTab === "teams" ? "active" : ""}" onclick="renderAgentsHubPage('teams')">Đội ngũ AI (${(S.teams || []).length})</button>
        <button type="button" class="v38-tab-btn tap ${V50.agentsTab === "tutors" ? "active" : ""}" onclick="renderAgentsHubPage('tutors')">Gia sư AI (${(S.tutors || []).length})</button>
        <button type="button" class="v38-tab-btn tap ${V50.agentsTab === "quick" ? "active" : ""}" onclick="renderAgentsHubPage('quick')">Tạo 1 câu</button>
      </div>`;

    if (V50.agentsTab === "teams") {
      if (typeof renderTeamsPage === "function") renderTeamsPage();
      const src = document.getElementById("teams-body");
      box.innerHTML = header + (src ? src.innerHTML : "");
    } else if (V50.agentsTab === "tutors") {
      if (typeof renderTutorsPage === "function") renderTutorsPage();
      const src = document.getElementById("tutors-body");
      box.innerHTML = header + `<div style="display:flex;justify-content:flex-end;gap:6px;margin-bottom:10px;">
        <button type="button" class="btn-blue tap" style="height:34px;font-size:12.5px;" onclick="openAiAssistBuilderModal('tutor')">AI lập Gia sư hộ</button>
      </div>` + (src ? src.innerHTML : "");
    } else {
      box.innerHTML = header + `<div class="card-item" style="border-color:var(--accent-rim);">
        <strong style="font-size:15px;">Tạo Đội Tác nhân bằng 1 câu</strong>
        <p style="font-size:12.5px;color:var(--ink-2);margin:4px 0 10px;">Mô tả bạn muốn AI gánh việc gì — Kiến trúc sư tự dựng Đội Graph Swarm 3–5 Agent hoặc Gia sư AI trong 1 chạm.</p>
        <textarea id="ag-one-line" class="field" rows="3" placeholder="VD: Tạo đội 4 agent viết kịch bản TikTok sắc bén, có Checker chấm điểm và tự sửa 2 vòng..."></textarea>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <button type="button" class="btn-p tap" style="flex:1;" onclick="v50LaunchArchitectWithText()">Mở Kiến trúc sư Graph</button>
          <button type="button" class="btn-blue tap" style="flex:1;" onclick="openAiAssistBuilderModal('tutor')">Lập Gia sư AI môn học</button>
        </div>
      </div>`;
    }
  };

  window.v50LaunchArchitectWithText = function () {
    const v = document.getElementById("ag-one-line")?.value.trim() || "";
    openTeamArchitectModal();
    setTimeout(() => { const q1 = document.getElementById("ta-q1"); if (q1 && v) q1.value = v; }, 50);
  };

  // HUB 4: STUDIO (IMAGE / VIDEO / VOICE)
  window.renderStudioPage = function (tab = V50.studioTab) {
    V50.studioTab = tab || "image";
    const box = document.getElementById("studio-body");
    if (!box) return;
    const mediaImgs = (S.library || []).filter(x => x.type === "media").slice(0, 12);

    const header = `<div class="cx-page-head">
        <div class="cx-head-left">
          <button type="button" class="cx-back-circle tap" onclick="switchView('chat')" aria-label="Quay lại"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>
          <div><h2 class="cx-page-title" style="margin:0;">Tạo nội dung</h2><div style="font-size:12px;color:var(--ink-3);">Hình ảnh HD · Video · Giọng nói AI</div></div>
        </div>
      </div>
      <div class="v38-tab-bar">
        <button type="button" class="v38-tab-btn tap ${V50.studioTab === "image" ? "active" : ""}" onclick="renderStudioPage('image')">Hình ảnh</button>
        <button type="button" class="v38-tab-btn tap ${V50.studioTab === "video" ? "active" : ""}" onclick="renderStudioPage('video')">Video</button>
        <button type="button" class="v38-tab-btn tap ${V50.studioTab === "voice" ? "active" : ""}" onclick="renderStudioPage('voice')">Giọng nói</button>
      </div>`;

    if (V50.studioTab === "image") {
      box.innerHTML = header + `<div class="card-item">
        <label class="f-lbl" style="margin-top:0;">Mô tả hình ảnh muốn tạo</label>
        <textarea id="st-img-prompt" class="field" rows="3" placeholder="VD: Poster tối giản trên nền đen tuyền, ánh sáng studio sắc nét..."></textarea>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px;">
          <div><label class="f-lbl">Khung hình</label><select id="st-img-sz" class="field"><option value="1024x1024">Vuông 1:1</option><option value="1536x1024">Ngang 16:9</option><option value="1024x1536">Dọc 9:16</option></select></div>
          <div><label class="f-lbl">Phong cách</label><select id="st-img-sty" class="field"><option value="">Tự nhiên</option><option value="minimalist studio photography, crisp lighting">Tối giản Studio</option><option value="editorial illustration, clean modern lines">Editorial</option><option value="cinematic photorealistic 8k">Điện ảnh thực tế</option></select></div>
        </div>
        <button type="button" id="btn-st-gen-img" class="btn-p tap" style="width:100%;margin-top:12px;" onclick="runStudioGenImage()">Tạo hình ảnh ngay</button>
      </div>
      <div style="font-size:13px;color:var(--ink-2);margin:10px 0 6px;">Ảnh đã tạo gần đây (${mediaImgs.length})</div>
      <div class="media-grid">${mediaImgs.map(m => `<div class="media-tile"><img src="${m.data}" onclick="openLightbox('${m.data}','${esc(m.title || "studio.png")}')" /></div>`).join("") || `<div style="font-size:12.5px;color:var(--ink-3);">Chưa có ảnh nào trong Thư viện.</div>`}</div>`;
    } else if (V50.studioTab === "video") {
      box.innerHTML = header + `<div class="card-item">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <strong style="font-size:15px;">Kịch bản &amp; Prompt Video AI</strong>
          <span class="tag-st st-unused">Veo · Sora · Kling</span>
        </div>
        <p style="font-size:12.5px;color:var(--ink-2);line-height:1.5;margin-bottom:10px;">Nhập ý tưởng video — AI sẽ tạo trọn bộ kịch bản phân cảnh và chuỗi Prompt tiếng Anh chuẩn điện ảnh sẵn sàng render.</p>
        <textarea id="st-vid-prompt" class="field" rows="3" placeholder="VD: Video 15 giây giới thiệu app API AI trên điện thoại..."></textarea>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px;">
          <div><label class="f-lbl">Tỷ lệ</label><select id="st-vid-ar" class="field"><option value="9:16 dọc">9:16 (TikTok/Reels)</option><option value="16:9 ngang">16:9 (YouTube)</option></select></div>
          <div><label class="f-lbl">Thời lượng</label><select id="st-vid-dur" class="field"><option value="8 giây">8 giây</option><option value="15 giây">15 giây</option><option value="30 giây">30 giây</option></select></div>
        </div>
        <button type="button" class="btn-p tap" style="width:100%;margin-top:12px;" onclick="runStudioVideoStoryboard()">Tạo kịch bản &amp; Prompt Video</button>
      </div>`;
    } else {
      box.innerHTML = header + `<div class="card-item">
        <strong style="font-size:15px;display:block;margin-bottom:4px;">Đọc văn bản thành Giọng nói (TTS)</strong>
        <textarea id="st-tts-txt" class="field" rows="5" placeholder="Dán kịch bản thuyết trình hoặc đoạn tiếng Anh muốn nghe đọc thử..."></textarea>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px;">
          <div><label class="f-lbl">Ngôn ngữ</label><select id="st-tts-lang" class="field"><option value="vi-VN">Tiếng Việt</option><option value="en-US">English</option></select></div>
          <div><label class="f-lbl">Tốc độ</label><select id="st-tts-rate" class="field"><option value="0.9">0.9x</option><option value="1" selected>1.0x</option><option value="1.25">1.25x</option><option value="1.5">1.5x</option></select></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;">
          <button type="button" class="btn-p tap" style="flex:1;" onclick="runStudioSpeak()">Phát giọng nói</button>
          <button type="button" class="btn-s tap" onclick="stopStudioSpeak()">Dừng</button>
        </div>
      </div>`;
    }
  };

  window.runStudioGenImage = async function () {
    const raw = document.getElementById("st-img-prompt")?.value?.trim();
    if (!raw) return showToast("Nhập mô tả hình ảnh trước nhé", "warn");
    const size = document.getElementById("st-img-sz")?.value || "1024x1024";
    const sty = document.getElementById("st-img-sty")?.value || "";
    const btn = document.getElementById("btn-st-gen-img");
    if (btn) { btn.disabled = true; btn.textContent = "Đang vẽ ảnh HD..."; }
    try {
      const r = await apiFetch("/ai/image", { method: "POST", body: { prompt: sty ? `${raw}, ${sty}` : raw, size } });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Tạo ảnh thất bại");
      const it = d.data?.[0], src = it?.b64_json ? `data:image/png;base64,${it.b64_json}` : it?.url;
      if (!src) throw new Error("Không nhận được dữ liệu ảnh");
      const fn = `studio-${Date.now().toString(36)}.png`;
      await saveLib("media", fn, src);
      haptic("ok"); showToast("Đã tạo & lưu ảnh vào Thư viện!", "ok");
      renderStudioPage("image");
      openLightbox(src, fn);
    } catch (e) {
      haptic("err"); showToast(e.message, "err");
      if (btn) { btn.disabled = false; btn.textContent = "Tạo hình ảnh ngay"; }
    }
  };

  window.runStudioVideoStoryboard = function () {
    const v = document.getElementById("st-vid-prompt")?.value?.trim();
    if (!v) return showToast("Nhập ý tưởng video trước", "warn");
    const ar = document.getElementById("st-vid-ar")?.value || "9:16";
    const dur = document.getElementById("st-vid-dur")?.value || "15 giây";
    switchView("chat");
    sendPrompt(`Viết kịch bản phân cảnh (${dur}, tỷ lệ ${ar}) + chuỗi Prompt tiếng Anh chuẩn điện ảnh sẵn sàng render bằng Veo/Sora/Kling cho ý tưởng: ${v}`);
  };

  window.runStudioSpeak = function () {
    const txt = document.getElementById("st-tts-txt")?.value?.trim();
    if (!txt) return showToast("Nhập nội dung cần đọc", "warn");
    if (!window.speechSynthesis) return showToast("Thiết bị không hỗ trợ đọc giọng nói", "err");
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = document.getElementById("st-tts-lang")?.value || "vi-VN";
    u.rate = Number(document.getElementById("st-tts-rate")?.value || 1);
    speechSynthesis.speak(u);
    haptic("ok"); showToast("Đang phát giọng nói...");
  };
  window.stopStudioSpeak = function () { try { speechSynthesis.cancel(); } catch {} };

  // HUB 5: CONNECTORS (24 SERVICES + CUSTOM MCP + VIETNAMESE SKILL STORE)
  const OAUTH_CONNECTORS_24 = [
    { id: "gmail", name: "Gmail", short: "M", color: "#EA4335", hint: "Đọc & soạn thư tự động qua MCP" },
    { id: "gdrive", name: "Google Drive", short: "GD", color: "#0F9D58", hint: "Tìm kiếm & đọc tài liệu Google Drive" },
    { id: "gcal", name: "Google Calendar", short: "31", color: "#4285F4", hint: "Xem lịch & tạo sự kiện nhắc học/họp" },
    { id: "slack", name: "Slack", short: "Sl", color: "#4A154B", hint: "Tóm tắt kênh & gửi tin nhắn nhóm" },
    { id: "airtable", name: "Airtable", short: "At", color: "#FCB400", hint: "Đọc & ghi bảng dữ liệu Airtable" },
    { id: "gsheets", name: "Google Sheets", short: "GS", color: "#0F9D58", hint: "Truy vấn và cập nhật trang tính" },
    { id: "gdocs", name: "Google Docs", short: "Do", color: "#2563EB", hint: "Đọc & soạn tài liệu Google Docs" },
    { id: "supabase", name: "Supabase", short: "Sb", color: "#3ECF8E", hint: "Truy vấn SQL & quản lý bảng Supabase" },
    { id: "confluence", name: "Confluence", short: "Cf", color: "#0052CC", hint: "Tra cứu tài liệu nội bộ Confluence" },
    { id: "jira", name: "Jira", short: "Jr", color: "#0052CC", hint: "Theo dõi & tạo ticket công việc Jira" },
    { id: "clickup", name: "ClickUp", short: "Cu", color: "#7B68EE", hint: "Đồng bộ nhiệm vụ & tiến độ ClickUp" },
    { id: "dropbox", name: "Dropbox", short: "Db", color: "#0061FF", hint: "Đọc file lưu trữ đám mây Dropbox" },
    { id: "figma", name: "Figma", short: "Fg", color: "#A259FF", hint: "Đọc design token & khung Figma" },
    { id: "hubspot", name: "HubSpot", short: "Hs", color: "#FF7A59", hint: "Tra cứu CRM khách hàng HubSpot" },
    { id: "onedrive", name: "OneDrive", short: "Od", color: "#0078D4", hint: "Kết nối tệp Office trên OneDrive" },
    { id: "outlook", name: "Outlook Mail", short: "Ol", color: "#0072C6", hint: "Đọc & trả lời email Microsoft Outlook" },
    { id: "salesforce", name: "Salesforce", short: "Sf", color: "#00A1E0", hint: "Quản lý dữ liệu bán hàng Salesforce" },
    { id: "whatsapp", name: "WhatsApp", short: "Wa", color: "#25D366", hint: "Kết nối bot / tin nhắn WhatsApp" },
    { id: "youtube", name: "YouTube", short: "YT", color: "#FF0000", hint: "Tóm tắt video & phân tích kênh" },
    { id: "zendesk", name: "Zendesk", short: "Zd", color: "#03363D", hint: "Hỗ trợ trả lời phiếu CSKH Zendesk" },
    { id: "calcom", name: "Cal.com", short: "Cal", color: "#18181B", hint: "Quản lý lịch hẹn đặt chỗ Cal.com" },
    { id: "notion", name: "Notion", short: "N", color: "#262626", hint: "Đọc/ghi trang & cơ sở dữ liệu Notion" },
    { id: "x", name: "X", short: "X", color: "#111111", hint: "Theo dõi xu hướng & soạn bài đăng X" },
    { id: "github", name: "GitHub", short: "GH", color: "#24292F", hint: "Đọc Repo, Issue & Pull Request GitHub" }
  ];

  const VI_SKILL_STORE = [
    { id: "sk-humanizer-vi", name: "humanizer-vi", desc: "Viết lại văn bản AI thành tiếng Việt tự nhiên, sạch văn mẫu", prompt: "Biên tập lại văn bản sang tiếng Việt tự nhiên như người thật viết. Bỏ các từ sáo rỗng, rút gọn câu dài lê thê, giữ 100% ý chính." },
    { id: "sk-grammar-vi", name: "grammar-checker-vi", desc: "Soát chính tả, ngữ pháp, dấu câu và lỗi lặp từ tiếng Việt", prompt: "Soát kỹ chính tả, dấu thanh, lỗi đánh máy và cấu trúc câu tiếng Việt. Liệt kê rõ lỗi sửa (Cũ → Mới) rồi xuất bản hoàn chỉnh." },
    { id: "sk-style-vi", name: "style-guide-vi", desc: "Chuẩn hóa văn phong nhất quán theo tông thương hiệu / học thuật", prompt: "Chuẩn hóa toàn bộ văn bản theo đúng 1 tông giọng nhất quán, thuật ngữ thống nhất, phân cấp tiêu đề rõ ràng." },
    { id: "sk-trans-clean-vi", name: "translationese-cleaner-vi", desc: "Khử mùi dịch word-by-word (Anh → Việt) cho câu văn mượt mà", prompt: "Khử hoàn toàn cấu trúc dịch máy bị động sang tiếng Việt chủ động, tự nhiên và giàu nhịp điệu." },
    { id: "sk-minutes-vi", name: "bien-ban-hop-vi", desc: "Biến ghi chép lộn xộn thành Biên bản họp có Action Items", prompt: "Chuyển nội dung cuộc họp thành Biên bản chuẩn gồm: Tóm tắt 3 dòng, Quyết định chốt, Bảng đầu việc (Ai làm | Làm gì | Hạn chót), Rủi ro." },
    { id: "sk-weekly-vi", name: "bao-cao-tuan-vi", desc: "Tạo báo cáo tuần/tháng súc tích dạng KPI & kế hoạch hành động", prompt: "Trình bày báo cáo tuần/tháng ngắn gọn gồm: Kết quả nổi bật, Hạng mục hoàn thành, Vướng mắc & Đề xuất, Trọng tâm kỳ tới." },
    { id: "sk-formal-vi", name: "cong-van-thu-khach-vi", desc: "Soạn email khách hàng, đề xuất hợp tác & công văn chuẩn mực", prompt: "Soạn thư/email/công văn tiếng Việt lịch sự, rõ mục đích ngay 2 câu đầu, có CTA cụ thể và độ dài vừa phải." }
  ];

  window.v50SetConnSearch = function (val) { V50.connSearch = val || ""; window.renderConnectorsPage("connectors"); };

  window.renderConnectorsPage = async function (tab = V50.connTab) {
    V50.connTab = tab || "connectors";
    const box = document.getElementById("connectors-body");
    if (!box) return;
    S.connectors = await dbAll("connectors").catch(() => S.connectors || []);
    const connectedMap = new Map(S.connectors.map(c => [c.id, c]));

    const header = `<div class="cx-page-head">
        <div class="cx-head-left">
          <button type="button" class="cx-back-circle tap" onclick="switchView('chat')" aria-label="Quay lại"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>
          <div><h2 class="cx-page-title" style="margin:0;">Trình kết nối</h2><div style="font-size:12px;color:var(--ink-3);">24 dịch vụ · MCP Tùy chỉnh · Cửa hàng Kỹ năng</div></div>
        </div>
        <button type="button" class="btn-blue tap" style="height:36px;padding:0 13px;font-size:12px;" onclick="openCustomMcpModalV50()">+ MCP</button>
      </div>
      <div class="v38-tab-bar">
        <button type="button" class="v38-tab-btn tap ${V50.connTab === "connectors" ? "active" : ""}" onclick="renderConnectorsPage('connectors')">Kết nối (24)</button>
        <button type="button" class="v38-tab-btn tap ${V50.connTab === "mcp" ? "active" : ""}" onclick="renderConnectorsPage('mcp')">MCP (${(S.mcpServers || []).length})</button>
        <button type="button" class="v38-tab-btn tap ${V50.connTab === "store" ? "active" : ""}" onclick="renderConnectorsPage('store')">Cửa hàng Kỹ năng</button>
      </div>`;

    if (V50.connTab === "connectors") {
      const q = (V50.connSearch || "").toLowerCase();
      const filtered = OAUTH_CONNECTORS_24.filter(c => !q || c.name.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q));
      box.innerHTML = header + `
        <input class="field" style="margin-bottom:10px;border-radius:var(--r-pill);padding:8px 16px;" placeholder="Tìm trình kết nối (Gmail, Drive, Notion, GitHub...)" value="${esc(V50.connSearch)}" oninput="v50SetConnSearch(this.value)" />
        <div class="cx-group-card">
          ${filtered.map(c => {
            const on = connectedMap.has(c.id) && connectedMap.get(c.id).enabled !== false;
            return `<div class="cx-conn-row">
              <div style="display:flex;align-items:center;gap:12px;min-width:0;flex:1;">
                <span class="cx-conn-ico" style="background:${c.color};">${esc(c.short)}</span>
                <div style="min-width:0;">
                  <div style="font-size:14.5px;font-weight:500;">${esc(c.name)}</div>
                  <div style="font-size:11.5px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(c.hint)}</div>
                </div>
              </div>
              <button type="button" class="cx-conn-plus tap ${on ? "on" : ""}" onclick="openConnectorConfigModal('${c.id}')" aria-label="Kết nối ${esc(c.name)}">${on ? "✓" : "+"}</button>
            </div>`;
          }).join("")}
        </div>
        <div class="cx-group-card">
          <button type="button" class="cx-row tap-soft" onclick="renderConnectorsPage('store')"><span class="cx-row-l"><span>Cửa hàng Kỹ năng Việt hóa</span></span><span class="cx-row-r">›</span></button>
          <button type="button" class="cx-row tap-soft" onclick="openCustomMcpModalV50()"><span class="cx-row-l"><span>Thêm MCP Tùy chỉnh (Streamable HTTP / JSON)</span></span><span class="cx-row-r">›</span></button>
          <button type="button" class="cx-row tap-soft" onclick="switchView('customize')"><span class="cx-row-l"><span>Quản lý Kỹ năng &amp; GitHub Repo</span></span><span class="cx-row-r">›</span></button>
        </div>`;
    } else if (V50.connTab === "mcp") {
      if (typeof renderMcpPage === "function") renderMcpPage();
      const src = document.getElementById("mcp-body");
      box.innerHTML = header + (src ? src.innerHTML : "");
    } else {
      const installedIds = new Set((S.skills || []).map(s => s.id));
      box.innerHTML = header + `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px;">
          <strong style="font-size:14px;">Kỹ năng Việt hóa (${VI_SKILL_STORE.length})</strong>
          <button type="button" class="btn-s tap" style="height:34px;font-size:12px;" onclick="switchView('customize')">Kỹ năng &amp; GitHub Repo</button>
        </div>
        ${VI_SKILL_STORE.map(sk => {
          const has = installedIds.has(sk.id);
          return `<div class="card-item" style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <div style="min-width:0;flex:1;">
              <strong style="font-family:var(--font-mono);font-size:13.5px;">@${esc(sk.name)}</strong>
              <div style="font-size:12.5px;color:var(--ink-2);margin-top:2px;">${esc(sk.desc)}</div>
            </div>
            <button type="button" class="${has ? "btn-s" : "btn-p"} tap" style="height:34px;padding:0 12px;font-size:12px;flex-shrink:0;" onclick="installStoreSkill('${sk.id}')">${has ? "Đã cài" : "Cài ngay"}</button>
          </div>`;
        }).join("")}`;
    }
  };

  window.installStoreSkill = async function (id) {
    const sk = VI_SKILL_STORE.find(x => x.id === id); if (!sk) return;
    const obj = { ...sk, builtin: false };
    await dbPut("skills", obj);
    apiFetch("/sync/skills", { method: "POST", body: obj }).catch(() => {});
    S.skills = await dbAll("skills");
    if (!S.skillIds.includes(obj.id)) S.skillIds.push(obj.id);
    renderSkillStack(); renderConnectorsPage("store"); haptic("ok");
    showToast(`Đã cài & bật @${obj.name}`, "ok");
  };

  window.openConnectorConfigModal = function (id) {
    const meta = OAUTH_CONNECTORS_24.find(x => x.id === id); if (!meta) return;
    const cur = (S.connectors || []).find(c => c.id === id);
    openModal(`<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <span class="cx-conn-ico" style="background:${meta.color};">${esc(meta.short)}</span>
        <div><h3 style="font-size:16px;font-weight:600;margin:0;">Kết nối ${esc(meta.name)}</h3><div style="font-size:12px;color:var(--ink-3);">${esc(meta.hint)}</div></div>
      </div>
      <label class="f-lbl">MCP Endpoint URL của ${esc(meta.name)} (Composio / Zapier / n8n MCP)</label>
      <input id="cn-url" class="field" value="${esc(cur?.mcpUrl || "")}" placeholder="https://mcp.example.com/..." />
      <label class="f-lbl">API Key / Bearer Token (tùy chọn)</label>
      <input id="cn-tok" type="password" class="field" value="${esc(cur?.token || "")}" placeholder="Nhập token hoặc để trống" />
      <div style="display:flex;justify-content:space-between;gap:8px;margin-top:14px;">
        ${cur ? `<button type="button" class="btn-danger tap" onclick="removeConnectorConfig('${id}')">Ngắt</button>` : `<span></span>`}
        <div style="display:flex;gap:8px;">
          <button type="button" class="btn-s tap" onclick="closeModal()">Hủy</button>
          <button type="button" class="btn-p tap" onclick="saveConnectorConfig('${id}')">Lưu &amp; Bật</button>
        </div>
      </div>`);
  };

  window.saveConnectorConfig = async function (id) {
    const meta = OAUTH_CONNECTORS_24.find(x => x.id === id); if (!meta) return;
    const mcpUrl = document.getElementById("cn-url")?.value.trim() || "";
    const token = document.getElementById("cn-tok")?.value.trim() || "";
    const obj = { id, name: meta.name, mcpUrl, token, enabled: true, updatedAt: Date.now() };
    await dbPut("connectors", obj).catch(() => {});
    apiFetch("/sync/connectors", { method: "POST", body: obj }).catch(() => {});
    if (mcpUrl.startsWith("http") && canUseRemoteMcp()) {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const r = await apiFetch("/mcp/discover", { method: "POST", body: { url: mcpUrl, headers } });
        if (r.ok) {
          const d = await r.json();
          const sv = { id: "mcp-conn-" + id, name: meta.name, url: mcpUrl, headers, enabled: true, tools: d.tools || [], updatedAt: Date.now() };
          await dbPut("mcp", sv); S.mcpServers = await dbAll("mcp"); renderMcpQuickBadge();
        }
      } catch {}
    }
    S.connectors = await dbAll("connectors").catch(() => [obj]);
    closeModal(); renderConnectorsPage("connectors"); haptic("ok");
    showToast(`Đã kích hoạt kết nối ${meta.name}`, "ok");
  };

  window.removeConnectorConfig = async function (id) {
    await dbDel("connectors", id).catch(() => {});
    apiFetch("/sync/connectors/" + encodeURIComponent(id), { method: "DELETE" }).catch(() => {});
    S.connectors = S.connectors.filter(c => c.id !== id);
    closeModal(); renderConnectorsPage("connectors"); showToast("Đã ngắt kết nối");
  };

  window.openCustomMcpModalV50 = function () {
    if (!canUseRemoteMcp()) return showToast("MCP Tùy chỉnh yêu cầu Key hạng Pro Max trở lên", "warn");
    V50.mcpAuthType = "none";
    V50.mcpTestedTools = [];
    openModal(`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <h3 style="font-size:16.5px;font-weight:600;margin:0;">Thêm Kỹ năng MCP Tùy chỉnh</h3>
        <button type="button" class="mini-act tap" onclick="closeModal()">${ICON_X}</button>
      </div>
      <button type="button" class="btn-s tap" style="width:100%;margin-bottom:10px;" onclick="toggleMcpJsonPaste()">Nhập cấu hình JSON nhanh</button>
      <div id="mcp-json-box" style="display:none;margin-bottom:10px;">
        <textarea id="mcp-json-in" class="field" rows="3" style="font-family:var(--font-mono);font-size:12px;" placeholder='{"name":"my-mcp","url":"https://...","apiKey":""}'></textarea>
        <button type="button" class="btn-blue tap" style="width:100%;height:34px;font-size:12px;margin-top:6px;" onclick="applyMcpJsonPaste()">Điền tự động từ JSON</button>
      </div>

      <div class="cx-mcp-modal-grid">
        <div>
          <label class="f-lbl" style="margin-top:0;">Loại MCP</label>
          <div class="cx-mcp-type-cards">
            <div class="cx-mcp-type-card active"><strong style="font-size:13px;">Streamable HTTP</strong><span style="font-size:11.5px;color:var(--ink-2);">Tương thích Web &amp; APK · Máy chủ MCP từ xa</span></div>
            <div class="cx-mcp-type-card" style="opacity:0.55;"><strong style="font-size:13px;">STDIO (Cục bộ)</strong><span style="font-size:11.5px;color:var(--warn-ink);">Chỉ khả dụng trên máy tính Desktop cục bộ</span></div>
          </div>

          <label class="f-lbl">Tên MCP <span class="tag-quiet">identifier</span></label>
          <input id="cm-name" class="field" placeholder="ví dụ: my-mcp-plugin" />
          <label class="f-lbl">URL Endpoint Streamable HTTP <span class="tag-quiet">url</span></label>
          <input id="cm-url" class="field" placeholder="https://mcp.example.com/mcp" />

          <label class="f-lbl">Loại xác thực</label>
          <div style="display:flex;gap:12px;margin:4px 0 8px;font-size:13px;flex-wrap:wrap;">
            <label style="display:inline-flex;align-items:center;gap:5px;"><input type="radio" name="cm-auth" value="none" checked onchange="setMcpAuthType('none')" /> Không xác thực</label>
            <label style="display:inline-flex;align-items:center;gap:5px;"><input type="radio" name="cm-auth" value="apikey" onchange="setMcpAuthType('apikey')" /> API Key</label>
            <label style="display:inline-flex;align-items:center;gap:5px;"><input type="radio" name="cm-auth" value="oauth" onchange="setMcpAuthType('oauth')" /> OAuth</label>
          </div>
          <div id="cm-auth-extra" style="display:none;margin-bottom:8px;">
            <input id="cm-secret" type="password" class="field" placeholder="Nhập API Key hoặc Bearer Token..." />
          </div>

          <button type="button" id="btn-test-mcp" class="btn-s tap" style="width:100%;margin-top:4px;" onclick="testCustomMcpConnection()">Kiểm tra kết nối</button>
          <label class="f-lbl">Mô tả</label>
          <input id="cm-desc" class="field" placeholder="Hướng dẫn sử dụng và tính năng..." />
        </div>

        <div class="card-item" style="margin:0;background:var(--surface-0);display:flex;flex-direction:column;justify-content:center;" id="cm-preview-pane">
          <div style="text-align:center;color:var(--ink-3);font-size:12.5px;">
            <strong style="display:block;color:var(--ink);margin-bottom:4px;">Xem trước công cụ</strong>
            Bấm <b>Kiểm tra kết nối</b> để quét danh sách <code>tools/list</code>.
          </div>
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
        <button type="button" class="btn-s tap" onclick="closeModal()">Hủy</button>
        <button type="button" class="btn-p tap" onclick="installCustomMcpV50()">Cài đặt</button>
      </div>`);
  };

  window.toggleMcpJsonPaste = function () {
    const el = document.getElementById("mcp-json-box");
    if (el) el.style.display = el.style.display === "none" ? "block" : "none";
  };
  window.applyMcpJsonPaste = function () {
    try {
      const j = JSON.parse(document.getElementById("mcp-json-in")?.value || "{}");
      if (j.name) document.getElementById("cm-name").value = j.name;
      if (j.url || j.endpoint) document.getElementById("cm-url").value = j.url || j.endpoint;
      if (j.description) document.getElementById("cm-desc").value = j.description;
      if (j.apiKey || j.token) { setMcpAuthType("apikey"); document.getElementById("cm-secret").value = j.apiKey || j.token; }
      showToast("Đã nạp cấu hình từ JSON", "ok");
    } catch { showToast("JSON chưa đúng định dạng", "err"); }
  };
  window.setMcpAuthType = function (t) {
    V50.mcpAuthType = t;
    const ex = document.getElementById("cm-auth-extra");
    if (ex) ex.style.display = t === "none" ? "none" : "block";
  };
  window.testCustomMcpConnection = async function () {
    const url = document.getElementById("cm-url")?.value.trim();
    if (!url || !url.startsWith("http")) return showToast("Nhập URL Endpoint hợp lệ trước", "warn");
    const sec = document.getElementById("cm-secret")?.value.trim() || "";
    const headers = (V50.mcpAuthType !== "none" && sec) ? { Authorization: `Bearer ${sec}` } : {};
    const btn = document.getElementById("btn-test-mcp"), prev = document.getElementById("cm-preview-pane");
    if (btn) { btn.disabled = true; btn.textContent = "Đang kiểm tra kết nối..."; }
    try {
      const r = await apiFetch("/mcp/discover", { method: "POST", body: { url, headers } });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Kết nối thất bại");
      V50.mcpTestedTools = d.tools || [];
      if (prev) {
        prev.innerHTML = `<strong style="font-size:13px;color:var(--ok-ink);margin-bottom:6px;">Kết nối thành công · ${V50.mcpTestedTools.length} tools</strong>
          <div class="file-tag-list">${V50.mcpTestedTools.slice(0, 12).map(t => `<span class="file-mini-tag">${esc(t.name)}</span>`).join("") || `<span style="font-size:12px;color:var(--ink-3);">Server online</span>`}</div>`;
      }
      haptic("ok"); showToast(`Kết nối MCP thành công (${V50.mcpTestedTools.length} tools)!`, "ok");
    } catch (e) {
      if (prev) prev.innerHTML = `<div style="color:var(--danger-ink);font-size:12.5px;">Lỗi: ${esc(e.message)}</div>`;
      haptic("err"); showToast(e.message, "err");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Kiểm tra kết nối"; }
    }
  };
  window.installCustomMcpV50 = async function () {
    const name = document.getElementById("cm-name")?.value.trim();
    const url = document.getElementById("cm-url")?.value.trim();
    if (!name || !url || !url.startsWith("http")) return showToast("Nhập đủ Tên MCP và URL Endpoint", "warn");
    const sec = document.getElementById("cm-secret")?.value.trim() || "";
    const headers = (V50.mcpAuthType !== "none" && sec) ? { Authorization: `Bearer ${sec}` } : {};
    const sv = { id: "mcp-" + Date.now(), name, url, headers, desc: document.getElementById("cm-desc")?.value.trim() || "", enabled: true, tools: V50.mcpTestedTools, updatedAt: Date.now() };
    await dbPut("mcp", sv);
    apiFetch("/sync/mcp", { method: "POST", body: sv }).catch(() => {});
    S.mcpServers = await dbAll("mcp");
    renderMcpQuickBadge(); closeModal(); renderConnectorsPage("mcp"); haptic("ok");
    showToast(`Đã cài MCP "${name}"!`, "ok");
  };

  /* =========================================================================
     9. ADMIN CONSOLE PRO (HEALTH CHECKLIST, REVENUE KPI, ORDER & USER SEARCH/FILTER)
     ========================================================================= */
  window.v50SetAdminUserSearch = function (v) { V50.adminUserSearch = v || ""; renderAdminBody(); };
  window.v50SetAdminUserTier = function (t) { V50.adminUserTier = t || "all"; renderAdminBody(); };
  window.v50SetAdminOrderFilter = function (f) { V50.adminOrderFilter = f || "all"; renderAdminBody(); };
  window.v50SetAdminOrderSearch = function (v) { V50.adminOrderSearch = v || ""; renderAdminBody(); };

  const _origRenderAdminV50 = window.renderAdminBody;
  window.renderAdminBody = function () {
    const d = S.adminData, box = document.getElementById("admin-body");
    if (!d || !box) {
      if (typeof _origRenderAdminV50 === "function") _origRenderAdminV50();
      return;
    }

    // 1. Custom Pro Tab: VietQR & Google OAuth + Trial + Filterable Orders
    if (S.adminTab === "billing") {
      const bc = d.config?.billing_config || {};
      const go = d.config?.google_oauth || {};
      const tc = d.config?.trial_config || {};
      const pv = bc.prices_vnd || {};
      const disc = bc.discounts || { m3: 15, m12: 30 };
      const allOrders = d.orders || [];
      const oq = (V50.adminOrderSearch || "").toLowerCase();
      const orders = allOrders.filter(o => {
        if (V50.adminOrderFilter !== "all" && o.status !== V50.adminOrderFilter) return false;
        if (oq && !(o.order_code || "").toLowerCase().includes(oq) && !(o.email || "").toLowerCase().includes(oq)) return false;
        return true;
      });
      const base = getApiBase();

      box.innerHTML = `
        <div class="card-item">
          <strong style="font-size:15px;display:block;margin-bottom:6px;">Cấu hình Thanh toán VietQR Tự động (SePay / Casso)</strong>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div><label class="f-lbl">Mã Ngân hàng</label>
              <select id="ab-bank" class="field">
                ${[["MB","MBBank"],["VCB","Vietcombank"],["TPB","TPBank"],["TCB","Techcombank"],["ACB","ACB"],["BIDV","BIDV"],["ICB","VietinBank"],["VPB","VPBank"],["VIB","VIB"],["MSB","MSB"],["OCB","OCB"]].map(([id, n]) =>
                  `<option value="${id}" ${(bc.bank_id || "MB") === id ? "selected" : ""}>${n} (${id})</option>`
                ).join("")}
              </select>
            </div>
            <div><label class="f-lbl">Số tài khoản</label><input id="ab-acc" class="field num" value="${esc(bc.account_no || "")}" placeholder="VD: 0399834208" /></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div><label class="f-lbl">Chủ tài khoản (Không dấu)</label><input id="ab-name" class="field" value="${esc(bc.account_name || "NGUYEN LUONG BANG")}" /></div>
            <div><label class="f-lbl">Webhook Secret (SePay/Casso)</label><input id="ab-sec" type="password" class="field" value="${esc(bc.webhook_secret || "")}" placeholder="Để trống nếu duyệt tay" /></div>
          </div>
          <div class="mem-chip-row" style="margin-top:8px;">
            <span style="font-size:11.5px;font-family:var(--font-mono);flex:1;overflow:hidden;text-overflow:ellipsis;">${esc(base)}/webhook/sepay</span>
            <button type="button" class="ws-chip-btn tap" onclick="copyText('${esc(base)}/webhook/sepay','Đã copy link Webhook SePay')">Copy URL</button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:6px;">
            <div><label class="f-lbl">Giá Classic (1T · VNĐ)</label><input id="ab-p-c" type="number" class="field num" value="${pv.classic || 19000}" /></div>
            <div><label class="f-lbl">Giá Pro (1T · VNĐ)</label><input id="ab-p-p" type="number" class="field num" value="${pv.pro || 49000}" /></div>
            <div><label class="f-lbl">Giá Pro Max (1T · VNĐ)</label><input id="ab-p-pm" type="number" class="field num" value="${pv.pro_max || 99000}" /></div>
            <div><label class="f-lbl">Giá Ultra (1T · VNĐ)</label><input id="ab-p-u" type="number" class="field num" value="${pv.ultra || 169000}" /></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div><label class="f-lbl">Giảm 3 tháng (%)</label><input id="ab-d3" type="number" class="field num" value="${disc.m3 ?? 15}" /></div>
            <div><label class="f-lbl">Giảm 1 năm (%)</label><input id="ab-d12" type="number" class="field num" value="${disc.m12 ?? 30}" /></div>
          </div>
        </div>

        <div class="card-item">
          <strong style="font-size:15px;display:block;margin-bottom:6px;">Google OAuth &amp; Gói Dùng thử (Trial)</strong>
          <label class="f-lbl">Google OAuth Web Client ID</label>
          <input id="ab-gid" class="field" style="font-family:var(--font-mono);font-size:12.5px;" value="${esc(go.client_id || "")}" placeholder="xxxx.apps.googleusercontent.com" />
          <div class="s-row" style="margin-top:6px;" onclick="document.getElementById('ab-tr-on').classList.toggle('on')">
            <span>Tự tặng gói Trial cho tài khoản mới</span>
            <div id="ab-tr-on" class="sw ${tc.enabled !== false ? "on" : ""}"></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div><label class="f-lbl">Số ngày Trial</label><input id="ab-tr-days" type="number" class="field num" value="${tc.days || 14}" /></div>
            <div><label class="f-lbl">Token / ngày (Trial)</label><input id="ab-tr-toks" type="number" class="field num" value="${tc.daily_tokens || 60000}" /></div>
          </div>
          <button type="button" class="btn-p tap" style="width:100%;margin-top:12px;" onclick="adminSaveBillingAndGoogle()">Lưu cấu hình VietQR, Google &amp; Trial</button>
        </div>

        <div class="card-item">
          <strong style="font-size:15px;display:block;margin-bottom:8px;">Đơn hàng VietQR (${orders.length}/${allOrders.length})</strong>
          <input class="field" style="margin-bottom:8px;font-size:13.5px;" placeholder="Tìm mã đơn APIAI... hoặc email..." value="${esc(V50.adminOrderSearch)}" oninput="v50SetAdminOrderSearch(this.value)" />
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
            ${[["all","Tất cả"],["pending","Đang chờ"],["paid","Đã thanh toán"],["cancelled","Đã hủy"]].map(([k, l]) =>
              `<button type="button" class="btn-s tap ${V50.adminOrderFilter === k ? "lg-active" : ""}" style="height:30px;padding:0 11px;font-size:12px;" onclick="v50SetAdminOrderFilter('${k}')">${l}</button>`
            ).join("")}
          </div>
          ${orders.map(o => `<div class="mem-chip-row" style="margin-bottom:6px;flex-wrap:wrap;">
            <div style="flex:1;min-width:160px;">
              <strong class="num" style="font-size:12.5px;">${esc(o.order_code)} · ${fmtVnd(o.amount_vnd)}</strong>
              <div style="font-size:11.5px;color:var(--ink-2);">${esc(o.email)} · ${o.order_type === "topup" ? "Nạp ví" : `Gói ${TIER_LABELS[o.tier] || o.tier} (${o.months}T)`}</div>
            </div>
            <div style="display:flex;gap:5px;align-items:center;">
              <span class="tag-st ${o.status === "paid" ? "st-active" : (o.status === "pending" ? "st-pending" : "st-revoked")}">${o.status}</span>
              ${o.status === "pending" ? `<button type="button" class="btn-blue tap" style="height:28px;padding:0 10px;font-size:11.5px;" onclick="adminOrderAct('${esc(o.order_code)}','approve')">Duyệt ngay</button><button type="button" class="btn-danger tap" style="height:28px;padding:0 8px;font-size:11.5px;" onclick="adminOrderAct('${esc(o.order_code)}','cancel')">Hủy</button>` : ""}
            </div>
          </div>`).join("") || `<div style="font-size:12.5px;color:var(--ink-3);">Không có đơn chuyển khoản nào phù hợp.</div>`}
        </div>`;
      return;
    }

    // 2. Custom Pro Tab: Users with Search + Tier Filter + Wallet Topup
    if (S.adminTab === "users") {
      const uq = (V50.adminUserSearch || "").toLowerCase();
      const tf = V50.adminUserTier || "all";
      const allUsers = d.users || [];
      const users = allUsers.filter(u => {
        if (tf === "banned" && !u.banned) return false;
        else if (tf === "trial" && !(u.trial_expires_at && !u.active_key)) return false;
        else if (tf !== "all" && tf !== "banned" && tf !== "trial" && u.key_tier !== tf) return false;
        if (uq && !(u.email || "").toLowerCase().includes(uq) && !(u.name || "").toLowerCase().includes(uq) && !(u.active_key || "").toLowerCase().includes(uq)) return false;
        return true;
      });
      box.innerHTML = `
        <div class="card-item" style="padding:12px;">
          <input class="field" style="font-size:14px;margin-bottom:8px;" placeholder="Tìm Email, tên người dùng, mã Key..." value="${esc(V50.adminUserSearch)}" oninput="v50SetAdminUserSearch(this.value)" />
          <div style="display:flex;gap:5px;flex-wrap:wrap;">
            ${[["all","Tất cả"],["admin","Admin"],["ultra","Ultra"],["pro_max","Pro Max"],["pro","Pro"],["classic","Classic"],["trial","Trial"],["banned","Bị khóa"]].map(([k, l]) =>
              `<button type="button" class="btn-s tap ${tf === k ? "lg-active" : ""}" style="height:30px;padding:0 10px;font-size:11.5px;" onclick="v50SetAdminUserTier('${k}')">${l}</button>`
            ).join("")}
          </div>
        </div>
        <div style="font-size:12.5px;color:var(--ink-3);margin:0 0 8px 4px;" class="num">Hiển thị ${users.length} / ${allUsers.length} tài khoản</div>
        ${users.map(u => `<div class="card-item">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap;">
            <div style="min-width:0;"><strong>${esc(u.email)}</strong>${u.google_sub ? ` <span class="tag-quiet">Google</span>` : ""}</div>
            <span class="tag-st ${u.banned ? "st-revoked" : (u.role === "admin" ? "st-active" : "tier-" + u.key_tier)}">${esc(u.banned ? "Bị khóa" : (u.tier_label || u.key_tier))}</span>
          </div>
          <div style="font-size:12.5px;color:var(--ink-2);margin-top:6px;line-height:1.55;">
            Ví: <b class="num" style="color:var(--ok-ink);">${fmtVnd(u.wallet_balance_vnd || 0)}</b> · Key: <code style="font-family:var(--font-mono);color:var(--accent-ink);">${esc(u.active_key || "Không có")}</code><br/>
            Hôm nay: <b class="num">${u.daily_msg_count}/${(u.role==="admin"||Number(u.daily_msg_limit)<0)?"∞":(u.daily_msg_limit??"?")}</b> tin · <b class="num">${Math.round((u.daily_token_count||0)/1000)}K/${u.role==="admin"?"∞":Math.round((u.daily_token_limit||0)/1000)+"K"}</b> tok${u.bonus_tokens ? ` · Dự phòng +${Math.round(u.bonus_tokens/1000)}K` : ""} · ${u.deviceCount} máy
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">
            <button type="button" class="btn-blue tap" style="height:34px;font-size:12px;" onclick="adminTopupUserWalletModal('${esc(u.email)}',${Number(u.wallet_balance_vnd||0)})">+ Cộng Ví</button>
            <button type="button" class="btn-s tap" style="height:34px;font-size:12px;" onclick="adminBonusTokensModal('${esc(u.email)}',${Number(u.bonus_tokens||0)})">+ Token</button>
            <button type="button" class="btn-s tap" style="height:34px;font-size:12px;" onclick="adminPromptChangePass('${esc(u.email)}')">Đổi MK</button>
            <button type="button" class="btn-s tap" style="height:34px;font-size:12px;" onclick="adminUserAct('${esc(u.email)}','reset_daily_usage')">Reset lượt</button>
            <button type="button" class="btn-s tap" style="height:34px;font-size:12px;" onclick="adminUserAct('${esc(u.email)}','reset_devices')">Reset máy</button>
            ${u.role !== "admin" ? `<button type="button" class="btn-danger tap" style="height:34px;font-size:12px;" onclick="adminUserAct('${esc(u.email)}','${u.banned?"unban":"ban"}')">${u.banned?"Mở khóa":"Khóa"}</button>` : ""}
          </div>
        </div>`).join("")}`;
      return;
    }

    // 3. Delegate remaining tabs to existing v3.6 Admin renderer
    if (typeof _origRenderAdminV50 === "function") _origRenderAdminV50();

    // 4. Enhance Overview tab with Setup Health Checklist & Revenue KPI
    if (S.adminTab === "overview") {
      const h = d.setupHealth || {};
      const orders = d.orders || [];
      const paidRev = orders.filter(o => o.status === "paid").reduce((a, o) => a + Number(o.amount_vnd || 0), 0);
      const pendingOrd = orders.filter(o => o.status === "pending").length;
      const topHtml = `<div style="font-size:12.5px;font-weight:600;color:var(--ink-2);margin-bottom:6px;">Sức khỏe cấu hình hệ thống (v5.0)</div>
        <div class="cx-health-grid">
          <div class="cx-health-item"><span class="cx-dot ${h.d1Ready ? "ok" : "warn"}"></span><span>Cloudflare D1: <b>Sẵn sàng</b></span></div>
          <div class="cx-health-item" style="cursor:pointer;" onclick="setAdminTab('api')"><span class="cx-dot ${(h.fostaKeysCount || 0) > 0 ? "ok" : "warn"}"></span><span>Fosta API: <b>${h.fostaKeysCount || 0} Key</b></span></div>
          <div class="cx-health-item" style="cursor:pointer;" onclick="setAdminTab('billing')"><span class="cx-dot ${h.googleOAuthReady ? "ok" : "warn"}"></span><span>Google OAuth: <b>${h.googleOAuthReady ? "Đã bật" : "Chưa dán ID"}</b></span></div>
          <div class="cx-health-item" style="cursor:pointer;" onclick="setAdminTab('billing')"><span class="cx-dot ${h.vietqrBankReady && h.vietqrWebhookReady ? "ok" : "warn"}"></span><span>VietQR Auto: <b>${h.vietqrWebhookReady ? "Tự động" : (h.vietqrBankReady ? "Duyệt tay" : "Chưa cài")}</b></span></div>
        </div>
        <div class="kpi-grid" style="grid-template-columns:repeat(2,minmax(0,1fr));">
          <div class="kpi-card" style="cursor:pointer;" onclick="setAdminTab('billing')"><div class="kpi-lbl">Doanh thu VietQR đã duyệt</div><div class="kpi-val num" style="color:var(--ok-ink);">${fmtVnd(paidRev)}</div></div>
          <div class="kpi-card" style="cursor:pointer;" onclick="setAdminTab('billing')"><div class="kpi-lbl">Đơn VietQR đang chờ</div><div class="kpi-val num" style="color:${pendingOrd ? "var(--warn-ink)" : "var(--ink)"};">${pendingOrd} đơn</div></div>
        </div>`;
      box.innerHTML = topHtml + box.innerHTML;
    }
  };

  window.adminSaveBillingAndGoogle = async function () {
    const sel = document.getElementById("ab-bank");
    const billing_config = {
      bank_id: sel?.value || "MB",
      bank_name: sel?.options?.[sel.selectedIndex]?.text?.split(" (")[0] || "MBBank",
      account_no: document.getElementById("ab-acc")?.value.trim() || "",
      account_name: document.getElementById("ab-name")?.value.trim().toUpperCase() || "",
      webhook_provider: "sepay",
      webhook_secret: document.getElementById("ab-sec")?.value.trim() || "",
      prices_vnd: {
        classic: Number(document.getElementById("ab-p-c")?.value || 19000),
        pro: Number(document.getElementById("ab-p-p")?.value || 49000),
        pro_max: Number(document.getElementById("ab-p-pm")?.value || 99000),
        ultra: Number(document.getElementById("ab-p-u")?.value || 169000)
      },
      discounts: {
        m3: Number(document.getElementById("ab-d3")?.value || 15),
        m12: Number(document.getElementById("ab-d12")?.value || 30)
      }
    };
    const google_oauth = { enabled: true, client_id: document.getElementById("ab-gid")?.value.trim() || "" };
    const trial_config = {
      enabled: document.getElementById("ab-tr-on")?.classList.contains("on"),
      days: Number(document.getElementById("ab-tr-days")?.value || 14),
      daily_tokens: Number(document.getElementById("ab-tr-toks")?.value || 60000)
    };
    const r = await apiFetch("/admin/config/save", { method: "POST", body: { billing_config, google_oauth, trial_config } });
    if (r.ok) { haptic("ok"); showToast("Đã lưu cấu hình VietQR, Google & Trial!", "ok"); loadAdminData(); loadPublicAuthConfig(); }
    else showToast("Lỗi lưu cấu hình", "err");
  };

  window.adminOrderAct = async function (orderCode, action) {
    const r = await apiFetch("/admin/orders/action", { method: "POST", body: { orderCode, action } });
    if (r.ok) { haptic("ok"); showToast(action === "approve" ? `Đã duyệt đơn ${orderCode}!` : `Đã hủy đơn ${orderCode}`, "ok"); loadAdminData(); }
  };

  window.adminTopupUserWalletModal = function (email, curBal) {
    openModal(`<h3 style="font-size:16.5px;font-weight:600;margin-bottom:4px;">Cộng Số dư Ví VNĐ</h3>
      <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:10px;">Tài khoản: <b>${esc(email)}</b> · Hiện có: <b>${fmtVnd(curBal)}</b></p>
      <input id="aw-amt" type="number" class="field num" value="100000" min="1000" step="10000" />
      <label class="f-lbl">Ghi chú</label><input id="aw-note" class="field" value="Admin cộng tiền ví" />
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
        <button type="button" class="btn-s tap" onclick="closeModal()">Hủy</button>
        <button type="button" class="btn-p tap" onclick="commitAdminWalletTopup('${esc(email)}')">Cộng ngay</button>
      </div>`);
  };
  window.commitAdminWalletTopup = async function (email) {
    const amount = Number(document.getElementById("aw-amt")?.value || 0);
    const note = document.getElementById("aw-note")?.value.trim() || "Admin cộng tiền ví";
    const r = await apiFetch("/admin/users/wallet", { method: "POST", body: { email, amount, note } });
    if (r.ok) { closeModal(); haptic("ok"); showToast(`Đã cộng ${fmtVnd(amount)} vào ví ${email}`, "ok"); loadAdminData(); }
  };

  /* =========================================================================
     10. REGISTER ALL VIEW RENDERERS + CLOUD SYNC + BOOT INITIALIZATION
     ========================================================================= */
  window.VIEW_RENDERERS = window.VIEW_RENDERERS || {};
  Object.assign(window.VIEW_RENDERERS, {
    tasks: () => window.renderTasksPage(),
    resources: () => window.renderResourcesPage(V50.resTab),
    agents: () => window.renderAgentsHubPage(V50.agentsTab),
    studio: () => window.renderStudioPage(V50.studioTab),
    connectors: () => window.renderConnectorsPage(V50.connTab),
    settings: () => window.renderCentrixSettingsPage(),
    profile: () => window.renderProfilePage(),
    pricing: () => window.renderPricingPage(),
    usage: () => window.renderUsagePage(),
    customize: () => renderSkillsPage(),
    library: () => renderLibrary(),
    import: () => renderMemoriesPage(),
    teams: () => renderTeamsPage(),
    tutors: () => renderTutorsPage(),
    mcp: () => renderMcpPage()
  });

  // Inject user Profile Interests into AI System Prompt
  const _origBuildSysV50 = window.buildSystemPrompt;
  window.buildSystemPrompt = function (chat, query, hasImgs, handoffSummary = "", digestedRepoText = "", tutorExtraSys = "") {
    let out = _origBuildSysV50(chat, query, hasImgs, handoffSummary, digestedRepoText, tutorExtraSys);
    const ints = S.user?.interests;
    if (Array.isArray(ints) && ints.length) {
      out += `\n\nHỒ SƠ LĨNH VỰC QUAN TÂM CỦA NGƯỜI DÙNG: ${ints.join(", ")}. Hãy ưu tiên lấy ví dụ và góc nhìn phù hợp với các lĩnh vực này khi có thể.`;
    }
    return out;
  };

  const _origSyncAccV50 = window.syncAccountUI;
  window.syncAccountUI = function () {
    if (typeof _origSyncAccV50 === "function") _origSyncAccV50();
    updateQuotaRingAndGreeting();
  };

  const _origPullV50 = window.pullCloudData;
  window.pullCloudData = async function () {
    if (typeof _origPullV50 === "function") await _origPullV50();
    if (!navigator.onLine) return;
    try {
      const [rt, rr, rc] = await Promise.all([apiFetch("/sync/tasks"), apiFetch("/sync/resources"), apiFetch("/sync/connectors")]);
      if (rt.ok) for (const it of ((await rt.json()).items || [])) await dbPut("tasks", it);
      if (rr.ok) for (const it of ((await rr.json()).items || [])) await dbPut("resources", it);
      if (rc.ok) for (const it of ((await rc.json()).items || [])) await dbPut("connectors", it);
      S.tasks = await dbAll("tasks").catch(() => []);
      S.connectors = await dbAll("connectors").catch(() => []);
      const pendingCnt = (S.tasks || []).filter(t => t.status !== "done").length;
      const sbCnt = document.getElementById("sb-tasks-cnt");
      if (sbCnt) { sbCnt.style.display = pendingCnt ? "inline-block" : "none"; sbCnt.textContent = String(pendingCnt); }
    } catch {}
  };

  // Clean boot alignment
  setTimeout(() => {
    window.applyTheme();
    loadPublicAuthConfig();
    updateQuotaRingAndGreeting();
    window.renderModelDropdown();
    if (typeof setWorkMode === "function") setWorkMode(S.cfg?.workMode || "chat", false);
  }, 350);
})();
