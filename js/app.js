/* 记账本 · 纯前端 H5（localStorage 持久化，无后端） */
(function () {
  'use strict';

  var STORE_KEY = 'account_records_v1';
  var THEME_KEY = 'account_theme';

  /* ---------- 数据层 ---------- */
  function loadRecords() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }
  function saveRecords(arr) {
    localStorage.setItem(STORE_KEY, JSON.stringify(arr));
  }

  var records = loadRecords();

  /* ---------- 工具函数 ---------- */
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  // 本地今天的 YYYY-MM-DD（用本地时区，避免 UTC 偏移）
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function monthKeyOf(dateStr) { return dateStr.slice(0, 7); } // YYYY-MM
  function monthLabelOf(key) {
    var p = key.split('-');
    return p[0] + '年' + parseInt(p[1], 10) + '月';
  }
  function shiftMonth(key, delta) {
    var p = key.split('-');
    var y = +p[0], m = +p[1] + delta;
    if (m > 12) { y++; m = 1; }
    if (m < 1) { y--; m = 12; }
    return y + '-' + pad2(m);
  }
  function daysInMonth(key) {
    var p = key.split('-');
    return new Date(+p[0], +p[1], 0).getDate();
  }
  function weekdayOf(dateStr) {
    var names = ['日', '一', '二', '三', '四', '五', '六'];
    var p = dateStr.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return '周' + names[d.getDay()];
  }
  function fmtMoney(n) {
    var neg = n < 0;
    var s = Math.abs(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (neg ? '-' : '') + s;
  }

  /* ---------- DOM ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var dateInput = $('dateInput');
  var amountInput = $('amountInput');
  var noteInput = $('noteInput');
  var signBtn = $('signBtn');
  var saveBtn = $('saveBtn');
  var prevMonth = $('prevMonth');
  var nextMonth = $('nextMonth');
  var todayBtn = $('todayBtn');
  var monthLabel = $('monthLabel');
  var recordList = $('recordList');
  var recordsCount = $('recordsCount');
  var emptyHint = $('emptyHint');
  var chartEl = $('chart');
  var chartEmpty = $('chartEmpty');
  var totalBalanceEl = $('totalBalance');
  var totalSubEl = $('totalSub');
  var monthTotalEl = $('monthTotal');
  var monthSubEl = $('monthSub');
  var monthLabelSmall = $('monthLabelSmall');
  var themeBtn = $('themeBtn');
  var exportBtn = $('exportBtn');
  var toastEl = $('toast');

  var viewMonth = monthKeyOf(todayStr()); // 当前查看的月份

  /* ---------- Toast ---------- */
  var toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  }

  /* ---------- 渲染：汇总 ---------- */
  function renderSummary() {
    var all = 0;
    records.forEach(function (r) { all += r.amount; });
    totalBalanceEl.textContent = fmtMoney(all);
    totalBalanceEl.style.color = all < 0 ? 'var(--neg)' : (all > 0 ? 'var(--pos)' : 'var(--text)');
    totalSubEl.textContent = '共 ' + records.length + ' 笔';

    var monthRecs = records.filter(function (r) { return monthKeyOf(r.date) === viewMonth; });
    var mNet = 0, mIn = 0, mOut = 0;
    monthRecs.forEach(function (r) {
      mNet += r.amount;
      if (r.amount > 0) mIn += r.amount; else mOut += -r.amount;
    });
    monthLabelSmall.textContent = monthLabelOf(viewMonth) + '合计';
    monthTotalEl.textContent = fmtMoney(mNet);
    monthTotalEl.style.color = mNet < 0 ? 'var(--neg)' : (mNet > 0 ? 'var(--pos)' : '#fff');
    monthSubEl.textContent = '收 ' + fmtMoney(mIn) + ' / 支 ' + fmtMoney(mOut);
  }

  /* ---------- 渲染：明细列表 ---------- */
  function renderList() {
    var monthRecs = records
      .filter(function (r) { return monthKeyOf(r.date) === viewMonth; })
      .sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : b.ts - a.ts); });

    recordList.innerHTML = '';
    recordsCount.textContent = monthRecs.length;
    emptyHint.style.display = monthRecs.length ? 'none' : 'block';

    monthRecs.forEach(function (r) {
      var li = document.createElement('li');
      li.className = 'record-item';

      var day = r.date.slice(8, 10);
      var recDay = document.createElement('div');
      recDay.className = 'rec-day';
      recDay.innerHTML = '<div class="d">' + day + '</div><div class="w">' + weekdayOf(r.date) + '</div>';

      var main = document.createElement('div');
      main.className = 'rec-main';
      var note = r.note ? escapeHtml(r.note) : '<span style="color:var(--text-soft)">无备注</span>';
      main.innerHTML = '<div class="rec-note">' + note + '</div><div class="rec-date">' + r.date + '</div>';

      var amt = document.createElement('div');
      amt.className = 'rec-amount ' + (r.amount < 0 ? 'neg' : 'pos');
      amt.textContent = (r.amount < 0 ? '' : '+') + fmtMoney(r.amount);

      var del = document.createElement('button');
      del.className = 'rec-del';
      del.textContent = '🗑';
      del.title = '删除';
      del.addEventListener('click', function () { removeRecord(r.id); });

      li.appendChild(recDay);
      li.appendChild(main);
      li.appendChild(amt);
      li.appendChild(del);
      recordList.appendChild(li);
    });
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- 渲染：月度趋势图（SVG） ---------- */
  function renderChart() {
    // 聚合所有有数据的月份
    var map = {};
    records.forEach(function (r) {
      var k = monthKeyOf(r.date);
      map[k] = (map[k] || 0) + r.amount;
    });
    var keys = Object.keys(map).sort();
    if (!keys.length) {
      chartEl.innerHTML = '';
      chartEmpty.style.display = 'block';
      return;
    }
    chartEmpty.style.display = 'none';

    var data = keys.map(function (k) { return { key: k, net: map[k] }; });
    var maxAbs = Math.max.apply(null, data.map(function (d) { return Math.abs(d.net); })) || 1;

    var barW = 30, gap = 16, padTop = 22, padBottom = 28, height = 180;
    var svgW = Math.max(chartEl.clientWidth || 320, data.length * (barW + gap) + gap);
    var svgH = height;
    var midY = padTop + (height - padTop - padBottom) / 2;
    var scale = (height - padTop - padBottom) / 2 / maxAbs;

    var parts = [];
    parts.push('<svg width="' + svgW + '" height="' + svgH + '" viewBox="0 0 ' + svgW + ' ' + svgH + '" xmlns="http://www.w3.org/2000/svg">');
    // 中线
    parts.push('<line x1="0" y1="' + midY + '" x2="' + svgW + '" y2="' + midY + '" stroke="var(--border)" stroke-width="1"/>');

    data.forEach(function (d, i) {
      var x = gap + i * (barW + gap);
      var h = Math.abs(d.net) * scale;
      var color = d.net >= 0 ? 'var(--pos)' : 'var(--neg)';
      var y = d.net >= 0 ? midY - h : midY;
      parts.push('<rect x="' + x + '" y="' + y + '" width="' + barW + '" height="' + Math.max(h, 1) + '" rx="4" fill="' + color + '"/>');
      // 数值
      var labelY = d.net >= 0 ? y - 6 : y + h + 14;
      parts.push('<text x="' + (x + barW / 2) + '" y="' + labelY + '" text-anchor="middle" font-size="10" fill="var(--text-soft)">' + Math.round(d.net) + '</text>');
      // 月份
      parts.push('<text x="' + (x + barW / 2) + '" y="' + (svgH - 8) + '" text-anchor="middle" font-size="10" fill="var(--text-soft)">' + parseInt(d.key.split('-')[1], 10) + '月</text>');
    });
    parts.push('</svg>');
    chartEl.innerHTML = parts.join('');
  }

  /* ---------- 渲染：月份标签 ---------- */
  function renderMonthLabel() {
    monthLabel.textContent = monthLabelOf(viewMonth);
  }

  function renderAll() {
    renderMonthLabel();
    renderSummary();
    renderList();
    renderChart();
  }

  /* ---------- 增删 ---------- */
  function addRecord() {
    var date = dateInput.value || todayStr();
    var raw = amountInput.value.trim();
    var amount = parseFloat(raw);
    if (raw === '' || isNaN(amount)) {
      toast('请输入有效的金额');
      return;
    }
    // 保留 2 位小数，避免浮点误差
    amount = Math.round(amount * 100) / 100;

    records.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      date: date,
      amount: amount,
      note: noteInput.value.trim(),
      ts: Date.now()
    });
    saveRecords(records);

    // 跳到所记日期所在月份，便于即时看到
    viewMonth = monthKeyOf(date);
    amountInput.value = '';
    noteInput.value = '';
    setSign('+');
    renderAll();
    toast('已保存：' + (amount < 0 ? '' : '+') + fmtMoney(amount));
  }

  function removeRecord(id) {
    if (!window.confirm('确定删除这笔记账吗？')) return;
    records = records.filter(function (r) { return r.id !== id; });
    saveRecords(records);
    renderAll();
    toast('已删除');
  }

  /* ---------- 正负号切换 ---------- */
  function setSign(sign) {
    signBtn.textContent = sign === '-' ? '－' : '＋';
    signBtn.dataset.sign = sign;
  }
  function syncSignFromInput() {
    var v = parseFloat(amountInput.value);
    if (!isNaN(v) && v < 0) setSign('-'); else setSign('+');
  }
  signBtn.addEventListener('click', function () {
    var v = parseFloat(amountInput.value);
    if (isNaN(v) || v === 0) {
      setSign(signBtn.dataset.sign === '-' ? '+' : '-');
      return;
    }
    amountInput.value = (-v).toString();
    setSign(v < 0 ? '+' : '-');
  });
  amountInput.addEventListener('input', syncSignFromInput);

  /* ---------- 月份导航 ---------- */
  prevMonth.addEventListener('click', function () { viewMonth = shiftMonth(viewMonth, -1); renderAll(); });
  nextMonth.addEventListener('click', function () { viewMonth = shiftMonth(viewMonth, 1); renderAll(); });
  todayBtn.addEventListener('click', function () { viewMonth = monthKeyOf(todayStr()); renderAll(); });

  saveBtn.addEventListener('click', addRecord);

  /* ---------- 主题 ---------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  }
  themeBtn.addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme');
    applyTheme(cur === 'dark' ? 'light' : 'dark');
    renderChart(); // 主题色变量变化后重绘
  });

  /* ---------- 导出 Excel（多 sheet，仿原表结构） ---------- */
  exportBtn.addEventListener('click', function () {
    if (!records.length) { toast('还没有数据可导出'); return; }
    if (typeof XLSX === 'undefined') { toast('导出组件未加载'); return; }

    // 按月份聚合（每天净合计）
    var byMonth = {};
    records.forEach(function (r) {
      var k = monthKeyOf(r.date);
      (byMonth[k] = byMonth[k] || {});
      byMonth[k][r.date] = (byMonth[k][r.date] || 0) + r.amount;
    });

    var wb = XLSX.utils.book_new();
    Object.keys(byMonth).sort().forEach(function (k) {
      var p = k.split('-');
      var y = +p[0], m = +p[1];
      var dim = daysInMonth(k);
      var rows = [['月份', '天数', '金额']];
      var total = 0;
      for (var d = 1; d <= dim; d++) {
        var ds = y + '-' + pad2(m) + '-' + pad2(d);
        var val = byMonth[k][ds];
        rows.push([d === 1 ? m : '', d + '号', (val == null ? '' : Math.round(val * 100) / 100)]);
        if (val != null) total += val;
      }
      rows.push(['总计', '', Math.round(total * 100) / 100]);
      var ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 8 }, { wch: 8 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, ws, m + '月份');
    });

    var fname = '记账本_' + todayStr() + '.xlsx';
    XLSX.writeFile(wb, fname);
    toast('已导出 ' + fname);
  });

  // 窗口尺寸变化时重绘图表，避免宽度错位
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderChart, 150);
  });

  /* ---------- 初始化 ---------- */
  (function init() {
    var savedTheme = null;
    try { savedTheme = localStorage.getItem(THEME_KEY); } catch (e) {}
    if (!savedTheme) {
      savedTheme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    applyTheme(savedTheme);

    dateInput.value = todayStr();
    setSign('+');
    renderAll();
  })();
})();
