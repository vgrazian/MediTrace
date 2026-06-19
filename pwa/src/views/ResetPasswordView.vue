<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../services/auth'

const { completePasswordRecovery } = useAuth()
const router = useRouter()
const route = useRoute()

const newPassword = ref('')
const confirmPassword = ref('')
const busy = ref(false)
const message = ref('')
const error = ref('')

function extractRecoveryToken() {
  const routeToken = String(route.query.token || route.query.recovery_token || '').trim()
  if (routeToken) return routeToken

  const href = String(window?.location?.href || '')
  if (!href) return ''

  try {
    const url = new URL(href)
    const directToken = String(url.searchParams.get('token') || url.searchParams.get('recovery_token') || '').trim()
    if (directToken) return directToken

    const hashIndex = href.indexOf('#')
    if (hashIndex >= 0) {
      const hashValue = href.slice(hashIndex + 1)
      const queryIndex = hashValue.indexOf('?')
      if (queryIndex >= 0) {
        const hashQuery = new URLSearchParams(hashValue.slice(queryIndex + 1))
        const hashToken = String(hashQuery.get('token') || hashQuery.get('recovery_token') || '').trim()
        if (hashToken) return hashToken
      }
    }
  } catch {
    return ''
  }

  return ''
}

async function submitRecovery() {
  if (!newPassword.value || !confirmPassword.value) return

  busy.value = true
  error.value = ''
  message.value = ''

  try {
    const token = extractRecoveryToken()
    await completePasswordRecovery({
      token,
      newPassword: newPassword.value,
      confirmPassword: confirmPassword.value,
    })

    message.value = 'Password aggiornata con successo. Ora puoi accedere con la nuova password.'
    newPassword.value = ''
    confirmPassword.value = ''
    setTimeout(() => {
      router.push('/')
    }, 1200)
  } catch (err) {
    error.value = err.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="login-screen">
    <h1>Reset Password</h1>
    <p>Imposta una nuova password per il tuo account MediTrace.</p>

    <div class="auth-form">
      <label for="new-password">Nuova password</label>
      <input
        id="new-password"
        v-model="newPassword"
        type="password"
        autocomplete="new-password"
        placeholder="Minimo 10 caratteri"
      />

      <label for="confirm-password">Conferma nuova password</label>
      <input
        id="confirm-password"
        v-model="confirmPassword"
        type="password"
        autocomplete="new-password"
        placeholder="Ripeti password"
        @keyup.enter="submitRecovery"
      />

      <button :disabled="busy || !newPassword || !confirmPassword" @click="submitRecovery">
        {{ busy ? 'Aggiornamento in corso…' : 'Aggiorna password' }}
      </button>
    </div>

    <p v-if="message" class="auth-help">{{ message }}</p>
    <p v-if="error" class="login-error">{{ error }}</p>
  </div>
</template>
