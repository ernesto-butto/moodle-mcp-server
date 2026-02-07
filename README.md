# Moodle MCP Server (Multi-Course Edition)

[![npm](https://img.shields.io/npm/v/@ernesto-butto/moodle-mcp-server)](https://www.npmjs.com/package/@ernesto-butto/moodle-mcp-server)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io/)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An enhanced [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that enables AI assistants like Claude to interact with Moodle LMS. **This fork adds multi-course support**, allowing you to manage multiple courses from a single MCP server.

> 🍴 This is an enhanced fork of [peancor/moodle-mcp-server](https://github.com/peancor/moodle-mcp-server) with significant improvements.

> ✅ **Tested with Moodle 4.5** (Build: 20241007). The built-in "Moodle mobile web service" in Moodle 4.x includes all the API functions this server needs — no custom service required.

> 📖 **Teacher or Moodle admin?** You don't need anything on this page. Follow the [Setup Guide (EN/ES)](SETUP_GUIDE.md) for simple step-by-step instructions in English and Spanish.

## ✨ What's New in This Fork

| Feature | Original | This Fork |
|---------|----------|-----------|
| Multi-course support | ❌ Single course only | ✅ Dynamic `courseId` parameter |
| List all courses | ❌ Not available | ✅ `list_courses` tool |
| View course contents | ❌ Not available | ✅ `get_course_contents` tool |
| Admin/Teacher access | ❌ Enrollment-based only | ✅ Works with capability-based access |
| Forum interaction | ❌ Not available | ✅ Browse, post, and reply to forums |

## 🛠️ Available Tools

### Course Discovery
| Tool | Description |
|------|-------------|
| `list_courses` | Lists all courses you have access to with IDs, names, and summaries |
| `get_course_contents` | Gets course sections, modules, and activities (course structure) |

### Student Management
| Tool | Description |
|------|-------------|
| `get_students` | Retrieves enrolled students with ID, name, email, last access |

### Assignment Management
| Tool | Description |
|------|-------------|
| `get_assignments` | Lists all assignments with due dates and max grades |
| `get_submissions` | Views student submissions for assignments |
| `get_submission_content` | Gets detailed submission content including files |
| `provide_feedback` | Grades assignments and provides feedback |

### Quiz Management
| Tool | Description |
|------|-------------|
| `get_quizzes` | Lists all quizzes in a course |
| `get_quiz_grade` | Gets a student's grade for a specific quiz |

### Forum Management
| Tool | Description |
|------|-------------|
| `get_forums` | Lists all forums in a course |
| `get_forum_discussions` | Lists discussions with authors, reply counts, and post IDs |
| `create_forum_discussion` | Creates a new discussion thread in a forum (HTML format) |
| `reply_to_forum_discussion` | Replies to an existing forum post (HTML format) |

### Multi-Course Support

All course-specific tools accept an optional `courseId` parameter:

```
"List all my Moodle courses"    → list_courses()
"List students in course 5"     → get_students(courseId=5)
"Show assignments"              → get_assignments() // uses default if configured
"Quizzes in course 10"          → get_quizzes(courseId=10)
```

**How it works:**
- If you specify `courseId` in the request, that course is used
- If you don't specify `courseId`, the default from `MOODLE_COURSE_ID` is used (if configured)
- `MOODLE_COURSE_ID` is **optional** — you can omit it entirely and always specify courses dynamically

## 📋 Requirements

- **Node.js** v18 or higher
- **Moodle API token** with appropriate permissions
- **Moodle** instance with web services enabled

## 🚀 Installation

No installation needed — Claude Desktop and Claude Code run the server directly from npm via `npx`.

### For Claude Desktop (Windows/macOS)

Edit your config file:
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "moodle": {
      "command": "npx",
      "args": ["-y", "@ernesto-butto/moodle-mcp-server"],
      "env": {
        "MOODLE_API_URL": "https://your-moodle.com/webservice/rest/server.php",
        "MOODLE_API_TOKEN": "your_token_here",
        "MOODLE_COURSE_ID": "4"
      }
    }
  }
}
```

> 💡 **Tip:** You can omit `MOODLE_COURSE_ID` entirely if you prefer to always specify courses dynamically using `list_courses` first.

### For Claude Code (Linux/WSL)

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "moodle": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@ernesto-butto/moodle-mcp-server"],
      "env": {
        "MOODLE_API_URL": "https://your-moodle.com/webservice/rest/server.php",
        "MOODLE_API_TOKEN": "${MOODLE_API_TOKEN}",
        "MOODLE_COURSE_ID": "4"
      }
    }
  }
}
```

Then set your token as an environment variable:

```bash
echo 'export MOODLE_API_TOKEN="your_token_here"' >> ~/.bashrc
source ~/.bashrc
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MOODLE_API_URL` | ✅ Yes | Your Moodle web service endpoint |
| `MOODLE_API_TOKEN` | ✅ Yes | API token for authentication |
| `MOODLE_COURSE_ID` | ❌ No | Default course ID (optional — use `list_courses` to discover courses dynamically) |

### From Source (for development)

```bash
git clone https://github.com/ernesto-butto/moodle-mcp-server.git
cd moodle-mcp-server
npm install
npm run build
```

## 🔑 Getting a Moodle API Token

1. Log in to Moodle as admin
2. Go to **Site Administration → Server → Web services → External services**
3. Ensure **"Moodle mobile web service"** is enabled (it includes all required API functions)
4. Go to **Site Administration → Server → Web services → Manage tokens**
5. Click **Create token**, select the teacher's user account and the **"Moodle mobile web service"**
6. Copy the token

> 💡 **That's it.** In Moodle 4.x the mobile web service already covers all the functions this server uses. No need to create a custom service or add individual functions.

### Finding Your Course ID

Simply ask Claude: *"List all my Moodle courses"* — the `list_courses` tool will return all courses with their IDs.

You can also find it in the URL when visiting a course: `https://your-moodle.com/course/view.php?id=4` — the ID is `4`.

<details>
<summary><strong>Advanced: Custom Service (for minimal permissions)</strong></summary>

If your admin prefers to create a custom service with only the required functions instead of using the mobile web service, add these functions:

- `core_course_get_courses`
- `core_course_get_contents`
- `core_enrol_get_enrolled_users`
- `mod_assign_get_assignments`
- `mod_assign_get_submissions`
- `mod_assign_get_grades`
- `mod_assign_get_submission_status`
- `mod_assign_save_grade`
- `mod_quiz_get_quizzes_by_courses`
- `mod_quiz_get_user_best_grade`
- `mod_forum_get_forums_by_courses`
- `mod_forum_get_forum_discussions`
- `mod_forum_add_discussion`
- `mod_forum_add_discussion_post`

</details>

## 💡 Example Usage

Once configured, you can ask Claude:

- *"List all my Moodle courses"*
- *"Show me the students in course 5"*
- *"What assignments are in Unidad 3?"*
- *"Get the course contents for course 10"*
- *"Show quiz grades for student 42 in quiz 15"*
- *"List the forums in course 5"*
- *"Show discussions in forum 3"*
- *"Create a new discussion in forum 3 with the subject 'Week 5 Feedback'"*
- *"Reply to post 10 with my review of the student's work"*

## 🔒 Security Best Practices

1. **Never commit tokens** - Use environment variables
2. **Use dedicated accounts** - Create a Moodle user for API access
3. **Minimal permissions** - Only enable required web service functions
4. **Rotate tokens** - Regenerate tokens periodically
5. **Set expiration** - Use token expiration dates in Moodle

## 🧪 Development

### Watch mode (auto-rebuild)

```bash
npm run watch
```

### Debug with MCP Inspector

```bash
npm run inspector
```

This opens a browser-based debugging interface.

### Testing

**Unit tests** — run the full Vitest suite with mocked Moodle API responses (no credentials needed):

```bash
npm test
```

**MCP integration test** — spawns the server via the MCP protocol over stdio (same path as Claude Desktop) and validates tool registration, param validation, and optionally live API calls:

```bash
# Schema + validation only (no credentials needed)
npm run build && node test-mcp.mjs

# Against a live Moodle instance
MOODLE_API_URL="https://your-moodle.com/webservice/rest/server.php" \
MOODLE_API_TOKEN="your-token" \
MOODLE_COURSE_ID="4" \
node test-mcp.mjs
```

The integration test checks:
1. All tools register with correct names and required params
2. Param validation throws correct errors for missing fields
3. (With credentials) Read tools return data from the live Moodle instance

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

[MIT](LICENSE) - Based on work by [peancor](https://github.com/peancor/moodle-mcp-server)

## 🙏 Acknowledgments

- Original MCP server by [peancor](https://github.com/peancor/moodle-mcp-server)
- [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic
- [Moodle](https://moodle.org/) LMS community
