/* 시대연결 — standalone offline study app. No third-party services required. */
(() => {
'use strict';
const DATA = window.HISTORY_DATA;
if (!DATA) { document.getElementById('app').textContent = '학습 데이터를 불러오지 못했습니다.'; return; }
const $ = s => document.querySelector(s);
const app = $('#app');
const DBKEY = 'history-master-v1';
const todayISO = () => { const d = new Date(); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); };
const defaultDB = () => ({ day:1, srs:{}, answers:[], sessions:[], mastered:[], orderWins:0, created:todayISO(), lastStudy:null, cardRatings:[], orderAttempts:[], resume:null });
let db = defaultDB();
try { const saved = JSON.parse(localStorage.getItem(DBKEY) || 'null'); if (saved && typeof saved==='object') db={...defaultDB(),...saved}; } catch(e) {}
const save = (studied=false) => {
  if(studied)db.lastStudy=todayISO();
  db.resume={...state};
  try {localStorage.setItem(DBKEY, JSON.stringify(db));}
  catch(e){toast('학습 기록을 저장할 수 없어. 백업 파일로 기록을 보관해 줘.');}
};
const esc = s => String(s??'').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fmt = n => Number(n).toLocaleString('ko-KR');
const uniq = items => [...new Set(items)];
const shuffle = xs => {const a=[...xs];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const sample = (arr,n) => shuffle(arr).slice(0,n);
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const dateAdd = days => {const d=new Date();d.setDate(d.getDate()+days);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
const categories = {politics:'정치·외교',democracy:'민주화·시민',economy:'경제·산업',war:'전쟁·충돌',culture:'사회·문화',world:'부록 세계사'};
const icons={home:'<path d="M3 10.5 12 3l9 7.5V21H4V10.5"/><path d="M9 21v-7h6v7"/>',timeline:'<path d="M4 6h16M4 12h16M4 18h16"/><path d="M7 4v4M12 10v4M17 16v4"/>',cards:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 13h5"/>',quiz:'<path d="M5 4h14v16H5z"/><path d="m8 10 2 2 4-4M8 16h8"/>',order:'<path d="M4 6h16M4 12h11M4 18h7"/><path d="m16 15 3 3 3-3"/>',stats:'<path d="M4 20V9m5 11V4m5 16v-7m5 7V7"/>',arrow:'<path d="m5 12 14 0m-6-6 6 6-6 6"/>',refresh:'<path d="M3 12a9 9 0 0 1 15.6-6M21 12a9 9 0 0 1-15.6 6"/><path d="M19 2v5h-5M5 22v-5h5"/>',check:'<path d="m4 12 5 5L20 6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',filter:'<path d="M4 6h16M7 12h10m-7 6h4"/>',book:'<path d="M3 5c3-2 6-2 9 0 3-2 6-2 9 0v15c-3-2-6-2-9 0-3-2-6-2-9 0V5zM12 5v15"/>',chevron:'<path d="m9 6 6 6-6 6"/>',trophy:'<path d="M7 4h10v8a5 5 0 0 1-10 0V4zM7 6H4v3a3 3 0 0 0 3 3m10-6h3v3a3 3 0 0 1-3 3M12 17v4M8 21h8"/>',close:'<path d="m5 5 14 14M19 5 5 19"/>'};
const ic=(name,size=18)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.book}</svg>`;
const guideTab={id:'guide',label:'정부·인물 정리',icon:'book'};
const tabs=[{id:'home',label:'대시보드',icon:'home'},{id:'timeline',label:'연표 탐색',icon:'timeline'},{id:'cards',label:'플래시카드',icon:'cards'},{id:'quiz',label:'문제풀이',icon:'quiz'},{id:'order',label:'순서 배열',icon:'order'},{id:'stats',label:'학습 기록',icon:'stats'}];
const initialState=()=>({tab:'home',timelineUnit:'all',timelineType:'all',query:'',includeWorld:false,includeOld:false,flashScope:'day',flashQueue:[],flashAt:0,flashFlipped:false,quizSetupScope:'day',quizDifficulty:'all',quizKind:'all',quizLength:10,quiz:null,orderScope:'day',orderList:[],orderChecked:false,orderResult:'',recentFilter:'all',quizDraft:'',timelineDay:'all',flashMode:'sequence',flashDirection:'event',flashRated:[]});
let state=initialState();
const eventById = Object.fromEntries(DATA.events.map(e=>[e.id,e]));
const stableRank=(key)=>{
  let value=2166136261;
  for(const character of key)value=Math.imul(value^character.codePointAt(0),16777619);
  return value>>>0;
};
const datedEvents=DATA.events.filter(e=>/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(e.date));
const questionsDynamic=datedEvents.flatMap(event=>{
  const correctTitles=new Set(datedEvents.filter(candidate=>candidate.year===event.year).map(candidate=>candidate.title));
  const eligible=datedEvents.filter(candidate=>candidate.world===event.world&&!correctTitles.has(candidate.title));
  const order=candidate=>[(candidate.unit!==event.unit?25:0)+(candidate.cat!==event.cat?8:0)+Math.abs(candidate.year-event.year),stableRank(event.id+candidate.id)];
  eligible.sort((a,b)=>{const [ax,ay]=order(a),[bx,by]=order(b);return ax-bx||ay-by;});
  const distractors=uniq(eligible.map(candidate=>candidate.title)).slice(0,4);
  if(distractors.length<4)return [];
  const options=[event.title,...distractors].sort((a,b)=>stableRank(event.id+a)-stableRank(event.id+b));
  return [{id:'y_'+event.id,eventId:event.id,kind:'연표',unit:event.unit,page:event.pages,
    prompt:`교과서 연표 기준 ${event.year}년에 일어난 사건으로 옳은 것은?`,options,answer:options.indexOf(event.title),
    explain:`${event.date} — ${event.title}. ${event.detail}`,difficulty:2,keyword:'연도',year:event.year}];
});
const titleYears=new Map();
for(const event of DATA.events){
  const years=titleYears.get(event.title)||new Set();
  years.add(event.year);
  titleYears.set(event.title,years);
}
const shortQuestions=datedEvents.filter(event=>titleYears.get(event.title).size===1).map(event=>({
  id:'year_input_'+event.id,eventId:event.id,kind:'연도 입력',format:'short',unit:event.unit,page:event.pages,
  prompt:`${event.title}은(는) 몇 년에 일어났을까?`,
  answer:event.year,explain:`${event.date} — ${event.detail}`,difficulty:1
}));
const guides=DATA.guides||[];
const contextQuestions=guides.flatMap(guide=>{
  const peers=guides.filter(item=>item.id!==guide.id&&item.group===guide.group)
    .sort((a,b)=>Number(b.unit===guide.unit)-Number(a.unit===guide.unit)||stableRank(guide.id+a.id)-stableRank(guide.id+b.id));
  const [a,b,c,d]=peers;
  if(!d)return [];
  const base={unit:guide.unit,page:guide.page,topic:guide.id,schoolStyle:true};
  const labels=['ㄱ','ㄴ','ㄷ','ㄹ'];
  const statements=[
    {subject:'(가)',item:guide,correct:true},{subject:'(가)',item:b,correct:false},
    {subject:'(나)',item:c,correct:false},{subject:'(나)',item:a,correct:true}
  ].sort((left,right)=>stableRank(guide.id+left.item.id+left.subject)-stableRank(guide.id+right.item.id+right.subject));
  const correctPair=statements.flatMap((statement,index)=>statement.correct?[labels[index]]:[]).join(', ');
  const pairs=labels.flatMap((label,index)=>labels.slice(index+1).map(other=>label+', '+other));
  const notes=statements.map((statement,index)=>`${labels[index]}은(는) ${statement.item.name}의 활동이다.`).join(' ');
  const questions=[
    {kind:'정책 연결',difficulty:2,prompt:`${guide.name}의 활동으로 알맞은 것은?`,choices:[guide.action,a.action,b.action,c.action,d.action],explain:`${guide.note} 다른 선지는 각각 ${[a,b,c,d].map(item=>item.name).join(', ')}에 해당한다.`},
    {kind:'자료 추론',difficulty:3,material:guide.clue,prompt:'위 단서에 해당하는 정부 또는 인물의 활동으로 가장 적절한 것은?',choices:[guide.action,a.action,b.action,c.action,d.action],explain:`단서가 가리키는 대상은 ${guide.name}이다. ${guide.note} 다른 선지는 각각 ${[a,b,c,d].map(item=>item.name).join(', ')}의 활동이다.`},
    {kind:'보기 조합',difficulty:4,material:`(가) ${guide.clue}\n(나) ${a.clue}\n\n${statements.map((statement,index)=>`${labels[index]}. ${statement.subject} — ${statement.item.action}`).join('\n')}`,prompt:'(가)와 (나)에 해당하는 활동을 바르게 연결한 보기만을 고른 것은?',choices:[correctPair,...pairs.filter(pair=>pair!==correctPair).sort((left,right)=>stableRank(guide.id+left)-stableRank(guide.id+right)).slice(0,4)],explain:`(가)는 ${guide.name}, (나)는 ${a.name}이다. ${notes} ${guide.note}`,page:uniq([guide,a,b,c].flatMap(item=>item.page.split(','))).join(',')}
  ];
  return questions.map(({choices,...question})=>{
    const id=`context_${guide.id}_${question.difficulty}`;
    const options=[...choices].sort((left,right)=>stableRank(id+left)-stableRank(id+right));
    return {...base,...question,id,options,answer:options.indexOf(choices[0])};
  });
});
const schoolTopics={'전후북한':'actor11','경제개발계획':'actor01'};
const authoredQuestions=DATA.questions.map(q=>schoolTopics[q.keyword]||q.kind==='자료 해석'
  ?{...q,schoolStyle:true,topic:schoolTopics[q.keyword]}
  :q);
function teacherQuestions(){
  const evidence=authoredQuestions.filter(q=>q.material).slice(0,5).map(q=>({...q,teacherStyle:true}));
  const generated=guides.flatMap(guide=>{
    const peers=guides.filter(peer=>peer.group===guide.group&&peer.id!==guide.id)
      .sort((a,b)=>Number(b.unit===guide.unit)-Number(a.unit===guide.unit)||stableRank(guide.id+a.id)-stableRank(guide.id+b.id));
    return peers.slice(0,5).map((other,index)=>{
      const id=`teacher_${guide.id}_${other.id}`;
      const third=peers.find(peer=>peer.id!==other.id);
      const pages=uniq([guide,other,third].flatMap(item=>item.page.split(','))).sort((a,b)=>Number(a)-Number(b)).join(',');
      const clues=`자료 요약\n(가) ${guide.clue}\n(나) ${other.clue}`;
      let prompt,material=clues,choices,reason,kind,difficulty;
      if(index%3===0){
        kind='주체 추론';
        difficulty=3;
        prompt='(가)와 (나)에 해당하는 주체를 순서대로 고른 것은?';
        choices=[`${guide.name} / ${other.name}`,`${other.name} / ${guide.name}`,`${third.name} / ${other.name}`,`${guide.name} / ${third.name}`,`${other.name} / ${third.name}`];
        reason=`(가)는 ${guide.name}, (나)는 ${other.name}이다. ${guide.note} ${other.note}`;
      }else if(index%3===1){
        kind='정책 비교';
        difficulty=4;
        prompt='두 자료를 바탕으로 (가)와 (나)의 활동을 바르게 연결한 것은?';
        const pair=(left,right)=>`(가) ${left.action} / (나) ${right.action}`;
        choices=[pair(guide,other),pair(other,guide),pair(third,other),pair(guide,third),pair(other,third)];
        reason=`(가)는 ${guide.name}, (나)는 ${other.name}이다. ${guide.note} ${other.note} ${third.action}은(는) ${third.name}과(와) 연결된다.`;
      }else{
        kind='복합 보기';
        difficulty=4;
        prompt='자료 속 주체와 활동을 바르게 연결한 보기만 고른 것은?';
        const labels=['ㄱ','ㄴ','ㄷ','ㄹ'];
        const statements=[
          ['(가)',guide,true],['(나)',other,true],['(가)',other,false],['(나)',third,false]
        ].sort(([a,x],[b,y])=>stableRank(id+a+x.id)-stableRank(id+b+y.id));
        material+=`\n\n〈보기〉\n${statements.map(([subject,person],i)=>`${labels[i]}. ${subject} — ${person.action}`).join('\n')}`;
        const correct=statements.flatMap((statement,i)=>statement[2]?[labels[i]]:[]).join(', ');
        const distractors=labels.flatMap((label,i)=>labels.slice(i+1).map(next=>label+', '+next))
          .filter(pair=>pair!==correct).sort((a,b)=>stableRank(id+a)-stableRank(id+b)).slice(0,4);
        choices=[correct,...distractors];
        reason=`(가)는 ${guide.name}, (나)는 ${other.name}이다. ${statements.map(([,person],i)=>`${labels[i]}은(는) ${person.name}의 활동이다.`).join(' ')}`;
      }
      const options=[...choices].sort((a,b)=>stableRank(id+a)-stableRank(id+b));
      return {id,kind,difficulty,unit:guide.unit,page:pages,material,prompt,options,answer:options.indexOf(choices[0]),explain:reason,topic:guide.id,teacherStyle:true};
    });
  });
  return [...evidence,...generated].slice(0,100);
}
const teacherBank=teacherQuestions();
const sourceQuestionIds=new Set(authoredQuestions.map(q=>q.id));
const allQuestions=[...authoredQuestions,...questionsDynamic,...shortQuestions,...contextQuestions,...teacherBank.filter(q=>!sourceQuestionIds.has(q.id))];
const difficultyLabel=['','쉬움','보통','어려움','최상위'];
const answerText=q=>q.format==='short'?q.answer+'년':q.options[q.answer];
const questionMap=Object.fromEntries(allQuestions.map(q=>[q.id,q]));
const dayRanges={1:[[76,95]],2:[[96,109]],3:[[110,125]],4:[[126,133],[161,163]]};
function inDay(pages,day){
  if(day===5)return true;
  return String(pages).split(/[,·]/).some(reference=>{
    const numbers=reference.match(/\d+/g)?.map(Number);
    if(!numbers)return false;
    const [start,end=start]=numbers;
    return dayRanges[day].some(([lo,hi])=>start<=hi&&end>=lo);
  });
}
const isDayQuestion=(q,day)=>inDay(q.page,day);
const isDayCard=(e,day)=>inDay(e.pages,day);
const reviewedCards=()=>Object.keys(db.srs).length;
const dueCards=()=>DATA.events.filter(e=>!db.srs[e.id] || db.srs[e.id].due<=todayISO());
const wrongIds=()=>uniq(db.answers.filter(a=>a.type==='quiz'&&!a.correct).map(a=>a.id));
const statsInfo=()=>{const quizzes=db.answers.filter(a=>a.type==='quiz');const total=quizzes.length;const hit=quizzes.filter(a=>a.correct).length;return {total,hit,rate:total?Math.round(hit/total*100):0,reviewed:reviewedCards(),due:dueCards().length};};
const toast=message=>{const box=$('#toast');box.textContent=message;box.classList.add('show');clearTimeout(window.__toastT);window.__toastT=setTimeout(()=>box.classList.remove('show'),2700);};
const track=(type,key,correct)=>{db.answers.push({id:key,type,correct,date:todayISO(),time:Date.now()});save(true);};
const pageHead=(eyebrow,title,desc,cta='')=>`<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1 class="page-title">${title}</h1><p class="page-desc">${desc}</p></div>${cta}</div>`;
const unitOptions=(all=true,more=true)=>`${all?'<option value="all">전 범위</option>':''}${DATA.units.filter(u=>more||u.id!=='world').map(u=>`<option value="${u.id}">${u.short} · p.${u.pages}</option>`).join('')}`;
const accuracyBar=(correct,total)=>`<div class="progress-line"><span style="width:${total?correct/total*100:0}%"></span></div>`;
const dayTitle={1:'광복과 6·25 전쟁',2:'민주화의 길',3:'경제 성장과 사회문화',4:'민주화 이후·부록 연표',5:'전 범위 최종 점검'};
const dayPages={1:'교과서 76–95쪽',2:'96–109쪽',3:'110–125쪽',4:'126–133, 161–163쪽',5:'전체 범위'};
const activeDay=()=>clamp(Number(db.day)||1,1,5);
const unitForCard=(e)=>e.world?'부록 세계사':(DATA.units.find(u=>u.id===e.unit)?.short||'부록 한국사');
function navigate(tab){state.tab=tab; if(tab==='cards'&&!state.flashQueue.length)resetFlash(false); if(tab==='order'&&!state.orderList.length)generateOrder(); if(tab==='quiz'&&state.quiz?.finished)state.quiz=null;render();window.scrollTo(0,0);}
function renderNav(){const html=tabs.map(t=>`<button class="nav-button ${state.tab===t.id?'active':''}" type="button" data-action="nav" data-tab="${t.id}" aria-current="${state.tab===t.id?'page':'false'}">${ic(t.icon)}<span>${t.label}</span></button>`).join('');$('#sideNav').innerHTML=html+`<button class="nav-button ${state.tab==='guide'?'active':''}" data-action="nav" data-tab="guide">${ic('book')}<span>${guideTab.label}</span></button>`;$('#mobileNav').innerHTML=tabs.map(t=>`<button class="${state.tab===t.id?'active':''}" type="button" data-action="nav" data-tab="${t.id}">${ic(t.icon)}<span>${t.label.replace(' 연표','')}</span></button>`).join('');$('#crumb').textContent=[...tabs,guideTab].find(t=>t.id===state.tab)?.label||'대시보드';}
function render(){renderNav();switch(state.tab){case 'home':renderHome();app.insertAdjacentHTML('beforeend',learningSummary());break;case 'timeline':renderTimeline();break;case 'guide':renderGuide();break;case 'cards':renderCards();break;case 'quiz':renderQuiz();break;case 'order':renderOrder();break;case 'stats':renderStats();app.insertAdjacentHTML('beforeend',learningSummary());break;}}
function renderHome(){let info=statsInfo(),day=activeDay();let dailyAnswers=db.answers.filter(a=>a.date===todayISO()).length;app.innerHTML=`
<div class="hero"><div class="eyebrow">● YOUR 5-DAY MISSION</div><h1>흐름을 이해하면,<br><em>역사가 연결된다.</em></h1><p>비상교육 한국사2 시험 범위만 담은 맞춤형 학습실. 연표를 익히고, 가리고, 문제로 확인하면서 5일 동안 빈틈을 줄여 보자.</p><div class="hero-ctas"><button class="btn primary" data-action="nav" data-tab="cards">${ic('cards',17)} 암기 시작하기</button><button class="btn secondary" data-action="nav" data-tab="quiz">${ic('quiz',17)} 문제 풀기 ${ic('arrow',14)}</button><button class="btn secondary" data-action="nav" data-tab="guide">정부·인물 정리</button></div></div>
<div class="stats-grid"><div class="metric"><span class="meta">학습 연표 <span class="circle">◈</span></span><strong>${fmt(DATA.events.length)}<span class="small muted">개</span></strong><div class="sub">본문 + 부록 한국사·세계사</div></div><div class="metric"><span class="meta">문제은행 <span class="circle">✎</span></span><strong>${fmt(allQuestions.length)}<span class="small muted">문항</span></strong><div class="sub">정책 비교 · 자료 추론 · 연표</div></div><div class="metric"><span class="meta">누적 정답률 <span class="circle">◎</span></span><strong>${info.rate}<span class="small muted">%</span></strong><div class="sub">풀이 ${info.total}회 · 정답 ${info.hit}회</div></div><div class="metric"><span class="meta">복습한 카드 <span class="circle">✦</span></span><strong>${info.reviewed}<span class="small muted">장</span></strong><div class="sub">전체 ${DATA.events.length}장 중</div></div></div>
<div class="two-col"><section class="panel"><div class="row-between"><div><div class="eyebrow">TODAY'S ROUTE</div><h2 class="section-title">DAY ${day} · ${dayTitle[day]}</h2></div><span class="pill p-mint">${dayPages[day]}</span></div><div class="path-list"><button class="path-item" data-action="nav" data-tab="timeline"><span class="path-num">01</span><span class="path-info"><b>개념의 뼈대 잡기</b><span>연표를 펼쳐 사건의 원인·결과 연결하기</span></span><span class="path-arrow">${ic('chevron',17)}</span></button><button class="path-item" data-action="nav" data-tab="cards"><span class="path-num">02</span><span class="path-info"><b>플래시카드로 기억 고정하기</b><span>뒤집고 복습 정도를 평가하면 기록 저장</span></span><span class="path-arrow">${ic('chevron',17)}</span></button><button class="path-item" data-action="nav" data-tab="quiz"><span class="path-num">03</span><span class="path-info"><b>실전 감각으로 완성하기</b><span>사료·비교·함정 선지 5지선다 + 오답 추적</span></span><span class="path-arrow">${ic('chevron',17)}</span></button></div><div class="row-between mt-18"><span class="muted small">오늘 푼 문제 ${dailyAnswers}회</span><span class="muted small">하루 15문제부터</span></div>${accuracyBar(Math.min(dailyAnswers,15),15)}</section>
<section class="panel"><div class="eyebrow">STUDY SPRINT</div><h2 class="section-title">나의 5일 계획</h2><div class="day-row">${[1,2,3,4,5].map(i=>`<button class="day-pill ${i===day?'active':''}" data-action="day" data-day="${i}">D${i}</button>`).join('')}</div><p class="small muted" style="margin:22px 0 6px">현재 선택한 학습</p><h3 style="margin:0 0 3px">${dayTitle[day]}</h3><div class="small muted">${dayPages[day]} · 진도에 맞춰 플래시카드와 시험 문제 자동 선택</div><div class="divider-line"></div><div class="eyebrow">MEMORY TIP</div><p style="color:#d2e1e8;margin:6px 0 16px">정답을 보기 전에 사건의 <b style="color:var(--mint)">원인 → 과정 → 결과</b>를 말해 보자. '왜?'까지 설명하면 사료형 문제에서 훨씬 강해져.</p><button class="btn ghost full" data-action="nav" data-tab="order">${ic('order',17)} 사건 순서 배열로 도전</button></section></div>
<div class="banner-info">📚 <b>시험 범위만 수록:</b> p.76–127, p.128–133, p.161–163. 부록 p.162–163에 실린 1945년 이전 한국사·세계사 연표는 별도 필터에서 학습할 수 있어.</div>`;}
function renderGuide(){
  const cards=group=>guides.filter(guide=>guide.group===group).map(guide=>`
    <article class="panel study-guide">
      <h3 class="section-title">${esc(guide.name)}</h3>
      <p class="muted">${esc(guide.clue)}</p>
      <p><strong>주요 활동</strong> ${esc(guide.action)}</p>
      <p><strong>시험에서 구분할 점</strong> ${esc(guide.note)}</p>
      <small class="muted">교과서 p.${esc(guide.page)}</small>
    </article>`).join('');
  app.innerHTML=pageHead('','정부·인물 정리','활동과 정책의 주체를 연결하고, 비슷한 정부나 인물의 차이를 확인해 봐.',
    '<button class="btn small secondary" data-action="nav" data-tab="timeline">연표로</button>')+
    ['정부','인물'].map(group=>`<section class="study-guide-group"><h2>${group}별 핵심 정리</h2><div class="study-guide-grid">${cards(group)}</div></section>`).join('');
}
function filteredTimeline(){let events=DATA.events.filter(e=>{if(state.timelineDay!=='all'&&!isDayCard(e,Number(state.timelineDay)))return false;if(state.timelineUnit!=='all'&&e.unit!==state.timelineUnit)return false;if(state.timelineUnit==='all'&&e.world&&!state.includeWorld)return false;if(state.timelineUnit==='all'&&!e.world&&e.year<1945&&!state.includeOld)return false;if(state.timelineType!=='all'&&e.cat!==state.timelineType)return false;const q=state.query.trim().toLowerCase();if(q&&!(`${e.title} ${e.detail} ${e.hint} ${e.year}`).toLowerCase().includes(q))return false;return true;});return events.sort((a,b)=>a.sort-b.sort||a.id.localeCompare(b.id));}
function renderTimeline(resultsOnly=false){const items=filteredTimeline();let marker=null;const cards=items.map(e=>{const decade=Math.floor(e.year/10)*10;let m='';if(marker!==decade){marker=decade;m=`<div class="timeline-year-mark">${decade}s <span style="font-size:11px;font-weight:600;color:var(--faint)">/ 시간의 흐름</span></div>`;}return m+`<div class="timeline-entry kind-${e.cat}"><details class="timeline-card"><summary><span class="timeline-date mono">${esc(e.date)}</span><span class="timeline-main">${esc(e.title)}<small>${categories[e.cat]} · 교과서 p.${esc(e.pages)}</small></span><span class="timeline-chevron">⌄</span></summary><div class="timeline-body">${esc(e.detail)}<br><span class="timeline-memory">🧠 ${esc(e.hint)}</span><div class="unit-note">연결 범위: ${esc(unitForCard(e))}</div></div></details></div>`;}).join('');
const results=`<div class="row-between"><span class="count-note">총 <b style="color:var(--ink)">${fmt(items.length)}</b>건 · 날짜와 사건을 눌러 자세히 보기</span><span class="count-note">색상은 주제별 분류</span></div><div class="legend">${Object.entries(categories).map(([k,v])=>`<span class="tag kind-${k}"><span class="dot"></span>${v}</span>`).join('')}</div>${items.length?`<div class="timeline-list">${cards}</div>`:'<div class="empty"><h3>표시할 사건이 없어</h3>검색어나 필터를 바꿔 줘.</div>'}`;
if(resultsOnly){app.querySelector('#timelineResults').innerHTML=results;return;}
app.innerHTML=pageHead('CHRONOLOGY / SOURCE-BASED','연표 탐색','시험에 나오는 사건을 시간순으로 살펴보고, 사건을 눌러 원인과 기억법을 확인해.',`<button class="btn secondary small" data-action="nav" data-tab="order">${ic('order',16)} 순서 훈련</button><button class="btn secondary small" data-action="nav" data-tab="guide">정부·인물 정리</button>`)+`<div class="panel"><div class="day-row" aria-label="연표 학습일">${['all',1,2,3,4,5].map(day=>`<button class="day-pill ${String(day)===state.timelineDay?'active':''}" aria-pressed="${String(day)===state.timelineDay}" data-action="timeline-day" data-day="${day}">${day==='all'?'전체':'DAY '+day}</button>`).join('')}</div><div class="filter-bar"><select class="select" data-change="timeline-unit" aria-label="단원 선택">${unitOptions()}</select><select class="select" data-change="timeline-type" aria-label="사건 종류"><option value="all">모든 사건 종류</option>${Object.entries(categories).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select><input class="search" data-input="timeline-search" placeholder="사건·연도·키워드 검색" value="${esc(state.query)}" aria-label="연표 검색"></div><div class="filter-bar"><label class="check-label"><input type="checkbox" data-change="timeline-world" ${state.includeWorld?'checked':''}> 부록 세계사 포함</label><label class="check-label"><input type="checkbox" data-change="timeline-old" ${state.includeOld?'checked':''}> 1945년 이전 한국사 포함</label></div><div id="timelineResults">${results}</div></div>`;
app.querySelector('[data-change="timeline-unit"]').value=state.timelineUnit;app.querySelector('[data-change="timeline-type"]').value=state.timelineType;}
const ratingLabels={known:'알고 있음',unsure:'헷갈림',unknown:'모름'};
function recentQuizMisses(){
  const latest=new Map(db.answers.filter(a=>a.type==='quiz').map(a=>[a.id,a]));
  return new Set([...latest.values()].filter(a=>!a.correct).map(a=>questionMap[a.id]?.eventId).filter(Boolean));
}
function resetFlash(doRender=true){
  const misses=recentQuizMisses();
  let pool=DATA.events.filter(e=>{
    if(state.flashScope==='day')return isDayCard(e,activeDay());
    if(state.flashScope==='due')return !db.srs[e.id]||db.srs[e.id].due<=todayISO();
    return state.flashScope==='all'||e.unit===state.flashScope;
  });
  pool.sort((a,b)=>a.sort-b.sort||a.id.localeCompare(b.id));
  if(state.flashMode==='random')pool=shuffle(pool);
  if(state.flashMode==='weak')pool=pool.filter(e=>misses.has(e.id)||['unknown','unsure'].includes(db.srs[e.id]?.rating)||(!db.srs[e.id]?.rating&&db.srs[e.id]?.lapses));
  if(state.flashMode==='weak'||state.flashScope==='due'){
    const priority=e=>Number(misses.has(e.id))*2+(db.srs[e.id]?.rating==='unknown'?4:db.srs[e.id]?.rating==='unsure'?3:db.srs[e.id]?.due<=todayISO()?1:0);
    pool.sort((a,b)=>priority(b)-priority(a));
  }
  state.flashQueue=pool.map(e=>e.id);
  state.flashAt=0;
  state.flashFlipped=false;
  state.flashRated=[];
  if(doRender)renderCards();
}
function moveFlash(delta){
  const index=clamp(state.flashAt+delta,0,state.flashQueue.length-1);
  if(!state.flashQueue.length||index===state.flashAt)return;
  state.flashAt=index;
  state.flashFlipped=false;
  save();
  renderCards();
}
function renderCards(){
  const {flashQueue:queue,flashAt:at,flashFlipped:flipped,flashRated:rated}=state;
  const event=eventById[queue[at]];
  const reversed=state.flashDirection==='date';
  const settings=`<div class="filter-bar">
    <select class="select" data-change="flash-scope" aria-label="암기 카드 범위"><option value="day">DAY ${activeDay()} 범위</option><option value="due">오늘 복습할 카드</option>${unitOptions()}</select>
    <select class="select" data-change="flash-mode" aria-label="학습 모드"><option value="sequence">시간순</option><option value="random">무작위</option><option value="weak">오답 중심</option></select>
    <select class="select" data-change="flash-direction" aria-label="암기 방향"><option value="event">사건 → 시기</option><option value="date">시기 → 사건</option></select>
  </div>`;
  let body='<div class="empty">선택한 조건에 맞는 카드가 없어.</div>';
  if(event){
    const percent=Math.round(100*rated.length/queue.length);
    const lastRating=ratingLabels[db.srs[event.id]?.rating];
    body=`<div class="row-between"><span class="pill kind-${event.cat}">${esc(unitForCard(event))} · p.${esc(event.pages)}</span><span class="mono">${at+1} / ${queue.length}</span></div>
    <div class="unit-note" role="status">${rated.length}장 평가 · ${percent}% 완료${lastRating?' · 최근 평가 '+lastRating:''}</div>${accuracyBar(rated.length,queue.length)}
    <div class="flip-card ${flipped?'flipped':''}" role="button" tabindex="0" aria-label="카드 뒤집기" aria-pressed="${flipped}" data-action="flip">
      <div class="flip-inner">
        <div class="flip-face flip-front" aria-hidden="${flipped}"><div class="flip-label">${reversed?'어떤 사건일까?':'언제 일어났을까?'}</div><h2>${esc(reversed?event.date:event.title)}</h2><span class="tap-hint">눌러서 정답 확인</span></div>
        <div class="flip-face flip-back" aria-hidden="${!flipped}"><h2>${esc(reversed?event.title:event.date)}</h2><p>${esc(event.detail)}</p><div class="timeline-memory">${esc(event.hint)}</div></div>
      </div>
    </div>
    ${flipped?`<div class="rating-buttons">${Object.entries(ratingLabels).map(([key,label])=>`<button class="rate" data-action="rate" data-rate="${key}">${label}</button>`).join('')}</div>`:'<p class="muted">답을 확인한 뒤 기억 수준을 선택해 줘.</p>'}
    <div class="row-between flash-controls"><button class="btn secondary" data-action="flash-prev" ${at===0?'disabled':''}>← 이전 카드</button><button class="btn secondary" data-action="flash-next" ${at===queue.length-1?'disabled':''}>다음 카드 →</button></div>`;
  }
  app.innerHTML=pageHead('ACTIVE RECALL','플래시카드','카드를 탭해 정답을 확인하고, 좌우로 밀거나 방향키로 이동해 봐.', '<button class="btn small secondary" data-action="flash-reset">새 카드 세션</button>')+`<div class="quiz-stage"><div class="panel">${settings}${body}</div></div>`;
  for(const field of ['Scope','Mode','Direction'])app.querySelector(`[data-change="flash-${field.toLowerCase()}"]`).value=state['flash'+field];
}
function flipCard(){
  const card=app.querySelector('.flip-card');
  if(!card)return;
  state.flashFlipped=!state.flashFlipped;
  const previous=getComputedStyle(card.querySelector('.flip-inner')).transform;
  renderCards();
  const replacement=app.querySelector('.flip-card');
  const newInner=replacement.querySelector('.flip-inner');
  if(previous!=='none')newInner.style.transform=previous;
  else newInner.style.transform=state.flashFlipped?'rotateY(0deg)':'rotateY(180deg)';
  newInner.getBoundingClientRect();
  newInner.style.transform='';
}
function rateFlash(rating){
  const id=state.flashQueue[state.flashAt];
  if(!id||!state.flashFlipped||!Object.hasOwn(ratingLabels,rating))return;
  const old=db.srs[id]||{};
  const interval=rating==='unknown'?0:rating==='unsure'?1:Math.min(60,Math.max(3,(old.interval||0)*2));
  db.srs[id]={...old,rating,interval,due:dateAdd(interval),seen:(old.seen||0)+1,last:todayISO(),lapses:(old.lapses||0)+(rating==='unknown'?1:0)};
  db.cardRatings.push({id,rating,date:todayISO(),time:Date.now()});
  if(!state.flashRated.includes(id))state.flashRated.push(id);
  save(true);
  if(state.flashAt<state.flashQueue.length-1)moveFlash(1);
  else renderCards();
}
function practiceSample(pool,n){
  const attempts=db.answers.filter(a=>a.type==='quiz');
  const lastAttempts=new Map(attempts.map(a=>[a.id,a]));
  const recent=new Set(attempts.slice(-12).map(a=>a.id));
  const topics=new Map();
  const topicOf=q=>q?.topic||q?.eventId||q?.unit;
  for(const [index,attempt] of attempts.slice(-80).entries()){
    const key=topicOf(questionMap[attempt.id]);
    if(!key)continue;
    const weight=0.5+index/160;
    topics.set(key,Math.max(0,(topics.get(key)||0)+(attempt.correct?-weight:weight)));
  }
  const weight=q=>{
    const card=db.srs[q.eventId];
    const previous=lastAttempts.get(q.id);
    const weakness=(topics.get(topicOf(q))||0)+(q.topic?0.5*(topics.get(q.unit)||0):0);
    return (1+Math.min(weakness,4))*(previous?.correct===false?2:1)*(recent.has(q.id)?0.35:1)
      *(card?.rating==='unknown'?4:card?.rating==='unsure'?2:card?.rating==='known'&&card.due>todayISO()?0.5:1);
  };
  return pool.map(q=>({q,rank:-Math.log(1-Math.random())/weight(q)})).sort((a,b)=>a.rank-b.rank).slice(0,n).map(x=>x.q);
}
function finalPaper(pool,count){
  const groups=[2,3,4].map(level=>shuffle(pool.filter(q=>q.difficulty===level)));
  const selected=[];
  const usedTopics=new Set();
  while(selected.length<count&&groups.some(group=>group.length)){
    for(const group of groups){
      if(!group.length||selected.length===count)continue;
      const index=group.findIndex(q=>!usedTopics.has(q.topic||q.id));
      const [question]=group.splice(Math.max(index,0),1);
      selected.push(question);
      usedTopics.add(question.topic||question.id);
    }
  }
  return shuffle(selected);
}
function setQuizScope(scope){
  state.quizSetupScope=scope;
  if(scope!=='teacher'&&state.quizLength===100)state.quizLength=25;
  if(scope==='final'||scope==='teacher'){
    state.quizLength=25;
    state.quizDifficulty='all';
    state.quizKind='all';
  }
  renderQuiz();
}
function selectQuestionPool(){let pool=state.quizSetupScope==='teacher'?[...teacherBank]:allQuestions.filter(q=>{const scope=state.quizSetupScope;if(scope==='all'||scope==='adaptive')return true;if(scope==='final')return q.schoolStyle===true;if(scope==='day')return isDayQuestion(q,activeDay());if(scope==='wrong')return wrongIds().includes(q.id);return q.unit===scope;});if(state.quizDifficulty!=='all')pool=pool.filter(q=>q.difficulty===Number(state.quizDifficulty));if(state.quizKind!=='all')pool=pool.filter(q=>q.kind===state.quizKind);return pool;}
function startQuiz(){const pool=selectQuestionPool();if(!pool.length){toast('선택한 조건에 맞는 문제가 없어.');return;}const count=Math.min(Number(state.quizLength),pool.length);const select=state.quizSetupScope==='final'?finalPaper:['day','adaptive','teacher'].includes(state.quizSetupScope)?practiceSample:sample;
  const context=pool.filter(q=>q.kind!=='연표'&&q.kind!=='연도 입력'&&q.format!=='ox');
  const contextFirst=state.quizKind==='all'&&(state.quizDifficulty!=='all'||['adaptive','teacher'].includes(state.quizSetupScope));
  const preferred=contextFirst?Math.min(context.length,Math.ceil(count*0.7)):0;
  const priority=preferred?select(context,preferred):[];
  const used=new Set(priority.map(q=>q.id));
  let selected=shuffle([...priority,...select(pool.filter(q=>!used.has(q.id)),count-priority.length)]);
  if(state.quizSetupScope!=='final'&&count>1&&selected.every(q=>q.format===selected[0].format)){
    const others=pool.filter(q=>q.format!==selected[0].format);
    if(others.length)selected=shuffle([...selected.slice(0,-1),...select(others,1)]);
  }
  beginQuiz(selected.map(q=>q.id));}
function beginQuiz(items){state.quizDraft='';state.quiz={items,at:0,chosen:null,correct:0,answers:[],finished:false,startedAt:Date.now()};renderQuiz();window.scrollTo(0,0);}
function submitAnswer(choice){
  const session=state.quiz;
  if(!session||session.finished||session.chosen!==null)return;
  const question=questionMap[session.items[session.at]];
  const short=question.format==='short';
  if(short?typeof choice!=='string'||!choice.trim():!Number.isInteger(choice)||choice<0||choice>=question.options.length)return;
  const normalized=short?choice.normalize('NFKC').trim().replace(/\s*년$/,''):choice;
  const correct=normalized===(short?String(question.answer):question.answer);
  session.chosen=choice;
  session.correct+=Number(correct);
  session.answers.push({id:question.id,correct,chosen:choice});
  track('quiz',question.id,correct);
  renderQuiz();
}
function nextQuiz(){const qstate=state.quiz;if(!qstate||qstate.chosen===null)return;if(qstate.at+1>=qstate.items.length){qstate.finished=true;const summary={date:todayISO(),score:qstate.correct,total:qstate.items.length,seconds:Math.round((Date.now()-qstate.startedAt)/1000),questions:qstate.answers};db.sessions.unshift(summary);db.sessions=db.sessions.slice(0,50);save();}else{qstate.at++;qstate.chosen=null;state.quizDraft='';}renderQuiz();window.scrollTo(0,0);}
function renderQuiz(){const s=state.quiz;
if(!s){let pool=selectQuestionPool();app.innerHTML=pageHead('EXAM SIMULATOR','실전 문제풀이','객관식, OX, 연도 입력을 섞어 풀고, 해설에서 교과서 쪽수를 확인해 봐.')+`<div class="quiz-stage"><div class="panel"><div class="eyebrow">STEP 01 / 범위 선택</div><h2 class="section-title">어디부터 도전할까?</h2><div class="preset-grid"><button class="preset-card ${state.quizSetupScope==='day'?'selected':''}" data-action="quiz-scope" data-scope="day">${ic('clock',20)}<b>오늘의 집중 훈련</b><span>DAY ${activeDay()} · ${dayTitle[activeDay()]}</span></button><button class="preset-card ${state.quizSetupScope==='all'?'selected':''}" data-action="quiz-scope" data-scope="all">${ic('trophy',20)}<b>전 범위 모의고사</b><span>한국사 + 개헌 + 부록 연표</span></button><button class="preset-card ${state.quizSetupScope==='wrong'?'selected':''}" data-action="quiz-scope" data-scope="wrong">${ic('refresh',20)}<b>오답만 재도전</b><span>지금까지 틀린 문제만 다시</span></button>
<button class="preset-card ${state.quizSetupScope==='adaptive'?'selected':''}" data-action="quiz-scope" data-scope="adaptive">${ic('filter',20)}<b>맞춤 출제</b><span>최근 오답과 약한 개념 중심</span></button>
<button class="preset-card ${state.quizSetupScope==='final'?'selected':''}" data-action="quiz-scope" data-scope="final">${ic('book',20)}<b>미사고 1학년 기말 연습</b><span>교과서 범위 · 기본 25문항</span></button><button class="preset-card ${state.quizSetupScope==='teacher'?'selected':''}" data-action="quiz-scope" data-scope="teacher">${ic('book',20)}<b>강민석 유형 문제들</b><span>100문항 · 자료 추론·정책 비교·복합 보기</span></button></div><div class="form-row"><div class="field"><label>교과서 단원 또는 범위</label><select class="select" data-change="quiz-scope"><option value="day">DAY ${activeDay()} 집중 범위</option><option value="all">전 범위</option><option value="wrong">나의 오답</option><option value="adaptive">맞춤 출제</option><option value="final">미사고 1학년 기말 연습</option><option value="teacher">강민석 유형 문제들</option>${DATA.units.map(u=>`<option value="${u.id}">${u.short} (p.${u.pages})</option>`).join('')}</select></div><div class="field"><label>난이도</label><select class="select" data-change="quiz-difficulty"><option value="all">전체 난이도</option>${difficultyLabel.slice(1).map((label,i)=>`<option value="${i+1}">${label}</option>`).join('')}</select></div><div class="field"><label>문제 유형</label><select class="select" data-change="quiz-kind"><option value="all">전체 유형</option>${uniq(allQuestions.map(q=>q.kind)).map(k=>`<option value="${k}">${k} 문제</option>`).join('')}</select></div><div class="field"><label>문항 수</label><select class="select" data-change="quiz-length"><option value="10">10문항 · 빠른 점검</option><option value="25">25문항 · 지필 연습</option><option value="20">20문항 · 단원 테스트</option><option value="30">30문항 · 실전 모의고사</option>${state.quizSetupScope==='teacher'?'<option value="100">100문항 · 전체 유형</option>':''}</select></div></div><div class="banner-info">${state.quizSetupScope==='adaptive'?'<p class="unit-note">최근 오답이 쌓인 단원·개념과 모름으로 평가한 카드를 우선 반영해. 방금 본 문항의 출제 가능성은 낮춰 줘.</p>':''}${state.quizSetupScope==='final'?'<p class="unit-note">1학기 시험의 출제 형식을 참고한 한국사2 연습이야. 범위는 앱에 지정된 교과서 쪽수를 기준으로 해.</p>':''}현재 설정으로 <b>${pool.length}문항</b> 출제 가능 · 오답과 해설은 자동 저장 · 연표형 문제는 교과서 연표 사건에서 생성해.</div><button class="btn primary full" data-action="quiz-start">시험 시작하기 ${ic('arrow',16)}</button></div></div>`;
app.querySelector('[data-change="quiz-scope"]').value=state.quizSetupScope;app.querySelector('[data-change="quiz-difficulty"]').value=state.quizDifficulty;app.querySelector('[data-change="quiz-kind"]').value=state.quizKind;app.querySelector('[data-change="quiz-length"]').value=String(state.quizLength);return;}
if(s.finished){const pct=Math.round(s.correct/s.items.length*100);const misses=s.answers.filter(a=>!a.correct).map(a=>({...a,q:questionMap[a.id]}));app.innerHTML=pageHead('SESSION COMPLETE','시험 결과','수고했어. 틀린 문항만 다시 보면 점수가 빠르게 올라가.')+`<div class="quiz-stage"><div class="panel"><div class="result-score"><div class="score-ring" style="--score:${pct}%"><strong>${pct}점</strong></div><h2 style="font-size:25px;margin:0">${pct>=90?'완벽에 가까워!':pct>=70?'실력이 쌓이고 있어!':'오답을 연결해 보자!'}</h2><div class="result-label">${s.items.length}문항 중 <b style="color:var(--mint)">${s.correct}문항 정답</b> · ${s.items.length-s.correct}문항 오답</div></div>${accuracyBar(s.correct,s.items.length)}<div class="row-between mt-18"><button class="btn secondary" data-action="quiz-new">다른 시험 보기</button><button class="btn primary" data-action="quiz-retry">${ic('refresh',14)} ${misses.length?'오답 재시험':'다시 풀기'}</button></div>${misses.length?`<hr class="separator"><h3 class="section-title">이번에 틀린 문제 (${misses.length})</h3>${misses.map(a=>`<div class="review-row"><b>${esc(a.q.prompt)}</b><p>정답: <span style="color:var(--mint)">${esc(answerText(a.q))}</span> · 교과서 p.${esc(a.q.page)}</p><p>${esc(a.q.explain)}</p></div>`).join('')}`:''}</div></div>`;return;}
const q=questionMap[s.items[s.at]],reveal=s.chosen!==null;
const short=q.format==='short';
const correct=reveal&&s.answers.at(-1).correct;
const choices=short?`<form data-quiz-short class="filter-bar"><label for="quizYear">연도</label><input id="quizYear" name="year" class="search" inputmode="numeric" maxlength="12" value="${esc(reveal?s.chosen:state.quizDraft||'')}" ${reveal?'disabled':'required'}>${reveal?'':'<button class="btn primary" type="submit">제출</button>'}</form>`:
  `<div class="quiz-options">${q.options.map((text,i)=>`<button class="quiz-option ${reveal?(i===q.answer?'correct':i===s.chosen?'incorrect':''):''}" data-action="answer" data-index="${i}" ${reveal?'disabled':''}><span class="number">${i+1}</span><span>${esc(text)}</span></button>`).join('')}</div>`;
app.innerHTML=pageHead('FOCUSED PRACTICE','실전 문제풀이',`${s.items.length}문항 · 답을 제출하면 해설을 볼 수 있어.`,'<button class="btn small ghost" data-action="quiz-exit">시험 중단</button>')+
  `<div class="quiz-stage"><div class="panel">
    <div class="quiz-meta"><span><span class="pill">${esc(q.kind)}</span> <span class="pill">${difficultyLabel[q.difficulty]}</span> <span class="pill">교과서 p.${esc(q.page)}</span></span><b class="mono">${s.at+1} / ${s.items.length}</b></div>
    ${accuracyBar(s.at,s.items.length)}
    <h2 class="quiz-question">${esc(q.prompt)}</h2>${q.material?`<div class="study-material" aria-label="문제 자료">${esc(q.material)}</div>`:''}${choices}
    ${reveal?`<div class="explain-box ${correct?'':'bad'}"><strong>${correct?'✓ 정답이야!':'✗ 다시 확인해 보자.'}</strong><p><b>정답 · ${esc(answerText(q))}</b></p><p>${esc(q.explain)}</p><span class="small muted">비상교육 한국사2 교과서 p.${esc(q.page)}</span></div>
    <div class="answer-area"><button class="btn primary" data-action="quiz-next">${s.at+1===s.items.length?'결과 확인':'다음 문제'}</button></div>`:''}
  </div></div>`;}
function getOrderPool(){const day=activeDay();let pool=datedEvents.filter(e=>{if(e.world)return state.orderScope==='world';if(state.orderScope==='day')return isDayCard(e,day)&&e.year>=1945;if(state.orderScope==='all')return e.year>=1945;if(state.orderScope==='world')return false;return e.unit===state.orderScope;});return pool;}
function generateOrder(){const distinct=[];
for(const event of shuffle(getOrderPool())){
  if(!distinct.some(item=>item.year===event.year))distinct.push(event);
  if(distinct.length===5)break;
}
state.orderList=shuffle(distinct).map(e=>e.id);state.orderChecked=false;state.orderResult='';}
function moveOrder(i,d){const j=i+d;if(j<0||j>=state.orderList.length||state.orderChecked)return;[state.orderList[i],state.orderList[j]]=[state.orderList[j],state.orderList[i]];renderOrder();}
function checkOrder(){if(state.orderChecked||state.orderList.length<2)return;const events=state.orderList.map(id=>eventById[id]);const correct=[...events].sort((a,b)=>a.sort-b.sort);state.orderChecked=true;state.orderResult=correct.map(e=>e.id).every((id,i)=>events[i].id===id)?'win':'fail';db.orderAttempts.push({correct:state.orderResult==='win',ids:[...state.orderList],date:todayISO(),time:Date.now()});save(true);if(state.orderResult==='win'){db.orderWins++;save();toast('정확한 시간 순서야!');}renderOrder();}
function renderOrder(){if(!state.orderList.length)generateOrder();const sorted=[...state.orderList].sort((a,b)=>eventById[a].sort-eventById[b].sort);app.innerHTML=pageHead('CHRONOLOGY CHALLENGE','사건 순서 배열','손잡이를 끌어서 가장 이른 사건부터 정렬해 봐. 키보드는 손잡이에 초점을 두고 ↑↓를 눌러 줘. 같은 연도의 사건은 함께 뽑지 않아.')+`<div class="quiz-stage"><div class="panel"><div class="row-between"><div><div class="eyebrow">TIMELINE PUZZLE</div><h2 class="section-title">오래된 순서 → 최근 순서</h2></div><select class="select" data-change="order-scope" aria-label="순서 문제 범위"><option value="day">DAY ${activeDay()} 범위</option><option value="all">전 범위 (1945~)</option><option value="world">부록 세계사</option>${DATA.units.filter(u=>u.id!=='world').map(u=>`<option value="${u.id}">${u.short}</option>`).join('')}</select></div><div class="order-list">${state.orderList.map((id,i)=>{const e=eventById[id];return `<div class="order-item ${state.orderChecked?(sorted[i]===id?'win':'fail'):''}" data-orderid="${esc(id)}" data-idx="${i}"><button class="order-handle" type="button" aria-label="${esc(e.title)} 순서 이동" ${state.orderChecked?'disabled':''}>⠿</button><span class="order-title">${esc(e.title)}${state.orderChecked?`<div class="small muted">${esc(e.date)}</div>`:''}</span><span class="order-actions"><button class="mini-icon" data-action="order-up" data-index="${i}" ${state.orderChecked||i===0?'disabled':''} aria-label="위로 이동">↑</button><button class="mini-icon" data-action="order-down" data-index="${i}" ${state.orderChecked||i===state.orderList.length-1?'disabled':''} aria-label="아래로 이동">↓</button></span></div>`;}).join('')}</div>${state.orderChecked?`<div class="order-result"><b style="color:${state.orderResult==='win'?'var(--mint)':'var(--orange)'}">${state.orderResult==='win'?'✓ 모두 맞았어!':'아직 순서가 달라. 강조된 카드의 연도를 비교해 봐.'}</b><p>${sorted.map(id=>`${esc(eventById[id].date)} ${esc(eventById[id].title)} (p.${esc(eventById[id].pages)})`).join(' → ')}</p></div><button class="btn primary full mt-18" data-action="order-new">새로운 순서 문제 ${ic('refresh',16)}</button>`:`<div class="row-between"><span class="muted small">정답까지 연도를 가렸어 · 정답 기록 ${db.orderWins}회</span><button class="btn primary" data-action="order-check" ${state.orderList.length<2?'disabled':''}>정답 확인 ${ic('check',16)}</button></div><button class="btn ghost small mt-18" data-action="order-new">${ic('refresh',14)} 다른 문제로 바꾸기</button>`}</div></div>`;const select=app.querySelector('[data-change="order-scope"]');select.value=state.orderScope;initDrag();}
function initDrag(){
  if(state.orderChecked)return;
  const rows=[...app.querySelectorAll('[data-orderid]')];
  for(const [from,row] of rows.entries()){
    const handle=row.querySelector('.order-handle');
    let drag=null;
    handle.addEventListener('pointerdown',evt=>{
      if(!evt.isPrimary||evt.button!==0)return;
      drag={id:evt.pointerId,to:from,origin:evt.clientY};
      handle.setPointerCapture(evt.pointerId);
      row.classList.add('dragging');
    });
    handle.addEventListener('pointermove',evt=>{
      if(drag?.id!==evt.pointerId)return;
      const bounds=rows.map((item,i)=>item.getBoundingClientRect().top-(i===from?Number(row.dataset.shift||0):0));
      const to=rows.findIndex((item,i)=>evt.clientY<bounds[i]+item.offsetHeight);
      drag.to=to<0?rows.length-1:to;
      rows.forEach((item,i)=>{
        item.classList.toggle('order-target',i===drag.to&&i!==from);
      });
      row.dataset.shift=evt.clientY-drag.origin;
      row.style.transform=`translateY(${row.dataset.shift}px)`;
    });
    const finish=(evt,commit)=>{
      if(drag?.id!==evt.pointerId)return;
      const {to}=drag;
      drag=null;
      row.classList.remove('dragging');
      row.style.transform='';
      delete row.dataset.shift;
      rows.forEach(item=>item.classList.remove('order-target'));
      if(!commit||to===from)return;
      const [item]=state.orderList.splice(from,1);
      state.orderList.splice(to,0,item);
      save();
      renderOrder();
      app.querySelectorAll('.order-handle')[to]?.focus({preventScroll:true});
    };
    handle.addEventListener('pointerup',evt=>finish(evt,true));
    handle.addEventListener('pointercancel',evt=>finish(evt,false));
    handle.addEventListener('lostpointercapture',evt=>finish(evt,false));
    handle.addEventListener('keydown',evt=>{
      if(!['ArrowUp','ArrowDown'].includes(evt.key))return;
      evt.preventDefault();
      const delta=evt.key==='ArrowUp'?-1:1;
      moveOrder(from,delta);
      app.querySelectorAll('.order-handle')[clamp(from+delta,0,rows.length-1)]?.focus({preventScroll:true});
      save();
    });
  }
}
function memoryStats(){
  const current=Object.values(db.srs).map(record=>record.rating).filter(rating=>ratingLabels[rating]);
  const known=current.filter(rating=>rating==='known').length;
  const unsure=current.filter(rating=>rating==='unsure').length;
  const tested=db.answers.filter(answer=>answer.type==='quiz');
  const accuracy=tested.length?tested.filter(answer=>answer.correct).length/tested.length:null;
  const memory=current.length?(known+unsure*0.5)/current.length:null;
  const rateFor=format=>{
    const attempts=tested.filter(a=>questionMap[a.id]&&(questionMap[a.id].format||'choice')===format);
    return attempts.length?Math.round(100*attempts.filter(a=>a.correct).length/attempts.length)+'%':'—';
  };
  const mastery=accuracy===null||memory===null?null:Math.round((accuracy*0.7+memory*0.3)*100);
  const dates=new Set([...db.answers,...db.cardRatings,...db.orderAttempts].map(item=>item.date));
  let streak=0;
  const offset=dates.has(todayISO())?0:1;
  while(dates.has(dateAdd(-streak-offset)))streak++;
  return {current,known,unsure,memory,mastery,streak,choiceRate:rateFor('choice'),shortRate:rateFor('short'),oxRate:rateFor('ox')};
}
function learningSummary(){
  const {current,known,unsure,memory,mastery,streak,choiceRate,shortRate,oxRate}=memoryStats();
  const reviewed=DATA.events.filter(event=>db.srs[event.id]?.seen);
  const misses=new Map();
  for(const answer of db.answers){
    if(answer.type!=='quiz'||answer.correct)continue;
    const id=questionMap[answer.id]?.eventId;
    if(id)misses.set(id,(misses.get(id)||0)+1);
  }
  for(const record of db.cardRatings)if(record.rating==='unknown')misses.set(record.id,(misses.get(record.id)||0)+1);
  const weak=[...misses.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);
  const last=db.lastStudy?esc(db.lastStudy):'기록 없음';
  const latestQuiz=new Map(db.answers.filter(a=>a.type==='quiz').map(a=>[a.id,a]));
  const demonstrated=new Set([...latestQuiz.values()].filter(a=>a.correct).map(a=>questionMap[a.id]?.eventId));
  const ready=DATA.events.filter(event=>db.srs[event.id]?.rating==='known'&&demonstrated.has(event.id)).length;
  const recent=[
    ...db.answers.filter(a=>a.type==='quiz').map(a=>({...a,label:a.correct?'문제 정답':'문제 오답',title:questionMap[a.id]?.prompt})),
    ...db.cardRatings.map(a=>({...a,label:ratingLabels[a.rating],title:eventById[a.id]?.title})),
    ...db.orderAttempts.map(a=>({...a,label:a.correct?'순서 배열 성공':'순서 배열 오답',title:'사건 순서 배열'}))
  ].sort((a,b)=>(b.time||0)-(a.time||0)).slice(0,5);
  return `<section class="panel study-summary"><h2 class="section-title">나의 학습 상태</h2><div class="stats-grid">
    <div class="metric"><span class="meta">카드 기억 점수</span><strong>${memory===null?'—':Math.round(memory*100)+'%'}</strong><div class="sub">알고 있음 ${known} · 헷갈림 ${unsure} · 모름 ${current.length-known-unsure}</div></div>
    <div class="metric"><span class="meta">종합 숙련도</span><strong>${mastery===null?'—':mastery+'%'}</strong><div class="sub">문제 정답률 70% + 카드 기억 점수 30%</div></div>
    <div class="metric"><span class="meta">연속 학습</span><strong>${streak}일</strong><div class="sub">최근 학습 ${last}</div></div>
    <div class="metric"><span class="meta">순서 배열 성공률</span><strong>${db.orderAttempts.length?Math.round(db.orderAttempts.filter(a=>a.correct).length/db.orderAttempts.length*100)+'%':'—'}</strong><div class="sub">신규 기록 ${db.orderAttempts.length}회</div></div>
    </div>
    <p class="unit-note">객관식 ${choiceRate} · 단답형 ${shortRate} · OX ${oxRate} · 기억 점수는 알고 있음 1점, 헷갈림 0.5점, 모름 0점의 평균</p><h3 class="section-title">DAY별 카드 학습 진도</h3>
    ${[1,2,3,4,5].map(day=>{const total=DATA.events.filter(e=>isDayCard(e,day)).length;const count=reviewed.filter(e=>isDayCard(e,day)).length;return `<div class="row-between"><span>DAY ${day}</span><span>${count} / ${total}</span></div>${accuracyBar(count,total)}`;}).join('')}
    <h3 class="section-title">취약 사건 TOP 5</h3><ul>${weak.length?weak.map(([id,count])=>`<li>${esc(eventById[id]?.title)} · ${count}회</li>`).join(''):'<li>아직 기록이 없어.</li>'}</ul>
    <h3 class="section-title">시험 준비 완료도</h3><p class="unit-note">${ready} / ${DATA.events.length}개 사건 · 카드를 알고 있다고 평가하고, 연결된 문제의 최근 답을 맞힌 사건</p>${accuracyBar(ready,DATA.events.length)}
    <h3 class="section-title">최근 학습 기록</h3><ul>${recent.length?recent.map(item=>`<li>${esc(item.date)} · ${esc(item.label)} · ${esc(item.title||'이전 버전 문항')}</li>`).join(''):'<li>아직 기록이 없어.</li>'}</ul>
    </section>`;
}
function renderStats(){const info=statsInfo(),sessions=db.sessions||[];let byUnit=DATA.units.map(u=>{let attempts=db.answers.filter(a=>a.type==='quiz' && questionMap[a.id]?.unit===u.id);return {...u,n:attempts.length,right:attempts.filter(a=>a.correct).length};});app.innerHTML=pageHead('YOUR LEARNING DATA','학습 기록','학습 진도는 이 브라우저에 저장돼. 다른 기기로 옮길 때는 JSON 내보내기를 이용해.')+`<div class="stats-grid"><div class="metric"><span class="meta">누적 풀이</span><strong>${fmt(info.total)}</strong><div class="sub">채점된 시험 응답</div></div><div class="metric"><span class="meta">전체 정답률</span><strong>${info.rate}%</strong><div class="sub">정답 ${info.hit}회</div></div><div class="metric"><span class="meta">복습한 카드</span><strong>${info.reviewed}</strong><div class="sub">전체 ${DATA.events.length}개</div></div><div class="metric"><span class="meta">순서 배열 성공</span><strong>${db.orderWins}</strong><div class="sub">완벽 정렬 횟수</div></div></div><div class="two-col"><section class="panel"><h2 class="section-title">단원별 문제 정확도</h2><p class="small muted">어느 시대가 취약한지 먼저 보고 복습하면 좋아.</p>${byUnit.map(u=>`<div style="margin:17px 0"><div class="row-between"><b style="font-size:12px">${esc(u.short)}</b><span class="muted small">${u.n?Math.round(u.right/u.n*100):0}% · ${u.n}문항</span></div>${accuracyBar(u.right,u.n)}</div>`).join('')}</section><section class="panel"><h2 class="section-title">모의고사 기록</h2>${sessions.length?`<table class="history-table"><thead><tr><th>날짜</th><th>점수</th><th>문항</th></tr></thead><tbody>${sessions.slice(0,9).map(x=>`<tr><td>${esc(x.date)}</td><td style="color:var(--mint)">${Math.round(x.score/x.total*100)}점</td><td>${x.score}/${x.total}</td></tr>`).join('')}</tbody></table>`:'<div class="empty"><h3>아직 모의고사 기록이 없어</h3>문제풀이를 시작하면 여기에 남아.</div>'}<hr class="separator"><h3 class="section-title">학습 데이터 관리</h3><div class="card-nav mt-18"><button class="btn small secondary" data-action="export">기록 내보내기</button><button class="btn small secondary" data-action="import">기록 불러오기</button><button class="btn small danger" data-action="reset">전체 초기화</button></div><p class="unit-note">개인정보나 계정이 필요 없고, 학습 기록은 브라우저 저장소에 보관돼.</p></section></div>`;}
function exportData(){save();const blob=new Blob([JSON.stringify({app:'시대연결',version:2,exported:todayISO(),progress:db},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`한국사_학습기록_${todayISO()}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('학습 기록 파일을 저장했어.');}
function restoreSession(){
  state={...initialState(),...(db.resume||{})};
  if(!Array.isArray(state.flashQueue))state.flashQueue=[];
  if(!Array.isArray(state.flashRated))state.flashRated=[];
  if(!Array.isArray(state.orderList))state.orderList=[];
  if(!Array.isArray(db.cardRatings))db.cardRatings=[];
  if(!Array.isArray(db.orderAttempts))db.orderAttempts=[];
  if(![...tabs,guideTab].some(tab=>tab.id===state.tab))state.tab='home';
  if(!state.flashQueue.every(id=>eventById[id])||state.flashAt>=state.flashQueue.length)resetFlash(false);
  if(!state.orderList.every(id=>eventById[id]))generateOrder();
  if(state.quiz&&(!Array.isArray(state.quiz.items)||!state.quiz.items[state.quiz.at]||!state.quiz.items.every(id=>questionMap[id])))state.quiz=null;
}
function importData(file){if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const o=JSON.parse(reader.result);if(!o||!o.progress||!Array.isArray(o.progress.answers)||(!o.progress.srs||typeof o.progress.srs!=='object'||Array.isArray(o.progress.srs)))throw Error('invalid');if(!window.confirm('현재 기기의 학습 기록을 불러온 기록으로 교체할까?'))return;db={...defaultDB(),...o.progress};restoreSession();save();render();toast('학습 기록을 불러왔어.');}catch(err){toast('올바른 학습 기록 JSON 파일이 아니야.');}};reader.readAsText(file);}
function handleAction(action,el){switch(action){case 'nav':navigate(el.dataset.tab);break;case 'timeline-day':case 'day':{
  const selection=el.dataset.day;
  const day=Number(selection);
  state.timelineDay=selection;
  if(action==='timeline-day'&&day>=4){
    state.includeWorld=true;
    state.includeOld=true;
  }
  if(day&&day!==db.day){
    db.day=day;
    if(state.flashScope==='day')resetFlash(false);
    if(state.orderScope==='day')generateOrder();
  }
  render();
  break;
}case 'flash-reset':resetFlash();break;case 'flip':flipCard();break;case 'rate':rateFlash(el.dataset.rate);break;case 'flash-prev':moveFlash(-1);break;case 'flash-next':moveFlash(1);break;case 'quiz-scope':setQuizScope(el.dataset.scope);break;case 'quiz-start':startQuiz();break;case 'quiz-exit':state.quiz=null;renderQuiz();break;case 'quiz-new':state.quiz=null;renderQuiz();break;case 'quiz-retry':{if(!state.quiz?.finished)break;const misses=state.quiz.answers.filter(a=>!a.correct).map(a=>a.id);beginQuiz(misses.length?misses:state.quiz.items);break;}case 'answer':submitAnswer(Number(el.dataset.index));break;case 'quiz-next':nextQuiz();break;case 'order-up':moveOrder(Number(el.dataset.index),-1);break;case 'order-down':moveOrder(Number(el.dataset.index),1);break;case 'order-check':checkOrder();break;case 'order-new':generateOrder();renderOrder();break;case 'export':exportData();break;case 'import':$('#importProgress').click();break;case 'reset':if(window.confirm('모든 학습 기록(카드·문제·성적)을 초기화할까? 되돌릴 수 없어.')){db=defaultDB();restoreSession();save();render();toast('학습 기록을 초기화했어.');}break;}}
document.addEventListener('click',evt=>{const el=evt.target.closest('[data-action]');if(el&&!el.disabled){handleAction(el.dataset.action,el);save();}});
document.addEventListener('change',evt=>{const el=evt.target,change=el.dataset.change;if(!change)return;switch(change){case 'timeline-unit':state.timelineUnit=el.value;renderTimeline();break;case 'timeline-type':state.timelineType=el.value;renderTimeline();break;case 'timeline-world':state.includeWorld=el.checked;renderTimeline();break;case 'timeline-old':state.includeOld=el.checked;renderTimeline();break;case 'flash-scope':state.flashScope=el.value;resetFlash();break;case 'flash-mode':state.flashMode=el.value;resetFlash();break;case 'flash-direction':state.flashDirection=el.value;state.flashFlipped=false;renderCards();break;case 'quiz-scope':setQuizScope(el.value);break;case 'quiz-difficulty':state.quizDifficulty=el.value;renderQuiz();break;case 'quiz-kind':state.quizKind=el.value;renderQuiz();break;case 'quiz-length':state.quizLength=Number(el.value);renderQuiz();break;case 'order-scope':state.orderScope=el.value;generateOrder();renderOrder();break;}save();});
app.addEventListener('submit',evt=>{
  if(!evt.target.matches('[data-quiz-short]'))return;
  evt.preventDefault();
  submitAnswer(new FormData(evt.target).get('year'));
});
document.addEventListener('input',evt=>{if(evt.target.id==='quizYear'){state.quizDraft=evt.target.value;save();return;}if(evt.target.dataset.input==='timeline-search'){state.query=evt.target.value;renderTimeline(true);save();}});
let swipe=null;
app.addEventListener('touchstart',evt=>{
  if(evt.touches.length===1&&evt.target.closest('.flip-card'))swipe={x:evt.touches[0].clientX,y:evt.touches[0].clientY};
},{passive:true});
app.addEventListener('touchend',evt=>{
  if(!swipe)return;
  const touch=evt.changedTouches[0],dx=touch.clientX-swipe.x,dy=touch.clientY-swipe.y;
  swipe=null;
  if(Math.abs(dx)<48||Math.abs(dx)<Math.abs(dy)*1.4)return;
  if(evt.cancelable)evt.preventDefault();
  moveFlash(dx<0?1:-1);
},{passive:true});
app.addEventListener('touchcancel',()=>{swipe=null;});
document.addEventListener('keydown',evt=>{
  if(evt.isComposing||evt.altKey||evt.ctrlKey||evt.metaKey||evt.target.closest?.('input,textarea,select'))return;
  if(state.tab==='cards'){
    if(['ArrowLeft','ArrowRight'].includes(evt.key)){
      evt.preventDefault();
      moveFlash(evt.key==='ArrowLeft'?-1:1);
    }else if((evt.code==='Space'||evt.key==='Enter')&&!evt.target.closest?.('button')&&state.flashQueue.length){
      evt.preventDefault();
      flipCard();
      app.querySelector('.flip-card')?.focus({preventScroll:true});
    }else if(state.flashFlipped&&['Digit1','Digit2','Digit3'].includes(evt.code)){
      rateFlash(Object.keys(ratingLabels)[Number(evt.code.at(-1))-1]);
    }
  }else if(state.tab==='quiz'&&state.quiz&&!state.quiz.finished){
    if(state.quiz.chosen===null&&questionMap[state.quiz.items[state.quiz.at]].format!=='short'&&['Digit1','Digit2','Digit3','Digit4','Digit5'].includes(evt.code))submitAnswer(Number(evt.code.at(-1))-1);
    else if(state.quiz.chosen!==null&&evt.key==='Enter'&&!evt.target.closest?.('button'))nextQuiz();
  }
  save();
});
$('#importProgress').addEventListener('change',evt=>{importData(evt.target.files?.[0]);evt.target.value='';});
window.__historyStudy={getData:()=>DATA,getProgress:()=>db,quizPool:()=>allQuestions};
restoreSession();
render();
if ('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost')) {
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
})();
