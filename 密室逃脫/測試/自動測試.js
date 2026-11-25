// 自動測試：每關、每種難度，照正確步驟從頭玩到逃出；也檢查「條件沒達成時出口不會開」
export async function runAll() {
  const G = window.__game, S = G.S, log = [];
  const close = () => document.querySelectorAll('.modal').forEach((m) => m.classList.remove('show'));
  const type = (s) => { const ks = [...document.querySelectorAll('#pad .keys button')]; for (const c of String(s)) ks.find((b) => b.textContent === c).click(); };
  const act = (era, id) => { if (S.era !== era) G.switchEra(); if (!G.hits().some((h) => h.id === id)) throw new Error(`找不到物件 ${era}:${id}`); G.doAct(S.who, S.era, id); };
  const padOpen = () => document.getElementById('pad').classList.contains('show');
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const bfs = (rocks, from, to) => { const k = (x, y) => x + ',' + y, prev = { [k(...from)]: null }, q = [from]; while (q.length) { const [x, y] = q.shift(); if (x === to[0] && y === to[1]) { const p = []; let c = k(x, y); while (c) { p.unshift(c.split(',').map(Number)); c = prev[c]; } return p; } for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx > 5 || ny > 5 || rocks.includes(k(nx, ny)) || k(nx, ny) in prev) continue; prev[k(nx, ny)] = k(x, y); q.push([nx, ny]); } } };
  const RULE = [(r) => (r + 3) % 10, (r) => (r * 2) % 10, (r) => (10 - r) % 10];
  const STATIONS = 5;
  const solvers = {
    1(f) {
      // 主線前先試出口：應該被擋
      act('1990', 'pot'); act('1990', 'sun');
      act('1990', 'toolbox'); act('1990', 'table'); act('1990', 'table'); act('1990', 'cabinet');
      act('2030', 'cabinet'); type('0817'); act('2030', 'cabinet'); act('2030', 'tree');
      act('2030', 'door'); if (S.done) throw new Error('沒找到回憶就逃出了');
      while (!f.memento) act('2030', 'radio');
      act('2030', 'chain'); type(f.houseNo); close();
      act('2030', 'door');
    },
    2(f) {
      act('2030', 'scab'); close(); act('1990', 'scab'); type('3141');
      act('1990', 'shelf'); act('1990', 'scab'); act('1990', 'desk');
      act('2030', 'scab'); act('2030', 'trap'); if (S.done) throw new Error('沒找到回憶就逃出了');
      act('2030', 'locker'); type(G.ELEMENTS[f.ptCommon][2]); close();
      act('2030', 'trap');
    },
    3(f) {
      act('1990', 'safe'); type('0725'); act('1990', 'safe'); act('1990', 'register'); act('1990', 'shelf');
      act('1990', 'counter'); act('1990', 'counter'); act('1990', 'stash');
      act('1990', 'bucket'); act('1990', 'corner');
      act('1990', 'soda'); type(f.price); act('1990', 'soda'); act('1990', 'brick');
      act('2030', 'stash'); act('2030', 'hole'); if (S.done) throw new Error('沒找到回憶就逃出了');
      act('2030', 'brick'); close(); act('2030', 'hole');
    },
    4(f) {
      while (f.mirror !== 0) act('1990', 'mirror');
      act('1990', 'clock'); type('0415');
      act('2030', 'clock'); act('2030', 'lever');
      act('1990', 'horn'); if (f.horn) throw new Error('沒開燈開窗霧笛就響了');
      act('1990', 'lampSw'); act('1990', 'winSh'); act('1990', 'horn');
      act('2030', 'lever'); act('1990', 'lever'); if (S.done) throw new Error('沒找到回憶就逃出了');
      act('2030', 'gbox'); type(f.blasts); close();
      if (!S.done) act('2030', 'lever'); if (!S.done) act('1990', 'lever');
    },
    5(f) {
      act('1990', 'safe'); type('1968'); act('1990', 'safe'); act('1990', 'dry'); act('1990', 'plug');
      act('2030', 'dry'); close();
      act('1990', 'shutter'); if (f.photo) throw new Error('沒開燈就拍到照片');
      act('1990', 'chair'); act('1990', 'slamp'); act('1990', 'shutter');
      act('2030', 'door'); type('5203'); if (S.done) throw new Error('沒找到回憶就逃出了');
      act('2030', 'album'); close();
      act('2030', 'door'); type('5203');
    },
    6(f) {
      act('1990', 'paint'); act('1990', 'crate' + f.hammerId); act('1990', 'paintSpot');
      act('1990', 'hook'); act('1990', 'cement'); act('1990', 'shelf'); act('1990', 'hoist');
      act('2030', 'crate' + f.order2030.indexOf(f.hammerId)); act('2030', 'cement');
      act('2030', 'hoist'); if (S.done) throw new Error('沒開回憶盒就逃出了');
      // 先故意放錯一次
      act('2030', 'mem1'); const c1 = S.cracks;
      for (let i = 0; i < 5; i++) act('2030', 'mem' + i);
      close(); act('2030', 'hoist');
      if (c1 !== 1) throw new Error('放錯順序沒有算失誤');
    },
    7(f) {
      act('1990', 'bcast'); // 沒電
      for (let i = 0; i < f.order.length; i++) { act('2030', 'fuse' + f.order[i]); act('2030', 'slot' + i); }
      act('1990', 'power');
      for (const i of f.open) act('2030', 'v' + i);
      act('1990', 'pressurize'); act('2030', 'pod'); type(f.seq.map((i) => f.digits[i]).join(''));
      act('1990', 'release'); if (S.done) throw new Error('沒授權就逃出了');
      while (!f.memento) act('1990', 'bcast');
      close(); act('1990', 'authPanel'); type(f.auth);
      act('1990', 'release');
    },
    8(f) {
      let sol = null; for (let m = 0; m < 32 && sol === null; m++) { const fl = [...f.flood]; for (let i = 0; i < 5; i++) if (m >> i & 1) f.matrix[i].forEach((c) => (fl[c] = !fl[c])); if (fl.every((x) => !x)) sol = m; }
      for (let i = 0; i < 5; i++) if (sol >> i & 1) act('2030', 'p' + i);
      act('2030', 'door'); type(f.seq.map((c) => f.chart[c]).join('')); if (S.done) throw new Error('沒輸入身分就逃出了');
      act('2030', 'idlock'); type(f.staff[f.culprit][1]); close();
      act('2030', 'door'); type(f.seq.map((c) => f.chart[c]).join(''));
    },
    9(f) {
      // 先收信號：關引擎、調深度、控制室接收，再開引擎
      act('2030', 'engineSw'); while (f.depth !== f.need) act('2030', 'depthDial');
      act('1990', 'signalRx'); close(); act('2030', 'engineSw');
      let guard = 0;
      while (!S.done && guard++ < 80) {
        const p = bfs(f.rocks, f.sub, f.exit), [nx, ny] = p[1];
        const d = DIRS.findIndex(([dx, dy]) => dx === nx - f.sub[0] && dy === ny - f.sub[1]);
        if (f.absolute) { act('2030', 'go' + d); continue; }
        while (f.heading !== d) act('2030', ((d - f.heading + 4) % 4) === 3 ? 'left' : 'right');
        act('2030', 'fwd');
      }
    },
    10(f) {
      for (let i = 0; i < 3; i++) { const t = (RULE[f.colors[i]](f.reads[i]) + (f.lamps[i] ? 1 : 0)) % 10; while (f.dials[i] !== t) act('2030', 'rod' + i); }
      act('1990', 'inject');
      act('1990', 'vent'); act('2030', 'vent2'); if (S.done) throw new Error('沒封黑盒子就逃出了');
      for (let i = 0; i < 3; i++) act('1990', 'ev' + i);
      close(); if (!S.done) act('1990', 'vent'); if (!S.done) act('2030', 'vent2');
    },
  };
  for (let n = 1; n <= 10; n++) for (const d of ['easy', 'normal', 'hard']) {
    try {
      close(); S.diff = d; G.startSolo(n);
      const storyShown = document.getElementById('story').classList.contains('show'); close();
      const hint0 = G.LEVELS[n].hint();
      solvers[n](S.f);
      const ok = S.done && document.getElementById('resultTitle').textContent === '逃出成功！';
      log.push(`${ok ? '✅' : '❌'} 第${n}關 ${d}${storyShown ? '' : '（沒有劇情畫面）'}${ok ? '' : '：沒有逃出'}${hint0 ? '' : '（沒有提示）'}`);
    } catch (e) { log.push(`❌ 第${n}關 ${d}：${e.message}`); }
  }
  close();
  return log.join('\n');
}
