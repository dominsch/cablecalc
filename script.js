// Icons
const ICONS = {
    scissors: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-500"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" x2="8.12" y1="4" y2="15.88"/><line x1="14.47" x2="20" y1="14.48" y2="20"/><line x1="8.12" x2="12" y1="8.12" y2="12"/></svg>`
};

// State
const state = {
    reqLengthM: 100.0,
    quantity: 10,
    cableUnit: 'ft', // 'm' or 'ft'
    direction: 'asc', // 'asc' or 'desc'
    startDistCm: 0,
    firstMarkVal: 54321,
    cutsCompleted: 0,
    completedCutsData: {}, // Store frozen data for completed cuts
    currentView: 'cut' // 'cut' or 'measure'
};

// Constants
const FOOT_IN_M = 0.3048; // standard conversion
const CM_IN_M = 0.01;

// DOM Elements
const els = {
    // Navigation
    btnSwitchToMeasure: document.getElementById('btnSwitchToMeasure'),
    btnSwitchToCut: document.getElementById('btnSwitchToCut'),
    viewCut: document.getElementById('viewCut'),
    viewMeasure: document.getElementById('viewMeasure'),

    // Cut Tool
    reqLengthM: document.getElementById('reqLengthM'),
    quantity: document.getElementById('quantity'),
    startDistCm: document.getElementById('startDistCm'),
    firstMarkVal: document.getElementById('firstMarkVal'),
    lblFirstMarkUnit: document.getElementById('lblFirstMarkUnit'),
    btnUnitM: document.getElementById('btnUnitM'),
    btnUnitFt: document.getElementById('btnUnitFt'),
    btnDirAsc: document.getElementById('btnDirAsc'),
    btnDirDesc: document.getElementById('btnDirDesc'),
    cutListContainer: document.getElementById('cutListContainer'),
    emptyState: document.getElementById('emptyState'),
    btnUpdate: document.getElementById('btnUpdate'),
    
    // Measure Tool
    measStartMark: document.getElementById('measStartMark'),
    measStartOffset: document.getElementById('measStartOffset'),
    measEndMark: document.getElementById('measEndMark'),
    measEndOffset: document.getElementById('measEndOffset'),
    resStartOffset: document.getElementById('resStartOffset'),
    resEndOffset: document.getElementById('resEndOffset'),
    resStartMark: document.getElementById('resStartMark'),
    resEndMark: document.getElementById('resEndMark'),
    resTotalLength: document.getElementById('resTotalLength'),

    // Shared
    btnHelp: document.getElementById('btnHelp'),
    helpModal: document.getElementById('helpModal'),
    btnCloseHelp: document.getElementById('btnCloseHelp')
};

// Initialization
function init() {
    // Set initial values to inputs
    els.reqLengthM.value = state.reqLengthM;
    els.quantity.value = state.quantity;
    els.startDistCm.value = state.startDistCm;
    els.firstMarkVal.value = state.firstMarkVal;

    updateToggleButtons();
    render();

    // Navigation Listeners
    els.btnSwitchToMeasure.addEventListener('click', () => switchView('measure'));
    els.btnSwitchToCut.addEventListener('click', () => switchView('cut'));

    // Measure Tool Listeners
    [els.measStartMark, els.measStartOffset, els.measEndMark, els.measEndOffset].forEach(input => {
        input.addEventListener('input', calculateMeasure);
        input.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') input.blur();
        });
    });

    // Add Event Listeners
    els.reqLengthM.addEventListener('input', (e) => { 
        let val = parseFloat(e.target.value);
        if (val > 10000) { val = 10000; e.target.value = val; }
        state.reqLengthM = val; 
    });
    els.quantity.addEventListener('input', (e) => { 
        let val = parseInt(e.target.value);
        if (val > 100) { val = 100; e.target.value = val; }
        state.quantity = val; 
    });
    els.startDistCm.addEventListener('input', (e) => { state.startDistCm = e.target.value; });
    els.firstMarkVal.addEventListener('input', (e) => { state.firstMarkVal = e.target.value; });

    // Close keyboard on Enter for all inputs
    [els.reqLengthM, els.quantity, els.startDistCm, els.firstMarkVal].forEach(input => {
        input.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                input.blur();
            }
        });
    });

    els.btnUnitM.addEventListener('click', () => { state.cableUnit = 'm'; updateToggleButtons(); });
    els.btnUnitFt.addEventListener('click', () => { state.cableUnit = 'ft'; updateToggleButtons(); });
    
    els.btnDirAsc.addEventListener('click', () => { state.direction = 'asc'; updateToggleButtons(); });
    els.btnDirDesc.addEventListener('click', () => { state.direction = 'desc'; updateToggleButtons(); });

    els.btnHelp.addEventListener('click', () => { els.helpModal.classList.add('open'); });
    els.btnCloseHelp.addEventListener('click', () => { els.helpModal.classList.remove('open'); });
    els.helpModal.addEventListener('click', (e) => {
        if (e.target === els.helpModal) {
            els.helpModal.classList.remove('open');
        }
    });

    els.btnUpdate.addEventListener('click', () => { 
        state.cutsCompleted = 0;
        state.completedCutsData = {};
        render(); 
    });

    // Check hash on load
    if (window.location.hash === '#measure') {
        switchView('measure');
    } else {
        switchView('cut');
    }
}

function updateToggleButtons() {
    // Unit
    if (state.cableUnit === 'm') {
        els.btnUnitM.classList.add('active');
        els.btnUnitFt.classList.remove('active');
        els.lblFirstMarkUnit.textContent = 'm';
    } else {
        els.btnUnitM.classList.remove('active');
        els.btnUnitFt.classList.add('active');
        els.lblFirstMarkUnit.textContent = 'ft';
    }

    // Direction
    if (state.direction === 'asc') {
        els.btnDirAsc.classList.add('active');
        els.btnDirDesc.classList.remove('active');
    } else {
        els.btnDirAsc.classList.remove('active');
        els.btnDirDesc.classList.add('active');
    }
}

// Calculation Logic
function calculateCuts() {
    const results = [];
    
    // 1. Normalize inputs
    const L = parseFloat(state.reqLengthM) || 0;
    const qty = parseInt(state.quantity) || 0;
    const initialDistM = (parseFloat(state.startDistCm) || 0) / 100;
    const M_init = parseInt(state.firstMarkVal) || 0;
    
    const isFeet = state.cableUnit === 'ft';
    const markStep = isFeet ? 2 : 1;
    const spacing = isFeet ? (2 * FOOT_IN_M) : 1.0;
    const isAsc = state.direction === 'asc';

    // 2. Define the Position of a Mark
    const getMarkPosition = (markValue) => {
        const delta = isAsc ? (markValue - M_init) : (M_init - markValue);
        const steps = delta / markStep;
        return initialDistM + (steps * spacing);
    };

    // 3. Loop through cuts
    for (let i = 0; i < qty; i++) {
        // Calculate position relative to the current start conditions (which apply to the first uncompleted cut)
        // If i < cutsCompleted, this calculation projects backwards (which is fine, as we use frozen data for those)
        const relIndex = i - state.cutsCompleted;
        const cutStartPos = relIndex * L;
        const cutEndPos = (relIndex + 1) * L;
        const epsilon = 0.0001;

        let firstVisibleMark = null;
        let lastVisibleMark = null;
        
        // Calculate index k (number of steps from M_init)
        // pos = initialDistM + k * spacing
        // k = (pos - initialDistM) / spacing
        
        const startK = Math.ceil((cutStartPos - initialDistM) / spacing - epsilon);
        const endK = Math.floor((cutEndPos - initialDistM) / spacing + epsilon);

        if (startK <= endK) {
            if (isAsc) {
                firstVisibleMark = M_init + startK * markStep;
                lastVisibleMark = M_init + endK * markStep;
            } else {
                firstVisibleMark = M_init - startK * markStep;
                lastVisibleMark = M_init - endK * markStep;
            }
        }

        let hasMarks = firstVisibleMark !== null;
        let startDistDisplay = 0;
        let endDistDisplay = 0;

        if (hasMarks) {
            const firstPos = getMarkPosition(firstVisibleMark);
            const lastPos = getMarkPosition(lastVisibleMark);
            // Use toFixed(1) for precision, convert back to number for storage if needed, 
            // but we store as string/number for display.
            startDistDisplay = ((firstPos - cutStartPos) * 100).toFixed(1);
            endDistDisplay = ((cutEndPos - lastPos) * 100).toFixed(1);
        }

        results.push({
            id: i + 1,
            startDistCm: startDistDisplay,
            firstMark: firstVisibleMark,
            lastMark: lastVisibleMark,
            endDistCm: endDistDisplay,
            hasMarks
        });
    }
    
    return results;
}

function render() {
    const currentCuts = calculateCuts();
    
    // Handle Empty State
    if (currentCuts.length === 0) {
        els.cutListContainer.innerHTML = '';
        els.cutListContainer.classList.add('hidden');
        els.emptyState.classList.remove('hidden');
        return;
    }

    els.emptyState.classList.add('hidden');
    els.cutListContainer.classList.remove('hidden');
    els.cutListContainer.innerHTML = '';

    // We iterate up to the max of current quantity or completed cuts to ensure we show everything relevant
    // But usually quantity is the master. If user reduces quantity below completed, we should probably just show quantity.
    // Let's stick to state.quantity (which drives currentCuts).
    
    currentCuts.forEach((calculatedCut, index) => {
        const isCompleted = index < state.cutsCompleted;
        const isCurrent = index === state.cutsCompleted;
        
        // Use frozen data if completed, otherwise use calculated
        const cut = (isCompleted && state.completedCutsData[index]) 
            ? state.completedCutsData[index] 
            : calculatedCut;

        const card = document.createElement('div');
        card.className = `cut-item ${isCompleted ? 'completed' : ''}`;
        
        // Generate Markings HTML
        let markingsHtml = '';
        if (cut.hasMarks) {
            markingsHtml += `<div class="mark-badge">${cut.firstMark}${state.cableUnit}</div>`;
            if (cut.firstMark !== cut.lastMark) {
                markingsHtml += `<div class="mark-badge">${cut.lastMark}${state.cableUnit}</div>`;
            }
        } else {
            markingsHtml = `<span style="color: rgba(255,255,255,0.5); font-size: 0.875rem; font-style: italic;">No markings in this segment</span>`;
        }

        // Adjustment Controls (Only for current cut)
        let startDistContent = `<div class="measurement-text">${cut.startDistCm}<span class="text-sm">cm</span></div>`;
        
        if (isCurrent) {
            startDistContent = `
                <div class="measurement-label-container">
                    <button class="btn-adj" onclick="adjustStartDist(1)">+</button>
                    <div class="measurement-text">${cut.startDistCm}<span class="text-sm">cm</span></div>
                    <button class="btn-adj" onclick="adjustStartDist(-1)">-</button>
                </div>
            `;
        }

        // Action Button (Header)
        let headerActionHtml = '';
        if (isCurrent) {
            headerActionHtml = `
                <button class="btn-mark-cut" onclick="markAsCut(${index})">
                    <span>Mark Cut</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </button>
            `;
        } else if (isCompleted) {
             headerActionHtml = `
                <div class="status-completed">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>Done</span>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="cut-header">
                <span style="font-weight: 700; color: var(--slate-400);">#${cut.id}</span>
                ${headerActionHtml}
            </div>

            <div class="p-6">
                <div class="cut-row">
                    <div class="cut-visual-wrapper">
                        <div class="cable-visual-container">
                            <div class="cable-jacket">
                                <div class="cable-shine"></div>
                            </div>

                            <div class="measurement-marker" style="left: 0;">
                                ${startDistContent}
                                <div class="measurement-line"></div>
                            </div>

                            <div class="measurement-marker" style="right: 0;">
                                <div class="measurement-text">${cut.endDistCm}<span class="text-sm">cm</span></div>
                                <div class="measurement-line"></div>
                            </div>
                            
                            <div class="markings-container">
                                ${markingsHtml}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        els.cutListContainer.appendChild(card);
    });
}

// Global functions for inline onclick handlers
window.adjustStartDist = function(amount) {
    // amount is 1 or -1 from the button click, but we want 0.2 increments
    // We'll ignore the passed amount magnitude and just use sign
    const sign = amount > 0 ? 1 : -1;
    const increment = 0.2;
    
    let current = parseFloat(state.startDistCm) || 0;
    state.startDistCm = parseFloat((current + (sign * increment)).toFixed(1));
    
    // Update input value to reflect change
    els.startDistCm.value = state.startDistCm;
    render();
};

window.markAsCut = function(index) {
    // Freeze the current cut data
    const currentCuts = calculateCuts();
    if (currentCuts[index]) {
        state.completedCutsData[index] = currentCuts[index];
    }
    
    // Update inputs for the next cut
    const nextCut = currentCuts[index + 1];
    if (nextCut && nextCut.hasMarks) {
        // Update state
        state.startDistCm = parseFloat(nextCut.startDistCm);
        state.firstMarkVal = nextCut.firstMark;
        
        // Update DOM inputs
        els.startDistCm.value = state.startDistCm;
        els.firstMarkVal.value = state.firstMarkVal;
    }

    state.cutsCompleted = index + 1;
    render();
};

function switchView(viewName) {
    if (state.currentView === viewName) return;

    // Check for unsaved progress in Cut mode
    const targetTool = viewName === 'cut' ? 'Cut Calculator' : 'Measure Tool';
    if (!confirm(`Are you sure you want to switch to ${targetTool}?`)) {
        return;
    }

    // Reset cut progress if switching away from cut tool
    if (state.currentView === 'cut' && state.cutsCompleted > 0) {
        state.cutsCompleted = 0;
        state.completedCutsData = {};
        render();
    }

    state.currentView = viewName;

    // Update UI
    if (viewName === 'cut') {
        els.viewCut.classList.remove('hidden');
        els.viewMeasure.classList.add('hidden');
        window.location.hash = 'cut';
    } else {
        els.viewCut.classList.add('hidden');
        els.viewMeasure.classList.remove('hidden');
        window.location.hash = 'measure';
    }
}

function calculateMeasure() {
    const startMark = parseInt(els.measStartMark.value) || 0;
    const startOffset = parseFloat(els.measStartOffset.value) || 0;
    const endMark = parseInt(els.measEndMark.value) || 0;
    const endOffset = parseFloat(els.measEndOffset.value) || 0;

    // Calculate length
    // Length = |Mark1 - Mark2| (ft) + Offsets (cm)
    const markDiffFt = Math.abs(endMark - startMark);
    const totalOffsetCm = startOffset + endOffset;
    
    const totalMeters = (markDiffFt * FOOT_IN_M) + (totalOffsetCm * CM_IN_M);

    // Update UI
    els.resStartMark.textContent = `${startMark}ft`;
    els.resEndMark.textContent = `${endMark}ft`;
    els.resStartOffset.innerHTML = `${startOffset}<span class="text-sm">cm</span>`;
    els.resEndOffset.innerHTML = `${endOffset}<span class="text-sm">cm</span>`;
    
    // Format with "gas pump" style for 3rd decimal place
    const valStr = totalMeters.toFixed(3);
    const thirdDigit = valStr.slice(-1);
    
    if (thirdDigit === '0') {
        els.resTotalLength.textContent = `${totalMeters.toFixed(2)} m`;
    } else {
        const mainPart = valStr.slice(0, -1);
        els.resTotalLength.innerHTML = `${mainPart}<span class="gas-pump-digit">${thirdDigit}</span> m`;
    }
}

// Run
init();
