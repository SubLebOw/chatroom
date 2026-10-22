// Chat room: PeerJS peer-to-peer (same approach as Coreburn co-op). Host relays every message to all peers.
const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ', PREFIX='chatroom-r1-', MAX=12;
const OPTS={debug:0,config:{iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]}};
const $=id=>document.getElementById(id);
let peer,conns=new Map(),hostConn=null,isHost=false,me='',code='',members=[];
const norm=s=>String(s||'').toUpperCase().replace(/[^A-Z]/g,'').slice(0,4);
const rnd=()=>Array.from({length:4},()=>ALPHABET[Math.random()*ALPHABET.length|0]).join('');
const errText=e=>({'peer-unavailable':'Room not found. Check the code.','unavailable-id':'Code in use'}[e&&e.type]||(e&&e.message)||'Connection failed');
const status=s=>$('status').textContent=s;
$('nick').value=localStorage.getItem('chat-nick')||'';
const q=new URLSearchParams(location.search).get('room'); if(q)$('code').value=norm(q);

function add(m){const li=document.createElement('li');
  if(m.t==='sys'){li.className='sys';li.textContent=m.text}
  else{const t=document.createElement('span');t.className='t';t.textContent=new Date(m.ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    const n=document.createElement('span');n.className='n';n.textContent=m.name+':';li.append(t,n,document.createTextNode(m.text))}
  const box=$('msgs'),stick=box.scrollTop+box.clientHeight>=box.scrollHeight-40;box.append(li);if(stick)box.scrollTop=box.scrollHeight}
function showMembers(list){members=list;$('count').textContent=list.length;$('members').replaceChildren(...list.map(n=>{const li=document.createElement('li');li.textContent=n;return li}))}
function handle(m){if(m.t==='msg'||m.t==='sys')add(m);else if(m.t==='members')showMembers(m.list)}
function enter(){$('lobby').hidden=true;$('room').hidden=false;$('rcode').textContent=code;history.replaceState(null,'','?room='+code);$('text').focus()}
function nick(){const n=$('nick').value.trim().slice(0,20);if(!n){status('Pick a nickname first.');return null}localStorage.setItem('chat-nick',n);return n}
function busy(b){$('host').disabled=$('join').disabled=b}
function newPeer(id){return new Promise((res,rej)=>{const p=id?new Peer(id,OPTS):new Peer(OPTS);const t=setTimeout(()=>{p.destroy();rej(new Error("Can't reach the server."))},12000);
  p.once('open',()=>{clearTimeout(t);res(p)});p.once('error',e=>{clearTimeout(t);p.destroy();rej(e)})})}

// ---- host ----
const hostList=()=>[me+' (host)',...[...conns.values()].filter(c=>c.name).map(c=>c.name)];
function relay(m){handle(m);for(const c of conns.values())if(c.name&&c.open)try{c.send(m)}catch{}}
const sys=text=>relay({t:'sys',text,ts:Date.now()});
const pushMembers=()=>relay({t:'members',list:hostList()});
$('host').onclick=async()=>{me=nick();if(!me)return;busy(true);status('Opening room…');
  const fixed=norm($('hcode').value);if(fixed&&fixed.length!==4){status('Room codes are 4 letters.');busy(false);return}
  if(fixed){try{peer=await newPeer(PREFIX+fixed);code=fixed}catch(e){status(e.type==='unavailable-id'?'Code '+fixed+' is already in use. Try another, or wait a minute if you just closed it.':errText(e));busy(false);peer=null;return}}
  for(let i=0;i<5&&!peer;i++){const c=rnd();try{peer=await newPeer(PREFIX+c);code=c}catch(e){if(e.type!=='unavailable-id'){status(errText(e));busy(false);return}}}
  if(!peer){status('Could not create a room, try again');busy(false);return}
  isHost=true;peer.on('disconnected',()=>{try{peer.reconnect()}catch{}});
  peer.on('connection',c=>{c.on('open',()=>{if(conns.size>=MAX-1){c.send({t:'bye',reason:'That room is full (12 people max).'});setTimeout(()=>c.close(),300);return}conns.set(c.peer,c)});
    c.on('data',m=>{if(!m||!conns.has(c.peer))return;
      if(m.t==='hello'&&!c.name){c.name=String(m.name||'Guest').slice(0,20);pushMembers();sys(c.name+' joined')}
      else if(m.t==='msg'&&c.name)relay({t:'msg',name:c.name,text:String(m.text||'').slice(0,500),ts:Date.now()})});
    const gone=()=>{if(conns.delete(c.peer)&&c.name){sys(c.name+' left');pushMembers()}};c.on('close',gone);c.on('error',gone)});
  setInterval(()=>{for(const c of conns.values())if(c.open)try{c.send({t:'ping'})}catch{}},3000);
  enter();showMembers(hostList());add({t:'sys',text:'Room open. Share the link or code '+code+'.'})};
window.addEventListener('beforeunload',()=>{if(isHost)for(const c of conns.values())try{c.send({t:'bye',reason:'Host left, room closed.'})}catch{}});

// ---- join ----
$('join').onclick=async()=>{me=nick();if(!me)return;code=norm($('code').value);if(code.length!==4){status('Room codes are 4 letters.');return}
  busy(true);status('Connecting…');
  try{peer=await newPeer();hostConn=await new Promise((res,rej)=>{const c=peer.connect(PREFIX+code,{reliable:true,serialization:'json'});
    const t=setTimeout(()=>rej(new Error('Could not connect to that room.')),12000);c.once('open',()=>{clearTimeout(t);res(c)});peer.once('error',e=>{clearTimeout(t);rej(e)})})}
  catch(e){status(errText(e));busy(false);try{peer.destroy()}catch{};peer=null;return}
  let ended=false;const end=r=>{if(ended)return;ended=true;add({t:'sys',text:r});$('text').disabled=true;showMembers([])};
  let seen=Date.now();const hb=setInterval(()=>{if(Date.now()-seen>10000){clearInterval(hb);end('Host left, room closed.')}},2000);
  hostConn.on('data',m=>{seen=Date.now();if(m&&m.t==='bye')end(m.reason);else if(m)handle(m)});
  hostConn.on('close',()=>end('Host left, room closed.'));
  hostConn.send({t:'hello',name:me});enter()};

$('form').onsubmit=e=>{e.preventDefault();const text=$('text').value.trim();if(!text)return;$('text').value='';
  if(isHost)relay({t:'msg',name:me,text:text.slice(0,500),ts:Date.now()});else if(hostConn&&hostConn.open)hostConn.send({t:'msg',text})};
$('copy').onclick=()=>{const u=location.origin+location.pathname+'?room='+code;navigator.clipboard?.writeText(u);$('copy').textContent='Copied!';setTimeout(()=>$('copy').textContent='Copy link',1500)};
$('leave').onclick=()=>{if(isHost)for(const c of conns.values())try{c.send({t:'bye',reason:'Host left, room closed.'})}catch{};setTimeout(()=>location.href=location.pathname,200)};
const hq=new URLSearchParams(location.search).get('host');if(hq!==null){$('hcode').value=norm(hq);if($('nick').value.trim())$('host').click()}
$('hcode').oninput=e=>e.target.value=norm(e.target.value);
$('code').oninput=e=>e.target.value=norm(e.target.value);
