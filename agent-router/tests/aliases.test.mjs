import test from 'node:test';
import assert from 'node:assert/strict';
import { policyFromOptions, policyDigest } from '../lib/policy.mjs';
import { routeAgent, routeTeammate } from '../lib/routing.js';
import { modelOptions } from './fixtures.mjs';

const configured = {
  ...modelOptions,
  scout_aliases: 'explainer, cold-reader',
  security_reviewer_aliases: 'bug-hunter',
  task_aliases: 'implementer',
};

test('configured agent types route to their role and keep their own definition', () => {
  const policy = policyFromOptions(configured);
  assert.deepEqual(routeAgent(policy, { subagentType: 'cold-reader' }),
    { role: 'scout', type: 'cold-reader', model: modelOptions.scout_model });
  assert.deepEqual(routeAgent(policy, { subagentType: 'bug-hunter' }),
    { role: 'security-reviewer', type: 'bug-hunter', model: modelOptions.security_reviewer_model });
  assert.deepEqual(routeTeammate(policy, { subagentType: 'implementer' }),
    { role: 'task', type: 'implementer', model: modelOptions.task_model });
});

test('a configured agent type carries its role effort', () => {
  const policy = policyFromOptions({ ...configured, scout_effort: 'low' });
  assert.deepEqual(routeAgent(policy, { subagentType: 'explainer' }),
    { role: 'scout', type: 'explainer', model: modelOptions.scout_model, effort: 'low' });
});

test('the plugin and engine agent types still dispatch as managed roles', () => {
  const policy = policyFromOptions(configured);
  for (const [subagentType, expected] of [['Explore', 'agent-router:scout'], ['scout', 'agent-router:scout'],
    ['general-purpose', 'agent-router:task'], ['sonic', 'agent-router:sonic'], ['Plan', 'Plan'],
    ['agent-router:reviewer', 'agent-router:reviewer']]) {
    assert.equal(routeAgent(policy, { subagentType }).type, expected);
  }
});

test('unconfigured agent types, forks and malformed lists fail closed', () => {
  const policy = policyFromOptions(configured);
  assert.throws(() => routeAgent(policy, { subagentType: 'spec-writer' }), /No routing policy/);
  assert.throws(() => routeAgent(policy, { subagentType: 'cold-reader', fork: true }), /fork/);
  assert.throws(() => policyFromOptions({ ...modelOptions, sonic_aliases: 'fork' }), /cannot route/);
  assert.throws(() => policyFromOptions({ ...modelOptions, sonic_aliases: 'agent-router:sonic' }), /cannot route/);
  assert.throws(() => policyFromOptions({ ...modelOptions, sonic_aliases: ['sonic-two'] }), /comma-separated/);
  assert.throws(() => policyFromOptions({ ...modelOptions, task_aliases: 'Explore' }), /Duplicate/);
  assert.throws(() => policyFromOptions({ ...configured, sonic_aliases: 'cold-reader' }), /Duplicate/);
});

test('an empty or absent list leaves the policy and its digest unchanged', () => {
  const base = policyDigest(policyFromOptions(modelOptions));
  for (const value of [undefined, '', '  ,  ']) {
    assert.equal(policyDigest(policyFromOptions({ ...modelOptions, task_aliases: value })), base);
  }
  assert.notEqual(policyDigest(policyFromOptions(configured)), base);
});
