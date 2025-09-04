import { Composer } from "grammy";
import { EnhancedContext } from "../../../utils/index.js";
import { selectEntityHandler } from './selectEntity.js';
import { settingsMenuHandler } from './settingsMenu.js';

export const settingsHandler = new Composer<EnhancedContext>();

settingsHandler
  .use(selectEntityHandler)
  .use(settingsMenuHandler);