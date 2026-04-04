<script setup>
import { ref, onMounted } from 'vue'
import AppNav from './components/AppNav.vue'
import { initAuth, useAuth } from './services/auth'

const { currentUser, hasUsers, isInitialized, signIn, register } = useAuth()

const username = ref('')
const password = ref('')

const regUsername = ref('')
const regPassword = ref('')
const regConfirmPassword = ref('')
const regGithubToken = ref('')

const loginError = ref('')
const loginBusy = ref(false)

onMounted(() => initAuth())

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

async function handleRegister() {
  if (!regUsername.value.trim() || !regPassword.value || !regConfirmPassword.value || !regGithubToken.value.trim()) return

  loginBusy.value = true
  loginError.value = ''
  try {
    await register({
      username: regUsername.value.trim(),
      password: regPassword.value,
      confirmPassword: regConfirmPassword.value,
      githubToken: regGithubToken.value.trim(),
    })

    regPassword.value = ''
    regConfirmPassword.value = ''
    regGithubToken.value = ''
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
      <div class="login-screen">
        <h1>MediTrace</h1>
        <p>Accesso con utenza e password</p>

        <div v-if="!hasUsers" class="auth-form">
          <label for="reg-username">Crea username</label>
          <input id="reg-username" v-model="regUsername" type="text" placeholder="operatore" autocomplete="username" />

          <label for="reg-password">Password</label>
          <input id="reg-password" v-model="regPassword" type="password" placeholder="Minimo 8 caratteri" autocomplete="new-password" />

          <label for="reg-confirm-password">Conferma password</label>
          <input id="reg-confirm-password" v-model="regConfirmPassword" type="password" placeholder="Ripeti password" autocomplete="new-password" @keyup.enter="handleRegister" />

          <label for="reg-gh-token">Token GitHub (solo setup iniziale sync)</label>
          <input id="reg-gh-token" v-model="regGithubToken" type="password" placeholder="github_pat_..." autocomplete="off" />

          <button :disabled="loginBusy || !regUsername.trim() || !regPassword || !regConfirmPassword || !regGithubToken.trim()" @click="handleRegister">
            {{ loginBusy ? 'Creazione account…' : 'Crea account e accedi' }}
          </button>
        </div>

        <div v-else class="auth-form">
          <label for="username-input">Username</label>
          <input id="username-input" v-model="username" type="text" placeholder="Inserisci username" autocomplete="username" />

          <label for="password-input">Password</label>
          <input id="password-input" v-model="password" type="password" placeholder="Inserisci password" autocomplete="current-password" @keyup.enter="handleLogin" />

          <button :disabled="loginBusy || !username.trim() || !password" @click="handleLogin">
            {{ loginBusy ? 'Accesso in corso…' : 'Accedi' }}
          </button>
        </div>

        <p v-if="loginError" class="login-error">{{ loginError }}</p>

        <p class="auth-help">
          Al primo avvio crea un account operatore. I successivi accessi useranno solo username e password.
        </p>
      </div>
    </template>

    <template v-else>
      <AppNav />
      <main>
        <RouterView />
      </main>
    </template>
  </div>
</template>
