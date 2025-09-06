import { Composer } from "grammy";
import { EnhancedContext } from "../../utils/index.js";
import { settingsHandler } from "./settings/index.js";
import { weeksHandler } from "./schedule/weeks/index.js";
import { classroomScheduleMasterHandler } from "./schedule/classrooms/index.js";
import { subjectScheduleMasterHandler } from "./schedule/subjects/index.js";
import { groupSetupHandler } from "./group/index.js";

export const actionsHandler = new Composer<EnhancedContext>();

actionsHandler
  .use(settingsHandler)
  .use(weeksHandler)
  .use(classroomScheduleMasterHandler)
  .use(subjectScheduleMasterHandler)
  .use(groupSetupHandler);
