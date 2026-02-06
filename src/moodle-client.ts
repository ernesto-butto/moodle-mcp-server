import axios from 'axios';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

// Environment variable configuration
const MOODLE_API_URL = process.env.MOODLE_API_URL;
const MOODLE_API_TOKEN = process.env.MOODLE_API_TOKEN;

export const DEFAULT_COURSE_ID = process.env.MOODLE_COURSE_ID;

// Verify required environment variables
if (!MOODLE_API_URL) {
  throw new Error('MOODLE_API_URL environment variable is required');
}

if (!MOODLE_API_TOKEN) {
  throw new Error('MOODLE_API_TOKEN environment variable is required');
}

export function createMoodleClient() {
  return axios.create({
    baseURL: MOODLE_API_URL,
    params: {
      wstoken: MOODLE_API_TOKEN,
      moodlewsrestformat: 'json',
    },
  });
}

export function getCourseId(args: any, defaultCourseId: string | undefined = DEFAULT_COURSE_ID): string {
  if (args?.courseId) {
    return String(args.courseId);
  }
  if (defaultCourseId) {
    return defaultCourseId;
  }
  throw new McpError(
    ErrorCode.InvalidParams,
    'courseId is required. Either pass it as a parameter or set MOODLE_COURSE_ID environment variable.'
  );
}

export function validateArrayResponse(data: any, context: string): void {
  if (!Array.isArray(data)) {
    if (data && typeof data === 'object' && (data.exception || data.errorcode || data.message)) {
      throw new McpError(
        ErrorCode.InternalError,
        `Moodle API error in ${context}: ${data.message || data.errorcode || 'Unknown error'}`
      );
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Unexpected response from Moodle API in ${context}: expected array, got ${typeof data}`
    );
  }
}
