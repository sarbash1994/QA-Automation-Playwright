import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  readonly userName = this.ui('user-name');
  readonly logoutButton = this.ui('logout-button');
  readonly todoForm = this.ui('todo-form');
  readonly todoInput = this.ui('todo-input');
  readonly addTodoButton = this.ui('add-todo-button');
  readonly todosList = this.ui('todos-list');
  readonly emptyState = this.ui('empty-state');
  readonly toastContainer = this.ui('toast-container');
  readonly pageInfo = this.ui('page-info');
  readonly prevPage = this.ui('page-prev');
  readonly nextPage = this.ui('page-next');

  // tags sidebar
  readonly toggleTagsSidebar = this.ui('toggle-tags-sidebar-button');
  readonly tagsSidebar = this.ui('tags-sidebar');
  readonly tagForm = this.ui('tag-form');
  readonly tagNameInput = this.ui('tag-name-input');
  readonly tagColorGrid = this.ui('tag-color-grid');
  readonly tagsList = this.ui('tags-list');

  // delete modal
  readonly deleteModal = this.ui('delete-todo-modal');
  readonly confirmDelete = this.ui('confirm-delete-todo-button');
  readonly cancelDelete = this.ui('cancel-delete-todo-button');

  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.goto('/dashboard.html');
    await expect(this.todoForm).toBeVisible();
  }

  todoItems(): Locator {
    return this.todosList.locator('li');
  }

  todoByTitle(title: string): Locator {
    return this.todoItems().filter({ hasText: title });
  }

  async addTodo(title: string): Promise<void> {
    await this.todoInput.fill(title);
    await this.addTodoButton.click();
    await expect(this.todoByTitle(title)).toBeVisible();
  }

  async toggleComplete(title: string): Promise<void> {
    await this.todoByTitle(title).getByRole('checkbox').click();
  }

  async isCompleted(title: string): Promise<boolean> {
    return this.todoByTitle(title).getByRole('checkbox').isChecked();
  }

  async deleteTodo(title: string): Promise<void> {
    const item = this.todoByTitle(title);
    await item.getByRole('button', { name: `Удалить заметку ${title}` }).click();
    await expect(this.deleteModal).toBeVisible();
    await this.confirmDelete.click();
    await expect(item).toHaveCount(0);
  }

  async filterBy(status: 'all' | 'active' | 'completed'): Promise<void> {
    await this.page.locator(`.todo-filter-btn[data-filter="${status}"]`).click();
  }

  async createTag(name: string): Promise<void> {
    await this.toggleTagsSidebar.click();
    await expect(this.tagForm).toBeVisible();
    await this.tagNameInput.fill(name);
    // pick the first available colour swatch
    await this.tagColorGrid.locator('button').first().click();
    await this.tagForm.locator('button[type="submit"]').click();
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }

  toast(text: string): Locator {
    return this.toastContainer.getByText(text);
  }
}
