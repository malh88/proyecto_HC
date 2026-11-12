/* Barra común de las maquetas SIGESAPOL: enlaza los módulos unidos en este repositorio.
   Se carga desde cada módulo con <script src="../comun/modulos.js" defer></script>. */
(function () {
  'use strict';
  if (window.self !== window.top) return;            // no dentro de iframes / vistas embebidas
  var MODULOS = [
    ['historia-clinica', 'Historia Clínica (Archivo de HC)'],
    ['hemodialisis', 'Hemodiálisis'],
    ['epidemiologia', 'Epidemiología']
  ];
  var actual = (location.pathname.split('/').slice(-2, -1)[0] || '').toLowerCase();
  var css = document.createElement('style');
  css.textContent =
    '.sgm-bar{display:flex;flex-wrap:wrap;align-items:center;gap:4px 14px;padding:4px 16px;background:#2E6B30;color:#fff;' +
    'font:12px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}' +
    '.sgm-bar a{color:#fff;text-decoration:none;opacity:.85}.sgm-bar a:hover{opacity:1;text-decoration:underline}' +
    '.sgm-bar a[aria-current]{opacity:1;font-weight:700;text-decoration:underline}.sgm-bar .sgm-t{font-weight:700;margin-right:6px}';
  document.head.appendChild(css);
  var bar = document.createElement('nav');
  bar.className = 'sgm-bar';
  bar.setAttribute('aria-label', 'Módulos de la maqueta');
  bar.innerHTML = '<a class="sgm-t" href="../index.html">⌂ Maquetas SIGESAPOL</a>' + MODULOS.map(function (m) {
    return '<a href="../' + m[0] + '/index.html"' + (m[0] === actual ? ' aria-current="page"' : '') + '>' + m[1] + '</a>';
  }).join('');
  document.body.insertBefore(bar, document.body.firstChild);
})();
