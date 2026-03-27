/*
 * MediTrace Apps Script Web API
 * Implements Phase 1.3 endpoints with action routing, auth, and idempotency.
 */

const API_SHEETS = {
	CATALOGO: 'CatalogoFarmaci',
	CONFEZIONI: 'ConfezioniMagazzino',
	TERAPIE: 'TerapieAttive',
	MOVIMENTI: 'Movimenti',
	REMINDERS: 'PromemoriaSomministrazioni',
	AUDIT: 'AuditLogCentrale',
	OPERATORI: 'Operatori',
	SYNC_LOG: 'SyncLog',
};

const API_ALLOWED_REMINDER_STATUS = ['SOMMINISTRATO', 'POSTICIPATO', 'SALTATO'];

const API_GET_ROUTES = {
	pull: apiHandlePull_,
	operators_list: apiHandleOperatorsList_,
	reminders_due: apiHandleRemindersDue_,
};

const API_POST_ROUTES = {
	push: apiHandlePush_,
	operator_upsert: apiHandleOperatorUpsert_,
	reminder_update: apiHandleReminderUpdate_,
	therapy_upsert: apiHandleTherapyUpsert_,
	drug_upsert: apiHandleDrugUpsert_,
	audit_log: apiHandleAuditLog_,
};

const API_ENTITY_WRITE_MAP = {
	inventory: { sheet: API_SHEETS.CONFEZIONI, idColumn: 'stock_item_id' },
	movement: { sheet: API_SHEETS.MOVIMENTI, idColumn: 'movement_id' },
	reminder: { sheet: API_SHEETS.REMINDERS, idColumn: 'reminder_id' },
	therapy: { sheet: API_SHEETS.TERAPIE, idColumn: 'therapy_id' },
	drug: { sheet: API_SHEETS.CATALOGO, idColumn: 'drug_id' },
	operator: { sheet: API_SHEETS.OPERATORI, idColumn: 'operator_id' },
};

const API_PULL_SOURCES = [
	{ entity: 'inventory', sheet: API_SHEETS.CONFEZIONI, idColumn: 'stock_item_id', updatedAtColumn: 'updated_at' },
	{ entity: 'movement', sheet: API_SHEETS.MOVIMENTI, idColumn: 'movement_id', updatedAtColumn: 'updated_at' },
	{ entity: 'reminder', sheet: API_SHEETS.REMINDERS, idColumn: 'reminder_id', updatedAtColumn: 'updated_at' },
	{ entity: 'therapy', sheet: API_SHEETS.TERAPIE, idColumn: 'therapy_id', updatedAtColumn: 'updated_at' },
	{ entity: 'drug', sheet: API_SHEETS.CATALOGO, idColumn: 'drug_id', updatedAtColumn: 'updated_at' },
	{ entity: 'operator', sheet: API_SHEETS.OPERATORI, idColumn: 'operator_id', updatedAtColumn: 'updated_at' },
];

const API_SPREADSHEET_ID_PROPERTY = 'MEDITRACE_SPREADSHEET_ID';

let API_SPREADSHEET_CACHE = null;

function doGet(e) {
	return apiDispatch_('GET', e || {}, null);
}

function doPost(e) {
	const body = apiParseBody_(e || {});
	return apiDispatch_('POST', e || {}, body);
}

function apiDispatch_(method, e, body) {
	try {
		const action = apiAsText_(e.parameter && e.parameter.action).toLowerCase();
		if (!action) {
			return apiErrorResponse_('BAD_REQUEST', 'Parametro action mancante.', 400);
		}

		const routeMap = method === 'GET' ? API_GET_ROUTES : API_POST_ROUTES;
		const route = routeMap[action];
		if (!route) {
			return apiErrorResponse_('BAD_REQUEST', 'Action non supportata: ' + action, 400);
		}

		const authResult = apiAuthorize_(e, body);
		if (!authResult.ok) {
			apiLogSync_('AUTH_FAIL', 'auth', 1, 'ERROR', authResult.message, 'unknown');
			return apiErrorResponse_('UNAUTHORIZED', authResult.message, 401);
		}

		const request = {
			action: action,
			query: e.parameter || {},
			body: body || {},
			apiKeyAlias: authResult.alias,
		};

		if (method === 'POST') {
			const idem = apiCheckIdempotency_(action, request.body);
			if (!idem.ok) {
				return apiErrorResponse_('BAD_REQUEST', idem.message, 400);
			}
			if (idem.duplicate) {
				return apiJsonResponse_({
					ok: true,
					duplicate: true,
					action: action,
					requestId: idem.requestId,
					serverTime: apiNowIso_(),
				});
			}

			const result = route(request);
			apiMarkIdempotent_(action, idem.requestId);
			return apiJsonResponse_(result);
		}

		const resultGet = route(request);
		return apiJsonResponse_(resultGet);
	} catch (err) {
		apiLogSync_('ERROR', 'api', 1, 'ERROR', apiErrorMessage_(err), 'unknown');
		return apiErrorResponse_('INTERNAL_ERROR', apiErrorMessage_(err), 500);
	}
}

function apiHandlePull_(request) {
	const sinceRaw = apiAsText_(request.query.since);
	const since = sinceRaw ? apiToDate_(sinceRaw) : null;
	if (sinceRaw && !since) {
		return apiErrorPayload_('BAD_REQUEST', 'Parametro since non valido.', 400);
	}

	const items = [];
	API_PULL_SOURCES.forEach((src) => {
		const sheet = apiMustGetSheet_(src.sheet);
		const rows = apiReadAllRowsAsObjects_(sheet);
		rows.forEach((row) => {
			const id = apiAsText_(row[src.idColumn]);
			const updatedAt = apiAsText_(row[src.updatedAtColumn]);
			if (!id || !updatedAt) {
				return;
			}
			const updatedDate = apiToDate_(updatedAt);
			if (!updatedDate) {
				return;
			}
			if (since && updatedDate.getTime() <= since.getTime()) {
				return;
			}
			items.push({
				entity: src.entity,
				id: id,
				updatedAt: updatedAt,
				payload: row,
			});
		});
	});

	items.sort((a, b) => {
		const ta = apiToDate_(a.updatedAt).getTime();
		const tb = apiToDate_(b.updatedAt).getTime();
		return ta - tb;
	});

	apiLogSync_('PULL', 'delta', items.length, 'OK', 'pull completato', 'server');

	return {
		ok: true,
		serverTime: apiNowIso_(),
		items: items,
	};
}

function apiHandlePush_(request) {
	const deviceId = apiAsText_(request.body.deviceId) || 'unknown-device';
	const items = Array.isArray(request.body.items) ? request.body.items : [];
	const accepted = [];
	const rejected = [];

	items.forEach((item) => {
		const entity = apiAsText_(item.entity).toLowerCase();
		const map = API_ENTITY_WRITE_MAP[entity];
		if (!map) {
			rejected.push({ id: apiAsText_(item.id), reason: 'entity_non_supportata' });
			return;
		}

		const id = apiAsText_(item.id) || apiAsText_(item.payload && item.payload[map.idColumn]);
		if (!id) {
			rejected.push({ id: '', reason: 'id_mancante' });
			return;
		}

		const payload = item.payload && typeof item.payload === 'object' ? item.payload : {};
		payload[map.idColumn] = id;
		if (!payload.updated_at) {
			payload.updated_at = apiAsText_(item.updatedAt) || apiNowIso_();
		}

		if (entity === 'movement' && !apiAsText_(payload.operatore) && !apiAsText_(payload.operator_id)) {
			rejected.push({ id: id, reason: 'operator_id_o_operatore_mancante' });
			return;
		}

		apiUpsertById_(map.sheet, map.idColumn, id, payload);
		accepted.push(id);
	});

	apiLogSync_('PUSH', 'batch', items.length, rejected.length > 0 ? 'WARN' : 'OK', 'push completato', deviceId);

	return {
		ok: true,
		accepted: accepted,
		rejected: rejected,
		serverTime: apiNowIso_(),
	};
}

function apiHandleOperatorsList_(request) {
	const activeParam = apiAsText_(request.query.active).toLowerCase();
	const onlyActive = activeParam === '' || activeParam === 'true' || activeParam === '1' || activeParam === 'yes';
	const sheet = apiMustGetSheet_(API_SHEETS.OPERATORI);
	const rows = apiReadAllRowsAsObjects_(sheet);
	const items = rows
		.filter((row) => {
			if (!onlyActive) return true;
			return apiToBoolean_(row.attivo);
		})
		.map((row) => ({
			operatorId: apiAsText_(row.operator_id),
			operatorCode: apiAsText_(row.codice_operatore),
			displayName: apiAsText_(row.nome_visualizzato),
			active: apiToBoolean_(row.attivo),
			role: apiAsText_(row.ruolo),
			updatedAt: apiAsText_(row.updated_at),
		}))
		.filter((row) => !!row.operatorId);

	return {
		ok: true,
		serverTime: apiNowIso_(),
		items: items,
	};
}

function apiHandleOperatorUpsert_(request) {
	const input = request.body.operator || {};
	const operatorId = apiAsText_(input.operatorId) || apiBuildId_('op');
	const payload = {
		operator_id: operatorId,
		codice_operatore: apiAsText_(input.operatorCode),
		nome_visualizzato: apiAsText_(input.displayName),
		attivo: apiToBoolean_(input.active),
		ruolo: apiAsText_(input.role),
		updated_at: apiNowIso_(),
	};

	apiUpsertById_(API_SHEETS.OPERATORI, 'operator_id', operatorId, payload);

	return {
		ok: true,
		operatorId: operatorId,
		serverTime: apiNowIso_(),
	};
}

function apiHandleRemindersDue_(request) {
	const fromRaw = apiAsText_(request.query.from);
	const toRaw = apiAsText_(request.query.to);
	const fromDate = fromRaw ? apiToDate_(fromRaw) : null;
	const toDate = toRaw ? apiToDate_(toRaw) : null;
	if (fromRaw && !fromDate) {
		return apiErrorPayload_('BAD_REQUEST', 'Parametro from non valido.', 400);
	}
	if (toRaw && !toDate) {
		return apiErrorPayload_('BAD_REQUEST', 'Parametro to non valido.', 400);
	}

	const statusFilter = apiAsText_(request.query.status)
		.split(',')
		.map((s) => apiAsText_(s).toUpperCase())
		.filter((s) => !!s);
	const statusSet = statusFilter.length > 0 ? new Set(statusFilter) : null;

	const rows = apiReadAllRowsAsObjects_(apiMustGetSheet_(API_SHEETS.REMINDERS));
	const items = rows
		.filter((row) => {
			const ts = apiToDate_(row.scheduled_at);
			if (!ts) return false;
			if (fromDate && ts.getTime() < fromDate.getTime()) return false;
			if (toDate && ts.getTime() > toDate.getTime()) return false;
			const status = apiAsText_(row.stato).toUpperCase();
			if (statusSet && !statusSet.has(status)) return false;
			return true;
		})
		.map((row) => ({
			reminderId: apiAsText_(row.reminder_id),
			guestId: apiAsText_(row.guest_id),
			therapyId: apiAsText_(row.therapy_id),
			drugId: apiAsText_(row.drug_id),
			scheduledAt: apiAsText_(row.scheduled_at),
			status: apiAsText_(row.stato),
			executedAt: apiAsText_(row.eseguito_at),
			note: apiAsText_(row.note),
			updatedAt: apiAsText_(row.updated_at),
		}))
		.filter((row) => !!row.reminderId);

	return {
		ok: true,
		serverTime: apiNowIso_(),
		items: items,
	};
}

function apiHandleReminderUpdate_(request) {
	const operatorId = apiAsText_(request.body.operatorId);
	if (!operatorId) {
		return apiErrorPayload_('FORBIDDEN', 'operatorId obbligatorio.', 403);
	}

	const reminder = request.body.reminder || {};
	const reminderId = apiAsText_(reminder.reminderId);
	const status = apiAsText_(reminder.status).toUpperCase();
	if (!reminderId) {
		return apiErrorPayload_('BAD_REQUEST', 'reminderId mancante.', 400);
	}
	if (API_ALLOWED_REMINDER_STATUS.indexOf(status) < 0) {
		return apiErrorPayload_('UNPROCESSABLE_ENTITY', 'Stato reminder non valido.', 422);
	}

	const existing = apiFindById_(API_SHEETS.REMINDERS, 'reminder_id', reminderId);
	if (!existing.found) {
		return apiErrorPayload_('BAD_REQUEST', 'Reminder non trovato: ' + reminderId, 400);
	}

	const beforeState = {
		stato: existing.row.stato,
		eseguito_at: existing.row.eseguito_at,
		note: existing.row.note,
	};

	const patch = {
		reminder_id: reminderId,
		stato: status,
		eseguito_at: apiAsText_(reminder.executedAt) || apiNowIso_(),
		operatore: apiAsText_(request.body.operator) || operatorId,
		note: apiAsText_(reminder.note),
		updated_at: apiNowIso_(),
	};

	const updated = apiUpsertById_(API_SHEETS.REMINDERS, 'reminder_id', reminderId, patch);
	const auditId = apiWriteAudit_({
		operator: patch.operatore,
		operatorId: operatorId,
		action: 'PROMEMORIA_ESITO',
		entityType: 'Promemoria',
		entityId: reminderId,
		patientId: apiAsText_(updated.row.guest_id),
		beforeJson: JSON.stringify(beforeState),
		afterJson: JSON.stringify({
			stato: updated.row.stato,
			eseguito_at: updated.row.eseguito_at,
			note: updated.row.note,
		}),
		outcome: 'OK',
		source: 'APP',
	});

	return {
		ok: true,
		updatedId: reminderId,
		auditId: auditId,
		serverTime: apiNowIso_(),
	};
}

function apiHandleTherapyUpsert_(request) {
	const operatorId = apiAsText_(request.body.operatorId);
	if (!operatorId) {
		return apiErrorPayload_('FORBIDDEN', 'operatorId obbligatorio.', 403);
	}

	const input = request.body.therapy || {};
	const therapyId = apiAsText_(input.therapyId) || apiBuildId_('th');
	const previous = apiFindById_(API_SHEETS.TERAPIE, 'therapy_id', therapyId);

	const patch = {
		therapy_id: therapyId,
		guest_id: apiAsText_(input.guestId),
		drug_id: apiAsText_(input.drugId),
		stock_item_id_preferito: apiAsText_(input.stockItemIdPreferred),
		dose_per_somministrazione: apiAsText_(input.dosePerAdministration),
		unita_dose: apiAsText_(input.unitDose),
		somministrazioni_giornaliere: apiToNumber_(input.administrationsPerDay),
		consumo_medio_settimanale: apiToNumber_(input.weeklyAverage),
		data_inizio: apiAsText_(input.startDate),
		data_fine: apiAsText_(input.endDate),
		attiva: apiToBoolean_(input.active),
		note: apiAsText_(input.notes),
		updated_at: apiNowIso_(),
	};

	const updated = apiUpsertById_(API_SHEETS.TERAPIE, 'therapy_id', therapyId, patch);
	const auditAction = previous.found ? 'UPDATE_POSOLOGIA' : 'UPDATE_TERAPIA';
	const auditId = apiWriteAudit_({
		operator: apiAsText_(request.body.operator) || operatorId,
		operatorId: operatorId,
		action: auditAction,
		entityType: 'TerapiaAttiva',
		entityId: therapyId,
		patientId: apiAsText_(updated.row.guest_id),
		beforeJson: JSON.stringify(previous.found ? previous.row : {}),
		afterJson: JSON.stringify(updated.row),
		outcome: 'OK',
		source: 'APP',
	});

	return {
		ok: true,
		therapyId: therapyId,
		auditId: auditId,
		serverTime: apiNowIso_(),
	};
}

function apiHandleDrugUpsert_(request) {
	const operatorId = apiAsText_(request.body.operatorId);
	if (!operatorId) {
		return apiErrorPayload_('FORBIDDEN', 'operatorId obbligatorio.', 403);
	}

	const input = request.body.drug || {};
	const drugId = apiAsText_(input.drugId) || apiBuildId_('drug');
	const previous = apiFindById_(API_SHEETS.CATALOGO, 'drug_id', drugId);

	const patch = {
		drug_id: drugId,
		principio_attivo: apiAsText_(input.principioAttivo),
		classe_terapeutica: apiAsText_(input.classeTerapeutica),
		scorta_minima_default: apiToNumber_(input.defaultMinStock),
		fornitore_preferito: apiAsText_(input.supplier),
		note: apiAsText_(input.notes),
		updated_at: apiNowIso_(),
	};

	const updated = apiUpsertById_(API_SHEETS.CATALOGO, 'drug_id', drugId, patch);
	const auditAction = previous.found ? 'UPDATE_FARMACO' : 'ADD_FARMACO';
	const auditId = apiWriteAudit_({
		operator: apiAsText_(request.body.operator) || operatorId,
		operatorId: operatorId,
		action: auditAction,
		entityType: 'Farmaco',
		entityId: drugId,
		patientId: '',
		beforeJson: JSON.stringify(previous.found ? previous.row : {}),
		afterJson: JSON.stringify(updated.row),
		outcome: 'OK',
		source: 'APP',
	});

	return {
		ok: true,
		drugId: drugId,
		auditId: auditId,
		serverTime: apiNowIso_(),
	};
}

function apiHandleAuditLog_(request) {
	const auditInput = request.body.audit && typeof request.body.audit === 'object' ? request.body.audit : {};
	const operatorId = apiAsText_(request.body.operatorId) || apiAsText_(auditInput.operatorId);
	if (!operatorId) {
		return apiErrorPayload_('FORBIDDEN', 'operatorId obbligatorio.', 403);
	}

	const auditAction = apiAsText_(auditInput.action) || 'AUDIT_LOG';
	const auditId = apiWriteAudit_({
		operator: apiAsText_(request.body.operator) || apiAsText_(auditInput.operator) || operatorId,
		operatorId: operatorId,
		action: auditAction,
		entityType: apiAsText_(auditInput.entityType),
		entityId: apiAsText_(auditInput.entityId),
		patientId: apiAsText_(auditInput.patientId),
		beforeJson: apiToJsonString_(auditInput.beforeJson != null ? auditInput.beforeJson : auditInput.before),
		afterJson: apiToJsonString_(auditInput.afterJson != null ? auditInput.afterJson : auditInput.after),
		outcome: apiAsText_(auditInput.outcome) || 'OK',
		source: apiAsText_(auditInput.source) || 'APP',
	});

	apiLogSync_('PUSH', 'audit', 1, 'OK', 'audit log scritto', apiAsText_(request.body.deviceId) || 'api');

	return {
		ok: true,
		auditId: auditId,
		action: auditAction,
		serverTime: apiNowIso_(),
	};
}

function apiAuthorize_(e, body) {
	// Apps Script web app event does not expose custom HTTP headers reliably.
	// For this reason, key can be sent as query param `apiKey` or body `apiKey`.
	const provided = apiAsText_((e.parameter && e.parameter.apiKey) || (body && body.apiKey));
	if (!provided) {
		return { ok: false, message: 'API key assente.' };
	}

	const props = PropertiesService.getScriptProperties();
	const keys = [
		{ alias: 'MEDITRACE_API_KEY', value: apiAsText_(props.getProperty('MEDITRACE_API_KEY')) },
		{ alias: 'MEDITRACE_STAGING_API_KEY', value: apiAsText_(props.getProperty('MEDITRACE_STAGING_API_KEY')) },
		{ alias: 'MEDITRACE_PROD_API_KEY', value: apiAsText_(props.getProperty('MEDITRACE_PROD_API_KEY')) },
	].filter((k) => !!k.value);

	if (keys.length === 0) {
		return {
			ok: false,
			message:
				'Nessuna API key configurata in Script Properties. Esegui apiSetupScriptPropertiesTemplate_() e poi imposta i valori reali.',
		};
	}

	for (let i = 0; i < keys.length; i++) {
		if (provided === keys[i].value) {
			return { ok: true, alias: keys[i].alias };
		}
	}

	return { ok: false, message: 'API key non valida.' };
}

// Run once from Apps Script editor if Project Settings > Script properties is not visible.
// It creates missing keys with placeholder values and sets spreadsheet ID from active sheet.
function apiSetupScriptPropertiesTemplate_() {
	const props = PropertiesService.getScriptProperties();
	const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
	const activeSpreadsheetId = activeSpreadsheet ? activeSpreadsheet.getId() : 'REPLACE_WITH_SPREADSHEET_ID';

	const defaults = {
		MEDITRACE_API_KEY: 'REPLACE_WITH_API_KEY',
		MEDITRACE_STAGING_API_KEY: 'REPLACE_WITH_STAGING_API_KEY',
		MEDITRACE_PROD_API_KEY: 'REPLACE_WITH_PROD_API_KEY',
		MEDITRACE_SPREADSHEET_ID: activeSpreadsheetId,
	};

	Object.keys(defaults).forEach((key) => {
		const current = apiAsText_(props.getProperty(key));
		if (!current) {
			props.setProperty(key, defaults[key]);
		}
	});

	const status = apiScriptPropertiesStatus_();
	Logger.log('Script properties template initialized: ' + JSON.stringify(status));
	return status;
}

// Safe status dump (never logs actual key values).
function apiScriptPropertiesStatus_() {
	const props = PropertiesService.getScriptProperties();
	const spreadsheetId = apiAsText_(props.getProperty(API_SPREADSHEET_ID_PROPERTY));
	const spreadsheetHint = spreadsheetId ? spreadsheetId.slice(0, 6) + '...' : '';

	return {
		hasApiKey: !!apiAsText_(props.getProperty('MEDITRACE_API_KEY')),
		hasStagingKey: !!apiAsText_(props.getProperty('MEDITRACE_STAGING_API_KEY')),
		hasProdKey: !!apiAsText_(props.getProperty('MEDITRACE_PROD_API_KEY')),
		hasSpreadsheetId: !!spreadsheetId,
		spreadsheetIdHint: spreadsheetHint,
	};
}

function apiCheckIdempotency_(action, body) {
	const requestId = apiAsText_(body && body.requestId);
	if (!requestId) {
		return { ok: false, message: 'requestId obbligatorio per operazioni di scrittura.' };
	}

	const key = apiIdempotencyKey_(action, requestId);
	const props = PropertiesService.getScriptProperties();
	const existing = props.getProperty(key);
	if (existing) {
		return { ok: true, duplicate: true, requestId: requestId };
	}

	return { ok: true, duplicate: false, requestId: requestId };
}

function apiMarkIdempotent_(action, requestId) {
	const props = PropertiesService.getScriptProperties();
	props.setProperty(apiIdempotencyKey_(action, requestId), apiNowIso_());
}

function apiIdempotencyKey_(action, requestId) {
	return 'idem:' + action + ':' + requestId;
}

function apiWriteAudit_(event) {
	const auditId = apiBuildId_('audit');
	apiAppendRowByHeader_(API_SHEETS.AUDIT, {
		audit_id: auditId,
		timestamp: apiNowIso_(),
		operatore: apiAsText_(event.operator),
		azione: apiAsText_(event.action),
		entity_type: apiAsText_(event.entityType),
		entity_id: apiAsText_(event.entityId),
		patient_id: apiAsText_(event.patientId),
		before_json: apiAsText_(event.beforeJson),
		after_json: apiAsText_(event.afterJson),
		esito: apiAsText_(event.outcome) || 'OK',
		source: apiAsText_(event.source) || 'APP',
		updated_at: apiNowIso_(),
	});
	return auditId;
}

function apiLogSync_(azione, entity, recordCount, esito, messaggio, deviceId) {
	apiAppendRowByHeader_(API_SHEETS.SYNC_LOG, {
		log_id: apiBuildId_('log'),
		timestamp: apiNowIso_(),
		device_id: apiAsText_(deviceId),
		azione: azione,
		entity: apiAsText_(entity),
		record_count: apiToNumber_(recordCount),
		esito: esito,
		messaggio: apiAsText_(messaggio),
	});
}

function apiMustGetSheet_(name) {
	const ss = apiSpreadsheet_();
	const sheet = ss.getSheetByName(name);
	if (!sheet) {
		const availableSheets = ss
			.getSheets()
			.map((s) => s.getName())
			.join(', ');
		throw new Error(
			'Foglio non trovato: ' +
				name +
				'. Spreadsheet ID: ' +
				ss.getId() +
				'. Fogli disponibili: ' +
				availableSheets
		);
	}
	return sheet;
}

function apiSpreadsheet_() {
	if (API_SPREADSHEET_CACHE) {
		return API_SPREADSHEET_CACHE;
	}

	const props = PropertiesService.getScriptProperties();
	const configuredId = apiAsText_(props.getProperty(API_SPREADSHEET_ID_PROPERTY));
	if (configuredId) {
		API_SPREADSHEET_CACHE = SpreadsheetApp.openById(configuredId);
		return API_SPREADSHEET_CACHE;
	}

	const active = SpreadsheetApp.getActiveSpreadsheet();
	if (!active) {
		throw new Error(
			'Nessun spreadsheet attivo in questo contesto. Imposta Script Property ' +
				API_SPREADSHEET_ID_PROPERTY +
				' con l\'ID del workbook MediTrace.'
		);
	}

	API_SPREADSHEET_CACHE = active;
	return API_SPREADSHEET_CACHE;
}

function apiHeaders_(sheet) {
	const lastCol = sheet.getLastColumn();
	if (lastCol < 1) {
		throw new Error('Foglio senza intestazioni: ' + sheet.getName());
	}
	return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map((h) => apiAsText_(h));
}

function apiReadAllRowsAsObjects_(sheet) {
	const headers = apiHeaders_(sheet);
	const lastRow = sheet.getLastRow();
	if (lastRow < 2) {
		return [];
	}
	const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
	return values.map((row) => apiRowToObject_(headers, row));
}

function apiFindById_(sheetName, idColumn, idValue) {
	const sheet = apiMustGetSheet_(sheetName);
	const headers = apiHeaders_(sheet);
	const idx = headers.indexOf(idColumn);
	if (idx < 0) {
		throw new Error('Colonna ID non trovata: ' + idColumn + ' in ' + sheetName);
	}
	const lastRow = sheet.getLastRow();
	if (lastRow < 2) {
		return { found: false, rowIndex: -1, row: {} };
	}
	const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
	for (let i = 0; i < values.length; i++) {
		if (apiAsText_(values[i][idx]) === idValue) {
			return {
				found: true,
				rowIndex: i + 2,
				row: apiRowToObject_(headers, values[i]),
			};
		}
	}
	return { found: false, rowIndex: -1, row: {} };
}

function apiUpsertById_(sheetName, idColumn, idValue, patch) {
	const sheet = apiMustGetSheet_(sheetName);
	const headers = apiHeaders_(sheet);
	const lookup = apiFindById_(sheetName, idColumn, idValue);
	const now = apiNowIso_();
	const base = lookup.found ? lookup.row : {};
	const merged = {};

	headers.forEach((h) => {
		if (Object.prototype.hasOwnProperty.call(patch, h)) {
			merged[h] = patch[h];
		} else if (Object.prototype.hasOwnProperty.call(base, h)) {
			merged[h] = base[h];
		} else {
			merged[h] = '';
		}
	});

	merged[idColumn] = idValue;
	if (headers.indexOf('created_at') >= 0 && !apiAsText_(merged.created_at)) {
		merged.created_at = now;
	}
	if (headers.indexOf('updated_at') >= 0 && !apiAsText_(patch.updated_at)) {
		merged.updated_at = now;
	}

	const row = apiObjectToRow_(headers, merged);
	if (lookup.found) {
		sheet.getRange(lookup.rowIndex, 1, 1, headers.length).setValues([row]);
		return { isNew: false, rowIndex: lookup.rowIndex, row: merged };
	}

	sheet.getRange(sheet.getLastRow() + 1, 1, 1, headers.length).setValues([row]);
	return { isNew: true, rowIndex: sheet.getLastRow(), row: merged };
}

function apiAppendRowByHeader_(sheetName, payload) {
	const sheet = apiMustGetSheet_(sheetName);
	const headers = apiHeaders_(sheet);
	const row = apiObjectToRow_(headers, payload || {});
	sheet.getRange(sheet.getLastRow() + 1, 1, 1, headers.length).setValues([row]);
}

function apiObjectToRow_(headers, obj) {
	return headers.map((h) => (Object.prototype.hasOwnProperty.call(obj, h) ? obj[h] : ''));
}

function apiRowToObject_(headers, row) {
	const out = {};
	headers.forEach((h, idx) => {
		out[h] = row[idx];
	});
	return out;
}

function apiParseBody_(e) {
	const raw = e.postData && e.postData.contents ? e.postData.contents : '';
	if (!raw) {
		return {};
	}
	try {
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === 'object' ? parsed : {};
	} catch (err) {
		throw new Error('Body JSON non valido.');
	}
}

function apiJsonResponse_(obj) {
	return ContentService
		.createTextOutput(JSON.stringify(obj))
		.setMimeType(ContentService.MimeType.JSON);
}

function apiErrorResponse_(code, message, httpStatus) {
	return apiJsonResponse_(apiErrorPayload_(code, message, httpStatus));
}

function apiErrorPayload_(code, message, httpStatus) {
	return {
		ok: false,
		error: {
			code: code,
			message: message,
			httpStatus: httpStatus,
		},
		serverTime: apiNowIso_(),
	};
}

function apiNowIso_() {
	return new Date().toISOString();
}

function apiBuildId_(prefix) {
	return prefix + '-' + Utilities.getUuid().split('-')[0] + '-' + new Date().getTime();
}

function apiToDate_(value) {
	if (!value) return null;
	if (Object.prototype.toString.call(value) === '[object Date]') return value;
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return null;
	return d;
}

function apiToBoolean_(value) {
	if (typeof value === 'boolean') return value;
	const text = apiAsText_(value).toLowerCase();
	return text === 'true' || text === '1' || text === 'yes' || text === 'si' || text === 'vero';
}

function apiToNumber_(value) {
	if (typeof value === 'number') return value;
	if (value == null || value === '') return 0;
	const parsed = Number(String(value).replace(',', '.'));
	return Number.isFinite(parsed) ? parsed : 0;
}

function apiToJsonString_(value) {
	if (value == null || value === '') return '';
	if (typeof value === 'string') return value;
	try {
		return JSON.stringify(value);
	} catch (err) {
		return apiAsText_(value);
	}
}

function apiAsText_(value) {
	return value == null ? '' : String(value).trim();
}

function apiErrorMessage_(err) {
	if (!err) return 'Errore sconosciuto';
	if (typeof err === 'string') return err;
	if (err.message) return err.message;
	return String(err);
}
