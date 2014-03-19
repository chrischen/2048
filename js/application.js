// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  if (window.location.hash) {
    var peer = new Peer({key: 'tu24ikh5mq0bpgb9'});
    var conn = peer.connect(window.location.hash.slice(1));
    window.connection = conn;
    conn.on('open', function(){
      conn.send({connected: true});
      conn.on('data', function(data){
        if (data.state)
          window.Game = new GameManager(5, KeyboardInputManager, HTMLActuator, LocalScoreManager, window.location.hash.slice(1), data.state);
        if (data.move !== undefined) {
          window.Game.move.apply(window.Game, [data.move, true]);
        }
        if (data.seed !== undefined) {
          if (window.Game.continueGame)
            window.Game.continueGame(data.seed);
        }
      });
    });
  } else {
    var peer = new Peer({key: 'tu24ikh5mq0bpgb9'});
    peer.on('open', function(id){
      document.querySelector(".room-input").value = 'https://instapainting.com/2x2048/index.html#' + id;
    });
    peer.on('connection', function(conn) {
      window.connection = conn;
      conn.on('data', function(data){
        if (data.connected)
          conn.send({state: window.Game.grid.serialize()});
          window.Game = new GameManager(5, KeyboardInputManager, HTMLActuator, LocalScoreManager, conn.id);
        if (data.move !== undefined) {
          window.Game.move.apply(window.Game, [data.move, true]);
        }
        if (data.seed !== undefined) {
          if (window.Game.continueGame)
            window.Game.continueGame(data.seed);
        }
      });
    });
  }
});
