'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),os=require('node:os');
const BANK=require('./questions.json');
const ORDER=[['KANAK','REMAJA','DEWASA'],['REMAJA','DEWASA','KANAK'],['DEWASA','KANAK','REMAJA']];
const token=()=>crypto.randomBytes(24).toString('hex');
const progress=()=>({answers:{},acks:{},pending:null,flags:[],slots:[null,null,null],activity:false,activityMembers:[],vehicleParked:false,exited:[],complete:false,completedAt:null});
function createGameServer(options={}){
 const hostPin=String(options.hostPin??process.env.HOST_PIN??''),hostHash=crypto.createHash('sha256').update(hostPin).digest();
 const attempts=new Map();
 const rooms=new Map();
 const fail=(message,status=400)=>Object.assign(new Error(message),{status});
 function pairPhase(room,pair){return ORDER[pair-1][Math.min(room.round,2)];}
 function rankings(room){
  if(!room.pairs.every(p=>Object.values(p.progress).every(g=>g.complete)))return [];
  return room.pairs.map((p,i)=>({pair:i+1,score:p.score,elapsedMs:p.elapsedMs,members:room.players.filter(x=>x.pair===i+1).map(x=>({id:x.id,name:x.name}))})).sort((a,b)=>b.score-a.score||a.elapsedMs-b.elapsedMs||a.pair-b.pair).map((p,i)=>({...p,rank:i+1}));
 }
 function markComplete(room,pair,p){if(p.complete)return;p.complete=true;p.completedAt=Date.now();room.pairs[pair-1].elapsedMs+=Math.max(0,p.completedAt-room.roundStartedAt);}
 function clean(room){return {rankings:rankings(room),code:room.code,status:room.status,round:room.round,revision:room.revision,players:room.players.map(p=>({id:p.id,name:p.name,gender:p.gender,pair:p.pair,vehicleSlot:p.vehicleSlot,seen:p.seen,position:p.position})),pairs:room.pairs.map((p,i)=>({number:i+1,score:p.score,realm:pairPhase(room,i+1),progress:p.progress}))};}
 function authorize(room,key,host=false){if(key===room.hostToken)return {host:true};if(host)throw fail('Hanya guru boleh membuat tindakan ini.',403);const player=room.players.find(p=>p.token===key);if(!player)throw fail('Sesi tidak sah. Sila masuk semula.',401);player.seen=Date.now();return player;}
 function checkComplete(room,pair,g){const realm=pairPhase(room,pair),p=room.pairs[pair-1].progress[realm];if(realm!=='KANAK'&&p.activity&&Object.keys(p.answers).length===BANK[realm].length&&p.pending===null)markComplete(room,pair,p);}
 async function body(req){let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>32768)throw fail('Permintaan terlalu besar.',413);}try{return text?JSON.parse(text):{};}catch{throw fail('Data tidak sah.');}}
 const server=http.createServer(async(req,res)=>{
  const json=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
  try{
   const url=new URL(req.url,'http://localhost');
   if(url.pathname==='/api/create'&&req.method==='POST'){
    if(!/^\d{6,12}$/.test(hostPin))throw fail('Kod hos belum ditetapkan oleh pemilik pelayan.',503);
    const ip=req.socket.remoteAddress||'unknown',record=attempts.get(ip),now=Date.now();
    if(record&&record.count>=5&&now-record.since<600000)throw fail('Terlalu banyak cubaan kod hos. Cuba selepas 10 minit.',429);
    const input=await body(req),candidate=String(input.pin||'');
    if(!crypto.timingSafeEqual(crypto.createHash('sha256').update(candidate).digest(),hostHash)){
      const r=record&&now-record.since<600000?record:{count:0,since:now};r.count++;attempts.set(ip,r);throw fail('Kod hos tidak betul.',403);
    }
    attempts.delete(ip);
    if(rooms.size>=100)throw fail('Pelayan penuh. Cuba sebentar lagi.',503);
    let code;do{code=crypto.randomBytes(4).toString('hex').slice(0,6).toUpperCase();}while(rooms.has(code));
    const room={code,hostToken:token(),status:'waiting',round:0,revision:0,created:Date.now(),players:[],pairs:Array.from({length:3},()=>({score:100,elapsedMs:0,progress:{KANAK:progress(),REMAJA:progress(),DEWASA:progress()}}))};rooms.set(code,room);return json({token:room.hostToken,room:clean(room)});
   }
   const match=url.pathname.match(/^\/api\/room\/([A-F0-9]{6})(?:\/(join|action|teacher))?$/);
   if(match){
    const room=rooms.get(match[1]);if(!room)throw fail('Bilik tidak ditemui atau telah tamat. Minta kod baharu daripada guru.',404);
    const key=(req.headers.authorization||'').replace(/^Bearer /,'');const operation=match[2];
    if(operation==='join'&&req.method==='POST'){
     const b=await body(req),name=String(b.name||'').trim().slice(0,16),pair=Number(b.pair);
     if(!name||![1,2,3].includes(pair)||!['lelaki','perempuan'].includes(b.gender))throw fail('Isi nama, karakter dan pasangan.');
     if(room.status!=='waiting')throw fail('Permainan sudah bermula. Gunakan sesi asal untuk menyambung.',409);
     if(room.players.length>=6||room.players.filter(p=>p.pair===pair).length>=2)throw fail('Pasangan ini sudah mempunyai dua pemain. Pilih pasangan lain.',409);
     const vehicleSlot=room.players.some(p=>p.pair===pair&&p.vehicleSlot===0)?1:0;
     const player={id:crypto.randomUUID(),token:token(),name,gender:b.gender,pair,vehicleSlot,seen:Date.now(),position:null};room.players.push(player);room.revision++;return json({token:player.token,id:player.id,room:clean(room)});
    }
    const actor=authorize(room,key,operation==='teacher');
    if((!operation||operation==='teacher')&&req.method==='GET')return json({room:clean(room)});
    if(operation==='teacher'&&req.method==='POST'){
     const b=await body(req);
     if(b.type==='start'){
      if(room.status!=='waiting'||![1,2,3].every(p=>room.players.filter(x=>x.pair===p).length===2))throw fail('Perlu enam pemain: dua orang bagi setiap pasangan.',409);room.status='running';room.roundStartedAt=Date.now();
     }else if(b.type==='advance'){
      if(room.status!=='running'||!room.pairs.every((p,i)=>p.progress[pairPhase(room,i+1)].complete))throw fail('Tunggu ketiga-tiga pasangan menyelesaikan fasa masing-masing.',409);
      room.round++;room.roundStartedAt=Date.now();if(room.round===3)room.status='finished';for(const p of room.players)p.position=null;
     }else if(b.type==='remove'&&room.status==='waiting'){
      room.players=room.players.filter(p=>p.id!==b.id);
     }else throw fail('Arahan guru tidak sah.');
     room.revision++;return json({room:clean(room)});
    }
    if(operation==='action'&&req.method==='POST'){
     if(actor.host)throw fail('Guru tidak boleh menghantar aksi pemain.',403);
     const b=await body(req);if(room.status!=='running')return json({room:clean(room)});
     if(b.round!==room.round)throw fail('Pusingan telah berubah. Tunggu penyegerakan.',409);
     const realm=pairPhase(room,actor.pair),pair=room.pairs[actor.pair-1],p=pair.progress[realm];
     if(b.type==='position'){
      if(!b.position||!['x','y','z','yaw'].every(k=>Number.isFinite(b.position[k])&&Math.abs(b.position[k])<10000))throw fail('Posisi tidak sah.');
      if(realm==='DEWASA'&&!p.exited.includes(actor.id)){if(actor.vehicleSlot===1){const driver=room.players.find(x=>x.pair===actor.pair&&x.vehicleSlot===0);if(p.vehicleParked)actor.position={x:240,y:0,z:-78,yaw:0,realm,driving:true,at:Date.now()};else if(driver?.position)actor.position={...driver.position,driving:true,at:Date.now()};return json({ok:true});}if(p.vehicleParked){actor.position={x:240,y:0,z:-78,yaw:0,realm,driving:true,at:Date.now()};return json({ok:true});}}
      actor.position={...Object.fromEntries(['x','y','z','yaw'].map(k=>[k,b.position[k]])),realm,driving:!!b.position.driving,at:Date.now()};return json({ok:true});
     }
     if(p.complete)return json({room:clean(room)});
     if(b.type==='activity'){
      if(realm==='KANAK')throw fail('Aktiviti tidak sah.');
      if(realm==='DEWASA'){if(actor.vehicleSlot!==0)throw fail('Hanya pemandu boleh mengesahkan parkir.',403);p.vehicleParked=true;for(const member of room.players.filter(x=>x.pair===actor.pair))member.position={x:240,y:0,z:-78,yaw:0,realm,driving:true,at:Date.now()};}
      else {if(!p.activityMembers.includes(actor.id))p.activityMembers.push(actor.id);p.activity=true;checkComplete(room,actor.pair,p);}
     }else if(b.type==='exit'){
      if(realm!=='DEWASA'||!p.vehicleParked)throw fail('Tunggu kereta selesai parkir dahulu.',409);
      if(!p.exited.includes(actor.id))p.exited.push(actor.id);
      actor.position={x:actor.vehicleSlot===0?236.8:243.2,y:0,z:-78,yaw:0,realm,driving:false,at:Date.now()};
      p.activity=room.players.filter(x=>x.pair===actor.pair).every(x=>p.exited.includes(x.id));checkComplete(room,actor.pair,p);
     }else if(b.type==='collect'){
      if(realm!=='KANAK'||!Number.isInteger(b.index)||b.index<0||b.index>2)throw fail('Kepingan tidak sah.');
      if(!p.flags.includes(b.index)){if(p.pending!==null)throw fail('Selesaikan soalan bersama dahulu.',409);p.flags.push(b.index);p.pending=b.index;}
     }else if(b.type==='open'){
      if(realm==='KANAK'||!p.activity)throw fail('Siapkan aktiviti pasangan dahulu.',409);
      if(!Number.isInteger(b.index)||!BANK[realm][b.index])throw fail('Soalan tidak sah.');
      if(!p.answers[b.index]&&p.pending===null)p.pending=b.index;
     }else if(b.type==='answer'){
      if(p.pending===null||p.pending!==b.index)throw fail('Soalan ini belum dibuka.',409);
      if(!p.answers[b.index]){const q=BANK[realm][b.index];if(!Number.isInteger(b.answer)||!q.options[b.answer])throw fail('Pilihan jawapan tidak sah.');const correct=b.answer===q.correctIndex,change=correct?10:-5;p.answers[b.index]={answer:b.answer,correct,change};p.acks[b.index]=[];pair.score+=change;}
     }else if(b.type==='ack'){
      if(!p.answers[b.index])throw fail('Jawab soalan dahulu.');
      if(!p.acks[b.index].includes(actor.id))p.acks[b.index].push(actor.id);
      const members=room.players.filter(x=>x.pair===actor.pair);if(p.pending===b.index&&members.every(x=>p.acks[b.index].includes(x.id)))p.pending=null;checkComplete(room,actor.pair,p);
     }else if(b.type==='slot'){
      if(realm!=='KANAK'||p.flags.length!==3||Object.keys(p.answers).length!==3||p.pending!==null)throw fail('Jawab tiga soalan bersama dahulu.',409);
      if(!Number.isInteger(b.slot)||b.slot<0||b.slot>2||!(b.piece===null||Number.isInteger(b.piece)&&b.piece>=0&&b.piece<3))throw fail('Kepingan tidak sah.');
      if(b.piece!==null){const old=p.slots.indexOf(b.piece);if(old>=0)p.slots[old]=null;}p.slots[b.slot]=b.piece;
     }else if(b.type==='finish'){
      if(realm!=='KANAK'||p.flags.length!==3||Object.keys(p.answers).length!==3||p.pending!==null||!p.slots.every((x,i)=>x===i))throw fail('Susunan bendera belum lengkap.',409);markComplete(room,actor.pair,p);
     }else throw fail('Aksi tidak dikenali.');
     room.revision++;return json({room:clean(room)});
    }
    throw fail('Kaedah tidak disokong.',405);
   }
   if(url.pathname.startsWith('/api/'))throw fail('Laluan tidak ditemui.',404);
   const file=url.pathname==='/'?'index.html':url.pathname==='/guru'?'teacher.html':url.pathname==='/spectate'?'index.html':url.pathname.slice(1);
   if(!['index.html','teacher.html','multiplayer.js','spectator.js','awards.js'].includes(file))throw fail('Fail tidak ditemui.',404);
   let bytes=fs.readFileSync(path.join(__dirname,'public',file));if(url.pathname==='/spectate')bytes=Buffer.from(bytes.toString().replace('<script src="/multiplayer.js"></script>','<script src="/spectator.js"></script>'));res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'});res.end(bytes);
  }catch(e){json({error:e.status?e.message:'Ralat pelayan. Cuba semula.'},e.status||500);}
 });
 const cleanup=setInterval(()=>{for(const [code,r] of rooms)if(Date.now()-r.created>6*3600000)rooms.delete(code);},60000);cleanup.unref();server.on('close',()=>clearInterval(cleanup));return server;
}
if(require.main===module){if(!/^\d{6,12}$/.test(process.env.HOST_PIN||'')){console.error('Tetapkan HOST_PIN kepada kod hos pilihan anda (6–12 digit) sebelum memulakan pelayan.');process.exit(1);}const port=Number(process.env.PORT||3000);createGameServer().listen(port,'0.0.0.0',()=>{console.log('Panel guru: http://localhost:'+port+'/guru');for(const list of Object.values(os.networkInterfaces()))for(const n of list||[])if(n.family==='IPv4'&&!n.internal)console.log('Pemain di Wi-Fi yang sama: http://'+n.address+':'+port);});}
module.exports={createGameServer,ORDER};
