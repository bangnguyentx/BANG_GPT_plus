/* ============================================================================
   API AI v3.8 ENGINE — SEAMLESS 3-SURFACE CRAFT + SWARMS · LOOPS · GRAPHS · WORKFLOWS
   Loaded right after v37-engine.js. Preserves 100% of v3.4–v3.7 features & D1 cloud sync.
   ============================================================================ */
(function () {
  "use strict";
  if (window.__V38_LOADED__) return;
  window.__V38_LOADED__ = true;

  /* =========================================================================
     1. 3 DARK SURFACE PALETTES (Obsidian / Ink / Graphite) + APPEARANCE MODAL
     ========================================================================= */
  const SURFACE_THEMES = [
    { id: "obsidian", name: "Obsidian Đêm", sub: "Đen sâu liền mạch", cls: "sw-obsidian" },
    { id: "ink", name: "Ink Xanh trầm", sub: "Xanh đêm dịu mắt", cls: "sw-ink" },
    { id: "graphite", name: "Graphite", sub: "Xám trung tính", cls: "sw-graphite" }
  ];

  const _origApplyThemeV38 = window.applyTheme;
  window.applyTheme = function () {
    const surf = (S.cfg && S.cfg.surfaceTheme) || "obsidian";
    document.body.dataset.surface = surf;
    if (typeof _origApplyThemeV38 === "function") _origApplyThemeV38();
    // Respect surface theme tint for floating glass while honoring user opacity slider
    const alpha = Number(S.cfg?.glassAlpha ?? 0.78);
    const rgbMap = { obsidian: "17, 20, 28", ink: "21, 29, 49", graphite: "29, 29, 32" };
    document.documentElement.style.setProperty("--g-float", `rgba(${rgbMap[surf] || rgbMap.obsidian}, ${alpha})`);
  };

  window.setSurfaceTheme = function (id) {
    if (!SURFACE_THEMES.some(x => x.id === id)) return;
    S.cfg.surfaceTheme = id;
    dbPut("kv", S.cfg).catch(() => {});
    window.applyTheme();
    haptic("switch");
    document.querySelectorAll(".v38-surface-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.surf === id);
    });
    const found = SURFACE_THEMES.find(x => x.id === id);
    showToast(`Đã đổi sắc nền: ${found ? found.name : id}`);
  };

  window.openAppearanceModal = function () {
    const bp = Math.round(((S.cfg.blurPx - 6) / 28) * 100);
    const ap = Math.round(((S.cfg.glassAlpha - 0.35) / 0.55) * 100);
    const curSurf = S.cfg.surfaceTheme || "obsidian";

    openModal(`<h3 style="font-size:17px;font-weight:600;margin-bottom:4px;">Giao diện và hiệu năng</h3>
      <div style="font-size:12px;color:var(--ink-3);margin-bottom:6px;">Sắc nền tối liền mạch (v3.8)</div>
      <div class="v38-surface-grid">
        ${SURFACE_THEMES.map(st => `<button type="button" class="v38-surface-btn tap-soft ${curSurf === st.id ? "active" : ""}" data-surf="${st.id}" onclick="setSurfaceTheme('${st.id}')">
          <div class="v38-surface-swatch ${st.cls}"><span class="v38-surface-dot"></span></div>
          <span class="v38-surface-name">${esc(st.name)}</span>
          <span class="v38-surface-sub">${esc(st.sub)}</span>
        </button>`).join("")}
      </div>

      <div class="s-row" onclick="S.cfg.ultraGlass=!S.cfg.ultraGlass;dbPut('kv',S.cfg);applyTheme();this.querySelector('.sw').classList.toggle('on',S.cfg.ultraGlass);haptic('switch')"><span>Kính Ultra (tắt để mượt máy yếu)</span><div class="sw ${S.cfg.ultraGlass ? "on" : ""}"></div></div>
      <div class="s-row" onclick="S.cfg.haptics=!S.cfg.haptics;dbPut('kv',S.cfg);this.querySelector('.sw').classList.toggle('on',S.cfg.haptics);haptic('ok')"><span>Rung phản hồi xúc giác</span><div class="sw ${S.cfg.haptics ? "on" : ""}"></div></div>
      <div class="s-row" onclick="S.cfg.lowPowerMotion=!S.cfg.lowPowerMotion;dbPut('kv',S.cfg);applyTheme();this.querySelector('.sw').classList.toggle('on',S.cfg.lowPowerMotion);haptic('switch')"><span>Giảm hiệu ứng cho máy yếu (tiết kiệm pin)</span><div class="sw ${S.cfg.lowPowerMotion ? "on" : ""}"></div></div>
      <div class="v-sliders">
        <div class="v-col"><div class="v-track" id="vt-b"><div class="v-fill" id="vf-b" style="height:${bp}%"></div></div><span style="font-size:12px;color:var(--ink-2);" class="num">Độ mờ <b id="lb-b">${S.cfg.blurPx}px</b></span></div>
        <div class="v-col"><div class="v-track" id="vt-a"><div class="v-fill" id="vf-a" style="height:${ap}%"></div></div><span style="font-size:12px;color:var(--ink-2);" class="num">Độ đục <b id="lb-a">${Math.round(S.cfg.glassAlpha * 100)}%</b></span></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <button type="button" class="btn-p tap" style="flex:1;" onclick="document.getElementById('in-wall').click()">Đổi hình nền</button>
        <button type="button" class="btn-s tap" style="flex:1;" onclick="S.cfg.wallpaper='';dbPut('kv',S.cfg);applyTheme();showToast('Đã đặt nền mặc định')">Nền mặc định</button>
      </div>`);

    bindVS("vt-b", r => {
      S.cfg.blurPx = Math.round(6 + r * 28);
      document.getElementById("vf-b").style.height = r * 100 + "%";
      document.getElementById("lb-b").textContent = S.cfg.blurPx + "px";
      applyTheme(); dbPut("kv", S.cfg);
    });
    bindVS("vt-a", r => {
      S.cfg.glassAlpha = Number((0.35 + r * 0.55).toFixed(2));
      document.getElementById("vf-a").style.height = r * 100 + "%";
      document.getElementById("lb-a").textContent = Math.round(S.cfg.glassAlpha * 100) + "%";
      applyTheme(); dbPut("kv", S.cfg);
    });
  };

  /* =========================================================================
     2. SELF-CONTAINED RUN & STREAMING HELPERS (SAFE ACROSS MULTI-CHAT TABS)
     ========================================================================= */
  function setRunV38(chatId, runObj) {
    if (!S.activeRuns) S.activeRuns = new Map();
    S.activeRuns.set(chatId, runObj);
    if (typeof window.syncGlobalStreamingUi === "function") window.syncGlobalStreamingUi();
  }
  function clearRunV38(chatId) {
    if (S.activeRuns) S.activeRuns.delete(chatId);
    if (typeof window.syncGlobalStreamingUi === "function") window.syncGlobalStreamingUi();
  }
  function createPainterV38(fn, intervalMs = 115) {
    let last = 0, timer = null;
    return {
      trigger() {
        const now = Date.now();
        if (now - last >= intervalMs) {
          last = now;
          if (timer) { clearTimeout(timer); timer = null; }
          fn();
        } else if (!timer) {
          timer = setTimeout(() => { last = Date.now(); timer = null; fn(); }, intervalMs - (now - last));
        }
      },
      flush() {
        if (timer) { clearTimeout(timer); timer = null; }
        fn();
      }
    };
  }
  function scrollBottomV38(force = false) {
    if (typeof window.scrollToBottom === "function") window.scrollToBottom(force);
  }
  function typesetMsgV38(msgId) {
    const el = document.querySelector(`[data-msg-id="${msgId}"]`);
    if (el && typeof typesetMathInElement === "function") typesetMathInElement(el);
  }

  /* =========================================================================
     3. v3.8 AGENT 6-SLOT SPEC SCHEMA & BUILT-IN GRAPH SWARM PRESETS
     ========================================================================= */
  function ensureMemberSpec(m, idx, total) {
    if (!m.nodeRole) {
      if (idx === 0) m.nodeRole = "lead";
      else if (total >= 3 && idx === total - 1) m.nodeRole = "checker";
      else m.nodeRole = "worker";
    }
    if (m.parallelGroup === undefined) {
      m.parallelGroup = (m.nodeRole === "worker" && total >= 4 && idx <= 2) ? 1 : 0;
    }
    if (!m.handoffLabel) {
      if (m.nodeRole === "lead") m.handoffLabel = "Phân luồng & Tiêu chuẩn";
      else if (m.nodeRole === "checker") m.handoffLabel = "Chấm điểm & Lỗi sửa";
      else m.handoffLabel = "Bản kết quả";
    }
    if (!m.spec || typeof m.spec !== "object") {
      m.spec = {
        job: m.role || "",
        input: idx === 0 ? "Yêu cầu người dùng, bối cảnh boi-canh.md và Team Memory" : "Bản bàn giao từ bước trước",
        output: m.nodeRole === "checker" ? "Điểm X/10, STATUS PASS/FAIL, danh sách lỗi & tên Agent cần sửa" : "Kết quả đúng vai trò, có cấu trúc rõ ràng",
        doneWell: m.nodeRole === "checker"
          ? "Chấm đủ mọi tiêu chí DONE WELL\nChỉ rõ lỗi cụ thể và đúng Agent cần sửa\nKhông duyệt qua loa khi còn sai lệch"
          : "Đúng trọng tâm yêu cầu gốc\nDữ liệu khớp hồ sơ boi-canh.md, không bịa đặt\nRõ ràng, sẵn sàng chuyển giao cho bước sau",
        never: "Không bịa số liệu/trích dẫn không có nguồn; không lấn sân nhiệm vụ Agent khác",
        askMeFirst: "Hỏi ý kiến trước khi xóa dữ liệu, thay đổi cấu trúc lớn hoặc ra quyết định rủi ro cao"
      };
    }
    return m;
  }

  function ensureTeamV38Shape(team) {
    if (!team) return team;
    if (!team.coordMode) team.coordMode = "graph";
    if (team.approvalBeforeFinal === undefined) team.approvalBeforeFinal = false;
    if (team.maxFixLoops === undefined) team.maxFixLoops = team.coordMode === "graph" ? 2 : 1;
    if (typeof team.teamMemory !== "string") team.teamMemory = "";
    if (!Array.isArray(team.runLogs)) team.runLogs = [];
    if (!team.promptVersion) team.promptVersion = 1;
    if (!Array.isArray(team.v1v2History)) team.v1v2History = [];
    const mems = team.members || [];
    mems.forEach((m, i) => ensureMemberSpec(m, i, mems.length));
    return team;
  }

  function compileMemberSystemPrompt(team, mem, sharedCtxBlock, tradeDir) {
    const sp = mem.spec || {};
    const filesTxt = (mem.files || []).length
      ? "\n\nTÀI LIỆU RIÊNG CỦA AGENT NÀY:\n" + mem.files.map(f => `[${f.name}]\n${f.digest || (f.content || "").slice(0, 4000)}`).join("\n\n")
      : "";
    const memBlock = (team.teamMemory || "").trim()
      ? `\n\n=== TEAM MEMORY (BÀI HỌC RÚT RA TỪ CÁC LẦN CHẠY TRƯỚC) ===\n${team.teamMemory.trim()}`
      : "";
    const specBlock = [
      sp.job ? `- JOB (1 việc duy nhất): ${sp.job}` : "",
      sp.input ? `- INPUT (Đầu vào): ${sp.input}` : "",
      sp.output ? `- OUTPUT (Đầu ra bắt buộc): ${sp.output}` : "",
      sp.doneWell ? `- DONE WELL (Checklist đạt chuẩn):\n  + ${sp.doneWell.split("\n").map(x => x.trim()).filter(Boolean).join("\n  + ")}` : "",
      sp.never ? `- NEVER (Điều cấm tuyệt đối): ${sp.never}` : "",
      sp.askMeFirst ? `- ASK ME FIRST (Phải xin duyệt trước): ${sp.askMeFirst}` : ""
    ].filter(Boolean).join("\n");

    return `Bạn là Agent "${mem.role}" (Vai trò đồ thị: ${(mem.nodeRole || "worker").toUpperCase()}) trong Đội ngũ "${team.name}".
CHỈ DẪN CHUYÊN MÔN: ${mem.prompt || ""}

KHUNG ĐẶC TẢ AGENT CHUẨN (BẮT BUỘC TUÂN THỦ):
${specBlock}${memBlock}${filesTxt}${sharedCtxBlock}${tradeDir}`;
  }

  const V38_GRAPH_PRESETS = [
    {
      key: "content_swarm_v38",
      name: "Team Content Swarm (Graph 5-Agent)",
      desc: "Lead điều phối · Nghiên cứu + Ý tưởng chạy song song · Viết bài · Checker tự sửa 2 vòng",
      coordMode: "graph",
      visionMode: "smart",
      approvalBeforeFinal: true,
      maxFixLoops: 2,
      liveContextSync: true,
      conflictDebate: true,
      teamMemory: "Luôn viết giọng tự nhiên, cụ thể bằng ví dụ thực tế; tránh văn mẫu sáo rỗng.",
      members: [
        {
          id: "lead", role: "Lead · Điều phối & Chốt", nodeRole: "lead", parallelGroup: 0, handoffLabel: "Brief & Góc triển khai",
          modelId: "gpt-6.2-astra", enabled: true, receiveImages: true, files: [],
          prompt: "Làm đầu mối duy nhất với người dùng. Đọc Team Memory, phân tích mục tiêu, định tuyến nhánh chạy phù hợp và bàn giao bản cuối sắc gọn.",
          spec: {
            job: "Định tuyến nhiệm vụ và tổng hợp bàn giao cuối cho người dùng",
            input: "Yêu cầu gốc, Team Memory, bối cảnh thương hiệu",
            output: "Brief phân luồng ngắn gọn (đầu) và Bản chốt cuối cùng + 3 dòng hành động (cuối)",
            doneWell: "Xác định đúng đối tượng đọc & mục tiêu bài\nĐịnh tuyến đúng Agent cần chạy\nBản cuối mạch lạc, không lặp ý, sẵn sàng đăng ngay",
            never: "Không tự bỏ qua góp ý của Checker khi vẫn còn lỗi nghiêm trọng",
            askMeFirst: "Hỏi người dùng duyệt trước khi chốt xuất bản hoặc đổi hoàn toàn góc tiếp cận"
          }
        },
        {
          id: "researcher", role: "Researcher · Nghiên cứu", nodeRole: "worker", parallelGroup: 1, handoffLabel: "Dữ liệu & Sự thật",
          modelId: "gpt-6.2-sol", enabled: true, receiveImages: true, files: [],
          prompt: "Thu thập sự thật cốt lõi, số liệu kiểm chứng được, insight người đọc và phản bác những hiểu lầm phổ biến về chủ đề.",
          spec: {
            job: "Nghiên cứu sự thật, dữ liệu và góc nhìn thực tế cho chủ đề",
            input: "Brief từ Lead và tài liệu đính kèm",
            output: "Bảng 5–7 luận điểm có bằng chứng + 3 nỗi đau/thắc mắc thật của người đọc",
            doneWell: "Mọi luận điểm đều cụ thể, tránh nói chung chung\nTách rõ sự thật đã xác minh và giả định\nCó ít nhất 2 ví dụ thực tế đời thường",
            never: "Không bịa số liệu thống kê, không trích dẫn nguồn giả",
            askMeFirst: "Báo lại ngay nếu thiếu dữ liệu cốt lõi cần người dùng cung cấp"
          }
        },
        {
          id: "ideator", role: "Ideator · Hook & Dàn ý", nodeRole: "worker", parallelGroup: 1, handoffLabel: "3 Hook & Khung bài",
          modelId: "gpt-6.2-sol", enabled: true, receiveImages: false, files: [],
          prompt: "Thiết kế 3 câu mở đầu (Hook) kéo sự chú ý tự nhiên và dựng khung cấu trúc bài mạch lạc, có nhịp cao trào và điểm nhớ.",
          spec: {
            job: "Sáng tạo góc tiếp cận, Hook mở bài và cấu trúc nội dung",
            input: "Brief từ Lead",
            output: "3 phương án Hook sắc bén + 1 khung dàn ý 4–5 phần có chuyển ý mượt",
            doneWell: "Hook đọc 3 giây muốn đọc tiếp, không giật tít rẻ tiền\nCấu trúc đi từ vấn đề thật đến giải pháp cụ thể\nCó lời kết đọng lại rõ hành động",
            never: "Không dùng từ ngữ quảng cáo sáo rỗng (đột phá, siêu đỉnh, cách mạng hóa)",
            askMeFirst: "Xin chọn 1 hướng nếu có 2 tông giọng trái ngược nhau"
          }
        },
        {
          id: "writer", role: "Writer · Viết hoàn chỉnh", nodeRole: "worker", parallelGroup: 0, handoffLabel: "Bản thảo đầy đủ",
          modelId: "gpt-6.2-astra", enabled: true, receiveImages: false, files: [],
          prompt: "Kết hợp dữ liệu từ Researcher và khung bài từ Ideator để viết bản thảo hoàn chỉnh, tự nhiên, giàu chi tiết sống động.",
          spec: {
            job: "Viết bài hoàn chỉnh từ dữ liệu nghiên cứu và khung dàn ý",
            input: "Dữ liệu từ Researcher + Hook & Dàn ý từ Ideator",
            output: "Bài viết hoàn chỉnh định dạng sạch, sẵn sàng kiểm định",
            doneWell: "Câu ngắn nhịp chắc, không văn phong AI máy móc\nĐưa đầy đủ ví dụ & dữ liệu từ Researcher\nKhông dài dòng mở bài thừa thãi",
            never: "Không thêm số liệu ngoài nghiên cứu; không lạm dụng emoji hay gạch đầu dòng vô nghĩa",
            askMeFirst: "Báo Lead nếu thấy dữ liệu và dàn ý mâu thuẫn nhau"
          }
        },
        {
          id: "checker", role: "Checker · Kiểm định DONE WELL", nodeRole: "checker", parallelGroup: 0, handoffLabel: "Điểm & Yêu cầu sửa",
          modelId: "gpt-6.2-astra", enabled: true, receiveImages: false, files: [],
          prompt: "Chấm điểm nghiêm khắc bản thảo theo checklist DONE WELL của cả đội. Nếu trượt (<8/10), chỉ đích danh Agent cần sửa và liệt kê chính xác từng lỗi cần vá.",
          spec: {
            job: "Chấm điểm kiểm định chất lượng và kích hoạt vòng sửa nếu chưa đạt",
            input: "Bản thảo từ Writer + toàn bộ tiêu chí DONE WELL & NEVER",
            output: "Điểm X/10, STATUS PASS/FAIL, TARGET_AGENT, danh sách lỗi cụ thể và AGENT_SCORES_JSON",
            doneWell: "Soi đủ từng tiêu chí DONE WELL không bỏ sót\nChỉ lỗi cụ thể tới từng câu/đoạn\nChấm công tâm, không nể nang",
            never: "Không tự viết lại cả bài thay Writer; không chấm PASS khi còn lỗi bịa đặt hoặc văn mẫu",
            askMeFirst: "Báo rõ vấn đề còn tồn đọng cho người dùng nếu sau 2 vòng sửa vẫn chưa đạt"
          }
        }
      ]
    },
    {
      key: "dev_graph_v38",
      name: "Team Lập trình Graph (4-Agent + Loop)",
      desc: "Lead/Architect · Coder viết full code · Checker soi bug & edge-case tự trả Coder vá tối đa 2 vòng",
      coordMode: "graph",
      visionMode: "smart",
      approvalBeforeFinal: true,
      maxFixLoops: 2,
      liveContextSync: true,
      conflictDebate: true,
      teamMemory: "Luôn viết code đầy đủ 100%, không dùng placeholder '// ...'; kiểm tra kỹ null/undefined và edge-cases.",
      members: [
        {
          id: "lead", role: "Lead · Architect & Chốt", nodeRole: "lead", parallelGroup: 0, handoffLabel: "Đặc tả SPEC & Kiến trúc",
          modelId: "gpt-6.2-astra", enabled: true, receiveImages: true, files: [],
          prompt: "Chốt bản đặc tả kỹ thuật [SPEC] ngắn gọn, rõ input/output, cấu trúc dữ liệu, edge-cases và danh sách file cần sửa.",
          spec: {
            job: "Thiết kế đặc tả kỹ thuật [SPEC] và nghiệm thu bản cuối",
            input: "Yêu cầu kỹ thuật, ảnh lỗi/UI và mã nguồn liên quan",
            output: "Bản [SPEC] kín kẽ, danh sách hàm, edge-cases và tiêu chí nghiệm thu",
            doneWell: "Rõ ràng kiến trúc & luồng dữ liệu\nLiệt kê tối thiểu 3 edge-cases quan trọng\nKhông mâu thuẫn với tech stack hiện có",
            never: "Không bỏ qua ràng buộc nền tảng (Android WebView, IME, CORS, giới hạn API)",
            askMeFirst: "Hỏi người dùng trước khi đổi database schema hoặc xóa tính năng cũ"
          }
        },
        {
          id: "coder", role: "Coder · Lập trình viên", nodeRole: "worker", parallelGroup: 0, handoffLabel: "Mã nguồn đầy đủ 100%",
          modelId: "gpt-6.2-sol", enabled: true, receiveImages: true, files: [],
          prompt: "Triển khai mã nguồn đầy đủ 100% bám sát [SPEC], xử lý lỗi chặt chẽ, tối ưu hiệu năng và dễ bảo trì.",
          spec: {
            job: "Viết mã nguồn chạy được đầy đủ 100% theo SPEC",
            input: "Bản [SPEC] từ Lead hoặc Phiếu lỗi từ Checker",
            output: "Khối mã nguồn hoàn chỉnh sẵn sàng chạy/copy",
            doneWell: "Code chạy ngay, không lỗi cú pháp hay biến chưa khai báo\nXử lý đủ edge-cases trong SPEC\nKhông cắt bớt bằng comment '...'",
            never: "Không tự ý đổi tên hàm/API đang dùng ở nơi khác nếu không có trong SPEC",
            askMeFirst: "Hỏi trước nếu cần cài thêm thư viện bên ngoài nặng"
          }
        },
        {
          id: "checker", role: "Checker · Reviewer & Tester", nodeRole: "checker", parallelGroup: 0, handoffLabel: "Audit & Phiếu lỗi",
          modelId: "gpt-6.2-astra", enabled: true, receiveImages: false, files: [],
          prompt: "Dry-run logic code của Coder đối chiếu với [SPEC], bắt bug biên, memory leak, lỗi bảo mật và chấm điểm.",
          spec: {
            job: "Kiểm định mã nguồn bằng Dry-Run và đối chiếu SPEC",
            input: "[SPEC] + Mã nguồn từ Coder",
            output: "SCORE X/10, STATUS PASS/FAIL, TARGET_AGENT, danh sách lỗi đánh số và checklist test",
            doneWell: "Bắt được lỗi logic/cú pháp/null thật sự\nĐối chiếu từng mục trong SPEC\nGhi rõ dòng/hàm cần sửa cho Coder",
            never: "Không duyệt PASS nếu code còn placeholder hoặc lỗi crash",
            askMeFirst: "Cảnh báo rõ rủi ro còn tồn tại nếu sau 2 vòng vẫn chưa xử lý triệt để"
          }
        }
      ]
    },
    {
      key: "trading_swarm_v38",
      name: "Team Trading Swarm (Đa khung + Kỷ luật)",
      desc: "Lead điều phối · SMC/Thanh khoản & Price Action chạy song song · Checker quản trị vốn chặn lệnh FOMO",
      coordMode: "graph",
      visionMode: "all",
      approvalBeforeFinal: false,
      maxFixLoops: 2,
      liveContextSync: true,
      conflictDebate: true,
      teamMemory: "Tuyệt đối ưu tiên xu hướng khung lớn, luôn có SL rõ ràng theo cấu trúc và R:R >= 1:2; không ép vào lệnh khi thị trường nhiễu.",
      members: [
        {
          id: "lead", role: "Lead · Chiến lược trưởng", nodeRole: "lead", parallelGroup: 0, handoffLabel: "Bối cảnh khung lớn",
          modelId: "gpt-6.2-astra", enabled: true, receiveImages: true, files: [],
          prompt: "Đọc tổng quan biểu đồ, xác định cấu trúc chính (HTF), phiên giao dịch và tổng hợp kế hoạch giao dịch kỷ luật cuối cùng.",
          spec: {
            job: "Định hướng phân tích đa khung và chốt kịch bản hành động cuối",
            input: "Ảnh chart, cặp tiền/tài sản, câu hỏi của trader và Team Memory",
            output: "Khung phân tích HTF (đầu) và Kịch bản Entry/SL/TP/Điều kiện hủy lệnh (cuối)",
            doneWell: "Rõ Bias chính và vùng vô hiệu (Invalidation)\nĐưa ra cả phương án Đứng ngoài nếu chưa đẹp\nRõ ràng mức giá, không nói nước đôi",
            never: "Không cam kết chắc thắng; không bỏ qua cảnh báo rủi ro của Checker",
            askMeFirst: "Nhắc trader xác nhận mức % rủi ro trước khi vào lệnh khối lượng lớn"
          }
        },
        {
          id: "smc", role: "SMC · Thanh khoản & OB", nodeRole: "worker", parallelGroup: 1, handoffLabel: "Bản đồ Thanh khoản",
          modelId: "gpt-6.2-sol", enabled: true, receiveImages: true, files: [],
          prompt: "Soi cấu trúc BOS/CHoCH, vùng quét thanh khoản (BSL/SSL, Sweep), Order Block, FVG và dấu chân dòng tiền lớn.",
          spec: {
            job: "Phân tích thanh khoản, Sweep, OB và FVG",
            input: "Ảnh chart và bối cảnh từ Lead",
            output: "Vùng thanh khoản mục tiêu, điểm quét và POI tiềm năng",
            doneWell: "Đọc đúng giá trên ảnh chart, không đoán mò\nPhân biệt rõ thanh khoản thật và nhiễu\nChỉ rõ điều kiện xác nhận tại POI",
            never: "Không bịa mức giá không nhìn thấy trên chart",
            askMeFirst: "Yêu cầu thêm chart khung lớn hơn nếu ảnh bị cắt mất cấu trúc"
          }
        },
        {
          id: "pa", role: "Price Action · Nến & R:R", nodeRole: "worker", parallelGroup: 1, handoffLabel: "Tín hiệu Nến & R:R",
          modelId: "gpt-6.2-sol", enabled: true, receiveImages: true, files: [],
          prompt: "Đọc hành động giá (Pinbar, Engulfing, cấu trúc sóng, hỗ trợ/kháng cự) và tính chính xác tỷ lệ R:R.",
          spec: {
            job: "Phân tích phản ứng nến, cản động/tĩnh và tính R:R",
            input: "Ảnh chart và bối cảnh từ Lead",
            output: "Vùng vào lệnh tối ưu, SL bảo vệ, TP1/TP2 và tỷ lệ R:R thực tế",
            doneWell: "SL đặt đúng sau cấu trúc bảo vệ\nR:R >= 1:2 mới đề xuất vào lệnh\nNêu rõ tín hiệu nến cần chờ xác nhận",
            never: "Không đề xuất lệnh FOMO đuổi giá xa vùng đẹp",
            askMeFirst: "Cảnh báo ngay nếu sắp có tin mạnh (CPI/NFP/FOMC)"
          }
        },
        {
          id: "checker", role: "Checker · Quản trị Rủi ro", nodeRole: "checker", parallelGroup: 0, handoffLabel: "Phê duyệt Kỷ luật",
          modelId: "gpt-6.2-astra", enabled: true, receiveImages: true, files: [],
          prompt: "Đóng vai Giám đốc Rủi ro phản biện kịch bản. Soi điểm mâu thuẫn giữa SMC và PA, kiểm tra SL/TP/R:R, trả sửa nếu kịch bản lỏng lẻo.",
          spec: {
            job: "Kiểm định kỷ luật rủi ro và bắt lỗi mâu thuẫn kịch bản",
            input: "Phân tích của SMC + PA",
            output: "SCORE X/10, STATUS PASS/FAIL, điểm rủi ro chí mạng và AGENT_SCORES_JSON",
            doneWell: "Bắt mọi mâu thuẫn BUY/SELL giữa các nhánh\nKiểm tra chặt điều kiện R:R và vị trí SL\nKhuyến nghị ĐỨNG NGOÀI khi xác suất thấp",
            never: "Không duyệt PASS cho lệnh thiếu SL hoặc đi ngược cấu trúc HTF không có xác nhận",
            askMeFirst: "Báo rõ các vùng nhiễu chưa thể kết luận"
          }
        }
      ]
    },
    {
      key: "d01_study_v38",
      name: "Team Ôn thi D01 Chuẩn Barem (4-Agent)",
      desc: "Lead đọc đề · Giải thực chiến + Soi bẫy hay sai chạy song song · Checker chấm theo barem Sở/Bộ",
      coordMode: "graph",
      visionMode: "all",
      approvalBeforeFinal: false,
      maxFixLoops: 2,
      liveContextSync: true,
      conflictDebate: true,
      teamMemory: "Bám sát chương trình GDPT 2018 (Kết nối tri thức), trình bày ngắn gọn sắc bén đúng barem chấm điểm trên lớp.",
      members: [
        {
          id: "lead", role: "Lead · Phân tích Đề & Chốt", nodeRole: "lead", parallelGroup: 0, handoffLabel: "Phân loại Dạng bài",
          modelId: "gpt-6.2-astra", enabled: true, receiveImages: true, files: [],
          prompt: "Nhận diện dạng bài/câu hỏi trong đề Toán/Văn/Anh 12, xác định thang điểm barem và trình bày lời giải mẫu cuối cùng dễ học thuộc.",
          spec: {
            job: "Đọc đề chuẩn xác, phân loại dạng bài và chốt đáp án mẫu cuối",
            input: "Ảnh đề hoặc văn bản đề thi Toán/Văn/Anh",
            output: "Phân tích yêu cầu đề (đầu) và Lời giải chuẩn barem cuối cùng (cuối)",
            doneWell: "Đọc đúng 100% từng ký tự/số liệu trong đề\nCấu trúc trình bày chuẩn phòng thi\nKèm 1 mẹo nhớ nhanh hoặc bấm Casio (nếu là Toán)",
            never: "Không đọc nhầm dấu/số trên ảnh đề; không viết dài dòng lan man",
            askMeFirst: "Hỏi lại nếu ảnh đề bị mờ che mất dữ kiện quan trọng"
          }
        },
        {
          id: "solver", role: "Solver · Giải Thực chiến", nodeRole: "worker", parallelGroup: 1, handoffLabel: "Lời giải chi tiết",
          modelId: "gpt-6.2-sol", enabled: true, receiveImages: true, files: [],
          prompt: "Giải chi tiết từng bước rõ ràng, có mẹo bấm máy Casio fx-880BTG/580VNX (Toán), nhận diện cấu trúc/loại trừ (Anh) hoặc ý sắc đúng barem (Văn).",
          spec: {
            job: "Xây dựng lời giải thực chiến nhanh và chính xác",
            input: "Đề bài và định hướng từ Lead",
            output: "Lời giải chi tiết theo từng bước có đánh số/luận điểm rõ",
            doneWell: "Tính toán tự kiểm tra lại 2 lần trước khi kết luận\nĐủ ý ăn trọn điểm barem\nNgắn gọn, thực chiến phòng thi",
            never: "Không nhảy bước làm mất điểm trình bày; không đoán mò đáp án",
            askMeFirst: "Nêu rõ nếu bài có nhiều cách giải để chọn cách nhanh nhất"
          }
        },
        {
          id: "trap", role: "Trap Hunter · Soi Bẫy & Lỗi sai", nodeRole: "worker", parallelGroup: 1, handoffLabel: "Cảnh báo Bẫy đề",
          modelId: "gpt-6.2-sol", enabled: true, receiveImages: true, files: [],
          prompt: "Chỉ ra các bẫy kinh điển học sinh lớp 12 dễ mất điểm ở câu này (điều kiện xác định, bẫy thì/giới từ, thiếu ý đánh giá Văn).",
          spec: {
            job: "Phát hiện bẫy đề thi và lỗi sai phổ biến",
            input: "Đề bài",
            output: "2–3 bẫy nguy hiểm nhất + cách kiểm tra ngược tránh mất điểm",
            doneWell: "Bẫy nêu ra trúng đúng dạng bài đang làm\nCó bước kiểm tra ngược (thử lại nghiệm/đối chiếu ngữ cảnh)\nNgắn gọn dễ nhớ",
            never: "Không liệt kê lý thuyết sáo rỗng không liên quan câu hỏi",
            askMeFirst: "Báo ngay nếu đề bài có dấu hiệu lỗi in ấn/thiếu dữ kiện"
          }
        },
        {
          id: "checker", role: "Checker · Giám khảo Barem", nodeRole: "checker", parallelGroup: 0, handoffLabel: "Chấm điểm Barem",
          modelId: "gpt-6.2-astra", enabled: true, receiveImages: true, files: [],
          prompt: "Tự tính/giải độc lập để đối chiếu đáp án của Solver, kiểm tra thiếu ý barem hay sai phép tính; nếu sai trả Solver sửa ngay.",
          spec: {
            job: "Kiểm tra độc lập đáp án và chấm theo barem",
            input: "Đề bài + Lời giải Solver + Cảnh báo Trap Hunter",
            output: "SCORE X/10, STATUS PASS/FAIL, TARGET_AGENT, lỗi sai cụ thể và AGENT_SCORES_JSON",
            doneWell: "Tự kiểm chứng phép tính/ngữ pháp/luận điểm độc lập\nPhát hiện ngay lỗi sai đáp án dù nhỏ nhất\nĐảm bảo lời giải đủ 100% ý barem",
            never: "Không hùa theo đáp án sai của Solver",
            askMeFirst: "Ghi rõ nếu có 2 cách hiểu đề khác nhau cần hỏi lại giáo viên"
          }
        }
      ]
    }
  ];

  /* =========================================================================
     4. LIVE SVG WORKFLOW GRAPH RENDERER + MERMAID EXPORT
     ========================================================================= */
  function buildGraphTopology(team) {
    ensureTeamV38Shape(team);
    const active = (team.members || []).filter(m => m.enabled !== false);
    const lead = active.find(m => m.nodeRole === "lead") || active[0];
    const checker = active.find(m => m.nodeRole === "checker" && m.id !== lead?.id) || (active.length >= 3 ? active[active.length - 1] : null);
    const workers = active.filter(m => m.id !== lead?.id && m.id !== checker?.id);

    // Group workers into sequential stages; workers with same parallelGroup > 0 run in parallel in one stage
    const stages = [];
    const seenGroups = new Map();
    workers.forEach(w => {
      const pg = Number(w.parallelGroup || 0);
      if (pg > 0) {
        if (seenGroups.has(pg)) {
          stages[seenGroups.get(pg)].push(w);
        } else {
          seenGroups.set(pg, stages.length);
          stages.push([w]);
        }
      } else {
        stages.push([w]);
      }
    });

    return { lead, stages, checker, workers, active };
  }

  window.buildTeamMermaidCode = function (team) {
    const topo = buildGraphTopology(team);
    const cleanId = (s, fallback) => String(s || fallback).replace(/[^a-zA-Z0-9_]/g, "_") || fallback;
    const cleanLbl = s => String(s || "").replace(/["\[\]()]/g, "").trim().slice(0, 34);
    const lines = ["flowchart TD"];
    const leadId = cleanId(topo.lead?.id, "Lead");
    lines.push(`  User[Người dùng] -->|Yêu cầu| ${leadId}[${cleanLbl(topo.lead?.role || "Lead")}]`);

    let prevIds = [leadId];
    let prevLabel = cleanLbl(topo.lead?.handoffLabel || "Phân luồng");
    topo.stages.forEach((st, sIdx) => {
      const curIds = st.map((w, wi) => cleanId(w.id, `W${sIdx}_${wi}`));
      st.forEach((w, wi) => {
        const wid = curIds[wi];
        lines.push(`  ${wid}[${cleanLbl(w.role)}]`);
        prevIds.forEach(pid => {
          lines.push(`  ${pid} -->|${prevLabel}| ${wid}`);
        });
      });
      prevIds = curIds;
      prevLabel = st.length > 1 ? "Hợp nhất nhánh song song" : cleanLbl(st[0]?.handoffLabel || "Bàn giao");
    });

    if (topo.checker) {
      const chkId = cleanId(topo.checker.id, "Checker");
      lines.push(`  ${chkId}[${cleanLbl(topo.checker.role)}]`);
      prevIds.forEach(pid => lines.push(`  ${pid} -->|${prevLabel}| ${chkId}`));
      if (topo.stages.length && Number(team.maxFixLoops || 0) > 0) {
        const targetId = cleanId(topo.stages[topo.stages.length - 1][0]?.id, "Worker");
        lines.push(`  ${chkId} -.->|Trượt · Sửa tối đa ${team.maxFixLoops} vòng| ${targetId}`);
      }
      prevIds = [chkId];
      prevLabel = "Đạt DONE WELL";
    }

    if (team.approvalBeforeFinal) {
      lines.push(`  Approve{Duyệt giữa luồng}`);
      prevIds.forEach(pid => lines.push(`  ${pid} -->|${prevLabel}| Approve`));
      lines.push(`  Approve -->|Đã duyệt| Final[Lead Bàn giao cuối]`);
    } else {
      lines.push(`  Final[Lead Bàn giao cuối]`);
      prevIds.forEach(pid => lines.push(`  ${pid} -->|${prevLabel}| Final`));
    }
    return lines.join("\n");
  };

  window.openTeamMermaidModal = function (teamId) {
    const team = S.teams.find(t => t.id === teamId) || (typeof teamDraft !== "undefined" && teamDraft?.id === teamId ? teamDraft : null);
    if (!team) return;
    const code = buildTeamMermaidCode(team);
    openModal(`<h3 style="font-size:16.5px;font-weight:600;margin-bottom:6px;">Sơ đồ Mermaid · ${esc(team.name)}</h3>
      <p style="font-size:12px;color:var(--ink-2);margin-bottom:8px;">Dán mã này vào <b>mermaid.live</b> để xem hoặc xuất sơ đồ độ phân giải cao.</p>
      <pre class="v38-diff-box" style="font-family:var(--font-mono);font-size:11.5px;max-height:280px;overflow:auto;">${esc(code)}</pre>
      <div style="display:flex;gap:8px;margin-top:10px;">
        <button type="button" class="btn-p tap" style="flex:1;" onclick="copyText(decodeURIComponent('${encodeURIComponent(code)}'),'Đã sao chép mã Mermaid')">Sao chép mã Mermaid</button>
        <button type="button" class="btn-s tap" onclick="closeModal()">Đóng</button>
      </div>`);
  };

  function renderTeamGraphSvg(team, graphState = null) {
    const topo = buildGraphTopology(team);
    const W = 540;
    const rowH = 66;
    const nodeH = 38;
    const rows = [];

    // Row 0: Lead Intake
    if (topo.lead) rows.push([{ id: topo.lead.id, key: "lead_in", label: topo.lead.role, sub: "Điều phối · Memory", edgeLbl: topo.lead.handoffLabel || "Phân luồng" }]);
    // Worker stages (single or parallel)
    topo.stages.forEach(st => {
      rows.push(st.map(w => ({
        id: w.id, key: w.id, label: w.role,
        sub: st.length > 1 ? "Chạy song song" : (w.handoffLabel || "Thực thi"),
        edgeLbl: st.length > 1 ? "Hợp nhất (Join)" : (w.handoffLabel || "Chuyển giao")
      })));
    });
    // Checker row
    if (topo.checker) {
      rows.push([{ id: topo.checker.id, key: "checker", label: topo.checker.role, sub: "Chấm DONE WELL", edgeLbl: "Đạt chuẩn" }]);
    }
    // Approval + Final row
    const endRow = [];
    if (team.approvalBeforeFinal) endRow.push({ id: "__approval__", key: "approval", label: "Approval Node", sub: "Bạn duyệt giữa luồng", edgeLbl: "Duyệt" });
    endRow.push({ id: "__final__", key: "lead_out", label: "Lead · Bàn giao cuối", sub: "Chốt + Team Memory", edgeLbl: "" });
    rows.push(endRow);

    const H = rows.length * rowH + 24;
    const coords = new Map();
    const ns = graphState?.nodes || {};
    const statusStyle = st => {
      if (st === "done") return { stroke: "var(--ok)", fill: "var(--ok-soft)", dot: "var(--ok)" };
      if (st === "running") return { stroke: "var(--accent)", fill: "var(--accent-soft)", dot: "var(--accent)" };
      if (st === "fail") return { stroke: "var(--danger)", fill: "var(--danger-soft)", dot: "var(--danger)" };
      if (st === "waiting") return { stroke: "var(--warn)", fill: "var(--warn-soft)", dot: "var(--warn)" };
      return { stroke: "var(--rim-hi)", fill: "var(--surface-1)", dot: "var(--ink-3)" };
    };

    // Position nodes cleanly
    rows.forEach((row, rIdx) => {
      const y = 16 + rIdx * rowH;
      const cols = row.length;
      const gap = 14;
      const maxNodeW = cols === 1 ? 250 : Math.min(196, Math.floor((W - 44 - gap * (cols - 1)) / cols));
      const totalW = cols * maxNodeW + (cols - 1) * gap;
      const startX = Math.round((W - totalW) / 2);
      row.forEach((n, cIdx) => {
        const x = startX + cIdx * (maxNodeW + gap);
        coords.set(n.key, { ...n, x, y, w: maxNodeW, h: nodeH, cx: x + maxNodeW / 2, cy: y + nodeH / 2, rIdx });
      });
    });

    // Build Edges SVG
    let edgesSvg = "";
    for (let r = 0; r < rows.length - 1; r++) {
      const fromRow = rows[r];
      const toRow = rows[r + 1];
      fromRow.forEach(fn => {
        const f = coords.get(fn.key);
        toRow.forEach(tn => {
          const t = coords.get(tn.key);
          // Skip direct checker -> final when approval is beside final on same row
          if (r === rows.length - 2 && toRow.length === 2 && tn.key === "lead_out") return;
          const midY = (f.y + f.h + t.y) / 2;
          const activeEdge = ns[fn.key] === "done" || ns[tn.key] === "running" || ns[tn.key] === "done";
          const col = activeEdge ? "var(--accent-rim)" : "var(--rim-hi)";
          edgesSvg += `<path d="M ${f.cx} ${f.y + f.h} C ${f.cx} ${midY}, ${t.cx} ${midY}, ${t.cx} ${t.y}" fill="none" stroke="${col}" stroke-width="1.6"/>`;
        });
      });
      // Edge label centered between rows
      const f0 = coords.get(fromRow[0].key);
      const t0 = coords.get(toRow[0].key);
      const lbl = (fromRow[0].edgeLbl || "").slice(0, 26);
      if (lbl) {
        const ly = Math.round((f0.y + f0.h + t0.y) / 2 + 3);
        edgesSvg += `<text x="${W / 2}" y="${ly}" text-anchor="middle" font-size="10" fill="var(--ink-3)" font-family="var(--font-mono)">${esc(lbl)}</text>`;
      }
    }

    // Horizontal link Approval -> Final if both on last row
    if (coords.has("approval") && coords.has("lead_out")) {
      const a = coords.get("approval"), f = coords.get("lead_out");
      const activeA = ns.approval === "done";
      edgesSvg += `<line x1="${a.x + a.w}" y1="${a.cy}" x2="${f.x}" y2="${f.cy}" stroke="${activeA ? "var(--ok)" : "var(--rim-hi)"}" stroke-width="1.6"/>`;
    }

    // Curved Quality Loop back-edge (Checker -> Last Worker stage)
    if (coords.has("checker") && topo.stages.length && Number(team.maxFixLoops || 0) > 0) {
      const chk = coords.get("checker");
      const targetKey = graphState?.loopTargetKey && coords.has(graphState.loopTargetKey)
        ? graphState.loopTargetKey
        : topo.stages[topo.stages.length - 1][0].id;
      const tgt = coords.get(targetKey);
      if (tgt) {
        const loopUsed = Number(graphState?.loopsUsed || 0);
        const loopCol = loopUsed > 0 ? "var(--warn)" : "var(--rim-hi)";
        const rx = W - 16;
        edgesSvg += `<path d="M ${chk.x + chk.w} ${chk.cy} C ${rx} ${chk.cy}, ${rx} ${tgt.cy}, ${tgt.x + tgt.w} ${tgt.cy}" fill="none" stroke="${loopCol}" stroke-width="${loopUsed > 0 ? "2" : "1.3"}" stroke-dasharray="4 3"/>`;
        const loopLbl = loopUsed > 0 ? `Sửa vòng ${loopUsed}/${team.maxFixLoops}` : `Loop ≤${team.maxFixLoops}`;
        edgesSvg += `<text x="${rx - 4}" y="${Math.round((chk.cy + tgt.cy) / 2)}" text-anchor="end" font-size="9.5" fill="${loopUsed > 0 ? "var(--warn-ink)" : "var(--ink-3)"}" font-family="var(--font-mono)">${esc(loopLbl)}</text>`;
      }
    }

    // Build Nodes SVG
    let nodesSvg = "";
    coords.forEach(c => {
      const st = ns[c.key] || "idle";
      const sty = statusStyle(st);
      const shortLbl = (c.label || "").length > 23 ? (c.label || "").slice(0, 22) + "…" : (c.label || "");
      const scoreTag = graphState?.agentScores?.[c.id] !== undefined ? ` · ${graphState.agentScores[c.id]}/10` : "";
      const shortSub = ((c.sub || "") + scoreTag).slice(0, 28);
      nodesSvg += `<g>
        <rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="10" fill="${sty.fill}" stroke="${sty.stroke}" stroke-width="1.2"/>
        <circle cx="${c.x + 12}" cy="${c.y + 14}" r="3.2" fill="${sty.dot}"/>
        <text x="${c.x + 21}" y="${c.y + 17}" font-size="11.5" font-weight="500" fill="var(--ink)">${esc(shortLbl)}</text>
        <text x="${c.x + 21}" y="${c.y + 30}" font-size="9.5" fill="var(--ink-3)" font-family="var(--font-mono)">${esc(shortSub)}</text>
      </g>`;
    });

    const scoreVal = graphState?.checkerScore;
    const scorePill = scoreVal !== undefined && scoreVal !== null
      ? `<span class="v38-score-pill ${scoreVal >= 8 ? "pass" : (scoreVal >= 6.5 ? "warn" : "fail")}">${scoreVal.toFixed(1)}/10 ${graphState?.checkerPassed ? "· ĐẠT" : "· CẦN SỬA"}</span>`
      : `<span class="v38-score-pill">Graph v${team.promptVersion || 1}</span>`;

    return `<div class="v38-graph-card">
      <div class="v38-graph-head">
        <span class="v38-graph-title">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="12" cy="18" r="3"/><path d="M8.5 7.5 11 15M15.5 7.5 13 15"/></svg>
          <span>Sơ đồ luồng chạy (Swarm Graph)</span>
        </span>
        <div style="display:flex;align-items:center;gap:6px;">
          ${scorePill}
          <button type="button" class="ws-chip-btn tap" onclick="openTeamMermaidModal('${esc(team.id)}')">Mermaid</button>
        </div>
      </div>
      <div class="v38-graph-canvas">
        <svg class="v38-graph-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Sơ đồ luồng Đội ngũ AI">
          ${edgesSvg}${nodesSvg}
        </svg>
      </div>
    </div>`;
  }

  /* =========================================================================
     5. PARSING CHECKER SCORES & LEAD ROUTING DIRECTIVES
     ========================================================================= */
  function parseCheckerVerdict(text, activeMembers) {
    const raw = String(text || "");
    const scoreMatch = raw.match(/SCORE\s*[:=]\s*(\d+(?:[.,]\d+)?)\s*(?:\/\s*10)?/i) || raw.match(/(\d+(?:[.,]\d+)?)\s*\/\s*10/);
    let score = scoreMatch ? parseFloat(scoreMatch[1].replace(",", ".")) : null;
    if (score !== null && (isNaN(score) || score > 10)) score = Math.min(10, score / 10);

    const statusFail = /STATUS\s*[:=]\s*FAIL/i.test(raw);
    const statusPass = /STATUS\s*[:=]\s*PASS/i.test(raw);
    const passed = statusPass ? true : (statusFail ? false : (score !== null ? score >= 7.8 : true));
    if (score === null) score = passed ? 8.5 : 5.8;

    let targetMember = null;
    const targetMatch = raw.match(/TARGET_AGENT\s*[:=]\s*([^\n\r]+)/i);
    if (targetMatch) {
      const clue = targetMatch[1].trim().toLowerCase();
      targetMember = activeMembers.find(m =>
        m.nodeRole !== "checker" && (
          clue.includes((m.id || "").toLowerCase()) ||
          clue.includes((m.role || "").toLowerCase().split("·")[0].trim())
        )
      );
    }
    if (!targetMember) {
      const workers = activeMembers.filter(m => m.nodeRole === "worker");
      targetMember = workers[workers.length - 1] || activeMembers.find(m => m.nodeRole !== "checker") || activeMembers[0];
    }

    const agentScores = {};
    const jsonMatch = raw.match(/AGENT_SCORES_JSON\s*[:=]?\s*(\{[\s\S]*?\})/i);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        Object.entries(parsed).forEach(([k, v]) => {
          const num = parseFloat(String(v).replace(",", "."));
          if (!isNaN(num)) {
            const matched = activeMembers.find(m => m.id === k || (m.role || "").toLowerCase().includes(k.toLowerCase()));
            agentScores[matched ? matched.id : k] = Math.max(0, Math.min(10, Number(num.toFixed(1))));
          }
        });
      } catch {}
    }
    // Guarantee every worker has a score entry for analytics
    activeMembers.filter(m => m.nodeRole !== "checker").forEach(m => {
      if (agentScores[m.id] === undefined) {
        agentScores[m.id] = (m.id === targetMember?.id && !passed) ? Math.max(4, Number((score - 0.8).toFixed(1))) : Number(score.toFixed(1));
      }
    });

    return { score: Number(score.toFixed(1)), passed, targetMember, agentScores };
  }

  function parseLeadRoute(text, workers) {
    const raw = String(text || "");
    const m = raw.match(/<<<ROUTE_JSON>>>([\s\S]*?)<<<END_ROUTE>>>/i);
    if (m) {
      try {
        const obj = JSON.parse(m[1].trim());
        if (Array.isArray(obj.runWorkers) && obj.runWorkers.length) {
          const valid = obj.runWorkers.filter(id => workers.some(w => w.id === id));
          if (valid.length) return { runWorkerIds: new Set(valid), handoffNote: String(obj.handoffNote || "") };
        }
      } catch {}
    }
    return { runWorkerIds: new Set(workers.map(w => w.id)), handoffNote: "" };
  }

  async function recordTeamRunLog(team, prompt, verdict, loopsUsed, finalExcerpt) {
    ensureTeamV38Shape(team);
    let weakestId = null, lowest = 11;
    Object.entries(verdict.agentScores || {}).forEach(([id, sc]) => {
      if (sc < lowest) { lowest = sc; weakestId = id; }
    });
    team.runLogs.unshift({
      id: "run-" + Date.now(),
      ts: Date.now(),
      prompt: String(prompt || "").slice(0, 180),
      score: verdict.score,
      passed: verdict.passed,
      loops: loopsUsed,
      agentScores: verdict.agentScores || {},
      weakestAgentId: weakestId,
      promptVersion: team.promptVersion || 1,
      summary: String(finalExcerpt || "").replace(/\s+/g, " ").slice(0, 220)
    });
    team.runLogs = team.runLogs.slice(0, 20);
    await dbPut("teams", team).catch(() => {});
    apiFetch("/sync/teams", { method: "POST", body: team }).catch(() => {});
  }

  /* =========================================================================
     6. GRAPH ORCHESTRATOR ENGINE (Swarms · Parallel Fan-Out/Join · Quality Loop · Approval Node)
     ========================================================================= */
  const _origRunTeamPipelineV37 = window.runTeamPipeline;

  window.runTeamPipeline = async function (chat, team, userPrompt, resumeMsg = null, startAtIdx = 0, sentAtts = []) {
    ensureTeamV38Shape(team);
    if (team.coordMode !== "graph") {
      return _origRunTeamPipelineV37(chat, team, userPrompt, resumeMsg, startAtIdx, sentAtts);
    }
    if (!canUseTeams()) return showToast("Đội ngũ AI yêu cầu Key hạng Pro Max trở lên", "warn");
    const topo = buildGraphTopology(team);
    if (!topo.active.length) return showToast("Team chưa bật thành viên nào", "warn");

    const chatId = chat.id;
    const ctrl = new AbortController();
    setRunV38(chatId, { abort: ctrl, label: team.name, type: "team" });

    const wsImages = (chat.workspaceFiles || []).filter(x => x.dataUrl);
    const turnAtts = Array.isArray(sentAtts) && sentAtts.length ? sentAtts : (chat.messages.filter(x => x.role === "user").slice(-1)[0]?.atts || []);
    const imgMap = new Map();
    [...wsImages, ...turnAtts.filter(a => a?.dataUrl)].forEach(im => imgMap.set(im.name || im.id, im));
    const imgAtts = [...imgMap.values()].slice(0, 6);

    const plannedSteps = 1 + topo.workers.length + (topo.checker ? 1 : 0) + 1;
    let aiMsg = resumeMsg;
    if (!aiMsg) {
      aiMsg = {
        id: "m-" + (Date.now() + 1), role: "assistant", text: "",
        modelLabel: `${team.name} (Graph Swarm v${team.promptVersion || 1}${imgAtts.length ? ` · ${imgAtts.length} ảnh` : ""})`,
        streaming: true,
        pipeline: {
          teamId: team.id,
          mode: "graph",
          prompt: userPrompt,
          steps: [],
          totalPlanned: plannedSteps,
          awaitingApproval: false,
          awaitingGraphApproval: false,
          approvalFeedback: "",
          blueprint: "",
          draftOutput: "",
          codeOutput: "",
          finalCode: null,
          graphState: { nodes: {}, loopsUsed: 0, loopTargetKey: null, checkerScore: null, checkerPassed: null, agentScores: {} }
        },
        ts: Date.now()
      };
      chat.messages.push(aiMsg);
    } else {
      aiMsg.streaming = true;
      aiMsg.pipeline.awaitingGraphApproval = false;
    }

    const pipe = aiMsg.pipeline;
    const gs = pipe.graphState || (pipe.graphState = { nodes: {}, loopsUsed: 0, loopTargetKey: null, checkerScore: null, checkerPassed: null, agentScores: {} });
    if (S.activeChatId === chatId) { renderMessages(); scrollBottomV38(true); }
    bgStartTask(`${team.name} (Graph)`, `Lead đang định tuyến & đọc Team Memory`);

    const runNodeStep = async (mem, nodeKey, stepNum, customTitle, contentIn, passImages, customStatus = "running") => {
      gs.nodes[nodeKey] = "running";
      const modObj = S.models.find(m => m.id === mem.modelId && m.allowed) || getAllowedRealModels()[0];
      const modId = modObj?.id || S.cfg.selectedModel;
      const freshBundle = typeof window.buildZeroMissContextBundle === "function"
        ? window.buildZeroMissContextBundle(chat, userPrompt, team, null)
        : { textBlock: "" };
      const sharedCtxBlock = freshBundle.textBlock ? `\n\n=== HỒ SƠ BỐI CẢNH & TỆP PHÒNG LÀM VIỆC (ZERO-MISS) ===\n${freshBundle.textBlock}` : "";
      const tradeDir = (team.name.toLowerCase().includes("trading") || (typeof window.shouldInjectTradingSignalDirective === "function" && window.shouldInjectTradingSignalDirective(userPrompt, imgAtts.length > 0)))
        ? `\n\n${window.TRADING_SIGNAL_DIRECTIVE || ""}` : "";
      const visionNote = (passImages && imgAtts.length) ? ` · Vision (${imgAtts.length})` : "";

      const step = {
        id: "st-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        role: mem.id, memberId: mem.id, memberRole: mem.role, modelId: modId,
        num: String(stepNum), title: (customTitle || mem.role) + visionNote,
        modelLabel: modObj?.short || modId, status: customStatus,
        text: "", startTs: Date.now(), elapsedMs: 0, collapsed: false
      };
      pipe.steps.push(step);
      if (S.activeChatId === chatId) { renderMessages(); scrollBottomV38(false); }

      const painter = createPainterV38(() => {
        if (S.activeChatId !== chatId) return;
        const el = document.getElementById("pipe-md-" + step.id);
        if (el) { el.innerHTML = renderMd(step.text); scrollBottomV38(false); }
      }, 115);

      const fullSys = compileMemberSystemPrompt(team, mem, sharedCtxBlock, tradeDir);
      const { text, slot } = await callStatelessAgent(chat, modId, mem.id, fullSys, contentIn, full => {
        step.text = full;
        painter.trigger();
      }, passImages ? imgAtts : [], ctrl.signal);

      step.text = text;
      step.elapsedMs = Date.now() - step.startTs;
      step.status = customStatus === "conflict" ? "conflict" : "done";
      gs.nodes[nodeKey] = "done";
      if (slot) aiMsg.slot = slot;
      painter.flush();
      if (S.activeChatId === chatId) renderMessages();
      return { step, text };
    };

    try {
      const lead = topo.lead;
      const checker = topo.checker;
      const workerOutputs = new Map();

      // If resuming from Approval Node straight to Lead Final Handoff
      if (resumeMsg && startAtIdx === 999) {
        gs.nodes.approval = "done";
        const feedback = (pipe.approvalFeedback || "").trim();
        const leadOutIn = `YÊU CẦU GỐC:\n${pipe.prompt}\n\nBẢN KẾT QUẢ ĐÃ QUA CHECKER (${gs.checkerScore || 8.5}/10):\n${(pipe.draftOutput || "").slice(0, 8000)}${feedback ? `\n\nGÓP Ý CHỈNH SỬA CỦA NGƯỜI DÙNG TẠI APPROVAL NODE:\n${feedback}` : ""}\n\nNHIỆM VỤ LEAD BÀN GIAO CUỐI:\n1. Mở đầu bằng khối **Tóm tắt 3 dòng hành động ngay**.\n2. Trình bày sản phẩm/kết quả cuối hoàn chỉnh, đã áp dụng trọn vẹn góp ý của người dùng (nếu có).\n3. Cuối bài thêm 1 dòng ngắn bắt đầu bằng \`TEAM_LESSON:\` rút ra 1 bài học ngắn cho Team Memory (tối đa 25 từ).`;
        pipe.steps.forEach(s => { s.collapsed = true; });
        const fin = await runNodeStep(lead, "lead_out", "✓", `${lead.role} · Bàn giao cuối`, leadOutIn, false);
        fin.step.collapsed = false;
        aiMsg.text = fin.text;
        const lessonMatch = fin.text.match(/TEAM_LESSON\s*:\s*([^\n]+)/i);
        if (lessonMatch && lessonMatch[1].trim()) {
          const line = `• ${lessonMatch[1].trim()}`;
          if (!team.teamMemory.includes(lessonMatch[1].trim().slice(0, 30))) {
            team.teamMemory = ((team.teamMemory ? team.teamMemory + "\n" : "") + line).slice(-1200);
          }
        }
        const codeHit = extractBestCodeBlock(fin.text);
        if (codeHit) { pipe.codeOutput = fin.text; pipe.finalCode = codeHit; }
        await recordTeamRunLog(team, pipe.prompt, { score: gs.checkerScore || 8.5, passed: gs.checkerPassed !== false, agentScores: gs.agentScores || {} }, gs.loopsUsed || 0, fin.text);
        await savePendingTask(null);
        haptic("ok");
        showToast(`${team.name} đã chốt bàn giao cuối`, "ok");
        return;
      }

      // PHASE 1: LEAD ROUTING (if/then + Team Memory)
      const workerRoster = topo.workers.map(w => `- id="${w.id}" | ${w.role} | Nhánh song song: ${w.parallelGroup || "nối tiếp"} | Job: ${w.spec?.job || w.prompt}`).join("\n");
      const leadIn = `YÊU CẦU NGƯỜI DÙNG:\n${pipe.prompt}\n\nDANH SÁCH AGENT TRONG ĐỒ THỊ:\n${workerRoster || "(Chỉ có Lead)"}\n\nNHIỆM VỤ BƯỚC 1 (ĐIỀU PHỐI):\n1. Xác định rõ mục tiêu, tiêu chuẩn đạt và phân công ngắn gọn cho từng Agent.\n2. Nếu có điều kiện rẽ nhánh if/then, quyết định Agent nào cần chạy.\n3. Kết thúc bằng khối định tuyến (giữ đúng thẻ):\n<<<ROUTE_JSON>>>{"runWorkers":[${topo.workers.map(w => `"${w.id}"`).join(",")}],"handoffNote":"Ghi chú chuyển giao ngắn cho đội"}<<<END_ROUTE>>>`;
      const leadPassImg = imgAtts.length > 0 && (lead.receiveImages !== false || team.visionMode === "all");
      const leadRes = await runNodeStep(lead, "lead_in", "1", `${lead.role} · Điều phối`, leadIn, leadPassImg);
      pipe.blueprint = leadRes.text;
      const route = parseLeadRoute(leadRes.text, topo.workers);
      leadRes.step.collapsed = true;

      // PHASE 2: STAGED WORKER EXECUTION (Parallel Fan-Out -> Join)
      let stepCounter = 2;
      let latestWorkText = leadRes.text;
      let lastWorkerMem = lead;

      for (const stage of topo.stages) {
        const toRun = stage.filter(w => route.runWorkerIds.has(w.id));
        if (!toRun.length) continue;

        const prevArtifacts = [...workerOutputs.entries()].map(([id, val]) => {
          const m = topo.active.find(x => x.id === id);
          return `### [${m?.role || id}]\n${val.slice(0, 4200)}`;
        }).join("\n\n");

        if (toRun.length > 1) {
          bgStartTask(`${team.name} (Song song)`, `${toRun.length} Agent đang chạy song song...`);
          const baseNum = stepCounter;
          const parRes = await Promise.all(toRun.map((w, idx) => {
            const pImg = imgAtts.length > 0 && (w.receiveImages !== undefined ? Boolean(w.receiveImages) : team.visionMode === "all");
            const inTxt = `YÊU CẦU GỐC:\n${pipe.prompt}\n\nCHỈ ĐẠO TỪ LEAD:\n${leadRes.text.slice(0, 3200)}${route.handoffNote ? `\nGHI CHÚ CHUYỂN GIAO: ${route.handoffNote}` : ""}${prevArtifacts ? `\n\nSẢN PHẨM TỪ CÁC NHÁNH TRƯỚC:\n${prevArtifacts}` : ""}\n\nHãy hoàn thành xuất sắc đúng JOB và checklist DONE WELL của bạn.`;
            return runNodeStep(w, w.id, `${baseNum}${String.fromCharCode(97 + idx)}`, `${w.role} (Song song)`, inTxt, pImg);
          }));
          parRes.forEach((r, idx) => {
            r.step.collapsed = true;
            workerOutputs.set(toRun[idx].id, r.text);
            latestWorkText = r.text;
            lastWorkerMem = toRun[idx];
            const ch = extractBestCodeBlock(r.text);
            if (ch) { pipe.codeOutput = r.text; pipe.finalCode = ch; }
          });
          stepCounter++;
        } else {
          const w = toRun[0];
          const pImg = imgAtts.length > 0 && (w.receiveImages !== undefined ? Boolean(w.receiveImages) : (team.visionMode === "all" || stepCounter <= 2));
          const inTxt = `YÊU CẦU GỐC:\n${pipe.prompt}\n\nCHỈ ĐẠO TỪ LEAD:\n${leadRes.text.slice(0, 2800)}${prevArtifacts ? `\n\nDỮ LIỆU HỢP NHẤT TỪ CÁC AGENT TRƯỚC (JOIN):\n${prevArtifacts}` : ""}\n\nHãy thực thi trọn vẹn nhiệm vụ theo đúng JOB, OUTPUT và checklist DONE WELL.`;
          const res = await runNodeStep(w, w.id, stepCounter++, w.role, inTxt, pImg);
          res.step.collapsed = true;
          workerOutputs.set(w.id, res.text);
          latestWorkText = res.text;
          lastWorkerMem = w;
          const ch = extractBestCodeBlock(res.text);
          if (ch) { pipe.codeOutput = res.text; pipe.finalCode = ch; }
        }
      }

      // Build joined bundle for Checker
      const buildJoinedSummary = () => [...workerOutputs.entries()].map(([id, val]) => {
        const m = topo.active.find(x => x.id === id);
        return `### Agent [${id}] — ${m?.role || id}\n${val.slice(0, 4800)}`;
      }).join("\n\n") || latestWorkText;

      // PHASE 3 & 4: CHECKER + TARGETED QUALITY LOOP (MAX 2 ROUNDS)
      let verdict = { score: 8.5, passed: true, targetMember: lastWorkerMem, agentScores: {} };
      if (checker) {
        const allChecklists = topo.active.map(m => `[${m.id} · ${m.role}]\n- DONE WELL: ${(m.spec?.doneWell || "").replace(/\n/g, "; ")}\n- NEVER: ${m.spec?.never || ""}`).join("\n");
        const maxLoops = Math.min(2, Math.max(0, Number(team.maxFixLoops ?? 2)));
        let loop = 0;

        while (true) {
          bgStartTask(`${team.name} (Checker)`, loop === 0 ? "Checker đang chấm DONE WELL..." : `Checker kiểm định lại vòng ${loop}/${maxLoops}...`);
          const chkIn = `YÊU CẦU GỐC:\n${pipe.prompt}\n\nCHECKLIST DONE WELL & NEVER CỦA ĐỘI:\n${allChecklists}\n\nTOÀN BỘ KẾT QUẢ CÁC AGENT:\n${buildJoinedSummary()}\n\nNHIỆM VỤ CHECKER (BẮT BUỘC GIỮ ĐÚNG CÁC DÒNG KHÓA ĐỂ HỆ THỐNG ĐỌC):\n1. Chấm điểm công tâm từng tiêu chí DONE WELL.\n2. Bắt buộc ghi rõ các dòng sau ở ĐẦU phản hồi:\nSCORE: X/10\nSTATUS: PASS (nếu >= 8.0 và không vi phạm NEVER) hoặc STATUS: FAIL\nTARGET_AGENT: <id của 1 Agent làm yếu nhất cần sửa nếu FAIL>\nAGENT_SCORES_JSON: {${topo.workers.map(w => `"${w.id}":8.5`).join(",")}}\n3. Nếu FAIL, ghi mục FIX_LIST liệt kê chính xác từng lỗi cần sửa.`;
          const chkPassImg = imgAtts.length > 0 && (checker.receiveImages === true || team.visionMode === "all");
          const chkTitle = loop === 0 ? `${checker.role}` : `${checker.role} · Tái kiểm vòng ${loop}`;
          const chkRes = await runNodeStep(checker, "checker", loop === 0 ? stepCounter++ : `C.${loop}`, chkTitle, chkIn, chkPassImg);
          verdict = parseCheckerVerdict(chkRes.text, topo.active);
          gs.checkerScore = verdict.score;
          gs.checkerPassed = verdict.passed;
          gs.agentScores = verdict.agentScores;

          if (verdict.passed || loop >= maxLoops || !verdict.targetMember) {
            chkRes.step.status = verdict.passed ? "done" : "fail";
            gs.nodes.checker = verdict.passed ? "done" : "fail";
            chkRes.step.collapsed = true;
            break;
          }

          // Trigger Quality Loop back to the exact failing Agent!
          loop++;
          gs.loopsUsed = loop;
          gs.loopTargetKey = verdict.targetMember.id;
          chkRes.step.status = "conflict";
          chkRes.step.collapsed = true;
          gs.nodes.checker = "fail";

          const fixAgent = verdict.targetMember;
          bgStartTask(`${team.name} (Quality Loop ${loop}/${maxLoops})`, `Trả về ${fixAgent.role} tự sửa lỗi...`);
          const prevWork = workerOutputs.get(fixAgent.id) || latestWorkText;
          const fixIn = `YÊU CẦU GỐC:\n${pipe.prompt}\n\nCHECKER ĐÃ TRẢ LẠI BÀI ĐỂ BẠN SỬA (VÒNG ${loop}/${maxLoops}):\n${chkRes.text}\n\nBẢN LÀM TRƯỚC CỦA BẠN:\n${prevWork.slice(0, 6000)}\n\nHÃY SỬA TRIỆT ĐỂ TỪNG MỤC TRONG FIX_LIST VÀ XUẤT LẠI BẢN HOÀN CHỈNH.`;
          const fixRes = await runNodeStep(fixAgent, fixAgent.id, `L${loop}`, `${fixAgent.role} · Sửa vòng ${loop}/${maxLoops}`, fixIn, false);
          fixRes.step.collapsed = true;
          workerOutputs.set(fixAgent.id, fixRes.text);
          latestWorkText = fixRes.text;
          const ch = extractBestCodeBlock(fixRes.text);
          if (ch) { pipe.codeOutput = fixRes.text; pipe.finalCode = ch; }
        }
      }

      pipe.draftOutput = latestWorkText;

      // PHASE 5: HUMAN-IN-THE-LOOP APPROVAL NODE (if enabled)
      if (team.approvalBeforeFinal) {
        pipe.awaitingGraphApproval = true;
        gs.nodes.approval = "waiting";
        aiMsg.streaming = false;
        aiMsg.text = latestWorkText;
        clearRunV38(chatId);
        if (!S.activeRuns || S.activeRuns.size === 0) bgStopTask();
        await savePendingTask(null);
        await dbPut("chats", chat).catch(() => {});
        apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {});
        if (S.activeChatId === chatId) renderMessages();
        haptic("ok");
        showToast(`Checker chấm ${verdict.score}/10 · Chờ bạn duyệt tại Approval Node`, "ok");
        return;
      }

      // PHASE 6: LEAD FINAL HANDOFF + RUN LOG + TEAM MEMORY
      const leadOutIn = `YÊU CẦU GỐC:\n${pipe.prompt}\n\nKẾT QUẢ ĐÃ KIỂM ĐỊNH (${verdict.score}/10 · ${verdict.passed ? "ĐẠT" : "CHƯA ĐẠT HẾT SAU 2 VÒNG"}):\n${latestWorkText.slice(0, 7500)}\n\nNHIỆM VỤ LEAD BÀN GIAO CUỐI:\n1. Mở đầu bằng khối **Tóm tắt 3 dòng hành động ngay**.\n2. Trình bày kết quả cuối cùng sạch sẽ, đầy đủ để người dùng sử dụng ngay${!verdict.passed ? " (nêu thẳng 1–2 điểm Checker còn lưu ý)" : ""}.\n3. Kết thúc bằng 1 dòng ngắn \`TEAM_LESSON: <1 bài học ngắn tối đa 25 từ cho lần sau>\`.`;
      const finRes = await runNodeStep(lead, "lead_out", "✓", `${lead.role} · Bàn giao cuối`, leadOutIn, false);
      finRes.step.collapsed = false;
      aiMsg.text = finRes.text;
      const codeHit = extractBestCodeBlock(finRes.text);
      if (codeHit) { pipe.codeOutput = finRes.text; pipe.finalCode = codeHit; }

      const lessonMatch = finRes.text.match(/TEAM_LESSON\s*:\s*([^\n]+)/i);
      if (lessonMatch && lessonMatch[1].trim()) {
        const cleanLesson = lessonMatch[1].trim();
        if (!team.teamMemory.includes(cleanLesson.slice(0, 28))) {
          team.teamMemory = ((team.teamMemory ? team.teamMemory + "\n" : "") + `• ${cleanLesson}`).slice(-1200);
        }
      }

      await recordTeamRunLog(team, pipe.prompt, verdict, gs.loopsUsed || 0, finRes.text);
      await savePendingTask(null);
      haptic("ok");
      showToast(`${team.name} hoàn tất · Điểm Checker ${verdict.score}/10`, "ok");
      if (document.hidden) bgNotifyDone(`${team.name} hoàn tất (${verdict.score}/10)`, aiMsg.text.replace(/[#*`]/g, "").slice(0, 120));
    } catch (e) {
      pipe.steps.push({ id: "st-err-" + Date.now(), role: "error", num: "!", title: "Tạm dừng", modelLabel: "", status: "fail", text: e.name === "AbortError" ? "Đã dừng theo yêu cầu." : e.message, collapsed: false });
      aiMsg.text = `Tạm dừng: ${e.message}`;
      if (e.name === "AbortError") await savePendingTask(null);
    } finally {
      aiMsg.streaming = false;
      chat.updatedAt = Date.now();
      clearRunV38(chatId);
      if (!S.activeRuns || S.activeRuns.size === 0) bgStopTask();
      dbPut("chats", chat).catch(() => {});
      apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {});
      syncAccountUI();
      if (S.activeChatId === chatId) {
        renderMessages();
        typesetMsgV38(aiMsg.id);
        renderMemoryBar();
      }
    }
  };

  // Approval Node Actions
  window.approveGraphAndFinish = async function (msgId) {
    const chat = S.chats.find(c => c.id === S.activeChatId);
    const msg = chat?.messages.find(m => m.id === msgId);
    const team = S.teams.find(t => t.id === msg?.pipeline?.teamId);
    if (!chat || !msg || !team) return;
    const fb = document.getElementById("v38-app-fb-" + msgId)?.value?.trim() || "";
    msg.pipeline.approvalFeedback = fb;
    haptic("ok");
    await window.runTeamPipeline(chat, team, msg.pipeline.prompt, msg, 999);
  };

  window.requestGraphRevision = async function (msgId) {
    const chat = S.chats.find(c => c.id === S.activeChatId);
    const msg = chat?.messages.find(m => m.id === msgId);
    const team = S.teams.find(t => t.id === msg?.pipeline?.teamId);
    if (!chat || !msg || !team) return;
    const fb = document.getElementById("v38-app-fb-" + msgId)?.value?.trim();
    if (!fb) return showToast("Nhập góp ý chỉnh sửa vào ô trên trước khi yêu cầu sửa", "warn");
    msg.pipeline.approvalFeedback = fb;
    haptic("tap");
    await window.runTeamPipeline(chat, team, msg.pipeline.prompt, msg, 999);
  };

  window.acceptGraphDraftAsFinal = async function (msgId) {
    const chat = S.chats.find(c => c.id === S.activeChatId);
    const msg = chat?.messages.find(m => m.id === msgId);
    const team = S.teams.find(t => t.id === msg?.pipeline?.teamId);
    if (!chat || !msg?.pipeline) return;
    msg.pipeline.awaitingGraphApproval = false;
    if (msg.pipeline.graphState) {
      msg.pipeline.graphState.nodes.approval = "done";
      msg.pipeline.graphState.nodes.lead_out = "done";
    }
    msg.text = msg.pipeline.draftOutput || msg.text;
    if (team) {
      const gs = msg.pipeline.graphState || {};
      await recordTeamRunLog(team, msg.pipeline.prompt, { score: gs.checkerScore || 8.5, passed: gs.checkerPassed !== false, agentScores: gs.agentScores || {} }, gs.loopsUsed || 0, msg.text);
    }
    await dbPut("chats", chat).catch(() => {});
    apiFetch("/sync/chats", { method: "POST", body: chat }).catch(() => {});
    renderMessages();
    haptic("ok");
    showToast("Đã chốt bản nháp làm kết quả cuối", "ok");
  };

  /* =========================================================================
     7. TEAM ARCHITECT 5-QUESTION WIZARD (Images 2–4 Intake -> Full Graph Team)
     ========================================================================= */
  window.openTeamArchitectModal = function () {
    if (!canUseTeams()) return showToast("Đội ngũ AI yêu cầu Key hạng Pro Max trở lên", "warn");
    haptic("tap");
    openModal(`<h3 style="font-size:17px;font-weight:600;margin-bottom:4px;">Kiến trúc sư lập Team (5 câu hỏi)</h3>
      <p style="font-size:12px;color:var(--ink-2);margin-bottom:10px;">Trả lời nhanh 5 câu để AI thiết kế trọn bộ Team 3–5 Agent + Checklist DONE WELL + Graph Song song + Quality Loop.</p>

      <div class="v38-q-block">
        <div class="v38-q-title">1. Công việc ngốn thời gian nhất bạn muốn giao cho Team?</div>
        <input id="ta-q1" class="field" placeholder="VD: Làm chuỗi bài content TikTok/Facebook chất lượng cao mỗi ngày" />
        <div class="v38-chip-row">
          <button type="button" class="v38-sugg-chip" onclick="document.getElementById('ta-q1').value='Xây dựng nội dung truyền thông & bài bán hàng chuẩn tâm lý'">Content & Bán hàng</button>
          <button type="button" class="v38-sugg-chip" onclick="document.getElementById('ta-q1').value='Phân tích biểu đồ XAUUSD/NASDAQ đa khung và lọc kèo kỷ luật'">Trading Đa khung</button>
          <button type="button" class="v38-sugg-chip" onclick="document.getElementById('ta-q1').value='Thiết kế, viết code sạch và kiểm thử ứng dụng web/mobile'">Code & Audit</button>
          <button type="button" class="v38-sugg-chip" onclick="document.getElementById('ta-q1').value='Giải đề thi thử Toán Văn Anh 12 bám sát barem và soi bẫy'">Ôn thi D01</button>
        </div>
      </div>

      <div class="v38-q-block">
        <div class="v38-q-title">2. Đầu vào thực tế bạn thường ném vào phòng Team?</div>
        <input id="ta-q2" class="field" placeholder="VD: Ý tưởng thô 2 dòng, ảnh chụp màn hình, file PDF hoặc mã nguồn cũ" />
        <div class="v38-chip-row">
          <button type="button" class="v38-sugg-chip" onclick="document.getElementById('ta-q2').value='Ý tưởng ngắn 2–3 dòng + tài liệu ghi chú boi-canh.md'">Ý tưởng ngắn + ghi chú</button>
          <button type="button" class="v38-sugg-chip" onclick="document.getElementById('ta-q2').value='Ảnh chụp biểu đồ H4/M15/M5 hoặc ảnh đề bài'">Ảnh chart / Ảnh đề</button>
          <button type="button" class="v38-sugg-chip" onclick="document.getElementById('ta-q2').value='File mã nguồn, log lỗi thực tế và yêu cầu nâng cấp'">Code + Log lỗi</button>
        </div>
      </div>

      <div class="v38-q-block">
        <div class="v38-q-title">3. Tiêu chuẩn "LÀM TỐT" (DONE WELL) quan trọng nhất?</div>
        <input id="ta-q3" class="field" placeholder="VD: Có số liệu/ví dụ thật, đúng cấu trúc, không văn phong AI, dùng được ngay" />
        <div class="v38-chip-row">
          <button type="button" class="v38-sugg-chip" onclick="document.getElementById('ta-q3').value='Tự nhiên, sắc bén, có ví dụ thật, không văn phong máy móc'">Sắc bén, không văn AI</button>
          <button type="button" class="v38-sugg-chip" onclick="document.getElementById('ta-q3').value='Chính xác 100%, tự kiểm chứng ngược, có SL/R:R hoặc barem rõ'">Chính xác & Kiểm chứng</button>
        </div>
      </div>

      <div class="v38-q-block">
        <div class="v38-q-title">4. Điều CẤM TUYỆT ĐỐI (NEVER) & Điểm phải xin duyệt trước?</div>
        <input id="ta-q4" class="field" placeholder="VD: Cấm bịa dữ liệu; xin duyệt trước khi chốt phương án cuối hoặc đổi cấu trúc" />
        <div class="v38-chip-row">
          <button type="button" class="v38-sugg-chip" onclick="document.getElementById('ta-q4').value='Cấm bịa số liệu/trích dẫn; hỏi duyệt trước khi thay đổi hướng chính'">Cấm bịa & Hỏi trước</button>
          <button type="button" class="v38-sugg-chip" onclick="document.getElementById('ta-q4').value='Cấm cắt bớt code bằng ...; cấm bỏ qua lỗi biên'">Cấm cắt code</button>
        </div>
      </div>

      <div class="v38-q-block">
        <div class="v38-q-title">5. Quy mô Đội & Chế độ kiểm soát</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <select id="ta-q5-cnt" class="field">
            <option value="4" selected>4 Agent (Lead + 2 Song song + Checker)</option>
            <option value="5">5 Agent (Full Swarm + Writer + Checker)</option>
            <option value="3">3 Agent (Lead + Thực thi + Checker)</option>
          </select>
          <select id="ta-q5-app" class="field">
            <option value="1" selected>Bật Approval Node (Duyệt giữa luồng)</option>
            <option value="0">Chạy thẳng tự động đến cuối</option>
          </select>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-top:10px;">
        <button type="button" id="btn-run-architect" class="btn-p tap" style="flex:1;" onclick="generateTeamFromArchitect()">Dựng trọn bộ Team Graph</button>
        <button type="button" class="btn-s tap" onclick="closeModal()">Đóng</button>
      </div>`);
  };

  window.generateTeamFromArchitect = async function () {
    const q1 = document.getElementById("ta-q1")?.value?.trim();
    if (!q1) return showToast("Nhập mục tiêu công việc ở câu 1 trước nhé", "warn");
    const q2 = document.getElementById("ta-q2")?.value?.trim() || "Yêu cầu văn bản và tài liệu bối cảnh";
    const q3 = document.getElementById("ta-q3")?.value?.trim() || "Chính xác, cụ thể, không bịa đặt, sẵn sàng dùng ngay";
    const q4 = document.getElementById("ta-q4")?.value?.trim() || "Không bịa thông tin; xin duyệt trước hành động quan trọng";
    const cnt = Number(document.getElementById("ta-q5-cnt")?.value || 4);
    const useApproval = document.getElementById("ta-q5-app")?.value === "1";

    const btn = document.getElementById("btn-run-architect");
    if (btn) { btn.disabled = true; btn.textContent = "Kiến trúc sư AI đang thiết kế..."; }

    const mods = getAllowedRealModels();
    const strongMod = mods.find(m => /astra|opus|sonnet|pro/i.test(m.id))?.id || mods[0]?.id || S.cfg.selectedModel;
    const fastMod = mods.find(m => /sol|flash|mini/i.test(m.id))?.id || strongMod;

    const sys = `Bạn là Kiến trúc sư thiết kế Đội ngũ AI Agent (Swarms · Graphs · Quality Loops).
Trả về DUY NHẤT 1 khối JSON hợp lệ (KHÔNG kèm markdown hay giải thích ngoài JSON) theo cấu trúc:
{
  "name": "Tên Team ngắn gọn",
  "desc": "Mô tả 1 câu",
  "teamMemory": "2 gạch đầu dòng nguyên tắc cốt lõi để Lead đọc trước mỗi lượt chạy",
  "members": [
    {
      "id": "lead",
      "role": "Lead · ...",
      "nodeRole": "lead",
      "parallelGroup": 0,
      "handoffLabel": "Brief ngắn",
      "prompt": "Chỉ dẫn chuyên môn chi tiết",
      "receiveImages": true,
      "spec": {
        "job": "1 nhiệm vụ duy nhất",
        "input": "Đầu vào",
        "output": "Đầu ra cụ thể",
        "doneWell": "Tiêu chí 1\\nTiêu chí 2\\nTiêu chí 3",
        "never": "Điều cấm tuyệt đối",
        "askMeFirst": "Điểm phải xin duyệt"
      }
    }
  ]
}
BẮT BUỘC: Đúng ${cnt} thành viên; phần tử đầu có nodeRole="lead", phần tử cuối có nodeRole="checker", các phần tử giữa có nodeRole="worker" (nếu có >=2 worker độc lập thì gán cùng parallelGroup=1 để chạy song song). Ngôn ngữ: Tiếng Việt sắc gọn.`;

    const usr = `1. Công việc chính: ${q1}\n2. Đầu vào: ${q2}\n3. Tiêu chuẩn DONE WELL: ${q3}\n4. Điều cấm NEVER & Xin phép: ${q4}\n5. Số Agent: ${cnt}, Approval Node: ${useApproval ? "Bật" : "Tắt"}`;

    try {
      const dummyChat = { id: "arch-" + Date.now() };
      const { text } = await callStatelessAgent(dummyChat, strongMod, "architect", sys, usr, () => {});
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("AI không trả về đúng định dạng JSON");
      const parsed = JSON.parse(match[0]);
      if (!Array.isArray(parsed.members) || parsed.members.length < 2) throw new Error("Danh sách Agent chưa hợp lệ");

      teamDraft = ensureTeamV38Shape({
        id: "team-" + Date.now(),
        name: parsed.name || "Team Graph Mới",
        desc: parsed.desc || q1.slice(0, 90),
        builtin: false,
        coordMode: "graph",
        visionMode: "smart",
        approvalBeforeFinal: useApproval,
        maxFixLoops: 2,
        liveContextSync: true,
        conflictDebate: true,
        teamMemory: parsed.teamMemory || "",
        runLogs: [],
        promptVersion: 1,
        v1v2History: [],
        members: parsed.members.slice(0, 6).map((m, idx) => ({
          id: m.id || ("m" + (idx + 1)),
          role: m.role || `Agent ${idx + 1}`,
          nodeRole: m.nodeRole || (idx === 0 ? "lead" : (idx === parsed.members.length - 1 ? "checker" : "worker")),
          parallelGroup: Number(m.parallelGroup || 0),
          handoffLabel: m.handoffLabel || "Bàn giao",
          prompt: m.prompt || "",
          modelId: (m.nodeRole === "lead" || m.nodeRole === "checker") ? strongMod : fastMod,
          enabled: true,
          receiveImages: m.receiveImages !== undefined ? Boolean(m.receiveImages) : idx < 2,
          files: [],
          spec: m.spec || {}
        }))
      });

      closeModal();
      switchView("team-editor");
      renderTeamEditorBody();
      haptic("ok");
      showToast(`Đã dựng xong "${teamDraft.name}" · Xem sơ đồ Graph và bấm Lưu Team`, "ok");
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = "Dựng trọn bộ Team Graph"; }
      showToast("Lỗi dựng Team: " + e.message, "err");
    }
  };

  /* =========================================================================
     8. TEAM EVOLUTION HUB (Team Memory + Run Log + Improvement Loop + v1 vs v2)
     ========================================================================= */
  let evoTab = "memory";
  window.openTeamEvolutionModal = function (teamId, tab = "memory") {
    const team = S.teams.find(t => t.id === teamId);
    if (!team) return;
    ensureTeamV38Shape(team);
    evoTab = tab;
    renderTeamEvolutionModal(team);
  };

  function getTeamStats(team) {
    const logs = team.runLogs || [];
    const cnt = logs.length;
    const avgScore = cnt ? Number((logs.reduce((a, r) => a + Number(r.score || 0), 0) / cnt).toFixed(1)) : 0;
    const passRate = cnt ? Math.round((logs.filter(r => r.passed).length / cnt) * 100) : 0;
    const agTotals = {};
    logs.forEach(r => {
      Object.entries(r.agentScores || {}).forEach(([id, sc]) => {
        if (!agTotals[id]) agTotals[id] = { sum: 0, n: 0 };
        agTotals[id].sum += Number(sc || 0);
        agTotals[id].n++;
      });
    });
    const perAgent = (team.members || []).filter(m => m.enabled !== false && m.nodeRole !== "checker").map(m => {
      const stat = agTotals[m.id];
      return { id: m.id, role: m.role, avg: stat ? Number((stat.sum / stat.n).toFixed(1)) : null, runs: stat ? stat.n : 0 };
    });
    const ranked = perAgent.filter(a => a.avg !== null).sort((a, b) => a.avg - b.avg);
    return { cnt, avgScore, passRate, perAgent, weakest: ranked[0] || null };
  }

  function renderTeamEvolutionModal(team) {
    const st = getTeamStats(team);
    const tabsHtml = `<div class="v38-tab-bar">
      <button type="button" class="v38-tab-btn tap ${evoTab === "memory" ? "active" : ""}" onclick="openTeamEvolutionModal('${team.id}','memory')">Team Memory</button>
      <button type="button" class="v38-tab-btn tap ${evoTab === "logs" ? "active" : ""}" onclick="openTeamEvolutionModal('${team.id}','logs')">Nhật ký (${st.cnt})</button>
      <button type="button" class="v38-tab-btn tap ${evoTab === "improve" ? "active" : ""}" onclick="openTeamEvolutionModal('${team.id}','improve')">Tối ưu Team</button>
      <button type="button" class="v38-tab-btn tap ${evoTab === "compare" ? "active" : ""}" onclick="openTeamEvolutionModal('${team.id}','compare')">Kiểm chứng v1/v2</button>
    </div>`;

    let bodyHtml = "";
    if (evoTab === "memory") {
      bodyHtml = `<p style="font-size:12.5px;color:var(--ink-2);margin-bottom:8px;">Agent Trưởng (Lead) sẽ đọc <b>Team Memory</b> trước mọi lượt chạy để không lặp lại lỗi cũ.</p>
        <textarea id="v38-tm-mem" class="field" rows="6" placeholder="• Luôn kiểm tra kỹ điều kiện biên&#10;• Không dùng văn mẫu sáo rỗng...">${esc(team.teamMemory || "")}</textarea>
        <div style="display:flex;gap:8px;margin-top:10px;">
          <button type="button" class="btn-p tap" style="flex:1;" onclick="saveTeamMemoryField('${team.id}')">Lưu Team Memory</button>
          <button type="button" class="btn-s tap" onclick="document.getElementById('v38-tm-mem').value=''">Xóa trắng</button>
        </div>`;
    } else if (evoTab === "logs") {
      bodyHtml = `<div class="v38-stat-grid">
          <div class="v38-stat-box"><span class="v38-stat-val num">${st.cnt}</span><span class="v38-stat-lbl">Lượt đã chạy</span></div>
          <div class="v38-stat-box"><span class="v38-stat-val num" style="color:var(--ok-ink);">${st.cnt ? st.avgScore : "—"}</span><span class="v38-stat-lbl">Điểm TB /10</span></div>
          <div class="v38-stat-box"><span class="v38-stat-val num" style="color:var(--accent-ink);">${st.cnt ? st.passRate + "%" : "—"}</span><span class="v38-stat-lbl">Tỉ lệ Đạt</span></div>
        </div>
        ${st.weakest ? `<div class="mem-chip-row" style="border:1px solid var(--warn-rim);background:var(--warn-soft);margin-bottom:10px;">
          <span style="font-size:12.5px;color:var(--warn-ink);">Agent cần tối ưu nhất: <b>${esc(st.weakest.role)}</b> (${st.weakest.avg}/10)</span>
          <button type="button" class="ws-chip-btn accent tap" onclick="openTeamEvolutionModal('${team.id}','improve')">Tối ưu ngay</button>
        </div>` : ""}
        ${st.perAgent.map(a => `<div class="mastery-row">
          <div style="display:flex;justify-content:space-between;font-size:12.5px;">
            <span>${esc(a.role)}</span>
            <strong class="num" style="color:${a.avg !== null && a.avg < 7.5 ? "var(--warn-ink)" : "var(--ink)"};">${a.avg !== null ? `${a.avg}/10` : "Chưa có"}</strong>
          </div>
          <div class="mastery-track"><div class="mastery-fill" style="transform:scaleX(${a.avg !== null ? Math.max(0.05, a.avg / 10) : 0.05});background:${a.avg !== null && a.avg < 7.5 ? "var(--warn)" : "var(--ok)"};"></div></div>
        </div>`).join("")}
        <div style="margin-top:10px;max-height:190px;overflow:auto;display:flex;flex-direction:column;gap:6px;">
          ${(team.runLogs || []).slice(0, 8).map(r => `<div class="mem-chip-row">
            <div style="flex:1;min-width:0;">
              <div style="font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(r.prompt)}</div>
              <div style="font-size:11px;color:var(--ink-3);" class="num">v${r.promptVersion || 1} · ${r.loops ? `${r.loops} vòng sửa` : "Đạt ngay"} · ${new Date(r.ts).toLocaleDateString("vi-VN")}</div>
            </div>
            <span class="v38-score-pill ${r.score >= 8 ? "pass" : (r.score >= 6.5 ? "warn" : "fail")}">${r.score}/10</span>
          </div>`).join("") || `<div style="font-size:12.5px;color:var(--ink-3);padding:8px 0;">Chưa có lịch sử chạy. Hãy chạy Team ở chế độ Graph ít nhất 1 lượt để hệ thống ghi điểm tự động.</div>`}
        </div>`;
    } else if (evoTab === "improve") {
      const prop = team.lastProposal;
      bodyHtml = `<p style="font-size:12.5px;color:var(--ink-2);margin-bottom:10px;"><b>Improvement Loop:</b> Lead rà Nhật ký chạy, tìm đúng <b>1 Agent yếu nhất</b> và đề xuất <b>1 chỉnh sửa Prompt duy nhất</b> — chỉ áp dụng khi bạn bấm Duyệt.</p>
        <button type="button" id="btn-run-improve" class="btn-blue tap" style="width:100%;margin-bottom:10px;" onclick="runTeamImprovementLoop('${team.id}')">Phân tích Nhật ký &amp; Đề xuất 1 nâng cấp Prompt</button>
        ${prop ? `<div class="card-item" style="margin-bottom:0;background:var(--surface-0);">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;">
            <strong style="font-size:13.5px;">Đề xuất sửa: ${esc(prop.agentRole)}</strong>
            <span class="tag-st st-unused">Chờ duyệt</span>
          </div>
          <div style="font-size:12px;color:var(--warn-ink);margin-bottom:8px;">Lý do: ${esc(prop.reason)}</div>
          <div style="font-size:11.5px;color:var(--ink-3);margin-bottom:4px;">Prompt hiện tại (v${team.promptVersion || 1}):</div>
          <div class="v38-diff-box" style="margin-bottom:8px;">${esc(prop.oldPrompt)}</div>
          <div style="font-size:11.5px;color:var(--ok-ink);margin-bottom:4px;">Prompt đề xuất (v${(team.promptVersion || 1) + 1}):</div>
          <div class="v38-diff-box proposed" style="margin-bottom:10px;">${esc(prop.newPrompt)}</div>
          <div style="display:flex;gap:8px;">
            <button type="button" class="btn-p tap" style="flex:1;" onclick="approveTeamPromptUpgrade('${team.id}')">Duyệt áp dụng v${(team.promptVersion || 1) + 1}</button>
            <button type="button" class="btn-s tap" onclick="dismissTeamPromptUpgrade('${team.id}')">Bỏ qua</button>
          </div>
        </div>` : `<div style="font-size:12px;color:var(--ink-3);">Chưa có đề xuất đang chờ duyệt.</div>`}`;
    } else if (evoTab === "compare") {
      const hasSnap = Boolean(team.prevVersionSnapshot);
      const lastPrompt = team.runLogs?.[0]?.prompt || "";
      const hist = team.v1v2History || [];
      bodyHtml = `<p style="font-size:12.5px;color:var(--ink-2);margin-bottom:8px;">Chấm điểm đối đầu trực tiếp giữa bản cũ (<b>v1</b>) và bản vừa nâng cấp (<b>v2</b>) trên cùng 1 đề bài thật theo checklist DONE WELL.</p>
        ${!hasSnap ? `<div class="mem-chip-row" style="margin-bottom:10px;border:1px solid var(--rim-hi);">
          <span style="font-size:12px;color:var(--ink-2);">Hãy duyệt ít nhất 1 đề xuất ở tab <b>Tối ưu Team</b> để lưu mốc so sánh v1 vs v2.</span>
        </div>` : `<div class="mem-chip-row" style="margin-bottom:8px;border:1px solid var(--accent-rim);background:var(--accent-soft);">
          <span style="font-size:12px;color:var(--info-ink);">Sẵn sàng so sánh <b>${esc(team.prevVersionSnapshot.agentRole)}</b>: v${team.prevVersionSnapshot.version} vs v${team.promptVersion}</span>
        </div>
        <label class="f-lbl" style="margin-top:0;">Đề bài kiểm chứng thật</label>
        <textarea id="v38-bench-prompt" class="field" rows="2" placeholder="Nhập 1 nhiệm vụ thật của bạn...">${esc(lastPrompt)}</textarea>
        <div style="display:flex;gap:8px;margin-top:8px;margin-bottom:12px;">
          <button type="button" id="btn-run-v1v2" class="btn-p tap" style="flex:1;" onclick="runTeamV1V2Benchmark('${team.id}')">Chạy chấm điểm v1 vs v2</button>
          <button type="button" class="btn-s tap" onclick="rollbackTeamPrevVersion('${team.id}')">Hoàn tác về v${team.prevVersionSnapshot.version}</button>
        </div>`}
        ${hist.slice(0, 3).map(h => {
          const delta = Number((h.v2Score - h.v1Score).toFixed(1));
          const win2 = delta >= 0;
          return `<div class="card-item" style="background:var(--surface-0);margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:6px;">
              <strong style="font-size:12.5px;">${esc(h.agentRole)} · ${esc(h.prompt.slice(0, 48))}</strong>
              <span class="v38-score-pill ${win2 ? "pass" : "fail"}">${delta >= 0 ? "+" : ""}${delta} điểm</span>
            </div>
            <div class="v38-compare-grid">
              <div class="v38-compare-col ${!win2 ? "winner" : ""}">
                <div style="display:flex;justify-content:space-between;font-size:12px;"><b>Bản cũ (v${h.v1Ver})</b><span class="num">${h.v1Score}/10</span></div>
                <div style="font-size:11.5px;color:var(--ink-2);line-height:1.45;">${esc(h.v1Excerpt)}</div>
              </div>
              <div class="v38-compare-col ${win2 ? "winner" : ""}">
                <div style="display:flex;justify-content:space-between;font-size:12px;"><b>Bản mới (v${h.v2Ver})</b><span class="num">${h.v2Score}/10</span></div>
                <div style="font-size:11.5px;color:var(--ink-2);line-height:1.45;">${esc(h.v2Excerpt)}</div>
              </div>
            </div>
          </div>`;
        }).join("")}`;
    }

    openModal(`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">
        <div>
          <h3 style="font-size:16.5px;font-weight:600;margin:0;">Tiến hóa Team · ${esc(team.name)}</h3>
          <div style="font-size:11.5px;color:var(--ink-3);" class="num">Phiên bản Prompt v${team.promptVersion || 1}</div>
        </div>
        <button type="button" class="mini-act tap" onclick="closeModal()">${ICON_X}</button>
      </div>
      ${tabsHtml}
      <div>${bodyHtml}</div>`);
  }

  window.saveTeamMemoryField = async function (teamId) {
    const team = S.teams.find(t => t.id === teamId); if (!team) return;
    team.teamMemory = (document.getElementById("v38-tm-mem")?.value || "").trim().slice(0, 2000);
    await dbPut("teams", team).catch(() => {});
    apiFetch("/sync/teams", { method: "POST", body: team }).catch(() => {});
    haptic("ok");
    showToast("Đã lưu Team Memory", "ok");
  };

  window.runTeamImprovementLoop = async function (teamId) {
    const team = S.teams.find(t => t.id === teamId); if (!team) return;
    ensureTeamV38Shape(team);
    const btn = document.getElementById("btn-run-improve");
    if (btn) { btn.disabled = true; btn.textContent = "Lead đang phân tích Nhật ký..."; }

    const st = getTeamStats(team);
    const targetMem = (st.weakest && team.members.find(m => m.id === st.weakest.id))
      || team.members.find(m => m.enabled !== false && m.nodeRole === "worker")
      || team.members[0];
    const mods = getAllowedRealModels();
    const leadMod = team.members.find(m => m.nodeRole === "lead")?.modelId || mods[0]?.id || S.cfg.selectedModel;

    const logSummary = (team.runLogs || []).slice(0, 8).map(r => `- [${r.score}/10 | Loop:${r.loops}] "${r.prompt}" -> ${r.summary}`).join("\n") || "(Chưa có log, hãy tối ưu dựa trên đặc tả và cấu trúc prompt hiện tại)";
    const sys = `Bạn là Agent Trưởng (Lead) chạy Vòng lặp Tối ưu (Improvement Loop).
Phân tích Nhật ký chạy và chỉ đề xuất ĐÚNG 1 chỉnh sửa Prompt sắc bén nhất cho Agent yếu nhất "${targetMem.role}".
Trả về DUY NHẤT 1 khối JSON:
{"reason":"Lý do ngắn gọn 1–2 câu chỉ ra điểm yếu thực tế","newPrompt":"Toàn bộ nội dung Prompt mới đã cải tiến sắc gọn, chống lặp lỗi cũ"}`;
    const usr = `TEAM: ${team.name}\nTEAM MEMORY:\n${team.teamMemory || "(trống)"}\n\nNHẬT KÝ CHẠY GẦN ĐÂY:\n${logSummary}\n\nAGENT CẦN NÂNG CẤP: ${targetMem.role}\nPROMPT HIỆN TẠI:\n${targetMem.prompt}\nDONE WELL:\n${targetMem.spec?.doneWell || ""}`;

    try {
      const { text } = await callStatelessAgent({ id: "imp-" + Date.now() }, leadMod, "lead_improve", sys, usr, () => {});
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("Không phân tích được JSON đề xuất");
      const parsed = JSON.parse(m[0]);
      if (!parsed.newPrompt) throw new Error("Đề xuất thiếu nội dung prompt mới");
      team.lastProposal = {
        agentId: targetMem.id,
        agentRole: targetMem.role,
        reason: String(parsed.reason || "Tăng độ chính xác theo tiêu chí DONE WELL"),
        oldPrompt: targetMem.prompt || "",
        newPrompt: String(parsed.newPrompt).trim(),
        createdAt: Date.now()
      };
      await dbPut("teams", team).catch(() => {});
      apiFetch("/sync/teams", { method: "POST", body: team }).catch(() => {});
      haptic("ok");
      renderTeamEvolutionModal(team);
      showToast("Đã có 1 đề xuất nâng cấp · Kiểm tra rồi bấm Duyệt", "ok");
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = "Phân tích Nhật ký & Đề xuất 1 nâng cấp Prompt"; }
      showToast("Lỗi tối ưu Team: " + e.message, "err");
    }
  };

  window.approveTeamPromptUpgrade = async function (teamId) {
    const team = S.teams.find(t => t.id === teamId); if (!team?.lastProposal) return;
    const prop = team.lastProposal;
    const mem = team.members.find(m => m.id === prop.agentId);
    if (!mem) return;
    // Save snapshot for v1 vs v2 benchmark & safe rollback!
    team.prevVersionSnapshot = {
      version: team.promptVersion || 1,
      agentId: mem.id,
      agentRole: mem.role,
      oldPrompt: mem.prompt || ""
    };
    mem.prompt = prop.newPrompt;
    team.promptVersion = (team.promptVersion || 1) + 1;
    team.lastProposal = null;
    await dbPut("teams", team).catch(() => {});
    apiFetch("/sync/teams", { method: "POST", body: team }).catch(() => {});
    haptic("ok");
    evoTab = "compare";
    renderTeamEvolutionModal(team);
    showToast(`Đã nâng cấp ${mem.role} lên v${team.promptVersion} · Chạy kiểm chứng v1/v2 ngay`, "ok");
  };

  window.dismissTeamPromptUpgrade = async function (teamId) {
    const team = S.teams.find(t => t.id === teamId); if (!team) return;
    team.lastProposal = null;
    await dbPut("teams", team).catch(() => {});
    renderTeamEvolutionModal(team);
  };

  window.rollbackTeamPrevVersion = async function (teamId) {
    const team = S.teams.find(t => t.id === teamId); if (!team?.prevVersionSnapshot) return;
    const snap = team.prevVersionSnapshot;
    const mem = team.members.find(m => m.id === snap.agentId);
    if (mem) mem.prompt = snap.oldPrompt;
    team.promptVersion = snap.version;
    team.prevVersionSnapshot = null;
    await dbPut("teams", team).catch(() => {});
    apiFetch("/sync/teams", { method: "POST", body: team }).catch(() => {});
    haptic("ok");
    renderTeamEvolutionModal(team);
    showToast(`Đã hoàn tác về bản v${snap.version}`, "ok");
  };

  window.runTeamV1V2Benchmark = async function (teamId) {
    const team = S.teams.find(t => t.id === teamId); if (!team?.prevVersionSnapshot) return;
    const promptTxt = document.getElementById("v38-bench-prompt")?.value?.trim();
    if (!promptTxt) return showToast("Nhập 1 đề bài thật để chấm v1 vs v2", "warn");
    const snap = team.prevVersionSnapshot;
    const mem = team.members.find(m => m.id === snap.agentId);
    const checker = team.members.find(m => m.nodeRole === "checker") || team.members[team.members.length - 1];
    if (!mem || !checker) return;

    const btn = document.getElementById("btn-run-v1v2");
    if (btn) { btn.disabled = true; btn.textContent = "Đang chạy đối đầu v1 vs v2..."; }

    try {
      const dummyChat = { id: "bench-" + Date.now() };
      const modId = mem.modelId || S.cfg.selectedModel;
      const chkMod = checker.modelId || modId;

      const memV1 = { ...mem, prompt: snap.oldPrompt };
      const [res1, res2] = await Promise.all([
        callStatelessAgent(dummyChat, modId, "bench_v1", compileMemberSystemPrompt(team, memV1, "", ""), `NHIỆM VỤ:\n${promptTxt}`, () => {}),
        callStatelessAgent(dummyChat, modId, "bench_v2", compileMemberSystemPrompt(team, mem, "", ""), `NHIỆM VỤ:\n${promptTxt}`, () => {})
      ]);

      const judgeSys = `Bạn là Checker chấm điểm đối đầu công tâm 2 phương án A (v1) và B (v2) theo đúng checklist DONE WELL:\n${mem.spec?.doneWell || "Chính xác, rõ ràng, thực chiến"}\nTrả về DUY NHẤT 1 khối JSON:\n{"v1Score":7.2,"v2Score":8.9,"v1Note":"Nhận xét 1 câu về bản cũ","v2Note":"Nhận xét 1 câu về bản mới"}`;
      const judgeUsr = `ĐỀ BÀI:\n${promptTxt}\n\n=== PHƯƠNG ÁN A (v${snap.version}) ===\n${res1.text.slice(0, 3500)}\n\n=== PHƯƠNG ÁN B (v${team.promptVersion}) ===\n${res2.text.slice(0, 3500)}`;
      const { text: judgeRaw } = await callStatelessAgent(dummyChat, chkMod, "bench_judge", judgeSys, judgeUsr, () => {});
      const jm = judgeRaw.match(/\{[\s\S]*\}/);
      if (!jm) throw new Error("Checker không trả về JSON điểm");
      const j = JSON.parse(jm[0]);

      team.v1v2History = team.v1v2History || [];
      team.v1v2History.unshift({
        ts: Date.now(),
        prompt: promptTxt.slice(0, 140),
        agentRole: mem.role,
        v1Ver: snap.version,
        v2Ver: team.promptVersion,
        v1Score: Number(parseFloat(j.v1Score || 7).toFixed(1)),
        v2Score: Number(parseFloat(j.v2Score || 8).toFixed(1)),
        v1Excerpt: String(j.v1Note || res1.text.slice(0, 140)),
        v2Excerpt: String(j.v2Note || res2.text.slice(0, 140))
      });
      team.v1v2History = team.v1v2History.slice(0, 10);
      await dbPut("teams", team).catch(() => {});
      apiFetch("/sync/teams", { method: "POST", body: team }).catch(() => {});
      haptic("ok");
      renderTeamEvolutionModal(team);
      showToast("Đã hoàn tất chấm điểm v1 vs v2", "ok");
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = "Chạy chấm điểm v1 vs v2"; }
      showToast("Lỗi chấm v1 vs v2: " + e.message, "err");
    }
  };

  /* =========================================================================
     9. UPGRADED TEAMS PAGE + TEAM EDITOR (Graph Presets, Live SVG, 6-Slot Spec)
     ========================================================================= */
  window.applyTeamPresetV38 = function (key) {
    const p = V38_GRAPH_PRESETS.find(x => x.key === key);
    if (!p) return;
    const mods = getAllowedRealModels();
    const fallbackId = mods[0]?.id || "gpt-6.2-sol";
    teamDraft = ensureTeamV38Shape({
      id: "team-" + Date.now(),
      builtin: false,
      ...JSON.parse(JSON.stringify(p)),
      members: p.members.map(m => ({
        ...m,
        modelId: mods.some(x => x.id === m.modelId) ? m.modelId : fallbackId
      }))
    });
    haptic("ok");
    renderTeamEditorBody();
    showToast(`Đã nạp mẫu Graph "${p.name}" · Bấm Lưu Team để dùng ngay`, "ok");
  };

  window.renderTeamsPage = function () {
    const box = document.getElementById("teams-body");
    if (!box) return;
    if (!canUseTeams()) {
      box.innerHTML = `<div class="card-item lg-card"><strong>Tính năng Đội ngũ AI (Teams) yêu cầu Key hạng Pro Max hoặc Ultra</strong><p class="p-sub" style="margin:6px 0 0;">Nâng cấp gói Key để mở khóa Đội Agent Đồ thị (Swarms · Loops · Graphs) và Tự tiến hóa v1/v2.</p></div>`;
      return;
    }

    const archBanner = `<div class="card-item lg-card" style="border-color:var(--accent-rim);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
      <div style="flex:1;min-width:200px;">
        <strong style="font-size:14.5px;color:var(--ink);">Kiến trúc sư lập Team 5 câu hỏi</strong>
        <div style="font-size:12px;color:var(--ink-2);margin-top:2px;">Biến AI thành cả đội 3–5 Agent có nhánh song song, Checker tự sửa 2 vòng và Team Memory chỉ trong 1 chạm.</div>
      </div>
      <button type="button" class="btn-blue tap" onclick="openTeamArchitectModal()">Mở Kiến trúc sư</button>
    </div>`;

    box.innerHTML = archBanner + S.teams.map((rawTm, idx) => {
      const tm = ensureTeamV38Shape(rawTm);
      const activeCnt = (tm.members || []).filter(m => m.enabled !== false).length;
      const filesCnt = (tm.members || []).reduce((a, m) => a + (m.files?.length || 0), 0);
      const st = getTeamStats(tm);
      const modeLbl = tm.coordMode === "graph" ? "Graph Swarm · Loop" : (tm.coordMode === "council" ? "Hội đồng song song" : "Dây chuyền nối tiếp");

      return `<div class="card-item lg-card stagger-item" style="--stagger-i:${idx}">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <strong style="font-size:15px;">${esc(tm.name)}</strong>
            <span class="tag-st ${tm.coordMode === "graph" ? "st-active" : "st-unused"}">${modeLbl}</span>
            ${st.cnt ? `<span class="v38-score-pill ${st.avgScore >= 8 ? "pass" : "warn"}">${st.avgScore}/10 · ${st.cnt} lượt</span>` : ""}
          </div>
          <span class="num" style="font-size:12px;color:var(--ink-2);">${activeCnt} Agent · v${tm.promptVersion || 1}${filesCnt ? ` · ${filesCnt} tệp` : ""}</span>
        </div>
        <div style="font-size:12.5px;color:var(--ink-2);margin-top:5px;">${esc(tm.desc || "")}</div>
        <div class="file-tag-list" style="margin-top:8px;">
          ${(tm.members || []).filter(m => m.enabled !== false).map(m => `<span class="file-mini-tag">${esc(m.role)} · ${esc(S.models.find(x => x.id === m.modelId)?.short || m.modelId)}</span>`).join("")}
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;">
          <button type="button" class="btn-p tap" style="height:36px;font-size:13px;" onclick="openTeamWorkspace('${tm.id}')">Vào phòng Team</button>
          <button type="button" class="btn-blue tap" style="height:36px;font-size:13px;" onclick="openTeamEvolutionModal('${tm.id}','memory')">Tiến hóa &amp; Memory</button>
          <button type="button" class="btn-s tap" style="height:36px;font-size:13px;" onclick="openTeamEditor('${tm.id}')">Cấu hình Graph</button>
          ${!tm.builtin ? `<button type="button" class="btn-danger tap" style="height:36px;font-size:13px;" onclick="deleteCustomTeam('${tm.id}')">Xóa</button>` : ""}
        </div>
      </div>`;
    }).join("") + (typeof buildTeamsContextHubHtml === "function" ? buildTeamsContextHubHtml() : "");
  };

  window.renderTeamEditorBody = function () {
    const box = document.getElementById("team-editor-body");
    if (!box || !teamDraft) return;
    ensureTeamV38Shape(teamDraft);
    const mods = getAllowedRealModels();
    const fallbackId = mods[0]?.id || "gpt-6.2-sol";
    if (!teamDraft.visionMode) teamDraft.visionMode = "smart";
    if (teamDraft.liveContextSync === undefined) teamDraft.liveContextSync = true;
    if (teamDraft.conflictDebate === undefined) teamDraft.conflictDebate = true;

    const presetBar = !teamDraft.builtin ? `<div style="margin-bottom:10px;">
      <div style="font-size:12.5px;color:var(--ink-2);margin-bottom:6px;font-weight:500;">Mẫu Đội ngũ Graph 1 chạm (Swarms · Loops · Workflows):</div>
      <div class="preset-grid">
        ${V38_GRAPH_PRESETS.map(p => `<button type="button" class="preset-btn tap-soft" onclick="applyTeamPresetV38('${p.key}')">
          <strong style="font-size:13px;color:var(--ink);">${esc(p.name)}</strong>
          <span style="font-size:11.5px;color:var(--ink-3);line-height:1.4;">${esc(p.desc)}</span>
        </button>`).join("")}
      </div>
    </div>` : "";

    const graphPreview = teamDraft.coordMode === "graph" ? renderTeamGraphSvg(teamDraft, null) : "";

    box.innerHTML = presetBar + graphPreview + `<div class="card-item lg-card">
      <h3 style="font-size:16.5px;font-weight:600;margin-bottom:6px;">${teamDraft.builtin ? "Cấu hình Team Lập trình" : "Thiết lập Đội ngũ AI (2–6 Agent)"}</h3>
      <label class="f-lbl">Tên Đội ngũ</label>
      <input id="te-name" class="field" value="${esc(teamDraft.name)}" ${teamDraft.builtin ? "readonly" : ""} placeholder="VD: Team Content Swarm" oninput="teamDraft.name=this.value" />
      <label class="f-lbl">Mô tả mục tiêu chung</label>
      <input id="te-desc" class="field" value="${esc(teamDraft.desc)}" placeholder="Mô tả nhiệm vụ chính của đội ngũ" oninput="teamDraft.desc=this.value" />

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div>
          <label class="f-lbl">Kiến trúc phối hợp</label>
          <select class="field" onchange="teamDraft.coordMode=this.value;renderTeamEditorBody()">
            <option value="graph" ${teamDraft.coordMode === "graph" ? "selected" : ""}>Graph Swarm + Quality Loop (Mới v3.8)</option>
            <option value="council" ${teamDraft.coordMode === "council" ? "selected" : ""}>Hội đồng song song + Chủ tọa</option>
            <option value="sequential" ${teamDraft.coordMode === "sequential" ? "selected" : ""}>Dây chuyền nối tiếp (1→2→3...)</option>
          </select>
        </div>
        <div>
          <label class="f-lbl">Chế độ nhận ảnh (Vision)</label>
          <select class="field" onchange="setTeamVisionModeDraft(this.value)">
            <option value="smart" ${teamDraft.visionMode !== "all" ? "selected" : ""}>Tiết kiệm (Agent đầu xem ảnh)</option>
            <option value="all" ${teamDraft.visionMode === "all" ? "selected" : ""}>Đa góc nhìn (Cả Team xem ảnh)</option>
          </select>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div>
          <label class="f-lbl">Quality Loop (Checker trả sửa)</label>
          <select class="field" onchange="teamDraft.maxFixLoops=Number(this.value);renderTeamEditorBody()">
            <option value="2" ${Number(teamDraft.maxFixLoops) === 2 ? "selected" : ""}>Tối đa 2 vòng (Khuyên dùng)</option>
            <option value="1" ${Number(teamDraft.maxFixLoops) === 1 ? "selected" : ""}>Tối đa 1 vòng</option>
            <option value="0" ${!Number(teamDraft.maxFixLoops) ? "selected" : ""}>Tắt</option>
          </select>
        </div>
        <div>
          <label class="f-lbl">Hồ sơ boi-canh.md khóa cứng</label>
          <select class="field" onchange="teamDraft.contextId=this.value||null">
            <option value="">Tự động theo phiên chat</option>
            ${S.contexts.map(c => `<option value="${esc(c.id)}" ${teamDraft.contextId === c.id ? "selected" : ""}>${esc(c.title)}</option>`).join("")}
          </select>
        </div>
      </div>

      <div class="s-row" style="margin-top:6px;" onclick="teamDraft.approvalBeforeFinal=!teamDraft.approvalBeforeFinal;this.querySelector('.sw').classList.toggle('on',teamDraft.approvalBeforeFinal);haptic('switch');renderTeamEditorBody()">
        <span>Bật Approval Node (dừng cho bạn duyệt trước khi Lead bàn giao cuối)</span>
        <div class="sw ${teamDraft.approvalBeforeFinal ? "on" : ""}"></div>
      </div>
      <div class="s-row" onclick="teamDraft.liveContextSync=!teamDraft.liveContextSync;this.querySelector('.sw').classList.toggle('on',teamDraft.liveContextSync);haptic('switch')">
        <span>Tự đồng bộ boi-canh.md sống giữa các bước</span>
        <div class="sw ${teamDraft.liveContextSync ? "on" : ""}"></div>
      </div>

      <label class="f-lbl">Team Memory (Lead tự đọc trước mỗi lần chạy)</label>
      <textarea class="field" rows="2" style="font-size:13px;" placeholder="• Ghi 1–3 nguyên tắc vàng hoặc bài học đã rút ra..." oninput="teamDraft.teamMemory=this.value">${esc(teamDraft.teamMemory || "")}</textarea>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin:12px 0 8px;">
      <strong style="font-size:14.5px;" class="num">Danh sách Agent (${teamDraft.members.length}/6)</strong>
      ${!teamDraft.builtin && teamDraft.members.length < 6 ? `<button type="button" class="btn-blue tap" style="height:34px;font-size:12.5px;" onclick="addTeamMemberDraft()">+ Thêm Agent</button>` : ""}
    </div>

    ${teamDraft.members.map((m, idx) => {
      ensureMemberSpec(m, idx, teamDraft.members.length);
      if (!mods.some(x => x.id === m.modelId)) m.modelId = fallbackId;
      const recvImg = m.receiveImages !== undefined ? m.receiveImages : (teamDraft.visionMode === "all" || idx < 2);
      m.receiveImages = recvImg;
      const specAccId = `v38-sp-${idx}`;
      return `<div class="member-editor-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
          <label style="display:inline-flex;align-items:center;gap:8px;font-size:13.5px;font-weight:520;">
            <input type="checkbox" ${m.enabled !== false ? "checked" : ""} onchange="teamDraft.members[${idx}].enabled=this.checked;renderTeamEditorBody()" style="width:16px;height:16px;accent-color:var(--accent);" />
            <span>Agent ${idx + 1}</span>
          </label>
          <div style="display:flex;gap:8px;align-items:center;">
            <label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--accent-ink);cursor:pointer;">
              <input type="checkbox" ${recvImg ? "checked" : ""} onchange="teamDraft.members[${idx}].receiveImages=this.checked" style="width:15px;height:15px;accent-color:var(--accent);" />
              <span>Nhận ảnh</span>
            </label>
            <button type="button" class="btn-s tap" style="height:30px;padding:0 10px;font-size:12px;" onclick="triggerMemberFilePick(${idx})">+ File</button>
            ${!teamDraft.builtin && teamDraft.members.length > 2 ? `<button type="button" class="mini-act tap" onclick="teamDraft.members.splice(${idx},1);renderTeamEditorBody()">${ICON_X}</button>` : ""}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div><label class="f-lbl" style="margin-top:0;">Tên &amp; Vai trò</label><input class="field" style="font-size:13.5px;" value="${esc(m.role)}" oninput="teamDraft.members[${idx}].role=this.value" /></div>
          <div><label class="f-lbl" style="margin-top:0;">Model riêng</label>
            <select class="field" style="font-size:13px;" onchange="teamDraft.members[${idx}].modelId=this.value">
              ${mods.map(mo => `<option value="${esc(mo.id)}" ${m.modelId === mo.id ? "selected" : ""}>${esc(mo.short || mo.title)} ${mo.cost_label ? `(${mo.cost_label})` : ""}</option>`).join("")}
            </select>
          </div>
        </div>

        ${teamDraft.coordMode === "graph" ? `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:6px;">
          <div>
            <label class="f-lbl" style="margin-top:0;">Vị trí đồ thị</label>
            <select class="field" style="font-size:12.5px;" onchange="teamDraft.members[${idx}].nodeRole=this.value;renderTeamEditorBody()">
              <option value="lead" ${m.nodeRole === "lead" ? "selected" : ""}>Lead (Trưởng)</option>
              <option value="worker" ${m.nodeRole === "worker" ? "selected" : ""}>Worker (Thực thi)</option>
              <option value="checker" ${m.nodeRole === "checker" ? "selected" : ""}>Checker (Kiểm định)</option>
            </select>
          </div>
          <div>
            <label class="f-lbl" style="margin-top:0;">Nhánh song song</label>
            <select class="field" style="font-size:12.5px;" onchange="teamDraft.members[${idx}].parallelGroup=Number(this.value);renderTeamEditorBody()">
              <option value="0" ${!Number(m.parallelGroup) ? "selected" : ""}>Nối tiếp</option>
              <option value="1" ${Number(m.parallelGroup) === 1 ? "selected" : ""}>Song song A</option>
              <option value="2" ${Number(m.parallelGroup) === 2 ? "selected" : ""}>Song song B</option>
            </select>
          </div>
          <div>
            <label class="f-lbl" style="margin-top:0;">Nhãn chuyển giao</label>
            <input class="field" style="font-size:12.5px;" value="${esc(m.handoffLabel || "")}" placeholder="VD: Bản thảo" oninput="teamDraft.members[${idx}].handoffLabel=this.value" />
          </div>
        </div>` : ""}

        <label class="f-lbl">Chỉ dẫn chuyên môn (Prompt)</label>
        <textarea class="field" rows="2" style="font-size:13px;" oninput="teamDraft.members[${idx}].prompt=this.value">${esc(m.prompt || "")}</textarea>

        <button type="button" class="v38-spec-toggle tap-soft" onclick="toggleAcc('${specAccId}','chev-${specAccId}')">
          <span>6 khung đặc tả chuẩn (JOB · INPUT · OUTPUT · DONE WELL · NEVER · ASK)</span>
          <span id="chev-${specAccId}" class="chev"><svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></span>
        </button>
        <div id="${specAccId}" class="acc-wrap">
          <div class="acc-inner">
            <div class="v38-spec-grid">
              <div><span class="v38-spec-tag">JOB (1 việc duy nhất)</span><input class="field" style="font-size:12.5px;" value="${esc(m.spec.job || "")}" oninput="teamDraft.members[${idx}].spec.job=this.value" /></div>
              <div><span class="v38-spec-tag">INPUT (Đầu vào)</span><input class="field" style="font-size:12.5px;" value="${esc(m.spec.input || "")}" oninput="teamDraft.members[${idx}].spec.input=this.value" /></div>
              <div class="v38-spec-full"><span class="v38-spec-tag">OUTPUT (Đầu ra bắt buộc)</span><input class="field" style="font-size:12.5px;" value="${esc(m.spec.output || "")}" oninput="teamDraft.members[${idx}].spec.output=this.value" /></div>
              <div class="v38-spec-full"><span class="v38-spec-tag">DONE WELL (Checklist 3–5 tiêu chí, mỗi dòng 1 ý)</span><textarea class="field" rows="3" style="font-size:12.5px;" oninput="teamDraft.members[${idx}].spec.doneWell=this.value">${esc(m.spec.doneWell || "")}</textarea></div>
              <div><span class="v38-spec-tag">NEVER (Điều cấm)</span><input class="field" style="font-size:12.5px;" value="${esc(m.spec.never || "")}" oninput="teamDraft.members[${idx}].spec.never=this.value" /></div>
              <div><span class="v38-spec-tag">ASK ME FIRST (Xin duyệt trước)</span><input class="field" style="font-size:12.5px;" value="${esc(m.spec.askMeFirst || "")}" oninput="teamDraft.members[${idx}].spec.askMeFirst=this.value" /></div>
            </div>
          </div>
        </div>

        ${(m.files || []).length ? `<div class="file-tag-list">${m.files.map((f, fi) => `<span class="file-mini-tag">${esc(f.name)} (${Math.max(1, Math.round((f.content || "").length / 1024))}KB)<button type="button" onclick="teamDraft.members[${idx}].files.splice(${fi},1);renderTeamEditorBody()">×</button></span>`).join("")}</div>` : ""}
      </div>`;
    }).join("")}`;
  };

  /* =========================================================================
     10. HOOKS INTO WORKSPACE TOP BAR & PIPELINE MESSAGE RENDERER
     ========================================================================= */
  const _origRenderBannerV38 = window.renderActiveContextBanner;
  window.renderActiveContextBanner = function () {
    if (typeof _origRenderBannerV38 === "function") _origRenderBannerV38();
    const team = S.activeTeamId ? S.teams.find(t => t.id === S.activeTeamId) : null;
    if (!team) return;
    ensureTeamV38Shape(team);
    const acts = document.querySelector("#active-context-banner .ws-top-acts");
    const meta = document.querySelector("#active-context-banner .ws-top-meta");
    if (meta && team.coordMode === "graph") {
      const cnt = (team.members || []).filter(m => m.enabled !== false).length;
      const st = getTeamStats(team);
      meta.textContent = `${cnt} Agent · Graph Swarm v${team.promptVersion || 1} · Loop ≤${team.maxFixLoops ?? 2}${st.cnt ? ` · TB ${st.avgScore}/10` : ""}`;
    }
    if (acts && !acts.querySelector(".v38-evo-chip")) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ws-chip-btn ok tap v38-evo-chip";
      btn.textContent = "Tiến hóa";
      btn.onclick = () => window.openTeamEvolutionModal(team.id, "memory");
      acts.insertBefore(btn, acts.firstChild);
    }
  };

  // Inject live Graph SVG, Approval Node & Evolution Button into rendered pipeline cards
  const _origRenderMessagesV38 = window.renderMessages;
  window.renderMessages = function () {
    if (typeof _origRenderMessagesV38 === "function") _origRenderMessagesV38();
    const chat = S.chats.find(c => c.id === S.activeChatId);
    if (!chat) return;
    (chat.messages || []).forEach(m => {
      if (!m?.pipeline) return;
      const p = m.pipeline;
      const row = document.querySelector(`[data-msg-id="${m.id}"] .pipeline-wrap`);
      if (!row) return;
      const team = S.teams.find(t => t.id === p.teamId);

      // 1. Insert live SVG Workflow Graph right after .team-prog-card for Graph teams
      if (team && (p.mode === "graph" || team.coordMode === "graph") && !row.querySelector(".v38-graph-card")) {
        const prog = row.querySelector(".team-prog-card");
        const wrapper = document.createElement("div");
        wrapper.innerHTML = renderTeamGraphSvg(team, p.graphState || null);
        if (prog && prog.parentNode) prog.parentNode.insertBefore(wrapper.firstElementChild, prog.nextSibling);
      }

      // 2. Insert Human-in-the-Loop Approval Node box when waiting for user approval
      if (p.awaitingGraphApproval && !row.querySelector(".v38-approval-box")) {
        const gs = p.graphState || {};
        const appBox = document.createElement("div");
        appBox.className = "v38-approval-box";
        appBox.innerHTML = `<div class="v38-approval-head">
            <span class="v38-approval-title">Điểm duyệt giữa luồng (Approval Node)</span>
            ${gs.checkerScore !== null && gs.checkerScore !== undefined ? `<span class="v38-score-pill ${gs.checkerScore >= 8 ? "pass" : "warn"}">Checker: ${gs.checkerScore}/10</span>` : ""}
          </div>
          <div style="font-size:12.5px;color:var(--ink-2);line-height:1.45;">Đội Agent đã hoàn tất kiểm định chất lượng${gs.loopsUsed ? ` (qua ${gs.loopsUsed} vòng tự sửa)` : ""}. Bạn có thể để trống để Lead chốt ngay, hoặc nhập góp ý để điều chỉnh trước khi bàn giao cuối.</div>
          <textarea id="v38-app-fb-${m.id}" class="field" rows="3" style="font-size:13px;" placeholder="Góp ý bổ sung (không bắt buộc)...">${esc(p.approvalFeedback || "")}</textarea>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="btn-p tap" style="flex:1;" onclick="approveGraphAndFinish('${m.id}')">Duyệt &amp; Lead chốt bản cuối</button>
            <button type="button" class="btn-blue tap" onclick="requestGraphRevision('${m.id}')">Sửa theo góp ý</button>
            <button type="button" class="btn-s tap" onclick="acceptGraphDraftAsFinal('${m.id}')">Chốt bản hiện tại</button>
          </div>`;
        row.appendChild(appBox);
      }

      // 3. Add "Tối ưu Team" button on completed Graph pipeline cards
      if (team && !m.streaming && !p.awaitingGraphApproval && !p.awaitingApproval) {
        const actRow = row.querySelector(".img-act-row");
        if (actRow && !actRow.querySelector(".v38-opt-btn")) {
          const optBtn = document.createElement("button");
          optBtn.type = "button";
          optBtn.className = "btn-s tap v38-opt-btn";
          optBtn.style.cssText = "height:34px;font-size:12.5px;";
          optBtn.textContent = "Tối ưu Team";
          optBtn.onclick = () => window.openTeamEvolutionModal(team.id, "improve");
          actRow.appendChild(optBtn);
        }
      }
    });
  };

  /* =========================================================================
     11. BOOT HOOK — APPLY SURFACE THEME & ENSURE ALL TEAMS HAVE v3.8 SHAPE
     ========================================================================= */
  const applyInitialV38 = () => {
    try {
      document.body.dataset.surface = (S && S.cfg && S.cfg.surfaceTheme) || "obsidian";
      if (typeof window.applyTheme === "function") window.applyTheme();
      if (S && Array.isArray(S.teams)) S.teams.forEach(t => ensureTeamV38Shape(t));
    } catch {}
  };
  applyInitialV38();
  setTimeout(applyInitialV38, 600);


  /* =========================================================================
     12. v3.8.1 UNIVERSAL MULTI-FILE & ZIP ARCHIVE READER ENGINE
         Reads .zip (nested folders, code, JSON, MD, PDF, DOCX, XLSX, PPTX, IPYNB),
         multiple batch files (up to 40), Skills .zip packages, Team/Tutor .zip files,
         plus Interactive ZIP File Explorer + Query-Aware Zero-Miss Mini-RAG!
     ========================================================================= */
  const JSZIP_CDN = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
  const ZIP_IGNORE_PATH_RE = /(^|\/)(__MACOSX|node_modules|\.git|\.svn|\.hg|\.gradle|\.idea|\.vscode|dist|build|out|target|venv|\.venv|__pycache__|\.next|\.nuxt)\//i;
  const ZIP_IGNORE_FILE_RE = /(^|\/)(\.DS_Store|Thumbs\.db|package-lock\.json|yarn\.lock|pnpm-lock\.yaml|Cargo\.lock)$/i;
  const ZIP_TEXT_EXT_RE = /\.(txt|md|markdown|csv|tsv|json|jsonc|jsonl|js|mjs|cjs|ts|tsx|jsx|py|html|htm|css|scss|sass|less|sql|pine|mq5|mq4|yaml|yml|xml|toml|ini|cfg|conf|env|example|sh|bash|zsh|bat|ps1|java|kt|kts|gradle|properties|c|cpp|cc|h|hpp|cs|go|rs|php|rb|swift|dart|vue|svelte|astro|r|lua|pl|tex|bib|log|svg|gitignore|dockerignore|editorconfig|htaccess|prisma|graphql|gql|proto)$/i;
  const ZIP_NOEXT_TEXT_RE = /(^|\/)(Dockerfile|Makefile|Procfile|Jenkinsfile|Vagrantfile|Gemfile|Rakefile|README|LICENSE|CHANGELOG|AUTHORS|NOTICE|CNAME)$/i;
  const ZIP_OFFICE_EXT_RE = /\.(docx|pptx|xlsx)$/i;
  const ZIP_PDF_EXT_RE = /\.pdf$/i;
  const ZIP_IPYNB_EXT_RE = /\.ipynb$/i;
  const ZIP_IMG_EXT_RE = /\.(png|jpg|jpeg|webp)$/i;

  async function ensureJsZipReady() {
    if (typeof window.JSZip !== "undefined") return window.JSZip;
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = JSZIP_CDN;
      s.crossOrigin = "anonymous";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Không tải được thư viện giải nén ZIP (kiểm tra kết nối mạng)."));
      document.head.appendChild(s);
    });
    return window.JSZip;
  }

  function parseJupyterNotebookText(rawJson, fileName) {
    try {
      const nb = JSON.parse(rawJson);
      const cells = Array.isArray(nb.cells) ? nb.cells : [];
      const out = [`[JUPYTER NOTEBOOK: ${fileName} (${cells.length} cells)]`];
      cells.forEach((cell, i) => {
        const src = Array.isArray(cell.source) ? cell.source.join("") : String(cell.source || "");
        if (!src.trim()) return;
        const kind = cell.cell_type === "code" ? "CODE" : "MARKDOWN";
        out.push(`--- Cell ${i + 1} (${kind}) ---\n${src.trim()}`);
      });
      return out.join("\n\n").slice(0, 60000);
    } catch {
      return String(rawJson || "").slice(0, 50000);
    }
  }

  function buildArchiveDirectoryTree(entries, skippedCount = 0) {
    const lines = entries.map(f => {
      const kb = Math.max(1, Math.round((f.size || (f.content || "").length) / 1024));
      return `- ${f.path} (${kb}KB${f.lines ? `, ${f.lines} dòng` : ""}${f.kind && f.kind !== "text" ? `, ${f.kind}` : ""})`;
    });
    if (skippedCount > 0) lines.push(`(+ ${skippedCount} tệp nhị phân/hệ thống đã tự lọc bỏ)`);
    return lines.join("\n");
  }

  async function unpackZipFileUniversal(file, opts = {}) {
    const maxFiles = opts.maxFiles || 120;
    const maxFileBytes = opts.maxFileBytes || 260000;
    const JSZipLib = await ensureJsZipReady();
    const buf = await file.arrayBuffer();
    const zip = await JSZipLib.loadAsync(buf);

    const rawEntries = Object.values(zip.files).filter(e => !e.dir);
    const extracted = [];
    const imageEntries = [];
    let skipped = 0;

    // Prioritize key docs/manifests/root source files first so nothing important is ever missed
    rawEntries.sort((a, b) => {
      const rank = p => {
        if (/(^|\/)(skill\.md|readme\.md|huongdan\.md|boi-canh\.md)$/i.test(p)) return 0;
        if (/(^|\/)(package\.json|capacitor\.config\.json|schema\.sql|index\.html)$/i.test(p)) return 1;
        if (ZIP_OFFICE_EXT_RE.test(p) || ZIP_PDF_EXT_RE.test(p)) return 2;
        return 3;
      };
      return rank(a.name) - rank(b.name) || a.name.split("/").length - b.name.split("/").length || a.name.localeCompare(b.name);
    });

    for (const entry of rawEntries) {
      const p = entry.name.replace(/^\/+/, "");
      if (ZIP_IGNORE_PATH_RE.test(p) || ZIP_IGNORE_FILE_RE.test(p)) {
        skipped++;
        continue;
      }

      // Track images inside ZIP (for optional 1-tap attach)
      if (ZIP_IMG_EXT_RE.test(p)) {
        if (imageEntries.length < 12) imageEntries.push({ path: p, entry });
        continue;
      }

      if (extracted.length >= maxFiles) {
        skipped++;
        continue;
      }

      try {
        if (ZIP_OFFICE_EXT_RE.test(p) && window.OfficeStudio?.extractOfficeFileText) {
          const blob = await entry.async("blob");
          if (blob.size > 12 * 1024 * 1024) { skipped++; continue; }
          const subFile = new File([blob], p.split("/").pop() || p);
          const res = await window.OfficeStudio.extractOfficeFileText(subFile);
          const txt = String(res?.text || "").trim();
          if (txt) {
            extracted.push({ path: p, kind: "office", size: txt.length, lines: txt.split("\n").length, content: txt.slice(0, 45000), selected: true });
          }
          continue;
        }

        if (ZIP_PDF_EXT_RE.test(p)) {
          const blob = await entry.async("blob");
          if (blob.size > 15 * 1024 * 1024) { skipped++; continue; }
          const subFile = new File([blob], p.split("/").pop() || p, { type: "application/pdf" });
          const res = await _origExtractRealFileTextV38(subFile);
          const txt = String(res?.text || "").trim();
          if (txt) {
            extracted.push({ path: p, kind: "pdf", size: txt.length, lines: txt.split("\n").length, content: txt.slice(0, 45000), selected: true });
          }
          continue;
        }

        if (ZIP_IPYNB_EXT_RE.test(p)) {
          const raw = await entry.async("string");
          const txt = parseJupyterNotebookText(raw, p);
          extracted.push({ path: p, kind: "notebook", size: txt.length, lines: txt.split("\n").length, content: txt, selected: true });
          continue;
        }

        if (ZIP_TEXT_EXT_RE.test(p) || ZIP_NOEXT_TEXT_RE.test(p)) {
          const raw = await entry.async("string");
          // Skip binary-looking content containing null bytes
          if (raw.includes("\u0000")) { skipped++; continue; }
          const clipped = raw.slice(0, maxFileBytes);
          extracted.push({
            path: p,
            kind: "text",
            size: raw.length,
            lines: raw.split("\n").length,
            content: clipped,
            selected: true
          });
          continue;
        }

        // Fallback: try reading small unknown-extension files (< 60KB) if plain UTF-8 text
        const u8 = await entry.async("uint8array");
        if (u8.byteLength > 0 && u8.byteLength <= 60000) {
          let hasNull = false;
          for (let i = 0; i < Math.min(512, u8.byteLength); i++) {
            if (u8[i] === 0) { hasNull = true; break; }
          }
          if (!hasNull) {
            const raw = new TextDecoder("utf-8", { fatal: false }).decode(u8);
            extracted.push({ path: p, kind: "text", size: raw.length, lines: raw.split("\n").length, content: raw, selected: true });
            continue;
          }
        }
        skipped++;
      } catch {
        skipped++;
      }
    }

    // Prepare thumbnails/dataUrls for up to 6 small images inside ZIP
    const zipImages = [];
    for (const im of imageEntries.slice(0, 6)) {
      try {
        const blob = await im.entry.async("blob");
        if (blob.size <= 4 * 1024 * 1024) {
          const subFile = new File([blob], im.path.split("/").pop() || "image.png", { type: blob.type || "image/png" });
          const proc = await processImageFile(subFile);
          zipImages.push({ path: im.path, name: im.path.split("/").pop() || im.path, dataUrl: proc.dataUrl });
        }
      } catch {}
    }

    const totalChars = extracted.reduce((a, f) => a + (f.content || "").length, 0);
    const treeText = buildArchiveDirectoryTree(extracted, skipped);

    // Compact summary text stored on the attachment (Zero-Miss RAG pulls full individual files per turn!)
    let inlinePreview = `[KHO NÉN ZIP: ${file.name} · ${extracted.length} tệp văn bản/code${zipImages.length ? ` · ${zipImages.length} ảnh` : ""}]\nCÂY THƯ MỤC ĐẦY ĐỦ:\n${treeText}`;
    if (totalChars <= 28000) {
      inlinePreview += "\n\nNỘI DUNG ĐẦY ĐỦ CÁC TỆP:\n" + extracted.map(f => `=== FILE: ${f.path} ===\n${f.content}`).join("\n\n");
    } else {
      inlinePreview += "\n\n(Hệ thống Zero-Miss Archive RAG tự động nạp nội dung chi tiết từng file liên quan theo câu hỏi của người dùng.)";
    }

    return {
      fileName: file.name,
      files: extracted,
      images: zipImages,
      skipped,
      totalChars,
      treeText,
      text: inlinePreview
    };
  }
  window.unpackZipFileUniversal = unpackZipFileUniversal;

  // Upgrade extractRealFileText to support .zip and .ipynb everywhere
  const _origExtractRealFileTextV38 = window.extractRealFileText;
  window.extractRealFileText = async function (file) {
    const name = String(file?.name || "");
    if (/\.zip$/i.test(name) || file?.type === "application/zip" || file?.type === "application/x-zip-compressed") {
      showToast(`Đang giải nén & đọc tệp ZIP: ${name}...`);
      const z = await unpackZipFileUniversal(file);
      return { text: z.text, pages: z.files.length, isZip: true, zipData: z };
    }
    if (ZIP_IPYNB_EXT_RE.test(name)) {
      const raw = await file.text();
      return { text: parseJupyterNotebookText(raw, name), pages: 0 };
    }
    return _origExtractRealFileTextV38(file);
  };

  // Upgrade handleDocs to support multi-file batches (up to 40 files) + .zip archives + mixed images!
  window.handleDocs = async function (files) {
    const arr = Array.from(files || []).slice(0, 40);
    if (!arr.length) return;
    let addedDocs = 0, addedZips = 0, addedImgs = 0;

    for (const f of arr) {
      const name = String(f.name || "file");
      if ((f.type || "").startsWith("image/") && !/\.svg$/i.test(name)) {
        const p = await processImageFile(f);
        S.atts.push({ id: "img-" + Date.now() + Math.random(), type: "image", name, dataUrl: p.dataUrl, origDataUrl: p.dataUrl, enhanced: false });
        addedImgs++;
        continue;
      }

      if (/\.zip$/i.test(name) || f.type === "application/zip" || f.type === "application/x-zip-compressed") {
        showToast(`Đang giải nén ${name}...`);
        try {
          const z = await unpackZipFileUniversal(f);
          S.atts.push({
            id: "zip-" + Date.now() + "-" + Math.random().toString(36).slice(2, 5),
            type: "file",
            isZip: true,
            name: `${name} (${z.files.length} tệp)`,
            rawZipName: name,
            text: z.text,
            treeText: z.treeText,
            archiveFiles: z.files,
            zipImages: z.images,
            skippedCount: z.skipped,
            totalChars: z.totalChars,
            digested: false
          });
          addedZips++;
        } catch (e) {
          showToast(`Không giải nén được ${name}: ${e.message}`, "err");
        }
        continue;
      }

      const { text, pages } = await window.extractRealFileText(f);
      let finalTxt = text;
      let digested = false;
      // Only auto-digest huge single non-code PDF/doc files (> 18,000 chars) when not in multi-file code mode
      if (text.length > 18000 && arr.length === 1 && !ZIP_TEXT_EXT_RE.test(name) && S.user?.licenseActive) {
        showToast(`Đang lọc gọn ${name}${pages ? ` (${pages} trang)` : ""} bằng ${S.cfg.repoReaderModel || "GPT 6.2 Sol"}...`);
        try {
          const r = await apiFetch("/ai/digest", {
            method: "POST",
            body: {
              readerModelId: S.cfg.repoReaderModel || "gpt-6.2-sol",
              instruction: `Trích xuất đầy đủ ý chính, số liệu, câu hỏi/đề bài và cấu trúc từ tài liệu "${name}".`,
              content: text.slice(0, 28000)
            }
          });
          if (r.ok) {
            const d = await r.json();
            if (d.digest) {
              finalTxt = `[BẢN TÓM LƯỢC TỐI ƯU TỪ ${name}${pages ? ` (${pages} trang)` : ""}]\n${d.digest}\n\n[TRÍCH ĐOẠN GỐC]\n${text.slice(0, 3500)}`;
              digested = true;
            }
          }
        } catch {}
      }
      S.atts.push({
        id: "d-" + Date.now() + "-" + Math.random().toString(36).slice(2, 5),
        type: "file",
        name: pages ? `${name} (${pages}tr)` : name,
        text: finalTxt,
        fullContent: text,
        digested
      });
      addedDocs++;
    }

    renderChips();
    updateOrbButton();
    haptic("ok");
    const parts = [];
    if (addedZips) parts.push(`${addedZips} file ZIP`);
    if (addedDocs) parts.push(`${addedDocs} tệp`);
    if (addedImgs) parts.push(`${addedImgs} ảnh`);
    if (parts.length) showToast(`Đã nạp ${parts.join(" + ")} · Chạm thẻ ZIP để xem/chọn file bên trong`, "ok");
    const inp = document.getElementById("in-doc");
    if (inp) inp.value = "";
  };

  // Persist ZIP archives & multi-file batches into chat.workspaceArchives so AI NEVER forgets them on Turn 2, Turn 3!
  function syncChatArchivesFromMessages(chat) {
    if (!chat) return [];
    chat.workspaceArchives = chat.workspaceArchives || [];
    const seen = new Set(chat.workspaceArchives.map(a => a.id));
    const pushFromAtt = a => {
      if (!a || !a.isZip || !Array.isArray(a.archiveFiles) || seen.has(a.id)) return;
      seen.add(a.id);
      chat.workspaceArchives.unshift({
        id: a.id,
        name: a.rawZipName || a.name,
        treeText: a.treeText || "",
        files: a.archiveFiles,
        images: a.zipImages || [],
        skippedCount: a.skippedCount || 0,
        totalChars: a.totalChars || 0,
        addedAt: Date.now()
      });
    };
    (S.atts || []).forEach(pushFromAtt);
    (chat.messages || []).forEach(m => (m.atts || []).forEach(pushFromAtt));
    chat.workspaceArchives = chat.workspaceArchives.slice(0, 6);
    return chat.workspaceArchives;
  }

  // Query-Aware Zero-Miss Multi-File & ZIP Archive Context Injector
  const _origBuildZeroMissV38 = window.buildZeroMissContextBundle;
  window.buildZeroMissContextBundle = function (chat, queryText, team = null, tutor = null) {
    const base = typeof _origBuildZeroMissV38 === "function"
      ? _origBuildZeroMissV38(chat, queryText, team, tutor)
      : { textBlock: "", ctxObj: null, fileCount: 0 };

    const archives = syncChatArchivesFromMessages(chat);
    // Also gather extra multi-files in current S.atts or team/tutor archives
    const extraFiles = [];
    (S.atts || []).forEach(a => {
      if (a.type === "file" && !a.isZip && a.fullContent) {
        extraFiles.push({ path: a.name, content: a.fullContent, size: a.fullContent.length, selected: true });
      }
    });
    if (team?.archiveFiles?.length) {
      archives.push({ id: "team-arc", name: `${team.name} (ZIP)`, treeText: buildArchiveDirectoryTree(team.archiveFiles), files: team.archiveFiles });
    }

    if (!archives.length && !extraFiles.length) return base;

    const q = String(queryText || "").toLowerCase();
    const tokens = [...new Set(q.replace(/[^\p{L}\p{N}_./-]/gu, " ").split(/\s+/).filter(w => w.length >= 2))];
    const wantAll = /(đọc\s*(hết|toàn\s*bộ|all)|xem\s*(hết|toàn\s*bộ)|tất\s*cả\s*(file|tệp)|kiểm\s*tra\s*toàn\s*bộ|audit\s*all)/i.test(q);

    const blocks = [];
    let budget = 44000; // Generous smart budget for multi-file & ZIP analysis
    let totalFilesMatched = 0;

    for (const arc of archives) {
      const activeFiles = (arc.files || []).filter(f => f.selected !== false);
      if (!activeFiles.length) continue;

      const header = `=== KHO TỆP ZIP: ${arc.name} (${activeFiles.length} tệp đang bật) ===\nCÂY THƯ MỤC:\n${arc.treeText || buildArchiveDirectoryTree(activeFiles)}`;
      blocks.push(header);
      budget -= header.length;

      const sumChars = activeFiles.reduce((a, f) => a + (f.content || "").length, 0);
      if (sumChars <= Math.min(32000, budget)) {
        // Fits 100% lossless! Inject EVERY selected file completely.
        for (const f of activeFiles) {
          const chunk = `\n--- FILE: ${f.path} ---\n${f.content}`;
          blocks.push(chunk);
          budget -= chunk.length;
          totalFilesMatched++;
        }
      } else {
        // Smart Query-Aware Ranking: explicitly mentioned filenames get priority 1000, then keyword overlap, then key entry files
        const scored = activeFiles.map((f, idx) => {
          const pLow = f.path.toLowerCase();
          const baseName = pLow.split("/").pop() || pLow;
          const stem = baseName.replace(/\.[^.]+$/, "");
          let score = 0;
          if (q.includes(pLow) || (baseName.length >= 3 && q.includes(baseName)) || (stem.length >= 3 && q.includes(stem))) {
            score += 1000;
          }
          const bodySample = (f.content || "").slice(0, 6000).toLowerCase();
          for (const tk of tokens) {
            if (pLow.includes(tk)) score += 35;
            else if (bodySample.includes(tk)) score += 6;
          }
          if (/(readme|skill|huongdan|boi-canh|index\.html|app\.js|worker\.js|main\.|package\.json)/i.test(pLow)) score += 12;
          if (wantAll) score += Math.max(1, 20 - idx);
          return { f, score };
        }).sort((a, b) => b.score - a.score);

        for (const { f, score } of scored) {
          if (budget < 800) break;
          if (!wantAll && score === 0 && totalFilesMatched >= 8) continue;
          const cap = score >= 1000 ? Math.min(22000, budget) : Math.min(9500, budget);
          const body = (f.content || "").slice(0, cap);
          const truncNote = (f.content || "").length > cap ? `\n... [Còn ${(f.content.length - cap).toLocaleString()} ký tự — hỏi tên file "${f.path}" để đọc sâu đoạn khác]` : "";
          const chunk = `\n--- FILE: ${f.path} ---\n${body}${truncNote}`;
          blocks.push(chunk);
          budget -= chunk.length;
          totalFilesMatched++;
        }
      }
    }

    const combined = [base.textBlock, blocks.join("\n")].filter(Boolean).join("\n\n");
    return {
      ...base,
      textBlock: combined,
      fileCount: (base.fileCount || 0) + totalFilesMatched
    };
  };

  // Interactive ZIP / Archive Inspector Modal (toggle files, preview code, attach ZIP images, 1-tap digest or save as Skill)
  window.openZipInspectorModal = function (attId) {
    const att = (S.atts || []).find(a => a.id === attId)
      || (S.chats.find(c => c.id === S.activeChatId)?.workspaceArchives || []).find(a => a.id === attId);
    if (!att) return showToast("Không tìm thấy kho tệp ZIP", "warn");
    const files = att.archiveFiles || att.files || [];
    const imgs = att.zipImages || att.images || [];
    const selCnt = files.filter(f => f.selected !== false).length;
    const selChars = files.filter(f => f.selected !== false).reduce((a, f) => a + (f.content || "").length, 0);
    const estTok = Math.round(selChars / 3.5);
    const title = att.rawZipName || att.name || "archive.zip";

    window.__CUR_ZIP_INSPECT__ = att;
    openModal(`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;">
        <div style="min-width:0;">
          <h3 style="font-size:16px;font-weight:600;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(title)}</h3>
          <div style="font-size:11.5px;color:var(--ink-3);" class="num">Đang bật ${selCnt}/${files.length} tệp · ~${estTok >= 1000 ? (estTok / 1000).toFixed(1) + "K" : estTok} tok${att.skippedCount ? ` · bỏ qua ${att.skippedCount} file rác` : ""}</div>
        </div>
        <button type="button" class="mini-act tap" onclick="closeModal()">${ICON_X}</button>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
        <button type="button" class="ws-chip-btn tap" onclick="toggleAllZipFiles(true)">Chọn tất cả</button>
        <button type="button" class="ws-chip-btn tap" onclick="toggleAllZipFiles(false)">Bỏ chọn hết</button>
        <button type="button" class="ws-chip-btn accent tap" onclick="digestCurrentZipOverview()">Tóm tắt toàn ZIP (Sol)</button>
        <button type="button" class="ws-chip-btn ok tap" onclick="saveCurrentZipAsSkill()">Lưu thành Skill</button>
      </div>
      <div class="v38-zip-tree">
        ${files.map((f, i) => `<div class="v38-zip-row">
          <input type="checkbox" ${f.selected !== false ? "checked" : ""} onchange="toggleOneZipFile(${i},this.checked)" style="width:15px;height:15px;accent-color:var(--accent);flex-shrink:0;" />
          <span class="v38-zip-path" onclick="previewZipSingleFile(${i})" title="Chạm để xem nội dung">${esc(f.path)}</span>
          <span class="v38-zip-meta">${Math.max(1, Math.round((f.size || (f.content || "").length) / 1024))}KB</span>
        </div>`).join("") || `<div style="font-size:12px;color:var(--ink-3);padding:8px;">Không có tệp văn bản nào trong ZIP này.</div>`}
      </div>
      ${imgs.length ? `<div style="margin-top:8px;">
        <div style="font-size:12px;color:var(--ink-2);margin-bottom:4px;">Ảnh trong ZIP (${imgs.length}) — chạm để đính kèm Vision:</div>
        <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;">
          ${imgs.map((im, ii) => `<button type="button" class="ws-chip-btn tap" onclick="attachZipImageToChat(${ii})">+ ${esc(im.name.slice(0, 18))}</button>`).join("")}
        </div>
      </div>` : ""}
      <div style="display:flex;justify-content:flex-end;margin-top:10px;">
        <button type="button" class="btn-p tap" onclick="closeModal()">Xong</button>
      </div>`);
  };

  window.toggleOneZipFile = function (idx, checked) {
    const att = window.__CUR_ZIP_INSPECT__; if (!att) return;
    const files = att.archiveFiles || att.files || [];
    if (files[idx]) files[idx].selected = Boolean(checked);
    openZipInspectorModal(att.id);
  };
  window.toggleAllZipFiles = function (on) {
    const att = window.__CUR_ZIP_INSPECT__; if (!att) return;
    (att.archiveFiles || att.files || []).forEach(f => { f.selected = Boolean(on); });
    openZipInspectorModal(att.id);
  };
  window.previewZipSingleFile = function (idx) {
    const att = window.__CUR_ZIP_INSPECT__; if (!att) return;
    const f = (att.archiveFiles || att.files || [])[idx]; if (!f) return;
    openModal(`<h3 style="font-size:14.5px;font-family:var(--font-mono);margin-bottom:6px;word-break:break-all;">${esc(f.path)}</h3>
      <pre class="v38-diff-box" style="font-family:var(--font-mono);font-size:11.5px;max-height:55dvh;overflow:auto;">${esc((f.content || "").slice(0, 20000))}</pre>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px;">
        <button type="button" class="btn-s tap" onclick="openZipInspectorModal('${esc(att.id)}')">Quay lại cây ZIP</button>
        <button type="button" class="btn-p tap" onclick="closeModal()">Đóng</button>
      </div>`);
  };
  window.attachZipImageToChat = function (imgIdx) {
    const att = window.__CUR_ZIP_INSPECT__; if (!att) return;
    const im = (att.zipImages || att.images || [])[imgIdx]; if (!im) return;
    S.atts.push({ id: "zimg-" + Date.now(), type: "image", name: im.name, dataUrl: im.dataUrl, origDataUrl: im.dataUrl, enhanced: false });
    renderChips(); updateOrbButton(); haptic("ok");
    showToast(`Đã đính kèm ảnh ${im.name} vào khung chat`, "ok");
  };
  window.digestCurrentZipOverview = async function () {
    const att = window.__CUR_ZIP_INSPECT__; if (!att) return;
    const files = (att.archiveFiles || att.files || []).filter(f => f.selected !== false);
    if (!files.length) return showToast("Chưa chọn file nào để tóm tắt", "warn");
    showToast(`Đang tóm tắt kiến trúc ${att.rawZipName || att.name} bằng ${S.cfg.repoReaderModel || "GPT 6.2 Sol"}...`);
    const sample = `CÂY THƯ MỤC:\n${att.treeText || buildArchiveDirectoryTree(files)}\n\nMẪU NỘI DUNG:\n` +
      files.slice(0, 12).map(f => `--- ${f.path} ---\n${(f.content || "").slice(0, 1800)}`).join("\n\n");
    try {
      const r = await apiFetch("/ai/digest", {
        method: "POST",
        body: {
          readerModelId: S.cfg.repoReaderModel || "gpt-6.2-sol",
          instruction: "Tóm tắt tổng quan kiến trúc dự án/bộ tài liệu trong file ZIP này: mục đích, vai trò từng file quan trọng và các điểm cần lưu ý.",
          content: sample.slice(0, 26000)
        }
      });
      const d = await r.json();
      if (!r.ok || !d.digest) throw new Error(d.error || "Không tóm tắt được");
      att.text = `[TÓM TẮT KIẾN TRÚC ZIP ${att.rawZipName || att.name}]\n${d.digest}\n\nCÂY THƯ MỤC:\n${att.treeText || ""}`;
      haptic("ok");
      openModal(`<h3 style="font-size:16px;font-weight:600;margin-bottom:6px;">Tóm tắt kiến trúc · ${esc(att.rawZipName || att.name)}</h3>
        <div class="v38-diff-box" style="max-height:55dvh;overflow:auto;">${esc(d.digest)}</div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px;">
          <button type="button" class="btn-s tap" onclick="openZipInspectorModal('${esc(att.id)}')">Quay lại</button>
          <button type="button" class="btn-p tap" onclick="closeModal()">Xong</button>
        </div>`);
    } catch (e) {
      showToast("Lỗi tóm tắt ZIP: " + e.message, "err");
    }
  };
  window.saveCurrentZipAsSkill = async function () {
    const att = window.__CUR_ZIP_INSPECT__; if (!att) return;
    const files = (att.archiveFiles || att.files || []).filter(f => f.selected !== false);
    if (!files.length) return showToast("ZIP không có tệp văn bản nào", "warn");
    const rawName = (att.rawZipName || att.name || "zip-skill").replace(/\.zip.*$/i, "").toLowerCase().replace(/[^a-z0-9_-]/g, "-") || "zip-skill";
    const core = files.find(f => /skill\.md$/i.test(f.path)) || files.find(f => /readme\.md$/i.test(f.path)) || files[0];
    const sk = {
      id: "zipsk-" + Date.now(),
      name: rawName.slice(0, 28),
      desc: `Nhập từ ZIP (${files.length} tệp)`,
      prompt: (core?.content || "").slice(0, 14000),
      builtin: false,
      repo: { owner: "local-zip", repo: rawName, branch: "zip", sha: "local", updatedAt: Date.now() },
      repoFiles: files.map(f => ({ path: f.path, size: f.size || (f.content || "").length, content: (f.content || "").slice(0, 40000) }))
    };
    await dbPut("skills", sk);
    S.skills = await dbAll("skills");
    if (!S.skillIds.includes(sk.id)) S.skillIds.push(sk.id);
    renderSkillStack(); renderRepoCostStrip(); closeModal(); haptic("ok");
    showToast(`Đã lưu @${sk.name} (${files.length} tệp) vào Skills & bật dùng ngay!`, "ok");
  };

  // Enhance renderChips so ZIP chips are clearly highlighted & clickable to open ZIP Explorer
  const _origRenderChipsV38 = window.renderChips;
  window.renderChips = function () {
    if (typeof _origRenderChipsV38 === "function") _origRenderChipsV38();
    const bar = document.getElementById("chips-bar");
    if (!bar) return;
    const hasZip = (S.atts || []).some(a => a.isZip);
    if (!hasZip) return;
    const c = [];
    if (S.activeTool) c.push(`<span class="chip">${esc(TOOL_CHIP_LABELS[S.activeTool] || S.activeTool)} <button type="button" onclick="S.activeTool=null;renderChips()">×</button></span>`);
    if (S.activeNbId) { const n = S.notebooks.find(x => x.id === S.activeNbId); if (n) c.push(`<span class="chip">Ghi chú: ${esc(n.title)} <button type="button" onclick="S.activeNbId=null;renderChips();renderNbList()">×</button></span>`); }
    S.atts.forEach((a, i) => {
      if (a.dataUrl) {
        c.push(`<span class="chip"><img src="${a.dataUrl}" onclick="openVisionStudio(${i})" /><span>${esc(a.name.slice(0, 12))}</span> <span class="edit-tag" onclick="openVisionStudio(${i})">${a.enhanced ? "Đã nét" : "Soi/Nét"}</span> <span class="edit-tag" onclick="triggerUiFromScreenshot(${i})">Dựng UI</span> <button type="button" onclick="S.atts.splice(${i},1);renderChips();updateOrbButton()">×</button></span>`);
      } else if (a.isZip) {
        c.push(`<span class="chip zip-chip" onclick="openZipInspectorModal('${esc(a.id)}')"><span>ZIP · ${esc(a.name.slice(0, 24))}</span> <span class="edit-tag" style="color:var(--ok-ink);">Xem tệp</span> <button type="button" onclick="event.stopPropagation();S.atts.splice(${i},1);renderChips();updateOrbButton()">×</button></span>`);
      } else {
        c.push(`<span class="chip">${esc(a.name.slice(0, 20))} <button type="button" onclick="S.atts.splice(${i},1);renderChips();updateOrbButton()">×</button></span>`);
      }
    });
    bar.innerHTML = c.join("");
    if (typeof window.updatePreSendTokenEstimate === "function") window.updatePreSendTokenEstimate();
  };

  // Allow importing .zip skill packages directly in Skills page!
  const _origImportSkillV38 = window.importSkillFile;
  window.importSkillFile = async function (files) {
    const arr = Array.from(files || []);
    if (!arr.length) return;
    let imported = 0;
    for (const f of arr) {
      if (/\.zip$/i.test(f.name) || f.type === "application/zip") {
        showToast(`Đang giải nén gói Skill ZIP: ${f.name}...`);
        try {
          const z = await unpackZipFileUniversal(f);
          if (!z.files.length) continue;
          const slug = f.name.replace(/\.zip$/i, "").toLowerCase().replace(/[^a-z0-9_-]/g, "-") || "skill-zip";
          const core = z.files.find(x => /skill\.md$/i.test(x.path)) || z.files.find(x => /readme\.md$/i.test(x.path)) || z.files[0];
          const sk = {
            id: "zipsk-" + Date.now() + "-" + imported,
            name: slug.slice(0, 28),
            desc: `Gói Skill ZIP (${z.files.length} tệp)`,
            prompt: (core?.content || "").slice(0, 14000),
            builtin: false,
            repo: { owner: "local-zip", repo: slug, branch: "zip", sha: "local", updatedAt: Date.now() },
            repoFiles: z.files.map(x => ({ path: x.path, size: x.size, content: (x.content || "").slice(0, 40000) }))
          };
          await dbPut("skills", sk);
          imported++;
        } catch (e) { showToast(`Lỗi giải nén ${f.name}: ${e.message}`, "err"); }
      } else {
        if (typeof _origImportSkillV38 === "function") await _origImportSkillV38([f]);
        imported++;
      }
    }
    S.skills = await dbAll("skills");
    renderSkillStack(); renderSkillsPage(); renderRepoCostStrip();
    const el = document.getElementById("in-skill-file"); if (el) el.value = "";
    if (imported) { haptic("ok"); showToast(`Đã nhập ${imported} kỹ năng thành công`, "ok"); }
  };

  // Enhance Workspace File Picker (+ Bối cảnh modal) to unpack .zip archives cleanly
  const _origWsPickV38 = window.handleWorkspaceFilePick;
  window.handleWorkspaceFilePick = async function (files) {
    const arr = Array.from(files || []);
    const zips = arr.filter(f => /\.zip$/i.test(f.name) || f.type === "application/zip");
    const others = arr.filter(f => !zips.includes(f));
    if (others.length && typeof _origWsPickV38 === "function") {
      await _origWsPickV38(others);
    }
    if (zips.length) {
      let chat = S.chats.find(c => c.id === S.activeChatId);
      if (!chat) {
        chat = { id: "c-" + Date.now(), title: `Phòng ZIP: ${zips[0].name.slice(0, 28)}`, pinned: false, mode: "chat", workspaceFiles: [], workspaceArchives: [], updatedAt: Date.now(), messages: [] };
        S.chats.unshift(chat); S.activeChatId = chat.id;
      }
      chat.workspaceArchives = chat.workspaceArchives || [];
      chat.workspaceFiles = chat.workspaceFiles || [];
      for (const zf of zips) {
        showToast(`Đang giải nén & ghim ZIP ${zf.name}...`);
        try {
          const z = await unpackZipFileUniversal(zf);
          chat.workspaceArchives.unshift({
            id: "wszip-" + Date.now(),
            name: zf.name,
            treeText: z.treeText,
            files: z.files,
            images: z.images,
            skippedCount: z.skipped,
            totalChars: z.totalChars,
            addedAt: Date.now()
          });
          chat.workspaceFiles.unshift({ id: "wszf-" + Date.now(), type: "file", name: `ZIP: ${zf.name} (${z.files.length} tệp)`, text: z.text.slice(0, 14000), addedAt: Date.now() });
        } catch (e) { showToast(`Lỗi ZIP ${zf.name}: ${e.message}`, "err"); }
      }
      await dbPut("chats", chat).catch(() => {});
      renderTopContextPill(); renderActiveContextBanner(); haptic("ok");
      showToast(`Đã ghim ${zips.length} tệp ZIP vào phòng làm việc`, "ok");
      if (document.getElementById("modal-bg")?.classList.contains("open")) openWorkspaceFilesModal();
    }
    const el = document.getElementById("in-ws-file"); if (el) el.value = "";
  };

  // Drag & Drop multiple files / .zip right onto chat screen!
  function bindDragDropMultiFiles() {
    if (document.getElementById("v38-drop-hint")) return;
    const ov = document.createElement("div");
    ov.id = "v38-drop-hint";
    ov.className = "v38-drop-hint";
    ov.innerHTML = `<strong style="font-size:18px;color:var(--ink);">Thả nhiều tệp hoặc file .ZIP vào đây</strong><span style="font-size:13px;color:var(--ink-2);">Tự động giải nén ZIP, đọc PDF, Word, Excel, PowerPoint, Code &amp; Ảnh</span>`;
    document.body.appendChild(ov);
    let dragDepth = 0;
    window.addEventListener("dragenter", e => {
      if (!e.dataTransfer?.types?.includes("Files")) return;
      e.preventDefault(); dragDepth++; ov.classList.add("show");
    });
    window.addEventListener("dragover", e => { if (dragDepth > 0) e.preventDefault(); });
    window.addEventListener("dragleave", () => { dragDepth = Math.max(0, dragDepth - 1); if (dragDepth === 0) ov.classList.remove("show"); });
    window.addEventListener("drop", e => {
      if (!e.dataTransfer?.files?.length) return;
      e.preventDefault(); dragDepth = 0; ov.classList.remove("show");
      window.handleDocs(e.dataTransfer.files);
    });
  }
  bindDragDropMultiFiles();

})();
