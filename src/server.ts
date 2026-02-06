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

import { createMoodleClient, DEFAULT_COURSE_ID } from './moodle-client.js';
import { toolDefinitions } from './tools/definitions.js';
import { listCourses, getCourseContents } from './tools/courses.js';
import { getStudents } from './tools/students.js';
import { getAssignments, getSubmissions, provideFeedback, getSubmissionContent } from './tools/assignments.js';
import { getQuizzes, getQuizGrade } from './tools/quizzes.js';
import { getForums, getForumDiscussions, createForumDiscussion, replyToForumDiscussion } from './tools/forums.js';

const require = createRequire(import.meta.url);
const { version: PACKAGE_VERSION } = require('../package.json');

export class MoodleMcpServer {
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

    this.axiosInstance = createMoodleClient();

    this.setupToolHandlers();

    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: toolDefinitions,
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      console.error(`[Tool] Executing tool: ${request.params.name}`);

      try {
        switch (request.params.name) {
          case 'list_courses':
            return await listCourses(this.axiosInstance);
          case 'get_course_contents':
            return await getCourseContents(this.axiosInstance, request.params.arguments);
          case 'get_students':
            return await getStudents(this.axiosInstance, request.params.arguments);
          case 'get_assignments':
            return await getAssignments(this.axiosInstance, request.params.arguments);
          case 'get_quizzes':
            return await getQuizzes(this.axiosInstance, request.params.arguments);
          case 'get_submissions':
            return await getSubmissions(this.axiosInstance, request.params.arguments);
          case 'provide_feedback':
            return await provideFeedback(this.axiosInstance, request.params.arguments);
          case 'get_submission_content':
            return await getSubmissionContent(this.axiosInstance, request.params.arguments);
          case 'get_quiz_grade':
            return await getQuizGrade(this.axiosInstance, request.params.arguments);
          case 'get_forums':
            return await getForums(this.axiosInstance, request.params.arguments);
          case 'get_forum_discussions':
            return await getForumDiscussions(this.axiosInstance, request.params.arguments);
          case 'create_forum_discussion':
            return await createForumDiscussion(this.axiosInstance, request.params.arguments);
          case 'reply_to_forum_discussion':
            return await replyToForumDiscussion(this.axiosInstance, request.params.arguments);
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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Moodle MCP server running on stdio (multi-course support enabled)');
  }
}
