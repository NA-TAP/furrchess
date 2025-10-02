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
  wK: 'ui assets/pieces/wK.png',
  wQ: 'ui assets/pieces/wQ.png',
  wR: 'ui assets/pieces/wR.png',
  wB: 'ui assets/pieces/wB.png',
  wN: 'ui assets/pieces/wN.png',
  wP: 'ui assets/pieces/wP.png',
  bK: 'ui assets/pieces/bK.png',
  bQ: 'ui assets/pieces/bQ.png',
  bR: 'ui assets/pieces/bR.png',
  bB: 'ui assets/pieces/bB.png',
  bN: 'ui assets/pieces/bN.png',
  bP: 'ui assets/pieces/bP.png',
  // Capablanca pieces
  wC: 'ui assets/pieces/wC.png',
  wA: 'ui assets/pieces/wA.png',
  bC: 'ui assets/pieces/bC.png',
  bA: 'ui assets/pieces/bA.png',
  // Berolina pawns
  wS: 'ui assets/pieces/wS.png',
  bS: 'ui assets/pieces/bS.png',
  // Knightmate non-royal kings
  wM: 'ui assets/pieces/wM.png',
  bM: 'ui assets/pieces/bM.png',
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

  // Crazyhouse pockets UI
  pocketsContainer = document.createElement('div');
  pocketsContainer.id = 'pockets';
  pocketsContainer.style.cssText = 'display:flex; gap:24px; justify-content:center; align-items:center; margin: 10px 0;';
  const whitePocket = document.createElement('div');
  whitePocket.id = 'white-pocket';
  const blackPocket = document.createElement('div');
  blackPocket.id = 'black-pocket';
  pocketsContainer.appendChild(whitePocket);
  pocketsContainer.appendChild(blackPocket);
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
  
  analysisControls.appendChild(backButton);
  analysisControls.appendChild(forwardButton);
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
    const turnLabel = (botMode && currentPlayer === 'b') ? "Bot's" : (currentPlayer === 'w' ? 'White' : 'Black');
    statusDisplay.textContent = `${turnLabel}'s turn - CHECK!`;
    statusDisplay.style.color = '#ff4444';
    if (resignButton) resignButton.disabled = false;
  } else {
    const turnLabel = (botMode && currentPlayer === 'b') ? "Bot's" : (currentPlayer === 'w' ? 'White' : 'Black');
    statusDisplay.textContent = `${turnLabel}'s turn`;
    statusDisplay.style.color = '#333';
    if (resignButton) resignButton.disabled = false;
  }
}



function onSquareClick(row, col) {
  if (gameState === 'checkmate' || gameState === 'stalemate' || gameState === 'resigned') return;
  
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
  whiteDiv.innerHTML = '<strong>White pocket:</strong> ';
  blackDiv.innerHTML = '<strong>Black pocket:</strong> ';
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
      // TODO: Implement puzzles with FEN
      alert('Puzzles feature coming soon!');
      break;
    case 'analysis':
      startGame('analysis');
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
  if (currentPlayer !== 'b') return;
  // Delay a bit for UX
  setTimeout(() => makeRandomBotMove('b'), 300);
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