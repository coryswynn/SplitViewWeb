// modalManager.js: Manages modal functionality.

import {
  createIframeContainer,
  setupIframe,
  updateContainerFramesDataId,
  updateDividers,
  makeDividerDraggable,
  updateIframeProportions,
  createDivider
} from './iframeManager.js';
import { createToolbar } from './toolbarActions.js';

const isChromeExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;


// Function to close the modal
export function closeModal(modal) {
  const modalBody = modal ? modal.querySelector('.modal-body') : null;
  if (modalBody) {
    modalBody.innerHTML = ''; // Clear previous dynamic content
  }
  if (modal) {
    modal.style.display = 'none'; // Hide the modal
  }
}

// Function to clear any previous content and then display the modal
export function clearAndDisplayModal(modal, activeContainerFrame, displayModalCallback) {
  closeModal(modal); // First, ensure the modal is reset
  if (displayModalCallback && typeof displayModalCallback === 'function') {
    displayModalCallback(modal, activeContainerFrame); // Then display the modal with the new content
  }
}

// Function to display the modal
export function displayModal(modal, activeContainerFrame) {
  if (!activeContainerFrame) return; // Ensure there's an active container frame

  const rect = activeContainerFrame.getBoundingClientRect();
  modal.style.position = 'absolute';
  modal.style.top = `${rect.top}px`;
  modal.style.left = `${rect.left}px`;
  modal.style.width = `${rect.width}px`;
  modal.style.height = `${rect.height}px`;
  modal.style.display = 'block';

  populateModalWithContent(modal, activeContainerFrame);
}

// Function to populate modal with content, such as iframe titles
function populateModalWithContent(modal, activeContainerFrame) {
  const modalBody = modal.querySelector('.modal-body');
  const iframeContainer = activeContainerFrame.querySelector('iframe');

  modalBody.innerHTML = ''; // Clear previous dynamic content

  // The search input is now conditional on the Chrome extension environment
  if (isChromeExtension) {
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search tabs...';
    searchInput.className = 'modal-search-input';
    modalBody.appendChild(searchInput);

    // Filter tabs based on search input
    searchInput.addEventListener('keyup', () => {
      const filterText = searchInput.value.toLowerCase();
      const tabItems = modalBody.querySelectorAll('.modal-url-option');
      tabItems.forEach(item => {
        const title = item.querySelector('.tab-title').textContent.toLowerCase();
        item.style.display = title.includes(filterText) ? '' : 'none';
      });
    });
  }

  const tabsContainer = document.createElement('div');
  tabsContainer.className = 'tabs-container';
  modalBody.appendChild(tabsContainer);

  if (isChromeExtension) {
    // Chrome extension environment: Use chrome.tabs to query open tabs
    chrome.tabs.query({}, function (tabs) {
      const uniqueTabs = tabs.reduce((acc, current) => {
        const x = acc.find(item => item.title === current.title);
        if (!x) {
          return acc.concat([current]);
        } else {
          return acc;
        }
      }, []);

      const sortedTabs = uniqueTabs.sort((a, b) => a.title.localeCompare(b.title));
      appendTabsToModal(sortedTabs, tabsContainer, activeContainerFrame);
    });
  } else {
    // Web environment fallback: Display a static message or implement alternative logic
    // Message and link to download the Chrome extension
    const extensionMessage = document.createElement('div');
    extensionMessage.className = 'extension-download-prompt';
    extensionMessage.innerHTML = `
      <p>⚠ You're using webview. Get the full functionality of Google Docs SplitView by adding it to Chrome.</p>
      <a href="https://chrome.google.com/webstore/detail/google-docs-splitview/mhekpeihiapfhjefakclpbmdofbmldcb" 
         target="_blank" 
         rel="noopener noreferrer" 
         class="download-extension-btn">Add to Chrome</a>
    `;
    tabsContainer.appendChild(extensionMessage);
  }
}

function appendTabsToModal(tabs, tabsContainer, activeContainerFrame) {
  let validTabsFound = false;

  // Use 'tabs' instead of 'sortedTabs'
  tabs.forEach(function (tab) {
    // Check if the tab's URL matches Google Docs, Sheets, or Slides
    if (/https:\/\/docs\.google\.com\/(document|spreadsheets|presentation)/.test(tab.url)) {
      validTabsFound = true;
      const tabItem = document.createElement('div');
      tabItem.className = 'modal-url-option'; // Use your existing class for styling

      // Create an image element for the favicon
      const favicon = document.createElement('img');
      favicon.src = 'https://s2.googleusercontent.com/s2/favicons?domain_url=' + tab.url;
      favicon.className = 'favicon'; // Use this class for additional styling (size, margin, etc.)
      favicon.alt = 'Favicon'; // Alternative text for accessibility

      // Create a span element for the tab's title
      const titleSpan = document.createElement('span');
      titleSpan.textContent = tab.title.replace(/( - Google (Sheets|Docs|Slides))/, ''); // Remove "- Google Sheets," "- Google Docs," or "- Google Slides" from the title
      titleSpan.className = 'tab-title'; // Use this class for styling

      // Create a button to open new tabs
      const plusButton = createPlusButton(activeContainerFrame, tab.url); // Corrected to use 'activeContainerFrame'

      // Append the favicon, title span, and plus button to the tabItem
      tabItem.appendChild(favicon);
      tabItem.appendChild(titleSpan);
      tabItem.appendChild(plusButton);

      // Event listener for clicking a tabItem
      tabItem.addEventListener('click', () => {
        const iframe = activeContainerFrame.querySelector('iframe');
        if (iframe) {
          iframe.src = tab.url; // Update the iframe source to the selected URL
        }

        // Update the URL
        updateBrowserURL();

        // Update the title in the toolbar
        const titleElement = activeContainerFrame.querySelector('.url-text');
        if (titleElement) {
          titleElement.textContent = tab.title.replace(/( - Google (Sheets|Docs|Slides))/, '');
        }

        // Hide the modal after selection
        closeModal(modal);
      });

      tabsContainer.appendChild(tabItem); // Append to the modal content
    }
  });

  if (!validTabsFound) {
    tabsContainer.textContent = 'No Google Docs, Sheets, or Slides tabs found.';
  }
}

// Function to adjust modal position based on the active container frame's bounds
export function adjustModalPosition(modal, activeContainerFrame) {
  if (!modal || !activeContainerFrame) {
    console.log('No modal');
    console.error('Modal or activeContainerFrame is not defined.');
    return;
  }

  // console.log('Starting adjustment of modal');
  const rect = activeContainerFrame.getBoundingClientRect();
  modal.style.position = 'absolute';
  modal.style.top = `${rect.top}px`;
  modal.style.left = `${rect.left}px`;
  modal.style.width = `${rect.width}px`;
  modal.style.height = `${rect.height}px`;
  modal.style.display = 'block';
}

// Event listener for clicks outside the modal to close it
export function setupModalDismissal(modal, closeModalCallback) {
  modal.addEventListener('click', function (event) {
    if (event.target === modal) {
      if (closeModalCallback && typeof closeModalCallback === 'function') {
        closeModalCallback(modal);
      }
    }
  });

  // Close button event listener
  const closeButton = modal.querySelector('.close-button');
  if (closeButton) {
    closeButton.addEventListener('click', () => closeModalCallback(modal));
  }
}

// Planned functionality to update URL bar for easy sharing

export function updateBrowserURL() {
  let newURL;
  if (isChromeExtension) {
    newURL = 'viewer.html?urls=' + encodeAndJoinFrameURLs();
  } else {
    newURL = '?urls=' + encodeAndJoinFrameURLs();
  }
  
  const state = { page: newURL };
  const title = ''; // Optional: You can set a title for the new state
  const url = newURL; // The new URL you want to show in the browser

  history.pushState(state, title, url);
}

function encodeAndJoinFrameURLs() {
  // Select all iframe elements within the document
  const iframes = document.querySelectorAll('iframe');
  const encodedURLs = [];
  // console.log('encoding');

  // Iterate over each iframe to access its URL
  iframes.forEach((iframe) => {
    // Get the iframe's src attribute, which contains its URL
    const url = iframe.src;
    // Encode the URL
    const encodedUrl = encodeURIComponent(url);
    // Add the encoded URL to the array
    encodedURLs.push(encodedUrl);
    // console.log(encodedURLs)
  });

  // Join the encoded URLs with a comma
  const result = encodedURLs.join(',');

  // Here you can return the result or do something else with it
  return result;
}

function createPlusButton(iframeContainer, url) {
  const plusButton = document.createElement('button');
  plusButton.className = 'add-frame-button';
  plusButton.innerHTML = '<i class="bx bx-add-to-queue"></i>'; // BoxIcons plus icon
  plusButton.onclick = (event) => {
    // Assume `addNewFrame` is a function that handles adding a new frame
    // console.log("adding new frame");
    event.stopPropagation(); // Prevent the click from bubbling up to parent elements
    addNewFrame(url);

  };
  return plusButton;
}

export function addNewFrame(url) {
  const iframeContainer = document.getElementById('iframeContainer'); // Ensure this is the correct container element ID
  if (!iframeContainer) {
    console.error('Iframe container not found');
    return;
  }

  const index = iframeContainer.querySelectorAll('.url-container').length;
  const containerFrame = createIframeContainer(url, index, iframeContainer);
  // console.log('ContainerFrame and iFrameCreated')

  closeModal(modal);

  createToolbar(containerFrame, url); // Assuming createToolbar also appends the toolbar to the containerFrame
  setupIframe(containerFrame, url);

  // If it's not the first iframe, create and insert a new divider
  if (index > 0) {
    const divider = document.createElement('div');
    divider.className = 'iframe-divider';
    iframeContainer.insertBefore(divider, containerFrame); // Insert the divider before the new frame
    makeDividerDraggable(divider, iframeContainer, updateIframeProportions); // Make the new divider draggable
  }

  updateContainerFramesDataId(iframeContainer);
  // console.log('ContainerFrames Updated')

  updateDividers(iframeContainer);

  updateBrowserURL(); // If you have a function to update the browser's address bar
  // console.log('BrowserUpdated')
}
