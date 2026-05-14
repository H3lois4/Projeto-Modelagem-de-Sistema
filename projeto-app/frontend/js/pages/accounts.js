(function () {
  'use strict';
  var backSvg = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="14 8 10 12 14 16"/></svg>';

  function formatDate(s) { if (!s) return ''; try { var d = new Date(s); if (isNaN(d.getTime())) return s; return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear(); } catch(e) { return s; } }
  function toast(msg, err) { var e = document.querySelector('.toast'); if (e) e.remove(); var t = document.createElement('div'); t.className = 'toast' + (err ? ' toast-error' : ''); t.textContent = msg; document.body.appendChild(t); setTimeout(function () { if (t.parentNode) t.remove(); }, 3000); }

  function checkAdminAuth() {
    var pin = prompt('Digite o PIN de administrador:');
    if (!pin) return Promise.resolve(false);
    var base = window.Sync ? window.Sync.getServerUrl() : '';
    return fetch(base + '/api/verify-admin-pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: pin }) })
      .then(function (r) { return r.json(); }).then(function (d) { return d.valid === true; })
      .catch(function () { return pin === '4310'; });
  }

  function deleteReceipt(id) {
    checkAdminAuth().then(function (ok) {
      if (!ok) { alert('Sem permissão'); return; }
      var base = window.Sync ? window.Sync.getServerUrl() : '';
      fetch(base + '/api/receipts/' + id, { method: 'DELETE' })
        .then(function (r) { if (r.ok) { toast('Comprovante excluído', false); window.AppRouter.navigate(); } else { alert('Erro'); } })
        .catch(function () { alert('Erro de conexão'); });
    });
  }

  function showImageModal(src) {
    var o = document.createElement('div'); o.className = 'image-modal-overlay';
    o.innerHTML = '<img src="' + src + '" class="image-modal-img">'; o.addEventListener('click', function () { o.remove(); }); document.body.appendChild(o);
  }

  var deleteSvg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';

  function buildCard(r, base) {
    var imgSrc = r.image_data || (r.image_path ? base+'/uploads/'+r.image_path : '');
    var img = imgSrc ? '<img class="diary-post-image expandable-img" src="'+imgSrc+'" data-full="'+imgSrc+'" alt="Comprovante" loading="lazy">' : '';
    return '<article class="diary-post-card">'+
      '<button class="card-delete-btn delete-post-btn" data-id="'+r.id+'" aria-label="Excluir">'+deleteSvg+'</button>'+
      '<div class="diary-post-header"><span class="diary-post-author" style="color:var(--green)">'+(r.title||'')+'</span><span class="diary-post-date">'+formatDate(r.created_at)+'</span></div>'+
      img+'<div class="diary-post-body"><p class="diary-post-desc">'+(r.description||'')+'</p>'+
      '</div></article>';
  }

  window.renderAccountsPage = function (container) {
    container.innerHTML =
      '<div class="page-top-bar"><button class="back-circle-btn" id="acc-back">' + backSvg + '</button><img src="assets/logo.png" alt="IPRA no Ariri" class="page-top-logo" onerror="this.style.display=\'none\'"></div>' +
      '<h2 class="form-page-title">Prestação de contas:</h2>' +
      '<div class="menu-simple-list"><div class="menu-simple-item" id="new-rec-card" role="button" tabindex="0"><span>Adicionar comprovante</span><img src="assets/icon-add.png" class="menu-simple-icon" alt="+"></div></div>' +
      '<div id="rec-list" class="mt-16"></div><div id="rec-load" class="text-center mt-24"><div class="spinner"></div></div>';

    document.getElementById('acc-back').addEventListener('click', function () { window.location.hash = '#/menu'; });
    document.getElementById('new-rec-card').addEventListener('click', function () { window.location.hash = '#/menu/accounts/new'; });

    var base = window.Sync ? window.Sync.getServerUrl() : '';
    var listEl = document.getElementById('rec-list'), loadEl = document.getElementById('rec-load');

    fetch(base + '/api/receipts').then(function (r) { if (!r.ok) throw new Error('err'); return r.json(); })
      .then(function (recs) {
        loadEl.classList.add('hidden');
        if (!recs || recs.length === 0) { listEl.innerHTML = '<div class="empty-state"><p class="empty-state-text">Nenhum comprovante registrado.</p></div>'; return; }
        var h = '<div class="diary-feed-list">'; recs.forEach(function (r) { h += buildCard(r, base); }); h += '</div>';
        listEl.innerHTML = h;
        listEl.querySelectorAll('.expandable-img').forEach(function (img) { img.addEventListener('click', function () { showImageModal(img.getAttribute('data-full')); }); });
        listEl.querySelectorAll('.delete-post-btn').forEach(function (btn) { btn.addEventListener('click', function (e) { e.stopPropagation(); deleteReceipt(btn.getAttribute('data-id')); }); });
      })
      .catch(function () { loadEl.classList.add('hidden'); listEl.innerHTML = '<div class="empty-state"><p class="empty-state-text">Não foi possível carregar.</p></div>'; });
  };
})();
