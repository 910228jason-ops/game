# 《隔代房間》AI 交接文件

> 最後更新：2026-11-18（v0.9，兩章十關，每關 3～5 謎題＋劇情）。接手的 AI 請先讀完這份，再讀 `設計/關卡設計.md`。
> 跟使用者溝通一律用**繁體中文**。

## 1. 這是什麼

> **v0.7 起改成章節制**：使用者希望每關有不同的解謎、不限於「兩個年代」。同一章共用主題，下一章換完全不同的密室（見 `設計/關卡設計.md` 的章節規劃）。第一章是下面描述的隔代房間；第二章「深海研究站」是控制室 × 機房。

一個 **3D 合作密室逃脫**（Discord 派對遊戲）。玩家分成 **1990 組** 和 **2030 組**，在同一個房間的兩個年代。
1990 做的事會留到 2030（搬東西、密封保存、種樹、漏水爛地板…），兩邊靠 Discord 語音溝通，一起打開 2030 的出口。
這是**原創**遊戲。使用者曾想「盡量做得跟《我帶過的最差一屆》一樣」，已婉拒：**不要復刻任何現有遊戲的名稱、角色、美術、關卡**。

## 2. 檔案

| 路徑 | 說明 |
|---|---|
| `隔代房間.html` | 遊戲本體。**單一 HTML 檔**，雙擊就能玩（要網路載入 Three.js） |
| `設計/關卡設計.md` | 每關的謎題鏈、時間規則工具箱、提示與難度規則 |
| `設計/企劃_隔代房間與耳語群島.md` | 原始企劃（含第二個遊戲點子《耳語群島》，尚未開始） |
| `設計/設計稿/*.dc.html`、`canvas.json` | Design 設計稿原始檔（主畫面、2030 視角、大廳、角色、手機橫式）。線上版：https://claude.ai/artifact/8Cm6Yfiq798aG8qUgtzJAf （需要 Design 的 support.js 才能在本機顯示） |
| `../其他原型/` | 最早的 2D 原型《自習室抓鬼》和第一份可行性評估，已不再開發 |

## 3. 程式架構（`隔代房間.html`）

- **Three.js 0.160.0**，用 importmap 從 jsdelivr 載入；低多邊形、`flatShading`。幾何用 `box() / cyl() / cone() / group()` 小工具。
- **遊戲狀態 `S`**：`level, levelNo, era, who, held{玩家id: 物品}, f{關卡旗標}, cracks, done, mode('menu'|'solo'|'net'|'lobby'), diff, hintsLeft`。
  - 單機時玩家 id 就是年代字串（`'1990'`/`'2030'`），所以兩個年代各拿各的東西。
- **關卡物件** `LEVEL1..LEVEL10`，`LEVELS = {1..10}`。第二章共用設定在 `CH2`，共用小工具 `ctrlScreen / ctrlDesk / deskButton / bothPress`。**兩邊的 id 永遠是 `'1990'`／`'2030'`**（沿用大廳分組），但關卡可以用選填欄位改名字和規則：`sides: { 1990: ['控制室','指揮','#色'], 2030: [...] }`（HUD 名稱）、`pal: { 1990: 'ctrl', 2030: 'eng' }`（房間配色，見 `PAL`）、`crackName: '警報'`（取代「時間裂痕」）、`noGhost: true`（兩邊是不同房間時不顯示對方殘影）。`LEVEL_INFO` 用 `ch` 欄位開新章節標題、`stars`（1～5）標難度。**每章第一關都開放、章內依序解鎖**（`chapterStart()`／`unlocked()`）。第六關的木箱順序在 `init()` 隨機產生，存在 `S.f`，多人時由房主決定再廣播。每關有：
  - `name`、`init()`（重設 `S.f`）、`reset(item)`（丟進垃圾桶時「時間修正」放回原位）、`goal(era)`（右上線索 HTML）、`build(era)`（蓋場景）、`hint()`（依 `S.f` 進度回傳下一步提示）。
  - `build(era)` 裡用 `add(obj, { id, solid, label: () => 文字, act: () => {...} })` 註冊可互動物件。`solid` 是碰撞方塊 `{x,z,hw,hd}`。
  - 房間 8×6×2.8，玩家出生點約 `(0, 2.3)` 面向 -z。窗戶用 `buildRoom(era, { window: z })`。
- **動作執行（房主權威）**：`doAct(who, era, id)` 用 `withCtx` + `buildFor(era)` 在背景建出那個年代的物件，執行 `act()`，然後 `afterAction()` 重建畫面並廣播狀態。`msg / note / pad` 會自動送給「做動作的那個人」。
  - 密碼鎖：`pad(title, hint, code, onOk, bad)`，`code` 可以是字串或檢查函式（時鐘用）。
  - `finish(win, text)` 結束並記錄成績。`crack(text)` 加時間裂痕，上限看難度。
- **連線 `Net`（不用伺服器）**：WebRTC + Google STUN。SDP 用 deflate-raw + base64 壓成 `KD1.` 開頭的邀請碼／回覆碼，玩家用 Discord 互貼。星狀：隊員只連房主，房主轉發。
  - 隊員→房主：`hello{name,era,look}`、`era`（只在大廳有效）、`look`、`act{id}`、`padTry{val}`、`hint`、`pos`。
  - 房主→隊員：`lobby`、`start{level,diff,players,state}`、`state`、`toast`、`note`、`pad`、`padResult{ok,bad}`、`finish{win,text,sec}`、`pos`。
  - 位置同步用 `setInterval` 100ms（分頁在背景時 rAF 會停）。斷線時手上物品交給同年代隊友，沒人接就 `reset`。
  - 之後要放進 Discord 活動時，只要換掉 `Net` 這一塊。
- **難度 `DIFF`（v0.8 改）**：三種難度都是提示 3、失誤上限 3、同時按 3 秒（單機 +5 秒）。**難度＝解謎深度**：每關在 `init()` 依 `S.diff` 改變謎題（例：第七關困難用代號＋奇偶規則、第八關困難把接線表移到機房、第九關簡單改成直接選方位、第十關困難加警示燈）。困難的第一章線索欄只剩一句（`brief`）。新關卡請照這個原則設計三種深度。
- **v0.9 擴充層 `ext(LEVEL, {...})`**（在 `const LEVELS` 前面）：不改原本關卡，外面包一層——`init`（多的旗標）、`build`（多的物件）、`reset`、`hint`（主線做完 `mainDone(f)` 後才提示新謎題；`hintFirst` 反過來）、`gate(f)`（出口條件）、`gateMsg`、`story: {intro, outro}`、`memento`（回憶物件名稱）。`finish(true)` 時 gate 沒過只會跳 `gateMsg`，不會結束；有 outro 會接在結果畫面。開局會跳出 `#story` 劇情畫面。`memo(f, 標題, 內文)` 設定找到回憶物件。`pad()` 的位數跟著密碼字串長度（1～6 位）。
- **倒數**：關卡加 `timer: 秒數` 和 `timeoutText`，`setInterval` 會在 HUD 顯示 ⏱，時間到由房主（或單機）判定失敗。
- **配色／畫風**：`PAL` 裡有各關配色（可含 `fog: [顏色, near, far]`、`win` 窗色）；關卡用 `pal: {1990: 'xxx', 2030: 'yyy'}` 指定。`style: 'toon' | 'neon' | 'flat'`（或分兩邊的物件）：toon 用 `MeshToonMaterial`，neon 會在 `add()` 的物件加發光邊線。`mat()` 的快取鍵包含畫風。
- **章節進度**：`localStorage['kdroom.progress']`，過前一關才解鎖；有「全部解鎖（試玩用）」。
- **捏角色**：`localStorage['kdroom.look']`，`LOOK_OPTS`（衣服、膚色、髮型、髮色、褲子、配件）。`makeAvatar(look, name)` 做角色；不同年代的隊友用 `ghostify` 變半透明「時間殘影」。單機時看得到另一個年代的自己。
- **手機觸控模式**：`detectTouch()` 自動判斷（`pointer: coarse` 或觸控小螢幕），網址加 `?touch=1`／`?touch=0` 可以強制，主選單「操作」按鈕手動切換並存在 `localStorage['kdroom.touch']`。`body.touch` 時隱藏鍵盤說明、線索欄收進「📜 線索」按鈕；左 45% 畫面是浮動搖桿（`joy.f / joy.s` 併入移動），其餘滑動轉頭，`#tAct` 互動、`#tEra` 單機換年代。直拿時顯示「請轉成橫的」。
- **除錯接口**：`window.__game`（`S, ME, Net, pos, startSolo, switchEra, doAct, askHint, LEVELS, updateAvatars, makeAvatar…`），測試時用。

## 4. 新增一關的步驟

1. 在 `設計/關卡設計.md` 先寫謎題鏈：**每一步都要兩個年代合作**，重點謎題要靠「1990 動東西 → 2030 世界改變」，不能只靠語音報密碼（語音一說就解了）。資訊題要拆成兩半（像第三關的發票＋海報）。
2. 寫 `LEVELn = { name, init, reset, goal, build, hint }`，加到 `LEVELS`、`LEVEL_INFO`、`ITEM_NAMES`（新物品名稱）。
3. 用下面的測試方法從頭玩到逃出，再測失敗路線（沒密封、丟垃圾桶）。
4. 更新 `README.md` 的關卡表與版本、`設計/關卡設計.md`。

## 5. 測試方法

- **自動測試**：把 `測試/自動測試.js` 跟遊戲放在同一個本機伺服器資料夾，打開遊戲後在 console 執行 `(await import('/自動測試.js')).runAll()`（檔名可改成英文），會把 10 關 × 3 難度從頭玩到逃出，也檢查「條件沒達成時出口不會開」。**新增或修改關卡時，要一起更新裡面的解法。**
- **多人**：兩個分頁同一個網址，同源可以用 `localStorage` 互傳邀請碼／回覆碼；`window.__game.netAct(id)` 會照身分（房主或隊員）送出動作。v0.9 已實測第一關、第七關。

- 本機開靜態伺服器（例：`python -m http.server 8765`），用瀏覽器開，**不要用 file://**（部分工具不能操作）。
- 用 `window.__game` 直接驅動：`startSolo(n)`、`doAct(S.who, S.era, '物件id')`、`switchEra()`；密碼鎖可以點 `#pad .keys button`。
- 多人：開兩個分頁，一個開房、一個加入，互貼邀請碼／回覆碼。**目前只在同一台電腦兩個分頁測過**，還沒用兩台電腦、不同網路實測。

## 6. 使用者的偏好與限制（重要）

- 回覆用繁體中文；講結論、講白話，不要丟一堆術語。
- **不要用 VM、雲端主機或自架伺服器**跑遊戲；多人連線維持「複製貼上連線碼」。
- UI 大改前先給設計稿（用 Design）。
- 不要控制使用者的電腦；瀏覽器只用 Claude 內建的瀏覽器。
- 公開的地方不放密碼、金鑰、個人資料。這個 repo **已公開**，並開了 GitHub Pages：https://910228jason-ops.github.io/game/ （根目錄 `index.html` 會跳到遊戲）。
- GitHub 為主、Google 雲端硬碟「Discord派對遊戲」資料夾當備份（給朋友下載用）。

## 7. 上傳方式（重要）

使用者電腦上的 git **一直無法登入 GitHub**（Git Credential Manager 視窗會被取消）。目前都是用**內建瀏覽器（已登入 GitHub）走網站上傳**：

1. 把檔案 gzip + base64 成 `{ "相對路徑": b64 }`，寫進本機伺服器上的一個小頁面：`window.name = JSON.stringify({kd: 資料}); location.href = "https://github.com/910228jason-ops/game/upload/main";`（window.name 跨網站跳轉後還在）。
2. 在 GitHub 上傳頁執行 JS：解壓成 `File`；**沒有資料夾的檔案**直接 `document.querySelector('file-attachment').attach([File...])`；**有資料夾的**做假的 FileSystem entry（`isFile/isDirectory/name/fullPath/file(cb)/createReader().readEntries(cb)`，readEntries 要先設 done 再用 setTimeout 回呼，否則無限遞迴），塞進真的 `DataTransfer`（用 `Object.defineProperty` 蓋掉 `items` 和 `types:['Files']`），再 `attach(dt)`。
3. 等「Uploading N of N」完成，在 `input[name=message]` 打 commit 訊息按 Enter。
4. 用 `https://github.com/910228jason-ops/game/raw/main/<路徑>` 抓回來比對大小。

## 8. 待辦（使用者還沒選優先順序）

- [ ] 用兩台電腦、不同網路實測多人（捏角色同步、隊員按提示、斷線交物品都還沒實測）
- [x] 手機觸控操作（v0.6，只用模擬觸控測過，**還沒在真的手機上測**）
- [x] 手機網址：GitHub Pages https://910228jason-ops.github.io/game/
- [x] 第二章八～十關
- [ ] 第一章的「三種深度」目前只差在線索欄，之後可以像第二章一樣讓謎題本身變化
- [ ] 第三章以後（構想：鏡中宅邸、夜班博物館、夜行列車），見 `設計/關卡設計.md`
- [ ] 放進 Discord 活動（Activity）：需要靜態網頁（GitHub Pages，要公開 repo）＋一個換 token 的端點（例如 Cloudflare Workers）。動之前要先問使用者
- [ ] 第二個遊戲《耳語群島》（謊言傳染），企劃在 `設計/企劃_隔代房間與耳語群島.md`

## 9. 已知問題／沒驗證的

- 3D 角色的實際外觀只用程式量過尺寸，沒截圖確認過好不好看。
- 公司、學校網路或手機熱點可能擋 WebRTC 直連，會一直卡在「等對方連上」。
- 2030 拿到東西後，1990 再改過去（例如把膠囊拿走），2030 手上的東西不會消失（時間悖論，目前接受）。
