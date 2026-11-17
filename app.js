/* =====================================================================
 * HCT Calibration - 교정 원시데이터 입력 앱 (app.js : 앱의 모든 동작)
 *
 * 하는 일: 폰에서 교정 측정값을 입력하고, 장비 1대당 CSV 파일 1개로 저장한다.
 * 파일 구성: index.html(화면 뼈대) / style.css(디자인) / app.js(이 파일, 동작)
 *            sw.js(오프라인 실행) / manifest.webmanifest + icon.svg(홈 화면 설치)
 * 핵심 개념:
 *  - 상태 S 하나에 입력한 모든 내용이 들어 있고, 입력할 때마다 폰(localStorage)에 자동 저장된다.
 *  - R() 이 S 를 읽어 화면 전체를 다시 그린다. (구조가 바뀔 때만 호출)
 *  - 입력칸의 data-p="경로" 로 입력값이 S 안의 어느 위치에 들어갈지 정해진다.
 *  - 서버 없이 폰 안에서만 동작하며, 데이터는 외부로 전송되지 않는다.
 * 상태 S 의 모양:
 *  { type: 교정대상 키, insp: 교정자ID, date: 교정일자, n: 장비 수, pre/start: 접수번호 앞번호/시작번호,
 *    units: [장비별 정보 {reg,recv,mfr,model,sn,memo,unit}],
 *    tb: { 교정대상키: [표들 {si,ch,m:표설정,reps:회차이름,rows:[{nom:명목값, v:{"회차_장비":측정값}}]}] } }
 * ===================================================================== */
// [1] 기본 도구: $ 는 화면 요소 찾기, K 는 폰 저장소 키 이름(저장 구조를 바꾸면 v3→v4 처럼 올려서 옛 데이터와 충돌을 막음), rng(n) 은 0~n-1 숫자 배열.
const $=s=>document.querySelector(s),K='hctcal_v3_state',rng=n=>Array.from({length:n},(_,i)=>i);
// [2] 선택 목록: TO = 온/습도의 측정항목·단위 후보, PU = 압력계 단위 17종.
const TO={측정항목:['온도','습도'],단위:['℃','℉','% R.H.']},PU=['Pa','hPa','kPa','MPa','mbar','bar','kgf/㎠','kgf/㎡','psi','inHg','mmHg','cmHg','inH2O','mmH2O','cmH2O','N/㎠','atm'];
// TD/TT: 측정항목을 고르면 그에 맞는 단위만 보이게 하는 표(온도→℃,℉ / 습도→% R.H. / 타이머→s / RPM→min⁻¹).
const TD={온도:['℃','℉'],습도:['% R.H.']},TT={타이머:['s'],RPM:['min⁻¹']};
// [3] 교정대상 5종 정의(T). 표(t)의 속성: n 표이름, m 표 설정 항목, d 기본값, o 선택목록, dp 단위 연동,
// fix 고정 행 이름(있으면 행 추가/삭제 불가), rc 기본 행 수, reps 회차 수, rl 회차 이름, ch 채널 열,
// nt 제목 숨김, num 번호(No.) 열, fl 사용 유체 칸, su 단위 선택 행, add 표 추가/삭제 허용.
const T={
// 기본: 측정항목·조건·범위·최소눈금·단위를 자유롭게 입력하는 범용 표(표 추가/삭제 가능).
base:{name:'기본',t:[{n:'기본',m:['측정항목','측정조건','측정범위','최소눈금','단위'],d:{},reps:3,rc:5,add:1}]},
// 온/습도: 온도 표 + 습도 표. 측정항목에 따라 단위가 제한되고, 채널은 표당 한 칸으로 병합.
temp:{name:'온/습도',t:[{n:'온도',nt:1,m:['측정항목','단위','Memo'],d:{측정항목:'온도',단위:'℃'},o:TO,dp:TD,ch:1,reps:3,rc:3,add:1},{n:'습도',nt:1,m:['측정항목','단위','Memo'],d:{측정항목:'습도',단위:'% R.H.'},o:TO,dp:TD,ch:1,reps:3,rc:3,add:1}]},
// 전기식 지시저울: 기기정보(단위는 장비별 선택) / 스팬조정 / 편심오차(시험분동, 중앙·전·후·좌·우·중앙) / 직선성(명목값 5개) / 최소유효무게(명목값 + 1~10회).
scale:{name:'전기식 지시저울',t:[{n:'기기정보',su:1,m:[],fix:['최대용량','최소눈금','단위'],rl:['값']},{n:'스팬조정',m:[],fix:['빈접시','최대용량'],rl:['조정 전','조정 후']},{n:'편심오차',m:[],fix:['시험분동','중앙','전','후','좌','우','중앙'],rl:['지시값']},{n:'직선성',m:[],reps:3,rc:5},{n:'최소유효무게',m:[],fix:['명목값',...rng(10).map(i=>(i+1)+'회')],rl:['측정값']}]},
// 압력계: 사용 유체 입력, No. 번호 열, 단위 17종.
press:{name:'압력계',t:[{n:'압력계',num:1,fl:1,m:['최대용량','최소눈금','단위','사용 유체'],d:{단위:'MPa'},o:{단위:PU},reps:3,rc:12,add:1}]},
// 타이머/RPM: 측정항목(타이머/RPM)에 따라 단위가 s 또는 min⁻¹ 로 제한.
timer:{name:'타이머/RPM',t:[{n:'타이머/RPM',nt:1,m:['측정항목','단위','장비분해능','측정분해능'],d:{측정항목:'타이머',단위:'s'},o:{측정항목:['타이머','RPM'],단위:['s','min⁻¹']},dp:TT,reps:5,rc:3,add:1}]}};
// [4] 한글 자판 → 영문 변환표: 교정자ID 를 한글 자판 상태로 쳐도 같은 키의 영문 대문자로 바꿔 준다(예: ㅅ → T).
const J={ㄱ:'R',ㄲ:'R',ㄴ:'S',ㄷ:'E',ㄸ:'E',ㄹ:'F',ㅁ:'A',ㅂ:'Q',ㅃ:'Q',ㅅ:'T',ㅆ:'T',ㅇ:'D',ㅈ:'W',ㅉ:'W',ㅊ:'C',ㅋ:'Z',ㅌ:'X',ㅍ:'V',ㅎ:'G',ㅏ:'K',ㅐ:'O',ㅑ:'I',ㅒ:'O',ㅓ:'J',ㅔ:'P',ㅕ:'U',ㅖ:'P',ㅗ:'H',ㅛ:'Y',ㅜ:'N',ㅠ:'B',ㅡ:'M',ㅣ:'L'};
// [5] mk: 표 정의(sp)로 입력용 표 데이터를 만든다. 측정값은 v 에 "회차번호_장비번호" 키로 저장된다.
const mk=(si,sp)=>({si,ch:'',m:Object.fromEntries(sp.m.map(k=>[k,(sp.d||{})[k]||''])),reps:sp.rl?sp.rl.slice():rng(sp.reps).map(i=>(i+1)+'회'),rows:sp.fix?sp.fix.map(l=>({nom:l,v:{}})):rng(sp.rc).map(()=>({nom:'',ch:'',v:{}}))});
// today: 오늘 날짜를 YYYYMMDD 형식으로.
const today=()=>{const d=new Date();return d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0')};
// U: 장비 1대의 정보 - 등록번호 reg, 접수번호 recv, 제조사 mfr, 모델 model, 기기번호 sn, 메모 memo, 단위 unit(지시저울용, 기본 g).
const U=()=>({reg:'',recv:'',mfr:'',model:'',sn:'',memo:'',unit:'g'});
// fresh: 처음 열었을 때(또는 초기화 후)의 상태. 교정대상 '기본', 장비 1대, 접수번호 앞번호 C-올해연도-.
const fresh=()=>({type:'base',su:'g',insp:'',date:today(),n:1,pre:'C-'+new Date().getFullYear()+'-',start:'',units:[U()],tb:{}});
// 폰에 저장된 상태가 있으면 불러오고, 없거나 깨졌으면 fresh 로 시작.
let S;try{S=JSON.parse(localStorage.getItem(K))||fresh()}catch(e){S=fresh()}
// sv: 현재 상태 S 를 폰에 자동 저장(입력할 때마다 호출).
const sv=()=>{try{localStorage.setItem(K,JSON.stringify(S))}catch(e){}};
// TB: 현재 교정대상의 표 목록. 처음이면 정의(T)대로 만들어 보관.
const TB=()=>S.tb[S.type]||(S.tb[S.type]=T[S.type].t.map((sp,i)=>mk(i,sp)));
// esc: 화면에 넣을 글자의 특수문자(<, >, &, ") 를 안전하게 변환.
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// inApp: 카카오톡·네이버 등 앱 안의 브라우저인지 판별(파일 저장이 막힐 수 있어 경고 표시용).
const inApp=()=>{const u=navigator.userAgent;return /KAKAOTALK|NAVER\(inapp|FBAN|FBAV|Instagram|Line\/|; wv\)/i.test(u)||(/iPhone|iPad/.test(u)&&!/Safari/.test(u))};
// sel: 선택 상자(드롭다운) HTML 생성. p = 선택값을 저장할 경로, v = 현재값, o = 선택지 목록.
const sel=(p,v,o)=>`<select data-p="${p}">${o.map(x=>`<option${x==v?' selected':''}>${x}</option>`).join('')}</select>`;
// inp: 입력칸 HTML 생성. data-p 에 저장 경로를 달아 두면 입력 즉시 S 에 반영된다.
const inp=(p,v,x='')=>`<input data-p="${p}" value="${esc(v)}" enterkeyhint="next" autocomplete="off" ${x}>`;
// [6] R(): 화면 전체를 S 로부터 다시 그린다. 장비 수 변경·표 추가/삭제·교정대상 변경처럼 구조가 바뀔 때만 호출.
function R(){
// 장비 수만큼 장비 정보 칸을 확보.
while(S.units.length<S.n)S.units.push(U());
// ths: 표 머리글의 장비 번호 칸("1번", 지시저울은 "1번 (g)").
const tb=TB(),n=S.n,ty=T[S.type],ths=rng(n).map(u=>`<th class="u">${u+1}번${S.type=='scale'?` (${S.units[u].unit||'g'})`:''}</th>`).join('');
// 화면 맨 위: 사용 유체 추천 목록(datalist), 제목 + 사용설명서 링크(같은 폴더의 manual.pdf 를 새 탭으로 엶), 앱 내장 브라우저 경고, 저장하기/초기화 버튼.
let h=`<datalist id="fl"><option value="유압"><option value="공압"><option value="수압"></datalist><div class="row" style="justify-content:space-between;margin:0"><h1>HCT Calibration</h1><a class="btn" href="manual.pdf" target="_blank" rel="noopener">사용설명서</a></div>${inApp()?'<div class="card" style="background:#fff3cd;color:#664d03;border-color:#e0c36a">앱 안에서 열린 화면에서는 파일 저장이 안 될 수 있습니다. 크롬이나 사파리 같은 브라우저로 열어 주세요.</div>':''}<div class="top"><button class="g" data-a="save">저장하기</button><button class="r" data-a="reset">초기화</button></div>`;
// 공통 정보 카드: 교정자ID(6자), 교정일자(8자).
h+=`<div class="card"><div class="row"><span class="grp"><label>교정자ID</label>${inp('insp',S.insp,'placeholder="T00000" maxlength="6" style="width:84px"')}</span><span class="grp"><label>교정일자</label>${inp('date',S.date,'inputmode="numeric" maxlength="8" style="width:92px"')}</span></div>`;
// 교정대상 선택, 장비 수 증감(−/＋).
h+=`<div class="row"><span class="grp"><label>교정대상</label><select id="type">${Object.keys(T).map(k=>`<option value="${k}"${k==S.type?' selected':''}>${T[k].name}</option>`).join('')}</select></span><span class="grp"><label>장비 수</label><button class="s" data-a="n-">−</button><b>${n}</b><button class="s" data-a="n+">＋</button></span></div>`;
// 접수번호 앞번호(7자) / 시작번호 / 자동입력 버튼.
h+=`<div class="row"><span class="grp"><label>접수번호</label>${inp('pre',S.pre,'maxlength="7" style="width:84px"')}${inp('start',S.start,'inputmode="numeric" placeholder="시작번호" style="width:90px"')}</span><button class="s" data-a="recv">자동입력</button></div>`;
// 장비 정보 표: 열 = 장비, 행 = 등록번호·접수번호·제조사·모델·기기번호.
h+=`<div class="sc"><table><tr><th class="st">장비</th>${ths}</tr>`;
// 행 목록(세 번째 값이 1 인 행은 ⇉ 버튼 표시: 1번 장비 값을 전체 장비에 복사).
[['reg','등록번호'],['recv','접수번호'],['mfr','제조사',1],['model','모델',1],['sn','기기번호']].forEach(([k,l,c])=>{
h+=`<tr><td class="st">${l}${c?` <button class="s" style="padding:2px 6px" data-a="cp:${k}" title="1번 값을 전체에 복사">⇉</button>`:''}</td>${rng(n).map(u=>`<td>${inp('units.'+u+'.'+k,S.units[u][k])}</td>`).join('')}</tr>`});
// 표 닫기 + 장비별 메모칸(글이 길어지면 자동으로 높이가 늘어남).
h+='</table></div>'+rng(n).map(u=>`<div class="row" style="margin:8px 0 0;align-items:flex-start"><label style="width:62px;padding-top:6px">${u+1}번 메모</label><textarea data-p="units.${u}.memo" rows="1" enterkeyhint="next" style="flex:1">${esc(S.units[u].memo)}</textarea></div>`).join('')+'</div>';
// 측정 표들: 표마다 카드를 하나씩 그린다.
tb.forEach((t,ti)=>{
// sp 표 정의, P 저장 경로 접두, fx 고정 행 여부, one 회차가 1개인지.
const sp=ty.t[t.si],P=`tb.${S.type}.${ti}`,fx=!!sp.fix,one=t.reps.length==1;
// 표 삭제 버튼(표 설정 줄 오른쪽 끝).
const dl=sp.add?`<button class="r" style="margin-left:auto;padding:4px 8px" data-a="deltbl:${ti}">표 삭제</button>`:'';
h+=`<div class="card">`;
// 표 제목 + 사용 유체(압력계). 제목을 숨기는 표(온/습도, 타이머)는 건너뜀.
if(!sp.nt||sp.fl)h+=`<div class="row">${sp.nt?'':`<b>${esc(t.m['측정항목']||sp.n)}</b>`}${sp.fl?`<span class="grp"><label>사용 유체</label>${inp(P+'.m.사용 유체',t.m['사용 유체'],'list="fl" style="width:110px"')}</span>`:''}</div>`;
// 표 설정 줄(측정항목, 단위 등): 선택목록이 있으면 드롭다운, 없으면 입력칸. 단위는 측정항목에 맞는 것만 표시.
const mf=sp.m.filter(k=>k!='Memo'&&k!='사용 유체');
if(mf.length)h+=`<div class="row">${mf.map(k=>`<span class="grp"><label>${k}</label>${sp.o&&sp.o[k]?sel(P+'.m.'+k,t.m[k],k=='단위'&&sp.dp?(sp.dp[t.m['측정항목']]||sp.o[k]):sp.o[k]):inp(P+'.m.'+k,t.m[k],'style="width:90px"')}</span>`).join('')}${dl}</div>`;
// 표 메모(한 줄, 길게).
if(sp.m.includes('Memo'))h+=`<div class="row"><label>메모</label>${inp(P+'.m.Memo',t.m.Memo,'style="flex:1"')}</div>`;
// 측정표 머리글: 채널 / No. / 명목값(고정 행이면 '구분') / 회차 / 장비 번호들.
h+=`<div class="sc"><table><tr>${sp.ch?'<th>채널</th>':''}${sp.num?'<th class="st" style="width:34px;min-width:34px;max-width:34px">No.</th>':''}<th class="st"${sp.num?' style="left:34px"':''}>${fx?'구분':'명목값'}</th>${one?'':'<th>회차</th>'}${ths}</tr>`;
// 데이터 행: 명목값 1개당 회차 수만큼 줄이 생긴다. 첫 줄에서만 채널·No.·명목값 칸을 세로 병합(rowspan).
t.rows.forEach((r,ri)=>t.reps.forEach((rl,rp)=>{
h+='<tr>';
if(rp==0){const rs=`rowspan="${t.reps.length}"`;
// 채널 칸: 표 전체에서 하나(세로 병합).
if(sp.ch&&ri==0)h+=`<td rowspan="${t.rows.length*t.reps.length}">${inp(`${P}.ch`,t.ch,'style="width:40px;min-width:40px"')}</td>`;
// 압력계의 No. 번호 열.
if(sp.num)h+=`<td class="st" ${rs} style="width:34px;min-width:34px;max-width:34px">${ri+1}</td>`;
// 명목값 칸(고정 행이면 글자만). 이 열은 가로 스크롤해도 왼쪽에 고정된다(sticky).
h+=`<td class="st" ${rs}${sp.num?' style="left:34px"':''}>${fx?esc(r.nom):inp(`${P}.rows.${ri}.nom`,r.nom,'inputmode="decimal" style="width:56px;min-width:56px"')+`<br><button class="s" style="padding:0 6px" data-a="delrow:${ti}:${ri}">✕</button>`}</td>`}
if(!one)h+=`<th>${esc(rl)}</th>`;
// 장비별 측정값 칸. 지시저울의 '단위' 행만 드롭다운이고 나머지는 숫자 입력칸.
h+=rng(n).map(u=>`<td>${sp.su&&r.nom=='단위'?sel('units.'+u+'.unit',S.units[u].unit||'g',['mg','g','kg']):inp(`${P}.rows.${ri}.v.${rp}_${u}`,r.v[rp+'_'+u],'inputmode="decimal"')}</td>`).join('')+'</tr>'}));
h+='</table></div>';
// 명목값 행 추가 / 회차 추가·삭제 버튼(고정 행 표에는 없음).
if(!fx)h+=`<div class="row" style="margin:6px 0 0"><button class="s" data-a="addrow:${ti}">＋ 명목값 행</button><button class="s" data-a="addrep:${ti}">＋ 회차</button><button class="s" data-a="delrep:${ti}">－ 회차</button></div>`;
h+='</div>'});
// 표 추가 버튼(맨 아래 표를 복사해서 새 표를 만든다).
if(ty.t.some(s=>s.add))h+=`<button class="s" style="width:100%;padding:10px" data-a="addtbl">＋ 표 추가</button>`;
// 완성된 HTML 을 화면에 넣고, 칸 너비 맞춤(fit)과 메모칸 높이 맞춤(gw)을 실행.
$('#app').innerHTML=h;fit();document.querySelectorAll('textarea').forEach(gw)}
// [7] 이벤트 처리 - input: 글자를 칠 때마다 S 에 값을 반영한다(화면을 다시 그리지 않아서 키보드가 유지됨).
document.addEventListener('input',e=>{
// 입력칸의 저장 경로(data-p)와 입력값. 경로가 없는 칸은 무시.
const p=e.target.dataset.p;if(!p)return;let v=e.target.value;
// 교정자ID: 한글 자판 변환 + 대문자.
if(p=='insp'){v=[...v].map(c=>J[c]||c).join('').toUpperCase();e.target.value=v}
// 접수번호 앞번호: 대문자.
if(p=='pre'){v=v.toUpperCase();e.target.value=v}
// "tb.temp.0.rows.1.v.0_2" 같은 경로를 따라 S 안의 해당 위치에 저장 + 폰에 자동 저장 + 메모칸 높이 조절.
const a=p.split('.'),l=a.pop();let o=S;a.forEach(k=>o=o[k]);o[l]=v;sv();if(e.target.tagName=='TEXTAREA')gw(e.target)});
// change: 드롭다운을 바꿨을 때. 교정대상·장비별 단위는 화면을 다시 그리고,
document.addEventListener('change',e=>{if(e.target.id=='type'){S.type=e.target.value;sv();R()}else if(/^units\.\d+\.unit$/.test(e.target.dataset.p||''))R();
// 측정항목을 바꾸면 허용되지 않는 단위를 첫 번째 허용 단위로 자동 변경.
else if(/\.m\.측정항목$/.test(e.target.dataset.p||'')){const a=e.target.dataset.p.split('.'),t=S.tb[a[1]][a[2]],sp=T[a[1]].t[t.si],l=sp.dp&&sp.dp[t.m['측정항목']];if(l){if(!l.includes(t.m['단위']))t.m['단위']=l[0];sv();R()}}});
// keydown: Enter 키를 누르면 다음 입력칸으로 이동(마지막 칸이면 키보드 닫기).
document.addEventListener('keydown',e=>{
if(e.key=='Enter'&&['INPUT','TEXTAREA'].includes(e.target.tagName)){e.preventDefault();const l=[...document.querySelectorAll('input,textarea')],i=l.indexOf(e.target);l[i+1]?l[i+1].focus():e.target.blur()}});
// click: data-a 가 달린 모든 버튼 처리. data-a 형식은 "동작:표번호:행번호".
document.addEventListener('click',async e=>{
const b=e.target.closest('[data-a]');if(!b)return;
// a 동작 이름, x/y 번호, tb 현재 표 목록, t 대상 표.
const[a,x,y]=b.dataset.a.split(':'),tb=TB(),t=tb[x];
// 장비 수 증감(1~20대).
if(a=='n+'){if(S.n<20)S.n++}
else if(a=='n-'){if(S.n>1)S.n--}
// 접수번호 자동입력: 앞번호 + 시작번호를 장비 순서대로 1씩 증가(자릿수 유지).
else if(a=='recv'){const s=S.start;S.units.slice(0,S.n).forEach((u,i)=>{u.recv=S.pre+(s===''?'':String(parseInt(s,10)+i).padStart(s.length,'0'))})}
// ⇉ : 1번 장비의 값을 전체 장비에 복사.
else if(a=='cp')S.units.forEach(u=>u[x]=S.units[0][x]);
// 명목값 행 추가/삭제, 회차 추가/삭제.
else if(a=='addrow')t.rows.push({nom:'',ch:'',v:{}});
else if(a=='delrow'){if(t.rows.length>1)t.rows.splice(y,1)}
else if(a=='addrep')t.reps.push(t.reps.length+1+'회');
else if(a=='delrep'){if(t.reps.length>1)t.reps.pop()}
// 표 추가: 맨 아래 표의 설정·명목값·회차 구성을 복사(측정값만 비움).
else if(a=='addtbl'){const l=tb[tb.length-1];tb.push(l?{si:l.si,ch:l.ch,m:{...l.m},reps:l.reps.slice(),rows:l.rows.map(q=>({nom:q.nom,ch:q.ch||'',v:{}}))}:mk(0,T[S.type].t[0]))}
// 표 삭제: 확인 후 삭제. 마지막 표를 지우면 빈 기본 표 하나가 다시 생긴다.
else if(a=='deltbl'){if(confirm('이 표를 삭제할까요?')){tb.splice(x,1);if(!tb.length)tb.push(mk(0,T[S.type].t[0]))}}
// 초기화: 확인 후 모든 입력 삭제(교정자ID 와 교정대상은 유지).
else if(a=='reset'){if(confirm('입력한 내용을 모두 지울까요?')){const k=S.insp,ty=S.type;S=fresh();S.insp=k;S.type=ty;sv();R()}return}
// 저장하기 → save() 실행.
else if(a=='save'){await save();return}
// 위 동작이 끝나면 폰에 저장하고 화면을 다시 그린다.
sv();R()});
// [8] CSV 저장 - cl: CSV 칸 안에 들어가면 안 되는 쉼표·줄바꿈을 공백으로 바꾼다.
const cl=v=>String(v??'').replace(/[,\r\n]+/g,' ').trim();
// now: 저장일시를 "2026-11-12 06:41:36" 형식으로(쉼표가 없고 기기 언어와 무관).
const now=()=>{const d=new Date(),z=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`};
// build(u): u번(0부터) 장비 1대분의 CSV 파일 하나를 만들어 File 로 돌려준다.
async function build(u){
const tb=TB(),ty=T[S.type],q=S.units[u],un=S.type=='scale'?(q.unit||'g'):'';
// 파일 위쪽 정보 10줄: 저장일시, 교정대상, 사번, 교정일자, 등록번호, 접수번호, 제조사, 모델, 기기번호, 메모.
let s=`저장일시,${now()}\n교정대상,${ty.name}\n사번,${cl(S.insp)}\n교정일자,${cl(S.date)}\n등록번호,${cl(q.reg)}\n접수번호,${cl(q.recv)}\n제조사,${cl(q.mfr)}\n모델,${cl(q.model)}\n기기번호,${cl(q.sn)}\n메모,${cl(q.memo)}\n\n`;
// 표마다 [TABLE_START]~[TABLE_END] 블록을 만든다: 표 이름·설정 줄, 머리글 줄, 데이터 줄.
tb.forEach((t,ti)=>{const sp=ty.t[t.si];
s+=`[TABLE_START],Table_${ti+1},Rows,${t.rows.length},Cols,${t.reps.length+1+(sp.ch?1:0)}\n`;
s+=`표이름,${cl(t.m['측정항목']||sp.n)}`+(un?`,단위,${un}`:'')+sp.m.filter(k=>k!='측정항목').map(k=>`,${k},${cl(t.m[k])}`).join('')+'\n';
s+=(sp.ch?'채널,':'')+(sp.fix?'구분':'명목값')+t.reps.map(r=>','+cl(r)).join('')+'\n';
t.rows.forEach(r=>{s+=(sp.ch?cl(t.ch)+',':'')+cl(r.nom)+t.reps.map((_,rp)=>','+cl(sp.su&&r.nom=='단위'?un:r.v[rp+'_'+u])).join('')+'\n'});
s+='[TABLE_END]\n\n'});
// 검증코드: 파일 내용 전체의 SHA-256(HTTPS 에서만 계산 가능, 불가능하면 N/A).
let hs='N/A';
try{hs=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('')}catch(e){}
// 파일 이름: 접수번호_등록번호.csv (파일명에 쓸 수 없는 문자는 _ 로 변경). 맨 앞에 BOM(한글 호환), 맨 끝에 검증코드를 붙여 File 생성.
const rc=cl(q.recv)||'기록'+(u+1),nm=((q.reg?rc+'_'+cl(q.reg):rc)+'.csv').replace(/[\\/:*?"<>|]/g,'_');
return new File(['\uFEFF'+s+'검증코드(Hash),'+hs],nm,{type:'text/csv'})}
// save: 저장 중 오류가 나면 알림창으로 이유를 보여 준다.
async function save(){try{await save0()}catch(e){alert('저장하지 못했습니다: '+(e&&e.message||e))}}
// save0: 장비별 파일을 모두 만든 뒤 가장 좋은 방법으로 저장한다 -
// 1) PC·최신 안드로이드: 폴더를 한 번 고르면 전부 저장, 2) 아이폰 등: 공유 시트, 3) 안 되면 일반 다운로드.
async function save0(){
const F=[];for(let u=0;u<S.n;u++)F.push(await build(u));
// 파일 이름이 겹치면 덮어쓰게 되므로 중단하고 안내.
if(new Set(F.map(f=>f.name)).size<F.length){alert('접수번호와 등록번호가 같은 장비가 있어 파일 이름이 겹칩니다. 번호를 다르게 입력해 주세요.');return}
if(window.showDirectoryPicker){try{const d=await showDirectoryPicker({mode:'readwrite',id:'hctcal'});for(const f of F){const w=await(await d.getFileHandle(f.name,{create:true})).createWritable();await w.write(f);await w.close()}alert(F.length+'개 파일을 저장했습니다.');return}catch(e){if(e.name=='AbortError')return}}
try{if(navigator.canShare&&navigator.canShare({files:F})){await navigator.share({files:F});return}}catch(e){if(e.name=='AbortError')return}
for(const f of F){const a=document.createElement('a');a.href=URL.createObjectURL(f);a.download=f.name;document.body.appendChild(a);a.click();a.remove();await new Promise(r=>setTimeout(r,400))}
alert(F.length+'개 파일을 다운로드했습니다. 브라우저의 다운로드 폴더(아이폰은 파일 앱 > 다운로드)를 확인하세요.')}
// 폰이 저장 공간 부족 시 앱 데이터를 지우지 않도록 보존 요청.
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
// 서비스 워커 등록: 한 번 접속하면 인터넷이 없어도 앱이 열리게 한다(sw.js).
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
// [9] 화면 맞춤 - fit: 장비 2대까지는 한 화면에 꽉 차게, 3대부터는 칸 너비를 고정하고 가로 스크롤.
const fit=()=>document.querySelectorAll('.sc').forEach(sc=>{const t=sc.querySelector('table');if(!t)return;t.style.width='auto';sc.style.setProperty('--cw','40px');let F=0;t.rows[0].querySelectorAll('th:not(.u)').forEach(x=>F+=x.offsetWidth);sc.style.setProperty('--cw',Math.max(44,Math.floor((sc.clientWidth-F)/2)-8)+'px');t.style.width=''});
// gw: 메모칸 높이를 글자 양에 맞춘다(비어 있으면 한 줄).
const gw=el=>{el.style.height='auto';el.style.height=el.scrollHeight+2+'px'};
// 화면 크기(회전 포함)가 바뀌면 다시 맞춤.
addEventListener('resize',()=>{fit();document.querySelectorAll('textarea').forEach(gw)});
// [10] 숫자 키패드용 버튼 바(± 부호 / 다음 ▶ / 완료): 숫자 칸을 누르면 키보드 위에 나타난다.
const kb=$('#kb'),vv=window.visualViewport,dec=el=>el&&el.tagName=='INPUT'&&el.inputMode=='decimal';
// 키보드가 올라오면 바가 키보드 바로 위에 오도록 위치를 계산.
const pos=()=>{if(vv)kb.style.bottom=Math.max(0,innerHeight-vv.height-vv.offsetTop)+'px'};
if(vv)['resize','scroll'].forEach(v=>vv.addEventListener(v,pos));
// 숫자 칸을 누르면 바를 표시하고 그 칸이 화면 가운데 보이도록 스크롤.
document.addEventListener('focusin',e=>{if(dec(e.target)){kb.style.display='flex';pos();const t=e.target;setTimeout(()=>t.scrollIntoView({block:'center',inline:'nearest'}),350)}});
// 숫자 칸을 벗어나면 바를 숨김.
document.addEventListener('focusout',()=>setTimeout(()=>{if(!dec(document.activeElement))kb.style.display='none'},120));
// 버튼 동작: sign = 부호 반전, next = 다음 칸으로 이동, 그 외(완료) = 입력칸에서 빠져나와 키보드 닫기.
const kbAct=e=>{const k=e.target.closest('[data-k]'),el=document.activeElement;if(!k||!dec(el))return;
if(k.dataset.k=='sign'){const v=el.value;el.value=v[0]=='-'?v.slice(1):'-'+v;el.dispatchEvent(new Event('input',{bubbles:true}))}
else if(k.dataset.k=='next'){const l=[...document.querySelectorAll('input,textarea')],n=l[l.indexOf(el)+1];n?n.focus():el.blur()}
else el.blur()};
// 아이폰은 터치 뒤에 마우스 클릭을 한 번 더 보내서 키보드가 닫히거나 엉뚱한 칸이 선택되는 문제가 있다.
// 그래서 누르는 순간(touchstart)에는 기본 동작을 막고, 손가락을 뗄 때(touchend) 실행한다. PC 는 마우스로 처리.
kb.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});
kb.addEventListener('touchend',e=>{e.preventDefault();kbAct(e)},{passive:false});
kb.addEventListener('mousedown',e=>e.preventDefault());
kb.addEventListener('click',kbAct);
// [11] 시작 처리 - 이전 버전 상태 이전: 옛 지시저울 표는 버리고, 전체 단위를 장비별 단위로 복사.
if(S.mv!==4){delete S.tb.scale;S.units.forEach(q=>{if(!q.unit)q.unit=S.su||'g'});S.mv=4;sv()}
// yfix: 연도가 바뀌면 접수번호 앞번호(C-연도-)를 올해로 자동 변경(직접 바꾼 다른 형식은 그대로 둠).
const yfix=()=>{const y=new Date().getFullYear();if(S.yr!==y){if(/^C-\d{4}-$/.test(S.pre))S.pre='C-'+y+'-';S.yr=y;sv()}};
// 앱을 켜 둔 채 연도가 바뀐 경우에도 화면에 돌아올 때 확인.
document.addEventListener('visibilitychange',()=>{if(!document.hidden){const o=S.pre;yfix();if(S.pre!==o)R()}});
yfix();
// 첫 화면 그리기.
R();
