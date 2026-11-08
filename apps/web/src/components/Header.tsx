import { Link } from 'react-router';
import { CategoryNav } from './CategoryNav';
import { SearchForm } from './SearchForm';
import styles from './Header.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <Link to="/" className={styles.brand}>
            Product Catalogue
          </Link>
          <SearchForm />
        </div>
        <CategoryNav />
      </div>
    </header>
  );
}
