export const toolDefinitions = [
  {
    name: 'list_courses',
    description: 'Lists all courses the authenticated user has access to. Use this to discover available course IDs before querying specific courses.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
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
];
