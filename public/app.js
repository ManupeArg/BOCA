(function () {
"use strict";

const PAISES=[["AR","Argentina"],["UY","Uruguay"],["BR","Brasil"],["PY","Paraguay"],["CL","Chile"],["BO","Bolivia"],["PE","Perú"],["EC","Ecuador"],["CO","Colombia"],["VE","Venezuela"],["MX","México"],["US","Estados Unidos"],["ES","España"],["IT","Italia"],["PT","Portugal"],["FR","Francia"],["DE","Alemania"],["GB","Inglaterra / Reino Unido"],["NL","Países Bajos"],["JP","Japón"],["SA","Arabia Saudita"],["AE","Emiratos Árabes"],["QA","Catar"],["IL","Israel"],["AU","Australia"],["CR","Costa Rica"]];
const TORNEOS=["Liga Profesional","Copa de la Liga","Copa Libertadores","Copa Sudamericana","Copa Argentina","Supercopa Argentina","Trofeo de Campeones","Mundial de Clubes","Amistoso","Torneo de verano"];
const SECTORES=["Platea baja","Platea media","Platea alta","Popular norte","Popular sur","Palco","Platea visitante","Popular visitante"];

const S={partidos:[],canchas:[],goleadores:[],email:"",loaded:false,
  tab:"resumen",addMode:"boca",editPartido:null,editCancha:null,filtroAnio:"todos",draftCrest:undefined,dirty:false,loginModo:"entrar"};

const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const flag=c=>c&&c.length===2?String.fromCodePoint(...[...c.toUpperCase()].map(x=>0x1F1E6+x.charCodeAt(0)-65)):"";
const pais=c=>(PAISES.find(p=>p[0]===c)||[c,c||""])[1];
const fmtFecha=f=>{if(!f)return"";const[y,m,d]=String(f).slice(0,10).split("-");return `${d}/${m}/${y}`};
const key=n=>String(n||"").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\s+/g," ");
const store=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const recall=k=>{try{return localStorage.getItem(k)}catch(e){return null}};

function toast(msg){const t=document.createElement("div");t.className="toast";t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2600)}

/* ---------- API ---------- */
async function api(method,path,body){
  const r=await fetch(path,{method,headers:body?{"Content-Type":"application/json"}:{},body:body?JSON.stringify(body):undefined,credentials:"same-origin"});
  let data={};try{data=await r.json()}catch(e){}
  if(r.status===401&&path!=="/api/auth"){mostrarLogin();throw new Error("Tu sesión se cerró. Entrá de nuevo.")}
  if(!r.ok)throw new Error(data.error||"No se pudo conectar. Probá de nuevo.");
  return data;
}
async function cargar(){
  const d=await api("GET","/api/data");
  S.partidos=d.partidos;S.canchas=d.canchas;S.goleadores=d.goleadores;S.loaded=true;
  render("data");
}
async function mutar(fn,ok){
  try{await fn();await cargar();if(ok)toast(ok);return true}
  catch(e){toast(e.message);return false}
}

/* ---------- datos derivados ---------- */
const cancha=id=>S.canchas.find(c=>c.id===id);
const esBombonera=p=>{const c=cancha(p.canchaId);return c?!!c.bombonera:/bombonera|alberto j\.? armando/i.test(p.canchaNombre||"")};
const resultado=p=>p.gf>p.gc?"G":p.gf<p.gc?"P":"E";
function stats(list){const s={pj:list.length,g:0,e:0,p:0,gf:0,gc:0};list.forEach(m=>{s.gf+=+m.gf||0;s.gc+=+m.gc||0;const r=resultado(m);s[r==="G"?"g":r==="E"?"e":"p"]++});return s}
const ordenados=()=>[...S.partidos].sort((a,b)=>(b.fecha||"").localeCompare(a.fecha||"")||(b.creado||0)-(a.creado||0));
function tablaGoleadores(){
  const m=new Map();
  const add=(nombre,g,src)=>{const k=key(nombre);if(!k||!g)return;const e=m.get(k)||{nombre:String(nombre).trim(),goles:0,partidos:0,manual:0,manualId:null};e.goles+=g;if(src==="p")e.partidos++;else{e.manual+=g;e.manualId=src}m.set(k,e)};
  S.partidos.forEach(p=>(p.goleadores||[]).forEach(g=>add(g.nombre,+g.goles||0,"p")));
  S.goleadores.forEach(g=>add(g.nombre,+g.goles||0,g.id));
  return [...m.values()].sort((a,b)=>b.goles-a.goles||a.nombre.localeCompare(b.nombre));
}

/* ---------- imágenes ---------- */
async function achicar(file,max){
  const url=URL.createObjectURL(file);
  try{
    const img=await new Promise((r,j)=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>j(new Error("No pude leer esa imagen. Probá con PNG o JPG."));i.src=url});
    const w=img.naturalWidth||max,h=img.naturalHeight||max;
    const k=Math.min(1,max/Math.max(w,h));const c=document.createElement("canvas");
    c.width=Math.max(1,Math.round(w*k));c.height=Math.max(1,Math.round(h*k));c.getContext("2d").drawImage(img,0,0,c.width,c.height);
    return c.toDataURL("image/png");
  }finally{URL.revokeObjectURL(url)}
}

/* ---------- vistas ---------- */
const ICON_STADIUM=`<svg viewBox="0 0 64 64"><use href="#i-stadium"/></svg>`;
window.__crestFail=el=>{const p=el.parentNode;if(p)p.innerHTML=ICON_STADIUM};
function crestHTML(c){
  if(c&&c.escudo)return `<img src="${esc(c.escudo)}" alt="" onerror="window.__crestFail(this)">`;
  if(!c||c.tipo==="neutral"||!c.equipo)return ICON_STADIUM;
  return `<span class="ini">${esc((c.equipo.trim()[0]||"?").toUpperCase())}</span>`;
}
function emptyBox(txt,btn,mode){return `<div class="empty"><svg><use href="#i-stadium"/></svg><div>${txt}</div>${btn?`<button class="btn primary" data-go-add="${mode}">${btn}</button>`:""}</div>`}
function bar(s){const t=s.pj||1;return `<div class="bar" aria-hidden="true"><i class="w" style="width:${s.g/t*100}%"></i><i class="d" style="width:${s.e/t*100}%"></i><i class="l" style="width:${s.p/t*100}%"></i></div>`}

function vResumen(){
  const all=stats(S.partidos);
  const sb=stats(S.partidos.filter(esBombonera)), so=stats(S.partidos.filter(p=>!esBombonera(p)));
  const pct=all.pj?Math.round((all.g*3+all.e)/(all.pj*3)*100):0;
  const ult=ordenados().slice(0,5);
  const panel=(titulo,sub,s,icon)=>`<div class="panel">
    <div class="panel-h"><svg class="ico"><use href="#${icon}"/></svg><div><h3>${titulo}</h3><p>${sub}</p></div></div>
    <div class="statrow num"><div><b>${s.pj}</b><span>PJ</span></div><div class="w"><b>${s.g}</b><span>G</span></div><div class="d"><b>${s.e}</b><span>E</span></div><div class="l"><b>${s.p}</b><span>P</span></div><div><b>${s.gf}</b><span>GF</span></div><div><b>${s.gc}</b><span>GC</span></div></div>
    ${bar(s)}</div>`;
  const dif=all.gf-all.gc;
  return `
  <div class="hero">
    <div class="hero-top"><div class="big num">${all.pj}<small>partidos en la cancha</small></div>
      <div class="pct"><b class="num">${pct}%</b><span>efectividad</span></div></div>
    <div class="gde num"><div><b>${all.g}</b><span>Ganados</span></div><div><b>${all.e}</b><span>Empatados</span></div><div><b>${all.p}</b><span>Perdidos</span></div></div>
    <div class="goals num"><div><b>${all.gf}</b><span>Goles a favor</span></div><div><b>${all.gc}</b><span>En contra</span></div><div><b>${dif>0?"+":""}${dif}</b><span>Diferencia</span></div></div>
    ${bar(all)}
  </div>
  <div class="split">
    ${panel("La Bombonera",`${sb.pj} ${sb.pj===1?"partido":"partidos"} en casa`,sb,"i-home")}
    ${panel("Otra cancha",`${so.pj} ${so.pj===1?"partido":"partidos"} fuera de la Bombonera`,so,"i-pin")}
  </div>
  ${ult.length?`<div class="panel"><div class="label">Últimos partidos que fui</div><div class="last5">${ult.map(p=>`<span class="res ${resultado(p)}" title="${esc(fmtFecha(p.fecha)+" vs "+p.rival)}">${resultado(p)}</span>`).join("")}<span class="hint-t">&nbsp;del más reciente al más viejo</span></div></div>`
   :emptyBox(S.loaded?"Todavía no cargaste partidos. Empezá por el último que fuiste a ver.":"Cargando tus partidos…",S.loaded?"Agregar partido":"","boca")}`;
}

function vBoca(){
  const anios=[...new Set(S.partidos.map(p=>(p.fecha||"").slice(0,4)).filter(Boolean))].sort().reverse();
  let list=ordenados(); if(S.filtroAnio!=="todos")list=list.filter(p=>(p.fecha||"").startsWith(S.filtroAnio));
  const s=stats(list);
  const head=`<div class="toolbar"><h2 class="sec" style="flex:1">Partidos de Boca</h2>
    ${anios.length>1?`<select id="fAnio" aria-label="Filtrar por año"><option value="todos">Todos los años</option>${anios.map(a=>`<option ${a===S.filtroAnio?"selected":""}>${a}</option>`).join("")}</select>`:""}</div>
    ${list.length?`<div class="hint-t num">${s.pj} partidos · ${s.g}G ${s.e}E ${s.p}P · ${s.gf}-${s.gc}</div>`:""}`;
  if(!list.length)return head+emptyBox(S.loaded?"Acá vas a ver cada partido que fuiste a la cancha, del último al primero.":"Cargando…",S.loaded?"Agregar partido":"","boca");
  return head+`<div class="list">${list.map(p=>{
    const c=cancha(p.canchaId), r=resultado(p);
    const gl=(p.goleadores||[]).filter(g=>g.nombre).map(g=>esc(g.nombre)+(g.goles>1?` (${g.goles})`:"")).join(", ");
    return `<article class="match">
      <div class="match-top"><span class="date num">${fmtFecha(p.fecha)}</span>${p.torneo?`<span class="chip">${esc(p.torneo)}</span>`:""}</div>
      <div class="score"><span class="t">Boca</span><span class="n num">${p.gf} - ${p.gc}</span><span class="t r">${esc(p.rival)}</span><span class="res ${r}">${r}</span></div>
      <div class="meta">
        ${gl?`<div>⚽ <strong>${gl}</strong></div>`:""}
        <div>🏟️ <strong>${esc(c?c.nombre:p.canchaNombre||"Cancha sin cargar")}</strong>${p.sector?` · ${esc(p.sector)}`:""}</div>
      </div>
      <div class="actions"><button class="btn small" data-edit-p="${p.id}">Editar</button><button class="btn small danger" data-del-p="${p.id}">Borrar</button></div>
    </article>`}).join("")}</div>`;
}

function vCanchas(){
  const head=`<h2 class="sec">Canchas que conocí</h2>`;
  if(!S.canchas.length)return head+emptyBox(S.loaded?"Sumá los estadios donde estuviste. Si no es de un club, como el Estadio Ciudad de La Plata, se muestra el ícono de estadio.":"Cargando…",S.loaded?"Agregar cancha":"","cancha");
  const paises=new Set(S.canchas.map(c=>c.pais).filter(Boolean));
  const list=[...S.canchas].sort((a,b)=>(b.bombonera?1:0)-(a.bombonera?1:0)||a.nombre.localeCompare(b.nombre));
  return head+`<div class="hint-t num">${S.canchas.length} ${S.canchas.length===1?"cancha":"canchas"} en ${paises.size} ${paises.size===1?"país":"países"} ${[...paises].map(flag).join(" ")}</div>
  <div class="grid">${list.map(c=>{
    const n=S.partidos.filter(p=>p.canchaId===c.id).length;
    return `<div class="stadium">
      <div class="crest">${crestHTML(c)}</div>
      <h4>${esc(c.nombre)}</h4>
      <div class="sub">${c.tipo==="neutral"||!c.equipo?"Estadio neutral":esc(c.equipo)}${c.ciudad?` · ${esc(c.ciudad)}`:""}</div>
      <div class="flag" title="${esc(pais(c.pais))}">${flag(c.pais)}</div>
      <div class="seen num">${n?`${n} ${n===1?"partido":"partidos"} de Boca`:"Sin partidos de Boca"}</div>
      <div class="actions"><button class="btn small" data-edit-c="${c.id}">Editar</button><button class="btn small danger" data-del-c="${c.id}">Borrar</button></div>
    </div>`}).join("")}</div>`;
}

function vGoleadores(){
  const t=tablaGoleadores(); const head=`<h2 class="sec">Goleadores que vi</h2>`;
  if(!t.length)return head+emptyBox(S.loaded?"Los goles que cargues en cada partido se suman solos acá. También podés agregar un jugador a mano.":"Cargando…",S.loaded?"Agregar goleador":"","goleador");
  const max=t[0].goles||1, total=t.reduce((a,b)=>a+b.goles,0);
  return head+`<div class="hint-t num">${total} goles de ${t.length} jugadores</div><div class="scorers">${t.map((g,i)=>`
    <div class="scorer"><span class="pos num">${i+1}</span>
      <div class="who"><b>${esc(g.nombre)}</b><i class="mini" style="width:${Math.max(6,g.goles/max*100)}%"></i>
        <small>${g.partidos?`en ${g.partidos} ${g.partidos===1?"partido":"partidos"}`:""}${g.manual?`${g.partidos?" · ":""}${g.manual} cargados a mano <button class="btn small danger" style="padding:2px 8px;margin-left:6px" data-del-g="${g.manualId}">Quitar</button>`:""}</small></div>
      <span class="g num">${g.goles}</span></div>`).join("")}</div>`;
}

function vAgregar(){
  const m=S.addMode;
  const seg=`<div class="seg" role="group" aria-label="Qué querés agregar">${[["boca","BOCA"],["cancha","CANCHA"],["goleador","GOLEADOR"]].map(([k,l])=>`<button type="button" data-mode="${k}" aria-pressed="${m===k}">${l}</button>`).join("")}</div>`;
  return seg+(m==="boca"?fPartido():m==="cancha"?fCancha():fGoleador());
}
function datalists(){
  const nombres=[...new Set(tablaGoleadores().map(g=>g.nombre))];
  const rivales=[...new Set([...S.partidos.map(p=>p.rival),...S.canchas.map(c=>c.equipo)].filter(Boolean))].filter(r=>!/^boca/i.test(r));
  const torneos=[...new Set([...TORNEOS,...S.partidos.map(p=>p.torneo).filter(Boolean)])];
  const sectores=[...new Set([...SECTORES,...S.partidos.map(p=>p.sector).filter(Boolean)])];
  const dl=(id,arr)=>`<datalist id="${id}">${arr.map(n=>`<option value="${esc(n)}">`).join("")}</datalist>`;
  return dl("dl-nombres",nombres)+dl("dl-rivales",rivales)+dl("dl-torneos",torneos)+dl("dl-sectores",sectores);
}
function glRow(g={}){return `<div class="gl-row"><input name="gl-nombre" list="dl-nombres" placeholder="Jugador" value="${esc(g.nombre||"")}" aria-label="Goleador"><input name="gl-goles" type="number" min="1" inputmode="numeric" value="${g.goles||1}" aria-label="Goles"><button type="button" data-gl-del aria-label="Quitar goleador">×</button></div>`}
function fPartido(){
  const p=S.editPartido?S.partidos.find(x=>x.id===S.editPartido):null;
  const hoy=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
  const canchas=[...S.canchas].sort((a,b)=>(b.bombonera?1:0)-(a.bombonera?1:0)||a.nombre.localeCompare(b.nombre));
  const ult=recall("boca.ultCancha");
  const sel=p?p.canchaId:(cancha(ult)?ult:(canchas.find(c=>c.bombonera)||{}).id);
  return `<form class="f" id="fPartido" autocomplete="off">${datalists()}
    <div class="label">${p?"Editar partido":"Nuevo partido"}</div>
    <div class="row2"><div class="field"><label class="label" for="pf-fecha">Fecha</label><input id="pf-fecha" type="date" required value="${p?String(p.fecha).slice(0,10):hoy}"></div>
    <div class="field"><label class="label" for="pf-torneo">Torneo</label><input id="pf-torneo" list="dl-torneos" placeholder="Liga Profesional" value="${esc(p?p.torneo:"")}"></div></div>
    <div class="field"><label class="label" for="pf-rival">Rival</label><input id="pf-rival" list="dl-rivales" required placeholder="River Plate" value="${esc(p?p.rival:"")}"></div>
    <div class="scorebox"><div class="field"><label class="label" for="pf-gf">Boca</label><input id="pf-gf" type="number" min="0" inputmode="numeric" required value="${p?p.gf:0}"></div><span class="vs">–</span>
      <div class="field"><label class="label" for="pf-gc">Rival</label><input id="pf-gc" type="number" min="0" inputmode="numeric" required value="${p?p.gc:0}"></div></div>
    <div class="field"><span class="label">Goleadores de Boca</span><div class="gl-rows" id="glRows">${(p&&p.goleadores?p.goleadores:[]).map(glRow).join("")}</div>
      <button type="button" class="btn small" id="glAdd" style="align-self:flex-start">+ Agregar goleador</button></div>
    <div class="field"><label class="label" for="pf-cancha">Cancha</label>
      ${canchas.length?`<select id="pf-cancha" required>${canchas.map(c=>`<option value="${c.id}" ${c.id===sel?"selected":""}>${esc(c.nombre)}${c.equipo&&c.tipo!=="neutral"?" ("+esc(c.equipo)+")":""}</option>`).join("")}</select>`
      :`<p class="hint-t">Primero agregá una cancha.</p>`}
      <button type="button" class="btn small" data-mode="cancha" style="align-self:flex-start">+ Nueva cancha</button></div>
    <div class="field"><label class="label" for="pf-sector">Dónde estuve en la cancha</label><input id="pf-sector" list="dl-sectores" placeholder="Popular sur, Platea baja…" value="${esc(p?p.sector:"")}"></div>
    <div class="formbar">${p?`<button type="button" class="btn" id="cancelEdit">Cancelar</button>`:""}<button class="btn primary" type="submit" ${canchas.length?"":"disabled"}>${p?"Guardar cambios":"Guardar partido"}</button></div>
  </form>`;
}
function fCancha(){
  const c=S.editCancha?S.canchas.find(x=>x.id===S.editCancha):null;
  const tipo=c?c.tipo||"equipo":"equipo";
  const crest=S.draftCrest!==undefined?S.draftCrest:(c?c.escudo:null);
  return `<form class="f" id="fCancha" autocomplete="off">
    <div class="label">${c?"Editar cancha":"Nueva cancha"}</div>
    <div class="field"><label class="label" for="cf-nombre">Nombre del estadio</label><input id="cf-nombre" required placeholder="Estadio Ciudad de La Plata" value="${esc(c?c.nombre:"")}"></div>
    <div class="radio" role="radiogroup" aria-label="Tipo de cancha">
      <label><input type="radio" name="cf-tipo" value="equipo" ${tipo==="equipo"?"checked":""}> Es de un club</label>
      <label><input type="radio" name="cf-tipo" value="neutral" ${tipo==="neutral"?"checked":""}> Estadio neutral</label></div>
    <div class="field" id="cf-equipo-w" ${tipo==="neutral"?"hidden":""}><label class="label" for="cf-equipo">Club</label><input id="cf-equipo" placeholder="Estudiantes de La Plata" value="${esc(c?c.equipo:"")}"></div>
    <div class="row2"><div class="field"><label class="label" for="cf-ciudad">Ciudad</label><input id="cf-ciudad" placeholder="La Plata" value="${esc(c?c.ciudad:"")}"></div>
      <div class="field"><label class="label" for="cf-pais">País</label><select id="cf-pais">${PAISES.map(([k,n])=>`<option value="${k}" ${(c?c.pais:"AR")===k?"selected":""}>${flag(k)} ${n}</option>`).join("")}</select></div></div>
    <div class="field" id="cf-escudo-w" ${tipo==="neutral"?"hidden":""}><span class="label">Escudo del club</span>
      <div class="upload"><div class="crest">${crest?`<img src="${esc(crest)}" alt="">`:ICON_STADIUM}</div>
        <div style="display:flex;flex-direction:column;gap:6px"><button type="button" class="btn small" id="cfPick">${crest?"Cambiar imagen":"Subir imagen"}</button>${crest?`<button type="button" class="btn small" id="cfClear">Quitar</button>`:""}</div>
        <input type="file" id="cfFile" accept="image/*" hidden></div>
      <p class="hint-t">Si no subís escudo se muestra la inicial del club.</p></div>
    <label class="check"><input type="checkbox" id="cf-bomb" ${c&&c.bombonera?"checked":""}> Es La Bombonera (cuenta para el resumen de local)</label>
    <div class="formbar">${c?`<button type="button" class="btn" id="cancelEdit">Cancelar</button>`:""}<button class="btn primary" type="submit">${c?"Guardar cambios":"Guardar cancha"}</button></div>
  </form>`;
}
function fGoleador(){
  return `<form class="f" id="fGoleador" autocomplete="off">${datalists()}
    <div class="label">Agregar goles a mano</div>
    <p class="hint-t">Los goles que cargás en cada partido ya se cuentan solos. Usá esto para sumar goles de partidos que no tenés cargados.</p>
    <div class="field"><label class="label" for="gf-nombre">Jugador</label><input id="gf-nombre" list="dl-nombres" required placeholder="Martín Palermo"></div>
    <div class="field"><label class="label" for="gf-goles">Goles</label><input id="gf-goles" type="number" min="1" inputmode="numeric" required value="1"></div>
    <div class="formbar"><button class="btn primary" type="submit">Guardar goleador</button></div>
  </form>`;
}

/* ---------- render ---------- */
const VIEWS={resumen:vResumen,boca:vBoca,canchas:vCanchas,goleadores:vGoleadores,agregar:vAgregar};
let cDraft=null;
function snapshotCancha(){cDraft={nombre:$("#cf-nombre").value,equipo:$("#cf-equipo").value,ciudad:$("#cf-ciudad").value,pais:$("#cf-pais").value,tipo:(document.querySelector('[name="cf-tipo"]:checked')||{}).value,bomb:$("#cf-bomb").checked}}
function restoreCancha(){if(!cDraft||!$("#fCancha"))return;$("#cf-nombre").value=cDraft.nombre;$("#cf-equipo").value=cDraft.equipo;$("#cf-ciudad").value=cDraft.ciudad;$("#cf-pais").value=cDraft.pais;$("#cf-bomb").checked=cDraft.bomb;
  const r=document.querySelector(`[name="cf-tipo"][value="${cDraft.tipo}"]`);if(r){r.checked=true;const n=cDraft.tipo==="neutral";$("#cf-equipo-w").hidden=n;$("#cf-escudo-w").hidden=n}cDraft=null}

function render(only){
  document.querySelectorAll(".tab").forEach(t=>{if(t.dataset.tab===S.tab)t.setAttribute("aria-current","page");else t.removeAttribute("aria-current")});
  document.querySelectorAll("section.view").forEach(v=>{const on=v.dataset.view===S.tab;v.hidden=!on;
    if(on&&!(only==="data"&&v.dataset.view==="agregar"&&S.dirty))v.innerHTML=VIEWS[v.dataset.view]()});
  if(only!=="data")S.dirty=false;
  restoreCancha();
}
function go(tab){S.tab=tab;store("boca.tab",tab);try{history.replaceState(null,"","#"+tab)}catch(e){}S.dirty=false;render();window.scrollTo(0,0)}
function resetEdicion(){S.editPartido=null;S.editCancha=null;S.draftCrest=undefined}

document.querySelector("nav.tabs").addEventListener("click",e=>{const b=e.target.closest(".tab");if(b){if(b.dataset.tab==="agregar"&&S.tab!=="agregar")resetEdicion();go(b.dataset.tab)}});

/* ---------- acciones ---------- */
let armed=null;
function confirmar(btn,fn){
  if(armed===btn){armed=null;fn();return}
  if(armed){armed.classList.remove("armed");armed.textContent=armed.dataset.label}
  btn.dataset.label=btn.textContent;armed=btn;btn.classList.add("armed");btn.textContent="¿Seguro?";
  setTimeout(()=>{if(armed===btn){btn.classList.remove("armed");btn.textContent=btn.dataset.label;armed=null}},3500);
}

const main=document.querySelector("main");
main.addEventListener("input",()=>{if(S.tab==="agregar")S.dirty=true});
main.addEventListener("click",e=>{
  const t=e.target.closest("button");if(!t)return;
  if(t.dataset.goAdd){S.addMode=t.dataset.goAdd;resetEdicion();go("agregar");return}
  if(t.dataset.mode){S.addMode=t.dataset.mode;resetEdicion();S.dirty=false;render();return}
  if(t.dataset.editP){S.addMode="boca";S.editPartido=t.dataset.editP;go("agregar");return}
  if(t.dataset.editC){S.addMode="cancha";S.editCancha=t.dataset.editC;S.draftCrest=undefined;go("agregar");return}
  if(t.dataset.delP){confirmar(t,()=>mutar(()=>api("DELETE","/api/partidos?id="+t.dataset.delP),"Partido borrado"));return}
  if(t.dataset.delC){const id=t.dataset.delC;const n=S.partidos.filter(p=>p.canchaId===id).length;
    if(n){toast(`Tiene ${n} ${n===1?"partido":"partidos"} cargados. Cambiales la cancha primero.`);return}
    confirmar(t,()=>mutar(()=>api("DELETE","/api/canchas?id="+id),"Cancha borrada"));return}
  if(t.dataset.delG){confirmar(t,()=>mutar(()=>api("DELETE","/api/goleadores?id="+t.dataset.delG),"Goles quitados"));return}
  if(t.id==="cancelEdit"){const back=S.editPartido?"boca":"canchas";resetEdicion();go(back);return}
  if(t.id==="glAdd"){$("#glRows").insertAdjacentHTML("beforeend",glRow());$("#glRows").lastElementChild.querySelector("input").focus();S.dirty=true;return}
  if(t.hasAttribute("data-gl-del")){t.closest(".gl-row").remove();return}
  if(t.id==="cfPick"){$("#cfFile").click();return}
  if(t.id==="cfClear"){S.draftCrest=null;snapshotCancha();render();S.dirty=true;return}
});
main.addEventListener("change",async e=>{
  if(e.target.id==="fAnio"){S.filtroAnio=e.target.value;render();return}
  if(e.target.name==="cf-tipo"){const n=e.target.value==="neutral";$("#cf-equipo-w").hidden=n;$("#cf-escudo-w").hidden=n;return}
  if(e.target.id==="cfFile"){const f=e.target.files[0];if(!f)return;
    try{S.draftCrest=await achicar(f,256);snapshotCancha();render();S.dirty=true}catch(err){toast(err.message)}}
});

main.addEventListener("submit",async e=>{
  e.preventDefault();
  const f=e.target, sub=f.querySelector('[type="submit"]');sub.disabled=true;
  try{
    if(f.id==="fPartido"){
      const goleadores=[...f.querySelectorAll(".gl-row")].map(r=>({nombre:r.querySelector('[name="gl-nombre"]').value.trim(),goles:Math.max(1,parseInt(r.querySelector('[name="gl-goles"]').value)||1)})).filter(g=>g.nombre);
      const data={fecha:$("#pf-fecha").value,torneo:$("#pf-torneo").value.trim(),rival:$("#pf-rival").value.trim(),gf:Math.max(0,parseInt($("#pf-gf").value)||0),gc:Math.max(0,parseInt($("#pf-gc").value)||0),
        goleadores,canchaId:$("#pf-cancha").value,sector:$("#pf-sector").value.trim()};
      const sumG=goleadores.reduce((a,g)=>a+g.goles,0);
      if(sumG>data.gf){toast(`Cargaste ${sumG} goles de jugadores pero Boca hizo ${data.gf}`);return}
      store("boca.ultCancha",data.canchaId);
      const editando=S.editPartido;
      const ok=await mutar(()=>editando?api("PUT","/api/partidos?id="+editando,data):api("POST","/api/partidos",data),editando?"Partido actualizado":"Partido guardado");
      if(ok){resetEdicion();go("boca")}
    }
    if(f.id==="fCancha"){
      const tipo=(f.querySelector('[name="cf-tipo"]:checked')||{}).value||"equipo";
      const prev=S.editCancha?cancha(S.editCancha):null;
      const escudo=S.draftCrest!==undefined?S.draftCrest:(prev?prev.escudo||null:null);
      const data={nombre:$("#cf-nombre").value.trim(),tipo,equipo:tipo==="neutral"?"":$("#cf-equipo").value.trim(),ciudad:$("#cf-ciudad").value.trim(),pais:$("#cf-pais").value,escudo:tipo==="neutral"?null:escudo,bombonera:$("#cf-bomb").checked};
      const editando=S.editCancha;
      const ok=await mutar(()=>editando?api("PUT","/api/canchas?id="+editando,data):api("POST","/api/canchas",data),editando?"Cancha actualizada":"Cancha guardada");
      if(ok){resetEdicion();go("canchas")}
    }
    if(f.id==="fGoleador"){
      const nombre=$("#gf-nombre").value.trim(), g=Math.max(1,parseInt($("#gf-goles").value)||1);
      const ok=await mutar(()=>api("POST","/api/goleadores",{nombre,goles:g}),`${g} ${g===1?"gol":"goles"} sumados a ${nombre}`);
      if(ok)go("goleadores");
    }
  }finally{if(sub.isConnected)sub.disabled=false}
});

/* ---------- login ---------- */
function mostrarLogin(){$("#appView").hidden=true;$("#loginView").hidden=false;S.loaded=false}
async function mostrarApp(email){
  S.email=email;$("#meEmail").textContent=email;
  $("#loginView").hidden=true;$("#appView").hidden=false;
  const h=(location.hash||"").slice(1);const r=recall("boca.tab");
  S.tab=VIEWS[h]?h:(VIEWS[r]?r:"resumen");
  render();
  try{await cargar()}catch(e){const n=$("#notice");n.hidden=false;n.textContent=e.message}
}
document.querySelector("#loginView .seg").addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;S.loginModo=b.dataset.login;
  document.querySelectorAll("[data-login]").forEach(x=>x.setAttribute("aria-pressed",x===b));
  $("#lgBtn").textContent=S.loginModo==="registrar"?"Registrarme":"Entrar";$("#lgErr").hidden=true;
});
$("#fLogin").addEventListener("submit",async e=>{
  e.preventDefault();const btn=$("#lgBtn"),err=$("#lgErr");btn.disabled=true;err.hidden=true;
  try{const d=await api("POST","/api/auth",{email:$("#lg-email").value,modo:S.loginModo});await mostrarApp(d.email)}
  catch(x){err.textContent=x.message;err.hidden=false}
  finally{btn.disabled=false}
});
$("#logout").addEventListener("click",async()=>{try{await api("DELETE","/api/auth")}catch(e){}S.partidos=[];S.canchas=[];S.goleadores=[];mostrarLogin()});

(async()=>{
  try{const d=await api("GET","/api/auth");await mostrarApp(d.email)}
  catch(e){mostrarLogin()}
})();
})();
