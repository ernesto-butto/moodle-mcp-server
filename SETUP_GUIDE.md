# Moodle MCP Server - Setup Guide for Claude Desktop

> Tested with Moodle 4.5 (Build: 20241007). The "Moodle mobile web service" in Moodle 4.x includes all the API functions this server needs — no custom service required.

## Prerequisites / Requisitos previos

- [Claude Desktop](https://claude.ai/download) installed
- [Node.js](https://nodejs.org/) v18 or higher installed

---

## English

### Step 1: Get your Moodle API Token

1. Log in to your Moodle site as an administrator
2. Go to **Site Administration > Server > Web services > External services**
3. Make sure **"Moodle mobile web service"** is enabled
4. Go to **Site Administration > Server > Web services > Manage tokens**
5. Click **Create token**, select the teacher's user account and the **"Moodle mobile web service"**
6. Copy the generated token — you will need it in the next step

### Step 2: Configure Claude Desktop

1. Open Claude Desktop
2. Go to **Settings** (click the gear icon or use `Ctrl + ,`)
3. Click on **Developer** in the left sidebar
4. Click **Edit Config** — this will open the file `claude_desktop_config.json`
5. Replace the contents (or add to the existing `mcpServers` section) with:

```json
{
  "mcpServers": {
    "moodle": {
      "command": "npx",
      "args": ["-y", "@ernesto-butto/moodle-mcp-server"],
      "env": {
        "MOODLE_API_URL": "https://YOUR-MOODLE-SITE.com/webservice/rest/server.php",
        "MOODLE_API_TOKEN": "YOUR_TOKEN_HERE",
        "MOODLE_COURSE_ID": "YOUR_DEFAULT_COURSE_ID"
      }
    }
  }
}
```

6. Replace the following values:
   - `YOUR-MOODLE-SITE.com` — your Moodle site address (e.g., `school.moodlecloud.com`)
   - `YOUR_TOKEN_HERE` — the API token you copied in Step 1
   - `YOUR_DEFAULT_COURSE_ID` — (optional) the ID of your default course. You can find it in the URL when you visit your course (e.g., `https://moodle.example.com/course/view.php?id=4` — the ID is `4`). If you don't set this, you can specify the course ID each time you use a tool
7. Save the file and **restart Claude Desktop**

### Step 3: Verify it works

After restarting Claude Desktop, you should see a hammer icon (tools) at the bottom of the chat. Click it and you should see the Moodle tools listed:

- **list_courses** — List all your courses
- **get_course_contents** — See the contents of a course
- **get_students** — Get enrolled students
- **get_assignments** — Get assignments
- **get_submissions** — Get student submissions
- **get_quizzes** — Get quizzes
- **get_quiz_grade** — Get a student's quiz grade
- **provide_feedback** — Grade and give feedback on assignments

Try asking Claude: *"List my Moodle courses"*

---

## Español

### Paso 1: Obtener tu Token de API de Moodle

1. Inicia sesion en tu sitio Moodle como administrador
2. Ve a **Administracion del sitio > Servidor > Servicios web > Servicios externos**
3. Asegurate de que el **"Servicio Moodle mobile web service"** este habilitado
4. Ve a **Administracion del sitio > Servidor > Servicios web > Gestionar tokens**
5. Haz clic en **Crear token**, selecciona la cuenta del profesor y el **"Moodle mobile web service"**
6. Copia el token generado — lo necesitaras en el siguiente paso

### Paso 2: Configurar Claude Desktop

1. Abre Claude Desktop
2. Ve a **Settings** (haz clic en el icono de engranaje o usa `Ctrl + ,`)
3. Haz clic en **Developer** en la barra lateral izquierda
4. Haz clic en **Edit Config** — esto abrira el archivo `claude_desktop_config.json`
5. Reemplaza el contenido (o agrega a la seccion `mcpServers` existente) con:

```json
{
  "mcpServers": {
    "moodle": {
      "command": "npx",
      "args": ["-y", "@ernesto-butto/moodle-mcp-server"],
      "env": {
        "MOODLE_API_URL": "https://TU-SITIO-MOODLE.com/webservice/rest/server.php",
        "MOODLE_API_TOKEN": "TU_TOKEN_AQUI",
        "MOODLE_COURSE_ID": "ID_DE_TU_CURSO"
      }
    }
  }
}
```

6. Reemplaza los siguientes valores:
   - `TU-SITIO-MOODLE.com` — la direccion de tu sitio Moodle (ej: `escuela.moodlecloud.com`)
   - `TU_TOKEN_AQUI` — el token de API que copiaste en el Paso 1
   - `ID_DE_TU_CURSO` — (opcional) el ID de tu curso por defecto. Lo puedes encontrar en la URL cuando visitas tu curso (ej: `https://moodle.ejemplo.com/course/view.php?id=4` — el ID es `4`). Si no lo configuras, puedes especificar el ID del curso cada vez que uses una herramienta
7. Guarda el archivo y **reinicia Claude Desktop**

### Paso 3: Verificar que funciona

Despues de reiniciar Claude Desktop, deberias ver un icono de martillo (herramientas) en la parte inferior del chat. Haz clic en el y deberias ver las herramientas de Moodle listadas:

- **list_courses** — Listar todos tus cursos
- **get_course_contents** — Ver el contenido de un curso
- **get_students** — Obtener estudiantes inscritos
- **get_assignments** — Obtener tareas
- **get_submissions** — Obtener entregas de estudiantes
- **get_quizzes** — Obtener cuestionarios
- **get_quiz_grade** — Obtener la calificacion de un estudiante en un cuestionario
- **provide_feedback** — Calificar y dar retroalimentacion en tareas

Prueba preguntandole a Claude: *"Lista mis cursos de Moodle"*
