/* Maqueta interactiva · Solicitud de HC desde los departamentos médicos (SIGESAPOL)
   - Perfil «Departamento médico»: Mis solicitudes, Registrar solicitud (solo enviar), Recepcionar HC.
   - Perfil «Archivo de HC»: Bandeja de solicitudes (ve lo que envían los departamentos) y despacho.
   Los datos son ficticios ([paciente], [N° HC]) y viven solo en memoria: al recargar se reinician. */

(function () {
  'use strict';

  // ------------------------------------------------------------------ datos de ejemplo
  var HOY = '12-10-2026';
  // Servicios que más solicitan HC según Archivo (audio del 12/10/2026; lista a validar)
  var SERVICIOS = ['ONCOLOGÍA', 'CIRUGÍA DE TÓRAX', 'CIRUGÍA GENERAL', 'GASTROENTEROLOGÍA', 'GINECOLOGÍA', 'PEDIATRÍA', 'EMERGENCIA'];
  var SERVICIO_USUARIO = 'ONCOLOGÍA';
  var PERSONAL = [];
  function personal() {
    var n = SERVICIO_USUARIO.charAt(0) + SERVICIO_USUARIO.slice(1).toLowerCase();
    PERSONAL = ['[secretaria de ' + n + ']', '[asistente de ' + n + ']', '[jefe de ' + n + ']'];
  }
  personal();
  var MOTIVOS = [
    { c: 'CONSULTA', plazo: 'el mismo día' }, { c: 'JUNTA MÉDICA', plazo: '2 días' },
    { c: 'INFORME MÉDICO', plazo: '48 h a 3 días' }, { c: 'COPIA', plazo: '48 h a 3 días' },
    { c: 'DESCANSO MÉDICO', plazo: '48 h a 3 días' }, { c: 'HOSPITALIZACIÓN', plazo: 'por definir' }
  ];
  var DOCS = ['TICKET', 'NOTA', 'OFICIO', 'PEDIDO'];

  function hcs(n, pref) {
    var a = [];
    for (var i = 1; i <= n; i++) a.push({ nro: '[N° HC ' + pref + i + ']', dni: '[DNI]', pac: '[paciente]', desp: true, rec: true });
    return a;
  }

  var S = {
    rol: 'dep',
    vista: 'mis',
    sel: null,            // solicitud seleccionada para recepcionar
    correl: 134,
    orden: 318,
    borrador: null,
    sols: [
      { id: 'SOL-2026-000133', fecha: '12-10-2026 08:10', servicio: 'ONCOLOGÍA', persona: PERSONAL[0], motivo: 'JUNTA MÉDICA', doc: 'OFICIO', nroDoc: 'Oficio N° [n°]-2026',
        cant: 3, fechaReq: '13-10-2026', prioridad: 'NORMAL', obs: '', origen: 'SIGESAPOL', estado: 'ENVIADA', hcs: hcs(3, 'A') },
      { id: 'SOL-2026-000130', fecha: '11-10-2026 15:20', servicio: 'ONCOLOGÍA', persona: PERSONAL[1], motivo: 'CONSULTA', doc: 'TICKET', nroDoc: '',
        cant: 5, fechaReq: '12-10-2026', prioridad: 'NORMAL', obs: '', origen: 'SIGESAPOL', estado: 'DESPACHADA', hcs: hcs(5, 'B'),
        ordenSal: 'OS-2026-000317', despPor: '[archivero]', fechaDesp: '12-10-2026 07:30' },
      { id: 'SOL-2026-000127', fecha: '10-10-2026 10:05', servicio: 'ONCOLOGÍA', persona: PERSONAL[0], motivo: 'COPIA', doc: 'OFICIO', nroDoc: 'Oficio N° [n°]-2026',
        cant: 2, fechaReq: '11-10-2026', prioridad: 'NORMAL', obs: '', origen: 'SIGESAPOL', estado: 'RECEPCIONADA', hcs: hcs(2, 'C'),
        ordenSal: 'OS-2026-000309', despPor: '[archivero]', fechaDesp: '11-10-2026 08:00', recibe: PERSONAL[0], fechaRec: '11-10-2026 08:40', cantRec: 2 },
      { id: 'SOL-2026-000132', fecha: '12-10-2026 07:55', servicio: 'CIRUGÍA GENERAL', persona: '[secretaria de Cirugía general]', motivo: 'INFORME MÉDICO', doc: 'OFICIO', nroDoc: 'Oficio N° [n°]-2026',
        cant: 4, fechaReq: '14-10-2026', prioridad: 'URGENTE', obs: '', origen: 'SIGESAPOL', estado: 'ENVIADA', hcs: hcs(4, 'D') },
      { id: 'SOL-2026-000131', fecha: '12-10-2026 07:40', servicio: 'GASTROENTEROLOGÍA', persona: '[secretaria de Gastroenterología]', motivo: 'JUNTA MÉDICA', doc: 'OFICIO', nroDoc: 'Oficio N° [n°]-2026',
        cant: 2, fechaReq: '13-10-2026', prioridad: 'NORMAL', obs: '', origen: 'SIGESAPOL', estado: 'ENVIADA', hcs: hcs(2, 'F') },
      { id: 'SOL-2026-000128', fecha: '11-10-2026 18:15', servicio: 'EMERGENCIA', persona: '[asistente de Emergencia]', motivo: 'CONSULTA', doc: 'NOTA', nroDoc: '',
        cant: 1, fechaReq: '12-10-2026', prioridad: 'URGENTE', obs: '', origen: 'SIGESAPOL', estado: 'DESPACHADA', hcs: hcs(1, 'G'),
        ordenSal: 'OS-2026-000316', despPor: '[archivero]', fechaDesp: '11-10-2026 18:40' },
      { id: 'SOL-2026-000129', fecha: '11-10-2026 09:30', servicio: 'CIRUGÍA DE TÓRAX', persona: '[personal de Cirugía de tórax]', motivo: 'CONSULTA', doc: 'TICKET', nroDoc: '',
        cant: 12, fechaReq: '12-10-2026', prioridad: 'NORMAL', obs: '', origen: 'ARCHIVO', estado: 'EN_ATENCION', hcs: hcs(12, 'E') }
    ]
  };

  S.nRet = 41;
  S.retornos = [{ id: 'RET-2026-000040', fecha: '12-10-2026 09:10', sol: 'SOL-2026-000127', servicio: 'ONCOLOGÍA', persona: '[asistente de Oncología]', entrega: '2026-10-12 10:00', obs: '', idx: [0, 1], estado: 'POR_CONFIRMAR' }];
  S.sols.forEach(function (s) { if (s.id === 'SOL-2026-000127') s.hcs.forEach(function (h) { h.retPend = 'RET-2026-000040'; }); });

  var ESTADOS = {
    ENVIADA: ['s-env', 'ENVIADA A ARCHIVO'], EN_ATENCION: ['s-ate', 'EN ATENCIÓN (ARCHIVO)'],
    DESPACHADA: ['s-des', 'DESPACHADA · POR RECEPCIONAR'], RECEPCIONADA: ['s-rec', 'RECEPCIONADA'],
    DIFERENCIA: ['s-dif', 'RECEPCIONADA CON DIFERENCIA'], DEV_PARCIAL: ['s-env', 'DEVOLUCIÓN PARCIAL'],
    CERRADA: ['s-rec', 'CERRADA · TODAS DEVUELTAS']
  };

  // ------------------------------------------------------------------ utilidades
  var $ = function (id) { return document.getElementById(id); };
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function st(e) { var x = ESTADOS[e]; return '<span class="st ' + x[0] + '">' + x[1] + '</span>'; }
  function opts(list, v) { return list.map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join(''); }
  function campo(lab, html, cls, req) { return '<div class="' + (cls || 'f') + '"><label>' + lab + (req ? ' <i>*</i>' : '') + '</label>' + html + '</div>'; }
  function ro(v) { return '<input class="in" readonly value="' + esc(v) + '">'; }
  function aviso(t) { var a = $('aviso'); a.innerHTML = t; a.classList.add('ver'); clearTimeout(aviso.t); aviso.t = setTimeout(function () { a.classList.remove('ver'); }, 3800); }
  function ahora() { var d = new Date(); return HOY + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function fmtFecha(iso) { if (!iso) return ''; var p = iso.split('-'); return p[2] + '-' + p[1] + '-' + p[0]; }
  function mias() { return S.sols.filter(function (s) { return s.servicio === SERVICIO_USUARIO; }); }
  function cuenta(f) { return S.sols.filter(f).length; }

  // ------------------------------------------------------------------ menú lateral
  function menu() {
    var h = '';
    if (S.rol === 'dep') {
      var porRec = mias().filter(function (s) { return s.estado === 'DESPACHADA'; }).length;
      h += '<div class="usr"><b>' + PERSONAL[0] + '</b>' + SERVICIO_USUARIO + ' · perfil «Solicitante de HC»</div>';
      h += item('mis', 'Mis solicitudes de HC', true);
      h += item('reg', 'Registrar solicitud', false);
      h += item('rec', 'Recepcionar HC', true, porRec);
      h += item('dev', 'Devolver HC', true, enMiServicio().filter(function (o) { return !o.h.retPend; }).length);
    } else {
      var nuevas = cuenta(function (s) { return s.estado === 'ENVIADA'; });
      h += '<div class="usr"><b>[archivero]</b>Unidad de Archivo de HC · perfil «Operador de Archivo»</div>';
      h += item('bandeja', 'Bandeja de solicitudes', false, nuevas);
      h += item('areg', 'Registrar solicitud', false);
      h += item('ing', 'Ingreso de Historias', false, (S.retornos || []).filter(function (r) { return r.estado === 'POR_CONFIRMAR'; }).length);
      h += item('seg', 'Seguimiento de HC', true);
      h += item('rep', 'Reportes', true);
      h += item('bus', 'Buscar Historias', false);
      h += item('nueva', 'Nueva Historia', false);
    }
    $('side').innerHTML = h;
    Array.prototype.forEach.call(document.querySelectorAll('.side a[data-v]'), function (a) {
      a.onclick = function () { S.vista = a.getAttribute('data-v'); S.sel = null; pintar(); };
    });
  }
  function item(v, t, nuevo, c) {
    return '<a data-v="' + v + '" class="' + (S.vista === v ? 'on' : '') + '">▦ ' + t + (nuevo ? ' <span class="n">nuevo</span>' : '') + (c ? '<span class="c">' + c + '</span>' : '') + '</a>';
  }
  function off(t) { return '<a class="off" title="Sin cambios: se mantiene como en el análisis funcional v4.2">▦ ' + t + '</a>'; }

  // ------------------------------------------------------------------ flujo
  function flujo() {
    $('flujo').style.display = ['rep', 'seg', 'bus', 'nueva'].indexOf(S.vista) >= 0 ? 'none' : '';
    var pasos = [
      ['dep', '1. Se registra la solicitud', 'el servicio en SIGESAPOL o Archivo'],
      ['arc', '2. Archivo recibe en su bandeja', 'ubica y prepara las HC'],
      ['arc', '3. Archivo despacha', 'orden de salida + cargo'],
      ['dep', '4. Departamento recepciona', 'confirma la cantidad recibida'],
      ['dep', '5. Departamento solicita el retorno', 'envía a Archivo las HC que devuelve'],
      ['arc', '6. Archivo confirma el ingreso', 'recepción de las HC devueltas']
    ];
    var on = { mis: -1, reg: 0, areg: 0, bandeja: 1, rec: 3, dev: 4, ing: 5 }[S.vista];
    if (S.vista === 'bandeja' && $('velo').classList.contains('ver')) on = 2;
    $('flujo').innerHTML = pasos.map(function (p, i) {
      return '<div class="' + (i === on ? 'on' : (p[0] === 'dep' ? 'dep' : '')) + '">' + p[1] + '<small>' + p[2] + '</small></div>';
    }).join('');
  }

  // ------------------------------------------------------------------ DEPARTAMENTO · Mis solicitudes
  function vistaMis() {
    var m = mias();
    var k = function (e) { return m.filter(function (s) { return s.estado === e; }).length; };
    var filas = m.map(function (s) {
      var acc = s.estado === 'DESPACHADA'
        ? '<button class="btn sm g" data-rec="' + s.id + '">Recepcionar</button>'
        : '<button class="btn sm k" data-ver="' + s.id + '">Ver</button>';
      return '<tr' + (s.estado === 'DESPACHADA' ? ' class="nuevo"' : '') + '><td>' + s.id + '</td><td>' + s.fecha + '</td><td>' + esc(s.persona) + '</td><td>' + s.motivo + '</td><td>' + s.doc + (s.nroDoc ? ' · ' + esc(s.nroDoc) : '') +
        '</td><td style="text-align:center">' + s.cant + '</td><td>' + s.fechaReq + '</td><td>' + st(s.estado) + '</td><td>' + acc + '</td></tr>';
    }).join('');
    $('vista').innerHTML =
      '<div class="bar">MIS SOLICITUDES DE HISTORIAS CLÍNICAS · ' + SERVICIO_USUARIO + '<span class="tag">nuevo</span></div><div class="box">' +
      '<div class="kpis"><div class="kpi"><div class="v">' + k('ENVIADA') + '</div><div class="t">Enviadas a Archivo</div></div>' +
      '<div class="kpi"><div class="v">' + k('EN_ATENCION') + '</div><div class="t">En atención</div></div>' +
      '<div class="kpi alerta"><div class="v">' + k('DESPACHADA') + '</div><div class="t">Por recepcionar</div></div>' +
      '<div class="kpi ok"><div class="v">' + (k('RECEPCIONADA') + k('DIFERENCIA') + k('DEV_PARCIAL') + k('CERRADA')) + '</div><div class="t">Recepcionadas</div></div></div>' +
      '<div style="display:flex;justify-content:flex-end"><button class="btn g" id="btnNueva">+ Registrar nueva solicitud</button></div>' +
      '<table><tr><th>N° Solicitud</th><th>Fecha y hora</th><th>Solicitado por</th><th>Motivo</th><th>Documento</th><th>Cant. HC</th><th>Fecha en que se requiere</th><th>Estado</th><th>Acción</th></tr>' +
      (filas || '<tr><td colspan="9" class="vacio">Aún no hay solicitudes.</td></tr>') + '</table>' +
      '<div class="leg">El departamento solo ve sus propias solicitudes. Cuando Archivo despacha, la solicitud pasa a «Por recepcionar» y aparece en «Recepcionar HC». Para devolver las HC use «Devolver HC».</div></div>';
    $('btnNueva').onclick = function () { S.vista = 'reg'; pintar(); };
    enlazar('[data-rec]', function (id) { S.vista = 'rec'; S.sel = id; pintar(); });
    enlazar('[data-ver]', function (id) { verSolicitud(id); });
  }

  // ------------------------------------------------------------------ DEPARTAMENTO · Registrar solicitud (solo enviar)
  function nuevoBorrador() {
    return { id: 'SOL-2026-' + ('000000' + S.correl).slice(-6), persona: PERSONAL[0], motivo: 'JUNTA MÉDICA', doc: 'OFICIO', nroDoc: '',
             fechaDoc: '2026-10-12', cant: 2, fechaReq: '2026-10-13', prioridad: 'NORMAL', obs: '', hcs: [] };
  }
  function vistaReg() {
    var b = S.borrador || (S.borrador = nuevoBorrador());
    var plazo = MOTIVOS.filter(function (m) { return m.c === b.motivo; })[0].plazo;
    var filas = b.hcs.map(function (h, i) {
      return '<tr><td>' + (i + 1) + '</td><td>' + esc(h.nro) + '</td><td>' + esc(h.dni) + '</td><td>' + h.pac + '</td><td><span class="st s-rec">DISPONIBLE</span></td><td><button class="btn sm r" data-quitar="' + i + '">✖</button></td></tr>';
    }).join('');
    var faltan = b.cant - b.hcs.length;
    $('vista').innerHTML =
      '<div class="bar">REGISTRAR SOLICITUD DE HISTORIAS CLÍNICAS<span class="tag">habilitado para los departamentos</span></div><div class="box">' +
      '<div class="row">' + campo('N° Solicitud', ro(b.id)) + campo('Fecha y hora de registro', ro(ahora())) + campo('Registrado por', ro('[usuario de la sesión]'), 'f2') + campo('Estado', ro('REGISTRADA')) + '</div>' +
      '<div class="sub">1. SOLICITANTE Y SUSTENTO</div>' +
      '<div class="row">' + campo('Servicio / departamento solicitante', ro(SERVICIO_USUARIO) + '<div class="ayuda">Se toma del usuario (no editable)</div>', 'f2', true) +
        campo('Persona que solicita', '<select class="in" id="fPersona">' + opts(PERSONAL, b.persona) + '</select>', 'f2', true) + '</div>' +
      '<div class="row">' + campo('Motivo', '<select class="in" id="fMotivo">' + opts(MOTIVOS.map(function (m) { return m.c; }), b.motivo) + '</select><div class="ayuda">Plazo de retorno: ' + plazo + '</div>', 'f', true) +
        campo('Tipo de documento', '<select class="in" id="fDoc">' + opts(DOCS, b.doc) + '</select>', 'f', true) +
        campo('N° de documento', '<input class="in" id="fNroDoc" value="' + esc(b.nroDoc) + '" placeholder="Oficio N° …">', 'f', b.doc === 'OFICIO') +
        campo('Fecha del documento', '<input class="in" type="date" id="fFechaDoc" value="' + b.fechaDoc + '">', 'f', true) +
        campo('Cant. HC', '<input class="in" type="number" min="1" id="fCant" value="' + b.cant + '">', 'fh', true) +
        campo('Adjuntar documento (PDF)', '<input class="in" type="file" accept="application/pdf" id="fPdf">', 'f') + '</div>' +
      '<div class="row">' + campo('Fecha en que se requiere', '<input class="in" type="date" id="fFechaReq" min="2026-10-12" value="' + b.fechaReq + '">', 'f', true) +
        campo('Prioridad', '<select class="in" id="fPrio">' + opts(['NORMAL', 'URGENTE'], b.prioridad) + '</select>', 'f') +
        campo('Observación', '<input class="in" id="fObs" value="' + esc(b.obs) + '">', 'f3') + '</div>' +
      '<div class="sub">2. HISTORIAS SOLICITADAS</div>' +
      '<div class="row">' + campo('Buscar por N° de HC o DNI', '<input class="in" id="fBuscar" placeholder="Escriba el N° de HC o el DNI y presione Agregar">', 'f3') +
        '<div class="f" style="flex:.5"><label>&nbsp;</label><button class="btn k" style="width:100%" id="btnAgregar">Agregar</button></div></div>' +
      '<table><tr><th>#</th><th>N° HC</th><th>DNI</th><th>Paciente</th><th>Situación</th><th>Quitar</th></tr>' +
      (filas || '<tr><td colspan="6" class="vacio">Agregue las historias que necesita.</td></tr>') + '</table>' +
      '<div style="margin:8px 0;font-size:12px"><b>Historias agregadas: ' + b.hcs.length + ' de ' + b.cant + '</b> (Cant. HC)' +
        (faltan > 0 ? ' · <span style="color:#A94442">faltan ' + faltan + '</span>' : (faltan < 0 ? ' · <span style="color:#A94442">sobran ' + (-faltan) + '</span>' : ' · <span style="color:#2E6B30">completo</span>')) + '</div>' +
      '<div class="nota"><b>Qué cambia para el departamento:</b> la solicitud ya no se lleva en papel ni de forma presencial a Archivo; el servicio la registra y la <b>envía</b> desde SIGESAPOL. No ve «Canal de ingreso» (se guarda como «Solicitud del servicio en SIGESAPOL»), ni «Lugar de archivo», ni el despacho: eso lo hace Archivo. Una vez enviada no se edita; si hay un error, se pide a Archivo que la anule.</div>' +
      '<div class="acciones"><button class="btn g" style="flex:1" id="btnEnviar">Enviar solicitud a Archivo</button><button class="btn r" style="flex:.4" id="btnCancelar">Cancelar</button></div>' +
      '<div class="leg"><i style="color:#C9302C;font-style:normal">*</i> obligatorio. El N° de documento es obligatorio si es oficio. Las historias agregadas deben coincidir con «Cant. HC».</div></div>';

    // eventos
    var leer = function () {
      b.persona = $('fPersona').value; b.motivo = $('fMotivo').value; b.doc = $('fDoc').value; b.nroDoc = $('fNroDoc').value.trim();
      b.fechaDoc = $('fFechaDoc').value; b.cant = Math.max(1, parseInt($('fCant').value, 10) || 1); b.fechaReq = $('fFechaReq').value;
      b.prioridad = $('fPrio').value; b.obs = $('fObs').value;
    };
    ['fMotivo', 'fDoc', 'fCant'].forEach(function (id) { $(id).onchange = function () { leer(); vistaReg(); }; });
    $('btnAgregar').onclick = function () {
      leer();
      var v = $('fBuscar').value.trim();
      if (!v) { $('fBuscar').classList.add('err'); return; }
      var esDni = /^\d{8}$/.test(v);
      b.hcs.push({ nro: esDni ? '[N° HC]' : v, dni: esDni ? v : '[DNI]', pac: '[paciente]', desp: true, rec: true });
      vistaReg(); $('fBuscar').focus();
    };
    $('fBuscar').onkeydown = function (e) { if (e.key === 'Enter') $('btnAgregar').click(); };
    enlazar('[data-quitar]', function (i) { leer(); b.hcs.splice(+i, 1); vistaReg(); });
    $('btnCancelar').onclick = function () { S.borrador = null; S.vista = 'mis'; pintar(); };
    $('btnEnviar').onclick = function () {
      leer();
      var errores = [];
      if (b.doc === 'OFICIO' && !b.nroDoc) { errores.push('el N° de oficio'); $('fNroDoc').classList.add('err'); }
      if (!b.fechaReq || b.fechaReq < '2026-10-12') { errores.push('una fecha requerida desde hoy'); $('fFechaReq').classList.add('err'); }
      if (b.hcs.length !== b.cant) errores.push('agregar ' + b.cant + ' historias (hay ' + b.hcs.length + ')');
      if (errores.length) { aviso('Falta: ' + errores.join('; ') + '.'); return; }
      S.sols.unshift({ id: b.id, fecha: ahora(), servicio: SERVICIO_USUARIO, persona: b.persona, motivo: b.motivo, doc: b.doc, nroDoc: b.nroDoc,
        cant: b.cant, fechaReq: fmtFecha(b.fechaReq), prioridad: b.prioridad, obs: b.obs, origen: 'SIGESAPOL', estado: 'ENVIADA', hcs: b.hcs });
      S.correl++; S.borrador = null; S.vista = 'mis';
      aviso('Solicitud <b>' + b.id + '</b> enviada. Archivo la ve en su bandeja. <br><small>Cambie a «Unidad de Archivo de HC» para continuar el flujo.</small>');
      pintar();
    };
  }

  // ------------------------------------------------------------------ DEPARTAMENTO · Recepcionar HC
  function vistaRec() {
    var pend = mias().filter(function (s) { return s.estado === 'DESPACHADA'; });
    if (!S.sel && pend.length === 1) S.sel = pend[0].id;
    var s = S.sols.filter(function (x) { return x.id === S.sel && x.estado === 'DESPACHADA'; })[0];
    var lista = pend.map(function (p) {
      return '<tr' + (s && p.id === s.id ? ' class="nuevo"' : '') + '><td>' + p.ordenSal + '</td><td>' + p.id + '</td><td>' + p.motivo + '</td><td>' + p.fechaDesp + '</td><td>' + esc(p.despPor) +
        '</td><td style="text-align:center">' + p.hcs.filter(function (h) { return h.desp; }).length + ' de ' + p.cant + '</td><td><button class="btn sm g" data-abrir="' + p.id + '">Recepcionar</button></td></tr>';
    }).join('');
    var h = '<div class="bar">RECEPCIONAR HISTORIAS CLÍNICAS · ' + SERVICIO_USUARIO + '<span class="tag">nuevo</span></div><div class="box">' +
      '<div class="sub">HISTORIAS DESPACHADAS POR ARCHIVO, PENDIENTES DE RECEPCIÓN</div>' +
      '<table><tr><th>N° Orden de salida</th><th>N° Solicitud</th><th>Motivo</th><th>Fecha y hora de despacho</th><th>Despachado por</th><th>HC despachadas</th><th>Acción</th></tr>' +
      (lista || '<tr><td colspan="7" class="vacio">No hay historias por recepcionar.</td></tr>') + '</table>';
    if (s) {
      var desp = s.hcs.filter(function (x) { return x.desp; });
      var recib = desp.filter(function (x) { return x.rec; }).length;
      var dif = desp.length - recib;
      var filas = s.hcs.map(function (x, i) {
        if (!x.desp) return '<tr><td><input type="checkbox" disabled></td><td>' + esc(x.nro) + '</td><td>' + x.pac + '</td><td colspan="2" style="color:#8A6D3B"><b>Archivo no la envió:</b> ' + esc(x.motivoFalta || 'sin motivo') + (x.obsFalta ? ' · ' + esc(x.obsFalta) : '') + '</td></tr>';
        return '<tr><td><input type="checkbox" data-chk="' + i + '"' + (x.rec ? ' checked' : '') + '></td><td>' + esc(x.nro) + '</td><td>' + x.pac + '</td><td>' + s.motivo + '</td><td>' +
          (x.rec ? '<span class="st s-rec">RECIBIDA</span>' : '<span class="st s-dif">NO LLEGÓ</span>') + '</td></tr>';
      }).join('');
      h += '<div class="sub">1. DATOS DE LA SOLICITUD Y DEL DESPACHO</div>' +
        '<div class="row">' + campo('N° Solicitud', ro(s.id)) + campo('Motivo', ro(s.motivo)) + campo('Documento', ro(s.doc + (s.nroDoc ? ' · ' + s.nroDoc : ''))) + campo('Cant. HC solicitada', ro(s.cant), 'fh') +
          campo('N° Orden de salida', ro(s.ordenSal)) + campo('Despachado por (Archivo)', ro(s.despPor)) + campo('Fecha y hora de despacho', ro(s.fechaDesp)) + '</div>' +
        '<div class="sub">2. RECEPCIÓN</div>' +
        '<div class="row">' + campo('Responsable que recibe', '<select class="in" id="rResp">' + opts(PERSONAL, PERSONAL[0]) + '</select>', 'f2', true) +
          campo('Fecha y hora de recepción', ro(ahora())) + campo('Fecha de retorno prevista (opcional)', '<input class="in" type="date" id="rRet">') +
          campo('Cantidad recibida', '<input class="in" readonly id="rCant" value="' + recib + '" style="font-weight:700;font-size:14px">', 'fh', true) + '</div>' +
        '<div class="kpis"><div class="kpi"><div class="v">' + s.cant + '</div><div class="t">Solicitadas</div></div><div class="kpi"><div class="v">' + desp.length + '</div><div class="t">Despachadas por Archivo</div></div>' +
          '<div class="kpi ok"><div class="v">' + recib + '</div><div class="t">Recibidas</div></div><div class="kpi' + (dif ? ' alerta' : '') + '"><div class="v">' + dif + '</div><div class="t">Diferencia (no llegaron)</div></div></div>' +
        (desp.length < s.hcs.length ? '<div class="nota"><b>Archivo envió ' + desp.length + ' de ' + s.cant + ' HC.</b> ' + (s.obsDesp ? esc(s.obsDesp) + ' ' : '') + 'El motivo de cada HC que no se envió figura en la tabla.</div>' : '') +
        '<div style="display:flex;gap:8px;margin-bottom:4px"><button class="btn sm k" id="btnTodas">Marcar todas</button><button class="btn sm k" id="btnNinguna">Desmarcar todas</button></div>' +
        '<table><tr><th>Recibida</th><th>N° HC</th><th>Paciente</th><th>Motivo</th><th>Situación</th></tr>' + filas + '</table>' +
        '<div class="row" style="margin-top:8px">' + campo('Observación de la recepción', '<input class="in" id="rObs" placeholder="' + (dif ? 'Obligatoria: indique qué no llegó' : 'Opcional') + '">', 'f3', dif > 0) + '</div>' +
        '<div class="acciones"><button class="btn g" style="flex:1" id="btnConfirmar">Confirmar recepción de ' + recib + ' HC y descargar cargo (PDF)</button><button class="btn r" style="flex:.4" id="btnVolver">Volver</button></div>' +
        '<div class="leg">Se marca cada HC que llegó; la cantidad recibida se calcula sola. Si falta alguna, la observación es obligatoria y se avisa a Archivo. Desde la recepción empieza a contar el tiempo fuera.</div>';
    }
    h += '</div>';
    $('vista').innerHTML = h;
    enlazar('[data-abrir]', function (id) { S.sel = id; vistaRec(); flujo(); });
    if (!s) return;
    enlazar('[data-chk]', function (i, el) { s.hcs[+i].rec = el.checked; vistaRec(); }, 'change');
    $('btnTodas').onclick = function () { s.hcs.forEach(function (x) { if (x.desp) x.rec = true; }); vistaRec(); };
    $('btnNinguna').onclick = function () { s.hcs.forEach(function (x) { if (x.desp) x.rec = false; }); vistaRec(); };
    $('btnVolver').onclick = function () { S.sel = null; S.vista = 'mis'; pintar(); };
    $('btnConfirmar').onclick = function () {
      var desp = s.hcs.filter(function (x) { return x.desp; }), recib = desp.filter(function (x) { return x.rec; }).length, obs = $('rObs').value.trim();
      if (recib === 0) { aviso('Marque al menos una historia recibida.'); return; }
      if (recib < desp.length && !obs) { $('rObs').classList.add('err'); aviso('Hay diferencia: escriba la observación.'); return; }
      s.estado = recib < desp.length ? 'DIFERENCIA' : 'RECEPCIONADA';
      s.recibe = $('rResp').value; s.fechaRec = ahora(); s.cantRec = recib; s.obsRec = obs; s.fechaRetorno = $('rRet').value ? fmtFecha($('rRet').value) : null;
      S.sel = null; S.vista = 'mis';
      aviso('Recepción confirmada: ' + recib + ' de ' + desp.length + ' HC. Se generó el cargo (PDF)' + (s.estado === 'DIFERENCIA' ? ' y se avisó a Archivo de la diferencia.' : '.'));
      pintar();
    };
  }

  // ------------------------------------------------------------------ DEPARTAMENTO · Devolver HC (solicitud de retorno)
  var PLAZO = { 'CONSULTA': 0, 'JUNTA MÉDICA': 2, 'INFORME MÉDICO': 3, 'COPIA': 3, 'DESCANSO MÉDICO': 3, 'HOSPITALIZACIÓN': 20 };
  function aDate(t) { if (!t) return null; var p = t.split(' ')[0].split('-'); return new Date(+p[2], +p[1] - 1, +p[0]); }
  function fDate(d) { return ('0' + d.getDate()).slice(-2) + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + d.getFullYear(); }
  function enMiServicio() {
    var hoy = new Date(2026, 9, 12), out = [];
    mias().forEach(function (s) {
      if (['RECEPCIONADA', 'DIFERENCIA', 'DEV_PARCIAL'].indexOf(s.estado) < 0) return;
      var sal = aDate(s.fechaDesp), ret = s.fechaRetorno ? aDate(s.fechaRetorno) : new Date(sal.getTime() + (PLAZO[s.motivo] || 0) * 86400000);
      s.hcs.forEach(function (h, i) {
        if (h.desp && h.rec && !h.dev) out.push({ s: s, h: h, i: i, ret: ret, fuera: Math.round((hoy - sal) / 86400000), atraso: Math.max(0, Math.round((hoy - ret) / 86400000)) });
      });
    });
    return out;
  }
  function vistaDev() {
    S.retornos = S.retornos || [];
    var L = enMiServicio();
    var marcadas = L.filter(function (o) { return o.h.selRet && !o.h.retPend; }).length;
    var filas = L.map(function (o, n) {
      var est = o.h.retPend ? '<span class="st s-env">EN SOLICITUD DE RETORNO · ' + o.h.retPend + '</span>' : (o.atraso ? '<span class="st s-dif">VENCIDA · ' + o.atraso + ' día(s)</span>' : '<span class="st s-des">EN EL SERVICIO</span>');
      return '<tr' + (o.atraso && !o.h.retPend ? ' class="nuevo"' : '') + '><td><input type="checkbox" data-sr="' + n + '"' + (o.h.retPend ? ' disabled' : (o.h.selRet ? ' checked' : '')) + '></td><td>' + esc(o.h.nro) + '</td><td>' + o.h.pac + '</td><td>' + o.s.id + '</td><td>' + o.s.motivo +
        '</td><td>' + (o.s.fechaRec || '—') + '</td><td>' + fDate(o.ret) + '</td><td style="text-align:center">' + o.fuera + '</td><td>' + est + '</td></tr>';
    }).join('');
    var mis = S.retornos.filter(function (r) { return r.servicio === SERVICIO_USUARIO; });
    var ER = { POR_CONFIRMAR: ['s-env', 'POR CONFIRMAR EN ARCHIVO'], CONFIRMADA: ['s-rec', 'CONFIRMADA · INGRESADAS'], PARCIAL: ['s-dif', 'CONFIRMADA PARCIAL'] };
    $('vista').innerHTML =
      '<div class="bar">DEVOLVER HISTORIAS CLÍNICAS A ARCHIVO · ' + SERVICIO_USUARIO + '<span class="tag">nuevo</span></div><div class="box">' +
      '<div class="sub">1. HC EN MI SERVICIO (marque las que devolverá)</div>' +
      '<table><tr><th>Devolver</th><th>N° HC</th><th>Paciente</th><th>N° Solicitud</th><th>Motivo</th><th>Recepcionada</th><th>Retorno previsto</th><th>Días fuera</th><th>Situación</th></tr>' +
      (filas || '<tr><td colspan="9" class="vacio">No hay HC en su servicio.</td></tr>') + '</table>' +
      '<div class="sub">2. DATOS DE LA ENTREGA</div>' +
      '<div class="row">' + campo('N° Solicitud de retorno', ro('RET-2026-' + ('000000' + (S.nRet || 41)).slice(-6))) + campo('Persona que entrega', '<select class="in" id="dPers">' + opts(PERSONAL, PERSONAL[1]) + '</select>', 'f2', true) +
        campo('Fecha y hora de entrega', '<input class="in" type="datetime-local" id="dFecha" value="2026-10-12T16:30">', 'f', true) + campo('HC a devolver', ro(marcadas), 'fh') + campo('Observación', '<input class="in" id="dObs" placeholder="Ej. se entregan en la ventanilla de Archivo">', 'f3') + '</div>' +
      '<div class="acciones"><button class="btn g" style="flex:1" id="dEnviar"' + (marcadas ? '' : ' disabled') + '>Enviar solicitud de retorno a Archivo (' + marcadas + ' HC)</button></div>' +
      '<div class="sub" style="margin-top:14px">MIS SOLICITUDES DE RETORNO</div>' +
      '<table><tr><th>N° Retorno</th><th>Fecha de envío</th><th>N° Solicitud</th><th>Entrega</th><th>HC enviadas</th><th>HC confirmadas</th><th>Estado</th><th>N° Ingreso</th><th>Observación de Archivo</th></tr>' +
      (mis.map(function (r) {
        return '<tr><td>' + r.id + '</td><td>' + r.fecha + '</td><td>' + r.sol + '</td><td>' + esc(r.persona) + '</td><td style="text-align:center">' + r.idx.length + '</td><td style="text-align:center">' + (r.nConf == null ? '—' : r.nConf) +
          '</td><td><span class="st ' + ER[r.estado][0] + '">' + ER[r.estado][1] + '</span></td><td>' + (r.ingreso || '—') + '</td><td>' + esc(r.obsArc || '') + '</td></tr>';
      }).join('') || '<tr><td colspan="9" class="vacio">Aún no ha enviado solicitudes de retorno.</td></tr>') + '</table>' +
      '<div class="leg">La solicitud de retorno avisa a Archivo qué HC le llevarán; Archivo confirma cada HC al recibirla en «Ingreso de Historias». Hasta esa confirmación, las HC siguen a cargo del servicio. Si se marcan HC de varias solicitudes, se genera un retorno por cada una.</div></div>';
    enlazar('[data-sr]', function (n, el) { L[+n].h.selRet = el.checked; vistaDev(); }, 'change');
    $('dEnviar').onclick = function () {
      var sel = L.filter(function (o) { return o.h.selRet && !o.h.retPend; });
      if (!sel.length) return;
      var porSol = {}; sel.forEach(function (o) { (porSol[o.s.id] = porSol[o.s.id] || []).push(o); });
      var ids = [];
      Object.keys(porSol).forEach(function (sid) {
        var id = 'RET-2026-' + ('000000' + (S.nRet || 41)).slice(-6); S.nRet = (S.nRet || 41) + 1; ids.push(id);
        porSol[sid].forEach(function (o) { o.h.retPend = id; delete o.h.selRet; });
        S.retornos.unshift({ id: id, fecha: ahora(), sol: sid, servicio: SERVICIO_USUARIO, persona: $('dPers').value, entrega: $('dFecha').value.replace('T', ' '), obs: $('dObs').value.trim(),
          idx: porSol[sid].map(function (o) { return o.i; }), estado: 'POR_CONFIRMAR' });
      });
      aviso('Solicitud de retorno <b>' + ids.join(', ') + '</b> enviada (' + sel.length + ' HC). Archivo la verá en «Ingreso de Historias» para confirmar la recepción.<br><small>Cambie a «Unidad de Archivo de HC» → «Ingreso de Historias».</small>');
      pintar();
    };
  }

  // ------------------------------------------------------------------ ARCHIVO · Bandeja
  function vistaBandeja() {
    var c = function (e) { return cuenta(function (s) { return s.estado === e; }); };
    var orden = ['ENVIADA', 'EN_ATENCION', 'DIFERENCIA', 'DESPACHADA', 'RECEPCIONADA', 'DEV_PARCIAL', 'CERRADA'];
    var lista = S.sols.slice().sort(function (a, b) { return orden.indexOf(a.estado) - orden.indexOf(b.estado); });
    var filas = lista.map(function (s) {
      var acc = (s.estado === 'ENVIADA' || s.estado === 'EN_ATENCION') ? '<button class="btn sm g" data-atender="' + s.id + '">Atender</button>'
        : '<button class="btn sm k" data-ver="' + s.id + '">Ver</button>';
      return '<tr' + (s.estado === 'ENVIADA' ? ' class="nuevo"' : '') + '><td class="nw">' + s.id + '</td><td>' + s.fecha + '</td><td>' + s.servicio +
        (s.origen === 'SIGESAPOL' ? '<span class="orig">enviada por el servicio</span>' : '') + '</td><td>' + esc(s.persona) + '</td><td>' + s.motivo + '</td><td>' + s.doc + '</td><td style="text-align:center">' + s.cant +
        '</td><td>' + s.fechaReq + '</td><td>' + (s.prioridad === 'URGENTE' ? '<b style="color:#A94442">URGENTE</b>' : 'NORMAL') + '</td><td>' + st(s.estado) +
        (s.ordenSal && s.hcs.some(function (x) { return !x.desp; }) ? '<div style="font-size:10.5px;color:#8A6D3B;margin-top:2px">Enviadas ' + s.hcs.filter(function (x) { return x.desp; }).length + ' de ' + s.cant + ' (con motivo)</div>' : '') +
        (s.estado === 'DIFERENCIA' ? '<div style="font-size:10.5px;color:#A94442;margin-top:2px">Recibidas ' + s.cantRec + ' de ' + s.hcs.filter(function (x) { return x.desp; }).length + '</div>' : '') + '</td><td>' + acc + '</td></tr>';
    }).join('');
    $('vista').innerHTML =
      '<div class="bar">BANDEJA DE SOLICITUDES DE HISTORIAS CLÍNICAS</div><div class="box">' +
      '<div class="kpis"><div class="kpi alerta"><div class="v">' + c('ENVIADA') + '</div><div class="t">Nuevas enviadas por los servicios</div></div>' +
      '<div class="kpi"><div class="v">' + c('EN_ATENCION') + '</div><div class="t">En atención</div></div>' +
      '<div class="kpi"><div class="v">' + c('DESPACHADA') + '</div><div class="t">Despachadas, por recepcionar</div></div>' +
      '<div class="kpi ok"><div class="v">' + c('RECEPCIONADA') + '</div><div class="t">Recepcionadas</div></div>' +
      '<div class="kpi' + (c('DIFERENCIA') ? ' alerta' : '') + '"><div class="v">' + c('DIFERENCIA') + '</div><div class="t">Con diferencia</div></div></div>' +
      '<table><tr><th>N° Solicitud</th><th>Fecha y hora</th><th>Servicio</th><th>Solicitado por</th><th>Motivo</th><th>Documento</th><th>Cant. HC</th><th>Se requiere</th><th>Prioridad</th><th>Estado</th><th>Acción</th></tr>' + filas + '</table>' +
      '<div class="leg">Las solicitudes que el departamento envía desde SIGESAPOL llegan aquí directamente, con la etiqueta «enviada por el servicio». Archivo puede seguir registrando solicitudes (consulta del día, expedientes de Mesa de Partes) como hasta ahora.</div></div>';
    enlazar('[data-atender]', function (id) { despachar(id); });
    enlazar('[data-ver]', function (id) { verSolicitud(id); });
  }

  // ------------------------------------------------------------------ ARCHIVO · Atender y despachar (ventana emergente)
  var MOTIVOS_FALTA = ['PRESTADA A OTRO SERVICIO (queda en espera)', 'NO UBICADA EN SU LUGAR DE ARCHIVO', 'REQUIERE AUTORIZACIÓN (Pasivo / Fallecidos)',
                       'CARPETA DETERIORADA / EN REPARACIÓN', 'OTRO (detallar)'];
  function despachar(id) {
    var s = S.sols.filter(function (x) { return x.id === id; })[0];
    if (s.estado === 'ENVIADA') s.estado = 'EN_ATENCION';
    var leer = function () {
      s.hcs.forEach(function (x, i) {
        var m = $('mf' + i), o = $('of' + i);
        if (m) x.motivoFalta = m.value;
        if (o) x.obsFalta = o.value.trim();
      });
      if ($('obsDesp')) s.obsDesp = $('obsDesp').value.trim();
    };
    var pintarModal = function () {
      var ubic = s.hcs.filter(function (x) { return x.desp; }).length, faltan = s.hcs.length - ubic;
      var filas = s.hcs.map(function (x, i) {
        var h = '<tr' + (x.desp ? '' : ' class="nuevo"') + '><td><input type="checkbox" data-ub="' + i + '"' + (x.desp ? ' checked' : '') + '></td><td>' + esc(x.nro) + '</td><td>' + esc(x.dni) + '</td><td>' + x.pac + '</td><td>ARCHIVO ACTIVO</td><td>' +
          (x.desp ? '<span class="st s-rec">UBICADA</span>' : '<span class="st s-dif">NO SE ENVÍA</span>') + '</td></tr>';
        if (!x.desp) {
          h += '<tr class="nuevo"><td></td><td colspan="5"><div class="row" style="margin:0">' +
            campo('Motivo por el que no se envía', '<select class="in" id="mf' + i + '"><option value="">— Seleccione —</option>' + opts(MOTIVOS_FALTA, x.motivoFalta) + '</select>', 'f2', true) +
            campo('Observación', '<input class="in" id="of' + i + '" value="' + esc(x.obsFalta || '') + '" placeholder="' + (x.motivoFalta === 'OTRO (detallar)' ? 'Obligatoria: detalle el motivo' : 'Ej. prestada a Salud Mental desde el 29-09') + '">', 'f3', x.motivoFalta === 'OTRO (detallar)') + '</div></td></tr>';
        }
        return h;
      }).join('');
      $('modal').innerHTML = '<div class="bar">ATENDER Y DESPACHAR · ' + s.id + ' · ' + s.servicio + '</div><div class="box">' +
        '<div class="row">' + campo('Solicitado por', ro(s.persona), 'f2') + campo('Motivo', ro(s.motivo)) + campo('Documento', ro(s.doc + (s.nroDoc ? ' · ' + s.nroDoc : '')), 'f2') + campo('Cant. HC', ro(s.cant), 'fh') + campo('Se requiere', ro(s.fechaReq)) + '</div>' +
        '<div class="sub">UBICAR LAS HISTORIAS (marcar las encontradas)</div>' +
        '<div class="kpis"><div class="kpi"><div class="v">' + s.cant + '</div><div class="t">Solicitadas</div></div><div class="kpi ok"><div class="v">' + ubic + '</div><div class="t">Ubicadas (se envían)</div></div>' +
          '<div class="kpi' + (faltan ? ' alerta' : '') + '"><div class="v">' + faltan + '</div><div class="t">No se envían</div></div></div>' +
        '<table><tr><th>Ubicada</th><th>N° HC</th><th>DNI</th><th>Paciente</th><th>Lugar de archivo</th><th>Situación</th></tr>' + filas + '</table>' +
        (faltan ? '<div class="row" style="margin-top:8px">' + campo('Observación del despacho', '<input class="in" id="obsDesp" value="' + esc(s.obsDesp || '') + '" placeholder="Ej. Se envían ' + ubic + ' de ' + s.cant + ' HC; las restantes se enviarán cuando retornen.">', 'f3') + '</div>' : '') +
        '<div class="row" style="margin-top:8px">' + campo('N° Orden de salida', ro('OS-2026-' + ('000000' + S.orden).slice(-6))) + campo('Despachado por', ro('[archivero]')) + campo('Fecha y hora de despacho', ro(ahora())) + '</div>' +
        '<div class="acciones"><button class="btn g" style="flex:1" id="btnDesp">Despachar ' + ubic + ' de ' + s.cant + ' HC y generar cargo (PDF)</button><button class="btn k" style="flex:.4" id="btnCerrar">Cerrar</button></div>' +
        '<div class="leg">Si no se envían todas las HC solicitadas, cada HC que falta debe tener su <b>motivo</b>; el servicio lo ve al recepcionar y en «Mis solicitudes». Las HC prestadas quedan en espera y se envían cuando retornen.</div></div>';
      enlazar('[data-ub]', function (i, el) { leer(); s.hcs[+i].desp = el.checked; s.hcs[+i].rec = el.checked; if (el.checked) { delete s.hcs[+i].motivoFalta; delete s.hcs[+i].obsFalta; } pintarModal(); }, 'change', $('modal'));
      s.hcs.forEach(function (x, i) { if ($('mf' + i)) $('mf' + i).onchange = function () { leer(); pintarModal(); }; });
      $('btnCerrar').onclick = function () { leer(); cerrar(); };
      $('btnDesp').onclick = function () {
        leer();
        if (!s.hcs.some(function (x) { return x.desp; })) { aviso('Marque al menos una historia ubicada.'); return; }
        var sinMotivo = s.hcs.filter(function (x) { return !x.desp && (!x.motivoFalta || (x.motivoFalta === 'OTRO (detallar)' && !x.obsFalta)); });
        if (sinMotivo.length) {
          s.hcs.forEach(function (x, i) { if (!x.desp && $('mf' + i) && !x.motivoFalta) $('mf' + i).classList.add('err'); if (!x.desp && $('of' + i) && x.motivoFalta === 'OTRO (detallar)' && !x.obsFalta) $('of' + i).classList.add('err'); });
          aviso('Indique el motivo de las ' + sinMotivo.length + ' HC que no se envían.'); return;
        }
        s.estado = 'DESPACHADA'; s.ordenSal = 'OS-2026-' + ('000000' + S.orden).slice(-6); s.despPor = '[archivero]'; s.fechaDesp = ahora(); S.orden++;
        cerrar();
        var n = s.hcs.filter(function (x) { return x.desp; }).length;
        aviso('Orden <b>' + s.ordenSal + '</b> despachada: ' + n + ' de ' + s.cant + ' HC. ' + s.servicio + ' ya puede recepcionarla.' + (s.servicio === SERVICIO_USUARIO ? '<br><small>Cambie a «Departamento médico» → «Recepcionar HC».</small>' : ''));
      };
    };
    pintarModal();
    $('velo').classList.add('ver'); flujo();
  }
  function cerrar() { $('velo').classList.remove('ver'); pintar(); }

  // ------------------------------------------------------------------ ver detalle (ambos perfiles)
  function verSolicitud(id) {
    var s = S.sols.filter(function (x) { return x.id === id; })[0];
    var filas = s.hcs.map(function (x) {
      var sit = x.dev ? 'DEVUELTA A ARCHIVO' : ['RECEPCIONADA', 'DIFERENCIA', 'DEV_PARCIAL', 'CERRADA'].indexOf(s.estado) >= 0 ? (x.desp ? (x.rec ? 'RECIBIDA' : 'NO LLEGÓ') : 'NO DESPACHADA') : (s.estado === 'DESPACHADA' ? (x.desp ? 'DESPACHADA' : 'NO DESPACHADA') : 'PENDIENTE');
      if (!x.desp && x.motivoFalta) sit = 'NO ENVIADA POR ARCHIVO · ' + esc(x.motivoFalta) + (x.obsFalta ? ' · ' + esc(x.obsFalta) : '');
      return '<tr><td>' + esc(x.nro) + '</td><td>' + esc(x.dni) + '</td><td>' + x.pac + '</td><td>' + sit + '</td></tr>';
    }).join('');
    var rec = s.fechaRec ? '<div class="row">' + campo('Recibido por', ro(s.recibe), 'f2') + campo('Fecha de recepción', ro(s.fechaRec)) + campo('Cantidad recibida', ro(s.cantRec), 'fh') + campo('Observación', ro(s.obsRec || ''), 'f3') + '</div>' : '';
    $('modal').innerHTML = '<div class="bar">SOLICITUD ' + s.id + ' · ' + s.servicio + '<span class="tag" style="background:#fff;color:#333">' + ESTADOS[s.estado][1] + '</span></div><div class="box">' +
      '<div class="row">' + campo('Fecha', ro(s.fecha)) + campo('Solicitado por', ro(s.persona), 'f2') + campo('Motivo', ro(s.motivo)) + campo('Documento', ro(s.doc + (s.nroDoc ? ' · ' + s.nroDoc : '')), 'f2') + campo('Cant. HC', ro(s.cant), 'fh') + '</div>' +
      (s.ordenSal ? '<div class="row">' + campo('N° Orden de salida', ro(s.ordenSal)) + campo('Despachado por', ro(s.despPor)) + campo('Fecha de despacho', ro(s.fechaDesp)) + '</div>' : '') + rec +
      '<table><tr><th>N° HC</th><th>DNI</th><th>Paciente</th><th>Situación</th></tr>' + filas + '</table>' +
      '<div class="acciones"><button class="btn k" id="btnCerrar">Cerrar</button></div></div>';
    $('velo').classList.add('ver');
    $('btnCerrar').onclick = cerrar;
  }

  // ------------------------------------------------------------------ Reportes (reportes.js)
  function vistaRep() {
    window.Reportes.render({ rol: S.rol, servicio: SERVICIO_USUARIO, vista: $('vista'), esc: esc, campo: campo });
  }

  // ------------------------------------------------------------------ Opciones de Archivo (archivo.js)
  function ctxArchivo() {
    return { S: S, esc: esc, campo: campo, ro: ro, opts: opts, aviso: aviso, ahora: ahora, SERVICIOS: SERVICIOS, vista: $('vista'),
             ir: function (v) { S.vista = v; pintar(); }, cerrar: cerrar };
  }

  // ------------------------------------------------------------------ comunes
  function enlazar(sel, fn, ev, raiz) {
    Array.prototype.forEach.call((raiz || document).querySelectorAll(sel), function (el) {
      var attr = sel.replace(/[\[\]]/g, '');
      el['on' + (ev || 'click')] = function () { fn(el.getAttribute(attr), el); };
    });
  }

  function pintar() {
    $('lblUnidad').textContent = S.rol === 'dep' ? SERVICIO_USUARIO + ' · SOLICITUD Y RECEPCIÓN DE HISTORIAS CLÍNICAS' : 'UNIDAD DE ARCHIVOS Y REGISTROS MEDICOS';
    $('lblEstab').textContent = 'Hospital Nacional PNP Luis N. Sáenz · ' + (S.rol === 'dep' ? SERVICIO_USUARIO : 'Unidad de Archivo de HC');
    $('boxServ').style.display = S.rol === 'dep' ? '' : 'none';
    menu(); flujo();
    var arch = { areg: 1, ing: 1, seg: 1, bus: 1, nueva: 1 };
    if (arch[S.vista]) window.Archivo.render(S.vista, ctxArchivo());
    else ({ mis: vistaMis, reg: vistaReg, rec: vistaRec, dev: vistaDev, bandeja: vistaBandeja, rep: vistaRep })[S.vista]();
  }

  $('selRol').onchange = function () {
    S.rol = this.value; S.vista = S.rol === 'dep' ? 'mis' : 'bandeja'; S.sel = null;
    $('velo').classList.remove('ver'); pintar();
  };
  $('velo').onclick = function (e) { if (e.target === this) cerrar(); };
  $('selServ').innerHTML = opts(SERVICIOS, SERVICIO_USUARIO);
  $('selServ').onchange = function () {
    SERVICIO_USUARIO = this.value; personal(); S.borrador = null; S.sel = null;
    if (S.vista === 'reg') S.vista = 'mis';
    pintar();
  };

  window.Archivo.preparar(ctxArchivo());

  // permite abrir directamente una vista: index.html#dep-reg, #dep-rec, #arc-bandeja
  var m = /^#(dep|arc)-(\w+)$/.exec(location.hash);
  if (m) { S.rol = m[1]; S.vista = m[2]; $('selRol').value = m[1]; }
  pintar();
})();
