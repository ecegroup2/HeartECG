// Configuration
const config = {
    apiUrl: 'https://your-ecg-api-endpoint.com/data',
    graphWidth: 800,
    graphHeight: 200,
    lineColor: '#2ecc71',
    lineWidth: 2,
    backgroundColor: '#f8f9fa',
    gridColor: '#e0e0e0',
    animationSpeed: 10, // ms between points
    pointsToShow: 200   // Number of points visible at once
};

// DOM Elements
const canvas = document.getElementById('ecgCanvas');
const ctx = canvas.getContext('2d');
const loadingElement = document.getElementById('loading');
const statusElement = document.getElementById('status');
const bpmElement = document.getElementById('bpm');

// State variables
let ecgData = [];
let displayData = [];
let currentPosition = 0;
let isAnimating = false;
let isLoading = false;
let animationId = null;

// Initialize canvas
function initCanvas() {
    canvas.width = config.graphWidth;
    canvas.height = config.graphHeight;
    canvas.style.backgroundColor = config.backgroundColor;
    drawGrid();
}

// Draw background grid
function drawGrid() {
    ctx.strokeStyle = config.gridColor;
    ctx.lineWidth = 0.5;
    
    // Vertical lines
    for (let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// Fetch data from the API
async function fetchECGData() {
    isLoading = true;
    loadingElement.style.display = 'block';
    
    try {
        const response = await fetch(config.apiUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        
        const data = await response.json();
        ecgData = data.ecgValues || []; // This line stores the array from the API
        
        // Calculate BPM if available
        if (data.bpm) {
            bpmElement.textContent = `BPM: ${data.bpm}`;
        } else {
            // Estimate BPM from ECG data if needed
            const estimatedBPM = estimateBPMFromECG(ecgData);
            bpmElement.textContent = `Est. BPM: ${estimatedBPM}`;
        }
        
        // Reset display and start animation
        displayData = [];
        currentPosition = 0;
        
        if (!isAnimating) {
            startAnimation();
        }
        
        isLoading = false;
        loadingElement.style.display = 'none';
        statusElement.textContent = 'ECG Data Loaded';
    } catch (error) {
        isLoading = false;
        loadingElement.style.display = 'none';
        statusElement.textContent = `Error: ${error.message}`;
        console.error('Failed to fetch ECG data:', error);
    }
}

// Simple BPM estimation (this is a placeholder - actual BPM calculation would be more complex)
function estimateBPMFromECG(ecgData) {
    // This is a simplified approach - actual BPM detection would use R-wave detection
    // and more sophisticated algorithms
    
    // Find peaks (R waves)
    const peaks = findPeaks(ecgData);
    
    // Calculate average RR interval
    let totalInterval = 0;
    for (let i = 1; i < peaks.length; i++) {
        totalInterval += peaks[i] - peaks[i-1];
    }
    
    if (peaks.length <= 1) return 0;
    
    const avgRRInterval = totalInterval / (peaks.length - 1);
    
    // Convert to BPM (assuming 250Hz sampling rate - adjust based on your data)
    const samplingRate = 250;
    const secondsPerRR = avgRRInterval / samplingRate;
    const bpm = Math.round(60 / secondsPerRR);
    
    return bpm;
}

// Find peaks in ECG data (simplified R-wave detection)
function findPeaks(ecgData) {
    const peaks = [];
    const threshold = calculateThreshold(ecgData);
    
    for (let i = 1; i < ecgData.length - 1; i++) {
        if (ecgData[i] > threshold && 
            ecgData[i] > ecgData[i-1] && 
            ecgData[i] > ecgData[i+1]) {
            peaks.push(i);
        }
    }
    
    return peaks;
}

// Calculate threshold for peak detection
function calculateThreshold(ecgData) {
    // Simple approach: use a percentage of the maximum value
    const max = Math.max(...ecgData);
    return max * 0.6; // 60% of max as threshold
}

// Draw the ECG waveform
function drawECG() {
    // Clear canvas and redraw grid
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    
    if (displayData.length < 2) return;
    
    // Draw ECG line
    ctx.beginPath();
    ctx.strokeStyle = config.lineColor;
    ctx.lineWidth = config.lineWidth;
    
    const xScale = canvas.width / (config.pointsToShow - 1);
    const yScale = canvas.height / 2;
    const yOffset = canvas.height / 2;
    
    // Start from the first point
    ctx.moveTo(0, yOffset - displayData[0] * yScale * 0.8);
    
    // Draw lines to each subsequent point
    for (let i = 1; i < displayData.length; i++) {
        ctx.lineTo(i * xScale, yOffset - displayData[i] * yScale * 0.8);
    }
    
    ctx.stroke();
}

// Start the animation loop
function startAnimation() {
    isAnimating = true;
    animationLoop();
}

// Stop the animation
function stopAnimation() {
    isAnimating = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

// Animation loop
function animationLoop() {
    if (!isAnimating) return;
    
    // Add new data point from the source data
    if (currentPosition < ecgData.length) {
        displayData.push(ecgData[currentPosition]);
        currentPosition++;
        
        // Keep only the most recent points
        if (displayData.length > config.pointsToShow) {
            displayData.shift();
        }
    } else {
        // Loop back to beginning when we reach the end
        currentPosition = 0;
    }
    
    // Draw the updated graph
    drawECG();
    
    // Schedule next frame
    animationId = setTimeout(() => {
        requestAnimationFrame(animationLoop);
    }, config.animationSpeed);
}

// Initialize everything
function init() {
    initCanvas();
    
    // Add button event listeners
    document.getElementById('startBtn').addEventListener('click', () => {
        fetchECGData();
    });
    
    document.getElementById('stopBtn').addEventListener('click', () => {
        stopAnimation();
        statusElement.textContent = 'Animation Stopped';
    });
    
    statusElement.textContent = 'Ready';
}

// Start the application when loaded
window.addEventListener('load', init);
