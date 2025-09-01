import { Composer } from "grammy";
import { MyContext } from "../../../../schemas/User";
import { classroomScheduleHandler } from './classroomSchedule';

export const classroomScheduleMasterHandler = new Composer<MyContext>();

classroomScheduleMasterHandler
  .use(classroomScheduleHandler);