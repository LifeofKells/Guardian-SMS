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
            const { data: userData } = await db.users.get(userId);
            if (userData && userData.role === 'client') {
                await loadClientData(userData);
                setUser(userData);
                return;
            }

            // Fallback for stored session when Firestore document is missing
            const storedUser = localStorage.getItem('clientPortalUserSession');
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser) as User;
                if (parsedUser.role === 'client') {
                    setUser(parsedUser);
                    setClient({
                        id: parsedUser.client_id || 'demo_client_id_001',
                        organization_id: parsedUser.organization_id || 'org_asorock_001',
                        name: 'TechGlobal HQ (Demo Client)',
                        status: 'active',
                        contact_name: parsedUser.full_name || 'Sarah Connor',
                        email: parsedUser.email,
                        address: '101 Cyberdyne Way, Suite 400',
                        billing_settings: { standard_rate: 55, holiday_rate: 82.5, emergency_rate: 95 }
                    });
                    setOrganization({
                        id: parsedUser.organization_id || 'org_asorock_001',
                        name: 'AsoRock Security Services',
                        owner_id: 'demo_admin_user',
                        created_at: new Date().toISOString(),
                        subscription_tier: 'professional',
                        subscription_status: 'active',
                        portal_enabled: true
                    });
                    return;
                }
            }
            logout();
        } catch (e) {
            console.error("Failed to load session", e);
            logout();
        } finally {
            setIsLoading(false);
        }
    };

    const loadClientData = async (userData: User) => {
        if (!userData.client_id || !userData.organization_id) return;

        try {
            const { data: clients } = await db.clients.select(userData.organization_id);
            const foundClient = clients?.find(c => c.id === userData.client_id);

            if (foundClient) {
                setClient(foundClient);
            } else {
                setClient({
                    id: userData.client_id,
                    organization_id: userData.organization_id,
                    name: 'TechGlobal HQ (Demo Client)',
                    status: 'active',
                    contact_name: userData.full_name || 'Sarah Connor',
                    email: userData.email,
                    address: '101 Cyberdyne Way, Suite 400',
                    billing_settings: { standard_rate: 55, holiday_rate: 82.5, emergency_rate: 95 }
                });
            }

            const { data: org } = await db.organizations.get(userData.organization_id);
            if (org) {
                setOrganization(org);
            } else {
                setOrganization({
                    id: userData.organization_id,
                    name: 'AsoRock Security Services',
                    owner_id: 'demo_admin_user',
                    created_at: new Date().toISOString(),
                    subscription_tier: 'professional',
                    subscription_status: 'active',
                    portal_enabled: true
                });
            }
        } catch (e) {
            console.error("Error loading client data", e);
        }
    };

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            let existingUser: User | null = null;
            const { data } = await db.users.getByEmail(email);
            if (data) {
                existingUser = data;
            }

            // Fallback for demo login if user record is not yet in Firestore
            if (!existingUser) {
                if (email.trim().toLowerCase() === 'client@guardian.com') {
                    existingUser = {
                        id: 'demo_client_user',
                        organization_id: 'org_asorock_001',
                        full_name: 'Sarah Connor (Client)',
                        email: 'client@guardian.com',
                        role: 'client',
                        client_id: 'demo_client_id_001',
                        avatar_url: 'https://i.pravatar.cc/150?u=client',
                        is_temporary_password: false
                    };
                } else {
                    throw new Error("Invalid email or password");
                }
            }

            if (existingUser.role !== 'client') {
                throw new Error("Access denied: Not a client account");
            }

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
