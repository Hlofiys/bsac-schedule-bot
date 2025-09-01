import { Composer } from "grammy";
import { MyContext } from "../../../schemas/User";
import { selectEntityHandler } from './selectEntity';
import { settingsMenuHandler } from './settingsMenu';

export const settingsHandler = new Composer<MyContext>();

settingsHandler
  .use(selectEntityHandler)
  .use(settingsMenuHandler);