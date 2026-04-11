# Issue 9.1: Registration Security - Email Verification & Admin Notification

**Created:** 2026-04-07 09:40 CET  
**Category:** Security & Authentication  
**Priority:** P0 (Critical Security Issue)  
**Effort:** 6-8 hours  
**Impact:** High - Prevents unauthorized access and improves security posture  
**PR:** #53 (to be created)

## Problem Statement

### Current Registration Flow (INSECURE)

Analizzando [`auth.js:522-563`](pwa/src/services/auth.js:522-563), la registrazione attuale:

```javascript
async register({ username, password, confirmPassword, githubToken, firstName, lastName, email }) {
    // Validation...
    const newUser = await buildAuthUser({
        username: normalized,
        password,
        githubToken,
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        email: normalizedEmail,
        role: users.some(u => !u.disabled) ? 'operator' : 'admin',
    })
    
    users.push(newUser)
    await saveUsers(users)
    
    applySession(newUser)  // ⚠️ IMMEDIATE LOGIN - NO EMAIL VERIFICATION
    await writeSession(newUser)
    // ⚠️ NO ADMIN NOTIFICATION
}
```

### Security Issues:

1. **❌ No Email Verification**
   - Utente può registrarsi con email falsa
   - Accesso immediato senza conferma identità
   - Possibile registrazione multipla con email diverse

2. **❌ No Admin Notification**
   - Admin non sa quando nuovi utenti si registrano
   - Nessun controllo su chi accede al sistema
   - Impossibile bloccare registrazioni non autorizzate

3. **❌ Immediate Session Creation**
   - Utente ottiene accesso immediato
   - Nessun periodo di "pending approval"
   - Bypass completo del controllo amministrativo

### Risk Assessment:

| Risk | Severity | Likelihood | Impact |
|------|----------|------------|--------|
| Registrazione con email falsa | HIGH | HIGH | Accesso non tracciabile |
| Accesso non autorizzato | CRITICAL | MEDIUM | Violazione dati sanitari |
| Mancanza audit trail | HIGH | HIGH | Non conformità GDPR |
| Admin ignora nuovi utenti | MEDIUM | HIGH | Gestione utenti inefficace |

## Proposed Solution

### New Registration Flow (SECURE)

```
User Registration Request
         ↓
Email Verification Required
         ↓
Admin Notification Sent
         ↓
User Status: PENDING
         ↓
Admin Approval (optional)
         ↓
User Status: ACTIVE
         ↓
User Can Login
```

### Implementation Details

#### 1. Email Verification Flow

**Step 1: Registration Request**
```javascript
async register({ username, password, confirmPassword, githubToken, firstName, lastName, email }) {
    // Existing validation...
    
    const newUser = await buildAuthUser({
        username: normalized,
        password,
        githubToken,
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        email: normalizedEmail,
        role: users.some(u => !u.disabled) ? 'operator' : 'admin',
        status: 'pending_verification',  // NEW: User status
        verificationToken: crypto.randomUUID(),  // NEW: Verification token
        verificationSentAt: nowIso(),  // NEW: Timestamp
    })
    
    users.push(newUser)
    await saveUsers(users)
    
    // NEW: Send verification email via Supabase
    await sendVerificationEmail(newUser)
    
    // NEW: Notify admin
    await notifyAdminNewRegistration(newUser)
    
    // ⚠️ DO NOT create session yet
    // User must verify email first
    
    return {
        success: true,
        message: 'Registrazione completata. Controlla la tua email per verificare l\'account.',
        requiresVerification: true
    }
}
```

**Step 2: Email Verification**
```javascript
async verifyEmail({ token }) {
    const users = await loadUsers()
    const idx = users.findIndex(u => 
        u.status === 'pending_verification' && 
        u.verificationToken === token
    )
    
    if (idx < 0) {
        throw new Error('Token di verifica non valido o scaduto')
    }
    
    // Check token expiry (24 hours)
    const sentAt = new Date(users[idx].verificationSentAt)
    const now = new Date()
    const hoursSince = (now - sentAt) / (1000 * 60 * 60)
    
    if (hoursSince > 24) {
        throw new Error('Token di verifica scaduto. Richiedi un nuovo link.')
    }
    
    // Update user status
    users[idx] = {
        ...users[idx],
        status: 'active',  // or 'pending_approval' if admin approval required
        verificationToken: null,
        verifiedAt: nowIso(),
        updatedAt: nowIso()
    }
    
    await saveUsers(users)
    await appendAuthAudit('auth_email_verified', users[idx].username, {
        email: users[idx].email
    })
    
    // Notify admin that user verified email
    await notifyAdminEmailVerified(users[idx])
    
    return {
        success: true,
        username: users[idx].username,
        requiresApproval: users[idx].status === 'pending_approval'
    }
}
```

**Step 3: Resend Verification Email**
```javascript
async resendVerificationEmail({ email }) {
    const normalizedEmail = assertValidEmail(email)
    const users = await loadUsers()
    const user = users.find(u => 
        normalizeEmail(u.email) === normalizedEmail &&
        u.status === 'pending_verification'
    )
    
    if (!user) {
        throw new Error('Nessun account in attesa di verifica con questa email')
    }
    
    // Generate new token
    const idx = users.findIndex(u => u.username === user.username)
    users[idx] = {
        ...users[idx],
        verificationToken: crypto.randomUUID(),
        verificationSentAt: nowIso()
    }
    
    await saveUsers(users)
    await sendVerificationEmail(users[idx])
    
    await appendAuthAudit('auth_verification_email_resent', user.username, {
        email: normalizedEmail
    })
}
```

#### 2. Admin Notification System

**Notification via Supabase (Email)**
```javascript
async function notifyAdminNewRegistration(newUser) {
    if (!isSupabaseConfigured || !supabase) {
        console.warn('[auth] Admin notification skipped: Supabase not configured')
        return
    }
    
    // Get all admin users
    const users = await loadUsers()
    const admins = users.filter(u => !u.disabled && u.role === 'admin')
    
    for (const admin of admins) {
        try {
            // Send email via Supabase
            await supabase.auth.admin.inviteUserByEmail(admin.email, {
                data: {
                    notificationType: 'new_registration',
                    newUserEmail: newUser.email,
                    newUserName: `${newUser.firstName} ${newUser.lastName}`,
                    newUserUsername: newUser.username,
                    registeredAt: newUser.createdAt
                }
            })
        } catch (error) {
            console.error('[auth] Failed to notify admin:', admin.email, error)
        }
    }
    
    await appendAuthAudit('auth_admin_notified_new_registration', 'system', {
        newUser: newUser.username,
        notifiedAdmins: admins.length
    })
}

async function notifyAdminEmailVerified(user) {
    if (!isSupabaseConfigured || !supabase) return
    
    const users = await loadUsers()
    const admins = users.filter(u => !u.disabled && u.role === 'admin')
    
    for (const admin of admins) {
        try {
            await supabase.auth.admin.inviteUserByEmail(admin.email, {
                data: {
                    notificationType: 'email_verified',
                    userEmail: user.email,
                    userName: `${user.firstName} ${user.lastName}`,
                    username: user.username,
                    verifiedAt: user.verifiedAt
                }
            })
        } catch (error) {
            console.error('[auth] Failed to notify admin:', admin.email, error)
        }
    }
}
```

**In-App Notification (Dashboard Badge)**
```javascript
// Add to auth state
const state = reactive({
    currentUser: null,
    accessToken: null,
    isInitialized: false,
    hasUsers: false,
    pendingVerifications: 0,  // NEW: Count of pending verifications
    pendingApprovals: 0,      // NEW: Count of pending approvals
})

async function updatePendingCounts() {
    const users = await loadUsers()
    state.pendingVerifications = users.filter(u => 
        u.status === 'pending_verification'
    ).length
    state.pendingApprovals = users.filter(u => 
        u.status === 'pending_approval'
    ).length
}

// Call in initAuth() and after user status changes
```

#### 3. Admin Approval Flow (Optional)

```javascript
async approveUser({ username }) {
    const adminUser = await requireAdminSession()
    const users = await loadUsers()
    const idx = users.findIndex(u => 
        u.username === username &&
        u.status === 'pending_approval'
    )
    
    if (idx < 0) {
        throw new Error('Utente non trovato o non in attesa di approvazione')
    }
    
    users[idx] = {
        ...users[idx],
        status: 'active',
        approvedBy: adminUser.username,
        approvedAt: nowIso(),
        updatedAt: nowIso()
    }
    
    await saveUsers(users)
    await appendAuthAudit('auth_user_approved', adminUser.username, {
        approvedUser: username
    })
    
    // Notify user via email
    await notifyUserApproved(users[idx])
}

async rejectUser({ username, reason }) {
    const adminUser = await requireAdminSession()
    const users = await loadUsers()
    const idx = users.findIndex(u => 
        u.username === username &&
        (u.status === 'pending_verification' || u.status === 'pending_approval')
    )
    
    if (idx < 0) {
        throw new Error('Utente non trovato')
    }
    
    const rejectedUser = users[idx]
    users.splice(idx, 1)  // Remove user
    
    await saveUsers(users)
    await appendAuthAudit('auth_user_rejected', adminUser.username, {
        rejectedUser: username,
        reason
    })
    
    // Notify user via email
    await notifyUserRejected(rejectedUser, reason)
}
```

#### 4. Updated Login Flow

```javascript
async signIn({ username, password }) {
    const normalized = normalizeUsername(username)
    if (!normalized || !password) throw new Error('Inserisci username e password')
    
    const users = await loadUsers()
    const user = users.find(u => !u.disabled && u.username === normalized)
    
    if (!user) {
        await appendAuthAudit('auth_signin_failed', normalized, { reason: 'user-not-found' })
        throw new Error('Utente non trovato')
    }
    
    // NEW: Check user status
    if (user.status === 'pending_verification') {
        throw new Error('Account non verificato. Controlla la tua email per il link di verifica.')
    }
    
    if (user.status === 'pending_approval') {
        throw new Error('Account in attesa di approvazione da parte dell\'amministratore.')
    }
    
    if (user.status !== 'active') {
        throw new Error('Account non attivo. Contatta l\'amministratore.')
    }
    
    // Existing password check...
    const attemptedHash = await hashPassword(password, user.passwordSalt)
    if (attemptedHash !== user.passwordHash) {
        await appendAuthAudit('auth_signin_failed', normalized, { reason: 'invalid-password' })
        throw new Error('Password non valida')
    }
    
    applySession(user)
    await writeSession(user)
    await appendAuthAudit('auth_signin_success', user.username, { githubLogin: user.githubLogin })
}
```

## UI Changes

### 1. Registration View

**Before:**
```vue
<button @click="register">Registrati</button>
```

**After:**
```vue
<button @click="register">Registrati</button>

<!-- NEW: Success message -->
<div v-if="registrationSuccess" class="success-message">
  <h3>✅ Registrazione completata!</h3>
  <p>Abbiamo inviato un'email di verifica a <strong>{{ registeredEmail }}</strong></p>
  <p>Clicca sul link nell'email per attivare il tuo account.</p>
  <p class="help-text">Non hai ricevuto l'email? 
    <button @click="resendVerification" class="btn-link">Invia di nuovo</button>
  </p>
</div>
```

### 2. Admin Dashboard - Pending Users Panel

```vue
<template>
  <div class="admin-panel">
    <h2>Utenti in Attesa</h2>
    
    <!-- Pending Verifications -->
    <section v-if="pendingVerifications.length > 0">
      <h3>In Attesa di Verifica Email ({{ pendingVerifications.length }})</h3>
      <table>
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Nome</th>
            <th>Registrato</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in pendingVerifications" :key="user.username">
            <td>{{ user.username }}</td>
            <td>{{ user.email }}</td>
            <td>{{ user.firstName }} {{ user.lastName }}</td>
            <td>{{ formatDate(user.createdAt) }}</td>
            <td>
              <button @click="resendVerificationAdmin(user)" class="btn-secondary">
                Invia di nuovo
              </button>
              <button @click="rejectUser(user)" class="btn-danger">
                Rifiuta
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
    
    <!-- Pending Approvals (if approval flow enabled) -->
    <section v-if="pendingApprovals.length > 0">
      <h3>In Attesa di Approvazione ({{ pendingApprovals.length }})</h3>
      <table>
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Nome</th>
            <th>Verificato</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in pendingApprovals" :key="user.username">
            <td>{{ user.username }}</td>
            <td>{{ user.email }}</td>
            <td>{{ user.firstName }} {{ user.lastName }}</td>
            <td>{{ formatDate(user.verifiedAt) }}</td>
            <td>
              <button @click="approveUser(user)" class="btn-primary">
                Approva
              </button>
              <button @click="rejectUser(user)" class="btn-danger">
                Rifiuta
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
    
    <!-- No pending users -->
    <div v-if="pendingVerifications.length === 0 && pendingApprovals.length === 0" class="empty-state">
      <p>Nessun utente in attesa</p>
    </div>
  </div>
</template>
```

### 3. Navigation Badge

```vue
<template>
  <nav>
    <router-link to="/impostazioni">
      Impostazioni
      <span v-if="pendingCount > 0" class="badge">{{ pendingCount }}</span>
    </router-link>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useAuth } from '@/services/auth'

const { pendingVerifications, pendingApprovals } = useAuth()

const pendingCount = computed(() => 
  pendingVerifications.value + pendingApprovals.value
)
</script>

<style scoped>
.badge {
  background: var(--danger-color);
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 0.75rem;
  margin-left: 0.5rem;
}
</style>
```

## Email Templates

### 1. Verification Email

```
Subject: Verifica il tuo account MediTrace

Ciao {{ firstName }},

Grazie per esserti registrato a MediTrace!

Per completare la registrazione, clicca sul link qui sotto per verificare il tuo indirizzo email:

{{ verificationLink }}

Questo link scadrà tra 24 ore.

Se non hai richiesto questa registrazione, ignora questa email.

---
MediTrace Team
```

### 2. Admin Notification - New Registration

```
Subject: [MediTrace] Nuova registrazione utente

Un nuovo utente si è registrato su MediTrace:

Nome: {{ firstName }} {{ lastName }}
Email: {{ email }}
Username: {{ username }}
Data registrazione: {{ registeredAt }}

L'utente deve verificare la propria email prima di poter accedere.

Accedi al pannello amministratore per gestire gli utenti:
{{ adminPanelLink }}

---
MediTrace System
```

### 3. Admin Notification - Email Verified

```
Subject: [MediTrace] Utente ha verificato l'email

L'utente {{ firstName }} {{ lastName }} ({{ username }}) ha verificato il proprio indirizzo email.

Email: {{ email }}
Verificato: {{ verifiedAt }}

{{ #if requiresApproval }}
L'utente è ora in attesa della tua approvazione per accedere al sistema.

Accedi al pannello amministratore per approvare o rifiutare:
{{ adminPanelLink }}
{{ /if }}

---
MediTrace System
```

### 4. User Approved

```
Subject: Il tuo account MediTrace è stato approvato

Ciao {{ firstName }},

Il tuo account MediTrace è stato approvato!

Ora puoi accedere al sistema con le tue credenziali:
{{ loginLink }}

Username: {{ username }}

---
MediTrace Team
```

### 5. User Rejected

```
Subject: Registrazione MediTrace non approvata

Ciao {{ firstName }},

La tua richiesta di registrazione a MediTrace non è stata approvata.

{{ #if reason }}
Motivo: {{ reason }}
{{ /if }}

Se ritieni che si tratti di un errore, contatta l'amministratore del sistema.

---
MediTrace Team
```

## Implementation Plan

### Phase 1: Core Email Verification (4 hours)

1. **Update User Schema** (30 min)
   - Add `status` field (pending_verification, pending_approval, active, rejected)
   - Add `verificationToken` field
   - Add `verificationSentAt` field
   - Add `verifiedAt` field
   - Add `approvedBy` and `approvedAt` fields

2. **Implement Verification Functions** (2 hours)
   - `sendVerificationEmail()`
   - `verifyEmail()`
   - `resendVerificationEmail()`
   - Update `register()` to not create session
   - Update `signIn()` to check status

3. **Create Verification View** (1 hour)
   - `/verify-email?token=xxx` route
   - Success/error messages
   - Resend link

4. **Update Registration View** (30 min)
   - Show success message after registration
   - Add resend verification button

### Phase 2: Admin Notification (2 hours)

1. **Implement Notification Functions** (1 hour)
   - `notifyAdminNewRegistration()`
   - `notifyAdminEmailVerified()`
   - `notifyUserApproved()`
   - `notifyUserRejected()`

2. **Create Admin Panel** (1 hour)
   - Pending users section in ImpostazioniView
   - Approve/reject buttons
   - Resend verification button
   - Badge in navigation

### Phase 3: Testing (2 hours)

1. **Unit Tests** (1 hour)
   - Test verification flow
   - Test admin notification
   - Test status checks in signIn

2. **E2E Tests** (1 hour)
   - Test registration with verification
   - Test admin approval flow
   - Test email resend

## Configuration

Add to `.env.local`:

```bash
# Registration Settings
VITE_REQUIRE_EMAIL_VERIFICATION=true
VITE_REQUIRE_ADMIN_APPROVAL=false  # Optional: require admin approval after verification
VITE_VERIFICATION_TOKEN_EXPIRY_HOURS=24

# Supabase (required for email)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Security Benefits

1. ✅ **Email Ownership Verified** - Prevents fake registrations
2. ✅ **Admin Awareness** - Admins know who's accessing the system
3. ✅ **Audit Trail** - All registrations logged
4. ✅ **GDPR Compliance** - Verified email for data processing consent
5. ✅ **Spam Prevention** - Reduces automated registrations
6. ✅ **Access Control** - Optional admin approval adds extra security layer

## Migration Strategy

### For Existing Users

```javascript
async function migrateExistingUsers() {
    const users = await loadUsers()
    let updated = false
    
    for (let i = 0; i < users.length; i++) {
        if (!users[i].status) {
            users[i] = {
                ...users[i],
                status: 'active',  // Existing users are already active
                verifiedAt: users[i].createdAt,  // Mark as verified
                updatedAt: nowIso()
            }
            updated = true
        }
    }
    
    if (updated) {
        await saveUsers(users)
        console.log('[auth] Migrated existing users to new status system')
    }
}

// Call in initAuth()
```

## Testing Checklist

- [ ] New user registers and receives verification email
- [ ] Verification link works and activates account
- [ ] Expired verification link shows error
- [ ] User cannot login before verification
- [ ] Admin receives notification on new registration
- [ ] Admin receives notification on email verification
- [ ] Admin can approve/reject users (if approval enabled)
- [ ] User receives approval/rejection notification
- [ ] Resend verification works
- [ ] Existing users migrated correctly
- [ ] All audit events logged

## Related Issues

- Issue 1.1: Error Handling (✅ Completed - PR #46)
- Issue 4.1: Destructive Actions (✅ Completed - PR #49)
- Security Secrets Policy (docs/security-secrets-policy.md)

---

**Status:** Ready for implementation  
**Priority:** P0 (Critical Security Issue)  
**Estimated Effort:** 6-8 hours  
**PR:** #53 (to be created after PR #50 and #52)