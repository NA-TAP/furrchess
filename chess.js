const boardElement = document.getElementById('chessboard');

// Game mode (standard or capablanca)
let gameMode = 'standard'; // 'standard' or 'capablanca'
let gameState = 'playing'; // 'playing', 'check', 'checkmate', 'stalemate'

// Unicode chess pieces as fallback
const UNICODE_PIECES = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
  // Capablanca pieces
  wC: '♔', wA: '♕', bC: '♚', bA: '♛', // Using similar symbols for now
};

// PNG chess pieces (with fallback to Unicode)
const PIECES = {
  wK: 'pieces/wK.png',
  wQ: 'pieces/wQ.png',
  wR: 'pieces/wR.png',
  wB: 'pieces/wB.png',
  wN: 'pieces/wN.png',
  wP: 'pieces/wP.png',
  bK: 'pieces/bK.png',
  bQ: 'pieces/bQ.png',
  bR: 'pieces/bR.png',
  bB: 'pieces/bB.png',
  bN: 'pieces/bN.png',
  bP: 'pieces/bP.png',
  // Capablanca pieces
  wC: 'pieces/wC.png',
  wA: 'pieces/wA.png',
  bC: 'pieces/bC.png',
  bA: 'pieces/bA.png',
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

let board = [...STANDARD_BOARD.map(row => [...row])];
let selected = null;
let currentPlayer = 'w';
let lastMove = null;

// UI elements
let modeSelector = null;
let statusDisplay = null;

function initializeUI() {
  // Create mode selector
  const controls = document.createElement('div');
  controls.style.cssText = 'margin: 20px 0; text-align: center;';
  
  modeSelector = document.createElement('select');
  modeSelector.innerHTML = `
    <option value="standard">Standard Chess</option>
    <option value="capablanca">Capablanca Chess</option>
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
  
  // Insert controls before the board
  boardElement.parentNode.insertBefore(controls, boardElement);
}

function changeGameMode() {
  gameMode = modeSelector.value;
  board = gameMode === 'capablanca' 
    ? [...CAPABLANCA_BOARD.map(row => [...row])]
    : [...STANDARD_BOARD.map(row => [...row])];
  
  currentPlayer = 'w';
  selected = null;
  lastMove = null;
  gameState = 'playing';
  
  renderBoard();
  updateStatus();
}

function updateStatus() {
  if (gameState === 'checkmate') {
    const winner = currentPlayer === 'w' ? 'Black' : 'White';
    statusDisplay.textContent = `Checkmate! ${winner} wins!`;
    statusDisplay.style.color = '#ff4444';
  } else if (gameState === 'stalemate') {
    statusDisplay.textContent = 'Stalemate!';
    statusDisplay.style.color = '#ffaa00';
  } else if (gameState === 'check') {
    statusDisplay.textContent = `${currentPlayer === 'w' ? 'White' : 'Black'}'s turn - CHECK!`;
    statusDisplay.style.color = '#ff4444';
  } else {
    statusDisplay.textContent = `${currentPlayer === 'w' ? 'White' : 'Black'}'s turn`;
    statusDisplay.style.color = '#333';
  }
}

function renderBoard() {
  boardElement.innerHTML = '';
  const rows = 8; // Both modes have 8 ranks
  const cols = gameMode === 'capablanca' ? 10 : 8; // Capablanca has 10 files
  
  // Update grid template to match board size
  boardElement.style.gridTemplateColumns = `repeat(${cols}, 48px)`;
  boardElement.style.gridTemplateRows = `repeat(${rows}, 48px)`;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const square = document.createElement('div');
      square.className = 'square ' + ((row + col) % 2 === 0 ? 'white' : 'brown');
      square.dataset.row = row;
      square.dataset.col = col;
      
      if (selected && selected.row === row && selected.col === col) {
        square.classList.add('selected');
      }
      
      if (selected && isLegalMove(selected, {row, col})) {
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

function onSquareClick(row, col) {
  if (gameState === 'checkmate' || gameState === 'stalemate') return;
  
  const piece = board[row][col];
  
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
        showPromotionDialog(moveResult.promotionSquare, moveResult.piece);
        return;
      }
      
             const fromPos = selected;
       selected = null;
       currentPlayer = currentPlayer === 'w' ? 'b' : 'w';
       lastMove = {from: fromPos, to: {row, col}};
      
      // Check game state
      checkGameState();
      renderBoard();
      updateStatus();
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
  
  // Check for pawn promotion
  const needsPromotion = piece[1] === 'P' && 
    ((piece[0] === 'w' && to.row === 0) || (piece[0] === 'b' && to.row === 7));
  
  if (needsPromotion) {
    return {
      needsPromotion: true,
      promotionSquare: to,
      piece: piece
    };
  }
  
  // Make the move
  board[to.row][to.col] = piece;
  board[from.row][from.col] = null;
  
  return { needsPromotion: false };
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
       
       const fromPos = selected;
       currentPlayer = currentPlayer === 'w' ? 'b' : 'w';
       lastMove = {from: fromPos, to: square};
       selected = null;
      
      checkGameState();
      renderBoard();
      updateStatus();
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
      break;
    case 'C': // Chancellor (Rook + Knight)
      isValidMove = isValidChancellorMove(from, to);
      break;
    case 'A': // Archbishop (Bishop + Knight)
      isValidMove = isValidArchbishopMove(from, to);
      break;
  }
  
  if (!isValidMove) return false;
  
  // Check if move would leave king in check
  return !wouldLeaveKingInCheck(from, to);
}

function isValidPawnMove(from, to, piece) {
  const dr = to.row - from.row;
  const dc = to.col - from.col;
  const target = board[to.row][to.col];
  const dir = piece[0] === 'w' ? -1 : 1;
  const startRow = piece[0] === 'w' ? 6 : 1;
  
  // Forward move
  if (dc === 0 && !target) {
    if (dr === dir) return true;
    if (from.row === startRow && dr === 2 * dir && !board[from.row + dir][from.col]) return true;
  }
  
  // Capture move
  if (Math.abs(dc) === 1 && dr === dir && target && target[0] !== piece[0]) return true;
  
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

function wouldLeaveKingInCheck(from, to) {
  // Make temporary move
  const tempPiece = board[to.row][to.col];
  board[to.row][to.col] = board[from.row][from.col];
  board[from.row][from.col] = null;
  
  // Check if king is in check
  const inCheck = isKingInCheck(currentPlayer);
  
  // Undo move
  board[from.row][from.col] = board[to.row][to.col];
  board[to.row][to.col] = tempPiece;
  
  return inCheck;
}

function isKingInCheck(color) {
  const kingPos = findKing(color);
  if (!kingPos) return false;
  
  // Check if any opponent piece can attack the king
  const opponentColor = color === 'w' ? 'b' : 'w';
  const rows = 8;
  const cols = gameMode === 'capablanca' ? 10 : 8;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const piece = board[row][col];
      if (piece && piece[0] === opponentColor) {
        // Temporarily set current player to opponent to check their moves
        const originalPlayer = currentPlayer;
        currentPlayer = opponentColor;
        
        const canAttack = isLegalMove({row, col}, kingPos);
        
        currentPlayer = originalPlayer;
        
        if (canAttack) return true;
      }
    }
  }
  
  return false;
}

function findKing(color) {
  const rows = 8;
  const cols = gameMode === 'capablanca' ? 10 : 8;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const piece = board[row][col];
      if (piece === color + 'K') {
        return {row, col};
      }
    }
  }
  return null;
}

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
  if (isKingInCheck(currentPlayer)) {
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

// Initialize the game
initializeUI();
renderBoard();
updateStatus(); 