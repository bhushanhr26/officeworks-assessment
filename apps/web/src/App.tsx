import { Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { CategoryPage } from './features/category/CategoryPage';
import { EnquiryPage } from './features/enquiry/EnquiryPage';
import { HomePage } from './features/home/HomePage';
import { NotFoundPage } from './features/not-found/NotFoundPage';
import { ProductPage } from './features/product/ProductPage';
import { SearchPage } from './features/search/SearchPage';

// All routes live here (SPEC §8). Providers are set up by main.tsx, or by tests.
export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="category/:slug" element={<CategoryPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="products/:id" element={<ProductPage />} />
        <Route path="products/:id/enquire" element={<EnquiryPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
