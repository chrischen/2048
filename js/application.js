// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  var handleData = function(data){
    if (data.state) {
      window.Game = new GameManager(4, KeyboardInputManager, HTMLActuator, LocalScoreManager, window.location.hash.slice(1), 1, data.state);
    }
    if (data.connected) {
      if (!window.Game)
        window.Game = new GameManager(4, KeyboardInputManager, HTMLActuator, LocalScoreManager, window.connection.id, 0);

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
    if (data.restart !== undefined) {
    }
  };

  var peer = new Peer({host: '54.243.51.247', port: 9005});

  if (window.location.hash) {
    document.querySelector(".room-link").remove();
    var conn = peer.connect(window.location.hash.slice(1), {reliable: true});
    window.connection = conn;

    conn.on('open', function(){
      conn.send({connected: true});
      conn.on('data', handleData);
    });
  } else
    peer.on('open', function(id){
      document.querySelector(".room-input").value = 'http://instapainting.com/2x2048/index.html#' + id;
    });

  peer.on('connection', function(conn) {
    window.connection = conn;
    conn.on('data', handleData);
  });
});
