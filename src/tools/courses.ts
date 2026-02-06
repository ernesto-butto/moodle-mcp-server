import type { AxiosInstance } from 'axios';
import { getCourseId, validateArrayResponse, DEFAULT_COURSE_ID } from '../moodle-client.js';

export async function listCourses(client: AxiosInstance, defaultCourseId: string | undefined = DEFAULT_COURSE_ID) {
  console.error('[API] Requesting all accessible courses');

  const response = await client.get('', {
    params: {
      wsfunction: 'core_course_get_courses',
    },
  });

  validateArrayResponse(response.data, 'list_courses');

  const courses = response.data
    .filter((course: any) => course.id !== 1)
    .map((course: any) => ({
      id: course.id,
      shortname: course.shortname,
      fullname: course.fullname,
      visible: course.visible === 1,
      summary: course.summary ? course.summary.replace(/<[^>]*>/g, '').trim().substring(0, 200) : '',
      categoryid: course.categoryid,
    }));

  const defaultNote = defaultCourseId
    ? `\n\nDefault course ID: ${defaultCourseId}`
    : '\n\nNo default course ID configured. Pass courseId to other tools.';

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(courses, null, 2) + defaultNote,
      },
    ],
  };
}

export async function getCourseContents(client: AxiosInstance, args: any, defaultCourseId?: string) {
  const courseId = getCourseId(args, defaultCourseId);
  console.error(`[API] Requesting course contents for course ${courseId}`);

  const response = await client.get('', {
    params: {
      wsfunction: 'core_course_get_contents',
      courseid: courseId,
    },
  });

  validateArrayResponse(response.data, `get_course_contents (courseId: ${courseId})`);

  const sections = response.data.map((section: any) => ({
    id: section.id,
    name: section.name || `Section ${section.section}`,
    summary: section.summary ? section.summary.replace(/<[^>]*>/g, '').trim() : '',
    visible: section.visible === 1,
    modules: section.modules?.map((mod: any) => ({
      id: mod.id,
      name: mod.name,
      modname: mod.modname,
      visible: mod.visible === 1,
      url: mod.url,
    })) || [],
  }));

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(sections, null, 2),
      },
    ],
  };
}
