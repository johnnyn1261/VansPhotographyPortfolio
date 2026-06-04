"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { Category, Folder } from "@/lib/storage";

interface NavigationProps {
  categories: Category[];
  folders?: Folder[];
}

export default function Navigation({ categories, folders = [] }: NavigationProps) {
  const searchParams = useSearchParams();
  const activeAlbum = searchParams?.get("album") || "all";
  const pathname = usePathname() || "/";
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [navCategories, setNavCategories] = useState<Category[]>(categories);
  const [navFolders, setNavFolders] = useState<Folder[]>(folders);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const [prevCategories, setPrevCategories] = useState<Category[]>(categories);
  const [prevFolders, setPrevFolders] = useState<Folder[]>(folders);
  if (categories !== prevCategories || folders !== prevFolders) {
    setPrevCategories(categories);
    setNavCategories(categories);
    setPrevFolders(folders);
    setNavFolders(folders);
  }

  useEffect(() => {
    const handlePortfolioUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ categories: Category[]; folders?: Folder[] }>;
      if (customEvent.detail) {
        if (customEvent.detail.categories) {
          setNavCategories(customEvent.detail.categories);
        }
        if (customEvent.detail.folders) {
          setNavFolders(customEvent.detail.folders);
        }
      }
    };
    window.addEventListener("portfolio-updated", handlePortfolioUpdate);
    return () => {
      window.removeEventListener("portfolio-updated", handlePortfolioUpdate);
    };
  }, []);

  useEffect(() => {
    // Automatically expand the folder that contains the active collection
    if (activeAlbum !== "all") {
      const activeCat = navCategories.find(c => c.slug === activeAlbum);
      if (activeCat?.folderSlug) {
        setExpandedFolders(prev => ({
          ...prev,
          [activeCat.folderSlug!]: true
        }));
      }
    }
  }, [activeAlbum, navCategories]);

  const toggleFolder = (folderSlug: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderSlug]: !prev[folderSlug]
    }));
  };

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    const timer = setTimeout(() => {
      setTheme(isDark ? "dark" : "light");
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
    }
  };

  useEffect(() => {
    document.body.style.overflow = isDrawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 640) setIsDrawerOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);


  const renderNavLinks = (onLinkClick?: () => void) => {
    // Group categories by folder
    const categoriesByFolder: Record<string, Category[]> = {};
    const topLevelCategories: Category[] = [];

    navCategories.forEach((cat) => {
      if (cat.folderSlug && navFolders.some(f => f.slug === cat.folderSlug)) {
        if (!categoriesByFolder[cat.folderSlug]) {
          categoriesByFolder[cat.folderSlug] = [];
        }
        categoriesByFolder[cat.folderSlug].push(cat);
      } else {
        topLevelCategories.push(cat);
      }
    });

    return (
      <nav className="flex flex-col gap-4 text-[11px] font-bold tracking-widest text-text-light uppercase">
        <Link
          href="/"
          onClick={onLinkClick}
          className={`transition-colors duration-200 hover:text-text-main shrink-0 w-fit relative py-1 ${
            pathname === "/" && activeAlbum === "all" ? "text-text-main" : ""
          }`}
        >
          HOME
          {pathname === "/" && activeAlbum === "all" && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-text-main animate-expand-underline" />}
        </Link>
        
        {/* Render Folders & their child collections */}
        {navFolders.map((folder) => {
          const folderCats = categoriesByFolder[folder.slug] || [];
          if (folderCats.length === 0) return null; // Don't render empty folders in menu
          
          const isExpanded = !!expandedFolders[folder.slug];
          
          return (
            <div key={folder.slug} className="flex flex-col gap-1 select-none">
              <button
                onClick={() => toggleFolder(folder.slug)}
                className="flex items-center gap-1.5 transition-colors duration-200 hover:text-text-main text-[11px] font-bold tracking-widest text-text-light uppercase text-left w-full py-1 focus:outline-none cursor-pointer"
              >
                <span>{folder.name}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform duration-200 text-text-light/70 ${isExpanded ? "rotate-90 text-text-main" : ""}`}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              <div 
                className={`pl-3.5 flex flex-col gap-2 overflow-hidden transition-all duration-350 ease-in-out ${
                  isExpanded ? "max-h-52 opacity-100 mt-1 mb-2" : "max-h-0 opacity-0 pointer-events-none"
                }`}
              >
                {folderCats.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/?album=${cat.slug}`}
                    onClick={onLinkClick}
                    className={`transition-colors duration-200 hover:text-text-main text-[10.5px] font-medium tracking-wide ${
                      pathname === "/" && activeAlbum === cat.slug ? "text-text-main" : "text-text-muted"
                    }`}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}

        {/* Render Top Level Collections */}
        {topLevelCategories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/?album=${cat.slug}`}
            onClick={onLinkClick}
            className={`transition-colors duration-200 hover:text-text-main shrink-0 w-fit relative py-1 ${
              pathname === "/" && activeAlbum === cat.slug ? "text-text-main" : ""
            }`}
          >
            {cat.name}
            {pathname === "/" && activeAlbum === cat.slug && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-text-main animate-expand-underline" />}
          </Link>
        ))}

        <Link
          href="/about"
          onClick={onLinkClick}
          className={`transition-colors duration-200 hover:text-text-main shrink-0 w-fit relative py-1 ${
            pathname === "/about" ? "text-text-main" : ""
          }`}
        >
          ABOUT
          {pathname === "/about" && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-text-main animate-expand-underline" />}
        </Link>
      </nav>
    );
  };

  const renderSocialIcons = () => (
    <div className="flex flex-row items-center gap-3 -ml-1">
      <a
        href="https://www.instagram.com/vangoghsforpics/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-text-light hover:text-text-main transition-colors p-1"
        title="Instagram"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
      </a>
      <a
        href="https://vnguyen.me"
        target="_blank"
        rel="noopener noreferrer"
        className="text-text-light hover:text-text-main transition-colors p-1"
        title="Personal Website"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
      </a>
      <a
        href="mailto:vanhanguy12@gmail.com"
        className="text-text-light hover:text-text-main transition-colors p-1"
        title="Email"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      </a>
      <button
        onClick={toggleTheme}
        className="text-text-light hover:text-text-main transition-colors p-1 cursor-pointer flex items-center justify-center"
        aria-label="Toggle light/dark mode"
        title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
      >
        {theme === "light" ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </svg>
        )}
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden sm:flex w-48 shrink-0 bg-bg-base h-screen sticky top-0 flex-col px-6 py-8 z-30">
        <div className="shrink-0 mb-8">
          <Link href="/" className="group block select-none">
            <span className="font-serif text-lg font-bold tracking-widest block leading-tight text-text-main font-serif">VAN-NHAN</span>
            <span className="font-serif text-lg font-bold tracking-widest block leading-tight text-text-main font-serif">NGUYEN</span>
          </Link>
        </div>
        <div className="flex-grow overflow-y-auto min-h-0 pr-2 -mr-2">
          {renderNavLinks()}
        </div>
        <div className="flex flex-col gap-4 mt-auto pt-8 shrink-0">
          {renderSocialIcons()}
          <div className="text-[9px] tracking-widest text-text-light font-medium uppercase leading-relaxed">
            <Link href="/admin" className="cursor-default text-inherit no-underline select-none">©</Link> {new Date().getFullYear()} Van-Nhan Nguyen<br />All rights reserved
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="sm:hidden flex h-16 w-full items-center justify-between px-6 border-b border-line-light bg-bg-base/90 backdrop-blur-md sticky top-0 z-40">
          <Link href="/" className="group block select-none">
            <span className="font-serif text-lg font-bold tracking-widest block leading-tight text-text-main font-serif">VAN-NHAN</span>
            <span className="font-serif text-lg font-bold tracking-widest block leading-tight text-text-main font-serif">NGUYEN</span>
          </Link>
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="p-2 -mr-2 text-text-main hover:text-text-light transition-colors"
          aria-label="Open menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>
      </header>

      {/* Mobile Side Drawer overlay */}
      <div className={`sm:hidden fixed inset-0 z-50 transition-visibility duration-300 ${isDrawerOpen ? "visible" : "invisible"}`}>
        <div
          onClick={() => setIsDrawerOpen(false)}
          className={`absolute inset-0 bg-black/15 backdrop-blur-[2px] transition-opacity duration-300 ${isDrawerOpen ? "opacity-100" : "opacity-0"}`}
        />
        <div className={`absolute inset-y-0 left-0 w-full bg-bg-base shadow-2xl px-6 py-8 flex flex-col transform transition-transform duration-300 ease-out z-10 ${isDrawerOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex items-start justify-between shrink-0 mb-8">
            <Link href="/" onClick={() => setIsDrawerOpen(false)} className="select-none block">
              <span className="font-serif text-lg font-bold tracking-widest block leading-tight text-text-main font-serif">VAN-NHAN</span>
              <span className="font-serif text-lg font-bold tracking-widest block leading-tight text-text-main font-serif">NGUYEN</span>
            </Link>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="p-1 -mt-1 -mr-1 text-text-main hover:text-text-light transition-colors"
              aria-label="Close menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-grow overflow-y-auto min-h-0 pr-2 -mr-2">
            {renderNavLinks(() => setIsDrawerOpen(false))}
          </div>
          <div className="flex flex-col gap-4 mt-auto pt-8 shrink-0">
            {renderSocialIcons()}
            <div className="text-[9px] tracking-widest text-text-light font-medium uppercase leading-relaxed">
              <Link href="/admin" onClick={() => setIsDrawerOpen(false)} className="cursor-default text-inherit no-underline select-none">©</Link> {new Date().getFullYear()} Van-Nhan Nguyen<br />All rights reserved
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
