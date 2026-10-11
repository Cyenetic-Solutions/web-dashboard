import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import ContentEditor from './ContentEditor';
import { newDocument } from './content.data';

it('blocks invalid fields, then saves a valid record and keeps the returned version', async () => {
  const initial = newDocument('posts');
  const save = vi.fn().mockImplementation(async (input) => ({ ...input, version: 1, updatedAt: new Date().toISOString() }));
  render(<ContentEditor initial={initial} canPublish onSave={save} />);
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: '   ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save record' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Fix the highlighted fields'));
  expect(save).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Breaking OAuth in fintech APIs' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save record' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Saved version 1'));
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ version: 0, data: expect.objectContaining({ title: 'Breaking OAuth in fintech APIs' }) }));
  expect(screen.getByLabelText('Slug')).toHaveAttribute('readonly');
});

it('does not offer publishing statuses to a content editor', () => {
  render(<ContentEditor initial={newDocument('posts')} canPublish={false} onSave={vi.fn()} />);
  expect(screen.queryByRole('option', { name: 'published' })).not.toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'in_review' })).toBeInTheDocument();
});

it('keeps a service payload slug in sync with the record slug', async () => {
  const save = vi.fn().mockImplementation(async (input) => ({ ...input, version: 1, updatedAt: new Date().toISOString() }));
  render(<ContentEditor initial={newDocument('services')} canPublish onSave={save} />);
  fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'cloud-security' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save record' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ slug: 'cloud-security', data: expect.objectContaining({ slug: 'cloud-security' }) })));
});
