const express = require('express');
const port = process.env.PORT || 3000;
const { Server } = require('ws');
const { v4 } = require('uuid');

const server = express().listen(port, () => console.log(`Listening on port ${port}`));

const wss = new Server({ server });

let players = 0;

let game = [];
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

let sockets = {};

function setTurn(key) {
  let keys = Object.keys(sockets);
  let obj = {
    req: 'turn_data',
    data: {
      turn: false
    }
  }
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] === key) {
      sockets[key].turn = true;
      obj.data.turn = true;
      sockets[key].socket.send(JSON.stringify(obj));
    } else {
      sockets[keys[i]].turn = false;
      obj.data.turn = false;
      sockets[keys[i]].socket.send(JSON.stringify(obj));
    }
  }
}

function startGame() {
  const index = Math.floor(Math.random() * 2);
  const keys = Object.keys(sockets);
  setTurn(keys[index]);
  let obj1 = {
    req: 'char',
    data: {
      char: ''
    }
  }
  obj1.data.char = 'X';
  sockets[keys[0]].char = 'X';
  sockets[keys[0]].socket.send(JSON.stringify(obj1));
  obj1.data.char = 'O';
  sockets[keys[1]].char = 'O';
  sockets[keys[1]].socket.send(JSON.stringify(obj1));
  const obj = {
    req: 'game_data',
    data: { game }
  }
  Object.values(sockets).forEach(socket => {
    socket.socket.send(JSON.stringify(obj));
  });
}

function checkRow(row) {
  if (row[0] === row[1] && row[1] === row[2]) {
    if (row[0] !== '') {
      return row[0];
    }
  }
  return false;
}

function checkColumn(col, index) {
  if (col[0][index] === col[1][index] && col[1][index] === col[2][index]) {
    if (col[0][index] !== '') {
      return col[0][index];
    }
  }
  return false;
}

function checkRowZ(rowZ) {
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

function checkDiagonalZ(gameSlice) {
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

function checkDiagonalX(gameClone) {
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

function checkDiagonalY(gameClone) {
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
  return false;
}

function getIdFromChar(char) {
  let res;
  Object.keys(sockets).forEach(key => {
    if (sockets[key].char === char) {
      res = key;
    }
  });
  return res;
}

function sendGameData() {
  const obj = {
    req: 'game_data',
    data: { game }
  }
  Object.values(sockets).forEach(socket => {
    socket.socket.send(JSON.stringify(obj));
  });
}

wss.on('connection', (ws) => {
  console.log('Client connected');

  const socketId = v4();

  const client = {
    socket: ws,
    turn: false,
    char: '',
    id: socketId
  }

  if (players < 2) {
    sockets[socketId] = client;
  } else {
    const obj = {
      req: 'too_many_players',
      data: {
        message: 'Too many players',
      }
    }
    ws.send(JSON.stringify(obj));
  }
  players++;

  if (players == 2) startGame();

  ws.on('message', (msg) => {
    msg = JSON.parse(msg);
    switch (msg.req) {
      case 'stay-alive': break;
      case 'play_data': {
        if (sockets[socketId].turn) {
          // update game object
          const { x, y, z } = msg.data;
          if (game[x][y][z] == '') {
            game[x][y][z] = client.char;
            // send game data to clients
            const opponentKey = Object.keys(sockets).find(key => key !== socketId);
            setTurn(opponentKey);
            sendGameData();

            const winner = checkWinner();
            if (winner) {
              const winnerId = getIdFromChar(winner);
              Object.values(sockets).forEach(socket => {
                const obj = {
                  req: 'winner',
                  data: {
                    winner: winnerId == socket.id
                  }
                }
                socket.socket.send(JSON.stringify(obj));
              });
            }
          }
        }
        break;
      }
      default: break;
    }
  });
  ws.on('close', () => {
    console.log('Client disconnected');
    delete sockets[socketId];
    players--;
    if (players < 2) {
      resetGame();
      sendGameData();
    }
  });
  function stayAliveLoop() {
    const obj = {
      req: 'stay-alive'
    }
    ws.send(JSON.stringify(obj));
    setTimeout(() => {
      stayAliveLoop();
    }, 5000);
  }
  stayAliveLoop();
});
