import { Composer } from "grammy";
import { EnhancedContext } from "../../utils";
import { settingsHandler } from './settings';
import { weeksHandler } from './schedule/weeks';
import { classroomScheduleMasterHandler } from './schedule/classrooms';
import { subjectScheduleMasterHandler } from './schedule/subjects';

export const actionsHandler = new Composer<EnhancedContext>();

actionsHandler
  .use(settingsHandler)
  .use(weeksHandler)
  .use(classroomScheduleMasterHandler)
  .use(subjectScheduleMasterHandler);