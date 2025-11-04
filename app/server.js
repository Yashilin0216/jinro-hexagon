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
// app.use(express.static('public')) によって public/index.html が「デフォルトのトップページ」になる
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


// ページルーティング

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
// ゲーム用Socket
// -----------------
let gamePlayers = {};
let turnOrder = {};   // ルームごとのターン順 { roomId: [name1, name2, ...] }
let turnIndex = {};   // ルームごとの現在ターンインデックス { roomId: idx }

// 六方向ベクトル
const dirs = [
  { q: +1, r: 0 },   // 東
  { q: +1, r: -1 },  // 北東
  { q: 0,  r: -1 },  // 北西
  { q: -1, r: 0 },   // 西
  { q: -1, r: +1 },  // 南西
  { q: 0,  r: +1 },  // 南東
];

io.of('/game').on("connection", (socket) => {
  console.log("[game] user connected", socket.id);

  // プレイヤー参加
  socket.on("join", (msg) => {

    // phaseを初期化し、クライアント側から来たフェーズを代入
    if (!global.phase) global.phase = {};
    global.phase[msg.roomId] = msg.phase;
    // msg = { roomId, name }
    gamePlayers[socket.id] = { room: msg.roomId, name: msg.name, q: msg.q, r: msg.r, is_alive: msg.is_alive };
    socket.join(msg.roomId);

    // 同じルームの他プレイヤー情報を新規参加者に送信
    const others = Object.entries(gamePlayers)
      .filter(([id, p]) => p.room === msg.roomId && id !== socket.id)
      .map(([id, p]) => ({ playerId: id, q: p.q, r: p.r, name: p.name, is_alive: p.is_alive  }));
    socket.emit('init_others', others);



    //ターン順を辞書順で管理
    const names = Object.values(gamePlayers)
      .filter(p => p.room === msg.roomId)
      .map(p => p.name)
      .sort((a, b) => a.localeCompare(b));

    turnOrder[msg.roomId] = names;
    if (!(msg.roomId in turnIndex)) turnIndex[msg.roomId] = 0;

    // 自分の順番（index）を turnOrder から取得
    const myidx = turnOrder[msg.roomId].indexOf(msg.name);

    // 初期位置を再度初期化する為の変数
    let initialPos;
    // 六人以下の時六方向にプレイヤーをばらけさせて再度初期化
    if (myidx < 6) {
      const dir = dirs[myidx];
      // initialPos = { q: msg.q + dir.q * msg.radius, r: msg.r + dir.r * msg.radius };
      // デバッグ用で近くする。本当は１じゃなくてmsg.radius
      initialPos = { q: msg.q + dir.q * 1, r: msg.r + dir.r * 1 };
      // 再定義、このためにconstからletにした。なにか不具合あるかも？
      gamePlayers[socket.id] = { room: msg.roomId, name: msg.name, q: initialPos.q, r: initialPos.r, is_alive: msg.is_alive };

      // 自分に対して初期位置の再定義を通知
      socket.emit('initialPos',initialPos);
    }

    // 既存プレイヤーに新規参加者情報を通知
    socket.to(msg.roomId).emit('init_players', [{ playerId: socket.id, q: gamePlayers[socket.id].q, r: gamePlayers[socket.id].r, name: msg.name, is_alive: msg.is_alive }]);

    //現在のターンを全員に通知
    io.of('/game').to(msg.roomId).emit("turn", { current: turnOrder[msg.roomId][turnIndex[msg.roomId]] });

  });

  // 移動イベント
  socket.on("move", (data) => {
    //「本人のターンか」を厳密チェック
    const player = gamePlayers[socket.id];
    const order  = turnOrder[player.room];
    const idx    = turnIndex[player.room];
    //現在のターンプレイヤー以外は無視
    if (player.name !== order[idx]) {
      socket.emit("error", { msg: "あなたのターンではありません" });
      return;
    }

    if(player.is_alive){
      //ターン正常で生きてるなら動く
      player.q = data.q; player.r = data.r;
      socket.to(player.room).emit('move', { playerId: socket.id, q: data.q, r: data.r });
    }else{
      console.log("死亡動けない判定")
    }
    // ルームごとにターン経過数を管理 turnCounter初期化
    if (!global.turnCounter) global.turnCounter = {};
    if (!(player.room in global.turnCounter)) global.turnCounter[player.room] = 0;

    // ターンを進める
    turnIndex[player.room] = (turnIndex[player.room] + 1) % order.length;
    io.of('/game').to(player.room).emit("turn", { current: order[turnIndex[player.room]] });

    // 1巡終わったらターン数をカウント
    if (idx === order.length - 1) {
      //turnカウンターを増やす
      global.turnCounter[player.room]++;

      console.log(`Room ${player.room} の経過ターン数: ${global.turnCounter[player.room]}`);

      // 指定したターン数に達したら昼夜切替
      const switchTurn = 2;  // ここで指定ターン数
      // turn数がswitchTurnを越せばフェーズ切り替え処理
      if (global.turnCounter[player.room] >= switchTurn) {
        // フェーズを切り替え
        global.phase[player.room] = (global.phase[player.room] === "day" ? "night" : "day");
        global.turnCounter[player.room] = 0;  // リセット

        console.log("フェーズ自動切替:", global.phase[player.room]);
        // 全員にフェーズ変更を通知
        io.of('/game').to(player.room).emit("phaseChanged", { phase: global.phase[player.room] });
      }
    }
  });

  //killイベント
  socket.on("kill", (data) => {
    const player = gamePlayers[data.playerId];
    player.is_alive = false;
    console.log(player);
    socket.to(player.room).emit("kill", { playerId: data.playerId, name: player.name, is_alive: false });

    // 死亡した際、ターンの中から除外する
    const room = player.room;
    delete gamePlayers[data.playerId];
    io.of('/game').to(room).emit('player_death', { playerId: data.playerId});


    // 死んだプレイヤーを除いて順番を組み直し
    const names = Object.values(gamePlayers)
      .filter(p => p.room === room)
      .map(p => p.name)
      .sort((a, b) => a.localeCompare(b));
    turnOrder[room] = names;
    if (turnIndex[room] >= names.length) turnIndex[room] = 0;

    io.of('/game').to(room).emit("turn", { current: names[turnIndex[room]] });
    
  })

  // kill protect などアクションを受信
  socket.on('actionResult', (result) => {
      console.log('アクション結果を受信:', result);
      const targetPlayer = gamePlayers[result.targetId];
      const room = targetPlayer.room;
      console.log("actionResult",targetPlayer);
      if (targetPlayer) {
          // サーバーから送られてきた最新の状態で上書きする
          targetPlayer.is_alive = result.targetState.is_alive;
          targetPlayer.is_protected = result.targetState.is_protected;
      }
      // action結果をクライアント側に送信
      io.of('/game').to(room).emit("actionResult", {id: result.targetId, is_alive: targetPlayer.is_alive, is_protected: targetPlayer.is_protected});

      // 死亡している時はターンから排除する処理を行う
      if(!targetPlayer.is_alive){
        // 死亡した際、ターンの中から除外する
        delete gamePlayers[result.targetId];
        io.of('/game').to(room).emit('player_death', { playerId: result.targetId});


        // 死んだプレイヤーを除いて順番を組み直し
        const names = Object.values(gamePlayers)
          .filter(p => p.room === room)
          .map(p => p.name)
          .sort((a, b) => a.localeCompare(b));
        turnOrder[room] = names;
        if (turnIndex[room] >= names.length) turnIndex[room] = 0;

        io.of('/game').to(room).emit("turn", { current: names[turnIndex[room]] });
      }

      
  });

  // フェーズ切り替えを受信
  socket.on("changePhase", (msg) => {
    const player = gamePlayers[socket.id];
    const room = player.room;
    console.log("phase changed to", msg.phase);
    // 全クライアントに通知
    io.of('/game').to(room).emit("phaseChanged", msg);
  });

  // 切断時
  socket.on("disconnect", () => {
    if (gamePlayers[socket.id]) {
      const room = gamePlayers[socket.id].room;
      delete gamePlayers[socket.id];
      socket.to(room).emit('player_disconnect', { playerId: socket.id });


      // 抜けたプレイヤーを除いて順番を組み直し
      const names = Object.values(gamePlayers)
        .filter(p => p.room === room)
        .map(p => p.name)
        .sort((a, b) => a.localeCompare(b));
      turnOrder[room] = names;
      if (turnIndex[room] >= names.length) turnIndex[room] = 0;

      io.of('/game').to(room).emit("turn", { current: names[turnIndex[room]] });
    }
  });
});

// -----------------
// サーバ起動
// -----------------

http.listen(3000, () => {
    console.log("success listen 3000");
})