import express from 'express';
const port = process.env.PORT || 3000;
import { Server, WebSocket } from 'ws';
import { v4 as uuid } from 'uuid';

const server = express().listen(port, () => console.log(`Listening on port ${port}`));

const wss = new Server({ server });

let players = 0;

type charType = 'X' | 'O' | '';

let game: charType[][][] = [];
function resetGame() {
  game = [];
  for (let i = 0; i < 3; i++) {
    game.push([]);
    for (let j = 0; j < 3; j++) {
      game[i].push([]);
      for (let k = 0; k < 3; k++) {
        game[i][j].push('');
      }
    }
  }
}
resetGame();

type socketType = {
  turn: boolean;
  socket: WebSocket;
  char: charType;
  id: string;
};

const waiting = new Map<string, socketType>();
const sockets = new Map<string, socketType>();

function setTurn(key: string) {
  const keys = [...sockets.keys()];
  let obj = {
    req: 'turn-data',
    data: {
      turn: false
    }
  };
  for (let i = 0; i < keys.length; i++) {
    const player = sockets.get(keys[i]);
    if (!player) continue;
    if (keys[i] === key) {
      player.turn = true;
      sockets.set(keys[i], player);
      obj.data.turn = true;
      player.socket.send(JSON.stringify(obj));
    } else {
      player.turn = false;
      sockets.set(keys[i], player);
      obj.data.turn = false;
      player.socket.send(JSON.stringify(obj));
    }
  }
}

function startGame() {
  const keys = [...sockets.keys()];
  const player1 = sockets.get(keys[0]);
  const player2 = sockets.get(keys[1]);
  if (!player1 || !player2) return;
  let obj1 = {
    req: 'char',
    data: {
      char: ''
    }
  };
  obj1.data.char = 'X';
  player1.char = 'X';
  player1.socket.send(JSON.stringify(obj1));
  obj1.data.char = 'O';
  player2.char = 'O';
  player2.socket.send(JSON.stringify(obj1));
  sendGameData();
  setTurn(keys[Math.floor(Math.random() * 2)]);
}

function checkRow(row: charType[]) {
  if (row[0] === row[1] && row[1] === row[2]) {
    if (row[0] !== '') {
      return row[0];
    }
  }
  return false;
}

function checkColumn(col: charType[][], index: number) {
  if (col[0][index] === col[1][index] && col[1][index] === col[2][index]) {
    if (col[0][index] !== '') {
      return col[0][index];
    }
  }
  return false;
}

function checkRowZ(rowZ: charType[][][]) {
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (rowZ[0][i][j] === rowZ[1][i][j] && rowZ[1][i][j] === rowZ[2][i][j]) {
        if (rowZ[0][i][j] !== '') {
          return rowZ[0][i][j];
        }
      }
    }
  }
  return false;
}

function checkDiagonalZ(gameSlice: charType[][]) {
  if (gameSlice[0][0] === gameSlice[1][1] && gameSlice[1][1] === gameSlice[2][2]) {
    if (gameSlice[0][0] !== '') {
      return gameSlice[0][0];
    }
  }
  if (gameSlice[0][2] === gameSlice[1][1] && gameSlice[1][1] === gameSlice[2][0]) {
    if (gameSlice[0][2] !== '') {
      return gameSlice[0][2];
    }
  }
  return false;
}

function checkDiagonalX(gameClone: charType[][][]) {
  for (let i = 0; i < 3; i++) {
    if (gameClone[2][0][i] == gameClone[1][1][i] && gameClone[1][1][i] == gameClone[0][2][i]) {
      if (gameClone[2][0][i] !== '') {
        return gameClone[2][0][i];
      }
    }
    if (gameClone[0][0][i] == gameClone[1][1][i] && gameClone[1][1][i] == gameClone[2][2][i]) {
      if (gameClone[0][0][i] !== '') {
        return gameClone[0][0][i];
      }
    }
  }
  return false;
}

function checkDiagonalY(gameClone: charType[][][]) {
  for (let i = 0; i < 3; i++) {
    if (gameClone[0][i][0] == gameClone[1][i][1] && gameClone[1][i][1] == gameClone[2][i][2]) {
      if (gameClone[0][i][0] !== '') {
        return gameClone[0][i][0];
      }
    }
    if (gameClone[0][i][2] == gameClone[1][i][1] && gameClone[1][i][1] == gameClone[2][i][0]) {
      if (gameClone[0][i][2] !== '') {
        return gameClone[0][i][2];
      }
    }
  }
  return false;
}

function checkWinner() {
  // check rows
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let winner = checkRow(game[i][j]);
      if (winner) return winner;
    }
  }

  // check columns
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let winner = checkColumn(game[j], i);
      if (winner) return winner;
    }
  }

  // check z-axis rows
  let zWinner = checkRowZ(game);
  if (zWinner) return zWinner;

  // check diagonals
  for (let i = 0; i < 3; i++) {
    let winner = checkDiagonalZ(game[i]);
    if (winner) return winner;
  }

  let diagXWinner = checkDiagonalX(game);
  if (diagXWinner) return diagXWinner;

  let diagYWinner = checkDiagonalY(game);
  if (diagYWinner) return diagYWinner;

  if (game[0][0][0] === game[1][1][1] && game[1][1][1] === game[2][2][2] && game[0][0][0] !== '') {
    return game[0][0][0];
  }
  if (game[0][0][2] === game[1][1][1] && game[1][1][1] === game[2][2][0] && game[0][0][2] !== '') {
    return game[0][0][2];
  }
  if (game[0][2][0] === game[1][1][1] && game[1][1][1] === game[2][0][2] && game[0][2][0] !== '') {
    return game[0][2][0];
  }
  if (game[0][2][2] === game[1][1][1] && game[1][1][1] === game[2][0][0] && game[0][2][2] !== '') {
    return game[0][2][2];
  }
  return null;
}

function getIdFromChar(char: charType) {
  const keys = [...sockets.keys()];
  for (let i = 0; i < keys.length; i++) {
    if (sockets.get(keys[i])?.char === char) {
      return keys[i];
    }
  }
  return null;
}

function sendGameData() {
  const obj = {
    req: 'game-data',
    data: { game }
  };
  [...sockets.values()].forEach((socket) => {
    socket.socket.send(JSON.stringify(obj));
  });
  [...waiting.values()].forEach((socket) => {
    socket.socket.send(JSON.stringify(obj));
  });
}

wss.on('connection', (ws) => {
  console.log('Client connected');

  const socketId = uuid();

  const client: socketType = {
    socket: ws,
    turn: false,
    char: '',
    id: socketId
  };

  if (players < 2) {
    sockets.set(socketId, client);
    players++;
  } else {
    const obj = {
      req: 'too-many-players',
      data: {
        message: 'Too many players'
      }
    };
    ws.send(JSON.stringify(obj));
    waiting.set(socketId, client);
  }

  if (players == 2) startGame();

  type msgType = {
    req: 'stay-alive' | 'play-data';
    data: {
      x: number;
      y: number;
      z: number;
    };
  };

  ws.on('message', (input) => {
    const msg = JSON.parse(input.toString()) as msgType;
    switch (msg.req) {
      case 'stay-alive':
        break;
      case 'play-data': {
        const player = sockets.get(socketId);
        if (!player) break;
        if (player.turn) {
          // update game object
          const { x, y, z } = msg.data;
          if (game[x][y][z] === '') {
            game[x][y][z] = client.char;
            // send game data to clients
            const opponentKey = [...sockets.keys()].find((key) => key !== socketId);
            if (!opponentKey) break;
            setTurn(opponentKey);
            sendGameData();

            const winner = checkWinner();
            if (winner) {
              const winnerId = getIdFromChar(winner);
              console.log('id', winnerId);
              [...sockets.values()].forEach((socket) => {
                const obj = {
                  req: 'winner',
                  data: {
                    winner: winnerId == socket.id
                  }
                };
                socket.socket.send(JSON.stringify(obj));
              });
            }
          }
        }
        break;
      }
      default:
        break;
    }
  });
  ws.on('close', () => {
    console.log('Client disconnected');
    if (sockets.has(socketId)) {
      players--;
      sockets.delete(socketId);
      resetGame();
      sendGameData();

      const waitingKeys = [...waiting.keys()];
      if (waitingKeys.length === 0) return;

      const key = waitingKeys.shift();
      if (!key) return;

      const obj = waiting.get(key);
      if (!obj) return;

      sockets.set(key, obj);
      players++;
      startGame();
    } else {
      waiting.delete(socketId);
    }
  });
  function stayAliveLoop() {
    const obj = {
      req: 'stay-alive'
    };
    ws.send(JSON.stringify(obj));
    setTimeout(() => {
      stayAliveLoop();
    }, 5000);
  }
  stayAliveLoop();
});
