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

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('MediTrace')
    .addItem('Aggiorna Dashboard e Ordini', 'runMediTraceRefresh')
    .addItem('Aggiorna solo Dashboard', 'refreshDashboardScorte')
    .addItem('Aggiorna solo Ordini', 'refreshOrdiniSuggeriti')
    .addToUi();
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