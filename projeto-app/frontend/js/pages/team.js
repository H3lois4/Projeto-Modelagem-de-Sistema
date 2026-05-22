(function () {
  'use strict';
  var backSvg = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="14 8 10 12 14 16"/></svg>';

  function renderPinScreen(container) {
    window.PinScreen.render(container, {
      title: 'Dados da Equipe',
      subtitle: 'Digite o PIN para acessar',
      mode: 'access',
      onBack: function () { window.location.hash = '#/menu'; },
      onSuccess: function () { renderTeamList(container); }
    });
  }

  function renderTeamList(container) {
    container.innerHTML =
      '<div class="page-top-bar">' +
        '<button class="back-circle-btn" id="team-back">' + backSvg + '</button>' +
        '<img src="assets/logo.png" alt="Ide" class="page-top-logo" onerror="this.style.display=\'none\'">' +
      '</div>' +
      '<h2 class="form-page-title">Dados da Equipe:</h2>' +
      '<div id="team-list"><div class="spinner"></div></div>';

    document.getElementById('team-back').addEventListener('click', function () { window.location.hash = '#/menu'; });

    var base = window.Sync ? window.Sync.getServerUrl() : '';
    fetch(base + '/api/volunteers').then(function (r) { if (!r.ok) throw new Error('err'); return r.json(); })
      .then(function (vols) {
        var listEl = document.getElementById('team-list');
        if (!vols || vols.length === 0) { listEl.innerHTML = '<div class="empty-state"><p class="empty-state-text">Nenhum voluntário cadastrado.</p></div>'; return; }
        var h = '<div class="menu-simple-list">';
        vols.forEach(function (v) {
          h += '<div class="menu-simple-item" data-id="' + v.id + '" role="button" tabindex="0">' +
            '<span>' + v.full_name + '</span><span class="menu-simple-arrow">&gt;</span></div>';
        });
        h += '</div>';
        listEl.innerHTML = h;
        listEl.querySelectorAll('.menu-simple-item[data-id]').forEach(function (item) {
          item.addEventListener('click', function () { window.location.hash = '#/menu/team/' + item.getAttribute('data-id'); });
        });
      })
      .catch(function () { document.getElementById('team-list').innerHTML = '<div class="empty-state"><p class="empty-state-text">Não foi possível carregar.</p></div>'; });
  }

  window.renderTeamPage = function (container) { renderPinScreen(container); };
})();
