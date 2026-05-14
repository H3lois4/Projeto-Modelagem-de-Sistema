(function () {
  'use strict';
  var backSvg = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="14 8 10 12 14 16"/></svg>';
  var uploadSvg = '<svg class="form-upload-icon" viewBox="0 0 64 64" width="56" height="56" fill="none" stroke="var(--green)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M44 40c6.6 0 12-4.5 12-10s-5.4-10-12-10c-.7 0-1.4.1-2 .2C40.3 14.1 34.6 10 28 10c-8.8 0-16 6.3-16 14 0 .3 0 .7.1 1C6.5 26.2 2 30.6 2 36c0 6 5.4 10 12 10h6"/><polyline points="24 38 32 30 40 38"/><line x1="32" y1="30" x2="32" y2="52"/></svg>';

  function readB64(f) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = function () { rej(new Error('err')); }; r.readAsDataURL(f); }); }
  function toast(msg, err) { var e = document.querySelector('.toast'); if (e) e.remove(); var t = document.createElement('div'); t.className = 'toast' + (err ? ' toast-error' : ''); t.textContent = msg; document.body.appendChild(t); setTimeout(function () { if (t.parentNode) t.remove(); }, 3000); }

  window.renderNewPostPage = function (container) {
    var savedName = localStorage.getItem('volunteer_name') || '';
    var now = new Date();
    var dateStr = String(now.getDate()).padStart(2,'0') + '/' + String(now.getMonth()+1).padStart(2,'0') + '/' + now.getFullYear() + ' ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');

    container.innerHTML =
      '<div class="page-top-bar">' +
        '<button class="back-circle-btn" id="post-back">' + backSvg + '</button>' +
      '</div>' +
      '<h2 class="form-page-title">Nova Postagem:</h2>' +
      '<form id="new-post-form" novalidate>' +
        '<div class="form-section form-row-pair">' +
          '<div class="form-row-half"><p class="form-section-label">Nome:</p><div class="detail-card" style="min-height:auto;padding:10px 14px"><input type="text" class="form-field-underline" id="post-name" value="' + savedName + '" style="border:none"></div></div>' +
          '<div class="form-row-half"><p class="form-section-label">Data:</p><div class="detail-card" style="min-height:auto;padding:10px 14px"><input type="text" class="form-field-underline" id="post-date" value="' + dateStr + '" readonly style="border:none;color:var(--text-secondary)"></div></div>' +
        '</div>' +
        '<div class="form-section"><p class="form-section-label">Título: *</p>' +
          '<div class="detail-card" style="min-height:auto;padding:14px"><input type="text" class="form-field-underline" id="post-title" style="border:none" required></div>' +
          '<p class="form-error hidden" id="title-error">Informe o título.</p></div>' +
        '<div class="form-section"><p class="form-section-label">Descrição: (opcional)</p>' +
          '<div class="detail-card" style="min-height:auto;padding:14px"><textarea class="form-field-underline" id="post-desc" rows="5" style="border:none"></textarea></div></div>' +
        '<div class="form-section"><p class="form-section-label">Imagem: (opcional)</p>' +
          '<div class="form-upload-area" id="post-img-area">' + uploadSvg + '<input type="file" accept="image/*" id="post-img"></div></div>' +
        '<button type="submit" class="form-submit-btn" id="post-sub">Publicar</button>' +
      '</form>';

    document.getElementById('post-back').addEventListener('click', function () { window.location.hash = '#/diary'; });

    var imgIn = document.getElementById('post-img'), upArea = document.getElementById('post-img-area');
    imgIn.addEventListener('change', function () {
      var f = imgIn.files && imgIn.files[0]; if (!f) return;
      var r = new FileReader(); r.onload = function () {
        var p = upArea.querySelector('.image-upload-preview'); if (p) p.remove();
        var img = document.createElement('img'); img.className = 'image-upload-preview'; img.src = r.result; upArea.appendChild(img); upArea.classList.add('has-preview');
        var ic = upArea.querySelector('.form-upload-icon'); if (ic) ic.classList.add('hidden');
      }; r.readAsDataURL(f);
    });

    document.getElementById('new-post-form').addEventListener('submit', function (e) { e.preventDefault(); doSubmit(); });
  };

  function doSubmit() {
    var tErr = document.getElementById('title-error'), btn = document.getElementById('post-sub');
    var title = document.getElementById('post-title').value.trim();
    var desc = document.getElementById('post-desc').value.trim();
    var imgIn = document.getElementById('post-img'), imgFile = imgIn.files && imgIn.files[0];
    var vol = document.getElementById('post-name').value.trim() || localStorage.getItem('volunteer_name') || '';

    if (!title) { tErr.classList.remove('hidden'); return; }
    tErr.classList.add('hidden');
    if (vol) localStorage.setItem('volunteer_name', vol);

    btn.disabled = true; btn.textContent = 'Publicando...';
    var check = (window.Sync && window.Sync.ping) ? window.Sync.ping() : Promise.resolve(false);
    check.then(function (on) {
      if (on) {
        return sendOn(vol, title, desc, imgFile).then(function () {
          toast('Postagem publicada com sucesso!', false); window.location.hash = '#/diary';
        });
      } else {
        return saveOff(vol, title, desc, imgFile).then(function () {
          toast('Postagem salva: aguardando conexão para o envio', false); window.location.hash = '#/diary';
        });
      }
    }).catch(function (err) {
        console.error('Post submit error:', err);
        saveOff(vol, title, desc, imgFile).then(function () {
          toast('Postagem salva: aguardando conexão para o envio', false); window.location.hash = '#/diary';
        }).catch(function (err2) {
          console.error('Offline save error:', err2);
          toast('Erro ao publicar.', true); btn.disabled = false; btn.textContent = 'Publicar';
        });
      });
  }

  function sendOn(vol, title, desc, imgFile) {
    var base = window.Sync ? window.Sync.getServerUrl() : '';
    var ip = (imgFile && window.resizeImage) ? window.resizeImage(imgFile) : Promise.resolve(imgFile);
    return ip.then(function (p) {
      var fd = new FormData(); fd.append('volunteer_name', vol); fd.append('title', title); fd.append('description', desc);
      if (p) fd.append('image', p, 'image.jpg');
      return fetch(base + '/api/posts', { method: 'POST', body: fd }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
    });
  }

  function saveOff(vol, title, desc, imgFile) {
    var rp = (imgFile && window.resizeImage) ? window.resizeImage(imgFile) : Promise.resolve(imgFile);
    return rp.then(function (p) { var dp = p ? readB64(p) : Promise.resolve(null); return dp.then(function (b64) {
      return window.DB.addPending('pending_posts', { type: 'post', data: { volunteer_name: vol, title: title, description: desc, image: b64 } });
    }); });
  }
})();
