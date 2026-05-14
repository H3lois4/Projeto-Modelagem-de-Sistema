/**
 * IPRA no Ariri — Roteador SPA (app.js)
 *
 * Hash-based routing com suporte a parâmetros dinâmicos (:day, :id).
 * Gerencia destaque do ícone ativo na Bottom Navigation Bar.
 * Listener em hashchange para navegação sem reload.
 *
 * Requisitos: 3.2, 3.3, 15.2
 */

(function () {
  'use strict';

  // ─── Mapeamento de seções para ícones da nav ───
  var NAV_SECTIONS = {
    info: '#/info',
    forms: '#/forms',
    diary: '#/diary',
    menu: '#/menu'
  };

  // ─── Definição de rotas ───
  // Cada rota mapeia um padrão de hash para uma função de renderização.
  // Rotas com parâmetros usam :param (ex.: #/info/:day).
  var routeDefinitions = [
    { pattern: '',                       render: renderSplash },
    { pattern: '#/info',                 render: renderInfo },
    { pattern: '#/info/:day',            render: renderDayDetail },
    { pattern: '#/forms',                render: renderForms },
    { pattern: '#/forms/new',            render: renderNewForm },
    { pattern: '#/diary',                render: renderDiary },
    { pattern: '#/diary/new',            render: renderNewPost },
    { pattern: '#/menu',                 render: renderMenu },
    { pattern: '#/menu/accounts',        render: renderAccounts },
    { pattern: '#/menu/accounts/new',    render: renderNewReceipt },
    { pattern: '#/menu/team',            render: renderTeam },
    { pattern: '#/menu/team/:id',        render: renderVolunteerProfile },
    { pattern: '#/menu/settings',        render: renderSettings }
  ];

  // ─── Utilitários de roteamento ───

  /**
   * Tenta casar um hash com um padrão de rota.
   * Retorna um objeto { params } se casar, ou null.
   */
  function matchRoute(hash, pattern) {
    // Ambos vazios → splash
    if (hash === '' && pattern === '') return { params: {} };
    if (pattern === '' && hash !== '') return null;
    if (hash === '' && pattern !== '') return null;

    var hashParts = hash.split('/');
    var patternParts = pattern.split('/');

    if (hashParts.length !== patternParts.length) return null;

    var params = {};
    for (var i = 0; i < patternParts.length; i++) {
      if (patternParts[i].charAt(0) === ':') {
        // Parâmetro dinâmico
        params[patternParts[i].substring(1)] = decodeURIComponent(hashParts[i]);
      } else if (patternParts[i] !== hashParts[i]) {
        return null;
      }
    }
    return { params: params };
  }

  /**
   * Determina qual seção da nav está ativa com base no hash.
   * Retorna a chave da seção (info, forms, diary, menu) ou null para splash.
   */
  function getActiveSection(hash) {
    if (!hash || hash === '' || hash === '#' || hash === '#/') return null;

    // Verificar cada seção — a ordem importa (mais específico primeiro não é necessário aqui)
    var sections = Object.keys(NAV_SECTIONS);
    for (var i = 0; i < sections.length; i++) {
      var prefix = NAV_SECTIONS[sections[i]];
      if (hash === prefix || hash.indexOf(prefix + '/') === 0) {
        return sections[i];
      }
    }
    return null;
  }

  // ─── Gerenciamento da Bottom Navigation Bar ───

  function updateActiveNav(section) {
    var navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(function (item) {
      var route = item.getAttribute('data-route');
      var isActive = route && section && route === NAV_SECTIONS[section];
      item.classList.toggle('active', !!isActive);
      if (isActive) {
        item.setAttribute('aria-current', 'page');
      } else {
        item.removeAttribute('aria-current');
      }
    });
  }

  function setBottomNavVisible(visible) {
    var nav = document.getElementById('bottom-nav');
    if (nav) {
      nav.classList.toggle('hidden', !visible);
    }
  }

  // ─── Roteador principal ───

  var _splashShown = false;

  function navigate() {
    var hash = window.location.hash || '';
    var appContainer = document.getElementById('app');
    if (!appContainer) return;

    // Sempre mostrar splash na primeira navegação da sessão
    if (!_splashShown && (hash === '' || hash === '#' || hash === '#/')) {
      _splashShown = true;
      setBottomNavVisible(false);
      updateActiveNav(null);
      renderSplash(appContainer);
      return;
    }

    // Após splash, verificar identificação do voluntário
    if (hash !== '' && hash !== '#' && hash !== '#/') {
      _splashShown = true; // marca splash como vista se navegou direto
      var volunteerName = localStorage.getItem('volunteer_name');
      if (!volunteerName) {
        renderIdentification(appContainer, hash);
        setBottomNavVisible(false);
        updateActiveNav(null);
        return;
      }
    }

    // Encontrar rota correspondente
    var matched = null;
    for (var i = 0; i < routeDefinitions.length; i++) {
      var result = matchRoute(hash, routeDefinitions[i].pattern);
      if (result) {
        matched = { render: routeDefinitions[i].render, params: result.params };
        break;
      }
    }

    if (matched) {
      var section = getActiveSection(hash);
      var isSplash = hash === '' || hash === '#' || hash === '#/';

      setBottomNavVisible(!isSplash);
      updateActiveNav(section);
      matched.render(appContainer, matched.params);
    } else {
      // Rota não encontrada — redirecionar para info
      window.location.hash = '#/info';
    }
  }

  // ─── Tela de identificação do voluntário ───

  function renderIdentification(container, targetHash) {
    container.innerHTML =
      '<div class="identify-screen">' +
        '<h1 class="identify-title">Bem-vindo ao IPRA no Ariri</h1>' +
        '<p class="identify-subtitle">Digite seu nome para continuar</p>' +
        '<input type="text" class="identify-input form-input" id="volunteer-name-input" ' +
          'placeholder="Seu nome" autocomplete="off" aria-label="Nome do voluntário">' +
        '<button class="btn btn-primary btn-full mt-16" id="identify-btn">Confirmar</button>' +
      '</div>';

    var input = document.getElementById('volunteer-name-input');
    var btn = document.getElementById('identify-btn');

    function confirmName() {
      var name = input.value.trim();
      if (name) {
        localStorage.setItem('volunteer_name', name);
        navigate();
      }
    }

    btn.addEventListener('click', confirmName);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') confirmName();
    });
    input.focus();
  }

  // ─── Funções de renderização stub ───
  // Cada página será implementada em js/pages/*.js.
  // Quando os módulos de página estiverem disponíveis, estas funções
  // delegam para eles. Caso contrário, exibem placeholder.

  function renderSplash(container) {
    if (typeof window.renderSplashPage === 'function') {
      window.renderSplashPage(container);
      return;
    }
    container.innerHTML =
      '<div class="splash-screen" id="splash-area">' +
        '<div class="splash-logo">IPRA no Ariri</div>' +
        '<p class="splash-verse">' +
          '"Ide ao mundo, pregai o evangelho a toda criatura."' +
          '<cite>Marcos 16:15</cite>' +
        '</p>' +
        '<p class="splash-tap-hint">Toque para continuar</p>' +
      '</div>';
    document.getElementById('splash-area').addEventListener('click', function () {
      window.location.hash = '#/info';
    });
  }

  function renderInfo(container, params) {
    if (typeof window.renderInfoPage === 'function') {
      window.renderInfoPage(container, params);
      return;
    }
    container.innerHTML =
      '<div class="page-header"><h1 class="page-title">Informações</h1></div>' +
      '<p class="text-muted">Página de informações — em construção.</p>';
  }

  function renderDayDetail(container, params) {
    if (typeof window.renderDayDetailPage === 'function') {
      window.renderDayDetailPage(container, params);
      return;
    }
    container.innerHTML =
      '<button class="back-btn" onclick="window.location.hash=\'#/info\'">' +
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>' +
        'Voltar' +
      '</button>' +
      '<div class="page-header"><h1 class="page-title">Dia: ' + (params.day || '') + '</h1></div>' +
      '<p class="text-muted">Detalhe do dia — em construção.</p>';
  }

  function renderForms(container, params) {
    if (typeof window.renderFormsPage === 'function') {
      window.renderFormsPage(container, params);
      return;
    }
    container.innerHTML =
      '<div class="page-header"><h1 class="page-title">Formulários</h1></div>' +
      '<p class="text-muted">Página de formulários — em construção.</p>';
  }

  function renderNewForm(container, params) {
    if (typeof window.renderNewFormPage === 'function') {
      window.renderNewFormPage(container, params);
      return;
    }
    container.innerHTML =
      '<button class="back-btn" onclick="window.location.hash=\'#/forms\'">' +
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>' +
        'Voltar' +
      '</button>' +
      '<div class="page-header"><h1 class="page-title">Novo Formulário</h1></div>' +
      '<p class="text-muted">Formulário — em construção.</p>';
  }

  function renderDiary(container, params) {
    if (typeof window.renderDiaryPage === 'function') {
      window.renderDiaryPage(container, params);
      return;
    }
    container.innerHTML =
      '<div class="page-header"><h1 class="page-title">Diário de Bordo</h1></div>' +
      '<p class="text-muted">Diário — em construção.</p>';
  }

  function renderNewPost(container, params) {
    if (typeof window.renderNewPostPage === 'function') {
      window.renderNewPostPage(container, params);
      return;
    }
    container.innerHTML =
      '<button class="back-btn" onclick="window.location.hash=\'#/diary\'">' +
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>' +
        'Voltar' +
      '</button>' +
      '<div class="page-header"><h1 class="page-title">Nova Postagem</h1></div>' +
      '<p class="text-muted">Nova postagem — em construção.</p>';
  }

  function renderMenu(container, params) {
    if (typeof window.renderMenuPage === 'function') {
      window.renderMenuPage(container, params);
      return;
    }
    container.innerHTML =
      '<div class="page-header"><h1 class="page-title">Menu</h1></div>' +
      '<p class="text-muted">Menu — em construção.</p>';
  }

  function renderAccounts(container, params) {
    if (typeof window.renderAccountsPage === 'function') {
      window.renderAccountsPage(container, params);
      return;
    }
    container.innerHTML =
      '<button class="back-btn" onclick="window.location.hash=\'#/menu\'">' +
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>' +
        'Voltar' +
      '</button>' +
      '<div class="page-header"><h1 class="page-title">Prestação de Contas</h1></div>' +
      '<p class="text-muted">Prestação de contas — em construção.</p>';
  }

  function renderNewReceipt(container, params) {
    if (typeof window.renderNewReceiptPage === 'function') {
      window.renderNewReceiptPage(container, params);
      return;
    }
    container.innerHTML =
      '<button class="back-btn" onclick="window.location.hash=\'#/menu/accounts\'">' +
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>' +
        'Voltar' +
      '</button>' +
      '<div class="page-header"><h1 class="page-title">Novo Comprovante</h1></div>' +
      '<p class="text-muted">Novo comprovante — em construção.</p>';
  }

  function renderTeam(container, params) {
    if (typeof window.renderTeamPage === 'function') {
      window.renderTeamPage(container, params);
      return;
    }
    container.innerHTML =
      '<button class="back-btn" onclick="window.location.hash=\'#/menu\'">' +
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>' +
        'Voltar' +
      '</button>' +
      '<div class="page-header"><h1 class="page-title">Dados da Equipe</h1></div>' +
      '<p class="text-muted">Dados da equipe — em construção.</p>';
  }

  function renderVolunteerProfile(container, params) {
    if (typeof window.renderVolunteerProfilePage === 'function') {
      window.renderVolunteerProfilePage(container, params);
      return;
    }
    container.innerHTML =
      '<button class="back-btn" onclick="window.location.hash=\'#/menu/team\'">' +
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>' +
        'Voltar' +
      '</button>' +
      '<div class="page-header"><h1 class="page-title">Perfil do Voluntário</h1></div>' +
      '<p class="text-muted">Perfil #' + (params.id || '') + ' — em construção.</p>';
  }

  function renderSettings(container, params) {
    if (typeof window.renderSettingsPage === 'function') {
      window.renderSettingsPage(container, params);
      return;
    }
    container.innerHTML = '<p class="text-muted">Configurações — em construção.</p>';
  }

  // ─── Expor funções de roteamento para uso externo ───
  window.AppRouter = {
    navigate: navigate,
    matchRoute: matchRoute,
    getActiveSection: getActiveSection
  };

  // ─── Inicialização ───

  window.addEventListener('hashchange', navigate);

  document.addEventListener('DOMContentLoaded', function () {
    window.DB.init().catch(function (err) {
      console.error('IndexedDB init failed:', err);
    });
    window.Sync.start();

    // Always start with splash
    window.location.hash = '';
    _splashShown = false;
    navigate();
  });
})();
