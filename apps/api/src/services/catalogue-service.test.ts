import { describe, expect, it, vi } from 'vitest';
import { InMemoryProductRepository } from '../adapters/in-memory/in-memory-product-repository';
import { NotFoundError, UpstreamError, ValidationError } from '../domain/errors';
import { ELECTRONICS, JEWELERY, makeProduct } from '../test/product-factory';
import type { ProductRepository } from '../domain/product-repository';
import { CatalogueService } from './catalogue-service';

const silentLogger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });

function makeService(repo: ProductRepository, featuredIds: string[], logger = silentLogger()) {
  return new CatalogueService(repo, featuredIds, logger);
}

const rated = (id: string, average: number, count = 10, title = `Product ${id}`) =>
  makeProduct({ id, title, rating: { average, count } });

describe('CatalogueService.getFeatured', () => {
  it('returns featured products in configured order', async () => {
    const repo = new InMemoryProductRepository(['1', '2', '3'].map((id) => makeProduct({ id })));
    const service = makeService(repo, ['3', '1']);

    expect((await service.getFeatured()).map((p) => p.id)).toEqual(['3', '1']);
  });

  it('skips ids that no longer exist in the source, and warns about them', async () => {
    const repo = new InMemoryProductRepository([makeProduct({ id: '1' })]);
    const logger = silentLogger();
    const service = makeService(repo, ['1', 'gone', 'also-gone'], logger);

    expect((await service.getFeatured()).map((p) => p.id)).toEqual(['1']);
    expect(logger.warn).toHaveBeenCalledWith(
      'Featured product ids not found in source: gone, also-gone',
    );
  });

  it('does not warn when every featured id exists', async () => {
    const logger = silentLogger();
    await makeService(
      new InMemoryProductRepository([makeProduct({ id: '1' })]),
      ['1'],
      logger,
    ).getFeatured();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});

describe('CatalogueService.getCategoryProducts', () => {
  const products = [
    rated('a', 3.0),
    rated('b', 4.8, 100),
    rated('c', 4.8, 300),
    rated('d', 1.5),
    rated('e', 4.1),
    makeProduct({ id: 'j', category: JEWELERY, rating: { average: 5, count: 999 } }),
  ];
  const service = makeService(new InMemoryProductRepository(products), []);

  it('splits the top 3 by rating from the rest, both sorted by rating', async () => {
    const { topRated, others } = await service.getCategoryProducts(ELECTRONICS.slug);

    // c beats b on rating count when the average ties.
    expect(topRated.map((p) => p.id)).toEqual(['c', 'b', 'e']);
    expect(others.map((p) => p.id)).toEqual(['a', 'd']);
  });

  it('only includes products from the requested category', async () => {
    const { topRated, others } = await service.getCategoryProducts(JEWELERY.slug);
    expect(topRated.map((p) => p.id)).toEqual(['j']);
    expect(others).toEqual([]);
  });

  it('breaks full ties by title for a stable order', async () => {
    const repo = new InMemoryProductRepository([
      rated('2', 4, 10, 'Zed'),
      rated('1', 4, 10, 'Abe'),
    ]);
    const { topRated } = await makeService(repo, []).getCategoryProducts('electronics');
    expect(topRated.map((p) => p.title)).toEqual(['Abe', 'Zed']);
  });

  it('throws NotFoundError for an unknown category', async () => {
    await expect(service.getCategoryProducts('toys')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('CatalogueService.search', () => {
  const service = makeService(
    new InMemoryProductRepository([
      makeProduct({ id: '1', title: 'Gaming Drive', description: 'Fast storage' }),
      makeProduct({ id: '2', title: 'Ring', description: 'Gold plated', category: JEWELERY }),
      makeProduct({ id: '3', title: 'SSD', description: 'Solid state DRIVE' }),
    ]),
    [],
  );
  const ids = async (term: string) => (await service.search(term)).map((p) => p.id);

  it('matches title, description and category name, case-insensitively', async () => {
    expect(await ids('drive')).toEqual(['1', '3']);
    expect(await ids('GOLD')).toEqual(['2']);
    expect(await ids('jewel')).toEqual(['2']);
  });

  it('trims the term and returns [] when nothing matches', async () => {
    expect(await ids('  ring ')).toEqual(['2']);
    expect(await ids('teapot')).toEqual([]);
  });

  it('rejects an empty term', async () => {
    await expect(service.search('   ')).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('CatalogueService.getById', () => {
  const repo = new InMemoryProductRepository([makeProduct({ id: '7' })]);
  const service = makeService(repo, []);

  it('returns the product', async () => {
    expect((await service.getById('7')).id).toBe('7');
  });

  it('throws NotFoundError for unknown ids', async () => {
    await expect(service.getById('8')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('propagates upstream failures', async () => {
    repo.failWith = new UpstreamError('down');
    await expect(service.getById('7')).rejects.toBeInstanceOf(UpstreamError);
  });
});
