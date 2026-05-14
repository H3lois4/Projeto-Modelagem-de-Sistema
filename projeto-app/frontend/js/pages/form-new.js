(function () {
  'use strict';
  var ACTION_TYPES = [
    'Evangelismo', 'Infantil', 'Educação',
    'Visitação', 'Manutenção', 'Saúde',
    'Oração', 'Auxílio ao MEAP', 'P. Socorros',
    'Aconselhamento', 'Cozinha', 'Outros'
  ];
  var backSvg = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="14 8 10 12 14 16"/></svg>';
  var uploadSvg = '<svg class="form-upload-icon" viewBox="0 0 64 64" width="56" height="56" fill="none" stroke="var(--green)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M44 40c6.6 0 12-4.5 12-10s-5.4-10-12-10c-.7 0-1.4.1-2 .2C40.3 14.1 34.6 10 28 10c-8.8 0-16 6.3-16 14 0 .3 0 .7.1 1C6.5 26.2 2 30.6 2 36c0 6 5.4 10 12 10h6"/><polyline points="24 38 32 30 40 38"/><line x1="32" y1="30" x2="32" y2="52"/></svg>';

  function readB64(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = function () { rej(new Error('err')); }; r.readAsDataURL(file);
    });
  }
  function toast(msg, err) {
    var e = document.querySelector('.toast'); if (e) e.remove();
    var t = document.createElement('div'); t.className = 'toast' + (err ? ' toast-error' : ''); t.textContent = msg; document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.remove(); }, 3000);
  }

  window.renderNewFormPage = function (container) {
    var cbHtml = '<div class="form-checkbox-grid">';
    ACTION_TYPES.forEach(function (a) {
      cbHtml += '<label class="form-check-item"><input type="checkbox" name="actions" value="' + a + '"><span>' + a + '</span></label>';
    });
    cbHtml += '</div>';

    container.innerHTML =
      '<div class="page-top-bar">' +
        '<button class="back-circle-btn" id="form-back">' + backSvg + '</button>' +
      '</div>' +
      '<h2 class="form-page-title">Formulário:</h2>' +
      '<form id="new-form" novalidate>' +
        '<div class="form-section"><p class="form-section-label">Ação realizada: *</p>' +
          '<div class="detail-card" style="min-height:auto;padding:14px">' + cbHtml + '</div>' +
          '<p class="form-error hidden" id="actions-error">Selecione ao menos uma ação.</p></div>' +
        '<div class="form-section"><p class="form-section-label">Pessoas atendidas: *</p>' +
          '<div class="detail-card" style="min-height:auto;padding:14px"><input type="number" class="form-field-underline" id="field-people" min="1" value="1" inputmode="numeric" style="max-width:120px;border:none"></div>' +
          '<p class="form-error hidden" id="people-error">Informe o número de pessoas.</p></div>' +
        '<div class="form-section"><p class="form-section-label">Descrição: (opcional)</p>' +
          '<div class="detail-card" style="min-height:auto;padding:14px"><textarea class="form-field-underline" id="field-desc" rows="4" style="border:none"></textarea></div></div>' +
        '<div class="form-section"><p class="form-section-label">Imagem: (opcional)</p>' +
          '<div class="form-upload-area" id="img-area">' + uploadSvg +
            '<input type="file" accept="image/*" id="field-img"></div></div>' +
        '<button type="submit" class="form-submit-btn" id="form-sub">Enviar</button>' +
      '</form>';

    document.getElementById('form-back').addEventListener('click', function () { window.location.hash = '#/forms'; });

    var imgIn = document.getElementById('field-img'), upArea = document.getElementById('img-area');
    imgIn.addEventListener('change', function () {
      var f = imgIn.files && imgIn.files[0]; if (!f) return;
      var r = new FileReader(); r.onload = function () {
        var p = upArea.querySelector('.image-upload-preview'); if (p) p.remove();
        var img = document.createElement('img'); img.className = 'image-upload-preview'; img.src = r.result; upArea.appendChild(img); upArea.classList.add('has-preview');
        var ic = upArea.querySelector('.form-upload-icon'); if (ic) ic.classList.add('hidden');
      }; r.readAsDataURL(f);
    });

    document.getElementById('new-form').addEventListener('submit', function (e) { e.preventDefault(); doSubmit(); });
  };

  function doSubmit() {
    var aErr = document.getElementById('actions-error'), pErr = document.getElementById('people-error'), btn = document.getElementById('form-sub');
    var cbs = document.querySelectorAll('input[name="actions"]:checked'), acts = [];
    cbs.forEach(function (c) { acts.push(c.value); });

    var valid = true;
    if (acts.length === 0) { aErr.classList.remove('hidden'); valid = false; } else { aErr.classList.add('hidden'); }

    var people = document.getElementById('field-people').value;
    if (!people || parseInt(people) < 1) { pErr.classList.remove('hidden'); valid = false; } else { pErr.classList.add('hidden'); }

    if (!valid) return;

    var desc = document.getElementById('field-desc').value.trim();
    var imgIn = document.getElementById('field-img'), imgFile = imgIn.files && imgIn.files[0];
    var vol = localStorage.getItem('volunteer_name') || '';

    btn.disabled = true; btn.textContent = 'Enviando...';

    var check = (window.Sync && window.Sync.ping) ? window.Sync.ping() : Promise.resolve(false);
    check.then(function (on) {
      if (on) {
        return sendOn(vol, acts, desc, people, imgFile).then(function () {
          toast('Formulário enviado com sucesso!', false); window.location.hash = '#/forms';
        });
      } else {
        return saveOff(vol, acts, desc, people, imgFile).then(function () {
          toast('Formulário salvo: aguardando conexão para o envio', false); window.location.hash = '#/forms';
        });
      }
    }).catch(function (err) {
      console.error('Form submit error:', err);
      saveOff(vol, acts, desc, people, imgFile).then(function () {
        toast('Formulário salvo: aguardando conexão para o envio', false); window.location.hash = '#/forms';
      }).catch(function (err2) {
        console.error('Offline save error:', err2);
        toast('Erro ao salvar.', true); btn.disabled = false; btn.textContent = 'Enviar';
      });
    });
  }

  function sendOn(vol, acts, desc, people, imgFile) {
    var base = window.Sync ? window.Sync.getServerUrl() : '';
    var ip = (imgFile && window.resizeImage) ? window.resizeImage(imgFile) : Promise.resolve(imgFile);
    return ip.then(function (p) {
      var fd = new FormData();
      fd.append('volunteer_name', vol); fd.append('actions', JSON.stringify(acts));
      fd.append('description', desc); fd.append('people_served', people);
      if (p) fd.append('image', p, 'image.jpg');
      return fetch(base + '/api/forms', { method: 'POST', body: fd }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
    });
  }

  function saveOff(vol, acts, desc, people, imgFile) {
    var rp = (imgFile && window.resizeImage) ? window.resizeImage(imgFile) : Promise.resolve(imgFile);
    return rp.then(function (p) {
      var dp = p ? readB64(p) : Promise.resolve(null);
      return dp.then(function (b64) {
        return window.DB.addPending('pending_forms', { type: 'form', data: { volunteer_name: vol, actions: acts, description: desc, people_served: parseInt(people) || 1, image: b64 } });
      });
    });
  }
})();
