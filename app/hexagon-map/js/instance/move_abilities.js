// 行動制限用クラス
import { RadiusRestriction } from "../move_restrictions.js";
// urlのパラメータのmove_conditionとインスタンス化した時のmove_conditionが一致すればture
// hexagon-map.jsで実際のurlクエリと照合するためのインスタンスリスト
export const movementAbilities = {
    // 3マス動ける
    'three_restriction': new RadiusRestriction(3, "three_restriction"),
    // 1マス動ける
    'one_restriction': new RadiusRestriction(1, "one_restriction"),
};
