import type { AxiosInstance } from 'axios';
import { getCourseId, validateArrayResponse } from '../moodle-client.js';

export async function getStudents(client: AxiosInstance, args: any, defaultCourseId?: string) {
  const courseId = getCourseId(args, defaultCourseId);
  console.error(`[API] Requesting enrolled users for course ${courseId}`);

  const response = await client.get('', {
    params: {
      wsfunction: 'core_enrol_get_enrolled_users',
      courseid: courseId,
    },
  });

  validateArrayResponse(response.data, `get_students (courseId: ${courseId})`);

  const students = response.data
    .filter((user: any) => user.roles?.some((role: any) => role.shortname === 'student'))
    .map((student: any) => ({
      id: student.id,
      username: student.username,
      firstname: student.firstname,
      lastname: student.lastname,
      email: student.email,
      lastaccess: student.lastaccess ? new Date(student.lastaccess * 1000).toISOString() : null,
    }));

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ courseId, students }, null, 2),
      },
    ],
  };
}
