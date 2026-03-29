// game-data.js (Assume it is loaded)
let stateHistory = [];

function saveState() {
  stateHistory.push(JSON.parse(JSON.stringify(state)));
  updateBackButton();
}

function restoreState() {
  if (stateHistory.length > 0) {
    state = stateHistory.pop();
    updateBackButton();
    render();
  }
}

function updateBackButton() {
  let btn = document.getElementById('global-back-btn');
  if (!btn) {
    btn = document.createElement('div');
    btn.id = 'global-back-btn';
    btn.className = 'btn';
    btn.style.cssText = 'position:fixed; top:20px; left:20px; z-index:9999; display:none; padding:10px 20px; background:rgba(0,0,0,0.7); font-size:1rem; border:1px solid var(--border-color); color: var(--highlight-color); pointer-events:auto;';
    btn.innerHTML = '← 이전 단계로';
    btn.addEventListener('click', restoreState);
    document.body.appendChild(btn);
  }

  if (stateHistory.length > 0 && state.phase !== 'lobby') {
    btn.style.display = 'block';
  } else {
    btn.style.display = 'none';
    if (state.phase === 'lobby') stateHistory = []; // 안전을 위해 초기화
  }
}

let state = {
  phase: 'lobby',
  round: 1, // 1, 2, 3, 4(Final)
  lives: 3,
  deck: { adjectives: [], nouns: [] }, // Remaining items to draw
  cards: { killer: [], motive: [], weapon: [] },
  answers: { killer: null, motive: null, weapon: null },
  hints: { killer: [], motive: [], weapon: [] },
  wordHand: { adjectives: [], nouns: [] },
  selectedWord: null,
  detectiveSelectedCards: [], // array of {cat, idx}
  isGameWon: false,
  loseReason: ''
};

const appContainer = document.getElementById('view-container');

function render() {
  updateBackButton();
  appContainer.innerHTML = '';
  if (state.phase === 'lobby') appContainer.appendChild(createLobbyView());
  else if (state.phase === 'handover_novelist') appContainer.appendChild(createHandoverView("소설가", "정답 및 힌트 작성하기", () => initNovelistPhase()));
  else if (state.phase === 'novelist') appContainer.appendChild(createNovelistView());
  else if (state.phase === 'handover_detective') appContainer.appendChild(createHandoverView("탐정", "추리 시작", () => { state.phase = 'detective'; state.detectiveSelectedCards = []; render(); }));
  else if (state.phase === 'detective') appContainer.appendChild(createDetectiveView());
  else if (state.phase === 'result') appContainer.appendChild(createResultView());
}

function startGame() {
  state.round = 1;
  state.lives = 3;
  state.cards.killer = shuffle([...GameData.killers]).slice(0, 9).map(c => ({name: c.name, file: c.file, type: 'killer', excluded: false}));
  state.cards.motive = shuffle([...GameData.motives]).slice(0, 9).map(c => ({name: c.name, file: c.file, type: 'motive', excluded: false}));
  state.cards.weapon = shuffle([...GameData.weapons]).slice(0, 9).map(c => ({name: c.name, file: c.file, type: 'weapon', excluded: false}));

  state.answers.killer = state.cards.killer[Math.floor(Math.random() * 9)];
  state.answers.motive = state.cards.motive[Math.floor(Math.random() * 9)];
  state.answers.weapon = state.cards.weapon[Math.floor(Math.random() * 9)];

  state.deck.adjectives = shuffle([...GameData.adjectives]);
  state.deck.nouns = shuffle([...GameData.nouns]);

  // Initial draw: 6 each
  state.wordHand.adjectives = state.deck.adjectives.splice(0, 6);
  state.wordHand.nouns = state.deck.nouns.splice(0, 6);
  
  state.hints = { killer: [], motive: [], weapon: [] };

  state.phase = 'handover_novelist';
  render();
}

function createLobbyView() {
  const div = document.createElement('div');
  div.className = 'view active lobby-view';
  div.style.alignItems = 'center';
  div.style.justifyContent = 'center';
  div.innerHTML = `
    <h1 class="title">다잉메시지</h1>
    <p class="subtitle">모든 것을 알고 있는 자는 말이 없다.</p>
    <button class="btn btn-primary" id="btn-start">게임 시작</button>
  `;
  div.querySelector('#btn-start').addEventListener('click', () => {
    saveState();
    startGame();
  });
  return div;
}

function createHandoverView(targetRole, btnText, onNext) {
  const div = document.createElement('div');
  div.className = 'view active glass-panel';
  div.style.alignItems = 'center'; div.style.justifyContent = 'center';
  div.style.margin = 'auto auto'; div.style.maxWidth = '600px'; div.style.minHeight = '300px';
  div.style.padding = '4rem 2rem';
  
  div.innerHTML = `
    <h2 class="font-title" style="font-size: 2.5rem; margin-bottom: 1rem; color: var(--highlight-color);">디바이스 전달</h2>
    <p style="font-size: 1.2rem; margin-bottom: 2rem; text-align: center;">기기를 <strong>${targetRole}</strong>에게 넘겨주세요.<br>다른 사람은 절대 화면을 보지 않도록 주의하세요!</p>
    <button class="btn btn-primary" id="btn-next">${btnText}</button>
  `;
  div.querySelector('#btn-next').addEventListener('click', () => {
    saveState();
    onNext();
  });
  return div;
}

function initNovelistPhase() {
  if (state.round > 1 && state.round <= 3) {
    state.wordHand.adjectives.push(state.deck.adjectives.pop());
    state.wordHand.nouns.push(state.deck.nouns.pop());
  }
  state.phase = 'novelist';
  state.selectedWord = null;
  render();
}

function createNovelistView() {
  const div = document.createElement('div');
  div.className = 'view active';
  div.style.maxWidth = '1200px';
  div.style.margin = '0 auto';
  
  let rText = state.round === 4 ? "최종" : state.round;
  let ruleText = "";
  if (state.round === 1) ruleText = "각 항목에 명사 1개, 형용사 1개 총 2개씩 힌트를 채워주세요.";
  if (state.round === 2) ruleText = "각 항목에 타일을 딱 1개씩(종류 무관) 추가해주세요.";
  if (state.round === 3) ruleText = "각 항목에 타일을 딱 1개씩 추가하여, [형용사2+명사2] 세트가 맞도록 해주세요.";

  let html = `
    <div class="top-bar" style="margin-bottom: 2rem; align-items:flex-end;">
      <div style="display:flex; flex-direction:column; gap:0.5rem;">
        <div class="turn-indicator" style="font-size:2rem; font-weight:bold; color:var(--highlight-color); text-shadow:none;">소설가의 턴 [${rText}라운드]</div>
        <div class="instruction-text" style="text-align:left; color:#ccc; font-size:1.1rem; margin-bottom:0;">${ruleText}</div>
      </div>
      <button class="btn btn-primary" id="btn-submit-hint" style="font-size:1.1rem; padding: 12px 30px;">힌트 제출 완료</button>
    </div>
    
    <div class="novelist-main-area">
      <!-- 왼쪽 패널 (정답 및 힌트 슬롯) -->
      <div class="glass-panel" style="flex: 1.8; padding: 1.5rem; display:flex; flex-direction:column; gap: 1rem; overflow-y:auto;">
        <h3 style="color: #fff; margin-bottom: 0.5rem; font-size: 1.3rem;">사건의 진상</h3>
        
        ${['killer', 'motive', 'weapon'].map(cat => {
          let catLabel = cat === 'killer' ? '범인' : cat === 'motive' ? '동기' : '흉기';
          let ansNode = state.answers[cat];
          return `
          <div style="display: flex; align-items: center; gap: 1.5rem; background: rgba(0,0,0,0.3); padding: 1.2rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
            <!-- 정답 이미지 영역 -->
            <div style="text-align: center; width: 100px; flex-shrink: 0;">
              <div style="font-size: 1.1rem; font-weight: bold; color: var(--highlight-color); margin-bottom: 5px;">[${catLabel}]</div>
              <img src="${ansNode.file}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; margin-bottom: 5px; border: 2px solid #555;">
              <div style="font-size: 1rem; font-weight: bold; color: #ddd; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${ansNode.name}">${ansNode.name}</div>
            </div>
            
            <!-- 힌트 슬롯 영역 -->
            <div style="flex: 1; display:flex; flex-direction:column; gap:0.5rem;">
              <div class="hint-slot" data-target="${cat}" style="width: 100%; min-height: 90px; background: rgba(0,0,0,0.5); border: 1px dashed #666; justify-content:flex-start;">
                ${state.hints[cat].length === 0 ? '<span style="color: #666;">단어를 클릭 후 이곳을 눌러 추가하세요</span>' : 
                  state.hints[cat].map((w,i) => `<div class="word-tile ${w.type}" data-cat="${cat}" data-idx="${i}">${w.text}</div>`).join('')}
              </div>
            </div>
            
            <!-- 취소 버튼 -->
            <button class="btn btn-danger" data-undo="${cat}" style="padding: 10px 15px; font-size: 0.9rem; flex-shrink: 0; align-self: center; background:transparent;">단어 취소</button>
          </div>
          `;
        }).join('')}
      </div>

      <!-- 오른쪽 패널 (보유 단어) -->
      <div class="glass-panel" style="flex: 1; padding: 1.5rem; display:flex; flex-direction:column; overflow-y:auto;">
        <h3 style="color: #fff; margin-bottom: 1.5rem; font-size: 1.3rem; text-align:center;">보유한 단어</h3>
        
        <div style="font-size: 1rem; color: #aaa; margin-bottom: 0.5rem; border-bottom:1px solid #444; padding-bottom:0.5rem;">형용사</div>
        <div class="word-pool" id="adj-pool" style="justify-content: flex-start; margin-bottom: 2rem;">
          ${state.wordHand.adjectives.map(w => {
            let used = Object.values(state.hints).flat().find(h => h.text === w);
            return `<div class="word-tile adjective ${used ? 'selected' : ''}" data-word="${w}" data-type="adjective" draggable="${!used}">${w}</div>`;
          }).join('')}
        </div>
        
        <div style="font-size: 1rem; color: #aaa; margin-bottom: 0.5rem; border-bottom:1px solid #444; padding-bottom:0.5rem;">명사</div>
        <div class="word-pool" id="noun-pool" style="justify-content: flex-start;">
          ${state.wordHand.nouns.map(w => {
            let used = Object.values(state.hints).flat().find(h => h.text === w);
            return `<div class="word-tile noun ${used ? 'selected' : ''}" data-word="${w}" data-type="noun" draggable="${!used}">${w}</div>`;
          }).join('')}
        </div>
      </div>
    </div>
  `;
  div.innerHTML = html;

  const updateNovelistUI = () => {
    div.querySelectorAll('.word-pool .word-tile').forEach(tile => {
      let w = tile.dataset.word;
      let used = Object.values(state.hints).flat().find(h => h.text === w);
      if (used) {
        tile.classList.add('selected');
        tile.setAttribute('draggable', 'false');
      } else {
        tile.classList.remove('selected');
        tile.setAttribute('draggable', 'true');
      }
      tile.style.boxShadow = '';
    });

    ['killer', 'motive', 'weapon'].forEach(cat => {
      let slot = div.querySelector(`.hint-slot[data-target="${cat}"]`);
      if (state.hints[cat].length === 0) {
        slot.innerHTML = '<span style="color: #666;">단어를 드래그하거나 클릭 후 이곳을 눌러 추가하세요</span>';
      } else {
        slot.innerHTML = state.hints[cat].map((w,i) => `<div class="word-tile ${w.type}" data-cat="${cat}" data-idx="${i}">${w.text}</div>`).join('');
      }
    });
  };

  const wordTiles = div.querySelectorAll('.word-pool .word-tile');
  wordTiles.forEach(tile => {
    tile.addEventListener('dragstart', (e) => {
      if (tile.classList.contains('selected')) {
         e.preventDefault();
         return;
      }
      e.dataTransfer.setData('text/plain', JSON.stringify({text: tile.dataset.word, type: tile.dataset.type}));
      e.dataTransfer.effectAllowed = 'copy';
      state.selectedWord = null; 
      div.querySelectorAll('.word-pool .word-tile').forEach(t => t.style.boxShadow = '');
    });

    tile.addEventListener('click', (e) => {
      if (tile.classList.contains('selected')) return;
      div.querySelectorAll('.word-pool .word-tile').forEach(t => t.style.boxShadow = '');
      e.target.style.boxShadow = '0 0 15px var(--highlight-color)';
      state.selectedWord = { text: e.target.dataset.word, type: e.target.dataset.type };
    });
  });

  const slots = div.querySelectorAll('.hint-slot');
  slots.forEach(slot => {
    slot.addEventListener('dragover', (e) => {
      e.preventDefault(); 
      e.dataTransfer.dropEffect = 'copy';
    });

    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      const rawData = e.dataTransfer.getData('text/plain');
      if (!rawData) return;
      try {
        const droppedWord = JSON.parse(rawData);
        const cat = slot.dataset.target;
        let targetLen = state.round === 1 ? 2 : (state.round === 2 ? 3 : 4);
        if (state.hints[cat].length >= targetLen) {
          alert(`${state.round}라운드에는 한 항목당 최대 ${targetLen}개의 단어만 조합할 수 있습니다.`);
          return;
        }
        state.hints[cat].push(droppedWord);
        updateNovelistUI(); 
      } catch(err) {
        console.error('Invalid drop', err);
      }
    });

    slot.addEventListener('click', (e) => {
      if (!state.selectedWord) return;
      const cat = slot.dataset.target;
      let targetLen = state.round === 1 ? 2 : (state.round === 2 ? 3 : 4);
      if (state.hints[cat].length >= targetLen) {
        alert(`${state.round}라운드에는 한 항목당 최대 ${targetLen}개의 단어만 조합할 수 있습니다.`);
        return;
      }
      state.hints[cat].push(state.selectedWord);
      state.selectedWord = null;
      updateNovelistUI(); 
    });
  });

  const undoBtns = div.querySelectorAll('[data-undo]');
  undoBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cat = e.target.dataset.undo;
      let baseline = state.round === 1 ? 0 : (state.round === 2 ? 2 : 3);
      if (state.hints[cat].length > baseline) {
        state.hints[cat].pop();
        updateNovelistUI();
      } else {
        alert("이전 라운드에서 제출한 힌트는 취소할 수 없습니다.");
      }
    });
  });

  div.querySelector('#btn-submit-hint').addEventListener('click', () => {
    let isValid = true;
    let errM = "";
    
    for (let cat of ['killer', 'motive', 'weapon']) {
      let arr = state.hints[cat];
      if (state.round === 1) {
        if (arr.length !== 2 || arr.filter(h=>h.type==='adjective').length !== 1 || arr.filter(h=>h.type==='noun').length !== 1) {
          isValid = false; errM = "1라운드: 각 항목에 명사 1개, 형용사 1개씩이 필수입니다."; break;
        }
      } else if (state.round === 2) {
        if (arr.length !== 3) {
           isValid = false; errM = "2라운드: 각 항목에 타일을 1개씩 추가해야 합니다."; break;
        }
      } else if (state.round === 3) {
        if (arr.length !== 4) {
           isValid = false; errM = "3라운드: 각 항목에 타일을 1개씩 추가해야 합니다."; break;
        }
        if (arr.filter(h=>h.type==='adjective').length !== 2 || arr.filter(h=>h.type==='noun').length !== 2) {
           isValid = false; errM = "3라운드: 형용사 2개, 명사 2개로 짝을 맞춰야 합니다. (2라운드와 반대되는 타일 필요)"; break;
        }
      }
    }

    if (!isValid) {
      alert(errM);
      return;
    }
    saveState();
    state.phase = 'handover_detective';
    render();
  });

  return div;
}

function getHeartsHtml() {
  let hearts = "";
  for(let i=0; i<3; i++) hearts += i < state.lives ? "🤍 " : "🖤 ";
  return hearts;
}

function handleLoseLife(reason) {
  state.lives--;
  if (state.lives <= 0) {
    state.isGameWon = false;
    state.loseReason = reason + "<br>모든 추리 토큰(목숨)이 소진되었습니다. 범인 검거 실패!";
    state.phase = 'result';
  } else {
    alert(reason + `\n추리 토큰이 1개 깎였습니다! (남은 목숨: ${state.lives})`);
    state.detectiveSelectedCards = [];
  }
}

function createDetectiveView() {
  const div = document.createElement('div');
  div.className = 'view active';
  div.style.padding = '1rem'; // 보드를 위해 여백 축소
  
  let isFinal = state.round === 4;
  let targetCount = isFinal ? 3 : 6;
  let ruleMsg = isFinal 
      ? `남은 카드는 9장입니다! 정답이라고 생각되는 <strong>범인 1, 동기 1, 흉기 1</strong>을 선택 후 검거 시도 버튼을 누르세요.` 
      : `현재 [${state.round}라운드] 정답이 아닐 것 같은 카드 <strong>6장</strong>을 선택한 후 제외 버튼을 누르세요.`;

  // 레이아웃 좌표 상수
  const MAIN_W = 6.86, MAIN_H = 19.21, MAIN_X = 3.84, MAIN_Y = 6.82, MAIN_DX = 8.26, MAIN_DY = 21.90;
  const S_W = 5.93, S_H = 4.34, S_COLS = [78.72, 85.00];
  const S_ROWS = [[10.74, 17.56], [32.64, 39.46], [54.55, 61.37]];
  const catNames = ['killer', 'weapon', 'motive']; // 이미지 순서에 맞춰서 배치

  let cardsHtml = '';
  // 1. 27장 메인 카드 생성
  catNames.forEach((cat, rIdx) => {
    state.cards[cat].forEach((c, cIdx) => {
      let isSel = state.detectiveSelectedCards.some(s => s.cat === cat && s.idx == cIdx);
      let tP = MAIN_Y + (rIdx * MAIN_DY);
      let lP = MAIN_X + (cIdx * MAIN_DX);
      cardsHtml += `
        <div class="card ${cat} ${c.excluded ? 'excluded' : ''} ${isSel ? 'selected-for-exclusion' : ''}" 
             data-cat="${cat}" data-idx="${cIdx}"
             style="width: ${MAIN_W}%; height: ${MAIN_H}%; left: ${lP}%; top: ${tP}%;">
          <div class="card-img" style="background-image: url('${c.file}');"></div>
          <div class="card-text" style="font-size: min(1.2vw, 14px); padding: 2px;">${c.name}</div>
        </div>
      `;
    });
  });

  // 2. 12장 소형 힌트 슬롯 생성
  catNames.forEach((cat, rIdx) => {
    let hints = state.hints[cat]; // 최대 4개
    let hIdx = 0;
    S_ROWS[rIdx].forEach((topPercent) => {
      S_COLS.forEach((leftPercent) => {
        let hint = hints[hIdx];
        let content = hint ? `<div class="word-tile board-hint ${hint.type}">${hint.text}</div>` : '';
        cardsHtml += `
          <div class="board-hint-slot" style="width: ${S_W}%; height: ${S_H}%; left: ${leftPercent}%; top: ${topPercent}%;">
            ${content}
          </div>
        `;
        hIdx++;
      });
    });
  });

  // 3. 소설가가 선택하지 않은 단어 표시 영역 (우측 하단)
  let allHints = Object.values(state.hints).flat().map(h => h.text);
  let unselectedAdjs = state.wordHand.adjectives.filter(w => !allHints.includes(w));
  let unselectedNouns = state.wordHand.nouns.filter(w => !allHints.includes(w));
  
  let unusedBoxHtml = `
    <div style="position: absolute; left: 69.92%; top: 73%; width: 22%; height: 21%; background: #000000; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; padding: 1.2vw; color: #ddd; display: flex; flex-direction: column; overflow-y: auto; box-shadow: 0 5px 15px rgba(0,0,0,0.8);">
      <div style="font-size: min(1vw, 14px); margin-bottom: 8px; text-align: center; color: #ccc; font-weight:bold;">남은 단어</div>
      <div style="display:flex; flex-wrap:wrap; gap:5px; justify-content:flex-start;">
         ${unselectedAdjs.map(w => `<span style="font-size: min(0.9vw, 12px); background: #2c3e50; border: 1px solid #5a8bb8; padding: 2px 4px; border-radius: 3px; white-space:nowrap;">${w}</span>`).join('')}
         ${unselectedNouns.map(w => `<span style="font-size: min(0.9vw, 12px); background: #2c3e50; border: 1px solid #b35c5c; padding: 2px 4px; border-radius: 3px; white-space:nowrap;">${w}</span>`).join('')}
      </div>
    </div>
  `;
  cardsHtml += unusedBoxHtml;

  let html = `
    <div class="top-bar" style="margin-bottom: 1rem; align-items:flex-end; width: 100%;">
      <div style="display:flex; flex-direction:column; gap:0.5rem; flex: 1;">
        <div style="display:flex; align-items:center; gap: 1.5rem;">
          <div class="turn-indicator" style="font-size:2rem; font-weight:bold; color:var(--highlight-color); text-shadow:none;">탐정의 추리 [${isFinal ? '최종' : state.round + '라운드'}]</div>
          <div style="font-size: 1.4rem; color:#fff; white-space: nowrap; display:flex; gap:0.5rem; align-items:center;">
             <span style="font-size: 1rem; color: #aaa;">남은 목숨</span> ${getHeartsHtml()}
          </div>
        </div>
        <div class="instruction-text" style="text-align:left; color:#ccc; font-size:1.1rem; margin-bottom:0;">${ruleMsg}</div>
      </div>
      <button class="btn btn-primary" id="btn-submit-deduction" style="font-size:1.1rem; padding: 12px 30px; font-weight:bold;">
        ${isFinal ? `최종 검거 시도 (${state.detectiveSelectedCards.length}/3)` : `제외 확정 (${state.detectiveSelectedCards.length}/6)`}
      </button>
    </div>
    
    <div class="game-board-container">
      <div class="game-board">
        ${cardsHtml}
      </div>
    </div>
  `;
  div.innerHTML = html;

  // Event Listeners for DOM Interactions
  const renderSelf = () => {
    // Optimization to avoid full render() flickering, we just update the DOM classes
    const btn = div.querySelector('#btn-submit-deduction');
    btn.innerText = isFinal ? `최종 검거 시도 (${state.detectiveSelectedCards.length}/3)` : `제외 확정 (${state.detectiveSelectedCards.length}/6)`;
    
    // Update card borders
    div.querySelectorAll('.card').forEach(cc => {
      if (cc.classList.contains('excluded')) return;
      let c = cc.dataset.cat;
      let i = parseInt(cc.dataset.idx);
      let isSel = state.detectiveSelectedCards.some(s => s.cat === c && s.idx === i);
      if (isSel) {
        cc.classList.add('selected-for-exclusion');
      } else {
        cc.classList.remove('selected-for-exclusion');
      }
    });
  };

  const cards = div.querySelectorAll('.card:not(.excluded)');
  cards.forEach(c => {
    c.addEventListener('click', () => {
      let cat = c.dataset.cat;
      let idx = parseInt(c.dataset.idx);
      
      let existingIndex = state.detectiveSelectedCards.findIndex(s => s.cat === cat && s.idx === idx);
      if (existingIndex >= 0) {
        state.detectiveSelectedCards.splice(existingIndex, 1);
      } else {
        if (state.detectiveSelectedCards.length >= targetCount) {
          alert(`최대 ${targetCount}장까지만 선택할 수 있습니다.`);
          return;
        }
        if (isFinal) {
          if (state.detectiveSelectedCards.some(s => s.cat === cat)) {
            alert(`항목당 1장씩만 선택해야 합니다.`); return;
          }
        }
        state.detectiveSelectedCards.push({cat, idx});
      }
      renderSelf();
    });
  });

  div.querySelector('#btn-submit-deduction').addEventListener('click', () => {
    if (state.detectiveSelectedCards.length !== targetCount) {
      alert(`${targetCount}장을 전부 선택한 후 제출해주세요.`);
      return;
    }
    
    saveState();

    if (!isFinal) {
      // Round 1~3 Logic
      let fails = false;
      for (let s of state.detectiveSelectedCards) {
        const text = state.cards[s.cat][s.idx].name;
        if (text === state.answers[s.cat].name) { fails = true; break; }
      }

      if (fails) {
        handleLoseLife("앗! 선택하신 카드 중에 '정답'이 포함되어 있습니다.");
        render(); 
        return;
      }

      // Success exclude
      for (let s of state.detectiveSelectedCards) {
        state.cards[s.cat][s.idx].excluded = true;
      }
      state.detectiveSelectedCards = [];
      state.round++;
      
      if (state.round === 4) {
        render(); 
      } else {
        state.phase = 'handover_novelist';
        render();
      }

    } else {
      // Final Logic
      let correct = true;
      for (let s of state.detectiveSelectedCards) {
        const text = state.cards[s.cat][s.idx].name;
        if (text !== state.answers[s.cat].name) { correct = false; break; }
      }

      if (correct) {
        state.isGameWon = true;
        state.phase = 'result';
      } else {
         handleLoseLife("검거에 실패했습니다! 다시 추적하세요.");
      }
      render();
    }
  });

  return div;
}

function createResultView() {
  const div = document.createElement('div');
  div.className = 'view active glass-panel';
  div.style.alignItems = 'center'; div.style.justifyContent = 'center';
  div.style.margin = 'auto auto'; div.style.maxWidth = '600px'; div.style.minHeight = '300px';
  div.style.padding = '4rem 2rem';
  
  let title = state.isGameWon ? "추리 성공!" : "추리 실패...";
  let color = state.isGameWon ? "var(--highlight-color)" : "var(--danger-color)";
  let msg = state.isGameWon ? "소설가의 다잉메시지를 완벽하게 해독해냈습니다. 범인을 검거했습니다!" : state.loseReason;

  div.innerHTML = `
    <h1 style="font-size: 3rem; margin-bottom: 2rem; color: ${color}; font-family: var(--font-title);">${title}</h1>
    <p style="font-size: 1.2rem; text-align: center; margin-bottom: 3rem; line-height: 1.6;">
      ${msg}<br><br>
      [사건의 진상]<br>
      범인: <strong style="color:#ccc">${state.answers.killer.name}</strong><br>
      동기: <strong style="color:#ccc">${state.answers.motive.name}</strong><br>
      흉기: <strong style="color:#ccc">${state.answers.weapon.name}</strong>
    </p>
    <button class="btn btn-primary" id="btn-restart">다시 하기</button>
  `;
  div.querySelector('#btn-restart').addEventListener('click', () => { stateHistory = []; state.phase = 'lobby'; render(); });
  return div;
}

document.addEventListener('DOMContentLoaded', () => {
  render();
});
