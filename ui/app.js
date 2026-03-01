(function () {
  const mainPanel = document.getElementById("main-panel");
  const placeholder = document.getElementById("placeholder");
  const legendWrap = document.getElementById("legend-wrap");
  const legendBody = document.getElementById("legend-body");
  const rawFilesWrap = document.getElementById("raw-files-wrap");
  const rawFilesBody = document.getElementById("raw-files-body");
  const plotWrap = document.getElementById("plot-wrap");
  const plotPlaceholder = document.getElementById("plot-placeholder");
  const plotCanvas = document.getElementById("plot-canvas");
  const plotTooltip = document.getElementById("plot-tooltip");
  let plotCircles = [];
  let plotBounds = null;
  const selAsset = document.getElementById("sel-asset");
  const selDate = document.getElementById("sel-date");
  const selTf = document.getElementById("sel-tf");
  const selPlotType = document.getElementById("sel-plot-type");
  const btnPlot = document.getElementById("btn-plot");
  const alertsStartHm = document.getElementById("alerts-start-hm");
  const alertsEndHm = document.getElementById("alerts-end-hm");
  const btnLoadAlerts = document.getElementById("btn-load-alerts");
  const btnAlertsExample = document.getElementById("btn-alerts-example");
  const alertsPeriodError = document.getElementById("alerts-period-error");
  const alertsPeriodTableWrap = document.getElementById("alerts-period-table-wrap");
  const alertsPeriodBody = document.getElementById("alerts-period-body");
  const tabInfo = document.getElementById("tab-info");
  const tabPlot = document.getElementById("tab-plot");
  const tabRaw = document.getElementById("tab-raw");
  const leftInfo = document.getElementById("left-info");
  const leftPlot = document.getElementById("left-plot");
  const leftRaw = document.getElementById("left-raw");
  const mainInfo = document.getElementById("main-info");
  const mainPlot = document.getElementById("main-plot");
  const mainRaw = document.getElementById("main-raw");
  const rawPlaceholder = document.getElementById("raw-placeholder");
  const rawSelAsset = document.getElementById("raw-sel-asset");
  const rawSelDate = document.getElementById("raw-sel-date");
  const rawFromTime = document.getElementById("raw-from-time");
  const rawToTime = document.getElementById("raw-to-time");
  const rawSelTf = document.getElementById("raw-sel-tf");
  const rawSelSource = document.getElementById("raw-sel-source");
  const btnRawList = document.getElementById("btn-raw-list");
  const btnRawAlerts = document.getElementById("btn-raw-alerts");
  const rawAlertsWrap = document.getElementById("raw-alerts-wrap");
  const rawAlertsError = document.getElementById("raw-alerts-error");
  const rawAlertsThead = document.getElementById("raw-alerts-thead");
  const rawAlertsBody = document.getElementById("raw-alerts-body");
  const rawAttrsTrigger = document.getElementById("raw-attrs-trigger");
  const rawAttrsPanel = document.getElementById("raw-attrs-panel");
  const rawAttrsCheckboxes = document.getElementById("raw-attrs-checkboxes");

  var SOURCE_ATTR_GROUPS = {
    alerts: [
      { label: "Id", attrs: ["time", "bar_index", "ticker", "tickerid", "tf", "received_at"] },
      { label: "Price / VWAP", attrs: ["close", "volume", "htfVwap", "REV_avwap", "TRADE_avwap", "htf", "htf2"] },
      { label: "Reversal", attrs: ["revDir", "reversalScore", "shockDir", "shockScore", "noneDir", "noneScore", "inTrendScore", "trendDir"] },
      { label: "Trend", attrs: ["tTrendDir", "tTrendAbs", "tRegimeDir", "tRegimeAbs", "tPreDir", "tPreAbs", "tPreCDir", "tPreCAbs"] },
      { label: "Peak / Shock", attrs: ["tPeakDir", "tPeakConf", "tShockDirTot", "tShockScoreTot"] },
      { label: "ATR", attrs: ["atrNow", "atrBase", "atrRatio"] },
      { label: "SMA Cross", attrs: ["smaCrossDirHTF", "smaCrossScoreHTF", "smaCrossDirInd", "smaCrossScoreInd", "htfSmaFastDir", "htfSmaFastScore", "htfSmaFastBarsSince"] },
      { label: "FSM", attrs: ["FSM_State", "prev_state", "new_state"] }
    ],
    raw_vectors: [
      { label: "Id", attrs: ["time", "bar_index", "ticker", "tickerid", "tf", "received_at"] },
      { label: "Price / VWAP", attrs: ["close", "volume", "htfVwap", "REV_avwap", "TRADE_avwap", "htf", "htf2"] },
      { label: "Reversal", attrs: ["revDir", "reversalScore", "shockDir", "shockScore", "noneDir", "noneScore", "inTrendScore", "trendDir"] },
      { label: "Trend", attrs: ["tTrendDir", "tTrendAbs", "tRegimeDir", "tRegimeAbs", "tPreDir", "tPreAbs", "tPreCDir", "tPreCAbs"] },
      { label: "Peak / Shock", attrs: ["tPeakDir", "tPeakConf", "tShockDirTot", "tShockScoreTot"] },
      { label: "ATR", attrs: ["atrNow", "atrBase", "atrRatio"] },
      { label: "SMA Cross", attrs: ["smaCrossDirHTF", "smaCrossScoreHTF", "smaCrossDirInd", "smaCrossScoreInd", "htfSmaFastDir", "htfSmaFastScore", "htfSmaFastBarsSince"] },
      { label: "FSM", attrs: ["FSM_State", "prev_state", "new_state"] }
    ],
    trades: [
      { label: "Id", attrs: ["time", "bar_index", "ticker", "tf", "received_at"] },
      { label: "Trade", attrs: ["event", "dir", "entryPx", "exitPx", "pnl", "tradeScore"] },
      { label: "Price / VWAP", attrs: ["close", "volume", "TRADE_avwap", "REV_avwap", "htf", "htf2"] },
      { label: "ATR", attrs: ["atrNow", "atrBase"] },
      { label: "Trend", attrs: ["trendDir", "tPreDir", "tPreCDir", "smaCrossDirInd"] },
      { label: "FSM", attrs: ["prev_state", "new_state"] }
    ],
    classified: [
      { label: "Id", attrs: ["closing_bar_index", "segment_id", "ticker", "tf", "date", "start_time", "duration_min", "bars"] },
      { label: "Price", attrs: ["p0_close", "p1_close", "delta_pct", "range_pct", "efficiency"] },
      { label: "Volume", attrs: ["dollarVol_sum", "vol_slope", "vol_peak_ratio"] },
      { label: "ATR", attrs: ["atrRatio_peak", "atrRatio_q50"] },
      { label: "VWAP", attrs: ["rev_avwap_side_frac", "rev_avwap_cross_count", "rev_avwap_dist_abs_mean_pct", "htfVwap_side_frac", "htfVwap_cross_count"] },
      { label: "Shock", attrs: ["tShockScoreTot_peak", "tShockScoreTot_density", "tShock_time_to_peak"] },
      { label: "Trend", attrs: ["tTrendAbs_area", "tTrendAbs_active_frac", "inTrendScore_area", "tRegimeAbs_active_frac", "smaCrossScoreInd_active_frac"] },
      { label: "Classification", attrs: ["profit_score", "entry_score", "maintain_score", "tradeability_score", "tier", "next_profit_score", "next_entry_score", "next_maintain_score", "next_tradeability_score", "next_delta_pct", "next_tier"] }
    ]
  };
  var SOURCE_DEFAULTS = {
    alerts:      ["time", "bar_index", "revDir", "close", "REV_avwap"],
    raw_vectors: ["time", "bar_index", "revDir", "close", "REV_avwap"],
    trades:      ["time", "bar_index", "event", "dir", "entryPx", "exitPx", "pnl"],
    classified:  ["start_time", "closing_bar_index", "p0_close", "delta_pct", "tier", "tradeability_score"]
  };
  var rawAttrsSelected = SOURCE_DEFAULTS["alerts"].slice();

  function currentSourceGroups() {
    return SOURCE_ATTR_GROUPS[rawSelSource.value] || SOURCE_ATTR_GROUPS["alerts"];
  }

  function initRawAttrsCheckboxes() {
    rawAttrsCheckboxes.innerHTML = "";
    currentSourceGroups().forEach(function (group) {
      var groupDiv = document.createElement("div");
      groupDiv.className = "raw-attrs-group";
      var submenu = document.createElement("div");
      submenu.className = "raw-attrs-submenu";
      submenu.hidden = true;
      var titleBtn = document.createElement("button");
      titleBtn.type = "button";
      titleBtn.className = "raw-attrs-group-title";
      titleBtn.setAttribute("aria-expanded", "false");
      titleBtn.innerHTML = "<span class=\"raw-attrs-group-arrow\">▶</span> " + escapeHtml(group.label);
      titleBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        var wasHidden = submenu.hidden;
        submenu.hidden = wasHidden ? false : true;
        titleBtn.setAttribute("aria-expanded", !submenu.hidden);
        titleBtn.querySelector(".raw-attrs-group-arrow").textContent = submenu.hidden ? "▶" : "▾";
      });
      groupDiv.appendChild(titleBtn);
      group.attrs.forEach(function (attr) {
        var label = document.createElement("label");
        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = attr;
        cb.checked = rawAttrsSelected.indexOf(attr) !== -1;
        cb.addEventListener("change", function () {
          if (cb.checked) rawAttrsSelected.push(attr);
          else rawAttrsSelected = rawAttrsSelected.filter(function (a) { return a !== attr; });
        });
        label.appendChild(cb);
        label.appendChild(document.createTextNode(attr));
        submenu.appendChild(label);
      });
      groupDiv.appendChild(submenu);
      rawAttrsCheckboxes.appendChild(groupDiv);
    });
  }

  function getSelectedRawAttrs() {
    var sourceAttrs = currentSourceGroups().reduce(function (acc, g) { return acc.concat(g.attrs); }, []);
    return sourceAttrs.filter(function (attr) { return rawAttrsSelected.indexOf(attr) !== -1; });
  }

  rawSelSource.addEventListener("change", function () {
    rawAttrsSelected = (SOURCE_DEFAULTS[rawSelSource.value] || SOURCE_DEFAULTS["alerts"]).slice();
    initRawAttrsCheckboxes();
  });

  rawAttrsTrigger.addEventListener("click", function (e) {
    e.stopPropagation();
    rawAttrsPanel.hidden = !rawAttrsPanel.hidden;
    rawAttrsTrigger.setAttribute("aria-expanded", !rawAttrsPanel.hidden);
  });
  document.addEventListener("click", function (e) {
    if (rawAttrsPanel.hidden) return;
    if (rawAttrsTrigger.contains(e.target) || rawAttrsPanel.contains(e.target)) return;
    if (leftRaw.contains(e.target)) return;
    rawAttrsPanel.hidden = true;
    rawAttrsTrigger.setAttribute("aria-expanded", "false");
  });

  loadClassifiedManifest();
  initRawAttrsCheckboxes();
  btnPlot.addEventListener("click", onPlotClick);
  btnLoadAlerts.addEventListener("click", onLoadAlertsClick);
  btnAlertsExample.addEventListener("click", onAlertsExampleClick);
  btnRawList.addEventListener("click", onRawListClick);
  btnRawAlerts.addEventListener("click", onRawAlertsClick);
  tabInfo.addEventListener("click", function () { switchTab("info"); });
  tabPlot.addEventListener("click", function () { switchTab("plot"); });
  tabRaw.addEventListener("click", function () { switchTab("raw"); });
  document.querySelectorAll(".info-section-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      showLegend(btn.getAttribute("data-section"));
    });
  });

  function loadClassifiedManifest() {
    function applyMeta(data) {
      if (data) {
        fillSelect(selAsset, data.assets || []);
        fillSelect(selDate, data.dates || []);
        fillSelect(selTf, data.tf || []);
        fillSelect(rawSelAsset, data.assets || []);
        fillSelect(rawSelDate, data.dates || []);
        fillSelect(rawSelTf, data.tf || []);
      }
    }
    fetch("/api/classified-meta")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data) { applyMeta(data); return; }
        return fetch("classified-manifest.json").then(function (r) {
          return r.ok ? r.json() : null;
        });
      })
      .then(applyMeta)
      .catch(function () {});
  }

  function switchTab(tabName) {
    tabInfo.setAttribute("aria-selected", tabName === "info");
    tabPlot.setAttribute("aria-selected", tabName === "plot");
    tabRaw.setAttribute("aria-selected", tabName === "raw");
    leftInfo.hidden = tabName !== "info";
    leftPlot.hidden = tabName !== "plot";
    leftRaw.hidden = tabName !== "raw";
    mainInfo.hidden = tabName !== "info";
    mainPlot.hidden = tabName !== "plot";
    mainRaw.hidden = tabName !== "raw";
  }

  function fillSelect(sel, options) {
    const first = sel.options[0];
    sel.innerHTML = "";
    if (first) sel.appendChild(first);
    else sel.appendChild(new Option("—", ""));
    (options || []).forEach(function (v) {
      sel.appendChild(new Option(v, v));
    });
  }

  function onPlotClick() {
    var asset = selAsset.value;
    var date = selDate.value;
    var tf = selTf.value;
    var plotType = selPlotType.value;
    plotPlaceholder.hidden = false;
    plotWrap.hidden = true;
    if (!asset || !date || !tf) {
      plotPlaceholder.textContent = "Select asset, date, and TF first.";
      return;
    }
    if (plotType === "time_series") {
      fetch("/api/plot/vectors?asset=" + encodeURIComponent(asset) + "&date=" + encodeURIComponent(date) + "&tf=" + encodeURIComponent(tf))
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (!data || !data.segments || data.segments.length === 0) {
            plotPlaceholder.textContent = "No segments for " + asset + " / " + date + " / " + tf + ". Bars in session: " + (data && data.barsInDay != null ? data.barsInDay : "—") + ".";
            plotPlaceholder.hidden = false;
            return;
          }
          plotPlaceholder.hidden = true;
          plotWrap.hidden = false;
          requestAnimationFrame(function () { drawVectorsPlot(data, tf); });
        })
        .catch(function () {
          plotPlaceholder.textContent = "Failed to load plot data.";
          plotPlaceholder.hidden = false;
        });
    } else {
      plotPlaceholder.textContent = "Plot type \"" + plotType + "\" not implemented yet.";
    }
  }

  function tfMinutesFromData(data) {
    const sessionLen = (data.sessionEndMin != null ? data.sessionEndMin : 17 * 60 + 30) - (data.sessionStartMin != null ? data.sessionStartMin : 8 * 60 + 30);
    const barsInDay = data.barsInDay > 0 ? data.barsInDay : 108;
    return sessionLen / barsInDay;
  }

  function drawVectorsPlot(data, tf) {
    plotCanvas.width = plotWrap.clientWidth;
    var maxPlotHeight = Math.floor((window.innerHeight - 160) * 0.72);
    plotCanvas.height = Math.max(400, Math.min(plotWrap.clientHeight || 600, maxPlotHeight));
    const sessionStartMin = data.sessionStartMin != null ? data.sessionStartMin : 8 * 60 + 30;
    const sessionEndMin = data.sessionEndMin != null ? data.sessionEndMin : 17 * 60 + 30;
    const sessionLenMin = sessionEndMin - sessionStartMin;
    const tfMin = tfMinutesFromData(data);
    const barsInDay = Math.floor(sessionLenMin / tfMin) || 108;
    const segments = data.segments || [];
    const revAvwapSeries = data.rev_avwap_series || [];
    const htfVwapSeries = data.htf_vwap_series || [];
    const atrnowUpperSeries = data.atrnow_upper_series || [];
    const atrnowLowerSeries = data.atrnow_lower_series || [];
    const plotTrades = data.trades || [];
    const tradeAvwapSegments = data.trade_avwap_segments || [];
    const padding = { top: 24, right: 20, bottom: 52, left: 54 };
    const w = plotCanvas.width;
    const h = plotCanvas.height;
    const plotLeft = padding.left;
    const plotRight = w - padding.right;
    const plotTop = padding.top;
    const plotBottom = h - padding.bottom;
    const plotW = plotRight - plotLeft;
    const plotH = plotBottom - plotTop;
    const circleRadius = 6;
    const hitRadius = 10;

    const TIER_COLORS = {
      "1": "#1565C0", "2": "#2E7D32", "3": "#E65100", "4": "#C62828",
      "A": "#1565C0", "B": "#2E7D32", "C": "#E65100", "D": "#C62828",
      "elite": "#1565C0", "high_quality": "#2E7D32", "tradable": "#E65100",
      "difficult": "#C62828", "low_edge": "#7B1FA2", "non_tradable": "#455A64"
    };
    const REV_AVWAP_COLOR = "#cc00cc";
    const HTF_VWAP_COLOR = "#0d47a1";
    const ATRNOW_BAND_COLOR = "#1976d2";

    let minP = Infinity;
    let maxP = -Infinity;
    segments.forEach(function (s) {
      if (s.close_first != null && Number.isFinite(s.close_first)) { minP = Math.min(minP, s.close_first); maxP = Math.max(maxP, s.close_first); }
      if (s.close_last != null && Number.isFinite(s.close_last)) { minP = Math.min(minP, s.close_last); maxP = Math.max(maxP, s.close_last); }
    });
    revAvwapSeries.forEach(function (p) {
      if (p.value != null && Number.isFinite(p.value)) { minP = Math.min(minP, p.value); maxP = Math.max(maxP, p.value); }
    });
    htfVwapSeries.forEach(function (p) {
      if (p.value != null && Number.isFinite(p.value)) { minP = Math.min(minP, p.value); maxP = Math.max(maxP, p.value); }
    });
    atrnowUpperSeries.forEach(function (p) {
      if (p.value != null && Number.isFinite(p.value)) { minP = Math.min(minP, p.value); maxP = Math.max(maxP, p.value); }
    });
    atrnowLowerSeries.forEach(function (p) {
      if (p.value != null && Number.isFinite(p.value)) { minP = Math.min(minP, p.value); maxP = Math.max(maxP, p.value); }
    });
    plotTrades.forEach(function (tr) {
      if (tr.entryPx != null && Number.isFinite(tr.entryPx)) { minP = Math.min(minP, tr.entryPx); maxP = Math.max(maxP, tr.entryPx); }
      if (tr.exitPx != null && Number.isFinite(tr.exitPx)) { minP = Math.min(minP, tr.exitPx); maxP = Math.max(maxP, tr.exitPx); }
    });
    tradeAvwapSegments.forEach(function (seg) {
      (seg.points || []).forEach(function (p) {
        if (p.value != null && Number.isFinite(p.value)) { minP = Math.min(minP, p.value); maxP = Math.max(maxP, p.value); }
      });
    });
    if (minP === Infinity) minP = 0;
    if (maxP <= minP) maxP = minP + 1;
    const pricePad = (maxP - minP) * 0.05 || 1;
    const yMin = minP - pricePad;
    const yMax = maxP + pricePad;

    function xFromMin(m) {
      return plotLeft + ((m - sessionStartMin) / (sessionEndMin - sessionStartMin)) * plotW;
    }
    function yFromPrice(p) {
      return plotBottom - ((p - yMin) / (yMax - yMin)) * plotH;
    }

    plotCircles = [];
    const ctx = plotCanvas.getContext("2d");
    ctx.clearRect(0, 0, w, h);

    var barWidthPx = plotW / barsInDay;
    for (var k = 0; k < barsInDay; k++) {
      if (k % 2 === 0) continue;
      var x0 = plotLeft + k * barWidthPx;
      ctx.fillStyle = "rgba(0,0,0,0.04)";
      ctx.fillRect(x0, plotTop, barWidthPx, plotH);
    }

    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotLeft, plotTop);
    ctx.lineTo(plotLeft, plotBottom);
    ctx.lineTo(plotRight, plotBottom);
    ctx.stroke();

    segments.forEach(function (s) {
      const x1 = xFromMin(s.start_min);
      const x2 = xFromMin(s.end_min);
      const y1 = yFromPrice(s.close_first);
      const y2 = yFromPrice(s.close_last);
      const tierKey = String(s.tier != null ? s.tier : "");
      ctx.strokeStyle = TIER_COLORS[tierKey] || "#333333";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
    for (var i = 0; i < segments.length - 1; i++) {
      var cur = segments[i];
      var next = segments[i + 1];
      var x0 = xFromMin(cur.end_min);
      var y0 = yFromPrice(cur.close_last);
      var x1 = xFromMin(next.start_min);
      var y1 = yFromPrice(next.close_first);
      var nextTierKey = String(next.tier != null ? next.tier : "");
      ctx.strokeStyle = TIER_COLORS[nextTierKey] || "#333333";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }

    if (revAvwapSeries.length > 0) {
      ctx.strokeStyle = REV_AVWAP_COLOR;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      var first = true;
      revAvwapSeries.forEach(function (p) {
        var x = xFromMin(p.min);
        var y = yFromPrice(p.value);
        if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (atrnowUpperSeries.length > 0 && atrnowLowerSeries.length > 0) {
      ctx.strokeStyle = ATRNOW_BAND_COLOR;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      var first = true;
      atrnowUpperSeries.forEach(function (p) {
        var x = xFromMin(p.min);
        var y = yFromPrice(p.value);
        if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.beginPath();
      first = true;
      atrnowLowerSeries.forEach(function (p) {
        var x = xFromMin(p.min);
        var y = yFromPrice(p.value);
        if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (htfVwapSeries.length > 0) {
      ctx.strokeStyle = HTF_VWAP_COLOR;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      var first = true;
      htfVwapSeries.forEach(function (p) {
        var x = xFromMin(p.min);
        var y = yFromPrice(p.value);
        if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    var TRADE_AVWAP_ACTIVE_COLOR = "#e65100";
    tradeAvwapSegments.forEach(function (seg) {
      var pts = seg.points || [];
      if (pts.length === 0) return;
      ctx.strokeStyle = TRADE_AVWAP_ACTIVE_COLOR;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(xFromMin(pts[0].min), yFromPrice(pts[0].value));
      for (var i = 1; i < pts.length; i++) ctx.lineTo(xFromMin(pts[i].min), yFromPrice(pts[i].value));
      ctx.stroke();
      ctx.setLineDash([]);
    });

    segments.forEach(function (s) {
      const x1 = xFromMin(s.start_min);
      const x2 = xFromMin(s.end_min);
      const y1 = yFromPrice(s.close_first);
      const y2 = yFromPrice(s.close_last);
      const isPeak = s.close_first > s.close_last;
      const tierKey = String(s.tier != null ? s.tier : "");
      plotCircles.push({ x: x1, y: y1, segment_id: s.segment_id, type: "start", time_hm: s.start_hm, price: s.close_first, peak: isPeak });
      plotCircles.push({ x: x2, y: y2, segment_id: s.segment_id, type: "end", time_hm: s.end_hm, price: s.close_last, peak: !isPeak });
    });

    segments.forEach(function (s) {
      const x1 = xFromMin(s.start_min);
      const x2 = xFromMin(s.end_min);
      const y1 = yFromPrice(s.close_first);
      const y2 = yFromPrice(s.close_last);
      const tierKey = String(s.tier != null ? s.tier : "");
      ctx.fillStyle = TIER_COLORS[tierKey] || "#333333";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      [ [x1, y1, s.close_first], [x2, y2, s.close_last] ].forEach(function (xy) {
        ctx.beginPath();
        ctx.arc(xy[0], xy[1], circleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    });

    var markRadius = 10;
    var markFont = "bold 14px system-ui, sans-serif";
    plotTrades.forEach(function (tr) {
      var entryMin = tr.entry_min != null ? tr.entry_min : null;
      var exitMin = tr.exit_min != null ? tr.exit_min : null;
      var dir = (tr.dir === "S" || tr.dir === "s") ? "S" : "B";
      if (entryMin != null && tr.entryPx != null && Number.isFinite(tr.entryPx)) {
        var ex = xFromMin(entryMin);
        var ey = yFromPrice(tr.entryPx);
        var sym = dir === "B" ? "+" : "−";
        ctx.font = markFont;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 3;
        ctx.strokeText(sym, ex, ey);
        ctx.fillStyle = dir === "B" ? "#2E7D32" : "#C62828";
        ctx.fillText(sym, ex, ey);
        ctx.fillStyle = "#333";
        ctx.font = "10px system-ui, sans-serif";
        ctx.textBaseline = dir === "B" ? "top" : "bottom";
        ctx.fillText(tr.entryPx.toFixed(2), ex, dir === "B" ? ey - markRadius - 2 : ey + markRadius + 2);
      }
      if (exitMin != null && tr.exitPx != null && Number.isFinite(tr.exitPx)) {
        var xx = xFromMin(exitMin);
        var xy = yFromPrice(tr.exitPx);
        ctx.font = markFont;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 3;
        ctx.strokeText("×", xx, xy);
        ctx.fillStyle = "#C62828";
        ctx.fillText("×", xx, xy);
        ctx.fillStyle = "#333";
        ctx.font = "10px system-ui, sans-serif";
        ctx.textBaseline = "top";
        ctx.fillText(tr.exitPx.toFixed(2), xx, xy + markRadius + 2);
      }
    });

    ctx.fillStyle = "#333";
    ctx.font = "11px system-ui, sans-serif";
    segments.forEach(function (s) {
      const x1 = xFromMin(s.start_min);
      const x2 = xFromMin(s.end_min);
      const y1 = yFromPrice(s.close_first);
      const y2 = yFromPrice(s.close_last);
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(s.close_first.toFixed(2), x1, y1 - circleRadius - 2);
      ctx.fillText(s.close_last.toFixed(2), x2, y2 - circleRadius - 2);
    });

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    var minLabelSpacing = 52;
    var maxLabels = Math.max(1, Math.floor(plotW / minLabelSpacing));
    var labelStep = Math.max(2, Math.ceil(barsInDay / maxLabels));
    if (labelStep % 2 !== 0) labelStep += 1;
    for (var k = 0; k <= barsInDay; k += labelStep) {
      var min = sessionStartMin + k * tfMin;
      var hh = Math.floor(min / 60);
      var mm = min % 60;
      var label = String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
      var x = xFromMin(min);
      ctx.fillText(label, x, plotBottom + 16);
    }
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    var numYLabels = Math.max(16, Math.floor(plotH / 20));
    for (var i = 0; i <= numYLabels; i++) {
      var p = yMax - (yMax - yMin) * (i / numYLabels);
      var y = plotBottom - ((p - yMin) / (yMax - yMin)) * plotH;
      ctx.fillText(p.toFixed(2), plotLeft - 6, y);
    }
    ctx.textBaseline = "alphabetic";

    var legendY = plotTop + 10;
    var legendX = plotRight - 10;
    ctx.textAlign = "right";
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillStyle = "#555";
    ctx.fillText("Lines", legendX, legendY + 4);
    legendY += 18;
    if (revAvwapSeries.length > 0) {
      ctx.strokeStyle = REV_AVWAP_COLOR;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(legendX - 40, legendY);
      ctx.lineTo(legendX - 10, legendY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#333";
      ctx.fillText("REV_avwap (reversal VWAP)", legendX, legendY + 4);
      legendY += 18;
    }
    if (htfVwapSeries.length > 0) {
      ctx.strokeStyle = HTF_VWAP_COLOR;
      ctx.setLineDash([]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(legendX - 40, legendY);
      ctx.lineTo(legendX - 10, legendY);
      ctx.stroke();
      ctx.fillStyle = "#333";
      ctx.fillText("htfVwap (higher-timeframe VWAP)", legendX, legendY + 4);
      legendY += 18;
    }
    if (atrnowUpperSeries.length > 0) {
      ctx.strokeStyle = ATRNOW_BAND_COLOR;
      ctx.setLineDash([2, 2]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(legendX - 40, legendY);
      ctx.lineTo(legendX - 10, legendY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#333";
      ctx.fillText("+/- atrnow (ATR band)", legendX, legendY + 4);
      legendY += 18;
    }
    if (tradeAvwapSegments.length > 0) {
      ctx.strokeStyle = TRADE_AVWAP_ACTIVE_COLOR;
      ctx.setLineDash([2, 3]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(legendX - 40, legendY);
      ctx.lineTo(legendX - 10, legendY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#333";
      ctx.fillText("TRADE_avwap (while trade open)", legendX, legendY + 4);
      legendY += 18;
    }
    if (plotTrades.length > 0) {
      ctx.fillStyle = "#555";
      ctx.fillText("Trades", legendX, legendY + 4);
      legendY += 18;
      ctx.font = "bold 14px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.strokeText("+", legendX - 20, legendY);
      ctx.fillStyle = "#2E7D32";
      ctx.fillText("+", legendX - 20, legendY);
      ctx.fillStyle = "#333";
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText("Buy entry", legendX, legendY + 4);
      legendY += 18;
      ctx.font = "bold 14px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.strokeText("−", legendX - 20, legendY);
      ctx.fillStyle = "#C62828";
      ctx.fillText("−", legendX - 20, legendY);
      ctx.fillStyle = "#333";
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("Sell entry", legendX, legendY + 4);
      legendY += 18;
      ctx.strokeText("×", legendX - 20, legendY);
      ctx.fillStyle = "#C62828";
      ctx.fillText("×", legendX - 20, legendY);
      ctx.fillStyle = "#333";
      ctx.fillText("Exit", legendX, legendY + 4);
      legendY += 18;
      ctx.textBaseline = "alphabetic";
    }
    ctx.fillStyle = "#555";
    ctx.fillText("Segment tiers", legendX, legendY + 4);
    legendY += 18;
    var tierOrder = ["elite", "high_quality", "tradable", "difficult", "low_edge", "non_tradable"];
    var ballRadius = 6;
    var ballX = legendX - 16;
    var textX = legendX - 28;
    tierOrder.forEach(function (t) {
      var label = t === "" ? "—" : t;
      var ballY = legendY;
      ctx.beginPath();
      ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
      ctx.fillStyle = TIER_COLORS[t] || "#333333";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#333";
      ctx.fillText(label, textX, legendY + 4);
      legendY += 18;
    });

    plotBounds = { plotLeft: plotLeft, plotRight: plotRight, plotTop: plotTop, plotBottom: plotBottom };
  }

  function getCanvasCoords(e) {
    var rect = plotCanvas.getBoundingClientRect();
    var scaleX = plotCanvas.width / rect.width;
    var scaleY = plotCanvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  plotCanvas.addEventListener("click", function (e) {
    if (plotCircles.length === 0) return;
    var coords = getCanvasCoords(e);
    var best = null;
    var bestD = 1e9;
    plotCircles.forEach(function (c) {
      var d = Math.hypot(c.x - coords.x, c.y - coords.y);
      if (d <= 10 && d < bestD) { bestD = d; best = c; }
    });
    if (best) {
      var kind = best.peak ? "peak" : "trough";
      plotTooltip.textContent = best.segment_id + " " + best.type + " " + best.time_hm + " " + best.price.toFixed(2) + " (" + kind + ")";
    } else {
      plotTooltip.textContent = "";
    }
  });

  plotCanvas.addEventListener("mouseleave", function () {
    plotTooltip.textContent = "";
  });

  function barTimeToHm(t) {
    if (!t || typeof t !== "string") return "—";
    var m = t.trim().match(/(\d{1,2}):(\d{2})/);
    return m ? m[1].padStart(2, "0") + ":" + m[2] : t.slice(11, 16) || "—";
  }

  function onRawListClick() {
    var source = rawSelSource.value;
    rawPlaceholder.hidden = true;
    rawAlertsWrap.hidden = true;
    rawFilesWrap.hidden = false;
    rawFilesBody.innerHTML = "";
    fetch("/api/raw/" + source)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var files = (data && data.files) || [];
        if (files.length === 0) {
          rawFilesWrap.hidden = true;
          rawPlaceholder.hidden = false;
          rawPlaceholder.textContent = "No " + source + " files found.";
          return;
        }
        var origin = window.location.origin;
        files.forEach(function (row) {
          var tr = document.createElement("tr");
          var url = origin + "/api/raw/file?kind=" + encodeURIComponent(source) + "&name=" + encodeURIComponent(row.name);
          tr.innerHTML = "<td><a href=\"" + url + "\" target=\"_blank\" rel=\"noopener\">" + escapeHtml(row.name) + "</a></td><td>" + escapeHtml(String(row.count)) + "</td>";
          rawFilesBody.appendChild(tr);
        });
      })
      .catch(function () {
        rawFilesWrap.hidden = true;
        rawPlaceholder.hidden = false;
        rawPlaceholder.textContent = "Failed to load " + source + " file list.";
      });
  }

  function onRawAlertsClick() {
    var asset = rawSelAsset.value;
    var date = rawSelDate.value;
    var tf = rawSelTf.value;
    var source = rawSelSource.value;
    var startHm = (rawFromTime.value || "0930").replace(/\D/g, "").slice(0, 4);
    var endHm = (rawToTime.value || "1600").replace(/\D/g, "").slice(0, 4);
    if (startHm.length === 3) startHm = "0" + startHm;
    if (endHm.length === 3) endHm = "0" + endHm;
    rawAlertsError.textContent = "";
    rawAlertsBody.innerHTML = "";
    rawFilesWrap.hidden = true;
    if (!asset || !date) {
      rawAlertsError.textContent = "Select asset and date first.";
      rawAlertsWrap.hidden = false;
      return;
    }
    if (source === "classified" && !tf) {
      rawAlertsError.textContent = "Select asset, date, and TF first.";
      rawAlertsWrap.hidden = false;
      return;
    }
    var q = "asset=" + encodeURIComponent(asset) + "&date=" + encodeURIComponent(date);
    if (tf) q += "&tf=" + encodeURIComponent(tf);
    if (startHm) q += "&start_hm=" + encodeURIComponent(startHm);
    if (endHm) q += "&end_hm=" + encodeURIComponent(endHm);
    var attrs = getSelectedRawAttrs();
    if (attrs.length === 0) attrs = (SOURCE_DEFAULTS[source] || SOURCE_DEFAULTS["alerts"]).slice();
    var url = source === "classified" ? "/api/classified/records?" + q : "/api/alerts/bars?" + q;
    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) {
          rawAlertsError.textContent = data.error;
          rawAlertsWrap.hidden = false;
          return;
        }
        var rows = source === "classified" ? (data.records || []) : (data.bars || []);
        var attrsToShow = attrs;
        rawAlertsThead.firstChild.innerHTML = attrsToShow.map(function (a) { return "<th>" + escapeHtml(a) + "</th>"; }).join("");
        rawAlertsBody.innerHTML = "";
        rows.forEach(function (b) {
          var tr = document.createElement("tr");
          var revDir = b.revDir != null ? b.revDir : "—";
          if (revDir !== "—" && revDir !== 0) tr.classList.add("rev-edge");
          tr.innerHTML = attrsToShow.map(function (attr) {
            var val = b[attr] != null ? b[attr] : (attr === "time" ? (b.Time != null ? b.Time : b.start_time) : (attr === "start_time" ? b.start_time : null));
            if ((attr === "time" || attr === "start_time") && val != null) return "<td>" + barTimeToHm(val) + "</td>";
            if (typeof val === "number") return "<td>" + (Number.isInteger(val) ? String(val) : Number(val).toFixed(2)) + "</td>";
            return "<td>" + (val != null ? escapeHtml(String(val)) : "—") + "</td>";
          }).join("");
          rawAlertsBody.appendChild(tr);
        });
        rawAlertsError.textContent = source === "classified" ? (data.files && data.files.length ? data.files.length + " files. " : "") + rows.length + " records." : (data.file ? "File: " + data.file + ". " : "") + rows.length + " bars.";
        rawAlertsWrap.hidden = false;
        if (rows.length === 0) rawAlertsError.textContent = (rawAlertsError.textContent || "") + " No data. Check asset, date, TF and that " + (source === "classified" ? "classified files exist." : "alert file exists.");
      })
      .catch(function () {
        rawAlertsError.textContent = "Failed to load " + (source === "classified" ? "classified records." : "alerts.");
        rawAlertsWrap.hidden = false;
      });
  }

  function onLoadAlertsClick() {
    var asset = selAsset.value;
    var date = selDate.value;
    var tf = selTf.value;
    var startHm = (alertsStartHm.value || "0930").replace(/\D/g, "").slice(0, 4);
    var endHm = (alertsEndHm.value || "1030").replace(/\D/g, "").slice(0, 4);
    if (startHm.length === 3) startHm = "0" + startHm;
    if (endHm.length === 3) endHm = "0" + endHm;
    alertsPeriodError.hidden = true;
    alertsPeriodTableWrap.hidden = true;
    if (!asset || !date) {
      alertsPeriodError.textContent = "Select asset and date first.";
      alertsPeriodError.hidden = false;
      return;
    }
    var q = "asset=" + encodeURIComponent(asset) + "&date=" + encodeURIComponent(date);
    if (tf) q += "&tf=" + encodeURIComponent(tf);
    if (startHm) q += "&start_hm=" + encodeURIComponent(startHm);
    if (endHm) q += "&end_hm=" + encodeURIComponent(endHm);
    fetch("/api/alerts/bars?" + q)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) {
          alertsPeriodError.textContent = data.error;
          alertsPeriodError.hidden = false;
          return;
        }
        var bars = data.bars || [];
        alertsPeriodBody.innerHTML = "";
        bars.forEach(function (b) {
          var tr = document.createElement("tr");
          var revDir = b.revDir != null ? b.revDir : "—";
          if (revDir !== "—" && revDir !== 0) tr.classList.add("rev-edge");
          tr.innerHTML =
            "<td>" + barTimeToHm(b.time || b.Time) + "</td>" +
            "<td>" + revDir + "</td>" +
            "<td>" + (b.close != null ? Number(b.close).toFixed(2) : "—") + "</td>" +
            "<td>" + (b.bar_index != null ? b.bar_index : "—") + "</td>" +
            "<td>" + (b.REV_avwap != null ? Number(b.REV_avwap).toFixed(2) : "—") + "</td>";
          alertsPeriodBody.appendChild(tr);
        });
        alertsPeriodTableWrap.hidden = false;
        if (data.file) alertsPeriodError.textContent = "File: " + data.file + " (" + bars.length + " bars)";
        alertsPeriodError.hidden = false;
      })
      .catch(function () {
        alertsPeriodError.textContent = "Failed to load alerts.";
        alertsPeriodError.hidden = false;
      });
  }

  var ALERTS_EXAMPLE = [
    { time: "09:30", revDir: 0, close: 48.63, bar_index: 12, REV_avwap: 48.55 },
    { time: "09:35", revDir: 0, close: 48.71, bar_index: 13, REV_avwap: 48.58 },
    { time: "09:40", revDir: 0, close: 48.82, bar_index: 14, REV_avwap: 48.62 },
    { time: "09:45", revDir: 1, close: 48.85, bar_index: 15, REV_avwap: 48.72 },
    { time: "09:50", revDir: 0, close: 48.92, bar_index: 16, REV_avwap: 48.78 },
    { time: "09:55", revDir: 0, close: 49.01, bar_index: 17, REV_avwap: 48.85 },
    { time: "10:00", revDir: -1, close: 49.10, bar_index: 18, REV_avwap: 48.95 },
    { time: "10:05", revDir: 0, close: 49.18, bar_index: 19, REV_avwap: 49.02 },
    { time: "10:10", revDir: 0, close: 49.25, bar_index: 20, REV_avwap: 49.10 },
    { time: "10:15", revDir: 1, close: 49.30, bar_index: 21, REV_avwap: 49.18 },
    { time: "10:20", revDir: 0, close: 49.35, bar_index: 22, REV_avwap: 49.22 },
    { time: "10:25", revDir: -1, close: 49.39, bar_index: 23, REV_avwap: 49.28 },
    { time: "10:30", revDir: 0, close: 49.25, bar_index: 24, REV_avwap: 49.25 },
  ];

  function onAlertsExampleClick() {
    alertsPeriodError.textContent = "Example (revDir ≠ 0 rows are reversal edges).";
    alertsPeriodError.hidden = false;
    alertsPeriodTableWrap.hidden = false;
    alertsPeriodBody.innerHTML = "";
    ALERTS_EXAMPLE.forEach(function (b) {
      var tr = document.createElement("tr");
      var revDir = b.revDir != null ? b.revDir : "—";
      if (revDir !== "—" && Number(revDir) !== 0) tr.classList.add("rev-edge");
      tr.innerHTML =
        "<td>" + (b.time || "—") + "</td>" +
        "<td>" + revDir + "</td>" +
        "<td>" + (b.close != null ? Number(b.close).toFixed(2) : "—") + "</td>" +
        "<td>" + (b.bar_index != null ? b.bar_index : "—") + "</td>" +
        "<td>" + (b.REV_avwap != null ? Number(b.REV_avwap).toFixed(2) : "—") + "</td>";
      alertsPeriodBody.appendChild(tr);
    });
  }

  function showLegend(section) {
    const rows = window.LEGEND_DATA && window.LEGEND_DATA[section];
    if (!rows || rows.length === 0) {
      placeholder.hidden = false;
      legendWrap.hidden = true;
      placeholder.textContent = "No legend for this section.";
      return;
    }
    placeholder.hidden = true;
    legendWrap.hidden = false;
    legendBody.innerHTML = "";
    rows.forEach(function (row) {
      const name = row[0];
      const desc = row[1];
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" +
        escapeHtml(name) +
        "</td><td class=\"short-desc\">" +
        escapeHtml(desc) +
        "</td>";
      legendBody.appendChild(tr);
    });
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }
})();
