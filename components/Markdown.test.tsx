import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import Markdown from './Markdown';

it('renders headings, emphasis, lists, quotes, code and figures', () => {
  const { container } = render(<Markdown source={'## Scope\n\nWe tested **two** apps and _one_ API.\n\n- Web\n- Android\n\n> Great work\n\n```js\nalert(1)\n```\n\n![Login flow](https://cdn.example.com/flow.png "Figure 1")'} />);
  expect(screen.getByRole('heading', { level: 2, name: 'Scope' })).toBeInTheDocument();
  expect(container.querySelector('strong')).toHaveTextContent('two');
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
  expect(container.querySelector('blockquote')).toHaveTextContent('Great work');
  expect(container.querySelector('pre code')).toHaveTextContent('alert(1)');
  expect(screen.getByRole('img', { name: 'Login flow' })).toHaveAttribute('src', 'https://cdn.example.com/flow.png');
  expect(screen.getByText('Figure 1')).toBeInTheDocument();
});

it('never renders raw HTML, script links or non-https images', () => {
  const { container } = render(<Markdown source={'<img src=x onerror=alert(1)> [click](javascript:alert(1)) ![x](http://insecure.example/a.png)'} />);
  expect(container.querySelector('img')).toBeNull();
  expect(container.querySelector('a')).toBeNull();
  expect(container).toHaveTextContent('<img src=x onerror=alert(1)>');
});
