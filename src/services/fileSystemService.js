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
}