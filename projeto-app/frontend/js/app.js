/**
 * Ide — Roteador SPA (app.js)
 *
 * Hash-based routing com suporte a parâmetros dinâmicos (:day, :id).
 * Gerencia destaque do ícone ativo na Bottom Navigation Bar.
 * Listener em hashchange para navegação sem reload.
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

  // Cada rota mapeia um padrão de hash para a função window.* que renderiza a página.
  // Removidos os stubs locais — todas as páginas têm um arquivo dedicado em js/pages/.
  var routeDefinitions = [
    { pattern: '',                       page: 'renderSplashPage' },
    { pattern: '#/info',                 page: 'renderInfoPage' },
    { pattern: '#/info/:day',            page: 'renderDayDetailPage' },
    { pattern: '#/forms',                page: 'renderFormsPage' },
    { pattern: '#/forms/new',            page: 'renderNewFormPage' },
    { pattern: '#/diary',                page: 'renderDiaryPage' },
    { pattern: '#/diary/new',            page: 'renderNewPostPage' },
    { pattern: '#/menu',                 page: 'renderMenuPage' },
    { pattern: '#/menu/accounts',        page: 'renderAccountsPage' },
    { pattern: '#/menu/accounts/new',    page: 'renderNewReceiptPage' },
    { pattern: '#/menu/team',            page: 'renderTeamPage' },
    { pattern: '#/menu/team/:id',        page: 'renderVolunteerProfilePage' },
    { pattern: '#/menu/settings',        page: 'renderSettingsPage' }
  ];

  // ─── Utilitários de roteamento ───

  /**
   * Tenta casar um hash com um padrão de rota.
   * Retorna { params } se casar, ou null.
   */
  function matchRoute(hash, pattern) {
    if (hash === '' && pattern === '') return { params: {} };
    if (pattern === '' || hash === '') return null;

    var hashParts = hash.split('/');
    var patternParts = pattern.split('/');
    if (hashParts.length !== patternParts.length) return null;

    var params = {};
    for (var i = 0; i < patternParts.length; i++) {
      if (patternParts[i].charAt(0) === ':') {
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
    var sections = Object.keys(NAV_SECTIONS);
    for (var i = 0; i < sections.length; i++) {
      var prefix = NAV_SECTIONS[sections[i]];
      if (hash === prefix || hash.indexOf(prefix + '/') === 0) {
        return sections[i];
      }
    }
    return null;
  }

  // ─── Bottom Navigation Bar ───

  function updateActiveNav(section) {
    var navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(function (item) {
      var route = item.getAttribute('data-route');
      var isActive = !!(route && section && route === NAV_SECTIONS[section]);
      item.classList.toggle('active', isActive);
      if (isActive) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
  }

  function setBottomNavVisible(visible) {
    var nav = document.getElementById('bottom-nav');
    if (nav) nav.classList.toggle('hidden', !visible);
  }

  // ─── Identificação do voluntário ───

  function renderIdentification(container) {
    container.innerHTML =
      '<div class="identify-screen">' +
        '<h1 class="identify-title">Bem-vindo ao Ide</h1>' +
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
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') confirmName(); });
    input.focus();
  }

  // ─── Helpers de navigate() ───

  function isSplashHash(hash) {
    return hash === '' || hash === '#' || hash === '#/';
  }

  /**
   * Procura a primeira rota que casa com o hash.
   * Retorna { renderFnName, params } ou null.
   */
  function findMatchingRoute(hash) {
    for (var i = 0; i < routeDefinitions.length; i++) {
      var result = matchRoute(hash, routeDefinitions[i].pattern);
      if (result) {
        return { renderFnName: routeDefinitions[i].page, params: result.params };
      }
    }
    return null;
  }

  // ─── Roteador principal ───

  var _splashShown = false;

  function navigate() {
    var hash = window.location.hash || '';
    var appContainer = document.getElementById('app');
    if (!appContainer) return;

    // 1. Splash na primeira navegação da sessão
    if (!_splashShown && isSplashHash(hash)) {
      _splashShown = true;
      setBottomNavVisible(false);
      updateActiveNav(null);
      var splashFn = window['renderSplashPage'];
      if (typeof splashFn === 'function') splashFn(appContainer);
      return;
    }

    // 2. Verifica identificação do voluntário
    if (!isSplashHash(hash)) {
      _splashShown = true;
      if (!localStorage.getItem('volunteer_name')) {
        renderIdentification(appContainer);
        setBottomNavVisible(false);
        updateActiveNav(null);
        return;
      }
    }

    // 3. Busca rota e renderiza
    var matched = findMatchingRoute(hash);
    if (!matched) {
      window.location.hash = '#/info';
      return;
    }

    var renderFn = window[matched.renderFnName];
    if (typeof renderFn !== 'function') {
      console.error('Page renderer ausente:', matched.renderFnName);
      window.location.hash = '#/info';
      return;
    }

    setBottomNavVisible(!isSplashHash(hash));
    updateActiveNav(getActiveSection(hash));
    renderFn(appContainer, matched.params);
  }

  // ─── API pública ───

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
