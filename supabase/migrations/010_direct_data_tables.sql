-- 010_direct_data_tables.sql
-- Direct Supabase data storage — replaces snapshot-based sync
-- Creates individual tables for each entity with RLS policies
-- HOSTS (ospiti)
CREATE TABLE IF NOT EXISTS public.hosts (
    id TEXT PRIMARY KEY,
    codiceInterno TEXT DEFAULT '',
    nome TEXT DEFAULT '',
    cognome TEXT DEFAULT '',
    luogoNascita TEXT DEFAULT '',
    dataNascita TEXT DEFAULT NULL,
    sesso TEXT DEFAULT '',
    codiceFiscale TEXT DEFAULT '',
    patologie TEXT DEFAULT '',
    roomId TEXT DEFAULT '',
    attivo BOOLEAN DEFAULT TRUE,
    contattoEmergenza TEXT DEFAULT '',
    noteCliniche TEXT DEFAULT '',
    metadata JSONB DEFAULT '{}',
    updatedAt TIMESTAMPTZ DEFAULT NOW(),
    deletedAt TIMESTAMPTZ DEFAULT NULL,
    residenzaId TEXT DEFAULT ''
);
-- DRUGS (farmaci)
CREATE TABLE IF NOT EXISTS public.drugs (
    id TEXT PRIMARY KEY,
    nomeFarmaco TEXT DEFAULT '',
    principioAttivo TEXT DEFAULT '',
    classeTerapeutica TEXT DEFAULT '',
    scortaMinima INTEGER DEFAULT 0,
    fornitore TEXT DEFAULT '',
    note TEXT DEFAULT '',
    codiceAIC TEXT DEFAULT '',
    formaFarmaceutica TEXT DEFAULT '',
    metadata JSONB DEFAULT '{}',
    updatedAt TIMESTAMPTZ DEFAULT NOW(),
    deletedAt TIMESTAMPTZ DEFAULT NULL,
    residenzaId TEXT DEFAULT ''
);
-- STOCK BATCHES (confezioni magazzino)
CREATE TABLE IF NOT EXISTS public.stockBatches (
    id TEXT PRIMARY KEY,
    drugId TEXT DEFAULT '',
    residenzaId TEXT DEFAULT '',
    nomeCommerciale TEXT DEFAULT '',
    dosaggio TEXT DEFAULT '',
    forma TEXT DEFAULT '',
    unitaMisura TEXT DEFAULT '',
    lotto TEXT DEFAULT '',
    scadenza TEXT DEFAULT '',
    quantitaIniziale INTEGER DEFAULT 0,
    quantitaAttuale INTEGER DEFAULT 0,
    sogliaRiordino INTEGER DEFAULT 0,
    fornitore TEXT DEFAULT '',
    metadata JSONB DEFAULT '{}',
    updatedAt TIMESTAMPTZ DEFAULT NOW(),
    deletedAt TIMESTAMPTZ DEFAULT NULL
);
-- THERAPIES (terapie attive)
CREATE TABLE IF NOT EXISTS public.therapies (
    id TEXT PRIMARY KEY,
    hostId TEXT DEFAULT '',
    drugId TEXT DEFAULT '',
    stockBatchIdPreferito TEXT DEFAULT '',
    dosePerSomministrazione INTEGER DEFAULT 1,
    unitaDose TEXT DEFAULT 'cpr',
    somministrazioniGiornaliere INTEGER DEFAULT 1,
    consumoMedioSettimanale INTEGER DEFAULT 7,
    dataInizio TEXT DEFAULT '',
    dataFine TEXT DEFAULT NULL,
    attiva BOOLEAN DEFAULT TRUE,
    viaSomministrazione TEXT DEFAULT '',
    prioritaClinica TEXT DEFAULT '',
    note TEXT DEFAULT '',
    metadata JSONB DEFAULT '{}',
    updatedAt TIMESTAMPTZ DEFAULT NOW(),
    deletedAt TIMESTAMPTZ DEFAULT NULL,
    residenzaId TEXT DEFAULT ''
);
-- MOVEMENTS (movimenti)
CREATE TABLE IF NOT EXISTS public.movements (
    id TEXT PRIMARY KEY,
    stockBatchId TEXT DEFAULT '',
    drugId TEXT DEFAULT '',
    hostId TEXT DEFAULT '',
    therapyId TEXT DEFAULT '',
    tipoMovimento TEXT DEFAULT '',
    quantita INTEGER DEFAULT 0,
    unitaMisura TEXT DEFAULT '',
    causale TEXT DEFAULT '',
    dataMovimento TEXT DEFAULT '',
    settimanaRiferimento TEXT DEFAULT '',
    operatore TEXT DEFAULT '',
    source TEXT DEFAULT 'manual',
    referenceId TEXT DEFAULT '',
    metadata JSONB DEFAULT '{}',
    updatedAt TIMESTAMPTZ DEFAULT NOW(),
    deletedAt TIMESTAMPTZ DEFAULT NULL,
    residenzaId TEXT DEFAULT ''
);
-- REMINDERS (promemoria)
CREATE TABLE IF NOT EXISTS public.reminders (
    id TEXT PRIMARY KEY,
    hostId TEXT DEFAULT '',
    therapyId TEXT DEFAULT '',
    drugId TEXT DEFAULT '',
    scheduledAt TEXT DEFAULT '',
    stato TEXT DEFAULT 'DA_ESEGUIRE',
    eseguitoAt TEXT DEFAULT NULL,
    operatore TEXT DEFAULT '',
    note TEXT DEFAULT '',
    channel TEXT DEFAULT '',
    priority TEXT DEFAULT '',
    metadata JSONB DEFAULT '{}',
    updatedAt TIMESTAMPTZ DEFAULT NOW(),
    deletedAt TIMESTAMPTZ DEFAULT NULL,
    residenzaId TEXT DEFAULT ''
);
-- ROOMS (residenze)
CREATE TABLE IF NOT EXISTS public.rooms (
    id TEXT PRIMARY KEY,
    codice TEXT DEFAULT '',
    descrizione TEXT DEFAULT '',
    reparto TEXT DEFAULT '',
    piano TEXT DEFAULT '',
    metadata JSONB DEFAULT '{}',
    updatedAt TIMESTAMPTZ DEFAULT NOW(),
    deletedAt TIMESTAMPTZ DEFAULT NULL
);
-- INDEXES for common queries
CREATE INDEX IF NOT EXISTS idx_hosts_roomId ON public.hosts(roomId);
CREATE INDEX IF NOT EXISTS idx_hosts_deletedAt ON public.hosts(deletedAt);
CREATE INDEX IF NOT EXISTS idx_drugs_deletedAt ON public.drugs(deletedAt);
CREATE INDEX IF NOT EXISTS idx_stockBatches_drugId ON public.stockBatches(drugId);
CREATE INDEX IF NOT EXISTS idx_stockBatches_deletedAt ON public.stockBatches(deletedAt);
CREATE INDEX IF NOT EXISTS idx_therapies_hostId ON public.therapies(hostId);
CREATE INDEX IF NOT EXISTS idx_therapies_deletedAt ON public.therapies(deletedAt);
CREATE INDEX IF NOT EXISTS idx_movements_stockBatchId ON public.movements(stockBatchId);
CREATE INDEX IF NOT EXISTS idx_movements_deletedAt ON public.movements(deletedAt);
CREATE INDEX IF NOT EXISTS idx_reminders_hostId ON public.reminders(hostId);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduledAt ON public.reminders(scheduledAt);
CREATE INDEX IF NOT EXISTS idx_reminders_deletedAt ON public.reminders(deletedAt);
CREATE INDEX IF NOT EXISTS idx_rooms_deletedAt ON public.rooms(deletedAt);
-- RLS: enable on all tables
ALTER TABLE public.hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stockBatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
-- RLS policies: authenticated users can read/write all rows
-- (We use table-auth for session validation, RLS is permissive)
CREATE POLICY "Allow all for authenticated" ON public.hosts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.drugs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.stockBatches FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.therapies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.movements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.reminders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.rooms FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- Also allow anon access (for table-auth based access)
CREATE POLICY "Allow all for anon" ON public.hosts FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.drugs FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.stockBatches FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.therapies FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.movements FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.reminders FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.rooms FOR ALL TO anon USING (true) WITH CHECK (true);
-- Realtime: enable for all tables
ALTER PUBLICATION supabase_realtime
ADD TABLE public.hosts;
ALTER PUBLICATION supabase_realtime
ADD TABLE public.drugs;
ALTER PUBLICATION supabase_realtime
ADD TABLE public.stockBatches;
ALTER PUBLICATION supabase_realtime
ADD TABLE public.therapies;
ALTER PUBLICATION supabase_realtime
ADD TABLE public.movements;
ALTER PUBLICATION supabase_realtime
ADD TABLE public.reminders;
ALTER PUBLICATION supabase_realtime
ADD TABLE public.rooms;