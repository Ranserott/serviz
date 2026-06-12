// tests/commands.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getUsers, getSudoUsers, setUser, removeUser, addSudoUser, resetState } from '../js/commands.js';

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
