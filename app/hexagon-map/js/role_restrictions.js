// 基底クラス（制限条件付きの行動判定）
export class RoleRestriction {
  constructor(radius,conditions) {
    this.conditions = conditions;
    this.radius = radius;
  }

  distance(a, b) {
    return (
      (Math.abs(a.q - b.q) +
        Math.abs(a.q + a.r - b.q - b.r) +
        Math.abs(a.r - b.r)) / 2
    );
  }
  canDo(player, target, conditions){
    return false;
  }
}

// 役職無し 村人
export class NonRole extends RoleRestriction{}


// 攻撃役職（指定範囲のプレイヤーをkillできる）
export class KillerRole extends RoleRestriction {
  constructor(radius, conditions) {
    super(radius,conditions);
  }

  // プレイヤーが指定範囲内にいればkill可能
  canDo(player, target, conditions) {
    const d = this.distance(player, target);
    return d <= this.radius && this.conditions === conditions;
  }

  // kill実行処理
  Do(target) {
    target.is_alive = false; // プレイヤーオブジェクトにis_aliveフラグを持たせる
  }
}


// 防御役職（指定範囲内の味方を守れる）
export class ProtectorRole extends RoleRestriction {
  constructor(radius, conditions) {
    super(radius,conditions);
  }

  // 指定範囲内のプレイヤーを守れるかどうか
  canDo(player, target, conditions) {
    const d = this.distance(player, target);
    return d <= this.radius && this.conditions === conditions;
  }

  // 実際に守る処理
  Do(target) {
    target.is_protected = true; // プレイヤーオブジェクトにis_protectedフラグを持たせる
  }

  unDo(target){
    target.is_protected = false; // プレイヤーオブジェクトのis_protectedフラグ解除
  }
}