#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import { createRequire } from 'module';

// Read version from package.json so it stays in sync automatically
const require = createRequire(import.meta.url);
const { version: PACKAGE_VERSION } = require('../package.json');

// Environment variable configuration
const MOODLE_API_URL = process.env.MOODLE_API_URL;
const MOODLE_API_TOKEN = process.env.MOODLE_API_TOKEN;
const DEFAULT_COURSE_ID = process.env.MOODLE_COURSE_ID; // Now optional, used as default

// Verify required environment variables
if (!MOODLE_API_URL) {
  throw new Error('MOODLE_API_URL environment variable is required');
}

if (!MOODLE_API_TOKEN) {
  throw new Error('MOODLE_API_TOKEN environment variable is required');
}

// Note: MOODLE_COURSE_ID is now optional - can be passed per-request

// Data type interfaces
interface Student {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
}

interface Course {
  id: number;
  shortname: string;
  fullname: string;
  enrolledusercount: number;
  visible: boolean;
}

interface Assignment {
  id: number;
  name: string;
  duedate: number;
  allowsubmissionsfromdate: number;
  grade: number;
  timemodified: number;
  cutoffdate: number;
}

interface Quiz {
  id: number;
  name: string;
  timeopen: number;
  timeclose: number;
  grade: number;
  timemodified: number;
}

interface Submission {
  id: number;
  userid: number;
  status: string;
  timemodified: number;
  gradingstatus: string;
  gradefordisplay?: string;
}

interface SubmissionContent {
  assignment: number;
  userid: number;
  status: string;
  submissiontext?: string;
  plugins?: Array<{
    type: string;
    content?: string;
    files?: Array<{
      filename: string;
      fileurl: string;
      filesize: number;
      filetype: string;
    }>;
  }>;
  timemodified: number;
}

interface QuizGradeResponse {
  hasgrade: boolean;
  grade?: string;
}

class MoodleMcpServer {
  private server: Server;
  private axiosInstance;

  constructor() {
    this.server = new Server(
      {
        name: 'moodle-mcp-server',
        version: PACKAGE_VERSION,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.axiosInstance = axios.create({
      baseURL: MOODLE_API_URL,
      params: {
        wstoken: MOODLE_API_TOKEN,
        moodlewsrestformat: 'json',
      },
    });

    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Helper to get courseId from args or fall back to default
   */
  private getCourseId(args: any): string {
    if (args?.courseId) {
      return String(args.courseId);
    }
    if (DEFAULT_COURSE_ID) {
      return DEFAULT_COURSE_ID;
    }
    throw new McpError(
      ErrorCode.InvalidParams,
      'courseId is required. Either pass it as a parameter or set MOODLE_COURSE_ID environment variable.'
    );
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // NEW: List all courses the user has access to
        {
          name: 'list_courses',
          description: 'Lists all courses the authenticated user has access to. Use this to discover available course IDs before querying specific courses.',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        // NEW: Get course contents (sections/units)
        {
          name: 'get_course_contents',
          description: 'Gets the contents (sections, modules, activities) of a specific course. Useful for seeing the course structure.',
          inputSchema: {
            type: 'object',
            properties: {
              courseId: {
                type: 'number',
                description: 'ID of the course. If not provided, uses the default configured course.',
              },
            },
            required: [],
          },
        },
        {
          name: 'get_students',
          description: 'Gets the list of students enrolled in a course.',
          inputSchema: {
            type: 'object',
            properties: {
              courseId: {
                type: 'number',
                description: 'ID of the course. If not provided, uses the default configured course.',
              },
            },
            required: [],
          },
        },
        {
          name: 'get_assignments',
          description: 'Gets the list of assignments in a course.',
          inputSchema: {
            type: 'object',
            properties: {
              courseId: {
                type: 'number',
                description: 'ID of the course. If not provided, uses the default configured course.',
              },
            },
            required: [],
          },
        },
        {
          name: 'get_quizzes',
          description: 'Gets the list of quizzes in a course.',
          inputSchema: {
            type: 'object',
            properties: {
              courseId: {
                type: 'number',
                description: 'ID of the course. If not provided, uses the default configured course.',
              },
            },
            required: [],
          },
        },
        {
          name: 'get_submissions',
          description: 'Gets assignment submissions for a course.',
          inputSchema: {
            type: 'object',
            properties: {
              courseId: {
                type: 'number',
                description: 'ID of the course. If not provided, uses the default configured course.',
              },
              studentId: {
                type: 'number',
                description: 'Optional student ID. If not provided, returns submissions from all students.',
              },
              assignmentId: {
                type: 'number',
                description: 'Optional assignment ID. If not provided, returns all submissions.',
              },
            },
            required: [],
          },
        },
        {
          name: 'provide_feedback',
          description: 'Provides feedback and grade for a student assignment submission.',
          inputSchema: {
            type: 'object',
            properties: {
              studentId: {
                type: 'number',
                description: 'ID of the student',
              },
              assignmentId: {
                type: 'number',
                description: 'ID of the assignment',
              },
              grade: {
                type: 'number',
                description: 'Numeric grade to assign',
              },
              feedback: {
                type: 'string',
                description: 'Feedback text to provide',
              },
            },
            required: ['studentId', 'assignmentId', 'feedback'],
          },
        },
        {
          name: 'get_submission_content',
          description: 'Gets the detailed content of a specific submission, including text and attached files.',
          inputSchema: {
            type: 'object',
            properties: {
              studentId: {
                type: 'number',
                description: 'ID of the student',
              },
              assignmentId: {
                type: 'number',
                description: 'ID of the assignment',
              },
            },
            required: ['studentId', 'assignmentId'],
          },
        },
        {
          name: 'get_quiz_grade',
          description: 'Gets a student\'s grade for a specific quiz.',
          inputSchema: {
            type: 'object',
            properties: {
              studentId: {
                type: 'number',
                description: 'ID of the student',
              },
              quizId: {
                type: 'number',
                description: 'ID of the quiz',
              },
            },
            required: ['studentId', 'quizId'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      console.error(`[Tool] Executing tool: ${request.params.name}`);

      try {
        switch (request.params.name) {
          case 'list_courses':
            return await this.listCourses();
          case 'get_course_contents':
            return await this.getCourseContents(request.params.arguments);
          case 'get_students':
            return await this.getStudents(request.params.arguments);
          case 'get_assignments':
            return await this.getAssignments(request.params.arguments);
          case 'get_quizzes':
            return await this.getQuizzes(request.params.arguments);
          case 'get_submissions':
            return await this.getSubmissions(request.params.arguments);
          case 'provide_feedback':
            return await this.provideFeedback(request.params.arguments);
          case 'get_submission_content':
            return await this.getSubmissionContent(request.params.arguments);
          case 'get_quiz_grade':
            return await this.getQuizGrade(request.params.arguments);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        console.error('[Error]', error);
        if (axios.isAxiosError(error)) {
          return {
            content: [
              {
                type: 'text',
                text: `Moodle API error: ${
                  error.response?.data?.message || error.message
                }`,
              },
            ],
            isError: true,
          };
        }
        throw error;
      }
    });
  }

  /**
   * List all courses the authenticated user has access to
   * Uses core_course_get_courses which returns all accessible courses
   * (works for admins/teachers who have access via capabilities, not just enrollment)
   */
  private async listCourses() {
    console.error('[API] Requesting all accessible courses');

    const response = await this.axiosInstance.get('', {
      params: {
        wsfunction: 'core_course_get_courses',
      },
    });

    // Filter out the site-level course (id=1) and format the response
    const courses = response.data
      .filter((course: any) => course.id !== 1) // Exclude site-level course
      .map((course: any) => ({
        id: course.id,
        shortname: course.shortname,
        fullname: course.fullname,
        visible: course.visible === 1,
        summary: course.summary ? course.summary.replace(/<[^>]*>/g, '').trim().substring(0, 200) : '',
        categoryid: course.categoryid,
      }));

    const defaultNote = DEFAULT_COURSE_ID
      ? `\n\nDefault course ID: ${DEFAULT_COURSE_ID}`
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

  /**
   * NEW: Get course contents (sections, modules, activities)
   */
  private async getCourseContents(args: any) {
    const courseId = this.getCourseId(args);
    console.error(`[API] Requesting course contents for course ${courseId}`);

    const response = await this.axiosInstance.get('', {
      params: {
        wsfunction: 'core_course_get_contents',
        courseid: courseId,
      },
    });

    // Process the response to make it more readable
    const sections = response.data.map((section: any) => ({
      id: section.id,
      name: section.name || `Section ${section.section}`,
      summary: section.summary ? section.summary.replace(/<[^>]*>/g, '').trim() : '',
      visible: section.visible === 1,
      modules: section.modules?.map((mod: any) => ({
        id: mod.id,
        name: mod.name,
        modname: mod.modname, // e.g., 'assign', 'quiz', 'forum', 'page'
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

  private async getStudents(args: any) {
    const courseId = this.getCourseId(args);
    console.error(`[API] Requesting enrolled users for course ${courseId}`);

    const response = await this.axiosInstance.get('', {
      params: {
        wsfunction: 'core_enrol_get_enrolled_users',
        courseid: courseId,
      },
    });

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

  private async getAssignments(args: any) {
    const courseId = this.getCourseId(args);
    console.error(`[API] Requesting assignments for course ${courseId}`);

    const response = await this.axiosInstance.get('', {
      params: {
        wsfunction: 'mod_assign_get_assignments',
        courseids: [courseId],
      },
    });

    const courseData = response.data.courses?.find((c: any) => String(c.id) === courseId);
    const assignments = courseData?.assignments || [];

    // Format dates for readability
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

  private async getQuizzes(args: any) {
    const courseId = this.getCourseId(args);
    console.error(`[API] Requesting quizzes for course ${courseId}`);

    const response = await this.axiosInstance.get('', {
      params: {
        wsfunction: 'mod_quiz_get_quizzes_by_courses',
        courseids: [courseId],
      },
    });

    const quizzes = response.data.quizzes || [];

    // Format dates for readability
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

  private async getSubmissions(args: any) {
    const courseId = this.getCourseId(args);
    const studentId = args?.studentId;
    const assignmentId = args?.assignmentId;

    console.error(`[API] Requesting submissions for course ${courseId}${studentId ? ` for student ${studentId}` : ''}`);

    // First get all assignments for the course
    const assignmentsResponse = await this.axiosInstance.get('', {
      params: {
        wsfunction: 'mod_assign_get_assignments',
        courseids: [courseId],
      },
    });

    const courseData = assignmentsResponse.data.courses?.find((c: any) => String(c.id) === courseId);
    const assignments = courseData?.assignments || [];

    // Filter to specific assignment if provided
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

    // Get submissions for each assignment
    const submissionsPromises = targetAssignments.map(async (assignment: any) => {
      const submissionsResponse = await this.axiosInstance.get('', {
        params: {
          wsfunction: 'mod_assign_get_submissions',
          assignmentids: [assignment.id],
        },
      });

      const submissions = submissionsResponse.data.assignments[0]?.submissions || [];

      // Get grades for this assignment
      const gradesResponse = await this.axiosInstance.get('', {
        params: {
          wsfunction: 'mod_assign_get_grades',
          assignmentids: [assignment.id],
        },
      });

      const grades = gradesResponse.data.assignments[0]?.grades || [];

      // Filter by student if specified
      const targetSubmissions = studentId
        ? submissions.filter((s: any) => s.userid === studentId)
        : submissions;

      // Process each submission
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

  private async provideFeedback(args: any) {
    if (!args.studentId || !args.assignmentId || !args.feedback) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Student ID, Assignment ID, and feedback are required'
      );
    }

    console.error(`[API] Providing feedback for student ${args.studentId} on assignment ${args.assignmentId}`);

    const response = await this.axiosInstance.get('', {
      params: {
        wsfunction: 'mod_assign_save_grade',
        assignmentid: args.assignmentId,
        userid: args.studentId,
        grade: args.grade || 0,
        attemptnumber: -1, // Latest attempt
        addattempt: 0,
        workflowstate: 'released',
        applytoall: 0,
        plugindata: {
          assignfeedbackcomments_editor: {
            text: args.feedback,
            format: 1, // HTML format
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

  private async getSubmissionContent(args: any) {
    if (!args.studentId || !args.assignmentId) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Student ID and Assignment ID are required'
      );
    }

    console.error(`[API] Requesting submission content for student ${args.studentId} on assignment ${args.assignmentId}`);

    try {
      const response = await this.axiosInstance.get('', {
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

  private async getQuizGrade(args: any) {
    if (!args.studentId || !args.quizId) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Student ID and Quiz ID are required'
      );
    }

    console.error(`[API] Requesting quiz grade for student ${args.studentId} on quiz ${args.quizId}`);

    try {
      const response = await this.axiosInstance.get('', {
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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Moodle MCP server running on stdio (multi-course support enabled)');
  }
}

const server = new MoodleMcpServer();
server.run().catch(console.error);
