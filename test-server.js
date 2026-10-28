'use strict';
const assert=require('node:assert/strict'),{createGameServer,ORDER}=require('./server'),BANK=require('./questions.json');
(async()=>{const server=createGameServer({hostPin:'762981'});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;try{
async function api(route,body,token){const r=await fetch(base+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
assert.equal((await api('/api/create',{})).status,403);assert.equal((await api('/api/create',{pin:'wrong'})).status,403);
const created=(await api('/api/create',{pin:'762981'})).data,code=created.room.code,host=created.token,path='/api/room/'+code;
assert.equal((await api(path)).status,401);assert.equal((await api(path+'/teacher',{type:'start'},host)).status,409);
const players=[];for(let pair=1;pair<=3;pair++)for(let i=0;i<2;i++){const d=await api(path+'/join',{name:'Murid '+pair+'-'+i,gender:i?'perempuan':'lelaki',pair});assert.equal(d.status,200);players.push({...d.data,pair});}
assert.deepEqual((await api(path,undefined,host)).data.room.players.map(p=>p.vehicleSlot),[0,1,0,1,0,1]);
assert.equal((await api(path+'/join',{name:'Ketujuh',gender:'lelaki',pair:1})).status,409);assert.equal((await api(path+'/teacher',{type:'start'},players[0].token)).status,403);
assert.equal((await api(path+'/teacher',undefined,players[0].token)).status,403);
assert.equal((await api(path+'/teacher',undefined,host)).status,200);
assert.deepEqual((await stateEarly()).data.room.rankings,[]);
async function stateEarly(){return api(path,undefined,host);}
assert.equal((await api(path+'/teacher',{type:'start'},host)).status,200);
assert.equal((await api(path+'/teacher',{type:'advance'},host)).status,409);
let activeRound=0;const state=()=>api(path,undefined,host);const action=(p,b)=>api(path+'/action',{round:activeRound,...b},p.token);
const positions=await Promise.all(players.map((p,i)=>action(p,{type:'position',position:{x:i,y:0,z:5,yaw:0,driving:false}})));assert(positions.every(r=>r.status===200));assert((await state()).data.room.players.every(p=>p.position));
for(let round=0;round<3;round++){activeRound=round;
 if(round>0)assert.equal((await action(players[0],{type:'activity',round:round-1})).status,409);
 for(let pair=1;pair<=3;pair++){
  const [one,two]=players.filter(p=>p.pair===pair),realm=ORDER[pair-1][round];
  assert.equal((await state()).data.room.pairs[pair-1].realm,realm);
  if(realm==='REMAJA')assert.equal((await action(one,{type:'activity'})).status,200);
  if(realm==='DEWASA'){
   assert.equal((await action(two,{type:'activity'})).status,403,'Passenger cannot park the shared vehicle');
   assert.equal((await action(one,{type:'exit'})).status,409,'Cannot exit before parking');
   await action(one,{type:'position',position:{x:190,y:0,z:-30,yaw:1,driving:true}});
   await action(two,{type:'position',position:{x:0,y:0,z:0,yaw:0,driving:true}});
   let shared=(await state()).data.room;assert.equal(shared.players.find(p=>p.id===two.id).position.x,190,'Passenger follows driver');
   assert.equal((await action(one,{type:'activity'})).status,200);
   let pg=(await state()).data.room.pairs[pair-1].progress.DEWASA;assert(pg.vehicleParked);assert.equal(pg.activity,false);
   assert.equal((await action(one,{type:'open',index:0})).status,409);
   assert.equal((await action(one,{type:'exit'})).status,200);assert.equal((await action(one,{type:'exit'})).status,200);
   pg=(await state()).data.room.pairs[pair-1].progress.DEWASA;assert.equal(pg.exited.length,1);assert.equal(pg.activity,false);
   await action(one,{type:'position',position:{x:230,y:0,z:-90,yaw:0,driving:false}});
   await action(two,{type:'position',position:{x:0,y:0,z:0,yaw:0,driving:true}});
   shared=(await state()).data.room;assert.equal(shared.players.find(p=>p.id===two.id).position.x,240,'Passenger remains in parked car after driver exits');
   assert.equal((await action(two,{type:'exit'})).status,200);
   pg=(await state()).data.room.pairs[pair-1].progress.DEWASA;assert.equal(pg.activity,true);assert.equal(pg.exited.length,2);
   for(const player of [one,two]){assert.equal((await action(player,{type:'position',position:{x:232,y:0,z:-95,yaw:0,driving:false}})).status,200);assert.equal((await state()).data.room.players.find(p=>p.id===player.id).position.driving,false);}
  }
  for(let i=0;i<BANK[realm].length;i++){
   assert.equal((await action(one,{type:realm==='KANAK'?'collect':'open',index:i})).status,200);
   const attempts=await Promise.all([one,two].map(p=>action(p,{type:'answer',index:i,answer:BANK[realm][i].correctIndex})));assert(attempts.every(a=>a.status===200));
   let pg=(await state()).data.room.pairs[pair-1].progress[realm];assert.equal(Object.keys(pg.answers).length,i+1);
   await action(one,{type:'ack',index:i});pg=(await state()).data.room.pairs[pair-1].progress[realm];assert.equal(pg.pending,i,'Must wait for second pupil to read');
   await action(two,{type:'ack',index:i});pg=(await state()).data.room.pairs[pair-1].progress[realm];assert.equal(pg.pending,null);
  }
  if(realm==='KANAK'){
   assert.equal((await action(one,{type:'finish'})).status,409);
   for(let i=0;i<3;i++)await action(i%2?two:one,{type:'slot',slot:i,piece:i});assert.equal((await action(one,{type:'finish'})).status,200);
  }
  const room=(await state()).data.room;assert(room.pairs[pair-1].progress[realm].complete);assert(!JSON.stringify(room).includes(host));assert(!JSON.stringify(room).includes(one.token));
 }
 const beforeAdvance=(await state()).data.room;if(round===2){assert.equal(beforeAdvance.status,'running');assert.equal(beforeAdvance.rankings.length,3);assert.deepEqual(beforeAdvance.rankings.map(r=>r.rank),[1,2,3]);assert.equal(beforeAdvance.rankings.flatMap(r=>r.members).length,6);assert(beforeAdvance.rankings.every(r=>r.elapsedMs>=0));}else assert.deepEqual(beforeAdvance.rankings,[]);
 assert.equal((await api(path+'/teacher',{type:'advance'},players[1].token)).status,403);
 assert.equal((await api(path+'/teacher',{type:'advance'},host)).status,200);
}
const final=(await state()).data.room;assert.equal(final.status,'finished');assert.equal(final.round,3);assert(final.pairs.every(p=>p.score===190),'Shared score must count each answer once despite simultaneous submissions');
console.log('PASS: host-only spectator state, automatic final rankings and six certificate recipients,  6 independent clients, pair capacity, role authorization, shared positions, simultaneous answer deduplication, two-player feedback acknowledgments, shared puzzle, 3 phase rotations, teacher-only advancement and final scores.');
}finally{await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1});
