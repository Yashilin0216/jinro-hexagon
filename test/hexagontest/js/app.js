const { createApp, ref, reactive, computed, onMounted } = Vue;

createApp({
setup() {
    // ---- config ----
    const cfg = reactive({
    hex_size: 28,        // 六角形の半径（ピクセル）
    map_cols: 14,        // 横（q方向）
    map_rows: 12,        // 縦（r方向）
    margin: 24           // 余白
    });

    // カメラ（スクロール）位置
    const camera = reactive({ x: 0, y: 0 });

    // 選択中の軸座標（axial: q, r）
    const selected = reactive({ q: 0, r: 0 });

    // ホバー中のセル
    const hover = ref(null); // { q, r }

    // 盤面（axial -> pixel）
    const grid = computed(() => {
    const rows = [];
    for (let r = 0; r < cfg.map_rows; r++) {
        const row = [];
        for (let q = 0; q < cfg.map_cols; q++) {
        const px = axial_to_pixel(q, r, cfg.hex_size);
        row.push({ q, r, x: px.x + cfg.margin, y: px.y + cfg.margin });
        }
        rows.push(row);
    }
    return rows;
    });

    const view_box = computed(() => {
    // SVG viewBox を盤面サイズに合わせる
    const last = axial_to_pixel(cfg.map_cols - 1, cfg.map_rows - 1, cfg.hex_size);
    const w = last.x + cfg.hex_size * 2 + cfg.margin * 2;
    const h = last.y + cfg.hex_size * 2 + cfg.margin * 2;
    return `0 0 ${w} ${h}`;
    });

    // 現在位置のピクセル座標
    const pos_px = computed(() => {
    const p = axial_to_pixel(selected.q, selected.r, cfg.hex_size);
    return { x: p.x + cfg.margin + camera.x, y: p.y + cfg.margin + camera.y };
    });

    // ---- hex math (pointy-top axial) ----
    function axial_to_pixel(q, r, size) {
    // pointy-top: x = size * (sqrt(3) * q + sqrt(3)/2 * r)
    //             y = size * (3/2 * r)
    const s3 = Math.sqrt(3);
    const x = size * (s3 * q + (s3 / 2) * r);
    const y = size * (1.5 * r);
    return { x, y };
    }

    function hex_corners(cx, cy, size) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 180 * (60 * i - 30); // pointy-top
        pts.push([cx + size * Math.cos(angle), cy + size * Math.sin(angle)]);
    }
    return pts;
    }

    function hex_points(cx, cy) {
    return hex_corners(cx, cy, cfg.hex_size).map(p => p.join(',')).join(' ');
    }

    // 近傍（q,r）方向ベクトル（pointy-top axial）
    const dirs = [
    { q: +1, r: 0 },  // E (E)
    { q: +1, r: -1 }, // NE (W)
    { q: 0,  r: -1 }, // NW (Q)
    { q: -1, r: 0 },  // W (A)
    { q: -1, r: +1 }, // SW (S)
    { q: 0,  r: +1 }, // SE (D)
    ];

    function move_dir(i) {
    const nq = clamp(selected.q + dirs[i].q, 0, cfg.map_cols - 1);
    const nr = clamp(selected.r + dirs[i].r, 0, cfg.map_rows - 1);
    selected.q = nq; selected.r = nr;
    }

    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    function is_selected(cell) {
    return cell.q === selected.q && cell.r === selected.r;
    }

    function is_hover(cell) {
    return hover.value && hover.value.q === cell.q && hover.value.r === cell.r;
    }

    function tile_fill(cell) {
    if (is_selected(cell)) return 'url(#g-active)';
    if (is_hover(cell)) return 'url(#g-hover)';
    return 'url(#g-tile)';
    }

    // ---- input handlers ----
    const board_ref = ref(null);

    function on_key(e) {
    // 矢印キー：カメラ移動
    if (e.key.startsWith('Arrow')) {
        const step = 24;
        if (e.key === 'ArrowLeft') camera.x += step;
        if (e.key === 'ArrowRight') camera.x -= step;
        if (e.key === 'ArrowUp') camera.y += step;
        if (e.key === 'ArrowDown') camera.y -= step;
        e.preventDefault();
        return;
    }
    // 六方向移動（QWE / ASD）
    const k = e.key.toLowerCase();
    if (k === 'e') move_dir(1);
    else if (k === 'w') move_dir(2);
    else if (k === 'q') move_dir(2); // QとWどちらも北西寄りに割り当て（好みで調整可）
    else if (k === 'a') move_dir(3);
    else if (k === 's') move_dir(4);
    else if (k === 'd') move_dir(5);
    }

    function on_mouse_move(evt) {
    const pt = svg_point(evt);
    const ar = pixel_to_axial_rough(pt.x - camera.x - cfg.margin, pt.y - camera.y - cfg.margin, cfg.hex_size);
    hover.value = in_bounds(ar.q, ar.r) ? ar : null;
    }

    function on_click(evt) {
    const pt = svg_point(evt);
    const ar = pixel_to_axial_round(pt.x - camera.x - cfg.margin, pt.y - camera.y - cfg.margin, cfg.hex_size);
    if (in_bounds(ar.q, ar.r)) { selected.q = ar.q; selected.r = ar.r; }
    }

    function in_bounds(q, r) {
    return q >= 0 && q < cfg.map_cols && r >= 0 && r < cfg.map_rows;
    }

    // SVG座標を取得
    function svg_point(evt) {
    const svg = evt.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    const inv = svg.getScreenCTM().inverse();
    const sp = pt.matrixTransform(inv);
    return { x: sp.x, y: sp.y };
    }

    // 軽量な近似（hover用）
    function pixel_to_axial_rough(x, y, size) {
    const s3 = Math.sqrt(3);
    const qf = (s3/3 * x - 1/3 * y) / size;
    const rf = (2/3 * y) / size;
    const { q, r } = axial_round(qf, rf);
    return { q, r };
    }

    // 厳密な丸め（click用）
    function pixel_to_axial_round(x, y, size) {
    const s3 = Math.sqrt(3);
    const qf = (s3/3 * x - 1/3 * y) / size;
    const rf = (2/3 * y) / size;
    return axial_round(qf, rf);
    }

    function axial_round(qf, rf) {
    // axial -> cube -> round -> axial
    const xf = qf;
    const zf = rf;
    const yf = -xf - zf;

    let rx = Math.round(xf);
    let ry = Math.round(yf);
    let rz = Math.round(zf);

    const x_diff = Math.abs(rx - xf);
    const y_diff = Math.abs(ry - yf);
    const z_diff = Math.abs(rz - zf);

    if (x_diff > y_diff && x_diff > z_diff) {
        rx = -ry - rz;
    } else if (y_diff > z_diff) {
        ry = -rx - rz;
    } else {
        rz = -rx - ry;
    }
    return { q: rx, r: rz };
    }

    // 初期フォーカス
    onMounted(() => {
    board_ref.value && board_ref.value.focus();
    });

    // ---- socket.io（任意：将来の同期用の雛形） ----
    // const socket = io("/", { transports: ["websocket"] });
    // socket.on("connect", () => {
    //   console.log("socket connected", socket.id);
    // });
    // function broadcast_move() {
    //   socket.emit("move", { q: selected.q, r: selected.r });
    // }
    // // 受信例
    // socket.on("move", data => {
    //   if (in_bounds(data.q, data.r)) { selected.q = data.q; selected.r = data.r; }
    // });

    return { cfg, grid, selected, hover, camera, view_box, pos_px, hex_points, tile_fill, is_selected, on_key, on_mouse_move, on_click, board_ref };
}
}).mount('#app');