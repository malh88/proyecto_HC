/* =====================================================================
   Prototipo · Programa de Hemodiálisis · SIGESAPOL
   Formato y fichas del «Módulo Hemodiálisis SIGESAPOL» v2 (verde institucional,
   fichas 0026_01 a 0026_04) aplicados al flujo de pestañas del
   Módulo de Procedimiento Programado.

   Regla al pulsar «Atender»:
     · Primera atención en Nefrología (sin HC inicial) → se abre la HISTORIA CLÍNICA INICIAL.
     · Con HC firmada y sin citas → se abre PROGRAMACIÓN DE TURNOS Y CITAS.
     · Cita de una sesión del programa (HC + citas) → SESIÓN DE HEMODIÁLISIS en 3 tiempos.

   JavaScript sin dependencias. Datos de ejemplo (ficticios). El avance de la
   demostración se guarda en localStorage, compartido entre pestañas (médico y enfermería);
   «Reiniciar demostración» lo borra. El perfil «Ver como» es propio de cada pestaña.
   ===================================================================== */
(function(){
"use strict";

/* ===== Utilidades ===== */
function $(id){return document.getElementById(id)}
function q(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))}
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function ahora(){var d=new Date();return("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2)}
function opts(a,v){return a.map(function(o){return'<option'+(String(o)===String(v)?' selected':'')+'>'+esc(o)+'</option>'}).join("")}
function aviso(t,err){var a=$("aviso");if(!a)return;a.textContent=t;a.className="aviso ver"+(err?" err":"");clearTimeout(aviso.t);aviso.t=setTimeout(function(){a.className="aviso"+(err?" err":"")},3800)}
function rol(){var s=$("selRol");return s?s.value:"nef"}
function esNef(){return rol()==="nef"}
function esEnf(){return rol()==="enf"}
function usuario(){return{nef:"Dra. M. SALAZAR",enf:"Lic. C. HUAMAN",adm:"[admisión HD]",tec:"Téc. R. QUISPE"}[rol()]}
function esTec(){return rol()==="tec"}
function param(n){var m=new RegExp("[?&]"+n+"=([^&]+)").exec(location.search);return m?decodeURIComponent(m[1]):null}
var PAGINA=document.body.getAttribute("data-pagina");
var DSEM=["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
function f2s(d){return("0"+d.getDate()).slice(-2)+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+d.getFullYear()}
function iso2d(v){var a=v.split("-");return new Date(+a[0],+a[1]-1,+a[2])}
function s2d(s){var a=s.split("-");return new Date(+a[2],+a[1]-1,+a[0])}
function d2iso(d){return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2)}
/* Citas del programa: si la sesión guardada es antigua (solo fechas), se arman los objetos de cita */
/* Estado del registro de atención de una sesión (enlazado a su cita): firmas de los 3 tiempos */
function estadoReg(reg,atendido){reg=reg||{};
  if(atendido||reg.fin)return["s4","CERRADA"];if(reg.enf)return["s3","EVALUACIÓN FINAL"];if(reg.ini)return["s2","EN ENFERMERÍA"];return["s0","POR INICIAR"]}
/* Nota de enfermería: GUARDAR → EN ESPERA DE LA FIRMA → FINALIZAR (como en SIGESAPOL) */
function estEsp(g){var b=$("sign2"),n=$("enfEsp");if(b&&!b.disabled)b.textContent=g?"FINALIZAR":"GUARDAR";if(n)n.innerHTML=g?'<div class="nota"><b>Registro guardado</b> por '+esc(g.u)+' · '+g.h+' · <span class="st s2">EN ESPERA DE LA FIRMA</span> · pulse FINALIZAR para firmar la nota.</div>':''}
function firmasReg(reg){reg=reg||{};var f=function(x,t){return x?'✔ '+t+': <b>'+esc(x.u)+'</b> '+x.h:'○ '+t+': pendiente'};
  return'<div class="prof">'+f(reg.ini,"Ev. inicial (médico)")+'<br>'+f(reg.enf,"Enfermería")+'<br>'+f(reg.fin,"Ev. final (médico)")+'</div>'}
/* N° de atención de enfermería que genera el Módulo de Enfermería al guardar la nota (ejemplo) */
function idEnf(cod){return"4605"+("0"+cod).slice(-2)}
/* HIST. ENFERMERÍA del Módulo de Procedimiento Programado: notas registradas en el Módulo de Enfermería.
   actual = índice de la cita que se está atendiendo (null en la atención de primera vez). */
/* =====================================================================
   HISTORIAL DE ENFERMERÍA (formato de SIGESAPOL: HIST. ENFERMERIA → VER → DETALLE ENFERMERIA)
   Se usa en la SESIÓN DE HEMODIÁLISIS (tiempo 2) y en la pestaña HIST. ENFERMERÍA del Módulo de Procedimiento Programado.
   ===================================================================== */
function gNom(lista,c){var x=lista.filter(function(y){return y[0]===c})[0];return x?x[0]+" - "+x[1]:c}
var GCAB='<tr><th>Hora</th><th>PA</th><th>FC</th><th>QB</th><th>Na</th><th>RA</th><th>RV</th><th>PTM</th><th>Observaciones</th><th>Registró</th></tr>';
function gFila(r){return r.t==="c"?'<tr><td>'+r.h+'</td><td>'+esc(r.pa)+'</td><td>'+esc(r.fc)+'</td><td>'+r.qb+'</td><td>'+esc(r.na)+'</td><td>'+esc(r.ra)+'</td><td>'+esc(r.rv)+'</td><td>'+esc(r.ptm)+'</td><td>'+(esc(r.o)||"—")+'</td><td class="prof">'+esc(r.u)+'</td></tr>':'<tr class="ev"><td>'+r.h+'</td><td colspan="7"><span class="st sx">EVENTO</span> <b>'+esc(r.ev)+'</b> · '+esc(r.ac)+'</td><td>—</td><td class="prof">'+esc(r.u)+'</td></tr>'}
/* Resultado de la EVOLUCIÓN DE ENFERMERÍA · HEMODIÁLISIS (solo lectura) */
function resHD(e,med){
  e.mon=e.mon||[];e.apl=e.apl||{};e.dx=e.dx||[];e.noc=e.noc||[];e.nic=e.nic||[];med=med||[];
  var v=e.val||{},ev=e.mon.filter(function(r){return r.t==="e"}),ctl=e.mon.length-ev.length,napl=Object.keys(e.apl).length+(e.aplExtra||[]).length;
  var kv=function(c){return'<div class="kv kv2">'+c.map(function(p){return'<b>'+esc(p[0])+'</b><span>: '+esc(p[1])+'</span>'}).join("")+'</div>'};
  return ''+
      (e.res||[]).map(function(g){return'<div class="sub">'+esc(g.t)+'</div>'+kv(g.c)}).join("")+
      '<div class="sub">PROCESO DE ATENCIÓN DE ENFERMERÍA (NANDA · NOC · NIC)</div><div class="tw"><table><tr><th>Diagnóstico (NANDA)</th><th>Planeación (NOC · puntuación)</th><th>Ejecución (NIC)</th><th>Evaluación</th></tr><tr><td>'+e.dx.map(function(c){return esc(gNom(NANDA,c))}).join("<br>")+'</td><td>'+e.noc.map(function(n){return esc(gNom(NOC,n.c))+' · <b>'+n.v+'/5</b>'}).join("<br>")+'</td><td>'+e.nic.map(function(c){return esc(gNom(NIC,c))}).join("<br>")+(e.detInt?'<br><i>'+esc(e.detInt)+'</i>':'')+'</td><td>'+(esc(e.detEva).replace(/\n/g,"<br>")||"—")+'</td></tr></table></div>'+
      '<div class="sub">EVOLUCIÓN DEL TRATAMIENTO</div><div class="tw"><table>'+GCAB+(e.mon.map(gFila).join("")||'<tr><td colspan="10" class="vacio">Sin controles.</td></tr>')+'</table></div>'+
      '<div class="sub">MEDICAMENTOS APLICADOS</div><div class="tw"><table><tr><th>Producto</th><th>Dosis</th><th>Vía</th><th>Hora de aplicación</th></tr>'+(med.map(function(m,i){return'<tr><td>'+esc(m.p)+'</td><td>'+esc(m.d)+'</td><td>'+m.v+'</td><td>'+(e.apl[i]?'<span class="st s4">APLICADO '+e.apl[i]+'</span>':'<span class="st s0">NO APLICADO</span>')+'</td></tr>'}).join("")+(e.aplExtra||[]).map(function(m){return'<tr><td>'+esc(m.p)+' <span class="orig">agregado por enfermería</span></td><td>'+esc(m.d)+'</td><td>'+m.v+'</td><td><span class="st s4">APLICADO '+m.h+'</span></td></tr>'}).join("")||'<tr><td colspan="4" class="vacio">Sin medicamentos.</td></tr>')+'</table></div>';
}
var ENFERMERAS={"Lic. C. HUAMAN":{dni:"41234567",ape:"HUAMAN TORRES",nom:"CARMEN ROSA",cep:"087412"},"Lic. P. ROJAS":{dni:"42345678",ape:"ROJAS LEON",nom:"PATRICIA",cep:"091245"},"Lic. M. PAREDES":{dni:"43456789",ape:"PAREDES CRUZ",nom:"MARIA ELENA",cep:"102233"}};
var MEDICOS={"Dra. M. SALAZAR":{dni:"41998877",ape:"SALAZAR VEGA",nom:"MONICA",cmp:"045812",rne:"028731",esp:"NEFROLOGIA",prof:"MEDICO"},"Dr. J. PAREDES":{dni:"41334455",ape:"PAREDES QUISPE",nom:"JORGE",cmp:"047120",rne:"029004",esp:"NEFROLOGIA",prof:"MEDICO"},"Dr. A. RIVERA":{dni:"44112233",ape:"RIVERA SOTO",nom:"ANDRES",cmp:"40118",rne:"",esp:"ODONTOLOGIA",prof:"ODONTOLOGIA"}};
/* DATOS DEL PACIENTE + DATOS GENERALES DE LA ATENCIÓN (formato SIGESAPOL, datos ficticios) */
function datosGen(P,fh,med,nota){var M=MEDICOS[med]||{dni:"—",ape:med||"—",nom:"",cmp:"—",rne:"—"},N=nota?(ENFERMERAS[nota.u]||{dni:"—",ape:nota.u,nom:"",cep:"—"}):null;
  return'<div class="dg"><div class="dg-c"><div class="dg-h">DATOS DEL PACIENTE</div><div class="kv"><b>TIPO Y Nº DE DOC</b><span>: DNI - '+P.dni+'</span><b>APELLIDOS Y NOMBRES</b><span>: '+esc(P.nom.replace(",",""))+'</span><b>FECHA DE NACIMIENTO</b><span>: '+P.fnac+'</span><b>EDAD / SEXO</b><span>: '+esc(P.edad)+' - '+P.sexo+'</span><b>TIPO DE BENEFICIARIO</b><span>: '+P.par+'</span></div></div>'+
    '<div class="dg-c"><div class="dg-h">DATOS GENERALES DE LA ATENCIÓN</div><div class="kv"><b>COD. SITEDS SUSALUD</b><span>: <em class="rojo">'+(P.clave==="romero"?"130522B7710T":"130498B6602T")+'</em></span><b>FECHA Y HORA DE ATENCIÓN</b><span>: '+fh+'</span><b>TIPO DE ATENCIÓN</b><span>: <em class="rojo">AMBULATORIO</em></span><b>SERVICIO SOLICITANTE</b><span>: NEFROLOGÍA</span><b>PROFESIONAL DE SALUD</b><span>: DNI - '+M.dni+' / '+esc(M.ape+(M.nom?", "+M.nom:""))+'<br>CMP: '+M.cmp+' - RNE: '+(M.rne||"—")+'</span>'+(N?'<b>PROFESIONAL DE ENFERMERÍA</b><span>: DNI - '+N.dni+' / '+esc(N.ape+(N.nom?", "+N.nom:""))+'<br>CEP: '+N.cep+'</span><b>NOTA DE ENFERMERÍA</b><span>: ID '+nota.id+' · '+nota.fecha+' '+nota.hora+'</span>':'')+'</div></div></div>'}
function h12(h){if(!h||h.indexOf(":")<0)return h||"—";var a=h.split(":"),x=+a[0];return("0"+((x%12)||12)).slice(-2)+":"+a[1]+" "+(x<12?"AM":"PM")}
/* Notas de enfermería registradas del paciente (las de hemodiálisis quedan enlazadas a su cita) */
function notasEnf(clave){
  var n=[],P0=paciente(clave);
  var hd=function(est,cod,fecha,ses,total,j){var r=est.reg||{};if(!(r.enf||est.atendidoSes))return;var u=r.enf?r.enf.u:"Lic. C. HUAMAN";
    n.push({id:idEnf(cod),serv:"NEFROLOGÍA",fecha:fecha.replace(/-/g,"/"),hora:h12(r.enf?r.enf.h:"10:00"),u:u,med:r.ini?r.ini.u:"Dra. M. SALAZAR",hd:true,cod:cod,ses:ses,total:total,j:j,e:est.enf||{},ini:est.ini||{},clave:clave})};
  var fijo=function(id,serv,fecha,hora,u,med,hdv,vit){n.push({id:id,serv:serv,fecha:fecha,hora:hora,u:u,med:med,hd:!!hdv,e:hdv||{},ini:{vit:vit||{}},clave:clave,fijo:true})};
  var past=function(pai,paf,pei,pef,ufe,ev){return{val:{pai:pai,paf:paf,pei:pei,pef:pef,ufe:ufe},mon:[{t:"c",h:"07:00",pa:pai,fc:76,qb:350,na:140,ra:-120,rv:140,ptm:60,o:"",u:"Lic. C. HUAMAN"}].concat(ev?[{t:"e",h:"08:40",ev:"HIPOTENSIÓN",ac:"Se avisa al médico, ClNa 0.9 % 200 ml",u:"Lic. C. HUAMAN"}]:[]),apl:{},dx:["00026","00004"],noc:[{c:"0601",v:"4"},{c:"0802",v:"4"}],nic:["2100","4130"],detEva:ev?"Hipotensión durante la sesión, revierte.":"Sin eventos durante la sesión.",res:[]}};
  if(clave==="gutierrez"){
    fijo("215089","ODONTOLOGÍA","23/03/2026","03:24 PM","Lic. M. PAREDES","Dr. A. RIVERA",null,{pa:"130/70",fc:78,fr:20,so2:99,pi:"64.0"});
    fijo("458811","NEFROLOGÍA","28/10/2026","09:51 AM","Lic. C. HUAMAN","Dra. M. SALAZAR",past("138/84","126/78","64.6","62.1","2.5"),{pa:"138/84",fc:76,fr:18,so2:97,pi:"64.6"});
    fijo("459702","NEFROLOGÍA","30/10/2026","09:58 AM","Lic. C. HUAMAN","Dra. M. SALAZAR",past("142/88","98/60","65.0","62.2","2.8",true),{pa:"142/88",fc:80,fr:18,so2:96,pi:"65.0"});
    fijo("460233","NEFROLOGÍA","02/11/2026","09:55 AM","Lic. P. ROJAS","Dr. J. PAREDES",past("136/82","124/76","64.4","62.0","2.4"),{pa:"136/82",fc:74,fr:18,so2:98,pi:"64.4"});
    hd(EST.gutierrez,21,"04-11-2026",5,13,0);
  }else{
    fijo("457904","NEFROLOGÍA","22/10/2026","09:40 AM","Lic. P. ROJAS","Dr. R. VILCHEZ MORA",null,{pa:"150/90",fc:84,fr:20,so2:97,pi:"61.0"});
    var pr=EST.romero.prog;if(pr&&EST.romero.atendidoOrden)pr.fechas.forEach(function(f,j){hd(sesEst(j),22+j,f,j+1,pr.fechas.length,j)});
  }
  return n;
}
var NOTAS_VISTAS=[];
function tablaHistEnf(notas,actualId){
  var base=NOTAS_VISTAS.length;NOTAS_VISTAS=NOTAS_VISTAS.concat(notas);
  return'<div class="na-card dt-hist"><div class="na-h">HISTORIAL DE ENFERMERIA</div><div class="tw"><table><tr><th>ID</th><th>SERVICIO</th><th>TIPO ATENCIÓN</th><th>FECHA INGRESO</th><th>HORA INGRESO</th><th>RESPONSABLE</th><th class="c">VER</th></tr>'+
    (notas.map(function(x,i){var r=ENFERMERAS[x.u]||{dni:"—",nom:x.u,ape:""};return'<tr'+(x.id===actualId?' class="nuevo"':'')+'><td>'+x.id+'</td><td>'+x.serv+'</td><td>AMBULATORIO</td><td>'+x.fecha+'</td><td>'+x.hora+'</td><td><b>DNI:</b> '+r.dni+'<br><b>NOMBRE:</b> '+esc(r.nom)+'<br><b>APELLIDOS:</b> '+esc(r.ape)+'</td><td class="c"><button type="button" class="btn sm g" data-verenf="'+(base+i)+'" aria-label="Ver detalle de enfermería">👁</button></td></tr>'}).join("")||'<tr><td colspan="7" class="vacio">Sin notas de enfermería.</td></tr>')+'</table></div></div>';
}
/* DETALLE ENFERMERIA (todo en solo lectura). soloPestanas = solo las pestañas inferiores (resultado dentro de la sesión) */
var DT_N=0;
function detalleEnf(x,soloPestanas){
  var P0=x.pac||paciente(x.clave,x.j||0),ro=function(l,v,c){return'<div class="'+(c||"f")+'"><label>'+l+'</label><input class="in" readonly value="'+esc(v==null?"":v)+'"></div>'};
  var nm=P0.nom.split(","),ap=nm[0].trim().split(" "),en=ENFERMERAS[x.u]||{},md=MEDICOS[x.med]||{dni:"—",ape:x.med,nom:"",cmp:"",rne:"",esp:"NEFROLOGIA",prof:"MEDICO"};
  var vit=(x.ini&&x.ini.vit)||{},pa=String(vit.pa||"—/—").split("/"),talla=+(vit.talla||(x.clave==="romero"?hcVal("hta","158"):168)),peso=+(x.e&&x.e.val&&x.e.val.pei||vit.pi||0);
  var imc=peso&&talla?(peso/Math.pow(talla/100,2)).toFixed(2):"",pid=talla?(22*Math.pow(talla/100,2)).toFixed(2):"";
  var k="dt"+(++DT_N),tab=function(t,l,on){return'<div data-dtab="'+t+'" class="'+(on?"on":"")+'">'+l+'</div>'},pan=function(t,h,on){return'<div data-dtp="'+t+'"'+(on?'':' hidden')+'>'+h+'</div>'};
  var tiene=function(t){return String(P0.com).toUpperCase().indexOf(t)>=0?"SÍ":"NO"};
  var sv='<div class="row">'+ro("Presión arterial",pa[0]+" / "+(pa[1]||"—"))+ro("Pulso / frec. cardiaca",vit.fc||"—")+ro("Frec. respiratoria (/min)",vit.fr||"—")+ro("FIO2 (%)",vit.fio2||"21")+ro("SAO2 (%)",vit.so2||"—")+ro("Temperatura (°C)",vit.temp||"36")+'</div><div class="row">'+ro("Talla (cm)",talla)+ro("Peso (kg)",peso||"—")+ro("IMC",imc)+ro("Peso ideal",pid)+'<div class="f2"></div></div>';
  var ant='<div class="row">'+ro("Antecedentes",P0.com,"f3")+'</div><div class="row">'+ro("Hipertensión arterial",tiene("HTA"))+ro("Diabetes",tiene("DM"))+ro("Alergia",P0.ale)+ro("Hemodiálisis",x.hd?"SÍ":"NO")+'<div class="f"></div></div>';
  var cp='<div class="tw"><table><tr><th>Código</th><th>Descripción</th><th>Tipo</th><th>Clasificación</th></tr>'+(x.serv==="NEFROLOGÍA"?'<tr><td>Z49.2</td><td>OTRAS DIÁLISIS</td><td>REPETITIVO</td><td>ATENCIÓN</td></tr>':x.serv==="ODONTOLOGÍA"?'<tr><td>K02.9</td><td>CARIES DENTAL, NO ESPECIFICADA</td><td>DEFINITIVO</td><td>ATENCIÓN</td></tr>':'<tr><td>'+esc(x.dx||"Z00.0")+'</td><td>'+esc(x.dxN||"DIAGNÓSTICO DE LA ATENCIÓN")+'</td><td>DEFINITIVO</td><td>ATENCIÓN</td></tr>')+'</table></div><div class="tw"><table><tr><th>Código</th><th>Procedimiento</th><th>Cantidad</th></tr><tr><td>99206</td><td>ATENCIÓN DE ENFERMERÍA EN II, III NIVEL DE ATENCIÓN</td><td>1</td></tr>'+(x.e&&x.e.cur&&x.e.acceso!=="FAV"?'<tr><td>15882</td><td>CURACIÓN DE CATÉTER VENOSO CENTRAL (CVC)</td><td>1</td></tr>':'')+'</table></div>';
  var ob='<div class="row"><div class="f3"><label>Detalle</label><textarea class="in" readonly>'+esc(x.obs||x.e&&x.e.val&&x.e.val.obf||"")+'</textarea></div></div>';
  var pest='<div class="dt-box" id="'+k+'"><div class="tabs">'+(x.hd?tab("hd","EVOLUCIÓN DE ENFERMERÍA · HEMODIÁLISIS",1):'')+tab("sv","SIGNOS VITALES",!x.hd)+tab("ant","ANTECEDENTES")+tab("cp","CPMS/CPT")+tab("ob","OBSERVACIONES")+'</div>'+
    (x.hd?pan("hd",resHD(x.e,(x.ini&&x.ini.med)||[]),1):'')+pan("sv",sv,!x.hd)+pan("ant",ant)+pan("cp",cp)+pan("ob",ob)+'</div>';
  if(soloPestanas)return pest;
  var fecha=x.fecha.split("/");
  return'<div class="na-card"><div class="na-h">DATOS DE LA ATENCION</div><div class="row">'+ro("Tipo de la atención","AMBULATORIO")+ro("Fecha de la atención",fecha[2]+"-"+fecha[1]+"-"+fecha[0]+" 00:00:00")+ro("Servicio",x.serv,"f2")+'</div>'+(x.hd?'<div class="row">'+ro("Procedimiento programado","Nº "+x.cod+" · 90937 · sesión "+x.ses+" de "+x.total,"f3")+'</div>':'')+'</div>'+
    '<div class="na-card"><div class="na-h">INFORMACIÓN DEL PACIENTE</div><div class="row">'+ro("Documento de identidad",P0.dni)+ro("Apellido paterno",ap[0])+ro("Apellido materno",ap.slice(1).join(" "))+ro("Nombres",(nm[1]||"").trim())+ro("Beneficiario",P0.par)+'</div><div class="row">'+ro("F. de nacimiento",P0.fnac)+ro("CIP","")+ro("Grado",P0.grado)+ro("Situación","")+ro("Sexo",P0.sexo.charAt(0))+'</div><div class="row">'+ro("Edad",P0.edadN)+ro("T. sangre","")+'<div class="f3"></div></div></div>'+
    '<div class="na-card"><div class="na-h">INFORMACIÓN DEL RESPONSABLE DE ENFERMERIA</div><div class="row">'+ro("Documento de identidad",en.dni)+ro("Apellido paterno",(en.ape||"").split(" ")[0])+ro("Apellido materno",(en.ape||"").split(" ").slice(1).join(" "))+ro("Nombres",en.nom)+ro("Especialidad","ENFERMERIA")+'</div><div class="row">'+ro("Profesión","ENFERMERIA")+ro("N° colegiatura",en.cep)+'<div class="f3"></div></div></div>'+
    '<div class="na-card"><div class="na-h">INFORMACION DEL RESPONSABLE DE ATENCION</div><div class="row">'+ro("Tipo de doc de identidad","DNI")+ro("N° de documento de identidad",md.dni)+ro("Apellido paterno",String(md.ape).split(" ")[0])+ro("Apellido materno",String(md.ape).split(" ").slice(1).join(" "))+'</div><div class="row">'+ro("Nombres",md.nom)+ro("N° colegiatura",md.cmp)+ro("N° de RNE",md.rne)+ro("Profesión",md.prof)+'</div><div class="row">'+ro("Especialidad",md.esp)+'<div class="f3"></div></div></div>'+pest;
}
function verNotaEnf(i){var x=NOTAS_VISTAS[i];if(!x)return;var v=$("veloDE");
  if(!v){document.body.insertAdjacentHTML("beforeend",'<div class="velo alto" id="veloDE"><div class="modal xl" id="deModal" role="dialog" aria-modal="true" aria-labelledby="deTit"></div></div>');v=$("veloDE");
    v.addEventListener("mousedown",function(e){if(e.target===v)cerrarNotaEnf()});document.addEventListener("keydown",function(e){if(e.key==="Escape")cerrarNotaEnf()})}
  $("deModal").innerHTML='<div class="bar" style="justify-content:center"><span id="deTit">DETALLE ENFERMERIA</span><button type="button" class="btn sm k" id="deX" aria-label="Cerrar" style="position:absolute;right:14px">✕</button></div><div class="box">'+detalleEnf(x)+'</div>';
  $("deModal").style.position="relative";v.classList.add("ver");$("deModal").scrollTop=0;document.body.style.overflow="hidden";$("deX").focus()}
function cerrarNotaEnf(){var v=$("veloDE");if(v&&v.classList.contains("ver")){v.classList.remove("ver");document.body.style.overflow=""}}
document.addEventListener("click",function(e){if(!e.target.closest)return;
  var b=e.target.closest("[data-verenf]");if(b){verNotaEnf(+b.getAttribute("data-verenf"));return}
  if(e.target.closest("#deX")){cerrarNotaEnf();return}
  var t=e.target.closest(".dt-box [data-dtab]");if(t){var bx=t.closest(".dt-box"),n=t.getAttribute("data-dtab");q("[data-dtab]",bx).forEach(function(z){z.classList.toggle("on",z===t)});q("[data-dtp]",bx).forEach(function(z){z.hidden=z.getAttribute("data-dtp")!==n})}});
/* =====================================================================
   HIST. ATENCIONES del Módulo de Procedimiento Programado: atenciones cerradas (I.2 EVALUACIÓN FINAL firmada)
   ===================================================================== */
function abrirDE(titulo,html){var v=$("veloDE");
  if(!v){document.body.insertAdjacentHTML("beforeend",'<div class="velo alto" id="veloDE"><div class="modal xl" id="deModal" role="dialog" aria-modal="true" aria-labelledby="deTit"></div></div>');v=$("veloDE");
    v.addEventListener("mousedown",function(e){if(e.target===v)cerrarNotaEnf()});document.addEventListener("keydown",function(e){if(e.key==="Escape")cerrarNotaEnf()})}
  $("deModal").innerHTML='<div class="bar" style="justify-content:center"><span id="deTit">'+titulo+'</span><button type="button" class="btn sm k" id="deX" aria-label="Cerrar" style="position:absolute;right:14px">✕</button></div><div class="box">'+html+'</div>';
  $("deModal").style.position="relative";v.classList.add("ver");$("deModal").scrollTop=0;document.body.style.overflow="hidden";$("deX").focus()}
var ATN_VISTAS=[];
function atencionesHD(clave){
  var a=[],R=EST.romero;
  var ses=function(est,cod,fecha,sn,total,j){var r=est.reg||{};if(!(r.fin||est.atendidoSes))return;
    a.push({tipo:"ses",clave:clave,j:j,cod:cod,fecha:fecha,ses:sn,total:total,est:est,med:r.fin?r.fin.u:"Dra. M. SALAZAR",h:(est.finDat&&est.finDat.h)||(r.fin?r.fin.h:"10:05")})};
  if(clave==="gutierrez"){
    [["28-10-2026","Nº 18 · sesión 2/13","Dra. M. SALAZAR"],["30-10-2026","Nº 19 · sesión 3/13","Dra. M. SALAZAR"],["02-11-2026","Nº 20 · sesión 4/13","Dr. J. PAREDES"]].forEach(function(x){a.push({tipo:"fijo",fecha:x[0],h:"10:00",med:x[2],det:"Procedimiento programado "+x[1]+" · 90937 · N18.5"})});
    ses(EST.gutierrez,21,"04-11-2026",5,13,0);
  }else{
    if(R.atendidoOrden)a.push({tipo:"hc",fecha:"22-10-2026",h:R.hcFirma?R.hcFirma.h:"—",med:R.hcFirma?R.hcFirma.u:"Dra. M. SALAZAR"});
    if(R.prog&&R.atendidoOrden)R.prog.fechas.forEach(function(f,j){ses(sesEst(j),22+j,f,j+1,R.prog.fechas.length,j)});
  }
  return a.reverse()}
function histAtenciones(clave){var a=atencionesHD(clave);
  return'<div class="tw"><table><tr><th>Fecha</th><th>Servicio</th><th>Profesional</th><th>Detalle</th><th class="c">Ver</th></tr>'+(a.map(function(x){var i=ATN_VISTAS.length;ATN_VISTAS.push(x);
    var det=x.tipo==="ses"?'Procedimiento programado Nº '+x.cod+' · 90937 · sesión '+x.ses+' de '+x.total+' · ATENDIDA':x.tipo==="hc"?'Procedimiento programado Nº 13 · 90937 · Historia Clínica Inicial del Programa de Hemodiálisis y programación de '+(EST.romero.prog?EST.romero.prog.fechas.length:0)+' citas':x.det;
    return'<tr><td class="nw">'+x.fecha.replace(/-/g,"/")+' '+esc(x.h)+'</td><td>NEFROLOGÍA'+(x.tipo!=="hc"?' · HEMODIÁLISIS':'')+'</td><td class="prof">'+esc(x.med)+'</td><td>'+det+'</td><td class="c">'+(x.tipo==="fijo"?'':'<button type="button" class="btn sm g" data-veratn="'+i+'" aria-label="Ver atención">👁</button>')+'</td></tr>'}).join("")||'<tr><td colspan="5" class="vacio">Sin atenciones cerradas.</td></tr>')+'</table></div>'}
function detalleAtencion(x){
  var kv=function(c){return'<div class="kv kv2">'+c.map(function(p){return'<b>'+esc(p[0])+'</b><span>: '+esc(p[1])+'</span>'}).join("")+'</div>'};
  if(x.tipo==="hc"){var P0=paciente("romero"),pr=EST.romero.prog||{};
    return'<div class="na-card"><div class="na-h">HISTORIA CLÍNICA INICIAL DEL PROGRAMA DE HEMODIÁLISIS</div>'+kv([["Paciente",P0.nom],["DNI",P0.dni],["Etiología de la ERC",P0.etio],["Comorbilidades",P0.com],["Acceso vascular",P0.accesoTxt],["Serología",P0.ser],["Alergias",P0.ale],["Peso / talla",P0.pesoTalla],["Firmada por",x.med+" · "+x.h]])+'</div>'+
      '<div class="na-card"><div class="na-h">PROGRAMACIÓN DE TURNOS Y CITAS</div>'+kv([["Secuencia",pr.seq==="LMV"?"L-M-V":"Ma-J-S"],["Turno",pr.turno?TURNOS[pr.turno-1].n+" · "+TURNOS[pr.turno-1].h:"—"],["Máquina",pr.maq!=null?MAQ[pr.maq]:"—"],["N° de citas",pr.fechas?pr.fechas.length:0],["Desde",pr.fechas?pr.fechas[0]:"—"],["Hasta",pr.fechas?pr.fechas[pr.fechas.length-1]:"—"]])+'</div>'}
  var e=x.est,ini=e.ini||{},enf=e.enf||{},fd=e.finDat||{},r=e.reg||{},vit=ini.vit||{},P0=paciente(x.clave,x.j);
  return'<div class="na-card"><div class="na-h">DATOS DE LA ATENCIÓN</div>'+kv([["Paciente",P0.nom],["DNI",P0.dni],["Fecha",x.fecha],["Servicio","NEFROLOGÍA · HEMODIÁLISIS"],["Procedimiento programado","Nº "+x.cod+" · 90937 · sesión "+x.ses+" de "+x.total],["Lugar de atención",P0.maq!=null?MAQ[P0.maq]:"—"],["Evaluación inicial",r.ini?r.ini.u+" · "+r.ini.h:"—"],["Enfermería",r.enf?r.enf.u+" · "+r.enf.h:"—"],["Evaluación final",r.fin?r.fin.u+" · "+(fd.h||r.fin.h):"—"]])+'</div>'+
    '<div class="na-card"><div class="na-h">I.1 EVALUACIÓN INICIAL</div><div class="tw"><table><tr><th>Diagnóstico (CIE-10)</th><th>Tipo</th></tr>'+((ini.cie||[]).map(function(c){return'<tr><td>'+esc(c.c)+'</td><td>'+c.t+'</td></tr>'}).join("")||'<tr><td colspan="2" class="vacio">—</td></tr>')+'</table></div>'+
      kv([["PA",vit.pa||"—"],["FC",vit.fc||"—"],["FR",vit.fr||"—"],["SO2",vit.so2||"—"],["Horas de hemodiálisis",vit.hhd||"—"],["Peso seco / inicial (kg)",(vit.ps||"—")+" / "+(vit.pi||"—")],["UF programada (L)",vit.uf||"—"],["Receta / FUR",ini.receta?ini.receta.r+" / "+ini.receta.f:"—"]])+
      '<div class="tw"><table><tr><th>Medicamento de la sesión</th><th>Dosis</th><th>Vía</th></tr>'+((ini.med||[]).map(function(m){return'<tr><td>'+esc(m.p)+'</td><td>'+esc(m.d)+'</td><td>'+m.v+'</td></tr>'}).join("")||'<tr><td colspan="3" class="vacio">—</td></tr>')+'</table></div></div>'+
    '<div class="na-card"><div class="na-h">EVOLUCIÓN DE ENFERMERÍA · HEMODIÁLISIS (NOTA '+idEnf(x.cod)+')</div>'+(enf.firm||enf.val?resHD(enf,ini.med||[]):'<div class="vacio">Sin datos.</div>')+'</div>'+
    '<div class="na-card"><div class="na-h">I.2 EVALUACIÓN FINAL</div>'+kv([["Hora de evaluación final",fd.h||"—"],["Médico",r.fin?r.fin.u:"—"],["Condición clínica al finalizar",fd.cond||"—"]])+
      '<div class="sub">PROCEDIMIENTOS MÉDICOS (CPMS)</div><div class="tw"><table><tr><th>Código</th><th>Nombre</th><th>Cantidad</th></tr>'+((fd.cpms||[]).map(function(c){return'<tr><td>'+esc(c[0])+'</td><td>'+esc(c[1])+'</td><td>'+esc(c[2])+'</td></tr>'}).join("")||'<tr><td colspan="3" class="vacio">—</td></tr>')+'</table></div>'+
      '<div class="sub">MEDICAMENTOS INDICADOS AL FINALIZAR LA SESIÓN</div><div class="tw"><table><tr><th>Producto</th><th>Vía</th><th>Posología</th><th>Días</th><th>Cant.</th></tr>'+((e.finMed||[]).map(function(m){return'<tr><td>'+esc(m.p)+'</td><td>'+m.v+'</td><td>'+esc(m.pos)+'</td><td>'+esc(m.dias)+'</td><td>'+esc(m.q)+'</td></tr>'}).join("")||'<tr><td colspan="5" class="vacio">Sin medicamentos indicados.</td></tr>')+'</table></div></div>'}
document.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("[data-veratn]");if(!b)return;var x=ATN_VISTAS[+b.getAttribute("data-veratn")];if(!x)return;
  abrirDE(x.tipo==="hc"?"ATENCIÓN · PROCEDIMIENTO PROGRAMADO Nº 13":"ATENCIÓN · PROCEDIMIENTO PROGRAMADO Nº "+x.cod+" · SESIÓN "+x.ses+" DE "+x.total,detalleAtencion(x))});
function histEnf(clave,actual){var ns=notasEnf(clave),cur=null;
  if(actual!=null)ns.forEach(function(x){if(x.hd&&x.j===actual&&x.clave===clave)cur=x.id});
  return tablaHistEnf(ns,cur)}
function citasDe(prog){if(!prog.citas)prog.citas=prog.fechas.map(function(f){return{f:f,t:prog.turno,m:prog.maq,h:prog.hora,est:"PROGRAMADA",hist:[]}});return prog.citas}

/* ===== Estado de la demostración ===== */
var EST_VACIO={romero:{hc:false,hcVals:null,hcFirma:null,prog:null,atendidoOrden:false,atendidoSes:false},gutierrez:{atendidoSes:false},otros:{}};
function leerDemo(){try{return JSON.parse(localStorage.getItem("hd_demo")||"null")}catch(e){return null}}
function cargar(){var s=leerDemo();if(s&&s.romero)return s;return JSON.parse(JSON.stringify(EST_VACIO))}
function guardar(){try{localStorage.setItem("hd_demo",JSON.stringify(EST))}catch(e){}}
var EST=cargar();EST.otros=EST.otros||{};

/* ===== Datos de ejemplo (de la v2) ===== */
var TURNOS=[{id:1,n:"Turno 1",h:"06:00 - 10:00",med:"Dra. M. SALAZAR",enf:"Lic. C. HUAMAN"},{id:2,n:"Turno 2",h:"10:30 - 14:30",med:"Dra. M. SALAZAR",enf:"Lic. C. HUAMAN"},{id:3,n:"Turno 3",h:"15:00 - 19:00",med:"Dr. J. PAREDES",enf:"Lic. P. ROJAS"},{id:4,n:"Turno 4",h:"19:30 - 23:30",med:"",enf:"Lic. P. ROJAS"}];
var MAQ=["Máquina 01","Máquina 02","Máquina 03","Máquina 04","Máquina 05","Máquina 06","Máquina 07","Máquina 08 (aislamiento)"];
var ISO=7; /* índice de la máquina de aislamiento */
/* Pacientes del programa ya programados (secuencia, turno, máquina) */
var PROGRAMADOS=[
 {n:"GUTIERREZ ROJAS",seq:"LMV",t:1,m:3,i:"FAV · HC 0238145"},{n:"MENDOZA PAREDES",seq:"LMV",t:1,m:1,i:"CVC · HC 0127733"},{n:"CASTRO VEGA",seq:"LMV",t:1,m:0,i:"FAV · HC 0311204"},
 {n:"QUISPE HUAMANI",seq:"LMV",t:2,m:2,i:"CVCLP · HC 0310592"},{n:"RIOS PALACIOS",seq:"LMV",t:2,m:4,i:"FAV · HC 0298811"},{n:"VARGAS CCAHUANA",seq:"LMV",t:3,m:7,i:"SEROLOGÍA (+)",pos:true},
 {n:"TORRES LLANOS",seq:"MJS",t:1,m:0,i:"FAV · HC 0402219"},{n:"DIAZ MORI",seq:"MJS",t:1,m:2,i:"FAV · HC 0417730"},{n:"SANCHEZ ÑAUPARI",seq:"MJS",t:2,m:3,i:"FAV · HC 0088412"},{n:"FLORES QUISPE",seq:"MJS",t:3,m:1,i:"FAV · HC 0102487"}];
var CIE=["N18.5 · INSUFICIENCIA RENAL CRÓNICA ESTADIO 5","N18.0 · INSUFICIENCIA RENAL TERMINAL","Z99.2 · DEPENDENCIA DE DIÁLISIS RENAL","I10 · HIPERTENSIÓN ESENCIAL (PRIMARIA)","E11.2 · DIABETES MELLITUS NO INSULINODEPENDIENTE, CON COMPLICACIONES RENALES","D63.8 · ANEMIA EN OTRAS ENFERMEDADES CRÓNICAS","N17.9 · INSUFICIENCIA RENAL AGUDA, NO ESPECIFICADA","E87.5 · HIPERPOTASEMIA","J18.9 · NEUMONÍA, NO ESPECIFICADA"];
var TIPODX=["PRESUNTIVO","DEFINITIVO","REITERATIVO"];
var PROD=["PF00446 · HEPARINA SÓDICA 5 000 UI/ML INY 5 ML","PF00312 · EPOETINA ALFA 2 000 UI/ML INY 1 ML","PF00457 · HIERRO (COMO SACARATO) 20 MG FE/ML INY 5 ML","PF00456 · HIDROXOCOBALAMINA 1 MG/ML INY 1 ML","CLORURO DE SODIO 0.9 % 1 000 ML","PAQUETE GLOBULAR (TRANSFUSIÓN)"];
var ORIGEN={KIT:"KIT DE SESIÓN",MEN:"TRATAMIENTO MENSUAL",DIA:"INDICACIÓN DEL DÍA"};
var KIT_FAV=[
 {c:"DMMB00435",n:"FILTRO PARA HEMODIÁLISIS DE POLISULFONA O POLIETERSULFONA DE 1.8 M2 - 1.9 M2",u:"UND",q:1,st:4},
 {c:"DMMB01102",n:"SET DE LÍNEA ARTERIAL Y VENOSA PARA HEMODIÁLISIS ADULTO",u:"SET",q:1,st:58},
 {c:"DMMB00438",n:"FÍSTULA ARTERIOVENOSA PARA HEMODIÁLISIS 16 G X 1 1/4",u:"UND",q:2,st:120},
 {c:"PF00446",n:"HEPARINA SÓDICA 5 000 UI/ML INY 5 ML",u:"INY",q:1,st:210},
 {c:"DMMB00530",n:"JERINGA HIPOD. 5 ML C/A N° 21 X 1 1/2, DESCARTABLE",u:"UND",q:3,st:900},
 {c:"DMMB00532",n:"JERINGA HIPOD. 10 ML C/A N° 21 X 1 1/2, DESCARTABLE",u:"UND",q:3,st:640},
 {c:"DMMB00533",n:"JERINGA HIPOD. 20 ML C/A N° 21 X 1 1/2, DESCARTABLE",u:"UND",q:1,st:310},
 {c:"DMMB00577",n:"LLAVE DE TRIPLE VÍA DESCARTABLE",u:"UND",q:1,st:150},
 {c:"DMMB00401",n:"EQUIPO DE INFUSIÓN ENDOVENOSO SIMPLE (VENOCLISIS)",u:"UND",q:1,st:95}];
var KIT_CVC_EXTRA={c:"DMMB00092",n:"APÓSITO TRANSPARENTE ESTÉRIL 10 CM X 12 CM",u:"UND",q:2,st:85};
var NANDA=[["00002","DESEQUILIBRIO NUTRICIONAL: INFERIOR A LAS NECESIDADES CORPORALES"],["00004","RIESGO DE INFECCIÓN"],["00006","HIPOTERMIA"],["00007","HIPERTERMIA"],["00013","DIARREA"],["00025","RIESGO DE DESEQUILIBRIO DE VOLUMEN DE LÍQUIDOS"],["00026","EXCESO DE VOLUMEN DE LÍQUIDOS"],["00047","RIESGO DE DETERIORO DE LA INTEGRIDAD CUTÁNEA"],["00093","FATIGA"],["00146","ANSIEDAD"],["00179","RIESGO DE NIVEL DE GLUCEMIA INESTABLE"],["00203","RIESGO DE PERFUSIÓN RENAL INEFICAZ"],["00206","RIESGO DE SANGRADO"]];
var NOC=[["0504","FUNCIÓN RENAL"],["0601","EQUILIBRIO HÍDRICO"],["0703","SEVERIDAD DE LA INFECCIÓN"],["0802","SIGNOS VITALES"],["1004","ESTADO NUTRICIONAL"],["1006","PESO: MASA CORPORAL"],["1101","INTEGRIDAD TISULAR: PIEL Y MEMBRANAS MUCOSAS"],["1105","INTEGRIDAD DEL ACCESO PARA HEMODIÁLISIS"],["1300","ACEPTACIÓN: ESTADO DE SALUD"],["1803","CONOCIMIENTO: PROCESO DE LA ENFERMEDAD"],["1813","CONOCIMIENTO: RÉGIMEN TERAPÉUTICO"],["1814","CONOCIMIENTO: PROCEDIMIENTO TERAPÉUTICO"]];
var NIC=[["2100","TERAPIA DE HEMODIÁLISIS"],["2440","MANTENIMIENTO DE DISPOSITIVOS DE ACCESO VENOSO"],["4120","MANEJO DE LÍQUIDOS"],["4130","MONITORIZACIÓN DE LÍQUIDOS"],["4240","MANTENIMIENTO DEL ACCESO PARA DIÁLISIS"],["5602","ENSEÑANZA: PROCESO DE ENFERMEDAD"],["6540","CONTROL DE INFECCIONES"],["6680","MONITORIZACIÓN DE SIGNOS VITALES"]];
var ESCALA=["1","2","3","4","5"];

/* Pacientes de la demostración */
function hcVal(id,def){var v=EST.romero.hcVals;return v&&v[id]!=null&&v[id]!==""?v[id]:def}
/* Estado del registro de atención de cada cita del paciente nuevo (índice 0 = primera sesión) */
function sesEst(i){if(!i)return EST.romero;EST.romero.ses=EST.romero.ses||{};return EST.romero.ses[i]=EST.romero.ses[i]||{}}
function paciente(clave,idx){
  idx=idx||0;
  if(clave==="romero"){var pr=EST.romero.prog||{},c0=pr.fechas?citasDe(pr)[idx]:null;
    var acc=hcVal("hti","—"),fav=acc==="FÍSTULA ARTERIOVENOSA";
    return{clave:"romero",nom:"SALAS VERA DE PONCE, MARTHA LUCIA",dni:"40871236",hcn:"[N° HC]",fnac:"23/02/1967",edad:"59 A, 7 M, 29 D",edadN:59,sexo:"FEMENINO",par:"PADRES",grado:"—",
      etio:hcVal("cErc","—"),acceso:fav?"FAV":"CVC",accesoTxt:acc,ser:EST.romero.ser||"NEGATIVA",ale:hcVal("ale","—"),com:hcVal("com","—"),f1:hcVal("f1hd","—"),hcFirma:EST.romero.hcFirma,
      contacto:hcVal("ceN","—")+" · "+hcVal("ceT","—"),pesoTalla:hcVal("hpe","—")+" kg / "+hcVal("hta","—")+" cm",karnofsky:hcVal("hka","—"),
      seq:pr.seq,turno:c0?c0.t:pr.turno,maq:c0?c0.m:pr.maq,cod:22+idx,ses:idx+1,idx:idx,total:pr.fechas?pr.fechas.length:13,fecha:c0?c0.f:"—",hora:c0?c0.h:pr.hora,
      origen:"Orden de procedimiento Nº 13 (22-10-2026) · Programación y citas"}}
  return{clave:"gutierrez",nom:"GUTIERREZ ROJAS, LUIS ALBERTO",dni:"40718235",hcn:"0238145",fnac:"14/03/1968",edad:"58 A, 7 M, 8 D",edadN:58,sexo:"MASCULINO",par:"TITULAR",grado:"SOS PNP",
    etio:"E11.2 · NEFROPATÍA DIABÉTICA",acceso:"FAV",accesoTxt:"FÍSTULA ARTERIOVENOSA",ser:"NEGATIVA",ale:"NIEGA",com:"DM2, HTA",f1:"03-2024",hcFirma:{u:"Dra. M. SALAZAR",h:"12-03-2024"},
    contacto:"ROJAS DE GUTIERREZ, ELENA · 987412305",pesoTalla:"64.0 kg / 168 cm",karnofsky:"80",
    seq:"LMV",turno:1,maq:3,cod:21,ses:5,total:13,fecha:"04-11-2026",hora:"06:00",
    origen:"Programa vigente desde 26-10-2026 (L-M-V · Turno 1 · Máquina 04)"};
}

/* ===== Menú lateral (igual a la v2) ===== */
function menu(){
  var side=$("side");if(!side)return;
  var perfiles={nef:["Dra. M. SALAZAR","CMP 045812 · perfil «Nefrólogo»"],enf:["Lic. C. HUAMAN","CEP 087412 · perfil «Enfermería HD»"],adm:["[admisión HD]","perfil «Admisión de Hemodiálisis»"],tec:["Téc. R. QUISPE","perfil «Técnico de citas · Hemodiálisis»"]};
  var pf=perfiles[rol()],act=pasoActual();
  side.innerHTML='<div class="usr"><b>'+pf[0]+'</b>Servicio de Hemodiálisis · '+pf[1]+'</div>'+
    SECUENCIA.filter(function(x){return!x.oculto}).map(function(x){var c=x.cuenta();return'<a href="'+(typeof x.href==="function"?x.href():x.href)+'" class="'+(act===x.id&&!/^enf/.test(PAGINA)?"on":"")+'">▦ '+x.t+''+(c?'<span class="c">'+c+'</span>':'')+'</a>'}).join("")+
    '<a href="enfermeria.html" class="'+(/^enf/.test(PAGINA)?"on":"")+'">▦ Enfermería (EF) · Consulta Externa'+(pendEnf()?'<span class="c">'+pendEnf()+'</span>':'')+'</a>'+
    '<a href="index.html"'+(PAGINA==="flujo"?' class="on"':'')+'>▦ Flujo propuesto</a>'+
    '<a href="#" id="btnReset" style="color:#A94442">↺ Reiniciar demostración</a>';
  $("btnReset").onclick=function(e){e.preventDefault();try{localStorage.removeItem("hd_demo");sessionStorage.removeItem("hd_demo")}catch(x){}location.href="bandeja.html"};
  var sb=$("secuencia");
  if(sb)sb.innerHTML=SECUENCIA.map(function(x){var h=x.hecho();return'<div class="'+(act===x.id?"on":h?"dep":"")+'" data-href="'+(typeof x.href==="function"?x.href():x.href)+'">'+x.t+'<small>'+x.ayuda+(h?" · listo":"")+'</small></div>'}).join("");
}
/* Notas de enfermería de hemodiálisis habilitadas (I.1 firmada) y aún sin registrar */
function pendEnf(){var n=0,f=function(e){if(e&&e.reg&&e.reg.ini&&!e.reg.enf&&!e.atendidoSes)n++};f(EST.gutierrez);f(EST.romero);for(var k in (EST.romero.ses||{}))f(EST.romero.ses[k]);return n}
/* Secuencia del menú de la v2 (sin 5. Seguimiento ni 6. Reportes): es el orden en que se programa y se atiende la terapia.
   2 y 3 son pestañas de la atención del paciente en el Módulo de Procedimiento Programado. */
var SECUENCIA=[
 {id:"bandeja",href:"bandeja.html",t:"1. Solicitudes de atención",ayuda:"Módulo de Procedimientos Programados",cuenta:function(){return filasBandeja().filter(function(r){return r.estado==="PENDIENTE"}).length},hecho:function(){return EST.romero.atendidoOrden}},
 {oculto:true,id:"hc",href:"atencion.html#hc",t:"2. Historia clínica inicial",ayuda:"Una sola vez, primera atención",cuenta:function(){return EST.romero.hc?0:1},hecho:function(){return EST.romero.hc}},
 {id:"cal",href:"citas.html",t:"2. Gestión de citas · citas múltiples (Técnico)",ayuda:"Registro de citas de hemodiálisis",cuenta:function(){return EST.romero.hc&&!EST.romero.prog?1:0},hecho:function(){return!!EST.romero.prog}},
 {oculto:true,id:"dia",href:"registro-dia.html",t:"4. Registro de atención del día",ayuda:"Cada sesión en 3 tiempos",cuenta:function(){return(EST.gutierrez.atendidoSes?0:1)+(EST.romero.atendidoOrden&&!EST.romero.atendidoSes?1:0)},hecho:function(){return EST.romero.atendidoSes}}];
function pasoActual(){
  if(PAGINA==="atencion"){var t=q(".pp-tabs [data-tab].on")[0],tab=t?t.getAttribute("data-tab"):"";return($("veloProg")&&$("veloProg").classList.contains("ver"))||tab==="prog"?"cal":"bandeja"}
  if(PAGINA==="sesion"||PAGINA==="enfnota"||PAGINA==="enf")return"dia";
  if(PAGINA==="otro")return"bandeja";
  if(PAGINA==="citas")return"cal";
  return PAGINA;
}
document.addEventListener("click",function(e){var d=e.target.closest("#secuencia [data-href]");if(d)location.href=d.getAttribute("data-href")});

/* ===== Perfil «Ver como» (se recuerda entre páginas) ===== */
var refrescar=null,STD_G=null;
(function(){var s=$("selRol");if(!s)return;
  try{var g=sessionStorage.getItem("hd_rol");if(g)s.value=g}catch(e){}
  s.addEventListener("change",function(){try{sessionStorage.setItem("hd_rol",s.value)}catch(e){}menu();if(refrescar)refrescar();aviso("Viendo como: "+s.selectedOptions[0].text)});
})();

/* ===== Pestañas ===== */
function irTab(nombre){
  var tab=q('.pp-tabs [data-tab="'+nombre+'"]')[0];if(!tab)return;
  if(tab.classList.contains("pp-lock")){aviso(tab.getAttribute("data-motivo")||"Esta pestaña aún no está habilitada.",true);return}
  q(".pp-tabs [data-tab]").forEach(function(t){t.classList.toggle("on",t===tab);t.setAttribute("aria-selected",t===tab?"true":"false")});
  q("[data-panel]").forEach(function(p){p.hidden=p.getAttribute("data-panel")!==nombre});
  menu();
}
document.addEventListener("click",function(e){
  var t=e.target.closest(".pp-tabs [data-tab]");if(t){irTab(t.getAttribute("data-tab"));return}
  var b=e.target.closest("[data-ir]");if(b){irTab(b.getAttribute("data-ir"));window.scrollTo(0,0)}
});
document.addEventListener("keydown",function(e){var t=e.target.closest&&e.target.closest(".pp-tabs [data-tab]");if(t&&(e.key==="Enter"||e.key===" ")){e.preventDefault();irTab(t.getAttribute("data-tab"))}});

/* =====================================================================
   1. MÓDULO DE PROCEDIMIENTOS PROGRAMADOS (bandeja, estructura actual)
   ===================================================================== */

/* =====================================================================
   NUEVA ATENCIÓN · campos nuevos de SIGESAPOL (iguales para todos los servicios)
   PRESCRIBIR RECETA → PRODUCTOS MÉDICOS · EXAMEN DE LABORATORIO · EXAMEN DE IMAGENOLOGÍA · Atención origen
   En las sesiones de hemodiálisis la receta no se vuelve a prescribir: se muestra la generada en la I.1.
   ===================================================================== */
var NA_PROD=[["PF00017 - ACIDO FOLICO 500 MCG (0.5 MG) TAB","12618"],["PF00121 - CARBONATO DE CALCIO 500 MG TAB","8420"],["PF00312 - EPOETINA ALFA 2 000 UI/ML INY 1 ML","640"],["PF00457 - HIERRO (COMO SACARATO) 20 MG FE/ML INY 5 ML","310"],["PF00446 - HEPARINA SODICA 5 000 UI/ML INY 5 ML","210"],["PF00088 - AMLODIPINO 10 MG TAB","15230"],["PF00290 - ENALAPRIL 10 MG TAB","9874"]];
var NA_VIA=["Oral","Endovenosa","Subcutánea","Intramuscular","Oftalmológica","Tópica"];
var NA_LAB=["HEMOGLOBINA","HEMATOCRITO","UREA PRE HEMODIÁLISIS","UREA POST HEMODIÁLISIS","CREATININA","POTASIO","SODIO","CALCIO","FÓSFORO","ALBÚMINA","GLUCOSA","FERRITINA","PTH INTACTA","HBSAG (ANTÍGENO DE SUPERFICIE HEPATITIS B)","ANTI HCV","HIV 1-2 (ELISA)","PERFIL LIPÍDICO","HEMOGRAMA COMPLETO"];
/* Exámenes de la HC inicial del Programa de Hemodiálisis (ahora en EXAMEN DE LABORATORIO): unidad, tipo de resultado y resultado previo de SIGESAPOL */
var LAB_HD=[["GRUPO SANGUÍNEO Y FACTOR RH","","t",{r:"O RH(+)",f:"—",o:"ASEGURADOS"}],["HEMOGLOBINA","g/dL","n",{r:"8.9",f:"20-10-2026",o:"LABORATORIO"}],["HEMATOCRITO","%","n",{r:"27",f:"20-10-2026",o:"LABORATORIO"}],["GLUCOSA","mg/dL","n",{r:"142",f:"20-10-2026",o:"LABORATORIO"}],
  ["DEPURACIÓN DE CREATININA","ml/min","n"],["UREA","mg/dL","n",{r:"186",f:"20-10-2026",o:"LABORATORIO"}],["CREATININA","mg/dL","n",{r:"8.4",f:"20-10-2026",o:"LABORATORIO"}],["PROTEÍNAS TOTALES","g/dL","n"],["ALBÚMINA","g/dL","n",{r:"3.2",f:"20-10-2026",o:"LABORATORIO"}],
  ["CALCIO","mg/dL","n"],["FÓSFORO","mg/dL","n"],["TGO","U/L","n"],["TGP","U/L","n"],["HIERRO SÉRICO","µg/dL","n"],["SATURACIÓN DE TRANSFERRINA","%","n"],["PARATHORMONA (PTH)","pg/mL","n"],
  ["SEROLÓGICAS PARA LÚES","","s"],["AgHBs","","s",{r:"NEGATIVO",f:"20-10-2026",o:"LABORATORIO"}],["AcHBs","","s"],["AcHBc","","s"],["AcHVC","","s"],["HIV","","s"],["HTLV-1","","s"],["PRUEBA COVID-19","","t"]];
function labDef(e){return LAB_HD.filter(function(x){return x[0]===e})[0]}
NA_LAB=NA_LAB.concat(LAB_HD.map(function(x){return x[0]}).filter(function(e){return NA_LAB.indexOf(e)<0}));
var NA_PAQ={mensual:["HEMOGLOBINA","HEMATOCRITO","UREA PRE HEMODIÁLISIS","UREA POST HEMODIÁLISIS","CREATININA","POTASIO","CALCIO","FÓSFORO","ALBÚMINA"],
            ingreso:LAB_HD.map(function(x){return x[0]})};
var NA_IMG=["71045 - RX DE TÓRAX, 1 INCIDENCIA","76770 - ECOGRAFÍA RENAL","93970 - ECOGRAFÍA DOPPLER VENOSO DE MIEMBROS SUPERIORES","93306 - ECOCARDIOGRAFÍA TRANSTORÁCICA","70460 - TM CABEZA CON CONTRASTE"];
var NA_FARM=["Farmacia Central del Hospital Nacional PNP Luis N. Saenz","Farmacia PIP I del Hospital Nacional PNP Luis N. Saenz","Farmacia Centro Quirúrgico"];
var NA=null;
function nuevaAtencion(o){
  var box=$("naExtra");if(!box)return null;
  var A={rx:null,cont:null,prods:[],lab:null,labs:[],img:null,imgs:[],farm:NA_FARM[0]};
  var dx=o.dx||["Z49.2 - OTRAS DIALISIS"];
  var dxSel=function(v,attr){return'<select class="in" '+attr+'><option value="">-- Seleccionar --</option>'+dx.map(function(d){return'<option'+(d===v?' selected':'')+'>'+esc(d)+'</option>'}).join("")+'</select>'};
  /* Flag NO / SI (interruptor), como en SIGESAPOL */
  var sino=function(n,v,dis){return tgl(n,v,dis)};
  var sv=function(x){return x.type==="checkbox"?x.checked:x.value==="SI"};
  var del=function(t,i){return'<button type="button" class="btn sm r" data-nadel="'+t+'" data-i="'+i+'">✖ Eliminar</button>'};
  function receta(){
    if(o.rxHD){var r=o.rxHD();
      if(r.firm&&r.sin)return'<div class="na-card"><div class="na-t">PRESCRIBIR RECETA</div>'+sino("naRx",false,true)+'</div>';
      if(!r.firm)return'<div class="na-card"><div class="na-t">PRESCRIBIR RECETA</div>'+sino("naRx",null,true)+'</div>';
      return'<div class="na-card"><div class="na-t">PRESCRIBIR RECETA</div>'+sino("naRx",true,true)+'<span class="orig">generada en la I.1 EVALUACIÓN INICIAL</span></div>'+
        '<div class="na-card"><div class="na-h">PRODUCTOS MÉDICOS</div><div class="row"><div class="f"><label>FEC. EXPEDICIÓN (A)</label><input class="in" readonly value="'+esc(r.fecha)+'"></div><div class="f3"><label>FARMACIA</label><input class="in" readonly value="'+esc(r.farm)+'"></div></div>'+
        '<div class="row"><div class="f"><label>PACIENTE CONTINUADOR</label>'+sino("naCont",r.cont,true)+'</div><div class="f2"><label>Receta vale N° / FUR</label><input class="in" readonly value="'+esc(r.vale+" / "+r.fur)+'"></div><div class="f"></div></div>'+
        '<div class="tw"><table><tr><th>Producto farmacéutico o dispositivo médico</th><th>Stock farmacia</th><th>Tiempo (días)</th><th>Vía adm.</th><th>Posología</th><th>Cant. pres.</th><th>Origen</th></tr>'+r.items.map(function(x){return'<tr><td>'+esc(x.p)+'</td><td>'+x.st+'</td><td>'+(x.dias||1)+'</td><td>'+x.v+'</td><td>'+esc(x.pos)+'</td><td>'+esc(x.q)+'</td><td><span class="orig">'+x.o+'</span></td></tr>'}).join("")+'</table></div>'+'</div>';
    }
    var h='<div class="na-card"><div class="na-t">PRESCRIBIR RECETA</div>'+sino("naRx",A.rx)+'</div>';
    if(A.rx)h+='<div class="na-card"><div class="na-h">PRODUCTOS MÉDICOS</div><div class="row"><div class="f3"><label>FEC. EXPEDICIÓN (A)</label><input class="in" readonly value="'+f2s(new Date())+'"></div></div>'+
      '<div class="row"><div class="f3"><label for="naFarm">FARMACIA</label><select class="in" id="naFarm">'+opts(NA_FARM,A.farm)+'</select></div></div>'+
      '<div class="row"><div class="f"><label>PACIENTE CONTINUADOR</label>'+sino("naCont",A.cont)+'</div></div>'+
      '<div class="acciones" style="margin-top:0"><button type="button" class="btn k" id="naAddProd">Agregar Producto</button>'+(o.sugProd?'<button type="button" class="btn sm o" id="naSugProd">'+esc(o.sugProd.t)+'</button>':'')+'</div>'+
      (A.prods.length?'<div class="tw"><table><tr><th>Producto farmacéutico o dispositivo médico</th><th>Stock farmacia</th><th>Tiempo (días)</th><th>Vía adm.</th><th>Posología</th><th>Cant. pres.</th><th></th></tr>'+A.prods.map(function(x,i){var st=(NA_PROD.filter(function(p){return p[0]===x.p})[0]||["",""])[1];
        return'<tr><td><select class="in" data-nap="p" data-i="'+i+'">'+opts(NA_PROD.map(function(p){return p[0]}),x.p)+'</select></td><td><input class="in q" readonly value="'+st+'"></td><td><input class="in q" type="number" min="1" data-nap="d" data-i="'+i+'" value="'+esc(x.d)+'"></td><td><select class="in" data-nap="v" data-i="'+i+'">'+opts(NA_VIA,x.v)+'</select></td><td><input class="in" data-nap="pos" data-i="'+i+'" value="'+esc(x.pos)+'" placeholder="Ej.: 1 tab c/24 h"></td><td><input class="in q" type="number" min="1" data-nap="q" data-i="'+i+'" value="'+esc(x.q)+'"></td><td>'+del("p",i)+'</td></tr>'}).join("")+'</table></div>':'<div class="vacio">Sin productos. Pulse «Agregar Producto».</div>')+'</div>';
    return h}
  function lab(){var h='<div class="na-card"><div class="na-t">EXAMEN DE LABORATORIO</div>'+sino("naLab",A.lab)+'</div>';
    if(A.lab)h+='<div class="na-card"><div class="na-h">EXAMEN LABORATORIO</div><div class="acciones" style="margin-top:0;justify-content:space-between"><span><button type="button" class="btn k" id="naAddLab">Agregar Examen</button>'+(o.paq?' <button type="button" class="btn sm o" id="naPaq">＋ '+esc(o.paq.t)+'</button>':'')+'</span><button type="button" class="btn k" id="naRua">RUA LABORATORIO</button></div>'+
      '<datalist id="dlLab">'+NA_LAB.map(function(x){return'<option value="'+esc(x)+'">'}).join("")+'</datalist>'+
      (A.labs.length?'<div class="tw"><table><tr><th>Exámen</th><th style="width:150px">Resultado</th><th>Unidad</th><th style="width:150px">Fecha</th><th style="width:80px">Cantidad</th><th style="width:220px">Diagnóstico</th><th style="width:100px"></th></tr>'+A.labs.map(function(x,i){var d=labDef(x.e)||["","","t"],lab=x.o==="LABORATORIO"||x.o==="ASEGURADOS",ro=lab?' readonly':'';
        var res=d[2]==="s"&&!lab?'<select class="in" data-nal="r" data-i="'+i+'">'+opts(["—","NEGATIVO","POSITIVO"],x.r||"—")+'</select>':'<input class="in" data-nal="r" data-i="'+i+'" value="'+esc(x.r||"")+'"'+ro+'>';
        return'<tr><td><input class="in" list="dlLab" data-nal="e" data-i="'+i+'" value="'+esc(x.e)+'" placeholder="Escriba el examen"></td><td>'+res+'</td><td>'+esc(d[1])+'</td><td><input class="in" data-nal="f" data-i="'+i+'" value="'+esc(x.f||"")+'" placeholder="dd-mm-aaaa"'+ro+'></td><td><input class="in q" type="number" min="1" data-nal="q" data-i="'+i+'" value="'+x.q+'"></td><td>'+dxSel(x.dx,'data-nal="dx" data-i="'+i+'"')+'</td><td>'+del("l",i)+'</td></tr>'}).join("")+'</table></div>':'<div class="vacio">Sin exámenes.</div>')+
      '<div class="row"><div class="f3"><label for="naLabObs">Observación</label><input class="in" id="naLabObs"></div></div></div>';
    return h}
  function img(){var h='<div class="na-card"><div class="na-t">EXAMEN DE IMAGENOLOGIA</div>'+sino("naImg",A.img)+'</div>';
    if(A.img)h+='<div class="na-card"><div class="na-h">EXAMEN IMAGENOLOGIA</div><div class="acciones" style="margin-top:0"><button type="button" class="btn k" id="naAddImg">Agregar Examen</button></div>'+
      (A.imgs.length?'<div class="tw"><table><tr><th>Examen</th><th>Comparativo</th><th>Lado</th><th>Observación</th><th>Cant</th><th>Diagnóstico</th><th>Radiología portátil</th><th></th></tr>'+A.imgs.map(function(x,i){return'<tr><td><select class="in" data-nai="e" data-i="'+i+'">'+opts(NA_IMG,x.e)+'</select></td><td><select class="in" data-nai="c" data-i="'+i+'">'+opts(["NO","SI"],x.c)+'</select></td><td><select class="in" data-nai="l" data-i="'+i+'">'+opts(["No aplica","Derecho","Izquierdo","Bilateral"],x.l)+'</select></td><td><input class="in" data-nai="o" data-i="'+i+'" value="'+esc(x.o)+'" placeholder="Observación"></td><td><input class="in q" type="number" min="1" data-nai="q" data-i="'+i+'" value="'+x.q+'"></td><td>'+dxSel(x.dx,'data-nai="dx" data-i="'+i+'"')+'</td><td>'+sino("naPort"+i,x.port)+'</td><td>'+del("i",i)+'</td></tr>'}).join("")+'</table></div>':'<div class="vacio">Sin exámenes.</div>')+'</div>';
    return h}
  function filaLab(e){var d=labDef(e),pr=d&&d[3];return{e:e,q:1,dx:dx[0],r:pr?pr.r:"",f:pr?pr.f:"",o:pr?pr.o:""}}
  function agregarPaq(){var ya=A.labs.map(function(x){return x.e});A.labs=A.labs.filter(function(x){return x.e});o.paq.l.forEach(function(e){if(ya.indexOf(e)<0)A.labs.push(filaLab(e))})}
  A.serologia=function(){return A.labs.some(function(x){return["AgHBs","AcHVC","HIV"].indexOf(x.e)>=0&&x.r==="POSITIVO"})?"POSITIVA":"NEGATIVA"};
  function pint(){box.innerHTML=receta()+lab()+img()}
  A.valida=function(){
    if(!o.rxHD&&A.rx===true&&!A.prods.length)return"PRESCRIBIR RECETA = SÍ: agregue al menos un producto o marque NO.";
    if(!o.rxHD&&A.rx===true&&A.prods.some(function(x){return!String(x.pos).trim()}))return"Complete la posología de cada producto.";
    if(A.lab===true&&(!A.labs.length||A.labs.some(function(x){return NA_LAB.indexOf(x.e)<0})))return"EXAMEN DE LABORATORIO = SÍ: elija cada examen de la lista.";
    if(A.lab===true&&A.labs.some(function(x){return!x.dx}))return"Seleccione el diagnóstico de cada examen de laboratorio.";
    if(A.img===true&&!A.imgs.length)return"EXAMEN DE IMAGENOLOGÍA = SÍ: agregue al menos un examen o marque NO.";
    if(A.img===true&&A.imgs.some(function(x){return!x.dx}))return"Seleccione el diagnóstico de cada examen de imagenología.";
    return""};
  A.resumen=function(){var r=[];if(o.rxHD){var x=o.rxHD();if(x.firm)r.push("receta "+x.vale)}else if(A.rx)r.push(A.prods.length+" producto(s)");if(A.lab)r.push(A.labs.length+" examen(es) de laboratorio");if(A.img)r.push(A.imgs.length+" examen(es) de imagenología");return r.join(" · ")};
  box.addEventListener("change",function(e){var x=e.target,i=+x.getAttribute("data-i");
    if(x.name==="naRx"){A.rx=sv(x);if(A.rx&&!A.prods.length)A.prods.push({p:NA_PROD[0][0],d:30,v:"Oral",pos:"",q:30});pint();return}
    if(x.name==="naCont"){A.cont=sv(x);return}
    if(x.name==="naLab"){A.lab=sv(x);if(A.lab&&!A.labs.length){if(o.paqAuto)agregarPaq();else A.labs.push({e:"",q:1,dx:""})}pint();return}
    if(x.name==="naImg"){A.img=sv(x);if(A.img&&!A.imgs.length){if(o.paqAuto)["76770 - ECOGRAFÍA RENAL","71045 - RX DE TÓRAX, 1 INCIDENCIA"].forEach(function(e){A.imgs.push({e:e,c:"NO",l:e.indexOf("RENAL")>0?"Bilateral":"No aplica",o:"",q:1,dx:dx[0],port:false})});else A.imgs.push({e:NA_IMG[0],c:"NO",l:"No aplica",o:"",q:1,dx:"",port:false})}pint();return}
    if(/^naPort/.test(x.name)){A.imgs[+x.name.slice(6)].port=sv(x);return}
    if(x.id==="naFarm"){A.farm=x.value;return}
    if(x.hasAttribute("data-nap")){A.prods[i][x.getAttribute("data-nap")]=x.value;if(x.getAttribute("data-nap")==="p")pint();return}
    if(x.hasAttribute("data-nal")){var kk=x.getAttribute("data-nal");A.labs[i][kk]=x.value;if(kk==="e"&&labDef(x.value)){var nf=filaLab(x.value);nf.q=A.labs[i].q;nf.dx=A.labs[i].dx||nf.dx;A.labs[i]=nf;pint()}return}
    if(x.hasAttribute("data-nai")){A.imgs[i][x.getAttribute("data-nai")]=x.value;return}});
  box.addEventListener("input",function(e){var x=e.target,i=+x.getAttribute("data-i");
    if(x.hasAttribute("data-nap"))A.prods[i][x.getAttribute("data-nap")]=x.value;
    if(x.hasAttribute("data-nal"))A.labs[i][x.getAttribute("data-nal")]=x.value;
    if(x.hasAttribute("data-nai"))A.imgs[i][x.getAttribute("data-nai")]=x.value});
  box.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;
    if(b.id==="naAddProd"){A.prods.push({p:NA_PROD[0][0],d:30,v:"Oral",pos:"",q:30});pint();return}
    if(b.id==="naSugProd"){A.prods=A.prods.filter(function(x){return String(x.pos).trim()});o.sugProd.f().forEach(function(x){A.prods.push(x)});pint();aviso("Productos de la atención origen agregados. Revise posología y cantidad.");return}
    if(b.id==="naAddLab"){A.labs.push({e:"",q:1,dx:""});pint();return}
    if(b.id==="naPaq"){agregarPaq();pint();aviso(o.paq.t+": "+o.paq.l.length+" exámenes agregados.");return}
    if(b.id==="naRua"){aviso("Abre el RUA de laboratorio (función existente de SIGESAPOL).");return}
    if(b.id==="naAddImg"){A.imgs.push({e:NA_IMG[0],c:"NO",l:"No aplica",o:"",q:1,dx:"",port:false});pint();return}
    if(b.hasAttribute("data-nadel")){var t=b.getAttribute("data-nadel"),k=+b.getAttribute("data-i");(t==="p"?A.prods:t==="l"?A.labs:A.imgs).splice(k,1);pint();return}});
  A.pint=pint;pint();return A;
}
/* GUARDAR: antes de la regla propia de cada pantalla se validan receta, laboratorio e imagenología */
document.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("#btnGuardar");if(!b||!NA)return;var m=NA.valida();if(m){e.stopImmediatePropagation();e.preventDefault();aviso(m,true);irTab("nueva")}},true);

function tgl(n,v,dis,id){return'<label class="tg'+(dis?' dis':'')+'"><span class="tn">NO</span><input type="checkbox" name="'+n+'"'+(id?' id="'+id+'"':'')+(v===true?' checked':'')+(dis?' disabled':'')+'><i aria-hidden="true"></i><span class="ts">SI</span></label>'}
/* Ventana «Atención origen» (botón 👁 del procedimiento solicitado) */
var ORIGEN_AT={
  romero:{n:"4471203",f:"20/10/2026 09:15",tipo:"CONSULTA EXTERNA",serv:"NEFROLOGÍA",med:"Dr. R. VILCHEZ MORA · CMP 051234",dx:[["N18.5","INSUFICIENCIA RENAL CRÓNICA ESTADIO 5","DEFINITIVO"],["I10","HIPERTENSIÓN ESENCIAL (PRIMARIA)","REPETITIVO"],["D63.8","ANEMIA EN OTRAS ENFERMEDADES CRÓNICAS","PRESUNTIVO"]],
    ind:"TFG estimada 7 ml/min. Se indica ingreso al Programa de Hemodiálisis, 3 sesiones por semana. Colocación de CVC temporal yugular derecho (15-10-2026). Solicita procedimiento programado 90937.",
    rx:[["PF00017 - ACIDO FOLICO 500 MCG (0.5 MG) TAB","30","1 tab c/24 h"],["PF00088 - AMLODIPINO 10 MG TAB","30","1 tab c/24 h"]],lab:"Hb 8.9 g/dl · Hto 27 % · Urea 186 mg/dl · Creatinina 8.4 mg/dl · Albúmina 3.2 g/dl (20-10-2026)",hc:true},
  gutierrez:{n:"3302211",f:"12/03/2024 10:40",tipo:"CONSULTA EXTERNA",serv:"NEFROLOGÍA",med:"Dra. M. SALAZAR · CMP 045812",dx:[["E11.2","DIABETES MELLITUS CON COMPLICACIONES RENALES","DEFINITIVO"],["N18.5","INSUFICIENCIA RENAL CRÓNICA ESTADIO 5","DEFINITIVO"]],
    ind:"Paciente en el Programa de Hemodiálisis desde 03-2024 (L-M-V). Renovación de la programación 26-10-2026, 13 sesiones.",rx:[],lab:"Último control mensual: Hb 10.8 g/dl · K 5.1 mEq/l · Albúmina 3.8 g/dl",hc:false},
  card:{n:"4469917",f:"19/10/2026 11:05",tipo:"CONSULTA EXTERNA",serv:"CARDIOLOGÍA",med:"Dr. L. CHAVEZ RIOS · CMP 038812",dx:[["I50.0","INSUFICIENCIA CARDÍACA CONGESTIVA","PRESUNTIVO"]],ind:"Disnea de esfuerzo. Se solicita ecocardiografía transtorácica.",rx:[],lab:"—",hc:false},
  bio:{n:"4470551",f:"21/10/2026 08:50",tipo:"CONSULTA EXTERNA",serv:"NEFROLOGÍA",med:"Dr. R. VILCHEZ MORA · CMP 051234",dx:[["N04.9","SÍNDROME NEFRÓTICO NO ESPECIFICADO","PRESUNTIVO"]],ind:"Proteinuria en rango nefrótico. Se solicita biopsia renal percutánea.",rx:[],lab:"Proteinuria 24 h: 4.2 g · Creatinina 1.3 mg/dl",hc:false}};
function abrirOrigen(clave){
  var a=ORIGEN_AT[clave];if(!a)return;var v=$("veloNA");
  if(!v){document.body.insertAdjacentHTML("beforeend",'<div class="velo" id="veloNA"><div class="modal lg" id="naModal" role="dialog" aria-modal="true" aria-labelledby="naoTit"></div></div>');v=$("veloNA");
    v.addEventListener("mousedown",function(e){if(e.target===v)cerrarOrigen()});document.addEventListener("keydown",function(e){if(e.key==="Escape")cerrarOrigen()})}
  $("naModal").innerHTML='<div class="bar"><span id="naoTit">ATENCIÓN ORIGEN · N° '+a.n+'</span><span class="tag">'+a.tipo+'</span><button type="button" class="btn sm k" id="naoX" aria-label="Cerrar" style="margin-left:8px">✕</button></div><div class="box">'+
    '<div class="kv kv2"><b>FECHA Y HORA</b><span>: '+a.f+'</span><b>SERVICIO</b><span>: '+a.serv+'</span><b>MÉDICO</b><span>: '+esc(a.med)+'</span><b>TIPO DE ATENCIÓN</b><span>: '+a.tipo+'</span></div>'+
    '<div class="sub">DIAGNÓSTICOS</div><div class="tw"><table><tr><th>CIE-10</th><th>Descripción</th><th>Tipo</th></tr>'+a.dx.map(function(d){return'<tr><td>'+d[0]+'</td><td>'+d[1]+'</td><td>'+d[2]+'</td></tr>'}).join("")+'</table></div>'+
    '<div class="sub">INDICACIÓN / PLAN</div><div class="nota">'+esc(a.ind)+'</div>'+
    (a.rx.length?'<div class="sub">RECETA DE LA ATENCIÓN</div><div class="tw"><table><tr><th>Producto</th><th>Días</th><th>Posología</th></tr>'+a.rx.map(function(r){return'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td></tr>'}).join("")+'</table></div>':'')+
    '<div class="sub">EXÁMENES</div><div class="leg">'+esc(a.lab)+'</div>'+
    '<div class="acciones" style="justify-content:flex-end"><button type="button" class="btn k" id="naoNo">Cerrar</button></div></div>';
  v.classList.add("ver");document.body.style.overflow="hidden";$("naoX").focus();
}
function cerrarOrigen(){var v=$("veloNA");if(v&&v.classList.contains("ver")){v.classList.remove("ver");document.body.style.overflow=""}}
document.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("button");if(!b)return;
  if(b.hasAttribute("data-origen")){var c=PAGINA==="otro"?(param("c")||"card"):PAGINA==="sesion"?(param("p")==="romero"?"romero":"gutierrez"):"romero";abrirOrigen(c);return}
  if(b.id==="naoX"||b.id==="naoNo")cerrarOrigen()});

/* Otros procedimientos programados (para mostrar que sin NEFROLOGÍA + 90935/90937 la atención queda como hoy) */
var OTROS={card:{cod:14,nom:"CASTILLO NUÑEZ, PEDRO PABLO",dni:"41556677",fnac:"02/05/1961",edad:"65 A, 5 M, 24 D",sexo:"MASCULINO",par:"TITULAR",serv:"CARDIOLOGÍA",cpms:"93306",fecha:"19/10/2026 11:20",
    dx:"I50.0 - INSUFICIENCIA CARDÍACA CONGESTIVA",motivo:"El servicio solicitante no es NEFROLOGÍA."},
  bio:{cod:15,nom:"RIVAS QUISPE, ANA LUCIA",dni:"41223399",fnac:"17/11/1980",edad:"45 A, 11 M, 9 D",sexo:"FEMENINO",par:"CÓNYUGE",serv:"NEFROLOGÍA",cpms:"50200",fecha:"21/10/2026 09:05",
    dx:"N04.9 - SÍNDROME NEFRÓTICO NO ESPECIFICADO",motivo:"El servicio es NEFROLOGÍA, pero el procedimiento no es de hemodiálisis (90935 / 90937)."}};
var DESC={"90937":"Procedimiento de hemodiálisis que requiere repetida(s) evaluación(es) con o sin una revisión médica substancial de la prescripción de la diálisis","90935":"Procedimiento de hemodiálisis crónica con una sola evaluación médica"};
DESC["93306"]="Ecocardiografía transtorácica en tiempo real con documentación de imagen 2D, con o sin modo M";
DESC["50200"]="Biopsia renal percutánea por trocar o aguja";
function filasBandeja(){
  var r=[],g=paciente("gutierrez"),ro=paciente("romero"),R=EST.romero;
  /* Cada cita creada por el Técnico (citas múltiples) llega al Módulo de Procedimientos Programados como su propia atención */
  if(R.prog)citasDe(R.prog).forEach(function(c,i){var e=sesEst(i),pi=paciente("romero",i),cerr=!!(e.atendidoSes||(e.reg||{}).fin);
    r.push({cod:22+i,p:ro,fecha:c.f.replace(/-/g,"/")+" "+c.h,cpms:"90937",prog:"SESIÓN "+(i+1)+" DE "+R.prog.fechas.length+" · "+TURNOS[c.t-1].n.toUpperCase()+" · "+MAQ[c.m].toUpperCase(),estado:cerr||e.finGuard?"ATENDIDO":"PENDIENTE",firm:cerr,href:"atencion-sesion.html?p=romero&n="+i,tipo:"AMBULATORIO",nuevo:i===0})});
  r.push({cod:21,p:g,fecha:"04/11/2026 06:00",cpms:"90937",prog:"SESIÓN 5 DE 13 · TURNO 1 · MÁQUINA 04",estado:EST.gutierrez.atendidoSes||EST.gutierrez.finGuard||(EST.gutierrez.reg||{}).fin?"ATENDIDO":"PENDIENTE",firm:!!(EST.gutierrez.atendidoSes||(EST.gutierrez.reg||{}).fin),href:"atencion-sesion.html?p=gutierrez",tipo:"AMBULATORIO"});
  r.push({cod:13,p:ro,fecha:"22/10/2026 10:08",cpms:"90937",prog:null,estado:R.hcGuard||R.hc?"ATENDIDO":"PENDIENTE",firm:!!R.hc,href:"atencion.html",tipo:"AMBULATORIO",
    etapa:!R.hc?"Primera atención: Historia Clínica Inicial":""});
  ["bio","card"].forEach(function(k){var x=OTROS[k];r.push({cod:x.cod,p:x,fecha:x.fecha,cpms:x.cpms,serv:x.serv,prog:null,estado:EST.otros[k]||(EST.otrosG||{})[k]?"ATENDIDO":"PENDIENTE",firm:!!EST.otros[k],href:"atencion-otro.html?c="+k,tipo:"AMBULATORIO",etapa:"Sin pestañas del Programa HD: "+x.motivo.charAt(0).toLowerCase()+x.motivo.slice(1)})});
  r.push({cod:8,fijo:'<td class="c">8</td><td>FLORES PAZ, NORMA ISABEL<br>DNI - 41002233<br><b>F.NAC:</b> 01/07/1958 - <b>EDAD:</b> 68 A, 3 M, 21 D<br><b>CONDICIÓN:</b> NO REFERIDO</td><td><b>Nº:</b> 8 17/10/2026 11:58<br><b>ORIGEN:</b> AMBULATORIO<br><b>SERVICIO:</b> NEUMOLOGÍA<br><b>PROCEDIMIENTO:</b> 94060 - Evaluación respuesta broncodilatación, espirometría</td><td class="c" style="font-weight:700;color:#777">ANULADO</td><td><b>FECHA Y HORA DE ANULACIÓN:</b> 19/10/2026 16:21:37<br><b>RESPONSABLE:</b> [usuario]<br><b>MOTIVO:</b> [motivo]</td>',estado:"ANULADO",doc:"41002233",nomTxt:"FLORES PAZ",tipo:"AMBULATORIO"});
  r.push({cod:4,fijo:'<td class="c">4</td><td>MEDINA ARCE, VICTOR HUGO<br>DNI - 41887766<br><b>F.NAC:</b> 06/08/1962 - <b>EDAD:</b> 64 A, 2 M, 16 D<br><b>CONDICIÓN:</b> REFERIDO</td><td><b>Nº:</b> 4 16/10/2026 15:46<br><b>ORIGEN:</b> AMBULATORIO<br><b>SERVICIO:</b> NEFROLOGÍA<br><b>PROCEDIMIENTO:</b> 90935 - '+DESC["90935"]+'</td><td class="c" style="font-weight:700;color:#8A6D3B">OBSERVADO</td><td><b>FECHA Y HORA DE OBSERVACIÓN:</b> 16/10/2026 16:29:07<br><b>RESPONSABLE:</b> [usuario]<br><b>MOTIVO:</b> problemas con el tráfico, nunca llegó</td>',estado:"OBSERVADO",doc:"41887766",nomTxt:"MEDINA ARCE",tipo:"REFERIDO"});
  r.sort(function(a,b){return b.cod-a.cod});
  return r;
}
if(PAGINA==="bandeja"){
  var F={doc:"",nom:"",est:"TODOS",tip:"TODOS"};
  var pintarBandeja=function(){
    var filas=filasBandeja().filter(function(r){var doc=r.p?r.p.dni:r.doc,nom=r.p?r.p.nom:r.nomTxt;
      return(!F.doc||doc.indexOf(F.doc)>=0)&&(!F.nom||nom.toUpperCase().indexOf(F.nom)>=0)&&(F.est==="TODOS"||r.estado===F.est)&&(F.tip==="TODOS"||r.tipo===F.tip)});
    $("tablaBandeja").innerHTML='<tr><th style="width:60px;text-align:center">Código</th><th>DATOS DEL PACIENTE</th><th>DATOS DE LA SOLICITUD</th><th style="width:110px;text-align:center">ESTADO</th><th style="width:360px;text-align:center">ACCIONES</th></tr>'+
      (filas.map(function(r){
        if(r.fijo)return'<tr>'+r.fijo+'</tr>';
        var p=r.p,acc=r.estado==="PENDIENTE"
          ?'<div class="acc-sg"><div>Atender<br><a class="btn sm g" href="'+r.href+'" aria-label="Atender" style="text-decoration:none">✎</a></div><div>Observar<br><button type="button" class="btn sm o" data-observar aria-label="Observar">⌕</button></div></div>'
          :r.firm
          ?'<div class="acc-sg"><div>Ver Atención<br><a class="btn sm g" href="'+r.href+'" aria-label="Ver atención" style="text-decoration:none">👁</a></div><div>PDF<br><button type="button" class="btn sm r" data-bacc="pdf" aria-label="Descargar PDF">🗎</button></div><div>Subir Informe<br><button type="button" class="btn sm b" data-bacc="inf" aria-label="Subir informe">⇪</button></div><div>Solicitudes<br><button type="button" class="btn sm k" data-bacc="sol" aria-label="Solicitudes">☰</button></div><div>Anular<br><button type="button" class="btn sm r" data-bacc="anu" aria-label="Anular">✖</button></div></div>'
          :'<div class="acc-sg"><div>Editar<br><a class="btn sm g" href="'+r.href+'" aria-label="Editar / finalizar" title="Pendiente de firma: abra el registro y pulse FINALIZAR" style="text-decoration:none">✎</a></div><div>Subir Informe<br><button type="button" class="btn sm b" data-bacc="inf" aria-label="Subir informe">⇪</button></div><div>Solicitudes<br><button type="button" class="btn sm k" data-bacc="sol" aria-label="Solicitudes">☰</button></div><div>Anular<br><button type="button" class="btn sm r" data-bacc="anu" aria-label="Anular">✖</button></div></div>';
        return'<tr'+(r.nuevo&&r.estado==="PENDIENTE"?' class="nuevo"':'')+'><td class="c">'+r.cod+'</td><td>'+esc(p.nom)+'<br>DNI - '+p.dni+'<br><b>F.NAC:</b> '+p.fnac+' - <b>EDAD:</b> '+p.edad+'<br><b>CONDICIÓN:</b> NO REFERIDO</td>'+
          '<td><b>Nº:</b> '+r.cod+' '+r.fecha+'<br><b>ORIGEN:</b> AMBULATORIO<br><b>SERVICIO:</b> '+(r.serv||"NEFROLOGÍA")+'<br><b>PROCEDIMIENTO:</b> '+r.cpms+' - '+DESC[r.cpms]+(r.prog?'<br><b>PROGRAMA HD:</b> '+r.prog:'')+'</td>'+
          '<td class="c" style="font-weight:700;color:'+(r.estado==="PENDIENTE"?"#D9534F":"#2E6B30")+'">'+r.estado+'</td><td>'+acc+'</td></tr>'}).join("")||'<tr><td colspan="5" class="vacio">No se encontraron registros.</td></tr>');
    $("contador").textContent=filas.length?"Mostrando registros del 1 al "+filas.length+" de un total de "+filas.length+" registros":"No se encontraron registros";
  };
  $("formBandeja").addEventListener("submit",function(e){e.preventDefault();F={doc:$("fDoc").value.trim(),nom:$("fNom").value.trim().toUpperCase(),est:$("fEst").value,tip:$("fTip").value};pintarBandeja()});
  document.addEventListener("click",function(e){if(e.target.closest("[data-observar]"))aviso("Abre la ventana actual de «Observar» (motivo, detalle y responsable).");
    var a=e.target.closest("[data-bacc]");if(a)aviso({pdf:"Descarga el PDF de la atención firmada (función existente de SIGESAPOL).",inf:"Abre la ventana actual de «Subir Informe».",sol:"Muestra las solicitudes generadas en la atención (receta, laboratorio, imágenes).",anu:"Abre la ventana actual de «Anular» (motivo y responsable)."}[a.getAttribute("data-bacc")])});
  var est=$("fEst");if(est&&!q('option',est).some(function(o){return o.text==="ATENDIDO"}))est.insertAdjacentHTML("beforeend","<option>ATENDIDO</option>");
  pintarBandeja();
}

/* =====================================================================
   2. ATENCIÓN DE LA ORDEN · HISTORIA CLÍNICA INICIAL + PROGRAMACIÓN
   ===================================================================== */
if(PAGINA==="atencion"){
  var R=EST.romero;
  var camposHc=function(){return q("#fsHc input, #fsHc select, #fsHc textarea")};

  /* restaura lo ya llenado de la HC */
  if(R.hcVals){camposHc().forEach(function(el,i){var k=el.id||("#"+i),v=R.hcVals[k];if(v==null)return;if(el.type==="radio"||el.type==="checkbox")el.checked=!!v;else el.value=v})}

  var pintarEstado=function(){
    $("fsHc").disabled=R.hc||!esNef();
    $("hcPerm").hidden=R.hc||esNef();

    q("[data-usuario]").forEach(function(i){i.value=R.hc&&R.hcFirma?R.hcFirma.u:(esNef()?usuario():"—")});
    $("tabProg").hidden=true;pintarHcFlag();
    if(R.hc){
      $("hcEstado").className="nota ok";$("hcEstado").innerHTML="Firmada por <b>"+esc(R.hcFirma.u)+"</b> a las "+R.hcFirma.h+".";
      $("pgDat").innerHTML=datosGen(paciente("romero"),"22/10/2026 10:08:00","Dra. M. SALAZAR");
    }
    var nr=$("notaReq");$("btnGuardar").textContent=!R.hc&&R.hcGuard?"FINALIZAR":"GUARDAR";
    if(!R.hc&&R.hcGuard){nr.className="nota";nr.innerHTML='<b>Registro guardado</b> por '+esc(R.hcGuard.u)+' · '+R.hcGuard.h+' · <span class="st s2">EN ESPERA DE LA FIRMA DEL MÉDICO</span>'}
    if(R.atendidoOrden){nr.className="nota ok";nr.innerHTML='<b>Historia Clínica Inicial firmada.</b> La atención Nº 13 quedó ATENDIDA. '+(R.prog?'El Técnico de citas generó <b>'+R.prog.fechas.length+' citas</b>: cada sesión llegó al Módulo de Procedimientos Programados como su propia atención.':'El <b>Técnico de citas</b> programará las sesiones (citas múltiples) en GESTIÓN DE CITAS; cada cita llegará al Módulo de Procedimientos Programados.');$("btnGuardar").disabled=true;$("obsProc").readOnly=true}
  };
  /* Ventana emergente de la HISTORIA CLÍNICA INICIAL (servicio solicitante NEFROLOGÍA, una sola vez por paciente) */
  /* La ficha de la HC inicial se despliega dentro de NUEVA ATENCIÓN, debajo de su flag (ya no es ventana emergente) */
  var hcIn=$("hcInline");(function(){var hm=$("hcModal");while(hm.firstChild)hcIn.appendChild(hm.firstChild);$("hcX").hidden=true;$("veloHc").remove()})();
  var abrirHc=function(ir){irTab("nueva");hcIn.hidden=false;pintarHcFlag();if(ir!==false)setTimeout(function(){hcIn.scrollIntoView({behavior:"smooth",block:"start"})},30)};
  var cerrarHc=function(){hcIn.hidden=true;pintarHcFlag()};
  /* NUEVA ATENCIÓN: flag HISTORIA CLÍNICA INICIAL DEL PROGRAMA DE HEMODIÁLISIS (solo NEFROLOGÍA + 90935/90937), como receta, laboratorio o imagenología */
  function pintarHcFlag(){var el=$("naHc");if(!el)return;var ab=!hcIn.hidden;
    el.innerHTML='<div class="na-card"><div class="na-t">HISTORIA CLÍNICA INICIAL DEL PROGRAMA DE HEMODIÁLISIS</div>'+tgl("hcFlag",R.hc||ab,R.hc,"hcFlag")+
      (!R.hc&&R.hcGuard?'<span class="st s2">EN ESPERA DE FIRMA</span>':'')+(R.hc?'<span class="orig">firmada por '+esc(R.hcFirma.u)+' · '+R.hcFirma.h+'</span> <button type="button" class="btn sm k" id="hcVer">'+(ab?'Ocultar':'Ver')+'</button>':'')+'</div>'}
  document.addEventListener("change",function(e){if(e.target.id==="hcFlag"){if(e.target.checked)abrirHc();else cerrarHc()}});
  document.addEventListener("click",function(e){if(e.target.id==="hcVer"){if(hcIn.hidden)abrirHc();else cerrarHc()}});
  $("hcX").onclick=cerrarHc;
  /* «Atender» de una cita (Programación de turnos y citas): ventana emergente con el registro de esa cita */
  var abrirSes=function(i){$("sesTit").textContent="CITA Nº "+(22+i)+" · SESIÓN "+(i+1)+" DE "+R.prog.fechas.length+" · "+citasDe(R.prog)[i].f;$("sesFrame").src="atencion-sesion.html?p=romero&n="+i+"&modal=1";$("veloSes").classList.add("ver");document.body.style.overflow="hidden"};
  var cerrarSes=function(){if(!$("veloSes").classList.contains("ver"))return;location.hash="prog";location.reload()};
  /* PROGRAMACIÓN DE TURNOS Y CITAS: ventana emergente dentro de la misma atención (solo servicio NEFROLOGÍA, con la HC inicial firmada) */
  /* Con las citas ya guardadas, PROGRAMACIÓN DE TURNOS Y CITAS pasa a ser una pestaña (opción) que muestra solo las citas generadas */
  function modoTab(){if(!(R.prog&&R.atendidoOrden)||$("tabProg").getAttribute("data-tab"))return;
    var bx=q("#progModal > .box")[0],pn=q('[data-panel="prog"]')[0];if(!bx||!pn)return;
    pn.appendChild(bx);bx.classList.add("pg-tab");var tc=$("pgCal").closest(".tw");if(tc)tc.hidden=true;$("tabProg").setAttribute("data-tab","prog");$("veloProg").classList.remove("ver");document.body.style.overflow=""}
  var abrirProg=function(){if(!R.hc){abrirHc();return}if(R.prog&&R.atendidoOrden){modoTab();irTab("prog");return}if(!R.prog){location.href="citas.html?p=romero&ori=13";return}$("veloProg").classList.add("ver");$("progModal").scrollTop=0;document.body.style.overflow="hidden";menu()};
  var cerrarProg=function(){$("veloProg").classList.remove("ver");document.body.style.overflow="";if(location.hash)history.replaceState(null,"",location.pathname);menu()};
  $("progX").onclick=cerrarProg;$("tabProg").onclick=abrirProg;
  $("sesX").onclick=cerrarSes;
  window.addEventListener("message",function(e){if(e.data==="hd-cerrar")cerrarSes()});
  document.addEventListener("keydown",function(e){if(e.key!=="Escape"||$("velo").classList.contains("ver"))return;if($("veloSes").classList.contains("ver"))cerrarSes();else if($("veloProg").classList.contains("ver"))cerrarProg();});
  document.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("[data-atender]");if(b)abrirSes(+b.getAttribute("data-atender"))});
  refrescar=function(){pintarEstado();pintarGrilla()};

  /* La HC inicial se firma con el GUARDAR de NUEVA ATENCIÓN (ya no tiene botones propios) */
  var validarHc=function(){
    if(!esNef()){aviso("Solo un nefrólogo registra y firma la HC inicial.",true);return false}
    var faltan=q("#fsHc [data-req]").filter(function(i){i.classList.remove("err");return!i.value.trim()});
    if(faltan.length){faltan.forEach(function(i){i.classList.add("err")});faltan[0].focus();aviso("Complete los campos obligatorios de la HISTORIA CLÍNICA INICIAL marcados en rojo.",true);return false}
    var pa=$("hpa").value.split("/");
    if(pa.length!==2||+pa[0]<=+pa[1]){$("hpa").classList.add("err");$("hpa").focus();aviso("Revise la PA: la sistólica debe ser mayor que la diastólica.",true);return false}
    var vals={};camposHc().forEach(function(el,i){var k=el.id||("#"+i);vals[k]=(el.type==="radio"||el.type==="checkbox")?el.checked:el.value});
    return vals;
  };

  /* --- Programación de turnos y citas (grilla de la v2) --- */
  var SEMANA=["2026-10-26","2026-10-27","2026-10-28","2026-10-29","2026-10-30","2026-10-31"];
  var G={dia:0,sel:null};
  if(R.prog){G.sel={t:R.prog.turno,m:R.prog.maq};G.dia=R.prog.seq==="LMV"?0:1}
  var seqDia=function(){return[1,3,5].indexOf(iso2d(SEMANA[G.dia]).getDay())>=0?"LMV":"MJS"};
  var fechas=function(seq,desde,n){var dias=seq==="LMV"?[1,3,5]:[2,4,6],d=iso2d(desde),r=[],g=0;while(r.length<n&&g++<200){if(dias.indexOf(d.getDay())>=0)r.push(new Date(d));d.setDate(d.getDate()+1)}return r};
  function ocupante(seq,t,m){return PROGRAMADOS.filter(function(x){return x.seq===seq&&x.t===t&&x.m===m})[0]}
  function pintarGrilla(){
    if(!$("pgCal"))return;
    var seq=seqDia(),pos=(R.ser||"NEGATIVA")==="POSITIVA",bloq=!!R.prog||!R.hc;
    $("pgDias").innerHTML=SEMANA.map(function(f,i){var d=iso2d(f);return'<div data-dia="'+i+'" class="'+(i===G.dia?"on":"")+'" role="tab" tabindex="0">'+DSEM[d.getDay()]+' '+f2s(d).slice(0,5)+'</div>'}).join("");
    var ocup=0;TURNOS.forEach(function(t){MAQ.forEach(function(m,mi){if(ocupante(seq,t.id,mi)||(R.prog&&R.prog.seq===seq&&R.prog.turno===t.id&&R.prog.maq===mi))ocup++})});
    $("pgKpis").innerHTML='<div class="kpi"><div class="v">'+(seq==="LMV"?"L-M-V":"Ma-J-S")+'</div><div class="t">Secuencia del día</div></div><div class="kpi"><div class="v">'+ocup+' / 32</div><div class="t">Cupos ocupados (8 máquinas × 4 turnos)</div></div><div class="kpi ok"><div class="v">'+(32-ocup)+'</div><div class="t">Cupos libres</div></div><div class="kpi alerta"><div class="v">'+TURNOS.filter(function(t){return!t.med}).length+'</div><div class="t">Turnos sin nefrólogo</div></div>';
    $("pgCal").innerHTML='<tr><th>Máquina / puesto</th>'+TURNOS.map(function(t){return'<th>'+t.n+'<br><span style="font-weight:400">'+t.h+'</span><div class="prof" style="font-weight:400">'+(t.med?'Nef.: <b>'+t.med+'</b>':'<b style="color:#A94442">SIN NEFRÓLOGO</b>')+'<br>Enf.: <b>'+(t.enf||"—")+'</b></div></th>'}).join("")+'</tr>'+
      MAQ.map(function(m,mi){return'<tr><td><b>'+m+'</b></td>'+TURNOS.map(function(t){
        var o=ocupante(seq,t.id,mi);
        if(o)return'<td><div class="slot oc'+(o.pos?' iso':'')+'"><b>'+esc(o.n)+'</b>'+esc(o.i)+'</div></td>';
        var esSel=G.sel&&G.sel.t===t.id&&G.sel.m===mi&&(!R.prog||R.prog.seq===seq);
        if(esSel)return'<td><div class="slot '+(R.prog?'oc':'rep')+'"><b>SALAS VERA</b>'+(R.prog?'NUEVO EN EL PROGRAMA':'SELECCIONADO · por confirmar')+'</div></td>';
        if(bloq)return'<td><div class="slot" style="cursor:default;color:#999">Libre</div></td>';
        if(!t.med)return'<td><div class="slot" style="cursor:default;color:#A94442" title="No se da cita en un turno sin nefrólogo">Sin nefrólogo</div></td>';
        if(mi===ISO&&!pos)return'<td><div class="slot" style="cursor:default;color:#999">Solo serología (+)</div></td>';
        if(mi!==ISO&&pos)return'<td><div class="slot" style="cursor:default;color:#999">Libre (paciente requiere aislamiento)</div></td>';
        return'<td><button type="button" class="slot" data-t="'+t.id+'" data-m="'+mi+'">+ Asignar</button></td>'}).join("")+'</tr>'}).join("");
    /* formulario */
    $("pgSeq").value=R.prog?R.prog.seq:seq;
    var T=G.sel?TURNOS[G.sel.t-1]:null;
    $("pgTurTxt").value=T?T.n+" · "+T.h:"";$("pgMaqTxt").value=G.sel?MAQ[G.sel.m]:"";
    $("pgMed").value=T?T.med:"";$("pgEnf").value=T?T.enf:"";
    if(R.prog){$("pgHora").value=R.prog.hora;$("pgN").value=String(R.prog.fechas.length);$("pgDes").value=R.prog.desde}
    q("#pgForm .in").forEach(function(i){if(!i.readOnly)i.disabled=bloq});
    $("pgBtns").hidden=bloq;
    $("pgGuia").className=R.prog?"nota ok":"";
    if(R.prog)$("pgGuia").innerHTML="<b>Citas generadas:</b> "+(R.prog.seq==="LMV"?"L-M-V":"Ma-J-S")+" · "+TURNOS[R.prog.turno-1].n+" · "+MAQ[R.prog.maq]+".";
    pintarPrevia();
  }
  /* --- Lista de citas: cada cita se puede cambiar (fecha, turno, máquina, hora) --- */
  var nCitas=function(){var n=parseInt($("pgN").value,10);return n>=1&&n<=60&&String(n)===String($("pgN").value).trim()?n:0};
  function lista(){
    if(R.prog)return citasDe(R.prog);
    var n=nCitas();if(!G.sel||!$("pgDes").value||!n)return[];
    var key=[seqDia(),G.sel.t,G.sel.m,$("pgHora").value,$("pgDes").value,n].join("|");
    if(G.key!==key){if(G.key)cerrarCambio();G.key=key;G.citas=fechas(seqDia(),$("pgDes").value,n).map(function(d){return{f:f2s(d),t:G.sel.t,m:G.sel.m,h:$("pgHora").value,est:"POR GENERAR",hist:[]}})}
    return G.citas;
  }
  var EST_CLS={"POR GENERAR":"s1","MODIFICADA":"so","PROGRAMADA":"s4","REPROGRAMADA":"so"};
  function pintarPrevia(){
    var L=lista(),n=nCitas();
    $("pgNAyuda").innerHTML=$("pgN").value&&!n?'<b style="color:#A94442">Ingrese un número entero de 1 a 60</b>':"3 por semana · "+(n?("≈ "+(Math.round(n/3*10)/10)+" semanas"):"13 ≈ 1 mes");
    $("pgPrevTit").textContent=R.prog?"CITAS GENERADAS ("+L.length+")":"CITAS QUE SE GENERARÁN"+(L.length?" ("+L.length+")":"");
    var gen=!!R.prog;
    $("pgPrev").innerHTML='<tr><th>Sesión</th><th>N° de cita</th><th>Fecha</th><th>Día</th><th>Turno</th><th>Hora</th><th>Máquina</th><th>Estado de la cita</th><th style="width:190px">Acciones</th></tr>'+
      (L.map(function(c,i){var d=s2d(c.f),T=TURNOS[c.t-1],se=gen?sesEst(i):{},er=gen?estadoReg(se.reg,se.atendidoSes):null;
        var cerrada=gen&&(se.atendidoSes||(se.reg&&se.reg.fin)),iniciada=gen&&se.reg&&se.reg.ini;
        /* Estado: el de la cita y, si su registro ya empezó, el avance de los 3 tiempos */
        var est=se.atendidoSes?["s4","ATENDIDA"]:iniciada||cerrada?er:[EST_CLS[c.est]||"s1",c.est];
        var h=c.hist.length?'<div class="prof">Venía del '+esc(c.hist[c.hist.length-1].de)+' · '+esc(c.hist[c.hist.length-1].mot)+' · '+esc(c.hist[c.hist.length-1].u)+' '+c.hist[c.hist.length-1].h+'</div>':'';
        /* Enlace cita → registro de la sesión: «Atender» abre el registro de ESA cita (3 tiempos: médico → enfermería → médico) */
        var url='atencion-sesion.html?p=romero&n='+i;
        var atender=!gen?'':!R.atendidoOrden?'<button type="button" class="btn sm g" disabled title="Se habilita al GUARDAR la atención Nº 13">Atender</button>'
          :'<button type="button" class="btn sm '+(cerrada?'k':'g')+'" data-atender="'+i+'">'+(cerrada?'Ver registro':iniciada?'Continuar':'Atender')+'</button>';
        var cambiar=cerrada||iniciada?'':'<button type="button" class="btn sm o" data-cambiar="'+i+'">Cambiar</button>';
        return'<tr'+(c.hist.length?' class="nuevo"':'')+'><td><b>'+(i+1)+' / '+L.length+'</b></td><td>'+(gen?'<b>Nº '+(22+i)+'</b>':'—')+'</td><td>'+c.f+'</td><td>'+DSEM[d.getDay()]+'</td><td>'+T.n+'</td><td>'+esc(c.h)+'</td><td>'+MAQ[c.m]+'</td><td><span class="st '+est[0]+'">'+est[1]+'</span>'+h+'</td><td class="nw"><div style="display:flex;gap:6px">'+atender+cambiar+'</div></td></tr>'}).join("")||
       '<tr><td colspan="9" class="vacio">'+(G.sel?'Indique la vigencia y el N° de citas.':'Elija un cupo libre «+ Asignar» en la grilla.')+'</td></tr>');
    if($("pgFin"))$("pgFin").hidden=!(R.prog&&!R.atendidoOrden);
    return L;
  }
  /* Con las sesiones programadas se guarda la atención Nº 13 desde la misma ventana */
  document.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("button");if(!b)return;
    if(b.id==="pgCerrar")$("progX").click();
    if(b.id==="pgGuardarAt")$("btnGuardar").click()});
  var MOT_CAMBIO=["PACIENTE NO PUEDE ASISTIR EN ESA FECHA","FERIADO","MANTENIMIENTO / FALLA DE MÁQUINA","CAMBIO DE TURNO SOLICITADO POR EL PACIENTE","INDICACIÓN MÉDICA","OTRO"];
  function seqDe(fecha){var g=s2d(fecha).getDay();return g===0?null:[1,3,5].indexOf(g)>=0?"LMV":"MJS"}
  /* --- Ventana emergente «Cambiar cita» --- */
  var origenFoco=null;
  function cerrarCambio(){var v=$("velo");if(!v||!v.classList.contains("ver"))return;v.classList.remove("ver");$("pgEdit").innerHTML="";document.body.style.overflow="";if(origenFoco&&document.contains(origenFoco))origenFoco.focus();origenFoco=null}
  $("velo").addEventListener("mousedown",function(e){if(e.target===this)cerrarCambio()});
  document.addEventListener("keydown",function(e){if(e.key==="Escape")cerrarCambio()});
  function abrirCambio(i){
    var L=lista(),c=L[i],T=TURNOS[c.t-1];
    origenFoco=document.activeElement;
    $("pgEdit").innerHTML='<div class="bar"><span id="cbTit">CAMBIAR CITA · SESIÓN '+(i+1)+' DE '+L.length+(R.prog?' · Nº '+(22+i):'')+'</span><span class="tag">reprogramación</span><button type="button" class="btn sm k" id="cbX" aria-label="Cerrar" style="margin-left:8px">✕</button></div><div class="box">'+
      '<div class="pac"><span>Paciente: <b>SALAS VERA DE PONCE, MARTHA LUCIA</b></span><span>Cita actual: <b>'+c.f+' · '+DSEM[s2d(c.f).getDay()]+' · '+T.n+' '+esc(c.h)+' · '+MAQ[c.m]+'</b></span></div>'+
      '<div class="row"><div class="f"><label for="cbF">Nueva fecha <i>*</i></label><input class="in" id="cbF" type="date" min="2026-10-22" value="'+d2iso(s2d(c.f))+'"></div>'+
      '<div class="f2"><label for="cbT">Turno <i>*</i></label><select class="in" id="cbT">'+TURNOS.map(function(t){return'<option value="'+t.id+'"'+(t.id===c.t?' selected':'')+(t.med?'':' disabled')+'>'+t.n+' · '+t.h+(t.med?'':' · SIN NEFRÓLOGO')+'</option>'}).join("")+'</select></div>'+
      '<div class="f"><label for="cbH">Hora de inicio <i>*</i></label><input class="in" id="cbH" type="time" value="'+esc(c.h)+'"></div>'+
      '<div class="f2"><label for="cbM">Máquina <i>*</i></label><select class="in" id="cbM"></select></div></div>'+
      '<div class="row"><div class="f2"><label for="cbMot">Motivo del cambio <i>*</i></label><select class="in" id="cbMot">'+opts(MOT_CAMBIO)+'</select></div><div class="f3"><label for="cbDet">Detalle</label><input class="in" id="cbDet" placeholder="Ej.: el paciente tiene control en otro hospital ese día"></div></div>'+
      '<div class="row"><div class="f3"><label>Alcance</label><div class="ops"><label class="ck"><input type="radio" name="cbAl" id="cbAl0" checked> Solo esta cita</label><label class="ck"><input type="radio" name="cbAl" id="cbAl1"> Esta y las siguientes (turno, máquina y hora; las fechas se mantienen)</label></div></div></div>'+
      '<div id="cbMsg"></div><div class="acciones"><button type="button" class="btn g" style="flex:1" id="cbOk" data-i="'+i+'">Guardar cambio</button><button type="button" class="btn k" style="flex:.4" id="cbNo">Cancelar</button></div>'+'</div>';
    llenarMaqCambio(c);
    $("cbF").onchange=$("cbT").onchange=function(){if(this.id==="cbT")$("cbH").value=TURNOS[+$("cbT").value-1].h.slice(0,5);llenarMaqCambio(c)};
    $("velo").classList.add("ver");$("pgEdit").scrollTop=0;document.body.style.overflow="hidden";$("cbF").focus();
  }
  function llenarMaqCambio(c){
    var f=$("cbF").value?f2s(iso2d($("cbF").value)):"",seq=f?seqDe(f):null,t=+$("cbT").value,pos=(R.ser||"NEGATIVA")==="POSITIVA",prev=$("cbM").value;
    $("cbMsg").innerHTML=f&&!seq?'<div class="nota err">No hay atención de hemodiálisis los domingos.</div>':"";
    var l=!seq?[]:[0,1,2,3,4,5,6,7].filter(function(m){return!ocupante(seq,t,m)&&(pos?m===ISO:m!==ISO)});
    $("cbM").innerHTML=l.map(function(m){return'<option value="'+m+'">'+MAQ[m]+'</option>'}).join("")||'<option value="">SIN CUPO</option>';
    if(prev!==""&&l.indexOf(+prev)>=0)$("cbM").value=prev;else if(l.indexOf(c.m)>=0)$("cbM").value=String(c.m);
  }
  function guardarCambio(i){
    var L=lista(),c=L[i];
    if(!$("cbF").value){$("cbMsg").innerHTML='<div class="nota err">Ingrese la nueva fecha.</div>';return}
    var f=f2s(iso2d($("cbF").value)),t=+$("cbT").value,T=TURNOS[t-1],m=$("cbM").value,h=$("cbH").value,mot=$("cbMot").value,det=$("cbDet").value.trim();
    if(!seqDe(f)){$("cbMsg").innerHTML='<div class="nota err">No hay atención de hemodiálisis los domingos.</div>';return}
    if(!T.med){$("cbMsg").innerHTML='<div class="nota err">El '+T.n+' no tiene nefrólogo asignado.</div>';return}
    if(m===""){$("cbMsg").innerHTML='<div class="nota err">No hay máquinas libres en ese turno para esa fecha. Elija otro turno u otra fecha.</div>';return}
    if(!h){$("cbMsg").innerHTML='<div class="nota err">Ingrese la hora de inicio.</div>';return}
    if(L.some(function(x,j){return j!==i&&x.f===f})){$("cbMsg").innerHTML='<div class="nota err">El paciente ya tiene otra cita el '+f+'.</div>';return}
    if(mot==="OTRO"&&!det){$("cbMsg").innerHTML='<div class="nota err">Describa el motivo en «Detalle».</div>';return}
    if(f===c.f&&t===c.t&&+m===c.m&&h===c.h){$("cbMsg").innerHTML='<div class="nota err">No hay cambios respecto a la cita actual.</div>';return}
    var reg=function(x,nf){x.hist.push({de:x.f+" · "+TURNOS[x.t-1].n+" · "+MAQ[x.m],mot:mot+(det?" ("+det+")":""),u:usuario(),h:ahora()});x.f=nf;x.t=t;x.m=+m;x.h=h;x.est=R.prog?"REPROGRAMADA":"MODIFICADA"};
    reg(c,f);
    if($("cbAl1").checked)L.forEach(function(x,j){if(j>i)reg(x,x.f)});
    L.sort(function(a,b){return s2d(a.f)-s2d(b.f)});
    if(R.prog){R.prog.fechas=L.map(function(x){return x.f});guardar()}
    origenFoco=null;cerrarCambio();pintarPrevia();menu();
    aviso("Cita cambiada al "+f+" · "+T.n+" · "+MAQ[+m]+".");
  }
  document.addEventListener("click",function(e){
    var b=e.target.closest("[data-cambiar]");if(b){abrirCambio(+b.getAttribute("data-cambiar"));return}
    if(e.target.id==="cbNo"||e.target.id==="cbX"){cerrarCambio();return}
    if(e.target.id==="cbOk")guardarCambio(+e.target.getAttribute("data-i"));
  });
  document.addEventListener("click",function(e){
    var d=e.target.closest("#pgDias [data-dia]");
    if(d){if(R.prog){aviso("Las citas ya fueron generadas.",true);return}G.dia=+d.getAttribute("data-dia");G.sel=null;pintarGrilla();return}
    var s=e.target.closest("#pgCal button.slot");
    if(s){var t=+s.getAttribute("data-t"),m=+s.getAttribute("data-m"),T=TURNOS[t-1];
      if(!T.med){aviso("El "+T.n+" no tiene nefrólogo asignado en el rol de turnos. No se puede dar cita en ese turno.",true);$("pgMsg").innerHTML='<div class="nota err">El '+T.n+' no tiene nefrólogo asignado. Elija otro turno o asigne al nefrólogo en el rol de turnos. (En pruebas, la cita del Consultorio 175 se generó con el campo Médico vacío.)</div>';return}
      $("pgMsg").innerHTML="";G.sel={t:t,m:m};$("pgHora").value=T.h.slice(0,5);pintarGrilla();aviso("Cupo seleccionado: "+T.n+" · "+MAQ[m]+". Revise la vigencia y confirme.")}
  });
  /* Si cambian los parámetros se regenera la lista (y se cierra el panel «Cambiar»); si no, se conserva */
  var siCambia=function(){var k=G.key;if(R.prog)return;lista();if(G.key!==k)pintarPrevia();else{var n=nCitas();$("pgNAyuda").innerHTML=$("pgN").value&&!n?'<b style="color:#A94442">Ingrese un número entero de 1 a 60</b>':"3 por semana · "+(n?("≈ "+(Math.round(n/3*10)/10)+" semanas"):"13 ≈ 1 mes")}};
  ["pgDes","pgN","pgHora"].forEach(function(id){$(id).addEventListener("change",siCambia)});
  $("pgN").addEventListener("input",function(){$("pgN").classList.remove("err");siCambia()});
  /* Secuencia de la terapia: L-M-V muestra la grilla del lunes, Ma-J-S la del martes */
  $("pgSeq").addEventListener("change",function(){G.dia=$("pgSeq").value==="LMV"?0:1;G.sel=null;pintarGrilla();aviso("Secuencia "+($("pgSeq").value==="LMV"?"L-M-V":"Ma-J-S")+": elija un cupo libre en la grilla.")});
  $("btnGenerar").onclick=function(){
    if(!G.sel){aviso("Elija un cupo libre «+ Asignar» en la grilla.",true);return}
    if(!$("pgHora").value){aviso("Ingrese la hora de inicio.",true);return}
    if(!$("pgDes").value){aviso("Ingrese la fecha de inicio de la vigencia.",true);return}
    if(!nCitas()){$("pgN").classList.add("err");$("pgN").focus();aviso("Ingrese el N° de citas: un número entero de 1 a 60.",true);return}
    var L=pintarPrevia();
    var citas=L.map(function(c){return{f:c.f,t:c.t,m:c.m,h:c.h,est:c.est==="MODIFICADA"?"REPROGRAMADA":"PROGRAMADA",hist:c.hist}});
    R.prog={seq:seqDia(),turno:G.sel.t,maq:G.sel.m,hora:$("pgHora").value,desde:$("pgDes").value,citas:citas,fechas:citas.map(function(c){return c.f})};
    cerrarCambio();guardar();pintarEstado();pintarGrilla();window.scrollTo(0,0);
    if(R.hc){guardarAtencion();aviso(citas.length+" citas generadas y atención Nº 13 guardada.")}else aviso(citas.length+" citas generadas en el Módulo de Procedimientos Programados.");
  };

  /* GUARDAR → el registro queda EN ESPERA DE LA FIRMA DEL MÉDICO y el botón pasa a FINALIZAR (como en SIGESAPOL) */
  $("btnGuardar").onclick=function(){
    if(!R.hc){
      if(hcIn.hidden&&!R.hcGuard){aviso("Active y complete la HISTORIA CLÍNICA INICIAL DEL PROGRAMA DE HEMODIÁLISIS.",true);abrirHc();return}
      var v=validarHc();if(!v){abrirHc();return}R.hcVals=v;
      if(!R.hcGuard){R.hcGuard={u:usuario(),h:ahora()};guardar();pintarEstado();aviso("Registro guardado. En espera de la firma del médico: pulse FINALIZAR.");return}
      R.hc=true;R.hcFirma={u:usuario(),h:ahora()};R.ser=NA&&NA.serologia?NA.serologia():"NEGATIVA";
      R.atendidoOrden=true;guardar();pintarEstado();pintarGrilla();cerrarHc();menu();aviso("Historia Clínica Inicial firmada. La atención Nº 13 quedó ATENDIDA; el Técnico de citas programará las sesiones en GESTIÓN DE CITAS.");return}
    if(!R.prog){aviso("Programe las sesiones en el MÓDULO DE GESTIÓN DE CITAS antes de guardar.",true);setTimeout(function(){location.href="citas.html?p=romero&ori=13"},1200);return}
    guardarAtencion();
  };
  function guardarAtencion(){
    R.atendidoOrden=true;guardar();pintarEstado();pintarPrevia();menu();if(R.prog){modoTab();irTab("prog");window.scrollTo(0,0)}
    aviso("Atención guardada. El Nº 13 quedó ATENDIDO y la primera sesión (Nº 22) ya está en la bandeja.")}
  $("pgCancel").onclick=function(){cerrarProg()};

  pintarEstado();pintarGrilla();
  /* Regla de «Atender»: la pestaña que se abre depende de la situación del paciente.
     Desde el menú lateral (2. Historia clínica inicial / 3. Programación y citas) llega con #hc o #prog. */
  /* Campos nuevos de NUEVA ATENCIÓN (receta, laboratorio, imagenología) */
  var DX_HD=["Z49.2 - OTRAS DIALISIS","N18.5 - INSUFICIENCIA RENAL CRÓNICA ESTADIO 5","I10 - HIPERTENSIÓN ESENCIAL (PRIMARIA)","D63.8 - ANEMIA EN OTRAS ENFERMEDADES CRÓNICAS"];
  NA=nuevaAtencion({dx:DX_HD,paq:{t:"Exámenes de la HC inicial del Programa HD",l:NA_PAQ.ingreso},paqAuto:true,
    sugProd:{t:"＋ Traer receta de la atención origen",f:function(){return ORIGEN_AT.romero.rx.map(function(x){return{p:x[0],d:x[1],v:"Oral",pos:x[2],q:x[1]}})}}});
  var pintarHapp=function(){var pr=R.prog,h='<tr><th>N°</th><th>Fecha</th><th>Servicio</th><th>Procedimiento</th><th>Responsable</th><th>Estado</th></tr>';
    if(pr&&R.atendidoOrden)h+=citasDe(pr).map(function(c,i){var e=estadoReg((sesEst(i)||{}).reg,(sesEst(i)||{}).atendidoSes);return'<tr><td>'+(22+i)+'</td><td>'+c.f+' '+esc(c.h)+'</td><td>NEFROLOGÍA</td><td>90937 · sesión '+(i+1)+' de '+pr.fechas.length+'</td><td class="prof">'+TURNOS[c.t-1].med+'</td><td><span class="st '+(e[1]==="POR INICIAR"?"s0":e[0])+'">'+(e[1]==="POR INICIAR"?"PROGRAMADA":e[1])+'</span></td></tr>'}).join("");
    else h+='<tr><td colspan="6" class="vacio">Sin atenciones previas de procedimientos programados. Las sesiones aparecen aquí al GUARDAR esta atención.</td></tr>';
    if($("histApp"))$("histApp").innerHTML='<div class="tw"><table>'+h+'</table></div>'};
  pintarHapp();document.addEventListener("click",function(e){if(e.target.closest&&e.target.closest("#btnGuardar"))setTimeout(pintarHapp,0)});
  var abrirTab=function(){
    var h=location.hash.replace("#","");
    /* Primera atención del paciente en Nefrología: al ingresar SIEMPRE se muestra la HC inicial (una sola vez por paciente) */
    if(!R.hc){irTab("nueva");abrirHc(false);return}
    if(h==="hc"){irTab("nueva");abrirHc();return}
    irTab("nueva");
  };
  window.addEventListener("hashchange",abrirTab);
  window.addEventListener("pageshow",function(e){if(e.persisted)location.reload()});
  setTimeout(abrirTab,0);
}

/* =====================================================================
   3. ATENCIÓN DE UNA CITA DEL PROGRAMA · SESIÓN DE HEMODIÁLISIS EN 3 TIEMPOS
   ===================================================================== */
var NOHD={nom:"PAREDES LUNA, ANA MARIA",dni:"10457732",fnac:"11/09/1975",edad:"51 A",sexo:"FEMENINO",par:"CÓNYUGE",grado:"—",cita:"23/10/2026 08:30",ate:"23/10/2026 08:41",serv:"CARDIOLOGÍA",med:"Dr. R. CHAVEZ"};
var REGISTRADAS=[{n:"5817403",cita:"01/09/2026 08:44",nom:"QUISPE LLANOS, ROSA ELVIRA",dni:"40112233",med:"Dr. A. RAMIREZ TELLO",mdni:"41223344"},
    {n:"5816923",cita:"01/09/2026 06:39",nom:"HUAMAN SOTO, JULIO CESAR",dni:"40556677",med:"Dra. M. SALAZAR",mdni:"41998877"},
    {n:"5810612",cita:"31/08/2026 10:08",nom:"CARDENAS RUIZ, ELSA MARINA",dni:"40889900",med:"Dr. J. PAREDES",mdni:"41334455"}];
/* Búsqueda por DNI desde «NUEVO» del Módulo de Enfermería: decide qué nota se abre */
function pacStd(dni){
  var l=[NOHD,OTROS.card,OTROS.bio].concat(REGISTRADAS.map(function(r){return{nom:r.nom,dni:r.dni,fnac:"—",edad:"—",sexo:"—",par:"TITULAR",grado:"—",serv:"NEFROLOGÍA",med:r.med}}));
  var x=l.filter(function(y){return y.dni===dni})[0];if(!x)return null;
  return{nom:x.nom,dni:x.dni,fnac:x.fnac,edad:x.edad,sexo:x.sexo,par:x.par,grado:x.grado||"—",serv:x.serv,med:String(x.med||(ORIGEN_AT[x===OTROS.card?"card":x===OTROS.bio?"bio":""]||{}).med||"[médico]").split(" · ")[0],dx:x.dx||(x.serv==="CARDIOLOGÍA"?"I50.0":"Z00.0")}}
function buscarDni(dni){
  var hd=function(clave,ests){/* ests: [[est,n]] */
    var hab=ests.filter(function(x){var r=x[0].reg||{};return r.ini&&!r.enf&&!x[0].atendidoSes})[0];
    if(hab)return{url:"enfermeria-nota.html?p="+clave+(clave==="romero"?"&n="+hab[1]:"")};
    return{err:"El paciente pertenece al Programa de Hemodiálisis (NEFROLOGÍA): la EVOLUCIÓN DE ENFERMERÍA se habilita cuando el nefrólogo firma la I.1 EVALUACIÓN INICIAL de su cita."}};
  if(dni===paciente("gutierrez").dni)return hd("gutierrez",[[EST.gutierrez,0]]);
  if(dni===paciente("romero").dni){var pr=EST.romero.prog;if(pr&&EST.romero.atendidoOrden)return hd("romero",pr.fechas.map(function(f,j){return[sesEst(j),j]}));
    return{err:"El paciente aún no tiene citas de hemodiálisis programadas."}}
  if(pacStd(dni))return{url:"enfermeria-nota.html?p=nohd&d="+dni};
  return null}
/* Nota de enfermería de un paciente que NO es de Nefrología / hemodiálisis: nota estándar, sin la pestaña de hemodiálisis */
if(PAGINA==="enfnota"&&param("p")==="nohd"){
  var X=pacStd(param("d")||NOHD.dni)||NOHD;EST.notasStd=EST.notasStd||[];var YA=EST.notasStd.filter(function(z){return z.dni===X.dni})[0];
  var ro=function(l,v,c){return'<div class="'+(c||"f")+'"><label>'+l+'</label><input class="in" readonly value="'+esc(v)+'"></div>'};
  var ed=function(l,id,c,v){return'<div class="'+(c||"f")+'"><label for="'+id+'">'+l+'</label><input class="in" id="'+id+'" value="'+esc(v||"")+'"></div>'};
  q('[data-p="cita"]').forEach(function(e){e.textContent="consulta externa · "+X.serv});
  q('[data-nt="hd"],[data-ntp="hd"],#guardaHc,[data-panel="nueva"] .sub .orig').forEach(function(e){e.remove()});
  document.addEventListener("input",function(e){if(e.target.classList)e.target.classList.remove("err")});
  $("enfAte").innerHTML='<div class="row">'+ro("Tipo de atención","CONSULTA EXTERNA")+ro("Servicio",X.serv)+ro("IPRESS","HOSPITAL NACIONAL PNP LUIS N. SAENZ","f2")+ro("Número de historia","[N° HC]")+'</div><div class="row">'+ro("Tipo de documento","DNI")+ro("N° de documento",X.dni)+ro("Fecha y hora de atención *",YA?YA.fecha+" "+YA.hora:f2s(new Date()).replace(/-/g,"/")+" "+ahora(),"f2")+'</div>';
  $("enfPac").innerHTML='<div class="row">'+ro("Tipo de documento","DNI")+ro("Sexo",X.sexo)+ro("Apellidos y nombres",X.nom,"f2")+ro("Fecha de nacimiento",X.fnac)+'</div><div class="row">'+ro("Parentesco",X.par)+ro("Grado",X.grado)+ro("Edad",X.edad)+'</div>';
  $("enfResp").innerHTML='<div class="row">'+ro("Tipo y N° de documento","DNI - [Nº]")+ro("Apellidos y nombres",usuario(),"f2")+ro("Especialidad","ENFERMERÍA")+ro("Profesión","LICENCIADO(A) EN ENFERMERÍA")+ro("N° de colegiatura (CEP)","087412")+'</div>';
  $("enfMed").innerHTML='<div class="row">'+ro("Tipo y N° de documento","DNI - [Nº]")+ro("Apellidos y nombres",X.med,"f2")+ro("Especialidad",X.serv)+ro("CMP","038812")+ro("RNE","—")+'</div>';
  $("enfRx").innerHTML='<tr><th>N</th><th>Producto</th><th>Un. med.</th><th>Cant.</th><th>Días</th><th>Vía</th><th>Posología</th></tr><tr><td colspan="7" class="vacio">Sin receta.</td></tr>';
  $("enfSv").innerHTML='<div class="row">'+ed("PA sistólica (mmHg)","sv1")+ed("PA diastólica (mmHg)","sv2")+ed("Pulso / FC (lpm)","sv3")+ed("FR (rpm)","sv4")+ed("FIO2 (%)","sv5","f","21")+'</div><div class="row">'+ed("SAO2 (%)","sv6")+ed("Temperatura (°C)","sv7")+ed("Talla (cm)","sv8")+ed("Peso (kg)","sv9")+ed("IMC","sv10")+'</div>';
  $("enfAnt").innerHTML='<div class="row"><div class="f3"><label for="an1">Antecedentes</label><textarea class="in" id="an1"></textarea></div></div><div class="row">'+["HTA","DM","Alergia","Hemodiálisis"].map(function(t,i){return'<div class="f"><label>'+t+'</label><div class="ops"><label class="ck"><input type="radio" name="ant'+i+'"> SÍ</label><label class="ck"><input type="radio" name="ant'+i+'" checked> NO</label></div></div>'}).join("")+'</div>';
  $("enfCpms").innerHTML='<div class="tw"><table><tr><th>Código</th><th>Procedimiento</th><th>Cantidad</th><th>Diagnóstico</th></tr><tr><td>99206</td><td>ATENCIÓN DE ENFERMERÍA EN II, III NIVEL DE ATENCIÓN</td><td>1</td><td>'+X.dx+'</td></tr></table></div>';
  $("enfHist").innerHTML='<div class="tw"><table><tr><th>Fecha</th><th>Nota</th><th>Enfermera(o)</th></tr><tr><td colspan="3" class="vacio">Sin notas anteriores.</td></tr></table></div>';
  var nt=function(n){q(".nt-tabs [data-nt]").forEach(function(t){t.classList.toggle("on",t.getAttribute("data-nt")===n)});q("[data-ntp]").forEach(function(p){p.hidden=p.getAttribute("data-ntp")!==n})};
  document.addEventListener("click",function(e){var t=e.target.closest(".nt-tabs [data-nt]");if(t)nt(t.getAttribute("data-nt"));if(e.target.id==="sign2"){if(!esEnf()){aviso("Solo enfermería registra la nota.",true);return}
      if(!$("sv1").value.trim()||!$("sv2").value.trim()){aviso("Registre la presión arterial en SIGNOS VITALES.",true);nt("sv");$("sv1").classList.add("err");return}
      var vv=function(id){return($(id)||{}).value||""};
      if(!STD_G){STD_G={u:usuario(),h:ahora()};estEsp(STD_G);aviso("Registro guardado. En espera de la firma: pulse FINALIZAR.");return}
      estEsp(null);EST.notasStd.push({id:String(461000+EST.notasStd.length+1),dni:X.dni,nom:X.nom,serv:X.serv,med:X.med,dx:X.dx,fecha:f2s(new Date()).replace(/-/g,"/"),hora:ahora(),u:usuario(),
        pac:{nom:X.nom,dni:X.dni,fnac:X.fnac,par:X.par,grado:X.grado,sexo:X.sexo,edadN:parseInt(X.edad,10)||"",com:vv("an1")||"—",ale:"—"},
        vit:{pa:vv("sv1")+"/"+vv("sv2"),fc:vv("sv3"),fr:vv("sv4"),fio2:vv("sv5"),so2:vv("sv6"),temp:vv("sv7"),talla:vv("sv8"),pi:vv("sv9")},obs:vv("enfObs")});guardar();
      e.target.disabled=true;aviso("Nota de enfermería firmada y guardada. Ya figura en REGISTRADOS.");setTimeout(function(){location.href="enfermeria.html?est=REG"},1500)}});
  if(YA&&$("sign2"))$("sign2").disabled=true;
  nt("sv");irTab("nueva");
}
/* NUEVO: nota de enfermería de un paciente nuevo. Se ingresa el DNI y «BUSCAR CITA» abre la nota que corresponde
   (Nefrología / hemodiálisis con la I.1 firmada → con EVOLUCIÓN DE ENFERMERÍA · HEMODIÁLISIS; otro servicio → nota estándar) */
if(PAGINA==="enfnota"&&!param("p")){
  q('[data-p="cita"]').forEach(function(e){e.textContent="nuevo registro"});
  /* Ficha completa de la NOTA DE ENFERMERÍA - CONSULTA EXTERNA, vacía hasta buscar la cita del paciente */
  q('[data-nt="hd"],[data-ntp="hd"],#guardaHc,#enfEstado,[data-panel="nueva"] .sub .orig').forEach(function(e){e.remove()});
  var vac=function(l,c){return'<div class="'+(c||"f")+'"><label>'+l+'</label><input class="in" readonly></div>'},ro=function(l,v,c){return'<div class="'+(c||"f")+'"><label>'+l+'</label><input class="in" readonly value="'+esc(v)+'"></div>'};
  var dis=function(l,c){return'<div class="'+(c||"f")+'"><label>'+l+'</label><input class="in" disabled></div>'};
  $("enfPac").innerHTML='<div class="row">'+vac("Tipo de doc de identidad *")+vac("Sexo")+vac("Apellido paterno")+vac("Apellido materno")+vac("Nombres")+'</div><div class="row">'+vac("Fecha de nacimiento")+vac("Parentesco")+vac("Grado")+'<div class="f2"></div></div>';
  $("enfResp").innerHTML='<div class="row">'+ro("Tipo de doc de identidad *","DNI")+ro("Documento de identidad *",(ENFERMERAS[usuario()]||{}).dni||"[Nº]")+ro("Apellidos y nombres",usuario(),"f2")+ro("Especialidad","ENFERMERÍA")+'</div><div class="row">'+ro("Profesión","LICENCIADO(A) EN ENFERMERÍA")+ro("N° de colegiatura",(ENFERMERAS[usuario()]||{}).cep||"")+'<div class="f3"></div></div>';
  $("enfMed").innerHTML='<div class="row">'+vac("Tipo y N° de documento")+vac("Apellidos y nombres","f2")+vac("Especialidad")+vac("CMP")+vac("RNE")+'</div>';
  $("enfRx").innerHTML='<tr><th>N</th><th>Producto</th><th>Un. med.</th><th>Cant.</th><th>Días</th><th>Vía</th><th>Posología</th></tr><tr><td colspan="7" class="vacio">Se carga al buscar la cita.</td></tr>';
  $("enfSv").innerHTML='<div class="row">'+dis("Presión arterial")+dis("Pulso / frec. cardiaca")+dis("Frec. respiratoria (/min)")+dis("FIO2 (%)")+dis("SAO2 (%)")+dis("Temperatura (°C)")+'</div><div class="row">'+dis("Talla (cm)")+dis("Peso (kg)")+dis("IMC")+dis("Peso ideal")+'<div class="f2"></div></div>';
  $("enfAnt").innerHTML='<div class="row"><div class="f3"><label>Antecedentes</label><textarea class="in" disabled></textarea></div></div>';
  $("enfCpms").innerHTML='<div class="tw"><table><tr><th>Código</th><th>Procedimiento</th><th>Cantidad</th><th>Diagnóstico</th></tr><tr><td colspan="4" class="vacio">Sin procedimientos.</td></tr></table></div>';
  $("enfHist").innerHTML='<div class="tw"><table><tr><th>ID</th><th>Servicio</th><th>Fecha</th></tr><tr><td colspan="3" class="vacio">Busque la cita del paciente.</td></tr></table></div>';
  if($("enfObs"))$("enfObs").disabled=true;
  var ntn=function(n){q(".nt-tabs [data-nt]").forEach(function(t){t.classList.toggle("on",t.getAttribute("data-nt")===n)});q("[data-ntp]").forEach(function(p){p.hidden=p.getAttribute("data-ntp")!==n})};
  document.addEventListener("click",function(e){var t=e.target.closest(".nt-tabs [data-nt]");if(t)ntn(t.getAttribute("data-nt"));if(e.target.id==="sign2"){aviso("Primero ingrese el DNI del paciente y pulse BUSCAR CITA.",true);$("naDni").focus()}});
  ntn("sv");
  var sel=function(l,id,o,c){return'<div class="'+(c||"f")+'"><label for="'+id+'">'+l+'</label><select class="in" id="'+id+'">'+opts(o)+'</select></div>'};
  $("enfAte").innerHTML='<div class="row">'+sel("Tipo de la atención","naTipo",["CONSULTA EXTERNA"])+sel("Servicio","naServ",["NEFROLOGÍA","CARDIOLOGÍA","MEDICINA INTERNA","ODONTOLOGÍA"])+sel("IPRESS donde se atendió","naIpress",["HOSPITAL NACIONAL PNP LUIS N. SAENZ"],"f2")+'</div>'+
    '<div class="row"><div class="f"><label>Tipo de documento de identidad</label><select class="in"><option>DNI</option><option>CARNÉ DE EXTRANJERÍA</option></select></div><div class="f2"><label for="naDni">N° de documento de identidad *</label><div style="display:flex;gap:6px"><input class="in" id="naDni" inputmode="numeric" maxlength="8" placeholder="Ingrese el DNI"><button type="button" class="btn k" id="naBuscar">BUSCAR CITA</button></div></div>'+
    '<div class="f"><label>Fecha de atención *</label><input class="in" readonly value="'+f2s(new Date())+'"></div><div class="f"><label>Hora de atención *</label><input class="in" readonly value="'+ahora()+'"></div></div><div id="naMsg"></div>';
  var buscar=function(){var d=$("naDni").value.trim();if(!/^\d{8}$/.test(d)){aviso("Ingrese un DNI de 8 dígitos.",true);$("naDni").classList.add("err");return}
    var r=buscarDni(d);if(!r){$("naMsg").innerHTML='<div class="nota err">No se encontró una cita de consulta externa para el DNI '+esc(d)+'.</div>';return}
    if(r.err){$("naMsg").innerHTML='<div class="nota err">'+esc(r.err)+'</div>';return}
    location.href=r.url};
  $("naBuscar").onclick=buscar;$("naDni").addEventListener("keydown",function(e){if(e.key==="Enter")buscar()});$("naDni").focus();
  irTab("nueva");
}
if(PAGINA==="sesion"||(PAGINA==="enfnota"&&param("p")&&param("p")!=="nohd")){
  /* La misma lógica sirve a dos pantallas:
     · atencion-sesion.html (Módulo de Procedimientos Programados): I.1 y I.2 del nefrólogo + resultados de enfermería.
     · enfermeria-nota.html (Módulo de Enfermería): EVOLUCIÓN DE ENFERMERÍA (ficha 0026_04), se habilita al firmar la I.1. */
  var ENF=PAGINA==="enfnota";
  /* Abierta desde «Atender» de Programación de turnos y citas: solo el registro de la cita, en ventana emergente */
  var MODAL=param("modal")==="1";if(MODAL)document.body.classList.add("en-modal");
  function cerrarModal(){if(MODAL&&window.parent!==window)setTimeout(function(){try{window.parent.postMessage("hd-cerrar","*")}catch(e){}},1400)}
  /* ?p=romero&n=K abre el registro de la cita K (0 = primera sesión) del paciente nuevo */
  var nCita=param("p")==="romero"?Math.max(0,parseInt(param("n"),10)||0):0;
  if(param("p")==="romero"&&EST.romero.prog&&nCita>=EST.romero.prog.fechas.length)nCita=0;
  var P=paciente(param("p")==="romero"?"romero":"gutierrez",nCita);
  var ESTP=P.clave==="romero"?sesEst(nCita):EST.gutierrez;
  var habilitada=P.clave==="gutierrez"||(EST.romero.hc&&EST.romero.prog&&EST.romero.atendidoOrden);

  /* --- datos del paciente en la pantalla --- */
  (function(){
    var T=P.turno?TURNOS[P.turno-1]:TURNOS[0];
    var set=function(k,h){q('[data-p="'+k+'"]').forEach(function(el){if(el.tagName==="INPUT")el.value=h;else el.innerHTML=h})};
    set("cita","cita única · Nº "+P.cod);
    set("kvPac",'<b>TIPO Y Nº DE DOC</b><span>: DNI - '+P.dni+'</span><b>APELLIDOS Y NOMBRES</b><span>: '+esc(P.nom.replace(",",""))+'</span><b>FECHA DE NACIMIENTO</b><span>: '+P.fnac+'</span><b>EDAD / SEXO</b><span>: '+P.edad+' - '+P.sexo+'</span><b>TIPO DE BENEFICIARIO</b><span>: '+P.par+'</span>');
    set("kvAte",'<b>COD. SITEDS SUSALUD</b><span>: [código]</span><b>FECHA Y HORA DE ATENCIÓN</b><span>: '+String(P.fecha).replace(/-/g,"/")+' '+(P.hora||"")+':00</span><b>TIPO DE ATENCIÓN</b><span>: AMBULATORIO</span><b>SERVICIO SOLICITANTE</b><span>: NEFROLOGÍA</span><b>PROFESIONAL DE SALUD</b><span>: '+T.med+'</span>');
    set("datGen",datosGen(P,String(P.fecha).replace(/\//g,"-")+" "+(P.hora||"00:00")+":00",T.med));
    set("ses",P.ses+" de "+P.total);
    set("cab",'<span>Paciente: <b>'+esc(P.nom)+'</b></span><span>DNI: <b>'+P.dni+'</b></span><span>N° HC: <b>'+P.hcn+'</b></span><span>Grado / parentesco: <b>'+P.grado+' · '+P.par+'</b></span><span>Edad: <b>'+P.edadN+' años</b></span><span>Procedencia: <span class="pr pr-AMB">AMBULATORIO</span></span><span>Lugar de atención: <b>'+(P.maq!=null?MAQ[P.maq]:"—")+'</b></span><span>Turno: <b>'+T.n+' ('+T.h+')</b></span><span>N° sesión: <b>'+P.ses+' de '+P.total+'</b></span><span>Frecuencia: <b>3 veces/semana ('+(P.seq||"—")+')</b></span><span>Serología: <b>'+P.ser+'</b></span><span>Acceso: <b>'+P.acceso+'</b></span><span>Etiología: <b>'+esc(P.etio)+'</b></span><span>Alergias: <b>'+esc(P.ale)+'</b></span><span>Nefrólogo del turno: <b>'+T.med+'</b></span>');
    /* Módulo de Enfermería: solo los datos que no repite la nota de enfermería */
    set("cabEnf",'<span>DNI: <b>'+P.dni+'</b></span><span>Edad: <b>'+P.edadN+' años</b></span><span>Procedencia: <span class="pr pr-AMB">AMBULATORIO</span></span><span>Frecuencia: <b>3 veces/semana ('+(P.seq||"—")+')</b></span><span>Serología: <b>'+P.ser+'</b></span><span>Acceso: <b>'+P.acceso+'</b></span>');
    set("sexo",P.sexo==="MASCULINO"?"HOMBRE":"MUJER");
    set("grupo",P.edadN>=60?"ADULTO MAYOR":P.edadN>=30?"ADULTO MADURO":"ADULTO JOVEN");
    set("lugar",P.maq!=null?MAQ[P.maq]:"—");
    set("hcRes",'<div class="nota ok">Firmada por <b>'+esc(P.hcFirma?P.hcFirma.u:"—")+'</b> ('+esc(P.hcFirma?P.hcFirma.h:"—")+').</div><div class="sub">RESUMEN</div>'+
      '<div class="row"><div class="f2"><label>Enfermedad que produjo la ERC (CIE-10)</label><input class="in" readonly value="'+esc(P.etio)+'"></div><div class="f"><label>Fecha de primera hemodiálisis</label><input class="in" readonly value="'+esc(P.f1)+'"></div><div class="f"><label>Alergia a medicamentos</label><input class="in" readonly value="'+esc(P.ale)+'"></div></div>'+
      '<div class="row"><div class="f2"><label>Comorbilidades</label><input class="in" readonly value="'+esc(P.com)+'"></div><div class="f"><label>Acceso vascular</label><input class="in" readonly value="'+esc(P.accesoTxt)+'"></div><div class="f"><label>Serología</label><input class="in" readonly value="'+P.ser+'"></div></div>'+
      '<div class="row"><div class="f"><label>Peso / talla de ingreso</label><input class="in" readonly value="'+esc(P.pesoTalla)+'"></div><div class="f"><label>Índice de Karnofsky</label><input class="in" readonly value="'+esc(P.karnofsky)+'"></div></div>');
    var hist=P.clave==="gutierrez"?[["26-10-2026","Lic. C. HUAMAN","Dra. M. SALAZAR",""],["28-10-2026","Lic. C. HUAMAN","Dr. J. PAREDES",""],["30-10-2026","Lic. C. HUAMAN","Dra. M. SALAZAR","HIPOTENSIÓN"],["02-11-2026","Lic. P. ROJAS","Dra. M. SALAZAR",""]]
      :(EST.romero.prog?EST.romero.prog.fechas.slice(0,nCita).map(function(f,j){var r=sesEst(j).reg||{},e=estadoReg(r,sesEst(j).atendidoSes);return[f,r.enf?r.enf.u:"—",r.fin?r.fin.u:"—","",e,r.ini?r.ini.u:"—"]}):[]);
    var lug=T.n+" · "+(P.maq!=null?MAQ[P.maq]:"—"),prox=P.clave==="romero"&&EST.romero.prog?EST.romero.prog.fechas.slice(nCita+1,nCita+5):["06-11-2026","09-11-2026","11-11-2026"];
    set("seg",'<div class="kpis"><div class="kpi ok"><div class="v">'+hist.filter(function(h){return!h[4]||h[4][1]==="CERRADA"}).length+' / '+P.total+'</div><div class="t">Sesiones realizadas</div></div><div class="kpi"><div class="v">0</div><div class="t">Inasistencias</div></div><div class="kpi'+(hist.some(function(h){return h[3]})?' alerta':'')+'"><div class="v">'+hist.filter(function(h){return h[3]}).length+'</div><div class="t">Sesiones con eventos</div></div><div class="kpi"><div class="v">'+P.ses+'</div><div class="t">Sesión de hoy</div></div></div>'+
      '<div class="tw"><table><tr><th>Sesión</th><th>Fecha</th><th>Turno / máquina</th><th>Peso pre → post</th><th>UF (L)</th><th>Eventos</th><th>Ev. inicial</th><th>Enfermería</th><th>Ev. final</th><th>Estado</th></tr>'+
      hist.map(function(h,i){return'<tr'+(h[3]?' class="ev"':'')+'><td>'+(i+1)+'</td><td>'+h[0]+'</td><td>'+lug+'</td><td>[ ] → [ ]</td><td>[ ]</td><td>'+(h[3]||"—")+'</td><td class="prof">'+(h[5]||"Dra. M. SALAZAR")+'</td><td class="prof">'+h[1]+'</td><td class="prof">'+h[2]+'</td><td><span class="st '+(h[4]?h[4][0]:"s4")+'">'+(h[4]?h[4][1]:"CERRADA")+'</span></td></tr>'}).join("")+
      '<tr class="nuevo"><td>'+P.ses+'</td><td>'+P.fecha+'</td><td>'+lug+'</td><td colspan="6">Sesión de hoy</td><td><span class="st s1" id="stSegHoy">EN CURSO</span></td></tr>'+
      prox.map(function(f,i){return'<tr><td>'+(P.ses+i+1)+'</td><td>'+f+'</td><td>'+lug+'</td><td colspan="6" class="prof">Cita única en el Módulo de Procedimientos Programados</td><td><span class="st s0">PROGRAMADA</span></td></tr>'}).join("")+'</table></div>');
  })();

  /* --- Enlace: esta sesión pertenece a una cita programada --- */
  function rEnlace(){
    if(!habilitada)return;if(ENF){$("guardaHc").innerHTML="";return}
    var T=TURNOS[(P.turno||1)-1],e=estadoReg(ESTP.reg,ESTP.atendidoSes);
    $("guardaHc").innerHTML='<div class="sub" style="margin-top:4px">ENLACE CON LA CITA PROGRAMADA</div>'+
      '<div class="tw"><table><tr><th>Cita (Módulo de Procedimientos Programados)</th><th>Sesión</th><th>Fecha programada</th><th>Turno · máquina</th><th>Origen de la cita</th><th>Registro de atención de esta sesión</th><th></th></tr>'+
      '<tr><td><b>Nº '+P.cod+'</b> · CPMS 90937</td><td>'+P.ses+' de '+P.total+'</td><td>'+P.fecha+' · '+(P.hora||"")+'</td><td>'+T.n+' · '+(P.maq!=null?MAQ[P.maq]:"—")+'</td><td class="prof">'+esc(P.origen||"—")+'</td><td><span class="st '+e[0]+'">'+e[1]+'</span>'+firmasReg(ESTP.reg)+'</td>'+
      '<td class="nw">'+(P.clave==="romero"&&!MODAL?'<a class="btn sm k" style="text-decoration:none" href="atencion.html#prog">Ver programación</a>':'')+'</td></tr></table></div>';
  }

  if(!habilitada){
    $("guardaHc").innerHTML='<div class="nota err"><b>Este paciente aún no puede atenderse en una sesión.</b> Primero debe llenarse su Historia Clínica Inicial y programarse sus turnos y citas. <a class="btn sm o" href="atencion.html" style="text-decoration:none">Ir a la atención de primera vez</a></div>';
    q("[data-tiempo]").forEach(function(s){s.remove()});if($("flujo"))$("flujo").remove();if($("ntBox"))$("ntBox").remove();
  }

  var S={t:1,acceso:P.acceso,
    ini:{firm:null,cie:P.clave==="gutierrez"?[{c:CIE[0],t:"REITERATIVO"},{c:CIE[2],t:"REITERATIVO"},{c:CIE[4],t:"REITERATIVO"}]:[{c:CIE[0],t:"DEFINITIVO"}],
         med:[{p:PROD[0],d:"5 000 UI",v:"EV",o:"KIT"},{p:PROD[1],d:"2 000 UI",v:"SC",o:"MEN"},{p:PROD[2],d:"100 MG (1 AMP)",v:"EV",o:"MEN"}],
         kit:KIT_FAV.filter(function(k){return P.acceso==="FAV"||k.c!=="DMMB00438"}).concat(P.acceso==="FAV"?[]:[KIT_CVC_EXTRA]).map(function(k){return{c:k.c,n:k.n,u:k.u,q:k.q,st:k.st}}),rxOn:true,receta:null},
    enf:{firm:null,frec:60,mon:[],apl:{},cur:false,dx:["00026","00004"],noc:[{c:"0601",v:"3"},{c:"0802",v:"4"}],nic:["2100","4130"],detInt:"",detEva:"",pend:{}},
    fin:{firm:null,med:[]}};
  if(ESTP.atendidoSes){S.ini.firm={u:"Dra. M. SALAZAR",h:"06:12"};S.enf.firm={u:"Lic. C. HUAMAN",h:"09:58"};S.fin.firm={u:"Dra. M. SALAZAR",h:"10:05"};S.enf.mon=[{t:"c",h:"06:40",pa:"130/80",fc:78,qb:350,na:140,ra:-120,rv:140,ptm:60,o:"",u:"Lic. C. HUAMAN"}];S.t=3}
  /* Si la sesión ya tiene firmas guardadas en su registro (enlazado a la cita), se retoma desde el tiempo pendiente */
  /* Datos guardados del registro (compartidos entre el Módulo de Procedimientos y el Módulo de Enfermería) */
  var k;
  if(ESTP.ini)for(k in ESTP.ini)S.ini[k]=ESTP.ini[k];
  if(ESTP.enf)for(k in ESTP.enf)S.enf[k]=ESTP.enf[k];
  if(ESTP.finMed)S.fin.med=ESTP.finMed;
  S.enf.pend={};if(S.enf.acceso)S.acceso=S.enf.acceso;
  if(ESTP.reg&&(ESTP.reg.ini||ESTP.reg.enf||ESTP.reg.fin)){
    S.ini.firm=ESTP.reg.ini||S.ini.firm;S.enf.firm=ESTP.reg.enf||(ESTP.atendidoSes?S.enf.firm:null);S.fin.firm=ESTP.reg.fin||(ESTP.atendidoSes?S.fin.firm:null);
    if(S.enf.firm&&!S.enf.mon.length)S.enf.mon=[{t:"c",h:"—",pa:"—",fc:"—",qb:"—",na:"—",ra:"—",rv:"—",ptm:"—",o:"Registrado por enfermería",u:S.enf.firm.u}];
    S.t=S.fin.firm?3:S.ini.firm?2:1;
  }
  if(S.acceso!=="FAV"&&$("tacc1")){$("tacc1").checked=true;$("accFav").hidden=true;$("accCvc").hidden=false}
  var URL_ENF="enfermeria-nota.html?p="+P.clave+(P.clave==="romero"?"&n="+nCita:"");
  var URL_PROC="atencion-sesion.html?p="+P.clave+(P.clave==="romero"?"&n="+nCita:"");

  if(habilitada&&!ENF){
  $("cieAdd").innerHTML=opts(["Seleccione…"].concat(CIE));

  var hs=[];for(var h=1;h<=4.0001;h+=0.25)hs.push(h.toFixed(2));$("hhd").innerHTML=opts(hs,"3.50");
  if(P.clave==="romero"&&nCita===0)q(".sub .orig").forEach(function(o){if(o.textContent.indexOf("precargada de la sesión")===0)o.textContent="primera sesión · tomada de la HC inicial"});
  }

  function nomCat(lista,c){var x=lista.filter(function(y){return y[0]===c})[0];return x?x[0]+" - "+x[1]:c}

  function rFlujo(){
    if(!habilitada||!$("flujo"))return;
    var pasos=[["1. Evaluación inicial","Nefrólogo · "+(S.ini.firm?"firmado "+S.ini.firm.h+" · "+S.ini.firm.u:"pendiente"),S.ini.firm,false],
               ["2. Evolución de enfermería","Módulo de Enfermería · "+(S.enf.firm?"registrado "+S.enf.firm.h+" · "+S.enf.firm.u:S.ini.firm?"habilitado · pendiente":"se habilita al firmar la I.1"),S.enf.firm,!S.ini.firm],
               ["3. Evaluación final","Nefrólogo · "+(S.fin.firm?"firmado "+S.fin.firm.h+" · "+S.fin.firm.u:S.enf.firm?"pendiente":"bloqueado"),S.fin.firm,!S.enf.firm]];
    $("flujo").innerHTML=pasos.map(function(p,i){return'<div data-t="'+(i+1)+'" class="'+(S.t===i+1?"on":p[2]?"dep":"")+(p[3]?" lock":"")+'">'+p[0]+'<small>'+p[1]+'</small></div>'}).join("");
    /* Atención FINALIZADA: resumen completo I.1 + EVOLUCIÓN DE ENFERMERÍA + I.2 (solo lectura) */
    var res3=!!S.fin.firm&&!ENF;
    q("[data-tiempo]").forEach(function(sec){sec.hidden=res3?false:+sec.getAttribute("data-tiempo")!==S.t});
    q("[data-irt2]").forEach(function(x){x.closest(".acciones").hidden=res3});
    if($("resAtn"))$("resAtn").hidden=!res3;
    var est=S.fin.firm?["s4","CERRADA"]:S.enf.firm?["s3","EVALUACIÓN FINAL"]:S.ini.firm?["s2","EN ENFERMERÍA"]:["s1","EVALUACIÓN INICIAL"];
    if($("stSes")){$("stSes").className="st "+est[0];$("stSes").textContent=est[1]}
    if($("stSegHoy")){$("stSegHoy").className="st "+est[0];$("stSegHoy").textContent=est[1]}
  }
  if(habilitada&&$("flujo"))$("flujo").addEventListener("click",function(e){var d=e.target.closest("[data-t]");if(!d)return;
    if(d.classList.contains("lock")){aviso("Este tiempo se habilita cuando se firma el anterior.",true);return}
    S.t=+d.getAttribute("data-t");rFlujo();window.scrollTo(0,$("flujo").getBoundingClientRect().top+window.scrollY-10)});

  function firma(f,puede,txt,id,leg,no){
    if(f)return'<div class="nota ok">Firmado por <b>'+esc(f.u)+'</b> a las '+f.h+'.</div>';
    if(!puede)return'<div class="nota err">'+no+' Cambie el perfil en «Ver como».</div>';
    return'<div class="acciones" style="justify-content:flex-end"><button type="button" class="btn r" data-cancelar>CANCELAR</button><button type="button" class="btn g" id="'+id+'" title="'+esc(txt)+'">GUARDAR</button></div>'}
  function rFirmas(){
    if(!habilitada)return;
    if(ENF){
      /* Módulo de Enfermería: la ficha se edita solo con la I.1 firmada, con perfil de enfermería y mientras no esté guardada */
      var puede=!!S.ini.firm&&!S.enf.firm&&esEnf();
      if($("fs2"))$("fs2").disabled=!puede;
      if($("sign2"))$("sign2").disabled=!puede;
      estEsp(S.enf.firm?null:S.enf.guard);
      if($("firma2"))$("firma2").innerHTML=S.enf.firm?''
        :!S.ini.firm?''
        :!esEnf()?'<div class="nota err">Solo enfermería de hemodiálisis registra esta ficha. Cambie el perfil en «Ver como».</div>'
        :'';
      return;
    }
    $("fs1").disabled=!!S.ini.firm||!esNef();$("fs3").disabled=!!S.fin.firm||!esNef();
    $("medT1").value=S.ini.firm?S.ini.firm.u:(esNef()?usuario():"—");$("medT3").value=S.fin.firm?S.fin.firm.u:(esNef()?usuario():"—");
    $("firma1").innerHTML=firma(S.ini.firm,esNef(),"Firmar evaluación inicial","sign1","Al firmar se generan la receta y el FUR, se bloquea este tiempo y se habilita automáticamente la EVOLUCIÓN DE ENFERMERÍA en el Módulo de Enfermería.","Solo un nefrólogo registra y firma este tiempo.");
    $("firma3").innerHTML=!S.enf.firm?'<div class="nota err">La evaluación final se habilita cuando enfermería guarda la EVOLUCIÓN DE ENFERMERÍA en el Módulo de Enfermería.</div>':firma(S.fin.firm,esNef(),"Firmar y cerrar sesión","sign3","Puede firmarla un nefrólogo distinto al de la evaluación inicial. Al cerrar, la prestación pasa a producción con CIE-10 y CPMS.","Solo un nefrólogo cierra la sesión.");
    if(!S.fin.firm&&ESTP.finGuard&&$("sign3"))$("sign3").textContent="FINALIZAR";if(S.fin.firm){$("firma3").innerHTML="";if(!ENF&&$("firma1"))$("firma1").innerHTML=""}
  }

  function rCie(){if(!habilitada||!$("tblCie"))return;$("tblCie").innerHTML='<tr><th>Diagnóstico</th><th>Tipo</th><th></th></tr>'+(S.ini.cie.map(function(c,i){return'<tr><td>'+esc(c.c)+'</td><td style="width:170px"><select class="in" data-dt="'+i+'" aria-label="Tipo de diagnóstico">'+opts(TIPODX,c.t)+'</select></td><td style="width:60px"><button type="button" class="btn sm r" data-dc="'+i+'" aria-label="Quitar">✖</button></td></tr>'}).join("")||'<tr><td colspan="3" class="vacio">Agregue al menos un diagnóstico.</td></tr>')}
  function rKit(){if(!habilitada||!$("tblKit"))return;$("tblKit").innerHTML='<tr><th>Código</th><th>Producto farmacéutico o dispositivo médico</th><th>Unidad</th><th>Posología</th><th>Cantidad</th><th>Stock farmacia</th><th></th></tr>'+(S.ini.kit.map(function(k,i){var bajo=k.st<10;return'<tr><td class="nw">'+k.c+'</td><td>'+esc(k.n)+'</td><td>'+k.u+'</td><td>EN CADA SESIÓN DE HEMODIÁLISIS</td><td><input class="in q" type="number" min="1" step="1" data-kq="'+i+'" value="'+k.q+'" aria-label="Cantidad"></td><td class="stk'+(bajo?' bajo':'')+'">'+k.st+(bajo?' · STOCK BAJO':'')+'</td><td style="width:60px"><button type="button" class="btn sm r" data-kd="'+i+'" aria-label="Quitar">✖</button></td></tr>'}).join("")||'<tr><td colspan="7" class="vacio">Kit vacío.</td></tr>')}
  /* 5.2 PRESCRIBIR RECETA (formato de SIGESAPOL: PRODUCTOS MÉDICOS) */
  function rMed(){if(!habilitada||!$("tblMed"))return;
    if(S.ini.medOn==null)S.ini.medOn=true;if(S.ini.cont==null)S.ini.cont=S.ini.med.some(function(m){return m.o==="MEN"});
    $("rxMedTg").innerHTML=tgl("rxMedOn",S.ini.medOn,!!S.ini.firm,"rxMedOn");$("rxContTg").innerHTML=tgl("rxContOn",S.ini.cont,!!S.ini.firm,"rxContOn");
    $("rxMedBox").hidden=!S.ini.medOn;$("rxFec").value=P.fecha;$("rxFarm2").value=$("farm")?$("farm").value:"";
    var stk=function(p){var x=NA_PROD.filter(function(n){return n[0].slice(0,7)===String(p).slice(0,7)})[0];return x?x[1]:"—"};
    $("tblMed").innerHTML='<tr><th>Producto farmacéutico o dispositivo médico</th><th>Stock farmacia</th><th style="width:90px">Tiempo (días)</th><th style="width:90px">Vía adm.</th><th>Posología</th><th style="width:80px">Cant. pres.</th><th>Origen</th><th></th></tr>'+(S.ini.med.map(function(m,i){
      return'<tr><td><select class="in" data-mi="p" data-i="'+i+'">'+opts(PROD,m.p)+'</select></td><td class="stk">'+stk(m.p)+'</td><td><input class="in q" type="number" min="1" data-mi="dias" data-i="'+i+'" value="'+esc(m.dias||1)+'"></td><td><select class="in" data-mi="v" data-i="'+i+'">'+opts(["EV","SC","VO","IM"],m.v)+'</select></td><td><input class="in" data-mi="d" data-i="'+i+'" value="'+esc(m.d)+'" placeholder="Ej.: 5 000 UI durante la sesión"></td><td><input class="in q" type="number" min="1" data-mi="q" data-i="'+i+'" value="'+esc(m.q||1)+'"></td><td><span class="orig">'+ORIGEN[m.o]+'</span></td><td style="width:60px"><button type="button" class="btn sm r" data-dm="'+i+'" aria-label="Quitar">✖</button></td></tr>'}).join("")||'<tr><td colspan="8" class="vacio">Sin productos. Pulse «Agregar Producto».</td></tr>')}

  function sugerido(){var last=S.enf.mon.filter(function(r){return r.t==="c"}).pop(),b=(last?last.h:(P.hora||"06:00")).split(":"),tot=(+b[0])*60+(+b[1])+(last?S.enf.frec:10);return("0"+Math.floor(tot/60)%24).slice(-2)+":"+("0"+tot%60).slice(-2)}
  function filaMon(r){return r.t==="c"?'<tr><td>'+r.h+'</td><td>'+esc(r.pa)+'</td><td>'+esc(r.fc)+'</td><td>'+r.qb+'</td><td>'+esc(r.na)+'</td><td>'+esc(r.ra)+'</td><td>'+esc(r.rv)+'</td><td>'+esc(r.ptm)+'</td><td>'+(esc(r.o)||"—")+'</td><td class="prof">'+esc(r.u)+'</td></tr>':'<tr class="ev"><td>'+r.h+'</td><td colspan="7"><span class="st sx">EVENTO</span> <b>'+esc(r.ev)+'</b> · '+esc(r.ac)+'</td><td>—</td><td class="prof">'+esc(r.u)+'</td></tr>'}
  var CAB_MON='<tr><th>Hora</th><th>PA</th><th>FC</th><th>QB</th><th>Na</th><th>RA</th><th>RV</th><th>PTM</th><th>Observaciones</th><th>Registró</th></tr>';
  function rMon(){
    if(!habilitada||!$("tblMon"))return;
    var mon=S.enf.mon.map(function(r){return r.t==="c"?'<tr><td>'+r.h+'</td><td>'+esc(r.pa)+'</td><td>'+esc(r.fc)+'</td><td>'+r.qb+'</td><td>'+esc(r.na)+'</td><td>'+esc(r.ra)+'</td><td>'+esc(r.rv)+'</td><td>'+esc(r.ptm)+'</td><td>'+(esc(r.o)||"—")+'</td><td class="prof">'+esc(r.u)+'</td></tr>':'<tr class="ev"><td>'+r.h+'</td><td colspan="7"><span class="st sx">EVENTO</span> <b>'+esc(r.ev)+'</b> · '+esc(r.ac)+'</td><td>—</td><td class="prof">'+esc(r.u)+'</td></tr>'}).join("");
    var sug=sugerido();$("sug").value=sug;
    $("tblMon").innerHTML='<tr><th>Hora</th><th>PA</th><th>FC</th><th>QB</th><th>Na</th><th>RA</th><th>RV</th><th>PTM</th><th>Observaciones</th><th>Registró</th></tr>'+(mon||'<tr><td colspan="10" class="vacio">Sin controles registrados.</td></tr>')+
      '<tr class="nuevo"><td><input class="in" type="time" id="cH" value="'+sug+'" aria-label="Hora"></td><td><input class="in" id="cPa" placeholder="120/80" aria-label="PA"></td><td><input class="in" id="cFc" type="number" aria-label="FC"></td><td><select class="in" id="cQb" aria-label="QB">'+opts([250,300,350,400,450,500],350)+'</select></td><td><input class="in" id="cNa" value="140" aria-label="Na"></td><td><input class="in" id="cRa" aria-label="RA"></td><td><input class="in" id="cRv" aria-label="RV"></td><td><input class="in" id="cPtm" aria-label="PTM"></td><td><input class="in" id="cO" aria-label="Observaciones"></td><td class="prof">'+esc(esEnf()?usuario():"—")+'</td></tr>';
  }
  function rApl(){if(!habilitada||!$("tblApl"))return;S.enf.aplExtra=S.enf.aplExtra||[];
    if($("aplP")&&!$("aplP").options.length)$("aplP").innerHTML=opts(S.ini.med.map(function(m){return m.p}).concat(S.ini.kit.filter(function(k){return/^PF/.test(k.c)}).map(function(k){return k.c+" · "+k.n})).concat(PROD).filter(function(x,i,a){return a.indexOf(x)===i}));
    $("tblApl").innerHTML='<tr><th>Producto</th><th>Dosis</th><th>Vía</th><th>Origen</th><th>Hora de aplicación</th><th></th></tr>'+(S.ini.med.map(function(m,i){return'<tr><td>'+esc(m.p)+'</td><td>'+esc(m.d)+'</td><td>'+m.v+'</td><td><span class="orig">'+ORIGEN[m.o]+'</span></td><td>'+(S.enf.apl[i]||"—")+'</td><td>'+(S.enf.apl[i]?'<span class="st s4">APLICADO</span>':'<button type="button" class="btn sm g" data-ap="'+i+'">Marcar aplicado</button>')+'</td></tr>'}).join("")+
      S.enf.aplExtra.map(function(m,i){return'<tr><td>'+esc(m.p)+'</td><td>'+esc(m.d)+'</td><td>'+m.v+'</td><td><span class="orig">AGREGADO POR ENFERMERÍA</span></td><td>'+m.h+'</td><td class="nw"><span class="st s4">APLICADO</span> <button type="button" class="btn sm r" data-apx="'+i+'" aria-label="Quitar">✖</button></td></tr>'}).join("")||'<tr><td colspan="6" class="vacio">La receta no tiene productos.</td></tr>')}
  function cat(t){return t==="dx"?NANDA:t==="noc"?NOC:NIC}
  function rPae(){
    if(!habilitada||!$("pae"))return;
    var e=S.enf;
    var items=function(tipo,arr,lista){return arr.map(function(c,i){return'<div class="it"><div class="tx">'+esc(nomCat(lista,c))+'</div><button type="button" class="btn r" data-paedel="'+tipo+'" data-i="'+i+'" aria-label="Quitar">✖</button></div>'}).join("")};
    var nocs=e.noc.map(function(n,i){return'<div class="it"><div class="tx">'+esc(nomCat(NOC,n.c))+'</div><select data-nocv="'+i+'" aria-label="Puntuación (1 a 5)">'+ESCALA.map(function(v){return'<option'+(v===n.v?' selected':'')+'>'+v+'</option>'}).join("")+'</select><button type="button" class="btn r" data-paedel="noc" data-i="'+i+'" aria-label="Quitar">✖</button></div>'}).join("");
    var ac=function(tipo){if(!e.pend[tipo])return"";var usados=tipo==="noc"?e.noc.map(function(n){return n.c}):e[tipo];
      return'<div class="it"><div class="acw"><input class="in" id="ac-'+tipo+'" list="dl-'+tipo+'" autocomplete="off" placeholder="Escriba el código o parte de la descripción"><datalist id="dl-'+tipo+'">'+cat(tipo).filter(function(x){return usados.indexOf(x[0])<0}).map(function(x){return'<option value="'+esc(x[0]+" - "+x[1])+'">'}).join("")+'</datalist></div>'+(tipo==="noc"?'<select id="acv-noc" aria-label="Puntuación">'+ESCALA.map(function(v){return'<option>'+v+'</option>'}).join("")+'</select>':'')+'<button type="button" class="btn g" data-acok="'+tipo+'" aria-label="Agregar">✔</button><button type="button" class="btn r" data-accan="'+tipo+'" aria-label="Cancelar">✖</button></div>'};
    $("pae").innerHTML='<div class="pae">'+
      '<div><h4>Diagnóstico de enfermería</h4><button type="button" class="btn g sm" data-paeadd="dx">✚ Agregar diagnóstico</button>'+ac("dx")+items("dx",e.dx,NANDA)+'</div>'+
      '<div><h4>Planeación</h4><button type="button" class="btn g sm" data-paeadd="noc">✚ Agregar NOC</button>'+ac("noc")+nocs+'</div>'+
      '<div><h4>Ejecución</h4><button type="button" class="btn g sm" data-paeadd="nic">✚ Agregar NIC</button>'+ac("nic")+items("nic",e.nic,NIC)+'<label for="paeInt" style="margin-top:8px">Detalle de intervenciones</label><textarea class="in" id="paeInt">'+esc(e.detInt)+'</textarea></div>'+
      '<div><h4>Evaluación</h4><button type="button" class="btn g sm" id="paeEval">✚ Generar evaluación</button><label for="paeEva" style="margin-top:8px">Detalle de evaluaciones</label><textarea class="in" id="paeEva">'+esc(e.detEva)+'</textarea></div>'+
      '</div>';
    var f=q("#pae input[list]")[0];if(f)f.focus();
  }
  function cpms(){
    var ap=S.ini.med.filter(function(m,i){return S.enf.apl[i]&&m.o!=="KIT"}),sc=ap.filter(function(m){return m.v==="SC"||m.v==="IM"}).length,ev=ap.filter(function(m){return m.v==="EV"}).length;
    var c=$("cpms").value,r=[[c,c==="90937"?"PROCEDIMIENTO DE HEMODIÁLISIS QUE REQUIERE REPETIDA(S) EVALUACIÓN(ES)":"PROCEDIMIENTO DE HEMODIÁLISIS CON UNA SOLA EVALUACIÓN MÉDICA",1,"Prescripción del tiempo 1"],["99206","ATENCIÓN DE ENFERMERÍA EN II, III NIVEL DE ATENCIÓN",1,"Firma de enfermería"],["94760","OXIMETRÍA NO INVASIVA DE LA OREJA O DE PULSO; UNA SOLA DETERMINACIÓN",1,"SO2 registrada"]];
    if(sc)r.push(["96372","INYECCIÓN TERAPÉUTICA, PROFILÁCTICA O DIAGNÓSTICA; SUBCUTÁNEA O INTRAMUSCULAR",sc,"Medicamento SC/IM aplicado"]);
    if(ev)r.push(["90784","INYECCIÓN PROFILÁCTICA, DIAGNÓSTICA O TERAPÉUTICA, INTRAVENOSA",ev,"Medicamento EV aplicado"]);
    if(S.acceso!=="FAV"&&S.enf.cur)r.push(["15882","CURACIÓN DE CATÉTER VENOSO CENTRAL (CVC)",1,"Curación de CVC = SÍ"]);
    return r}
  function rT3(){
    if(!habilitada||!$("t3Ev"))return;
    var ev=S.enf.mon.filter(function(r){return r.t==="e"}),ctl=S.enf.mon.length-ev.length;
    if($("t3Ev"))$("t3Ev").innerHTML="";
    if($("k3uf")){$("k3uf").textContent=(S.enf.val&&S.enf.val.ufe?S.enf.val.ufe+" / ":"")+($("uf").value||"—");$("k3ctl").textContent=ctl;$("k3ev").textContent=ev.length;$("k3evBox").className="kpi"+(ev.length?" alerta":"");$("k3apl").textContent=Object.keys(S.enf.apl).length+(S.enf.aplExtra||[]).length;}
    $("tblDx3").innerHTML='<tr><th>Código</th><th>Nombre</th><th>Tipo</th></tr>'+S.ini.cie.map(function(c){var a=c.c.split(" · ");return'<tr><td>'+a[0]+'</td><td>'+esc(a[1])+'</td><td>'+c.t+'</td></tr>'}).join("");
    $("tblCpms").innerHTML='<tr><th>Incluir</th><th>Código</th><th>Nombre</th><th>Cantidad</th><th>Se genera por</th></tr>'+cpms().map(function(r,i){return'<tr><td><input type="checkbox" checked'+(i===0?' disabled':'')+' aria-label="Incluir '+r[0]+'"></td><td>'+r[0]+'</td><td>'+esc(r[1])+'</td><td>'+r[2]+'</td><td class="prof">'+r[3]+'</td></tr>'}).join("");
  }
  /* NUEVA ATENCIÓN del procedimiento: la nota del Módulo de Enfermería queda enlazada a la atención */
  function rEnfProc(){var el=$("enfProc");if(!el||!habilitada)return;var e=S.enf,v=e.val||{},ev=e.mon.filter(function(r){return r.t==="e"}).length;
    el.innerHTML='<div class="sub">NOTA DE ENFERMERÍA <span class="orig">Módulo de Enfermería · Consulta Externa</span></div><div class="tw"><table><tr><th>N° de atención</th><th>Fecha y hora</th><th>Enfermera(o)</th><th>Ficha</th><th>PA ini → fin</th><th>UF efectiva</th><th>Eventos</th><th>Estado</th><th></th></tr><tr>'+
      (e.firm?'<td><b>'+idEnf(P.cod)+'</b></td><td>'+esc(P.fecha)+' '+e.firm.h+'</td><td class="prof">'+esc(e.firm.u)+'</td><td>EVOLUCIÓN DE ENFERMERÍA · 0026_04</td><td>'+esc(v.pai||"—")+' → '+esc(v.paf||"—")+'</td><td>'+esc(v.ufe||"—")+' L</td><td>'+ev+'</td><td><span class="st s4">REGISTRADA</span></td><td><button type="button" class="btn sm g" data-ir="ses">Ver resultados</button></td>'
       :'<td>—</td><td>—</td><td>—</td><td>EVOLUCIÓN DE ENFERMERÍA · 0026_04</td><td colspan="3">—</td><td><span class="st '+(S.ini.firm?'s2">PENDIENTE':'s0">SE HABILITA CON LA I.1')+'</span></td><td></td>')+'</tr></table></div>';
  }
  function rNota(){
    var nr=$("notaReq");if(!nr)return;if($("btnGuardar"))$("btnGuardar").textContent=ESTP.guardSes&&!ESTP.atendidoSes?"FINALIZAR":"GUARDAR";
    if(ESTP.guardSes&&!ESTP.atendidoSes){nr.className="nota";nr.innerHTML='<b>Registro guardado</b> por '+esc(ESTP.guardSes.u)+' · '+ESTP.guardSes.h+' · <span class="st s2">EN ESPERA DE LA FIRMA DEL MÉDICO</span>';return}
    if(ESTP.atendidoSes){nr.className="nota ok";nr.innerHTML="<b>Atención guardada.</b> El procedimiento programado Nº "+P.cod+" quedó ATENDIDO.";$("btnGuardar").disabled=true;$("obsProc").readOnly=true}
    else if(S.fin.firm){nr.className="nota ok";nr.innerHTML="<b>Sesión de hemodiálisis cerrada</b> (3 tiempos firmados). Ya puede GUARDAR esta atención."}
  }

  /* Guarda las firmas en el registro enlazado a la cita */
  /* Guarda las firmas y los datos de cada tiempo en el registro enlazado a la cita.
     El Módulo de Procedimientos guarda la I.1 / I.2 y el Módulo de Enfermería guarda la evolución de enfermería. */
  function guardarReg(){if(!habilitada)return;
    ESTP.reg={ini:S.ini.firm,enf:S.enf.firm,fin:S.fin.firm};
    if(ENF){snapEnf();var e={};for(var k in S.enf)if(k!=="pend")e[k]=S.enf[k];ESTP.enf=e}
    else{ESTP.ini=S.ini;ESTP.finMed=S.fin.med}
    guardar()}
  /* Toma los valores de la ficha 0026_04 (para retomar el llenado y para mostrar los resultados en el Módulo de Procedimientos) */
  function snapEnf(){var fs=$("fs2");if(!fs)return;var v={},r={},res=[],g=null;
    q("input[id],select[id],textarea[id]",fs).forEach(function(x){if(x.type==="radio"||x.type==="checkbox"||x.closest("table")||x.closest("#pae")||x.id==="sug")return;v[x.id]=x.value});
    q('input[type="radio"]',fs).forEach(function(x){if(x.checked)r[x.name]=q('input[name="'+x.name+'"]',fs).indexOf(x)});
    S.enf.cb=q('input[type="checkbox"]',fs).map(function(x){return x.checked});
    q(".sub, .row",fs).forEach(function(el){if(el.closest("[hidden]")||el.id==="aplAdd")return;
      if(el.classList.contains("sub")){g={t:el.childNodes[0].textContent.trim(),c:[]};res.push(g);return}
      if(!g){g={t:"DATOS DE LA SESIÓN",c:[]};res.push(g)}
      q(":scope > div",el).forEach(function(d){var lb=d.querySelector("label");if(!lb)return;var t=lb.textContent.replace("*","").trim();if(!t)return;
        var val,ops=d.querySelector(".ops");
        if(ops)val=q("input:checked",ops).map(function(i){return i.parentNode.textContent.trim()}).join(", ");
        else{var x=d.querySelector("input,select,textarea");if(!x||["sug","eT","eA","frec"].indexOf(x.id)>=0)return;val=x.value}
        if(val)g.c.push([t,val])})});
    S.enf.val=v;S.enf.rad=r;S.enf.acceso=S.acceso;S.enf.res=res.filter(function(x){return x.c.length})}
  function aplicarEnf(){var fs=$("fs2");if(!fs)return;var vit=S.ini.vit||{};
    if(!S.enf.val){if(vit.pa&&$("pai"))$("pai").value=vit.pa;if(vit.pi&&$("pei"))$("pei").value=vit.pi;if(vit.uf&&$("ufe"))$("ufe").placeholder="Programada: "+vit.uf;return}
    for(var id in S.enf.val){var x=$(id);if(x&&fs.contains(x))x.value=S.enf.val[id]}
    for(var n in S.enf.rad||{}){var rs=q('input[name="'+n+'"]',fs);if(rs[S.enf.rad[n]])rs[S.enf.rad[n]].checked=true}
    if(S.enf.cb)q('input[type="checkbox"]',fs).forEach(function(x,i){if(S.enf.cb[i]!=null)x.checked=S.enf.cb[i]});
    var fav=$("tacc0").checked;$("accFav").hidden=!fav;$("accCvc").hidden=fav}
  /* Borrador: la ficha de enfermería se guarda en cada cambio, para retomarla si se sale o hay cambio de turno */
  function borrador(){if(!ENF||S.enf.firm||!S.ini.firm||!esEnf())return;guardarReg()}

  /* Módulo de Procedimientos: tiempo 2 = estado en el Módulo de Enfermería y resultados registrados por la enfermera */
  function rT2Res(){var el=$("t2Res");if(!el||!habilitada)return;var e=S.enf,v=e.val||{};
    if(!S.ini.firm){el.innerHTML='<div class="nota err">Se habilita en el Módulo de Enfermería al firmar la I.1 EVALUACIÓN INICIAL.</div>';return}
    NOTAS_VISTAS=[];var ns=notasEnf(P.clave),act=null;ns.forEach(function(x){if(x.hd&&(P.clave==="gutierrez"||x.j===nCita))act=x});
    if(!e.firm){el.innerHTML='<div class="nota"><b>Habilitada en el Módulo de Enfermería</b> · pendiente de registro de la nota de esta sesión.</div><div class="acciones" style="justify-content:flex-end"><button type="button" class="btn g" id="btnContEnf"'+(esNef()?'':' disabled title="Solo el nefrólogo registra la evaluación final"')+'>Continuar →</button></div>';return}
    if(!act){act={id:idEnf(P.cod),serv:"NEFROLOGÍA",fecha:String(P.fecha).replace(/-/g,"/"),hora:h12(e.firm.h),u:e.firm.u,med:S.ini.firm.u,hd:true,cod:P.cod,ses:P.ses,total:P.total,j:nCita,e:e,ini:S.ini,clave:P.clave};ns.push(act)}
    q('[data-p="datGen"]').forEach(function(d){d.innerHTML=datosGen(P,String(P.fecha).replace(/\//g,"-")+" "+(P.hora||"00:00")+":00",(P.turno?TURNOS[P.turno-1]:TURNOS[0]).med,{u:e.firm.u,id:act.id,fecha:act.fecha,hora:act.hora})});
    var bI2=function(){return!S.fin.firm&&!ENF?'<button type="button" class="btn g" data-iri2'+(esNef()?'':' disabled title="Solo el nefrólogo registra la evaluación final"')+'>Continuar EV. FINAL →</button>':''};
    el.innerHTML=(bI2()?'<div class="nota ok" style="display:flex;align-items:center;gap:12px;justify-content:space-between"><span><b>Enfermería registró y firmó la nota</b> ('+esc(e.firm.u)+' · '+e.firm.h+').</span>'+bI2()+'</div>':'')+detalleEnf(act,true)+
      (bI2()?'<div class="acciones" style="justify-content:flex-end">'+bI2()+'</div>':'');
  }

  /* Módulo de Enfermería: cabecera estándar de la NOTA DE ENFERMERÍA de SIGESAPOL, llenada con la cita y la I.1 */
  function rEnf(){if(!ENF||!habilitada)return;
    var T=TURNOS[(P.turno||1)-1],vit=S.ini.vit||{},medU=S.ini.firm?S.ini.firm.u:T.med,setH=function(id,h){if($(id))$(id).innerHTML=h};
    var ro=function(l,v,c){return'<div class="'+(c||"f")+'"><label>'+l+'</label><input class="in" readonly value="'+esc(v)+'"></div>'};
    setH("enfEstado",S.enf.firm?'<div class="nota ok">Nota N° <b>'+idEnf(P.cod)+'</b> registrada por '+esc(S.enf.firm.u)+' · '+S.enf.firm.h+'.</div>':S.ini.firm?'':'<div class="nota err">Se habilita cuando el nefrólogo firma la I.1 EVALUACIÓN INICIAL.</div>');
    setH("enfAte",'<div class="row">'+ro("Tipo de atención","CONSULTA EXTERNA")+ro("Servicio","NEFROLOGÍA · HEMODIÁLISIS")+ro("IPRESS","HOSPITAL NACIONAL PNP LUIS N. SAENZ","f2")+ro("Número de historia",P.hcn)+'</div>'+
      '<div class="row">'+ro("Tipo de documento","DNI")+ro("N° de documento",P.dni)+ro("Cita (procedimiento programado)","Nº "+P.cod+" · 90937 · sesión "+P.ses+" de "+P.total,"f2")+ro("Fecha y hora de atención *",String(P.fecha).replace(/-/g,"/")+" "+(S.ini.firm?S.ini.firm.h:(P.hora||"")))+'</div>');
    setH("enfPac",'<div class="row">'+ro("Tipo de documento","DNI")+ro("Sexo",P.sexo)+ro("Apellidos y nombres",P.nom,"f2")+ro("Fecha de nacimiento",P.fnac)+'</div><div class="row">'+ro("Parentesco",P.par)+ro("Grado",P.grado)+ro("Edad",P.edad)+ro("Serología",P.ser)+ro("Acceso vascular",P.accesoTxt)+'</div>');
    var en=S.enf.firm?S.enf.firm.u:esEnf()?usuario():T.enf;
    setH("enfResp",'<div class="row">'+ro("Tipo y N° de documento","DNI - [Nº]")+ro("Apellidos y nombres",en,"f2")+ro("Especialidad","ENFERMERÍA EN NEFROLOGÍA")+ro("Profesión","LICENCIADO(A) EN ENFERMERÍA")+ro("N° de colegiatura (CEP)","087412")+'</div>');
    setH("enfMed",'<div class="row">'+ro("Tipo y N° de documento","DNI - [Nº]")+ro("Apellidos y nombres",medU,"f2")+ro("Especialidad","NEFROLOGÍA")+ro("CMP","045812")+ro("RNE","028731")+'</div>');
    setH("enfRx",'<tr><th>N</th><th>Producto</th><th>Un. med.</th><th>Cant.</th><th>Vía</th><th>Posología</th><th>Origen</th></tr>'+
      (S.ini.firm?S.ini.med.map(function(m,i){return'<tr><td>'+(i+1)+'</td><td>'+esc(m.p)+'</td><td>'+(/INY/.test(m.p)?"INY":"UND")+'</td><td>1</td><td>'+m.v+'</td><td>'+esc(m.d)+' · durante la sesión</td><td><span class="orig">'+ORIGEN[m.o]+'</span></td></tr>'}).concat(S.ini.kit.map(function(x,i){return'<tr><td>'+(S.ini.med.length+i+1)+'</td><td>'+esc(x.n)+'</td><td>'+x.u+'</td><td>'+esc(x.q)+'</td><td>—</td><td>EN CADA SESIÓN DE HEMODIÁLISIS</td><td><span class="orig">KIT · FUR</span></td></tr>'})).join(""):'<tr><td colspan="7" class="vacio">La receta y el FUR se generan cuando el nefrólogo firma la I.1.</td></tr>')+
      (S.ini.receta?'<tr><td colspan="7" class="prof">Receta vale N° '+esc(S.ini.receta.r)+' · FUR '+esc(S.ini.receta.f)+'</td></tr>':''));
    var pa=(vit.pa||"—/—").split("/");
    setH("enfSv",'<div class="row">'+ro("PA sistólica (mmHg)",pa[0])+ro("PA diastólica (mmHg)",pa[1]||"—")+ro("Pulso / FC (lpm)",vit.fc||"—")+ro("FR (rpm)",vit.fr||"—")+ro("SAO2 (%)",vit.so2||"—")+'</div><div class="row">'+ro("FIO2 (%)","21")+ro("Temperatura (°C)","[ ]")+ro("Talla (cm)",P.clave==="romero"?hcVal("hta","—"):"168")+ro("Peso inicial (kg)",vit.pi||"—")+ro("Peso seco (kg)",vit.ps||"—")+'</div>');
    var tiene=function(t){return String(P.com).toUpperCase().indexOf(t)>=0?"SÍ":"NO"};
    setH("enfAnt",'<div class="row">'+ro("Antecedentes (comorbilidades)",P.com,"f3")+'</div><div class="row">'+ro("Enfermedad que produjo la ERC",P.etio,"f2")+ro("Hipertensión arterial",tiene("HTA")==="SÍ"||tiene("HIPERTENSI")==="SÍ"?"SÍ":"NO")+ro("Diabetes",tiene("DM")==="SÍ"||tiene("DIABET")==="SÍ"?"SÍ":"NO")+ro("Alergia a medicamentos",P.ale)+ro("Hemodiálisis","SÍ · desde "+P.f1)+'</div>');
    setH("enfCpms",'<div class="sub" style="margin-top:0">DIAGNÓSTICOS DE LA ATENCIÓN</div><div class="tw"><table><tr><th>Código</th><th>Descripción</th><th>Tipo</th><th>Clasificación</th></tr><tr><td>Z49.2</td><td>OTRAS DIÁLISIS</td><td>REPETITIVO</td><td>ATENCIÓN</td></tr>'+S.ini.cie.map(function(c){var a=c.c.split(" · ");return'<tr><td>'+a[0]+'</td><td>'+esc(a[1])+'</td><td>'+c.t+'</td><td>DE LA I.1</td></tr>'}).join("")+'</table></div>'+
      '<div class="sub">PROCEDIMIENTOS DE ENFERMERÍA</div><div class="tw"><table><tr><th>Código</th><th>Procedimiento</th><th>Cantidad</th><th>Diagnóstico</th></tr><tr><td>99206</td><td>ATENCIÓN DE ENFERMERÍA EN II, III NIVEL DE ATENCIÓN</td><td>1</td><td>Z49.2</td></tr>'+(S.acceso!=="FAV"&&S.enf.cur?'<tr><td>15882</td><td>CURACIÓN DE CATÉTER VENOSO CENTRAL (CVC)</td><td>1</td><td>Z49.2</td></tr>':'')+'</table></div>');
    var hist=P.clave==="gutierrez"?[["02-11-2026","Lic. P. ROJAS","Sin eventos"],["30-10-2026","Lic. C. HUAMAN","Hipotensión: se administra ClNa 0.9 %"],["28-10-2026","Lic. C. HUAMAN","Sin eventos"]]
      :(EST.romero.prog?EST.romero.prog.fechas.slice(0,nCita).map(function(f,j){var r=sesEst(j).reg||{};return[f,r.enf?r.enf.u:"—",r.enf?"Registrada":"Sin registro"]}).reverse():[]);
    setH("enfHist",'<div class="tw"><table><tr><th>Fecha</th><th>Nota</th><th>Enfermera(o)</th><th>Detalle</th></tr>'+(hist.map(function(h){return'<tr><td>'+h[0]+'</td><td>EVOLUCIÓN DE ENFERMERÍA · HEMODIÁLISIS</td><td class="prof">'+esc(h[1])+'</td><td>'+esc(h[2])+'</td></tr>'}).join("")||'<tr><td colspan="4" class="vacio">Primera nota de enfermería de hemodiálisis del paciente.</td></tr>')+'</table></div>');
  }
  function rHistEnf(){if(!$("histEnf"))return;$("histEnf").innerHTML=histEnf(P.clave,P.clave==="romero"?nCita:0);
    var b=$("stHenf");if(!b||!habilitada||ENF)return;b.hidden=!S.ini.firm;b.className="st "+(S.enf.firm?"s4":"s2");b.textContent=S.enf.firm?"NOTA REGISTRADA":"NOTA PENDIENTE"}
  /* I.2: medicamentos que indica el médico al finalizar la sesión */
  function rFinMed(){var t=$("tblFinMed");if(!t)return;var ro=!!S.fin.firm||!esNef(),dis=ro?' disabled':'';
    var rx=ESTP.finRx||(ESTP.finRx={on:true,cont:false});
    $("fmRxTg").innerHTML=tgl("fmRxOn",rx.on,ro,"fmRxOn");$("fmContTg").innerHTML=tgl("fmContOn",rx.cont,ro,"fmContOn");
    $("fmRxBox").hidden=!rx.on;$("fmFec").value=String(P.fecha).replace(/\//g,"-");$("btnFinMed").disabled=ro;
    var LP=NA_PROD.map(function(x){return x[0]}),stk=function(p){var x=NA_PROD.filter(function(n){return n[0]===p})[0];return x?x[1]:"—"};
    t.innerHTML='<tr><th>Producto farmacéutico o dispositivo médico</th><th>Stock farmacia</th><th style="width:90px">Tiempo (días)</th><th style="width:90px">Vía adm.</th><th>Posología</th><th style="width:80px">Cant. pres.</th><th></th></tr>'+(S.fin.med.map(function(m,i){
      return'<tr><td><select class="in" data-fi="p" data-i="'+i+'"'+dis+'>'+opts(LP,m.p)+'</select></td><td class="stk">'+stk(m.p)+'</td><td><input class="in q" type="number" min="1" data-fi="dias" data-i="'+i+'" value="'+esc(m.dias||1)+'"'+dis+'></td><td><select class="in" data-fi="v" data-i="'+i+'"'+dis+'>'+opts(["VO","EV","SC","IM"],m.v)+'</select></td><td><input class="in" data-fi="pos" data-i="'+i+'" value="'+esc(m.pos||"")+'" placeholder="Ej.: 1 tab c/24 h"'+dis+'></td><td><input class="in q" type="number" min="1" data-fi="q" data-i="'+i+'" value="'+esc(m.q||1)+'"'+dis+'></td><td style="width:60px">'+(ro?'':'<button type="button" class="btn sm r" data-fmd="'+i+'" aria-label="Quitar">✖</button>')+'</td></tr>'}).join("")||'<tr><td colspan="7" class="vacio">Sin productos. Pulse «Agregar Producto».</td></tr>')}
  function rHistAtn(){if($("histAtn")){ATN_VISTAS=[];$("histAtn").innerHTML=histAtenciones(P.clave)}}
  function todo(){rFinMed();rHistAtn();if(NA&&NA.pint&&!ENF)NA.pint();rFlujo();rCie();rKit();rMed();rMon();rApl();rPae();rT3();rT2Res();rEnfProc();rEnf();rFirmas();rNota();rEnlace();rHistEnf()}
  refrescar=function(){rFirmas();rMon();rEnf();rT2Res();rFinMed()};

  document.addEventListener("click",function(e){
    var b=e.target.closest("button");if(!b)return;
    var id=b.id;
    if(id==="btnCie"){var sl=$("cieAdd");if(sl.selectedIndex>0&&!S.ini.cie.some(function(c){return c.c===sl.value})){S.ini.cie.push({c:sl.value,t:$("cieTipo").value});rCie();rT3()}else aviso("Seleccione un diagnóstico que no esté en la lista.",true);return}
    if(b.hasAttribute("data-dc")){S.ini.cie.splice(+b.getAttribute("data-dc"),1);rCie();rT3();return}
    if(id==="btnMed"){S.ini.med.push({p:PROD[0],d:"",v:"EV",o:"DIA",dias:1,q:1});rMed();rApl();return}
    if(b.hasAttribute("data-dm")){S.ini.med.splice(+b.getAttribute("data-dm"),1);rMed();rApl();return}
    if(b.hasAttribute("data-kd")){S.ini.kit.splice(+b.getAttribute("data-kd"),1);rKit();return}
    if(id==="sign1"){var pa=$("pa").value.split("/");
      if(!S.ini.cie.length){aviso("Registre al menos un problema clínico CIE-10.",true);return}
      if(pa.length!==2||+pa[0]<=+pa[1]){aviso("Revise la PA: la sistólica debe ser mayor que la diastólica.",true);$("pa").classList.add("err");return}
      if(S.ini.medOn&&S.ini.med.some(function(m){return!String(m.d).trim()})){aviso("5.2 PRESCRIBIR RECETA: complete la posología de cada producto.",true);return}
      if(!S.ini.medOn)S.ini.med=[];
      if(S.ini.rxOn){
        if($("farm").selectedIndex===0){$("farm").classList.add("err");aviso("Receta en SÍ: seleccione la farmacia que dispensa.",true);return}
        if(!S.ini.kit.length&&!S.ini.med.length){aviso("Receta en SÍ: agregue al menos un insumo o medicamento, o cambie «Prescribir receta» a NO.",true);return}
        var malas=q("[data-kq]").filter(function(x){return!/^[1-9]\d*$/.test(String(x.value).trim())});
        if(malas.length){malas.forEach(function(x){x.classList.add("err")});aviso("Las cantidades del kit deben ser números enteros mayores que 0.",true);return}}
      S.ini.receta=S.ini.rxOn?{r:"R-0045921",f:"FUR-0012421"}:{r:"SIN RECETA",f:"SIN FUR"};$("rxVale").value=S.ini.receta.r;$("rxFur").value=S.ini.receta.f;
      S.ini.vit={pa:$("pa").value,fc:$("fc").value,fr:$("fr").value,so2:$("so2").value,ps:$("ps").value,pi:$("pi").value,uf:$("uf").value,hhd:$("hhd").value};
      S.ini.firm={u:usuario(),h:ahora()};S.t=2;guardarReg();todo();cerrarModal();window.scrollTo(0,0);aviso("Evaluación inicial firmada"+(S.ini.rxOn?"; receta y FUR enviados a farmacia":" sin receta")+". Se habilitó la EVOLUCIÓN DE ENFERMERÍA en el Módulo de Enfermería.");return}
    if(id==="btnRecargar"){location.reload();return}
    if(b.hasAttribute("data-cancelar")){if(MODAL&&window.parent!==window){try{window.parent.postMessage("hd-cerrar","*")}catch(x){}}else{irTab("nueva");window.scrollTo(0,0)}return}
    if(id==="btnFinMed"){S.fin.med.push({p:NA_PROD[0][0],d:"",v:"VO",pos:"",dias:"1",q:"1"});guardarReg();rFinMed();if(NA&&NA.pint)NA.pint();return}
    if(b.hasAttribute("data-fmd")){S.fin.med.splice(+b.getAttribute("data-fmd"),1);guardarReg();rFinMed();if(NA&&NA.pint)NA.pint();return}
    if(id==="btnContEnf"){var rr=regActual();if(rr&&rr.enf){try{sessionStorage.setItem("hd_irI2","1")}catch(x){}location.reload()}else aviso("Enfermería aún no registra la EVOLUCIÓN DE ENFERMERÍA de esta sesión en el Módulo de Enfermería.",true);return}
    if(b.hasAttribute("data-iri2")){S.t=3;rFlujo();rFirmas();window.scrollTo(0,0);return}
    if(b.hasAttribute("data-irt2")){S.t=2;rFlujo();rT2Res();window.scrollTo(0,0);return}
    if(id==="verResEnf"){S.t=2;rFlujo();irTab("ses");window.scrollTo(0,0);return}
    if(id==="btnCtl"){var p=$("cPa").value;if(!/^\d{2,3}\/\d{2,3}$/.test(p)){aviso("Ingrese la PA como sistólica/diastólica, por ejemplo 120/80.",true);$("cPa").classList.add("err");return}
      S.enf.mon.push({t:"c",h:$("cH").value,pa:p,fc:$("cFc").value||"—",qb:$("cQb").value,na:$("cNa").value,ra:$("cRa").value||"—",rv:$("cRv").value||"—",ptm:$("cPtm").value||"—",o:$("cO").value,u:usuario()});rMon();rT3();borrador();aviso("Control registrado.");return}
    if(id==="btnEv"){if(!$("eA").value.trim()){aviso("Describa la acción tomada ante el evento.",true);$("eA").classList.add("err");return}
      S.enf.mon.push({t:"e",h:ahora(),ev:$("eT").value,ac:$("eA").value,u:usuario()});$("eA").value="";rMon();rT3();borrador();aviso("Evento registrado.");return}
    if(id==="btnAplAdd"){if(!$("aplD").value.trim()){aviso("Ingrese la dosis del medicamento.",true);$("aplD").classList.add("err");return}
      S.enf.aplExtra=S.enf.aplExtra||[];S.enf.aplExtra.push({p:$("aplP").value,d:$("aplD").value.trim(),v:$("aplV").value,h:ahora(),u:usuario()});$("aplD").value="";rApl();rT3();borrador();aviso("Medicamento agregado como aplicado.");return}
    if(b.hasAttribute("data-apx")){S.enf.aplExtra.splice(+b.getAttribute("data-apx"),1);rApl();rT3();borrador();return}
    if(b.hasAttribute("data-ap")){S.enf.apl[b.getAttribute("data-ap")]=ahora();rApl();rT3();borrador();return}
    if(b.hasAttribute("data-paeadd")){S.enf.pend[b.getAttribute("data-paeadd")]=true;rPae();return}
    if(b.hasAttribute("data-accan")){S.enf.pend[b.getAttribute("data-accan")]=false;rPae();return}
    if(b.hasAttribute("data-acok")){var t=b.getAttribute("data-acok"),v=($("ac-"+t).value||"").split(" - ")[0].trim(),ex=cat(t).some(function(x){return x[0]===v});
      if(!ex){aviso("Elija un código de la lista.",true);return}
      if(t==="noc")S.enf.noc.push({c:v,v:$("acv-noc").value});else S.enf[t].push(v);S.enf.pend[t]=false;rPae();aviso(nomCat(cat(t),v)+" agregado.");return}
    if(b.hasAttribute("data-paedel")){S.enf[b.getAttribute("data-paedel")].splice(+b.getAttribute("data-i"),1);rPae();return}
    if(id==="paeEval"){if(!S.enf.noc.length){aviso("Agregue al menos un resultado NOC para generar la evaluación.",true);return}
      var tx=S.enf.noc.map(function(n){return nomCat(NOC,n.c)+": puntuación "+n.v+" de 5 ("+(n.v>=4?"logrado":n.v>=3?"parcialmente logrado":"no logrado")+")"}).join("\n");
      var nev=S.enf.mon.filter(function(r){return r.t==="e"}).length;S.enf.detEva=tx+(nev?"\nEventos durante la sesión: "+nev+".":"\nSin eventos durante la sesión.");$("paeEva").value=S.enf.detEva;aviso("Evaluación generada a partir de los NOC. Puede editarla.");return}
    if(id==="sign2"){if(!S.ini.firm){aviso("La ficha se habilita cuando el nefrólogo firma la I.1 EVALUACIÓN INICIAL.",true);return}
      if(!esEnf()){aviso("Solo enfermería de hemodiálisis registra esta ficha.",true);return}
      if(!/^\d{2,3}\/\d{2,3}$/.test($("pai").value.trim())){aviso("Registre la PA inicial como sistólica/diastólica, por ejemplo 120/80.",true);irNt("hd");$("pai").classList.add("err");return}
      if(!S.enf.mon.some(function(r){return r.t==="c"})){aviso("Registre al menos un control del tratamiento antes de guardar.",true);irNt("hd");return}
      if(!$("ufe").value.trim()){aviso("Registre la UF efectiva en el cierre de enfermería.",true);irNt("hd");$("ufe").classList.add("err");return}
      if(!S.enf.guard){S.enf.cur=$("cur0").checked;S.enf.guard={u:usuario(),h:ahora()};guardarReg();estEsp(S.enf.guard);aviso("Registro guardado. En espera de la firma: pulse FINALIZAR.");return}
      S.enf.cur=$("cur0").checked;S.enf.firm={u:usuario(),h:ahora()};estEsp(null);S.t=3;guardarReg();todo();window.scrollTo(0,0);aviso("Nota de enfermería firmada y guardada. Ya figura en REGISTRADOS y sus resultados pasan al Módulo de Procedimiento Programado.");if(ENF)setTimeout(function(){location.href="enfermeria.html?est=REG"},1500);return}
    if(id==="sign3"){if(!S.enf.firm){aviso("Falta la EVOLUCIÓN DE ENFERMERÍA del Módulo de Enfermería.",true);return}
      if(!$("condFin").value.trim()){aviso("Registre la condición clínica al finalizar.",true);$("condFin").classList.add("err");return}
      var RX=ESTP.finRx||{on:true};if(RX.on&&S.fin.med.some(function(m){return!String(m.pos||"").trim()})){aviso("Complete la posología de cada producto de la receta.",true);return}
      if(!RX.on){S.fin.med=[];rFinMed()}
      if(!ESTP.finGuard){ESTP.finGuard={u:usuario(),h:ahora()};guardarReg();rFirmas();aviso("Registro guardado. En espera de la firma del médico: pulse FINALIZAR.");return}
      S.fin.firm={u:usuario(),h:ahora()};
      ESTP.finDat={h:$("hFin").value,cond:$("condFin").value,cpms:q("#tblCpms tr").slice(1).filter(function(tr){var c=tr.querySelector("input");return c&&c.checked}).map(function(tr){var t=tr.querySelectorAll("td");return[t[1].textContent,t[2].textContent,t[3].textContent]})};
      ESTP.atendidoSes=true;guardarReg();todo();cerrarModal();aviso("Sesión cerrada. La prestación pasó a producción con CIE-10 y CPMS.");return}
    if(id==="btnGuardar"){if(!habilitada){aviso("Este paciente aún no tiene Historia Clínica Inicial y citas programadas.",true);return}
      if(!S.fin.firm){aviso("La SESIÓN DE HEMODIÁLISIS debe tener sus 3 tiempos firmados antes de guardar.",true);irTab("ses");return}
      if(!ESTP.guardSes){ESTP.guardSes={u:usuario(),h:ahora()};guardar();todo();aviso("Registro guardado. En espera de la firma del médico: pulse FINALIZAR.");return}
      ESTP.atendidoSes=true;guardar();todo();menu();aviso("Atención finalizada. El procedimiento programado Nº "+P.cod+" quedó ATENDIDO.");return}
  });
  document.addEventListener("change",function(e){var x=e.target;
    if(x.hasAttribute&&x.hasAttribute("data-mi")){S.ini.med[+x.getAttribute("data-i")][x.getAttribute("data-mi")]=x.value;if(x.getAttribute("data-mi")==="p")rMed();rApl();return}
    if(x.id==="rxMedOn"){S.ini.medOn=x.checked;rMed();return}
    if(x.hasAttribute&&x.hasAttribute("data-fi")){var fm=S.fin.med[+x.getAttribute("data-i")];fm[x.getAttribute("data-fi")]=x.value;if(x.getAttribute("data-fi")==="pos")fm.d=x.value;guardarReg();if(x.getAttribute("data-fi")==="p")rFinMed();if(NA&&NA.pint)NA.pint();return}
    if(x.id==="fmRxOn"){ESTP.finRx.on=x.checked;guardar();rFinMed();return}
    if(x.id==="fmContOn"){ESTP.finRx.cont=x.checked;guardar();return}
    if(x.id==="rxContOn"){S.ini.cont=x.checked;return}
    if(x.id==="farm"&&$("rxFarm2"))$("rxFarm2").value=x.value;
    if(x.hasAttribute("data-dt")){S.ini.cie[+x.getAttribute("data-dt")].t=x.value;rT3()}
    if(x.hasAttribute("data-nocv"))S.enf.noc[+x.getAttribute("data-nocv")].v=x.value;
    if(x.name==="rx"){S.ini.rxOn=$("rx0").checked;$("rxBox").hidden=!S.ini.rxOn}
    if(x.name==="tacc"){var fav=$("tacc0").checked;S.acceso=fav?"FAV":"CVC";$("accFav").hidden=!fav;$("accCvc").hidden=fav;rT3()}
    if(x.name==="cur"){S.enf.cur=$("cur0").checked;rT3();rEnf()}
    if(x.closest&&x.closest("#fs2"))borrador();
    if(x.id==="frec"){S.enf.frec=+x.value;rMon()}
    if(x.id==="cpms")rT3();
    if(x.id==="farm")x.classList.remove("err");
  });
  document.addEventListener("input",function(e){var x=e.target;
    if(x.hasAttribute&&x.hasAttribute("data-mi")&&x.tagName==="INPUT"){S.ini.med[+x.getAttribute("data-i")][x.getAttribute("data-mi")]=x.value}
    if(x.hasAttribute&&x.hasAttribute("data-fi")&&x.tagName==="INPUT"){var fm2=S.fin.med[+x.getAttribute("data-i")];fm2[x.getAttribute("data-fi")]=x.value;if(x.getAttribute("data-fi")==="pos")fm2.d=x.value}
    if(x.hasAttribute("data-kq")){S.ini.kit[+x.getAttribute("data-kq")].q=x.value;x.classList.remove("err")}
    if(["pi","ps","uf"].indexOf(x.id)>=0){var d=(+$("pi").value-+$("ps").value).toFixed(1),w=+$("uf").value>+$("ps").value*0.05;$("ufh").innerHTML="Peso inicial − peso seco: "+d+" kg"+(w?' · <b style="color:#A94442">UF mayor al 5 % del peso seco</b>':"");rT3()}
    if(x.id==="ufe"){var v=+x.value,dd=Math.abs(v-2.6)/2.6;$("ufw").innerHTML=x.value&&dd>0.2?'<b style="color:#A94442">Difiere más de 20 % de la UF programada</b>':""}
    if(x.id==="paeInt")S.enf.detInt=x.value;
    if(x.id==="paeEva")S.enf.detEva=x.value;
    if(x.closest&&x.closest("#fs2"))borrador();
    if(x.classList&&x.classList.contains("err"))x.classList.remove("err");
  });

  /* Pestañas inferiores de la nota de enfermería (SIGNOS VITALES, ANTECEDENTES, CPMS/CPT, OBSERVACIONES) */
  function irNt(n){q(".nt-tabs [data-nt]").forEach(function(t){t.classList.toggle("on",t.getAttribute("data-nt")===n)});q("[data-ntp]").forEach(function(p){p.hidden=p.getAttribute("data-ntp")!==n})}
  document.addEventListener("click",function(e){var t=e.target.closest(".nt-tabs [data-nt]");if(t)irNt(t.getAttribute("data-nt"))});
  window.addEventListener("pageshow",function(e){if(e.persisted)location.reload()});

  if(!ENF&&habilitada)NA=nuevaAtencion({dx:["Z49.2 - OTRAS DIALISIS"].concat(S.ini.cie.map(function(c){return c.c.replace(" · "," - ")})),paq:{t:"Paquete mensual del Programa HD",l:NA_PAQ.mensual},
    rxHD:function(){var stock=function(p){var x=NA_PROD.filter(function(n){return n[0].slice(0,7)===String(p).slice(0,7)})[0];return x?x[1]:"—"};
      return{firm:!!S.ini.firm,sin:!S.ini.rxOn,fecha:P.fecha,farm:NA_FARM[0],cont:S.ini.cont!=null?S.ini.cont:S.ini.med.some(function(m){return m.o==="MEN"}),vale:S.ini.receta?S.ini.receta.r:"—",fur:S.ini.receta?S.ini.receta.f:"—",
        items:S.ini.med.map(function(m){return{p:m.p.replace(" · "," - "),st:stock(m.p),v:m.v,pos:m.d,dias:m.dias||1,q:m.q||1,o:ORIGEN[m.o]}}).concat(S.ini.kit.map(function(k){return{p:k.c+" - "+k.n,st:k.st,v:"—",pos:"EN CADA SESIÓN DE HEMODIÁLISIS",q:k.q,o:"KIT · FUR"}})).concat(S.fin.med.map(function(m){return{p:m.p,st:stock(m.p),v:m.v,pos:m.d+" "+m.pos+" · "+m.dias+" día(s)",q:m.q,o:"I.2 EVALUACIÓN FINAL"}}))}}});
  todo();
  /* Registro de la cita tal como está guardado (lo comparten la pestaña del médico y la de enfermería) */
  function regActual(){var x=leerDemo();if(!x)return null;var e=P.clave==="gutierrez"?x.gutierrez:(nCita?(x.romero.ses||{})[nCita]:x.romero);return e&&e.reg}
  if(!ENF&&habilitada&&S.ini.firm&&!S.enf.firm){var chk=function(){var r=regActual();if(r&&r.enf)location.reload()};setInterval(chk,4000);window.addEventListener("storage",function(e){if(e.key==="hd_demo")chk()})}
  /* «Continuar» con la nota de enfermería ya firmada: pasa directo a la I.2 EVALUACIÓN FINAL */
  try{if(sessionStorage.getItem("hd_irI2")){sessionStorage.removeItem("hd_irI2");if(!ENF&&S.enf.firm&&!S.fin.firm){S.t=3;rFlujo()}}}catch(x){}
  if(ENF){aplicarEnf();rMon();irTab("nueva");irNt("hd")}
  else irTab(habilitada||MODAL?"ses":"nueva");
}

/* =====================================================================
   MÓDULO DE ENFERMERÍA (EF) · LISTA DE PACIENTES DE ENFERMERÍA - CONSULTA EXTERNA
   Estructura actual de SIGESAPOL. Las citas del Programa de Hemodiálisis habilitan la
   EVOLUCIÓN DE ENFERMERÍA (ficha 0026_04) cuando el nefrólogo firma la I.1.
   ===================================================================== */
/* =====================================================================
   OTRO PROCEDIMIENTO PROGRAMADO (sin NEFROLOGÍA + 90935/90937): la atención queda como hoy
   ===================================================================== */
if(PAGINA==="otro"){
  var OK=param("c")==="bio"?"bio":"card",X=OTROS[OK];
  $("otCita").textContent="cita única · Nº "+X.cod;
  $("otPac").innerHTML='<b>TIPO Y Nº DE DOC</b><span>: DNI - '+X.dni+'</span><b>APELLIDOS Y NOMBRES</b><span>: '+esc(X.nom.replace(",",""))+'</span><b>FECHA DE NACIMIENTO</b><span>: '+X.fnac+'</span><b>EDAD / SEXO</b><span>: '+X.edad+' - '+X.sexo+'</span><b>TIPO DE BENEFICIARIO</b><span>: '+X.par+'</span>';
  $("otAte").innerHTML='<b>COD. SITEDS SUSALUD</b><span>: [código SITEDS]</span><b>FECHA Y HORA DE ATENCIÓN</b><span>: '+X.fecha+':00</span><b>TIPO DE ATENCIÓN</b><span>: AMBULATORIO</span><b>SERVICIO SOLICITANTE</b><span>: '+X.serv+'</span><b>PROFESIONAL DE SALUD</b><span>: DNI - [Nº] / '+esc(ORIGEN_AT[OK].med)+'</span>';
  $("otResp").innerHTML='<tr><th>TIPO Y Nº DE DOC</th><th>APELLIDOS Y NOMBRES</th><th>ESPECIALIDAD</th><th>Nº DE CMP</th><th>Nº DE RNE</th></tr>'+(OK==="bio"?'<tr><td>DNI - [Nº]</td><td>Dr. R. VILCHEZ MORA</td><td>NEFROLOGÍA</td><td>051234</td><td>030112</td></tr>':'<tr><td colspan="5" class="vacio">⚠ La cita de este procedimiento no tiene médico programado en el turno. Programe al médico en el consultorio para que figure como responsable.</td></tr>');
  $("otProc").innerHTML='<tr><th style="width:30px"></th><th>Código</th><th>Descripción</th><th>Cantidad</th><th>Diagnóstico</th><th class="c">Atención origen</th></tr><tr><td><input type="checkbox" checked aria-label="Procedimiento seleccionado"></td><td>'+X.cpms+'</td><td>'+DESC[X.cpms]+'</td><td>01</td><td>'+esc(X.dx)+'</td><td class="c"><button type="button" class="btn sm g" data-origen aria-label="Ver atención origen">👁</button></td></tr>';
  NA=nuevaAtencion({dx:[X.dx]});
  if(EST.otros[OK]){$("btnGuardar").disabled=true;$("otPac").closest(".dos").insertAdjacentHTML("beforebegin",'<div class="nota ok"><b>Atención guardada.</b> El procedimiento programado Nº '+X.cod+' quedó ATENDIDO.</div>')}
  EST.otrosG=EST.otrosG||{};
  var stOtro=function(){if(EST.otrosG[OK]&&!EST.otros[OK]){$("btnGuardar").textContent="FINALIZAR";var n=$("otEsp");if(!n){$("btnGuardar").closest(".acciones").insertAdjacentHTML("beforebegin",'<div class="nota" id="otEsp"></div>');n=$("otEsp")}n.innerHTML='<b>Registro guardado</b> por '+esc(EST.otrosG[OK].u)+' · '+EST.otrosG[OK].h+' · <span class="st s2">EN ESPERA DE LA FIRMA DEL MÉDICO</span>'}};stOtro();
  document.addEventListener("click",function(e){if(e.target.id!=="btnGuardar")return;
    if(!EST.otrosG[OK]){EST.otrosG[OK]={u:usuario(),h:ahora()};guardar();stOtro();aviso("Registro guardado. En espera de la firma del médico: pulse FINALIZAR.");return}
    if($("otEsp"))$("otEsp").remove();EST.otros[OK]=true;guardar();e.target.disabled=true;e.target.textContent="FINALIZAR";menu();aviso("Atención guardada. El procedimiento programado Nº "+X.cod+" quedó ATENDIDO"+(NA.resumen()?" ("+NA.resumen()+")":"")+".")});
}

if(PAGINA==="enf"){
  var origenFoco=null;
  function estEnf(c){if(c.atendido||c.reg.enf)return["s4","EVOLUCIÓN HD: REGISTRADA"];if(c.reg.ini)return["s2","EVOLUCIÓN HD: HABILITADA · PENDIENTE"];return["s0","EVOLUCIÓN HD: BLOQUEADA (falta I.1)"]}
  function urlNota(c){return"enfermeria-nota.html?p="+c.p.clave+(c.p.clave==="romero"?"&n="+c.n:"")}
  /* Citas del programa por paciente */
  function citasHD(){
    var g=paciente("gutierrez"),out=[{clave:"gutierrez",p:g,citas:[{n:0,p:g,cod:21,fecha:"04/11/2026",hora:"06:00",ses:5,total:13,reg:EST.gutierrez.reg||{},guard:(EST.gutierrez.enf||{}).guard,atendido:EST.gutierrez.atendidoSes,med:TURNOS[0].med}]}];
    var R=EST.romero;
    if(R.prog&&R.atendidoOrden){var cs=citasDe(R.prog),p0=paciente("romero",0);
      out.unshift({clave:"romero",p:p0,citas:cs.map(function(c,i){var e=sesEst(i);return{n:i,p:paciente("romero",i),cod:22+i,fecha:c.f.replace(/-/g,"/"),hora:c.h,ses:i+1,total:cs.length,reg:e.reg||{},guard:(e.enf||{}).guard,atendido:e.atendidoSes,med:TURNOS[c.t-1].med}})})}
    return out}
  /* Notas de enfermería ya registradas en Nefrología (consulta externa estándar, datos ficticios) */
  function filas(){var r=[];
    citasHD().forEach(function(pc){pc.citas.forEach(function(c,i){if(i===0||c.reg.ini)r.push({pc:pc,c:c})})});
    return r}
  /* REGISTRADOS: ☰ muestra los datos que registró la enfermera (DETALLE ENFERMERIA, solo lectura) */
  /* ☰ abre NOTAS DE INGRESO ENFERMERIA (formato SIGESAPOL): ✎ editar · 👁 detalle · PDF */
  var LISTAS=[];
  function verBtn(nota,url){if(!nota)return"";var i=NOTAS_VISTAS.length;NOTAS_VISTAS.push(nota);var k=LISTAS.length;LISTAS.push({vi:i,nota:nota,url:url||""});return'<button type="button" class="ico" data-notas="'+k+'" aria-label="Notas de ingreso de enfermería" title="Notas de ingreso de enfermería">☰</button>'}
  function pendBtn(c){var k=LISTAS.length;LISTAS.push({pend:true,c:c,url:urlNota(c)});return'<button type="button" class="ico" data-notas="'+k+'" aria-label="Notas de ingreso de enfermería" title="Notas de ingreso de enfermería">☰</button>'}
  function abrirNotas(k){var L=LISTAS[k];if(!L)return;origenFoco=document.activeElement;
    var fila,u,r,hoy;
    if(L.pend){var G=L.c.guard;u=G?G.u:(ENFERMERAS[usuario()]?usuario():"Lic. C. HUAMAN");r=ENFERMERAS[u]||{dni:"—",nom:u,ape:""};var hab=!!L.c.reg.ini;
      fila='<tr class="nuevo"><td>'+(G?idEnf(L.c.cod):'<span class="mini">por generar</span>')+'</td><td>'+L.c.fecha.replace(/\//g,"-")+'</td><td>'+(G?h12(G.h):'—')+'</td><td><b>DNI:</b> '+r.dni+'<br><b>NOMBRES:</b> '+esc(r.nom)+'<br><b>APELLIDOS:</b> '+esc(r.ape)+'</td><td class="nw">'+
        (hab?'<a class="btn sm g" style="text-decoration:none" href="'+L.url+'" title="'+(G?'Editar y FINALIZAR la nota':'Registrar nota de enfermería')+'" aria-label="Editar nota">✎</a>'+(G?'<br><span class="mini" style="color:#8A6D3B">guardada · falta FINALIZAR</span>':''):'<span class="mini">falta I.1 del médico</span>')+'</td></tr>'}
    else{var x=L.nota;r=ENFERMERAS[x.u]||{dni:"—",nom:x.u,ape:""};
      fila='<tr><td>'+x.id+'</td><td>'+String(x.fecha).replace(/\//g,"-")+'</td><td>'+x.hora+'</td><td><b>DNI:</b> '+r.dni+'<br><b>NOMBRES:</b> '+esc(r.nom)+'<br><b>APELLIDOS:</b> '+esc(r.ape)+'</td><td class="nw">'+
        '<button type="button" class="btn sm k" data-verenf="'+L.vi+'" title="Ver detalle" aria-label="Ver detalle de enfermería">👁</button> <button type="button" class="btn sm g" data-pdf="'+L.vi+'" title="Imprimir PDF" aria-label="Imprimir PDF">🗎</button></td></tr>'}
    $("enfDet").innerHTML='<div class="bar" style="justify-content:center;position:relative"><span id="edTit">NOTAS DE INGRESO ENFERMERIA</span><button type="button" class="btn sm k" id="edX" aria-label="Cerrar" style="position:absolute;right:14px">✕</button></div><div class="box"><div class="tw"><table class="dt-hist"><tr><th>#</th><th>Fecha Atención</th><th>Hora Atención</th><th>Responsable</th><th>Detalle</th></tr>'+fila+'</table></div>'+
      '<div class="acciones" style="justify-content:space-between;align-items:center"><span>Mostrando 1 de 1 a 1 registros</span><span class="pag"><button type="button" class="btn sm k" disabled>Previo</button> <button type="button" class="btn sm g">1</button> <button type="button" class="btn sm k" disabled>Siguiente</button></span></div></div>';
    $("velo").classList.add("ver");document.body.style.overflow="hidden";$("edX").focus()}
  function pdfNota(i){var x=NOTAS_VISTAS[i];if(!x)return;var w=window.open("","_blank");if(!w){aviso("Permita ventanas emergentes para imprimir.",true);return}
    w.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Nota de enfermería '+x.id+'</title><link rel="stylesheet" href="css/hemodialisis.css?v=3.40"><style>body{background:#fff;padding:16px}.dt-box [data-dtp]{display:block!important}.dt-tabs{display:none}</style></head><body><div style="text-align:center;margin-bottom:10px"><b>HOSPITAL NACIONAL PNP LUIS N. SAENZ</b><br>NOTA DE INGRESO DE ENFERMERÍA N° '+x.id+'</div>'+detalleEnf(x)+'<script>setTimeout(function(){window.print()},400)<\/script></body></html>');w.document.close()}
  function pintar(){NOTAS_VISTAS=[];LISTAS=[];
    var doc=$("eDoc").value.trim(),ser=$("eSer").value,reg=$("eEst").value==="REG",n=0,html='<tr><th>N°</th><th>Fecha y hora cita</th><th>Fecha y hora atención</th><th>Datos atención</th><th>Paciente</th><th>Médico</th><th class="c">Notas enfermería</th></tr>';
    var fila=function(o){n++;return'<tr'+(o.nuevo?' class="nuevo"':'')+'><td>'+o.n+'</td><td>'+o.cita+'</td><td>'+o.ate+'</td><td>'+o.datos+'</td><td><b>DNI:</b> '+o.dni+'<br><b>NOMBRES:</b> '+esc(o.nom)+'</td><td><b>DNI:</b> '+o.mdni+'<br><b>Nombre</b> '+esc(o.med)+'</td><td class="c nw">'+o.acc+'</td></tr>'};
    if(ser!=="CARDIOLOGÍA")filas().forEach(function(x){var c=x.c,ok=c.atendido||c.reg.enf;
      if(doc&&c.p.dni.indexOf(doc)<0)return;if(reg!==!!ok)return;
      var e=estEnf(c);
      html+=fila({nuevo:c.reg.ini&&!ok,n:ok?idEnf(c.cod):'<span class="mini">por generar</span>',cita:c.fecha+' '+esc(c.hora),ate:ok?(c.fecha+' '+(c.reg.enf?c.reg.enf.h:"10:00")):c.reg.ini?c.fecha+' '+c.reg.ini.h:"—",
        datos:'NEFROLOGÍA<br><span class="mini">HEMODIÁLISIS · Proc. programado Nº '+c.cod+' · sesión '+c.ses+'/'+c.total+'</span>'+(ok?'':'<br><span class="st '+e[0]+'">'+e[1]+'</span>'),
        dni:c.p.dni,nom:c.p.nom,mdni:"41998877",med:c.reg.ini?c.reg.ini.u:c.med,
        acc:ok?verBtn(notasEnf(x.pc.clave).filter(function(z){return z.hd&&z.cod===c.cod})[0],urlNota(c)):pendBtn(c)})});
    if(reg)(EST.notasStd||[]).slice().reverse().forEach(function(r){if(doc&&r.dni.indexOf(doc)<0)return;if(ser!=="TODOS"&&ser!==r.serv)return;html+=fila({n:r.id,cita:r.fecha+" "+r.hora,ate:r.fecha+" "+r.hora,datos:r.serv,dni:r.dni,nom:r.nom,mdni:"—",med:r.med,acc:verBtn({id:r.id,serv:r.serv,fecha:r.fecha,hora:h12(r.hora),u:r.u,med:r.med,hd:false,dx:r.dx,pac:r.pac,ini:{vit:r.vit||{}},obs:r.obs})})});
    if(reg&&ser!=="CARDIOLOGÍA")REGISTRADAS.forEach(function(r){if(doc&&r.dni.indexOf(doc)<0)return;html+=fila({n:r.n,cita:r.cita,ate:r.cita,datos:"NEFROLOGÍA",dni:r.dni,nom:r.nom,mdni:r.mdni,med:r.med,acc:verBtn({id:r.n,serv:"NEFROLOGÍA",fecha:r.cita.split(" ")[0],hora:h12(r.cita.split(" ")[1]),u:"Lic. P. ROJAS",med:r.med,hd:false,dx:"N18.3",dxN:"ENFERMEDAD RENAL CRÓNICA, ESTADIO 3",pac:{nom:r.nom,dni:r.dni,fnac:"—",par:"TITULAR",grado:"—",sexo:"—",edadN:"",com:"HTA",ale:"NIEGA"},ini:{vit:{pa:"130/80",fc:76,fr:18,so2:98,pi:"70",talla:165}}})})});
    if(reg&&ser!=="NEFROLOGÍA"&&(!doc||NOHD.dni.indexOf(doc)>=0))html+=fila({n:"5817511",cita:NOHD.cita,ate:NOHD.ate,datos:NOHD.serv,dni:NOHD.dni,nom:NOHD.nom,mdni:"41556677",med:NOHD.med,acc:verBtn({id:"5817511",serv:NOHD.serv,fecha:NOHD.ate.split(" ")[0],hora:h12(NOHD.ate.split(" ")[1]),u:"Lic. P. ROJAS",med:NOHD.med,hd:false,dx:"I50.0",dxN:"INSUFICIENCIA CARDÍACA CONGESTIVA",pac:{nom:NOHD.nom,dni:NOHD.dni,fnac:NOHD.fnac,par:NOHD.par,grado:NOHD.grado,sexo:NOHD.sexo,edadN:parseInt(NOHD.edad,10),com:"—",ale:"NIEGA"},ini:{vit:{pa:"128/76",fc:82,fr:18,so2:97,pi:"68",talla:160}}})});
    $("tablaEnf").innerHTML=html+(n?'':'<tr><td colspan="7" class="vacio">'+(reg?'Sin notas registradas.':'Sin atenciones pendientes de nota de enfermería.')+'</td></tr>');
    $("contEnf").textContent="Mostrando registros del 1 al "+n+" de un total de "+n+" registros";
  }
  function cerrar(){var v=$("velo");if(!v.classList.contains("ver"))return;v.classList.remove("ver");$("enfDet").innerHTML="";document.body.style.overflow="";if(origenFoco&&document.contains(origenFoco))origenFoco.focus()}
  function abrir(clave){
    origenFoco=document.activeElement;
    var pc=clave==="nohd"?null:citasHD().filter(function(x){return x.clave===clave})[0],p=pc?pc.p:NOHD;
    var sig=pc?pc.citas.filter(function(c){return c.reg.ini&&!c.reg.enf&&!c.atendido})[0]:null;
    var kv='<div class="kv kv2"><b>TIPO Y N° DE DOC</b><span>: DNI - '+p.dni+'</span><b>APELLIDOS Y NOMBRES</b><span>: '+esc(p.nom)+'</span><b>FECHA DE NACIMIENTO</b><span>: '+p.fnac+'</span><b>EDAD / SEXO</b><span>: '+esc(p.edad)+' - '+p.sexo+'</span><b>PARENTESCO</b><span>: '+p.par+'</span><b>GRADO</b><span>: '+esc(p.grado)+'</span>'+(pc?'<b>PROGRAMA</b><span>: HEMODIÁLISIS · '+(p.seq||"LMV")+' · serología '+p.ser+'</span><b>ACCESO</b><span>: '+esc(p.accesoTxt)+'</span>':'')+'</div>';
    var tb;
    if(pc){tb='<tr><th>#</th><th>Fecha y hora cita</th><th>Fecha y hora atención</th><th>Consultorio</th><th>Médico</th><th>Notas enfermería</th></tr>'+pc.citas.map(function(c,i){var e=estEnf(c),ok=c.atendido||c.reg.enf;
      return'<tr'+(c===sig?' class="nuevo"':'')+'><td>'+(i+1)+'</td><td>'+c.fecha+' '+esc(c.hora)+'<br><span class="prof">Nº '+c.cod+' · sesión '+c.ses+' de '+c.total+'</span></td><td>'+(c.reg.ini?c.fecha+' '+c.reg.ini.h:"—")+'</td><td>NEFROLOGÍA · HEMODIÁLISIS</td><td>'+esc(c.reg.ini?c.reg.ini.u:c.med)+'</td><td><span class="st '+e[0]+'">'+e[1]+'</span>'+(ok?'<br><span class="prof">N° atención '+idEnf(c.cod)+'</span><br><a class="btn sm k" style="text-decoration:none;margin-top:4px" href="'+urlNota(c)+'">Ver nota</a>'+(c.reg.enf?' <span class="prof">'+esc(c.reg.enf.u)+' '+c.reg.enf.h+'</span>':''):c.reg.ini?'<br><a class="btn sm g" style="text-decoration:none;margin-top:4px" href="'+urlNota(c)+'">Registrar evolución</a>':'')+'</td></tr>'}).join("")}
    else tb='<tr><th>#</th><th>Fecha y hora cita</th><th>Fecha y hora atención</th><th>Consultorio</th><th>Médico</th><th>Notas enfermería</th></tr><tr><td>1</td><td>'+NOHD.cita+'</td><td>'+NOHD.ate+'</td><td>'+NOHD.serv+'</td><td>'+NOHD.med+'</td><td><span class="st s0">SIN NOTAS</span></td></tr>';
    var btn=pc?(sig?'<a class="btn g" style="text-decoration:none" href="'+urlNota(sig)+'" id="edNueva">✚ Nueva Nota Enfermería</a>'
        :'<button type="button" class="btn g" disabled title="Se habilita cuando el nefrólogo firma la I.1 Evaluación inicial">✚ Nueva Nota Enfermería</button>')
      :'<a class="btn g" style="text-decoration:none" href="enfermeria-nota.html?p=nohd">✚ Nueva Nota Enfermería</a>';
    $("enfDet").innerHTML='<div class="bar"><span id="edTit">DETALLES ENFERMERÍA</span><span class="tag">'+(pc?"programa de hemodiálisis":"consulta externa")+'</span><button type="button" class="btn sm k" id="edX" aria-label="Cerrar" style="margin-left:8px">✕</button></div><div class="box">'+
      '<div class="sub" style="margin-top:0">DATOS PACIENTE</div>'+kv+'<div class="sub">LISTADO DE CITAS</div><div class="acciones" style="margin-top:0;align-items:center">'+btn+'</div><div class="tw"><table>'+tb+'</table></div>'+
      '<div class="acciones" style="justify-content:flex-end"><button type="button" class="btn k" id="edNo">Cerrar</button></div></div>';
    $("velo").classList.add("ver");document.body.style.overflow="hidden";$("edX").focus();
  }
  document.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;
    if(b.hasAttribute("data-det")){abrir(b.getAttribute("data-det"));return}
    if(b.hasAttribute("data-notas")){abrirNotas(+b.getAttribute("data-notas"));return}
    if(b.hasAttribute("data-pdf")){pdfNota(+b.getAttribute("data-pdf"));return}
    if(b.hasAttribute("data-edstd")){aviso("La nota está firmada; la edición sigue el flujo actual de SIGESAPOL.");return}
    if(b.id==="edX"||b.id==="edNo"){cerrar();return}
    if(b.id==="edStd"){aviso("Abre la NOTA DE INGRESO DE ENFERMERÍA - CONSULTA EXTERNA estándar de SIGESAPOL (sin cambios).");return}
    if(b.id==="eExp"){aviso("Exporta la lista (función existente de SIGESAPOL).");return}
    if(b.id==="eNuevo"){location.href="enfermeria-nota.html";return}
  });
  $("velo").addEventListener("mousedown",function(e){if(e.target===this)cerrar()});
  document.addEventListener("keydown",function(e){if(e.key!=="Escape")return;var d=$("veloDE");if(d&&d.classList.contains("ver"))return;cerrar()});
  $("formEnf").addEventListener("submit",function(e){e.preventDefault();pintar()});
  $("eEst").addEventListener("change",pintar);$("eSer").addEventListener("change",pintar);
  $("eEst").value=param("est")==="REG"?"REG":pendEnf()?"PEN":"REG";
  refrescar=pintar;
  pintar();
  window.addEventListener("pageshow",function(e){if(e.persisted)location.reload()});
}

/* =====================================================================
   4. REGISTRO DE ATENCIÓN DEL DÍA (como en la v2)
   ===================================================================== */
if(PAGINA==="dia"){
  /* Cada fila es una cita (N° del Módulo de Procedimientos Programados) enlazada a su registro de atención en 3 tiempos */
  var MED="Dra. M. SALAZAR",ENF="Lic. C. HUAMAN";
  var REGS={"GUTIERREZ ROJAS":EST.gutierrez.reg||(EST.gutierrez.atendidoSes?{ini:{u:MED,h:"06:12"},enf:{u:ENF,h:"09:58"},fin:{u:MED,h:"10:05"}}:null),
    "MENDOZA PAREDES":{ini:{u:MED,h:"06:08"}},"CASTRO VEGA":{ini:{u:MED,h:"06:02"},enf:{u:ENF,h:"09:40"},fin:{u:MED,h:"09:52"}},"QUISPE HUAMANI":null,"RIOS PALACIOS":null,"VARGAS CCAHUANA":null};
  var CITA={"GUTIERREZ ROJAS":21,"MENDOZA PAREDES":17,"CASTRO VEGA":16,"QUISPE HUAMANI":18,"RIOS PALACIOS":19,"VARGAS CCAHUANA":20};
  var cls=["s0","s2","s3","s4"],cnt={s0:0,s2:0,s3:0,s4:0};
  var filas="";
  TURNOS.forEach(function(t){
    var ps=PROGRAMADOS.filter(function(x){return x.seq==="LMV"&&x.t===t.id});if(!ps.length)return;
    filas+='<tr class="grupo"><td colspan="8">'+t.n.toUpperCase()+' · '+t.h+' · NEFRÓLOGO: '+(t.med||'<span style="color:#A94442">SIN ASIGNAR</span>')+' · ENFERMERA: '+(t.enf||"—")+'</td></tr>';
    ps.forEach(function(x){var g=x.n==="GUTIERREZ ROJAS",reg=REGS[x.n],e=estadoReg(reg,g&&EST.gutierrez.atendidoSes),cerr=e[1]==="CERRADA";cnt[e[0]]=(cnt[e[0]]||0)+1;
      filas+='<tr class="'+(e[0]==="s0"?'nuevo':'')+'"><td><b>Nº '+CITA[x.n]+'</b></td><td class="nw">'+esc(x.i.split("HC ")[1]||"—")+'</td><td>'+esc(x.n)+'</td><td>'+MAQ[x.m]+'</td><td class="c">'+(g?5:[6,7,6,5,6][x.m%5])+'</td><td><span class="st '+e[0]+'">'+e[1]+'</span></td><td>'+firmasReg(reg)+'</td><td class="nw">'+
        (g?'<a class="btn sm '+(cerr?'k':'g')+'" style="text-decoration:none" href="atencion-sesion.html?p=gutierrez">'+(cerr?'Ver registro':'Atender')+'</a>':'<button type="button" class="btn sm '+(cerr?'k':'g')+'" data-ej>'+(cerr?'Ver registro':'Atender')+'</button>')+'</td></tr>'})});
  var R=EST.romero,prox="";
  if(R.prog){var ro=paciente("romero"),er=estadoReg(R.reg,R.atendidoSes),cr=er[1]==="CERRADA";
    prox='<div class="sub">PRIMERA SESIÓN DEL PACIENTE NUEVO EN EL PROGRAMA (generada por la Programación y citas)</div><div class="tw"><table><tr><th>N° de cita</th><th>Paciente</th><th>Fecha</th><th>Turno</th><th>Lugar de atención</th><th>Estado</th><th>Registro de atención (3 tiempos)</th><th></th></tr>'+
      '<tr class="nuevo"><td><b>Nº 22</b></td><td>'+esc(ro.nom)+'</td><td>'+ro.fecha+'</td><td>'+TURNOS[ro.turno-1].n+' · '+ro.hora+'</td><td>'+MAQ[ro.maq]+'</td><td><span class="st '+(R.atendidoOrden?er[0]:'s0')+'">'+(R.atendidoOrden?er[1]:'FALTA GUARDAR LA ATENCIÓN Nº 13')+'</span></td><td>'+firmasReg(R.reg)+'</td><td>'+
      (R.atendidoOrden?'<a class="btn sm '+(cr?'k':'g')+'" style="text-decoration:none" href="atencion-sesion.html?p=romero">'+(cr?'Ver registro':'Atender')+'</a>':'<a class="btn sm o" style="text-decoration:none" href="atencion.html">Ir a la atención Nº 13</a>')+'</td></tr></table></div>';}
  cnt=[cnt.s0,0,cnt.s2,cnt.s3,cnt.s4];
  $("vista").innerHTML='<div class="bar">REGISTRO DE ATENCIÓN DEL DÍA · MIÉRCOLES 04-11-2026 · 175 - CONSULTORIO HEMODIÁLISIS</div><div class="box">'+
    '<div class="kpis"><div class="kpi"><div class="v">'+cnt[0]+'</div><div class="t">Por iniciar</div></div><div class="kpi"><div class="v">'+cnt[1]+'</div><div class="t">En evaluación inicial</div></div><div class="kpi alerta"><div class="v">'+cnt[2]+'</div><div class="t">En enfermería</div></div><div class="kpi"><div class="v">'+cnt[3]+'</div><div class="t">Por evaluación final</div></div><div class="kpi ok"><div class="v">'+cnt[4]+'</div><div class="t">Cerradas</div></div></div>'+
    '<div class="tw"><table><tr><th>N° de cita</th><th>N° HC</th><th>Paciente</th><th>Lugar de atención</th><th>N° sesión del mes</th><th>Estado</th><th>Registro de atención (3 tiempos)</th><th></th></tr>'+filas+'</table></div>'+prox+
    '';
  document.addEventListener("click",function(e){if(e.target.closest("[data-ej]"))aviso("Fila de ejemplo. En la maqueta abra la sesión de GUTIERREZ ROJAS o la del paciente nuevo.")});
}

if(PAGINA==="atencion"&&$("histEnf"))$("histEnf").innerHTML=histEnf("romero",null);
if(PAGINA==="atencion"&&$("histAtn")){$("histAtn").innerHTML=histAtenciones("romero");document.addEventListener("click",function(e){if(e.target.closest&&e.target.closest("#btnGuardar,#pgGuardarAt"))setTimeout(function(){ATN_VISTAS=[];$("histAtn").innerHTML=histAtenciones("romero")},50)})}
/* =====================================================================
   GUARDAR: mensaje de confirmación antes de guardar (NUEVA ATENCIÓN y nota de enfermería)
   ===================================================================== */
var CONF_OK=false;
function confirmar(msg,ok){var v=$("veloConf");
  if(!v){document.body.insertAdjacentHTML("beforeend",'<div class="velo" id="veloConf" style="z-index:40"><div class="modal" style="width:460px" role="alertdialog" aria-modal="true" aria-labelledby="cfTit"><div class="bar"><span id="cfTit">CONFIRMAR</span></div><div class="box"><div id="cfMsg" style="font-size:13px;margin:6px 0 14px"></div><div class="acciones" style="justify-content:flex-end;margin:0"><button type="button" class="btn r" id="cfNo">CANCELAR</button><button type="button" class="btn g" id="cfSi">SÍ, GUARDAR</button></div></div></div></div>');v=$("veloConf")}
  $("cfMsg").innerHTML=msg;v.classList.add("ver");$("cfSi").focus();
  var esc=function(e){if(e.key==="Escape"){e.stopImmediatePropagation();fin(false)}};
  var fin=function(si){v.classList.remove("ver");$("cfSi").onclick=$("cfNo").onclick=null;document.removeEventListener("keydown",esc,true);if(si)ok()};
  document.addEventListener("keydown",esc,true);
  $("cfSi").onclick=function(){fin(true)};$("cfNo").onclick=function(){fin(false)}}
document.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("#btnGuardar,#sign1,#sign2,#sign3,#btnGenerar");if(!b||b.disabled||CONF_OK)return;
  if(b.id==="sign2"&&PAGINA==="enfnota"&&!param("p"))return;
  e.stopImmediatePropagation();e.preventDefault();
  var msg=b.textContent.trim()==="FINALIZAR"?"¿Está seguro de finalizar el registro?":"¿Está seguro de guardar el registro?";
  confirmar(msg,function(){CONF_OK=true;try{b.click()}finally{CONF_OK=false}})},true);

/* =====================================================================
   MÓDULO DE GESTIÓN DE CITAS (CE) · SIGESAPOL
   - Cualquier servicio: una cita por día (calendario + programación médica por consultorio, horarios de 15 min).
   - NEFROLOGÍA + paciente del Programa de Hemodiálisis (HC inicial firmada): CITAS MÚLTIPLES.
     El «consultorio» es el turno de hemodiálisis (nefrólogo) y los «horarios» son las máquinas libres.
   ===================================================================== */
if(PAGINA==="citas"){
  var R=EST.romero,ORI=param("ori");
  var MES=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  /* Pacientes de la demostración (datos ficticios) */
  var PACS={"40871236":function(){var p=paciente("romero");return{clave:"romero",nom:p.nom,dni:p.dni,par:p.par,grado:p.grado,hc:p.dni,tel:"987 654 321",dom:"AV. LOS ÁLAMOS 245, LIMA",ser:p.ser,acc:p.accesoTxt,hd:!!R.hc}},
    "40718235":function(){var p=paciente("gutierrez");return{clave:"gutierrez",nom:p.nom,dni:p.dni,par:p.par,grado:p.grado,hc:"0238145",tel:"965 112 334",dom:"JR. LAS GARDENIAS 118, SURCO",ser:p.ser||"NEGATIVA",acc:p.accesoTxt,hd:true,vigente:true}},
    "41556677":function(){var x=OTROS.card;return{clave:"card",nom:x.nom,dni:x.dni,par:x.par,grado:"—",hc:x.dni,tel:"",dom:"",hd:false}}};
  var PAC=null,C={y:2026,m:9},H={fechas:[],sel:null,hora:"",guard:false},U={fecha:null,slot:null},MODO="std",TAB="emg";
  if(!EST.citasStd)EST.citasStd=[];
  /* Programación médica estándar (consultorios externos, nombres ficticios) */
  var SLOTS=function(h1,h2){var r=[],a=h1*60;while(a<h2*60){var f=function(t){var h=Math.floor(t/60),mm=t%60,ap=h<12?"AM":"PM",h12=h%12||12;return("0"+h12).slice(-2)+":"+("0"+mm).slice(-2)+" "+ap};r.push(f(a)+" - "+f(a+15));a+=15}return r};
  var CONS=[{med:"Dr. L. CAMPOS ORTIZ",con:"4 - C1-PIP I",h:[8,13]},{med:"Dra. R. MEZA LUNA",con:"11 - C2-PIP I",h:[8,13]},{med:"",con:"4 - T C1-PIP I",h:[14,19]},{med:"",con:"11 - T C2-PIP I",h:[14,19]}];
  var ocupStd=function(fecha,c,i){return(fecha.length+c*3+i*7)%5===0||EST.citasStd.some(function(x){return x.f===fecha&&x.c===c&&x.i===i})};

  /* Secuencia, vigencia y N° de sesiones se generan solos a partir de los días marcados en el calendario */
  var MIN_HD="2026-10-22"; /* fecha de la orden Nº 13: no se programan sesiones antes */
  function hSeq(){var a=0,b=0;H.fechas.forEach(function(f){if(seqDeIso(f)==="LMV")a++;else b++});return!H.fechas.length?"":a&&b?"MIXTA":a?"LMV":"MJS"}
  function hTxtSeq(){var s=hSeq();return s==="LMV"?"L-M-V · lunes, miércoles y viernes":s==="MJS"?"Ma-J-S · martes, jueves y sábado":s==="MIXTA"?"Personalizada (días de ambas secuencias)":"—"}
  function seqDeIso(iso){var g=iso2d(iso).getDay();return g===0?null:[1,3,5].indexOf(g)>=0?"LMV":"MJS"}
  /* Máquina libre en ese turno en TODAS las fechas elegidas (respeta aislamiento por serología) */
  function libre(t,m){var pos=PAC&&PAC.ser==="POSITIVA";if(pos?m!==ISO:m===ISO)return{ok:false,txt:pos?"requiere aislamiento":"solo serología (+)"};
    var c=H.fechas.filter(function(f){var s=seqDeIso(f);return!s||ocupante(s,t,m)});
    if(!c.length)return{ok:true};var o=ocupante(seqDeIso(c[0])||"LMV",t,m);return{ok:false,txt:c.length===H.fechas.length&&o?"OCUPADO · "+o.n:"ocupado en "+c.length+" fecha(s)"}}
  function ocupante(seq,t,m){return PROGRAMADOS.filter(function(x){return x.seq===seq&&x.t===t&&x.m===m})[0]}
  /* Horarios de hemodiálisis en bloques de 30 min (06:00 AM a 11:30 PM, último bloque 11:00 PM); la sesión es un rango de 4 horas */
  var HD_INI=360,HD_FIN=1380,BLQ=30,RANGO=240;
  var mm=function(hm){var a=hm.split(":");return(+a[0])*60+(+a[1])},hm=function(x){return("0"+Math.floor(x/60)).slice(-2)+":"+("0"+x%60).slice(-2)};
  var ap=function(x){var h=Math.floor(x/60)%24,mi=x%60;return("0"+(h%12||12)).slice(-2)+":"+("0"+mi).slice(-2)+" "+(h<12?"AM":"PM")};
  var VENT=TURNOS.map(function(T){var a=T.h.split(" - ");return{T:T,a:mm(a[0]),b:mm(a[1])}});
  function turnoDe(x){var v=VENT.filter(function(w){return x>=w.a&&x<w.b})[0];if(v)return v.T;v=VENT.filter(function(w){return w.a>x})[0];return v?v.T:null}
  /* Estado de un bloque de 30 min de una máquina en TODAS las fechas elegidas */
  function bloque(m,x){var pos=PAC&&PAC.ser==="POSITIVA";if(pos?m!==ISO:m===ISO)return{ok:false,txt:pos?"requiere aislamiento":"solo serología (+)"};
    var w=VENT.filter(function(v){return x>=v.a&&x<v.b})[0];if(w&&!w.T.med)return{ok:false,txt:"sin nefrólogo"};
    var c=0,o=null;H.fechas.forEach(function(f){var sq=seqDeIso(f),oc=w&&sq?ocupante(sq,w.T.id,m):null;if(oc){c++;o=oc}});
    return c?{ok:false,txt:c===H.fechas.length?"ocupado · "+o.n:"ocupado en "+c+" fecha(s)"}:{ok:true}}
  function rangoOk(m,x){if(x+RANGO>HD_FIN+BLQ)return{ok:false,txt:"el rango de 4 horas excede el horario"};var T=turnoDe(x);if(!T||!T.med)return{ok:false,txt:"sin nefrólogo"};
    for(var y=x;y<x+RANGO;y+=BLQ){var b=bloque(m,y);if(!b.ok)return{ok:false,txt:"el rango cruza un bloque "+b.txt+" ("+ap(y)+")"}}return{ok:true,T:T}}

  function llenarPac(){var f=function(id,v){$(id).value=v||""};
    f("ctNom",PAC?PAC.nom:"");f("ctDoc",PAC?"DNI - "+PAC.dni:"");f("ctPar",PAC?PAC.par:"");f("ctGra",PAC?PAC.grado:"");f("ctHc",PAC?PAC.hc:"");f("ctTel",PAC?PAC.tel:"");f("ctDom",PAC?PAC.dom:"")}
  function pintarModo(){
    var ser=$("ctSer").value,puedeHd=ser==="NEFROLOGÍA"&&PAC&&PAC.hd;
    if(!puedeHd)MODO="std";
    $("ctModo").innerHTML=ser!=="NEFROLOGÍA"||!PAC?'':!PAC.hd?'<div class="nota">NEFROLOGÍA · el paciente no pertenece al Programa de Hemodiálisis (sin Historia Clínica Inicial firmada): se otorga <b>una cita por día</b>.</div>':
      '<div class="na-card" style="margin-top:10px"><div class="na-t">TIPO DE PROGRAMACIÓN</div><div class="ops"><label class="ck"><input type="radio" name="ctM" value="std"'+(MODO==="std"?" checked":"")+'> Cita única (consulta externa)</label><label class="ck"><input type="radio" name="ctM" value="hd"'+(MODO==="hd"?" checked":"")+'> Programa de hemodiálisis · citas múltiples</label></div></div>';
    $("ctHd").hidden=MODO!=="hd";
    pintarTodo()}
  function yaProg(){return MODO==="hd"&&PAC&&((PAC.clave==="romero"&&R.prog)||PAC.vigente)}
  function pintarCal(){
    $("calTit").textContent=MES[C.m]+" "+C.y;
    var d0=new Date(C.y,C.m,1),ini=(d0.getDay()+6)%7,d=new Date(C.y,C.m,1-ini),h='<tr>'+["LU","MA","MI","JU","VI","SA","DO"].map(function(x,i){return'<th'+(MODO==="hd"&&i<6?' data-col="'+i+'" title="Marcar / quitar todos los '+x+' del mes" style="cursor:pointer"':'')+'>'+x+'</th>'}).join("")+'</tr>';
    var marc=MODO==="hd"?(PAC&&PAC.clave==="romero"&&R.prog?R.prog.fechas.map(function(f){return d2iso(s2d(f))}):H.fechas):(U.fecha?[U.fecha]:[]);
    for(var w=0;w<6;w++){h+='<tr>';for(var k=0;k<7;k++){var iso=d2iso(d),fuera=d.getMonth()!==C.m,dom=MODO==="hd"&&(d.getDay()===0||iso<MIN_HD),on=marc.indexOf(iso)>=0;
      h+='<td class="'+(fuera?"fuera ":"")+(on?"sel ":"")+(dom?"no ":"")+'" data-f="'+iso+'"'+(fuera?'':' tabindex="0"')+'>'+d.getDate()+(on&&MODO==="hd"?'<small>sesión '+(marc.indexOf(iso)+1)+'</small>':'')+'</td>';d.setDate(d.getDate()+1)}h+='</tr>'}
    $("cal").innerHTML=h}
  function pintarTabs(){
    q("#ctTabs [data-ct]").forEach(function(t){t.classList.toggle("on",t.getAttribute("data-ct")===TAB)});
    var h='';
    if(TAB==="his"){var L=[];if(PAC&&PAC.clave==="romero"&&R.prog)citasDe(R.prog).forEach(function(c,i){L.push([c.f,"NEFROLOGÍA · HEMODIÁLISIS","175 - CONSULTORIO HEMODIÁLISIS · "+MAQ[c.m],TURNOS[c.t-1].med,TURNOS[c.t-1].n+" "+c.h,"Nº "+(22+i)+" · "+c.est])});
      if(PAC&&PAC.vigente)L.push(["04-11-2026","NEFROLOGÍA · HEMODIÁLISIS","175 - CONSULTORIO HEMODIÁLISIS · Máquina 04","Dra. M. SALAZAR","Turno 1 06:00","Nº 21 · PROGRAMADA (5 de 13)"]);
      EST.citasStd.forEach(function(x){if(PAC&&x.dni===PAC.dni)L.push([x.f,x.ser,x.con,x.med||"—",x.h,"PROGRAMADA"])});
      h='<div class="tw"><table><tr><th>Fecha</th><th>Servicio</th><th>Consultorio</th><th>Médico</th><th>Hora</th><th>Estado</th></tr>'+(L.map(function(r){return'<tr>'+r.map(function(v){return'<td>'+esc(v)+'</td>'}).join("")+'</tr>'}).join("")||'<tr><td colspan="6" class="vacio">'+(PAC?'Sin citas registradas.':'Busque al paciente.')+'</td></tr>')+'</table></div>'}
    else h='<div class="vacio" style="padding:10px">'+(PAC?'Sin registros.':'Busque al paciente.')+'</div>';
    $("ctTabP").innerHTML=h}
  function pintarPM(){
    if(!PAC){$("pmTit").innerHTML="";$("pm").innerHTML='<div class="nota">Ingrese el N° de documento del paciente y pulse <b>Buscar</b>.</div>';return}
    if(MODO==="hd"){
      if(yaProg()){$("pmTit").innerHTML='<b>Programa de hemodiálisis:</b> citas ya generadas';$("pm").innerHTML='<div class="nota ok">El paciente ya tiene sus sesiones programadas. Revíselas en <b>HISTORIAL DE CITA</b>; cada cita ya está en el Módulo de Procedimientos Programados.</div>';return}
      var f0=H.fechas[0];
      $("pmTit").innerHTML='<b>Programación Médica:</b> HEMODIÁLISIS · '+(hSeq()==="LMV"?"L-M-V":hSeq()==="MJS"?"Ma-J-S":"personalizada")+' · '+H.fechas.length+' fecha(s)'+(f0?' desde '+f2s(iso2d(f0)).replace(/-/g,"/"):'');
      if(!H.fechas.length){$("pm").innerHTML='<div class="nota">Marque en el calendario los días de hemodiálisis para ver las máquinas libres.</div>';return}
      var BL=[];for(var x=HD_INI;x<=HD_FIN;x+=BLQ)BL.push(x);
      $("pm").innerHTML='<div class="nota" style="margin-bottom:10px">Haga clic en la <b>hora de inicio</b>: se selecciona un <b>rango de 4 horas</b> (8 bloques de 30 minutos) en la máquina. El médico, la enfermera y el turno se completan según el horario elegido.</div>'+MAQ.map(function(m,mi){
        var sel=H.sel&&H.sel.m===mi,T=sel?TURNOS[H.sel.t-1]:null;
        return'<div class="pm-card'+(sel?' pm-on':'')+'"><div class="pm-h"><b>Médico:</b> '+(T?esc(T.med):'—')+'<br><b>Consultorio:</b> 175 - HEMODIÁLISIS<br><b>Máquina:</b> '+esc(m)+'<br><b>Enfermera:</b> '+(T?esc(T.enf):'—')+'<br><b>Turno:</b> '+(T?T.n+' · '+ap(H.sel.ini)+' - '+ap(H.sel.ini+RANGO):'<span class="prof">seleccione un rango de 4 horas</span>')+'</div><div class="pm-b">'+
          BL.map(function(x){var e=bloque(mi,x),on=sel&&x>=H.sel.ini&&x<H.sel.ini+RANGO;
            return'<button type="button" class="hslot'+(on?' on':'')+'" data-m="'+mi+'" data-x="'+x+'"'+(e.ok&&!H.guard?'':' disabled')+' title="'+esc(e.ok?'Inicio de la sesión: '+ap(x)+' a '+ap(x+RANGO):e.txt)+'">'+ap(x)+' - '+ap(x+BLQ)+'</button>'}).join("")+'</div></div>'}).join("");
      return}
    /* Cita única: horarios de 15 minutos por consultorio */
    if(!U.fecha){$("pmTit").innerHTML="";$("pm").innerHTML='<div class="nota">Seleccione el día en el calendario para ver la programación médica.</div>';return}
    $("pmTit").innerHTML='<b>Programación Médica:</b> '+f2s(iso2d(U.fecha)).replace(/-/g,"/");
    $("pm").innerHTML=CONS.map(function(c,ci){return'<div class="pm-card"><div class="pm-h"><b>Medico:</b> '+esc(c.med)+'<br><b>Consultorio:</b> '+esc(c.con)+'</div><div class="pm-b">'+SLOTS(c.h[0],c.h[1]).map(function(s,i){var oc=ocupStd(U.fecha,ci,i),on=U.slot&&U.slot.c===ci&&U.slot.i===i;
      return'<button type="button" class="hslot'+(on?' on':'')+'" data-c="'+ci+'" data-i="'+i+'"'+(oc?' disabled title="Ocupado"':'')+'>'+s+'</button>'}).join("")+'</div></div>'}).join("")}
  function pintarPrev(){var hd=MODO==="hd"&&PAC;$("ctCrear").textContent=hd?"GUARDAR":"CREAR";$("ctCrear").disabled=!!(hd&&yaProg())}
  function pintarRes(){if(!$("hdRes")||MODO!=="hd"||!PAC)return;var T=H.sel?TURNOS[H.sel.t-1]:null,f=H.fechas;
    var kv=function(l,v){return'<div><span>'+l+'</span><b>'+v+'</b></div>'};
    $("hdRes").innerHTML=yaProg()?'':'<div class="hd-kv">'+kv("Procedimiento","90937 · HEMODIÁLISIS")+kv("Serología",esc(PAC.ser||"NEGATIVA"))+kv("Acceso vascular",esc(PAC.acc||"—"))+kv("Secuencia de la terapia",hTxtSeq())+kv("Vigencia",f.length?f2s(iso2d(f[0])).replace(/-/g,"/")+" al "+f2s(iso2d(f[f.length-1])).replace(/-/g,"/"):"—")+kv("N° de sesiones",f.length||"0")+kv("Turno / horario",T?T.n+" · "+ap(H.sel.ini)+" - "+ap(H.sel.ini+RANGO):"—")+kv("Máquina",H.sel?MAQ[H.sel.m]:"—")+'</div>'+
      '<div class="mini" style="margin-top:6px">'+(H.guard?'<b style="color:#8A6D3B">Citas guardadas · revise la ficha CITA y pulse FINALIZAR.</b>':'Marque los días de hemodiálisis en el calendario (clic en <b>LU</b>, <b>MI</b>, <b>VI</b>… marca todo el mes); la secuencia, la vigencia y el N° de sesiones se generan solos. Luego elija la máquina en la Programación Médica.')+'</div>'}
  function pintarTodo(){pintarCal();pintarTabs();pintarPM();pintarPrev();pintarRes()}
  function buscar(dni){var f=PACS[dni];PAC=f?f():null;U={fecha:null,slot:null};H={fechas:[],sel:null,hora:"",guard:false};
    if(!PAC&&dni)aviso("No se encontró un asegurado con ese documento (demostración: 40871236, 40718235, 41556677).",true);
    if(PAC&&PAC.clave==="card")$("ctSer").value="CARDIOLOGÍA";else if(PAC)$("ctSer").value="NEFROLOGÍA";
    MODO=PAC&&PAC.hd&&$("ctSer").value==="NEFROLOGÍA"?"hd":"std";
    if(PAC&&PAC.clave==="romero"&&R.prog){var d=s2d(R.prog.fechas[0]);C={y:d.getFullYear(),m:d.getMonth()}}
    llenarPac();pintarModo()}

  /* --- eventos --- */
  $("ctBuscar").onclick=function(){buscar($("ctDni").value.trim())};
  $("ctDni").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();buscar(this.value.trim())}});
  $("ctSer").onchange=function(){MODO=$("ctSer").value==="NEFROLOGÍA"&&PAC&&PAC.hd?"hd":"std";pintarModo()};
  $("calPrev").onclick=function(){C.m--;if(C.m<0){C.m=11;C.y--}pintarCal()};
  $("calNext").onclick=function(){C.m++;if(C.m>11){C.m=0;C.y++}pintarCal()};
  document.addEventListener("change",function(e){if(e.target.name==="ctM"){MODO=e.target.value;H={fechas:[],sel:null,hora:"",guard:false};pintarModo()}});
  document.addEventListener("click",function(e){
    var t=e.target.closest("#ctTabs [data-ct]");if(t){TAB=t.getAttribute("data-ct");pintarTabs();return}
    var hc=e.target.closest("#cal th[data-col]");
    if(hc&&MODO==="hd"&&!yaProg()){if(H.guard){aviso("La programación está guardada: pulse FINALIZAR (o CANCELAR para cambiarla).",true);return}
      var col=+hc.getAttribute("data-col"),dias=[];q("#cal tr").forEach(function(tr){var td=tr.children[col];if(td&&td.tagName==="TD"&&!td.classList.contains("fuera")&&!td.classList.contains("no"))dias.push(td.getAttribute("data-f"))});
      var todos=dias.every(function(f){return H.fechas.indexOf(f)>=0});dias.forEach(function(f){var k=H.fechas.indexOf(f);if(todos&&k>=0)H.fechas.splice(k,1);if(!todos&&k<0)H.fechas.push(f)});H.fechas.sort();
      if(H.sel&&!rangoOk(H.sel.m,H.sel.ini).ok){H.sel=null;aviso("El horario elegido no está libre en todas las fechas: elija otro.",true)}pintarTodo();return}
    var c=e.target.closest("#cal td[data-f]");
    if(c&&!c.classList.contains("fuera")){var iso=c.getAttribute("data-f");
      if(MODO==="hd"){if(yaProg()){aviso("Las citas del programa ya fueron generadas.",true);return}
        if(H.guard){aviso("La programación está guardada: pulse FINALIZAR (o CANCELAR para cambiarla).",true);return}
        if(!seqDeIso(iso)){aviso("No hay atención de hemodiálisis los domingos.",true);return}
        if(iso<MIN_HD){aviso("No se programan sesiones antes de la fecha de la orden (22/10/2026).",true);return}
        var k=H.fechas.indexOf(iso);if(k>=0)H.fechas.splice(k,1);else{H.fechas.push(iso);H.fechas.sort()}
        if(H.sel&&!rangoOk(H.sel.m,H.sel.ini).ok){H.sel=null;aviso("El horario elegido no está libre en todas las fechas: elija otro.",true)}
        pintarTodo()}
      else{U.fecha=iso;U.slot=null;pintarTodo()}return}
    var b=e.target.closest("#pm .hslot");
    if(b&&!b.disabled){if(MODO==="hd"){var bm=+b.getAttribute("data-m"),bx=+b.getAttribute("data-x"),rk=rangoOk(bm,bx);
        if(!rk.ok){aviso("No se puede iniciar a las "+ap(bx)+": "+rk.txt+".",true);return}
        H.sel={m:bm,ini:bx,t:rk.T.id};H.hora=hm(bx);aviso("Horario: "+ap(bx)+" - "+ap(bx+RANGO)+" · "+MAQ[bm]+" · "+rk.T.n+" en las "+H.fechas.length+" fechas.")}
      else U.slot={c:+b.getAttribute("data-c"),i:+b.getAttribute("data-i")};pintarPM();pintarPrev();pintarRes();return}
  });
  /* Confirmación con el formato de SIGESAPOL: «¿Deseas guardar la cita?» · Cancelar / Aceptar */
  function sg(msg,ok){var v=$("veloSg");$("sgMsg").innerHTML=msg;v.classList.add("ver");$("sgSi").focus();
    var fin=function(si){v.classList.remove("ver");$("sgSi").onclick=$("sgNo").onclick=null;document.removeEventListener("keydown",k,true);if(si)ok()};
    var k=function(e){if(e.key==="Escape"){e.stopImmediatePropagation();fin(false)}};document.addEventListener("keydown",k,true);
    $("sgSi").onclick=function(){fin(true)};$("sgNo").onclick=function(){fin(false)}}
  var h12c=function(hm){var a=hm.split(":"),h=+a[0];return("0"+(h%12||12)).slice(-2)+":"+a[1]+" "+(h<12?"AM":"PM")};
  /* Ficha CITA (formato SIGESAPOL) con todas las citas seleccionadas */
  function fichaCita(o){
    var cp=function(l,v,c){return'<div class="'+(c||"cc")+'"><label>'+l+'</label><span>'+(v||"&nbsp;")+'</span></div>'};
    var tabla=o.lista?'<div class="cc-sub">CITAS PROGRAMADAS ('+o.lista.length+')</div><div class="tw"><table><tr><th>N°</th><th>Fecha de cita</th><th>Día</th><th>Hora de cita</th><th>Turno</th><th>Consultorio / máquina</th><th>Médico</th><th>Estado</th></tr>'+o.lista.map(function(c,i){return'<tr><td><b>'+(i+1)+'</b></td><td>'+c.f+'</td><td>'+c.d+'</td><td>'+c.h+'</td><td>'+c.t+'</td><td>'+esc(c.con)+'</td><td>'+esc(c.med)+'</td><td><span class="st '+(o.fin?'s4">PROGRAMADA':'s2">GUARDADA')+'</span></td></tr>'}).join("")+'</table></div>':'';
    $("ctCita").innerHTML='<div class="cita-card"><div class="bar">CITA'+(o.lista?' · PROGRAMA DE HEMODIÁLISIS':'')+'</div><div class="box">'+
      '<div class="cc-g">'+cp("FECHA DE CITA",o.fecha)+cp("HORA DE CITA",o.hora)+cp("SERVICIO",o.ser,"cc cc2")+
      cp("CONSULTORIO",esc(o.con))+cp("MEDICO",esc(o.med),"cc cc2")+cp("TIPO CITA",o.tipo)+
      (o.lista?cp("SECUENCIA",o.seq)+cp("N° DE SESIONES",o.lista.length)+cp("ENFERMERA",esc(o.enf),"cc cc2"):'')+
      cp("DNI",PAC.dni)+cp("NOMBRE Y APELLIDOS",esc(o.nom),"cc cc3")+cp("PARENTESCO",PAC.par)+cp("GRADO",PAC.grado)+cp("CORREO",esc($("ctMail").value),"cc cc2")+cp("ESTABLECIMIENTO","HOSPITAL NACIONAL PNP LUIS N. SAENZ","cc cc4")+'</div>'+tabla+
      (o.fin?'<div class="nota ok" style="margin-top:10px">Citas creadas: cada sesión llegó como atención al MÓDULO DE PROCEDIMIENTOS PROGRAMADOS (Nº 22 al Nº '+(21+o.lista.length)+'). Abriendo la bandeja…</div>':'')+
      '<div class="acciones cc-acc"><button type="button" class="btn g" id="ccNueva"'+(o.fin?' disabled':'')+'>Nueva Cita</button><span style="flex:1"></span><button type="button" class="btn r" id="ccImp">Imprimir 🗎</button>'+(o.lista&&!o.fin?'<button type="button" class="btn g" id="ccFin">FINALIZAR</button>':'')+'</div></div></div>';
    $("ctForm").hidden=true;$("ctCita").hidden=false;window.scrollTo(0,0)}
  function nomInv(n){var x=String(n).split(",");return x.length>1?(x[1].trim()+" "+x[0].trim()):n}
  function datosHd(fin){var T=TURNOS[H.sel.t-1],f=H.fechas;
    var rg=ap(H.sel.ini)+" - "+ap(H.sel.ini+RANGO);
    return{fin:fin,fecha:f2s(iso2d(f[0])).replace(/-/g,"/")+" al "+f2s(iso2d(f[f.length-1])).replace(/-/g,"/"),hora:rg,ser:"NEFROLOGÍA · HEMODIÁLISIS (90937)",con:"175 - HEMODIÁLISIS · "+MAQ[H.sel.m],med:T.med,enf:T.enf,tipo:$("ctTipo").value,nom:nomInv(PAC.nom),seq:hTxtSeq(),
      lista:f.map(function(x){var d=iso2d(x);return{f:f2s(d).replace(/-/g,"/"),d:DSEM[d.getDay()],h:rg,t:T.n,con:"175 - HEMODIÁLISIS · "+MAQ[H.sel.m],med:T.med}})}}
  $("ctCrear").onclick=function(){
    if(!PAC){aviso("Busque al paciente.",true);$("ctDni").focus();return}
    if(MODO==="hd"){
      if(yaProg()){aviso("Las citas del programa ya fueron generadas.",true);return}
      if(!esTec()&&rol()!=="adm"){aviso("Las citas múltiples de hemodiálisis las registra el Técnico de citas: cambie «Ver como».",true);return}
      if(!H.fechas.length){aviso("Marque en el calendario los días de hemodiálisis.",true);return}
      if(!H.sel){aviso("Seleccione en la Programación Médica la máquina y el rango de 4 horas.",true);return}
      sg("¿Deseas guardar la"+(H.fechas.length>1?"s "+H.fechas.length+" citas":" cita")+"?",function(){H.guard=true;pintarTodo();fichaCita(datosHd(false));aviso("Citas guardadas. Revise y pulse FINALIZAR.")});
      return}
    if(!U.fecha){aviso("Seleccione el día en el calendario.",true);return}
    if(!U.slot){aviso("Seleccione un horario disponible del consultorio.",true);return}
    var c=CONS[U.slot.c],s=SLOTS(c.h[0],c.h[1])[U.slot.i];
    sg("¿Deseas guardar la cita?",function(){
      EST.citasStd.push({dni:PAC.dni,f:f2s(iso2d(U.fecha)),c:U.slot.c,i:U.slot.i,ser:$("ctSer").value,con:c.con,med:c.med,h:s});guardar();
      fichaCita({fecha:f2s(iso2d(U.fecha)).replace(/-/g,"/"),hora:s.split(" - ")[0],ser:$("ctSer").value,con:c.con,med:c.med,tipo:$("ctTipo").value,nom:nomInv(PAC.nom)});
      U.slot=null;TAB="his";pintarTodo();aviso("Cita creada.")})};
  document.addEventListener("click",function(e){var id=e.target.id;
    if(id==="ccImp"){window.print();return}
    if(id==="ccNueva"){$("ctCita").hidden=true;$("ctForm").hidden=false;if(MODO==="hd"){H.guard=false;pintarTodo();aviso("Puede cambiar los días o la máquina y volver a GUARDAR.")}else{U={fecha:null,slot:null};pintarTodo()}window.scrollTo(0,0);return}
    if(id==="ccFin"){sg("¿Deseas finalizar el registro? Se crearán las "+H.fechas.length+" citas del programa de hemodiálisis.",function(){
      var citas=H.fechas.map(function(f){return{f:f2s(iso2d(f)),t:H.sel.t,m:H.sel.m,h:H.hora,est:"PROGRAMADA",hist:[]}}),sq=hSeq(),dat=datosHd(true);
      if(PAC.clave==="romero"){R.prog={seq:sq==="MJS"?"MJS":"LMV",turno:H.sel.t,maq:H.sel.m,hora:H.hora,desde:H.fechas[0],citas:citas,fechas:citas.map(function(c){return c.f})};
        guardar();menu();fichaCita(dat);aviso(citas.length+" citas creadas: cada una llegó al Módulo de Procedimientos Programados.");setTimeout(function(){location.href="bandeja.html"},2200)}
      else aviso("Demostración: el paciente ya tiene programa vigente.",true)})}});
  /* Llega desde la atención Nº 13 (HC inicial firmada) con el paciente y NEFROLOGÍA ya cargados */
  if(ORI){$("ctOrigen").innerHTML='<div class="nota ok"><b>Paciente con HC inicial firmada</b> (atención Nº '+esc(ORI)+'). Marque los días en el calendario, elija la máquina y el horario y pulse <b>GUARDAR</b>; en la ficha CITA pulse <b>FINALIZAR</b>.</div>';$("ctCancel").href="bandeja.html"}
  var dIni=param("p")==="romero"?"40871236":param("d");
  if(dIni){$("ctDni").value=dIni;buscar(dIni)}else pintarModo();
}

menu();
})();
