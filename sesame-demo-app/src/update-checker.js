
const { app, dialog } = require('electron');
const https = require('https');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const electronLog = require('electron-log');

const GITHUB_REPO = 'nvv1d/csmelectron';
const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}`;

function log(message) {
  electronLog.info(`[UpdateChecker] ${message}`);
}

function getCurrentVersion() {
  try {
    // Try to read package.json from current directory first
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    return packageJson.version || '0.0.0';
  } catch (err) {
    try {
      // Try parent directory as fallback
      const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
      return packageJson.version || '0.0.0';
    } catch (parentErr) {
      log(`Error reading package.json: ${parentErr}`);
      return '0.0.0';
    }
  }
}

function compareVersions(v1, v2) {
  const v1Parts = v1.split('.').map(Number);
  const v2Parts = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    
    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }
  
  return 0;
}

function getLatestReleaseInfo() {
  return new Promise((resolve, reject) => {
    // Check for GitHub token in environment variables
    const githubToken = process.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      log('No GitHub token found. Required for private repositories.');
      reject(new Error('GitHub token is required for private repositories'));
      return;
    }
    
    const options = {
      headers: {
        'User-Agent': 'Sesame-Electron-App',
        'Authorization': `token ${githubToken}`
      }
    };
    
    log('Using GitHub token for API request');
    
    https.get(`${GITHUB_API}/releases/latest`, options, (res) => {
      if (res.statusCode !== 200) {
        if (res.statusCode === 404) {
          log('Repository not found or no releases available');
          reject(new Error('Repository not found or no releases available. Check your token permissions.'));
        } else {
          reject(new Error(`GitHub API returned status code ${res.statusCode}`));
        }
        return;
      }
      
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          if (!release.tag_name) {
            reject(new Error('No release version found'));
            return;
          }
          resolve({
            version: release.tag_name.replace(/^v/, ''),
            downloadUrl: release.assets[0]?.browser_download_url,
            releaseNotes: release.body
          });
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

async function checkForUpdates(silent = false) {
  try {
    log('Checking for updates...');
    const currentVersion = getCurrentVersion();
    log(`Current version: ${currentVersion}`);
    
    const latestRelease = await getLatestReleaseInfo();
    log(`Latest version: ${latestRelease.version}`);
    
    if (compareVersions(latestRelease.version, currentVersion) > 0) {
      log('Update available!');
      
      if (!silent) {
        const result = await dialog.showMessageBox({
          type: 'info',
          title: 'Update Available',
          message: `A new version (${latestRelease.version}) is available for download.`,
          detail: latestRelease.releaseNotes || 'No release notes available.',
          buttons: ['Download Now', 'Remind Me Later'],
          cancelId: 1
        });
        
        if (result.response === 0 && latestRelease.downloadUrl) {
          // Open download URL in default browser
          const { shell } = require('electron');
          shell.openExternal(latestRelease.downloadUrl);
        }
      }
      
      return {
        updateAvailable: true,
        latestVersion: latestRelease.version,
        downloadUrl: latestRelease.downloadUrl,
        releaseNotes: latestRelease.releaseNotes
      };
    } else {
      log('No updates available');
      return { updateAvailable: false };
    }
  } catch (err) {
    log(`Error checking for updates: ${err}`);
    if (!silent) {
      dialog.showErrorBox(
        'Update Check Failed',
        `Failed to check for updates: ${err.message}`
      );
    }
    return { updateAvailable: false, error: err.message };
  }
}

module.exports = {
  checkForUpdates
};
