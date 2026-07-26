"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PlusSquare, LayoutDashboard, Shield, LogOut } from "lucide-react";
import BecomeOwnerModal from "@/components/property/BecomeOwnerModal";
import FloatingActionMenu from "@/components/ui/floating-action-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Navbar,
  NavBody,
  NavItems,
  NavbarLogo,
  NavbarButton,
  MobileNav,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
  useNavbar,
} from "@/components/ui/resizable-navbar";

const navItems = [
  { name: "Explore Homes", link: "/listings" },
  { name: "How It Works", link: "/how-it-works" },
  { name: "Blog", link: "/blog" },
];

/* ─── Avatar menu (FloatingActionMenu) ────────────────────────────────────── */
function UserMenu() {
  const { data: session } = useSession();
  const router = useRouter();
  const { scrolled, darkHero } = useNavbar();
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  if (!session) return null;

  const isAdmin = ["ADMIN"].includes(session.user?.role ?? "");

  const options = [
    {
      label: "My Dashboard",
      onClick: () => { router.push("/dashboard"); setMenuOpen(false); },
      Icon: <LayoutDashboard className="h-4 w-4" />,
    },
    ...(isAdmin
      ? [
          {
            label: "Admin Panel",
            onClick: () => { router.push("/admin"); setMenuOpen(false); },
            Icon: <Shield className="h-4 w-4" />,
          },
        ]
      : []),
    {
      label: "Sign Out",
      onClick: () => { signOut({ callbackUrl: "/" }); setMenuOpen(false); },
      Icon: <LogOut className="h-4 w-4" />,
    },
  ];

  return (
    <div ref={wrapperRef}>
      <FloatingActionMenu
        options={options}
        isOpen={menuOpen}
        onToggle={() => setMenuOpen((v) => !v)}
        direction="down"
        trigger={
          <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/50">
            <Avatar className="h-8 w-8">
              <AvatarImage src={session.user?.image ?? undefined} />
              <AvatarFallback
                className="text-xs font-semibold"
                style={{
                  background: scrolled ? "rgba(255,255,255,0.12)" : darkHero ? "rgba(255,255,255,0.15)" : "rgba(26,26,26,0.08)",
                  color: scrolled ? "#ffffff" : darkHero ? "#ffffff" : "#1A1A1A",
                }}
              >
                {session.user?.name?.charAt(0)?.toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
          </button>
        }
      />
    </div>
  );
}

/* ─── Main Navbar export ──────────────────────────────────────────────────── */

export default function SiteNavbar({ forceScrolled = false }: { forceScrolled?: boolean }) {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [ownerModalOpen, setOwnerModalOpen] = useState(false);

  const isOwnerPlus = ["OWNER", "ADMIN"].includes(
    session?.user?.role ?? ""
  );

  // If logged in as OWNER+ → go straight to /dashboard/new
  // If logged in as USER   → open the become-owner modal
  // If not logged in       → go to /register
  function handleListProperty() {
    if (!session) {
      window.location.href = "/register";
      return;
    }
    if (isOwnerPlus) {
      window.location.href = "/dashboard/new";
    } else {
      setOwnerModalOpen(true);
    }
  }

  return (
    <>
      <BecomeOwnerModal
        open={ownerModalOpen}
        onClose={() => setOwnerModalOpen(false)}
      />

      <Navbar
        forceScrolled={forceScrolled}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
      >
        {/* ── Desktop ── */}
        <NavBody>
          <NavbarLogo />
          <NavItems items={navItems} />
          <div className="flex items-center gap-3">
            {session ? (
              <>
                <NavbarButton variant="primary" onClick={handleListProperty}>
                  <PlusSquare className="h-4 w-4 mr-1.5" />
                  List Property
                </NavbarButton>
                <UserMenu />
              </>
            ) : (
              <>
                <NavbarButton variant="secondary" href="/login">
                  Sign In
                </NavbarButton>
                <NavbarButton variant="primary" href="/register">
                  List Property
                </NavbarButton>
              </>
            )}
          </div>
        </NavBody>

        {/* ── Mobile ── */}
        <MobileNav>
          <MobileNavHeader>
            <NavbarLogo />
            <MobileNavToggle
              isOpen={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            />
          </MobileNavHeader>

          <MobileNavMenu
            isOpen={mobileOpen}
            onClose={() => setMobileOpen(false)}
          >
            {navItems.map((item) => (
              <MobileNavLink
                key={item.link}
                href={item.link}
                onClick={() => setMobileOpen(false)}
              >
                {item.name}
              </MobileNavLink>
            ))}

            {session ? (
              <>
                <MobileNavLink href="/dashboard" onClick={() => setMobileOpen(false)}>
                  My Dashboard
                </MobileNavLink>
                {session.user?.role === "ADMIN" && (
                  <MobileNavLink href="/admin" onClick={() => setMobileOpen(false)}>
                    Admin Panel
                  </MobileNavLink>
                )}
                <MobileActionButton
                  onClick={() => { setMobileOpen(false); handleListProperty(); }}
                  icon={<PlusSquare className="h-4 w-4" />}
                  bordered
                >
                  List a Property
                </MobileActionButton>
                <MobileActionButton
                  onClick={() => { setMobileOpen(false); signOut({ callbackUrl: "/" }); }}
                  icon={<LogOut className="h-4 w-4" />}
                  danger
                >
                  Sign Out
                </MobileActionButton>
              </>
            ) : (
              <div className="flex flex-col gap-3 pt-3 mt-1">
                <NavbarButton
                  variant="secondary"
                  href="/login"
                  className="w-full"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign In
                </NavbarButton>
                <NavbarButton
                  variant="primary"
                  href="/register"
                  className="w-full"
                  onClick={() => setMobileOpen(false)}
                >
                  List Property
                </NavbarButton>
              </div>
            )}
          </MobileNavMenu>
        </MobileNav>
      </Navbar>
    </>
  );
}

/* ─── MobileNavLink helper ────────────────────────────────────────────────── */
function MobileNavLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const { scrolled } = useNavbar();
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-1 py-3 text-sm font-medium transition-colors duration-200 border-b"
      style={{
        color: scrolled ? "rgba(255,255,255,0.8)" : "#1A1A1A",
        borderColor: scrolled
          ? "rgba(255,255,255,0.08)"
          : "rgba(26,26,26,0.07)",
      }}
    >
      {children}
    </Link>
  );
}

/* ─── MobileActionButton helper ───────────────────────────────────────────── */
function MobileActionButton({
  onClick,
  icon,
  children,
  bordered,
  danger,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  bordered?: boolean;
  danger?: boolean;
}) {
  const { scrolled } = useNavbar();
  const color = danger
    ? scrolled ? "rgba(255,120,120,1)" : "rgb(239,68,68)"
    : scrolled ? "rgba(255,255,255,0.85)" : "#1A1A1A";
  const borderColor = scrolled ? "rgba(255,255,255,0.08)" : "rgba(26,26,26,0.07)";
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-1 py-2.5 text-sm font-medium w-full text-left"
      style={{
        color,
        borderBottom: bordered ? `1px solid ${borderColor}` : undefined,
      }}
    >
      {icon}
      {children}
    </button>
  );
}
