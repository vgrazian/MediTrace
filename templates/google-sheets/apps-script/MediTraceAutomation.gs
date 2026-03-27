/*
 * MediTrace Google Sheets automation.
 * Keeps DashboardScorte and Ordini suggestions up to date with minimal formulas.
 */

const SHEET_NAMES = {
  CATALOGO: 'CatalogoFarmaci',
  CONFEZIONI: 'ConfezioniMagazzino',
  TERAPIE: 'TerapieAttive',
  ORDINI: 'Ordini',
  DASHBOARD: 'DashboardScorte',
};

const DASHBOARD_HEADERS = [
  'principio_attivo',
  'nome_commerciale',
  'dosaggio',
  'scadenza',
  'quantita_attuale',
  'consumo_medio_settimanale',
  'residuo_post_settimana',
  'copertura_settimane',
  'stato_scorta',
  'ordine_aperto',
  'stock_item_id',
  'drug_id',
  'soglia_riordino',
];

const TEMPLATE_SHEETS = [
  {
    name: 'CatalogoFarmaci',
    headers: ['drug_id', 'principio_attivo', 'classe_terapeutica', 'scorta_minima_default', 'fornitore_preferito', 'note', 'updated_at', 'deleted_at'],
  },
  {
    name: 'ConfezioniMagazzino',
    headers: ['stock_item_id', 'drug_id', 'nome_commerciale', 'dosaggio', 'forma', 'unita_misura', 'lotto', 'scadenza', 'quantita_iniziale', 'quantita_attuale', 'soglia_riordino', 'copertura_settimane', 'stato_scorta', 'updated_at', 'deleted_at'],
  },
  {
    name: 'Ospiti',
    headers: ['guest_id', 'codice_interno', 'iniziali', 'casa_alloggio', 'attivo', 'note_essenziali', 'updated_at', 'deleted_at'],
  },
  {
    name: 'TerapieAttive',
    headers: ['therapy_id', 'guest_id', 'drug_id', 'stock_item_id_preferito', 'dose_per_somministrazione', 'unita_dose', 'somministrazioni_giornaliere', 'consumo_medio_settimanale', 'data_inizio', 'data_fine', 'attiva', 'note', 'updated_at'],
  },
  {
    name: 'Movimenti',
    headers: ['movement_id', 'stock_item_id', 'drug_id', 'guest_id', 'tipo_movimento', 'quantita', 'unita_misura', 'causale', 'data_movimento', 'settimana_riferimento', 'operatore', 'source', 'updated_at'],
  },
  {
    name: 'Ordini',
    headers: ['order_id', 'drug_id', 'stock_item_id', 'quantita_suggerita', 'motivo', 'priorita', 'stato', 'fornitore', 'created_at', 'updated_at'],
  },
  {
    name: 'DashboardScorte',
    headers: ['principio_attivo', 'nome_commerciale', 'dosaggio', 'scadenza', 'quantita_attuale', 'consumo_medio_settimanale', 'residuo_post_settimana', 'copertura_settimane', 'stato_scorta', 'ordine_aperto', 'stock_item_id', 'drug_id', 'soglia_riordino'],
  },
  {
    name: 'SyncLog',
    headers: ['log_id', 'timestamp', 'device_id', 'azione', 'entity', 'record_count', 'esito', 'messaggio'],
  },
  {
    name: 'PromemoriaSomministrazioni',
    headers: ['reminder_id', 'guest_id', 'therapy_id', 'drug_id', 'scheduled_at', 'stato', 'eseguito_at', 'operatore', 'note', 'updated_at'],
  },
  {
    name: 'AuditLogCentrale',
    headers: ['audit_id', 'timestamp', 'operatore', 'azione', 'entity_type', 'entity_id', 'patient_id', 'before_json', 'after_json', 'esito', 'source', 'updated_at'],
  },
  {
    name: 'Operatori',
    headers: ['operator_id', 'codice_operatore', 'nome_visualizzato', 'attivo', 'ruolo', 'created_at', 'updated_at'],
  },
];

const SECURITY_CONFIG = {
  TECHNICAL_SHEETS: ['SyncLog', 'AuditLogCentrale'],
  // Replace with real allowed editors before production hardening.
  // Invalid or non-Google users are skipped safely.
  ALLOWED_EDITORS: ['meditace0@gmail.com', 'valeriograziani@gmail.com'],
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('MediTrace')
    .addItem('Crea workbook STAGING + PROD', 'createWorkbookPairFromTemplates')
    .addItem('Crea STAGING + PROD + Hardening', 'createWorkbookPairAndHarden')
    .addItem('Inizializza workbook corrente da template', 'initializeCurrentWorkbookFromTemplates')
    .addItem('Applica Data Validation + Protezioni', 'applyWorkbookHardeningToCurrent')
    .addItem('Aggiorna Dashboard e Ordini', 'runMediTraceRefresh')
    .addItem('Aggiorna solo Dashboard', 'refreshDashboardScorte')
    .addItem('Aggiorna solo Ordini', 'refreshOrdiniSuggeriti')
    .addToUi();
}

function createWorkbookPairAndHarden() {
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmm');
  const staging = SpreadsheetApp.create('MediTrace-STAGING-' + stamp);
  const prod = SpreadsheetApp.create('MediTrace-PROD-' + stamp);

  initializeWorkbookFromTemplates_(staging, 'STAGING');
  initializeWorkbookFromTemplates_(prod, 'PROD');

  const editorCheck = precheckEditors_(staging, SECURITY_CONFIG.ALLOWED_EDITORS);
  notifyInvalidEditors_(editorCheck.invalid, editorCheck.valid);

  applyWorkbookHardening_(staging, editorCheck.valid);
  applyWorkbookHardening_(prod, editorCheck.valid);

  const message = [
    'Workbook creati e hardening applicato.',
    'STAGING: ' + staging.getUrl(),
    'PROD: ' + prod.getUrl(),
  ].join('\n');

  notifyInfo_(message);
}

function createWorkbookPairFromTemplates() {
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmm');
  const staging = SpreadsheetApp.create('MediTrace-STAGING-' + stamp);
  const prod = SpreadsheetApp.create('MediTrace-PROD-' + stamp);

  initializeWorkbookFromTemplates_(staging, 'STAGING');
  initializeWorkbookFromTemplates_(prod, 'PROD');

  const message = [
    'Workbook creati con tutti i fogli template.',
    'STAGING: ' + staging.getUrl(),
    'PROD: ' + prod.getUrl(),
  ].join('\n');

  notifyInfo_(message);
}

function initializeCurrentWorkbookFromTemplates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  initializeWorkbookFromTemplates_(ss, 'CURRENT');
  notifyInfo_('Workbook corrente inizializzato con i fogli template MediTrace.');
}

function applyWorkbookHardeningToCurrent() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const editorCheck = precheckEditors_(ss, SECURITY_CONFIG.ALLOWED_EDITORS);
  notifyInvalidEditors_(editorCheck.invalid, editorCheck.valid);
  applyWorkbookHardening_(ss, editorCheck.valid);
  notifyInfo_('Data validation e protezioni applicate al workbook corrente.');
}

function initializeWorkbookFromTemplates_(ss, env) {
  const sheets = ss.getSheets();

  // Reuse first sheet, then recreate all required tabs with template headers.
  const first = sheets[0];
  first.clear();
  first.clearFormats();
  first.setName(TEMPLATE_SHEETS[0].name);
  writeTemplateHeader_(first, TEMPLATE_SHEETS[0].headers);

  // Delete remaining sheets to guarantee deterministic workbook structure.
  for (let i = sheets.length - 1; i >= 1; i--) {
    ss.deleteSheet(sheets[i]);
  }

  for (let i = 1; i < TEMPLATE_SHEETS.length; i++) {
    const spec = TEMPLATE_SHEETS[i];
    const sh = ss.insertSheet(spec.name);
    writeTemplateHeader_(sh, spec.headers);
  }

}

function writeTemplateHeader_(sheet, headers) {
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}

function applyWorkbookHardening_(ss, validatedEditors) {
  applyDataValidations_(ss);
  protectTechnicalSheets_(ss, validatedEditors || []);
}

function precheckEditors_(ss, allowedEditors) {
  const requestedEditors = Array.from(new Set((allowedEditors || []).filter(Boolean)));
  if (requestedEditors.length === 0) {
    return { valid: [], invalid: [] };
  }

  const tmpName = '__MediTrace_EditorCheck__';
  let tmpSheet = ss.getSheetByName(tmpName);
  if (!tmpSheet) {
    tmpSheet = ss.insertSheet(tmpName);
  }
  tmpSheet.hideSheet();

  const protection = tmpSheet.protect();
  protection.setDescription('Temporary protection for editor pre-check');

  const valid = [];
  const invalid = [];

  requestedEditors.forEach((email) => {
    try {
      protection.addEditor(email);
      valid.push(email);
    } catch (e) {
      invalid.push(email);
    }
  });

  try {
    protection.remove();
  } catch (e) {
    Logger.log('Cannot remove temporary protection: ' + e);
  }

  try {
    ss.deleteSheet(tmpSheet);
  } catch (e) {
    Logger.log('Cannot delete temporary pre-check sheet: ' + e);
  }

  return { valid, invalid };
}

function notifyInvalidEditors_(invalid, valid) {
  if (!invalid || invalid.length === 0) {
    return;
  }

  const lines = [
    'Email editor non valide (saranno ignorate):',
    ...invalid.map((e) => '- ' + e),
    '',
    'Email valide:',
    ...(valid.length > 0 ? valid.map((e) => '- ' + e) : ['- (nessuna)']),
  ];

  const message = lines.join('\n');

  notifyInfo_('MediTrace - Pre-check editor\n' + message);
}

function getUiSafe_() {
  try {
    return SpreadsheetApp.getUi();
  } catch (e) {
    return null;
  }
}

function notifyInfo_(message) {
  Logger.log(message);

  // Avoid blocking modal dialogs: use toast when available.
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) {
      active.toast(message, 'MediTrace', 10);
    }
  } catch (e) {
    // No active spreadsheet context; log is already available.
  }
}

function applyDataValidations_(ss) {
  // ConfezioniMagazzino.stato_scorta (column M)
  setValidationList_(ss, 'ConfezioniMagazzino', 13, ['OK', 'ATTENZIONE', 'URGENTE', 'ESAURITO']);

  // Ordini.priorita (column F), Ordini.stato (column G)
  setValidationList_(ss, 'Ordini', 6, ['BASSA', 'MEDIA', 'ALTA', 'URGENTE']);
  setValidationList_(ss, 'Ordini', 7, ['DA_ORDINARE', 'ORDINATO', 'RICEVUTO', 'ANNULLATO']);

  // PromemoriaSomministrazioni.stato (column F)
  setValidationList_(ss, 'PromemoriaSomministrazioni', 6, ['DA_ESEGUIRE', 'SOMMINISTRATO', 'POSTICIPATO', 'SALTATO']);

  // SyncLog.azione (column D), SyncLog.esito (column G)
  setValidationList_(ss, 'SyncLog', 4, ['PUSH', 'PULL', 'AUTH_FAIL', 'ERROR']);
  setValidationList_(ss, 'SyncLog', 7, ['OK', 'WARN', 'ERROR']);

  // AuditLogCentrale.azione (column D), AuditLogCentrale.esito (column J), source (column K)
  setValidationList_(ss, 'AuditLogCentrale', 4, [
    'ADD_FARMACO',
    'UPDATE_FARMACO',
    'UPDATE_POSOLOGIA',
    'UPDATE_TERAPIA',
    'PROMEMORIA_ESITO',
    'PROMEMORIA_ESCALATION',
    'SYNC_EVENT',
  ]);
  setValidationList_(ss, 'AuditLogCentrale', 10, ['OK', 'WARN', 'ERROR']);
  setValidationList_(ss, 'AuditLogCentrale', 11, ['APP', 'SCRIPT', 'IMPORT']);

  // Operatori.attivo (column D)
  setValidationList_(ss, 'Operatori', 4, ['TRUE', 'FALSE']);
}

function setValidationList_(ss, sheetName, col, values) {
  const sheet = mustGetSheet_(ss, sheetName);
  const maxRows = Math.max(sheet.getMaxRows(), 1000);
  const range = sheet.getRange(2, col, maxRows - 1, 1);
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(false)
    .build();
  range.setDataValidation(rule);
}

function protectTechnicalSheets_(ss, allowedEditors) {
  SECURITY_CONFIG.TECHNICAL_SHEETS.forEach((name) => {
    const sheet = mustGetSheet_(ss, name);
    const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    protections.forEach((p) => p.remove());

    const protection = sheet.protect();
    protection.setDescription('MediTrace technical sheet protection');

    try {
      const existingEditors = protection.getEditors();
      if (existingEditors && existingEditors.length > 0) {
        protection.removeEditors(existingEditors);
      }
    } catch (e) {
      Logger.log('Cannot remove editors on ' + name + ': ' + e);
    }

    const domainEdit = protection.canDomainEdit();
    if (domainEdit) {
      protection.setDomainEdit(false);
    }

    // Keep current effective user as guaranteed fallback editor.
    const fallbackEditor = (Session.getEffectiveUser() && Session.getEffectiveUser().getEmail()) || '';
    const requestedEditors = (allowedEditors || []).filter(Boolean);
    const mergedEditors = Array.from(new Set(requestedEditors.concat(fallbackEditor ? [fallbackEditor] : [])));

    addEditorsSafely_(protection, mergedEditors, name);
  });
}

function addEditorsSafely_(protection, emails, sheetName) {
  emails.forEach((email) => {
    try {
      protection.addEditor(email);
    } catch (e) {
      Logger.log('Skipping invalid editor "' + email + '" on ' + sheetName + ': ' + e);
    }
  });

  // If no editors can be set explicitly, leave owner-only protection.
}

function runMediTraceRefresh() {
  refreshDashboardScorte();
  refreshOrdiniSuggeriti();
}

function refreshDashboardScorte() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const catalogo = mustGetSheet_(ss, SHEET_NAMES.CATALOGO);
  const confezioni = mustGetSheet_(ss, SHEET_NAMES.CONFEZIONI);
  const terapie = mustGetSheet_(ss, SHEET_NAMES.TERAPIE);
  const ordini = mustGetSheet_(ss, SHEET_NAMES.ORDINI);
  const dashboard = mustGetSheet_(ss, SHEET_NAMES.DASHBOARD);

  const principioByDrug = buildPrincipioByDrug_(catalogo);
  const consumoByDrug = buildConsumoByDrug_(terapie);
  const openOrders = buildOpenOrders_(ordini);

  const data = getBodyValues_(confezioni);
  const out = [];

  data.forEach((row) => {
    const stockItemId = asText_(row[0]);
    const drugId = asText_(row[1]);
    const nomeCommerciale = asText_(row[2]);
    const dosaggio = asText_(row[3]);
    const scadenza = row[7] || '';
    const quantitaAttuale = toNumber_(row[9]);
    const sogliaRiordino = toNumber_(row[10]);
    const deletedAt = row[14];

    if (!stockItemId || deletedAt) {
      return;
    }

    const consumoSettimanale = consumoByDrug.get(drugId) || 0;
    const residuoPostSettimana = quantitaAttuale - consumoSettimanale;
    const copertura = consumoSettimanale > 0 ? round2_(quantitaAttuale / consumoSettimanale) : '';
    const stato = computeStato_(quantitaAttuale, sogliaRiordino, scadenza, copertura);
    const ordineAperto = openOrders.stockItems.has(stockItemId) || openOrders.drugs.has(drugId) ? 'SI' : 'NO';

    out.push([
      principioByDrug.get(drugId) || '',
      nomeCommerciale,
      dosaggio,
      scadenza,
      quantitaAttuale,
      consumoSettimanale,
      residuoPostSettimana,
      copertura,
      stato,
      ordineAperto,
      stockItemId,
      drugId,
      sogliaRiordino || '',
    ]);
  });

  writeSheetTable_(dashboard, DASHBOARD_HEADERS, out);
}

function refreshOrdiniSuggeriti() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboard = mustGetSheet_(ss, SHEET_NAMES.DASHBOARD);
  const ordini = mustGetSheet_(ss, SHEET_NAMES.ORDINI);

  const dashboardRows = getBodyValues_(dashboard);
  const currentOrderRows = getBodyValues_(ordini);
  const nowIso = new Date().toISOString();

  const retainedRows = [];
  const openByStock = new Set();
  const openByDrug = new Set();

  currentOrderRows.forEach((row) => {
    const orderId = asText_(row[0]);
    const drugId = asText_(row[1]);
    const stockItemId = asText_(row[2]);
    const motivo = asText_(row[4]);
    const stato = asText_(row[6]);

    if (!orderId) {
      return;
    }

    const isAutoPending = stato === 'DA_ORDINARE' && motivo.indexOf('AUTO:') === 0;
    if (!isAutoPending) {
      retainedRows.push(row.slice(0, 10));
    }

    if (stato === 'DA_ORDINARE') {
      if (stockItemId) openByStock.add(stockItemId);
      if (drugId) openByDrug.add(drugId);
    }
  });

  const suggestedRows = [];

  dashboardRows.forEach((row) => {
    const quantitaAttuale = toNumber_(row[4]);
    const consumoSettimanale = toNumber_(row[5]);
    const statoScorta = asText_(row[8]);
    const stockItemId = asText_(row[10]);
    const drugId = asText_(row[11]);
    const sogliaRiordino = toNumber_(row[12]);

    if (!drugId || !stockItemId) {
      return;
    }

    if (statoScorta !== 'URGENTE' && statoScorta !== 'ATTENZIONE') {
      return;
    }

    if (openByStock.has(stockItemId) || openByDrug.has(drugId)) {
      return;
    }

    const qtySuggerita = Math.max(
      1,
      Math.ceil(sogliaRiordino + (consumoSettimanale * 2) - quantitaAttuale)
    );
    const priorita = statoScorta === 'URGENTE' ? 'URGENTE' : 'ALTA';
    const orderId = buildAutoOrderId_(stockItemId);

    suggestedRows.push([
      orderId,
      drugId,
      stockItemId,
      qtySuggerita,
      'AUTO: suggerito da DashboardScorte',
      priorita,
      'DA_ORDINARE',
      '',
      nowIso,
      nowIso,
    ]);

    openByStock.add(stockItemId);
    openByDrug.add(drugId);
  });

  const finalRows = retainedRows.concat(suggestedRows);
  const headers = [
    'order_id',
    'drug_id',
    'stock_item_id',
    'quantita_suggerita',
    'motivo',
    'priorita',
    'stato',
    'fornitore',
    'created_at',
    'updated_at',
  ];

  writeSheetTable_(ordini, headers, finalRows);
}

function mustGetSheet_(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) {
    throw new Error('Foglio non trovato: ' + name);
  }
  return sheet;
}

function getBodyValues_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) {
    return [];
  }
  return sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
}

function writeSheetTable_(sheet, headers, rows) {
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function buildPrincipioByDrug_(catalogoSheet) {
  const map = new Map();
  getBodyValues_(catalogoSheet).forEach((row) => {
    const drugId = asText_(row[0]);
    const principio = asText_(row[1]);
    if (drugId) {
      map.set(drugId, principio);
    }
  });
  return map;
}

function buildConsumoByDrug_(terapieSheet) {
  const map = new Map();
  getBodyValues_(terapieSheet).forEach((row) => {
    const drugId = asText_(row[2]);
    const consumo = toNumber_(row[7]);
    const attiva = toBoolean_(row[10]);
    if (!drugId || !attiva) {
      return;
    }
    map.set(drugId, (map.get(drugId) || 0) + consumo);
  });
  return map;
}

function buildOpenOrders_(ordiniSheet) {
  const stockItems = new Set();
  const drugs = new Set();
  getBodyValues_(ordiniSheet).forEach((row) => {
    const drugId = asText_(row[1]);
    const stockItemId = asText_(row[2]);
    const stato = asText_(row[6]);
    if (stato !== 'DA_ORDINARE') {
      return;
    }
    if (stockItemId) stockItems.add(stockItemId);
    if (drugId) drugs.add(drugId);
  });
  return { stockItems, drugs };
}

function computeStato_(qty, soglia, scadenza, copertura) {
  if (qty <= 0) {
    return 'ESAURITO';
  }
  if (soglia > 0 && qty <= soglia) {
    return 'URGENTE';
  }
  const expiryDate = toDate_(scadenza);
  if (expiryDate) {
    const days = Math.floor((expiryDate.getTime() - Date.now()) / 86400000);
    if (days <= 30) {
      return 'ATTENZIONE';
    }
  }
  if (copertura !== '' && copertura < 2) {
    return 'ATTENZIONE';
  }
  return 'OK';
}

function buildAutoOrderId_(stockItemId) {
  const suffix = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss');
  return 'ord-auto-' + stockItemId.replace(/\s+/g, '-').toLowerCase() + '-' + suffix;
}

function asText_(value) {
  return value == null ? '' : String(value).trim();
}

function toNumber_(value) {
  if (typeof value === 'number') {
    return value;
  }
  if (value == null || value === '') {
    return 0;
  }
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toBoolean_(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  const text = asText_(value).toLowerCase();
  return text === 'true' || text === 'vero' || text === 'si' || text === 'yes' || text === '1';
}

function toDate_(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return value;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function round2_(n) {
  return Math.round(n * 100) / 100;
}