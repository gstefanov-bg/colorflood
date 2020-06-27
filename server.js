"use strict";

var AWS = require('aws-sdk');

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');

var turn = 0;
var unpairedPlayers = 0;
var logList = [];
var afterLog = [];
var beforeLog = [];
var pairs = [];

// Receiving SQS URL as a parameter
var myArgs = process.argv.slice(2);

AWS.config.update({region: 'eu-central-1'});
var sqs = new AWS.SQS({apiVersion: '2012-11-05'});

var params_register = {
  DelaySeconds: 10,
  MessageAttributes: {
    "Event": {
      DataType: "String",
      StringValue: "Registration"
    }
  },
  MessageBody: "A user has registered.",
	MessageDeduplicationId: "TheRegister",  // Required for FIFO queues
  MessageGroupId: "Group1",  // Required for FIFO queues
  QueueUrl: myArgs[0]
};

String.prototype.hashCode = function () {
  var hash = 0, chr, len;
  if (this.length === 0) return hash;
  for (var i = 0, len = this.length; i < len; i++) {
    chr = this.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash;
};

function spread(field, posX, posY, oldColor, newColor, mark) {

  field[posX][posY].setColor(newColor);
  field[posX][posY].setConnection(mark);

  if (posX < field.length - 1) {
    if (field[posX + 1][posY].getColor() === oldColor) {
      spread(field, posX + 1, posY, oldColor, newColor, mark);
    }
    else if ((field[posX + 1][posY].getColor() === newColor) && (field[posX + 1][posY].getConnection() === 0)) {
      spreadCon(field, posX + 1, posY, newColor, mark);
    }
  }

  if (posY < field.length - 1) {
    if (field[posX][posY + 1].getColor() === oldColor) {
      spread(field, posX, posY + 1, oldColor, newColor, mark);
    }
    else if ((field[posX][posY + 1].getColor() === newColor) && (field[posX][posY + 1].getConnection() === 0)) {
      spreadCon(field, posX, posY + 1, newColor, mark);
    }
  }

  if (posX >= 1) {
    if (field[posX - 1][posY].getColor() === oldColor) {
      spread(field, posX - 1, posY, oldColor, newColor, mark);
    }
    else if ((field[posX - 1][posY].getColor() === newColor) && (field[posX - 1][posY].getConnection() === 0)) {
      spreadCon(field, posX - 1, posY, newColor, mark);
    }
  }

  if (posY >= 1) {
    if (field[posX][posY - 1].getColor() === oldColor) {
      spread(field, posX, posY - 1, oldColor, newColor, mark);
    }
    else if ((field[posX][posY - 1].getColor() === newColor) && (field[posX][posY - 1].getConnection() === 0)) {
      spreadCon(field, posX, posY - 1, newColor, mark);
    }
  }

  return field;
}

function spreadCon(field, posX, posY, newColor, mark) {

  field[posX][posY].setConnection(mark);

  if ((posX < field.length - 1) && (field[posX + 1][posY].getColor() === newColor) && (field[posX + 1][posY].getConnection() === 0)) {
    spreadCon(field, posX + 1, posY, newColor, mark);
  }

  if ((posY < field.length - 1) && (field[posX][posY + 1].getColor() === newColor) && (field[posX][posY + 1].getConnection() === 0)) {
    spreadCon(field, posX, posY + 1, newColor, mark);
  }

  if ((posX >= 1) && (field[posX - 1][posY].getColor() === newColor) && (field[posX - 1][posY].getConnection() === 0)) {
    spreadCon(field, posX - 1, posY, newColor, mark);
  }

  if ((posY >= 1) && (field[posX][posY - 1].getColor() === newColor) && (field[posX][posY - 1].getConnection() === 0)) {
    spreadCon(field, posX, posY - 1, newColor, mark);
  }
}

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

function victoryCheck(field) {
  var conField = field.getConnections();
  var flatField = [].concat.apply([], conField);
  var uniqueEL = flatField.filter(onlyUnique);
  if ((uniqueEL.length === 2) && (uniqueEL.indexOf(0) === -1)) {
    return true;
  }
  else {
    return false;
  }
}

function findWinner(field) {
  var first = field[0][0];
  var arr = [].concat.apply([], field).sort();
  var cntA = 0;

  for (var i = 0; i < arr.length; i++) {
    if (arr[i] === first) cntA++;
  }

  return cntA;
}

function socketIndex(socketID, userPairs) {
  var index = 0;
  var seekPair = null;
  seekPair = userPairs.filter(function (pair) {
    return pair.indexOf(socketID) != -1;
  });
  index = userPairs.indexOf(seekPair[0]);
  return index;
}

class Tile {
  constructor(color) {
    this.color = color;
    this.connection = 0;
  }

  setColor(newColor) {
    this.color = newColor;
  };

  getColor() {
    return this.color;
  };

  setConnection(num) {
    this.connection = num;
  };

  getConnection() {
    return this.connection;
  };
};

class Field {
  constructor() {
    this.field = Array(11).fill().map(() => Array.from({ length: 11 }, () => new Tile(Math.floor(Math.random() * 6))));
  }

  getField() {
    return this.field;
  };

  getConnections() {
    var connectedField = this.field.map((e) => e.map((el) => el.getConnection()));
    return connectedField;
  };

  getColors() {
    var colorField = this.field.map((e) => e.map((el) => el.getColor()));
    return colorField;
  };
}

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {

  beforeLog.push(socket);

  socket.on('disconnect', function () {
    logList.splice(logList.indexOf(socket), 1);

    if (beforeLog.indexOf(socket) != -1) {
      beforeLog.splice(beforeLog.indexOf(socket), 1);
    }

    else if (afterLog.indexOf(socket) != -1) {
      afterLog.splice(afterLog.indexOf(socket), 1);
    }

    else {
      var index = socketIndex(socket, pairs);
      var leavingPair = pairs[index];

      if (socket === leavingPair[0]) {
        leavingPair[1].emit('wait');
        leavingPair[1].emit('victory');
        afterLog.push(leavingPair[1]);
        unpairedPlayers++;
        startGame();
      }
      else if (socket === leavingPair[1]) {
        leavingPair[0].emit('wait');
        leavingPair[0].emit('victory');
        afterLog.push(leavingPair[0]);
        unpairedPlayers++;
        startGame();
      }

      pairs.splice(index, 1);
    }
  });

  socket.on('writing', function (data) {
    var tdata = '' + data[0] + ',' + data[1].hashCode() + '\n';
    fs.appendFile('data.txt', tdata, (err) => {
      if (err) throw err;
			sqs.sendMessage(params_register, function(err, data) {
				if (err) {
					console.log("Error writing in QUEUE", err);
				}
			});
		});
  });

  socket.on('login', function (dataLog) {
    var strData = '' + dataLog[0] + ',' + dataLog[1].hashCode() + '';
    fs.readFile('data.txt', 'utf8', (err, data) => {
      if (err) throw err;
      else {
        var fileData = data.split('\n');
        if ((fileData.indexOf(strData) != -1) && (logList.indexOf(socket) === -1)) {

          unpairedPlayers++;
          logList.push(socket);
          afterLog.push(socket);
          beforeLog.splice(beforeLog.indexOf(socket), 1);

          startGame();
        }
        else {
          socket.emit('failedLogin');
        }
      }
    });
  });

  function startGame() {
    if (unpairedPlayers === 1) socket.emit('waitingForPlayer');
    if (unpairedPlayers === 2) {

      var field = new Field;
      afterLog.push(field);

      afterLog[0].emit('continue');
      afterLog[0].emit('draw', afterLog[2].getColors());
      afterLog[1].emit('draw', afterLog[2].getColors());
      afterLog[1].emit('wait');

      pairs.push(afterLog);
      afterLog = [];
      unpairedPlayers = 0;
    }
  };

  socket.on('spread', function (newColor) {
    var index = socketIndex(socket, pairs);
    var tval = 10 * turn;
    var oTurn = (turn + 1) % 2;
    var playingPair = pairs[index];
    var mark = turn + 1;

    playingPair[oTurn].emit('continue');
    playingPair[turn].emit('wait');

    var oldColor = playingPair[2].field[tval][tval].getColor();

    playingPair[2].field = spread(playingPair[2].field, tval, tval, oldColor, newColor, mark);

    playingPair[0].emit('draw', playingPair[2].getColors());
    playingPair[1].emit('draw', playingPair[2].getColors());

    turn = oTurn;

    if (victoryCheck(playingPair[2])) {
      var score = findWinner(playingPair[2].getConnections());
      if (score > 60) {
        playingPair[0].emit('victoryScore', score);
        playingPair[1].emit('defeatScore', 121 - score);
      }
      else {
        playingPair[1].emit('victoryScore', score);
        playingPair[0].emit('defeatScore', 121 - score);
      }
    }
  });

  socket.on('sameOpponent', function () {
    var index = socketIndex(socket, pairs);
    pairs[index].pop(); // removes field

    var repeatPair = pairs[index];
    pairs.splice(index, 1);

    var field = new Field;
    repeatPair.push(field);
    repeatPair[0].emit('continue');
    repeatPair[0].emit('draw', repeatPair[2].getColors());
    repeatPair[1].emit('draw', repeatPair[2].getColors());
    repeatPair[1].emit('wait');

    pairs.push(repeatPair);
  });

  socket.on('newOpponent', function () {
    var index = socketIndex(socket, pairs);
    pairs[index].pop();

    var leavingPair = pairs[index];
    pairs.splice(index, 1);
    afterLog.push(leavingPair[0]);
    unpairedPlayers++;
    startGame();

    setTimeout(function () {
      afterLog.push(leavingPair[1]);
      unpairedPlayers++;
      startGame();
    }, 500);
  });
});

http.listen(3000, function () {
  //console.log('listening on *:3000');
});
