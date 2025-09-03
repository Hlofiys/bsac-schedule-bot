import { Composer } from "grammy";
import { EnhancedContext } from "../../../utils";
import { selectEntityHandler } from './selectEntity';
import { settingsMenuHandler } from './settingsMenu';

export const settingsHandler = new Composer<EnhancedContext>();

settingsHandler
  .use(selectEntityHandler)
  .use(settingsMenuHandler);