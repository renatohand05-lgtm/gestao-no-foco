/* eslint-disable */
/**
 * Motor de renderização do Painel Executivo da X Company (agência) — porte fiel do painel HTML.
 * Recebe o JSON de dados (D) e monta as telas dentro de `root`. Retorna a função de limpeza.
 */
export function mountPainelAgencia(__root, D, Chart) {
  const alive = { v: true };
  const cleanups = [];
  const document = {
    body: __root,
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

const C={blue:'#ff2d2d',green:'#30d158',orange:'#ff9f0a',red:'#ff5a4f',purple:'#c7c7cf',teal:'#ff8a80',pink:'#c4142b',yellow:'#ffd60a',indigo:'#f2f2f7',mint:'#8e8e98',gray:'#6e6e78'};
const M=D.months.map(m=>m[0].toUpperCase()+m.slice(1));
const CUR=D.cur??7, NM=D.nm??8; // novembro (parcial)
const MN=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

/* ---------- format ---------- */
const brl=(v,d=0)=>(d=typeof d==='number'?d:0,v==null||isNaN(v)?'—':(v<0?'−':'')+'R$ '+Math.abs(v).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}));
const brlk=v=>v==null?'—':Math.abs(v)>=1000?(v<0?'−':'')+'R$ '+(Math.abs(v)/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})+' mil':brl(v);
const num=(v,d=0)=>(d=typeof d==='number'?d:0,v==null||isNaN(v)?'—':v.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}));
const pct=(v,d=1)=>(d=typeof d==='number'?d:1,v==null||isNaN(v)||typeof v!=='number'?'—':(v*100).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})+'%');
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fd=s=>{if(!s)return '—';const[y,m,d]=s.split('-');return d+'/'+m+'/'+y.slice(2)};
const fm=s=>{if(!s)return '—';const[y,m]=s.split('-');return MN[+m-1]+'/'+y.slice(2)};
const sgn=v=>v<0?'neg':'';
const emo=s=>String(s||'').replace(/🔴|🟠|🟡|✅|⚠️?|🫡|👉/g,'').trim();
const tone=s=>{s=String(s||'');return /🔴|ABAIXO|falta|ATENÇÃO|⚠/.test(s)?'r':/🟠|🟡/.test(s)?'o':/✅|OK/.test(s)?'g':'n'};

/* ---------- components ---------- */
function kpi(lb,v,d,ic,col,cls=''){return `<div class="card kpi reveal"><div class="lb"><span class="ic" style="background:${col}22;color:${col}">${ic}</span>${lb}</div><div class="v ${cls}">${v}</div><div class="d">${d||''}</div></div>`}
function card(t,sub,body,extra=''){return `<div class="card reveal" ${extra}>${t?`<h3>${t}</h3>`:''}${sub?`<div class="sub">${sub}</div>`:t?'<div style="height:12px"></div>':''}${body}</div>`}
function chart(id,cls=''){return `<div class="ch ${cls}"><canvas id="${id}"></canvas></div>`}
function sec(t,s=''){return `<div class="sec">${t}${s?`<small>${s}</small>`:''}</div>`}
function chip(t,k){return `<span class="chip c-${k}">${esc(t)}</span>`}
function prog(lb,val,txt,col){const w=Math.max(0,Math.min(1,val||0))*100;return `<div class="prow"><div class="pt"><span>${lb}</span><span>${txt}</span></div><div class="bar"><i style="width:0;background:linear-gradient(90deg,${col},${col}bb)" data-w="${w}%"></i></div></div>`}
function ring(v,lb,sub,col){const r=62,c=2*Math.PI*r,o=c*(1-Math.max(0,Math.min(1,v)));return `<div class="ring"><svg viewBox="0 0 150 150"><circle cx="75" cy="75" r="${r}" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="12"/><circle cx="75" cy="75" r="${r}" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-o="${o}" style="transition:stroke-dashoffset 1.4s cubic-bezier(.2,.8,.2,1);filter:drop-shadow(0 0 8px ${col}66)"/></svg><div class="rv"><b>${pct(v,0)}</b><small>${sub}</small></div><div class="rl">${lb}</div></div>`}
function mini(rows){return rows.map(([a,b,c])=>`<div class="mini"><span>${a}</span><b class="${c||''}">${b}</b></div>`).join('')}
function legend(items){return `<div class="legend">${items.map(([t,c])=>`<span><i style="background:${c}"></i>${t}</span>`).join('')}</div>`}

/* generic sortable table */
const TB={};
function table(id,cols,rows,opt={}){TB[id]={cols,rows,opt,sort:opt.sort??null,dir:opt.dir??-1};return `<div class="tw ${opt.lim?'lim':''}" id="tw_${id}">${renderTable(id)}</div>`}
function renderTable(id){const t=TB[id];let rows=[...t.rows];
  if(t.sort!=null){const k=t.cols[t.sort].k;rows.sort((a,b)=>{const x=a[k],y=b[k];if(x==null)return 1;if(y==null)return -1;return (typeof x==='string'?x.localeCompare(y):x-y)*t.dir})}
  const th=t.cols.map((c,i)=>`<th class="s ${c.a||''}" onclick="sortT('${id}',${i})">${c.t}${t.sort===i?(t.dir>0?' ↑':' ↓'):''}</th>`).join('');
  const tr=rows.map(r=>`<tr>${t.cols.map(c=>`<td class="${c.a||''} ${c.cls?c.cls(r):''}">${c.f?c.f(r[c.k],r):esc(r[c.k])}</td>`).join('')}</tr>`).join('');
  const tf=t.opt.foot?`<tr class="tot">${t.opt.foot.map((v,i)=>`<td class="${t.cols[i].a||''}">${v}</td>`).join('')}</tr>`:'';
  return `<table><thead><tr>${th}</tr></thead><tbody>${tr}${tf}</tbody></table>${rows.length?'':'<div class="muted" style="padding:18px">Nenhum resultado.</div>'}`}
function sortT(id,i){const t=TB[id];if(t.sort===i)t.dir*=-1;else{t.sort=i;t.dir=t.cols[i].a==='r'?-1:1}document.getElementById('tw_'+id).innerHTML=renderTable(id)}

/* matrix table (DRE-like) */
function matrix(rows,heads,opt={}){
  const curCol=opt.cur;if(opt.n){heads=heads.slice(0,opt.n);rows=rows.map(r=>({...r,v:r.v.slice(0,opt.n)}))}
  const h=`<tr><th>${opt.first||'Conta'}</th>${heads.map((x,i)=>`<th class="r ${i===curCol?'cur':''}">${x}</th>`).join('')}${opt.tot?`<th class="r">${opt.tot}</th>`:''}${opt.pct?'<th class="r">% Rec.</th>':''}</tr>`;
  const b=rows.map(r=>{
    if(r.head)return `<tr class="hd"><td colspan="${heads.length+1+(opt.tot?1:0)+(opt.pct?1:0)}">${esc(r.l)}</td></tr>`;
    const isPct=opt.pctRow?opt.pctRow(r):/Margem|MARGEM/.test(r.l);
    const isKey=r.l===r.l.toUpperCase()&&r.l.length>4;
    const fmt=v=>v==null||v===''?'<span class="muted">—</span>':typeof v==='string'?esc(emo(v)||v):isPct?pct(v):opt.int?.(r)?num(v,0):brl(v);
    return `<tr class="${isKey?'key':''} ${r.ind>=6?'sub2':''}"><td>${esc(r.l)}</td>${r.v.map((v,i)=>`<td class="r ${typeof v==='number'?sgn(v):''} ${i===curCol?'cur':''}">${fmt(v)}</td>`).join('')}${opt.tot?`<td class="r ${typeof r.t==='number'?sgn(r.t):''}"><b>${fmt(r.t)}</b></td>`:''}${opt.pct?`<td class="r muted">${r.p!=null&&!isPct&&!opt.int?.(r)?pct(r.p):''}</td>`:''}</tr>`}).join('');
  return `<div class="tw"><table class="mx"><thead>${h}</thead><tbody>${b}</tbody></table></div>`}

/* ---------- Chart.js defaults ---------- */
Chart.defaults.color='#8e8e98';Chart.defaults.font.family=getComputedStyle(document.body).fontFamily;Chart.defaults.font.size=11.5;
Chart.defaults.borderColor='rgba(255,255,255,.06)';
Chart.defaults.plugins.legend.labels.usePointStyle=true;Chart.defaults.plugins.legend.labels.pointStyle='rectRounded';Chart.defaults.plugins.legend.labels.boxWidth=8;Chart.defaults.plugins.legend.labels.padding=16;
Object.assign(Chart.defaults.plugins.tooltip,{backgroundColor:'rgba(22,23,32,.95)',borderColor:'rgba(255,255,255,.12)',borderWidth:1,padding:12,cornerRadius:12,titleFont:{weight:'600',size:12.5},bodyFont:{size:12},boxPadding:5,usePointStyle:true});
Chart.defaults.animation.duration=1100;Chart.defaults.animation.easing='easeOutQuart';
Chart.defaults.maintainAspectRatio=false;
const CH={};
function mk(id,cfg){const el=document.getElementById(id);if(!el)return;if(CH[id])CH[id].destroy();CH[id]=new Chart(el,cfg)}
function grad(ctx,col,a=.45){const g=ctx.createLinearGradient(0,0,0,300);g.addColorStop(0,col+Math.round(a*255).toString(16).padStart(2,'0'));g.addColorStop(1,col+'00');return g}
const yBRL={ticks:{callback:v=>brlk(v)},grid:{color:'rgba(255,255,255,.05)'},border:{display:false}};
const yPct={ticks:{callback:v=>pct(v,0)},grid:{color:'rgba(255,255,255,.05)'},border:{display:false}};
const xG={grid:{display:false},border:{display:false}};
const ttBRL={callbacks:{label:c=>' '+c.dataset.label+': '+brl(c.parsed.y??c.parsed)}};
const ttPct={callbacks:{label:c=>' '+c.dataset.label+': '+pct(c.parsed.y)}};
const M7=M.slice(0,NM);

/* ================= VIEWS ================= */
const VIEWS=[
 {g:'Visão geral',id:'mes',t:'Novembro em andamento',ic:'◷',c:C.teal,s:'Parcial até 16/11: entradas, saídas, receita perdida, DRE e ritmo da meta'},
 {g:'Visão geral',id:'fech',t:'Fechamento de outubro',ic:'★',c:C.orange,s:'Mês fechado: quem entrou, quem saiu, receita perdida e resultado'},
 {g:'Visão geral',id:'geral',t:'Visão geral',ic:'◉',c:C.blue,s:'Saúde do negócio de abril a dezembro de 2026'},
 {g:'Visão geral',id:'alertas',t:'Alertas',ic:'!',c:C.red,s:'O que exige atenção agora',badge:()=>D.atencao.filter(a=>/🔴/.test(a.sit)).length},
 {g:'Financeiro',id:'dre',t:'DRE consolidado',ic:'≡',c:C.indigo,s:'Resultado mês a mês · abril a dezembro de 2026'},
 {g:'Financeiro',id:'caixa',t:'Fluxo de caixa',ic:'⇄',c:C.green,s:'Entradas, saídas e a política de destinação 40 / 40 / 20'},
 {g:'Financeiro',id:'tend',t:'Vendas e tendência',ic:'↗',c:C.mint,s:'Série histórica, média móvel e projeção do mês'},
 {g:'Comercial',id:'meta',t:'Meta R$ 100 mil',ic:'◎',c:C.orange,s:'Composição da meta, termômetro e funil do mês'},
 {g:'Comercial',id:'plano',t:'Plano para a meta',ic:'✎',c:C.yellow,s:'Premissas, funil necessário, folha e DRE projetado'},
 {g:'Clientes',id:'cli',t:'Base de clientes',ic:'☺',c:C.purple,s:'Todos os clientes desde a abertura'},
 {g:'Clientes',id:'churn',t:'Churn e retenção',ic:'↺',c:C.pink,s:'Entradas, saídas, MRR perdido e permanência'},
 {g:'Clientes',id:'gest',t:'Gestores de tráfego',ic:'◆',c:C.blue,s:'Carteiras, renovação e cenários por gestor'},
 {g:'Clientes',id:'dras',t:'Atendimento Dras',ic:'✚',c:C.mint,s:'Comercial terceirizado para as doutoras'},
];

/* ---------- GERAL ---------- */
function vGeral(){const k=D.kpiMes,a=D.kpiAcum;
 const dc=s=>/^\+/.test(s)?'up':/^-/.test(s)?'dn':'';
 const top=D.atencao.slice(0,4);
 return `<div class="banner reveal"><div class="bi">⚠</div><div><b>Alerta do mês</b><span>${esc(emo(D.banner).replace(/^ALERTA\s*·\s*/,''))}</span></div></div>
 ${sec('Mês corrente','nov/26 · parcial até 16/11')}
 <div class="grid g6">
  ${kpi('Faturamento do mês',brl(k.fat),`<span class="${dc(k.dFat)}">${k.dFat}</span>`,'$',C.blue)}
  ${kpi('Resultado líquido',brl(k.res),`<span class="${dc(k.dRes)}">${k.dRes}</span>`,'≈',C.green)}
  ${kpi('Meta atingida',pct(k.meta),k.dMeta,'◎',C.orange,k.meta<.8?'wa':'')}
  ${(()=>{const A=x=>D.mesNov.acomp.find(a=>a[0]===x)[2],B=x=>D.mesOut.acomp.find(a=>a[0]===x)[2];
   const nv=A('Vendas fechadas'),no=B('Vendas fechadas'),ch=D.churnNov.sai,co=D.churnOut.sai,cac=nv?A('Investimento em tráfego')/nv:null,cao=no?B('Investimento em tráfego')/no:null;
   const v=(x,y,inv)=>{const d=(x/y-1);return `<span class="${(inv?-d:d)>=0?'up':'dn'}">${d>0?'+':''}${pct(d)} vs outubro inteiro</span>`};
   return kpi('Novos clientes',num(nv),v(nv,no)+' · vendas do DRE','+',C.purple)+kpi('Churn do mês',num(ch)+' clientes',`<span class="dn">${pct(D.churnNov.pct)} da base</span> · outubro teve ${num(co)}`,'↺',C.red)+kpi('CAC por cliente',brl(cac),v(cac,cao,true),'◆',C.teal)})()}
 </div>
 ${sec('Acumulado','abr–dez/26')}
 <div class="grid g6">
  ${kpi('Faturamento acumulado',brl(a.fat),a.sFat,'Σ',C.blue)}
  ${kpi('Resultado acumulado',brl(a.res),a.sRes,'≈',C.green)}
  ${kpi('Margem acumulada',pct(a.margem),a.sMargem,'%',C.mint)}
  ${kpi('MRR atual',brl(a.mrr),a.sMrr,'↻',C.indigo)}
  ${kpi('Clientes ativos',num(a.ativos),a.sAtivos,'☺',C.purple)}
  ${kpi('LTV / CAC',num(a.ltvcac,1)+'×',a.sLtv,'×',C.orange)}
 </div>
 <div class="grid g21" style="margin-top:16px">
  ${card('Faturamento e resultado','Receita total, custo operacional e resultado líquido por mês',chart('cGeral1','lg'))}
  ${card('Composição da receita','Acumulado abr–nov',chart('cGeral2','lg'))}
 </div>
 <div class="grid g2" style="margin-top:16px">
  ${card('Realizado x meta do mês','Meta mensal de R$ 100 mil',chart('cGeral3'))}
  ${card('Novos clientes e receita nova','Contratos fechados por mês',chart('cGeral4'))}
 </div>
 <div class="grid g2" style="margin-top:16px">
  ${card('O que exige atenção','Os pontos mais urgentes · veja todos em Alertas',top.map(x=>`<div class="al"><div class="ai" style="background:${tone(x.sit)==='r'?C.red:tone(x.sit)==='o'?C.orange:C.green}"></div><div><b>${esc(x.ind)}</b><p>${esc(emo(x.sit))}</p><div class="act">${esc(x.acao)}</div></div></div>`).join(''))}
  ${card('Por que os clientes saem','Motivos de saída registrados',chart('cGeral5'))}
 </div>
 <div class="grid g2" style="margin-top:16px">
  ${card('Reservas de caixa acumuladas','Saldo de cada reserva ao fim do mês',chart('cGeral6'))}
  ${card('Clientes recorrentes','Ticket e faturamento da base ativa',mini(D.recorrentes.map(([l,v])=>[esc(l),/MRR|Ticket|Receita|RECEITA|Faturamento|LTV pro/.test(l)?brl(v):/LTV \//.test(l)?num(v,1)+'×':/meses/.test(l)?num(v,1):num(v)])))}
 </div>`}
function cGeral(){const dre=D.dre;const g=n=>dre.find(r=>r.l===n);
 const rec=g('RECEITA TOTAL').v.slice(0,NM),cus=g('CUSTO OPERACIONAL TOTAL').v.slice(0,NM),res=g('RESULTADO LÍQUIDO (Caixa da Empresa)').v.slice(0,NM);
 mk('cGeral1',{type:'bar',data:{labels:M7,datasets:[
  {type:'line',label:'Resultado líquido',data:res,borderColor:C.green,backgroundColor:C.green,tension:.4,borderWidth:2.5,pointRadius:4,pointBackgroundColor:'#0b0c14',pointBorderWidth:2,order:0},
  {label:'Faturamento',data:rec,backgroundColor:C.blue+'cc',borderRadius:8,maxBarThickness:34,order:1},
  {label:'Custo operacional',data:cus,backgroundColor:'rgba(255,255,255,.14)',borderRadius:8,maxBarThickness:34,order:2}]},options:{scales:{x:xG,y:yBRL},plugins:{tooltip:ttBRL,legend:{position:'bottom'}}}});
 const t=n=>g(n).t;
 mk('cGeral2',{type:'doughnut',data:{labels:['Contratos novos','Recorrente (MRR)','Atendimento Dras'],datasets:[{data:[t('Contratos Novos e Receitas Pontuais'),t('Receita Recorrente (MRR)'),t('Receita de Atendimento (Dras)')],backgroundColor:[C.blue,C.purple,C.mint],borderWidth:0,hoverOffset:8,spacing:3,borderRadius:6}]},options:{cutout:'70%',plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>' '+c.label+': '+brl(c.parsed)+' ('+pct(c.parsed/t('RECEITA TOTAL'))+')'}}}}});
 mk('cGeral3',{type:'bar',data:{labels:M7,datasets:[{label:'Realizado',data:rec,backgroundColor:rec.map(v=>v>=100000?C.green:v>=50000?C.orange:C.red),borderRadius:8,maxBarThickness:38},{type:'line',label:'Meta',data:M7.map(()=>100000),borderColor:'rgba(255,255,255,.5)',borderDash:[6,6],pointRadius:0,borderWidth:1.5}]},options:{scales:{x:xG,y:yBRL},plugins:{tooltip:ttBRL,legend:{position:'bottom'}}}});
 const nv=g('   Novos Clientes (entradas)'.trim());const serie=D.serie.slice(0,NM);
 mk('cGeral4',{type:'bar',data:{labels:M7,datasets:[{label:'Novos clientes',data:serie.map(s=>s.novos),backgroundColor:C.purple+'cc',borderRadius:8,maxBarThickness:34,yAxisID:'y'},{type:'line',label:'Ticket médio por venda',data:serie.map(s=>s.ticket),borderColor:C.orange,tension:.4,pointRadius:3,yAxisID:'y1'}]},options:{scales:{x:xG,y:{grid:{color:'rgba(255,255,255,.05)'},border:{display:false},title:{display:true,text:'clientes'}},y1:{position:'right',grid:{display:false},border:{display:false},ticks:{callback:v=>brlk(v)}}},plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>' '+c.dataset.label+': '+(c.datasetIndex?brl(c.parsed.y):num(c.parsed.y))}}}}});
 const md=[...D.motivosDash].sort((a,b)=>b[1]-a[1]);
 mk('cGeral5',{type:'bar',data:{labels:md.map(m=>m[0]),datasets:[{label:'Clientes',data:md.map(m=>m[1]),backgroundColor:md.map(m=>m[0]==='A definir'?'rgba(255,255,255,.22)':C.pink+'cc'),borderRadius:6,maxBarThickness:22}]},options:{indexAxis:'y',scales:{x:{grid:{color:'rgba(255,255,255,.05)'},border:{display:false}},y:{grid:{display:false},border:{display:false}}},plugins:{legend:{display:false}}}});
 const mv=D.movRes;
 mk('cGeral6',{type:'line',data:{labels:M7,datasets:[
  {label:'Reserva de expansão',data:mv[0].v.slice(0,NM),borderColor:C.blue,backgroundColor:c=>grad(c.chart.ctx,C.blue,.3),fill:true,tension:.4,pointRadius:3},
  {label:'Reserva de contas',data:mv[1].v.slice(0,NM),borderColor:C.red,tension:.4,pointRadius:3},
  {label:'Provisão de sócios',data:mv[2].v.slice(0,NM),borderColor:C.yellow,tension:.4,pointRadius:3}]},options:{scales:{x:xG,y:yBRL},plugins:{tooltip:ttBRL,legend:{position:'bottom'}}}});
}

/* ---------- MÊS CORRENTE ---------- */
function vMes(){const r=D.mesNov.resumo,ac=D.mesNov.acomp;
 return `${sec('Ritmo da meta','novembro · '+pct(D.mesNov.pace/D.mesNov.dias,0)+' do mês já passou')}
 <div class="grid g2">
  ${card('Ritmo contra a meta','Quanto do objetivo do mês já foi atingido',`<div class="rings">${ring(r[0][3],'Faturamento',brl(r[0][1]),C.blue)}${ring(r[4][3],'Novos clientes',num(r[4][1])+' de '+num(r[4][2]),C.purple)}${ring(D.mesNov.pace/D.mesNov.dias,'Mês decorrido','dia '+num(D.mesNov.pace)+' de '+num(D.mesNov.dias),C.indigo)}</div><div class="note r">Para estar no ritmo, o faturamento deveria estar em ${brl(r[0][1]/r[0][3]*D.mesNov.pace/D.mesNov.dias)}; está em ${brl(r[0][1])}.</div>`)}
  ${card('Receita por semana','MRR, upsell e contratos novos lançados',chart('cMes1'))}
 </div>
 ${sec('Acompanhamento semanal','os números lançados pela equipe')}
 <div class="grid">
  ${card('Atividade comercial por semana','Leads, reuniões e vendas',chart('cMes2','lg'))}
  ${card('Lançamentos da semana','Valores digitados no acompanhamento semanal',`<div class="tw"><table><thead><tr><th>Indicador</th>${[1,2,3,4,5].map(i=>`<th class="r">S${i}</th>`).join('')}<th class="r">Total</th></tr></thead><tbody>${ac.map(([l,v,t])=>{const money=/Invest|Contratos|Renova|Upsell/.test(l);const fx=x=>x==null?'<span class="muted">—</span>':money?brlk(x):num(x);return `<tr><td>${esc(l)}</td>${v.map(x=>`<td class="r">${fx(x)}</td>`).join('')}<td class="r"><b>${fx(t)}</b></td></tr>`}).join('')}</tbody></table></div>`)}
 </div>`}
function funnel(st){const mx=st[0][1];return `<div class="fun">${st.map(([l,v,c],i)=>`<div class="fs" style="width:${100-i*8}%;background:linear-gradient(90deg,${c}44,${c}22);border:1px solid ${c}55"><span>${esc(l)}</span><span style="text-align:right"><b>${num(v)}</b> <span class="fm">${i?pct(v/st[i-1][1],0)+' da etapa':''}</span></span></div>`).join('')}</div>`}
function cMes(){const ac=D.mesNov.acomp;
 mk('cMes1',{type:'bar',data:{labels:['S1','S2','S3','S4','S5'],datasets:[{label:'Renovações (MRR)',data:ac[6][1],backgroundColor:C.purple,borderRadius:6,stack:'a'},{label:'Contratos novos',data:ac[5][1],backgroundColor:C.blue,borderRadius:6,stack:'a'},{label:'Upsell',data:ac[7][1],backgroundColor:C.mint,borderRadius:6,stack:'a'}]},options:{scales:{x:{...xG,stacked:true},y:{...yBRL,stacked:true}},plugins:{tooltip:ttBRL,legend:{position:'bottom'}}}});
 mk('cMes2',{type:'bar',data:{labels:['Semana 1','Semana 2','Semana 3','Semana 4','Semana 5'],datasets:[
  {label:'Leads',data:ac[1][1],backgroundColor:C.blue+'55',borderRadius:6,yAxisID:'y1'},
  {type:'line',label:'Reuniões agendadas',data:ac[2][1],borderColor:C.indigo,tension:.4,pointRadius:4},
  {type:'line',label:'Reuniões realizadas',data:ac[3][1],borderColor:C.purple,tension:.4,pointRadius:4},
  {type:'line',label:'Vendas fechadas',data:ac[4][1],borderColor:C.pink,tension:.4,pointRadius:5,borderWidth:3}]},options:{scales:{x:xG,y:{grid:{color:'rgba(255,255,255,.05)'},border:{display:false},title:{display:true,text:'reuniões e vendas'}},y1:{position:'right',grid:{display:false},border:{display:false},title:{display:true,text:'leads'}}},plugins:{legend:{position:'bottom'}}}});
}

/* ---------- ALERTAS ---------- */
function DQ(){const n=D.churnNov,mn=D.mesNov.acomp,cl=D.clientes;
 const semMot=cl.filter(c=>c.st==='CHURN'&&(!c.mot||/DEFINIR/i.test(c.mot))).length,saiu=cl.filter(c=>c.st==='CHURN').length;
 const vNov=mn.find(a=>a[0]==='Clientes novos')[2],chNov=mn.find(a=>/Churn/.test(a[0]))[2];
 const semG=cl.filter(c=>c.st==='ATIVO'&&!c.g).length;
 return [
  ['r','Churn de novembro já em '+pct(n.pct),num(n.sai)+' clientes saíram nos primeiros dias do mês ('+brl(n.churn.reduce((a,r)=>a+(r[3]||0),0))+' de MRR), todos sem motivo registrado.'],
  [vNov!==n.ent.length||chNov!==n.sai?'o':'g','Novembro: DRE e churn mensal não batem','O DRE mensal registra '+num(vNov)+' vendas e '+num(chNov)+' churn; a aba CHURN MENSAL NOVEMBRO lista '+num(n.ent.length)+' entradas e '+num(n.sai)+' saídas.'],
  [semMot>saiu*.3?'r':'o','Motivo de saída não registrado',num(semMot)+' de '+num(saiu)+' clientes que saíram estão sem motivo ou "a definir".'],
  ['o','Permanência curta',num(D.perm.m1+D.perm.m2)+' de '+num(saiu)+' cancelamentos acontecem até o 2º mês (média de '+num(D.perm.media,1)+' meses).'],
  [semG?'o':'g','Clientes ativos sem gestor',num(semG)+' dos '+num(cl.filter(c=>c.st==='ATIVO').length)+' ativos não aparecem nas carteiras do Kaiam nem do Antônio.'],
 ]}
function vAlertas(){
 const col={r:C.red,o:C.orange,g:C.green,n:C.gray};
 return `<div class="grid g2">
 ${card('Indicadores do negócio','Situação atual e o que fazer',D.atencao.map(x=>`<div class="al"><div class="ai" style="background:${col[tone(x.sit)]}"></div><div><b>${esc(x.ind)}</b><p>${esc(emo(x.sit))}</p><div class="act">→ ${esc(x.acao)}</div></div></div>`).join(''))}
 ${card('Base de clientes','Pontos de atenção calculados a partir da planilha',DQ().map(([t,a,d])=>`<div class="al"><div class="ai" style="background:${t==='r'?C.red:t==='o'?C.orange:C.green}"></div><div style="flex:1"><b>${esc(a)}</b><p>${esc(d)}</p></div></div>`).join(''))}
 </div>
 <div class="grid g2" style="margin-top:16px">
 ${card('Gatilhos de alerta','Projeções do mês contra os mínimos definidos',mini(D.gatilhos.slice(0,4).map(([l,v])=>[esc(l),brl(v)]))+D.gatilhos.slice(4).map(([l,v])=>`<div class="note r">${esc(emo(v))}</div>`).join(''))}
 ${card('Cobertura do pró-labore','Aporte de 40% da reserva de contas ÷ (pró-labore + comissão)',chart('cAl1','sm')+`<div class="note w">${esc(D.comoLer[5])}</div>`)}
 </div>`}
function cAlertas(){const r=D.movRes[5];const v=r.v.slice(3,7);
 mk('cAl1',{type:'bar',data:{labels:M.slice(3,7),datasets:[{label:'Cobertura',data:v,backgroundColor:v.map(x=>x>=1?C.green:x>=.9?C.orange:C.red),borderRadius:8,maxBarThickness:46},{type:'line',label:'100%',data:v.map(()=>1),borderColor:'rgba(255,255,255,.5)',borderDash:[6,6],pointRadius:0,borderWidth:1.5}]},options:{scales:{x:xG,y:{...yPct,min:0,max:1.1}},plugins:{legend:{display:false},tooltip:ttPct}}});
}

/* ---------- DRE ---------- */
function vDre(){const g=n=>D.dre.find(r=>r.l===n);const lo=g('LUCRO OPERACIONAL'),rl=g('RESULTADO LÍQUIDO (Caixa da Empresa)');
 const intRow=r=>/Clientes Ativos|Novos Clientes|Clientes Perdidos/.test(r.l);
 return `<div class="grid g4">
  ${kpi('Receita total',brl(g('RECEITA TOTAL').t),'abr–nov/26','$',C.blue)}
  ${kpi('Custo operacional',brl(g('CUSTO OPERACIONAL TOTAL').t),pct(g('CUSTO OPERACIONAL TOTAL').p)+' da receita','−',C.orange)}
  ${kpi('Lucro operacional',brl(lo.t),'margem de '+pct(lo.p),'≈',C.mint)}
  ${kpi('Resultado líquido',brl(rl.t),'margem líquida de '+pct(rl.p),'✓',C.green)}
 </div>
 <div class="grid g2" style="margin-top:16px">
  ${card('Margens por mês','Operacional e líquida',chart('cDre1'))}
  ${card('Para onde vai o dinheiro','Custos acumulados por categoria',chart('cDre2'))}
 </div>
 ${sec('Demonstrativo completo','abril a novembro · novembro parcial (até 16/11) · dezembro sem lançamentos')}
 ${card('','',matrix(D.dre,M,{n:NM,tot:'Total',pct:true,cur:CUR,int:intRow}))}`}
function cDre(){const g=n=>D.dre.find(r=>r.l.trim()===n);
 mk('cDre1',{type:'line',data:{labels:M7,datasets:[{label:'Margem operacional',data:g('Margem Operacional %').v.slice(0,NM),borderColor:C.mint,backgroundColor:c=>grad(c.chart.ctx,C.mint,.25),fill:true,tension:.4,pointRadius:4},{label:'Margem líquida',data:g('Margem Líquida %').v.slice(0,NM),borderColor:C.green,tension:.4,pointRadius:4,borderWidth:2.5}]},options:{scales:{x:xG,y:yPct},plugins:{tooltip:ttPct,legend:{position:'bottom'}}}});
 const cats=['Folha de Pagamento','Tráfego Pago (Ads)','Bônus e Comissões de Equipe','Aluguel e Escritório','Despesas Operacionais (internet, contador, manutenção)','Softwares e Ferramentas','Impostos','Outros'];
 const short=['Folha','Tráfego pago','Bônus e comissões','Aluguel','Despesas operacionais','Softwares','Impostos','Outros'];
 const vals=cats.map(c=>g(c).t);const ord=vals.map((v,i)=>[v,short[i]]).sort((a,b)=>b[0]-a[0]);
 mk('cDre2',{type:'bar',data:{labels:ord.map(o=>o[1]),datasets:[{label:'Acumulado',data:ord.map(o=>o[0]),backgroundColor:[C.blue,C.indigo,C.purple,C.pink,C.orange,C.yellow,C.mint,C.teal],borderRadius:6,maxBarThickness:22}]},options:{indexAxis:'y',scales:{x:yBRL,y:{grid:{display:false},border:{display:false}}},plugins:{legend:{display:false},tooltip:ttBRL}}});
}

/* ---------- CAIXA ---------- */
function vCaixa(){const k=D.caixaKpi;
 return `<div class="grid g6" style="grid-template-columns:repeat(5,minmax(0,1fr))">
  ${kpi('Saldo de caixa acumulado',brl(k.saldo),'desde abr/26','$',C.blue)}
  ${kpi('Geração de caixa do mês',brl(k.geracao),'entradas − saídas de out','⇄',C.green)}
  ${kpi('Reserva de expansão',brl(k.exp),'40% do lucro operacional','↗',C.indigo)}
  ${kpi('Reserva de contas',brl(k.contas),'40% − pró-labore e comissão','!',C.red,k.contas<0?'dn':'')}
  ${kpi('Provisão de sócios',brl(k.socios),'20% · paga a cada 6 meses','◆',C.yellow)}
 </div>
 <div class="grid g21" style="margin-top:16px">
  ${card('Entradas, saídas e saldo','Fluxo de caixa mensal',chart('cCx1','lg'))}
  ${card('Onde está o dinheiro','Saldo atual das três reservas',D.reservas.slice(0,4).map(r=>`<div class="mini" style="flex-direction:column;gap:4px;padding:12px 0"><div style="display:flex;justify-content:space-between"><span>${esc(r.l.replace('(−) ',''))}${r.pct?` <span class="chip c-n">${pct(r.pct,0)}</span>`:''}</span><b class="${r.saldo<0?'dn':''}">${brl(r.saldo)}</b></div><span class="muted" style="font-size:12px;white-space:normal">${esc(r.obs)}</span></div>`).join('')+`<div class="note">${esc(emo(D.reservas[4].obs))} — ${brl(D.reservas[4].saldo)}</div>`)}
 </div>
 ${sec('Fluxo de caixa do mês')}
 ${card('','',matrix(D.fluxo,M,{n:NM,tot:'Total',cur:CUR,first:'Conta'}))}
 ${sec('Destinação do lucro operacional','40% expansão · 40% contas · 20% sócios')}
 <div class="grid g21">
  ${card('','',matrix(D.destino,M,{n:NM,tot:'Total',cur:CUR,first:'Destino'}))}
  ${card('Movimento das reservas','Saldo acumulado de cada reserva',chart('cCx2'))}
 </div>
 ${card('Como ler esta tela','',`<ul class="list">${D.comoLer.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`,'style="margin-top:16px"')}`}
function cCaixa(){const f=n=>D.fluxo.find(r=>r.l===n).v.slice(0,NM);
 mk('cCx1',{type:'bar',data:{labels:M7,datasets:[
  {type:'line',label:'Saldo final de caixa',data:f('SALDO FINAL DE CAIXA'),borderColor:C.teal,backgroundColor:c=>grad(c.chart.ctx,C.teal,.2),fill:true,tension:.4,pointRadius:4,borderWidth:2.5,order:0},
  {label:'Entradas',data:f('TOTAL DE ENTRADAS'),backgroundColor:C.green+'bb',borderRadius:8,maxBarThickness:28,order:1},
  {label:'Saídas',data:f('TOTAL DE SAÍDAS').map(v=>-v),backgroundColor:C.red+'99',borderRadius:8,maxBarThickness:28,order:2}]},options:{scales:{x:xG,y:yBRL},plugins:{tooltip:ttBRL,legend:{position:'bottom'}}}});
 const mv=D.movRes;
 mk('cCx2',{type:'bar',data:{labels:M7,datasets:[{label:'Expansão',data:mv[0].v.slice(0,NM),backgroundColor:C.blue,borderRadius:5},{label:'Contas',data:mv[1].v.slice(0,NM),backgroundColor:C.red,borderRadius:5},{label:'Sócios',data:mv[2].v.slice(0,NM),backgroundColor:C.yellow,borderRadius:5}]},options:{scales:{x:xG,y:yBRL},plugins:{tooltip:ttBRL,legend:{position:'bottom'}}}});
}

/* ---------- TENDÊNCIA ---------- */
function vTend(){const p=Object.fromEntries(D.proj);
 const pv=(l,v)=>/Margem|Variação vs meta \(%\)/.test(l)?pct(v):/Semanas/.test(l)?num(v):/Mês de/.test(l)?'set/26':/Status/.test(l)?emo(v):brl(v);
 return `<div class="grid g4">
  ${kpi('Projeção do mês',brl(p['PROJEÇÃO DE FATURAMENTO DO MÊS']),'meta de '+brl(p['Meta de faturamento do mês']),'↗',C.blue,'wa')}
  ${kpi('Ritmo por semana',brl(p['Ritmo médio por semana']),num(p['Semanas já lançadas'])+' semanas lançadas','◷',C.teal)}
  ${kpi('Resultado líquido projetado',brl(p['RESULTADO LÍQUIDO OPERACIONAL PROJETADO']),'margem de '+pct(p['Margem líquida projetada']),'≈',C.green)}
  ${kpi('Necessário por dia útil',brl(p['Faturamento necessário por dia útil restante']),'para fechar na meta','!',C.orange)}
 </div>
 <div class="grid g21" style="margin-top:16px">
  ${card('Faturamento, média móvel e tendência','A tendência exponencial é só um cenário teto',chart('cTd1','xl')+'<div class="seg" style="margin-top:12px" id="segT"><button class="on" data-x="0">Linear</button><button data-x="1">Linear + exponencial</button></div>')}
  ${card('Projeção do mês corrente','Em tempo real',mini(D.proj.slice(1).filter(([l])=>!/^\d ·/.test(l)).map(([l,v])=>[esc(l.replace(/^\(−\)/,'− ')),pv(l,v),typeof v==='number'&&v<0?'dn':''])))}
 </div>
 ${sec('Série mensal de vendas')}
 ${card('','',table('serie',[{t:'Mês',k:'m'},{t:'Faturamento',k:'fat',a:'r',f:brl},{t:'Novos clientes',k:'novos',a:'r',f:v=>num(v)},{t:'Ticket médio',k:'ticket',a:'r',f:brl},{t:'Média móvel 3M',k:'mm3',a:'r',f:brl},{t:'Cresc. vs mês ant.',k:'cresc',a:'r',f:v=>v==null?'—':`<span class="${v<0?'dn':'up'}">${v>0?'+':''}${pct(v)}</span>`},{t:'Resultado líquido',k:'res',a:'r',f:brl,cls:r=>sgn(r.res)}],D.serie.map((s,i)=>({...s,i,m:M[i]})).slice(0,NM),{sort:null,foot:(()=>{const z=D.serie.slice(0,NM),f=z.reduce((a,x)=>a+(x.fat||0),0),nv=z.reduce((a,x)=>a+(x.novos||0),0);return ['Total / média',brl(f),num(nv),brl(nv?z.reduce((a,x)=>a+(x.ticket||0)*(x.novos||0),0)/nv:null),'','',brl(z.reduce((a,x)=>a+(x.res||0),0))]})()}))}
 <div class="note w">${esc(D.tendNote||'A tendência exponencial ajusta a curva real de abr→ago (crescimento de ~17x) e por isso projeta valores muito altos. Use a tendência LINEAR para planejar e a exponencial apenas como cenário teto.')}</div>`}
function cTend(exp=false){const s=D.serie,t=D.tend;
 const ds=[{label:'Realizado',data:t.map((x,i)=>i<NM?x.real:null),backgroundColor:C.blue+'cc',borderRadius:8,maxBarThickness:36,order:2},
  {type:'line',label:'Média móvel 3M',data:s.map((x,i)=>i<NM?x.mm3:null),borderColor:C.orange,tension:.4,pointRadius:3,order:1},
  {type:'line',label:'Tendência linear',data:t.map(x=>x.lin),borderColor:C.mint,borderDash:[6,5],pointRadius:3,tension:0,order:0}];
 if(exp)ds.push({type:'line',label:'Tendência exponencial',data:t.map(x=>x.exp),borderColor:C.pink,borderDash:[2,4],pointRadius:2,order:0});
 mk('cTd1',{type:'bar',data:{labels:M,datasets:ds},options:{scales:{x:xG,y:{...yBRL,type:exp?'logarithmic':'linear'}},plugins:{tooltip:ttBRL,legend:{position:'bottom'}}}});
 document.querySelectorAll('#segT button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#segT button').forEach(x=>x.classList.toggle('on',x===b));cTend(b.dataset.x==='1')});
}

/* ---------- META ---------- */
function vMeta(){const mc=D.metaComp,tm=D.termo;
 return `<div class="grid g12">
  ${card('Meta do mês','Composição de R$ 100 mil',`<div class="rings" style="margin:6px 0 14px">${ring(mc[2][4],'Total',brl(mc[2][2]),C.orange)}</div>`+mc.slice(0,2).map((r,i)=>prog(r[0],r[4],brl(r[2])+' de '+brl(r[1]),[C.blue,C.purple][i])).join('')+`<div class="note w">${esc(emo(tm[0][2]))} — falta ${brl(mc[2][3])}</div>`)}
  ${card('Termômetro','O que falta para fechar o mês',`<div class="grid g4" style="gap:12px">${tm.slice(1).map(([l,v])=>`<div class="card" style="padding:14px 16px;background:rgba(255,255,255,.03)"><div class="muted" style="font-size:12px;min-height:30px">${esc(l)}</div><div style="font-size:21px;font-weight:700;margin-top:6px;letter-spacing:-.02em">${/Dias|Vendas/.test(l)?num(v):brl(v)}</div></div>`).join('')}</div>`+chart('cMt1','sm'))}
 </div>
 ${sec('Funil do mês','realizado x meta')}
 <div class="grid g2">
  ${card('Volume de cada etapa','',D.funil.slice(0,5).map((r,i)=>prog(r[0],r[3],(i?num(r[1]):brl(r[1]))+' de '+(i?num(r[2]):brl(r[2]))+' · '+pct(r[3],0),r[3]>=.9?C.green:r[3]>=.5?C.orange:C.red)).join(''))}
  ${card('Taxas de conversão','Realizado contra a meta',`<div class="tw"><table><thead><tr><th>Indicador</th><th class="r">Realizado</th><th class="r">Meta</th><th class="c">Status</th></tr></thead><tbody>${D.funil.slice(5).map(r=>`<tr><td>${esc(r[0])}</td><td class="r">${/CPL/.test(r[0])?brl(r[1],2):pct(r[1])}</td><td class="r muted">${/CPL/.test(r[0])?brl(r[2],2):pct(r[2],0)}</td><td class="c">${chip(/CPL/.test(r[0])?(r[1]<=r[2]?'ok':'acima'):(r[1]>=r[2]?'ok':'abaixo'),/CPL/.test(r[0])?(r[1]<=r[2]?'g':'r'):(r[1]>=r[2]?'g':'r'))}</td></tr>`).join('')}</tbody></table></div>`+chart('cMt2','sm'))}
 </div>
 ${sec('Leitura automática')}
 <div class="grid g2">${D.feedback.map(([t,v],i)=>card(t,'',`<p style="color:var(--text-2);line-height:1.55;font-size:13.5px">${esc(emo(v))}</p>`)).join('')}
 ${card('Tráfego pago — quanto gastar','Cenários de investimento',`<div class="tw"><table><thead><tr><th>Cenário</th><th class="r">Agend.</th><th class="r">Leads</th><th class="r">Por semana</th><th class="r">No mês</th></tr></thead><tbody>${D.trafCen.map(r=>`<tr><td class="wrap" style="min-width:180px">${esc(r[0])}</td><td class="r">${r[1]==null?'—':pct(r[1])}</td><td class="r">${num(r[2])}</td><td class="r">${brl(r[3])}</td><td class="r"><b>${brl(r[4])}</b></td></tr>`).join('')}</tbody></table></div>`)}
 </div>`}
function cMeta(){const mc=D.metaComp;
 mk('cMt1',{type:'bar',data:{labels:['Contratos novos','Renovações e upsell'],datasets:[{label:'Realizado',data:[mc[0][2],mc[1][2]],backgroundColor:[C.blue,C.purple],borderRadius:6,stack:'a'},{label:'Falta',data:[mc[0][3],mc[1][3]],backgroundColor:'rgba(255,255,255,.1)',borderRadius:6,stack:'a'}]},options:{indexAxis:'y',scales:{x:{...yBRL,stacked:true},y:{grid:{display:false},border:{display:false},stacked:true}},plugins:{tooltip:ttBRL,legend:{position:'bottom'}}}});
 const f=D.funil.slice(6);
 mk('cMt2',{type:'bar',data:{labels:f.map(r=>r[0].replace('Taxa de ','').replace('Conversão ','')),datasets:[{label:'Realizado',data:f.map(r=>r[1]),backgroundColor:C.orange,borderRadius:6,maxBarThickness:26},{label:'Meta',data:f.map(r=>r[2]),backgroundColor:'rgba(255,255,255,.18)',borderRadius:6,maxBarThickness:26}]},options:{scales:{x:xG,y:yPct},plugins:{tooltip:ttPct,legend:{position:'bottom'}}}});
}

/* ---------- PLANO ---------- */
function vPlano(){const pf=(l,v)=>/Taxa|Conversão|%/.test(l)?pct(v,0):/Semanas|Dias/.test(l)?num(v):brl(v,/CPL/.test(l)?2:0);
 const dp=D.dreProj;const fg=D.dreProjFolga;
 return `<div class="grid g2">
  ${card('Premissas do cenário','Valores usados para projetar a meta',mini(D.premissas.map(([l,v,o])=>[esc(l)+`<br><span class="muted" style="font-size:11.5px">${esc(o)}</span>`,pf(l,v)])))}
  ${card('DRE projetado na meta','Mês batendo a meta de R$ 100 mil',`<div class="tw"><table><tbody>${dp.slice(0,-1).map(([l,v,p])=>`<tr class="${l===l.toUpperCase()?'key':''}"><td>${esc(l)}</td><td class="r ${sgn(v)}">${brl(v)}</td><td class="r muted">${p!=null?pct(p):''}</td></tr>`).join('')}</tbody></table></div><div class="note ${fg[0]<0?'w':''}">Margem de caixa projetada de ${pct(dp[dp.length-1][1])} contra a meta de ${pct(fg[2],0)} (${num(fg[0],2)} p.p.) · ${esc(emo(fg[1]))}</div>`)}
 </div>
 <div class="grid" style="margin-top:16px">
  ${card('Funil necessário para R$ 100 mil','Mês, semana, dia e o real de agosto',`<div class="tw"><table><thead><tr><th>Etapa</th><th class="r">Mês</th><th class="r">Semana</th><th class="r">Dia</th><th class="r">Ago real</th></tr></thead><tbody>${D.funilNec.map(r=>{const m=/INVEST|CAC/.test(r[0]),ro=/ROAS/.test(r[0]);const fx=v=>v==null?'—':ro?num(v,1)+'×':m?brl(v):num(v,0);return `<tr class="${/INVEST/.test(r[0])?'key':''}"><td>${esc(r[0].charAt(0)+r[0].slice(1).toLowerCase())}</td><td class="r"><b>${fx(r[1])}</b></td><td class="r">${fx(r[2])}</td><td class="r">${fx(r[3])}</td><td class="r muted">${fx(r[4])}</td></tr>`}).join('')}</tbody></table></div>`)}
  ${card('Folha salarial','Fixo semanal, mensal e variável',table('folha',[{t:'Pessoa',k:0},{t:'Função',k:1,cls:()=>'muted'},{t:'R$/semana',k:2,a:'r',f:brl},{t:'Fixo/mês',k:3,a:'r',f:brl},{t:'Variável',k:4,a:'r',f:v=>v?brl(v):'—'},{t:'Total/mês',k:5,a:'r',f:v=>'<b>'+brl(v)+'</b>'}],D.folha.slice(0,6),{foot:['Total','',brl(D.folha[6][2]),brl(D.folha[6][3]),brl(D.folha[6][4]),brl(D.folha[6][5])]}))}
  ${card('Ritmo semanal necessário','O que precisa acontecer em cada semana',`<div class="tw"><table><thead><tr><th>Indicador</th><th class="r">S1</th><th class="r">S2</th><th class="r">S3</th><th class="r">S4</th><th class="r">Mês</th></tr></thead><tbody>${D.ritmo.map(r=>{const m=/Fatur|Invest|Caixa/.test(r[0]);const fx=v=>m?brlk(v):num(v,1);return `<tr><td>${esc(r[0])}</td>${r.slice(1,5).map(v=>`<td class="r">${fx(v)}</td>`).join('')}<td class="r"><b>${fx(r[5])}</b></td></tr>`}).join('')}</tbody></table></div>`)}
 </div>`}

/* ---------- CLIENTES ---------- */
let CF={st:'all',q:'',g:'all'};
function vCli(){const cl=D.clientes;const at=cl.filter(c=>c.st==='ATIVO');
 const mrr=at.reduce((s,c)=>s+c.mrr,0),fat=cl.reduce((s,c)=>s+(c.fat||0),0);
 const gs=[...new Set(cl.map(c=>c.g||'Sem gestor'))];
 return `<div class="grid g4">
  ${kpi('Clientes ativos',num(at.length),'de '+num(cl.length)+' que já passaram pela agência','☺',C.purple)}
  ${kpi('MRR dos ativos',brl(D.kpiAcum.mrr),'receita recorrente mensal','↻',C.indigo)}
  ${kpi('Ticket médio mensal',brl(D.recorrentes[2][1]),'MRR ÷ clientes ativos','$',C.blue)}
  ${kpi('Faturamento gerado',brl(fat),'todos os clientes, desde a abertura','Σ',C.green)}
 </div>
 ${card('Todos os clientes','Clique no título da coluna para ordenar',`<div class="tb"><input class="search" id="q" placeholder="Buscar cliente ou motivo…"><div class="seg" id="segS"><button data-v="all" class="on">Todos · ${cl.length}</button><button data-v="ATIVO">Ativos · ${at.length}</button><button data-v="CHURN">Saíram · ${cl.length-at.length}</button></div><div class="seg" id="segG"><button data-v="all" class="on">Todos os gestores</button>${['Antônio','Caian'].map(g=>`<button data-v="${g}">${g}</button>`).join('')}<button data-v="">Sem gestor</button></div></div><div id="cliT"></div>`,'style="margin-top:16px"')}
 <div class="grid g2" style="margin-top:16px">
  ${card('Entrada de clientes por mês','Novos contratos e saídas',chart('cCl1'))}
  ${card('Pendentes de pagamento da implementação','Valores de entrada ainda em aberto',`<div class="tw"><table><thead><tr><th>Cliente</th><th class="r">Entrada</th><th class="r">Falta</th><th class="r">Contrato</th><th>Restante</th></tr></thead><tbody>${D.pendentes.map(p=>`<tr><td>${esc(p[0])}</td><td class="r">${p[1]?brl(p[1]):'—'}</td><td class="r ${p[2]?'dn':''}">${p[2]?brl(p[2]):'—'}</td><td class="r">${p[3]?brl(p[3]):'—'}</td><td class="muted">${esc(p[4])||'—'}</td></tr>`).join('')}<tr class="tot"><td>Total</td>${[1,2,3].map(k=>`<td class="r">${brl(D.pendentes.reduce((a,p)=>a+(p[k]||0),0))}</td>`).join('')}<td></td></tr></tbody></table></div>`)}
 </div>`}
function drawCli(){let r=D.clientes.filter(c=>(CF.st==='all'||c.st===CF.st)&&(CF.g==='all'||(CF.g===''?!c.g||c.g==='Sem gestor identificado':c.g===CF.g)));
 const q=CF.q.toLowerCase();if(q)r=r.filter(c=>(c.n+' '+c.mot+' '+c.cat).toLowerCase().includes(q));
 const prev=TB.cli;
 document.getElementById('cliT').innerHTML=`<div class="tw lim" id="tw_cli"></div>`;
 TB.cli={cols:[{t:'Cliente',k:'n',f:(v,x)=>`<b>${esc(v)}</b>`},{t:'Status',k:'st',f:v=>chip(v==='ATIVO'?'Ativo':'Saiu',v==='ATIVO'?'g':'r')},{t:'Nicho',k:'nicho',cls:()=>'muted'},{t:'Gestor',k:'g',f:v=>v?esc(v.replace('Sem gestor identificado','—')):'<span class="muted">—</span>'},{t:'Entrada',k:'ent',f:fd},{t:'Saída',k:'sai',f:fd},{t:'MRR',k:'mrr',a:'r',f:v=>brl(v)},{t:'Meses',k:'meses',a:'r',f:v=>num(v)},{t:'Faturamento',k:'fat',a:'r',f:v=>brl(v)},{t:'Motivo da saída',k:'mot',f:(v,x)=>v?`<span class="muted" title="${esc(x.cat)}">${esc(v.length>48?v.slice(0,46)+'…':v)}</span>`:''}],rows:r,opt:{foot:['Total · '+r.length+' clientes','','','','','',brl(r.filter(x=>x.st==='ATIVO').reduce((s,x)=>s+x.mrr,0))+' <span class="muted">ativos</span>','',brl(r.reduce((s,x)=>s+(x.fat||0),0)),'']},sort:prev?prev.sort:6,dir:prev?prev.dir:-1};
 document.getElementById('tw_cli').innerHTML=renderTable('cli')}
function cCli(){drawCli();
 document.getElementById('q').oninput=e=>{CF.q=e.target.value;drawCli()};
 const seg=(id,key)=>document.querySelectorAll('#'+id+' button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#'+id+' button').forEach(x=>x.classList.toggle('on',x===b));CF[key]=b.dataset.v;drawCli()});
 seg('segS','st');seg('segG','g');
 const s=D.saldo;
 mk('cCl1',{type:'bar',data:{labels:s.map(x=>fm(x.m)),datasets:[{label:'Entradas',data:s.map(x=>x.ent),backgroundColor:C.green+'cc',borderRadius:6,maxBarThickness:22},{label:'Saídas',data:s.map(x=>-x.sai),backgroundColor:C.red+'aa',borderRadius:6,maxBarThickness:22},{type:'line',label:'Ativos no fim do mês',data:s.map(x=>x.fim),borderColor:C.purple,tension:.35,pointRadius:3,borderWidth:2.5}]},options:{scales:{x:xG,y:{grid:{color:'rgba(255,255,255,.05)'},border:{display:false}}},plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>' '+c.dataset.label+': '+num(Math.abs(c.parsed.y))}}}}});
}

/* ---------- CHURN ---------- */
function vChurn(){const o=D.churnOut,pc=D.pc,p=D.perm,ca=Object.fromEntries(D.churnAcum),L=D.churnListas;
 const lst=(t,rows,col,lab)=>card(t,rows.length+' clientes',`<div class="tw" style="max-height:420px"><table><thead><tr><th>Cliente</th><th>${lab}</th><th class="r">MRR</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r[0])}</td><td class="muted">${fd(r[2])}</td><td class="r">${brl(r[3])}</td></tr>`).join('')}<tr class="tot"><td>Total</td><td></td><td class="r">${brl(rows.reduce((s,r)=>s+(r[3]||0),0))}</td></tr></tbody></table></div>`);
 return `<div class="grid g6">
  ${kpi('Ativos hoje',num(D.kpiAcum.ativos),'MRR de '+brl(D.kpiAcum.mrr),'☺',C.purple)}
  ${kpi('Saídas em out',num(o.sai),'churn de '+pct(o.pct)+' · '+brl(o.mrrPerd)+' de MRR','−',C.red,'dn')}
  ${kpi('Entradas em out',num(o.ent),'na lista de churn mensal','+',C.green)}
  ${kpi('Saídas em nov',num(D.churnNov.sai),'parcial · churn de '+pct(D.churnNov.pct),'−',C.red,'dn')}
  ${kpi('Entradas em nov',num(D.churnNov.ent),'parcial · na lista de novembro','+',C.green)}
  ${kpi('Churn acumulado',pct(ca['% de churn acumulado']),num(ca['Clientes perdidos'])+' clientes perdidos','↺',C.pink,'dn')}
 </div>
 <div class="grid g2" style="margin-top:16px">
  ${card('Churn mês a mês','% de clientes e de receita perdidos sobre a base do início do mês',chart('cCh1'))}
  ${card('MRR: entra e sai','MRR novo, perdido e saldo no fim do mês',chart('cCh2'))}
 </div>
 <div class="grid g3" style="margin-top:16px">
  ${card('Quando o cliente sai','Tempo de permanência de quem cancelou',chart('cCh3','sm')+mini([['Permanência média',num(p.media,1)+' meses'],['Permanência mediana',num(p.mediana,0)+' meses']])+`<div class="note r">${num(p.m1+p.m2)} de ${num(p.m1+p.m2+p.m36+p.m712+p.m12)} cancelamentos acontecem até o 2º mês.</div>`)}
  ${card('Motivos categorizados','Histórico completo de saídas',chart('cCh4','sm')+`<div class="note w">Em ${num(D.motivosCat.find(m=>m[0]==='Não informado')?.[1]||0)} saídas o motivo não foi registrado.</div>`)}
  ${card('Churn acumulado','Desde a abertura',mini([['Clientes perdidos',num(ca['Clientes perdidos'])],['MRR perdido',brl(ca['MRR perdido'])],['Faturamento gerado pelos perdidos',brl(ca['Faturamento gerado pelos perdidos'])],['Retenção acumulada',pct(ca['Taxa de retenção acumulada'])],['Vida média dos perdidos',num(ca['Tempo de vida médio dos perdidos (meses)'],1)+' meses'],['LTV realizado por perdido',brl(ca['LTV realizado por cliente perdido'])],['LTV projetado',brl(ca['LTV projetado (ticket × tempo de vida)'])],['LTV / CAC',num(ca['LTV / CAC'],1)+'×']]))}
 </div>
 ${sec('Outubro em nomes','último mês fechado · novembro está na tela Novembro em andamento')}
 <div class="grid g3">${lst('Saíram em outubro',L.churn,C.red,'Saída')}${lst('Entraram em outubro',L.entradas,C.green,'Entrada')}${lst('Ativos no início do mês',L.inicio,C.purple,'Entrada')}</div>
 ${sec('Histórico mensal','base no 1º dia de cada mês')}
 ${card('','',table('chh',[{t:'Mês',k:'m',f:fm},{t:'Ativos início',k:'ini',a:'r',f:v=>num(v)},{t:'Entradas',k:'ent',a:'r',f:v=>num(v)},{t:'Saídas',k:'sai',a:'r',f:v=>num(v)},{t:'Ativos fim',k:'fim',a:'r',f:v=>v==null?'<span class="muted">em curso</span>':'<b>'+num(v)+'</b>'},{t:'Churn %',k:'pct',a:'r',f:v=>pct(v)},{t:'MRR novo',k:'mrrNovo',a:'r',f:brl},{t:'MRR perdido',k:'mrrPerd',a:'r',f:v=>`<span class="${v?'dn':''}">${brl(v)}</span>`},{t:'MRR fim',k:'mrrFim',a:'r',f:v=>v==null?'<span class="muted">em curso</span>':'<b>'+brl(v)+'</b>'},{t:'Revenue churn',k:'rpct',a:'r',f:v=>pct(v)},{t:'Retenção',k:'ret',a:'r',f:v=>pct(v,0)}],D.saldo.map((s,i)=>({...s,pct:D.churnHist[i].pct,rpct:D.churnHist[i].rpct,ret:D.churnHist[i].ret})),{foot:['Total','',num(D.saldo.reduce((a,x)=>a+(x.ent||0),0)),num(D.saldo.reduce((a,x)=>a+(x.sai||0),0)),'',pct(D.churnHistTot.pct),brl(D.saldo.reduce((a,x)=>a+(x.mrrNovo||0),0)),brl(D.saldo.reduce((a,x)=>a+(x.mrrPerd||0),0)),'',pct(D.churnHistTot.rpct),pct(D.churnHistTot.ret,0)]}))}
 <div class="note">O churn % usa a base do 1º dia do mês: quem entrou e saiu no próprio mês não entra no cálculo. A coluna Saídas conta todas as saídas.</div>`}
function cChurn(){const h=D.churnHist.slice(2,11),s=D.saldo;
 mk('cCh1',{type:'line',data:{labels:h.map(x=>fm(x.m)),datasets:[{label:'Churn de clientes',data:h.map(x=>x.pct),borderColor:C.pink,backgroundColor:c=>grad(c.chart.ctx,C.pink,.25),fill:true,tension:.35,pointRadius:4},{label:'Revenue churn',data:h.map(x=>x.rpct),borderColor:C.orange,tension:.35,pointRadius:3,borderDash:[5,4]}]},options:{scales:{x:xG,y:yPct},plugins:{tooltip:ttPct,legend:{position:'bottom'}}}});
 mk('cCh2',{type:'bar',data:{labels:s.map(x=>fm(x.m)),datasets:[{label:'MRR novo',data:s.map(x=>x.mrrNovo),backgroundColor:C.green+'bb',borderRadius:6,maxBarThickness:22},{label:'MRR perdido',data:s.map(x=>-x.mrrPerd),backgroundColor:C.red+'aa',borderRadius:6,maxBarThickness:22},{type:'line',label:'MRR fim',data:s.map(x=>x.mrrFim),borderColor:C.indigo,tension:.35,pointRadius:3,borderWidth:2.5}]},options:{scales:{x:xG,y:yBRL},plugins:{tooltip:{callbacks:{label:c=>' '+c.dataset.label+': '+brl(Math.abs(c.parsed.y))}},legend:{position:'bottom'}}}});
 const p=D.perm;
 mk('cCh3',{type:'bar',data:{labels:['1º mês','2º mês','3–6 meses','7–12 meses','12+'],datasets:[{label:'Saídas',data:[p.m1,p.m2,p.m36,p.m712,p.m12],backgroundColor:[C.red,C.pink,C.orange,C.yellow,C.green],borderRadius:6,maxBarThickness:40}]},options:{scales:{x:xG,y:{grid:{color:'rgba(255,255,255,.05)'},border:{display:false}}},plugins:{legend:{display:false}}}});
 const mc=D.motivosCat.filter(m=>m[1]>0).sort((a,b)=>b[1]-a[1]);
 mk('cCh4',{type:'doughnut',data:{labels:mc.map(m=>m[0]),datasets:[{data:mc.map(m=>m[1]),backgroundColor:mc.map(m=>m[0]==='Não informado'?'rgba(255,255,255,.2)':null).map((c,i)=>c||[C.pink,C.orange,C.purple,C.blue,C.teal][i%5]),borderWidth:0,spacing:3,borderRadius:5}]},options:{cutout:'64%',plugins:{legend:{position:'bottom',labels:{font:{size:11}}}}}});
}

/* ---------- GESTORES ---------- */
function vGest(){const g=D.gestores;
 const cen=c=>`<div class="tw"><table><thead><tr><th>Cenário</th><th class="r">Renovação</th><th class="r">Clientes</th><th class="r">MRR renovado</th><th class="r">MRR perdido</th><th class="r">Receita no ciclo</th></tr></thead><tbody>${c.map(r=>`<tr class="${/MÉDIA/.test(r[0])?'tot':''}"><td>${esc(r[0])}</td><td class="r">${pct(r[1],0)}</td><td class="r">${num(r[2],0)}</td><td class="r">${brl(r[3])}</td><td class="r ${r[4]?'dn':''}">${brl(r[4])}</td><td class="r"><b>${brl(r[5])}</b></td></tr>`).join('')}</tbody></table></div>`;
 const ST=Object.fromEntries(D.clientes.map(c=>[c.n,c.st]));
 const lst=(id,c)=>table(id,[{t:'Cliente',k:'n'},{t:'Status hoje',k:'st',f:v=>v?chip(v==='ATIVO'?'Ativo':'Saiu',v==='ATIVO'?'g':'r'):'<span class="muted">sem dados</span>'},{t:'Entrada',k:'ent',f:fd},{t:'Saída',k:'sai',f:fd},{t:'MRR',k:'mrr',a:'r',f:brl},{t:'Meses',k:'meses',a:'r',f:v=>num(v)},{t:'Faturamento',k:'fat',a:'r',f:brl}],c.lista.map(x=>({...x,st:ST[x.n]||x.st})),{foot:['Total · '+num(c.tot.qtd)+' selecionadas','','','',brl(c.tot.mrr),num(c.tot.meses,1),brl(c.tot.fat)]});
 return `<div class="grid g4">${g.map((x,i)=>kpi(x.g==='TOTAL'?'Total da base':x.g,num(x.ativos)+' ativos',brl(x.mrr)+' de MRR · '+pct(x.mrr/g[3].mrr,0)+' da base',['◆','◆','?','Σ'][i],[C.teal,C.blue,C.gray,C.purple][i])).join('')}</div>
 <div class="grid g12" style="margin-top:16px">
  ${card('MRR por gestor','Clientes ativos hoje',chart('cGs1'))}
  ${card('Ativos por gestor','Cruzamento da base de clientes com as carteiras',`<div class="tw"><table><thead><tr><th>Gestor</th><th class="r">Ativos</th><th class="r">MRR</th><th class="r">% da base</th></tr></thead><tbody>${g.map((x,i)=>`<tr class="${i===3?'tot':''}"><td>${esc(x.g==='TOTAL'?'Total':x.g)}</td><td class="r">${num(x.ativos)}</td><td class="r">${brl(x.mrr)}</td><td class="r">${pct(x.mrr/g[3].mrr,0)}</td></tr>`).join('')}</tbody></table></div><div class="note w">As abas de carteira (ATIVOS GESTORES e ATIVOS - ANTONIO PEDRO) não mudaram nesta versão da planilha. O status de cada cliente abaixo vem da aba CLIENTES; os novos clientes de novembro ainda não foram atribuídos a um gestor.</div>`)}
 </div>
 ${sec('Kaiam','carteira e projeção de renovação')}
 <div class="grid">${card('Carteira do Kaiam','',lst('tk',D.kaiam))}${card('Cenários de renovação','Ciclo de 3 meses',cen(D.kaiam.cen)+`<div class="note r">Das 15 selecionadas, 3 renovaram e 12 não. MRR perdido de ${brl(27370)}.</div>`)}</div>
 ${sec('Antônio Pedro','carteira nova e carteira base')}
 <div class="grid">${card('Carteira nova · 10 clientes','Entraram a partir de setembro',lst('ta',D.antonioNovos))}${card('Cenários de renovação','Ciclo de 3 meses',cen(D.antonioNovos.cen))}</div>
 ${card('Carteira base do Antônio','Clientes mais antigos sob gestão',lst('tb2',D.antonioBase),'style="margin-top:16px"')}`}
function cGest(){const g=D.gestores.slice(0,3);
 mk('cGs1',{type:'doughnut',data:{labels:g.map(x=>x.g),datasets:[{data:g.map(x=>x.mrr),backgroundColor:[C.teal,C.blue,'rgba(255,255,255,.2)'],borderWidth:0,spacing:3,borderRadius:6}]},options:{cutout:'66%',plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>' '+c.label+': '+brl(c.parsed)}}}}});
}


/* ---------- DRAS ---------- */
function vDras(){const d=D.dras;const tot=d.reduce((s,x)=>s+(x.rec||0),0),ac=d.reduce((s,x)=>s+(x.acum||0),0);
 return `<div class="grid g4">
  ${kpi('Doutoras atendidas',num(d.length),'comercial terceirizado','✚',C.mint)}
  ${kpi('Receita mensal',brl(tot),'mensalidades fixas','$',C.blue)}
  ${kpi('Receita acumulada',brl(ac),'desde a implantação','Σ',C.green)}
  ${kpi('Lançado em nov',brl(D.dre.find(r=>r.l==='Receita de Atendimento (Dras)').v[CUR]),'no DRE consolidado (parcial)','◷',C.purple)}
 </div>
 <div class="grid g21" style="margin-top:16px">
  ${card('Contratos','',table('dr',[{t:'Dra',k:'n',f:v=>'<b>'+esc(v)+'</b>'},{t:'Modelo',k:'mod',f:v=>chip(v==='FIXO'?'Fixo':'% faturamento',v==='FIXO'?'b':'p')},{t:'Fixo',k:'fixo',a:'r',f:v=>v?brl(v):'—'},{t:'% fat.',k:'pct',a:'r',f:v=>v?pct(v,0):'—'},{t:'Receita/mês',k:'rec',a:'r',f:brl},{t:'Implantação',k:'impl',f:fd},{t:'Meses',k:'meses',a:'r',f:v=>num(v)},{t:'Acumulado',k:'acum',a:'r',f:v=>'<b>'+brl(v)+'</b>'}],d,{foot:['Total · '+d.length,'','','',brl(tot),'',num(d.reduce((a,x)=>a+(x.meses||0),0)/d.length,1),brl(ac)]}))}
  ${card('Premissas','',mini([['Mensalidade fixa',brl(1290)],['% sobre o faturamento da dra',pct(.1,0)],['Escopo','Comercial + atendimento']])+`<div class="note w">YASMIM e GEISI pagam 10% sobre o faturamento, mas o faturamento delas não foi preenchido na planilha, então a receita aparece zerada.</div>`)}
 </div>`}


/* ---------- FECHAMENTO DO MÊS ---------- */
function MES(k){const cl=Object.fromEntries(D.clientes.map(c=>[c.n,c]));
 if(k==='out'){const L=D.churnListas,o=D.churnOut;return {k,nome:'outubro',Nome:'Outubro',m:D.mesOut,ent:L.entradas,sai:L.churn.map(r=>[...r,(cl[r[0]]||{}).mot||'']),ini:o.ini,nSai:o.sai,pct:o.pct,mrrIni:o.mrrIni,mrrFim:o.mrrFim,fimLbl:'MRR no fim do mês',parcial:false,cl}}
 const n=D.churnNov;return {k,nome:'novembro',Nome:'Novembro',m:D.mesNov,ent:n.entradas,sai:n.churn,ini:n.ini,nSai:n.sai,pct:n.pct,mrrIni:n.mrrIni,mrrFim:D.kpiAcum.mrr,fimLbl:'MRR hoje',parcial:true,cl}}
function vFech(k='out'){const X=MES(k),cl=X.cl,ac=X.m.acomp,dre=X.m.dreSem;
 const novosDRE=ac.find(a=>a[0]==='Clientes novos')[2];
 const mrrNovo=X.ent.reduce((s,r)=>s+(r[3]||0),0),mrrPerd=X.sai.reduce((s,r)=>s+(r[3]||0),0);
 const fatPerd=X.sai.reduce((s,r)=>s+((cl[r[0]]||{}).fat||0),0);
 const contratos=ac.find(a=>a[0]==='Contratos novos')[2];
 const W=n=>dre.find(r=>r.l===n);
 const rec=W('RECEITA TOTAL').t,des=W('DESPESA TOTAL').t,lo=W('LUCRO OPERACIONAL').t,pl=dre.find(r=>/Pró-labore/.test(r.l)).t,cp=dre.find(r=>/Comissão Pedro/.test(r.l)).t,cx=W('CAIXA DA EMPRESA').t,mg=W('MARGEM (Caixa) %').t;
 const saldo=novosDRE-X.nSai,saldoMrr=mrrNovo-mrrPerd;
 const motivo=m=>m?esc(m.replace(/\(A DEFINIR\)/,'A definir')):'<span class="muted">não registrado</span>';
 const pz=X.parcial?` <span class="chip c-o">parcial · dia ${num(X.m.pace)} de ${num(X.m.dias)}</span>`:'';
 return `${X.parcial?`<div class="note w" style="margin:0 0 16px">Mês em andamento: números lançados até ${num(X.m.pace)}/11. O DRE mensal registra ${num(novosDRE)} vendas e ${num(ac.find(a=>/Churn/.test(a[0]))[2])} churn, mas a aba CHURN MENSAL NOVEMBRO lista ${num(X.ent.length)} entradas e ${num(X.sai.length)} saídas — os cards abaixo usam cada fonte como indicado.</div>`:''}
 <div class="grid g4">
  ${kpi('Clientes que entraram',num(novosDRE),'vendas fechadas (DRE) · '+brl(contratos)+' em contratos','+',C.green,'up')}
  ${kpi('Clientes que saíram',num(X.nSai),'churn de '+pct(X.pct)+' sobre os '+num(X.ini)+' do início do mês','−',C.red,'dn')}
  ${kpi('Saldo de clientes',(saldo>0?'+':'')+num(saldo),num(novosDRE)+' entradas − '+num(X.nSai)+' saídas','=',C.orange,saldo<0?'dn':'up')}
  ${kpi('Receita recorrente perdida',brl(mrrPerd),'por mês, com as '+num(X.sai.length)+' saídas da lista','↓',C.pink,'dn')}
 </div>
 <div class="grid g4" style="margin-top:16px">
  ${kpi('MRR que entrou',brl(mrrNovo),num(X.ent.length)+' clientes com nome na lista','↑',C.green)}
  ${kpi('Saldo de MRR',(saldoMrr>0?'+':'')+brl(saldoMrr),'entrou − saiu por mês','≈',C.orange,saldoMrr<0?'dn':'up')}
  ${kpi('Faturamento já gerado por quem saiu',brl(fatPerd),'o que esses clientes pagaram até sair','Σ',C.purple)}
  ${kpi(X.fimLbl,brl(X.mrrFim),'começou '+X.nome+' em '+brl(X.mrrIni),'↻',C.indigo)}
 </div>
 ${sec('Quem entrou e quem saiu',X.nome+'/2026'+pz)}
 <div class="grid g2">
  ${card('Entraram em '+X.nome,num(novosDRE)+' vendas fechadas · '+num(X.ent.length)+' com nome na lista de churn mensal',`<div class="tw"><table><thead><tr><th>Cliente</th><th>Entrada</th><th class="r">MRR</th></tr></thead><tbody>${X.ent.map(r=>`<tr><td><b>${esc(r[0])}</b></td><td class="muted">${r[2]?fd(r[2]):'sem data'}</td><td class="r up">${brl(r[3])}</td></tr>`).join('')}${novosDRE>X.ent.length?`<tr><td colspan="3" class="muted">+ ${novosDRE-X.ent.length} venda${novosDRE-X.ent.length>1?'s':''} sem nome na lista</td></tr>`:''}<tr class="tot"><td>Total</td><td></td><td class="r">${brl(mrrNovo)}</td></tr></tbody></table></div>`)}
  ${card('Saíram em '+X.nome,num(X.sai.length)+' clientes · '+brl(mrrPerd)+' de MRR perdido',`<div class="tw"><table><thead><tr><th>Cliente</th><th>Saída</th><th class="r">Meses</th><th class="r">MRR</th><th>Motivo</th></tr></thead><tbody>${X.sai.map(r=>`<tr><td><b>${esc(r[0])}</b></td><td class="muted">${fd(r[2])}</td><td class="r">${num((cl[r[0]]||{}).meses)}</td><td class="r dn">${brl(r[3])}</td><td class="wrap" style="min-width:150px;font-size:12px">${motivo(r[4])}</td></tr>`).join('')}<tr class="tot"><td>Total</td><td></td><td></td><td class="r">${brl(mrrPerd)}</td><td></td></tr></tbody></table></div>`)}
 </div>
 ${sec('Resultado do mês','DRE mensal de '+X.nome+(X.parcial?' · parcial':''))}
 <div class="grid g6">
  ${kpi('Receita total',brl(rec),pct(rec/100000,0)+' da meta de R$ 100.000','$',C.blue)}
  ${kpi('Despesas',brl(des),pct(des/rec)+' da receita'+(X.parcial?' · já inclui semanas 3 e 4':''),'−',C.orange)}
  ${kpi('Lucro operacional',brl(lo),pct(lo/rec)+' da receita','≈',C.mint)}
  ${kpi('Pró-labore',brl(pl),'15% do faturamento','◆',C.purple)}
  ${kpi('Comissão Pedro',brl(cp),'15% do lucro após pró-labore','◆',C.indigo)}
  ${kpi('Caixa da empresa',brl(cx),'margem de '+pct(mg),'✓',C.green,cx<0?'dn':'up')}
 </div>
 <div class="grid g21" style="margin-top:16px">
  ${card('Da receita ao caixa','Como os R$ '+num(rec)+' viraram caixa',chart('cFe1','lg'))}
  ${card('Funil comercial','Leads até vendas',funnel([['Leads',ac[1][2],C.blue],['Reuniões agendadas',ac[2][2],C.indigo],['Reuniões realizadas',ac[3][2],C.purple],['Vendas fechadas',ac[4][2],C.pink]])+mini([['Investimento em tráfego',brl(ac[0][2])],['CAC por venda',brl(ac[4][2]?ac[0][2]/ac[4][2]:null)],['Ticket médio dos contratos',brl(ac[4][2]?contratos/ac[4][2]:null)]]))}
 </div>
 ${card('DRE de '+X.nome+' semana a semana','',matrix(dre,['Sem 1','Sem 2','Sem 3','Sem 4'],{tot:'Total mês',pct:true,first:'Conta'}),'style="margin-top:16px"')}`}
function cFech(k='out'){const dre=MES(k).m.dreSem;const W=n=>dre.find(r=>r.l===n||(n.test&&n.test(r.l))).t;
 const rec=W('RECEITA TOTAL'),fol=W('Folha de Pagamento'),tra=W('Tráfego pago'),des=W('DESPESA TOTAL'),pl=W(/Pró-labore/),cp=W(/Comissão Pedro/),cx=W('CAIXA DA EMPRESA');
 const outras=des-fol-tra;
 const steps=[['Receita',rec,'+'],['Folha',-fol],['Tráfego pago',-tra],['Outras despesas',-outras],['Pró-labore',-pl],['Comissão Pedro',-cp],['Caixa',cx,'=']];
 let acc=0;const data=steps.map(([l,v,t])=>{if(t){acc=v;return [0,v]}const a=acc;acc+=v;return [acc,a]});
 mk('cFe1',{type:'bar',data:{labels:steps.map(s=>s[0]),datasets:[{label:'Valor',data,backgroundColor:steps.map(s=>s[2]==='+'?C.blue:s[2]==='='?C.green:C.red+'cc'),borderRadius:6,maxBarThickness:54}]},options:{scales:{x:xG,y:yBRL},plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' '+brl(steps[c.dataIndex][1])}}}}});
}
/* ================= ROUTER ================= */
const R={fech:[()=>vFech('out'),()=>cFech('out')],mes:[()=>vFech('nov')+vMes(),()=>{cFech('nov');cMes()}],geral:[vGeral,cGeral],alertas:[vAlertas,cAlertas],dre:[vDre,cDre],caixa:[vCaixa,cCaixa],tend:[vTend,()=>cTend(false)],meta:[vMeta,cMeta],plano:[vPlano,()=>{}],cli:[vCli,cCli],churn:[vChurn,cChurn],gest:[vGest,cGest],dras:[vDras,()=>{}]};
function show(id){const v=VIEWS.find(x=>x.id===id)||VIEWS[0];
 Object.values(CH).forEach(c=>c.destroy());for(const k in CH)delete CH[k];
 document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('on',b.dataset.v===v.id));
 document.getElementById('ttl').textContent=v.t;document.getElementById('tsub').textContent=v.s;
 const el=document.getElementById('views');el.innerHTML=`<div class="view on">${R[v.id][0]()}</div>`;
 el.querySelectorAll('.reveal').forEach((x,i)=>x.style.animationDelay=Math.min(i*45,600)+'ms');
 R[v.id][1]();
 requestAnimationFrame(()=>setTimeout(()=>{el.querySelectorAll('.bar i').forEach(b=>b.style.width=b.dataset.w);el.querySelectorAll('circle[data-o]').forEach(c=>c.style.strokeDashoffset=c.dataset.o)},80));
 try{history.replaceState(null,'','#'+v.id)}catch(e){}
 document.getElementById('side').classList.remove('open');document.getElementById('scrim').classList.remove('on');
 __root.scrollTo({top:0,behavior:'instant'});
}
(function(){let g='',h='';VIEWS.forEach(v=>{if(v.g!==g){g=v.g;h+=`<div class="ng">${g}</div>`}const b=v.badge?v.badge():0;h+=`<button class="nav" data-v="${v.id}"><span class="ni" style="background:linear-gradient(145deg,${v.c},${v.c}99);${[C.indigo,C.purple].includes(v.c)?'color:#141418':''}">${v.ic}</span>${v.t}${b?`<span class="bd">${b}</span>`:''}</button>`});
 document.getElementById('navs').innerHTML=h;document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>show(b.dataset.v));
 document.getElementById('upd').textContent=D.atualizado;
 document.getElementById('mb').onclick=()=>{document.getElementById('side').classList.add('open');document.getElementById('scrim').classList.add('on')};
 document.getElementById('scrim').onclick=()=>{document.getElementById('side').classList.remove('open');document.getElementById('scrim').classList.remove('on')};
 show((location.hash||'#mes').slice(1));
})();

/* ---------- brand chevrons & streaks ---------- */
(function(){const fx=document.getElementById('fx');let h='';
 for(let i=0;i<9;i++){const w=40+Math.random()*130,top=Math.random()*92,o=(.10+Math.random()*.28).toFixed(2),bl=w<70?0:Math.round(Math.random()*2);
  h+=`<div class="chev" style="top:${top}vh;width:${w}px;height:${w*1.25}px;--o:${o};--d:${(9+Math.random()*12).toFixed(1)}s;--dl:-${(Math.random()*20).toFixed(1)}s;filter:blur(${bl}px)"><svg viewBox="0 0 160 200"><defs><linearGradient id="cg${i}" x1="0" x2="1"><stop offset="0" stop-color="#ff2d2d" stop-opacity=".1"/><stop offset="1" stop-color="#ff2d2d"/></linearGradient></defs><polygon points="0,0 160,100 0,200 128,100" fill="url(#cg${i})"/></svg></div>`}
 for(let i=0;i<7;i++){const a=(i%2?1:-1)*(28+Math.random()*12);h+=`<i class="streak" style="top:${Math.random()*100}vh;--a:${a.toFixed(1)}deg;--o:${(.35+Math.random()*.5).toFixed(2)};--d:${(6+Math.random()*8).toFixed(1)}s;--dl:-${(Math.random()*12).toFixed(1)}s"></i>`}
 fx.insertAdjacentHTML('beforeend',h);
})();
/* ---------- particle network ---------- */
(function(){const cv=document.getElementById('net'),x=cv.getContext('2d');let W,H,P=[];const dpr=Math.min(2,window.devicePixelRatio||1);
 function rs(){W=cv.width=innerWidth*dpr;H=cv.height=innerHeight*dpr;cv.style.width=innerWidth+'px';cv.style.height=innerHeight+'px';const n=Math.round(Math.min(70,innerWidth/22));P=Array.from({length:n},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.25*dpr,vy:(Math.random()-.5)*.25*dpr}))}
 rs();addEventListener('resize',rs);
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 (function f(){x.clearRect(0,0,W,H);const L=140*dpr;for(let i=0;i<P.length;i++){const a=P[i];a.x+=a.vx;a.y+=a.vy;if(a.x<0||a.x>W)a.vx*=-1;if(a.y<0||a.y>H)a.vy*=-1;x.fillStyle=i%5?'rgba(255,255,255,.45)':'rgba(255,60,60,.8)';x.beginPath();x.arc(a.x,a.y,1.3*dpr,0,7);x.fill();for(let j=i+1;j<P.length;j++){const b=P[j],d=Math.hypot(a.x-b.x,a.y-b.y);if(d<L){x.strokeStyle=`rgba(255,80,80,${(1-d/L)*.13})`;x.lineWidth=dpr*.7;x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b.x,b.y);x.stroke()}}}requestAnimationFrame(f)})();
})();

  return () => {
    alive.v = false;
    cleanups.forEach((f) => f());
    try { Object.values(CH).forEach((c) => c.destroy()); } catch (e) {}
  };
}
