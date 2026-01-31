# Moodle MCP Server (Multi-Course Edition)

[![MCP](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io/)
[![Node.js](https://img.shields.io/badge/Node.js-v14+-green)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An enhanced [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that enables AI assistants like Claude to interact with Moodle LMS. **This fork adds multi-course support**, allowing you to manage multiple courses from a single MCP server.

> 🍴 This is an enhanced fork of [peancor/moodle-mcp-server](https://github.com/peancor/moodle-mcp-server) with significant improvements.

## ✨ What's New in This Fork

| Feature | Original | This Fork |
|---------|----------|-----------|
| Multi-course support | ❌ Single course only | ✅ Dynamic `courseId` parameter |
| List all courses | ❌ Not available | ✅ `list_courses` tool |
| View course contents | ❌ Not available | ✅ `get_course_contents` tool |
| Admin/Teacher access | ❌ Enrollment-based only | ✅ Works with capability-based access |

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

### Multi-Course Support

All course-specific tools accept an optional `courseId` parameter:

```
"List students in course 5"     → get_students(courseId=5)
"Show assignments"              → get_assignments() // uses default
"Quizzes in course 10"          → get_quizzes(courseId=10)
```

If no `courseId` is provided, the default from `MOODLE_COURSE_ID` environment variable is used.

## 📋 Requirements

- **Node.js** v14 or higher
- **Moodle API token** with appropriate permissions
- **Moodle** instance with web services enabled

## 🚀 Installation

### 1. Clone this repository

```bash
git clone https://github.com/ernesto-butto/moodle-mcp-server.git
cd moodle-mcp-server
```

### 2. Install dependencies

```bash
npm install
```

### 3. Build the server

```bash
npm run build
```

## ⚙️ Configuration

### For Claude Code (Linux/WSL)

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "moodle": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/moodle-mcp-server/build/index.js"],
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

### For Claude Desktop (Windows)

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "moodle": {
      "command": "node",
      "args": ["C:\\Users\\YourName\\moodle-mcp-server\\build\\index.js"],
      "env": {
        "MOODLE_API_URL": "https://your-moodle.com/webservice/rest/server.php",
        "MOODLE_API_TOKEN": "your_token_here",
        "MOODLE_COURSE_ID": "4"
      }
    }
  }
}
```

### For Claude Desktop (macOS)

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "moodle": {
      "command": "node",
      "args": ["/Users/YourName/moodle-mcp-server/build/index.js"],
      "env": {
        "MOODLE_API_URL": "https://your-moodle.com/webservice/rest/server.php",
        "MOODLE_API_TOKEN": "your_token_here",
        "MOODLE_COURSE_ID": "4"
      }
    }
  }
}
```

## 🔑 Getting a Moodle API Token

### Option 1: Use Mobile Web Service (Easiest)

1. Log in to Moodle as admin
2. Go to **Site Administration → Server → Web services → External services**
3. Ensure **"Moodle mobile web service"** is enabled
4. Go to **Site Administration → Server → Web services → Manage tokens**
5. Click **Create token**, select your user and the mobile web service
6. Copy the token

### Option 2: Create Custom Service (More Control)

1. Go to **Site Administration → Server → Web services → External services**
2. Click **Add** under Custom services
3. Add these functions:
   - `core_course_get_courses`
   - `core_course_get_contents`
   - `core_enrol_get_enrolled_users`
   - `mod_assign_get_assignments`
   - `mod_assign_get_submissions`
   - `mod_assign_save_grade`
   - `mod_quiz_get_quizzes_by_courses`
   - `mod_quiz_get_user_best_grade`
4. Create a token for this service

### Finding Your Course ID

Navigate to your course in Moodle and look at the URL:
```
https://your-moodle.com/course/view.php?id=4
                                          ↑
                                    Course ID
```

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

## 💡 Example Usage

Once configured, you can ask Claude:

- *"List all my Moodle courses"*
- *"Show me the students in course 5"*
- *"What assignments are in Unidad 3?"*
- *"Get the course contents for course 10"*
- *"Show quiz grades for student 42 in quiz 15"*

## 🔒 Security Best Practices

1. **Never commit tokens** - Use environment variables
2. **Use dedicated accounts** - Create a Moodle user for API access
3. **Minimal permissions** - Only enable required web service functions
4. **Rotate tokens** - Regenerate tokens periodically
5. **Set expiration** - Use token expiration dates in Moodle

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

[MIT](LICENSE) - Based on work by [peancor](https://github.com/peancor/moodle-mcp-server)

## 🙏 Acknowledgments

- Original MCP server by [peancor](https://github.com/peancor/moodle-mcp-server)
- [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic
- [Moodle](https://moodle.org/) LMS community
