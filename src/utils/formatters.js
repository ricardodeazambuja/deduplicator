/**
 * Utility functions for formatting data display
 */

/**
 * Format bytes into human-readable format
 * @param {number} bytes - Number of bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Format duration into human-readable format
 * @param {number} milliseconds - Duration in milliseconds
 * @returns {string} Formatted string (e.g., "2m 30s")
 */
export function formatDuration(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

/**
 * Format number with commas as thousands separators
 * @param {number} num - Number to format
 * @returns {string} Formatted number (e.g., "1,234,567")
 */
export function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * Format percentage
 * @param {number} value - Value between 0 and 1
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage (e.g., "85.5%")
 */
export function formatPercentage(value, decimals = 1) {
  return (value * 100).toFixed(decimals) + '%'
}

/**
 * Truncate string to specified length
 * @param {string} str - String to truncate
 * @param {number} length - Maximum length
 * @param {string} suffix - Suffix to add when truncated
 * @returns {string} Truncated string
 */
export function truncateString(str, length, suffix = '...') {
  if (!str || str.length <= length) return str
  return str.substring(0, length - suffix.length) + suffix
}

/**
 * Format file path for display
 * @param {string} path - File path
 * @param {number} maxLength - Maximum display length
 * @returns {string} Formatted path
 */
export function formatFilePath(path, maxLength = 50) {
  if (!path || path.length <= maxLength) return path
  
  const parts = path.split('/')
  if (parts.length <= 2) return truncateString(path, maxLength)
  
  // Keep first and last part, truncate middle
  const first = parts[0]
  const last = parts[parts.length - 1]
  const remaining = maxLength - first.length - last.length - 6 // 6 for "/.../""
  
  if (remaining > 0) {
    return `${first}/.../${last}`
  } else {
    return truncateString(path, maxLength)
  }
}