package org.meditrace.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface StockDao {
    @Query("SELECT * FROM stock_items ORDER BY name ASC")
    fun observeAll(): Flow<List<StockItemEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(items: List<StockItemEntity>)

    @Query("SELECT * FROM stock_items WHERE is_synced = 0")
    suspend fun unsyncedItems(): List<StockItemEntity>
}
