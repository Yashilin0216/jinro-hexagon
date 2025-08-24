// ==============================
// 設定
// ==============================
const cfg = {
  hex_size: 30,     // 六角形の一辺の長さ（ピクセル）
  map_radius: 5,    // 中心からの半径（例: 4 なら 61 マス）
  margin: 10,       // 描画マージン
};

// ==============================
// 座標変換 (axial → pixel)
// ==============================
// 入力: axial座標 (q, r), サイズ size
// 出力: 画面上の座標 {x, y}
function axial_to_pixel(q, r, size) {
  const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
  const y = size * (3 / 2 * r);
  return { x, y };
}

// ==============================
// 六角形の頂点を計算
// ==============================
// 入力: 中心座標 (x, y), サイズ size
// 出力: "x1,y1 x2,y2 ... x6,y6" 形式の文字列
function hex_points(x, y, size) {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 180 * (60 * i - 30); // -30°ずらして縦向き
    const px = x + size * Math.cos(angle);
    const py = y + size * Math.sin(angle);
    points.push(`${px},${py}`);
  }
  return points.join(" ");
}

// ==============================
// 盤面の六角形座標を生成
// ==============================
// 入力: 半径 R
// 出力: タイル配列 [{q, r, x, y}, ...]
function generate_grid(R) {
  const tiles = [];
  for (let q = -R; q <= R; q++) {
    for (let r = -R; r <= R; r++) {
      const s = -q - r;
      if (Math.abs(s) <= R) {
        const px = axial_to_pixel(q, r, cfg.hex_size);
        tiles.push({
          q,
          r,
          s,
          x: px.x,
          y: px.y,
        });
      }
    }
  }
  return tiles;
}

// ==============================
// 描画処理
// ==============================
function draw_board() {
  const svg = document.getElementById("board");
  svg.innerHTML = ""; // 初期化

  const tiles = generate_grid(cfg.map_radius);

  // 盤面のサイズを動的に計算
  const minX = Math.min(...tiles.map(t => t.x));
  const maxX = Math.max(...tiles.map(t => t.x));
  const minY = Math.min(...tiles.map(t => t.y));
  const maxY = Math.max(...tiles.map(t => t.y));

  svg.setAttribute("width", maxX - minX + cfg.hex_size * 2 + cfg.margin * 2);
  svg.setAttribute("height", maxY - minY + cfg.hex_size * 2 + cfg.margin * 2);

  // グループを作って平行移動（中心に余白を作る）
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("transform", `translate(${cfg.margin - minX + cfg.hex_size}, ${cfg.margin - minY + cfg.hex_size})`);
  svg.appendChild(g);

  // 六角形を追加
  tiles.forEach(tile => {
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    poly.setAttribute("points", hex_points(tile.x, tile.y, cfg.hex_size));
    poly.setAttribute("stroke", "black");
    poly.setAttribute("fill", "white");

    // デバッグ用に座標を属性に入れる
    poly.dataset.q = tile.q;
    poly.dataset.r = tile.r;

    // クリックイベント
    poly.addEventListener("click", () => {
      alert(`Clicked hex at (q=${tile.q}, r=${tile.r}, s=${tile.s})`);
    });

    g.appendChild(poly);
  });
}

// ==============================
// 実行
// ==============================
draw_board();
