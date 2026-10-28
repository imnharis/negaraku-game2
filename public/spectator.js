/* Host-only observer: credential arrives via same-origin postMessage, never in a URL. */
let observer={session:null,room:null,target:null,signature:null,actors:new Map(),ready:false,last:performance.now(),lastSuccess:0};
function mpActive(){return false;}
function observerStatus(text){const e=document.getElementById('observer-status');if(e)e.textContent=text;}
function observerDispose(){for(const a of observer.actors.values())scene.remove(a.root);observer.actors.clear();}
function observerWorld(p){
 const pair=observer.room.pairs.find(x=>x.number===p.pair),realm=pair.realm,activity=pair.progress[realm].activity,signature=observer.room.round+':'+realm+':'+activity;
 if(signature===observer.signature)return;observer.signature=signature;observerDispose();realmObbyPassed.REMAJA=realm==='REMAJA'&&activity;civicProgress.DEWASA.complete=realm==='DEWASA'&&activity;switchRealm(realm);document.getElementById('modal-overlay').classList.add('hidden');inputLocked=true;playerGroup.visible=false;observer.ready=false;for(const id of ['convoy-hud','obby-note']){const e=document.getElementById(id);if(e)e.hidden=true;}
}
function observerActor(p){let a=observer.actors.get(p.id);if(a)return a;const root=new THREE.Group(),body=characterMesh.clone(true);body.traverse(o=>{if(o.material){o.material=o.material.clone();if(o===body.children[0])o.material.color.setHex(p.gender==='perempuan'?0xe779a3:0x3d9dd0);}});root.add(body);scene.add(root);a={root,body,vehicle:null,ready:false};observer.actors.set(p.id,a);return a;}
window.spectatorRender=()=>{
 if(!scene||!camera||!renderer)return;inputLocked=true;
 const now=performance.now(),dt=Math.min(.05,(now-observer.last)/1000);observer.last=now;
 const p=observer.room?.players.find(x=>x.id===observer.target);
 if(!p||observer.room.status!=='running'||observer.room.rankings?.length){observerStatus(observer.room?.rankings?.length?'Semua pemain selesai. Sijil tersedia dalam panel guru.':'Pilih pemain selepas guru memulakan sesi.');renderer.render(scene,camera);return;}
 if(!p.position||p.position.realm!==observer.room.pairs.find(x=>x.number===p.pair).realm){observerStatus('Menunggu kedudukan pemain…');renderer.render(scene,camera);return;}
 observerWorld(p);updateAmbientPeople();updateLobbyMotion();if(realmObby)updateSchoolObby();
 const online=Date.now()-p.seen<12000&&Date.now()-observer.lastSuccess<5000;
 const pair=observer.room.pairs.find(x=>x.number===p.pair),pg=pair.progress[pair.realm];observerStatus((online?'🔴 LIVE · ':'⚠ Kedudukan terakhir · ')+p.name+' · Pasangan '+p.pair+' · '+Object.keys(pg.answers).length+'/3 soalan · '+pair.score+' mata'+(pg.pending!==null?' · Sedang menjawab soalan '+(pg.pending+1):pg.complete?' · Fasa selesai':''));
 for(const a of observer.actors.values())a.root.visible=false;
 for(const other of observer.room.players){if(other.position?.realm!==currentRealm)continue;const a=observerActor(other),pos=other.position;a.root.visible=true;const dest=new THREE.Vector3(pos.x,pos.y,pos.z);if(!a.ready){a.root.position.copy(dest);a.ready=true;}else a.root.position.lerp(dest,1-Math.exp(-12*dt));a.body.rotation.y=pos.yaw;a.body.visible=!pos.driving;if(pos.driving&&other.vehicleSlot===0&&convoy&&!a.vehicle){a.vehicle=convoy.mesh.clone(true);a.vehicle.position.set(0,.08,0);a.root.add(a.vehicle);}if(a.vehicle){a.vehicle.visible=pos.driving;a.vehicle.rotation.y=pos.yaw;}}
 if(convoy){convoy.mesh.visible=!!pg.vehicleParked;if(pg.vehicleParked){convoy.mesh.position.set(240,.08,-78);convoy.mesh.rotation.y=0;}}
 const a=observer.actors.get(p.id);if(a){const pos=a.root.position,yaw=p.position.yaw,d=p.position.driving?10:7,desired=new THREE.Vector3(pos.x+Math.sin(yaw)*d,pos.y+(p.position.driving?5.4:4.5),pos.z+Math.cos(yaw)*d);if(!observer.ready){camera.position.copy(desired);observer.ready=true;}else camera.position.lerp(desired,1-Math.exp(-6*dt));camera.lookAt(pos.x,pos.y+1.3,pos.z);}
 renderer.render(scene,camera);
};
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent||e.data?.type!=='negaraku-spectate')return;const d=e.data;if(!/^[A-F0-9]{6}$/.test(d.code)||typeof d.token!=='string')return;observer.session={code:d.code,token:d.token};if(observer.target!==d.playerId){observer.target=d.playerId;observer.ready=false;} });
async function observerPoll(){if(observer.session)try{const r=await fetch('/api/room/'+observer.session.code+'/teacher',{headers:{Authorization:'Bearer '+observer.session.token}}),d=await r.json();if(!r.ok)throw Error(d.error);observer.room=d.room;observer.lastSuccess=Date.now();}catch{observerStatus('⚠ Sambungan spectate terganggu. Sedang cuba semula.');}setTimeout(observerPoll,350);}
const observerOriginalLoad=window.onload;window.onload=()=>{observerOriginalLoad();document.getElementById('main-menu').style.display='none';for(const id of ['main-hud','sprint-btn','joystick-zone','jump-btn','return-btn','search-hint','mission-interact','mission-drop']){const e=document.getElementById(id);if(e)e.style.display='none';}const status=document.createElement('div');status.id='observer-status';status.style.cssText='position:fixed;top:8px;left:8px;right:8px;z-index:9999;padding:10px;background:#14374eef;color:white;font:13px system-ui;border-radius:8px;pointer-events:none';status.textContent='Menunggu sambungan panel guru…';document.body.append(status);inputLocked=true;observerPoll();parent.postMessage({type:'negaraku-spectate-ready'},location.origin);};
