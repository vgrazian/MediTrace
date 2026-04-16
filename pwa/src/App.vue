<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppNav from './components/AppNav.vue'
import HelpDrawer from './components/HelpDrawer.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import { initAuth, sanitizeEmailInput, sanitizeUsernameInput, useAuth } from './services/auth'
import { formatBuildTimestamp, getBuildTimestampIso } from './services/buildInfo'

const { currentUser, hasUsers, isInitialized, signIn, register, requestPasswordResetByEmail, supportsEmailReset } = useAuth()
const route = useRoute()
const isAuthRecoveryRoute = computed(() => route.path === '/auth/reset-password')

const username = ref('')
const password = ref('')

const regUsername = ref('')
const regFirstName = ref('')
const regLastName = ref('')
const regEmail = ref('')
const regPassword = ref('')
const regConfirmPassword = ref('')
const forgotEmail = ref('')
const forgotMessage = ref('')
const forgotBusy = ref(false)

const loginError = ref('')
const loginBusy = ref(false)
const buildTimestampLabel = formatBuildTimestamp('it-IT')
const buildTimestampIso = getBuildTimestampIso()

onMounted(() => initAuth())

function handleUsernameInput(event) {
  username.value = sanitizeUsernameInput(event.target.value)
}

function handleRegUsernameInput(event) {
  regUsername.value = sanitizeUsernameInput(event.target.value)
}

function handleRegEmailInput(event) {
  regEmail.value = sanitizeEmailInput(event.target.value)
}

function handleForgotEmailInput(event) {
  forgotEmail.value = sanitizeEmailInput(event.target.value)
}

async function handleLogin() {
  const normalizedUsername = username.value.trim()
  if (!normalizedUsername || !password.value) return

  loginBusy.value = true
  loginError.value = ''
  try {
    await signIn({ username: normalizedUsername, password: password.value })
    password.value = ''
  } catch (err) {
    loginError.value = err.message
  } finally {
    loginBusy.value = false
  }
}

async function handleForgotPassword() {
  const normalizedEmail = forgotEmail.value.trim()
  if (!normalizedEmail) return

  forgotBusy.value = true
  loginError.value = ''
  forgotMessage.value = ''

  try {
    await requestPasswordResetByEmail(normalizedEmail)
    forgotMessage.value = 'Se l\'indirizzo esiste, riceverai una email con il link per reimpostare la password.'
  } catch (err) {
    loginError.value = err.message
  } finally {
    forgotBusy.value = false
  }
}

async function handleRegister() {
  if (
    !regUsername.value.trim()
    || !regFirstName.value.trim()
    || !regLastName.value.trim()
    || !regEmail.value.trim()
    || !regPassword.value
    || !regConfirmPassword.value
  ) return

  loginBusy.value = true
  loginError.value = ''
  try {
    await register({
      username: regUsername.value.trim(),
      firstName: regFirstName.value.trim(),
      lastName: regLastName.value.trim(),
      email: regEmail.value.trim(),
      password: regPassword.value,
      confirmPassword: regConfirmPassword.value,
    })

    regFirstName.value = ''
    regLastName.value = ''
    regEmail.value = ''
    regPassword.value = ''
    regConfirmPassword.value = ''
  } catch (err) {
    loginError.value = err.message
  } finally {
    loginBusy.value = false
  }
}

</script>

<template>
  <div id="app-root">
    <div v-if="!isInitialized" class="loading">Caricamento...</div>

    <template v-else-if="!currentUser">
      <main v-if="isAuthRecoveryRoute">
        <RouterView />
      </main>

      <div v-else class="login-screen">
        <h1>MediTrace</h1>
        <p>Accesso con utenza e password</p>

        <div v-if="!hasUsers" class="auth-form">
          <label for="reg-username">Crea username</label>
          <input
            id="reg-username"
            v-model="regUsername"
            type="text"
            placeholder="operatore"
            autocomplete="username"
            maxlength="32"
            pattern="[a-z0-9._-]{3,32}"
            @input="handleRegUsernameInput"
          />

          <label for="reg-first-name">Nome</label>
          <input id="reg-first-name" v-model="regFirstName" type="text" placeholder="Mario" autocomplete="given-name" />

          <label for="reg-last-name">Cognome</label>
          <input id="reg-last-name" v-model="regLastName" type="text" placeholder="Rossi" autocomplete="family-name" />

          <label for="reg-email">Email</label>
          <input
            id="reg-email"
            v-model="regEmail"
            type="email"
            placeholder="mario.rossi@example.com"
            autocomplete="email"
            @input="handleRegEmailInput"
          />

          <label for="reg-password">Password</label>
          <input id="reg-password" v-model="regPassword" type="password" placeholder="Minimo 10 caratteri" autocomplete="new-password" />

          <label for="reg-confirm-password">Conferma password</label>
          <input id="reg-confirm-password" v-model="regConfirmPassword" type="password" placeholder="Ripeti password" autocomplete="new-password" @keyup.enter="handleRegister" />

          <button :disabled="loginBusy || !regUsername.trim() || !regFirstName.trim() || !regLastName.trim() || !regEmail.trim() || !regPassword || !regConfirmPassword" @click="handleRegister">
            {{ loginBusy ? 'Creazione account…' : 'Crea account admin e accedi' }}
          </button>
        </div>

        <div v-else class="auth-form">
          <label for="username-input">Username</label>
          <input
            id="username-input"
            v-model="username"
            type="text"
            placeholder="Inserisci username"
            autocomplete="username"
            maxlength="32"
            pattern="[a-z0-9._-]{3,32}"
            @input="handleUsernameInput"
          />

          <label for="password-input">Password</label>
          <input id="password-input" v-model="password" type="password" placeholder="Inserisci password" autocomplete="current-password" @keyup.enter="handleLogin" />

          <button :disabled="loginBusy || !username.trim() || !password" @click="handleLogin">
            {{ loginBusy ? 'Accesso in corso…' : 'Accedi' }}
          </button>

          <template v-if="supportsEmailReset">
            <label for="forgot-email-input" style="margin-top:.75rem">Password dimenticata</label>
            <input
              id="forgot-email-input"
              v-model="forgotEmail"
              type="email"
              placeholder="Inserisci email account"
              autocomplete="email"
              @input="handleForgotEmailInput"
              @keyup.enter="handleForgotPassword"
            />

            <button :disabled="forgotBusy || !forgotEmail.trim()" @click="handleForgotPassword">
              {{ forgotBusy ? 'Invio email…' : 'Invia link reset password' }}
            </button>
            <p v-if="forgotMessage" class="auth-help">{{ forgotMessage }}</p>
          </template>

        </div>

        <p v-if="loginError" class="login-error">{{ loginError }}</p>

        <p class="auth-help">
          Al primo avvio crea l'account amministratore. Gli altri utenti verranno creati dal pannello impostazioni e accederanno con username e password.
        </p>
        <p class="build-meta" :title="`Build ISO: ${buildTimestampIso}`">
          Build: {{ buildTimestampLabel }}
        </p>
      </div>
    </template>

    <template v-else>
      <AppNav />
      <main>
        <RouterView />
      </main>
      <HelpDrawer />
    </template>
    <ConfirmDialog />
  </div>
</template>
