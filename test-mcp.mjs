#!/usr/bin/env node
/**
 * Quick MCP integration test — spawns the server and calls tools via the protocol.
 * Usage: MOODLE_API_URL=... MOODLE_API_TOKEN=... node test-mcp.mjs
 *
 * Without real credentials, it tests tool registration and param validation.
 * With real credentials, it tests actual Moodle API calls.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['build/index.js'],
  env: {
    ...process.env,
    MOODLE_API_URL: process.env.MOODLE_API_URL || 'https://moodle.test/webservice/rest/server.php',
    MOODLE_API_TOKEN: process.env.MOODLE_API_TOKEN || 'fake-token-for-schema-test',
  },
});

const client = new Client(
  { name: 'test-client', version: '1.0.0' },
  { capabilities: { tools: {} } }
);
await client.connect(transport);

// ── List all tools ──────────────────────────────────────────────
console.log('=== Registered Tools ===\n');
const { tools } = await client.listTools();
for (const t of tools) {
  const required = t.inputSchema?.required?.join(', ') || 'none';
  console.log(`  ${t.name}  (required: ${required})`);
}
console.log(`\n  Total: ${tools.length} tools\n`);

// ── Verify new forum tools exist ────────────────────────────────
const forumTools = ['get_forums', 'get_forum_discussions', 'create_forum_discussion', 'reply_to_forum_discussion'];
const missing = forumTools.filter(name => !tools.find(t => t.name === name));
if (missing.length > 0) {
  console.error(`FAIL: Missing forum tools: ${missing.join(', ')}`);
  process.exit(1);
}
console.log('=== Forum tools registered: OK ===\n');

// ── Test param validation (no credentials needed) ───────────────
console.log('=== Param Validation Tests ===\n');

const validationTests = [
  { tool: 'get_forum_discussions', args: {}, expectError: 'Forum ID is required' },
  { tool: 'create_forum_discussion', args: { forumId: 1 }, expectError: 'Forum ID, subject, and message are required' },
  { tool: 'reply_to_forum_discussion', args: {}, expectError: 'Post ID and message are required' },
];

for (const test of validationTests) {
  try {
    await client.callTool({ name: test.tool, arguments: test.args });
    console.error(`  FAIL: ${test.tool} — should have thrown`);
  } catch (err) {
    if (err.message?.includes(test.expectError)) {
      console.log(`  PASS: ${test.tool} — "${test.expectError}"`);
    } else {
      console.error(`  FAIL: ${test.tool} — got: ${err.message}`);
    }
  }
}

// ── Live API tests (only if real credentials) ───────────────────
if (process.env.MOODLE_API_TOKEN && process.env.MOODLE_API_TOKEN !== 'fake-token-for-schema-test') {
  console.log('\n=== Live API Tests ===\n');

  const courseId = process.env.MOODLE_COURSE_ID;
  if (courseId) {
    try {
      const result = await client.callTool({ name: 'get_forums', arguments: { courseId: Number(courseId) } });
      const data = JSON.parse(result.content[0].text);
      console.log(`  PASS: get_forums — found ${data.forums.length} forum(s) in course ${courseId}`);

      if (data.forums.length > 0) {
        const forumId = data.forums[0].id;
        const disc = await client.callTool({ name: 'get_forum_discussions', arguments: { forumId } });
        const discData = JSON.parse(disc.content[0].text);
        console.log(`  PASS: get_forum_discussions — found ${discData.discussions.length} discussion(s) in forum ${forumId}`);
      }
    } catch (err) {
      console.error(`  FAIL: Live test — ${err.message}`);
    }
  } else {
    console.log('  SKIP: Set MOODLE_COURSE_ID to run live forum tests');
  }
} else {
  console.log('\n  SKIP: Live API tests (no real MOODLE_API_TOKEN set)');
}

console.log('\n=== Done ===');
await client.close();
process.exit(0);
