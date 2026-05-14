/**
 * forms.js — Página de Formulários e Dashboard
 *
 * Layout: logo (esquerda) + "Formulário" (direita) no topo.
 * Card "Novo formulário:" com botão + circular verde.
 * Card "Dashboard:" com gráficos de barras e pizza.
 *
 * Requisitos: 5.1, 6.1, 6.2, 6.3, 6.4
 */
(function () {
  'use strict';

  var ACTION_TYPES = [
    'Evangelismo', 'Visitação', 'Oração', 'Aconselhamento',
    'Infantil', 'Manutenção', 'Auxílio ao MEAP', 'Cozinha',
    'Educação', 'Saúde', 'P. Socorros', 'Outros'
  ];

  var PIE_COLORS = [
    '#1a4731', '#e74c3c', '#3498db', '#f39c12',
    '#9b59b6', '#1abc9c', '#e67e22', '#2ecc71',
    '#e91e63', '#00bcd4', '#ff5722', '#607d8b'
  ];

  function aggregateActions(forms) {
    var counts = {};
    var total = 0;
    ACTION_TYPES.forEach(function (a) { counts[a] = 0; });
    forms.forEach(function (form) {
      (form.actions || []).forEach(function (a) {
        if (counts[a] !== undefined) { counts[a]++; total++; }
      });
    });
    return { counts: counts, total: total };
  }

  function buildBarChart(counts, maxCount) {
    var html = '<div class="bar-chart">';
    ACTION_TYPES.forEach(function (action, i) {
      var count = counts[action] || 0;
      var pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
      html +=
        '<div class="bar-row">' +
          '<span class="bar-label">' + action + '</span>' +
          '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + PIE_COLORS[i] + '"></div></div>' +
          '<span class="bar-value">' + count + '</span>' +
        '</div>';
    });
    html += '</div>';
    return html;
  }

  function buildPieChart(counts, total) {
    if (total === 0) return '<div class="pie-chart"><span class="text-muted">Sem dados</span></div>';

    var stops = [];
    var cumulative = 0;
    ACTION_TYPES.forEach(function (action, i) {
      var count = counts[action] || 0;
      if (count === 0) return;
      var pct = (count / total) * 100;
      stops.push(PIE_COLORS[i] + ' ' + cumulative.toFixed(1) + '% ' + (cumulative + pct).toFixed(1) + '%');
      cumulative += pct;
    });

    var gradient = 'conic-gradient(' + stops.join(', ') + ')';

    var legendHtml = '<div style="display:flex;flex-direction:column;gap:4px;flex:1;min-width:0">';
    ACTION_TYPES.forEach(function (action, i) {
      var count = counts[action] || 0;
      if (count === 0) return;
      var pct = ((count / total) * 100).toFixed(0);
      legendHtml +=
        '<div style="display:flex;align-items:center;gap:6px;font-size:11px">' +
          '<span style="width:10px;height:10px;border-radius:2px;background:' + PIE_COLORS[i] + ';flex-shrink:0"></span>' +
          '<span style="color:var(--text-secondary)">' + action + ' (' + pct + '%)</span>' +
        '</div>';
    });
    legendHtml += '</div>';

    return '<div class="pie-chart" style="flex-direction:row;gap:16px;align-items:center">' +
      '<div style="width:100px;height:100px;border-radius:50%;background:' + gradient + ';flex-shrink:0"></div>' +
      legendHtml + '</div>';
  }

  function buildDashboardCard(forms) {
    var agg = aggregateActions(forms);
    var maxCount = 0;
    ACTION_TYPES.forEach(function (a) { if (agg.counts[a] > maxCount) maxCount = agg.counts[a]; });

    // Calculate total people impacted
    var totalPeople = 0;
    forms.forEach(function (f) {
      totalPeople += (f.people_served || 1);
    });

    return '<div class="detail-card">' +
      '<p class="detail-card-label">Dashboard:</p>' +
      '<div class="detail-card-content">' +
        '<div style="text-align:center;margin-bottom:20px;padding:16px;background:rgba(255,255,255,0.5);border-radius:12px">' +
          '<div style="font-size:36px;font-weight:800;color:var(--green)">' + totalPeople + '</div>' +
          '<div style="font-size:13px;color:var(--text-secondary);font-weight:500">Pessoas impactadas</div>' +
        '</div>' +
        '<div class="chart-container" style="background:transparent;box-shadow:none;padding:0;margin-bottom:16px">' +
          buildBarChart(agg.counts, maxCount) +
        '</div>' +
        '<div class="chart-container" style="background:transparent;box-shadow:none;padding:0">' +
          buildPieChart(agg.counts, agg.total) +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderFormsPage(container) {
    var html =
      '<div class="page-top-bar">' +
        '<img src="assets/logo.png" alt="IPRA no Ariri" class="page-top-logo" onerror="this.style.display=\'none\'">' +
        '<h1 class="page-top-title">Formulário</h1>' +
      '</div>' +
      '<div class="menu-simple-list">' +
        '<div class="menu-simple-item" id="new-form-card" role="button" tabindex="0">' +
          '<span>Novo formulário</span>' +
          '<img src="assets/icon-add.png" class="menu-simple-icon" alt="+">' +
        '</div>' +
      '</div>' +
      '<div id="forms-dashboard" class="mt-16"></div>' +
      '<div id="forms-loading" class="text-center mt-24"><div class="spinner"></div></div>';

    container.innerHTML = html;

    // Wire up new form card
    var card = document.getElementById('new-form-card');
    function goNew() { window.location.hash = '#/forms/new'; }
    card.addEventListener('click', goNew);
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goNew(); }
    });

    // Fetch forms
    var base = window.Sync ? window.Sync.getServerUrl() : '';
    var dashboardEl = document.getElementById('forms-dashboard');
    var loadingEl = document.getElementById('forms-loading');

    fetch(base + '/api/forms')
      .then(function (res) {
        if (!res.ok) throw new Error('err');
        return res.json();
      })
      .then(function (forms) {
        loadingEl.classList.add('hidden');
        if (forms && forms.length > 0) {
          dashboardEl.innerHTML = '<div class="detail-cards">' + buildDashboardCard(forms) + '</div>';
        } else {
          dashboardEl.innerHTML = '<div class="detail-cards"><div class="detail-card"><p class="detail-card-label">Dashboard:</p><div class="detail-card-content"><p class="text-muted" style="text-align:center;padding:24px 0">Nenhum dado ainda</p></div></div></div>';
        }
      })
      .catch(function () {
        loadingEl.classList.add('hidden');
        dashboardEl.innerHTML = '<div class="detail-cards"><div class="detail-card"><p class="detail-card-label">Dashboard:</p><div class="detail-card-content"><p class="text-muted" style="text-align:center;padding:24px 0">Nenhum dado ainda</p></div></div></div>';
      });
  }

  window.renderFormsPage = renderFormsPage;
})();
