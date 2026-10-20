(() => {
  'use strict';
  const $=id=>document.getElementById(id), geo=window.PyodaLocation, A=window.PyodaArrival;
  let course=window.COURSES[0], engine, watch=null, capture=null, paused=false, active=false, speaking=false, epoch=0, utterance=null;
  const overridesKey='pyoda-walk-places-v1';
  let reloading=false; navigator.serviceWorker?.addEventListener('controllerchange',()=>{if(!reloading){reloading=true;location.reload();}});
  let overrides={};
  try{overrides=JSON.parse(localStorage.getItem(overridesKey)||'{}');}catch{}
  const defaults={'01':{4:{latitude:33.2392465705,longitude:126.6067745830,radius:40,source:'한국관광공사 관광정보 대표좌표 · 현장 조정 전',url:'https://data.visitkorea.or.kr/page/2738742'}}};
  function points(){return course.points.map((_,i)=>overrides?.[course.id]?.[i]||defaults?.[course.id]?.[i]||null);}
  function message(s){$('status').textContent=s;}
  function configured(){return points().filter(A.validPoint).length;}
  function progress(){const n=engine?.visited.size||0;$('progressPct').textContent=Math.round(n/course.points.length*100)+'%';$('progressBar').style.width=n/course.points.length*100+'%';}
  function resetEngine(visited){engine=new A.Arrival(points(),visited||[]);progress();}
  function cancelSpeech(){epoch++;speaking=false;utterance=null;window.speechSynthesis?.cancel();window.PyodaSpeech?.cancel();}
  function stop(){
    active=false;paused=false;
    if(watch!==null){geo?.clearWatch(watch);watch=null;}
    engine?.release();cancelSpeech();$('gpsBtn').textContent='자동 안내 시작';$('pauseBtn').disabled=true;
  }
  function showStory(i){
    const story=course.stories[i];
    $('storyTitle').textContent=story.title;$('storyText').textContent=course.taglines[i]||story.title;
    $('nextPlace').textContent=story.next;$('nextEta').textContent=story.eta;
    // Numbered point marks the story's place; it is not a live position estimate.
    $('pulse').hidden=true;
  }
  function play(i,automatic=false){
    if(speaking)return;
    const text=course.stories[i].text, token=++epoch;
    showStory(i);speaking=true;
    let started=false;
    const startedFn=()=>{if(token!==epoch)return;started=true;engine.complete(i);engine.pending=i;progress();message(course.points[i]+' · 이야기 재생 중');};
    const finished=()=>{if(token!==epoch)return;speaking=false;engine.release();message(active?'다음 장소를 향해 걸어주세요.':'이야기를 마쳤습니다.');};
    if(window.PyodaSpeech){ // Android native wrapper exposes completion via bridge events.
      window.PyodaNative.postMessage(JSON.stringify({type:'speak',text,index:i}));return;
    }
    if(!('speechSynthesis'in window)){speaking=false;engine.release();message('이 브라우저에서는 음성 안내를 지원하지 않습니다.');return;}
    speechSynthesis.cancel();utterance=new SpeechSynthesisUtterance(text);utterance.lang='ko-KR';utterance.rate=.94;
    utterance.onstart=startedFn;utterance.onend=finished;
    utterance.onerror=()=>{if(token!==epoch)return;speaking=false;engine.release();message('음성 재생이 멈췄습니다. 이야기 듣기를 눌러 다시 시작해 주세요.');};
    speechSynthesis.speak(utterance);
    setTimeout(()=>{if(token===epoch&&!started){speaking=false;engine.release();epoch++;speechSynthesis.cancel();message('음성 안내를 허용하려면 이야기 듣기를 한 번 눌러 주세요.');}},5000);
  }
  function start(){
    if(active){stop();message('자동 안내를 종료했습니다.');return;}
    if(!configured()){message('등록된 실제 좌표가 없습니다. 장소 설정에서 안내 지점을 먼저 지정해 주세요.');$('placeSettings').open=true;return;}
    if(!geo){message('휴대폰에서 위치 기능을 사용할 수 없습니다.');return;}
    if(window.PyodaNative)window.PyodaNative.postMessage(JSON.stringify({type:'configure',route:{courseId:course.id,name:course.name,places:points().map((p,i)=>({...p,configured:A.validPoint(p),text:course.stories[i].text,title:course.points[i]}))}}));
    active=true;paused=false;$('pulse').hidden=true;$('gpsBtn').textContent='자동 안내 종료';
    $('pauseBtn').disabled=false;$('pauseBtn').textContent='일시정지';
    // A real utterance in the start-button gesture unlocks speech on mobile browsers.
    if('speechSynthesis'in window){const u=new SpeechSynthesisUtterance('자동 안내를 시작합니다.');u.lang='ko-KR';speechSynthesis.speak(u);}
    message('위치를 확인합니다. 등록 지점 반경 30~40m 안에서 잠시 기다리면 이야기가 시작됩니다.');
    watch=geo.watchPosition(position=>{
      if(!active||paused||document.hidden)return;
      if(window.PyodaNative){if(!speaking)message('자동 안내 중 · 화면을 꺼도 계속됩니다.');return;}
      const result=engine.update(position);
      if(result.state==='arrived'){play(result.index,true);return;}
      if(speaking)return;
      if(result.state==='weak'){message('위치 오차가 커서 도착 확인을 기다리는 중입니다.');return;}
      if(result.state==='complete'){message('등록된 지점의 이야기를 모두 들었습니다.');return;}
      if(result.nearest)message(course.points[result.nearest.i]+'까지 약 '+Math.round(result.nearest.d)+'m · '+(result.state==='confirming'?'도착 확인 중':'자동 안내 켜짐')+' · 추정 오차 '+Math.round(position.coords.accuracy)+'m');
    },error=>message(error.message||'위치 권한을 허용해 주세요.'),{enableHighAccuracy:true,maximumAge:0,timeout:15000});
  }
  function refreshPlaces(){
    const selected=$('placeSelect').value;
    $('placeSelect').replaceChildren(...course.points.map((name,i)=>{const o=document.createElement('option');o.value=i;o.textContent=(i+1)+'. '+name+(A.validPoint(points()[i])?' · 등록됨':' · 좌표 미등록');return o;}));
    if(selected&&Number(selected)<course.points.length)$('placeSelect').value=selected;
    loadFields();$('placeCount').textContent='실제 좌표 '+configured()+'/'+course.points.length+'곳';
  }
  function loadFields(){
    const p=points()[Number($('placeSelect').value)];
    $('placeLat').value=p?.latitude??'';$('placeLng').value=p?.longitude??'';$('placeRadius').value=p?.radius??30;
    $('placeSource').textContent=p?.source||'지도에서 정확한 장소를 확인하거나, 현장에서 현재 위치로 지정해 주세요.';
    $('placeMap').href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(course.name+' '+course.points[Number($('placeSelect').value)]+' 제주 서귀포');
  }
  function savePlace(){
    const lat=$('placeLat').value.trim(),lng=$('placeLng').value.trim();
    const p={latitude:Number(lat),longitude:Number(lng),radius:Number($('placeRadius').value),source:'이 기기에서 직접 지정'};
    if(!lat||!lng||!A.validPoint(p)||p.latitude<32||p.latitude>35||p.longitude<125||p.longitude>128||!Number.isFinite(p.radius)||p.radius<15||p.radius>100){$('placeSource').textContent='제주 지역의 올바른 위도·경도와 반경 15~100m를 입력해 주세요.';return;}
    const updated=JSON.parse(JSON.stringify(overrides));updated[course.id]??={};updated[course.id][Number($('placeSelect').value)]=p;
    try{localStorage.setItem(overridesKey,JSON.stringify(updated));overrides=updated;}catch{$('placeSource').textContent='이 브라우저에서 좌표를 저장하지 못했습니다.';return;}
    const visited=[...(engine?.visited||[])];stop();resetEngine(visited);refreshPlaces();
    $('placeSource').textContent='이 휴대폰에 저장했습니다. 다른 사람에게 적용하려면 좌표 내보내기 파일을 전달해 주세요.';
  }
  $('placeSelect').onchange=loadFields;$('savePlace').onclick=savePlace;
  $('capturePlace').onclick=()=>{stop();if(window.PyodaNative)window.PyodaNative.postMessage(JSON.stringify({type:'configure',route:{courseId:'capture',name:'장소 지정',places:[]}}));
    if(!geo){$('placeSource').textContent='위치 기능을 사용할 수 없습니다.';return;}
    if(capture!==null){geo.clearWatch(capture);capture=null;}
    $('placeSource').textContent='해당 장소에 서서 위치를 확인하는 중입니다…';
    const cid=course.id,index=$('placeSelect').value;let samples=[];
    capture=geo.watchPosition(p=>{
      if(course.id!==cid||$('placeSelect').value!==index)return;
      if(!A.validPoint(p.coords)||Date.now()-p.timestamp>15000||p.coords.accuracy>20){$('placeSource').textContent='위치 오차 20m 이하의 신호를 기다립니다.';return;}
      if(samples.some(x=>x.timestamp===p.timestamp))return;
      samples.push(p);
      if(samples.length>=3){samples.sort((a,b)=>a.coords.accuracy-b.coords.accuracy);const c=samples[0].coords;
        $('placeLat').value=c.latitude.toFixed(7);$('placeLng').value=c.longitude.toFixed(7);
        geo.clearWatch(capture);capture=null;$('placeSource').textContent='추정 오차 '+Math.round(c.accuracy)+'m · 위치를 확인한 뒤 저장을 눌러 주세요.';
      }
    },e=>{$('placeSource').textContent=e.message;if(capture!==null)geo.clearWatch(capture);capture=null;},{enableHighAccuracy:true,maximumAge:0,timeout:15000});
    setTimeout(()=>{if(capture!==null){geo.clearWatch(capture);capture=null;$('placeSource').textContent='위치 확인 시간이 지났습니다. 야외에서 다시 시도해 주세요.';}},30000);
  };
  $('exportPlaces').onclick=()=>{
    const data={version:1,places:overrides};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='PYODA_WALK_places.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
  };
  $('resetWalk').onclick=()=>{stop();resetEngine();message('들은 기록을 초기화했습니다. 자동 안내를 다시 시작해 주세요.');};
  window.addEventListener('pyoda-course',event=>{stop();course=event.detail;resetEngine();refreshPlaces();start();});
  $('gpsBtn').onclick=()=>{$('demoBtn').dispatchEvent(new CustomEvent('stop-demo'));start();};
  const originalPause=$('pauseBtn').onclick;
  $('pauseBtn').onclick=()=>{if(!active){originalPause?.();return;}paused=!paused;engine.resetCandidate();if(window.PyodaNative)window.PyodaNative.postMessage(JSON.stringify({type:'pause',paused}));else if(paused)cancelSpeech();engine.release();$('pauseBtn').textContent=paused?'계속 걷기':'일시정지';message(paused?'자동 안내를 잠시 멈췄습니다.':'자동 안내를 다시 시작합니다.');};
  $('demoBtn').addEventListener('click',()=>{stop();$('pauseBtn').disabled=false;$('pauseBtn').textContent='일시정지';});
  document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>{stop();if(capture!==null){geo.clearWatch(capture);capture=null;}}));
  $('speakBtn').onclick=()=>{if(!engine)resetEngine();if(speaking)cancelSpeech();play(Math.max(0,course.stories.findIndex(s=>s.title===$('storyTitle').textContent)));};
  window.addEventListener('pyoda-native',event=>{const d=event.detail;if(!d)return;if(d.type==='stopped'){active=false;watch=null;speaking=false;$('gpsBtn').textContent='자동 안내 시작';$('pauseBtn').disabled=true;message('걷기 안내를 종료했습니다.');}if(d.type==='state'){paused=!!d.paused;message(d.message);$('pauseBtn').textContent=paused?'계속 걷기':'일시정지';}if(d.courseId!==course.id)return;if(d.type==='arrival'&&Number.isInteger(d.index)&&course.stories[d.index]){showStory(d.index);engine.complete(d.index);speaking=true;progress();message('이야기 재생 중');}if(d.type==='storycomplete'){speaking=false;message('다음 장소로 걸어주세요.');}});
  document.addEventListener('visibilitychange',()=>{if(window.PyodaNative)return;engine?.resetCandidate();if(document.hidden){cancelSpeech();engine?.release();}});
  window.addEventListener('pagehide',()=>{if(window.PyodaNative)return;stop();if(capture!==null)geo?.clearWatch(capture);});
  resetEngine();refreshPlaces();
})();
