import { Composer } from "grammy";
import { EnhancedContext } from "../../../../utils";
import { subjectScheduleHandler } from './subjectSchedule';

export const subjectScheduleMasterHandler = new Composer<EnhancedContext>();

subjectScheduleMasterHandler
  .use(subjectScheduleHandler);