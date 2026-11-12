/* ---------- pantalla de atención (réplica de "Módulo de gestión de atenciones médicas") ---------- */
const TIPOS=["DEFINITIVO","REITERATIVO","PRESUNTIVO"];
const EXTRA={rosa:{siteds:"095446E4100T",par:"TITULAR",grado:"SUBOFICIAL DE PRIMERA",sit:"ACTIVIDAD"},carlos:{siteds:"071928E4100T",par:"TITULAR",grado:"CORONEL",sit:"RETIRO CON PENSIÓN"},maria:{siteds:"104588E4200C",par:"CÓNYUGE",grado:"—",sit:"—"},jorge:{siteds:"066551E4100T",par:"TITULAR",grado:"COMANDANTE",sit:"RETIRO CON PENSIÓN"},teresa:{siteds:"098771E4300M",par:"MADRE",grado:"—",sit:"—"}};
const TMAP={Definitivo:"DEFINITIVO",Repetitivo:"REITERATIVO",Presuntivo:"PRESUNTIVO"};
function habilita(c,t){return vig(c)&&(t==="DEFINITIVO"||t==="REITERATIVO")}
function L(label,val,w){return `<div class="sf ${w||""}"><label>${label}</label><input id="l${++uid}" value="${esc(val)}" readonly></div>`}
function band(t,body,open=true){return `<details class="band" ${open?"open":""}><summary>${t}</summary><div class="bin">${body}</div></details>`}
function TX(ph){return `<textarea id="tx${++uid}" placeholder="${esc(ph)}" rows="2"></textarea>`}
/* switch genérico (DERIVAR CONSULTA, PRESCRIBIR RECETA…): solo cambia de NO a SI */
function TOG(l){return `<button type="button" class="tog" role="switch" aria-checked="false" data-tog="1"><span>${l}</span><small>NO</small><i></i><small>SI</small></button>`}

/* ---------- estado de la atención (ambulatoria o alta) ---------- */
function initEsc(k){
  const e=ESC[k];
  if(st.esc!==k||st.reset){st.esc=k;st.reset=false;st.saved={};st.fon={};st.modal=null;st.dx=e.dx.map(([c,t])=>({c,t:TMAP[t]}));}
  return e;
}
/* diagnóstico que habilita la ficha del tipo t (dm|ca): CIE-10 del catálogo SIGESAPOL (Excel) + DEFINITIVO/REITERATIVO */
function dxFicha(t){return st.dx.find(x=>vig(x.c)===t&&habilita(x.c,x.t))}
function fichasPendientes(){const fs=FICHAS[ESC[st.esc].pac]||{};return ["dm","ca"].filter(t=>dxFicha(t)&&!fs[t]&&!st.saved[t])}
function dxRows(){
  return st.dx.map((d,i)=>{
    const v=vig(d.c), ok=habilita(d.c,d.t), nom=v==="dm"?"diabetes":"cáncer";
    let ficha="";
    if(v&&ok) ficha=`<span class="fnote hab ${v}">✔ CIE-10 del catálogo de ${nom}: habilita el switch <b>FICHA EPIDEMIOLÓGICA DE ${nom.toUpperCase()}</b>.</span>`;
    else if(v&&d.t==="PRESUNTIVO") ficha=`<span class="fnote">Diagnóstico presuntivo: no habilita la ficha de ${nom}.</span>`;
    else if(v&&!d.t) ficha=`<span class="fnote">Seleccione el tipo para habilitar la ficha de ${nom}.</span>`;
    return `<div class="dxrow"><div class="sf dxin"><label>Diagnóstico</label>${I(d.c?d.c+" "+(DESC[d.c]||""):"",{id:"dx"+i,ac:"cie",data:`data-row="${i}"`})}</div>
      <div class="sf dxt"><label>Tipo</label><select id="dt${i}" data-tipo="${i}"><option value="">--Seleccionar--</option>${TIPOS.map(t=>`<option ${t===d.t?"selected":""}>${t}</option>`).join("")}</select></div>
      <button class="bdel" data-del="${i}">✖ Eliminar</button>${ficha?`<div class="dxf">${ficha}</div>`:""}</div>`}).join("");
}
/* switch FICHA EPIDEMIOLÓGICA: deshabilitado hasta que un diagnóstico lo habilite; al activarlo se despliega la ficha */
function fichaSw(t){
  const e=ESC[st.esc], p=PAC[e.pac], f=(FICHAS[e.pac]||{})[t], d=dxFicha(t), on=!!(d&&st.fon[t]), sv=st.saved[t];
  const nom=t==="dm"?"DIABETES":"CÁNCER", nm=t==="dm"?"diabetes":"cáncer";
  const est=!d?`Se habilita con un CIE-10 de ${nm} del catálogo SIGESAPOL, tipo DEFINITIVO o REITERATIVO`
    :sv?`<b class="ok">Ficha guardada ✔</b>`:f?`Ficha Nº ${f.num} registrada · ${t==="dm"?"registrar seguimiento":"actualizar"}`:`<b class="no">Ficha nueva · pendiente de registro</b>`;
  let body="";
  if(d){
    body=t==="dm"?fichaDM({tri:e.tri,lab:e.lab,meds:e.meds,nofoot:1},p,d.c,f):fichaCA({fallece:e.fallece},p,d.c,f,e.serv);
    body=body.replace(/<div class="foot">[\s\S]*<\/div><\/div>$/,"</div>");
    body=`<div class="mnote ${f?"upd":"new"}">${esc(d.c)} · ${esc(DESC[d.c]||"")} · ${d.t}. ${f?`El paciente ya tiene la ficha Nº ${f.num}. ${t==="dm"?"Complete las secciones II y III (seguimiento).":"Solo actualice los datos que cambiaron."}`:`El paciente no tiene ficha de ${nm} registrada. Complete los datos de la ficha.`}</div>${body}
      <div class="foot"><span class="st">${sv?"Ficha guardada en esta atención.":""}</span><button class="btn" data-fsave="${t}">${f?(t==="dm"?"Guardar seguimiento":"Guardar actualización"):"Guardar ficha"}</button></div>`;
  }
  return `<div class="fsw ${t}${d?"":" dis"}" id="fsw-${t}">
    <button type="button" class="tog tsw${on?" on":""}" role="switch" aria-checked="${on}" data-fsw="${t}" ${d?"":"disabled"}><span>FICHA EPIDEMIOLÓGICA DE ${nom}</span><small>NO</small><i></i><small>SI</small><em>${est}</em></button>
    <div class="fbody"${on?"":" hidden"}>${body}</div></div>`;
}
function pantAtencion(k){
  const e=initEsc(k), p=PAC[e.pac], x=EXTRA[e.pac], rows=dxRows();
  return `<div class="htabs"><span class="on">NUEVA ATENCIÓN</span><span>HIST. ATENCIONES</span><span>HIST. EXÁMENES DE LABORATORIO</span><span>HIST. EXÁMENES DE IMAGENOLOGÍA</span><span>HIST. INTERCONSULTA</span><span>HIST. REFERENCIAS / CONTRARREFERENCIAS</span></div>
  <section class="panel"><div class="ph" style="padding-left:12px">MÓDULO DE GESTIÓN DE ATENCIONES MÉDICAS</div><div class="pb">
   <div class="sgrid">${L("TIPO DE ATENCIÓN",e.tipo==="Cita"?"CITA":"AMBULATORIO")}${L("MODALIDAD","Presencial")}${L("SERVICIO",e.serv)}${L("CONSULTORIO",e.cons)}${L("Nº HISTORIA CLÍNICA",p.hc)}${L("FECHA DE ATENCIÓN",HOY.replace(/\//g,"-"))}${L("CÓDIGO UPSS","222500 - CONSULTA EXTERNA")}${L("NOMBRE DE LA IPRESS","HOSPITAL NACIONAL PNP LUIS N. SAENZ")}</div>
   ${band("INFORMACIÓN DEL PACIENTE",`<div class="sgrid">${L("TIPO DE DOCUMENTO DE IDENTIDAD","DNI")}${L("Nº DE DOCUMENTO DE IDENTIDAD",p.dni)}${L("COD. SITEDS SUSALUD",x.siteds)}${L("SEXO",p.sexo.startsWith("1")?"M":"F")}${L("PARENTESCO",x.par)}${L("APELLIDO PATERNO",p.ap)}${L("APELLIDO MATERNO",p.am)}${L("NOMBRES",p.nom)}${L("FECHA DE NACIMIENTO",p.fn)}${L("GRADO",x.grado)}${L("SITUACIÓN",x.sit)}${L("TELÉFONO",p.cel)}${L("DOMICILIO",p.dir,"w2")}</div>`)}
   ${band("INFORMACIÓN DEL RESPONSABLE DE ATENCIÓN",`<div class="sgrid">${L("TIPO DE DOCUMENTO DE IDENTIDAD","DNI")}${L("Nº DE DOCUMENTO DE IDENTIDAD","41871715")}${L("APELLIDOS Y NOMBRES","ARANA PEÑA, LUIS","w2")}${L("Nº COLEGIATURA","045812")}${L("ESPECIALIDAD",e.serv)}</div>`,false)}
   ${band("ANTECEDENTES",`<div class="sf"><label>ANTECEDENTES</label>${TX("Antecedentes")}</div>`,false)}
   ${band("ANAMNESIS",`<div class="sf"><label>MOTIVO DE VISITA</label>${TX("Relato médico del motivo de la visita")}</div>`,false)}
   ${band("EXAMEN CLÍNICO",`<div class="sf"><label>EXAMEN FÍSICO</label>${TX("Examen físico")}</div>`,false)}
   ${band("TRATAMIENTO Y/O TERAPÉUTICA",`<div class="sf"><label>TRATAMIENTO AUXILIAR</label>${TX("Tratamiento auxiliar")}</div>`,false)}
   <details class="band dxband" open><summary>DIAGNÓSTICOS</summary><div class="bin">
     <button class="bverde" id="dxAdd">Agregar Diagnóstico</button>
     <div class="dxlist">${rows}</div>
     <p class="dxhelp">Si el CIE-10 pertenece al catálogo de cáncer o diabetes de SIGESAPOL y el tipo es <b>DEFINITIVO</b> o <b>REITERATIVO</b>, se habilita el switch de la ficha epidemiológica. Proceso ambulatorio.</p>
     <div class="togs">${fichaSw("dm")}${fichaSw("ca")}</div>
   </div></details>
   ${band("PROCEDIMIENTOS REALIZADOS EN LA ATENCIÓN",`<button class="bverde">Agregar Procedimiento</button>`,false)}
   ${band("PLAN DE TRABAJO",`<div class="sf"><label>PLAN DE TRABAJO</label>${TX("Plan de trabajo")}</div>`,false)}
   <div class="togs">${TOG("DERIVAR CONSULTA")}${TOG("REGISTRAR CITA")}${TOG("PRESCRIBIR RECETA")}${TOG("INTERVENCIÓN QUIRÚRGICA")}</div>
   <div class="acts" style="margin-top:14px"><button class="btn out">Guardar</button><button class="btn" id="fin">Finalizar atención</button></div>
  </div></section>`;
}
function renderModal(){
  const m=$("#modal"); if(!st.modal||!st.pant.startsWith("esc")){m.innerHTML="";m.hidden=true;document.body.classList.remove("noscroll");return}
  const e=ESC[st.esc],p=PAC[e.pac],fs=FICHAS[e.pac]||{},t=st.modal,f=fs[t];
  const d=st.dx.find(x=>vig(x.c)===t&&habilita(x.c,x.t)); if(!d){st.modal=null;return renderModal()}
  let body=t==="dm"?fichaDM({tri:e.tri,lab:e.lab,meds:e.meds},p,d.c,f):fichaCA({fallece:e.fallece},p,d.c,f,e.serv);
  body=body.replace(/<div class="foot">[\s\S]*<\/div><\/div>$/,"</div>");
  const nom=t==="dm"?"Diabetes":"Cáncer";
  const tit=t==="dm"?(f?"Ficha de seguimiento de Diabetes":"Ficha epidemiológica de Diabetes"):(f?"Ficha epidemiológica de Cáncer · actualizar":"Ficha epidemiológica de Cáncer");
  const otro=st.dx.some(x=>vig(x.c)&&vig(x.c)!==t&&habilita(x.c,x.t));
  m.innerHTML=`<div class="mdlg" role="dialog" aria-modal="true" aria-labelledby="mt"><div class="mhead"><span id="mt">${tit}</span><span class="msub">${esc(d.c)} · ${esc(DESC[d.c]||"")} · ${d.t}</span><button class="mx" data-close="1" aria-label="Cerrar">✕</button></div>
   <div class="mbody">${f?`<div class="mnote upd">El paciente ya tiene la ficha Nº ${f.num}. ${t==="dm"?"Registre el seguimiento: complete las secciones II. Fecha de control y datos clínicos y III. Datos de laboratorio.":"Solo actualice los datos que cambiaron en esta atención."}</div>`:`<div class="mnote new">El paciente no tiene ficha de ${nom.toLowerCase()} registrada. Complete los datos de la ficha.</div>`}${body}</div>
   <div class="mfoot"><span class="st">${otro?"Al guardar se abrirá la otra ficha habilitada en esta atención.":""}</span><button class="btn out" data-close="1">Cancelar</button><button class="btn" data-save="1">${f?(t==="dm"?"Guardar seguimiento":"Guardar actualización"):"Guardar ficha"}</button></div></div>`;
  m.hidden=false; document.body.classList.add("noscroll"); m.querySelector(".mdlg").scrollTop=0;
  bindForm(m);
  m.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>{st.modal=null;keep()});
  m.querySelectorAll("[data-save]").forEach(b=>b.onclick=()=>{
    const fin=b.dataset.save==="1"; if(fin) st.saved[t]=true;
    toast(fin?(f?(t==="dm"?`Seguimiento registrado en la ficha ${f.num}.`:`Ficha ${f.num} actualizada${e.fallece?"; caso cerrado por fallecimiento":""}.`):`Ficha de ${nom.toLowerCase()} registrada.`):"Borrador guardado.");
    const sig=st.dx.find(x=>vig(x.c)&&vig(x.c)!==t&&habilita(x.c,x.t)&&!st.saved[vig(x.c)]);
    st.modal=fin&&sig?vig(sig.c):null; keep()});
}

/* ---------- módulo de Epidemiología (personal administrativo) ---------- */
function registro(t){const out=[];for(const k of Object.keys(FICHAS))for(const x of ["ca","dm"]){const f=FICHAS[k][x];if(f&&!st.del[k+":"+x]&&(!t||t===x))out.push({id:k+":"+x,k,t:x,f,p:PAC[k]})}return out.sort((a,b)=>a.f.num<b.f.num?1:-1)}
const ACC=r=>`<td class="ic"><div class="acc4"><button class="bx ver" data-act="ver" data-id="${r.id}" title="Ver">👁 Ver</button><button class="bx edi" data-act="editar" data-id="${r.id}" title="Editar">✎ Editar</button><button class="bx eli" data-act="eliminar" data-id="${r.id}" title="Eliminar">🗑 Eliminar</button><button class="bx imp" data-act="imprimir" data-id="${r.id}" title="Imprimir">🖨 Imprimir</button></div></td>`;
const chipT=t=>`<span class="chip ${t==="dm"?"c-dm":"c-ca"}">${t==="dm"?"DIABETES":"CÁNCER"}</span>`;
function filtra(list){const q=st.q;return list.filter(r=>(!q.doc||r.p.dni.includes(q.doc))&&(!q.nom||nomc(r.p).toLowerCase().includes(q.nom.toLowerCase()))&&(!q.tipo||(q.tipo==="Cáncer"?r.t==="ca":r.t==="dm"))&&(!q.tcaso||(r.t==="dm"&&r.f.tcaso===q.tcaso))&&(!q.status||(r.t==="ca"&&r.f.status===q.status)))}
function detalle(){
  const r=registro().find(x=>x.id===st.sel.id); if(!r) return "";
  const {p,f,t}=r, ed=st.sel.mode==="editar";
  const hist=t==="dm"?`<table><thead><tr><th>Fecha</th><th>Registro</th><th>HbA1c %</th><th>Usuario</th></tr></thead><tbody>${f.segs.map(s=>`<tr><td>${s[0]}</td><td>${s[1]}</td><td>${s[2]}</td><td>DR. LUIS ARANA</td></tr>`).join("")}</tbody></table>`
                   :`<table><thead><tr><th>Fecha</th><th>Actualización</th><th>Usuario</th></tr></thead><tbody>${f.hlog.map(h=>`<tr><td>${h[0]}</td><td>${h[1]}</td><td>${h[2]||"DR. LUIS ARANA"}</td></tr>`).join("")}</tbody></table>`;
  let ficha=t==="dm"?fichaDM({mode:ed?"edit":"ro",nofoot:1},p,"E11.9",f):fichaCA({ro:!ed},p,f.dxcli,f,f.serv);
  ficha=ficha.replace(/<div class="foot">[\s\S]*<\/div><\/div>$/,"</div>");
  return `<div class="detbox" id="det"><div class="dethead"><b>${esc(nomc(p))}</b> · DNI ${p.dni} · HC ${p.hc} ${chipT(t)} <span class="chip c-ok">FICHA ${f.num}</span><span class="dmode ${ed?"e":"v"}">${ed?"MODO EDICIÓN":"MODO LECTURA"}</span>
     <span class="dact">${ed?"":`<button class="btn sm out" data-act="editar" data-id="${r.id}">✎ Editar</button>`}<button class="btn sm out" data-act="imprimir" data-id="${r.id}">🖨 Imprimir</button><button class="btn sm out" data-act="cerrar">Cerrar</button></span></div>
   ${ed?`<div class="mnote upd" style="margin:10px 0">Edición por Epidemiología: los cambios quedan registrados con su usuario y la fecha en el historial de la ficha.</div>`:""}
   <details class="sec" style="border:1px solid var(--linea);margin:10px 0" ${ed?"":"open"}><summary>Historial de la ficha</summary><div class="in"><div class="tw">${hist}</div></div></details>
   ${ficha}
   ${ed?`<div class="foot" style="border:1px solid var(--linea);border-top:0"><span class="st"></span><button class="btn out" data-act="ver" data-id="${r.id}">Cancelar</button><button class="btn" data-act="guardar" data-id="${r.id}">Guardar cambios</button></div>`:""}</div>`;
}
function pantSeg(){
  const list=filtra(registro()), q=st.q;
  return `<section class="panel"><div class="ph"><span class="bdg">EPI</span>Epidemiología · Monitoreo y seguimiento de casos<span class="sp">Personal administrativo de Epidemiología</span></div><div class="pb">
   <div class="grid">${F("Nº documento",I(q.doc,{id:"qdoc"}))}${F("Apellidos y nombres",I(q.nom,{id:"qnom"}),{w:"w2"})}${F("Tipo de diagnóstico",S(["Cáncer","Diabetes"],q.tipo,{id:"qtipo"}))}${F("Tipo de caso (diabetes)",S(C.tcaso,q.tcaso,{id:"qtcaso"}))}${F("Status (cáncer)",S(C.status,q.status,{id:"qstatus"}))}<div class="f" style="flex-direction:row;gap:6px"><button class="btn" id="qbtn">🔍 Buscar</button><button class="btn out" id="qclr">Limpiar</button></div></div>
   <div class="tw" style="margin-top:12px"><table><thead><tr><th>Nº ficha</th><th>Diagnóstico</th><th>DNI</th><th>Paciente</th><th>Tipo de caso / Status</th><th>Servicio</th><th>Último registro</th><th>Acciones</th></tr></thead><tbody>
   ${list.map(r=>`<tr class="${st.sel&&st.sel.id===r.id?"sel":""}"><td><b>${r.f.num}</b></td><td>${chipT(r.t)}</td><td>${r.p.dni}</td><td>${esc(nomc(r.p))}</td><td>${r.t==="dm"?r.f.tcaso:r.f.status}</td><td>${r.f.serv}</td><td>${r.f.ult}</td>${ACC(r)}</tr>`).join("")||`<tr><td colspan="8" style="text-align:center;color:var(--tenue)">Ningún caso coincide con la búsqueda</td></tr>`}
   </tbody></table></div><p style="font-size:11.5px;color:var(--tenue);margin:6px 0 0">Mostrando ${list.length} fichas.</p>
   ${st.sel?detalle():""}
  </div></section>`;
}
function pantBandeja(t){
  const ca=t==="ca", list=filtra(registro(t)), q=st.q;
  return `<section class="panel"><div class="ph"><span class="bdg">EPI</span>Epidemiología · Casos de ${ca?"cáncer":"diabetes"}<span class="sp">Personal administrativo de Epidemiología</span></div><div class="pb">
  <div class="grid">${F("Nº documento",I(q.doc,{id:"qdoc"}))}${F("Apellidos y nombres",I(q.nom,{id:"qnom"}),{w:"w2"})}${ca?F("Status",S(C.status,q.status,{id:"qstatus"})):F("Tipo de caso",S(C.tcaso,q.tcaso,{id:"qtcaso"}))}${F("Fecha desde",D("01/01/2026"))}${F("Fecha hasta",D(HOY))}<div class="f" style="flex-direction:row;gap:6px"><button class="btn" id="qbtn">🔍 Buscar</button><button class="btn out" id="qclr">Limpiar</button></div></div>
  <div class="tw" style="margin-top:12px"><table><thead><tr><th>Nº ficha</th><th>DNI</th><th>Paciente</th>${ca?"<th>Topografía</th><th>Estadio</th><th>Status</th><th>Último control</th>":"<th>Tipo de diabetes</th><th>Tipo de caso</th><th>Estado del caso</th><th>Último registro</th><th>Registros 2026</th>"}<th>Acciones</th></tr></thead><tbody>
  ${list.map(r=>{const f=r.f;return `<tr><td><b>${f.num}</b></td><td>${r.p.dni}</td><td>${esc(nomc(r.p))}</td>${ca?`<td>${f.top} · ${esc(TOPD[f.top]||"")}</td><td>${f.et}</td><td>${f.status}</td><td>${f.ult}</td>`:`<td>${f.tdm}</td><td>${f.tcaso}</td><td>${f.estado}</td><td>${f.ult}</td><td>${f.segs.length}</td>`}${ACC(r)}</tr>`}).join("")||`<tr><td colspan="9" style="text-align:center;color:var(--tenue)">Ningún caso coincide con la búsqueda</td></tr>`}
  </tbody></table></div></div></section>`;
}
function accion(act,id){
  if(act==="imprimir") return abrirImpresion(id);
  if(act==="eliminar") return abrirEliminar(id);
  if(act==="cerrar"){st.sel=null;return keep()}
  if(act==="guardar"){const r=registro().find(x=>x.id===id);(r.t==="dm"?r.f.segs:r.f.hlog).push(r.t==="dm"?[HOY,"Corrección por Epidemiología",r.f.lab.hba||"—"]:[HOY,"Corrección por Epidemiología","LIC. EPIDEMIOLOGÍA"]);if(r.t==="ca")r.f.hlog[r.f.hlog.length-1]=[HOY,"Corrección por Epidemiología","LIC. EPIDEMIOLOGÍA"];r.f.ult=HOY;st.sel={id,mode:"ver"};toast("Cambios guardados en la ficha "+r.f.num+".");return keep()}
  st.sel={id,mode:act};
  if(location.hash!=="#epi-seg"){location.hash="epi-seg";return}
  render();const d=$("#det");if(d)d.scrollIntoView({block:"start"});
}
const REP={ca:"Ficha epidemiológica de cáncer",dm:"Ficha epidemiológica de diabetes",seg:"Ficha de seguimiento de diabetes"};
function pantExport(){
  const cols=CAT.fmt[st.rep+"_"+st.dest]||[];
  return `<section class="panel"><div class="ph"><span class="bdg">EPI</span>Epidemiología · Exportar reportes<span class="sp">Formatos en Excel</span></div><div class="pb">
  <div class="grid">${F("Reporte",S(Object.values(REP),REP[st.rep],{id:"repSel",ph:false}),{req:1,w:"w2"})}${F("Formato",S(["Para el MINSA (CDC)","Para Epidemiología HN PNP"],st.dest==="minsa"?"Para el MINSA (CDC)":"Para Epidemiología HN PNP",{id:"destSel",ph:false}),{req:1,w:"w2"})}${st.rep==="dm"?F("Tipo de caso",S(C.tcaso,"",{}),{hint:"Vacío: nuevos y prevalentes"}):st.rep==="ca"?F("Status",S(C.status,""),{hint:"Vacío: todos"}):""}${F("Fecha desde",D("01/01/2026"))}${F("Fecha hasta",D("30/09/2026"))}</div>
  <div class="acts" style="margin-top:12px"><button class="btn claro" data-ok="Se descargaría ${REP[st.rep].toUpperCase()} (${st.dest==="minsa"?"MINSA":"HN PNP"}) con ${cols.length} columnas.">⬇ Exportar a Excel</button></div>
  <p style="font-size:12px;color:var(--tenue);margin:12px 0 6px">${st.dest==="minsa"?"Incluye solo los campos que pide el MINSA; las columnas de numeración del MINSA van en blanco.":"Igual al formato del MINSA, más condición, grado y situación del asegurado."} ${cols.length} columnas.</p>
  <details class="sec" style="border:1px solid var(--linea)"><summary>Ver columnas del formato</summary><div class="in"><div class="colgrid">${cols.map(c=>`<span>${esc(c[0])}</span>`).join("")}</div></div></details>
  </div></section>`;
}


/* ---------- Consulta Externa · Lista de citas médicas (réplica de la pantalla de SIGESAPOL) ---------- */
const ICO={
 edit:'<svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M2 3h7v1.5H3.5v8h8V9H13v5H2zM12.3 1.3l2.4 2.4-6.4 6.4H5.9V7.7z"/></svg>',
 lupa:'<svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M6.5 1a5.5 5.5 0 0 1 4.4 8.8l3.9 3.9-1.1 1.1-3.9-3.9A5.5 5.5 0 1 1 6.5 1zm0 1.6a3.9 3.9 0 1 0 0 7.8 3.9 3.9 0 0 0 0-7.8z"/></svg>',
 xls:'<svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M3 1h7l3 3v11H3zm1.3 1.3v11.4h7.4V4.6H9.4V2.3zm1.2 4.2h1.6l1 1.7 1-1.7h1.6L8.9 9.2l1.8 2.8H9.1L8 10.2 6.9 12H5.3l1.8-2.8z"/></svg>'
};
const CQ0={fd:"06-11-2026",fh:"06-11-2026",rd:"",rh:"",upss:"",doc:"",nom:"",serv:"",cons:"",estado:"Programado"};
function citaPac(c){return typeof c.pac==="string"?PAC[c.pac]:c.pac}
function filasCitas(){
  const q=st.qc||CQ0, num=s=>{const m=String(s||"").match(/(\d{2})[\/-](\d{2})[\/-](\d{4})/);return m?+(m[3]+m[2]+m[1]):null};
  const enRango=(v,a,b)=>{const x=num(v),d=num(a),h=num(b);return x===null||((d===null||x>=d)&&(h===null||x<=h))};
  return CITAS.filter(c=>{const p=citaPac(c);
    return enRango(c.fc,q.fd,q.fh)&&enRango(c.fr,q.rd,q.rh)&&(!q.upss||c.upss===q.upss)&&(!q.doc||p.dni.includes(q.doc))
      &&(!q.nom||nomc(p).toLowerCase().includes(q.nom.toLowerCase()))&&(!q.serv||c.serv===q.serv)&&(!q.cons||c.cons===q.cons)&&(!q.estado||c.estado===q.estado)});
}
function chipsFicha(c){
  if(typeof c.pac!=="string")return "";
  const fs=FICHAS[c.pac]||{};
  return ["dm","ca"].filter(t=>fs[t]).map(t=>`<span class="chip ${t==="dm"?"c-dm":"c-ca"}" title="Ficha epidemiológica ${fs[t].num}">${t==="dm"?"DM":"CA"} ${fs[t].num}</span>`).join(" ");
}
function pantCitas(){
  const q=st.qc||CQ0, rows=filasCitas(), uniq=k=>[...new Set(CITAS.map(c=>c[k]))].sort();
  const sel=(id,opts,v,ph)=>`<div class="inp"><select id="${id}">${ph?`<option value="">${ph}</option>`:""}${opts.map(o=>`<option ${o===v?"selected":""}>${esc(o)}</option>`).join("")}</select></div>`;
  const inp=(id,v,ph)=>`<div class="inp"><input id="${id}" value="${esc(v)}" placeholder="${esc(ph||"")}"></div>`;
  const tr=rows.map(c=>{const p=citaPac(c),x=(typeof c.pac==="string"&&EXTRA[c.pac])||{};
    return `<tr class="${c.estado==="Anulado"?"anul":""}"><td>${c.cod}</td><td>${c.fc}</td><td>${c.hc.replace(" ","<br>")}</td><td>${c.fr}</td><td>${c.ht||""}</td><td>DNI</td><td>${p.dni}</td><td>${p.hc}</td>
     <td>${esc(nomc(p))}${chipsFicha(c)?`<div class="cf">${chipsFicha(c)}</div>`:""}</td><td>${p.cel||""}</td><td>${p.tel2||""}</td><td>${esc(c.resp)}</td><td>${esc(c.serv)}</td><td>${esc(c.med)}</td><td>${esc(c.cons)}</td><td>${c.tipo}</td><td>${c.ref}</td>
     <td class="ic"><button class="bi verde" data-siteds="${c.cod}" title="Cod SITEDS: ${esc(x.siteds||"consultar en SUSALUD")}" aria-label="Ver código SITEDS">${ICO.edit}</button></td>
     <td>${c.estado==="Programado"?"":esc(c.estado)}</td><td>${c.presente||""}</td>
     <td class="ic"><button class="bi gris" data-vercita="${c.cod}" title="Ver detalle de la cita" aria-label="Ver detalle de la cita">${ICO.lupa}</button></td>
     <td class="ic"><button class="bi verde" data-atender="${c.cod}" title="Atender" aria-label="Atender" ${c.estado==="Programado"?"":"disabled"}>${ICO.edit}</button></td></tr>`}).join("");
  return `<section class="panel"><div class="ph"><span class="bdg">CE</span>Lista Citas Medicas - Hospital Nacional PNP Luis N. Saenz</div><div class="pb citas">
   <div class="cgrid">
    ${F("Fecha Cita Desde",inp("cfd",q.fd,"Fecha Cita Desde"))}${F("Fecha Cita Hasta",inp("cfh",q.fh,"Fecha Cita Hasta"))}${F("Fecha Registro Desde",inp("crd",q.rd,"Fecha Registro Desde"))}${F("Fecha Registro Hasta",inp("crh",q.rh,"Fecha Registro Hasta"))}
    ${F("Condición UPSS",sel("cupss",uniq("upss"),q.upss,"-Todos-"))}<div class="f cbtn"><button class="btn claro" id="cexp">${ICO.xls} Exportar</button></div>
    ${F("Nro. Documento",inp("cdoc",q.doc))}${F("Nombres",inp("cnom",q.nom))}${F("Servicio",sel("cserv",uniq("serv"),q.serv,"-Seleccionar-"))}${F("Consultorio",sel("ccons",uniq("cons"),q.cons,"-Seleccionar-"))}
    ${F("Estado",sel("cest",["Programado","Atendido","Anulado"],q.estado,"-Todos-"))}<div class="f cbtn"><button class="btn gris" id="cbus">Buscar</button></div>
   </div>
   <div class="tw ctab"><table><thead><tr><th>Cod</th><th>Fecha Cita</th><th>Hora Cita</th><th>Fecha Registro</th><th>Hora Ticket</th><th>Tipo Doc</th><th>Numero Doc</th><th>Numero Historia</th><th>Paciente</th><th>Teléfono1</th><th>Teléfono2</th><th>Respons. Cita</th><th>Servicio</th><th>Medico</th><th>Consultorio</th><th>Tipo Cita</th><th>Referido</th><th>Cod SITEDS</th><th>Estado</th><th>Presente</th><th>Observación</th><th>Atender</th></tr></thead><tbody>
   ${tr||`<tr><td colspan="22" style="text-align:center;color:var(--tenue)">No se encontraron citas con los filtros seleccionados</td></tr>`}
   </tbody></table></div>
   <p class="cpie">Mostrando ${rows.length} de ${CITAS.length} citas. Los chips <span class="chip c-dm">DM</span> / <span class="chip c-ca">CA</span> indican que el paciente ya tiene ficha epidemiológica; <b>Atender</b> abre el Módulo de gestión de atenciones médicas.</p>
  </div></section>`;
}
function verCita(cod){
  const c=CITAS.find(x=>x.cod===cod),p=citaPac(c),x=(typeof c.pac==="string"&&EXTRA[c.pac])||{},m=$("#prn");
  m.innerHTML=`<div class="mdlg" role="dialog" aria-modal="true" aria-label="Detalle de la cita" style="width:min(760px,100%)"><div class="mhead"><span>Cita Nº ${c.cod}</span><span class="msub">${esc(nomc(p))}</span><button class="mx" data-pc="1" aria-label="Cerrar">✕</button></div>
   <div class="mbody">${kv([["Fecha cita",c.fc+" "+c.hc],["Fecha registro",c.fr],["Estado",c.estado],["Tipo de documento","DNI"],["Nº documento",p.dni],["Nº historia clínica",p.hc],["Teléfono",p.cel],["Cod SITEDS",x.siteds],["Servicio",c.serv],["Consultorio",c.cons],["Médico",c.med],["Responsable de la cita",c.resp],["Tipo de cita",c.tipo],["Referido",c.ref],["Condición UPSS",c.upss],["Observación",c.obs]])}
   ${chipsFicha(c)?`<p style="margin:12px 0 0">Fichas epidemiológicas registradas: ${chipsFicha(c)}</p>`:""}</div>
   <div class="mfoot"><span class="st"></span><button class="btn out" data-pc="1">Cerrar</button>${c.estado==="Programado"?`<button class="btn" data-atender="${c.cod}">Atender</button>`:""}</div></div>`;
  m.hidden=false;m.querySelectorAll("[data-pc]").forEach(b=>b.onclick=()=>{m.hidden=true});
  m.querySelectorAll("[data-atender]").forEach(b=>b.onclick=()=>{m.hidden=true;atender(cod)});
}
function atender(cod){
  const c=CITAS.find(x=>x.cod===cod);
  if(!c.esc){alerta("Prototipo: la cita "+cod+" no tiene un escenario de ficha epidemiológica. Use las citas de pacientes con diagnóstico de diabetes o cáncer.");return}
  st.cita=cod; location.hash="esc-"+c.esc;
}
function exportarCitas(){
  const cols=["Cod","Fecha Cita","Hora Cita","Fecha Registro","Tipo Doc","Numero Doc","Numero Historia","Paciente","Teléfono1","Teléfono2","Respons. Cita","Servicio","Medico","Consultorio","Tipo Cita","Referido","Estado","Observación"];
  const q=v=>`"${String(v??"").replace(/"/g,'""')}"`;
  const lin=filasCitas().map(c=>{const p=citaPac(c);return [c.cod,c.fc,c.hc,c.fr,"DNI",p.dni,p.hc,nomc(p),p.cel,p.tel2,c.resp,c.serv,c.med,c.cons,c.tipo,c.ref,c.estado,c.obs].map(q).join(";")});
  const blob=new Blob(["﻿"+[cols.map(q).join(";"),...lin].join("\r\n")],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="citas_"+(st.qc||CQ0).fd+".csv";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  toast("Se exportaron "+lin.length+" citas (CSV, abre en Excel).");
}

/* ---------- Hospitalización · Alta de paciente (réplica) · las fichas van en DIAGNÓSTICOS DE EGRESO ---------- */
function pantAlta(){
  const e=initEsc(Object.keys(ESC).find(k=>ESC[k].alta)), p=PAC[e.pac], h=e.alta;
  const sb=(t,b)=>`<div class="aband"><h4>${t}</h4><div class="abin">${b}</div></div>`;
  return `<section class="panel"><div class="ph"><span class="bdg">H</span>Hospitalización · Alta de paciente<span class="sp">${esc(nomc(p))} · HC ${p.hc} · ${esc(h.cama)}</span></div><div class="pb alta">
   ${sb("EPICRISIS",`<div class="sgrid">${L("SERVICIO",e.serv)}${L("FECHA DE INGRESO",h.fing)}${L("Nº HISTORIA CLÍNICA",p.hc)}${L("DNI",p.dni)}${L("PACIENTE",nomc(p),"w2")}</div>
     <div class="sf" style="margin-top:10px"><label>MEDICAMENTOS PRESCRITOS AL ALTA</label>${TX("Complicaciones.")}</div>
     <div class="sf" style="margin-top:8px"><label>PRONÓSTICO</label><input id="pron" placeholder="Pronóstico"></div>`)}
   ${sb("PROCEDIMIENTOS",`<div class="tw"><table><thead><tr><th>CÓDIGO</th><th>NOMBRE</th><th>CANTIDAD</th></tr></thead><tbody>${h.proc.map(r=>`<tr><td>${r[0]}</td><td>${esc(r[1])}</td><td>${r[2]}</td></tr>`).join("")}</tbody></table></div>`)}
   ${sb("DIAGNOSTICOS DE EGRESO",`<div class="aband in"><h4 class="izq">DIAGNOSTICOS</h4><div class="abin">
       <button class="bverde" id="dxAdd">Agregar Diagnostico</button>
       <div class="dxlist">${dxRows()}</div>
       <p class="dxhelp">Igual que en la atención ambulatoria: un CIE-10 de diabetes o cáncer del catálogo SIGESAPOL, tipo <b>DEFINITIVO</b> o <b>REITERATIVO</b>, habilita el switch de la ficha epidemiológica.</p>
       <div class="togs">${fichaSw("dm")}${fichaSw("ca")}</div></div></div>`)}
   ${sb("ALTA DE PACIENTE",`<div class="sgrid">${L("DIAS DE ESTANCIA",h.dias)}<div class="sf"><label>FECHA EGRESO</label><input value="${HOY.replace(/\//g,"-")}"></div><div class="sf"><label>HORA EGRESO</label><input value="11:28:21"></div><div class="sf"><label>TIPO DE ALTA</label><select id="talta"><option value="">Elegir</option><option>MEJORADO</option><option>CURADO</option><option>VOLUNTARIO</option><option>REFERIDO</option><option>FALLECIDO</option></select></div></div>`)}
   <div class="acts"><button class="btn gris" id="fin">GUARDAR</button></div>
  </div></section>`;
}
