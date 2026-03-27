package org.meditrace.data.local

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "stock_items")
data class StockItemEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: String,
    @ColumnInfo(name = "drug_id")
    val drugId: String,
    @ColumnInfo(name = "name")
    val name: String,
    @ColumnInfo(name = "quantity")
    val quantity: Double,
    @ColumnInfo(name = "updated_at")
    val updatedAt: String,
    @ColumnInfo(name = "deleted_at")
    val deletedAt: String? = null,
    @ColumnInfo(name = "is_synced")
    val isSynced: Boolean = false,
    @ColumnInfo(name = "sync_version")
    val syncVersion: Long = 0L,
)
