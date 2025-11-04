export class Player {
  // コンストラクタでプレイヤーの初期データを設定
  constructor(playerData) {
    // player連想配列と同じプロパティを持たせる
    this.name = playerData.name;

    this.q = playerData.q; // 初期座標
    this.r = playerData.r; // 初期座標

    this.is_alive = true;      // 生存状態
    this.is_protected = false;   // 防御状態
    
    // idはサーバーから割り当てられる
    this.id = playerData.id;

    // 移動能力インスタンスを保持
    this.movement = playerData.movementAbility;
    this.move_condition = playerData.move_condition;

    // 役職インスタンスを保持するプロパティ
    this.role = playerData.role;
    this.role_condition = playerData.role_condition;
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
    // 移動判定メソッド
    canMoveTo(targetPosition) {
        //死亡時は動けない
        if(!this.is_alive){
            console.log("死亡しているので動けません");
            return false;
        }
        // 自分が保持している移動能力(RadiusRestrictionなど)のcanMoveメソッドを呼び出す
        // this.movement.canMove の引数が (player, target, conditions) の場合
        // 第1引数には自分自身(this)を渡す
        return this.movement.canMove(this, targetPosition, this.move_condition);
    }
    // 自身の死亡判定
    die() {
        this.is_alive = false;
        console.log(`${this.name}は倒れた。`);
        // 今後、死亡時に見た目を灰色にするなどの処理もここに追加できる
    }

    // 役職の能力が使えるか判定し、実行するメソッド
    performRoleAction(targetPlayer, gamePhase) {
        // 自分の役職が能力を持っていない場合は何もしない
        if (!this.role || this.role_condition == 'non_role') {
            console.log(`村人には特殊な能力はありません。`);
            return false;
        }

        // 自分の役職が、対象に対して能力を行使できるか判定する
        if (this.role.canDo(this, targetPlayer, this.role_condition, gamePhase)) {
            // できる場合は、能力を実行する
            console.log(`${this.name}が${targetPlayer.name}に能力を使用します。`);
            this.role.Do(targetPlayer);
            return true; // アクション成功
        } else {
            // できない場合は、理由をコンソールに出力して失敗を返す
            console.log("能力の使用範囲外か、条件を満たしていません。");
            if(targetPlayer.is_protected){console.log(`${targetPlayer.name}は守られています`);}
            return false; // アクション失敗
        }
    }

}