import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

interface ProtectedRouteProps {
  allowedRoles: string[];
}

interface DecodedToken {
  id: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
    const token = localStorage.getItem('authToken');

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    try {
        const decodedToken = jwtDecode<DecodedToken>(token);
        const userRole = decodedToken.role;

        if (allowedRoles.includes(userRole)) {
            return <Outlet />;
        } else {
            // Redirect to a "not authorized" page or home page
            return <Navigate to="/" replace />;
        }
    } catch (error) {
        // Invalid token
        return <Navigate to="/login" replace />;
    }
};

export default ProtectedRoute;