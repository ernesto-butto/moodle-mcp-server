import type { AxiosInstance } from 'axios';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getCourseId, validateArrayResponse } from '../moodle-client.js';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

export async function getForums(client: AxiosInstance, args: any, defaultCourseId?: string) {
  const courseId = getCourseId(args, defaultCourseId);
  console.error(`[API] Requesting forums for course ${courseId}`);

  const response = await client.get('', {
    params: {
      wsfunction: 'mod_forum_get_forums_by_courses',
      courseids: [courseId],
    },
  });

  validateArrayResponse(response.data, 'get_forums');

  const forums = response.data.map((f: any) => ({
    id: f.id,
    course: f.course,
    type: f.type,
    name: f.name,
    intro: stripHtml(f.intro || '').substring(0, 200),
    duedate: f.duedate ? new Date(f.duedate * 1000).toISOString() : null,
    cutoffdate: f.cutoffdate ? new Date(f.cutoffdate * 1000).toISOString() : null,
    timemodified: f.timemodified ? new Date(f.timemodified * 1000).toISOString() : null,
  }));

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ courseId, forums }, null, 2),
      },
    ],
  };
}

export async function getForumDiscussions(client: AxiosInstance, args: any) {
  if (!args.forumId) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Forum ID is required'
    );
  }

  console.error(`[API] Requesting discussions for forum ${args.forumId}`);

  const response = await client.get('', {
    params: {
      wsfunction: 'mod_forum_get_forum_discussions',
      forumid: args.forumId,
    },
  });

  const discussions = response.data.discussions || [];

  const formattedDiscussions = discussions.map((d: any) => ({
    id: d.id,
    discussion: d.discussion,
    name: d.name,
    subject: d.subject,
    message: (d.message || '').substring(0, 500),
    userfullname: d.userfullname,
    userid: d.userid,
    created: d.created ? new Date(d.created * 1000).toISOString() : null,
    modified: d.modified ? new Date(d.modified * 1000).toISOString() : null,
    numreplies: d.numreplies,
    pinned: d.pinned,
    locked: d.locked,
    canreply: d.canreply,
  }));

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ forumId: args.forumId, discussions: formattedDiscussions }, null, 2),
      },
    ],
  };
}

export async function createForumDiscussion(client: AxiosInstance, args: any) {
  if (!args.forumId || !args.subject || !args.message) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Forum ID, subject, and message are required'
    );
  }

  console.error(`[API] Creating discussion in forum ${args.forumId}`);

  const response = await client.get('', {
    params: {
      wsfunction: 'mod_forum_add_discussion',
      forumid: args.forumId,
      subject: args.subject,
      message: args.message,
    },
  });

  return {
    content: [
      {
        type: 'text',
        text: `Discussion created successfully in forum ${args.forumId}. Discussion ID: ${response.data.discussionid}`,
      },
    ],
  };
}

export async function replyToForumDiscussion(client: AxiosInstance, args: any) {
  if (!args.postId || !args.message) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Post ID and message are required'
    );
  }

  console.error(`[API] Replying to post ${args.postId}`);

  const response = await client.get('', {
    params: {
      wsfunction: 'mod_forum_add_discussion_post',
      postid: args.postId,
      subject: args.subject || 'Re: ',
      message: args.message,
    },
  });

  return {
    content: [
      {
        type: 'text',
        text: `Reply posted successfully. Post ID: ${response.data.postid}`,
      },
    ],
  };
}
