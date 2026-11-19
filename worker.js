/**
 * Chat GPT Pro Backend — Cloudflare Worker + D1 SQLite
 * Features:
 *  - Register / Login / PBKDF2 Password Hashing / HMAC-SHA256 Session JWT
 *  - Strict 1-Key = 1-Email Activation + Expiry Enforcement + Device Binding
 *  - Admin Account (ngbangw18@gmail.com) with Full Key, User, Reset Inbox, API/Model & Plan Limit Controls
 *  - Multi-Key Round-Robin + Auto-Failover AI Proxy (hides upstream API keys from APK)
 *  - Cloud Sync for User Chats & Long-Term Memories
 */

const ADMIN_EMAIL = "ngbangw18@gmail.com";
const ADMIN_INIT_PASS = "BangDepZai@2008";

const PLAN_DAYS = {
  week: 7,
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "9m": 270,
  "12m": 365,
  "18m": 540,
  "1y": 365,
  "2y": 730
};

const PLAN_LABELS = {
  week: "Tuần (7 ngày)",
  "1m": "1 Tháng",
  "3m": "3 Tháng",
  "6m": "6 Tháng",
  "9m": "9 Tháng",
  "12m": "12 Tháng",
  "18m": "18 Tháng",
  "1y": "1 Năm",
  "2y": "2 Năm"
};

const DEFAULT_CONFIG = {
  api_base: "https://codex.fosta.app/v1",
  api_keys: [
    "sk-00eab046c62fd5b2-fi6qf5vfa8hr15vp-d5934f82",
    "sk-00eab046c62fd5b2-qq4l9dlsgs3fhtjv-50fdc758"
  ],
  models: [
    { id: "auto", title: "Tự động", sub: "Thích ứng thông minh", short: "Auto", mapped: "auto", badge: "", tier: "basic" },
    { id: "hydrogen", title: "Trợ giúp hằng ngày", sub: "4 Hydrogen · Tiết kiệm", short: "Hydrogen", mapped: "gpt-6-luna", badge: "", tier: "basic" },
    { id: "neon", title: "Deeper analysis", sub: "4 Neon · Cân bằng sâu", short: "Neon", mapped: "gpt-6.2-sol", badge: "Mới", tier: "pro" },
    { id: "carbon", title: "Code & complex work", sub: "4 Carbon · Mạnh nhất", short: "Carbon", mapped: "gpt-6.2-astra", badge: "", tier: "pro" }
  ],
  plan_limits: {
    week: {
      daily_msgs: 20,
      daily_tokens: 25000,
      allow_pro_models: false,
      allow_hd_vision: false,
      allow_image_gen: false,
      allow_deep_research: false,
      allow_canvas: true,
      max_devices: 1
    },
    "1m": { daily_msgs: 150, daily_tokens: 250000, allow_pro_models: true, allow_hd_vision: true, allow_image_gen: true, allow_deep_research: true, allow_canvas: true, max_devices: 2 },
    "3m": { daily_msgs: 250, daily_tokens: 450000, allow_pro_models: true, allow_hd_vision: true, allow_image_gen: true, allow_deep_research: true, allow_canvas: true, max_devices: 2 },
    "6m": { daily_msgs: 350, daily_tokens: 650000, allow_pro_models: true, allow_hd_vision: true, allow_image_gen: true, allow_deep_research: true, allow_canvas: true, max_devices: 2 },
    "9m": { daily_msgs: 450, daily_tokens: 800000, allow_pro_models: true, allow_hd_vision: true, allow_image_gen: true, allow_deep_research: true, allow_canvas: true, max_devices: 2 },
    "12m": { daily_msgs: 600, daily_tokens: 1200000, allow_pro_models: true, allow_hd_vision: true, allow_image_gen: true, allow_deep_research: true, allow_canvas: true, max_devices: 3 },
    "18m": { daily_msgs: 800, daily_tokens: 1600000, allow_pro_models: true, allow_hd_vision: true, allow_image_gen: true, allow_deep_research: true, allow_canvas: true, max_devices: 3 },
    "1y": { daily_msgs: 600, daily_tokens: 1200000, allow_pro_models: true, allow_hd_vision: true, allow_image_gen: true, allow_deep_research: true, allow_canvas: true, max_devices: 3 },
    "2y": { daily_msgs: 1200, daily_tokens: 2500000, allow_pro_models: true, allow_hd_vision: true, allow_image_gen: true, allow_deep_research: true, allow_canvas: true, max_devices: 4 }
  }
};

let schemaReady = false;
let rrCounter = 0;

function cors(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Device-Id",
    "Access-Control-Expose-Headers": "X-Key-Slot, X-Used-Model",
    ...extra
  };
}

function jsonRes(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: cors({ "Content-Type": "application/json; charset=utf-8" })
  });
}

function todayVN() {
  const d = new Date(Date.now() + 7 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

function toHex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function b64url(str) {
  const bytes = typeof str === "string" ? new TextEncoder().encode(str) : new Uint8Array(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(str) {
  const pad = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  const bin = atob(pad);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(arr);
}

async function hashPassword(password, saltHex = null) {
  const salt = saltHex
    ? new Uint8Array(saltHex.match(/.{1,2}/g).map(h => parseInt(h, 16)))
    : crypto.getRandomValues(new Uint8Array(16));
  const keyMat = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 50000, hash: "SHA-256" }, keyMat, 256);
  return `${toHex(salt)}:${toHex(bits)}`;
}

async function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [saltHex] = stored.split(":");
  const check = await hashPassword(password, saltHex);
  return check === stored;
}

async function signToken(payload, secret) {
  const body = b64url(JSON.stringify(payload));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return `${body}.${b64url(sig)}`;
}

async function verifyToken(token, secret) {
  try {
    const [body, sig] = (token || "").split(".");
    if (!body || !sig) return null;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const expected = b64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
    if (expected !== sig) return null;
    const data = JSON.parse(fromB64url(body));
    if (data.exp && Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

function getSecret(env) {
  return env.JWT_SECRET || "cgpt-ultra-secret-2026-bang-v2-key";
}

function randomCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const arr = crypto.getRandomValues(new Uint8Array(len));
  let out = "";
  for (const x of arr) out += chars[x % chars.length];
  return out;
}

async function ensureSchema(db) {
  if (schemaReady) return;
  const stmts = [
    `CREATE TABLE IF NOT EXISTS users (email TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT 'Người dùng', password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', pwd_version INTEGER NOT NULL DEFAULT 1, active_key TEXT, plan_type TEXT, key_expires_at INTEGER, device_ids TEXT NOT NULL DEFAULT '[]', daily_msg_count INTEGER NOT NULL DEFAULT 0, daily_token_count INTEGER NOT NULL DEFAULT 0, last_usage_date TEXT, banned INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS license_keys (key_code TEXT PRIMARY KEY, plan_type TEXT NOT NULL, duration_days INTEGER NOT NULL, max_devices INTEGER NOT NULL DEFAULT 2, bound_email TEXT, status TEXT NOT NULL DEFAULT 'unused', activated_at INTEGER, expires_at INTEGER, note TEXT DEFAULT '', created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS reset_requests (id TEXT PRIMARY KEY, email TEXT NOT NULL, key_code TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', new_temp_password TEXT, created_at INTEGER NOT NULL, resolved_at INTEGER)`,
    `CREATE TABLE IF NOT EXISTS app_config (cfg_key TEXT PRIMARY KEY, cfg_value TEXT NOT NULL, updated_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS user_chats (id TEXT PRIMARY KEY, email TEXT NOT NULL, title TEXT NOT NULL, pinned INTEGER NOT NULL DEFAULT 0, mode TEXT NOT NULL DEFAULT 'chat', data_json TEXT NOT NULL, updated_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS user_memories (id TEXT PRIMARY KEY, email TEXT NOT NULL, content TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'manual', enabled INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL)`
  ];
  for (const sql of stmts) await db.prepare(sql).run();

  // Seed Admin if missing
  const admin = await db.prepare("SELECT email FROM users WHERE email = ?").bind(ADMIN_EMAIL).first();
  if (!admin) {
    const hash = await hashPassword(ADMIN_INIT_PASS);
    await db.prepare(
      "INSERT INTO users (email, name, password_hash, role, pwd_version, plan_type, created_at) VALUES (?, ?, ?, 'admin', 1, 'admin', ?)"
    ).bind(ADMIN_EMAIL, "Admin Bằng", hash, Date.now()).run();
  }

  // Seed default config if missing
  const cfg = await db.prepare("SELECT cfg_key FROM app_config WHERE cfg_key = 'system'").first();
  if (!cfg) {
    await db.prepare("INSERT INTO app_config (cfg_key, cfg_value, updated_at) VALUES ('system', ?, ?)")
      .bind(JSON.stringify(DEFAULT_CONFIG), Date.now()).run();
  }
  schemaReady = true;
}

async function getConfig(db, env) {
  const row = await db.prepare("SELECT cfg_value FROM app_config WHERE cfg_key = 'system'").first();
  let cfg = DEFAULT_CONFIG;
  if (row) {
    try {
      const parsed = JSON.parse(row.cfg_value);
      cfg = {
        ...DEFAULT_CONFIG,
        ...parsed,
        plan_limits: { ...DEFAULT_CONFIG.plan_limits, ...(parsed.plan_limits || {}) }
      };
    } catch {}
  }
  if ((!cfg.api_keys || !cfg.api_keys.length) && env.FOSTA_API_KEYS) {
    cfg.api_keys = env.FOSTA_API_KEYS.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
  }
  return cfg;
}

async function evaluateUserLicense(db, user, cfg) {
  if (!user) return { active: false, reason: "NO_USER", limits: cfg.plan_limits.week };
  if (user.role === "admin") {
    return {
      active: true,
      planType: "admin",
      planLabel: "Quản trị viên (Không giới hạn)",
      expiresAt: null,
      limits: {
        daily_msgs: 999999,
        daily_tokens: 999999999,
        allow_pro_models: true,
        allow_hd_vision: true,
        allow_image_gen: true,
        allow_deep_research: true,
        allow_canvas: true,
        max_devices: 99
      }
    };
  }
  if (!user.active_key) return { active: false, reason: "KEY_REQUIRED", limits: cfg.plan_limits.week };

  const keyRow = await db.prepare("SELECT * FROM license_keys WHERE key_code = ?").bind(user.active_key).first();
  if (!keyRow || keyRow.bound_email !== user.email) {
    return { active: false, reason: "KEY_INVALID", limits: cfg.plan_limits.week };
  }
  if (keyRow.status === "revoked") {
    return { active: false, reason: "KEY_REVOKED", limits: cfg.plan_limits.week };
  }
  if (keyRow.expires_at && Date.now() > keyRow.expires_at) {
    if (keyRow.status !== "expired") {
      await db.prepare("UPDATE license_keys SET status = 'expired' WHERE key_code = ?").bind(keyRow.key_code).run();
    }
    return { active: false, reason: "KEY_EXPIRED", expiresAt: keyRow.expires_at, limits: cfg.plan_limits.week };
  }

  const limits = cfg.plan_limits[keyRow.plan_type] || cfg.plan_limits["1m"];
  return {
    active: true,
    planType: keyRow.plan_type,
    planLabel: PLAN_LABELS[keyRow.plan_type] || keyRow.plan_type,
    keyCode: keyRow.key_code,
    expiresAt: keyRow.expires_at,
    maxDevices: keyRow.max_devices || limits.max_devices || 2,
    limits
  };
}

function publicUser(user, lic) {
  const today = todayVN();
  const dailyMsgs = user.last_usage_date === today ? user.daily_msg_count : 0;
  const dailyTokens = user.last_usage_date === today ? user.daily_token_count : 0;
  return {
    email: user.email,
    name: user.name,
    role: user.role,
    activeKey: user.active_key,
    licenseActive: lic.active,
    licenseReason: lic.reason || null,
    planType: lic.planType || user.plan_type || null,
    planLabel: lic.planLabel || "Chưa kích hoạt",
    expiresAt: lic.expiresAt || user.key_expires_at || null,
    dailyMsgs,
    dailyTokens,
    limits: lic.limits
  };
}

async function authenticate(request, env, db) {
  const auth = request.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return { error: "Thiếu phiên đăng nhập.", status: 401 };
  const payload = await verifyToken(auth.slice(7).trim(), getSecret(env));
  if (!payload || !payload.email) return { error: "Phiên đăng nhập hết hạn, hãy đăng nhập lại.", status: 401 };

  const user = await db.prepare("SELECT * FROM users WHERE email = ?").bind(payload.email).first();
  if (!user) return { error: "Tài khoản không tồn tại.", status: 401 };
  if (user.banned) return { error: "Tài khoản của bạn đã bị khóa bởi Quản trị viên.", status: 403 };
  if (user.pwd_version !== payload.pwdVer) return { error: "Mật khẩu đã thay đổi, vui lòng đăng nhập lại.", status: 401 };

  const cfg = await getConfig(db, env);
  const lic = await evaluateUserLicense(db, user, cfg);

  // Device Binding check for active non-admin users
  const deviceId = (request.headers.get("X-Device-Id") || payload.deviceId || "").trim();
  if (user.role !== "admin" && lic.active && deviceId) {
    let devs = [];
    try { devs = JSON.parse(user.device_ids || "[]"); } catch {}
    if (!devs.includes(deviceId)) {
      const maxD = lic.maxDevices || 2;
      if (devs.length >= maxD) {
        return { error: `Key này chỉ cho phép tối đa ${maxD} thiết bị. Hãy liên hệ Admin để reset thiết bị.`, status: 403 };
      }
      devs.push(deviceId);
      await db.prepare("UPDATE users SET device_ids = ? WHERE email = ?").bind(JSON.stringify(devs), user.email).run();
      user.device_ids = JSON.stringify(devs);
    }
  }

  return { user, cfg, lic, deviceId };
}

async function proxyUpstream(cfg, subPath, bodyObj) {
  const keys = (cfg.api_keys || []).filter(Boolean);
  if (!keys.length) throw new Error("Admin chưa cấu hình API Key trên server.");
  const base = (cfg.api_base || "https://codex.fosta.app/v1").replace(/\/+$/, "");
  const start = rrCounter % keys.length;
  rrCounter = (rrCounter + 1) % 1000000;

  let lastRes = null;
  let lastSlot = "Key #1";
  for (let i = 0; i < keys.length; i++) {
    const idx = (start + i) % keys.length;
    lastSlot = `Key #${idx + 1}`;
    const res = await fetch(`${base}/${subPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${keys[idx]}`
      },
      body: JSON.stringify(bodyObj)
    });
    if ([401, 402, 429, 500, 502, 503, 504].includes(res.status) && i < keys.length - 1) {
      lastRes = res;
      continue;
    }
    return { res, slot: lastSlot };
  }
  return { res: lastRes, slot: lastSlot };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors() });
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/" || path === "/health") {
      return jsonRes({ ok: true, service: "Chat GPT Pro API", time: Date.now() });
    }

    if (!env.DB) {
      return jsonRes({ error: "Chưa gắn D1 Database binding tên là DB trên Cloudflare Worker." }, 500);
    }

    try {
      await ensureSchema(env.DB);
      const db = env.DB;

      /* ================= AUTH ================= */
      if (path === "/auth/register" && request.method === "POST") {
        const b = await request.json();
        const email = (b.email || "").trim().toLowerCase();
        const password = String(b.password || "");
        const confirm = String(b.confirmPassword || "");
        const deviceId = String(b.deviceId || "dev-unknown").slice(0, 80);

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonRes({ error: "Email không hợp lệ." }, 400);
        if (password.length < 6) return jsonRes({ error: "Mật khẩu phải từ 6 ký tự trở lên." }, 400);
        if (password !== confirm) return jsonRes({ error: "Nhập lại mật khẩu không khớp." }, 400);

        const exists = await db.prepare("SELECT email FROM users WHERE email = ?").bind(email).first();
        if (exists) return jsonRes({ error: "Email này đã được đăng ký trước đó." }, 409);

        const hash = await hashPassword(password);
        const name = (b.name || email.split("@")[0]).slice(0, 40);
        await db.prepare(
          "INSERT INTO users (email, name, password_hash, role, pwd_version, device_ids, created_at) VALUES (?, ?, ?, 'user', 1, ?, ?)"
        ).bind(email, name, hash, JSON.stringify([deviceId]), Date.now()).run();

        const user = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
        const cfg = await getConfig(db, env);
        const lic = await evaluateUserLicense(db, user, cfg);
        const token = await signToken({ email, role: "user", pwdVer: 1, deviceId, exp: Date.now() + 30 * 86400000 }, getSecret(env));

        return jsonRes({
          ok: true,
          token,
          user: publicUser(user, lic),
          models: cfg.models
        });
      }

      if (path === "/auth/login" && request.method === "POST") {
        const b = await request.json();
        const email = (b.email || "").trim().toLowerCase();
        const password = String(b.password || "");
        const deviceId = String(b.deviceId || "dev-unknown").slice(0, 80);

        const user = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
        if (!user || !(await verifyPassword(password, user.password_hash))) {
          return jsonRes({ error: "Sai Email hoặc Mật khẩu." }, 401);
        }
        if (user.banned) return jsonRes({ error: "Tài khoản này đang bị khóa bởi Quản trị viên." }, 403);

        const cfg = await getConfig(db, env);
        const lic = await evaluateUserLicense(db, user, cfg);

        if (user.role !== "admin" && lic.active && deviceId) {
          let devs = [];
          try { devs = JSON.parse(user.device_ids || "[]"); } catch {}
          if (!devs.includes(deviceId)) {
            const maxD = lic.maxDevices || 2;
            if (devs.length >= maxD) {
              return jsonRes({ error: `Tài khoản đã vượt quá giới hạn ${maxD} thiết bị của gói Key. Liên hệ Admin để reset thiết bị.` }, 403);
            }
            devs.push(deviceId);
            await db.prepare("UPDATE users SET device_ids = ? WHERE email = ?").bind(JSON.stringify(devs), email).run();
            user.device_ids = JSON.stringify(devs);
          }
        }

        const token = await signToken(
          { email: user.email, role: user.role, pwdVer: user.pwd_version, deviceId, exp: Date.now() + 30 * 86400000 },
          getSecret(env)
        );
        return jsonRes({
          ok: true,
          token,
          user: publicUser(user, lic),
          models: cfg.models
        });
      }

      if (path === "/auth/forgot-password" && request.method === "POST") {
        const b = await request.json();
        const email = (b.email || "").trim().toLowerCase();
        const keyCode = (b.keyCode || "").trim();
        if (!email || !keyCode) return jsonRes({ error: "Vui lòng nhập đầy đủ Email và Key của email đó." }, 400);

        const user = await db.prepare("SELECT email, active_key FROM users WHERE email = ?").bind(email).first();
        if (!user) return jsonRes({ error: "Email không tồn tại trong hệ thống." }, 404);

        const keyMatch = await db.prepare("SELECT key_code FROM license_keys WHERE key_code = ? AND bound_email = ?").bind(keyCode, email).first();
        if (!keyMatch && user.active_key !== keyCode) {
          return jsonRes({ error: "Key không khớp với tài khoản Email này." }, 400);
        }

        const reqId = "rst-" + Date.now() + "-" + randomCode(4);
        await db.prepare(
          "INSERT INTO reset_requests (id, email, key_code, status, created_at) VALUES (?, ?, ?, 'pending', ?)"
        ).bind(reqId, email, keyCode, Date.now()).run();

        return jsonRes({
          ok: true,
          message: "Sẽ có email gửi mật khẩu mới trong vòng 24h tới, vui lòng chờ đợi"
        });
      }

      /* ================= AUTHENTICATED ROUTES ================= */
      const authCtx = await authenticate(request, env, db);
      if (authCtx.error) return jsonRes({ error: authCtx.error }, authCtx.status);
      const { user, cfg, lic, deviceId } = authCtx;

      if (path === "/auth/me" && request.method === "GET") {
        return jsonRes({ ok: true, user: publicUser(user, lic), models: cfg.models });
      }

      if (path === "/auth/activate-key" && request.method === "POST") {
        const b = await request.json();
        const keyCode = (b.keyCode || "").trim();
        if (!keyCode) return jsonRes({ error: "Vui lòng nhập mã Key." }, 400);

        const keyRow = await db.prepare("SELECT * FROM license_keys WHERE key_code = ?").bind(keyCode).first();
        if (!keyRow) return jsonRes({ error: "Mã Key không tồn tại hoặc nhập sai." }, 404);
        if (keyRow.status === "revoked") return jsonRes({ error: "Mã Key này đã bị Admin thu hồi." }, 403);
        if (keyRow.bound_email && keyRow.bound_email !== user.email) {
          return jsonRes({ error: "Key này đã được kích hoạt cho một tài khoản khác, không thể dùng chung." }, 403);
        }
        if (keyRow.status === "expired" || (keyRow.expires_at && Date.now() > keyRow.expires_at)) {
          return jsonRes({ error: "Mã Key này đã hết hạn sử dụng." }, 403);
        }

        const now = Date.now();
        const expiresAt = keyRow.expires_at || (now + keyRow.duration_days * 86400000);
        await db.prepare(
          "UPDATE license_keys SET bound_email = ?, status = 'active', activated_at = COALESCE(activated_at, ?), expires_at = ? WHERE key_code = ?"
        ).bind(user.email, now, expiresAt, keyCode).run();

        await db.prepare(
          "UPDATE users SET active_key = ?, plan_type = ?, key_expires_at = ?, device_ids = ? WHERE email = ?"
        ).bind(keyCode, keyRow.plan_type, expiresAt, JSON.stringify(deviceId ? [deviceId] : []), user.email).run();

        const updatedUser = await db.prepare("SELECT * FROM users WHERE email = ?").bind(user.email).first();
        const newLic = await evaluateUserLicense(db, updatedUser, cfg);
        return jsonRes({ ok: true, user: publicUser(updatedUser, newLic), models: cfg.models });
      }

      /* ================= AI CHAT & IMAGE (STRICTLY LICENSE-GATED) ================= */
      if ((path === "/ai/chat" || path === "/ai/image") && request.method === "POST") {
        if (!lic.active) {
          return jsonRes({ error: "Tài khoản chưa kích hoạt Key hoặc Key đã hết hạn.", code: "KEY_REQUIRED" }, 403);
        }

        const today = todayVN();
        let msgsToday = user.last_usage_date === today ? user.daily_msg_count : 0;
        let tokensToday = user.last_usage_date === today ? user.daily_token_count : 0;

        if (user.role !== "admin") {
          if (msgsToday >= lic.limits.daily_msgs) {
            return jsonRes({ error: `Gói ${lic.planLabel} đã đạt giới hạn ${lic.limits.daily_msgs} tin nhắn/ngày. Quay lại vào 0h hoặc nâng cấp gói Key.` }, 429);
          }
          if (tokensToday >= lic.limits.daily_tokens) {
            return jsonRes({ error: `Gói ${lic.planLabel} đã hết ngân sách token hôm nay (${lic.limits.daily_tokens.toLocaleString()}).` }, 429);
          }
        }

        const body = await request.json();

        if (path === "/ai/image") {
          if (user.role !== "admin" && !lic.limits.allow_image_gen) {
            return jsonRes({ error: `Gói ${lic.planLabel} bị giới hạn tính năng Tạo ảnh để bảo vệ token. Hãy nâng cấp gói tháng/năm.` }, 403);
          }
          const { res, slot } = await proxyUpstream(cfg, "images/generations", {
            prompt: body.prompt,
            n: 1,
            size: body.size || "1024x1024"
          });
          await db.prepare("UPDATE users SET daily_msg_count = ?, daily_token_count = ?, last_usage_date = ? WHERE email = ?")
            .bind(msgsToday + 1, tokensToday + 2500, today, user.email).run();
          const h = new Headers(res.headers);
          Object.entries(cors()).forEach(([k, v]) => h.set(k, v));
          h.set("X-Key-Slot", slot);
          return new Response(res.body, { status: res.status, headers: h });
        }

        // Chat completion enforcement
        const tool = body.tool || null;
        if (user.role !== "admin") {
          if (tool === "deep_research" && !lic.limits.allow_deep_research) {
            return jsonRes({ error: `Gói ${lic.planLabel} không hỗ trợ Deep Research.` }, 403);
          }
          if (tool === "canvas" && !lic.limits.allow_canvas) {
            return jsonRes({ error: `Gói ${lic.planLabel} không hỗ trợ Canvas.` }, 403);
          }
        }

        // Resolve allowed model
        let requestedUiId = body.uiModelId || "hydrogen";
        let chosenModelObj = (cfg.models || []).find(m => m.id === requestedUiId) || cfg.models[1] || cfg.models[0];
        let upstreamModel = body.model || (chosenModelObj ? chosenModelObj.mapped : "gpt-6-luna");

        if (user.role !== "admin" && !lic.limits.allow_pro_models) {
          // Force basic budget model for restricted plans like Week key
          const basicModel = (cfg.models || []).find(m => m.tier === "basic" && m.mapped !== "auto");
          upstreamModel = basicModel ? basicModel.mapped : "gpt-6-luna";
        }

        const estTokens = Math.max(300, Math.round(JSON.stringify(body.messages || []).length / 3.5));
        const { res, slot } = await proxyUpstream(cfg, "chat/completions", {
          model: upstreamModel,
          messages: body.messages || [],
          stream: body.stream !== false
        });

        await db.prepare("UPDATE users SET daily_msg_count = ?, daily_token_count = ?, last_usage_date = ? WHERE email = ?")
          .bind(msgsToday + 1, tokensToday + estTokens, today, user.email).run();

        const h = new Headers(res.headers);
        Object.entries(cors()).forEach(([k, v]) => h.set(k, v));
        h.set("X-Key-Slot", slot);
        h.set("X-Used-Model", upstreamModel);
        return new Response(res.body, { status: res.status, headers: h });
      }

      /* ================= CLOUD SYNC: CHATS & MEMORIES ================= */
      if (path === "/sync/chats" && request.method === "GET") {
        const rows = await db.prepare("SELECT id, title, pinned, mode, data_json, updated_at FROM user_chats WHERE email = ? ORDER BY updated_at DESC LIMIT 80")
          .bind(user.email).all();
        const chats = (rows.results || []).map(r => {
          try { return JSON.parse(r.data_json); } catch { return { id: r.id, title: r.title, pinned: !!r.pinned, mode: r.mode, updatedAt: r.updated_at, messages: [] }; }
        });
        return jsonRes({ ok: true, chats });
      }

      if (path === "/sync/chats" && request.method === "POST") {
        const chat = await request.json();
        if (!chat.id) return jsonRes({ error: "Thiếu chat id" }, 400);
        // Strip heavy base64 images before cloud backup to stay lean & fast (keep text + metadata)
        const slim = {
          ...chat,
          messages: (chat.messages || []).slice(-60).map(m => ({
            ...m,
            atts: (m.atts || []).map(a => a.type === "file" ? { ...a, text: (a.text || "").slice(0, 3000) } : { id: a.id, type: a.type, name: a.name }),
            genImg: m.genImg && m.genImg.length < 2000 ? m.genImg : undefined
          }))
        };
        await db.prepare(
          "INSERT INTO user_chats (id, email, title, pinned, mode, data_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title=excluded.title, pinned=excluded.pinned, mode=excluded.mode, data_json=excluded.data_json, updated_at=excluded.updated_at"
        ).bind(chat.id, user.email, (chat.title || "Chat").slice(0, 120), chat.pinned ? 1 : 0, chat.mode || "chat", JSON.stringify(slim), chat.updatedAt || Date.now()).run();
        return jsonRes({ ok: true });
      }

      if (path.startsWith("/sync/chats/") && request.method === "DELETE") {
        const id = decodeURIComponent(path.slice("/sync/chats/".length));
        await db.prepare("DELETE FROM user_chats WHERE id = ? AND email = ?").bind(id, user.email).run();
        return jsonRes({ ok: true });
      }

      if (path === "/sync/memories" && request.method === "GET") {
        const rows = await db.prepare("SELECT id, content, source, enabled, created_at FROM user_memories WHERE email = ? ORDER BY created_at DESC")
          .bind(user.email).all();
        return jsonRes({ ok: true, memories: (rows.results || []).map(r => ({ id: r.id, content: r.content, source: r.source, enabled: !!r.enabled, ts: r.created_at })) });
      }

      if (path === "/sync/memories" && request.method === "POST") {
        const m = await request.json();
        const id = m.id || ("mem-" + Date.now());
        await db.prepare(
          "INSERT INTO user_memories (id, email, content, source, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET content=excluded.content, enabled=excluded.enabled"
        ).bind(id, user.email, (m.content || "").slice(0, 4000), m.source || "manual", m.enabled === false ? 0 : 1, m.ts || Date.now()).run();
        return jsonRes({ ok: true, id });
      }

      if (path.startsWith("/sync/memories/") && request.method === "DELETE") {
        const id = decodeURIComponent(path.slice("/sync/memories/".length));
        await db.prepare("DELETE FROM user_memories WHERE id = ? AND email = ?").bind(id, user.email).run();
        return jsonRes({ ok: true });
      }

      /* ================= ADMIN ONLY ROUTES ================= */
      if (path.startsWith("/admin/")) {
        if (user.role !== "admin") return jsonRes({ error: "Chỉ tài khoản Admin mới có quyền truy cập." }, 403);

        if (path === "/admin/overview" && request.method === "GET") {
          const usersRes = await db.prepare("SELECT email, name, role, active_key, plan_type, key_expires_at, device_ids, daily_msg_count, daily_token_count, last_usage_date, banned, created_at FROM users ORDER BY created_at DESC").all();
          const keysRes = await db.prepare("SELECT * FROM license_keys ORDER BY created_at DESC LIMIT 300").all();
          const resetsRes = await db.prepare("SELECT * FROM reset_requests ORDER BY created_at DESC LIMIT 100").all();
          const today = todayVN();

          const users = (usersRes.results || []).map(u => {
            let devs = [];
            try { devs = JSON.parse(u.device_ids || "[]"); } catch {}
            return {
              ...u,
              deviceCount: devs.length,
              daily_msg_count: u.last_usage_date === today ? u.daily_msg_count : 0,
              daily_token_count: u.last_usage_date === today ? u.daily_token_count : 0
            };
          });

          return jsonRes({
            ok: true,
            users,
            keys: keysRes.results || [],
            resetRequests: resetsRes.results || [],
            config: cfg,
            planLabels: PLAN_LABELS
          });
        }

        if (path === "/admin/keys/create" && request.method === "POST") {
          const b = await request.json();
          const planType = PLAN_DAYS[b.planType] ? b.planType : "1m";
          const durationDays = PLAN_DAYS[planType];
          const count = Math.max(1, Math.min(50, parseInt(b.count || 1, 10)));
          const maxDevices = Math.max(1, Math.min(10, parseInt(b.maxDevices || (planType === "week" ? 1 : 2), 10)));
          const prefix = (b.prefix || "BANG").toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 10) || "BANG";
          const note = (b.note || "").slice(0, 100);
          const created = [];

          for (let i = 0; i < count; i++) {
            const code = `${prefix}-${planType.toUpperCase()}-${randomCode(4)}-${randomCode(4)}`;
            await db.prepare(
              "INSERT INTO license_keys (key_code, plan_type, duration_days, max_devices, status, note, created_at) VALUES (?, ?, ?, ?, 'unused', ?, ?)"
            ).bind(code, planType, durationDays, maxDevices, note, Date.now()).run();
            created.push(code);
          }
          return jsonRes({ ok: true, created });
        }

        if (path === "/admin/keys/action" && request.method === "POST") {
          const b = await request.json();
          const code = (b.keyCode || "").trim();
          const act = b.action;
          if (!code) return jsonRes({ error: "Thiếu keyCode" }, 400);

          if (act === "revoke") {
            await db.prepare("UPDATE license_keys SET status = 'revoked' WHERE key_code = ?").bind(code).run();
          } else if (act === "unrevoke") {
            const row = await db.prepare("SELECT bound_email FROM license_keys WHERE key_code = ?").bind(code).first();
            await db.prepare("UPDATE license_keys SET status = ? WHERE key_code = ?").bind(row?.bound_email ? "active" : "unused", code).run();
          } else if (act === "delete") {
            await db.prepare("DELETE FROM license_keys WHERE key_code = ?").bind(code).run();
          } else if (act === "extend") {
            const days = Math.max(1, parseInt(b.extraDays || 30, 10));
            const row = await db.prepare("SELECT expires_at, bound_email FROM license_keys WHERE key_code = ?").bind(code).first();
            const baseTime = Math.max(Date.now(), row?.expires_at || Date.now());
            const newExp = baseTime + days * 86400000;
            await db.prepare("UPDATE license_keys SET expires_at = ?, status = 'active' WHERE key_code = ?").bind(newExp, code).run();
            if (row?.bound_email) {
              await db.prepare("UPDATE users SET key_expires_at = ? WHERE email = ?").bind(newExp, row.bound_email).run();
            }
          } else if (act === "reset_devices") {
            const row = await db.prepare("SELECT bound_email FROM license_keys WHERE key_code = ?").bind(code).first();
            if (row?.bound_email) {
              await db.prepare("UPDATE users SET device_ids = '[]' WHERE email = ?").bind(row.bound_email).run();
            }
          }
          return jsonRes({ ok: true });
        }

        if (path === "/admin/users/password" && request.method === "POST") {
          const b = await request.json();
          const email = (b.email || "").trim().toLowerCase();
          const newPass = String(b.newPassword || "").trim();
          if (!email || newPass.length < 6) return jsonRes({ error: "Mật khẩu mới phải từ 6 ký tự." }, 400);

          const hash = await hashPassword(newPass);
          await db.prepare("UPDATE users SET password_hash = ?, pwd_version = pwd_version + 1 WHERE email = ?")
            .bind(hash, email).run();
          return jsonRes({ ok: true, email, newPassword: newPass });
        }

        if (path === "/admin/users/action" && request.method === "POST") {
          const b = await request.json();
          const email = (b.email || "").trim().toLowerCase();
          if (email === ADMIN_EMAIL) return jsonRes({ error: "Không thể khóa tài khoản Admin chính." }, 400);

          if (b.action === "ban") await db.prepare("UPDATE users SET banned = 1, pwd_version = pwd_version + 1 WHERE email = ?").bind(email).run();
          else if (b.action === "unban") await db.prepare("UPDATE users SET banned = 0 WHERE email = ?").bind(email).run();
          else if (b.action === "reset_devices") await db.prepare("UPDATE users SET device_ids = '[]' WHERE email = ?").bind(email).run();
          else if (b.action === "clear_key") await db.prepare("UPDATE users SET active_key = NULL, plan_type = NULL, key_expires_at = NULL WHERE email = ?").bind(email).run();
          return jsonRes({ ok: true });
        }

        if (path === "/admin/resets/resolve" && request.method === "POST") {
          const b = await request.json();
          const reqRow = await db.prepare("SELECT * FROM reset_requests WHERE id = ?").bind(b.requestId).first();
          if (!reqRow) return jsonRes({ error: "Không tìm thấy phiếu yêu cầu." }, 404);

          const newPass = (b.newPassword || "").trim() || `CGPT@${randomCode(6)}`;
          const hash = await hashPassword(newPass);
          await db.prepare("UPDATE users SET password_hash = ?, pwd_version = pwd_version + 1 WHERE email = ?")
            .bind(hash, reqRow.email).run();
          await db.prepare("UPDATE reset_requests SET status = 'resolved', new_temp_password = ?, resolved_at = ? WHERE id = ?")
            .bind(newPass, Date.now(), reqRow.id).run();

          return jsonRes({ ok: true, email: reqRow.email, keyCode: reqRow.key_code, newPassword: newPass });
        }

        if (path === "/admin/config/save" && request.method === "POST") {
          const b = await request.json();
          const nextCfg = {
            api_base: (b.api_base || cfg.api_base).trim(),
            api_keys: Array.isArray(b.api_keys) ? b.api_keys.map(s => s.trim()).filter(Boolean) : cfg.api_keys,
            models: Array.isArray(b.models) && b.models.length ? b.models : cfg.models,
            plan_limits: b.plan_limits ? { ...cfg.plan_limits, ...b.plan_limits } : cfg.plan_limits
          };
          await db.prepare("INSERT INTO app_config (cfg_key, cfg_value, updated_at) VALUES ('system', ?, ?) ON CONFLICT(cfg_key) DO UPDATE SET cfg_value=excluded.cfg_value, updated_at=excluded.updated_at")
            .bind(JSON.stringify(nextCfg), Date.now()).run();
          return jsonRes({ ok: true, config: nextCfg });
        }

        if (path === "/admin/usage" && request.method === "GET") {
          const base = (cfg.api_base || "https://codex.fosta.app/v1").replace(/\/+$/, "");
          const results = await Promise.all((cfg.api_keys || []).map(async (k, i) => {
            try {
              const r = await fetch(`${base}/usage`, { headers: { Authorization: `Bearer ${k}` } });
              const text = await r.text();
              let data;
              try { data = JSON.parse(text); } catch { data = { raw: text }; }
              return { slot: i + 1, masked: `${k.slice(0, 8)}••••${k.slice(-4)}`, ok: r.ok, data };
            } catch (e) {
              return { slot: i + 1, masked: `${k.slice(0, 8)}••••${k.slice(-4)}`, ok: false, error: e.message };
            }
          }));
          return jsonRes({ ok: true, keys: results });
        }
      }

      return jsonRes({ error: "Không tìm thấy đường dẫn API." }, 404);
    } catch (err) {
      return jsonRes({ error: err.message || "Lỗi máy chủ nội bộ." }, 500);
    }
  }
};
