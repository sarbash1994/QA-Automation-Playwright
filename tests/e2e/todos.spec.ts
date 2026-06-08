import { test, expect } from '../../src/fixtures/e2e-fixtures';
import { uniqueTagName } from '../../src/utils/data';

test.describe('Todos E2E @e2e', () => {
  test.beforeEach(async ({ dashboardPage, sharedUser }) => {
    await dashboardPage.seedToken(sharedUser.token);
    await dashboardPage.open();
  });

  test('creates, completes and deletes a todo', async ({ dashboardPage }) => {
    const title = `ui-todo-${uniqueTagName()}`;
    await dashboardPage.addTodo(title);

    await dashboardPage.toggleComplete(title);
    await expect(dashboardPage.todoByTitle(title).getByRole('checkbox')).toBeChecked();

    await dashboardPage.deleteTodo(title);
    await expect(dashboardPage.todoByTitle(title)).toHaveCount(0);
  });

  test('rejects an empty note with a validation toast (client-side)', async ({ dashboardPage }) => {
    const before = await dashboardPage.todoItems().count();
    await dashboardPage.todoInput.fill('   ');
    await dashboardPage.addTodoButton.click();
    await expect(dashboardPage.toast('Название заметки обязательно')).toBeVisible();
    await expect(dashboardPage.todoItems()).toHaveCount(before); // nothing was added
  });

  test('creates a colour-coded tag from the sidebar', async ({ dashboardPage }) => {
    const tag = uniqueTagName('uitag');
    await dashboardPage.createTag(tag);
    await expect(dashboardPage.tagsList.getByText(`#${tag}`)).toBeVisible();
  });

  // UI action → backend analytics cross-check.
  test('creating a todo in the UI is captured by analytics', async ({ dashboardPage, analytics, sharedUser }) => {
    const email = sharedUser.credentials.email;
    // Make the test self-sufficient: analytics only records while consent is on.
    await sharedUser.api.patchProfile({ internalAnalyticsConsent: true });
    const before = await analytics.count({ email, type: 'todoCreate' });

    await dashboardPage.addTodo(`ui-analytics-${uniqueTagName()}`);

    const events = await analytics.waitForCount({ email, type: 'todoCreate' }, before + 1);
    expect(events.at(-1)?.status).toBe('success');
  });
});
