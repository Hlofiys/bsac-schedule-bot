import { Context } from "grammy";
import { User } from "../schemas/User.js";
import { GroupChat } from "../schemas/Group.js";
import { CommandUtils } from "./commandHelpers.js";

export interface EnhancedContext extends Context {
  user?: User;
  newUser?: boolean;
  groupChat?: GroupChat;
  commandUtils?: CommandUtils;
}
