(function () {
  'use strict';
  var DAYS = [
    { id: 'sabado', label: 'Sábado - 18/04' },
    { id: 'domingo', label: 'Domingo - 19/04' },
    { id: 'segunda', label: 'Segunda - 20/04' },
    { id: 'terca', label: 'Terça - 21/04' }
  ];

  window.renderInfoPage = function (container) {
    var html =
      '<div class="page-top-bar">' +
        '<img src="assets/logo.png" alt="IPRA no Ariri" class="page-top-logo" onerror="this.style.display=\'none\'">' +
        '<h1 class="page-top-title">Informações</h1>' +
      '</div>' +
      '<div class="menu-simple-list">';
    for (var i = 0; i < DAYS.length; i++) {
      html += '<div class="menu-simple-item" data-day="' + DAYS[i].id + '" role="button" tabindex="0">' +
        '<span>' + DAYS[i].label + '</span>' +
        '<span class="menu-simple-arrow">&gt;</span>' +
      '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
    container.querySelectorAll('.menu-simple-item[data-day]').forEach(function (card) {
      var dayId = card.getAttribute('data-day');
      card.addEventListener('click', function () { window.location.hash = '#/info/' + dayId; });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/info/' + dayId; }
      });
    });
  };
})();
