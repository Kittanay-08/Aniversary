// ========================================================
// PUZZLE GAME — พวกเด็กน้อย.webp แบ่ง 3x3 = 9 ชิ้น drag & drop
// ========================================================
(function initPuzzle() {
  const COLS = 3, ROWS = 3;
  let pieces = [];
  let dragging = null;
  let dragOffX = 0, dragOffY = 0;
  let solved = false;
  let eventsBound = false;

  const img = new Image();
  img.onerror = () => {
    if (!img.src.includes('puzzle.webp')) {
      img.src = 'Picture/puzzle.webp';
    } else if (!img.src.includes('พวกเด็กน้อย.webp')) {
      img.src = 'พวกเด็กน้อย.webp';
    }
  };
  img.src = 'Picture/พวกเด็กน้อย.webp';

  function setupPuzzle() {
    const canvas = document.getElementById('puzzleCanvas');
    if (!canvas || !img.complete || img.naturalWidth === 0) return;
    if (solved) return;

    // ขนาด canvas = ขนาด container จริง
    const W = canvas.offsetWidth  || 280;
    const H = canvas.offsetHeight || 160;
    canvas.width  = W;
    canvas.height = H;

    const pw = Math.floor(W / COLS);
    const ph = Math.floor(H / ROWS);

    if (pieces.length === 0) {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const tx = c * pw, ty = r * ph;
          let sx, sy;
          do {
            sx = Math.random() * (W - pw);
            sy = Math.random() * (H - ph);
          } while (Math.abs(sx - tx) < pw * 0.3 && Math.abs(sy - ty) < ph * 0.3);

          pieces.push({ c, r, tx, ty, x: sx, y: sy, pw, ph, snapped: false });
        }
      }
      pieces.sort(() => Math.random() - 0.5);
    } else {
      pieces.forEach(p => {
        p.pw = pw;
        p.ph = ph;
        p.tx = p.c * pw;
        p.ty = p.r * ph;
        if (p.snapped) {
          p.x = p.tx;
          p.y = p.ty;
        }
      });
    }

    drawPuzzle();
    if (!eventsBound) {
      bindPuzzleEvents(canvas, img);
      eventsBound = true;
    }
  }

  window.setupPuzzle = setupPuzzle;
  window.resetPuzzlePieces = function() {
    solved = false;
    pieces = [];
    setupPuzzle();
    const status = document.getElementById('puzzleStatus');
    if (status) status.innerHTML = '🧩 สับชิ้นส่วนใหม่แล้ว ลากมาต่อให้ครบ!';
    playClickSound();
  };
  img.onload = setupPuzzle;

  function drawPuzzle() {
    const canvas = document.getElementById('puzzleCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // วาด grid เป้าหมาย (เส้นจางๆ บอกว่าชิ้นไหนยังไม่ snapped)
    if (!solved) {
      ctx.strokeStyle = 'rgba(180,180,180,0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      pieces.forEach(p => {
        if (!p.snapped) ctx.strokeRect(p.tx + 0.5, p.ty + 0.5, p.pw, p.ph);
      });
      ctx.setLineDash([]);
    }

    // วาดชิ้น snapped ก่อน แล้วค่อย unsnapped ทับ แล้ว dragging สุดท้าย
    pieces.filter(p => p.snapped).forEach(p => drawPiece(ctx, img, p, false));
    pieces.filter(p => !p.snapped && p !== dragging).forEach(p => drawPiece(ctx, img, p, false));
    if (dragging) drawPiece(ctx, img, dragging, true);
  }

  function drawPiece(ctx, imgEl, p, isActive) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.x, p.y, p.pw, p.ph);
    ctx.clip();

    // srcX, srcY คำนวณจาก natural size ของรูป
    const srcX = p.c * (imgEl.naturalWidth  / COLS);
    const srcY = p.r * (imgEl.naturalHeight / ROWS);
    const srcW = imgEl.naturalWidth  / COLS;
    const srcH = imgEl.naturalHeight / ROWS;

    ctx.drawImage(imgEl, srcX, srcY, srcW, srcH, p.x, p.y, p.pw, p.ph);

    // กรอบ — ไม่วาดเมื่อ solved
    if (!solved) {
      ctx.strokeStyle = isActive ? '#ff1493' : (p.snapped ? '#4caf50' : '#2a203f');
      ctx.lineWidth = isActive ? 2.5 : 1.5;
      ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.pw - 1, p.ph - 1);
    }

    ctx.restore();
  }

  function bindPuzzleEvents(canvas, img) {
    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width  / rect.width;
      const scaleY = canvas.height / rect.height;
      const src = e.touches ? e.touches[0] : e;
      return {
        x: (src.clientX - rect.left) * scaleX,
        y: (src.clientY - rect.top)  * scaleY
      };
    }

    function onDown(e) {
      if (solved) return;
      e.preventDefault();
      const { x, y } = getPos(e);
      // หาชิ้นที่คลิก (จากบนสุดก่อน)
      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i];
        if (p.snapped) continue;
        if (x >= p.x && x <= p.x + p.pw && y >= p.y && y <= p.y + p.ph) {
          dragging = p;
          dragOffX = x - p.x;
          dragOffY = y - p.y;
          // เอาชิ้นที่ drag ขึ้นมาบนสุด
          pieces.splice(i, 1);
          pieces.push(dragging);
          break;
        }
      }
    }

    function onMove(e) {
      if (!dragging || solved) return;
      e.preventDefault();
      const { x, y } = getPos(e);
      dragging.x = Math.max(0, Math.min(canvas.width - dragging.pw, x - dragOffX));
      dragging.y = Math.max(0, Math.min(canvas.height - dragging.ph, y - dragOffY));
      drawPuzzle();
    }

    function onUp(e) {
      if (!dragging || solved) return;
      // ตรวจว่าใกล้ตำแหน่งเป้าหมายไหม (snap threshold = 18px)
      const SNAP = 18;
      if (Math.abs(dragging.x - dragging.tx) < SNAP && Math.abs(dragging.y - dragging.ty) < SNAP) {
        dragging.x = dragging.tx;
        dragging.y = dragging.ty;
        dragging.snapped = true;
      }
      dragging = null;
      drawPuzzle();

      // ตรวจชนะ
      if (pieces.every(p => p.snapped)) {
        solved = true;
        // วาดรูปเต็มสะอาดๆ ไม่มีเส้นเลย
        const canvas = document.getElementById('puzzleCanvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // ข้อความ fade out ผ่าน div overlay
        const container = canvas.parentElement;
        const msgEl = document.createElement('div');
        msgEl.style.cssText = `
          position:absolute; inset:0; display:flex; flex-direction:column;
          align-items:center; justify-content:center; gap:4px;
          background:rgba(0,0,0,0.38); pointer-events:none;
          transition: opacity 1.2s ease; opacity:1; z-index:10;
        `;
        msgEl.innerHTML = `
          <span style="font-family:'Anuphan', sans-serif; font-weight:800; font-size:clamp(16px,5vw,22px);
            color:#fff0f8; text-shadow: 0 0 10px #ff1493, 2px 2px 0 #b3006e;
            letter-spacing:1px; line-height:1.4; text-align:center;">ดีใจที่ได้เจอหนู 💕</span>
        `;
        container.appendChild(msgEl);

        // fade out หลัง 1.8s
        setTimeout(() => { msgEl.style.opacity = '0'; }, 1800);
        setTimeout(() => { msgEl.remove(); }, 3100);
        document.getElementById('puzzleStatus').innerHTML = '💖 ดีใจที่ได้เจอหนูนะคะ ✨';
        document.getElementById('puzzleStatus').style.color = '#ff1493';
        playKissSound();
        triggerConfetti && triggerConfetti();
      }
    }

    canvas.addEventListener('mousedown',  onDown,  { passive: false });
    canvas.addEventListener('mousemove',  onMove,  { passive: false });
    canvas.addEventListener('mouseup',    onUp);
    canvas.addEventListener('touchstart', onDown,  { passive: false });
    canvas.addEventListener('touchmove',  onMove,  { passive: false });
    canvas.addEventListener('touchend',   onUp);
  }
})();

const bgm = document.getElementById('bgm');

// 🔊 Web Audio API
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
  if (!audioCtx) audioCtx = new AudioContext();
}

function playClickSound() {
  initAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(800, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}

function playAlertSound() {
  initAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(520, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.12);
}

function playKissSound() {
  initAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
}

document.addEventListener('click', (e) => {
  if (e.target.tagName === 'BUTTON' || e.target.closest('.desktop-icon') || e.target.closest('.win-btn-control')) {
    playClickSound();
  }
});

// 1. LOADING PROGRESS BLOCKS
let isLoading = false;
function startLoadingBlocks() {
  if (isLoading) return;
  isLoading = true;

  const blocks = document.querySelectorAll('.p-block');
  let currentBlock = 0;

  const loadTimer = setInterval(() => {
    if (currentBlock < blocks.length) {
      blocks[currentBlock].classList.add('active');
      playClickSound();
      currentBlock++;
    } else {
      clearInterval(loadTimer);
      document.getElementById('load-text').textContent = 'COMPLETE!';

      setTimeout(() => {
        document.getElementById('pc-world').style.display = 'none';
        startErrorChaos();
      }, 350);
    }
  }, 110);
}

// ✨ AMBIENT BACKGROUND PARTICLES (Desktop / PC World / BSOD)
(function initAmbientParticles() {
  function spawnParticles(containerId, symbols, count, maxOp) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      el.className = 'ambient-particle';
      el.textContent = symbols[i % symbols.length];

      const left = Math.random() * 96 + 2;
      const size = Math.floor(Math.random() * 10) + 12;
      const dur = (Math.random() * 7 + 8).toFixed(2);
      const swayDur = (Math.random() * 2.5 + 2.2).toFixed(2);
      const delay = (Math.random() * -15).toFixed(2);
      const sway = Math.floor(Math.random() * 22) + 10;

      el.style.left = `${left}%`;
      el.style.fontSize = `${size}px`;
      el.style.setProperty('--dur', `${dur}s`);
      el.style.setProperty('--sway-dur', `${swayDur}s`);
      el.style.setProperty('--delay', `${delay}s`);
      el.style.setProperty('--sway', `${sway}px`);
      el.style.setProperty('--max-op', maxOp);

      container.appendChild(el);
    }
  }

  const cuteSymbols = ['💖', '✨', '🌸', '★', '🎀', '💕', '♪', '🫧'];
  const bsodSymbols = ['💖', '✨', '🦋', '💌', '⚠️', '★', '💕'];

  spawnParticles('desktop-ambient-bg', cuteSymbols, 22, '0.65');
  spawnParticles('pc-ambient-bg', cuteSymbols, 18, '0.65');
  spawnParticles('bsod-ambient-bg', bsodSymbols, 18, '0.35');
})();

// 2. ERROR CHAOS ADAPTIVE & BACKGROUND STREAM
let bsodLogTimer = null;
const bsodExtraLogs = [
  "> LOADING_BIRTHDAY_KERNEL_V2026.SYS ... [OK]",
  "> SCANNING_CUTENESS_OVERLOAD ... 999,999% [CRITICAL_LOVE]",
  "> CHECKING_SADNESS.EXE ... 0 BYTES FOUND (DELETED)",
  "> MOUNTING_VOLUME: /DEV/HUGS_AND_KISSES ... [CONNECTED]",
  "> ALLOCATING_HAPPINESS_BUFFER: 0x00FF1493 -> 0xFFFFFFFF",
  "> WARNING: HEARTBEAT_FREQUENCY_EXCEEDED_LIMIT!",
  "> INSTALLING_UNLIMITED_SMILES_PACKAGE ... 100%",
  "> EXECUTING: HAPPY_Aniversary_MY_LOVE.EXE 💖"
];

function adjustChaosScale() {
  const canvas = document.getElementById('chaos-canvas');
  if (!canvas) return;
  if (window.innerWidth > 650) {
    const scaleX = (window.innerWidth * 0.94) / 760;
    const scaleY = (window.innerHeight * 0.94) / 520;
    const scale = Math.min(scaleX, scaleY, 1.3);
    canvas.style.transform = `scale(${scale})`;
  } else {
    canvas.style.transform = 'none';
  }
}

window.addEventListener('resize', adjustChaosScale);

function startErrorChaos() {
  const overlay = document.getElementById('error-chaos-overlay');
  overlay.style.display = 'flex';
  adjustChaosScale();

  const wins = document.querySelectorAll('.c-win');
  let idx = 0;

  const popTimer = setInterval(() => {
    if (idx < wins.length) {
      wins[idx].classList.add('show');
      playAlertSound();
      idx++;
    } else {
      clearInterval(popTimer);
    }
  }, 90);

  // พิมพ์ข้อความโค้ด BSOD ไหลอัตโนมัติในพื้นหลัง
  const logContainer = document.getElementById('bsod-stream-log');
  if (logContainer) {
    logContainer.innerHTML = '';
    let lineIdx = 0;
    if (bsodLogTimer) clearInterval(bsodLogTimer);
    bsodLogTimer = setInterval(() => {
      const line = document.createElement('div');
      const hex = '0x' + Math.floor(Math.random() * 0xffffff).toString(16).toUpperCase().padStart(6, '0');
      line.textContent = `[${hex}] ${bsodExtraLogs[lineIdx % bsodExtraLogs.length]}`;
      logContainer.appendChild(line);
      if (logContainer.children.length > 14) {
        logContainer.removeChild(logContainer.firstChild);
      }
      lineIdx++;
    }, 450);
  }
}

function finishErrorAndEnter() {
  if (bsodLogTimer) {
    clearInterval(bsodLogTimer);
    bsodLogTimer = null;
  }
  document.getElementById('error-chaos-overlay').style.display = 'none';

  // ตอนเข้าหน้านี้ เพลงค่อยมีเพลงขึ้นมา!
  userPausedBgm = false;
  bgm.volume = isAudioMuted ? 0 : (currentVolume / 100);
  bgm.play().catch(() => {});
  updatePlayButtonUI();

  triggerConfetti();
  initPaintCanvas();
  if (typeof window.setupPuzzle === 'function') {
    window.setupPuzzle();
  }
}

// ⚠️ DO_NOT_CLICK Alert
const errorMessages = [
  "⚠️ WARNING: มีความน่ารักเกินพิกัด!",
  "🚨 SYSTEM OVERLOAD: รักหนูมากที่สุดในโลกกก!",
  "💌 ERROR 404: หาใครน่ารักกว่านี้ไม่เจอแล้ว",
  "💖 ALERT: I love 3000"
];

function triggerCuteVirus() {
  triggerConfetti();
  let count = 0;
  const totalPopups = 4;

  const popupInterval = setInterval(() => {
    if (count >= totalPopups) {
      clearInterval(popupInterval);
      return;
    }

    playAlertSound();
    const msg = errorMessages[count % errorMessages.length];
    createPopup(msg, count);
    count++;
  }, 200);
}

function createPopup(text, idx) {
  const pop = document.createElement('div');
  pop.className = 'error-popup';

  const offsetX = (idx - 1.5) * 60;
  const offsetY = (idx - 1.5) * 50;
  pop.style.setProperty('--ox', offsetX + 'px');
  pop.style.setProperty('--oy', offsetY + 'px');
  pop.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;

  pop.innerHTML = `
    <div class="window-header" style="background: linear-gradient(90deg, #ff0055, #ff7597); color:#fff; cursor:grab;">
      <div>⚠️ SYSTEM ALERT!</div>
      <div class="win-btn-control" onclick="this.closest('.error-popup').remove()">✕</div>
    </div>
    <div class="window-body" style="display: flex; gap: 10px; align-items: center; padding: 14px;">
      <div style="font-size: 28px;">💖</div>
      <div style="font-weight: 600; font-size: 11px; color: #ff1493; line-height: 1.5;">${text}</div>
    </div>
    <div style="text-align: right; padding: 0 10px 10px;">
      <button class="retro-btn" onclick="this.closest('.error-popup').remove(); triggerConfetti();">ยอมรับ 💕</button>
    </div>
  `;

  document.body.appendChild(pop);
  makeDraggable(pop);
}

// 🖱️ Draggable Windows
function makeDraggable(element) {
  const header = element.querySelector('.window-header') || element.querySelector('.paint-header') || element;
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

  header.onmousedown = dragMouseDown;
  header.ontouchstart = dragTouchStart;

  function dragMouseDown(e) {
    if (e.target.classList.contains('win-btn-control') || ['BUTTON', 'INPUT', 'SELECT', 'OPTION', 'CANVAS', 'VIDEO'].includes(e.target.tagName)) return;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
    bringToFront(element);
  }

  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    element.style.transform = 'none';
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
  }

  function dragTouchStart(e) {
    if (e.target.classList.contains('win-btn-control') || ['BUTTON', 'INPUT', 'SELECT', 'OPTION', 'CANVAS', 'VIDEO'].includes(e.target.tagName)) return;
    const touch = e.touches[0];
    pos3 = touch.clientX;
    pos4 = touch.clientY;
    document.ontouchend = closeDragElement;
    document.ontouchmove = elementTouchDrag;
    bringToFront(element);
  }

  function elementTouchDrag(e) {
    const touch = e.touches[0];
    pos1 = pos3 - touch.clientX;
    pos2 = pos4 - touch.clientY;
    pos3 = touch.clientX;
    pos4 = touch.clientY;
    element.style.transform = 'none';
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
    document.ontouchend = null;
    document.ontouchmove = null;
  }
}

let topZIndex = 600;
function bringToFront(el) {
  topZIndex++;
  el.style.zIndex = topZIndex;
}

// ==========================================
// 💿 CD PLAYER: 2 SONGS & VOLUME CONTROL (Windows 98)
// ==========================================
const cdTracks = [
  {
    title: '01. เรา',
    artist: 'Love u Pimpisut',
    src: 'Music/Cocktail.mp3',
    cover: 'Picture/🤌🏻.jpg'
  },
  {
    title: '02. รักให้เธอได้รู้',
    artist: 'Love U Naka 💖',
    src: 'Music/pun.mp3',
    cover: 'Picture/851180398369093543.jpg'
  }
];
let currentTrackIndex = 0;
let currentVolume = 60;
let isAudioMuted = false;
let userPausedBgm = false;

function selectTrack(indexStr, shouldPlay = true) {
  const idx = parseInt(indexStr, 10);
  if (isNaN(idx) || idx < 0 || idx >= cdTracks.length) return;
  currentTrackIndex = idx;
  const track = cdTracks[currentTrackIndex];

  const selectEl = document.getElementById('cd-track-select');
  if (selectEl) selectEl.value = String(currentTrackIndex);

  const artistEl = document.getElementById('cd-artist-label');
  if (artistEl) artistEl.textContent = track.artist;

  const coverEl = document.getElementById('cd-cover-img');
  if (coverEl) coverEl.src = track.cover;

  const lcdTrack = document.getElementById('cd-lcd-track');
  if (lcdTrack) lcdTrack.textContent = `[TRK 0${currentTrackIndex + 1}]`;

  bgm.src = track.src;
  bgm.volume = isAudioMuted ? 0 : (currentVolume / 100);
  if (shouldPlay) {
    userPausedBgm = false;
    bgm.play().catch(() => {});
  }
  updatePlayButtonUI();
}

function nextTrack() {
  const nextIdx = (currentTrackIndex + 1) % cdTracks.length;
  selectTrack(nextIdx);
  triggerConfetti();
}

function prevTrack() {
  const prevIdx = (currentTrackIndex - 1 + cdTracks.length) % cdTracks.length;
  selectTrack(prevIdx);
}

function toggleAudio() {
  if (bgm.paused) {
    userPausedBgm = false;
    bgm.volume = isAudioMuted ? 0 : (currentVolume / 100);
    bgm.play().catch(() => {});
  } else {
    userPausedBgm = true;
    bgm.pause();
  }
  updatePlayButtonUI();
}

function stopAudio() {
  userPausedBgm = true;
  bgm.pause();
  bgm.currentTime = 0;
  updatePlayButtonUI();
}

function ejectCdTray() {
  playAlertSound();
  const disc = document.getElementById('cd-disc-spinning');
  if (disc) {
    disc.classList.remove('spinning');
    disc.style.transform = 'translateY(-20px) scale(0.9)';
    setTimeout(() => {
      disc.style.transform = 'none';
      nextTrack();
    }, 300);
  } else {
    nextTrack();
  }
}

function toggleCdPlayer() {
  const widget = document.getElementById('cd-player-widget');
  if (widget) {
    widget.style.display = (widget.style.display === 'none') ? 'block' : 'none';
  }
}

function toggleCdPlayerMin() {
  const body = document.getElementById('cd-layout-body');
  if (body) {
    body.style.display = (body.style.display === 'none') ? 'flex' : 'none';
  }
}

function openArtistModal() {
  const modal = document.getElementById('artist-modal');
  if (modal) modal.style.display = 'flex';
  playClickSound();
}

function closeArtistModal() {
  const modal = document.getElementById('artist-modal');
  if (modal) modal.style.display = 'none';
  playClickSound();
}

function updatePlayButtonUI() {
  const btn = document.getElementById('cd-play-btn');
  if (btn) btn.textContent = bgm.paused ? '▶' : '❚❚';

  const disc = document.getElementById('cd-disc-spinning');
  if (disc) {
    if (bgm.paused) disc.classList.remove('spinning');
    else disc.classList.add('spinning');
  }

  const lcdStatus = document.getElementById('cd-lcd-status');
  if (lcdStatus) {
    if (bgm.paused) {
      lcdStatus.textContent = '⏸ PAUSE';
      lcdStatus.classList.remove('cd-lcd-blink');
    } else {
      lcdStatus.textContent = '● PLAY';
      lcdStatus.classList.add('cd-lcd-blink');
    }
  }
}

bgm.addEventListener('play', updatePlayButtonUI);
bgm.addEventListener('pause', updatePlayButtonUI);

// Realtime LCD timer display
bgm.addEventListener('timeupdate', () => {
  const lcdTime = document.getElementById('cd-lcd-time');
  if (!lcdTime) return;
  const cur = Math.floor(bgm.currentTime || 0);
  const m = String(Math.floor(cur / 60)).padStart(2, '0');
  const s = String(cur % 60).padStart(2, '0');
  lcdTime.textContent = `${m}:${s}`;
});

// เตรียมข้อมูลเพลงแรกไว้ที่ CD Player (ไม่เล่นเพลงจนกว่าจะเข้าหน้า Desktop)
(function initCdPlayerDisplay() {
  const firstTrack = cdTracks[0];
  if (firstTrack) {
    bgm.src = firstTrack.src;
    bgm.volume = currentVolume / 100;
    const artistEl = document.getElementById('cd-artist-label');
    if (artistEl) artistEl.textContent = firstTrack.artist;
    const coverEl = document.getElementById('cd-cover-img');
    if (coverEl) coverEl.src = firstTrack.cover;
    const selectEl = document.getElementById('cd-track-select');
    if (selectEl) selectEl.value = '0';
  }
  updatePlayButtonUI();
})();

function setVolume(val) {
  currentVolume = Math.max(0, Math.min(100, parseInt(val, 10) || 0));
  isAudioMuted = (currentVolume === 0);
  bgm.volume = currentVolume / 100;

  const slider = document.getElementById('cd-volume-slider');
  if (slider && Number(slider.value) !== currentVolume) {
    slider.value = currentVolume;
  }

  const textEl = document.getElementById('cd-vol-text');
  if (textEl) textEl.textContent = `${currentVolume}%`;

  const iconEl = document.getElementById('cd-vol-icon');
  if (iconEl) {
    if (currentVolume === 0) iconEl.textContent = '🔇';
    else if (currentVolume < 45) iconEl.textContent = '🔉';
    else iconEl.textContent = '🔊';
  }
}

function changeVolume(delta) {
  setVolume(currentVolume + delta);
}

function toggleMuteAudio() {
  if (isAudioMuted || currentVolume === 0) {
    isAudioMuted = false;
    setVolume(currentVolume > 0 ? currentVolume : 60);
  } else {
    isAudioMuted = true;
    bgm.volume = 0;
    const textEl = document.getElementById('cd-vol-text');
    if (textEl) textEl.textContent = '0%';
    const iconEl = document.getElementById('cd-vol-icon');
    if (iconEl) iconEl.textContent = '🔇';
  }
}

function updateClock() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  document.getElementById('clock').textContent = `${hours}:${minutes} ${ampm}`;
}
setInterval(updateClock, 1000);
updateClock();

function openWindow(id) {
  const target = document.getElementById(id);
  target.style.top = '50%';
  target.style.left = '50%';
  target.style.transform = 'translate(-50%, -50%)';
  target.classList.add('active');
  bringToFront(target);
  makeDraggable(target);

  if (id === 'win-letter') replayTypewriter();
  if (id === 'win-fortune') clawInit();
  if (id === 'win-gallery') renderGalleryImmediate();
  if (id === 'win-youtube') {
    const player = document.getElementById('custom-video-player');
    if (player) {
      player.muted = true;
      player.currentTime = 0;
      player.play().catch(() => {});
    }
  }
}

function closeWindow(id) {
  document.getElementById(id).classList.remove('active');
  if (id === 'win-youtube') {
    const player = document.getElementById('custom-video-player');
    if (player) {
      player.pause();
      player.currentTime = 0;
    }
  }
  if (id === 'win-gallery') {
    const galleryVid = document.getElementById('gallery-video-tag');
    if (galleryVid) {
      galleryVid.pause();
    }
  }
}

// ==========================================
// 🎨 PAINT LOGIC (UNTITLED.PNG)
// ==========================================
const paintCanvas = document.getElementById('customPaintCanvas');
const paintCtx = paintCanvas.getContext('2d');
let isPainting = false;
let currentColor = '#ff1493';
let currentTool = 'pen';
let currentBrushSize = 3;
let startX = 0, startY = 0;
let savedCanvasImage = null;

function initPaintCanvas() {
  paintCtx.fillStyle = "#ffffff";
  paintCtx.fillRect(0, 0, paintCanvas.width, paintCanvas.height);
}
initPaintCanvas();

function setPaintTool(tool) {
  currentTool = tool;
  document.querySelectorAll('.p-tool-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`tool-${tool}`);
  if (activeBtn) activeBtn.classList.add('active');
  playClickSound();
}

function setBrushSize(size, el) {
  currentBrushSize = size;
  document.querySelectorAll('.b-size-dot').forEach(d => d.classList.remove('active'));
  if (el) el.classList.add('active');
  playClickSound();
}

function minimizePaint() {
  const win = document.getElementById('paint-main-window');
  if (win) win.classList.toggle('minimized');
  playClickSound();
}

function toggleMaximizePaint() {
  const win = document.getElementById('paint-main-window');
  if (win) {
    win.classList.toggle('maximized');
    setTimeout(() => {
      // Re-init canvas size if needed
      const imgData = paintCtx.getImageData(0, 0, paintCanvas.width, paintCanvas.height);
      if (win.classList.contains('maximized')) {
        paintCanvas.width = 650;
        paintCanvas.height = 360;
      } else {
        paintCanvas.width = 280;
        paintCanvas.height = 150;
      }
      paintCtx.fillStyle = '#ffffff';
      paintCtx.fillRect(0, 0, paintCanvas.width, paintCanvas.height);
      paintCtx.putImageData(imgData, 0, 0);
    }, 150);
  }
  playClickSound();
}

function closePaintPrompt() {
  const modal = document.getElementById('paint-prompt-modal');
  if (modal) modal.style.display = 'flex';
  playAlertSound();
}

function closePaintPromptModal() {
  const modal = document.getElementById('paint-prompt-modal');
  if (modal) modal.style.display = 'none';
  playClickSound();
}

function savePaintAndClose() {
  savePaintImage();
  closePaintPromptModal();
  const win = document.getElementById('paint-main-window');
  if (win) win.style.display = 'none';
}

function dismissPaintWithoutSave() {
  closePaintPromptModal();
  const win = document.getElementById('paint-main-window');
  if (win) win.style.display = 'none';
  playClickSound();
}

function setPaintColor(color) {
  currentColor = color;
  document.getElementById('current-color-indicator').style.background = color;
  if (currentTool === 'eraser') setPaintTool('pen');
  playClickSound();
}

function getCanvasCoords(e) {
  const rect = paintCanvas.getBoundingClientRect();
  const scaleX = paintCanvas.width / rect.width;
  const scaleY = paintCanvas.height / rect.height;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

function startDraw(e) {
  isPainting = true;
  const coords = getCanvasCoords(e);
  startX = coords.x;
  startY = coords.y;

  if (['heart', 'star'].includes(currentTool)) {
    stampIcon(coords.x, coords.y, currentTool);
    isPainting = false;
    return;
  }

  if (['line', 'circle'].includes(currentTool)) {
    savedCanvasImage = paintCtx.getImageData(0, 0, paintCanvas.width, paintCanvas.height);
    return;
  }

  paintCtx.beginPath();
  paintCtx.moveTo(coords.x, coords.y);
  drawMove(e);
}

function drawMove(e) {
  const coords = getCanvasCoords(e);
  const statusEl = document.getElementById('paint-coord-status');
  if (statusEl) {
    statusEl.textContent = `📍 X: ${Math.round(coords.x)}, Y: ${Math.round(coords.y)}`;
  }

  if (!isPainting) return;

  paintCtx.lineCap = 'round';
  paintCtx.lineJoin = 'round';

  if (currentTool === 'eraser') {
    paintCtx.strokeStyle = '#ffffff';
    paintCtx.lineWidth = currentBrushSize * 3;
    paintCtx.lineTo(coords.x, coords.y);
    paintCtx.stroke();
    paintCtx.beginPath();
    paintCtx.moveTo(coords.x, coords.y);
  } else if (currentTool === 'pen') {
    paintCtx.strokeStyle = currentColor;
    paintCtx.lineWidth = currentBrushSize;
    paintCtx.lineTo(coords.x, coords.y);
    paintCtx.stroke();
    paintCtx.beginPath();
    paintCtx.moveTo(coords.x, coords.y);
  } else if (currentTool === 'spray') {
    // Retro spray airbrush
    paintCtx.fillStyle = currentColor;
    const density = 16;
    const radius = currentBrushSize * 2.5;
    for (let i = 0; i < density; i++) {
      const offsetX = (Math.random() - 0.5) * radius * 2;
      const offsetY = (Math.random() - 0.5) * radius * 2;
      if (offsetX * offsetX + offsetY * offsetY <= radius * radius) {
        paintCtx.fillRect(coords.x + offsetX, coords.y + offsetY, 1.2, 1.2);
      }
    }
  } else if (currentTool === 'line') {
    paintCtx.putImageData(savedCanvasImage, 0, 0);
    paintCtx.strokeStyle = currentColor;
    paintCtx.lineWidth = currentBrushSize;
    paintCtx.beginPath();
    paintCtx.moveTo(startX, startY);
    paintCtx.lineTo(coords.x, coords.y);
    paintCtx.stroke();
  } else if (currentTool === 'circle') {
    paintCtx.putImageData(savedCanvasImage, 0, 0);
    paintCtx.strokeStyle = currentColor;
    paintCtx.lineWidth = currentBrushSize;
    const radius = Math.sqrt(Math.pow(coords.x - startX, 2) + Math.pow(coords.y - startY, 2));
    paintCtx.beginPath();
    paintCtx.arc(startX, startY, radius, 0, Math.PI * 2);
    paintCtx.stroke();
  }
}

function stopDraw() {
  isPainting = false;
  paintCtx.beginPath();
}

function stampIcon(x, y, tool) {
  paintCtx.font = `${currentBrushSize * 5 + 12}px Arial`;
  paintCtx.textAlign = 'center';
  paintCtx.textBaseline = 'middle';
  const icons = { heart: '💖', star: '✨' };
  paintCtx.fillText(icons[tool], x, y);
  playKissSound();
}

paintCanvas.addEventListener('mousedown', startDraw);
paintCanvas.addEventListener('mousemove', drawMove);
paintCanvas.addEventListener('mouseup', stopDraw);
paintCanvas.addEventListener('mouseleave', stopDraw);

paintCanvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDraw(e); }, { passive: false });
paintCanvas.addEventListener('touchmove', (e) => { e.preventDefault(); drawMove(e); }, { passive: false });
paintCanvas.addEventListener('touchend', stopDraw);

function clearPaintBoard() {
  paintCtx.fillStyle = "#ffffff";
  paintCtx.fillRect(0, 0, paintCanvas.width, paintCanvas.height);
  playClickSound();
}

function savePaintImage() {
  playAlertSound();
  triggerConfetti();

  const imageURI = paintCanvas.toDataURL('image/png');
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  if (isIOS) {
    // iOS: แสดง modal overlay ให้ user กดค้างเซฟ
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.7);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:20px;';
    overlay.innerHTML = `
      <div style="background:#ffccd8;border-radius:12px;padding:16px;max-width:90vw;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,0.3);">
        <p style="font-weight:bold;color:#ff1493;font-size:14px;margin:0 0 12px;">💖 กดค้างที่รูปแล้วเลือก "บันทึกรูปภาพ"</p>
        <img src="${imageURI}" style="max-width:100%;border:3px solid #b3597c;border-radius:8px;display:block;"/>
        <button onclick="this.closest('div').parentElement.remove()" style="margin-top:12px;background:#ff9ec4;border:2px solid #b3597c;border-radius:6px;padding:8px 20px;font-weight:bold;font-size:13px;cursor:pointer;">ปิด ✕</button>
      </div>
    `;
    document.body.appendChild(overlay);
  } else {
    // Desktop/Android: download ปกติ
    const link = document.createElement('a');
    link.download = 'Aniversary_art.png';
    link.href = imageURI;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// 💌 1. Typewriter & Kiss Stamp
const fullLetter = "ถึงคนเก่งของพี่ 💖\n1ปี 1เดือนแล้วน๊าาผ่านไปไวม๊ากกก ขอบคุณที่คอยอยู่ข้างๆ ขอบคุณสำหรับทุกเรื่องที่คอยบอกคอยเตือนต่างๆ แล้วก็ขอบคุณที่ที่ในสิ่งหนูทำให้พี่โดยที่พี่ไม่ได้ขอเลยยค่ตเจ๋งแจ๋ว และสร้างรอยยิ้มให้กันตลอดเลย รักแฟนม๊ากกกก มีความสุขในทุกๆ วันนะคะคนเก่งของพี่่่ ✨";
let typeTimer = null;

function replayTypewriter() {
  clearInterval(typeTimer);
  const target = document.getElementById('typewriter-text');
  target.innerHTML = '';
  document.getElementById('kiss-stamp').classList.remove('active');

  let i = 0;
  typeTimer = setInterval(() => {
    if (i < fullLetter.length) {
      const char = fullLetter.charAt(i);
      target.innerHTML += char === '\n' ? '<br>' : char;
      i++;
    } else {
      clearInterval(typeTimer);
    }
  }, 45);
}

function applyKissStamp() {
  playKissSound();
  document.getElementById('kiss-stamp').classList.add('active');
  triggerConfetti();
}

// 🎬 CRT Scanlines & Antenna Tune
function toggleScanlines() {
  document.getElementById('scanlines-layer').classList.toggle('active');
}

function tuneAntenna() {
  const wrap = document.getElementById('video-wrapper');
  wrap.style.filter = 'contrast(200%) brightness(150%) hue-rotate(90deg)';
  setTimeout(() => {
    wrap.style.filter = 'none';
    triggerConfetti();
  }, 400);
}

// 🖼️ Polaroid Shake & Stickers (รองรับทั้งรูปภาพและวิดีโอ)
const photoFiles = [
  { src: 'Picture/กินข้าวครั้งแรก.jpg', caption: 'รูปที่ 1: ไปกินข้าวกับแฟนครั้งแรกม เจอกันครั้งแรก' },
  { src: 'Picture/HBD Fan.jpg', caption: 'รูปที่ 2: พอเห็นว่าหนูชอบเค้กและของที่ให้พี่ก็ดีมจมากก💖' },
  { src: 'Picture/ไปเฉียงเหนือเฟสด้วยกันนน.jpg', caption: 'รูปที่ 3: ไปดูคอนเสิร์ตกับหนูค่ตสนุกก' },
  { src: 'Picture/งานโณงแรม.jpg', caption: 'รูปที่ 4: งานวั้นนั้นคุณแต่งตัวสวยม๊ากกก' },
  { src: 'Picture/ไปกินๆฮาจิบัง.webp', caption: 'รูปที่ 5: ไปกินๆแล้วก็กินๆ' },
  { src: 'Picture/ไปกินโบนัสสุกี้ ร่อยม๊ากกกก.jpg', caption: 'รูปที่ 6: วันที่ค่ตหิวข้าวว แต่อร่อยย' },
  { src: 'Picture/ไปหอศิลป์.jpg', caption: 'รูปที่ 7: ไปเที่ยวๆไปดูหอศิลป์ที่หนูเคยบอกว่าอยากไปป 🌸' },
  { src: 'Picture/VID_20251229_081904_419.jpg', caption: 'รูปที่ 8: โมเมนต์น่ารักๆ ของเรา 💕' },
];
const videoFiles = [
  { src: 'Picture/มักคุเทส.mp4', caption: 'วิดีโอที่ 9: หนูเป็นวิทยากรในการพาเข้าชมน๊าาน่ารักมากก 💕' },
  { src: 'Picture/มาบ้านเราครั้งแรก.mp4', caption: 'วิดีโอที่ 10: หนูมาบ้านพี่ครั้งแรกก 🥰' },
];
let photoIndex = 0;
const stickers = ['🎀', '🕶️', '👑', '✨', '💖'];
let stickerIndex = 0;

function getGalleryItems() {
  const photos = Array.isArray(photoFiles) ? photoFiles : [];
  const videos = (typeof videoFiles !== 'undefined' && Array.isArray(videoFiles)) ? videoFiles : [];
  return [...photos, ...videos];
}

function isVideoMedia(item) {
  if (!item || !item.src) return false;
  if (item.type === 'video') return true;
  return /\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(item.src);
}

function nextPhoto() {
  const items = getGalleryItems();
  if (!items.length) return;
  photoIndex = (photoIndex + 1) % items.length;
  updateGallery();
}

function prevPhoto() {
  const items = getGalleryItems();
  if (!items.length) return;
  photoIndex = (photoIndex - 1 + items.length) % items.length;
  updateGallery();
}

function renderGalleryMedia(item) {
  const imgTag = document.getElementById('gallery-img-tag');
  const vidTag = document.getElementById('gallery-video-tag');
  const fallback = document.getElementById('gallery-emoji-fallback');
  const captionEl = document.getElementById('gallery-caption');

  if (fallback) fallback.style.display = 'none';

  if (isVideoMedia(item)) {
    if (imgTag) imgTag.style.display = 'none';
    if (vidTag) {
      vidTag.style.display = 'block';
      if (vidTag.getAttribute('src') !== item.src) {
        vidTag.src = item.src;
      }
      vidTag.currentTime = 0;
      vidTag.play().catch(() => {});
    }
  } else {
    if (vidTag) {
      vidTag.pause();
      vidTag.removeAttribute('src');
      vidTag.load();
      vidTag.style.display = 'none';
    }
    if (imgTag) {
      imgTag.src = item.src;
      imgTag.style.display = 'block';
    }
  }

  if (captionEl) captionEl.textContent = item.caption || '';
}

function renderGalleryImmediate() {
  const items = getGalleryItems();
  if (!items.length) return;
  if (photoIndex >= items.length) photoIndex = 0;

  const counterEl = document.getElementById('gallery-counter');
  if (counterEl) {
    counterEl.textContent = `${photoIndex + 1}/${items.length}`;
  }

  renderGalleryMedia(items[photoIndex]);
}

function updateGallery() {
  const items = getGalleryItems();
  if (!items.length) return;
  if (photoIndex >= items.length) photoIndex = 0;

  const currentItem = items[photoIndex];
  const box = document.getElementById('polaroid-box');
  box.classList.add('developing');
  document.getElementById('photo-sticker').style.display = 'none';

  const counterEl = document.getElementById('gallery-counter');
  if (counterEl) {
    counterEl.textContent = `${photoIndex + 1}/${items.length}`;
  }

  const vidTag = document.getElementById('gallery-video-tag');
  if (vidTag) vidTag.pause();

  setTimeout(() => {
    renderGalleryMedia(currentItem);
    box.classList.remove('developing');
  }, 400);
}

// อัปเดตตัวนับจำนวนรูป+วิดีโอตั้งแต่โหลดหน้าเว็บ
(function initGalleryCounter() {
  const items = getGalleryItems();
  const counterEl = document.getElementById('gallery-counter');
  if (counterEl && items.length) {
    counterEl.textContent = `1/${items.length}`;
  }
})();

function shakePolaroid() {
  const box = document.getElementById('polaroid-box');
  box.classList.add('developing');
  setTimeout(() => box.classList.remove('developing'), 500);
}

function addSticker() {
  const st = document.getElementById('photo-sticker');
  st.textContent = stickers[stickerIndex % stickers.length];
  st.style.display = 'block';
  st.style.top = `${15 + (stickerIndex * 10) % 50}px`;
  st.style.right = `${15 + (stickerIndex * 15) % 60}px`;
  stickerIndex++;
  triggerConfetti();
}

// ==========================================
// 💐 FLOWER BOUQUET (Luxury Florist Edition)
// ==========================================
const bouquetThemes = [
  {
    name: 'ช่อกุหลาบเจ้าหญิงสีชมพู 🌹',
    themeClass: 'theme-rose',
    flowers: ['🌹', '🌸', '🌹', '🌸', '🌹', '🌸', '🌹', '🌸', '🌹'],
    status: '💐 ช่อกุหลาบเจ้าหญิงสีชมพู มอบให้เธอคนเดียวนะ!'
  },
  {
    name: 'ช่อทานตะวันสดใสคลาสสิก 🌻',
    themeClass: 'theme-sunflower',
    flowers: ['🌻', '🌼', '🌻', '🌼', '🌻', '🌼', '🌻', '🌼', '🌻'],
    status: '🌻 ช่อทานตะวันสดใส เธอคือรอยยิ้มและความสว่างสดใสของเค้า!'
  },
  {
    name: 'ช่อทิวลิปเกาหลีพาสเทล 🌷',
    themeClass: 'theme-tulip',
    flowers: ['🌷', '🌸', '🌷', '🌸', '🌷', '🌸', '🌷', '🌸', '🌷'],
    status: '🌷 ช่อทิวลิปพาสเทล สื่อถึงความรักที่จริงใจและอ่อนโยนที่สุด'
  },
  {
    name: 'ช่อโบตั๋นและเดซี่แสนหวาน 🌸',
    themeClass: 'theme-peony',
    flowers: ['🌸', '🌼', '🌺', '🌸', '💐', '🌸', '🌺', '🌼', '🌸'],
    status: '🌸 ช่อโบตั๋นและดอกไม้หวานๆ สำหรับคนเก่งคนพิเศษ!'
  }
];
let bouquetThemeIdx = 0;

const bouquetCards = [
  'ให้คนน่ารักที่สุด 💖',
  'รักแฟนม๊ากกก ✨',
  'อยู่ด้วยกันไปนานๆ นะ 🥰',
  'ขอบคุณที่เป็นรอยยิ้มให้กัน 🌷',
  'ให้คนเก่งของพี่่ 💕'
];
let bouquetCardIdx = 0;

function bloomSingleFlower(flowerEl) {
  playKissSound();
  flowerEl.classList.remove('bloomed');
  void flowerEl.offsetWidth; // trigger reflow for pop animation
  flowerEl.classList.add('bloomed');

  const allFlowers = document.querySelectorAll('#bouquet-stage .bq-flower');
  const bloomedCount = document.querySelectorAll('#bouquet-stage .bq-flower.bloomed').length;
  const statusEl = document.getElementById('bouquet-status');

  if (bloomedCount === allFlowers.length) {
    if (statusEl) statusEl.textContent = '🌸 ดอกไม้บานสะพรั่งครบทุกดอกแล้ว รักหนูนะคะ! ✨';
    triggerConfetti();
  } else {
    if (statusEl) statusEl.textContent = `🌷 ดอกไม้กำลังผลิบาน (${bloomedCount}/${allFlowers.length} ดอก)`;
  }
}

function changeBouquetStyle() {
  bouquetThemeIdx = (bouquetThemeIdx + 1) % bouquetThemes.length;
  const theme = bouquetThemes[bouquetThemeIdx];

  const stage = document.getElementById('bouquet-stage');
  if (stage) {
    stage.className = `bouquet-stage ${theme.themeClass}`;
  }

  const flowerIcons = document.querySelectorAll('#bouquet-stage .bq-flower-icon');
  flowerIcons.forEach((icon, idx) => {
    icon.textContent = theme.flowers[idx % theme.flowers.length];
  });

  const statusEl = document.getElementById('bouquet-status');
  if (statusEl) statusEl.textContent = theme.status;

  playKissSound();
}

function changeBouquetCard() {
  openCardWriter();
}

function bloomAllFlowers() {
  playKissSound();
  const allFlowers = document.querySelectorAll('#bouquet-stage .bq-flower');
  allFlowers.forEach((f, i) => {
    f.classList.remove('bloomed');
    setTimeout(() => {
      f.classList.add('bloomed');
    }, i * 60);
  });

  const statusEl = document.getElementById('bouquet-status');
  if (statusEl) {
    statusEl.textContent = '💐 มอบช่อดอกไม้สุดพิเศษให้เธอ ขอให้มีความสุขและมีรอยยิ้มในทุกๆ วันนะ ✨';
  }
  triggerConfetti();
  spawnBouquetPetals();
}

function spawnBouquetPetals() {
  const petals = ['🌸', '💖', '✨', '🌹', '🌷', '🤍'];
  for (let i = 0; i < 24; i++) {
    const petal = document.createElement('span');
    petal.textContent = petals[Math.floor(Math.random() * petals.length)];
    petal.style.cssText = `
      position: fixed;
      left: ${Math.random() * 85 + 5}vw;
      top: ${Math.random() * 30 + 15}vh;
      font-size: ${Math.random() * 14 + 14}px;
      pointer-events: none;
      z-index: 99999;
      opacity: 1;
      transform: translateY(0) rotate(0deg) scale(0.6);
      transition: all ${Math.random() * 1.4 + 1.2}s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    `;
    document.body.appendChild(petal);
    requestAnimationFrame(() => {
      petal.style.transform = `translateY(${Math.random() * 220 + 160}px) rotate(${Math.random() * 360}deg) scale(1.2)`;
      petal.style.opacity = '0';
    });
    setTimeout(() => petal.remove(), 2500);
  }
}

// 💌 Bouquet Card Writer Modal
function openCardWriter() {
  const modal = document.getElementById('card-writer-modal');
  if (modal) {
    modal.style.display = 'flex';
    const currentText = document.getElementById('bouquet-card-text');
    const input = document.getElementById('custom-card-input');
    if (currentText && input) {
      input.value = currentText.textContent.trim();
    }
  }
  playClickSound();
}

function closeCardWriter() {
  const modal = document.getElementById('card-writer-modal');
  if (modal) modal.style.display = 'none';
  playClickSound();
}

function selectPresetCard(text) {
  const input = document.getElementById('custom-card-input');
  if (input) input.value = text;
  playClickSound();
}

function saveCustomCard() {
  const input = document.getElementById('custom-card-input');
  const cardTextEl = document.getElementById('bouquet-card-text');
  if (input && cardTextEl) {
    const val = input.value.trim();
    if (val) {
      cardTextEl.textContent = val;
    }
  }
  closeCardWriter();
  triggerConfetti();
  playKissSound();
}

// ==========================================
// 🧩 HELP TOPICS (Windows 98 Help System)
// ==========================================
const helpArticles = [
  {
    title: '📖 กฎการดูแลแฟน 5 ข้อ',
    content: `
      <b>กฎเหล็กประจำหัวใจ:</b><br><br>
      1. <b>แฟนถูกเสมอ</b> — แม้จะงอแงก็น่ารักที่สุดในโลกเสมอ 🥰<br>
      2. <b>ห้ามปล่อยให้หิว</b> — เมื่อหิวต้องรีบพาไปกินของอร่อยทันทีไม่มีข้ออ้าง 🍜<br>
      3. <b>กอดและบอกรัก</b> — อย่างน้อยวันละ 3 เวลา หลังตื่นนอนและก่อนนอน 💖<br>
      4. <b>เป็นผู้ฟังที่ดี</b> — รับฟังทุกเรื่องที่หนูเล่า คอยลูบหัวและให้กำลังใจ 🌸<br>
      5. <b>อยู่ข้างๆ ตลอดไป</b> — จะไม่ปล่อยให้หนูรู้สึกเดียวดายแน่นอนค่ะ ✨
    `
  },
  {
    title: '🧁 รวมเมนูของโปรดหนู',
    content: `
      <b>เมนูเพิ่มพลังใจของคนเก่ง:</b><br><br>
      🍲 <b>ชาบู & สุกี้ร้อนๆ:</b> ซดน้ำซุปฟินๆ กินเนื้อนุ่มๆ แบบไม่อั้น<br>
      🧋 <b>ชานมไข่มุก:</b> หวานกำลังดี เคี้ยวไข่มุกหนึบหนับ<br>
      🍜 <b>ราเมนฮาจิบัง:</b> บะหมี่เส้นเหนียวนุ่มของโปรด<br>
      🍰 <b>เค้กและของหวาน:</b> ขนมหวานเพิ่มรอยยิ้มได้เสมออ 💕
    `
  },
  {
    title: '🥺 วิธีง้อเวลาแฟนงอน',
    content: `
      <b>คู่มือฉุกเฉินเมื่อแฟนนิ่งหรือหน้างอ:</b><br><br>
      ขั้นที่ 1: เข้าไปกอดแน่นๆ ทันที ไม่ปล่อยให้คิดมาก 🫂<br>
      ขั้นที่ 2: ขอโทษด้วยความจริงใจ และหอมแก้ม 1 ที 💋<br>
      ขั้นที่ 3: พาไปกินของอร่อยที่ชอบที่สุด 🥞<br>
      ขั้นที่ 4: ยื่น "คูปองตามใจ 1 วัน" ให้ใช้สิทธิ์ได้เลย! 🎟️
    `
  },
  {
    title: '✈️ แพลนเที่ยวของเรา',
    content: `
      <b>หมุดหมายความสุขที่เราจะไปด้วยกัน:</b><br><br>
      🎸 <b>คอนเสิร์ตเฉียงเหนือเฟส:</b> ไปกระโดดร้องเพลงด้วยกันอีกรอบ!<br>
      🎨 <b>หอศิลป์ & นิทรรศการ:</b> เดินจับมือดูงานศิลปะชิลๆ 🖼️<br>
      🌊 <b>ทริปทะเลรับลมหนาว:</b> ถ่ายรูปสวยๆ ให้หนูลงไอจีเยอะๆ<br>
      ☕ <b>ทัวร์คาเฟ่น่ารัก:</b> เช็คอินร้านกาแฟสวยๆ ถ่ายรูปคู่กัน ✨
    `
  },
  {
    title: '💖 ความในใจที่ไม่เคยบอก',
    content: `
      <b>จากใจถึงเธอคนพิเศษ:</b><br><br>
      ขอบคุณที่ก้าวเข้ามาเป็นความสดใสในชีวิตพี่นะ 1 ปี 1 เดือนที่ผ่านมามีความหมายมากๆ<br>
      ทุกครั้งที่เห็นหนูยิ้ม หรือหัวเราะ มันทำให้วันเหนื่อยๆ กลายเป็นวันที่ดีเสมอ<br>
      รักหนูที่สุดเลยนะ อยู่เป็นรอยยิ้มให้กันแบบนี้ไปนานๆ นะคะ 💕
    `
  }
];

function switchHelpTab(tabName) {
  ['contents', 'index', 'find'].forEach(name => {
    const tabBtn = document.getElementById('tab-btn-' + name);
    const panel = document.getElementById('help-panel-' + name);
    if (tabBtn) tabBtn.classList.toggle('active', name === tabName);
    if (panel) panel.style.display = (name === tabName) ? 'block' : 'none';
  });

  if (tabName === 'index') {
    showHelpArticle(0);
  } else if (tabName === 'find') {
    handleHelpSearch('');
  }
  playClickSound();
}

function showHelpArticle(idx) {
  const article = helpArticles[idx];
  if (!article) return;

  document.querySelectorAll('.help-topic-item').forEach((item, i) => {
    item.classList.toggle('active', i === idx);
  });

  const pane = document.getElementById('help-article-pane');
  if (pane) {
    pane.innerHTML = `
      <div style="font-weight:bold; font-size:12px; color:#ff1493; border-bottom:1px dashed #ffaec9; padding-bottom:4px; margin-bottom:8px;">
        ${article.title}
      </div>
      <div style="font-size:10.5px; line-height:1.7; color:#222;">
        ${article.content}
      </div>
    `;
  }
  playClickSound();
}

function handleHelpSearch(query) {
  const resultsContainer = document.getElementById('help-find-results');
  if (!resultsContainer) return;

  const q = (query || '').trim().toLowerCase();
  resultsContainer.innerHTML = '';

  const matched = helpArticles.map((art, idx) => ({ art, idx })).filter(item => {
    if (!q) return true;
    return item.art.title.toLowerCase().includes(q) || item.art.content.toLowerCase().includes(q);
  });

  if (matched.length === 0) {
    resultsContainer.innerHTML = '<div style="color:#777; padding:8px; text-align:center;">ไม่พบบันทึกที่ตรงกัน ลองค้นหาคำอื่นดูนะ 🔍</div>';
    return;
  }

  matched.forEach(({ art, idx }) => {
    const div = document.createElement('div');
    div.className = 'help-find-result-item';
    div.innerHTML = `<b>${art.title}</b>`;
    div.onclick = () => {
      switchHelpTab('index');
      showHelpArticle(idx);
    };
    resultsContainer.appendChild(div);
  });
}

function toggleHelpWidget() {
  const widget = document.getElementById('help-topics-widget');
  if (widget) {
    widget.style.display = (widget.style.display === 'none') ? 'block' : 'none';
    playClickSound();
  }
}

function togglePuzzleHint() {
  const overlay = document.getElementById('puzzle-hint-overlay');
  if (overlay) {
    const isShowing = overlay.style.display !== 'none';
    overlay.style.display = isShowing ? 'none' : 'block';
    playClickSound();
  }
}

function openPrintLoveDialog() {
  const dlg = document.getElementById('print-cert-dialog');
  if (dlg) dlg.style.display = 'flex';
  playClickSound();
}

function closePrintLoveDialog() {
  const dlg = document.getElementById('print-cert-dialog');
  if (dlg) dlg.style.display = 'none';
  playClickSound();
}

function confirmPrintLove() {
  closePrintLoveDialog();
  triggerConfetti();
  playKissSound();
  alert("🖨️ [Windows LoveJet 2026]\\nพิมพ์ใบรับรองแฟนดีเด่นเรียบร้อยแล้ว!\\nความรักนี้มีผลบังคับใช้ตลอดไปไม่มีวันหมดอายุ 💕");
}

// ==========================================
// 🌸 START MENU, CALENDAR & SHUT DOWN
// ==========================================
function toggleStartMenu(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('start-menu-popup');
  const btn = document.getElementById('start-btn');
  if (!menu) return;

  const isShowing = menu.style.display === 'flex';
  menu.style.display = isShowing ? 'none' : 'flex';
  if (btn) btn.classList.toggle('active', !isShowing);
  playClickSound();
}

function closeStartMenu() {
  const menu = document.getElementById('start-menu-popup');
  const btn = document.getElementById('start-btn');
  if (menu) menu.style.display = 'none';
  if (btn) btn.classList.remove('active');
}

// ปิด Start Menu เมื่อคลิกที่อื่นบนหน้าจอ
document.addEventListener('click', (e) => {
  const menu = document.getElementById('start-menu-popup');
  const btn = document.getElementById('start-btn');
  if (menu && menu.style.display === 'flex') {
    if (!menu.contains(e.target) && !btn.contains(e.target)) {
      closeStartMenu();
    }
  }
});

function restoreWidget(widgetId) {
  const el = document.getElementById(widgetId);
  if (el) {
    el.style.display = 'block';
    el.classList.remove('minimized');
    bringToFront(el);
    playClickSound();
  }
}

function toggleCalendarDialog() {
  const dlg = document.getElementById('calendar-popup');
  if (!dlg) return;
  const isShowing = dlg.style.display === 'flex';
  dlg.style.display = isShowing ? 'none' : 'flex';
  if (!isShowing) updateCalendarLive();
  playClickSound();
}

function updateCalendarLive() {
  const clockEl = document.getElementById('cal-live-clock');
  const dateEl = document.getElementById('cal-live-date');
  const now = new Date();
  if (clockEl) {
    clockEl.textContent = now.toLocaleTimeString('en-US');
  }
  if (dateEl) {
    const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    dateEl.textContent = `วัน${thaiDays[now.getDay()]}ที่ ${now.getDate()} ${thaiMonths[now.getMonth()]} ${now.getFullYear() + 543}`;
  }
}
setInterval(() => {
  const dlg = document.getElementById('calendar-popup');
  if (dlg && dlg.style.display === 'flex') {
    updateCalendarLive();
  }
}, 1000);

function openShutDownDialog() {
  const dlg = document.getElementById('shutdown-dialog');
  if (dlg) dlg.style.display = 'flex';
  playAlertSound();
}

function closeShutDownDialog() {
  const dlg = document.getElementById('shutdown-dialog');
  if (dlg) dlg.style.display = 'none';
  playClickSound();
}

function confirmShutDown() {
  closeShutDownDialog();
  const selectedOpt = document.querySelector('input[name="shutdown_opt"]:checked')?.value || 'love';
  
  if (selectedOpt === 'love') {
    triggerConfetti();
    playKissSound();
    alert("💖 สัญญาแล้วนะ! เราจะรักและอยู่เคียงข้างกันตลอดไป รักแฟนที่สุดเลยยย 🥰");
  } else if (selectedOpt === 'kiss') {
    applyKissStamp();
    playKissSound();
    triggerConfetti();
    alert("💋 จุ๊บๆ! ได้รับกอดและหอมแก้ม 1 ทีเรียบร้อยแล้วว ชื่นใจที่สุด 💕");
  } else if (selectedOpt === 'restart') {
    triggerConfetti();
    playClickSound();
    alert("🔄 Restart ระบบหัวใจสำเร็จ... ตอนนี้หัวใจเต้นแรงเพราะคิดถึงเธอ 100% ✨");
  }
}

// เกมตู้คีบตุ๊กตา
const gashaCoupons = [
  "คูปองตามใจ 1 วัน ",
  "คูปองฟรีชานมไข่มุก 1 แก้วเต็มๆ",
  "คูปองชาบูฟรี 1 มื้อ",
  "คูปองพาไปกินของอร่อยมื้อใหญ่ 1 มื้อ",
  "คูปองเลือกสิ่งที่อยากได้ 1 อย่าง",
];

// ---- Claw Machine Game ----
const CLAW_W = 300, CLAW_H = 200;
const FLOOR_Y = 168;          // พื้นตู้
const CHUTE_X = 20;           // ช่องรับของ (ซ้าย)
const CHUTE_W = 40;

// ตุ๊กตาในตู้ (x, y = จุดกลาง, r = รัศมี, color, label, ถูกคีบแล้ว?)
let clawDolls = [];
let clawX = 150;              // ตำแหน่ง X ของแขนคีบ (จุดกลาง)
let clawY = 14;               // Y แขนพักบน (เส้นลวด)
let clawDropY = 14;           // Y ปัจจุบันของปลายแขน
let clawOpen = true;          // เปิด/ปิดแขน
let clawState = 'idle';       // idle | dropping | rising | done
let clawMoveDir = 0;          // -1 ซ้าย, 0 หยุด, 1 ขวา
let clawMoveTimer = null;
let clawHeld = null;          // index ของตุ๊กตาที่คีบได้
let clawAnimId = null;
let clawCtx = null;

const DOLL_COLORS  = ['#ffb3c6','#ffd6a0','#c5b3ff','#b3f0c6','#ffe0a0'];
const DOLL_LABELS  = ['A','B','C','D','E'];

function clawInit() {
  const canvas = document.getElementById('clawCanvas');
  if (!canvas) return;
  clawCtx = canvas.getContext('2d');

  // สร้างตุ๊กตา 5 ตัว เรียงบนพื้น — cy = FLOOR_Y - rh ให้ขอบล่างแตะพื้นพอดี
  // rh = r * 1.3 = 13 * 1.3 = 16.9 ≈ 17
  clawDolls = [
    { x:55,  y:FLOOR_Y-17, r:13, color:'#ffb3c6', label:'A', taken:false },
    { x:100, y:FLOOR_Y-17, r:13, color:'#ffd6a0', label:'B', taken:false },
    { x:150, y:FLOOR_Y-17, r:13, color:'#c5b3ff', label:'C', taken:false },
    { x:200, y:FLOOR_Y-17, r:13, color:'#b3f0c6', label:'D', taken:false },
    { x:245, y:FLOOR_Y-17, r:13, color:'#ffe0a0', label:'E', taken:false },
  ];
  clawX = 150;
  clawDropY = 14;
  clawOpen = true;
  clawState = 'idle';
  clawHeld = null;

  if (clawAnimId) cancelAnimationFrame(clawAnimId);
  clawLoop();
}

function clawLoop() {
  clawDraw();
  clawAnimId = requestAnimationFrame(clawLoop);
}

function clawDraw() {
  const ctx = clawCtx;
  if (!ctx) return;
  ctx.clearRect(0, 0, CLAW_W, CLAW_H);

  // พื้นหลัง
  ctx.fillStyle = '#e8f4ff';
  ctx.fillRect(0, 0, CLAW_W, CLAW_H);

  // กรอบพื้น
  ctx.fillStyle = '#c0e0ff';
  ctx.fillRect(0, FLOOR_Y, CLAW_W, CLAW_H - FLOOR_Y);
  ctx.strokeStyle = '#2a203f';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, FLOOR_Y); ctx.lineTo(CLAW_W, FLOOR_Y); ctx.stroke();

  // ช่องรับของ (ซ้าย)
  ctx.fillStyle = '#ffaec9';
  ctx.fillRect(CHUTE_X, FLOOR_Y, CHUTE_W, CLAW_H - FLOOR_Y);
  ctx.strokeStyle = '#2a203f';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(CHUTE_X, FLOOR_Y, CHUTE_W, CLAW_H - FLOOR_Y);
  ctx.fillStyle = '#2a203f';
  ctx.font = 'bold 8px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('OUT', CHUTE_X + CHUTE_W/2, CLAW_H - 6);

  // รางด้านบน
  ctx.fillStyle = '#ffaec9';
  ctx.fillRect(0, 0, CLAW_W, 8);
  ctx.strokeStyle = '#2a203f';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0, 0, CLAW_W, 8);

  // ตุ๊กตา
  clawDolls.forEach((d, i) => {
    if (d.taken) return;
    const cx = d.x, cy = d.y;
    const rw = d.r * 1.05;   // ครึ่งกว้างไข่
    const rh = d.r * 1.3;    // ครึ่งสูงไข่ (สูงกว่ากว้างนิดนึง = ทรงไข่)

    // เงา
    ctx.fillStyle = 'rgba(0,0,0,0.09)';
    ctx.beginPath();
    ctx.ellipse(cx+2, cy+rh+3, rw*0.85, 4, 0, 0, Math.PI*2);
    ctx.fill();

    // ---- ตัวไข่ ----
    ctx.fillStyle = d.color;
    ctx.strokeStyle = '#2a203f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();

    // ไฮไลต์บนไข่
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(cx - rw*0.25, cy - rh*0.3, rw*0.35, rh*0.22, -0.4, 0, Math.PI*2);
    ctx.fill();

    // ---- หน้าจอ LCD เล็กๆ (ฟีล Tamagotchi) ----
    const scrW = rw * 1.1, scrH = rh * 0.62;
    const scrX = cx - scrW/2, scrY = cy - scrH*0.15;
    // กรอบจอ
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.roundRect(scrX - 1, scrY - 1, scrW + 2, scrH + 2, 5);
    ctx.fill();
    // จอ
    ctx.fillStyle = '#d4f0c0';
    ctx.beginPath();
    ctx.roundRect(scrX, scrY, scrW, scrH, 4);
    ctx.fill();

    // ---- หน้าตาในจอ (pixel-style) ----
    const fx = cx, fy = scrY + scrH * 0.38;
    // ตา (สี่เหลี่ยมจุด pixel)
    ctx.fillStyle = '#2a203f';
    ctx.fillRect(fx - 6, fy - 2, 3, 3);
    ctx.fillRect(fx + 3, fy - 2, 3, 3);
    // แวว
    ctx.fillStyle = '#fff';
    ctx.fillRect(fx - 5, fy - 1, 1, 1);
    ctx.fillRect(fx + 4, fy - 1, 1, 1);
    // ปาก (U shape pixel)
    ctx.fillStyle = '#2a203f';
    ctx.fillRect(fx - 4, fy + 4, 2, 2);
    ctx.fillRect(fx - 2, fy + 6, 2, 2);
    ctx.fillRect(fx,     fy + 7, 2, 2);
    ctx.fillRect(fx + 2, fy + 6, 2, 2);
    ctx.fillRect(fx + 4, fy + 4, 2, 2);
    // แก้มจุดชมพู
    ctx.fillStyle = 'rgba(255,80,120,0.35)';
    ctx.beginPath(); ctx.ellipse(fx-8, fy+3, 3, 2, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(fx+8, fy+3, 3, 2, 0, 0, Math.PI*2); ctx.fill();

    // ---- ปุ่มด้านล่างไข่ (3 ปุ่มจิ๋ว ฟีล Tamagotchi) ----
    const btnY = cy + rh * 0.62;
    [-7, 0, 7].forEach(bx => {
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#2a203f';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx + bx, btnY, 2.5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    });

  });

  // เชือกแขนคีบ (จากรางบน → ปลายแขน)
  const wireX = Math.max(8, Math.min(CLAW_W-8, clawX));
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3,2]);
  ctx.beginPath(); ctx.moveTo(wireX, 4); ctx.lineTo(wireX, clawDropY); ctx.stroke();
  ctx.setLineDash([]);

  // แขนคีบ (วาดก่อน แล้วค่อยวาดไข่ทับ)
  drawClaw(ctx, wireX, clawDropY, clawOpen);

  // ไข่ที่ถูกคีบ — ห้อยใต้ปลายแขน
  if (clawHeld !== null && clawDolls[clawHeld]) {
    const d = clawDolls[clawHeld];
    const rw = d.r * 0.85, rh = d.r * 1.1;
    const cx = wireX, cy = clawDropY + rh + 4;  // ห้อยใต้ปลายแขน
    // ตัวไข่
    ctx.fillStyle = d.color; ctx.strokeStyle = '#2a203f'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    // ไฮไลต์
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.ellipse(cx - rw*0.25, cy - rh*0.3, rw*0.3, rh*0.2, -0.4, 0, Math.PI*2); ctx.fill();
    // จอ LCD
    ctx.fillStyle = '#d4f0c0';
    ctx.beginPath(); ctx.roundRect(cx - rw*0.55, cy - rh*0.1, rw*1.1, rh*0.6, 3); ctx.fill();
    // ตา pixel
    ctx.fillStyle = '#2a203f';
    ctx.fillRect(cx-4, cy+2, 2, 2);
    ctx.fillRect(cx+2, cy+2, 2, 2);
  }
}

function drawClaw(ctx, cx, cy, open) {
  const spread = open ? 14 : 5;
  ctx.strokeStyle = '#2a203f';
  ctx.lineWidth = 2;
  // แขนซ้าย
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.quadraticCurveTo(cx - spread*0.8, cy + 10, cx - spread, cy + 20);
  ctx.stroke();
  // แขนขวา
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.quadraticCurveTo(cx + spread*0.8, cy + 10, cx + spread, cy + 20);
  ctx.stroke();
  // ข้อต่อ
  ctx.fillStyle = '#ffaec9';
  ctx.strokeStyle = '#2a203f';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
}

// ---- controls ----
function clawStartMove(dir) {
  if (clawState !== 'idle') return;
  clawMoveDir = dir;
  clawMoveTimer = setInterval(() => {
    clawX = Math.max(10, Math.min(CLAW_W-10, clawX + dir * 4));
  }, 30);
}

function clawStopMove() {
  clawMoveDir = 0;
  clearInterval(clawMoveTimer);
  clawMoveTimer = null;
}

function clawGrab() {
  if (clawState !== 'idle') return;
  clawState = 'dropping';
  clawOpen = true;
  clawHeld = null;
  document.getElementById('fortune-display').innerHTML = 'กำลังลง...';
  // หยุดเลื่อนซ้าย/ขวาระหว่างคีบ
  clawStopMove();
  document.getElementById('clawBtnLeft').disabled  = true;
  document.getElementById('clawBtnRight').disabled = true;
  document.getElementById('clawBtnGrab').disabled  = true;

  const dropTarget = FLOOR_Y - 20;
  const dropSpeed  = 3;

  function dropStep() {
    if (clawDropY < dropTarget) {
      clawDropY += dropSpeed;
      requestAnimationFrame(dropStep);
    } else {
      // ถึงล่างสุด — ตรวจว่าโดนตุ๊กตาไหม
      clawOpen = false;
      const hit = clawDolls.findIndex(d => !d.taken && Math.abs(d.x - clawX) < d.r + 8);
      // สุ่มว่าคีบได้หรือหลุด (โอกาส ~70% ถ้าตรง ไม่งั้นหลุด)
      if (hit !== -1 && Math.random() < 0.7) {
        clawHeld = hit;
        clawDolls[hit].taken = true;   // หายออกจากพื้นทันที
      }
      setTimeout(riseStep, 200);
    }
  }

  function riseStep() {
    clawState = 'rising';
    const riseInterval = setInterval(() => {
      clawDropY -= dropSpeed;
      if (clawDropY <= 14) {
        clawDropY = 14;
        clearInterval(riseInterval);
        clawOpen = true;

        if (clawHeld !== null) {
          slideToChute();
        } else {
          finishGrab(false);
        }
      }
    }, 16);
  }

  function slideToChute() {
    const targetX = CHUTE_X + CHUTE_W / 2;
    const slideInterval = setInterval(() => {
      const dx = targetX - clawX;
      if (Math.abs(dx) < 4) {
        clawX = targetX;
        clearInterval(slideInterval);
        // หย่อนแขนลงช่อง OUT แล้วค่อยโชว์คูปอง
        const prize = clawHeld;
        dropToChute(prize);
      } else {
        clawX += (dx > 0 ? 3 : -3);
      }
    }, 16);
  }

  function dropToChute(prize) {
    // หย่อนลงช่อง
    const dropInterval = setInterval(() => {
      clawDropY += 4;
      if (clawDropY >= FLOOR_Y - 10) {
        clawDropY = 14;
        clearInterval(dropInterval);
        clawHeld = null;
        clawOpen = true;
        finishGrab(true, prize);
      }
    }, 16);
  }

  requestAnimationFrame(dropStep);
}

function finishGrab(success, prizeIdx) {
  clawState = 'idle';
  clawDropY = 14;
  clawX = 150;
  document.getElementById('clawBtnLeft').disabled  = false;
  document.getElementById('clawBtnRight').disabled = false;
  document.getElementById('clawBtnGrab').disabled  = false;

  if (success && prizeIdx !== undefined) {
    const prizes = [
      "คูปองตามใจ 1 วัน ",
      "คูปองฟรีชานมไข่มุก 1 แก้วเต็มๆ",
      "คูปองชาบูฟรี 1 มื้อ",
      "คูปองพาไปกินของอร่อยมื้อใหญ่ 1 มื้อ",
      "คูปองเลือกสิ่งที่อยากได้ 1 อย่าง",
    ];
    const msg = prizes[prizeIdx % prizes.length];
    document.getElementById('fortune-display').innerHTML =
      `<b style="color:#ff1493;">ได้รับ: ${msg}</b>`;

    // โชว์ popup คูปอง
    const pop = document.createElement('div');
    pop.className = 'error-popup';
    pop.style.setProperty('--ox', '0px');
    pop.style.setProperty('--oy', '0px');
    pop.style.width = '280px';
    pop.innerHTML = `
      <div class="window-header pink" style="cursor:grab;">
        <div>🎉 ได้คูปอง!</div>
        <div class="win-btn-control" onclick="this.closest('.error-popup').remove()">✕</div>
      </div>
      <div class="window-body" style="text-align:center; padding:16px 12px;">
        <div style="font-size:32px; margin-bottom:8px;">🎁</div>
        <div style="font-weight:700; font-size:12px; color:#ff1493; line-height:1.6;">${msg}</div>
      </div>
      <div style="text-align:center; padding:0 12px 12px;">
        <button class="retro-btn" onclick="this.closest('.error-popup').remove(); triggerConfetti();" style="background:#ffaec9; font-weight:bold;">รับคูปอง 💕</button>
      </div>
    `;
    document.body.appendChild(pop);
    makeDraggable(pop);
    triggerConfetti();

    // รีเซ็ตถ้าหมดทุกตัว
    if (clawDolls.every(d => d.taken)) {
      setTimeout(() => {
        document.getElementById('fortune-display').innerHTML = 'คีบหมดแล้ว! รีเซ็ตเกมใหม่';
        clawInit();
      }, 2000);
    }
  } else {
    document.getElementById('fortune-display').innerHTML = 'หลุดแล้ว... ลองใหม่อีกครั้ง!';
  }
}

function addCustomTrash() {
  const input = document.getElementById('custom-trash-input');
  const val = input.value.trim();
  if (!val) return;
  document.getElementById('trash-list').innerHTML += `<br>❌ ${val}.tmp`;
  input.value = '';
  playClickSound();
}

function emptyTrash() {
  document.getElementById('trash-list').innerHTML = '<span style="color:#008800; font-size:11px;">✨ บดทำลายเรื่องแย่ๆ หมดเกลี้ยงแล้ว! ขอให้ปีนี้มีแต่รอยยิ้มน้าา 💕</span>';
  triggerConfetti();
}

function triggerConfetti() {
  confetti({
    particleCount: 70,
    spread: 60,
    origin: { y: 0.6 }
  });
}

document.querySelectorAll('.window.floating').forEach(win => makeDraggable(win));
