<script setup>
import { ref, onMounted } from 'vue'
import AppNav from './components/AppNav.vue'
import { initAuth, useAuth } from './services/auth'

const { currentUser, isInitialized, signIn } = useAuth()
const pat = ref('')
const loginError = ref('')
const loginBusy = ref(false)

onMounted(() => initAuth())

async function handleLogin() {
  const trimmed = pat.value.trim()
  if (!trimmed) return
  loginBusy.value = true
  loginError.value = ''
  try {
    await signIn(trimmed)
    pat.value = ''
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
        <p>Gestione terapie farmacologiche</p>

        <div class="pat-form">
          <label for="pat-input">GitHub Personal Access Token</label>
          <input
            id="pat-input"
            v-model="pat"
            type="password"
            placeholder="github_pat_…"
            autocomplete="off"
            @keyup.enter="handleLogin"
          />
          <button :disabled="loginBusy || !pat.trim()" @click="handleLogin">
            {{ loginBusy ? 'Verifica in corso…' : 'Accedi' }}
          </button>
          <p v-if="loginError" class="login-error">{{ loginError }}</p>
        </div>

        <p class="pat-help">
          Crea un token su
          <a href="https://github.com/settings/tokens" target="_blank" rel="noopener">github.com/settings/tokens</a>
          con permesso <strong>Gists → Read and write</strong>.
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
