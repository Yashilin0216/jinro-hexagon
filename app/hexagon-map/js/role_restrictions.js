// 基底クラス（制限条件付きの行動判定）
export class RoleRestriction {
  constructor(conditions) {
    this.conditions = conditions;
  }

  distance(a, b) {
    return (
      (Math.abs(a.q - b.q) +
        Math.abs(a.q + a.r - b.q - b.r) +
        Math.abs(a.r - b.r)) / 2
    );
  }
}


// 攻撃役職（指定範囲のプレイヤーをkillできる）
export class KillerRole extends RoleRestriction {
  constructor(radius, conditions) {
    super(conditions);
    this.radius = radius;
  }

  // プレイヤーが指定範囲内にいればkill可能
  canKill(player, target, conditions) {
    const d = this.distance(player, target);
    return d <= this.radius && this.conditions === conditions;
  }

  // kill実行処理
  kill(target) {
    target.is_alive = false; // プレイヤーオブジェクトにis_aliveフラグを持たせる
  }
}


// 防御役職（指定範囲内の味方を守れる）
export class ProtectorRole extends RoleRestriction {
  constructor(radius, conditions) {
    super(conditions);
    this.radius = radius;
  }

  // 指定範囲内のプレイヤーを守れるかどうか
  canProtect(player, target, conditions) {
    const d = this.distance(player, target);
    return d <= this.radius && this.conditions === conditions;
  }

  // 実際に守る処理
  protect(target) {
    target.is_protected = true; // プレイヤーオブジェクトにis_protectedフラグを持たせる
  }

  not_protect(target){
    target.is_protected = false; // プレイヤーオブジェクトのis_protectedフラグ解除
  }
}