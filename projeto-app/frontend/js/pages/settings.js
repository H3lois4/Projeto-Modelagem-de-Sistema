(function () {
  'use strict';
  var backSvg = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="14 8 10 12 14 16"/></svg>';

  function toast(msg, err) {
    var e = document.querySelector('.toast'); if (e) e.remove();
    var t = document.createElement('div'); t.className = 'toast' + (err ? ' toast-error' : ''); t.textContent = msg; document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.remove(); }, 3000);
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
    window.PinScreen.render(container, {
      title: 'Configurações',
      subtitle: 'Digite o PIN de administrador',
      mode: 'admin',
      onBack: function () { window.location.hash = '#/menu'; },
      onSuccess: function (pin) { renderSettings(container, pin); }
    });
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

    // Mapa botão → (mensagem confirmação, ação). Substitui 4 listeners quase idênticos.
    var ACTIONS = [
      { id: 'clear-forms', confirm: 'Tem certeza que deseja apagar todos os formulários?', run: function () { return clearTable('forms', adminPin); }, ok: 'Formulários apagados!' },
      { id: 'clear-posts', confirm: 'Tem certeza que deseja apagar todas as postagens?', run: function () { return clearTable('posts', adminPin); }, ok: 'Postagens apagadas!' },
      { id: 'clear-receipts', confirm: 'Tem certeza que deseja apagar todos os comprovantes?', run: function () { return clearTable('receipts', adminPin); }, ok: 'Comprovantes apagados!' },
      { id: 'clear-all', confirm: 'ATENÇÃO: Isso vai apagar TODOS os dados (formulários, postagens e comprovantes). Continuar?', run: function () { return clearAll(adminPin); }, ok: 'Tudo apagado!' }
    ];

    ACTIONS.forEach(function (a) {
      document.getElementById(a.id).addEventListener('click', function () {
        if (!confirm(a.confirm)) return;
        a.run().then(function (r) { toast(r.message || a.ok, false); }).catch(function () { toast('Erro', true); });
      });
    });
  }

  window.renderSettingsPage = renderPinScreen;
})();
