/* API AI v3.7 — Vision Fix + Slash Commands (/new /compact /plan) + Reference Image Style-Lock + Office Studio (PPTX/DOCX/XLSX/PDF) */
const META = window.__APP_META__ || { verCode: 20, verName: "2.0.20", repo: "bangnguyentx/BANG_GPT", workerUrl: "" };

const THINK_LEVELS = [
  { id: "low", title: "Thấp", sub: "Phản hồi nhanh · reasoning: low", prompt: "Trả lời ngắn gọn, trực diện, không lan man." },
  { id: "medium", title: "Trung bình", sub: "Cân bằng · reasoning: medium", prompt: "Phân tích cân bằng, rõ ràng từng ý chính." },
  { id: "high", title: "Cao", sub: "Suy luận sâu · reasoning: high", prompt: "Suy luận sâu từng bước, tự kiểm tra kỹ logic trước khi kết luận." },
  { id: "xhigh", title: "xHigh", sub: "Tư duy rất sâu · reasoning: xhigh", prompt: "Tư duy chuyên sâu ở mức rất cao: phân tích đa chiều, rà soát mọi edge-case và kiểm chứng cẩn mật trước khi đưa ra đáp án cuối." },
  { id: "max", title: "Max", sub: "Tư duy cực đại · reasoning: max (tốn nhiều token hơn)", prompt: "Tư duy ở mức CỰC ĐẠI: tự phản biện từng giả định, kiểm chứng chéo mọi số liệu/logic/ca biên khó nhất trước khi kết luận sắc bén nhất." }
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
  lowPowerMotion: false,
  modelThinkingMap: {},
  repoReaderModel: "gpt-6.2-sol",
  mcpBuiltin: { linkReader: true, webSearch: true, contextSync: true, builderAssist: true, utilities: true },
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
const ICON_CHECK = `<svg class="check-draw" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>`;
const ICON_LOCK = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`;

let db = null;
function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open("ChatGPTProAppDB_v3", 4);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      ["chats", "skills", "notebooks", "memories", "library", "kv", "teams", "tutors", "contexts", "mcp", "prompts", "journal"].forEach(s => {
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
  teams: [], activeTeamId: null,
  tutors: [], activeTutorId: null,
  contexts: [], activeContextId: null,
  mcpServers: [],
  pendingTask: null,
  prompts: [], journal: [], adminKeyFilter: "all", adminKeyQuery: "", adminData: null, adminTab: "keys", selectedTierTab: "classic", canvasPreviewOnly: false
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
      mcpBuiltin: { ...DEFAULT_CFG.mcpBuiltin, ...(saved.mcpBuiltin || {}) },
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

  // Load Teams (ensure built-in 4-Agent Coding Team exists!)
  S.teams = await dbAll("teams");
  await ensureBuiltinCodingTeam();
  // Load Tutors & Shared Contexts (boi-canh.md)
  S.tutors = await dbAll("tutors");
  S.contexts = await dbAll("contexts");
  S.mcpServers = await dbAll("mcp");
  S.pendingTask = await dbGet("kv", "pendingTask");
  renderMcpQuickBadge();

  applyTheme();
  renderSkillStack();
  renderRepoCostStrip();
  renderTopContextPill();
  bindEvents();
  bindGestures();
  setAuthTab("login");
  bgRequestNotifyPerm();
  syncAllTutorAlarms();

  // Deep-link hook from Android Tutor notification tap
  window.__OPEN_TUTOR_FROM_NOTIF__ = tid => {
    if (S.tutors.some(t => t.id === tid)) openTutorWorkspace(tid);
  };

  if (!S.cfg.token || !S.cfg.serverUrl) showAuthGate(true);
  else await refreshSession();
  setTimeout(() => checkAppUpdate(true), 3500);
}

function applyTheme() {
  document.body.classList.toggle("ultra-glass", Boolean(S.cfg.ultraGlass));
  document.body.classList.toggle("low-power-motion", Boolean(S.cfg.lowPowerMotion));
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
  if (show) loadPublicPlansMeta();
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
    const [rc, rm, rx, rtm, rtu, rsk, rmcp] = await Promise.all([
      apiFetch("/sync/chats"),
      apiFetch("/sync/memories"),
      apiFetch("/sync/contexts"),
      apiFetch("/sync/teams"),
      apiFetch("/sync/tutors"),
      apiFetch("/sync/skills"),
      apiFetch("/sync/mcp")
    ]);
    if (rc.ok) S.chats = ((await rc.json()).chats || []).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    if (rm.ok) S.memories = (await rm.json()).memories || [];
    if (rx.ok) {
      for (const c of ((await rx.json()).contexts || [])) await dbPut("contexts", c);
      S.contexts = (await dbAll("contexts")).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    }
    if (rtm.ok) {
      for (const tm of ((await rtm.json()).items || [])) await dbPut("teams", tm);
      S.teams = await dbAll("teams");
      await ensureBuiltinCodingTeam();
    }
    if (rtu.ok) {
      for (const tu of ((await rtu.json()).items || [])) await dbPut("tutors", tu);
      S.tutors = await dbAll("tutors");
      syncAllTutorAlarms();
    }
    if (rsk.ok) {
      for (const sk of ((await rsk.json()).items || [])) await dbPut("skills", sk);
      S.skills = await dbAll("skills");
      renderSkillStack(); renderRepoCostStrip();
    }
    if (rmcp.ok) {
      for (const sv of ((await rmcp.json()).items || [])) await dbPut("mcp", sv);
      S.mcpServers = await dbAll("mcp");
      renderMcpQuickBadge();
    }
    renderTopContextPill();
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
  const isUnlimMsgs = isAdmin || Boolean(u.limits?.unlimited_msgs) || Number(u.limits?.daily_msgs) < 0;
  const remTok = Math.max(0, (u.limits?.daily_tokens || 0) - (u.dailyTokens || 0));
  document.getElementById("set-usage").textContent = isAdmin
    ? "Không giới hạn lượt và model"
    : `Hôm nay: ${u.dailyMsgs}/${isUnlimMsgs ? "Vô hạn" : (u.limits?.daily_msgs ?? 0)} tin · Còn ${remTok.toLocaleString("vi-VN")} token`;
  document.getElementById("hero-quota-txt").textContent = isAdmin
    ? "Admin · Toàn quyền API AI"
    : `${u.planLabel || "API AI"}`;

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
    prog.textContent = `Đang tạo bản đồ kiến trúc gọn bằng ${S.cfg.repoReaderModel || "GPT 6.2 Sol"} để chống tốn token...`;
    sk.repoIndex = await buildRepoIndexViaCheapReader(sk);
    await dbPut("skills", sk);
    S.skills = await dbAll("skills");
    renderSkillStack(); renderRepoCostStrip(); renderSkillsPage(); closeModal();
    haptic("ok"); showToast(`Đã cài @${slug} (${res.files.length} tệp · đã tối ưu chỉ mục)`);
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
    sk.repoIndex = await buildRepoIndexViaCheapReader(sk);
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
function toggleSkillPill(id) { haptic("switch"); S.skillIds = S.skillIds.includes(id) ? S.skillIds.filter(x => x !== id) : [...S.skillIds, id]; renderSkillStack(); renderRepoCostStrip(); renderChips(); }

/* ===== HD VISION STUDIO ===== */
function setImgQuality(q) { haptic("tap"); S.cfg.imgQuality = q; dbPut("kv", S.cfg); applyTheme(); showToast(`Chất lượng ảnh: ${q === "fast" ? "Nhanh" : q === "ultra" ? "Siêu nét" : "HD 2048px"}`); }
function readFileAsDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result || ""));
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function isCanvasSolidBlack(ctx, w, h) {
  try {
    const stepX = Math.max(1, Math.floor(w / 14));
    const stepY = Math.max(1, Math.floor(h / 14));
    let total = 0, dark = 0;
    for (let y = stepY; y < h - stepY; y += stepY) {
      for (let x = stepX; x < w - stepX; x += stepX) {
        const px = ctx.getImageData(x, y, 1, 1).data;
        total++;
        if (px[0] <= 3 && px[1] <= 3 && px[2] <= 3) dark++;
      }
    }
    return total > 8 && (dark / total) >= 0.985;
  } catch { return false; }
}

async function processImageFile(file) {
  const qMap = { fast: { max: 1024, q: 0.86 }, hd: { max: 1920, q: 0.92 }, ultra: { max: 2400, q: 0.95 } };
  const allowHd = S.user?.role === "admin" || S.user?.limits?.allow_hd_vision !== false;
  const preset = allowHd ? (qMap[S.cfg.imgQuality] || qMap.hd) : qMap.fast;

  // Read via FileReader first (fixes Android WebView content:// black canvas bug!)
  const rawDataUrl = await readFileAsDataUrl(file);
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = rawDataUrl;
  });
  try { if (typeof img.decode === "function") await img.decode(); } catch {}

  let w = img.naturalWidth || img.width || 1024;
  let h = img.naturalHeight || img.height || 1024;

  // If image already fits within preset & reasonable size (< 2.5MB) and is JPEG/PNG/WEBP, keep crisp original!
  if (w <= preset.max && h <= preset.max && file.size <= 2600000 && /^data:image\/(jpeg|jpg|png|webp);/i.test(rawDataUrl)) {
    return { dataUrl: rawDataUrl, w, h };
  }

  if (w > preset.max || h > preset.max) {
    const ratio = Math.min(preset.max / w, preset.max / h);
    w = Math.max(1, Math.round(w * ratio));
    h = Math.max(1, Math.round(h * ratio));
  }

  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);

  // Automatic black-frame guard: if WebView GPU canvas failed to blit, return safe rawDataUrl!
  if (isCanvasSolidBlack(ctx, w, h) && file.size <= 6500000) {
    return { dataUrl: rawDataUrl, w: img.naturalWidth || w, h: img.naturalHeight || h };
  }
  const dataUrl = c.toDataURL("image/jpeg", preset.q);
  return { dataUrl: dataUrl && dataUrl.length > 64 ? dataUrl : rawDataUrl, w, h };
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
    <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:10px;">Làm rõ ảnh mờ, khoanh vùng soi chi tiết hoặc dựng lại giao diện từ ảnh chụp.</p>
    <div class="vision-stage" id="v-stage"><canvas id="v-canvas"></canvas><div id="crop-rect"><div id="crop-handle"></div></div></div>
    <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
      <button type="button" id="btn-enh" class="btn-s tap ${studioState.enhanced?"lg-active":""}" style="flex:1;" onclick="toggleStudioEnhance()">Làm rõ ảnh</button>
      <button type="button" id="btn-crop-mode" class="btn-s tap" style="flex:1;" onclick="toggleStudioCrop()">Soi chi tiết</button>
      <button type="button" class="btn-blue tap" style="flex:1;" onclick="closeModal();triggerUiFromScreenshot(${idx})">Dựng UI từ ảnh</button>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px;flex-wrap:wrap;">
      <button type="button" class="btn-s tap" onclick="closeModal()">Đóng</button>
      <button type="button" id="btn-crop-add" class="btn-blue tap" style="display:none;" onclick="commitStudioCrop()">Gửi kèm vùng soi</button>
      <button type="button" class="btn-p tap" onclick="applyStudioEnhanced()">Áp dụng</button>
    </div>`);
  studioState.imgObj.onload = async () => {
    try { if (typeof studioState.imgObj.decode === "function") await studioState.imgObj.decode(); } catch {}
    drawStudioCanvas(); bindCropGestures();
  };
  studioState.imgObj.src = att.origDataUrl || att.dataUrl;
}
function drawStudioCanvas() {
  const cv = document.getElementById("v-canvas"), img = studioState.imgObj;
  if (!cv || !img) return;
  const nw = img.naturalWidth || img.width || 800;
  const nh = img.naturalHeight || img.height || 800;
  const sc = Math.min(1, 1280 / Math.max(nw, nh));
  cv.width = Math.max(1, Math.round(nw * sc));
  cv.height = Math.max(1, Math.round(nh * sc));
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.drawImage(img, 0, 0, cv.width, cv.height);
  if (studioState.enhanced) enhanceCanvasPixels(ctx, cv.width, cv.height);
  positionCropRect();
}
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
async function ensurePdfJsLoaded() {
  if (window.pdfjsLib) return window.pdfjsLib;
  return new Promise((res, rej) => {
    const sc = document.createElement("script");
    sc.src = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
    sc.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
        res(window.pdfjsLib);
      } else rej(new Error("Không tải được bộ đọc PDF."));
    };
    sc.onerror = () => rej(new Error("Không thể tải thư viện đọc PDF (cần có mạng)."));
    document.head.appendChild(sc);
  });
}

async function extractRealFileText(file) {
  if (/\.(docx|pptx|xlsx)$/i.test(file.name) && window.OfficeStudio?.extractOfficeFileText) {
    try {
      showToast(`Đang đọc nội dung tệp Office: ${file.name}...`);
      return await window.OfficeStudio.extractOfficeFileText(file);
    } catch (e) {
      return { text: `(Không đọc được tệp Office "${file.name}": ${e.message})`, pages: 0 };
    }
  }
  const isPdf = /\.pdf$/i.test(file.name) || file.type === "application/pdf";
  if (!isPdf) {
    const raw = (await file.text()).slice(0, 50000);
    return { text: raw, pages: 0 };
  }
  try {
    showToast(`Đang trích xuất văn bản PDF: ${file.name}...`);
    const pdfjs = await ensurePdfJsLoaded();
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    const maxPages = Math.min(doc.numPages, 35);
    const out = [];
    for (let p = 1; p <= maxPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const line = tc.items.map(it => it.str || "").join(" ").replace(/\s+/g, " ").trim();
      if (line) out.push(`[Trang ${p}/${doc.numPages}] ${line}`);
    }
    const text = out.join("\n\n").slice(0, 48000);
    if (!text) return { text: `(File PDF ${doc.numPages} trang dạng ảnh scan — hãy chụp ảnh trang đề để dùng HD Vision đọc nét hơn.)`, pages: doc.numPages };
    return { text, pages: doc.numPages };
  } catch (e) {
    return { text: `(Không đọc được chữ từ PDF "${file.name}": ${e.message})`, pages: 0 };
  }
}

async function handleDocs(files) {
  for (const f of files || []) {
    const { text, pages } = await extractRealFileText(f);
    let finalTxt = text;
    let digested = false;
    // If PDF/Doc is very long (> 6000 chars), auto-digest via GPT 6.2 Sol to save ~80% tokens!
    if (text.length > 6000 && S.user?.licenseActive) {
      showToast(`Đang lọc gọn ${f.name}${pages ? ` (${pages} trang)` : ""} bằng ${S.cfg.repoReaderModel || "GPT 6.2 Sol"}...`);
      try {
        const r = await apiFetch("/ai/digest", {
          method: "POST",
          body: {
            readerModelId: S.cfg.repoReaderModel || "gpt-6.2-sol",
            instruction: `Trích xuất đầy đủ ý chính, số liệu, câu hỏi/đề bài và cấu trúc từ tài liệu "${f.name}" để mô hình chính xử lý chính xác mà tiết kiệm token.`,
            content: text
          }
        });
        if (r.ok) {
          const d = await r.json();
          if (d.digest) {
            finalTxt = `[BẢN TÓM LƯỢC TỐI ƯU TỪ ${f.name}${pages ? ` (${pages} trang)` : ""}]
${d.digest}

[TRÍCH ĐOẠN GỐC ĐẦU TÀI LIỆU]
${text.slice(0, 2200)}`;
            digested = true;
          }
        }
      } catch {}
    }
    S.atts.push({ id: "d-" + Date.now() + Math.random(), type: "file", name: pages ? `${f.name} (${pages}tr)` : f.name, text: finalTxt, digested });
  }
  renderChips(); updateOrbButton(); haptic("ok");
  showToast(`Đã đính kèm ${files.length} tệp`);
  document.getElementById("in-doc").value = "";
}

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

function buildSystemPrompt(chat, query, hasImgs, handoffSummary = "", digestedRepoText = "", tutorExtraSys = "") {
  const arr = ["Bạn là API AI — trợ lý AI trả lời tiếng Việt rõ ràng, sắc sảo và chính xác."];
  if (tutorExtraSys) arr.push(tutorExtraSys);
  const ctxObj = getActiveContextForChat(chat);
  if (ctxObj?.content?.trim()) {
    arr.push(`HỒ SƠ NGỮ CẢNH CHUNG DUY NHẤT (${ctxObj.title || "boi-canh.md"}) — NGUỒN SỰ THẬT DÙNG CHUNG CHO MỌI MODEL (GPT & CLAUDE):\n${ctxObj.content.slice(0, 6500)}`);
  }
  if (handoffSummary) arr.push("BỐI CẢNH CHUYỂN TIẾP TỪ API TRƯỚC TRONG CÙNG ĐOẠN CHAT:\n" + handoffSummary);
  if (hasImgs) arr.push("PHÂN TÍCH THỊ GIÁC TOÀN DIỆN: Quan sát toàn bộ vật thể, bố cục, màu sắc, ánh sáng, chi tiết nhỏ, biểu đồ và chữ viết trong ảnh.");
  if (S.cfg.workMode === "task" && !tutorExtraSys) arr.push("CHẾ ĐỘ NHIỆM VỤ: Chia yêu cầu thành các bước thực thi cụ thể.");
  const lv = THINK_LEVELS.find(x => x.id === S.cfg.thinkingLevel); if (lv) arr.push(`Tư duy (${lv.title}): ${lv.prompt}`);
  if (S.cfg.personalIntel) {
    const mems = S.memories.filter(m => m.enabled !== false);
    if (mems.length) arr.push("TRÍ NHỚ CÁ NHÂN:\n" + mems.map(m => "- " + m.content).join("\n"));
    const roll = buildRollingSummary(chat); if (roll) arr.push("TÓM TẮT NGỮ CẢNH CŨ:\n" + roll);
    S.lastCrossRecalls = findCrossChatRecalls(query);
    if (S.lastCrossRecalls.length) arr.push("GỢI NHỚ CROSS-CHAT:\n" + S.lastCrossRecalls.map(r => `- [${r.chatTitle}] ${r.snippet}`).join("\n"));
  } else S.lastCrossRecalls = [];
  if (S.activeNbId) { const nb = S.notebooks.find(n => n.id === S.activeNbId); if (nb) arr.push(`SỔ GHI CHÚ "${nb.title}":\n${nb.notes}`); }
  if (digestedRepoText) {
    arr.push(digestedRepoText);
  }
  S.skillIds.forEach(id => {
    const sk = S.skills.find(x => x.id === id);
    if (!sk) return;
    if (sk.repoFiles?.length) {
      if (!digestedRepoText) arr.push(retrieveCompactRepoContext(sk, query));
    } else {
      arr.push(`KỸ NĂNG @${sk.name}:\n${(sk.prompt || "").slice(0, 5000)}`);
    }
  });
  if (chat?.compactSummary) {
    arr.push("NGỮ CẢNH DỰ ÁN ĐÃ NÉN (/compact — GIỮ NGUYÊN MẠCH DỰ ÁN NÀY):\n" + chat.compactSummary);
  }
  if (S.activeTool === "canvas") arr.push("CANVAS: Xuất toàn bộ mã hoàn chỉnh chạy độc lập trong ĐÚNG 1 khối ```html ... ```. Nếu có ảnh chụp màn hình đính kèm, bám sát bố cục, màu sắc và sửa triệt để lỗi giao diện.");
  if (S.activeTool === "deep_research") arr.push("DEEP RESEARCH: Phân tích đa chiều có bảng so sánh và kết luận thực tế.");
  if (S.activeTool === "web_search") arr.push("TÌM KIẾM WEB TRỰC TIẾP: Ưu tiên tổng hợp từ các nguồn web thực tế được cung cấp ở trên và dẫn rõ nguồn.");
  if (S.activeTool === "guided") arr.push("HỌC CÓ HƯỚNG DẪN: Giải thích bản chất kèm câu hỏi kiểm tra tư duy.");
  if (S._turnPlanLock) {
    arr.push("CHẾ ĐỘ LẬP KẾ HOẠCH TRƯỚC (/plan — KHÓA SỬA CODE): TUYỆT ĐỐI CHƯA VIẾT HOẶC SỬA CODE HOÀN CHỈNH. Chỉ lập kế hoạch triển khai chi tiết gồm: 1) Phân tích mục tiêu & phạm vi, 2) Danh sách tệp/thành phần cần chạm tới, 3) Từng bước thực hiện theo thứ tự ưu tiên, 4) Rủi ro & kịch bản kiểm thử. Cuối bản kế hoạch dừng lại để người dùng bấm Duyệt trước khi làm.");
  }
  const officeIntent = detectOfficeIntent(query, S.activeTool);
  if (officeIntent && canUseOfficeStudio()) {
    arr.push(buildOfficeSystemDirective(officeIntent));
  }
  if (typeof window.shouldInjectTradingSignalDirective === "function" && window.shouldInjectTradingSignalDirective(query, hasImgs)) {
    arr.push(window.TRADING_SIGNAL_DIRECTIVE);
  }
  if (S.cfg.mcpBuiltin?.builderAssist !== false && !tutorExtraSys) {
    const busySched = (S.tutors || []).map(t => `- ${t.name} (${t.subject}): thứ ${(t.scheduleDays||[]).join(",")} lúc ${t.scheduleTime}`).join("\n") || "(Chưa có lịch nào)";
    const okMods = getAllowedRealModels().map(m => m.id).join(", ");
    arr.push(`TRỢ LÝ THIẾT LẬP ĐỘI NGŨ AI & GIA SƯ AI (4AB): Nếu người dùng yêu cầu tạo hộ/thiết kế một "Đội ngũ AI (Team)" hoặc "Gia sư AI" (hoặc hỏi không biết bắt đầu lập Team/Gia sư từ đâu), hãy trả lời ngắn gọn kèm ĐÚNG 1 khối JSON chuẩn đặt trong ${"`".repeat(3)}apiai-builder ... ${"`".repeat(3)} để hệ thống hiện nút [Lưu & Dùng ngay]:
- Nếu tạo Team: {"kind":"team","name":"Tên Team","desc":"Mô tả ngắn","coordMode":"sequential hoặc council","pauseAfterFirst":false,"maxFixLoops":1,"members":[{"role":"Vai trò 1","prompt":"Chỉ dẫn chi tiết","modelId":"1 trong các model: ${okMods}"}]} (2 đến 6 thành viên).
- Nếu tạo Gia sư: {"kind":"tutor","name":"Tên Gia sư","subject":"Môn học","prompt":"Phong cách & chỉ dẫn chi tiết","modelId":"auto_tutor","scheduleDays":[1,3,5],"scheduleTime":"20:00","reminderText":"Câu nhắc tự nhiên"} (lưu ý: chọn ngày/giờ TRÁNH TRÙNG với lịch hiện tại của học viên:\n${busySched}).`);
  }
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
  return S.user?.role === "admin" || ["pro_max", "ultra"].includes(S.user?.keyTier);
}

function detectImageIntent(text, chat) {
  const t = (text || "").trim().toLowerCase();
  if (!t) return null;
  // Never hijack coding/diagram/UI design requests
  if (/(viết code|lập trình|html|css|javascript|python|pine script|mql5|svg|react|canvas|giao diện web)/i.test(t)) return null;

  // 1. Direct explicit draw / generate image intent (including banner, 1536x1024, save filename)
  if (/^(hãy\s+)?(tạo|vẽ|sinh|render|thiết kế)\s+(giúp\s+|cho\s+(mình|tôi|em)\s+)?(1\s+|một\s+)?(hình|ảnh|bức ảnh|bức tranh|tranh|nhân vật|chibi|logo|avatar|poster|banner|cover|thumbnail|wallpaper)/i.test(t)
    || /^(generate|create|draw|paint)\s+(an?\s+)?(image|picture|photo|illustration|art|chibi|logo|banner|poster)/i.test(t)
    || (/\b(vẽ|tạo ảnh|tạo banner|tạo poster)\b/i.test(t) && (/\d{3,4}\s*[x×]\s*\d{3,4}/i.test(t) || /lưu\s+ra\s+[\w.-]+\.(png|jpg|jpeg|webp)/i.test(t)))) {
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

async function callStatelessAgent(chat, modelId, roleId, sysPrompt, userPrompt, onToken, imageAtts = [], signalOverride = null) {
  const imgs = (Array.isArray(imageAtts) ? imageAtts : []).filter(x => x && x.dataUrl);
  const userContent = imgs.length
    ? [{ type: "text", text: userPrompt }, ...imgs.map(im => ({ type: "image_url", image_url: { url: im.dataUrl, detail: "high" } }))]
    : userPrompt;
  const res = await apiFetch("/ai/chat", {
    method: "POST",
    body: {
      chatId: chat.id,
      mode: "four_agent",
      agentRole: roleId,
      uiModelId: modelId,
      thinkingLevel: S.cfg.thinkingLevel || "high",
      messages: [
        { role: "system", content: sysPrompt },
        { role: "user", content: userContent }
      ],
      stream: true,
      pinnedProvider: chat.pinnedProvider,
      pinnedKeyIndex: chat.pinnedKeyIndex
    },
    signal: (typeof signalOverride !== "undefined" && signalOverride) ? signalOverride : (S.abort ? S.abort.signal : undefined)
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
        await dbPut("chats", chat).catch(() => {}); apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {});
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
    S._turnPlanLock = false;
    if (S.activeTool && S.activeTool.startsWith("office_")) { S.activeTool = null; renderChips(); }
    aiMsg.streaming = false; S.streaming = false; S.abort = null; chat.updatedAt = Date.now();
    bgStopTask();
    dbPut("chats", chat).catch(() => {}); apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {});
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
  const isUnlimMsgs = Boolean(S.user.limits?.unlimited_msgs) || Number(S.user.limits?.daily_msgs) < 0;
  if (S.user.role !== "admin" && S.user.limits && !isUnlimMsgs && S.user.dailyMsgs >= S.user.limits.daily_msgs) {
    haptic("err"); return showToast(`Đã hết giới hạn ${S.user.limits.daily_msgs} tin nhắn/ngày`, "err");
  }

  const input = document.getElementById("prompt-in");
  let text = (overrideText !== null ? overrideText : input.value).trim();
  if (!opts.reuseLastUser && !text && !S.atts.length) return;
  document.getElementById("slash-popup")?.classList.remove("open");
  haptic("tap");

  // Handle Slash Commands via v3.6 unified dispatcher (includes /meo, /init, /plan, /compact [giữ gì], /context, /rewind, /model, /usage, /simplify, /compare, /p, /new, /slide, /doc, /excel, /pdf, /img)
  if (!opts.reuseLastUser && text.startsWith("/") && typeof window.handleV36SlashSubmit === "function") {
    const resSl = await window.handleV36SlashSubmit(text, overrideText === null);
    if (resSl?.handled) return;
    if (typeof resSl?.newText === "string") text = resSl.newText;
  }

  [...text.matchAll(/@([a-zA-Z0-9_-]+)/g)].forEach(m => {
    const sk = S.skills.find(s => s.name.toLowerCase() === m[1].toLowerCase());
    if (sk && !S.skillIds.includes(sk.id)) S.skillIds.push(sk.id);
  });
  renderSkillStack();

  const activeTeam = S.activeTeamId ? S.teams.find(t => t.id === S.activeTeamId) : null;
  const activeTutor = S.activeTutorId ? S.tutors.find(t => t.id === S.activeTutorId) : null;

  let chat = S.chats.find(c => c.id === S.activeChatId);
  if (!chat) {
    const prefix = activeTeam ? `[Team: ${activeTeam.name}] ` : (activeTutor ? `[Gia sư ${activeTutor.subject}] ` : "");
    chat = {
      id: "c-" + Date.now(), title: (prefix + (text || S.atts[0]?.name || "Cuộc trò chuyện mới")).slice(0, 48),
      pinned: false, mode: activeTeam ? "team" : (activeTutor ? "tutor" : S.cfg.workMode),
      teamId: activeTeam?.id || null, tutorId: activeTutor?.id || null,
      contextId: S.activeContextId || null,
      nbId: S.activeNbId,
      pinnedProvider: null, pinnedKeyIndex: null, pinnedSlotLabel: "",
      updatedAt: Date.now(), messages: []
    };
    S.chats.unshift(chat); S.activeChatId = chat.id;
  }

  let sentAtts = [];
  if (!opts.reuseLastUser) {
    sentAtts = [...S.atts];
    const autoDetectNewKnowledge = activeTutor && detectNewClassKnowledge(text);
    chat.messages.push({
      id: "m-" + Date.now(), role: "user", text, atts: sentAtts,
      suggestSaveTutorId: autoDetectNewKnowledge ? activeTutor.id : null,
      ts: Date.now()
    });
    chat.updatedAt = Date.now();
    if (overrideText === null) { input.value = ""; autoGrow(); }
    S.atts = []; renderChips(); renderMessages(); renderChatsList(); scrollToBottom(true);
  }

  if (activeTeam && !opts.forceSwitch) {
    const teamAtts = opts.reuseLastUser ? (chat.messages.filter(x => x.role === "user").slice(-1)[0]?.atts || []) : sentAtts;
    return runTeamPipeline(chat, activeTeam, text, null, 0, teamAtts);
  }
  const autoImgPrompt = (!activeTutor && S.activeTool === "image") ? text : (!activeTutor && !opts.forceSwitch ? detectImageIntent(text, chat) : null);
  if (autoImgPrompt) return runGenImage(chat, autoImgPrompt, sentAtts);

  const isPlanLock = Boolean(opts.planLock) || S.activeTool === "plan"
    || /(lập kế hoạch trước|chưa sửa code|chưa viết code|chỉ lập kế hoạch|lên kế hoạch trước|plan first)/i.test(text);
  S._turnPlanLock = isPlanLock;
  if (S.activeTool === "plan") { S.activeTool = null; renderChips(); }

  // Determine model (Auto Tutor smart routing if inside Tutor!)
  let chosenUi = S.models.find(m => m.id === S.cfg.selectedModel) || S.models.find(x => x.allowed) || S.models[0];
  let tutorExtraSys = "";
  if (activeTutor) {
    await markTutorStudiedToday(activeTutor);
    const resolvedId = resolveTutorModelId(activeTutor, text);
    chosenUi = S.models.find(m => m.id === resolvedId && m.allowed) || chosenUi;
    tutorExtraSys = await buildTutorSystemPrompt(activeTutor, text);
  }

  // 4A: Cheap Reader Digest for active GitHub Repos before calling expensive models (>= x2.0)
  let digestedRepoText = "";
  const activeRepoSkills = S.skillIds.map(id => S.skills.find(x => x.id === id)).filter(sk => sk?.repoFiles?.length);
  if (activeRepoSkills.length) {
    digestedRepoText = await digestActiveReposForQuery(activeRepoSkills, text, chosenUi);
  }

  const sysPrompt = buildSystemPrompt(chat, text, sentAtts.some(a => a.dataUrl), opts.handoffSummary || "", digestedRepoText, tutorExtraSys);
  renderMemoryBar();
  bgStartTask(activeTutor ? `Gia sư ${activeTutor.name} đang soạn bài` : "API AI đang trả lời", `${chosenUi.short || chosenUi.title} · giữ kết nối nền`);
  const aiMsg = {
    id: "m-" + (Date.now() + 1), role: "assistant", text: "", thinking: "", thinkingLevel: S.cfg.thinkingLevel || "high", thinkMs: 0,
    modelLabel: `${chosenUi.short || chosenUi.title} · ${THINK_LEVELS.find(x => x.id === S.cfg.thinkingLevel)?.title || "Cao"}`,
    slot: "", citedFile: sentAtts[0]?.name || "", toolSteps: [], sources: [], fetchedRepoUrl: "",
    feedback: null, streaming: true, failedSwitch: false, canSwitch: false, isPlanLock: Boolean(S._turnPlanLock), planPrompt: S._turnPlanLock ? text : "", ts: Date.now()
  };
  chat.messages.push(aiMsg); renderMessages(); scrollToBottom(true);

  S.streaming = true; S.abort = new AbortController(); updateOrbButton();
  try {
    // v3.4 Pre-Flight MCP & Smart Link / Web Search Orchestrator (video_1.mp4 live step cards!)
    const preFlightContext = await runPreFlightToolsAndMcp(aiMsg, text, chosenUi);
    const fullSysPrompt = preFlightContext ? `${sysPrompt}\n\n${preFlightContext}` : sysPrompt;
    const msgs = [{ role: "system", content: fullSysPrompt }];
    const startIdx = Number.isInteger(chat.compactedUpToIndex) ? Math.max(0, chat.compactedUpToIndex) : 0;
    for (const m of chat.messages.slice(startIdx, -1).filter(x => !x.failedSwitch).slice(-20)) {
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
        mode: activeTutor ? "tutor" : "chat",
        uiModelId: chosenUi.id,
        thinkingLevel: S.cfg.thinkingLevel || "high",
        tool: S.activeTool,
        messages: msgs,
        stream: true,
        pinnedProvider: chat.pinnedProvider,
        pinnedKeyIndex: chat.pinnedKeyIndex,
        forceSwitch: Boolean(opts.forceSwitch)
      },
      signal: (typeof signalOverride !== "undefined" && signalOverride) ? signalOverride : (S.abort ? S.abort.signal : undefined)
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

    const hm = res.headers.get("X-Daily-Msgs"), hl = res.headers.get("X-Daily-Limit"), ht = res.headers.get("X-Daily-Tokens"), htl = res.headers.get("X-Daily-Token-Limit"), hbt = res.headers.get("X-Bonus-Tokens");
    if (S.user) {
      if (hm !== null) S.user.dailyMsgs = Number(hm);
      if (hl !== null && S.user.limits) S.user.limits.daily_msgs = Number(hl);
      if (ht !== null) S.user.dailyTokens = Number(ht);
      if (htl !== null && S.user.limits) S.user.limits.daily_tokens = Number(htl);
      if (hbt !== null) S.user.bonusTokens = Number(hbt);
      syncAccountUI();
    }
    aiMsg.slot = slotLbl || "";
    const um = res.headers.get("X-Used-Model"); if (um) aiMsg.modelLabel += ` · ${um}`;
    if (res.headers.get("X-Fallback-Used") === "1") showToast("Nguồn VIP tạm bận · Đã tự chuyển dự phòng nguồn thường", "warn");

    const thinkStart = Date.now();
    const appliedThink = res.headers.get("X-Thinking-Level");
    if (appliedThink) aiMsg.thinkingLevel = appliedThink;

    const extractInlineThinkTags = () => {
      if (!aiMsg.text.includes("<think>")) return;
      const m = aiMsg.text.match(/<think>([\s\S]*?)(?:<\/think>|$)/i);
      if (m) {
        aiMsg.thinking = m[1].trim();
        if (aiMsg.text.includes("</think>")) {
          aiMsg.text = aiMsg.text.replace(/<think>[\s\S]*?<\/think>/i, "").trimStart();
        } else {
          aiMsg.text = "";
        }
      }
    };

    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("text/event-stream") && res.body?.getReader) {
      const reader = res.body.getReader(), dec = new TextDecoder("utf-8");
      let buf = "", raf = false, rawContentAcc = "";
      const paint = () => {
        raf = false;
        const tb = document.getElementById("th-" + aiMsg.id);
        const thBox = document.getElementById("thb-" + aiMsg.id);
        if (aiMsg.thinking) {
          if (thBox) thBox.style.display = "block";
          if (tb) tb.textContent = aiMsg.thinking;
          const tLbl = document.getElementById("thl-" + aiMsg.id);
          if (tLbl) tLbl.textContent = aiMsg.text ? `Đã tư duy (${Math.max(1, Math.round(aiMsg.thinkMs / 1000))}s)` : `Đang tư duy (${Math.max(1, Math.round((Date.now() - thinkStart) / 1000))}s)...`;
        }
        const el = document.getElementById("md-" + aiMsg.id);
        if (el && aiMsg.text) {
          const ld = document.getElementById("wv-" + aiMsg.id); if (ld) ld.remove();
          el.innerHTML = renderMd(aiMsg.text);
        }
        if (isNearBottom()) scrollToBottom(false);
      };
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() || "";
        for (const l of lines) {
          const t = l.trim(); if (!t.startsWith("data:")) continue;
          const d = t.slice(5).trim(); if (d === "[DONE]") continue;
          try {
            const parsed = JSON.parse(d);
            const ch = parsed.choices?.[0]?.delta || {};
            const rDelta = ch.reasoning_content || ch.reasoning || "";
            const cDelta = ch.content || "";
            if (rDelta) {
              aiMsg.thinking += rDelta;
              aiMsg.thinkMs = Date.now() - thinkStart;
              if (!raf) { raf = true; requestAnimationFrame(paint); }
            }
            if (cDelta) {
              if (!aiMsg.text && aiMsg.thinking && !aiMsg.thinkMs) aiMsg.thinkMs = Date.now() - thinkStart;
              rawContentAcc += cDelta;
              aiMsg.text = rawContentAcc;
              extractInlineThinkTags();
              if (!raf) { raf = true; requestAnimationFrame(paint); }
            }
          } catch {}
        }
      }
      if (aiMsg.thinking && !aiMsg.thinkMs) aiMsg.thinkMs = Date.now() - thinkStart;
      paint();
    } else {
      const raw = await res.text();
      if (raw.includes("data:")) {
        for (const l of raw.split("\n")) {
          const t = l.trim(); if (!t.startsWith("data:")) continue;
          const d = t.slice(5).trim(); if (d === "[DONE]") continue;
          try {
            const ch = JSON.parse(d).choices?.[0]?.delta || {};
            if (ch.reasoning_content || ch.reasoning) aiMsg.thinking += (ch.reasoning_content || ch.reasoning);
            if (ch.content) aiMsg.text += ch.content;
          } catch {}
        }
      } else {
        try {
          const j = JSON.parse(raw);
          const msgObj = j.choices?.[0]?.message || {};
          aiMsg.thinking = msgObj.reasoning_content || msgObj.reasoning || "";
          aiMsg.text = msgObj.content || j.error?.message || "Không có phản hồi.";
        } catch { aiMsg.text = raw || "Không có phản hồi."; }
      }
      extractInlineThinkTags();
      if (aiMsg.thinking) aiMsg.thinkMs = Date.now() - thinkStart;
    }
    if (S.activeTool === "canvas") { const m = aiMsg.text.match(/```html\n([\s\S]*?)```/i); if (m) openCanvasCode(m[1], chat.title); }
    if (S.liveMode && aiMsg.text) speakLiveReply(aiMsg.text);
  } catch (e) {
    aiMsg.text = e.name === "AbortError" ? (aiMsg.text + "\n\n*(Đã dừng)*") : `**Thông báo:** ${e.message}`;
  } finally {
    aiMsg.streaming = false; S.streaming = false; S.abort = null; chat.updatedAt = Date.now();
    bgStopTask();
    if (document.hidden && aiMsg.text) {
      bgNotifyDone(activeTutor ? `Gia sư ${activeTutor.name} đã trả lời` : "API AI đã trả lời xong", aiMsg.text.replace(/[#*`]/g, "").slice(0, 120));
    }
    dbPut("chats", chat).catch(() => {}); apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {});
    syncAccountUI(); renderMessages(); renderMemoryBar(); updateOrbButton();
  }
}

function parseImageRequestMeta(rawPrompt) {
  const txt = String(rawPrompt || "");
  const szM = txt.match(/(\d{3,4})\s*[x×]\s*(\d{3,4})/i);
  const size = szM ? `${szM[1]}x${szM[2]}` : "1024x1024";
  const saveM = txt.match(/(?:lưu\s+(?:ra|thành|tệp|file)|xuất\s+(?:ra|file)|save\s+as)\s+["'`]?([\w.-]+\.(?:png|jpg|jpeg|webp))["'`]?/i);
  const refM = txt.match(/(?:dựa\s+theo|theo\s+(?:ảnh|hình|file|mẫu|phong\s+cách)?|giữ\s+(?:đúng\s+)?phong\s+cách\s+(?:của\s+)?)\s+["'`]?([\w.-]+\.(?:png|jpg|jpeg|webp))["'`]?/i);
  const saveName = saveM ? saveM[1] : null;
  const refName = refM ? refM[1] : null;
  return { size, saveName, refName };
}

async function resolveReferenceImage(refName, sentAtts, chat) {
  // 1. Newly attached image in current turn
  const direct = (sentAtts || []).find(a => a.dataUrl);
  if (direct) return { name: direct.name || refName || "ảnh mẫu", dataUrl: direct.dataUrl };
  if (!refName) return null;
  const low = refName.toLowerCase();

  // 2. Search previous messages in current chat
  for (const m of [...(chat?.messages || [])].reverse()) {
    const attHit = (m.atts || []).find(a => a.dataUrl && (a.name || "").toLowerCase().includes(low));
    if (attHit) return { name: attHit.name, dataUrl: attHit.dataUrl };
    if (m.genImg && (m.downloadName || "").toLowerCase().includes(low)) {
      return { name: m.downloadName, dataUrl: m.genImg };
    }
  }
  // 3. Search Library media
  const libHit = (S.library || []).find(l => l.type === "media" && l.data && (l.title || "").toLowerCase().includes(low));
  if (libHit) return { name: libHit.title, dataUrl: libHit.data };

  // 4. Built-in app logo.png fallback if user explicitly references logo.png
  if (low === "logo.png" || low === "logo-mark.png") {
    try {
      const r = await fetch(low);
      if (r.ok) {
        const blob = await r.blob();
        const dataUrl = await readFileAsDataUrl(blob);
        return { name: low, dataUrl };
      }
    } catch {}
  }
  return null;
}

async function runGenImage(chat, prompt, sentAtts = []) {
  const meta = parseImageRequestMeta(prompt);
  const aiMsg = {
    id: "m-" + (Date.now() + 1), role: "assistant", text: "", modelLabel: `Tạo ảnh · ${meta.size}`,
    toolSteps: [], streaming: true, downloadName: meta.saveName || `api-ai-${Date.now().toString(36)}.png`,
    imageSize: meta.size, ts: Date.now()
  };
  chat.messages.push(aiMsg); renderMessages(); scrollToBottom(true);
  S.streaming = true; updateOrbButton();

  const pushS = lbl => { const st = { id: "is" + Date.now() + Math.random().toString(36).slice(2, 5), label: lbl, status: "running", start: Date.now(), ms: 0, raw: "" }; aiMsg.toolSteps.push(st); renderMessages(); return st; };
  const doneS = (st, ok, lbl, raw = "") => { st.status = ok ? "done" : "err"; st.ms = Date.now() - st.start; if (lbl) st.label = lbl; if (raw) st.raw = raw; renderMessages(); };

  try {
    let finalPrompt = prompt;
    const refImg = await resolveReferenceImage(meta.refName, sentAtts, chat);
    if (refImg?.dataUrl) {
      const stRef = pushS(`Vision Style-Lock: phân tích phong cách từ ${refImg.name}...`);
      try {
        const sr = await apiFetch("/ai/digest", {
          method: "POST",
          body: {
            digestMode: "vision_style",
            readerModelId: "gpt-6.2-sol",
            instruction: `Analyze this reference image (${refImg.name}) and extract its exact brand visual style DNA so the generated image "${prompt}" matches its palette, mood, geometry, and aesthetic.`,
            content: "",
            imageDataUrl: refImg.dataUrl
          }
        });
        if (sr.ok) {
          const sd = await sr.json();
          if (sd.digest) {
            finalPrompt = `${prompt}

STRICT VISUAL STYLE MATCH (${refImg.name}): ${sd.digest}`;
            doneS(stRef, true, `Đã khóa phong cách theo ${refImg.name}`, sd.digest);
          } else doneS(stRef, true, `Đã đọc ảnh mẫu ${refImg.name}`);
        } else doneS(stRef, false, `Không phân tích được ảnh mẫu, vẽ trực tiếp`);
      } catch { doneS(stRef, false, `Bỏ qua phân tích ảnh mẫu`); }
    }

    const stGen = pushS(`Đang vẽ ảnh (${meta.size}) → ${aiMsg.downloadName}...`);
    const res = await apiFetch("/ai/image", { method: "POST", body: { prompt: finalPrompt, size: meta.size } });
    const data = await res.json();
    if (!res.ok) {
      doneS(stGen, false, `Lỗi vẽ ảnh (HTTP ${res.status})`);
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
    doneS(stGen, true, `Đã vẽ xong ${aiMsg.downloadName} (${meta.size})`);
    aiMsg.text = `Đã tạo ảnh **${aiMsg.downloadName}** (${meta.size})${refImg ? ` · giữ phong cách **${refImg.name}**` : ""}`;
    aiMsg.genImg = src; aiMsg.imagePrompt = prompt;
    await saveLib("media", aiMsg.downloadName, src);
    haptic("ok"); showToast(`Đã lưu ${aiMsg.downloadName} vào Thư viện`, "ok");
  } catch (e) { aiMsg.text = `**Không thể tạo ảnh:** ${e.message}`; }
  finally { aiMsg.streaming = false; S.streaming = false; S.activeTool = null; renderChips(); dbPut("chats", chat).catch(() => {}); apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {}); renderMessages(); updateOrbButton(); }
}

/* ===== MARKDOWN & MESSAGE RENDERING ===== */
let cbSeq = 0;
const builderPayloadMap = new Map();

function renderBuilderPreviewCard(rawJson) {
  let obj = null;
  try { obj = JSON.parse(rawJson.trim()); } catch { return ""; }
  if (!obj || !["team", "tutor"].includes(obj.kind)) return "";
  const bid = "bld-" + (++cbSeq);
  builderPayloadMap.set(bid, obj);

  if (obj.kind === "team") {
    const mems = Array.isArray(obj.members) ? obj.members : [];
    return `<div class="builder-card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
        <strong style="font-size:14.5px;">Đề xuất Đội ngũ AI: ${esc(obj.name || "Team mới")}</strong>
        <span class="tag-st tier-pro_max">${mems.length} thành viên · ${obj.coordMode==="council"?"Hội đồng":"Dây chuyền"}</span>
      </div>
      <div style="font-size:12.5px;color:var(--ink-2);">${esc(obj.desc || "")}</div>
      <div class="file-tag-list">${mems.map(m => `<span class="file-mini-tag">${esc(m.role)} (${esc(m.modelId || "gpt-6.2-sol")})</span>`).join("")}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
        <button type="button" class="btn-p tap" style="height:36px;font-size:13px;flex:1;" onclick="applyAiBuilderCard('${bid}', true)">Lưu & Dùng ngay</button>
        <button type="button" class="btn-s tap" style="height:36px;font-size:13px;" onclick="applyAiBuilderCard('${bid}', false)">Chỉnh sửa trước</button>
      </div></div>`;
  }
  const daysLbl = (obj.scheduleDays || [1, 3, 5]).map(x => WEEK_DAYS.find(w => w[0] === x)?.[1] || x).join(", ");
  return `<div class="builder-card">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
      <strong style="font-size:14.5px;">Đề xuất Gia sư AI: ${esc(obj.name || "Gia sư")}</strong>
      <span class="tag-st tier-pro">${esc(obj.subject || "Môn học")}</span>
    </div>
    <div style="font-size:12.5px;color:var(--ink-2);line-height:1.5;">
      Lịch học đề xuất (không trùng): <b>${esc(daysLbl)}</b> lúc <b class="num">${esc(obj.scheduleTime || "20:00")}</b><br/>
      Nhắc học: <i>"${esc(obj.reminderText || "Nay chưa vào học à?")}"</i>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
      <button type="button" class="btn-p tap" style="height:36px;font-size:13px;flex:1;" onclick="applyAiBuilderCard('${bid}', true)">Lưu & Vào học ngay</button>
      <button type="button" class="btn-s tap" style="height:36px;font-size:13px;" onclick="applyAiBuilderCard('${bid}', false)">Chỉnh sửa trước</button>
    </div></div>`;
}

function parseMarkdownTables(escapedText, tablesOut) {
  const lines = escapedText.split("\n");
  const res = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i].includes("|") && i + 1 < lines.length && /^\s*\|?[\s:-]+\|[\s|:-]+\s*$/.test(lines[i + 1])) {
      const splitRow = ln => ln.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
      const headers = splitRow(lines[i]);
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        rows.push(splitRow(lines[i]));
        i++;
      }
      const tidx = tablesOut.length;
      tablesOut.push(`<div class="md-table-wrap"><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${headers.map((_, ci) => `<td>${r[ci] || ""}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      res.push(`@@TBL_${tidx}@@`);
    } else {
      res.push(lines[i]);
      i++;
    }
  }
  return res.join("\n");
}

function renderMd(md) {
  const blocks = [], tables = [];
  let s = String(md || "").replace(/```([\w-]*)\n([\s\S]*?)```/g, (_, lang, code) => { const i = blocks.length; blocks.push({ lang: lang || "text", code }); return `@@CB_${i}@@`; });
  s = esc(s);
  s = parseMarkdownTables(s, tables);
  s = s
    .replace(/^### (.*)$/gm, "<h3>$1</h3>").replace(/^## (.*)$/gm, "<h2>$1</h2>").replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/^&gt; (.*)$/gm, "<blockquote>$1</blockquote>").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/`([^`]+)`/g, '<code class="ic">$1</code>')
    .replace(/^\s*[-*] (.*)$/gm, "<li>$1</li>").replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>").replace(/<\/ul>\s*<ul>/g, "")
    .replace(/\n{2,}/g, "</p><p>");
  s = `<p>${s.replace(/\n/g, "<br>")}</p>`;
  tables.forEach((tHtml, i) => { s = s.replace(`@@TBL_${i}@@`, tHtml); });
  blocks.forEach((b, i) => {
    if (b.lang.toLowerCase() === "apiai-builder") {
      const card = renderBuilderPreviewCard(b.code);
      if (card) { s = s.replace(`@@CB_${i}@@`, card); return; }
    }
    if (b.lang.toLowerCase() === "apiai-office") {
      const oCard = renderOfficeArtifactCard(b.code);
      if (oCard) { s = s.replace(`@@CB_${i}@@`, oCard); return; }
    }
    if (b.lang.toLowerCase() === "apiai-signal" && typeof window.renderTradingSignalCard === "function") {
      const sCard = window.renderTradingSignalCard(b.code);
      if (sCard) { s = s.replace(`@@CB_${i}@@`, sCard); return; }
    }
    const enc = encodeURIComponent(b.code), cid = "cb-" + (++cbSeq), canPrev = ["html", "svg"].includes(b.lang.toLowerCase());
    s = s.replace(`@@CB_${i}@@`, `<div class="code-box"><div class="code-top">
      <button type="button" class="tap" style="display:inline-flex;align-items:center;gap:6px;color:var(--ink-2);font-size:12.5px;" onclick="toggleAcc('${cid}','ch-${cid}')">
        <span id="ch-${cid}" class="chev rot"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></span><span>${esc(b.lang)}</span></button>
      <div class="code-btns">
        ${canPrev ? `<button type="button" class="code-icon-btn tap" onclick="openCanvasCode(decodeURIComponent('${enc}'),'Canvas')" aria-label="Xem trước"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><polygon points="6 4 20 12 6 20 6 4"/></svg></button>` : ""}
        <button type="button" class="code-icon-btn tap" onclick="copyCodeBtn(this,decodeURIComponent('${enc}'))" aria-label="Sao chép"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
      </div></div><div id="${cid}" class="acc-wrap open"><div class="acc-inner"><pre><code>${esc(b.code)}</code></pre></div></div></div>`);
  });
  return s;
}
function copyCodeBtn(btn, txt) { haptic("ok"); copyText(txt, "Đã sao chép"); const orig = btn.innerHTML; btn.classList.add("copied"); btn.innerHTML = ICON_CHECK; setTimeout(() => { btn.classList.remove("copied"); btn.innerHTML = orig; }, 1300); }

function renderMessages() {
  const hero = document.getElementById("empty-hero"), list = document.getElementById("messages"), chat = S.chats.find(c => c.id === S.activeChatId);
  const activeTutor = S.activeTutorId ? S.tutors.find(t => t.id === S.activeTutorId) : null;
  const tutorCardHtml = activeTutor ? buildTutorProactiveBanner(activeTutor) : "";
  const resumeHtml = buildPendingResumeBanner();
  const compactHtml = buildCompactSummaryCard(chat);

  if (!chat || !chat.messages.length) {
    hero.style.display = (tutorCardHtml || resumeHtml || compactHtml) ? "none" : "flex";
    list.innerHTML = compactHtml + resumeHtml + tutorCardHtml;
    return;
  }
  hero.style.display = "none";
  list.innerHTML = compactHtml + resumeHtml + tutorCardHtml + chat.messages.map(m => {
    if (m.role === "user") {
      const thumbs = (m.atts || []).filter(a => a.dataUrl).map(a => `<img class="user-thumb-img" src="${a.dataUrl}" onclick="openLightbox('${a.dataUrl}')" />`).join("");
      const docs = (m.atts || []).filter(a => a.type === "file").map(a => `<span class="cite-pill">${esc(a.name)}</span>`).join("");
      const saveBar = m.suggestSaveTutorId ? `<div class="tutor-auto-save-bar">
        <span>Phát hiện kiến thức mới trên lớp — lưu vào Kho Gia sư?</span>
        <div style="display:flex;gap:6px;">
          <button type="button" class="btn-p tap" style="height:28px;padding:0 10px;font-size:11.5px;" onclick="saveMessageToTutorNotes('${m.suggestSaveTutorId}','${m.id}')">Lưu ngay</button>
          <button type="button" class="mini-act tap" onclick="dismissTutorSuggest('${m.id}')">${ICON_X}</button>
        </div></div>` : "";
      return `<div class="msg-row user" data-msg-id="${m.id}">${thumbs ? `<div class="user-thumbs">${thumbs}</div>` : ""}${docs ? `<div class="user-thumbs">${docs}</div>` : ""}${m.text ? `<div class="user-bubble lg-card">${esc(m.text)}</div>` : ""}${!S.streaming && m.text ? `<div class="user-msg-acts"><button type="button" class="mini-act tap" onclick="editUserMessage('${m.id}')" aria-label="Sửa tin nhắn">${ICON_EDIT}</button></div>` : ""}${saveBar}</div>`;
    }
    if (m.compare && typeof window.renderCompareMessageCard === "function") {
      return window.renderCompareMessageCard(m);
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
        <button class="btn-s tap" style="height:34px;font-size:12.5px;" onclick="mergeReplyIntoSharedContext('${m.id}')">Đồng bộ boi-canh.md</button>
      </div>` : "";

      return `<div class="msg-row assistant"><div class="pipeline-wrap">
        <div class="ai-meta-line">
          <span class="ai-logo-badge"><img class="brand-mark" src="logo-mark.png" alt="" width="15" height="15" /></span>
          <span class="meta-pill">${esc(m.modelLabel || "Đội ngũ AI")}</span>
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
    const thSec = m.thinkMs ? Math.max(1, Math.round(m.thinkMs / 1000)) : 0;
    const thTitle = m.streaming && !m.text ? "Đang tư duy..." : (thSec ? `Đã tư duy (${thSec}s)` : "Quá trình tư duy");
    const showTh = Boolean(m.thinking);
    const thOpen = m.streaming && !m.text && showTh;
    const thinkBlock = `<div id="thb-${m.id}" class="think-box ${m.streaming && !m.text ? "thinking-active" : ""}" style="display:${showTh ? "block" : "none"};">
      <button type="button" class="think-head tap-soft" onclick="toggleAcc('tha-${m.id}','thc-${m.id}')">
        <span class="think-head-l">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l2.5 1.5"/></svg>
          <span id="thl-${m.id}">${esc(thTitle)}</span>
        </span>
        <span id="thc-${m.id}" class="chev ${thOpen ? "rot" : ""}"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></span>
      </button>
      <div id="tha-${m.id}" class="acc-wrap ${thOpen ? "open" : ""}">
        <div class="acc-inner"><div id="th-${m.id}" class="think-body">${esc(m.thinking || "")}</div></div>
      </div>
    </div>`;
    const wavy = m.streaming && !m.text ? `<div id="wv-${m.id}" class="wavy-box"><svg class="wavy-svg" viewBox="0 0 104 16"><path class="wavy-path" d="M0 8 Q6.5 1 13 8 T26 8 T39 8 T52 8 T65 8 T78 8 T91 8 T104 8"/></svg><span>Đang suy luận (${esc(THINK_LEVELS.find(x => x.id === (m.thinkingLevel || S.cfg.thinkingLevel))?.title || "Cao")})...</span></div>` : "";
    return `<div class="msg-row assistant" data-msg-id="${m.id}"><div class="ai-block">
      <div class="ai-meta-line">
        <span class="ai-logo-badge"><img class="brand-mark" src="logo-mark.png" alt="" width="14" height="14" /></span>
        <span class="meta-pill">${esc(m.modelLabel || "API AI")}</span>
        ${m.goodCheckpoint ? `<span class="checkpoint-badge">✓ Mốc tốt</span>` : ""}
        ${(S.user?.role === "admin" && m.slot) ? `<span class="meta-pill nowrap-pill">${esc(m.slot)}</span>` : ""}
      </div>
      ${renderToolStepsBlock(m)}
      ${thinkBlock}${wavy}<div class="md ${m.streaming ? "streaming-live" : ""}" id="md-${m.id}">${m.text ? renderMd(m.text) : ""}</div>
      ${renderSourcesStrip(m.sources)}
      ${(!m.streaming && m.fetchedRepoUrl) ? `<div class="img-act-row">
        <button type="button" class="btn-blue tap" style="height:32px;font-size:12px;" onclick="quickImportRepoFromLink('${esc(m.fetchedRepoUrl)}')">Lưu Repo vào Skills</button>
        <button type="button" class="btn-s tap" style="height:32px;font-size:12px;" onclick="sendRepoTaskToTeam('${esc(m.fetchedRepoUrl)}','${m.id}')">Chuyển cho Đội ngũ AI</button>
      </div>` : ""}
      ${m.citedFile ? `<span class="cite-pill">${esc(m.citedFile)}</span>` : ""}
      ${m.genImg ? `<img class="gen-img" src="${m.genImg}" onclick="openLightbox('${m.genImg}','${esc(m.downloadName || "api-ai-image.png")}')" />
        <div class="img-act-row">
          <button type="button" class="btn-p tap" style="height:32px;font-size:12px;padding:0 12px;" onclick="saveGeneratedImageFile('${m.id}')">Lưu ${esc(m.downloadName || "ảnh.png")}</button>
          ${m.imagePrompt ? `<button type="button" class="btn-s tap" style="height:32px;font-size:12px;" onclick="S.activeTool='image';sendPrompt(decodeURIComponent('${encodeURIComponent(m.imagePrompt)}'))">Tạo lại</button>
          <button type="button" class="btn-s tap" style="height:32px;font-size:12px;" onclick="openEditImagePromptModal(decodeURIComponent('${encodeURIComponent(m.imagePrompt)}'))">Sửa mô tả</button>` : ""}
        </div>` : ""}
      ${(!m.streaming && m.isPlanLock) ? `<div class="plan-gate-bar">
        <div style="font-size:13px;color:var(--info-ink);font-weight:500;">Chế độ Lập kế hoạch trước · Chưa sửa code</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" class="btn-p tap" style="height:36px;font-size:13px;flex:1;" onclick="approvePlanAndExecute('${m.id}')">Duyệt kế hoạch &amp; Bắt đầu làm</button>
          <button type="button" class="btn-s tap" style="height:36px;font-size:13px;" onclick="refinePlanPrompt()">Chỉnh sửa kế hoạch</button>
        </div>
      </div>` : ""}
      ${!m.streaming ? `<div class="ai-actions"><div class="ai-act-left">
        <button class="act-icon tap ${m.feedback==="up"?"active-like":""}" onclick="rateMsg('${m.id}','up')" aria-label="Thích"><svg fill="${m.feedback==="up"?"currentColor":"none"}" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg></button>
        <button class="act-icon tap ${m.feedback==="down"?"active-dislike":""}" onclick="rateMsg('${m.id}','down')" aria-label="Không thích"><svg fill="${m.feedback==="down"?"currentColor":"none"}" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 14V2M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg></button>
        <button class="act-icon tap" onclick="shareMsg('${m.id}')" aria-label="Chia sẻ"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4m0-11-6.8 4"/></svg></button>
        <button class="act-icon tap" onclick="copyCodeBtn(this,getMsgText('${m.id}'))" aria-label="Sao chép"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
        <button type="button" class="act-icon tap" onclick="regenerateReply('${m.id}')" aria-label="Tạo lại"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg></button>
        <button type="button" class="act-icon tap ${m.goodCheckpoint?"bookmarked":""}" onclick="toggleMessageBookmark('${m.id}')" aria-label="Ghim mốc tốt" title="Ghim mốc tốt cho /rewind"><svg fill="${m.goodCheckpoint?"currentColor":"none"}" stroke="currentColor" viewBox="0 0 24 24"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"/></svg></button>
        <button type="button" class="act-icon tap" onclick="quoteReplyMessage('${m.id}')" aria-label="Trích dẫn hỏi sâu" title="Trích dẫn hỏi sâu"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1Zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1Z"/></svg></button>
        <button class="act-icon tap" onclick="openMsgMore('${m.id}')" aria-label="Thêm"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.1"/><circle cx="12" cy="12" r="1.1"/><circle cx="19" cy="12" r="1.1"/></svg></button>
      </div><button class="act-icon tap ${S.speakingMsgId===m.id?"speaking":""}" onclick="toggleSpeak('${m.id}')" aria-label="Đọc to"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg></button></div>` : ""}
    </div></div>`;
  }).join("");
  typesetMathInElement(list);
  if (typeof window.updateContextGuardBar === "function") window.updateContextGuardBar();
}
function getMsgText(id) { return S.chats.find(c => c.id === S.activeChatId)?.messages.find(m => m.id === id)?.text || ""; }
function rateMsg(id, d) { haptic("tap"); const m = S.chats.find(x => x.id === S.activeChatId)?.messages.find(x => x.id === id); if (!m) return; m.feedback = m.feedback === d ? null : d; renderMessages(); }
function shareMsg(id) { const t = getMsgText(id); if (navigator.share) navigator.share({ title: "API AI", text: t }).catch(() => {}); else copyText(t, "Đã sao chép"); }
function openMsgMore(id) {
  const tBtn = S.activeTutorId
    ? `<button type="button" class="s-row tap-soft" onclick="closeModal();saveReplyToTutorMistake('${S.activeTutorId}','${id}')"><span>Lưu vào Sổ Lỗi Sai (Ôn lại 1/3/7 ngày)</span></button>
       <button type="button" class="s-row tap-soft" onclick="closeModal();saveMessageToTutorNotes('${S.activeTutorId}','${id}')"><span>Lưu vào Kho kiến thức Gia sư</span></button>`
    : "";
  openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:10px;">Tùy chọn phản hồi</h3>
    <button type="button" class="s-row tap-soft" onclick="closeModal();mergeReplyIntoSharedContext('${id}')"><span>Đồng bộ vào hồ sơ boi-canh.md (GPT & Claude dùng chung)</span></button>
    <button type="button" class="s-row tap-soft" onclick="closeModal();forkChatFromMessage('${id}')"><span>Rẽ nhánh cuộc trò chuyện từ tin nhắn này</span></button>
    <button type="button" class="s-row tap-soft" onclick="closeModal();runSimplifyCode('${id}')"><span>Đơn giản hóa code (/simplify)</span></button>
    ${tBtn}
    <button type="button" class="s-row tap-soft" onclick="closeModal();openCanvasCode(getMsgText('${id}'),'Canvas')"><span>Mở trong Canvas</span></button>
    <button type="button" class="s-row tap-soft" onclick="closeModal();saveLib('doc','Ghi chú API AI',getMsgText('${id}'));showToast('Đã lưu Thư viện')"><span>Lưu vào Thư viện</span></button>
    <button type="button" class="s-row tap-soft" onclick="closeModal();exportMsgFile('${id}','md')"><span>Xuất phản hồi ra file .md</span></button>
    <button type="button" class="s-row tap-soft" onclick="closeModal();exportMsgFile('${id}','pdf')"><span>Xuất file PDF thật (.pdf)</span></button>
    <button type="button" class="s-row tap-soft" onclick="closeModal();addQuickMemory(getMsgText('${id}').slice(0,220))"><span>Lưu đoạn này vào Trí nhớ</span></button>`);
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
    const fbCnt = (data.fallbackAlerts || []).length;
    const totBadge = pCnt + fbCnt;
    const pill = document.getElementById("admin-pending-pill"), dot = document.getElementById("menu-badge-dot");
    pill.style.display = totBadge ? "inline-block" : "none"; pill.textContent = String(totBadge);
    dot.classList.toggle("show", totBadge > 0); dot.textContent = String(totBadge);
    const tc = document.getElementById("tab-rst-count"); if (tc) tc.textContent = pCnt ? `(${pCnt})` : "";
    const wv = document.getElementById("admin-worker-ver");
    if (wv) {
      if (data.backendVersion === "4.0") {
        wv.innerHTML = `<span style="color:var(--ok-ink);">Worker v4.0</span>`;
      } else {
        wv.innerHTML = `<span style="color:var(--warn-ink);">Worker cũ (cần Deploy v4.0)</span>`;
      }
    }
    if (!silent) renderAdminBody();
  } catch (e) { if (!silent) showToast(e.message); }
}
function setAdminTab(t) { haptic("tap"); S.adminTab = t; document.querySelectorAll("[data-adtab]").forEach(b => b.classList.toggle("active", b.dataset.adtab === t)); renderAdminBody(); }

function renderAdminBody() {
  const d = S.adminData, box = document.getElementById("admin-body");
  if (!d) { box.innerHTML = `<div class="card-item lg-card" style="display:flex;flex-direction:column;gap:10px;"><div class="skel-line" style="width:45%;"></div><div class="skel-line" style="width:92%;"></div><div class="skel-line" style="width:74%;"></div></div>`; return; }

  // TAB 0: OVERVIEW KPI DASHBOARD (6C)
  if (S.adminTab === "overview") {
    const an = d.analytics || {};
    const topMods = an.topModels || [];
    box.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card"><div class="kpi-lbl">User hoạt động hôm nay</div><div class="kpi-val num">${Number(an.activeUsersToday || 0)}</div></div>
        <div class="kpi-card"><div class="kpi-lbl">Tin nhắn hôm nay</div><div class="kpi-val num">${Number(an.totalMsgsToday || 0).toLocaleString("vi-VN")}</div></div>
        <div class="kpi-card"><div class="kpi-lbl">Token tiêu thụ hôm nay</div><div class="kpi-val num" style="color:var(--accent-ink);">${Math.round(Number(an.totalTokensToday || 0) / 1000).toLocaleString("vi-VN")}K</div></div>
        <div class="kpi-card"><div class="kpi-lbl">Key đang hoạt động</div><div class="kpi-val num" style="color:var(--ok-ink);">${Number(an.activeKeysCount || 0)}</div></div>
      </div>
      <div class="card-item lg-card">
        <strong style="display:block;font-size:14.5px;margin-bottom:8px;">Top Model dùng nhiều nhất hôm nay</strong>
        ${topMods.length ? topMods.map(tm => `<div class="mem-chip-row" style="margin-bottom:6px;">
          <span style="font-family:var(--font-mono);font-size:12.5px;">${esc(tm.model_id)}</span>
          <span class="num" style="color:var(--accent-ink);">${Number(tm.reqs || 0)} lượt · ${Math.round(Number(tm.toks || 0) / 1000).toLocaleString("vi-VN")}K tok</span>
        </div>`).join("") : `<div style="font-size:12.5px;color:var(--ink-3);">Chưa có dữ liệu sử dụng hôm nay.</div>`}
      </div>`;
    return;
  }

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
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin:12px 0 4px 2px;">
              <label class="f-lbl" style="margin:0;">Tin nhắn / ngày</label>
              <label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--accent-ink);cursor:pointer;">
                <input id="tl-unlim" type="checkbox" ${(lim.unlimited_msgs || Number(lim.daily_msgs) < 0) ? "checked" : ""} onchange="const ip=document.getElementById('tl-msgs');ip.disabled=this.checked;ip.value=this.checked?'':'500';ip.placeholder=this.checked?'Vô hạn':'Số tin/ngày';" style="width:15px;height:15px;accent-color:var(--accent);" />
                <span>Vô hạn</span>
              </label>
            </div>
            <input id="tl-msgs" type="number" class="field num" ${(lim.unlimited_msgs || Number(lim.daily_msgs) < 0) ? 'disabled placeholder="Vô hạn" value=""' : `value="${lim.daily_msgs ?? 25}" placeholder="Số tin/ngày"`} />
          </div>
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
        <div class="s-row" style="cursor:default;"><span>Chế độ Dây chuyền 4-Agent Lập trình</span><span class="tag-st ${(t==="pro_max"||t==="ultra")?"st-active":"st-revoked"}">${(t==="pro_max"||t==="ultra")?"Cố định mở (Pro Max+)":"Cố định khóa"}</span></div>
        <div class="s-row" onclick="this.querySelector('.sw').classList.toggle('on')"><span>Cài & Cập nhật GitHub Repo vào Skills</span><div id="tl-gh" class="sw ${lim.allow_github_skills?"on":""}"></div></div>
        <div class="s-row" onclick="this.querySelector('.sw').classList.toggle('on')"><span>Office Studio (PowerPoint, Word, Excel, PDF)</span><div id="tl-office" class="sw ${lim.allow_office_studio!==false && t!=="classic" || lim.allow_office_studio?"on":""}"></div></div>
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
            <button class="btn-s tap" onclick="adminCheckProviderUsage('${esc(p.id)}')">Xem số dư Token</button>
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
          Hôm nay: <b class="num">${u.daily_msg_count}/${(u.role==="admin" || Number(u.daily_msg_limit) < 0) ? "Vô hạn" : (u.daily_msg_limit ?? "?")}</b> tin · <b class="num">${Math.round((u.daily_token_count||0)/1000)}K/${u.role==="admin"?"∞":Math.round((u.daily_token_limit||0)/1000)+"K"}</b> token${u.bonus_tokens ? ` · Dự phòng: <b class="num" style="color:var(--ok-ink);">+${Math.round(u.bonus_tokens/1000).toLocaleString("vi-VN")}K</b>` : ""}
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">
          <button type="button" class="btn-blue tap" onclick="adminBonusTokensModal('${esc(u.email)}',${Number(u.bonus_tokens||0)})">+ Cộng Token</button>
          <button type="button" class="btn-s tap" onclick="adminPromptChangePass('${esc(u.email)}')">Đổi mật khẩu</button>
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

  // TAB 6: SYSTEM NOTICE, MAINTENANCE, CONTACTS/PRICES (5BC) & SECURITY LOGS (3B)
  if (S.adminTab === "system") {
    const n = d.config.system_notice || {}, m = d.config.maintenance || {}, ct = d.config.contacts || {}, pr = ct.plan_prices || {};
    const logs = d.securityLogs || [];
    box.innerHTML = `
      <div class="card-item lg-card">
        <div class="s-row" style="padding:0 0 8px;" onclick="document.getElementById('sy-n-on').classList.toggle('on')">
          <strong>Thông báo toàn hệ thống (App Notice)</strong>
          <div id="sy-n-on" class="sw ${n.enabled?"on":""}"></div>
        </div>
        <label class="f-lbl">Nội dung thông báo</label>
        <textarea id="sy-n-txt" class="field" rows="2" placeholder="VD: Đã nâng cấp API AI v3.3!">${esc(n.text || "")}</textarea>
        <label class="f-lbl">Mức độ</label>
        <select id="sy-n-lvl" class="field"><option value="info" ${n.level!=="warn"?"selected":""}>Thông tin (Xanh)</option><option value="warn" ${n.level==="warn"?"selected":""}>Cảnh báo (Vàng)</option></select>
      </div>

      <div class="card-item lg-card">
        <div class="s-row" style="padding:0 0 8px;" onclick="document.getElementById('sy-m-on').classList.toggle('on')">
          <div><strong>Chế độ bảo trì (Chặn user thường)</strong><div style="font-size:12px;color:var(--ink-3);">Admin vẫn đăng nhập và thao tác bình thường</div></div>
          <div id="sy-m-on" class="sw ${m.enabled?"on":""}"></div>
        </div>
        <label class="f-lbl">Thông báo bảo trì</label>
        <textarea id="sy-m-txt" class="field" rows="2">${esc(m.message || "Hệ thống API AI đang bảo trì nâng cấp.")}</textarea>
      </div>

      <div class="card-item lg-card">
        <strong style="display:block;font-size:14.5px;margin-bottom:6px;">Liên hệ cấp Key & Bảng giá (Ẩn SĐT trong APK)</strong>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div><label class="f-lbl">Tên Telegram</label><input id="sy-tg-h" class="field" value="${esc(ct.telegram_handle || "@BangTechnology")}" /></div>
          <div><label class="f-lbl">Link Telegram</label><input id="sy-tg-u" class="field" value="${esc(ct.telegram_url || "https://t.me/BangTechnology")}" /></div>
        </div>
        <label class="f-lbl">Link Zalo chuyển hướng (/go/zalo)</label>
        <input id="sy-zalo-u" class="field" value="${esc(ct.zalo_url || "")}" placeholder="https://zalo.me/..." />
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px;">
          <div><label class="f-lbl">Giá Classic</label><input id="sy-pr-c" class="field" value="${esc(pr.classic || "9K/tuần · 19K/tháng")}" /></div>
          <div><label class="f-lbl">Giá Pro</label><input id="sy-pr-p" class="field" value="${esc(pr.pro || "39K/tháng · 99K/3 tháng")}" /></div>
          <div><label class="f-lbl">Giá Pro Max</label><input id="sy-pr-pm" class="field" value="${esc(pr.pro_max || "79K/tháng · 199K/3 tháng")}" /></div>
          <div><label class="f-lbl">Giá Ultra</label><input id="sy-pr-u" class="field" value="${esc(pr.ultra || "139K/tháng · 890K/năm")}" /></div>
        </div>
      </div>

      <div class="card-item lg-card">
        <strong style="display:block;font-size:14.5px;margin-bottom:6px;">Tìm kiếm Web thời gian thực (Live Web Search)</strong>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div>
            <label class="f-lbl">Bộ máy tìm kiếm</label>
            <select id="sy-sr-eng" class="field">
              <option value="duckduckgo" ${(d.config.search_config?.engine||"duckduckgo")==="duckduckgo"?"selected":""}>DuckDuckGo (Miễn phí)</option>
              <option value="tavily" ${d.config.search_config?.engine==="tavily"?"selected":""}>Tavily API</option>
              <option value="brave" ${d.config.search_config?.engine==="brave"?"selected":""}>Brave Search API</option>
            </select>
          </div>
          <div>
            <label class="f-lbl">API Key tìm kiếm (nếu dùng Tavily/Brave)</label>
            <input id="sy-sr-key" type="password" class="field" value="${esc(d.config.search_config?.api_key || "")}" placeholder="Để trống nếu dùng DuckDuckGo" />
          </div>
        </div>
      </div>

      <button type="button" class="btn-p tap" style="width:100%;margin-bottom:14px;" onclick="adminSaveSystem()">Lưu cấu hình hệ thống</button>

      <div class="card-item lg-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <strong style="font-size:14.5px;">Nhật ký chặn dò API (${logs.length})</strong>
          ${logs.length ? `<button type="button" class="btn-danger tap" style="height:30px;font-size:12px;" onclick="adminClearSecurityLogs()">Xóa nhật ký</button>` : ""}
        </div>
        ${logs.length ? logs.map(l => `<div style="padding:8px 0;border-bottom:1px solid var(--rim);font-size:12.5px;">
          <div style="display:flex;justify-content:space-between;gap:6px;flex-wrap:wrap;">
            <strong>${esc(l.email)}</strong>
            <span class="tag-st st-revoked">${esc(l.probe_type)}</span>
          </div>
          <div style="color:var(--ink-2);margin-top:3px;">${esc(l.snippet)}</div>
          <div style="color:var(--ink-3);font-size:11px;margin-top:2px;">${new Date(l.created_at).toLocaleString("vi-VN")}</div>
        </div>`).join("") : `<div style="font-size:12.5px;color:var(--ink-3);">Chưa ghi nhận hành vi dò API/Prompt nào.</div>`}
      </div>`;
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
  const unlim = document.getElementById("tl-unlim")?.checked || false;
  const tier_limits = {
    [tier]: {
      daily_msgs: unlim ? -1 : Math.max(0, pInt("tl-msgs", 25)),
      unlimited_msgs: unlim,
      daily_tokens: Math.max(0, pInt("tl-toks", 35000)),
      max_devices: Math.max(1, pInt("tl-devs", 1)),
      allowed_models: checkedModels,
      allow_four_agent: (tier === "pro_max" || tier === "ultra"),
      allow_github_skills: document.getElementById("tl-gh").classList.contains("on"),
      allow_office_studio: document.getElementById("tl-office")?.classList.contains("on") || false,
      allow_hd_vision: document.getElementById("tl-hd").classList.contains("on"),
      allow_image_gen: document.getElementById("tl-img").classList.contains("on"),
      allow_deep_research: document.getElementById("tl-dr").classList.contains("on"),
      allow_canvas: document.getElementById("tl-cv").classList.contains("on")
    }
  };
  const r = await apiFetch("/admin/config/save", { method: "POST", body: { tier_limits } });
  if (r.ok) { haptic("ok"); showToast(`Đã lưu quyền hạng ${TIER_LABELS[tier]}`, "ok"); loadAdminData(); }
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
function formatFostaUsageCard(k) {
  // Support both parsed JSON from Worker v3.2 AND raw JSON text from older Worker v3.0/v3.1!
  let obj = k.parsed || k.data || null;
  if (!obj && typeof k.text === "string" && k.text.trim().startsWith("{")) {
    try { obj = JSON.parse(k.text); } catch {}
  }
  const q = obj?.quota;
  if (!q) {
    return `<div class="card-item lg-card">
      <div style="display:flex;justify-content:space-between;align-items:center;"><strong>Key #${k.slot}</strong><span class="tag-quiet">${esc(k.masked)}</span></div>
      <div style="font-size:12.5px;color:var(--ink-2);margin-top:6px;white-space:pre-wrap;">${esc(k.text || k.error || "Không có dữ liệu số dư.")}</div>
    </div>`;
  }
  const limit = Number(q.limit || 0);
  const used = Number(q.used || 0);
  const remaining = q.remaining !== undefined ? Number(q.remaining) : Math.max(0, limit - used);
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 10000) / 100) : 0;
  const barCls = pct >= 90 ? "danger" : (pct >= 70 ? "warn" : "");
  const todayP = (obj.periods || []).find(p => p.period === "today");
  const todayReq = todayP ? Number(todayP.requests || 0) : 0;
  const todayCharged = todayP ? Math.round(Number(todayP.charged || 0)) : 0;
  const keyName = obj.key?.name ? ` · ${obj.key.name}` : "";
  const isAct = obj.key?.isActive !== false;
  const daysLeft = q.daysLeft && Number.isFinite(Number(q.daysLeft)) ? Math.round(Number(q.daysLeft)) : null;

  return `<div class="card-item lg-card">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap;">
      <strong style="font-size:14px;">Key #${k.slot}${esc(keyName)}</strong>
      <span class="tag-st ${isAct ? "st-active" : "st-revoked"}">${isAct ? "Đang hoạt động" : "Ngừng"}</span>
    </div>
    <div style="font-size:11.5px;font-family:var(--font-mono);color:var(--ink-3);margin-top:2px;">${esc(obj.key?.masked || k.masked)}</div>

    <div style="margin-top:10px;">
      <div style="font-size:12px;color:var(--ink-2);">Số dư token còn lại</div>
      <div class="num" style="font-size:22px;font-weight:500;color:var(--ok-ink);letter-spacing:-0.02em;margin-top:2px;">${remaining.toLocaleString("vi-VN")} <span style="font-size:13px;color:var(--ink-2);font-weight:400;">token</span></div>
    </div>

    <div class="tok-bar-track"><div class="tok-bar-fill ${barCls}" style="width:${Math.max(2, pct)}%;"></div></div>
    <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--ink-3);" class="num">
      <span>Đã dùng: ${used.toLocaleString("vi-VN")} (${pct}%)</span>
      <span>Tổng: ${limit.toLocaleString("vi-VN")}</span>
    </div>

    <div class="tok-stat-grid">
      <div class="tok-stat-cell">
        <div class="tok-stat-lbl">Hôm nay</div>
        <div class="tok-stat-val num">${todayCharged.toLocaleString("vi-VN")} tok (${todayReq} lượt)</div>
      </div>
      <div class="tok-stat-cell">
        <div class="tok-stat-lbl">Trung bình / Dự kiến</div>
        <div class="tok-stat-val num">${Math.round(Number(q.avgPerDay || 0)).toLocaleString("vi-VN")}/ngày${daysLeft !== null ? ` · ~${daysLeft.toLocaleString("vi-VN")}d` : ""}</div>
      </div>
    </div>
  </div>`;
}

async function adminCheckProviderUsage(providerId) {
  openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:8px;">Số dư Token API Key</h3><div id="pu-out" style="font-size:13px;color:var(--ink-2);">Đang lấy số dư thực tế...</div><div style="display:flex;justify-content:flex-end;margin-top:12px;"><button type="button" class="btn-p tap" onclick="closeModal()">Đóng</button></div>`);
  try {
    const r = await apiFetch("/admin/providers/usage", { method: "POST", body: { providerId } }), d = await r.json();
    if (!r.ok) throw new Error(d.error || "Không kiểm tra được số dư");
    document.getElementById("pu-out").innerHTML = (d.keys || []).map(formatFostaUsageCard).join("") || "Không có API Key nào.";
  } catch (e) {
    document.getElementById("pu-out").innerHTML = `<div style="color:var(--danger-ink);">Lỗi: ${esc(e.message)}</div>`;
  }
}

async function openUserTokenBalanceModal() {
  haptic("tap");
  openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:8px;">Số dư Token của bạn</h3>
    <div id="utb-body" style="font-size:13px;color:var(--ink-2);">Đang đồng bộ số dư mới nhất...</div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
      <button type="button" class="btn-p tap" onclick="closeModal()">Đóng</button>
    </div>`);
  try {
    const r = await apiFetch("/auth/me");
    const d = await r.json();
    if (r.ok && d.user) { S.user = d.user; syncAccountUI(); }
  } catch {}

  const u = S.user;
  const el = document.getElementById("utb-body");
  if (!u || !el) return;
  if (u.role === "admin") {
    el.innerHTML = `<div class="card-item lg-card" style="margin:0;">
      <div style="font-size:12px;color:var(--ink-2);">Tài khoản Quản trị viên</div>
      <div style="font-size:20px;font-weight:500;color:var(--ok-ink);margin:4px 0 8px;">Không giới hạn Token & Lượt chat</div>
      <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:10px;">Để xem số dư thật của các API Key Fosta / Fosta VIP, bấm nút bên dưới:</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button type="button" class="btn-blue tap" style="flex:1;" onclick="adminCheckProviderUsage('fosta')">Số dư Fosta</button>
        <button type="button" class="btn-s tap" style="flex:1;" onclick="adminCheckProviderUsage('fosta_vip')">Số dư Fosta VIP</button>
      </div>
    </div>`;
    return;
  }

  const limitTok = Number(u.limits?.daily_tokens || 0);
  const usedTok = Number(u.dailyTokens || 0);
  const remTok = Math.max(0, limitTok - usedTok);
  const pct = limitTok > 0 ? Math.min(100, Math.round((usedTok / limitTok) * 10000) / 100) : 0;
  const barCls = pct >= 90 ? "danger" : (pct >= 70 ? "warn" : "");
  const isUnlimMsgs = Boolean(u.limits?.unlimited_msgs) || Number(u.limits?.daily_msgs) < 0;
  const msgMax = isUnlimMsgs ? "Vô hạn" : `${Number(u.limits?.daily_msgs || 0).toLocaleString("vi-VN")} tin`;
  const msgRem = isUnlimMsgs ? "Vô hạn" : `${Math.max(0, Number(u.limits?.daily_msgs || 0) - Number(u.dailyMsgs || 0)).toLocaleString("vi-VN")} tin`;

  el.innerHTML = `<div class="card-item lg-card" style="margin:0;">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
      <span style="font-size:12.5px;color:var(--ink-2);">Gói hiện tại</span>
      <span class="tag-st tier-${esc(u.keyTier || "classic")}">${esc(u.planLabel || "Chưa kích hoạt")}</span>
    </div>
    <div style="margin-top:10px;">
      <div style="font-size:12px;color:var(--ink-2);">Token còn lại hôm nay</div>
      <div class="num" style="font-size:24px;font-weight:500;color:var(--ok-ink);letter-spacing:-0.02em;margin-top:2px;">${remTok.toLocaleString("vi-VN")} <span style="font-size:13px;color:var(--ink-2);font-weight:400;">token</span></div>
      ${Number(u.bonusTokens || 0) > 0 ? `<div class="num" style="font-size:12.5px;color:var(--accent-ink);margin-top:3px;">+ Token dự phòng (Add-on): <b>${Number(u.bonusTokens).toLocaleString("vi-VN")} token</b></div>` : ""}
    </div>
    <div class="tok-bar-track"><div class="tok-bar-fill ${barCls}" style="width:${Math.max(2, pct)}%;"></div></div>
    <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--ink-3);" class="num">
      <span>Đã dùng: ${usedTok.toLocaleString("vi-VN")} (${pct}%)</span>
      <span>Ngân sách: ${limitTok.toLocaleString("vi-VN")}</span>
    </div>
    <div class="tok-stat-grid">
      <div class="tok-stat-cell">
        <div class="tok-stat-lbl">Lượt tin nhắn còn lại</div>
        <div class="tok-stat-val num">${msgRem}</div>
      </div>
      <div class="tok-stat-cell">
        <div class="tok-stat-lbl">Đã dùng / Hạn mức ngày</div>
        <div class="tok-stat-val num">${Number(u.dailyMsgs || 0)} / ${msgMax}</div>
      </div>
    </div>
    <div style="font-size:11.5px;color:var(--ink-3);margin-top:10px;">Ngân sách token tự động làm mới vào 00:00 mỗi ngày (giờ Việt Nam).</div>
  </div>`;
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
  const contacts = {
    telegram_handle: document.getElementById("sy-tg-h").value.trim() || "@BangTechnology",
    telegram_url: document.getElementById("sy-tg-u").value.trim() || "https://t.me/BangTechnology",
    zalo_url: document.getElementById("sy-zalo-u").value.trim(),
    plan_prices: {
      classic: document.getElementById("sy-pr-c").value.trim(),
      pro: document.getElementById("sy-pr-p").value.trim(),
      pro_max: document.getElementById("sy-pr-pm").value.trim(),
      ultra: document.getElementById("sy-pr-u").value.trim()
    }
  };
  const search_config = { engine: document.getElementById("sy-sr-eng")?.value || "duckduckgo", api_key: document.getElementById("sy-sr-key")?.value.trim() || "" };
  const r = await apiFetch("/admin/config/save", { method: "POST", body: { system_notice, maintenance, contacts, search_config } });
  if (r.ok) { applySystemMeta({ notice: system_notice, maintenance }); haptic("ok"); showToast("Đã lưu cài đặt hệ thống", "ok"); loadAdminData(); }
}
async function adminClearSecurityLogs() {
  const r = await apiFetch("/admin/security-logs/clear", { method: "POST" });
  if (r.ok) { haptic("ok"); showToast("Đã xóa nhật ký bảo mật"); loadAdminData(); }
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
  if (mode !== "chat" && mode !== "task") mode = "chat";
  S.cfg.workMode = mode; dbPut("kv", S.cfg);
  const tr = document.getElementById("mode-seg"), th = document.getElementById("mode-thumb");
  tr.querySelectorAll(".seg-btn").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
  const act = tr.querySelector(`.seg-btn[data-mode="${mode}"]`);
  if (act && th) moveSegThumb(th, act);
  renderActiveContextBanner();
  const h = document.getElementById("hero-title");
  const activeTeam = S.activeTeamId ? S.teams.find(t => t.id === S.activeTeamId) : null;
  const activeTutor = S.activeTutorId ? S.tutors.find(t => t.id === S.activeTutorId) : null;
  const txt = activeTeam ? `Đội ngũ ${activeTeam.name} đã sẵn sàng`
    : (activeTutor ? `Gia sư ${activeTutor.name} (${activeTutor.subject})` : (mode === "task" ? "Tôi có thể bắt đầu việc gì cho bạn?" : "Chúng ta nên bắt đầu từ đâu nhỉ?"));
  if (anim) { h.style.opacity = "0"; setTimeout(() => { h.textContent = txt; h.style.opacity = "1"; }, 120); } else h.textContent = txt;
  document.getElementById("prompt-in").placeholder = activeTeam ? `Giao việc cho ${activeTeam.name}...`
    : (activeTutor ? `Hỏi Gia sư ${activeTutor.subject}...` : (mode === "task" ? "Mô tả tác vụ" : "Hỏi API AI"));
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
function switchView(v) {
  haptic("tap");
  document.querySelectorAll(".view").forEach(x => x.classList.remove("active"));
  document.getElementById("view-" + v)?.classList.add("active");
  toggleSidebar(false);
  if (v === "customize") renderSkillsPage();
  if (v === "library") renderLibrary();
  if (v === "import") renderMemoriesPage();
  if (v === "teams") renderTeamsPage();
  if (v === "tutors") renderTutorsPage();
  if (v === "mcp") renderMcpPage();
}

function renderSidebar() { renderNbList(); renderChatsList(); }
function cycleFilter() { const a = ["all", "pinned", "task"], l = { all: "Lịch sử chat", pinned: "Đã ghim", task: "Nhiệm vụ" }; S.filter = a[(a.indexOf(S.filter) + 1) % a.length]; document.getElementById("filter-lbl").textContent = l[S.filter]; renderChatsList(); }
function renderChatsList() {
  const q = (document.getElementById("sb-search")?.value || "").toLowerCase();
  let items = [...S.chats];
  if (S.filter === "pinned") items = items.filter(c => c.pinned);
  if (S.filter === "task") items = items.filter(c => c.mode === "task");
  if (q) items = items.filter(c => (c.title || "").toLowerCase().includes(q));
  items.sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || ((b.updatedAt || 0) - (a.updatedAt || 0)));
  document.getElementById("sb-chats-list").innerHTML = items.map((c, idx) => `
    <div class="chat-item stagger-item ${c.id===S.activeChatId?"active":""}" style="--stagger-i:${idx}" onclick="openChat('${c.id}')">
      <span class="chat-item-title">${esc(c.title)}</span>
      <button class="mini-act tap ${c.pinned?"pinned":""}" onclick="event.stopPropagation();pinChat('${c.id}')" aria-label="Ghim">${ICON_PIN}</button>
      <button class="mini-act tap" onclick="event.stopPropagation();delChat('${c.id}')" aria-label="Xóa">${ICON_X}</button>
    </div>`).join("") || `<div style="padding:8px 12px;font-size:12.5px;color:var(--ink-3);">Chưa có đoạn chat</div>`;
}
function startNewChat() { S.activeChatId = null; S.activeNbId = null; S.activeTeamId = null; S.activeTutorId = null; S.lastCrossRecalls = []; switchView("chat"); setWorkMode(S.cfg.workMode, false); renderMessages(); renderChatsList(); renderMemoryBar(); renderChips(); renderTopContextPill(); }
function openChat(id) { const ch = S.chats.find(x => x.id === id); S.activeChatId = id; S.activeNbId = ch?.nbId || null; S.activeTeamId = ch?.teamId || null; S.activeTutorId = ch?.tutorId || null; if (ch?.contextId) S.activeContextId = ch.contextId; switchView("chat"); setWorkMode(S.cfg.workMode, false); renderMessages(); renderChatsList(); renderMemoryBar(); renderChips(); renderTopContextPill(); }
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
async function saveSkill() { const name = document.getElementById("sk-name").value.trim().replace(/\s+/g, "-").replace(/^@/, ""), desc = document.getElementById("sk-desc").value.trim(), prompt = document.getElementById("sk-prompt").value.trim(); if (!name || !prompt) return showToast("Nhập tên và chỉ dẫn"); const sk = { id: document.getElementById("sk-id").value || ("sk-" + Date.now()), name, desc, prompt, builtin: false }; await dbPut("skills", sk); apiFetch("/sync/skills", { method: "POST", body: sk }).catch(() => {}); S.skills = await dbAll("skills"); renderSkillStack(); haptic("ok"); showToast(`Đã lưu @${name}`); switchView("customize"); }
async function delSkill(id) { await dbDel("skills", id); apiFetch("/sync/skills/" + encodeURIComponent(id), { method: "DELETE" }).catch(() => {}); S.skills = S.skills.filter(x => x.id !== id); S.skillIds = S.skillIds.filter(x => x !== id); renderSkillStack(); renderSkillsPage(); renderChips(); }
async function importSkillFile(files) { const f = files?.[0]; if (!f) return; const sk = { id: "sk-" + Date.now(), name: f.name.replace(/\.(md|txt|json)$/i, ""), desc: "Nhập từ tệp", prompt: await f.text(), builtin: false }; await dbPut("skills", sk); S.skills = await dbAll("skills"); renderSkillStack(); renderSkillsPage(); showToast("Đã nhập kỹ năng"); }

async function saveLib(type, title, data) { const it = { id: "l-" + Date.now() + Math.random(), type, title, data, createdAt: Date.now() }; await dbPut("library", it); S.library.unshift(it); }
function renderLibrary() {
  const offices = S.library.filter(x => x.type === "office"), docs = S.library.filter(x => x.type === "doc"), med = S.library.filter(x => x.type === "media");
  document.getElementById("lib-body").innerHTML = `
    <div style="font-size:13.5px;color:var(--ink-2);margin-bottom:8px;" class="num">Office Studio · Slide, Word, Excel &amp; PDF (${offices.length})</div>
    ${offices.map(o => `<div class="card-item lg-card" style="display:flex;align-items:center;gap:10px;cursor:pointer;" onclick="openSavedOfficeFromLib('${o.id}')">
      <span class="tag-st tier-pro">${esc((o.officeKind || "doc").toUpperCase())}</span>
      <strong style="flex:1;font-weight:500;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(o.title)}</strong>
      <button type="button" class="mini-act tap" onclick="event.stopPropagation();delLib('${o.id}')">${ICON_X}</button>
    </div>`).join("") || `<p class="p-sub">Chưa lưu file Office nào</p>`}
    <div style="font-size:13.5px;color:var(--ink-2);margin:14px 0 8px;" class="num">Tài liệu Canvas (${docs.length})</div>
    ${docs.map(d => `<div class="card-item lg-card" style="display:flex;align-items:center;gap:10px;cursor:pointer;" onclick="openCanvasCode(getLib('${d.id}'),'${esc(d.title)}')"><strong style="flex:1;font-weight:500;">${esc(d.title)}</strong><button type="button" class="mini-act tap" onclick="event.stopPropagation();delLib('${d.id}')">${ICON_X}</button></div>`).join("") || `<p class="p-sub">Chưa có tài liệu</p>`}
    <div style="font-size:13.5px;color:var(--ink-2);margin:14px 0 8px;" class="num">Nội dung nghe nhìn (${med.length})</div>
    <div class="media-grid">${med.map(m => `<div class="media-tile"><img src="${m.data}" onclick="openLightbox('${m.data}','${esc(m.title || "api-ai.png")}')" /><button type="button" class="media-del tap" onclick="delLib('${m.id}')">${ICON_X}</button></div>`).join("")}</div>`;
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
    <div class="s-row" onclick="S.cfg.lowPowerMotion=!S.cfg.lowPowerMotion;dbPut('kv',S.cfg);applyTheme();this.querySelector('.sw').classList.toggle('on',S.cfg.lowPowerMotion);haptic('switch')"><span>Giảm hiệu ứng cho máy yếu (tiết kiệm pin)</span><div class="sw ${S.cfg.lowPowerMotion?"on":""}"></div></div>
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
    autoGrow(); updateOrbButton(); checkAtTrigger(ta.value); checkSlashTrigger(ta.value);
  });
  ta.addEventListener("input", e => {
    updateOrbButton();
    if (composing || e.isComposing) return;
    requestAnimationFrame(() => { autoGrow(); checkAtTrigger(ta.value); checkSlashTrigger(ta.value); });
  });
  ta.addEventListener("keydown", e => {
    if (composing || e.isComposing || e.keyCode === 229) return;
    if (handleSlashKeydown(e)) return;
    if (e.key === "Enter" && !e.shiftKey && window.innerWidth >= 768) { e.preventDefault(); sendPrompt(); }
  });
  // Direct screenshot paste from clipboard into chat!
  ta.addEventListener("paste", e => {
    const items = e.clipboardData?.items || [];
    const imgFiles = [];
    for (const it of items) {
      if (it.kind === "file" && it.type.startsWith("image/")) {
        const f = it.getAsFile();
        if (f) imgFiles.push(f);
      }
    }
    if (imgFiles.length) { e.preventDefault(); handleImages(imgFiles); }
  });
  // Deck player keyboard & swipe controls
  document.addEventListener("keydown", e => {
    const dp = document.getElementById("deck-player-ov");
    if (!dp?.classList.contains("open")) return;
    if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); window.OfficeStudio?.stepSlide(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); window.OfficeStudio?.stepSlide(-1); }
    else if (e.key === "Escape") { window.OfficeStudio?.closePlayer(); }
  });
  const dpVp = document.getElementById("dp-viewport");
  if (dpVp) {
    let sx = 0;
    dpVp.addEventListener("pointerdown", e => { sx = e.clientX; }, { passive: true });
    dpVp.addEventListener("pointerup", e => {
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 48) window.OfficeStudio?.stepSlide(dx < 0 ? 1 : -1);
    }, { passive: true });
  }
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
const TOOL_CHIP_LABELS = {
  plan: "Kế hoạch trước (/plan)",
  office_pptx: "PowerPoint (.pptx)",
  office_docx: "Word (.docx) / PDF",
  office_xlsx: "Excel (.xlsx)",
  office_pdf: "Tài liệu PDF",
  image: "Tạo ảnh",
  canvas: "Canvas",
  web_search: "Tìm Web Live",
  deep_research: "Deep Research",
  guided: "Học có hướng dẫn"
};
function renderChips() {
  const c = [];
  if (S.activeTool) c.push(`<span class="chip">${esc(TOOL_CHIP_LABELS[S.activeTool] || S.activeTool)} <button type="button" onclick="S.activeTool=null;renderChips()">×</button></span>`);
  if (S.activeNbId) { const n = S.notebooks.find(x => x.id === S.activeNbId); if (n) c.push(`<span class="chip">Ghi chú: ${esc(n.title)} <button type="button" onclick="S.activeNbId=null;renderChips();renderNbList()">×</button></span>`); }
  S.atts.forEach((a, i) => {
    if (a.dataUrl) c.push(`<span class="chip"><img src="${a.dataUrl}" onclick="openVisionStudio(${i})" /><span>${esc(a.name.slice(0, 12))}</span> <span class="edit-tag" onclick="openVisionStudio(${i})">${a.enhanced ? "Đã nét" : "Soi/Nét"}</span> <span class="edit-tag" onclick="triggerUiFromScreenshot(${i})">Dựng UI</span> <button type="button" onclick="S.atts.splice(${i},1);renderChips();updateOrbButton()">×</button></span>`);
    else c.push(`<span class="chip">${esc(a.name.slice(0, 18))} <button type="button" onclick="S.atts.splice(${i},1);renderChips();updateOrbButton()">×</button></span>`);
  });
  document.getElementById("chips-bar").innerHTML = c.join("");
}

function openModal(html) { document.getElementById("modal-box").innerHTML = html; document.getElementById("modal-bg").classList.add("open"); }
function closeModal() { document.getElementById("modal-bg").classList.remove("open"); }
function openLightbox(src, fileName = "api-ai-image.png") { window.__LB_SRC__ = src; window.__LB_NAME__ = fileName; openModal(`<img src="${src}" style="width:100%;max-height:66dvh;object-fit:contain;border-radius:14px;margin-bottom:10px;background:var(--surface-0);"/><div style="display:flex;justify-content:flex-end;gap:8px;"><button type="button" class="btn-s tap" onclick="downloadDataUrlWithName(window.__LB_SRC__, window.__LB_NAME__)">Lưu ${esc(fileName)}</button><button type="button" class="btn-p tap" onclick="closeModal()">Đóng</button></div>`); }
let tTimer = null;
function showToast(msg, kind = null) {
  const t = document.getElementById("toast"), dot = document.getElementById("toast-dot");
  const txt = String(msg || "");
  document.getElementById("toast-msg").textContent = txt;
  if (dot) {
    let k = kind;
    if (!k) {
      if (/(lỗi|thất bại|sai|không thể|hết giới hạn|bị khóa|thu hồi)/i.test(txt)) k = "err";
      else if (/(yêu cầu|chưa|cần|nhập đủ|tối thiểu|không khớp)/i.test(txt)) k = "warn";
      else k = "ok";
    }
    dot.className = "toast-dot " + k;
    dot.innerHTML = k === "ok"
      ? `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.6" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>`
      : `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.6" viewBox="0 0 24 24"><path d="M12 8v5M12 16.5v.5"/></svg>`;
  }
  t.classList.remove("show"); void t.offsetWidth; t.classList.add("show");
  clearTimeout(tTimer); tTimer = setTimeout(() => t.classList.remove("show"), 2800);
}
function copyText(txt, ok = "Đã sao chép") { navigator.clipboard?.writeText(txt).then(() => showToast(ok)).catch(() => showToast("Không thể sao chép")); }


/* =========================================================================
   v3.3 MODULE 1: NATIVE ANDROID FOREGROUND SERVICE, ALERTS & AUTO-RESUME (1B + ĐỘT PHÁ)
   ========================================================================= */
function getNativeBg() {
  return window.Capacitor?.Plugins?.ApiAiBackground || null;
}
function bgRequestNotifyPerm() {
  try { getNativeBg()?.requestNotifyPermission?.(); } catch {}
  try { if (window.Notification && Notification.permission === "default") Notification.requestPermission().catch(() => {}); } catch {}
}
function bgStartTask(title, body) {
  try { getNativeBg()?.startTask?.({ title, body }); } catch {}
}
function bgStopTask() {
  try { getNativeBg()?.stopTask?.(); } catch {}
}
function bgNotifyDone(title, body) {
  try {
    const nat = getNativeBg();
    if (nat?.notifyDone) { nat.notifyDone({ title, body }); return; }
    if (window.Notification && Notification.permission === "granted") new Notification(title, { body });
  } catch {}
}
async function savePendingTask(task) {
  S.pendingTask = task ? { id: "pendingTask", ...task, updatedAt: Date.now() } : null;
  if (S.pendingTask) await dbPut("kv", S.pendingTask).catch(() => {});
  else await dbDel("kv", "pendingTask").catch(() => {});
}
function buildPendingResumeBanner() {
  const pt = S.pendingTask;
  if (!pt || pt.chatId !== S.activeChatId || S.streaming) return "";
  return `<div class="switch-api-card" style="margin-bottom:12px;">
    <div><strong>Phát hiện phiên Team đang chạy dở</strong> (${esc(pt.teamName || "Team")} · còn lại từ bước ${Number(pt.nextIdx || 0) + 1})</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button type="button" class="btn-p tap" style="height:34px;font-size:12.5px;" onclick="resumePendingTeamTask()">Khôi phục & Chạy tiếp</button>
      <button type="button" class="btn-s tap" style="height:34px;font-size:12.5px;" onclick="savePendingTask(null);renderMessages()">Bỏ qua</button>
    </div></div>`;
}
async function resumePendingTeamTask() {
  const pt = S.pendingTask; if (!pt) return;
  const chat = S.chats.find(c => c.id === pt.chatId);
  const team = S.teams.find(t => t.id === pt.teamId);
  const msg = chat?.messages.find(m => m.id === pt.msgId);
  if (!chat || !team || !msg) { await savePendingTask(null); renderMessages(); return; }
  await runTeamPipeline(chat, team, pt.prompt, msg, Number(pt.nextIdx || 0));
}

/* =========================================================================
   v3.3 MODULE 2: KEY GATE CONTACTS & LIVE 4-TIER PLAN COMPARISON (5BC + ĐỘT PHÁ)
   ========================================================================= */
let cachedPublicPlans = null;
async function loadPublicPlansMeta() {
  try {
    const r = await apiFetch("/public/plans", { auth: false });
    if (r.ok) {
      cachedPublicPlans = await r.json();
      const lbl = document.getElementById("kg-tg-label");
      if (lbl && cachedPublicPlans.telegramHandle) lbl.textContent = cachedPublicPlans.telegramHandle;
    }
  } catch {}
}
function openSupportContact(channel) {
  haptic("tap");
  const base = getApiBase();
  if (!base) return showToast("Chưa kết nối máy chủ", "err");
  const target = channel === "zalo" ? `${base}/go/zalo` : `${base}/go/telegram`;
  window.open(target, "_blank", "noopener");
}
async function openPlanComparisonModal() {
  haptic("tap");
  openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:8px;">Bảng giá & Quyền lợi 4 Hạng Key</h3>
    <div id="plan-cmp-body" style="display:flex;flex-direction:column;gap:8px;">
      <div class="skel-line" style="width:60%;"></div><div class="skel-line" style="width:95%;height:60px;"></div>
    </div>
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button type="button" class="btn-contact tap" style="flex:1;" onclick="openSupportContact('telegram')">Telegram</button>
      <button type="button" class="btn-contact tap" style="flex:1;" onclick="openSupportContact('zalo')">Nhắn Zalo</button>
      <button type="button" class="btn-p tap" onclick="closeModal()">Đóng</button>
    </div>`);
  if (!cachedPublicPlans) await loadPublicPlansMeta();
  const el = document.getElementById("plan-cmp-body");
  if (!el) return;
  const tiers = cachedPublicPlans?.tiers || [];
  if (!tiers.length) { el.innerHTML = `<div style="font-size:13px;color:var(--ink-2);">Không tải được bảng giá. Nhắn Telegram/Zalo để nhận báo giá mới nhất.</div>`; return; }
  el.innerHTML = tiers.map(t => `
    <div class="card-item lg-card" style="margin:0;padding:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
        <span class="tag-st tier-${esc(t.id)}" style="font-size:12px;">${esc(t.label)}</span>
        <strong class="num" style="font-size:13px;color:var(--ok-ink);">${esc(t.price)}</strong>
      </div>
      <div style="font-size:12px;color:var(--ink-2);margin-top:6px;line-height:1.55;">
        Tin nhắn: <b>${t.daily_msgs < 0 ? "Vô hạn" : t.daily_msgs + "/ngày"}</b> · Token: <b class="num">${Number(t.daily_tokens || 0).toLocaleString("vi-VN")}/ngày</b> · Max <b>${t.max_devices}</b> máy<br/>
        Models: <span style="color:var(--ink);">${esc((t.models || []).join(", ") || "Cơ bản")}</span><br/>
        ${t.allow_teams ? "✓ Đội ngũ AI (Teams) & Gia sư AI · " : ""}${t.allow_github_skills ? "✓ GitHub Repo · " : ""}${t.allow_image_gen ? "✓ Tạo ảnh" : "Chat & Canvas"}
      </div>
    </div>`).join("");
}

/* =========================================================================
   v3.3 MODULE 3: SINGLE SOURCE OF TRUTH — boi-canh.md (FROM video_1.mp4!)
   ========================================================================= */
function getActiveContextForChat(chat) {
  const cid = chat?.contextId || S.activeContextId;
  if (!cid) return null;
  return S.contexts.find(c => c.id === cid) || null;
}
function renderTopContextPill() {
  const el = document.getElementById("top-ctx-pill");
  if (!el) return;
  const chat = S.chats.find(c => c.id === S.activeChatId);
  const ctx = getActiveContextForChat(chat);
  if (ctx) {
    el.classList.add("attached");
    el.textContent = ctx.title || "boi-canh.md";
  } else {
    el.classList.remove("attached");
    el.textContent = "boi-canh.md";
  }
}
function openSharedContextManager() {
  haptic("tap");
  toggleSidebar(false);
  const chat = S.chats.find(c => c.id === S.activeChatId);
  const curId = chat?.contextId || S.activeContextId;
  const listHtml = S.contexts.map((c, idx) => `
    <div class="card-item lg-card stagger-item" style="--stagger-i:${idx};margin-bottom:8px;padding:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
        <strong style="font-family:var(--font-mono);font-size:13px;">${esc(c.title)}</strong>
        <span class="tag-st ${c.id===curId?"st-active":"st-unused"}">${c.id===curId?"Đang gắn":"Sẵn sàng"}</span>
      </div>
      <div style="font-size:12px;color:var(--ink-2);margin-top:4px;white-space:pre-line;">${esc((c.content || "").slice(0, 140))}${(c.content||"").length>140?"...":""}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
        <button type="button" class="btn-p tap" style="height:32px;font-size:12px;" onclick="attachSharedContext('${c.id}')">${c.id===curId?"Gỡ khỏi chat":"Gắn vào chat này"}</button>
        <button type="button" class="btn-s tap" style="height:32px;font-size:12px;" onclick="openSharedContextEditor('${c.id}')">Xem / Sửa</button>
        <button type="button" class="btn-danger tap" style="height:32px;font-size:12px;" onclick="deleteSharedContext('${c.id}')">Xóa</button>
      </div>
    </div>`).join("") || `<p class="p-sub" style="margin:6px 0;">Chưa có hồ sơ ngữ cảnh chung nào. Tạo 1 file <b>boi-canh.md</b> duy nhất để cả Claude và GPT cùng đọc — không cần làm "bồ câu đưa thư" copy qua lại nữa!</p>`;

  openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:4px;">Hồ sơ Ngữ cảnh Chung (boi-canh.md)</h3>
    <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:10px;">1 file duy nhất dùng chung cho mọi Model (GPT, Claude, Teams). Sửa 1 chỗ — tất cả AI tự đồng bộ ngay.</p>
    <div style="max-height:52dvh;overflow-y:auto;">${listHtml}</div>
    <div style="display:flex;justify-content:space-between;gap:8px;margin-top:12px;">
      <button type="button" class="btn-blue tap" onclick="openSharedContextEditor(null)">+ Tạo boi-canh.md</button>
      <button type="button" class="btn-s tap" onclick="closeModal()">Đóng</button>
    </div>`);
}
function openSharedContextEditor(id) {
  const c = id ? S.contexts.find(x => x.id === id) : null;
  const tpl = c?.content || "# Bối cảnh dự án\n- Mục tiêu:\n- Quyết định đã chốt:\n- Cấu trúc file / dữ liệu:\n- Việc cần làm tiếp:";
  openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:6px;">${c ? "Sửa hồ sơ ngữ cảnh" : "Tạo boi-canh.md mới"}</h3>
    <label class="f-lbl">Tên file ngữ cảnh</label>
    <input id="ctx-title" class="field" style="font-family:var(--font-mono);" value="${esc(c?.title || "boi-canh.md")}" />
    <label class="f-lbl">Nội dung dùng chung (Markdown)</label>
    <textarea id="ctx-body" class="field" rows="9" style="font-size:13.5px;line-height:1.5;">${esc(tpl)}</textarea>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
      <button type="button" class="btn-s tap" onclick="openSharedContextManager()">Quay lại</button>
      <button type="button" class="btn-p tap" onclick="saveSharedContext('${c?.id || ""}')">Lưu & Gắn</button>
    </div>`);
}
async function saveSharedContext(id) {
  const title = document.getElementById("ctx-title").value.trim() || "boi-canh.md";
  const content = document.getElementById("ctx-body").value.trim();
  const prev = id ? S.contexts.find(x => x.id === id) : null;
  const hist = [...(prev?.history || [])];
  if (prev?.content && prev.content !== content) {
    hist.unshift({ ts: prev.updatedAt || Date.now(), content: prev.content });
  }
  const obj = { id: id || ("ctx-" + Date.now()), title, content, history: hist.slice(0, 5), updatedAt: Date.now() };
  await dbPut("contexts", obj);
  apiFetch("/sync/contexts", { method: "POST", body: obj }).catch(() => {});
  S.contexts = (await dbAll("contexts")).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  S.activeContextId = obj.id;
  const chat = S.chats.find(c => c.id === S.activeChatId);
  if (chat) { chat.contextId = obj.id; dbPut("chats", chat).catch(() => {}); apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {}); }
  closeModal(); renderTopContextPill(); haptic("ok"); showToast(`Đã lưu & gắn ${title}`);
}
function attachSharedContext(id) {
  const chat = S.chats.find(c => c.id === S.activeChatId);
  const next = (chat?.contextId || S.activeContextId) === id ? null : id;
  S.activeContextId = next;
  if (chat) { chat.contextId = next; dbPut("chats", chat).catch(() => {}); apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {}); }
  closeModal(); renderTopContextPill(); haptic("switch");
  showToast(next ? "Đã gắn boi-canh.md cho mọi model trong chat này" : "Đã gỡ boi-canh.md");
}
async function deleteSharedContext(id) {
  await dbDel("contexts", id);
  apiFetch("/sync/contexts/" + encodeURIComponent(id), { method: "DELETE" }).catch(() => {});
  S.contexts = S.contexts.filter(c => c.id !== id);
  if (S.activeContextId === id) S.activeContextId = null;
  renderTopContextPill(); openSharedContextManager();
}
async function mergeReplyIntoSharedContext(msgId, silent = false) {
  const chat = S.chats.find(c => c.id === S.activeChatId);
  const msg = chat?.messages.find(m => m.id === msgId);
  const replyTxt = msg?.pipeline?.codeOutput || msg?.text || "";
  if (!replyTxt) { if (!silent) showToast("Không có nội dung để đồng bộ"); return; }

  let ctx = getActiveContextForChat(chat);
  if (!ctx) {
    ctx = { id: "ctx-" + Date.now(), title: "boi-canh.md", content: `# Bối cảnh ${chat?.title || "dự án"}\n`, updatedAt: Date.now() };
  }
  showToast(`Đang hợp nhất vào ${ctx.title} bằng ${S.cfg.repoReaderModel || "GPT 6.2 Sol"}...`);
  try {
    const r = await apiFetch("/ai/digest", {
      method: "POST",
      body: {
        digestMode: "merge_context",
        readerModelId: S.cfg.repoReaderModel || "gpt-6.2-sol",
        instruction: "Hợp nhất bối cảnh cũ và kết quả/quyết định mới dưới đây thành đúng 1 bản boi-canh.md gọn sạch duy nhất.",
        content: `=== BOI-CANH.MD HIỆN TẠI ===\n${ctx.content}\n\n=== CẬP NHẬT MỚI TỪ AI ===\n${replyTxt.slice(0, 10000)}`
      }
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Đồng bộ thất bại");
    ctx.history = [{ ts: ctx.updatedAt || Date.now(), content: ctx.content }, ...(ctx.history || [])].slice(0, 5);
    ctx.content = d.digest || ctx.content;
    ctx.updatedAt = Date.now();
    await dbPut("contexts", ctx);
    apiFetch("/sync/contexts", { method: "POST", body: ctx }).catch(() => {});
    S.contexts = (await dbAll("contexts")).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    S.activeContextId = ctx.id;
    if (chat) { chat.contextId = ctx.id; dbPut("chats", chat).catch(() => {}); apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {}); }
    renderTopContextPill(); haptic("ok");
    showToast(`Đã cập nhật ${ctx.title} (${d.readerModel}) — GPT & Claude đọc chung ngay!`, "ok");
  } catch (e) { haptic("err"); showToast(e.message, "err"); }
}

/* =========================================================================
   v3.3 MODULE 4: SMART CHEAP REPO READER & TOKEN ESTIMATOR (4A + ĐỘT PHÁ, DEFAULT GPT 6.2 SOL)
   ========================================================================= */
function renderRepoCostStrip() {
  const strip = document.getElementById("repo-cost-strip");
  if (!strip) return;
  const activeRepos = S.skillIds.map(id => S.skills.find(x => x.id === id)).filter(sk => sk?.repoFiles?.length);
  if (!activeRepos.length) { strip.style.display = "none"; strip.innerHTML = ""; return; }

  const rawChars = activeRepos.reduce((a, sk) => a + (sk.repoFiles || []).reduce((x, f) => x + (f.size || f.content?.length || 0), 0), 0);
  const rawTok = Math.max(1000, Math.round(rawChars / 3.5));
  const compactTok = activeRepos.length * 1400;
  const readerId = S.cfg.repoReaderModel || "gpt-6.2-sol";

  strip.style.display = "flex";
  strip.innerHTML = `<div class="repo-budget-pill">
    <span>Lọc Repo (${activeRepos.length}): <b class="num">~${Math.round(compactTok/1000*10)/10}K</b> tok <span style="opacity:.7;text-decoration:line-through;">${Math.round(rawTok/1000)}K</span></span>
    <select class="repo-budget-sel" onchange="S.cfg.repoReaderModel=this.value;dbPut('kv',S.cfg);showToast('Model đọc Repo: '+this.options[this.selectedIndex].text)">
      <option value="gpt-6.2-sol" ${readerId==="gpt-6.2-sol"?"selected":""}>Đọc: GPT 6.2 Sol (×1.2)</option>
      <option value="gpt-6-luna" ${readerId==="gpt-6-luna"?"selected":""}>Đọc: GPT 6 Luna (×0.7)</option>
    </select>
  </div>`;
}

async function buildRepoIndexViaCheapReader(sk) {
  try {
    const fileList = (sk.repoFiles || []).map(f => `- ${f.path} (${Math.max(1, Math.round((f.size||0)/1024))}KB)`).join("\n");
    const sample = `REPO: ${sk.repo?.owner}/${sk.repo?.repo}\nDANH SÁCH FILE:\n${fileList}\n\nNỘI DUNG CHÍNH:\n${(sk.prompt || "").slice(0, 6000)}`;
    const r = await apiFetch("/ai/digest", {
      method: "POST",
      body: {
        readerModelId: S.cfg.repoReaderModel || "gpt-6.2-sol",
        instruction: "Lập Bản đồ Kiến trúc Repo (Repo Index) siêu gọn dưới 300 từ: mục đích repo, cấu trúc thư mục quan trọng và vai trò các file chính.",
        content: sample
      }
    });
    if (r.ok) { const d = await r.json(); return d.digest || ""; }
  } catch {}
  return "";
}

function retrieveCompactRepoContext(sk, queryText) {
  const files = sk.repoFiles || [];
  let out = `BẢN ĐỒ REPO (@${sk.name}):\n${(sk.repoIndex || (sk.prompt || "").slice(0, 1800))}`;
  const words = [...new Set((queryText || "").toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, " ").split(/\s+/).filter(w => w.length >= 3))];
  const topFiles = files
    .map(f => {
      const hay = (f.path + " " + (f.content || "").slice(0, 2500)).toLowerCase();
      let sc = 0;
      for (const w of words) { if (f.path.toLowerCase().includes(w)) sc += 3; else if (hay.includes(w)) sc += 1; }
      return { f, sc };
    })
    .filter(x => x.sc > 0)
    .sort((a, b) => b.sc - a.sc)
    .slice(0, 2);
  if (topFiles.length) {
    out += "\n\nTRÍCH ĐOẠN LIÊN QUAN:\n" + topFiles.map(x => `--- ${x.f.path} ---\n${(x.f.content || "").slice(0, 1600)}`).join("\n\n");
  }
  return out.slice(0, 5200);
}

async function digestActiveReposForQuery(repoSkills, queryText, mainModel) {
  const mult = Number(mainModel?.cost_multiplier || 1.2);
  const rawCombined = repoSkills.map(sk => retrieveCompactRepoContext(sk, queryText)).join("\n\n");
  // If using an expensive model (>= x2.0 like Astra/Opus/Fable) and payload > 1800 chars, pre-digest via GPT 6.2 Sol / Luna!
  if (mult >= 2.0 && rawCombined.length > 1800) {
    try {
      const r = await apiFetch("/ai/digest", {
        method: "POST",
        body: {
          readerModelId: S.cfg.repoReaderModel || "gpt-6.2-sol",
          instruction: `Người dùng hỏi: "${(queryText || "").slice(0, 300)}". Hãy rút gọn đúng kiến thức, tên hàm, quy tắc cần thiết từ Repo để mô hình chính trả lời chính xác mà tốn ít token nhất.`,
          content: rawCombined
        }
      });
      if (r.ok) {
        const d = await r.json();
        if (d.digest) return `NGỮ CẢNH REPO ĐÃ LỌC BỞI ${d.readerModel} (TIẾT KIỆM TOKEN):\n${d.digest}`;
      }
    } catch {}
  }
  return rawCombined;
}

/* =========================================================================
   v3.3 MODULE 5: ĐỘI NGŨ AI (TEAMS — 6A + ĐỘT PHÁ + PER-MEMBER FILES)
   ========================================================================= */
function canUseTeams() { return S.user?.role === "admin" || ["pro_max", "ultra"].includes(S.user?.keyTier); }
function canUseTutors() { return S.user?.role === "admin" || ["pro_max", "ultra"].includes(S.user?.keyTier); }

async function ensureBuiltinCodingTeam() {
  if (!S.teams.some(t => t.id === "team-coding-4agent")) {
    const defTeam = {
      id: "team-coding-4agent",
      name: "Team Lập trình 4-Agent",
      desc: "Dây chuyền chuẩn Architect → Coder → Reviewer → Tester (tự vá lỗi)",
      builtin: true,
      coordMode: "sequential",
      pauseAfterFirst: false,
      maxFixLoops: 1,
      members: [
        { id: "architect", role: "Architect · Kiến trúc sư", prompt: "Phân tích yêu cầu, thiết kế kiến trúc hệ thống, cấu trúc dữ liệu, luồng xử lý và edge-cases. KHÔNG viết code dài dòng.", modelId: "gpt-6.2-astra", enabled: true, files: [] },
        { id: "coder", role: "Coder · Lập trình viên", prompt: "Viết mã nguồn sạch, hoàn chỉnh, chạy được ngay bám sát 100% bản thiết kế. Nếu là web/UI, xuất trọn bộ trong 1 khối ```html ... ```.", modelId: "gpt-6.2-sol", enabled: true, files: [] },
        { id: "reviewer", role: "Reviewer · Thẩm định viên", prompt: "Soi kỹ từng dòng code tìm lỗi logic, lỗ hổng bảo mật, hiệu năng và sai lệch so với bản vẽ.", modelId: "gpt-6.2-astra", enabled: true, files: [] },
        { id: "tester", role: "Tester · Kỹ sư kiểm thử", prompt: "Thiết kế ca kiểm thử thực tế, edge-case và mô phỏng chạy kiểm tra. DÒNG ĐẦU TIÊN ghi `STATUS: PASS` hoặc `STATUS: FAIL` kèm danh sách lỗi cần sửa.", modelId: "gpt-6-luna", enabled: true, files: [] }
      ]
    };
    await dbPut("teams", defTeam);
    S.teams.unshift(defTeam);
  }
}

function renderActiveContextBanner() {
  const el = document.getElementById("active-context-banner");
  if (!el) return;
  const team = S.activeTeamId ? S.teams.find(t => t.id === S.activeTeamId) : null;
  const tutor = S.activeTutorId ? S.tutors.find(t => t.id === S.activeTutorId) : null;

  if (team) {
    const cnt = (team.members || []).filter(m => m.enabled !== false).length;
    el.style.display = "flex";
    el.innerHTML = `<div class="ctx-active-banner">
      <div style="min-width:0;flex:1;">
        <strong>Đội ngũ: ${esc(team.name)}</strong> · ${cnt} thành viên · ${team.coordMode==="council"?"Hội đồng":"Dây chuyền"}
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;">
        <button type="button" class="btn-s tap" style="height:28px;padding:0 10px;font-size:11.5px;" onclick="openTeamEditor('${team.id}')">Sửa Team</button>
        <button type="button" class="mini-act tap" onclick="S.activeTeamId=null;setWorkMode('chat',false)" aria-label="Thoát Team">${ICON_X}</button>
      </div></div>`;
    return;
  }
  if (tutor) {
    const due = getDueMistakes(tutor).length;
    el.style.display = "flex";
    el.innerHTML = `<div class="ctx-active-banner">
      <div style="min-width:0;flex:1;">
        <strong>Gia sư ${esc(tutor.name)}</strong> (${esc(tutor.subject)}) ${tutor.streak ? `· <span class="num">${tutor.streak} ngày</span>` : ""} ${due ? `· <b style="color:var(--warn-ink);">Ôn ${due} lỗi</b>` : ""}
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;">
        <button type="button" class="btn-s tap" style="height:28px;padding:0 10px;font-size:11.5px;" onclick="openTutorKnowledgeModal('${tutor.id}')">Kho & Lỗi</button>
        <button type="button" class="mini-act tap" onclick="S.activeTutorId=null;setWorkMode('chat',false);renderMessages()" aria-label="Thoát Gia sư">${ICON_X}</button>
      </div></div>`;
    return;
  }
  el.style.display = "none";
  el.innerHTML = "";
}

function renderTeamsPage() {
  const box = document.getElementById("teams-body");
  if (!canUseTeams()) {
    box.innerHTML = `<div class="card-item lg-card"><strong>Tính năng Đội ngũ AI (Teams) yêu cầu Key hạng Pro Max hoặc Ultra</strong><p class="p-sub" style="margin:6px 0 0;">Nâng cấp gói Key để mở khóa Team Lập trình 4-Agent và tự lập đội ngũ 2–6 thành viên tùy biến.</p></div>`;
    return;
  }
  box.innerHTML = S.teams.map((tm, idx) => {
    const activeCnt = (tm.members || []).filter(m => m.enabled !== false).length;
    const filesCnt = (tm.members || []).reduce((a, m) => a + (m.files?.length || 0), 0);
    return `<div class="card-item lg-card stagger-item" style="--stagger-i:${idx}">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          <strong style="font-size:15px;">${esc(tm.name)}</strong>
          ${tm.builtin ? `<span class="tag-st st-unused">Mặc định</span>` : `<span class="tag-st tier-pro_max">Tùy chỉnh</span>`}
          <span class="tag-quiet">${tm.coordMode === "council" ? "Hội đồng thảo luận" : "Dây chuyền nối tiếp"}</span>
        </div>
        <span class="num" style="font-size:12px;color:var(--ink-2);">${activeCnt} thành viên${filesCnt ? ` · ${filesCnt} tệp` : ""}</span>
      </div>
      <div style="font-size:12.5px;color:var(--ink-2);margin-top:5px;">${esc(tm.desc || "")}</div>
      <div class="file-tag-list" style="margin-top:8px;">
        ${(tm.members || []).filter(m => m.enabled !== false).map(m => `<span class="file-mini-tag">${esc(m.role)} · ${esc(S.models.find(x => x.id === m.modelId)?.short || m.modelId)}</span>`).join("")}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;">
        <button type="button" class="btn-p tap" style="height:36px;font-size:13px;" onclick="openTeamWorkspace('${tm.id}')">Mở phòng làm việc</button>
        <button type="button" class="btn-s tap" style="height:36px;font-size:13px;" onclick="openTeamEditor('${tm.id}')">Cấu hình & Tệp</button>
        ${!tm.builtin ? `<button type="button" class="btn-danger tap" style="height:36px;font-size:13px;" onclick="deleteCustomTeam('${tm.id}')">Xóa</button>` : ""}
      </div>
    </div>`;
  }).join("") + buildTeamsContextHubHtml();
}

function openTeamWorkspace(teamId) {
  if (!canUseTeams()) return showToast("Đội ngũ AI yêu cầu Key hạng Pro Max trở lên", "warn");
  S.activeTeamId = teamId;
  S.activeTutorId = null;
  const tmObj = S.teams.find(t => t.id === teamId);
  if (tmObj?.contextId) S.activeContextId = tmObj.contextId;
  // Open latest chat of this team or start fresh
  const existing = S.chats.find(c => c.teamId === teamId);
  S.activeChatId = existing ? existing.id : null;
  switchView("chat");
  setWorkMode("chat", false);
  renderMessages(); renderChatsList(); renderMemoryBar(); renderTopContextPill();
  showToast(`Đã vào phòng ${S.teams.find(t => t.id === teamId)?.name || "Team"}`);
}

let teamDraft = null;
let pickingMemberIdx = -1;
function openTeamEditor(teamId = null) {
  if (!canUseTeams()) return showToast("Đội ngũ AI yêu cầu Key hạng Pro Max trở lên", "warn");
  const mods = getAllowedRealModels();
  const defMod = mods[0]?.id || "gpt-6.2-sol";
  const orig = teamId ? S.teams.find(t => t.id === teamId) : null;
  teamDraft = orig ? JSON.parse(JSON.stringify(orig)) : {
    id: "team-" + Date.now(),
    name: "",
    desc: "",
    builtin: false,
    coordMode: "sequential",
    pauseAfterFirst: false,
    maxFixLoops: 0,
    members: [
      { id: "m1", role: "Chuyên gia 1 · Phân tích", prompt: "Phân tích kỹ đề bài, tìm insight và lập dàn ý chi tiết.", modelId: defMod, enabled: true, files: [] },
      { id: "m2", role: "Chuyên gia 2 · Thực thi", prompt: "Dựa trên bản phân tích để xây dựng sản phẩm/bài làm hoàn chỉnh nhất.", modelId: defMod, enabled: true, files: [] }
    ]
  };
  switchView("team-editor");
  renderTeamEditorBody();
}

function renderTeamEditorBody() {
  const box = document.getElementById("team-editor-body");
  if (!box || !teamDraft) return;
  const mods = getAllowedRealModels();
  const fallbackId = mods[0]?.id || "gpt-6.2-sol";

  box.innerHTML = `<div class="card-item lg-card">
    <h3 style="font-size:17px;font-weight:520;margin-bottom:4px;">${teamDraft.builtin ? "Cấu hình Team Lập trình 4-Agent" : "Thiết lập Đội ngũ AI (2–6 thành viên)"}</h3>
    <label class="f-lbl">Tên Đội ngũ</label>
    <input id="te-name" class="field" value="${esc(teamDraft.name)}" ${teamDraft.builtin?"readonly":""} placeholder="VD: Team Nghiên cứu & Chiến lược" oninput="teamDraft.name=this.value" />
    <label class="f-lbl">Mô tả mục tiêu chung</label>
    <input id="te-desc" class="field" value="${esc(teamDraft.desc)}" placeholder="VD: Phân tích thị trường, phản biện và tổng hợp" oninput="teamDraft.desc=this.value" />

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <div>
        <label class="f-lbl">Kiểu phối hợp nhóm</label>
        <select class="field" onchange="teamDraft.coordMode=this.value">
          <option value="sequential" ${teamDraft.coordMode!=="council"?"selected":""}>Dây chuyền nối tiếp (1→2→3...)</option>
          <option value="council" ${teamDraft.coordMode==="council"?"selected":""}>Hội đồng thảo luận (Độc lập + Tổng hợp)</option>
        </select>
      </div>
      <div>
        <label class="f-lbl">Tự vá lỗi (khi bước cuối FAIL)</label>
        <select class="field" onchange="teamDraft.maxFixLoops=Number(this.value)">
          <option value="0" ${!teamDraft.maxFixLoops?"selected":""}>Tắt</option>
          <option value="1" ${teamDraft.maxFixLoops===1?"selected":""}>Tối đa 1 vòng</option>
          <option value="2" ${teamDraft.maxFixLoops===2?"selected":""}>Tối đa 2 vòng</option>
        </select>
      </div>
    </div>

    <div class="s-row" style="margin-top:6px;" onclick="teamDraft.pauseAfterFirst=!teamDraft.pauseAfterFirst;this.querySelector('.sw').classList.toggle('on',teamDraft.pauseAfterFirst);haptic('switch')">
      <span>Dừng duyệt kết quả sau Thành viên 1</span>
      <div class="sw ${teamDraft.pauseAfterFirst?"on":""}"></div>
    </div>
    <label class="f-lbl">Hồ sơ bối cảnh chung gắn cho Team (boi-canh.md)</label>
    <select class="field" onchange="teamDraft.contextId=this.value||null">
      <option value="">Không gắn mặc định</option>
      ${S.contexts.map(c => `<option value="${esc(c.id)}" ${teamDraft.contextId===c.id?"selected":""}>${esc(c.title)}</option>`).join("")}
    </select>
    <div class="s-row" style="margin-top:4px;" onclick="teamDraft.autoSyncContext=!teamDraft.autoSyncContext;this.querySelector('.sw').classList.toggle('on',teamDraft.autoSyncContext);haptic('switch')">
      <span>Tự động hợp nhất kết quả vào boi-canh.md sau khi Team chạy xong</span>
      <div class="sw ${teamDraft.autoSyncContext?"on":""}"></div>
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:center;margin:12px 0 8px;">
    <strong style="font-size:14.5px;" class="num">Danh sách Thành viên (${teamDraft.members.length}/6)</strong>
    ${!teamDraft.builtin && teamDraft.members.length < 6 ? `<button type="button" class="btn-blue tap" style="height:34px;font-size:12.5px;" onclick="addTeamMemberDraft()">+ Thêm thành viên</button>` : ""}
  </div>

  ${teamDraft.members.map((m, idx) => {
    if (!mods.some(x => x.id === m.modelId)) m.modelId = fallbackId;
    return `<div class="member-editor-card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">
        <label style="display:inline-flex;align-items:center;gap:8px;font-size:13.5px;font-weight:520;">
          <input type="checkbox" ${m.enabled!==false?"checked":""} onchange="teamDraft.members[${idx}].enabled=this.checked" style="width:16px;height:16px;accent-color:var(--accent);" />
          <span>Thành viên ${idx + 1}</span>
        </label>
        <div style="display:flex;gap:6px;">
          <button type="button" class="btn-s tap" style="height:30px;padding:0 10px;font-size:12px;" onclick="triggerMemberFilePick(${idx})">+ Đính kèm File</button>
          ${!teamDraft.builtin && teamDraft.members.length > 2 ? `<button type="button" class="mini-act tap" onclick="teamDraft.members.splice(${idx},1);renderTeamEditorBody()">${ICON_X}</button>` : ""}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div><label class="f-lbl" style="margin-top:0;">Vai trò</label><input class="field" style="font-size:14px;" value="${esc(m.role)}" oninput="teamDraft.members[${idx}].role=this.value" /></div>
        <div><label class="f-lbl" style="margin-top:0;">Model riêng</label>
          <select class="field" style="font-size:13.5px;" onchange="teamDraft.members[${idx}].modelId=this.value">
            ${mods.map(mo => `<option value="${esc(mo.id)}" ${m.modelId===mo.id?"selected":""}>${esc(mo.short || mo.title)} ${mo.cost_label?`(${mo.cost_label})`:""}</option>`).join("")}
          </select>
        </div>
      </div>
      <label class="f-lbl">Chỉ dẫn chuyên môn (Prompt)</label>
      <textarea class="field" rows="3" style="font-size:13.5px;" oninput="teamDraft.members[${idx}].prompt=this.value">${esc(m.prompt || "")}</textarea>
      ${(m.files || []).length ? `<div class="file-tag-list">${m.files.map((f, fi) => `<span class="file-mini-tag">${esc(f.name)} (${Math.max(1, Math.round((f.content||"").length/1024))}KB)<button type="button" onclick="teamDraft.members[${idx}].files.splice(${fi},1);renderTeamEditorBody()">×</button></span>`).join("")}</div>` : ""}
    </div>`;
  }).join("")}`;
}

function addTeamMemberDraft() {
  if (!teamDraft || teamDraft.members.length >= 6) return;
  const mods = getAllowedRealModels();
  const n = teamDraft.members.length + 1;
  teamDraft.members.push({ id: "m" + Date.now(), role: `Thành viên ${n}`, prompt: "Phân tích và đóng góp góc nhìn chuyên sâu cho yêu cầu của nhóm.", modelId: mods[0]?.id || "gpt-6.2-sol", enabled: true, files: [] });
  renderTeamEditorBody();
}
function triggerMemberFilePick(idx) { pickingMemberIdx = idx; document.getElementById("in-member-file").click(); }
async function handleMemberFilePick(files) {
  if (pickingMemberIdx < 0 || !teamDraft?.members?.[pickingMemberIdx]) return;
  const mem = teamDraft.members[pickingMemberIdx];
  mem.files = mem.files || [];
  for (const f of files || []) {
    const txt = (await extractRealFileText(f)).text.slice(0, 30000);
    let digest = "";
    if (txt.length > 3500) {
      showToast(`Đang lọc gọn tệp ${f.name} bằng ${S.cfg.repoReaderModel || "GPT 6.2 Sol"}...`);
      try {
        const r = await apiFetch("/ai/digest", { method: "POST", body: { readerModelId: S.cfg.repoReaderModel || "gpt-6.2-sol", instruction: `Tóm tắt trọng tâm tài liệu "${f.name}" cho vai trò "${mem.role}".`, content: txt } });
        if (r.ok) digest = (await r.json()).digest || "";
      } catch {}
    }
    mem.files.push({ name: f.name, content: txt.slice(0, 12000), digest });
  }
  document.getElementById("in-member-file").value = "";
  renderTeamEditorBody(); haptic("ok"); showToast("Đã đính kèm tệp cho thành viên");
}
async function saveCustomTeam() {
  if (!teamDraft) return;
  if (!teamDraft.name.trim()) return showToast("Nhập tên Đội ngũ", "warn");
  if (!teamDraft.members.some(m => m.enabled !== false)) return showToast("Bật ít nhất 1 thành viên", "warn");
  await dbPut("teams", teamDraft);
  apiFetch("/sync/teams", { method: "POST", body: teamDraft }).catch(() => {});
  S.teams = await dbAll("teams");
  haptic("ok"); showToast(`Đã lưu ${teamDraft.name}`, "ok");
  switchView("teams");
}
async function deleteCustomTeam(id) {
  await dbDel("teams", id);
  apiFetch("/sync/teams/" + encodeURIComponent(id), { method: "DELETE" }).catch(() => {});
  S.teams = S.teams.filter(t => t.id !== id);
  if (S.activeTeamId === id) S.activeTeamId = null;
  renderTeamsPage(); haptic("ok"); showToast("Đã xóa Team");
}

async function runTeamPipeline(chat, team, userPrompt, resumeMsg = null, startAtIdx = 0) {
  if (!canUseTeams()) return showToast("Đội ngũ AI yêu cầu Key hạng Pro Max trở lên", "warn");
  const activeMembers = (team.members || []).filter(m => m.enabled !== false);
  if (!activeMembers.length) return showToast("Team chưa bật thành viên nào", "warn");

  let aiMsg = resumeMsg;
  if (!aiMsg) {
    aiMsg = {
      id: "m-" + (Date.now() + 1), role: "assistant", text: "",
      modelLabel: `${team.name} (${team.coordMode === "council" ? "Hội đồng" : "Dây chuyền"})`,
      streaming: true,
      pipeline: {
        teamId: team.id, prompt: userPrompt, steps: [],
        awaitingApproval: false, blueprint: "", codeOutput: "", reviewOutput: "", finalCode: null
      },
      ts: Date.now()
    };
    chat.messages.push(aiMsg);
  } else {
    aiMsg.streaming = true;
    aiMsg.pipeline.awaitingApproval = false;
  }

  const pipe = aiMsg.pipeline;
  const ctxObj = getActiveContextForChat(chat);
  const sharedCtxBlock = ctxObj?.content ? `\n\nHỒ SƠ NGỮ CẢNH CHUNG (${ctxObj.title}):\n${ctxObj.content.slice(0, 5000)}` : "";

  S.streaming = true; S.abort = new AbortController(); updateOrbButton();
  renderMessages(); scrollToBottom(true);
  bgStartTask(`${team.name} đang làm việc`, `Bắt đầu ${activeMembers.length} thành viên...`);

  const runMemberStep = async (mem, stepNum, sysExtra, contentIn) => {
    const modObj = S.models.find(m => m.id === mem.modelId && m.allowed) || getAllowedRealModels()[0];
    const modId = modObj?.id || S.cfg.selectedModel;
    const filesTxt = (mem.files || []).length
      ? "\n\nTÀI LIỆU RIÊNG CỦA VAI TRÒ NÀY:\n" + mem.files.map(f => `[${f.name}]\n${f.digest || f.content.slice(0, 3200)}`).join("\n\n")
      : "";
    const step = {
      id: "st-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      role: mem.id, num: String(stepNum), title: mem.role,
      modelLabel: modObj?.short || modId, status: "running", text: ""
    };
    pipe.steps.push(step);
    renderMessages(); scrollToBottom(false);
    bgStartTask(`${team.name} · Bước ${stepNum}`, `${mem.role} (${step.modelLabel}) đang xử lý...`);

    let raf = false;
    const paint = () => {
      raf = false;
      const el = document.getElementById("pipe-md-" + step.id);
      if (el) { el.innerHTML = renderMd(step.text); if (isNearBottom()) scrollToBottom(false); }
    };
    const fullSys = `Bạn là thành viên "${mem.role}" trong đội ngũ "${team.name}".\nCHỈ DẪN VAI TRÒ: ${mem.prompt}${filesTxt}${sharedCtxBlock}`;
    const { text, slot } = await callStatelessAgent(chat, modId, mem.id, fullSys, contentIn, full => {
      step.text = full;
      if (!raf) { raf = true; requestAnimationFrame(paint); }
    });
    step.text = text; step.status = "done";
    if (slot) aiMsg.slot = slot;
    renderMessages(); scrollToBottom(false);
    return text;
  };

  try {
    let lastOutput = pipe.blueprint || "";
    const councilOpinions = [];

    for (let i = startAtIdx; i < activeMembers.length; i++) {
      const mem = activeMembers[i];
      await savePendingTask({ chatId: chat.id, teamId: team.id, teamName: team.name, msgId: aiMsg.id, prompt: pipe.prompt, nextIdx: i });

      let inputTxt = "";
      if (team.coordMode === "council") {
        // Council Mode (Đột phá 6): Members 1..N-1 analyze independently, Last member synthesizes!
        const isChair = i === activeMembers.length - 1 && activeMembers.length >= 2;
        inputTxt = isChair
          ? `YÊU CẦU GỐC:\n${pipe.prompt}\n\nÝ KIẾN ĐỘC LẬP TỪ CÁC THÀNH VIÊN HỘI ĐỒNG:\n${councilOpinions.join("\n\n")}\n\nNHIỆM VỤ CỦA BẠN (CHỦ TỌA TỔNG HỢP): So sánh, phản biện các điểm mâu thuẫn và chốt phương án tối ưu nhất.`
          : `YÊU CẦU GỐC:\n${pipe.prompt}\n\nHãy phân tích độc lập từ đúng góc nhìn chuyên môn "${mem.role}" của bạn.`;
      } else {
        // Sequential Pipeline Mode
        inputTxt = i === 0
          ? `YÊU CẦU DỰ ÁN:\n${pipe.prompt}`
          : `YÊU CẦU GỐC:\n${pipe.prompt}\n\nKẾT QUẢ TỪ CÁC BƯỚC TRƯỚC:\n${pipe.steps.filter(s => s.status === "done").slice(-2).map(s => `### ${s.title}\n${s.text.slice(0, 5500)}`).join("\n\n")}`;
      }

      const out = await runMemberStep(mem, i + 1, "", inputTxt);
      lastOutput = out;
      if (i === 0) pipe.blueprint = out;
      if (team.coordMode === "council") councilOpinions.push(`### ${mem.role}\n${out.slice(0, 4500)}`);
      const codeHit = extractBestCodeBlock(out);
      if (codeHit) { pipe.codeOutput = out; pipe.finalCode = codeHit; }

      // Pause after Member 1 for user approval?
      if (i === 0 && team.pauseAfterFirst && activeMembers.length > 1 && !resumeMsg) {
        pipe.awaitingApproval = true;
        aiMsg.streaming = false; S.streaming = false; S.abort = null;
        bgStopTask();
        await savePendingTask(null);
        await dbPut("chats", chat).catch(() => {}); apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {});
        renderMessages(); updateOrbButton();
        showToast("Bước 1 đã xong · Kiểm tra rồi bấm Duyệt & Chạy tiếp");
        return;
      }

      // Auto-fix loop if final member returns STATUS: FAIL and maxFixLoops > 0
      if (i === activeMembers.length - 1 && Number(team.maxFixLoops || 0) > 0 && /STATUS\s*:\s*FAIL/i.test(out.slice(0, 260))) {
        const coderMem = activeMembers.find(x => x.id === "coder") || activeMembers[Math.max(0, activeMembers.length - 2)];
        const maxL = Math.min(2, Number(team.maxFixLoops || 1));
        let failReport = out;
        for (let loop = 1; loop <= maxL; loop++) {
          pipe.steps[pipe.steps.length - 1].status = "fail";
          const fixed = await runMemberStep(coderMem, `${i}.${loop}`, "", `SỬA LỖI VÒNG ${loop} DỰA TRÊN BÁO CÁO:\n${failReport}\n\nBẢN CŨ:\n${pipe.codeOutput || lastOutput}`);
          pipe.codeOutput = fixed; lastOutput = fixed;
          pipe.finalCode = extractBestCodeBlock(fixed) || pipe.finalCode;
          failReport = await runMemberStep(mem, `${i + 1}.${loop}`, "", `KIỂM TRA LẠI SAU KHI VÁ LỖI VÒNG ${loop}:\n${fixed}`);
          if (!/STATUS\s*:\s*FAIL/i.test(failReport.slice(0, 260))) break;
        }
      }
    }

    aiMsg.text = pipe.codeOutput || lastOutput || "Đội ngũ đã hoàn tất.";
    await savePendingTask(null);
    if (team.autoSyncContext && (team.contextId || S.activeContextId)) { mergeReplyIntoSharedContext(aiMsg.id, true).catch(() => {}); }
    haptic("ok");
    showToast(`${team.name} đã hoàn tất`, "ok");
    if (document.hidden) bgNotifyDone(`${team.name} đã hoàn tất`, aiMsg.text.replace(/[#*`]/g, "").slice(0, 120));
  } catch (e) {
    pipe.steps.push({ id: "st-err-" + Date.now(), role: "error", num: "!", title: "Tạm dừng do gián đoạn", modelLabel: "", status: "fail", text: e.name === "AbortError" ? "Đã dừng theo yêu cầu." : e.message });
    aiMsg.text = `Tạm dừng: ${e.message}`;
    if (e.name === "AbortError") await savePendingTask(null);
  } finally {
    aiMsg.streaming = false; S.streaming = false; S.abort = null; chat.updatedAt = Date.now();
    bgStopTask();
    dbPut("chats", chat).catch(() => {}); apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {});
    syncAccountUI(); renderMessages(); renderMemoryBar(); updateOrbButton();
  }
}

// Override approveArchitectAndContinue to work cleanly with v3.3 Teams!
approveArchitectAndContinue = async function(msgId) {
  const chat = S.chats.find(c => c.id === S.activeChatId);
  const msg = chat?.messages.find(m => m.id === msgId);
  if (!msg?.pipeline) return;
  const ta = document.getElementById("bp-edit-" + msgId);
  if (ta) msg.pipeline.blueprint = ta.value.trim();
  const team = S.teams.find(t => t.id === (msg.pipeline.teamId || "team-coding-4agent")) || S.teams[0];
  haptic("ok");
  await runTeamPipeline(chat, team, msg.pipeline.prompt, msg, 1);
};

/* =========================================================================
   v3.3 MODULE 6: GIA SƯ AI (7.1A + 7.2B + 7.3AB + 7.4B + ĐỘT PHÁ)
   ========================================================================= */
const WEEK_DAYS = [[1, "T2"], [2, "T3"], [3, "T4"], [4, "T5"], [5, "T6"], [6, "T7"], [0, "CN"]];
function todayKeyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function timeToMins(hhmm) {
  const [h, m] = String(hhmm || "20:00").split(":").map(Number);
  return (Number.isFinite(h) ? h : 20) * 60 + (Number.isFinite(m) ? m : 0);
}
function minsToTime(mins) {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

// 7.1A: Schedule Conflict Detector across all Tutors + Smart Free Slot Suggestion
function findScheduleConflicts(draft) {
  const conflicts = [];
  const dDays = draft.scheduleDays || [];
  const dMin = timeToMins(draft.scheduleTime);
  for (const other of S.tutors) {
    if (other.id === draft.id) continue;
    const oDays = other.scheduleDays || [];
    const overlapDays = dDays.filter(day => oDays.includes(day));
    if (!overlapDays.length) continue;
    const oMin = timeToMins(other.scheduleTime);
    if (Math.abs(dMin - oMin) < 45) {
      const dayNames = overlapDays.map(x => WEEK_DAYS.find(w => w[0] === x)?.[1] || x).join(", ");
      conflicts.push({ other, dayNames, suggested: minsToTime(oMin + 60) });
    }
  }
  return conflicts;
}

// 7.2B: Compute next alarm timestamp & schedule/cancel native Android reminder
function getNextReminderTimestamp(tutor, skipToday = false) {
  const days = tutor.scheduleDays || [];
  if (!days.length) return null;
  const [hh, mm] = String(tutor.scheduleTime || "20:00").split(":").map(Number);
  const now = new Date();
  for (let offset = (skipToday ? 1 : 0); offset <= 7; offset++) {
    const cand = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hh || 20, mm || 0, 0, 0);
    if (cand.getTime() > Date.now() + 30000 && days.includes(cand.getDay())) {
      return cand.getTime();
    }
  }
  return null;
}
function syncTutorAlarm(tutor) {
  const nat = getNativeBg();
  if (!nat?.scheduleTutorReminder) return;
  if (tutor.reminderEnabled === false) { nat.cancelTutorReminder({ tutorId: tutor.id }); return; }
  const studiedToday = (tutor.studiedDates || []).includes(todayKeyLocal());
  const nextTs = getNextReminderTimestamp(tutor, studiedToday);
  if (!nextTs) return;
  nat.scheduleTutorReminder({
    tutorId: tutor.id,
    title: `Gia sư ${tutor.name} (${tutor.subject})`,
    body: tutor.reminderText || `Nay chưa vào học ${tutor.subject} à? Có bài tập mới đang chờ cậu đó!`,
    triggerAtMs: nextTs
  });
}
function syncAllTutorAlarms() { (S.tutors || []).forEach(syncTutorAlarm); }

// Đột phá: Mistake Bank due items (Spaced Repetition 1d -> 3d -> 7d)
function getDueMistakes(tutor) {
  const now = Date.now();
  return (tutor?.mistakes || []).filter(m => !m.mastered && (m.nextReviewAt || 0) <= now);
}
async function markTutorStudiedToday(tutor) {
  const tk = todayKeyLocal();
  tutor.studiedDates = tutor.studiedDates || [];
  if (!tutor.studiedDates.includes(tk)) {
    tutor.studiedDates.push(tk);
    // Compute streak
    const yest = new Date(Date.now() - 86400000);
    const yk = `${yest.getFullYear()}-${String(yest.getMonth()+1).padStart(2,"0")}-${String(yest.getDate()).padStart(2,"0")}`;
    tutor.streak = tutor.studiedDates.includes(yk) ? (tutor.streak || 0) + 1 : 1;
    await dbPut("tutors", tutor);
    syncTutorAlarm(tutor); // Auto-cancels today's reminder and schedules next session!
    renderActiveContextBanner();
  }
}

// Đột phá: Auto Tutor smart model routing (Sol for normal drills, Opus/Astra for heavy proofs/essays)
function resolveTutorModelId(tutor, queryText) {
  if (tutor.modelId && tutor.modelId !== "auto_tutor") return tutor.modelId;
  const mods = getAllowedRealModels();
  const isHeavy = (queryText || "").length > 240 || /(chứng minh|bài văn|nghị luận|phân tích sâu|đề thi|vận dụng cao|chấm bài|viết đoạn|giải chi tiết|so sánh)/i.test(queryText || "");
  const pick = prefs => { for (const p of prefs) { const f = mods.find(m => m.id === p || m.mapped === p); if (f) return f.id; } return mods[0]?.id || "gpt-6.2-sol"; };
  return isHeavy
    ? pick(["claude-opus-5-5", "claude-sonnet-5", "gpt-6.2-astra", "gpt-6.2-sol"])
    : pick(["gpt-6.2-sol", "gpt-6-luna"]);
}

// 7.1A + 7.3A + Mistake Bank: Build ultra-smart compact Tutor System Prompt
async function buildTutorSystemPrompt(tutor, queryText) {
  const parts = [
    `BẠN LÀ GIA SƯ AI TÊN "${tutor.name}" CHUYÊN DẠY MÔN: ${tutor.subject}.`,
    `PHONG CÁCH & CHỈ DẪN GIẢNG DẠY: ${tutor.prompt || "Giảng dễ hiểu, ngắn gọn, có ví dụ thực tế và kiểm tra lại kiến thức."}`
  ];
  // 7.1A: Cross-Tutor Awareness (~100 tokens)
  const others = S.tutors.filter(t => t.id !== tutor.id);
  if (others.length) {
    const peerLines = others.map(o => {
      const ds = (o.scheduleDays || []).map(x => WEEK_DAYS.find(w => w[0] === x)?.[1]).join(",");
      const last = (o.studiedDates || []).slice(-1)[0] || "chưa học";
      return `- ${o.name} (môn ${o.subject}, lịch ${ds || "tự do"} lúc ${o.scheduleTime || "20:00"}, buổi gần nhất: ${last})`;
    }).join("\n");
    parts.push(`CÁC GIA SƯ KHÁC ĐANG CÙNG DẠY HỌC VIÊN NÀY (để bạn biết lịch tránh dồn bài quá tải và nhắc khéo tự nhiên khi phù hợp):\n${peerLines}`);
  }
  // 7.3A: Tier 1 Base Files + Tier 2 Real Class Notes (compact digested!)
  if ((tutor.baseFiles || []).length) {
    parts.push("HỒ SƠ TÀI LIỆU NỀN:\n" + tutor.baseFiles.map(f => `[${f.name}]\n${f.digest || (f.content || "").slice(0, 2200)}`).join("\n\n").slice(0, 4500));
  }
  if ((tutor.classNotes || []).length) {
    parts.push("KIẾN THỨC THỰC TẾ TRÊN LỚP & ĐỀ MỚI ĐÃ LƯU:\n" + tutor.classNotes.slice(0, 8).map(n => `- (${n.date}) ${n.title ? n.title + ": " : ""}${n.digest || n.content.slice(0, 600)}`).join("\n").slice(0, 3500));
  }
  // Mistake Bank due items
  const due = getDueMistakes(tutor);
  if (due.length) {
    parts.push("SỔ LỖI HAY SAI CẦN LỒNG GHÉP ÔN LẠI HÔM NAY:\n" + due.slice(0, 4).map(m => `- ${m.note}`).join("\n"));
  }
  return parts.join("\n\n");
}

function detectNewClassKnowledge(text) {
  return /(hôm nay|trên lớp|thầy dạy|cô dạy|giáo viên|mẹo mới|công thức mới|dạng bài mới|đề cương|kiểm tra sắp tới)/i.test(text || "") && (text || "").length >= 18;
}
function buildTutorProactiveBanner(tutor) {
  const studiedToday = (tutor.studiedDates || []).includes(todayKeyLocal());
  const due = getDueMistakes(tutor);
  if (studiedToday && !due.length) return "";
  return `<div class="tutor-proactive-card stagger-item">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
      <strong style="font-size:14px;">Gia sư ${esc(tutor.name)} · ${esc(tutor.subject)}</strong>
      ${tutor.streak ? `<span class="streak-pill">Chuỗi ${tutor.streak} ngày</span>` : `<span class="tag-st st-unused">Buổi học hôm nay</span>`}
    </div>
    <div style="font-size:13px;color:var(--ink-2);line-height:1.5;">
      ${!studiedToday ? esc(tutor.reminderText || `Hôm nay chưa vào học ${tutor.subject} à? Mình đã sẵn sàng giao bài tập & kiến thức mới cho cậu!`) : `Cậu đang có ${due.length} lỗi sai đến lịch ôn lại (1/3/7 ngày).`}
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      ${!studiedToday ? `<button type="button" class="btn-p tap" style="height:36px;font-size:13px;" onclick="triggerTutorDailyStart('${tutor.id}')">Nhận bài tập & Kiến thức hôm nay</button>` : ""}
      ${due.length ? `<button type="button" class="btn-blue tap" style="height:36px;font-size:13px;" onclick="triggerTutorMistakeReview('${tutor.id}')">Ôn lại ${due.length} lỗi hay sai</button>` : ""}
      <button type="button" class="btn-s tap" style="height:36px;font-size:13px;" onclick="openTutorKnowledgeModal('${tutor.id}')">Thêm đề / Ghi chú trên lớp</button>
    </div>
  </div>`;
}
function triggerTutorDailyStart(tutorId) {
  const t = S.tutors.find(x => x.id === tutorId); if (!t) return;
  sendPrompt(`Chào ${t.name}! Hôm nay mình bắt đầu học ${t.subject}. Hãy giao cho mình 1 kiến thức trọng tâm mới (hoặc ôn tiếp bài trước) kèm 2-3 bài tập thực hành vừa sức nhé.`);
}
function triggerTutorMistakeReview(tutorId) {
  const t = S.tutors.find(x => x.id === tutorId); if (!t) return;
  const due = getDueMistakes(t);
  sendPrompt(`Hãy tạo câu hỏi tương tự để kiểm tra lại giúp mình các lỗi hay sai đến hạn ôn hôm nay:\n${due.map((m, i) => `${i + 1}. ${m.note}`).join("\n")}`);
}

function renderTutorsPage() {
  const box = document.getElementById("tutors-body");
  if (!canUseTutors()) {
    box.innerHTML = `<div class="card-item lg-card"><strong>Tính năng Gia sư AI yêu cầu Key hạng Pro Max hoặc Ultra</strong><p class="p-sub" style="margin:6px 0 0;">Nâng cấp gói Key để tự tạo đội ngũ Gia sư AI liên kết lịch học, tự nhắc bài và quản lý sổ lỗi sai.</p></div>`;
    return;
  }
  if (!S.tutors.length) {
    box.innerHTML = `<div class="card-item lg-card"><strong>Chưa có Gia sư AI nào</strong><p class="p-sub" style="margin:6px 0 12px;">Tạo Gia sư cho từng môn học (Toán, Văn, Tiếng Anh, Hóa, Giao dịch...). Khi tạo từ 2 gia sư trở lên, lịch học sẽ tự kiểm tra trùng giờ và các gia sư tự biết lịch của nhau.</p><button type="button" class="btn-p tap" onclick="openTutorEditor()">+ Tạo Gia sư đầu tiên</button></div>`;
    return;
  }
  box.innerHTML = S.tutors.map((t, idx) => {
    const daysLbl = (t.scheduleDays || []).map(x => WEEK_DAYS.find(w => w[0] === x)?.[1]).join(", ") || "Linh hoạt";
    const dueCnt = getDueMistakes(t).length;
    const studiedToday = (t.studiedDates || []).includes(todayKeyLocal());
    const modLbl = t.modelId === "auto_tutor" ? "Auto Tutor" : (S.models.find(m => m.id === t.modelId)?.short || t.modelId);
    return `<div class="card-item lg-card stagger-item" style="--stagger-i:${idx}">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          <strong style="font-size:15.5px;">${esc(t.name)}</strong>
          <span class="tag-st tier-pro">${esc(t.subject)}</span>
          ${studiedToday ? `<span class="tag-st st-active">Đã học hôm nay</span>` : `<span class="tag-st st-pending">Chưa học hôm nay</span>`}
          ${t.streak ? `<span class="streak-pill">Chuỗi ${t.streak}d</span>` : ""}
        </div>
        <span class="tag-quiet">${esc(modLbl)}</span>
      </div>
      <div style="font-size:12.5px;color:var(--ink-2);margin-top:6px;line-height:1.55;">
        Lịch học: <b>${esc(daysLbl)}</b> lúc <b class="num">${esc(t.scheduleTime || "20:00")}</b> · ${(t.baseFiles||[]).length} tệp gốc · ${(t.classNotes||[]).length} ghi chú lớp${dueCnt ? ` · <b style="color:var(--warn-ink);">${dueCnt} lỗi cần ôn</b>` : ""}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;">
        <button type="button" class="btn-p tap" style="height:36px;font-size:13px;" onclick="openTutorWorkspace('${t.id}')">Vào học ngay</button>
        <button type="button" class="btn-blue tap" style="height:36px;font-size:13px;" onclick="openTutorKnowledgeModal('${t.id}')">Kho đề & Sổ lỗi</button>
        <button type="button" class="btn-s tap" style="height:36px;font-size:13px;" onclick="openTutorEditor('${t.id}')">Sửa lịch / Prompt</button>
        <button type="button" class="btn-danger tap" style="height:36px;font-size:13px;" onclick="deleteTutorProfile('${t.id}')">Xóa</button>
      </div>
    </div>`;
  }).join("");
}

function openTutorWorkspace(tutorId) {
  if (!canUseTutors()) return showToast("Gia sư AI yêu cầu Key hạng Pro Max trở lên", "warn");
  S.activeTutorId = tutorId;
  S.activeTeamId = null;
  const existing = S.chats.find(c => c.tutorId === tutorId);
  S.activeChatId = existing ? existing.id : null;
  switchView("chat");
  setWorkMode("chat", false);
  renderMessages(); renderChatsList(); renderMemoryBar(); renderTopContextPill();
}

let tutorDraft = null;
let tutorFileTarget = "base"; // "base" or "note"
function openTutorEditor(tutorId = null) {
  if (!canUseTutors()) return showToast("Gia sư AI yêu cầu Key hạng Pro Max trở lên", "warn");
  const orig = tutorId ? S.tutors.find(t => t.id === tutorId) : null;
  tutorDraft = orig ? JSON.parse(JSON.stringify(orig)) : {
    id: "tutor-" + Date.now(),
    name: "", subject: "", prompt: "Giảng ngắn gọn, trọng tâm thực chiến, chỉ ra bẫy đề thi và kiểm tra lại bằng câu hỏi nhỏ.",
    modelId: "auto_tutor",
    scheduleDays: [1, 3, 5], scheduleTime: "20:00",
    reminderEnabled: true, reminderText: "Nay chưa vào học à? Vào làm nhanh 3 câu luyện tập nào!",
    baseFiles: [], classNotes: [], mistakes: [], studiedDates: [], streak: 0
  };
  switchView("tutor-editor");
  renderTutorEditorBody();
}

function renderTutorEditorBody() {
  const box = document.getElementById("tutor-editor-body");
  if (!box || !tutorDraft) return;
  const mods = getAllowedRealModels();
  const conflicts = findScheduleConflicts(tutorDraft);

  box.innerHTML = `<div class="card-item lg-card">
    <h3 style="font-size:17px;font-weight:520;margin-bottom:4px;">${tutorDraft.name ? "Sửa Gia sư AI" : "Tạo Gia sư AI mới"}</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <div><label class="f-lbl">Tên Gia sư</label><input class="field" value="${esc(tutorDraft.name)}" placeholder="VD: Cô Lan, Thầy Minh" oninput="tutorDraft.name=this.value" /></div>
      <div><label class="f-lbl">Môn học</label><input class="field" value="${esc(tutorDraft.subject)}" placeholder="VD: Toán 12, Tiếng Anh" oninput="tutorDraft.subject=this.value" /></div>
    </div>

    <label class="f-lbl">Model giảng dạy</label>
    <select class="field" onchange="tutorDraft.modelId=this.value">
      <option value="auto_tutor" ${tutorDraft.modelId==="auto_tutor"?"selected":""}>Auto Tutor (Tự chọn thông minh: Sol cho bài cơ bản, mạnh nhất cho bài khó)</option>
      ${mods.map(m => `<option value="${esc(m.id)}" ${tutorDraft.modelId===m.id?"selected":""}>${esc(m.title)} ${m.cost_label?`(${m.cost_label})`:""}</option>`).join("")}
    </select>

    <label class="f-lbl">Phong cách & Chỉ dẫn riêng (Prompt)</label>
    <textarea class="field" rows="4" oninput="tutorDraft.prompt=this.value">${esc(tutorDraft.prompt)}</textarea>

    <label class="f-lbl">Lịch học trong tuần (Tự liên kết & kiểm tra trùng lịch giữa các Gia sư)</label>
    <div class="day-pill-group">
      ${WEEK_DAYS.map(([val, lbl]) => {
        const on = (tutorDraft.scheduleDays || []).includes(val);
        return `<button type="button" class="day-pill tap ${on?"on":""}" onclick="toggleTutorDay(${val})">${lbl}</button>`;
      }).join("")}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
      <div><label class="f-lbl">Khung giờ học</label><input type="time" class="field num" value="${esc(tutorDraft.scheduleTime || "20:00")}" onchange="tutorDraft.scheduleTime=this.value;renderTutorEditorBody()" /></div>
      <div style="display:flex;align-items:flex-end;">
        <div class="s-row" style="padding:8px 10px;background:var(--row-hover);border-radius:10px;" onclick="tutorDraft.reminderEnabled=!tutorDraft.reminderEnabled;this.querySelector('.sw').classList.toggle('on',tutorDraft.reminderEnabled);haptic('switch')">
          <span style="font-size:13px;">Nhắc học</span><div class="sw ${tutorDraft.reminderEnabled!==false?"on":""}"></div>
        </div>
      </div>
    </div>

    ${conflicts.length ? conflicts.map(cf => `<div class="conflict-banner">
      <strong>Trùng lịch học:</strong> ${esc(cf.dayNames)} gần giờ học với Gia sư <b>${esc(cf.other.name)} (${esc(cf.other.subject)} · ${esc(cf.other.scheduleTime)})</b>.
      <button type="button" class="btn-s tap" style="height:26px;padding:0 8px;font-size:11.5px;margin-left:6px;" onclick="tutorDraft.scheduleTime='${cf.suggested}';renderTutorEditorBody()">Đổi sang ${cf.suggested}</button>
    </div>`).join("") : ""}

    <label class="f-lbl">Câu nhắc thông báo (khi hôm đó chưa vào học)</label>
    <input class="field" value="${esc(tutorDraft.reminderText || "")}" placeholder="Nay chưa vào học à?" oninput="tutorDraft.reminderText=this.value" />

    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;">
      <strong style="font-size:13.5px;">Tài liệu gốc / Đề cương nền (${(tutorDraft.baseFiles||[]).length})</strong>
      <button type="button" class="btn-s tap" style="height:32px;font-size:12px;" onclick="tutorFileTarget='base';document.getElementById('in-tutor-file').click()">+ Thêm File gốc</button>
    </div>
    <div class="file-tag-list">
      ${(tutorDraft.baseFiles || []).map((f, i) => `<span class="file-mini-tag">${esc(f.name)}<button type="button" onclick="tutorDraft.baseFiles.splice(${i},1);renderTutorEditorBody()">×</button></span>`).join("") || `<span style="font-size:12px;color:var(--ink-3);">Chưa đính kèm tài liệu nền</span>`}
    </div>
  </div>`;
}
function toggleTutorDay(dayVal) {
  haptic("switch");
  const cur = tutorDraft.scheduleDays || [];
  tutorDraft.scheduleDays = cur.includes(dayVal) ? cur.filter(x => x !== dayVal) : [...cur, dayVal];
  renderTutorEditorBody();
}
async function handleTutorFilePick(files) {
  const targetTutor = tutorFileTarget === "base" ? tutorDraft : S.tutors.find(t => t.id === tutorFileTarget);
  if (!targetTutor) return;
  for (const f of files || []) {
    const txt = (await extractRealFileText(f)).text.slice(0, 30000);
    let digest = "";
    if (txt.length > 3500) {
      showToast(`Đang tóm tắt đề/tài liệu ${f.name} bằng ${S.cfg.repoReaderModel || "GPT 6.2 Sol"}...`);
      try {
        const r = await apiFetch("/ai/digest", { method: "POST", body: { readerModelId: S.cfg.repoReaderModel || "gpt-6.2-sol", instruction: `Trích xuất kiến thức trọng tâm, dạng bài và công thức từ tài liệu "${f.name}" môn ${targetTutor.subject}.`, content: txt } });
        if (r.ok) digest = (await r.json()).digest || "";
      } catch {}
    }
    if (tutorFileTarget === "base") {
      targetTutor.baseFiles = targetTutor.baseFiles || [];
      targetTutor.baseFiles.push({ name: f.name, content: txt.slice(0, 12000), digest });
    } else {
      targetTutor.classNotes = targetTutor.classNotes || [];
      targetTutor.classNotes.unshift({ id: "cn-" + Date.now(), date: todayKeyLocal(), title: f.name, content: txt.slice(0, 10000), digest });
      await dbPut("tutors", targetTutor);
    }
  }
  document.getElementById("in-tutor-file").value = "";
  haptic("ok"); showToast("Đã nạp tài liệu tối ưu token");
  if (tutorFileTarget === "base") renderTutorEditorBody();
  else openTutorKnowledgeModal(targetTutor.id);
}
async function saveTutorProfile() {
  if (!tutorDraft) return;
  if (!tutorDraft.name.trim() || !tutorDraft.subject.trim()) return showToast("Nhập đủ Tên Gia sư và Môn học", "warn");
  await dbPut("tutors", tutorDraft);
  apiFetch("/sync/tutors", { method: "POST", body: tutorDraft }).catch(() => {});
  S.tutors = await dbAll("tutors");
  syncTutorAlarm(tutorDraft);
  haptic("ok"); showToast(`Đã lưu Gia sư ${tutorDraft.name}`, "ok");
  switchView("tutors");
}
async function deleteTutorProfile(id) {
  try { getNativeBg()?.cancelTutorReminder?.({ tutorId: id }); } catch {}
  await dbDel("tutors", id);
  apiFetch("/sync/tutors/" + encodeURIComponent(id), { method: "DELETE" }).catch(() => {});
  S.tutors = S.tutors.filter(t => t.id !== id);
  if (S.activeTutorId === id) S.activeTutorId = null;
  renderTutorsPage(); haptic("ok"); showToast("Đã xóa Gia sư");
}

// 7.3AB + Mistake Bank Manager Modal
function openTutorKnowledgeModal(tutorId) {
  const t = S.tutors.find(x => x.id === tutorId); if (!t) return;
  const notes = t.classNotes || [], mistakes = t.mistakes || [];
  openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:4px;">Kho kiến thức & Sổ lỗi · ${esc(t.name)}</h3>
    <p style="font-size:12px;color:var(--ink-2);margin-bottom:10px;">Lưu đề thi mới, kiến thức dạy trên lớp và lỗi hay sai để Gia sư nhắc ôn sau 1 → 3 → 7 ngày.</p>

    <div style="display:flex;gap:6px;margin-bottom:10px;">
      <button type="button" class="btn-blue tap" style="flex:1;height:36px;font-size:12.5px;" onclick="tutorFileTarget='${t.id}';document.getElementById('in-tutor-file').click()">+ Thêm File Đề / Tài liệu</button>
    </div>

    <label class="f-lbl" style="margin-top:4px;">Ghi chú kiến thức mới học trên lớp</label>
    <div style="display:flex;gap:6px;">
      <input id="tk-note-in" class="field" style="font-size:14px;" placeholder="VD: Hôm nay thầy dạy mẹo giải tích phân từng phần..." />
      <button type="button" class="btn-p tap" style="height:44px;padding:0 14px;" onclick="addManualTutorNote('${t.id}')">Lưu</button>
    </div>

    <div style="margin-top:12px;font-size:13px;font-weight:520;">Nhật ký thực tế & Đề mới (${notes.length})</div>
    <div style="max-height:140px;overflow-y:auto;margin-top:4px;">
      ${notes.map((n, i) => `<div class="mem-chip-row" style="margin-bottom:4px;"><span style="flex:1;"><b>${esc(n.date)}</b> · ${esc(n.title || n.content.slice(0, 72))}</span><button type="button" class="mini-act tap" onclick="delTutorNote('${t.id}',${i})">${ICON_X}</button></div>`).join("") || `<div style="font-size:12px;color:var(--ink-3);">Chưa có ghi chú thực tế nào.</div>`}
    </div>

    <div style="margin-top:14px;font-size:13px;font-weight:520;">Sổ Lỗi Sai & Lịch ôn 1/3/7 ngày (${mistakes.length})</div>
    <div style="display:flex;gap:6px;margin-top:4px;">
      <input id="tk-err-in" class="field" style="font-size:14px;" placeholder="VD: Hay quên điều kiện logarit > 0..." />
      <button type="button" class="btn-s tap" style="height:44px;padding:0 12px;" onclick="addManualTutorMistake('${t.id}')">+ Lỗi</button>
    </div>
    <div style="max-height:150px;overflow-y:auto;margin-top:6px;">
      ${mistakes.map((m, i) => {
        const due = !m.mastered && (m.nextReviewAt || 0) <= Date.now();
        return `<div class="mem-chip-row" style="margin-bottom:4px;">
          <span style="flex:1;">${esc(m.note.slice(0, 80))} <span class="tag-st ${m.mastered?"st-active":(due?"st-pending":"st-unused")}">${m.mastered?"Đã thuộc":(due?"Đến hạn ôn":`Mốc ${m.stageDays||1}d`)}</span></span>
          ${!m.mastered ? `<button type="button" class="btn-s tap" style="height:26px;padding:0 8px;font-size:11px;" onclick="advanceTutorMistake('${t.id}',${i})">Đã nhớ</button>` : ""}
          <button type="button" class="mini-act tap" onclick="delTutorMistake('${t.id}',${i})">${ICON_X}</button>
        </div>`;
      }).join("") || `<div style="font-size:12px;color:var(--ink-3);">Chưa có lỗi sai nào được ghi nhận.</div>`}
    </div>

    <div style="display:flex;justify-content:flex-end;margin-top:12px;">
      <button type="button" class="btn-p tap" onclick="closeModal()">Đóng</button>
    </div>`);
}
async function addManualTutorNote(tid) {
  const t = S.tutors.find(x => x.id === tid), v = document.getElementById("tk-note-in")?.value.trim();
  if (!t || !v) return;
  t.classNotes = t.classNotes || [];
  t.classNotes.unshift({ id: "cn-" + Date.now(), date: todayKeyLocal(), title: "", content: v, digest: "" });
  await dbPut("tutors", t); haptic("ok"); openTutorKnowledgeModal(tid);
}
async function delTutorNote(tid, idx) {
  const t = S.tutors.find(x => x.id === tid); if (!t) return;
  t.classNotes.splice(idx, 1); await dbPut("tutors", t); openTutorKnowledgeModal(tid);
}
async function addManualTutorMistake(tid) {
  const t = S.tutors.find(x => x.id === tid), v = document.getElementById("tk-err-in")?.value.trim();
  if (!t || !v) return;
  t.mistakes = t.mistakes || [];
  t.mistakes.unshift({ id: "mk-" + Date.now(), note: v, stageDays: 1, nextReviewAt: Date.now() + 86400000, mastered: false });
  await dbPut("tutors", t); haptic("ok"); openTutorKnowledgeModal(tid);
}
async function advanceTutorMistake(tid, idx) {
  const t = S.tutors.find(x => x.id === tid), m = t?.mistakes?.[idx]; if (!m) return;
  if (m.stageDays === 1) { m.stageDays = 3; m.nextReviewAt = Date.now() + 3 * 86400000; }
  else if (m.stageDays === 3) { m.stageDays = 7; m.nextReviewAt = Date.now() + 7 * 86400000; }
  else { m.mastered = true; }
  await dbPut("tutors", t); haptic("ok"); openTutorKnowledgeModal(tid); renderActiveContextBanner();
}
async function delTutorMistake(tid, idx) {
  const t = S.tutors.find(x => x.id === tid); if (!t) return;
  t.mistakes.splice(idx, 1); await dbPut("tutors", t); openTutorKnowledgeModal(tid); renderActiveContextBanner();
}
async function saveMessageToTutorNotes(tid, msgId) {
  const t = S.tutors.find(x => x.id === tid);
  const chat = S.chats.find(c => c.id === S.activeChatId);
  const msg = chat?.messages.find(m => m.id === msgId);
  if (!t || !msg?.text) return;
  t.classNotes = t.classNotes || [];
  t.classNotes.unshift({ id: "cn-" + Date.now(), date: todayKeyLocal(), title: "Ghi chú trong buổi học", content: msg.text.slice(0, 2000), digest: "" });
  msg.suggestSaveTutorId = null;
  await dbPut("tutors", t);
  renderMessages(); haptic("ok"); showToast(`Đã lưu vào Kho Gia sư ${t.name}`, "ok");
}
function dismissTutorSuggest(msgId) {
  const msg = S.chats.find(c => c.id === S.activeChatId)?.messages.find(m => m.id === msgId);
  if (msg) { msg.suggestSaveTutorId = null; renderMessages(); }
}
async function saveReplyToTutorMistake(tid, msgId) {
  const t = S.tutors.find(x => x.id === tid);
  const txt = getMsgText(msgId);
  if (!t || !txt) return;
  t.mistakes = t.mistakes || [];
  t.mistakes.unshift({ id: "mk-" + Date.now(), note: txt.replace(/[#*`]/g, "").slice(0, 200), stageDays: 1, nextReviewAt: Date.now() + 86400000, mastered: false });
  await dbPut("tutors", t);
  haptic("ok"); showToast("Đã thêm vào Sổ Lỗi Sai (sẽ nhắc ôn sau 1 ngày)", "ok");
}


/* =========================================================================
   v3.4 MODULE 1: MCP HUB (BUILT-IN TOOLS + REMOTE HTTP/SSE MCP SERVERS — 1B + ĐỘT PHÁ)
   ========================================================================= */
const BUILTIN_MCP_META = [
  { id: "linkReader", name: "Đọc Link & GitHub MCP", desc: "Tự đọc file GitHub, cây Repo (lọc gọn qua GPT 6.2 Sol), YouTube & trang web khi dán link", minTier: "classic" },
  { id: "webSearch", name: "Tìm kiếm Web Live MCP", desc: "Tự tra cứu thông tin thời sự, giá cả, tài liệu mới nhất kèm thẻ nguồn trích dẫn", minTier: "pro" },
  { id: "contextSync", name: "Hồ sơ boi-canh.md MCP", desc: "Đọc & đồng bộ 1 file ngữ cảnh chung duy nhất cho mọi model và Đội ngũ AI", minTier: "classic" },
  { id: "builderAssist", name: "Trợ lý lập Team & Gia sư MCP", desc: "Cho phép API AI thiết kế hộ Đội ngũ AI / Gia sư AI và hiện nút Lưu 1 chạm ngay trong chat", minTier: "pro_max" },
  { id: "utilities", name: "Tiện ích Ngày giờ & Tính toán MCP", desc: "Cung cấp ngày giờ thực tế (VN) chính xác để tránh AI đoán sai thời gian", minTier: "classic" }
];

function canUseRemoteMcp() { return S.user?.role === "admin" || ["pro_max", "ultra"].includes(S.user?.keyTier); }
function canUseWebSearch() { return S.user?.role === "admin" || ["pro", "pro_max", "ultra"].includes(S.user?.keyTier); }

function renderMcpQuickBadge() {
  const bOn = Object.values(S.cfg.mcpBuiltin || {}).filter(Boolean).length;
  const rOn = (S.mcpServers || []).filter(s => s.enabled !== false).length;
  const total = bOn + rOn;
  const lbl = document.getElementById("mcp-quick-lbl");
  const btn = document.getElementById("btn-mcp-quick");
  if (lbl) lbl.textContent = total ? `MCP (${total})` : "MCP";
  if (btn) btn.classList.toggle("has-active", rOn > 0 || Boolean(S.cfg.mcpBuiltin?.webSearch));
  const sbB = document.getElementById("sb-mcp-badge");
  if (sbB) sbB.textContent = rOn ? `${total} bật` : "MCP";
}

function renderMcpPage() {
  const box = document.getElementById("mcp-body");
  if (!box) return;
  const bi = S.cfg.mcpBuiltin || {};
  const remoteAllowed = canUseRemoteMcp();

  const builtInHtml = `<div class="card-item lg-card">
    <strong style="display:block;font-size:15px;margin-bottom:4px;">MCP Tích hợp sẵn (Built-in Tools)</strong>
    <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:10px;">Bật/tắt tức thì các công cụ thông minh chạy trực tiếp trên máy chủ API AI.</p>
    ${BUILTIN_MCP_META.map(m => {
      const on = bi[m.id] !== false;
      return `<div class="s-row" onclick="toggleBuiltinMcp('${m.id}')">
        <div style="min-width:0;flex:1;padding-right:8px;">
          <div style="font-size:14px;font-weight:500;">${esc(m.name)}</div>
          <div style="font-size:12px;color:var(--ink-3);margin-top:2px;">${esc(m.desc)}</div>
        </div>
        <div class="sw ${on?"on":""}"></div>
      </div>`;
    }).join("")}
  </div>`;

  const remoteListHtml = !remoteAllowed
    ? `<div class="card-item lg-card"><strong>Remote MCP Server (HTTP / SSE)</strong><p class="p-sub" style="margin:6px 0 0;">Kết nối máy chủ MCP bên ngoài (Context7, Tavily, Zapier, n8n...) yêu cầu Key hạng <b>Pro Max</b> hoặc <b>Ultra</b>.</p></div>`
    : `<div style="display:flex;justify-content:space-between;align-items:center;margin:14px 0 8px;">
        <strong style="font-size:15px;">Remote MCP Servers (${(S.mcpServers || []).length})</strong>
        <button type="button" class="btn-blue tap" style="height:34px;font-size:12.5px;" onclick="openAddMcpServerModal()">+ Kết nối Server</button>
      </div>
      ${(S.mcpServers || []).length ? S.mcpServers.map((sv, idx) => `
        <div class="card-item lg-card stagger-item" style="--stagger-i:${idx}">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <div style="min-width:0;flex:1;">
              <strong>${esc(sv.name)}</strong>
              <span class="tag-st ${sv.enabled!==false?"st-active":"st-revoked"}">${(sv.tools||[]).length} tools</span>
              <div style="font-size:11.5px;font-family:var(--font-mono);color:var(--ink-3);margin-top:3px;word-break:break-all;">${esc(sv.url)}</div>
            </div>
            <div class="sw ${sv.enabled!==false?"on":""}" onclick="toggleRemoteMcp('${sv.id}')"></div>
          </div>
          ${(sv.tools||[]).length ? `<div class="file-tag-list">${sv.tools.slice(0, 8).map(t => `<span class="file-mini-tag">${esc(t.name)}</span>`).join("")}</div>` : ""}
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">
            <button type="button" class="btn-s tap" style="height:32px;font-size:12px;" onclick="rediscoverMcpServer('${sv.id}')">Quét lại Tools</button>
            <button type="button" class="btn-danger tap" style="height:32px;font-size:12px;" onclick="deleteMcpServer('${sv.id}')">Xóa</button>
          </div>
        </div>`).join("") : `<div class="card-item lg-card" style="color:var(--ink-3);font-size:13px;">Chưa kết nối Remote MCP Server nào. Bấm <b>+ Thêm MCP Server</b> để gắn máy chủ chuẩn HTTP/SSE (ví dụ Context7, Zapier MCP, n8n MCP...).</div>`}`;

  box.innerHTML = builtInHtml + remoteListHtml;
}

function toggleBuiltinMcp(id) {
  haptic("switch");
  S.cfg.mcpBuiltin = S.cfg.mcpBuiltin || { ...DEFAULT_CFG.mcpBuiltin };
  S.cfg.mcpBuiltin[id] = S.cfg.mcpBuiltin[id] === false ? true : false;
  dbPut("kv", S.cfg);
  renderMcpQuickBadge();
  renderMcpPage();
}

function openAddMcpServerModal() {
  if (!canUseRemoteMcp()) return showToast("Remote MCP Server yêu cầu Key hạng Pro Max trở lên", "warn");
  openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:6px;">Kết nối Remote MCP Server</h3>
    <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:10px;">Hỗ trợ chuẩn Streamable HTTP / SSE (JSON-RPC 2.0). Hệ thống tự quét <code>tools/list</code> và bảo vệ SSRF.</p>
    <label class="f-lbl">Tên hiển thị</label><input id="mcp-name" class="field" placeholder="VD: Context7 Docs, n8n Agent" />
    <label class="f-lbl">MCP Endpoint URL (https://...)</label><input id="mcp-url" class="field" placeholder="https://mcp.example.com/mcp" />
    <label class="f-lbl">Bearer Token / API Key (tùy chọn)</label><input id="mcp-tok" type="password" class="field" placeholder="Để trống nếu server public" />
    <div id="mcp-st" style="font-size:12.5px;color:var(--accent-ink);margin-top:8px;min-height:18px;"></div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
      <button type="button" class="btn-s tap" onclick="closeModal()">Hủy</button>
      <button type="button" id="mcp-save-btn" class="btn-p tap" onclick="commitNewMcpServer()">Quét Tools & Lưu</button>
    </div>`);
}

async function commitNewMcpServer() {
  const name = document.getElementById("mcp-name").value.trim();
  const url = document.getElementById("mcp-url").value.trim();
  const tok = document.getElementById("mcp-tok").value.trim();
  const st = document.getElementById("mcp-st"), btn = document.getElementById("mcp-save-btn");
  if (!name || !url.startsWith("http")) return showToast("Nhập đủ Tên và URL hợp lệ", "warn");
  const headers = tok ? { Authorization: `Bearer ${tok}` } : {};
  btn.disabled = true; st.textContent = "Đang gọi tools/list từ MCP Server...";
  try {
    const r = await apiFetch("/mcp/discover", { method: "POST", body: { url, headers } });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Không kết nối được MCP Server");
    const sv = { id: "mcp-" + Date.now(), name, url, headers, enabled: true, tools: d.tools || [], updatedAt: Date.now() };
    await dbPut("mcp", sv);
    apiFetch("/sync/mcp", { method: "POST", body: sv }).catch(() => {});
    S.mcpServers = await dbAll("mcp");
    closeModal(); renderMcpQuickBadge(); renderMcpPage(); haptic("ok");
    showToast(`Đã kết nối ${name} (${sv.tools.length} công cụ)`, "ok");
  } catch (e) {
    haptic("err"); st.textContent = "Lỗi: " + e.message;
  } finally { btn.disabled = false; }
}

async function toggleRemoteMcp(id) {
  haptic("switch");
  const sv = S.mcpServers.find(x => x.id === id); if (!sv) return;
  sv.enabled = sv.enabled === false ? true : false;
  await dbPut("mcp", sv);
  apiFetch("/sync/mcp", { method: "POST", body: sv }).catch(() => {});
  renderMcpQuickBadge(); renderMcpPage();
}
async function rediscoverMcpServer(id) {
  const sv = S.mcpServers.find(x => x.id === id); if (!sv) return;
  showToast(`Đang quét lại tools từ ${sv.name}...`);
  try {
    const r = await apiFetch("/mcp/discover", { method: "POST", body: { url: sv.url, headers: sv.headers } });
    const d = await r.json(); if (!r.ok) throw new Error(d.error);
    sv.tools = d.tools || []; sv.updatedAt = Date.now();
    await dbPut("mcp", sv);
    apiFetch("/sync/mcp", { method: "POST", body: sv }).catch(() => {});
    renderMcpPage(); haptic("ok"); showToast(`Tìm thấy ${sv.tools.length} tools`, "ok");
  } catch (e) { haptic("err"); showToast(e.message, "err"); }
}
async function deleteMcpServer(id) {
  await dbDel("mcp", id);
  apiFetch("/sync/mcp/" + encodeURIComponent(id), { method: "DELETE" }).catch(() => {});
  S.mcpServers = S.mcpServers.filter(x => x.id !== id);
  renderMcpQuickBadge(); renderMcpPage(); haptic("ok"); showToast("Đã xóa MCP Server");
}

/* =========================================================================
   v3.4 MODULE 2: PRE-FLIGHT VISUAL STEP ENGINE (SMART LINK + WEB SEARCH + REMOTE MCP — video_1.mp4!)
   ========================================================================= */
function renderToolStepsBlock(m) {
  const steps = m.toolSteps || [];
  if (!steps.length) return "";
  return `<div class="tool-steps-wrap">${steps.map(st => {
    const ico = st.status === "running"
      ? `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>`
      : (st.status === "err"
        ? `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>`
        : `<svg class="check-draw" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>`);
    const hasRaw = Boolean(st.raw);
    return `<div class="tool-step-card ${st.status}">
      <button type="button" class="tool-step-head tap-soft" onclick="${hasRaw ? `toggleAcc('ts-${st.id}','tsc-${st.id}')` : ""}">
        <span class="tool-step-l">
          <span class="tool-step-ico">${ico}</span>
          <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(st.label)}</span>
        </span>
        <span style="display:inline-flex;align-items:center;gap:6px;flex-shrink:0;font-size:11px;color:var(--ink-3);" class="num">
          ${st.ms ? `${(st.ms / 1000).toFixed(1)}s` : ""}
          ${hasRaw ? `<span id="tsc-${st.id}" class="chev"><svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></span>` : ""}
        </span>
      </button>
      ${hasRaw ? `<div id="ts-${st.id}" class="acc-wrap"><div class="acc-inner"><div class="tool-step-raw">${esc(st.raw)}</div></div></div>` : ""}
    </div>`;
  }).join("")}</div>`;
}

function renderSourcesStrip(sources) {
  if (!Array.isArray(sources) || !sources.length) return "";
  return `<div class="sources-strip">${sources.map(s => {
    let host = s.url || "";
    try { host = new URL(s.url).hostname.replace(/^www\./, ""); } catch {}
    return `<a class="source-card tap-soft" href="${esc(s.url)}" target="_blank" rel="noopener">
      <span class="source-host">${esc(host)}</span>
      <span class="source-title">${esc(s.title || host)}</span>
    </a>`;
  }).join("")}</div>`;
}

function shouldAutoWebSearch(text) {
  if (S.activeTool === "web_search" || S.activeTool === "deep_research") return true;
  if (S.cfg.mcpBuiltin?.webSearch === false || !canUseWebSearch()) return false;
  return /(hôm nay|mới nhất|giá\s+(vàng|xăng|đô|usd|btc|eth|cổ phiếu)|tin\s+tức|thời\s+tiết|tỷ\s+giá|kết\s+quả\s+(bóng|xổ\s+số|thi)|tra\s+cứu\s+web|tìm\s+trên\s+mạng|cập\s+nhật\s+202[567])/i.test(text || "");
}

async function runPreFlightToolsAndMcp(aiMsg, text, chosenUi) {
  const ctxBlocks = [];
  const pushStep = (label) => {
    const st = { id: "s" + Date.now() + Math.random().toString(36).slice(2, 5), label, status: "running", start: Date.now(), ms: 0, raw: "" };
    aiMsg.toolSteps.push(st);
    renderMessages(); scrollToBottom(false);
    return st;
  };
  const endStep = (st, status, label = null, raw = "") => {
    st.status = status;
    st.ms = Date.now() - st.start;
    if (label) st.label = label;
    if (raw) st.raw = raw.slice(0, 3000);
    renderMessages(); scrollToBottom(false);
  };

  // 0. Utility MCP: inject accurate VN date/time
  if (S.cfg.mcpBuiltin?.utilities !== false) {
    ctxBlocks.push(`[THỜI GIAN THỰC TẠI VIỆT NAM]: ${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`);
  }

  // 1. Smart URL & GitHub Link Reader (3AB + video_1.mp4)
  if (S.cfg.mcpBuiltin?.linkReader !== false) {
    const urls = [...new Set((text || "").match(/https?:\/\/[^\s<>()]+/gi) || [])].slice(0, 2);
    for (const u of urls) {
      const cleanU = u.replace(/[.,;!?)]+$/, "");
      const st = pushStep(`Đang đọc đường link: ${cleanU.slice(0, 46)}...`);
      try {
        const r = await apiFetch("/ai/fetch-url", { method: "POST", body: { url: cleanU } });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Không đọc được link");
        let contentForMain = d.content || "";
        if (d.kind === "github_repo") {
          aiMsg.fetchedRepoUrl = cleanU;
          endStep(st, "done", `Đã đọc Repo ${d.title} (${d.meta?.fileCount || 0} tệp${d.cached ? " · Cache" : ""})`, contentForMain);
          // Cheap GPT 6.2 Sol digest if main model is expensive (>= x2.0) to avoid 500K token burn!
          if (Number(chosenUi?.cost_multiplier || 1.2) >= 2.0 && contentForMain.length > 2600) {
            const st2 = pushStep(`Lọc cấu trúc & phụ thuộc bằng ${S.cfg.repoReaderModel || "GPT 6.2 Sol"}...`);
            try {
              const dr = await apiFetch("/ai/digest", {
                method: "POST",
                body: {
                  readerModelId: S.cfg.repoReaderModel || "gpt-6.2-sol",
                  instruction: `Người dùng gửi repo ${d.title} kèm yêu cầu: "${text.slice(0, 300)}". Trích xuất cấu trúc lõi, dependencies, điểm vào và thông tin cần thiết nhất.`,
                  content: contentForMain
                }
              });
              if (dr.ok) {
                const dj = await dr.json();
                if (dj.digest) { contentForMain = dj.digest; endStep(st2, "done", `Đã tối ưu ngữ cảnh Repo (${dj.readerModel})`, dj.digest); }
                else endStep(st2, "done", "Đã chuẩn bị ngữ cảnh Repo");
              } else endStep(st2, "done", "Dùng trực tiếp cấu trúc Repo");
            } catch { endStep(st2, "done", "Dùng trực tiếp cấu trúc Repo"); }
          }
        } else {
          endStep(st, "done", `Đã đọc ${d.kind === "github_file" ? "file GitHub" : (d.kind === "youtube" ? "YouTube" : "trang web")}: ${d.title || cleanU}`, contentForMain);
        }
        aiMsg.sources.push({ title: d.title || cleanU, url: cleanU });
        ctxBlocks.push(`[DỮ LIỆU ĐÃ ĐỌC TỪ LINK ${cleanU}]:\n${contentForMain}`);
      } catch (e) {
        endStep(st, "err", `Không đọc được link: ${e.message}`);
      }
    }
  }

  // 2. Live Web Search MCP (6B)
  if (shouldAutoWebSearch(text) && canUseWebSearch()) {
    const st = pushStep("Đang tìm kiếm Web thời gian thực...");
    try {
      const r = await apiFetch("/ai/web-search", { method: "POST", body: { query: text.replace(/https?:\/\/\S+/g, "").trim().slice(0, 220) } });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Lỗi tìm kiếm");
      const items = d.results || [];
      items.forEach(it => aiMsg.sources.push({ title: it.title, url: it.url }));
      const txt = items.map((it, i) => `[${i + 1}] ${it.title} (${it.url})\n${it.snippet}`).join("\n\n");
      endStep(st, "done", `Tìm kiếm Web (${items.length} nguồn liên quan)`, txt);
      if (items.length) ctxBlocks.push(`[KẾT QUẢ TÌM KIẾM WEB TRỰC TIẾP]:\n${txt}`);
    } catch (e) {
      endStep(st, "err", `Tìm kiếm Web thất bại: ${e.message}`);
    }
  }

  // 3. Remote MCP Server Tool Calling (1B + Đột phá)
  const activeMcps = (S.mcpServers || []).filter(s => s.enabled !== false && (s.tools || []).length);
  if (activeMcps.length && canUseRemoteMcp()) {
    const catalog = [];
    activeMcps.forEach(sv => (sv.tools || []).slice(0, 12).forEach(t => catalog.push({ serverId: sv.id, serverName: sv.name, toolName: t.name, desc: t.description })));
    const planStep = pushStep(`MCP Router đang kiểm tra ${catalog.length} công cụ...`);
    try {
      const pr = await apiFetch("/ai/digest", {
        method: "POST",
        body: {
          readerModelId: S.cfg.repoReaderModel || "gpt-6.2-sol",
          instruction: `Danh sách MCP tools: ${JSON.stringify(catalog.map(c => ({ serverId: c.serverId, toolName: c.toolName, desc: c.desc })))}. Nếu yêu cầu người dùng CẦN gọi 1-2 tool ở trên để lấy dữ liệu thật, trả về ĐÚNG 1 mảng JSON: [{"serverId":"...","toolName":"...","arguments":{...}}]. Nếu không cần gọi tool nào, trả về đúng []. KHÔNG viết chữ giải thích.`,
          content: `Yêu cầu người dùng: ${text}`
        }
      });
      let calls = [];
      if (pr.ok) {
        const pj = await pr.json();
        const jm = String(pj.digest || "").match(/\[[\s\S]*\]/);
        if (jm) { try { calls = JSON.parse(jm[0]); } catch {} }
      }
      if (!Array.isArray(calls) || !calls.length) {
        endStep(planStep, "done", "MCP: Trả lời trực tiếp không cần gọi tool ngoài");
      } else {
        endStep(planStep, "done", `MCP chọn ${Math.min(2, calls.length)} công cụ phù hợp`);
        for (const call of calls.slice(0, 2)) {
          const sv = activeMcps.find(x => x.id === call.serverId);
          if (!sv) continue;
          const tSt = pushStep(`MCP gọi ${sv.name} · ${call.toolName}...`);
          try {
            const cr = await apiFetch("/mcp/call", { method: "POST", body: { url: sv.url, headers: sv.headers, toolName: call.toolName, arguments: call.arguments || {} } });
            const cj = await cr.json();
            if (!cr.ok) throw new Error(cj.error || "Tool error");
            endStep(tSt, "done", `MCP ${sv.name} · ${call.toolName}`, cj.text || "");
            ctxBlocks.push(`[KẾT QUẢ TỪ MCP ${sv.name}/${call.toolName}]:\n${cj.text || ""}`);
          } catch (e) {
            endStep(tSt, "err", `MCP ${call.toolName} lỗi: ${e.message}`);
          }
        }
      }
    } catch {
      endStep(planStep, "done", "MCP bỏ qua bước gọi tool ngoài");
    }
  }

  return ctxBlocks.join("\n\n");
}

async function quickImportRepoFromLink(repoUrl) {
  if (!canUseGithubSkills()) return showToast("Cần Key hạng Pro Max trở lên để lưu Repo vào Skills", "warn");
  openGithubImportModal();
  setTimeout(() => {
    const ip = document.getElementById("gh-url");
    if (ip) ip.value = repoUrl;
  }, 50);
}
function sendRepoTaskToTeam(repoUrl, msgId) {
  if (!canUseTeams()) return showToast("Đội ngũ AI yêu cầu Key hạng Pro Max trở lên", "warn");
  const txt = getMsgText(msgId);
  openTeamWorkspace(S.teams[0]?.id || "team-coding-4agent");
  const ta = document.getElementById("prompt-in");
  if (ta) {
    ta.value = `Dựa trên Repo ${repoUrl} và bản phân tích sau, hãy xây dựng giải pháp hoàn chỉnh:\n\n${txt.slice(0, 1200)}`;
    autoGrow(); updateOrbButton(); ta.focus();
  }
}

/* =========================================================================
   v3.4 MODULE 3: BOI-CANH.MD UPGRADE HUB INSIDE TEAMS + 5-VERSION ROLLBACK (2AB + ĐỘT PHÁ)
   ========================================================================= */
function buildTeamsContextHubHtml() {
  return `<div style="display:flex;justify-content:space-between;align-items:center;margin:20px 0 8px;">
    <div>
      <strong style="font-size:15px;">Hồ sơ Bối cảnh Chung (boi-canh.md)</strong>
      <div style="font-size:12px;color:var(--ink-3);">Bản nâng cấp dùng chung cho mọi thành viên GPT & Claude · Lưu lịch sử 5 phiên bản</div>
    </div>
    <button type="button" class="btn-s tap" style="height:34px;font-size:12.5px;" onclick="openSharedContextEditor(null)">+ Tạo boi-canh.md</button>
  </div>
  ${S.contexts.length ? S.contexts.map((c, idx) => `
    <div class="card-item lg-card stagger-item" style="--stagger-i:${idx}">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap;">
        <strong style="font-family:var(--font-mono);font-size:13.5px;">${esc(c.title)}</strong>
        <span class="tag-quiet num">${(c.history || []).length} bản lưu cũ</span>
      </div>
      <div style="font-size:12.5px;color:var(--ink-2);margin-top:5px;white-space:pre-line;">${esc((c.content || "").slice(0, 180))}${(c.content||"").length>180?"...":""}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">
        <button type="button" class="btn-s tap" style="height:32px;font-size:12px;" onclick="openSharedContextEditor('${c.id}')">Xem / Sửa</button>
        ${(c.history || []).length ? `<button type="button" class="btn-s tap" style="height:32px;font-size:12px;" onclick="openContextHistoryModal('${c.id}')">Khôi phục phiên bản (${c.history.length})</button>` : ""}
        <button type="button" class="btn-danger tap" style="height:32px;font-size:12px;" onclick="deleteSharedContext('${c.id}');renderTeamsPage()">Xóa</button>
      </div>
    </div>`).join("") : `<div class="card-item lg-card" style="font-size:13px;color:var(--ink-3);">Chưa có hồ sơ <b>boi-canh.md</b>. Tạo 1 file dùng chung để các thành viên trong Team luôn đồng bộ cùng 1 nguồn sự thật.</div>`}`;
}

function openContextHistoryModal(ctxId) {
  const c = S.contexts.find(x => x.id === ctxId); if (!c) return;
  const hist = c.history || [];
  openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:6px;">Lịch sử phiên bản · ${esc(c.title)}</h3>
    <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:10px;">Khôi phục lại tối đa 5 phiên bản trước đó chỉ với 1 chạm.</p>
    <div style="max-height:55dvh;overflow-y:auto;">
      ${hist.map((h, i) => `<div class="card-item lg-card" style="padding:10px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <strong style="font-size:12.5px;">Bản cũ #${i + 1} · ${new Date(h.ts).toLocaleString("vi-VN")}</strong>
          <button type="button" class="btn-blue tap" style="height:28px;padding:0 10px;font-size:11.5px;" onclick="restoreContextVersion('${c.id}',${i})">Khôi phục</button>
        </div>
        <div style="font-size:12px;color:var(--ink-2);white-space:pre-line;">${esc((h.content || "").slice(0, 180))}...</div>
      </div>`).join("")}
    </div>
    <div style="display:flex;justify-content:flex-end;margin-top:10px;"><button type="button" class="btn-s tap" onclick="closeModal()">Đóng</button></div>`);
}
async function restoreContextVersion(ctxId, histIdx) {
  const c = S.contexts.find(x => x.id === ctxId); if (!c || !c.history?.[histIdx]) return;
  const target = c.history[histIdx];
  c.history = [{ ts: c.updatedAt || Date.now(), content: c.content }, ...c.history.filter((_, i) => i !== histIdx)].slice(0, 5);
  c.content = target.content; c.updatedAt = Date.now();
  await dbPut("contexts", c);
  apiFetch("/sync/contexts", { method: "POST", body: c }).catch(() => {});
  closeModal(); renderTeamsPage(); haptic("ok"); showToast(`Đã khôi phục ${c.title}`, "ok");
}

/* =========================================================================
   v3.4 MODULE 4: CONVERSATIONAL & 1-TAP AI BUILDER FOR TEAMS & TUTORS (4AB + ĐỘT PHÁ)
   ========================================================================= */
function openAiAssistBuilderModal(kind) {
  if ((kind === "team" && !canUseTeams()) || (kind === "tutor" && !canUseTutors())) {
    return showToast("Tính năng này yêu cầu Key hạng Pro Max trở lên", "warn");
  }
  const isTeam = kind === "team";
  openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:6px;">${isTeam ? "Nhờ API AI thiết lập Đội ngũ hộ" : "Nhờ API AI lập Gia sư môn học hộ"}</h3>
    <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:10px;">${isTeam ? "Chỉ cần mô tả mục tiêu công việc, AI sẽ tự thiết kế 2–6 thành viên, phân vai trò, prompt chuẩn và chọn model tối ưu cho bạn." : "Nhập môn học & mục tiêu, AI sẽ tự chọn khung giờ không bị trùng lịch với các gia sư khác, viết phong cách dạy và câu nhắc học."}</p>
    <textarea id="aib-goal" class="field" rows="3" placeholder="${isTeam ? "VD: Lập team xây kịch bản & phân tích kênh TikTok công nghệ..." : "VD: Lập gia sư ôn thi THPT Quốc gia môn Tiếng Anh, nghiêm khắc, hay bẫy từ vựng..."}"></textarea>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
      <button type="button" class="btn-s tap" onclick="closeModal()">Hủy</button>
      <button type="button" class="btn-p tap" onclick="launchAiAssistBuilder('${kind}')">Thiết kế ngay</button>
    </div>`);
}
function launchAiAssistBuilder(kind) {
  const goal = document.getElementById("aib-goal")?.value.trim();
  if (!goal) return showToast("Nhập mục tiêu bạn muốn thiết lập", "warn");
  closeModal();
  S.activeTeamId = null; S.activeTutorId = null; S.activeChatId = null;
  switchView("chat"); setWorkMode("chat", false);
  const prompt = kind === "team"
    ? `Hãy thiết kế hộ tôi một Đội ngũ AI (Team) hoàn chỉnh kèm khối apiai-builder để tôi bấm lưu dùng ngay cho mục tiêu: ${goal}`
    : `Hãy lập hộ tôi một Gia sư AI hoàn chỉnh (tự chọn khung giờ trống không trùng các gia sư hiện có) kèm khối apiai-builder để tôi bấm lưu học ngay cho mục tiêu: ${goal}`;
  sendPrompt(prompt);
}

async function applyAiBuilderCard(bid, saveDirect) {
  const obj = builderPayloadMap.get(bid);
  if (!obj) return showToast("Không tìm thấy dữ liệu đề xuất", "err");
  const mods = getAllowedRealModels();
  const defMod = mods[0]?.id || "gpt-6.2-sol";

  if (obj.kind === "team") {
    if (!canUseTeams()) return showToast("Đội ngũ AI yêu cầu Key hạng Pro Max trở lên", "warn");
    const built = {
      id: "team-" + Date.now(),
      name: String(obj.name || "Team mới").slice(0, 60),
      desc: String(obj.desc || "").slice(0, 180),
      builtin: false,
      coordMode: obj.coordMode === "council" ? "council" : "sequential",
      pauseAfterFirst: Boolean(obj.pauseAfterFirst),
      maxFixLoops: Math.max(0, Math.min(2, Number(obj.maxFixLoops || 0))),
      members: (Array.isArray(obj.members) ? obj.members : []).slice(0, 6).map((m, i) => ({
        id: "m-" + Date.now() + "-" + i,
        role: String(m.role || `Thành viên ${i + 1}`),
        prompt: String(m.prompt || ""),
        modelId: mods.some(x => x.id === m.modelId) ? m.modelId : defMod,
        enabled: true,
        files: []
      }))
    };
    if (built.members.length < 2) return showToast("Team cần ít nhất 2 thành viên", "warn");
    if (saveDirect) {
      await dbPut("teams", built);
      apiFetch("/sync/teams", { method: "POST", body: built }).catch(() => {});
      S.teams = await dbAll("teams");
      haptic("ok"); showToast(`Đã lưu & mở ${built.name}`, "ok");
      openTeamWorkspace(built.id);
    } else {
      teamDraft = built; switchView("team-editor"); renderTeamEditorBody();
    }
    return;
  }

  if (obj.kind === "tutor") {
    if (!canUseTutors()) return showToast("Gia sư AI yêu cầu Key hạng Pro Max trở lên", "warn");
    const built = {
      id: "tutor-" + Date.now(),
      name: String(obj.name || "Gia sư AI").slice(0, 50),
      subject: String(obj.subject || "Học tập").slice(0, 50),
      prompt: String(obj.prompt || "Giảng dễ hiểu, trọng tâm thực chiến."),
      modelId: obj.modelId === "auto_tutor" || mods.some(x => x.id === obj.modelId) ? obj.modelId : "auto_tutor",
      scheduleDays: Array.isArray(obj.scheduleDays) && obj.scheduleDays.length ? obj.scheduleDays : [1, 3, 5],
      scheduleTime: /^\d{2}:\d{2}$/.test(String(obj.scheduleTime || "")) ? obj.scheduleTime : "20:00",
      reminderEnabled: true,
      reminderText: String(obj.reminderText || `Nay chưa vào học ${obj.subject || ""} à?`),
      baseFiles: [], classNotes: [], mistakes: [], studiedDates: [], streak: 0
    };
    // Auto-resolve any schedule conflict automatically!
    const cfs = findScheduleConflicts(built);
    if (cfs.length) built.scheduleTime = cfs[0].suggested;

    if (saveDirect) {
      await dbPut("tutors", built);
      apiFetch("/sync/tutors", { method: "POST", body: built }).catch(() => {});
      S.tutors = await dbAll("tutors");
      syncTutorAlarm(built);
      haptic("ok"); showToast(`Đã lưu Gia sư ${built.name} (${built.scheduleTime})`, "ok");
      openTutorWorkspace(built.id);
    } else {
      tutorDraft = built; switchView("tutor-editor"); renderTutorEditorBody();
    }
  }
}

/* =========================================================================
   v3.4 MODULE 5: KATEX MATH, EDIT MESSAGE, REGENERATE, EXPORT & ADMIN BONUS TOKENS (6A + 6C)
   ========================================================================= */
function typesetMathInElement(el) {
  if (!el || typeof window.renderMathInElement !== "function") return;
  try {
    window.renderMathInElement(el, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\[", right: "\\]", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false }
      ],
      throwOnError: false
    });
  } catch {}
}

function editUserMessage(msgId) {
  if (S.streaming) return;
  const chat = S.chats.find(c => c.id === S.activeChatId);
  const idx = chat?.messages.findIndex(m => m.id === msgId);
  if (idx === undefined || idx < 0) return;
  const orig = chat.messages[idx].text || "";
  openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:8px;">Chỉnh sửa tin nhắn & Gửi lại</h3>
    <textarea id="ed-msg-ta" class="field" rows="4">${esc(orig)}</textarea>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
      <button type="button" class="btn-s tap" onclick="closeModal()">Hủy</button>
      <button type="button" class="btn-p tap" onclick="commitEditUserMessage('${msgId}')">Gửi lại</button>
    </div>`);
}
async function commitEditUserMessage(msgId) {
  const txt = document.getElementById("ed-msg-ta")?.value.trim();
  if (!txt) return showToast("Tin nhắn không được để trống", "warn");
  const chat = S.chats.find(c => c.id === S.activeChatId);
  const idx = chat?.messages.findIndex(m => m.id === msgId);
  if (idx === undefined || idx < 0) return;
  chat.messages = chat.messages.slice(0, idx);
  closeModal();
  await sendPrompt(txt);
}

async function regenerateReply(aiMsgId) {
  if (S.streaming) return;
  const chat = S.chats.find(c => c.id === S.activeChatId);
  const idx = chat?.messages.findIndex(m => m.id === aiMsgId);
  if (idx === undefined || idx < 0) return;
  const prevUser = [...chat.messages.slice(0, idx)].reverse().find(m => m.role === "user");
  if (!prevUser) return;
  chat.messages = chat.messages.slice(0, idx);
  haptic("tap");
  await sendPrompt(prevUser.text, { reuseLastUser: true });
}

async function exportMsgFile(msgId, fmt) {
  const txt = getMsgText(msgId);
  if (!txt) return showToast("Không có nội dung để xuất");
  if (fmt === "pdf" && window.OfficeStudio?.exportPdf) {
    const rawHtml = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:24px 28px;color:#111827;background:#ffffff;line-height:1.65;">${renderMd(txt)}</div>`;
    return window.OfficeStudio.exportPdf({ kind: "pdf", title: "API-AI-Export", rawHtml }, "open");
  }
  const blob = new Blob([txt], { type: "text/markdown;charset=utf-8" });
  if (window.OfficeStudio?.deliverBinaryFile) {
    return window.OfficeStudio.deliverBinaryFile(blob, `api-ai-export-${Date.now()}.md`, "text/markdown", "save");
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `api-ai-export-${Date.now()}.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  haptic("ok"); showToast("Đã xuất file .md", "ok");
}

function adminBonusTokensModal(email, curBonus) {
  openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:4px;">Cộng Token dự phòng (Add-on)</h3>
    <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:10px;">Tài khoản: <b>${esc(email)}</b> · Dự phòng hiện có: <b class="num" style="color:var(--ok-ink);">${Number(curBonus || 0).toLocaleString("vi-VN")} token</b></p>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
      <button type="button" class="btn-s tap" style="height:34px;font-size:12.5px;" onclick="document.getElementById('abt-val').value='500000'">+500K</button>
      <button type="button" class="btn-s tap" style="height:34px;font-size:12.5px;" onclick="document.getElementById('abt-val').value='2000000'">+2M</button>
      <button type="button" class="btn-s tap" style="height:34px;font-size:12.5px;" onclick="document.getElementById('abt-val').value='10000000'">+10M</button>
    </div>
    <label class="f-lbl">Số token muốn cộng thêm</label>
    <input id="abt-val" type="number" class="field num" value="2000000" min="0" />
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
      <button type="button" class="btn-s tap" onclick="closeModal()">Hủy</button>
      <button type="button" class="btn-p tap" onclick="commitAdminBonusTokens('${esc(email)}')">Cộng ngay</button>
    </div>`);
}
async function commitAdminBonusTokens(email) {
  const amount = parseInt(document.getElementById("abt-val")?.value || "0", 10);
  if (!Number.isFinite(amount) || amount <= 0) return showToast("Nhập số token > 0", "warn");
  const r = await apiFetch("/admin/users/bonus-tokens", { method: "POST", body: { email, amount, mode: "add" } });
  const d = await r.json();
  if (!r.ok) return showToast(d.error || "Lỗi cộng token", "err");
  closeModal(); haptic("ok");
  showToast(`Đã cộng +${amount.toLocaleString("vi-VN")} token cho ${email}`, "ok");
  loadAdminData();
}



/* =========================================================================
   v3.5 MODULE: SLASH COMMANDS (/new /compact GPT 6.2 Astra /plan), CLIPBOARD PASTE, UI-FROM-IMAGE & OFFICE STUDIO BRIDGE
   ========================================================================= */
window.apiFetch = apiFetch;
window.haptic = haptic;
window.showToast = showToast;
window.openModal = openModal;
window.closeModal = closeModal;

const SLASH_COMMANDS = [
  { cmd: "/new", desc: "Mở phiên trò chuyện mới sạch sẽ", instant: true },
  { cmd: "/compact", desc: "Nén & tóm tắt lịch sử phiên bằng GPT 6.2 Astra (tiết kiệm ~75% token)", instant: true },
  { cmd: "/plan", desc: "Lập kế hoạch trước, khóa sửa code (duyệt xong mới làm)", instant: false },
  { cmd: "/slide", desc: "Tạo bài thuyết trình PowerPoint (.pptx) kèm hiệu ứng & trình chiếu", instant: false },
  { cmd: "/doc", desc: "Tạo tài liệu Word (.docx) chuẩn định dạng & xuất PDF", instant: false },
  { cmd: "/excel", desc: "Tạo bảng tính Excel (.xlsx) có công thức tính toán", instant: false },
  { cmd: "/pdf", desc: "Tạo và xuất tài liệu PDF chuẩn in", instant: false },
  { cmd: "/img", desc: "Vẽ ảnh tùy kích thước (vd: 1536x1024 banner.png dựa theo logo.png)", instant: false }
];

let slashSelIdx = 0;
function checkSlashTrigger(val) {
  const pop = document.getElementById("slash-popup");
  if (!pop) return;
  const m = String(val || "").match(/^\/([a-z0-9_-]*)$/i);
  if (!m) { pop.classList.remove("open"); return; }
  const q = m[1].toLowerCase();
  const list = SLASH_COMMANDS.filter(c => c.cmd.slice(1).includes(q));
  if (!list.length) { pop.classList.remove("open"); return; }
  slashSelIdx = Math.min(slashSelIdx, list.length - 1);
  pop.innerHTML = list.map((c, i) => `
    <button type="button" class="drop-opt tap-soft ${i===slashSelIdx?"selected":""}" onclick="pickSlashCommand('${c.cmd}',${c.instant})">
      <span class="slash-keycap">${esc(c.cmd)}</span>
      <div class="opt-main"><div class="opt-sub" style="margin:0;color:var(--ink-2);">${esc(c.desc)}</div></div>
    </button>`).join("");
  pop.classList.add("open");
}

function handleSlashKeydown(e) {
  const pop = document.getElementById("slash-popup");
  if (!pop?.classList.contains("open")) return false;
  const btns = [...pop.querySelectorAll(".drop-opt")];
  if (!btns.length) return false;
  if (e.key === "ArrowDown") { e.preventDefault(); slashSelIdx = (slashSelIdx + 1) % btns.length; btns.forEach((b, i) => b.classList.toggle("selected", i === slashSelIdx)); return true; }
  if (e.key === "ArrowUp") { e.preventDefault(); slashSelIdx = (slashSelIdx - 1 + btns.length) % btns.length; btns.forEach((b, i) => b.classList.toggle("selected", i === slashSelIdx)); return true; }
  if (e.key === "Escape") { pop.classList.remove("open"); return true; }
  if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); btns[slashSelIdx]?.click(); return true; }
  return false;
}

function pickSlashCommand(cmd, instant) {
  const ta = document.getElementById("prompt-in");
  document.getElementById("slash-popup")?.classList.remove("open");
  haptic("tap");
  if (instant) {
    ta.value = ""; autoGrow(); updateOrbButton();
    if (cmd === "/new") { startNewChat(); showToast("Đã mở phiên trò chuyện mới", "ok"); }
    else if (cmd === "/compact") { runCompactSession(); }
    return;
  }
  const map = { "/plan": "plan", "/slide": "office_pptx", "/doc": "office_docx", "/excel": "office_xlsx", "/pdf": "office_pdf", "/img": "image" };
  if (map[cmd]) {
    S.activeTool = map[cmd];
    renderChips();
    ta.value = ""; autoGrow(); updateOrbButton(); ta.focus();
    showToast(`Đã bật ${TOOL_CHIP_LABELS[map[cmd]] || cmd} · Nhập yêu cầu của bạn`);
  }
}

async function runCompactSession() {
  const chat = S.chats.find(c => c.id === S.activeChatId);
  if (!chat || (chat.messages || []).length < 2) {
    return showToast("Phiên hiện tại còn ngắn, chưa cần nén (/compact)", "warn");
  }
  const astraAllowed = S.user?.role === "admin" || S.models.some(m => m.id === "gpt-6.2-astra" && m.allowed);
  const compactModelId = astraAllowed ? "gpt-6.2-astra" : "gpt-6.2-sol";
  showToast(`Đang nén ngữ cảnh phiên bằng ${astraAllowed ? "GPT 6.2 Astra" : "GPT 6.2 Sol"}...`);

  const transcript = (chat.compactSummary ? `[BẢN NÉN TRƯỚC ĐÓ]\n${chat.compactSummary}\n\n` : "")
    + (chat.messages || []).slice(chat.compactedUpToIndex || 0)
      .filter(m => !m.failedSwitch && m.text)
      .map(m => `${m.role === "user" ? "Người dùng" : "API AI"}: ${m.text.slice(0, 1400)}`)
      .join("\n\n");

  try {
    const r = await apiFetch("/ai/digest", {
      method: "POST",
      body: {
        digestMode: "compact_chat",
        readerModelId: compactModelId,
        instruction: "Nén toàn bộ cuộc trò chuyện dự án này thành bản ghi nhớ ngắn gọn nhưng giữ đủ 100% quyết định, tên file, hàm, lỗi đã sửa và bước kế tiếp.",
        content: transcript.slice(0, 26000)
      }
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Không thể nén ngữ cảnh");
    chat.compactSummary = d.digest || "";
    chat.compactedUpToIndex = chat.messages.length;
    chat.compactedBy = d.readerModel || "GPT 6.2 Astra";
    chat.compactedAt = Date.now();
    dbPut("chats", chat).catch(() => {}); apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {});
    renderMessages(); haptic("ok");
    showToast(`Đã nén ${chat.messages.length} tin bằng ${chat.compactedBy} · Làm tiếp ngay không cần giải thích lại!`, "ok");
  } catch (e) {
    haptic("err"); showToast("Lỗi /compact: " + e.message, "err");
  }
}

function buildCompactSummaryCard(chat) {
  if (!chat?.compactSummary) return "";
  return `<div class="compact-summary-card">
    <button type="button" class="compact-head tap-soft" onclick="toggleAcc('cmp-acc','cmp-chv')">
      <span style="display:inline-flex;align-items:center;gap:8px;min-width:0;">
        <span class="slash-keycap">/compact</span>
        <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Đã nén ${Number(chat.compactedUpToIndex || 0)} tin bằng <b>${esc(chat.compactedBy || "GPT 6.2 Astra")}</b></span>
      </span>
      <span id="cmp-chv" class="chev"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></span>
    </button>
    <div id="cmp-acc" class="acc-wrap">
      <div class="acc-inner"><div class="compact-body md">${renderMd(chat.compactSummary)}
        <div style="display:flex;justify-content:flex-end;margin-top:8px;">
          <button type="button" class="btn-s tap" style="height:28px;font-size:11.5px;padding:0 10px;" onclick="clearChatCompact()">Gỡ bản nén</button>
        </div>
      </div></div>
    </div>
  </div>`;
}
function clearChatCompact() {
  const chat = S.chats.find(c => c.id === S.activeChatId);
  if (!chat) return;
  delete chat.compactSummary; delete chat.compactedUpToIndex;
  dbPut("chats", chat).catch(() => {}); apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {});
  renderMessages(); showToast("Đã gỡ bản nén ngữ cảnh");
}

function approvePlanAndExecute(msgId) {
  const chat = S.chats.find(c => c.id === S.activeChatId);
  const msg = chat?.messages.find(m => m.id === msgId);
  if (msg) msg.isPlanLock = false;
  haptic("ok");
  sendPrompt("Tôi đã duyệt kế hoạch trên. Hãy bắt đầu triển khai đầy đủ theo đúng kế hoạch đã chốt.");
}
function refinePlanPrompt() {
  const ta = document.getElementById("prompt-in");
  S.activeTool = "plan"; renderChips();
  ta.value = "Điều chỉnh lại kế hoạch ở bước: ";
  autoGrow(); updateOrbButton(); ta.focus();
}

async function pasteImageFromClipboard() {
  try {
    if (!navigator.clipboard?.read) throw new Error("Trình duyệt chưa hỗ trợ đọc ảnh Clipboard trực tiếp");
    const items = await navigator.clipboard.read();
    const files = [];
    for (const item of items) {
      const imgType = item.types.find(t => t.startsWith("image/"));
      if (imgType) {
        const blob = await item.getType(imgType);
        files.push(new File([blob], `screenshot-${Date.now().toString(36)}.png`, { type: imgType }));
      }
    }
    if (!files.length) return showToast("Clipboard hiện không có ảnh nào. Bạn có thể chọn Ảnh HD hoặc bấm Dán trong khung nhập.", "warn");
    await handleImages(files);
  } catch (e) {
    showToast("Bấm giữ ô nhập tin nhắn và chọn Dán (hoặc chọn Ảnh HD)", "warn");
  }
}

function triggerUiFromScreenshot(idx) {
  haptic("ok");
  ["builtin-hallmark", "builtin-unslop"].forEach(id => {
    if (S.skills.some(s => s.id === id) && !S.skillIds.includes(id)) S.skillIds.push(id);
  });
  S.activeTool = "canvas";
  renderSkillStack(); renderChips();
  const ta = document.getElementById("prompt-in");
  if (!ta.value.trim()) {
    ta.value = "Nhìn kỹ ảnh chụp màn hình đính kèm: hãy sửa lỗi giao diện hoặc dựng lại trọn bộ giao diện đẹp, sắc nét, đúng bố cục và xuất toàn bộ trong 1 khối ```html để xem trực tiếp trong Canvas.";
    autoGrow(); updateOrbButton();
  }
  showToast("Đã bật chế độ Dựng UI từ ảnh + Canvas · Bấm Gửi ngay!", "ok");
  ta.focus();
}

async function downloadDataUrlWithName(dataUrl, fileName) {
  if (!dataUrl) return;
  try {
    const r = await fetch(dataUrl);
    const blob = await r.blob();
    const mime = blob.type || "image/png";
    if (window.OfficeStudio?.deliverBinaryFile) {
      await window.OfficeStudio.deliverBinaryFile(blob, fileName || "api-ai-image.png", mime, "save");
    } else {
      const a = document.createElement("a"); a.href = dataUrl; a.download = fileName || "api-ai-image.png"; a.click();
    }
  } catch (e) { showToast("Không lưu được ảnh: " + e.message, "err"); }
}
function saveGeneratedImageFile(msgId) {
  const m = S.chats.find(c => c.id === S.activeChatId)?.messages.find(x => x.id === msgId);
  if (!m?.genImg) return;
  downloadDataUrlWithName(m.genImg, m.downloadName || "api-ai-image.png");
}

/* ===== OFFICE STUDIO BRIDGE (PPTX / DOCX / XLSX / PDF) ===== */
const officePayloadMap = new Map();

function canUseOfficeStudio() {
  if (S.user?.role === "admin") return true;
  if (typeof S.user?.limits?.allow_office_studio === "boolean") return S.user.limits.allow_office_studio;
  return ["pro", "pro_max", "ultra"].includes(S.user?.keyTier);
}

function detectOfficeIntent(query, activeTool) {
  if (activeTool === "office_pptx") return "pptx";
  if (activeTool === "office_docx") return "docx";
  if (activeTool === "office_xlsx") return "xlsx";
  if (activeTool === "office_pdf") return "pdf";
  const t = String(query || "").toLowerCase();
  if (/(tạo|làm|thiết kế|xuất|dựng)\s+(giúp\s+|cho\s+(mình|tôi|em)\s+)?.*(slide|powerpoint|pptx|bài thuyết trình)/i.test(t)) return "pptx";
  if (/(tạo|làm|viết|xuất)\s+(giúp\s+|cho\s+(mình|tôi|em)\s+)?.*(file\s+word|tài liệu\s+word|\.docx|báo cáo\s+word)/i.test(t)) return "docx";
  if (/(tạo|làm|xuất)\s+(giúp\s+|cho\s+(mình|tôi|em)\s+)?.*(file\s+excel|bảng tính\s+excel|\.xlsx|sheet\s+excel)/i.test(t)) return "xlsx";
  if (/(tạo|làm|xuất)\s+(giúp\s+|cho\s+(mình|tôi|em)\s+)?.*(file\s+pdf|\.pdf|tài liệu\s+pdf)/i.test(t)) return "pdf";
  return null;
}

function buildOfficeSystemDirective(kind) {
  if (kind === "pptx") {
    return `CHẾ ĐỘ OFFICE STUDIO — POWERPOINT (.PPTX) ĐỈNH CAO:
Sau phần giới thiệu ngắn gọn (2-3 dòng), BẮT BUỘC xuất ĐÚNG 1 khối JSON chuẩn đặt trong ${"`".repeat(3)}apiai-office ... ${"`".repeat(3)} theo cấu trúc:
{"kind":"pptx","title":"Tên bài thuyết trình","fileName":"ten-file.pptx","theme":"obsidian-cobalt|warm-editorial|nordic-slate|midnight-gold","transition":"morph|3d|push|fade","slides":[{"layout":"cover","kicker":"Nhãn ngắn","title":"Tiêu đề lớn","subtitle":"Phụ đề sắc sảo","meta":"Tác giả / Thời gian","imagePrompt":"Mô tả tiếng Anh ngắn gọn để vẽ ảnh minh họa nếu cần","notes":"Lời thuyết trình"},{"layout":"kpi_grid","title":"Số liệu nổi bật","kpis":[{"label":"Chỉ số","value":"94%","delta":"+12% so với kỳ trước"}],"bullets":["Nhận định chính"]},{"layout":"two_col","title":"...","bullets":["Ý 1","Ý 2"],"rightTitle":"Điểm nhấn","rightBullets":["Ý A","Ý B"]},{"layout":"timeline","title":"Lộ trình","steps":[{"phase":"Giai đoạn 1","title":"...","desc":"..."}]},{"layout":"chart","title":"Biểu đồ","chart":{"type":"bar|line|pie|doughnut","labels":["Q1","Q2","Q3","Q4"],"series":[{"name":"Doanh thu","values":[12,18,24,31]}]},"bullets":["Kết luận từ biểu đồ"]},{"layout":"table","title":"Bảng so sánh","table":{"headers":["Hạng mục","Giá trị","Ghi chú"],"rows":[["A","100","Tốt"]]}},{"layout":"quote","quote":"Câu trích dẫn đắt giá","author":"Nguồn"},{"layout":"closing","title":"Tổng kết","subtitle":"Cảm ơn đã lắng nghe","bullets":["Hành động 1","Hành động 2"]}]}
YÊU CẦU CHẤT LƯỢNG: Tạo 6-10 slide, phối ĐA DẠNG bố cục (cover, kpi_grid, two_col, timeline, chart, table, closing), nội dung cô đọng sắc sảo không nhồi chữ, JSON hợp lệ 100% không comment.`;
  }
  if (kind === "xlsx") {
    return `CHẾ ĐỘ OFFICE STUDIO — EXCEL (.XLSX) CHUYÊN NGHIỆP:
Sau phần giải thích ngắn, BẮT BUỘC xuất ĐÚNG 1 khối JSON chuẩn đặt trong ${"`".repeat(3)}apiai-office ... ${"`".repeat(3)}:
{"kind":"xlsx","title":"Tên bảng tính","fileName":"bang-tinh.xlsx","sheets":[{"name":"TongQuan","title":"Tiêu đề sheet","headers":["Cột 1","Số lượng","Đơn giá","Thành tiền"],"rows":[["Sản phẩm A",10,50000,"=B3*C3"],["Sản phẩm B",5,120000,"=B4*C4"],["Tổng cộng","=SUM(B3:B4)","","=SUM(D3:D4)"]]}]}
LƯU Ý QUAN TRỌNG: Dữ liệu hàng đầu tiên luôn nằm ở dòng Excel số 3 (vì dòng 1 là Title Banner, dòng 2 là Header). Hãy viết công thức Excel thật bắt đầu bằng dấu "=" đúng tọa độ dòng 3 trở đi! JSON hợp lệ 100%.`;
  }
  const targetKind = kind === "pdf" ? "pdf" : "docx";
  return `CHẾ ĐỘ OFFICE STUDIO — TÀI LIỆU ${targetKind.toUpperCase()} CHUYÊN NGHIỆP:
Sau lời mở đầu ngắn, BẮT BUỘC xuất ĐÚNG 1 khối JSON chuẩn đặt trong ${"`".repeat(3)}apiai-office ... ${"`".repeat(3)}:
{"kind":"${targetKind}","title":"Tiêu đề tài liệu","subtitle":"Phụ đề / Đơn vị","fileName":"tai-lieu.${targetKind}","summary":"Đoạn tóm tắt điều hành nổi bật","sections":[{"heading":"1. Mục lớn","level":1,"paragraphs":["Đoạn phân tích sâu..."],"bullets":["Ý quan trọng 1","Ý quan trọng 2"],"callout":"Ghi chú/Nhấn mạnh quan trọng","table":{"headers":["Cột 1","Cột 2"],"rows":[["Dữ liệu 1","Dữ liệu 2"]]}}]}
YÊU CẦU: Trình bày mạch lạc, chuyên sâu, có bảng biểu khi phù hợp, JSON hợp lệ 100% không comment.`;
}

function renderOfficeArtifactCard(rawJson) {
  let obj = null;
  try { obj = JSON.parse(rawJson.trim()); } catch { return ""; }
  if (!obj || !["pptx", "docx", "xlsx", "pdf"].includes(String(obj.kind || "").toLowerCase())) return "";
  obj.kind = String(obj.kind).toLowerCase();
  const oid = "off-" + (++cbSeq);
  officePayloadMap.set(oid, obj);

  const badgeMap = { pptx: "POWERPOINT .PPTX", docx: "WORD .DOCX", xlsx: "EXCEL .XLSX", pdf: "TÀI LIỆU .PDF" };
  let metaLine = "";
  let miniStrip = "";

  if (obj.kind === "pptx") {
    const slides = Array.isArray(obj.slides) ? obj.slides : [];
    const thName = window.OfficeStudio?.THEMES?.[obj.theme]?.name || "Obsidian Cobalt";
    metaLine = `${slides.length} slide · Chủ đề ${thName} · Hiệu ứng ${(obj.transition || "morph").toUpperCase()}`;
    miniStrip = `<div class="office-slide-strip">${slides.slice(0, 10).map((s, i) => `
      <div class="office-slide-mini tap-soft" onclick="openOfficeArtifact('${oid}','play',${i})">
        <span class="num" style="color:var(--accent-ink);">Slide ${i + 1} · ${esc(s.layout || "two_col")}</span>
        <strong>${esc(s.title || "Slide " + (i + 1))}</strong>
      </div>`).join("")}</div>`;
  } else if (obj.kind === "xlsx") {
    const sheets = Array.isArray(obj.sheets) ? obj.sheets : [];
    metaLine = `${sheets.length || 1} trang tính (Sheet) · Có định dạng & công thức Excel`;
  } else {
    const secs = Array.isArray(obj.sections) ? obj.sections : [];
    metaLine = `${secs.length} chương mục · Chuẩn in & chỉnh sửa Office`;
  }

  return `<div class="office-card">
    <div class="office-card-head">
      <div style="min-width:0;flex:1;">
        <span class="tag-st tier-pro">${badgeMap[obj.kind]}</span>
        <div style="font-size:15.5px;font-weight:520;margin-top:6px;line-height:1.3;">${esc(obj.title || "Tài liệu Office")}</div>
        <div style="font-size:12.5px;color:var(--ink-2);margin-top:3px;">${esc(metaLine)}</div>
      </div>
    </div>
    ${miniStrip}
    <div class="office-card-acts">
      ${obj.kind === "pptx" ? `<button type="button" class="btn-p tap" style="height:36px;font-size:13px;" onclick="openOfficeArtifact('${oid}','play')">Trình chiếu hiệu ứng</button>` : `<button type="button" class="btn-s tap" style="height:36px;font-size:13px;" onclick="openOfficeArtifact('${oid}','preview')">Xem trước</button>`}
      ${obj.kind === "pptx" ? `<button type="button" class="btn-blue tap" style="height:36px;font-size:13px;" onclick="openOfficeArtifact('${oid}','pptx')">Mở / Tải .pptx</button>` : ""}
      ${obj.kind === "docx" ? `<button type="button" class="btn-blue tap" style="height:36px;font-size:13px;" onclick="openOfficeArtifact('${oid}','docx')">Mở / Tải .docx</button>` : ""}
      ${obj.kind === "xlsx" ? `<button type="button" class="btn-blue tap" style="height:36px;font-size:13px;" onclick="openOfficeArtifact('${oid}','xlsx')">Mở / Tải .xlsx</button>` : ""}
      <button type="button" class="btn-s tap" style="height:36px;font-size:13px;" onclick="openOfficeArtifact('${oid}','pdf')">Xuất .pdf</button>
      ${obj.kind === "pptx" ? `<button type="button" class="btn-s tap" style="height:36px;font-size:13px;" onclick="openOfficeArtifact('${oid}','visuals')">Vẽ ảnh Slide</button>` : ""}
      <button type="button" class="btn-s tap" style="height:36px;font-size:13px;" onclick="openOfficeArtifact('${oid}','save')">Lưu Thư viện</button>
    </div>
  </div>`;
}

async function openOfficeArtifact(oid, action, slideIdx = 0) {
  const spec = officePayloadMap.get(oid);
  if (!spec || !window.OfficeStudio) return showToast("Không tìm thấy dữ liệu Office", "err");
  if (!canUseOfficeStudio() && action !== "preview") {
    return showToast("Office Studio yêu cầu Key hạng Pro trở lên", "warn");
  }
  try {
    if (action === "play") { window.OfficeStudio.openPlayer(spec); if (slideIdx > 0) window.OfficeStudio.jumpSlide(slideIdx); }
    else if (action === "preview") window.OfficeStudio.openPreview(spec);
    else if (action === "pptx") await window.OfficeStudio.exportPptx(spec, "open");
    else if (action === "docx") await window.OfficeStudio.exportDocx(spec, "open");
    else if (action === "xlsx") await window.OfficeStudio.exportXlsx(spec, "open");
    else if (action === "pdf") await window.OfficeStudio.exportPdf(spec, "open");
    else if (action === "visuals") await window.OfficeStudio.generateSlideVisuals(spec);
    else if (action === "save") await saveOfficeSpecToLibrary(spec);
  } catch (e) {
    haptic("err"); showToast("Lỗi xuất Office: " + e.message, "err");
  }
}

async function saveOfficeSpecToLibrary(spec) {
  if (!spec) return;
  const it = {
    id: "offlib-" + Date.now() + Math.random().toString(36).slice(2, 5),
    type: "office",
    officeKind: spec.kind || "pptx",
    title: spec.title || "Tài liệu Office",
    data: JSON.stringify(spec),
    createdAt: Date.now()
  };
  await dbPut("library", it);
  S.library.unshift(it);
  haptic("ok"); showToast(`Đã lưu "${it.title}" vào Thư viện`, "ok");
}

function openSavedOfficeFromLib(libId) {
  const item = S.library.find(x => x.id === libId);
  if (!item?.data) return;
  try {
    const spec = JSON.parse(item.data);
    if (spec.kind === "pptx") window.OfficeStudio?.openPlayer(spec);
    else window.OfficeStudio?.openPreview(spec);
  } catch { showToast("Không mở được tệp đã lưu", "err"); }
}


// boot() is invoked by v36-pro.js right after v3.6 modules attach!
