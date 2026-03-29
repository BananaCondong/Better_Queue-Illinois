import { Link, useLocation } from 'react-router-dom';

export default function HeaderNav({ title, titleAccent = '@Illinois' }) {
  const { pathname } = useLocation();

  const linkClass = (path) =>
    pathname === path ? 'header-nav-link header-nav-link--active' : 'header-nav-link';

  return (
    <header className="main-header">
      <div className="header-inner">
        <h1>
          {title}
          <span>{titleAccent}</span>
        </h1>
        <nav className="header-nav" aria-label="Primary">
          <Link className={linkClass('/')} to="/">
            Student queue
          </Link>
          <Link className={linkClass('/ta')} to="/ta">
            TA view
          </Link>
          <Link className={linkClass('/map')} to="/map">
            Lab map
          </Link>
        </nav>
      </div>
    </header>
  );
}
