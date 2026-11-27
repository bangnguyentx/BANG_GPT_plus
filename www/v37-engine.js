/* API AI v3.7 Engine — Multi-Chat Concurrency + Zero-Overlap Adaptive Dock + 60-120fps Throttled Stream & Lazy Render + 3-Group Model Picker & Max Thinking + Zero-Miss Context Engine + Parallel Team Pro + AI Tutor Pro */
(function () {
  "use strict";

  /* =========================================================================
     0. STATE EXTENSIONS & MULTI-CHAT CONCURRENT RUNNER (S.activeRuns)
     ========================================================================= */
  S.activeRuns = new Map(); // chatId -> { abort: AbortController, label: string, type: string, startedAt: number }
  S.chatRenderLimits = new Map(); // chatId -> number of visible tail messages (Lazy Render)
  S.modelGroupsOpen = { chatgpt: false, claude: false, other: false };
  let userScrollLocked = false;
  let scrollIdleTimer = null;

  window.isChatRunning = function (chatId) {
    return Boolean(chatId && S.activeRuns.has(chatId));
  };
  window.getCurrentChatRun = function () {
    return S.activeChatId ? S.activeRuns.get(S.activeChatId) || null : null;
  };
  function syncGlobalStreamingUi() {
    const curRun = window.getCurrentChatRun();
    S.streaming = Boolean(curRun);
    S.abort = curRun ? curRun.abort : null;
    const chat = S.chats.find(c => c.id === S.activeChatId);
    const hasMsgs = Boolean(chat && (chat.messages || []).length > 0);
    const inWorkspace = Boolean(S.activeTeamId || S.activeTutorId);

    document.body.classList.toggle("chat-is-streaming", Boolean(curRun));
    document.body.classList.toggle("chat-has-messages", hasMsgs);
    document.body.classList.toggle("in-workspace-mode", inWorkspace);
    if (typeof updateOrbButton === "function") updateOrbButton();
  }
  window.syncGlobalStreamingUi = syncGlobalStreamingUi;

  function setChatRun(chatId, info) {
    S.activeRuns.set(chatId, { ...info, startedAt: Date.now() });
    syncGlobalStreamingUi();
    renderChatsList();
  }
  function clearChatRun(chatId) {
    S.activeRuns.delete(chatId);
    syncGlobalStreamingUi();
    renderChatsList();
  }
  window.stopCurrentChatRun = function () {
    const run = window.getCurrentChatRun();
    if (run?.abort) {
      try { run.abort.abort(); } catch {}
      showToast("Đã dừng tác vụ của đoạn chat hiện tại");
    }
  };

  // Override handleOrbAction so pressing Stop ONLY aborts the currently viewed chat,
  // and switching to another chat lets you send immediately!
  window.handleOrbAction = function () {
    const curRun = window.getCurrentChatRun();
    if (curRun) { window.stopCurrentChatRun(); return; }
    const has = (document.getElementById("prompt-in")?.value || "").trim().length > 0 || S.atts.length > 0;
    if (has) return sendPrompt();
    openLiveVoice();
  };

  /* =========================================================================
     1. 60-120FPS THROTTLED STREAM PAINTER, SMART AUTO-SCROLL LOCK & GPU RELIEF
     ========================================================================= */
  function createThrottledPainter(fn, intervalMs = 100) {
    let timer = null;
    let lastTs = 0;
    return {
      trigger() {
        const now = performance.now();
        if (now - lastTs >= intervalMs) {
          lastTs = now;
          if (timer) { clearTimeout(timer); timer = null; }
          requestAnimationFrame(fn);
        } else if (!timer) {
          timer = setTimeout(() => {
            timer = null;
            lastTs = performance.now();
            requestAnimationFrame(fn);
          }, intervalMs - (now - lastTs));
        }
      },
      flush() {
        if (timer) { clearTimeout(timer); timer = null; }
        lastTs = performance.now();
        fn();
      }
    };
  }

  function safeScrollBottomIfUnlocked(smooth = false) {
    if (userScrollLocked) return;
    const sc = document.getElementById("chat-scroll");
    if (!sc) return;
    if (smooth) sc.scrollTo({ top: sc.scrollHeight, behavior: "smooth" });
    else sc.scrollTop = sc.scrollHeight;
  }

  function attachScrollPhysics() {
    const sc = document.getElementById("chat-scroll");
    if (!sc) return;
    sc.addEventListener("scroll", () => {
      const distFromBottom = sc.scrollHeight - sc.scrollTop - sc.clientHeight;
      userScrollLocked = distFromBottom > 95;
      document.getElementById("btn-scroll-down")?.classList.toggle("show", userScrollLocked && S.activeChatId !== null);

      if (!document.body.classList.contains("is-scrolling")) {
        document.body.classList.add("is-scrolling");
      }
      clearTimeout(scrollIdleTimer);
      scrollIdleTimer = setTimeout(() => {
        document.body.classList.remove("is-scrolling");
      }, 170);
    }, { passive: true });

    const origScrollToBottom = window.scrollToBottom;
    window.scrollToBottom = function (sm) {
      userScrollLocked = false;
      origScrollToBottom(sm);
    };
  }

  function typesetSingleMsgMath(msgId) {
    const el = document.querySelector(`[data-msg-id="${msgId}"]`);
    if (el) typesetMathInElement(el);
  }

  /* =========================================================================
     2. 3-GROUP COLLAPSIBLE MODEL PICKER (TỰ ĐỘNG / CHATGPT / CLAUDE) + MAX THINKING + PER-MODEL MEMORY
     ========================================================================= */
  function classifyModelGroup(m) {
    const key = `${m.id || ""} ${m.mapped || ""} ${m.title || ""}`.toLowerCase();
    if (m.id === "auto" || m.mapped === "auto") return "auto";
    if (key.includes("gpt") || key.includes("o1") || key.includes("o3") || key.includes("o4") || key.includes("codex")) return "chatgpt";
    if (key.includes("claude") || key.includes("sonnet") || key.includes("opus") || key.includes("fable") || key.includes("haiku")) return "claude";
    return "other";
  }

  window.toggleModelGroup = function (grpKey, ev) {
    if (ev) ev.stopPropagation();
    haptic("tap");
    S.modelGroupsOpen[grpKey] = !S.modelGroupsOpen[grpKey];
    const acc = document.getElementById("mg-acc-" + grpKey);
    const chv = document.getElementById("mg-chv-" + grpKey);
    acc?.classList.toggle("open", S.modelGroupsOpen[grpKey]);
    chv?.classList.toggle("rot", S.modelGroupsOpen[grpKey]);
  };

  window.renderModelDropdown = function () {
    const m = S.models.find(x => x.id === S.cfg.selectedModel) || S.models.find(x => x.allowed) || S.models[0];
    const t = THINK_LEVELS.find(x => x.id === S.cfg.thinkingLevel) || THINK_LEVELS[2];
    const topEl = document.getElementById("top-model-text");
    if (topEl) topEl.textContent = `${m?.short || m?.title || "API AI"} ${t.title}`;

    // Auto-open the active model's family group when rendering
    const activeGrp = m ? classifyModelGroup(m) : "chatgpt";
    if (activeGrp === "chatgpt" || activeGrp === "claude" || activeGrp === "other") {
      S.modelGroupsOpen[activeGrp] = true;
    }

    const autoModel = S.models.find(x => classifyModelGroup(x) === "auto");
    const gptModels = S.models.filter(x => classifyModelGroup(x) === "chatgpt");
    const claudeModels = S.models.filter(x => classifyModelGroup(x) === "claude");
    const otherModels = S.models.filter(x => classifyModelGroup(x) === "other");

    const renderOptRow = it => {
      const locked = !it.allowed, sel = it.id === S.cfg.selectedModel;
      const tierTag = locked
        ? `<span class="tag-st tier-${it.min_tier || "ultra"}">${esc(it.min_tier_label || "Nâng cấp")}</span>`
        : (it.badge ? `<span class="tag-quiet">${esc(it.badge)}</span>` : "");
      return `<button type="button" class="drop-opt tap-soft ${sel?"selected":""} ${locked?"locked":""}" onclick="pickModel('${esc(it.id)}',${locked},'${esc(it.min_tier_label || "")}')">
        <span class="opt-check">${sel ? ICON_CHECK : (locked ? ICON_LOCK : "")}</span>
        <div class="opt-main">
          <div class="opt-title">${esc(it.title)} ${tierTag}</div>
          <div class="opt-sub">${esc(it.sub || it.mapped)}</div>
        </div></button>`;
    };

    const renderGroup = (key, title, list) => {
      if (!list.length) return "";
      const selItem = list.find(x => x.id === S.cfg.selectedModel);
      const isOpen = Boolean(S.modelGroupsOpen[key]);
      return `<div class="mod-group-wrap">
        <button type="button" class="mod-group-head tap-soft ${selItem ? "has-selected" : ""}" onclick="toggleModelGroup('${key}', event)">
          <span class="mod-group-left">
            <span class="opt-check">${selItem ? ICON_CHECK : ""}</span>
            <span class="mod-group-title">${esc(title)}</span>
            <span class="tag-quiet num">${list.length}</span>
          </span>
          <span style="display:inline-flex;align-items:center;gap:6px;flex-shrink:0;">
            ${selItem ? `<span class="mod-group-active-tag">${esc(selItem.short || selItem.title)}</span>` : ""}
            <span id="mg-chv-${key}" class="chev ${isOpen ? "rot" : ""}"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></span>
          </span>
        </button>
        <div id="mg-acc-${key}" class="acc-wrap ${isOpen ? "open" : ""}">
          <div class="acc-inner"><div class="mod-group-list">${list.map(renderOptRow).join("")}</div></div>
        </div>
      </div>`;
    };

    let html = "";
    if (autoModel) html += renderOptRow(autoModel);
    html += renderGroup("chatgpt", "ChatGPT", gptModels);
    html += renderGroup("claude", "Claude", claudeModels);
    if (otherModels.length) html += renderGroup("other", "Model khác", otherModels);

    const modOpts = document.getElementById("model-opts");
    if (modOpts) modOpts.innerHTML = html;

    const thinkOpts = document.getElementById("thinking-opts");
    if (thinkOpts) {
      thinkOpts.innerHTML = THINK_LEVELS.map(lv => {
        const sel = lv.id === S.cfg.thinkingLevel;
        return `<button type="button" class="drop-opt tap-soft ${sel?"selected":""}" onclick="pickThink('${lv.id}')">
          <span class="opt-check">${sel ? ICON_CHECK : ""}</span>
          <div class="opt-main"><div class="opt-title">${esc(lv.title)}${lv.id === "max" ? ` <span class="tag-st tier-ultra">Cực đại</span>` : ""}</div><div class="opt-sub">${esc(lv.sub)}</div></div></button>`;
      }).join("");
    }
  };

  window.pickModel = function (id, locked, needTier) {
    haptic("tap");
    if (locked) return showToast(`Model này yêu cầu Key hạng ${needTier || "cao hơn"}`, "warn");
    S.cfg.selectedModel = id;
    S.cfg.modelThinkingMap = S.cfg.modelThinkingMap || {};
    // Restore per-model remembered thinking level if user previously set one!
    const remembered = S.cfg.modelThinkingMap[id];
    if (remembered && THINK_LEVELS.some(x => x.id === remembered)) {
      S.cfg.thinkingLevel = remembered;
    }
    dbPut("kv", S.cfg);
    renderModelDropdown();
    closePopovers();
  };

  window.pickThink = function (id) {
    haptic("tap");
    S.cfg.thinkingLevel = id;
    S.cfg.modelThinkingMap = S.cfg.modelThinkingMap || {};
    if (S.cfg.selectedModel) S.cfg.modelThinkingMap[S.cfg.selectedModel] = id;
    dbPut("kv", S.cfg);
    renderModelDropdown();
    closePopovers();
    if (id === "max") {
      showToast("Đã bật tư duy Max · suy luận cực đại (tiêu thụ nhiều token hơn)", "warn");
    }
  };

  // Hide Hero Prompt Strip permanently (Image 5)
  window.renderHeroPrompts = function () {
    const el = document.getElementById("hero-prompts-strip");
    if (el) { el.innerHTML = ""; el.style.display = "none"; }
  };

  /* =========================================================================
     3. ZERO-MISS CONTEXT ENGINE (FIXES "AI KHÔNG TÌM THẤY FILE BỐI CẢNH" 100%)
     ========================================================================= */
  function getResolvedContextObj(chat, team = null, tutor = null, queryText = "") {
    const cid = team?.contextId || tutor?.contextId || chat?.contextId || S.activeContextId;
    if (cid) {
      const hit = (S.contexts || []).find(c => c.id === cid);
      if (hit) return hit;
    }
    // Zero-Miss Fallback: if user created boi-canh.md and is in a Team/Tutor OR mentions context/file, auto-resolve latest!
    if ((S.contexts || []).length) {
      const q = String(queryText || "").toLowerCase();
      // Exact title match first
      const byTitle = S.contexts.find(c => c.title && q.includes(c.title.toLowerCase().replace(/\.md$/, "")));
      if (byTitle) return byTitle;
      if (team || tutor || /(bối cảnh|boi-canh|hồ sơ|file nền|tài liệu nền)/i.test(q)) {
        return S.contexts[0];
      }
    }
    return null;
  }

  // Zero-Miss Filename Auto-Matcher across Contexts, Notebooks, WorkspaceFiles, Team files, Tutor files & Library!
  function buildZeroMissContextBundle(chat, queryText, team = null, tutor = null) {
    const sections = [];
    const seenKeys = new Set();
    const budgetMax = 16500; // Upgraded from 5,000 -> 16,500 chars!
    let usedChars = 0;

    const pushDoc = (key, header, body, cap = 5500) => {
      if (!body || !String(body).trim() || seenKeys.has(key) || usedChars >= budgetMax) return;
      seenKeys.add(key);
      const avail = Math.min(cap, budgetMax - usedChars);
      if (avail < 120) return;
      const chunk = `[${header}]\n${String(body).trim().slice(0, avail)}`;
      sections.push(chunk);
      usedChars += chunk.length;
    };

    // 1. Primary Shared Context (boi-canh.md)
    const ctxObj = getResolvedContextObj(chat, team, tutor, queryText);
    if (ctxObj?.content) {
      pushDoc("ctx:" + ctxObj.id, `HỒ SƠ NGỮ CẢNH CHUNG (${ctxObj.title} — NGUỒN SỰ THẬT DUY NHẤT)`, ctxObj.content, 7500);
    }

    // 2. Persistent Workspace Files pinned to this chat / team / tutor (NEVER lost on Turn 2, Turn 3!)
    const wsFiles = [
      ...(team?.sharedFiles || []),
      ...(chat?.workspaceFiles || [])
    ];
    for (const f of wsFiles) {
      if (f.text) pushDoc("ws:" + (f.id || f.name), `TỆP PHÒNG LÀM VIỆC: ${f.name}`, f.text, 4500);
    }

    // 3. Previously uploaded files inside this chat's message history (even if sent 3 turns ago!)
    for (const m of [...(chat?.messages || [])].reverse()) {
      for (const a of (m.atts || [])) {
        if (a.type === "file" && a.text) {
          pushDoc("att:" + a.name, `TỆP ĐÃ GỬI TRONG PHÒNG: ${a.name}`, a.text, 4000);
        }
      }
    }

    // 4. Filename Auto-Matcher: if user prompt names ANY file/title from Contexts, Notebooks, Tutors, Library
    const qLow = String(queryText || "").toLowerCase();
    if (qLow.length >= 3) {
      const scanPool = [
        ...(S.contexts || []).map(c => ({ k: "ctx:" + c.id, name: c.title, body: c.content, tag: "HỒ SƠ BỐI CẢNH KHỚP TÊN" })),
        ...(S.notebooks || []).map(n => ({ k: "nb:" + n.id, name: n.title, body: n.notes, tag: "SỔ GHI CHÚ KHỚP TÊN" })),
        ...(S.library || []).filter(l => l.type === "doc").map(l => ({ k: "lib:" + l.id, name: l.title, body: l.data, tag: "TÀI LIỆU THƯ VIỆN KHỚP TÊN" })),
        ...(tutor?.baseFiles || []).map(f => ({ k: "tb:" + f.name, name: f.name, body: f.digest || f.content, tag: "TÀI LIỆU GIA SƯ" })),
        ...(tutor?.classNotes || []).map(n => ({ k: "tn:" + n.id, name: n.title || n.date, body: n.digest || n.content, tag: "GHI CHÚ LỚP GIA SƯ" }))
      ];
      for (const it of scanPool) {
        const cleanName = String(it.name || "").toLowerCase().trim();
        const stem = cleanName.replace(/\.[a-z0-9]{1,5}$/i, "");
        if ((cleanName.length >= 3 && qLow.includes(cleanName)) || (stem.length >= 4 && qLow.includes(stem))) {
          pushDoc(it.k, `${it.tag}: ${it.name}`, it.body, 4000);
        }
      }
    }

    return {
      textBlock: sections.join("\n\n"),
      ctxObj,
      fileCount: seenKeys.size
    };
  }
  window.buildZeroMissContextBundle = buildZeroMissContextBundle;

  function persistAttachmentsToChatWorkspace(chat, atts) {
    if (!chat || !Array.isArray(atts) || !atts.length) return;
    chat.workspaceFiles = chat.workspaceFiles || [];
    for (const a of atts) {
      if (a.type === "file" && a.text) {
        const exists = chat.workspaceFiles.findIndex(x => x.name === a.name);
        const rec = { id: a.id || ("ws-" + Date.now() + Math.random().toString(36).slice(2, 5)), type: "file", name: a.name, text: a.text.slice(0, 12000), addedAt: Date.now() };
        if (exists >= 0) chat.workspaceFiles[exists] = rec;
        else chat.workspaceFiles.unshift(rec);
      } else if (a.dataUrl) {
        const exists = chat.workspaceFiles.findIndex(x => x.name === a.name);
        if (exists < 0) {
          chat.workspaceFiles.unshift({ id: a.id || ("wsi-" + Date.now()), type: "image", name: a.name, dataUrl: a.dataUrl, addedAt: Date.now() });
        }
      }
    }
    chat.workspaceFiles = chat.workspaceFiles.slice(0, 12);
  }

  window.renderTopContextPill = function () {
    const el = document.getElementById("top-ctx-pill");
    if (!el) return;
    const chat = S.chats.find(c => c.id === S.activeChatId);
    const team = S.activeTeamId ? S.teams.find(t => t.id === S.activeTeamId) : null;
    const tutor = S.activeTutorId ? S.tutors.find(t => t.id === S.activeTutorId) : null;
    const ctx = getResolvedContextObj(chat, team, tutor, "");
    const wsCnt = (chat?.workspaceFiles || []).length + (team?.sharedFiles || []).length + (tutor?.baseFiles || []).length;

    if (ctx || wsCnt > 0) {
      el.classList.add("attached");
      const namePart = ctx ? (ctx.title || "boi-canh.md").slice(0, 16) : "Tệp phòng";
      el.textContent = wsCnt > 0 ? `${namePart} +${wsCnt}` : namePart;
    } else {
      el.classList.remove("attached");
      el.textContent = "+ Bối cảnh";
    }
  };

  window.openWorkspaceFilesModal = function () {
    haptic("tap");
    const chat = S.chats.find(c => c.id === S.activeChatId);
    const team = S.activeTeamId ? S.teams.find(t => t.id === S.activeTeamId) : null;
    const tutor = S.activeTutorId ? S.tutors.find(t => t.id === S.activeTutorId) : null;
    const activeCtx = getResolvedContextObj(chat, team, tutor, "");
    const wsFiles = chat?.workspaceFiles || [];
    const teamFiles = team?.sharedFiles || [];
    const tutorFiles = tutor?.baseFiles || [];

    const ctxSelectRows = (S.contexts || []).map(c => {
      const isCur = activeCtx?.id === c.id;
      return `<div class="mem-chip-row" style="margin-bottom:5px;${isCur ? "border:1px solid var(--ok-rim);background:var(--ok-soft);" : ""}">
        <div style="flex:1;min-width:0;">
          <strong style="font-family:var(--font-mono);font-size:12.5px;">${esc(c.title)}</strong>
          <div style="font-size:11.5px;color:var(--ink-2);">${Math.max(1, Math.round((c.content||"").length/1024))}KB · ${isCur ? "Đang nạp tự động" : "Chưa gắn"}</div>
        </div>
        <button type="button" class="btn-s tap" style="height:28px;padding:0 10px;font-size:11.5px;" onclick="pinWorkspaceContext('${c.id}')">${isCur ? "Đang dùng" : "Chọn"}</button>
        <button type="button" class="mini-act tap" onclick="openSharedContextEditor('${c.id}')">${ICON_EDIT}</button>
      </div>`;
    }).join("") || `<div style="font-size:12px;color:var(--ink-3);margin-bottom:8px;">Chưa có file boi-canh.md nào. Bấm "+ Tạo boi-canh.md" bên dưới.</div>`;

    const allPinned = [
      ...wsFiles.map((f, i) => ({ ...f, src: "chat", idx: i })),
      ...teamFiles.map((f, i) => ({ ...f, src: "team", idx: i })),
      ...tutorFiles.map((f, i) => ({ ...f, src: "tutor", idx: i }))
    ];

    openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:4px;">Hồ sơ bối cảnh &amp; Tệp đang nạp</h3>
      <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:10px;">Mọi file trong danh sách dưới đây được AI đọc xuyên suốt mọi lượt trò chuyện (tối đa 16.5K ký tự, tự động khớp tên file khi bạn nhắc).</p>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <strong style="font-size:13px;">File boi-canh.md (${(S.contexts || []).length})</strong>
        <button type="button" class="btn-s tap" style="height:28px;padding:0 10px;font-size:11.5px;" onclick="openSharedContextEditor(null)">+ Tạo boi-canh.md</button>
      </div>
      <div style="max-height:150px;overflow-y:auto;margin-bottom:12px;">${ctxSelectRows}</div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <strong style="font-size:13px;">Tệp đính kèm ghim trong phòng (${allPinned.length})</strong>
        <button type="button" class="btn-blue tap" style="height:30px;padding:0 10px;font-size:12px;" onclick="document.getElementById('in-ws-file').click()">+ Thêm tệp / ảnh</button>
      </div>
      <div style="max-height:160px;overflow-y:auto;">
        ${allPinned.map(f => `<div class="mem-chip-row" style="margin-bottom:4px;">
          <span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:var(--font-mono);font-size:12px;">${esc(f.name)} ${f.text ? `(${Math.max(1, Math.round(f.text.length/1024))}KB)` : "(Ảnh)"}</span>
          <button type="button" class="mini-act tap" onclick="removeWorkspaceFile('${f.src}',${f.idx})">${ICON_X}</button>
        </div>`).join("") || `<div style="font-size:12px;color:var(--ink-3);">Chưa có tệp ghim nào. Bạn có thể bấm "+ Thêm tệp / ảnh" hoặc gửi tệp ngay trong khung chat.</div>`}
      </div>

      <div style="display:flex;justify-content:flex-end;margin-top:14px;">
        <button type="button" class="btn-p tap" onclick="closeModal()">Xong</button>
      </div>`);
  };

  window.pinWorkspaceContext = async function (ctxId) {
    S.activeContextId = ctxId;
    const chat = S.chats.find(c => c.id === S.activeChatId);
    const team = S.activeTeamId ? S.teams.find(t => t.id === S.activeTeamId) : null;
    const tutor = S.activeTutorId ? S.tutors.find(t => t.id === S.activeTutorId) : null;
    if (chat) { chat.contextId = ctxId; await dbPut("chats", chat).catch(() => {}); }
    if (team) { team.contextId = ctxId; await dbPut("teams", team).catch(() => {}); apiFetch("/sync/teams", { method: "POST", body: team }).catch(() => {}); }
    if (tutor) { tutor.contextId = ctxId; await dbPut("tutors", tutor).catch(() => {}); apiFetch("/sync/tutors", { method: "POST", body: tutor }).catch(() => {}); }
    renderTopContextPill();
    renderActiveContextBanner();
    haptic("ok");
    openWorkspaceFilesModal();
  };

  window.handleWorkspaceFilePick = async function (files) {
    if (!files || !files.length) return;
    let chat = S.chats.find(c => c.id === S.activeChatId);
    const team = S.activeTeamId ? S.teams.find(t => t.id === S.activeTeamId) : null;
    const tutor = S.activeTutorId ? S.tutors.find(t => t.id === S.activeTutorId) : null;
    if (!chat) {
      chat = {
        id: "c-" + Date.now(),
        title: team ? `[Team: ${team.name}]` : (tutor ? `[Gia sư ${tutor.subject}]` : "Phòng làm việc mới"),
        pinned: false, mode: team ? "team" : (tutor ? "tutor" : "chat"),
        teamId: team?.id || null, tutorId: tutor?.id || null, contextId: S.activeContextId || null,
        workspaceFiles: [], updatedAt: Date.now(), messages: []
      };
      S.chats.unshift(chat); S.activeChatId = chat.id;
    }
    chat.workspaceFiles = chat.workspaceFiles || [];

    for (const f of files) {
      if ((f.type || "").startsWith("image/")) {
        const p = await processImageFile(f);
        chat.workspaceFiles.unshift({ id: "wsi-" + Date.now() + Math.random().toString(36).slice(2, 4), type: "image", name: f.name, dataUrl: p.dataUrl, addedAt: Date.now() });
      } else {
        const { text } = await extractRealFileText(f);
        const rec = { id: "ws-" + Date.now() + Math.random().toString(36).slice(2, 4), type: "file", name: f.name, text: text.slice(0, 14000), addedAt: Date.now() };
        if (team) {
          team.sharedFiles = team.sharedFiles || [];
          team.sharedFiles.unshift(rec);
          await dbPut("teams", team);
          apiFetch("/sync/teams", { method: "POST", body: team }).catch(() => {});
        } else if (tutor) {
          tutor.baseFiles = tutor.baseFiles || [];
          tutor.baseFiles.unshift({ name: f.name, content: text.slice(0, 14000), digest: "" });
          await dbPut("tutors", tutor);
          apiFetch("/sync/tutors", { method: "POST", body: tutor }).catch(() => {});
        } else {
          chat.workspaceFiles.unshift(rec);
        }
      }
    }
    await dbPut("chats", chat).catch(() => {});
    apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {});
    document.getElementById("in-ws-file").value = "";
    renderTopContextPill();
    renderActiveContextBanner();
    haptic("ok");
    showToast(`Đã ghim ${files.length} tệp vào phòng làm việc`, "ok");
    if (document.getElementById("modal-bg")?.classList.contains("open")) openWorkspaceFilesModal();
  };

  window.removeWorkspaceFile = async function (src, idx) {
    const chat = S.chats.find(c => c.id === S.activeChatId);
    const team = S.activeTeamId ? S.teams.find(t => t.id === S.activeTeamId) : null;
    const tutor = S.activeTutorId ? S.tutors.find(t => t.id === S.activeTutorId) : null;
    if (src === "chat" && chat?.workspaceFiles) { chat.workspaceFiles.splice(idx, 1); await dbPut("chats", chat); }
    if (src === "team" && team?.sharedFiles) { team.sharedFiles.splice(idx, 1); await dbPut("teams", team); }
    if (src === "tutor" && tutor?.baseFiles) { tutor.baseFiles.splice(idx, 1); await dbPut("tutors", tutor); }
    renderTopContextPill(); renderActiveContextBanner(); openWorkspaceFilesModal();
  };

  // Enhance buildSystemPrompt with Zero-Miss Context Bundle + Tutor Socratic/Direct + Exam Directives
  const _origBuildSys = window.buildSystemPrompt;
  window.buildSystemPrompt = function (chat, query, hasImgs, handoffSummary = "", digestedRepoText = "", tutorExtraSys = "") {
    let base = _origBuildSys(chat, query, hasImgs, handoffSummary, digestedRepoText, tutorExtraSys);
    const team = S.activeTeamId ? S.teams.find(t => t.id === S.activeTeamId) : null;
    const tutor = S.activeTutorId ? S.tutors.find(t => t.id === S.activeTutorId) : null;
    const bundle = buildZeroMissContextBundle(chat, query, team, tutor);
    if (bundle.textBlock) {
      base = `${base}\n\n=== ZERO-MISS WORKSPACE CONTEXT (ƯU TIÊN ĐỌC ĐẦY ĐỦ) ===\n${bundle.textBlock}`;
    }
    if (tutor) {
      const style = tutor.teachStyle === "socratic"
        ? "CHẾ ĐỘ GỢI MỞ (SOCRATIC): Không đưa đáp án cuối ngay; hãy dẫn dắt từng bước bằng câu hỏi gợi mở ngắn để học viên tự tư duy ra lời giải."
        : "CHẾ ĐỘ GIẢI THẲNG THỰC CHIẾN: Trình bày lời giải sắc gọn, chuẩn barem chấm điểm, chỉ rõ bẫy đề thi và mẹo bấm máy tính Casio 580/880 (nếu là bài tính toán).";
      base += `\n\n${style}`;
      if ((tutor.topics || []).length) {
        base += `\nBẢN ĐỒ CHUYÊN ĐỀ CỦA HỌC VIÊN: ${tutor.topics.map(tp => `${tp.name} (${tp.mastery}%)`).join(" | ")}`;
      }
      base += `\n\nCHẤM ĐIỂM ĐỀ THI TỰ ĐỘNG (apiai-exam-result): Nếu bạn vừa chấm xong bài làm/đề thi bấm giờ của học viên, hãy xuất thêm ĐÚNG 1 khối JSON chuẩn đặt trong ${"`".repeat(3)}apiai-exam-result ... ${"`".repeat(3)}: {"score":"8.5/10","correct":8,"total":10,"summary":"Nhận xét ngắn 1 câu","wrongItems":["Câu 3: Quên điều kiện logarit > 0","Câu 7: Nhầm dấu đạo hàm"],"topicUpdates":[{"name":"Tích phân","mastery":75}]}`;
    }
    return base;
  };

  /* =========================================================================
     4. COMPACT TOP WORKSPACE BAR (TEAM PRO + TUTOR PRO — REPLACES BOTTOM CLUTTER)
     ========================================================================= */
  window.renderActiveContextBanner = function () {
    const el = document.getElementById("active-context-banner");
    if (!el) return;
    const team = S.activeTeamId ? S.teams.find(t => t.id === S.activeTeamId) : null;
    const tutor = S.activeTutorId ? S.tutors.find(t => t.id === S.activeTutorId) : null;
    const chat = S.chats.find(c => c.id === S.activeChatId);

    if (team) {
      const cnt = (team.members || []).filter(m => m.enabled !== false).length;
      const depth = Number(team.debateRounds || 1);
      const ctx = getResolvedContextObj(chat, team, null, "");
      const fCnt = (chat?.workspaceFiles || []).length + (team.sharedFiles || []).length;
      el.style.display = "flex";
      el.innerHTML = `<div class="ws-top-bar">
        <div class="ws-top-main">
          <div class="ws-top-title">${esc(team.name)}</div>
          <div class="ws-top-meta">${cnt} thành viên · ${team.coordMode === "council" ? "Hội đồng song song" : "Dây chuyền"} · ${depth >= 2 ? "Tranh luận sâu 2 vòng" : "Nhanh 1 vòng"}${ctx ? ` · ${esc(ctx.title)}` : ""}${fCnt ? ` (+${fCnt} tệp)` : ""}</div>
        </div>
        <div class="ws-top-acts">
          <button type="button" class="ws-chip-btn accent tap" onclick="toggleTeamDebateDepth('${team.id}')">${depth >= 2 ? "Sâu 2 vòng" : "1 vòng"}</button>
          <button type="button" class="ws-chip-btn tap" onclick="openWorkspaceFilesModal()">Tệp</button>
          <button type="button" class="ws-chip-btn tap" onclick="openTeamEditor('${team.id}')">Sửa</button>
          <button type="button" class="mini-act tap" onclick="S.activeTeamId=null;setWorkMode('chat',false);syncGlobalStreamingUi()" aria-label="Thoát Team">${ICON_X}</button>
        </div>
      </div>`;
      syncGlobalStreamingUi();
      return;
    }

    if (tutor) {
      const isSoc = tutor.teachStyle === "socratic";
      const due = getDueMistakes(tutor).length;
      el.style.display = "flex";
      el.innerHTML = `<div class="ws-top-bar">
        <div class="ws-top-main">
          <div class="ws-top-title">Gia sư ${esc(tutor.name)} · ${esc(tutor.subject)}</div>
          <div class="ws-top-meta">${tutor.streak ? `Chuỗi ${tutor.streak} ngày` : "Sẵn sàng học"}${due ? ` · Ôn ${due} lỗi` : ""} · ${(tutor.topics || []).length} chuyên đề</div>
        </div>
        <div class="ws-top-acts">
          <button type="button" class="ws-chip-btn ${isSoc ? "accent" : "ok"} tap" onclick="toggleTutorTeachStyle('${tutor.id}')">${isSoc ? "Gợi mở" : "Giải thẳng"}</button>
          <button type="button" class="ws-chip-btn tap" onclick="openTutorExamModal('${tutor.id}')">Thi thử</button>
          <button type="button" class="ws-chip-btn tap" onclick="openTutorFlashcardModal('${tutor.id}')">Ôn 5p</button>
          <button type="button" class="ws-chip-btn tap" onclick="openTutorMasteryModal('${tutor.id}')">Tiến độ</button>
          <button type="button" class="mini-act tap" onclick="S.activeTutorId=null;setWorkMode('chat',false);renderMessages();syncGlobalStreamingUi()" aria-label="Thoát Gia sư">${ICON_X}</button>
        </div>
      </div>`;
      syncGlobalStreamingUi();
      return;
    }

    el.style.display = "none";
    el.innerHTML = "";
    syncGlobalStreamingUi();
  };

  window.toggleTeamDebateDepth = async function (teamId) {
    const t = S.teams.find(x => x.id === teamId); if (!t) return;
    t.debateRounds = Number(t.debateRounds || 1) >= 2 ? 1 : 2;
    await dbPut("teams", t);
    apiFetch("/sync/teams", { method: "POST", body: t }).catch(() => {});
    haptic("switch");
    renderActiveContextBanner();
    showToast(t.debateRounds === 2 ? "Đã bật chế độ Tranh luận sâu 2 vòng" : "Đã chuyển về chế độ Nhanh 1 vòng");
  };

  window.toggleTutorTeachStyle = async function (tutorId) {
    const t = S.tutors.find(x => x.id === tutorId); if (!t) return;
    t.teachStyle = t.teachStyle === "socratic" ? "direct" : "socratic";
    await dbPut("tutors", t);
    apiFetch("/sync/tutors", { method: "POST", body: t }).catch(() => {});
    haptic("switch");
    renderActiveContextBanner();
    showToast(t.teachStyle === "socratic" ? "Đã bật chế độ Gợi mở từng bước (Socratic)" : "Đã bật chế độ Giải thẳng thực chiến + Mẹo Casio");
  };

  /* =========================================================================
     5. CONCURRENT MULTI-CHAT SENDPROMPT + THROTTLED STREAMING
     ========================================================================= */
  window.sendPrompt = async function (overrideText = null, opts = {}) {
    // Only block/stop if the CURRENTLY VIEWED chat is already running!
    if (window.getCurrentChatRun()) {
      window.stopCurrentChatRun();
      return;
    }
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
    document.getElementById("hash-popup")?.classList.remove("open");
    haptic("tap");

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

    const activeTeam = opts.forceSingleChat ? null : (S.activeTeamId ? S.teams.find(t => t.id === S.activeTeamId) : null);
    const activeTutor = S.activeTutorId ? S.tutors.find(t => t.id === S.activeTutorId) : null;

    let chat = S.chats.find(c => c.id === S.activeChatId);
    if (!chat) {
      const prefix = activeTeam ? `[Team: ${activeTeam.name}] ` : (activeTutor ? `[Gia sư ${activeTutor.subject}] ` : "");
      chat = {
        id: "c-" + Date.now(),
        title: (prefix + (text || S.atts[0]?.name || "Cuộc trò chuyện mới")).slice(0, 48),
        pinned: false,
        mode: activeTeam ? "team" : (activeTutor ? "tutor" : S.cfg.workMode),
        teamId: activeTeam?.id || null,
        tutorId: activeTutor?.id || null,
        contextId: activeTeam?.contextId || activeTutor?.contextId || S.activeContextId || null,
        nbId: S.activeNbId,
        workspaceFiles: [],
        pinnedProvider: null, pinnedKeyIndex: null, pinnedSlotLabel: "",
        updatedAt: Date.now(), messages: []
      };
      S.chats.unshift(chat);
      S.activeChatId = chat.id;
    }

    let sentAtts = [];
    if (!opts.reuseLastUser) {
      sentAtts = [...S.atts];
      persistAttachmentsToChatWorkspace(chat, sentAtts);
      const autoDetectNewKnowledge = activeTutor && detectNewClassKnowledge(text);
      chat.messages.push({
        id: "m-" + Date.now(), role: "user", text, atts: sentAtts,
        suggestSaveTutorId: autoDetectNewKnowledge ? activeTutor.id : null,
        ts: Date.now()
      });
      chat.updatedAt = Date.now();
      if (overrideText === null && input) { input.value = ""; autoGrow(); saveCurrentDraft(); }
      S.atts = [];
      renderChips(); renderTopContextPill(); renderMessages(); renderChatsList();
      userScrollLocked = false;
      scrollToBottom(true);
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

    let chosenUi = S.models.find(m => m.id === (opts.forceModelId || S.cfg.selectedModel)) || S.models.find(x => x.allowed) || S.models[0];
    let tutorExtraSys = "";
    if (activeTutor) {
      await markTutorStudiedToday(activeTutor);
      const resolvedId = resolveTutorModelId(activeTutor, text);
      chosenUi = S.models.find(m => m.id === resolvedId && m.allowed) || chosenUi;
      tutorExtraSys = await buildTutorSystemPrompt(activeTutor, text);
    }

    let digestedRepoText = "";
    const activeRepoSkills = S.skillIds.map(id => S.skills.find(x => x.id === id)).filter(sk => sk?.repoFiles?.length);
    if (activeRepoSkills.length) {
      digestedRepoText = await digestActiveReposForQuery(activeRepoSkills, text, chosenUi);
    }

    const sysPrompt = (opts.customSysPrefix ? `${opts.customSysPrefix}\n\n` : "")
      + buildSystemPrompt(chat, text, sentAtts.some(a => a.dataUrl), opts.handoffSummary || "", digestedRepoText, tutorExtraSys);

    const thinkLv = S.cfg.thinkingLevel || "high";
    const chatId = chat.id;
    const ctrl = new AbortController();
    setChatRun(chatId, { abort: ctrl, label: chosenUi.short || chosenUi.title, type: "chat" });

    bgStartTask(activeTutor ? `Gia sư ${activeTutor.name} đang soạn bài` : "API AI đang trả lời", `${chosenUi.short || chosenUi.title} · giữ kết nối nền`);

    const aiMsg = {
      id: "m-" + (Date.now() + 1), role: "assistant", text: "", thinking: "", thinkingLevel: thinkLv, thinkMs: 0,
      modelLabel: opts.customModelLabel || `${chosenUi.short || chosenUi.title} · ${THINK_LEVELS.find(x => x.id === thinkLv)?.title || "Cao"}`,
      slot: "", citedFile: sentAtts[0]?.name || "", toolSteps: [], sources: [], fetchedRepoUrl: "",
      feedback: null, streaming: true, failedSwitch: false, canSwitch: false, isPlanLock: Boolean(S._turnPlanLock), planPrompt: S._turnPlanLock ? text : "", ts: Date.now()
    };
    chat.messages.push(aiMsg);
    if (S.activeChatId === chatId) { renderMessages(); safeScrollBottomIfUnlocked(true); }

    try {
      const preFlightContext = await runPreFlightToolsAndMcp(aiMsg, text, chosenUi);
      const fullSysPrompt = preFlightContext ? `${sysPrompt}\n\n${preFlightContext}` : sysPrompt;
      const msgs = typeof window.v60BuildAntiAmnesiaPayload === "function"
        ? window.v60BuildAntiAmnesiaPayload(chat, aiMsg, fullSysPrompt, text)
        : [{ role: "system", content: fullSysPrompt }];

      const res = await apiFetch("/ai/chat", {
        method: "POST",
        body: {
          chatId,
          mode: activeTutor ? "tutor" : "chat",
          uiModelId: chosenUi.id,
          thinkingLevel: thinkLv,
          tool: S.activeTool,
          messages: msgs,
          stream: true,
          pinnedProvider: chat.pinnedProvider,
          pinnedKeyIndex: chat.pinnedKeyIndex,
          forceSwitch: Boolean(opts.forceSwitch)
        },
        signal: ctrl.signal
      });

      if (!res.ok) {
        const ej = await res.json().catch(() => ({ error: "HTTP " + res.status }));
        if (ej.code === "MAINTENANCE") applySystemMeta({ ...S.system, maintenance: { enabled: true, message: ej.error } });
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
          aiMsg.failedSwitch = true; aiMsg.canSwitch = Boolean(ej.canSwitch); aiMsg.text = ej.error;
          return;
        }
        throw new Error(ej.error || `HTTP ${res.status}`);
      }

      const pId = res.headers.get("X-Provider-Id"), kIdx = res.headers.get("X-Key-Index"), slotLbl = res.headers.get("X-Key-Slot");
      if (pId && kIdx !== null) {
        chat.pinnedProvider = pId; chat.pinnedKeyIndex = Number(kIdx); chat.pinnedSlotLabel = slotLbl || `${pId} #${Number(kIdx) + 1}`;
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
          if (aiMsg.text.includes("</think>")) aiMsg.text = aiMsg.text.replace(/<think>[\s\S]*?<\/think>/i, "").trimStart();
          else aiMsg.text = "";
        }
      };

      const painter = createThrottledPainter(() => {
        if (S.activeChatId !== chatId) return;
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
        safeScrollBottomIfUnlocked(false);
      }, 105);

      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (ct.includes("text/event-stream") && res.body?.getReader) {
        const reader = res.body.getReader(), dec = new TextDecoder("utf-8");
        let buf = "", rawContentAcc = "";
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
              if (rDelta) { aiMsg.thinking += rDelta; aiMsg.thinkMs = Date.now() - thinkStart; painter.trigger(); }
              if (cDelta) {
                if (!aiMsg.text && aiMsg.thinking && !aiMsg.thinkMs) aiMsg.thinkMs = Date.now() - thinkStart;
                rawContentAcc += cDelta; aiMsg.text = rawContentAcc; extractInlineThinkTags(); painter.trigger();
              }
            } catch {}
          }
        }
        if (aiMsg.thinking && !aiMsg.thinkMs) aiMsg.thinkMs = Date.now() - thinkStart;
        painter.flush();
      } else {
        const raw = await res.text();
        try {
          const j = JSON.parse(raw);
          const msgObj = j.choices?.[0]?.message || {};
          aiMsg.thinking = msgObj.reasoning_content || msgObj.reasoning || "";
          aiMsg.text = msgObj.content || j.error?.message || "Không có phản hồi.";
        } catch { aiMsg.text = raw || "Không có phản hồi."; }
        extractInlineThinkTags();
        if (aiMsg.thinking) aiMsg.thinkMs = Date.now() - thinkStart;
      }

      if (S.activeTool === "canvas" && S.activeChatId === chatId) {
        const m = aiMsg.text.match(/```html\n([\s\S]*?)```/i);
        if (m) openCanvasCode(m[1], chat.title);
      }
      if (S.liveMode && aiMsg.text && S.activeChatId === chatId) speakLiveReply(aiMsg.text);
      if (S.activeChatId !== chatId) {
        showToast(`Đã trả lời xong ở "${chat.title.slice(0, 26)}"`, "ok");
      }
    } catch (e) {
      aiMsg.text = e.name === "AbortError" ? (aiMsg.text + "\n\n*(Đã dừng)*") : `**Thông báo:** ${e.message}`;
    } finally {
      aiMsg.streaming = false;
      chat.updatedAt = Date.now();
      clearChatRun(chatId);
      if (S.activeRuns.size === 0) bgStopTask();
      if (document.hidden && aiMsg.text) bgNotifyDone("API AI đã trả lời xong", aiMsg.text.replace(/[#*`]/g, "").slice(0, 120));
      dbPut("chats", chat).catch(() => {});
      apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {});
      syncAccountUI();
      if (typeof window.v60MaybeUpdateRollingMemory === "function" && aiMsg.text && !aiMsg.text.startsWith("**Thông báo:**")) {
        window.v60MaybeUpdateRollingMemory(chat);
      }
      if (S.activeChatId === chatId) {
        renderMessages();
        typesetSingleMsgMath(aiMsg.id);
        renderMemoryBar();
      }
    }
  };

  /* =========================================================================
     6. COMPREHENSIVE TEAM AI v3.7: PARALLEL COUNCIL, PROGRESS BAR, AUTO-COLLAPSE, RE-RUN STEP, GRILL MEMBER & EXPORT
     ========================================================================= */
  window.runTeamPipeline = async function (chat, team, userPrompt, resumeMsg = null, startAtIdx = 0, sentAtts = []) {
    if (!canUseTeams()) return showToast("Đội ngũ AI yêu cầu Key hạng Pro Max trở lên", "warn");
    const activeMembers = (team.members || []).filter(m => m.enabled !== false);
    if (!activeMembers.length) return showToast("Team chưa bật thành viên nào", "warn");

    const chatId = chat.id;
    const ctrl = new AbortController();
    setChatRun(chatId, { abort: ctrl, label: team.name, type: "team" });

    // Gather ALL images from current turn + persistent workspaceFiles
    const wsImages = (chat.workspaceFiles || []).filter(x => x.dataUrl);
    const turnAtts = Array.isArray(sentAtts) && sentAtts.length ? sentAtts : (chat.messages.filter(x => x.role === "user").slice(-1)[0]?.atts || []);
    const imgMap = new Map();
    [...wsImages, ...turnAtts.filter(a => a?.dataUrl)].forEach(im => imgMap.set(im.name || im.id, im));
    const imgAtts = [...imgMap.values()].slice(0, 6);

    const zeroMiss = buildZeroMissContextBundle(chat, userPrompt, team, null);

    let aiMsg = resumeMsg;
    if (!aiMsg) {
      aiMsg = {
        id: "m-" + (Date.now() + 1), role: "assistant", text: "",
        modelLabel: `${team.name} (${team.coordMode === "council" ? "Hội đồng song song" : "Dây chuyền"}${imgAtts.length ? ` · ${imgAtts.length} ảnh` : ""})`,
        streaming: true,
        pipeline: {
          teamId: team.id, prompt: userPrompt, steps: [],
          totalPlanned: activeMembers.length,
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
    if (S.activeChatId === chatId) { renderMessages(); safeScrollBottomIfUnlocked(true); }
    bgStartTask(`${team.name} đang làm việc`, `${activeMembers.length} thành viên · giữ kết nối nền`);

    const runMemberStep = async (mem, stepNum, contentIn, passImages, customStatus = "running") => {
      const modObj = S.models.find(m => m.id === mem.modelId && m.allowed) || getAllowedRealModels()[0];
      const modId = modObj?.id || S.cfg.selectedModel;
      const filesTxt = (mem.files || []).length
        ? "\n\nTÀI LIỆU RIÊNG CỦA VAI TRÒ NÀY:\n" + mem.files.map(f => `[${f.name}]\n${f.digest || f.content.slice(0, 4000)}`).join("\n\n")
        : "";
      const freshBundle = buildZeroMissContextBundle(chat, userPrompt, team, null);
      const sharedCtxBlock = freshBundle.textBlock ? `\n\n=== HỒ SƠ BỐI CẢNH & TỆP PHÒNG LÀM VIỆC (ZERO-MISS) ===\n${freshBundle.textBlock}` : "";
      const visionNote = (passImages && imgAtts.length) ? ` · Vision (${imgAtts.length} ảnh)` : "";
      const tradeDir = (team.name.toLowerCase().includes("trading") || window.shouldInjectTradingSignalDirective(userPrompt, imgAtts.length > 0))
        ? `\n\n${window.TRADING_SIGNAL_DIRECTIVE}` : "";

      const step = {
        id: "st-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        role: mem.id, memberId: mem.id, memberRole: mem.role, modelId: modId,
        num: String(stepNum), title: mem.role + visionNote,
        modelLabel: modObj?.short || modId, status: customStatus,
        text: "", startTs: Date.now(), elapsedMs: 0, collapsed: false
      };
      pipe.steps.push(step);
      if (S.activeChatId === chatId) { renderMessages(); safeScrollBottomIfUnlocked(false); }

      const painter = createThrottledPainter(() => {
        if (S.activeChatId !== chatId) return;
        const el = document.getElementById("pipe-md-" + step.id);
        if (el) { el.innerHTML = renderMd(step.text); safeScrollBottomIfUnlocked(false); }
      }, 115);

      const fullSys = `Bạn là thành viên "${mem.role}" trong đội ngũ "${team.name}".\nCHỈ DẪN VAI TRÒ: ${mem.prompt}${filesTxt}${sharedCtxBlock}${tradeDir}`;
      const { text, slot } = await callStatelessAgent(chat, modId, mem.id, fullSys, contentIn, full => {
        step.text = full;
        painter.trigger();
      }, passImages ? imgAtts : [], ctrl.signal);

      step.text = text;
      step.elapsedMs = Date.now() - step.startTs;
      step.status = customStatus === "conflict" ? "conflict" : "done";
      if (slot) aiMsg.slot = slot;
      painter.flush();
      if (S.activeChatId === chatId) renderMessages();
      return { step, text };
    };

    try {
      let lastOutput = pipe.blueprint || "";
      const debateRounds = Math.max(1, Math.min(2, Number(team.debateRounds || 1)));

      if (team.coordMode === "council" && activeMembers.length >= 2 && startAtIdx === 0) {
        // TRUE PARALLEL COUNCIL: Members 1..N-1 run simultaneously!
        const panelists = activeMembers.slice(0, -1);
        const chair = activeMembers[activeMembers.length - 1];
        bgStartTask(`${team.name} (Song song)`, `${panelists.length} thành viên đang phân tích cùng lúc...`);

        const panelResults = await Promise.all(panelists.map((mem, idx) => {
          const passImages = imgAtts.length > 0 && (mem.receiveImages !== undefined ? Boolean(mem.receiveImages) : (team.visionMode === "all" || idx < 2));
          const inTxt = `YÊU CẦU GỐC:\n${pipe.prompt}\n\nHãy phân tích độc lập, sắc bén từ đúng góc nhìn chuyên môn "${mem.role}". Nếu có nhận định phản biện mạnh, hãy nêu rõ lý do và bằng chứng.`;
          return runMemberStep(mem, idx + 1, inTxt, passImages);
        }));

        // Auto-collapse completed panelist cards cleanly once all finish so Chair stays front-and-center!
        panelResults.forEach(r => { r.step.collapsed = true; });
        const councilOpinions = panelResults.map((r, i) => `### ${panelists[i].role}\n${r.text.slice(0, 4200)}`);
        if (panelResults[0]) pipe.blueprint = panelResults[0].text;

        // Round 2 Cross-Check / Conflict Debate if deep mode (2 rounds) OR conflict detected
        const hasConflict = panelResults.some(r => /STATUS\s*:\s*CONFLICT|sai lệch|mâu thuẫn|trái ngược/i.test(r.text));
        if ((debateRounds >= 2 || (team.conflictDebate !== false && hasConflict))) {
          const debRes = await runMemberStep(
            { id: "debate", role: "Đối chất & Phản biện chéo", prompt: "Đối chất trực diện các điểm xung đột/khác biệt giữa các thành viên Hội đồng bằng bằng chứng từ hồ sơ bối cảnh & dữ liệu. Chỉ rõ điểm nào đúng, điểm nào là giả định yếu.", modelId: chair.modelId, files: [] },
            "⚡",
            `YÊU CẦU GỐC:\n${pipe.prompt}\n\nÝ KIẾN CÁC THÀNH VIÊN:\n${councilOpinions.join("\n\n")}`,
            imgAtts.length > 0,
            "conflict"
          );
          debRes.step.collapsed = true;
          councilOpinions.push(`### Đối chất & Phản biện chéo\n${debRes.text.slice(0, 4200)}`);
        }

        // Final Chair Synthesis (always expanded + 3-line executive action summary!)
        const chairPassImg = imgAtts.length > 0 && (chair.receiveImages === true || team.visionMode === "all");
        const chairIn = `YÊU CẦU GỐC:\n${pipe.prompt}\n\nTOÀN BỘ Ý KIẾN HỘI ĐỒNG & ĐỐI CHẤT:\n${councilOpinions.join("\n\n")}\n\nNHIỆM VỤ CHỦ TỌA TỔNG HỢP:\n1. Mở đầu bằng khối **Tóm tắt 3 dòng hành động ngay** (cực ngắn, quyết đoán).\n2. So sánh & phân xử rõ mọi điểm mâu thuẫn giữa các thành viên.\n3. Chốt phương án hành động tối ưu nhất kèm kế hoạch cụ thể.`;
        const chairOut = await runMemberStep(chair, activeMembers.length, chairIn, chairPassImg);
        chairOut.step.collapsed = false;
        lastOutput = chairOut.text;
        const codeHit = extractBestCodeBlock(chairOut.text);
        if (codeHit) { pipe.codeOutput = chairOut.text; pipe.finalCode = codeHit; }
      } else {
        // Sequential Pipeline Mode with auto-collapse of previous completed steps
        const collected = [];
        for (let i = startAtIdx; i < activeMembers.length; i++) {
          const mem = activeMembers[i];
          const passImages = imgAtts.length > 0 && (mem.receiveImages !== undefined ? Boolean(mem.receiveImages) : (team.visionMode === "all" || i < 2));
          await savePendingTask({ chatId, teamId: team.id, teamName: team.name, msgId: aiMsg.id, prompt: pipe.prompt, nextIdx: i });

          // Auto-collapse previous finished step so screen stays clean
          pipe.steps.forEach(st => { if (st.status === "done" || st.status === "conflict") st.collapsed = true; });

          const isLast = i === activeMembers.length - 1;
          const prevSummaries = pipe.steps.filter(s => s.status === "done" || s.status === "conflict").slice(-2).map(s => `### ${s.title}\n${s.text.slice(0, 5000)}`).join("\n\n");
          const inputTxt = i === 0
            ? `YÊU CẦU DỰ ÁN:\n${pipe.prompt}`
            : `YÊU CẦU GỐC:\n${pipe.prompt}\n\nKẾT QUẢ TỪ CÁC BƯỚC TRƯỚC:\n${prevSummaries}${isLast ? "\n\n(Mở đầu kết luận bằng 3 dòng tóm tắt hành động ngay trước khi trình bày chi tiết.)" : ""}`;

          const { step, text: out } = await runMemberStep(mem, i + 1, inputTxt, passImages);
          lastOutput = out;
          collected.push(out);
          if (i === 0) pipe.blueprint = out;
          const codeHit = extractBestCodeBlock(out);
          if (codeHit) { pipe.codeOutput = out; pipe.finalCode = codeHit; }

          if (i === 0 && team.pauseAfterFirst && activeMembers.length > 1 && !resumeMsg) {
            pipe.awaitingApproval = true;
            aiMsg.streaming = false;
            clearChatRun(chatId);
            if (S.activeRuns.size === 0) bgStopTask();
            await savePendingTask(null);
            await dbPut("chats", chat).catch(() => {});
            apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {});
            if (S.activeChatId === chatId) renderMessages();
            showToast("Bước 1 đã xong · Kiểm tra rồi bấm Duyệt & Chạy tiếp");
            return;
          }

          if (isLast && Number(team.maxFixLoops || 0) > 0 && /STATUS\s*:\s*FAIL/i.test(out.slice(0, 260))) {
            const coderMem = activeMembers.find(x => x.id === "coder") || activeMembers[Math.max(0, activeMembers.length - 2)];
            const maxL = Math.min(2, Number(team.maxFixLoops || 1));
            let failReport = out;
            for (let loop = 1; loop <= maxL; loop++) {
              step.status = "fail"; step.collapsed = true;
              const fixRes = await runMemberStep(coderMem, `${i}.${loop}`, `SỬA LỖI VÒNG ${loop} DỰA TRÊN BÁO CÁO:\n${failReport}\n\nBẢN CŨ:\n${pipe.codeOutput || lastOutput}`, false);
              pipe.codeOutput = fixRes.text; lastOutput = fixRes.text;
              pipe.finalCode = extractBestCodeBlock(fixRes.text) || pipe.finalCode;
              fixRes.step.collapsed = true;
              const reChk = await runMemberStep(mem, `${i + 1}.${loop}`, `KIỂM TRA LẠI SAU KHI VÁ LỖI VÒNG ${loop}:\n${fixRes.text}`, false);
              failReport = reChk.text;
              if (!/STATUS\s*:\s*FAIL/i.test(failReport.slice(0, 260))) break;
            }
          }
        }
      }

      aiMsg.text = pipe.codeOutput || lastOutput || "Đội ngũ đã hoàn tất.";
      await savePendingTask(null);
      haptic("ok");
      showToast(S.activeChatId === chatId ? `${team.name} đã hoàn tất` : `${team.name} đã chạy xong ở tab nền`, "ok");
      if (document.hidden) bgNotifyDone(`${team.name} đã hoàn tất`, aiMsg.text.replace(/[#*`]/g, "").slice(0, 120));
    } catch (e) {
      pipe.steps.push({ id: "st-err-" + Date.now(), role: "error", num: "!", title: "Tạm dừng", modelLabel: "", status: "fail", text: e.name === "AbortError" ? "Đã dừng theo yêu cầu." : e.message, collapsed: false });
      aiMsg.text = `Tạm dừng: ${e.message}`;
      if (e.name === "AbortError") await savePendingTask(null);
    } finally {
      aiMsg.streaming = false;
      chat.updatedAt = Date.now();
      clearChatRun(chatId);
      if (S.activeRuns.size === 0) bgStopTask();
      dbPut("chats", chat).catch(() => {});
      apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {});
      syncAccountUI();
      if (typeof window.v60MaybeUpdateRollingMemory === "function" && aiMsg.text && !aiMsg.text.startsWith("**Thông báo:**")) {
        window.v60MaybeUpdateRollingMemory(chat);
      }
      if (S.activeChatId === chatId) {
        renderMessages();
        typesetSingleMsgMath(aiMsg.id);
        renderMemoryBar();
      }
    }
  };

  // Re-run ONLY 1 specific Team Member Step (saves tokens!)
  window.rerunTeamMemberStep = async function (msgId, stepId) {
    const chat = S.chats.find(c => c.id === S.activeChatId);
    const msg = chat?.messages.find(m => m.id === msgId);
    const step = msg?.pipeline?.steps?.find(s => s.id === stepId);
    if (!chat || !msg || !step) return;
    if (window.getCurrentChatRun()) return showToast("Đang có tác vụ chạy trong phòng này", "warn");

    const team = S.teams.find(t => t.id === msg.pipeline.teamId);
    const mem = team?.members?.find(m => m.id === step.memberId) || { id: step.role, role: step.title, prompt: "Phân tích sắc bén theo đúng vai trò.", modelId: step.modelId || S.cfg.selectedModel, files: [] };

    openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:6px;">Chạy lại: ${esc(step.title)}</h3>
      <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:8px;">Chỉ chạy lại riêng bước này (không chạy lại toàn bộ Team để tiết kiệm token).</p>
      <label class="f-lbl">Yêu cầu bổ sung / Chỉnh hướng (tùy chọn)</label>
      <textarea id="rr-hint" class="field" rows="3" placeholder="VD: Đào sâu hơn rủi ro tài chính, viết ngắn gọn dạng bảng..."></textarea>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
        <button type="button" class="btn-s tap" onclick="closeModal()">Hủy</button>
        <button type="button" class="btn-p tap" onclick="commitRerunTeamStep('${msgId}','${stepId}')">Chạy lại bước này</button>
      </div>`);
  };

  window.commitRerunTeamStep = async function (msgId, stepId) {
    const hint = document.getElementById("rr-hint")?.value.trim() || "";
    closeModal();
    const chat = S.chats.find(c => c.id === S.activeChatId);
    const msg = chat?.messages.find(m => m.id === msgId);
    const step = msg?.pipeline?.steps?.find(s => s.id === stepId);
    if (!chat || !msg || !step) return;
    const team = S.teams.find(t => t.id === msg.pipeline.teamId);
    const mem = team?.members?.find(m => m.id === step.memberId) || { id: step.role, role: step.title, prompt: "Phân tích theo đúng vai trò.", modelId: step.modelId || S.cfg.selectedModel, files: [] };

    const chatId = chat.id;
    const ctrl = new AbortController();
    setChatRun(chatId, { abort: ctrl, label: step.title, type: "team" });
    step.status = "running"; step.collapsed = false; step.text = ""; step.startTs = Date.now();
    renderMessages();

    const bundle = buildZeroMissContextBundle(chat, msg.pipeline.prompt + " " + hint, team, null);
    const sys = `Bạn là "${mem.role}" trong "${team?.name || "Đội ngũ AI"}".\nCHỈ DẪN: ${mem.prompt}${bundle.textBlock ? `\n\nHỒ SƠ BỐI CẢNH:\n${bundle.textBlock}` : ""}`;
    const inp = `YÊU CẦU GỐC:\n${msg.pipeline.prompt}${hint ? `\n\nYÊU CẦU CHỈNH SỬA CHO LẦN CHẠY LẠI NÀY:\n${hint}` : ""}`;
    const painter = createThrottledPainter(() => {
      if (S.activeChatId !== chatId) return;
      const el = document.getElementById("pipe-md-" + step.id);
      if (el) el.innerHTML = renderMd(step.text);
    }, 110);

    try {
      const { text } = await callStatelessAgent(chat, step.modelId || mem.modelId || S.cfg.selectedModel, mem.id, sys, inp, full => {
        step.text = full; painter.trigger();
      }, [], ctrl.signal);
      step.text = text;
      step.status = "done";
      step.elapsedMs = Date.now() - step.startTs;
      if (msg.pipeline.steps[msg.pipeline.steps.length - 1]?.id === step.id) msg.text = text;
      painter.flush();
      haptic("ok"); showToast(`Đã chạy lại xong: ${step.title}`, "ok");
    } catch (e) {
      step.status = "fail"; step.text = `Lỗi: ${e.message}`;
    } finally {
      clearChatRun(chatId);
      dbPut("chats", chat).catch(() => {});
      apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {});
      if (S.activeChatId === chatId) renderMessages();
    }
  };

  // Grill / Ask a specific Team member directly right inside the chat!
  window.grillTeamMember = function (msgId, stepId) {
    const chat = S.chats.find(c => c.id === S.activeChatId);
    const msg = chat?.messages.find(m => m.id === msgId);
    const step = msg?.pipeline?.steps?.find(s => s.id === stepId);
    if (!step) return;
    openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:6px;">Hỏi riêng: ${esc(step.title)}</h3>
      <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:8px;">Chất vấn trực tiếp riêng thành viên này bằng đúng Model <b>${esc(step.modelLabel)}</b> và giữ nguyên bối cảnh cuộc họp.</p>
      <textarea id="gr-q" class="field" rows="3" placeholder="VD: Tại sao bạn đánh giá rủi ro đó cao? Cho dẫn chứng cụ thể..."></textarea>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
        <button type="button" class="btn-s tap" onclick="closeModal()">Hủy</button>
        <button type="button" class="btn-p tap" onclick="commitGrillTeamMember('${msgId}','${stepId}')">Gửi câu hỏi riêng</button>
      </div>`);
  };

  window.commitGrillTeamMember = async function (msgId, stepId) {
    const q = document.getElementById("gr-q")?.value.trim();
    if (!q) return showToast("Nhập câu hỏi muốn chất vấn", "warn");
    closeModal();
    const chat = S.chats.find(c => c.id === S.activeChatId);
    const msg = chat?.messages.find(m => m.id === msgId);
    const step = msg?.pipeline?.steps?.find(s => s.id === stepId);
    if (!step) return;
    await sendPrompt(`[Hỏi riêng ${step.title}]: ${q}`, {
      forceSingleChat: true,
      forceModelId: step.modelId || S.cfg.selectedModel,
      customModelLabel: `${step.title} (${step.modelLabel})`,
      customSysPrefix: `Bạn đang trả lời câu hỏi chất vấn riêng dành cho thành viên "${step.title}". Dưới đây là nhận định trước đó của bạn trong phiên họp:\n${(step.text || "").slice(0, 4500)}`
    });
  };

  // Export Full Team Meeting Minutes (.md / .pdf / .docx)
  window.exportTeamMinutesModal = function (msgId) {
    const msg = S.chats.find(c => c.id === S.activeChatId)?.messages.find(m => m.id === msgId);
    if (!msg?.pipeline) return;
    openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:6px;">Xuất Biên bản họp Đội ngũ AI</h3>
      <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:12px;">Gom trọn bộ yêu cầu gốc, ý kiến của tất cả ${(msg.pipeline.steps || []).length} thành viên và bản chốt cuối cùng.</p>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <button type="button" class="btn-p tap" style="width:100%;" onclick="closeModal();doExportTeamMinutes('${msgId}','pdf')">Xuất báo cáo PDF (.pdf)</button>
        <button type="button" class="btn-blue tap" style="width:100%;" onclick="closeModal();doExportTeamMinutes('${msgId}','docx')">Xuất tài liệu Word (.docx)</button>
        <button type="button" class="btn-s tap" style="width:100%;" onclick="closeModal();doExportTeamMinutes('${msgId}','md')">Xuất Markdown (.md)</button>
      </div>`);
  };

  window.doExportTeamMinutes = async function (msgId, fmt) {
    const msg = S.chats.find(c => c.id === S.activeChatId)?.messages.find(m => m.id === msgId);
    if (!msg?.pipeline) return;
    const p = msg.pipeline;
    const title = msg.modelLabel || "Bien-ban-hop-Team-AI";
    if (fmt === "md") {
      const md = `# ${title}\n\n**Yêu cầu gốc:** ${p.prompt}\n\n` + (p.steps || []).map(s => `## ${s.num}. ${s.title} (${s.modelLabel})\n\n${s.text}`).join("\n\n---\n\n");
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      if (window.OfficeStudio?.deliverBinaryFile) await window.OfficeStudio.deliverBinaryFile(blob, `bien-ban-team-${Date.now()}.md`, "text/markdown", "save");
      return;
    }
    const spec = {
      kind: fmt === "docx" ? "docx" : "pdf",
      title,
      subtitle: `Xuất từ API AI v3.7 · ${new Date().toLocaleString("vi-VN")}`,
      summary: `Yêu cầu gốc: ${p.prompt}`,
      fileName: `bien-ban-team-${Date.now()}.${fmt}`,
      sections: (p.steps || []).map(s => ({
        heading: `${s.num}. ${s.title} (${s.modelLabel})`,
        level: 1,
        paragraphs: String(s.text || "").replace(/[#*`]/g, "").split(/\n{2,}/).filter(Boolean).slice(0, 30)
      }))
    };
    if (fmt === "docx" && window.OfficeStudio?.exportDocx) await window.OfficeStudio.exportDocx(spec, "open");
    else if (window.OfficeStudio?.exportPdf) await window.OfficeStudio.exportPdf(spec, "open");
  };

  /* =========================================================================
     7. COMPREHENSIVE AI TUTOR v3.7: TIMED EXAM + AUTO-GRADE + CLONE QUESTIONS + MASTERY MAP + 5-MIN FLASHCARDS + PHOTO GRADING
     ========================================================================= */
  let activeExamTimer = null;
  let activeExamState = null; // { tutorId, endAt, topic, count }

  function renderExamTimerBar() {
    const el = document.getElementById("tutor-exam-timer-bar");
    if (!el) return;
    if (!activeExamState || S.activeTutorId !== activeExamState.tutorId) {
      el.style.display = "none"; el.innerHTML = ""; return;
    }
    const leftSec = Math.max(0, Math.ceil((activeExamState.endAt - Date.now()) / 1000));
    const mm = String(Math.floor(leftSec / 60)).padStart(2, "0");
    const ss = String(leftSec % 60).padStart(2, "0");
    el.style.display = "block";
    el.innerHTML = `<div class="exam-timer-bar">
      <span>Thi thử: <b>${esc(activeExamState.topic)}</b></span>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="exam-clock num">${mm}:${ss}</span>
        <button type="button" class="btn-p tap" style="height:28px;padding:0 10px;font-size:11.5px;" onclick="submitTimedExamNow()">Nộp bài</button>
        <button type="button" class="mini-act tap" onclick="stopTimedExam()">${ICON_X}</button>
      </div>
    </div>`;
    if (leftSec <= 0) {
      stopTimedExam();
      showToast("Hết giờ làm bài! Gửi đáp án để Gia sư chấm điểm ngay", "warn");
    }
  }

  window.stopTimedExam = function () {
    if (activeExamTimer) { clearInterval(activeExamTimer); activeExamTimer = null; }
    activeExamState = null;
    renderExamTimerBar();
  };

  window.submitTimedExamNow = function () {
    const ta = document.getElementById("prompt-in");
    stopTimedExam();
    if (ta && !ta.value.trim()) {
      ta.value = "Mình nộp bài làm ở đây (hoặc ảnh đính kèm). Hãy chấm điểm thang 10, chỉ rõ bẫy từng câu sai và xuất khối apiai-exam-result kèm câu hỏi tương tự để ôn:\n";
      autoGrow(); updateOrbButton(); ta.focus();
      showToast("Nhập đáp án (vd: 1A 2C 3B...) hoặc đính kèm ảnh bài làm rồi bấm Gửi");
    } else {
      sendPrompt();
    }
  };

  window.openTutorExamModal = function (tutorId) {
    const t = S.tutors.find(x => x.id === tutorId); if (!t) return;
    openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:4px;">Thi thử bấm giờ · ${esc(t.subject)}</h3>
      <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:10px;">Gia sư tạo đề sát cấu trúc thi, đếm ngược thời gian, chấm thang 10 và tự nạp câu sai vào Sổ Lỗi để tạo câu Clone ôn lại.</p>
      <label class="f-lbl">Chuyên đề / Nội dung kiểm tra</label>
      <input id="ex-topic" class="field" placeholder="VD: Khảo sát hàm số, Reading comprehension, So sánh 2 đoạn trích..." />
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div><label class="f-lbl">Số câu hỏi</label><select id="ex-cnt" class="field"><option value="5">5 câu (Nhanh)</option><option value="10" selected>10 câu (Chuẩn)</option><option value="15">15 câu (Chuyên sâu)</option></select></div>
        <div><label class="f-lbl">Thời gian (phút)</label><select id="ex-min" class="field"><option value="5">5 phút</option><option value="15" selected>15 phút</option><option value="30">30 phút</option><option value="45">45 phút</option></select></div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
        <button type="button" class="btn-s tap" onclick="closeModal()">Hủy</button>
        <button type="button" class="btn-p tap" onclick="startTutorTimedExam('${t.id}')">Bắt đầu phát đề</button>
      </div>`);
  };

  window.startTutorTimedExam = function (tutorId) {
    const topic = document.getElementById("ex-topic")?.value.trim() || "Tổng hợp trọng tâm";
    const count = Number(document.getElementById("ex-cnt")?.value || 10);
    const mins = Number(document.getElementById("ex-min")?.value || 15);
    closeModal();
    activeExamState = { tutorId, topic, count, endAt: Date.now() + mins * 60000 };
    if (activeExamTimer) clearInterval(activeExamTimer);
    activeExamTimer = setInterval(renderExamTimerBar, 1000);
    renderExamTimerBar();
    sendPrompt(`CHẾ ĐỘ THI THỬ BẤM GIỜ (${mins} phút): Hãy ra ngay 1 đề kiểm tra môn ${S.tutors.find(x => x.id === tutorId)?.subject || ""} gồm ${count} câu về chủ đề "${topic}" (có câu gài bẫy hay gặp trong đề thi thật). TUYỆT ĐỐI CHƯA ĐƯA ĐÁP ÁN — đợi mình nộp bài rồi chấm điểm thang 10 kèm khối apiai-exam-result.`);
  };

  // Interactive Exam Result Card (```apiai-exam-result```)
  const examResMap = new Map();
  let exSeq = 0;
  window.renderExamResultCard = function (rawJson) {
    let obj = null;
    try { obj = JSON.parse(rawJson.trim()); } catch { return ""; }
    if (!obj || !obj.score) return "";
    const eid = "exr-" + (++exSeq);
    examResMap.set(eid, obj);
    const wrongs = Array.isArray(obj.wrongItems) ? obj.wrongItems : [];
    return `<div class="exam-res-card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <div>
          <div style="font-size:12px;color:var(--ink-3);">Kết quả chấm bài tự động</div>
          <div class="exam-score-big">${esc(obj.score)}</div>
        </div>
        ${obj.total ? `<span class="tag-st tier-pro num">Đúng ${Number(obj.correct || 0)}/${Number(obj.total)} câu</span>` : ""}
      </div>
      ${obj.summary ? `<div style="font-size:13px;color:var(--ink-2);">${esc(obj.summary)}</div>` : ""}
      ${wrongs.length ? `<div><div style="font-size:12px;color:var(--danger-ink);font-weight:500;margin-bottom:4px;">Các lỗi sai phát hiện (${wrongs.length}):</div>
        ${wrongs.map(w => `<div style="font-size:12.5px;color:var(--ink-2);padding:3px 0;">• ${esc(w)}</div>`).join("")}</div>` : ""}
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${wrongs.length ? `<button type="button" class="btn-blue tap" style="height:36px;font-size:12.5px;flex:1;" onclick="saveExamWrongsAndMastery('${eid}')">Nạp ${wrongs.length} lỗi vào Sổ Lỗi &amp; Tiến độ</button>
        <button type="button" class="btn-p tap" style="height:36px;font-size:12.5px;flex:1;" onclick="cloneExamWrongQuestions('${eid}')">Tạo câu tương tự (Clone)</button>` : ""}
      </div>
    </div>`;
  };

  window.saveExamWrongsAndMastery = async function (eid) {
    const obj = examResMap.get(eid);
    const t = S.tutors.find(x => x.id === S.activeTutorId);
    if (!obj || !t) return showToast("Mở phòng Gia sư để lưu lỗi sai", "warn");
    t.mistakes = t.mistakes || [];
    for (const w of (obj.wrongItems || [])) {
      if (!t.mistakes.some(x => x.note === w)) {
        t.mistakes.unshift({ id: "mk-" + Date.now() + Math.random().toString(36).slice(2, 4), note: w, stageDays: 1, nextReviewAt: Date.now() + 86400000, mastered: false });
      }
    }
    t.topics = t.topics || [];
    for (const tu of (obj.topicUpdates || [])) {
      if (!tu?.name) continue;
      const hit = t.topics.find(x => x.name.toLowerCase() === tu.name.toLowerCase());
      const val = Math.max(0, Math.min(100, Number(tu.mastery) || 50));
      if (hit) hit.mastery = val;
      else t.topics.push({ id: "tp-" + Date.now() + Math.random().toString(36).slice(2, 4), name: tu.name, mastery: val });
    }
    await dbPut("tutors", t);
    apiFetch("/sync/tutors", { method: "POST", body: t }).catch(() => {});
    renderActiveContextBanner(); haptic("ok");
    showToast("Đã nạp câu sai vào Sổ Lỗi (nhắc ôn 1/3/7 ngày) & cập nhật Bản đồ Chuyên đề!", "ok");
  };

  window.cloneExamWrongQuestions = function (eid) {
    const obj = examResMap.get(eid);
    if (!obj?.wrongItems?.length) return;
    sendPrompt(`NHÂN BẢN LỖI SAI (CLONE QUESTIONS): Dựa trên các câu mình vừa làm sai dưới đây, hãy tạo mỗi lỗi 2 câu hỏi tương tự (đổi số/ngữ cảnh nhưng giữ đúng dạng bẫy) để mình làm lại cho tới khi hết sai:\n${obj.wrongItems.map((w, i) => `${i + 1}. ${w}`).join("\n")}`);
  };

  // Topic Mastery Map Modal
  window.openTutorMasteryModal = function (tutorId) {
    const t = S.tutors.find(x => x.id === tutorId); if (!t) return;
    t.topics = t.topics || [];
    openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:4px;">Bản đồ Chuyên đề · ${esc(t.subject)}</h3>
      <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:10px;">Theo dõi mức độ thành thạo từng chuyên đề để Gia sư ưu tiên luyện đúng phần còn yếu.</p>
      <div style="display:flex;gap:6px;margin-bottom:10px;">
        <input id="tm-new-name" class="field" style="font-size:14px;" placeholder="Thêm chuyên đề (VD: Tích phân, Oxyz...)" />
        <button type="button" class="btn-p tap" style="height:44px;padding:0 14px;" onclick="addTutorMasteryTopic('${t.id}')">Thêm</button>
      </div>
      <div style="max-height:46dvh;overflow-y:auto;">
        ${t.topics.map((tp, i) => `<div class="mastery-row">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <strong style="font-size:13px;">${esc(tp.name)}</strong>
            <div style="display:flex;align-items:center;gap:6px;">
              <span class="num" style="font-size:12.5px;color:var(--ok-ink);">${tp.mastery}%</span>
              <button type="button" class="mini-act tap" onclick="delTutorMasteryTopic('${t.id}',${i})">${ICON_X}</button>
            </div>
          </div>
          <div class="mastery-track"><div class="mastery-fill" style="transform:scaleX(${Math.max(0.03, tp.mastery / 100)});"></div></div>
          <input type="range" min="0" max="100" step="5" value="${tp.mastery}" style="width:100%;accent-color:var(--accent);" onchange="setTutorMasteryVal('${t.id}',${i},this.value)" />
        </div>`).join("") || `<div style="font-size:12.5px;color:var(--ink-3);padding:8px 0;">Chưa có chuyên đề nào. Thêm các chương trọng tâm của môn ${esc(t.subject)} để theo dõi tiến độ.</div>`}
      </div>
      <div style="display:flex;justify-content:space-between;gap:8px;margin-top:12px;">
        <button type="button" class="btn-blue tap" onclick="closeModal();triggerTutorPhotoGrade('${t.id}')">Chấm ảnh bài làm</button>
        <button type="button" class="btn-p tap" onclick="closeModal()">Đóng</button>
      </div>`);
  };

  window.addTutorMasteryTopic = async function (tid) {
    const t = S.tutors.find(x => x.id === tid);
    const name = document.getElementById("tm-new-name")?.value.trim();
    if (!t || !name) return;
    t.topics = t.topics || [];
    t.topics.push({ id: "tp-" + Date.now(), name, mastery: 30 });
    await dbPut("tutors", t); apiFetch("/sync/tutors", { method: "POST", body: t }).catch(() => {});
    haptic("ok"); renderActiveContextBanner(); openTutorMasteryModal(tid);
  };
  window.setTutorMasteryVal = async function (tid, idx, val) {
    const t = S.tutors.find(x => x.id === tid); if (!t?.topics?.[idx]) return;
    t.topics[idx].mastery = Number(val) || 0;
    await dbPut("tutors", t); apiFetch("/sync/tutors", { method: "POST", body: t }).catch(() => {});
    openTutorMasteryModal(tid);
  };
  window.delTutorMasteryTopic = async function (tid, idx) {
    const t = S.tutors.find(x => x.id === tid); if (!t?.topics) return;
    t.topics.splice(idx, 1);
    await dbPut("tutors", t); apiFetch("/sync/tutors", { method: "POST", body: t }).catch(() => {});
    renderActiveContextBanner(); openTutorMasteryModal(tid);
  };

  window.triggerTutorPhotoGrade = function (tid) {
    document.getElementById("in-img")?.click();
    const ta = document.getElementById("prompt-in");
    if (ta) {
      ta.value = "Chấm từng dòng ảnh bài làm đính kèm theo chuẩn barem, khoanh đúng chỗ bị mất điểm và xuất khối apiai-exam-result.";
      autoGrow(); updateOrbButton();
    }
    showToast("Chọn ảnh chụp bài làm tay rồi bấm Gửi để Gia sư chấm từng dòng");
  };

  // 5-Minute Quick Flashcard / Spaced-Repetition Deck
  let fcState = { tutorId: null, cards: [], idx: 0, flipped: false };
  window.openTutorFlashcardModal = function (tutorId) {
    const t = S.tutors.find(x => x.id === tutorId); if (!t) return;
    const cards = [
      ...(t.mistakes || []).filter(m => !m.mastered).map((m, i) => ({ kind: "mistake", refIdx: i, front: `Lỗi hay sai (Mốc ${m.stageDays || 1}d)`, back: m.note })),
      ...(t.classNotes || []).slice(0, 8).map(n => ({ kind: "note", front: n.title || `Ghi chú ngày ${n.date}`, back: n.digest || n.content.slice(0, 260) }))
    ];
    if (!cards.length) {
      return showToast("Chưa có mục nào trong Sổ Lỗi / Ghi chú lớp để tạo Flashcard", "warn");
    }
    fcState = { tutorId, cards, idx: 0, flipped: false };
    renderFlashcardModal();
  };

  function renderFlashcardModal() {
    const cur = fcState.cards[fcState.idx];
    if (!cur) {
      closeModal(); haptic("ok");
      showToast("Đã hoàn thành phiên ôn nhanh 5 phút!", "ok");
      return;
    }
    openModal(`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <strong style="font-size:16px;">Ôn nhanh 5 phút</strong>
        <span class="tag-quiet num">${fcState.idx + 1} / ${fcState.cards.length}</span>
      </div>
      <div class="flashcard-stage ${fcState.flipped ? "flipped" : ""}" onclick="flipFlashcard()">
        <span class="tag-st ${cur.kind === "mistake" ? "st-pending" : "st-unused"}">${fcState.flipped ? "Nội dung cần nhớ" : esc(cur.front)}</span>
        <div style="font-size:14.5px;line-height:1.55;color:var(--ink);">${fcState.flipped ? esc(cur.back) : "Chạm vào thẻ để lật xem kiến thức & lỗi sai"}</div>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button type="button" class="btn-danger tap" style="flex:1;height:40px;" onclick="gradeFlashcard(false)">Chưa nhớ (Ôn lại)</button>
        <button type="button" class="btn-p tap" style="flex:1;height:40px;" onclick="gradeFlashcard(true)">Đã thuộc (Tiếp)</button>
      </div>`);
  }
  window.flipFlashcard = function () { haptic("tap"); fcState.flipped = !fcState.flipped; renderFlashcardModal(); };
  window.gradeFlashcard = async function (ok) {
    const cur = fcState.cards[fcState.idx];
    if (cur?.kind === "mistake") {
      const t = S.tutors.find(x => x.id === fcState.tutorId);
      const m = t?.mistakes?.[cur.refIdx];
      if (m) {
        if (ok) {
          if (m.stageDays === 1) { m.stageDays = 3; m.nextReviewAt = Date.now() + 3 * 86400000; }
          else if (m.stageDays === 3) { m.stageDays = 7; m.nextReviewAt = Date.now() + 7 * 86400000; }
          else { m.mastered = true; }
        } else {
          m.stageDays = 1; m.nextReviewAt = Date.now() + 86400000;
        }
        await dbPut("tutors", t);
        apiFetch("/sync/tutors", { method: "POST", body: t }).catch(() => {});
        renderActiveContextBanner();
      }
    }
    haptic(ok ? "ok" : "tap");
    fcState.idx++;
    fcState.flipped = false;
    renderFlashcardModal();
  };

  /* =========================================================================
     8. UPGRADED RENDERERS: LAZY MESSAGES, TEAM PROGRESS & STEP ACTIONS, EXAM CARD, SIDEBAR RUNNING BADGE
     ========================================================================= */
  // Hook renderMd to support ```apiai-exam-result```
  const _origRenderMd = window.renderMd;
  window.renderMd = function (md) {
    const exBlocks = [];
    const pre = String(md || "").replace(/```apiai-exam-result\n([\s\S]*?)```/gi, (_, code) => {
      const i = exBlocks.length;
      exBlocks.push(code);
      return `@@EXRES_${i}@@`;
    });
    let html = _origRenderMd(pre);
    exBlocks.forEach((code, i) => {
      const card = window.renderExamResultCard(code);
      html = html.replace(`@@EXRES_${i}@@`, card || "");
    });
    return html;
  };

  window.loadMoreOlderMessages = function () {
    if (!S.activeChatId) return;
    const cur = S.chatRenderLimits.get(S.activeChatId) || 14;
    S.chatRenderLimits.set(S.activeChatId, cur + 20);
    haptic("tap");
    renderMessages();
  };

  window.renderMessages = function () {
    const hero = document.getElementById("empty-hero");
    const list = document.getElementById("messages");
    const chat = S.chats.find(c => c.id === S.activeChatId);
    const activeTutor = S.activeTutorId ? S.tutors.find(t => t.id === S.activeTutorId) : null;
    const tutorCardHtml = activeTutor ? buildTutorProactiveBanner(activeTutor) : "";
    const resumeHtml = buildPendingResumeBanner();
    const compactHtml = buildCompactSummaryCard(chat);

    syncGlobalStreamingUi();
    renderExamTimerBar();

    if (!chat || !chat.messages.length) {
      hero.style.display = (tutorCardHtml || resumeHtml || compactHtml) ? "none" : "flex";
      list.innerHTML = compactHtml + resumeHtml + tutorCardHtml;
      if (typeof window.updateContextGuardBar === "function") window.updateContextGuardBar();
      return;
    }

    hero.style.display = "none";
    const totalMsgs = chat.messages.length;
    const limit = S.chatRenderLimits.get(chat.id) || 14;
    const hiddenCnt = Math.max(0, totalMsgs - limit);
    const visibleMsgs = hiddenCnt > 0 ? chat.messages.slice(-limit) : chat.messages;
    const olderBtn = hiddenCnt > 0
      ? `<button type="button" class="lazy-older-btn tap-soft" onclick="loadMoreOlderMessages()">Xem thêm ${hiddenCnt} tin nhắn cũ hơn</button>`
      : "";

    list.innerHTML = compactHtml + resumeHtml + tutorCardHtml + olderBtn + visibleMsgs.map(m => {
      if (m.role === "user") {
        if (window.V60?.editingMsgId === m.id && typeof window.v60RenderInlineEditCard === "function") {
          return window.v60RenderInlineEditCard(m);
        }
        const imgAtts = (m.atts || []).filter(a => a.dataUrl);
        const docAtts = (m.atts || []).filter(a => a.type === "file" || a.type === "zip_archive");
        const thumbs = imgAtts.length
          ? `<div class="v60-msg-grid ${imgAtts.length === 1 ? "cnt-1" : "cnt-multi"}">${imgAtts.map(a => `<img class="v60-msg-photo" src="${a.dataUrl}" alt="${esc(a.name || "Ảnh")}" onclick="openLightbox('${a.dataUrl}','${esc(a.name || "image.png")}')" />`).join("")}</div>`
          : "";
        const docs = docAtts.length
          ? `<div class="v60-msg-files">${docAtts.map(a => {
              const ext = (a.name || "FILE").split(".").pop().toUpperCase().slice(0, 4);
              const kb = a.size ? `${Math.max(1, Math.round(a.size / 1024))} KB` : (a.text ? `${Math.max(1, Math.round(a.text.length / 1024))} KB` : "");
              return `<span class="v60-msg-file"><span class="v60-msg-file-ext">${esc(ext)}</span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(a.name)}</span>${kb ? `<span style="font-size:10.5px;color:var(--ink-3);font-family:var(--font-mono);flex-shrink:0;">${kb}</span>` : ""}</span>`;
            }).join("")}</div>`
          : "";
        const saveBar = m.suggestSaveTutorId ? `<div class="tutor-auto-save-bar">
          <span>Phát hiện kiến thức mới trên lớp — lưu vào Kho Gia sư?</span>
          <div style="display:flex;gap:6px;">
            <button type="button" class="btn-p tap" style="height:28px;padding:0 10px;font-size:11.5px;" onclick="saveMessageToTutorNotes('${m.suggestSaveTutorId}','${m.id}')">Lưu ngay</button>
            <button type="button" class="mini-act tap" onclick="dismissTutorSuggest('${m.id}')">${ICON_X}</button>
          </div></div>` : "";
        return `<div class="msg-row user" data-msg-id="${m.id}">${thumbs}${docs}${m.text ? `<div class="user-bubble lg-card">${esc(m.text)}</div>` : ""}${!window.getCurrentChatRun() ? `<div class="user-msg-acts"><button type="button" class="mini-act tap ${m.goodCheckpoint ? "pinned" : ""}" onclick="toggleMessageBookmark('${m.id}')" title="Ghim làm Mốc chuẩn (Anti-Amnesia)"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a1 1 0 0 1 1-1h1V3H7v2h1a1 1 0 0 1 1 1Z"/></svg></button><button type="button" class="mini-act tap" onclick="editUserMessage('${m.id}')" aria-label="Sửa tin nhắn">${ICON_EDIT}</button></div>` : ""}${saveBar}</div>`;
      }
      if (m.compare && typeof window.renderCompareMessageCard === "function") {
        return window.renderCompareMessageCard(m);
      }
      if (m.pipeline) {
        const p = m.pipeline;
        const steps = p.steps || [];
        const doneCnt = steps.filter(s => s.status === "done" || s.status === "conflict").length;
        const denom = Math.max(steps.length, Number(p.totalPlanned || 1));
        const pct = Math.min(100, Math.round((doneCnt / denom) * 100));
        const progHtml = `<div class="team-prog-card">
          <div class="team-prog-row">
            <span>${m.streaming ? `Đang chạy · Hoàn thành ${doneCnt}/${denom} bước` : `Hoàn tất ${doneCnt} bước phân tích`}</span>
            <strong class="num" style="color:var(--accent-ink);">${pct}%</strong>
          </div>
          <div class="team-prog-track"><div class="team-prog-fill" style="transform:scaleX(${Math.max(0.05, pct / 100)});"></div></div>
        </div>`;

        const stepsHtml = steps.map((st, idx) => {
          const isOpen = st.collapsed !== undefined ? !st.collapsed : (idx === steps.length - 1);
          const secTxt = st.elapsedMs ? `${(st.elapsedMs / 1000).toFixed(1)}s` : "";
          const stBadge = st.status === "running"
            ? `<span class="tag-st st-unused">Đang chạy...</span>`
            : (st.status === "fail" ? `<span class="tag-st st-pending">Lỗi</span>` : `<span class="tag-st st-active">Xong ${secTxt}</span>`);
          const canStepAct = !m.streaming && st.role !== "error";
          return `<div class="pipe-card ${st.status}">
            <button type="button" class="pipe-head tap-soft" onclick="togglePipeStepOpen('${m.id}','${st.id}')">
              <span class="pipe-head-l">
                <span class="pipe-step-num">${esc(st.num)}</span>
                <span style="font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(st.title)}</span>
                <span class="tag-quiet nowrap-pill">${esc(st.modelLabel)}</span>
              </span>
              <span style="display:inline-flex;align-items:center;gap:6px;flex-shrink:0;">
                ${stBadge}
                <span id="pc-${st.id}" class="chev ${isOpen?"rot":""}"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></span>
              </span>
            </button>
            <div id="pa-${st.id}" class="acc-wrap ${isOpen?"open":""}">
              <div class="acc-inner">
                <div class="pipe-body md" id="pipe-md-${st.id}">${st.text ? renderMd(st.text) : "Đang xử lý..."}</div>
                ${canStepAct ? `<div class="pipe-step-acts">
                  <button type="button" class="ws-chip-btn tap" onclick="rerunTeamMemberStep('${m.id}','${st.id}')">Chạy lại bước này</button>
                  <button type="button" class="ws-chip-btn accent tap" onclick="grillTeamMember('${m.id}','${st.id}')">Hỏi riêng thành viên</button>
                  <button type="button" class="ws-chip-btn tap" onclick="copyText(S.chats.find(x=>x.id===S.activeChatId)?.messages.find(x=>x.id==='${m.id}')?.pipeline?.steps?.find(x=>x.id==='${st.id}')?.text||'','Đã sao chép')">Sao chép</button>
                </div>` : ""}
              </div>
            </div>
          </div>`;
        }).join("");

        const gateHtml = p.awaitingApproval ? `<div class="pipe-gate-box">
          <strong style="font-size:13.5px;">Điểm dừng duyệt bản vẽ (Bước 1)</strong>
          <textarea id="bp-edit-${m.id}" class="field" rows="6" style="font-size:13px;">${esc(p.blueprint || "")}</textarea>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="btn-p tap" style="flex:1;" onclick="approveArchitectAndContinue('${m.id}')">Duyệt &amp; Chạy tiếp</button>
            <button type="button" class="btn-s tap" onclick="cancelArchitectGate('${m.id}')">Dừng tại đây</button>
          </div></div>` : "";

        const doneActs = (!m.streaming && !p.awaitingApproval) ? `<div class="img-act-row">
          ${p.finalCode ? `<button type="button" class="btn-p tap" style="height:34px;font-size:12.5px;" onclick="openPipelineCanvas('${m.id}')">Mở code Canvas</button>` : ""}
          <button type="button" class="btn-blue tap" style="height:34px;font-size:12.5px;" onclick="exportTeamMinutesModal('${m.id}')">Xuất Biên bản họp</button>
          <button type="button" class="btn-s tap" style="height:34px;font-size:12.5px;" onclick="copyPipelineCode('${m.id}')">Sao chép chốt</button>
          <button type="button" class="btn-s tap" style="height:34px;font-size:12.5px;" onclick="mergeReplyIntoSharedContext('${m.id}')">Đồng bộ boi-canh.md</button>
        </div>` : "";

        return `<div class="msg-row assistant" data-msg-id="${m.id}"><div class="pipeline-wrap">
          <div class="ai-meta-line">
            <span class="ai-logo-badge"><img class="brand-mark" src="logo-mark.png" alt="" width="15" height="15" /></span>
            <span class="meta-pill">${esc(m.modelLabel || "Đội ngũ AI")}</span>
            ${(S.user?.role === "admin" && m.slot) ? `<span class="meta-pill nowrap-pill">${esc(m.slot)}</span>` : ""}
          </div>
          ${progHtml}${stepsHtml}${gateHtml}${doneActs}
        </div></div>`;
      }
      if (m.failedSwitch) {
        return `<div class="msg-row assistant" data-msg-id="${m.id}"><div class="switch-api-card">
          <div>${esc(m.text)}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${m.canSwitch ? `<button type="button" class="btn-p tap" style="height:34px;font-size:12.5px;" onclick="switchChatApiWithSummary('${m.id}')">Chuyển API khác kèm tóm tắt</button>` : ""}
            <button type="button" class="btn-s tap" style="height:34px;font-size:12.5px;" onclick="startNewChat()">Mở đoạn chat mới</button>
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
          <button type="button" class="act-icon tap ${m.feedback==="up"?"active-like":""}" onclick="rateMsg('${m.id}','up')" aria-label="Thích"><svg fill="${m.feedback==="up"?"currentColor":"none"}" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg></button>
          <button type="button" class="act-icon tap ${m.feedback==="down"?"active-dislike":""}" onclick="rateMsg('${m.id}','down')" aria-label="Không thích"><svg fill="${m.feedback==="down"?"currentColor":"none"}" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 14V2M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg></button>
          <button type="button" class="act-icon tap" onclick="shareMsg('${m.id}')" aria-label="Chia sẻ"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4m0-11-6.8 4"/></svg></button>
          <button type="button" class="act-icon tap" onclick="copyCodeBtn(this,getMsgText('${m.id}'))" aria-label="Sao chép"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
          <button type="button" class="act-icon tap" onclick="regenerateReply('${m.id}')" aria-label="Tạo lại"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg></button>
          <button type="button" class="act-icon tap ${m.goodCheckpoint?"bookmarked":""}" onclick="toggleMessageBookmark('${m.id}')" aria-label="Ghim mốc tốt"><svg fill="${m.goodCheckpoint?"currentColor":"none"}" stroke="currentColor" viewBox="0 0 24 24"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"/></svg></button>
          <button type="button" class="act-icon tap" onclick="quoteReplyMessage('${m.id}')" aria-label="Trích dẫn hỏi sâu"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1Zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1Z"/></svg></button>
          <button type="button" class="act-icon tap" onclick="openMsgMore('${m.id}')" aria-label="Thêm"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.1"/><circle cx="12" cy="12" r="1.1"/><circle cx="19" cy="12" r="1.1"/></svg></button>
        </div><button type="button" class="act-icon tap ${S.speakingMsgId===m.id?"speaking":""}" onclick="toggleSpeak('${m.id}')" aria-label="Đọc to"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg></button></div>` : ""}
      </div></div>`;
    }).join("");

    // Only run full KaTeX pass when not actively streaming (avoids 60fps reflow jank!)
    if (!window.getCurrentChatRun()) typesetMathInElement(list);
    if (typeof window.updateContextGuardBar === "function") window.updateContextGuardBar();
  };

  window.togglePipeStepOpen = function (msgId, stepId) {
    const m = S.chats.find(c => c.id === S.activeChatId)?.messages.find(x => x.id === msgId);
    const st = m?.pipeline?.steps?.find(x => x.id === stepId);
    if (st) st.collapsed = !(st.collapsed === false);
    toggleAcc("pa-" + stepId, "pc-" + stepId);
  };

  // Sidebar Chat List with live Multi-Chat "Đang chạy" indicator!
  const _origRenderChatsListV36 = window.renderChatsList;
  window.renderChatsList = function () {
    _origRenderChatsListV36();
    const listEl = document.getElementById("sb-chats-list");
    if (!listEl || !S.activeRuns.size) return;
    listEl.querySelectorAll(".chat-item").forEach(row => {
      const oc = row.getAttribute("onclick") || "";
      const m = oc.match(/openChatWithJump\('([^']+)'/);
      if (m && S.activeRuns.has(m[1])) {
        const badge = document.createElement("span");
        badge.className = "chat-running-badge";
        badge.innerHTML = `<span class="chat-running-spin"></span><span>Đang chạy</span>`;
        row.insertBefore(badge, row.children[1] || null);
      }
    });
  };

  // Ensure switching chats NEVER loses running background chats & updates orb/UI cleanly
  const _origOpenChat = window.openChat;
  window.openChat = function (id) {
    userScrollLocked = false;
    _origOpenChat(id);
    syncGlobalStreamingUi();
  };
  const _origStartNewChatV36 = window.startNewChat;
  window.startNewChat = function () {
    userScrollLocked = false;
    _origStartNewChatV36();
    syncGlobalStreamingUi();
  };

  /* =========================================================================
     9. BOOT SEQUENCE
     ========================================================================= */
  attachScrollPhysics();

  boot().then(async () => {
    if (typeof window.__V36_POST_BOOT__ === "function") {
      await window.__V36_POST_BOOT__();
    }
    renderModelDropdown();
    renderTopContextPill();
    renderActiveContextBanner();
    syncGlobalStreamingUi();
  }).catch(err => console.error("Boot v3.7 error:", err));
})();
