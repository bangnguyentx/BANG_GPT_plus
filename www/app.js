/* API AI v3.1 Craft — Modular Engine (Sticky API + 4-Tier Key Matrix + Multi-Provider + GitHub Repo Skills + Notice/Maintenance) */
const META = window.__APP_META__ || { verCode: 20, verName: "2.0.20", repo: "bangnguyentx/BANG_GPT", workerUrl: "" };

const THINK_LEVELS = [
  { id: "low", title: "Thấp", sub: "Nhanh và gọn", prompt: "Trả lời ngắn gọn, trực diện." },
  { id: "medium", title: "Trung bình", sub: "Độ sâu cân bằng", prompt: "Phân tích cân bằng, rõ ràng." },
  { id: "high", title: "Cao", sub: "Suy luận sâu", prompt: "Suy luận kỹ từng bước, kiểm tra kỹ chi tiết." }
];
const PLAN_OPTIONS = [
  ["week", "Tuần (7 ngày)"], ["1m", "1 Tháng (30 ngày)"], ["3m", "3 Tháng (90 ngày)"],
  ["6m", "6 Tháng (180 ngày)"], ["9m", "9 Tháng (270 ngày)"], ["12m", "12 Tháng (365 ngày)"],
  ["18m", "18 Tháng (540 ngày)"], ["1y", "1 Năm (365 ngày)"], ["2y", "2 Năm (730 ngày)"]
];
const TIER_OPTIONS = [
  ["classic", "Classic"],
  ["pro", "Pro"],
  ["pro_max", "Pro Max"],
  ["ultra", "Ultra"]
];
const TIER_LABELS = { classic: "Classic", pro: "Pro", pro_max: "Pro Max", ultra: "Ultra", admin: "Admin" };

const DEFAULT_CFG = {
  id: "cfg", serverUrl: META.workerUrl, token: "", deviceId: "",
  selectedModel: "gpt-6.2-sol", thinkingLevel: "high", workMode: "chat",
  personalIntel: true, imgQuality: "hd", ultraGlass: false, haptics: true,
  blurPx: 18, glassAlpha: 0.78, wallpaper: "",
  agentCfg: {
    enabledRoles: { architect: true, coder: true, reviewer: true, tester: true },
    models: { architect: "gpt-6.2-astra", coder: "gpt-6.2-sol", reviewer: "gpt-6.2-astra", tester: "gpt-6-luna" },
    pauseAfterArchitect: false,
    maxFixLoops: 1
  }
};

const ICON_PIN = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a1 1 0 0 1 1-1h1V3H7v2h1a1 1 0 0 1 1 1Z"/></svg>`;
const ICON_X = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>`;
const ICON_EDIT = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
const ICON_CHECK = `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>`;
const ICON_LOCK = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`;

let db = null;
function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open("ChatGPTProAppDB_v3", 1);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      ["chats", "skills", "notebooks", "memories", "library", "kv"].forEach(s => {
        if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: "id" });
      });
    };
    req.onsuccess = () => { db = req.result; res(db); };
    req.onerror = () => rej(req.error);
  });
}
const dbPut = (s, o) => new Promise((r, j) => { const tx = db.transaction(s, "readwrite"); tx.objectStore(s).put(o); tx.oncomplete = () => r(o); tx.onerror = () => j(tx.error); });
const dbAll = s => new Promise((r, j) => { const q = db.transaction(s, "readonly").objectStore(s).getAll(); q.onsuccess = () => r(q.result || []); q.onerror = () => j(q.error); });
const dbGet = (s, id) => new Promise((r, j) => { const q = db.transaction(s, "readonly").objectStore(s).get(id); q.onsuccess = () => r(q.result || null); q.onerror = () => j(q.error); });
const dbDel = (s, id) => new Promise((r, j) => { const tx = db.transaction(s, "readwrite"); tx.objectStore(s).delete(id); tx.oncomplete = () => r(); tx.onerror = () => j(tx.error); });

let S = {
  cfg: { ...DEFAULT_CFG }, user: null, system: { notice: {}, maintenance: {} },
  models: [
    { id: "auto", title: "Tự động", short: "Auto", sub: "Tự chọn model phù hợp nhất", mapped: "auto", cost_multiplier: 1.0, allowed: true },
    { id: "gpt-6-luna", title: "GPT 6 Luna", short: "GPT 6 Luna", sub: "Nhanh, tiết kiệm · ×0.7", mapped: "gpt-6-luna", cost_multiplier: 0.7, allowed: true },
    { id: "gpt-6.2-sol", title: "GPT 6.2 Sol", short: "GPT 6.2 Sol", sub: "Đa năng, ngữ cảnh 500K · ×1.2", mapped: "gpt-6.2-sol", cost_multiplier: 1.2, allowed: true },
    { id: "gpt-6.2-astra", title: "GPT 6.2 Astra", short: "GPT 6.2 Astra", sub: "Lập trình & suy luận sâu · ×2.2", mapped: "gpt-6.2-astra", cost_multiplier: 2.2, allowed: true }
  ],
  chats: [], activeChatId: null, skills: [], notebooks: [], activeNbId: null,
  memories: [], lastCrossRecalls: [], library: [], filter: "all",
  activeTool: null, skillIds: [], atts: [], streaming: false, abort: null,
  speakingMsgId: null, rec: null, recording: false, liveMode: false,
  adminData: null, adminTab: "keys", selectedTierTab: "classic", canvasPreviewOnly: false
};

const esc = s => String(s || "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
function haptic(t = "tap") {
  if (!S.cfg?.haptics || !navigator.vibrate) return;
  try { navigator.vibrate({ tap: 8, switch: 14, ok: [10, 26, 12], err: [22, 36, 22] }[t] || 8); } catch {}
}


/* ===== APPLE DESIGN FLUID PHYSICS ENGINE (WWDC 2018: Springs, Velocity Handoff, Momentum Projection, Rubber-Banding) ===== */
const prefersReducedMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Apple's exact momentum projection function (decelerationRate 0.998 normal, 0.99 snappy)
function appleProject(velocityPxPerSec, decelerationRate = 0.994) {
  return (velocityPxPerSec / 1000) * decelerationRate / (1 - decelerationRate);
}

// Apple's exact rubber-banding function for soft boundaries
function appleRubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

// Critically damped / momentum harmonic spring driven by requestAnimationFrame (interruptible!)
const activeSprings = new WeakMap();
function stopSpring(el) {
  const prev = activeSprings.get(el);
  if (prev) { cancelAnimationFrame(prev.raf); activeSprings.delete(el); }
}

function runSpring(el, { from, to, velocity = 0, damping = 1.0, response = 0.34, onUpdate, onDone }) {
  stopSpring(el);
  if (prefersReducedMotion() || Math.abs(to - from) < 0.5 && Math.abs(velocity) < 5) {
    onUpdate(to);
    if (onDone) onDone();
    return;
  }
  const stiffness = Math.pow((2 * Math.PI) / response, 2);
  const dampingCoeff = (4 * Math.PI * damping) / response;
  let pos = from, vel = velocity, lastTs = performance.now();
  const state = { raf: 0, get pos() { return pos; }, get vel() { return vel; } };

  const tick = now => {
    const dt = Math.min(0.032, Math.max(0.001, (now - lastTs) / 1000));
    lastTs = now;
    const force = -stiffness * (pos - to) - dampingCoeff * vel;
    vel += force * dt;
    pos += vel * dt;
    onUpdate(pos);
    if (Math.abs(pos - to) < 0.4 && Math.abs(vel) < 4) {
      onUpdate(to);
      activeSprings.delete(el);
      if (onDone) onDone();
      return;
    }
    state.raf = requestAnimationFrame(tick);
  };
  state.raf = requestAnimationFrame(tick);
  activeSprings.set(el, state);
}

// Transform-only Segmented Pill Positioning (Hallmark Floor 2: NEVER animate width!)
function moveSegThumb(thumbEl, targetBtn) {
  if (!thumbEl || !targetBtn) return;
  const scaleX = Math.max(0.1, targetBtn.offsetWidth / 100);
  thumbEl.style.transform = `translate3d(${targetBtn.offsetLeft}px, 0, 0) scaleX(${scaleX})`;
}

/* ===== 7-TAP SECRET ADMIN BACKDOOR ON LOGIN LOGO (5B) ===== */
let logoTapCount = 0, logoTapTimer = null;
function handleSecretLogoTap() {
  haptic("tap");
  logoTapCount++;
  clearTimeout(logoTapTimer);
  logoTapTimer = setTimeout(() => { logoTapCount = 0; }, 1600);
  if (logoTapCount >= 7) {
    logoTapCount = 0;
    haptic("ok");
    openServerUrlModal();
  }
}

async function boot() {
  await openDB();
  const saved = await dbGet("kv", "cfg");
  if (saved) {
    S.cfg = {
      ...DEFAULT_CFG,
      ...saved,
      agentCfg: {
        ...DEFAULT_CFG.agentCfg,
        ...(saved.agentCfg || {}),
        enabledRoles: { ...DEFAULT_CFG.agentCfg.enabledRoles, ...(saved.agentCfg?.enabledRoles || {}) },
        models: { ...DEFAULT_CFG.agentCfg.models, ...(saved.agentCfg?.models || {}) }
      }
    };
  }
  if (!S.cfg.serverUrl && META.workerUrl) S.cfg.serverUrl = META.workerUrl;
  if (!S.cfg.deviceId) S.cfg.deviceId = "dev-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  // Migrate legacy chemistry selectedModel IDs cleanly
  const legacyMap = { hydrogen: "gpt-6-luna", neon: "gpt-6.2-sol", carbon: "gpt-6.2-astra" };
  if (legacyMap[S.cfg.selectedModel]) S.cfg.selectedModel = legacyMap[S.cfg.selectedModel];
  await dbPut("kv", S.cfg);

  const storedSkills = await dbAll("skills");
  for (const bsk of (Array.isArray(window.BUILTIN_SKILLS_PACK) ? window.BUILTIN_SKILLS_PACK : [])) {
    if (!storedSkills.some(x => x.id === bsk.id)) { await dbPut("skills", bsk); storedSkills.push(bsk); }
  }
  S.skills = storedSkills;
  S.notebooks = await dbAll("notebooks");
  S.library = (await dbAll("library")).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  applyTheme();
  renderSkillStack();
  bindEvents();
  bindGestures();
  setAuthTab("login");

  if (!S.cfg.token || !S.cfg.serverUrl) showAuthGate(true);
  else await refreshSession();
  setTimeout(() => checkAppUpdate(true), 3500);
}

function applyTheme() {
  document.body.classList.toggle("ultra-glass", Boolean(S.cfg.ultraGlass));
  document.documentElement.style.setProperty("--blur", `${S.cfg.blurPx}px`);
  document.documentElement.style.setProperty("--g-float", `rgba(22, 25, 34, ${S.cfg.glassAlpha})`);
  const w = document.getElementById("wallpaper");
  if (S.cfg.wallpaper) { w.style.backgroundImage = `url(${S.cfg.wallpaper})`; w.classList.add("custom"); }
  else { w.style.backgroundImage = ""; w.classList.remove("custom"); }
  document.querySelectorAll("[data-iq]").forEach(b => b.classList.toggle("lg-active", b.dataset.iq === S.cfg.imgQuality));
}

function toggleAcc(id, chId = null) {
  haptic("tap");
  const el = document.getElementById(id); if (!el) return;
  const open = el.classList.toggle("open");
  if (chId) document.getElementById(chId)?.classList.toggle("rot", open);
}

function getApiBase() { return (S.cfg.serverUrl || "").trim().replace(/\/+$/, ""); }
async function apiFetch(path, { method = "GET", body = null, auth = true, signal = null } = {}) {
  const base = getApiBase();
  if (!base) throw new Error("Ứng dụng chưa có địa chỉ máy chủ. Liên hệ Admin.");
  const headers = { "Content-Type": "application/json", "X-Device-Id": S.cfg.deviceId };
  if (auth && S.cfg.token) headers["Authorization"] = `Bearer ${S.cfg.token}`;
  return fetch(`${base}${path}`, { method, headers, body: body ? JSON.stringify(body) : null, signal });
}

/* ===== AUTH, KEY GATE & SYSTEM NOTICE / MAINTENANCE ===== */
function setAuthTab(tab) {
  haptic("tap");
  const seg = document.getElementById("auth-seg"), th = document.getElementById("auth-thumb");
  seg.querySelectorAll(".seg-btn").forEach(b => b.classList.toggle("active", b.dataset.atab === tab));
  const act = seg.querySelector(`.seg-btn[data-atab="${tab}"]`);
  if (act && th) moveSegThumb(th, act);
  document.getElementById("form-login").style.display = tab === "login" ? "flex" : "none";
  document.getElementById("form-register").style.display = tab === "register" ? "flex" : "none";
}
function showAuthGate(show) {
  document.getElementById("auth-gate").classList.toggle("open", show);
  if (show) { document.getElementById("key-gate").classList.remove("open"); document.getElementById("maint-gate").classList.remove("open"); setTimeout(() => setAuthTab("login"), 30); }
}
function showKeyGate(show, msg = null) {
  const el = document.getElementById("key-gate"); el.classList.toggle("open", show);
  if (show) {
    document.getElementById("key-gate-email").textContent = S.user?.email || "-";
    const d = document.getElementById("key-gate-desc");
    if (msg) d.textContent = msg;
    else if (S.user?.licenseReason === "KEY_EXPIRED") d.textContent = "Key của bạn đã hết hạn. Vui lòng nhập Key mới để tiếp tục.";
    else if (S.user?.licenseReason === "KEY_REVOKED") d.textContent = "Key này đã bị Quản trị viên thu hồi.";
    else d.textContent = "Mỗi Key gắn cố định cho một tài khoản Email. Nhập mã Key để tiếp tục.";
  }
}

function applySystemMeta(sys) {
  S.system = sys || { notice: {}, maintenance: {} };
  const isMaint = Boolean(S.system.maintenance?.enabled) && S.user?.role !== "admin";
  document.getElementById("maint-gate").classList.toggle("open", isMaint);
  if (isMaint) document.getElementById("maint-msg").textContent = S.system.maintenance.message || "Hệ thống API AI đang bảo trì.";

  const nBar = document.getElementById("app-notice-bar");
  const nText = document.getElementById("app-notice-text");
  if (S.system.notice?.enabled && S.system.notice?.text) {
    nText.textContent = S.system.notice.text;
    nBar.classList.toggle("warn", S.system.notice.level === "warn");
    nBar.classList.add("show");
  } else {
    nBar.classList.remove("show");
  }
}

async function submitRegister() {
  haptic("tap");
  const email = document.getElementById("rg-email").value.trim(), password = document.getElementById("rg-pass").value, confirmPassword = document.getElementById("rg-pass2").value;
  if (!email || !password || !confirmPassword) return showToast("Nhập đầy đủ Email và Mật khẩu");
  if (password !== confirmPassword) return showToast("Nhập lại mật khẩu không khớp");
  try {
    const r = await apiFetch("/auth/register", { method: "POST", auth: false, body: { email, password, confirmPassword, deviceId: S.cfg.deviceId } });
    const data = await r.json(); if (!r.ok) throw new Error(data.error || "Đăng ký thất bại");
    S.cfg.token = data.token; await dbPut("kv", S.cfg);
    await onSessionReady(data.user, data.models, data.system);
    haptic("ok"); showToast("Đăng ký thành công, vui lòng nhập Key");
  } catch (e) { haptic("err"); showToast(e.message); }
}
async function submitLogin() {
  haptic("tap");
  const email = document.getElementById("lg-email").value.trim(), password = document.getElementById("lg-pass").value;
  if (!email || !password) return showToast("Nhập Email và Mật khẩu");
  try {
    const r = await apiFetch("/auth/login", { method: "POST", auth: false, body: { email, password, deviceId: S.cfg.deviceId } });
    const data = await r.json(); if (!r.ok) throw new Error(data.error || "Đăng nhập thất bại");
    S.cfg.token = data.token; await dbPut("kv", S.cfg);
    await onSessionReady(data.user, data.models, data.system);
    haptic("ok"); showToast(`Đã đăng nhập ${data.user.email}`);
  } catch (e) { haptic("err"); showToast(e.message); }
}
async function refreshSession() {
  try {
    const r = await apiFetch("/auth/me");
    const data = await r.json();
    if (!r.ok) {
      if (r.status === 401 || r.status === 403) { showToast(data.error || "Đăng nhập lại"); S.cfg.token = ""; await dbPut("kv", S.cfg); showAuthGate(true); return; }
      throw new Error(data.error);
    }
    await onSessionReady(data.user, data.models, data.system);
  } catch (e) { showToast(e.message); if (!S.user) showAuthGate(true); }
}
async function onSessionReady(user, models, system) {
  S.user = user;
  if (Array.isArray(models) && models.length) S.models = models;
  // Ensure selectedModel exists and is allowed
  const curM = S.models.find(x => x.id === S.cfg.selectedModel);
  if (!curM || !curM.allowed) {
    const firstOk = S.models.find(x => x.allowed && x.id !== "auto") || S.models.find(x => x.allowed) || S.models[0];
    if (firstOk) { S.cfg.selectedModel = firstOk.id; dbPut("kv", S.cfg); }
  }
  showAuthGate(false);
  applySystemMeta(system);
  const mustChg = Boolean(user.mustChangePassword) && user.role !== "admin";
  showForcePwdGate(mustChg);
  showKeyGate(!mustChg && !user.licenseActive && user.role !== "admin");
  await pullCloudData();
  syncAccountUI();
  renderModelDropdown();
  renderSidebar();
  renderMemoryBar();
  renderMessages();
  if (user.role === "admin") loadAdminData(true);
}
async function submitActivateKey() {
  haptic("tap");
  const keyCode = document.getElementById("key-activate-in").value.trim();
  if (!keyCode) return showToast("Nhập mã Key");
  try {
    const r = await apiFetch("/auth/activate-key", { method: "POST", body: { keyCode } });
    const data = await r.json(); if (!r.ok) throw new Error(data.error || "Kích hoạt thất bại");
    document.getElementById("key-activate-in").value = "";
    haptic("ok"); showToast(`Đã kích hoạt ${data.user.planLabel}`);
    await onSessionReady(data.user, data.models, data.system);
  } catch (e) { haptic("err"); showToast(e.message); }
}
function openForgotModal() {
  openModal(`
    <h3 style="font-size:18px;font-weight:520;margin-bottom:6px;">Quên mật khẩu</h3>
    <p style="font-size:13px;color:var(--ink-2);margin-bottom:12px;">Nhập đúng Email đã đăng ký và mã Key đang gắn với Email đó.</p>
    <label class="f-lbl">Email quên mật khẩu</label><input id="fg-email" type="email" class="field" placeholder="name@gmail.com" />
    <label class="f-lbl">Key của email đó</label><input id="fg-key" class="field" placeholder="APIAI-PRO-1M-XXXX-XXXX" />
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">
      <button class="btn-s tap" onclick="closeModal()">Hủy</button>
      <button class="btn-p tap" onclick="submitForgotPassword()">Xác nhận</button>
    </div>`);
}
async function submitForgotPassword() {
  const email = document.getElementById("fg-email").value.trim(), keyCode = document.getElementById("fg-key").value.trim();
  if (!email || !keyCode) return showToast("Nhập đủ Email và Key");
  try {
    const r = await apiFetch("/auth/forgot-password", { method: "POST", auth: false, body: { email, keyCode } });
    const data = await r.json(); if (!r.ok) throw new Error(data.error || "Xác minh thất bại");
    haptic("ok");
    openModal(`<div style="text-align:center;padding:6px 0;">
      <h3 style="font-size:18px;font-weight:520;margin-bottom:8px;">Đã tiếp nhận yêu cầu</h3>
      <p style="font-size:14.5px;color:var(--info-ink);line-height:1.55;">${esc(data.message)}</p>
      <button class="btn-p tap" style="width:100%;margin-top:16px;" onclick="closeModal()">Đã hiểu</button></div>`);
  } catch (e) { haptic("err"); showToast(e.message); }
}
async function logoutUser() {
  haptic("tap"); S.cfg.token = ""; S.user = null; S.chats = []; S.memories = []; S.activeChatId = null;
  await dbPut("kv", S.cfg); showKeyGate(false); showForcePwdGate(false); document.getElementById("maint-gate").classList.remove("open"); showAuthGate(true); showToast("Đã đăng xuất");
}
function openServerUrlModal() {
  openModal(`
    <h3 style="font-size:17px;font-weight:520;margin-bottom:6px;">Địa chỉ Server Cloudflare (Admin)</h3>
    <p style="font-size:13px;color:var(--ink-2);margin-bottom:10px;">Chỉ dành cho Quản trị viên. Dán link Worker API AI.</p>
    <input id="srv-url-in" class="field" value="${esc(S.cfg.serverUrl)}" placeholder="https://..." />
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
      <button class="btn-s tap" onclick="closeModal()">Hủy</button>
      <button class="btn-p tap" onclick="saveServerUrl()">Lưu và kiểm tra</button>
    </div>`);
}
async function saveServerUrl() {
  const val = document.getElementById("srv-url-in").value.trim().replace(/\/+$/, "");
  if (!val.startsWith("http")) return showToast("URL phải bắt đầu bằng https://");
  S.cfg.serverUrl = val; await dbPut("kv", S.cfg); closeModal();
  try { const r = await fetch(val + "/health"); showToast(r.ok ? "Kết nối Server thành công" : "HTTP " + r.status); }
  catch (e) { showToast("Lỗi kết nối: " + e.message); }
}


/* ===== FORCED PASSWORD CHANGE & SELF-CHANGE PASSWORD (4B + ĐỘT PHÁ) ===== */
function showForcePwdGate(show) {
  const el = document.getElementById("force-pwd-gate");
  if (el) el.classList.toggle("open", Boolean(show));
}

async function submitForcedPasswordChange() {
  haptic("tap");
  const newPassword = document.getElementById("fp-new1").value;
  const confirmPassword = document.getElementById("fp-new2").value;
  if (newPassword.length < 6) return showToast("Mật khẩu mới phải từ 6 ký tự");
  if (newPassword !== confirmPassword) return showToast("Nhập lại mật khẩu không khớp");
  try {
    const r = await apiFetch("/auth/change-password", { method: "POST", body: { newPassword, confirmPassword } });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Đổi mật khẩu thất bại");
    S.cfg.token = data.token;
    await dbPut("kv", S.cfg);
    document.getElementById("fp-new1").value = "";
    document.getElementById("fp-new2").value = "";
    showForcePwdGate(false);
    haptic("ok");
    showToast("Đã lưu mật khẩu mới thành công");
    await onSessionReady(data.user, data.models, data.system);
  } catch (e) { haptic("err"); showToast(e.message); }
}

function openSelfChangePasswordModal() {
  haptic("tap");
  openModal(`
    <h3 style="font-size:17px;font-weight:520;margin-bottom:6px;">Đổi mật khẩu</h3>
    <p style="font-size:13px;color:var(--ink-2);margin-bottom:10px;">Cập nhật mật khẩu mới cho tài khoản <b>${esc(S.user?.email || "")}</b>.</p>
    <label class="f-lbl">Mật khẩu hiện tại</label><input id="sc-cur" type="password" class="field" placeholder="Nhập mật khẩu hiện tại" />
    <label class="f-lbl">Mật khẩu mới (tối thiểu 6 ký tự)</label><input id="sc-n1" type="password" class="field" placeholder="Nhập mật khẩu mới" />
    <label class="f-lbl">Nhập lại mật khẩu mới</label><input id="sc-n2" type="password" class="field" placeholder="Nhập lại mật khẩu mới" />
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
      <button class="btn-s tap" onclick="closeModal()">Hủy</button>
      <button class="btn-p tap" onclick="submitSelfPasswordChange()">Đổi mật khẩu</button>
    </div>`);
}

async function submitSelfPasswordChange() {
  const currentPassword = document.getElementById("sc-cur").value;
  const newPassword = document.getElementById("sc-n1").value;
  const confirmPassword = document.getElementById("sc-n2").value;
  if (!currentPassword || newPassword.length < 6) return showToast("Nhập đầy đủ mật khẩu (tối thiểu 6 ký tự)");
  if (newPassword !== confirmPassword) return showToast("Nhập lại mật khẩu mới không khớp");
  try {
    const r = await apiFetch("/auth/change-password", { method: "POST", body: { currentPassword, newPassword, confirmPassword } });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Đổi mật khẩu thất bại");
    S.cfg.token = data.token;
    await dbPut("kv", S.cfg);
    closeModal();
    haptic("ok");
    showToast("Đã đổi mật khẩu thành công");
  } catch (e) { haptic("err"); showToast(e.message); }
}

/* ===== CLOUD SYNC & ACCOUNT UI (HIDES SERVER URL FROM REGULAR USERS!) ===== */
async function pullCloudData() {
  try {
    const [rc, rm] = await Promise.all([apiFetch("/sync/chats"), apiFetch("/sync/memories")]);
    if (rc.ok) S.chats = ((await rc.json()).chats || []).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    if (rm.ok) S.memories = (await rm.json()).memories || [];
  } catch {}
}
function syncAccountUI() {
  const u = S.user; if (!u) return;
  const isAdmin = u.role === "admin";
  document.getElementById("sb-user-email").textContent = u.email;
  document.getElementById("sb-avatar").textContent = (u.email || "A").charAt(0).toUpperCase();
  document.getElementById("sb-user-plan").textContent = u.planLabel || "Chưa kích hoạt";
  document.getElementById("set-email").textContent = u.email;
  const sp = document.getElementById("set-plan");
  sp.textContent = u.planLabel || "Chưa kích hoạt";
  sp.className = `tag-st ${isAdmin ? "st-active" : ("tier-" + (u.keyTier || "classic"))}`;
  document.getElementById("set-expiry").textContent = u.expiresAt ? `Hết hạn: ${new Date(u.expiresAt).toLocaleString("vi-VN")}` : (isAdmin ? "Quyền Quản trị viên" : "Chưa kích hoạt");
  document.getElementById("set-usage").textContent = isAdmin
    ? "Không giới hạn lượt và model"
    : `Hôm nay: ${u.dailyMsgs}/${u.limits?.daily_msgs ?? 0} tin · ${Math.round((u.dailyTokens || 0) / 1000)}K/${Math.round((u.limits?.daily_tokens || 0) / 1000)}K token`;
  document.getElementById("hero-quota-txt").textContent = isAdmin
    ? "Admin · Toàn quyền API AI"
    : `${u.planLabel} · Còn ${Math.max(0, (u.limits?.daily_msgs ?? 0) - u.dailyMsgs)} lượt hôm nay`;

  // STRICT VISIBILITY: Only Admin sees Admin Panel & Server URL row!
  document.getElementById("btn-open-admin").style.display = isAdmin ? "flex" : "none";
  document.getElementById("set-server-row").style.display = isAdmin ? "flex" : "none";
  document.getElementById("sw-personal").classList.toggle("on", S.cfg.personalIntel);
  setWorkMode(S.cfg.workMode || "chat", false);
}

/* ===== GITHUB REPOSITORY INTACT SKILL IMPORTER (3A + ĐỘT PHÁ + PRO MAX+ GATE) ===== */
const ALLOWED_REPO_EXT = /\.(md|txt|json|js|ts|jsx|tsx|css|scss|html|py|sql|yaml|yml|toml|xml|sh|pine|mq5)$/i;

function canUseGithubSkills() {
  return S.user?.role === "admin" || Boolean(S.user?.limits?.allow_github_skills);
}

function openGithubImportModal() {
  haptic("tap");
  if (!canUseGithubSkills()) {
    haptic("err");
    return showToast("Tính năng cài GitHub Repo yêu cầu Key hạng Pro Max hoặc Ultra");
  }
  openModal(`
    <h3 style="font-size:17px;font-weight:520;margin-bottom:6px;">Cài Repository từ GitHub vào Skills</h3>
    <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:10px;">Tải nguyên trạng cây thư mục code/tài liệu của kho GitHub. Khi chat, API AI tự dùng Mini-RAG rút đúng file liên quan.</p>
    <label class="f-lbl">Link GitHub Repository</label>
    <input id="gh-url" class="field" placeholder="https://github.com/owner/repo" />
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <div><label class="f-lbl">Nhánh (tùy chọn)</label><input id="gh-branch" class="field" placeholder="Tự động (main)" /></div>
      <div><label class="f-lbl">Thư mục con (tùy chọn)</label><input id="gh-sub" class="field" placeholder="vd: skills/unslop" /></div>
    </div>
    <label class="f-lbl">GitHub Token (chỉ cần nếu là repo Private)</label>
    <input id="gh-pat" type="password" class="field" placeholder="ghp_... (để trống nếu Public)" />
    <div id="gh-progress" style="font-size:12.5px;color:var(--accent-ink);margin-top:10px;min-height:18px;"></div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
      <button class="btn-s tap" onclick="closeModal()">Hủy</button>
      <button id="gh-go-btn" class="btn-p tap" onclick="runGithubRepoImport()">Tải nguyên trạng</button>
    </div>`);
}

function parseGithubUrl(rawUrl) {
  const clean = (rawUrl || "").trim().replace(/\.git$/, "").replace(/\/+$/, "");
  const m = clean.match(/github\.com\/([^/\s]+)\/([^/\s]+)/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

async function fetchGithubRepoFiles(owner, repo, branchInput, subPath, pat, onStatus) {
  const headers = { "Accept": "application/vnd.github+json" };
  if (pat) headers["Authorization"] = `Bearer ${pat}`;

  onStatus("Đang kết nối kho GitHub...");
  const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!metaRes.ok) throw new Error(`Không truy cập được repo (HTTP ${metaRes.status}). Nếu là repo Private hãy nhập Token.`);
  const meta = await metaRes.json();
  const branch = (branchInput || "").trim() || meta.default_branch || "main";

  onStatus(`Đang đọc cây thư mục nhánh ${branch}...`);
  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`, { headers });
  if (!treeRes.ok) throw new Error(`Không đọc được cây thư mục (HTTP ${treeRes.status}).`);
  const treeData = await treeRes.json();
  const cleanSub = (subPath || "").trim().replace(/^\/+|\/+$/g, "");

  let blobs = (treeData.tree || []).filter(item => {
    if (item.type !== "blob") return false;
    if (cleanSub && !item.path.startsWith(cleanSub + "/") && item.path !== cleanSub) return false;
    if (/(node_modules|\.git|dist\/|build\/|lock\.json)/i.test(item.path)) return false;
    if ((item.size || 0) > 120000) return false; // skip huge files >120KB
    return ALLOWED_REPO_EXT.test(item.path);
  });

  // Prioritize SKILL.md, README.md, references/, then code files; cap at 60 files for crisp speed
  blobs.sort((a, b) => {
    const rank = p => /skill\.md$/i.test(p) ? 0 : (/readme\.md$/i.test(p) ? 1 : (/references\//i.test(p) ? 2 : 3));
    return rank(a.path) - rank(b.path) || a.path.length - b.path.length;
  });
  blobs = blobs.slice(0, 60);
  if (!blobs.length) throw new Error("Không tìm thấy tệp văn bản/code phù hợp trong kho.");

  const files = [];
  for (let i = 0; i < blobs.length; i++) {
    const it = blobs[i];
    onStatus(`Đang tải tệp ${i + 1}/${blobs.length}: ${it.path}`);
    try {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${it.path.split("/").map(encodeURIComponent).join("/")}`;
      const r = await fetch(rawUrl, pat ? { headers: { Authorization: `Bearer ${pat}` } } : {});
      if (r.ok) {
        const text = await r.text();
        files.push({ path: it.path, size: text.length, content: text.slice(0, 40000) });
      }
    } catch {}
  }

  // Build core prompt from SKILL.md or README.md
  const coreFile = files.find(f => /skill\.md$/i.test(f.path)) || files.find(f => /readme\.md$/i.test(f.path)) || files[0];
  return {
    owner, repo, branch, subPath: cleanSub,
    sha: (treeData.sha || "").slice(0, 7),
    description: meta.description || `GitHub Repo ${owner}/${repo} (${files.length} tệp)`,
    corePrompt: (coreFile?.content || "").slice(0, 14000),
    files
  };
}

async function runGithubRepoImport() {
  const parsed = parseGithubUrl(document.getElementById("gh-url").value);
  if (!parsed) return showToast("Link GitHub chưa đúng định dạng https://github.com/owner/repo");
  const branch = document.getElementById("gh-branch").value.trim();
  const sub = document.getElementById("gh-sub").value.trim();
  const pat = document.getElementById("gh-pat").value.trim();
  const btn = document.getElementById("gh-go-btn"), prog = document.getElementById("gh-progress");
  btn.disabled = true; btn.textContent = "Đang tải...";
  try {
    const res = await fetchGithubRepoFiles(parsed.owner, parsed.repo, branch, sub, pat, msg => { prog.textContent = msg; });
    const slug = (sub ? sub.split("/").pop() : parsed.repo).toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    const sk = {
      id: "gh-" + parsed.owner + "-" + slug,
      name: slug,
      desc: `${res.description} · ${res.files.length} tệp`,
      prompt: res.corePrompt,
      builtin: false,
      repo: { owner: res.owner, repo: res.repo, branch: res.branch, subPath: res.subPath, sha: res.sha, pat: pat || "", updatedAt: Date.now() },
      repoFiles: res.files
    };
    await dbPut("skills", sk);
    S.skills = await dbAll("skills");
    renderSkillStack(); renderSkillsPage(); closeModal();
    haptic("ok"); showToast(`Đã cài @${slug} (${res.files.length} tệp nguyên trạng)`);
  } catch (e) {
    haptic("err"); prog.textContent = "Lỗi: " + e.message;
  } finally {
    btn.disabled = false; btn.textContent = "Tải nguyên trạng";
  }
}

async function pullLatestGithubSkill(skillId) {
  haptic("tap");
  if (!canUseGithubSkills()) return showToast("Cần gói Pro Max trở lên để cập nhật Repo");
  const sk = S.skills.find(x => x.id === skillId);
  if (!sk?.repo) return;
  showToast(`Đang kéo bản mới nhất cho @${sk.name}...`);
  try {
    const res = await fetchGithubRepoFiles(sk.repo.owner, sk.repo.repo, sk.repo.branch, sk.repo.subPath, sk.repo.pat || "", () => {});
    sk.prompt = res.corePrompt;
    sk.repoFiles = res.files;
    sk.desc = `${res.description} · ${res.files.length} tệp`;
    sk.repo.sha = res.sha;
    sk.repo.updatedAt = Date.now();
    await dbPut("skills", sk);
    S.skills = await dbAll("skills");
    renderSkillsPage(); haptic("ok");
    showToast(`Đã cập nhật @${sk.name} (commit ${res.sha}, ${res.files.length} tệp)`);
  } catch (e) { haptic("err"); showToast("Lỗi cập nhật: " + e.message); }
}

function openRepoTreeViewer(skillId) {
  const sk = S.skills.find(x => x.id === skillId);
  if (!sk?.repoFiles?.length) return;
  openModal(`
    <h3 style="font-size:17px;font-weight:520;margin-bottom:4px;">@${esc(sk.name)}</h3>
    <p style="font-size:12px;color:var(--ink-2);margin-bottom:10px;">${esc(sk.repo.owner)}/${esc(sk.repo.repo)} (${esc(sk.repo.branch)} · ${esc(sk.repo.sha)}) · ${sk.repoFiles.length} tệp</p>
    <div style="max-height:360px;overflow-y:auto;">
      ${sk.repoFiles.map((f, i) => `<div class="repo-tree-row" onclick="viewRepoFileContent('${sk.id}',${i})"><span>${esc(f.path)}</span><span style="color:var(--ink-3);">${Math.max(1, Math.round(f.size / 1024))}KB</span></div>`).join("")}
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
      <button class="btn-s tap" onclick="pullLatestGithubSkill('${sk.id}');closeModal()">Cập nhật Repo</button>
      <button class="btn-p tap" onclick="closeModal()">Đóng</button>
    </div>`);
}
function viewRepoFileContent(skillId, idx) {
  const sk = S.skills.find(x => x.id === skillId), f = sk?.repoFiles?.[idx]; if (!f) return;
  openModal(`<h3 style="font-size:15px;font-family:var(--font-mono);margin-bottom:8px;">${esc(f.path)}</h3>
    <pre style="max-height:55dvh;overflow:auto;padding:12px;border-radius:12px;background:var(--surface-0);font-family:var(--font-mono);font-size:12px;line-height:1.5;white-space:pre-wrap;">${esc(f.content)}</pre>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px;"><button class="btn-s tap" onclick="openRepoTreeViewer('${sk.id}')">Quay lại cây</button><button class="btn-p tap" onclick="closeModal()">Đóng</button></div>`);
}

// Local Mini-RAG: retrieve top 3 relevant files from an installed GitHub Repo skill for the current user prompt
function retrieveRepoSkillContext(sk, queryText) {
  let out = `KỸ NĂNG REPO (@${sk.name} · ${sk.repo?.owner}/${sk.repo?.repo}):\n${(sk.prompt || "").slice(0, 7500)}`;
  const files = sk.repoFiles || [];
  if (!files.length) return out;
  const words = [...new Set((queryText || "").toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, " ").split(/\s+/).filter(w => w.length >= 3))];
  const scored = files
    .filter(f => !/skill\.md$/i.test(f.path))
    .map(f => {
      const hay = (f.path + " " + f.content.slice(0, 4000)).toLowerCase();
      let sc = 0;
      for (const w of words) {
        if (f.path.toLowerCase().includes(w)) sc += 3;
        else if (hay.includes(w)) sc += 1;
      }
      return { f, sc };
    })
    .filter(x => x.sc > 0)
    .sort((a, b) => b.sc - a.sc)
    .slice(0, 3);
  if (scored.length) {
    out += "\n\nTỆP LIÊN QUAN TỪ REPOSITORY:\n" + scored.map(x => `--- ${x.f.path} ---\n${x.f.content.slice(0, 3200)}`).join("\n\n");
  }
  return out;
}

/* ===== 3-TIER MEMORY & CROSS-CHAT RECALL ===== */
function findCrossChatRecalls(q) {
  if (!q || !S.cfg.personalIntel) return [];
  const words = [...new Set(q.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(w => w.length >= 3))];
  if (!words.length) return [];
  const scored = [];
  for (const c of S.chats) {
    if (c.id === S.activeChatId) continue;
    const msgs = c.messages || [];
    for (let i = 0; i < msgs.length; i++) {
      const txt = (msgs[i].text || "").toLowerCase(); if (!txt) continue;
      let sc = 0; for (const w of words) if (txt.includes(w)) sc++;
      if (sc >= 2 || (words.length <= 2 && sc >= 1)) {
        const nxt = msgs[i].role === "user" && msgs[i + 1]?.role === "assistant" ? msgs[i + 1].text : "";
        scored.push({ sc, chatTitle: c.title, snippet: `${(msgs[i].text || "").slice(0, 120)}${nxt ? " -> " + nxt.slice(0, 120) : ""}` });
      }
    }
  }
  return scored.sort((a, b) => b.sc - a.sc).slice(0, 3);
}
function buildRollingSummary(chat) {
  const msgs = chat?.messages || [];
  if (msgs.length <= 20) return "";
  return msgs.slice(0, -20).map(m => `${m.role === "user" ? "U" : "A"}: ${(m.text || "").replace(/\s+/g, " ").slice(0, 90)}`).join(" | ").slice(0, 1800);
}
function renderMemoryBar() {
  const act = S.memories.filter(m => m.enabled !== false), rec = S.lastCrossRecalls || [];
  const chat = S.chats.find(c => c.id === S.activeChatId), roll = (chat?.messages?.length || 0) > 20;
  const total = act.length + rec.length + (roll ? 1 : 0);
  document.getElementById("mem-bar-label").textContent = S.cfg.personalIntel ? `Trí nhớ đang dùng (${total} mục)` : "Trí nhớ đang tắt";

  const isAdmin = S.user?.role === "admin";
  const pinBadge = document.getElementById("chat-pin-badge");
  if (isAdmin && chat?.pinnedSlotLabel) {
    pinBadge.textContent = chat.pinnedSlotLabel;
    pinBadge.style.display = "inline-block";
  } else {
    pinBadge.style.display = "none";
  }

  let html = "";
  if (isAdmin && chat?.pinnedSlotLabel) html += `<div class="mem-chip-row"><span>API ghim cho đoạn chat này: <b>${esc(chat.pinnedSlotLabel)}</b></span><span class="tag-st st-active">Cố định</span></div>`;
  if (roll) html += `<div class="mem-chip-row"><span>Tóm tắt cuộn (${chat.messages.length - 20} tin cũ)</span><span class="tag-st st-active">Bật</span></div>`;
  rec.forEach(r => html += `<div class="mem-chip-row"><span>${esc(r.chatTitle)}: ${esc(r.snippet.slice(0, 80))}</span><span class="tag-st st-unused">Cross-Chat</span></div>`);
  S.memories.forEach(m => html += `<div class="mem-chip-row"><span style="flex:1;opacity:${m.enabled===false?0.45:1};">${esc(m.content.slice(0, 88))}</span><button class="btn-s tap" style="height:26px;padding:0 9px;font-size:11px;" onclick="toggleMemItem('${m.id}')">${m.enabled===false?"Tắt":"Bật"}</button><button class="mini-act tap" onclick="delMemory('${m.id}')">${ICON_X}</button></div>`);
  if (!html) html = `<div style="font-size:12.5px;color:var(--ink-3);padding:4px 2px;">Chưa có mục trí nhớ nào.</div>`;
  html += `<div style="display:flex;justify-content:flex-end;margin-top:4px;"><button class="btn-s tap" style="height:30px;padding:0 12px;font-size:12px;" onclick="switchView('import')">Quản lý trí nhớ</button></div>`;
  document.getElementById("mem-bar-content").innerHTML = html;
}
async function toggleMemItem(id) { haptic("switch"); const m = S.memories.find(x => x.id === id); if (!m) return; m.enabled = m.enabled === false ? true : false; await apiFetch("/sync/memories", { method: "POST", body: m }).catch(() => {}); renderMemoryBar(); }

function renderSkillStack() {
  document.getElementById("skill-stack-strip").innerHTML = S.skills.map(sk =>
    `<button class="sk-pill tap ${S.skillIds.includes(sk.id) ? "on" : ""}" onclick="toggleSkillPill('${sk.id}')">@${esc(sk.name)}</button>`
  ).join("");
  const cnt = S.skillIds.length;
  document.getElementById("btn-skill-stack").classList.toggle("has-active", cnt > 0);
  document.getElementById("sk-stack-lbl").textContent = cnt ? `Skills (${cnt})` : "Skills";
}
function toggleSkillPill(id) { haptic("switch"); S.skillIds = S.skillIds.includes(id) ? S.skillIds.filter(x => x !== id) : [...S.skillIds, id]; renderSkillStack(); renderChips(); }

/* ===== HD VISION STUDIO ===== */
function setImgQuality(q) { haptic("tap"); S.cfg.imgQuality = q; dbPut("kv", S.cfg); applyTheme(); showToast(`Chất lượng ảnh: ${q === "fast" ? "Nhanh" : q === "ultra" ? "Siêu nét" : "HD 2048px"}`); }
function processImageFile(file) {
  const qMap = { fast: { max: 1024, q: 0.84 }, hd: { max: 2048, q: 0.92 }, ultra: { max: 2560, q: 0.96 } };
  const allowHd = S.user?.role === "admin" || S.user?.limits?.allow_hd_vision !== false;
  const preset = allowHd ? (qMap[S.cfg.imgQuality] || qMap.hd) : qMap.fast;
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      let { width: w, height: h } = img;
      if (w > preset.max || h > preset.max) { const r = Math.min(preset.max / w, preset.max / h); w = Math.round(w * r); h = Math.round(h * r); }
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const ctx = c.getContext("2d"); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h); const dataUrl = c.toDataURL("image/jpeg", preset.q); URL.revokeObjectURL(url); res({ dataUrl, w, h });
    };
    img.onerror = e => { URL.revokeObjectURL(url); rej(e); };
    img.src = url;
  });
}
function enhanceCanvasPixels(ctx, w, h) {
  const imgData = ctx.getImageData(0, 0, w, h), d = imgData.data, hist = new Uint32Array(256), total = w * h;
  for (let i = 0; i < d.length; i += 4) hist[(d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8]++;
  let lo = 0, hi = 255, acc = 0;
  for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc > total * 0.02) { lo = i; break; } }
  acc = 0;
  for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc > total * 0.02) { hi = i; break; } }
  const span = Math.max(24, hi - lo), st = new Uint8ClampedArray(d.length);
  for (let i = 0; i < d.length; i += 4) { st[i] = ((d[i] - lo) * 255) / span; st[i+1] = ((d[i+1] - lo) * 255) / span; st[i+2] = ((d[i+2] - lo) * 255) / span; st[i+3] = d[i+3]; }
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const idx = (y * w + x) * 4;
    for (let c = 0; c < 3; c++) { const blur = (st[idx-4+c] + st[idx+4+c] + st[idx-w*4+c] + st[idx+w*4+c] + st[idx+c]*2) / 6; d[idx+c] = st[idx+c] + (st[idx+c] - blur) * 0.78; }
  }
  ctx.putImageData(imgData, 0, 0);
}

let studioState = { attIndex: -1, imgObj: null, enhanced: false, cropOn: false, box: { x: 0.2, y: 0.2, w: 0.52, h: 0.52 } };
function openVisionStudio(idx) {
  const att = S.atts[idx]; if (!att?.dataUrl) return;
  studioState = { attIndex: idx, imgObj: new Image(), enhanced: !!att.enhanced, cropOn: false, box: { x: 0.2, y: 0.2, w: 0.52, h: 0.52 } };
  openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:4px;">HD Vision Studio</h3>
    <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:10px;">Làm rõ ảnh mờ hoặc khoanh vùng soi chi tiết phóng to.</p>
    <div class="vision-stage" id="v-stage"><canvas id="v-canvas"></canvas><div id="crop-rect"><div id="crop-handle"></div></div></div>
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button id="btn-enh" class="btn-s tap ${studioState.enhanced?"lg-active":""}" style="flex:1;" onclick="toggleStudioEnhance()">Làm rõ ảnh</button>
      <button id="btn-crop-mode" class="btn-s tap" style="flex:1;" onclick="toggleStudioCrop()">Soi chi tiết</button>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
      <button class="btn-s tap" onclick="closeModal()">Đóng</button>
      <button id="btn-crop-add" class="btn-blue tap" style="display:none;" onclick="commitStudioCrop()">Gửi kèm vùng soi</button>
      <button class="btn-p tap" onclick="applyStudioEnhanced()">Áp dụng</button>
    </div>`);
  studioState.imgObj.onload = () => { drawStudioCanvas(); bindCropGestures(); };
  studioState.imgObj.src = att.origDataUrl || att.dataUrl;
}
function drawStudioCanvas() { const cv = document.getElementById("v-canvas"), img = studioState.imgObj; if (!cv || !img) return; const sc = Math.min(1, 1280 / img.width); cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc); const ctx = cv.getContext("2d"); ctx.drawImage(img, 0, 0, cv.width, cv.height); if (studioState.enhanced) enhanceCanvasPixels(ctx, cv.width, cv.height); positionCropRect(); }
function toggleStudioEnhance() { haptic("switch"); studioState.enhanced = !studioState.enhanced; document.getElementById("btn-enh")?.classList.toggle("lg-active", studioState.enhanced); drawStudioCanvas(); }
function toggleStudioCrop() { haptic("switch"); studioState.cropOn = !studioState.cropOn; document.getElementById("btn-crop-mode")?.classList.toggle("lg-active", studioState.cropOn); document.getElementById("crop-rect").style.display = studioState.cropOn ? "block" : "none"; document.getElementById("btn-crop-add").style.display = studioState.cropOn ? "inline-flex" : "none"; positionCropRect(); }
function positionCropRect() { const r = document.getElementById("crop-rect"); if (!r || !studioState.cropOn) return; const b = studioState.box; r.style.left = b.x*100+"%"; r.style.top = b.y*100+"%"; r.style.width = b.w*100+"%"; r.style.height = b.h*100+"%"; }
function bindCropGestures() {
  const rect = document.getElementById("crop-rect"), handle = document.getElementById("crop-handle"), stage = document.getElementById("v-stage");
  if (!rect || !handle || !stage) return; let mode = null, sx = 0, sy = 0, sb = null;
  rect.onpointerdown = e => { mode = e.target === handle ? "resize" : "move"; sx = e.clientX; sy = e.clientY; sb = { ...studioState.box }; rect.setPointerCapture(e.pointerId); e.stopPropagation(); };
  rect.onpointermove = e => { if (!mode) return; const sr = stage.getBoundingClientRect(), dx = (e.clientX - sx) / sr.width, dy = (e.clientY - sy) / sr.height; if (mode === "move") { studioState.box.x = Math.max(0, Math.min(1 - sb.w, sb.x + dx)); studioState.box.y = Math.max(0, Math.min(1 - sb.h, sb.y + dy)); } else { studioState.box.w = Math.max(0.15, Math.min(1 - sb.x, sb.w + dx)); studioState.box.h = Math.max(0.15, Math.min(1 - sb.y, sb.h + dy)); } positionCropRect(); };
  rect.onpointerup = () => { mode = null; };
}
function applyStudioEnhanced() { const att = S.atts[studioState.attIndex], cv = document.getElementById("v-canvas"); if (!att || !cv) return; if (!att.origDataUrl) att.origDataUrl = att.dataUrl; att.dataUrl = cv.toDataURL("image/jpeg", 0.93); att.enhanced = studioState.enhanced; renderChips(); closeModal(); haptic("ok"); showToast(studioState.enhanced ? "Đã làm nét ảnh" : "Đã giữ ảnh gốc"); }
function commitStudioCrop() { const att = S.atts[studioState.attIndex], img = studioState.imgObj; if (!att || !img) return; const b = studioState.box, sx = Math.round(b.x * img.width), sy = Math.round(b.y * img.height), sw = Math.max(64, Math.round(b.w * img.width)), sh = Math.max(64, Math.round(b.h * img.height)), outW = Math.min(1600, Math.max(sw, 900)), outH = Math.round(outW * (sh / sw)); const c = document.createElement("canvas"); c.width = outW; c.height = outH; const ctx = c.getContext("2d"); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high"; ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH); enhanceCanvasPixels(ctx, outW, outH); S.atts.push({ id: "crop-" + Date.now(), type: "image", name: `Vùng soi (${att.name.slice(0, 10)})`, dataUrl: c.toDataURL("image/jpeg", 0.94), enhanced: true }); renderChips(); updateOrbButton(); closeModal(); haptic("ok"); showToast("Đã đính kèm vùng soi HD"); }

async function handleImages(files) { for (const f of files || []) { const p = await processImageFile(f); S.atts.push({ id: "img-" + Date.now() + Math.random(), type: "image", name: f.name, dataUrl: p.dataUrl, origDataUrl: p.dataUrl, enhanced: false }); await saveLib("media", f.name, p.dataUrl); } renderChips(); updateOrbButton(); haptic("ok"); showToast("Đã đính kèm ảnh HD"); document.getElementById("in-img").value = ""; document.getElementById("in-cam").value = ""; }
async function handleVideo(files) {
  const f = files?.[0]; if (!f) return; showToast("Đang tách 6 khung hình từ video");
  const v = document.createElement("video"), url = URL.createObjectURL(f); v.muted = true; v.playsInline = true; v.src = url;
  v.onloadedmetadata = async () => {
    const dur = Math.max(v.duration || 1, 0.5), c = document.createElement("canvas"), sc = Math.min(1, 960 / (v.videoWidth || 960));
    c.width = Math.round((v.videoWidth || 640) * sc); c.height = Math.round((v.videoHeight || 360) * sc);
    const ctx = c.getContext("2d"), seek = t => new Promise(r => { v.onseeked = r; v.currentTime = Math.min(t, Math.max(0, dur - 0.1)); });
    for (let i = 1; i <= 6; i++) { const sec = Number(((dur / 7) * i).toFixed(1)); await seek(sec); ctx.drawImage(v, 0, 0, c.width, c.height); S.atts.push({ id: "vf-" + Date.now() + i, type: "video_frame", name: `${f.name} (${sec}s)`, dataUrl: c.toDataURL("image/jpeg", 0.82) }); }
    URL.revokeObjectURL(url); renderChips(); updateOrbButton(); haptic("ok"); showToast("Đã tách 6 khung hình video");
  };
  document.getElementById("in-vid").value = "";
}
async function handleDocs(files) { for (const f of files || []) S.atts.push({ id: "d-" + Date.now() + Math.random(), type: "file", name: f.name, text: (await f.text()).slice(0, 50000) }); renderChips(); updateOrbButton(); haptic("ok"); showToast(`Đã đính kèm ${files.length} tệp`); document.getElementById("in-doc").value = ""; }

/* ===== MODEL DROPDOWN & CHAT ENGINE (STICKY API + CONTROLLED SWITCH) ===== */
function renderModelDropdown() {
  const m = S.models.find(x => x.id === S.cfg.selectedModel) || S.models.find(x => x.allowed) || S.models[0];
  const t = THINK_LEVELS.find(x => x.id === S.cfg.thinkingLevel) || THINK_LEVELS[2];
  document.getElementById("top-model-text").textContent = `${m?.short || m?.title || "API AI"} ${t.title}`;

  document.getElementById("model-opts").innerHTML = S.models.map(it => {
    const locked = !it.allowed, sel = it.id === S.cfg.selectedModel;
    const tierTag = locked ? `<span class="tag-st tier-${it.min_tier || "ultra"}">${esc(it.min_tier_label || "Nâng cấp")}</span>` : (it.badge ? `<span class="tag-quiet">${esc(it.badge)}</span>` : "");
    return `<button class="drop-opt tap-soft ${sel?"selected":""} ${locked?"locked":""}" onclick="pickModel('${esc(it.id)}',${locked},'${esc(it.min_tier_label || "")}')">
      <span class="opt-check">${sel ? ICON_CHECK : (locked ? ICON_LOCK : "")}</span>
      <div class="opt-main">
        <div class="opt-title">${esc(it.title)} ${tierTag}</div>
        <div class="opt-sub">${esc(it.sub || it.mapped)}</div>
      </div></button>`;
  }).join("");

  document.getElementById("thinking-opts").innerHTML = THINK_LEVELS.map(lv => {
    const sel = lv.id === S.cfg.thinkingLevel;
    return `<button class="drop-opt tap-soft ${sel?"selected":""}" onclick="pickThink('${lv.id}')">
      <span class="opt-check">${sel ? ICON_CHECK : ""}</span>
      <div class="opt-main"><div class="opt-title">${lv.title}</div><div class="opt-sub">${lv.sub}</div></div></button>`;
  }).join("");
}
function pickModel(id, locked, needTier) {
  haptic("tap");
  if (locked) return showToast(`Model này yêu cầu Key hạng ${needTier || "cao hơn"}`);
  S.cfg.selectedModel = id; dbPut("kv", S.cfg); renderModelDropdown(); closePopovers();
}
function pickThink(id) { haptic("tap"); S.cfg.thinkingLevel = id; dbPut("kv", S.cfg); renderModelDropdown(); closePopovers(); }

function buildSystemPrompt(chat, query, hasImgs, handoffSummary = "") {
  const arr = ["Bạn là API AI — trợ lý AI trả lời tiếng Việt rõ ràng, sắc sảo và chính xác."];
  if (handoffSummary) arr.push("BỐI CẢNH CHUYỂN TIẾP TỪ API TRƯỚC TRONG CÙNG ĐOẠN CHAT:\n" + handoffSummary);
  if (hasImgs) arr.push("PHÂN TÍCH THỊ GIÁC TOÀN DIỆN: Quan sát toàn bộ vật thể, bố cục, màu sắc, ánh sáng, chi tiết nhỏ, biểu đồ và chữ viết trong ảnh.");
  if (S.cfg.workMode === "task") arr.push("CHẾ ĐỘ NHIỆM VỤ: Chia yêu cầu thành các bước thực thi cụ thể.");
  const lv = THINK_LEVELS.find(x => x.id === S.cfg.thinkingLevel); if (lv) arr.push(`Tư duy (${lv.title}): ${lv.prompt}`);
  if (S.cfg.personalIntel) {
    const mems = S.memories.filter(m => m.enabled !== false);
    if (mems.length) arr.push("TRÍ NHỚ CÁ NHÂN:\n" + mems.map(m => "- " + m.content).join("\n"));
    const roll = buildRollingSummary(chat); if (roll) arr.push("TÓM TẮT NGỮ CẢNH CŨ:\n" + roll);
    S.lastCrossRecalls = findCrossChatRecalls(query);
    if (S.lastCrossRecalls.length) arr.push("GỢI NHỚ CROSS-CHAT:\n" + S.lastCrossRecalls.map(r => `- [${r.chatTitle}] ${r.snippet}`).join("\n"));
  } else S.lastCrossRecalls = [];
  if (S.activeNbId) { const nb = S.notebooks.find(n => n.id === S.activeNbId); if (nb) arr.push(`SỔ GHI CHÚ "${nb.title}":\n${nb.notes}`); }
  S.skillIds.forEach(id => {
    const sk = S.skills.find(x => x.id === id);
    if (!sk) return;
    if (sk.repoFiles?.length) arr.push(retrieveRepoSkillContext(sk, query));
    else arr.push(`KỸ NĂNG @${sk.name}:\n${sk.prompt}`);
  });
  if (S.activeTool === "canvas") arr.push("CANVAS: Xuất toàn bộ mã trong 1 khối ```html ... ```.");
  if (S.activeTool === "deep_research") arr.push("DEEP RESEARCH: Phân tích đa chiều có bảng so sánh và kết luận thực tế.");
  if (S.activeTool === "guided") arr.push("HỌC CÓ HƯỚNG DẪN: Giải thích bản chất kèm câu hỏi kiểm tra tư duy.");
  return arr.join("\n\n");
}

function buildSwitchHandoffSummary(chat) {
  const msgs = (chat?.messages || []).filter(m => !m.failedSwitch && m.text).slice(-14);
  return msgs.map(m => `${m.role === "user" ? "Người dùng" : "Trợ lý"}: ${(m.text || "").replace(/\s+/g, " ").slice(0, 220)}`).join("\n").slice(0, 2600);
}

async function switchChatApiWithSummary(failedMsgId) {
  const chat = S.chats.find(c => c.id === S.activeChatId);
  if (!chat) return;
  const idx = chat.messages.findIndex(m => m.id === failedMsgId);
  const lastUserMsg = [...chat.messages.slice(0, idx >= 0 ? idx : undefined)].reverse().find(m => m.role === "user");
  if (!lastUserMsg) return;
  if (idx >= 0) chat.messages.splice(idx, 1); // Remove the failed error card
  const handoff = buildSwitchHandoffSummary(chat);
  haptic("switch");
  showToast("Đang chuyển sang API dự phòng kèm tóm tắt mạch chat...");
  await sendPrompt(lastUserMsg.text, { reuseLastUser: true, forceSwitch: true, handoffSummary: handoff });
}


/* =========================================================================
   SMART IMAGE INTENT DETECTOR (2A) + 4-AGENT DEV PIPELINE (1A + 1B + 1C + USER MODELS)
   ========================================================================= */
function canUseFourAgent() {
  return S.user?.role === "admin" || Boolean(S.user?.limits?.allow_four_agent);
}

function detectImageIntent(text, chat) {
  const t = (text || "").trim().toLowerCase();
  if (!t) return null;
  // Never hijack coding/diagram/UI design requests
  if (/(viết code|lập trình|html|css|javascript|python|pine script|mql5|svg|react|canvas|giao diện web)/i.test(t)) return null;

  // 1. Direct explicit draw / generate image intent
  if (/^(hãy\s+)?(tạo|vẽ|sinh|render|thiết kế)\s+(giúp\s+|cho\s+(mình|tôi|em)\s+)?(1\s+|một\s+)?(hình|ảnh|bức ảnh|bức tranh|tranh|nhân vật|chibi|logo|avatar|poster|wallpaper)/i.test(t)
    || /^(generate|create|draw|paint)\s+(an?\s+)?(image|picture|photo|illustration|art|chibi|logo)/i.test(t)) {
    return text.trim();
  }

  // 2. Follow-up answer right after AI asked clarifying style questions about an image (like 41726.jpg / 41727.jpg!)
  const msgs = chat?.messages || [];
  const prevAi = [...msgs].reverse().find(m => m.role === "assistant" && m.text);
  const prevUser = [...msgs].reverse().find(m => m.role === "user" && m.text && m.text.trim() !== text.trim());
  if (prevAi && /(tạo hình|tạo ảnh|phong cách|bối cảnh.*tư thế|mô tả ảnh)/i.test(prevAi.text) && t.length < 180) {
    if (prevUser && /(tạo hình|tạo ảnh|vẽ|chibi|chupi|nhân vật)/i.test(prevUser.text)) {
      return `${prevUser.text.trim()} — chi tiết: ${text.trim()}`;
    }
  }
  return null;
}

const AGENT_ROLES = [
  { id: "architect", num: 1, title: "Architect", sub: "Kiến trúc sư trưởng" },
  { id: "coder", num: 2, title: "Coder", sub: "Lập trình viên" },
  { id: "reviewer", num: 3, title: "Reviewer", sub: "Thẩm định viên" },
  { id: "tester", num: 4, title: "Tester", sub: "Kỹ sư kiểm thử" }
];

function getAllowedRealModels() {
  const list = (S.models || []).filter(m => m.allowed && m.mapped !== "auto");
  return list.length ? list : (S.models || []).filter(m => m.allowed);
}

function renderAgentConfigPanel() {
  const box = document.getElementById("agent-cfg-box");
  if (!box) return;
  const ac = S.cfg.agentCfg;
  const mods = getAllowedRealModels();
  const fallbackId = mods[0]?.id || "gpt-6.2-sol";

  // Ensure each saved model is valid for current user
  for (const r of AGENT_ROLES) {
    if (!mods.some(m => m.id === ac.models[r.id])) ac.models[r.id] = fallbackId;
  }

  box.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
      <strong style="font-size:13px;font-weight:560;">Dây chuyền 4-Agent (Tách sạch ngữ cảnh)</strong>
      <button class="btn-s tap" style="height:28px;padding:0 10px;font-size:11.5px;" onclick="autoFillOptimalAgentModels()">Gợi ý tối ưu</button>
    </div>
    <div class="agent-cfg-grid">
      ${AGENT_ROLES.map(r => `
        <div class="agent-role-row">
          <input type="checkbox" ${ac.enabledRoles[r.id] ? "checked" : ""} onchange="toggleAgentRole('${r.id}', this.checked)" />
          <span class="agent-role-lbl">${r.num}. ${r.title}</span>
          <select class="agent-role-sel" onchange="setAgentModel('${r.id}', this.value)">
            ${mods.map(m => `<option value="${esc(m.id)}" ${ac.models[r.id]===m.id?"selected":""}>${esc(m.short || m.title)} ${m.cost_label ? `(${m.cost_label})` : ""}</option>`).join("")}
          </select>
        </div>`).join("")}
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding-top:2px;">
      <label style="display:inline-flex;align-items:center;gap:8px;font-size:12.5px;color:var(--ink-2);cursor:pointer;">
        <input type="checkbox" ${ac.pauseAfterArchitect ? "checked" : ""} onchange="S.cfg.agentCfg.pauseAfterArchitect=this.checked;dbPut('kv',S.cfg);haptic('switch')" style="accent-color:var(--accent);width:16px;height:16px;" />
        <span>Dừng duyệt bản vẽ sau Architect</span>
      </label>
      <div style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--ink-2);">
        <span>Tự vá lỗi:</span>
        <select class="agent-role-sel" style="width:auto;" onchange="S.cfg.agentCfg.maxFixLoops=Number(this.value);dbPut('kv',S.cfg)">
          <option value="0" ${ac.maxFixLoops===0?"selected":""}>Tắt</option>
          <option value="1" ${ac.maxFixLoops===1?"selected":""}>Tối đa 1 vòng</option>
          <option value="2" ${ac.maxFixLoops===2?"selected":""}>Tối đa 2 vòng</option>
        </select>
      </div>
    </div>`;
}

function toggleAgentRole(roleId, checked) {
  haptic("switch");
  S.cfg.agentCfg.enabledRoles[roleId] = Boolean(checked);
  const anyOn = Object.values(S.cfg.agentCfg.enabledRoles).some(Boolean);
  if (!anyOn) { S.cfg.agentCfg.enabledRoles.coder = true; showToast("Cần bật ít nhất 1 Agent"); renderAgentConfigPanel(); }
  dbPut("kv", S.cfg);
}
function setAgentModel(roleId, modelId) {
  haptic("tap");
  S.cfg.agentCfg.models[roleId] = modelId;
  dbPut("kv", S.cfg);
}
function autoFillOptimalAgentModels() {
  haptic("ok");
  const mods = getAllowedRealModels();
  const pick = prefs => { for (const p of prefs) { const f = mods.find(m => m.id === p || m.mapped === p); if (f) return f.id; } return mods[0]?.id || "gpt-6.2-sol"; };
  S.cfg.agentCfg.models = {
    architect: pick(["claude-opus-5-5", "claude-sonnet-5", "gpt-6.2-astra", "gpt-6.2-sol"]),
    coder: pick(["claude-sonnet-5", "gpt-6.2-sol", "gpt-6.2-astra"]),
    reviewer: pick(["claude-opus-5-5", "gpt-6.2-astra", "claude-sonnet-5", "gpt-6.2-sol"]),
    tester: pick(["gpt-6-luna", "gpt-6.2-sol"])
  };
  dbPut("kv", S.cfg);
  renderAgentConfigPanel();
  showToast("Đã phối model tiết kiệm & mạnh nhất theo gói của bạn");
}

async function callStatelessAgent(chat, modelId, roleId, sysPrompt, userPrompt, onToken) {
  const res = await apiFetch("/ai/chat", {
    method: "POST",
    body: {
      chatId: chat.id,
      mode: "four_agent",
      agentRole: roleId,
      uiModelId: modelId,
      messages: [
        { role: "system", content: sysPrompt },
        { role: "user", content: userPrompt }
      ],
      stream: true,
      pinnedProvider: chat.pinnedProvider,
      pinnedKeyIndex: chat.pinnedKeyIndex
    },
    signal: S.abort.signal
  });
  if (!res.ok) {
    const ej = await res.json().catch(() => ({ error: "HTTP " + res.status }));
    if (ej.code === "QUOTA_EXCEEDED" && S.user) {
      if (typeof ej.dailyMsgs === "number") S.user.dailyMsgs = ej.dailyMsgs;
      if (typeof ej.dailyLimit === "number" && S.user.limits) S.user.limits.daily_msgs = ej.dailyLimit;
      if (typeof ej.dailyTokens === "number") S.user.dailyTokens = ej.dailyTokens;
      if (typeof ej.dailyTokenLimit === "number" && S.user.limits) S.user.limits.daily_tokens = ej.dailyTokenLimit;
      syncAccountUI();
    }
    throw new Error(ej.error || `HTTP ${res.status}`);
  }
  const hm = res.headers.get("X-Daily-Msgs"), hl = res.headers.get("X-Daily-Limit"), ht = res.headers.get("X-Daily-Tokens"), htl = res.headers.get("X-Daily-Token-Limit");
  if (S.user) {
    if (hm !== null) S.user.dailyMsgs = Number(hm);
    if (hl !== null && S.user.limits) S.user.limits.daily_msgs = Number(hl);
    if (ht !== null) S.user.dailyTokens = Number(ht);
    if (htl !== null && S.user.limits) S.user.limits.daily_tokens = Number(htl);
    syncAccountUI();
  }
  const pId = res.headers.get("X-Provider-Id"), kIdx = res.headers.get("X-Key-Index"), slotLbl = res.headers.get("X-Key-Slot");
  if (pId && kIdx !== null && !chat.pinnedProvider) {
    chat.pinnedProvider = pId; chat.pinnedKeyIndex = Number(kIdx); chat.pinnedSlotLabel = slotLbl || `${pId} #${Number(kIdx) + 1}`;
  }

  let acc = "";
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("text/event-stream") && res.body?.getReader) {
    const reader = res.body.getReader(), dec = new TextDecoder("utf-8");
    let buf = "";
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n"); buf = lines.pop() || "";
      for (const l of lines) {
        const t = l.trim(); if (!t.startsWith("data:")) continue;
        const d = t.slice(5).trim(); if (d === "[DONE]") continue;
        try { const delta = JSON.parse(d).choices?.[0]?.delta?.content || ""; if (delta) { acc += delta; onToken(acc); } } catch {}
      }
    }
  } else {
    const raw = await res.text();
    try { acc = JSON.parse(raw).choices?.[0]?.message?.content || raw; } catch { acc = raw; }
    onToken(acc);
  }
  return { text: acc, slot: slotLbl || "" };
}

function extractBestCodeBlock(text) {
  const htmlM = String(text || "").match(/```html\n([\s\S]*?)```/i);
  if (htmlM) return { lang: "html", code: htmlM[1] };
  const anyM = String(text || "").match(/```([\w-]*)\n([\s\S]*?)```/);
  if (anyM) return { lang: anyM[1] || "text", code: anyM[2] };
  return null;
}

async function runFourAgentPipeline(chat, userPrompt, resumeMsg = null) {
  if (!canUseFourAgent()) {
    haptic("err");
    return showToast("Chế độ 4-Agent yêu cầu Key hạng Pro Max trở lên");
  }
  const ac = S.cfg.agentCfg;
  let aiMsg = resumeMsg;
  if (!aiMsg) {
    aiMsg = {
      id: "m-" + (Date.now() + 1), role: "assistant", text: "",
      modelLabel: "4-Agent Dev Pipeline", streaming: true,
      pipeline: {
        prompt: userPrompt,
        steps: [],
        awaitingApproval: false,
        blueprint: "",
        codeOutput: "",
        reviewOutput: "",
        finalCode: null
      },
      ts: Date.now()
    };
    chat.messages.push(aiMsg);
  } else {
    aiMsg.streaming = true;
    aiMsg.pipeline.awaitingApproval = false;
  }

  const pipe = aiMsg.pipeline;
  S.streaming = true; S.abort = new AbortController(); updateOrbButton();
  renderMessages(); scrollToBottom(true);

  const runStep = async (roleId, numLabel, title, sysPrompt, contentPrompt) => {
    const modId = ac.models[roleId] || S.cfg.selectedModel;
    const modObj = S.models.find(m => m.id === modId);
    const step = {
      id: "st-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      role: roleId, num: numLabel, title,
      modelLabel: modObj?.short || modId,
      status: "running", text: ""
    };
    pipe.steps.push(step);
    renderMessages(); scrollToBottom(false);

    let raf = false;
    const paintStep = () => {
      raf = false;
      const el = document.getElementById("pipe-md-" + step.id);
      if (el) { el.innerHTML = renderMd(step.text); if (isNearBottom()) scrollToBottom(false); }
    };
    const { text, slot } = await callStatelessAgent(chat, modId, roleId, sysPrompt, contentPrompt, full => {
      step.text = full;
      if (!raf) { raf = true; requestAnimationFrame(paintStep); }
    });
    step.text = text;
    step.status = "done";
    if (slot) aiMsg.slot = slot;
    renderMessages(); scrollToBottom(false);
    return text;
  };

  try {
    // STEP 1: ARCHITECT (only if not resuming from approval)
    if (!resumeMsg && ac.enabledRoles.architect) {
      const archSys = "Bạn là Tác tử 1: KIẾN TRÚC SƯ TRƯỞNG (Architect) độc lập. Nhiệm vụ duy nhất: phân tích yêu cầu, thiết kế kiến trúc hệ thống, cấu trúc dữ liệu, luồng xử lý, danh sách module/hàm và edge-cases. KHÔNG viết code dài dòng. Trả lời tiếng Việt ngắn gọn, có cấu trúc rõ ràng.";
      pipe.blueprint = await runStep("architect", "1", "Architect · Kiến trúc sư trưởng", archSys, `Yêu cầu dự án:\n${pipe.prompt}`);

      if (ac.pauseAfterArchitect && (ac.enabledRoles.coder || ac.enabledRoles.reviewer || ac.enabledRoles.tester)) {
        pipe.awaitingApproval = true;
        aiMsg.streaming = false;
        S.streaming = false; S.abort = null;
        await apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {});
        renderMessages(); updateOrbButton();
        showToast("Architect đã xong · Kiểm tra bản vẽ rồi bấm Duyệt & Chạy tiếp");
        return;
      }
    }

    // STEP 2: CODER
    if (ac.enabledRoles.coder) {
      const coderSys = "Bạn là Tác tử 2: LẬP TRÌNH VIÊN (Coder) độc lập. Chỉ tập trung viết mã nguồn sạch, hoàn chỉnh, chạy được ngay bám sát 100% bản thiết kế. Nếu là ứng dụng web/UI, xuất trọn bộ trong 1 khối ```html ... ``` chạy độc lập.";
      const coderIn = pipe.blueprint
        ? `YÊU CẦU GỐC:\n${pipe.prompt}\n\nBẢN THIẾT KẾ TỪ ARCHITECT (BẮT BUỘC BÁM SÁT):\n${pipe.blueprint}`
        : `YÊU CẦU GỐC:\n${pipe.prompt}`;
      pipe.codeOutput = await runStep("coder", "2", "Coder · Lập trình viên", coderSys, coderIn);
      pipe.finalCode = extractBestCodeBlock(pipe.codeOutput);
    }

    // STEP 3: REVIEWER
    if (ac.enabledRoles.reviewer && pipe.codeOutput) {
      const revSys = "Bạn là Tác tử 3: THẨM ĐỊNH VIÊN (Reviewer) độc lập. Soi kỹ từng dòng code để tìm lỗi logic tiềm ẩn, lỗ hổng bảo mật, hiệu năng, và sai lệch so với bản vẽ. Liệt kê rõ từng lỗi cần sửa (nếu có) và đánh giá ngắn gọn.";
      pipe.reviewOutput = await runStep("reviewer", "3", "Reviewer · Thẩm định viên", revSys,
        `YÊU CẦU:\n${pipe.prompt}\n\nBẢN VẼ:\n${pipe.blueprint || "(không có)"}\n\nMÃ NGUỒN CẦN THẨM ĐỊNH:\n${pipe.codeOutput}`);
    }

    // STEP 4: TESTER + AUTO-FIX LOOP BACK TO CODER
    if (ac.enabledRoles.tester && pipe.codeOutput) {
      const maxLoops = Math.max(0, Math.min(2, Number(ac.maxFixLoops || 0)));
      for (let loop = 0; loop <= maxLoops; loop++) {
        const testSys = "Bạn là Tác tử 4: KỸ SƯ KIỂM THỬ (Tester) độc lập. Hãy thiết kế các ca kiểm thử thực tế, edge-case, và mô phỏng chạy kiểm tra mã nguồn (kết hợp báo cáo Reviewer nếu có). Ở DÒNG ĐẦU TIÊN bắt buộc ghi rõ: `STATUS: PASS` nếu mã chạy chuẩn không còn lỗi nghiêm trọng, HOẶC `STATUS: FAIL` kèm danh sách lỗi cụ thể cần Coder sửa ngay.";
        const testIn = `YÊU CẦU:\n${pipe.prompt}\n\nBÁO CÁO REVIEWER:\n${pipe.reviewOutput || "(không có)"}\n\nMÃ NGUỒN CẦN KIỂM THỬ:\n${pipe.codeOutput}`;
        const testRes = await runStep("tester", loop === 0 ? "4" : `4.${loop}`, loop === 0 ? "Tester · Kỹ sư kiểm thử" : `Tester · Kiểm thử lại (Vòng ${loop})`, testSys, testIn);
        const isFail = /STATUS\s*:\s*FAIL/i.test(testRes.slice(0, 260));

        if (isFail && loop < maxLoops && ac.enabledRoles.coder) {
          pipe.steps[pipe.steps.length - 1].status = "fail";
          const fixSys = "Bạn là Tác tử 2: LẬP TRÌNH VIÊN (Coder) ở chế độ TỰ VÁ LỖI. Nhận báo cáo lỗi từ Reviewer và Tester, sửa triệt để toàn bộ lỗi và xuất lại trọn bộ mã nguồn hoàn chỉnh (không viết tắt).";
          pipe.codeOutput = await runStep("coder", `2.${loop + 1}`, `Coder · Tự vá lỗi (Vòng ${loop + 1})`, fixSys,
            `MÃ CŨ:\n${pipe.codeOutput}\n\nBÁO CÁO REVIEWER:\n${pipe.reviewOutput || ""}\n\nPHẢN HỒI LỖI TỪ TESTER:\n${testRes}`);
          pipe.finalCode = extractBestCodeBlock(pipe.codeOutput);
        } else {
          break;
        }
      }
    }

    aiMsg.text = pipe.codeOutput || pipe.blueprint || "Đã hoàn tất quy trình 4-Agent.";
    haptic("ok");
    showToast("Dây chuyền 4-Agent đã hoàn tất");
  } catch (e) {
    pipe.steps.push({ id: "st-err-" + Date.now(), role: "error", num: "!", title: "Dừng dây chuyền", modelLabel: "", status: "fail", text: e.name === "AbortError" ? "Đã dừng theo yêu cầu." : e.message });
    aiMsg.text = `Dây chuyền dừng: ${e.message}`;
  } finally {
    aiMsg.streaming = false; S.streaming = false; S.abort = null; chat.updatedAt = Date.now();
    apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {});
    syncAccountUI(); renderMessages(); renderMemoryBar(); updateOrbButton();
  }
}

async function approveArchitectAndContinue(msgId) {
  const chat = S.chats.find(c => c.id === S.activeChatId);
  const msg = chat?.messages.find(m => m.id === msgId);
  if (!msg?.pipeline) return;
  const ta = document.getElementById("bp-edit-" + msgId);
  if (ta) msg.pipeline.blueprint = ta.value.trim();
  haptic("ok");
  await runFourAgentPipeline(chat, msg.pipeline.prompt, msg);
}
function cancelArchitectGate(msgId) {
  const chat = S.chats.find(c => c.id === S.activeChatId);
  const msg = chat?.messages.find(m => m.id === msgId);
  if (!msg?.pipeline) return;
  msg.pipeline.awaitingApproval = false;
  msg.text = msg.pipeline.blueprint;
  renderMessages();
  showToast("Đã dừng sau bước Architect");
}
function openPipelineCanvas(msgId) {
  const msg = S.chats.find(c => c.id === S.activeChatId)?.messages.find(m => m.id === msgId);
  const fc = msg?.pipeline?.finalCode;
  if (!fc) return showToast("Không tìm thấy khối code trong kết quả");
  openCanvasCode(fc.code, "4-Agent Output");
}
function copyPipelineCode(msgId) {
  const msg = S.chats.find(c => c.id === S.activeChatId)?.messages.find(m => m.id === msgId);
  const txt = msg?.pipeline?.finalCode?.code || msg?.pipeline?.codeOutput || msg?.text || "";
  copyText(txt, "Đã sao chép mã nguồn cuối");
}
function openEditImagePromptModal(origPrompt) {
  openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:8px;">Chỉnh sửa mô tả tạo ảnh</h3>
    <textarea id="eip-ta" class="field" rows="4">${esc(origPrompt)}</textarea>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
      <button class="btn-s tap" onclick="closeModal()">Hủy</button>
      <button class="btn-p tap" onclick="const v=document.getElementById('eip-ta').value.trim();closeModal();if(v){S.activeTool='image';sendPrompt(v);}">Tạo ảnh mới</button>
    </div>`);
}

async function sendPrompt(overrideText = null, opts = {}) {
  if (S.streaming) { S.abort?.abort(); return; }
  if (!S.user) return showAuthGate(true);
  if (!S.user.licenseActive && S.user.role !== "admin") return showKeyGate(true);
  if (S.user.role !== "admin" && S.user.limits && S.user.dailyMsgs >= S.user.limits.daily_msgs) {
    haptic("err"); return showToast(`Đã hết giới hạn ${S.user.limits.daily_msgs} tin nhắn/ngày`);
  }

  const input = document.getElementById("prompt-in");
  const text = (overrideText !== null ? overrideText : input.value).trim();
  if (!opts.reuseLastUser && !text && !S.atts.length) return;
  haptic("tap");

  [...text.matchAll(/@([a-zA-Z0-9_-]+)/g)].forEach(m => {
    const sk = S.skills.find(s => s.name.toLowerCase() === m[1].toLowerCase());
    if (sk && !S.skillIds.includes(sk.id)) S.skillIds.push(sk.id);
  });
  renderSkillStack();

  let chat = S.chats.find(c => c.id === S.activeChatId);
  if (!chat) {
    chat = {
      id: "c-" + Date.now(), title: (text || S.atts[0]?.name || "Cuộc trò chuyện mới").slice(0, 42),
      pinned: false, mode: S.cfg.workMode, nbId: S.activeNbId,
      pinnedProvider: null, pinnedKeyIndex: null, pinnedSlotLabel: "",
      updatedAt: Date.now(), messages: []
    };
    S.chats.unshift(chat); S.activeChatId = chat.id;
  }

  let sentAtts = [];
  if (!opts.reuseLastUser) {
    sentAtts = [...S.atts];
    chat.messages.push({ id: "m-" + Date.now(), role: "user", text, atts: sentAtts, ts: Date.now() });
    chat.updatedAt = Date.now();
    if (overrideText === null) { input.value = ""; autoGrow(); }
    S.atts = []; renderChips(); renderMessages(); renderChatsList(); scrollToBottom(true);
  }

  if (S.cfg.workMode === "four_agent" && !opts.forceSwitch) {
    return runFourAgentPipeline(chat, text);
  }
  const autoImgPrompt = S.activeTool === "image" ? text : (!sentAtts.length && !opts.forceSwitch ? detectImageIntent(text, chat) : null);
  if (autoImgPrompt) return runGenImage(chat, autoImgPrompt);

  const sysPrompt = buildSystemPrompt(chat, text, sentAtts.some(a => a.dataUrl), opts.handoffSummary || "");
  renderMemoryBar();
  const chosenUi = S.models.find(m => m.id === S.cfg.selectedModel) || S.models.find(x => x.allowed) || S.models[0];
  const aiMsg = {
    id: "m-" + (Date.now() + 1), role: "assistant", text: "",
    modelLabel: `${chosenUi.short || chosenUi.title} ${THINK_LEVELS.find(x => x.id === S.cfg.thinkingLevel)?.title}`,
    slot: "", citedFile: sentAtts[0]?.name || "", feedback: null, streaming: true, failedSwitch: false, canSwitch: false, ts: Date.now()
  };
  chat.messages.push(aiMsg); renderMessages(); scrollToBottom(true);

  S.streaming = true; S.abort = new AbortController(); updateOrbButton();
  try {
    const msgs = [{ role: "system", content: sysPrompt }];
    for (const m of chat.messages.slice(0, -1).filter(x => !x.failedSwitch).slice(-20)) {
      if (m.role === "assistant") { msgs.push({ role: "assistant", content: m.text || "" }); continue; }
      const imgs = (m.atts || []).filter(a => a.dataUrl), docs = (m.atts || []).filter(a => a.type === "file");
      let txt = m.text || "";
      if (docs.length) txt += "\n\n" + docs.map(d => `[TỆP ${d.name}]\n${d.text}`).join("\n\n");
      if (imgs.length) {
        const arr = [{ type: "text", text: txt || "Phân tích chi tiết toàn bộ hình ảnh này." }];
        imgs.forEach(im => arr.push({ type: "image_url", image_url: { url: im.dataUrl, detail: "high" } }));
        msgs.push({ role: "user", content: arr });
      } else msgs.push({ role: "user", content: txt });
    }

    const res = await apiFetch("/ai/chat", {
      method: "POST",
      body: {
        chatId: chat.id,
        uiModelId: chosenUi.id,
        tool: S.activeTool,
        messages: msgs,
        stream: true,
        pinnedProvider: chat.pinnedProvider,
        pinnedKeyIndex: chat.pinnedKeyIndex,
        forceSwitch: Boolean(opts.forceSwitch)
      },
      signal: S.abort.signal
    });

    if (!res.ok) {
      const ej = await res.json().catch(() => ({ error: "HTTP " + res.status }));
      if (ej.code === "MAINTENANCE") { applySystemMeta({ ...S.system, maintenance: { enabled: true, message: ej.error } }); }
      if (ej.code === "MUST_CHANGE_PASSWORD") { S.user.mustChangePassword = true; showForcePwdGate(true); }
      if (ej.code === "KEY_REQUIRED") { S.user.licenseActive = false; showKeyGate(true, ej.error); }
      if (ej.code === "QUOTA_EXCEEDED" && S.user) {
        if (typeof ej.dailyMsgs === "number") S.user.dailyMsgs = ej.dailyMsgs;
        if (typeof ej.dailyLimit === "number" && S.user.limits) S.user.limits.daily_msgs = ej.dailyLimit;
        if (typeof ej.dailyTokens === "number") S.user.dailyTokens = ej.dailyTokens;
        if (typeof ej.dailyTokenLimit === "number" && S.user.limits) S.user.limits.daily_tokens = ej.dailyTokenLimit;
        syncAccountUI();
      }
      if (ej.code === "PINNED_KEY_FAILED") {
        aiMsg.failedSwitch = true;
        aiMsg.canSwitch = Boolean(ej.canSwitch);
        aiMsg.text = ej.error;
        return;
      }
      throw new Error(ej.error || `HTTP ${res.status}`);
    }

    // Save Sticky API Pin returned by server (1 Chat = 1 Provider + 1 Key Slot)
    const pId = res.headers.get("X-Provider-Id"), kIdx = res.headers.get("X-Key-Index"), slotLbl = res.headers.get("X-Key-Slot");
    if (pId && kIdx !== null) {
      chat.pinnedProvider = pId;
      chat.pinnedKeyIndex = Number(kIdx);
      chat.pinnedSlotLabel = slotLbl || `${pId} #${Number(kIdx) + 1}`;
    }

    const hm = res.headers.get("X-Daily-Msgs"), hl = res.headers.get("X-Daily-Limit"), ht = res.headers.get("X-Daily-Tokens"), htl = res.headers.get("X-Daily-Token-Limit");
    if (S.user) {
      if (hm !== null) S.user.dailyMsgs = Number(hm);
      if (hl !== null && S.user.limits) S.user.limits.daily_msgs = Number(hl);
      if (ht !== null) S.user.dailyTokens = Number(ht);
      if (htl !== null && S.user.limits) S.user.limits.daily_tokens = Number(htl);
      syncAccountUI();
    }
    aiMsg.slot = slotLbl || "";
    const um = res.headers.get("X-Used-Model"); if (um) aiMsg.modelLabel += ` · ${um}`;

    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("text/event-stream") && res.body?.getReader) {
      const reader = res.body.getReader(), dec = new TextDecoder("utf-8");
      let buf = "", raf = false;
      const paint = () => {
        raf = false; const el = document.getElementById("md-" + aiMsg.id);
        if (el) { const ld = el.previousElementSibling; if (ld?.classList.contains("wavy-box")) ld.remove(); el.innerHTML = renderMd(aiMsg.text); if (isNearBottom()) scrollToBottom(false); }
      };
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() || "";
        for (const l of lines) {
          const t = l.trim(); if (!t.startsWith("data:")) continue;
          const d = t.slice(5).trim(); if (d === "[DONE]") continue;
          try { const delta = JSON.parse(d).choices?.[0]?.delta?.content || ""; if (delta) { aiMsg.text += delta; if (!raf) { raf = true; requestAnimationFrame(paint); } } } catch {}
        }
      }
      paint();
    } else {
      const raw = await res.text();
      if (raw.includes("data:")) {
        for (const l of raw.split("\n")) { const t = l.trim(); if (!t.startsWith("data:")) continue; const d = t.slice(5).trim(); if (d === "[DONE]") continue; try { aiMsg.text += JSON.parse(d).choices?.[0]?.delta?.content || ""; } catch {} }
      } else { try { const j = JSON.parse(raw); aiMsg.text = j.choices?.[0]?.message?.content || j.error?.message || "Không có phản hồi."; } catch { aiMsg.text = raw || "Không có phản hồi."; } }
    }
    if (S.activeTool === "canvas") { const m = aiMsg.text.match(/```html\n([\s\S]*?)```/i); if (m) openCanvasCode(m[1], chat.title); }
    if (S.liveMode && aiMsg.text) speakLiveReply(aiMsg.text);
  } catch (e) {
    aiMsg.text = e.name === "AbortError" ? (aiMsg.text + "\n\n*(Đã dừng)*") : `**Thông báo:** ${e.message}`;
  } finally {
    aiMsg.streaming = false; S.streaming = false; S.abort = null; chat.updatedAt = Date.now();
    apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {});
    syncAccountUI(); renderMessages(); renderMemoryBar(); updateOrbButton();
  }
}

async function runGenImage(chat, prompt) {
  const aiMsg = { id: "m-" + (Date.now() + 1), role: "assistant", text: "Đang tạo hình ảnh...", modelLabel: "Tạo ảnh", streaming: true, ts: Date.now() };
  chat.messages.push(aiMsg); renderMessages(); S.streaming = true; updateOrbButton();
  try {
    const res = await apiFetch("/ai/image", { method: "POST", body: { prompt, size: "1024x1024" } });
    const data = await res.json();
    if (!res.ok) {
      if (data.code === "QUOTA_EXCEEDED" && S.user) {
        if (typeof data.dailyMsgs === "number") S.user.dailyMsgs = data.dailyMsgs;
        if (typeof data.dailyLimit === "number" && S.user.limits) S.user.limits.daily_msgs = data.dailyLimit;
        syncAccountUI();
      }
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    const hm = res.headers.get("X-Daily-Msgs"); if (hm !== null && S.user) { S.user.dailyMsgs = Number(hm); syncAccountUI(); }
    const it = data.data?.[0], src = it?.b64_json ? `data:image/png;base64,${it.b64_json}` : it?.url;
    if (!src) throw new Error("Không nhận được dữ liệu ảnh.");
    aiMsg.text = `Đã tạo ảnh: **${prompt}**`; aiMsg.genImg = src; aiMsg.imagePrompt = prompt;
    await saveLib("media", prompt.slice(0, 32), src); haptic("ok"); showToast("Đã lưu ảnh vào Thư viện");
  } catch (e) { aiMsg.text = `**Không thể tạo ảnh:** ${e.message}`; }
  finally { aiMsg.streaming = false; S.streaming = false; S.activeTool = null; renderChips(); apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {}); renderMessages(); updateOrbButton(); }
}

/* ===== MARKDOWN & MESSAGE RENDERING ===== */
let cbSeq = 0;
function renderMd(md) {
  const blocks = [];
  let s = String(md || "").replace(/```([\w-]*)\n([\s\S]*?)```/g, (_, lang, code) => { const i = blocks.length; blocks.push({ lang: lang || "text", code }); return `@@CB_${i}@@`; });
  s = esc(s)
    .replace(/^### (.*)$/gm, "<h3>$1</h3>").replace(/^## (.*)$/gm, "<h2>$1</h2>").replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/^&gt; (.*)$/gm, "<blockquote>$1</blockquote>").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/`([^`]+)`/g, '<code class="ic">$1</code>')
    .replace(/^\s*[-*] (.*)$/gm, "<li>$1</li>").replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>").replace(/<\/ul>\s*<ul>/g, "")
    .replace(/\n{2,}/g, "</p><p>");
  s = `<p>${s.replace(/\n/g, "<br>")}</p>`;
  blocks.forEach((b, i) => {
    const enc = encodeURIComponent(b.code), cid = "cb-" + (++cbSeq), canPrev = ["html", "svg"].includes(b.lang.toLowerCase());
    s = s.replace(`@@CB_${i}@@`, `<div class="code-box"><div class="code-top">
      <button class="tap" style="display:inline-flex;align-items:center;gap:6px;color:var(--ink-2);font-size:12.5px;" onclick="toggleAcc('${cid}','ch-${cid}')">
        <span id="ch-${cid}" class="chev rot"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></span><span>${esc(b.lang)}</span></button>
      <div class="code-btns">
        ${canPrev ? `<button class="code-icon-btn tap" onclick="openCanvasCode(decodeURIComponent('${enc}'),'Canvas')" aria-label="Xem trước"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><polygon points="6 4 20 12 6 20 6 4"/></svg></button>` : ""}
        <button class="code-icon-btn tap" onclick="copyCodeBtn(this,decodeURIComponent('${enc}'))" aria-label="Sao chép"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
      </div></div><div id="${cid}" class="acc-wrap open"><div class="acc-inner"><pre><code>${esc(b.code)}</code></pre></div></div></div>`);
  });
  return s;
}
function copyCodeBtn(btn, txt) { haptic("ok"); copyText(txt, "Đã sao chép"); const orig = btn.innerHTML; btn.classList.add("copied"); btn.innerHTML = ICON_CHECK; setTimeout(() => { btn.classList.remove("copied"); btn.innerHTML = orig; }, 1300); }

function renderMessages() {
  const hero = document.getElementById("empty-hero"), list = document.getElementById("messages"), chat = S.chats.find(c => c.id === S.activeChatId);
  if (!chat || !chat.messages.length) { hero.style.display = "flex"; list.innerHTML = ""; return; }
  hero.style.display = "none";
  list.innerHTML = chat.messages.map(m => {
    if (m.role === "user") {
      const thumbs = (m.atts || []).filter(a => a.dataUrl).map(a => `<img class="user-thumb-img" src="${a.dataUrl}" onclick="openLightbox('${a.dataUrl}')" />`).join("");
      const docs = (m.atts || []).filter(a => a.type === "file").map(a => `<span class="cite-pill">${esc(a.name)}</span>`).join("");
      return `<div class="msg-row user">${thumbs ? `<div class="user-thumbs">${thumbs}</div>` : ""}${docs ? `<div class="user-thumbs">${docs}</div>` : ""}${m.text ? `<div class="user-bubble lg-card">${esc(m.text)}</div>` : ""}</div>`;
    }
    if (m.pipeline) {
      const p = m.pipeline;
      const stepsHtml = (p.steps || []).map((st, idx) => {
        const isLast = idx === p.steps.length - 1;
        const stBadge = st.status === "running"
          ? `<span class="tag-st st-unused">Đang chạy...</span>`
          : (st.status === "fail" ? `<span class="tag-st st-pending">Phát hiện lỗi</span>` : `<span class="tag-st st-active">Xong</span>`);
        return `<div class="pipe-card ${st.status}">
          <button class="pipe-head tap-soft" onclick="toggleAcc('pa-${st.id}','pc-${st.id}')">
            <span class="pipe-head-l">
              <span class="pipe-step-num">${esc(st.num)}</span>
              <span style="font-weight:520;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(st.title)}</span>
              <span class="tag-quiet nowrap-pill">${esc(st.modelLabel)}</span>
            </span>
            <span style="display:inline-flex;align-items:center;gap:6px;flex-shrink:0;">
              ${stBadge}
              <span id="pc-${st.id}" class="chev ${isLast?"rot":""}"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></span>
            </span>
          </button>
          <div id="pa-${st.id}" class="acc-wrap ${isLast?"open":""}">
            <div class="acc-inner"><div class="pipe-body md" id="pipe-md-${st.id}">${st.text ? renderMd(st.text) : "Đang xử lý..."}</div></div>
          </div>
        </div>`;
      }).join("");

      const gateHtml = p.awaitingApproval ? `<div class="pipe-gate-box">
        <strong style="font-size:13.5px;">Điểm dừng duyệt bản vẽ (Architect)</strong>
        <div style="font-size:12px;color:var(--ink-2);">Bạn có thể chỉnh sửa trực tiếp bản thiết kế bên dưới trước khi giao cho Coder → Reviewer → Tester:</div>
        <textarea id="bp-edit-${m.id}" class="field" rows="6" style="font-size:13px;">${esc(p.blueprint || "")}</textarea>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn-p tap" style="flex:1;" onclick="approveArchitectAndContinue('${m.id}')">Duyệt & Chạy tiếp</button>
          <button class="btn-s tap" onclick="cancelArchitectGate('${m.id}')">Dừng tại đây</button>
        </div></div>` : "";

      const doneActs = (!m.streaming && !p.awaitingApproval && (p.finalCode || p.codeOutput)) ? `<div class="img-act-row">
        ${p.finalCode ? `<button class="btn-p tap" style="height:34px;font-size:12.5px;" onclick="openPipelineCanvas('${m.id}')">Mở code trong Canvas</button>` : ""}
        <button class="btn-s tap" style="height:34px;font-size:12.5px;" onclick="copyPipelineCode('${m.id}')">Sao chép mã cuối</button>
      </div>` : "";

      return `<div class="msg-row assistant"><div class="pipeline-wrap">
        <div class="ai-meta-line">
          <span class="ai-logo-badge"><img class="brand-mark" src="logo-mark.png" alt="" width="15" height="15" /></span>
          <span class="meta-pill">4-Agent Dev Pipeline</span>
          ${(S.user?.role === "admin" && m.slot) ? `<span class="meta-pill nowrap-pill">${esc(m.slot)}</span>` : ""}
        </div>
        ${stepsHtml}${gateHtml}${doneActs}
      </div></div>`;
    }
    if (m.failedSwitch) {
      return `<div class="msg-row assistant"><div class="switch-api-card">
        <div>${esc(m.text)}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${m.canSwitch ? `<button class="btn-p tap" style="height:34px;font-size:12.5px;" onclick="switchChatApiWithSummary('${m.id}')">Chuyển API khác kèm tóm tắt mạch chat</button>` : ""}
          <button class="btn-s tap" style="height:34px;font-size:12.5px;" onclick="startNewChat()">Mở đoạn chat mới</button>
        </div></div></div>`;
    }
    const wavy = m.streaming && !m.text ? `<div class="wavy-box"><svg class="wavy-svg" viewBox="0 0 104 16"><path class="wavy-path" d="M0 8 Q6.5 1 13 8 T26 8 T39 8 T52 8 T65 8 T78 8 T91 8 T104 8"/></svg><span>Đang suy luận...</span></div>` : "";
    return `<div class="msg-row assistant"><div class="ai-block">
      <div class="ai-meta-line">
        <span class="ai-logo-badge"><img class="brand-mark" src="logo-mark.png" alt="" width="14" height="14" /></span>
        <span class="meta-pill">${esc(m.modelLabel || "API AI")}</span>
        ${(S.user?.role === "admin" && m.slot) ? `<span class="meta-pill nowrap-pill">${esc(m.slot)}</span>` : ""}
      </div>
      ${wavy}<div class="md" id="md-${m.id}">${m.text ? renderMd(m.text) : ""}</div>
      ${m.citedFile ? `<span class="cite-pill">${esc(m.citedFile)}</span>` : ""}
      ${m.genImg ? `<img class="gen-img" src="${m.genImg}" onclick="openLightbox('${m.genImg}')" />
        ${m.imagePrompt ? `<div class="img-act-row">
          <button class="btn-s tap" style="height:32px;font-size:12px;" onclick="S.activeTool='image';sendPrompt(decodeURIComponent('${encodeURIComponent(m.imagePrompt)}'))">Tạo lại ảnh</button>
          <button class="btn-s tap" style="height:32px;font-size:12px;" onclick="openEditImagePromptModal(decodeURIComponent('${encodeURIComponent(m.imagePrompt)}'))">Sửa mô tả</button>
        </div>` : ""}` : ""}
      ${!m.streaming ? `<div class="ai-actions"><div class="ai-act-left">
        <button class="act-icon tap ${m.feedback==="up"?"active-like":""}" onclick="rateMsg('${m.id}','up')" aria-label="Thích"><svg fill="${m.feedback==="up"?"currentColor":"none"}" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg></button>
        <button class="act-icon tap ${m.feedback==="down"?"active-dislike":""}" onclick="rateMsg('${m.id}','down')" aria-label="Không thích"><svg fill="${m.feedback==="down"?"currentColor":"none"}" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 14V2M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg></button>
        <button class="act-icon tap" onclick="shareMsg('${m.id}')" aria-label="Chia sẻ"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4m0-11-6.8 4"/></svg></button>
        <button class="act-icon tap" onclick="copyCodeBtn(this,getMsgText('${m.id}'))" aria-label="Sao chép"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
        <button class="act-icon tap" onclick="openMsgMore('${m.id}')" aria-label="Thêm"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.1"/><circle cx="12" cy="12" r="1.1"/><circle cx="19" cy="12" r="1.1"/></svg></button>
      </div><button class="act-icon tap ${S.speakingMsgId===m.id?"speaking":""}" onclick="toggleSpeak('${m.id}')" aria-label="Đọc to"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg></button></div>` : ""}
    </div></div>`;
  }).join("");
}
function getMsgText(id) { return S.chats.find(c => c.id === S.activeChatId)?.messages.find(m => m.id === id)?.text || ""; }
function rateMsg(id, d) { haptic("tap"); const m = S.chats.find(x => x.id === S.activeChatId)?.messages.find(x => x.id === id); if (!m) return; m.feedback = m.feedback === d ? null : d; renderMessages(); }
function shareMsg(id) { const t = getMsgText(id); if (navigator.share) navigator.share({ title: "API AI", text: t }).catch(() => {}); else copyText(t, "Đã sao chép"); }
function openMsgMore(id) {
  openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:10px;">Tùy chọn phản hồi</h3>
    <button class="s-row tap-soft" onclick="closeModal();openCanvasCode(getMsgText('${id}'),'Canvas')"><span>Mở trong Canvas</span></button>
    <button class="s-row tap-soft" onclick="closeModal();saveLib('doc','Ghi chú API AI',getMsgText('${id}'));showToast('Đã lưu Thư viện')"><span>Lưu vào Thư viện</span></button>
    <button class="s-row tap-soft" onclick="closeModal();addQuickMemory(getMsgText('${id}').slice(0,220))"><span>Lưu đoạn này vào Trí nhớ</span></button>`);
}
function toggleSpeak(id) {
  if (!window.speechSynthesis) return showToast("Thiết bị không hỗ trợ đọc giọng nói");
  if (S.speakingMsgId === id) { speechSynthesis.cancel(); S.speakingMsgId = null; renderMessages(); return; }
  speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(getMsgText(id).replace(/[#*`]/g, "")); u.lang = "vi-VN";
  u.onend = () => { S.speakingMsgId = null; renderMessages(); }; S.speakingMsgId = id; renderMessages(); speechSynthesis.speak(u);
}

/* =========================================================================
   ADMIN DASHBOARD (6 TABS: KEYS / 4 TIERS MATRIX / PROVIDERS & MODELS / USERS / RESETS / SYSTEM)
   ========================================================================= */
async function openAdminPanel() { switchView("admin"); await loadAdminData(); }
async function loadAdminData(silent = false) {
  try {
    const r = await apiFetch("/admin/overview"), data = await r.json();
    if (!r.ok) throw new Error(data.error || "Không tải được Admin");
    S.adminData = data;
    const pCnt = (data.resetRequests || []).filter(x => x.status === "pending").length;
    const pill = document.getElementById("admin-pending-pill"), dot = document.getElementById("menu-badge-dot");
    pill.style.display = pCnt ? "inline-block" : "none"; pill.textContent = String(pCnt);
    dot.classList.toggle("show", pCnt > 0); dot.textContent = String(pCnt);
    const tc = document.getElementById("tab-rst-count"); if (tc) tc.textContent = pCnt ? `(${pCnt})` : "";
    if (!silent) renderAdminBody();
  } catch (e) { if (!silent) showToast(e.message); }
}
function setAdminTab(t) { haptic("tap"); S.adminTab = t; document.querySelectorAll("[data-adtab]").forEach(b => b.classList.toggle("active", b.dataset.adtab === t)); renderAdminBody(); }

function renderAdminBody() {
  const d = S.adminData, box = document.getElementById("admin-body");
  if (!d) { box.innerHTML = `<p class="p-sub">Đang tải dữ liệu...</p>`; return; }

  // TAB 1: KEYS (TIER x DURATION)
  if (S.adminTab === "keys") {
    box.innerHTML = `<div class="card-item lg-card">
      <strong style="display:block;margin-bottom:8px;font-weight:520;">Tạo Key bản quyền (4 Hạng × 9 Thời hạn)</strong>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div><label class="f-lbl">Hạng Key</label><select id="ak-tier" class="field">${TIER_OPTIONS.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select></div>
        <div><label class="f-lbl">Thời hạn</label><select id="ak-plan" class="field">${PLAN_OPTIONS.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select></div>
        <div><label class="f-lbl">Số lượng</label><input id="ak-cnt" type="number" min="1" max="50" value="1" class="field num" /></div>
        <div><label class="f-lbl">Tiền tố Key</label><input id="ak-pre" class="field" value="APIAI" /></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div><label class="f-lbl">Tối đa máy (để trống = mặc định hạng)</label><input id="ak-dev" type="number" min="1" max="10" class="field num" placeholder="Mặc định" /></div>
        <div><label class="f-lbl">Ghi chú</label><input id="ak-note" class="field" placeholder="Tên khách" /></div>
      </div>
      <button class="btn-p tap" style="width:100%;margin-top:12px;" onclick="adminCreateKeys()">Tạo Key mới</button>
    </div>
    <div style="font-size:13px;color:var(--ink-2);margin:10px 0 8px;" class="num">Danh sách Key (${d.keys.length})</div>
    ${d.keys.map(k => {
      const tier = k.key_tier || (k.plan_type === "week" ? "classic" : "pro");
      return `<div class="card-item lg-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap;">
          <strong style="font-family:var(--font-mono);font-size:13px;">${esc(k.key_code)}</strong>
          <div style="display:flex;gap:5px;">
            <span class="tag-st tier-${tier}">${esc(TIER_LABELS[tier] || tier)}</span>
            <span class="tag-st st-${k.status}">${k.status}</span>
          </div>
        </div>
        <div style="font-size:12.5px;color:var(--ink-2);margin-top:6px;line-height:1.55;">
          Thời hạn: <b>${esc(d.planLabels?.[k.plan_type] || k.plan_type)}</b> · Max <b class="num">${k.max_devices}</b> máy<br/>
          Email gắn: <b style="color:var(--info-ink);">${esc(k.bound_email || "Chưa kích hoạt")}</b><br/>
          ${k.expires_at ? `Hết hạn: ${new Date(k.expires_at).toLocaleString("vi-VN")}` : `Bắt đầu đếm ${k.duration_days} ngày khi kích hoạt`}
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">
          <button class="btn-s tap" onclick="copyText('${esc(k.key_code)}','Đã copy Key')">Sao chép</button>
          <button class="btn-s tap" onclick="adminChangeKeyTierModal('${esc(k.key_code)}','${tier}')">Đổi hạng</button>
          <button class="btn-s tap" onclick="adminKeyAct('${esc(k.key_code)}','extend')">+30 ngày</button>
          <button class="btn-s tap" onclick="adminKeyAct('${esc(k.key_code)}','reset_devices')">Reset máy</button>
          <button class="btn-danger tap" onclick="adminKeyAct('${esc(k.key_code)}','${k.status==="revoked"?"unrevoke":"revoke"}')">${k.status==="revoked"?"Mở lại":"Thu hồi"}</button>
          <button class="btn-danger tap" onclick="adminKeyAct('${esc(k.key_code)}','delete')">Xóa</button>
        </div></div>`;
    }).join("")}`;
    return;
  }

  // TAB 2: 4 KEY TIER PERMISSIONS MATRIX (2A + ĐỘT PHÁ)
  if (S.adminTab === "tiers") {
    const t = S.selectedTierTab || "classic";
    const lim = d.config.tier_limits?.[t] || {};
    const allModels = d.config.models || [];
    const allowedSet = new Set(lim.allowed_models || []);
    const vis = d.config.locked_model_visibility || "locked";

    box.innerHTML = `
      <div class="card-item lg-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
          <div>
            <strong style="font-size:14.5px;font-weight:520;">Hiển thị Model ngoài quyền của gói</strong>
            <div style="font-size:12px;color:var(--ink-3);">Áp dụng toàn hệ thống cho cả Model cũ và Model mới thêm</div>
          </div>
          <select id="ad-vis-mode" class="field" style="width:auto;padding:8px 12px;font-size:13px;" onchange="adminSaveLockedVis(this.value)">
            <option value="locked" ${vis==="locked"?"selected":""}>Hiện có ổ khóa + nhãn hạng</option>
            <option value="hidden" ${vis==="hidden"?"selected":""}>Ẩn hẳn khỏi danh sách</option>
          </select>
        </div>
      </div>

      <div class="card-item lg-card">
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
          ${TIER_OPTIONS.map(([v, l]) => `<button class="btn-s tap ${v===t?"lg-active":""}" onclick="S.selectedTierTab='${v}';renderAdminBody()">${l}</button>`).join("")}
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div><label class="f-lbl">Tin nhắn tối đa / ngày</label><input id="tl-msgs" type="number" class="field num" value="${lim.daily_msgs ?? 25}" /></div>
          <div><label class="f-lbl">Ngân sách Token / ngày</label><input id="tl-toks" type="number" class="field num" value="${lim.daily_tokens ?? 35000}" /></div>
        </div>
        <label class="f-lbl">Số thiết bị tối đa</label>
        <input id="tl-devs" type="number" class="field num" value="${lim.max_devices ?? 1}" />

        <label class="f-lbl" style="margin-top:14px;">Các Model được phép dùng cho hạng ${esc(TIER_LABELS[t])}</label>
        <div id="tl-models-box">
          ${allModels.map(m => `
            <label class="model-check-row">
              <div>
                <strong style="font-size:13.5px;">${esc(m.title)}</strong> ${m.enabled===false ? `<span class="tag-st st-revoked">Đang tắt</span>` : ""}
                <div style="font-size:11.5px;color:var(--ink-3);">${esc(m.mapped)} · Nguồn: ${esc(m.provider_id)}</div>
              </div>
              <input type="checkbox" value="${esc(m.id)}" ${allowedSet.has(m.id) ? "checked" : ""} />
            </label>`).join("")}
        </div>

        <div class="div-line" style="margin:12px 0;"></div>
        <div class="s-row" onclick="this.querySelector('.sw').classList.toggle('on')"><span>Chế độ Dây chuyền 4-Agent Lập trình</span><div id="tl-4a" class="sw ${lim.allow_four_agent?"on":""}"></div></div>
        <div class="s-row" onclick="this.querySelector('.sw').classList.toggle('on')"><span>Cài & Cập nhật GitHub Repo vào Skills</span><div id="tl-gh" class="sw ${lim.allow_github_skills?"on":""}"></div></div>
        <div class="s-row" onclick="this.querySelector('.sw').classList.toggle('on')"><span>Gửi ảnh HD 2048px</span><div id="tl-hd" class="sw ${lim.allow_hd_vision?"on":""}"></div></div>
        <div class="s-row" onclick="this.querySelector('.sw').classList.toggle('on')"><span>Tạo hình ảnh</span><div id="tl-img" class="sw ${lim.allow_image_gen?"on":""}"></div></div>
        <div class="s-row" onclick="this.querySelector('.sw').classList.toggle('on')"><span>Deep Research</span><div id="tl-dr" class="sw ${lim.allow_deep_research?"on":""}"></div></div>
        <div class="s-row" onclick="this.querySelector('.sw').classList.toggle('on')"><span>Canvas chạy code</span><div id="tl-cv" class="sw ${lim.allow_canvas?"on":""}"></div></div>

        <button class="btn-p tap" style="width:100%;margin-top:14px;" onclick="adminSaveTier('${t}')">Lưu cấu hình hạng ${esc(TIER_LABELS[t])}</button>
      </div>`;
    return;
  }

  // TAB 3: MULTI-PROVIDERS & DYNAMIC MODELS + /v1/models SCANNER (1 + 4A ĐỘT PHÁ)
  if (S.adminTab === "api") {
    const provs = d.config.providers || [], mods = d.config.models || [];
    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <strong style="font-size:15px;">Nguồn API (${provs.length})</strong>
        <button class="btn-blue tap" onclick="adminEditProviderModal(null)">+ Thêm nguồn API</button>
      </div>
      ${provs.map((p, i) => `
        <div class="card-item lg-card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
            <div>
              <strong>${esc(p.name)}</strong> <span class="pill-sub">${esc(p.protocol)}</span>
              <span class="tag-st ${p.enabled!==false?"st-active":"st-revoked"}">${p.enabled!==false?"Đang bật":"Tắt"}</span>
            </div>
            <span class="num" style="font-size:12px;color:var(--ink-2);">${(p.api_keys||[]).length} API Key</span>
          </div>
          <div style="font-size:12px;font-family:var(--font-mono);color:var(--ink-3);margin-top:5px;word-break:break-all;">${esc(p.base_url)}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">
            <button class="btn-s tap" onclick="adminEditProviderModal(${i})">Sửa & Key Pool</button>
            <button class="btn-blue tap" onclick="adminScanProviderModels('${esc(p.id)}')">Quét Model (/models)</button>
            <button class="btn-s tap" onclick="adminCheckProviderUsage('${esc(p.id)}')">Số dư (?format=text)</button>
            ${provs.length > 1 ? `<button class="btn-danger tap" onclick="adminDeleteProvider(${i})">Xóa</button>` : ""}
          </div>
        </div>`).join("")}

      <div style="display:flex;justify-content:space-between;align-items:center;margin:18px 0 10px;">
        <strong style="font-size:15px;">Danh sách Model (${mods.length})</strong>
        <button class="btn-blue tap" onclick="adminAddModelModal()">+ Thêm Model thủ công</button>
      </div>
      ${mods.map((m, i) => `
        <div class="card-item lg-card" style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
          <div style="min-width:0;flex:1;">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              <strong>${esc(m.title)}</strong>
              <span class="pill-sub">${esc(m.provider_id)}</span>
              ${m.cost_label ? `<span class="tag-quiet">${esc(m.cost_label)}</span>` : ""}
            </div>
            <div style="font-size:12px;color:var(--ink-3);font-family:var(--font-mono);margin-top:2px;">${esc(m.mapped)}</div>
          </div>
          <div class="sw ${m.enabled!==false?"on":""}" onclick="adminToggleModelEnabled(${i})" title="Bật/Tắt model"></div>
          ${m.id !== "auto" ? `<button class="mini-act tap" onclick="adminDeleteModel(${i})">${ICON_X}</button>` : ""}
        </div>`).join("")}`;
    return;
  }

  // TAB 4: USERS
  if (S.adminTab === "users") {
    box.innerHTML = `<div style="font-size:13px;color:var(--ink-2);margin-bottom:8px;" class="num">Tổng số tài khoản: ${d.users.length}</div>` + d.users.map(u => `
      <div class="card-item lg-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap;">
          <strong>${esc(u.email)}</strong>
          <div style="display:flex;gap:5px;flex-wrap:wrap;">
            ${u.must_change_password ? `<span class="tag-st st-pending">Chờ đổi MK tạm</span>` : (u.password_changed_at ? `<span class="tag-st st-active">Đã tự đổi MK</span>` : "")}
            <span class="tag-st ${u.banned?"st-revoked":(u.role==="admin"?"st-active":"tier-"+u.key_tier)}">${esc(u.banned ? "Bị khóa" : (u.tier_label || u.key_tier))}</span>
          </div>
        </div>
        <div style="font-size:12.5px;color:var(--ink-2);margin-top:6px;line-height:1.55;">
          Key: <code style="font-family:var(--font-mono);color:var(--accent-ink);">${esc(u.active_key || "Không có")}</code><br/>
          Hết hạn: ${u.key_expires_at ? new Date(u.key_expires_at).toLocaleString("vi-VN") : "—"} · Thiết bị: <b class="num">${u.deviceCount}</b><br/>
          Hôm nay: <b class="num">${u.daily_msg_count}/${u.role==="admin"?"∞":(u.daily_msg_limit ?? "?")}</b> tin · <b class="num">${Math.round((u.daily_token_count||0)/1000)}K/${u.role==="admin"?"∞":Math.round((u.daily_token_limit||0)/1000)+"K"}</b> token
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">
          <button class="btn-blue tap" onclick="adminPromptChangePass('${esc(u.email)}')">Đổi mật khẩu</button>
          <button class="btn-s tap" onclick="adminUserAct('${esc(u.email)}','reset_daily_usage')">Reset lượt hôm nay</button>
          <button class="btn-s tap" onclick="adminUserAct('${esc(u.email)}','reset_devices')">Reset thiết bị</button>
          ${u.role !== "admin" ? `<button class="btn-s tap" onclick="adminUserAct('${esc(u.email)}','clear_key')">Gỡ Key</button><button class="btn-danger tap" onclick="adminUserAct('${esc(u.email)}','${u.banned?"unban":"ban"}')">${u.banned?"Mở khóa":"Khóa TK"}</button>` : ""}
        </div></div>`).join("");
    return;
  }

  // TAB 5: FORGOT PASSWORD INBOX
  if (S.adminTab === "resets") {
    box.innerHTML = `<p class="p-sub">Phiếu yêu cầu Quên mật khẩu đã xác thực đúng Email và Key. Bấm Cấp mật khẩu mới rồi tự tay gửi email cho khách.</p>` +
      ((d.resetRequests || []).length ? d.resetRequests.map(r => `<div class="card-item lg-card">
        <div style="display:flex;justify-content:space-between;align-items:center;"><strong>${esc(r.email)}</strong><span class="tag-st ${r.status==="pending"?"st-pending":"st-active"}">${r.status==="pending"?"Chờ cấp MK":"Đã cấp MK"}</span></div>
        <div style="font-size:12.5px;color:var(--ink-2);margin-top:6px;">Key: <code style="font-family:var(--font-mono);color:var(--accent-ink);">${esc(r.key_code)}</code><br/>Gửi lúc: ${new Date(r.created_at).toLocaleString("vi-VN")}${r.new_temp_password ? `<br/>Mật khẩu mới: <b style="color:var(--ok-ink);">${esc(r.new_temp_password)}</b>` : ""}</div>
        <div style="display:flex;gap:8px;margin-top:10px;">
          ${r.status === "pending" ? `<button class="btn-p tap" onclick="adminResolveReset('${r.id}','${esc(r.email)}')">Cấp mật khẩu mới</button>` : `<button class="btn-s tap" onclick="openManualMailHandoff('${esc(r.email)}','${esc(r.new_temp_password||"")}')">Mở mẫu gửi mail</button>`}
        </div></div>`).join("") : `<div class="card-item lg-card" style="color:var(--ink-3);">Chưa có phiếu yêu cầu nào.</div>`);
    return;
  }

  // TAB 6: SYSTEM NOTICE & MAINTENANCE (5B ĐỘT PHÁ)
  if (S.adminTab === "system") {
    const n = d.config.system_notice || {}, m = d.config.maintenance || {};
    box.innerHTML = `
      <div class="card-item lg-card">
        <div class="s-row" style="padding:0 0 8px;" onclick="document.getElementById('sy-n-on').classList.toggle('on')">
          <strong>Thông báo toàn hệ thống (App Notice)</strong>
          <div id="sy-n-on" class="sw ${n.enabled?"on":""}"></div>
        </div>
        <label class="f-lbl">Nội dung thông báo</label>
        <textarea id="sy-n-txt" class="field" rows="3" placeholder="VD: Đã nâng cấp thêm model Claude Sonnet 5 cho gói Pro Max!">${esc(n.text || "")}</textarea>
        <label class="f-lbl">Mức độ</label>
        <select id="sy-n-lvl" class="field"><option value="info" ${n.level!=="warn"?"selected":""}>Thông tin (Xanh)</option><option value="warn" ${n.level==="warn"?"selected":""}>Cảnh báo (Vàng)</option></select>
      </div>
      <div class="card-item lg-card">
        <div class="s-row" style="padding:0 0 8px;" onclick="document.getElementById('sy-m-on').classList.toggle('on')">
          <div><strong>Chế độ bảo trì (Chặn user thường)</strong><div style="font-size:12px;color:var(--ink-3);">Admin vẫn đăng nhập và thao tác bình thường</div></div>
          <div id="sy-m-on" class="sw ${m.enabled?"on":""}"></div>
        </div>
        <label class="f-lbl">Thông báo bảo trì</label>
        <textarea id="sy-m-txt" class="field" rows="3">${esc(m.message || "Hệ thống API AI đang bảo trì nâng cấp.")}</textarea>
      </div>
      <button class="btn-p tap" style="width:100%;" onclick="adminSaveSystem()">Lưu cấu hình hệ thống</button>`;
  }
}

/* ===== ADMIN ACTIONS ===== */
async function adminCreateKeys() {
  haptic("tap");
  const devVal = document.getElementById("ak-dev").value.trim();
  const r = await apiFetch("/admin/keys/create", { method: "POST", body: {
    keyTier: document.getElementById("ak-tier").value,
    planType: document.getElementById("ak-plan").value,
    count: document.getElementById("ak-cnt").value,
    maxDevices: devVal || undefined,
    prefix: document.getElementById("ak-pre").value,
    note: document.getElementById("ak-note").value
  } });
  const data = await r.json(); if (!r.ok) return showToast(data.error || "Lỗi tạo key");
  haptic("ok"); window.__lastCreatedKeys = data.created.join("\n");
  openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:8px;">Đã tạo ${data.created.length} Key mới</h3>
    <textarea class="field" rows="6" readonly style="font-family:var(--font-mono);">${esc(window.__lastCreatedKeys)}</textarea>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
      <button class="btn-p tap" onclick="copyText(window.__lastCreatedKeys,'Đã copy toàn bộ Key');closeModal()">Sao chép tất cả</button></div>`);
  loadAdminData();
}
function adminChangeKeyTierModal(keyCode, curTier) {
  openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:6px;">Đổi hạng Key</h3>
    <p style="font-size:12.5px;font-family:var(--font-mono);color:var(--ink-2);margin-bottom:10px;">${esc(keyCode)}</p>
    <select id="ckt-sel" class="field">${TIER_OPTIONS.map(([v, l]) => `<option value="${v}" ${v===curTier?"selected":""}>${l}</option>`).join("")}</select>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
      <button class="btn-s tap" onclick="closeModal()">Hủy</button>
      <button class="btn-p tap" onclick="adminCommitKeyTier('${esc(keyCode)}')">Cập nhật hạng</button></div>`);
}
async function adminCommitKeyTier(keyCode) {
  const newTier = document.getElementById("ckt-sel").value;
  const r = await apiFetch("/admin/keys/action", { method: "POST", body: { keyCode, action: "change_tier", newTier } });
  if (r.ok) { closeModal(); haptic("ok"); showToast(`Đã đổi Key sang hạng ${TIER_LABELS[newTier]}`); loadAdminData(); }
}
async function adminKeyAct(keyCode, action) { haptic("tap"); const r = await apiFetch("/admin/keys/action", { method: "POST", body: { keyCode, action, extraDays: 30 } }); if (r.ok) { haptic("ok"); showToast("Đã cập nhật Key"); loadAdminData(); } }

async function adminSaveLockedVis(val) {
  const r = await apiFetch("/admin/config/save", { method: "POST", body: { locked_model_visibility: val } });
  if (r.ok) { haptic("ok"); showToast("Đã cập nhật chế độ hiển thị Model"); loadAdminData(); }
}
async function adminSaveTier(tier) {
  const pInt = (id, fb) => { const n = parseInt(document.getElementById(id).value, 10); return Number.isFinite(n) ? n : fb; };
  const checkedModels = [...document.querySelectorAll("#tl-models-box input[type='checkbox']:checked")].map(x => x.value);
  const tier_limits = {
    [tier]: {
      daily_msgs: Math.max(0, pInt("tl-msgs", 25)),
      daily_tokens: Math.max(0, pInt("tl-toks", 35000)),
      max_devices: Math.max(1, pInt("tl-devs", 1)),
      allowed_models: checkedModels,
      allow_four_agent: document.getElementById("tl-4a").classList.contains("on"),
      allow_github_skills: document.getElementById("tl-gh").classList.contains("on"),
      allow_hd_vision: document.getElementById("tl-hd").classList.contains("on"),
      allow_image_gen: document.getElementById("tl-img").classList.contains("on"),
      allow_deep_research: document.getElementById("tl-dr").classList.contains("on"),
      allow_canvas: document.getElementById("tl-cv").classList.contains("on")
    }
  };
  const r = await apiFetch("/admin/config/save", { method: "POST", body: { tier_limits } });
  if (r.ok) { haptic("ok"); showToast(`Đã lưu quyền hạng ${TIER_LABELS[tier]}`); loadAdminData(); }
}

function adminEditProviderModal(idx) {
  const p = idx !== null ? S.adminData.config.providers[idx] : null;
  openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:8px;">${p ? "Sửa nguồn API" : "Thêm nguồn API mới"}</h3>
    <label class="f-lbl">ID nguồn (không dấu, không cách)</label><input id="ep-id" class="field" value="${esc(p?.id||"")}" ${p?"readonly":""} placeholder="vd: claude_vip" />
    <label class="f-lbl">Tên hiển thị</label><input id="ep-name" class="field" value="${esc(p?.name||"")}" placeholder="vd: Claude Pro Proxy" />
    <label class="f-lbl">Base URL (có /v1)</label><input id="ep-url" class="field" value="${esc(p?.base_url||"")}" placeholder="https://api.anthropic.com/v1" />
    <label class="f-lbl">Giao thức API</label>
    <select id="ep-proto" class="field">
      <option value="auto" ${(!p || p.protocol==="auto")?"selected":""}>Tự động Fosta (Claude → /messages, GPT → /chat/completions)</option>
      <option value="openai" ${p?.protocol==="openai"?"selected":""}>OpenAI chuẩn (/chat/completions)</option>
      <option value="anthropic" ${p?.protocol==="anthropic"?"selected":""}>Anthropic chuẩn (/messages · Claude)</option>
      <option value="responses" ${p?.protocol==="responses"?"selected":""}>OpenAI Responses (/responses · Codex)</option>
    </select>
    <label class="f-lbl">Danh sách API Key (mỗi dòng 1 key)</label>
    <textarea id="ep-keys" class="field" rows="4" style="font-family:var(--font-mono);font-size:12.5px;" placeholder="sk-...">${esc((p?.api_keys||[]).join("\n"))}</textarea>
    <div class="s-row" onclick="document.getElementById('ep-en').classList.toggle('on')"><span>Kích hoạt nguồn API này</span><div id="ep-en" class="sw ${p?.enabled!==false?"on":""}"></div></div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
      <button class="btn-s tap" onclick="closeModal()">Hủy</button>
      <button class="btn-p tap" onclick="adminCommitProvider(${idx === null ? "null" : idx})">Lưu nguồn</button></div>`);
}
async function adminCommitProvider(idx) {
  const obj = {
    id: document.getElementById("ep-id").value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, ""),
    name: document.getElementById("ep-name").value.trim(),
    base_url: document.getElementById("ep-url").value.trim().replace(/\/+$/, ""),
    protocol: document.getElementById("ep-proto").value,
    api_keys: document.getElementById("ep-keys").value.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean),
    enabled: document.getElementById("ep-en").classList.contains("on")
  };
  if (!obj.id || !obj.name || !obj.base_url) return showToast("Nhập đủ ID, Tên và Base URL");
  const provs = [...(S.adminData.config.providers || [])];
  if (idx === null) provs.push(obj); else provs[idx] = obj;
  const r = await apiFetch("/admin/config/save", { method: "POST", body: { providers: provs } });
  if (r.ok) { closeModal(); haptic("ok"); showToast("Đã lưu nguồn API"); loadAdminData(); }
}
async function adminDeleteProvider(idx) {
  const provs = S.adminData.config.providers.filter((_, i) => i !== idx);
  const r = await apiFetch("/admin/config/save", { method: "POST", body: { providers: provs } });
  if (r.ok) { haptic("ok"); showToast("Đã xóa nguồn API"); loadAdminData(); }
}
async function adminCheckProviderUsage(providerId) {
  openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:8px;">Số dư API Key</h3><div id="pu-out" style="font-size:13px;color:var(--ink-2);">Đang kiểm tra...</div><div style="display:flex;justify-content:flex-end;margin-top:12px;"><button class="btn-p tap" onclick="closeModal()">Đóng</button></div>`);
  const r = await apiFetch("/admin/providers/usage", { method: "POST", body: { providerId } }), d = await r.json();
  document.getElementById("pu-out").innerHTML = (d.keys || []).map(k => `<div class="card-item lg-card"><b>Key #${k.slot}</b> (${esc(k.masked)})<pre style="white-space:pre-wrap;font-size:12px;color:var(--accent-ink);margin-top:6px;line-height:1.5;font-family:var(--font-mono);">${esc(k.text || JSON.stringify(k.data || k.error || ""))}</pre></div>`).join("") || "Không có dữ liệu.";
}

// Live /v1/models Scanner Modal (4A Đột phá)
async function adminScanProviderModels(providerId) {
  openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:6px;">Quét Model từ API</h3><div id="scan-out" style="font-size:13px;color:var(--ink-2);">Đang gọi /v1/models...</div>`);
  try {
    const r = await apiFetch("/admin/providers/scan-models", { method: "POST", body: { providerId } });
    const d = await r.json(); if (!r.ok) throw new Error(d.error || "Quét thất bại");
    const existing = new Set((S.adminData.config.models || []).map(m => m.mapped));
    window.__scannedModels = { providerId, items: d.models || [] };
    document.getElementById("scan-out").innerHTML = `
      <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:8px;">Tìm thấy ${d.models.length} model. Tích chọn model muốn nhập và chọn hạng Key mặc định được dùng:</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;font-size:12.5px;">
        ${TIER_OPTIONS.map(([v, l]) => `<label style="display:inline-flex;align-items:center;gap:4px;"><input type="checkbox" class="sc-tier" value="${v}" ${v==="pro_max"||v==="ultra"?"checked":""} /> ${l}</label>`).join("")}
      </div>
      <div style="max-height:260px;overflow-y:auto;">
        ${d.models.map((m, i) => `<label class="model-check-row"><div><strong style="font-size:13px;">${esc(m.label)}</strong><div style="font-size:11px;font-family:var(--font-mono);color:var(--ink-3);">${esc(m.id)}${existing.has(m.id)?" · Đã có":""}</div></div><input type="checkbox" class="sc-mod" value="${i}" ${existing.has(m.id)?"":"checked"} /></label>`).join("")}
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
        <button class="btn-s tap" onclick="closeModal()">Hủy</button>
        <button class="btn-p tap" onclick="adminCommitScannedModels()">Nhập Model đã chọn</button>
      </div>`;
  } catch (e) { document.getElementById("scan-out").innerHTML = `<div style="color:var(--danger-ink);">Lỗi: ${esc(e.message)}</div><div style="display:flex;justify-content:flex-end;margin-top:12px;"><button class="btn-p tap" onclick="closeModal()">Đóng</button></div>`; }
}
async function adminCommitScannedModels() {
  const sc = window.__scannedModels; if (!sc) return;
  const idxs = [...document.querySelectorAll(".sc-mod:checked")].map(x => Number(x.value));
  const tiers = [...document.querySelectorAll(".sc-tier:checked")].map(x => x.value);
  if (!idxs.length) return showToast("Chưa chọn model nào");
  const models = [...(S.adminData.config.models || [])];
  const tier_limits = JSON.parse(JSON.stringify(S.adminData.config.tier_limits || {}));

  idxs.forEach(i => {
    const it = sc.items[i]; if (!it) return;
    const id = it.id.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
    if (!models.some(m => m.id === id)) {
      models.push({ id, title: it.label, short: it.label.slice(0, 18), sub: `Nguồn: ${sc.providerId}`, mapped: it.id, provider_id: sc.providerId, cost_label: "", badge: "Mới", enabled: true });
    }
    tiers.forEach(t => {
      if (tier_limits[t] && !tier_limits[t].allowed_models.includes(id)) tier_limits[t].allowed_models.push(id);
    });
  });
  const r = await apiFetch("/admin/config/save", { method: "POST", body: { models, tier_limits } });
  if (r.ok) { closeModal(); haptic("ok"); showToast(`Đã nhập ${idxs.length} model mới`); await refreshSession(); loadAdminData(); }
}

function adminAddModelModal() {
  const provs = S.adminData.config.providers || [];
  openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:8px;">Thêm Model AI thủ công</h3>
    <label class="f-lbl">Nguồn API</label><select id="nm-prov" class="field">${provs.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("")}</select>
    <label class="f-lbl">Tên hiển thị</label><input id="nm-title" class="field" placeholder="Claude Opus 5.5" />
    <label class="f-lbl">Model ID thực gửi API</label><input id="nm-map" class="field" placeholder="claude-opus-5-5" />
    <label class="f-lbl">Mô tả phụ</label><input id="nm-sub" class="field" placeholder="Suy luận đỉnh cao · ×5.2" />
    <label class="f-lbl">Hệ số nhân token (Fosta gốc + 0.2)</label><input id="nm-mult" type="number" step="0.1" min="0.1" class="field num" value="1.2" />
    <label class="f-lbl">Cấp quyền cho hạng Key</label>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:6px 0;font-size:13px;">
      ${TIER_OPTIONS.map(([v, l]) => `<label style="display:inline-flex;align-items:center;gap:4px;"><input type="checkbox" class="nm-t" value="${v}" ${v==="ultra"?"checked":""} /> ${l}</label>`).join("")}
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;"><button class="btn-s tap" onclick="closeModal()">Hủy</button><button class="btn-p tap" onclick="adminCommitNewModel()">Thêm Model</button></div>`);
}
async function adminCommitNewModel() {
  const title = document.getElementById("nm-title").value.trim(), mapped = document.getElementById("nm-map").value.trim();
  if (!title || !mapped) return showToast("Nhập đủ Tên và Model ID");
  const id = mapped.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
  const mult = Math.max(0.1, Number(document.getElementById("nm-mult")?.value || 1.2) || 1.2);
  const models = [...(S.adminData.config.models || []), { id, title, short: title.slice(0, 18), sub: document.getElementById("nm-sub").value.trim(), mapped, provider_id: document.getElementById("nm-prov").value, cost_multiplier: mult, cost_label: "×" + mult, badge: "Mới", enabled: true }];
  const tier_limits = JSON.parse(JSON.stringify(S.adminData.config.tier_limits || {}));
  [...document.querySelectorAll(".nm-t:checked")].forEach(c => { if (tier_limits[c.value] && !tier_limits[c.value].allowed_models.includes(id)) tier_limits[c.value].allowed_models.push(id); });
  const r = await apiFetch("/admin/config/save", { method: "POST", body: { models, tier_limits } });
  if (r.ok) { closeModal(); haptic("ok"); showToast("Đã thêm Model"); await refreshSession(); loadAdminData(); }
}
async function adminToggleModelEnabled(idx) {
  haptic("switch");
  const models = JSON.parse(JSON.stringify(S.adminData.config.models || []));
  models[idx].enabled = models[idx].enabled === false ? true : false;
  const r = await apiFetch("/admin/config/save", { method: "POST", body: { models } });
  if (r.ok) { await refreshSession(); loadAdminData(); }
}
async function adminDeleteModel(idx) {
  const models = S.adminData.config.models.filter((_, i) => i !== idx);
  const r = await apiFetch("/admin/config/save", { method: "POST", body: { models } });
  if (r.ok) { haptic("ok"); await refreshSession(); loadAdminData(); }
}

function adminPromptChangePass(email) {
  openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:6px;">Đổi mật khẩu tài khoản</h3>
    <p style="font-size:13px;color:var(--ink-2);margin-bottom:10px;">Email: <b>${esc(email)}</b></p>
    <input id="ad-new-pass" class="field" value="APIAI@${Math.floor(100000+Math.random()*899999)}" />
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;"><button class="btn-s tap" onclick="closeModal()">Hủy</button><button class="btn-p tap" onclick="adminCommitPass('${esc(email)}')">Cập nhật</button></div>`);
}
async function adminCommitPass(email) {
  const newPassword = document.getElementById("ad-new-pass").value.trim();
  const r = await apiFetch("/admin/users/password", { method: "POST", body: { email, newPassword } }), d = await r.json();
  if (!r.ok) return showToast(d.error || "Lỗi"); haptic("ok"); openManualMailHandoff(email, d.newPassword);
}
async function adminUserAct(email, action) { haptic("tap"); const r = await apiFetch("/admin/users/action", { method: "POST", body: { email, action } }), d = await r.json(); if (!r.ok) return showToast(d.error || "Lỗi"); haptic("ok"); showToast("Đã cập nhật tài khoản"); loadAdminData(); }
async function adminResolveReset(requestId, email) { haptic("tap"); const r = await apiFetch("/admin/resets/resolve", { method: "POST", body: { requestId } }), d = await r.json(); if (!r.ok) return showToast(d.error || "Lỗi"); haptic("ok"); loadAdminData(); openManualMailHandoff(d.email || email, d.newPassword); }
function openManualMailHandoff(email, newPassword) {
  const mailText = `Xin chào,\n\nMật khẩu mới cho tài khoản API AI (${email}) của bạn là:\n${newPassword}\n\nBạn hãy mở ứng dụng API AI và đăng nhập bằng mật khẩu mới này.`;
  const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent("Mật khẩu mới tài khoản API AI")}&body=${encodeURIComponent(mailText)}`;
  window.__lastMailText = mailText;
  openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:6px;">Đã cấp mật khẩu mới</h3>
    <p style="font-size:13px;color:var(--ink-2);margin-bottom:10px;">Tài khoản <b>${esc(email)}</b> đã đổi sang mật khẩu dưới đây:</p>
    <div class="lg-card" style="padding:12px;border-radius:14px;text-align:center;font-family:var(--font-mono);font-size:18px;font-weight:600;color:var(--ok-ink);margin-bottom:12px;">${esc(newPassword)}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn-s tap" style="flex:1;" onclick="copyText(window.__lastMailText,'Đã copy mẫu tin nhắn')">Sao chép mẫu gửi</button>
      <a class="btn-p tap" style="flex:1;text-decoration:none;" href="${mailto}">Mở ứng dụng Mail</a>
    </div><button class="btn-s tap" style="width:100%;margin-top:8px;" onclick="closeModal()">Đóng</button>`);
}
async function adminSaveSystem() {
  const system_notice = { enabled: document.getElementById("sy-n-on").classList.contains("on"), text: document.getElementById("sy-n-txt").value.trim(), level: document.getElementById("sy-n-lvl").value };
  const maintenance = { enabled: document.getElementById("sy-m-on").classList.contains("on"), message: document.getElementById("sy-m-txt").value.trim() };
  const r = await apiFetch("/admin/config/save", { method: "POST", body: { system_notice, maintenance } });
  if (r.ok) { applySystemMeta({ notice: system_notice, maintenance }); haptic("ok"); showToast("Đã lưu cài đặt hệ thống"); loadAdminData(); }
}

/* ===== UPDATER, VOICE, SIDEBAR, SKILLS, LIBRARY, MEMORY, GESTURES ===== */
async function checkAppUpdate(silent = false) {
  try {
    const r = await fetch(`https://api.github.com/repos/${META.repo}/releases/latest`);
    if (!r.ok) { if (!silent) showToast("Chưa có bản phát hành mới"); return; }
    const rel = await r.json(), tag = (rel.tag_name || "").replace(/^v/i, ""), apk = (rel.assets || []).find(a => a.name.endsWith(".apk"));
    if (tag && tag !== META.verName && apk) {
      openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:6px;">Bản cập nhật mới v${esc(tag)}</h3>
        <p style="font-size:13px;color:var(--ink-2);margin-bottom:12px;">Bản hiện tại: v${esc(META.verName)}. Tải APK và bấm Cập nhật không cần gỡ bản cũ.</p>
        <div style="display:flex;gap:8px;"><button class="btn-s tap" style="flex:1;" onclick="closeModal()">Để sau</button><a class="btn-p tap" style="flex:1;text-decoration:none;" href="${apk.browser_download_url}" target="_blank">Tải cập nhật</a></div>`);
    } else if (!silent) showToast(`Đang dùng bản mới nhất (v${META.verName})`);
  } catch { if (!silent) showToast("Không kiểm tra được cập nhật"); }
}

function setWorkMode(mode, anim = true) {
  if (mode === "four_agent" && S.user && !canUseFourAgent()) {
    haptic("err");
    showToast("Chế độ 4-Agent yêu cầu Key hạng Pro Max trở lên");
    mode = "chat";
  }
  S.cfg.workMode = mode; dbPut("kv", S.cfg);
  const tr = document.getElementById("mode-seg"), th = document.getElementById("mode-thumb");
  tr.querySelectorAll(".seg-btn").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
  const act = tr.querySelector(`.seg-btn[data-mode="${mode}"]`);
  if (act && th) moveSegThumb(th, act);

  const cfgBtn = document.getElementById("btn-agent-cfg");
  const cfgAcc = document.getElementById("agent-cfg-acc");
  if (cfgBtn) cfgBtn.style.display = mode === "four_agent" ? "inline-flex" : "none";
  if (mode === "four_agent") {
    renderAgentConfigPanel();
    if (anim && cfgAcc && !cfgAcc.classList.contains("open")) {
      cfgAcc.classList.add("open");
      document.getElementById("chev-ag")?.classList.add("rot");
    }
  } else if (cfgAcc) {
    cfgAcc.classList.remove("open");
    document.getElementById("chev-ag")?.classList.remove("rot");
  }

  const h = document.getElementById("hero-title");
  const txt = mode === "four_agent" ? "Mô tả ứng dụng hoặc tính năng cần 4-Agent xây dựng"
    : (mode === "task" ? "Tôi có thể bắt đầu việc gì cho bạn?" : "Chúng ta nên bắt đầu từ đâu nhỉ?");
  if (anim) { h.style.opacity = "0"; setTimeout(() => { h.textContent = txt; h.style.opacity = "1"; }, 120); } else h.textContent = txt;
  document.getElementById("prompt-in").placeholder = mode === "four_agent" ? "Mô tả bài toán cho 4-Agent..."
    : (mode === "task" ? "Mô tả tác vụ" : "Hỏi API AI");
}

function handleOrbAction() { const has = document.getElementById("prompt-in").value.trim().length > 0 || S.atts.length > 0; if (S.streaming || has) return sendPrompt(); openLiveVoice(); }
function openLiveVoice() { haptic("tap"); S.liveMode = true; document.getElementById("live-voice-ov").classList.add("open"); restartLiveListen(); }
function restartLiveListen() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition, st = document.getElementById("live-status"), tr = document.getElementById("live-transcript"), bars = document.getElementById("live-bars");
  if (!SR) { st.textContent = "Thiết bị chưa bật nhận diện giọng nói"; bars.classList.add("paused"); return; }
  speechSynthesis?.cancel(); bars.classList.remove("paused"); st.textContent = "Đang lắng nghe"; tr.textContent = "";
  const r = new SR(); r.lang = "vi-VN"; r.interimResults = true; let fin = "";
  r.onresult = e => { fin = Array.from(e.results).map(x => x[0].transcript).join(""); tr.textContent = fin; };
  r.onend = () => { if (!S.liveMode) return; if (fin.trim()) { st.textContent = "API AI đang trả lời"; sendPrompt(fin.trim()); } else { bars.classList.add("paused"); st.textContent = "Bấm Nói lại để tiếp tục"; } };
  S.rec = r; r.start();
}
function speakLiveReply(t) { if (!window.speechSynthesis || !S.liveMode) return; const u = new SpeechSynthesisUtterance(t.replace(/[#*`]/g, "").slice(0, 600)); u.lang = "vi-VN"; u.onend = () => { if (S.liveMode) restartLiveListen(); }; speechSynthesis.speak(u); }
function closeLiveVoice() { S.liveMode = false; S.rec?.stop(); speechSynthesis?.cancel(); document.getElementById("live-voice-ov").classList.remove("open"); }
function toggleVoiceDictate() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return showToast("Thiết bị không hỗ trợ ghi âm");
  const btn = document.getElementById("btn-mic");
  if (S.recording) { S.rec?.stop(); S.recording = false; btn.classList.remove("rec"); return; }
  const r = new SR(); r.lang = "vi-VN"; r.interimResults = true;
  r.onresult = e => { document.getElementById("prompt-in").value = Array.from(e.results).map(x => x[0].transcript).join(""); autoGrow(); updateOrbButton(); };
  r.onend = () => { S.recording = false; btn.classList.remove("rec"); };
  S.rec = r; S.recording = true; btn.classList.add("rec"); r.start();
}

let sidebarX = -320;
function setSidebarX(sb, scrim, x) {
  const w = sb.offsetWidth || 304;
  sidebarX = x;
  sb.style.transform = `translate3d(${x}px, 0, 0)`;
  if (scrim && window.innerWidth < 980) {
    const p = Math.max(0, Math.min(1, 1 + x / w));
    scrim.style.opacity = String(p);
  }
}
function toggleSidebar(o, initVel = 0) {
  const sb = document.getElementById("sidebar"), sc = document.getElementById("scrim");
  if (!sb) return;
  if (window.innerWidth >= 980) { sb.style.transform = ""; return; }
  haptic("tap");
  const w = sb.offsetWidth || 304;
  const fromX = activeSprings.has(sb) ? activeSprings.get(sb).pos : (sb.classList.contains("open") ? sidebarX : -w - 16);
  if (o) { sb.classList.add("open"); sc.classList.add("open"); }
  else closePopovers();
  runSpring(sb, {
    from: fromX,
    to: o ? 0 : -w - 16,
    velocity: initVel,
    damping: Math.abs(initVel) > 120 ? 0.86 : 1.0,
    response: 0.34,
    onUpdate: x => setSidebarX(sb, sc, x),
    onDone: () => { if (!o) { sb.classList.remove("open"); sc.classList.remove("open"); sc.style.opacity = ""; } }
  });
}
function closePopovers() { document.querySelectorAll(".popover").forEach(p => p.classList.remove("open")); document.getElementById("btn-model-trigger").classList.remove("open"); }
function toggleModelDropdown(e) { e.stopPropagation(); haptic("tap"); const d = document.getElementById("model-dropdown"), b = document.getElementById("btn-model-trigger"), o = !d.classList.contains("open"); closePopovers(); d.classList.toggle("open", o); b.classList.toggle("open", o); }
function toggleChatMore(e) { e.stopPropagation(); haptic("tap"); const p = document.getElementById("chat-more-popover"), o = !p.classList.contains("open"); closePopovers(); p.classList.toggle("open", o); }
function switchView(v) { haptic("tap"); document.querySelectorAll(".view").forEach(x => x.classList.remove("active")); document.getElementById("view-" + v)?.classList.add("active"); toggleSidebar(false); if (v === "customize") renderSkillsPage(); if (v === "library") renderLibrary(); if (v === "import") renderMemoriesPage(); }

function renderSidebar() { renderNbList(); renderChatsList(); }
function cycleFilter() { const a = ["all", "pinned", "task"], l = { all: "Lịch sử chat", pinned: "Đã ghim", task: "Nhiệm vụ" }; S.filter = a[(a.indexOf(S.filter) + 1) % a.length]; document.getElementById("filter-lbl").textContent = l[S.filter]; renderChatsList(); }
function renderChatsList() {
  const q = (document.getElementById("sb-search")?.value || "").toLowerCase();
  let items = [...S.chats];
  if (S.filter === "pinned") items = items.filter(c => c.pinned);
  if (S.filter === "task") items = items.filter(c => c.mode === "task");
  if (q) items = items.filter(c => (c.title || "").toLowerCase().includes(q));
  items.sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || ((b.updatedAt || 0) - (a.updatedAt || 0)));
  document.getElementById("sb-chats-list").innerHTML = items.map(c => `
    <div class="chat-item ${c.id===S.activeChatId?"active":""}" onclick="openChat('${c.id}')">
      <span class="chat-item-title">${esc(c.title)}</span>
      <button class="mini-act tap ${c.pinned?"pinned":""}" onclick="event.stopPropagation();pinChat('${c.id}')" aria-label="Ghim">${ICON_PIN}</button>
      <button class="mini-act tap" onclick="event.stopPropagation();delChat('${c.id}')" aria-label="Xóa">${ICON_X}</button>
    </div>`).join("") || `<div style="padding:8px 12px;font-size:12.5px;color:var(--ink-3);">Chưa có đoạn chat</div>`;
}
function startNewChat() { S.activeChatId = null; S.activeNbId = null; S.lastCrossRecalls = []; switchView("chat"); renderMessages(); renderChatsList(); renderMemoryBar(); renderChips(); }
function openChat(id) { S.activeChatId = id; S.activeNbId = S.chats.find(x => x.id === id)?.nbId || null; switchView("chat"); renderMessages(); renderChatsList(); renderMemoryBar(); renderChips(); }
async function pinChat(id) { const c = S.chats.find(x => x.id === id); if (!c) return; c.pinned = !c.pinned; apiFetch("/sync/chats", { method: "POST", body: c }).catch(() => {}); renderChatsList(); }
async function delChat(id) { S.chats = S.chats.filter(x => x.id !== id); apiFetch("/sync/chats/" + encodeURIComponent(id), { method: "DELETE" }).catch(() => {}); if (S.activeChatId === id) S.activeChatId = null; renderChatsList(); renderMessages(); }
function pinActiveChat() { if (S.activeChatId) { pinChat(S.activeChatId); showToast("Đã cập nhật ghim"); } }
function deleteActiveChat() { if (S.activeChatId) { delChat(S.activeChatId); showToast("Đã xóa cuộc trò chuyện"); } }

function renderNbList() {
  document.getElementById("sb-nb-list").innerHTML = S.notebooks.map(nb => `<div class="chat-item ${S.activeNbId===nb.id?"active":""}" onclick="toggleNb('${nb.id}')"><span class="chat-item-title">${esc(nb.title)}</span><button class="mini-act tap" onclick="event.stopPropagation();openNotebookModal('${nb.id}')">${ICON_EDIT}</button></div>`).join("") || `<div style="padding:6px 12px;font-size:12.5px;color:var(--ink-3);">Chưa có sổ ghi chú</div>`;
}
function openNotebookModal(id = null) {
  const nb = id ? S.notebooks.find(x => x.id === id) : null;
  openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:8px;">${nb?"Sửa Sổ ghi chú":"Sổ ghi chú mới"}</h3>
    <label class="f-lbl">Tiêu đề</label><input id="nb-t" class="field" value="${esc(nb?.title||"")}" />
    <label class="f-lbl">Nội dung nguồn</label><textarea id="nb-c" class="field" rows="5">${esc(nb?.notes||"")}</textarea>
    <div style="display:flex;justify-content:space-between;margin-top:12px;">${nb?`<button class="btn-danger tap" onclick="delNb('${nb.id}')">Xóa</button>`:`<span></span>`}<div style="display:flex;gap:8px;"><button class="btn-s tap" onclick="closeModal()">Hủy</button><button class="btn-p tap" onclick="saveNb('${nb?.id||""}')">Lưu</button></div></div>`);
}
async function saveNb(id) { const title = document.getElementById("nb-t").value.trim(), notes = document.getElementById("nb-c").value.trim(); if (!title) return; const nb = { id: id || ("nb-" + Date.now()), title, notes }; await dbPut("notebooks", nb); S.notebooks = await dbAll("notebooks"); S.activeNbId = nb.id; closeModal(); renderNbList(); renderChips(); haptic("ok"); showToast("Đã lưu sổ ghi chú"); }
async function delNb(id) { await dbDel("notebooks", id); S.notebooks = S.notebooks.filter(x => x.id !== id); if (S.activeNbId === id) S.activeNbId = null; closeModal(); renderNbList(); renderChips(); }
function toggleNb(id) { S.activeNbId = S.activeNbId === id ? null : id; toggleSidebar(false); switchView("chat"); renderNbList(); renderChips(); }
function pickNotebookModal() { if (!S.notebooks.length) return openNotebookModal(); openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:10px;">Gắn Sổ ghi chú</h3>` + S.notebooks.map(n => `<button class="s-row tap-soft" onclick="toggleNb('${n.id}');closeModal()"><span>${esc(n.title)}</span><span>${S.activeNbId===n.id?ICON_CHECK:""}</span></button>`).join("")); }

function renderSkillsPage() {
  const ghAllowed = canUseGithubSkills();
  const ghBtn = document.getElementById("btn-gh-import");
  if (ghBtn) ghBtn.style.opacity = ghAllowed ? "1" : "0.6";

  document.getElementById("customize-body").innerHTML = S.skills.map(sk => {
    const on = S.skillIds.includes(sk.id);
    const isRepo = Boolean(sk.repo);
    return `<div class="card-item lg-card">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="flex:1;min-width:0;cursor:pointer;" onclick="toggleSkillPill('${sk.id}');renderSkillsPage()">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <strong>@${esc(sk.name)}</strong>
            ${sk.builtin ? `<span class="tag-st st-unused">Tích hợp sẵn</span>` : ""}
            ${isRepo ? `<span class="tag-st tier-pro_max">GitHub · ${esc(sk.repo.sha || "main")}</span>` : ""}
          </div>
          <div style="font-size:12.5px;color:var(--ink-2);margin-top:3px;">${esc(sk.desc || "")}</div>
        </div>
        <div class="sw ${on?"on":""}" onclick="toggleSkillPill('${sk.id}');renderSkillsPage()"></div>
      </div>
      ${isRepo ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">
        <button class="btn-s tap" style="height:32px;font-size:12px;" onclick="openRepoTreeViewer('${sk.id}')">Xem cây tệp (${(sk.repoFiles||[]).length})</button>
        <button class="btn-blue tap" style="height:32px;font-size:12px;" onclick="pullLatestGithubSkill('${sk.id}')">Cập nhật Repo</button>
        <button class="btn-danger tap" style="height:32px;font-size:12px;" onclick="delSkill('${sk.id}')">Xóa</button>
      </div>` : (!sk.builtin ? `<div style="display:flex;gap:6px;margin-top:10px;"><button class="btn-s tap" style="height:32px;font-size:12px;" onclick="openSkillEditor('${sk.id}')">Sửa</button><button class="btn-danger tap" style="height:32px;font-size:12px;" onclick="delSkill('${sk.id}')">Xóa</button></div>` : "")}
    </div>`;
  }).join("");
}
function openSkillEditor(id = null) { const sk = id ? S.skills.find(x => x.id === id) : null; document.getElementById("sk-id").value = sk?.id || ""; document.getElementById("sk-name").value = sk?.name || ""; document.getElementById("sk-desc").value = sk?.desc || ""; document.getElementById("sk-prompt").value = sk?.prompt || ""; switchView("skill-editor"); }
async function saveSkill() { const name = document.getElementById("sk-name").value.trim().replace(/\s+/g, "-").replace(/^@/, ""), desc = document.getElementById("sk-desc").value.trim(), prompt = document.getElementById("sk-prompt").value.trim(); if (!name || !prompt) return showToast("Nhập tên và chỉ dẫn"); const sk = { id: document.getElementById("sk-id").value || ("sk-" + Date.now()), name, desc, prompt, builtin: false }; await dbPut("skills", sk); S.skills = await dbAll("skills"); renderSkillStack(); haptic("ok"); showToast(`Đã lưu @${name}`); switchView("customize"); }
async function delSkill(id) { await dbDel("skills", id); S.skills = S.skills.filter(x => x.id !== id); S.skillIds = S.skillIds.filter(x => x !== id); renderSkillStack(); renderSkillsPage(); renderChips(); }
async function importSkillFile(files) { const f = files?.[0]; if (!f) return; const sk = { id: "sk-" + Date.now(), name: f.name.replace(/\.(md|txt|json)$/i, ""), desc: "Nhập từ tệp", prompt: await f.text(), builtin: false }; await dbPut("skills", sk); S.skills = await dbAll("skills"); renderSkillStack(); renderSkillsPage(); showToast("Đã nhập kỹ năng"); }

async function saveLib(type, title, data) { const it = { id: "l-" + Date.now() + Math.random(), type, title, data, createdAt: Date.now() }; await dbPut("library", it); S.library.unshift(it); }
function renderLibrary() {
  const docs = S.library.filter(x => x.type === "doc"), med = S.library.filter(x => x.type === "media");
  document.getElementById("lib-body").innerHTML = `<div style="font-size:13.5px;color:var(--ink-2);margin-bottom:8px;" class="num">Tài liệu Canvas (${docs.length})</div>
    ${docs.map(d => `<div class="card-item lg-card" style="display:flex;align-items:center;gap:10px;cursor:pointer;" onclick="openCanvasCode(getLib('${d.id}'),'${esc(d.title)}')"><strong style="flex:1;font-weight:500;">${esc(d.title)}</strong><button class="mini-act tap" onclick="event.stopPropagation();delLib('${d.id}')">${ICON_X}</button></div>`).join("") || `<p class="p-sub">Chưa có tài liệu</p>`}
    <div style="font-size:13.5px;color:var(--ink-2);margin:14px 0 8px;" class="num">Nội dung nghe nhìn (${med.length})</div>
    <div class="media-grid">${med.map(m => `<div class="media-tile"><img src="${m.data}" onclick="openLightbox('${m.data}')" /><button class="media-del tap" onclick="delLib('${m.id}')">${ICON_X}</button></div>`).join("")}</div>`;
}
const getLib = id => S.library.find(x => x.id === id)?.data || "";
async function delLib(id) { await dbDel("library", id); S.library = S.library.filter(x => x.id !== id); renderLibrary(); }

function renderMemoriesPage() {
  document.getElementById("mem-list").innerHTML = S.memories.map(m => `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid var(--rim);">
    <span style="font-size:13.5px;flex:1;white-space:pre-wrap;opacity:${m.enabled===false?0.45:1};">${esc(m.content)}</span>
    <button class="btn-s tap" style="height:28px;padding:0 10px;font-size:11.5px;" onclick="toggleMemItem('${m.id}');renderMemoriesPage()">${m.enabled===false?"Tắt":"Bật"}</button>
    <button class="mini-act tap" onclick="delMemory('${m.id}')">${ICON_X}</button></div>`).join("") || `<p style="font-size:13px;color:var(--ink-3);">Chưa có dữ kiện trí nhớ.</p>`;
}
async function addMemory() { const ta = document.getElementById("mem-in"), c = ta.value.trim(); if (!c) return; await addQuickMemory(c); ta.value = ""; renderMemoriesPage(); }
async function addQuickMemory(content) { const m = { id: "mem-" + Date.now(), content, enabled: true, ts: Date.now() }; S.memories.unshift(m); await apiFetch("/sync/memories", { method: "POST", body: m }).catch(() => {}); renderMemoryBar(); haptic("ok"); showToast("Đã lưu vào Trí nhớ"); }
async function delMemory(id) { S.memories = S.memories.filter(x => x.id !== id); await apiFetch("/sync/memories/" + encodeURIComponent(id), { method: "DELETE" }).catch(() => {}); renderMemoryBar(); renderMemoriesPage(); }

const sheetPos = new WeakMap();
function setSheetY(sheet, y) {
  sheetPos.set(sheet, y);
  sheet.style.transform = `translate3d(0, ${y}px, 0)`;
}
function animateSheet(bgId, sheetId, open, initVel = 0) {
  const bg = document.getElementById(bgId), sh = document.getElementById(sheetId);
  if (!bg || !sh) return;
  const h = sh.offsetHeight || 420;
  const cur = sheetPos.has(sh) ? sheetPos.get(sh) : (open ? h : 0);
  if (open) bg.classList.add("open");
  runSpring(sh, {
    from: cur,
    to: open ? 0 : h + 24,
    velocity: initVel,
    damping: Math.abs(initVel) > 120 ? 0.84 : 1.0,
    response: 0.34,
    onUpdate: y => setSheetY(sh, y),
    onDone: () => { if (!open) bg.classList.remove("open"); }
  });
}
function openToolsSheet() { haptic("tap"); document.getElementById("btn-plus").classList.add("rotated"); animateSheet("sheet-tools-bg", "sheet-tools", true); }
function closeToolsSheet(vel = 0) { document.getElementById("btn-plus").classList.remove("rotated"); animateSheet("sheet-tools-bg", "sheet-tools", false, vel); }
function openSettingsSheet() { toggleSidebar(false); syncAccountUI(); animateSheet("sheet-settings-bg", "sheet-settings", true); }
function closeSettingsSheet(vel = 0) { animateSheet("sheet-settings-bg", "sheet-settings", false, vel); }
function pickTool(t) { haptic("switch"); S.activeTool = S.activeTool === t ? null : t; closeToolsSheet(); renderChips(); }
function togglePersonal() { haptic("switch"); S.cfg.personalIntel = !S.cfg.personalIntel; dbPut("kv", S.cfg); document.getElementById("sw-personal").classList.toggle("on", S.cfg.personalIntel); renderMemoryBar(); }

function openAppearanceModal() {
  const bp = Math.round(((S.cfg.blurPx - 6) / 28) * 100), ap = Math.round(((S.cfg.glassAlpha - 0.35) / 0.55) * 100);
  openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:8px;">Giao diện và hiệu năng</h3>
    <div class="s-row" onclick="S.cfg.ultraGlass=!S.cfg.ultraGlass;dbPut('kv',S.cfg);applyTheme();this.querySelector('.sw').classList.toggle('on',S.cfg.ultraGlass);haptic('switch')"><span>Kính Ultra (tắt để mượt máy yếu)</span><div class="sw ${S.cfg.ultraGlass?"on":""}"></div></div>
    <div class="s-row" onclick="S.cfg.haptics=!S.cfg.haptics;dbPut('kv',S.cfg);this.querySelector('.sw').classList.toggle('on',S.cfg.haptics);haptic('ok')"><span>Rung phản hồi xúc giác</span><div class="sw ${S.cfg.haptics?"on":""}"></div></div>
    <div class="v-sliders">
      <div class="v-col"><div class="v-track" id="vt-b"><div class="v-fill" id="vf-b" style="height:${bp}%"></div></div><span style="font-size:12px;color:var(--ink-2);" class="num">Độ mờ <b id="lb-b">${S.cfg.blurPx}px</b></span></div>
      <div class="v-col"><div class="v-track" id="vt-a"><div class="v-fill" id="vf-a" style="height:${ap}%"></div></div><span style="font-size:12px;color:var(--ink-2);" class="num">Độ đục <b id="lb-a">${Math.round(S.cfg.glassAlpha*100)}%</b></span></div>
    </div>
    <div style="display:flex;gap:8px;margin-top:8px;"><button class="btn-p tap" style="flex:1;" onclick="document.getElementById('in-wall').click()">Đổi hình nền</button><button class="btn-s tap" style="flex:1;" onclick="S.cfg.wallpaper='';dbPut('kv',S.cfg);applyTheme();showToast('Đã đặt nền mặc định')">Nền mặc định</button></div>`);
  bindVS("vt-b", r => { S.cfg.blurPx = Math.round(6 + r * 28); document.getElementById("vf-b").style.height = r * 100 + "%"; document.getElementById("lb-b").textContent = S.cfg.blurPx + "px"; applyTheme(); dbPut("kv", S.cfg); });
  bindVS("vt-a", r => { S.cfg.glassAlpha = Number((0.35 + r * 0.55).toFixed(2)); document.getElementById("vf-a").style.height = r * 100 + "%"; document.getElementById("lb-a").textContent = Math.round(S.cfg.glassAlpha * 100) + "%"; applyTheme(); dbPut("kv", S.cfg); });
}
function bindVS(id, cb) { const el = document.getElementById(id); let d = false; const u = y => { const r = el.getBoundingClientRect(); cb(Math.max(0.05, Math.min(1, 1 - (y - r.top) / r.height))); }; el.onpointerdown = e => { d = true; el.setPointerCapture(e.pointerId); u(e.clientY); haptic("tap"); }; el.onpointermove = e => { if (d) u(e.clientY); }; el.onpointerup = () => { d = false; }; }
async function handleWallUpload(files) { const f = files?.[0]; if (!f) return; S.cfg.wallpaper = (await processImageFile(f)).dataUrl; await dbPut("kv", S.cfg); applyTheme(); showToast("Đã đổi hình nền"); }

function openCanvasEmpty() { openCanvasCode("<!DOCTYPE html><html><body style='font-family:sans-serif;padding:24px;'><h2>API AI Canvas</h2></body></html>", "Canvas mới"); }
function openCanvasCode(code, title) { document.getElementById("canvas-title").textContent = title; document.getElementById("canvas-ed").value = code; document.getElementById("canvas-fr").srcdoc = code; document.getElementById("canvas-ov").classList.add("open"); S.canvasPreviewOnly = window.innerWidth < 768; applyCvView(); }
function closeCanvas() { document.getElementById("canvas-ov").classList.remove("open"); }
function toggleCanvasMode() { S.canvasPreviewOnly = !S.canvasPreviewOnly; applyCvView(); }
function applyCvView() { const e = document.getElementById("canvas-ed"), f = document.getElementById("canvas-fr"); e.style.display = S.canvasPreviewOnly ? "none" : "block"; f.style.display = (S.canvasPreviewOnly || window.innerWidth >= 900) ? "block" : "none"; document.getElementById("btn-cv-mode").textContent = S.canvasPreviewOnly ? "Sửa mã" : "Xem trước"; }
async function saveCanvasLib() { await saveLib("doc", document.getElementById("canvas-title").textContent, document.getElementById("canvas-ed").value); haptic("ok"); showToast("Đã lưu vào Thư viện"); }

function bindEvents() {
  const ta = document.getElementById("prompt-in");
  let composing = false;
  ta.addEventListener("compositionstart", () => { composing = true; });
  ta.addEventListener("compositionend", () => {
    composing = false;
    autoGrow(); updateOrbButton(); checkAtTrigger(ta.value);
  });
  ta.addEventListener("input", e => {
    if (composing || e.isComposing) return;
    autoGrow(); updateOrbButton(); checkAtTrigger(ta.value);
  });
  ta.addEventListener("keydown", e => {
    if (composing || e.isComposing || e.keyCode === 229) return;
    if (e.key === "Enter" && !e.shiftKey && window.innerWidth >= 768) { e.preventDefault(); sendPrompt(); }
  });
  document.getElementById("chat-scroll").addEventListener("scroll", () => { document.getElementById("btn-scroll-down").classList.toggle("show", !isNearBottom() && S.activeChatId !== null); }, { passive: true });
  document.addEventListener("click", e => { if (!e.target.closest(".popover") && !e.target.closest("#btn-model-trigger") && !e.target.closest("#btn-chat-more")) closePopovers(); });
  window.addEventListener("resize", () => setWorkMode(S.cfg.workMode, false));
}

function bindGestures() {
  // 1. Interruptible 1:1 Bottom Sheets with Velocity Projection & Rubber-Banding
  document.querySelectorAll("[data-drag]").forEach(handle => {
    const sheetId = handle.dataset.drag;
    const sh = document.getElementById(sheetId);
    const bgId = sheetId + "-bg";
    let startY = 0, baseY = 0, dragging = false, samples = [];

    handle.onpointerdown = e => {
      stopSpring(sh); // Interrupt mid-flight seamlessly!
      dragging = true;
      startY = e.clientY;
      baseY = sheetPos.get(sh) || 0;
      samples = [{ y: e.clientY, t: performance.now() }];
      handle.setPointerCapture(e.pointerId);
    };
    handle.onpointermove = e => {
      if (!dragging) return;
      const raw = baseY + (e.clientY - startY);
      const h = sh.offsetHeight || 420;
      // Soft rubber-banding if pulled upward past 0
      const pos = raw < 0 ? appleRubberband(raw, h * 0.45, 0.55) : raw;
      setSheetY(sh, pos);
      const now = performance.now();
      samples.push({ y: e.clientY, t: now });
      while (samples.length > 5 && now - samples[0].t > 70) samples.shift();
    };
    const finish = () => {
      if (!dragging) return;
      dragging = false;
      const h = sh.offsetHeight || 420;
      const curY = sheetPos.get(sh) || 0;
      let vel = 0;
      if (samples.length >= 2) {
        const a = samples[0], b = samples[samples.length - 1];
        const dt = Math.max(8, b.t - a.t);
        vel = ((b.y - a.y) / dt) * 1000;
      }
      const projected = curY + appleProject(vel, 0.994);
      const shouldClose = projected > h * 0.34 || vel > 650;
      if (shouldClose) {
        if (sheetId === "sheet-tools") closeToolsSheet(vel);
        else closeSettingsSheet(vel);
      } else {
        animateSheet(bgId, sheetId, true, vel);
      }
    };
    handle.onpointerup = finish;
    handle.onpointercancel = finish;
  });

  // 2. Interruptible 1:1 Sidebar Swipe with Velocity Projection & Live Scrim
  const sb = document.getElementById("sidebar"), sc = document.getElementById("scrim");
  let sx = 0, sy = 0, baseX = 0, sdr = false, decided = false, sSamples = [];
  sb.addEventListener("pointerdown", e => {
    if (window.innerWidth >= 980 || !sb.classList.contains("open")) return;
    stopSpring(sb);
    sdr = true; decided = false; sx = e.clientX; sy = e.clientY; baseX = sidebarX;
    sSamples = [{ x: e.clientX, t: performance.now() }];
  }, { passive: true });
  sb.addEventListener("pointermove", e => {
    if (!sdr) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!decided) {
      if (Math.hypot(dx, dy) < 10) return; // 10px gesture hysteresis (Apple Design §10)
      if (Math.abs(dy) > Math.abs(dx)) { sdr = false; return; }
      decided = true;
    }
    const w = sb.offsetWidth || 304;
    const raw = baseX + dx;
    const pos = raw > 0 ? appleRubberband(raw, w * 0.3, 0.55) : Math.max(-w, raw);
    setSidebarX(sb, sc, pos);
    const now = performance.now();
    sSamples.push({ x: e.clientX, t: now });
    while (sSamples.length > 5 && now - sSamples[0].t > 70) sSamples.shift();
  }, { passive: true });
  const finishSb = () => {
    if (!sdr) return;
    sdr = false;
    if (!decided) return;
    const w = sb.offsetWidth || 304;
    let vel = 0;
    if (sSamples.length >= 2) {
      const a = sSamples[0], b = sSamples[sSamples.length - 1];
      vel = ((b.x - a.x) / Math.max(8, b.t - a.t)) * 1000;
    }
    const projected = sidebarX + appleProject(vel, 0.994);
    toggleSidebar(!(projected < -w * 0.36 || vel < -600), vel);
  };
  sb.addEventListener("pointerup", finishSb);
  sb.addEventListener("pointercancel", finishSb);
}

function isNearBottom() { const sc = document.getElementById("chat-scroll"); return sc.scrollHeight - sc.scrollTop - sc.clientHeight < 120; }
function scrollToBottom(sm) { const sc = document.getElementById("chat-scroll"); sc.scrollTo({ top: sc.scrollHeight, behavior: sm ? "smooth" : "auto" }); }
function autoGrow() { const ta = document.getElementById("prompt-in"); ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 128) + "px"; }
function updateOrbButton() {
  const has = document.getElementById("prompt-in").value.trim().length > 0 || S.atts.length > 0;
  const b = document.getElementById("btn-orb-send"), w = document.getElementById("ico-wave"), s = document.getElementById("ico-send"), st = document.getElementById("ico-stop");
  b.classList.remove("send-mode", "stop-mode");
  if (S.streaming) { b.classList.add("stop-mode"); w.style.display = "none"; s.style.display = "none"; st.style.display = "block"; }
  else if (has) { b.classList.add("send-mode"); w.style.display = "none"; s.style.display = "block"; st.style.display = "none"; }
  else { w.style.display = "block"; s.style.display = "none"; st.style.display = "none"; }
}
function checkAtTrigger(v) {
  const pop = document.getElementById("at-popup"), m = v.match(/@([a-zA-Z0-9_-]*)$/);
  if (!m) { pop.classList.remove("open"); return; }
  const list = S.skills.filter(s => s.name.toLowerCase().includes(m[1].toLowerCase()));
  if (!list.length) { pop.classList.remove("open"); return; }
  pop.innerHTML = list.map(sk => `<button class="drop-opt tap-soft" onclick="pickAt('${sk.id}')"><div class="opt-main"><div class="opt-title">@${esc(sk.name)}</div><div class="opt-sub">${esc(sk.desc || "")}</div></div></button>`).join("");
  pop.classList.add("open");
}
function pickAt(id) { const ta = document.getElementById("prompt-in"); ta.value = ta.value.replace(/@[a-zA-Z0-9_-]*$/, ""); if (!S.skillIds.includes(id)) S.skillIds.push(id); document.getElementById("at-popup").classList.remove("open"); renderSkillStack(); renderChips(); ta.focus(); }
function renderChips() {
  const c = [];
  if (S.activeTool) c.push(`<span class="chip">${esc(S.activeTool)} <button onclick="S.activeTool=null;renderChips()">×</button></span>`);
  if (S.activeNbId) { const n = S.notebooks.find(x => x.id === S.activeNbId); if (n) c.push(`<span class="chip">Ghi chú: ${esc(n.title)} <button onclick="S.activeNbId=null;renderChips();renderNbList()">×</button></span>`); }
  S.atts.forEach((a, i) => {
    if (a.dataUrl) c.push(`<span class="chip"><img src="${a.dataUrl}" onclick="openVisionStudio(${i})" /><span>${esc(a.name.slice(0, 14))}</span> <span class="edit-tag" onclick="openVisionStudio(${i})">${a.enhanced ? "Đã nét" : "Soi / Nét"}</span> <button onclick="S.atts.splice(${i},1);renderChips();updateOrbButton()">×</button></span>`);
    else c.push(`<span class="chip">${esc(a.name.slice(0, 18))} <button onclick="S.atts.splice(${i},1);renderChips();updateOrbButton()">×</button></span>`);
  });
  document.getElementById("chips-bar").innerHTML = c.join("");
}

function openModal(html) { document.getElementById("modal-box").innerHTML = html; document.getElementById("modal-bg").classList.add("open"); }
function closeModal() { document.getElementById("modal-bg").classList.remove("open"); }
function openLightbox(src) { openModal(`<img src="${src}" style="width:100%;border-radius:14px;margin-bottom:10px;"/><div style="display:flex;justify-content:flex-end;gap:8px;"><a class="btn-s tap" href="${src}" download="apiai-hd.jpg" style="text-decoration:none;">Tải ảnh</a><button class="btn-p tap" onclick="closeModal()">Đóng</button></div>`); }
let tTimer = null;
function showToast(msg) { const t = document.getElementById("toast"); document.getElementById("toast-msg").textContent = msg; t.classList.remove("show"); void t.offsetWidth; t.classList.add("show"); clearTimeout(tTimer); tTimer = setTimeout(() => t.classList.remove("show"), 2600); }
function copyText(txt, ok = "Đã sao chép") { navigator.clipboard?.writeText(txt).then(() => showToast(ok)).catch(() => showToast("Không thể sao chép")); }

boot();
