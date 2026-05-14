/**
 * IPRA no Ariri — Página de Detalhe do Dia (day-detail.js)
 *
 * Layout: botão voltar (esquerda) + logo (direita) no topo,
 * nome do dia abaixo, e 3 cards grandes: Cronograma, Cardápio, Materiais.
 *
 * Requisitos: 4.2, 4.3
 */

(function () {
  'use strict';

  var _scheduleCache = null;

  var backArrowSvg =
    '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="10"/>' +
    '<polyline points="14 8 10 12 14 16"/></svg>';

  var MEAL_LABELS = {
    breakfast: 'Café da manhã',
    lunch: 'Almoço',
    snack: 'Lanche da tarde',
    dinner: 'Jantar'
  };

  function fetchSchedule() {
    if (_scheduleCache) return Promise.resolve(_scheduleCache);

    // Try localStorage first (offline support)
    var cached = localStorage.getItem('schedule_data');
    if (cached) {
      try { _scheduleCache = JSON.parse(cached); } catch (e) { /* ignore */ }
    }

    var base = window.Sync ? window.Sync.getServerUrl() : '';
    return fetch(base + '/api/schedule')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        _scheduleCache = data;
        // Save to localStorage for offline use
        try { localStorage.setItem('schedule_data', JSON.stringify(data)); } catch (e) { /* ignore */ }
        return data;
      })
      .catch(function () {
        // Return cached data if available
        return _scheduleCache || null;
      });
  }

  function findDay(data, dayId) {
    if (!data || !data.days) return null;
    for (var i = 0; i < data.days.length; i++) {
      if (data.days[i].id === dayId) return data.days[i];
    }
    return null;
  }

  function renderError(container) {
    container.innerHTML =
      '<div class="page-top-bar">' +
        '<button class="back-circle-btn" id="day-back">' + backArrowSvg + '</button>' +
        '<img src="assets/logo.png" alt="IPRA no Ariri" class="page-top-logo" onerror="this.style.display=\'none\'">' +
      '</div>' +
      '<div class="empty-state"><p class="empty-state-text">Dados não disponíveis</p></div>';
    document.getElementById('day-back').addEventListener('click', function () {
      window.location.hash = '#/info';
    });
  }

  function buildScheduleCard(schedule) {
    var html =
      '<div class="detail-card">' +
        '<p class="detail-card-label">Cronograma:</p>' +
        '<div class="detail-card-content">';

    if (schedule && schedule.length > 0) {
      for (var i = 0; i < schedule.length; i++) {
        html +=
          '<div class="schedule-item">' +
            '<span class="schedule-time">' + (schedule[i].time || '') + '</span>' +
            '<span class="schedule-activity">' + (schedule[i].activity || '') + '</span>' +
          '</div>';
      }
    }

    html += '</div></div>';
    return html;
  }

  function buildMenuCard(menu) {
    var html =
      '<div class="detail-card">' +
        '<p class="detail-card-label">Cardápio:</p>' +
        '<div class="detail-card-content">';

    if (menu) {
      var meals = ['breakfast', 'lunch', 'snack', 'dinner'];
      for (var j = 0; j < meals.length; j++) {
        if (menu[meals[j]]) {
          html +=
            '<div class="menu-meal">' +
              '<div class="menu-meal-label">' + MEAL_LABELS[meals[j]] + '</div>' +
              '<div class="menu-meal-content">' + menu[meals[j]] + '</div>' +
            '</div>';
        }
      }
    }

    html += '</div></div>';
    return html;
  }

  window.renderDayDetailPage = function (container, params) {
    var dayId = params && params.day ? params.day : '';

    container.innerHTML =
      '<div class="page-top-bar">' +
        '<button class="back-circle-btn" id="day-back-loading">' + backArrowSvg + '</button>' +
        '<img src="assets/logo.png" alt="IPRA no Ariri" class="page-top-logo" onerror="this.style.display=\'none\'">' +
      '</div>' +
      '<div class="spinner"></div>';

    document.getElementById('day-back-loading').addEventListener('click', function () {
      window.location.hash = '#/info';
    });

    fetchSchedule().then(function (data) {
      if (!data) { renderError(container); return; }
      var day = findDay(data, dayId);
      if (!day) { renderError(container); return; }

      var html =
        '<div class="page-top-bar">' +
          '<button class="back-circle-btn" id="day-back-main">' + backArrowSvg + '</button>' +
          '<img src="assets/logo.png" alt="IPRA no Ariri" class="page-top-logo" onerror="this.style.display=\'none\'">' +
        '</div>' +
        '<h2 class="day-detail-day-name">' + day.label + '</h2>' +
        '<div class="detail-cards">' +
          buildScheduleCard(day.schedule) +
          buildMenuCard(day.menu) +
        '</div>';

      container.innerHTML = html;

      document.getElementById('day-back-main').addEventListener('click', function () {
        window.location.hash = '#/info';
      });
    });
  };
})();
