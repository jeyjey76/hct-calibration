const $=s=>document.querySelector(s),K='hctcal_v3_state',rng=n=>Array.from({length:n},(_,i)=>i);
const TO={측정항목:['온도','습도'],단위:['℃','℉','% R.H.']},PU=['Pa','hPa','kPa','MPa','mbar','bar','kgf/㎠','kgf/㎡','psi','inHg','mmHg','cmHg','inH2O','mmH2O','cmH2O','N/㎠','atm'];
const TD={온도:['℃','℉'],습도:['% R.H.']},TT={타이머:['s'],RPM:['min⁻¹']};
const T={
base:{name:'기본',t:[{n:'기본',m:['측정항목','측정조건','측정범위','최소눈금','단위'],d:{},reps:3,rc:5,add:1}]},
temp:{name:'온/습도',t:[{n:'온도',nt:1,m:['측정항목','단위','Memo'],d:{측정항목:'온도',단위:'℃'},o:TO,dp:TD,ch:1,reps:3,rc:3,add:1},{n:'습도',nt:1,m:['측정항목','단위','Memo'],d:{측정항목:'습도',단위:'% R.H.'},o:TO,dp:TD,ch:1,reps:3,rc:3,add:1}]},
scale:{name:'전기식 지시저울',t:[{n:'기기정보',su:1,m:[],fix:['최대용량','최소눈금','단위'],rl:['값']},{n:'스팬조정',m:[],fix:['빈접시','최대용량'],rl:['조정 전','조정 후']},{n:'편심오차',m:[],fix:['시험분동','중앙','전','후','좌','우','중앙'],rl:['지시값']},{n:'직선성',m:[],reps:3,rc:5},{n:'최소유효무게',m:[],fix:['명목값',...rng(10).map(i=>(i+1)+'회')],rl:['측정값']}]},
press:{name:'압력계',t:[{n:'압력계',num:1,fl:1,m:['최대용량','최소눈금','단위','사용 유체'],d:{단위:'MPa'},o:{단위:PU},reps:3,rc:12,add:1}]},
timer:{name:'타이머/RPM',t:[{n:'타이머/RPM',nt:1,m:['측정항목','단위','장비분해능','측정분해능'],d:{측정항목:'타이머',단위:'s'},o:{측정항목:['타이머','RPM'],단위:['s','min⁻¹']},dp:TT,reps:5,rc:3,add:1}]}};
const J={ㄱ:'R',ㄲ:'R',ㄴ:'S',ㄷ:'E',ㄸ:'E',ㄹ:'F',ㅁ:'A',ㅂ:'Q',ㅃ:'Q',ㅅ:'T',ㅆ:'T',ㅇ:'D',ㅈ:'W',ㅉ:'W',ㅊ:'C',ㅋ:'Z',ㅌ:'X',ㅍ:'V',ㅎ:'G',ㅏ:'K',ㅐ:'O',ㅑ:'I',ㅒ:'O',ㅓ:'J',ㅔ:'P',ㅕ:'U',ㅖ:'P',ㅗ:'H',ㅛ:'Y',ㅜ:'N',ㅠ:'B',ㅡ:'M',ㅣ:'L'};
const mk=(si,sp)=>({si,ch:'',m:Object.fromEntries(sp.m.map(k=>[k,(sp.d||{})[k]||''])),reps:sp.rl?sp.rl.slice():rng(sp.reps).map(i=>(i+1)+'회'),rows:sp.fix?sp.fix.map(l=>({nom:l,v:{}})):rng(sp.rc).map(()=>({nom:'',ch:'',v:{}}))});
const today=()=>{const d=new Date();return d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0')};
const U=()=>({reg:'',recv:'',mfr:'',model:'',sn:'',memo:'',unit:'g'});
const fresh=()=>({type:'base',su:'g',insp:'',date:today(),n:1,pre:'C-'+new Date().getFullYear()+'-',start:'',units:[U()],tb:{}});
let S;try{S=JSON.parse(localStorage.getItem(K))||fresh()}catch(e){S=fresh()}
const sv=()=>{try{localStorage.setItem(K,JSON.stringify(S))}catch(e){}};
const TB=()=>S.tb[S.type]||(S.tb[S.type]=T[S.type].t.map((sp,i)=>mk(i,sp)));
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const inApp=()=>{const u=navigator.userAgent;return /KAKAOTALK|NAVER\(inapp|FBAN|FBAV|Instagram|Line\/|; wv\)/i.test(u)||(/iPhone|iPad/.test(u)&&!/Safari/.test(u))};
const sel=(p,v,o)=>`<select data-p="${p}">${o.map(x=>`<option${x==v?' selected':''}>${x}</option>`).join('')}</select>`;
const inp=(p,v,x='')=>`<input data-p="${p}" value="${esc(v)}" enterkeyhint="next" autocomplete="off" ${x}>`;
function R(){
while(S.units.length<S.n)S.units.push(U());
const tb=TB(),n=S.n,ty=T[S.type],ths=rng(n).map(u=>`<th class="u">${u+1}번${S.type=='scale'?` (${S.units[u].unit||'g'})`:''}</th>`).join('');
let h=`<datalist id="fl"><option value="유압"><option value="공압"><option value="수압"></datalist><h1>HCT Calibration</h1>${inApp()?'<div class="card" style="background:#fff3cd;color:#664d03;border-color:#e0c36a">앱 안에서 열린 화면에서는 파일 저장이 안 될 수 있습니다. 크롬이나 사파리 같은 브라우저로 열어 주세요.</div>':''}<div class="top"><button class="g" data-a="save">저장하기</button><button class="r" data-a="reset">초기화</button></div>`;
h+=`<div class="card"><div class="row"><span class="grp"><label>교정자ID</label>${inp('insp',S.insp,'placeholder="T00000" maxlength="6" style="width:84px"')}</span><span class="grp"><label>교정일자</label>${inp('date',S.date,'inputmode="numeric" maxlength="8" style="width:92px"')}</span></div>`;
h+=`<div class="row"><span class="grp"><label>교정대상</label><select id="type">${Object.keys(T).map(k=>`<option value="${k}"${k==S.type?' selected':''}>${T[k].name}</option>`).join('')}</select></span><span class="grp"><label>장비 수</label><button class="s" data-a="n-">−</button><b>${n}</b><button class="s" data-a="n+">＋</button></span></div>`;
h+=`<div class="row"><span class="grp"><label>접수번호</label>${inp('pre',S.pre,'maxlength="7" style="width:84px"')}${inp('start',S.start,'inputmode="numeric" placeholder="시작번호" style="width:90px"')}</span><button class="s" data-a="recv">자동입력</button></div>`;
h+=`<div class="sc"><table><tr><th class="st">장비</th>${ths}</tr>`;
[['reg','등록번호'],['recv','접수번호'],['mfr','제조사',1],['model','모델',1],['sn','기기번호']].forEach(([k,l,c])=>{
h+=`<tr><td class="st">${l}${c?` <button class="s" style="padding:2px 6px" data-a="cp:${k}" title="1번 값을 전체에 복사">⇉</button>`:''}</td>${rng(n).map(u=>`<td>${inp('units.'+u+'.'+k,S.units[u][k])}</td>`).join('')}</tr>`});
h+='</table></div>'+rng(n).map(u=>`<div class="row" style="margin:8px 0 0;align-items:flex-start"><label style="width:62px;padding-top:6px">${u+1}번 메모</label><textarea data-p="units.${u}.memo" rows="1" enterkeyhint="next" style="flex:1">${esc(S.units[u].memo)}</textarea></div>`).join('')+'</div>';
tb.forEach((t,ti)=>{
const sp=ty.t[t.si],P=`tb.${S.type}.${ti}`,fx=!!sp.fix,one=t.reps.length==1;
const dl=sp.add?`<button class="r" style="margin-left:auto;padding:4px 8px" data-a="deltbl:${ti}">표 삭제</button>`:'';
h+=`<div class="card">`;
if(!sp.nt||sp.fl)h+=`<div class="row">${sp.nt?'':`<b>${esc(t.m['측정항목']||sp.n)}</b>`}${sp.fl?`<span class="grp"><label>사용 유체</label>${inp(P+'.m.사용 유체',t.m['사용 유체'],'list="fl" style="width:110px"')}</span>`:''}</div>`;
const mf=sp.m.filter(k=>k!='Memo'&&k!='사용 유체');
if(mf.length)h+=`<div class="row">${mf.map(k=>`<span class="grp"><label>${k}</label>${sp.o&&sp.o[k]?sel(P+'.m.'+k,t.m[k],k=='단위'&&sp.dp?(sp.dp[t.m['측정항목']]||sp.o[k]):sp.o[k]):inp(P+'.m.'+k,t.m[k],'style="width:90px"')}</span>`).join('')}${dl}</div>`;
if(sp.m.includes('Memo'))h+=`<div class="row"><label>메모</label>${inp(P+'.m.Memo',t.m.Memo,'style="flex:1"')}</div>`;
h+=`<div class="sc"><table><tr>${sp.ch?'<th>채널</th>':''}${sp.num?'<th class="st" style="width:34px;min-width:34px;max-width:34px">No.</th>':''}<th class="st"${sp.num?' style="left:34px"':''}>${fx?'구분':'명목값'}</th>${one?'':'<th>회차</th>'}${ths}</tr>`;
t.rows.forEach((r,ri)=>t.reps.forEach((rl,rp)=>{
h+='<tr>';
if(rp==0){const rs=`rowspan="${t.reps.length}"`;
if(sp.ch&&ri==0)h+=`<td rowspan="${t.rows.length*t.reps.length}">${inp(`${P}.ch`,t.ch,'style="width:40px;min-width:40px"')}</td>`;
if(sp.num)h+=`<td class="st" ${rs} style="width:34px;min-width:34px;max-width:34px">${ri+1}</td>`;
h+=`<td class="st" ${rs}${sp.num?' style="left:34px"':''}>${fx?esc(r.nom):inp(`${P}.rows.${ri}.nom`,r.nom,'inputmode="decimal" style="width:56px;min-width:56px"')+`<br><button class="s" style="padding:0 6px" data-a="delrow:${ti}:${ri}">✕</button>`}</td>`}
if(!one)h+=`<th>${esc(rl)}</th>`;
h+=rng(n).map(u=>`<td>${sp.su&&r.nom=='단위'?sel('units.'+u+'.unit',S.units[u].unit||'g',['mg','g','kg']):inp(`${P}.rows.${ri}.v.${rp}_${u}`,r.v[rp+'_'+u],'inputmode="decimal"')}</td>`).join('')+'</tr>'}));
h+='</table></div>';
if(!fx)h+=`<div class="row" style="margin:6px 0 0"><button class="s" data-a="addrow:${ti}">＋ 명목값 행</button><button class="s" data-a="addrep:${ti}">＋ 회차</button><button class="s" data-a="delrep:${ti}">－ 회차</button></div>`;
h+='</div>'});
if(ty.t.some(s=>s.add))h+=`<button class="s" style="width:100%;padding:10px" data-a="addtbl">＋ 표 추가</button>`;
$('#app').innerHTML=h;fit();document.querySelectorAll('textarea').forEach(gw)}
document.addEventListener('input',e=>{
const p=e.target.dataset.p;if(!p)return;let v=e.target.value;
if(p=='insp'){v=[...v].map(c=>J[c]||c).join('').toUpperCase();e.target.value=v}
if(p=='pre'){v=v.toUpperCase();e.target.value=v}
const a=p.split('.'),l=a.pop();let o=S;a.forEach(k=>o=o[k]);o[l]=v;sv();if(e.target.tagName=='TEXTAREA')gw(e.target)});
document.addEventListener('change',e=>{if(e.target.id=='type'){S.type=e.target.value;sv();R()}else if(/^units\.\d+\.unit$/.test(e.target.dataset.p||''))R();
else if(/\.m\.측정항목$/.test(e.target.dataset.p||'')){const a=e.target.dataset.p.split('.'),t=S.tb[a[1]][a[2]],sp=T[a[1]].t[t.si],l=sp.dp&&sp.dp[t.m['측정항목']];if(l){if(!l.includes(t.m['단위']))t.m['단위']=l[0];sv();R()}}});
document.addEventListener('keydown',e=>{
if(e.key=='Enter'&&['INPUT','TEXTAREA'].includes(e.target.tagName)){e.preventDefault();const l=[...document.querySelectorAll('input,textarea')],i=l.indexOf(e.target);l[i+1]?l[i+1].focus():e.target.blur()}});
document.addEventListener('click',async e=>{
const b=e.target.closest('[data-a]');if(!b)return;
const[a,x,y]=b.dataset.a.split(':'),tb=TB(),t=tb[x];
if(a=='n+'){if(S.n<20)S.n++}
else if(a=='n-'){if(S.n>1)S.n--}
else if(a=='recv'){const s=S.start;S.units.slice(0,S.n).forEach((u,i)=>{u.recv=S.pre+(s===''?'':String(parseInt(s,10)+i).padStart(s.length,'0'))})}
else if(a=='cp')S.units.forEach(u=>u[x]=S.units[0][x]);
else if(a=='addrow')t.rows.push({nom:'',ch:'',v:{}});
else if(a=='delrow'){if(t.rows.length>1)t.rows.splice(y,1)}
else if(a=='addrep')t.reps.push(t.reps.length+1+'회');
else if(a=='delrep'){if(t.reps.length>1)t.reps.pop()}
else if(a=='addtbl'){const l=tb[tb.length-1];tb.push(l?{si:l.si,ch:l.ch,m:{...l.m},reps:l.reps.slice(),rows:l.rows.map(q=>({nom:q.nom,ch:q.ch||'',v:{}}))}:mk(0,T[S.type].t[0]))}
else if(a=='deltbl'){if(confirm('이 표를 삭제할까요?')){tb.splice(x,1);if(!tb.length)tb.push(mk(0,T[S.type].t[0]))}}
else if(a=='reset'){if(confirm('입력한 내용을 모두 지울까요?')){const k=S.insp,ty=S.type;S=fresh();S.insp=k;S.type=ty;sv();R()}return}
else if(a=='save'){await save();return}
sv();R()});
const cl=v=>String(v??'').replace(/[,\r\n]+/g,' ').trim();
const now=()=>{const d=new Date(),z=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`};
async function build(u){
const tb=TB(),ty=T[S.type],q=S.units[u],un=S.type=='scale'?(q.unit||'g'):'';
let s=`저장일시,${now()}\n교정대상,${ty.name}\n사번,${cl(S.insp)}\n교정일자,${cl(S.date)}\n등록번호,${cl(q.reg)}\n접수번호,${cl(q.recv)}\n제조사,${cl(q.mfr)}\n모델,${cl(q.model)}\n기기번호,${cl(q.sn)}\n메모,${cl(q.memo)}\n\n`;
tb.forEach((t,ti)=>{const sp=ty.t[t.si];
s+=`[TABLE_START],Table_${ti+1},Rows,${t.rows.length},Cols,${t.reps.length+1+(sp.ch?1:0)}\n`;
s+=`표이름,${cl(t.m['측정항목']||sp.n)}`+(un?`,단위,${un}`:'')+sp.m.filter(k=>k!='측정항목').map(k=>`,${k},${cl(t.m[k])}`).join('')+'\n';
s+=(sp.ch?'채널,':'')+(sp.fix?'구분':'명목값')+t.reps.map(r=>','+cl(r)).join('')+'\n';
t.rows.forEach(r=>{s+=(sp.ch?cl(t.ch)+',':'')+cl(r.nom)+t.reps.map((_,rp)=>','+cl(sp.su&&r.nom=='단위'?un:r.v[rp+'_'+u])).join('')+'\n'});
s+='[TABLE_END]\n\n'});
let hs='N/A';
try{hs=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('')}catch(e){}
const rc=cl(q.recv)||'기록'+(u+1),nm=((q.reg?rc+'_'+cl(q.reg):rc)+'.csv').replace(/[\\/:*?"<>|]/g,'_');
return new File(['\uFEFF'+s+'검증코드(Hash),'+hs],nm,{type:'text/csv'})}
async function save(){try{await save0()}catch(e){alert('저장하지 못했습니다: '+(e&&e.message||e))}}
async function save0(){
const F=[];for(let u=0;u<S.n;u++)F.push(await build(u));
if(new Set(F.map(f=>f.name)).size<F.length){alert('접수번호와 등록번호가 같은 장비가 있어 파일 이름이 겹칩니다. 번호를 다르게 입력해 주세요.');return}
if(window.showDirectoryPicker){try{const d=await showDirectoryPicker({mode:'readwrite',id:'hctcal'});for(const f of F){const w=await(await d.getFileHandle(f.name,{create:true})).createWritable();await w.write(f);await w.close()}alert(F.length+'개 파일을 저장했습니다.');return}catch(e){if(e.name=='AbortError')return}}
try{if(navigator.canShare&&navigator.canShare({files:F})){await navigator.share({files:F});return}}catch(e){if(e.name=='AbortError')return}
for(const f of F){const a=document.createElement('a');a.href=URL.createObjectURL(f);a.download=f.name;document.body.appendChild(a);a.click();a.remove();await new Promise(r=>setTimeout(r,400))}
alert(F.length+'개 파일을 다운로드했습니다. 브라우저의 다운로드 폴더(아이폰은 파일 앱 > 다운로드)를 확인하세요.')}
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
const fit=()=>document.querySelectorAll('.sc').forEach(sc=>{const t=sc.querySelector('table');if(!t)return;t.style.width='auto';sc.style.setProperty('--cw','40px');let F=0;t.rows[0].querySelectorAll('th:not(.u)').forEach(x=>F+=x.offsetWidth);sc.style.setProperty('--cw',Math.max(44,Math.floor((sc.clientWidth-F)/2)-8)+'px');t.style.width=''});
const gw=el=>{el.style.height='auto';el.style.height=el.scrollHeight+2+'px'};
addEventListener('resize',()=>{fit();document.querySelectorAll('textarea').forEach(gw)});
const kb=$('#kb'),vv=window.visualViewport,dec=el=>el&&el.tagName=='INPUT'&&el.inputMode=='decimal';
const pos=()=>{if(vv)kb.style.bottom=Math.max(0,innerHeight-vv.height-vv.offsetTop)+'px'};
if(vv)['resize','scroll'].forEach(v=>vv.addEventListener(v,pos));
document.addEventListener('focusin',e=>{if(dec(e.target)){kb.style.display='flex';pos();const t=e.target;setTimeout(()=>t.scrollIntoView({block:'center',inline:'nearest'}),350)}});
document.addEventListener('focusout',()=>setTimeout(()=>{if(!dec(document.activeElement))kb.style.display='none'},120));
const kbAct=e=>{const k=e.target.closest('[data-k]'),el=document.activeElement;if(!k||!dec(el))return;
if(k.dataset.k=='sign'){const v=el.value;el.value=v[0]=='-'?v.slice(1):'-'+v;el.dispatchEvent(new Event('input',{bubbles:true}))}
else if(k.dataset.k=='next'){const l=[...document.querySelectorAll('input,textarea')],n=l[l.indexOf(el)+1];n?n.focus():el.blur()}
else el.blur()};
kb.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});
kb.addEventListener('touchend',e=>{e.preventDefault();kbAct(e)},{passive:false});
kb.addEventListener('mousedown',e=>e.preventDefault());
kb.addEventListener('click',kbAct);
if(S.mv!==4){delete S.tb.scale;S.units.forEach(q=>{if(!q.unit)q.unit=S.su||'g'});S.mv=4;sv()}
const yfix=()=>{const y=new Date().getFullYear();if(S.yr!==y){if(/^C-\d{4}-$/.test(S.pre))S.pre='C-'+y+'-';S.yr=y;sv()}};
document.addEventListener('visibilitychange',()=>{if(!document.hidden){const o=S.pre;yfix();if(S.pre!==o)R()}});
yfix();
R();
