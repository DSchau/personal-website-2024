import { test, expect, vi } from 'vitest'

vi.mock('resend')
import { checkEmailType, validateMXRecords, checkGravatar } from "./email";

test('labels email type: free', () => {
  const email = checkEmailType('john@gmail.com')

  expect(email).toEqual('free')
})

test('labels email type: personal', () => {
  const email = checkEmailType('me@dustinschau.com')

  expect(email).toEqual('personal')
})

test('handles russian e-mails', () => {
  const email = checkEmailType('sashunya.sergeev.2022@list.ru')

  expect(email).toEqual('disposable')
})

test('it validates mx record with valid record', async () => {
  const valid = await validateMXRecords('john@gmail.com');

  expect(valid).toBe(true);
})

test('it validates mx record with invalid record', async () => {
  const valid = await validateMXRecords('john@gmail22341234.com');

  expect(valid).toBe(false);
})

test('it validates a gravatar: valid', async () => {
  const valid = await checkGravatar('dustinschau@gmail.com');

  expect(valid).toBe(true);
})

test('it validates a gravatar: invalid', async () => {
  const valid = await checkGravatar('sashunya.sergeev.2022@list.ru');

  expect(valid).toBe(false);
})
