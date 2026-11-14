// Keep sharing local: no QR service, tracking parameters, or uploaded records.
export function gameLink(href) {
  const url = new URL(href);
  url.search = '';
  url.hash = '';
  return url.href;
}

export function challengeLink(href, track, time) {
  const url = new URL(gameLink(href));
  url.hash = new URLSearchParams({challenge: '1', track, time: time.toFixed(2)}).toString();
  return url.href;
}

export async function qrSvg(text) {
  const {QrCode} = await import('./vendor/qrcodegen.js');
  const qr = QrCode.encodeText(text, QrCode.Ecc.MEDIUM);
  const border = 4, size = qr.size + border * 2, cells = [];
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (qr.getModule(x, y)) cells.push(`M${x + border},${y + border}h1v1h-1z`);
    }
  }
  // A plain, high-contrast code with a full quiet zone; decoration stays outside.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="Scan this QR code to open Micro Racing" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${cells.join('')}" fill="#171b1a"/></svg>`;
}

export function showShareDialog({url, title = 'Pass on the rivalry.', text = 'Scan the code to open Micro Racing on another device.', challenge = false}, openModal) {
  openModal(`<div class="eyebrow">SMALL CARS. MORE RIVALS.</div>
    <h2 id="shareTitle"></h2><p id="shareDescription" class="share-description"></p>
    <div class="qr-ticket"><div class="qr-ticket-heading"><strong>MICRO RACING</strong><span id="shareTicketType"></span></div>
      <div id="shareQr" class="share-qr" aria-busy="true"><p>Preparing your QR code…</p></div>
      <p class="qr-caption">POINT YOUR PHONE CAMERA. HIT THE GRID.</p><div class="finish-stripe" aria-hidden="true"></div>
    </div>
    <label class="share-link-label" for="shareLink">YOUR LINK</label>
    <input class="challenge-input share-link" id="shareLink" readonly spellcheck="false">
    <div class="share-actions"><button class="primary" id="copyShareLink">COPY LINK <span aria-hidden="true">↗</span></button><button class="secondary" id="nativeShare" hidden>Share…</button></div>
    <p class="share-status" id="shareStatus" role="status" aria-live="polite"></p>
    <details class="home-screen"><summary>Add to Home Screen</summary>
      <p>Your next race, one tap away.</p>
      <p><b>iPhone / iPad:</b> In Safari, open Share (sometimes inside the page menu), then choose <b>Add to Home Screen</b> → Add.</p>
      <p><b>Android:</b> In Chrome, open ⋮ and choose <b>Add to Home screen</b>, or <b>Install and create shortcut → Create shortcut</b>, then Add.</p>
    </details>`);
  const modal = document.getElementById('modal');
  modal.classList.add('share-dialog');
  modal.setAttribute('aria-labelledby', 'shareTitle');
  const find = id => modal.querySelector(`#${id}`);
  find('shareTitle').textContent = title;
  find('shareDescription').textContent = text;
  find('shareTicketType').textContent = challenge ? 'TIME TO BEAT' : 'ALL ACCESS';
  const input = find('shareLink'), status = find('shareStatus'), qr = find('shareQr');
  input.value = url;
  input.onclick = () => input.select();
  find('copyShareLink').onclick = async () => {
    try {
      await navigator.clipboard.writeText(url);
      status.textContent = 'Link copied. Send it to a friend!';
    } catch {
      input.focus();
      input.select();
      input.setSelectionRange(0, input.value.length);
      status.textContent = 'Link selected. Copy it using your browser’s Copy command.';
    }
  };
  const share = find('nativeShare');
  share.hidden = typeof navigator.share !== 'function';
  share.onclick = async () => {
    try {
      await navigator.share({title: challenge ? 'Micro Racing challenge' : 'Micro Racing', text, url});
    } catch (error) {
      if (error.name !== 'AbortError') status.textContent = 'Sharing is unavailable here. Use Copy link or scan the code.';
    }
  };
  qrSvg(url).then(svg => {
    if (qr.isConnected) qr.innerHTML = svg;
  }).catch(() => {
    if (qr.isConnected) qr.textContent = 'QR code unavailable. Use Copy link to share.';
  }).finally(() => qr.setAttribute('aria-busy', 'false'));
}
