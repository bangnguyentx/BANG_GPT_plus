/* API AI v3.6 Pro Suite — Unified Model Routing + Team Vision & Live boi-canh.md + /meo & Categorized Slash Palette + Lossless Compact + Arena /compare + Fork + Prompts + Trading Signal & Journal + Canvas Console + Smart TTS + Offline & Backup */
(function () {
  "use strict";

  /* =========================================================================
     1. CATEGORIZED SLASH COMMANDS + /meo INTERACTIVE GUIDE (3A + ĐỘT PHÁ, NO /btw, NO /diff)
     ========================================================================= */
  const V36_SLASH_COMMANDS = [
    // Group: Phổ biến (shown first when typing "/")
    { cmd: "/meo", group: "Phổ biến", popular: true, instant: true, desc: "Xem bảng hướng dẫn công dụng toàn bộ các lệnh /" },
    { cmd: "/plan", group: "Phổ biến", popular: true, instant: false, desc: "Lập kế hoạch trước, khóa sửa code (duyệt xong mới làm)" },
    { cmd: "/compact", group: "Phổ biến", popular: true, instant: true, desc: "Nén phiên dài giữ nguyên 4 tin gần nhất (vd: /compact giữ lại DB)" },
    { cmd: "/context", group: "Phổ biến", popular: true, instant: true, desc: "Xem % dung lượng ngữ cảnh đang dùng (Chat / MCP / Skills)" },
    { cmd: "/rewind", group: "Phổ biến", popular: true, instant: true, desc: "Quay ngược mốc thời gian (ưu tiên các mốc ✓ Mốc tốt)" },

    // Group: Code & Kiểm soát
    { cmd: "/init", group: "Code & Kiểm soát", popular: false, instant: true, desc: "Quét tệp/ảnh/chat hiện tại để tạo hồ sơ dự án boi-canh.md" },
    { cmd: "/simplify", group: "Code & Kiểm soát", popular: false, instant: true, desc: "Tối ưu & rút gọn đoạn code gần nhất giữ nguyên 100% logic" },
    { cmd: "/compare", group: "Code & Kiểm soát", popular: false, instant: true, desc: "So sánh 2 Model chạy song song (Arena Mode)" },
    { cmd: "/model", group: "Code & Kiểm soát", popular: false, instant: true, desc: "Mở nhanh bộ chọn Model & cấp độ tư duy" },
    { cmd: "/usage", group: "Code & Kiểm soát", popular: false, instant: true, desc: "Xem thanh % token, tin nhắn hôm nay & giờ reset" },
    { cmd: "/p", group: "Code & Kiểm soát", popular: false, instant: true, desc: "Mở Kho Prompt mẫu có điền biến nhanh {{biến}}" },
    { cmd: "/new", group: "Code & Kiểm soát", popular: false, instant: true, desc: "Mở phiên trò chuyện mới sạch sẽ" },

    // Group: Office & Ảnh
    { cmd: "/slide", group: "Office & Ảnh", popular: false, instant: false, desc: "Tạo bài thuyết trình PowerPoint (.pptx) kèm hiệu ứng" },
    { cmd: "/doc", group: "Office & Ảnh", popular: false, instant: false, desc: "Tạo tài liệu Word (.docx) chuẩn định dạng & xuất PDF" },
    { cmd: "/excel", group: "Office & Ảnh", popular: false, instant: false, desc: "Tạo bảng tính Excel (.xlsx) có công thức tính toán" },
    { cmd: "/pdf", group: "Office & Ảnh", popular: false, instant: false, desc: "Tạo và xuất tài liệu PDF chuẩn in" },
    { cmd: "/img", group: "Office & Ảnh", popular: false, instant: false, desc: "Vẽ ảnh tùy kích thước (vd: 1536x1024 dựa theo ảnh mẫu)" }
  ];

  let v36SlashShowAll = false;

  window.checkSlashTrigger = function (val) {
    const pop = document.getElementById("slash-popup");
    if (!pop) return;
    const raw = String(val || "");
    const m = raw.match(/^\/([a-z0-9_-]*)$/i);
    if (!m) {
      pop.classList.remove("open");
      v36SlashShowAll = false;
      return;
    }
    const q = m[1].toLowerCase();
    let list = q
      ? V36_SLASH_COMMANDS.filter(c => c.cmd.slice(1).includes(q) || c.desc.toLowerCase().includes(q))
      : (v36SlashShowAll ? V36_SLASH_COMMANDS : V36_SLASH_COMMANDS.filter(c => c.popular));
    if (!list.length) {
      pop.classList.remove("open");
      return;
    }
    slashSelIdx = Math.min(slashSelIdx, list.length - 1);

    let html = "";
    let lastGrp = "";
    list.forEach((c, i) => {
      if (c.group !== lastGrp) {
        lastGrp = c.group;
        html += `<div class="slash-group-lbl">${esc(c.group)}</div>`;
      }
      html += `<button type="button" class="drop-opt tap-soft ${i === slashSelIdx ? "selected" : ""}" onclick="pickSlashCommand('${c.cmd}',${c.instant})">
        <span class="slash-keycap">${esc(c.cmd)}</span>
        <div class="opt-main"><div class="opt-sub" style="margin:0;color:var(--ink-2);">${esc(c.desc)}</div></div>
      </button>`;
    });

    if (!q && !v36SlashShowAll) {
      html += `<div style="padding:4px 8px 2px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:11.5px;color:var(--ink-3);">Đang hiện 5 lệnh hay dùng · gõ thêm chữ để lọc</span>
        <button type="button" class="btn-s tap" style="height:28px;padding:0 10px;font-size:11.5px;" onclick="event.stopPropagation();window.expandAllSlashCommands()">Xem tất cả (${V36_SLASH_COMMANDS.length})</button>
      </div>`;
    }
    pop.innerHTML = html;
    pop.classList.add("open");
  };

  window.expandAllSlashCommands = function () {
    v36SlashShowAll = true;
    window.checkSlashTrigger(document.getElementById("prompt-in")?.value || "/");
  };

  window.pickSlashCommand = function (cmd, instant) {
    const ta = document.getElementById("prompt-in");
    document.getElementById("slash-popup")?.classList.remove("open");
    haptic("tap");
    if (cmd === "/compact") {
      ta.value = "/compact ";
      autoGrow(); updateOrbButton(); ta.focus();
      showToast("Bấm Gửi để nén ngay, hoặc gõ thêm điều cần giữ lại sau /compact");
      return;
    }
    if (instant) {
      ta.value = ""; autoGrow(); updateOrbButton();
      window.handleV36SlashSubmit(cmd, true);
      return;
    }
    const map = { "/plan": "plan", "/slide": "office_pptx", "/doc": "office_docx", "/excel": "office_xlsx", "/pdf": "office_pdf", "/img": "image" };
    if (map[cmd]) {
      S.activeTool = map[cmd];
      renderChips();
      ta.value = ""; autoGrow(); updateOrbButton(); ta.focus();
      showToast(`Đã bật ${TOOL_CHIP_LABELS[map[cmd]] || cmd} · Nhập yêu cầu của bạn`);
    }
  };

  window.handleV36SlashSubmit = async function (rawText, clearInput) {
    const input = document.getElementById("prompt-in");
    const spIdx = rawText.search(/\s/);
    const cmd = (spIdx === -1 ? rawText : rawText.slice(0, spIdx)).toLowerCase();
    const rest = spIdx === -1 ? "" : rawText.slice(spIdx + 1).trim();

    const clearBox = () => {
      if (clearInput && input) { input.value = ""; autoGrow(); updateOrbButton(); saveCurrentDraft(); }
    };

    if (cmd === "/meo") { clearBox(); openSlashGuideModal(); return { handled: true }; }
    if (cmd === "/new") { clearBox(); startNewChat(); showToast("Đã mở phiên trò chuyện mới", "ok"); return { handled: true }; }
    if (cmd === "/compact") { clearBox(); await runLosslessCompactSession(rest); return { handled: true }; }
    if (cmd === "/context") { clearBox(); openContextInspectorModal(); return { handled: true }; }
    if (cmd === "/rewind") { clearBox(); openRewindCheckpointModal(); return { handled: true }; }
    if (cmd === "/init") { clearBox(); await runInitProjectContext(rest); return { handled: true }; }
    if (cmd === "/model") { clearBox(); openModelDropdownQuick(); return { handled: true }; }
    if (cmd === "/usage") { clearBox(); openUserTokenBalanceModal(); return { handled: true }; }
    if (cmd === "/simplify") { clearBox(); await runSimplifyCode(null, rest); return { handled: true }; }
    if (cmd === "/compare") { clearBox(); openCompareSetupModal(rest); return { handled: true }; }
    if (cmd === "/p") { clearBox(); openPromptLibraryModal(rest); return { handled: true }; }

    const toolMap = { "/plan": "plan", "/slide": "office_pptx", "/doc": "office_docx", "/excel": "office_xlsx", "/pdf": "office_pdf", "/img": "image" };
    if (toolMap[cmd]) {
      S.activeTool = toolMap[cmd];
      renderChips();
      if (!rest) {
        clearBox();
        showToast(`Đã bật chế độ ${cmd} · Nhập nội dung rồi bấm Gửi`);
        input?.focus();
        return { handled: true };
      }
      return { handled: false, newText: rest };
    }
    return { handled: false };
  };

  window.openSlashGuideModal = function () {
    haptic("tap");
    const groups = ["Phổ biến", "Code & Kiểm soát", "Office & Ảnh"];
    const body = groups.map(g => {
      const items = V36_SLASH_COMMANDS.filter(x => x.group === g);
      return `<div style="margin-bottom:12px;">
        <div style="font-size:12px;font-weight:500;color:var(--accent-ink);margin-bottom:6px;">${esc(g)}</div>
        ${items.map(c => `<div class="mem-chip-row" style="margin-bottom:5px;align-items:center;">
          <div style="flex:1;min-width:0;">
            <span class="slash-keycap">${esc(c.cmd)}</span>
            <div style="font-size:12px;color:var(--ink-2);margin-top:3px;line-height:1.4;">${esc(c.desc)}</div>
          </div>
          <button type="button" class="btn-s tap" style="height:30px;padding:0 10px;font-size:11.5px;flex-shrink:0;" onclick="closeModal();pickSlashCommand('${c.cmd}',${c.instant})">Dùng</button>
        </div>`).join("")}
      </div>`;
    }).join("");

    openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:4px;">Mẹo dùng nhanh các lệnh /</h3>
      <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:12px;">Gõ ký tự <b>/</b> để gọi lệnh, gõ <b>@</b> để gọi Skills, gõ <b>#</b> để gắn nhanh <code>boi-canh.md</code> / Sổ ghi chú / Ảnh Thư viện.</p>
      <div style="max-height:58dvh;overflow-y:auto;">${body}</div>
      <div style="display:flex;justify-content:flex-end;margin-top:10px;"><button type="button" class="btn-p tap" onclick="closeModal()">Đã hiểu</button></div>`);
  };

  window.openModelDropdownQuick = function () {
    const d = document.getElementById("model-dropdown"), b = document.getElementById("btn-model-trigger");
    closePopovers();
    d?.classList.add("open");
    b?.classList.add("open");
  };

  /* =========================================================================
     2. N1: LOSSLESS SLIDING-WINDOW COMPACT + /context METER + 75% CONTEXT GUARD + /init + /rewind + /simplify
     ========================================================================= */
  function estimateChatContextBreakdown(chat) {
    const windowCap = 128000; // Practical high-IQ window before quality degrades
    const startIdx = Number.isInteger(chat?.compactedUpToIndex) ? Math.max(0, chat.compactedUpToIndex) : 0;
    const activeMsgs = (chat?.messages || []).slice(startIdx).filter(m => !m.failedSwitch);

    let chatChars = (chat?.compactSummary || "").length;
    let toolChars = 0;
    let imgTokens = 0;
    for (const m of activeMsgs) {
      chatChars += (m.text || "").length;
      for (const a of (m.atts || [])) {
        if (a.dataUrl) imgTokens += 1100;
        if (a.text) toolChars += a.text.length;
      }
      for (const st of (m.toolSteps || [])) toolChars += (st.raw || "").length;
      if (m.pipeline?.steps) {
        for (const ps of m.pipeline.steps) chatChars += (ps.text || "").length;
      }
    }

    let skillsChars = 0;
    const ctxObj = getActiveContextForChat(chat);
    if (ctxObj?.content) skillsChars += ctxObj.content.length;
    if (S.activeNbId) {
      const nb = S.notebooks.find(n => n.id === S.activeNbId);
      if (nb?.notes) skillsChars += nb.notes.length;
    }
    S.skillIds.forEach(id => {
      const sk = S.skills.find(x => x.id === id);
      if (sk) skillsChars += Math.min(5000, (sk.repoIndex || sk.prompt || "").length);
    });
    S.memories.filter(m => m.enabled !== false).forEach(m => { skillsChars += (m.content || "").length; });

    const chatTok = Math.round(chatChars / 3.5) + imgTokens;
    const toolTok = Math.round(toolChars / 3.5);
    const skillTok = Math.round(skillsChars / 3.5) + 450;
    const totalTok = chatTok + toolTok + skillTok;
    const pct = Math.min(100, Math.round((totalTok / windowCap) * 100));
    return { chatTok, toolTok, skillTok, totalTok, windowCap, pct, msgCount: activeMsgs.length };
  }

  window.updateContextGuardBar = function () {
    const bar = document.getElementById("context-guard-bar");
    if (!bar) return;
    const chat = S.chats.find(c => c.id === S.activeChatId);
    if (!chat || !(chat.messages || []).length) {
      bar.style.display = "none";
      bar.innerHTML = "";
      return;
    }
    const info = estimateChatContextBreakdown(chat);
    if (info.pct >= 75) {
      bar.style.display = "block";
      bar.innerHTML = `<div class="ctx-guard-bar">
        <span style="min-width:0;flex:1;">Ngữ cảnh đạt <b class="num">${info.pct}%</b> (~${Math.round(info.totalTok / 1000)}K tok) · Nén để giữ độ sắc &amp; tiết kiệm ~75% token</span>
        <button type="button" class="btn-p tap" style="height:30px;padding:0 12px;font-size:12px;flex-shrink:0;" onclick="runLosslessCompactSession('')">Nén ngay</button>
      </div>`;
    } else {
      bar.style.display = "none";
      bar.innerHTML = "";
    }
  };

  window.openContextInspectorModal = function () {
    const chat = S.chats.find(c => c.id === S.activeChatId);
    const b = estimateChatContextBreakdown(chat);
    const pChat = Math.min(100, Math.round((b.chatTok / b.windowCap) * 1000) / 10);
    const pTool = Math.min(100 - pChat, Math.round((b.toolTok / b.windowCap) * 1000) / 10);
    const pSkill = Math.min(100 - pChat - pTool, Math.round((b.skillTok / b.windowCap) * 1000) / 10);
    const pFree = Math.max(0, Math.round((100 - pChat - pTool - pSkill) * 10) / 10);

    openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:4px;">Dung lượng ngữ cảnh (/context)</h3>
      <p style="font-size:12.5px;color:var(--ink-2);">Phiên hiện tại đang dùng <b class="num" style="color:var(--ink);">${b.pct}%</b> (~${b.totalTok.toLocaleString("vi-VN")} / ${(b.windowCap / 1000)}K token chuẩn nét).</p>
      <div class="ctx-meter-bar">
        <div class="ctx-seg-chat" style="width:${pChat}%;"></div>
        <div class="ctx-seg-tools" style="width:${pTool}%;"></div>
        <div class="ctx-seg-skills" style="width:${pSkill}%;"></div>
      </div>
      <div class="ctx-legend">
        <div class="ctx-leg-item"><span class="ctx-swatch" style="background:var(--accent);"></span><div><div>Lịch sử chat</div><b class="num">${pChat}% (${Math.round(b.chatTok/1000*10)/10}K)</b></div></div>
        <div class="ctx-leg-item"><span class="ctx-swatch" style="background:var(--ok);"></span><div><div>Công cụ / Tệp / MCP</div><b class="num">${pTool}% (${Math.round(b.toolTok/1000*10)/10}K)</b></div></div>
        <div class="ctx-leg-item"><span class="ctx-swatch" style="background:var(--warn);"></span><div><div>Skills &amp; boi-canh.md</div><b class="num">${pSkill}% (${Math.round(b.skillTok/1000*10)/10}K)</b></div></div>
        <div class="ctx-leg-item"><span class="ctx-swatch" style="background:var(--row-active);"></span><div><div>Còn trống</div><b class="num">${pFree}%</b></div></div>
      </div>
      <div style="margin-top:12px;">
        <label class="f-lbl" style="margin-top:0;">Dặn AI giữ lại chi tiết quan trọng khi nén (tùy chọn)</label>
        <input id="ctx-keep-in" class="field" style="font-size:14px;" placeholder="VD: giữ nguyên cấu trúc bảng D1 và logic DCA..." />
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
        <button type="button" class="btn-s tap" onclick="closeModal()">Đóng</button>
        <button type="button" class="btn-p tap" onclick="const k=document.getElementById('ctx-keep-in')?.value.trim()||'';closeModal();runLosslessCompactSession(k)">Nén giữ nguyên 4 tin cuối</button>
      </div>`);
  };

  window.runLosslessCompactSession = async function (focusNote = "") {
    const chat = S.chats.find(c => c.id === S.activeChatId);
    const msgs = chat?.messages || [];
    if (!chat || msgs.length < 3) {
      return showToast("Phiên hiện tại còn ngắn, chưa cần nén (/compact)", "warn");
    }

    // N1 Lossless Sliding-Window: keep last 4 messages verbatim so AI NEVER loses immediate IQ!
    const keepTail = msgs.length > 5 ? 4 : 2;
    const cutIdx = Math.max(1, msgs.length - keepTail);
    const startIdx = Number.isInteger(chat.compactedUpToIndex) ? Math.min(chat.compactedUpToIndex, cutIdx) : 0;
    const toCompress = msgs.slice(startIdx, cutIdx).filter(m => !m.failedSwitch && m.text);
    if (!toCompress.length) {
      return showToast("Các tin nhắn cũ đã được nén gọn rồi, 4 tin gần nhất đang giữ nguyên văn", "ok");
    }

    const astraAllowed = S.user?.role === "admin" || S.models.some(m => m.id === "gpt-6.2-astra" && m.allowed);
    const compactModelId = astraAllowed ? "gpt-6.2-astra" : "gpt-6.2-sol";
    showToast(`Đang nén ${toCompress.length} tin cũ (giữ nguyên văn ${keepTail} tin gần nhất) bằng ${astraAllowed ? "GPT 6.2 Astra" : "GPT 6.2 Sol"}...`);

    const transcript = (chat.compactSummary ? `[BẢN MỎ NEO NÉN TRƯỚC ĐÓ]\n${chat.compactSummary}\n\n` : "")
      + toCompress.map(m => `${m.role === "user" ? "Người dùng" : "API AI"}: ${m.text.slice(0, 1800)}`).join("\n\n");

    const focusInstruction = focusNote
      ? `YÊU CẦU GIỮ LẠI ĐẶC BIỆT TỪ NGƯỜI DÙNG (BẮT BUỘC GIỮ ĐỦ 100%): ${focusNote}. Nén toàn bộ phần cũ theo đúng 5 Mỏ neo bất biến.`
      : "Nén phần lịch sử cũ theo đúng 5 Mỏ neo bất biến: Mục tiêu & Quyết định, Tên file/hàm/thông số chính xác, Ràng buộc, Lỗi đã xử lý, Bước tiếp theo.";

    try {
      const r = await apiFetch("/ai/digest", {
        method: "POST",
        body: {
          digestMode: "compact_chat",
          readerModelId: compactModelId,
          instruction: focusInstruction,
          content: transcript.slice(0, 26000)
        }
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Không thể nén ngữ cảnh");
      chat.compactSummary = d.digest || "";
      chat.compactedUpToIndex = cutIdx;
      chat.compactedKeepTail = keepTail;
      chat.compactedBy = d.readerModel || "GPT 6.2 Astra";
      chat.compactedAt = Date.now();
      await dbPut("chats", chat).catch(() => {});
      apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {});
      renderMessages(); haptic("ok");
      showToast(`Đã nén gọn ${cutIdx} tin cũ + giữ nguyên văn ${keepTail} tin cuối!`, "ok");
    } catch (e) {
      haptic("err"); showToast("Lỗi /compact: " + e.message, "err");
    }
  };
  // Redirect original runCompactSession to Lossless version
  window.runCompactSession = window.runLosslessCompactSession;

  window.runInitProjectContext = async function (extraHint = "") {
    const chat = S.chats.find(c => c.id === S.activeChatId);
    const sources = [];
    if (extraHint) sources.push(`[YÊU CẦU KHỞI TẠO]: ${extraHint}`);
    for (const a of (S.atts || [])) {
      if (a.type === "file" && a.text) sources.push(`[TỆP ${a.name}]:\n${a.text.slice(0, 4500)}`);
    }
    S.skillIds.forEach(id => {
      const sk = S.skills.find(x => x.id === id);
      if (sk?.repoIndex) sources.push(`[REPO @${sk.name}]:\n${sk.repoIndex}`);
    });
    if (chat?.messages?.length) {
      sources.push("[LỊCH SỬ CHAT HIỆN TẠI]:\n" + chat.messages.slice(-8).map(m => `${m.role}: ${(m.text || "").slice(0, 800)}`).join("\n"));
    }
    if (!sources.length) {
      openSharedContextEditor(null);
      return showToast("Chưa có tệp/chat nào để quét · Mở trình tạo boi-canh.md thủ công");
    }
    showToast("Đang quét dự án để khởi tạo boi-canh.md (/init)...");
    try {
      const r = await apiFetch("/ai/digest", {
        method: "POST",
        body: {
          digestMode: "merge_context",
          readerModelId: S.cfg.repoReaderModel || "gpt-6.2-sol",
          instruction: "Khởi tạo file boi-canh.md chuẩn mực cho dự án này gồm: Mục tiêu, Kiến trúc/File chính, Quy ước kỹ thuật, Thông số cố định và Việc cần làm tiếp.",
          content: sources.join("\n\n").slice(0, 24000)
        }
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Không khởi tạo được");
      const title = chat?.title ? `boi-canh-${chat.title.slice(0, 18).replace(/[^\p{L}\p{N}-]+/gu, "-")}.md` : "boi-canh.md";
      const obj = { id: "ctx-" + Date.now(), title, content: d.digest || "", history: [], updatedAt: Date.now() };
      await dbPut("contexts", obj);
      apiFetch("/sync/contexts", { method: "POST", body: obj }).catch(() => {});
      S.contexts = (await dbAll("contexts")).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      S.activeContextId = obj.id;
      if (chat) { chat.contextId = obj.id; dbPut("chats", chat).catch(() => {}); apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {}); }
      renderTopContextPill(); haptic("ok");
      showToast(`Đã khởi tạo & gắn ${title}`, "ok");
      openSharedContextEditor(obj.id);
    } catch (e) { haptic("err"); showToast("Lỗi /init: " + e.message, "err"); }
  };

  window.toggleMessageBookmark = function (msgId) {
    const chat = S.chats.find(c => c.id === S.activeChatId);
    const m = chat?.messages.find(x => x.id === msgId);
    if (!m) return;
    haptic("switch");
    m.goodCheckpoint = !m.goodCheckpoint;
    dbPut("chats", chat).catch(() => {});
    apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {});
    renderMessages();
    showToast(m.goodCheckpoint ? "Đã ghim ✓ Mốc tốt cho /rewind" : "Đã bỏ ghim mốc");
  };

  window.openRewindCheckpointModal = function () {
    const chat = S.chats.find(c => c.id === S.activeChatId);
    const msgs = chat?.messages || [];
    if (msgs.length < 2) return showToast("Chưa có đủ mốc lịch sử để quay ngược (/rewind)", "warn");

    const rows = msgs.map((m, idx) => {
      if (m.role !== "assistant") return "";
      const prevU = msgs[idx - 1]?.role === "user" ? msgs[idx - 1].text : "";
      const timeStr = m.ts ? new Date(m.ts).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "";
      return `<div class="card-item lg-card" style="padding:10px 12px;margin-bottom:8px;${m.goodCheckpoint ? "border-color:var(--ok-rim);" : ""}">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <strong class="num" style="font-size:12.5px;">Mốc #${idx + 1} · ${esc(timeStr)}</strong>
            ${m.goodCheckpoint ? `<span class="checkpoint-badge">✓ Mốc tốt</span>` : ""}
          </div>
          <button type="button" class="btn-blue tap" style="height:30px;padding:0 10px;font-size:12px;" onclick="commitRewindToIndex(${idx})">Quay về đây</button>
        </div>
        ${prevU ? `<div style="font-size:12px;color:var(--accent-ink);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Hỏi: ${esc(prevU.slice(0, 90))}</div>` : ""}
        <div style="font-size:12px;color:var(--ink-2);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Đáp: ${esc((m.text || "").replace(/\s+/g, " ").slice(0, 100))}</div>
      </div>`;
    }).filter(Boolean).reverse().join("");

    openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:4px;">Quay ngược thời gian (/rewind)</h3>
      <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:10px;">Chọn 1 mốc trước đó để đưa đoạn chat trở lại trạng thái chuẩn (các tin nhắn lỗi phía sau sẽ được cắt bỏ sạch sẽ).</p>
      <div style="max-height:56dvh;overflow-y:auto;">${rows || `<p class="p-sub">Chưa có mốc phản hồi nào.</p>`}</div>
      <div style="display:flex;justify-content:flex-end;margin-top:10px;"><button type="button" class="btn-s tap" onclick="closeModal()">Đóng</button></div>`);
  };

  window.commitRewindToIndex = async function (idx) {
    const chat = S.chats.find(c => c.id === S.activeChatId);
    if (!chat) return;
    chat.messages = chat.messages.slice(0, idx + 1);
    if (Number.isInteger(chat.compactedUpToIndex) && chat.compactedUpToIndex > chat.messages.length) {
      chat.compactedUpToIndex = chat.messages.length;
    }
    chat.updatedAt = Date.now();
    await dbPut("chats", chat).catch(() => {});
    apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {});
    closeModal(); renderMessages(); haptic("ok");
    showToast(`Đã quay ngược về Mốc #${idx + 1}`, "ok");
  };

  window.runSimplifyCode = async function (msgId = null, extraHint = "") {
    const chat = S.chats.find(c => c.id === S.activeChatId);
    const targetMsg = msgId
      ? chat?.messages.find(m => m.id === msgId)
      : [...(chat?.messages || [])].reverse().find(m => m.role === "assistant" && /```/.test(m.text || ""));
    if (!targetMsg) return showToast("Không tìm thấy khối code nào trong đoạn chat để tối ưu (/simplify)", "warn");
    const codeObj = extractBestCodeBlock(targetMsg.text || targetMsg.pipeline?.codeOutput || "");
    if (!codeObj) return showToast("Tin nhắn không chứa khối code", "warn");
    const prompt = `CHẾ ĐỘ /simplify — ĐƠN GIẢN HÓA & TÁI CẤU TRÚC CODE:
Hãy rà lại đoạn code \`${codeObj.lang}\` dưới đây: gom chỗ trùng lặp, bỏ mã thừa, đặt tên rõ nghĩa hơn nhưng BẮT BUỘC giữ nguyên 100% logic & tính năng hiện có${extraHint ? ` (Lưu ý thêm: ${extraHint})` : ""}. Xuất trọn bộ code đã làm gọn kèm 3 dòng tóm tắt những gì đã tối ưu:\n\n\`\`\`${codeObj.lang}\n${codeObj.code.slice(0, 14000)}\n\`\`\``;
    await sendPrompt(prompt);
  };

  /* =========================================================================
     3. N2: ARENA /compare (2 MODELS SIDE-BY-SIDE ON MOBILE)
     ========================================================================= */
  window.openCompareSetupModal = function (prefillPrompt = "") {
    const mods = getAllowedRealModels();
    if (mods.length < 2) return showToast("Cần ít nhất 2 model trong gói để so sánh song song", "warn");
    const curA = S.cfg.selectedModel && mods.some(m => m.id === S.cfg.selectedModel) ? S.cfg.selectedModel : mods[0].id;
    const curB = (mods.find(m => m.id !== curA) || mods[1]).id;

    openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:4px;">So sánh 2 Model song song (/compare)</h3>
      <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:10px;">Gửi cùng 1 yêu cầu (và ảnh/tệp đang đính kèm) cho 2 Model chạy song song rồi chọn bản xuất sắc nhất làm mạch chính.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div><label class="f-lbl">Model A</label><select id="cmp-mA" class="field" style="font-size:13.5px;">${mods.map(m => `<option value="${esc(m.id)}" ${m.id===curA?"selected":""}>${esc(m.short || m.title)} ${m.cost_label?`(${m.cost_label})`:""}</option>`).join("")}</select></div>
        <div><label class="f-lbl">Model B</label><select id="cmp-mB" class="field" style="font-size:13.5px;">${mods.map(m => `<option value="${esc(m.id)}" ${m.id===curB?"selected":""}>${esc(m.short || m.title)} ${m.cost_label?`(${m.cost_label})`:""}</option>`).join("")}</select></div>
      </div>
      <label class="f-lbl">Câu hỏi / Yêu cầu so sánh</label>
      <textarea id="cmp-prompt" class="field" rows="3" placeholder="Nhập đề bài, code hoặc yêu cầu phân tích ảnh đang đính kèm...">${esc(prefillPrompt || document.getElementById("prompt-in")?.value || "")}</textarea>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
        <button type="button" class="btn-s tap" onclick="closeModal()">Hủy</button>
        <button type="button" class="btn-p tap" onclick="startCompareArenaRun()">Chạy so sánh</button>
      </div>`);
  };

  window.startCompareArenaRun = async function () {
    const mA = document.getElementById("cmp-mA")?.value;
    const mB = document.getElementById("cmp-mB")?.value;
    const prompt = document.getElementById("cmp-prompt")?.value.trim();
    if (!prompt && !S.atts.length) return showToast("Nhập câu hỏi hoặc đính kèm ảnh trước", "warn");
    if (mA === mB) return showToast("Chọn 2 model khác nhau để so sánh", "warn");
    closeModal();

    let chat = S.chats.find(c => c.id === S.activeChatId);
    if (!chat) {
      chat = { id: "c-" + Date.now(), title: ("[So sánh] " + (prompt || "Ảnh")).slice(0, 48), pinned: false, mode: "chat", contextId: S.activeContextId || null, nbId: S.activeNbId, updatedAt: Date.now(), messages: [] };
      S.chats.unshift(chat); S.activeChatId = chat.id;
    }
    const sentAtts = [...S.atts];
    chat.messages.push({ id: "m-" + Date.now(), role: "user", text: prompt, atts: sentAtts, ts: Date.now() });
    S.atts = [];
    const ta = document.getElementById("prompt-in"); if (ta) { ta.value = ""; autoGrow(); }
    renderChips(); renderChatsList();

    const objA = S.models.find(m => m.id === mA), objB = S.models.find(m => m.id === mB);
    const cmpMsg = {
      id: "m-" + (Date.now() + 1),
      role: "assistant",
      text: "",
      streaming: true,
      compare: {
        activeTab: "a",
        a: { modelId: mA, label: objA?.short || mA, text: "", status: "running", ms: 0 },
        b: { modelId: mB, label: objB?.short || mB, text: "", status: "running", ms: 0 }
      },
      ts: Date.now()
    };
    chat.messages.push(cmpMsg);
    S.streaming = true; S.abort = new AbortController(); updateOrbButton();
    renderMessages(); scrollToBottom(true);

    const sysPrompt = buildSystemPrompt(chat, prompt, sentAtts.some(x => x.dataUrl));
    const docTxt = sentAtts.filter(x => x.type === "file").map(d => `[TỆP ${d.name}]\n${d.text}`).join("\n\n");
    const userTxt = docTxt ? `${prompt}\n\n${docTxt}` : (prompt || "Phân tích chi tiết hình ảnh đính kèm.");
    const imgAtts = sentAtts.filter(x => x.dataUrl);

    const runSide = async (sideKey, modelId) => {
      const t0 = Date.now();
      const side = cmpMsg.compare[sideKey];
      let raf = false;
      const paint = () => {
        raf = false;
        const el = document.getElementById(`cmp-${sideKey}-${cmpMsg.id}`);
        if (el) el.innerHTML = renderMd(side.text);
      };
      try {
        const res = await callStatelessAgent(chat, modelId, "compare_" + sideKey, sysPrompt, userTxt, full => {
          side.text = full;
          if (!raf) { raf = true; requestAnimationFrame(paint); }
        }, imgAtts);
        side.text = res.text;
        side.status = "done";
      } catch (e) {
        side.text = `**Lỗi:** ${e.message}`;
        side.status = "err";
      }
      side.ms = Date.now() - t0;
      renderMessages();
    };

    try {
      await Promise.all([runSide("a", mA), runSide("b", mB)]);
      cmpMsg.text = cmpMsg.compare.a.text || cmpMsg.compare.b.text;
      haptic("ok"); showToast("Đã hoàn tất so sánh 2 Model · Bấm chọn bản làm mạch chính", "ok");
    } finally {
      cmpMsg.streaming = false; S.streaming = false; S.abort = null; chat.updatedAt = Date.now();
      dbPut("chats", chat).catch(() => {});
      apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {});
      renderMessages(); updateOrbButton();
    }
  };

  window.renderCompareMessageCard = function (m) {
    const c = m.compare;
    const act = c.activeTab === "b" ? "b" : "a";
    const cur = c[act];
    return `<div class="msg-row assistant" data-msg-id="${m.id}"><div class="compare-card">
      <div class="compare-tabs">
        <button type="button" class="compare-tab tap-soft ${act==="a"?"active":""}" onclick="switchCompareTab('${m.id}','a')">
          <span>A · ${esc(c.a.label)}</span>
          ${c.a.ms ? `<span class="tag-quiet num">${(c.a.ms/1000).toFixed(1)}s</span>` : `<span class="tag-st st-unused">...</span>`}
        </button>
        <button type="button" class="compare-tab tap-soft ${act==="b"?"active":""}" onclick="switchCompareTab('${m.id}','b')">
          <span>B · ${esc(c.b.label)}</span>
          ${c.b.ms ? `<span class="tag-quiet num">${(c.b.ms/1000).toFixed(1)}s</span>` : `<span class="tag-st st-unused">...</span>`}
        </button>
      </div>
      <div class="compare-pane md" id="cmp-${act}-${m.id}">${cur.text ? renderMd(cur.text) : "Đang trả lời..."}</div>
      ${!m.streaming ? `<div class="compare-foot">
        <button type="button" class="btn-p tap" style="height:36px;font-size:12.5px;flex:1;" onclick="lockCompareWinner('${m.id}','${act}')">Chọn bản ${act.toUpperCase()} (${esc(cur.label)}) làm mạch chính</button>
        <button type="button" class="btn-s tap" style="height:36px;font-size:12.5px;" onclick="copyText(S.chats.find(x=>x.id===S.activeChatId)?.messages.find(x=>x.id==='${m.id}')?.compare?.['${act}']?.text||'','Đã sao chép')">Sao chép</button>
      </div>` : ""}
    </div></div>`;
  };

  window.switchCompareTab = function (msgId, side) {
    const m = S.chats.find(c => c.id === S.activeChatId)?.messages.find(x => x.id === msgId);
    if (!m?.compare) return;
    haptic("tap");
    m.compare.activeTab = side;
    renderMessages();
  };

  window.lockCompareWinner = async function (msgId, side) {
    const chat = S.chats.find(c => c.id === S.activeChatId);
    const m = chat?.messages.find(x => x.id === msgId);
    if (!m?.compare?.[side]) return;
    const win = m.compare[side];
    m.text = win.text;
    m.modelLabel = `${win.label} · Đã chốt từ /compare`;
    delete m.compare;
    await dbPut("chats", chat).catch(() => {});
    apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {});
    haptic("ok"); renderMessages();
    showToast(`Đã chốt câu trả lời của ${win.label} làm mạch chính`, "ok");
  };

  /* =========================================================================
     4. N3 (CHAT FORK) + N4 (PROMPT LIBRARY) + N6 (MICRO-UX: AUTO-DRAFT, QUOTE, TOKEN EST, FULL-TEXT SEARCH, # TAGGER)
     ========================================================================= */
  window.forkChatFromMessage = async function (msgId) {
    const chat = S.chats.find(c => c.id === S.activeChatId);
    const idx = chat?.messages.findIndex(m => m.id === msgId);
    if (!chat || idx < 0) return;
    const forked = {
      ...JSON.parse(JSON.stringify(chat)),
      id: "c-" + Date.now(),
      title: `[Nhánh] ${chat.title}`.slice(0, 48),
      pinned: false,
      messages: JSON.parse(JSON.stringify(chat.messages.slice(0, idx + 1))),
      updatedAt: Date.now()
    };
    S.chats.unshift(forked);
    S.activeChatId = forked.id;
    await dbPut("chats", forked).catch(() => {});
    apiFetch("/sync/chats", { method: "POST", body: forked }).catch(() => {});
    renderChatsList(); renderMessages(); haptic("ok");
    showToast("Đã rẽ nhánh sang cuộc trò chuyện mới", "ok");
  };

  window.quoteReplyMessage = function (msgId) {
    const txt = getMsgText(msgId).replace(/[#*`]/g, "").trim();
    if (!txt) return;
    const snippet = txt.slice(0, 180) + (txt.length > 180 ? "..." : "");
    const ta = document.getElementById("prompt-in");
    ta.value = `> "${snippet}"\n\nHỏi sâu thêm về đoạn này: `;
    autoGrow(); updateOrbButton(); ta.focus();
    haptic("tap");
  };

  // Auto-Draft per chat in localStorage
  function draftKey() { return "apiai_draft_" + (S.activeChatId || "new"); }
  window.saveCurrentDraft = function () {
    const ta = document.getElementById("prompt-in");
    if (!ta) return;
    try {
      if (ta.value) localStorage.setItem(draftKey(), ta.value);
      else localStorage.removeItem(draftKey());
    } catch {}
  };
  window.restoreCurrentDraft = function () {
    const ta = document.getElementById("prompt-in");
    if (!ta) return;
    try {
      const saved = localStorage.getItem(draftKey()) || "";
      if (saved && !ta.value) { ta.value = saved; autoGrow(); updateOrbButton(); }
    } catch {}
  };

  // Pre-send Token Estimator Pill
  window.updatePreSendTokenEstimate = function () {
    const strip = document.getElementById("token-est-strip");
    if (!strip) return;
    const txt = document.getElementById("prompt-in")?.value || "";
    const hasAtts = (S.atts || []).length > 0;
    if (txt.length < 220 && !hasAtts) {
      strip.style.display = "none"; strip.innerHTML = ""; return;
    }
    let chars = txt.length, imgs = 0;
    for (const a of (S.atts || [])) {
      if (a.dataUrl) imgs++;
      if (a.text) chars += a.text.length;
    }
    const mod = S.models.find(m => m.id === S.cfg.selectedModel);
    const mult = Number(mod?.cost_multiplier || 1.2);
    const est = Math.ceil((chars / 3.5 + imgs * 1100) * mult);
    strip.style.display = "flex";
    strip.innerHTML = `<span class="token-est-pill">Ước tính lượt này: ~${est >= 1000 ? (est / 1000).toFixed(1) + "K" : est} tok · ×${mult}</span>`;
  };

  // # Context Tagger (boi-canh.md, Notebooks, Library items)
  window.checkHashTrigger = function (val) {
    const pop = document.getElementById("hash-popup");
    if (!pop) return;
    const m = String(val || "").match(/#([^\s#]*)$/);
    if (!m) { pop.classList.remove("open"); return; }
    const q = m[1].toLowerCase();
    const items = [];
    (S.contexts || []).forEach(c => items.push({ kind: "ctx", id: c.id, title: c.title, sub: "Hồ sơ boi-canh.md" }));
    (S.notebooks || []).forEach(n => items.push({ kind: "nb", id: n.id, title: n.title, sub: "Sổ ghi chú" }));
    (S.library || []).slice(0, 8).forEach(l => items.push({ kind: "lib", id: l.id, title: l.title, sub: l.type === "media" ? "Ảnh Thư viện" : "Tài liệu Thư viện" }));

    const hits = items.filter(it => !q || (it.title || "").toLowerCase().includes(q) || it.sub.toLowerCase().includes(q)).slice(0, 8);
    if (!hits.length) { pop.classList.remove("open"); return; }
    pop.innerHTML = hits.map(it => `<button type="button" class="drop-opt tap-soft" onclick="pickHashItem('${it.kind}','${esc(it.id)}')">
      <span class="slash-keycap">#${it.kind}</span>
      <div class="opt-main"><div class="opt-title">${esc(it.title)}</div><div class="opt-sub">${esc(it.sub)}</div></div>
    </button>`).join("");
    pop.classList.add("open");
  };

  window.pickHashItem = function (kind, id) {
    const ta = document.getElementById("prompt-in");
    ta.value = ta.value.replace(/#[^\s#]*$/, "");
    document.getElementById("hash-popup")?.classList.remove("open");
    haptic("ok");
    if (kind === "ctx") {
      S.activeContextId = id;
      const chat = S.chats.find(c => c.id === S.activeChatId);
      if (chat) chat.contextId = id;
      renderTopContextPill();
      showToast("Đã gắn hồ sơ boi-canh.md vào phiên chat", "ok");
    } else if (kind === "nb") {
      S.activeNbId = id;
      renderNbList(); renderChips();
      showToast("Đã gắn Sổ ghi chú vào phiên chat", "ok");
    } else if (kind === "lib") {
      const it = S.library.find(x => x.id === id);
      if (it?.type === "media" && it.data) {
        S.atts.push({ id: "lib-" + Date.now(), type: "image", name: it.title || "lib.png", dataUrl: it.data, origDataUrl: it.data });
      } else if (it?.data) {
        S.atts.push({ id: "lib-" + Date.now(), type: "file", name: it.title || "doc.txt", text: String(it.data).slice(0, 20000) });
      }
      renderChips(); updateOrbButton();
      showToast(`Đã đính kèm "${it?.title || "mục thư viện"}"`, "ok");
    }
    ta.focus();
  };

  // Full-Text Search in Sidebar (Title + Message Contents + Jump to Matched Message!)
  window.renderChatsList = function () {
    const qRaw = (document.getElementById("sb-search")?.value || "").trim();
    const q = qRaw.toLowerCase();
    let items = [...S.chats];
    if (S.filter === "pinned") items = items.filter(c => c.pinned);
    if (S.filter === "task") items = items.filter(c => c.mode === "task");

    const matchedMap = new Map();
    if (q) {
      items = items.filter(c => {
        if ((c.title || "").toLowerCase().includes(q)) return true;
        const hitMsg = (c.messages || []).find(m => (m.text || "").toLowerCase().includes(q));
        if (hitMsg) {
          const pos = hitMsg.text.toLowerCase().indexOf(q);
          const sn = hitMsg.text.slice(Math.max(0, pos - 24), pos + 64).replace(/\s+/g, " ");
          matchedMap.set(c.id, { msgId: hitMsg.id, snippet: sn });
          return true;
        }
        return false;
      });
    }

    items.sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || ((b.updatedAt || 0) - (a.updatedAt || 0)));
    document.getElementById("sb-chats-list").innerHTML = items.map((c, idx) => {
      const hit = matchedMap.get(c.id);
      return `<div class="chat-item stagger-item ${c.id===S.activeChatId?"active":""}" style="--stagger-i:${idx};${hit?"align-items:flex-start;padding-top:8px;padding-bottom:8px;":""}" onclick="openChatWithJump('${c.id}','${hit?hit.msgId:""}')">
        <div style="flex:1;min-width:0;">
          <div class="chat-item-title">${esc(c.title)}</div>
          ${hit ? `<div class="search-snippet">...${esc(hit.snippet)}...</div>` : ""}
        </div>
        <button type="button" class="mini-act tap ${c.pinned?"pinned":""}" onclick="event.stopPropagation();pinChat('${c.id}')" aria-label="Ghim">${ICON_PIN}</button>
        <button type="button" class="mini-act tap" onclick="event.stopPropagation();delChat('${c.id}')" aria-label="Xóa">${ICON_X}</button>
      </div>`;
    }).join("") || `<div style="padding:8px 12px;font-size:12.5px;color:var(--ink-3);">Không tìm thấy đoạn chat nào</div>`;
  };

  window.openChatWithJump = function (chatId, msgId) {
    saveCurrentDraft();
    openChat(chatId);
    restoreCurrentDraft();
    if (msgId) {
      setTimeout(() => {
        const el = document.querySelector(`[data-msg-id="${msgId}"]`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 120);
    }
  };

  // N4: Prompt Templates Library
  const STARTER_PROMPTS = [
    { id: "pm-trading", title: "Soi Chart Đa Khung + Kèo", body: "Phân tích biểu đồ {{cặp tiền}} khung {{khung thời gian}} đính kèm theo Price Action + Thanh khoản (OB/FVG/CRT). Chỉ rõ vùng quét thanh khoản, kịch bản chính/phụ và xuất Thẻ Kèo chuẩn." },
    { id: "pm-pine", title: "Viết / Sửa Pine Script v5", body: "Viết chỉ báo TradingView Pine Script v5 cho chiến lược {{tên chiến lược}} trên khung {{khung giờ}}. Đảm bảo không repaint, có bảng thống kê gọn và cảnh báo alertcondition()." },
    { id: "pm-van12", title: "Dàn ý Văn 12 Thực chiến", body: "Lập dàn ý ngắn gọn, sắc sảo chuẩn barem chấm thi Ngữ văn 12 cho đề bài: {{đề bài}}. Tránh văn phong máy móc." },
    { id: "pm-code-plan", title: "Kế hoạch Code Sạch", body: "/plan Thiết kế và lập kế hoạch triển khai tính năng {{tên tính năng}} trong dự án {{tên dự án}}, chỉ rõ các file cần chạm và rủi ro." }
  ];

  async function ensureStarterPrompts() {
    S.prompts = await dbAll("prompts");
    if (!S.prompts.length) {
      for (const p of STARTER_PROMPTS) { await dbPut("prompts", p); S.prompts.push(p); }
    }
    renderHeroPrompts();
  }

  window.renderHeroPrompts = function () {
    const el = document.getElementById("hero-prompts-strip");
    if (!el) return;
    el.innerHTML = (S.prompts || []).slice(0, 4).map(p =>
      `<button type="button" class="hero-prompt-pill tap" onclick="usePromptTemplate('${p.id}')">${esc(p.title)}</button>`
    ).join("") + `<button type="button" class="hero-prompt-pill tap" onclick="openPromptLibraryModal()">+ Kho Prompt</button>`;
  };

  window.openPromptLibraryModal = function (filterQ = "") {
    haptic("tap");
    const q = String(filterQ || "").toLowerCase();
    const list = (S.prompts || []).filter(p => !q || p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q));
    openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:4px;">Kho Prompt mẫu (/p)</h3>
      <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:10px;">Chạm để nạp nhanh câu lệnh (hỗ trợ biến <code>{{tên biến}}</code> tự hiện ô điền).</p>
      <div style="max-height:52dvh;overflow-y:auto;">
        ${list.map(p => `<div class="card-item lg-card" style="padding:10px 12px;margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
            <strong style="font-size:14px;">${esc(p.title)}</strong>
            <div style="display:flex;gap:4px;">
              <button type="button" class="btn-p tap" style="height:30px;padding:0 12px;font-size:12px;" onclick="closeModal();usePromptTemplate('${p.id}')">Dùng</button>
              <button type="button" class="mini-act tap" onclick="openPromptEditorModal('${p.id}')">${ICON_EDIT}</button>
              <button type="button" class="mini-act tap" onclick="deletePromptTemplate('${p.id}')">${ICON_X}</button>
            </div>
          </div>
          <div style="font-size:12px;color:var(--ink-2);margin-top:4px;white-space:pre-line;">${esc(p.body.slice(0, 140))}${p.body.length > 140 ? "..." : ""}</div>
        </div>`).join("") || `<p class="p-sub">Chưa có Prompt mẫu phù hợp.</p>`}
      </div>
      <div style="display:flex;justify-content:space-between;gap:8px;margin-top:12px;">
        <button type="button" class="btn-blue tap" onclick="openPromptEditorModal(null)">+ Tạo mẫu mới</button>
        <button type="button" class="btn-s tap" onclick="closeModal()">Đóng</button>
      </div>`);
  };

  window.openPromptEditorModal = function (id) {
    const p = id ? S.prompts.find(x => x.id === id) : null;
    openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:6px;">${p ? "Sửa Prompt mẫu" : "Tạo Prompt mẫu mới"}</h3>
      <label class="f-lbl">Tiêu đề ngắn</label><input id="pm-t" class="field" value="${esc(p?.title || "")}" placeholder="VD: Phân tích kèo XAUUSD" />
      <label class="f-lbl">Nội dung (dùng {{biến}} để điền nhanh khi gọi)</label>
      <textarea id="pm-b" class="field" rows="6" placeholder="VD: Phân tích {{cặp tiền}} khung {{khung giờ}}...">${esc(p?.body || "")}</textarea>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
        <button type="button" class="btn-s tap" onclick="openPromptLibraryModal()">Quay lại</button>
        <button type="button" class="btn-p tap" onclick="savePromptTemplate('${p?.id || ""}')">Lưu mẫu</button>
      </div>`);
  };

  window.savePromptTemplate = async function (id) {
    const title = document.getElementById("pm-t")?.value.trim();
    const body = document.getElementById("pm-b")?.value.trim();
    if (!title || !body) return showToast("Nhập đủ Tiêu đề và Nội dung", "warn");
    const obj = { id: id || ("pm-" + Date.now()), title, body, updatedAt: Date.now() };
    await dbPut("prompts", obj);
    apiFetch("/sync/prompts", { method: "POST", body: obj }).catch(() => {});
    S.prompts = await dbAll("prompts");
    renderHeroPrompts(); haptic("ok"); openPromptLibraryModal();
  };

  window.deletePromptTemplate = async function (id) {
    await dbDel("prompts", id);
    apiFetch("/sync/prompts/" + encodeURIComponent(id), { method: "DELETE" }).catch(() => {});
    S.prompts = S.prompts.filter(x => x.id !== id);
    renderHeroPrompts(); openPromptLibraryModal();
  };

  window.usePromptTemplate = function (id) {
    const p = S.prompts.find(x => x.id === id); if (!p) return;
    const vars = [...new Set([...p.body.matchAll(/\{\{([^}]+)\}\}/g)].map(m => m[1].trim()))];
    if (!vars.length) {
      const ta = document.getElementById("prompt-in");
      ta.value = p.body; autoGrow(); updateOrbButton(); ta.focus();
      return;
    }
    window.__ACTIVE_PROMPT_TPL__ = p;
    openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:6px;">${esc(p.title)}</h3>
      ${vars.map((v, i) => `<label class="f-lbl">${esc(v)}</label><input id="pv-${i}" class="field" placeholder="Nhập ${esc(v)}..." />`).join("")}
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
        <button type="button" class="btn-s tap" onclick="closeModal()">Hủy</button>
        <button type="button" class="btn-p tap" onclick="applyPromptTemplateVars(${vars.length})">Nạp vào ô chat</button>
      </div>`);
  };

  window.applyPromptTemplateVars = function (cnt) {
    const p = window.__ACTIVE_PROMPT_TPL__; if (!p) return;
    const vars = [...new Set([...p.body.matchAll(/\{\{([^}]+)\}\}/g)].map(m => m[1].trim()))];
    let out = p.body;
    vars.forEach((v, i) => {
      const val = document.getElementById("pv-" + i)?.value.trim() || v;
      out = out.split(`{{${v}}}`).join(val);
    });
    closeModal();
    const ta = document.getElementById("prompt-in");
    ta.value = out; autoGrow(); updateOrbButton(); ta.focus();
    haptic("ok");
  };

  /* =========================================================================
     5. TEAMS UPGRADE: MULTIMODAL VISION + LIVE boi-canh.md SYNC + CONFLICT DEBATE + 1-TAP PRESETS (2AB + 6A)
     ========================================================================= */
  window.TRADING_SIGNAL_DIRECTIVE = `THẺ KÈO GIAO DỊCH TƯƠNG TÁC (apiai-signal): Nếu bạn đưa ra kế hoạch vào lệnh/phân tích kèo cụ thể (Forex, Vàng XAUUSD, Crypto BTC, Chỉ số US100...), ngoài phần giải thích rõ cấu trúc thị trường & thanh khoản, hãy xuất thêm ĐÚNG 1 khối JSON chuẩn đặt trong ${"`".repeat(3)}apiai-signal ... ${"`".repeat(3)} để ứng dụng hiển thị Thẻ Kèo có máy tính Lot tự động:
{"pair":"XAUUSD","direction":"BUY hoặc SELL","timeframe":"M15/H1","entry":"2650.5 - 2652.0","sl":"2645.0","slPips":55,"tp1":"2662.0","tp2":"2672.0","rr":"1:2.5","confidence":"72%","assetType":"gold","reason":"Quét thanh khoản đáy phiên Á + FVG M15","invalidation":"Đóng nến M15 dưới 2644.5"} (assetType nhận: "forex", "gold", "crypto", "index").`;

  window.shouldInjectTradingSignalDirective = function (query, hasImgs) {
    const q = String(query || "").toLowerCase();
    return /(xauusd|btcusdt|eurusd|gbpusd|us100|nas100|entry|stoploss|stop loss|take profit|r:r|order block|fvg|wyckoff|msnr|crt|tradingview|biểu đồ nến|kèo buy|kèo sell|lệnh trade|phân tích chart)/i.test(q)
      || (hasImgs && /(nến|chart|kèo|buy|sell|trade|giá|vàng|gold|btc)/i.test(q));
  };

  const TEAM_PRESETS = [
    {
      key: "trading",
      name: "Team Trading Đa Khung (Vision)",
      desc: "Soi ảnh biểu đồ đa khung HTF/LTF → Phản biện bẫy thanh khoản → Chốt Thẻ Kèo + Lot Size",
      coordMode: "sequential",
      visionMode: "all",
      liveContextSync: true,
      conflictDebate: true,
      pauseAfterFirst: false,
      maxFixLoops: 0,
      members: [
        { id: "htf", role: "1. Cấu trúc HTF & Thanh khoản", prompt: "Đọc kỹ các ảnh biểu đồ đính kèm: xác định xu hướng khung lớn (H4/H1/M15), vùng thanh khoản đỉnh/đáy (BSL/SSL), cấu trúc BOS/CHoCH và vùng cung cầu chính.", modelId: "gpt-6.2-sol", enabled: true, receiveImages: true, files: [] },
        { id: "ltf", role: "2. Chuyên gia Entry (SMC/CRT/MSNR)", prompt: "Dựa trên cấu trúc HTF và ảnh biểu đồ, tìm điểm vào lệnh tối ưu (Order Block, FVG, CRT, MSNR), xác định vùng Entry, SL và các mốc TP hợp lý.", modelId: "gpt-6.2-astra", enabled: true, receiveImages: true, files: [] },
        { id: "devil", role: "3. Phản biện & Soi bẫy giá", prompt: "Đóng vai phe đối lập: tìm mọi lý do khiến kèo trên có thể bị quét SL (tin mạnh, bẫy thanh khoản, phân kỳ, vùng cản đối diện). Nếu thấy kịch bản sai lệch rõ rệt, ghi rõ STATUS: CONFLICT và lập luận ngược lại.", modelId: "gpt-6.2-astra", enabled: true, receiveImages: true, files: [] },
        { id: "risk", role: "4. Quản trị vốn & Chốt Thẻ Kèo", prompt: "Tổng hợp phân tích & phản biện, chốt kèo xác suất cao nhất (hoặc khuyên ĐỨNG NGOÀI nếu rủi ro cao). BẮT BUỘC xuất kèm khối ```apiai-signal ... ``` đúng định dạng JSON chuẩn để hiện máy tính Lot.", modelId: "gpt-6.2-sol", enabled: true, receiveImages: false, files: [] }
      ]
    },
    {
      key: "data_audit",
      name: "Team Kiểm Dữ Liệu & Bảng Tính",
      desc: "Chuyên kiểm chéo số liệu Excel/CSV/ảnh bảng tính và đối chất sai lệch cột (kiểu video 2)",
      coordMode: "council",
      visionMode: "smart",
      liveContextSync: true,
      conflictDebate: true,
      pauseAfterFirst: false,
      maxFixLoops: 0,
      members: [
        { id: "aud1", role: "Kiểm toán viên A (Soi công thức)", prompt: "Kiểm tra chi tiết từng cột/dòng dữ liệu, đối chiếu công thức cộng/tỷ lệ và liệt kê rõ dòng/cột nào nghi ngờ sai lệch.", modelId: "gpt-6.2-astra", enabled: true, receiveImages: true, files: [] },
        { id: "aud2", role: "Kiểm toán viên B (Đối chiếu độc lập)", prompt: "Đọc độc lập dữ liệu gốc & boi-canh.md, tính lại kết quả từ đầu. Nếu khác nhận định của người khác, ghi rõ STATUS: CONFLICT kèm dẫn chứng số liệu.", modelId: "gpt-6.2-sol", enabled: true, receiveImages: true, files: [] },
        { id: "lead", role: "Trưởng nhóm Chốt Báo Cáo", prompt: "Đối chiếu kết quả của A và B, giải quyết mọi mâu thuẫn bằng phép tính chứng minh rõ ràng, xuất bảng kết luận cuối cùng.", modelId: "gpt-6.2-astra", enabled: true, receiveImages: false, files: [] }
      ]
    },
    {
      key: "strategy",
      name: "Team Nghiên Cứu & Chiến Lược",
      desc: "Hội đồng đa góc nhìn phân tích kế hoạch, phản biện rủi ro và chốt lộ trình thực thi",
      coordMode: "council",
      visionMode: "smart",
      liveContextSync: true,
      conflictDebate: true,
      pauseAfterFirst: false,
      maxFixLoops: 0,
      members: [
        { id: "res", role: "Nhà Nghiên Cứu", prompt: "Thu thập dữ kiện, phân tích thị trường/bối cảnh sâu sắc có dẫn chứng cụ thể.", modelId: "gpt-6.2-sol", enabled: true, receiveImages: true, files: [] },
        { id: "crit", role: "Chuyên Gia Phản Biện", prompt: "Chỉ ra điểm yếu, chi phí ẩn và rủi ro thất bại của kế hoạch. Nếu thấy hướng đi sai lầm, nêu rõ STATUS: CONFLICT.", modelId: "gpt-6.2-astra", enabled: true, receiveImages: false, files: [] },
        { id: "ceo", role: "Giám Đốc Tổng Hợp", prompt: "Chốt phương án hành động sắc bén nhất với lộ trình bước 1-2-3 rõ ràng.", modelId: "gpt-6.2-astra", enabled: true, receiveImages: false, files: [] }
      ]
    }
  ];

  window.applyTeamPresetDraft = function (key) {
    const p = TEAM_PRESETS.find(x => x.key === key);
    if (!p) return;
    const mods = getAllowedRealModels();
    const fallbackId = mods[0]?.id || "gpt-6.2-sol";
    teamDraft = {
      id: "team-" + Date.now(),
      builtin: false,
      ...JSON.parse(JSON.stringify(p)),
      members: p.members.map(m => ({
        ...m,
        modelId: mods.some(x => x.id === m.modelId) ? m.modelId : fallbackId
      }))
    };
    haptic("ok");
    renderTeamEditorBody();
    showToast(`Đã nạp mẫu "${p.name}" · Bấm Lưu Team để dùng ngay`, "ok");
  };

  // Upgraded Team Editor with 1-Tap Presets, Vision Mode, Per-Member Receive Images, Live boi-canh.md & Conflict Debate
  window.renderTeamEditorBody = function () {
    const box = document.getElementById("team-editor-body");
    if (!box || !teamDraft) return;
    const mods = getAllowedRealModels();
    const fallbackId = mods[0]?.id || "gpt-6.2-sol";
    if (!teamDraft.visionMode) teamDraft.visionMode = "smart";
    if (teamDraft.liveContextSync === undefined) teamDraft.liveContextSync = true;
    if (teamDraft.conflictDebate === undefined) teamDraft.conflictDebate = true;

    const presetBar = !teamDraft.builtin ? `<div style="margin-bottom:10px;">
      <div style="font-size:12.5px;color:var(--ink-2);margin-bottom:6px;font-weight:500;">Mẫu Đội ngũ 1 chạm (Preset):</div>
      <div class="preset-grid">
        ${TEAM_PRESETS.map(p => `<button type="button" class="preset-btn tap-soft" onclick="applyTeamPresetDraft('${p.key}')">
          <strong style="font-size:13px;color:var(--ink);">${esc(p.name)}</strong>
          <span style="font-size:11.5px;color:var(--ink-3);line-height:1.4;">${esc(p.desc)}</span>
        </button>`).join("")}
      </div>
    </div>` : "";

    box.innerHTML = presetBar + `<div class="card-item lg-card">
      <h3 style="font-size:17px;font-weight:520;margin-bottom:4px;">${teamDraft.builtin ? "Cấu hình Team Lập trình 4-Agent" : "Thiết lập Đội ngũ AI (2–6 thành viên)"}</h3>
      <label class="f-lbl">Tên Đội ngũ</label>
      <input id="te-name" class="field" value="${esc(teamDraft.name)}" ${teamDraft.builtin?"readonly":""} placeholder="VD: Team Trading Đa Khung" oninput="teamDraft.name=this.value" />
      <label class="f-lbl">Mô tả mục tiêu chung</label>
      <input id="te-desc" class="field" value="${esc(teamDraft.desc)}" placeholder="Mô tả nhiệm vụ chính của đội ngũ" oninput="teamDraft.desc=this.value" />

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div>
          <label class="f-lbl">Kiểu phối hợp nhóm</label>
          <select class="field" onchange="teamDraft.coordMode=this.value">
            <option value="sequential" ${teamDraft.coordMode!=="council"?"selected":""}>Dây chuyền nối tiếp (1→2→3...)</option>
            <option value="council" ${teamDraft.coordMode==="council"?"selected":""}>Hội đồng thảo luận (Độc lập + Tổng hợp)</option>
          </select>
        </div>
        <div>
          <label class="f-lbl">Chế độ nhận ảnh (Vision)</label>
          <select class="field" onchange="setTeamVisionModeDraft(this.value)">
            <option value="smart" ${teamDraft.visionMode!=="all"?"selected":""}>Tiết kiệm (Thành viên 1–2 xem ảnh)</option>
            <option value="all" ${teamDraft.visionMode==="all"?"selected":""}>Đa góc nhìn (Cả Team cùng xem ảnh)</option>
          </select>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div>
          <label class="f-lbl">Tự vá lỗi (khi bước cuối FAIL)</label>
          <select class="field" onchange="teamDraft.maxFixLoops=Number(this.value)">
            <option value="0" ${!teamDraft.maxFixLoops?"selected":""}>Tắt</option>
            <option value="1" ${teamDraft.maxFixLoops===1?"selected":""}>Tối đa 1 vòng</option>
            <option value="2" ${teamDraft.maxFixLoops===2?"selected":""}>Tối đa 2 vòng</option>
          </select>
        </div>
        <div>
          <label class="f-lbl">Hồ sơ boi-canh.md khóa cứng</label>
          <select class="field" onchange="teamDraft.contextId=this.value||null">
            <option value="">Tự động theo phiên chat</option>
            ${S.contexts.map(c => `<option value="${esc(c.id)}" ${teamDraft.contextId===c.id?"selected":""}>${esc(c.title)}</option>`).join("")}
          </select>
        </div>
      </div>

      <div class="s-row" style="margin-top:6px;" onclick="teamDraft.liveContextSync=!teamDraft.liveContextSync;this.querySelector('.sw').classList.toggle('on',teamDraft.liveContextSync);haptic('switch')">
        <span>Tự đồng bộ boi-canh.md sống giữa từng bước (không cần copy tay)</span>
        <div class="sw ${teamDraft.liveContextSync?"on":""}"></div>
      </div>
      <div class="s-row" onclick="teamDraft.conflictDebate=!teamDraft.conflictDebate;this.querySelector('.sw').classList.toggle('on',teamDraft.conflictDebate);haptic('switch')">
        <span>Tự phát hiện &amp; Đối chất 1 vòng khi 2 AI mâu thuẫn</span>
        <div class="sw ${teamDraft.conflictDebate?"on":""}"></div>
      </div>
      <div class="s-row" onclick="teamDraft.pauseAfterFirst=!teamDraft.pauseAfterFirst;this.querySelector('.sw').classList.toggle('on',teamDraft.pauseAfterFirst);haptic('switch')">
        <span>Dừng duyệt kết quả sau Thành viên 1</span>
        <div class="sw ${teamDraft.pauseAfterFirst?"on":""}"></div>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin:12px 0 8px;">
      <strong style="font-size:14.5px;" class="num">Danh sách Thành viên (${teamDraft.members.length}/6)</strong>
      ${!teamDraft.builtin && teamDraft.members.length < 6 ? `<button type="button" class="btn-blue tap" style="height:34px;font-size:12.5px;" onclick="addTeamMemberDraft()">+ Thêm thành viên</button>` : ""}
    </div>

    ${teamDraft.members.map((m, idx) => {
      if (!mods.some(x => x.id === m.modelId)) m.modelId = fallbackId;
      const recvImg = m.receiveImages !== undefined ? m.receiveImages : (teamDraft.visionMode === "all" || idx < 2);
      m.receiveImages = recvImg;
      return `<div class="member-editor-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
          <label style="display:inline-flex;align-items:center;gap:8px;font-size:13.5px;font-weight:520;">
            <input type="checkbox" ${m.enabled!==false?"checked":""} onchange="teamDraft.members[${idx}].enabled=this.checked" style="width:16px;height:16px;accent-color:var(--accent);" />
            <span>Thành viên ${idx + 1}</span>
          </label>
          <div style="display:flex;gap:8px;align-items:center;">
            <label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--accent-ink);cursor:pointer;">
              <input type="checkbox" ${recvImg?"checked":""} onchange="teamDraft.members[${idx}].receiveImages=this.checked" style="width:15px;height:15px;accent-color:var(--accent);" />
              <span>Nhận ảnh</span>
            </label>
            <button type="button" class="btn-s tap" style="height:30px;padding:0 10px;font-size:12px;" onclick="triggerMemberFilePick(${idx})">+ File</button>
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
  };

  window.setTeamVisionModeDraft = function (mode) {
    if (!teamDraft) return;
    teamDraft.visionMode = mode;
    teamDraft.members.forEach((m, i) => { m.receiveImages = (mode === "all" || i < 2); });
    renderTeamEditorBody();
  };

  function detectMemberConflict(texts) {
    if (!Array.isArray(texts) || texts.length < 2) return false;
    const joined = texts.join("\n");
    if (/STATUS\s*:\s*CONFLICT/i.test(joined)) return true;
    const a = texts[texts.length - 2] || "", b = texts[texts.length - 1] || "";
    const aBuy = /\b(BUY|MUA|LONG)\b/i.test(a) && !/\b(SELL|BÁN|SHORT)\b/i.test(a.slice(0, 350));
    const bSell = /\b(SELL|BÁN|SHORT)\b/i.test(b) && !/\b(BUY|MUA|LONG)\b/i.test(b.slice(0, 350));
    const aSell = /\b(SELL|BÁN|SHORT)\b/i.test(a) && !/\b(BUY|MUA|LONG)\b/i.test(a.slice(0, 350));
    const bBuy = /\b(BUY|MUA|LONG)\b/i.test(b) && !/\b(SELL|BÁN|SHORT)\b/i.test(b.slice(0, 350));
    if ((aBuy && bSell) || (aSell && bBuy)) return true;
    if (/(sai lệch|không khớp|mâu thuẫn|trái ngược|phản bác)/i.test(b)) return true;
    return false;
  }

  async function liveAppendToTeamContext(chat, team, roleName, stepOutput) {
    const cid = team.contextId || chat.contextId || S.activeContextId;
    if (!cid) return;
    const ctx = S.contexts.find(x => x.id === cid);
    if (!ctx) return;
    try {
      const stamp = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      const r = await apiFetch("/ai/digest", {
        method: "POST",
        body: {
          digestMode: "merge_context",
          readerModelId: S.cfg.repoReaderModel || "gpt-6.2-sol",
          instruction: `Cập nhật boi-canh.md với kết quả mới nhất từ "${roleName}" lúc ${stamp}. Giữ ngắn gọn dưới 650 từ.`,
          content: `=== BOI-CANH.MD HIỆN TẠI ===\n${ctx.content}\n\n=== CẬP NHẬT TỪ ${roleName} (${stamp}) ===\n${stepOutput.slice(0, 5000)}`
        }
      });
      if (r.ok) {
        const d = await r.json();
        if (d.digest) {
          ctx.history = [{ ts: ctx.updatedAt || Date.now(), content: ctx.content }, ...(ctx.history || [])].slice(0, 5);
          ctx.content = d.digest;
          ctx.updatedAt = Date.now();
          await dbPut("contexts", ctx);
          apiFetch("/sync/contexts", { method: "POST", body: ctx }).catch(() => {});
        }
      }
    } catch {}
  }

  // Upgraded Multimodal Team Pipeline (2AB + Live boi-canh.md + Conflict Debate)
  window.runTeamPipeline = async function (chat, team, userPrompt, resumeMsg = null, startAtIdx = 0, sentAtts = []) {
    if (!canUseTeams()) return showToast("Đội ngũ AI yêu cầu Key hạng Pro Max trở lên", "warn");
    const activeMembers = (team.members || []).filter(m => m.enabled !== false);
    if (!activeMembers.length) return showToast("Team chưa bật thành viên nào", "warn");

    const allAtts = Array.isArray(sentAtts) && sentAtts.length
      ? sentAtts
      : (chat.messages.filter(x => x.role === "user").slice(-1)[0]?.atts || []);
    const imgAtts = allAtts.filter(a => a && a.dataUrl);
    const docAtts = allAtts.filter(a => a && a.type === "file" && a.text);
    const docAppendix = docAtts.length
      ? "\n\nTỆP ĐÍNH KÈM NGƯỜI DÙNG GỬI:\n" + docAtts.map(d => `[${d.name}]\n${d.text.slice(0, 8000)}`).join("\n\n")
      : "";

    let aiMsg = resumeMsg;
    if (!aiMsg) {
      aiMsg = {
        id: "m-" + (Date.now() + 1), role: "assistant", text: "",
        modelLabel: `${team.name} (${team.coordMode === "council" ? "Hội đồng" : "Dây chuyền"}${imgAtts.length ? ` · ${imgAtts.length} ảnh` : ""})`,
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
    S.streaming = true; S.abort = new AbortController(); updateOrbButton();
    renderMessages(); scrollToBottom(true);
    bgStartTask(`${team.name} đang làm việc`, `Bắt đầu ${activeMembers.length} thành viên${imgAtts.length ? ` · ${imgAtts.length} ảnh` : ""}...`);

    const runMemberStep = async (mem, stepNum, contentIn, passImages, customStatus = "running") => {
      const modObj = S.models.find(m => m.id === mem.modelId && m.allowed) || getAllowedRealModels()[0];
      const modId = modObj?.id || S.cfg.selectedModel;
      const filesTxt = (mem.files || []).length
        ? "\n\nTÀI LIỆU RIÊNG CỦA VAI TRÒ NÀY:\n" + mem.files.map(f => `[${f.name}]\n${f.digest || f.content.slice(0, 3200)}`).join("\n\n")
        : "";
      const ctxObj = S.contexts.find(c => c.id === (team.contextId || chat.contextId || S.activeContextId));
      const sharedCtxBlock = ctxObj?.content ? `\n\nHỒ SƠ NGỮ CẢNH SỐNG (${ctxObj.title} — NGUỒN SỰ THẬT DUY NHẤT):\n${ctxObj.content.slice(0, 5000)}` : "";
      const visionNote = (passImages && imgAtts.length) ? ` · Vision (${imgAtts.length} ảnh)` : "";
      const tradeDir = (team.name.toLowerCase().includes("trading") || window.shouldInjectTradingSignalDirective(userPrompt, imgAtts.length > 0))
        ? `\n\n${window.TRADING_SIGNAL_DIRECTIVE}` : "";

      const step = {
        id: "st-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        role: mem.id, num: String(stepNum), title: mem.role + visionNote,
        modelLabel: modObj?.short || modId, status: customStatus, text: ""
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
      const fullSys = `Bạn là thành viên "${mem.role}" trong đội ngũ "${team.name}".\nCHỈ DẪN VAI TRÒ: ${mem.prompt}${filesTxt}${sharedCtxBlock}${tradeDir}`;
      const { text, slot } = await callStatelessAgent(chat, modId, mem.id, fullSys, contentIn, full => {
        step.text = full;
        if (!raf) { raf = true; requestAnimationFrame(paint); }
      }, passImages ? imgAtts : []);
      step.text = text;
      step.status = customStatus === "conflict" ? "conflict" : "done";
      if (slot) aiMsg.slot = slot;
      renderMessages(); scrollToBottom(false);
      return text;
    };

    try {
      let lastOutput = pipe.blueprint || "";
      const councilOpinions = [];
      const collectedOutputs = [];
      let debateDone = false;

      for (let i = startAtIdx; i < activeMembers.length; i++) {
        const mem = activeMembers[i];
        const passImages = imgAtts.length > 0 && (mem.receiveImages !== undefined ? Boolean(mem.receiveImages) : (team.visionMode === "all" || i < 2));
        await savePendingTask({ chatId: chat.id, teamId: team.id, teamName: team.name, msgId: aiMsg.id, prompt: pipe.prompt, nextIdx: i });

        let inputTxt = "";
        if (team.coordMode === "council") {
          const isChair = i === activeMembers.length - 1 && activeMembers.length >= 2;
          if (isChair && team.conflictDebate !== false && !debateDone && detectMemberConflict(collectedOutputs)) {
            debateDone = true;
            await runMemberStep(
              { id: "debate", role: "Đối chất xung đột (Cross-Check)", prompt: "Phát hiện nhận định trái ngược giữa các thành viên. Hãy đối chất trực diện từng điểm mâu thuẫn bằng bằng chứng cụ thể từ dữ liệu/ảnh và boi-canh.md, chỉ rõ ai đúng/ai sai ở từng chi tiết.", modelId: mem.modelId, files: [] },
              "⚡",
              `YÊU CẦU GỐC:\n${pipe.prompt}${docAppendix}\n\nCÁC Ý KIẾN ĐANG MÂU THUẪN:\n${councilOpinions.join("\n\n")}`,
              imgAtts.length > 0,
              "conflict"
            );
          }
          inputTxt = isChair
            ? `YÊU CẦU GỐC:\n${pipe.prompt}${docAppendix}\n\nÝ KIẾN CÁC THÀNH VIÊN & ĐỐI CHẤT:\n${pipe.steps.filter(s => s.status === "done" || s.status === "conflict").map(s => `### ${s.title}\n${s.text.slice(0, 4200)}`).join("\n\n")}\n\nNHIỆM VỤ CHỦ TỌA: Chốt phương án chuẩn nhất dựa trên đối chất và bằng chứng.`
            : `YÊU CẦU GỐC:\n${pipe.prompt}${docAppendix}\n\nHãy phân tích độc lập từ đúng góc nhìn chuyên môn "${mem.role}".`;
        } else {
          inputTxt = i === 0
            ? `YÊU CẦU DỰ ÁN:\n${pipe.prompt}${docAppendix}`
            : `YÊU CẦU GỐC:\n${pipe.prompt}${docAppendix}\n\nKẾT QUẢ TỪ CÁC BƯỚC TRƯỚC:\n${pipe.steps.filter(s => s.status === "done" || s.status === "conflict").slice(-2).map(s => `### ${s.title}\n${s.text.slice(0, 5000)}`).join("\n\n")}`;
        }

        const out = await runMemberStep(mem, i + 1, inputTxt, passImages);
        lastOutput = out;
        collectedOutputs.push(out);
        if (i === 0) pipe.blueprint = out;
        if (team.coordMode === "council") councilOpinions.push(`### ${mem.role}\n${out.slice(0, 4200)}`);
        const codeHit = extractBestCodeBlock(out);
        if (codeHit) { pipe.codeOutput = out; pipe.finalCode = codeHit; }

        // Live Auto-Sync boi-canh.md between steps (eliminates pigeon-carrier copying from video 2!)
        if (team.liveContextSync !== false && i < activeMembers.length - 1 && (team.contextId || chat.contextId || S.activeContextId)) {
          await liveAppendToTeamContext(chat, team, mem.role, out);
        }

        // Sequential conflict debate trigger before final step
        if (team.coordMode !== "council" && team.conflictDebate !== false && !debateDone && i === activeMembers.length - 2 && detectMemberConflict(collectedOutputs)) {
          debateDone = true;
          await runMemberStep(
            { id: "debate", role: "Đối chất xung đột (Cross-Check)", prompt: "Phát hiện phản biện trái chiều giữa các bước trước. Hãy đối chiếu bằng chứng từ ảnh/dữ liệu và boi-canh.md để phân xử rõ ràng trước khi thành viên cuối chốt.", modelId: mem.modelId, files: [] },
            "⚡",
            `YÊU CẦU GỐC:\n${pipe.prompt}\n\n2 BƯỚC ĐANG MÂU THUẪN:\n${collectedOutputs.slice(-2).join("\n\n---\n\n")}`,
            imgAtts.length > 0,
            "conflict"
          );
        }

        if (i === 0 && team.pauseAfterFirst && activeMembers.length > 1 && !resumeMsg) {
          pipe.awaitingApproval = true;
          aiMsg.streaming = false; S.streaming = false; S.abort = null;
          bgStopTask(); await savePendingTask(null);
          await dbPut("chats", chat).catch(() => {});
          apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {});
          renderMessages(); updateOrbButton();
          showToast("Bước 1 đã xong · Kiểm tra rồi bấm Duyệt & Chạy tiếp");
          return;
        }

        if (i === activeMembers.length - 1 && Number(team.maxFixLoops || 0) > 0 && /STATUS\s*:\s*FAIL/i.test(out.slice(0, 260))) {
          const coderMem = activeMembers.find(x => x.id === "coder") || activeMembers[Math.max(0, activeMembers.length - 2)];
          const maxL = Math.min(2, Number(team.maxFixLoops || 1));
          let failReport = out;
          for (let loop = 1; loop <= maxL; loop++) {
            pipe.steps[pipe.steps.length - 1].status = "fail";
            const fixed = await runMemberStep(coderMem, `${i}.${loop}`, `SỬA LỖI VÒNG ${loop} DỰA TRÊN BÁO CÁO:\n${failReport}\n\nBẢN CŨ:\n${pipe.codeOutput || lastOutput}`, false);
            pipe.codeOutput = fixed; lastOutput = fixed;
            pipe.finalCode = extractBestCodeBlock(fixed) || pipe.finalCode;
            failReport = await runMemberStep(mem, `${i + 1}.${loop}`, `KIỂM TRA LẠI SAU KHI VÁ LỖI VÒNG ${loop}:\n${fixed}`, false);
            if (!/STATUS\s*:\s*FAIL/i.test(failReport.slice(0, 260))) break;
          }
        }
      }

      aiMsg.text = pipe.codeOutput || lastOutput || "Đội ngũ đã hoàn tất.";
      await savePendingTask(null);
      if ((team.liveContextSync !== false || team.autoSyncContext) && (team.contextId || chat.contextId || S.activeContextId)) {
        liveAppendToTeamContext(chat, team, `${team.name} (Chốt)`, aiMsg.text).catch(() => {});
      }
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
      dbPut("chats", chat).catch(() => {});
      apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {});
      syncAccountUI(); renderMessages(); renderMemoryBar(); updateOrbButton();
    }
  };

  // Tool: Gộp nhiều ghi chú/tệp rác -> ĐÚNG 1 file boi-canh.md duy nhất (video_2.mp4!)
  window.openMergeTrashToContextModal = function () {
    haptic("tap");
    const items = [
      ...(S.contexts || []).map(c => ({ kind: "ctx", id: c.id, title: `[Context] ${c.title}`, content: c.content || "" })),
      ...(S.notebooks || []).map(n => ({ kind: "nb", id: n.id, title: `[Sổ ghi chú] ${n.title}`, content: n.notes || "" }))
    ];
    if (items.length < 2) return showToast("Cần ít nhất 2 hồ sơ ngữ cảnh hoặc sổ ghi chú để gộp thành 1 file duy nhất", "warn");
    window.__MERGE_SRC_ITEMS__ = items;
    openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:4px;">Gộp nhiều ghi chú → 1 boi-canh.md</h3>
      <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:10px;">Chọn các ghi chú rời rạc (hoặc mâu thuẫn) để AI hợp nhất thành 1 file nguồn sự thật sạch duy nhất.</p>
      <div style="max-height:46dvh;overflow-y:auto;">
        ${items.map((it, i) => `<label class="model-check-row"><span style="font-size:13px;">${esc(it.title)}</span><input type="checkbox" class="mg-chk" value="${i}" checked /></label>`).join("")}
      </div>
      <label class="f-lbl">Tên file sau khi gộp</label>
      <input id="mg-out-name" class="field" style="font-family:var(--font-mono);" value="boi-canh-chuan.md" />
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
        <button type="button" class="btn-s tap" onclick="closeModal()">Hủy</button>
        <button type="button" class="btn-p tap" onclick="commitMergeTrashToContext()">Gộp thành 1 file</button>
      </div>`);
  };

  window.commitMergeTrashToContext = async function () {
    const idxs = [...document.querySelectorAll(".mg-chk:checked")].map(x => Number(x.value));
    if (idxs.length < 2) return showToast("Chọn ít nhất 2 mục để gộp", "warn");
    const items = window.__MERGE_SRC_ITEMS__ || [];
    const combined = idxs.map(i => `### ${items[i].title}\n${items[i].content.slice(0, 4500)}`).join("\n\n");
    const outName = document.getElementById("mg-out-name")?.value.trim() || "boi-canh-chuan.md";
    closeModal();
    showToast(`Đang gộp ${idxs.length} tài liệu thành ${outName}...`);
    try {
      const r = await apiFetch("/ai/digest", {
        method: "POST",
        body: {
          digestMode: "merge_context",
          readerModelId: S.cfg.repoReaderModel || "gpt-6.2-sol",
          instruction: "Hợp nhất toàn bộ các ghi chú rời rạc này thành ĐÚNG 1 file boi-canh.md duy nhất, ưu tiên dữ liệu mới hơn nếu có mâu thuẫn và loại bỏ thông tin trùng lặp.",
          content: combined.slice(0, 26000)
        }
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gộp thất bại");
      const obj = { id: "ctx-" + Date.now(), title: outName, content: d.digest || "", history: [], updatedAt: Date.now() };
      await dbPut("contexts", obj);
      apiFetch("/sync/contexts", { method: "POST", body: obj }).catch(() => {});
      S.contexts = (await dbAll("contexts")).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      S.activeContextId = obj.id;
      renderTeamsPage(); renderTopContextPill(); haptic("ok");
      showToast(`Đã gộp sạch vào ${outName}!`, "ok");
    } catch (e) { haptic("err"); showToast(e.message, "err"); }
  };

  /* =========================================================================
     6. INTERACTIVE TRADING SIGNAL CARD (apiai-signal) + LOT CALCULATOR + N5 JOURNAL IN LIBRARY
     ========================================================================= */
  const signalPayloadMap = new Map();
  let sigSeq = 0;

  window.renderTradingSignalCard = function (rawJson) {
    let obj = null;
    try { obj = JSON.parse(rawJson.trim()); } catch { return ""; }
    if (!obj || !obj.pair) return "";
    const sid = "sig-" + (++sigSeq);
    signalPayloadMap.set(sid, obj);
    const isBuy = String(obj.direction || "BUY").toUpperCase().includes("BUY") || String(obj.direction || "").toUpperCase().includes("LONG");
    const slPips = Math.max(1, Number(obj.slPips) || 30);
    const assetType = String(obj.assetType || (/xau|gold/i.test(obj.pair) ? "gold" : (/btc|eth|sol/i.test(obj.pair) ? "crypto" : (/us100|nas|us30|spx/i.test(obj.pair) ? "index" : "forex")))).toLowerCase();

    return `<div class="signal-card">
      <div class="signal-head">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <strong style="font-size:16px;font-family:var(--font-mono);">${esc(obj.pair)}</strong>
          <span class="${isBuy ? "sig-dir-buy" : "sig-dir-sell"}">${isBuy ? "BUY / LONG" : "SELL / SHORT"}</span>
          ${obj.timeframe ? `<span class="tag-quiet">${esc(obj.timeframe)}</span>` : ""}
        </div>
        ${obj.confidence ? `<span class="tag-st tier-pro num">Xác suất: ${esc(obj.confidence)}</span>` : ""}
      </div>
      <div class="sig-grid">
        <div class="sig-cell"><div class="sig-lbl">Vùng Entry</div><div class="sig-val">${esc(obj.entry || "-")}</div></div>
        <div class="sig-cell"><div class="sig-lbl">Stop Loss</div><div class="sig-val" style="color:var(--danger-ink);">${esc(obj.sl || "-")} (${slPips}p)</div></div>
        <div class="sig-cell"><div class="sig-lbl">TP1 / TP2</div><div class="sig-val" style="color:var(--ok-ink);">${esc(obj.tp1 || "-")}${obj.tp2 ? ` / ${esc(obj.tp2)}` : ""}</div></div>
        <div class="sig-cell"><div class="sig-lbl">Tỷ lệ R:R</div><div class="sig-val" style="color:var(--accent-ink);">${esc(obj.rr || "1:2")}</div></div>
      </div>
      ${obj.reason ? `<div style="font-size:12.5px;color:var(--ink-2);line-height:1.45;"><b>Cơ sở:</b> ${esc(obj.reason)}${obj.invalidation ? `<br/><b>Hủy kèo:</b> ${esc(obj.invalidation)}` : ""}</div>` : ""}

      <div class="lot-calc-box">
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;">
          <strong style="color:var(--ink);">Máy tính khối lượng Lot</strong>
          <span id="lot-res-${sid}" class="num" style="color:var(--ok-ink);font-weight:600;">—</span>
        </div>
        <div class="lot-calc-grid">
          <div><div class="sig-lbl">Vốn ($)</div><input id="lb-${sid}" type="number" class="lot-in" value="1000" oninput="recalcLotCard('${sid}','${assetType}')" /></div>
          <div><div class="sig-lbl">Rủi ro (%)</div><input id="lr-${sid}" type="number" step="0.25" class="lot-in" value="1" oninput="recalcLotCard('${sid}','${assetType}')" /></div>
          <div><div class="sig-lbl">SL (pips)</div><input id="ls-${sid}" type="number" class="lot-in" value="${slPips}" oninput="recalcLotCard('${sid}','${assetType}')" /></div>
        </div>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button type="button" class="btn-blue tap" style="height:36px;font-size:12.5px;flex:1;" onclick="recalcLotCard('${sid}','${assetType}')">Tính Lot ngay</button>
        <button type="button" class="btn-p tap" style="height:36px;font-size:12.5px;flex:1;" onclick="saveSignalToJournal('${sid}')">Lưu Nhật ký Giao dịch</button>
      </div>
    </div>`;
  };

  window.recalcLotCard = function (sid, assetType) {
    const bal = Math.max(1, Number(document.getElementById("lb-" + sid)?.value || 1000));
    const riskPct = Math.max(0.1, Number(document.getElementById("lr-" + sid)?.value || 1));
    const pips = Math.max(1, Number(document.getElementById("ls-" + sid)?.value || 30));
    const riskUsd = bal * (riskPct / 100);
    // Standard pip value per 1.00 lot: Forex/Gold ~$10/pip (1 pip = 0.1 on XAUUSD), Index/Crypto scaled cleanly
    const pipValPerLot = assetType === "crypto" ? 1 : (assetType === "index" ? 1 : 10);
    const lots = Math.max(0.01, Math.round((riskUsd / (pips * pipValPerLot)) * 100) / 100);
    const out = document.getElementById("lot-res-" + sid);
    if (out) out.textContent = `${lots.toFixed(2)} lot (Rủi ro $${riskUsd.toFixed(1)})`;
  };

  window.saveSignalToJournal = async function (sid) {
    const sig = signalPayloadMap.get(sid);
    if (!sig) return;
    const rrNum = Number(String(sig.rr || "2").split(":").pop()) || 2;
    const entry = {
      id: "jrn-" + Date.now(),
      pair: sig.pair,
      direction: sig.direction || "BUY",
      timeframe: sig.timeframe || "",
      entry: sig.entry || "",
      sl: sig.sl || "",
      tp1: sig.tp1 || "",
      rr: sig.rr || "1:2",
      rrNum,
      reason: sig.reason || "",
      status: "open", // open | win | loss | be
      createdAt: Date.now()
    };
    await dbPut("journal", entry);
    apiFetch("/sync/journal", { method: "POST", body: entry }).catch(() => {});
    S.journal = (await dbAll("journal")).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    haptic("ok"); showToast(`Đã lưu kèo ${entry.pair} vào Nhật ký Giao dịch (Thư viện)`, "ok");
  };

  window.setJournalTradeStatus = async function (id, status) {
    const it = S.journal.find(x => x.id === id); if (!it) return;
    it.status = status;
    await dbPut("journal", it);
    apiFetch("/sync/journal", { method: "POST", body: it }).catch(() => {});
    haptic("switch"); renderLibrary();
  };

  window.deleteJournalTrade = async function (id) {
    await dbDel("journal", id);
    apiFetch("/sync/journal/" + encodeURIComponent(id), { method: "DELETE" }).catch(() => {});
    S.journal = S.journal.filter(x => x.id !== id);
    renderLibrary();
  };

  // Upgrade renderLibrary with Trading Journal KPI & Study Progress summary (N5)
  const _origRenderLibrary = window.renderLibrary;
  window.renderLibrary = function () {
    _origRenderLibrary();
    const box = document.getElementById("lib-body");
    if (!box) return;
    const trades = S.journal || [];
    const closed = trades.filter(t => t.status === "win" || t.status === "loss" || t.status === "be");
    const wins = trades.filter(t => t.status === "win").length;
    const winrate = closed.length ? Math.round((wins / closed.length) * 100) : 0;
    const totalR = trades.reduce((acc, t) => acc + (t.status === "win" ? (Number(t.rrNum) || 2) : (t.status === "loss" ? -1 : 0)), 0);
    const maxStreak = (S.tutors || []).reduce((m, t) => Math.max(m, Number(t.streak || 0)), 0);
    const masteredErr = (S.tutors || []).reduce((a, t) => a + (t.mistakes || []).filter(x => x.mastered).length, 0);

    const jrnHtml = `
      <div style="font-size:13.5px;color:var(--ink-2);margin-bottom:8px;" class="num">Nhật ký Giao dịch &amp; Tiến độ Học tập (${trades.length} kèo)</div>
      <div class="kpi-grid">
        <div class="kpi-card"><div class="kpi-lbl">Winrate</div><div class="kpi-val num" style="color:var(--ok-ink);">${winrate}%</div></div>
        <div class="kpi-card"><div class="kpi-lbl">Tổng hiệu suất</div><div class="kpi-val num" style="color:${totalR>=0?"var(--accent-ink)":"var(--danger-ink)"};">${totalR >= 0 ? "+" : ""}${totalR.toFixed(1)}R</div></div>
        <div class="kpi-card"><div class="kpi-lbl">Chuỗi Gia sư cao nhất</div><div class="kpi-val num">${maxStreak} ngày</div></div>
        <div class="kpi-card"><div class="kpi-lbl">Lỗi học đã thuộc</div><div class="kpi-val num">${masteredErr} lỗi</div></div>
      </div>
      ${trades.slice(0, 12).map(t => `<div class="card-item lg-card" style="padding:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:6px;">
            <strong style="font-family:var(--font-mono);">${esc(t.pair)}</strong>
            <span class="${String(t.direction).toUpperCase().includes("BUY")?"sig-dir-buy":"sig-dir-sell"}" style="padding:1px 7px;font-size:11px;">${esc(t.direction)}</span>
            <span class="tag-quiet num">${esc(t.rr)}</span>
          </div>
          <div style="display:flex;gap:4px;align-items:center;">
            ${[["open","Chạy"],["win","Win"],["loss","Loss"],["be","BE"]].map(([st, lb]) =>
              `<button type="button" class="btn-s tap ${t.status===st?"lg-active":""}" style="height:26px;padding:0 8px;font-size:11px;" onclick="setJournalTradeStatus('${t.id}','${st}')">${lb}</button>`
            ).join("")}
            <button type="button" class="mini-act tap" onclick="deleteJournalTrade('${t.id}')">${ICON_X}</button>
          </div>
        </div>
        <div style="font-size:12px;color:var(--ink-2);margin-top:5px;">Entry: <b class="num">${esc(t.entry)}</b> · SL: <b class="num">${esc(t.sl)}</b> · TP: <b class="num">${esc(t.tp1)}</b></div>
      </div>`).join("")}
      <div class="div-line" style="margin:14px 0;"></div>`;

    box.innerHTML = jrnHtml + box.innerHTML;
  };

  /* =========================================================================
     7. UNIFIED MODEL ADMIN EDITOR (1B + VIP ROUTING + AUTO-FALLBACK ALERTS) + N8 ADMIN PRO PACK
     ========================================================================= */
  window.adminEditModelModal = function (idx) {
    const provs = S.adminData?.config?.providers || [];
    const m = idx !== null && idx !== undefined ? S.adminData.config.models[idx] : null;
    const isEdit = Boolean(m);
    const tierLimits = S.adminData?.config?.tier_limits || {};

    openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:8px;">${isEdit ? "Chỉnh sửa Model & Định tuyến API" : "Thêm Model AI thủ công"}</h3>
      <label class="f-lbl">Tên hiển thị</label><input id="em-title" class="field" value="${esc(m?.title || "")}" placeholder="GPT 6.2 Astra" />
      <label class="f-lbl">Model ID thực gửi API</label><input id="em-map" class="field" value="${esc(m?.mapped || "")}" placeholder="gpt-6.2-astra" ${m?.id === "auto" ? "readonly" : ""} />
      <label class="f-lbl">Mô tả phụ (hiện trên menu chọn model)</label><input id="em-sub" class="field" value="${esc(m?.sub || "")}" placeholder="Lập trình & suy luận sâu · ×2.2" />
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div><label class="f-lbl">Hệ số nhân token (mức × chung)</label><input id="em-mult" type="text" inputmode="decimal" class="field num" value="${esc(String(m?.cost_multiplier ?? 1.2))}" placeholder="1.2 hoặc 2,2" /></div>
        <div><label class="f-lbl">Nhãn phụ (Badge)</label><input id="em-badge" class="field" value="${esc(m?.badge || "")}" placeholder="Phổ biến / Pro Max / Ultra" /></div>
      </div>

      <label class="f-lbl">Nguồn API mặc định (Key Classic / Pro — hoặc dùng chung cho mọi hạng)</label>
      <select id="em-prov" class="field">
        ${provs.map(p => `<option value="${esc(p.id)}" ${(m?.provider_id || "fosta") === p.id ? "selected" : ""}>${esc(p.name)} (${esc(p.id)})</option>`).join("")}
      </select>

      <label class="f-lbl">Nguồn API ưu tiên VIP (Chỉ Key Pro Max / Ultra / Admin)</label>
      <select id="em-vip-prov" class="field">
        <option value="" ${!m?.vip_provider_id ? "selected" : ""}>Dùng chung nguồn mặc định (VD: GPT VIP vẫn chạy Fosta thường)</option>
        ${provs.map(p => `<option value="${esc(p.id)}" ${m?.vip_provider_id === p.id ? "selected" : ""}>Chuyển sang ${esc(p.name)} (${esc(p.id)})</option>`).join("")}
      </select>

      <div class="s-row" style="margin-top:6px;" onclick="document.getElementById('em-fb').classList.toggle('on')">
        <span>Tự động hạ về nguồn thường nếu nguồn VIP lỗi 429 / hết số dư</span>
        <div id="em-fb" class="sw ${m?.auto_fallback !== false ? "on" : ""}"></div>
      </div>

      <label class="f-lbl">Cấp quyền sử dụng cho hạng Key</label>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin:6px 0;font-size:13px;">
        ${TIER_OPTIONS.map(([v, l]) => {
          const has = isEdit ? (tierLimits[v]?.allowed_models || []).includes(m.id) : (v === "pro_max" || v === "ultra");
          return `<label style="display:inline-flex;align-items:center;gap:5px;"><input type="checkbox" class="em-t" value="${v}" ${has ? "checked" : ""} /> ${l}</label>`;
        }).join("")}
      </div>

      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
        <button type="button" class="btn-s tap" onclick="closeModal()">Hủy</button>
        <button type="button" class="btn-p tap" onclick="adminCommitEditModel(${isEdit ? idx : "null"})">${isEdit ? "Lưu thay đổi" : "Thêm Model"}</button>
      </div>`);
  };

  // Point old adminAddModelModal to new unified modal!
  window.adminAddModelModal = function () { window.adminEditModelModal(null); };

  window.adminCommitEditModel = async function (idx) {
    const title = document.getElementById("em-title")?.value.trim();
    const mapped = document.getElementById("em-map")?.value.trim();
    if (!title || !mapped) return showToast("Nhập đủ Tên hiển thị và Model ID", "warn");
    const rawMult = String(document.getElementById("em-mult")?.value || "1.2").replace(",", ".");
    const mult = Math.max(0.1, Math.round((parseFloat(rawMult) || 1.2) * 100) / 100);
    const provId = document.getElementById("em-prov")?.value || "fosta";
    const vipProvId = document.getElementById("em-vip-prov")?.value || "";
    const autoFb = document.getElementById("em-fb")?.classList.contains("on");
    let sub = document.getElementById("em-sub")?.value.trim() || "";
    const badge = document.getElementById("em-badge")?.value.trim() || "";

    // Sync ×value in subtitle if user edited the multiplier and subtitle already had ×...
    if (sub && /×\d+(\.\d+)?/.test(sub)) {
      sub = sub.replace(/×\d+(\.\d+)?/, "×" + mult);
    }

    const models = JSON.parse(JSON.stringify(S.adminData.config.models || []));
    const existing = idx !== null ? models[idx] : null;
    const id = existing ? existing.id : mapped.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
    const updated = {
      ...(existing || {}),
      id,
      title,
      short: title.slice(0, 18),
      sub: sub || `${mapped} · ×${mult}`,
      mapped,
      provider_id: provId,
      vip_provider_id: vipProvId,
      auto_fallback: autoFb,
      cost_multiplier: mult,
      cost_label: id === "auto" ? "" : ("×" + mult),
      badge,
      enabled: existing ? existing.enabled !== false : true
    };
    if (idx !== null) models[idx] = updated;
    else models.push(updated);

    const tier_limits = JSON.parse(JSON.stringify(S.adminData.config.tier_limits || {}));
    const checkedTiers = new Set([...document.querySelectorAll(".em-t:checked")].map(c => c.value));
    for (const [t] of TIER_OPTIONS) {
      if (!tier_limits[t]) continue;
      const cur = new Set(tier_limits[t].allowed_models || []);
      if (checkedTiers.has(t)) cur.add(id);
      else cur.delete(id);
      tier_limits[t].allowed_models = [...cur];
    }

    const r = await apiFetch("/admin/config/save", { method: "POST", body: { models, tier_limits } });
    if (r.ok) {
      closeModal(); haptic("ok");
      showToast(idx !== null ? `Đã cập nhật ${title} (×${mult})` : `Đã thêm ${title}`, "ok");
      await refreshSession();
      loadAdminData();
    } else {
      const d = await r.json().catch(() => ({}));
      showToast(d.error || "Lỗi lưu model", "err");
    }
  };

  window.adminClearFallbackAlerts = async function () {
    const r = await apiFetch("/admin/fallback-alerts/clear", { method: "POST" });
    if (r.ok) { haptic("ok"); showToast("Đã xóa cảnh báo Auto-Fallback"); loadAdminData(); }
  };

  window.copyKeyHandoffMessage = function (keyCode, tierLbl, planLbl, maxDev) {
    const msg = `🔑 KEY BẢN QUYỀN API AI\n• Mã Key: ${keyCode}\n• Gói: ${tierLbl} · ${planLbl}\n• Tối đa: ${maxDev} thiết bị\n\nHướng dẫn: Mở app API AI → Đăng nhập Email → Dán mã Key vào ô Kích hoạt ngay để dùng!`;
    copyText(msg, "Đã copy mẫu bàn giao cho khách");
  };

  window.adminCreateGiftModal = function () {
    openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:6px;">Tạo Mã Quà Tặng / Voucher</h3>
      <label class="f-lbl">Loại quà tặng</label>
      <select id="gf-type" class="field" onchange="document.getElementById('gf-val').value=this.value==='extra_days'?7:500000">
        <option value="bonus_tokens">Cộng Token dự phòng (Add-on)</option>
        <option value="extra_days">Cộng thêm ngày sử dụng</option>
      </select>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div><label class="f-lbl">Giá trị (Token hoặc Số ngày)</label><input id="gf-val" type="number" class="field num" value="500000" /></div>
        <div><label class="f-lbl">Số lượt dùng tối đa</label><input id="gf-max" type="number" class="field num" value="10" min="1" /></div>
      </div>
      <label class="f-lbl">Mã tùy chọn (để trống = tự sinh)</label><input id="gf-code" class="field" placeholder="VD: TANG500K" />
      <label class="f-lbl">Ghi chú</label><input id="gf-note" class="field" placeholder="Quà tri ân khách hàng" />
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
        <button type="button" class="btn-s tap" onclick="closeModal()">Hủy</button>
        <button type="button" class="btn-p tap" onclick="commitAdminCreateGift()">Tạo mã quà</button>
      </div>`);
  };

  window.commitAdminCreateGift = async function () {
    const r = await apiFetch("/admin/gifts/create", {
      method: "POST",
      body: {
        rewardType: document.getElementById("gf-type")?.value,
        rewardValue: document.getElementById("gf-val")?.value,
        maxUses: document.getElementById("gf-max")?.value,
        code: document.getElementById("gf-code")?.value,
        note: document.getElementById("gf-note")?.value
      }
    });
    const d = await r.json();
    if (!r.ok) return showToast(d.error || "Lỗi tạo mã quà", "err");
    closeModal(); haptic("ok");
    copyText(d.code, `Đã tạo & copy mã ${d.code}`);
    loadAdminData();
  };

  window.adminGiftAct = async function (code, action) {
    const r = await apiFetch("/admin/gifts/action", { method: "POST", body: { code, action } });
    if (r.ok) { haptic("ok"); loadAdminData(); }
  };

  window.openRedeemGiftModal = function () {
    openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:6px;">Nhập Mã Quà Tặng (Voucher)</h3>
      <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:10px;">Nhận ngay Token dự phòng hoặc cộng thêm ngày sử dụng từ mã quà tặng của Quản trị viên.</p>
      <input id="rd-gift-in" class="field" style="text-align:center;font-family:var(--font-mono);text-transform:uppercase;" placeholder="GIFT-TOK-XXXXXX" />
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
        <button type="button" class="btn-s tap" onclick="closeModal()">Hủy</button>
        <button type="button" class="btn-p tap" onclick="submitRedeemGift()">Đổi quà ngay</button>
      </div>`);
  };

  window.submitRedeemGift = async function () {
    const code = document.getElementById("rd-gift-in")?.value.trim();
    if (!code) return showToast("Nhập mã quà tặng", "warn");
    try {
      const r = await apiFetch("/auth/redeem-gift", { method: "POST", body: { code } });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Đổi quà thất bại");
      if (d.user) { S.user = d.user; syncAccountUI(); }
      closeModal(); haptic("ok");
      showToast(`Đổi quà thành công: ${d.rewardText}!`, "ok");
    } catch (e) { haptic("err"); showToast(e.message, "err"); }
  };

  // Enhance renderAdminBody for Overview (Fallback alerts), Keys (Filter + Handoff + Gift Codes) & API (Edit Model button + Routing Badges)
  const _origRenderAdminBody = window.renderAdminBody;
  window.renderAdminBody = function () {
    _origRenderAdminBody();
    const d = S.adminData, box = document.getElementById("admin-body");
    if (!d || !box) return;
    const fbs = d.fallbackAlerts || [];

    const fbBannerHtml = fbs.length ? `<div class="fb-alert-banner">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <strong>Cảnh báo Auto-Fallback (${fbs.length} sự kiện gần đây)</strong>
        <button type="button" class="btn-s tap" style="height:28px;padding:0 10px;font-size:11.5px;" onclick="adminClearFallbackAlerts()">Đã xử lý / Xóa</button>
      </div>
      ${fbs.slice(0, 4).map(f => `<div style="font-size:12px;">• <b>${esc(f.model_id)}</b>: ${esc(f.from_provider)} lỗi HTTP ${f.status_code} → hạ về <b>${esc(f.to_provider)}</b> (${new Date(f.created_at).toLocaleString("vi-VN")})</div>`).join("")}
    </div>` : "";

    if (S.adminTab === "overview" && fbBannerHtml) {
      box.innerHTML = fbBannerHtml + box.innerHTML;
    }

    if (S.adminTab === "keys") {
      const now = Date.now();
      const soon = 3 * 86400000;
      const filt = S.adminKeyFilter || "all";
      const q = (S.adminKeyQuery || "").toLowerCase();
      const filteredKeys = (d.keys || []).filter(k => {
        if (filt === "unused" && k.status !== "unused") return false;
        if (filt === "active" && k.status !== "active") return false;
        if (filt === "revoked" && k.status !== "revoked") return false;
        if (filt === "expiring" && !(k.status === "active" && k.expires_at && (k.expires_at - now) <= soon && k.expires_at > now)) return false;
        if (q && !(k.key_code || "").toLowerCase().includes(q) && !(k.bound_email || "").toLowerCase().includes(q) && !(k.note || "").toLowerCase().includes(q)) return false;
        return true;
      });
      const gifts = d.giftCodes || [];
      box.innerHTML = `
        <div class="card-item lg-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <strong style="font-weight:520;">Tạo Key bản quyền (4 Hạng × 9 Thời hạn)</strong>
            <button type="button" class="btn-blue tap" style="height:32px;font-size:12px;padding:0 12px;" onclick="adminCreateGiftModal()">+ Mã quà tặng</button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div><label class="f-lbl">Hạng Key</label><select id="ak-tier" class="field">${TIER_OPTIONS.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select></div>
            <div><label class="f-lbl">Thời hạn</label><select id="ak-plan" class="field">${PLAN_OPTIONS.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select></div>
            <div><label class="f-lbl">Số lượng</label><input id="ak-cnt" type="number" min="1" max="50" value="1" class="field num" /></div>
            <div><label class="f-lbl">Tiền tố Key</label><input id="ak-pre" class="field" value="APIAI" /></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div><label class="f-lbl">Tối đa máy</label><input id="ak-dev" type="number" min="1" max="10" class="field num" placeholder="Mặc định" /></div>
            <div><label class="f-lbl">Ghi chú</label><input id="ak-note" class="field" placeholder="Tên khách" /></div>
          </div>
          <button type="button" class="btn-p tap" style="width:100%;margin-top:12px;" onclick="adminCreateKeys()">Tạo Key mới</button>
        </div>

        ${gifts.length ? `<div class="card-item lg-card">
          <strong style="display:block;font-size:14px;margin-bottom:8px;">Mã Quà Tặng / Voucher (${gifts.length})</strong>
          ${gifts.map(g => `<div class="mem-chip-row" style="margin-bottom:5px;">
            <div style="flex:1;min-width:0;">
              <strong style="font-family:var(--font-mono);font-size:12.5px;">${esc(g.code)}</strong>
              <span class="tag-st ${g.status==="active"?"st-active":"st-revoked"}">${g.used_count}/${g.max_uses}</span>
              <div style="font-size:11.5px;color:var(--ink-3);">${g.reward_type==="extra_days"?`+${g.reward_value} ngày`:`+${Number(g.reward_value).toLocaleString("vi-VN")} token`} ${g.note ? `· ${esc(g.note)}` : ""}</div>
            </div>
            <button type="button" class="btn-s tap" style="height:28px;padding:0 8px;font-size:11.5px;" onclick="copyText('${esc(g.code)}','Đã copy mã quà')">Copy</button>
            <button type="button" class="mini-act tap" onclick="adminGiftAct('${esc(g.code)}','delete')">${ICON_X}</button>
          </div>`).join("")}
        </div>` : ""}

        <div class="card-item lg-card" style="padding:12px;">
          <input class="field" style="font-size:14px;margin-bottom:8px;" placeholder="Tìm mã Key, email khách, ghi chú..." value="${esc(S.adminKeyQuery || "")}" oninput="S.adminKeyQuery=this.value;renderAdminBody()" />
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${[["all","Tất cả"],["unused","Chưa dùng"],["active","Đang chạy"],["expiring","Sắp hết <3d"],["revoked","Thu hồi"]].map(([v, l]) =>
              `<button type="button" class="btn-s tap ${filt===v?"lg-active":""}" style="height:30px;padding:0 10px;font-size:12px;" onclick="S.adminKeyFilter='${v}';renderAdminBody()">${l}</button>`
            ).join("")}
          </div>
        </div>

        <div style="font-size:13px;color:var(--ink-2);margin:8px 0;" class="num">Hiển thị ${filteredKeys.length} / ${d.keys.length} Key</div>
        ${filteredKeys.map(k => {
          const tier = k.key_tier || (k.plan_type === "week" ? "classic" : "pro");
          const tLbl = TIER_LABELS[tier] || tier;
          const pLbl = d.planLabels?.[k.plan_type] || k.plan_type;
          return `<div class="card-item lg-card">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap;">
              <strong style="font-family:var(--font-mono);font-size:13px;">${esc(k.key_code)}</strong>
              <div style="display:flex;gap:5px;">
                <span class="tag-st tier-${tier}">${esc(tLbl)}</span>
                <span class="tag-st st-${k.status}">${k.status}</span>
              </div>
            </div>
            <div style="font-size:12.5px;color:var(--ink-2);margin-top:6px;line-height:1.55;">
              Thời hạn: <b>${esc(pLbl)}</b> · Max <b class="num">${k.max_devices}</b> máy${k.note ? ` · ${esc(k.note)}` : ""}<br/>
              Email gắn: <b style="color:var(--info-ink);">${esc(k.bound_email || "Chưa kích hoạt")}</b><br/>
              ${k.expires_at ? `Hết hạn: ${new Date(k.expires_at).toLocaleString("vi-VN")}` : `Bắt đầu đếm ${k.duration_days} ngày khi kích hoạt`}
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">
              <button type="button" class="btn-blue tap" style="height:36px;font-size:12.5px;" onclick="copyKeyHandoffMessage('${esc(k.key_code)}','${esc(tLbl)}','${esc(pLbl)}',${k.max_devices})">Copy mẫu giao khách</button>
              <button type="button" class="btn-s tap" style="height:36px;font-size:12.5px;" onclick="copyText('${esc(k.key_code)}','Đã copy Key')">Copy Key</button>
              <button type="button" class="btn-s tap" style="height:36px;font-size:12.5px;" onclick="adminChangeKeyTierModal('${esc(k.key_code)}','${tier}')">Đổi hạng</button>
              <button type="button" class="btn-s tap" style="height:36px;font-size:12.5px;" onclick="adminKeyAct('${esc(k.key_code)}','extend')">+30d</button>
              <button type="button" class="btn-s tap" style="height:36px;font-size:12.5px;" onclick="adminKeyAct('${esc(k.key_code)}','reset_devices')">Reset máy</button>
              <button type="button" class="btn-danger tap" onclick="adminKeyAct('${esc(k.key_code)}','${k.status==="revoked"?"unrevoke":"revoke"}')">${k.status==="revoked"?"Mở lại":"Thu hồi"}</button>
              <button type="button" class="btn-danger tap" onclick="adminKeyAct('${esc(k.key_code)}','delete')">Xóa</button>
            </div></div>`;
        }).join("")}`;
      return;
    }

    if (S.adminTab === "api") {
      const provs = d.config.providers || [], mods = d.config.models || [];
      box.innerHTML = fbBannerHtml + `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <strong style="font-size:15px;">Nguồn API (${provs.length})</strong>
          <button type="button" class="btn-blue tap" onclick="adminEditProviderModal(null)">+ Thêm nguồn API</button>
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
              <button type="button" class="btn-s tap" onclick="adminEditProviderModal(${i})">Sửa &amp; Key Pool</button>
              <button type="button" class="btn-blue tap" onclick="adminScanProviderModels('${esc(p.id)}')">Quét Model (/models)</button>
              <button type="button" class="btn-s tap" onclick="adminCheckProviderUsage('${esc(p.id)}')">Xem số dư Token</button>
              ${provs.length > 1 ? `<button type="button" class="btn-danger tap" onclick="adminDeleteProvider(${i})">Xóa</button>` : ""}
            </div>
          </div>`).join("")}

        <div style="display:flex;justify-content:space-between;align-items:center;margin:18px 0 10px;">
          <div>
            <strong style="font-size:15px;">Danh sách Model Gộp (${mods.length})</strong>
            <div style="font-size:11.5px;color:var(--ink-3);">Bấm nút bút chì để chỉnh mức × &amp; định tuyến nguồn Thường / VIP</div>
          </div>
          <button type="button" class="btn-blue tap" onclick="adminEditModelModal(null)">+ Thêm Model</button>
        </div>
        ${mods.map((m, i) => {
          const routeTag = (m.vip_provider_id && m.vip_provider_id !== m.provider_id)
            ? `${m.provider_id} → VIP:${m.vip_provider_id}`
            : (m.provider_id || "fosta");
          return `<div class="card-item lg-card" style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <div style="min-width:0;flex:1;cursor:pointer;" onclick="adminEditModelModal(${i})">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <strong>${esc(m.title)}</strong>
                <span class="pill-sub">${esc(routeTag)}</span>
                ${m.id !== "auto" ? `<span class="tag-st tier-pro num">×${esc(String(m.cost_multiplier ?? 1.2))}</span>` : ""}
              </div>
              <div style="font-size:12px;color:var(--ink-3);font-family:var(--font-mono);margin-top:2px;">${esc(m.mapped)}${m.auto_fallback !== false && m.vip_provider_id && m.vip_provider_id !== m.provider_id ? " · Auto-Fallback" : ""}</div>
            </div>
            <button type="button" class="mini-act tap" onclick="adminEditModelModal(${i})" title="Chỉnh sửa mức × & nguồn">${ICON_EDIT}</button>
            <div class="sw ${m.enabled!==false?"on":""}" onclick="adminToggleModelEnabled(${i})" title="Bật/Tắt model"></div>
            ${m.id !== "auto" ? `<button type="button" class="mini-act tap" onclick="adminDeleteModel(${i})">${ICON_X}</button>` : ""}
          </div>`;
        }).join("")}`;
    }
  };

  /* =========================================================================
     8. N7: CANVAS MINI-IDE CONSOLE & HTML EXPORT
     ========================================================================= */
  let cvLogs = [];
  const CV_BRIDGE_SCRIPT = `<script>(function(){var send=function(l,a){try{parent.postMessage({__apiaiCvLog:true,level:l,text:[].slice.call(a).map(function(x){return typeof x==='object'?JSON.stringify(x):String(x);}).join(' ')},'*');}catch(e){}};window.onerror=function(m,s,ln,col){send('err',[m+' (dòng '+ln+':'+col+')']);};window.addEventListener('unhandledrejection',function(e){send('err',['Promise lỗi: '+(e.reason&&e.reason.message?e.reason.message:String(e.reason))]);});var oe=console.error,ow=console.warn;console.error=function(){send('err',arguments);oe&&oe.apply(console,arguments);};console.warn=function(){send('warn',arguments);ow&&ow.apply(console,arguments);};})();</scr` + `ipt>`;

  window.updateCanvasPreviewWithConsole = function (code) {
    cvLogs = [];
    renderCanvasConsole();
    const fr = document.getElementById("canvas-fr");
    if (!fr) return;
    const raw = String(code || "");
    const injected = /<head[^>]*>/i.test(raw) ? raw.replace(/<head([^>]*)>/i, `<head$1>${CV_BRIDGE_SCRIPT}`) : (CV_BRIDGE_SCRIPT + raw);
    fr.srcdoc = injected;
  };

  const _origOpenCanvasCode = window.openCanvasCode;
  window.openCanvasCode = function (code, title) {
    _origOpenCanvasCode(code, title);
    window.updateCanvasPreviewWithConsole(code);
  };

  function renderCanvasConsole() {
    const tEl = document.getElementById("cv-con-title");
    const lEl = document.getElementById("cv-con-logs");
    const fixBtn = document.getElementById("btn-cv-fix");
    const errCnt = cvLogs.filter(x => x.level === "err").length;
    if (tEl) tEl.textContent = `Console (${errCnt} lỗi · ${cvLogs.length} dòng)`;
    if (fixBtn) fixBtn.style.display = errCnt > 0 ? "inline-flex" : "none";
    if (lEl) {
      lEl.innerHTML = cvLogs.slice(-15).map(x => `<div class="cv-log-${x.level}">[${x.level.toUpperCase()}] ${esc(x.text)}</div>`).join("")
        || `<div style="color:var(--ink-3);">Không có lỗi chạy thực thi.</div>`;
    }
  }

  window.clearCanvasConsole = function () { cvLogs = []; renderCanvasConsole(); };
  window.sendCanvasErrorsToAi = function () {
    const errs = cvLogs.filter(x => x.level === "err").map(x => x.text).join("\n");
    const code = document.getElementById("canvas-ed")?.value || "";
    closeCanvas();
    S.activeTool = "canvas"; renderChips();
    sendPrompt(`Code HTML/JS trong Canvas đang gặp lỗi Console sau:\n\`\`\`\n${errs}\n\`\`\`\nHãy sửa triệt để lỗi này và xuất lại trọn bộ 1 khối \`\`\`html hoàn chỉnh:\n\`\`\`html\n${code.slice(0, 12000)}\n\`\`\``);
  };

  window.exportCanvasHtmlFile = async function () {
    const code = document.getElementById("canvas-ed")?.value || "";
    const title = (document.getElementById("canvas-title")?.textContent || "canvas").replace(/[^a-zA-Z0-9_-]+/g, "-").toLowerCase();
    const blob = new Blob([code], { type: "text/html;charset=utf-8" });
    if (window.OfficeStudio?.deliverBinaryFile) {
      await window.OfficeStudio.deliverBinaryFile(blob, `${title || "apiai-canvas"}.html`, "text/html", "open");
    } else {
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${title || "apiai-canvas"}.html`; a.click();
    }
  };

  window.addEventListener("message", e => {
    if (e.data && e.data.__apiaiCvLog) {
      cvLogs.push({ level: e.data.level || "info", text: String(e.data.text || "").slice(0, 300) });
      renderCanvasConsole();
    }
  });

  /* =========================================================================
     9. N9: SMART CHUNKED TTS CONTROL BAR (ANDROID WEBVIEW SAFE)
     ========================================================================= */
  const ttsState = { queue: [], idx: 0, rate: 1.0, paused: false, msgId: null };

  function renderTtsBar() {
    const bar = document.getElementById("tts-mini-bar");
    if (!bar) return;
    if (!ttsState.msgId) { bar.style.display = "none"; bar.innerHTML = ""; return; }
    bar.style.display = "flex";
    bar.innerHTML = `
      <span style="min-width:0;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Đang đọc (${ttsState.idx + 1}/${ttsState.queue.length})</span>
      <div style="display:flex;gap:6px;align-items:center;">
        <button type="button" class="btn-s tap" style="height:28px;padding:0 10px;font-size:11.5px;" onclick="cycleTtsRate()">${ttsState.rate}x</button>
        <button type="button" class="btn-s tap" style="height:28px;padding:0 10px;font-size:11.5px;" onclick="toggleTtsPause()">${ttsState.paused ? "Tiếp" : "Tạm dừng"}</button>
        <button type="button" class="btn-danger tap" style="height:28px;padding:0 10px;font-size:11.5px;" onclick="stopSmartTts()">Dừng</button>
      </div>`;
  }

  function speakNextTtsChunk() {
    if (!ttsState.msgId || ttsState.idx >= ttsState.queue.length) {
      stopSmartTts();
      return;
    }
    renderTtsBar();
    const u = new SpeechSynthesisUtterance(ttsState.queue[ttsState.idx]);
    u.lang = "vi-VN";
    u.rate = ttsState.rate;
    u.onend = () => {
      if (!ttsState.msgId || ttsState.paused) return;
      ttsState.idx++;
      speakNextTtsChunk();
    };
    u.onerror = () => stopSmartTts();
    speechSynthesis.speak(u);
  }

  window.stopSmartTts = function () {
    try { speechSynthesis.cancel(); } catch {}
    ttsState.msgId = null; ttsState.queue = []; ttsState.idx = 0; ttsState.paused = false;
    S.speakingMsgId = null;
    renderTtsBar(); renderMessages();
  };

  window.toggleTtsPause = function () {
    if (!ttsState.msgId) return;
    ttsState.paused = !ttsState.paused;
    try {
      if (ttsState.paused) speechSynthesis.cancel();
      else speakNextTtsChunk();
    } catch {}
    renderTtsBar();
  };

  window.cycleTtsRate = function () {
    const rates = [1.0, 1.25, 1.5];
    ttsState.rate = rates[(rates.indexOf(ttsState.rate) + 1) % rates.length];
    if (!ttsState.paused && ttsState.msgId) {
      try { speechSynthesis.cancel(); } catch {}
      speakNextTtsChunk();
    }
    renderTtsBar();
  };

  window.toggleSpeak = function (id) {
    if (!window.speechSynthesis) return showToast("Thiết bị không hỗ trợ đọc giọng nói");
    if (S.speakingMsgId === id) { stopSmartTts(); return; }
    stopSmartTts();
    const clean = getMsgText(id).replace(/```[\s\S]*?```/g, " (đoạn mã) ").replace(/[#*`>_]/g, " ").replace(/\s+/g, " ").trim();
    if (!clean) return;
    const rawSents = clean.split(/(?<=[.!?。\n])\s+/);
    const chunks = [];
    let cur = "";
    for (const s of rawSents) {
      if ((cur + " " + s).length > 210 && cur) { chunks.push(cur.trim()); cur = s; }
      else cur += (cur ? " " : "") + s;
    }
    if (cur.trim()) chunks.push(cur.trim());
    ttsState.queue = chunks;
    ttsState.idx = 0;
    ttsState.paused = false;
    ttsState.msgId = id;
    S.speakingMsgId = id;
    renderMessages();
    speakNextTtsChunk();
  };

  /* =========================================================================
     10. N10: OFFLINE READ MODE + FULL JSON BACKUP & RESTORE
     ========================================================================= */
  function updateOfflineBanner() {
    const el = document.getElementById("offline-bar");
    if (el) el.classList.toggle("show", !navigator.onLine);
  }
  window.addEventListener("online", () => { updateOfflineBanner(); showToast("Đã có mạng trở lại", "ok"); refreshSession(); });
  window.addEventListener("offline", () => { updateOfflineBanner(); showToast("Đang ở chế độ xem ngoại tuyến", "warn"); });

  // Wrap pullCloudData to cache Chats/Memories locally + pull Prompts & Journal!
  const _origPullCloud = window.pullCloudData;
  window.pullCloudData = async function () {
    if (!navigator.onLine) {
      S.chats = (await dbAll("chats")).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      S.memories = await dbAll("memories");
      S.prompts = await dbAll("prompts");
      S.journal = (await dbAll("journal")).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      renderHeroPrompts();
      return;
    }
    await _origPullCloud();
    // Persist synced chats & memories into local IndexedDB for Offline Read!
    for (const c of (S.chats || []).slice(0, 50)) await dbPut("chats", c).catch(() => {});
    for (const m of (S.memories || [])) await dbPut("memories", m).catch(() => {});
    try {
      const [rp, rj] = await Promise.all([apiFetch("/sync/prompts"), apiFetch("/sync/journal")]);
      if (rp.ok) {
        for (const p of ((await rp.json()).items || [])) await dbPut("prompts", p);
      }
      if (rj.ok) {
        for (const j of ((await rj.json()).items || [])) await dbPut("journal", j);
      }
    } catch {}
    await ensureStarterPrompts();
    S.journal = (await dbAll("journal")).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  };

  window.openBackupRestoreModal = function () {
    openModal(`<h3 style="font-size:17px;font-weight:520;margin-bottom:6px;">Sao lưu &amp; Khôi phục (.json)</h3>
      <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:12px;">Xuất toàn bộ Đội ngũ AI (Teams), Gia sư AI, Skills, Prompt mẫu, <code>boi-canh.md</code>, Sổ ghi chú và Nhật ký Giao dịch ra đúng 1 file <code>.json</code> để đổi máy không mất thiết lập.</p>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <button type="button" class="btn-p tap" style="width:100%;" onclick="exportBackupJson()">Xuất file sao lưu (.json)</button>
        <button type="button" class="btn-blue tap" style="width:100%;" onclick="document.getElementById('in-backup-json').click()">Khôi phục từ file (.json)</button>
        <button type="button" class="btn-s tap" style="width:100%;" onclick="closeModal()">Đóng</button>
      </div>`);
  };

  window.exportBackupJson = async function () {
    const payload = {
      app: "API AI",
      version: "3.6",
      exportedAt: Date.now(),
      teams: await dbAll("teams"),
      tutors: await dbAll("tutors"),
      skills: (await dbAll("skills")).filter(x => !x.builtin),
      contexts: await dbAll("contexts"),
      notebooks: await dbAll("notebooks"),
      prompts: await dbAll("prompts"),
      journal: await dbAll("journal"),
      mcp: await dbAll("mcp")
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const fileName = `API-AI-Backup-v3.6-${todayKeyLocal()}.json`;
    if (window.OfficeStudio?.deliverBinaryFile) {
      await window.OfficeStudio.deliverBinaryFile(blob, fileName, "application/json", "save");
    } else {
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = fileName; a.click();
    }
    closeModal();
  };

  window.importBackupJsonFile = async function (files) {
    const f = files?.[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data || data.app !== "API AI") throw new Error("Tệp không phải bản sao lưu hợp lệ của API AI.");
      const map = [["teams", "teams"], ["tutors", "tutors"], ["skills", "skills"], ["contexts", "contexts"], ["notebooks", "notebooks"], ["prompts", "prompts"], ["journal", "journal"], ["mcp", "mcp"]];
      let cnt = 0;
      for (const [k, store] of map) {
        for (const it of (Array.isArray(data[k]) ? data[k] : [])) {
          if (it && it.id) { await dbPut(store, it); cnt++; }
        }
      }
      S.teams = await dbAll("teams"); S.tutors = await dbAll("tutors"); S.skills = await dbAll("skills");
      S.contexts = await dbAll("contexts"); S.notebooks = await dbAll("notebooks");
      S.prompts = await dbAll("prompts"); S.journal = await dbAll("journal"); S.mcpServers = await dbAll("mcp");
      renderSidebar(); renderSkillStack(); renderHeroPrompts(); renderTopContextPill(); renderMcpQuickBadge();
      closeModal(); haptic("ok");
      showToast(`Đã khôi phục thành công ${cnt} mục dữ liệu!`, "ok");
    } catch (e) {
      haptic("err"); showToast("Lỗi khôi phục: " + e.message, "err");
    }
    document.getElementById("in-backup-json").value = "";
  };

  /* =========================================================================
     11. WIRE COMPOSER INPUT HOOKS (Auto-Draft, # Tagger, Pre-Send Token Estimator) & START BOOT!
     ========================================================================= */
  function attachV36InputListeners() {
    const ta = document.getElementById("prompt-in");
    if (!ta) return;
    ta.addEventListener("input", () => {
      saveCurrentDraft();
      updatePreSendTokenEstimate();
      checkHashTrigger(ta.value);
    });
    const _origRenderChips = window.renderChips;
    window.renderChips = function () {
      _origRenderChips();
      updatePreSendTokenEstimate();
    };
    const _origStartNew = window.startNewChat;
    window.startNewChat = function () {
      saveCurrentDraft();
      _origStartNew();
      restoreCurrentDraft();
      renderHeroPrompts();
      updateContextGuardBar();
    };
    updateOfflineBanner();
  }

  attachV36InputListeners();

  // Expose v3.6 post-boot hook so v37-engine.js runs boot() after attaching all v3.7 modules!
  window.__V36_POST_BOOT__ = async () => {
    await ensureStarterPrompts();
    S.journal = (await dbAll("journal")).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    restoreCurrentDraft();
    updateOfflineBanner();
    // If offline at startup with cached chats, let user read immediately even without network
    if (!navigator.onLine) {
      const cachedChats = await dbAll("chats");
      if (cachedChats.length) {
        S.chats = cachedChats.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        S.memories = await dbAll("memories");
        showAuthGate(false);
        renderSidebar(); renderMessages(); renderMemoryBar();
      }
    }
  };
})();
