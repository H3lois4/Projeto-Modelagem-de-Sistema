(function () {
  'use strict';
  var backSvg = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="14 8 10 12 14 16"/></svg>';

  function esc(str) { if (!str) return '—'; var d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
  function formatDate(dateStr) {
    if (!dateStr) return '—';
    if (dateStr.indexOf('-') !== -1) { var p = dateStr.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
    return dateStr;
  }

  window.renderVolunteerProfilePage = function (container, params) {
    var id = params && params.id;
    container.innerHTML =
      '<div class="page-top-bar"><button class="back-circle-btn" id="prof-back">' + backSvg + '</button></div>' +
      '<div id="prof-content"><div class="spinner"></div></div>';

    document.getElementById('prof-back').addEventListener('click', function () { window.location.hash = '#/menu/team'; });
    if (!id) { document.getElementById('prof-content').innerHTML = '<div class="empty-state"><p class="empty-state-text">Voluntário não encontrado.</p></div>'; return; }

    var base = window.Sync ? window.Sync.getServerUrl() : '';
    fetch(base + '/api/volunteers/' + encodeURIComponent(id))
      .then(function (r) { if (!r.ok) throw new Error('err'); return r.json(); })
      .then(function (v) {
        var el = document.getElementById('prof-content');
        if (!el) return;
        el.innerHTML =
          '<h2 class="form-page-title" style="font-size:18px;margin-bottom:20px">' + esc(v.full_name) + '</h2>' +
          '<div class="vol-data-list">' +
            '<p><strong>RG:</strong> ' + esc(v.rg) + '</p>' +
            '<p><strong>CPF:</strong> ' + esc(v.cpf) + '</p>' +
            '<p><strong>Data de nascimento:</strong> ' + formatDate(v.birth_date) + '</p>' +
            '<p><strong>Sexo:</strong> ' + esc(v.gender) + '</p>' +
            '<p><strong>Profissão:</strong> ' + esc(v.profession) + '</p>' +
            '<p><strong>E-mail:</strong> ' + esc(v.email) + '</p>' +
            '<p><strong>Telefone:</strong> ' + esc(v.phone) + '</p>' +
            '<p><strong>Endereço:</strong> ' + esc(v.address) + '</p>' +
            '<p><strong>Dados médicos / Alergias:</strong> ' + esc(v.medical_data_path) + '</p>' +
          '</div>';
      })
      .catch(function () {
        var el = document.getElementById('prof-content');
        if (el) el.innerHTML = '<div class="empty-state"><p class="empty-state-text">Não foi possível carregar o perfil.</p></div>';
      });
  };
})();
