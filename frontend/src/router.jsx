import React, { createContext, useContext, useState, useEffect } from "react";

const NavigationContext = createContext({
  path: window.location.pathname,
  navigate: () => {},
});

export function Router({ children }) {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (to, { replace = false } = {}) => {
    if (replace) {
      window.history.replaceState({}, "", to);
    } else {
      window.history.pushState({}, "", to);
    }
    setPath(to);
    window.scrollTo(0, 0);
  };

  return (
    <NavigationContext.Provider value={{ path, navigate }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigate() {
  const { navigate } = useContext(NavigationContext);
  return navigate;
}

export function useLocation() {
  const { path } = useContext(NavigationContext);
  return { pathname: path };
}

export function Link({ to, children, className = "", onClick, ...props }) {
  const { navigate } = useContext(NavigationContext);

  const handleClick = (e) => {
    e.preventDefault();
    if (onClick) onClick(e);
    navigate(to);
  };

  return (
    <a href={to} onClick={handleClick} className={className} {...props}>
      {children}
    </a>
  );
}

export function Routes({ children }) {
  const { path } = useContext(NavigationContext);

  let match = null;
  React.Children.forEach(children, (child) => {
    if (!match && React.isValidElement(child)) {
      const { path: routePath, element } = child.props;
      if (routePath === "*" || routePath === path || (routePath !== "/" && path.startsWith(routePath))) {
        match = element;
      }
    }
  });

  return match;
}

export function Route({ path, element }) {
  return element;
}

export function Navigate({ to, replace = true }) {
  const { navigate } = useContext(NavigationContext);
  useEffect(() => {
    navigate(to, { replace });
  }, [to, replace, navigate]);
  return null;
}
