export interface Student {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
}

export interface Course {
  id: number;
  shortname: string;
  fullname: string;
  enrolledusercount: number;
  visible: boolean;
}

export interface Assignment {
  id: number;
  name: string;
  duedate: number;
  allowsubmissionsfromdate: number;
  grade: number;
  timemodified: number;
  cutoffdate: number;
}

export interface Quiz {
  id: number;
  name: string;
  timeopen: number;
  timeclose: number;
  grade: number;
  timemodified: number;
}

export interface Submission {
  id: number;
  userid: number;
  status: string;
  timemodified: number;
  gradingstatus: string;
  gradefordisplay?: string;
}

export interface SubmissionContent {
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

export interface QuizGradeResponse {
  hasgrade: boolean;
  grade?: string;
}

export interface Forum {
  id: number;
  course: number;
  type: string;
  name: string;
  intro: string;
  duedate: number;
  cutoffdate: number;
  timemodified: number;
}

export interface ForumDiscussion {
  id: number;
  name: string;
  discussion: number;
  userid: number;
  subject: string;
  message: string;
  created: number;
  modified: number;
  numreplies: number;
  pinned: boolean;
  locked: boolean;
  canreply: boolean;
  userfullname: string;
}
