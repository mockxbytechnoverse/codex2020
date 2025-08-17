(function(){
  const statusEl = document.getElementById('status');
  const workdirEl = document.getElementById('workdir');
  const descEl = document.getElementById('description');
  const runnerEl = document.getElementById('runner');
  const startBtn = document.getElementById('start-record');

  function log(msg){
    const ts = new Date().toLocaleTimeString();
    statusEl.textContent += `[${ts}] ${msg}\n`;
    statusEl.scrollTop = statusEl.scrollHeight;
  }

  async function getActiveTabId(){
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        resolve(tabs && tabs[0] ? tabs[0].id : null);
      });
    });
  }

  async function getServerSettings(){
    return new Promise((resolve) => {
      chrome.storage.local.get(['browserConnectorSettings'], (result) => {
        const settings = result.browserConnectorSettings || { serverHost: 'localhost', serverPort: 3025 };
        resolve(settings);
      });
    });
  }

  async function connectStatusSocket(){
    const settings = await getServerSettings();
    const wsUrl = `ws://${settings.serverHost}:${settings.serverPort}/extension-ws`;
    try {
      const ws = new WebSocket(wsUrl);
      ws.onopen = () => log('Connected to status stream');
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type === 'viz-status') {
            if (data.phase) log(`phase=${data.phase}`);
            if (data.message) log(data.message.trim());
          }
        } catch {}
      };
      ws.onerror = () => log('Status stream error');
      ws.onclose = () => log('Status stream closed');
      return ws;
    } catch (e){
      log('Failed to connect status stream');
      return null;
    }
  }

  async function postJson(url, body){
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  startBtn.addEventListener('click', async () => {
    try {
      statusEl.textContent = '';
      const tabId = await getActiveTabId();
      if (!tabId) { log('No active tab'); return; }

      // Save / send Viz settings
      const workdir = workdirEl.value.trim();
      if (!workdir) { log('Please set workdir'); return; }
      const settings = await getServerSettings();
      await postJson(`http://${settings.serverHost}:${settings.serverPort}/viz/settings`, { workdir, viz: { runner: runnerEl.value } });
      log(`Settings updated: workdir=${workdir}, runner=${runnerEl.value}`);

      // Start recording (reuse background flow)
      const description = descEl.value.trim();
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'START_TAB_RECORDING_FROM_POPUP', tabId, includeMicrophone: true, description }, () => resolve(null));
      });
      log('Recording started');

      // Wait for stop from recording bar or manual stop after a delay could be added here
      // For MVP, listen for the background STOP_RECORDING response that returns path
      const stopResult = await new Promise((resolve) => {
        const listener = (message, sender, sendResponse) => {
          if (message && message.type === 'POPUP_RECORDING_SAVED') {
            chrome.runtime.onMessage.removeListener(listener);
            resolve(message);
          }
        };
        chrome.runtime.onMessage.addListener(listener);
      });

      const recordingPath = stopResult.path;
      log(`Recording saved: ${recordingPath}`);

      // Connect status socket
      await connectStatusSocket();

      // Trigger analyze-and-run
      log('Submitting analyze-and-run');
      const resp = await postJson(`http://${settings.serverHost}:${settings.serverPort}/viz/analyze-and-run`, {
        recordingPath,
        description,
        runner: runnerEl.value,
        immediate: true
      });
      log(`Analysis queued: ${resp.analysisId}`);
    } catch (e){
      log(`Error: ${e.message}`);
    }
  });
})();


