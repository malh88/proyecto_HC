/* Maqueta · Opciones de la Unidad de Archivo de HC (SIGESAPOL), según el análisis funcional v4.2:
   Registrar solicitud (Archivo), Ingreso de Historias (devolución), Seguimiento de HC,
   Buscar Historias y Nueva Historia. Usa el mismo estado en memoria que app.js. */

window.Archivo = (function () {
  'use strict';

  var PLAZO = { 'CONSULTA': 0, 'JUNTA MÉDICA': 2, 'INFORME MÉDICO': 3, 'COPIA': 3, 'DESCANSO MÉDICO': 3, 'HOSPITALIZACIÓN': 20 };
  var CANALES = ['PACIENTES CITADOS DEL DÍA', 'OFICIO DE JEFATURA', 'EXPEDIENTE DE MESA DE PARTES', 'PEDIDO DE PISO'];
  var LUGARES = ['ARCHIVO ACTIVO', 'ARCHIVO PASIVO', 'ARCHIVO DE FALLECIDOS', 'ARCHIVO DE REFERIDOS'];
  var TIPOS = ['VIVO', 'FALLECIDO', 'CLASIFICADO VIVO', 'CLASIFICADO FALLECIDO', 'ARCHIVO PASIVO'];
  var A = { borrador: null, tabReg: 'buscar', ingSel: null, nIng: 288, segFiltro: { serv: 'TODOS', est: 'TODOS', txt: '' }, busTxt: '', nuevaHc: 718189, nueva: null };
  var C;   // contexto que entrega app.js

  // ------------------------------------------------------------------ utilidades
  function $(id) { return document.getElementById(id); }
  function aFecha(t) { if (!t) return null; var p = t.split(' ')[0].split('-'); return new Date(+p[2], +p[1] - 1, +p[0]); }
  function fmt(d) { return ('0' + d.getDate()).slice(-2) + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + d.getFullYear(); }
  var HOY = new Date(2026, 9, 12), DIA = 86400000;

  // Situación de cada HC (una fila por HC de cada solicitud)
  function filasHc() {
    var out = [];
    C.S.sols.forEach(function (s) {
      s.hcs.forEach(function (h, i) {
        var est, donde = h.lugar || 'ARCHIVO ACTIVO', sal = aFecha(s.fechaDesp), ret = null, fuera = null, atraso = 0;
        if (sal) ret = new Date(sal.getTime() + (PLAZO[s.motivo] || 0) * DIA);
        if (s.estado === 'ENVIADA' || s.estado === 'EN_ATENCION') est = 'PENDIENTE DE DESPACHO';
        else if (!h.desp) { est = 'NO ENVIADA'; donde = (h.motivoFalta || 'Archivo') + (h.obsFalta ? ' · ' + h.obsFalta : ''); }
        else if (s.estado === 'DESPACHADA') { est = 'EN TRÁNSITO'; donde = 'En camino a ' + s.servicio; }
        else if (!h.rec) est = 'NO RECIBIDA';
        else if (h.dev) { est = 'DEVUELTA ' + (h.fechaDev || ''); }
        else {
          donde = s.servicio; atraso = Math.max(0, Math.round((HOY - ret) / DIA));
          est = atraso > 0 ? 'VENCIDA · ' + atraso + ' día(s) de atraso' : 'EN EL SERVICIO';
          if (h.retPend) est += ' · RETORNO SOLICITADO (' + h.retPend + ')';
        }
        if (sal) fuera = Math.round(((h.dev ? aFecha(h.fechaDev) : HOY) - sal) / DIA);
        out.push({ s: s, h: h, i: i, est: est, donde: donde, sal: sal, ret: ret, fuera: fuera, atraso: atraso });
      });
    });
    return out;
  }
  function badge(est) {
    var c = est.indexOf('VENCIDA') === 0 || est === 'NO RECIBIDA' || est === 'NO ENVIADA' ? 's-dif' : (est.indexOf('DEVUELTA') === 0 || est === 'DISPONIBLE') ? 's-rec' : est === 'EN EL SERVICIO' || est === 'EN TRÁNSITO' ? 's-des' : 's-env';
    return '<span class="st ' + c + '">' + est + '</span>';
  }
  function enlazar(sel, fn, ev) {
    Array.prototype.forEach.call(document.querySelectorAll(sel), function (el) {
      el['on' + (ev || 'click')] = function () { fn(el.getAttribute(sel.replace(/[\[\]]/g, '')), el); };
    });
  }

  // ------------------------------------------------------------------ 1. Registrar solicitud (Archivo)
  function registrar() {
    var b = A.borrador || (A.borrador = { id: 'SOL-2026-' + ('000000' + C.S.correl).slice(-6), servicio: 'ONCOLOGÍA', persona: '', canal: CANALES[0], motivo: 'CONSULTA', doc: 'TICKET', nroDoc: '',
      fechaDoc: '2026-10-12', cant: 4, lugar: LUGARES[0], fechaReq: '2026-10-13', prioridad: 'NORMAL', obs: '', hcs: [] });
    var e = C.esc, campo = C.campo, ro = C.ro, opts = C.opts;
    var filas = b.hcs.map(function (h, i) {
      return '<tr><td>' + (i + 1) + '</td><td>' + e(h.nro) + '</td><td>' + e(h.dni) + '</td><td>' + h.pac + '</td><td>' + h.tipo + '</td><td>' + h.lugar + '</td><td>' + badge(h.sit) + '</td><td>' + fmt(new Date(b.fechaReq + 'T00:00')) + '</td><td><button class="btn sm r" data-quitar="' + i + '">✖</button></td></tr>';
    }).join('');
    var tab = A.tabReg, pest = [['buscar', 'BUSCAR HISTORIA'], ['citados', 'HISTORIAS CITADAS (consulta del día)'], ['lista', 'CARGAR LISTA (N° HC / DNI)']].map(function (t) {
      return '<div class="' + (t[0] === tab ? 'on' : '') + '" data-ptab="' + t[0] + '">' + t[1] + '</div>';
    }).join('');
    var cuerpoTab = tab === 'buscar'
      ? '<div class="row">' + campo('Buscar por N° de HC, DNI o apellidos', '<input class="in" id="aBuscar" placeholder="N° de HC, DNI o apellidos">', 'f3') + '<div class="f" style="flex:.5"><label>&nbsp;</label><button class="btn k" style="width:100%" id="aAgregar">Agregar</button></div></div>'
      : tab === 'citados'
        ? '<div class="row">' + campo('Fecha de la cita', '<input class="in" type="date" value="2026-10-13">') + campo('Turno', '<select class="in"><option>MAÑANA</option><option>TARDE</option></select>') + '<div class="f" style="flex:.6"><label>&nbsp;</label><button class="btn k" style="width:100%" id="aCitados">Traer citados de ' + e(b.servicio) + '</button></div><div class="f2"></div></div>'
        : '<div class="row">' + campo('Pegue una lista (un N° de HC o DNI por línea)', '<textarea class="in" id="aLista" rows="3"></textarea>', 'f3') + '<div class="f" style="flex:.5"><label>&nbsp;</label><button class="btn k" style="width:100%" id="aCargar">Cargar</button></div></div>';
    C.vista.innerHTML =
      '<div class="bar">REGISTRAR SOLICITUD DE HISTORIAS CLÍNICAS · ARCHIVO</div><div class="box">' +
      '<div class="row">' + campo('N° Solicitud', ro(b.id)) + campo('Fecha y hora de registro', ro(C.ahora())) + campo('Registrado por', ro('[archivero]'), 'f2') + campo('Estado', ro('REGISTRADA')) + '</div>' +
      '<div class="sub">1. SOLICITANTE Y SUSTENTO</div>' +
      '<div class="row">' + campo('Servicio / departamento solicitante', '<select class="in" id="aServ">' + opts(C.SERVICIOS, b.servicio) + '</select>', 'f2', true) +
        campo('Persona que solicita', '<input class="in" id="aPers" value="' + e(b.persona) + '" placeholder="[personal del servicio]">', 'f2', true) +
        campo('Canal de ingreso', '<select class="in" id="aCanal">' + opts(CANALES, b.canal) + '</select>', 'f', true) + '</div>' +
      '<div class="row">' + campo('Motivo', '<select class="in" id="aMot">' + opts(Object.keys(PLAZO), b.motivo) + '</select><div class="ayuda">Plazo: ' + PLAZO[b.motivo] + ' día(s)</div>', 'f', true) +
        campo('Tipo de documento', '<select class="in" id="aDoc">' + opts(['TICKET', 'NOTA', 'OFICIO', 'EXPEDIENTE', 'PEDIDO'], b.doc) + '</select>', 'f', true) +
        campo('N° de documento', '<input class="in" id="aNro" value="' + e(b.nroDoc) + '">', 'f', b.doc === 'OFICIO' || b.doc === 'EXPEDIENTE') +
        campo('Fecha del documento', '<input class="in" type="date" id="aFDoc" value="' + b.fechaDoc + '">', 'f', true) +
        campo('Cant. HC', '<input class="in" type="number" min="1" id="aCant" value="' + b.cant + '">', 'fh', true) +
        campo('Adjuntar documento (PDF)', '<input class="in" type="file" accept="application/pdf">') + '</div>' +
      '<div class="row">' + campo('Lugar de archivo', '<select class="in" id="aLugar">' + opts(LUGARES, b.lugar) + '</select>') +
        campo('Fecha en que se requiere', '<input class="in" type="date" id="aFReq" min="2026-10-12" value="' + b.fechaReq + '">', 'f', true) +
        campo('Prioridad', '<select class="in" id="aPrio">' + opts(['NORMAL', 'URGENTE'], b.prioridad) + '</select>') +
        campo('Observación', '<input class="in" id="aObs" value="' + e(b.obs) + '">', 'f3') + '</div>' +
      '<div class="sub">2. HISTORIAS SOLICITADAS</div><div class="tabs">' + pest + '</div>' + cuerpoTab +
      '<table><tr><th>#</th><th>N° HC</th><th>DNI</th><th>Paciente</th><th>Tipo de historia</th><th>Lugar de archivo</th><th>Situación actual</th><th>Fecha en que se requiere</th><th>Quitar</th></tr>' +
      (filas || '<tr><td colspan="9" class="vacio">Agregue historias.</td></tr>') + '</table>' +
      '<div style="margin:8px 0;font-size:12px"><b>Historias agregadas: ' + b.hcs.length + ' de ' + b.cant + '</b> (Cant. HC)</div>' +
      '<div class="acciones"><button class="btn g" style="flex:1" id="aEnviar">Registrar y pasar a la bandeja</button><button class="btn k" style="flex:.4" id="aEditar">Editar</button><button class="btn r" style="flex:.4" id="aCancelar">Cancelar</button></div>' +
      '<div class="leg">Archivo sigue registrando las solicitudes que no envía el servicio: consulta del día desde «Historias citadas», expedientes de Mesa de Partes y pedidos de piso. Las HC prestadas quedan «En espera»; las de Archivo Pasivo o de Fallecidos requieren autorización (a validar).</div></div>';

    var leer = function () {
      b.servicio = $('aServ').value; b.persona = $('aPers').value.trim(); b.canal = $('aCanal').value; b.motivo = $('aMot').value; b.doc = $('aDoc').value;
      b.nroDoc = $('aNro').value.trim(); b.fechaDoc = $('aFDoc').value; b.cant = Math.max(1, parseInt($('aCant').value, 10) || 1); b.lugar = $('aLugar').value;
      b.fechaReq = $('aFReq').value; b.prioridad = $('aPrio').value; b.obs = $('aObs').value;
    };
    var agregar = function (v, sit) {
      var dni = /^\d{8}$/.test(v), n = b.hcs.length;
      b.hcs.push({ nro: dni ? '[N° HC]' : v, dni: dni ? v : '[DNI]', pac: '[paciente]', tipo: n === 3 ? 'FALLECIDO' : 'VIVO', lugar: n === 3 ? 'ARCHIVO DE FALLECIDOS' : b.lugar,
        sit: sit || (n === 2 ? 'PRESTADA A SALUD MENTAL · quedará EN ESPERA' : (n === 3 ? 'DISPONIBLE · requiere autorización' : 'DISPONIBLE')), desp: true, rec: true });
    };
    ['aMot', 'aDoc', 'aCant', 'aServ', 'aFReq'].forEach(function (id) { $(id).onchange = function () { leer(); registrar(); }; });
    enlazar('[data-ptab]', function (t) { leer(); A.tabReg = t; registrar(); });
    enlazar('[data-quitar]', function (i) { leer(); b.hcs.splice(+i, 1); registrar(); });
    if ($('aAgregar')) { $('aAgregar').onclick = function () { leer(); var v = $('aBuscar').value.trim(); if (!v) return; agregar(v); registrar(); }; $('aBuscar').onkeydown = function (ev) { if (ev.key === 'Enter') $('aAgregar').click(); }; }
    if ($('aCitados')) $('aCitados').onclick = function () { leer(); for (var k = 1; k <= 4; k++) agregar('[N° HC citado ' + k + ']', 'DISPONIBLE'); b.canal = CANALES[0]; b.motivo = 'CONSULTA'; b.doc = 'TICKET'; b.cant = Math.max(b.cant, b.hcs.length); registrar(); };
    if ($('aCargar')) $('aCargar').onclick = function () { leer(); $('aLista').value.split(/\s+/).filter(Boolean).forEach(function (v) { agregar(v); }); registrar(); };
    $('aEditar').onclick = function () { C.aviso('Puede modificar los datos mientras la solicitud no se despache.'); };
    $('aCancelar').onclick = function () { A.borrador = null; C.ir('bandeja'); };
    $('aEnviar').onclick = function () {
      leer();
      var err = [];
      if (!b.persona) err.push('la persona que solicita');
      if ((b.doc === 'OFICIO' || b.doc === 'EXPEDIENTE') && !b.nroDoc) err.push('el N° de documento');
      if (b.hcs.length !== b.cant) err.push(b.cant + ' historias (hay ' + b.hcs.length + ')');
      if (err.length) { C.aviso('Falta: ' + err.join('; ') + '.'); return; }
      C.S.sols.unshift({ id: b.id, fecha: C.ahora(), servicio: b.servicio, persona: b.persona, motivo: b.motivo, doc: b.doc, nroDoc: b.nroDoc, cant: b.cant,
        fechaReq: fmt(new Date(b.fechaReq + 'T00:00')), prioridad: b.prioridad, obs: b.obs, origen: 'ARCHIVO', estado: 'EN_ATENCION', hcs: b.hcs });
      C.S.correl++; A.borrador = null;
      C.aviso('Solicitud <b>' + b.id + '</b> registrada por Archivo. Está en la bandeja para despacharla.');
      C.ir('bandeja');
    };
  }

  // ------------------------------------------------------------------ 2. Ingreso de Historias (devolución a Archivo)
  function ingreso() {
    var e = C.esc, campo = C.campo, ro = C.ro;
    var pend = C.S.sols.filter(function (s) { return s.hcs.some(function (h) { return h.desp && h.rec && !h.dev; }) && ['RECEPCIONADA', 'DIFERENCIA', 'DEV_PARCIAL'].indexOf(s.estado) >= 0; });
    var s = pend.filter(function (x) { return x.id === A.ingSel; })[0];
    var rets = (C.S.retornos || []).filter(function (r) { return r.estado === 'POR_CONFIRMAR'; });
    var rt = rets.filter(function (r) { return r.id === A.retSel; })[0];
    if (s && rt && A.retPre !== rt.id) { s.hcs.forEach(function (x, i) { x.marca = rt.idx.indexOf(i) >= 0; }); A.retPre = rt.id; }
    var h = '<div class="bar">INGRESO DE HISTORIAS CLÍNICAS (DEVOLUCIÓN A ARCHIVO)</div><div class="box">' +
      '<div class="sub">SOLICITUDES DE RETORNO ENVIADAS POR LOS SERVICIOS · POR CONFIRMAR <span class="orig">nuevo</span></div>' +
      '<table><tr><th>N° Retorno</th><th>Enviada</th><th>Servicio</th><th>N° Solicitud</th><th>Persona que entrega</th><th>Entrega prevista</th><th>HC</th><th>Observación</th><th>Acción</th></tr>' +
      (rets.map(function (r) {
        return '<tr class="nuevo"><td>' + r.id + '</td><td>' + r.fecha + '</td><td>' + r.servicio + '</td><td>' + r.sol + '</td><td>' + e(r.persona) + '</td><td>' + e(r.entrega) + '</td><td style="text-align:center">' + r.idx.length +
          '</td><td>' + e(r.obs || '') + '</td><td><button class="btn sm g" data-ret="' + r.id + '">Confirmar recepción</button></td></tr>';
      }).join('') || '<tr><td colspan="9" class="vacio">No hay solicitudes de retorno pendientes.</td></tr>') + '</table>' +
      '<div class="sub">ÓRDENES CON HC EN LOS SERVICIOS (ingreso sin solicitud de retorno)</div><table><tr><th>N° Orden</th><th>N° Solicitud</th><th>Servicio</th><th>Motivo</th><th>Recepción</th><th>En el servicio</th><th>Acción</th></tr>' +
      (pend.map(function (p) {
        var n = p.hcs.filter(function (x) { return x.desp && x.rec && !x.dev; }).length;
        return '<tr' + (s && s.id === p.id ? ' class="nuevo"' : '') + '><td>' + p.ordenSal + '</td><td>' + p.id + '</td><td>' + p.servicio + '</td><td>' + p.motivo + '</td><td>' + (p.fechaRec || '—') + '</td><td style="text-align:center">' + n + '</td><td><button class="btn sm g" data-ing="' + p.id + '">Registrar ingreso</button></td></tr>';
      }).join('') || '<tr><td colspan="7" class="vacio">No hay HC en los servicios.</td></tr>') + '</table>';
    if (s) {
      var fuera = s.hcs.map(function (x, i) { return { x: x, i: i }; }).filter(function (o) { return o.x.desp && o.x.rec && !o.x.dev; });
      var marc = fuera.filter(function (o) { o.x.marca = o.x.marca !== false; return o.x.marca; }).length;
      var sal = aFecha(s.fechaDesp), ret = new Date(sal.getTime() + (PLAZO[s.motivo] || 0) * DIA), dfu = Math.round((HOY - sal) / DIA), aTiempo = HOY <= ret;
      h += (rt ? '<div class="nota"><b>Confirmando la solicitud de retorno ' + rt.id + '</b> enviada por ' + e(rt.persona) + ' (' + rt.servicio + '): ' + rt.idx.length + ' HC. Marque las que efectivamente recibe; si falta alguna, la observación es obligatoria y el servicio lo verá.</div>' : '') +
        '<div class="sub">DATOS DE LA SALIDA</div><div class="row">' + campo('N° Ingreso', ro('IN-2026-' + ('000000' + A.nIng).slice(-6))) + campo('Fecha y hora de ingreso', ro(C.ahora())) + campo('Recibido por (Archivo)', ro('[archivero]')) +
          campo('N° Solicitud', ro(s.id)) + campo('Servicio que devuelve', ro(s.servicio)) + campo('Fecha de salida', ro(s.fechaDesp)) + campo('Retorno previsto', ro(fmt(ret))) + '</div>' +
        '<div class="row">' + campo('Persona que entrega', '<input class="in" id="iPers" placeholder="[personal del servicio]" value="' + (rt ? e(rt.persona) : '') + '">', 'f2', true) +
          campo('Documento de devolución', '<select class="in">' + (rt ? '<option>SOLICITUD DE RETORNO (SIGESAPOL)</option>' : '') + '<option>CARGO</option><option>OFICIO</option></select>', 'f', true) +
          campo('N° de cargo / retorno', '<input class="in" id="iNro" value="' + (rt ? rt.id : '') + '">', 'f', true) + campo('Observación general', '<input class="in" id="iObs">', 'f2', rt && fuera.some(function (o) { return rt.idx.indexOf(o.i) >= 0 && !o.x.marca; })) + '</div>' +
        '<div class="kpis"><div class="kpi"><div class="v">' + s.hcs.filter(function (x) { return x.desp; }).length + '</div><div class="t">Despachadas</div></div><div class="kpi ok"><div class="v">' + marc + '</div><div class="t">Devueltas en este ingreso</div></div>' +
          '<div class="kpi"><div class="v">' + s.hcs.filter(function (x) { return x.dev; }).length + '</div><div class="t">Devueltas antes</div></div><div class="kpi' + (fuera.length - marc ? ' alerta' : '') + '"><div class="v">' + (fuera.length - marc) + '</div><div class="t">Siguen fuera</div></div></div>' +
        '<table><tr><th>Recibida</th><th>N° HC</th><th>DNI</th><th>Paciente</th><th>En el retorno</th><th>Días fuera</th><th>Cumplimiento</th><th>Estado de la carpeta</th></tr>' +
        fuera.map(function (o) {
          var enRet = o.x.retPend ? '<span class="st s-env">' + o.x.retPend + '</span>' : '—';
          return '<tr><td><input type="checkbox" data-dv="' + o.i + '"' + (o.x.marca ? ' checked' : '') + '></td><td>' + e(o.x.nro) + '</td><td>' + e(o.x.dni) + '</td><td>' + o.x.pac + '</td><td>' + enRet + '</td><td style="text-align:center">' + dfu + '</td><td>' +
            (aTiempo ? '<span class="st s-rec">A TIEMPO</span>' : '<span class="st s-dif">CON ATRASO</span>') + '</td><td><select class="in" style="min-height:24px;padding:2px"><option>COMPLETA</option><option>INCOMPLETA</option><option>DETERIORADA</option></select></td></tr>';
        }).join('') + '</table>' +
        '<div class="acciones"><button class="btn g" style="flex:1" id="iReg">Registrar ingreso de ' + marc + ' HC y descargar cargo (PDF)</button><button class="btn r" style="flex:.4" id="iCan">Cancelar</button></div>';
    }
    h += '<div class="sub" style="margin-top:14px">INGRESOS REGISTRADOS</div><table><tr><th>N° Ingreso</th><th>Fecha y hora</th><th>N° Orden</th><th>Servicio</th><th>Entregó</th><th>Recibió</th><th>Devueltas</th><th>Siguen fuera</th><th>Cargo</th></tr>' +
      ((C.S.ingresos || []).map(function (g) { return '<tr><td>' + g.id + '</td><td>' + g.fecha + '</td><td>' + g.orden + '</td><td>' + g.serv + '</td><td>' + e(g.pers) + '</td><td>[archivero]</td><td style="text-align:center">' + g.n + '</td><td style="text-align:center">' + g.faltan + '</td><td>📄 PDF</td></tr>'; }).join('') ||
        '<tr><td colspan="9" class="vacio">Aún no hay ingresos en esta sesión.</td></tr>') + '</table>' +
      '<div class="leg">Las HC no marcadas siguen «En el servicio»; al vencer su plazo pasan a «Vencida». Una HC solo puede salir de nuevo después de su ingreso.</div></div>';
    C.vista.innerHTML = h;
    enlazar('[data-ing]', function (id) { A.ingSel = id; A.retSel = null; A.retPre = null; C.S.sols.forEach(function (x) { if (x.id === id) x.hcs.forEach(function (h) { delete h.marca; }); }); ingreso(); });
    enlazar('[data-ret]', function (id) { var r = C.S.retornos.filter(function (x) { return x.id === id; })[0]; A.ingSel = r.sol; A.retSel = id; A.retPre = null; ingreso(); });
    if (!s) return;
    enlazar('[data-dv]', function (i, el) { s.hcs[+i].marca = el.checked; ingreso(); }, 'change');
    $('iCan').onclick = function () { A.ingSel = null; A.retSel = null; ingreso(); };
    $('iReg').onclick = function () {
      var pers = $('iPers').value.trim(), nro = $('iNro').value.trim();
      var sel = s.hcs.filter(function (x) { return x.desp && x.rec && !x.dev && x.marca; });
      if (!pers || !nro) { C.aviso('Falta la persona que entrega o el N° de cargo.'); return; }
      if (!sel.length) { C.aviso('Marque al menos una HC devuelta.'); return; }
      var obsG = $('iObs').value.trim();
      if (rt && rt.idx.some(function (i) { return !s.hcs[i].marca; }) && !obsG) { $('iObs').classList.add('err'); C.aviso('Faltan HC del retorno: escriba la observación.'); return; }
      sel.forEach(function (x) { x.dev = true; x.fechaDev = '12-10-2026'; delete x.retPend; });
      var faltan = s.hcs.filter(function (x) { return x.desp && x.rec && !x.dev; }).length;
      s.estado = faltan ? 'DEV_PARCIAL' : 'CERRADA';
      (C.S.ingresos = C.S.ingresos || []).unshift({ id: 'IN-2026-' + ('000000' + A.nIng).slice(-6), fecha: C.ahora(), orden: s.ordenSal, serv: s.servicio, pers: pers, n: sel.length, faltan: faltan });
      if (rt) {
        var conf = rt.idx.filter(function (i) { return s.hcs[i].dev; }).length;
        rt.nConf = conf; rt.estado = conf === rt.idx.length ? 'CONFIRMADA' : 'PARCIAL'; rt.ingreso = 'IN-2026-' + ('000000' + A.nIng).slice(-6); rt.obsArc = obsG;
        rt.idx.forEach(function (i) { delete s.hcs[i].retPend; });
      }
      A.nIng++; A.ingSel = null; A.retSel = null;
      C.aviso('Ingreso registrado: ' + sel.length + ' HC vuelven a su lugar de archivamiento.' + (faltan ? ' Siguen fuera: ' + faltan + '.' : ' Solicitud cerrada.') + (rt ? ' El servicio ve la confirmación en «Devolver HC».' : ''));
      C.ir('ing');
    };
  }

  // ------------------------------------------------------------------ 3. Seguimiento de HC
  function seguimiento() {
    var e = C.esc, campo = C.campo, F = A.segFiltro;
    var prio = function (r) { return ['VENCIDA', 'NO RECIBIDA', 'EN EL SERVICIO', 'EN TRÁNSITO', 'PENDIENTE', 'NO ENVIADA', 'DEVUELTA'].findIndex(function (p) { return r.est.indexOf(p) === 0; }); };
    var todas = filasHc().sort(function (a, b) { return prio(a) - prio(b); });
    var L = todas.filter(function (r) {
      return (F.serv === 'TODOS' || r.s.servicio === F.serv) && (F.est === 'TODOS' || r.est.indexOf(F.est) === 0) &&
        (!F.txt || (r.h.nro + ' ' + r.h.dni + ' ' + r.s.id).toLowerCase().indexOf(F.txt.toLowerCase()) >= 0);
    });
    var k = function (p) { return todas.filter(function (r) { return r.est.indexOf(p) === 0; }).length; };
    C.vista.innerHTML = '<div class="bar">SEGUIMIENTO DEL MOVIMIENTO DE HISTORIAS CLÍNICAS</div><div class="box">' +
      '<div class="row">' + campo('Servicio', '<select class="in" id="sServ">' + C.opts(['TODOS'].concat(C.SERVICIOS), F.serv) + '</select>', 'f2') +
        campo('Estado', '<select class="in" id="sEst">' + C.opts(['TODOS', 'PENDIENTE DE DESPACHO', 'EN TRÁNSITO', 'EN EL SERVICIO', 'VENCIDA', 'DEVUELTA', 'NO RECIBIDA'], F.est) + '</select>', 'f2') +
        campo('N° HC, DNI o N° solicitud', '<input class="in" id="sTxt" value="' + e(F.txt) + '">', 'f2') + '<div class="f" style="flex:.5"><label>&nbsp;</label><button class="btn k" style="width:100%" id="sBus">Buscar</button></div></div>' +
      '<div class="kpis"><div class="kpi"><div class="v">' + (k('EN TRÁNSITO') + k('EN EL SERVICIO') + k('VENCIDA')) + '</div><div class="t">Fuera de Archivo</div></div><div class="kpi alerta"><div class="v">' + k('VENCIDA') + '</div><div class="t">Vencidas</div></div>' +
        '<div class="kpi"><div class="v">' + k('PENDIENTE') + '</div><div class="t">Pendientes de despacho</div></div><div class="kpi"><div class="v">' + k('EN TRÁNSITO') + '</div><div class="t">En tránsito</div></div><div class="kpi ok"><div class="v">' + k('DEVUELTA') + '</div><div class="t">Devueltas</div></div></div>' +
      '<table><tr><th>N° HC</th><th>Paciente</th><th>N° Solicitud</th><th>Solicitado por</th><th>Motivo</th><th>Dónde está</th><th>Fecha de salida</th><th>Retorno previsto</th><th>Días fuera</th><th>Estado</th><th>Récord</th></tr>' +
      (L.map(function (r, n) {
        return '<tr' + (r.est.indexOf('VENCIDA') === 0 ? ' class="nuevo"' : '') + '><td>' + e(r.h.nro) + '</td><td>' + r.h.pac + '</td><td>' + r.s.id + '</td><td>' + e(r.s.persona) + ' · ' + r.s.servicio + '</td><td>' + r.s.motivo + '</td><td>' + e(r.donde) +
          '</td><td>' + (r.sal ? fmt(r.sal) : '—') + '</td><td>' + (r.ret ? fmt(r.ret) : '—') + '</td><td style="text-align:center">' + (r.fuera == null ? '—' : r.fuera) + '</td><td>' + badge(r.est) + '</td><td><button class="btn sm k" data-rec="' + n + '">🔍</button></td></tr>';
      }).join('') || '<tr><td colspan="11" class="vacio">Sin resultados.</td></tr>') + '</table>' +
      '<div class="acciones"><button class="btn b" id="sXls">Exportar a Excel</button><button class="btn r" id="sMem">Memorando múltiple de vencidas (PDF)</button></div>' +
      '<div class="leg">Una fila por HC. Vencida = siguió en el servicio después del retorno previsto (fecha de despacho + plazo del motivo). La lista de HC no devueltas, por servicio y motivo, está en «Reportes».</div></div>';
    $('sBus').onclick = function () { F.serv = $('sServ').value; F.est = $('sEst').value; F.txt = $('sTxt').value.trim(); seguimiento(); };
    $('sXls').onclick = function () { C.aviso('Maqueta: exporta esta lista a Excel (ver «Reportes» → Exportar).'); };
    $('sMem').onclick = function () { C.aviso('Maqueta: genera un memorando por servicio con sus HC vencidas.'); };
    enlazar('[data-rec]', function (n) { record(L[+n]); });
  }

  function record(r) {
    var ev = [['' + r.s.fecha, 'Solicitud ' + r.s.id + ' registrada por ' + r.s.persona + ' (' + r.s.servicio + ') · ' + r.s.motivo + (r.s.origen === 'SIGESAPOL' ? ' · enviada por el servicio en SIGESAPOL' : ' · registrada por Archivo')]];
    if (r.s.fechaDesp) ev.push([r.s.fechaDesp, (r.h.desp ? 'Despachada por ' + r.s.despPor + ' · Orden ' + r.s.ordenSal + ' · cargo PDF' : 'No enviada por Archivo · ' + C.esc(r.h.motivoFalta || '') + (r.h.obsFalta ? ' · ' + C.esc(r.h.obsFalta) : ''))]);
    if (r.s.fechaRec) ev.push([r.s.fechaRec, r.h.rec ? 'Recepcionada en ' + r.s.servicio + ' por ' + r.s.recibe : 'No llegó al servicio (diferencia en la recepción)']);
    if (r.est.indexOf('VENCIDA') === 0) ev.push([fmt(new Date(r.ret.getTime() + DIA)), '<span style="color:#A94442">Vencida · notificación al servicio y a la jefatura</span>']);
    if (r.h.dev) ev.push([r.h.fechaDev, 'Ingreso a Archivo · vuelve a ' + (r.h.lugar || 'ARCHIVO ACTIVO')]);
    $('modal').innerHTML = '<div class="bar">RÉCORD DE LA HC · ' + C.esc(r.h.nro) + ' · [paciente]</div><div class="box"><div class="tl">' +
      ev.map(function (x) { return '<div><b>' + x[0] + '</b> · ' + x[1] + '</div>'; }).join('') + '</div>' +
      '<div class="leg">Situación actual: ' + badge(r.est) + ' · Dónde está: ' + C.esc(r.donde) + '</div><div class="acciones"><button class="btn k" id="btnCerrar">Cerrar</button></div></div>';
    $('velo').classList.add('ver'); $('btnCerrar').onclick = C.cerrar;
  }

  // ------------------------------------------------------------------ 4. Buscar Historias
  function buscar() {
    var e = C.esc, t = A.busTxt.toLowerCase();
    var vistas = {}, L = filasHc().filter(function (r) { var k = r.h.nro + '|' + r.h.dni; if (vistas[k]) return false; vistas[k] = 1; return !t || (r.h.nro + ' ' + r.h.dni + ' ' + r.h.pac).toLowerCase().indexOf(t) >= 0; });
    C.vista.innerHTML = '<div class="bar">BUSCAR HISTORIAS CLÍNICAS</div><div class="box">' +
      '<div class="row">' + C.campo('N° de HC, DNI o apellidos', '<input class="in" id="bTxt" value="' + e(A.busTxt) + '" placeholder="Ej. N° de HC o DNI">', 'f3') + '<div class="f" style="flex:.5"><label>&nbsp;</label><button class="btn k" style="width:100%" id="bBus">Buscar</button></div></div>' +
      '<table><tr><th>N° HC</th><th>DNI</th><th>Paciente</th><th>Tipo de historia</th><th>Lugar de archivamiento</th><th>Situación</th><th>Dónde está</th><th>Récord</th></tr>' +
      (L.slice(0, 25).map(function (r, n) {
        return '<tr><td>' + e(r.h.nro) + '</td><td>' + e(r.h.dni) + '</td><td>' + r.h.pac + '</td><td>' + (r.h.tipo || 'VIVO') + '</td><td>' + (r.h.lugar || 'ARCHIVO ACTIVO') + '</td><td>' + badge(r.est) + '</td><td>' + e(r.donde) + '</td><td><button class="btn sm k" data-brec="' + n + '">Ver récord</button></td></tr>';
      }).join('') || '<tr><td colspan="8" class="vacio">No se encontraron historias.</td></tr>') + '</table>' +
      '<div class="leg">Ajuste del análisis v4.2: además de los datos de la HC, muestra su situación (disponible, prestada, vencida), dónde está y el récord de movimiento. No acepta HC sin número o con el DNI como número.</div></div>';
    $('bBus').onclick = function () { A.busTxt = $('bTxt').value.trim(); buscar(); };
    $('bTxt').onkeydown = function (ev) { if (ev.key === 'Enter') $('bBus').click(); };
    enlazar('[data-brec]', function (n) { record(L[+n]); });
  }

  // ------------------------------------------------------------------ 5. Nueva Historia (con registro del paciente)
  // Integra los campos de la pantalla «Registro de Nuevo Paciente» de SIGESAPOL. Catálogos de ejemplo (a validar).
  var PARENTESCO = ['TITULAR', 'CÓNYUGE', 'HIJO(A)', 'PADRE', 'MADRE'];
  var TIPODOC = ['DNI - DNI', 'CE - CARNÉ DE EXTRANJERÍA', 'PAS - PASAPORTE'];
  var GRUPO = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
  var ECIVIL = ['SOLTERO(A)', 'CASADO(A)', 'CONVIVIENTE', 'DIVORCIADO(A)', 'VIUDO(A)'];
  var UBIGEO = {
    'LIMA': { 'LIMA': ['LIMA', 'JESÚS MARÍA', 'LINCE', 'SAN ISIDRO', 'SAN MIGUEL', 'SURQUILLO'], 'CAÑETE': ['SAN VICENTE DE CAÑETE', 'IMPERIAL'] },
    'CALLAO': { 'CALLAO': ['CALLAO', 'BELLAVISTA', 'LA PERLA', 'VENTANILLA'] },
    'ICA': { 'ICA': ['ICA', 'LA TINGUIÑA'], 'PISCO': ['PISCO', 'SAN ANDRÉS'] }
  };
  function selOpts(list, v, ph) { return '<option value="">' + (ph || 'Seleccione ...') + '</option>' + list.map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + C.esc(o) + '</option>'; }).join(''); }

  function nueva() {
    var e = C.esc, campo = C.campo, ro = C.ro;
    var N = A.nueva || (A.nueva = { par: '', tdoc: 'DNI - DNI', doc: '', caso: '', p: {} });
    var P = N.p, nro = ('00000000' + A.nuevaHc).slice(-8);
    var hab = N.caso === 'nuevo' || N.caso === 'registrado';           // campos del paciente habilitados
    var dis = hab ? '' : ' disabled';
    var inp = function (id, v, extra) { return '<input class="in" id="' + id + '" value="' + e(v || '') + '"' + dis + (extra || '') + '>'; };
    var radio = function (name, ops, v) {
      return '<div style="display:flex;gap:18px;padding-top:6px">' + ops.map(function (o) {
        return '<label style="font-weight:400;display:inline-flex;gap:5px;align-items:center"><input type="radio" name="' + name + '" value="' + o + '"' + (v === o ? ' checked' : '') + dis + '>' + o + '</label>';
      }).join('') + '</div>';
    };
    var provs = P.dep ? Object.keys(UBIGEO[P.dep]) : [], dists = P.dep && P.prov ? UBIGEO[P.dep][P.prov] : [];
    var aviso = {
      nuevo: '<div class="nota">El documento no está registrado en SIGESAPOL. Complete los datos del paciente: al guardar se registra el paciente y se abre su historia clínica en un solo paso.</div>',
      registrado: '<div class="nota">Paciente ya registrado en SIGESAPOL y sin HC activa en este establecimiento: los datos se cargan y puede actualizarlos antes de abrir la HC.</div>',
      conHc: '<div class="nota" style="border-color:#D9534F;background:#FFF5F5">El paciente ya tiene la HC <b>[N° HC]</b> activa en este establecimiento (Archivo Activo). No se puede abrir otra (RN01). Use «Buscar Historias» para ver su situación.</div>'
    }[N.caso] || '';

    C.vista.innerHTML = '<div class="bar">NUEVA HISTORIA CLÍNICA<span class="tag">registro del paciente + apertura de HC</span></div><div class="box">' +
      '<div class="sub">1. IDENTIFICACIÓN DEL PACIENTE</div>' +
      '<div class="row">' + campo('Parentesco', '<select class="in" id="nPar">' + selOpts(PARENTESCO, N.par) + '</select>', 'f', true) +
        campo('Tipo de documento', '<select class="in" id="nTdoc">' + C.opts(TIPODOC, N.tdoc) + '</select>', 'f', true) +
        campo('N° de documento', '<input class="in" id="nDoc" maxlength="12" value="' + e(N.doc) + '">', 'f', true) +
        '<div class="f" style="flex:.5"><label>&nbsp;</label><button class="btn k" style="width:100%" id="nBus">Buscar</button></div><div class="f"></div></div>' +
      aviso +
      '<div class="sub">2. DATOS DEL PACIENTE</div>' +
      '<div class="row">' + campo('Nombres', inp('pNom', P.nom), 'f', true) + campo('Apellido paterno', inp('pApp', P.app), 'f', true) + campo('Apellido materno', inp('pApm', P.apm), 'f', true) + '</div>' +
      '<div class="row">' + campo('Género', radio('pGen', ['Masculino', 'Femenino'], P.gen), 'f', true) +
        campo('Fecha de nacimiento', '<input class="in" type="date" id="pNac" max="2026-10-13" value="' + e(P.nac || '') + '"' + dis + '>', 'f', true) +
        campo('Discapacitado', radio('pDis', ['No', 'Sí'], P.dis || 'No'), 'f', true) + '</div>' +
      '<div class="row">' + campo('Grupo sanguíneo', '<select class="in" id="pGru"' + dis + '>' + selOpts(GRUPO, P.gru) + '</select>', 'f', true) +
        campo('Estado civil', '<select class="in" id="pEci"' + dis + '>' + selOpts(ECIVIL, P.eci) + '</select>', 'f', true) + '<div class="f"></div></div>' +
      '<div class="row">' + campo('Departamento', '<select class="in" id="pDep"' + dis + '>' + selOpts(Object.keys(UBIGEO), P.dep) + '</select>', 'f', true) +
        campo('Provincia', '<select class="in" id="pPro"' + (hab && P.dep ? '' : ' disabled') + '>' + selOpts(provs, P.prov) + '</select>', 'f', true) +
        campo('Distrito', '<select class="in" id="pDis2"' + (hab && P.prov ? '' : ' disabled') + '>' + selOpts(dists, P.dist) + '</select>', 'f', true) + '</div>' +
      '<div class="row">' + campo('Dirección', inp('pDir', P.dir), 'f3', true) + campo('N° teléfono', inp('pTel', P.tel, ' maxlength="9"'), 'f', true) + campo('N° teléfono 2', inp('pTel2', P.tel2, ' maxlength="9"')) + '</div>' +
      '<div class="sub">3. HISTORIA CLÍNICA</div>' +
      '<div class="row">' + campo('N° de HC', ro(hab ? nro + ' (lo genera el sistema al guardar)' : '— se genera al guardar —'), 'f2') + campo('Fecha de apertura', ro('13-10-2026')) +
        campo('Tipo de historia', '<select class="in" id="nTipo"' + dis + '>' + C.opts(TIPOS, 'VIVO') + '</select>', 'f', true) +
        campo('Lugar de archivamiento', '<select class="in"' + dis + '>' + C.opts(LUGARES, 'ARCHIVO ACTIVO') + '</select>', 'f', true) +
        campo('Sector del archivo', ro(hab ? 'Según el rango del N° de HC' : '')) + '</div>' +
      '<div style="color:#C9302C;font-size:11px;margin-top:4px">(*) Campos obligatorios.</div>' +
      '<div class="acciones"><button class="btn g" style="flex:1" id="nGuardar"' + (hab ? '' : ' disabled') + '>' + (N.caso === 'nuevo' ? 'Registrar paciente y abrir historia clínica' : 'Guardar historia clínica') + '</button>' +
        '<button class="btn k" style="flex:.3" id="nLim">Limpiar</button><button class="btn r" style="flex:.3" id="nCan">Cancelar</button></div>' +
      '<div class="leg">Integra en una sola pantalla los campos de «Registro de Nuevo Paciente» de SIGESAPOL. Al buscar el documento: si no existe, se registra el paciente; si existe, se cargan sus datos; si ya tiene HC activa, no se abre otra (RN01). ' +
      'El N° de HC lo genera la base de datos (fn_hc_generar_numero); no puede ser el DNI ni repetirse. Departamento, provincia y distrito vienen del catálogo de ubigeo (aquí, lista de ejemplo). ' +
      '<br><i>Solo maqueta:</i> DNI terminado en 0 = ya tiene HC; en dígito par = paciente registrado; en dígito impar = paciente nuevo.</div></div>';

    function leer() {
      N.par = $('nPar').value; N.tdoc = $('nTdoc').value; N.doc = $('nDoc').value.trim();
      if (!hab) return;
      var r = function (n) { var x = document.querySelector('input[name="' + n + '"]:checked'); return x ? x.value : ''; };
      P.nom = $('pNom').value.trim(); P.app = $('pApp').value.trim(); P.apm = $('pApm').value.trim();
      P.gen = r('pGen'); P.nac = $('pNac').value; P.dis = r('pDis'); P.gru = $('pGru').value; P.eci = $('pEci').value;
      P.dep = $('pDep').value; P.prov = $('pPro').value; P.dist = $('pDis2').value;
      P.dir = $('pDir').value.trim(); P.tel = $('pTel').value.trim(); P.tel2 = $('pTel2').value.trim();
    }
    $('nBus').onclick = function () {
      leer();
      if (!N.par) { C.aviso('Seleccione el parentesco.'); return; }
      var dni = /^DNI/.test(N.tdoc);
      if (dni ? !/^\d{8}$/.test(N.doc) : !/^[A-Z0-9]{6,12}$/i.test(N.doc)) { C.aviso(dni ? 'Ingrese un DNI de 8 dígitos.' : 'Ingrese un N° de documento válido (6 a 12 caracteres).'); return; }
      var u = +N.doc.slice(-1);
      if (u === 0) { N.caso = 'conHc'; N.p = {}; }
      else if (u % 2 === 0) { N.caso = 'registrado'; N.p = { nom: '[nombres]', app: '[apellido paterno]', apm: '[apellido materno]', gen: 'Masculino', nac: '1980-05-14', dis: 'No', gru: 'O+', eci: 'CASADO(A)', dep: 'LIMA', prov: 'LIMA', dist: 'JESÚS MARÍA', dir: '[dirección]', tel: '[teléfono]', tel2: '' }; }
      else { N.caso = 'nuevo'; N.p = { dis: 'No' }; }
      nueva();
    };
    $('nDoc').onkeydown = function (ev) { if (ev.key === 'Enter') $('nBus').click(); };
    if (hab) {
      $('pDep').onchange = function () { leer(); P.prov = ''; P.dist = ''; nueva(); };
      $('pPro').onchange = function () { leer(); P.dist = ''; nueva(); };
    }
    $('nLim').onclick = function () { A.nueva = null; nueva(); };
    $('nCan').onclick = function () { A.nueva = null; nueva(); };
    $('nGuardar').onclick = function () {
      if (!hab) return;
      leer();
      var req = [['pNom', P.nom], ['pApp', P.app], ['pApm', P.apm], ['pNac', P.nac], ['pGru', P.gru], ['pEci', P.eci], ['pDep', P.dep], ['pPro', P.prov], ['pDis2', P.dist], ['pDir', P.dir], ['pTel', P.tel]];
      var falta = req.filter(function (x) { var el = $(x[0]); el.classList.toggle('err', !x[1]); return !x[1]; });
      if (!P.gen) falta.push('gen');
      if (P.tel && !/^\d{7,9}$/.test(P.tel)) { $('pTel').classList.add('err'); C.aviso('El teléfono debe tener de 7 a 9 dígitos.'); return; }
      if (falta.length) { C.aviso('Complete los campos obligatorios (' + falta.length + ').'); return; }
      C.aviso((N.caso === 'nuevo' ? 'Paciente registrado y ' : '') + 'HC <b>' + nro + '</b> creada en Archivo Activo.');
      A.nuevaHc++; A.nueva = null; nueva();
    };
  }

  // ------------------------------------------------------------------ datos adicionales de ejemplo (HC en los servicios)
  var sembrado = false;
  function sembrar() {
    if (sembrado) return; sembrado = true;
    var hc = function (n, p) { var a = []; for (var i = 1; i <= n; i++) a.push({ nro: '[N° HC ' + p + i + ']', dni: '[DNI]', pac: '[paciente]', desp: true, rec: true }); return a; };
    C.S.sols.push(
      { id: 'SOL-2026-000121', fecha: '07-10-2026 09:00', servicio: 'CIRUGÍA GENERAL', persona: '[secretaria de Cirugía general]', motivo: 'JUNTA MÉDICA', doc: 'OFICIO', nroDoc: 'Oficio N° [n°]-2026',
        cant: 3, fechaReq: '08-10-2026', prioridad: 'NORMAL', obs: '', origen: 'SIGESAPOL', estado: 'RECEPCIONADA', hcs: hc(3, 'H'),
        ordenSal: 'OS-2026-000301', despPor: '[archivero]', fechaDesp: '08-10-2026 08:00', recibe: '[secretaria de Cirugía general]', fechaRec: '08-10-2026 08:30', cantRec: 3 },
      { id: 'SOL-2026-000125', fecha: '09-10-2026 14:00', servicio: 'PEDIATRÍA', persona: '[asistente de Pediatría]', motivo: 'HOSPITALIZACIÓN', doc: 'PEDIDO', nroDoc: '',
        cant: 2, fechaReq: '10-10-2026', prioridad: 'NORMAL', obs: '', origen: 'ARCHIVO', estado: 'RECEPCIONADA', hcs: hc(2, 'J'),
        ordenSal: 'OS-2026-000306', despPor: '[archivero]', fechaDesp: '10-10-2026 07:45', recibe: '[asistente de Pediatría]', fechaRec: '10-10-2026 08:10', cantRec: 2 }
    );
  }

  return {
    render: function (vista, ctx) {
      C = ctx; sembrar();
      ({ areg: registrar, ing: ingreso, seg: seguimiento, bus: buscar, nueva: nueva })[vista]();
    },
    preparar: function (ctx) { C = ctx; sembrar(); }
  };
})();
