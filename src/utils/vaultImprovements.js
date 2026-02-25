// ═══════════════════════ VAULT IMPROVEMENTS ═══════════════════════
// Enhanced vault management: health stats, multiple backups, cleanup, integrity checks

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

/**
 * Get vault health statistics
 */
async function getVaultHealth(vaultPath) {
  const stats = {
    vaultPath,
    exists: false,
    dataFile: {
      exists: false,
      size: 0,
      lastModified: null,
      sizeFormatted: '0 B'
    },
    backups: {
      count: 0,
      totalSize: 0,
      oldest: null,
      newest: null
    },
    conflicts: {
      count: 0,
      totalSize: 0,
      oldest: null,
      newest: null
    },
    exports: {
      count: 0,
      totalSize: 0
    },
    attachments: {
      count: 0,
      totalSize: 0
    },
    totalSize: 0,
    totalSizeFormatted: '0 B',
    lastSync: null,
    health: 'unknown'
  };

  if (!vaultPath || !fs.existsSync(vaultPath)) {
    return stats;
  }

  stats.exists = true;

  try {
    // Data file stats
    const dataFile = path.join(vaultPath, 'petal.json');
    if (fs.existsSync(dataFile)) {
      const dataStat = await fsPromises.stat(dataFile);
      stats.dataFile = {
        exists: true,
        size: dataStat.size,
        lastModified: dataStat.mtime,
        sizeFormatted: formatBytes(dataStat.size)
      };
      stats.lastSync = dataStat.mtime;
    }

    // Backup files (multiple versions)
    const backupFiles = fs.readdirSync(vaultPath)
      .filter(f => f.startsWith('petal.json.bak') || f.startsWith('petal.backup.'))
      .map(filename => {
        const filePath = path.join(vaultPath, filename);
        const fileStat = fs.statSync(filePath);
        return {
          filename,
          path: filePath,
          size: fileStat.size,
          mtime: fileStat.mtime
        };
      })
      .sort((a, b) => b.mtime - a.mtime); // Newest first

    stats.backups.count = backupFiles.length;
    stats.backups.totalSize = backupFiles.reduce((sum, f) => sum + f.size, 0);
    if (backupFiles.length > 0) {
      stats.backups.newest = backupFiles[0].mtime;
      stats.backups.oldest = backupFiles[backupFiles.length - 1].mtime;
    }

    // Conflict files
    const conflictFiles = fs.readdirSync(vaultPath)
      .filter(f => f.startsWith('petal.conflict-') || f.includes('conflicted copy'))
      .map(filename => {
        const filePath = path.join(vaultPath, filename);
        const fileStat = fs.statSync(filePath);
        return {
          filename,
          path: filePath,
          size: fileStat.size,
          mtime: fileStat.mtime
        };
      })
      .sort((a, b) => b.mtime - a.mtime);

    stats.conflicts.count = conflictFiles.length;
    stats.conflicts.totalSize = conflictFiles.reduce((sum, f) => sum + f.size, 0);
    if (conflictFiles.length > 0) {
      stats.conflicts.newest = conflictFiles[0].mtime;
      stats.conflicts.oldest = conflictFiles[conflictFiles.length - 1].mtime;
    }

    // Exports directory
    const exportsDir = path.join(vaultPath, 'exports');
    if (fs.existsSync(exportsDir)) {
      const exportFiles = fs.readdirSync(exportsDir)
        .filter(f => f.endsWith('.json'))
        .map(filename => {
          const filePath = path.join(exportsDir, filename);
          const fileStat = fs.statSync(filePath);
          return fileStat.size;
        });
      stats.exports.count = exportFiles.length;
      stats.exports.totalSize = exportFiles.reduce((sum, s) => sum + s, 0);
    }

    // Attachments directory
    const attachmentsDir = path.join(vaultPath, 'attachments');
    if (fs.existsSync(attachmentsDir)) {
      const attachmentFiles = getAllFiles(attachmentsDir);
      stats.attachments.count = attachmentFiles.length;
      stats.attachments.totalSize = attachmentFiles.reduce((sum, f) => sum + f.size, 0);
    }

    // Calculate total size
    stats.totalSize = stats.dataFile.size + 
                      stats.backups.totalSize + 
                      stats.conflicts.totalSize + 
                      stats.exports.totalSize + 
                      stats.attachments.totalSize;
    stats.totalSizeFormatted = formatBytes(stats.totalSize);

    // Determine health status
    if (!stats.dataFile.exists) {
      stats.health = 'missing';
    } else if (stats.conflicts.count > 5) {
      stats.health = 'conflicts';
    } else if (stats.dataFile.size === 0) {
      stats.health = 'empty';
    } else {
      stats.health = 'healthy';
    }

  } catch (error) {
    console.error('Error calculating vault health:', error);
    stats.health = 'error';
  }

  return stats;
}

/**
 * Rotate backups - keep last N versions
 */
async function rotateBackups(vaultPath, keepCount = 5) {
  if (!vaultPath || !fs.existsSync(vaultPath)) {
    return { success: false, error: 'Vault path does not exist' };
  }

  try {
    // Get all backup files (both .bak and timestamped)
    const backupFiles = fs.readdirSync(vaultPath)
      .filter(f => f.startsWith('petal.json.bak') || f.startsWith('petal.backup.'))
      .map(filename => {
        const filePath = path.join(vaultPath, filename);
        const fileStat = fs.statSync(filePath);
        return {
          filename,
          path: filePath,
          mtime: fileStat.mtime
        };
      })
      .sort((a, b) => b.mtime - a.mtime); // Newest first

    // Keep only the most recent N backups
    const toDelete = backupFiles.slice(keepCount);
    let deletedCount = 0;

    for (const backup of toDelete) {
      try {
        await fsPromises.unlink(backup.path);
        deletedCount++;
      } catch (error) {
        console.error(`Error deleting backup ${backup.filename}:`, error);
      }
    }

    return {
      success: true,
      kept: Math.min(backupFiles.length, keepCount),
      deleted: deletedCount,
      total: backupFiles.length
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Clean up old conflict files (older than N days)
 */
async function cleanupOldConflicts(vaultPath, maxAgeDays = 30) {
  if (!vaultPath || !fs.existsSync(vaultPath)) {
    return { success: false, error: 'Vault path does not exist' };
  }

  try {
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - maxAgeMs);

    const conflictFiles = fs.readdirSync(vaultPath)
      .filter(f => f.startsWith('petal.conflict-') || f.includes('conflicted copy'))
      .map(filename => {
        const filePath = path.join(vaultPath, filename);
        const fileStat = fs.statSync(filePath);
        return {
          filename,
          path: filePath,
          mtime: fileStat.mtime
        };
      })
      .filter(f => f.mtime < cutoffDate);

    let deletedCount = 0;
    for (const conflict of conflictFiles) {
      try {
        await fsPromises.unlink(conflict.path);
        deletedCount++;
      } catch (error) {
        console.error(`Error deleting conflict ${conflict.filename}:`, error);
      }
    }

    return {
      success: true,
      deleted: deletedCount,
      total: conflictFiles.length
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Validate vault integrity
 */
async function validateVaultIntegrity(vaultPath) {
  const results = {
    valid: true,
    errors: [],
    warnings: [],
    dataFile: {
      exists: false,
      valid: false,
      parseable: false,
      hasSchemaVersion: false,
      schemaVersion: null
    }
  };

  if (!vaultPath || !fs.existsSync(vaultPath)) {
    results.valid = false;
    results.errors.push('Vault path does not exist');
    return results;
  }

  const dataFile = path.join(vaultPath, 'petal.json');
  
  if (!fs.existsSync(dataFile)) {
    results.valid = false;
    results.errors.push('Data file (petal.json) does not exist');
    return results;
  }

  results.dataFile.exists = true;

  try {
    // Check file size
    const stat = await fsPromises.stat(dataFile);
    if (stat.size === 0) {
      results.valid = false;
      results.errors.push('Data file is empty');
      return results;
    }

    // Try to parse JSON
    const content = await fsPromises.readFile(dataFile, 'utf-8');
    let data;
    try {
      data = JSON.parse(content);
      results.dataFile.parseable = true;
    } catch (parseError) {
      results.valid = false;
      results.errors.push(`JSON parse error: ${parseError.message}`);
      return results;
    }

    // Check for required fields
    if (!data.tasks || !Array.isArray(data.tasks)) {
      results.warnings.push('Missing or invalid tasks array');
    }
    if (!data.projects || !Array.isArray(data.projects)) {
      results.warnings.push('Missing or invalid projects array');
    }

    // Check schema version
    if (data.schemaVersion !== undefined) {
      results.dataFile.hasSchemaVersion = true;
      results.dataFile.schemaVersion = data.schemaVersion;
    } else {
      results.warnings.push('Missing schemaVersion (legacy data)');
    }

    // Check for duplicate IDs
    const taskIds = (data.tasks || []).map(t => t.id);
    const duplicateTaskIds = taskIds.filter((id, index) => taskIds.indexOf(id) !== index);
    if (duplicateTaskIds.length > 0) {
      results.warnings.push(`Found ${duplicateTaskIds.length} duplicate task IDs`);
    }

    const projectIds = (data.projects || []).map(p => p.id);
    const duplicateProjectIds = projectIds.filter((id, index) => projectIds.indexOf(id) !== index);
    if (duplicateProjectIds.length > 0) {
      results.warnings.push(`Found ${duplicateProjectIds.length} duplicate project IDs`);
    }

    results.dataFile.valid = true;

  } catch (error) {
    results.valid = false;
    results.errors.push(`Error validating vault: ${error.message}`);
  }

  return results;
}

/**
 * Optimize vault (remove duplicates, compact structure)
 */
async function optimizeVault(vaultPath) {
  if (!vaultPath || !fs.existsSync(vaultPath)) {
    return { success: false, error: 'Vault path does not exist' };
  }

  const dataFile = path.join(vaultPath, 'petal.json');
  if (!fs.existsSync(dataFile)) {
    return { success: false, error: 'Data file does not exist' };
  }

  try {
    // Read current data
    const content = await fsPromises.readFile(dataFile, 'utf-8');
    const data = JSON.parse(content);

    const optimizations = {
      removedDuplicateTasks: 0,
      removedDuplicateProjects: 0,
      removedDeletedTasks: 0,
      compacted: false
    };

    // Remove duplicate tasks (keep first occurrence)
    if (data.tasks && Array.isArray(data.tasks)) {
      const seenIds = new Set();
      const originalLength = data.tasks.length;
      data.tasks = data.tasks.filter(task => {
        if (!task || !task.id) return false;
        if (seenIds.has(task.id)) {
          optimizations.removedDuplicateTasks++;
          return false;
        }
        seenIds.add(task.id);
        return true;
      });
      optimizations.removedDuplicateTasks = originalLength - data.tasks.length;
    }

    // Remove duplicate projects
    if (data.projects && Array.isArray(data.projects)) {
      const seenIds = new Set();
      const originalLength = data.projects.length;
      data.projects = data.projects.filter(project => {
        if (!project || !project.id) return false;
        if (seenIds.has(project.id)) {
          optimizations.removedDuplicateProjects++;
          return false;
        }
        seenIds.add(project.id);
        return true;
      });
      optimizations.removedDuplicateProjects = originalLength - data.projects.length;
    }

    // Remove deleted tasks (optional - could be kept for history)
    // Uncomment if you want to remove deleted tasks:
    // if (data.tasks && Array.isArray(data.tasks)) {
    //   const originalLength = data.tasks.length;
    //   data.tasks = data.tasks.filter(task => !task.deletedAt);
    //   optimizations.removedDeletedTasks = originalLength - data.tasks.length;
    // }

    // Write optimized data (this will create a backup automatically via writeDataFile)
    const optimizedJson = JSON.stringify(data, null, 2);
    await fsPromises.writeFile(dataFile, optimizedJson, 'utf-8');

    optimizations.compacted = true;

    return {
      success: true,
      optimizations
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Helper functions

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      const stat = fs.statSync(filePath);
      arrayOfFiles.push({
        path: filePath,
        size: stat.size,
        mtime: stat.mtime
      });
    }
  });

  return arrayOfFiles;
}

module.exports = {
  getVaultHealth,
  rotateBackups,
  cleanupOldConflicts,
  validateVaultIntegrity,
  optimizeVault
};
