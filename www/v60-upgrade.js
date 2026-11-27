/* ============================================================================
   API AI v6.0 UPGRADE ENGINE (Web PWA + Android APK + Cloudflare Worker v6.0)
   1. Google OAuth APK (Chrome Custom Tabs + apiai://auth Deep Link) & Web Redirect
   2. First-Time Google Password Setup + Email-Only Forgot Password + Unlink Guard + 401 Handler
   3. Pricing v6.0: Classic 0 VND, First -40%, Holiday Promo, Usage Recommender,
      Anti-Downgrade RANK + Proration + Queued Plans + 2x2 Top-Up + 15m QR Price Lock
   4. 24 Authentic Full-Color Brand Icons + Custom 96x96 Icon Upload + Auto Favicon + Composio 1-Click OAuth
   5. CentriX Composer (64x64 Thumbnails Inside Card, Long-Press Model Quick-Swap),
      Clean + Bottom Sheet (3 Tiles + 5 Rows + Tool Permission 3 Modes), Rich Inline Message Edit
   6. Anti-Amnesia 3-Tier Engine (16 Verbatim + 100% Checkpoints + Editable 5-Anchor Rolling Memory + 0ms Intra-Chat Recall)
   7. Admin Console v6.0: Holiday Promo, Resend/Brevo Email + Test Email, Composio, Global Connector Icons, Reset Links
   ============================================================================ */
(function () {
  "use strict";
  if (window.__V60_LOADED__) return;
  window.__V60_LOADED__ = true;

  const isNativeApk = () => Boolean(window.Capacitor?.isNativePlatform?.());
  const fmtVnd = n => Number(n || 0).toLocaleString("vi-VN") + " đ";

  const V60 = (window.V60 = {
    editingMsgId: null,
    editDraftText: "",
    editDraftAtts: [],
    editComposing: false,
    topupSelected: 100000,
    recLevel: 2, // 1=Basic, 2=Daily Pro, 3=Pro Max/Team, 4=Heavy Ultra
    mcpIconTarget: null, // { scope: 'connector'|'custom_mcp'|'admin_connector', id, previewId, inputId }
    modelLongPressTimer: null,
    modelLongPressed: false,
    rollingBusy: new Set(),
    sessionExpiredNotified: false
  });

  /* =========================================================================
     1. GOOGLE OAUTH FOR APK (CHROME CUSTOM TABS + DEEP LINK) & WEB + RESET TOKEN URL
     ========================================================================= */
  window.__ON_NATIVE_GOOGLE_AUTH__ = async function (token, isNew = false) {
    if (!token) return;
    S.cfg.token = token;
    await dbPut("kv", S.cfg).catch(() => {});
    document.getElementById("web-landing")?.classList.remove("open");
    await refreshSession();
    haptic("ok");
    showToast(isNew ? "Chào mừng bạn! Đã đăng nhập Google thành công" : "Đã đăng nhập bằng Google", "ok");
  };

  // Capture ?reset_token or ?auth_token IMMEDIATELY at script load (never lost to boot race!)
  const _initParams = (() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const authToken = sp.get("auth_token") || "";
      const isNew = sp.get("isNew") === "1";
      const resetToken = sp.get("reset_token") || "";
      const resetEmail = sp.get("email") || "";
      if (resetToken) window.__SKIP_WEB_LANDING__ = true;
      return { authToken, isNew, resetToken, resetEmail };
    } catch { return { authToken: "", isNew: false, resetToken: "", resetEmail: "" }; }
  })();

  window.triggerGoogleSignIn = async function () {
    haptic("tap");
    let authCfg = window.V50?.publicAuthCfg || {};
    if (!(authCfg.googleClientId || "").trim()) {
      showToast("Đang kết nối dịch vụ đăng nhập Google...");
      try {
        if (typeof window.loadPublicAuthConfig === "function") await window.loadPublicAuthConfig();
        else {
          const r = await apiFetch("/public/auth-config", { auth: false });
          if (r.ok && window.V50) window.V50.publicAuthCfg = await r.json();
        }
      } catch {}
      authCfg = window.V50?.publicAuthCfg || {};
    }

    const cid = (authCfg.googleClientId || "").trim();
    const base = getApiBase();
    if (!cid) {
      showToast("Đăng nhập bằng Google hiện đang tạm bảo trì. Bạn vui lòng đăng nhập bằng Email và Mật khẩu.", "warn");
      return;
    }

    // Native Android APK: Chrome Custom Tabs -> /auth/google/start -> apiai://auth Deep Link
    if (isNativeApk()) {
      if (!authCfg.googleRedirectReady) {
        showToast("Đăng nhập Google trên ứng dụng đang được hoàn thiện. Bạn hãy đăng nhập bằng Email/Mật khẩu nhé.", "warn");
        return;
      }
      const startUrl = `${base}/auth/google/start?platform=apk&deviceId=${encodeURIComponent(S.cfg.deviceId || "dev-apk")}`;
      const nat = window.Capacitor?.Plugins?.ApiAiBackground;
      if (nat && typeof nat.openExternalAuth === "function") {
        nat.openExternalAuth({ url: startUrl }).catch(() => { window.open(startUrl, "_system"); });
      } else {
        window.open(startUrl, "_blank");
      }
      showToast("Đang mở trình duyệt chọn tài khoản Google...");
      return;
    }

    // Web: Prefer server redirect when configured; fallback to Google Identity popup
    if (authCfg.googleRedirectReady && base) {
      const origin = encodeURIComponent(window.location.origin);
      window.location.href = `${base}/auth/google/start?platform=web&deviceId=${encodeURIComponent(S.cfg.deviceId || "dev-web")}&origin=${origin}`;
      return;
    }
    if (window.google?.accounts?.id) {
      try { window.google.accounts.id.prompt(); } catch {}
    } else {
      showToast("Đang tải dịch vụ Google, vui lòng thử lại sau 2 giây.", "warn");
    }
  };

  function handleStartupUrlParams() {
    try {
      if (_initParams.authToken) {
        history.replaceState({}, document.title, window.location.pathname);
        window.__ON_NATIVE_GOOGLE_AUTH__(_initParams.authToken, _initParams.isNew);
        _initParams.authToken = "";
        return;
      }
      if (_initParams.resetToken) {
        history.replaceState({}, document.title, window.location.pathname);
        window.v60OpenResetGate(_initParams.resetToken, _initParams.resetEmail);
        _initParams.resetToken = "";
      }
    } catch {}
  }

  window.v60OpenResetGate = function (token, email = "") {
    window.__RESET_TOKEN_V60__ = token;
    document.getElementById("web-landing")?.classList.remove("open");
    const sub = document.getElementById("rp-gate-sub");
    if (sub) sub.innerHTML = `Nhập mật khẩu mới cho tài khoản <b>${esc(email || "API AI")}</b>.`;
    document.getElementById("reset-pwd-gate")?.classList.add("open");
    setTimeout(() => document.getElementById("rpg-n1")?.focus(), 80);
  };

  window.v60CloseResetGate = function () {
    document.getElementById("reset-pwd-gate")?.classList.remove("open");
    showAuthGate(true);
  };

  window.v60CommitResetGate = async function () {
    const newPassword = document.getElementById("rpg-n1")?.value || "";
    const confirmPassword = document.getElementById("rpg-n2")?.value || "";
    if (newPassword.length < 6) return showToast("Mật khẩu mới tối thiểu 6 ký tự", "warn");
    if (newPassword !== confirmPassword) return showToast("Nhập lại mật khẩu không khớp", "warn");
    const btn = document.getElementById("btn-rpg-save");
    if (btn) { btn.disabled = true; btn.textContent = "Đang lưu..."; }
    try {
      const r = await apiFetch("/auth/reset-password-confirm", {
        method: "POST", auth: false,
        body: { token: window.__RESET_TOKEN_V60__, newPassword, confirmPassword }
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Đặt lại mật khẩu thất bại");
      document.getElementById("reset-pwd-gate")?.classList.remove("open");
      haptic("ok");
      showToast(d.message || "Đã đặt lại mật khẩu thành công!", "ok");
      showAuthGate(true);
      setTimeout(() => {
        setAuthTab("login");
        const em = document.getElementById("lg-email");
        if (em && d.email) em.value = d.email;
      }, 60);
    } catch (e) {
      haptic("err"); showToast(e.message, "err");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Lưu mật khẩu mới"; }
    }
  };

  /* =========================================================================
     2. PASSWORD FLOWS (GOOGLE FIRST-TIME SETUP + EMAIL-ONLY FORGOT + UNLINK GUARD + 401 HANDLER)
     ========================================================================= */
  window.v60HandleSessionExpired = function () {
    if (V60.sessionExpiredNotified) return;
    V60.sessionExpiredNotified = true;
    S.cfg.token = "";
    S.user = null;
    dbPut("kv", S.cfg).catch(() => {});
    try { closeModal(); closeToolsSheet(); closeSettingsSheet(); toggleSidebar(false); } catch {}
    showKeyGate(false);
    showForcePwdGate(false);
    showAuthGate(true);
    showToast("Phiên đăng nhập đã hết hạn hoặc mật khẩu vừa thay đổi từ máy khác. Hãy đăng nhập lại.", "warn");
    setTimeout(() => { V60.sessionExpiredNotified = false; }, 3500);
  };

  // Override openSelfChangePasswordModal: Hide "Mật khẩu hiện tại" for Google accounts without a password!
  window.openSelfChangePasswordModal = function () {
    haptic("tap");
    const hasPwd = Boolean(S.user?.hasPassword);
    openModal(`
      <h3 style="font-size:17px;font-weight:600;margin-bottom:6px;">${hasPwd ? "Đổi mật khẩu" : "Thiết lập mật khẩu lần đầu"}</h3>
      <p style="font-size:13px;color:var(--ink-2);margin-bottom:10px;">${hasPwd
        ? `Cập nhật mật khẩu mới cho tài khoản <b>${esc(S.user?.email || "")}</b>.`
        : `Tài khoản Google <b>${esc(S.user?.email || "")}</b> chưa có mật khẩu. Tạo mật khẩu mới để có thể đăng nhập bằng Email bất cứ lúc nào.`}</p>
      ${hasPwd ? `<label class="f-lbl">Mật khẩu hiện tại</label><input id="sc-cur" type="password" class="field" placeholder="Nhập mật khẩu hiện tại" autocomplete="current-password" />` : ""}
      <label class="f-lbl">Mật khẩu mới (tối thiểu 6 ký tự)</label>
      <input id="sc-n1" type="password" class="field" placeholder="Nhập mật khẩu mới" autocomplete="new-password" />
      <label class="f-lbl">Nhập lại mật khẩu mới</label>
      <input id="sc-n2" type="password" class="field" placeholder="Nhập lại mật khẩu mới" autocomplete="new-password" />
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
        <button type="button" class="btn-s tap" onclick="closeModal()">Hủy</button>
        <button type="button" class="btn-p tap" onclick="submitSelfPasswordChange()">${hasPwd ? "Đổi mật khẩu" : "Lưu mật khẩu mới"}</button>
      </div>`);
  };

  window.submitSelfPasswordChange = async function () {
    const hasPwd = Boolean(S.user?.hasPassword);
    const currentPassword = hasPwd ? (document.getElementById("sc-cur")?.value || "") : "";
    const newPassword = document.getElementById("sc-n1")?.value || "";
    const confirmPassword = document.getElementById("sc-n2")?.value || "";
    if (hasPwd && !currentPassword) return showToast("Nhập mật khẩu hiện tại", "warn");
    if (newPassword.length < 6) return showToast("Mật khẩu mới tối thiểu 6 ký tự", "warn");
    if (newPassword !== confirmPassword) return showToast("Nhập lại mật khẩu mới không khớp", "warn");
    try {
      const r = await apiFetch("/auth/change-password", { method: "POST", body: { currentPassword, newPassword, confirmPassword } });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Lưu mật khẩu thất bại");
      S.cfg.token = data.token;
      if (data.user) S.user = { ...S.user, ...data.user, hasPassword: true };
      await dbPut("kv", S.cfg);
      closeModal();
      haptic("ok");
      showToast(hasPwd ? "Đã đổi mật khẩu thành công" : "Đã thiết lập mật khẩu lần đầu thành công", "ok");
      if (document.body.dataset.view === "profile" && typeof window.renderProfilePage === "function") window.renderProfilePage();
    } catch (e) { haptic("err"); showToast(e.message, "err"); }
  };

  // Override openForgotModal: Email-only! Zero License Key required!
  window.openForgotModal = function () {
    openModal(`
      <h3 style="font-size:18px;font-weight:600;margin-bottom:6px;">Quên mật khẩu</h3>
      <p style="font-size:13px;color:var(--ink-2);margin-bottom:12px;">Nhập Email đã đăng ký (kể cả tài khoản Google muốn tạo mật khẩu). Hệ thống sẽ gửi liên kết đặt lại mật khẩu có hiệu lực 15 phút.</p>
      <label class="f-lbl" for="fg-email">Email đã đăng ký</label>
      <input id="fg-email" type="email" class="field" placeholder="name@gmail.com" autocomplete="email" />
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">
        <button type="button" class="btn-s tap" onclick="closeModal()">Hủy</button>
        <button type="button" id="btn-fg-send" class="btn-p tap" onclick="submitForgotPassword()">Gửi liên kết đặt lại</button>
      </div>`);
  };

  window.submitForgotPassword = async function () {
    const email = (document.getElementById("fg-email")?.value || "").trim();
    if (!email || !email.includes("@")) return showToast("Nhập Email hợp lệ", "warn");
    const btn = document.getElementById("btn-fg-send");
    if (btn) { btn.disabled = true; btn.textContent = "Đang gửi..."; }
    try {
      const webOrigin = isNativeApk() ? "" : window.location.origin;
      const r = await apiFetch("/auth/forgot-password", { method: "POST", auth: false, body: { email, webOrigin } });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Không gửi được yêu cầu");
      haptic("ok");
      if (data.emailed) {
        window.__OTP_RESET_EMAIL__ = email;
        openModal(`<h3 style="font-size:17.5px;font-weight:600;margin-bottom:6px;">Kiểm tra Email của bạn</h3>
          <p style="font-size:13px;color:var(--ink-2);line-height:1.5;margin-bottom:10px;">${esc(data.message)}</p>
          <div style="padding:10px 12px;border-radius:14px;background:var(--surface-0);border:1px solid var(--rim);margin-bottom:8px;">
            <div style="font-size:12px;color:var(--accent-ink);font-weight:600;margin-bottom:6px;">Hoặc nhập nhanh mã 6 số từ email ngay tại đây:</div>
            <label class="f-lbl" style="margin-top:0;">Mã xác nhận 6 số</label>
            <input id="otp-code-in" type="text" inputmode="numeric" maxlength="6" class="field num" style="text-align:center;letter-spacing:4px;font-weight:700;" placeholder="123456" />
            <label class="f-lbl">Mật khẩu mới (≥ 6 ký tự)</label>
            <input id="otp-n1" type="password" class="field" placeholder="Nhập mật khẩu mới" autocomplete="new-password" />
            <label class="f-lbl">Nhập lại mật khẩu mới</label>
            <input id="otp-n2" type="password" class="field" placeholder="Nhập lại mật khẩu mới" autocomplete="new-password" />
          </div>
          <div style="display:flex;gap:8px;margin-top:10px;">
            <button type="button" class="btn-s tap" onclick="closeModal()">Đóng</button>
            <button type="button" id="btn-otp-confirm" class="btn-p tap" style="flex:1;" onclick="v60SubmitOtpReset()">Đổi mật khẩu ngay</button>
          </div>`);
      } else {
        openModal(`<div style="text-align:center;padding:6px 0;">
          <h3 style="font-size:18px;font-weight:600;margin-bottom:8px;">Đã tiếp nhận yêu cầu</h3>
          <p style="font-size:14px;color:var(--info-ink);line-height:1.55;">${esc(data.message)}</p>
          <button type="button" class="btn-p tap" style="width:100%;margin-top:16px;" onclick="closeModal()">Đã hiểu</button></div>`);
      }
    } catch (e) {
      haptic("err"); showToast(e.message, "err");
      if (btn) { btn.disabled = false; btn.textContent = "Gửi liên kết đặt lại"; }
    }
  };

  window.v60SubmitOtpReset = async function () {
    const otpCode = (document.getElementById("otp-code-in")?.value || "").trim();
    const newPassword = document.getElementById("otp-n1")?.value || "";
    const confirmPassword = document.getElementById("otp-n2")?.value || "";
    if (!/^\d{6}$/.test(otpCode)) return showToast("Nhập đúng mã xác nhận gồm 6 chữ số trong email", "warn");
    if (newPassword.length < 6) return showToast("Mật khẩu mới tối thiểu 6 ký tự", "warn");
    if (newPassword !== confirmPassword) return showToast("Nhập lại mật khẩu không khớp", "warn");
    const btn = document.getElementById("btn-otp-confirm");
    if (btn) { btn.disabled = true; btn.textContent = "Đang xác nhận..."; }
    try {
      const r = await apiFetch("/auth/reset-password-confirm", {
        method: "POST", auth: false,
        body: { email: window.__OTP_RESET_EMAIL__ || "", otpCode, newPassword, confirmPassword }
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Mã xác nhận không đúng hoặc đã hết hạn");
      closeModal(); haptic("ok");
      showToast(d.message || "Đã đổi mật khẩu thành công!", "ok");
      showAuthGate(true);
      setTimeout(() => {
        setAuthTab("login");
        const em = document.getElementById("lg-email");
        if (em && d.email) em.value = d.email;
      }, 60);
    } catch (e) {
      haptic("err"); showToast(e.message, "err");
      if (btn) { btn.disabled = false; btn.textContent = "Đổi mật khẩu ngay"; }
    }
  };

  window.openResetPasswordConfirmModal = function (token, email = "") {
    window.__RESET_TOKEN_V60__ = token;
    openModal(`
      <h3 style="font-size:18px;font-weight:600;margin-bottom:6px;">Tạo mật khẩu mới</h3>
      <p style="font-size:13px;color:var(--ink-2);margin-bottom:10px;">Đặt mật khẩu mới cho tài khoản <b>${esc(email || "API AI")}</b>.</p>
      <label class="f-lbl">Mật khẩu mới (tối thiểu 6 ký tự)</label>
      <input id="rp-n1" type="password" class="field" placeholder="Nhập mật khẩu mới" autocomplete="new-password" />
      <label class="f-lbl">Nhập lại mật khẩu mới</label>
      <input id="rp-n2" type="password" class="field" placeholder="Nhập lại mật khẩu mới" autocomplete="new-password" />
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
        <button type="button" class="btn-s tap" onclick="closeModal()">Hủy</button>
        <button type="button" class="btn-p tap" onclick="commitResetPasswordConfirm()">Lưu mật khẩu</button>
      </div>`);
  };

  window.commitResetPasswordConfirm = async function () {
    const newPassword = document.getElementById("rp-n1")?.value || "";
    const confirmPassword = document.getElementById("rp-n2")?.value || "";
    if (newPassword.length < 6) return showToast("Mật khẩu mới tối thiểu 6 ký tự", "warn");
    if (newPassword !== confirmPassword) return showToast("Nhập lại mật khẩu không khớp", "warn");
    try {
      const r = await apiFetch("/auth/reset-password-confirm", {
        method: "POST", auth: false,
        body: { token: window.__RESET_TOKEN_V60__, newPassword, confirmPassword }
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Đặt lại mật khẩu thất bại");
      closeModal(); haptic("ok");
      showToast(d.message || "Đã đặt lại mật khẩu thành công!", "ok");
      showAuthGate(true);
      setTimeout(() => {
        setAuthTab("login");
        const em = document.getElementById("lg-email");
        if (em && d.email) em.value = d.email;
      }, 60);
    } catch (e) { haptic("err"); showToast(e.message, "err"); }
  };

  // Enhance Profile Page with Unlink Google protection (cannot unlink last login method!)
  const _origRenderProfileV60 = window.renderProfilePage;
  window.renderProfilePage = function () {
    if (typeof _origRenderProfileV60 === "function") _origRenderProfileV60();
    const box = document.getElementById("profile-page-body");
    const u = S.user || {};
    if (!box || !u.googleConnected) return;
    const rows = box.querySelectorAll(".cx-group-card .cx-row");
    const gRow = rows[rows.length - 1];
    if (gRow && gRow.textContent.includes("Google OAuth")) {
      const guardBtn = u.hasPassword
        ? `<button type="button" class="btn-danger tap" style="height:30px;padding:0 11px;font-size:11.5px;" onclick="v60UnlinkGoogle()">Gỡ liên kết</button>`
        : `<button type="button" class="btn-s tap" style="height:30px;padding:0 11px;font-size:11.5px;opacity:0.65;" onclick="showToast('Hãy thiết lập mật khẩu trước khi gỡ liên kết Google','warn')">Khóa gỡ</button>`;
      gRow.innerHTML = `<span class="cx-row-l"><span>Google OAuth</span></span><span style="display:inline-flex;align-items:center;gap:6px;"><span class="tag-st st-active">Đã kết nối</span>${guardBtn}</span>`;
    }
  };

  window.v60UnlinkGoogle = async function () {
    try {
      const r = await apiFetch("/auth/unlink-google", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Không gỡ được Google");
      if (d.user) S.user = { ...S.user, ...d.user };
      renderProfilePage(); haptic("ok"); showToast("Đã gỡ liên kết Google", "ok");
    } catch (e) { haptic("err"); showToast(e.message, "err"); }
  };

  /* =========================================================================
     3. PRICING v6.0 (2B+ & 5B+): CLASSIC 0 VND, FIRST -40%, HOLIDAY BANNER,
        ANTI-DOWNGRADE RANK + PRORATION + QUEUED PLANS + USAGE RECOMMENDER + 2x2 TOP-UP
     ========================================================================= */
  window.v60SetRecLevel = function (lv) {
    V60.recLevel = Number(lv) || 2;
    const map = { 1: "classic", 2: "pro", 3: "pro_max", 4: "ultra" };
    if (window.V50) window.V50.pricingTier = map[V60.recLevel] || "pro";
    haptic("tap");
    window.paintPricingPage();
  };

  window.v60ClaimFreeClassic = async function () {
    haptic("tap");
    try {
      const r = await apiFetch("/billing/claim-free-classic", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Không nhận được gói miễn phí");
      if (d.user) S.user = d.user;
      if (Array.isArray(d.models)) S.models = d.models;
      syncAccountUI(); renderModelDropdown();
      haptic("ok");
      showToast("Đã kích hoạt Classic 1 tháng miễn phí (0₫)!", "ok");
      window.renderPricingPage();
    } catch (e) { haptic("err"); showToast(e.message, "err"); }
  };

  window.v60CreatePlanQrOrder = function (tier, months, queueAfterExpiry = false) {
    showToast("Đang tạo mã chuyển khoản VietQR (khóa giá ưu đãi 15 phút)...");
    apiFetch("/billing/order/create", { method: "POST", body: { orderType: "plan", tier, months, queueAfterExpiry } })
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Không tạo được đơn VietQR");
        window.openVietQrPaymentModal(d.order, d.qrUrl, d.bank, d.autoWebhookReady);
      })
      .catch(e => { haptic("err"); showToast(e.message, "err"); });
  };

  window.v60PayPlanWallet = async function (tier, months, queueAfterExpiry = false, sandbox = false) {
    try {
      const r = await apiFetch("/billing/pay-with-wallet", { method: "POST", body: { tier, months, queueAfterExpiry, sandbox } });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Thanh toán bằng ví thất bại");
      if (d.user) S.user = d.user;
      if (Array.isArray(d.models)) S.models = d.models;
      syncAccountUI(); renderModelDropdown();
      haptic("ok");
      showToast(d.message || (d.queued ? "Đã đặt trước gói nối tiếp sau khi gói hiện tại hết hạn!" : "Thanh toán thành công bằng Số dư ví!"), "ok");
      window.renderPricingPage();
    } catch (e) { haptic("err"); showToast(e.message, "err"); }
  };

  // Enhance QR modal with 15-minute promo price lock badge
  const _origOpenQrV60 = window.openVietQrPaymentModal;
  window.openVietQrPaymentModal = function (order, qrUrl, bank, autoReady) {
    if (typeof _origOpenQrV60 === "function") _origOpenQrV60(order, qrUrl, bank, autoReady);
    const stBar = document.getElementById("v50-qr-status-bar");
    if (stBar && order) {
      const lockTime = order.price_locked_until ? new Date(order.price_locked_until).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "";
      const extraLines = [
        order.promo_note ? `Ưu đãi áp dụng: <b>${esc(order.promo_note)}</b>` : "",
        order.proration_credit_vnd > 0 ? `Khấu trừ gói cũ còn dư: <b>-${fmtVnd(order.proration_credit_vnd)}</b>` : "",
        lockTime ? `Giá ưu đãi được khóa cứng đến <b>${lockTime}</b> (15 phút)` : ""
      ].filter(Boolean).join("<br/>");
      if (extraLines) {
        const div = document.createElement("div");
        div.style.cssText = "font-size:11.5px;color:var(--ok-ink);margin-top:6px;line-height:1.45;";
        div.innerHTML = extraLines;
        stBar.querySelector("div")?.appendChild(div);
      }
    }
  };

  window.paintPricingPage = function () {
    const box = document.getElementById("pricing-page-body");
    if (!box) return;
    const bd = window.V50?.billingData || {};
    const plans = bd.plans || [
      { id: "classic", label: "Classic", rank: 1, price1m: 19000, price3m: 48000, price12m: 160000, dailyMsgs: 25, dailyTokens: 35000, maxDevices: 1, models: ["GPT 6 Luna"] },
      { id: "pro", label: "Pro", rank: 2, price1m: 49000, price3m: 125000, price12m: 412000, dailyMsgs: 180, dailyTokens: 350000, maxDevices: 2, models: ["GPT 6 Luna", "GPT 6.2 Sol", "GPT 6.2 Astra"] },
      { id: "pro_max", label: "Pro Max", rank: 3, price1m: 99000, price3m: 252000, price12m: 832000, dailyMsgs: 500, dailyTokens: 1200000, maxDevices: 3, allowTeams: true, allowGithub: true, models: ["Full GPT", "Sonnet 5", "Opus 5.5"] },
      { id: "ultra", label: "Ultra", rank: 4, price1m: 169000, price3m: 431000, price12m: 1420000, dailyMsgs: -1, dailyTokens: 5000000, maxDevices: 5, allowTeams: true, allowGithub: true, models: ["Tất cả Model + Fable 5.1"] }
    ];
    const p = plans.find(x => x.id === V50.pricingTier) || plans[1];
    const m = V50.pricingMonths || 1;
    const fallbackBase = m === 12 ? p.price12m : (m === 3 ? p.price3m : p.price1m);
    const q = p.quotes?.[m] || {
      basePriceVnd: fallbackBase, finalPriceVnd: fallbackBase, savingsVnd: 0, discountPct: 0,
      discountLabel: "", prorationCreditVnd: 0, actionType: "buy", currentTier: "none", remainingDays: 0
    };
    const powerLvl = { classic: 1, pro: 2, pro_max: 3, ultra: 4 }[p.id] || 2;
    const disc = bd.discounts || { m3: 15, m12: 30 };
    const hol = bd.holidayPromo || window.V50?.publicAuthCfg?.holidayPromo;
    const u = S.user || {};
    const walletVnd = bd.walletBalanceVnd ?? u.walletBalanceVnd ?? 0;
    const queuedPlans = bd.queuedPlans || [];

    const holDaysLeft = hol?.endAt > Date.now() ? Math.max(1, Math.ceil((hol.endAt - Date.now()) / 86400000)) : 0;
    const holBanner = hol ? `<div class="v60-promo-banner">
      <div style="min-width:0;flex:1;">
        <strong style="font-size:13.5px;color:var(--warn-ink);">${esc(hol.name)}</strong>
        <div style="font-size:12px;color:var(--ink-2);margin-top:2px;">Giảm <b>${hol.discountPercent}%</b> gói dịch vụ${hol.topupBonusPct ? ` · Thưởng <b>+${hol.topupBonusPct}%</b> khi nạp Ví` : ""}</div>
      </div>
      ${holDaysLeft ? `<span class="tag-st st-pending num">Còn ${holDaysLeft} ngày</span>` : ""}
    </div>` : "";

    const fmtTokShort = n => {
      const num = Number(n || 0);
      if (num >= 1000000) return (num / 1000000).toFixed(num % 1000000 === 0 ? 0 : 1) + "M";
      if (num >= 1000) return Math.round(num / 1000) + "K";
      return String(num);
    };
    const byId = Object.fromEntries(plans.map(x => [x.id, x]));
    const recLabels = {
      1: { name: `Nhẹ nhàng (${byId.classic?.dailyMsgs < 0 ? "Vô hạn" : (byId.classic?.dailyMsgs ?? 25)} tin · ${fmtTokShort(byId.classic?.dailyTokens ?? 35000)} tok/ngày)`, tier: byId.classic?.label || "Classic", note: `Học tập cơ bản, hỏi đáp nhanh (${(byId.classic?.models || ["GPT 6 Luna"]).slice(0, 2).join(", ")}).` },
      2: { name: `Làm việc đều (${byId.pro?.dailyMsgs < 0 ? "Vô hạn" : (byId.pro?.dailyMsgs ?? 180)} tin · ${fmtTokShort(byId.pro?.dailyTokens ?? 350000)} tok/ngày)`, tier: byId.pro?.label || "Pro", note: `Lập trình, giải bài${byId.pro?.allowOffice !== false ? ", Office Studio" : ""}${byId.pro?.allowImage !== false ? " & Tạo ảnh HD" : ""}.` },
      3: { name: `Chuyên sâu (${byId.pro_max?.dailyMsgs < 0 ? "Vô hạn" : (byId.pro_max?.dailyMsgs ?? 500)} tin · ${fmtTokShort(byId.pro_max?.dailyTokens ?? 1200000)} tok/ngày)`, tier: byId.pro_max?.label || "Pro Max", note: `Mở khóa Đội Tác nhân, Gia sư AI${byId.pro_max?.allowGithub ? ", GitHub Repo" : ""} & ${(byId.pro_max?.models || []).slice(-2).join(", ")}.` },
      4: { name: `Cường độ cao (${byId.ultra?.dailyMsgs < 0 ? "Vô hạn" : (byId.ultra?.dailyMsgs ?? 2000)} tin · ${fmtTokShort(byId.ultra?.dailyTokens ?? 5000000)} tok/ngày)`, tier: byId.ultra?.label || "Ultra", note: `Dung lượng tối đa trên ${byId.ultra?.maxDevices ?? 5} thiết bị, mở toàn bộ mô hình cao cấp nhất.` }
    };
    const curRec = recLabels[V60.recLevel] || recLabels[2];

    // Determine exact CTA block from RANK state machine (Anti-Downgrade!)
    let statusBadge = "";
    let ctaHtml = "";
    if (q.actionType === "admin_sandbox") {
      statusBadge = `<span class="tag-st st-active">Tài khoản Quản trị viên (Toàn quyền)</span>`;
      ctaHtml = `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
        <button type="button" class="btn-blue tap" style="flex:1;height:46px;" onclick="v60PayPlanWallet('${p.id}',${m},false,true)">Chế độ Test mua gói (Sandbox)</button>
        <button type="button" class="btn-s tap" style="height:46px;" onclick="v60CreatePlanQrOrder('${p.id}',${m},false)">Test tạo QR</button>
      </div>`;
    } else if (q.actionType === "claim_free") {
      statusBadge = `<span class="tag-st st-active">Ưu đãi người mới · 0₫</span>`;
      ctaHtml = `<button type="button" class="btn-p tap" style="width:100%;height:48px;font-size:15px;margin-bottom:12px;" onclick="v60ClaimFreeClassic()">Nhận Classic 1 tháng miễn phí (0₫)</button>`;
    } else if (q.actionType === "downgrade_blocked") {
      const curLbl = TIER_LABELS[q.currentTier] || q.currentTier;
      statusBadge = `<span class="tag-st st-active">Đã bao gồm trong gói ${esc(curLbl)} của bạn</span>`;
      ctaHtml = `<div class="card-item" style="margin-bottom:12px;border-color:var(--ok-rim);background:var(--ok-soft);">
        <div style="font-size:13px;color:var(--ok-ink);font-weight:500;">Bạn đang dùng gói ${esc(curLbl)} (còn ${q.remainingDays} ngày) cao hơn ${esc(p.label)}.</div>
        <div style="font-size:12px;color:var(--ink-2);margin-top:4px;">Hệ thống bảo vệ tài khoản, tuyệt đối không hạ cấp ngược gói đang chạy. Nếu muốn mua trước cho chu kỳ sau khi ${esc(curLbl)} hết hạn:</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
          <button type="button" class="btn-s tap" style="flex:1;height:38px;font-size:12.5px;" onclick="v60CreatePlanQrOrder('${p.id}',${m},true)">Đặt trước nối tiếp (VietQR)</button>
          <button type="button" class="btn-s tap" style="height:38px;font-size:12.5px;" onclick="v60PayPlanWallet('${p.id}',${m},true,false)">Đặt trước bằng Ví</button>
        </div>
      </div>`;
    } else {
      const isRenew = q.actionType === "renew";
      const isUp = q.actionType === "upgrade";
      if (isRenew) statusBadge = `<span class="tag-st st-active">Đang sử dụng · Còn ${q.remainingDays} ngày</span>`;
      else if (q.discountLabel) statusBadge = `<span class="tag-st st-pending">${esc(q.discountLabel)}</span>`;
      const btnText = isRenew
        ? `Gia hạn thêm ${p.label} (+cộng dồn ngày) · ${fmtVnd(q.finalPriceVnd)}`
        : (isUp ? `Nâng cấp lên ${p.label} · ${fmtVnd(q.finalPriceVnd)}` : `Đăng ký ${p.label} qua VietQR · ${fmtVnd(q.finalPriceVnd)}`);
      ctaHtml = `
        <button type="button" class="btn-p tap" style="width:100%;height:48px;font-size:14.5px;margin-bottom:8px;" onclick="v60CreatePlanQrOrder('${p.id}',${m},false)">${esc(btnText)}</button>
        <div style="display:flex;gap:8px;margin-bottom:14px;">
          <button type="button" class="btn-s tap" style="flex:1;" onclick="v60PayPlanWallet('${p.id}',${m},false,false)">Trả bằng Ví (${fmtVnd(walletVnd)})</button>
          <button type="button" class="btn-s tap" onclick="showKeyGate(true)">Nhập mã Key</button>
        </div>`;
    }

    const tierSub = {
      classic: "Trò chuyện hằng ngày gọn nhẹ, ổn định trên 1 thiết bị.",
      pro: "Tăng gấp 10× ngân sách token, mở khóa GPT 6.2 Sol & Astra, ảnh HD và Office.",
      pro_max: "Mở khóa Claude Sonnet 5, Opus 5.5, Đội Tác nhân Graph & Gia sư AI.",
      ultra: "Mức dung lượng cao nhất, không giới hạn lượt tin, mở toàn bộ model kể cả Fable 5.1."
    }[p.id] || "";

    box.innerHTML = `
      <div class="cx-page-head">
        <button type="button" class="cx-back-circle tap" onclick="switchView('settings')" aria-label="Quay lại"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>
        <h2 class="cx-page-title">Gói dịch vụ</h2>
        <button type="button" class="ws-chip-btn ok tap" onclick="openTopupWalletModal()">+ Nạp ví</button>
      </div>

      ${holBanner}

      <div class="v60-rec-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12.5px;">
          <span style="color:var(--ink-2);">Gợi ý theo nhu cầu dùng mỗi ngày</span>
          <strong style="color:var(--accent-ink);">Phù hợp nhất: ${esc(curRec.tier)}</strong>
        </div>
        <input type="range" class="cx-reason-slider" min="1" max="4" step="1" value="${V60.recLevel}" oninput="v60SetRecLevel(this.value)" />
        <div style="font-size:12px;color:var(--ink-2);"><b>${esc(curRec.name)}</b> — ${esc(curRec.note)}</div>
      </div>

      <div class="cx-mod-tabs" style="margin-bottom:10px;">
        ${plans.map(pl => `<button type="button" class="cx-mod-tab ${V50.pricingTier === pl.id ? "active" : ""}" onclick="v50SetPricingTier('${pl.id}')">${esc(pl.label)}</button>`).join("")}
      </div>

      <div style="display:flex;gap:6px;margin-bottom:12px;">
        ${[[1,"1 tháng",""],[3,"3 tháng",`-${disc.m3}%`],[12,"1 năm",`-${disc.m12}%`]].map(([mm, lbl, badge]) =>
          `<button type="button" class="btn-s tap ${m === mm ? "lg-active" : ""}" style="flex:1;height:36px;font-size:12px;" onclick="v50SetPricingMonths(${mm})">${lbl} ${badge ? `<b>${badge}</b>` : ""}</button>`
        ).join("")}
      </div>

      <div class="cx-tier-hero t-${esc(p.id)} v60-swap-blur">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;">
          <div style="font-size:26px;font-weight:700;letter-spacing:-0.02em;">${esc(p.label)}</div>
          ${statusBadge}
        </div>
        <div style="font-size:13px;opacity:0.9;margin-top:6px;line-height:1.45;">${esc(tierSub)}</div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:20px;gap:12px;">
          <div>
            <div style="font-size:11.5px;opacity:0.82;">Cấp năng lực</div>
            <div class="cx-power-bars">${[1,2,3,4].map(i => `<span class="cx-power-bar ${i <= powerLvl ? "on" : ""}"></span>`).join("")}</div>
          </div>
          <div style="text-align:right;">
            ${q.savingsVnd > 0 ? `<div class="v60-price-strike">${fmtVnd(q.basePriceVnd)}</div>` : ""}
            <div class="num" style="font-size:25px;font-weight:700;">${q.finalPriceVnd === 0 ? "0 đ" : fmtVnd(q.finalPriceVnd)}</div>
            <div style="font-size:11.5px;opacity:0.88;">${m === 12 ? "1 năm (365 ngày)" : `${m} tháng`}${q.savingsVnd > 0 ? ` · Tiết kiệm ${fmtVnd(q.savingsVnd)}` : ""}</div>
          </div>
        </div>
        ${q.prorationCreditVnd > 0 ? `<div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--tier-rim);font-size:12px;opacity:0.95;">Đã khấu trừ gói cũ còn dư: <b>-${fmtVnd(q.prorationCreditVnd)}</b></div>` : ""}
      </div>

      ${ctaHtml}

      <div class="cx-group-card" style="padding:12px 14px;">
        <strong style="font-size:13.5px;display:block;margin-bottom:8px;">So sánh quyền lợi 4 hạng (cập nhật trực tiếp)</strong>
        <div style="overflow-x:auto;">
          <table class="v60-compare-table">
            <thead>
              <tr>
                <th>Quyền lợi</th>
                ${plans.map(pl => `<th class="${pl.id === p.id ? "col-active" : ""}">${esc(pl.label)}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Giá 1 tháng</td>
                ${plans.map(pl => `<td class="num ${pl.id === p.id ? "col-active" : ""}">${fmtVnd(pl.price1m)}</td>`).join("")}
              </tr>
              <tr>
                <td>Token / ngày</td>
                ${plans.map(pl => `<td class="num ${pl.id === p.id ? "col-active" : ""}">${fmtTokShort(pl.dailyTokens)}</td>`).join("")}
              </tr>
              <tr>
                <td>Lượt tin / ngày</td>
                ${plans.map(pl => `<td class="num ${pl.id === p.id ? "col-active" : ""}">${Number(pl.dailyMsgs) < 0 ? "Vô hạn" : Number(pl.dailyMsgs || 0).toLocaleString("vi-VN")}</td>`).join("")}
              </tr>
              <tr>
                <td>Mô hình mở khóa</td>
                ${plans.map(pl => `<td class="${pl.id === p.id ? "col-active" : ""}" style="font-size:11.5px;line-height:1.4;">${esc((pl.models || []).join(", ") || "Cơ bản")}</td>`).join("")}
              </tr>
              <tr>
                <td>Đội Tác nhân &amp; Gia sư</td>
                ${plans.map(pl => `<td class="${pl.id === p.id ? "col-active" : ""}" style="${pl.allowTeams ? "color:var(--ok-ink);" : "color:var(--ink-3);"}">${pl.allowTeams ? "Có" : "—"}</td>`).join("")}
              </tr>
              <tr>
                <td>Office Studio &amp; Ảnh HD</td>
                ${plans.map(pl => `<td class="${pl.id === p.id ? "col-active" : ""}" style="${(pl.allowOffice || pl.allowImage) ? "color:var(--ok-ink);" : "color:var(--ink-3);"}">${pl.allowOffice && pl.allowImage ? "Đầy đủ" : (pl.allowOffice ? "Office" : (pl.allowImage ? "Tạo ảnh" : "—"))}</td>`).join("")}
              </tr>
              <tr>
                <td>Deep Research &amp; GitHub</td>
                ${plans.map(pl => `<td class="${pl.id === p.id ? "col-active" : ""}" style="${(pl.allowDeepResearch || pl.allowGithub) ? "color:var(--ok-ink);" : "color:var(--ink-3);"}">${pl.allowDeepResearch && pl.allowGithub ? "Đầy đủ" : (pl.allowDeepResearch ? "Research" : (pl.allowGithub ? "GitHub" : "—"))}</td>`).join("")}
              </tr>
              <tr>
                <td>Thiết bị tối đa</td>
                ${plans.map(pl => `<td class="num ${pl.id === p.id ? "col-active" : ""}">${Number(pl.maxDevices || 1)} máy</td>`).join("")}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      ${queuedPlans.length ? `<div class="cx-group-card" style="padding:12px 14px;">
        <strong style="font-size:13.5px;display:block;margin-bottom:4px;">Gói đặt trước nối tiếp (${queuedPlans.length})</strong>
        ${queuedPlans.map(qp => `<div style="font-size:12.5px;color:var(--ink-2);">• Gói <b>${esc(TIER_LABELS[qp.tier] || qp.tier)}</b> (${qp.months} tháng) — tự kích hoạt khi gói hiện tại hết hạn.</div>`).join("")}
      </div>` : ""}

      <div style="text-align:center;margin:10px 0 14px;">
        <button type="button" style="color:var(--accent-ink);font-size:13px;font-weight:500;" onclick="openPaymentHistoryModal()">Xem lịch sử thanh toán (${(bd.orders || []).length})</button>
      </div>

      <div class="cx-group-card" style="padding:14px;">
        <strong style="font-size:14px;display:block;margin-bottom:4px;">Trạng thái gói hiện tại</strong>
        <div style="font-size:13px;color:var(--ink-2);">${esc(u.planLabel || "Chưa kích hoạt")}${u.expiresAt ? ` · Hiệu lực đến ${new Date(u.expiresAt).toLocaleDateString("vi-VN")}` : ""} · Ví: <b class="num" style="color:var(--ok-ink);">${fmtVnd(walletVnd)}</b></div>
      </div>`;
  };

  // Attractive 2x2 Top-Up Modal (Hạng mục 3.4)
  window.v60PickTopupAmt = function (amt) {
    V60.topupSelected = Math.max(10000, Number(amt) || 100000);
    haptic("tap");
    const inp = document.getElementById("topup-amt");
    if (inp) inp.value = String(V60.topupSelected);
    document.querySelectorAll(".v60-topup-tile").forEach(el => {
      el.classList.toggle("active", Number(el.dataset.amt) === V60.topupSelected);
    });
    v60UpdateTopupPreview();
  };

  window.v60UpdateTopupPreview = function () {
    const amt = Math.max(10000, Number(document.getElementById("topup-amt")?.value || V60.topupSelected || 100000));
    V60.topupSelected = amt;
    const hol = window.V50?.billingData?.holidayPromo || window.V50?.publicAuthCfg?.holidayPromo;
    const bonusPct = hol?.topupBonusPct || 0;
    const bonus = bonusPct > 0 ? Math.floor((amt * bonusPct / 100) / 1000) * 1000 : 0;
    const total = amt + bonus;
    const recEl = document.getElementById("v60-topup-recv");
    const noteEl = document.getElementById("v60-topup-equiv");
    if (recEl) recEl.textContent = fmtVnd(total);
    if (noteEl) {
      const canBuy = total >= 169000 ? "Đủ đăng ký gói Ultra hoặc Pro Max" : (total >= 99000 ? "Đủ đăng ký gói Pro Max (1 tháng)" : (total >= 49000 ? "Đủ đăng ký gói Pro (1 tháng)" : "Đủ gia hạn Classic"));
      noteEl.textContent = bonus > 0 ? `+${fmtVnd(bonus)} thưởng lễ (${bonusPct}%) · ${canBuy}` : canBuy;
    }
  };

  window.openTopupWalletModal = function () {
    V60.topupSelected = 100000;
    const hol = window.V50?.billingData?.holidayPromo || window.V50?.publicAuthCfg?.holidayPromo;
    const tiles = [
      { amt: 50000, tag: "Cơ bản", sub: "Đủ gói Pro 1 tháng" },
      { amt: 100000, tag: "Phổ biến", sub: "Đủ gói Pro Max 1 tháng" },
      { amt: 200000, tag: "Tiết kiệm", sub: "Đủ gói Ultra 1 tháng" },
      { amt: 500000, tag: "Tốt nhất", sub: "Dùng thoải mái dài hạn" }
    ];
    openModal(`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <h3 style="font-size:17px;font-weight:600;margin:0;">Nạp tiền vào Ví</h3>
        <button type="button" class="mini-act tap" onclick="closeModal()">${ICON_X}</button>
      </div>
      <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:8px;">Chọn mệnh giá nạp nhanh hoặc nhập số tiền tùy ý.</p>
      ${hol?.topupBonusPct ? `<div class="v60-promo-banner" style="padding:8px 12px;margin-bottom:8px;"><span style="font-size:12px;color:var(--warn-ink);"><b>${esc(hol.name)}:</b> Tặng thêm <b>+${hol.topupBonusPct}%</b> vào Ví cho mọi lệnh nạp!</span></div>` : ""}
      <div class="v60-topup-grid">
        ${tiles.map(t => `<button type="button" class="v60-topup-tile tap ${t.amt === 100000 ? "active" : ""}" data-amt="${t.amt}" onclick="v60PickTopupAmt(${t.amt})">
          <span class="v60-topup-tag">${esc(t.tag)}</span>
          <span class="v60-topup-amt">${fmtVnd(t.amt)}</span>
          <span class="v60-topup-sub">${esc(t.sub)}</span>
        </button>`).join("")}
      </div>
      <div class="v60-topup-preview">
        <div><div style="font-size:11.5px;color:var(--ink-3);">Bạn nhận được vào Ví</div><div id="v60-topup-equiv" style="font-size:11.5px;color:var(--accent-ink);margin-top:2px;">Đủ đăng ký gói Pro Max (1 tháng)</div></div>
        <strong id="v60-topup-recv" class="num" style="font-size:18px;color:var(--ok-ink);">100.000 đ</strong>
      </div>
      <label class="f-lbl" style="margin-top:4px;">Hoặc nhập số tiền khác (tối thiểu 10.000đ)</label>
      <input id="topup-amt" type="number" class="field num" value="100000" min="10000" step="10000" oninput="v60UpdateTopupPreview()" />
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
        <button type="button" class="btn-s tap" onclick="closeModal()">Hủy</button>
        <button type="button" class="btn-p tap" onclick="commitTopupOrder()">Tạo mã VietQR</button>
      </div>`);
    setTimeout(v60UpdateTopupPreview, 20);
  };

  /* =========================================================================
     4. CONNECTORS 24 FULL-COLOR BRAND LOGOS + CUSTOM ICON UPLOAD + COMPOSIO 1-CLICK OAUTH (4C+)
     ========================================================================= */
  window.renderConnectorsPage = async function (tab = V50.connTab) {
    V50.connTab = tab || "connectors";
    const box = document.getElementById("connectors-body");
    if (!box) return;
    S.connectors = await dbAll("connectors").catch(() => S.connectors || []);
    const connectedMap = new Map(S.connectors.map(c => [c.id, c]));
    const list24 = window.OAUTH_CONNECTORS_24 || [];
    const storeList = window.VI_SKILL_STORE || [];

    const header = `<div class="cx-page-head">
        <div class="cx-head-left">
          <button type="button" class="cx-back-circle tap" onclick="switchView('chat')" aria-label="Quay lại"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>
          <div><h2 class="cx-page-title" style="margin:0;">Trình kết nối</h2><div style="font-size:12px;color:var(--ink-3);">24 dịch vụ · MCP Tùy chỉnh · Kỹ năng</div></div>
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
      const filtered = list24.filter(c => !q || c.name.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q));
      box.innerHTML = header + `
        <input class="field" style="margin-bottom:10px;border-radius:var(--r-pill);padding:8px 16px;" placeholder="Tìm trình kết nối (Gmail, Drive, Notion, GitHub...)" value="${esc(V50.connSearch)}" oninput="v50SetConnSearch(this.value)" />
        <div class="cx-group-card">
          ${filtered.map(c => {
            const cur = connectedMap.get(c.id);
            const on = cur && cur.enabled !== false;
            const icoHtml = window.getConnectorIconHtml ? window.getConnectorIconHtml(c.id, cur?.customIcon || "", 38) : "";
            return `<div class="cx-conn-row">
              <div style="display:flex;align-items:center;gap:12px;min-width:0;flex:1;cursor:pointer;" onclick="openConnectorConfigModal('${c.id}')">
                ${icoHtml}
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
          <strong style="font-size:14px;">Kỹ năng Việt hóa (${storeList.length})</strong>
          <button type="button" class="btn-s tap" style="height:34px;font-size:12px;" onclick="switchView('customize')">Kỹ năng &amp; GitHub Repo</button>
        </div>
        ${storeList.map(sk => {
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

  window.v60TriggerMcpIconUpload = function (scope, id, previewId, inputId) {
    V60.mcpIconTarget = { scope, id, previewId, inputId };
    document.getElementById("in-mcp-icon")?.click();
  };

  window.v60HandleMcpIconUpload = async function (files) {
    const f = files?.[0];
    const tgt = V60.mcpIconTarget;
    if (!f || !tgt) return;
    try {
      const dataUrl = await window.compressSquareIconFile(f, 96);
      const inp = document.getElementById(tgt.inputId);
      if (inp) inp.value = dataUrl;
      const prev = document.getElementById(tgt.previewId);
      if (prev && window.getConnectorIconHtml) prev.innerHTML = window.getConnectorIconHtml(tgt.id, dataUrl, 44);
      haptic("ok"); showToast("Đã tải & nén biểu tượng vuông 96×96", "ok");
    } catch (e) { showToast(e.message, "err"); }
    const el = document.getElementById("in-mcp-icon"); if (el) el.value = "";
  };

  window.v60PreviewIconFromInput = function (id, previewId, inputId) {
    const val = document.getElementById(inputId)?.value?.trim() || "";
    const prev = document.getElementById(previewId);
    if (prev && window.getConnectorIconHtml) prev.innerHTML = window.getConnectorIconHtml(id, val, 44);
  };

  window.v60StartComposioOAuth = async function (id) {
    haptic("tap");
    const btn = document.getElementById("btn-comp-oauth");
    if (btn) { btn.disabled = true; btn.textContent = "Đang tạo phiên cấp quyền..."; }
    try {
      const redirectUrl = isNativeApk() ? "" : window.location.origin;
      const r = await apiFetch("/connectors/oauth/init", { method: "POST", body: { appId: id, redirectUrl } });
      const d = await r.json();
      if (!d.ok) {
        showToast(d.error || "Kết nối 1 chạm đang được cập nhật. Bạn có thể dùng URL MCP ở mục nâng cao bên dưới.", "warn");
        const adv = document.getElementById("cn-adv-panel");
        if (adv) adv.style.display = "block";
        if (btn) { btn.disabled = false; btn.textContent = "Tiếp tục cấp quyền 1 chạm"; }
        return;
      }
      const meta = (window.OAUTH_CONNECTORS_24 || []).find(x => x.id === id);
      const cur = (S.connectors || []).find(c => c.id === id) || {};
      const obj = { ...cur, id, name: meta?.name || id, authMode: "composio", connectionId: d.connectionId || "", enabled: true, updatedAt: Date.now() };
      await dbPut("connectors", obj).catch(() => {});
      apiFetch("/sync/connectors", { method: "POST", body: obj }).catch(() => {});
      if (isNativeApk() && window.Capacitor?.Plugins?.ApiAiBackground?.openExternalAuth) {
        window.Capacitor.Plugins.ApiAiBackground.openExternalAuth({ url: d.redirectUrl });
      } else {
        window.open(d.redirectUrl, "_blank", "noopener");
      }
      closeModal(); renderConnectorsPage("connectors");
      haptic("ok"); showToast(`Đang mở trang cấp quyền ${meta?.name || id}...`, "ok");
    } catch (e) {
      haptic("err"); showToast(e.message, "err");
      if (btn) { btn.disabled = false; btn.textContent = "Tiếp tục cấp quyền 1 chạm"; }
    }
  };

  window.openConnectorConfigModal = function (id) {
    const meta = (window.OAUTH_CONNECTORS_24 || []).find(x => x.id === id); if (!meta) return;
    const cur = (S.connectors || []).find(c => c.id === id);
    const customIcon = cur?.customIcon || "";
    const composioReady = Boolean(window.V50?.publicAuthCfg?.composioReady);

    openModal(`<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
        <div id="cn-ico-prev">${window.getConnectorIconHtml(id, customIcon, 44)}</div>
        <div style="flex:1;min-width:0;">
          <h3 style="font-size:16px;font-weight:600;margin:0;">Kết nối ${esc(meta.name)}</h3>
          <div style="font-size:12px;color:var(--ink-3);">${esc(meta.hint)}</div>
        </div>
        <button type="button" class="mini-act tap" onclick="closeModal()">${ICON_X}</button>
      </div>

      <div class="card-item" style="padding:12px;background:var(--surface-0);margin-bottom:10px;">
        <strong style="font-size:13.5px;display:block;margin-bottom:4px;">Kết nối 1 chạm (OAuth)</strong>
        <div style="font-size:12px;color:var(--ink-2);line-height:1.45;margin-bottom:10px;">Cho phép API AI truy cập an toàn vào ${esc(meta.name)} theo tài khoản của bạn${composioReady ? " chỉ với 1 chạm." : " hoặc cấu hình bằng URL MCP ở mục nâng cao bên dưới."}</div>
        <button type="button" id="btn-comp-oauth" class="btn-p tap" style="width:100%;height:42px;" onclick="v60StartComposioOAuth('${id}')">Tiếp tục cấp quyền 1 chạm</button>
      </div>

      <button type="button" class="v38-spec-toggle tap-soft" onclick="const el=document.getElementById('cn-adv-panel');el.style.display=el.style.display==='none'?'block':'none';">
        <span>Kết nối nâng cao (URL MCP thủ công &amp; Đổi ảnh biểu tượng)</span><span>▾</span>
      </button>
      <div id="cn-adv-panel" style="display:${cur?.mcpUrl || !composioReady ? "block" : "none"};margin-top:8px;">
        <label class="f-lbl" style="margin-top:4px;">Ảnh biểu tượng tùy chỉnh (tải lên hoặc dán URL)</label>
        <div style="display:flex;gap:6px;align-items:center;">
          <input id="cn-icon-url" class="field" style="font-size:12.5px;" value="${esc(customIcon)}" placeholder="Để trống = dùng logo mặc định" oninput="v60PreviewIconFromInput('${id}','cn-ico-prev','cn-icon-url')" />
          <button type="button" class="btn-s tap" style="height:44px;padding:0 12px;font-size:12px;" onclick="v60TriggerMcpIconUpload('connector','${id}','cn-ico-prev','cn-icon-url')">Tải ảnh</button>
          <button type="button" class="mini-act tap" title="Khôi phục logo mặc định" onclick="document.getElementById('cn-icon-url').value='';v60PreviewIconFromInput('${id}','cn-ico-prev','cn-icon-url')">↺</button>
        </div>

        <label class="f-lbl">MCP Endpoint URL (n8n / Zapier / Custom MCP)</label>
        <input id="cn-url" class="field" value="${esc(cur?.mcpUrl || "")}" placeholder="https://mcp.example.com/..." />
        <label class="f-lbl">API Key / Bearer Token (tùy chọn)</label>
        <input id="cn-tok" type="password" class="field" value="${esc(cur?.token || "")}" placeholder="Nhập token hoặc để trống" />
      </div>

      <div style="display:flex;justify-content:space-between;gap:8px;margin-top:14px;">
        ${cur ? `<button type="button" class="btn-danger tap" onclick="removeConnectorConfig('${id}')">Ngắt</button>` : `<span></span>`}
        <div style="display:flex;gap:8px;">
          <button type="button" class="btn-s tap" onclick="closeModal()">Hủy</button>
          <button type="button" class="btn-p tap" onclick="saveConnectorConfig('${id}')">Lưu cấu hình</button>
        </div>
      </div>`);
  };

  window.saveConnectorConfig = async function (id) {
    const meta = (window.OAUTH_CONNECTORS_24 || []).find(x => x.id === id); if (!meta) return;
    const mcpUrl = document.getElementById("cn-url")?.value.trim() || "";
    const token = document.getElementById("cn-tok")?.value.trim() || "";
    const customIcon = document.getElementById("cn-icon-url")?.value.trim() || "";
    const cur = (S.connectors || []).find(c => c.id === id) || {};
    const obj = { ...cur, id, name: meta.name, mcpUrl, token, customIcon, enabled: Boolean(mcpUrl || cur.connectionId || cur.enabled), updatedAt: Date.now() };
    await dbPut("connectors", obj).catch(() => {});
    apiFetch("/sync/connectors", { method: "POST", body: obj }).catch(() => {});
    if (mcpUrl.startsWith("http") && canUseRemoteMcp()) {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const r = await apiFetch("/mcp/discover", { method: "POST", body: { url: mcpUrl, headers } });
        if (r.ok) {
          const d = await r.json();
          const sv = { id: "mcp-conn-" + id, name: meta.name, url: mcpUrl, headers, customIcon, enabled: true, tools: d.tools || [], updatedAt: Date.now() };
          await dbPut("mcp", sv); S.mcpServers = await dbAll("mcp"); renderMcpQuickBadge();
        }
      } catch {}
    }
    S.connectors = await dbAll("connectors").catch(() => [obj]);
    closeModal(); renderConnectorsPage("connectors"); haptic("ok");
    showToast(`Đã lưu cấu hình ${meta.name}`, "ok");
  };

  // Enhance Custom MCP Modal with Custom Icon Upload + Auto Favicon Detection!
  const _origOpenCustomMcp = window.openCustomMcpModalV50;
  window.openCustomMcpModalV50 = function () {
    if (typeof _origOpenCustomMcp === "function") _origOpenCustomMcp();
    const urlInp = document.getElementById("cm-url");
    if (!urlInp || document.getElementById("cm-icon-url")) return;
    const block = document.createElement("div");
    block.innerHTML = `
      <label class="f-lbl">Ảnh biểu tượng MCP (tự dò favicon hoặc tải ảnh)</label>
      <div style="display:flex;gap:8px;align-items:center;">
        <div id="cm-ico-prev">${window.getConnectorIconHtml("custom", "", 38)}</div>
        <input id="cm-icon-url" class="field" style="font-size:12.5px;" placeholder="https://... hoặc bấm Tải ảnh" oninput="v60PreviewIconFromInput('custom','cm-ico-prev','cm-icon-url')" />
        <button type="button" class="btn-s tap" style="height:44px;padding:0 11px;font-size:12px;" onclick="v60TriggerMcpIconUpload('custom_mcp','custom','cm-ico-prev','cm-icon-url')">Tải ảnh</button>
      </div>`;
    urlInp.parentNode.insertBefore(block, urlInp.nextSibling);
    urlInp.addEventListener("blur", () => {
      const icoEl = document.getElementById("cm-icon-url");
      if (icoEl && !icoEl.value.trim() && urlInp.value.trim().startsWith("http")) {
        const fav = window.detectFaviconFromUrl(urlInp.value.trim());
        if (fav) { icoEl.value = fav; v60PreviewIconFromInput("custom", "cm-ico-prev", "cm-icon-url"); }
      }
    });
  };

  const _origInstallCustomMcp = window.installCustomMcpV50;
  window.installCustomMcpV50 = async function () {
    const customIcon = document.getElementById("cm-icon-url")?.value.trim() || "";
    if (typeof _origInstallCustomMcp === "function") await _origInstallCustomMcp();
    if (customIcon && S.mcpServers?.length) {
      const latest = S.mcpServers.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
      if (latest && !latest.customIcon) {
        latest.customIcon = customIcon;
        await dbPut("mcp", latest).catch(() => {});
        apiFetch("/sync/mcp", { method: "POST", body: latest }).catch(() => {});
      }
    }
  };

  /* =========================================================================
     5. CENTRIX COMPOSER (64x64 THUMBNAILS INSIDE CARD, MODEL LONG-PRESS QUICK-SWAP),
        CLEAN + SHEET (5 ROWS + 3-MODE TOOL PERMISSION), RICH INLINE MESSAGE EDIT
     ========================================================================= */
  // Override renderChips: 64x64 square image tiles + sleek file cards INSIDE .composer-card (ZERO ugly blue chips!)
  window.renderChips = function () {
    const bar = document.getElementById("chips-bar");
    if (!bar) return;
    const parts = [];
    if (S.activeTool) {
      parts.push(`<span class="cx-tool-pill">${esc(TOOL_CHIP_LABELS[S.activeTool] || S.activeTool)} <button type="button" onclick="S.activeTool=null;renderChips()" aria-label="Bỏ công cụ">×</button></span>`);
    }
    (S.atts || []).forEach((a, i) => {
      if (a.dataUrl) {
        parts.push(`<div class="cx-att-thumb tap" onclick="openVisionStudio(${i})" title="Chạm để mở HD Vision Studio">
          <img src="${a.dataUrl}" alt="${esc(a.name || "Ảnh")}" />
          ${a.enhanced ? `<span class="cx-att-badge">HD</span>` : ""}
          <button type="button" class="cx-att-thumb-x" onclick="event.stopPropagation();S.atts.splice(${i},1);renderChips();updateOrbButton()" aria-label="Xóa ảnh">×</button>
        </div>`);
      } else {
        const isZip = Boolean(a.isZip);
        const ext = isZip ? "ZIP" : ((a.name || "FILE").split(".").pop() || "TXT").toUpperCase().slice(0, 4);
        const kb = a.totalChars ? `${Math.max(1, Math.round(a.totalChars / 1024))} KB` : (a.text ? `${Math.max(1, Math.round(a.text.length / 1024))} KB` : "Tệp");
        const clickAct = isZip ? `openZipInspectorModal('${esc(a.id)}')` : "";
        parts.push(`<div class="cx-att-file ${isZip ? "is-zip" : ""}" ${clickAct ? `onclick="${clickAct}"` : ""}>
          <span class="cx-att-f-ico">${esc(ext)}</span>
          <div class="cx-att-f-meta">
            <span class="cx-att-f-name">${esc(a.rawZipName || a.name)}</span>
            <span class="cx-att-f-sub">${isZip ? `${(a.archiveFiles || []).length} tệp · Xem` : kb}</span>
          </div>
          <button type="button" class="cx-att-thumb-x" onclick="event.stopPropagation();S.atts.splice(${i},1);renderChips();updateOrbButton()" aria-label="Xóa tệp">×</button>
        </div>`);
      }
    });
    bar.innerHTML = parts.join("");
  };

  // Suppress legacy floating token estimator strip outside Composer
  window.updatePreSendTokenEstimate = function () {};

  // 3B+ Model Button: Tap -> Open Model Dropdown; Long-Press (~420ms) -> Instant Swap between last 2 used models!
  const _origPickModelV60 = window.pickModel;
  window.pickModel = function (id, locked, needTier) {
    const prev = S.cfg.selectedModel;
    if (!locked && prev && prev !== id) {
      S.cfg.prevSelectedModel = prev;
    }
    if (typeof _origPickModelV60 === "function") _origPickModelV60(id, locked, needTier);
    v60SyncSheetLabels();
  };

  window.v60HandleModelBtnClick = function (ev) {
    if (V60.modelLongPressed) {
      V60.modelLongPressed = false;
      if (ev) ev.stopPropagation();
      return;
    }
    toggleModelDropdown(ev);
  };

  function bindModelQuickSwapLongPress() {
    const btn = document.getElementById("btn-model-trigger");
    if (!btn || btn.dataset.v60Bound) return;
    btn.dataset.v60Bound = "1";
    const startHold = () => {
      V60.modelLongPressed = false;
      clearTimeout(V60.modelLongPressTimer);
      V60.modelLongPressTimer = setTimeout(() => {
        V60.modelLongPressed = true;
        const allowed = (S.models || []).filter(m => m.allowed && m.id !== S.cfg.selectedModel);
        const target = (S.cfg.prevSelectedModel && allowed.find(m => m.id === S.cfg.prevSelectedModel)) || allowed[0];
        if (!target) return;
        haptic("switch");
        window.pickModel(target.id, false, "");
        showToast(`Đã đổi nhanh sang ${target.short || target.title}`, "ok");
      }, 420);
    };
    const cancelHold = () => clearTimeout(V60.modelLongPressTimer);
    btn.addEventListener("pointerdown", startHold, { passive: true });
    btn.addEventListener("pointerup", cancelHold, { passive: true });
    btn.addEventListener("pointercancel", cancelHold, { passive: true });
    btn.addEventListener("pointerleave", cancelHold, { passive: true });
  }

  // Keep Composer model label short so it NEVER overflows on 360px phones
  const _origRenderModelDropV60 = window.renderModelDropdown;
  window.renderModelDropdown = function () {
    if (typeof _origRenderModelDropV60 === "function") _origRenderModelDropV60();
    const m = S.models.find(x => x.id === S.cfg.selectedModel) || S.models.find(x => x.allowed) || S.models[0];
    const topEl = document.getElementById("top-model-text");
    if (topEl && m) topEl.textContent = m.short || m.title || "API AI";
    v60SyncSheetLabels();
  };

  function v60SyncSheetLabels() {
    const m = S.models.find(x => x.id === S.cfg.selectedModel) || S.models[0];
    const t = THINK_LEVELS.find(x => x.id === S.cfg.thinkingLevel) || THINK_LEVELS[2];
    const subM = document.getElementById("v60-sheet-model-sub");
    if (subM) subM.textContent = `${m?.short || m?.title || "GPT 6.2 Sol"} · Suy luận ${t?.title || "Cao"}`;
    const perm = S.cfg.toolPermission || "auto_safe";
    const permLbl = perm === "ask" ? "Hỏi trước khi chạy" : (perm === "full" ? "Toàn quyền công cụ" : "Tự duyệt công cụ an toàn");
    const subP = document.getElementById("v60-sheet-perm-sub");
    if (subP) subP.textContent = `${permLbl} · Trí nhớ mạch dài`;
    const swDeep = document.getElementById("sw-deep-think");
    if (swDeep) swDeep.classList.toggle("on", S.cfg.thinkingLevel === "max" || S.cfg.thinkingLevel === "xhigh");
  }

  const _origOpenToolsV60 = window.openToolsSheet;
  window.openToolsSheet = function () {
    v60SyncSheetLabels();
    if (typeof _origOpenToolsV60 === "function") _origOpenToolsV60();
  };

  window.v60ToggleDeepThinkSwitch = function () {
    haptic("switch");
    const isHigh = S.cfg.thinkingLevel === "max" || S.cfg.thinkingLevel === "xhigh";
    const next = isHigh ? (S.cfg.prevNormalThink || "high") : "max";
    if (!isHigh) S.cfg.prevNormalThink = S.cfg.thinkingLevel || "high";
    pickThink(next);
    v60SyncSheetLabels();
    showToast(next === "max" ? "Đã bật Suy nghĩ kỹ hơn (Mức tối đa)" : "Đã chuyển về mức suy luận tiêu chuẩn", "ok");
  };

  window.v60OpenExtensionsSheet = function () {
    haptic("tap");
    const skCnt = (S.skillIds || []).length;
    openModal(`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <h3 style="font-size:16.5px;font-weight:600;margin:0;">Công cụ mở rộng</h3>
        <button type="button" class="mini-act tap" onclick="closeModal()">${ICON_X}</button>
      </div>
      <div class="cx-group-card" style="margin:0;">
        <button type="button" class="cx-row tap-soft" onclick="closeModal();pickTool('web_search')"><span class="cx-row-l"><span>Tìm kiếm Web trực tiếp</span></span><span class="cx-row-r">${S.activeTool === "web_search" ? "Đang bật" : "›"}</span></button>
        <button type="button" class="cx-row tap-soft" onclick="closeModal();pickTool('deep_research')"><span class="cx-row-l"><span>Deep Research (Tìm nguồn sâu)</span></span><span class="cx-row-r">${S.activeTool === "deep_research" ? "Đang bật" : "›"}</span></button>
        <button type="button" class="cx-row tap-soft" onclick="closeModal();openWorkspaceFilesModal()"><span class="cx-row-l"><span>Hồ sơ bối cảnh &amp; Tệp phòng (boi-canh.md)</span></span><span class="cx-row-r">›</span></button>
        <button type="button" class="cx-row tap-soft" onclick="closeModal();switchView('connectors')"><span class="cx-row-l"><span>Trình kết nối &amp; MCP (${(S.mcpServers || []).length})</span></span><span class="cx-row-r">›</span></button>
        <button type="button" class="cx-row tap-soft" onclick="closeModal();switchView('customize')"><span class="cx-row-l"><span>Kỹ năng AI (${skCnt} đang bật)</span></span><span class="cx-row-r">›</span></button>
        <button type="button" class="cx-row tap-soft" onclick="closeModal();openPromptLibraryModal()"><span class="cx-row-l"><span>Kho Prompt mẫu (/p)</span></span><span class="cx-row-r">›</span></button>
      </div>`);
  };

  window.v60OpenCreateContentSheet = function () {
    haptic("tap");
    openModal(`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <h3 style="font-size:16.5px;font-weight:600;margin:0;">Tạo nội dung</h3>
        <button type="button" class="mini-act tap" onclick="closeModal()">${ICON_X}</button>
      </div>
      <div class="cx-group-card" style="margin:0;">
        <button type="button" class="cx-row tap-soft" onclick="closeModal();pickTool('image')"><span class="cx-row-l"><span>Tạo hình ảnh HD</span></span><span class="cx-row-r">›</span></button>
        <button type="button" class="cx-row tap-soft" onclick="closeModal();pickTool('office_pptx')"><span class="cx-row-l"><span>Tạo Slide PowerPoint (.pptx)</span></span><span class="cx-row-r">›</span></button>
        <button type="button" class="cx-row tap-soft" onclick="closeModal();pickTool('office_docx')"><span class="cx-row-l"><span>Tạo Tài liệu Word / PDF</span></span><span class="cx-row-r">›</span></button>
        <button type="button" class="cx-row tap-soft" onclick="closeModal();pickTool('office_xlsx')"><span class="cx-row-l"><span>Tạo Bảng tính Excel (.xlsx)</span></span><span class="cx-row-r">›</span></button>
        <button type="button" class="cx-row tap-soft" onclick="closeModal();pickTool('canvas')"><span class="cx-row-l"><span>Canvas chạy code trực tiếp</span></span><span class="cx-row-r">›</span></button>
        <button type="button" class="cx-row tap-soft" onclick="closeModal();openCompareSetupModal()"><span class="cx-row-l"><span>So sánh 2 Model song song</span></span><span class="cx-row-r">›</span></button>
      </div>`);
  };

  // Tùy chọn chat: 3-Mode Tool Permission + Anti-Amnesia 5-Anchor Editor (7C+)
  window.v60SetToolPermission = function (mode) {
    S.cfg.toolPermission = mode;
    dbPut("kv", S.cfg).catch(() => {});
    haptic("switch");
    v60SyncSheetLabels();
    v60OpenChatOptionsSheet();
  };

  window.v60OpenChatOptionsSheet = function () {
    haptic("tap");
    const perm = S.cfg.toolPermission || "auto_safe";
    const chat = S.chats.find(c => c.id === S.activeChatId);
    const hasRoll = Boolean(chat?.rollingState);
    const cpCount = (chat?.messages || []).filter(m => m.goodCheckpoint).length;

    openModal(`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <h3 style="font-size:16.5px;font-weight:600;margin:0;">Tùy chọn chat</h3>
        <button type="button" class="mini-act tap" onclick="closeModal()">${ICON_X}</button>
      </div>
      <div style="font-size:12px;color:var(--ink-3);margin-bottom:6px;">Quyền truy cập công cụ (MCP / Tìm Web)</div>
      <div class="cx-group-card">
        ${[
          ["ask", "Hỏi trước khi chạy", "Hỏi xác nhận mỗi lần AI cần gọi MCP hoặc Tìm Web"],
          ["auto_safe", "Tự duyệt giúp tôi", "Tự động chạy các công cụ đọc/tra cứu an toàn"],
          ["full", "Toàn quyền", "Chạy mọi công cụ kết nối không cần hỏi lại"]
        ].map(([k, title, sub]) => `<button type="button" class="cx-row tap-soft" onclick="v60SetToolPermission('${k}')">
          <div style="flex:1;min-width:0;"><div style="font-weight:500;">${title}</div><div style="font-size:12px;color:var(--ink-3);">${sub}</div></div>
          <span style="color:var(--accent-ink);">${perm === k ? ICON_CHECK : ""}</span>
        </button>`).join("")}
      </div>

      <div style="font-size:12px;color:var(--ink-3);margin:10px 0 6px;">Chống quên mạch dài (Anti-Amnesia 3 tầng)</div>
      <div class="cx-group-card">
        <button type="button" class="cx-row tap-soft" onclick="closeModal();v60OpenRollingMemoryEditor()">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:500;">Xem &amp; Sửa 5 Mỏ neo trí nhớ mạch</div>
            <div style="font-size:12px;color:var(--ink-3);">${hasRoll ? "Đang hoạt động" : "Tự kích hoạt khi chat > 10 tin"} · ${cpCount} mốc chuẩn ghim cứng</div>
          </div>
          <span class="cx-row-r">›</span>
        </button>
        <button type="button" class="cx-row tap-soft" onclick="closeModal();openContextInspectorModal()">
          <span class="cx-row-l"><span>Xem dung lượng ngữ cảnh (/context)</span></span>
          <span class="cx-row-r">›</span>
        </button>
      </div>`);
  };

  /* ----- RICH INLINE MESSAGE EDITING (TEXT + IMAGES + CAMERA + FILES + ZIP) ----- */
  window.editUserMessage = function (msgId) {
    if (window.getCurrentChatRun && window.getCurrentChatRun()) return;
    const chat = S.chats.find(c => c.id === S.activeChatId);
    const m = chat?.messages.find(x => x.id === msgId);
    if (!m) return;
    V60.editingMsgId = msgId;
    V60.editDraftText = m.text || "";
    V60.editDraftAtts = (m.atts || []).map(a => ({ ...a }));
    haptic("tap");
    renderMessages();
    setTimeout(() => {
      const ta = document.getElementById("v60-edit-ta");
      if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
    }, 40);
  };

  window.v60CancelInlineEdit = function () {
    V60.editingMsgId = null;
    V60.editDraftText = "";
    V60.editDraftAtts = [];
    renderMessages();
  };

  window.v60RemoveEditAtt = function (idx) {
    V60.editDraftAtts.splice(idx, 1);
    renderMessages();
  };

  window.v60HandleEditImages = async function (files) {
    for (const f of files || []) {
      const p = await processImageFile(f);
      V60.editDraftAtts.push({ id: "eimg-" + Date.now() + Math.random(), type: "image", name: f.name, dataUrl: p.dataUrl, origDataUrl: p.dataUrl, enhanced: false });
    }
    const c1 = document.getElementById("in-edit-img"); if (c1) c1.value = "";
    const c2 = document.getElementById("in-edit-cam"); if (c2) c2.value = "";
    haptic("ok"); renderMessages();
  };

  window.v60HandleEditDocs = async function (files) {
    for (const f of Array.from(files || []).slice(0, 12)) {
      if ((f.type || "").startsWith("image/") && !/\.svg$/i.test(f.name)) {
        const p = await processImageFile(f);
        V60.editDraftAtts.push({ id: "eimg-" + Date.now() + Math.random(), type: "image", name: f.name, dataUrl: p.dataUrl, origDataUrl: p.dataUrl });
        continue;
      }
      if (/\.zip$/i.test(f.name) && typeof window.unpackZipFileUniversal === "function") {
        const z = await window.unpackZipFileUniversal(f);
        V60.editDraftAtts.push({ id: "ezip-" + Date.now(), type: "file", isZip: true, name: `${f.name} (${z.files.length} tệp)`, rawZipName: f.name, text: z.text, treeText: z.treeText, archiveFiles: z.files, zipImages: z.images, totalChars: z.totalChars });
      } else {
        const { text } = await extractRealFileText(f);
        V60.editDraftAtts.push({ id: "edoc-" + Date.now() + Math.random(), type: "file", name: f.name, text, size: f.size || text.length });
      }
    }
    const c3 = document.getElementById("in-edit-doc"); if (c3) c3.value = "";
    haptic("ok"); renderMessages();
  };

  window.v60OpenEditAddPicker = function () {
    openModal(`<h3 style="font-size:16px;font-weight:600;margin-bottom:10px;">Thêm vào tin nhắn đang sửa</h3>
      <div class="v60-top-tiles">
        <button type="button" class="v60-tile tap" onclick="closeModal();document.getElementById('in-edit-cam').click()"><span>Camera</span></button>
        <button type="button" class="v60-tile tap" onclick="closeModal();document.getElementById('in-edit-img').click()"><span>Ảnh</span></button>
        <button type="button" class="v60-tile tap" onclick="closeModal();document.getElementById('in-edit-doc').click()"><span>Tệp / ZIP</span></button>
      </div>
      <div style="display:flex;justify-content:flex-end;"><button type="button" class="btn-s tap" onclick="closeModal()">Đóng</button></div>`);
  };

  window.v60DictateToEdit = function () {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return showToast("Thiết bị chưa hỗ trợ nhập giọng nói", "warn");
    const r = new SR(); r.lang = "vi-VN"; r.interimResults = false;
    r.onresult = e => {
      const spoken = Array.from(e.results).map(x => x[0].transcript).join(" ").trim();
      if (spoken) {
        V60.editDraftText = (V60.editDraftText ? V60.editDraftText + " " : "") + spoken;
        const ta = document.getElementById("v60-edit-ta");
        if (ta) ta.value = V60.editDraftText;
      }
    };
    r.start();
    showToast("Đang nghe giọng nói...");
  };

  window.v60CommitInlineEdit = async function (msgId) {
    const ta = document.getElementById("v60-edit-ta");
    const txt = (ta ? ta.value : V60.editDraftText).trim();
    const atts = [...V60.editDraftAtts];
    if (!txt && !atts.length) return showToast("Tin nhắn cần có nội dung hoặc ảnh/tệp đính kèm", "warn");
    const chat = S.chats.find(c => c.id === S.activeChatId);
    const idx = chat?.messages.findIndex(m => m.id === msgId);
    if (idx === undefined || idx < 0) return;

    V60.editingMsgId = null;
    V60.editDraftText = "";
    V60.editDraftAtts = [];
    chat.messages = chat.messages.slice(0, idx);
    S.atts = atts;
    renderChips();
    await sendPrompt(txt);
  };

  window.v60RenderInlineEditCard = function (m) {
    const attHtml = (V60.editDraftAtts || []).map((a, i) => {
      if (a.dataUrl) {
        return `<div class="cx-att-thumb"><img src="${a.dataUrl}" alt="" /><button type="button" class="cx-att-thumb-x" onclick="v60RemoveEditAtt(${i})">×</button></div>`;
      }
      const ext = a.isZip ? "ZIP" : ((a.name || "FILE").split(".").pop() || "TXT").toUpperCase().slice(0, 4);
      return `<div class="cx-att-file ${a.isZip ? "is-zip" : ""}"><span class="cx-att-f-ico">${esc(ext)}</span><div class="cx-att-f-meta"><span class="cx-att-f-name">${esc(a.rawZipName || a.name)}</span></div><button type="button" class="cx-att-thumb-x" onclick="v60RemoveEditAtt(${i})">×</button></div>`;
    }).join("");

    return `<div class="msg-row user" data-msg-id="${m.id}">
      <div class="v60-edit-card">
        ${attHtml ? `<div class="cx-att-strip">${attHtml}</div>` : ""}
        <textarea id="v60-edit-ta" class="v60-edit-ta" oncompositionstart="V60.editComposing=true" oncompositionend="V60.editComposing=false;V60.editDraftText=this.value" oninput="if(!V60.editComposing&&!event.isComposing)V60.editDraftText=this.value" placeholder="Sửa nội dung tin nhắn...">${esc(V60.editDraftText)}</textarea>
        <div class="v60-edit-bar">
          <div style="display:flex;gap:6px;align-items:center;">
            <button type="button" class="cx-comp-btn icon-only tap" onclick="v60OpenEditAddPicker()" title="Thêm ảnh / camera / tệp / ZIP"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>
            <button type="button" class="cx-comp-btn icon-only tap" onclick="v60DictateToEdit()" title="Nhập giọng nói"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button>
          </div>
          <div style="display:flex;gap:8px;">
            <button type="button" class="btn-s tap" style="height:36px;padding:0 14px;" onclick="v60CancelInlineEdit()">Hủy</button>
            <button type="button" class="btn-p tap" style="height:36px;padding:0 16px;" onclick="v60CommitInlineEdit('${m.id}')">Gửi lại</button>
          </div>
        </div>
      </div>
    </div>`;
  };

  /* =========================================================================
     6. ANTI-AMNESIA 3-TIER LONG-CONTEXT ENGINE (7C+)
        Tier 1: 16 recent verbatim messages (~45K cap) + 100% verbatim goodCheckpoints
        Tier 2: Silent background Rolling Working Memory (5 anchors, editable in Chat Options!)
        Tier 3: 0ms Intra-Chat Recall of top 3 matching older messages outside window
     ========================================================================= */
  function formatMsgForApi(m) {
    if (m.role === "assistant") return { role: "assistant", content: m.text || "" };
    const imgs = (m.atts || []).filter(a => a.dataUrl);
    const docs = (m.atts || []).filter(a => a.type === "file");
    let txt = m.text || "";
    if (docs.length) txt += "\n\n" + docs.map(d => `[TỆP ${d.name}]\n${d.text}`).join("\n\n");
    if (imgs.length) {
      const arr = [{ type: "text", text: txt || "Phân tích chi tiết toàn bộ hình ảnh này." }];
      imgs.forEach(im => arr.push({ type: "image_url", image_url: { url: im.dataUrl, detail: "high" } }));
      return { role: "user", content: arr };
    }
    return { role: "user", content: txt };
  }

  window.v60BuildAntiAmnesiaPayload = function (chat, aiMsg, baseSysPrompt, currentQuery) {
    const startIdx = Number.isInteger(chat.compactedUpToIndex) ? Math.max(0, chat.compactedUpToIndex) : 0;
    const allEligible = (chat.messages || []).slice(startIdx).filter(x => x.id !== aiMsg.id && !x.failedSwitch);

    // Tier 1: Keep up to 16 most recent messages (within ~45K chars)
    const RECENT_LIMIT = 16;
    const recentMsgs = allEligible.slice(-RECENT_LIMIT);
    const recentIds = new Set(recentMsgs.map(m => m.id));
    const olderPool = allEligible.slice(0, Math.max(0, allEligible.length - RECENT_LIMIT));

    // Tier 1b: ALWAYS retain 100% verbatim pinned goodCheckpoint messages from older turns!
    const pinnedOlder = olderPool.filter(m => m.goodCheckpoint);

    // Tier 3: Zero-ms Intra-Chat Recall — scan olderPool for keyword/filename/function/question-number matches
    const q = String(currentQuery || "").toLowerCase();
    const tokens = [...new Set(q.replace(/[^\p{L}\p{N}_./-]/gu, " ").split(/\s+/).filter(w => w.length >= 2))];
    let recalled = [];
    if (olderPool.length && tokens.length) {
      recalled = olderPool
        .filter(m => !m.goodCheckpoint && (m.text || "").length >= 20)
        .map((m, idx) => {
          const hay = (m.text || "").toLowerCase();
          let score = 0;
          for (const tk of tokens) {
            if (hay.includes(tk)) score += (tk.length >= 5 || /[._/-]|\d/.test(tk)) ? 4 : 2;
          }
          return { m, idx, score };
        })
        .filter(x => x.score >= 4)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
    }

    let sys = baseSysPrompt;
    // Tier 2: Inject Rolling Working Memory (5 anchors)
    if (chat.rollingState && String(chat.rollingState).trim()) {
      sys += `\n\n=== TRÍ NHỚ CUỘN CHỐNG QUÊN (5 MỎ NEO BẤT BIẾN — LUÔN TUÂN THỦ) ===\n${chat.rollingState.trim()}`;
    }
    if (recalled.length) {
      sys += `\n\n=== TRÍCH LẠI NGUYÊN VĂN TỪ ĐẦU CUỘC TRÒ CHUYỆN (INTRA-CHAT RECALL) ===\n` +
        recalled.map(r => `[Lượt #${r.idx + 1} · ${r.m.role === "user" ? "Người dùng" : "API AI"}]: ${(r.m.text || "").slice(0, 1200)}`).join("\n\n");
    }

    const out = [{ role: "system", content: sys }];
    // Prepend pinned checkpoints verbatim before the 16-message recent window
    for (const pm of pinnedOlder) {
      if (!recentIds.has(pm.id)) out.push(formatMsgForApi(pm));
    }
    // Cap recent verbatim messages at ~45K total characters while always keeping the last 4 messages
    let accChars = 0;
    const pickedRecent = [];
    for (let i = recentMsgs.length - 1; i >= 0; i--) {
      const m = recentMsgs[i];
      const len = (m.text || "").length + (m.atts || []).reduce((a, x) => a + (x.text ? x.text.length : 0), 0);
      if (pickedRecent.length >= 4 && accChars + len > 45000) break;
      pickedRecent.unshift(m);
      accChars += len;
    }
    for (const rm of pickedRecent) out.push(formatMsgForApi(rm));
    return out;
  };

  // Tier 2 Background Updater: runs silently after AI replies when >= 10 new messages haven't been folded into rollingState!
  window.v60MaybeUpdateRollingMemory = function (chat) {
    if (!chat || !S.user?.licenseActive || V60.rollingBusy.has(chat.id)) return;
    const msgs = (chat.messages || []).filter(m => !m.failedSwitch && m.text);
    const lastIdx = Number(chat.rollingUpToIndex || 0);
    const unsummarized = msgs.length - lastIdx;
    if (msgs.length < 10 || unsummarized < 10) return;

    V60.rollingBusy.add(chat.id);
    const sliceEnd = Math.max(lastIdx + 1, msgs.length - 4);
    const chunk = msgs.slice(lastIdx, sliceEnd);
    const payloadText = (chat.rollingState ? `[TRÍ NHỚ 5 MỎ NEO HIỆN TẠI]\n${chat.rollingState}\n\n` : "")
      + `[CÁC LƯỢT HỘI THOẠI MỚI CẦN CẬP NHẬT]\n`
      + chunk.map(m => `${m.role === "user" ? "U" : "A"}: ${m.text.slice(0, 1200)}`).join("\n\n");

    apiFetch("/ai/digest", {
      method: "POST",
      body: {
        digestMode: "rolling_state",
        readerModelId: "gpt-6-luna",
        instruction: "Cập nhật 5 mỏ neo bất biến cho cuộc trò chuyện dài này.",
        content: payloadText.slice(0, 24000)
      }
    }).then(async r => {
      if (!r.ok) return;
      const d = await r.json();
      if (d.digest) {
        chat.rollingState = d.digest;
        chat.rollingUpToIndex = sliceEnd;
        chat.rollingUpdatedAt = Date.now();
        await dbPut("chats", chat).catch(() => {});
        apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {});
      }
    }).catch(() => {}).finally(() => {
      V60.rollingBusy.delete(chat.id);
    });
  };

  window.v60OpenRollingMemoryEditor = function () {
    const chat = S.chats.find(c => c.id === S.activeChatId);
    if (!chat) return showToast("Hãy mở 1 đoạn chat để xem/sửa Trí nhớ mạch", "warn");
    const tpl = chat.rollingState || "1) **Mục tiêu & Quyết định đã chốt:** \n2) **Tên file, hàm, biến & số liệu chính xác:** \n3) **Ràng buộc & Phong cách:** \n4) **Lỗi đã xử lý:** \n5) **Tiến độ hiện tại:** ";
    openModal(`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <h3 style="font-size:16.5px;font-weight:600;margin:0;">5 Mỏ neo Trí nhớ mạch (Anti-Amnesia)</h3>
        <button type="button" class="mini-act tap" onclick="closeModal()">${ICON_X}</button>
      </div>
      <p style="font-size:12px;color:var(--ink-2);margin-bottom:8px;">Tự động cập nhật ngầm sau mỗi 10 tin nhắn. Bạn có thể tự chỉnh sửa để ghim cứng quyết định quan trọng cho đoạn chat này.</p>
      <textarea id="v60-roll-ta" class="field" rows="9" style="font-size:13px;line-height:1.5;">${esc(tpl)}</textarea>
      <div style="display:flex;justify-content:space-between;gap:8px;margin-top:12px;">
        <button type="button" class="btn-blue tap" onclick="v60ForceRefreshRollingNow()">Cập nhật AI ngay</button>
        <div style="display:flex;gap:8px;">
          <button type="button" class="btn-s tap" onclick="closeModal()">Hủy</button>
          <button type="button" class="btn-p tap" onclick="v60SaveRollingMemoryEdit()">Lưu 5 Mỏ neo</button>
        </div>
      </div>`);
  };

  window.v60SaveRollingMemoryEdit = async function () {
    const chat = S.chats.find(c => c.id === S.activeChatId); if (!chat) return;
    chat.rollingState = (document.getElementById("v60-roll-ta")?.value || "").trim();
    chat.rollingUpdatedAt = Date.now();
    await dbPut("chats", chat).catch(() => {});
    apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {});
    closeModal(); haptic("ok"); showToast("Đã lưu 5 Mỏ neo trí nhớ mạch", "ok");
  };

  window.v60ForceRefreshRollingNow = function () {
    const chat = S.chats.find(c => c.id === S.activeChatId); if (!chat) return;
    chat.rollingUpToIndex = 0;
    closeModal();
    showToast("Đang tổng hợp lại 5 Mỏ neo trí nhớ ở nền...");
    V60.rollingBusy.delete(chat.id);
    // Temporarily force update even if <10 msgs
    const msgs = (chat.messages || []).filter(m => !m.failedSwitch && m.text);
    if (!msgs.length) return showToast("Đoạn chat chưa có nội dung", "warn");
    apiFetch("/ai/digest", {
      method: "POST",
      body: {
        digestMode: "rolling_state",
        readerModelId: "gpt-6-luna",
        instruction: "Tổng hợp toàn bộ hội thoại sau thành 5 mỏ neo bất biến.",
        content: msgs.map(m => `${m.role === "user" ? "U" : "A"}: ${m.text.slice(0, 1200)}`).join("\n\n").slice(0, 24000)
      }
    }).then(async r => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Lỗi cập nhật");
      chat.rollingState = d.digest || "";
      chat.rollingUpToIndex = msgs.length;
      await dbPut("chats", chat).catch(() => {});
      apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {});
      haptic("ok"); showToast("Đã đồng bộ 5 Mỏ neo trí nhớ mạch!", "ok");
    }).catch(e => showToast(e.message, "err"));
  };

  /* =========================================================================
     7. ADMIN CONSOLE v6.0 (HOLIDAY PROMO, EMAIL RESEND/BREVO + TEST EMAIL,
        GOOGLE SECRET, COMPOSIO, GLOBAL CONNECTOR ICONS & 1-CLICK RESET LINKS)
     ========================================================================= */
  const _origRenderAdminV60 = window.renderAdminBody;
  window.renderAdminBody = function () {
    if (typeof _origRenderAdminV60 === "function") _origRenderAdminV60();
    const d = S.adminData, box = document.getElementById("admin-body");
    if (!d || !box) return;

    if (S.adminTab === "billing") {
      const cfg = d.config || {};
      const go = cfg.google_oauth || {};
      const ec = cfg.email_config || {};
      const hp = cfg.holiday_promo || {};
      const cc = cfg.composio_config || {};
      const base = getApiBase();
      const fmtDt = ts => ts ? new Date(Number(ts) + 7 * 3600000).toISOString().slice(0, 16) : "";

      const extraHtml = `
        <div class="card-item" style="border-color:var(--warn-rim);">
          <strong style="font-size:15px;display:block;margin-bottom:6px;">Khuyến mãi Ngày lễ (v6.0)</strong>
          <div class="s-row" onclick="document.getElementById('ahp-on').classList.toggle('on')">
            <span>Bật chiến dịch Khuyến mãi Ngày lễ</span>
            <div id="ahp-on" class="sw ${hp.enabled ? "on" : ""}"></div>
          </div>
          <label class="f-lbl">Tên dịp lễ (hiện trực tiếp cho khách)</label>
          <input id="ahp-name" class="field" value="${esc(hp.name || "")}" placeholder="VD: Khuyến mãi Giáng Sinh · Mừng Tết 2027" />
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div><label class="f-lbl">Giảm giá gói (%)</label><input id="ahp-pct" type="number" min="0" max="80" class="field num" value="${hp.discount_percent ?? 20}" /></div>
            <div><label class="f-lbl">Thưởng nạp Ví (%)</label><input id="ahp-topup" type="number" min="0" max="50" class="field num" value="${hp.apply_topup_bonus_pct ?? 0}" /></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div><label class="f-lbl">Bắt đầu (Giờ VN)</label><input id="ahp-start" type="datetime-local" class="field num" style="font-size:12.5px;" value="${fmtDt(hp.start_at)}" /></div>
            <div><label class="f-lbl">Kết thúc (Giờ VN)</label><input id="ahp-end" type="datetime-local" class="field num" style="font-size:12.5px;" value="${fmtDt(hp.end_at)}" /></div>
          </div>
          <div style="display:grid;grid-template-columns:1.3fr 0.7fr;gap:8px;">
            <div><label class="f-lbl">Chế độ kết hợp với -40% đơn đầu</label>
              <select id="ahp-stack" class="field">
                <option value="best" ${hp.stack_mode !== "stack" ? "selected" : ""}>Lấy mức giảm cao nhất (An toàn)</option>
                <option value="stack" ${hp.stack_mode === "stack" ? "selected" : ""}>Cho phép cộng dồn (có trần)</option>
              </select>
            </div>
            <div><label class="f-lbl">Trần tối đa (%)</label><input id="ahp-cap" type="number" min="10" max="80" class="field num" value="${hp.max_stack_percent ?? 70}" /></div>
          </div>
          <label class="f-lbl">Áp dụng cho hạng gói</label>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin:6px 0;font-size:13px;">
            ${TIER_OPTIONS.map(([v, l]) => `<label style="display:inline-flex;align-items:center;gap:5px;"><input type="checkbox" class="ahp-t" value="${v}" ${(hp.apply_tiers || ["classic","pro","pro_max","ultra"]).includes(v) ? "checked" : ""} /> ${l}</label>`).join("")}
          </div>
        </div>

        <div class="card-item">
          <strong style="font-size:15px;display:block;margin-bottom:6px;">Google OAuth APK &amp; Email Quên mật khẩu (Gmail GAS / Resend / Brevo)</strong>
          <label class="f-lbl">Google OAuth Client Secret (Bắt buộc cho Google trên Android APK)</label>
          <input id="ab-gsec" type="password" class="field" style="font-family:var(--font-mono);font-size:12.5px;" value="${esc(go.client_secret || "")}" placeholder="GOCSPX-..." />
          <div class="mem-chip-row" style="margin-top:6px;">
            <span style="font-size:11px;font-family:var(--font-mono);flex:1;overflow:hidden;text-overflow:ellipsis;">${esc(base)}/auth/google/callback</span>
            <button type="button" class="ws-chip-btn tap" onclick="copyText('${esc(base)}/auth/google/callback','Đã copy Redirect URI')">Copy URI</button>
          </div>
          <div style="font-size:11.5px;color:var(--ink-3);margin-top:4px;line-height:1.45;">Gắn chính xác URI trên vào <b>Google Cloud Console → Clients → Chọn Web Client → URI de redirection autorisés → Lưu</b> (tránh lỗi 400 redirect_uri_mismatch).</div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
            <div><label class="f-lbl">Nhà cung cấp Email miễn phí</label>
              <select id="ae-prov" class="field" onchange="v60OnEmailProvChange(this.value)">
                <option value="gas" ${ec.provider === "gas" ? "selected" : ""}>Google Apps Script (Gmail miễn phí)</option>
                <option value="resend" ${(!ec.provider || ec.provider === "resend") ? "selected" : ""}>Resend (3.000 mail/tháng)</option>
                <option value="brevo" ${ec.provider === "brevo" ? "selected" : ""}>Brevo (300 mail/ngày)</option>
              </select>
            </div>
            <div><label id="ae-key-lbl" class="f-lbl">${ec.provider === "gas" ? "Web App URL (/exec) hoặc ID" : "Email API Key"}</label><input id="ae-key" type="${ec.provider === "gas" ? "text" : "password"}" class="field" value="${esc(ec.api_key || "")}" placeholder="${ec.provider === "gas" ? "https://script.google.com/macros/s/.../exec" : "re_... hoặc xkeysib-..."}" /></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div><label id="ae-from-lbl" class="f-lbl">${ec.provider === "gas" ? "Tên người gửi" : "From Email"}</label><input id="ae-from" class="field" value="${esc(ec.from_email || (ec.provider === "gas" ? "API AI" : "API AI <onboarding@resend.dev>"))}" /></div>
            <div><label class="f-lbl">Web Base URL (Pages)</label><input id="ae-web" class="field" value="${esc(ec.web_base_url || window.location.origin)}" placeholder="https://bang-gpt-plus.pages.dev" /></div>
          </div>
          <button type="button" id="btn-test-email" class="btn-s tap" style="width:100%;margin-top:8px;" onclick="v60AdminTestEmail()">Gửi thử email kiểm tra về Admin</button>
        </div>

        <div class="card-item">
          <strong style="font-size:15px;display:block;margin-bottom:6px;">Composio OAuth 1 chạm &amp; Quản lý Logo 24 Trình kết nối</strong>
          <div class="s-row" onclick="document.getElementById('ac-on').classList.toggle('on')">
            <span>Bật Composio OAuth 1 chạm (Gmail, Drive, Notion...)</span>
            <div id="ac-on" class="sw ${cc.enabled ? "on" : ""}"></div>
          </div>
          <label class="f-lbl">Composio API Key</label>
          <input id="ac-key" type="password" class="field" value="${esc(cc.api_key || "")}" placeholder="Dán Composio API Key..." />
          <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
            <button type="button" class="btn-s tap" style="flex:1;" onclick="v60OpenAdminConnectorIconsModal()">Đổi Logo 24 Kết nối</button>
            <button type="button" class="btn-p tap" style="flex:1;" onclick="v60AdminSaveAllV6()">Lưu toàn bộ cấu hình v6.0</button>
          </div>
        </div>`;

      const wrap = document.createElement("div");
      wrap.innerHTML = extraHtml;
      box.insertBefore(wrap, box.children[2] || null);
    }

    // Enhance Reset Requests tab so Admin can copy 1-click Reset Link when email API is off
    if (S.adminTab === "resets" && (d.resetRequests || []).some(r => r.key_code === "EMAIL_LINK")) {
      box.querySelectorAll(".card-item").forEach((card, i) => {
        const rr = d.resetRequests[i];
        if (rr && rr.key_code === "EMAIL_LINK" && rr.new_temp_password) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "btn-blue tap";
          btn.style.cssText = "height:34px;font-size:12px;margin-top:8px;";
          btn.textContent = "Copy link đổi MK gửi khách";
          btn.onclick = () => copyText(rr.new_temp_password, "Đã copy liên kết đặt lại mật khẩu 15 phút");
          card.appendChild(btn);
        }
      });
    }
  };

  window.v60AdminSaveAllV6 = async function () {
    const parseDt = id => {
      const v = document.getElementById(id)?.value;
      if (!v) return 0;
      const ts = Date.parse(v + ":00+07:00");
      return Number.isFinite(ts) ? ts : 0;
    };
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
    const google_oauth = {
      enabled: true,
      client_id: document.getElementById("ab-gid")?.value.trim() || "",
      client_secret: document.getElementById("ab-gsec")?.value.trim() || ""
    };
    const trial_config = {
      enabled: document.getElementById("ab-tr-on")?.classList.contains("on"),
      days: Number(document.getElementById("ab-tr-days")?.value || 14),
      daily_tokens: Number(document.getElementById("ab-tr-toks")?.value || 60000)
    };
    const holiday_promo = {
      enabled: document.getElementById("ahp-on")?.classList.contains("on"),
      name: document.getElementById("ahp-name")?.value.trim() || "Khuyến mãi Ngày lễ",
      discount_percent: Number(document.getElementById("ahp-pct")?.value || 0),
      apply_topup_bonus_pct: Number(document.getElementById("ahp-topup")?.value || 0),
      start_at: parseDt("ahp-start"),
      end_at: parseDt("ahp-end"),
      stack_mode: document.getElementById("ahp-stack")?.value || "best",
      max_stack_percent: Number(document.getElementById("ahp-cap")?.value || 70),
      apply_tiers: [...document.querySelectorAll(".ahp-t:checked")].map(x => x.value)
    };
    const email_config = {
      provider: document.getElementById("ae-prov")?.value || "resend",
      api_key: document.getElementById("ae-key")?.value.trim() || "",
      from_email: document.getElementById("ae-from")?.value.trim() || "API AI <onboarding@resend.dev>",
      web_base_url: document.getElementById("ae-web")?.value.trim().replace(/\/+$/, "") || ""
    };
    const composio_config = {
      enabled: document.getElementById("ac-on")?.classList.contains("on"),
      api_key: document.getElementById("ac-key")?.value.trim() || "",
      base_url: "https://backend.composio.dev"
    };

    const r = await apiFetch("/admin/config/save", {
      method: "POST",
      body: { billing_config, google_oauth, trial_config, holiday_promo, email_config, composio_config }
    });
    if (r.ok) {
      haptic("ok");
      showToast("Đã lưu toàn bộ cấu hình VietQR, Lễ, Google, Email & Composio!", "ok");
      loadAdminData();
    } else {
      showToast("Lỗi lưu cấu hình v6.0", "err");
    }
  };
  // Point original save button to save all v6 fields cleanly too
  window.adminSaveBillingAndGoogle = window.v60AdminSaveAllV6;

  window.v60OnEmailProvChange = function (prov) {
    const isGas = prov === "gas";
    const kLbl = document.getElementById("ae-key-lbl");
    const kInp = document.getElementById("ae-key");
    const fLbl = document.getElementById("ae-from-lbl");
    const fInp = document.getElementById("ae-from");
    if (kLbl) kLbl.textContent = isGas ? "Web App URL (/exec) hoặc ID" : "Email API Key";
    if (kInp) {
      kInp.type = isGas ? "text" : "password";
      kInp.placeholder = isGas ? "https://script.google.com/macros/s/.../exec" : "re_... hoặc xkeysib-...";
    }
    if (fLbl) fLbl.textContent = isGas ? "Tên người gửi" : "From Email";
    if (fInp && isGas && fInp.value.includes("resend.dev")) fInp.value = "API AI";
  };

  window.v60AdminTestEmail = async function () {
    const btn = document.getElementById("btn-test-email");
    if (btn) { btn.disabled = true; btn.textContent = "Đang gửi email kiểm tra..."; }
    try {
      const email_config = {
        provider: document.getElementById("ae-prov")?.value || "resend",
        api_key: document.getElementById("ae-key")?.value.trim() || "",
        from_email: document.getElementById("ae-from")?.value.trim() || "API AI <onboarding@resend.dev>"
      };
      const r = await apiFetch("/admin/email/test", { method: "POST", body: { email_config } });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gửi thử thất bại");
      haptic("ok"); showToast(d.message, "ok");
    } catch (e) {
      haptic("err"); showToast(e.message, "err");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Gửi thử email kiểm tra về Admin"; }
    }
  };

  window.v60OpenAdminConnectorIconsModal = function () {
    const list24 = window.OAUTH_CONNECTORS_24 || [];
    const curIcons = { ...(S.adminData?.config?.connector_icons || {}) };
    window.__ADMIN_CONN_ICONS_DRAFT__ = curIcons;
    openModal(`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <h3 style="font-size:16.5px;font-weight:600;margin:0;">Quản lý Logo 24 Trình kết nối (Toàn hệ thống)</h3>
        <button type="button" class="mini-act tap" onclick="closeModal()">${ICON_X}</button>
      </div>
      <div style="max-height:56dvh;overflow-y:auto;display:flex;flex-direction:column;gap:8px;">
        ${list24.map(c => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--rim);">
          <div id="aci-prev-${c.id}">${window.getConnectorIconHtml(c.id, curIcons[c.id] || "", 34)}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:12.5px;font-weight:500;">${esc(c.name)}</div>
            <input id="aci-in-${c.id}" class="field" style="min-height:34px;height:34px;font-size:11.5px;padding:4px 10px;margin-top:3px;" value="${esc(curIcons[c.id] || "")}" placeholder="Mặc định SVG" oninput="window.__ADMIN_CONN_ICONS_DRAFT__['${c.id}']=this.value.trim();v60PreviewIconFromInput('${c.id}','aci-prev-${c.id}','aci-in-${c.id}')" />
          </div>
          <button type="button" class="btn-s tap" style="height:34px;padding:0 10px;font-size:11.5px;" onclick="v60TriggerMcpIconUpload('admin_connector','${c.id}','aci-prev-${c.id}','aci-in-${c.id}')">Ảnh</button>
        </div>`).join("")}
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
        <button type="button" class="btn-s tap" onclick="closeModal()">Hủy</button>
        <button type="button" class="btn-p tap" onclick="v60SaveAdminConnectorIcons()">Lưu Logo hệ thống</button>
      </div>`);
  };

  window.v60SaveAdminConnectorIcons = async function () {
    const out = {};
    (window.OAUTH_CONNECTORS_24 || []).forEach(c => {
      const v = document.getElementById("aci-in-" + c.id)?.value?.trim();
      if (v) out[c.id] = v;
    });
    const r = await apiFetch("/admin/config/save", { method: "POST", body: { connector_icons: out } });
    if (r.ok) {
      if (window.V50?.publicAuthCfg) window.V50.publicAuthCfg.connectorIcons = out;
      closeModal(); haptic("ok"); showToast("Đã lưu Logo Trình kết nối toàn hệ thống!", "ok");
      loadAdminData();
    } else showToast("Lỗi lưu logo", "err");
  };

  /* =========================================================================
     8. SEGMENTED PILL RESIZEOBSERVER FIX (NEVER SKEWS LEFT) & BOOT WIRING
     ========================================================================= */
  function attachSegmentedResizeFix() {
    const syncSeg = (segId, thumbId) => {
      const seg = document.getElementById(segId), th = document.getElementById(thumbId);
      const act = seg?.querySelector(".seg-btn.active");
      if (seg && th && act && typeof moveSegThumb === "function") moveSegThumb(th, act);
    };
    const runAll = () => { syncSeg("mode-seg", "mode-thumb"); syncSeg("auth-seg", "auth-thumb"); };
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(runAll);
      const mSeg = document.getElementById("mode-seg");
      const aSeg = document.getElementById("auth-seg");
      if (mSeg) ro.observe(mSeg);
      if (aSeg) ro.observe(aSeg);
    }
    setTimeout(runAll, 120);
    setTimeout(runAll, 450);
  }

  if (_initParams.resetToken) handleStartupUrlParams();
  setTimeout(() => {
    bindModelQuickSwapLongPress();
    attachSegmentedResizeFix();
    handleStartupUrlParams();
    v60SyncSheetLabels();
    window.renderModelDropdown();
  }, 380);
})();
