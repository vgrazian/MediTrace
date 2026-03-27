package org.meditrace.data.local

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [StockItemEntity::class],
    version = 1,
    exportSchema = false,
)
abstract class MediTraceDatabase : RoomDatabase() {
    abstract fun stockDao(): StockDao
}
