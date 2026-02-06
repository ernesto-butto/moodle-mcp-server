# Feature: Refactor Single-File Server into Modular Structure

## Summary

Split the monolithic `src/index.ts` (846 lines) into a modular file structure: types, Moodle client, tool definitions, tool handlers grouped by domain, and a slim server orchestrator. The entry point remains `src/index.ts` (for bin compatibility) but delegates to extracted modules. Tests are updated to match the new structure while preserving all 20 existing test cases.

## User Story

As a developer maintaining this MCP server
I want the codebase split into focused, domain-organized modules
So that adding new tools requires touching only a schema file and a handler file instead of editing a single 846-line file in 3 places

## Problem Statement

All 9 tool definitions, 9 tool implementations, 7 interfaces, 2 helpers, the Moodle client, and the MCP server setup live in one file. Adding a new tool requires editing the ListToolsRequestSchema handler (schemas), the CallToolRequestSchema handler (routing switch), and adding a new method — all in `src/index.ts`.

## Solution Statement

Extract code into focused modules organized by responsibility. Keep `src/index.ts` as the executable entry point (preserving `package.json` bin config) but make it a thin wrapper that imports and runs the server.

## Metadata

| Field            | Value                                          |
| ---------------- | ---------------------------------------------- |
| Type             | REFACTOR                                       |
| Complexity       | MEDIUM                                         |
| Systems Affected | src/index.ts, src/index.test.ts, build output  |
| Dependencies     | None new — same libs                           |
| Estimated Tasks  | 10                                             |

---

## UX Design

### Before State

```
src/
  index.ts          846 lines — EVERYTHING
  index.test.ts     454 lines — all tests

Developer adds a new tool:
  1. Add interface to index.ts (line ~100)
  2. Add schema to ListToolsRequestSchema handler (line ~175-328)
  3. Add case to switch statement (line ~334-358)
  4. Add private method to class (line ~400+)
  → Touch 4 places in 1 file, scroll through 846 lines
```

### After State

```
src/
  index.ts              ~15 lines  — entry point (shebang + import + run)
  server.ts             ~80 lines  — MoodleMcpServer class (thin router)
  types.ts              ~70 lines  — all interfaces
  moodle-client.ts      ~50 lines  — axios factory + helpers (getCourseId, validateArrayResponse)
  tools/
    definitions.ts      ~160 lines — all tool schemas in one exported array
    courses.ts           ~80 lines  — listCourses, getCourseContents
    students.ts          ~40 lines  — getStudents
    assignments.ts       ~140 lines — getAssignments, getSubmissions, getSubmissionContent, provideFeedback
    quizzes.ts           ~60 lines  — getQuizzes, getQuizGrade
  index.test.ts          ~460 lines — updated imports, same 20 tests

Developer adds a new tool:
  1. Add schema to tools/definitions.ts
  2. Add handler function in appropriate tools/*.ts file
  3. Add case to router in server.ts
  → Clear separation, small focused files
```

### Interaction Changes

| Location | Before | After | Developer Impact |
|----------|--------|-------|-----------------|
| `src/index.ts` | 846 lines, entire app | ~15 lines, entry point only | Easy to find code |
| Tool schemas | Inline in class method | `tools/definitions.ts` | One place for all schemas |
| Tool handlers | Private class methods | Standalone exported functions in `tools/*.ts` | Domain-grouped, testable |
| Types | Mixed into index.ts | `types.ts` | Clean imports |

---

## Mandatory Reading

**CRITICAL: Implementation agent MUST read these files before starting any task:**

| Priority | File | Lines | Why Read This |
|----------|------|-------|---------------|
| P0 | `src/index.ts` | 1-846 | Source of all code being extracted |
| P0 | `src/index.test.ts` | 1-454 | Tests that must keep passing |
| P1 | `package.json` | 23-25 | bin entry points to `./build/index.js` |
| P1 | `tsconfig.json` | all | rootDir: ./src, outDir: ./build, module: Node16 |

---

## Patterns to Mirror

**RETURN_FORMAT:**
```typescript
// SOURCE: src/index.ts:489-496
// ALL tool handlers return this shape:
return {
  content: [
    {
      type: 'text',
      text: JSON.stringify({ courseId, students }, null, 2),
    },
  ],
};
```

**LOGGING_PATTERN:**
```typescript
// SOURCE: src/index.ts:466
// All logging uses console.error (stdout reserved for MCP stdio)
console.error(`[API] Requesting enrolled users for course ${courseId}`);
```

**ERROR_HANDLING:**
```typescript
// SOURCE: src/index.ts:359-375
// Centralized axios error catch in the CallTool router:
if (axios.isAxiosError(error)) {
  return {
    content: [{ type: 'text', text: `Moodle API error: ${error.response?.data?.message || error.message}` }],
    isError: true,
  };
}
throw error;
```

**MOODLE_API_CALL:**
```typescript
// SOURCE: src/index.ts:468-473
// All API calls use axiosInstance.get('', { params: { wsfunction, ... } })
const response = await this.axiosInstance.get('', {
  params: {
    wsfunction: 'core_enrol_get_enrolled_users',
    courseid: courseId,
  },
});
```

**TEST_STRUCTURE:**
```typescript
// SOURCE: src/index.test.ts:42-62
// Dynamic import pattern with vi.mock before import:
beforeEach(async () => {
  process.env.MOODLE_API_URL = 'https://moodle.test/webservice/rest/server.php';
  process.env.MOODLE_API_TOKEN = 'test-token-123';
  delete process.env.MOODLE_COURSE_ID;
  mockAxios = new MockAdapter(axios);
  vi.resetModules();
  await import('./index.js');
});
```

---

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `src/types.ts` | CREATE | Extract 7 interfaces from index.ts:33-99 |
| `src/moodle-client.ts` | CREATE | Extract axios factory, getCourseId, validateArrayResponse |
| `src/tools/definitions.ts` | CREATE | Extract 9 tool schemas from index.ts:175-327 |
| `src/tools/courses.ts` | CREATE | Extract listCourses + getCourseContents handlers |
| `src/tools/students.ts` | CREATE | Extract getStudents handler |
| `src/tools/assignments.ts` | CREATE | Extract getAssignments, getSubmissions, getSubmissionContent, provideFeedback |
| `src/tools/quizzes.ts` | CREATE | Extract getQuizzes, getQuizGrade handlers |
| `src/server.ts` | CREATE | MoodleMcpServer class — MCP setup + thin router |
| `src/index.ts` | UPDATE | Reduce to entry point: shebang + import server + run |
| `src/index.test.ts` | UPDATE | Update import path (still imports `./index.js` which still creates+runs server) |

---

## NOT Building (Scope Limits)

- No new features or tools — purely structural refactor
- No dependency changes — same SDK, axios, vitest
- No changes to MCP protocol behavior — same tool names, schemas, responses
- No tsconfig changes — rootDir stays `./src`, same compilation
- No changes to test assertions — all 20 tests keep exact same expectations

---

## Step-by-Step Tasks

Execute in order. Each task is atomic and independently verifiable.

### Task 1: CREATE `src/types.ts`

- **ACTION**: Extract all 7 interfaces from `index.ts:33-99`
- **IMPLEMENT**: Export interfaces: `Student`, `Course`, `Assignment`, `Quiz`, `Submission`, `SubmissionContent`, `QuizGradeResponse`
- **NOTE**: These interfaces are currently defined but never used in type annotations (all params are `any`). Extract them anyway for future use and documentation value.
- **VALIDATE**: `npx tsc --noEmit` (should compile with no errors since nothing imports them yet)

### Task 2: CREATE `src/moodle-client.ts`

- **ACTION**: Extract the Moodle API client factory and shared helpers
- **IMPLEMENT**:
  - Read and validate environment variables (`MOODLE_API_URL`, `MOODLE_API_TOKEN`, `MOODLE_COURSE_ID`)
  - Export `createMoodleClient()` function that returns configured axios instance
  - Export `getCourseId(args: any, defaultCourseId: string | undefined): string` — standalone function
  - Export `validateArrayResponse(data: any, context: string): void` — standalone function
  - Export `DEFAULT_COURSE_ID` constant for use in `listCourses`
  - Import `McpError`, `ErrorCode` from MCP SDK types
- **IMPORTS**: `axios`, `@modelcontextprotocol/sdk/types.js`
- **GOTCHA**: `getCourseId` currently accesses the module-scope `DEFAULT_COURSE_ID` via closure. Extract it as a parameter or module export.
- **GOTCHA**: Environment validation (`throw new Error(...)`) must still happen at import time to fail fast.
- **VALIDATE**: `npx tsc --noEmit`

### Task 3: CREATE `src/tools/definitions.ts`

- **ACTION**: Extract all 9 tool schema objects from `index.ts:175-327`
- **IMPLEMENT**: Export a `toolDefinitions` array containing all tool schema objects (name, description, inputSchema)
- **NOTE**: These are plain objects, no dependencies on class or axios
- **VALIDATE**: `npx tsc --noEmit`

### Task 4: CREATE `src/tools/courses.ts`

- **ACTION**: Extract `listCourses` and `getCourseContents` as standalone exported functions
- **IMPLEMENT**:
  - `listCourses(client: AxiosInstance, defaultCourseId?: string)` — from index.ts:384-420
  - `getCourseContents(client: AxiosInstance, args: any, defaultCourseId?: string)` — from index.ts:425-462
  - Both functions receive the axios instance as first parameter
  - Both call `getCourseId` and `validateArrayResponse` imported from `moodle-client.ts`
- **IMPORTS**: `moodle-client.ts` (getCourseId, validateArrayResponse, DEFAULT_COURSE_ID)
- **VALIDATE**: `npx tsc --noEmit`

### Task 5: CREATE `src/tools/students.ts`

- **ACTION**: Extract `getStudents` as standalone exported function
- **IMPLEMENT**:
  - `getStudents(client: AxiosInstance, args: any, defaultCourseId?: string)` — from index.ts:464-497
  - Calls `getCourseId` and `validateArrayResponse` from `moodle-client.ts`
- **VALIDATE**: `npx tsc --noEmit`

### Task 6: CREATE `src/tools/assignments.ts`

- **ACTION**: Extract assignment-related handlers as standalone exported functions
- **IMPLEMENT**:
  - `getAssignments(client: AxiosInstance, args: any, defaultCourseId?: string)` — from index.ts:499-529
  - `getSubmissions(client: AxiosInstance, args: any, defaultCourseId?: string)` — from index.ts:561-650
  - `provideFeedback(client: AxiosInstance, args: any)` — from index.ts:652-689
  - `getSubmissionContent(client: AxiosInstance, args: any)` — from index.ts:691-782
- **GOTCHA**: `getSubmissionContent` has its own try-catch for axios errors (lines 765-781). Keep that local error handling.
- **VALIDATE**: `npx tsc --noEmit`

### Task 7: CREATE `src/tools/quizzes.ts`

- **ACTION**: Extract quiz-related handlers as standalone exported functions
- **IMPLEMENT**:
  - `getQuizzes(client: AxiosInstance, args: any, defaultCourseId?: string)` — from index.ts:531-559
  - `getQuizGrade(client: AxiosInstance, args: any)` — from index.ts:784-835
- **GOTCHA**: `getQuizGrade` has its own try-catch for axios errors (lines 818-834). Keep that local error handling.
- **VALIDATE**: `npx tsc --noEmit`

### Task 8: CREATE `src/server.ts`

- **ACTION**: Create the slim `MoodleMcpServer` class that wires everything together
- **IMPLEMENT**:
  - Import `Server` from MCP SDK, `StdioServerTransport`, tool definitions, all tool handlers, moodle-client
  - Constructor: create MCP Server, create moodle client via `createMoodleClient()`, register handlers
  - `setupToolHandlers()`: register `ListToolsRequestSchema` (returns imported `toolDefinitions`), register `CallToolRequestSchema` with switch routing to imported handler functions
  - `run()`: create transport, connect, log startup
  - Keep centralized axios error handling in the CallTool handler (index.ts:359-375)
  - Keep `server.onerror` and SIGINT handler
  - Read version from package.json using `createRequire` pattern (index.ts:13-15)
- **EXPORT**: `export class MoodleMcpServer` (for testability)
- **VALIDATE**: `npx tsc --noEmit`

### Task 9: UPDATE `src/index.ts`

- **ACTION**: Replace 846 lines with thin entry point
- **IMPLEMENT**:
  ```typescript
  #!/usr/bin/env node
  import { MoodleMcpServer } from './server.js';

  const server = new MoodleMcpServer();
  server.run().catch(console.error);
  ```
- **PRESERVES**: Shebang line, bin compatibility, auto-execution on import
- **GOTCHA**: Tests depend on `await import('./index.js')` triggering server creation. This still works since the entry point still instantiates and runs the server at module scope.
- **VALIDATE**: `npx tsc --noEmit`

### Task 10: UPDATE `src/index.test.ts`

- **ACTION**: Update tests to work with new module structure
- **CHANGES NEEDED**:
  - The `vi.mock` calls for MCP SDK stay the same (tests still mock the SDK)
  - The `await import('./index.js')` still works (index.ts still instantiates server)
  - MockAdapter on global axios still intercepts calls (tool handlers still use axios)
  - All 20 test cases and assertions remain IDENTICAL
  - The handler array order assumption (`_handlers[0]` = ListTools, `_handlers[1]` = CallTool) is preserved because `server.ts` registers them in the same order
- **LIKELY MINIMAL CHANGES**: The test file may need zero changes if the module re-import pattern works. But verify and fix if needed.
- **GOTCHA**: The axios mock adapter is created on the global `axios` module, but the moodle client uses `axios.create()`. The MockAdapter from `axios-mock-adapter` v2.x intercepts `axios.create()` instances by default. Verify this still works.
- **VALIDATE**: `npm test` — all 20 tests must pass

---

## Testing Strategy

### Approach

This is a refactor — no new behavior is added. The existing 20 tests serve as the regression suite. If all 20 pass after refactoring, the refactor is correct.

### Edge Cases Checklist

- [ ] `await import('./index.js')` still triggers server creation (module-scope execution)
- [ ] axios MockAdapter still intercepts requests from extracted tool functions
- [ ] Handler registration order preserved (`[0]` = ListTools, `[1]` = CallTool)
- [ ] Environment variable validation still throws at import time
- [ ] `getCourseId` fallback chain still works (arg > env > throw)
- [ ] `validateArrayResponse` still detects Moodle error objects
- [ ] `getSubmissionContent` and `getQuizGrade` local error handling preserved
- [ ] Shebang line present in compiled `build/index.js`
- [ ] `package.json` bin entry still points to `./build/index.js`

---

## Validation Commands

### Level 1: STATIC_ANALYSIS

```bash
npx tsc --noEmit
```

**EXPECT**: Exit 0, no type errors

### Level 2: UNIT_TESTS

```bash
npm test
```

**EXPECT**: All 20 tests pass

### Level 3: FULL_SUITE

```bash
npm test && npm run build
```

**EXPECT**: All tests pass, build succeeds, `build/index.js` exists and is executable

### Level 4: MANUAL_VALIDATION

1. Verify `build/index.js` starts with `#!/usr/bin/env node`
2. Verify `ls -la build/index.js` shows executable permissions
3. Verify `build/` contains compiled versions of all new files
4. Count lines in `src/index.ts` — should be ~5-10 lines

---

## Acceptance Criteria

- [ ] All 20 existing tests pass without modification (or minimal import-path changes)
- [ ] `npm run build` succeeds
- [ ] `build/index.js` is executable with shebang
- [ ] `src/index.ts` is under 15 lines
- [ ] No file in `src/tools/` exceeds 160 lines
- [ ] No new dependencies added
- [ ] Same tool names, schemas, and response formats (zero behavioral change)

---

## Completion Checklist

- [ ] All 10 tasks completed in dependency order
- [ ] Each task validated with `npx tsc --noEmit` after completion
- [ ] Level 1: `npx tsc --noEmit` passes
- [ ] Level 2: `npm test` — 20/20 tests pass
- [ ] Level 3: `npm run build` succeeds
- [ ] All acceptance criteria met

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| axios MockAdapter doesn't intercept `axios.create()` instances from extracted module | LOW | HIGH | MockAdapter v2.x intercepts `.create()` by default. Verify in Task 10. |
| Handler registration order changes | LOW | HIGH | `server.ts` registers ListTools before CallTool, same as current code. Test verifies. |
| Dynamic import still triggers side effects after split | LOW | HIGH | `index.ts` still has module-scope execution. Test in Task 10. |
| Circular imports between modules | LOW | MED | Dependency graph is one-directional: index → server → tools/* → moodle-client → types |

---

## Notes

- The interfaces in `types.ts` are currently unused in type annotations (all handler params are `any`). Extracting them preserves them for future typed params.
- Tool handler functions receive `AxiosInstance` as a parameter rather than accessing `this.axiosInstance`. This makes them testable independently in the future.
- The `DEFAULT_COURSE_ID` needs to be accessible by both `getCourseId()` (in moodle-client) and `listCourses()` (in tools/courses.ts for the note at the bottom of the response). Export it from `moodle-client.ts`.
- The `createRequire` pattern for reading `package.json` version stays in `server.ts` since that's where the MCP Server is constructed.
- Relates to GitHub Issue #7.
