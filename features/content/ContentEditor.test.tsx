import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import ContentEditor from './ContentEditor';
import { newDocument } from './content.data';

it('does not submit malformed data and reports the save result', async () => {
  const initial = newDocument('services');
  const save = vi.fn().mockResolvedValue({ ...initial, version: 1, updatedAt: new Date().toISOString() });
  render(<ContentEditor initial={initial} canPublish onSave={save} />);
  fireEvent.change(screen.getByLabelText('Record data (JSON)'), { target: { value: '{bad' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save record' }));
  await waitFor(() => expect(screen.getByRole('status')).not.toHaveTextContent(/^$/));
  expect(save).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Record data (JSON)'), { target: { value: JSON.stringify(initial.data) } });
  fireEvent.click(screen.getByRole('button', { name: 'Save record' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Saved version 1'));
  expect(save).toHaveBeenCalledWith(initial);
});
it('does not offer publishing controls to a content editor', () => {
  render(<ContentEditor initial={newDocument('posts')} canPublish={false} onSave={vi.fn()} />);
  expect(screen.queryByRole('option', { name: 'published' })).not.toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'in_review' })).toBeInTheDocument();
});
