// 行動制限の基底クラス
export class ActionRestriction {
  // 「半径Rマス以内」を判定する処理 a,bはそれぞれが座標 リターンは距離 hexagon-map.jsにも同じ関数あり
  distance(a, b) {
    return (
      (Math.abs(a.q - b.q) +
        Math.abs(a.q + a.r - b.q - b.r) +
        Math.abs(a.r - b.r)) / 2
    );
  }
  // 行動できるか判定するメソッド（デフォルトでは常に true）
  canMove(player, target, conditions) {
    return true;
  }
}

// 移動範囲を半径redius以内に制限
export class RadiusRestriction extends ActionRestriction {
  constructor(radius) {
    super();
    this.radius = radius;
  }

  canMove(player, target, conditions) {
    const d = this.distance(player, target);
    return d <= this.radius && (conditions == "hoge" || conditions == "foo");
  }
}