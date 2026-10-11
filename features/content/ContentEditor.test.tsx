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
  expect(screen.queryByRole('option', { name: 'Published' })).not.toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'In review' })).toBeInTheDocument();
});

it('keeps a service payload slug in sync with the record slug', async () => {
  const save = vi.fn().mockImplementation(async (input) => ({ ...input, version: 1, updatedAt: new Date().toISOString() }));
  render(<ContentEditor initial={newDocument('services')} canPublish onSave={save} />);
  fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'cloud-security' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save record' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ slug: 'cloud-security', data: expect.objectContaining({ slug: 'cloud-security' }) })));
});

it('builds a case study with requirement points, engagement items, people and reviews', async () => {
  const save = vi.fn().mockImplementation(async (input) => ({ ...input, version: 1, updatedAt: new Date().toISOString() }));
  render(<ContentEditor initial={newDocument('case-studies')} canPublish onSave={save} />);
  fireEvent.click(screen.getByRole('button', { name: 'Save record' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Fix the highlighted fields'));
  expect(screen.getByText('Add at least one engagement item')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'fintech-app' } });
  fireEvent.change(screen.getByLabelText(/^Tagline/), { target: { value: 'Web and Android testing before launch' } });
  fireEvent.change(screen.getByLabelText(/^Company overview/), { target: { value: 'Regional digital bank.' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Company requirement' }), { target: { value: 'Independent assurance before launch.' } });
  fireEvent.change(screen.getByLabelText(/^Point 1/), { target: { value: 'Validating the security posture of their web & Android applications' } });
  fireEvent.click(screen.getByRole('button', { name: '+ Add point' }));
  fireEvent.change(screen.getByLabelText(/^Point 2/), { target: { value: 'Gaining a detailed understanding of potential vulnerabilities' } });
  fireEvent.click(screen.getByRole('button', { name: 'Move Gaining a detailed understanding of potential vulnerabilities up' }));
  fireEvent.click(screen.getByRole('button', { name: '+ Android Application Pentesting' }));
  fireEvent.click(screen.getByRole('button', { name: '+ Add review' }));
  fireEvent.change(screen.getAllByLabelText(/^Name/).at(-1)!, { target: { value: 'Clutch' } });
  fireEvent.change(screen.getByLabelText(/^URL/), { target: { value: 'https://clutch.co/profile/cyenetic' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save record' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Saved version 1'));
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
    requirement_points: ['Gaining a detailed understanding of potential vulnerabilities', 'Validating the security posture of their web & Android applications'],
    engagement_items: [{ title: 'Android Application Pentesting', description: '' }],
    reviews: [{ name: 'Clutch', url: 'https://clutch.co/profile/cyenetic' }],
  }) }));
});

it('formats blog text from the toolbar and previews it safely', () => {
  render(<ContentEditor initial={newDocument('posts')} canPublish onSave={vi.fn()} />);
  const body = screen.getByRole('textbox', { name: 'Description' });
  fireEvent.change(body, { target: { value: 'Findings' } });
  (body as HTMLTextAreaElement).setSelectionRange(0, 8);
  fireEvent.click(screen.getByRole('button', { name: 'Heading' }));
  expect(body).toHaveValue('## Findings');
  fireEvent.click(screen.getByRole('tab', { name: 'Preview' }));
  expect(screen.getByRole('heading', { level: 2, name: 'Findings' })).toBeInTheDocument();
});
