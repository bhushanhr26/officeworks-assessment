import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '../../api/client';
import { makeProduct } from '../../test/fixtures';
import { makeApiStub, renderApp } from '../../test/render-app';

const backpack = makeProduct({ id: '1', title: 'Hiking Backpack' });
const ring = makeProduct({ id: '2', title: 'Gold Ring' });
const earrings = makeProduct({ id: '3', title: 'Gold Earrings' });

const searchByTitle = async (term: string) =>
  [backpack, ring, earrings].filter((p) => p.title.toLowerCase().includes(term.toLowerCase()));

function setup() {
  const api = makeApiStub();
  api.getFeaturedProducts.mockResolvedValue([backpack, ring]);
  api.searchProducts.mockImplementation(searchByTitle);
  return api;
}

describe('Search flow', () => {
  it('shows only matching products after clicking Search', async () => {
    const { user, api } = renderApp('/', setup());
    await screen.findByRole('link', { name: /hiking backpack/i });

    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), 'gold');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(
      await screen.findByRole('heading', { name: 'Search results for “gold”' }),
    ).toBeInTheDocument();
    const results = await screen.findByRole('list', { name: 'Search results' });
    const titles = within(results)
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent);
    expect(titles).toEqual(['Gold Ring', 'Gold Earrings']);
    expect(screen.queryByText('Hiking Backpack')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('2 products found');
    expect(api.searchProducts).toHaveBeenCalledWith('gold');
  });

  it('can be used with the keyboard alone (Tab to the box, Enter to submit)', async () => {
    const { user, api } = renderApp('/', setup());
    const searchbox = screen.getByRole('searchbox', { name: 'Search products' });

    // Tab until the search box has focus; robust to header links being added or removed.
    for (let i = 0; i < 10 && document.activeElement !== searchbox; i++) await user.tab();
    expect(searchbox).toHaveFocus();
    await user.keyboard('ring{Enter}');

    expect(
      await screen.findByRole('heading', { name: 'Search results for “ring”' }),
    ).toBeInTheDocument();
    expect(api.searchProducts).toHaveBeenCalledWith('ring');
  });

  it('trims the term and ignores a blank search', async () => {
    const { user, api } = renderApp('/', setup());

    await user.type(screen.getByRole('searchbox'), '   ');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(screen.getByRole('heading', { name: 'Featured products' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toHaveFocus();
    expect(api.searchProducts).not.toHaveBeenCalled();
  });

  it('shows an empty state when nothing matches', async () => {
    renderApp('/search?q=teapot', setup());
    expect(
      await screen.findByRole('heading', { name: 'No products match “teapot”' }),
    ).toBeInTheDocument();
  });

  it('prompts for a term when the URL has none, without calling the API', async () => {
    const api = setup();
    renderApp('/search', api);
    expect(screen.getByRole('heading', { name: 'Search the catalogue' })).toBeInTheDocument();
    expect(api.searchProducts).not.toHaveBeenCalled();
  });

  it('shows an error after the automatic retry fails, and Try again recovers', async () => {
    const api = setup();
    api.searchProducts.mockRejectedValue(new ApiRequestError('UPSTREAM_ERROR', 'down', 502));
    const { user } = renderApp('/search?q=gold', api);

    expect(await screen.findByRole('alert')).toHaveTextContent('temporarily unavailable');
    expect(api.searchProducts).toHaveBeenCalledTimes(2); // first try + one automatic retry

    api.searchProducts.mockImplementation(searchByTitle);
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('list', { name: 'Search results' })).toBeInTheDocument();
  });

  it('keeps the search box in sync with the URL', async () => {
    renderApp('/search?q=ring', setup());
    expect(screen.getByRole('searchbox')).toHaveValue('ring');
  });
});
