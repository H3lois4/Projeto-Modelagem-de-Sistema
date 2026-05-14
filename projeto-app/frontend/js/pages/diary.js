(function () {
  'use strict';
  var currentUser = localStorage.getItem('volunteer_name') || '';

  function formatDate(isoStr) {
    if (!isoStr) return '';
    try { var d = new Date(isoStr); if (isNaN(d.getTime())) return isoStr;
    return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear()+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
    } catch (e) { return isoStr; }
  }

  function toast(msg, err) { var e = document.querySelector('.toast'); if (e) e.remove(); var t = document.createElement('div'); t.className = 'toast' + (err ? ' toast-error' : ''); t.textContent = msg; document.body.appendChild(t); setTimeout(function () { if (t.parentNode) t.remove(); }, 3000); }

  function checkAuth(authorName) {
    // Author can always edit/delete their own
    if (currentUser && authorName && currentUser.toLowerCase() === authorName.toLowerCase()) return Promise.resolve(true);
    // Otherwise ask for admin PIN
    var pin = prompt('Digite o PIN de administrador para continuar:');
    if (!pin) return Promise.resolve(false);
    var base = window.Sync ? window.Sync.getServerUrl() : '';
    return fetch(base + '/api/verify-admin-pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: pin }) })
      .then(function (r) { return r.json(); }).then(function (d) { return d.valid === true; })
      .catch(function () { return pin === '4310'; });
  }

  function deletePost(postId, authorName) {
    checkAuth(authorName).then(function (ok) {
      if (!ok) { alert('Sem permissão'); return; }
      var base = window.Sync ? window.Sync.getServerUrl() : '';
      fetch(base + '/api/posts/' + postId, { method: 'DELETE' })
        .then(function (r) { if (r.ok) { toast('Postagem excluída', false); window.AppRouter.navigate(); } else { alert('Erro ao excluir'); } })
        .catch(function () { alert('Erro de conexão'); });
    });
  }

  function showImageModal(src) {
    var o = document.createElement('div'); o.className = 'image-modal-overlay';
    o.innerHTML = '<img src="' + src + '" class="image-modal-img">'; o.addEventListener('click', function () { o.remove(); }); document.body.appendChild(o);
  }

  var deleteSvg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';

  function buildPostCard(post, baseUrl) {
    var author = post.volunteer_name || 'Anônimo';
    var img = '';
    if (post.image_data) { img = '<img class="diary-post-image expandable-img" src="' + post.image_data + '" data-full="' + post.image_data + '" alt="Imagem" loading="lazy">'; }
    return '<article class="diary-post-card">' +
      '<button class="card-delete-btn delete-post-btn" data-id="' + post.id + '" data-author="' + author + '" aria-label="Excluir">' + deleteSvg + '</button>' +
      '<div class="diary-post-header"><span class="diary-post-author">' + author + '</span><span class="diary-post-date">' + formatDate(post.created_at) + '</span></div>' +
      img +
      '<div class="diary-post-body">' +
        '<h3 class="diary-post-title">' + (post.title || '') + '</h3>' +
        '<p class="diary-post-desc">' + (post.description || '') + '</p>' +
      '</div></article>';
  }

  window.renderDiaryPage = function (container) {
    currentUser = localStorage.getItem('volunteer_name') || '';
    container.innerHTML =
      '<div class="page-top-bar"><img src="assets/logo.png" alt="IPRA no Ariri" class="page-top-logo" onerror="this.style.display=\'none\'"><h1 class="page-top-title">Diário de Bordo</h1></div>' +
      '<div class="menu-simple-list"><div class="menu-simple-item" id="new-post-card" role="button" tabindex="0"><span>Nova postagem</span><img src="assets/icon-add.png" class="menu-simple-icon" alt="+"></div></div>' +
      '<div id="diary-feed" class="mt-16"></div><div id="diary-loading" class="text-center mt-24"><div class="spinner"></div></div>';

    document.getElementById('new-post-card').addEventListener('click', function () { window.location.hash = '#/diary/new'; });

    var base = window.Sync ? window.Sync.getServerUrl() : '';
    var feedEl = document.getElementById('diary-feed'), loadEl = document.getElementById('diary-loading');

    fetch(base + '/api/posts').then(function (r) { if (!r.ok) throw new Error('err'); return r.json(); })
      .then(function (posts) {
        loadEl.classList.add('hidden');
        if (!posts || posts.length === 0) { feedEl.innerHTML = '<div class="empty-state"><p class="empty-state-text">Nenhuma postagem ainda.</p></div>'; return; }
        var h = '<div class="diary-feed-list">'; posts.forEach(function (p) { h += buildPostCard(p, base); }); h += '</div>';
        feedEl.innerHTML = h;
        feedEl.querySelectorAll('.expandable-img').forEach(function (img) { img.addEventListener('click', function () { showImageModal(img.getAttribute('data-full')); }); });
        feedEl.querySelectorAll('.delete-post-btn').forEach(function (btn) { btn.addEventListener('click', function (e) { e.stopPropagation(); deletePost(btn.getAttribute('data-id'), btn.getAttribute('data-author')); }); });
      })
      .catch(function () { loadEl.classList.add('hidden'); feedEl.innerHTML = '<div class="empty-state"><p class="empty-state-text">Não foi possível carregar.</p></div>'; });
  };
})();
