import { BaseApi } from "../utils/BaseApi.js";
import { components } from "../lib/api/scheme.js";

// Corrected type exports based on scheme.d.ts
export type Group = components["schemas"]["Group"];
export type Teacher = components["schemas"]["Teacher"];
export type Lesson = components["schemas"]["Lesson"];
export type LessonSchedule = components["schemas"]["LessonScheduleWithWork"];
export type GetScheduleForOneGroup =
  components["schemas"]["GetScheduleForOneGroup"];

export interface GetGroupsOptions {
  search?: string;
  limit?: number;
  [key: string]: unknown;
}

export interface GetTeachersOptions {
  search?: string;
  limit?: number;
  [key: string]: unknown;
}

export interface GetScheduleForDatesOptions {
  groupId?: string;
  teacherId?: string;
  dates: string[];
}

export class ScheduleApi extends BaseApi {
  constructor(baseUrl: string) {
    super(baseUrl);
  }

  async getGroups(options?: GetGroupsOptions): Promise<Group[]> {
    const queryString = this.buildQueryString(options || {});
    const endpoint = `/api/groups${queryString ? `?${queryString}` : ""}`;
    return this.request<Group[]>(endpoint);
  }

  async getTeachers(options?: GetTeachersOptions): Promise<Teacher[]> {
    const queryString = this.buildQueryString(options || {});
    const endpoint = `/api/teachers${queryString ? `?${queryString}` : ""}`;
    return this.request<Teacher[]>(endpoint);
  }

  async getScheduleForDates(
    options: GetScheduleForDatesOptions
  ): Promise<GetScheduleForOneGroup[]> {
    const { groupId, teacherId, dates } = options;
    const datesQuery = dates
      .map((d) => `dates=${encodeURIComponent(d)}`)
      .join("&");

    let endpoint = "";
    if (groupId) {
      endpoint = `/api/schedules/groups/${groupId}/date?${datesQuery}`;
    } else if (teacherId) {
      endpoint = `/api/schedules/teachers/${teacherId}/date?${datesQuery}`;
    } else {
      return [];
    }

    return this.request<GetScheduleForOneGroup[]>(endpoint);
  }
}
