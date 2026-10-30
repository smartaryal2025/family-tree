// Supabase Setup
const SUPABASE_URL = 'https://dqvwyprvgglmwdbernpq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxdnd5cHJ2Z2dsbXdkYmVybnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNDg1ODUsImV4cCI6MjEwODkyNDU4NX0.E79qy5EeQsYAwkrt8WSnQvABxo4L8T_ZYbFnzvT4law';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let familyData = [];
let nextId = 70;
let collapsedNodes = new Set();
let focusId = null;
let tempAddSpouses = []; 
let tempEditSpouses = []; 
let nodePositions = []; 
let searchTimeout;
let draggingNodeId = null;
const EXPORT_SCALE = 1.5;

// Database बाट डाटा तान्ने नयाँ फङ्सन
async function loadDataFromSupabase() {
    try {
        const { data, error } = await supabaseClient.from('members').select('*');
        if (error) throw error;
        
        if (data && data.length > 0) {
            // Database को snake_case लाई हाम्रो JS को camelCase मा बदल्ने
            familyData = data.map(d => ({
                id: d.id,
                name: d.name || "",
                gender: d.gender,
                parentId: d.parent_id,
                motherName: d.mother_name,
                spouses: d.spouses || [],
                hierarchyOrder: d.hierarchy_order || 99,
                birthDate: d.birth_date,
                deathDate: d.death_date
            }));
            nextId = Math.max(...familyData.map(d => d.id), 0) + 1;
            // अफलाइन ब्याकअपको लागि लोकलस्टोरेजमा पनि सेभ गर्ने
            localStorage.setItem('aryalFamilyTreeDataV1_2', JSON.stringify(familyData));
        } else {
            // यदि डाटाबेसमा केही भेटिएन भने अफलाइन डाटा प्रयोग गर्ने
            const savedData = localStorage.getItem('aryalFamilyTreeDataV1_2');
            if (savedData) familyData = JSON.parse(savedData);
        }
    } catch (err) {
        console.error("Supabase Error Details:", err); // <-- यो नयाँ लाइन थप्नुहोस्
        const savedData = localStorage.getItem('aryalFamilyTreeDataV1_2');
        if (savedData) familyData = JSON.parse(savedData);
    }
    renderTree(true);
}

// पुरानो saveTree फङ्सनलाई पनि अहिलेलाई लोकलस्टोरेजमै मात्र राख्ने (अर्को स्टेपमा हामी यसलाई Database मा सेभ हुने बनाउँछौँ)
function saveTree() { localStorage.setItem('aryalFamilyTreeDataV1_2', JSON.stringify(familyData)); }

function toDevanagariDigits(num) {
    const devDigits = ['०','१','२','३','४','५','६','७','८','९'];
    return num.toString().split('').map(d => devDigits[d] || d).join('');
}

const dev2romMap = {
    'क':'k','ख':'kh','ग':'g','घ':'gh','ङ':'ng','च':'ch','छ':'chh','ज':'j','झ':'jh','ञ':'ny',
    'ट':'t','ठ':'th','ड':'d','ढ':'dh','ण':'n','त':'t','थ':'th','द':'d','ध':'dh','न':'n',
    'प':'p','फ':'f','ब':'b','भ':'bh','म':'m','य':'y','र':'r','ल':'l','व':'v','श':'sh','ष':'sh','स':'s','ह':'h',
    'ा':'a','ि':'i','ी':'i','ु':'u','ू':'u','े':'e','ै':'ai','ो':'o','ौ':'au','ं':'n','ः':'h','ृ':'ri','्':''
};

function normalizeForSearch(text) {
    if(!text) return "";
    let mapped = text.split('').map(char => dev2romMap[char] || char).join('').toLowerCase();
    return mapped.replace(/a/g, ''); 
}

function handleSearchInput() {
    const input = document.getElementById('searchInput');
    const clearBtn = document.getElementById('searchClear');
    const suggestionsBox = document.getElementById('searchSuggestions');
    const rawQuery = input.value.trim().toLowerCase();
    const fuzzyQuery = rawQuery.replace(/a/g, ''); 
    
    clearBtn.style.display = rawQuery.length > 0 ? 'block' : 'none';
    
    if (rawQuery.length === 0) {
        suggestionsBox.style.display = 'none';
        return;
    }

    const results = familyData.filter(d => d.id !== 'DUMMY_ROOT' && d.name).filter(d => {
        const nameDev = d.name.toLowerCase();
        const nameRom = normalizeForSearch(d.name);
        return nameDev.includes(rawQuery) || nameRom.includes(fuzzyQuery);
    });

    if (results.length > 0) {
        suggestionsBox.innerHTML = results.map(d => {
            const parent = familyData.find(p => p.id === d.parentId);
            const parentName = parent && parent.id !== 'DUMMY_ROOT' ? (parent.name || "नाम छैन") : "मूल पुर्खा";
            return `<div class="suggestion-item" onclick="focusSearchNode(${d.id}, '${d.name}')">
                        <b>${d.name}</b> <span class="suggestion-parent">(पिता: ${parentName})</span>
                    </div>`;
        }).join('');
        suggestionsBox.style.display = 'block';
    } else {
        suggestionsBox.innerHTML = `<div class="suggestion-item" style="color:#7f8c8d;">कुनै नाम भेटिएन</div>`;
        suggestionsBox.style.display = 'block';
    }
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchClear').style.display = 'none';
    document.getElementById('searchSuggestions').style.display = 'none';
    d3.selectAll('.node-box').classed('search-highlight', false);
    clearTimeout(searchTimeout);
}

function focusSearchNode(id, name) {
    document.getElementById('searchInput').value = name;
    document.getElementById('searchSuggestions').style.display = 'none';
    expandAll();

    setTimeout(() => {
        d3.selectAll('.node-box').classed('search-highlight', false);
        let targetNode = null;
        
        d3.selectAll('.node-box').each(function(d) {
            if (d.data.id === id) {
                d3.select(this).classed('search-highlight', true);
                targetNode = d;
            }
        });

        if (targetNode) {
            const vpWidth = document.getElementById('tree-viewport').clientWidth;
            const vpHeight = document.getElementById('tree-viewport').clientHeight;
            const scale = 1.2; 
            let target = d3.zoomIdentity.translate((vpWidth / 2) - (targetNode.x * scale), (vpHeight / 2) - (targetNode.y * scale)).scale(scale);
            viewport.transition().duration(800).call(zoom.transform, target);
        }
        
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            d3.selectAll('.node-box').classed('search-highlight', false);
        }, 4000);

    }, 450); 
}

document.addEventListener('click', function(e) {
    const suggestionsBox = document.getElementById('searchSuggestions');
    if (suggestionsBox && !e.target.closest('.search-container')) suggestionsBox.style.display = 'none';
    
    const panel = document.getElementById('details-panel');
    if (panel && panel.classList.contains('show') && !panel.contains(e.target) && !e.target.closest('.node-box')) {
        panel.classList.remove('show');
    }
});

document.addEventListener('keydown', function(event) {
    if (event.key === "Escape" || event.keyCode === 27) {
        closeExportModal();
        closeEditModal();
        closeAddModal();
        const detailsPanel = document.getElementById('details-panel');
        if (detailsPanel) detailsPanel.classList.remove('show');
        
        const searchSugg = document.getElementById('searchSuggestions');
        if (searchSugg) searchSugg.style.display = 'none';
        d3.selectAll('.node-box').classed('search-highlight', false);
    }
});

function exportJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(familyData, null, 2));
    const a = document.createElement('a'); a.setAttribute("href", dataStr); a.setAttribute("download", "Aryal_Family_Tree.json"); a.click();
}

function importJSON(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (Array.isArray(importedData)) {
                familyData = importedData;
                nextId = Math.max(...familyData.map(d => d.id)) + 1;
                saveTree(); renderTree(true); 
                setTimeout(() => alert("ब्याकअप सफलतापूर्वक लोड भयो!"), 100);
            }
        } catch(err) { alert("Invalid JSON file."); }
    };
    reader.readAsText(file); event.target.value = ''; 
}

function exportDataJS() {
    const dataStr = "const defaultFamilyData = " + JSON.stringify(familyData, null, 4) + ";";
    const blob = new Blob([dataStr], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = "data.js"; a.click();
    URL.revokeObjectURL(url);
}

function factoryReset() {
    if(confirm("सबै डेटा मेटेर सुरुको अवस्थामा लैजान चाहनुहुन्छ?")) {
        localStorage.removeItem('aryalFamilyTreeDataV1_2'); location.reload(); 
    }
}

const viewport = d3.select("#tree-viewport");
const zoomLayer = d3.select("#zoom-layer");
const zoom = d3.zoom().scaleExtent([0.1, 3]).on("zoom", (e) => {
    zoomLayer.style("transform", `translate(${e.transform.x}px, ${e.transform.y}px) scale(${e.transform.k})`);
});
viewport.call(zoom).on("dblclick.zoom", null);

function zoomCamera(factor) { viewport.transition().duration(300).call(zoom.scaleBy, factor); }

function centerCamera(instant = false) {
    const vpNode = document.getElementById('tree-viewport');
    const vpWidth = (vpNode && vpNode.clientWidth > 0) ? vpNode.clientWidth : window.innerWidth;
    const currentTransform = d3.zoomTransform(viewport.node());
    const scale = currentTransform.k || 1; 
    
    let startX = (vpWidth / 2);
    if (document.getElementById('staggerToggle') && document.getElementById('staggerToggle').checked) {
        startX = (vpWidth / 2) - (130 * 1.5 * scale); 
    }
    
    let target = d3.zoomIdentity.translate(startX, 60).scale(scale);
    if (instant) viewport.call(zoom.transform, target);
    else viewport.transition().duration(400).call(zoom.transform, target);
}

function dragStart(e, id) {
    draggingNodeId = id;
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    
    const ghost = document.getElementById('drag-ghost-element');
    if (ghost) {
        const nodeBox = e.currentTarget.closest('.node-box');
        if (nodeBox && nodeBox.classList.contains('female')) {
            ghost.style.width = '85px'; ghost.style.height = '50px';
        } else {
            ghost.style.width = '130px'; ghost.style.height = '80px';
        }
        e.dataTransfer.setDragImage(ghost, 15, 15);
    }
    
    setTimeout(() => {
        if(e.target.closest) {
            let box = e.target.closest('.node-box');
            if(box) box.style.opacity = '0.3';
        }
    }, 0);
}

function dragEnterTarget(e, targetId) {
    e.preventDefault();
    if (!draggingNodeId || draggingNodeId === targetId) return;
    
    const sourceNode = familyData.find(d => d.id === draggingNodeId);
    const targetNode = familyData.find(d => d.id === targetId);
    
    if (sourceNode && targetNode && sourceNode.parentId === targetNode.parentId && sourceNode.motherName === targetNode.motherName) {
        let siblings = familyData.filter(d => d.parentId === sourceNode.parentId && d.motherName === sourceNode.motherName)
                                 .sort((a,b) => (a.hierarchyOrder||99) - (b.hierarchyOrder||99));
        
        siblings.forEach((sib, idx) => { 
            if(sib.hierarchyOrder === 99 || !sib.hierarchyOrder) sib.hierarchyOrder = idx + 10; 
        });
        
        let temp = sourceNode.hierarchyOrder;
        sourceNode.hierarchyOrder = targetNode.hierarchyOrder;
        targetNode.hierarchyOrder = temp;
        
        renderTree();
    }
}

function dragOver(e) { e.preventDefault(); }

function dropNode(e, targetId) {
    e.preventDefault();
    saveTree(); 
}

function dragEnd(e) { 
    draggingNodeId = null;
    d3.selectAll('.node-box').style('opacity', 1);
    saveTree();
    renderTree();
}

const nodeWidth = 130; 
const nodeHeight = 80;  
const horizontalGap = 15; 
const verticalGap = 60;
let treeWidthTotal = 0;
let treeHeightTotal = 0;
let generatedMasterCanvas = null; 

function getFilteredData() {
    let baseData = familyData;
    
    if (focusId) {
        let visible = new Set();
        let curr = focusId;
        while(curr) {
            visible.add(curr);
            let p = baseData.find(d => d.id === curr);
            curr = p ? p.parentId : null;
        }
        function addDesc(id) {
            visible.add(id);
            baseData.filter(d => d.parentId === id).forEach(c => addDesc(c.id));
        }
        addDesc(focusId);
        baseData = baseData.filter(d => visible.has(d.id));
    }
    
    if (!document.getElementById('showDaughtersToggle').checked) {
        let toHide = new Set();
        baseData.forEach(d => { if (d.gender === 'F') toHide.add(d.id); });
        let changed = true;
        while(changed) {
            changed = false;
            baseData.forEach(d => {
                if (toHide.has(d.parentId) && !toHide.has(d.id)) { toHide.add(d.id); changed = true; }
            });
        }
        baseData = baseData.filter(d => !toHide.has(d.id));
    }

    if (collapsedNodes.size > 0) {
        let hiddenByCollapse = new Set();
        function hideDescendants(parentId) {
            baseData.filter(d => d.parentId === parentId).forEach(child => {
                hiddenByCollapse.add(child.id);
                hideDescendants(child.id); 
            });
        }
        collapsedNodes.forEach(id => hideDescendants(id));
        baseData = baseData.filter(d => !hiddenByCollapse.has(d.id));
    }
    return baseData;
}

function setFocus(id) { focusId = id; collapsedNodes.clear(); renderTree(); }
function expandAll() { collapsedNodes.clear(); focusId = null; renderTree(); }
function collapseAll() {
    const validIds = new Set(familyData.map(d => d.id));
    familyData.filter(d => d.parentId === null || !validIds.has(d.parentId)).forEach(root => {
        collapsedNodes.add(root.id);
    });
    renderTree();
}
function toggleCollapse(id) {
    if (collapsedNodes.has(id)) collapsedNodes.delete(id); 
    else collapsedNodes.add(id); 
    renderTree();
}
function handleLayoutToggle() { renderTree(); centerCamera(false); }

function showDetails(id, event) {
    if(event) event.stopPropagation();
    const person = familyData.find(d => d.id === id);
    const parent = familyData.find(d => d.id === person.parentId);
    const children = familyData.filter(d => d.parentId === id);
    const panel = document.getElementById("details-panel");
    
    let displayName = person.name ? person.name.trim() : "";
    if (person.gender === 'M') {
        displayName = displayName !== "" ? displayName : "(नाम नखुलेको छोरा)";
    } else {
        if (displayName === "") displayName = "(नाम नखुलेकी छोरी)";
        else if (!displayName.includes("छोरी")) displayName += " (छोरी)";
    }

    let spouseLabel = person.gender === 'M' ? "पत्नी:" : "पति:";
    let actualMother = person.motherName;
    if (!actualMother && parent && parent.spouses && parent.spouses.length === 1) {
        actualMother = parent.spouses[0];
    }
    if (!actualMother) actualMother = "-";

    let childrenText = "छैन";
    if (children.length > 0) {
        childrenText = children.map(c => {
            let cName = c.name ? c.name.trim() : "";
            if (c.gender === 'M') {
                return cName !== "" ? cName : "(छोरा)";
            } else {
                if (cName === "") return "(छोरी)";
                return cName.includes("छोरी") ? cName : cName + " (छोरी)";
            }
        }).join(", ");
    }
    
    let dateStr = "";
    if (person.birthDate || person.deathDate) {
        dateStr = `<p style="margin: 5px 0; font-size: 13px; color: #34495e;"><b>मिति:</b> ${person.birthDate || "?"} - ${person.deathDate || "?"}</p>`;
    }
    
    let calcDepth = 1;
    let cParent = parent;
    while(cParent && cParent.id !== 'DUMMY_ROOT') {
        calcDepth++;
        cParent = familyData.find(p => p.id === cParent.parentId);
    }
    
    panel.innerHTML = `
        <button class="close-details" onclick="document.getElementById('details-panel').classList.remove('show')">✕</button>
        <h3 style="margin: 0 0 10px 0; color: #183153; font-size: 18px; border-bottom: 2px solid #ecf0f1; padding-bottom: 5px;">${displayName}</h3>
        <p style="margin: 5px 0; font-size: 13px; color: #34495e;"><b>पुस्ता नं.:</b> ${toDevanagariDigits(calcDepth)}</p>
        <p style="margin: 5px 0; font-size: 13px; color: #34495e;"><b>लिङ्ग:</b> ${person.gender === "M" ? "पुरुष" : "महिला"}</p>
        ${dateStr}
        <p style="margin: 5px 0; font-size: 13px; color: #34495e;"><b>पिता:</b> ${parent ? (parent.name || "नाम नखुलेको") : "मूल पुर्खा"}</p>
        <p style="margin: 5px 0; font-size: 13px; color: #34495e;"><b>माता:</b> ${actualMother}</p>
        <p style="margin: 5px 0; font-size: 13px; color: #34495e;"><b>${spouseLabel}</b> ${person.spouses && person.spouses.length ? person.spouses.join(", ") : "छैन"}</p>
        <p style="margin: 5px 0; font-size: 13px; color: #34495e;"><b>सन्तान:</b> ${childrenText}</p>
    `;
    
    panel.classList.add("show");
    
    if (event && event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        let top = rect.top + window.scrollY;
        let left = rect.right + 15 + window.scrollX;
        if (left + 320 > window.innerWidth) left = rect.left - 315 + window.scrollX;
        if (top + panel.offsetHeight > window.innerHeight + window.scrollY) {
            top = (window.innerHeight + window.scrollY) - panel.offsetHeight - 15;
        }
        if (left < 0 || window.innerWidth < 600) {
            left = Math.max(10, (window.innerWidth / 2) - 150 + window.scrollX);
            top = rect.bottom + 15 + window.scrollY;
        }
        panel.style.top = `${top}px`;
        panel.style.left = `${left}px`;
    }
}

function getDisplayLabel(d) {
    let name = (d.data.name || "").trim();
    let suffix = "";
    let hLabel = "";
    let dateStr = "";
    const h = d.data.hierarchyOrder;
    const isRoot = (d.data.parentId === 'DUMMY_ROOT');
    
    if (d.data.birthDate || d.data.deathDate) {
        dateStr = `<div class="date-text">(${d.data.birthDate || "?"} - ${d.data.deathDate || "?"})</div>`;
    }
    
    if (h && h < 99) {
        if (d.data.gender === 'M') {
            if(h===1) hLabel="जेठो"; else if(h===2) hLabel="माइलो"; else if(h===3) hLabel="साँहिलो";
            else if(h===4) hLabel="काइँलो"; else if(h===5) hLabel="ठाइँलो"; else if(h===6) hLabel="कान्छो"; 
        } else {
            if(h===1) hLabel="जेठी"; else if(h===2) hLabel="माइली"; else if(h===3) hLabel="साँहिली";
            else if(h===4) hLabel="काइँली"; else if(h===5) hLabel="ठाइँली"; else if(h===6) hLabel="कान्छी";
        }
    }

    if (isRoot) {
        let rName = name || `<span style="font-size:14px; color:#2c3e50; font-weight:bold;">${d.data.gender === 'M' ? "(नाम नखुलेको पुरुष)" : "(नाम नखुलेकी महिला)"}</span>`;
        return rName + dateStr;
    }
    if (d.data.parentId === 1 && name !== "") hLabel = ""; 

    if (d.data.gender === 'M') {
        if (hLabel) suffix = `(${hLabel} छोरा)`;
    } else {
        if (hLabel) suffix = `(${hLabel} छोरी)`;
        else if (!name.includes("छोरी")) suffix = `(छोरी)`;
    }

    if (name === "") return `<span style="font-size:14px; color:#2c3e50; font-weight:bold;">${suffix || (d.data.gender === 'M' ? "(छोरा)" : "(छोरी)")}</span>` + dateStr;
    
    if (suffix) return `${name}<div class="hierarchy-text">${suffix}</div>` + dateStr;
    return name + dateStr; 
}

function renderTree(isInitialLoadOrReset = false) {
    let baseData = getFilteredData();
    if(baseData.length === 0) {
        d3.select("#nodes-container").selectAll("*").remove();
        d3.select("#lines-svg").selectAll("*").remove();
        return;
    }
    
    const validIds = new Set(baseData.map(d => d.id));
    const trueRoots = baseData.filter(d => d.parentId === null || !validIds.has(d.parentId));
    
    const headerP = document.querySelector('header p');
    if (headerP) {
        if (trueRoots.length > 0) {
            const rootNames = trueRoots.map(d => (d.name || "नाम नखुलेको").trim()).join(", ");
            headerP.innerText = "मूल पुर्खा: " + rootNames;
        } else {
            headerP.innerText = "मूल पुर्खा: -";
        }
    }

    let treeData = JSON.parse(JSON.stringify(baseData));
    treeData.push({ id: 'DUMMY_ROOT', parentId: null, name: '', gender: 'M', hierarchyOrder: -999, isDummy: true });
    
    treeData.forEach(d => {
        if (d.id !== 'DUMMY_ROOT' && (d.parentId === null || !validIds.has(d.parentId))) d.parentId = 'DUMMY_ROOT';
    });

    if(isInitialLoadOrReset) centerCamera(true);
    
    const root = d3.stratify().id(d => d.id).parentId(d => d.parentId)(treeData);
    
    root.sort((a, b) => {
        const parent = treeData.find(d => d.id === a.data.parentId);
        let aMotherIdx = 999, bMotherIdx = 999;
        if (parent && parent.spouses) {
            if (a.data.motherName) aMotherIdx = parent.spouses.indexOf(a.data.motherName);
            if (b.data.motherName) bMotherIdx = parent.spouses.indexOf(b.data.motherName);
            if (aMotherIdx === -1 && a.data.motherName) aMotherIdx = 998;
            if (bMotherIdx === -1 && b.data.motherName) bMotherIdx = 998;
        }
        if (aMotherIdx !== bMotherIdx) return aMotherIdx - bMotherIdx;
        const aHier = a.data.hierarchyOrder || 99, bHier = b.data.hierarchyOrder || 99;
        if (aHier !== bHier) return aHier - bHier;
        return a.data.id - b.data.id; 
    });

    const isStaggered = document.getElementById('staggerToggle').checked;
    nodePositions = [];
    
    if (isStaggered) {
        const indent = 50; 
        function layoutStaggered(node, depth, yPos) {
            node.x = depth * indent; node.y = yPos;
            let nextY = yPos + nodeHeight + 20; 
            if (node.children) node.children.forEach(child => { nextY = layoutStaggered(child, depth + 1, nextY); });
            return nextY;
        }
        layoutStaggered(root, 0, 0);
    } else {
        const treeLayout = d3.tree().nodeSize([nodeWidth + horizontalGap, nodeHeight + verticalGap])
                             .separation((a, b) => {
                                 if (a.parent !== b.parent) return 1.25; 
                                 if (a.data.gender === 'F' && b.data.gender === 'F') return 0.60; 
                                 if (a.data.gender === 'F' || b.data.gender === 'F') return 0.8; 
                                 return 1; 
                             });
        treeLayout(root);
    }
    
    let offsetX = -root.x; 
    
    const nodesData = root.descendants().filter(d => d.id !== 'DUMMY_ROOT');
    const linksData = root.links().filter(d => d.source.id !== 'DUMMY_ROOT');

    if (nodesData.length === 0) return;

    let offsetY = 0;
    let minTrueY = d3.min(nodesData, d => d.y);
    offsetY = -minTrueY; 

    nodesData.forEach(d => { 
        d.x = d.x + offsetX; 
        d.y = d.y + offsetY; 
        nodePositions.push({ id: d.id, parentId: d.data.parentId === 'DUMMY_ROOT' ? null : d.data.parentId, x: d.x, y: d.y, gender: d.data.gender });
    });

    const svg = d3.select("#lines-svg");
    svg.attr("width", 10000).attr("height", 10000);

    const animDuration = draggingNodeId ? 150 : 400; 

    const links = svg.selectAll(".link").data(linksData, d => d.target.data.id);
    links.exit().transition().duration(animDuration).style("opacity", 0).remove();
    
    const linkEnter = links.enter().append("path").attr("class", "link")
        .style("opacity", 0)
        .style("fill", "none")
        .style("stroke", "#a8b8ce")
        .style("stroke-width", "2px")
        .attr("d", d => {
            let px = d.source.x, py = d.source.y;
            return `M${px},${py + nodeHeight} V${py + nodeHeight} H${px} V${py}`;
        });
        
    linkEnter.merge(links).transition().duration(animDuration).style("opacity", 1)
        .attr("d", d => {
            if (isStaggered) return `M${d.source.x + 20},${d.source.y + nodeHeight} V${d.target.y + (nodeHeight / 2)} H${d.target.x}`;
            return `M${d.source.x},${d.source.y + nodeHeight} V${d.source.y + nodeHeight + verticalGap / 2} H${d.target.x} V${d.target.y}`;
        });

    const nodesContainer = d3.select("#nodes-container");
    const nodes = nodesContainer.selectAll(".node-box").data(nodesData, d => d.data.id);
    
    nodes.exit().transition().duration(animDuration)
        .style("opacity", 0)
        .style("transform", "scale(0.8)")
        .remove();
        
    const nodeEnter = nodes.enter().append("div")
        .style("opacity", 0)
        .style("transform", "scale(0.8)")
        .style("left", d => {
            let nw = d.data.gender === 'F' ? 85 : 130;
            return `${d.parent && d.parent.id !== 'DUMMY_ROOT' ? d.parent.x - nw / 2 : d.x - nw / 2}px`;
        })
        .style("top", d => `${d.parent && d.parent.id !== 'DUMMY_ROOT' ? d.parent.y : d.y}px`);
        
    const mergedNodes = nodeEnter.merge(nodes);
    
    mergedNodes
        .on("click", (e, d) => showDetails(d.data.id, e))
        .on("dblclick", (e, d) => { e.stopPropagation(); toggleCollapse(d.data.id); })
        .on("dragenter", (e, d) => dragEnterTarget(e, d.data.id))
        .on("dragover", dragOver)
        .on("drop", (e, d) => dropNode(e, d.data.id))
        .html(d => {
            let spouseLabel = d.data.gender === 'M' ? "पत्नी: " : "पति: ";
            const hasChildren = familyData.some(c => c.parentId === d.data.id && c.id !== 'DUMMY_ROOT');
            let collapseBtnHtml = hasChildren ? `<div class="collapse-btn" onclick="toggleCollapse(${d.data.id}); event.stopPropagation();">${collapsedNodes.has(d.data.id) ? '+' : '−'}</div>` : '';
            
            let actionButtonsHtml = '';
            if (d.data.gender === 'F') {
                actionButtonsHtml = `
                    <button class="action-btn edit-btn" title="Edit" onclick="openEditModal(${d.data.id}); event.stopPropagation();">✏️</button>
                    <button class="action-btn remove-btn" title="Remove" onclick="removeNode(${d.data.id}); event.stopPropagation();">🗑️</button>
                `;
            } else {
                actionButtonsHtml = `
                    <button class="action-btn focus-btn" title="Focus" onclick="setFocus(${d.data.id}); event.stopPropagation();">🎯</button>
                    <button class="action-btn edit-btn" title="Edit" onclick="openEditModal(${d.data.id}); event.stopPropagation();">✏️</button>
                    <button class="action-btn remove-btn" title="Remove" onclick="removeNode(${d.data.id}); event.stopPropagation();">🗑️</button>
                `;
            }

            return `
            <div class="gen-badge" title="पुस्ता ${toDevanagariDigits(d.depth)}">${toDevanagariDigits(d.depth)}</div>
            <div class="drag-grip" title="Drag to reorder" draggable="true" ondragstart="dragStart(event, ${d.data.id})" ondragend="dragEnd(event)" onmousedown="event.stopPropagation()">⠿</div>
            <div class="node-text">
                ${getDisplayLabel(d)}
                ${(d.data.spouses && d.data.spouses.length > 0) ? `<div class="spouse-text">${spouseLabel}${d.data.spouses.join(', ')}</div>` : ''}
                ${d.data.motherName ? `<div class="mother-text">(आमा: ${d.data.motherName})</div>` : ''}
            </div>
            <div class="btn-group" data-html2canvas-ignore>
                ${actionButtonsHtml}
            </div>
            ${collapseBtnHtml}
            `
        });

    mergedNodes.filter(d => d.data.parentId === 'DUMMY_ROOT')
        .attr("class", d => {
            let cls = "node-box root";
            if(d.data.gender === 'F') cls += " female";
            return cls;
        })
        .style("opacity", 1)
        .style("transform", "scale(1)")
        .style("left", d => `${d.x - (d.data.gender === 'F' ? 85 : 130) / 2}px`)
        .style("top", d => `${d.y}px`);
        
    mergedNodes.filter(d => d.data.parentId !== 'DUMMY_ROOT')
        .attr("class", d => {
            let cls = "node-box";
            if(d.data.gender === 'F') cls += " female";
            return cls;
        })
        .transition().duration(animDuration)
        .style("opacity", d => {
            if(collapsedNodes.has(d.data.id)) return 0.85;
            if(d.data.gender === 'F') return 0.85; 
            return 1;
        })
        .style("transform", "scale(1)")
        .style("left", d => `${d.x - (d.data.gender === 'F' ? 85 : 130) / 2}px`)
        .style("top", d => `${d.y}px`);
}

function updateAddSpouseLabel() {
    const gender = document.getElementById('add-gender').value;
    document.getElementById('add-spouse-label').innerText = gender === 'M' ? 'पत्नी (वैकल्पिक):' : 'पति (वैकल्पिक):';
    renderAddSpouses(); 
}
function updateEditSpouseLabel() {
    const gender = document.getElementById('edit-gender').value;
    document.getElementById('edit-spouse-label').innerText = gender === 'M' ? 'पत्नी (वैकल्पिक):' : 'पति (वैकल्पिक):';
    renderEditSpouses(); 
}

function openAddModal() {
    document.getElementById('add-name').value = '';
    document.getElementById('add-birth').value = '';
    document.getElementById('add-death').value = '';
    document.getElementById('add-gender').value = 'M';
    document.getElementById('add-hierarchy').value = '99';
    
    const parentSelect = document.getElementById('add-parent');
    parentSelect.innerHTML = '<option value="">पिता छान्नुहोस्...</option>';
    parentSelect.innerHTML += '<option value="null">-- मूल पुर्खा (Root) --</option>';
    
    familyData.filter(d => d.gender === 'M').forEach(d => {
        const opt = document.createElement('option'); opt.value = d.id; opt.innerText = d.name || "नाम नखुलेको";
        parentSelect.appendChild(opt);
    });
    document.getElementById('add-mother').innerHTML = '<option value="">माता छान्नुहोस्...</option>';
    
    tempAddSpouses = [];
    updateAddSpouseLabel();
    document.getElementById('add-modal').style.display = 'block';
}

function closeAddModal() { document.getElementById('add-modal').style.display = 'none'; }

function updateAddMotherDropdown(parentId) {
    const motherSelect = document.getElementById('add-mother');
    motherSelect.innerHTML = '<option value="">माता छान्नुहोस्...</option>';
    if(parentId && parentId !== "" && parentId !== "null") {
        const parent = familyData.find(d => d.id === parseInt(parentId));
        if(parent && parent.spouses && parent.spouses.length > 0) {
            parent.spouses.forEach(spouse => {
                const opt = document.createElement('option'); opt.value = spouse; opt.innerText = spouse;
                motherSelect.appendChild(opt);
            });
        }
    }
}

function renderAddSpouses() {
    const list = document.getElementById('add-spouse-list');
    list.innerHTML = '';
    if(tempAddSpouses.length === 0) return; 
    tempAddSpouses.forEach((spouse, index) => {
        const item = document.createElement('div'); item.className = 'spouse-item';
        item.innerHTML = `<span>${spouse}</span> <button type="button" class="small-remove-btn" onclick="removeSpouseFromAdd(${index})">X</button>`;
        list.appendChild(item);
    });
}

function addSpouseToAdd() {
    const input = document.getElementById('new-add-spouse-input');
    const val = input.value.trim();
    if(val !== '') { tempAddSpouses.push(val); input.value = ''; renderAddSpouses(); }
}
function removeSpouseFromAdd(index) { tempAddSpouses.splice(index, 1); renderAddSpouses(); }

function saveNewNode() {
    const name = document.getElementById('add-name').value.trim();
    const birthDate = document.getElementById('add-birth').value.trim();
    const deathDate = document.getElementById('add-death').value.trim();
    const parentIdVal = document.getElementById('add-parent').value;
    const gender = document.getElementById('add-gender').value;
    const motherName = document.getElementById('add-mother').value;
    const hierarchy = parseInt(document.getElementById('add-hierarchy').value);
    
    if (parentIdVal === "") return alert("कृपया पिता छान्नुहोस्।");
    const parentId = parentIdVal === "null" ? null : parseInt(parentIdVal);
    
    let newNode = { id: nextId++, name: name, parentId: parentId, gender: gender, spouses: [...tempAddSpouses], hierarchyOrder: hierarchy };
    if(motherName !== "") newNode.motherName = motherName;
    if(birthDate !== "") newNode.birthDate = birthDate;
    if(deathDate !== "") newNode.deathDate = deathDate;
    
    familyData.push(newNode);
    saveTree(); closeAddModal(); renderTree();
}

function openEditModal(id) {
    const person = familyData.find(d => d.id === id);
    if(!person) return;
    
    document.getElementById('edit-id').value = person.id;
    document.getElementById('edit-name').value = person.name || "";
    document.getElementById('edit-birth').value = person.birthDate || "";
    document.getElementById('edit-death').value = person.deathDate || "";
    document.getElementById('edit-gender').value = person.gender;
    document.getElementById('edit-hierarchy').value = person.hierarchyOrder || 99;
    
    const parentSelect = document.getElementById('edit-parent');
    parentSelect.innerHTML = '<option value="null">-- मूल पुर्खा (Root) --</option>';
    
    familyData.filter(d => d.gender === 'M').forEach(d => {
        if (d.id !== person.id && !isDescendant(person.id, d.id)) {
            const opt = document.createElement('option'); opt.value = d.id; opt.innerText = d.name || "नाम नखुलेको";
            parentSelect.appendChild(opt);
        }
    });
    parentSelect.value = person.parentId === null ? "null" : person.parentId;
    
    updateEditMotherDropdown(parentSelect.value);
    document.getElementById('edit-mother').value = person.motherName || "";
    
    tempEditSpouses = person.spouses ? [...person.spouses] : [];
    updateEditSpouseLabel(); 
    document.getElementById('edit-modal').style.display = 'block';
}

function updateEditMotherDropdown(parentId) {
    const motherSelect = document.getElementById('edit-mother');
    const currentVal = motherSelect.value;
    motherSelect.innerHTML = '<option value="">माता छान्नुहोस्...</option>';
    if(parentId && parentId !== "null") {
        const parent = familyData.find(d => d.id === parseInt(parentId));
        if(parent && parent.spouses && parent.spouses.length > 0) {
            parent.spouses.forEach(spouse => {
                const opt = document.createElement('option'); opt.value = spouse; opt.innerText = spouse;
                motherSelect.appendChild(opt);
            });
        }
    }
    if(currentVal) motherSelect.value = currentVal;
}

function isDescendant(potentialAncestorId, nodeId) {
    let current = familyData.find(d => d.id === nodeId);
    while(current) {
        if(current.parentId === potentialAncestorId) return true;
        current = familyData.find(d => d.id === current.parentId);
    }
    return false;
}

function renderEditSpouses() {
    const list = document.getElementById('edit-spouse-list');
    list.innerHTML = '';
    if(tempEditSpouses.length === 0) return;
    tempEditSpouses.forEach((spouse, index) => {
        const item = document.createElement('div'); item.className = 'spouse-item';
        item.innerHTML = `<span>${spouse}</span> <button type="button" class="small-remove-btn" onclick="removeSpouseFromEdit(${index})">X</button>`;
        list.appendChild(item);
    });
}

function addSpouseToEdit() {
    const input = document.getElementById('new-spouse-input');
    const val = input.value.trim();
    if(val !== '') { tempEditSpouses.push(val); input.value = ''; renderEditSpouses(); }
}
function removeSpouseFromEdit(index) { tempEditSpouses.splice(index, 1); renderEditSpouses(); }
function closeEditModal() { document.getElementById('edit-modal').style.display = 'none'; }

function saveEdit() {
    const id = parseInt(document.getElementById('edit-id').value);
    const person = familyData.find(d => d.id === id);
    
    const birthDate = document.getElementById('edit-birth').value.trim();
    const deathDate = document.getElementById('edit-death').value.trim();
    
    person.name = document.getElementById('edit-name').value.trim();
    person.gender = document.getElementById('edit-gender').value;
    person.hierarchyOrder = parseInt(document.getElementById('edit-hierarchy').value);
    
    if(birthDate !== "") person.birthDate = birthDate; else delete person.birthDate;
    if(deathDate !== "") person.deathDate = deathDate; else delete person.deathDate;
    
    const parentVal = document.getElementById('edit-parent').value;
    person.parentId = parentVal === "null" ? null : parseInt(parentVal);
    
    const motherVal = document.getElementById('edit-mother').value;
    if(motherVal !== "") person.motherName = motherVal; else delete person.motherName;
    person.spouses = [...tempEditSpouses];
    
    saveTree(); closeEditModal(); renderTree();
}

function removeNode(id) {
    if(confirm("के तपाईं यो व्यक्ति र यसका सबै सन्तानहरूलाई हटाउन चाहनुहुन्छ?")) {
        let toRemove = new Set([id]);
        let changed = true;
        while (changed) {
            changed = false;
            familyData.forEach(d => {
                if (toRemove.has(d.parentId) && !toRemove.has(d.id)) { toRemove.add(d.id); changed = true; }
            });
        }
        familyData = familyData.filter(d => !toRemove.has(d.id));
        if (focusId && toRemove.has(focusId)) focusId = null;
        saveTree(); renderTree();
    }
}

function closeExportModal() { document.getElementById('export-modal').style.display = 'none'; }

async function showExportOptions() {
    document.getElementById('export-modal').style.display = 'block';
    document.getElementById('multi-page-preview').innerHTML = '';
    document.getElementById('export-buttons-container').style.display = 'none';
    document.getElementById('export-controls').style.display = 'none';
    document.getElementById('export-loading').style.display = 'block';
    
    generatedMasterCanvas = await createExportCanvas(EXPORT_SCALE);
    
    const isStaggered = document.getElementById('staggerToggle').checked;
    document.getElementById('print-orientation').value = isStaggered ? 'portrait' : 'landscape';
    
    generatePaginationPreview();
}

function generatePaginationPreview() {
    let previewContainer = document.getElementById('multi-page-preview');
    previewContainer.innerHTML = '';
    
    const orientation = document.getElementById('print-orientation').value;
    const isLandscape = orientation === 'landscape';
    const printScale = parseInt(document.getElementById('print-scale-slider').value) / 100;
    
    const printW_mm = isLandscape ? 277 : 190; 
    const printH_mm = isLandscape ? 190 : 277; 
    const mmToPx = 3.7795 * EXPORT_SCALE;
    
    const targetPageW = (printW_mm * mmToPx) / printScale; 
    const targetPageH = (printH_mm * mmToPx) / printScale;

    const titleOffset = 80 * EXPORT_SCALE; 
    const nH = 160 * EXPORT_SCALE; 

    let minX = d3.min(nodePositions, p => p.x);
    let shiftX = Math.abs(Math.min(0, minX)) + nodeWidth;

    let nodeBounds = nodePositions.map(p => {
        let actualCanvasX = (p.x + shiftX) * EXPORT_SCALE;
        let actualCanvasY = (p.y * EXPORT_SCALE) + titleOffset;
        let nw = p.gender === 'F' ? 85 : 130;
        return {
            left: actualCanvasX - (nw/2 * EXPORT_SCALE),
            right: actualCanvasX + (nw/2 * EXPORT_SCALE),
            top: actualCanvasY,
            bottom: actualCanvasY + nH
        };
    });
    
    let masterW = generatedMasterCanvas.width;
    let masterH = generatedMasterCanvas.height;

    let pageX = []; let currX = 0;
    while(currX < masterW) {
        let nextX = currX + targetPageW;
        if(nextX >= masterW) { pageX.push({start: currX, end: masterW}); break; }
        let cutNodes = nodeBounds.filter(b => b.left < nextX && b.right > nextX);
        if(cutNodes.length > 0) {
            let minLeft = Math.min(...cutNodes.map(b => b.left));
            let maxRight = Math.max(...cutNodes.map(b => b.right));
            if (nextX - minLeft < maxRight - nextX) nextX = minLeft - (15 * EXPORT_SCALE);
            else nextX = maxRight + (15 * EXPORT_SCALE);
            if (nextX <= currX) nextX = maxRight + (15*EXPORT_SCALE);
        }
        pageX.push({start: currX, end: nextX}); currX = nextX;
    }

    let pageY = []; let currY = 0;
    while(currY < masterH) {
        let nextY = currY + targetPageH;
        if(nextY >= masterH) { pageY.push({start: currY, end: masterH}); break; }
        let cutNodes = nodeBounds.filter(b => b.top < nextY && b.bottom > nextY);
        if(cutNodes.length > 0) {
            let minTop = Math.min(...cutNodes.map(b => b.top));
            let maxBot = Math.max(...cutNodes.map(b => b.bottom));
            if (nextY - minTop < maxBot - nextY) nextY = minTop - (15 * EXPORT_SCALE);
            else nextY = maxBot + (15 * EXPORT_SCALE);
            if (nextY <= currY) nextY = maxBot + (15*EXPORT_SCALE);
        }
        pageY.push({start: currY, end: nextY}); currY = nextY;
    }

    let totalPages = pageY.length * pageX.length;
    
    let previewCanvas = document.createElement('canvas');
    let pScale = window.innerWidth > 600 ? 0.3 : 0.15;
    previewCanvas.width = masterW * pScale;
    previewCanvas.height = masterH * pScale;
    let ctx = previewCanvas.getContext('2d');
    ctx.drawImage(generatedMasterCanvas, 0, 0, previewCanvas.width, previewCanvas.height);
    
    ctx.strokeStyle = "rgba(231, 76, 60, 0.8)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    pageX.forEach(px => { ctx.beginPath(); ctx.moveTo(px.end * pScale, 0); ctx.lineTo(px.end * pScale, previewCanvas.height); ctx.stroke(); });
    pageY.forEach(py => { ctx.beginPath(); ctx.moveTo(0, py.end * pScale); ctx.lineTo(previewCanvas.width, py.end * pScale); ctx.stroke(); });

    let div = document.createElement('div');
    div.className = 'page-preview-box';
    div.innerHTML = `<div style="font-weight:bold; margin-bottom:5px; color:#183153;">Preview (${totalPages} Pages)</div>
                     <img src="${previewCanvas.toDataURL()}">`;
    previewContainer.appendChild(div);
    
    window.currentPdfSlices = { pageX, pageY, isLandscape, printW_mm, printH_mm, targetPageW, targetPageH };
    
    document.getElementById('export-loading').style.display = 'none';
    document.getElementById('export-controls').style.display = 'flex';
    document.getElementById('export-buttons-container').style.display = 'flex';
}

async function createExportCanvas(scaleValue) {
    const exportArea = document.getElementById('export-area');
    const clone = exportArea.cloneNode(true);
    clone.id = 'export-clone';
    clone.style.position = 'absolute';
    clone.style.top = '-9999px';
    clone.style.left = '0';
    
    let minX = d3.min(nodePositions, p => p.x);
    let maxX = d3.max(nodePositions, p => p.x);
    let maxY = d3.max(nodePositions, p => p.y);
    let padding = nodeWidth;
    
    let shiftX = Math.abs(Math.min(0, minX)) + padding; 
    let exportW = (maxX - Math.min(0, minX)) + padding * 3;
    let exportH = maxY + 300; 
    
    clone.style.width = `${exportW}px`;
    clone.style.height = `${exportH}px`; 
    clone.style.overflow = 'visible';
    clone.style.background = '#ffffff';

    clone.querySelectorAll('.btn-group, .drag-grip, .collapse-btn').forEach(btn => btn.remove());
    
    clone.querySelectorAll('.node-box').forEach(box => {
        let currentLeft = parseFloat(box.style.left);
        box.style.left = `${currentLeft + shiftX}px`; 
        box.style.background = '#ffffff';
        if(box.classList.contains('root')) box.style.background = '#f0f9ff';
        if(box.classList.contains('female')) box.style.background = '#fdf3e8'; 
    });

    const cloneTitle = clone.querySelector('h1');
    if(cloneTitle) {
        cloneTitle.style.display = 'block';
        cloneTitle.style.width = '100%';
        cloneTitle.style.textAlign = 'center';
        cloneTitle.style.fontSize = '32px';
        cloneTitle.style.margin = '20px 0';
        cloneTitle.style.color = '#183153';
    }

    const cloneVp = clone.querySelector('#tree-viewport');
    cloneVp.style.width = `${exportW}px`;
    cloneVp.style.height = `${exportH}px`;
    cloneVp.style.border = 'none';
    cloneVp.style.overflow = 'visible';
    cloneVp.style.background = 'white';

    const cloneZl = clone.querySelector('#zoom-layer');
    cloneZl.style.transform = 'none'; 
    cloneZl.style.left = `0px`;
    cloneZl.style.top = `40px`;
    cloneZl.style.position = `absolute`;
    
    const svg = clone.querySelector('#lines-svg');
    svg.setAttribute('width', exportW);
    svg.setAttribute('height', exportH);
    
    clone.querySelectorAll('.link').forEach(path => {
        let d = path.getAttribute('d');
        if(!d) return;
        let parts = d.trim().split(/\s+/); 
        let newD = parts.map(part => {
            if (part.startsWith('M')) {
                let coords = part.substring(1).split(',');
                return `M${parseFloat(coords[0]) + shiftX},${coords[1]}`;
            } else if (part.startsWith('H')) {
                return `H${parseFloat(part.substring(1)) + shiftX}`;
            }
            return part; 
        }).join(' ');
        path.setAttribute('d', newD);
    });

    document.body.appendChild(clone);
    const canvas = await window.html2canvas(clone, { backgroundColor: '#ffffff', scale: scaleValue, windowWidth: exportW, windowHeight: exportH });
    document.body.removeChild(clone);
    return canvas;
}

async function handleDownloadSingle(type) {
    try {
        let canvas = await createExportCanvas(2); 
        const imgData = canvas.toDataURL('image/png', 1.0); 

        if (type === 'pdf') {
            const { jsPDF } = window.jspdf;
            let pdfWidth = canvas.width * 0.264583; 
            let pdfHeight = canvas.height * 0.264583; 
            let orientation = pdfWidth > pdfHeight ? 'landscape' : 'portrait';
            
            const pdf = new jsPDF({ orientation: orientation, unit: 'mm', format: [pdfWidth, pdfHeight], compress: true });
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
            pdf.save(`Aryal_Family_Tree_Single.pdf`);
        } else {
            const link = document.createElement('a');
            link.download = `Aryal_Family_Tree_Single.png`;
            link.href = imgData;
            link.click();
        }
    } catch (error) {
        alert("निर्यात असफल भयो।");
    }
}

async function downloadMultiPagePDF() {
    if(!window.currentPdfSlices) return;
    
    const btnContainer = document.getElementById('export-buttons-container');
    const loadingText = document.getElementById('export-loading');
    
    btnContainer.style.display = 'none';
    document.getElementById('export-controls').style.display = 'none';
    document.getElementById('multi-page-preview').innerHTML = '';
    loadingText.innerText = "Generating PDF File... (कृपया पर्खनुहोस्)";
    loadingText.style.display = 'block';
    
    try {
        const canvas = generatedMasterCanvas; 
        const { pageX, pageY, isLandscape, printW_mm, printH_mm, targetPageW, targetPageH } = window.currentPdfSlices;
        
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4', compress: true });
        const a4Width = isLandscape ? 297 : 210; 
        const a4Height = isLandscape ? 210 : 297;
        const margin = 10;
        
        let pageNum = 0;
        for (let r = 0; r < pageY.length; r++) {
            for (let c = 0; c < pageX.length; c++) {
                if (pageNum > 0) pdf.addPage();
                
                let pX = pageX[c]; let pY = pageY[r];
                let w = pX.end - pX.start; let h = pY.end - pY.start;
                
                let sliceCanvas = document.createElement('canvas');
                sliceCanvas.width = w; sliceCanvas.height = h;
                let ctx = sliceCanvas.getContext('2d');
                ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h);
                ctx.drawImage(canvas, pX.start, pY.start, w, h, 0, 0, w, h);
                let dataUrl = sliceCanvas.toDataURL('image/png', 1.0);
                
                let finalW = (w / targetPageW) * printW_mm;
                let finalH = (h / targetPageH) * printH_mm;
                let x = margin + (printW_mm - finalW)/2; 
                let y = margin + (printH_mm - finalH)/2;
                
                pdf.addImage(dataUrl, 'PNG', x, y, finalW, finalH, undefined, 'FAST');
                
                pdf.setFontSize(9);
                pdf.setTextColor(150);
                if (r > 0) pdf.text(`^ Match to Page ${(r - 1) * pageX.length + c + 1} ^`, a4Width/2, margin - 3, {align: 'center'});
                if (r < pageY.length - 1) pdf.text(`v Match to Page ${(r + 1) * pageX.length + c + 1} v`, a4Width/2, a4Height - margin + 4, {align: 'center'});
                if (c > 0) pdf.text(`< Page ${r * pageX.length + c}`, margin - 3, a4Height/2, {angle: 90, align: 'center'});
                if (c < pageX.length - 1) pdf.text(`Page ${r * pageX.length + c + 2} >`, a4Width - margin + 4, a4Height/2, {angle: 90, align: 'center'});

                pdf.setFontSize(10);
                pdf.setTextColor(100);
                pdf.text(`Page ${pageNum + 1} of ${pageY.length * pageX.length}`, a4Width / 2, a4Height - 4, { align: 'center' });
                
                pageNum++;
            }
        }
        pdf.save('Aryal_Family_Tree_MultiPage.pdf');
        
    } catch (error) {
        alert("PDF निर्माण असफल भयो।");
    } finally {
        closeExportModal();
    }
}

async function executeNativePrint() {
    closeExportModal();
    const printContainer = document.getElementById('print-container');
    printContainer.innerHTML = "<h2 style='text-align:center;'>Preparing Print...</h2>";
    
    const canvas = await createExportCanvas(2);
    const imgData = canvas.toDataURL('image/png', 1.0); 
    
    printContainer.innerHTML = `
        <div class="single-print-page">
            <img src="${imgData}">
        </div>
    `;
    
    setTimeout(() => {
        window.print();
        setTimeout(() => { printContainer.innerHTML = ""; }, 1000);
    }, 500);
}

document.addEventListener('DOMContentLoaded', () => {
    loadDataFromSupabase();
});

// --- AUTHENTICATION LOGIC ---
let currentUser = null;
let isAdmin = false;
const ADMIN_EMAIL = 'support@kishoraryal.com.np'; 

// पेज लोड हुँदा युजर लगइन छ कि छैन जाँच्ने
supabaseClient.auth.getSession().then(({ data: { session } }) => {
    updateAuthState(session?.user);
});

// लगइन वा लगआउट हुँदा रियलटाइममा थाहा पाउने
supabaseClient.auth.onAuthStateChange((_event, session) => {
    updateAuthState(session?.user);
});

function updateAuthState(user) {
    currentUser = user;
    isAdmin = user && user.email === ADMIN_EMAIL;
    
    const authBtn = document.getElementById('authBtn');
    if (user) {
        authBtn.innerText = isAdmin ? '🛡️ एडमिन प्यानल' : '👤 ' + user.email.split('@')[0];
        // अहिलेलाई एडमिन र साधारण युजर दुवैलाई क्लिक गर्दा लगआउट सोध्ने बनाइएको छ (Step 5 मा प्यानल खोल्नेछौं)
        authBtn.onclick = () => { if(confirm('लगआउट गर्न चाहनुहुन्छ?')) handleLogout(); };
        authBtn.style.background = isAdmin ? '#f39c12' : '#e2e8f0';
        authBtn.style.color = isAdmin ? 'white' : '#2c3e50';
    } else {
        authBtn.innerText = 'लगइन / दर्ता';
        authBtn.onclick = openAuthModal;
        authBtn.style.background = '#f4f6fa';
        authBtn.style.color = '#2c3e50';
    }
}

function openAuthModal() {
    document.getElementById('auth-email').value = '';
    document.getElementById('auth-password').value = '';
    document.getElementById('auth-message').innerText = '';
    document.getElementById('auth-modal').style.display = 'block';
}

function closeAuthModal() {
    document.getElementById('auth-modal').style.display = 'none';
}

async function handleSignup() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const msg = document.getElementById('auth-message');
    msg.style.color = '#e74c3c';
    
    if (!email || password.length < 6) return msg.innerText = 'सही इमेल र कम्तीमा ६ अक्षरको पासवर्ड राख्नुहोस्।';
    
    msg.innerText = 'दर्ता हुँदैछ...';
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    
    if (error) {
        msg.innerText = error.message;
    } else {
        msg.style.color = '#27ae60';
        msg.innerText = 'दर्ता सफल! कृपया लगइन गर्नुहोस्। (वा इमेल भेरिफाई गर्नुहोस्)';
    }
}

async function handleLogin() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const msg = document.getElementById('auth-message');
    
    msg.style.color = '#e74c3c';
    msg.innerText = 'लगइन हुँदैछ...';
    
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        msg.innerText = "लगइन असफल: इमेल वा पासवर्ड मिलेन।";
    } else {
        closeAuthModal();
    }
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
}