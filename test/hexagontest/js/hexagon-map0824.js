// めも "そのうち消す"のコメントを早めに消す
const { createApp, ref, reactive, computed, onMounted } = Vue;

// 行動制限用クラス
import { RadiusRestriction } from "./move_restrictions.js";
const three_restriction = new RadiusRestriction(3);

// -------------------------
// ▼▼▼ 変更点：ソケット接続を/game namespace に変更 ▼▼▼
// -------------------------
const socket = io("/game");  // ★ここを追加（デフォルト→/game）
                            // チャットとは別namespaceに接続するため、競合しない
socket.on("connect", () => {
console.log("ゲーム接続成功:", socket.id);
});

// URLパラメータからroomId, nameを取得（チャットと同じ要領）
const url = new URL(window.location.href);
const params = url.searchParams;
const urlRoomId = parseInt(params.get("roomId")) || 0;
const urlName = params.get("name") || "player";

// 設定値（反応型）
const cfg = reactive({ hex_size: 28, map_size: 11, margin: 24 }); // 六角形サイズ・盤面列数・行数・余白
const camera = reactive({ x: 0, y: 0}); // カメラ位置（SVGの平行移動に使用）
const selected = reactive({ q: (cfg.map_size-1)/2, r: (cfg.map_size-1)/2 }); // 選択中のセル(axial座標) playerとほぼ同じ論理なのに置き換えるとバグる。Cannot read properties of undefined (reading 'q').なぜ？
const hover = ref(null); // ホバー中のセル情報
const highlight_center = reactive({ q: (cfg.map_size-1)/2, r: (cfg.map_size-1)/2 }); // 中心セル 色付けテスト用（緑）
const highlight_radius = ref(5); // 半径 中心除いてｎマス 中心入れてn+1マス 色付けテスト用（緑）

// -------------------------
// ▼▼▼ 変更点：自分のプレイヤー情報を定義 ▼▼▼
// -------------------------
const player = reactive({ q: (cfg.map_size-1)/2, r: (cfg.map_size-1)/2, name: urlName });

// 他プレイヤー一覧
const players = reactive({});

// -------------------------
// ▼▼▼ 変更点：参加処理を/game用に変更 ▼▼▼
// -------------------------
socket.emit("join", {
     roomId: urlRoomId, 
     name: urlName,
     q: player.q,       // クライアント側初期位置を送信するパラメータを追加
     r: player.r
    });

// 既存プレイヤー情報を受信
socket.on("init_players", (others) => {
  others.forEach((p) => {
    players[p.playerId] = p;
  });
});

// 新規プレイヤー情報を受信
socket.on('init_players', (list) => {
  list.forEach(p => players[p.playerId] = { q: p.q, r: p.r, name: p.name });
});

// 他プレイヤーの移動を受信
socket.on("move", (data) => {
  if (players[data.playerId]) {
    players[data.playerId].q = data.q;
    players[data.playerId].r = data.r;
  } else {
    players[data.playerId] = data;
  }
});

// 他プレイヤー切断
socket.on("player_disconnect", (data) => {
  delete players[data.playerId];
});



// Vue 3 アプリの作成
createApp({
  setup() {


    // 盤面配列を生成する計算プロパティ 矩形バージョン そのうち消す
    // const grid = computed(() => {
    //   const rows = [];
    //   for (let r = 0; r < cfg.map_size; r++) { // 行ループ
    //     const row = [];
    //     for (let q = 0; q < cfg.map_size; q++) { // 列ループ
    //       const px = axial_to_pixel(q, r, cfg.hex_size); // 六角座標をピクセル座標に変換
    //       row.push({ q, r, x: px.x + cfg.margin, y: px.y + cfg.margin }); // タイル情報を格納
    //     }
    //     rows.push(row); // 行を追加
    //   }
    //   return rows;
    // });

    // 盤面配列を生成する計算プロパティ distance()で中心;highlight_centerから半径;highlight_radiusまでの距離のみ表示している
    const grid = computed(() => {
    const rows = [];
    for (let r = 0; r < cfg.map_size; r++) { // 行ループ
        const row = [];
        for (let q = 0; q < cfg.map_size; q++) { // 列ループ
        // 六角座標をピクセル座標に変換
        const px = axial_to_pixel(q, r, cfg.hex_size);

        // 半径Rマス以内のみ追加
        if (distance({q, r}, highlight_center) <= highlight_radius.value) {
            row.push({ q, r, x: px.x + cfg.margin, y: px.y + cfg.margin });
        }
        }
        // 行が空でなければ追加
        if (row.length > 0) rows.push(row);
    }
    return rows;
    });

    // SVGのviewBoxを計算する
    const view_box = computed(() => {
      const last = axial_to_pixel(cfg.map_size - 1, cfg.map_size - 1, cfg.hex_size); // 最右下セルの座標
      const w = last.x + cfg.hex_size * 2 + cfg.margin * 2;
      const h = last.y + cfg.hex_size * 2 + cfg.margin * 2;
      return `0 0 ${w} ${h}`; // SVG viewBox文字列を返す
    });

    // 選択セルのピクセル座標（マーカー描画用）
    const pos_px = computed(() => {
      const p = axial_to_pixel(selected.q, selected.r, cfg.hex_size);
      return { x: p.x + cfg.margin + camera.x, y: p.y + cfg.margin + camera.y };
    });

    // 六角形座標をピクセルに変換
    function axial_to_pixel(q, r, size) {
      const s3 = Math.sqrt(3);
      const x = size * (s3 * q + (s3 / 2) * r); // x座標計算（pointy-top）
      const y = size * (1.5 * r); // y座標計算
      return { x, y };
    }

    // 六角形の頂点座標を計算
    function hex_corners(cx, cy, size) {
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 180 * (60 * i - 30); // pointy-top方向に60度刻み
        pts.push([cx + size * Math.cos(angle), cy + size * Math.sin(angle)]); // 頂点座標を追加
      }
      return pts;
    }

    // SVG用に頂点座標を文字列に変換
    function hex_points(cx, cy) {
      return hex_corners(cx, cy, cfg.hex_size).map(p => p.join(',')).join(' ');
    }

    // 六方向ベクトル（axial座標）
    const dirs = [
      { q: +1, r: 0 },  // 東
      { q: +1, r: -1 }, // 北東
      { q: 0,  r: -1 }, // 北西
      { q: -1, r: 0 },  // 西
      { q: -1, r: +1 }, // 南西
      { q: 0,  r: +1 }, // 南東
    ];

    // 選択セルを指定方向に移動する そのうち消す
    // function move_dir(i) {
    //   const nq = clamp(selected.q + dirs[i].q, 0, cfg.map_size - 1); // qを範囲内に制限
    //   const nr = clamp(selected.r + dirs[i].r, 0, cfg.map_size - 1); // rを範囲内に制限
    //   selected.q = nq; selected.r = nr; // 選択セル更新
    // }
    
    // 選択セルを指定方向に移動する is_boundsでいけるとこ判定
    function move_dir(i) {
    const nq = selected.q + dirs[i].q;
    const nr = selected.r + dirs[i].r;
    if (in_bounds(nq, nr)) {
        selected.q = nq;
        selected.r = nr;
    
        // ▼▼▼ 追加：自分の位置をサーバーに送信 ▼▼▼
        socket.emit("move", { q: nq, r: nr });
    }
    }

    // 値を範囲内に制限
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    // 指定セルが現在選択されているか判定
    function is_selected(cell) { return cell.q === selected.q && cell.r === selected.r; }

    // 指定セルがホバーされているか判定
    function is_hover(cell) { return hover.value && hover.value.q === cell.q && hover.value.r === cell.r; }

    // 「半径Rマス以内」を判定する処理 a,bはそれぞれ座標 リターンは距離
    function distance(a, b) {
    // axial座標距離（六角形グリッド上）
    return (Math.abs(a.q - b.q)
            + Math.abs(a.q + a.r - b.q - b.r)
            + Math.abs(a.r - b.r)) / 2;
    }

    // セルの塗り分け
    function tile_fill(cell) {
      if (is_selected(cell)) return 'url(#g-active)';
      if (is_hover(cell)) return 'url(#g-hover)';

      // 半径Rマス以内なら緑に染める テスト用に矩形で作った中から半径ｒで緑に染めた。そのうち消す
      // if (distance(cell, highlight_center) <= highlight_radius.value) return 'green';
      return 'url(#g-tile)';
    }

    // SVGボード参照
    const board_ref = ref(null);

    // キーボード入力処理
    function on_key(e) {
      if (e.key.startsWith('Arrow')) { // 矢印キーでカメラ移動
        const step = 24;
        if (e.key === 'ArrowLeft') camera.x += step;
        if (e.key === 'ArrowRight') camera.x -= step;
        if (e.key === 'ArrowUp') camera.y += step;
        if (e.key === 'ArrowDown') camera.y -= step;
        e.preventDefault(); // デフォルトのスクロール抑制
        return;
      }
      const k = e.key.toLowerCase(); // 六方向移動キー
      if (k === 'w') move_dir(0);
      else if (k === 'e') move_dir(1);
      else if (k === 'q') move_dir(2);
      else if (k === 's') move_dir(3);
      else if (k === 'a') move_dir(4);
      else if (k === 'd') move_dir(5);
    }

    // マウス移動イベント処理（ホバー判定）
    function on_mouse_move(evt) {
      const pt = svg_point(evt); // SVG座標に変換
      const ar = pixel_to_axial_rough(pt.x - camera.x - cfg.margin, pt.y - camera.y - cfg.margin, cfg.hex_size); // 近似でaxial座標取得
      hover.value = in_bounds(ar.q, ar.r) ? ar : null; // 盤面内ならホバー更新
    }

    // マウスクリックイベント（選択セル移動）
    function on_click(evt) {
      const pt = svg_point(evt);
      const ar = pixel_to_axial_round(pt.x - camera.x - cfg.margin, pt.y - camera.y - cfg.margin, cfg.hex_size); // 正確にaxial座標
      // is_bondsで盤面か判断。three_restriction.canMoveで半径3以内か判定
      if (in_bounds(ar.q, ar.r) && three_restriction.canMove(player, { q: ar.q, r: ar.r },player.name)) { 
        // 移動判定を更新するにはselectedとplayerどちらも更新しなければならない
        selected.q = ar.q; selected.r = ar.r; 
        player.q = ar.q; player.r = ar.r;
        // ▼▼▼ 追加：サーバーに送信 ▼▼▼
        socket.emit("move", { q: ar.q, r: ar.r });
      }
      console.log(players);
      console.log(player);
    }
    // ---- 変更点：描画時に他プレイヤーも表示 ----
    // socket用に追加
    function render_players(cell) {
      const arr = [];
      for (const id in players) {
        const p = players[id];
        if (p.q === cell.q && p.r === cell.r) {
          arr.push(p);
        }
      }
      return arr;
    }

    // 指定座標が盤面内か判定 そのうち消す
    // function in_bounds(q, r) { return q >= 0 && q < cfg.map_size && r >= 0 && r < cfg.map_size; }

    // 指定座標が盤面内か判定
    function in_bounds(q, r) {
        return distance({q, r}, highlight_center) <= highlight_radius.value;
    }

    // SVGのマウス座標を取得
    function svg_point(evt) {
      const svg = evt.currentTarget;
      const pt = svg.createSVGPoint();
      pt.x = evt.clientX; pt.y = evt.clientY;
      const inv = svg.getScreenCTM().inverse(); // SVG座標系に変換
      const sp = pt.matrixTransform(inv);
      return { x: sp.x, y: sp.y };
    }

    // 近似でピクセル→axial
    function pixel_to_axial_rough(x, y, size) {
      const s3 = Math.sqrt(3);
      const qf = (s3/3 * x - 1/3 * y) / size;
      const rf = (2/3 * y) / size;
      const { q, r } = axial_round(qf, rf);
      return { q, r };
    }

    // 正確なピクセル→axial変換
    function pixel_to_axial_round(x, y, size) {
      const s3 = Math.sqrt(3);
      const qf = (s3/3 * x - 1/3 * y) / size;
      const rf = (2/3 * y) / size;
      return axial_round(qf, rf);
    }

    // axial座標の四捨五入（cube座標経由）
    function axial_round(qf, rf) {
      const xf = qf;
      const zf = rf;
      const yf = -xf - zf;
      let rx = Math.round(xf);
      let ry = Math.round(yf);
      let rz = Math.round(zf);
      const x_diff = Math.abs(rx - xf);
      const y_diff = Math.abs(ry - yf);
      const z_diff = Math.abs(rz - zf);
      if (x_diff > y_diff && x_diff > z_diff) { rx = -ry - rz; } // 最も大きい差を修正
      else if (y_diff > z_diff) { ry = -rx - rz; }
      else { rz = -rx - ry; }
      return { q: rx, r: rz };
    }

    // マウント時にボードにフォーカスを当てる
    onMounted(() => { board_ref.value && board_ref.value.focus(); });

    return { cfg, grid, selected, hover, camera, view_box, pos_px, hex_points, tile_fill, is_selected, on_key, on_mouse_move, on_click, board_ref,axial_to_pixel,
            // ▼▼▼ 追加 ▼▼▼
            players, render_players 
     };
  }
}).mount('#app');
