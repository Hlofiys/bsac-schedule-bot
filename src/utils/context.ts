import { Context } from "grammy";
import { User } from "../schemas/User";

export interface EnhancedContext extends Context {
  user?: User;
  newUser?: boolean;
}