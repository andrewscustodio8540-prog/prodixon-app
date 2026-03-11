import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Check subscription status
    const isSubscribed = user.subscription_status === 'active' || user.subscription_status === 'trialing';

    if (!isSubscribed) {
        return <Navigate to="/pricing" replace />;
    }

    return children;
}
