/* ══ ADU Consultant PWA — app.js ═══════════════════════════════════════════ */
(function () {
  'use strict';

  var history  = JSON.parse(localStorage.getItem('adu_history')  || '[]');
  var settings = JSON.parse(localStorage.getItem('adu_settings') || '{}');

  /* ── Init ──────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    loadSettings();
    updateApiPill();
    renderHistory();

    document.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var view = this.dataset.view;
        document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
        this.classList.add('active');
        document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('active'); });
        document.getElementById('view-' + view).classList.add('active');
      });
    });
  });

  /* ── Helpers ───────────────────────────────────────────── */
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
  function getChecked(id) {
    return Array.from(document.querySelectorAll('#' + id + ' input:checked'))
      .map(function (b) { return b.value; }).join(', ');
  }
  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function fmt(d) {
    return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  }
  function verdictClass(v) {
    return v === 'Feasible' ? 'feasible' : v === 'Conditionally Feasible' ? 'conditional' : 'not-feasible';
  }
  function verdictIcon(v) {
    return v === 'Feasible' ? '✓' : v === 'Conditionally Feasible' ? '◐' : '✕';
  }

  /* ── Settings ──────────────────────────────────────────── */
  function loadSettings() {
    if (settings.apiKey)      document.getElementById('s-apikey').value      = settings.apiKey;
    if (settings.company)     document.getElementById('s-company').value     = settings.company;
    if (settings.consultant)  document.getElementById('s-consultant').value  = settings.consultant;
    if (settings.defaultState) {
      var sel = document.getElementById('s-state');
      if (sel) sel.value = settings.defaultState;
      var fs  = document.getElementById('f-state');
      if (fs)  fs.value  = settings.defaultState;
    }
  }

  window.saveApiKey = function () {
    settings.apiKey = document.getElementById('s-apikey').value.trim();
    localStorage.setItem('adu_settings', JSON.stringify(settings));
    updateApiPill();
    flash('key-saved');
  };

  window.saveSettings = function () {
    settings.company      = document.getElementById('s-company').value.trim();
    settings.consultant   = document.getElementById('s-consultant').value.trim();
    settings.defaultState = document.getElementById('s-state').value;
    localStorage.setItem('adu_settings', JSON.stringify(settings));
    flash('settings-saved');
  };

  function flash(id) {
    var el = document.getElementById(id);
    el.style.display = 'block';
    setTimeout(function () { el.style.display = 'none'; }, 2500);
  }

  function updateApiPill() {
    var dot  = document.getElementById('pill-dot');
    var text = document.getElementById('pill-text');
    if (settings.apiKey && settings.apiKey.startsWith('sk-ant')) {
      dot.classList.add('ok');
      text.textContent = 'API Ready';
    } else {
      dot.classList.remove('ok');
      text.textContent = 'Setup needed';
    }
  }

  /* ── Form ──────────────────────────────────────────────── */
  window.clearForm = function () {
    ['f-name','f-email','f-phone','f-notes','f-address','f-city',
     'f-lot','f-home','f-year','f-zoning','f-coverage','f-far',
     'f-rear','f-side','f-height','f-goals'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.querySelectorAll('#f-types input, #f-constraints input')
      .forEach(function (cb) { cb.checked = false; });
    document.getElementById('form-error').textContent = '';
  };

  function buildPrompt(d) {
    return 'You are an expert ADU feasibility analyst. Respond with ONLY a valid raw JSON object. ' +
      'No markdown, no backticks, no explanation. Start with { and end with }.\n\n' +
      'CLIENT: ' + (d.name || 'Unknown') + '\n' +
      'PROPERTY: ' + d.address + ', ' + d.city + ', ' + d.state + '\n' +
      'LOT: ' + d.lot + ' sqft | HOME: ' + d.home + ' sqft | BUILT: ' + (d.year || 'Unknown') + '\n' +
      'OWNER OCCUPIED: ' + d.owner + '\n' +
      'ZONING: ' + (d.zoning||'Unknown') +
        ' | COVERAGE: ' + (d.coverage ? d.coverage+'%':'Unknown') +
        ' | FAR: ' + (d.far||'Unknown') +
        ' | REAR: ' + (d.rear ? d.rear+'ft':'Unknown') +
        ' | SIDE: ' + (d.side ? d.side+'ft':'Unknown') +
        ' | HEIGHT: ' + (d.height ? d.height+'ft':'Unknown') + '\n' +
      'ADU TYPES: ' + (d.types||'Any') + '\n' +
      'CONSTRAINTS: ' + (d.constraints||'None') + '\n' +
      'GOAL: ' + d.goalType + ' | BUDGET: ' + d.budget + '\n' +
      'NOTES: ' + (d.goals||'None') + '\n\n' +
      'Return JSON with these string fields: ' +
      'verdict ("Feasible" or "Conditionally Feasible" or "Not Feasible"), ' +
      'verdictReason, confidence ("High"/"Medium"/"Low"), ' +
      'estimatedMaxADUSize, estimatedCost, estimatedRentalIncome, estimatedROI, ' +
      'overview, zoningAnalysis, bestADUType, alternativeOptions, ' +
      'constructionConsiderations, financialSnapshot, permittingNotes, ' +
      'nextSteps, risks, consultantTalkingPoints';
  }

  /* ── Run Analysis ──────────────────────────────────────── */
  window.runAnalysis = function () {
    var err = document.getElementById('form-error');
    err.textContent = '';

    if (!settings.apiKey || !settings.apiKey.startsWith('sk-ant')) {
      err.textContent = '⚠ No API key. Go to Settings tab.';
      document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
      document.querySelector('[data-view="settings"]').classList.add('active');
      document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('active'); });
      document.getElementById('view-settings').classList.add('active');
      return;
    }

    var address = val('f-address'), lot = val('f-lot'), home = val('f-home');
    if (!address) { err.textContent = '⚠ Address required'; return; }
    if (!lot)     { err.textContent = '⚠ Lot size required'; return; }
    if (!home)    { err.textContent = '⚠ Home size required'; return; }

    var d = {
      name: val('f-name'), email: val('f-email'), phone: val('f-phone'),
      notes: val('f-notes'), address: address, city: val('f-city'),
      state: val('f-state'), lot: lot, home: home, year: val('f-year'),
      owner: val('f-owner'), zoning: val('f-zoning'), coverage: val('f-coverage'),
      far: val('f-far'), rear: val('f-rear'), side: val('f-side'),
      height: val('f-height'), types: getChecked('f-types'),
      constraints: getChecked('f-constraints'), goalType: val('f-goal-type'),
      budget: val('f-budget'), goals: val('f-goals'),
    };

    // Loading state
    var btn = document.getElementById('analyze-btn');
    btn.disabled = true;
    document.getElementById('btn-label').style.display = 'none';
    document.getElementById('btn-loader').style.display = 'flex';

    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3000,
        messages: [{ role: 'user', content: buildPrompt(d) }],
      }),
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      btn.disabled = false;
      document.getElementById('btn-label').style.display = '';
      document.getElementById('btn-loader').style.display = 'none';

      if (data.error) {
        err.textContent = '⚠ ' + (data.error.message || 'API error');
        return;
      }

      var raw = (data.content || []).map(function (b) { return b.text || ''; }).join('').trim();
      var s = raw.indexOf('{'), e = raw.lastIndexOf('}');
      if (s === -1 || e === -1) { err.textContent = '⚠ Bad response format'; return; }

      var report;
      try { report = JSON.parse(raw.slice(s, e + 1)); }
      catch (ex) { err.textContent = '⚠ Parse error: ' + ex.message; return; }

      // Save history
      var entry = { id: Date.now(), date: new Date().toISOString(), client: d, report: report };
      history.unshift(entry);
      if (history.length > 50) history = history.slice(0, 50);
      localStorage.setItem('adu_history', JSON.stringify(history));
      renderHistory();

      // Show report sheet
      showReport(report, d);
    })
    .catch(function (ex) {
      btn.disabled = false;
      document.getElementById('btn-label').style.display = '';
      document.getElementById('btn-loader').style.display = 'none';
      err.textContent = '⚠ Network error: ' + ex.message;
    });
  };

  /* ── Report sheet ──────────────────────────────────────── */
  function showReport(r, d) {
    var vc = verdictClass(r.verdict);
    var confColor = r.confidence === 'High' ? '#4a9c4a' : r.confidence === 'Medium' ? '#c8a84b' : '#bf4040';

    var cards = [
      ['🗣 Talking Points',            r.consultantTalkingPoints],
      ['📋 Overview',                  r.overview],
      ['📐 Zoning Analysis',           r.zoningAnalysis],
      ['🏡 Best ADU Type',             r.bestADUType],
      ['🔄 Alternative Options',       r.alternativeOptions],
      ['🔨 Construction',              r.constructionConsiderations],
      ['💰 Financial Snapshot',        r.financialSnapshot],
      ['📋 Permitting Notes',          r.permittingNotes],
      ['→ Next Steps',                 r.nextSteps],
      ['⚠ Risks',                      r.risks],
    ].filter(function (c) { return !!c[1]; })
     .map(function (c) {
       return '<div class="r-card"><div class="r-card-title">' + esc(c[0]) +
              '</div><div class="r-card-body">' + esc(c[1]) + '</div></div>';
     }).join('');

    document.getElementById('report-content').innerHTML =
      '<div class="r-hero">' +
        '<div class="r-hero-lbl">ADU Feasibility Report</div>' +
        '<div class="r-hero-name">' + esc(d.name || 'Property Analysis') + '</div>' +
        '<div class="r-hero-addr">' + esc(d.address) + ', ' + esc(d.city) + ' ' + esc(d.state) +
          (d.lot ? ' · ' + esc(d.lot) + ' sqft lot' : '') + '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
          '<div class="r-verdict ' + vc + '">' + verdictIcon(r.verdict) + ' ' + esc(r.verdict) + '</div>' +
          '<span style="font-size:10px;padding:3px 9px;border-radius:4px;background:' + confColor + '22;color:' + confColor + ';border:1px solid ' + confColor + '44;font-weight:700;letter-spacing:1px">' + esc(r.confidence||'Med') + '</span>' +
        '</div>' +
        (r.verdictReason ? '<div class="r-reason">"' + esc(r.verdictReason) + '"</div>' : '') +
      '</div>' +

      '<div class="r-metrics">' +
        '<div class="r-metric"><span class="r-metric-val">' + esc(r.estimatedMaxADUSize||'—') + '</span><span class="r-metric-lbl">Max Size</span></div>' +
        '<div class="r-metric"><span class="r-metric-val" style="font-size:13px">' + esc(r.estimatedCost||'—') + '</span><span class="r-metric-lbl">Est. Cost</span></div>' +
        '<div class="r-metric"><span class="r-metric-val">' + esc(r.estimatedRentalIncome||'—') + '</span><span class="r-metric-lbl">Monthly Rent</span></div>' +
        '<div class="r-metric"><span class="r-metric-val" style="font-size:13px">' + esc(r.estimatedROI||'—') + '</span><span class="r-metric-lbl">ROI / Payback</span></div>' +
      '</div>' +

      cards;

    document.getElementById('report-sheet').classList.add('open');
    document.getElementById('sheet-backdrop').classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  window.closeReport = function () {
    document.getElementById('report-sheet').classList.remove('open');
    document.getElementById('sheet-backdrop').classList.remove('show');
    document.body.style.overflow = '';
  };

  /* ── History ───────────────────────────────────────────── */
  function renderHistory() {
    var list = document.getElementById('history-list');
    if (!list) return;
    if (!history.length) {
      list.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><p>No analyses yet.</p></div>';
      return;
    }
    list.innerHTML = history.map(function (entry) {
      var vc = verdictClass(entry.report.verdict);
      return '<div class="history-card" onclick="loadEntry(' + entry.id + ')">' +
        '<div class="history-card-left">' +
          '<h4>' + esc(entry.client.name || entry.client.address) + '</h4>' +
          '<p>' + esc(entry.client.address + ', ' + entry.client.city) + ' · ' + fmt(entry.date) + '</p>' +
        '</div>' +
        '<div class="history-chip ' + vc + '">' + esc(entry.report.verdict) + '</div>' +
      '</div>';
    }).join('');
  }

  window.loadEntry = function (id) {
    var entry = history.find(function (h) { return h.id === id; });
    if (!entry) return;
    showReport(entry.report, entry.client);
  };

  window.clearHistory = function () {
    if (!confirm('Delete all history?')) return;
    history = [];
    localStorage.removeItem('adu_history');
    renderHistory();
  };

})();
