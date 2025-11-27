// Icons
const ICONS = {
    scissors: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-500"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" x2="8.12" y1="4" y2="15.88"/><line x1="14.47" x2="20" y1="14.48" y2="20"/><line x1="8.12" x2="12" y1="8.12" y2="12"/></svg>`
};

// State
const state = {
    reqLengthM: 3.0,
    quantity: 2,
    cableUnit: 'm', // 'm' or 'ft'
    direction: 'asc', // 'asc' or 'desc'
    startDistCm: 5,
    firstMarkVal: 10,
    cutsCompleted: 0,
    completedCutsData: {} // Store frozen data for completed cuts
};

// Constants
const FOOT_IN_M = 0.3048;

// DOM Elements
const els = {
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
    btnUpdate: document.getElementById('btnUpdate')
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

    // Add Event Listeners
    els.reqLengthM.addEventListener('input', (e) => { state.reqLengthM = e.target.value; });
    els.quantity.addEventListener('input', (e) => { state.quantity = e.target.value; });
    els.startDistCm.addEventListener('input', (e) => { state.startDistCm = e.target.value; });
    els.firstMarkVal.addEventListener('input', (e) => { state.firstMarkVal = e.target.value; });

    els.btnUnitM.addEventListener('click', () => { state.cableUnit = 'm'; updateToggleButtons(); });
    els.btnUnitFt.addEventListener('click', () => { state.cableUnit = 'ft'; updateToggleButtons(); });
    
    els.btnDirAsc.addEventListener('click', () => { state.direction = 'asc'; updateToggleButtons(); });
    els.btnDirDesc.addEventListener('click', () => { state.direction = 'desc'; updateToggleButtons(); });

    els.btnUpdate.addEventListener('click', () => { 
        state.cutsCompleted = 0;
        state.completedCutsData = {};
        render(); 
    });
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
    
    const spacing = state.cableUnit === 'm' ? 1.0 : FOOT_IN_M;
    const isAsc = state.direction === 'asc';

    // 2. Define the Position of a Mark
    const getMarkPosition = (markValue) => {
        const delta = isAsc ? (markValue - M_init) : (M_init - markValue);
        return initialDistM + (delta * spacing);
    };

    // 3. Loop through cuts
    for (let i = 0; i < qty; i++) {
        const cutStartPos = i * L;
        const cutEndPos = (i + 1) * L;
        const epsilon = 0.0001;

        let startMarkID, endMarkID;
        let firstVisibleMark = null;
        let lastVisibleMark = null;
        
        if (isAsc) {
            const minIndexCalc = M_init + (cutStartPos - initialDistM) / spacing;
            startMarkID = Math.floor(minIndexCalc + epsilon) + 1;
            
            const maxIndexCalc = M_init + (cutEndPos - initialDistM) / spacing;
            endMarkID = Math.floor(maxIndexCalc + epsilon);

            if (startMarkID <= endMarkID) {
                firstVisibleMark = startMarkID;
                lastVisibleMark = endMarkID;
            }
        } else {
            const maxIndexCalc = M_init - (cutStartPos - initialDistM) / spacing;
            startMarkID = Math.ceil(maxIndexCalc - epsilon) - 1;

            const minIndexCalc = M_init - (cutEndPos - initialDistM) / spacing;
            endMarkID = Math.ceil(minIndexCalc - epsilon);

            if (startMarkID >= endMarkID) {
                firstVisibleMark = startMarkID;
                lastVisibleMark = endMarkID;
            }
        }

        let hasMarks = firstVisibleMark !== null;
        let startDistDisplay = 0;
        let endDistDisplay = 0;

        if (hasMarks) {
            const firstPos = getMarkPosition(firstVisibleMark);
            const lastPos = getMarkPosition(lastVisibleMark);
            startDistDisplay = Math.round((firstPos - cutStartPos) * 100);
            endDistDisplay = Math.round((cutEndPos - lastPos) * 100);
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
    let current = parseFloat(state.startDistCm) || 0;
    state.startDistCm = current + amount;
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
    
    state.cutsCompleted = index + 1;
    render();
};

// Run
init();
