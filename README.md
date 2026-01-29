# RSR Plotting Tool

A web-based tool for visualizing weld data from CSV files. Upload CSV files containing time-series weld data and generate interactive dual-axis plots with position, force, and optional welding progress indicators.

🔗 **[Live Demo](https:///centerline-product-development.github.io/RSR-Plotting-Tool/)**

## Features

- 📊 **Interactive Dual-Axis Plots** - Visualize position and force data simultaneously
- 📁 **Drag & Drop Upload** - Easy file handling with visual feedback
- ✅ **CSV Validation** - Automatic validation with helpful error messages
- 📋 **Metadata Display** - View weld parameters in a styled table
- 🟢 **Welding Progress Indicators** - Shaded regions show active welding phases
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile devices
- 💾 **Export Plots** - Download generated plots as PNG images
- 🚀 **No Installation Required** - Runs entirely in the browser

## CSV Format Requirements

Your CSV file must follow this structure:

### Required Columns (Minimum 3)

1. **Column 1: Time** - Time values in seconds (numeric)
2. **Column 2: Position** - Position measurements in mm (numeric)
3. **Column 3: Force** - Force measurements in kN (numeric)

### Optional Columns

4. **Column 4: Weld in Progress** - Binary indicator (0 or 1)
   - `1` = Welding active (shown as green shaded region)
   - `0` = Welding inactive
   
5. **Columns 5+: Metadata** - Additional parameters (displayed in metadata table)
   - Only values from the **first data row** are shown
   - Empty cells are automatically ignored
   - Examples: Rivet type, material thickness, tolerances, etc.

### Example CSV Structure

```csv
Time (s),LPT (mm),Piezo (kN),Weld in Progress,Rivet,Material Thickness (mm),Thickness Target (mm)
0.0000,9.978,0.0207,0,RSR-R185-4,4.00,10.22
0.0057,9.991,0.0415,0
0.0114,10.061,0.0089,0
0.0171,10.061,0.0089,1
0.0229,10.055,0.0504,1
0.0286,9.971,0.0504,1
0.0343,10.055,0.0326,0
```

**Note:** After the first row, only the first 4 columns are used for plotting. Metadata columns (5+) are only read from row 1.

## Usage

### Online (GitHub Pages)

1. Visit the live demo link
2. Drag and drop your CSV file onto the upload area, or click "Browse Files"
3. View the metadata table (if available)
4. Interact with the plot:
   - Hover over points to see values
   - Zoom in/out by selecting a region
   - Pan by clicking and dragging
   - Download as PNG using the camera icon

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/RSR-Plotting-Tool.git
   cd RSR-Plotting-Tool
   ```

2. Open `index.html` in a web browser:
   ```bash
   # On Linux/macOS
   open index.html
   
   # Or use a local server (recommended)
   python -m http.server 8000
   # Then visit http://localhost:8000
   ```

## Deploying to GitHub Pages

1. Create a new repository on GitHub named `RSR-Plotting-Tool`

2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: RSR Plotting Tool"
   git branch -M main
   git remote add origin https://github.com/yourusername/RSR-Plotting-Tool.git
   git push -u origin main
   ```

3. Enable GitHub Pages:
   - Go to your repository on GitHub
   - Click **Settings** → **Pages**
   - Under "Source", select **main** branch
   - Click **Save**
   - Your site will be available at: `https://yourusername.github.io/RSR-Plotting-Tool/`

## Plot Features

### Dual-Axis Display
- **Left Y-axis (Blue)**: Position measurements
- **Right Y-axis (Red)**: Force measurements
- **X-axis**: Time in seconds

### Welding Progress Visualization
When column 4 (Weld in Progress) contains binary data:
- **Green shaded regions**: Indicate active welding periods
- **Vertical dashed lines**: Mark start/end transitions
- **Time annotations**: Display exact timestamps (in seconds) at transitions

### Interactive Controls
- **Zoom**: Click and drag to select a region
- **Pan**: Shift + click and drag
- **Reset**: Double-click the plot
- **Export**: Click the camera icon to download as PNG
- **Toggle traces**: Click legend items to show/hide data series

## Technology Stack

- **HTML5** - Structure and layout
- **CSS3** - Styling with gradients and responsive design
- **JavaScript (Vanilla)** - CSV parsing and data processing
- **Plotly.js** - Interactive plotting library

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

*Requires a modern browser with JavaScript enabled.*

## Example Files

Sample CSV files are provided in the `examples/` directory:
- `weld-data.csv` - Full example with all columns including metadata

## Troubleshooting

### Common Errors

**"CSV file must contain at least 3 columns"**
- Ensure your CSV has Time, Position, and Force columns

**"Invalid numeric value at row X, column Y"**
- Check that the first 3 columns contain only numbers
- Remove any text or special characters from data cells

**"Column 4 must contain only 0 or 1 values"**
- The Weld in Progress column must be binary (0 or 1)
- Empty cells in column 4 are treated as 0

**Plot doesn't appear**
- Check the browser console for errors (F12)
- Ensure JavaScript is enabled
- Try a different browser

## License

MIT License - Feel free to use and modify for your needs.

## Acknowledgments

Based on the original Python implementation using matplotlib and pandas. Converted to a web-based tool for broader accessibility without requiring Python installation.

## Contact

For issues, suggestions, or contributions, please open an issue on GitHub.
