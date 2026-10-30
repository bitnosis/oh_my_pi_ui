import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bundledAppearance, defaultRobotIndex, fantasyIndexFromIcon, robotIndex, robotIndexFromIcon, robotPosition, spriteChoice} from '../src/lib/robots.js';

test('a saved robot icon wins, otherwise the name picks a stable sprite', () => {
  assert.equal(robotIndexFromIcon('robot-23'), 23);
  assert.equal(robotIndexFromIcon('robot-24'), null);
  assert.equal(robotIndex('scout', 'robot-3'), 3);
  assert.equal(robotIndex('scout', ''), defaultRobotIndex('scout'));
  assert.equal(defaultRobotIndex('scout'), defaultRobotIndex('scout'));
  assert.deepEqual(robotPosition(0), {x: 0, y: 0});
  assert.deepEqual(robotPosition(4), {x: 100, y: 0});
  assert.deepEqual(robotPosition(23), {x: 75, y: 100});
  assert.equal(fantasyIndexFromIcon('fantasy-7'), 7);
  assert.deepEqual(spriteChoice('scout', 'fantasy-4'), {set: 'fantasy', index: 4});
  assert.deepEqual(spriteChoice('scout', ''), {set: 'fantasy', index: 15});
  assert.deepEqual(spriteChoice('reviewer', ''), {set: 'fantasy', index: 19});
  assert.deepEqual(spriteChoice('seance', ''), {set: 'fantasy', index: 0});
  assert.deepEqual(spriteChoice('security-reviewer', ''), {set: 'fantasy', index: 13});
  assert.deepEqual(spriteChoice('sonic', ''), {set: 'fantasy', index: 3});
  assert.deepEqual(spriteChoice('task', ''), {set: 'fantasy', index: 4});
  assert.equal(bundledAppearance('reviewer').color, '#dc2626');
  assert.equal(bundledAppearance('scout').color, '#16a34a');
  assert.equal(bundledAppearance('seance').color, '#2563eb');
  assert.deepEqual(spriteChoice('reviewer', 'robot-2'), {set: 'robot', index: 2});
  assert.deepEqual(spriteChoice('custom', ''), {set: 'robot', index: defaultRobotIndex('custom')});
});
