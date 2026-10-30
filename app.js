// Supabase Setup
const SUPABASE_URL = 'https://dqvwyprvgglmwdbernpq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxdnd5cHJ2Z2dsbXdkYmVybnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNDg1ODUsImV4cCI6MjEwODkyNDU4NX0.E79qy5EeQsYAwkrt8WSnQvABxo4L8T_ZYbFnzvT4law';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Global Variables ---
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

let currentUser = null;
let isAdmin = false;
const ADMIN_EMAIL = 'support@kishoraryal.com.np';
let pendingProposals = [];

// --- Authentication Logic ---
supabaseClient.auth.getSession().then(({ data: { session } }) => {
    updateAuthState(session?.user);
});

supabaseClient.auth.onAuthStateChange((_event, session) => {
    updateAuthState(session?.user);
});

function updateAuthState(user) {
    currentUser = user;
    isAdmin = user && user.email === ADMIN_EMAIL;
    const authBtn = document.getElementById('authBtn');
    const emailSpan = document.getElementById('loggedInUserEmail');
    const notifBell = document.getElementById('notification-bell'); // नयाँ
    
    if (user) {
        notifBell.style.display = 'inline-block'; // लगइन हुँदा घण्टी देखाउने
        fetchNotifications(); // सूचनाहरू तान्ने
        
        authBtn.innerText = isAdmin ? '🛡️ एडमिन प्यानल' : 'लगआउट';
        authBtn.onclick = () => { isAdmin ? openAdminModal() : (confirm('लगआउट गर्न चाहनुहुन्छ?') && handleLogout()); };
        authBtn.style.background = isAdmin ? '#f39c12' : '#e74c3c';
        authBtn.style.color = 'white';
        
        let dName = user.user_metadata?.full_name || user.email.split('@')[0];
        emailSpan.innerHTML = `👤 <a href="#" onclick="openProfileModal(); return false;" style="color:#183153; text-decoration:underline;">${dName}</a>`;
        emailSpan.style.display = 'inline-block';
    } else {
        notifBell.style.display = 'none'; // लगआउट हुँदा घण्टी लुकाउने
        authBtn.innerText = 'लगइन / दर्ता';
        authBtn.onclick = openAuthModal;
        authBtn.style.background = '#f4f6fa';
        authBtn.style.color = '#2c3e50';
        emailSpan.innerHTML = '';
        emailSpan.style.display = 'none';
    }
}

function openAuthModal() {
    showLoginOnly();
    document.getElementById('auth-email').value = '';
    document.getElementById('auth-password').value = '';
    document.getElementById('auth-message').innerText = '';
    document.getElementById('auth-modal').style.display = 'block';
}

function showLoginOnly() {
    document.getElementById('signup-fields').style.display = 'none';
    document.getElementById('login-btn-main').style.display = 'block';
    document.getElementById('signup-btn-main').innerText = 'नयाँ दर्ता (Sign Up)';
    document.getElementById('back-to-login-btn').style.display = 'none';
    document.getElementById('auth-message').innerText = '';
}

function submitAuthForm(event) {
    event.preventDefault();
    const isSignup = document.getElementById('signup-fields').style.display === 'block';
    if (isSignup) handleSignup();
    else handleLogin();
}

async function handleSignup() {
    const signupFields = document.getElementById('signup-fields');
    const msg = document.getElementById('auth-message');
    
    if (signupFields.style.display === 'none') {
        signupFields.style.display = 'block';
        document.getElementById('login-btn-main').style.display = 'none';
        document.getElementById('signup-btn-main').innerText = 'पेस गर्नुहोस् (Submit)';
        document.getElementById('back-to-login-btn').style.display = 'block';
        return msg.innerText = 'कृपया दर्ता गर्न नाम र मोबाइल नम्बर पनि भर्नुहोस्।';
    }

    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const name = document.getElementById('auth-name').value.trim();
    const phone = document.getElementById('auth-phone').value.trim();
    
    msg.style.color = '#e74c3c';
    if (!email || password.length < 6 || !name || !phone) return msg.innerText = 'सबै विवरणहरू अनिवार्य रूपमा भर्नुहोस्।';
    
    msg.innerText = 'दर्ता हुँदैछ...';
    const { error } = await supabaseClient.auth.signUp({ 
        email, password, options: { data: { full_name: name, phone: phone } }
    });
    
    if (error) { 
        msg.innerText = error.message; 
    } else {
        msg.style.color = '#27ae60'; msg.innerText = 'दर्ता सफल! अब लगइन गर्नुहोस्।';
        setTimeout(showLoginOnly, 1500);
    }
}

async function handleLogin() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const msg = document.getElementById('auth-message');
    
    msg.style.color = '#e74c3c';
    msg.innerText = 'लगइन हुँदैछ...';
    
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        msg.innerText = "लगइन असफल: इमेल वा पासवर्ड मिलेन।";
    } else {
        closeAuthModal();
    }
}

async function handleLogout() {
    try {
        await supabaseClient.auth.signOut();
    } catch (error) {
        console.error("लगआउट गर्दा समस्या भयो:", error);
    }
    closeAdminModal();
    closeAuthModal();
    window.location.reload();
}

function openProfileModal() {
    if(!currentUser) return;
    document.getElementById('prof-name').value = currentUser.user_metadata?.full_name || '';
    document.getElementById('prof-phone').value = currentUser.user_metadata?.phone || '';
    document.getElementById('prof-message').innerText = '';
    document.getElementById('profile-modal').style.display = 'block';
}

async function saveProfile() {
    const name = document.getElementById('prof-name').value.trim();
    const phone = document.getElementById('prof-phone').value.trim();
    const msg = document.getElementById('prof-message');
    msg.style.color = '#3498db'; msg.innerText = 'सेभ हुँदैछ...';
    
    const { data, error } = await supabaseClient.auth.updateUser({ data: { full_name: name, phone: phone } });
    if(error) { 
        msg.style.color = '#e74c3c'; msg.innerText = error.message; 
    } else { 
        msg.style.color = '#27ae60'; msg.innerText = 'प्रोफाइल अपडेट भयो!';
        currentUser = data.user;
        updateAuthState(currentUser);
        setTimeout(closeProfileModal, 1000);
    }
}

// --- Data Fetching ---
async function loadDataFromSupabase() {
    try {
        const { data, error } = await supabaseClient.from('members').select('*');
        if (error) throw error;
        
        if (data && data.length > 0) {
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
            localStorage.setItem('aryalFamilyTreeDataV1_2', JSON.stringify(familyData));
        } else {
            const savedData = localStorage.getItem('aryalFamilyTreeDataV1_2');
            if (savedData) familyData = JSON.parse(savedData);
        }
    } catch (err) {
        console.error("Supabase Error Details:", err);
        const savedData = localStorage.getItem('aryalFamilyTreeDataV1_2');
        if (savedData) familyData = JSON.parse(savedData);
    }
    renderTree(true);
}

// --- Admin Workflow & Save Logic ---
async function saveNewNode() {
    if (!currentUser) return alert("कृपया नयाँ सदस्य थप्न सुरुमा लगइन गर्नुहोस्।");
    
    const name = document.getElementById('add-name').value.trim();
    const birthDate = document.getElementById('add-birth').value.trim();
    const deathDate = document.getElementById('add-death').value.trim();
    const parentIdVal = document.getElementById('add-parent').value;
    const gender = document.getElementById('add-gender').value;
    const motherName = document.getElementById('add-mother').value;
    const hierarchy = parseInt(document.getElementById('add-hierarchy').value);
    
    if (parentIdVal === "") return alert("कृपया पिता छान्नुहोस्।");
    const parentId = parentIdVal === "null" ? null : parseInt(parentIdVal);
    
    let newNode = { 
        id: nextId++, 
        name: name, 
        parent_id: parentId, 
        gender: gender, 
        spouses: [...tempAddSpouses], 
        hierarchy_order: hierarchy 
    };
    if(motherName !== "") newNode.mother_name = motherName;
    if(birthDate !== "") newNode.birth_date = birthDate;
    if(deathDate !== "") newNode.death_date = deathDate;
    
    if (isAdmin) {
        const { error } = await supabaseClient.from('members').insert([newNode]);
        if (error) return alert("त्रुटि: " + error.message);
        
        alert("नयाँ सदस्य सफलतापूर्वक थपियो!");
        closeAddModal();
        loadDataFromSupabase();
    } else {
        let proposalData = { ...newNode };
        proposalData._submitter_name = currentUser?.user_metadata?.full_name || '';
        proposalData._submitter_phone = currentUser?.user_metadata?.phone || '';
        proposalData._submitter_email = currentUser?.email || '';

        const { error } = await supabaseClient.from('member_proposals').insert([{
            change_type: 'CREATE',
            proposed_data: proposalData,
            submitted_by: currentUser.id,
            status: 'PENDING'
        }]);
        if (error) return alert("प्रस्ताव पठाउन त्रुटि: " + error.message);
        
        alert("तपाईंको प्रस्ताव एडमिनलाई पठाइयो। स्वीकृत भएपछि मात्र वंशावलीमा देखिनेछ।");
        closeAddModal();
    }
}

async function saveEdit() {
    if (!currentUser) return alert("कृपया सम्पादन गर्न सुरुमा लगइन गर्नुहोस्।");
    
    const id = parseInt(document.getElementById('edit-id').value);
    const name = document.getElementById('edit-name').value.trim();
    const birthDate = document.getElementById('edit-birth').value.trim();
    const deathDate = document.getElementById('edit-death').value.trim();
    const gender = document.getElementById('edit-gender').value;
    const hierarchy = parseInt(document.getElementById('edit-hierarchy').value);
    const parentVal = document.getElementById('edit-parent').value;
    const parentId = parentVal === "null" ? null : parseInt(parentVal);
    const motherVal = document.getElementById('edit-mother').value;
    
    let updateData = {
        name: name,
        gender: gender,
        hierarchy_order: hierarchy,
        parent_id: parentId,
        spouses: [...tempEditSpouses],
        mother_name: motherVal !== "" ? motherVal : null,
        birth_date: birthDate !== "" ? birthDate : null,
        death_date: deathDate !== "" ? deathDate : null
    };

    if (isAdmin) {
        const { error } = await supabaseClient.from('members').update(updateData).eq('id', id);
        if (error) return alert("त्रुटि: " + error.message);
        alert("विवरण सफलतापूर्वक सम्पादन भयो!");
        closeEditModal();
        loadDataFromSupabase();
    } else {
        updateData.id = id;
        updateData._submitter_name = currentUser?.user_metadata?.full_name || '';
        updateData._submitter_phone = currentUser?.user_metadata?.phone || '';
        updateData._submitter_email = currentUser?.email || '';

        const { error } = await supabaseClient.from('member_proposals').insert([{
            change_type: 'UPDATE',
            target_member_id: id,
            proposed_data: updateData,
            submitted_by: currentUser.id,
            status: 'PENDING'
        }]);
        if (error) return alert("त्रुटि: " + error.message);
        alert("तपाईंको सम्पादन प्रस्ताव एडमिनलाई पठाइयो।");
        closeEditModal();
    }
}

async function removeNode(id) {
    if (!currentUser) return alert("कृपया हटाउन सुरुमा लगइन गर्नुहोस्।");
    if(confirm("के तपाईं यो व्यक्ति र यसका सबै सन्तानहरूलाई सधैंको लागि हटाउन चाहनुहुन्छ?\n(चेतावनी: यो कार्य पछि फर्काउन सकिँदैन!)")) {
        let toRemove = new Set([id]);
        let changed = true;
        while (changed) {
            changed = false;
            familyData.forEach(d => {
                if (toRemove.has(d.parentId) && !toRemove.has(d.id)) { toRemove.add(d.id); changed = true; }
            });
        }
        
        if (isAdmin) {
            const idsToDelete = Array.from(toRemove);
            const { error } = await supabaseClient.from('members').delete().in('id', idsToDelete);
            if (error) return alert("हटाउन त्रुटि: " + error.message);
            alert("सदस्य र सन्तानहरू सफलतापूर्वक हटाइए!");
            loadDataFromSupabase();
        } else {
            let pData = { id: id, name: familyData.find(d=>d.id===id)?.name };
            pData._submitter_name = currentUser?.user_metadata?.full_name || '';
            pData._submitter_phone = currentUser?.user_metadata?.phone || '';
            pData._submitter_email = currentUser?.email || '';

            const { error } = await supabaseClient.from('member_proposals').insert([{
                change_type: 'DELETE',
                target_member_id: id,
                proposed_data: pData,
                submitted_by: currentUser.id,
                status: 'PENDING'
            }]);
            if (error) return alert("प्रस्ताव पठाउन त्रुटि: " + error.message);
            alert("हटाउने प्रस्ताव एडमिनलाई पठाइयो।");
        }
    }
}

// --- Notifications Logic ---
async function fetchNotifications() {
    if (!currentUser) return;
    const badge = document.getElementById('notif-badge');
    
    if (isAdmin) {
        // एडमिनको लागि: नयाँ प्रस्तावहरूको गन्ती गर्ने र घण्टीमा एडमिन प्यानल जोड्ने
        const { data, error } = await supabaseClient.from('member_proposals').select('id').eq('status', 'PENDING');
        if (error) return console.error(error);
        
        const pendingCount = data.length;
        if (pendingCount > 0) {
            badge.innerText = pendingCount;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
        // एडमिनले घण्टीमा क्लिक गर्दा सिधै Admin Panel खुल्ने
        document.getElementById('notification-bell').onclick = openAdminModal; 
    } else {
        // साधारण युजरको लागि: आफ्नै सूचनाहरू तान्ने
        const { data, error } = await supabaseClient.from('notifications')
            .select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
        
        if (error) return console.error(error);
        
        const unread = data.filter(n => !n.is_read).length;
        if (unread > 0) {
            badge.innerText = unread;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
        window.userNotifications = data; 
        document.getElementById('notification-bell').onclick = openNotifications;
    }
}

async function openNotifications() {
    document.getElementById('notif-modal').style.display = 'block';
    const list = document.getElementById('notif-list');
    const notifs = window.userNotifications || [];
    
    if (notifs.length === 0) return list.innerHTML = '<p style="text-align:center; color:#7f8c8d;">कुनै सूचना छैन।</p>';
    
    list.innerHTML = notifs.map(n => {
        // सूचनाको रंग सेट गर्ने (अस्वीकृत रातो, स्वीकृत हरियो)
        let bgColor = '#f0f9ff'; // डिफल्ट हल्का निलो
        if (n.message.includes('अस्वीकृत')) bgColor = '#fdeded'; // हल्का रातो
        else if (n.message.includes('स्वीकृत')) bgColor = '#e8f8f5'; // हल्का हरियो
        
        // पढिसकेपछि सेतो बनाउने
        if (n.is_read) bgColor = '#ffffff'; 
        
        let unreadDot = n.is_read ? '' : '<span style="color:#e74c3c; font-size:18px; line-height:0; margin-right:5px;">•</span>';
        
        return `
        <div style="padding:10px; margin-bottom:8px; border:1px solid #eee; border-radius:6px; background:${bgColor};">
            <p style="margin:0; font-size:13px; color:#2c3e50;">${unreadDot}${n.message}</p>
        </div>
        `;
    }).join('');
    
    // हेरिसकेपछि सबैलाई 'Read' बनाउने
    const unreadIds = notifs.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length > 0) {
        await supabaseClient.from('notifications').update({ is_read: true }).in('id', unreadIds);
        fetchNotifications(); 
    }
}

function closeNotifications() { document.getElementById('notif-modal').style.display = 'none'; }

// सबै सूचनाहरू सधैंको लागि मेटाउने फङ्सन
async function clearNotifications() {
    if (!currentUser) return;
    if (confirm("सबै सूचनाहरू स्थायी रूपमा हटाउन पक्का हुनुहुन्छ?")) {
        const { error } = await supabaseClient.from('notifications').delete().eq('user_id', currentUser.id);
        if (error) alert("त्रुटि: " + error.message);
        else {
            window.userNotifications = [];
            openNotifications(); // मोडल रिफ्रेस गर्ने
            fetchNotifications(); // घण्टीको गन्ती रिफ्रेस गर्ने
        }
    }
}

async function openAdminModal() {
    document.getElementById('admin-modal').style.display = 'block';
    const list = document.getElementById('proposals-list');
    list.innerHTML = 'लोड हुँदैछ...';
    
    const { data, error } = await supabaseClient.from('member_proposals').select('*').eq('status', 'PENDING');
    if (error) return list.innerHTML = 'त्रुटि: ' + error.message;
    
    pendingProposals = data || [];
    
    if (pendingProposals.length === 0) {
        list.innerHTML = `
            <p style="text-align:center; color:#7f8c8d; padding: 20px 0;">कुनै नयाँ प्रस्ताव छैन।</p>
            <button class="header-btn" onclick="handleLogout()" style="width:100%; margin-top:10px; background:#e74c3c; color:white;">लगआउट (Logout)</button>
        `;
        return;
    }
    
    let html = '';
    pendingProposals.forEach(p => {
        let d = p.proposed_data;
        let action = p.change_type === 'CREATE' ? 'नयाँ थप्ने' : (p.change_type === 'UPDATE' ? 'सम्पादन गर्ने' : 'हटाउने');
        let color = p.change_type === 'DELETE' ? '#e74c3c' : '#27ae60';
        
        let senderName = d._submitter_name || 'अज्ञात';
        let senderPhone = d._submitter_phone ? ` (📞 ${d._submitter_phone})` : '';
        let senderEmail = d._submitter_email ? ` [${d._submitter_email}]` : '';
        
        html += `<div style="border:1px solid #cbd5e1; padding:12px; margin-bottom:10px; border-radius:6px; background:#f8fafc; font-size:13px;">
            <div style="margin-bottom: 5px; color:${color};"><strong>प्रस्ताव:</strong> ${action}</div>
            <div style="margin-bottom: 5px;"><strong>सदस्यको नाम:</strong> ${d.name || '(नाम नखुलेको)'}</div>
            <div style="margin-bottom: 10px; color:#7f8c8d; font-size: 12px;"><strong>पठाउने:</strong> 👤 ${senderName}${senderPhone}${senderEmail}</div>
            <div style="display:flex; gap:10px;">
                <button class="header-btn" style="flex:1; background:#27ae60; color:white;" onclick="approveProposal(${p.id})">स्वीकृत ✔️</button>
                <button class="header-btn" style="flex:1; background:#e74c3c; color:white;" onclick="rejectProposal(${p.id})">अस्वीकृत ✕</button>
            </div>
        </div>`;
    });
    list.innerHTML = html;
}

async function approveProposal(proposalId) {
    const proposal = pendingProposals.find(p => p.id === proposalId);
    if (!proposal) return alert("प्रस्ताव भेटिएन!");
    
    const propData = { ...proposal.proposed_data };
    delete propData._submitter_name;
    delete propData._submitter_phone;
    delete propData._submitter_email;
    
    try {
        if (proposal.change_type === 'CREATE') {
            const { error } = await supabaseClient.from('members').insert([propData]);
            if (error) throw error;
        } else if (proposal.change_type === 'UPDATE') {
            const { error } = await supabaseClient.from('members').update(propData).eq('id', proposal.target_member_id);
            if (error) throw error;
        } else if (proposal.change_type === 'DELETE') {
            const { error } = await supabaseClient.from('members').delete().eq('id', proposal.target_member_id);
            if (error) throw error;
        }
        
        const { error: statusErr } = await supabaseClient.from('member_proposals').update({ status: 'APPROVED' }).eq('id', proposalId);
        if (statusErr) throw statusErr;
        
        // --- नयाँ: सूचना पठाउने ---
        let actionTxt = proposal.change_type === 'CREATE' ? 'नयाँ थप्ने' : (proposal.change_type === 'UPDATE' ? 'सम्पादन गर्ने' : 'हटाउने');
        let msg = `तपाईंको प्रस्ताव: ${actionTxt} (सदस्य: ${propData.name || 'नाम नखुलेको'}) स्वीकृत भयो।`;
        await supabaseClient.from('notifications').insert([{ user_id: proposal.submitted_by, message: msg }]);
        
        alert("प्रस्ताव स्वीकृत भयो! रूख अपडेट हुँदैछ...");
        openAdminModal();
        loadDataFromSupabase();
        fetchNotifications(); // <-- यो लाइन थप्नुहोस्
    } catch (err) {
        alert("स्वीकृत गर्दा त्रुटि: " + err.message);
    }
}

async function rejectProposal(proposalId) {
    if(!confirm("के तपाईं यो प्रस्ताव अस्वीकृत गर्न पक्का हुनुहुन्छ?")) return;
    const proposal = pendingProposals.find(p => p.id === proposalId);
    
    const { error } = await supabaseClient.from('member_proposals').update({ status: 'REJECTED' }).eq('id', proposalId);
    if (error) {
        alert("अस्वीकृत गर्दा त्रुटि: " + error.message);
    } else {
        if (proposal) {
            let actionTxt = proposal.change_type === 'CREATE' ? 'नयाँ थप्ने' : (proposal.change_type === 'UPDATE' ? 'सम्पादन गर्ने' : 'हटाउने');
            let msg = `तपाईंको प्रस्ताव: ${actionTxt} (सदस्य: ${proposal.proposed_data.name || 'नाम नखुलेको'}) अस्वीकृत भयो।`;
            await supabaseClient.from('notifications').insert([{ user_id: proposal.submitted_by, message: msg }]);
        }
        openAdminModal();
        fetchNotifications();
    }
}

// --- Closing Modals ---
function closeAuthModal() { const m = document.getElementById('auth-modal'); if(m) m.style.display = 'none'; }
function closeProfileModal() { const m = document.getElementById('profile-modal'); if(m) m.style.display = 'none'; }
function closeAdminModal() { const m = document.getElementById('admin-modal'); if(m) m.style.display = 'none'; }
function closeExportModal() { const m = document.getElementById('export-modal'); if(m) m.style.display = 'none'; }
function closeAddModal() { const m = document.getElementById('add-modal'); if(m) m.style.display = 'none'; }
function closeEditModal() { const m = document.getElementById('edit-modal'); if(m) m.style.display = 'none'; }

// --- Event Listeners (Esc Key) ---
document.addEventListener('keydown', function(event) {
    if (event.key === "Escape" || event.keyCode === 27) {
        try {
            // सबै मोडलहरू सुरक्षित तरिकाले बन्द गर्ने
            if(typeof closeExportModal === 'function') closeExportModal();
            if(typeof closeEditModal === 'function') closeEditModal();
            if(typeof closeAddModal === 'function') closeAddModal();
            if(typeof closeAuthModal === 'function') closeAuthModal();
            if(typeof closeAdminModal === 'function') closeAdminModal();
            if(typeof closeProfileModal === 'function') closeProfileModal();
            if(typeof closeNotifications === 'function') closeNotifications(); // सूचना मोडल बन्द गर्न
            
            // सदस्यको विवरण कार्ड बन्द गर्ने
            const detailsPanel = document.getElementById('details-panel');
            if (detailsPanel) detailsPanel.classList.remove('show');
            
            // सर्च बक्सको सजेसन लुकाउने
            const searchSugg = document.getElementById('searchSuggestions');
            if (searchSugg) searchSugg.style.display = 'none';
            
            // सर्च गर्दा हाइलाइट भएको बक्सलाई नर्मल बनाउने
            if (typeof d3 !== 'undefined') {
                d3.selectAll('.node-box').classed('search-highlight', false);
            }
        } catch (error) {
            console.error("Esc बटनबाट मोडल बन्द गर्दा सानो त्रुटि:", error);
        }
    }
});

document.addEventListener('click', function(e) {
    const suggestionsBox = document.getElementById('searchSuggestions');
    if (suggestionsBox && !e.target.closest('.search-container')) suggestionsBox.style.display = 'none';
    
    const panel = document.getElementById('details-panel');
    if (panel && panel.classList.contains('show') && !panel.contains(e.target) && !e.target.closest('.node-box')) {
        panel.classList.remove('show');
    }
});

// --- Utility Functions ---
function toDevanagariDigits(num) {
    const devDigits = ['०','१','२','३','४','५','६','७','८','९'];
    return num.toString().split('').map(d => devDigits[d] || d).join('');
}

const dev2romMap = {
    'क':'k','ख':'kh','ग':'g','घ':'gh','ङ':'ng','च':'ch','छ':'chh','ज':'j','झ':'jh','ञ':'ny',
    'ट':'t','ठ':'th','ड':'d','ढ':'dh','ण':'n','त':'t','थ':'th','द':'d','ध':'dh','न':'n',
    'प':'p','फ':'ph','ब':'b','भ':'bh','म':'m','य':'y','र':'r','ल':'l','व':'b','श':'sh','ष':'shh','स':'s','ह':'h',
    'क्ष':'ksh','त्र':'tr','ज्ञ':'jn','श्र':'shr','ॐ':'om','ऋ':'ri',
    'ा':'a','ि':'i','ी':'i','ु':'u','ू':'u','े':'e','ै':'ai','ो':'o','ौ':'au','ं':'am','ः':'ah','ृ':'ri','्':''
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

// --- Import/Export/Reset ---
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
                localStorage.setItem('aryalFamilyTreeDataV1_2', JSON.stringify(familyData));
                renderTree(true); 
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

// --- D3 Zoom & Camera ---
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

// --- Drag and Drop ---
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
function dropNode(e, targetId) { e.preventDefault(); }
function dragEnd(e) { 
    draggingNodeId = null;
    d3.selectAll('.node-box').style('opacity', 1);
    // Drag रिरअर्डरलाई डेटाबेसमा सेभ गर्न सकिन्छ, तर अहिलेलाई UI मै रिअर्डर हुन्छ
    renderTree();
}

// --- D3 Rendering ---
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

// --- Modals Add/Edit Forms ---
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


// --- Export (PDF/Print) Features ---
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

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    loadDataFromSupabase();
});