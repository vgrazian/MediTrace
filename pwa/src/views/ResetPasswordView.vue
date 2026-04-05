<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../services/auth'

const { completePasswordRecovery } = useAuth()
const router = useRouter()

const newPassword = ref('')
const confirmPassword = ref('')
const busy = ref(false)
const message = ref('')
const error = ref('')

async function submitRecovery() {
  if (!newPassword.value || !confirmPassword.value) return

  busy.value = true
  error.value = ''
  message.value = ''

  try {
    await completePasswordRecovery({
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
