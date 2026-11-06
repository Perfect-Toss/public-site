import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';

import type { Entity } from '../../api/api.entities';
import { MemoryRouter } from 'react-router-dom';
import { OrganizationCard } from './OrganizationCard';

// Vitest globals are off, so testing-library's automatic cleanup is not registered.
afterEach(cleanup);

const renderCard = (organization: Entity) =>
  render(
    <MemoryRouter>
      <OrganizationCard organization={organization} />
    </MemoryRouter>,
  );

describe('OrganizationCard', () => {
  it('shows the logo when the organization has one', () => {
    const view = renderCard({ id: 'org-1', name: 'Club', logoUrl: '/logos/club.png' });

    const logo = view.container.querySelector('.org-card-logo') as HTMLImageElement | null;
    expect(logo?.getAttribute('src')).toBe('/logos/club.png');
    // The name is right below, so the logo carries no alt text of its own.
    expect(logo?.getAttribute('alt')).toBe('');
    expect(view.container.querySelector('.org-icon')).toBeNull();
  });

  it('falls back to the building glyph and links to the organization', () => {
    const view = renderCard({ id: 'org-1', name: 'Club' });

    expect(view.container.querySelector('.org-card-logo')).toBeNull();
    expect(view.container.querySelector('.org-icon')).not.toBeNull();
    expect(view.container.querySelector('a')?.getAttribute('href')).toBe('/organizations/org-1');
    expect(view.getByText('Club')).toBeDefined();
  });
});
