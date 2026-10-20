(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PyodaArrival=api;})(typeof window!=='undefined'?window:globalThis,()=>{
  const validPoint=p=>p&&Number.isFinite(p.latitude)&&Math.abs(p.latitude)<=90&&Number.isFinite(p.longitude)&&Math.abs(p.longitude)<=180;
  function distance(a,b){const rad=x=>x*Math.PI/180,R=6371000;const p=rad(b.latitude-a.latitude),q=rad(b.longitude-a.longitude);const v=Math.sin(p/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(q/2)**2;return 2*R*Math.asin(Math.sqrt(Math.min(1,v)));}
  class Arrival {
    constructor(points,visited=[]){this.points=points;this.visited=new Set(visited);this.pending=null;this.candidate=null;this.lastTimestamp=0;}
    resetCandidate(){this.candidate=null;}
    complete(i){this.visited.add(i);this.pending=null;this.resetCandidate();}
    release(){this.pending=null;this.resetCandidate();}
    update(position,now=Date.now()){
      const c=position?.coords,t=position?.timestamp;
      if(!validPoint(c)||!Number.isFinite(t)||now-t>15000||t>now+5000||t<=this.lastTimestamp){this.resetCandidate();return {state:'stale'};}
      this.lastTimestamp=t;
      if(!Number.isFinite(c.accuracy)||c.accuracy<0||c.accuracy>25){this.resetCandidate();return {state:'weak'};}
      const choices=this.points.map((p,i)=>validPoint(p)?{i,d:distance(c,p),radius:p.radius||30}:null).filter(p=>p&&!this.visited.has(p.i)).sort((a,b)=>a.d-b.d);
      if(!choices.length)return {state:this.points.some(validPoint)?'complete':'unconfigured'};
      const nearest=choices[0];
      if(this.pending!==null)return {state:'speaking',nearest};
      if(nearest.d>nearest.radius){this.resetCandidate();return {state:'approaching',nearest};}
      if(!this.candidate||this.candidate.i!==nearest.i||t-this.candidate.last>10000)this.candidate={i:nearest.i,since:t,last:t,count:1};
      else {this.candidate.last=t;this.candidate.count++;}
      if(t-this.candidate.since>=4000&&this.candidate.count>=3){this.pending=nearest.i;return {state:'arrived',index:nearest.i,nearest};}
      return {state:'confirming',nearest};
    }
  }
  return {Arrival,distance,validPoint};
});
