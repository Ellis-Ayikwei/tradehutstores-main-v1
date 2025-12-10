// ProtectedRoute.tsx
import React, { ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';

import { IRootState } from '../store';
import { access } from 'fs';
import useIsAuthenticated from 'react-auth-kit/hooks/useIsAuthenticated'

+6

