import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import {
  AuthProvider,
  useAuth,
} from './context/AuthContext';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Public/Register';


// ==================== ADMIN ====================

import AdminHome from './pages/Admin/AdminHome';
import Applicants from './pages/Admin/Applicants';
import Peserta from './pages/Admin/Peserta';
import PesertaDetail from './pages/Admin/PesertaDetail';
import Tracer from './pages/Admin/Tracer';
import AdminIzin from './pages/Admin/Izin';
import Groups from './pages/Admin/Groups';
import SertifikatAdmin from './pages/Admin/SertifikatAdmin';
import ManajemenMentor from './pages/Admin/ManajemenMentor';
import KuotaDivisi from './pages/Admin/KuotaDivisi';
import Statistik from './pages/Admin/Statistik';
import ProvisionLegacyAccounts from './pages/Admin/ProvisionLegacyAccounts';


// ==================== INTERN ====================

import DashboardIntern from './pages/Intern/Dashboard';
import Projek from './pages/Intern/Projek';
import Presensi from './pages/Intern/Presensi';
import Logbook from './pages/Intern/Logbook';
import Izin from './pages/Intern/Izin';
import Mentoring from './pages/Intern/Mentoring';
import Sertifikat from './pages/Intern/Sertifikat';


// ==================== MENTOR ====================

import DashboardMentor from './pages/Mentor/Dashboard';
import KelompokBinaan from './pages/Mentor/KelompokBinaan';
import MentoringMentor from './pages/Mentor/Mentoring';
import Penilaian from './pages/Mentor/Penilaian';


// ==================== SETTING ====================

import Akun from './pages/setting/Akun';
import Password from './pages/setting/Password';
import Kontak from './pages/setting/Kontak';
import Tampilan from './pages/setting/Tampilan';
import Tentang from './pages/setting/Tentang';


function RootRedirect() {
  const {
    user,
    profile,
    loading,
  } = useAuth();


  if (loading) {
    return null;
  }


  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }


  return (
    <Navigate
      to={`/${profile?.role ?? 'intern'}`}
      replace
    />
  );
}


export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* ==================== PUBLIC ==================== */}

          <Route
            path="/"
            element={<RootRedirect />}
          />

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/register"
            element={<Register />}
          />


          {/* ==================== ADMIN ==================== */}

          <Route
            element={
              <ProtectedRoute
                roles={['admin']}
              />
            }
          >
            <Route
              element={<Layout />}
            >

              <Route
                path="/admin"
                element={
                  <AdminHome />
                }
              />

              <Route
                path="/admin/pengajuan"
                element={
                  <Applicants />
                }
              />

              <Route
                path="/admin/peserta"
                element={
                  <Peserta />
                }
              />

              <Route
                path="/admin/peserta/:id"
                element={
                  <PesertaDetail />
                }
              />

              <Route
                path="/admin/mentor"
                element={
                  <ManajemenMentor />
                }
              />

              <Route
                path="/admin/izin"
                element={
                  <AdminIzin />
                }
              />

              <Route
                path="/admin/tracer"
                element={
                  <Tracer />
                }
              />

              <Route
                path="/admin/kelompok"
                element={
                  <Groups />
                }
              />

              <Route
                path="/admin/kuota"
                element={
                  <KuotaDivisi />
                }
              />

              <Route
                path="/admin/statistik"
                element={
                  <Statistik />
                }
              />

              <Route
                path="/admin/sertifikat"
                element={
                  <SertifikatAdmin />
                }
              />


              {/* ==================== TEMP PROVISIONING ==================== */}

              <Route
                path="/admin/provision-legacy"
                element={
                  <ProvisionLegacyAccounts />
                }
              />


              {/* ==================== SETTING ADMIN ==================== */}

              <Route
                path="/admin/setting/akun"
                element={
                  <Akun />
                }
              />

              <Route
                path="/admin/setting/tampilan"
                element={
                  <Tampilan />
                }
              />

              <Route
                path="/admin/setting/tentang"
                element={
                  <Tentang />
                }
              />


              {/* FALLBACK ADMIN */}

              <Route
                path="/admin/*"
                element={
                  <Navigate
                    to="/admin"
                    replace
                  />
                }
              />

            </Route>
          </Route>


          {/* ==================== INTERN ==================== */}

          <Route
            element={
              <ProtectedRoute
                roles={['intern']}
              />
            }
          >
            <Route
              element={<Layout />}
            >

              <Route
                path="/intern"
                element={
                  <DashboardIntern />
                }
              />

              <Route
                path="/intern/projek"
                element={
                  <Projek />
                }
              />

              <Route
                path="/intern/presensi"
                element={
                  <Presensi />
                }
              />

              <Route
                path="/intern/logbook"
                element={
                  <Logbook />
                }
              />

              <Route
                path="/intern/izin"
                element={
                  <Izin />
                }
              />

              <Route
                path="/intern/mentoring"
                element={
                  <Mentoring />
                }
              />

              <Route
                path="/intern/sertifikat"
                element={
                  <Sertifikat />
                }
              />


              {/* ==================== SETTING INTERN ==================== */}

              <Route
                path="/intern/setting/akun"
                element={
                  <Akun />
                }
              />

              <Route
                path="/intern/setting/password"
                element={
                  <Password />
                }
              />

              <Route
                path="/intern/setting/kontak"
                element={
                  <Kontak />
                }
              />

              <Route
                path="/intern/setting/tampilan"
                element={
                  <Tampilan />
                }
              />

              <Route
                path="/intern/setting/tentang"
                element={
                  <Tentang />
                }
              />


              {/* FALLBACK INTERN */}

              <Route
                path="/intern/*"
                element={
                  <Navigate
                    to="/intern"
                    replace
                  />
                }
              />

            </Route>
          </Route>


          {/* ==================== MENTOR ==================== */}

          <Route
            element={
              <ProtectedRoute
                roles={['mentor']}
              />
            }
          >
            <Route
              element={<Layout />}
            >

              <Route
                path="/mentor"
                element={
                  <DashboardMentor />
                }
              />

              <Route
                path="/mentor/kelompok"
                element={
                  <KelompokBinaan />
                }
              />

              <Route
                path="/mentor/penilaian"
                element={
                  <Penilaian />
                }
              />

              <Route
                path="/mentor/mentoring"
                element={
                  <MentoringMentor />
                }
              />


              {/* ==================== SETTING MENTOR ==================== */}

              <Route
                path="/mentor/setting/akun"
                element={
                  <Akun />
                }
              />

              <Route
                path="/mentor/setting/password"
                element={
                  <Password />
                }
              />

              <Route
                path="/mentor/setting/kontak"
                element={
                  <Kontak />
                }
              />

              <Route
                path="/mentor/setting/tampilan"
                element={
                  <Tampilan />
                }
              />

              <Route
                path="/mentor/setting/tentang"
                element={
                  <Tentang />
                }
              />


              {/* FALLBACK MENTOR */}

              <Route
                path="/mentor/*"
                element={
                  <Navigate
                    to="/mentor"
                    replace
                  />
                }
              />

            </Route>
          </Route>


          {/* ==================== GLOBAL FALLBACK ==================== */}

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}