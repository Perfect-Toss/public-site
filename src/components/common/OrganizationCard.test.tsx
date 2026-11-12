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
  it('hands the logo to the card as --org-logo', () => {
    const view = renderCard({ id: 'org-1', name: 'Club', logoUrl: '/logos/club.png' });

    const card = view.container.querySelector('.organization-card') as HTMLElement | null;
    expect(card?.getAttribute('style')).toContain('/logos/club.png');
    // Decorative, so no img element in the card.
    expect(view.container.querySelector('img')).toBeNull();
  });

  it('shows only the name when the organization has no logo', () => {
    const view = renderCard({ id: 'org-1', name: 'club', entityType: 'club' });

    expect(view.container.querySelector('img')).toBeNull();
    // Nothing to paint in the corner and no type line.
    expect(view.container.querySelector('.organization-card')?.getAttribute('style')).toBeNull();
    expect(view.container.querySelector('.org-type')).toBeNull();
    expect(view.container.querySelector('a')?.getAttribute('href')).toBe('/organizations/org-1');
    expect(view.getByText('club')).toBeDefined();
  });
});
