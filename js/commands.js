// js/commands.js — Linux command simulator + state

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

const escapeHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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
    print(parts.slice(1).join(' ').replace(/"/g, ''), 'output'); return;
  }

  if (base === 'who') {
    print('USER     TTY      FROM             LOGIN@', 'output');
    print('root     pts/0    192.168.1.10     10:42', 'output');
    Object.keys(users).filter(u => u !== 'root').forEach(u => {
      print(`${u.padEnd(9)}pts/1    192.168.1.11     11:00`, 'output');
    });
    return;
  }

  if (base === 'ls' && parts[1] === '/home') {
    const homes = Object.keys(users).filter(u => u !== 'root');
    print(homes.length ? homes.join('  ') : '(vacío)', 'output');
    return;
  }

  if (base === 'cat' && parts[1] === '/etc/passwd') {
    checkObjective('list');
    print('root:x:0:0:root:/root:/bin/bash', 'output');
    let uid = 1000;
    Object.keys(users).filter(u => u !== 'root').forEach(u => {
      print(`${u}:x:${uid}:${uid}::/home/${u}:/bin/bash`, 'output'); uid++;
    });
    return;
  }

  if (base === 'cat' && parts[1] === '/etc/group') {
    print('root:x:0:root', 'output');
    print('sudo:x:27:' + sudoUsers.join(','), 'output');
    print('users:x:100:' + Object.keys(users).filter(u => u !== 'root').join(','), 'output');
    return;
  }

  if (base === 'useradd') {
    let username;
    if (parts[1] === '-m' && parts[2]) { username = parts[2]; }
    else if (parts[1] && !parts[1].startsWith('-')) { username = parts[1]; }
    else { print('useradd: falta nombre de usuario', 'error'); return; }

    if (!/^[a-z_][a-z0-9_-]*$/.test(username)) {
      print(`useradd: '${username}' nombre de usuario inválido`, 'error'); return;
    }
    if (users[username]) {
      print(`useradd: el usuario '${username}' ya existe`, 'error'); return;
    }
    setUser(username);
    print(`Agregando usuario '${username}'...`, 'output');
    print(`Agregando nuevo grupo '${username}' (1001)`, 'output');
    print(`Creando directorio home '/home/${username}'`, 'output');
    print(`Agregando nuevo usuario '${username}' (1001) con grupo '${username}'`, 'output');
    if (username === 'sysadmin') checkObjective('sysadmin');
    if (username === 'devops')   checkObjective('devops');
    if (username === 'backup')   checkObjective('backup');
    return;
  }

  if (base === 'userdel') {
    const username = parts[1];
    if (!username) { print('userdel: falta nombre de usuario', 'error'); return; }
    if (!users[username]) { print(`userdel: el usuario '${username}' no existe`, 'error'); return; }
    if (username === 'root') { print('userdel: no se puede eliminar el usuario root', 'error'); return; }
    removeUser(username);
    print(`Eliminando usuario '${username}'`, 'output');
    return;
  }

  if (base === 'passwd') {
    const username = parts[1] || 'root';
    if (!users[username]) { print(`passwd: usuario '${username}' no encontrado`, 'error'); return; }
    print(`passwd: contraseña actualizada exitosamente para '${username}'`, 'success');
    return;
  }

  if (base === 'usermod') {
    const gFlag = parts.indexOf('-aG');
    if (gFlag !== -1 && parts[gFlag + 1] && parts[gFlag + 2]) {
      const group = parts[gFlag + 1], username = parts[gFlag + 2];
      if (!users[username]) { print(`usermod: usuario '${username}' no existe`, 'error'); return; }
      if (!userGroups[username]) userGroups[username] = [];
      if (!userGroups[username].includes(group)) userGroups[username].push(group);
      if (group === 'sudo') { addSudoUser(username); checkObjective('sudo'); }
      print(`Agregando '${username}' al grupo '${group}'`, 'success');
      return;
    }
    print('usermod: uso: usermod -aG <grupo> <usuario>', 'error');
    return;
  }

  if (base === 'id') {
    const username = parts[1] || 'root';
    if (!users[username]) { print(`id: '${username}': no such user`, 'error'); return; }
    const uid = username === 'root' ? 0 : 1000 + Object.keys(users).indexOf(username);
    print(`uid=${uid}(${username}) gid=${uid}(${username}) grupos=${(userGroups[username] || [username]).join(',')}`, 'output');
    return;
  }

  if (base === 'groups') {
    const username = parts[1] || 'root';
    if (!users[username]) { print(`groups: '${username}': no such user`, 'error'); return; }
    print(`${username} : ${(userGroups[username] || [username]).join(' ')}`, 'output');
    return;
  }

  if (base === 'sudo')     { print('root no necesita sudo — ya eres superusuario', 'info'); return; }
  if (base === 'exit')     { print('logout', 'output'); setTimeout(() => closeTerminal(), 600); return; }

  print(`bash: ${escapeHtml(base)}: comando no encontrado. Escribe 'help' para ver comandos.`, 'error');
}
