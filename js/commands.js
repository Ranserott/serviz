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
  ls -la <dir>                Ver archivos ocultos
  clear                       Limpiar terminal
  help                        Mostrar esta ayuda

Redes: ifconfig, ping <host>, route -n, echo ... >> /etc/hosts
Procesos: ps aux, systemctl list-units, kill <pid>, top -b -n 1
Disco: df -h, du -sh <dir>, mkdir <path>, mount
Seguridad: chmod <modo> <file>, chown <user>:<grp> <file>, tail -20 <file>`;

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

  // ===== LEVEL 4: Redes y Conectividad =====
  if (base === 'ifconfig') {
    checkObjective('ifconfig');
    print('eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500', 'output');
    print('        inet 192.168.1.10  netmask 255.255.255.0  broadcast 192.168.1.255', 'output');
    print('        inet6 fe80::a00:27ff:fe8e:8aa8  prefixlen 64  scopeid 0x20<link>', 'output');
    print('        ether 08:00:27:8e:8a:a8  txqueuelen 1000  (Ethernet)', 'output');
    print('        RX packets 12345  bytes 1234567 (1.2 MB)', 'output');
    print('        TX packets 9876  bytes 876543 (876.5 KB)', 'output');
    print('lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536', 'output');
    print('        inet 127.0.0.1  netmask 255.0.0.0', 'output');
    print('        inet6 ::1  prefixlen 128  scopeid 0x10<host>', 'output');
    return;
  }

  if (base === 'ping') {
    const host = parts[1] || 'localhost';
    checkObjective('ping');
    print(`PING ${sanitize(host)} (8.8.8.8) 56(84) bytes of data.`, 'output');
    print(`64 bytes from ${sanitize(host)}: icmp_seq=1 ttl=118 time=12.3 ms`, 'output');
    print(`64 bytes from ${sanitize(host)}: icmp_seq=2 ttl=118 time=11.8 ms`, 'output');
    print(`--- ${sanitize(host)} ping statistics ---`, 'output');
    print('2 packets transmitted, 2 received, 0% packet loss', 'output');
    return;
  }

  if (base === 'route') {
    checkObjective('route');
    print('Tabla de rutas IP del núcleo', 'output');
    print('Destino         Pasarela         Genmask         Indic Metric Ref    Uso Interfaz', 'output');
    print('0.0.0.0         192.168.1.1     0.0.0.0         UG    100    0        0 eth0', 'output');
    print('192.168.1.0     0.0.0.0         255.255.255.0   U      100    0        0 eth0', 'output');
    print('192.168.122.0  0.0.0.0         255.255.255.0   U      0      0        0 virbr0', 'output');
    return;
  }

  if (base === 'echo' && cmd.includes('>> /etc/hosts')) {
    checkObjective('hosts');
    print('192.168.1.100 app.local', 'output');
    print('/etc/hosts actualizado', 'success');
    return;
  }

  // ===== LEVEL 5: Procesos y Servicios =====
  if (base === 'ps') {
    checkObjective('ps');
    print('USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND', 'output');
    print('root           1  0.0  0.1   1234   456 ?        Ss   10:00   0:05 /sbin/init', 'output');
    print('root         234  0.1  0.2   5678   890 ?        Ss   10:00   0:02 /lib/systemd/systemd', 'output');
    print('root         456  0.0  0.1   2345   678 ?        Ss   10:00   0:01 /usr/sbin/sshd -D', 'output');
    print('root         789  0.2  0.5   9876  1234 ?        Ss   10:01   0:03 nginx: master process', 'output');
    print('www-data    1011  0.1  0.3   7654   987 ?        S    10:01   0:01 nginx: worker process', 'output');
    print('postgres    1234  0.3  0.8  12345  2345 ?       Ss   10:02   0:05 /usr/postgresql/bin/postgres', 'output');
    print('root        1567  0.0  0.1   3456   789 pts/0    Ss   11:00   0:00 -bash', 'output');
    print('root        1580  0.0  0.0   2345   123 pts/0    R+   11:42   0:00 ps aux', 'output');
    return;
  }

  if (base === 'systemctl') {
    checkObjective('systemctl');
    if (cmd.includes('list-units')) {
      print('UNIT                  LOAD   ACTIVE SUB     DESCRIPTION', 'output');
      print('ssh.service           loaded active running OpenBSD Secure Shell server', 'output');
      print('nginx.service         loaded active running The NGINX HTTP and reverse proxy server', 'output');
      print('postgresql.service     loaded active running PostgreSQL database server', 'output');
      print('cron.service          loaded active running Regular background program processing', 'output');
      print('systemd-journald.s... loaded active running Journal Service', 'output');
      print('systemd-logind.service loaded active running Login Service', 'output');
      print('LOAD   = Reflects whether the unit definition was properly loaded.', 'output');
      print('ACTIVE = The high-level unit activation state, i.e. generalization of SUB.', 'output');
      print('SUB    = The low-level unit activation state, values depend on unit type.', 'output');
      return;
    }
    print('systemctl: uso: systemctl <start|stop|restart|status> <servicio>', 'error');
    return;
  }

  if (base === 'kill') {
    checkObjective('kill');
    const pid = parts[2] || parts[1];
    print(`Signal SIGTERM(15) enviado al proceso ${sanitize(pid || '?')}`, 'output');
    print(`Proceso ${sanitize(pid || '?')} terminado`, 'success');
    return;
  }

  if (base === 'top') {
    checkObjective('top');
    print('top - 11:42:00 up 7 days,  3:14,  1 user,  load average: 0.08, 0.12, 0.10', 'output');
    print('Tasks: 124 total,   1 running, 123 sleeping,   0 stopped,   0 zombie', 'output');
    print('Cpu(s):  2.3%us,  1.2%sy,  0.0%ni, 96.5%id,  0.0%wa,  0.0%hi,  0.0%si,  0.0%st', 'output');
    print('Mem:   total,  used,  free,  shared buff/cache   available', 'output');
    print('Swap:  total,  used,  free', 'output');
    print('  PID USER      PR  NI %CPU %MEM     TIME+ COMMAND', 'output');
    print(' 1234 postgres   20   0  0.3  0.8  0:05.23 /usr/postgresql/bin/postgres', 'output');
    print('  789 nginx      20   0  0.2  0.5  0:03.12 nginx: worker process', 'output');
    print('    1 root      20   0  0.0  0.1  0:05.12 /sbin/init', 'output');
    return;
  }

  // ===== LEVEL 6: Almacenamiento y Disco =====
  if (base === 'df') {
    checkObjective('df');
    print('S.ficheros     Tipo  Tamaño  Usados  Disp Uso% Montado en', 'output');
    print('/dev/sda1      ext4   20G   4.2G   15G  22% /', 'output');
    print('/dev/sdb1      ext4  100G    45G   55G  45% /var/lib/postgresql', 'output');
    print('/dev/sdc1      ext4  500G   120G  380G  24% /mnt/backup', 'output');
    print('tmpfs          tmpfs 1.9G   1.2M   1.9G   1% /dev/shm', 'output');
    print('/dev/mapper/crypt tmpfs  1.0G   256M   768M  25% /boot/efi', 'output');
    return;
  }

  if (base === 'du') {
    checkObjective('du');
    print('4.0K	/var/log/apt', 'output');
    print('16K	/var/log/nginx', 'output');
    print('48K	/var/log/postgresql', 'output');
    print('8.0K	/var/log/cron', 'output');
    print('120K	/var/log', 'output');
    return;
  }

  if (base === 'mkdir') {
    const path = parts.find(p => !p.startsWith('-'));
    if (!path) { print('mkdir: falta operando', 'error'); return; }
    checkObjective('mkdir');
    print(`mkdir: created directory '${sanitize(path)}'`, 'success');
    return;
  }

  if (base === 'mount') {
    checkObjective('mount');
    print('/dev/sda1 on / type ext4 (rw,relatime,errors=remount-ro)', 'output');
    print('/dev/sdb1 on /var/lib/postgresql type ext4 (rw,relatime)', 'output');
    print('/dev/sdc1 on /mnt/backup type ext4 (rw,relatime)', 'output');
    print('tmpfs on /dev/shm type tmpfs (rw,nosuid,nodev)', 'output');
    print('tmpfs on /run type tmpfs (rw,nosuid,nodev,size=1.9G)', 'output');
    print('tmpfs on /run/lock type tmpfs (rw,nosuid,nodev,noexec)', 'output');
    print('sysfs on /sys type sysfs (rw,nosuid,nodev,noexec)', 'output');
    print('proc on /proc type proc (rw,nosuid,nodev,noexec)', 'output');
    return;
  }

  // ===== LEVEL 7: Seguridad y Permisos =====
  if (base === 'chmod') {
    const mode = parts[1];
    const target = parts[2];
    if (!mode || !target) { print('chmod: uso: chmod <modo> <archivo>', 'error'); return; }
    checkObjective('chmod');
    print(`Cambiados permisos de '${sanitize(target)}' a ${sanitize(mode)}`, 'success');
    return;
  }

  if (base === 'chown') {
    const owner = parts[1];
    const target = parts[2];
    if (!owner || !target) { print('chown: uso: chown <usuario>:<grupo> <archivo>', 'error'); return; }
    checkObjective('chown');
    print(`Cambiado dueño de '${sanitize(target)}' a '${sanitize(owner)}'`, 'success');
    return;
  }

  if (base === 'ls' && parts.includes('-la')) {
    checkObjective('lsla');
    print('total 48', 'output');
    print('drwx------  5 root root 4096 Jun 12 10:00 .', 'output');
    print('drwxr-xr-x  5 root root 4096 Jun 12 10:00 ..', 'output');
    print('-rw-------  1 root root  220 Jun 12 10:00 .bash_history', 'output');
    print('-rw-r--r--  1 root root 3106 Jun 12 10:00 .bashrc', 'output');
    print('-rw-r--r--  1 root root  148 Jun 12 10:00 .profile', 'output');
    print('-rw-------  1 root root  807 Jun 12 10:00 .ssh/authorized_keys', 'output');
    print('drwxr-xr-x  2 root root 4096 Jun 12 10:00 scripts/', 'output');
    return;
  }

  if (base === 'tail') {
    checkObjective('logs');
    print('Jun 12 10:42:01 server-01 systemd[1]: Started Session 5 of user root.', 'output');
    print('Jun 12 10:42:02 server-01 sshd[2345]: Accepted publickey for root from 192.168.1.10', 'output');
    print('Jun 12 10:43:15 server-01 nginx[789]: 192.168.1.20 - - [12/Jun/2026:10:43:15 +0000] "GET /api/status HTTP/1.1" 200 123', 'output');
    print('Jun 12 10:44:00 server-01 CRON[3456]: (root) CMD (/usr/local/bin/backup.sh)', 'output');
    print('Jun 12 10:45:01 server-01 systemd[1]: Starting Daily apt download activities...', 'output');
    print('Jun 12 10:45:02 server-01 apt[4567]: Downloading packages...', 'output');
    print('Jun 12 10:45:10 server-01 systemd[1]: Started Daily apt download activities.', 'output');
    print('Jun 12 10:46:22 server-01 postgres[1234]: LOG:  database system is ready to accept connections', 'output');
    return;
  }

  print(`bash: ${sanitize(base)}: comando no encontrado. Escribe 'help' para ver comandos.`, 'error');
}
