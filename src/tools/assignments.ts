import type { AxiosInstance } from 'axios';
import axios from 'axios';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getCourseId } from '../moodle-client.js';

export async function getAssignments(client: AxiosInstance, args: any, defaultCourseId?: string) {
  const courseId = getCourseId(args, defaultCourseId);
  console.error(`[API] Requesting assignments for course ${courseId}`);

  const response = await client.get('', {
    params: {
      wsfunction: 'mod_assign_get_assignments',
      courseids: [courseId],
    },
  });

  const courseData = response.data.courses?.find((c: any) => String(c.id) === courseId);
  const assignments = courseData?.assignments || [];

  const formattedAssignments = assignments.map((a: any) => ({
    ...a,
    duedate: a.duedate ? new Date(a.duedate * 1000).toISOString() : null,
    allowsubmissionsfromdate: a.allowsubmissionsfromdate ? new Date(a.allowsubmissionsfromdate * 1000).toISOString() : null,
    cutoffdate: a.cutoffdate ? new Date(a.cutoffdate * 1000).toISOString() : null,
  }));

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ courseId, assignments: formattedAssignments }, null, 2),
      },
    ],
  };
}

export async function getSubmissions(client: AxiosInstance, args: any, defaultCourseId?: string) {
  const courseId = getCourseId(args, defaultCourseId);
  const studentId = args?.studentId;
  const assignmentId = args?.assignmentId;

  console.error(`[API] Requesting submissions for course ${courseId}${studentId ? ` for student ${studentId}` : ''}`);

  const assignmentsResponse = await client.get('', {
    params: {
      wsfunction: 'mod_assign_get_assignments',
      courseids: [courseId],
    },
  });

  const courseData = assignmentsResponse.data.courses?.find((c: any) => String(c.id) === courseId);
  const assignments = courseData?.assignments || [];

  const targetAssignments = assignmentId
    ? assignments.filter((a: any) => a.id === assignmentId)
    : assignments;

  if (targetAssignments.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: 'No assignments found for the specified criteria.',
        },
      ],
    };
  }

  const submissionsPromises = targetAssignments.map(async (assignment: any) => {
    const submissionsResponse = await client.get('', {
      params: {
        wsfunction: 'mod_assign_get_submissions',
        assignmentids: [assignment.id],
      },
    });

    const submissions = submissionsResponse.data.assignments[0]?.submissions || [];

    const gradesResponse = await client.get('', {
      params: {
        wsfunction: 'mod_assign_get_grades',
        assignmentids: [assignment.id],
      },
    });

    const grades = gradesResponse.data.assignments[0]?.grades || [];

    const targetSubmissions = studentId
      ? submissions.filter((s: any) => s.userid === studentId)
      : submissions;

    const processedSubmissions = targetSubmissions.map((submission: any) => {
      const studentGrade = grades.find((g: any) => g.userid === submission.userid);

      return {
        userid: submission.userid,
        status: submission.status,
        timemodified: new Date(submission.timemodified * 1000).toISOString(),
        grade: studentGrade ? studentGrade.grade : 'Not graded',
      };
    });

    return {
      assignment: assignment.name,
      assignmentId: assignment.id,
      submissions: processedSubmissions.length > 0 ? processedSubmissions : 'No submissions',
    };
  });

  const results = await Promise.all(submissionsPromises);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ courseId, results }, null, 2),
      },
    ],
  };
}

export async function provideFeedback(client: AxiosInstance, args: any) {
  if (!args.studentId || !args.assignmentId || !args.feedback) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Student ID, Assignment ID, and feedback are required'
    );
  }

  console.error(`[API] Providing feedback for student ${args.studentId} on assignment ${args.assignmentId}`);

  const response = await client.get('', {
    params: {
      wsfunction: 'mod_assign_save_grade',
      assignmentid: args.assignmentId,
      userid: args.studentId,
      grade: args.grade || 0,
      attemptnumber: -1,
      addattempt: 0,
      workflowstate: 'released',
      applytoall: 0,
      plugindata: {
        assignfeedbackcomments_editor: {
          text: args.feedback,
          format: 1,
        },
      },
    },
  });

  return {
    content: [
      {
        type: 'text',
        text: `Feedback successfully provided for student ${args.studentId} on assignment ${args.assignmentId}.`,
      },
    ],
  };
}

export async function getSubmissionContent(client: AxiosInstance, args: any) {
  if (!args.studentId || !args.assignmentId) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Student ID and Assignment ID are required'
    );
  }

  console.error(`[API] Requesting submission content for student ${args.studentId} on assignment ${args.assignmentId}`);

  try {
    const response = await client.get('', {
      params: {
        wsfunction: 'mod_assign_get_submission_status',
        assignid: args.assignmentId,
        userid: args.studentId,
      },
    });

    const submissionData = response.data.submission || {};
    const plugins = response.data.lastattempt?.submission?.plugins || [];

    let submissionText = '';
    const files: any[] = [];

    for (const plugin of plugins) {
      if (plugin.type === 'onlinetext') {
        const textField = plugin.editorfields?.find((field: any) => field.name === 'onlinetext');
        if (textField) {
          submissionText = textField.text || '';
        }
      }

      if (plugin.type === 'file') {
        const filesList = plugin.fileareas?.find((area: any) => area.area === 'submission_files');
        if (filesList && filesList.files) {
          for (const file of filesList.files) {
            files.push({
              filename: file.filename,
              fileurl: file.fileurl,
              filesize: file.filesize,
              filetype: file.mimetype,
            });
          }
        }
      }
    }

    const submissionContent = {
      assignment: args.assignmentId,
      userid: args.studentId,
      status: submissionData.status || 'unknown',
      submissiontext: submissionText,
      plugins: [
        {
          type: 'onlinetext',
          content: submissionText,
        },
        {
          type: 'file',
          files: files,
        },
      ],
      timemodified: submissionData.timemodified || 0,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(submissionContent, null, 2),
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
            text: `Error getting submission content: ${
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
