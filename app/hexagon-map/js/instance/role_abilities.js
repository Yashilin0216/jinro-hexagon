import { NonRole, KillerRole, ProtectorRole} from "../role_restrictions.js";
// 役職のインスタンス化
export const roleAbilities = {
    // 役職無し村人
    'non_role': new NonRole(2, "non_role"),
    // 人狼
    'killer_role': new KillerRole(2,"killer_role"),
    // 狩人
    'protect_role': new ProtectorRole(2,"protect_role"),
};