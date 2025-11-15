const boardElement = document.getElementById('chessboard');
const selectionMenu = document.getElementById('selection-menu');
const gameContainer = document.getElementById('game-container');

// Game mode (standard, capablanca, chess960, crazyhouse, berolina)
let gameMode = 'standard';
let gameState = 'playing'; // 'playing', 'check', 'checkmate', 'stalemate'
let boardFlipped = false; // Track board orientation
let botMode = false; // If true, Black is controlled by a random bot
let winSound = null; // applause sound
let winSoundPlayed = false; // ensure single play per game end

// Analysis mode variables
let moveHistory = []; // Array to store all moves
let currentMoveIndex = -1; // Current position in move history (-1 = initial position)
let analysisMode = false; // Whether we're in analysis mode

// Board editor variables
let boardEditorMode = false; // Whether we're in board editor mode
let selectedPiece = null; // Currently selected piece for placement
let editorBoard = null; // Copy of board for editing

// Unicode chess pieces as fallback
const UNICODE_PIECES = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
  // Capablanca pieces
  wC: '♔', wA: '♕', bC: '♚', bA: '♛', // Using similar symbols for now
  // Berolina pawns (using inverted pawn symbols)
  wS: '♟', bS: '♙',
  // Knightmate non-royal kings (fallback to king glyphs)
  wM: '♔', bM: '♚',
};

// PNG chess pieces (with fallback to Unicode) - Updated paths
const PIECES = {
  wK: 'ui assets/chess pieces/wK.png',
  wQ: 'ui assets/chess pieces/wQ.png',
  wR: 'ui assets/chess pieces/wR.png',
  wB: 'ui assets/chess pieces/wB.png',
  wN: 'ui assets/chess pieces/wN.png',
  wP: 'ui assets/chess pieces/wP.png',
  bK: 'ui assets/chess pieces/bK.png',
  bQ: 'ui assets/chess pieces/bQ.png',
  bR: 'ui assets/chess pieces/bR.png',
  bB: 'ui assets/chess pieces/bB.png',
  bN: 'ui assets/chess pieces/bN.png',
  bP: 'ui assets/chess pieces/bP.png',
  // Capablanca pieces
  wC: 'ui assets/chess pieces/wC.png',
  wA: 'ui assets/chess pieces/wA.png',
  bC: 'ui assets/chess pieces/bC.png',
  bA: 'ui assets/chess pieces/bA.png',
  // Berolina pawns
  wS: 'ui assets/chess pieces/wS.png',
  bS: 'ui assets/chess pieces/bS.png',
  // Knightmate non-royal kings
  wM: 'ui assets/chess pieces/wM.png',
  bM: 'ui assets/chess pieces/bM.png',
};

// Initial board setups
const STANDARD_BOARD = [
  ['bR','bN','bB','bQ','bK','bB','bN','bR'],
  ['bP','bP','bP','bP','bP','bP','bP','bP'],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  ['wP','wP','wP','wP','wP','wP','wP','wP'],
  ['wR','wN','wB','wQ','wK','wB','wN','wR'],
];

const CAPABLANCA_BOARD = [
  ['bR','bN','bA','bB','bQ','bK','bB','bC','bN','bR'],
  ['bP','bP','bP','bP','bP','bP','bP','bP','bP','bP'],
  [null,null,null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null,null,null],
  ['wP','wP','wP','wP','wP','wP','wP','wP','wP','wP'],
  ['wR','wN','wA','wB','wQ','wK','wB','wC','wN','wR'],
];

const BEROLINA_BOARD = [
  ['bR','bN','bB','bQ','bK','bB','bN','bR'],
  ['bS','bS','bS','bS','bS','bS','bS','bS'],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  ['wS','wS','wS','wS','wS','wS','wS','wS'],
  ['wR','wN','wB','wQ','wK','wB','wN','wR'],
];

let board = [...STANDARD_BOARD.map(row => [...row])];
let selected = null;
let currentPlayer = 'w';
let lastMove = null;
let enPassantTarget = null; // { row, col } square that can be captured en passant this turn

// UI elements
let modeSelector = null;
let statusDisplay = null;
let pocketsContainer = null;
let resignButton = null;
let newGameButton = null;

// Crazyhouse state
let pockets = { w: [], b: [] }; // arrays of piece letters without color, e.g., ['Q','N']
let dropSelection = null; // e.g., 'Q' means current player intends to drop a Queen

// Castling state (for standard and Chess960)
let castling = {
  w: { kingStart: { row: 7, col: 4 }, rookKCol: 7, rookQCol: 0, kingMoved: false, rookKMoved: false, rookQMoved: false },
  b: { kingStart: { row: 0, col: 4 }, rookKCol: 7, rookQCol: 0, kingMoved: false, rookKMoved: false, rookQMoved: false }
};

// Resignation state
let resignedBy = null; // 'w' or 'b' when someone resigns

// Theme state
let currentTheme = 'default'; // 'default', 'dark', 'ocean', 'forest', 'sunset'

// Bot analysis state
let botAnalysisMode = false;
let botAnalysisDepth = 3;

function initializeUI() {
  // Clear any existing game controls first
  const existingGameControls = gameContainer.querySelector('.game-controls-wrapper');
  if (existingGameControls) {
    existingGameControls.remove();
  }
  
  // Create mode selector
  const controls = document.createElement('div');
  controls.style.cssText = 'margin: 20px 0; text-align: center;';
  
  modeSelector = document.createElement('select');
  modeSelector.innerHTML = `
    <option value="standard">Standard Chess</option>
    <option value="capablanca">Capablanca Chess</option>
    <option value="chess960">Chess960</option>
    <option value="crazyhouse">Crazyhouse</option>
    <option value="giveaway">Antichess</option>
    <option value="berolina">Berolina Chess</option>
    <option value="knightmate">Knightmate</option>
    <option value="atomic">Atomic</option>
  `;
  modeSelector.addEventListener('change', changeGameMode);
  
  const modeLabel = document.createElement('label');
  modeLabel.textContent = 'Game Mode: ';
  modeLabel.appendChild(modeSelector);
  
  controls.appendChild(modeLabel);
  
  // Theme selector
  const themeContainer = document.createElement('div');
  themeContainer.style.cssText = 'margin: 10px 0; text-align: center;';
  
  const themeLabel = document.createElement('label');
  themeLabel.textContent = 'Theme: ';
  themeLabel.style.marginRight = '10px';
  
  const themeSelect = document.createElement('select');
  themeSelect.innerHTML = `
    <option value="default">Default</option>
    <option value="dark">Dark</option>
    <option value="ocean">Ocean</option>
    <option value="forest">Forest</option>
    <option value="sunset">Sunset</option>
  `;
  themeSelect.value = currentTheme;
  themeSelect.addEventListener('change', (e) => {
    currentTheme = e.target.value;
    applyTheme(currentTheme);
  });
  
  themeLabel.appendChild(themeSelect);
  themeContainer.appendChild(themeLabel);
  controls.appendChild(themeContainer);
  
  // Rules button
  const rulesButton = document.createElement('button');
  rulesButton.className = 'action-button';
  rulesButton.textContent = '📖 Rules';
  rulesButton.style.marginLeft = '8px';
  rulesButton.onclick = showRules;
  controls.appendChild(rulesButton);
  
  // Bot color selection (only show in bot mode) with icon
  if (botMode) {
    const botColorContainer = document.createElement('div');
    botColorContainer.style.cssText = 'margin: 10px 0; text-align: center; display: flex; align-items: center; justify-content: center; gap: 10px;';
    
    // Bot icon
    const botIcon = document.createElement('div');
    botIcon.textContent = '🤖';
    botIcon.style.cssText = 'font-size: 24px;';
    
    const botColorLabel = document.createElement('label');
    botColorLabel.textContent = 'Bot Color: ';
    botColorLabel.style.marginRight = '10px';
    
    const botColorSelect = document.createElement('select');
    botColorSelect.innerHTML = `
      <option value="b">Black (Bot plays second)</option>
      <option value="w">White (Bot plays first)</option>
    `;
    botColorSelect.value = botColor;
    botColorSelect.addEventListener('change', (e) => {
      botColor = e.target.value;
      // Update status display
      updateStatus();
    });
    
    botColorContainer.appendChild(botIcon);
    botColorContainer.appendChild(botColorLabel);
    botColorContainer.appendChild(botColorSelect);
    
    // Bot analysis button
    const botAnalysisButton = document.createElement('button');
    botAnalysisButton.className = 'action-button';
    botAnalysisButton.textContent = '🔍 Bot Analysis';
    botAnalysisButton.style.marginLeft = '10px';
    botAnalysisButton.onclick = toggleBotAnalysis;
    botColorContainer.appendChild(botAnalysisButton);
    
    controls.appendChild(botColorContainer);
    
    // Bot depth selection
    const botDepthContainer = document.createElement('div');
    botDepthContainer.style.cssText = 'margin: 10px 0; text-align: center;';
    
    const botDepthLabel = document.createElement('label');
    botDepthLabel.textContent = 'Bot Strength: ';
    botDepthLabel.style.marginRight = '10px';
    
    const botDepthSelect = document.createElement('select');
    botDepthSelect.innerHTML = `
      <option value="1">~800 ELO (Depth 1)</option>
      <option value="2">~1000 ELO (Depth 2)</option>
      <option value="3">~1200 ELO (Depth 3)</option>
      <option value="4">~1400 ELO (Depth 4)</option>
      <option value="5">~1600 ELO (Depth 5)</option>
      <option value="6">~1800 ELO (Depth 6)</option>
      <option value="7">~2000 ELO (Depth 7)</option>
      <option value="8">~2200 ELO (Depth 8)</option>
      <option value="9">~2400 ELO (Depth 9)</option>
      <option value="10">~2600 ELO (Depth 10)</option>
      <option value="12">~2800 ELO (Depth 12)</option>
      <option value="15">~3000 ELO (Depth 15)</option>
      <option value="18">~3200 ELO (Depth 18)</option>
      <option value="20">~3400 ELO (Depth 20)</option>
      <option value="22">~3600 ELO (Depth 22)</option>
      <option value="25" selected>~3800+ ELO (Depth 25)</option> 
    `;
    botDepthSelect.value = botDepth;
    botDepthSelect.addEventListener('change', (e) => {
      botDepth = parseInt(e.target.value);
      // Show confirmation
      const strengthNames = ['~800 ELO', '~1000 ELO', '~1200 ELO', '~1400 ELO', '~1600 ELO', '~1800 ELO', '~2000 ELO', '~2200 ELO', '~2400 ELO', '~2600 ELO', '', '~2800 ELO', '', '', '~3000 ELO', '', '', '~3200 ELO', '', '~3400 ELO', '', '~3600 ELO', '', '', '~3800+ ELO'];
      const strengthName = strengthNames[botDepth - 1];
      if (statusDisplay) {
        statusDisplay.textContent = `Bot strength set to ${strengthName} (Depth ${botDepth})`;
        statusDisplay.style.color = '#0066cc';
        setTimeout(() => updateStatus(), 2000);
      }
    });
    
    botDepthContainer.appendChild(botDepthLabel);
    botDepthContainer.appendChild(botDepthSelect);
    controls.appendChild(botDepthContainer);
  }
  
  // Create status display
  statusDisplay = document.createElement('div');
  statusDisplay.style.cssText = 'margin: 10px 0; font-weight: bold; text-align: center;';
  statusDisplay.textContent = "White's turn";
  
  controls.appendChild(statusDisplay);
  
  // Resign button
  resignButton = document.createElement('button');
  resignButton.className = 'action-button';
  resignButton.textContent = 'Resign';
  resignButton.onclick = onResign;
  controls.appendChild(resignButton);

  // New Game/New Analysis button
  newGameButton = document.createElement('button');
  newGameButton.className = 'action-button';
  newGameButton.textContent = analysisMode ? 'New Analysis' : 'New Game';
  newGameButton.style.marginLeft = '8px';
  newGameButton.onclick = analysisMode ? startNewAnalysis : startNewGame;
  controls.appendChild(newGameButton);

  // Crazyhouse pockets UI with improved layout
  pocketsContainer = document.createElement('div');
  pocketsContainer.id = 'pockets';
  pocketsContainer.style.cssText = 'display:flex; flex-direction: column; gap:12px; justify-content:center; align-items:center; margin: 10px 0; padding: 15px; background: #f5f5dc; border: 2px solid #3e3e3e; border-radius: 8px;';
  
  // Player info header
  const playerInfo = document.createElement('div');
  playerInfo.style.cssText = 'display: flex; gap: 20px; align-items: center; margin-bottom: 10px;';
  
  const whitePlayerDiv = document.createElement('div');
  whitePlayerDiv.style.cssText = 'display: flex; align-items: center; gap: 8px;';
  const whiteLabel = document.createElement('strong');
  whiteLabel.textContent = 'White:';
  whiteLabel.style.color = '#3e3e3e';
  whitePlayerDiv.appendChild(whiteLabel);
  const whitePlayerSelect = document.createElement('select');
  whitePlayerSelect.innerHTML = `
    <option value="human">Human</option>
    <option value="bot">Bot</option>
  `;
  whitePlayerSelect.style.cssText = 'padding: 4px 8px; border: 1px solid #3e3e3e; border-radius: 4px;';
  whitePlayerDiv.appendChild(whitePlayerSelect);
  
  const blackPlayerDiv = document.createElement('div');
  blackPlayerDiv.style.cssText = 'display: flex; align-items: center; gap: 8px;';
  const blackLabel = document.createElement('strong');
  blackLabel.textContent = 'Black:';
  blackLabel.style.color = '#3e3e3e';
  blackPlayerDiv.appendChild(blackLabel);
  const blackPlayerSelect = document.createElement('select');
  blackPlayerSelect.innerHTML = `
    <option value="human">Human</option>
    <option value="bot">Bot</option>
  `;
  blackPlayerSelect.style.cssText = 'padding: 4px 8px; border: 1px solid #3e3e3e; border-radius: 4px;';
  blackPlayerDiv.appendChild(blackPlayerSelect);
  
  playerInfo.appendChild(whitePlayerDiv);
  playerInfo.appendChild(blackPlayerDiv);
  pocketsContainer.appendChild(playerInfo);
  
  // Pockets display
  const pocketsDisplay = document.createElement('div');
  pocketsDisplay.style.cssText = 'display:flex; gap:24px; justify-content:center; align-items:center; width: 100%;';
  const whitePocket = document.createElement('div');
  whitePocket.id = 'white-pocket';
  whitePocket.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 8px; background: #fff; border: 2px solid #3e3e3e; border-radius: 4px; min-height: 50px;';
  const blackPocket = document.createElement('div');
  blackPocket.id = 'black-pocket';
  blackPocket.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 8px; background: #333; border: 2px solid #3e3e3e; border-radius: 4px; min-height: 50px;';
  pocketsDisplay.appendChild(whitePocket);
  pocketsDisplay.appendChild(blackPocket);
  pocketsContainer.appendChild(pocketsDisplay);
  
  controls.appendChild(pocketsContainer);

  // Analysis controls
  const analysisControls = document.createElement('div');
  analysisControls.id = 'analysis-controls';
  analysisControls.style.cssText = 'display: flex; gap: 10px; justify-content: center; align-items: center; margin: 10px 0;';
  
  const backButton = document.createElement('button');
  backButton.className = 'action-button';
  backButton.textContent = '← Back';
  backButton.onclick = goBack;
  backButton.disabled = true;
  
  const forwardButton = document.createElement('button');
  forwardButton.className = 'action-button';
  forwardButton.textContent = 'Forward →';
  forwardButton.onclick = goForward;
  forwardButton.disabled = true;
  
  const savePgnButton = document.createElement('button');
  savePgnButton.className = 'action-button';
  savePgnButton.textContent = 'Save as PGN';
  savePgnButton.onclick = saveAsPGN;
  
  const loadPgnButton = document.createElement('button');
  loadPgnButton.className = 'action-button';
  loadPgnButton.textContent = 'Load PGN';
  loadPgnButton.onclick = loadFromPGN;
  
  analysisControls.appendChild(backButton);
  analysisControls.appendChild(forwardButton);
  analysisControls.appendChild(savePgnButton);
  analysisControls.appendChild(loadPgnButton);
  controls.appendChild(analysisControls);
  
  // Show/hide analysis controls based on mode
  analysisControls.style.display = analysisMode ? 'flex' : 'none';
  
  // Update button text based on mode
  if (newGameButton) {
    newGameButton.textContent = analysisMode ? 'New Analysis' : 'New Game';
    newGameButton.onclick = analysisMode ? startNewAnalysis : startNewGame;
  }
  
  // Insert controls before the board in the game container
  const gameControls = document.createElement('div');
  gameControls.className = 'game-controls-wrapper';
  gameControls.style.cssText = 'margin: 20px 0; text-align: center;';
  gameControls.appendChild(controls);
  gameContainer.insertBefore(gameControls, boardElement);
}

function changeGameMode() {
  gameMode = modeSelector.value;
  if (gameMode === 'capablanca') {
    board = [...CAPABLANCA_BOARD.map(row => [...row])];
  } else if (gameMode === 'chess960') {
    board = generateChess960Board();
  } else if (gameMode === 'giveaway') {
    board = [...STANDARD_BOARD.map(row => [...row])];
  } else if (gameMode === 'knightmate') {
    board = [...STANDARD_BOARD.map(row => [...row])];
    // Swap kings with royal knights: knights become royal kings (keep 'N' code as royal),
    // original kings become non-royal 'M'.
    board[7][4] = 'wN';
    board[7][1] = 'wM';
    board[7][6] = 'wM';
    board[0][4] = 'bN';
    board[0][1] = 'bM';
    board[0][6] = 'bM';
  } else if (gameMode === 'berolina') {
    board = [...BEROLINA_BOARD.map(row => [...row])];
  } else {
    // standard and crazyhouse both start from standard setup
    board = [...STANDARD_BOARD.map(row => [...row])];
  }
  
  currentPlayer = 'w';
  selected = null;
  lastMove = null;
  enPassantTarget = null;
  gameState = 'playing';
  dropSelection = null;
  pockets = { w: [], b: [] };
  initializeCastlingRights();
  resignedBy = null;
  winSoundPlayed = false;
  if (resignButton) resignButton.disabled = false;
  
  // Update analysis controls visibility and button text
  const analysisControls = document.getElementById('analysis-controls');
  if (analysisControls) {
    analysisControls.style.display = analysisMode ? 'flex' : 'none';
  }
  
  if (newGameButton) {
    newGameButton.textContent = analysisMode ? 'New Analysis' : 'New Game';
    newGameButton.onclick = analysisMode ? startNewAnalysis : startNewGame;
  }
  
  renderBoard();
  updateStatus();
  renderPockets();
}

function updateStatus() {
  if (gameState === 'checkmate') {
    const winner = currentPlayer === 'w' ? 'Black' : 'White';
    if (analysisMode) {
      statusDisplay.textContent = `Checkmate! ${winner} wins! - Analyse Manually`;
    } else {
      statusDisplay.textContent = `Checkmate! ${winner} wins!`;
    }
    statusDisplay.style.color = '#ff4444';
    if (resignButton) resignButton.disabled = true;
    if (!analysisMode && !winSoundPlayed && winSound) { try { winSound.currentTime = 0; winSound.play(); } catch(e) {} winSoundPlayed = true; }
  } else if (gameState === 'stalemate') {
    if (analysisMode) {
      statusDisplay.textContent = 'Stalemate! - Analyse Manually';
    } else {
      statusDisplay.textContent = 'Stalemate!';
    }
    statusDisplay.style.color = '#ffaa00';
    if (resignButton) resignButton.disabled = true;
  } else if (gameState === 'resigned') {
    const loser = resignedBy === 'w' ? 'White' : 'Black';
    const winner = resignedBy === 'w' ? 'Black' : 'White';
    if (analysisMode) {
      statusDisplay.textContent = `${loser} resigns. ${winner} wins! - Analyse Manually`;
    } else {
      statusDisplay.textContent = `${loser} resigns. ${winner} wins!`;
    }
    statusDisplay.style.color = '#ff4444';
    if (resignButton) resignButton.disabled = true;
    if (!analysisMode && !winSoundPlayed && winSound) { try { winSound.currentTime = 0; winSound.play(); } catch(e) {} winSoundPlayed = true; }
  } else if (gameState === 'giveaway_win') {
    const winner = currentPlayer === 'w' ? 'White' : 'Black';
    if (analysisMode) {
      statusDisplay.textContent = `Giveaway: ${winner} wins! - Analyse Manually`;
    } else {
      statusDisplay.textContent = `Giveaway: ${winner} wins!`;
    }
    statusDisplay.style.color = '#ff4444';
    if (resignButton) resignButton.disabled = true;
    if (!analysisMode && !winSoundPlayed && winSound) { try { winSound.currentTime = 0; winSound.play(); } catch(e) {} winSoundPlayed = true; }
  } else if (gameState === 'check') {
    const turnLabel = (botMode && currentPlayer === botColor) ? "Bot's" : (currentPlayer === 'w' ? 'White' : 'Black');
    statusDisplay.textContent = `${turnLabel}'s turn - CHECK!`;
    statusDisplay.style.color = '#ff4444';
    if (resignButton) resignButton.disabled = false;
  } else {
    const turnLabel = (botMode && currentPlayer === botColor) ? "Bot's" : (currentPlayer === 'w' ? 'White' : 'Black');
    statusDisplay.textContent = `${turnLabel}'s turn`;
    statusDisplay.style.color = '#333';
    if (resignButton) resignButton.disabled = false;
  }
}



function onSquareClick(row, col) {
  // Handle board editor mode
  if (boardEditorMode) {
    onEditorSquareClick(row, col);
    return;
  }
  
  // Handle puzzle mode
  if (puzzleMode) {
    // Allow normal moves in puzzle mode
    // Puzzle completion is checked after moves
  }
  
  if (gameState === 'checkmate' || gameState === 'stalemate' || gameState === 'resigned') {
    // In puzzle mode, checkmate means puzzle solved
    if (puzzleMode && gameState === 'checkmate') {
      setTimeout(() => {
        alert('Puzzle solved! 🎉');
        generatePuzzle();
        renderBoard();
        updateStatus();
      }, 100);
    }
    return;
  }
  
  const piece = board[row][col];

  // Crazyhouse drop handling
  if (!selected && gameMode === 'crazyhouse' && dropSelection) {
    if (!piece && isLegalDrop({ row, col })) {
      const newPiece = currentPlayer + dropSelection;
      // Simulate drop to ensure it doesn't leave king in check
      const temp = board[row][col];
      board[row][col] = newPiece;
      if (isKingInCheck(currentPlayer)) {
        board[row][col] = temp;
        return; // illegal drop
      }
      board[row][col] = newPiece;
      // remove from pocket
      const idx = pockets[currentPlayer].indexOf(dropSelection);
      if (idx !== -1) pockets[currentPlayer].splice(idx, 1);
      dropSelection = null;
      // switch player
      currentPlayer = currentPlayer === 'w' ? 'b' : 'w';
      lastMove = { from: null, to: { row, col }, drop: true };
      checkGameState();
      if (analysisMode) saveCurrentPosition();
      renderBoard();
      updateStatus();
      renderPockets();
    }
    return;
  }
  
  if (selected) {
    if (selected.row === row && selected.col === col) {
      selected = null;
      renderBoard();
      return;
    }
    
    if (isLegalMove(selected, {row, col})) {
      const moveResult = movePiece(selected, {row, col});
      
      // Handle promotion
      if (moveResult.needsPromotion) {
        // Move pawn first to avoid duplicate piece (fix infinite promotion glitch)
        const fromPos = selected;
        const movingPiece = board[fromPos.row][fromPos.col];
        board[moveResult.promotionSquare.row][moveResult.promotionSquare.col] = movingPiece;
        board[fromPos.row][fromPos.col] = null;
        selected = null;
        showPromotionDialog(moveResult.promotionSquare, movingPiece);
        return;
      }
      
      const fromPos = selected;
      selected = null;
      currentPlayer = currentPlayer === 'w' ? 'b' : 'w';
      lastMove = {from: fromPos, to: {row, col}};
      
      // Check game state
      checkGameState();
      if (analysisMode) saveCurrentPosition();
      renderBoard();
      updateStatus();
      renderPockets();
      
      // Check puzzle completion
      if (puzzleMode && gameState === 'checkmate') {
        setTimeout(() => {
          alert('Puzzle solved! 🎉');
          generatePuzzle();
          renderBoard();
          updateStatus();
        }, 100);
      }
      
      triggerBotMoveIfNeeded();
      return;
    } else {
      selected = null;
      renderBoard();
      return;
    }
  }
  
  if (piece && piece[0] === currentPlayer) {
    selected = {row, col};
    renderBoard();
  }
}

function movePiece(from, to) {
  const piece = board[from.row][from.col];
  const target = board[to.row][to.col];
  
  // Crazyhouse capture goes to mover's pocket
  if (target && gameMode === 'crazyhouse') {
    pockets[piece[0]].push(target[1]);
  }

  // Castling handling for standard and Chess960
  if (piece[1] === 'K' && (gameMode !== 'capablanca')) {
    const side = detectCastlingSide(piece[0], from, to);
    if (side && isCastlingLegal(piece[0], side)) {
      performCastle(piece[0], side);
      return { needsPromotion: false };
    }
  }

  // Check for pawn promotion
  const needsPromotion = (piece[1] === 'P' || piece[1] === 'S') && 
    ((piece[0] === 'w' && to.row === 0) || (piece[0] === 'b' && to.row === 7));
  
  if (needsPromotion) {
    return {
      needsPromotion: true,
      promotionSquare: to,
      piece: piece
    };
  }
  
  // Make the move
  // En passant capture execution for regular pawns
  let enPassantCaptured = null;
  if (piece[1] === 'P' && enPassantTarget && to.row === enPassantTarget.row && to.col === enPassantTarget.col && !target) {
    const dir = piece[0] === 'w' ? 1 : -1; // captured pawn sits behind target square
    const capturedRow = to.row + dir;
    enPassantCaptured = board[capturedRow][to.col];
    board[capturedRow][to.col] = null;
    board[to.row][to.col] = piece;
    board[from.row][from.col] = null;
  } else {
    board[to.row][to.col] = piece;
    board[from.row][from.col] = null;
  }

  // Update castling rights if king or rook moves/captured
  updateCastlingRightsAfterMove(piece, from, to);
  if (target) updateCastlingRightsAfterCapture(target, to);
  if (enPassantCaptured) updateCastlingRightsAfterCapture(enPassantCaptured, { row: to.row + (piece[0] === 'w' ? 1 : -1), col: to.col });

  // Crazyhouse: captured piece from en passant goes to pocket
  if (enPassantCaptured && gameMode === 'crazyhouse') {
    pockets[piece[0]].push(enPassantCaptured[1]);
  }

  // Giveaway: treat en passant as a capture for legality already handled elsewhere
  
  // Set/clear en passant target
  enPassantTarget = null;
  if (piece[1] === 'P') {
    const dir = piece[0] === 'w' ? -1 : 1;
    const startRow = piece[0] === 'w' ? 6 : 1;
    if (from.row === startRow && to.row === from.row + 2 * dir && from.col === to.col) {
      enPassantTarget = { row: from.row + dir, col: from.col };
    }
  }

  // Atomic: explosion on captures (target square or en passant captured pawn square)
  if (gameMode === 'atomic' && (target || enPassantCaptured)) {
    const center = enPassantCaptured
      ? { row: to.row + (piece[0] === 'w' ? 1 : -1), col: to.col }
      : { row: to.row, col: to.col };
    triggerAtomicExplosion(center, piece[0]);
  }

  return { needsPromotion: false };
}

function triggerAtomicExplosion(center, moverColor) {
  const rows = 8;
  const cols = gameMode === 'capablanca' ? 10 : 8;
  const adjDeltas = [
    {dr: 1, dc: 0}, {dr: -1, dc: 0}, {dr: 0, dc: 1}, {dr: 0, dc: -1},
    {dr: 1, dc: 1}, {dr: 1, dc: -1}, {dr: -1, dc: 1}, {dr: -1, dc: -1}
  ];
  const toRemove = [];
  let royalRemoved = false;

  // Always remove the center square occupant (capturing piece now occupies center for normal captures)
  if (center.row >= 0 && center.row < rows && center.col >= 0 && center.col < cols) {
    const pCenter = board[center.row][center.col];
    if (pCenter) {
      const isRoyalCenter = (gameMode === 'knightmate') ? (pCenter[1] === 'N') : (pCenter[1] === 'K');
      if (isRoyalCenter) royalRemoved = true;
      toRemove.push({ r: center.row, c: center.col, p: pCenter });
    }
  }

  // Adjacent squares: remove non-pawns only
  adjDeltas.forEach(d => {
    const r = center.row + d.dr;
    const c = center.col + d.dc;
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    const p = board[r][c];
    if (!p) return;
    if (p[1] === 'P' || p[1] === 'S') return;
    toRemove.push({ r, c, p });
  });
  toRemove.forEach(({r, c, p}) => {
    // Track royal removal (king in normal, knight in knightmate)
    const color = p[0];
    const isRoyal = (gameMode === 'knightmate') ? (p[1] === 'N') : (p[1] === 'K');
    if (isRoyal) royalRemoved = true;
    board[r][c] = null;
  });
  if (royalRemoved) {
    // End the game immediately, winner is the side that just moved
    gameState = 'checkmate';
  }
}

function showPromotionDialog(square, piece) {
  const promotionPieces = gameMode === 'capablanca' 
    ? ['Q', 'R', 'B', 'N', 'C', 'A'] 
    : ['Q', 'R', 'B', 'N'];
  
  const dialog = document.createElement('div');
  dialog.className = 'promotion-dialog';
  
  dialog.innerHTML = '<h3>Choose promotion piece:</h3>';
  
  promotionPieces.forEach(pieceType => {
    const button = document.createElement('button');
    button.className = 'promotion-button';
    
    const color = piece[0];
    const newPiece = color + pieceType;
    
    if (PIECES[newPiece]) {
      const img = document.createElement('img');
      img.src = PIECES[newPiece];
      img.style.width = '30px';
      img.style.height = '30px';
      button.appendChild(img);
    } else {
      button.textContent = pieceType;
    }
    
    button.onclick = () => {
      board[square.row][square.col] = newPiece;
      document.body.removeChild(dialog);
      currentPlayer = currentPlayer === 'w' ? 'b' : 'w';
      lastMove = {from: null, to: square};
      selected = null;
      
      checkGameState();
      if (analysisMode) saveCurrentPosition();
      renderBoard();
      updateStatus();
      triggerBotMoveIfNeeded();
    };
    
    dialog.appendChild(button);
  });
  
  document.body.appendChild(dialog);
}

function isLegalMove(from, to) {
  const piece = board[from.row][from.col];
  if (!piece || piece[0] !== currentPlayer) return false;
  
  const target = board[to.row][to.col];
  if (target && target[0] === piece[0]) return false; // Can't capture own piece
  
  const dr = to.row - from.row;
  const dc = to.col - from.col;
  
  // Check if move is valid for the piece type
  let isValidMove = false;
  
  switch (piece[1]) {
    case 'P': // Pawn
    case 'S': // Berolina pawn
      isValidMove = isValidPawnMove(from, to, piece);
      break;
    case 'N': // Knight
      isValidMove = (Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2);
      break;
    case 'B': // Bishop
      if (Math.abs(dr) === Math.abs(dc)) {
        isValidMove = isPathClear(from, to);
      }
      break;
    case 'R': // Rook
      if (dr === 0 || dc === 0) {
        isValidMove = isPathClear(from, to);
      }
      break;
    case 'Q': // Queen
      if (dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc)) {
        isValidMove = isPathClear(from, to);
      }
      break;
    case 'K': // King
      isValidMove = Math.abs(dr) <= 1 && Math.abs(dc) <= 1;
      // Castling attempt (standard and Chess960; not in giveaway, crazyhouse, or knightmate)
      if (!isValidMove && gameMode !== 'capablanca' && gameMode !== 'giveaway' && gameMode !== 'knightmate') {
        const side = detectCastlingSide(piece[0], from, to);
        if (side && isCastlingLegal(piece[0], side)) isValidMove = true;
      }
      break;
    case 'M': // Knightmate non-royal king moves like a king (no castling)
      isValidMove = Math.max(Math.abs(dr), Math.abs(dc)) === 1;
      break;
    case 'C': // Chancellor (Rook + Knight)
      isValidMove = isValidChancellorMove(from, to);
      break;
    case 'A': // Archbishop (Bishop + Knight)
      isValidMove = isValidArchbishopMove(from, to);
      break;
  }
  
  if (!isValidMove) return false;

  // Giveaway: capturing is mandatory and checks are ignored
  if (gameMode === 'giveaway') {
    const target = board[to.row][to.col];
    if (hasAnyCapture(currentPlayer) && !(target && target[0] !== piece[0])) return false;
    return true;
  }
  
  // Atomic: kings cannot capture; and you may move into "attacked" squares if explosion removes threats.
  if (gameMode === 'atomic' && piece[1] === 'K' && board[to.row][to.col]) return false;
  
  // Check if move would leave royal piece in check (regular modes)
  return !wouldLeaveRoyalInCheck(from, to);
}

function isValidPawnMove(from, to, piece) {
  const dr = to.row - from.row;
  const dc = to.col - from.col;
  const target = board[to.row][to.col];
  const dir = piece[0] === 'w' ? -1 : 1;
  const startRow = piece[0] === 'w' ? 6 : 1;
  
  // Check if this is a Berolina pawn
  const isBerolina = piece[1] === 'S';
  
  if (isBerolina) {
    // Berolina pawns move diagonally forward and capture straight forward
    
    // Diagonal move (non-capture)
    if (Math.abs(dc) === 1 && dr === dir && !target) {
      return true;
    }
    
    // Two-square diagonal move on first move
    if (from.row === startRow && Math.abs(dc) === 2 && dr === 2 * dir && !target) {
      // Check if the intermediate square is empty
      const intermediateRow = from.row + dir;
      const intermediateCol = from.col + Math.sign(dc);
      if (!board[intermediateRow][intermediateCol]) return true;
    }
    
    // Straight capture
    if (dc === 0 && dr === dir && target && target[0] !== piece[0]) {
      return true;
    }
  } else {
    // Regular pawns move straight forward and capture diagonally
    
    // Forward move
    if (dc === 0 && !target) {
      if (dr === dir) return true;
      if (from.row === startRow && dr === 2 * dir && !board[from.row + dir][from.col]) return true;
    }
    
    // Capture move
    if (Math.abs(dc) === 1 && dr === dir && target && target[0] !== piece[0]) return true;

    // En passant capture
    if (Math.abs(dc) === 1 && dr === dir && !target && enPassantTarget && enPassantTarget.row === to.row && enPassantTarget.col === to.col) {
      return true;
    }
  }
  
  return false;
}

function isValidChancellorMove(from, to) {
  const dr = to.row - from.row;
  const dc = to.col - from.col;
  
  // Rook move
  if (dr === 0 || dc === 0) {
    return isPathClear(from, to);
  }
  
  // Knight move
  return (Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2);
}

function isValidArchbishopMove(from, to) {
  const dr = to.row - from.row;
  const dc = to.col - from.col;
  
  // Bishop move
  if (Math.abs(dr) === Math.abs(dc)) {
    return isPathClear(from, to);
  }
  
  // Knight move
  return (Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2);
}

function isPathClear(from, to) {
  const dr = Math.sign(to.row - from.row);
  const dc = Math.sign(to.col - from.col);
  let r = from.row + dr;
  let c = from.col + dc;
  
  while (r !== to.row || c !== to.col) {
    if (board[r][c]) return false;
    r += dr;
    c += dc;
  }
  
  return true;
}

function wouldLeaveRoyalInCheck(from, to) {
  // Make temporary move
  const movingPiece = board[from.row][from.col];
  const originalTarget = board[to.row][to.col];
  let capturedEnPassantPiece = null;
  let capturedEnPassantPos = null;

  // Apply temporary move (handle en passant)
  board[to.row][to.col] = movingPiece;
  board[from.row][from.col] = null;
  if (movingPiece && movingPiece[1] === 'P' && enPassantTarget && !originalTarget && enPassantTarget.row === to.row && enPassantTarget.col === to.col) {
    const dirBack = movingPiece[0] === 'w' ? 1 : -1;
    capturedEnPassantPos = { row: to.row + dirBack, col: to.col };
    capturedEnPassantPiece = board[capturedEnPassantPos.row][capturedEnPassantPos.col];
    board[capturedEnPassantPos.row][capturedEnPassantPos.col] = null;
  }

  // For Atomic: simulate explosion after captures
  const removedSquares = [];
  if (gameMode === 'atomic' && (originalTarget || capturedEnPassantPiece)) {
    const rows = 8;
    const cols = gameMode === 'capablanca' ? 10 : 8;
    const deltas = [
      {dr: 0, dc: 0}, {dr: 1, dc: 0}, {dr: -1, dc: 0}, {dr: 0, dc: 1}, {dr: 0, dc: -1},
      {dr: 1, dc: 1}, {dr: 1, dc: -1}, {dr: -1, dc: 1}, {dr: -1, dc: -1}
    ];
    deltas.forEach(d => {
      const r = to.row + d.dr;
      const c = to.col + d.dc;
      if (r < 0 || r >= rows || c < 0 || c >= cols) return;
      const p = board[r][c];
      if (!p) return;
      if (p[1] === 'P' || p[1] === 'S') return;
      removedSquares.push({ r, c, p });
      board[r][c] = null;
    });
  }

  // Check if current side's royal piece is in check after simulation
  const inCheck = isRoyalInCheck(currentPlayer);

  // Undo explosion removals
  for (let i = 0; i < removedSquares.length; i++) {
    const { r, c, p } = removedSquares[i];
    board[r][c] = p;
  }

  // Undo move and en passant
  if (capturedEnPassantPiece && capturedEnPassantPos) {
    board[capturedEnPassantPos.row][capturedEnPassantPos.col] = capturedEnPassantPiece;
  }
  board[from.row][from.col] = board[to.row][to.col];
  board[to.row][to.col] = originalTarget;

  return inCheck;
}

function isRoyalInCheck(color) {
  const royalPos = findRoyal(color);
  if (!royalPos) return false;
  const opponentColor = color === 'w' ? 'b' : 'w';
  return isSquareAttackedBy(royalPos, opponentColor);
}

// Backwards-compatible wrappers for existing code paths
function isKingInCheck(color) { return isRoyalInCheck(color); }

function findRoyal(color) {
  const rows = 8;
  const cols = gameMode === 'capablanca' ? 10 : 8;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const piece = board[row][col];
      if (gameMode === 'knightmate') {
        if (piece === color + 'N') return { row, col };
      } else {
        if (piece === color + 'K') return { row, col };
      }
    }
  }
  return null;
}

// Backwards-compatible wrapper used in UI highlights
function findKing(color) { return findRoyal(color); }

function hasLegalMoves(color) {
  const rows = 8;
  const cols = gameMode === 'capablanca' ? 10 : 8;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const piece = board[row][col];
      if (piece && piece[0] === color) {
        for (let toRow = 0; toRow < rows; toRow++) {
          for (let toCol = 0; toCol < cols; toCol++) {
            if (isLegalMove({row, col}, {row: toRow, col: toCol})) {
              return true;
            }
          }
        }
      }
    }
  }
  
  return false;
}

function checkGameState() {
  // If an earlier action already decided the game (e.g., Atomic explosion), don't override
  if (gameMode === 'atomic' && gameState === 'checkmate') return;

  // Atomic: if either side has no royal piece on the board, the game ends immediately
  if (gameMode === 'atomic') {
    const whiteHasRoyal = !!findRoyal('w');
    const blackHasRoyal = !!findRoyal('b');
    if (!whiteHasRoyal || !blackHasRoyal) {
      gameState = 'checkmate';
      return;
    }
  }
  if (gameMode === 'giveaway') {
    if (countPieces(currentPlayer) === 0) {
      gameState = 'giveaway_win';
    } else if (!hasLegalMoves(currentPlayer)) {
      gameState = 'giveaway_win';
    } else {
      gameState = 'playing';
    }
    return;
  }
  if (isRoyalInCheck(currentPlayer)) {
    if (hasLegalMoves(currentPlayer)) {
      gameState = 'check';
    } else {
      gameState = 'checkmate';
    }
  } else {
    if (hasLegalMoves(currentPlayer)) {
      gameState = 'playing';
    } else {
      gameState = 'stalemate';
    }
  }
}

// Initialize the menu system instead of the game directly
initializeMenu();

// ----- Helpers: Crazyhouse -----
function renderPockets() {
  if (!pocketsContainer) return;
  pocketsContainer.style.display = gameMode === 'crazyhouse' ? 'flex' : 'none';
  const whiteDiv = document.getElementById('white-pocket');
  const blackDiv = document.getElementById('black-pocket');
  if (!whiteDiv || !blackDiv) return;
  
  whiteDiv.innerHTML = '';
  blackDiv.innerHTML = '';
  
  // Add labels with images
  const whiteLabel = document.createElement('div');
  whiteLabel.style.cssText = 'width: 100%; margin-bottom: 5px; font-weight: bold; color: #3e3e3e;';
  whiteLabel.textContent = 'White Pocket:';
  whiteDiv.appendChild(whiteLabel);
  
  const blackLabel = document.createElement('div');
  blackLabel.style.cssText = 'width: 100%; margin-bottom: 5px; font-weight: bold; color: #fff;';
  blackLabel.textContent = 'Black Pocket:';
  blackDiv.appendChild(blackLabel);
  
  renderPocketFor('w', whiteDiv);
  renderPocketFor('b', blackDiv);
}

function renderPocketFor(color, container) {
  pockets[color].forEach((p, index) => {
    const btn = document.createElement('button');
    btn.className = 'promotion-button';
    const pieceCode = color + p;
    if (PIECES[pieceCode]) {
      const img = document.createElement('img');
      img.src = PIECES[pieceCode];
      img.style.width = '24px';
      img.style.height = '24px';
      btn.appendChild(img);
    } else {
      btn.textContent = p;
    }
    btn.onclick = () => {
      if (currentPlayer !== color) return; // cannot select opponent pocket on their turn
      dropSelection = p;
      selected = null;
      renderBoard();
    };
    container.appendChild(btn);
  });
}

function isLegalDrop(to) {
  if (board[to.row][to.col]) return false; // must be empty
  if (!dropSelection) return false;
  // Pawn cannot be dropped on first/last rank
  if (dropSelection === 'P' || dropSelection === 'S') {
    if ((currentPlayer === 'w' && to.row === 0) || (currentPlayer === 'b' && to.row === 7)) return false;
  }
  return true;
}

// ----- Helpers: Castling & Attacks -----
function initializeCastlingRights() {
  // Reset
  castling = {
    w: { kingStart: { row: 7, col: 4 }, rookKCol: 7, rookQCol: 0, kingMoved: false, rookKMoved: false, rookQMoved: false },
    b: { kingStart: { row: 0, col: 4 }, rookKCol: 7, rookQCol: 0, kingMoved: false, rookKMoved: false, rookQMoved: false }
  };

  if (gameMode === 'chess960' || gameMode === 'standard' || gameMode === 'crazyhouse') {
    ['w','b'].forEach(color => {
      const row = color === 'w' ? 7 : 0;
      let kingCol = null;
      const rookCols = [];
      for (let c = 0; c < 8; c++) {
        const p = board[row][c];
        if (!p) continue;
        if (p === color + 'K') kingCol = c;
        if (p === color + 'R') rookCols.push(c);
      }
      if (kingCol !== null) castling[color].kingStart = { row, col: kingCol };
      // Determine rook for king/queen side by relative position to king
      const leftRooks = rookCols.filter(c => c < kingCol).sort((a,b)=>a-b);
      const rightRooks = rookCols.filter(c => c > kingCol).sort((a,b)=>a-b);
      castling[color].rookQCol = leftRooks.length ? leftRooks[leftRooks.length - 1] : null; // nearest on the left
      castling[color].rookKCol = rightRooks.length ? rightRooks[0] : null; // nearest on the right
      castling[color].kingMoved = false;
      castling[color].rookKMoved = false;
      castling[color].rookQMoved = false;
    });
  }
}

function detectCastlingSide(color, from, to) {
  // Only if starting from original king square
  const info = castling[color];
  if (!info) return null;
  if (from.row !== info.kingStart.row || from.col !== info.kingStart.col) return null;
  if (from.row !== to.row) return null;
  if (to.col === 6) return 'king';
  if (to.col === 2) return 'queen';
  return null;
}

function isCastlingLegal(color, side) {
  const info = castling[color];
  if (!info || info.kingMoved) return false;
  const row = info.kingStart.row;
  const rookCol = side === 'king' ? info.rookKCol : info.rookQCol;
  if (rookCol === null) return false;
  if (side === 'king' && info.rookKMoved) return false;
  if (side === 'queen' && info.rookQMoved) return false;
  if (isKingInCheck(color)) return false; // cannot castle out of check
  // Destination squares for king and rook are fixed (g/c and f/d)
  const kingDestCol = side === 'king' ? 6 : 2;
  const rookDestCol = side === 'king' ? 5 : 3;
  // Squares between king start and king destination must be empty (ignore rook square if on the path)
  const step = Math.sign(kingDestCol - info.kingStart.col);
  for (let c = info.kingStart.col + step; c !== kingDestCol + step; c += step) {
    if (c === rookCol) continue; // rook can be jumped over in Chess960 when it sits between
    if (c < 0 || c > 7) return false;
    if (c !== kingDestCol && board[row][c]) return false; // intermediate squares must be empty
  }
  // Check that the squares the king passes over (including destination) are not attacked
  for (let c = info.kingStart.col; c !== kingDestCol + step; c += step) {
    if (isSquareAttackedBy({ row, col: c }, color === 'w' ? 'b' : 'w')) return false;
  }
  // Rook destination must be empty or its own square if rook moves there
  if (board[row][rookDestCol] && !(rookDestCol === rookCol)) return false;
  // Additionally, ensure squares between rook and its destination are empty (excluding king start square)
  const rstep = Math.sign(rookDestCol - rookCol);
  for (let c = rookCol + rstep; c !== rookDestCol; c += rstep) {
    if (c === info.kingStart.col) continue;
    if (board[row][c]) return false;
  }
  return true;
}

function performCastle(color, side) {
  const info = castling[color];
  const row = info.kingStart.row;
  const rookCol = side === 'king' ? info.rookKCol : info.rookQCol;
  const kingDestCol = side === 'king' ? 6 : 2;
  const rookDestCol = side === 'king' ? 5 : 3;

  // Move king
  board[row][kingDestCol] = color + 'K';
  board[row][info.kingStart.col] = null;
  // Move rook
  board[row][rookDestCol] = color + 'R';
  board[row][rookCol] = null;

  // Update rights and turn
  info.kingMoved = true;
  if (side === 'king') info.rookKMoved = true; else info.rookQMoved = true;
  selected = null;
  currentPlayer = currentPlayer === 'w' ? 'b' : 'w';
  lastMove = { from: { row, col: info.kingStart.col }, to: { row, col: kingDestCol }, castle: side };
  checkGameState();
  if (analysisMode) saveCurrentPosition();
  renderBoard();
  updateStatus();
  triggerBotMoveIfNeeded();
}

function updateCastlingRightsAfterMove(piece, from, to) {
  if (piece[1] === 'K' && castling[piece[0]]) {
    castling[piece[0]].kingMoved = true;
  }
  if (piece[1] === 'R' && castling[piece[0]]) {
    const info = castling[piece[0]];
    if (from.row === info.kingStart.row) {
      if (from.col === info.rookKCol) info.rookKMoved = true;
      if (from.col === info.rookQCol) info.rookQMoved = true;
    }
  }
}

function updateCastlingRightsAfterCapture(capturedPiece, atSquare) {
  const color = capturedPiece[0];
  const info = castling[color];
  if (!info) return;
  if (capturedPiece[1] === 'R' && atSquare.row === info.kingStart.row) {
    if (atSquare.col === info.rookKCol) info.rookKMoved = true;
    if (atSquare.col === info.rookQCol) info.rookQMoved = true;
  }
}

function isSquareAttackedBy(square, byColor) {
  const rows = 8;
  const cols = gameMode === 'capablanca' ? 10 : 8;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p = board[r][c];
      if (!p || p[0] !== byColor) continue;
      if (gameMode === 'atomic' && (square.row === r && square.col === c)) continue; // cannot attack own square
      if (canPieceAttackSquare({ row: r, col: c }, square, p)) return true;
    }
  }
  return false;
}

function canPieceAttackSquare(from, to, piece) {
  const dr = to.row - from.row;
  const dc = to.col - from.col;
  switch (piece[1]) {
    case 'P': {
      const dir = piece[0] === 'w' ? -1 : 1;
      return dr === dir && Math.abs(dc) === 1;
    }
    case 'S': {
      const dir = piece[0] === 'w' ? -1 : 1;
      return dr === dir && dc === 0; // Berolina pawns attack straight forward
    }
    case 'N':
      return (Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2);
    case 'B':
      if (Math.abs(dr) !== Math.abs(dc)) return false;
      return isPathClear(from, to);
    case 'R':
      if (dr !== 0 && dc !== 0) return false;
      return isPathClear(from, to);
    case 'Q':
      if (dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc)) return isPathClear(from, to);
      return false;
    case 'K':
      return Math.max(Math.abs(dr), Math.abs(dc)) === 1;
    case 'C': // Chancellor: rook or knight
      if ((Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2)) return true;
      if (dr === 0 || dc === 0) return isPathClear(from, to);
      return false;
    case 'A': // Archbishop: bishop or knight
      if ((Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2)) return true;
      if (Math.abs(dr) === Math.abs(dc)) return isPathClear(from, to);
      return false;
    default:
      return false;
  }
}

// ----- Chess960 setup -----
function generateChess960Board() {
  const backWhite = generateChess960BackRank('w');
  const backBlack = backWhite.map(p => 'b' + p.slice(1)); // mirror for black (same layout by type)
  const board8 = Array.from({ length: 8 }, () => Array(8).fill(null));
  board8[0] = backBlack;
  board8[1] = Array(8).fill('bP');
  board8[6] = Array(8).fill('wP');
  board8[7] = backWhite;
  // Ensure middle rows null
  for (let r = 2; r <= 5; r++) board8[r] = Array(8).fill(null);
  return board8;
}

function generateChess960BackRank(color) {
  // build an array of 8 nulls and fill with piece codes
  const result = Array(8).fill(null);
  const place = (idx, piece) => { result[idx] = color + piece; };

  // 1) bishops on opposite colors
  const darkSquares = [0,2,4,6];
  const lightSquares = [1,3,5,7];
  const b1 = darkSquares[Math.floor(Math.random() * darkSquares.length)];
  place(b1, 'B');
  const lightChoices = lightSquares.filter(i => result[i] === null);
  const b2 = lightChoices[Math.floor(Math.random() * lightChoices.length)];
  place(b2, 'B');

  // 2) queen in a random empty square
  const empties1 = result.map((v,i)=>v?null:i).filter(v=>v!==null);
  const q = empties1[Math.floor(Math.random() * empties1.length)];
  place(q, 'Q');

  // 3) knights in two random empty squares
  let empties2 = result.map((v,i)=>v?null:i).filter(v=>v!==null);
  const n1Index = Math.floor(Math.random() * empties2.length);
  const n1 = empties2[n1Index];
  place(n1, 'N');
  empties2 = result.map((v,i)=>v?null:i).filter(v=>v!==null);
  const n2 = empties2[Math.floor(Math.random() * empties2.length)];
  place(n2, 'N');

  // 4) place rooks and king so king is between rooks
  let attempts = 0;
  while (true) {
    attempts++;
    if (attempts > 1000) break; // safety
    const empties = result.map((v,i)=>v?null:i).filter(v=>v!==null);
    const candidates = [...empties];
    const r1 = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0];
    const r2 = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0];
    const [a,b] = [Math.min(r1,r2), Math.max(r1,r2)];
    const middleSquares = [];
    for (let i = a + 1; i < b; i++) if (result[i] === null) middleSquares.push(i);
    if (middleSquares.length === 0) continue;
    const k = middleSquares[Math.floor(Math.random() * middleSquares.length)];
    place(r1, 'R');
    place(r2, 'R');
    place(k, 'K');
    break;
  }

  return result;
}

// ----- Resignation -----
function onResign() {
  if (gameState === 'checkmate' || gameState === 'stalemate' || gameState === 'resigned') return;
  resignedBy = currentPlayer;
  gameState = 'resigned';
  selected = null;
  renderBoard();
  updateStatus();
}

function startNewGame() {
  // Keep current mode and reinitialize board and state
  if (gameMode === 'capablanca') {
    board = [...CAPABLANCA_BOARD.map(row => [...row])];
  } else if (gameMode === 'chess960') {
    board = generateChess960Board();
  } else if (gameMode === 'berolina') {
    board = [...BEROLINA_BOARD.map(row => [...row])];
  } else {
    board = [...STANDARD_BOARD.map(row => [...row])];
  }
  if (gameMode === 'knightmate') {
    // Apply Knightmate swaps after base setup (standard-like)
    board[7][4] = 'wN';
    board[7][1] = 'wM';
    board[7][6] = 'wM';
    board[0][4] = 'bN';
    board[0][1] = 'bM';
    board[0][6] = 'bM';
  }
  currentPlayer = 'w';
  selected = null;
  lastMove = null;
  enPassantTarget = null;
  gameState = 'playing';
  dropSelection = null;
  pockets = { w: [], b: [] };
  resignedBy = null;
  if (resignButton) resignButton.disabled = false;
  initializeCastlingRights();
  winSoundPlayed = false;
  renderBoard();
  updateStatus();
  renderPockets();
  triggerBotMoveIfNeeded();
}

function startNewAnalysis() {
  // Reset to initial position for analysis
  if (gameMode === 'capablanca') {
    board = [...CAPABLANCA_BOARD.map(row => [...row])];
  } else if (gameMode === 'chess960') {
    board = generateChess960Board();
  } else if (gameMode === 'berolina') {
    board = [...BEROLINA_BOARD.map(row => [...row])];
  } else {
    board = [...STANDARD_BOARD.map(row => [...row])];
  }
  currentPlayer = 'w';
  selected = null;
  lastMove = null;
  enPassantTarget = null;
  gameState = 'playing';
  dropSelection = null;
  pockets = { w: [], b: [] };
  resignedBy = null;
  if (resignButton) resignButton.disabled = false;
  initializeCastlingRights();
  
  // Reset analysis variables
  moveHistory = [];
  currentMoveIndex = -1;
  winSoundPlayed = false;
  
  renderBoard();
  updateStatus();
  renderPockets();
  updateAnalysisControls();
}

// ----- Giveaway utilities -----
function countPieces(color) {
  const rows = 8;
  const cols = gameMode === 'capablanca' ? 10 : 8;
  let count = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p = board[r][c];
      if (p && p[0] === color) count++;
    }
  }
  return count;
}

function hasAnyCapture(color) {
  const rows = 8;
  const cols = gameMode === 'capablanca' ? 10 : 8;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p = board[r][c];
      if (!p || p[0] !== color) continue;
      for (let tr = 0; tr < rows; tr++) {
        for (let tc = 0; tc < cols; tc++) {
          const target = board[tr][tc];
          if (!target || target[0] === color) continue;
          if (canPieceAttackSquare({ row: r, col: c }, { row: tr, col: tc }, p)) return true;
        }
      }
    }
  }
  return false;
}

// ----- Menu and Navigation Functions -----
function initializeMenu() {
  // Prepare win sound lazily
  if (!winSound) {
    try {
      winSound = new Audio('ui assets/clappy.mp3');
      winSound.preload = 'auto';
      winSound.volume = 0.7;
    } catch (e) {}
  }
  // Add click handlers to menu items
  const menuItems = document.querySelectorAll('.menu-item');
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      const mode = item.dataset.mode;
      handleMenuSelection(mode);
    });
  });

  // Add click handlers to game controls
  const backToMenuBtn = document.getElementById('back-to-menu');
  const flipBoardBtn = document.getElementById('flip-board');
  
  backToMenuBtn.addEventListener('click', showMenu);
  flipBoardBtn.addEventListener('click', flipBoard);
}

function handleMenuSelection(mode) {
  switch(mode) {
    case 'play':
      startGame('standard');
      break;
    case 'bot':
      startGame('bot');
      break;
    case 'puzzles':
      startPuzzleMode();
      break;
    case 'analysis':
      startGame('analysis');
      break;
    case 'board-editor':
      startBoardEditor();
      break;
    case 'placeholder1':
    case 'placeholder2':
    case 'placeholder3':
      alert('This feature is coming soon!');
      break;
  }
}

function startGame(mode) {
  gameMode = mode;
  boardFlipped = false;
  
  // Set analysis mode
  analysisMode = (mode === 'analysis');
  botMode = (mode === 'bot');
  
  // Initialize bot color (default to black)
  if (botMode) {
    botColor = 'b';
  }
  
  // Initialize game state
  if (gameMode === 'capablanca') {
    board = [...CAPABLANCA_BOARD.map(row => [...row])];
  } else if (gameMode === 'chess960') {
    board = generateChess960Board();
  } else if (gameMode === 'berolina') {
    board = [...BEROLINA_BOARD.map(row => [...row])];
  } else {
    board = [...STANDARD_BOARD.map(row => [...row])];
  }
  
  currentPlayer = 'w';
  selected = null;
  lastMove = null;
  enPassantTarget = null;
  gameState = 'playing';
  dropSelection = null;
  pockets = { w: [], b: [] };
  initializeCastlingRights();
  resignedBy = null;
  
  // Reset analysis variables
  moveHistory = [];
  currentMoveIndex = -1;
  
  // Show game container and hide menu
  selectionMenu.style.display = 'none';
  gameContainer.style.display = 'flex';
  
  // Initialize UI and render
  initializeUI();
  renderBoard();
  updateStatus();
  renderPockets();
  triggerBotMoveIfNeeded();
}

function showMenu() {
  selectionMenu.style.display = 'flex';
  gameContainer.style.display = 'none';
}

function flipBoard() {
  boardFlipped = !boardFlipped;
  renderBoard();
}

// Analysis functions
function goBack() {
  if (currentMoveIndex > -1) {
    currentMoveIndex--;
    restorePosition();
  }
  updateAnalysisControls();
}

function goForward() {
  if (currentMoveIndex < moveHistory.length - 1) {
    currentMoveIndex++;
    restorePosition();
  }
  updateAnalysisControls();
}

function updateAnalysisControls() {
  const backButton = document.querySelector('#analysis-controls button:first-child');
  const forwardButton = document.querySelector('#analysis-controls button:last-child');
  
  if (backButton && forwardButton) {
    backButton.disabled = currentMoveIndex <= -1;
    forwardButton.disabled = currentMoveIndex >= moveHistory.length - 1;
  }
}

function restorePosition() {
  if (currentMoveIndex === -1) {
    // Restore initial position
    if (gameMode === 'capablanca') {
      board = [...CAPABLANCA_BOARD.map(row => [...row])];
    } else if (gameMode === 'chess960') {
      board = generateChess960Board();
    } else if (gameMode === 'berolina') {
      board = [...BEROLINA_BOARD.map(row => [...row])];
    } else {
      board = [...STANDARD_BOARD.map(row => [...row])];
    }
    currentPlayer = 'w';
    selected = null;
    lastMove = null;
    gameState = 'playing';
    dropSelection = null;
    pockets = { w: [], b: [] };
    initializeCastlingRights();
    resignedBy = null;
  } else {
    // Restore to specific move
    const moveData = moveHistory[currentMoveIndex];
    board = moveData.board.map(row => [...row]);
    currentPlayer = moveData.currentPlayer;
    selected = null;
    lastMove = moveData.lastMove;
    enPassantTarget = moveData.enPassantTarget || null;
    gameState = moveData.gameState;
    dropSelection = moveData.dropSelection;
    pockets = { ...moveData.pockets };
    castling = { ...moveData.castling };
    resignedBy = moveData.resignedBy;
  }
  
  renderBoard();
  updateStatus();
  renderPockets();
  triggerBotMoveIfNeeded();
}

function saveCurrentPosition() {
  const positionData = {
    board: board.map(row => [...row]),
    currentPlayer: currentPlayer,
    lastMove: lastMove,
    enPassantTarget: enPassantTarget ? { ...enPassantTarget } : null,
    gameState: gameState,
    dropSelection: dropSelection,
    pockets: { ...pockets },
    castling: { ...castling },
    resignedBy: resignedBy
  };
  
  // Remove any moves after current index
  moveHistory = moveHistory.slice(0, currentMoveIndex + 1);
  moveHistory.push(positionData);
  currentMoveIndex = moveHistory.length - 1;
  
  updateAnalysisControls();
}

// Update renderBoard to handle flipped orientation
function renderBoard() {
  boardElement.innerHTML = '';
  const rows = 8; // Both modes have 8 ranks
  const cols = gameMode === 'capablanca' ? 10 : 8; // Capablanca has 10 files
  
  // Update grid template to match board size
  boardElement.style.gridTemplateColumns = `repeat(${cols}, 60px)`;
  boardElement.style.gridTemplateRows = `repeat(${rows}, 60px)`;
  
  for (let displayRow = 0; displayRow < rows; displayRow++) {
    for (let displayCol = 0; displayCol < cols; displayCol++) {
      const square = document.createElement('div');
      
      // Convert display coordinates to logical coordinates
      const row = boardFlipped ? (rows - 1 - displayRow) : displayRow;
      const col = boardFlipped ? (cols - 1 - displayCol) : displayCol;
      
      square.className = 'square ' + ((displayRow + displayCol) % 2 === 0 ? 'white' : 'brown');
      square.dataset.row = row;
      square.dataset.col = col;
      
      if (selected && selected.row === row && selected.col === col) {
        square.classList.add('selected');
      }
      
      if (selected && isLegalMove(selected, {row, col})) {
        square.classList.add('move-option');
      }

      // Highlight crazyhouse drop options
      if (!selected && gameMode === 'crazyhouse' && dropSelection && isLegalDrop({ row, col })) {
        square.classList.add('move-option');
      }
      
      // Highlight king in check
      if (gameState === 'check' || gameState === 'checkmate') {
        const kingPos = findKing(currentPlayer);
        if (kingPos && kingPos.row === row && kingPos.col === col) {
          square.classList.add('in-check');
        }
      }
      
      const piece = board[row][col];
      if (piece) {
        const img = document.createElement('img');
        img.src = PIECES[piece];
        img.alt = piece;
        img.className = 'piece-img';
        img.onerror = function() {
          this.style.display = 'none';
          const unicodeSpan = document.createElement('span');
          unicodeSpan.textContent = UNICODE_PIECES[piece] || piece[1];
          unicodeSpan.className = 'piece-unicode';
          this.parentNode.appendChild(unicodeSpan);
        };
        square.appendChild(img);
      }
      
      square.addEventListener('click', () => onSquareClick(row, col));
      boardElement.appendChild(square);
    }
  }
}

// ----- Simple Random-Move Bot (plays Black) -----
function triggerBotMoveIfNeeded() {
  if (!botMode) return;
  if (analysisMode) return;
  if (gameState !== 'playing' && gameState !== 'check') return;
  if (currentPlayer !== botColor) return;
  // Delay a bit for UX
  setTimeout(() => makeMinimaxBotMove(botColor), 300);
}

function collectAllLegalMoves(color) {
  const rows = 8;
  const cols = gameMode === 'capablanca' ? 10 : 8;
  const moves = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p = board[r][c];
      if (!p || p[0] !== color) continue;
      for (let tr = 0; tr < rows; tr++) {
        for (let tc = 0; tc < cols; tc++) {
          if (isLegalMove({ row: r, col: c }, { row: tr, col: tc })) {
            moves.push({ from: { row: r, col: c }, to: { row: tr, col: tc } });
          }
        }
      }
    }
  }
  return moves;
}

function makeRandomBotMove(color) {
  if (gameState !== 'playing' && gameState !== 'check') return;
  if (currentPlayer !== color) return;
  const legalMoves = collectAllLegalMoves(color);
  if (legalMoves.length === 0) {
    checkGameState();
    updateStatus();
    return;
  }
  const choice = legalMoves[Math.floor(Math.random() * legalMoves.length)];

  // Execute the chosen move using existing helpers
  const moveOutcome = movePiece(choice.from, choice.to);
  if (moveOutcome.needsPromotion) {
    // Auto-promote to queen for the bot
    const pawn = board[choice.from.row][choice.from.col];
    board[choice.to.row][choice.to.col] = color + 'Q';
    board[choice.from.row][choice.from.col] = null;
    currentPlayer = currentPlayer === 'w' ? 'b' : 'w';
    lastMove = { from: choice.from, to: choice.to };
  } else {
    currentPlayer = currentPlayer === 'w' ? 'b' : 'w';
    lastMove = { from: choice.from, to: choice.to };
  }

  checkGameState();
  if (analysisMode) saveCurrentPosition();
  renderBoard();
  updateStatus();
  renderPockets();
}

// ----- Board Editor Functions -----
function startBoardEditor() {
  boardEditorMode = true;
  analysisMode = false;
  botMode = false;
  gameMode = 'standard';
  boardFlipped = false;
  
  // Initialize empty board for editing
  editorBoard = Array.from({ length: 8 }, () => Array(8).fill(null));
  board = editorBoard.map(row => [...row]);
  
  selectedPiece = null;
  selected = null;
  currentPlayer = 'w';
  lastMove = null;
  enPassantTarget = null;
  gameState = 'playing';
  dropSelection = null;
  pockets = { w: [], b: [] };
  initializeCastlingRights();
  resignedBy = null;
  
  // Show game container and hide menu
  selectionMenu.style.display = 'none';
  gameContainer.style.display = 'flex';
  
  // Initialize board editor UI
  initializeBoardEditorUI();
  renderBoard();
  renderBoardEditor();
}

function initializeBoardEditorUI() {
  // Clear any existing game controls first
  const existingGameControls = gameContainer.querySelector('.game-controls-wrapper');
  if (existingGameControls) {
    existingGameControls.remove();
  }
  
  // Create board editor controls
  const controls = document.createElement('div');
  controls.style.cssText = 'margin: 20px 0; text-align: center;';
  
  // Editor title
  const title = document.createElement('h2');
  title.textContent = 'Board Editor';
  title.style.cssText = 'margin: 0 0 20px 0; color: #3e3e3e; font-family: "Minecraftia", "Press Start 2P", "Courier New", Courier, monospace;';
  controls.appendChild(title);
  
  // Piece selection area
  const pieceSelection = document.createElement('div');
  pieceSelection.id = 'piece-selection';
  pieceSelection.style.cssText = 'display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin: 20px 0; padding: 15px; background: #f0f0f0; border: 2px solid #3e3e3e; border-radius: 8px;';
  
  // Add piece buttons
  const pieceTypes = ['K', 'Q', 'R', 'B', 'N', 'P'];
  const colors = ['w', 'b'];
  
  colors.forEach(color => {
    pieceTypes.forEach(pieceType => {
      const button = document.createElement('button');
      button.className = 'piece-select-button';
      button.dataset.piece = color + pieceType;
      
      const pieceCode = color + pieceType;
      if (PIECES[pieceCode]) {
        const img = document.createElement('img');
        img.src = PIECES[pieceCode];
        img.style.width = '30px';
        img.style.height = '30px';
        button.appendChild(img);
      } else {
        button.textContent = pieceType;
      }
      
      button.onclick = () => selectPieceForEditor(pieceCode);
      pieceSelection.appendChild(button);
    });
  });
  
  // Add clear button
  const clearButton = document.createElement('button');
  clearButton.textContent = 'Clear Square';
  clearButton.className = 'action-button';
  clearButton.onclick = () => selectPieceForEditor(null);
  pieceSelection.appendChild(clearButton);
  
  controls.appendChild(pieceSelection);
  
  // Editor controls
  const editorControls = document.createElement('div');
  editorControls.style.cssText = 'display: flex; gap: 10px; justify-content: center; align-items: center; margin: 20px 0;';
  
  const clearBoardButton = document.createElement('button');
  clearBoardButton.className = 'action-button';
  clearBoardButton.textContent = 'Clear Board';
  clearBoardButton.onclick = clearEditorBoard;
  editorControls.appendChild(clearBoardButton);
  
  const resetBoardButton = document.createElement('button');
  resetBoardButton.className = 'action-button';
  resetBoardButton.textContent = 'Reset to Start';
  resetBoardButton.onclick = resetEditorBoard;
  editorControls.appendChild(resetBoardButton);
  
  const savePositionButton = document.createElement('button');
  savePositionButton.className = 'action-button';
  savePositionButton.textContent = 'Save Position';
  savePositionButton.onclick = saveEditorPosition;
  editorControls.appendChild(savePositionButton);
  
  const loadPositionButton = document.createElement('button');
  loadPositionButton.className = 'action-button';
  loadPositionButton.textContent = 'Load Position';
  loadPositionButton.onclick = loadEditorPosition;
  editorControls.appendChild(loadPositionButton);
  
  const playFromHereButton = document.createElement('button');
  playFromHereButton.className = 'action-button';
  playFromHereButton.textContent = 'Play from Here';
  playFromHereButton.onclick = playFromEditorPosition;
  editorControls.appendChild(playFromHereButton);
  
  const saveFenButton = document.createElement('button');
  saveFenButton.className = 'action-button';
  saveFenButton.textContent = 'Save as FEN';
  saveFenButton.onclick = saveAsFEN;
  editorControls.appendChild(saveFenButton);
  
  const loadFenButton = document.createElement('button');
  loadFenButton.className = 'action-button';
  loadFenButton.textContent = 'Load FEN';
  loadFenButton.onclick = loadFromFEN;
  editorControls.appendChild(loadFenButton);
  
  controls.appendChild(editorControls);
  
  // Instructions
  const instructions = document.createElement('div');
  instructions.style.cssText = 'margin: 15px 0; padding: 10px; background: #e8f4f8; border: 1px solid #3e3e3e; border-radius: 4px; font-size: 12px; color: #3e3e3e;';
  instructions.innerHTML = '<strong>Instructions:</strong> Select a piece from above, then click on the board to place it. Click "Clear Square" to remove pieces.';
  controls.appendChild(instructions);
  
  // Insert controls before the board in the game container
  const gameControls = document.createElement('div');
  gameControls.className = 'game-controls-wrapper';
  gameControls.style.cssText = 'margin: 20px 0; text-align: center;';
  gameControls.appendChild(controls);
  gameContainer.insertBefore(gameControls, boardElement);
}

function selectPieceForEditor(piece) {
  selectedPiece = piece;
  
  // Update visual selection
  const buttons = document.querySelectorAll('.piece-select-button');
  buttons.forEach(btn => {
    btn.classList.remove('selected');
    if (btn.dataset.piece === piece) {
      btn.classList.add('selected');
    }
  });
  
  // Clear any existing piece selection on board
  selected = null;
  renderBoard();
}

function onEditorSquareClick(row, col) {
  if (!boardEditorMode) return;
  
  if (selectedPiece) {
    // Place piece
    editorBoard[row][col] = selectedPiece;
    board[row][col] = selectedPiece;
  } else {
    // Clear square
    editorBoard[row][col] = null;
    board[row][col] = null;
  }
  
  renderBoard();
}

function clearEditorBoard() {
  editorBoard = Array.from({ length: 8 }, () => Array(8).fill(null));
  board = editorBoard.map(row => [...row]);
  renderBoard();
}

function resetEditorBoard() {
  editorBoard = [...STANDARD_BOARD.map(row => [...row])];
  board = editorBoard.map(row => [...row]);
  renderBoard();
}

function saveEditorPosition() {
  const position = {
    board: editorBoard.map(row => [...row]),
    timestamp: new Date().toISOString()
  };
  
  const positions = JSON.parse(localStorage.getItem('chessPositions') || '[]');
  positions.push(position);
  localStorage.setItem('chessPositions', JSON.stringify(positions));
  
  alert('Position saved! You can load it later from the "Load Position" button.');
}

function loadEditorPosition() {
  const positions = JSON.parse(localStorage.getItem('chessPositions') || '[]');
  
  if (positions.length === 0) {
    alert('No saved positions found.');
    return;
  }
  
  // Create a simple selection dialog
  const dialog = document.createElement('div');
  dialog.className = 'promotion-dialog';
  dialog.style.width = '400px';
  
  dialog.innerHTML = '<h3>Select Position to Load:</h3>';
  
  positions.forEach((pos, index) => {
    const button = document.createElement('button');
    button.className = 'promotion-button';
    button.style.width = '100%';
    button.style.margin = '5px 0';
    button.textContent = `Position ${index + 1} - ${new Date(pos.timestamp).toLocaleString()}`;
    
    button.onclick = () => {
      editorBoard = pos.board.map(row => [...row]);
      board = editorBoard.map(row => [...row]);
      renderBoard();
      document.body.removeChild(dialog);
    };
    
    dialog.appendChild(button);
  });
  
  const cancelButton = document.createElement('button');
  cancelButton.className = 'promotion-button';
  cancelButton.style.width = '100%';
  cancelButton.textContent = 'Cancel';
  cancelButton.onclick = () => document.body.removeChild(dialog);
  dialog.appendChild(cancelButton);
  
  document.body.appendChild(dialog);
}

function playFromEditorPosition() {
  if (!boardEditorMode) return;
  
  // Validate that both kings are present
  let whiteKing = false, blackKing = false;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = editorBoard[row][col];
      if (piece === 'wK') whiteKing = true;
      if (piece === 'bK') blackKing = true;
    }
  }
  
  if (!whiteKing || !blackKing) {
    alert('Both kings must be present to start a game!');
    return;
  }
  
  // Exit editor mode and start a game with the current position
  boardEditorMode = false;
  analysisMode = false;
  botMode = false;
  gameMode = 'standard';
  
  // Copy editor board to main board
  board = editorBoard.map(row => [...row]);
  
  // Reset game state
  currentPlayer = 'w';
  selected = null;
  lastMove = null;
  enPassantTarget = null;
  gameState = 'playing';
  dropSelection = null;
  pockets = { w: [], b: [] };
  initializeCastlingRights();
  resignedBy = null;
  winSoundPlayed = false;
  
  // Reinitialize UI for game mode
  initializeUI();
  renderBoard();
  updateStatus();
  renderPockets();
}

function renderBoardEditor() {
  // This function is called to update the editor display
  // The main renderBoard function handles the actual rendering
}

// ----- PGN Export/Import Functions -----
function saveAsPGN() {
  if (!analysisMode || moveHistory.length === 0) {
    alert('No moves to export. Play some moves first!');
    return;
  }
  
  // Generate PGN from move history
  const pgn = generatePGN();
  
  // Create and download file
  const blob = new Blob([pgn], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chess_game_${new Date().toISOString().slice(0, 10)}.pgn`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generatePGN() {
  let pgn = '';
  
  // PGN header
  pgn += '[Event "Furr Chess Game"]\n';
  pgn += `[Site "Furr Chess"]\n`;
  pgn += `[Date "${new Date().toISOString().slice(0, 10)}"]\n`;
  pgn += '[Round "1"]\n';
  pgn += '[White "Player"]\n';
  pgn += '[Black "Player"]\n';
  pgn += `[Result "*"]\n`;
  pgn += `[Variant "${gameMode}"]\n`;
  pgn += '\n';
  
  // Generate moves from move history
  const moves = [];
  for (let i = 0; i < moveHistory.length - 1; i++) {
    const currentPos = moveHistory[i];
    const nextPos = moveHistory[i + 1];
    const move = findMoveBetweenPositions(currentPos, nextPos);
    if (move) {
      moves.push(move);
    }
  }
  
  // Format moves
  for (let i = 0; i < moves.length; i += 2) {
    const moveNumber = Math.floor(i / 2) + 1;
    pgn += `${moveNumber}. ${moves[i]}`;
    if (moves[i + 1]) {
      pgn += ` ${moves[i + 1]}`;
    }
    pgn += ' ';
  }
  
  pgn += '\n\n*';
  
  return pgn;
}

function findMoveBetweenPositions(fromPos, toPos) {
  // Find the move that was made between two positions
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const fromPiece = fromPos.board[row][col];
      const toPiece = toPos.board[row][col];
      
      if (fromPiece && !toPiece) {
        // Piece was removed from this square
        for (let toRow = 0; toRow < 8; toRow++) {
          for (let toCol = 0; toCol < 8; toCol++) {
            const fromToPiece = fromPos.board[toRow][toCol];
            const toToPiece = toPos.board[toRow][toCol];
            
            if (!fromToPiece && toToPiece === fromPiece) {
              // Found the destination
              return formatMoveNotation(fromPiece, { row, col }, { row: toRow, col: toCol }, toPos.board);
            }
          }
        }
      }
    }
  }
  return null;
}

function formatMoveNotation(piece, from, to, board) {
  const pieceType = piece[1];
  const color = piece[0];
  const fromFile = String.fromCharCode(97 + from.col); // a-h
  const fromRank = 8 - from.row; // 1-8
  const toFile = String.fromCharCode(97 + to.col);
  const toRank = 8 - to.row;
  
  // Check for capture
  const captured = board[to.row][to.col];
  const capture = captured ? 'x' : '';
  
  // Check for check/checkmate (simplified)
  const isCheck = isKingInCheckAfterMove(color === 'w' ? 'b' : 'w', board);
  const checkSuffix = isCheck ? '+' : '';
  
  if (pieceType === 'P') {
    // Pawn move
    if (captured) {
      return `${fromFile}${capture}${toFile}${toRank}${checkSuffix}`;
    } else {
      return `${toFile}${toRank}${checkSuffix}`;
    }
  } else {
    // Piece move
    const pieceSymbol = pieceType === 'K' ? 'K' : pieceType === 'Q' ? 'Q' : 
                       pieceType === 'R' ? 'R' : pieceType === 'B' ? 'B' : 'N';
    return `${pieceSymbol}${capture}${toFile}${toRank}${checkSuffix}`;
  }
}

function isKingInCheckAfterMove(color, board) {
  // Simplified check detection
  const kingPos = findKing(color);
  if (!kingPos) return false;
  
  const opponentColor = color === 'w' ? 'b' : 'w';
  return isSquareAttackedBy(kingPos, opponentColor);
}

function loadFromPGN() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pgn';
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const pgnContent = e.target.result;
        parseAndLoadPGN(pgnContent);
      };
      reader.readAsText(file);
    }
  };
  input.click();
}

function parseAndLoadPGN(pgnContent) {
  // Simple PGN parser - this is a basic implementation
  const lines = pgnContent.split('\n');
  const moves = [];
  
  // Find the moves section (after empty line)
  let inMoves = false;
  for (const line of lines) {
    if (line.trim() === '') {
      inMoves = true;
      continue;
    }
    if (inMoves && !line.startsWith('[')) {
      // Parse moves from this line
      const moveMatches = line.match(/\d+\.\s*([^\s]+)\s*([^\s]*)/g);
      if (moveMatches) {
        for (const match of moveMatches) {
          const parts = match.split(/\s+/);
          if (parts.length > 1) moves.push(parts[1]); // White move
          if (parts.length > 2) moves.push(parts[2]); // Black move
        }
      }
    }
  }
  
  if (moves.length === 0) {
    alert('No moves found in PGN file.');
    return;
  }
  
  // Reset to starting position
  startNewAnalysis();
  
  // Apply moves one by one (this would need more sophisticated parsing)
  alert(`Found ${moves.length} moves in PGN. Full PGN parsing is complex and would require a chess library. For now, you can manually recreate the position using the board editor.`);
}

// ----- FEN Export/Import Functions -----
function saveAsFEN() {
  if (!boardEditorMode) {
    alert('FEN export is only available in board editor mode.');
    return;
  }
  
  const fen = generateFEN(editorBoard);
  
  // Copy to clipboard
  navigator.clipboard.writeText(fen).then(() => {
    alert('FEN copied to clipboard!\n\n' + fen);
  }).catch(() => {
    // Fallback: show in dialog
    const dialog = document.createElement('div');
    dialog.className = 'promotion-dialog';
    dialog.style.width = '500px';
    
    dialog.innerHTML = `
      <h3>FEN Position</h3>
      <textarea readonly style="width: 100%; height: 100px; font-family: monospace; font-size: 12px; margin: 10px 0;">${fen}</textarea>
      <button class="promotion-button" onclick="navigator.clipboard.writeText('${fen}').then(() => alert('Copied!'))">Copy to Clipboard</button>
      <button class="promotion-button" onclick="document.body.removeChild(this.parentNode)">Close</button>
    `;
    
    document.body.appendChild(dialog);
  });
}

function generateFEN(board) {
  let fen = '';
  
  // Board position
  for (let row = 0; row < 8; row++) {
    let emptyCount = 0;
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece) {
        if (emptyCount > 0) {
          fen += emptyCount;
          emptyCount = 0;
        }
        // Convert piece notation to FEN
        const fenPiece = piece[0] === 'w' ? piece[1].toUpperCase() : piece[1].toLowerCase();
        fen += fenPiece;
      } else {
        emptyCount++;
      }
    }
    if (emptyCount > 0) {
      fen += emptyCount;
    }
    if (row < 7) fen += '/';
  }
  
  // Active color (assume white to move)
  fen += ' w ';
  
  // Castling rights (simplified - assume all available)
  fen += 'KQkq ';
  
  // En passant target square (none)
  fen += '- ';
  
  // Halfmove clock
  fen += '0 ';
  
  // Fullmove number
  fen += '1';
  
  return fen;
}

function loadFromFEN() {
  const fen = prompt('Enter FEN string:');
  if (!fen) return;
  
  try {
    const parsedBoard = parseFEN(fen);
    if (parsedBoard) {
      editorBoard = parsedBoard;
      board = parsedBoard.map(row => [...row]);
      renderBoard();
      alert('FEN loaded successfully!');
    } else {
      alert('Invalid FEN string.');
    }
  } catch (e) {
    alert('Error parsing FEN: ' + e.message);
  }
}

function parseFEN(fen) {
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 1) return null;
  
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  const ranks = parts[0].split('/');
  
  if (ranks.length !== 8) return null;
  
  for (let row = 0; row < 8; row++) {
    let col = 0;
    for (const char of ranks[row]) {
      if (char >= '1' && char <= '8') {
        // Empty squares
        col += parseInt(char);
      } else {
        // Piece
        if (col >= 8) return null;
        
        const isWhite = char === char.toUpperCase();
        const pieceType = char.toUpperCase();
        
        let pieceCode;
        switch (pieceType) {
          case 'K': pieceCode = 'K'; break;
          case 'Q': pieceCode = 'Q'; break;
          case 'R': pieceCode = 'R'; break;
          case 'B': pieceCode = 'B'; break;
          case 'N': pieceCode = 'N'; break;
          case 'P': pieceCode = 'P'; break;
          default: return null;
        }
        
        board[row][col] = (isWhite ? 'w' : 'b') + pieceCode;
        col++;
      }
    }
    if (col !== 8) return null;
  }
  
  return board;
}

// ----- Minimax Bot Functions -----
let botColor = 'b'; // Default bot plays black
let botDepth = 25; // Minimax depth
let transpositionTable = new Map(); // Cache for position evaluations

// Piece values for evaluation
const PIECE_VALUES = {
  'P': 100, 'N': 320, 'B': 330, 'R': 500, 'Q': 900, 'K': 20000,
  'S': 100, // Berolina pawn
  'C': 820, // Chancellor (Rook + Knight)
  'A': 650, // Archbishop (Bishop + Knight)
  'M': 20000 // Knightmate non-royal king
};

// Position values for piece-square tables (simplified)
const POSITION_VALUES = {
  'P': [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5,  5, 10, 25, 25, 10,  5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-20,-20, 10, 10,  5],
    [0,  0,  0,  0,  0,  0,  0,  0]
  ],
  'N': [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
  ],
  'B': [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
  ],
  'R': [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [0,  0,  0,  5,  5,  0,  0,  0]
  ],
  'Q': [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [-5,  0,  5,  5,  5,  5,  0, -5],
    [0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
  ],
  'K': [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20, 20,  0,  0,  0,  0, 20, 20],
    [20, 30, 10,  0,  0, 10, 30, 20]
  ]
};

function evaluatePosition(board) {
  let score = 0;
  
  // Material and positional evaluation
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;
      
      const color = piece[0];
      const pieceType = piece[1];
      const value = PIECE_VALUES[pieceType] || 0;
      
      // Position value
      let positionValue = 0;
      if (POSITION_VALUES[pieceType]) {
        const posRow = color === 'w' ? 7 - row : row;
        positionValue = POSITION_VALUES[pieceType][posRow][col] || 0;
      }
      
      // Simplified evaluation for speed - only use basic factors
      const centerControl = calculateCenterControl(row, col, pieceType);
      
      // Add to score (positive for white, negative for black)
      const pieceScore = value + positionValue + centerControl;
      score += color === 'w' ? pieceScore : -pieceScore;
    }
  }
  
  // Simplified additional factors for speed
  score += evaluatePawnStructure(board);
  
  return score;
}

function calculateMobility(board, row, col, piece) {
  const legalMoves = [];
  const pieceType = piece[1];
  const color = piece[0];
  
  // Count legal moves for this piece
  for (let toRow = 0; toRow < 8; toRow++) {
    for (let toCol = 0; toCol < 8; toCol++) {
      if (isLegalMove({row, col}, {row: toRow, col: toCol})) {
        legalMoves.push({row: toRow, col: toCol});
      }
    }
  }
  
  // Mobility bonus based on piece type
  const mobilityBonus = {
    'P': 2, 'N': 3, 'B': 3, 'R': 2, 'Q': 1, 'K': 1,
    'S': 2, 'C': 3, 'A': 3, 'M': 1
  };
  
  return legalMoves.length * (mobilityBonus[pieceType] || 1);
}

function calculateCenterControl(row, col, pieceType) {
  const centerSquares = [[3,3], [3,4], [4,3], [4,4]];
  const extendedCenter = [[2,2], [2,3], [2,4], [2,5], [3,2], [3,5], [4,2], [4,5], [5,2], [5,3], [5,4], [5,5]];
  
  let centerBonus = 0;
  
  // Check if piece controls center squares
  for (const [centerRow, centerCol] of centerSquares) {
    if (Math.abs(row - centerRow) <= 1 && Math.abs(col - centerCol) <= 1) {
      centerBonus += 10;
    }
  }
  
  // Extended center bonus
  for (const [extRow, extCol] of extendedCenter) {
    if (Math.abs(row - extRow) <= 2 && Math.abs(col - extCol) <= 2) {
      centerBonus += 5;
    }
  }
  
  return centerBonus;
}

function calculateKingSafety(board, row, col, piece, color) {
  if (piece[1] !== 'K') return 0;
  
  let safety = 0;
  
  // King in corner penalty
  if ((row === 0 || row === 7) && (col === 0 || col === 7)) {
    safety -= 20;
  }
  
  // King in center penalty (early game)
  if (row >= 3 && row <= 4 && col >= 3 && col <= 4) {
    safety -= 15;
  }
  
  // Pawn shield bonus
  const pawnShield = countPawnShield(board, row, col, color);
  safety += pawnShield * 5;
  
  return safety;
}

function countPawnShield(board, kingRow, kingCol, color) {
  let shieldCount = 0;
  const direction = color === 'w' ? 1 : -1;
  
  // Check pawns in front of king
  for (let col = Math.max(0, kingCol - 1); col <= Math.min(7, kingCol + 1); col++) {
    const pawnRow = kingRow + direction;
    if (pawnRow >= 0 && pawnRow <= 7) {
      const piece = board[pawnRow][col];
      if (piece === color + 'P' || piece === color + 'S') {
        shieldCount++;
      }
    }
  }
  
  return shieldCount;
}

function evaluatePawnStructure(board) {
  let score = 0;
  
  // Doubled pawns penalty
  for (let col = 0; col < 8; col++) {
    let whitePawns = 0, blackPawns = 0;
    for (let row = 0; row < 8; row++) {
      const piece = board[row][col];
      if (piece === 'wP' || piece === 'wS') whitePawns++;
      if (piece === 'bP' || piece === 'bS') blackPawns++;
    }
    if (whitePawns > 1) score -= 20 * (whitePawns - 1);
    if (blackPawns > 1) score += 20 * (blackPawns - 1);
  }
  
  // Passed pawns bonus
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece === 'wP' || piece === 'wS') {
        if (isPassedPawn(board, row, col, 'w')) {
          score += 50 + (7 - row) * 10; // Bonus increases with advancement
        }
      } else if (piece === 'bP' || piece === 'bS') {
        if (isPassedPawn(board, row, col, 'b')) {
          score -= 50 + row * 10;
        }
      }
    }
  }
  
  return score;
}

function isPassedPawn(board, row, col, color) {
  const direction = color === 'w' ? -1 : 1;
  const opponentColor = color === 'w' ? 'b' : 'w';
  
  // Check if there are opponent pawns in front
  for (let checkRow = row + direction; checkRow >= 0 && checkRow <= 7; checkRow += direction) {
    for (let checkCol = Math.max(0, col - 1); checkCol <= Math.min(7, col + 1); checkCol++) {
      const piece = board[checkRow][checkCol];
      if (piece === opponentColor + 'P' || piece === opponentColor + 'S') {
        return false;
      }
    }
  }
  
  return true;
}

function evaluateKingSafety(board) {
  let score = 0;
  
  // Find kings
  let whiteKing = null, blackKing = null;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece === 'wK') whiteKing = {row, col};
      if (piece === 'bK') blackKing = {row, col};
    }
  }
  
  if (whiteKing) {
    const whiteSafety = evaluateKingPosition(board, whiteKing.row, whiteKing.col, 'w');
    score += whiteSafety;
  }
  
  if (blackKing) {
    const blackSafety = evaluateKingPosition(board, blackKing.row, blackKing.col, 'b');
    score -= blackSafety;
  }
  
  return score;
}

function evaluateKingPosition(board, row, col, color) {
  let safety = 0;
  
  // Count attacking pieces near king
  const opponentColor = color === 'w' ? 'b' : 'w';
  let attackers = 0;
  
  for (let checkRow = Math.max(0, row - 2); checkRow <= Math.min(7, row + 2); checkRow++) {
    for (let checkCol = Math.max(0, col - 2); checkCol <= Math.min(7, col + 2); checkCol++) {
      const piece = board[checkRow][checkCol];
      if (piece && piece[0] === opponentColor) {
        if (canPieceAttackSquare({row: checkRow, col: checkCol}, {row, col}, piece)) {
          attackers++;
        }
      }
    }
  }
  
  safety -= attackers * 15;
  
  return safety;
}

function evaluatePieceActivity(board) {
  let score = 0;
  
  // Count developed pieces
  let whiteDeveloped = 0, blackDeveloped = 0;
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;
      
      const color = piece[0];
      const pieceType = piece[1];
      
      // Count pieces that have moved from starting position
      if (pieceType !== 'P' && pieceType !== 'S') {
        if (color === 'w' && row < 7) whiteDeveloped++;
        if (color === 'b' && row > 0) blackDeveloped++;
      }
    }
  }
  
  score += (whiteDeveloped - blackDeveloped) * 10;
  
  return score;
}

function minimax(board, depth, isMaximizing, alpha = -Infinity, beta = Infinity) {
  // Generate board hash for transposition table
  const boardHash = generateBoardHash(board);
  
  // Check transposition table
  if (transpositionTable.has(boardHash)) {
    const entry = transpositionTable.get(boardHash);
    if (entry.depth >= depth) {
      return entry.score;
    }
  }
  
  // Base case: depth reached or game over
  if (depth === 0) {
    return quiescenceSearch(board, alpha, beta, 2); // Reduced quiescence depth for speed
  }
  
  const currentPlayer = isMaximizing ? botColor : (botColor === 'w' ? 'b' : 'w');
  const legalMoves = collectAllLegalMoves(currentPlayer);
  
  // Check for game over
  if (legalMoves.length === 0) {
    if (isKingInCheck(currentPlayer)) {
      // Checkmate
      return isMaximizing ? -20000 : 20000;
    } else {
      // Stalemate
      return 0;
    }
  }
  
  // Sort moves for better move ordering
  const sortedMoves = sortMoves(board, legalMoves, currentPlayer);
  
  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of sortedMoves) {
      // Make move
      const originalPiece = board[move.to.row][move.to.col];
      const movingPiece = board[move.from.row][move.from.col];
      board[move.to.row][move.to.col] = movingPiece;
      board[move.from.row][move.from.col] = null;
      
      // Recursive call
      const eval = minimax(board, depth - 1, false, alpha, beta);
      maxEval = Math.max(maxEval, eval);
      alpha = Math.max(alpha, eval);
      
      // Undo move
      board[move.from.row][move.from.col] = movingPiece;
      board[move.to.row][move.to.col] = originalPiece;
      
      // Alpha-beta pruning
      if (beta <= alpha) break;
    }
    
    // Store in transposition table
    transpositionTable.set(boardHash, { score: maxEval, depth: depth });
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of sortedMoves) {
      // Make move
      const originalPiece = board[move.to.row][move.to.col];
      const movingPiece = board[move.from.row][move.from.col];
      board[move.to.row][move.to.col] = movingPiece;
      board[move.from.row][move.from.col] = null;
      
      // Recursive call
      const eval = minimax(board, depth - 1, true, alpha, beta);
      minEval = Math.min(minEval, eval);
      beta = Math.min(beta, eval);
      
      // Undo move
      board[move.from.row][move.from.col] = movingPiece;
      board[move.to.row][move.to.col] = originalPiece;
      
      // Alpha-beta pruning
      if (beta <= alpha) break;
    }
    
    // Store in transposition table
    transpositionTable.set(boardHash, { score: minEval, depth: depth });
    return minEval;
  }
}

function quiescenceSearch(board, alpha, beta, depth) {
  if (depth === 0) {
    return evaluatePosition(board);
  }
  
  const standPat = evaluatePosition(board);
  
  if (standPat >= beta) {
    return beta;
  }
  
  if (standPat > alpha) {
    alpha = standPat;
  }
  
  // Only consider captures and checks in quiescence search
  const captures = collectCaptures(board);
  
  for (const move of captures) {
    // Make move
    const originalPiece = board[move.to.row][move.to.col];
    const movingPiece = board[move.from.row][move.from.col];
    board[move.to.row][move.to.col] = movingPiece;
    board[move.from.row][move.from.col] = null;
    
    // Recursive call
    const eval = -quiescenceSearch(board, -beta, -alpha, depth - 1);
    
    // Undo move
    board[move.from.row][move.from.col] = movingPiece;
    board[move.to.row][move.to.col] = originalPiece;
    
    if (eval >= beta) {
      return beta;
    }
    
    if (eval > alpha) {
      alpha = eval;
    }
  }
  
  return alpha;
}

function collectCaptures(board) {
  const captures = [];
  const currentPlayer = currentPlayer === 'w' ? 'b' : 'w'; // Opposite of current player
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece[0] === currentPlayer) {
        for (let toRow = 0; toRow < 8; toRow++) {
          for (let toCol = 0; toCol < 8; toCol++) {
            const target = board[toRow][toCol];
            if (target && target[0] !== currentPlayer) {
              if (isLegalMove({row, col}, {row: toRow, col: toCol})) {
                captures.push({ from: {row, col}, to: {row: toRow, col: toCol} });
              }
            }
          }
        }
      }
    }
  }
  
  return captures;
}

function generateBoardHash(board) {
  let hash = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      hash += piece ? piece : '--';
    }
  }
  return hash;
}

function getBestMove(board, color) {
  const legalMoves = collectAllLegalMoves(color);
  if (legalMoves.length === 0) return null;
  
  // Sort moves for better move ordering (captures first, then other moves)
  const sortedMoves = sortMoves(board, legalMoves, color);
  
  let bestMove = null;
  let bestScore = color === botColor ? -Infinity : Infinity;
  
  // Optimized iterative deepening with time management
  const startTime = Date.now();
  const maxTime = botDepth <= 5 ? 2000 : botDepth <= 10 ? 3000 : 5000; // Adaptive time based on depth
  
  // Clear transposition table periodically for memory management
  if (transpositionTable.size > 10000) {
    transpositionTable.clear();
  }
  
  for (let depth = 1; depth <= botDepth; depth++) {
    let currentBestMove = null;
    let currentBestScore = color === botColor ? -Infinity : Infinity;
    
    for (const move of sortedMoves) {
      // Check time limit
      if (Date.now() - startTime > maxTime) {
        break;
      }
      
      // Make move
      const originalPiece = board[move.to.row][move.to.col];
      const movingPiece = board[move.from.row][move.from.col];
      board[move.to.row][move.to.col] = movingPiece;
      board[move.from.row][move.from.col] = null;
      
      // Evaluate position with adaptive depth reduction
      const searchDepth = Math.min(depth, Math.max(1, Math.floor(botDepth * 0.6))); // Adaptive depth
      const score = minimax(board, searchDepth, color !== botColor, -Infinity, Infinity);
      
      // Undo move
      board[move.from.row][move.from.col] = movingPiece;
      board[move.to.row][move.to.col] = originalPiece;
      
      // Update best move
      if (color === botColor) {
        if (score > currentBestScore) {
          currentBestScore = score;
          currentBestMove = move;
        }
      } else {
        if (score < currentBestScore) {
          currentBestScore = score;
          currentBestMove = move;
        }
      }
    }
    
    // Update global best if we found a better move at this depth
    if (currentBestMove) {
      bestMove = currentBestMove;
      bestScore = currentBestScore;
    }
    
    // Break if we're running out of time or found a winning move
    if (Date.now() - startTime > maxTime * 0.8 || Math.abs(bestScore) > 10000) {
      break;
    }
  }
  
  return bestMove;
}

function sortMoves(board, moves, color) {
  return moves.sort((a, b) => {
    // Prioritize captures
    const aCapture = board[a.to.row][a.to.col] ? 1 : 0;
    const bCapture = board[b.to.row][b.to.col] ? 1 : 0;
    
    if (aCapture !== bCapture) {
      return bCapture - aCapture; // Captures first
    }
    
    // Prioritize captures of higher value pieces
    if (aCapture && bCapture) {
      const aValue = getPieceValue(board[a.to.row][a.to.col]);
      const bValue = getPieceValue(board[b.to.row][b.to.col]);
      return bValue - aValue;
    }
    
    // Prioritize center moves
    const aCenter = isCenterMove(a.to);
    const bCenter = isCenterMove(b.to);
    if (aCenter !== bCenter) {
      return bCenter - aCenter;
    }
    
    // Prioritize developing moves
    const aDevelop = isDevelopingMove(board, a, color);
    const bDevelop = isDevelopingMove(board, b, color);
    if (aDevelop !== bDevelop) {
      return bDevelop - aDevelop;
    }
    
    return 0;
  });
}

function getPieceValue(piece) {
  if (!piece) return 0;
  return PIECE_VALUES[piece[1]] || 0;
}

function isCenterMove(square) {
  const centerSquares = [[3,3], [3,4], [4,3], [4,4]];
  return centerSquares.some(([row, col]) => 
    Math.abs(square.row - row) <= 1 && Math.abs(square.col - col) <= 1
  );
}

function isDevelopingMove(board, move, color) {
  const piece = board[move.from.row][move.from.col];
  if (!piece || piece[0] !== color) return false;
  
  const pieceType = piece[1];
  const fromRow = move.from.row;
  
  // Check if piece is moving from starting position
  if (pieceType === 'N' || pieceType === 'B') {
    const startingRow = color === 'w' ? 7 : 0;
    return fromRow === startingRow;
  }
  
  return false;
}

function makeMinimaxBotMove(color) {
  if (gameState !== 'playing' && gameState !== 'check') return;
  if (currentPlayer !== color) return;
  
  // Show thinking indicator
  if (statusDisplay) {
    statusDisplay.textContent = `${color === 'w' ? 'White' : 'Black'} bot is thinking...`;
    statusDisplay.style.color = '#666';
  }
  
  // Use setTimeout to prevent UI blocking but with minimal delay
  setTimeout(() => {
    const bestMove = getBestMove(board, color);
    
    if (!bestMove) {
      checkGameState();
      updateStatus();
      return;
    }
    
    // Execute the best move
    const moveOutcome = movePiece(bestMove.from, bestMove.to);
    if (moveOutcome.needsPromotion) {
      // Auto-promote to queen for the bot
      board[bestMove.to.row][bestMove.to.col] = color + 'Q';
      board[bestMove.from.row][bestMove.from.col] = null;
      currentPlayer = currentPlayer === 'w' ? 'b' : 'w';
      lastMove = { from: bestMove.from, to: bestMove.to };
    } else {
      currentPlayer = currentPlayer === 'w' ? 'b' : 'w';
      lastMove = { from: bestMove.from, to: bestMove.to };
    }
    
    checkGameState();
    if (analysisMode) saveCurrentPosition();
    renderBoard();
    updateStatus();
    renderPockets();
  }, 50); // Reduced delay for faster response
}

// ----- Rules Display System -----
function showRules() {
  const rules = getRulesForMode(gameMode);
  
  const dialog = document.createElement('div');
  dialog.className = 'promotion-dialog';
  dialog.style.cssText = 'max-width: 600px; max-height: 80vh; overflow-y: auto;';
  
  dialog.innerHTML = `
    <h3>Rules: ${rules.title}</h3>
    <div style="text-align: left; padding: 10px; line-height: 1.6;">
      ${rules.content}
    </div>
    <button class="promotion-button" onclick="document.body.removeChild(this.parentNode)" style="margin-top: 15px;">Close</button>
  `;
  
  document.body.appendChild(dialog);
}

function getRulesForMode(mode) {
  const rules = {
    standard: {
      title: 'Standard Chess',
      content: `
        <h4>Objective:</h4>
        <p>Checkmate your opponent's king.</p>
        
        <h4>Piece Movement:</h4>
        <ul>
          <li><strong>Pawn:</strong> Moves forward one square (two on first move), captures diagonally</li>
          <li><strong>Rook:</strong> Moves horizontally or vertically any number of squares</li>
          <li><strong>Knight:</strong> Moves in an L-shape (2 squares one direction, 1 square perpendicular)</li>
          <li><strong>Bishop:</strong> Moves diagonally any number of squares</li>
          <li><strong>Queen:</strong> Moves any number of squares in any direction</li>
          <li><strong>King:</strong> Moves one square in any direction</li>
        </ul>
        
        <h4>Special Rules:</h4>
        <ul>
          <li><strong>Castling:</strong> Move king two squares toward a rook, then move the rook to the square the king crossed</li>
          <li><strong>En Passant:</strong> Capture a pawn that just moved two squares forward</li>
          <li><strong>Promotion:</strong> Pawns reaching the 8th rank promote to any piece (usually Queen)</li>
        </ul>
      `
    },
    capablanca: {
      title: 'Capablanca Chess',
      content: `
        <h4>Objective:</h4>
        <p>Checkmate your opponent's king on a 10x8 board.</p>
        
        <h4>New Pieces:</h4>
        <ul>
          <li><strong>Chancellor (C):</strong> Combines Rook and Knight movement</li>
          <li><strong>Archbishop (A):</strong> Combines Bishop and Knight movement</li>
        </ul>
        
        <h4>Setup:</h4>
        <p>Back rank: R-N-A-B-Q-K-B-C-N-R (10 pieces)</p>
      `
    },
    chess960: {
      title: 'Chess960 (Fischer Random)',
      content: `
        <h4>Objective:</h4>
        <p>Same as standard chess, but with randomized starting positions.</p>
        
        <h4>Rules:</h4>
        <ul>
          <li>Back rank pieces are randomly arranged</li>
          <li>King must be between the two rooks</li>
          <li>Bishops must be on opposite colors</li>
          <li>All other standard chess rules apply</li>
        </ul>
      `
    },
    crazyhouse: {
      title: 'Crazyhouse',
      content: `
        <h4>Objective:</h4>
        <p>Checkmate your opponent's king.</p>
        
        <h4>Special Rules:</h4>
        <ul>
          <li>When you capture a piece, it goes into your "pocket"</li>
          <li>You can drop pieces from your pocket onto empty squares instead of moving</li>
          <li>Pawns cannot be dropped on the first or last rank</li>
          <li>Dropped pieces cannot give checkmate immediately</li>
          <li>All standard chess rules still apply</li>
        </ul>
      `
    },
    giveaway: {
      title: 'Antichess (Giveaway)',
      content: `
        <h4>Objective:</h4>
        <p>Lose all your pieces or get checkmated!</p>
        
        <h4>Rules:</h4>
        <ul>
          <li>You MUST capture if possible</li>
          <li>Checks are ignored (you can move into check)</li>
          <li>You win by losing all pieces or being checkmated</li>
          <li>Stalemate is a win for the stalemated player</li>
        </ul>
      `
    },
    berolina: {
      title: 'Berolina Chess',
      content: `
        <h4>Objective:</h4>
        <p>Checkmate your opponent's king.</p>
        
        <h4>Special Pawns:</h4>
        <ul>
          <li>Berolina pawns move diagonally forward (instead of straight)</li>
          <li>They capture straight forward (instead of diagonally)</li>
          <li>All other rules are the same as standard chess</li>
        </ul>
      `
    },
    knightmate: {
      title: 'Knightmate',
      content: `
        <h4>Objective:</h4>
        <p>Checkmate your opponent's royal knight (the piece that was originally a knight).</p>
        
        <h4>Special Rules:</h4>
        <ul>
          <li>The knights become the royal pieces (must be protected)</li>
          <li>The original kings become non-royal pieces (can be captured)</li>
          <li>You win by checkmating the royal knight</li>
          <li>All other standard chess rules apply</li>
        </ul>
      `
    },
    atomic: {
      title: 'Atomic Chess',
      content: `
        <h4>Objective:</h4>
        <p>Capture your opponent's king (which causes an explosion).</p>
        
        <h4>Special Rules:</h4>
        <ul>
          <li>When a piece is captured, it explodes</li>
          <li>The explosion removes all non-pawn pieces in the 8 surrounding squares</li>
          <li>If a king is in the explosion, that side loses immediately</li>
          <li>Kings cannot capture (to prevent self-destruction)</li>
          <li>You win by causing your opponent's king to explode</li>
        </ul>
      `
    }
  };
  
  return rules[mode] || rules.standard;
}

// ----- Theme System -----
function applyTheme(theme) {
  const body = document.body;
  const root = document.documentElement;
  
  // Remove existing theme classes
  body.classList.remove('theme-default', 'theme-dark', 'theme-ocean', 'theme-forest', 'theme-sunset');
  
  // Apply new theme
  body.classList.add(`theme-${theme}`);
  
  // Store theme preference
  localStorage.setItem('chessTheme', theme);
  
  // Apply CSS variables if needed
  switch(theme) {
    case 'dark':
      body.style.background = '#1a1a1a';
      break;
    case 'ocean':
      body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      break;
    case 'forest':
      body.style.background = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
      break;
    case 'sunset':
      body.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
      break;
    default:
      body.style.background = '#7ec850';
  }
}

// Load saved theme on page load
if (typeof window !== 'undefined') {
  const savedTheme = localStorage.getItem('chessTheme');
  if (savedTheme) {
    currentTheme = savedTheme;
    applyTheme(savedTheme);
  }
}

// ----- Bot Analysis System -----
function toggleBotAnalysis() {
  botAnalysisMode = !botAnalysisMode;
  
  if (botAnalysisMode) {
    // Show analysis panel
    showBotAnalysis();
  } else {
    // Hide analysis panel
    const analysisPanel = document.getElementById('bot-analysis-panel');
    if (analysisPanel) {
      analysisPanel.remove();
    }
  }
}

function showBotAnalysis() {
  // Remove existing panel
  const existing = document.getElementById('bot-analysis-panel');
  if (existing) existing.remove();
  
  const panel = document.createElement('div');
  panel.id = 'bot-analysis-panel';
  panel.style.cssText = 'position: fixed; top: 20px; right: 20px; width: 300px; background: white; border: 3px solid #3e3e3e; border-radius: 8px; padding: 15px; z-index: 1000; max-height: 400px; overflow-y: auto;';
  
  panel.innerHTML = `
    <h3 style="margin: 0 0 10px 0;">Bot Analysis</h3>
    <div id="bot-analysis-content">Analyzing position...</div>
    <button class="action-button" onclick="document.getElementById('bot-analysis-panel').remove(); botAnalysisMode = false;" style="margin-top: 10px; width: 100%;">Close</button>
  `;
  
  document.body.appendChild(panel);
  
  // Perform analysis
  analyzeCurrentPosition();
}

function analyzeCurrentPosition() {
  const content = document.getElementById('bot-analysis-content');
  if (!content) return;
  
  content.innerHTML = 'Analyzing...';
  
  setTimeout(() => {
    const legalMoves = collectAllLegalMoves(currentPlayer);
    const bestMove = getBestMove(board, currentPlayer);
    
    let analysis = `<p><strong>Legal moves:</strong> ${legalMoves.length}</p>`;
    
    if (bestMove) {
      const fromSquare = String.fromCharCode(97 + bestMove.from.col) + (8 - bestMove.from.row);
      const toSquare = String.fromCharCode(97 + bestMove.to.col) + (8 - bestMove.to.row);
      analysis += `<p><strong>Best move:</strong> ${fromSquare} → ${toSquare}</p>`;
    }
    
    // Evaluate position
    const evaluation = evaluatePosition(board);
    const evalText = evaluation > 0 ? `+${(evaluation / 100).toFixed(1)} (White advantage)` : 
                     evaluation < 0 ? `${(evaluation / 100).toFixed(1)} (Black advantage)` : 
                     '0.0 (Equal)';
    analysis += `<p><strong>Evaluation:</strong> ${evalText}</p>`;
    
    // Check status
    if (isRoyalInCheck(currentPlayer)) {
      analysis += `<p style="color: #ff4444;"><strong>Status:</strong> In Check!</p>`;
    } else {
      analysis += `<p><strong>Status:</strong> Normal</p>`;
    }
    
    content.innerHTML = analysis;
  }, 100);
}

// ----- Puzzle Generation -----
let puzzleMode = false;
let currentPuzzle = null;
let puzzleSolution = null;

function startPuzzleMode() {
  puzzleMode = true;
  analysisMode = false;
  botMode = false;
  gameMode = 'standard';
  boardFlipped = false;
  
  // Generate a puzzle
  generatePuzzle();
  
  // Show game container
  selectionMenu.style.display = 'none';
  gameContainer.style.display = 'flex';
  
  // Initialize UI
  initializeUI();
  renderBoard();
  updateStatus();
  renderPockets();
}

function generatePuzzle() {
  // Simple puzzle positions (mate in 2-3 moves)
  const puzzles = [
    {
      fen: 'r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
      solution: ['Bxc6', 'bxc6', 'Nxe5'],
      hint: 'Look for a discovered attack'
    },
    {
      fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
      solution: ['Bxf7+', 'Kxf7', 'Nxe5+'],
      hint: 'Sacrifice the bishop for a strong attack'
    },
    {
      fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 4 4',
      solution: ['Bxf7+', 'Kxf7', 'Nxe5+'],
      hint: 'Fork the king and a piece'
    }
  ];
  
  // Select random puzzle
  currentPuzzle = puzzles[Math.floor(Math.random() * puzzles.length)];
  puzzleSolution = currentPuzzle.solution;
  
  // Load puzzle position
  const parsedBoard = parseFEN(currentPuzzle.fen);
  if (parsedBoard) {
    board = parsedBoard;
    currentPlayer = 'w';
    selected = null;
    lastMove = null;
    enPassantTarget = null;
    gameState = 'playing';
    initializeCastlingRights();
    
    // Show puzzle info
    if (statusDisplay) {
      statusDisplay.textContent = `Puzzle: ${currentPuzzle.hint}`;
      statusDisplay.style.color = '#0066cc';
    }
  }
}

// ----- Authentication Functions -----
let currentUser = null;

// Initialize authentication
function initializeAuth() {
  // Check if user is already logged in
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    updateAuthUI();
  }
  
  // Setup modal event listeners
  const authModal = document.getElementById('auth-modal');
  const loginBtn = document.getElementById('login-btn');
  const signupBtn = document.getElementById('signup-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const authClose = document.getElementById('auth-close');
  
  // Login button click
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      showAuthModal('login');
    });
  }
  
  // Signup button click
  if (signupBtn) {
    signupBtn.addEventListener('click', () => {
      showAuthModal('signup');
    });
  }
  
  // Logout button click
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
  
  // Delete account button click
  const deleteAccountBtn = document.getElementById('delete-account-btn');
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', deleteAccount);
  }
  
  // Export data button click
  const exportDataBtn = document.getElementById('export-data-btn');
  if (exportDataBtn) {
    exportDataBtn.addEventListener('click', exportDataToFile);
  }
  
  // Import data button click
  const importDataBtn = document.getElementById('import-data-btn');
  const importFileInput = document.getElementById('import-file-input');
  if (importDataBtn && importFileInput) {
    importDataBtn.addEventListener('click', () => {
      importFileInput.click();
    });
    importFileInput.addEventListener('change', handleFileImport);
  }
  
  // Close modal button
  if (authClose) {
    authClose.addEventListener('click', closeAuthModal);
  }
  
  // Close modal when clicking outside
  if (authModal) {
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) {
        closeAuthModal();
      }
    });
  }
  
  // Tab switching
  const authTabs = document.querySelectorAll('.auth-tab');
  authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabType = tab.dataset.tab;
      switchAuthTab(tabType);
    });
  });
  
  // Form submissions
  const loginForm = document.getElementById('login-form-element');
  const signupForm = document.getElementById('signup-form-element');
  
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  if (signupForm) {
    signupForm.addEventListener('submit', handleSignup);
  }
}

// Show authentication modal
function showAuthModal(type = 'login') {
  const authModal = document.getElementById('auth-modal');
  if (!authModal) return;
  
  authModal.style.display = 'block';
  switchAuthTab(type);
}

// Close authentication modal
function closeAuthModal() {
  const authModal = document.getElementById('auth-modal');
  if (!authModal) return;
  
  authModal.style.display = 'none';
  
  // Clear form errors
  const loginError = document.getElementById('login-error');
  const signupError = document.getElementById('signup-error');
  if (loginError) loginError.style.display = 'none';
  if (signupError) signupError.style.display = 'none';
  
  // Clear form fields
  const loginForm = document.getElementById('login-form-element');
  const signupForm = document.getElementById('signup-form-element');
  if (loginForm) loginForm.reset();
  if (signupForm) signupForm.reset();
}

// Switch between login and signup tabs
function switchAuthTab(type) {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const loginTab = document.querySelector('.auth-tab[data-tab="login"]');
  const signupTab = document.querySelector('.auth-tab[data-tab="signup"]');
  
  if (type === 'login') {
    if (loginForm) loginForm.style.display = 'block';
    if (signupForm) signupForm.style.display = 'none';
    if (loginTab) loginTab.classList.add('active');
    if (signupTab) signupTab.classList.remove('active');
  } else {
    if (loginForm) loginForm.style.display = 'none';
    if (signupForm) signupForm.style.display = 'block';
    if (loginTab) loginTab.classList.remove('active');
    if (signupTab) signupTab.classList.add('active');
  }
  
  // Clear errors when switching tabs
  const loginError = document.getElementById('login-error');
  const signupError = document.getElementById('signup-error');
  if (loginError) loginError.style.display = 'none';
  if (signupError) signupError.style.display = 'none';
}

// Handle signup form submission
function handleSignup(e) {
  e.preventDefault();
  
  const username = document.getElementById('signup-username').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const confirmPassword = document.getElementById('signup-confirm-password').value;
  const errorDiv = document.getElementById('signup-error');
  
  // Validation
  if (username.length < 3) {
    showError('signup-error', 'Username must be at least 3 characters long');
    return;
  }
  
  if (password.length < 6) {
    showError('signup-error', 'Password must be at least 6 characters long');
    return;
  }
  
  if (password !== confirmPassword) {
    showError('signup-error', 'Passwords do not match');
    return;
  }
  
  // Check if username already exists
  const users = JSON.parse(localStorage.getItem('chessUsers') || '[]');
  const existingUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  
  if (existingUser) {
    showError('signup-error', 'Username already exists');
    return;
  }
  
  // Check if email already exists
  const existingEmail = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingEmail) {
    showError('signup-error', 'Email already registered');
    return;
  }
  
  // Create new user (in a real app, password would be hashed)
  const newUser = {
    id: Date.now().toString(),
    username: username,
    email: email,
    password: password, // In production, this should be hashed!
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  localStorage.setItem('chessUsers', JSON.stringify(users));
  
  // Save user to separate txt file in userdata folder
  saveUserToFile(newUser);
  
  // Auto-login after signup
  currentUser = {
    id: newUser.id,
    username: newUser.username,
    email: newUser.email
  };
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
  
  // Update UI and close modal
  updateAuthUI();
  showSuccess('signup-error', 'Account created successfully!');
  
  setTimeout(() => {
    closeAuthModal();
  }, 1000);
}

// Handle login form submission
function handleLogin(e) {
  e.preventDefault();
  
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  
  // Get users from localStorage
  const users = JSON.parse(localStorage.getItem('chessUsers') || '[]');
  
  // Find user by username
  const user = users.find(u => 
    u.username.toLowerCase() === username.toLowerCase() && 
    u.password === password // In production, compare hashed passwords!
  );
  
  if (!user) {
    showError('login-error', 'Invalid username or password');
    return;
  }
  
  // Set current user
  currentUser = {
    id: user.id,
    username: user.username,
    email: user.email
  };
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
  
  // Update UI and close modal
  updateAuthUI();
  closeAuthModal();
}

// Logout function
function logout() {
  currentUser = null;
  localStorage.removeItem('currentUser');
  updateAuthUI();
}

// Delete account function with confirmation
function deleteAccount() {
  if (!currentUser) {
    alert('No user logged in.');
    return;
  }
  
  // First confirmation
  const firstConfirm = confirm(
    `⚠️ WARNING: This will permanently delete your account!\n\n` +
    `Username: ${currentUser.username}\n` +
    `Email: ${currentUser.email}\n\n` +
    `This action cannot be undone.\n\n` +
    `Are you sure you want to delete your account?`
  );
  
  if (!firstConfirm) return;
  
  // Second confirmation (double confirmation for safety)
  const secondConfirm = confirm(
    `⚠️ FINAL WARNING ⚠️\n\n` +
    `You are about to permanently delete your account: "${currentUser.username}"\n\n` +
    `This will:\n` +
    `• Delete your account from the system\n` +
    `• Remove all your account data\n` +
    `• Log you out immediately\n\n` +
    `THIS CANNOT BE UNDONE!\n\n` +
    `Type "DELETE" to confirm:`
  );
  
  if (!secondConfirm) return;
  
  // For extra safety, ask user to type DELETE
  const deleteConfirm = prompt(
    `⚠️ FINAL CONFIRMATION ⚠️\n\n` +
    `Type "DELETE" (all caps) to permanently delete your account "${currentUser.username}":`
  );
  
  if (deleteConfirm !== 'DELETE') {
    alert('Account deletion cancelled. Your account is safe.');
    return;
  }
  
  try {
    // Get all users
    const users = JSON.parse(localStorage.getItem('chessUsers') || '[]');
    
    // Find and remove the user
    const userIndex = users.findIndex(u => u.id === currentUser.id || 
                                           u.username.toLowerCase() === currentUser.username.toLowerCase());
    
    if (userIndex !== -1) {
      users.splice(userIndex, 1);
      localStorage.setItem('chessUsers', JSON.stringify(users));
    }
    
    // Remove current user session
    localStorage.removeItem('currentUser');
    currentUser = null;
    
    // Update UI
    updateAuthUI();
    
    // Show success message
    alert('Account deleted successfully. You have been logged out.');
    
    // If user is in a game, go back to menu
    if (gameContainer && gameContainer.style.display !== 'none') {
      showMenu();
    }
    
  } catch (error) {
    console.error('Error deleting account:', error);
    alert('Error deleting account: ' + error.message);
  }
}

// Update authentication UI based on login state
function updateAuthUI() {
  const userDisplay = document.getElementById('user-display');
  const loginBtn = document.getElementById('login-btn');
  const signupBtn = document.getElementById('signup-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const deleteAccountBtn = document.getElementById('delete-account-btn');
  
  if (currentUser) {
    // User is logged in
    if (userDisplay) {
      userDisplay.textContent = `👤 ${currentUser.username}`;
      userDisplay.style.display = 'inline';
    }
    if (loginBtn) loginBtn.style.display = 'none';
    if (signupBtn) signupBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
    if (deleteAccountBtn) deleteAccountBtn.style.display = 'inline-block';
  } else {
    // User is not logged in
    if (userDisplay) userDisplay.style.display = 'none';
    if (loginBtn) loginBtn.style.display = 'inline-block';
    if (signupBtn) signupBtn.style.display = 'inline-block';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (deleteAccountBtn) deleteAccountBtn.style.display = 'none';
  }
}

// Show error message
function showError(errorId, message) {
  const errorDiv = document.getElementById(errorId);
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.className = 'auth-error';
  }
}

// Show success message
function showSuccess(errorId, message) {
  const errorDiv = document.getElementById(errorId);
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.className = 'auth-success';
  }
}

// Save a single user to a separate txt file in userdata folder
function saveUserToFile(user) {
  try {
    // Format user data as text
    let textContent = '=== FURR CHESS USER ACCOUNT ===\n\n';
    textContent += `Export Date: ${new Date().toLocaleString()}\n\n`;
    textContent += `ID: ${user.id}\n`;
    textContent += `Username: ${user.username}\n`;
    textContent += `Email: ${user.email}\n`;
    textContent += `Password: ${user.password}\n`;
    textContent += `Created At: ${user.createdAt}\n`;
    
    // Create blob and download
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Use userdata/ prefix in filename so users can save to userdata folder
    const safeUsername = user.username.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `userdata/${safeUsername}-${user.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error saving user file:', error);
    // Don't show error to user, just log it
  }
}

// Export all account data as separate txt files in userdata folder
function exportDataToFile() {
  try {
    const users = JSON.parse(localStorage.getItem('chessUsers') || '[]');
    
    if (users.length === 0) {
      alert('No account data to export.');
      return;
    }
    
    // Confirm export
    const confirmed = confirm(
      `This will download ${users.length} separate text file(s) to the userdata folder.\n\n` +
      `Please create a "userdata" folder in your Downloads directory first if it doesn't exist.\n\n` +
      `Continue?`
    );
    
    if (!confirmed) return;
    
    // Save each user as a separate file with delay between downloads
    let delay = 0;
    users.forEach((user, index) => {
      setTimeout(() => {
        saveUserToFile(user);
        if (index === users.length - 1) {
          // Last file, show success message
          setTimeout(() => {
            alert(`Account data exported successfully!\n\n` +
                  `Downloaded ${users.length} user file(s).\n` +
                  `Please save them to the "userdata" folder.`);
          }, 500);
        }
      }, delay);
      delay += 300; // 300ms delay between each download
    });
    
  } catch (error) {
    console.error('Error exporting data:', error);
    alert('Error exporting data: ' + error.message);
  }
}

// Handle file import for account data (single file or multiple files)
function handleFileImport(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  
  let filesToProcess = Array.from(files);
  
  // Filter for .txt files
  filesToProcess = filesToProcess.filter(file => file.name.endsWith('.txt'));
  
  if (filesToProcess.length === 0) {
    alert('Please select .txt file(s) from the userdata folder.');
    return;
  }
  
  // Ask for confirmation
  const confirmed = confirm(
    `Found ${filesToProcess.length} file(s) to import.\n\n` +
    `This will add these users to your existing data.\n` +
    `Continue?`
  );
  
  if (!confirmed) {
    event.target.value = '';
    return;
  }
  
  let processedCount = 0;
  let added = 0;
  let skipped = 0;
  const existingUsers = JSON.parse(localStorage.getItem('chessUsers') || '[]');
  const existingUsernames = new Set(existingUsers.map(u => u.username.toLowerCase()));
  const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));
  
  // Process each file
  filesToProcess.forEach((file, index) => {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      try {
        const content = e.target.result;
        
        // Parse user data from text format
        const importedUser = parseUserFromText(content);
        
        if (!importedUser || !importedUser.username) {
          skipped++;
          processedCount++;
          checkComplete();
          return;
        }
        
        // Validate user structure
        if (!importedUser.email || !importedUser.password) {
          skipped++;
          processedCount++;
          checkComplete();
          return;
        }
        
        // Check for duplicates
        if (existingUsernames.has(importedUser.username.toLowerCase()) || 
            existingEmails.has(importedUser.email.toLowerCase())) {
          skipped++;
          processedCount++;
          checkComplete();
          return;
        }
        
        // Add user
        existingUsernames.add(importedUser.username.toLowerCase());
        existingEmails.add(importedUser.email.toLowerCase());
        existingUsers.push(importedUser);
        added++;
        processedCount++;
        checkComplete();
        
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        skipped++;
        processedCount++;
        checkComplete();
      }
    };
    
    reader.onerror = function() {
      console.error(`Error reading file ${file.name}`);
      skipped++;
      processedCount++;
      checkComplete();
    };
    
    reader.readAsText(file);
  });
  
  function checkComplete() {
    if (processedCount === filesToProcess.length) {
      // All files processed
      localStorage.setItem('chessUsers', JSON.stringify(existingUsers));
      
      alert(
        `Import complete!\n\n` +
        `Processed: ${filesToProcess.length} file(s)\n` +
        `Added: ${added} user(s)\n` +
        `Skipped (duplicates/invalid): ${skipped} user(s)\n` +
        `Total users now: ${existingUsers.length}`
      );
      
      // Reset file input
      event.target.value = '';
    }
  }
}

// Parse a single user from text format (for individual user files)
function parseUserFromText(text) {
  const user = {};
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Parse user fields
    if (line.startsWith('ID:')) {
      user.id = line.substring(3).trim();
    } else if (line.startsWith('Username:')) {
      user.username = line.substring(9).trim();
    } else if (line.startsWith('Email:')) {
      user.email = line.substring(6).trim();
    } else if (line.startsWith('Password:')) {
      user.password = line.substring(9).trim();
    } else if (line.startsWith('Created At:')) {
      user.createdAt = line.substring(11).trim();
    }
  }
  
  return user.username ? user : null;
}

// Initialize authentication when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAuth);
} else {
  initializeAuth();
}

