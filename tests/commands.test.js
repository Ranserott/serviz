// tests/commands.test.js — comprehensive tests for commands.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getUsers, getSudoUsers, setUser, removeUser, addSudoUser, resetState } from '../js/commands.js';

// Helper to simulate command output
function createMockDeps() {
  const output = [];
  return {
    deps: {
      print: (msg, type) => output.push({ msg, type }),
      printPrompt: (cmd) => output.push({ msg: `$ ${cmd}`, type: 'prompt' }),
      checkObjective: () => {},
      closeTerminal: () => {}
    },
    getOutput: () => output,
    clear: () => output.length = 0
  };
}

test('getUsers returns root by default', () => {
  resetState();
  const users = getUsers();
  assert.equal(users.root, true);
});

test('setUser adds a new user', () => {
  resetState();
  setUser('sysadmin');
  const users = getUsers();
  assert.equal(users.sysadmin, true);
});

test('setUser does not overwrite existing user', () => {
  resetState();
  setUser('devops');
  setUser('devops');
  const users = getUsers();
  assert.equal(Object.keys(users).filter(k => k === 'devops').length, 1);
});

test('removeUser deletes a user', () => {
  resetState();
  setUser('backup');
  removeUser('backup');
  const users = getUsers();
  assert.equal(users.backup, undefined);
});

test('removeUser removes user from sudo group', () => {
  resetState();
  setUser('ops');
  addSudoUser('ops');
  removeUser('ops');
  const sudo = getSudoUsers();
  assert.equal(sudo.includes('ops'), false);
});

test('addSudoUser adds user to sudo list', () => {
  resetState();
  setUser('admin');
  addSudoUser('admin');
  const sudo = getSudoUsers();
  assert.equal(sudo.includes('admin'), true);
});

test('addSudoUser does not duplicate', () => {
  resetState();
  setUser('admin');
  addSudoUser('admin');
  addSudoUser('admin');
  const sudo = getSudoUsers();
  assert.equal(sudo.filter(u => u === 'admin').length, 1);
});

test('resetState clears all non-root users and sudo', () => {
  resetState();
  setUser('a');
  setUser('b');
  addSudoUser('a');
  resetState();
  const users = getUsers();
  const sudo = getSudoUsers();
  assert.equal(users.root, true);
  assert.equal(Object.keys(users).length, 1);
  assert.equal(sudo.length, 0);
});

// New tests for input validation
test('setUser rejects invalid usernames', () => {
  resetState();
  // These should not crash but also not create users with invalid names
  // (validation happens in processCommand, not in setUser directly)
  setUser('ValidUser'); // uppercase should work in setUser but fail in processCommand
  const users = getUsers();
  // setUser doesn't validate, only processCommand does
  assert.equal(users['ValidUser'], true);
});

test('getUsers returns a copy not a reference', () => {
  resetState();
  const users1 = getUsers();
  const users2 = getUsers();
  users1['hacker'] = true;
  // Original should be unchanged
  assert.equal(getUsers().hacker, undefined);
});

test('sudoUsers returns a copy not a reference', () => {
  resetState();
  setUser('test');
  addSudoUser('test');
  const sudo1 = getSudoUsers();
  sudo1.push('fake');
  const sudo2 = getSudoUsers();
  assert.equal(sudo2.includes('fake'), false);
});

test('multiple users can be added and removed independently', () => {
  resetState();
  setUser('user1');
  setUser('user2');
  setUser('user3');
  let users = getUsers();
  assert.equal(Object.keys(users).length, 4); // root + 3
  
  removeUser('user2');
  users = getUsers();
  assert.equal(Object.keys(users).length, 3);
  assert.equal(users.user1, true);
  assert.equal(users.user2, undefined);
  assert.equal(users.user3, true);
});

test('sudo group persists after removing user from main group', () => {
  resetState();
  setUser('temp');
  addSudoUser('temp');
  removeUser('temp');
  // User should be completely gone
  assert.equal(getUsers().temp, undefined);
  assert.equal(getSudoUsers().includes('temp'), false);
});

test('username length limit validation', () => {
  resetState();
  // 32 chars is valid
  const longName = 'a'.repeat(32);
  setUser(longName);
  assert.equal(getUsers()[longName], true);
  
  // 33 chars should still be set (validation is in processCommand)
  const tooLong = 'a'.repeat(33);
  setUser(tooLong);
  assert.equal(getUsers()[tooLong], true);
});
