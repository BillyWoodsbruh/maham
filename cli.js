#!/usr/bin/env node
/**
 * cli.js — Maham To-Do List Manager CLI
 * Interact with your tasks directly from the terminal.
 *
 * Usage:
 *   node cli.js help
 *   node cli.js register
 *   node cli.js login
 *   node cli.js list
 *   node cli.js add "Task title here"
 *   node cli.js done <task-id>
 *   node cli.js delete <task-id>
 *   node cli.js logout
 *
 * Requires the backend server to be running at http://localhost:3000
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = 'http://localhost:3000';
const TOKEN_FILE = path.join(__dirname, '.cli-session');

// ── Colors ───────────────────────────────────────────────────────────────────

const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  purple: '\x1b[35m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  white:  '\x1b[37m',
};

const fmt = {
  brand:   (s) => `${c.bold}${c.purple}${s}${c.reset}`,
  success: (s) => `${c.green}✓${c.reset} ${s}`,
  error:   (s) => `${c.red}✗${c.reset} ${s}`,
  info:    (s) => `${c.cyan}→${c.reset} ${s}`,
  dim:     (s) => `${c.dim}${s}${c.reset}`,
  bold:    (s) => `${c.bold}${s}${c.reset}`,
  done:    (s) => `${c.dim}${s}${c.reset}`,
};

// ── Session helpers ──────────────────────────────────────────────────────────

function saveToken(token) {
  fs.writeFileSync(TOKEN_FILE, token, 'utf8');
}

function loadToken() {
  if (!fs.existsSync(TOKEN_FILE)) return null;
  return fs.readFileSync(TOKEN_FILE, 'utf8').trim();
}

function clearToken() {
  if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE);
}

// ── HTTP helper ──────────────────────────────────────────────────────────────

function apiRequest(method, endpoint, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${endpoint}`);
    const payload = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        reject(new Error('Cannot connect to server. Is it running? (npm start in backend/)'));
      } else {
        reject(err);
      }
    });

    if (payload) req.write(payload);
    req.end();
  });
}

// ── Prompt helper ────────────────────────────────────────────────────────────

function prompt(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    if (hidden) {
      process.stdout.write(question);
      process.stdin.setRawMode(true);
      let input = '';
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', function handler(char) {
        if (char === '\n' || char === '\r' || char === '\u0004') {
          process.stdin.setRawMode(false);
          process.stdin.removeListener('data', handler);
          process.stdout.write('\n');
          rl.close();
          resolve(input);
        } else if (char === '\u0003') {
          process.exit();
        } else if (char === '\u007f') {
          input = input.slice(0, -1);
        } else {
          input += char;
        }
      });
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

// ── Commands ─────────────────────────────────────────────────────────────────

async function cmdHelp() {
  console.log(`
${fmt.brand('✦ Maham CLI')} — To-Do List Manager
${'─'.repeat(42)}

  ${fmt.bold('node cli.js register')}        Create a new account
  ${fmt.bold('node cli.js login')}           Log in to your account
  ${fmt.bold('node cli.js logout')}          Clear your session
  ${fmt.bold('node cli.js list')}            Show all your tasks
  ${fmt.bold('node cli.js add "<title>"')}   Add a new task
  ${fmt.bold('node cli.js done <id>')}       Mark a task as complete
  ${fmt.bold('node cli.js undone <id>')}     Mark a task as incomplete
  ${fmt.bold('node cli.js delete <id>')}     Delete a task
  ${fmt.bold('node cli.js help')}            Show this help

${'─'.repeat(42)}
${fmt.dim(`Server: ${BASE_URL}`)}
`);
}

async function cmdRegister() {
  console.log(`\n${fmt.brand('✦ Create Account')}\n`);
  const username = await prompt('  Username : ');
  const email    = await prompt('  Email    : ');
  const password = await prompt('  Password : ', true);

  const { status, body } = await apiRequest('POST', '/api/auth/register', { username, email, password });

  if (status === 201) {
    saveToken(body.token);
    console.log(fmt.success(`Registered and logged in as ${fmt.bold(body.user.username)}`));
  } else {
    console.log(fmt.error(body.error || 'Registration failed'));
  }
}

async function cmdLogin() {
  console.log(`\n${fmt.brand('✦ Log In')}\n`);
  const email    = await prompt('  Email    : ');
  const password = await prompt('  Password : ', true);

  const { status, body } = await apiRequest('POST', '/api/auth/login', { email, password });

  if (status === 200) {
    saveToken(body.token);
    console.log(fmt.success(`Logged in as ${fmt.bold(body.user.username)}`));
  } else {
    console.log(fmt.error(body.error || 'Login failed'));
  }
}

async function cmdLogout() {
  clearToken();
  console.log(fmt.success('Logged out. Session cleared.'));
}

async function cmdList() {
  const token = loadToken();
  if (!token) return console.log(fmt.error('Not logged in. Run: node cli.js login'));

  const { status, body } = await apiRequest('GET', '/api/tasks', null, token);

  if (status === 401) return console.log(fmt.error('Session expired. Please log in again.'));
  if (status !== 200) return console.log(fmt.error(body.error || 'Failed to fetch tasks'));

  const tasks = body;
  const done  = tasks.filter((t) => t.completed);
  const todo  = tasks.filter((t) => !t.completed);

  console.log(`\n${fmt.brand('✦ Your Tasks')}  ${fmt.dim(`(${done.length}/${tasks.length} done)`)}\n`);

  if (tasks.length === 0) {
    console.log(`  ${fmt.dim('No tasks yet. Add one with: node cli.js add "Task title"')}\n`);
    return;
  }

  if (todo.length > 0) {
    console.log(`  ${fmt.bold('Pending')}`);
    todo.forEach((t) => {
      console.log(`  ${fmt.dim(`[${t.id}]`)} ${c.white}${t.title}${c.reset}`);
    });
    console.log();
  }

  if (done.length > 0) {
    console.log(`  ${fmt.bold('Completed')}`);
    done.forEach((t) => {
      console.log(`  ${fmt.dim(`[${t.id}]`)} ${fmt.done(t.title)} ${c.green}✓${c.reset}`);
    });
    console.log();
  }
}

async function cmdAdd(title) {
  if (!title) return console.log(fmt.error('Usage: node cli.js add "Task title"'));
  const token = loadToken();
  if (!token) return console.log(fmt.error('Not logged in. Run: node cli.js login'));

  const { status, body } = await apiRequest('POST', '/api/tasks', { title }, token);

  if (status === 201) {
    console.log(fmt.success(`Task added ${fmt.dim(`[id: ${body.id}]`)}: ${body.title}`));
  } else if (status === 401) {
    console.log(fmt.error('Session expired. Please log in again.'));
  } else {
    console.log(fmt.error(body.error || 'Failed to add task'));
  }
}

async function cmdDone(id, completed = true) {
  if (!id) return console.log(fmt.error(`Usage: node cli.js ${completed ? 'done' : 'undone'} <task-id>`));
  const token = loadToken();
  if (!token) return console.log(fmt.error('Not logged in. Run: node cli.js login'));

  const { status, body } = await apiRequest('PUT', `/api/tasks/${id}`, { completed }, token);

  if (status === 200) {
    const state = completed ? `${c.green}complete${c.reset}` : `${c.yellow}incomplete${c.reset}`;
    console.log(fmt.success(`Task [${id}] marked as ${state}: ${body.title}`));
  } else if (status === 404) {
    console.log(fmt.error(`Task [${id}] not found`));
  } else if (status === 401) {
    console.log(fmt.error('Session expired. Please log in again.'));
  } else {
    console.log(fmt.error(body.error || 'Failed to update task'));
  }
}

async function cmdDelete(id) {
  if (!id) return console.log(fmt.error('Usage: node cli.js delete <task-id>'));
  const token = loadToken();
  if (!token) return console.log(fmt.error('Not logged in. Run: node cli.js login'));

  const { status, body } = await apiRequest('DELETE', `/api/tasks/${id}`, null, token);

  if (status === 200) {
    console.log(fmt.success(`Task [${id}] deleted`));
  } else if (status === 404) {
    console.log(fmt.error(`Task [${id}] not found`));
  } else if (status === 401) {
    console.log(fmt.error('Session expired. Please log in again.'));
  } else {
    console.log(fmt.error(body.error || 'Failed to delete task'));
  }
}

// ── Router ───────────────────────────────────────────────────────────────────

async function main() {
  const [,, command, ...args] = process.argv;

  try {
    switch (command) {
      case 'register': await cmdRegister();           break;
      case 'login':    await cmdLogin();              break;
      case 'logout':   await cmdLogout();             break;
      case 'list':     await cmdList();               break;
      case 'add':      await cmdAdd(args.join(' '));  break;
      case 'done':     await cmdDone(args[0], true);  break;
      case 'undone':   await cmdDone(args[0], false); break;
      case 'delete':   await cmdDelete(args[0]);      break;
      case 'help':
      default:         await cmdHelp();               break;
    }
  } catch (err) {
    console.log(fmt.error(err.message));
    process.exit(1);
  }
}

main();
