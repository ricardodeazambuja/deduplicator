// File System Access API service
export class FileSystemService {
  constructor() {
    this.supportedFileSystemAccess = 'showDirectoryPicker' in window
  }

  // Check if File System Access API is supported
  isSupported() {
    return this.supportedFileSystemAccess
  }

  // Select a directory using File System Access API
  async selectDirectory() {
    if (!this.isSupported()) {
      throw new Error('File System Access API is not supported in this browser')
    }

    try {
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite' // Need write access for deletion
      })
      return dirHandle
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Directory selection was cancelled')
      }
      throw new Error(`Failed to select directory: ${error.message}`)
    }
  }

  // Recursively traverse directory and collect all files
  async* traverseDirectory(dirHandle, path = '') {
    try {
      for await (const [name, handle] of dirHandle.entries()) {
        const currentPath = path ? `${path}/${name}` : name
        
        if (handle.kind === 'file') {
          try {
            const file = await handle.getFile()
            yield {
              fileHandle: handle,
              file: file,
              name: name,
              path: currentPath,
              size: file.size,
              lastModified: file.lastModified,
              type: file.type || 'unknown'
            }
          } catch (error) {
            console.warn(`Could not access file ${currentPath}: ${error.message}`)
          }
        } else if (handle.kind === 'directory') {
          // Recursively traverse subdirectories
          yield* this.traverseDirectory(handle, currentPath)
        }
      }
    } catch (error) {
      console.error(`Error traversing directory ${path}: ${error.message}`)
    }
  }

  // Get all files from a directory handle
  async getAllFiles(dirHandle) {
    const files = []
    
    try {
      for await (const fileInfo of this.traverseDirectory(dirHandle)) {
        files.push(fileInfo)
      }
    } catch (error) {
      throw new Error(`Failed to read directory contents: ${error.message}`)
    }

    return files
  }

  // Delete a file
  async deleteFile(fileHandle, fileName) {
    try {
      await fileHandle.remove()
      return { success: true, fileName }
    } catch (error) {
      return { 
        success: false, 
        fileName, 
        error: error.message 
      }
    }
  }

  // Delete multiple files with progress callback
  async deleteFiles(fileHandles, onProgress) {
    const results = []
    let completed = 0

    for (const { fileHandle, fileName } of fileHandles) {
      const result = await this.deleteFile(fileHandle, fileName)
      results.push(result)
      completed++
      
      if (onProgress) {
        onProgress({
          completed,
          total: fileHandles.length,
          progress: completed / fileHandles.length,
          currentFile: fileName,
          result
        })
      }
    }

    return results
  }

  // Move a file to target directory with new name
  async moveFile(sourceFileHandle, targetDirHandle, newName) {
    try {
      // Get the source file
      const sourceFile = await sourceFileHandle.getFile()
      
      // Create new file in target directory
      const targetFileHandle = await targetDirHandle.getFileHandle(newName, { create: true })
      const writable = await targetFileHandle.createWritable()
      
      // Copy file content
      await writable.write(sourceFile)
      await writable.close()
      
      // Delete source file
      await sourceFileHandle.remove()
      
      return { success: true, fileName: newName }
    } catch (error) {
      return { 
        success: false, 
        fileName: newName, 
        error: error.message 
      }
    }
  }

  // Validate directory name
  validateDirectoryName(name) {
    if (!name || typeof name !== 'string') {
      return { valid: false, error: 'Directory name is required' }
    }
    
    const trimmed = name.trim()
    if (trimmed.length === 0) {
      return { valid: false, error: 'Directory name cannot be empty' }
    }
    
    if (trimmed.length > 255) {
      return { valid: false, error: 'Directory name too long (max 255 characters)' }
    }
    
    // Invalid characters for directory names
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/
    if (invalidChars.test(trimmed)) {
      return { valid: false, error: 'Directory name contains invalid characters' }
    }
    
    // Reserved names (Windows)
    const reserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']
    if (reserved.includes(trimmed.toUpperCase())) {
      return { valid: false, error: 'Directory name is reserved' }
    }
    
    return { valid: true, name: trimmed }
  }

  // Check if directory exists
  async checkDirectoryExists(parentDirHandle, directoryName) {
    try {
      await parentDirHandle.getDirectoryHandle(directoryName)
      return true
    } catch (error) {
      return false
    }
  }

  // Generate unique directory name if conflicts exist
  async generateUniqueDirectoryName(parentDirHandle, baseName) {
    const validation = this.validateDirectoryName(baseName)
    if (!validation.valid) {
      throw new Error(validation.error)
    }
    
    const cleanBaseName = validation.name
    let candidateName = cleanBaseName
    let counter = 1
    
    while (await this.checkDirectoryExists(parentDirHandle, candidateName)) {
      candidateName = `${cleanBaseName}_${counter}`
      counter++
      
      // Prevent infinite loops
      if (counter > 1000) {
        throw new Error('Unable to generate unique directory name')
      }
    }
    
    return candidateName
  }

  // Create custom directory with conflict resolution
  async createCustomDirectory(parentDirHandle, directoryName, autoResolveConflicts = true) {
    try {
      const validation = this.validateDirectoryName(directoryName)
      if (!validation.valid) {
        throw new Error(validation.error)
      }
      
      let finalDirectoryName = validation.name
      
      if (autoResolveConflicts) {
        finalDirectoryName = await this.generateUniqueDirectoryName(parentDirHandle, validation.name)
      }
      
      const dirHandle = await parentDirHandle.getDirectoryHandle(finalDirectoryName, { create: true })
      
      return {
        handle: dirHandle,
        name: finalDirectoryName,
        wasRenamed: finalDirectoryName !== validation.name
      }
    } catch (error) {
      throw new Error(`Failed to create directory '${directoryName}': ${error.message}`)
    }
  }

  // Legacy method for backward compatibility
  async createDedupeLocalDirectory(parentDirHandle) {
    const result = await this.createCustomDirectory(parentDirHandle, 'dedupelocal', true)
    return result.handle
  }

  // Handle filename conflicts using underscore naming
  async handleNameConflict(targetDirHandle, originalName) {
    const splitName = (filename) => {
      const lastDotIndex = filename.lastIndexOf('.')
      if (lastDotIndex === -1) {
        return [filename, '']
      }
      return [filename.slice(0, lastDotIndex), filename.slice(lastDotIndex)]
    }

    let counter = 1
    let newName = originalName
    const [baseName, extension] = splitName(originalName)

    while (true) {
      try {
        // Check if file already exists
        await targetDirHandle.getFileHandle(newName)
        // If we get here, file exists, try next name
        newName = `${baseName}_${counter}${extension}`
        counter++
      } catch (error) {
        // File doesn't exist, we can use this name
        break
      }
    }

    return newName
  }

  // Move multiple files with progress callback and manifest generation
  async moveFiles(filesToMove, archiveDirHandle, onProgress) {
    const results = []
    const operations = []
    const errors = []
    let completed = 0

    for (const fileInfo of filesToMove) {
      try {
        // Handle name conflicts
        const finalName = await this.handleNameConflict(archiveDirHandle, fileInfo.fileName || fileInfo.name)
        
        // Move the file
        const result = await this.moveFile(fileInfo.fileHandle, archiveDirHandle, finalName)
        results.push(result)

        if (result.success) {
          // Record successful operation for manifest
          operations.push({
            original_path: fileInfo.path,
            archive_path: `${archiveDirHandle.name}/${finalName}`,
            original_name: fileInfo.fileName || fileInfo.name,
            archive_name: finalName,
            moved_at: new Date().toISOString(),
            file_size: fileInfo.size || 0,
            duplicate_group_id: fileInfo.groupId || null
          })
        } else {
          errors.push({
            file_path: fileInfo.path,
            file_name: fileInfo.fileName || fileInfo.name,
            error: result.error,
            attempted_at: new Date().toISOString()
          })
        }

        completed++
        
        if (onProgress) {
          onProgress({
            completed,
            total: filesToMove.length,
            progress: completed / filesToMove.length,
            currentFile: fileInfo.fileName || fileInfo.name,
            result
          })
        }
      } catch (error) {
        const errorResult = { success: false, fileName: fileInfo.fileName || fileInfo.name, error: error.message }
        results.push(errorResult)
        
        errors.push({
          file_path: fileInfo.path,
          file_name: fileInfo.fileName || fileInfo.name,
          error: error.message,
          attempted_at: new Date().toISOString()
        })

        completed++
        if (onProgress) {
          onProgress({
            completed,
            total: filesToMove.length,
            progress: completed / filesToMove.length,
            currentFile: fileInfo.fileName || fileInfo.name,
            result: errorResult
          })
        }
      }
    }

    // Generate move manifest
    const manifest = await this.createMoveManifest(operations, errors, archiveDirHandle)

    return { results, manifest }
  }

  // Create comprehensive move manifest/log
  async createMoveManifest(operations, errors, archiveDirHandle) {
    const timestamp = new Date().toISOString()
    const sessionId = `move_${timestamp.replace(/[:.]/g, '').slice(0, 15)}`
    
    const manifest = {
      timestamp,
      session_id: sessionId,
      archive_directory: archiveDirHandle.name,
      total_files_moved: operations.length,
      total_errors: errors.length,
      operations,
      errors,
      summary: {
        successful_moves: operations.length,
        failed_moves: errors.length,
        success_rate: operations.length / (operations.length + errors.length)
      }
    }

    // Save manifest to archive directory
    try {
      const manifestName = `move_log_${sessionId}.json`
      const manifestHandle = await archiveDirHandle.getFileHandle(manifestName, { create: true })
      const writable = await manifestHandle.createWritable()
      await writable.write(JSON.stringify(manifest, null, 2))
      await writable.close()
      
      manifest.manifest_file = manifestName
    } catch (error) {
      console.warn('Could not save manifest to archive directory:', error)
      manifest.manifest_save_error = error.message
    }

    return manifest
  }

  // Select archive directory (parent where dedupelocal will be created)
  async selectArchiveDirectory() {
    if (!this.isSupported()) {
      throw new Error('File System Access API is not supported in this browser')
    }

    try {
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite', // Need write access for creating archive folder
        startIn: 'documents'
      })
      return dirHandle
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Archive directory selection was cancelled')
      }
      throw new Error(`Failed to select archive directory: ${error.message}`)
    }
  }
}