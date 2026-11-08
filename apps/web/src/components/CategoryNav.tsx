import { NavLink } from 'react-router';
import { useCategories } from '../api/queries';
import styles from './CategoryNav.module.css';

export function CategoryNav() {
  const { data: categories, isPending, isError } = useCategories();

  return (
    <nav aria-label="Categories" className={styles.nav}>
      {isPending && <span className={styles.muted}>Loading categories…</span>}
      {isError && <span className={styles.muted}>Categories are unavailable right now.</span>}
      {categories && (
        <ul className={styles.list}>
          {categories.map((category) => (
            <li key={category.slug}>
              <NavLink
                to={`/category/${category.slug}`}
                className={({ isActive }) =>
                  isActive ? `${styles.link} ${styles.active}` : styles.link
                }
              >
                {category.name}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
