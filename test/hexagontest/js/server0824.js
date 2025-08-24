const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");


// app.useは、
// 「このURLパスにアクセスが来たとき、指定した処理を実行する」という意味です。
// app.use(express.static('public'))
// → 「すべてのパス / に対して、publicフォルダからファイルを探して返す」
// 上から順番にそのディレクトリから検索しているイメージ
app.use(express.static('public'));

// test用ディレクトリ 今後のテスト用にも一応残す
// test/hexagontest/js を /js に公開
// app.use("/js", express.static(path.join(__dirname, "../test/hexagontest/js")));
// cssもjsと同様
// app.use("/css", express.static(path.join(__dirname, "../test/hexagontest/css")));

// ゲーム用ページ
// app/hexagon-map にディレクトリを移した
app.use("/js", express.static(path.join(__dirname, "/hexagon-map/js")));
app.use("/css", express.static(path.join(__dirname, "/hexagon-map/css")));

// -----------------
// ページルーティング
// -----------------

// ｃｈａｔ用
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/chat", (req, res) => {
  res.sendFile(__dirname + "/public/chat.html");
});

// ゲーム用ページ
// テスト用ディレクトリ 今後テスト用にも一応残す
// app.get("/game", (req, res) => {
//   res.sendFile("/usr/src/test/hexagontest/hexagontest_clone3_socketver.html"); 
// });

// ゲーム用ページ
// app/hexagon-map にディレクトリを移した
app.get("/game", (req, res) => {
  res.sendFile(__dirname + "/hexagon-map/hexagon-map.html"); 
});

// -----------------
// チャット用Socket
// -----------------

let store = {};

io.on("connection", (socket) => {
  socket.on("join", (msg) => {
    usrobj = {
      'room': msg.roomId,
      'name': msg.name
    }
    store = usrobj;
    socket.join(msg.roomId);
  })

  socket.on("post", (msg) => {
    io.to(store.room).emit("message", msg);
  });
});

// -----------------
// ゲーム用Socket
// -----------------
const gamePlayers = {};

io.of('/game').on("connection", (socket) => {
  console.log("[game] user connected", socket.id);

  // プレイヤー参加
  socket.on("join", (msg) => {
    // msg = { roomId, name }
    gamePlayers[socket.id] = { room: msg.roomId, name: msg.name, q: msg.q, r: msg.r };
    socket.join(msg.roomId);

    // 同じルームの他プレイヤー情報を新規参加者に送信
    const others = Object.entries(gamePlayers)
      .filter(([id, p]) => p.room === msg.roomId && id !== socket.id)
      .map(([id, p]) => ({ playerId: id, q: p.q, r: p.r, name: p.name }));
    socket.emit('init_players', others);

    // 既存プレイヤーに新規参加者情報を通知
    socket.to(msg.roomId).emit('init_players', [{ playerId: socket.id, q: msg.q, r: msg.r, name: msg.name }]);
  });

  // 移動イベント
  socket.on("move", (data) => {
    if (gamePlayers[socket.id]) {
      gamePlayers[socket.id].q = data.q;
      gamePlayers[socket.id].r = data.r;
      socket.to(gamePlayers[socket.id].room).emit('move', {
        playerId: socket.id,
        q: data.q,
        r: data.r
      });
    }
  });

  // 切断時
  socket.on("disconnect", () => {
    if (gamePlayers[socket.id]) {
      const room = gamePlayers[socket.id].room;
      delete gamePlayers[socket.id];
      socket.to(room).emit('player_disconnect', { playerId: socket.id });
    }
  });
});

// -----------------
// サーバ起動
// -----------------

http.listen(3000, () => {
    console.log("success listen 3000");
})