document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    if (localStorage.getItem('adminLoggedIn') !== 'true') {
        window.location.href = 'index.html';
        return;
    }

    // Fetch user data
    fetchUserData();

    // Setup logout button
    document.getElementById('logout-btn').addEventListener('click', function() {
        localStorage.removeItem('adminLoggedIn');
        window.location.href = 'index.html';
    });
});

// Store the data globally for sorting operations
let userData = [];
let currentSortColumn = null;
let currentSortDirection = 'asc';

async function fetchUserData() {
    const userDataContainer = document.getElementById('user-data');
    
    try {
        const response = await fetch('/admin/getAllUserData');
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        userData = data.users; // Store data globally
        displayUserData(userData, userDataContainer);
    } catch (error) {
        console.error('Error fetching user data:', error);
        userDataContainer.innerHTML = `
            <div class="error-message">
                <p>Failed to load user data: ${error.message}</p>
                <p>Please try refreshing the page.</p>
            </div>
        `;
    }
}

function sortData(data, column, direction) {
    return [...data].sort((a, b) => {
        const valueA = a[column] === null ? '' : a[column];
        const valueB = b[column] === null ? '' : b[column];
        
        // Handle different data types
        if (typeof valueA === 'number' && typeof valueB === 'number') {
            return direction === 'asc' ? valueA - valueB : valueB - valueA;
        } else {
            // Convert to strings for comparison
            const strA = String(valueA).toLowerCase();
            const strB = String(valueB).toLowerCase();
            
            if (strA < strB) return direction === 'asc' ? -1 : 1;
            if (strA > strB) return direction === 'asc' ? 1 : -1;
            return 0;
        }
    });
}

function displayUserData(data, container) {
    // Clear loading message
    container.innerHTML = '';
    
    if (Array.isArray(data) && data.length > 0) {
        // Create table for displaying user data
        const table = document.createElement('table');
        
        // Create table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        // Get all unique keys from all objects
        const allKeys = new Set();
        data.forEach(item => {
            Object.keys(item).forEach(key => allKeys.add(key));
        });
        
        // Create header cells
        allKeys.forEach(key => {
            const th = document.createElement('th');
            th.textContent = key;
            th.setAttribute('data-column', key);
            
            // Add sort indicator if this is the current sort column
            if (key === currentSortColumn) {
                th.classList.add('sorted');
                th.classList.add(currentSortDirection);
            }
            
            // Add click handler for sorting
            th.addEventListener('click', function() {
                handleSort(key);
            });
            
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create table body
        const tbody = document.createElement('tbody');
        
        // Add data rows
        data.forEach(item => {
            const row = document.createElement('tr');
            
            allKeys.forEach(key => {
                const cell = document.createElement('td');
                
                if (key in item) {
                    const value = item[key];
                    
                    if (value === null) {
                        cell.textContent = 'null';
                    } else if (typeof value === 'object') {
                        cell.textContent = JSON.stringify(value);
                    } else {
                        cell.textContent = value;
                    }
                } else {
                    cell.textContent = '';
                }
                
                row.appendChild(cell);
            });
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        container.appendChild(table);
    } else if (typeof data === 'object' && data !== null) {
        // Display as formatted JSON if not an array
        const formattedJson = JSON.stringify(data, null, 4);
        
        // Add syntax highlighting
        const highlightedJson = formattedJson
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
            .replace(/"([^"]+)"/g, '<span class="json-string">"$1"</span>')
            .replace(/\b(\d+)\b/g, '<span class="json-number">$1</span>')
            .replace(/\b(true|false)\b/g, '<span class="json-boolean">$1</span>')
            .replace(/\bnull\b/g, '<span class="json-null">null</span>');
        
        container.innerHTML = `<pre>${highlightedJson}</pre>`;
    } else {
        container.innerHTML = '<div class="error-message">No data available</div>';
    }
}

function handleSort(column) {
    const userDataContainer = document.getElementById('user-data');
    
    // If clicking the same column, toggle sort direction
    if (column === currentSortColumn) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        // New column, default to ascending
        currentSortColumn = column;
        currentSortDirection = 'asc';
    }
    
    // Sort the data
    const sortedData = sortData(userData, column, currentSortDirection);
    
    // Display the sorted data
    displayUserData(sortedData, userDataContainer);
}
