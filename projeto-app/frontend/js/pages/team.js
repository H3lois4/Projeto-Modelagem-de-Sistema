(function () {
  'use strict';
  var backSvg = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="14 8 10 12 14 16"/></svg>';

  function verifyPin(pin) {
    var base = window.Sync ? window.Sync.getServerUrl() : '';
    return fetch(base + '/api/verify-pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: pin }) })
      .then(function (r) { return r.json(); }).then(function (d) { return d.valid === true; })
      .catch(function () { return pin === '1234'; });
  }

  function renderPinScreen(container) {
    container.innerHTML =
      '<div class="page-top-bar"><button class="back-circle-btn" id="team-back">' + backSvg + '</button></div>' +
      '<div class="pin-screen">' +
        '<h1 class="pin-title">Dados da Equipe</h1>' +
        '<p class="pin-subtitle">Digite o PIN para acessar</p>' +
        '<input type="password" inputmode="numeric" maxlength="4" pattern="[0-9]*" class="pin-input" id="pin-input" placeholder="••••" autocomplete="off">' +
        '<p class="pin-error hidden" id="pin-error">PIN incorreto</p>' +
      '</div>';

    document.getElementById('team-back').addEventListener('click', function () { window.location.hash = '#/menu'; });
    var pinIn = document.getElementById('pin-input'), pinErr = document.getElementById('pin-error');
    pinIn.addEventListener('input', function () {
      pinErr.classList.add('hidden');
      if (pinIn.value.length === 4) {
        pinIn.disabled = true;
        verifyPin(pinIn.value).then(function (ok) {
          if (ok) { renderTeamList(container); } else { pinErr.classList.remove('hidden'); pinIn.value = ''; pinIn.disabled = false; pinIn.focus(); }
        });
      }
    });
    pinIn.focus();
  }

  function renderTeamList(container) {
    container.innerHTML =
      '<div class="page-top-bar">' +
        '<button class="back-circle-btn" id="team-back">' + backSvg + '</button>' +
        '<img src="assets/logo.png" alt="IPRA no Ariri" class="page-top-logo" onerror="this.style.display=\'none\'">' +
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
