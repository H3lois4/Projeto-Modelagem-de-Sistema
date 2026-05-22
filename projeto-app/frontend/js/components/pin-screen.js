/**
 * pin-screen.js — Componente reutilizável de tela de PIN.
 *
 * Substitui as 4 implementações duplicadas (team, settings, form-new, receipt-new).
 *
 * Uso:
 *   window.PinScreen.render(container, {
 *     title: 'Novo Formulário',
 *     subtitle: 'Digite o PIN para continuar',
 *     mode: 'access' | 'admin',           // qual endpoint usar
 *     onBack: function () { ... },         // callback do botão voltar
 *     onSuccess: function (pin) { ... }    // callback ao validar com sucesso
 *   });
 */
(function () {
  'use strict';

  var BACK_SVG =
    '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="12" cy="12" r="10"/><polyline points="14 8 10 12 14 16"/></svg>';

  // Mapeia modo → (endpoint, fallback offline). Substitui if/else espalhados.
  var ENDPOINTS = {
    access: { url: '/api/verify-pin', offlineFallback: '1234' },
    admin: { url: '/api/verify-admin-pin', offlineFallback: '4310' }
  };

  function getServerUrl() {
    return (window.Sync && window.Sync.getServerUrl) ? window.Sync.getServerUrl() : '';
  }

  function verifyPin(mode, pin) {
    var ep = ENDPOINTS[mode] || ENDPOINTS.access;
    var url = getServerUrl() + ep.url;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: pin })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) { return d.valid === true; })
      .catch(function () { return pin === ep.offlineFallback; });
  }

  /**
   * Renderiza a tela de PIN no container fornecido.
   * @param {HTMLElement} container
   * @param {object} opts
   */
  function render(container, opts) {
    opts = opts || {};
    var title = opts.title || 'Acesso restrito';
    var subtitle = opts.subtitle || 'Digite o PIN para continuar';
    var mode = opts.mode || 'access';
    var onBack = typeof opts.onBack === 'function' ? opts.onBack : null;
    var onSuccess = typeof opts.onSuccess === 'function' ? opts.onSuccess : function () {};

    container.innerHTML =
      '<div class="page-top-bar">' +
        '<button class="back-circle-btn" id="pin-back">' + BACK_SVG + '</button>' +
      '</div>' +
      '<div class="pin-screen">' +
        '<h1 class="pin-title">' + title + '</h1>' +
        '<p class="pin-subtitle">' + subtitle + '</p>' +
        '<input type="password" inputmode="numeric" maxlength="4" pattern="[0-9]*" ' +
          'class="pin-input" id="pin-input" placeholder="••••" autocomplete="off">' +
        '<p class="pin-error hidden" id="pin-error">PIN incorreto</p>' +
      '</div>';

    var backBtn = document.getElementById('pin-back');
    if (onBack) backBtn.addEventListener('click', onBack);

    var pinIn = document.getElementById('pin-input');
    var pinErr = document.getElementById('pin-error');

    pinIn.addEventListener('input', function () {
      pinErr.classList.add('hidden');
      if (pinIn.value.length !== 4) return;

      pinIn.disabled = true;
      verifyPin(mode, pinIn.value).then(function (ok) {
        if (ok) {
          onSuccess(pinIn.value);
        } else {
          pinErr.classList.remove('hidden');
          pinIn.value = '';
          pinIn.disabled = false;
          pinIn.focus();
        }
      });
    });

    pinIn.focus();
  }

  window.PinScreen = { render: render, verify: verifyPin };
})();
