/* eslint-disable */
/**
 * Motor de renderização do Painel Executivo (porte fiel do painel HTML da Bem Vindo Car).
 * Recebe o JSON de dados (D) e monta as 15 telas dentro de `root`. Retorna a função de limpeza.
 * Gerado a partir de engine.js — não depende de globais do documento (usa o root como escopo).
 */
export function mountPainel(__root, D, Chart) {
  const alive = { v: true };
  const cleanups = [];
  const document = {
    getElementById: (id) => __root.querySelector('#' + id),
    querySelector: (s) => __root.querySelector(s),
    querySelectorAll: (s) => __root.querySelectorAll(s),
    createElement: (t) => window.document.createElement(t),
  };
  const history = { replaceState() {} };
  const location = { hash: '' };
  const addEventListener = (t, f, o) => {
    window.addEventListener(t, f, o);
    cleanups.push(() => window.removeEventListener(t, f, o));
  };
  const requestAnimationFrame = (f) => (alive.v ? window.requestAnimationFrame(f) : 0);

/* ================= BASE ================= */
const REF=(()=>{const m=/(\d{2})\/(\d{2})\/(\d{4})/.exec(D.ref||'');return m?m[3]+'-'+m[2]+'-'+m[1]:'2026-10-29'})();
const MONTHS=[...new Set(D.os.map(r=>r[0].slice(0,7)))].sort();
const MN=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MFULL=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const C={gold:'#f8c208',blue:'#1a86e0',green:'#30d158',orange:'#ff9f0a',red:'#ff453a',purple:'#bf5af2',teal:'#64d2ff',pink:'#ff375f',yellow:'#ffd43a',indigo:'#5e5ce6',mint:'#66d4cf',gray:'#8e8e93'};
const PAL=[C.gold,C.blue,C.teal,C.orange,C.green,C.purple,C.indigo,C.pink,C.mint,C.red,C.gray];
const METAS=Object.assign({fat:120000,carros:45,ticket:3000,lucro:40000},D.metasMes||{});
/* Meta de faturamento de cada mês = a cadastrada no portal (Metas de Vendas). Sem meta no mês, vale a meta padrão acima. */
const metasPortal=D.metasMensais||{};
function metaMes(k){
  const m={...METAS},i=+k.slice(5,7);
  if(metasPortal[k]>0)m.fat=metasPortal[k];
  if(k.slice(0,4)==='2027'){
    const tk=rowOf(D.metas27,'Ticket médio meta')[i],cr=rowOf(D.metas27,'Quantidade necessária')[i],eb=rowOf(D.dre27,'(=) EBITDA / RESULTADO')[i];
    if(tk)m.ticket=tk;if(cr)m.carros=cr;if(eb)m.lucro=eb;
  }
  return m;
}
function metaSel(){
  if(SEL!=='all')return metaMes(SEL);
  const ms=MONTHS.map(metaMes),avg=k=>sum(ms.map(x=>x[k]))/(ms.length||1);
  return {fat:avg('fat'),carros:avg('carros'),ticket:avg('ticket'),lucro:avg('lucro')};
}
let SEL=MONTHS[MONTHS.length-1];

const brl=(v,d=0)=>v==null||isNaN(v)?'—':v.toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:d,maximumFractionDigits:d});
const brlk=v=>Math.abs(v)>=1000?'R$ '+(v/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})+' mil':brl(v);
const pct=(v,d=1)=>v==null||isNaN(v)||!isFinite(v)?'—':(v*100).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})+'%';
const num=(v,d=0)=>v==null||isNaN(v)?'—':v.toLocaleString('pt-BR',{maximumFractionDigits:d});
const fd=s=>s?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(2,4):'—';
const sum=a=>a.reduce((x,y)=>x+(+y||0),0);
const ml=k=>MN[+k.slice(5,7)-1]+'/'+k.slice(2,4);
const mlong=k=>MFULL[+k.slice(5,7)-1]+' '+k.slice(0,4);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ini=n=>String(n||'?').split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();
const delta=(a,b,inv)=>{if(!b)return '<span class="delta nt">—</span>';const d=a/b-1,good=inv?d<=0:d>=0;return `<span class="delta ${Math.abs(d)<.005?'nt':good?'up':'dn'}">${d>=0?'↑':'↓'} ${pct(Math.abs(d))}</span>`};
const tag=(t,c)=>`<span class="tag ${c}">${t}</span>`;

/* OS: [data,os,cliente,placa,veiculo,mecanico,servico,categoria,status,forma,mo,pecas,desc,total,custo,lucro,estimativa] */
const OS=D.os.map(r=>({d:r[0],m:r[0].slice(0,7),os:r[1],cli:r[2],placa:r[3],veic:r[4],mec:r[5]||'(sem mecânico)',serv:r[6]||'—',cat:r[7]||'Outros',st:r[8]||'—',fp:r[9]||'Não informado',mo:r[10],pc:r[11],desc:r[12],tot:r[13],custo:r[14],lb:r[15],est:r[16]}));
const DESP=D.desp.map(r=>({d:r[0],m:r[0].slice(0,7),desc:r[1],tipo:r[2]||'—',cat:r[3]||'Outros',v:r[4],fp:r[5]||'—',pago:r[6]||'—'}));
const NOTAS=D.notas.map(r=>({d:r[0],m:r[0].slice(0,7),nf:r[1],forn:(r[2]||'—').replace(/ - LJ010$/,''),peca:r[3],os:r[4],q:r[5],u:r[6],tot:r[7],rev:r[8]}));
const PER=()=>MN[+MONTHS[0].slice(5,7)-1]+' a '+MN[+MONTHS[MONTHS.length-1].slice(5,7)-1]+'/'+MONTHS[MONTHS.length-1].slice(0,4);
const PERL=()=>MFULL[+MONTHS[0].slice(5,7)-1].toLowerCase()+' a '+MFULL[+MONTHS[MONTHS.length-1].slice(5,7)-1].toLowerCase()+' de '+MONTHS[MONTHS.length-1].slice(0,4);
const inSel=m=>SEL==='all'||m===SEL;
const prevM=k=>{const i=MONTHS.indexOf(k);return i>0?MONTHS[i-1]:null};
function workdays(y,mo){let n=0;const d=new Date(y,mo,0).getDate();for(let i=1;i<=d;i++){if(new Date(y,mo-1,i).getDay()!==0)n++}return n}
function workdaysUntil(y,mo,day){let n=0;for(let i=1;i<=day;i++){if(new Date(y,mo-1,i).getDay()!==0)n++}return n}
const TAX={};D.dreBase.forEach((r,i)=>{const k='2026-'+String(i+1).padStart(2,'0');TAX[k]=+r[5]||0});

function stats(m){
  const os=OS.filter(o=>m==='all'?true:o.m===m),ds=DESP.filter(o=>m==='all'?true:o.m===m);
  const fat=sum(os.map(o=>o.tot)),desp=sum(ds.map(o=>o.v)),car=os.length,imp=m==='all'?sum(Object.values(TAX)):(TAX[m]||0);
  let proj=fat;if(m===REF.slice(0,7)){const y=+m.slice(0,4),mo=+m.slice(5,7);proj=fat/workdaysUntil(y,mo,+REF.slice(8,10))*workdays(y,mo)}
  return {os,ds,fat,desp,car,ticket:car?fat/car:0,res:fat-desp,liq:fat-desp-imp,imp,proj,mo:sum(os.map(o=>o.mo)),pc:sum(os.map(o=>o.pc)),custo:sum(os.map(o=>o.custo)),lb:sum(os.map(o=>o.lb)),aberto:DESP.filter(x=>x.pago==='Não')};
}
function groupBy(arr,key,val){const o={};arr.forEach(x=>{const k=typeof key==='function'?key(x):x[key];o[k]=(o[k]||0)+(typeof val==='function'?val(x):val?x[val]:1)});return o}
const sortObj=(o)=>Object.entries(o).sort((a,b)=>b[1]-a[1]);

/* ================= CHART DEFAULTS ================= */
Chart.defaults.color='#8e8e93';Chart.defaults.font.family='-apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,sans-serif';Chart.defaults.font.size=11.5;
Chart.defaults.borderColor='rgba(255,255,255,.06)';
Object.assign(Chart.defaults.plugins.tooltip,{backgroundColor:'rgba(30,31,40,.92)',borderColor:'rgba(255,255,255,.12)',borderWidth:1,padding:12,cornerRadius:12,titleFont:{weight:'600',size:12.5},bodyFont:{size:12},boxPadding:6,usePointStyle:true});
Object.assign(Chart.defaults.plugins.legend.labels,{usePointStyle:true,pointStyle:'circle',boxWidth:7,boxHeight:7,padding:16});
Chart.defaults.elements.bar.borderRadius=7;Chart.defaults.elements.line.borderWidth=2.5;Chart.defaults.elements.point.radius=0;Chart.defaults.elements.point.hoverRadius=5;
Chart.defaults.animation.duration=1100;Chart.defaults.animation.easing='easeOutQuart';
const CH={};
function chart(id,cfg){if(CH[id])CH[id].destroy();const el=document.getElementById(id);if(!el)return;CH[id]=new Chart(el,cfg);return CH[id]}
const yR={ticks:{callback:v=>Math.abs(v)>=1000?(v/1000)+'k':v},grid:{color:'rgba(255,255,255,.05)'},border:{display:false}};
const xG={grid:{display:false},border:{display:false}};
const tipR={callbacks:{label:x=>' '+x.dataset.label+': '+brl(x.raw)}};
const grad=(ctx,c,h=280)=>{const g=ctx.chart.ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,c+'66');g.addColorStop(1,c+'00');return g};

/* ================= UI HELPERS ================= */
const card=(title,sub,body,cls='',act='')=>`<div class="card ${cls}"><div class="ct"><div><h3>${title}</h3>${sub?`<p>${sub}</p>`:''}</div>${act?`<div class="act">${act}</div>`:''}</div>${body}</div>`;
const kpi=(lbl,val,sub,ic,col,extra='',small)=>`<div class="card kpi hover ${extra?'has-spark':''}"><div class="lbl"><span class="ic" style="background:${col}22;color:${col}">${ic}</span>${lbl}</div><div class="val ${small?'sm':''}" ${typeof val==='number'?`data-cu="${val}"`:''}>${typeof val==='number'?'R$ 0':val}</div><div class="sub">${sub||''}</div>${extra}</div>`;
const kpiN=(lbl,val,sub,ic,col)=>`<div class="card kpi hover"><div class="lbl"><span class="ic" style="background:${col}22;color:${col}">${ic}</span>${lbl}</div><div class="val">${val}</div><div class="sub">${sub||''}</div></div>`;
const cv=(id,cls='')=>`<div class="chart ${cls}"><canvas id="${id}"></canvas></div>`;
function table(heads,rows,opt={}){return `<div class="tw ${opt.h||''}"><table ${opt.id?`id="${opt.id}"`:''}><thead><tr>${heads.map(h=>{const [t,n]=Array.isArray(h)?h:[h,0];return `<th class="${n?'n':''}">${t}</th>`}).join('')}</tr></thead><tbody>${rows.join('')||`<tr><td colspan="${heads.length}" class="empty">Nada para mostrar neste período</td></tr>`}</tbody></table></div>`}
const ring=(lbl,v,meta,fmt,col,sub)=>{const p=meta>0?Math.max(0,Math.min(v/meta,1)):0,R=44,L=2*Math.PI*R;return `<div class="ring"><div class="rc"><svg width="104" height="104"><circle cx="52" cy="52" r="${R}" stroke="${col}26" stroke-width="10" fill="none"/><circle class="p" cx="52" cy="52" r="${R}" stroke="${col}" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="${L}" stroke-dashoffset="${L}" data-off="${L*(1-p)}" style="filter:drop-shadow(0 0 6px ${col}88)"/></svg><div class="rv">${pct(v/meta,0)}</div></div><div><b>${lbl}</b><small>${fmt(v)} de ${fmt(meta)}</small>${sub?`<small>${sub}</small>`:''}</div></div>`};
function animate(root){
  root.querySelectorAll('[data-cu]').forEach(el=>{const to=+el.dataset.cu,st=performance.now(),dur=1300;(function f(t){const p=Math.min((t-st)/dur,1),e=1-Math.pow(1-p,4);el.textContent=brl(to*e);if(p<1)requestAnimationFrame(f)})(st)});
  requestAnimationFrame(()=>setTimeout(()=>{root.querySelectorAll('circle.p').forEach(c=>c.style.strokeDashoffset=c.dataset.off);root.querySelectorAll('.bar i[data-w]').forEach(b=>b.style.width=b.dataset.w)},60));
  root.querySelectorAll('.card').forEach((c,i)=>{c.style.animationDelay=Math.min(i*.04,.6)+'s';c.addEventListener('mousemove',e=>{const r=c.getBoundingClientRect();c.style.setProperty('--mx',(e.clientX-r.left)+'px');c.style.setProperty('--my',(e.clientY-r.top)+'px')})});
}
const pbar=(p,col)=>`<div class="bar"><i data-w="${Math.max(0,Math.min(p,1))*100}%" style="background:${col}"></i></div>`;
function sparkSVG(vals,col){const mx=Math.max(...vals,1),mn=Math.min(...vals,0),w=90,h=34;const pts=vals.map((v,i)=>[i/(vals.length-1)*w,h-(v-mn)/(mx-mn||1)*(h-4)-2]);const d=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');return `<svg class="spark" viewBox="0 0 90 34"><defs><linearGradient id="sg${col.slice(1)}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".35"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs><path d="${d} L90 34 L0 34Z" fill="url(#sg${col.slice(1)})"/><path d="${d}" fill="none" stroke="${col}" stroke-width="1.8" stroke-linecap="round"/></svg>`}
function makeSortable(id){const t=document.getElementById(id);if(!t)return;t.querySelectorAll('th').forEach((th,ci)=>{th.classList.add('s');th.onclick=()=>{const tb=t.tBodies[0],rows=[...tb.rows].filter(r=>!r.classList.contains('tot'));const dir=th.dataset.d==='1'?-1:1;th.dataset.d=dir===1?'1':'0';rows.sort((a,b)=>{const x=a.cells[ci].dataset.v??a.cells[ci].textContent,y=b.cells[ci].dataset.v??b.cells[ci].textContent;const nx=parseFloat(x),ny=parseFloat(y);return (!isNaN(nx)&&!isNaN(ny)?nx-ny:x.localeCompare(y,'pt'))*dir});rows.forEach(r=>tb.appendChild(r))}})}

/* ================= VIEWS ================= */
const VIEWS=[
 {g:'Operação',id:'geral',t:'Visão Geral',ic:'◉',c:C.blue,lead:'Faturamento, lucro, metas e o pulso da oficina no período.',m:1},
 {g:'Operação',id:'os',t:'Ordens de Serviço',ic:'≣',c:C.indigo,lead:'Todas as OS lançadas, com mão de obra, peças, custo e lucro bruto.',m:1},
 {g:'Operação',id:'mec',t:'Mecânicos',ic:'⚙',c:C.orange,lead:'Produção, ticket médio e nota ponderada de cada mecânico.',m:1},
 {g:'Operação',id:'serv',t:'Serviços',ic:'✦',c:C.purple,lead:'O que mais vende, por categoria, e o catálogo com preços de mão de obra.',m:1},
 {g:'Operação',id:'cli',t:'Clientes',ic:'☺',c:C.green,lead:'CRM: quem mais gasta, quem está ativo e quem chamar para retorno.',m:0},
 {g:'Operação',id:'veic',t:'Veículos',ic:'⛟',c:C.teal,lead:'Frota atendida: placas, modelos, visitas e quanto cada carro rendeu.',m:0},
 {g:'Operação',id:'pecas',t:'Peças & Notas',ic:'⬡',c:C.mint,lead:'Notas de compra de peças, fornecedores e custo contra a receita de peças.',m:1},
 {g:'Financeiro',id:'desp',t:'Despesas',ic:'↘',c:C.red,lead:'Custos por categoria, tipo e status de pagamento.',m:1},
 {g:'Financeiro',id:'dre',t:'DRE',ic:'≡',c:C.blue,lead:'Demonstrativo comparativo entre dois meses, com tendência e projeção de lucro.',m:0},
 {g:'Financeiro',id:'caixa',t:'Fluxo de Caixa',ic:'⇅',c:C.green,lead:'Caixa acumulado, reserva para expansão e divisão de lucros entre sócios.',m:0},
 {g:'Planejamento',id:'tri',t:'4º Trimestre 2026',ic:'◔',c:C.pink,lead:'Metas de outubro a dezembro e o realizado até agora.',m:0},
 {g:'Planejamento',id:'metasreal',t:'Metas × Realizado',ic:'⚑',c:C.green,lead:'Meta de faturamento de cada mês, cadastrada no portal, contra as OS lançadas.',m:0},
 {g:'Planejamento',id:'orc',t:'Orçamento 2027',ic:'◆',c:C.purple,lead:'Meta anual, premissas e a composição do faturamento planejado.',m:0},
 {g:'Planejamento',id:'dre27',t:'DRE 2027',ic:'∑',c:C.indigo,lead:'Resultado orçado mês a mês, indicadores de eficiência e visão trimestral.',m:0},
 {g:'Planejamento',id:'metas',t:'Metas & Operacional',ic:'◎',c:C.orange,lead:'Volume de carros, metas diárias e semanais, e de onde vem o crescimento.',m:0},
 {g:'Planejamento',id:'plano',t:'Plano de Ação',ic:'➜',c:C.teal,lead:'Fluxo de gestão de desvios e a biblioteca de alavancas de crescimento.',m:0},
];
let CUR='geral';

/* ---------- 1. VISÃO GERAL ---------- */
function vGeral(el){
  const s=stats(SEL),p=SEL!=='all'&&prevM(SEL)?stats(prevM(SEL)):null;
  const trend=MONTHS.map(m=>stats(m));
  const sub=(a,b,inv)=>p?delta(a,b,inv)+' vs '+ml(prevM(SEL)):PER();
  el.innerHTML=`
  <div class="grid g6">
    ${kpi('Faturamento',s.fat,sub(s.fat,p?.fat),'$',C.gold,sparkSVG(trend.map(t=>t.fat),C.gold))}
    ${kpi('Lucro (fat. − despesas)',s.res,sub(s.res,p?.res),'↗',C.green,sparkSVG(trend.map(t=>t.res),C.green))}
    ${kpi('Despesas',s.desp,sub(s.desp,p?.desp,1),'↘',C.red,sparkSVG(trend.map(t=>t.desp),C.red))}
    ${kpi('Ticket médio',s.ticket,sub(s.ticket,p?.ticket),'◈',C.purple,sparkSVG(trend.map(t=>t.ticket),C.purple))}
    ${kpiN('Carros atendidos',num(s.car),sub(s.car,p?.car),'⛟',C.teal)}
    ${kpi('Projeção do mês',s.proj,SEL===REF.slice(0,7)?workdaysUntil(+REF.slice(0,4),+REF.slice(5,7),+REF.slice(8,10))+' de '+workdays(+REF.slice(0,4),+REF.slice(5,7))+' dias úteis · '+delta(s.proj,p?.fat):'Mês fechado','◔',C.orange)}
  </div>
  <div class="grid g21">
    ${card('Evolução mensal','Faturamento, despesas e lucro · '+PERL(),cv('cEvo','lg'))}
    ${card(SEL==='all'?'Metas mensais · média':'Metas do mês','Faturamento: meta do mês cadastrada no portal (Metas de Vendas)',`<div class="rings">${(()=>{const n=SEL==='all'?MONTHS.length:1;return ring('Faturamento',s.fat/n,metaSel().fat,brlk,C.gold)+ring('Lucro',s.res/n,metaSel().lucro,brlk,C.green)+ring('Carros',s.car/n,metaSel().carros,v=>num(v),C.teal)+ring('Ticket',s.ticket,metaSel().ticket,brlk,C.purple)})()}</div>
      <div class="note">${(()=>{const n=SEL==='all'?MONTHS.length:1,c=s.car/n;return (c>=metaSel().carros?'Meta de carros superada ('+num(c,0)+' de '+metaSel().carros+'). ':'Carros abaixo da meta ('+num(c,0)+' de '+metaSel().carros+'). ')+(s.ticket<metaSel().ticket?'O ticket médio está em '+pct(s.ticket/metaSel().ticket,0)+' da meta de '+brl(metaSel().ticket)+', e esse é o principal ponto de alavanca.':'Ticket médio acima da meta.')})()}</div>`)}
  </div>
  <div class="grid g32">
    ${card(SEL==='all'?'Faturamento por mês':'Faturamento diário',SEL==='all'?'Total de OS por mês':'Total das OS por dia em '+mlong(SEL),cv('cDiaG'))}
    ${card('Formas de pagamento','Informadas nas OS',cv('cPg','sm')+`<div class="note">${pct(s.os.filter(o=>o.fp==='Não informado').length/(s.os.length||1),0)} das OS estão sem forma de pagamento informada.</div>`)}
  </div>
  <div class="grid g3">
    ${card('Ranking de mecânicos','Faturamento no período',`<div class="list">${sortObj(groupBy(s.os,'mec','tot')).slice(0,6).map(([n,v],i)=>{const c=s.os.filter(o=>o.mec===n).length;return `<div class="li"><div class="ix" style="background:${PAL[i]}22;color:${PAL[i]}">${i+1}</div><div class="lt"><b>${esc(n)}</b><small>${c} carros · ticket ${brl(v/c)}</small></div><div class="lv">${brl(v)}<small>${pct(v/s.fat)}</small></div></div>`}).join('')}</div>`)}
    ${card('Top serviços','Por faturamento no período',`<div class="list">${sortObj(groupBy(s.os,'serv','tot')).slice(0,6).map(([n,v],i)=>{const q=s.os.filter(o=>o.serv===n).length;return `<div class="li"><div class="ix" style="background:${PAL[(i+3)%10]}22;color:${PAL[(i+3)%10]}">${i+1}</div><div class="lt"><b>${esc(n)}</b><small>${q} OS</small></div><div class="lv">${brl(v)}</div></div>`}).join('')}</div>`)}
    ${card('Alertas & insights','Gerados automaticamente',alertsGeral(s,p))}
  </div>
  <div class="grid g5">
    ${kpiN('OS abertas',num(s.os.filter(o=>o.st==='Aberta').length),'Status operacional','○',C.blue)}
    ${kpiN('Em andamento',num(s.os.filter(o=>o.st==='Em andamento').length),'Sendo executadas','◐',C.orange)}
    ${kpiN('Finalizadas',num(s.os.filter(o=>o.st==='Finalizada').length),'Taxa de conclusão '+pct(s.os.filter(o=>o.st==='Finalizada').length/(s.car||1),0),'●',C.green)}
    ${kpiN('Despesas em aberto',brl(sum(s.aberto.map(x=>x.v))),s.aberto.length+' lançamentos a pagar (todos os meses)','!',C.red)}
    ${kpiN('Reserva de caixa (40%)',brl(Math.max(s.res,0)*.4),'40% do lucro do período','⌂',C.purple)}
  </div>`;
  const L=MONTHS.map(ml);
  chart('cEvo',{data:{labels:L,datasets:[
    {type:'bar',label:'Faturamento',data:trend.map(t=>t.fat),backgroundColor:L.map((_,i)=>MONTHS[i]===SEL?C.gold:'rgba(26,134,224,.55)'),maxBarThickness:38,order:2},
    {type:'bar',label:'Despesas',data:trend.map(t=>t.desp),backgroundColor:'rgba(255,69,58,.45)',maxBarThickness:38,order:2},
    {type:'line',label:'Lucro',data:trend.map(t=>t.res),borderColor:C.green,backgroundColor:C.green,tension:.4,pointRadius:4,pointBackgroundColor:'#05060a',pointBorderWidth:2,order:1}]},
    options:{maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{tooltip:tipR},scales:{y:yR,x:xG}}});
  if(SEL==='all'){chart('cDiaG',{type:'bar',data:{labels:L,datasets:[{label:'Faturamento',data:trend.map(t=>t.fat),backgroundColor:c=>grad(c,C.blue),borderColor:C.blue,borderWidth:{top:2},maxBarThickness:46}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:tipR},scales:{y:yR,x:xG}}})}
  else{const y=+SEL.slice(0,4),mo=+SEL.slice(5,7),nd=new Date(y,mo,0).getDate(),by=groupBy(s.os,o=>+o.d.slice(8,10),'tot');const lab=[...Array(nd)].map((_,i)=>i+1);
    chart('cDiaG',{type:'bar',data:{labels:lab,datasets:[{label:'Faturamento',data:lab.map(d=>by[d]||0),backgroundColor:lab.map(d=>new Date(y,mo-1,d).getDay()===0?'rgba(255,255,255,.08)':'rgba(10,132,255,.75)'),maxBarThickness:18,borderRadius:5}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{title:t=>t[0].label+'/'+String(mo).padStart(2,'0'),label:x=>' '+brl(x.raw)}}},scales:{y:yR,x:xG}}})}
  const fp=sortObj(groupBy(s.os,'fp','tot'));
  chart('cPg',{type:'doughnut',data:{labels:fp.map(x=>x[0]),datasets:[{data:fp.map(x=>x[1]),backgroundColor:fp.map((x,i)=>x[0]==='Não informado'?'rgba(142,142,147,.35)':PAL[i]),borderWidth:0,spacing:3,borderRadius:6}]},options:{maintainAspectRatio:false,cutout:'72%',plugins:{legend:{position:'right'},tooltip:{callbacks:{label:x=>' '+x.label+': '+brl(x.raw)}}}}});
}
function alertsGeral(s,p){
  const a=[];const ab=s.aberto;
  if(ab.length)a.push(['!',C.red,`<b>${ab.length} despesas em aberto</b> somando ${brl(sum(ab.map(x=>x.v)))}`]);
  const est=s.os.filter(o=>o.est).length;if(est)a.push(['i',C.orange,`${est} OS de maio são <b>estimativas</b> (rateio do resumo informado), não há OS detalhada`]);
  if(SEL===REF.slice(0,7))a.push(['↗',C.blue,`Projeção do mês: <b>${brl(s.proj)}</b>${p?' ('+(s.proj/p.fat-1>=0?'+':'')+pct(s.proj/p.fat-1)+' vs mês anterior)':''}`]);
  const top=sortObj(groupBy(s.os,'mec','tot'))[0];if(top)a.push(['★',C.yellow,`Destaque: <b>${esc(top[0])}</b> com ${brl(top[1])} em ${s.os.filter(o=>o.mec===top[0]).length} carros`]);
  if(SEL!=='all')a.push(['◎',C.green,`Meta de faturamento: <b>${pct(s.fat/metaMes(SEL).fat,0)}</b> atingida (${brl(s.fat)} de ${brl(metaMes(SEL).fat)})`]);
  const sm=s.os.filter(o=>o.mec==='(sem mecânico)').length;if(sm)a.push(['?',C.gray,`${sm} OS sem mecânico informado`]);
  return a.map(x=>`<div class="alert"><span class="ai" style="background:${x[1]}22;color:${x[1]}">${x[0]}</span><span>${x[2]}</span></div>`).join('');
}

/* ---------- 2. ORDENS DE SERVIÇO ---------- */
function vOS(el){
  const s=stats(SEL);const mecs=[...new Set(s.os.map(o=>o.mec))].sort();
  el.innerHTML=`
  <div class="grid g6">
    ${kpiN('Ordens de serviço',num(s.car),SEL==='all'?PER():mlong(SEL),'≣',C.indigo)}
    ${kpi('Mão de obra',s.mo,pct(s.mo/s.fat)+' do faturamento','⚒',C.blue,'',1)}
    ${kpi('Peças vendidas',s.pc,pct(s.pc/s.fat)+' do faturamento','⬡',C.teal,'',1)}
    ${kpi('Custo das peças',s.custo,'Informado nas OS','↘',C.red,'',1)}
    ${kpi('Lucro bruto das OS',s.lb,'Faturamento − custo das peças','↗',C.green,'',1)}
    ${kpiN('Margem nas peças',s.custo?pct((s.pc-s.custo)/s.pc):'—','Sobre as OS com custo informado','%',C.purple)}
  </div>
  <div class="grid g21">
    ${card('Mão de obra × peças por mês','Composição do faturamento das OS',cv('cMoPc'))}
    ${card('Por categoria','Faturamento no período',cv('cCat'))}
  </div>
  ${card('Lançamentos','Clique no cabeçalho para ordenar',`<div class="tools" style="margin-bottom:14px"><label class="search">⌕<input id="qOS" placeholder="Buscar cliente, placa, OS, veículo…"></label><select class="sel" id="fMec"><option value="">Todos os mecânicos</option>${mecs.map(m=>`<option>${esc(m)}</option>`).join('')}</select><span class="muted" id="osCount"></span></div><div id="osTbl"></div>`)}`;
  const L=MONTHS.map(ml),T=MONTHS.map(m=>stats(m));
  chart('cMoPc',{type:'bar',data:{labels:L,datasets:[{label:'Mão de obra',data:T.map(t=>t.mo),backgroundColor:C.blue,stack:'a',maxBarThickness:42},{label:'Peças',data:T.map(t=>t.pc),backgroundColor:C.teal,stack:'a',maxBarThickness:42},{label:'Custo das peças',data:T.map(t=>-t.custo),backgroundColor:'rgba(255,69,58,.55)',stack:'b',maxBarThickness:42}]},options:{maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{tooltip:{callbacks:{label:x=>' '+x.dataset.label+': '+brl(Math.abs(x.raw))}}},scales:{y:{...yR,stacked:true},x:{...xG,stacked:true}}}});
  const cat=sortObj(groupBy(s.os,'cat','tot'));
  chart('cCat',{type:'doughnut',data:{labels:cat.map(c=>c[0]),datasets:[{data:cat.map(c=>c[1]),backgroundColor:PAL,borderWidth:0,spacing:3,borderRadius:6}]},options:{maintainAspectRatio:false,cutout:'68%',plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:x=>' '+x.label+': '+brl(x.raw)+' · '+pct(x.raw/s.fat)}}}}});
  const draw=()=>{const q=document.getElementById('qOS').value.toLowerCase(),fm=document.getElementById('fMec').value;
    const rows=s.os.filter(o=>(!fm||o.mec===fm)&&(!q||[o.cli,o.placa,o.os,o.veic,o.serv].join(' ').toLowerCase().includes(q))).sort((a,b)=>b.d.localeCompare(a.d)||String(b.os).localeCompare(String(a.os)));
    document.getElementById('osCount').textContent=rows.length+' OS · '+brl(sum(rows.map(o=>o.tot)));
    document.getElementById('osTbl').innerHTML=table(['Data','OS','Cliente','Placa','Veículo','Mecânico','Serviço','Categoria',['Mão de obra',1],['Peças',1],['Custo peças',1],['Total',1],['Lucro bruto',1],'Status'],
      rows.map(o=>`<tr><td data-v="${o.d}">${fd(o.d)}</td><td>${esc(o.os)}</td><td>${esc(o.cli)}${o.est?' '+tag('estimativa','t-o'):''}</td><td>${esc(o.placa)}</td><td class="muted">${esc(o.veic)}</td><td>${esc(o.mec)}</td><td>${esc(o.serv)}</td><td>${tag(esc(o.cat),'t-n')}</td><td class="n" data-v="${o.mo}">${brl(o.mo,2)}</td><td class="n" data-v="${o.pc}">${brl(o.pc,2)}</td><td class="n muted" data-v="${o.custo}">${o.custo?brl(o.custo,2):'—'}</td><td class="n" data-v="${o.tot}"><b>${brl(o.tot,2)}</b></td><td class="n pos" data-v="${o.lb}">${brl(o.lb,2)}</td><td>${tag(esc(o.st),o.st==='Finalizada'?'t-g':'t-o')}</td></tr>`),{h:'tall',id:'tOS'});makeSortable('tOS')};
  document.getElementById('qOS').oninput=draw;document.getElementById('fMec').onchange=draw;draw();
}

/* ---------- 3. MECÂNICOS ---------- */
function mechRank(){
  const by={};OS.forEach(o=>{if(o.mec==='(sem mecânico)')return;const r=by[o.mec]||(by[o.mec]={n:o.mec,c:0,f:0,ms:new Set()});r.c++;r.f+=o.tot;r.ms.add(o.m)});
  const arr=Object.values(by).map(r=>({...r,t:r.f/r.c,meses:r.ms.size,med:r.c/r.ms.size}));
  const mc=Math.max(...arr.map(r=>r.c)),mf=Math.max(...arr.map(r=>r.f)),mt=Math.max(...arr.map(r=>r.t));
  arr.forEach(r=>{r.nota=10*(.4*r.c/mc+.4*r.f/mf+.2*r.t/mt);r.cls=r.nota>=8?'Destaque':r.nota>=6?'Bom':r.nota>=4?'Regular':'Atenção'});
  return arr.sort((a,b)=>b.nota-a.nota);
}
function vMec(el){
  const s=stats(SEL),R=mechRank(),cargo=Object.fromEntries(D.mecs);
  const per=sortObj(groupBy(s.os.filter(o=>o.mec!=='(sem mecânico)'),'mec','tot'));
  const ccls={Destaque:'t-g',Bom:'t-b',Regular:'t-o','Atenção':'t-r'};
  el.innerHTML=`
  <div class="grid g4">
    ${kpiN('Mecânicos atendendo',num(per.length),'No período · '+D.mecs.length+' cadastrados','⚙',C.orange)}
    ${kpiN('Carros por mecânico',num(s.car/(per.length||1),1),'Média no período','⛟',C.teal)}
    ${kpi('Faturamento por mecânico',s.fat/(per.length||1),'Média no período','$',C.blue)}
    ${kpiN('Destaque histórico',esc(R[0].n),'Nota '+num(R[0].nota,1)+' · '+R[0].c+' carros','★',C.yellow)}
  </div>
  <div class="grid g3">${per.map(([n,v],i)=>{const c=s.os.filter(o=>o.mec===n).length,r=R.find(x=>x.n===n);return `<div class="card hover mech"><div class="mh"><div class="mav" style="background:linear-gradient(145deg,${PAL[i%10]},${PAL[(i+2)%10]})">${ini(n)}</div><div><b>${esc(n)}</b><small>${esc(cargo[n]||'Mecânico')}</small></div><div class="score"><b>${r?num(r.nota,1):'—'}</b>${r?tag(r.cls,ccls[r.cls]):''}</div></div><div class="ms"><div><small>Faturamento</small><b>${brlk(v)}</b></div><div><small>Carros</small><b>${c}</b></div><div><small>Ticket</small><b>${brlk(v/c)}</b></div></div>${pbar(v/per[0][1],PAL[i%10])}<div class="muted" style="font-size:12px">${pct(v/s.fat)} do faturamento do período</div></div>`}).join('')}</div>
  <div class="grid g2">
    ${card('Carros por mecânico, mês a mês','Histórico desde maio/2026',cv('cMecM','lg'))}
    ${card('Ranking geral','Nota ponderada: 40% carros · 40% faturamento · 20% ticket',table(['#','Mecânico',['Carros',1],['Faturamento',1],['Ticket',1],['Meses',1],['Nota',1],'Classe'],R.map((r,i)=>`<tr><td>${i+1}</td><td><b>${esc(r.n)}</b></td><td class="n">${r.c}</td><td class="n">${brl(r.f)}</td><td class="n">${brl(r.t)}</td><td class="n">${r.meses}</td><td class="n"><b>${num(r.nota,1)}</b></td><td>${tag(r.cls,ccls[r.cls])}</td></tr>`),{h:'mid'}))}
  </div>`;
  const names=R.map(r=>r.n);
  chart('cMecM',{type:'bar',data:{labels:MONTHS.map(ml),datasets:names.map((n,i)=>({label:n,data:MONTHS.map(m=>OS.filter(o=>o.m===m&&o.mec===n).length),backgroundColor:PAL[i%11],stack:'s',maxBarThickness:44,borderRadius:3}))},options:{maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'bottom'}},scales:{y:{...yR,stacked:true},x:{...xG,stacked:true}}}});
}

/* ---------- 4. SERVIÇOS ---------- */
function vServ(el){
  const s=stats(SEL),sv=sortObj(groupBy(s.os,'serv','tot')),cat=sortObj(groupBy(s.os,'cat','tot'));
  el.innerHTML=`
  <div class="grid g4">
    ${kpiN('Serviços distintos',num(sv.length),'Vendidos no período','✦',C.purple)}
    ${kpiN('Serviço líder',esc(sv[0]?.[0]||'—'),sv[0]?brl(sv[0][1])+' · '+pct(sv[0][1]/s.fat):'','★',C.yellow)}
    ${kpiN('Categoria líder',esc(cat[0]?.[0]||'—'),cat[0]?brl(cat[0][1]):'','◈',C.blue)}
    ${kpiN('Catálogo',num(D.serv.length),'Serviços cadastrados com preço','≣',C.teal)}
  </div>
  <div class="grid g2">
    ${card('Top 10 serviços','Faturamento no período',cv('cSv','lg'))}
    ${card('Categorias','Faturamento e quantidade de OS',table(['Categoria',['OS',1],['Faturamento',1],['Ticket',1],['Participação',1]],cat.map(([c,v],i)=>{const q=s.os.filter(o=>o.cat===c).length;return `<tr><td><span class="dot" style="background:${PAL[i%11]}"></span>${esc(c)}</td><td class="n">${q}</td><td class="n">${brl(v)}</td><td class="n">${brl(v/q)}</td><td class="n" style="width:160px"><div style="display:flex;gap:8px;align-items:center;justify-content:flex-end">${pbar(v/s.fat,PAL[i%11])}<span>${pct(v/s.fat,0)}</span></div></td></tr>`})))}
  </div>
  ${card('Catálogo de serviços','Preço padrão de mão de obra e de peça (referência) · aba Servicos',`<div class="tools" style="margin-bottom:14px"><label class="search">⌕<input id="qSv" placeholder="Buscar serviço ou categoria…"></label></div><div id="svTbl"></div>`)}`;
  const top=sv.slice(0,10);
  chart('cSv',{type:'bar',data:{labels:top.map(x=>x[0].length>26?x[0].slice(0,25)+'…':x[0]),datasets:[{label:'Faturamento',data:top.map(x=>x[1]),backgroundColor:top.map((_,i)=>PAL[i%10]),maxBarThickness:22,borderRadius:8}]},options:{indexAxis:'y',maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:x=>' '+brl(x.raw)}}},scales:{x:yR,y:{grid:{display:false},border:{display:false}}}}});
  const draw=()=>{const q=document.getElementById('qSv').value.toLowerCase();document.getElementById('svTbl').innerHTML=table(['Código','Serviço','Categoria',['Mão de obra',1],['Peça (ref.)',1],'Tempo médio','Ativo',['Vendidos (total)',1],['Faturamento (total)',1]],D.serv.filter(r=>!q||(r[1]+' '+r[2]).toLowerCase().includes(q)).map(r=>{const os=OS.filter(o=>o.serv===r[1]);return `<tr><td class="muted">${esc(r[0])}</td><td><b>${esc(r[1])}</b></td><td>${tag(esc(r[2]||'—'),'t-n')}</td><td class="n">${brl(r[3])}</td><td class="n muted">${brl(r[4])}</td><td>${esc(r[5]||'—')}</td><td>${r[6]==='Sim'?tag('Sim','t-g'):tag(esc(r[6]||'—'),'t-n')}</td><td class="n">${os.length||'—'}</td><td class="n">${os.length?brl(sum(os.map(o=>o.tot))):'—'}</td></tr>`}),{h:'tall'})};
  document.getElementById('qSv').oninput=draw;draw();
}

/* ---------- 5. CLIENTES ---------- */
function vCli(el){
  /* cli: [nome,tel,cpf,email,obs,visitas,total,ticket,primeira,ultima,dias,status,veiculo,placa,retorno,ultContato,proxContato,rank] */
  const C2=D.cli,st=groupBy(C2,r=>r[11]||'—');const fatC=sum(C2.map(r=>r[6]));
  const top=[...C2].filter(r=>r[6]>0).sort((a,b)=>b[6]-a[6]).slice(0,10);
  const ret=[...C2].filter(r=>r[14]&&r[14]>=REF).sort((a,b)=>a[14].localeCompare(b[14])).slice(0,12);
  const fid=C2.filter(r=>r[5]>=2).length;
  el.innerHTML=`
  <div class="grid g5">
    ${kpiN('Clientes cadastrados',num(C2.length),(st['Sem visitas']||0)+' ainda sem visitas','☺',C.green)}
    ${kpiN('Ativos',num(st['Ativo']||0),'Vieram nos últimos 180 dias','●',C.blue)}
    ${kpiN('Em risco / inativos',num((st['Em risco']||0)+(st['Inativo']||0)),'Mais de 180 dias sem vir','!',C.orange)}
    ${kpiN('Recorrentes',num(fid),pct(fid/C2.length,0)+' voltaram 2+ vezes','↻',C.purple)}
    ${kpi('Faturamento dos clientes',fatC,'Ticket por cliente '+brl(fatC/(C2.filter(r=>r[5]>0).length||1)),'$',C.teal,'',1)}
  </div>
  <div class="grid g2">
    ${card('Top 10 por faturamento','Quem mais gastou na oficina',`<div class="list">${top.map((r,i)=>`<div class="li"><div class="ix" style="background:${PAL[i%10]}22;color:${PAL[i%10]}">${ini(r[0])}</div><div class="lt"><b>${esc(r[0])}</b><small>${r[5]} visita${r[5]>1?'s':''} · ${esc(r[12]||'—')}</small></div><div class="lv">${brl(r[6])}<small>última ${fd(r[9])}</small></div></div>`).join('')}</div>`)}
    ${card('Chamar para retorno','Retorno sugerido 180 dias após a última visita · próximos',`<div class="list">${ret.map(r=>{const dd=Math.round((new Date(r[14])-new Date(REF))/864e5);return `<div class="li"><div class="ix" style="background:${dd<=30?C.orange:C.blue}22;color:${dd<=30?C.orange:C.blue}">${dd}d</div><div class="lt"><b>${esc(r[0])}</b><small>${esc(r[12]||'—')} ${r[13]?'· '+esc(r[13]):''} ${r[1]?'· '+esc(r[1]):''}</small></div><div class="lv">${fd(r[14])}<small>${brl(r[6])} gastos</small></div></div>`}).join('')||'<div class="empty">Ninguém para chamar</div>'}</div>`)}
  </div>
  ${card('Base de clientes','CRM completo · clique no cabeçalho para ordenar',`<div class="tools" style="margin-bottom:14px"><label class="search">⌕<input id="qCli" placeholder="Buscar cliente, veículo ou placa…"></label><select class="sel" id="fSt"><option value="">Todos os status</option>${Object.keys(st).map(k=>`<option>${esc(k)}</option>`).join('')}</select></div><div id="cliTbl"></div>`)}`;
  const stc={Ativo:'t-g','Em risco':'t-o',Inativo:'t-r','Sem visitas':'t-n'};
  const draw=()=>{const q=document.getElementById('qCli').value.toLowerCase(),f=document.getElementById('fSt').value;
    document.getElementById('cliTbl').innerHTML=table(['Cliente','Telefone',['Visitas',1],['Total gasto',1],['Ticket',1],'Primeira','Última',['Dias sem vir',1],'Status','Último veículo','Placa','Retorno'],
      C2.filter(r=>(!f||r[11]===f)&&(!q||[r[0],r[12],r[13]].join(' ').toLowerCase().includes(q))).sort((a,b)=>b[6]-a[6]).map(r=>`<tr><td><b>${esc(r[0])}</b></td><td class="muted">${esc(r[1]||'—')}</td><td class="n">${r[5]}</td><td class="n" data-v="${r[6]}">${brl(r[6])}</td><td class="n" data-v="${r[7]||0}">${r[7]?brl(r[7]):'—'}</td><td data-v="${r[8]||''}">${fd(r[8])}</td><td data-v="${r[9]||''}">${fd(r[9])}</td><td class="n">${r[10]??'—'}</td><td>${tag(esc(r[11]||'—'),stc[r[11]]||'t-n')}</td><td class="muted">${esc(r[12]||'—')}</td><td>${esc(r[13]||'—')}</td><td data-v="${r[14]||''}">${fd(r[14])}</td></tr>`),{h:'tall',id:'tCli'});makeSortable('tCli')};
  document.getElementById('qCli').oninput=draw;document.getElementById('fSt').onchange=draw;draw();
}

/* ---------- 6. VEÍCULOS ---------- */
function vVeic(el){
  const by={};OS.forEach(o=>{if(!o.placa||/n[ãa]o informad/i.test(o.placa))return;const r=by[o.placa]||(by[o.placa]={p:o.placa,v:o.veic,c:o.cli,n:0,f:0,u:''});r.n++;r.f+=o.tot;if(o.d>r.u){r.u=o.d;r.v=o.veic;r.c=o.cli}});
  const arr=Object.values(by).sort((a,b)=>b.f-a.f);
  const MARCAS=['FIAT','VW','GM','CHEVROLET','FORD','HONDA','TOYOTA','HYUNDAI','RENAULT','NISSAN','PEUGEOT','CITROEN','KIA','JEEP','BYD','MITSUBISHI','MERCEDES'];
  const MOD={GOL:'VW',FOX:'VW',UP:'VW',VOYAGE:'VW',SPACEFOX:'VW',POLO:'VW',SAVEIRO:'VW',UNO:'FIAT',PALIO:'FIAT',SIENA:'FIAT',STRADA:'FIAT',FIORINO:'FIAT',MOBI:'FIAT',ARGO:'FIAT',CRONOS:'FIAT','500':'FIAT',CELTA:'GM',CORSA:'GM',ONIX:'GM',PRISMA:'GM',AGILE:'GM',S10:'GM',ASTRA:'GM',CRUZE:'GM',SPIN:'GM',COBALT:'GM',TRACKER:'GM',MONTANA:'GM',KA:'FORD',FIESTA:'FORD',ECOSPORT:'FORD',FOCUS:'FORD',RANGER:'FORD',VERONA:'FORD',FIT:'HONDA',CIVIC:'HONDA',CITY:'HONDA',HRV:'HONDA',COROLLA:'TOYOTA',ETIOS:'TOYOTA',HILUX:'TOYOTA',YARIS:'TOYOTA',I30:'HYUNDAI',HB20:'HYUNDAI',CRETA:'HYUNDAI',TUCSON:'HYUNDAI',SANDERO:'RENAULT',LOGAN:'RENAULT',KWID:'RENAULT',DUSTER:'RENAULT',CLIO:'RENAULT',VERSA:'NISSAN',MARCH:'NISSAN',KICKS:'NISSAN',SENTRA:'NISSAN','207PASSION':'PEUGEOT','207':'PEUGEOT','208':'PEUGEOT',C3:'CITROEN',SPORTAGE:'KIA',PICANTO:'KIA',CERATO:'KIA',RENEGADE:'JEEP',COMPASS:'JEEP',DOLPHIN:'BYD',GLA200FF:'MERCEDES',L200:'MITSUBISHI',PAJERO:'MITSUBISHI'};
  const marca=v=>{const w=String(v||'').toUpperCase().replace(/[^A-Z0-9 ]/g,' ').split(/\s+/);for(const x of w){if(MARCAS.includes(x))return x==='CHEVROLET'?'GM':x;}for(const x of w){if(MOD[x])return MOD[x]}return 'Outras'};
  const mk=sortObj(groupBy(arr,a=>marca(a.v)));
  el.innerHTML=`
  <div class="grid g4">
    ${kpiN('Veículos atendidos',num(arr.length),'Placas distintas nas OS','⛟',C.teal)}
    ${kpiN('Voltaram 2+ vezes',num(arr.filter(a=>a.n>1).length),pct(arr.filter(a=>a.n>1).length/arr.length,0)+' da frota','↻',C.purple)}
    ${kpi('Faturamento por veículo',sum(arr.map(a=>a.f))/arr.length,'Média por placa','$',C.blue)}
    ${kpiN('Marca mais atendida',mk[0][0],mk[0][1]+' veículos','◈',C.orange)}
  </div>
  <div class="grid g12">
    ${card('Marcas','Identificadas pelo modelo informado',cv('cMk','lg'))}
    ${card('Frota atendida','Ordenada por faturamento',`<div class="tools" style="margin-bottom:14px"><label class="search">⌕<input id="qV" placeholder="Buscar placa, modelo ou cliente…"></label></div><div id="vTbl"></div>`)}
  </div>`;
  chart('cMk',{type:'polarArea',data:{labels:mk.map(x=>x[0]),datasets:[{data:mk.map(x=>x[1]),backgroundColor:mk.map((_,i)=>PAL[i%11]+'bb'),borderWidth:0}]},options:{maintainAspectRatio:false,scales:{r:{grid:{color:'rgba(255,255,255,.06)'},ticks:{display:false},angleLines:{color:'rgba(255,255,255,.06)'}}},plugins:{legend:{position:'bottom'}}}});
  const draw=()=>{const q=document.getElementById('qV').value.toLowerCase();document.getElementById('vTbl').innerHTML=table(['Placa','Veículo','Marca','Cliente',['Visitas',1],['Faturamento',1],'Última visita'],arr.filter(a=>!q||[a.p,a.v,a.c].join(' ').toLowerCase().includes(q)).map(a=>`<tr><td><b>${esc(a.p)}</b></td><td>${esc(a.v)}</td><td>${tag(marca(a.v),'t-n')}</td><td class="muted">${esc(a.c)}</td><td class="n">${a.n}</td><td class="n" data-v="${a.f}">${brl(a.f)}</td><td data-v="${a.u}">${fd(a.u)}</td></tr>`),{h:'tall',id:'tV'});makeSortable('tV')};
  document.getElementById('qV').oninput=draw;draw();
}

/* ---------- 7. PEÇAS & NOTAS ---------- */
function vPecas(el){
  const n=NOTAS.filter(x=>inSel(x.m)),s=stats(SEL);const tot=sum(n.map(x=>x.tot)),nfs=new Set(n.map(x=>x.nf)).size;
  const fo=sortObj(groupBy(n,'forn','tot'));
  el.innerHTML=`
  <div class="grid g5">
    ${kpi('Compras de peças',tot,n.length+' itens lançados','⬡',C.mint)}
    ${kpiN('Notas fiscais',num(nfs),'NFs distintas no período','≣',C.blue)}
    ${kpiN('Fornecedores',num(fo.length),fo[0]?esc(fo[0][0])+' lidera':'—','⌂',C.purple)}
    ${kpi('Peças vendidas nas OS',s.pc,'Receita de peças no período','$',C.teal,'',1)}
    ${kpiN('Compras ÷ venda de peças',s.pc?pct(tot/s.pc,0):'—','Quanto do valor vendido foi comprado','%',C.orange)}
  </div>
  <div class="grid g21">
    ${card('Compras × venda de peças','Notas de compra contra a receita de peças das OS',cv('cNP'))}
    ${card('Fornecedores','Participação nas compras',cv('cFo'))}
  </div>
  ${card('Itens das notas','Lançados na aba NotasPecas',`<div class="tools" style="margin-bottom:14px"><label class="search">⌕<input id="qN" placeholder="Buscar peça, NF ou fornecedor…"></label><span class="muted" id="nCount"></span></div><div id="nTbl"></div>`)}`;
  const L=MONTHS.map(ml);
  chart('cNP',{type:'bar',data:{labels:L,datasets:[{label:'Compras (notas)',data:MONTHS.map(m=>sum(NOTAS.filter(x=>x.m===m).map(x=>x.tot))),backgroundColor:C.mint,maxBarThickness:34},{label:'Peças vendidas (OS)',data:MONTHS.map(m=>stats(m).pc),backgroundColor:'rgba(100,210,255,.4)',maxBarThickness:34}]},options:{maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{tooltip:tipR},scales:{y:yR,x:xG}}});
  chart('cFo',{type:'doughnut',data:{labels:fo.map(x=>x[0]),datasets:[{data:fo.map(x=>x[1]),backgroundColor:[C.mint,C.blue,C.purple,C.orange,C.gray,C.pink],borderWidth:0,spacing:3,borderRadius:6}]},options:{maintainAspectRatio:false,cutout:'68%',plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:x=>' '+x.label+': '+brl(x.raw)+' · '+pct(x.raw/tot)}}}}});
  let lim=150;const draw=()=>{const q=document.getElementById('qN').value.toLowerCase();const rows=n.filter(x=>!q||[x.peca,x.nf,x.forn].join(' ').toLowerCase().includes(q)).sort((a,b)=>b.d.localeCompare(a.d));
    document.getElementById('nCount').textContent=rows.length+' itens · '+brl(sum(rows.map(x=>x.tot)));
    document.getElementById('nTbl').innerHTML=table(['Data','NF','Fornecedor','Peça','OS',['Qtd',1],['Custo unit.',1],['Custo total',1],['Revenda sugerida',1]],rows.slice(0,lim).map(x=>`<tr><td>${fd(x.d)}</td><td class="muted">${esc(x.nf)}</td><td>${esc(x.forn)}</td><td class="w">${esc(x.peca)}</td><td>${esc(x.os||'—')}</td><td class="n">${x.q??'—'}</td><td class="n">${x.u!=null?brl(x.u,2):'—'}</td><td class="n"><b>${brl(x.tot,2)}</b></td><td class="n muted">${x.rev!=null?brl(x.rev,2):'—'}</td></tr>`),{h:'tall'})+(rows.length>lim?`<button class="more" id="mN">Mostrar mais ${Math.min(150,rows.length-lim)} de ${rows.length-lim}</button>`:'');
    const b=document.getElementById('mN');if(b)b.onclick=()=>{lim+=150;draw()}};
  document.getElementById('qN').oninput=()=>{lim=150;draw()};draw();
}

/* ---------- 8. DESPESAS ---------- */
function vDesp(el){
  const s=stats(SEL),ds=s.ds,cat=sortObj(groupBy(ds,'cat','v')),pago=sum(ds.filter(x=>x.pago==='Sim').map(x=>x.v)),ab=sum(s.aberto.map(x=>x.v)),sal=sum(ds.filter(x=>['Salários','Bônus'].includes(x.cat)).map(x=>x.v));
  el.innerHTML=`
  <div class="grid g5">
    ${kpi('Total de despesas',s.desp,ds.length+' lançamentos','↘',C.red)}
    ${kpi('Marcadas como pagas',pago,pct(pago/(s.desp||1),0)+' do período','✓',C.green,'',1)}
    ${kpi('Em aberto (todos os meses)',ab,s.aberto.length+' lançamentos a pagar','!',C.orange,'',1)}
    ${kpi('Mão de obra (salários + bônus)',sal,pct(sal/(s.fat||1))+' do faturamento','☺',C.purple,'',1)}
    ${kpiN('Maior categoria',esc(cat[0]?.[0]||'—'),cat[0]?brl(cat[0][1])+' · '+pct(cat[0][1]/s.desp,0):'','◈',C.blue)}
  </div>
  <div class="grid g2">
    ${card('Despesas por categoria','No período selecionado',cv('cDc','lg'))}
    ${card('Despesas × faturamento por mês','Quanto das receitas as despesas consomem',cv('cDm','lg'))}
  </div>
  ${card('Lançamentos de despesas','Aba Despesas',`<div class="tools" style="margin-bottom:14px"><label class="search">⌕<input id="qD" placeholder="Buscar descrição ou categoria…"></label><select class="sel" id="fP"><option value="">Todas</option><option>Sim</option><option>Não</option><option value="—">Não informado</option></select></div><div id="dTbl"></div>`)}`;
  chart('cDc',{type:'bar',data:{labels:cat.map(x=>x[0]),datasets:[{label:'Valor',data:cat.map(x=>x[1]),backgroundColor:cat.map((_,i)=>PAL[i%11]),maxBarThickness:24,borderRadius:8}]},options:{indexAxis:'y',maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:x=>' '+brl(x.raw)+' · '+pct(x.raw/s.desp)}}},scales:{x:yR,y:{grid:{display:false},border:{display:false}}}}});
  const T=MONTHS.map(m=>stats(m));
  chart('cDm',{data:{labels:MONTHS.map(ml),datasets:[{type:'bar',label:'Despesas',data:T.map(t=>t.desp),backgroundColor:'rgba(255,69,58,.7)',maxBarThickness:36,yAxisID:'y'},{type:'bar',label:'Faturamento',data:T.map(t=>t.fat),backgroundColor:'rgba(10,132,255,.35)',maxBarThickness:36,yAxisID:'y'},{type:'line',label:'Despesas ÷ faturamento',data:T.map(t=>t.desp/t.fat),borderColor:C.orange,pointRadius:4,pointBackgroundColor:'#05060a',pointBorderWidth:2,tension:.35,yAxisID:'y1'}]},options:{maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{tooltip:{callbacks:{label:x=>' '+x.dataset.label+': '+(x.dataset.yAxisID==='y1'?pct(x.raw):brl(x.raw))}}},scales:{y:yR,y1:{position:'right',grid:{display:false},border:{display:false},ticks:{callback:v=>pct(v,0)}},x:xG}}});
  const draw=()=>{const q=document.getElementById('qD').value.toLowerCase(),f=document.getElementById('fP').value;document.getElementById('dTbl').innerHTML=table(['Data','Descrição','Tipo','Categoria',['Valor',1],'Forma','Pago?'],ds.filter(x=>(!f||x.pago===f)&&(!q||(x.desc+' '+x.cat).toLowerCase().includes(q))).sort((a,b)=>b.d.localeCompare(a.d)||b.v-a.v).map(x=>`<tr><td data-v="${x.d}">${fd(x.d)}</td><td class="w">${esc(x.desc)}</td><td class="muted">${esc(x.tipo)}</td><td>${tag(esc(x.cat),'t-n')}</td><td class="n" data-v="${x.v}"><b>${brl(x.v,2)}</b></td><td class="muted">${esc(x.fp)}</td><td>${x.pago==='Sim'?tag('Pago','t-g'):x.pago==='Não'?tag('Em aberto','t-r'):tag('—','t-n')}</td></tr>`),{h:'tall',id:'tD'});makeSortable('tD')};
  document.getElementById('qD').oninput=draw;document.getElementById('fP').onchange=draw;draw();
}

/* ---------- 9. DRE ---------- */
let dreA=MONTHS[MONTHS.length-1],dreB=MONTHS[MONTHS.length-2];
function vDre(el){
  const opt=v=>MONTHS.map(m=>`<option value="${m}" ${m===v?'selected':''}>${mlong(m)}</option>`).join('');
  const A=stats(dreA),B=stats(dreB),cats=[...new Set(DESP.map(x=>x.cat))].sort();
  const ln=(t,a,b,cl='',inv,np)=>{const d=a-b;return `<tr class="${cl}"><td>${t}</td><td class="n">${brl(a)}</td><td class="n muted">${A.fat&&!np?pct(a/A.fat):''}</td><td class="n">${brl(b)}</td><td class="n muted">${B.fat&&!np?pct(b/B.fat):''}</td><td class="n ${d===0?'muted':(inv?d<0:d>0)?'pos':'neg'}">${brl(d)}</td><td class="n muted">${b?pct(d/Math.abs(b)):'—'}</td></tr>`};
  const ca=groupBy(A.ds,'cat','v'),cb=groupBy(B.ds,'cat','v');
  const TM=MONTHS.includes(REF.slice(0,7))?REF.slice(0,7):MONTHS[MONTHS.length-1],TOPEN=TM===REF.slice(0,7),TY=+TM.slice(0,4),TMO=+TM.slice(5,7),WD=TOPEN?workdaysUntil(TY,TMO,+REF.slice(8,10)):workdays(TY,TMO);
  const cur=stats(TM),tr=cur.imp/cur.fat,projImp=cur.proj*tr,projLiq=cur.proj-projImp-cur.desp,empate=cur.desp/(1-tr);
  const T=MONTHS.map(m=>stats(m));let acc=0;const accA=T.map(t=>acc+=t.liq);
  el.innerHTML=`
  <div class="grid g4">
    ${kpi('Resultado '+ml(dreA),A.liq,delta(A.liq,B.liq)+' vs '+ml(dreB),'∑',A.liq>=0?C.green:C.red)}
    ${kpiN('Margem líquida',pct(A.liq/A.fat),'Era '+pct(B.liq/B.fat)+' em '+ml(dreB),'%',C.blue)}
    ${kpi(TOPEN?'Lucro líquido projetado ('+ml(TM)+')':'Lucro líquido de '+ml(TM),projLiq,TOPEN?'Se mantiver o ritmo até o fim do mês':'Mês fechado','◔',C.purple)}
    ${kpi('Lucro acumulado 2026',accA[accA.length-1],PERL().replace(/^./,c=>c.toUpperCase()),'↗',C.teal)}
  </div>
  <div class="grid gdre">
    ${card('DRE comparativo','Escolha os dois meses',table(['Conta',['',1],['% rec.',1],['',1],['% rec.',1],['Diferença',1],['Var. %',1]],[
      `<tr class="hd"><td colspan="7"><div class="tools"><select class="sel" id="dA">${opt(dreA)}</select><span class="muted">comparado com</span><select class="sel" id="dB">${opt(dreB)}</select></div></td></tr>`,
      '<tr class="hd"><td colspan="7">Receitas</td></tr>',
      ln('Faturamento bruto (OS)',A.fat,B.fat,'st'),ln('(−) Impostos sobre a venda',A.imp,B.imp,'',1),
      `<tr><td>Carros / OS atendidos</td><td class="n">${A.car}</td><td></td><td class="n">${B.car}</td><td></td><td class="n">${A.car-B.car>=0?'+':''}${A.car-B.car}</td><td class="n muted">${pct(A.car/B.car-1)}</td></tr>`,
      ln('Ticket médio',A.ticket,B.ticket,'',0,1),
      '<tr class="hd"><td colspan="7">Custos operacionais (despesas)</td></tr>',
      ...cats.filter(c=>ca[c]||cb[c]).map(c=>ln(c,ca[c]||0,cb[c]||0,'',1)),
      ln('(=) Total de despesas',A.desp,B.desp,'st',1),
      '<tr class="hd"><td colspan="7">Resultado</td></tr>',
      ln('(=) Resultado do mês',A.liq,B.liq,'tot'),
      `<tr><td>Margem sobre faturamento</td><td class="n"><b>${pct(A.liq/A.fat)}</b></td><td></td><td class="n">${pct(B.liq/B.fat)}</td><td></td><td class="n">${pct(A.liq/A.fat-B.liq/B.fat)}</td><td></td></tr>`
    ]).replace('<th class="n"></th>',`<th class="n">${ml(dreA)}</th>`).replace('<th class="n"></th>',`<th class="n">${ml(dreB)}</th>`))}
    <div style="display:flex;flex-direction:column;gap:16px">
      ${card((TOPEN?'Tendência · ':'Fechamento · ')+mlong(TM),TOPEN?'Projeção pelos dias úteis (seg–sáb)':'Mês encerrado: valores realizados',table(['Indicador',['Valor',1],['% fat.',1]],[
        `<tr><td>${TOPEN?'Faturamento até hoje':'Faturamento do mês'}</td><td class="n">${brl(cur.fat,2)}</td><td></td></tr>`,
        `<tr><td>Dias úteis decorridos</td><td class="n">${WD} de ${workdays(TY,TMO)}</td><td></td></tr>`,
        `<tr><td>Média por dia útil</td><td class="n">${brl(cur.fat/WD,2)}</td><td></td></tr>`,
        `<tr class="st"><td>${TOPEN?'Faturamento projetado':'Faturamento final'}</td><td class="n">${brl(cur.proj,2)}</td><td class="n muted">100%</td></tr>`,
        `<tr><td>(−) Impostos ${TOPEN?'projetados':''}</td><td class="n">${brl(projImp,2)}</td><td class="n muted">${pct(tr)}</td></tr>`,
        `<tr><td>(−) Despesas do mês</td><td class="n">${brl(cur.desp,2)}</td><td class="n muted">${pct(cur.desp/cur.proj)}</td></tr>`,
        `<tr class="tot"><td>(=) Lucro líquido ${TOPEN?'projetado':'do mês'}</td><td class="n pos">${brl(projLiq,2)}</td><td class="n">${pct(projLiq/cur.proj)}</td></tr>`,
        `<tr><td>Faturamento para empatar</td><td class="n">${brl(empate,2)}</td><td class="n muted">${pct(empate/cur.proj)}</td></tr>`]))}
      ${card('Impostos','Parâmetros da aba DRE',`<div class="list"><div class="li"><div class="ix" style="background:${C.gray}22;color:${C.gray}">10%</div><div class="lt"><b>Alíquota anterior</b><small>Vigente a partir de ago/2026</small></div></div><div class="li"><div class="ix" style="background:${C.green}22;color:${C.green}">4%</div><div class="lt"><b>Nova alíquota</b><small>Vigente a partir de out/2026</small></div></div><div class="li"><div class="ix" style="background:${C.blue}22;color:${C.blue}">$</div><div class="lt"><b>Imposto pago informado</b><small>R$ 1.945 referente a ago/2026</small></div></div></div>`)}
    </div>
  </div>
  ${card('Lucro líquido mês a mês','Barras = lucro do mês · linha = lucro acumulado · pontilhado = margem',cv('cDreL','lg'))}`;
  document.getElementById('dA').onchange=e=>{dreA=e.target.value;vDre(el);animate(el)};document.getElementById('dB').onchange=e=>{dreB=e.target.value;vDre(el);animate(el)};
  chart('cDreL',{data:{labels:MONTHS.map(ml),datasets:[{type:'bar',label:'Lucro líquido',data:T.map(t=>t.liq),backgroundColor:T.map(t=>t.liq>=0?'rgba(48,209,88,.75)':'rgba(255,69,58,.75)'),maxBarThickness:40,yAxisID:'y'},{type:'line',label:'Acumulado',data:accA,borderColor:C.blue,backgroundColor:c=>grad(c,C.blue,340),fill:true,tension:.4,yAxisID:'y',pointRadius:4,pointBackgroundColor:'#05060a',pointBorderWidth:2},{type:'line',label:'Margem',data:T.map(t=>t.liq/t.fat),borderColor:C.orange,borderDash:[5,5],borderWidth:2,tension:.35,yAxisID:'y1'}]},options:{maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{tooltip:{callbacks:{label:x=>' '+x.dataset.label+': '+(x.dataset.yAxisID==='y1'?pct(x.raw):brl(x.raw))}}},scales:{y:yR,y1:{position:'right',grid:{display:false},border:{display:false},ticks:{callback:v=>pct(v,0)}},x:xG}}});
}

/* ---------- 10. FLUXO DE CAIXA ---------- */
let RES=.4,DIST=.5,SOC=3;
function vCaixa(el){
  const F=D.fluxo.filter(r=>r[1]||r[2]).map(r=>({m:r[0].slice(0,7),e:r[1],s:r[2],f:r[3],lo:r[4]}));
  let acc=0,exp=0;F.forEach(r=>{r.res=r.lo>0?r.lo*RES:0;r.livre=r.f-r.res;acc+=r.f;r.acc=acc;exp+=r.res;r.exp=exp;r.dist=r.livre*DIST;r.soc=r.dist/SOC});
  const last=F[F.length-1],T={e:sum(F.map(r=>r.e)),s:sum(F.map(r=>r.s)),f:sum(F.map(r=>r.f)),lo:sum(F.map(r=>r.lo)),res:exp,livre:sum(F.map(r=>r.livre)),dist:sum(F.map(r=>r.dist))};
  const ok=acc>0;
  el.innerHTML=`
  <div class="grid g4">
    <div class="card kpi hover"><div class="lbl"><span class="ic" style="background:${ok?C.green:C.red}22;color:${ok?C.green:C.red}">●</span>Semáforo do caixa</div><div class="val" style="color:${ok?C.green:C.red}">${ok?'Saudável':'Atenção'}</div><div class="sub">Fluxo de ${ml(last.m)}: ${brl(last.f)}</div></div>
    ${kpi('Caixa acumulado (ano)',acc,'Entradas − saídas de todos os meses','⇅',C.blue)}
    ${kpi('Reserva p/ expansão',exp,'Guardado pela regra de '+pct(RES,0),'⌂',C.purple)}
    ${kpi('Por sócio no ano',T.dist/SOC,brl(T.dist)+' distribuíveis ÷ '+SOC,'☺',C.teal)}
  </div>
  <div class="card" style="margin-bottom:16px"><div class="tools" style="gap:28px">
    <label class="tools"><span class="muted">% de reserva do lucro</span><input type="range" id="rRes" min="0" max="100" step="5" value="${RES*100}"><b id="vRes">${pct(RES,0)}</b></label>
    <label class="tools"><span class="muted">% do caixa livre distribuído</span><input type="range" id="rDist" min="0" max="100" step="5" value="${DIST*100}"><b id="vDist">${pct(DIST,0)}</b></label>
    <label class="tools"><span class="muted">Nº de sócios</span><input class="num" type="number" id="nSoc" min="1" max="10" value="${SOC}"></label>
  </div><div class="note" style="margin-top:10px">A reserva de expansão sai primeiro e nunca é distribuída. Ela guarda um % do lucro líquido operacional (lucro bruto das OS − despesas) de cada mês positivo. Do caixa livre que sobra, uma parte é dividida entre os sócios.</div></div>
  <div class="grid g2">
    ${card('Caixa acumulado','Fluxo do mês e saldo acumulado',cv('cFx','lg'))}
    ${card('Expansão × distribuição','Para onde vai o caixa de cada mês',cv('cEx','lg'))}
  </div>
  ${card('Fluxo de caixa mensal','Entradas das OS, saídas das despesas',table(['Mês',['Entradas (OS)',1],['Saídas (despesas)',1],['Fluxo do mês',1],['Lucro líq. oper.',1],['Reserva',1],['Caixa livre',1],['Distribuível',1],['Por sócio',1],['Caixa acumulado',1],'Status'],
    F.map(r=>`<tr><td><b>${mlong(r.m)}</b></td><td class="n">${brl(r.e,2)}</td><td class="n">${brl(r.s,2)}</td><td class="n ${r.f<0?'neg':'pos'}">${brl(r.f,2)}</td><td class="n ${r.lo<0?'neg':''}">${brl(r.lo,2)}</td><td class="n">${brl(r.res,2)}</td><td class="n">${brl(r.livre,2)}</td><td class="n">${brl(r.dist,2)}</td><td class="n">${brl(r.soc,2)}</td><td class="n"><b>${brl(r.acc,2)}</b></td><td>${r.acc>0?tag('Saudável','t-g'):tag('Atenção','t-r')}</td></tr>`).concat([`<tr class="tot"><td>Total</td><td class="n">${brl(T.e,2)}</td><td class="n">${brl(T.s,2)}</td><td class="n">${brl(T.f,2)}</td><td class="n">${brl(T.lo,2)}</td><td class="n">${brl(T.res,2)}</td><td class="n">${brl(T.livre,2)}</td><td class="n">${brl(T.dist,2)}</td><td class="n">${brl(T.dist/SOC,2)}</td><td class="n">${brl(acc,2)}</td><td></td></tr>`])))}`;
  const L=F.map(r=>ml(r.m));
  chart('cFx',{data:{labels:L,datasets:[{type:'line',label:'Caixa acumulado',data:F.map(r=>r.acc),borderColor:C.green,backgroundColor:c=>grad(c,C.green,340),fill:true,tension:.4,pointRadius:4,pointBackgroundColor:'#05060a',pointBorderWidth:2},{type:'bar',label:'Fluxo do mês',data:F.map(r=>r.f),backgroundColor:'rgba(10,132,255,.6)',maxBarThickness:34}]},options:{maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{tooltip:tipR},scales:{y:yR,x:xG}}});
  chart('cEx',{type:'bar',data:{labels:L,datasets:[{label:'Reserva expansão',data:F.map(r=>r.res),backgroundColor:C.purple,stack:'a',maxBarThickness:38},{label:'Distribuível sócios',data:F.map(r=>r.dist),backgroundColor:C.teal,stack:'a',maxBarThickness:38},{label:'Retido no caixa',data:F.map(r=>r.livre-r.dist),backgroundColor:'rgba(142,142,147,.45)',stack:'a',maxBarThickness:38}]},options:{maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{tooltip:tipR},scales:{y:{...yR,stacked:true},x:{...xG,stacked:true}}}});
  const re=()=>{vCaixa(el);animate(el)};
  document.getElementById('rRes').oninput=e=>{RES=e.target.value/100;re()};
  document.getElementById('rDist').oninput=e=>{DIST=e.target.value/100;re()};
  document.getElementById('nSoc').onchange=e=>{SOC=Math.max(1,+e.target.value||1);re()};
}

/* ---------- 11. 4º TRIMESTRE 2026 ---------- */
function vTri(el){
  const ms=['2026-10','2026-11','2026-12'],metas=ms.map(m=>metasPortal[m]||0),dias=ms.map(m=>workdays(+m.slice(0,4),+m.slice(5,7)));
  const real=ms.map(m=>stats(m)),totM=sum(metas),totR=sum(real.map(r=>r.fat));
  const t3=['2026-07','2026-08','2026-09'].map(m=>stats(m));
  if(!totM){el.innerHTML=card('Metas do 4º trimestre','Ainda não cadastradas','<div class="note">Cadastre a meta de faturamento de outubro, novembro e dezembro no portal (Configurações → Metas de Vendas). Elas aparecem aqui sozinhas, comparadas com as OS faturadas.</div>');return}
  el.innerHTML=`
  <div class="grid g4">
    ${kpi('Meta do 4º trimestre',totM,'Out + Nov + Dez','◎',C.pink)}
    ${kpi('Realizado até agora',totR,pct(totR/totM)+' da meta do trimestre','✓',C.green)}
    ${kpi('Falta para a meta',totM-totR,'Até 31 de dezembro','◔',C.orange)}
    ${kpiN('Crescimento vs 3T/26',pct(totM/sum(t3.map(t=>t.fat))-1),'Meta do 4T contra o realizado do 3T','↗',C.blue)}
  </div>
  <div class="grid g3">${ms.map((m,i)=>`<div class="card hover"><div class="ct"><div><h3>${mlong(m)}</h3><p>${dias[i]} dias de operação · meta de ${brl(metas[i]/dias[i])}/dia</p></div>${real[i].fat?tag(pct(real[i].fat/metas[i],0),real[i].fat>=metas[i]?'t-g':'t-o'):tag('A começar','t-n')}</div><div style="display:flex;justify-content:center">${ring('Faturamento',real[i].fat,metas[i],brlk,[C.pink,C.purple,C.blue][i])}</div><div class="ms" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">${[['Carros',real[i].car||'—'],['Ticket',real[i].car?brl(real[i].ticket):'—'],['Falta',brl(Math.max(metas[i]-real[i].fat,0))],['Projeção',real[i].fat?brl(real[i].proj):'—']].map(x=>`<div style="background:rgba(255,255,255,.04);border-radius:12px;padding:10px"><small class="muted" style="font-size:11px">${x[0]}</small><div style="font-weight:600;font-variant-numeric:tabular-nums">${x[1]}</div></div>`).join('')}</div></div>`).join('')}</div>
  <div class="grid g2">
    ${card('Meta × realizado','4º trimestre de 2026',cv('cT4'))}
    ${card('Base de comparação · 3º trimestre','Realizado de julho a setembro',table(['Indicador',['Jul/26',1],['Ago/26',1],['Set/26',1],['Total 3T',1]],[
      `<tr><td>Faturamento</td>${t3.map(t=>`<td class="n">${brl(t.fat)}</td>`).join('')}<td class="n"><b>${brl(sum(t3.map(t=>t.fat)))}</b></td></tr>`,
      `<tr><td>Carros atendidos</td>${t3.map(t=>`<td class="n">${t.car}</td>`).join('')}<td class="n"><b>${sum(t3.map(t=>t.car))}</b></td></tr>`,
      `<tr><td>Ticket médio</td>${t3.map(t=>`<td class="n">${brl(t.ticket)}</td>`).join('')}<td class="n"><b>${brl(sum(t3.map(t=>t.fat))/sum(t3.map(t=>t.car)))}</b></td></tr>`,
      `<tr><td>Meta do mês equivalente no 4T</td>${metas.map(v=>`<td class="n muted">${brl(v)}</td>`).join('')}<td class="n muted">${brl(totM)}</td></tr>`])+'<div class="note">Metas do 4T vêm do portal (Metas de Vendas). O realizado é puxado das OS lançadas. Dias de operação não descontam feriados.</div>')}
  </div>`;
  chart('cT4',{type:'bar',data:{labels:ms.map(ml),datasets:[{label:'Meta',data:metas,backgroundColor:'rgba(255,255,255,.1)',borderColor:'rgba(255,255,255,.3)',borderWidth:1,maxBarThickness:60,grouped:false,order:2},{label:'Realizado',data:real.map(r=>r.fat),backgroundColor:C.pink,maxBarThickness:36,grouped:false,order:1},{label:'Projeção',data:real.map(r=>r.fat?r.proj:null),backgroundColor:'rgba(255,55,95,.3)',maxBarThickness:36,grouped:false,order:1}]},options:{maintainAspectRatio:false,plugins:{tooltip:tipR},scales:{y:yR,x:xG}}});
}

/* ---------- 11b. METAS × REALIZADO (metas cadastradas no portal) ---------- */
function vMetasReal(el){
  const ks=Object.keys(metasPortal).filter(k=>metasPortal[k]>0).sort();
  if(!ks.length){el.innerHTML=card('Metas × realizado','Nenhuma meta mensal cadastrada','<div class="note">Cadastre a meta de faturamento de cada mês no portal (Configurações → Metas de Vendas). Ela aparece aqui sozinha, comparada com as OS faturadas.</div>');return}
  const hojeM=REF.slice(0,7);
  const rows=ks.map(k=>{const st=stats(k),meta=metasPortal[k];return {k,meta,fat:st.fat,car:st.car,tk:st.ticket,p:st.fat/meta}});
  const stt=r=>{if(r.p>=1)return ['Meta batida','t-g'];if(r.k>hojeM)return r.fat>0?['Em andamento','t-b']:['A começar','t-n'];if(r.k===hojeM)return ['Em andamento','t-b'];return r.p>=.95?['Atenção','t-o']:['Abaixo da meta','t-r']};
  const fechados=rows.filter(r=>r.k<hojeM),bateu=fechados.filter(r=>r.p>=1).length;
  const totMeta=sum(rows.map(r=>r.meta)),totReal=sum(rows.map(r=>r.fat)),atual=rows.find(r=>r.k===hojeM);
  el.innerHTML=`
  <div class="grid g4">
    ${kpi('Meta acumulada',totMeta,rows.length+' meses com meta · '+ml(ks[0])+' a '+ml(ks[ks.length-1]),'◎',C.orange)}
    ${kpi('Realizado nesses meses',totReal,pct(totReal/totMeta)+' da meta','✓',C.green)}
    ${kpiN('Meses com meta batida',fechados.length?bateu+' de '+fechados.length:'—','Entre os meses já fechados','★',C.gold)}
    ${atual?kpi('Mês atual',atual.fat,pct(atual.p,0)+' de '+brl(atual.meta),'◔',C.blue):kpiN('Mês atual','—','Sem meta cadastrada para este mês','◔',C.blue)}
  </div>
  ${card('Meta × realizado por mês','Barra clara = meta · barra colorida = realizado (verde quando bate a meta)',cv('cMR','lg'))}
  <div style="height:16px"></div>
  ${card('Mês a mês','Meta cadastrada no portal contra as OS faturadas · atualiza a cada lançamento',table(['Mês',['Meta',1],['Realizado',1],['%',1],['Falta',1],['Carros',1],['Ticket',1],'Situação'],rows.map(r=>{const t=stt(r);return `<tr><td><b>${ml(r.k)}</b></td><td class="n">${brl(r.meta)}</td><td class="n">${r.fat?brl(r.fat):'—'}</td><td class="n">${r.fat?pct(r.p,0):'—'}</td><td class="n muted">${r.fat&&r.p<1?brl(r.meta-r.fat):'—'}</td><td class="n">${r.car||'—'}</td><td class="n">${r.car?brl(r.tk):'—'}</td><td>${tag(t[0],t[1])}</td></tr>`}).concat([`<tr class="tot"><td>Total</td><td class="n">${brl(totMeta)}</td><td class="n">${totReal?brl(totReal):'—'}</td><td class="n">${totReal?pct(totReal/totMeta,0):'—'}</td><td class="n"></td><td class="n">${sum(rows.map(r=>r.car))||'—'}</td><td class="n"></td><td></td></tr>`]),{h:'tall'})+'<div class="note">As metas vêm do módulo Metas de Vendas do portal: alterar uma meta lá muda esta tela na hora. O realizado é a soma das OS faturadas (mesma base das outras telas). Faixa de atenção: até 5% abaixo da meta.</div>')}`;
  chart('cMR',{type:'bar',data:{labels:ks.map(ml),datasets:[{label:'Meta',data:rows.map(r=>r.meta),backgroundColor:'rgba(255,255,255,.1)',borderColor:'rgba(255,255,255,.3)',borderWidth:1,maxBarThickness:34,grouped:false,order:2},{label:'Realizado',data:rows.map(r=>r.fat||null),backgroundColor:rows.map(r=>r.p>=1?C.green:C.gold),maxBarThickness:20,grouped:false,order:1}]},options:{maintainAspectRatio:false,plugins:{tooltip:tipR},scales:{y:yR,x:xG}}});
}

/* ---------- 12. ORÇAMENTO 2027 ---------- */
const M27=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map(m=>m+'/27');
const rowOf=(arr,lbl)=>arr.find(r=>String(r[0]).trim().startsWith(lbl.trim()))||Array(16).fill(0);
function vOrc(el){
  const meta=rowOf(D.prem27Mes,'Meta oficial').slice(1,13),orig=rowOf(D.prem27Mes,'Meta original').slice(1,13),tk=rowOf(D.prem27Mes,'Ticket').slice(1,13),dias=rowOf(D.prem27Mes,'Dias de').slice(1,13);
  const ebit=rowOf(D.dre27,'(=) EBITDA').slice(1,13),pec=rowOf(D.dre27,'   Receita de peças').slice(1,13),ser=rowOf(D.dre27,'   Receita de serviços').slice(1,13);
  const car=rowOf(D.metas27,'Quantidade necessária').slice(1,13);
  const tot=sum(meta),eb=sum(ebit),cmv=-sum(rowOf(D.dre27,'(-) CMV').slice(1,13)),folha=-sum(rowOf(D.dre27,'(-) Folha').slice(1,13));
  el.innerHTML=`
  <div class="grid g4">
    ${kpi('Meta anual 2027',tot,'Média mensal '+brl(tot/12),'◆',C.purple)}
    ${kpi('EBITDA orçado',eb,'Margem de '+pct(eb/tot),'↗',C.green)}
    ${kpiN('Carros no ano',num(sum(car)),num(sum(car)/300,1)+' por dia de operação','⛟',C.teal)}
    ${kpiN('Ticket médio orçado',brl(tot/sum(car)),'De R$ 1.750 em jan a R$ 2.100 em dez','◈',C.blue)}
  </div>
  <div class="grid g4">
    ${kpiN('CMV orçado',pct(cmv/tot),brl(cmv)+' · meta ~25,5%','⬡',C.orange)}
    ${kpiN('Folha orçada',pct(folha/tot),brl(folha)+' · máximo 25%','☺',C.pink)}
    ${kpi('Receita de peças',sum(pec),'40% do faturamento','⚙',C.indigo,'',1)}
    ${kpi('Receita de serviços',sum(ser),'60% do faturamento','⚒',C.mint,'',1)}
  </div>
  <div class="grid g21">
    ${card('Faturamento orçado mês a mês','Meta oficial, meta original e EBITDA',cv('cO1','lg'))}
    ${card('Peças × serviços','Composição do faturamento anual',cv('cO2','lg'))}
  </div>
  <div class="grid g2">
    ${card('Premissas gerais','Aba Premissas2027 · editáveis na planilha',table(['Premissa',['Valor',1],'Observação'],D.prem.filter(r=>r[0]).map(r=>`<tr><td>${esc(r[0])}</td><td class="n"><b>${typeof r[1]==='number'&&r[1]<=1&&!/qtd|Dias/.test(r[0])?pct(r[1],1):typeof r[1]==='number'&&r[1]>1000?brl(r[1]):esc(r[1])}</b></td><td class="muted" style="white-space:normal;min-width:200px">${esc(r[2]||'')}</td></tr>`)))}
    ${card('Feriados 2027','Descontados dos dias de operação (seg–sáb)',`<div class="list">${D.feriados.filter(r=>r[0]).map(r=>{const d=new Date(r[1]+'T12:00');const wd=['dom','seg','ter','qua','qui','sex','sáb'][d.getDay()];return `<div class="li"><div class="ix" style="background:${d.getDay()===0?C.gray:C.pink}22;color:${d.getDay()===0?C.gray:C.pink}">${r[1].slice(8,10)}</div><div class="lt"><b>${esc(r[0])}</b><small>${fd(r[1])} · ${wd}</small></div></div>`}).join('')}</div>`)}
  </div>
  ${card('Despesas operacionais orçadas','R$ por mês · aba Premissas2027',table(['Conta',...M27.map(m=>[m,1]),['Total',1]],D.prem27Desp.map((r,i)=>`<tr class="${i===D.prem27Desp.length-1?'tot':''}"><td>${esc(r[0])}</td>${r.slice(1,14).map(v=>`<td class="n ${!v?'muted':''}">${v?num(v):'—'}</td>`).join('')}</tr>`)))}`;
  chart('cO1',{data:{labels:M27,datasets:[{type:'bar',label:'Meta oficial',data:meta,backgroundColor:c=>grad(c,C.purple,340),borderColor:C.purple,borderWidth:{top:2},maxBarThickness:36},{type:'line',label:'Meta original',data:orig,borderColor:'rgba(255,255,255,.5)',borderDash:[5,5],borderWidth:1.6,tension:.3},{type:'line',label:'EBITDA',data:ebit,borderColor:C.green,tension:.4,pointRadius:3.5,pointBackgroundColor:'#05060a',pointBorderWidth:2}]},options:{maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{tooltip:tipR},scales:{y:yR,x:xG}}});
  chart('cO2',{type:'doughnut',data:{labels:['Peças / produtos','Serviços / mão de obra'],datasets:[{data:[sum(pec),sum(ser)],backgroundColor:[C.indigo,C.mint],borderWidth:0,spacing:4,borderRadius:8}]},options:{maintainAspectRatio:false,cutout:'70%',plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:x=>' '+x.label+': '+brl(x.raw)}}}}});
}

/* ---------- 13. DRE 2027 ---------- */
function vDre27(el){
  const strong=/^\(=\)|^FATURAMENTO/;
  const fat=rowOf(D.dre27,'FATURAMENTO').slice(1,13),eb=rowOf(D.dre27,'(=) EBITDA').slice(1,13),acc=rowOf(D.dre27,'EBITDA acumulado').slice(1,13),pe=rowOf(D.dre27ind,'Ponto de equilíbrio').slice(1,13);
  el.innerHTML=`
  <div class="grid g4">
    ${kpi('Faturamento bruto',sum(fat),'Orçado 2027','$',C.blue)}
    ${kpi('Lucro bruto',rowOf(D.dre27,'(=) LUCRO BRUTO')[13],'Margem bruta '+pct(rowOf(D.dre27,'(=) LUCRO BRUTO')[14]),'↗',C.teal)}
    ${kpi('EBITDA',sum(eb),'Margem '+pct(sum(eb)/sum(fat)),'∑',C.green)}
    ${kpi('Ponto de equilíbrio anual',sum(pe),'Faturamento mínimo para empatar','⚖',C.orange)}
  </div>
  <div class="grid g21">
    ${card('EBITDA orçado','Mensal e acumulado',cv('cE1','lg'))}
    ${card('Faturamento × ponto de equilíbrio','Folga mensal sobre o mínimo',cv('cE2','lg'))}
  </div>
  ${card('Demonstração do resultado orçado','Deduções entre parênteses · % sobre o faturamento bruto',table(['Conta',...M27.map(m=>[m,1]),['Total',1],['% fat.',1]],D.dre27.filter(r=>r[0]).map(r=>{const s=strong.test(String(r[0]).trim());const ac=/acumulado/.test(r[0]);return `<tr class="${/EBITDA \//.test(r[0])?'tot':s?'st':''}"><td>${esc(String(r[0]).trim())}</td>${r.slice(1,14).map(v=>`<td class="n ${v<0?'muted':''}">${v==null?'':v<0?'('+num(-v)+')':num(v)}</td>`).join('')}<td class="n muted">${ac||r[14]==null?'':pct(r[14],0)}</td></tr>`}),{h:'tall'}))}
  <div class="grid g2" style="margin-top:16px">
    ${card('Indicadores de eficiência','Margens e % sobre o faturamento',table(['Indicador',...M27.map(m=>[m,1]),['Ano',1],['Meta',1]],D.dre27ind.filter(r=>r[0]).map(r=>`<tr><td>${esc(r[0])}</td>${r.slice(1,15).map(v=>`<td class="n">${v==null?'':typeof v==='string'?(v.includes('OK')?tag('OK','t-g'):tag(esc(v),'t-r')):v>1000?num(v):pct(v,0)}</td>`).join('')}</tr>`)),'span2')}
  </div>
  ${card('Visão trimestral 2027','Consolidação orçada por trimestre',table(['Indicador',['1T',1],['2T',1],['3T',1],['4T',1],['Total',1]],D.tri27.filter(r=>r[0]).map(r=>`<tr class="${/EBITDA \(R/.test(r[0])?'tot':''}"><td>${esc(r[0])}</td>${r.slice(1,6).map(v=>`<td class="n">${v==null?'':typeof v==='string'?esc(v):Math.abs(v)<5?pct(v,0):Math.abs(v)<3000&&!/Faturamento|Receita|Impostos|CMV \(|Folha de|Demais|EBITDA \(/.test(r[0])?num(v,0):(v<0?'('+num(-v)+')':num(v))}</td>`).join('')}</tr>`)))}`;
  chart('cE1',{data:{labels:M27,datasets:[{type:'bar',label:'EBITDA do mês',data:eb,backgroundColor:c=>grad(c,C.green,340),borderColor:C.green,borderWidth:{top:2},maxBarThickness:34,yAxisID:'y'},{type:'line',label:'Acumulado',data:acc,borderColor:C.blue,tension:.4,pointRadius:3,pointBackgroundColor:'#05060a',pointBorderWidth:2,yAxisID:'y1'}]},options:{maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{tooltip:tipR},scales:{y:yR,y1:{...yR,position:'right',grid:{display:false}},x:xG}}});
  chart('cE2',{type:'line',data:{labels:M27,datasets:[{label:'Faturamento',data:fat,borderColor:C.blue,backgroundColor:c=>grad(c,C.blue,340),fill:'+1',tension:.4},{label:'Ponto de equilíbrio',data:pe,borderColor:C.orange,borderDash:[6,5],tension:.3}]},options:{maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{tooltip:tipR},scales:{y:{...yR,beginAtZero:true},x:xG}}});
}

/* ---------- 14. METAS & OPERACIONAL ---------- */
function vMetas(el){
  const g=l=>rowOf(D.metas27,l).slice(1,13);
  const ec=g('1. Efeito MAIS'),et=g('2. Efeito MAIOR');
  const O=D.oper27.filter(r=>r[0]);
  el.innerHTML=`
  <div class="grid g4">
    ${kpiN('Carros por dia (média)',num(rowOf(D.metas27,'Carros por dia')[13],2),'De 2,7 em jan a 4,0 em nov','⛟',C.teal)}
    ${kpiN('Carros por semana',num(rowOf(D.metas27,'Carros por semana')[13],1),'Média de 2027','▦',C.blue)}
    ${kpi('Meta diária média',rowOf(D.metas27,'Meta de faturamento diária')[13],'Por dia de operação','◔',C.orange)}
    ${kpiN('Crescimento vs 2026',pct(rowOf(D.metas27,'Crescimento vs')[13]),'Total 2027 vs média de 2026','↗',C.green)}
  </div>
  <div class="grid g2">
    ${card('Volume de carros e ticket','Carros necessários e ticket meta por mês',cv('cM1','lg'))}
    ${card('De onde vem o crescimento','Comparado com jan/27: mais carros × maior ticket',cv('cM2','lg'))}
  </div>
  ${card('Metas de volume, diárias e semanais','Aba Metas2027',table(['Indicador',...M27.map(m=>[m,1]),['Total',1]],D.metas27.filter(r=>r[0]).map(r=>{const isP=/%/.test(r[0])&&!/R\$/.test(r[0]);const isN=/Quantidade|Dias|Semanas|Carros por/.test(r[0]);return `<tr><td class="w">${esc(r[0])}</td>${r.slice(1,14).map(v=>`<td class="n">${v==null?'':isP?pct(v,0):isN?num(v,isN&&/por|Semanas/.test(r[0])?2:0):num(v)}</td>`).join('')}</tr>`}),{h:'tall'}))}
  <div style="height:16px"></div>
  ${card('Indicadores operacionais orçados','Produtividade, volume e eficiência comercial · aba Operacional2027',table(['Mês',['Carros',1],['Ticket',1],['Fat./carro',1],['Fat./mecânico',1],['Carros/mec.',1],['MO/mecânico',1],['Peças',1],['Serviços',1],['Retrabalho',1],['Carros/mec./dia',1],['Fat. diário',1],['Fat. semanal',1]],O.map((r,i)=>`<tr class="${i===O.length-1?'tot':''}"><td><b>${esc(r[0])}</b></td>${[1,3,5,7,9,11,13,15,17,19,21,23].map(j=>{const v=r[j];return `<td class="n">${v==null?'—':j===17?pct(v,0):[9,19].includes(j)?num(v,2):j===1?num(v):num(v)}</td>`}).join('')}</tr>`))+'<div class="note">O realizado de 2027 entra pela aba RealxOrcado2027 conforme os meses forem lançados.</div>')}`;
  chart('cM1',{data:{labels:M27,datasets:[{type:'bar',label:'Carros',data:g('Quantidade necessária'),backgroundColor:c=>grad(c,C.teal,340),borderColor:C.teal,borderWidth:{top:2},maxBarThickness:32,yAxisID:'y'},{type:'line',label:'Ticket meta',data:g('Ticket médio meta'),borderColor:C.purple,tension:.35,pointRadius:3,pointBackgroundColor:'#05060a',pointBorderWidth:2,yAxisID:'y1'}]},options:{maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{tooltip:{callbacks:{label:x=>' '+x.dataset.label+': '+(x.dataset.yAxisID==='y1'?brl(x.raw):x.raw)}}},scales:{y:{grid:{color:'rgba(255,255,255,.05)'},border:{display:false}},y1:{position:'right',grid:{display:false},border:{display:false},ticks:{callback:v=>'R$ '+v}},x:xG}}});
  chart('cM2',{type:'bar',data:{labels:M27,datasets:[{label:'Mais carros',data:ec,backgroundColor:C.teal,stack:'a',maxBarThickness:32},{label:'Maior ticket',data:et,backgroundColor:C.purple,stack:'a',maxBarThickness:32}]},options:{maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{tooltip:tipR},scales:{y:{...yR,stacked:true},x:{...xG,stacked:true}}}});
}

/* ---------- 15. PLANO DE AÇÃO ---------- */
function vPlano(el){
  const steps=['Meta','Execução','Realizado','Desvio','Causa','Plano de ação','Correção'];
  el.innerHTML=`
  <div class="card" style="margin-bottom:16px"><div class="ct"><div><h3>Gestão de desvios</h3><p>Como cada indicador fora da meta vira ação</p></div></div>
    <div class="flow">${steps.map((s,i)=>`<span style="border-color:${PAL[i]}55;background:${PAL[i]}14">${s}</span>${i<steps.length-1?'<i>→</i>':''}`).join('')}</div>
    <div class="grid g3" style="margin:18px 0 0">
      <div class="alert"><span class="ai" style="background:${C.green}22;color:${C.green}">●</span><span><b>Verde</b> — dentro ou acima da meta</span></div>
      <div class="alert"><span class="ai" style="background:${C.orange}22;color:${C.orange}">●</span><span><b>Amarelo</b> — desvio desfavorável de até 5%</span></div>
      <div class="alert"><span class="ai" style="background:${C.red}22;color:${C.red}">●</span><span><b>Vermelho</b> — desvio acima de 5%: registrar plano de ação</span></div>
    </div>
    <div class="note">Ainda não há realizado de 2027 lançado. Quando houver, o acompanhamento Real × Orçado e os alertas do mês passam a ser preenchidos na planilha.</div>
  </div>
  <div class="grid g3">${D.acoes.filter(r=>r[0]).map((r,i)=>`<div class="card hover lever"><div class="ln" style="color:${PAL[i%11]}">Alavanca ${r[0]}</div><h4>${esc(r[1])}</h4><dl><dt>Sintoma</dt><dd>${esc(r[2])}</dd><dt>Causa</dt><dd>${esc(r[3])}</dd><dt>Ação</dt><dd style="color:var(--text)">${esc(r[4])}</dd><dt>Mede</dt><dd>${tag(esc(r[5]),'t-b')}</dd></dl></div>`).join('')}</div>`;
}

const RENDER={geral:vGeral,os:vOS,mec:vMec,serv:vServ,cli:vCli,veic:vVeic,pecas:vPecas,desp:vDesp,dre:vDre,caixa:vCaixa,tri:vTri,metasreal:vMetasReal,orc:vOrc,dre27:vDre27,metas:vMetas,plano:vPlano};

/* ================= NAV / SHELL ================= */
const navs=document.getElementById('navs'),views=document.getElementById('views');
let lastG='';navs.innerHTML=VIEWS.map(v=>{const h=v.g!==lastG?`<div class="grp">${v.g}</div>`:'';lastG=v.g;return h+`<button class="nav" data-v="${v.id}"><span class="ni" style="background:${({'Operação':'linear-gradient(145deg,#ffd43a,#f8c208);color:#0a1428','Financeiro':'linear-gradient(145deg,#3aa0ff,#1a6fd0)','Planejamento':'linear-gradient(145deg,#1d3a6b,#132a52);box-shadow:inset 0 0 0 1px rgba(248,194,8,.45);color:#f8c208'})[v.g]}">${v.ic}</span>${v.t}</button>`}).join('');
views.innerHTML=VIEWS.map(v=>`<section class="view" id="v-${v.id}"></section>`).join('');
const mseg=document.getElementById('mseg');
mseg.innerHTML='<span class="thumb"></span>'+MONTHS.map(m=>`<button data-m="${m}">${MN[+m.slice(5,7)-1]}</button>`).join('')+'<button data-m="all">Todos</button>';
function moveThumb(){const b=mseg.querySelector('button.on'),t=mseg.querySelector('.thumb');if(b){t.style.left=b.offsetLeft+'px';t.style.width=b.offsetWidth+'px'}}
function show(id){
  CUR=id;const v=VIEWS.find(x=>x.id===id);
  document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('on',n.dataset.v===id));
  document.querySelectorAll('.view').forEach(x=>x.classList.toggle('on',x.id==='v-'+id));
  document.getElementById('title').textContent=v.t;
  document.getElementById('eb').textContent=v.g+(v.m?' · '+(SEL==='all'?PERL().replace(/^./,c=>c.toUpperCase()):mlong(SEL)):'');
  document.getElementById('lead').textContent=v.lead;
  mseg.style.opacity=v.m?1:.35;mseg.style.pointerEvents=v.m?'auto':'none';
  Object.keys(CH).forEach(k=>{CH[k].destroy();delete CH[k]});
  const el=document.getElementById('v-'+id);try{RENDER[id](el);animate(el)}catch(err){console.error('painel-executivo',id,err);el.innerHTML='<div class="card"><div class="ct">Sem dados suficientes</div><div class="note" style="margin-top:8px">Esta tela depende do planejamento da empresa (metas, orçamento e plano de ação) ou de lançamentos que ainda não existem. Cadastre o planejamento para liberar esta visão.</div></div>';el.classList.add('on')}
  document.getElementById('side').classList.remove('open');__root.scrollTo({top:0,behavior:'smooth'});
  try{history.replaceState(null,'','#'+id)}catch(e){}
}
navs.onclick=e=>{const b=e.target.closest('.nav');if(b)show(b.dataset.v)};
mseg.onclick=e=>{const b=e.target.closest('button');if(!b)return;SEL=b.dataset.m;mseg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));moveThumb();show(CUR)};
mseg.querySelector(`[data-m="${SEL}"]`).classList.add('on');
document.getElementById('menuBtn').onclick=()=>document.getElementById('side').classList.toggle('open');
addEventListener('resize',moveThumb);
document.getElementById('upd').textContent=(D.ref||'').replace('Atualizado:','Atualizado');
const start=(location.hash||'').slice(1);show(RENDER[start]?start:'geral');setTimeout(moveThumb,50);

/* ================= FUNDO: parallax + estrelas ================= */
(function(){
  const par=document.getElementById('par'),spot=document.getElementById('spot');
  const rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
  addEventListener('pointermove',e=>{if(rm)return;const x=e.clientX/innerWidth-.5,y=e.clientY/innerHeight-.5;par.style.transform=`translate3d(${x*-40}px,${y*-40}px,0)`;spot.style.left=e.clientX+'px';spot.style.top=e.clientY+'px'});
  const cv=document.getElementById('stars'),ctx=cv.getContext('2d'),dpr=Math.min(devicePixelRatio||1,2);let W,H,S=[];
  function size(){W=cv.width=innerWidth*dpr;H=cv.height=innerHeight*dpr;S=Array.from({length:Math.min(140,Math.floor(innerWidth*innerHeight/9000))},()=>({x:Math.random()*W,y:Math.random()*H,r:(Math.random()*1.1+.2)*dpr,a:Math.random(),s:Math.random()*.015+.003,v:(Math.random()*.12+.02)*dpr,g:Math.random()<.3}))}
  function step(){ctx.clearRect(0,0,W,H);for(const p of S){p.a+=p.s;p.y-=p.v;if(p.y<0){p.y=H;p.x=Math.random()*W}const o=.25+.55*Math.abs(Math.sin(p.a));ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fillStyle=p.g?`rgba(248,194,8,${o})`:`rgba(170,205,255,${o})`;ctx.fill()}if(!rm)requestAnimationFrame(step)}
  size();addEventListener('resize',size);step();
  const road=document.getElementById('road');
  road.innerHTML=Array.from({length:14},(_,i)=>{const y=Math.random()*100,w=20+Math.random()*35,gold=i%3===0;return `<i style="top:${y}%;width:${w}%;--c:${gold?'rgba(248,194,8,.7)':'rgba(26,134,224,.75)'};--d:${(5+Math.random()*7).toFixed(1)}s;--dl:-${(Math.random()*10).toFixed(1)}s"></i>`}).join('');
})();

  return () => {
    alive.v = false;
    cleanups.forEach((f) => f());
    Object.keys(CH).forEach((k) => { try { CH[k].destroy(); } catch (e) {} });
  };
}
