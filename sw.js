// sw.js: 서비스 워커. 한 번 접속하면 아래 파일들을 폰에 저장해 두고, 인터넷이 없어도 앱이 열리게 한다.
//  C = 저장소 이름(파일 구성을 바꾸면 v2 → v3 처럼 올려서 옛 저장분을 정리), F = 저장할 파일 목록(새 파일을 추가하면 여기에도 넣어야 함).
const C='hct-v2',F=['./','index.html','style.css','app.js','manifest.webmanifest','icon.svg'];
// 설치 시: 파일 목록을 모두 저장하고 바로 활성화.
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(F)));self.skipWaiting()});
// 활성화 시: 이전 이름의 옛 저장분을 지우고 열려 있는 화면을 이 워커가 담당하게 함.
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
// 파일 요청 처리: 저장된 것이 있으면 즉시 보여 주고(빠름), 동시에 인터넷에서 새 버전을 받아 저장해 둔다.
// 그래서 새 버전은 앱을 두 번 열어야 보인다. 인터넷이 없으면 저장된 것을 그대로 사용.
self.addEventListener('fetch',e=>{
if(e.request.method!=='GET')return;
e.respondWith(caches.match(e.request).then(r=>{
const n=fetch(e.request).then(x=>{const y=x.clone();caches.open(C).then(c=>c.put(e.request,y));return x}).catch(()=>r);
return r||n}))});
