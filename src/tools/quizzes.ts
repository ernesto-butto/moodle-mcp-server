import type { AxiosInstance } from 'axios';
import axios from 'axios';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getCourseId } from '../moodle-client.js';

export async function getQuizzes(client: AxiosInstance, args: any, defaultCourseId?: string) {
  const courseId = getCourseId(args, defaultCourseId);
  console.error(`[API] Requesting quizzes for course ${courseId}`);

  const response = await client.get('', {
    params: {
      wsfunction: 'mod_quiz_get_quizzes_by_courses',
      courseids: [courseId],
    },
  });

  const quizzes = response.data.quizzes || [];

  const formattedQuizzes = quizzes.map((q: any) => ({
    ...q,
    timeopen: q.timeopen ? new Date(q.timeopen * 1000).toISOString() : null,
    timeclose: q.timeclose ? new Date(q.timeclose * 1000).toISOString() : null,
  }));

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ courseId, quizzes: formattedQuizzes }, null, 2),
      },
    ],
  };
}

export async function getQuizGrade(client: AxiosInstance, args: any) {
  if (!args.studentId || !args.quizId) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Student ID and Quiz ID are required'
    );
  }

  console.error(`[API] Requesting quiz grade for student ${args.studentId} on quiz ${args.quizId}`);

  try {
    const response = await client.get('', {
      params: {
        wsfunction: 'mod_quiz_get_user_best_grade',
        quizid: args.quizId,
        userid: args.studentId,
      },
    });

    const result = {
      quizId: args.quizId,
      studentId: args.studentId,
      hasGrade: response.data.hasgrade,
      grade: response.data.hasgrade ? response.data.grade : 'Not graded',
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error('[Error]', error);
    if (axios.isAxiosError(error)) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting quiz grade: ${
              error.response?.data?.message || error.message
            }`,
          },
        ],
        isError: true,
      };
    }
    throw error;
  }
}
