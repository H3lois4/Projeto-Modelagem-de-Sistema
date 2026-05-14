(function () {
  'use strict';
  var backSvg = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="14 8 10 12 14 16"/></svg>';
  var uploadSvg = '<svg class="form-upload-icon" viewBox="0 0 64 64" width="56" height="56" fill="none" stroke="var(--green)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M44 40c6.6 0 12-4.5 12-10s-5.4-10-12-10c-.7 0-1.4.1-2 .2C40.3 14.1 34.6 10 28 10c-8.8 0-16 6.3-16 14 0 .3 0 .7.1 1C6.5 26.2 2 30.6 2 36c0 6 5.4 10 12 10h6"/><polyline points="24 38 32 30 40 38"/><line x1="32" y1="30" x2="32" y2="52"/></svg>';

  function readB64(f) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = function () { rej(new Error('err')); }; r.readAsDataURL(f); }); }
  function toast(msg, err) { var e = document.querySelector('.toast'); if (e) e.remove(); var t = document.createElement('div'); t.className = 'toast' + (err ? ' toast-error' : ''); t.textContent = msg; document.body.appendChild(t); setTimeout(function () { if (t.parentNode) t.remove(); }, 3000); }

  function verifyPin(pin) {
    var base = window.Sync ? window.Sync.getServerUrl() : '';
    return fetch(base + '/api/verify-pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: pin }) })
      .then(function (r) { return r.json(); }).then(function (d) { return d.valid === true; })
      .catch(function () { return pin === '1234'; });
  }

  // First show PIN, then show form
  window.renderNewReceiptPage = function (container) {
    container.innerHTML =
      '<div class="page-top-bar">' +
        '<button class="back-circle-btn" id="rec-back">' + backSvg + '</button>' +
      '</div>' +
      '<div class="pin-screen">' +
        '<h1 class="pin-title">Novo Comprovante</h1>' +
        '<p class="pin-subtitle">Digite o PIN para continuar</p>' +
        '<input type="password" inputmode="numeric" maxlength="4" pattern="[0-9]*" class="pin-input" id="pin-input" placeholder="••••" autocomplete="off">' +
        '<p class="pin-error hidden" id="pin-error">PIN incorreto</p>' +
      '</div>';

    document.getElementById('rec-back').addEventListener('click', function () { window.location.hash = '#/menu/accounts'; });
    var pinIn = document.getElementById('pin-input'), pinErr = document.getElementById('pin-error');
    pinIn.addEventListener('input', function () {
      pinErr.classList.add('hidden');
      if (pinIn.value.length === 4) {
        pinIn.disabled = true;
        verifyPin(pinIn.value).then(function (ok) {
          if (ok) { renderForm(container); } else { pinErr.classList.remove('hidden'); pinIn.value = ''; pinIn.disabled = false; pinIn.focus(); }
        });
      }
    });
    pinIn.focus();
  };

  function renderForm(container) {
    container.innerHTML =
      '<div class="page-top-bar">' +
        '<button class="back-circle-btn" id="rec-back2">' + backSvg + '</button>' +
      '</div>' +
      '<h2 class="form-page-title">Novo comprovante:</h2>' +
      '<form id="rec-form" novalidate>' +
        '<div class="form-section"><p class="form-section-label">Título: *</p>' +
          '<div class="detail-card" style="min-height:auto;padding:14px"><input type="text" class="form-field-underline" id="rec-title" style="border:none" required></div>' +
          '<p class="form-error hidden" id="rec-title-err">Informe o título.</p></div>' +
        '<div class="form-section"><p class="form-section-label">Descrição: (opcional)</p>' +
          '<div class="detail-card" style="min-height:auto;padding:14px"><textarea class="form-field-underline" id="rec-desc" rows="5" style="border:none"></textarea></div></div>' +
        '<div class="form-section"><p class="form-section-label">Comprovante: (opcional)</p>' +
          '<div class="form-upload-area" id="rec-img-area">' + uploadSvg + '<input type="file" accept="image/*" id="rec-img"></div></div>' +
        '<button type="submit" class="form-submit-btn" id="rec-sub">Enviar</button>' +
      '</form>';

    document.getElementById('rec-back2').addEventListener('click', function () { window.location.hash = '#/menu/accounts'; });

    var imgIn = document.getElementById('rec-img'), upArea = document.getElementById('rec-img-area');
    imgIn.addEventListener('change', function () {
      var f = imgIn.files && imgIn.files[0]; if (!f) return;
      var r = new FileReader(); r.onload = function () {
        var p = upArea.querySelector('.image-upload-preview'); if (p) p.remove();
        var img = document.createElement('img'); img.className = 'image-upload-preview'; img.src = r.result; upArea.appendChild(img); upArea.classList.add('has-preview');
        var ic = upArea.querySelector('.form-upload-icon'); if (ic) ic.classList.add('hidden');
      }; r.readAsDataURL(f);
    });

    document.getElementById('rec-form').addEventListener('submit', function (e) { e.preventDefault(); doSubmit(); });
  }

  function doSubmit() {
    var tErr = document.getElementById('rec-title-err'), btn = document.getElementById('rec-sub');
    var title = document.getElementById('rec-title').value.trim();
    var desc = document.getElementById('rec-desc').value.trim();
    var imgIn = document.getElementById('rec-img'), imgFile = imgIn.files && imgIn.files[0];

    if (!title) { tErr.classList.remove('hidden'); return; }
    tErr.classList.add('hidden');
    btn.disabled = true; btn.textContent = 'Enviando...';

    var check = (window.Sync && window.Sync.ping) ? window.Sync.ping() : Promise.resolve(false);
    check.then(function (on) {
      if (on) {
        return sendOn(title, desc, imgFile).then(function () {
          toast('Comprovante enviado com sucesso!', false); window.location.hash = '#/menu/accounts';
        });
      } else {
        return saveOff(title, desc, imgFile).then(function () {
          toast('Comprovante salvo: aguardando conexão para o envio', false); window.location.hash = '#/menu/accounts';
        });
      }
    }).catch(function (err) {
        console.error('Receipt submit error:', err);
        saveOff(title, desc, imgFile).then(function () {
          toast('Comprovante salvo: aguardando conexão para o envio', false); window.location.hash = '#/menu/accounts';
        }).catch(function (err2) {
          console.error('Offline save error:', err2);
          toast('Erro ao enviar.', true); btn.disabled = false; btn.textContent = 'Enviar';
        });
      });
  }

  function sendOn(title, desc, imgFile) {
    var base = window.Sync ? window.Sync.getServerUrl() : '';
    var ip = (imgFile && window.resizeImage) ? window.resizeImage(imgFile) : Promise.resolve(imgFile);
    return ip.then(function (p) {
      var fd = new FormData(); fd.append('title', title); fd.append('description', desc);
      if (p) fd.append('image', p, 'image.jpg');
      return fetch(base + '/api/receipts', { method: 'POST', body: fd }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
    });
  }

  function saveOff(title, desc, imgFile) {
    var rp = (imgFile && window.resizeImage) ? window.resizeImage(imgFile) : Promise.resolve(imgFile);
    return rp.then(function (p) { var dp = p ? readB64(p) : Promise.resolve(null); return dp.then(function (b64) {
      return window.DB.addPending('pending_receipts', { type: 'receipt', data: { title: title, description: desc, image: b64 } });
    }); });
  }
})();
