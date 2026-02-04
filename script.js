// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const fileName = document.getElementById('fileName');
const errorDisplay = document.getElementById('errorDisplay');
const successDisplay = document.getElementById('successDisplay');
const plotArea = document.getElementById('plotArea');
const sidePanel = document.getElementById('sidePanel');
const fileList = document.getElementById('fileList');
const clearAllBtn = document.getElementById('clearAllBtn');
const addFilesBtn = document.getElementById('addFilesBtn');
const plotSection = document.getElementById('plotSection');
const plotContainer = document.getElementById('plotContainer');

// Global file storage
let loadedFiles = [];
let fileIdCounter = 0;

// Color palette for distinguishing files
const COLOR_PALETTE = [
    '#1f77b4', // blue
    '#ff7f0e', // orange
    '#2ca02c', // green
    '#d62728', // red
    '#9467bd', // purple
    '#8c564b', // brown
    '#e377c2', // pink
    '#7f7f7f', // gray
    '#bcbd22', // olive
    '#17becf'  // cyan
];

// Event Listeners
browseBtn.addEventListener('click', () => fileInput.click());
addFilesBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
clearAllBtn.addEventListener('click', clearAllFiles);

// Drag and Drop Events
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFiles(files);
    }
});

// Handle file selection (multiple files)
function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length > 0) {
        handleFiles(files);
    }
    // Reset input so same file can be selected again
    fileInput.value = '';
}

// Main file handling function for multiple files
function handleFiles(files) {
    hideError();
    hideSuccess();
    
    const fileArray = Array.from(files);
    const csvFiles = fileArray.filter(f => f.name.toLowerCase().endsWith('.csv'));
    
    if (csvFiles.length === 0) {
        showError('Please upload CSV file(s).');
        return;
    }
    
    if (csvFiles.length < fileArray.length) {
        showError(`${fileArray.length - csvFiles.length} non-CSV file(s) were skipped.`);
    }
    
    // Process each file
    let processedCount = 0;
    let errorCount = 0;
    
    csvFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csvContent = e.target.result;
                const result = processCSV(csvContent, file.name);
                if (result.success) {
                    addFileToStorage(result.data, file.name);
                    processedCount++;
                } else {
                    errorCount++;
                }
            } catch (error) {
                showError(`Error processing ${file.name}: ${error.message}`);
                errorCount++;
            }
            
            // After all files processed
            if (processedCount + errorCount === csvFiles.length) {
                if (processedCount > 0) {
                    renderFileList();
                    updatePlot();
                    showSuccess(`${processedCount} file(s) loaded successfully!`);
                }
            }
        };
        reader.onerror = () => {
            showError(`Error reading ${file.name}. Please try again.`);
            errorCount++;
        };
        reader.readAsText(file);
    });
}

// Process CSV content - returns parsed data object
function processCSV(csvContent, filename) {
    // Parse CSV
    const lines = csvContent.trim().split('\n');
    
    if (lines.length < 2) {
        showError(`${filename}: CSV file must contain at least a header row and one data row.`);
        return { success: false };
    }
    
    // Parse header
    const headers = parseCSVLine(lines[0]);
    
    // Validate minimum columns
    if (headers.length < 3) {
        showError(`${filename}: CSV file must contain at least 3 columns (Time, Position, Force).`);
        return { success: false };
    }
    
    // Parse data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue; // Skip empty lines
        
        const row = parseCSVLine(lines[i]);
        if (row.length > 0) {
            data.push(row);
        }
    }
    
    if (data.length === 0) {
        showError(`${filename}: CSV file contains no data rows.`);
        return { success: false };
    }
    
    // Validate numeric data in first 3 columns
    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < 3; j++) {
            if (data[i][j] === undefined || data[i][j] === '') {
                showError(`${filename}: Missing value at row ${i + 2}, column ${j + 1}.`);
                return { success: false };
            }
            const value = parseFloat(data[i][j]);
            if (isNaN(value)) {
                showError(`${filename}: Invalid numeric value at row ${i + 2}, column ${j + 1}: "${data[i][j]}"`);
                return { success: false };
            }
            data[i][j] = value;
        }
    }
    
    // Validate column 4 if present (binary 0/1)
    const hasColumn4 = data.some(row => row.length >= 4 && row[3] !== undefined && row[3] !== '');
    if (hasColumn4) {
        for (let i = 0; i < data.length; i++) {
            if (data[i][3] !== undefined && data[i][3] !== '') {
                const value = parseFloat(data[i][3]);
                if (isNaN(value) || (value !== 0 && value !== 1)) {
                    showError(`${filename}: Column 4 must contain only 0 or 1 values. Invalid value at row ${i + 2}: "${data[i][3]}"`);
                    return { success: false };
                }
                data[i][3] = value;
            } else {
                data[i][3] = 0; // Default to 0 if missing
            }
        }
    }
    
    // Extract metadata from first row (columns 5+)
    const metadata = {};
    if (data[0].length > 4) {
        for (let i = 4; i < headers.length; i++) {
            const value = data[0][i];
            if (value !== undefined && value !== null && value !== '') {
                metadata[headers[i]] = value;
            }
        }
    }
    
    return {
        success: true,
        data: {
            headers,
            data,
            metadata,
            hasColumn4
        }
    };
}

// Add file to storage
function addFileToStorage(fileData, filename) {
    // Check if file already exists
    const existingIndex = loadedFiles.findIndex(f => f.filename === filename);
    if (existingIndex !== -1) {
        // Update existing file
        loadedFiles[existingIndex] = {
            ...loadedFiles[existingIndex],
            ...fileData,
            filename
        };
    } else {
        // Add new file with unique ID and color
        const colorIndex = loadedFiles.length % COLOR_PALETTE.length;
        loadedFiles.push({
            id: fileIdCounter++,
            filename,
            ...fileData,
            color: COLOR_PALETTE[colorIndex],
            visible: true
        });
    }
}

// Clear all files
function clearAllFiles() {
    if (loadedFiles.length === 0) {
        return;
    }
    
    if (!confirm(`Are you sure you want to remove all ${loadedFiles.length} file(s)?`)) {
        return;
    }
    
    loadedFiles = [];
    fileIdCounter = 0;
    renderFileList();
    hidePlot();
    fileName.style.display = 'none';
    hideSuccess();
}

// Remove single file
function removeFile(fileId) {
    loadedFiles = loadedFiles.filter(f => f.id !== fileId);
    renderFileList();
    
    if (loadedFiles.length === 0) {
        hidePlot();
        fileName.style.display = 'none';
    } else {
        updatePlot();
        fileName.textContent = `${loadedFiles.length} file(s) loaded`;
    }
}

// Toggle file visibility
function toggleFileVisibility(fileId) {
    const file = loadedFiles.find(f => f.id === fileId);
    if (file) {
        file.visible = !file.visible;
        updatePlot();
    }
}

// Toggle metadata section
function toggleMetadata(fileId) {
    const metadataEl = document.getElementById(`metadata-${fileId}`);
    const toggleBtn = document.getElementById(`toggle-${fileId}`);
    
    if (metadataEl && toggleBtn) {
        metadataEl.classList.toggle('expanded');
        toggleBtn.classList.toggle('expanded');
    }
}

// Render file list in side panel
function renderFileList() {
    fileList.innerHTML = '';
    
    if (loadedFiles.length === 0) {
        fileList.innerHTML = '<p class="no-files">No files loaded</p>';
        return;
    }
    
    loadedFiles.forEach(file => {
        const card = document.createElement('div');
        card.className = 'file-card';
        card.id = `file-card-${file.id}`;
        
        // Build metadata table HTML
        let metadataHTML = '';
        if (Object.keys(file.metadata).length > 0) {
            metadataHTML = '<table class="file-metadata-table">';
            for (const [key, value] of Object.entries(file.metadata)) {
                metadataHTML += `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(String(value))}</td></tr>`;
            }
            metadataHTML += '</table>';
        } else {
            metadataHTML = '<span class="no-metadata">No metadata available</span>';
        }
        
        card.innerHTML = `
            <div class="file-card-header">
                <span class="file-color-indicator" style="background-color: ${file.color}" 
                    onclick="openColorPicker(${file.id})" title="Click to change color"></span>
                <input type="color" id="color-picker-${file.id}" style="display: none;" 
                    value="${file.color}" onchange="updateFileColor(${file.id}, this.value)">
                <input type="checkbox" class="file-checkbox" ${file.visible ? 'checked' : ''} 
                    onchange="toggleFileVisibility(${file.id})" title="Show/hide on plot">
                <span class="file-card-name" title="${escapeHtml(file.filename)}">${escapeHtml(file.filename)}</span>
                <button class="file-remove-btn" onclick="removeFile(${file.id})" title="Remove file">&times;</button>
            </div>
            <button class="metadata-toggle" id="toggle-${file.id}" onclick="toggleMetadata(${file.id})">
                <span>Metadata</span>
                <span class="metadata-toggle-icon">▼</span>
            </button>
            <div class="file-metadata" id="metadata-${file.id}">
                ${metadataHTML}
            </div>
        `;
        
        fileList.appendChild(card);
    });
}

// Open color picker for a specific file
function openColorPicker(fileId) {
    const colorInput = document.getElementById(`color-picker-${fileId}`);
    if (colorInput) {
        colorInput.click();
    }
}

// Update file color and refresh plot
function updateFileColor(fileId, newColor) {
    const file = loadedFiles.find(f => f.id === fileId);
    if (file) {
        file.color = newColor;
        renderFileList();
        updatePlot();
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Parse CSV line (handles quoted values)
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

// Update plot with all visible files
function updatePlot() {
    const visibleFiles = loadedFiles.filter(f => f.visible);
    
    if (visibleFiles.length === 0) {
        hidePlot();
        return;
    }
    
    generatePlot(visibleFiles);
}

// Generate Plotly plot for multiple files
function generatePlot(files) {
    const traces = [];
    let shapes = [];
    let annotations = [];
    
    // Use headers from first file for axis labels
    const firstFile = files[0];
    const timeLabel = firstFile.headers[0];
    const positionLabel = firstFile.headers[1];
    const forceLabel = firstFile.headers[2];
    
    let hasAnyWeldRegions = false;
    
    // Process each file
    files.forEach((file, fileIndex) => {
        const data = file.data;
        const timeData = data.map(row => row[0]);
        const positionData = data.map(row => row[1]);
        const forceData = data.map(row => row[2]);
        const binaryData = file.hasColumn4 ? data.map(row => row[3] || 0) : null;
        
        // Short filename for legend
        const shortName = file.filename.length > 20 
            ? file.filename.substring(0, 17) + '...' 
            : file.filename;
        
        // Create trace for position (primary y-axis) - solid line
        const positionTrace = {
            x: timeData,
            y: positionData,
            mode: 'lines+markers',
            name: `${shortName} - Position`,
            line: { 
                color: file.color, 
                width: 1.5,
                dash: 'solid'
            },
            marker: { size: 3, color: file.color },
            yaxis: 'y1',
            legendgroup: 'position',
            showlegend: false,
            hovertemplate: `${shortName}<br>Position: %{y}<extra></extra>`
        };
        
        // Create trace for force (secondary y-axis) - dashed line
        const forceTrace = {
            x: timeData,
            y: forceData,
            mode: 'lines+markers',
            name: `${shortName} - Force`,
            line: { 
                color: file.color, 
                width: 1.5,
                dash: 'dash'
            },
            marker: { size: 3, color: file.color, symbol: 'square' },
            yaxis: 'y2',
            legendgroup: 'force',
            showlegend: false,
            hovertemplate: `${shortName}<br>Force: %{y}<extra></extra>`
        };
        
        traces.push(positionTrace, forceTrace);
        
        // Handle active regions if column 4 exists
        if (binaryData) {
            const activeRegions = [];
            const transitionPoints = [];
            let currentStart = null;
            
            for (let i = 0; i < binaryData.length; i++) {
                if (binaryData[i] === 1 && (i === 0 || binaryData[i - 1] === 0)) {
                    currentStart = timeData[i];
                    transitionPoints.push({ time: timeData[i], type: 'Start' });
                } else if (binaryData[i] === 0 && i > 0 && binaryData[i - 1] === 1 && currentStart !== null) {
                    activeRegions.push({ start: currentStart, end: timeData[i - 1] });
                    transitionPoints.push({ time: timeData[i - 1], type: 'End' });
                    currentStart = null;
                }
            }
            
            if (currentStart !== null) {
                activeRegions.push({ start: currentStart, end: timeData[timeData.length - 1] });
                transitionPoints.push({ time: timeData[timeData.length - 1], type: 'End' });
            }
            
            // Create shapes for active regions with file-specific color
            const regionColor = file.color;
            if (activeRegions.length > 0) {
                hasAnyWeldRegions = true;
                activeRegions.forEach(region => {
                    shapes.push({
                        type: 'rect',
                        xref: 'x',
                        yref: 'paper',
                        x0: region.start,
                        x1: region.end,
                        y0: 0,
                        y1: 1,
                        fillcolor: regionColor,
                        opacity: 0.15,
                        line: {
                            color: regionColor,
                            width: 1
                        },
                        layer: 'below',
                        visible: true
                    });
                });
            }
            
            // Create vertical lines for transition points (only for first file to avoid clutter)
            if (fileIndex === 0) {
                transitionPoints.forEach(point => {
                    shapes.push({
                        type: 'line',
                        xref: 'x',
                        yref: 'paper',
                        x0: point.time,
                        x1: point.time,
                        y0: 0,
                        y1: 1,
                        line: {
                            color: regionColor,
                            width: 1,
                            dash: 'dot'
                        },
                        opacity: 0.5,
                        layer: 'below',
                        visible: true
                    });
                });
            }
        }
    });
    
    // Add legend entries for line types only
    traces.push({
        x: [null],
        y: [null],
        mode: 'lines',
        name: 'Position',
        line: { color: '#333', width: 2, dash: 'solid' },
        legendgroup: 'position',
        showlegend: true,
        hoverinfo: 'skip'
    });
    
    traces.push({
        x: [null],
        y: [null],
        mode: 'lines',
        name: 'Force',
        line: { color: '#333', width: 2, dash: 'dash' },
        yaxis: 'y2',
        legendgroup: 'force',
        showlegend: true,
        hoverinfo: 'skip'
    });
    
    if (hasAnyWeldRegions) {
        traces.push({
            x: [null],
            y: [null],
            mode: 'markers',
            name: 'Weld Active',
            marker: {
                size: 10,
                color: '#999',
                opacity: 0.3,
                line: {
                    color: '#666',
                    width: 1
                }
            },
            legendgroup: 'weld-active',
            showlegend: true,
            hoverinfo: 'skip'
        });
    }
    
    // Add filename annotations at the bottom, color-coded per file
    // For many files, display on multiple rows to prevent cutoff
    const maxFilesPerRow = 6;
    let xOffset = 0.01;
    let rowNumber = 0;
    
    files.forEach((file, index) => {
        if (index > 0 && index % maxFilesPerRow === 0) {
            rowNumber++;
            xOffset = 0.01;
        }
        
        annotations.push({
            text: file.filename,
            xref: 'paper',
            yref: 'paper',
            x: xOffset,
            y: -0.18 - (rowNumber * 0.03),
            xanchor: 'left',
            yanchor: 'bottom',
            showarrow: false,
            font: {
                size: 9,
                color: file.color
            },
            opacity: 0.9
        });
        // Approximate spacing based on filename length
        xOffset += Math.min((file.filename.length * 0.005) + 0.02, 0.16);
    });
    
    // Adjust bottom margin based on number of rows needed
    const numRows = Math.ceil(files.length / maxFilesPerRow);
    const bottomMargin = 120 + (numRows > 1 ? (numRows - 1) * 25 : 0);
    
    // Layout configuration
    const layout = {
        title: files.length === 1 
            ? `${positionLabel}, ${forceLabel} vs. ${timeLabel}`
            : `Position & Force vs. Time (${files.length} files)`,
        xaxis: {
            title: timeLabel,
            showgrid: true,
            zeroline: true,
            autorange: true
        },
        yaxis: {
            title: positionLabel,
            showgrid: true,
            zeroline: true,
            autorange: true
        },
        yaxis2: {
            title: forceLabel,
            overlaying: 'y',
            side: 'right',
            showgrid: false,
            zeroline: true,
            autorange: true
        },
        legend: {
            x: 1,
            y: 1,
            xanchor: 'right',
            yanchor: 'top',
            bgcolor: 'rgba(255, 255, 255, 0.9)',
            bordercolor: 'gray',
            borderwidth: 1,
            font: { size: 11 }
        },
        hovermode: 'x unified',
        shapes: shapes,
        annotations: annotations,
        margin: {
            l: 60,
            r: 60,
            t: 80,
            b: bottomMargin
        },
        autosize: true
    };
    
    // Config for Plotly
    const config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        toImageButtonOptions: {
            format: 'png',
            filename: files.length === 1 
                ? files[0].filename.replace('.csv', '_plot')
                : 'multi_file_plot',
            height: 800,
            width: 1400,
            scale: 2
        }
    };
    
    // Show plot area
    plotArea.classList.remove('hidden');
    
    // Create plot after a brief delay to ensure container is rendered
    setTimeout(() => {
        Plotly.newPlot(plotContainer, traces, layout, config).then(() => {
            Plotly.Plots.resize(plotContainer);
            
            // Add event listener for legend clicks to toggle weld region shapes
            plotContainer.on('plotly_legendclick', function(data) {
                if (data.curveNumber !== undefined) {
                    const clickedTrace = traces[data.curveNumber];
                    if (clickedTrace && clickedTrace.legendgroup === 'weld-active') {
                        // Toggle visibility of all shapes (weld regions and transition lines)
                        const currentLayout = plotContainer.layout;
                        const updatedShapes = currentLayout.shapes.map(shape => {
                            return {
                                ...shape,
                                visible: !shape.visible
                            };
                        });
                        
                        Plotly.relayout(plotContainer, { shapes: updatedShapes });
                        return false; // Prevent default legend behavior
                    }
                }
            });
        });
    }, 10);
}

// Utility functions for UI
function showError(message) {
    errorDisplay.textContent = message;
    errorDisplay.classList.remove('hidden');
}

function hideError() {
    errorDisplay.classList.add('hidden');
    errorDisplay.textContent = '';
}

function showSuccess(message) {
    successDisplay.textContent = message;
    successDisplay.classList.remove('hidden');
}

function hideSuccess() {
    successDisplay.classList.add('hidden');
    successDisplay.textContent = '';
}

function hidePlot() {
    plotArea.classList.add('hidden');
}
