import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { paths } from '@/config/paths';
import { LoadingState } from '@/components/feedback';
import { AppProviders } from './AppProviders';
import { AppLayout } from './layout/AppLayout';
import { RequireAccess } from './RequireAccess';
import { NotFoundPage } from './NotFoundPage';
import { appRoutes, publicRoutes } from './routes';

export function App() {
  return (
    <AppProviders>
      <Suspense fallback={<LoadingState />}>
        <Routes>
          {publicRoutes.map(({ path, Page }) => (
            <Route key={path} path={path} element={<Page />} />
          ))}

          <Route element={<AppLayout />}>
            <Route index element={<Navigate to={paths.overview} replace />} />
            {appRoutes.map(({ path, Page, access }) => (
              <Route
                key={path}
                path={path}
                element={
                  <RequireAccess access={access}>
                    <Page />
                  </RequireAccess>
                }
              />
            ))}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </AppProviders>
  );
}
