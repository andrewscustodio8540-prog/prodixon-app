import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isMockMode } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock session check
        if (isMockMode) {
            const savedUser = localStorage.getItem('mockUser');
            if (savedUser) {
                setUser(JSON.parse(savedUser));
            }
            setLoading(false);
            return;
        }

        const loadUserProfile = async (authUser) => {
            if (!authUser) {
                setUser(null);
                setLoading(false);
                return;
            }
            try {
                const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
                if (error) throw error;
                setUser({ ...authUser, company_id: profile?.company_id, role: profile?.role, full_name: profile?.full_name });
            } catch (err) {
                console.error("Error loading profile", err);
                setUser(authUser);
            }
            setLoading(false);
        };

        // Real Supabase session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            loadUserProfile(session?.user);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED' || _event === 'INITIAL_SESSION') {
                loadUserProfile(session?.user);
            } else if (_event === 'SIGNED_OUT') {
                setUser(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email, password) => {
        if (isMockMode) {
            // Mock Login logic
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    if (email && password) {
                        const mockUser = { id: 'mock-1', email, role: 'admin', company_id: 'cmp-001' };
                        setUser(mockUser);
                        localStorage.setItem('mockUser', JSON.stringify(mockUser));
                        resolve({ user: mockUser });
                    } else {
                        reject(new Error('Credenciais inválidas no modo Mock'));
                    }
                }, 1200);
            });
        }

        // Real Supabase login
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    };

    const signOut = async () => {
        if (isMockMode) {
            setUser(null);
            localStorage.removeItem('mockUser');
            return;
        }
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    return (
        <AuthContext.Provider value={{ user, signIn, signOut, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
