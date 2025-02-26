// content.js
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "getProblemDetails") {
      const problemDetails = {
        problemName: getProblemName(),
        language: getCodeLanguage(),
        difficulty: getDifficulty(),
        category: getCategory(),
        problemUrl: window.location.href
      };
      sendResponse(problemDetails);
    }
    
    if (request.action === "getCodeToSubmit") {
      const codeDetails = {
        code: getCode(),
        problemName: getProblemName(),
        language: getCodeLanguage(),
        difficulty: getDifficulty(),
        category: getCategory(),
        problemUrl: window.location.href
      };
      sendResponse(codeDetails);
    }
    
    return true; // Indicates async response
  });
  
  function getProblemName() {
    // Try various selectors that might contain the problem name
    const titleElement = document.querySelector('div[data-cy="question-title"]') || 
                         document.querySelector('.css-v3d350') ||
                         document.querySelector('title');
    
    if (titleElement) {
      // Clean up the title to get just the problem name
      let title = titleElement.textContent;
      // If it's from the page title, it might have a format like "123. Problem Name - LeetCode"
      if (titleElement.tagName === 'TITLE') {
        const match = title.match(/^(\d+\.\s)?(.*?)(\s-\s.*)?$/);
        if (match) {
          title = match[2].trim();
        }
      }
      return title;
    }
    
    // Fallback: extract from URL
    const pathParts = window.location.pathname.split('/');
    for (let i = 0; i < pathParts.length; i++) {
      if (pathParts[i] === 'problems' && i + 1 < pathParts.length) {
        return pathParts[i + 1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
    }
    
    return "Unknown Problem";
  }
  
  function getCodeLanguage() {
    // Check for language selector
    const languageSelector = document.querySelector('[data-cy="lang-select"]') || 
                            document.querySelector('.css-jspxo5');
    
    if (languageSelector) {
      return languageSelector.textContent.trim();
    }
    
    // Look for Monaco editor language information
    const editorElements = document.querySelectorAll('.monaco-editor');
    for (const editor of editorElements) {
      const langAttr = editor.getAttribute('data-language') || 
                      editor.getAttribute('data-mode');
      if (langAttr) {
        return langAttr;
      }
    }
    
    return "Unknown";
  }
  
  function getDifficulty() {
    // Look for difficulty indicator
    const difficultyElement = document.querySelector('[data-difficulty]') ||
                             document.querySelector('.css-10o4wqw');
    
    if (difficultyElement) {
      return difficultyElement.textContent.trim();
    }
    
    // Look for color-coded difficulty markers
    const easyMarker = document.querySelector('.text-success, .text-olive, .text-green');
    if (easyMarker) return "Easy";
    
    const mediumMarker = document.querySelector('.text-warning, .text-yellow');
    if (mediumMarker) return "Medium";
    
    const hardMarker = document.querySelector('.text-danger, .text-pink, .text-red');
    if (hardMarker) return "Hard";
    
    return "Unknown";
  }
  
  function getCategory() {
    // Look for category/tag information
    const tagElements = document.querySelectorAll('.tag__1z0V, .css-10o4wqw');
    if (tagElements.length > 0) {
      const tags = Array.from(tagElements).map(el => el.textContent.trim());
      return tags.join(', ');
    }
    
    return "";
  }
  
  function getCode() {
    // First try to get code from the editor
    const editorContent = document.querySelector('.CodeMirror-code, .monaco-editor');
    if (editorContent) {
      // For Monaco editor, we need to access window.__NEXT_DATA__ or similar
      if (window.__NEXT_DATA__ && window.__NEXT_DATA__.props?.pageProps?.submissionCode) {
        return window.__NEXT_DATA__.props.pageProps.submissionCode;
      }
      
      // Try to get from Monaco model if available
      try {
        const models = window.monaco?.editor?.getModels();
        if (models && models.length > 0) {
          return models[0].getValue();
        }
      } catch (e) {
        console.error("Error accessing Monaco model:", e);
      }
      
      // Try to extract from CodeMirror
      if (editorContent.classList.contains('CodeMirror-code')) {
        const lines = editorContent.querySelectorAll('.CodeMirror-line');
        if (lines.length > 0) {
          return Array.from(lines).map(line => line.textContent).join('\n');
        }
      }
    }
    
    // Look for submitted code or solution in the page
    const codeBlocks = document.querySelectorAll('pre, code');
    for (const block of codeBlocks) {
      const code = block.textContent.trim();
      if (code.length > 50) {  // Arbitrary length to avoid getting short code snippets
        return code;
      }
    }
    
    // Last resort: Try to find solution tabs and get the active one
    const solutionTabs = document.querySelectorAll('.tab, .css-1rdgofi');
    for (const tab of solutionTabs) {
      if (tab.classList.contains('active') || tab.getAttribute('aria-selected') === 'true') {
        const nearestCodeBlock = tab.closest('.tab-content, .css-1ykbugg')?.querySelector('pre, code');
        if (nearestCodeBlock) {
          return nearestCodeBlock.textContent.trim();
        }
      }
    }
    
    return "// Could not extract code";
  }