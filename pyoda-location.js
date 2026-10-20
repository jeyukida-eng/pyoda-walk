/* Google Fused Location in Android; standard browser location for web preview. */
(() => {
  "use strict";
  const native = window.PyodaNative;
  if (!native) {
    window.PyodaLocation = navigator.geolocation;
    window.PyodaSpeech = null;
    return;
  }
  const watchers = new Map();
  let serial = 0;
  const send = (type, extra = {}) => native.postMessage(JSON.stringify({type, ...extra}));
  function clearWatch(id) {
    const watch = watchers.get(id);
    if (!watch) return;
    clearTimeout(watch.timer);
    watchers.delete(id);
    if (!watchers.size) send("stop");
  }
  function watchPosition(success, failure, options = {}) {
    const id = ++serial;
    const watch = {success, failure, timer: null};
    watchers.set(id, watch);
    if (watchers.size === 1) send("start");
    const timeout = options.timeout ?? 15000;
    if (Number.isFinite(timeout)) watch.timer = setTimeout(() => {
      if (watchers.has(id)) failure?.({code: 3, message: "위치를 확인 중입니다. 정확한 위치 권한과 휴대폰 위치 설정을 확인해 주세요."});
    }, Math.max(0, timeout));
    return id;
  }
  window.addEventListener("pyoda-native", event => {
    const data = event.detail;
    if (!data) return;
    if (data.type === "stopped") {for(const watch of watchers.values())clearTimeout(watch.timer);watchers.clear();return;}
    if (data.type === "position") {
      if (![data.latitude, data.longitude, data.accuracy, data.timestamp].every(Number.isFinite) ||
          Math.abs(data.latitude) > 90 || Math.abs(data.longitude) > 180 ||
          data.accuracy < 0 || Date.now() - data.timestamp > 15000 || data.timestamp > Date.now() + 5000) return;
      const position = {timestamp: data.timestamp, coords: {
        latitude: data.latitude, longitude: data.longitude, accuracy: data.accuracy,
        altitude: null, altitudeAccuracy: null, heading: null, speed: null
      }};
      for (const watch of [...watchers.values()]) {
        clearTimeout(watch.timer);
        watch.success(position);
      }
    } else if (data.type === "error") {
      for (const watch of [...watchers.values()]) watch.failure?.({code: data.code, message: data.message});
    }
  });
  window.PyodaLocation = {watchPosition, clearWatch};
  window.PyodaSpeech = {
    speak(text) { send("speak", {text}); },
    cancel() { send("cancelSpeech"); }
  };
  // The native walking session is stopped by the user, not by page lifecycle events.
})();
