/**
 * menu.js — Página de Menu
 *
 * Layout: logo (esquerda) + "Menu" (direita) no topo.
 * Dois itens: "Prestação de contas" e "Dados da equipe" com ">".
 *
 * Requisitos: 10.1, 10.2, 10.3
 */
(function () {
  'use strict';

  window.renderMenuPage = function (container) {
    container.innerHTML =
      '<div class="page-top-bar">' +
        '<img src="assets/logo.png" alt="IPRA no Ariri" class="page-top-logo" onerror="this.style.display=\'none\'">' +
        '<h1 class="page-top-title">Menu</h1>' +
      '</div>' +
      '<div class="menu-simple-list">' +
        '<div class="menu-simple-item" data-href="#/menu/accounts" role="button" tabindex="0">' +
          '<span>Prestação de contas</span>' +
          '<img src="assets/recibo.png" class="menu-simple-icon" alt="">' +
        '</div>' +
        '<div class="menu-simple-item" data-href="#/menu/team" role="button" tabindex="0">' +
          '<span>Dados da equipe</span>' +
          '<img src="assets/equipe.png" class="menu-simple-icon" alt="">' +
        '</div>' +
        '<div class="menu-simple-item" data-href="#/menu/settings" role="button" tabindex="0">' +
          '<span>Configurações</span>' +
          '<img src="assets/config.png" class="menu-simple-icon" alt="">' +
        '</div>' +
      '</div>';

    var items = container.querySelectorAll('.menu-simple-item[data-href]');
    items.forEach(function (item) {
      var href = item.getAttribute('data-href');
      item.addEventListener('click', function () { window.location.hash = href; });
      item.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = href; }
      });
    });
  };
})();
