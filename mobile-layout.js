(() => {
  const app=document.getElementById('app'), shell=document.getElementById('mapShell');
  const stage=document.getElementById('mapStage'), img=document.getElementById('mapImage');
  let frame;
  function fitMap(){
    if(!shell.clientWidth||!shell.clientHeight||!img.naturalWidth||!img.naturalHeight)return;
    const ratio=img.naturalWidth/img.naturalHeight;
    const width=Math.min(shell.clientWidth,shell.clientHeight*ratio);
    stage.style.width=width+'px';stage.style.height=width/ratio+'px';
  }
  function resize(){
    cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
      const height=window.visualViewport?.height||window.innerHeight;
      document.documentElement.style.setProperty('--viewport-height',height+'px');
      fitMap();
    });
  }
  window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);
  img.addEventListener('load',resize);
  if('ResizeObserver'in window)new ResizeObserver(fitMap).observe(shell);
  window.addEventListener('pyoda-course',resize);
  resize();
})();
