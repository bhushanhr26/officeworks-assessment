import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiRequestError } from './api/client';
import { JEWELERY, makeProduct } from './test/fixtures';
import { makeApiStub, renderApp } from './test/render-app';

describe('Home page', () => {
  it('shows the featured products', async () => {
    const api = makeApiStub();
    api.getFeaturedProducts.mockResolvedValue(
      ['1', '2', '3', '4', '5'].map((id) => makeProduct({ id, title: `Featured ${id}` })),
    );
    renderApp('/', api);

    const grid = await screen.findByRole('list', { name: 'Featured products' });
    expect(within(grid).getAllByRole('listitem')).toHaveLength(5);
    expect(within(grid).getByRole('link', { name: 'Featured 1' })).toHaveAttribute(
      'href',
      '/products/1',
    );
  });

  it('shows loading, then an empty state', async () => {
    renderApp('/');
    expect(screen.getByRole('status')).toHaveTextContent('Loading featured products');
    expect(
      await screen.findByRole('heading', { name: 'No featured products right now' }),
    ).toBeInTheDocument();
  });

  it('shows an error state when the API fails', async () => {
    const api = makeApiStub();
    api.getFeaturedProducts.mockRejectedValue(new ApiRequestError('NETWORK_ERROR', 'x'));
    renderApp('/', api);
    expect(await screen.findByRole('alert')).toHaveTextContent('couldn’t reach the server');
  });
});

describe('Retry policy (production query client)', () => {
  it('retries a transient server error once and recovers without the user noticing', async () => {
    const api = makeApiStub();
    api.getFeaturedProducts
      .mockRejectedValueOnce(new ApiRequestError('UPSTREAM_ERROR', 'blip', 502))
      .mockResolvedValueOnce([makeProduct({ id: '1', title: 'Recovered' })]);
    renderApp('/', api);

    expect(await screen.findByRole('link', { name: 'Recovered' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(api.getFeaturedProducts).toHaveBeenCalledTimes(2);
  });

  it('does not retry a 404', async () => {
    const api = makeApiStub();
    api.getProduct.mockRejectedValue(new ApiRequestError('NOT_FOUND', 'x', 404));
    renderApp('/products/999', api);

    await screen.findByRole('heading', { name: 'Product not found' });
    expect(api.getProduct).toHaveBeenCalledTimes(1);
  });
});

describe('Header', () => {
  it('lists category links', async () => {
    renderApp('/');
    const nav = screen.getByRole('navigation', { name: 'Categories' });
    expect(await within(nav).findByRole('link', { name: 'Electronics' })).toHaveAttribute(
      'href',
      '/category/electronics',
    );
  });
});

describe('Category page', () => {
  it('opens from a category link and shows top rated and other products', async () => {
    const api = makeApiStub();
    api.getCategoryProducts.mockResolvedValue({
      topRated: ['1', '2', '3'].map((id) => makeProduct({ id, category: JEWELERY })),
      others: [makeProduct({ id: '4', category: JEWELERY })],
    });
    const { user } = renderApp('/', api);

    await user.click(await screen.findByRole('link', { name: 'Jewelery' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Jewelery' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'Top rated products' })).getAllByRole('listitem'),
    ).toHaveLength(3);
    expect(
      within(screen.getByRole('list', { name: 'More products' })).getAllByRole('listitem'),
    ).toHaveLength(1);
    expect(api.getCategoryProducts).toHaveBeenCalledWith('jewelery');
  });

  it('shows not found for an unknown category', async () => {
    const api = makeApiStub();
    api.getCategoryProducts.mockRejectedValue(new ApiRequestError('NOT_FOUND', 'x', 404));
    renderApp('/category/toys', api);
    expect(await screen.findByRole('heading', { name: 'Category not found' })).toBeInTheDocument();
  });
});

describe('Product page', () => {
  it('opens when a product tile is clicked and shows details', async () => {
    const product = makeProduct({ id: '7', title: 'Gold Ring', price: 695, description: 'Shiny' });
    const api = makeApiStub();
    api.getFeaturedProducts.mockResolvedValue([product]);
    api.getProduct.mockResolvedValue(product);
    const { user } = renderApp('/', api);

    await user.click(await screen.findByRole('link', { name: 'Gold Ring' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Gold Ring' })).toBeInTheDocument();
    expect(screen.getByText(/695\.00/)).toBeInTheDocument();
    expect(screen.getByText('Shiny')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Gold Ring' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Enquire' })).toHaveAttribute(
      'href',
      '/products/7/enquire',
    );
    expect(api.getProduct).toHaveBeenCalledWith('7');
  });

  it('shows not found for an unknown product', async () => {
    const api = makeApiStub();
    api.getProduct.mockRejectedValue(new ApiRequestError('NOT_FOUND', 'x', 404));
    renderApp('/products/999', api);
    expect(await screen.findByRole('heading', { name: 'Product not found' })).toBeInTheDocument();
  });
});

describe('Unknown routes', () => {
  it('render the not found page', () => {
    renderApp('/nope');
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
  });
});
