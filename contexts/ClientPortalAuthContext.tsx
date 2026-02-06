import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/db';
import { Client, User, Organization } from '../lib/types';

interface ClientPortalAuthContextType {
    user: User | null;
    clientPortalUser: any; // Deprecated, keeping for compat if needed, but likely removing usage
    client: Client | null;
    organization: Organization | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

const ClientPortalAuthContext = createContext<ClientPortalAuthContextType | undefined>(undefined);

export function ClientPortalAuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [client, setClient] = useState<Client | null>(null);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for existing session
        const storedUser = localStorage.getItem('clientPortalUserSession');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser) as User;
            // Validate session with fresh fetch (optional but strict)
            loadUserSession(parsedUser.id);
        } else {
            setIsLoading(false);
        }
    }, []);

    const loadUserSession = async (userId: string) => {
        try {
            const { data: userData, error } = await db.users.get(userId);
            if (error || !userData) {
                logout(); // Invalid session
                return;
            }

            if (userData.role !== 'client' || !userData.client_id) {
                console.error("User is not a client user");
                logout();
                return;
            }

            // Load associated client and organization
            await loadClientData(userData);
            setUser(userData);
        } catch (e) {
            console.error("Failed to load session", e);
            logout();
        } finally {
            setIsLoading(false);
        }
    };

    const loadClientData = async (userData: User) => {
        if (!userData.client_id || !userData.organization_id) return;

        // Fetch Client
        try {
            // Since we don't have direct getClient(id) exposed clearly in the quick view of db.ts (it fetches collections), 
            // we might need to filter. Or typically detailed get is efficient.
            // db.clients.select(orgId) gets all. Let's rely on finding it there for now or add a helper if needed.
            // Looking at db.ts, there is no direct get(id) for clients, only select(orgId).
            // We can fetch all and find, or just mock the direct get if performance isn't key for this demo.
            // Actually wait, let's use the select and find.

            const { data: clients } = await db.clients.select(userData.organization_id);
            const foundClient = clients?.find(c => c.id === userData.client_id);

            if (foundClient) {
                setClient(foundClient);
            }

            // Fetch Organization
            const { data: org } = await db.organizations.get(userData.organization_id);
            if (org) {
                setOrganization(org);
            }

        } catch (e) {
            console.error("Error loading client data", e);
        }
    };

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            // 1. Authenticate (Mock: We just look up user by email)
            const { data: existingUser, error } = await db.users.getByEmail(email);

            if (error || !existingUser) {
                throw new Error("Invalid email or password");
            }

            // Verify Password (Mock: accept any if user exists, or check mock field)
            // In a real app, this is where hash comparison happens.

            // Verify Role
            if (existingUser.role !== 'client') {
                throw new Error("Access denied: Not a client account");
            }

            // Success
            await loadClientData(existingUser);
            setUser(existingUser);
            localStorage.setItem('clientPortalUserSession', JSON.stringify(existingUser));

        } catch (err) {
            console.error("Login failed", err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        setClient(null);
        setOrganization(null);
        localStorage.removeItem('clientPortalUserSession');
    };

    return (
        <ClientPortalAuthContext.Provider
            value={{
                user,
                clientPortalUser: null, // removing this legacy prop
                client,
                organization,
                isLoading,
                login,
                logout,
            }}
        >
            {children}
        </ClientPortalAuthContext.Provider>
    );
}

export function useClientPortalAuth() {
    const context = useContext(ClientPortalAuthContext);
    if (context === undefined) {
        throw new Error('useClientPortalAuth must be used within a ClientPortalAuthProvider');
    }
    return context;
}
