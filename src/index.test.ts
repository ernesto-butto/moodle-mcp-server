import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';

// Shared state that the mock Server populates
let serverInstance: any;

// Mock the MCP SDK before any module import
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => {
  return {
    Server: class MockServer {
      _handlers: Function[] = [];
      onerror: any = null;
      setRequestHandler(_schema: any, handler: Function) {
        this._handlers.push(handler);
      }
      connect = vi.fn();
      close = vi.fn();
      constructor() {
        serverInstance = this;
      }
    },
  };
});

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class MockTransport {},
}));

// Handlers are registered in order: [0] = ListTools, [1] = CallTool
async function callTool(name: string, args: Record<string, any> = {}) {
  return serverInstance._handlers[1]({
    method: 'tools/call',
    params: { name, arguments: args },
  });
}

async function listTools() {
  return serverInstance._handlers[0]({ method: 'tools/list', params: {} });
}

describe('MoodleMcpServer', () => {
  let mockAxios: MockAdapter;

  beforeEach(async () => {
    process.env.MOODLE_API_URL = 'https://moodle.test/webservice/rest/server.php';
    process.env.MOODLE_API_TOKEN = 'test-token-123';
    delete process.env.MOODLE_COURSE_ID;

    mockAxios = new MockAdapter(axios);

    vi.resetModules();
    await import('./index.js');
  });

  afterEach(() => {
    mockAxios.restore();
    vi.restoreAllMocks();
    delete process.env.MOODLE_API_URL;
    delete process.env.MOODLE_API_TOKEN;
    delete process.env.MOODLE_COURSE_ID;
  });

  // ── Tool Registration ──────────────────────────────────────────────

  describe('tool registration', () => {
    it('registers all 9 tools', async () => {
      const result = await listTools();
      const names = result.tools.map((t: any) => t.name);
      expect(names).toEqual([
        'list_courses',
        'get_course_contents',
        'get_students',
        'get_assignments',
        'get_quizzes',
        'get_submissions',
        'provide_feedback',
        'get_submission_content',
        'get_quiz_grade',
      ]);
    });
  });

  // ── courseId Resolution ─────────────────────────────────────────────

  describe('courseId resolution', () => {
    it('uses explicit courseId when provided', async () => {
      mockAxios.onGet().reply(200, [
        { id: 10, username: 'student1', firstname: 'A', lastname: 'B', email: 'a@b.com', roles: [{ shortname: 'student' }] },
      ]);

      const result = await callTool('get_students', { courseId: 42 });
      const data = JSON.parse(result.content[0].text);
      expect(data.courseId).toBe('42');
    });

    it('falls back to MOODLE_COURSE_ID env var', async () => {
      process.env.MOODLE_COURSE_ID = '99';
      vi.resetModules();
      await import('./index.js');

      mockAxios.onGet().reply(200, []);

      const result = await callTool('get_students', {});
      const data = JSON.parse(result.content[0].text);
      expect(data.courseId).toBe('99');
    });

    it('throws McpError when no courseId is available', async () => {
      await expect(callTool('get_students', {})).rejects.toThrow(
        'courseId is required'
      );
    });
  });

  // ── list_courses ────────────────────────────────────────────────────

  describe('list_courses', () => {
    it('filters out site-level course (id=1) and strips HTML from summaries', async () => {
      mockAxios.onGet().reply(200, [
        { id: 1, shortname: 'site', fullname: 'Site', visible: 1, summary: '<p>Site course</p>', categoryid: 0 },
        { id: 2, shortname: 'CS101', fullname: 'Intro to CS', visible: 1, summary: '<p>A <b>great</b> course</p>', categoryid: 1 },
        { id: 3, shortname: 'MATH', fullname: 'Math 101', visible: 0, summary: '', categoryid: 1 },
      ]);

      const result = await callTool('list_courses');
      const text = result.content[0].text;
      const courses = JSON.parse(text.split('\n\nNo default course')[0]);

      expect(courses).toHaveLength(2);
      expect(courses[0].id).toBe(2);
      expect(courses[0].summary).toBe('A great course');
      expect(courses[1].visible).toBe(false);
      expect(courses.find((c: any) => c.id === 1)).toBeUndefined();
    });
  });

  // ── get_course_contents ─────────────────────────────────────────────

  describe('get_course_contents', () => {
    it('returns transformed sections with modules', async () => {
      mockAxios.onGet().reply(200, [
        {
          id: 1, section: 0, name: 'General', summary: '<p>Welcome</p>', visible: 1,
          modules: [
            { id: 10, name: 'Assignment 1', modname: 'assign', visible: 1, url: 'https://moodle.test/mod/assign/view.php?id=10' },
            { id: 11, name: 'Quiz 1', modname: 'quiz', visible: 0, url: 'https://moodle.test/mod/quiz/view.php?id=11' },
          ],
        },
      ]);

      const result = await callTool('get_course_contents', { courseId: 5 });
      const sections = JSON.parse(result.content[0].text);

      expect(sections).toHaveLength(1);
      expect(sections[0].name).toBe('General');
      expect(sections[0].summary).toBe('Welcome');
      expect(sections[0].modules).toHaveLength(2);
      expect(sections[0].modules[0].modname).toBe('assign');
      expect(sections[0].modules[1].visible).toBe(false);
    });
  });

  // ── get_students ────────────────────────────────────────────────────

  describe('get_students', () => {
    it('filters by student role and converts timestamps', async () => {
      mockAxios.onGet().reply(200, [
        {
          id: 1, username: 'student1', firstname: 'Alice', lastname: 'Smith',
          email: 'alice@test.com', lastaccess: 1700000000,
          roles: [{ shortname: 'student' }],
        },
        {
          id: 2, username: 'teacher1', firstname: 'Bob', lastname: 'Jones',
          email: 'bob@test.com', lastaccess: 1700000000,
          roles: [{ shortname: 'editingteacher' }],
        },
        {
          id: 3, username: 'student2', firstname: 'Carol', lastname: 'White',
          email: 'carol@test.com', lastaccess: null,
          roles: [{ shortname: 'student' }],
        },
      ]);

      const result = await callTool('get_students', { courseId: 5 });
      const data = JSON.parse(result.content[0].text);

      expect(data.students).toHaveLength(2);
      expect(data.students[0].username).toBe('student1');
      expect(data.students[0].lastaccess).toBe(new Date(1700000000 * 1000).toISOString());
      expect(data.students[1].lastaccess).toBeNull();
      expect(data.students.find((s: any) => s.username === 'teacher1')).toBeUndefined();
    });
  });

  // ── get_assignments ─────────────────────────────────────────────────

  describe('get_assignments', () => {
    it('finds course and formats date fields to ISO strings', async () => {
      mockAxios.onGet().reply(200, {
        courses: [{
          id: 5,
          assignments: [
            { id: 100, name: 'Essay', duedate: 1700000000, allowsubmissionsfromdate: 1699000000, cutoffdate: 1701000000 },
            { id: 101, name: 'Lab Report', duedate: 0, allowsubmissionsfromdate: 0, cutoffdate: 0 },
          ],
        }],
      });

      const result = await callTool('get_assignments', { courseId: 5 });
      const data = JSON.parse(result.content[0].text);

      expect(data.assignments).toHaveLength(2);
      expect(data.assignments[0].duedate).toBe(new Date(1700000000 * 1000).toISOString());
      expect(data.assignments[1].duedate).toBeNull();
    });
  });

  // ── get_quizzes ─────────────────────────────────────────────────────

  describe('get_quizzes', () => {
    it('formats timeopen and timeclose to ISO strings', async () => {
      mockAxios.onGet().reply(200, {
        quizzes: [
          { id: 200, name: 'Midterm', timeopen: 1700000000, timeclose: 1700100000 },
          { id: 201, name: 'Final', timeopen: 0, timeclose: 0 },
        ],
      });

      const result = await callTool('get_quizzes', { courseId: 5 });
      const data = JSON.parse(result.content[0].text);

      expect(data.quizzes).toHaveLength(2);
      expect(data.quizzes[0].timeopen).toBe(new Date(1700000000 * 1000).toISOString());
      expect(data.quizzes[1].timeopen).toBeNull();
    });
  });

  // ── get_submissions ─────────────────────────────────────────────────

  describe('get_submissions', () => {
    it('returns submissions with grades merged in', async () => {
      mockAxios.onGet().replyOnce(200, {
        courses: [{ id: 5, assignments: [{ id: 100, name: 'Essay' }] }],
      });
      mockAxios.onGet().replyOnce(200, {
        assignments: [{ id: 100, submissions: [
          { userid: 1, status: 'submitted', timemodified: 1700000000 },
        ] }],
      });
      mockAxios.onGet().replyOnce(200, {
        assignments: [{ id: 100, grades: [{ userid: 1, grade: '85.00' }] }],
      });

      const result = await callTool('get_submissions', { courseId: 5 });
      const data = JSON.parse(result.content[0].text);

      expect(data.results).toHaveLength(1);
      expect(data.results[0].assignment).toBe('Essay');
      expect(data.results[0].submissions[0].grade).toBe('85.00');
      expect(data.results[0].submissions[0].timemodified).toBe(new Date(1700000000 * 1000).toISOString());
    });

    it('filters by studentId when provided', async () => {
      mockAxios.onGet().replyOnce(200, {
        courses: [{ id: 5, assignments: [{ id: 100, name: 'Essay' }] }],
      });
      mockAxios.onGet().replyOnce(200, {
        assignments: [{ id: 100, submissions: [
          { userid: 1, status: 'submitted', timemodified: 1700000000 },
          { userid: 2, status: 'submitted', timemodified: 1700000000 },
        ] }],
      });
      mockAxios.onGet().replyOnce(200, {
        assignments: [{ id: 100, grades: [] }],
      });

      const result = await callTool('get_submissions', { courseId: 5, studentId: 1 });
      const data = JSON.parse(result.content[0].text);

      expect(data.results[0].submissions).toHaveLength(1);
      expect(data.results[0].submissions[0].userid).toBe(1);
    });
  });

  // ── provide_feedback ────────────────────────────────────────────────

  describe('provide_feedback', () => {
    it('validates required params', async () => {
      await expect(callTool('provide_feedback', { studentId: 1 })).rejects.toThrow(
        'Student ID, Assignment ID, and feedback are required'
      );
    });

    it('returns success message on valid input', async () => {
      mockAxios.onGet().reply(200, null);

      const result = await callTool('provide_feedback', {
        studentId: 1, assignmentId: 100, feedback: 'Good work!', grade: 90,
      });

      expect(result.content[0].text).toContain('Feedback successfully provided');
      expect(result.content[0].text).toContain('student 1');
      expect(result.content[0].text).toContain('assignment 100');
    });
  });

  // ── get_submission_content ──────────────────────────────────────────

  describe('get_submission_content', () => {
    it('parses onlinetext and file plugins from response', async () => {
      mockAxios.onGet().reply(200, {
        submission: { status: 'submitted', timemodified: 1700000000 },
        lastattempt: {
          submission: {
            plugins: [
              { type: 'onlinetext', editorfields: [{ name: 'onlinetext', text: '<p>My essay text</p>' }] },
              {
                type: 'file',
                fileareas: [{
                  area: 'submission_files',
                  files: [{ filename: 'report.pdf', fileurl: 'https://moodle.test/file/report.pdf', filesize: 12345, mimetype: 'application/pdf' }],
                }],
              },
            ],
          },
        },
      });

      const result = await callTool('get_submission_content', { studentId: 1, assignmentId: 100 });
      const data = JSON.parse(result.content[0].text);

      expect(data.status).toBe('submitted');
      expect(data.submissiontext).toBe('<p>My essay text</p>');
      expect(data.plugins[1].files).toHaveLength(1);
      expect(data.plugins[1].files[0].filename).toBe('report.pdf');
    });

    it('validates required params', async () => {
      await expect(callTool('get_submission_content', { studentId: 1 })).rejects.toThrow(
        'Student ID and Assignment ID are required'
      );
    });
  });

  // ── get_quiz_grade ──────────────────────────────────────────────────

  describe('get_quiz_grade', () => {
    it('returns grade when available', async () => {
      mockAxios.onGet().reply(200, { hasgrade: true, grade: '92.50' });

      const result = await callTool('get_quiz_grade', { studentId: 1, quizId: 200 });
      const data = JSON.parse(result.content[0].text);

      expect(data.hasGrade).toBe(true);
      expect(data.grade).toBe('92.50');
    });

    it('returns "Not graded" when no grade exists', async () => {
      mockAxios.onGet().reply(200, { hasgrade: false });

      const result = await callTool('get_quiz_grade', { studentId: 1, quizId: 200 });
      const data = JSON.parse(result.content[0].text);

      expect(data.hasGrade).toBe(false);
      expect(data.grade).toBe('Not graded');
    });

    it('validates required params', async () => {
      await expect(callTool('get_quiz_grade', { studentId: 1 })).rejects.toThrow(
        'Student ID and Quiz ID are required'
      );
    });
  });

  // ── Error Handling ──────────────────────────────────────────────────

  describe('error handling', () => {
    it('returns isError response for axios errors', async () => {
      mockAxios.onGet().reply(500, { message: 'Internal Moodle error' });

      const result = await callTool('list_courses');

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Moodle API error');
    });

    it('throws McpError for unknown tool', async () => {
      await expect(callTool('nonexistent_tool')).rejects.toThrow(
        'Unknown tool: nonexistent_tool'
      );
    });
  });
});
