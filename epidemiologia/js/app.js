/* ---------- navegación ---------- */
const PANT=[["citas","CE · Lista de citas"],["esc-a","CE · Consulta externa"],["alta","HOSP · Alta de paciente"],["epi-seg","EPI · Monitoreo y seguimiento"],["exportar","EPI · Exportar reportes"]];
/* rutas válidas: las de la franja + todos los escenarios de ESC (cada paciente se abre con Atender en la lista de citas) */
const RUTAS=new Set([...PANT.map(x=>x[0]),...Object.keys(ESC).filter(k=>!ESC[k].alta).map(k=>"esc-"+k),"epi-ca","epi-dm"]);
function render(){
  const h=(location.hash||"#citas").slice(1),p=RUTAS.has(h)?h:"citas";
  if(p!==st.pant){st.reset=true;st.pant=p;st.q={doc:"",nom:"",tipo:"",tcaso:"",status:""};if(p!=="epi-seg")st.sel=null;if(p==="citas")st.cita=null;}
  $("#nav").innerHTML=PANT.map(([k,t])=>`<a href="#${k}" class="${k===p||(k==="esc-a"&&p.startsWith("esc"))?"on":""}">${t}</a>`).join("");
  const ce=p.startsWith("esc")||p==="citas", ho=p==="alta", ep=!ce&&!ho;
  $("#m-ce").className="car"+(ce?" act":"");$("#m-hosp").className="car"+(ho?" act":"");$("#m-epi").className="car"+(ep?" act":"");$("#m-user").textContent=ep?"👤 LIC. EPIDEMIOLOGÍA":"👤 DR. LUIS ARANA";
  const volver=`<a class="volver" href="#citas">← Volver a la lista de citas${st.cita?" · cita Nº "+st.cita:""}</a>`;
  $("#app").innerHTML=p==="citas"?pantCitas():p.startsWith("esc")?volver+pantAtencion(p.slice(4)):ho?pantAlta():p==="epi-seg"?pantSeg():p==="epi-ca"?pantBandeja("ca"):p==="epi-dm"?pantBandeja("dm"):pantExport();
  bind();renderModal();
}
function toast(m){const t=$("#toast");t.textContent=m;t.classList.remove("hide");clearTimeout(t._h);t._h=setTimeout(()=>t.classList.add("hide"),4500)}
function keep(){const y=scrollY;render();scrollTo(0,y)}
function bind(){
  const add=$("#dxAdd"); if(add) add.onclick=()=>{st.dx.push({c:"",t:""});keep()};
  /* lista de citas */
  const cb=$("#cbus"); if(cb){const v=id=>$("#"+id).value.trim();
    const leer=()=>{st.qc={fd:v("cfd"),fh:v("cfh"),rd:v("crd"),rh:v("crh"),upss:v("cupss"),doc:v("cdoc"),nom:v("cnom"),serv:v("cserv"),cons:v("ccons"),estado:v("cest")}};
    cb.onclick=()=>{leer();keep()};
    $("#cexp").onclick=()=>{leer();exportarCitas();keep()};
    ["cdoc","cnom"].forEach(id=>$("#"+id).onkeydown=e=>{if(e.key==="Enter")cb.click()});}
  document.querySelectorAll("#app [data-atender]").forEach(b=>b.onclick=()=>atender(b.dataset.atender));
  document.querySelectorAll("[data-vercita]").forEach(b=>b.onclick=()=>verCita(b.dataset.vercita));
  document.querySelectorAll("[data-siteds]").forEach(b=>b.onclick=()=>toast(b.title));
  document.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{st.dx.splice(+b.dataset.del,1);keep()});
  document.querySelectorAll("[data-tipo]").forEach(s=>s.onchange=()=>{const d=st.dx[+s.dataset.tipo];d.t=s.value;keep()});
  /* switches: los genéricos solo cambian NO/SI; los de ficha epidemiológica despliegan la ficha sin recargar la pantalla */
  document.querySelectorAll("[data-tog]").forEach(b=>b.onclick=()=>{const on=b.classList.toggle("on");b.setAttribute("aria-checked",on)});
  document.querySelectorAll("[data-fsw]").forEach(b=>b.onclick=()=>{const t=b.dataset.fsw,on=!st.fon[t];st.fon[t]=on;b.classList.toggle("on",on);b.setAttribute("aria-checked",on);b.nextElementSibling.hidden=!on});
  document.querySelectorAll("[data-fsave]").forEach(b=>b.onclick=()=>{const t=b.dataset.fsave,f=(FICHAS[ESC[st.esc].pac]||{})[t];st.saved[t]=true;st.fon[t]=false;
    toast(f?(t==="dm"?`Seguimiento registrado en la ficha ${f.num}.`:`Ficha ${f.num} actualizada.`):`Ficha de ${t==="dm"?"diabetes":"cáncer"} registrada.`);keep();const sw=$("#fsw-"+t);if(sw)sw.scrollIntoView({block:"center"})});
  const fin=$("#fin"); if(fin) fin.onclick=()=>{
    if(st.dx.some(d=>!d.c)){alerta("Falta ingresar el diagnóstico en esta fila");return}
    const pend=fichasPendientes();
    if(pend.length){const t=pend[0],nom=t==="dm"?"DIABETES":"CÁNCER";st.fon[t]=true;keep();$("#fsw-"+t).scrollIntoView({block:"start"});
      alerta(`Falta registrar la FICHA EPIDEMIOLÓGICA DE ${nom} del diagnóstico ${dxFicha(t).c}. Se activó el switch: complete la ficha y pulse Guardar ficha.`);return}
    toast(st.pant==="alta"?"Alta del paciente registrada.":"Atención finalizada.")};
  document.querySelectorAll("[data-ok]").forEach(b=>b.onclick=()=>toast(b.dataset.ok));
  document.querySelectorAll("[data-act]").forEach(b=>b.onclick=()=>accion(b.dataset.act,b.dataset.id));
  const qb=$("#qbtn"); if(qb){qb.onclick=()=>{const v=id=>{const e=$("#"+id);return e?e.value.trim():""};st.q={doc:v("qdoc"),nom:v("qnom"),tipo:v("qtipo"),tcaso:v("qtcaso"),status:v("qstatus")};keep()};$("#qclr").onclick=()=>{st.q={doc:"",nom:"",tipo:"",tcaso:"",status:""};keep()}}
  const rs=$("#repSel"); if(rs){rs.onchange=()=>{st.rep=Object.keys(REP).find(k=>REP[k]===rs.value);keep()};$("#destSel").onchange=e=>{st.dest=e.target.value.startsWith("Para el MINSA")?"minsa":"pnp";keep()}}
  bindForm($("#app"));
}
function bindForm(root){
  root.querySelectorAll('select[id^="ev"]').forEach(sel=>{const box=sel.closest(".in").querySelector("[data-cpl]");const ap=()=>{const no=sel.value==="No";box.classList.toggle("off",no);box.querySelectorAll("input").forEach(i=>{i.disabled=no;if(no)i.checked=false})};sel.addEventListener("change",ap);if(!sel.closest(".lk"))ap()});
  root.querySelectorAll('select[id^="stCA"]').forEach(s=>s.onchange=()=>{const m=s.closest(".ficha").querySelector("[data-mort]");const sec=m.closest("details");m.closest(".in").classList.toggle("dis",!s.value.startsWith("7"));const h=sec.querySelector("summary .hint");if(h)h.hidden=s.value.startsWith("7");if(s.value.startsWith("7"))sec.open=true});
  root.querySelectorAll("input[data-rng]").forEach(inp=>{const chk=()=>{const [a,b]=inp.dataset.rng.split("-").map(Number),v=parseFloat(inp.value),f=inp.closest(".f");const bad=inp.value!==""&&(isNaN(v)||v<a||v>b);f.classList.toggle("err",bad);f.querySelector(".msg").textContent=bad?`Fuera del rango permitido (${a} – ${b}).`:"";};inp.addEventListener("input",chk);chk();});
  root.querySelectorAll("input[data-ac]").forEach(acBind);
}
function alerta(msg){const a=$("#alerta");a.innerHTML=`<div class="abox" role="alertdialog"><p>${esc(msg)}</p><div><button class="bok" id="aok">OK</button></div></div>`;a.hidden=false;$("#aok").focus();$("#aok").onclick=()=>{a.hidden=true}}
function acBind(inp){
  const src={cie:[...CAT.di,...CAT.ca,...OTROS],top:CAT.top,mor:CAT.mor}[inp.dataset.ac];
  const box=document.createElement("div");box.className="acl hide";inp.parentElement.appendChild(box);
  const norm=s=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
  inp.addEventListener("input",()=>{const q=norm(inp.value.trim());if(q.length<2){box.classList.add("hide");return}
    const r=src.filter(([c,d])=>norm(c).startsWith(q)||norm(d).includes(q)).slice(0,12);
    box.innerHTML=r.map(([c,d])=>`<div data-c="${esc(c)}">${esc(c)} · ${esc(d.length>110?d.slice(0,110)+"…":d)}</div>`).join("")||"<div>Sin coincidencias</div>";box.classList.remove("hide")});
  box.addEventListener("mousedown",ev=>{const d=ev.target.closest("[data-c]");if(!d)return;ev.preventDefault();const c=d.dataset.c,row=src.find(x=>x[0]===c);
    if(inp.dataset.row!==undefined){const r=st.dx[+inp.dataset.row];r.c=c;box.classList.add("hide");keep();return}
    inp.value=c+" · "+row[1].split("(")[0].trim();box.classList.add("hide")});
  inp.addEventListener("blur",()=>setTimeout(()=>box.classList.add("hide"),150));
}
addEventListener("hashchange",render);
render();
