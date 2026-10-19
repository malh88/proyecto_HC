/* Maqueta · Módulo M6 «Consultas y reportes» del Movimiento de HC (SIGESAPOL)
   Reportes del análisis funcional v4.2: HU16 récord de una HC, HU17 movimientos por
   fechas/servicio/motivo, HU18 HC no devueltas, HU19 reportes del legado (salidas por
   rango de fechas, cuadro estadístico, pacientes citados) y HU23 indicadores.
   Los datos son FICTICIOS, generados al abrir la página, solo para ver la pantalla. */

window.Reportes = (function () {
  'use strict';

  // ------------------------------------------------------------------ datos ficticios
  var HOY = new Date(2026, 9, 12);
  var DIA = 86400000;
  var SERVS = ['ONCOLOGÍA', 'CIRUGÍA DE TÓRAX', 'CIRUGÍA GENERAL', 'GASTROENTEROLOGÍA', 'GINECOLOGÍA', 'PEDIATRÍA', 'EMERGENCIA'];
  var PESO = [40, 10, 12, 10, 8, 8, 12];                   // Oncología pide más (audio 12/10, a validar)
  var MOTS = [['CONSULTA', 0, 45], ['JUNTA MÉDICA', 2, 15], ['INFORME MÉDICO', 3, 15], ['COPIA', 3, 8], ['DESCANSO MÉDICO', 3, 7], ['HOSPITALIZACIÓN', 20, 10]];
  var semilla = 7;
  function rnd() { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; }
  function elegir(lista, pesos) { var t = pesos.reduce(function (a, b) { return a + b; }, 0), x = rnd() * t; for (var i = 0; i < lista.length; i++) { x -= pesos[i]; if (x < 0) return lista[i]; } return lista[lista.length - 1]; }
  function f(d) { return d ? ('0' + d.getDate()).slice(-2) + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + d.getFullYear() : '—'; }
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function dias(a, b) { return Math.round((b - a) / DIA); }

  var MOV = [], nSol = 20, nOrd = 210;
  for (var d = new Date(2026, 8, 14); d <= HOY; d = new Date(d.getTime() + DIA)) {
    if (d.getDay() === 0) continue;                          // domingos sin salidas
    var ordenesDia = 2 + Math.floor(rnd() * 4);
    for (var o = 0; o < ordenesDia; o++) {
      var serv = elegir(SERVS, PESO), mot = elegir(MOTS, MOTS.map(function (m) { return m[2]; }));
      var canal = rnd() < 0.55 ? 'SERVICIO (SIGESAPOL)' : 'ARCHIVO';
      var nHc = mot[0] === 'CONSULTA' ? 2 + Math.floor(rnd() * 6) : 1 + Math.floor(rnd() * 3);
      var sol = 'SOL-2026-' + ('000000' + (nSol++)).slice(-6), ord = 'OS-2026-' + ('000000' + (nOrd++)).slice(-6);
      var sal = new Date(d.getTime() + (7 + Math.floor(rnd() * 4)) * 3600000);
      for (var h = 0; h < nHc; h++) {
        var ret = new Date(d.getTime() + mot[1] * DIA);
        var tarda = Math.max(0, mot[1] + Math.floor(rnd() * 4) - 2 + (rnd() < 0.12 ? 6 : 0));
        var ing = new Date(d.getTime() + tarda * DIA);
        if (ing > HOY || rnd() < 0.04) ing = null;
        var difRec = rnd() < 0.03;
        MOV.push({ sol: sol, orden: ord, hc: '[N° HC ' + ('000' + (1 + Math.floor(rnd() * 60))).slice(-4) + ']', pac: '[paciente]', servicio: serv, motivo: mot[0], canal: canal,
          salida: sal, retorno: ret, ingreso: ing, recibida: !difRec });
      }
    }
  }
  // Una HC solo puede estar en un movimiento abierto (RN06): cada salida se cierra antes de la siguiente
  var porHc = {};
  MOV.forEach(function (m) { (porHc[m.hc] = porHc[m.hc] || []).push(m); });
  Object.keys(porHc).forEach(function (k) {
    var l = porHc[k].sort(function (a, b) { return a.salida - b.salida; });
    for (var i = 0; i < l.length - 1; i++) {
      var tope = new Date(l[i + 1].salida.getTime() - 2 * 3600000);
      if (!l[i].ingreso || l[i].ingreso > tope) l[i].ingreso = tope < l[i].salida ? l[i].salida : tope;
      l[i].recibida = true;
    }
  });
  MOV.forEach(function (m) {
    var fin = m.ingreso || HOY;
    m.diasFuera = dias(new Date(m.salida.getFullYear(), m.salida.getMonth(), m.salida.getDate()), fin);
    m.atraso = Math.max(0, dias(m.retorno, fin));
    m.aTiempo = !!m.ingreso && m.ingreso <= m.retorno;
    m.estado = !m.recibida ? 'NO RECIBIDA' : (m.ingreso ? (m.aTiempo ? 'DEVUELTA A TIEMPO' : 'DEVUELTA CON ATRASO') : (HOY > m.retorno ? 'VENCIDA' : 'EN EL SERVICIO'));
  });

  // ------------------------------------------------------------------ estado de la pantalla
  var R = { tab: 'ind', desde: '2026-09-14', hasta: '2026-10-12', serv: 'TODOS', mot: 'TODOS', hc: '[N° HC 0007]', citFecha: '2026-10-13', citServ: 'ONCOLOGÍA', citTurno: 'MAÑANA' };
  var TABS = [
    ['ind', 'Indicadores', 'HU23'], ['nodev', 'HC no devueltas', 'HU18'], ['mov', 'Movimientos', 'HU17'], ['est', 'Cuadro estadístico', 'HU19'],
    ['sal', 'Salidas por rango de fechas', 'HU19'], ['cit', 'Pacientes citados', 'HU19'], ['rec', 'Récord de una HC', 'HU16']
  ];
  var TABS_DEP = ['ind', 'nodev', 'mov', 'rec'];
  var ultimaTabla = null;      // para exportar

  function render(ctx) {
    var C = ctx, esDep = C.rol === 'dep';
    if (esDep) {
      R.serv = C.servicio; if (TABS_DEP.indexOf(R.tab) < 0) R.tab = 'ind';
      var propias = MOV.filter(function (m) { return m.servicio === C.servicio; }).map(function (m) { return m.hc; }).sort();
      if (propias.length && propias.indexOf(R.hc) < 0) R.hc = propias[0];
    }
    var tabs = TABS.filter(function (t) { return !esDep || TABS_DEP.indexOf(t[0]) >= 0; }).map(function (t) {
      return '<div class="' + (t[0] === R.tab ? 'on' : '') + '" data-tab="' + t[0] + '">' + t[1] + ' <small>' + t[2] + '</small></div>';
    }).join('');
    var h = '<div class="bar">' + (esDep ? 'REPORTES DE MI SERVICIO · ' + C.servicio : 'CONSULTAS Y REPORTES DEL MOVIMIENTO DE HISTORIAS CLÍNICAS') + '<span class="tag">nuevo · M6</span></div><div class="box">' +
      '<div class="rtabs">' + tabs + '</div>' + filtros(C, esDep) + '<div id="repCuerpo"></div>' +
      '<div class="leg">Datos ficticios de ejemplo. ' + (esDep ? 'La jefatura y la secretaría del servicio solo ven los datos de su servicio.' : 'Archivo y la superiora ven todos los servicios; las jefaturas, solo el suyo.') +
      ' «Exportar a Excel» descarga el cuadro en CSV; «PDF» abre la impresión.</div></div>';
    C.vista.innerHTML = h;
    Array.prototype.forEach.call(C.vista.querySelectorAll('[data-tab]'), function (el) { el.onclick = function () { R.tab = el.getAttribute('data-tab'); render(ctx); }; });
    var g = function (id) { return document.getElementById(id); };
    if (g('rGen')) g('rGen').onclick = function () {
      ['desde', 'hasta', 'serv', 'mot', 'hc', 'citFecha', 'citServ', 'citTurno'].forEach(function (k) { var el = g('r_' + k); if (el && !el.disabled) R[k] = el.value; });
      cuerpo(C);
    };
    g('rXls').onclick = function () { exportar(); };
    g('rPdf').onclick = function () { window.print(); };
    cuerpo(C);
  }

  function filtros(C, esDep) {
    var e = C.esc, sel = function (id, lista, v, dis) { return '<select class="in" id="r_' + id + '"' + (dis ? ' disabled' : '') + '>' + lista.map(function (x) { return '<option' + (x === v ? ' selected' : '') + '>' + e(x) + '</option>'; }).join('') + '</select>'; };
    var botones = '<div class="f" style="flex:.55"><label>&nbsp;</label><button class="btn k" style="width:100%" id="rGen">Generar</button></div>' +
      '<div class="f" style="flex:.7"><label>&nbsp;</label><button class="btn b" style="width:100%" id="rXls">Exportar a Excel</button></div>' +
      '<div class="f" style="flex:.4"><label>&nbsp;</label><button class="btn r" style="width:100%" id="rPdf">PDF</button></div>';
    if (R.tab === 'rec') {
      var hcs = MOV.filter(function (m) { return R.serv === 'TODOS' || C.rol !== 'dep' || m.servicio === R.serv; }).map(function (m) { return m.hc; }).filter(function (x, i, a) { return a.indexOf(x) === i; }).sort();
      return '<div class="row">' + C.campo('N° de HC, DNI o apellidos', sel('hc', hcs, R.hc), 'f2', true) + '<div class="f3"></div>' + botones + '</div>';
    }
    if (R.tab === 'cit') {
      return '<div class="row">' + C.campo('Fecha de la cita', '<input class="in" type="date" id="r_citFecha" value="' + R.citFecha + '">', 'f', true) +
        C.campo('Servicio', sel('citServ', SERVS, R.citServ), 'f2', true) + C.campo('Turno', sel('citTurno', ['MAÑANA', 'TARDE'], R.citTurno)) + '<div class="f"></div>' + botones + '</div>';
    }
    return '<div class="row">' + C.campo('Fecha de salida desde', '<input class="in" type="date" id="r_desde" value="' + R.desde + '">', 'f', true) +
      C.campo('Hasta', '<input class="in" type="date" id="r_hasta" value="' + R.hasta + '">', 'f', true) +
      C.campo('Servicio', sel('serv', ['TODOS'].concat(SERVS), R.serv, esDep), 'f2') +
      C.campo('Motivo', sel('mot', ['TODOS'].concat(MOTS.map(function (m) { return m[0]; })), R.mot), 'f') + botones + '</div>';
  }

  function filtrados() {
    var a = new Date(R.desde + 'T00:00'), b = new Date(R.hasta + 'T23:59');
    return MOV.filter(function (m) { return m.salida >= a && m.salida <= b && (R.serv === 'TODOS' || m.servicio === R.serv) && (R.mot === 'TODOS' || m.motivo === R.mot); });
  }
  function por(lista, k) { var o = {}; lista.forEach(function (m) { (o[m[k]] = o[m[k]] || []).push(m); }); return o; }
  function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }
  function prom(lista, k) { return lista.length ? (lista.reduce(function (s, m) { return s + m[k]; }, 0) / lista.length).toFixed(1) : '—'; }
  function est(t) {
    var c = { 'DEVUELTA A TIEMPO': 's-rec', 'DEVUELTA CON ATRASO': 's-env', 'VENCIDA': 's-dif', 'EN EL SERVICIO': 's-des', 'NO RECIBIDA': 's-dif' }[t] || 's-ate';
    return '<span class="st ' + c + '">' + t + '</span>';
  }
  function tabla(cab, filas, opc) {
    ultimaTabla = { cab: cab, filas: filas };
    var num = (opc && opc.num) || [];
    var max = (opc && opc.max) || 60;
    var h = '<table><tr>' + cab.map(function (c, i) { return '<th' + (num.indexOf(i) >= 0 ? ' style="text-align:right"' : '') + '>' + c + '</th>'; }).join('') + '</tr>' +
      filas.slice(0, max).map(function (r) { return '<tr' + (r.hl ? ' class="nuevo"' : '') + '>' + r.c.map(function (v, i) { return '<td' + (opc && opc.num && opc.num.indexOf(i) >= 0 ? ' style="text-align:right"' : '') + '>' + (r.html && r.html[i] != null ? r.html[i] : v) + '</td>'; }).join('') + '</tr>'; }).join('') +
      (filas.length ? '' : '<tr><td colspan="' + cab.length + '" class="vacio">Sin resultados para los filtros elegidos.</td></tr>') + (opc && opc.pie ? opc.pie : '') + '</table>';
    if (filas.length > max) h += '<div class="leg">Mostrando ' + max + ' de ' + filas.length + ' registros · la exportación incluye todos.</div>';
    return h;
  }
  function kpis(lista) {
    return '<div class="kpis">' + lista.map(function (k) { return '<div class="kpi' + (k[2] ? ' ' + k[2] : '') + '"><div class="v">' + k[0] + '</div><div class="t">' + k[1] + '</div></div>'; }).join('') + '</div>';
  }

  // ------------------------------------------------------------------ cuerpos de cada reporte
  function cuerpo(C) {
    var el = document.getElementById('repCuerpo'), L = filtrados(), h = '';
    if (R.tab === 'ind') {
      var dev = L.filter(function (m) { return m.ingreso; }), fuera = L.filter(function (m) { return !m.ingreso; });
      var porServ = por(L, 'servicio');
      h += kpis([[L.length, 'HC que salieron'], [pct(L.filter(function (m) { return m.aTiempo; }).length, dev.length) + '%', 'Devueltas a tiempo', 'ok'],
        [prom(dev, 'diasFuera'), 'Días promedio fuera'], [fuera.length, 'Siguen fuera'], [fuera.filter(function (m) { return m.estado === 'VENCIDA'; }).length, 'Vencidas', 'alerta'],
        [pct(L.filter(function (m) { return m.canal !== 'ARCHIVO'; }).length, L.length) + '%', 'Solicitadas por el servicio en SIGESAPOL']]);
      var filas = Object.keys(porServ).sort().map(function (s) {
        var l = porServ[s], d = l.filter(function (m) { return m.ingreso; }), p = pct(l.filter(function (m) { return m.aTiempo; }).length, d.length);
        return { c: [s, l.length, d.length, p + '%', prom(d, 'diasFuera'), l.length - d.length, l.filter(function (m) { return m.estado === 'VENCIDA'; }).length, l.filter(function (m) { return !m.recibida; }).length],
          html: { 3: '<div class="barra" title="' + s + ': ' + p + '% devueltas a tiempo"><span style="width:' + p + '%"></span><b>' + p + '%</b></div>' } };
      });
      h += '<div class="sub">CUMPLIMIENTO POR SERVICIO</div>' + tabla(['Servicio', 'HC que salieron', 'Devueltas', '% devueltas a tiempo', 'Días promedio fuera', 'Siguen fuera', 'Vencidas', 'No recibidas en la recepción'], filas, { num: [1, 2, 4, 5, 6, 7] });
    }
    if (R.tab === 'nodev') {
      var nd = L.filter(function (m) { return !m.ingreso; }).sort(function (a, b) { return b.atraso - a.atraso; });
      var ps = por(nd, 'servicio');
      h += kpis([[nd.length, 'HC no devueltas'], [nd.filter(function (m) { return m.estado === 'VENCIDA'; }).length, 'Vencidas', 'alerta'],
        [nd.length ? Math.max.apply(null, nd.map(function (m) { return m.atraso; })) : 0, 'Máximo de días de atraso'], [Object.keys(ps).length, 'Servicios con HC pendientes']]);
      h += '<div class="sub">RESUMEN POR SERVICIO Y MOTIVO</div>' + tabla(['Servicio', 'Motivo', 'No devueltas', 'Vencidas', 'Máx. días de atraso'],
        [].concat.apply([], Object.keys(ps).sort().map(function (s) {
          var pm = por(ps[s], 'motivo');
          return Object.keys(pm).map(function (mo) { var l = pm[mo]; return { c: [s, mo, l.length, l.filter(function (m) { return m.estado === 'VENCIDA'; }).length, Math.max.apply(null, l.map(function (m) { return m.atraso; }))] }; });
        })), { num: [2, 3, 4] });
      var resumen = ultimaTabla;
      h += '<div class="sub">DETALLE (ordenado por días de atraso)</div>' + tabla(['N° HC', 'Paciente', 'Servicio', 'Motivo', 'N° Solicitud', 'Fecha de salida', 'Retorno previsto', 'Días fuera', 'Días de atraso', 'Estado'],
        nd.map(function (m) { return { hl: m.estado === 'VENCIDA', c: [m.hc, m.pac, m.servicio, m.motivo, m.sol, f(m.salida), f(m.retorno), m.diasFuera, m.atraso, m.estado], html: { 9: est(m.estado) } }; }), { num: [7, 8], max: 40 });
      h += '<div class="acciones"><button class="btn r" onclick="alert(\'Maqueta: genera el memorando múltiple en PDF, uno por servicio, con sus HC vencidas.\')">Memorando múltiple de vencidas (PDF)</button></div>';
      void resumen;
    }
    if (R.tab === 'mov') {
      h += kpis([[L.length, 'HC en el periodo'], [Object.keys(por(L, 'orden')).length, 'Órdenes de salida'], [L.filter(function (m) { return m.ingreso; }).length, 'Devueltas'], [L.filter(function (m) { return !m.ingreso; }).length, 'Siguen fuera']]);
      h += tabla(['Fecha de salida', 'N° Orden', 'N° Solicitud', 'N° HC', 'Paciente', 'Servicio', 'Motivo', 'Solicitada por', 'Retorno previsto', 'Ingreso', 'Días fuera', 'Estado'],
        L.slice().sort(function (a, b) { return b.salida - a.salida; }).map(function (m) {
          return { c: [f(m.salida), m.orden, m.sol, m.hc, m.pac, m.servicio, m.motivo, m.canal === 'ARCHIVO' ? 'Archivo' : 'Servicio (SIGESAPOL)', f(m.retorno), f(m.ingreso), m.diasFuera, m.estado], html: { 11: est(m.estado) } };
        }), { num: [10] });
    }
    if (R.tab === 'est') {
      var pS = por(L, 'servicio'), mots = MOTS.map(function (m) { return m[0]; });
      var tot = mots.map(function (mo) { return L.filter(function (m) { return m.motivo === mo; }).length; });
      h += '<div class="sub">HC QUE SALIERON POR SERVICIO Y MOTIVO · ' + f(new Date(R.desde + 'T00:00')) + ' al ' + f(new Date(R.hasta + 'T00:00')) + '</div>';
      h += tabla(['Servicio'].concat(mots, ['Total', '% del total']), Object.keys(pS).sort().map(function (s) {
        var l = pS[s]; return { c: [s].concat(mots.map(function (mo) { return l.filter(function (m) { return m.motivo === mo; }).length; }), [l.length, pct(l.length, L.length) + '%']) };
      }), { num: [1, 2, 3, 4, 5, 6, 7, 8], pie: '<tr style="font-weight:700;background:#F5F5F5"><td>TOTAL</td>' + tot.map(function (t) { return '<td style="text-align:right">' + t + '</td>'; }).join('') + '<td style="text-align:right">' + L.length + '</td><td style="text-align:right">100%</td></tr>' });
    }
    if (R.tab === 'sal') {
      var pd = por(L.map(function (m) { m.dia = iso(m.salida); return m; }), 'dia');
      h += tabla(['Fecha', 'Órdenes de salida', 'HC que salieron', 'Servicios atendidos', 'Devueltas', 'Siguen fuera'], Object.keys(pd).sort().reverse().map(function (dd) {
        var l = pd[dd]; return { c: [f(new Date(dd + 'T00:00')), Object.keys(por(l, 'orden')).length, l.length, Object.keys(por(l, 'servicio')).length, l.filter(function (m) { return m.ingreso; }).length, l.filter(function (m) { return !m.ingreso; }).length] };
      }), { num: [1, 2, 3, 4, 5], pie: '<tr style="font-weight:700;background:#F5F5F5"><td>TOTAL</td><td style="text-align:right">' + Object.keys(por(L, 'orden')).length + '</td><td style="text-align:right">' + L.length + '</td><td></td><td style="text-align:right">' + L.filter(function (m) { return m.ingreso; }).length + '</td><td style="text-align:right">' + L.filter(function (m) { return !m.ingreso; }).length + '</td></tr>' });
    }
    if (R.tab === 'cit') {
      semilla = 99 + R.citServ.length + parseInt(R.citFecha.slice(-2), 10);
      var n = 8 + Math.floor(rnd() * 8), filas2 = [];
      for (var i = 0; i < n; i++) {
        var x = rnd(), sit = x < 0.75 ? 'DISPONIBLE' : (x < 0.9 ? 'PRESTADA A ' + SERVS[Math.floor(rnd() * SERVS.length)] : 'EN ESPERA');
        var solic = rnd() < 0.6;
        filas2.push({ hl: sit.indexOf('PRESTADA') === 0, c: [('0' + (8 + Math.floor(i / 2))).slice(-2) + ':' + (i % 2 ? '30' : '00'), '[N° HC ' + ('000' + (100 + i)).slice(-4) + ']', '[DNI]', '[paciente]', '[médico]', 'DIRECTO', sit, solic ? 'Sí · SOL-2026-0001' + (40 + i) : 'No'],
          html: { 6: '<span class="st ' + (sit === 'DISPONIBLE' ? 's-rec' : 's-env') + '">' + sit + '</span>' } });
      }
      h += kpis([[n, 'Pacientes citados'], [filas2.filter(function (r) { return r.c[6] === 'DISPONIBLE'; }).length, 'HC disponibles', 'ok'], [filas2.filter(function (r) { return r.c[6] !== 'DISPONIBLE'; }).length, 'HC fuera de Archivo', 'alerta'], [filas2.filter(function (r) { return r.c[7] !== 'No'; }).length, 'Con solicitud registrada']]);
      h += tabla(['Hora', 'N° HC', 'DNI', 'Paciente', 'Médico', 'Tipo de cita', 'Situación de la HC', 'Solicitud de HC'], filas2);
      h += '<div class="acciones"><button class="btn g" onclick="alert(\'Maqueta: crea la solicitud con las HC disponibles de los citados (HU01).\')">Generar solicitud con los citados disponibles</button></div>';
    }
    if (R.tab === 'rec') {
      var mv = MOV.filter(function (m) { return m.hc === R.hc && (C.rol !== 'dep' || m.servicio === C.servicio); }).sort(function (a, b) { return b.salida - a.salida; });
      h += '<div class="sub">RÉCORD DE MOVIMIENTO · ' + C.esc(R.hc) + ' · [paciente] · lugar de archivo: ARCHIVO ACTIVO</div>';
      h += kpis([[mv.length, 'Salidas'], [mv.filter(function (m) { return m.ingreso; }).length, 'Ingresos'], [prom(mv.filter(function (m) { return m.ingreso; }), 'diasFuera'), 'Días promedio fuera'],
        [mv.length && !mv[0].ingreso ? mv[0].servicio : 'ARCHIVO', 'Dónde está ahora']]);
      if (C.rol === 'dep') h += '<div class="leg" style="margin:-4px 0 6px">Se muestran solo los movimientos de esta HC hacia ' + C.esc(C.servicio) + '.</div>';
      h += tabla(['Fecha de salida', 'N° Orden', 'N° Solicitud', 'Servicio', 'Motivo', 'Solicitada por', 'Despachó', 'Recepción', 'Retorno previsto', 'Ingreso', 'Recibió en Archivo', 'Días fuera', 'Estado'],
        mv.map(function (m) { return { c: [f(m.salida), m.orden, m.sol, m.servicio, m.motivo, m.canal === 'ARCHIVO' ? 'Archivo' : 'Servicio (SIGESAPOL)', '[archivero]', m.recibida ? 'Recibida · [personal del servicio]' : 'No recibida', f(m.retorno), f(m.ingreso), m.ingreso ? '[archivero]' : '—', m.diasFuera, m.estado], html: { 12: est(m.estado) } }; }), { num: [11] });
    }
    el.innerHTML = h;
  }

  // ------------------------------------------------------------------ exportar (CSV para Excel)
  function exportar() {
    if (!ultimaTabla) return;
    var q = function (v) { v = String(v == null ? '' : v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var csv = '﻿' + [ultimaTabla.cab].concat(ultimaTabla.filas.map(function (r) { return r.c; })).map(function (r) { return r.map(q).join(';'); }).join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'reporte_' + R.tab + '_' + R.desde + '_' + R.hasta + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
  }

  return { render: render };
})();
