import { Composer } from "grammy";
import { MyContext } from "../../../../schemas/User";
import { subjectScheduleHandler } from './subjectSchedule';

export const subjectScheduleMasterHandler = new Composer<MyContext>();

subjectScheduleMasterHandler
  .use(subjectScheduleHandler);