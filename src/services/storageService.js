import { openDB } from 'idb'

const DATABASE_NAME = 'DedupeLocalDB'
const DATABASE_VERSION = 1
const SESSIONS_STORE = 'sessions'

export class StorageService {
  constructor() {
    this.db = null
  }

  // Initialize the IndexedDB database
  async init() {
    if (this.db) return this.db

    this.db = await openDB(DATABASE_NAME, DATABASE_VERSION, {
      upgrade(db) {
        // Create sessions store
        if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
          const sessionsStore = db.createObjectStore(SESSIONS_STORE, {
            keyPath: 'id',
            autoIncrement: false
          })
          
          // Create indexes for efficient querying
          sessionsStore.createIndex('timestamp', 'timestamp')
          sessionsStore.createIndex('scanMode', 'scanMode')
        }
      },
    })

    return this.db
  }

  // Save a scan session
  async saveSession(sessionData) {
    await this.init()
    
    const session = {
      id: this.generateSessionId(),
      timestamp: Date.now(),
      name: sessionData.name || `Scan ${new Date().toLocaleString()}`,
      scanMode: sessionData.scanMode,
      folderName: sessionData.folderName,
      totalFiles: sessionData.totalFiles,
      duplicateGroups: sessionData.duplicateGroups,
      similarGroups: sessionData.similarGroups || [],
      settings: {
        similarityThreshold: sessionData.similarityThreshold
      },
      stats: {
        duplicateGroupsCount: sessionData.duplicateGroups?.length || 0,
        duplicateFilesCount: sessionData.duplicateGroups?.reduce((sum, group) => sum + group.length, 0) || 0,
        wastedSpace: this.calculateWastedSpace(sessionData.duplicateGroups)
      }
    }

    await this.db.put(SESSIONS_STORE, session)
    return session.id
  }

  // Load a specific session
  async loadSession(sessionId) {
    await this.init()
    return await this.db.get(SESSIONS_STORE, sessionId)
  }

  // Get all saved sessions
  async getAllSessions() {
    await this.init()
    const sessions = await this.db.getAll(SESSIONS_STORE)
    
    // Sort by timestamp (newest first)
    return sessions.sort((a, b) => b.timestamp - a.timestamp)
  }

  // Delete a session
  async deleteSession(sessionId) {
    await this.init()
    await this.db.delete(SESSIONS_STORE, sessionId)
  }

  // Update session name
  async updateSessionName(sessionId, newName) {
    await this.init()
    const session = await this.db.get(SESSIONS_STORE, sessionId)
    if (session) {
      session.name = newName
      await this.db.put(SESSIONS_STORE, session)
    }
  }

  // Get storage usage stats
  async getStorageStats() {
    await this.init()
    const sessions = await this.db.getAll(SESSIONS_STORE)
    
    return {
      sessionCount: sessions.length,
      totalSize: this.estimateStorageSize(sessions),
      oldestSession: sessions.length > 0 ? Math.min(...sessions.map(s => s.timestamp)) : null,
      newestSession: sessions.length > 0 ? Math.max(...sessions.map(s => s.timestamp)) : null
    }
  }

  // Clear all sessions (with confirmation)
  async clearAllSessions() {
    await this.init()
    await this.db.clear(SESSIONS_STORE)
  }

  // Export session data as JSON
  exportSessionAsJSON(session) {
    const exportData = {
      exportVersion: '1.0',
      exportDate: new Date().toISOString(),
      appName: 'Dedupe-Local',
      session: {
        id: session.id,
        name: session.name,
        timestamp: session.timestamp,
        scanDate: new Date(session.timestamp).toISOString(),
        scanMode: session.scanMode,
        folderName: session.folderName,
        settings: session.settings,
        statistics: {
          totalFiles: session.totalFiles,
          duplicateGroups: session.stats.duplicateGroupsCount,
          duplicateFiles: session.stats.duplicateFilesCount,
          wastedSpace: session.stats.wastedSpace
        },
        duplicateGroups: session.duplicateGroups.map(group => ({
          hash: group[0]?.hash,
          fileSize: group[0]?.size,
          fileCount: group.length,
          files: group.map(file => ({
            name: file.name,
            path: file.path,
            size: file.size,
            lastModified: file.lastModified,
            type: file.type
          }))
        })),
        similarGroups: session.similarGroups || []
      }
    }

    return JSON.stringify(exportData, null, 2)
  }

  // Download JSON as file
  downloadJSON(jsonData, filename) {
    const blob = new Blob([jsonData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Private helper methods
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  calculateWastedSpace(duplicateGroups) {
    if (!duplicateGroups) return 0
    
    return duplicateGroups.reduce((sum, group) => {
      const fileSize = group[0]?.size || 0
      return sum + (fileSize * (group.length - 1))
    }, 0)
  }

  estimateStorageSize(sessions) {
    // Rough estimate of storage size in bytes
    const jsonString = JSON.stringify(sessions)
    return new Blob([jsonString]).size
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }
}