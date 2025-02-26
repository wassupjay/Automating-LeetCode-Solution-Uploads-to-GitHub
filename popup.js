// popup.js
document.addEventListener('DOMContentLoaded', function() {
    const setupForm = document.getElementById('setup-form');
    const actionPanel = document.getElementById('action-panel');
    const statusMessage = document.getElementById('status-message');
    const problemNameEl = document.getElementById('problem-name');
    const codeLanguageEl = document.getElementById('code-language');
    
    // Load saved settings
    chrome.storage.sync.get(['githubToken', 'githubRepo', 'githubBranch', 'fileOrganization'], function(data) {
      if (data.githubToken && data.githubRepo) {
        document.getElementById('github-token').value = data.githubToken;
        document.getElementById('github-repo').value = data.githubRepo;
        document.getElementById('github-branch').value = data.githubBranch || 'main';
        document.getElementById('file-organization').value = data.fileOrganization || 'language';
        
        // Get current tab to check if we're on a LeetCode problem page
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          const url = tabs[0].url;
          if (url.includes('leetcode.com/problems/')) {
            setupForm.classList.add('hidden');
            actionPanel.classList.remove('hidden');
            
            // Get problem details from the page
            chrome.tabs.sendMessage(tabs[0].id, {action: "getProblemDetails"}, function(response) {
              if (response && response.problemName) {
                problemNameEl.textContent = response.problemName;
                codeLanguageEl.textContent = response.language;
              } else {
                showStatus('Could not detect problem details. Make sure you\'re on a solved problem page.', 'error');
              }
            });
          }
        });
      }
    });
    
    // Save settings
    document.getElementById('save-settings').addEventListener('click', function() {
      const githubToken = document.getElementById('github-token').value;
      const githubRepo = document.getElementById('github-repo').value;
      const githubBranch = document.getElementById('github-branch').value || 'main';
      const fileOrganization = document.getElementById('file-organization').value;
      
      if (!githubToken || !githubRepo) {
        showStatus('Please fill in all required fields.', 'error');
        return;
      }
      
      chrome.storage.sync.set({
        githubToken: githubToken,
        githubRepo: githubRepo,
        githubBranch: githubBranch,
        fileOrganization: fileOrganization
      }, function() {
        showStatus('Settings saved successfully!', 'success');
        setupForm.classList.add('hidden');
        actionPanel.classList.remove('hidden');
      });
    });
    
    // Push to GitHub
    document.getElementById('push-to-github').addEventListener('click', function() {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "getCodeToSubmit"}, function(response) {
          if (response && response.code) {
            pushToGitHub(response);
          } else {
            showStatus('Could not retrieve code. Make sure you have submitted a solution.', 'error');
          }
        });
      });
    });
    
    // Change settings
    document.getElementById('change-settings').addEventListener('click', function() {
      setupForm.classList.remove('hidden');
      actionPanel.classList.add('hidden');
    });
    
    function pushToGitHub(data) {
      chrome.storage.sync.get(['githubToken', 'githubRepo', 'githubBranch', 'fileOrganization'], function(settings) {
        showStatus('Pushing to GitHub...', 'info');
        
        // Determine file path based on organization preference
        let filePath;
        const sanitizedProblemName = data.problemName.replace(/[^a-zA-Z0-9-_]/g, '_');
        const fileExtension = getFileExtension(data.language);
        
        switch(settings.fileOrganization) {
          case 'language':
            filePath = `${data.language}/${sanitizedProblemName}.${fileExtension}`;
            break;
          case 'difficulty':
            filePath = `${data.difficulty}/${sanitizedProblemName}.${fileExtension}`;
            break;
          default:
            filePath = `${sanitizedProblemName}.${fileExtension}`;
        }
        
        // Prepare file content with problem metadata
        const fileContent = `/*
  * LeetCode Problem: ${data.problemName}
  * Problem URL: ${data.problemUrl}
  * Difficulty: ${data.difficulty}
  * Category: ${data.category || 'N/A'}
  * Submission Date: ${new Date().toISOString().split('T')[0]}
  */
  
  ${data.code}`;
        
        // Base64 encode the content
        const encodedContent = btoa(unescape(encodeURIComponent(fileContent)));
        
        // Check if file already exists (to decide between create or update)
        fetch(`https://api.github.com/repos/${settings.githubRepo}/contents/${filePath}?ref=${settings.githubBranch}`, {
          headers: {
            'Authorization': `token ${settings.githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        })
        .then(response => {
          if (response.status === 404) {
            // File doesn't exist, create new file
            return createFile(settings, filePath, encodedContent, data.problemName);
          } else if (response.status === 200) {
            // File exists, update it
            return response.json()
              .then(fileData => {
                return updateFile(settings, filePath, encodedContent, fileData.sha, data.problemName);
              });
          } else {
            throw new Error(`GitHub API responded with status ${response.status}`);
          }
        })
        .then(response => {
          showStatus('Successfully pushed to GitHub!', 'success');
        })
        .catch(error => {
          console.error('Error pushing to GitHub:', error);
          showStatus(`Error: ${error.message}`, 'error');
        });
      });
    }
    
    function createFile(settings, filePath, content, problemName) {
      return fetch(`https://api.github.com/repos/${settings.githubRepo}/contents/${filePath}`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${settings.githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Add solution for ${problemName}`,
          content: content,
          branch: settings.githubBranch
        })
      }).then(response => {
        if (!response.ok) {
          return response.json().then(error => {
            throw new Error(`GitHub API error: ${error.message}`);
          });
        }
        return response.json();
      });
    }
    
    function updateFile(settings, filePath, content, sha, problemName) {
      return fetch(`https://api.github.com/repos/${settings.githubRepo}/contents/${filePath}`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${settings.githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Update solution for ${problemName}`,
          content: content,
          sha: sha,
          branch: settings.githubBranch
        })
      }).then(response => {
        if (!response.ok) {
          return response.json().then(error => {
            throw new Error(`GitHub API error: ${error.message}`);
          });
        }
        return response.json();
      });
    }
    
    function getFileExtension(language) {
      const extensions = {
        'python': 'py',
        'python3': 'py',
        'java': 'java',
        'javascript': 'js',
        'typescript': 'ts',
        'c++': 'cpp',
        'c': 'c',
        'c#': 'cs',
        'go': 'go',
        'ruby': 'rb',
        'swift': 'swift',
        'kotlin': 'kt',
        'rust': 'rs',
        'scala': 'scala',
        'php': 'php'
      };
      
      return extensions[language.toLowerCase()] || 'txt';
    }
    
    function showStatus(message, type) {
      statusMessage.textContent = message;
      statusMessage.className = 'status';
      statusMessage.classList.add(type);
      statusMessage.classList.remove('hidden');
      
      if (type === 'success' || type === 'error') {
        setTimeout(() => {
          statusMessage.classList.add('hidden');
        }, 5000);
      }
    }
  });