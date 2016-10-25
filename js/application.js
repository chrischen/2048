// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  var handleData = function(data){
    // This function handles game state once a connection is established with a peer
    if (window.connTimeout) {
      clearTimeout(window.connTimeout);
      window.connTimeout = null;
    }
    if (data.state) {
      if (data.state === 'unavailable') {
        // Either connected player is in game or you're in a game
        window.connection.close();
        if (data.state === 'unavailable') {
          window.peerx += 1;
          findMatch();
        }
        if (window.location.hash) {
          alert('Player is already in this game.');
          window.location.href = 'index.html';
        }
      } else {
        // Player is available and connected. Start a game!
        window.inGame = true;
        window.Game = new GameManager(4, KeyboardInputManager, HTMLActuator, LocalScoreManager, window.location.hash.slice(1), 1, data.state);
      }
    }

    if (data.connected) {
      if (window.connTimeout) {
        clearTimeout(window.connTimeout);
        window.connTimeout = null;
      }

      if (data.matchmaking && !window.searching) {
        window.connection.send({state: 'unavailable'});
        window.connection.close();
        return;
      }

      // Game was started in between opening this connection
      if (window.inGame)
        return;

      // Send game
      if (!window.Game)
        window.Game = new GameManager(4, KeyboardInputManager, HTMLActuator, LocalScoreManager, window.connection.id, 0);

      window.inGame = true;
      window.searching = false;

      window.connection.send({state: { grid: window.Game.grid.serialize(), currentPlayer: window.Game.currentPlayer, scores: window.Game.scores }});
    }

    if (data.seed !== undefined && data.move !== undefined && window.Game.continueGame) {
      // Cache next move
      window.Game.nextMove = [data.move, data.seed];
      return;

    }
    if (data.move !== undefined) {
        window.Game.move.apply(window.Game, [data.move, true]);
    }
    if (data.seed !== undefined) {
      if (window.Game.continueGame) {
        window.Game.continueGame(data.seed);
        if (window.Game.nextMove) {
          window.Game.move.apply(window.Game, [window.Game.nextMove[0], true])
          window.Game.continueGame(window.Game.nextMove[1]);
          window.Game.nextMove = null;
        }
      }
    }
  };
  // Matchmaking is fairly hacky, but manages to work without a central server (other than the PeerJS broker)
  function findMatch() {
    var peers = window.peerList;
    if (!window.inGame) {
      if (peers[window.peerx]) {
        if (peers[window.peerx] !== window.connectionId) { // Check to make sure we aren't connecting to ourself
          var timeout = 150; // Because many the window.peerList list is stagnant, it can contain many dead clients. A low timeout value is set so the whole list can be scanned faster.
          if (window.connTimeout) {
            window.connection.close();
            clearTimeout(window.connTimeout);
            window.connTimeout = null;
          }
          // Connecto to the peer
          window.connection = peer.connect(peers[window.peerx], {reliable: true});
          window.connection.on('open', function(){
            if (window.connTimeout) {
              clearTimeout(window.connTimeout);
              window.connTimeout = null;
            }
            window.connection.send({connected: true, matchmaking: true});
            window.connection.on('data', handleData);
            if (!window.inGame)
              window.connTimeout = setTimeout(function(){
                window.connTimeout = null;
                window.connection.close();
                window.peerx += 1;
                findMatch();
              }, timeout);
          });
          window.connTimeout = setTimeout(function(){
            window.connTimeout = null;
            window.connection.close();
            window.peerx += 1;
            findMatch();
          }, timeout);
        } else {
          window.peerx += 1;
          findMatch(); // Recursively find a peer until we succeed
        }
      } else {
        // If we've exhausted all peers, refresh the list and try again
        peer.listAllPeers(function(list) {
          window.peerList = list;
          if (window.connTimeout) {
            window.connection.close();
            clearTimeout(window.connTimeout);
            window.connTimeout = null;
          }
          if (list[0]) {
            window.peerx = 0;
            findMatch(); // Recursively find a peer until we succeed
          }
        });
      }
    }
  }
  // Matchmaking button click handler
  document.querySelector(".find-match").onclick = function(e) {
    e.preventDefault();
    if (!window.connectionId)
      return;
    window.searching = true;

    document.querySelector(".current-player").textContent = 'Finding a player...';
    peer.listAllPeers(function(list) {
      // This gets all available peers, but the list is usually stagnant and contains many dead peers or occupied peers
      window.peerList = list;
      if (list[0])
        window.peerx = 0; // The index of the opponent peer id to try
        findMatch();
    });
  };

  // PeerJS webRTC wrapper
  var peer = new Peer({key: 'tu24ikh5mq0bpgb9'});

  // Guest
  if (window.location.hash) {
    // This is a link to start a game
    // Pulls the PeerID from the URL hash
    document.querySelector(".room-link").remove();
    var conn = peer.connect(window.location.hash.slice(1), {reliable: true});
    conn.on('open', function(){
      // Connected and start the game!
      window.connection = conn;
      conn.send({connected: true});
      conn.on('data', handleData);
    });
  } else {
    // Host
    peer.on('open', function(id){
      window.connectionId = id;
      // Generate a link to share so another player can directly connect
      document.querySelector(".room-input").value = 'http://instapainting.com/2x2048/index.html#' + id;
    });

    peer.on('connection', function(conn) {
      conn.on('open', function(){
        // Connected and start the game!
        if (!window.inGame) {
          window.connection = conn;

          conn.on('data', handleData);
          conn.on('close', function(conn){
            if (window.inGame) {
              window.inGame = false;
              if (window.Game.continueGame)
                window.Game.continueGame(Math.random());
            }
          });
        } else {
            conn.send({state: 'unavailable'});
        }
      });
    });

  }
});
