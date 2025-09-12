export class Player {
  // コンストラクタでプレイヤーの初期データを設定
  constructor(name, move_condition, initialPosition) {
    // --- 現在のplayer連想配列と同じプロパティを持たせる ---
    this.name = name;
    this.move_condition = move_condition;

    this.q = initialPosition.q; // 初期座標
    this.r = initialPosition.r; // 初期座標

    this.is_alive = true;      // 生存状態
    this.is_protected = false;   // 防御状態
    
    // idはサーバーから割り当てられるので、後から設定できるようにしておく
    this.id = null;
  }

  
    // 座標を更新するメソッド
    setPosition(q, r) {
        this.q = q;
        this.r = r;
    }
    // 自分のターンか判定するメソッド
    isMyTurn(currentTurnName) {
        return this.name === currentTurnName;
    }
}