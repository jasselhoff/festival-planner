import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { HomePage } from './pages/HomePage';
import { EventsPage } from './pages/EventsPage';
import { CreateEventPage } from './pages/CreateEventPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { EditEventPage } from './pages/EditEventPage';
import { GroupsPage } from './pages/GroupsPage';
import { GroupDetailPage } from './pages/GroupDetailPage';
import { JoinGroupPage } from './pages/JoinGroupPage';
import { CalendarPage } from './pages/CalendarPage';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/groups/join/:uuid" element={<JoinGroupPage />} />

            {/* Protected routes */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<HomePage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/create" element={<CreateEventPage />} />
              <Route path="/events/:id" element={<EventDetailPage />} />
              <Route path="/events/:id/edit" element={<EditEventPage />} />
              <Route path="/groups" element={<GroupsPage />} />
              <Route path="/groups/:id" element={<GroupDetailPage />} />
              <Route
                path="/groups/:groupId/events/:eventId/calendar"
                element={<CalendarPage />}
              />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#333',
              color: '#fff',
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
