import { Context } from "grammy";
import { User } from "../schemas/User.js";

export interface EnhancedContext extends Context {
  user?: User;
  newUser?: boolean;
}
