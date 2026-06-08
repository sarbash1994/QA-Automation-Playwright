import { test, expect } from '../../src/fixtures/test-fixtures';
import { uniqueTagName } from '../../src/utils/data';
import type { Tag } from '../../src/utils/types';

test.describe('Tags API @api', () => {
  test('returns a non-empty colour palette of hex values', async ({ sharedUser }) => {
    const res = await sharedUser.api.getTagPalette();
    expect(res.ok()).toBeTruthy();
    const colors = (await res.json()).colors as string[];
    expect(colors.length).toBeGreaterThan(0);
    colors.forEach((c) => expect(c).toMatch(/^#[0-9A-Fa-f]{3,8}$/));
  });

  test('creates a tag with a chosen colour', async ({ sharedUser }) => {
    const palette = (await (await sharedUser.api.getTagPalette()).json()).colors as string[];
    const name = uniqueTagName();
    const res = await sharedUser.api.createTag(name, palette[0]);
    expect(res.status()).toBe(201);
    const tag: Tag = (await res.json()).tag;
    expect(tag.name).toBe(name);
    expect(tag.color).toBe(palette[0]);
  });

  test('ensureTag creates a tag on demand (idempotent by name)', async ({ sharedUser }) => {
    const name = uniqueTagName('ensure');
    const first: Tag = (await (await sharedUser.api.ensureTag(name)).json()).tag;
    const second: Tag = (await (await sharedUser.api.ensureTag(name)).json()).tag;
    expect(first.name).toBe(name);
    expect(second._id).toBe(first._id); // same tag, not a duplicate
  });

  test('lists and searches tags', async ({ sharedUser }) => {
    const palette = (await (await sharedUser.api.getTagPalette()).json()).colors as string[];
    const name = uniqueTagName('search');
    await sharedUser.api.createTag(name, palette[1]);

    const res = await sharedUser.api.getTags(name);
    const names = ((await res.json()).tags as Tag[]).map((t) => t.name);
    expect(names).toContain(name);
  });

  test('deletes a tag', async ({ sharedUser }) => {
    const palette = (await (await sharedUser.api.getTagPalette()).json()).colors as string[];
    const tag: Tag = (await (await sharedUser.api.createTag(uniqueTagName('del'), palette[2])).json()).tag;

    const del = await sharedUser.api.deleteTag(tag._id);
    expect(del.ok()).toBeTruthy();

    const remaining = ((await (await sharedUser.api.getTags()).json()).tags as Tag[]).map((t) => t._id);
    expect(remaining).not.toContain(tag._id);
  });
});
