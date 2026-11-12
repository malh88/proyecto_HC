/* Utilidades y generadores de campos de formulario (estilo SIGESAPOL) */
const HOY="06/11/2026";
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let st={pant:"",esc:"",dx:[],reset:true,open:{},rep:"ca",dest:"minsa",q:{doc:"",nom:"",tipo:"",tcaso:"",status:""},sel:null,del:{}};

/* ---------- helpers ---------- */
let uid=0;
function F(label,ctl,o={}){return `<div class="f ${o.w||""} ${o.hide?"hide":""}" ${o.id?`id="${o.id}"`:""}><label>${esc(label)}${o.req?'<span class="req">*</span>':""}</label>${ctl}${o.hint?`<span class="hint">${o.hint}</span>`:""}<span class="msg"></span></div>`}
function I(v="",o={}){const id=o.id||("i"+(++uid));return `<div class="inp ${o.ac?"ac":""}"><input id="${id}" value="${esc(v)}" ${o.ro?"readonly":""} placeholder="${esc(o.ph||"")}" ${o.rng?`data-rng="${o.rng}"`:""} ${o.ac?`data-ac="${o.ac}" data-tgt="${o.tgt||""}" autocomplete="off"`:""} ${o.data||""}>${o.u?`<span class="u">${o.u}</span>`:""}</div>`}
function S(opts,v="",o={}){const id=o.id||("s"+(++uid));return `<div class="inp"><select id="${id}" ${o.ro?"disabled":""}>${o.ph===false?"":'<option value="">Seleccione…</option>'}${opts.map(x=>`<option ${x===v?"selected":""}>${esc(x)}</option>`).join("")}</select></div>`}
function D(v="",ro){return I(v,{ph:"dd/mm/aaaa",u:"📅",ro})}
function R(name,opts,v){return `<div class="modo" style="margin:0">${opts.map(o=>`<label><input type="radio" name="${name}${uid}" id="r${++uid}" ${o===v?"checked":""}> ${o}</label>`).join("")}</div>`}
function CH(items,checked=[]){return `<div class="checks">${items.map(x=>{const [n,subs]=Array.isArray(x)?x:[x,null];const on=checked.some(c=>c.split("|")[0]===n);return `<div><label><input type="checkbox" id="c${++uid}" ${on?"checked":""}> ${esc(n)}</label>${subs?`<div class="sub2">${subs.map(s=>`<label><input type="checkbox" id="c${++uid}" ${checked.includes(n+"|"+s)?"checked":""}> ${esc(s)}</label>`).join("")}</div>`:""}</div>`}).join("")}</div>`}
function SEC(t,body,open=true,tag=""){return `<details class="sec" ${open?"open":""}><summary>${t}${tag}</summary><div class="in">${body}</div></details>`}
const JAL=' <span class="src" style="margin-left:6px">autollenado SIGESAPOL</span>';
function G(...x){return `<div class="grid">${x.join("")}</div>`}
function vig(c){return DI.has(c)?"dm":CA.has(c)?"ca":null}
function tipoDM(c){return {E10:"1. Tipo 1",E11:"2. Tipo 2",O24:"3. Gestacional"}[c.slice(0,3)]||""}
function seguroDM(p){return p.cond==="T"?C.seguroDM[6]:C.seguroDM[7]}
function condCA(p){return p.cond==="T"?C.condCA[2]:C.condCA[3]}
