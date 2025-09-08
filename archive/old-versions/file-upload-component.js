// File Upload Component for Hey Spruce Portals
// This component can be included in any portal page to enable file uploads

class FileUploadManager {
    constructor(options = {}) {
        this.entityType = options.entityType || 'general';
        this.entityId = options.entityId || null;
        this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB default
        this.acceptedTypes = options.acceptedTypes || '*';
        this.multiple = options.multiple !== false;
        this.onUploadComplete = options.onUploadComplete || (() => {});
        this.onError = options.onError || ((error) => console.error(error));
        this.authToken = null;
        this.uploadedFiles = [];
    }

    async initialize() {
        // Get auth token from Supabase
        if (window.supabase) {
            const { data: { session } } = await window.supabase.auth.getSession();
            if (session) {
                this.authToken = session.access_token;
            }
        }
    }

    createUploadWidget(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container with ID ${containerId} not found`);
            return;
        }

        const widgetHTML = `
            <div class="file-upload-widget" style="
                border: 2px dashed #d1d5db;
                border-radius: 8px;
                padding: 2rem;
                text-align: center;
                background: #f9fafb;
                transition: all 0.3s ease;
                position: relative;
            ">
                <input type="file" 
                    id="file-input-${containerId}" 
                    class="file-input" 
                    style="display: none;" 
                    ${this.multiple ? 'multiple' : ''}
                    accept="${this.acceptedTypes}">
                
                <div class="upload-icon" style="margin-bottom: 1rem;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                </div>
                
                <div class="upload-text">
                    <p style="font-weight: 600; margin-bottom: 0.5rem;">
                        Click to upload or drag and drop
                    </p>
                    <p style="font-size: 0.875rem; color: #6b7280;">
                        ${this.getAcceptedTypesText()} (Max ${this.formatFileSize(this.maxFileSize)})
                    </p>
                </div>
                
                <div id="upload-progress-${containerId}" style="display: none; margin-top: 1rem;">
                    <div style="
                        background: #e5e7eb;
                        height: 8px;
                        border-radius: 4px;
                        overflow: hidden;
                    ">
                        <div class="progress-bar" style="
                            background: #3b82f6;
                            height: 100%;
                            width: 0%;
                            transition: width 0.3s ease;
                        "></div>
                    </div>
                    <p style="font-size: 0.875rem; margin-top: 0.5rem; color: #6b7280;">
                        Uploading... <span class="progress-text">0%</span>
                    </p>
                </div>
                
                <div id="uploaded-files-${containerId}" class="uploaded-files" style="
                    margin-top: 1.5rem;
                    text-align: left;
                    display: none;
                ">
                    <h4 style="font-weight: 600; margin-bottom: 0.5rem;">Uploaded Files:</h4>
                    <div class="file-list"></div>
                </div>
            </div>
        `;

        container.innerHTML = widgetHTML;
        this.attachEventListeners(containerId);
    }

    attachEventListeners(containerId) {
        const widget = document.querySelector(`#${containerId} .file-upload-widget`);
        const fileInput = document.getElementById(`file-input-${containerId}`);

        // Click to upload
        widget.addEventListener('click', (e) => {
            if (e.target.closest('.file-item-remove')) return;
            fileInput.click();
        });

        // Drag and drop
        widget.addEventListener('dragover', (e) => {
            e.preventDefault();
            widget.style.borderColor = '#3b82f6';
            widget.style.background = '#eff6ff';
        });

        widget.addEventListener('dragleave', (e) => {
            e.preventDefault();
            widget.style.borderColor = '#d1d5db';
            widget.style.background = '#f9fafb';
        });

        widget.addEventListener('drop', (e) => {
            e.preventDefault();
            widget.style.borderColor = '#d1d5db';
            widget.style.background = '#f9fafb';
            
            const files = Array.from(e.dataTransfer.files);
            this.handleFiles(files, containerId);
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            this.handleFiles(files, containerId);
        });
    }

    async handleFiles(files, containerId) {
        // Validate files
        const validFiles = files.filter(file => {
            if (file.size > this.maxFileSize) {
                this.onError(`File ${file.name} exceeds maximum size of ${this.formatFileSize(this.maxFileSize)}`);
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) return;

        // Show progress
        const progressDiv = document.getElementById(`upload-progress-${containerId}`);
        const progressBar = progressDiv.querySelector('.progress-bar');
        const progressText = progressDiv.querySelector('.progress-text');
        progressDiv.style.display = 'block';

        try {
            // Prepare form data
            const formData = new FormData();
            validFiles.forEach(file => {
                formData.append('file', file);
            });
            formData.append('entity_type', this.entityType);
            if (this.entityId) {
                formData.append('entity_id', this.entityId);
            }

            // Upload files
            const response = await fetch('/api/file-upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Upload failed');
            }

            const result = await response.json();
            
            // Update progress
            progressBar.style.width = '100%';
            progressText.textContent = '100%';

            // Add to uploaded files list
            this.uploadedFiles.push(...result.files);
            this.displayUploadedFiles(containerId);

            // Hide progress after delay
            setTimeout(() => {
                progressDiv.style.display = 'none';
                progressBar.style.width = '0%';
                progressText.textContent = '0%';
            }, 1000);

            // Call completion callback
            this.onUploadComplete(result.files);

            // Show success message
            this.showToast('Files uploaded successfully!', 'success');

        } catch (error) {
            console.error('Upload error:', error);
            progressDiv.style.display = 'none';
            this.onError(error.message);
            this.showToast('Upload failed: ' + error.message, 'error');
        }
    }

    displayUploadedFiles(containerId) {
        const filesDiv = document.getElementById(`uploaded-files-${containerId}`);
        const fileList = filesDiv.querySelector('.file-list');
        
        if (this.uploadedFiles.length === 0) {
            filesDiv.style.display = 'none';
            return;
        }

        filesDiv.style.display = 'block';
        
        fileList.innerHTML = this.uploadedFiles.map(file => `
            <div class="file-item" data-file-id="${file.id}" style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0.5rem;
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 4px;
                margin-bottom: 0.5rem;
            ">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    ${this.getFileIcon(file.mime_type)}
                    <div>
                        <p style="font-size: 0.875rem; font-weight: 500;">
                            ${file.original_name}
                        </p>
                        <p style="font-size: 0.75rem; color: #6b7280;">
                            ${this.formatFileSize(file.size_bytes)}
                        </p>
                    </div>
                </div>
                <button class="file-item-remove" data-file-id="${file.id}" style="
                    background: none;
                    border: none;
                    color: #ef4444;
                    cursor: pointer;
                    padding: 0.25rem;
                ">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `).join('');

        // Attach remove handlers
        fileList.querySelectorAll('.file-item-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFile(btn.dataset.fileId, containerId);
            });
        });
    }

    async removeFile(fileId, containerId) {
        try {
            const response = await fetch(`/api/file-upload?id=${fileId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete file');
            }

            // Remove from uploaded files
            this.uploadedFiles = this.uploadedFiles.filter(f => f.id !== fileId);
            this.displayUploadedFiles(containerId);
            
            this.showToast('File removed successfully', 'success');
        } catch (error) {
            console.error('Delete error:', error);
            this.showToast('Failed to remove file', 'error');
        }
    }

    getFileIcon(mimeType) {
        if (mimeType?.startsWith('image/')) {
            return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
        } else if (mimeType?.includes('pdf')) {
            return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>';
        } else {
            return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>';
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    getAcceptedTypesText() {
        if (this.acceptedTypes === '*') return 'All file types';
        if (this.acceptedTypes === 'image/*') return 'Images only';
        if (this.acceptedTypes === '.pdf') return 'PDF files only';
        return this.acceptedTypes;
    }

    showToast(message, type = 'info') {
        // Use existing toast function if available
        if (window.showToast) {
            window.showToast(message, type);
            return;
        }

        // Otherwise create simple toast
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Get uploaded file URLs for saving to database
    getUploadedFileUrls() {
        return this.uploadedFiles.map(f => f.url);
    }

    // Get uploaded file IDs
    getUploadedFileIds() {
        return this.uploadedFiles.map(f => f.id);
    }

    // Clear all uploaded files
    clearFiles() {
        this.uploadedFiles = [];
    }
}

// Make it globally available
window.FileUploadManager = FileUploadManager;

// Add required CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .file-upload-widget:hover {
        border-color: #3b82f6 !important;
        cursor: pointer;
    }
    
    .file-item:hover {
        background: #f9fafb !important;
    }
    
    .file-item-remove:hover {
        transform: scale(1.1);
    }
`;
document.head.appendChild(style);