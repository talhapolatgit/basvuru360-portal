import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { Shell } from "./components/Shell";
import { AuthProvider } from "./auth/AuthContext";
import { SettingsProvider } from "./auth/SettingsContext";
import { PortalPagesProvider, usePortalPages } from "./auth/PortalPagesContext";
import { RequireAuth } from "./auth/RequireAuth";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Profile } from "./pages/Profile";
import { MyApplications } from "./pages/MyApplications";
import { Courses } from "./pages/Courses";
import { CourseDetail } from "./pages/CourseDetail";
import { Events } from "./pages/Events";
import { EventDetail } from "./pages/EventDetail";
import { CatalogPage } from "./pages/CatalogPage";
import { QuickSearch } from "./pages/QuickSearch";
import { ApplyCourse, ApplyEvent } from "./pages/ApplyPages";
import { KresApply } from "./pages/KresApply";
import { LEGACY_SLUGS } from "./lib/portalPaths";

function PrefixRedirect({ toSlug }: { toSlug: string }) {
  const { search } = useLocation();
  const splat = useParams()["*"];
  const dest = splat ? `/${toSlug}/${splat}` : `/${toSlug}`;
  return <Navigate to={`${dest}${search}`} replace />;
}

function AppRoutes() {
  const { paths } = usePortalPages();

  const legacy = Object.entries(LEGACY_SLUGS).flatMap(([kod, slugs]) => {
    const current =
      kod === "kurslar"
        ? paths.kurslarSlug
        : kod === "etkinlikler"
          ? paths.etkinliklerSlug
          : kod === "basvurularim"
            ? paths.basvurularim.slice(1)
            : kod === "profil"
              ? paths.profil.slice(1)
              : paths.kres.slice(1);

    return slugs
      .filter((slug) => slug !== current)
      .map((slug) => (
        <Route
          key={`${kod}-${slug}`}
          path={`${slug}/*`}
          element={<PrefixRedirect toSlug={current} />}
        />
      ));
  });

  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Home />} />
        <Route path="giris" element={<Login />} />
        <Route path="kayit" element={<Register />} />
        <Route path={paths.kurslarSlug} element={<Courses />} />
        <Route path={`${paths.kurslarSlug}/:id`} element={<CourseDetail />} />
        <Route
          path={`${paths.kurslarSlug}/:id/basvuru`}
          element={
            <RequireAuth>
              <ApplyCourse />
            </RequireAuth>
          }
        />
        <Route path={paths.etkinliklerSlug} element={<Events />} />
        <Route
          path={`${paths.etkinliklerSlug}/:id`}
          element={<EventDetail />}
        />
        <Route
          path={`${paths.etkinliklerSlug}/:id/basvuru`}
          element={
            <RequireAuth>
              <ApplyEvent />
            </RequireAuth>
          }
        />
        <Route path="sayfa/:slug" element={<CatalogPage />} />
        <Route path="hizli-arama" element={<QuickSearch />} />
        <Route
          path={paths.kres.slice(1)}
          element={
            <RequireAuth>
              <KresApply />
            </RequireAuth>
          }
        />
        <Route
          path={paths.basvurularim.slice(1)}
          element={
            <RequireAuth>
              <MyApplications />
            </RequireAuth>
          }
        />
        <Route
          path={paths.profil.slice(1)}
          element={
            <RequireAuth>
              <Profile />
            </RequireAuth>
          }
        />
        {legacy}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <PortalPagesProvider>
          <AuthProvider>
            <ScrollToTop />
            <AppRoutes />
          </AuthProvider>
        </PortalPagesProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}
