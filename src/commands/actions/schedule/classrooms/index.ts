import { Composer } from "grammy";
import { EnhancedContext } from "../../../../utils";
import { classroomScheduleHandler } from './classroomSchedule';

export const classroomScheduleMasterHandler = new Composer<EnhancedContext>();

classroomScheduleMasterHandler
  .use(classroomScheduleHandler);