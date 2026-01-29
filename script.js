// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const fileName = document.getElementById('fileName');
const errorDisplay = document.getElementById('errorDisplay');
const successDisplay = document.getElementById('successDisplay');
const metadataSection = document.getElementById('metadataSection');
const metadataBody = document.getElementById('metadataBody');
const plotSection = document.getElementById('plotSection');
const plotContainer = document.getElementById('plotContainer');

// Event Listeners
browseBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);

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
        handleFile(files[0]);
    }
});

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        handleFile(file);
    }
}

// Main file handling function
function handleFile(file) {
    // Reset displays
    hideError();
    hideSuccess();
    hideMetadata();
    hidePlot();
    
    // Check file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
        showError('Please upload a CSV file.');
        return;
    }
    
    // Display file name
    fileName.textContent = `Selected: ${file.name}`;
    fileName.style.display = 'block';
    
    // Read file
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const csvContent = e.target.result;
            processCSV(csvContent, file.name);
        } catch (error) {
            showError(`Error processing file: ${error.message}`);
        }
    };
    reader.onerror = () => {
        showError('Error reading file. Please try again.');
    };
    reader.readAsText(file);
}

// Process CSV content
function processCSV(csvContent, filename) {
    // Parse CSV
    const lines = csvContent.trim().split('\n');
    
    if (lines.length < 2) {
        showError('CSV file must contain at least a header row and one data row.');
        return;
    }
    
    // Parse header
    const headers = parseCSVLine(lines[0]);
    
    // Validate minimum columns
    if (headers.length < 3) {
        showError('CSV file must contain at least 3 columns (Time, Position, Force).');
        return;
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
        showError('CSV file contains no data rows.');
        return;
    }
    
    // Validate numeric data in first 3 columns
    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < 3; j++) {
            if (data[i][j] === undefined || data[i][j] === '') {
                showError(`Missing value at row ${i + 2}, column ${j + 1}.`);
                return;
            }
            const value = parseFloat(data[i][j]);
            if (isNaN(value)) {
                showError(`Invalid numeric value at row ${i + 2}, column ${j + 1}: "${data[i][j]}"`);
                return;
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
                    showError(`Column 4 must contain only 0 or 1 values. Invalid value at row ${i + 2}: "${data[i][3]}"`);
                    return;
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
    
    // Display metadata if available
    if (Object.keys(metadata).length > 0) {
        displayMetadata(metadata);
    }
    
    // Generate plot
    generatePlot(data, headers, filename, hasColumn4);
    
    // Show success message
    showSuccess('CSV file processed successfully!');
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

// Display metadata in table
function displayMetadata(metadata) {
    metadataBody.innerHTML = '';
    
    for (const [key, value] of Object.entries(metadata)) {
        const row = document.createElement('tr');
        
        const keyCell = document.createElement('td');
        keyCell.textContent = key;
        
        const valueCell = document.createElement('td');
        valueCell.textContent = value;
        
        row.appendChild(keyCell);
        row.appendChild(valueCell);
        metadataBody.appendChild(row);
    }
    
    metadataSection.classList.remove('hidden');
}

// Generate Plotly plot
function generatePlot(data, headers, filename, hasColumn4) {
    // Extract columns
    const timeData = data.map(row => row[0]);
    const positionData = data.map(row => row[1]);
    const forceData = data.map(row => row[2]);
    const binaryData = hasColumn4 ? data.map(row => row[3] || 0) : null;
    
    const timeLabel = headers[0];
    const positionLabel = headers[1];
    const forceLabel = headers[2];
    
    // Create traces for position (primary y-axis)
    const positionTrace = {
        x: timeData,
        y: positionData,
        mode: 'lines+markers',
        name: positionLabel,
        line: { color: 'blue', width: 1.5 },
        marker: { size: 4, color: 'blue' },
        yaxis: 'y1'
    };
    
    // Create traces for force (secondary y-axis)
    const forceTrace = {
        x: timeData,
        y: forceData,
        mode: 'lines+markers',
        name: forceLabel,
        line: { color: 'red', width: 1.5 },
        marker: { size: 4, color: 'red' },
        yaxis: 'y2'
    };
    
    const traces = [positionTrace, forceTrace];
    
    // Find active regions and transition points if column 4 exists
    let shapes = [];
    let annotations = [];
    
    if (binaryData) {
        const activeRegions = [];
        const transitionPoints = [];
        let currentStart = null;
        
        for (let i = 0; i < binaryData.length; i++) {
            // Start of active region (0->1 or start of data at 1)
            if (binaryData[i] === 1 && (i === 0 || binaryData[i - 1] === 0)) {
                currentStart = timeData[i];
                transitionPoints.push({ time: timeData[i], type: 'Start' });
            }
            // End of active region (1->0)
            else if (binaryData[i] === 0 && i > 0 && binaryData[i - 1] === 1 && currentStart !== null) {
                activeRegions.push({ start: currentStart, end: timeData[i - 1] });
                transitionPoints.push({ time: timeData[i - 1], type: 'End' });
                currentStart = null;
            }
        }
        
        // Check if we ended while still in active region
        if (currentStart !== null) {
            activeRegions.push({ start: currentStart, end: timeData[timeData.length - 1] });
            transitionPoints.push({ time: timeData[timeData.length - 1], type: 'End' });
        }
        
        // Create shapes for active regions
        activeRegions.forEach(region => {
            shapes.push({
                type: 'rect',
                xref: 'x',
                yref: 'paper',
                x0: region.start,
                x1: region.end,
                y0: 0,
                y1: 1,
                fillcolor: 'lightgreen',
                opacity: 0.3,
                line: {
                    color: 'green',
                    width: 1
                },
                layer: 'below'
            });
        });
        
        // Create annotations for transition points
        transitionPoints.forEach(point => {
            // Vertical dashed line
            shapes.push({
                type: 'line',
                xref: 'x',
                yref: 'paper',
                x0: point.time,
                x1: point.time,
                y0: 0,
                y1: 1,
                line: {
                    color: 'darkgreen',
                    width: 1,
                    dash: 'dash'
                },
                opacity: 0.5,
                layer: 'below'
            });
            
            // Time annotation at bottom
            annotations.push({
                x: point.time,
                y: 0,
                xref: 'x',
                yref: 'paper',
                text: `${point.time.toFixed(3)}s`,
                showarrow: false,
                font: {
                    size: 9,
                    color: 'darkgreen',
                    family: 'Arial, sans-serif'
                },
                bgcolor: 'rgba(255, 255, 255, 0.8)',
                bordercolor: 'darkgreen',
                borderwidth: 1,
                borderpad: 3,
                yshift: 10,
                xanchor: 'center',
                yanchor: 'bottom'
            });
        });
        
        // Add legend entry for weld in progress regions
        if (activeRegions.length > 0) {
            const columnDLabel = headers[3] || 'Weld in Progress';
            traces.push({
                x: [null],
                y: [null],
                mode: 'markers',
                name: `${columnDLabel} Active`,
                marker: {
                    size: 10,
                    color: 'lightgreen',
                    line: {
                        color: 'green',
                        width: 1
                    }
                },
                showlegend: true
            });
        }
    }
    
    // Add filename annotation
    annotations.push({
        text: filename,
        xref: 'paper',
        yref: 'paper',
        x: 0.99,
        y: -0.15,
        xanchor: 'right',
        yanchor: 'bottom',
        showarrow: false,
        font: {
            size: 9,
            color: 'gray'
        },
        opacity: 0.7
    });
    
    // Layout configuration
    const layout = {
        title: `${positionLabel}, ${forceLabel} vs. ${timeLabel}`,
        xaxis: {
            title: timeLabel,
            showgrid: true,
            zeroline: true,
            autorange: true
        },
        yaxis: {
            title: positionLabel,
            titlefont: { color: 'blue' },
            tickfont: { color: 'blue' },
            showgrid: true,
            zeroline: true,
            autorange: true
        },
        yaxis2: {
            title: forceLabel,
            titlefont: { color: 'red' },
            tickfont: { color: 'red' },
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
            bgcolor: 'rgba(255, 255, 255, 0.8)',
            bordercolor: 'gray',
            borderwidth: 1
        },
        hovermode: 'x unified',
        shapes: shapes,
        annotations: annotations,
        margin: {
            l: 60,
            r: 60,
            t: 80,
            b: 100
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
            filename: filename.replace('.csv', '_plot'),
            height: 800,
            width: 1400,
            scale: 2
        }
    };
    
    // Show plot section first to ensure proper sizing
    plotSection.classList.remove('hidden');
    
    // Create plot after a brief delay to ensure container is rendered
    setTimeout(() => {
        Plotly.newPlot(plotContainer, traces, layout, config).then(() => {
            // Force resize after plot creation
            Plotly.Plots.resize(plotContainer);
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

function hideMetadata() {
    metadataSection.classList.add('hidden');
}

function hidePlot() {
    plotSection.classList.add('hidden');
}
