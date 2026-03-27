package org.meditrace.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

class SyncWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {
    override suspend fun doWork(): Result {
        // Placeholder: push unsynced local records, then pull server deltas.
        return Result.success()
    }
}
