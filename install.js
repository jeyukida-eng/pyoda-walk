(() => {
  let pending;
  const mode = window.matchMedia('(display-mode: standalone)');
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    pending = event;
  });
  const init = () => {
    const button = document.getElementById('installApp');
    const dialog = document.getElementById('installGuide');
    const steps = document.getElementById('installSteps');
    const hint = document.getElementById('installHint');
    const message = document.getElementById('installMessage');
    const iosButton = document.getElementById('installIos');
    const androidButton = document.getElementById('installAndroid');
    const update = () => { button.hidden = !!window.PyodaNative || navigator.standalone === true || mode.matches; };
    const platform = isIos => {
      iosButton.setAttribute('aria-pressed', String(isIos));
      androidButton.setAttribute('aria-pressed', String(!isIos));
      steps.textContent = isIos
        ? '1. Safari에서 이 주소 열기\n2. 공유 메뉴 → 홈 화면에 추가\n3. 이름이 PYODA WALK인지 확인 → 추가'
        : '1. Chrome에서 이 주소 열기\n2. 메뉴(⋮) → 홈 화면에 추가 또는 앱 설치\n3. 이름이 PYODA WALK인지 확인 → 설치';
      hint.textContent = '카카오톡 등 앱 안에서 보고 있다면, 링크를 복사해 위 브라우저에서 열어 주세요.';
      message.textContent = '';
    };
    const guide = () => { platform(ios); if (!dialog.open) dialog.showModal(); };
    button.addEventListener('click', async () => {
      if (!pending) { guide(); return; }
      const event = pending;
      pending = null;
      try {
        await event.prompt();
        await event.userChoice;
      } catch { guide(); }
    });
    document.getElementById('closeInstall').addEventListener('click', () => dialog.close());
    iosButton.addEventListener('click', () => platform(true));
    androidButton.addEventListener('click', () => platform(false));
    document.getElementById('copyInstallLink').addEventListener('click', async () => {
      const url = new URL('./', location.href).href;
      try {
        await navigator.clipboard.writeText(url);
        message.textContent = '복사했습니다. 휴대폰 브라우저 주소창에 붙여 넣어 주세요.';
      } catch { message.textContent = '복사할 주소: ' + url; }
    });
    window.addEventListener('appinstalled', () => { pending = null; button.hidden = true; if (dialog.open) dialog.close(); });
    mode.addEventListener?.('change', update);
    update();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
