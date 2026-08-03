import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { Shell } from "./components/Shell";
import { AuthProvider } from "./auth/AuthContext";
import { SettingsProvider } from "./auth/SettingsContext";
import { PortalPagesProvider } from "./auth/PortalPagesContext";
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
import { ApplyCourse, ApplyEvent } from "./pages/Apply";

export default function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <PortalPagesProvider>
          <AuthProvider>
            <ScrollToTop />
            <Routes>
              <Route element={<Shell />}>
                <Route index element={<Home />} />
                <Route path="giris" element={<Login />} />
                <Route path="kayit" element={<Register />} />
                <Route path="kurslar" element={<Courses />} />
                <Route path="kurslar/:id" element={<CourseDetail />} />
                <Route
                  path="kurslar/:id/basvuru"
                  element={
                    <RequireAuth>
                      <ApplyCourse />
                    </RequireAuth>
                  }
                />
                <Route path="etkinlikler" element={<Events />} />
                <Route path="etkinlikler/:id" element={<EventDetail />} />
                <Route
                  path="etkinlikler/:id/basvuru"
                  element={
                    <RequireAuth>
                      <ApplyEvent />
                    </RequireAuth>
                  }
                />
                <Route path="sayfa/:slug" element={<CatalogPage />} />
                <Route path="hizli-arama" element={<QuickSearch />} />
                <Route
                  path="basvurularim"
                  element={
                    <RequireAuth>
                      <MyApplications />
                    </RequireAuth>
                  }
                />
                <Route
                  path="profil"
                  element={
                    <RequireAuth>
                      <Profile />
                    </RequireAuth>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </AuthProvider>
        </PortalPagesProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}
