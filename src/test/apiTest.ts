import dotenv from "dotenv";
import { getGroups, getGroupSchedule } from "../lib/api/client.js";
import type { components } from "../lib/api/scheme.js";

// Load environment variables
dotenv.config();

type Group = components["schemas"]["Group"];
type GetScheduleForOneGroup = components["schemas"]["GetScheduleForOneGroup"];

async function testAPI() {
  try {
    console.log("Testing API connection...");
    
    // Test getting groups
    console.log("\n--- Testing Groups ---");
    const groups = await getGroups();
    console.log("Groups count:", groups.length);
    
    // Try a few different groups to see if any have schedules
    for (let i = 0; i < Math.min(5, groups.length); i++) {
      const group: Group = groups[i];
      if (group.id === undefined) {
        console.log(`\n--- Skipping group ${group.groupNumber} (ID: undefined) ---`);
        continue;
      }
      console.log(`\n--- Testing Group ${group.groupNumber} (ID: ${group.id}) ---`);
      console.log(`Semester: ${group.semesterStart} to ${group.semesterEnd}`);
      
      // Try getting schedule for the semester start date
      if (group.semesterStart === undefined) {
        console.log("Skipping schedule test - semester start date is undefined");
        continue;
      }
      
      try {
        const schedule: GetScheduleForOneGroup[] = await getGroupSchedule(group.id, [group.semesterStart]);
        console.log("Schedule response:", JSON.stringify(schedule, null, 2));
        
        // Check if any day has schedules
        let hasSchedules = false;
        for (const day of schedule) {
          if (day.schedules && day.schedules.length > 0) {
            hasSchedules = true;
            break;
          }
        }
        
        if (hasSchedules) {
          console.log("✅ Found schedules for this group!");
          break;
        } else {
          console.log("❌ No schedules found for this group");
        }
      } catch (error: any) {
        console.error("Error getting schedule:", error.message);
      }
    }
  } catch (error: any) {
    console.error("API Test Error:", error.message);
  }
}

testAPI();