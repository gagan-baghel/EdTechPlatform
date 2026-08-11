// titleKey looks up messages/{locale}.json's Navbar namespace (Navbar.jsx);
// title stays as the English fallback/default for anywhere still reading
// it directly (MobileNav.jsx, etc).
export const NavbarLinks = [
  {
    title: "Home",
    titleKey: "home",
    path: "/",
  },
  {
    title: "Catalog",
    // path: '/catalog',
  },
  {
    title: "Subscribe",
    titleKey: "subscribe",
    path: "/subscribe",
  },
  {
    title: "About Us",
    titleKey: "aboutUs",
    path: "/about",
  },
  {
    title: "Contact Us",
    titleKey: "contactUs",
    path: "/contact",
  },
];
