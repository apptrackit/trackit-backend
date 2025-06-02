document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin dashboard initializing...');
    
    // Check if user is logged in
    if (localStorage.getItem('adminLoggedIn') !== 'true') {
        console.log('Not logged in, redirecting to login page');
        window.location.href = 'index.html';
        return;
    }

    // Initialize the dashboard
    initializeDashboard();
});

function initializeDashboard() {
    // Setup event listeners
    setupEventListeners();
    
    // Load initial data
    loadDashboardData();
}

function setupEventListeners() {
    // Logout button
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Create user button
    document.getElementById('create-user-btn').addEventListener('click', () => {
        const modal = document.getElementById('create-modal');
        modal.style.display = 'block';
        document.body.classList.add('modal-open');
        
        // Add event listeners for the modal
        const closeButtons = modal.querySelectorAll('.close-modal');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                modal.style.display = 'none';
                document.getElementById('create-form').reset();
                document.body.classList.remove('modal-open');
            });
        });
        
        // Close on outside click
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
                document.getElementById('create-form').reset();
                document.body.classList.remove('modal-open');
            }
        });
    });
    
    // Search input
    document.getElementById('search-input').addEventListener('input', handleSearch);
    
    // Create user form
    document.getElementById('confirm-create-btn').addEventListener('click', createUser);
}

async function loadDashboardData() {
    try {
        await Promise.all([
            fetchUserData(),
            updateStats()
        ]);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Failed to load dashboard data');
    }
}

async function fetchUserData() {
    const userDataContainer = document.getElementById('user-data');
    
    try {
        const response = await fetch('/admin/getAllUserData', {
            headers: { 'x-admin-api-key': localStorage.getItem('adminApiKey') }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        userData = data.users || [];
        
        if (!userData.length) {
            userDataContainer.innerHTML = `
                <div class="info-message">
                    <p>No users found in the database.</p>
                    <p>Click the "Create New User" button to add a user.</p>
                </div>
            `;
            return;
        }
        
        displayUserData(userData, userDataContainer);
    } catch (error) {
        console.error('Error fetching user data:', error);
        showError('Failed to load user data. Please try refreshing the page.');
    }
}

async function updateStats() {
    try {
        // Get total users count
        const response = await fetch('/admin/getAllUserData', {
            headers: { 'x-admin-api-key': localStorage.getItem('adminApiKey') }
        });

        const data = await response.json();
        const users = data.users || [];
        
        // Update total users count if element exists
        const totalUsersElement = document.getElementById('total-users');
        if (totalUsersElement) {
            totalUsersElement.textContent = users.length;
        }

        // Update registration stats
        const registrationsRange = document.getElementById('registrations-range');
        if (registrationsRange) {
            await updateRegistrations(registrationsRange.value || '24h');
        }

        // Update active users stats
        const activeUsersRange = document.getElementById('active-users-range');
        if (activeUsersRange) {
            await updateActiveUsers(activeUsersRange.value || '24h');
        }
    } catch (error) {
        console.error('Error updating stats:', error);
        showError('Failed to update statistics');
    }
}

function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const filteredData = userData.filter(user => 
        user.username.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
    );
    displayUserData(filteredData, document.getElementById('user-data'));
}

async function createUser() {
    const username = document.getElementById('create-username').value;
    const email = document.getElementById('create-email').value;
    const password = document.getElementById('create-password').value;

    if (!username || !email || !password) {
        showError('All fields are required');
        return;
    }

    try {
        const response = await fetch('/admin/createUser', {
            method: 'POST',
            headers: {
                'x-admin-api-key': localStorage.getItem('adminApiKey'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
            showSuccess('User created successfully');
            // Close the modal and reset form
            const modal = document.getElementById('create-modal');
            modal.style.display = 'none';
            document.getElementById('create-form').reset();
            document.body.classList.remove('modal-open');
            // Refresh the data
            fetchUserData();
            updateStats();
        } else {
            throw new Error(result.error || 'Failed to create user');
        }
    } catch (error) {
        console.error('Error creating user:', error);
        showError('Failed to create user: ' + error.message);
    }
}

function handleLogout() {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('apiKey');
    localStorage.removeItem('adminApiKey');
    window.location.href = 'index.html';
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Store the data globally for sorting operations
let userData = [];
let currentSortColumn = null;
let currentSortDirection = 'asc';
let currentEditingUserId = null;

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
        
        // Get all unique keys from all objects, excluding password fields
        const allKeys = new Set();
        data.forEach(item => {
            Object.keys(item).forEach(key => {
                if (key !== 'password' && key !== 'passwordHash' && key !== 'password_hash') {
                    allKeys.add(key);
                }
            });
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
        
        // Add sessions column header
        const sessionsHeader = document.createElement('th');
        sessionsHeader.textContent = 'Active Sessions';
        headerRow.appendChild(sessionsHeader);
        
        // Add actions column header
        const actionsHeader = document.createElement('th');
        actionsHeader.textContent = 'Actions';
        headerRow.appendChild(actionsHeader);
        
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
            
            // Add sessions cell with count and manage button
            const sessionsCell = document.createElement('td');
            sessionsCell.className = 'sessions-cell';
            
            const sessionsButton = document.createElement('button');
            sessionsButton.className = 'sessions-btn';
            sessionsButton.innerHTML = '<i class="fas fa-clock"></i> <span class="sessions-count">Loading...</span>';
            sessionsButton.addEventListener('click', () => showUserSessions(item));
            sessionsCell.appendChild(sessionsButton);
            
            // Fetch and update sessions count
            fetchUserSessionsCount(item.id).then(count => {
                sessionsButton.querySelector('.sessions-count').textContent = count;
            });
            
            row.appendChild(sessionsCell);
            
            // Add actions cell with improved button design
            const actionsCell = document.createElement('td');
            actionsCell.className = 'actions-cell';
            
            // Edit button
            const editButton = document.createElement('button');
            editButton.className = 'action-btn edit-btn';
            editButton.innerHTML = '<i class="fas fa-edit"></i>';
            editButton.title = 'Edit User';
            editButton.addEventListener('click', () => openEditModal(item));
            
            // Delete button
            const deleteButton = document.createElement('button');
            deleteButton.className = 'action-btn delete-btn';
            deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteButton.title = 'Delete User';
            deleteButton.addEventListener('click', () => openDeleteConfirmation(item));
            
            actionsCell.appendChild(editButton);
            actionsCell.appendChild(deleteButton);
            row.appendChild(actionsCell);
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        container.appendChild(table);
    } else if (typeof data === 'object' && data !== null) {
        // Display as formatted JSON if not an array
        const formattedJson = JSON.stringify(data, null, 4);
        container.innerHTML = `<pre>${formattedJson}</pre>`;
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

// Open the edit modal and populate with user data
function openEditModal(user) {
    currentEditingUserId = user.id;
    
    let modal = document.getElementById('edit-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'edit-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    const formFields = Object.entries(user).map(([key, value]) => {
        if (key === 'id') {
            return `<div class="form-group">
                <label>${key}:</label>
                <span>${value}</span>
                <input type="hidden" name="${key}" value="${value}">
            </div>`;
        }
        
        const isPasswordField = key === 'password' || 
                               key === 'passwordHash' || 
                               key === 'password_hash';
        
        if (value === null) {
            return `<div class="form-group">
                <label for="edit-${key}">${key}:</label>
                <input type="text" id="edit-${key}" name="${key}" value="">
            </div>`;
        } else if (typeof value === 'boolean') {
            return `<div class="form-group">
                <label for="edit-${key}">${key}:</label>
                <select id="edit-${key}" name="${key}">
                    <option value="true" ${value ? 'selected' : ''}>true</option>
                    <option value="false" ${!value ? 'selected' : ''}>false</option>
                </select>
            </div>`;
        } else if (isPasswordField) {
            return `<div class="form-group">
                <label for="edit-${key}">${key}:</label>
                <input type="password" id="edit-${key}" name="${key}" 
                        placeholder="Enter new password to change">
                <span class="field-info">Leave empty to keep current password</span>
            </div>`;
        } else {
            return `<div class="form-group">
                <label for="edit-${key}">${key}:</label>
                <input type="text" id="edit-${key}" name="${key}" value="${value}">
            </div>`;
        }
    }).join('');

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Edit User</h2>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <form id="edit-form">
                    ${formFields}
                </form>
            </div>
            <div class="modal-footer">
                <button id="save-changes-btn" class="primary-btn">Save Changes</button>
                <button class="close-modal secondary-btn">Cancel</button>
            </div>
        </div>
    `;

    modal.style.display = 'block';
    document.body.classList.add('modal-open');
    
    // Add event listeners for the new close buttons
    modal.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        });
    });

    // Add event listener for save changes button
    document.getElementById('save-changes-btn').addEventListener('click', saveChanges);
}

// Save changes from the edit form
async function saveChanges() {
    const form = document.getElementById('edit-form');
    if (!form) return;

    // Get form data
    const formData = new FormData(form);
    const userData = {};

    // Convert FormData to JSON object
    for (const [key, value] of formData.entries()) {
        // Convert to appropriate data types
        if (value === 'true') {
            userData[key] = true;
        } else if (value === 'false') {
            userData[key] = false;
        } else if(value.trim() === ""){
            userData[key] = userData[key];
        } else if (!isNaN(value) && value !== '') {
            userData[key] = Number(value);
        } else {
            userData[key] = value;
        }
    }

    try {
        // Send the updated data to the server
        const response = await fetch('/admin/updateUser', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-api-key': localStorage.getItem('adminApiKey')
            },
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
            // Close the modal
            const modal = document.getElementById('edit-modal');
            if (modal) {
                modal.style.display = 'none';
                document.body.classList.remove('modal-open');
            }

            // Refresh the data to show the updates
            fetchUserData();

            // Show success message
            showNotification('User data updated successfully!', 'success');
        } else {
            throw new Error(result.error || 'Failed to update user data');
        }
    } catch (error) {
        console.error('Error saving changes:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Open delete confirmation modal
function openDeleteConfirmation(user) {
    let modal = document.getElementById('delete-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'delete-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Confirm Deletion</h2>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <p>Are you sure you want to delete user "${user.username}"?</p>
                <p class="warning">This action cannot be undone.</p>
            </div>
            <div class="modal-footer">
                <button id="confirm-delete-btn" class="danger-btn">Delete</button>
                <button class="close-modal secondary-btn">Cancel</button>
            </div>
        </div>
    `;

    modal.style.display = 'block';
    document.body.classList.add('modal-open');
    
    // Add event listeners for the new close buttons
    modal.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        });
    });

    // Add event listener for confirm delete button
    document.getElementById('confirm-delete-btn').addEventListener('click', () => {
        deleteUser(user.id);
    });
}

// Delete the user
async function deleteUser(userId) {
    try {
        const response = await fetch('/admin/deleteUser', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-api-key': localStorage.getItem('adminApiKey')
            },
            body: JSON.stringify({ id: userId })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
            // Close the modal
            const modal = document.getElementById('delete-modal');
            if (modal) {
                modal.style.display = 'none';
                document.body.classList.remove('modal-open');
            }

            // Refresh the data to reflect the deletion
            fetchUserData();
            updateStats();

            // Show success message
            showNotification('User deleted successfully!', 'success');
        } else {
            throw new Error(result.error || 'Failed to delete user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Function to fetch user's active sessions count
async function fetchUserSessionsCount(userId) {
    try {
        const response = await fetch('/auth/sessions', {
            method: 'POST',
            headers: {
                'x-api-key': localStorage.getItem('apiKey'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId })
        });
        
        if (!response.ok) {
            return 0;
        }
        
        const data = await response.json();
        return data.success ? data.sessions.length : 0;
    } catch (error) {
        console.error('Error fetching sessions count:', error);
        return 0;
    }
}

// Function to show user's sessions in a modal
function showUserSessions(user) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('sessions-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'sessions-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    // Set initial modal content
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Active Sessions for ${user.username}</h2>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="sessions-list">
                    <div class="loading">Loading sessions...</div>
                </div>
            </div>
            <div class="modal-footer">
                <button id="logout-all-btn" class="danger-btn">
                    <i class="fas fa-sign-out-alt"></i>
                    Logout All Sessions
                </button>
                <button class="close-modal secondary-btn">Close</button>
            </div>
        </div>
    `;
    
    // Show the modal
    modal.style.display = 'block';
    document.body.classList.add('modal-open');
    
    // Add event listeners for closing the modal
    const closeButtons = modal.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
            // Refresh dashboard data when closing modal
            fetchUserData();
            updateStats();
        });
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
            // Refresh dashboard data when closing modal
            fetchUserData();
            updateStats();
        }
    });
    
    // Fetch and display sessions
    fetchUserSessions(user.id, modal.querySelector('.sessions-list'));
    
    // Add event listener for logout all button
    document.getElementById('logout-all-btn').addEventListener('click', () => {
        logoutAllUserSessions(user.id);
    });
}

// Function to fetch and display user's sessions
async function fetchUserSessions(userId, container) {
    try {
        const response = await fetch('/auth/sessions', {
            method: 'POST',
            headers: {
                'x-api-key': localStorage.getItem('apiKey'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success || !data.sessions.length) {
            container.innerHTML = '<div class="info-message">No active sessions found.</div>';
            return;
        }
        
        const sessionsList = document.createElement('div');
        sessionsList.className = 'sessions-grid';
        
        data.sessions.forEach(session => {
            const sessionCard = document.createElement('div');
            sessionCard.className = 'session-card';
            
            // Format device ID for display
            const deviceId = session.device_id;
            const shortDeviceId = `****${deviceId.slice(-4)}`;
            
            sessionCard.innerHTML = `
                <div class="session-info">
                    <div class="session-device">
                        <i class="fas fa-desktop"></i>
                        <span class="device-id" title="Click to copy full ID">${shortDeviceId}</span>
                    </div>
                    <div class="session-time">
                        <i class="fas fa-clock"></i>
                        Last check: ${new Date(session.last_check_at).toLocaleString()}
                    </div>
                    <div class="session-refresh">
                        <i class="fas fa-sync"></i>
                        Refreshed ${session.refresh_count} times
                    </div>
                </div>
                <button class="action-btn danger-btn" onclick="logoutSession('${session.device_id}', '${userId}')">
                    <i class="fas fa-sign-out-alt"></i>
                    Logout
                </button>
            `;
            
            // Add click handler for device ID
            const deviceIdElement = sessionCard.querySelector('.device-id');
            deviceIdElement.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(deviceId);
                    const originalText = deviceIdElement.textContent;
                    deviceIdElement.textContent = 'Copied!';
                    setTimeout(() => {
                        deviceIdElement.textContent = originalText;
                    }, 1500);
                } catch (err) {
                    console.error('Failed to copy:', err);
                }
            });
            
            sessionsList.appendChild(sessionCard);
        });
        
        container.innerHTML = '';
        container.appendChild(sessionsList);
    } catch (error) {
        console.error('Error fetching sessions:', error);
        container.innerHTML = '<div class="error-message">Failed to load sessions</div>';
    }
}

// Function to logout a specific session
async function logoutSession(deviceId, userId) {
    try {
        const response = await fetch('/auth/logout', {
            method: 'POST',
            headers: {
                'x-api-key': localStorage.getItem('apiKey'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ deviceId, userId })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        showSuccess('Session logged out successfully');
        // Refresh the sessions list
        const modal = document.getElementById('sessions-modal');
        if (modal) {
            fetchUserSessions(userId, modal.querySelector('.sessions-list'));
        }
    } catch (error) {
        console.error('Error logging out session:', error);
        showError('Failed to logout session');
    }
}

// Function to logout all sessions for a user
async function logoutAllUserSessions(userId) {
    try {
        const response = await fetch('/auth/logout-all', {
            method: 'POST',
            headers: {
                'x-api-key': localStorage.getItem('apiKey'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        showSuccess('All sessions logged out successfully');
        // Close the modal and refresh the user list
        const modal = document.getElementById('sessions-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
        fetchUserData();
        updateStats();
    } catch (error) {
        console.error('Error logging out all sessions:', error);
        showError('Failed to logout all sessions');
    }
}

// Function to open modal
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'block';
    document.body.classList.add('modal-open');
}

// Function to close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
}

// Add event listeners for modal close buttons
document.querySelectorAll('.close-modal').forEach(button => {
    button.addEventListener('click', () => {
        const modal = button.closest('.modal');
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    });
});

// Close modal when clicking outside
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
    });
});

// Function to update registration stats
async function updateRegistrations(range) {
    try {
        const response = await fetch(`/admin/registrations?range=${range}`, {
            headers: {
                'x-admin-api-key': localStorage.getItem('adminApiKey')
            }
        });
        const data = await response.json();
        const element = document.getElementById('new-registrations');
        if (element && data.success) {
            element.textContent = data.count;
        } else if (data.error) {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        console.error('Error fetching registration stats:', error);
        showNotification('Failed to fetch registration stats', 'error');
    }
}

// Function to update active users stats
async function updateActiveUsers(range) {
    try {
        const response = await fetch(`/admin/active-users?range=${range}`, {
            headers: {
                'x-admin-api-key': localStorage.getItem('adminApiKey')
            }
        });
        const data = await response.json();
        const element = document.getElementById('active-users');
        if (element && data.success) {
            element.textContent = data.count;
        } else if (data.error) {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        console.error('Error fetching active users stats:', error);
        showNotification('Failed to fetch active users stats', 'error');
    }
}

function initializeTimeframeButtons() {
    const registrationsButtons = document.querySelectorAll('#registrations-range .timeframe-btn');
    const activeUsersButtons = document.querySelectorAll('#active-users-range .timeframe-btn');

    function handleButtonClick(buttons, clickedButton) {
        buttons.forEach(btn => btn.classList.remove('active'));
        clickedButton.classList.add('active');
        return clickedButton.dataset.value;
    }

    registrationsButtons.forEach(button => {
        button.addEventListener('click', () => {
            const range = handleButtonClick(registrationsButtons, button);
            updateRegistrations(range);
        });
    });

    activeUsersButtons.forEach(button => {
        button.addEventListener('click', () => {
            const range = handleButtonClick(activeUsersButtons, button);
            updateActiveUsers(range);
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initializeTimeframeButtons();
    loadDashboardData();
});

// Function to update hardware information
async function updateHardwareInfo() {
    try {
        const response = await fetch('/admin/hardwareinfo', {
            headers: {
                'x-admin-api-key': localStorage.getItem('adminApiKey')
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch hardware info');
        }

        const data = await response.json();
        if (data.success) {
            const { temperature, fanSpeed, uptime } = data.hardware;

            // Update CPU temperature
            const cpuTempElement = document.getElementById('cpu-temp');
            cpuTempElement.textContent = `${temperature.value}°C`;
            cpuTempElement.className = 'hardware-value temp-' + temperature.color;

            // Update fan speed
            const fanSpeedElement = document.getElementById('fan-speed');
            fanSpeedElement.textContent = `${fanSpeed.value} RPM`;
            fanSpeedElement.className = 'hardware-value fan-' + fanSpeed.color;

            // Update uptime
            document.getElementById('server-uptime').textContent = uptime;
        }
    } catch (error) {
        console.error('Error updating hardware info:', error);
        showNotification('Failed to update hardware information', 'error');
    }
}

// Initial hardware info update
updateHardwareInfo();

// Update hardware info every minute
setInterval(updateHardwareInfo, 60000);