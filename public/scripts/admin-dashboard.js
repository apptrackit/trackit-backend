document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin dashboard initializing...');
    localStorage.getItem('token');
    // Check if user is logged in
    if (localStorage.getItem('adminLoggedIn') !== 'true') {
        console.log('Not logged in, redirecting to login page');
        window.location.href = 'index.html';
        return;
    }

    // Fetch user data
    fetchUserData();

    // Setup logout button
    document.getElementById('logout-btn').addEventListener('click', function() {
        localStorage.removeItem('adminLoggedIn');
        localStorage.removeItem('apiKey');
        window.location.href = 'index.html';
    });

    // Close modal when clicking outside of it
    document.addEventListener('click', function(event) {
        const editModal = document.getElementById('edit-modal');
        const deleteModal = document.getElementById('delete-modal');
        
        if (event.target === editModal) {
            closeEditModal();
        } else if (event.target === deleteModal) {
            closeDeleteModal();
        }
    });

    // Setup modal close buttons
    document.body.addEventListener('click', function(event) {
        if (event.target.classList.contains('close-modal')) {
            const editModal = document.getElementById('edit-modal');
            const deleteModal = document.getElementById('delete-modal');
            
            if (editModal && editModal.style.display === 'block') {
                closeEditModal();
            } else if (deleteModal && deleteModal.style.display === 'block') {
                closeDeleteModal();
            }
        }
    });

    // Setup save changes button
    document.body.addEventListener('click', function(event) {
        if (event.target.id === 'save-changes-btn') {
            saveChanges();
        }
    });

});

// Store the data globally for sorting operations
let userData = [];
let currentSortColumn = null;
let currentSortDirection = 'asc';
let currentEditingUserId = null;

async function fetchUserData() {
    const userDataContainer = document.getElementById('user-data');
    
    try {
        console.log('Fetching user data...');
        // Add timestamp to prevent caching issues
        const response = await fetch('/admin/getAllUserData?t=',{ headers: { 'x-api-key': localStorage.getItem('apiKey') } });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API error response:', errorText);
            throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Response data:', data);
        
        userData = data.users || []; // Handle missing users property
        console.log('User data array:', userData);
        
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
        userDataContainer.innerHTML = `
            <div class="error-message">
                <p>Failed to load user data: ${error.message}</p>
                <p>Please try refreshing the page or check the browser console for details.</p>
                <p>If you're running this locally, make sure the server is running.</p>
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
                    
                    // Check if this is a password hash field and mask it with asterisks
                    const isPasswordField = key === 'password' || 
                                           key === 'passwordHash' || 
                                           key === 'password_hash';
                    
                    if (value === null) {
                        cell.textContent = 'null';
                    } else if (isPasswordField && value) {
                        // Create a wrapper for the password hash field
                        const passwordWrapper = document.createElement('div');
                        passwordWrapper.className = 'password-wrapper';
                        
                        // Create the masked password display
                        const maskedPassword = document.createElement('div');
                        maskedPassword.className = 'masked-password';
                        maskedPassword.textContent = value.substring(0, 3) + '**********';
                        maskedPassword.title = "Hover to view full hash, click to copy";
                        maskedPassword.dataset.fullHash = value;
                        
                        // Create the tooltip element
                        const tooltip = document.createElement('div');
                        tooltip.className = 'hash-tooltip';
                        tooltip.textContent = value;
                        
                        // Add click handler to copy the hash
                        maskedPassword.addEventListener('click', function() {
                            const hash = this.dataset.fullHash;
                            copyTextToClipboard(hash)
                                .then(() => {
                                    // Show copy confirmation
                                    const copyConfirm = document.createElement('div');
                                    copyConfirm.className = 'copy-confirm';
                                    copyConfirm.textContent = 'Copied!';
                                    this.appendChild(copyConfirm);
                                    
                                    // Remove confirmation after animation
                                    setTimeout(() => {
                                        if (copyConfirm.parentNode === this) {
                                            this.removeChild(copyConfirm);
                                        }
                                    }, 1500);
                                })
                                .catch(err => {
                                    console.error('Failed to copy:', err);
                                });
                        });
                        
                        // Assemble the components
                        passwordWrapper.appendChild(maskedPassword);
                        passwordWrapper.appendChild(tooltip);
                        cell.appendChild(passwordWrapper);
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
            
            // Add actions cell with edit and delete buttons
            const actionsCell = document.createElement('td');
            actionsCell.className = 'actions-cell';
            
            // Edit button
            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.classList.add('edit-btn');
            editButton.addEventListener('click', () => openEditModal(item));
            
            // Delete button
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.classList.add('delete-btn');
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

// Open the edit modal and populate with user data
function openEditModal(user) {
    // Store the current user ID for later use when saving
    currentEditingUserId = user.id;
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('edit-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'edit-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    // Create form fields for each user property
    const formFields = Object.entries(user).map(([key, value]) => {
        // Skip id field from being editable
        if (key === 'id') {
            return `<div class="form-group">
                <label>${key}:</label>
                <span>${value}</span>
                <input type="hidden" name="${key}" value="${value}">
            </div>`;
        }
        
        // Handle password fields specially
        const isPasswordField = key === 'password' || 
                               key === 'passwordHash' || 
                               key === 'password_hash';
        
        // Handle different types of fields
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
                <input type="${isPasswordField ? 'password' : 'text'}" id="edit-${key}" name="${key}" 
                       value="${value}" placeholder="${isPasswordField ? 'Enter new password to change' : ''}">
                ${isPasswordField ? '<span class="field-info">Leave empty to keep current password</span>' : ''}
            </div>`;
        } else {
            return `<div class="form-group">
                <label for="edit-${key}">${key}:</label>
                <input type="text" id="edit-${key}" name="${key}" value="${value}">
            </div>`;
        }
    }).join('');
    
    // Set the modal content
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Edit User</h2>
                <span class="close-modal">&times;</span>
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
    
    // Show the modal
    modal.style.display = 'block';
}

// Close the edit modal
function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentEditingUserId = null;
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
                'x-api-key': localStorage.getItem('apiKey')
            },
            body: JSON.stringify(userData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Close the modal
            closeEditModal();
            
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

// Display notification message
function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        document.body.appendChild(notification);
    }
    
    // Set the message and styling
    notification.textContent = message;
    notification.className = `notification ${type}`;
    
    // Show the notification
    notification.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Open delete confirmation modal
function openDeleteConfirmation(user) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('delete-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'delete-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    // Set the modal content
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Confirm Deletion</h2>
                <span class="close-modal">&times;</span>
            </div>
            <div class="modal-body">
                <p>Are you sure you want to delete user with ID ${user.id}?</p>
                <p class="warning">This action cannot be undone.</p>
            </div>
            <div class="modal-footer">
                <button id="confirm-delete-btn" class="danger-btn" data-user-id="${user.id}">Delete</button>
                <button class="close-modal secondary-btn">Cancel</button>
            </div>
        </div>
    `;
    
    // Show the modal
    modal.style.display = 'block';
    
    // Add event listener for the confirm delete button
    document.getElementById('confirm-delete-btn').addEventListener('click', function() {
        const userId = this.getAttribute('data-user-id');
        deleteUser(userId);
    });
    
    // Close modal when clicking outside of it
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeDeleteModal();
        }
    });
}

// Close the delete modal
function closeDeleteModal() {
    const modal = document.getElementById('delete-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Delete the user
async function deleteUser(userId) {
    try {
        const response = await fetch('/admin/deleteUser', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': localStorage.getItem('apiKey')
            },
            body: JSON.stringify({ id: userId })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Close the modal
            closeDeleteModal();
            
            // Refresh the data to reflect the deletion
            fetchUserData();
            
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
