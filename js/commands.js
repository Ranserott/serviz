// js/commands.js — Linux command simulator + state
// With XSS protection and input validation

let users = { root: true };
let userGroups = { root: ['root', 'sudo'] };
let sudoUsers = [];
let commandHistory = [];
let historyIndex = -1;

export function getUsers() { return { ...users }; }
export function getSudoUsers() { return [...sudoUsers]; }

export function setUser(name) {
  users[name] = true;
  if (!userGroups[name]) userGroups[name] = [name];
}

export function removeUser(name) {
  delete users[name];
  delete userGroups[name];
  sudoUsers = sudoUsers.filter(u => u !== name);
}

export function addSudoUser(name) {
  if (!sudoUsers.includes(name)) sudoUsers.push(name);
}

export function resetState() {
  users = { root: true };
  userGroups = { root: ['root', 'sudo'] };
  sudoUsers = [];
  commandHistory = [];
  historyIndex = -1;
}

// Sanitize all user input to prevent XSS
const sanitize = s => String(s)
  .replace(/&/g, '&')
  .replace(/</g, '<')
  .replace(/>/g, '>')
  .replace(/"/g, '"')
  .replace(/'/g, '&#39;');

// Validate username format (Linux username rules)
const isValidUsername = u => /^[a-z_][a-z0-9_-]*$/.test(u) && u.length <= 32;

const helpText = `Comandos disponibles:
  useradd <usuario>           Crear nuevo usuario
  useradd -m <usuario>        Crear usuario con directorio home
  userdel <usuario>           Eliminar usuario
  passwd <usuario>            Cambiar contraseña
  usermod -aG sudo <usuario>  Agregar usuario al grupo sudo
  usermod -aG <grupo> <user>  Agregar usuario a grupo
  cat /etc/passwd             Ver todos los usuarios
  cat /etc/group              Ver grupos
  id <usuario>                Ver info de usuario
  groups <usuario>            Ver grupos de usuario
  who                         Ver usuarios conectados
  whoami                      Usuario actual
  ls /home                    Ver directorios home
  clear                       Limpiar terminal
  help                        Mostrar esta ayuda`;

export function processCommand(raw, deps) {
  const { print, printPrompt, checkObjective, closeTerminal } = deps;
  const cmd = raw.trim();
  if (!cmd) return;
  commandHistory.unshift(cmd);
  historyIndex = -1;
  printPrompt(cmd);

  const parts = cmd.split(/\s+/);
  const base = parts[0];

  if (base === 'clear')  { document.getElementById('terminal-body').innerHTML = ''; return; }
  if (base === 'help')   { print(helpText, 'info'); return; }
  if (base === 'whoami') { print('root', 'output'); return; }
  if (base === 'pwd')    { print('/root', 'output'); return; }
  if (base === 'hostname') { print('server-01', 'output'); return; }

  if (base === 'uname') {
    print(parts.includes('-a')
      ? 'Linux server-01 5.15.0-91-generic #101-Ubuntu SMP x86_64 GNU/Linux'
      : 'Linux', 'output');
    return;
  }

  if (base === 'uptime') {
    print(' 11:42:00 up 7 days, 3:14,  1 user,  load average: 0.08, 0.12, 0.10', 'output');
    return;
  }

  if (base === 'echo') {
    print(sanitize(parts.slice(1).join(' ').replace(/"/g, '')), 'output'); return;
  }

  if (base === 'who') {
    print('USER     TTY      FROM             LOGIN@', 'output');
    print('root     pts/0    192.168.1.10     10:42', 'output');
    Object.keys(users).filter(u => u !== 'root').forEach(u => {
      print(`${sanitize(u).padEnd(9)}pts/1    192.168.1.11     11:00`, 'output');
    });
    return;
  }

  if (base === 'ls' && parts[1] === '/home') {
    const homes = Object.keys(users).filter(u => u !== 'root');
    print(homes.length ? homes.map(sanitize).join('  ') : '(vacío)', 'output');
    return;
  }

  if (base === 'cat' && parts[1] === '/etc/passwd') {
    checkObjective('list');
    print('root:x:0:0:root:/root:/bin/bash', 'output');
    let uid = 1000;
    Object.keys(users).filter(u => u !== 'root').forEach(u => {
      print(`${sanitize(u)}:x:${uid}:${uid}::/home/${sanitize(u)}:/bin/bash`, 'output'); uid++;
    });
    return;
  }

  if (base === 'cat' && parts[1] === '/etc/group') {
    print('root:x:0:root', 'output');
    print('sudo:x:27:' + sudoUsers.map(sanitize).join(','), 'output');
    print('users:x:100:' + Object.keys(users).filter(u => u !== 'root').map(sanitize).join(','), 'output');
    return;
  }

  if (base === 'useradd') {
    let username;
    if (parts[1] === '-m' && parts[2]) { username = parts[2]; }
    else if (parts[1] && !parts[1].startsWith('-')) { username = parts[1]; }
    else { print('useradd: falta nombre de usuario', 'error'); return; }

    if (!isValidUsername(username)) {
      print(`useradd: '${sanitize(username)}' nombre de usuario inválido (solo letras minúsculas, números, _ y -)`, 'error'); return;
    }
    if (users[username]) {
      print(`useradd: el usuario '${sanitize(username)}' ya existe`, 'error'); return;
    }
    setUser(username);
    print(`Agregando usuario '${sanitize(username)}'...`, 'output');
    print(`Agregando nuevo grupo '${sanitize(username)}' (1001)`, 'output');
    print(`Creando directorio home '/home/${sanitize(username)}'`, 'output');
    print(`Agregando nuevo usuario '${sanitize(username)}' (1001) con grupo '${sanitize(username)}'`, 'output');
    if (username === 'sysadmin') checkObjective('sysadmin');
    return;
  }

  if (base === 'userdel') {
    const username = parts[1];
    if (!username) { print('userdel: falta nombre de usuario', 'error'); return; }
    if (!users[username]) { print(`userdel: el usuario '${sanitize(username)}' no existe`, 'error'); return; }
    if (username === 'root') { print('userdel: no se puede eliminar el usuario root', 'error'); return; }
    removeUser(username);
    print(`Eliminando usuario '${sanitize(username)}'`, 'output');
    return;
  }

  if (base === 'passwd') {
    const username = parts[1] || 'root';
    if (!users[username]) { print(`passwd: usuario '${sanitize(username)}' no encontrado`, 'error'); return; }
    print(`passwd: contraseña actualizada exitosamente para '${sanitize(username)}'`, 'success');
    return;
  }

  if (base === 'usermod') {
    const gFlag = parts.indexOf('-aG');
    if (gFlag !== -1 && parts[gFlag + 1] && parts[gFlag + 2]) {
      const group = parts[gFlag + 1], username = parts[gFlag + 2];
      if (!users[username]) { print(`usermod: usuario '${sanitize(username)}' no existe`, 'error'); return; }
      if (!userGroups[username]) userGroups[username] = [];
      if (!userGroups[username].includes(group)) userGroups[username].push(group);
      if (group === 'sudo') {
        addSudoUser(username);
        if (username === 'devops') checkObjective('devops');
        if (username === 'backup') checkObjective('backup');
      }
      print(`Agregando '${sanitize(username)}' al grupo '${sanitize(group)}'`, 'success');
      return;
    }
    print('usermod: uso: usermod -aG <grupo> <usuario>', 'error');
    return;
  }

  if (base === 'id') {
    const username = parts[1] || 'root';
    if (!users[username]) { print(`id: '${sanitize(username)}': no such user`, 'error'); return; }
    const uid = username === 'root' ? 0 : 1000 + Object.keys(users).indexOf(username);
    print(`uid=${uid}(${sanitize(username)}) gid=${uid}(${sanitize(username)}) grupos=${(userGroups[username] || [username]).join(',')}`, 'output');
    return;
  }

  if (base === 'groups') {
    const username = parts[1] || 'root';
    if (!users[username]) { print(`groups: '${sanitize(username)}': no such user`, 'error'); return; }
    print(`${sanitize(username)} : ${(userGroups[username] || [username]).join(' ')}`, 'output');
    return;
  }

  if (base === 'sudo')     { print('root no necesita sudo — ya eres superusuario', 'info'); return; }
  if (base === 'exit')     { print('logout', 'output'); setTimeout(() => closeTerminal(), 600); return; }

  print(`bash: ${sanitize(base)}: comando no encontrado. Escribe 'help' para ver comandos.`, 'error');
}
