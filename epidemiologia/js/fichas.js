
/* ---------- ficha de DIABETES ----------
   modos: new = ficha epidemiológica nueva (médico) · seg = ficha de seguimiento (médico; solo II y III, vacías)
          ro = ver (Epidemiología) · edit = editar (Epidemiología) */
function fichaDM(ctx,p,c,f){
  const mode=ctx.mode||(ctx.ro?"ro":f?"seg":"new"), seg=mode==="seg", ro=mode==="ro", hasF=!!f;
  const tri=mode==="new"?(ctx.tri||{}):mode==="seg"?{}:(f.tri||{});
  const lab=mode==="new"?(ctx.lab||{}):mode==="seg"?{}:(f.lab||{});
  const meds=mode==="new"?(ctx.meds||[]):f.meds;
  const lockI=seg||ro, lockII=ro;
  const datos=G(F("Establecimiento",I("HOSP. POLICIA NACIONAL",{ro:1})),F("Nº H.C.",I(p.hc,{ro:1})),F("Nº de ficha",I(hasF?f.num:"Se asigna al guardar",{ro:1})))
   +`<div style="height:8px"></div>`+G(F("Ap. paterno",I(p.ap,{ro:1})),F("Ap. materno",I(p.am,{ro:1})),F("Nombres",I(p.nom,{ro:1})),F("Sexo",I(p.sexo,{ro:1})),F("Fecha de nacimiento",I(p.fn,{ro:1})),F("Edad",I(String(p.edad),{ro:1})),F("Documento de identidad",I("DNI",{ro:1})),F("Nº doc.",I(p.dni,{ro:1})),
      F("Grado de instrucción",S(C.instr,p.instr,{ro:lockI})),F("Etnia",S(C.etnia,"4. Mestizo",{ro:lockI})),F("Idioma",S(C.idioma,"1. Castellano",{ro:lockI})))
   +`<div class="sub"><b>País de nacimiento</b>${G(F("País",I("PERÚ",{ro:lockI})),F("Departamento",I("LIMA",{ro:lockI})),F("Provincia",I("LIMA",{ro:lockI})),F("Distrito",I("LIMA",{ro:lockI})))}</div>`
   +`<div class="sub"><b>Lugar de residencia</b>${G(F("Departamento",I(p.dep,{ro:lockI})),F("Provincia",I(p.prov,{ro:lockI})),F("Distrito",I(p.dist,{ro:lockI})),F("Dirección",I(p.dir,{ro:lockI}),{w:"w2"}),F("Teléfono fijo",I("",{ro:lockI})),F("Celular",I(p.cel,{ro:lockI})))}</div>`
   +`<div style="height:8px"></div>`+G(F("¿Tiene un seguro de salud?",S(["1. Sí","2. No"],"1. Sí",{ro:lockI,ph:false})),F("Tipo de seguro de salud",S(C.seguroDM,seguroDM(p),{ro:lockI}),{w:"w2"}));
  const capt=G(F(seg?"Fecha (control)":"Fecha de captación",I(seg?HOY:(hasF?f.fcap:HOY),{ro:1}),{req:1}),
      ...(seg?[]:[F("Tipo de caso",S(C.tcaso,hasF?f.tcaso:C.tcaso[0],{ro:lockII}),{req:1})]),
      F("Edad (al diagnóstico de diabetes)",I(hasF?f.edadDx:String(p.edad),{ro:seg||ro,u:"años"})),F("Tipo de diabetes",S(C.tdm,hasF?f.tdm:tipoDM(c),{ro:seg||ro}),{req:1}))
   +`<div style="height:8px"></div>`+G(F("Peso corporal",I(tri.peso||"",{u:"kg",rng:"2-300",ro:lockII}),{req:1}),F("Talla",I(tri.talla||"",{u:"m",rng:"0.5-2.5",ro:lockII}),{req:1}),F("Perímetro de cintura",I(tri.cint||"",{u:"cm",rng:"30-250",ro:lockII})),F("PA sistólica",I(tri.pas||"",{u:"mm Hg",rng:"60-280",ro:lockII}),{req:1}),F("PA diastólica",I(tri.pad||"",{u:"mm Hg",rng:"40-180",ro:lockII}),{req:1}),
      F("Nº de consultas (últimos 12 meses)",I(hasF?String(f.segs.length+(seg?1:0)):"1",{ro:1})),F("Nº de hospitalizaciones (últimos 12 meses)",I("0",{ro:1})));
  const labo=G(...LAB.map(([k,n,u,r])=>F(n,I(lab[k]||"",{u,rng:r,ro:lockII}))))+`<div style="height:8px"></div>`+G(F("Estado del caso al momento de la consulta",S(C.estado,mode==="new"?(lab.hba?(parseFloat(lab.hba)<7?C.estado[0]:C.estado[1]):""):seg?"":f.estado,{ro:lockII}),{req:1,w:"w2"}));
  const como=CH(COMORB,hasF?f.com:[])+`<div style="height:8px"></div>`+G(F("Tipo de cáncer",I("")),F("Otra",I(""),{w:"w2"}));
  const cpl=G(F("¿El caso fue evaluado?",S(["Sí","No"],"Sí",{ph:false,id:"ev"+(++uid)}),{req:1,hint:"Si es No, las complicaciones quedan inhabilitadas"}))+`<p style="margin:10px 0 4px"><b>Complicación(es) detectada(s) en la evaluación</b></p><div data-cpl="1">`+CH(COMPL,hasF?f.cpl:[])+`</div>`;
  const trat=`<p style="margin:0 0 4px"><b>Tratamiento medicamentoso</b> · tipo de medicamento (seleccione uno o más)</p>`+CH(MEDS,meds||[])+`<div style="height:8px"></div>`
   +G(F("9. Otros",I(""),{w:"w2"}),F("Tiempo que está en tratamiento",`<div class="inp"><input id="a${++uid}" value="${hasF?f.anios:"0"}"><span class="u">años</span><input id="m${++uid}" value="${hasF?f.meses:"0"}"><span class="u">meses</span></div>`),F("Recibió educación en diabetes",S(["SI","NO"],hasF?f.edu:"")),F("Cumplimiento del tratamiento",S(C.cumple,hasF?f.cum:C.cumple[2])),F("Médico tratante",I("ARANA PEÑA, LUIS",{ro:1})),F("CMP",I("045812",{ro:1})));
  const LK=b=>`<div class="lk">${b}</div><p class="lockmsg">Registrado en la ficha ${f?f.num:""}. En el seguimiento solo se llenan las secciones II y III.</p>`;
  const tit=mode==="seg"?"Diabetes · ficha de seguimiento":mode==="edit"?"Diabetes · ficha epidemiológica · edición":"Diabetes · ficha epidemiológica";
  const chips=hasF?`<span class="chip c-ok">FICHA ${f.num}</span>${seg?`<span class="chip c-az">SEGUIMIENTO ${f.segs.length+1}</span>`:`<span class="chip c-az">${esc(f.tcaso.slice(3).toUpperCase())}</span>`}`:`<span class="chip c-rj">NUEVA</span>`;
  const wrapRO=b=>ro?`<div class="lk">${b}</div>`:b;
  return `<div class="ficha"><div class="fh"><h3>${tit}</h3>${chips}<span class="sp">${seg?`Captación ${f.fcap} · último registro ${f.ult} · complete las secciones II y III`:hasF?`Captación ${f.fcap} · último registro ${f.ult}`:`CIE-10 ${esc(c)} · ${esc(DESC[c]||"")}`}</span></div>
  ${SEC("I. Datos del paciente",wrapRO(datos),mode==="new"||mode==="edit",JAL)}
  ${SEC(seg?"II. Fecha de control y datos clínicos":"II. Fecha de captación",wrapRO(capt),true,seg?' <span class="tagedit">llenar</span>':"")}
  ${SEC("III. Datos de laboratorio",wrapRO(labo),true,seg?' <span class="tagedit">llenar</span>':"")}
  ${SEC("IV. Comorbilidad (marque una o más)",seg?LK(como):wrapRO(como),!seg)}
  ${SEC("V. Complicaciones",seg?LK(cpl):wrapRO(cpl),!seg)}
  ${SEC("VI. Tratamiento",seg?LK(trat):wrapRO(trat),!seg)}
  ${ctx.nofoot||ro?"":`<div class="foot"><span class="st"></span><button class="btn">Guardar</button></div>`}</div>`;
}

/* ---------- ficha de CÁNCER ---------- */
function fichaCA(ctx,p,c,f,serv){
  const upd=!!f; f=f||{}; const ro=!!ctx.ro, fem=p.sexo.startsWith("2"), e=p.edad, fal=!!ctx.fallece;
  const g=(a,b)=>upd?a:b;
  const hosp=G(F("Fecha de admisión por cáncer",I(g(f.fadm,HOY),{ro:1}),{req:1}),F("Número de ficha",I(g(f.num,"Se asigna al guardar"),{ro:1})),F("Nº HC",I(p.hc,{ro:1})),F("Fecha de último control",I(HOY,{ro:1}),{req:1}),F("Clase de caso",S(C.clase,g(f.clase,C.clase[1])),{req:1,w:"w2"}));
  const pac=G(F("Apellido paterno",I(p.ap,{ro:1})),F("Apellido materno",I(p.am,{ro:1})),F("Nombres",I(p.nom,{ro:1})),F("Tipo de documento",I(C.docCA[0],{ro:1})),F("Nº documento",I(p.dni,{ro:1})),F("Sexo",I(fem?"F":"M",{ro:1})),F("Edad",I(String(e),{ro:1})),F("Fecha de nacimiento",I(p.fn,{ro:1})),
      F("Grado de instrucción",S(C.instr,p.instr)),F("Ocupación",I(p.ocup)),F("Condición asegurado",S(C.condCA,condCA(p)),{w:"w2"}))
    +`<div class="sub"><b>Lugar de nacimiento</b>${G(F("País",I("PERÚ")),F("Departamento",I("LIMA")),F("Provincia",I("LIMA")),F("Distrito",I("LIMA")))}</div>`
    +`<div class="sub"><b>Lugar de residencia</b>${G(F("Departamento",I(p.dep)),F("Provincia",I(p.prov)),F("Distrito",I(p.dist)),F("Dirección",I(p.dir),{w:"w2"}),F("Teléfono fijo",I("")),F("Teléfono móvil",I(p.cel)))}</div>`;
  const muj=[];
  if(fem&&e>=25&&e<=64) muj.push(F("Fecha del último PAP",D(g("10/10/2025","15/01/2025")),{hint:"Mujeres de 25 a 64 años"}));
  if(fem&&e>=40&&e<=69) muj.push(F("Fec. últ. mamografía",D(g("","02/09/2026")),{hint:"Mujeres de 40 a 69 años"}));
  if(fem&&e>=10) muj.push(F("Recibió vacuna VPH",S(["Sí","No"],"No"),{hint:"Mujeres de 10 años a más"}));
  const topC=g(f.top,""), morC=g(f.mor,"");
  const dx=G(F("Tipo de referencia",S(C.tref,g(f.tref,C.tref[0]))),F("Fecha de referencia",D(g(f.fref,""))),F("Tiempo de enfermedad",I(g(f.tenf,""),{u:"días"})),F("IPRESS que refiere",I(g(f.ipress,"")),{w:"w2"}),...muj)
    +`<div style="height:8px"></div>`+G(F("Diagnóstico clínico",I(c+" · "+(DESC[c]||""),{ro:1}),{req:1,w:"w3"}),F("Comentario Dx",I(g(f.com,"")),{w:"w3"}))
    +`<div style="height:8px"></div>`+G(F("Fecha de primer diagnóstico",D(g(f.fdx,"")),{req:1}),F("TNM · T",S(C.T,g(f.t,""))),F("N",S(C.N,g(f.n,""))),F("M",S(C.M,g(f.m,""))),F("Estadio clínico",S(C.ET,g(f.et,""))))
    +`<div style="height:8px"></div>`+G(
      F("Método de primer diagnóstico",S(C.metodo,g(f.metodo,"")),{req:1,w:"w2"}),F("Departamento/servicio que realizó el diagnóstico",I(g(f.serv,serv),{ro:1}),{w:"w2"}),
      F("Método base del diagnóstico",S(C.base,g(f.base,"")),{req:1,w:"w2"}))
    +`<div class="sub"><b>CIE-O-3</b>${G(F("Código de topografía",I(topC?topC+" · "+(TOPD[topC]||""):"",{ac:"top",ph:"Buscar: mama, próstata…"}),{req:1,w:"w2"}),F("Código de morfología",I(morC?morC+" · "+(MORD[morC]||"").split("(")[0]:"",{ac:"mor",ph:"Buscar: carcinoma ductal…"}),{req:1,w:"w2"}),F("Grado de diferenciación",S(C.grado,g(f.grado,"")),{req:1}),F("Lateralidad",S(C.lat,g(f.lat,"")),{req:1}))}</div><div style="height:8px"></div>`
    +G(F("Diagnóstico histológico",I(g(f.hist,"")),{req:1,w:"w2"}),F("Subtipo molecular",I(g(f.sub,"")),{w:"w2"}),F("Nº anat-patológica",I(g(f.ap,""))),F("Fecha ex. histológico",D(g(f.fhis,""))));
  const tr=TRAT_CA.flat().map(t=>{const d=upd&&f.trat[t];return `<tr><td><label><input type="checkbox" id="tc${++uid}" ${d?"checked":""}> ${t}</label></td><td style="min-width:150px">${D(d||"")}</td></tr>`}).join("");
  const stv=fal?C.status[6]:g(f.status,"");
  const trat=`<div class="tw"><table><thead><tr><th>Tratamiento inicial</th><th>Fec. inicio</th></tr></thead><tbody>${tr}<tr><td><label><input type="checkbox" id="tc${++uid}"> Ninguno</label></td><td></td></tr><tr><td><label><input type="checkbox" id="tc${++uid}"> Referido para tratamiento</label></td><td></td></tr></tbody></table></div><div style="height:8px"></div>`
    +G(F("Status",S(C.status,stv,{id:"stCA"+uid}),{req:1,hint:"7. Fallecido habilita Mortalidad"}),F("Hospital de referencia",I(""),{w:"w2"}),F("Fecha de referencia",D("")),F("Fecha culminación de tratamiento",D("")));
  const mort=`<div data-mort="1">${G(F("Causa de la muerte",S(C.causa,fal?C.causa[0]:""),{req:1}),F("Lugar de deceso",S(C.lugar,fal?C.lugar[1]:""),{req:1}),F("Fecha de defunción",D(fal?"07/10/2026":"")),
      F("Causa de muerte A) (CIE-10)",I(fal?"C53.9 · TUMOR MALIGNO DEL CUELLO DEL UTERO, SIN OTRA ESPECIFICACION":"",{ac:"cie"}),{req:1,w:"w3"}),F("Causa de muerte B) (CIE-10)",I(fal?"N18.9 · ENFERMEDAD RENAL CRONICA, NO ESPECIFICADA":"",{ac:"cie"}),{w:"w3"}),F("Causa de muerte C) (CIE-10)",I("",{ac:"cie"}),{w:"w3"}),
      F("Enfermedad concurrente",I(""),{w:"w2"}),F("Médico que certificó la muerte · CMP",I(fal?"061233":"")),F("Nombres y apellidos",I(fal?"PATRICIA MENDOZA VILCA":"")),F("Datos adicionales",I(""),{w:"w4"}))}</div>`;
  return `<div class="ficha ca"><div class="fh"><h3>Cáncer · ficha epidemiológica${upd&&!ro?" · actualizar":""}</h3>${upd?`<span class="chip c-ok">FICHA ${f.num}</span>`:`<span class="chip c-rj">NUEVA</span>`}<span class="sp">${upd?`Registrada ${f.fadm} · último control ${f.ult}`:"NTS Nº 199-MINSA/CDC-2023 · Anexo 03"}</span></div>
  ${SEC("Hospital",hosp,!upd&&!ro,JAL)}
  ${SEC("Paciente",pac,!upd&&!ro,JAL)}
  ${SEC("Diagnóstico",dx,!upd||ro)}
  ${SEC("Tratamiento",trat)}
  ${SEC("Mortalidad",mort,fal,fal?"":' <span class="hint" style="margin-left:8px;font-weight:400">se habilita con status 7. Fallecido</span>').replace('<div class="in">',fal?'<div class="in">':'<div class="in dis">')}
  ${ro?"":`<div class="foot"><span class="st">${upd?"Se actualizan los datos de la ficha "+f.num+".":"Al guardar, en las siguientes atenciones la ficha solo se actualiza."}</span><button class="btn" data-ok="${upd?"Ficha "+f.num+" actualizada"+(fal?"; caso cerrado por fallecimiento.":"."):"Ficha de cáncer CA-2026-00052 registrada."}">${upd?"Guardar actualización":"Guardar ficha"}</button></div>`}</div>`;
}


/* vista de impresión */
function kv(rows){return `<div class="pkv">${rows.map(([l,v])=>`<div><span>${esc(l)}</span><b>${esc(v||"—")}</b></div>`).join("")}</div>`}
function impresion(r){
  const {p,f,t}=r;
  const enc=`<div class="phead"><div class="plogo">MINISTERIO DE SALUD<br><small>Centro Nacional de Epidemiología, Prevención y Control de Enfermedades</small></div><div class="ptit">${t==="dm"?"DIABETES · FICHA EPIDEMIOLÓGICA":"FICHA EPIDEMIOLÓGICA DE CÁNCER EN GENERAL<br><small>NTS Nº 199-MINSA/CDC-2023 · Anexo Nº 03</small>"}</div></div>`;
  if(t==="dm") return enc+`<h4>Establecimiento</h4>`+kv([["Establecimiento","HOSP. POLICIA NACIONAL"],["Nº H.C.",p.hc],["Nº de ficha",f.num]])
    +`<h4>I. Datos del paciente</h4>`+kv([["Ap. paterno",p.ap],["Ap. materno",p.am],["Nombres",p.nom],["Sexo",p.sexo],["Fecha de nacimiento",p.fn],["Edad",p.edad],["Documento","DNI "+p.dni],["Grado de instrucción",p.instr],["Residencia",`${p.dist}, ${p.prov}, ${p.dep}`],["Dirección",p.dir],["Celular",p.cel],["Tipo de seguro",seguroDM(p)]])
    +`<h4>II. Fecha de captación</h4>`+kv([["Fecha de captación",f.fcap],["Tipo de caso",f.tcaso],["Edad al diagnóstico",f.edadDx+" años"],["Tipo de diabetes",f.tdm],["Peso",(f.tri.peso||"")+" kg"],["Talla",(f.tri.talla||"")+" m"],["Perímetro de cintura",(f.tri.cint||"")+" cm"],["PA",`${f.tri.pas||""}/${f.tri.pad||""} mm Hg`]])
    +`<h4>III. Datos de laboratorio</h4>`+kv(LAB.filter(([k])=>f.lab[k]).map(([k,n,u])=>[n,f.lab[k]+" "+u]).concat([["Estado del caso",f.estado]]))
    +`<h4>IV. Comorbilidad</h4>`+kv([["Marcadas",f.com.join(", ")||"Ninguna"]])+`<h4>V. Complicaciones</h4>`+kv([["Detectadas",f.cpl.join(", ")||"Ninguna"]])
    +`<h4>VI. Tratamiento</h4>`+kv([["Medicamentos",f.meds.map(m=>m.replace("|"," – ")).join(", ")],["Tiempo en tratamiento",`${f.anios} años ${f.meses} meses`],["Educación en diabetes",f.edu],["Cumplimiento",f.cum],["Médico tratante","ARANA PEÑA, LUIS · CMP 045812"]]);
  return enc+`<h4>Hospital</h4>`+kv([["Fecha de admisión por cáncer",f.fadm],["Número de ficha",f.num],["Nº HC",p.hc],["Fecha de último control",f.ult],["Clase de caso",f.clase]])
    +`<h4>Paciente</h4>`+kv([["Apellidos y nombres",nomc(p)],["Documento","1. DNI "+p.dni],["Sexo",p.sexo.startsWith("1")?"M":"F"],["Edad",p.edad],["Fecha de nacimiento",p.fn],["Grado de instrucción",p.instr],["Ocupación",p.ocup],["Condición asegurado",condCA(p)],["Residencia",`${p.dist}, ${p.prov}, ${p.dep}`],["Dirección",p.dir]])
    +`<h4>Diagnóstico</h4>`+kv([["Tipo de referencia",f.tref],["Tiempo de enfermedad",f.tenf+" días"],["Diagnóstico clínico",f.dxcli+" · "+(DESC[f.dxcli]||"")],["Fecha de primer diagnóstico",f.fdx],["TNM",`${f.t} ${f.n} ${f.m}`],["Estadio clínico",f.et],["Método de primer diagnóstico",f.metodo],["Servicio que realizó el diagnóstico",f.serv],["Topografía",f.top+" · "+(TOPD[f.top]||"")],["Morfología",f.mor+" · "+(MORD[f.mor]||"").split("(")[0]],["Grado de diferenciación",f.grado],["Lateralidad",f.lat],["Método base del diagnóstico",f.base],["Diagnóstico histológico",f.hist],["Nº anat-patológica",f.ap],["Fecha ex. histológico",f.fhis]])
    +`<h4>Tratamiento</h4>`+kv(Object.entries(f.trat).map(([k,v])=>[k,"Inicio "+v]).concat([["Status",f.status]]));
}
function abrirImpresion(id){const r=registro().find(x=>x.id===id);const m=$("#prn");m.innerHTML=`<div class="mdlg" role="dialog" aria-modal="true" aria-label="Vista de impresión"><div class="mhead"><span>Vista de impresión · ${r.f.num}</span><button class="mx" data-pc="1" aria-label="Cerrar">✕</button></div><div class="mbody pgray"><div class="ppage">${impresion(r)}<div class="pfirma"><div>Firma y sello del médico tratante</div><div>V.º B.º Epidemiología</div></div></div></div><div class="mfoot"><span class="st">Formato de la ficha MINSA con los datos registrados.</span><button class="btn out" data-pc="1">Cerrar</button><button class="btn" id="pgo">🖨 Imprimir</button></div></div>`;m.hidden=false;m.querySelectorAll("[data-pc]").forEach(b=>b.onclick=()=>{m.hidden=true});$("#pgo").onclick=()=>toast("En SIGESAPOL se abriría el diálogo de impresión de la ficha "+r.f.num+".")}
function abrirEliminar(id){const r=registro().find(x=>x.id===id);const a=$("#alerta");a.innerHTML=`<div class="abox" role="alertdialog"><p><b>¿Eliminar la ficha ${r.f.num}?</b> ${esc(nomc(r.p))} · ${r.t==="dm"?"Diabetes":"Cáncer"}. La ficha deja de mostrarse y de exportarse; queda en el historial de auditoría.</p><div style="flex-direction:column;align-items:stretch;gap:6px"><label style="font-size:12px;font-weight:700" for="motivo">Motivo de la eliminación *</label><textarea id="motivo" rows="2" style="width:100%;border:1px solid #bbb;padding:6px"></textarea><span id="merr" style="color:var(--rojo);font-size:11.5px"></span><div style="display:flex;gap:8px;justify-content:flex-end;padding:0"><button class="btn out" id="ecan">Cancelar</button><button class="bdel" style="height:auto;padding:6px 14px" id="eok">Eliminar ficha</button></div></div></div>`;a.hidden=false;$("#motivo").focus();
  $("#ecan").onclick=()=>{a.hidden=true};$("#eok").onclick=()=>{if(!$("#motivo").value.trim()){$("#merr").textContent="Escriba el motivo para poder eliminar.";return}st.del[id]=1;if(st.sel&&st.sel.id===id)st.sel=null;a.hidden=true;toast("Ficha "+r.f.num+" eliminada.");keep()}}
