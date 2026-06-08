import { test, expect } from '../../src/fixtures/test-fixtures';
import { uniqueTagName } from '../../src/utils/data';
import type { Pagination, Tag, Todo } from '../../src/utils/types';

test.describe('Todos API @api', () => {
  test('creates a todo (201) with sane defaults', async ({ sharedUser }) => {
    const res = await sharedUser.api.createTodo('Buy milk');
    expect(res.status()).toBe(201);
    const todo: Todo = (await res.json()).todo;
    expect(todo.title).toBe('Buy milk');
    expect(todo.completed).toBe(false);
    expect(todo._id).toBeTruthy();
  });

  test('rejects a todo without a title', async ({ sharedUser }) => {
    const res = await sharedUser.api.createTodo('');
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('lists todos with pagination metadata', async ({ sharedUser }) => {
    for (const t of ['page-a', 'page-b', 'page-c']) await sharedUser.api.createTodo(t);
    const res = await sharedUser.api.getTodos({ status: 'all', page: 1, limit: 2, sort: 'smart' });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { todos: Todo[]; pagination: Pagination };
    expect(body.todos.length).toBeLessThanOrEqual(2);
    expect(body.pagination.total).toBeGreaterThanOrEqual(3);
    expect(body.pagination.totalPages).toBeGreaterThanOrEqual(2);
  });

  test('marks a todo completed', async ({ sharedUser }) => {
    const created: Todo = (await (await sharedUser.api.createTodo('Finish report')).json()).todo;
    const res = await sharedUser.api.updateTodo(created._id, { completed: true });
    expect(res.ok()).toBeTruthy();
    expect((await res.json()).todo.completed).toBe(true);
  });

  test('filters by completion status', async ({ sharedUser }) => {
    const doneTitle = `done-${uniqueTagName()}`;
    const activeTitle = `active-${uniqueTagName()}`;
    await sharedUser.api.createTodo(activeTitle);
    const done: Todo = (await (await sharedUser.api.createTodo(doneTitle)).json()).todo;
    await sharedUser.api.updateTodo(done._id, { completed: true });

    const completedRes = await sharedUser.api.getTodos({ status: 'completed', page: 1, limit: 100 });
    const completedTitles = ((await completedRes.json()).todos as Todo[]).map((t) => t.title);
    expect(completedTitles).toContain(doneTitle);
    expect(completedTitles).not.toContain(activeTitle);
  });

  test('edits title and attaches a tag', async ({ sharedUser }) => {
    const palette = (await (await sharedUser.api.getTagPalette()).json()).colors as string[];
    const tagName = uniqueTagName('work');
    const tag: Tag = (await (await sharedUser.api.createTag(tagName, palette[0])).json()).tag;
    const todo: Todo = (await (await sharedUser.api.createTodo('rough draft')).json()).todo;

    const res = await sharedUser.api.updateTodo(todo._id, { title: 'final draft', tagIds: [tag._id] });
    expect(res.ok()).toBeTruthy();
    const updated: Todo = (await res.json()).todo;
    expect(updated.title).toBe('final draft');
    expect(updated.tags.map((t) => t.name)).toContain(tagName);
  });

  test('deletes a todo', async ({ sharedUser }) => {
    const todo: Todo = (await (await sharedUser.api.createTodo('temporary')).json()).todo;
    const del = await sharedUser.api.deleteTodo(todo._id);
    expect(del.ok()).toBeTruthy();

    const list = await sharedUser.api.getTodos({ status: 'all', page: 1, limit: 100 });
    const ids = ((await list.json()).todos as Todo[]).map((t) => t._id);
    expect(ids).not.toContain(todo._id);
  });

  test('does not leak todos between users', async ({ sharedUser, registeredUser }) => {
    const secret = `secret-${uniqueTagName()}`;
    await registeredUser.api.createTodo(secret);
    const list = await sharedUser.api.getTodos({ status: 'all', page: 1, limit: 100 });
    const titles = ((await list.json()).todos as Todo[]).map((t) => t.title);
    expect(titles).not.toContain(secret);
  });
});
