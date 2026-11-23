/* API AI v3.5 — Office Studio & Slide Craft Engine (PPTX with XML Transitions/Morph, DOCX, XLSX with Formulas, PDF, Keynote Player & Reverse Reader) */
(function () {
  const LOADED_SCRIPTS = new Map();
  function loadScriptOnce(url, globalCheck) {
    if (globalCheck && globalCheck()) return Promise.resolve();
    if (LOADED_SCRIPTS.has(url)) return LOADED_SCRIPTS.get(url);
    const p = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = url;
      s.crossOrigin = "anonymous";
      s.onload = () => resolve();
      s.onerror = () => { LOADED_SCRIPTS.delete(url); reject(new Error("Không tải được thư viện Office (kiểm tra kết nối mạng).")); };
      document.head.appendChild(s);
    });
    LOADED_SCRIPTS.set(url, p);
    return p;
  }

  const CDN = {
    jszip: "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js",
    pptx: "https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js",
    docx: "https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js",
    excel: "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js",
    pdf: "https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.2/dist/html2pdf.bundle.min.js"
  };

  const OFFICE_THEMES = {
    "obsidian-cobalt": {
      id: "obsidian-cobalt", name: "Obsidian Cobalt",
      bg: "#0B0D14", surface: "#131824", surface2: "#1B2233",
      ink: "#EEF0F5", ink2: "#A3A9B8", muted: "#7A8296",
      accent: "#3B82F6", accentSoft: "#1A2E52", accentInk: "#FFFFFF",
      border: "#263046", chart: ["3B82F6", "4CC38A", "E5A93C", "60A5FA", "94A3B8"]
    },
    "warm-editorial": {
      id: "warm-editorial", name: "Warm Editorial",
      bg: "#F7F4EE", surface: "#FFFFFF", surface2: "#EFE9DF",
      ink: "#1F1B16", ink2: "#5E554A", muted: "#7B7266",
      accent: "#C85A32", accentSoft: "#F6E3DB", accentInk: "#FFFFFF",
      border: "#DED5C7", chart: ["C85A32", "2D6A4F", "D99B26", "5E554A", "8D6E63"]
    },
    "nordic-slate": {
      id: "nordic-slate", name: "Nordic Slate",
      bg: "#F5F7FA", surface: "#FFFFFF", surface2: "#EAEFF5",
      ink: "#0F172A", ink2: "#475569", muted: "#64748B",
      accent: "#0F766E", accentSoft: "#CCFBF1", accentInk: "#FFFFFF",
      border: "#D5DFE9", chart: ["0F766E", "2563EB", "D97706", "475569", "0891B2"]
    },
    "midnight-gold": {
      id: "midnight-gold", name: "Midnight Gold",
      bg: "#111215", surface: "#1A1B20", surface2: "#24262D",
      ink: "#F3EFE6", ink2: "#B8B1A3", muted: "#857F73",
      accent: "#D4A34A", accentSoft: "#332916", accentInk: "#111215",
      border: "#2E3038", chart: ["D4A34A", "52B788", "E07A5F", "90A4AE", "C9ADA7"]
    }
  };

  const hx = c => String(c || "#000000").replace(/^#/, "").toUpperCase();
  const safeEsc = s => String(s ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const slugFile = (name, ext) => {
    const base = String(name || "api-ai-office")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "api-ai-office";
    return base.toLowerCase().endsWith("." + ext) ? base : `${base}.${ext}`;
  };

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const res = String(r.result || "");
        resolve(res.includes(",") ? res.split(",")[1] : res);
      };
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  // Native Android Open-With / Share / Downloads + Browser Fallback
  async function deliverBinaryFile(blob, fileName, mimeType, mode = "open") {
    const nat = window.Capacitor?.Plugins?.ApiAiBackground;
    if (nat && typeof nat.saveAndOpenFile === "function") {
      try {
        const base64 = await blobToBase64(blob);
        await nat.saveAndOpenFile({ base64, fileName, mimeType, mode });
        if (window.haptic) window.haptic("ok");
        if (window.showToast) {
          window.showToast(mode === "save"
            ? `Đã lưu ${fileName} vào Downloads/API-AI`
            : `Đã lưu ${fileName} & mở trình chọn ứng dụng Office`, "ok");
        }
        return true;
      } catch (e) {
        console.warn("Native saveAndOpenFile fallback:", e);
      }
    }

    // Web Share API with file if requested on mobile browser
    if (mode === "share" && navigator.canShare) {
      try {
        const file = new File([blob], fileName, { type: mimeType });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: fileName });
          return true;
        }
      } catch {}
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    if (window.haptic) window.haptic("ok");
    if (window.showToast) window.showToast(`Đã tải xuống ${fileName}`, "ok");
    return true;
  }

  /* ===== 1. POWERPOINT (.PPTX) WITH REAL OOXML TRANSITIONS & MORPH ===== */
  function buildTransitionXml(transitionType) {
    const t = String(transitionType || "morph").toLowerCase();
    if (t === "fade") return `<p:transition spd="med" advClick="1"><p:fade thruBlk="0"/></p:transition>`;
    if (t === "push") return `<p:transition spd="med" advClick="1"><p:push dir="l"/></p:transition>`;
    if (t === "cover") return `<p:transition spd="med" advClick="1"><p:cover dir="l"/></p:transition>`;
    if (t === "wipe") return `<p:transition spd="med" advClick="1"><p:wipe dir="l"/></p:transition>`;
    // Genuine PowerPoint Morph transition wrapped in mc:AlternateContent (graceful Fade fallback on older Office)
    return `<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><mc:Choice xmlns:p159="http://schemas.microsoft.com/office/powerpoint/2015/09/main" Requires="p159"><p:transition spd="med" advClick="1"><p159:morph option="byObject"/></p:transition></mc:Choice><mc:Fallback><p:transition spd="med" advClick="1"><p:fade thruBlk="0"/></p:transition></mc:Fallback></mc:AlternateContent>`;
  }

  async function injectPptxTransitions(pptxBlob, transitionType) {
    await loadScriptOnce(CDN.jszip, () => typeof window.JSZip !== "undefined");
    const zip = await window.JSZip.loadAsync(pptxBlob);
    const transXml = buildTransitionXml(transitionType);
    const slidePaths = Object.keys(zip.files).filter(k => /^ppt\/slides\/slide\d+\.xml$/i.test(k));
    for (const sp of slidePaths) {
      let xml = await zip.file(sp).async("string");
      if (!xml.includes("<p:transition") && !xml.includes(":morph")) {
        if (xml.includes("</p:cSld>")) {
          xml = xml.replace("</p:cSld>", `</p:cSld>${transXml}`);
          zip.file(sp, xml);
        }
      }
    }
    return await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
  }

  async function exportOfficePptx(spec, mode = "open") {
    if (window.showToast) window.showToast("Đang dựng file PowerPoint (.pptx) kèm hiệu ứng...");
    await loadScriptOnce(CDN.pptx, () => typeof window.PptxGenJS !== "undefined");
    const theme = OFFICE_THEMES[spec.theme] || OFFICE_THEMES["obsidian-cobalt"];
    const pres = new window.PptxGenJS();
    pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 inches
    pres.title = spec.title || "API AI Presentation";
    pres.author = "API AI Office Studio";

    const slides = Array.isArray(spec.slides) ? spec.slides : [];
    const total = slides.length || 1;

    slides.forEach((sl, idx) => {
      const s = pres.addSlide();
      s.background = { color: hx(theme.bg) };
      if (sl.notes) s.addNotes(String(sl.notes));

      const layout = String(sl.layout || (idx === 0 ? "cover" : "two_col")).toLowerCase();
      const padX = 0.72;

      // Subtle footer bar (except cover)
      if (layout !== "cover") {
        s.addShape(pres.ShapeType.line, { x: padX, y: 7.0, w: 11.89, h: 0, line: { color: hx(theme.border), width: 0.75 } });
        s.addText(String(spec.title || "API AI"), { x: padX, y: 7.06, w: 8, h: 0.3, fontSize: 10, color: hx(theme.muted), fontFace: "Calibri" });
        s.addText(`${idx + 1} / ${total}`, { x: 11.4, y: 7.06, w: 1.2, h: 0.3, fontSize: 10, color: hx(theme.muted), align: "right", fontFace: "Calibri" });
      }

      if (layout === "cover") {
        s.addShape(pres.ShapeType.rect, { x: padX, y: 1.45, w: 0.9, h: 0.08, fill: { color: hx(theme.accent) }, line: { color: hx(theme.accent) } });
        const hasImg = Boolean(sl.imageDataUrl);
        const txtW = hasImg ? 6.9 : 11.6;
        if (sl.kicker) {
          s.addText(String(sl.kicker), { x: padX, y: 1.72, w: txtW, h: 0.4, fontSize: 14, bold: true, color: hx(theme.accent), fontFace: "Calibri" });
        }
        s.addText(String(sl.title || spec.title || "Bài thuyết trình"), {
          x: padX, y: 2.2, w: txtW, h: 2.2, fontSize: 40, bold: true, color: hx(theme.ink), fontFace: "Calibri", valign: "top"
        });
        if (sl.subtitle) {
          s.addText(String(sl.subtitle), {
            x: padX, y: 4.55, w: txtW, h: 1.1, fontSize: 18, color: hx(theme.ink2), fontFace: "Calibri", valign: "top"
          });
        }
        if (sl.meta) {
          s.addText(String(sl.meta), { x: padX, y: 6.3, w: txtW, h: 0.4, fontSize: 12, color: hx(theme.muted), fontFace: "Calibri" });
        }
        if (hasImg) {
          s.addImage({ data: sl.imageDataUrl, x: 8.1, y: 1.15, w: 4.5, h: 5.2, rounding: true });
        }
        return;
      }

      // Standard header for content slides
      s.addShape(pres.ShapeType.rect, { x: padX, y: 0.56, w: 0.46, h: 0.06, fill: { color: hx(theme.accent) }, line: { color: hx(theme.accent) } });
      s.addText(String(sl.title || `Slide ${idx + 1}`), {
        x: padX, y: 0.72, w: 11.8, h: 0.68, fontSize: 26, bold: true, color: hx(theme.ink), fontFace: "Calibri"
      });
      if (sl.subtitle) {
        s.addText(String(sl.subtitle), {
          x: padX, y: 1.36, w: 11.8, h: 0.42, fontSize: 14, color: hx(theme.ink2), fontFace: "Calibri"
        });
      }

      const topY = sl.subtitle ? 1.95 : 1.62;

      if (layout === "kpi_grid" && Array.isArray(sl.kpis) && sl.kpis.length) {
        const list = sl.kpis.slice(0, 4);
        const gap = 0.28;
        const cardW = (11.89 - gap * (list.length - 1)) / list.length;
        list.forEach((k, ki) => {
          const cx = padX + ki * (cardW + gap);
          s.addShape(pres.ShapeType.roundRect, { x: cx, y: topY, w: cardW, h: 2.85, rectRadius: 0.14, fill: { color: hx(theme.surface) }, line: { color: hx(theme.border), width: 1 } });
          s.addText(String(k.label || ""), { x: cx + 0.24, y: topY + 0.28, w: cardW - 0.48, h: 0.42, fontSize: 13, color: hx(theme.ink2), fontFace: "Calibri" });
          s.addText(String(k.value || ""), { x: cx + 0.24, y: topY + 0.86, w: cardW - 0.48, h: 0.95, fontSize: 32, bold: true, color: ki === 0 ? hx(theme.accent) : hx(theme.ink), fontFace: "Calibri" });
          if (k.delta) {
            s.addText(String(k.delta), { x: cx + 0.24, y: topY + 1.98, w: cardW - 0.48, h: 0.52, fontSize: 12, color: hx(theme.muted), fontFace: "Calibri" });
          }
        });
        if (sl.bullets?.length) {
          const bRows = sl.bullets.slice(0, 3).map(b => ({ text: String(b), options: { bullet: true, breakLine: true } }));
          s.addText(bRows, { x: padX, y: topY + 3.15, w: 11.89, h: 1.6, fontSize: 14.5, color: hx(theme.ink2), fontFace: "Calibri", paraSpaceAfter: 6 });
        }
        return;
      }

      if (layout === "timeline" && Array.isArray(sl.steps) && sl.steps.length) {
        const steps = sl.steps.slice(0, 5);
        const gap = 0.24;
        const sw = (11.89 - gap * (steps.length - 1)) / steps.length;
        s.addShape(pres.ShapeType.line, { x: padX + 0.4, y: topY + 0.36, w: 11.0, h: 0, line: { color: hx(theme.accent), width: 2 } });
        steps.forEach((st, si) => {
          const sx = padX + si * (sw + gap);
          s.addShape(pres.ShapeType.ellipse, { x: sx + 0.14, y: topY + 0.14, w: 0.46, h: 0.46, fill: { color: hx(theme.accent) }, line: { color: hx(theme.accent) } });
          s.addText(String(si + 1), { x: sx + 0.14, y: topY + 0.16, w: 0.46, h: 0.42, fontSize: 13, bold: true, color: hx(theme.accentInk), align: "center", valign: "middle" });
          s.addShape(pres.ShapeType.roundRect, { x: sx, y: topY + 0.85, w: sw, h: 3.6, rectRadius: 0.12, fill: { color: hx(theme.surface) }, line: { color: hx(theme.border), width: 1 } });
          if (st.phase) s.addText(String(st.phase), { x: sx + 0.18, y: topY + 1.04, w: sw - 0.36, h: 0.36, fontSize: 11.5, bold: true, color: hx(theme.accent), fontFace: "Calibri" });
          s.addText(String(st.title || ""), { x: sx + 0.18, y: topY + 1.44, w: sw - 0.36, h: 0.62, fontSize: 15, bold: true, color: hx(theme.ink), fontFace: "Calibri" });
          s.addText(String(st.desc || ""), { x: sx + 0.18, y: topY + 2.12, w: sw - 0.36, h: 2.1, fontSize: 12.5, color: hx(theme.ink2), fontFace: "Calibri", valign: "top" });
        });
        return;
      }

      if (layout === "chart" && sl.chart && Array.isArray(sl.chart.labels) && Array.isArray(sl.chart.series)) {
        const cTypeMap = { bar: pres.ChartType.bar, line: pres.ChartType.line, pie: pres.ChartType.pie, doughnut: pres.ChartType.doughnut };
        const ct = cTypeMap[String(sl.chart.type || "bar").toLowerCase()] || pres.ChartType.bar;
        const chartData = sl.chart.series.map(sr => ({
          name: String(sr.name || "Series"),
          labels: sl.chart.labels.map(String),
          values: (sr.values || []).map(v => Number(v) || 0)
        }));
        const hasTakeaways = Array.isArray(sl.bullets) && sl.bullets.length > 0;
        s.addChart(ct, chartData, {
          x: padX, y: topY, w: hasTakeaways ? 7.5 : 11.89, h: 4.65,
          chartColors: theme.chart,
          showLegend: chartData.length > 1 || ct === pres.ChartType.pie,
          legendColor: hx(theme.ink2),
          catAxisLabelColor: hx(theme.ink2),
          valAxisLabelColor: hx(theme.ink2),
          valGridLine: { color: hx(theme.border), size: 0.5 },
          showValue: ct !== pres.ChartType.line,
          dataLabelColor: hx(theme.ink)
        });
        if (hasTakeaways) {
          s.addShape(pres.ShapeType.roundRect, { x: 8.55, y: topY, w: 4.06, h: 4.65, rectRadius: 0.14, fill: { color: hx(theme.surface) }, line: { color: hx(theme.border), width: 1 } });
          s.addText("Điểm nhấn dữ liệu", { x: 8.8, y: topY + 0.25, w: 3.55, h: 0.4, fontSize: 14, bold: true, color: hx(theme.accent), fontFace: "Calibri" });
          const bRows = sl.bullets.slice(0, 5).map(b => ({ text: String(b), options: { bullet: true, breakLine: true } }));
          s.addText(bRows, { x: 8.8, y: topY + 0.78, w: 3.55, h: 3.65, fontSize: 13.5, color: hx(theme.ink), fontFace: "Calibri", valign: "top", paraSpaceAfter: 8 });
        }
        return;
      }

      if (layout === "table" && sl.table && Array.isArray(sl.table.headers)) {
        const rows = [];
        rows.push(sl.table.headers.map(h => ({
          text: String(h),
          options: { bold: true, fill: { color: hx(theme.accent) }, color: hx(theme.accentInk), fontSize: 13, align: "left" }
        })));
        (sl.table.rows || []).slice(0, 10).forEach((r, ri) => {
          rows.push((Array.isArray(r) ? r : []).map(cell => ({
            text: String(cell ?? ""),
            options: { fill: { color: ri % 2 === 0 ? hx(theme.surface) : hx(theme.surface2) }, color: hx(theme.ink), fontSize: 12.5 }
          })));
        });
        s.addTable(rows, {
          x: padX, y: topY, w: 11.89,
          border: { pt: 0.75, color: hx(theme.border) },
          fontFace: "Calibri", rowH: 0.48, margin: [6, 10, 6, 10]
        });
        return;
      }

      if (layout === "quote") {
        s.addShape(pres.ShapeType.rect, { x: 1.2, y: 2.25, w: 0.1, h: 2.6, fill: { color: hx(theme.accent) }, line: { color: hx(theme.accent) } });
        s.addText(`“${String(sl.quote || sl.bullets?.[0] || "")}”`, {
          x: 1.6, y: 2.2, w: 10.2, h: 2.3, fontSize: 28, italic: true, color: hx(theme.ink), fontFace: "Georgia", valign: "middle"
        });
        if (sl.author) {
          s.addText(`— ${String(sl.author)}`, { x: 1.6, y: 4.7, w: 10.2, h: 0.45, fontSize: 15, bold: true, color: hx(theme.accent), fontFace: "Calibri" });
        }
        return;
      }

      if (layout === "closing") {
        s.addText(String(sl.subtitle || "Cảm ơn bạn đã lắng nghe"), { x: padX, y: 2.4, w: 11.89, h: 1.2, fontSize: 22, color: hx(theme.ink2), fontFace: "Calibri", align: "center" });
        if (sl.bullets?.length) {
          s.addText(sl.bullets.join("   |   "), { x: padX, y: 4.1, w: 11.89, h: 0.8, fontSize: 14, color: hx(theme.accent), fontFace: "Calibri", align: "center" });
        }
        return;
      }

      // Default: two_col (Bullets left + Highlight/Card/Image right)
      const hasRight = Boolean(sl.imageDataUrl || sl.rightTitle || (sl.rightBullets && sl.rightBullets.length));
      const leftW = hasRight ? 6.15 : 11.89;
      if (sl.bullets?.length) {
        const bRows = sl.bullets.slice(0, 7).map(b => ({ text: String(b), options: { bullet: true, breakLine: true } }));
        s.addText(bRows, { x: padX, y: topY, w: leftW, h: 4.65, fontSize: 16, color: hx(theme.ink), fontFace: "Calibri", valign: "top", paraSpaceAfter: 10 });
      }
      if (sl.imageDataUrl) {
        s.addImage({ data: sl.imageDataUrl, x: 7.25, y: topY, w: 5.36, h: 4.55, rounding: true });
      } else if (hasRight) {
        s.addShape(pres.ShapeType.roundRect, { x: 7.25, y: topY, w: 5.36, h: 4.55, rectRadius: 0.16, fill: { color: hx(theme.surface) }, line: { color: hx(theme.border), width: 1 } });
        if (sl.rightTitle) {
          s.addText(String(sl.rightTitle), { x: 7.55, y: topY + 0.3, w: 4.76, h: 0.45, fontSize: 16, bold: true, color: hx(theme.accent), fontFace: "Calibri" });
        }
        if (sl.rightBullets?.length) {
          const rRows = sl.rightBullets.slice(0, 6).map(b => ({ text: String(b), options: { bullet: true, breakLine: true } }));
          s.addText(rRows, { x: 7.55, y: topY + 0.88, w: 4.76, h: 3.4, fontSize: 14.5, color: hx(theme.ink2), fontFace: "Calibri", valign: "top", paraSpaceAfter: 8 });
        }
      }
    });

    const rawBlob = await pres.write({ outputType: "blob" });
    const finalBlob = await injectPptxTransitions(rawBlob, spec.transition || "morph");
    const fileName = slugFile(spec.fileName || spec.title, "pptx");
    await deliverBinaryFile(finalBlob, fileName, "application/vnd.openxmlformats-officedocument.presentationml.presentation", mode);
  }

  /* ===== 2. WORD (.DOCX) GENERATOR ===== */
  async function exportOfficeDocx(spec, mode = "open") {
    if (window.showToast) window.showToast("Đang tạo tài liệu Word (.docx)...");
    await loadScriptOnce(CDN.docx, () => typeof window.docx !== "undefined");
    const D = window.docx;
    const accent = "1E3A8A";
    const children = [];

    // Title Header Block
    children.push(new D.Paragraph({
      spacing: { after: 120 },
      children: [new D.TextRun({ text: String(spec.title || "Tài liệu API AI"), bold: true, size: 44, color: accent, font: "Calibri" })]
    }));
    if (spec.subtitle) {
      children.push(new D.Paragraph({
        spacing: { after: 220 },
        children: [new D.TextRun({ text: String(spec.subtitle), size: 24, color: "52525B", font: "Calibri" })]
      }));
    }
    if (spec.summary) {
      children.push(new D.Paragraph({
        spacing: { before: 80, after: 240 },
        shading: { type: D.ShadingType.CLEAR, fill: "EEF2FF" },
        border: { left: { style: D.BorderStyle.SINGLE, size: 18, color: accent, space: 12 } },
        children: [new D.TextRun({ text: String(spec.summary), size: 22, color: "1E293B", font: "Calibri" })]
      }));
    }

    for (const sec of (Array.isArray(spec.sections) ? spec.sections : [])) {
      if (sec.heading) {
        children.push(new D.Paragraph({
          heading: sec.level === 2 ? D.HeadingLevel.HEADING_2 : D.HeadingLevel.HEADING_1,
          spacing: { before: 260, after: 120 },
          children: [new D.TextRun({ text: String(sec.heading), bold: true, size: sec.level === 2 ? 28 : 32, color: "0F172A", font: "Calibri" })]
        }));
      }
      for (const p of (Array.isArray(sec.paragraphs) ? sec.paragraphs : (sec.body ? [sec.body] : []))) {
        children.push(new D.Paragraph({
          spacing: { after: 140, line: 300 },
          children: [new D.TextRun({ text: String(p), size: 23, color: "1F2937", font: "Calibri" })]
        }));
      }
      for (const b of (Array.isArray(sec.bullets) ? sec.bullets : [])) {
        children.push(new D.Paragraph({
          bullet: { level: 0 },
          spacing: { after: 80, line: 276 },
          children: [new D.TextRun({ text: String(b), size: 22, color: "1F2937", font: "Calibri" })]
        }));
      }
      if (sec.callout) {
        children.push(new D.Paragraph({
          spacing: { before: 120, after: 180 },
          shading: { type: D.ShadingType.CLEAR, fill: "F1F5F9" },
          border: { left: { style: D.BorderStyle.SINGLE, size: 14, color: "2563EB", space: 10 } },
          children: [new D.TextRun({ text: String(sec.callout), italics: true, size: 22, color: "334155", font: "Calibri" })]
        }));
      }
      if (sec.table && Array.isArray(sec.table.headers)) {
        const tRows = [
          new D.TableRow({
            tableHeader: true,
            children: sec.table.headers.map(h => new D.TableCell({
              shading: { type: D.ShadingType.CLEAR, fill: accent },
              margins: { top: 100, bottom: 100, left: 140, right: 140 },
              children: [new D.Paragraph({ children: [new D.TextRun({ text: String(h), bold: true, color: "FFFFFF", size: 21, font: "Calibri" })] })]
            }))
          })
        ];
        (sec.table.rows || []).forEach((r, ri) => {
          tRows.push(new D.TableRow({
            children: (Array.isArray(r) ? r : []).map(cell => new D.TableCell({
              shading: { type: D.ShadingType.CLEAR, fill: ri % 2 === 1 ? "F8FAFC" : "FFFFFF" },
              margins: { top: 80, bottom: 80, left: 140, right: 140 },
              children: [new D.Paragraph({ children: [new D.TextRun({ text: String(cell ?? ""), color: "1E293B", size: 21, font: "Calibri" })] })]
            }))
          }));
        });
        children.push(new D.Table({ width: { size: 100, type: D.WidthType.PERCENTAGE }, rows: tRows }));
        children.push(new D.Paragraph({ spacing: { after: 140 }, children: [] }));
      }
    }

    const doc = new D.Document({
      sections: [{
        properties: {},
        footers: {
          default: new D.Footer({
            children: [new D.Paragraph({
              alignment: D.AlignmentType.RIGHT,
              children: [new D.TextRun({ text: `${spec.title || "API AI"}  |  Trang `, size: 18, color: "94A3B8" }), new D.TextRun({ children: [D.PageNumber.CURRENT], size: 18, color: "64748B" })]
            })]
          })
        },
        children
      }]
    });

    const blob = await D.Packer.toBlob(doc);
    const fileName = slugFile(spec.fileName || spec.title, "docx");
    await deliverBinaryFile(blob, fileName, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", mode);
  }

  /* ===== 3. EXCEL (.XLSX) GENERATOR WITH STYLING & REAL FORMULAS ===== */
  async function exportOfficeXlsx(spec, mode = "open") {
    if (window.showToast) window.showToast("Đang tạo bảng tính Excel (.xlsx) có công thức...");
    await loadScriptOnce(CDN.excel, () => typeof window.ExcelJS !== "undefined");
    const wb = new window.ExcelJS.Workbook();
    wb.creator = "API AI Office Studio";
    wb.created = new Date();

    const sheets = Array.isArray(spec.sheets) && spec.sheets.length ? spec.sheets : [{ name: "Data", headers: spec.headers || [], rows: spec.rows || [] }];
    sheets.forEach((sh, si) => {
      const ws = wb.addWorksheet(String(sh.name || `Sheet${si + 1}`).replace(/[\\/?*[\]:]/g, "").slice(0, 31) || `Sheet${si + 1}`);
      const headers = Array.isArray(sh.headers) ? sh.headers : [];
      const rows = Array.isArray(sh.rows) ? sh.rows : [];
      const colCount = Math.max(1, headers.length || (rows[0]?.length || 1));

      // Title banner
      ws.mergeCells(1, 1, 1, colCount);
      const tCell = ws.getCell(1, 1);
      tCell.value = String(sh.title || spec.title || sh.name || "Bảng dữ liệu");
      tCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
      tCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      tCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      ws.getRow(1).height = 30;

      // Header row (Row 2)
      const hRow = ws.getRow(2);
      hRow.height = 24;
      headers.forEach((h, ci) => {
        const c = hRow.getCell(ci + 1);
        c.value = String(h);
        c.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
        c.alignment = { vertical: "middle", horizontal: "center" };
        c.border = { top: { style: "thin", color: { argb: "FFCBD5E1" } }, bottom: { style: "medium", color: { argb: "FF1E3A8A" } }, left: { style: "thin", color: { argb: "FFCBD5E1" } }, right: { style: "thin", color: { argb: "FFCBD5E1" } } };
      });

      ws.views = [{ state: "frozen", ySplit: 2 }];
      ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: colCount } };

      const colWidths = headers.map(h => Math.max(12, String(h).length + 4));
      rows.forEach((r, ri) => {
        const rowNum = ri + 3;
        const xRow = ws.getRow(rowNum);
        xRow.height = 21;
        const isTotalRow = Array.isArray(r) && typeof r[0] === "string" && /^(tổng|total|cộng|trung bình)/i.test(r[0].trim());
        (Array.isArray(r) ? r : []).forEach((val, ci) => {
          const cell = xRow.getCell(ci + 1);
          if (typeof val === "string" && val.trim().startsWith("=")) {
            cell.value = { formula: val.trim().slice(1) };
            cell.numFmt = "#,##0.##";
          } else if (typeof val === "number") {
            cell.value = val;
            cell.numFmt = Number.isInteger(val) ? "#,##0" : "#,##0.00";
          } else {
            cell.value = val ?? "";
          }
          cell.font = { name: "Calibri", size: 11, bold: isTotalRow, color: { argb: "FF0F172A" } };
          cell.fill = {
            type: "pattern", pattern: "solid",
            fgColor: { argb: isTotalRow ? "FFE2E8F0" : (ri % 2 === 1 ? "FFF8FAFC" : "FFFFFFFF") }
          };
          cell.alignment = { vertical: "middle", horizontal: (typeof val === "number" || (typeof val === "string" && val.trim().startsWith("="))) ? "right" : "left" };
          cell.border = { top: { style: "thin", color: { argb: "FFE2E8F0" } }, bottom: { style: isTotalRow ? "medium" : "thin", color: { argb: isTotalRow ? "FF334155" : "FFE2E8F0" } }, left: { style: "thin", color: { argb: "FFE2E8F0" } }, right: { style: "thin", color: { argb: "FFE2E8F0" } } };
          colWidths[ci] = Math.min(42, Math.max(colWidths[ci] || 12, String(val ?? "").length + 4));
        });
      });

      colWidths.forEach((w, ci) => { ws.getColumn(ci + 1).width = w; });
    });

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const fileName = slugFile(spec.fileName || spec.title, "xlsx");
    await deliverBinaryFile(blob, fileName, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", mode);
  }

  /* ===== 4. PRINT-READY BINARY PDF GENERATOR (.PDF for Slides, Word, Excel, or Chat) ===== */
  function buildPrintableHtmlForSpec(spec) {
    const kind = String(spec.kind || "pdf").toLowerCase();
    if (kind === "pptx") {
      const theme = OFFICE_THEMES[spec.theme] || OFFICE_THEMES["obsidian-cobalt"];
      const slides = Array.isArray(spec.slides) ? spec.slides : [];
      return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#ffffff;color:#111;">
        ${slides.map((sl, i) => `<div class="pdf-slide-page" style="width:1040px;height:585px;padding:42px 48px;box-sizing:border-box;background:${theme.bg};color:${theme.ink};page-break-after:always;position:relative;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;">
          ${renderSlideMarkup(sl, i, slides.length, theme, spec.title, true)}
        </div>`).join("")}
      </div>`;
    }
    if (kind === "xlsx") {
      const sheets = Array.isArray(spec.sheets) && spec.sheets.length ? spec.sheets : [{ name: "Sheet1", headers: spec.headers || [], rows: spec.rows || [] }];
      return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:20px;color:#0f172a;background:#ffffff;">
        <h1 style="font-size:22px;margin:0 0 12px;color:#1e3a8a;">${safeEsc(spec.title || "Bảng dữ liệu")}</h1>
        ${sheets.map(sh => `<h2 style="font-size:15px;margin:18px 0 8px;color:#334155;">${safeEsc(sh.name || "Sheet")}</h2>
          <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;">
            <thead><tr>${(sh.headers || []).map(h => `<th style="background:#1e3a8a;color:#fff;padding:8px 10px;border:1px solid #cbd5e1;text-align:left;">${safeEsc(h)}</th>`).join("")}</tr></thead>
            <tbody>${(sh.rows || []).map((r, ri) => `<tr style="background:${ri%2===1?"#f8fafc":"#fff"};">${(Array.isArray(r)?r:[]).map(c => `<td style="padding:7px 10px;border:1px solid #e2e8f0;">${safeEsc(c)}</td>`).join("")}</tr>`).join("")}</tbody>
          </table>`).join("")}
      </div>`;
    }
    // docx or pdf structured document
    const sections = Array.isArray(spec.sections) ? spec.sections : [];
    return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:24px 28px;color:#111827;background:#ffffff;line-height:1.6;">
      <div style="border-bottom:2px solid #1e3a8a;padding-bottom:12px;margin-bottom:18px;">
        <h1 style="font-size:24px;margin:0 0 6px;color:#0f172a;">${safeEsc(spec.title || "Tài liệu API AI")}</h1>
        ${spec.subtitle ? `<div style="font-size:14px;color:#475569;">${safeEsc(spec.subtitle)}</div>` : ""}
      </div>
      ${spec.summary ? `<div style="background:#eff6ff;border-left:4px solid #2563eb;padding:12px 14px;border-radius:6px;margin-bottom:18px;font-size:13.5px;color:#1e293b;">${safeEsc(spec.summary)}</div>` : ""}
      ${sections.map(sec => `<div style="margin-bottom:18px;page-break-inside:avoid;">
        ${sec.heading ? `<h2 style="font-size:${sec.level===2?"15px":"17px"};color:#1e3a8a;margin:0 0 8px;">${safeEsc(sec.heading)}</h2>` : ""}
        ${(Array.isArray(sec.paragraphs) ? sec.paragraphs : (sec.body ? [sec.body] : [])).map(p => `<p style="margin:0 0 8px;font-size:13.5px;">${safeEsc(p)}</p>`).join("")}
        ${(Array.isArray(sec.bullets) && sec.bullets.length) ? `<ul style="margin:6px 0 10px;padding-left:20px;font-size:13.5px;">${sec.bullets.map(b => `<li style="margin-bottom:4px;">${safeEsc(b)}</li>`).join("")}</ul>` : ""}
        ${sec.callout ? `<div style="background:#f8fafc;border-left:3px solid #64748b;padding:9px 12px;font-style:italic;font-size:13px;color:#334155;margin:8px 0;">${safeEsc(sec.callout)}</div>` : ""}
        ${sec.table?.headers ? `<table style="width:100%;border-collapse:collapse;font-size:12.5px;margin:10px 0;">
          <thead><tr>${sec.table.headers.map(h => `<th style="background:#1e3a8a;color:#fff;padding:7px 9px;border:1px solid #cbd5e1;text-align:left;">${safeEsc(h)}</th>`).join("")}</tr></thead>
          <tbody>${(sec.table.rows||[]).map((r, ri) => `<tr style="background:${ri%2===1?"#f8fafc":"#fff"};">${(Array.isArray(r)?r:[]).map(c => `<td style="padding:6px 9px;border:1px solid #e2e8f0;">${safeEsc(c)}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>` : ""}
      </div>`).join("")}
    </div>`;
  }

  async function exportOfficePdf(spec, mode = "open") {
    if (window.showToast) window.showToast("Đang kết xuất file PDF chuẩn in...");
    await loadScriptOnce(CDN.pdf, () => typeof window.html2pdf !== "undefined");
    const isSlide = String(spec.kind || "").toLowerCase() === "pptx";
    const isWide = isSlide || String(spec.kind || "").toLowerCase() === "xlsx";
    const html = spec.rawHtml || buildPrintableHtmlForSpec(spec);

    const wrap = document.createElement("div");
    wrap.style.cssText = `position:fixed;left:-99999px;top:0;width:${isSlide ? "1040px" : "794px"};background:#fff;z-index:-1;`;
    wrap.innerHTML = html;
    document.body.appendChild(wrap);

    try {
      const opt = {
        margin: isSlide ? 0 : 10,
        filename: slugFile(spec.fileName || spec.title, "pdf"),
        image: { type: "jpeg", quality: 0.94 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: isSlide ? [275, 155] : "a4", orientation: isWide ? "landscape" : "portrait" }
      };
      const blob = await window.html2pdf().set(opt).from(wrap).outputPdf("blob");
      await deliverBinaryFile(blob, opt.filename, "application/pdf", mode);
    } finally {
      wrap.remove();
    }
  }

  /* ===== 5. INTERACTIVE KEYNOTE-GRADE PRESENTATION PLAYER ===== */
  function buildSvgChart(chart, theme) {
    const labels = chart.labels || [];
    const series = chart.series || [];
    const vals = (series[0]?.values || []).map(v => Number(v) || 0);
    const maxV = Math.max(1, ...vals);
    const cType = String(chart.type || "bar").toLowerCase();

    if (cType === "pie" || cType === "doughnut") {
      const sum = vals.reduce((a, b) => a + Math.max(0, b), 0) || 1;
      let acc = 0;
      const slices = vals.map((v, i) => {
        const start = (acc / sum) * Math.PI * 2 - Math.PI / 2;
        acc += Math.max(0, v);
        const end = (acc / sum) * Math.PI * 2 - Math.PI / 2;
        const lg = end - start > Math.PI ? 1 : 0;
        const x1 = 110 + 84 * Math.cos(start), y1 = 110 + 84 * Math.sin(start);
        const x2 = 110 + 84 * Math.cos(end), y2 = 110 + 84 * Math.sin(end);
        const col = "#" + (theme.chart[i % theme.chart.length] || "3B82F6");
        return `<path d="M110,110 L${x1.toFixed(1)},${y1.toFixed(1)} A84,84 0 ${lg},1 ${x2.toFixed(1)},${y2.toFixed(1)} Z" fill="${col}" />`;
      }).join("");
      const hole = cType === "doughnut" ? `<circle cx="110" cy="110" r="46" fill="${theme.bg}"/>` : "";
      const legend = labels.map((l, i) => `<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:${theme.ink2};"><span style="width:10px;height:10px;border-radius:3px;background:#${theme.chart[i % theme.chart.length]};flex-shrink:0;"></span><span>${safeEsc(l)}: <b style="color:${theme.ink};">${vals[i]}</b></span></div>`).join("");
      return `<div style="display:flex;align-items:center;gap:20px;justify-content:center;height:100%;"><svg viewBox="0 0 220 220" style="width:190px;height:190px;flex-shrink:0;">${slices}${hole}</svg><div style="display:flex;flex-direction:column;gap:8px;">${legend}</div></div>`;
    }

    if (cType === "line") {
      const pts = vals.map((v, i) => {
        const x = 36 + (i / Math.max(1, vals.length - 1)) * 360;
        const y = 185 - (v / maxV) * 145;
        return { x, y, v, l: labels[i] || "" };
      });
      const poly = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
      return `<svg viewBox="0 0 430 220" style="width:100%;height:100%;max-height:240px;">
        <line x1="36" y1="185" x2="396" y2="185" stroke="${theme.border}" stroke-width="1"/>
        <polyline fill="none" stroke="${theme.accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${poly}"/>
        ${pts.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="${theme.accent}"/><text x="${p.x.toFixed(1)}" y="${(p.y - 10).toFixed(1)}" text-anchor="middle" fill="${theme.ink}" font-size="11">${p.v}</text><text x="${p.x.toFixed(1)}" y="205" text-anchor="middle" fill="${theme.muted}" font-size="10.5">${safeEsc(String(p.l).slice(0, 10))}</text>`).join("")}
      </svg>`;
    }

    // Bar chart
    const bw = Math.min(46, Math.floor(320 / Math.max(1, vals.length)) - 10);
    const step = 360 / Math.max(1, vals.length);
    return `<svg viewBox="0 0 430 220" style="width:100%;height:100%;max-height:240px;">
      <line x1="30" y1="185" x2="400" y2="185" stroke="${theme.border}" stroke-width="1"/>
      ${vals.map((v, i) => {
        const bh = Math.max(6, (v / maxV) * 140);
        const x = 36 + i * step + (step - bw) / 2;
        const y = 185 - bh;
        const col = i === 0 ? theme.accent : "#" + theme.chart[i % theme.chart.length];
        return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw}" height="${bh.toFixed(1)}" rx="5" fill="${col}"/>
          <text x="${(x + bw / 2).toFixed(1)}" y="${(y - 7).toFixed(1)}" text-anchor="middle" fill="${theme.ink}" font-size="11">${v}</text>
          <text x="${(x + bw / 2).toFixed(1)}" y="205" text-anchor="middle" fill="${theme.muted}" font-size="10.5">${safeEsc(String(labels[i] || "").slice(0, 10))}</text>`;
      }).join("")}
    </svg>`;
  }

  function renderSlideMarkup(sl, idx, total, theme, deckTitle, staticMode = false) {
    const layout = String(sl.layout || (idx === 0 ? "cover" : "two_col")).toLowerCase();
    const animCls = staticMode ? "" : "sl-anim";

    if (layout === "cover") {
      return `<div style="display:grid;grid-template-columns:${sl.imageDataUrl ? "1.15fr 0.85fr" : "1fr"};gap:28px;align-items:center;height:100%;">
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div class="${animCls}" style="width:52px;height:4px;border-radius:99px;background:${theme.accent};"></div>
          ${sl.kicker ? `<div class="${animCls}" style="--d:1;font-size:13px;font-weight:600;color:${theme.accent};">${safeEsc(sl.kicker)}</div>` : ""}
          <div class="${animCls}" style="--d:2;font-size:clamp(24px,4vw,42px);font-weight:600;line-height:1.12;letter-spacing:-0.025em;color:${theme.ink};">${safeEsc(sl.title || deckTitle)}</div>
          ${sl.subtitle ? `<div class="${animCls}" style="--d:3;font-size:clamp(13px,1.8vw,18px);color:${theme.ink2};line-height:1.45;">${safeEsc(sl.subtitle)}</div>` : ""}
          ${sl.meta ? `<div class="${animCls}" style="--d:4;font-size:12px;color:${theme.muted};margin-top:8px;">${safeEsc(sl.meta)}</div>` : ""}
        </div>
        ${sl.imageDataUrl ? `<div class="${animCls}" style="--d:3;border-radius:16px;overflow:hidden;border:1px solid ${theme.border};height:100%;max-height:360px;"><img src="${sl.imageDataUrl}" style="width:100%;height:100%;object-fit:cover;display:block;"/></div>` : ""}
      </div>`;
    }

    let bodyHtml = "";
    if (layout === "kpi_grid" && sl.kpis?.length) {
      bodyHtml = `<div style="display:grid;grid-template-columns:repeat(${Math.min(4, sl.kpis.length)},minmax(0,1fr));gap:14px;">
        ${sl.kpis.slice(0, 4).map((k, ki) => `<div class="${animCls}" style="--d:${ki+2};padding:18px;border-radius:14px;background:${theme.surface};border:1px solid ${theme.border};display:flex;flex-direction:column;gap:8px;">
          <div style="font-size:12.5px;color:${theme.ink2};">${safeEsc(k.label)}</div>
          <div class="num" style="font-size:clamp(22px,3vw,34px);font-weight:600;color:${ki===0?theme.accent:theme.ink};letter-spacing:-0.02em;">${safeEsc(k.value)}</div>
          ${k.delta ? `<div style="font-size:12px;color:${theme.muted};">${safeEsc(k.delta)}</div>` : ""}
        </div>`).join("")}
      </div>
      ${sl.bullets?.length ? `<ul class="${animCls}" style="--d:5;margin:16px 0 0;padding-left:20px;font-size:14px;color:${theme.ink2};line-height:1.55;">${sl.bullets.slice(0,3).map(b => `<li style="margin-bottom:5px;">${safeEsc(b)}</li>`).join("")}</ul>` : ""}`;
    } else if (layout === "timeline" && sl.steps?.length) {
      bodyHtml = `<div style="display:grid;grid-template-columns:repeat(${Math.min(5, sl.steps.length)},minmax(0,1fr));gap:12px;align-items:stretch;">
        ${sl.steps.slice(0, 5).map((st, si) => `<div class="${animCls}" style="--d:${si+2};display:flex;flex-direction:column;gap:10px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="width:28px;height:28px;border-radius:50%;background:${theme.accent};color:${theme.accentInk};display:grid;place-items:center;font-size:12.5px;font-weight:600;flex-shrink:0;">${si+1}</span>
            <div style="flex:1;height:2px;background:${theme.border};"></div>
          </div>
          <div style="flex:1;padding:14px;border-radius:12px;background:${theme.surface};border:1px solid ${theme.border};display:flex;flex-direction:column;gap:6px;">
            ${st.phase ? `<div style="font-size:11px;font-weight:600;color:${theme.accent};">${safeEsc(st.phase)}</div>` : ""}
            <div style="font-size:14px;font-weight:600;color:${theme.ink};">${safeEsc(st.title)}</div>
            <div style="font-size:12.5px;color:${theme.ink2};line-height:1.45;">${safeEsc(st.desc)}</div>
          </div>
        </div>`).join("")}
      </div>`;
    } else if (layout === "chart" && sl.chart) {
      bodyHtml = `<div style="display:grid;grid-template-columns:${sl.bullets?.length ? "1.35fr 0.65fr" : "1fr"};gap:18px;align-items:center;flex:1;">
        <div class="${animCls}" style="--d:2;padding:14px;border-radius:14px;background:${theme.surface};border:1px solid ${theme.border};">${buildSvgChart(sl.chart, theme)}</div>
        ${sl.bullets?.length ? `<div class="${animCls}" style="--d:3;padding:16px;border-radius:14px;background:${theme.surface};border:1px solid ${theme.border};align-self:stretch;">
          <div style="font-size:13px;font-weight:600;color:${theme.accent};margin-bottom:8px;">Điểm nhấn</div>
          <ul style="margin:0;padding-left:18px;font-size:13px;color:${theme.ink};line-height:1.5;">${sl.bullets.slice(0,5).map(b => `<li style="margin-bottom:6px;">${safeEsc(b)}</li>`).join("")}</ul>
        </div>` : ""}
      </div>`;
    } else if (layout === "table" && sl.table?.headers) {
      bodyHtml = `<div class="${animCls}" style="--d:2;border-radius:12px;overflow:hidden;border:1px solid ${theme.border};">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr>${sl.table.headers.map(h => `<th style="background:${theme.accent};color:${theme.accentInk};padding:9px 12px;text-align:left;font-weight:600;">${safeEsc(h)}</th>`).join("")}</tr></thead>
          <tbody>${(sl.table.rows||[]).slice(0,8).map((r, ri) => `<tr style="background:${ri%2===0?theme.surface:theme.surface2};">${(Array.isArray(r)?r:[]).map(c => `<td style="padding:8px 12px;border-top:1px solid ${theme.border};color:${theme.ink};">${safeEsc(c)}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>
      </div>`;
    } else if (layout === "quote") {
      bodyHtml = `<div class="${animCls}" style="--d:2;margin:auto 0;padding-left:22px;border-left:4px solid ${theme.accent};">
        <div style="font-size:clamp(20px,3vw,30px);font-style:italic;line-height:1.35;color:${theme.ink};">“${safeEsc(sl.quote || sl.bullets?.[0] || "")}”</div>
        ${sl.author ? `<div style="margin-top:14px;font-size:14px;font-weight:600;color:${theme.accent};">— ${safeEsc(sl.author)}</div>` : ""}
      </div>`;
    } else if (layout === "closing") {
      bodyHtml = `<div class="${animCls}" style="--d:2;margin:auto;text-align:center;max-width:680px;display:flex;flex-direction:column;gap:14px;">
        <div style="font-size:clamp(16px,2.2vw,22px);color:${theme.ink2};">${safeEsc(sl.subtitle || "Cảm ơn bạn đã theo dõi")}</div>
        ${sl.bullets?.length ? `<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">${sl.bullets.map(b => `<span style="padding:6px 14px;border-radius:999px;background:${theme.surface};border:1px solid ${theme.border};font-size:13px;color:${theme.accent};">${safeEsc(b)}</span>`).join("")}</div>` : ""}
      </div>`;
    } else {
      const hasRight = Boolean(sl.imageDataUrl || sl.rightTitle || (sl.rightBullets && sl.rightBullets.length));
      bodyHtml = `<div style="display:grid;grid-template-columns:${hasRight ? "1.1fr 0.9fr" : "1fr"};gap:22px;align-items:start;">
        <ul class="${animCls}" style="--d:2;margin:0;padding-left:20px;font-size:clamp(13.5px,1.5vw,16px);line-height:1.6;color:${theme.ink};">
          ${(sl.bullets || []).slice(0, 7).map(b => `<li style="margin-bottom:9px;">${safeEsc(b)}</li>`).join("")}
        </ul>
        ${sl.imageDataUrl
          ? `<div class="${animCls}" style="--d:3;border-radius:14px;overflow:hidden;border:1px solid ${theme.border};max-height:310px;"><img src="${sl.imageDataUrl}" style="width:100%;height:100%;object-fit:cover;display:block;"/></div>`
          : (hasRight ? `<div class="${animCls}" style="--d:3;padding:18px;border-radius:14px;background:${theme.surface};border:1px solid ${theme.border};">
              ${sl.rightTitle ? `<div style="font-size:15px;font-weight:600;color:${theme.accent};margin-bottom:10px;">${safeEsc(sl.rightTitle)}</div>` : ""}
              <ul style="margin:0;padding-left:18px;font-size:13.5px;color:${theme.ink2};line-height:1.55;">${(sl.rightBullets||[]).slice(0,6).map(b => `<li style="margin-bottom:7px;">${safeEsc(b)}</li>`).join("")}</ul>
            </div>` : "")}
      </div>`;
    }

    return `<div style="display:flex;flex-direction:column;height:100%;gap:16px;">
      <div class="${animCls}" style="--d:1;">
        <div style="width:36px;height:3px;border-radius:99px;background:${theme.accent};margin-bottom:8px;"></div>
        <div style="font-size:clamp(18px,2.6vw,28px);font-weight:600;letter-spacing:-0.02em;line-height:1.18;color:${theme.ink};">${safeEsc(sl.title || `Slide ${idx + 1}`)}</div>
        ${sl.subtitle && layout !== "closing" ? `<div style="font-size:13.5px;color:${theme.ink2};margin-top:4px;">${safeEsc(sl.subtitle)}</div>` : ""}
      </div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;min-height:0;overflow-y:auto;">${bodyHtml}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px solid ${theme.border};font-size:11.5px;color:${theme.muted};">
        <span>${safeEsc(deckTitle || "API AI Office Studio")}</span>
        <span class="num">${idx + 1} / ${total}</span>
      </div>
    </div>`;
  }

  let deckPlayerState = null;

  function openSlideDeckPlayer(spec) {
    if (!spec || !Array.isArray(spec.slides) || !spec.slides.length) {
      if (window.showToast) window.showToast("Không có dữ liệu slide để trình chiếu", "warn");
      return;
    }
    deckPlayerState = {
      spec,
      idx: 0,
      themeId: spec.theme && OFFICE_THEMES[spec.theme] ? spec.theme : "obsidian-cobalt",
      transition: spec.transition || "morph",
      dir: 1
    };
    const ov = document.getElementById("deck-player-ov");
    if (!ov) return;
    ov.classList.add("open");
    renderDeckPlayerFrame();
  }

  function closeSlideDeckPlayer() {
    document.getElementById("deck-player-ov")?.classList.remove("open");
  }

  function renderDeckPlayerFrame() {
    if (!deckPlayerState) return;
    const { spec, idx, themeId, transition, dir } = deckPlayerState;
    const theme = OFFICE_THEMES[themeId] || OFFICE_THEMES["obsidian-cobalt"];
    const slides = spec.slides || [];
    const sl = slides[idx] || slides[0];

    document.getElementById("dp-title").textContent = spec.title || "Trình chiếu Slide";
    document.getElementById("dp-counter").textContent = `${idx + 1} / ${slides.length}`;
    const thSel = document.getElementById("dp-theme-sel");
    if (thSel) thSel.value = themeId;
    const trSel = document.getElementById("dp-trans-sel");
    if (trSel) trSel.value = transition;

    const stage = document.getElementById("dp-stage");
    stage.style.background = theme.bg;
    stage.style.color = theme.ink;
    stage.style.borderColor = theme.border;
    stage.className = `dp-stage dp-fx-${transition} ${dir < 0 ? "rev" : ""}`;
    void stage.offsetWidth;
    stage.innerHTML = renderSlideMarkup(sl, idx, slides.length, theme, spec.title, false);

    const notesEl = document.getElementById("dp-notes");
    if (notesEl) {
      notesEl.textContent = sl.notes ? `Ghi chú thuyết trình: ${sl.notes}` : "";
      notesEl.style.display = sl.notes ? "block" : "none";
    }

    const dots = document.getElementById("dp-dots");
    if (dots) {
      dots.innerHTML = slides.map((s, i) => `<button type="button" class="dp-dot tap ${i===idx?"active":""}" onclick="window.OfficeStudio.jumpSlide(${i})" title="${safeEsc(s.title || "Slide "+(i+1))}">${i + 1}</button>`).join("");
    }
  }

  function stepSlide(delta) {
    if (!deckPlayerState) return;
    const len = deckPlayerState.spec.slides.length;
    const next = Math.max(0, Math.min(len - 1, deckPlayerState.idx + delta));
    if (next === deckPlayerState.idx) return;
    deckPlayerState.dir = delta >= 0 ? 1 : -1;
    deckPlayerState.idx = next;
    if (window.haptic) window.haptic("tap");
    renderDeckPlayerFrame();
  }

  function jumpSlide(i) {
    if (!deckPlayerState) return;
    deckPlayerState.dir = i >= deckPlayerState.idx ? 1 : -1;
    deckPlayerState.idx = Math.max(0, Math.min(deckPlayerState.spec.slides.length - 1, i));
    if (window.haptic) window.haptic("tap");
    renderDeckPlayerFrame();
  }

  function setDeckTheme(themeId) {
    if (!deckPlayerState || !OFFICE_THEMES[themeId]) return;
    deckPlayerState.themeId = themeId;
    deckPlayerState.spec.theme = themeId;
    renderDeckPlayerFrame();
  }

  function setDeckTransition(tr) {
    if (!deckPlayerState) return;
    deckPlayerState.transition = tr;
    deckPlayerState.spec.transition = tr;
    renderDeckPlayerFrame();
  }

  async function generateSlideVisuals(spec) {
    const slides = (spec?.slides || []).filter(sl => sl.imagePrompt && !sl.imageDataUrl).slice(0, 3);
    if (!slides.length) {
      if (window.showToast) window.showToast("Các slide đã có ảnh hoặc không có mô tả ảnh minh họa", "warn");
      return;
    }
    if (window.showToast) window.showToast(`Đang vẽ ${slides.length} ảnh minh họa chèn vào Slide...`);
    let done = 0;
    for (const sl of slides) {
      try {
        const res = await window.apiFetch("/ai/image", { method: "POST", body: { prompt: sl.imagePrompt, size: "1536x1024" } });
        const d = await res.json();
        if (res.ok) {
          const it = d.data?.[0];
          const src = it?.b64_json ? `data:image/png;base64,${it.b64_json}` : it?.url;
          if (src) { sl.imageDataUrl = src; done++; }
        }
      } catch {}
    }
    if (deckPlayerState && deckPlayerState.spec === spec) renderDeckPlayerFrame();
    if (window.haptic) window.haptic(done ? "ok" : "err");
    if (window.showToast) window.showToast(done ? `Đã chèn ${done} ảnh minh họa vào Slide!` : "Không thể tạo ảnh (kiểm tra quyền tạo ảnh trong gói)", done ? "ok" : "err");
  }

  function openOfficePreviewModal(spec) {
    if (!spec) return;
    if (spec.kind === "pptx") return openSlideDeckPlayer(spec);
    const html = buildPrintableHtmlForSpec(spec);
    if (window.openModal) {
      window.openModal(`
        <h3 style="font-size:17px;font-weight:520;margin-bottom:8px;">Xem trước · ${safeEsc(spec.title || "Tài liệu Office")}</h3>
        <div style="max-height:56dvh;overflow:auto;border-radius:12px;border:1px solid var(--rim);background:#ffffff;">${html}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-top:12px;">
          ${spec.kind === "docx" ? `<button type="button" class="btn-blue tap" onclick="window.OfficeStudio.exportDocx(window.__PREVIEW_OFFICE_SPEC__)">Mở / Tải .docx</button>` : ""}
          ${spec.kind === "xlsx" ? `<button type="button" class="btn-blue tap" onclick="window.OfficeStudio.exportXlsx(window.__PREVIEW_OFFICE_SPEC__)">Mở / Tải .xlsx</button>` : ""}
          <button type="button" class="btn-s tap" onclick="window.OfficeStudio.exportPdf(window.__PREVIEW_OFFICE_SPEC__)">Xuất .pdf</button>
          <button type="button" class="btn-p tap" onclick="closeModal()">Đóng</button>
        </div>`);
      window.__PREVIEW_OFFICE_SPEC__ = spec;
    }
  }

  /* ===== 6. REVERSE OFFICE READER (.DOCX / .XLSX / .PPTX UPLOADED INTO CHAT) ===== */
  async function extractOfficeFileText(file) {
    await loadScriptOnce(CDN.jszip, () => typeof window.JSZip !== "undefined");
    const name = file.name || "office";
    const ext = name.split(".").pop().toLowerCase();
    const buf = await file.arrayBuffer();
    const zip = await window.JSZip.loadAsync(buf);
    const parser = new DOMParser();

    if (ext === "docx") {
      const xmlStr = await zip.file("word/document.xml")?.async("string");
      if (!xmlStr) return { text: `(File Word "${name}" không có nội dung văn bản.)`, pages: 0 };
      const doc = parser.parseFromString(xmlStr, "application/xml");
      const paras = [...doc.getElementsByTagNameNS("*", "p")].map(p =>
        [...p.getElementsByTagNameNS("*", "t")].map(t => t.textContent).join("")
      ).filter(s => s.trim());
      return { text: `[TÀI LIỆU WORD: ${name}]\n\n${paras.join("\n").slice(0, 46000)}`, pages: Math.max(1, Math.ceil(paras.length / 22)) };
    }

    if (ext === "pptx") {
      const slideFiles = Object.keys(zip.files)
        .filter(k => /^ppt\/slides\/slide\d+\.xml$/i.test(k))
        .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
      const out = [];
      for (let i = 0; i < slideFiles.length; i++) {
        const xmlStr = await zip.file(slideFiles[i]).async("string");
        const doc = parser.parseFromString(xmlStr, "application/xml");
        const texts = [...doc.getElementsByTagNameNS("*", "t")].map(t => t.textContent.trim()).filter(Boolean);
        out.push(`[Slide ${i + 1}/${slideFiles.length}]\n${texts.join(" · ")}`);
      }
      return { text: `[BÀI THUYẾT TRÌNH POWERPOINT: ${name} (${slideFiles.length} slide)]\n\n${out.join("\n\n").slice(0, 46000)}`, pages: slideFiles.length };
    }

    if (ext === "xlsx") {
      // Parse sharedStrings.xml
      const shared = [];
      const ssXml = await zip.file("xl/sharedStrings.xml")?.async("string");
      if (ssXml) {
        const sDoc = parser.parseFromString(ssXml, "application/xml");
        for (const si of [...sDoc.getElementsByTagNameNS("*", "si")]) {
          shared.push([...si.getElementsByTagNameNS("*", "t")].map(t => t.textContent).join(""));
        }
      }
      // Sheet names
      const sheetNames = [];
      const wbXml = await zip.file("xl/workbook.xml")?.async("string");
      if (wbXml) {
        const wDoc = parser.parseFromString(wbXml, "application/xml");
        for (const sh of [...wDoc.getElementsByTagNameNS("*", "sheet")]) {
          sheetNames.push(sh.getAttribute("name") || "Sheet");
        }
      }
      const wsFiles = Object.keys(zip.files)
        .filter(k => /^xl\/worksheets\/sheet\d+\.xml$/i.test(k))
        .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
      const out = [];
      for (let si = 0; si < wsFiles.length; si++) {
        const xmlStr = await zip.file(wsFiles[si]).async("string");
        const doc = parser.parseFromString(xmlStr, "application/xml");
        const rows = [...doc.getElementsByTagNameNS("*", "row")].slice(0, 120).map(row => {
          const cells = [...row.getElementsByTagNameNS("*", "c")].map(c => {
            const type = c.getAttribute("t");
            const vEl = c.getElementsByTagNameNS("*", "v")[0];
            const isEl = c.getElementsByTagNameNS("*", "t")[0];
            if (type === "s" && vEl) return shared[Number(vEl.textContent)] ?? "";
            if (type === "inlineStr" && isEl) return isEl.textContent || "";
            return vEl ? vEl.textContent : "";
          });
          return cells.join(" | ");
        }).filter(r => r.replace(/\|/g, "").trim());
        out.push(`[Sheet: ${sheetNames[si] || `Sheet${si + 1}`}]\n${rows.join("\n")}`);
      }
      return { text: `[BẢNG TÍNH EXCEL: ${name} (${wsFiles.length} sheet)]\n\n${out.join("\n\n").slice(0, 46000)}`, pages: wsFiles.length };
    }

    return { text: "", pages: 0 };
  }

  window.OfficeStudio = {
    THEMES: OFFICE_THEMES,
    exportPptx: exportOfficePptx,
    exportDocx: exportOfficeDocx,
    exportXlsx: exportOfficeXlsx,
    exportPdf: exportOfficePdf,
    openPlayer: openSlideDeckPlayer,
    closePlayer: closeSlideDeckPlayer,
    stepSlide,
    jumpSlide,
    setDeckTheme,
    setDeckTransition,
    generateSlideVisuals,
    openPreview: openOfficePreviewModal,
    extractOfficeFileText,
    deliverBinaryFile,
    getCurrentDeckSpec: () => deckPlayerState?.spec || null
  };
})();
