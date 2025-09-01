import createClient from "openapi-fetch";
import type { paths } from "./scheme";

// Create a client instance
const client = createClient<paths>({ baseUrl: process.env.API_BASE_URL || "https://bsac.hlofiys.xyz" });

export async function getGroups() {
  const { data, error } = await client.GET("/api/groups");
  if (error) {
    throw new Error(`Failed to fetch groups: ${JSON.stringify(error)}`);
  }
  return data?.data || [];
}

export async function getTeachers() {
  const { data, error } = await client.GET("/api/teachers");
  if (error) {
    throw new Error(`Failed to fetch teachers: ${JSON.stringify(error)}`);
  }
  return data?.data || [];
}

export async function getGroupSchedule(groupId: number, dates?: string[]) {
  const { data, error } = await client.GET("/api/schedules/groups/{groupId}/date", {
    params: {
      path: { groupId },
      query: { dates }
    }
  });
  if (error) {
    throw new Error(`Failed to fetch group schedule: ${JSON.stringify(error)}`);
  }
  return data?.data || [];
}

export async function getTeacherSchedule(teacherId: number, dates?: string[]) {
  const { data, error } = await client.GET("/api/schedules/teachers/{teacherId}/date", {
    params: {
      path: { teacherId },
      query: { dates }
    }
  });
  if (error) {
    throw new Error(`Failed to fetch teacher schedule: ${JSON.stringify(error)}`);
  }
  return data?.data || [];
}