/* Shared pair progression; server owns membership, answers, scores and rounds. */
const mp={session:null,room:null,round:-1,entering:false,ui:null,selected:null,collecting:false,activitySending:false,failures:0,peers:new Map(),lastFrame:performance.now()};
const mpNames={KANAK:'Kanak-kanak',REMAJA:'Remaja',DEWASA:'Dewasa'};
function mpPair(){const me=mp.room?.players.find(p=>p.id===mp.session?.id);return me?mp.room.pairs[me.pair-1]:null;}
function mpProgress(){const p=mpPair();return p?.progress[p.realm];}
function mpActive(){return !!mp.session;}
async function mpAPI(path,body){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);try{const r=await fetch(path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(mp.session?{Authorization:'Bearer '+mp.session.token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:controller.signal});const d=await r.json();if(!r.ok)throw Error(d.error);return d;}finally{clearTimeout(timer);}}
async function mpAction(type,fields={}){try{const d=await mpAPI('/api/room/'+mp.session.code+'/action',{type,round:mp.room?.round,...fields});if(d.room)mpReceive(d.room);return d;}catch(e){showToast(e.message);throw e;}}
function mpModal(key,title,description){if(mp.ui===key)return null;mp.ui=key;return missionModal(title,description);}
function mpWaiting(room){const pair=mpPair();const area=mpModal('waiting','👥 Menunggu arahan guru','Pasangan '+pair.number+' · '+room.players.length+'/6 pemain telah masuk. Guru akan memulakan pusingan apabila semua bersedia.');if(area){const info=document.createElement('p');info.id='mp-wait-members';area.appendChild(info);}const info=document.getElementById('mp-wait-members');if(info)info.textContent=room.players.map(p=>'Pasangan '+p.pair+': '+p.name).join(' · ');inputLocked=true;}
function mpHold(){const p=mpPair(),area=mpModal('hold:'+mp.round,'🎉 Pasangan '+p.number+' selesai!','Anda telah menyelesaikan fasa ini. Tunggu guru menekan “Pusingan Seterusnya”.');if(area){const scoreLine=document.createElement('p');scoreLine.textContent='Skor pasangan: '+p.score+' mata';area.appendChild(scoreLine);}inputLocked=true;}
function mpClearPeers(){for(const actor of mp.peers.values()){scene.remove(actor.root);actor.label.material.map.dispose();actor.label.material.dispose();}mp.peers.clear();}
function mpEnter(room){
 mp.round=room.round;mp.entering=true;mp.ui=null;mpClearPeers();document.getElementById('modal-overlay').classList.add('hidden');window.__resetGameControls?.();inputLocked=true;
 const pair=mpPair(),cover=document.createElement('div');cover.className='mp-cover';cover.innerHTML='<div><div style="font-size:48px">🇲🇾</div><h2></h2><p></p></div>';cover.querySelector('h2').textContent='Pusingan '+(room.round+1)+' — '+mpNames[pair.realm];cover.querySelector('p').textContent='Pasangan '+pair.number+' · '+room.players.filter(p=>p.pair===pair.number).map(p=>p.name).join(' & ');document.body.appendChild(cover);
 setTimeout(()=>{switchRealm(pair.realm);inputLocked=true;},200);
 setTimeout(()=>{cover.remove();mp.entering=false;mpReceive(mp.room);},950);
}
function mpQuestion(index){
 const pair=mpPair(),p=mpProgress(),bank=pair.realm==='KANAK'?KANAK_QUESTIONS:pair.realm==='REMAJA'?REMAJA_QUESTIONS:DEWASA_QUESTIONS,q=bank[index],record=p.answers[index];
 if(record){
  if((p.acks[index]||[]).includes(mp.session.id)){mpModal('ack:'+mp.round+':'+index,'💬 Tunggu rakan pasangan','Rakan anda sedang membaca maklum balas. Selepas kedua-duanya menekan Teruskan, permainan disambung.');return;}
  const key='answer:'+mp.round+':'+index;if(mp.ui===key)return;mp.ui=key;
  showAnswerFeedback(q,record.answer,record.change,()=>{mpAction('ack',{index}).catch(()=>{});});return;
 }
 const area=mpModal('question:'+mp.round+':'+index,'💬 Soalan pasangan '+(index+1),q.situation+(q.standard?'\n'+q.standard:'')+'\nBincang dengan rakan. Salah seorang menghantar jawapan.');if(!area)return;
 q.options.forEach((label,answer)=>{const b=missionButton(area,label,async()=>{area.querySelectorAll('button').forEach(x=>x.disabled=true);try{await mpAction('answer',{index,answer});}catch{area.querySelectorAll('button').forEach(x=>x.disabled=false);}});});
}
function mpPuzzle(){
 const key='puzzle:'+mp.round;if(mp.ui!==key){mp.ui=key;mp.selected=null;missionModal('🇲🇾 Susun bendera bersama','Pilih kepingan, kemudian petak. Kedua-dua ahli boleh membantu. Susunan dikongsi dengan rakan anda.');}
 const signature=JSON.stringify(mpProgress().slots)+':'+mp.selected;if(mp.puzzleSignature===signature)return;mp.puzzleSignature=signature;
 const area=document.getElementById('modal-options');area.replaceChildren();const url=getFlagArtwork().toDataURL(),board=document.createElement('div');board.className='flag-puzzle-board';
 function tile(piece){const b=document.createElement('button');b.className='flag-puzzle-piece';if(piece!==null){b.style.backgroundImage='url('+url+')';b.style.backgroundSize='300% 100%';b.style.backgroundPosition=(piece*50)+'% 0';}return b;}
 mpProgress().slots.forEach((piece,slot)=>{const b=tile(piece);b.setAttribute('aria-label','Petak '+(slot+1));if(piece===null)b.textContent=slot+1;b.onclick=()=>{const chosen=mp.selected;mp.selected=null;mpAction('slot',{slot,piece:chosen}).catch(()=>{});};board.appendChild(b);});area.appendChild(board);
 const tray=document.createElement('div');tray.className='flag-puzzle-tray';for(const piece of [2,0,1])if(!mpProgress().slots.includes(piece)){const b=tile(piece);b.setAttribute('aria-label','Kepingan '+(piece+1));if(mp.selected===piece)b.classList.add('selected');b.onclick=()=>{mp.selected=piece;mpPuzzle();};tray.appendChild(b);}area.appendChild(tray);
 missionButton(area,'Semak bendera ✓',()=>{if(!mpProgress().slots.every((x,i)=>x===i)){showToast('Susunan belum tepat. Cuba lagi bersama rakan!');return;}mpAction('finish').catch(()=>{});});
}
function mpReceive(room){
 if(!room||!mp.session)return;if(mp.room&&room.code===mp.room.code&&(room.round<mp.room.round||room.revision<mp.room.revision))return;mp.room=room;const pair=mpPair();if(!pair)return;
 const badge=document.getElementById('mp-status');if(badge)badge.textContent='👥 Pasangan '+pair.number+' · Pusingan '+Math.min(room.round+1,3)+'/3 · '+pair.score+' mata';
 if(room.status==='waiting'){mpWaiting(room);return;}
 if(room.rankings?.length){mpClearPeers();const area=mpModal('awards','🏆 Tahniah! Semua pasangan selesai','Muat turun sijil penghargaan anda.');if(area)renderNegarakuResults(area,room,mp.session.id);inputLocked=true;return;}
 if(room.status==='finished'){mpClearPeers();const area=mpModal('finished','🏆 Semua pusingan selesai!','Tahniah! Anda dan rakan telah menamatkan tiga fasa bersama.');if(area){for(const p of room.pairs){const line=document.createElement('p');line.textContent='Pasangan '+p.number+': '+p.score+' mata';area.appendChild(line);}}inputLocked=true;return;}
 if(mp.round!==room.round){mp.puzzleSignature=null;mpEnter(room);return;}if(mp.entering)return;
 const p=pair.progress[pair.realm];score=pair.score;document.getElementById('score-display').textContent=score;
 const answers=pair.realm==='KANAK'?kanakCheckpointCorrect:pair.realm==='REMAJA'?remajaCheckpointCorrect:dewasaCheckpointCorrect;
 // Local markers use 'recorded' to avoid reopening a question already reviewed as a pair.
 for(const index of Object.keys(p.answers))answers[index]=true;
 if(pair.realm==='KANAK'){
  flagProgress.collected=new Set(p.flags);flagProgress.answered=new Set(Object.keys(p.answers).map(Number));flagProgress.slots=[...p.slots];
  if(flagMission){for(const piece of flagMission.pieces)piece.mesh.visible=!p.flags.includes(piece.index);flagMissionHud();}
 }else if(pair.realm==='REMAJA'&&p.activity&&!realmObbyPassed.REMAJA){mpOriginalFinishObby();playerPos.set(110,0,-54);playerGroup.position.copy(playerPos);playerVelocity.set(0,0,0);inputLocked=false;}
 else if(pair.realm==='DEWASA'&&mpSyncDrivingProgress(p))return;
 if(p.complete){mpHold();return;}
 if(p.pending!==null){mpQuestion(p.pending);return;}
 if(mp.ui?.startsWith('question:')||mp.ui?.startsWith('answer:')||mp.ui?.startsWith('ack:')){mp.ui=null;closeMissionModal();}
 if(pair.realm==='KANAK'&&p.flags.length===3&&Object.keys(p.answers).length===3){mpPuzzle();}
}
function mpIsPassenger(){return !!mp.session&&mp.room?.players.find(p=>p.id===mp.session.id)?.vehicleSlot===1;}
function mpFollowSharedCar(c,dt){
 inputLocked=true;const pair=mpPair(),p=mpProgress(),driver=mp.room.players.find(x=>x.pair===pair.number&&x.vehicleSlot===0),pos=p.vehicleParked?{x:240,y:0,z:-78,yaw:0}:driver?.position;
 if(pos?.realm&&pos.realm!=='DEWASA')return;
 if(pos){c.x=pos.x;c.z=pos.z;c.yaw=pos.yaw;c.mesh.position.set(c.x,.08,c.z);c.mesh.rotation.y=c.yaw;playerPos.set(c.x,0,c.z);}
 const desired=new THREE.Vector3(c.x+Math.sin(c.yaw)*9,5.4,c.z+Math.cos(c.yaw)*9);if(!c.cameraReady){camera.position.copy(desired);c.cameraReady=true;}else camera.position.lerp(desired,1-Math.exp(-6*dt));camera.lookAt(c.x,1.3,c.z);
 const task=document.getElementById('convoy-task');if(task)task.textContent=p.vehicleParked?'✓ Kereta sudah parkir. Tekan KELUAR.':'👥 Anda penumpang. Rakan sedang memandu.';
}
function mpSyncDrivingProgress(progress){
 if(!convoy)return false;
 if(progress.exited?.includes(mp.session.id)){
  convoy.x=240;convoy.z=-78;convoy.yaw=0;convoy.speed=0;convoy.mesh.position.set(240,.08,-78);convoy.mesh.rotation.y=0;
  const slot=mp.room.players.find(p=>p.id===mp.session.id)?.vehicleSlot??0;
  mpOriginalFinishConvoy();playerPos.set(slot===0?236.8:243.2,0,-78);playerGroup.position.copy(playerPos);playerGroup.visible=true;playerVelocity.set(0,0,0);isGrounded=true;
  closeMissionModal();mp.ui=null;window.__resetGameControls?.();window.__resetJoystickVisual?.();inputLocked=false;orbitCamera.ready=false;checkpointCooldownUntil=performance.now()+1500;
  updateHUD('🇲🇾 Selamat tiba di sambutan!','Anda sudah keluar. Cari 3 simbol ? bersama rakan selepas kedua-duanya keluar.');return false;
 }
 if(progress.vehicleParked){
  convoy.parkedWaiting=true;convoy.speed=0;inputLocked=true;window.__resetGameControls?.();
  const area=mpModal('vehicle-exit:'+mp.round,'🅿 Kereta selamat diparkir!','Tekan KELUAR untuk turun dan berjalan ke kawasan sambutan.');
  if(area)missionButton(area,'KELUAR',async()=>{const button=area.querySelector('button');if(button)button.disabled=true;try{await mpAction('exit');}catch{if(button)button.disabled=false;}});return true;
 }
 if(mpIsPassenger())inputLocked=true;
 return false;
}
const mpOriginalFlagQuestion=showFlagCollectionQuestion,mpOriginalPuzzle=showFlagPuzzle,mpOriginalFlagComplete=completeFlagMission,mpOriginalRemaja=showRemajaCheckpoint,mpOriginalDewasa=showDewasaCheckpoint,mpOriginalFinishObby=finishRealmObby,mpOriginalFinishConvoy=completeConvoy;
showFlagCollectionQuestion=function(i){if(mpActive())return mpAction('collect',{index:i}).catch(()=>{});return mpOriginalFlagQuestion(i);};
showFlagPuzzle=function(){if(mpActive()){if(mpProgress()?.pending===null&&mpProgress()?.flags.length===3)mpPuzzle();return;}return mpOriginalPuzzle();};
completeFlagMission=function(){if(mpActive())return mpAction('finish').catch(()=>{});return mpOriginalFlagComplete();};
showRemajaCheckpoint=function(i){if(mpActive())return mpAction('open',{index:i}).catch(()=>{});return mpOriginalRemaja(i);};
showDewasaCheckpoint=function(i){if(mpActive()){if(!mpProgress()?.activity){closeMissionModal();mp.ui=null;showToast('Tunggu kedua-dua ahli menekan KELUAR dahulu.');return;}return mpAction('open',{index:i}).catch(()=>{});}return mpOriginalDewasa(i);};
finishRealmObby=function(){if(!mpActive()||currentRealm!=='REMAJA')return mpOriginalFinishObby();mpShareActivity();};
completeConvoy=async function(){
 if(!mpActive())return mpOriginalFinishConvoy();
 if(!convoy||mpIsPassenger()||convoy.parkedWaiting||mp.activitySending)return;
 mp.activitySending=true;convoy.parkedWaiting=true;convoy.speed=0;inputLocked=true;
 try{await mpAction('activity');}catch{if(convoy){convoy.parkedWaiting=false;convoy.park=0;}inputLocked=false;}finally{mp.activitySending=false;}
};
async function mpShareActivity(){if(mp.activitySending)return;mp.activitySending=true;inputLocked=true;try{await mpAction('activity');}catch{inputLocked=false;}finally{mp.activitySending=false;}}
async function mpCollectPiece(piece){if(mp.collecting||mp.entering)return;mp.collecting=true;try{await mpAction('collect',{index:piece.index});}catch{}finally{mp.collecting=false;}}
function mpPeerLabel(name){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const ctx=canvas.getContext('2d');ctx.fillStyle='#153448db';ctx.fillRect(0,0,256,64);ctx.fillStyle='#fff4c9';ctx.font='bold 26px Arial';ctx.textAlign='center';ctx.fillText(name,128,40,240);return new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),depthTest:true}));}
function mpAnimatePeers(){
 if(!mp.room||mp.entering||mp.room.status!=='running')return;const now=performance.now(),dt=Math.min(.05,(now-mp.lastFrame)/1000);mp.lastFrame=now;
 for(const p of mp.room.players){if(p.id===mp.session.id)continue;let actor=mp.peers.get(p.id);const visible=p.position?.realm===currentRealm&&Date.now()-p.seen<12000&&!p.position?.driving;
  if(!visible){if(actor)actor.root.visible=false;continue;}
  if(!actor){const root=new THREE.Group(),body=characterMesh.clone(true);root.add(body);body.traverse(o=>{if(o.material){o.material=o.material.clone();if(o===body.children[0])o.material.color.setHex(p.gender==='perempuan'?0xe779a3:0x3d9dd0);}});const label=mpPeerLabel(p.name+' · P'+p.pair);label.position.y=2.35;label.scale.set(2.5,.62,1);root.add(label);scene.add(root);actor={root,body,label,vehicle:null,ready:false};mp.peers.set(p.id,actor);}
  actor.root.visible=true;if(p.position.driving)actor.parkedPosition=null;else if(actor.vehicle&&!actor.parkedPosition){actor.parkedPosition=actor.root.position.clone();actor.parkedYaw=actor.vehicle.rotation.y;}if(actor.root.parent!==scene)scene.add(actor.root);const target=new THREE.Vector3(p.position.x,p.position.y,p.position.z);if(!actor.ready){actor.root.position.copy(target);actor.ready=true;}else actor.root.position.lerp(target,1-Math.exp(-13*dt));const diff=Math.atan2(Math.sin(p.position.yaw-actor.body.rotation.y),Math.cos(p.position.yaw-actor.body.rotation.y));actor.body.rotation.y+=diff*(1-Math.exp(-12*dt));
  if(p.position.driving&&(convoy||mp.vehicleTemplate)&&!actor.vehicle){actor.vehicle=(convoy?.mesh||mp.vehicleTemplate).clone(true);actor.root.add(actor.vehicle);actor.vehicle.children[0].material=actor.vehicle.children[0].material.clone();actor.vehicle.children[0].material.color.setHex(p.vehicleSlot===0?0xf2cb55:0x56b6e8);actor.vehicle.position.set(0,.08,0);actor.label.position.y=3.2;}
  actor.body.visible=!p.position.driving;if(actor.vehicle){actor.vehicle.visible=true;if(p.position.driving){actor.vehicle.position.set(0,.08,0);actor.vehicle.rotation.y=p.position.yaw;}else if(actor.parkedPosition){actor.vehicle.position.copy(actor.parkedPosition).sub(actor.root.position);actor.vehicle.position.y=.08;actor.vehicle.rotation.y=actor.parkedYaw;}}actor.label.position.y=p.position.driving?3.2:2.35;
 }
}
async function mpPoll(){if(mp.session){try{const d=await mpAPI('/api/room/'+mp.session.code);mp.failures=0;mpReceive(d.room);if(!mp.entering&&mp.ui===null&&!convoy?.parkedWaiting&&!(convoy&&mpIsPassenger())&&mp.room.status==='running'&&document.getElementById('modal-overlay').classList.contains('hidden'))inputLocked=false;}catch(e){mp.failures++;const badge=document.getElementById('mp-status');if(badge)badge.textContent='⚠ Sambungan terputus — sedang cuba semula';if(mp.failures>2){inputLocked=true;window.__resetGameControls?.();}}}setTimeout(mpPoll,350);}
async function mpPosition(){if(mp.session&&gameStarted&&!mp.entering&&mp.room?.status==='running'){try{await mpAPI('/api/room/'+mp.session.code+'/action',{type:'position',round:mp.room.round,position:{x:playerPos.x,y:playerPos.y,z:playerPos.z,yaw:convoy?convoy.yaw:characterMesh.rotation.y,driving:!!convoy}});}catch{}}setTimeout(mpPosition,160);}
function setupMultiplayer(){
 const controls=document.createElement('div');controls.className='mp-registration';controls.innerHTML='<label for="mp-code">Kod bilik guru</label><input id="mp-code" maxlength="6" autocomplete="off" placeholder="Contoh: A1B2C3"><label for="mp-pair">Pasangan anda</label><select id="mp-pair"><option value="1">Pasangan 1 · Kanak-kanak → Remaja → Dewasa</option><option value="2">Pasangan 2 · Remaja → Dewasa → Kanak-kanak</option><option value="3">Pasangan 3 · Dewasa → Kanak-kanak → Remaja</option></select><p id="mp-error" role="alert"></p><a href="/guru" target="_blank">Panel guru ↗</a>';
 document.getElementById('start-game-btn').before(controls);const badge=document.createElement('div');badge.id='mp-status';document.body.appendChild(badge);
 const btn=document.getElementById('start-game-btn');let joining=false,permit=false;
 btn.addEventListener('click',async e=>{if(permit)return;e.preventDefault();e.stopImmediatePropagation();if(joining)return;const err=document.getElementById('mp-error');err.textContent='';const code=document.getElementById('mp-code').value.trim().toUpperCase(),pair=Number(document.getElementById('mp-pair').value);if(!/^[A-F0-9]{6}$/.test(code)){err.textContent='Masukkan kod bilik daripada guru.';return;}
 joining=true;try{const d=await mpAPI('/api/room/'+code+'/join',{name:playerName,gender:playerGender,pair});mp.session={code,token:d.token,id:d.id,name:playerName,gender:playerGender,pair};sessionStorage.setItem('negaraku-player',JSON.stringify(mp.session));permit=true;btn.click();mpReceive(d.room);}catch(error){err.textContent=error.message;}finally{joining=false;}},true);
 try{const stored=JSON.parse(sessionStorage.getItem('negaraku-player'));if(stored?.token){mp.session=stored;mpAPI('/api/room/'+stored.code).then(d=>{playerName=stored.name;document.getElementById('player-name-input').value=stored.name;document.querySelector('.gender-btn[data-gender="'+stored.gender+'"]').click();btn.disabled=false;permit=true;btn.click();mpReceive(d.room);}).catch(()=>{mp.session=null;sessionStorage.removeItem('negaraku-player');});}}catch{}
 mpPoll();mpPosition();
}
const mpOriginalLoad=window.onload;window.onload=()=>{mpOriginalLoad();setupMultiplayer();};
