(function () {
  'use strict';
  var backSvg = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="14 8 10 12 14 16"/></svg>';

  function toast(msg, err) {
    var e = document.querySelector('.toast'); if (e) e.remove();
    var t = document.createElement('div'); t.className = 'toast' + (err ? ' toast-error' : ''); t.textContent = msg; document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.remove(); }, 3000);
  }

  function verifyAdminPin(pin) {
    var base = window.Sync ? window.Sync.getServerUrl() : '';
    return fetch(base + '/api/verify-admin-pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: pin }) })
      .then(function (r) { return r.json(); }).then(function (d) { return d.valid === true; })
      .catch(function () { return pin === '4310'; });
  }

  function clearTable(table, pin) {
    var base = window.Sync ? window.Sync.getServerUrl() : '';
    return fetch(base + '/api/clear/' + table, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: pin }) })
      .then(function (r) { return r.json(); });
  }

  function clearAll(pin) {
    var base = window.Sync ? window.Sync.getServerUrl() : '';
    return fetch(base + '/api/reset-all', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: pin }) })
      .then(function (r) { return r.json(); });
  }

  function renderPinScreen(container) {
    container.innerHTML =
      '<div class="page-top-bar"><button class="back-circle-btn" id="set-back">' + backSvg + '</button></div>' +
      '<div class="pin-screen">' +
        '<h1 class="pin-title">Configurações</h1>' +
        '<p class="pin-subtitle">Digite o PIN de administrador</p>' +
        '<input type="password" inputmode="numeric" maxlength="4" pattern="[0-9]*" class="pin-input" id="pin-input" placeholder="••••" autocomplete="off">' +
        '<p class="pin-error hidden" id="pin-error">PIN incorreto</p>' +
      '</div>';

    document.getElementById('set-back').addEventListener('click', function () { window.location.hash = '#/menu'; });
    var pinIn = document.getElementById('pin-input'), pinErr = document.getElementById('pin-error');
    pinIn.addEventListener('input', function () {
      pinErr.classList.add('hidden');
      if (pinIn.value.length === 4) {
        pinIn.disabled = true;
        verifyAdminPin(pinIn.value).then(function (ok) {
          if (ok) { renderSettings(container, pinIn.value); }
          else { pinErr.classList.remove('hidden'); pinIn.value = ''; pinIn.disabled = false; pinIn.focus(); }
        });
      }
    });
    pinIn.focus();
  }

  function renderSettings(container, adminPin) {
    container.innerHTML =
      '<div class="page-top-bar"><button class="back-circle-btn" id="set-back">' + backSvg + '</button></div>' +
      '<h2 class="form-page-title">Configurações:</h2>' +
      '<div class="settings-section">' +
        '<p class="form-section-label">Limpar banco de dados:</p>' +
        '<div class="settings-buttons">' +
          '<button class="settings-btn" id="clear-forms">Limpar Formulários</button>' +
          '<button class="settings-btn" id="clear-posts">Limpar Postagens</button>' +
          '<button class="settings-btn" id="clear-receipts">Limpar Comprovantes</button>' +
          '<button class="settings-btn settings-btn-danger" id="clear-all">Limpar TUDO</button>' +
        '</div>' +
      '</div>';

    document.getElementById('set-back').addEventListener('click', function () { window.location.hash = '#/menu'; });

    document.getElementById('clear-forms').addEventListener('click', function () {
      if (confirm('Tem certeza que deseja apagar todos os formulários?')) {
        clearTable('forms', adminPin).then(function (r) { toast(r.message || 'Formulários apagados!', false); }).catch(function () { toast('Erro', true); });
      }
    });

    document.getElementById('clear-posts').addEventListener('click', function () {
      if (confirm('Tem certeza que deseja apagar todas as postagens?')) {
        clearTable('posts', adminPin).then(function (r) { toast(r.message || 'Postagens apagadas!', false); }).catch(function () { toast('Erro', true); });
      }
    });

    document.getElementById('clear-receipts').addEventListener('click', function () {
      if (confirm('Tem certeza que deseja apagar todos os comprovantes?')) {
        clearTable('receipts', adminPin).then(function (r) { toast(r.message || 'Comprovantes apagados!', false); }).catch(function () { toast('Erro', true); });
      }
    });

    document.getElementById('clear-all').addEventListener('click', function () {
      if (confirm('ATENÇÃO: Isso vai apagar TODOS os dados (formulários, postagens e comprovantes). Continuar?')) {
        clearAll(adminPin).then(function (r) { toast(r.message || 'Tudo apagado!', false); }).catch(function () { toast('Erro', true); });
      }
    });
  }

  window.renderSettingsPage = renderPinScreen;
})();
