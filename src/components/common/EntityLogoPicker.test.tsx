import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';

import { EntityLogoPicker } from './EntityLogoPicker';

// Vitest globals are off, so testing-library's automatic cleanup is not registered.
afterEach(cleanup);

const makeFile = () => new File(['binary'], 'logo.png', { type: 'image/png' });

describe('EntityLogoPicker', () => {
  it('offers an upload action and no removal when the entity has no logo', () => {
    const view = render(<EntityLogoPicker name="Club" onFileSelected={vi.fn()} />);

    expect(view.getByText('Upload logo')).toBeDefined();
    expect(view.queryByText('Remove logo')).toBeNull();
    expect(view.container.querySelector('.logo-picker-img')).toBeNull();
    expect(view.container.querySelector('.logo-picker-placeholder')).not.toBeNull();
  });

  it('previews the logo and offers replace and remove', () => {
    const onRemove = vi.fn();
    const view = render(
      <EntityLogoPicker
        name="Club"
        logoUrl="/logos/club.png"
        onFileSelected={vi.fn()}
        onRemove={onRemove}
      />,
    );

    expect(view.getByText('Replace logo')).toBeDefined();
    expect(view.container.querySelector('img')?.getAttribute('src')).toBe('/logos/club.png');

    fireEvent.click(view.getByText('Remove logo'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('hands the picked file to the owner', () => {
    const onFileSelected = vi.fn();
    const view = render(<EntityLogoPicker name="Club" onFileSelected={onFileSelected} />);

    const input = view.container.querySelector('.logo-picker-input') as HTMLInputElement;
    const file = makeFile();
    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it('disables its actions and shows a spinner while busy', () => {
    const view = render(
      <EntityLogoPicker
        name="Club"
        logoUrl="/logos/club.png"
        busy
        onFileSelected={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(view.container.querySelector('.logo-picker-spinner')).not.toBeNull();
    expect((view.getByText('Replace logo').closest('button') as HTMLButtonElement).disabled).toBe(true);
    expect((view.getByText('Remove logo').closest('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows only the preview when read-only', () => {
    const view = render(
      <EntityLogoPicker name="Club" logoUrl="/logos/club.png" readOnly onFileSelected={vi.fn()} />,
    );

    expect(view.queryByText('Replace logo')).toBeNull();
    expect(view.queryByText('Remove logo')).toBeNull();
    expect(view.container.querySelector('.logo-picker-img')).not.toBeNull();
  });
});
