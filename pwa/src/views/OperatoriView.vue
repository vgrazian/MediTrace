<script setup>
import { computed, ref, onMounted } from 'vue'
import { useAuth } from '../services/auth'
import { useHelpNavigation } from '../composables/useHelpNavigation'
import { db } from '../db'

const { currentUser, listUsers, createUser, setUserDisabled, deleteUser, setUserDefaultResidenza } = useAuth()
const { goToHelpSection } = useHelpNavigation()

const canManage = computed(() => currentUser.value?.role === 'admin')
const users = ref([])
const usersBusy = ref(false)
const usersMessage = ref('')

// New user form
const newUsername = ref('')
const newFirstName = ref('')
const newLastName = ref('')
const newEmail = ref('')
const newPhone = ref('')
const newPassword = ref('')
const newRole = ref('operator')
const newIsSeeded = ref(false)
const newDefaultResidenzaId = ref('')
const newBusy = ref(false)
const newMessage = ref('')

// Available residenze for dropdown
const residenze = ref([])

const passwordPolicy = computed(() => {
  const p = newPassword.value || ''
  return {
    minLength: p.length >= 10,
    hasUppercase: /[A-Z]/.test(p),
    hasLowercase: /[a-z]/.test(p),
    hasDigit: /[0-9]/.test(p),
    hasSymbol: /[^A-Za-z0-9]/.test(p),
  }
})

function suggestUsername(fn, ln) {
  const n = (fn || '').replace(/[^a-zA-Z]/g, '').toLowerCase().slice(0, 8)
  const c = (ln || '').replace(/[^a-zA-Z]/g, '').toLowerCase().slice(0, 7)
  return n + c
}

async function refreshUsers() {
  if (!canManage.value) return
  usersBusy.value = true
  try {
    users.value = await listUsers()
  } catch (e) {
    usersMessage.value = 'Errore caricamento utenti: ' + e.message
  } finally {
    usersBusy.value = false
  }
}

async function loadResidenze() {
  try {
    const rooms = await db.rooms.toArray()
    residenze.value = rooms
      .filter(r => !r.deletedAt)
      .map(r => ({ id: r.id, label: r.codice || r.nome || r.id }))
      .sort((a, b) => a.label.localeCompare(b.label))
  } catch {
    residenze.value = []
  }
}

async function handleCreateUser() {
  newBusy.value = true
  newMessage.value = ''
  try {
    await createUser({
      username: newUsername.value.trim(),
      firstName: newFirstName.value.trim(),
      lastName: newLastName.value.trim(),
      email: newEmail.value.trim(),
      phone: newPhone.value.trim(),
      password: newPassword.value,
      role: newRole.value,
      isSeeded: newIsSeeded.value,
      defaultResidenzaId: newDefaultResidenzaId.value || null,
    })
    newUsername.value = ''
    newFirstName.value = ''
    newLastName.value = ''
    newEmail.value = ''
    newPhone.value = ''
    newPassword.value = ''
    newDefaultResidenzaId.value = ''
    newMessage.value = 'Utente creato con successo'
    await refreshUsers()
  } catch (e) {
    newMessage.value = 'Errore: ' + e.message
  } finally {
    newBusy.value = false
  }
}

async function handleToggleAdmin(user) {
  if (user.username === currentUser.value?.username) return
  // admin toggle handled via profile update
}

async function handleDisableUser(username) {
  try {
    await setUserDisabled({ username, disabled: true })
    usersMessage.value = `Utente ${username} disattivato`
    await refreshUsers()
  } catch (e) {
    usersMessage.value = 'Errore: ' + e.message
  }
}

async function handleEnableUser(username) {
  try {
    await setUserDisabled({ username, disabled: false })
    usersMessage.value = `Utente ${username} riattivato`
    await refreshUsers()
  } catch (e) {
    usersMessage.value = 'Errore: ' + e.message
  }
}

async function handleDeleteUser(username) {
  if (!confirm(`Eliminare definitivamente l'utente ${username}?`)) return
  try {
    await deleteUser(username)
    usersMessage.value = `Utente ${username} eliminato`
    await refreshUsers()
  } catch (e) {
    usersMessage.value = 'Errore: ' + e.message
  }
}

async function handleDefaultResidenzaChange(user, newValue) {
  try {
    await setUserDefaultResidenza({ username: user.username, defaultResidenzaId: newValue || null })
    usersMessage.value = `Residenza predefinita aggiornata per ${user.username}`
    await refreshUsers()
  } catch (e) {
    usersMessage.value = 'Errore: ' + e.message
  }
}

function residenzaLabel(residenzaId) {
  if (!residenzaId) return 'Ultima utilizzata'
  const r = residenze.value.find(x => x.id === residenzaId)
  return r ? r.label : residenzaId
}

onMounted(() => {
  refreshUsers()
  loadResidenze()
})
</script>

<template>
  <div class="view">
    <div class="view-heading">
      <h2>Operatori</h2>
      <button class="help-btn" @click="goToHelpSection('operatori')">Aiuto</button>
    </div>

    <p v-if="!canManage" class="card muted" style="padding:1.5rem">
      Accesso riservato agli amministratori.
    </p>

    <template v-if="canManage">
      <div class="card">
        <p><strong>Aggiungi operatore</strong></p>
        <div class="import-form" style="margin-top:.5rem">
          <label>Nome <input v-model="newFirstName" type="text" autocomplete="given-name" /></label>
          <label>Cognome <input v-model="newLastName" type="text" autocomplete="family-name" /></label>
          <label>
            Username
            <input
              v-model="newUsername"
              type="text"
              autocomplete="username"
              :placeholder="suggestUsername(newFirstName, newLastName)"
            />
          </label>
          <label>Email <input v-model="newEmail" type="email" autocomplete="email" /></label>
          <label>Telefono <input v-model="newPhone" type="tel" placeholder="+39 333 1234567" /></label>
          <label>Password iniziale <input v-model="newPassword" type="password" /></label>
          <p class="muted" style="font-size:.8rem">
            {{ passwordPolicy.minLength ? '✅' : '❌' }} 10+ caratteri
            {{ passwordPolicy.hasUppercase ? '✅' : '❌' }} maiuscola
            {{ passwordPolicy.hasLowercase ? '✅' : '❌' }} minuscola
            {{ passwordPolicy.hasDigit ? '✅' : '❌' }} numero
            {{ passwordPolicy.hasSymbol ? '✅' : '❌' }} simbolo
          </p>
          <label>Ruolo
            <select v-model="newRole">
              <option value="operator">Operatore</option>
              <option value="admin">Amministratore</option>
            </select>
          </label>
          <label>Residenza predefinita
            <select v-model="newDefaultResidenzaId">
              <option value="">Ultima utilizzata</option>
              <option v-for="r in residenze" :key="r.id" :value="r.id">{{ r.label }}</option>
            </select>
          </label>
          <label style="display:flex;align-items:center;gap:.5rem">
            <input v-model="newIsSeeded" type="checkbox" />
            Utente di prova
          </label>
          <button
            :disabled="newBusy || !newUsername || !newFirstName || !newLastName || !newEmail || !newPassword"
            @click="handleCreateUser"
          >
            {{ newBusy ? 'Creazione…' : 'Crea operatore' }}
          </button>
          <p v-if="newMessage" class="muted" style="margin-top:.5rem">{{ newMessage }}</p>
        </div>
      </div>

      <div class="card">
        <p><strong>Elenco operatori</strong> ({{ users.length }})</p>
        <p v-if="usersMessage" class="muted">{{ usersMessage }}</p>
        <div class="dataset-frame" style="margin-top:.5rem;max-height:24rem">
          <table class="conflict-table" style="min-width:800px">
            <thead>
              <tr>
                <th>Username</th>
                <th>Nome</th>
                <th>Cognome</th>
                <th>Email</th>
                <th>Ruolo</th>
                <th>Residenza predef.</th>
                <th>Prova</th>
                <th>Stato</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.username">
                <td>{{ user.username }}<span v-if="user.username === currentUser?.username" class="muted"> (tu)</span></td>
                <td>{{ user.firstName || '—' }}</td>
                <td>{{ user.lastName || '—' }}</td>
                <td>{{ user.email || '—' }}</td>
                <td>{{ user.role === 'admin' ? 'Admin' : 'Operatore' }}</td>
                <td>
                  <select
                    :value="user.defaultResidenzaId || ''"
                    @change="(e) => handleDefaultResidenzaChange(user, e.target.value)"
                    style="font-size:0.82em;padding:0.15em 0.3em"
                  >
                    <option value="">Ultima utilizzata</option>
                    <option v-for="r in residenze" :key="r.id" :value="r.id">{{ r.label }}</option>
                  </select>
                </td>
                <td>{{ user.isSeeded ? 'Sì' : 'No' }}</td>
                <td>{{ user.disabled ? 'Disattivato' : 'Attivo' }}</td>
                <td style="white-space:nowrap">
                  <template v-if="user.username !== currentUser?.username">
                    <button
                      v-if="user.disabled"
                      @click="handleEnableUser(user.username)"
                    >Riattiva</button>
                    <button
                      v-else
                      @click="handleDisableUser(user.username)"
                    >Disattiva</button>
                    <button
                      style="margin-left:.25rem;background:#dc2626"
                      @click="handleDeleteUser(user.username)"
                    >Elimina</button>
                  </template>
                  <span v-else class="muted">—</span>
                </td>
              </tr>
              <tr v-if="users.length === 0 && !usersBusy">
                <td colspan="9" class="muted">Nessun operatore registrato.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
