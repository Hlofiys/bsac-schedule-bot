import { Composer } from "grammy";
import { EnhancedContext } from "../../../../utils/index.js";
import { classroomScheduleHandler } from './classroomSchedule.js';

export const classroomScheduleMasterHandler = new Composer<EnhancedContext>();

classroomScheduleMasterHandler
  .use(classroomScheduleHandler);