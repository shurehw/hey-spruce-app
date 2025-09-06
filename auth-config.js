// Supabase Authentication Configuration
// This file handles all authentication logic for the portal system

const SUPABASE_URL = 'https://uokmehjqcxmcoavnszid.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVva21laGpxY3htY29hdm5zemlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4NzgzNzksImV4cCI6MjA1MjQ1NDM3OX0.VmJTh44H1VCCRhLQFPMiXomWNQOQzLqvxqxQw0JX9qo';

// Initialize Supabase client
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Authentication State Management
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.userProfile = null;
        this.permissions = [];
        this.initializeAuth();
    }

    async initializeAuth() {
        if (!supabase) {
            console.error('Supabase client not initialized');
            return;
        }

        // Check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session) {
            this.currentUser = session.user;
            await this.loadUserProfile();
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN') {
                this.currentUser = session.user;
                await this.loadUserProfile();
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this.userProfile = null;
                this.permissions = [];
            }
        });
    }

    async loadUserProfile() {
        if (!this.currentUser) return;

        try {
            // Get user profile
            const { data: profile, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', this.currentUser.id)
                .single();

            if (error) throw error;
            this.userProfile = profile;

            // Load permissions
            await this.loadPermissions();
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }

    async loadPermissions() {
        if (!this.currentUser) return;

        try {
            const { data: permissions, error } = await supabase
                .from('user_permissions')
                .select('*')
                .eq('user_id', this.currentUser.id);

            if (error) throw error;
            this.permissions = permissions || [];
        } catch (error) {
            console.error('Error loading permissions:', error);
        }
    }

    async signIn(email, password, portal) {
        try {
            // Sign in with Supabase Auth
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            // Check if user has access to the requested portal
            await this.loadUserProfile();
            
            if (!this.hasPortalAccess(portal)) {
                await this.signOut();
                throw new Error(`You don't have access to the ${portal} portal`);
            }

            // Store portal preference
            localStorage.setItem('lastPortal', portal);

            return { success: true, user: data.user, profile: this.userProfile };
        } catch (error) {
            console.error('Sign in error:', error);
            return { success: false, error: error.message };
        }
    }

    async signUp(email, password, fullName, role = 'client', companyName = null) {
        try {
            // Create auth user
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        role: role,
                        company_name: companyName
                    }
                }
            });

            if (error) throw error;

            return { success: true, user: data.user, message: 'Please check your email to verify your account' };
        } catch (error) {
            console.error('Sign up error:', error);
            return { success: false, error: error.message };
        }
    }

    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            // Clear local storage
            localStorage.removeItem('lastPortal');
            
            // Redirect to login
            window.location.href = '/portal-login.html';
        } catch (error) {
            console.error('Sign out error:', error);
        }
    }

    async resetPassword(email) {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password.html`
            });

            if (error) throw error;
            return { success: true, message: 'Password reset email sent' };
        } catch (error) {
            console.error('Password reset error:', error);
            return { success: false, error: error.message };
        }
    }

    async updatePassword(newPassword) {
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Password update error:', error);
            return { success: false, error: error.message };
        }
    }

    hasPortalAccess(portal) {
        if (!this.userProfile) return false;

        // Map portal names to roles
        const portalRoleMap = {
            'client': ['client', 'admin'],
            'admin': ['admin'],
            'subcontractor': ['subcontractor', 'admin']
        };

        const allowedRoles = portalRoleMap[portal] || [];
        return allowedRoles.includes(this.userProfile.role) || 
               (this.userProfile.portal_access && this.userProfile.portal_access.includes(portal));
    }

    hasPermission(resource, action) {
        // Admins have all permissions
        if (this.userProfile && this.userProfile.role === 'admin') {
            return true;
        }

        // Check specific permissions
        return this.permissions.some(p => 
            p.resource === resource && p.action === action
        );
    }

    canAccessWorkOrder(workOrderId) {
        // Check if user is assigned to or created the work order
        return this.hasPermission('work_orders', 'read') || 
               this.userProfile.role === 'admin';
    }

    canEditWorkOrder(workOrderId) {
        return this.hasPermission('work_orders', 'update') || 
               this.userProfile.role === 'admin';
    }

    canCreateInvoice() {
        return this.hasPermission('invoices', 'create') || 
               this.userProfile.role === 'admin';
    }

    canViewAllInvoices() {
        return this.hasPermission('invoices', 'read') || 
               this.userProfile.role === 'admin' ||
               this.userProfile.role === 'client';
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getUserProfile() {
        return this.userProfile;
    }

    getUserRole() {
        return this.userProfile ? this.userProfile.role : null;
    }

    getUserName() {
        return this.userProfile ? this.userProfile.full_name : 'User';
    }

    getUserEmail() {
        return this.currentUser ? this.currentUser.email : null;
    }

    getUserCompany() {
        return this.userProfile ? this.userProfile.company_name : null;
    }
}

// Session Management
class SessionManager {
    constructor(authManager) {
        this.authManager = authManager;
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.warningTimeout = 25 * 60 * 1000; // Warning at 25 minutes
        this.activityTimer = null;
        this.warningTimer = null;
        this.initializeSessionManagement();
    }

    initializeSessionManagement() {
        // Reset timers on user activity
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, () => this.resetTimers(), true);
        });

        this.resetTimers();
    }

    resetTimers() {
        // Clear existing timers
        if (this.activityTimer) clearTimeout(this.activityTimer);
        if (this.warningTimer) clearTimeout(this.warningTimer);

        if (!this.authManager.isAuthenticated()) return;

        // Set warning timer
        this.warningTimer = setTimeout(() => {
            this.showSessionWarning();
        }, this.warningTimeout);

        // Set logout timer
        this.activityTimer = setTimeout(() => {
            this.handleSessionTimeout();
        }, this.sessionTimeout);
    }

    showSessionWarning() {
        const remainingTime = 5; // 5 minutes remaining
        
        if (confirm(`Your session will expire in ${remainingTime} minutes. Would you like to continue?`)) {
            this.resetTimers();
        }
    }

    handleSessionTimeout() {
        alert('Your session has expired. Please log in again.');
        this.authManager.signOut();
    }
}

// Protected Route Management
class RouteProtection {
    constructor(authManager) {
        this.authManager = authManager;
        this.protectedRoutes = {
            '/client-portal.html': ['client', 'admin'],
            '/supplier-portal.html': ['admin'],
            '/subcontractor-portal.html': ['subcontractor', 'admin']
        };
    }

    async checkAccess() {
        const currentPath = window.location.pathname;
        
        // Check if current route is protected
        if (!this.protectedRoutes[currentPath]) return true;

        // Check if user is authenticated
        if (!this.authManager.isAuthenticated()) {
            window.location.href = '/portal-login.html?redirect=' + encodeURIComponent(currentPath);
            return false;
        }

        // Wait for profile to load
        let attempts = 0;
        while (!this.authManager.userProfile && attempts < 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        // Check role-based access
        const allowedRoles = this.protectedRoutes[currentPath];
        const userRole = this.authManager.getUserRole();

        if (!allowedRoles.includes(userRole)) {
            alert('You do not have permission to access this page.');
            window.location.href = '/portal-login.html';
            return false;
        }

        return true;
    }
}

// Initialize managers
let authManager, sessionManager, routeProtection;

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize auth manager
    authManager = new AuthManager();
    
    // Initialize session manager
    sessionManager = new SessionManager(authManager);
    
    // Initialize route protection
    routeProtection = new RouteProtection(authManager);
    
    // Check access for current page
    await routeProtection.checkAccess();
});

// Export for use in other files
window.AuthManager = authManager;
window.SessionManager = sessionManager;
window.RouteProtection = routeProtection;