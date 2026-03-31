// Removed import statement for Supabase as we are using the global object from the CDN

const supabaseUrl = 'https://peqgqiyfpzypkjbchlco.supabase.co'; // Replace this with your actual Supabase project URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlcWdxaXlmcHp5cGtqYmNobGNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzkzMzkwMywiZXhwIjoyMDU5NTA5OTAzfQ.3UcoSGUXlDrMum3BnqYaN9Ud9HdNXos4NbfCiyiUAlk'; // Replace this with your actual Supabase anon key
// Initialize Supabase client if available (guard against CDN load failures)
// Use a different variable name (supabaseClient) to avoid colliding with the
// global `supabase` object installed by the SDK which can be non-configurable.
let supabaseClient = null;
try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
    } else {
        console.warn('Supabase client not available on window; continuing without Supabase.');
    }
} catch (e) {
    console.error('Failed to initialize Supabase client:', e);
    supabaseClient = null;
}

// A resilient wrapper for generating ID cards. Use this when the primary
// generateIDCard function is missing or throws unexpectedly.
async function generateIDCardSafe() {
    try {
        const name = (document.getElementById('name')?.value || '').trim();
        const dob = document.getElementById('dob')?.value || '';
        const bloodGroup = (document.getElementById('bloodGroup')?.value || '').trim() || '-';
        const cin = (document.getElementById('cin')?.value || '').trim();

        if (!name || !cin) {
            displayMessage('Please enter Name and CIN before generating the ID card.', true);
            return;
        }

        let photoUrl = '';
        const photoInput = document.getElementById('photo');
        if (photoInput && photoInput.files && photoInput.files[0]) {
            // read file as data URL
            photoUrl = await new Promise((resolve, reject) => {
                const fr = new FileReader();
                fr.onload = () => resolve(fr.result);
                fr.onerror = reject;
                fr.readAsDataURL(photoInput.files[0]);
            });
            const preview = document.getElementById('photoPreview');
            if (preview) preview.src = photoUrl;
        } else {
            const preview = document.getElementById('photoPreview');
            if (preview && preview.src) photoUrl = preview.src;
        }

        if (!photoUrl) {
            displayMessage('Please upload or provide a photo for the ID card.', true);
            return;
        }

        // Prefer the existing generateIDCard if available
        if (typeof generateIDCard === 'function') {
            try {
                return generateIDCard();
            } catch (err) {
                console.warn('generateIDCard threw, falling back to drawIDCard:', err);
            }
        }

        // Fallback: use drawIDCard directly
        drawIDCard(name, dob, bloodGroup, cin, photoUrl, function () {
            displayMessage('ID Card generated successfully (fallback).', false);
            const canvas = document.getElementById('idCardCanvas');
            if (canvas) canvas.style.display = 'block';
        });
    } catch (err) {
        console.error('generateIDCardSafe error:', err);
        displayMessage('An unexpected error occurred while generating the ID card.', true);
    }
}
window.generateIDCardSafe = generateIDCardSafe;

// Global error handlers to surface runtime issues
window.addEventListener('error', function (e) {
    console.error('Global error caught:', e.message, e.error || '');
    try { if (typeof showToast === 'function') showToast('An error occurred: ' + e.message, true); } catch (err) {}
});
window.addEventListener('unhandledrejection', function (e) {
    console.error('Unhandled promise rejection:', e.reason);
    try { if (typeof showToast === 'function') showToast('An error occurred: ' + (e.reason && e.reason.message ? e.reason.message : e.reason), true); } catch (err) {}
});

// Update a small status element in the UI to indicate if Supabase is available
function updateSupabaseStatus() {
    const el = document.getElementById('supabaseStatus');
    if (!el) return;
    if (supabaseClient) {
        el.textContent = 'Supabase: Connected';
        el.style.color = '#43a047'; // green
    } else {
        el.textContent = 'Supabase: Unavailable (offline mode)';
        el.style.color = '#d32f2f'; // red
        // Show a non-blocking toast once to inform the user
        try {
            if (!window.supabaseUnavailableNotified && typeof showToast === 'function') {
                showToast('Supabase is unavailable. The app will work in offline mode.', true);
                window.supabaseUnavailableNotified = true;
            }
        } catch (e) {
            // If showToast isn't available yet, ignore silently
            console.warn('showToast not available to show Supabase offline notification yet.');
        }
    }
}
window.updateSupabaseStatus = updateSupabaseStatus;

// Set default ISS and EXP dates on page load if inputs exist
function setDefaultDates() {
    try {
        const iss = document.getElementById('issDate');
        const exp = document.getElementById('expDate');
        if (!iss && !exp) return;
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const isoToday = `${yyyy}-${mm}-${dd}`;
        if (iss && !iss.value) iss.value = isoToday;
        if (exp && !exp.value) {
            const next = new Date(today);
            next.setFullYear(next.getFullYear() + 1);
            const y2 = next.getFullYear();
            const m2 = String(next.getMonth() + 1).padStart(2, '0');
            const d2 = String(next.getDate()).padStart(2, '0');
            exp.value = `${y2}-${m2}-${d2}`;
        }
    } catch (e) {
        console.warn('setDefaultDates error', e);
    }
}

window.addEventListener('DOMContentLoaded', setDefaultDates);

function initUiListeners() {
    try {
        const gen = document.getElementById('generateBtn');
        const down = document.getElementById('downloadBtn');
        const pr = document.getElementById('printBtn');
        if (gen) gen.addEventListener('click', function (e) { e.preventDefault(); if (typeof generateIDCardSafe === 'function') generateIDCardSafe(); else if (typeof generateIDCard === 'function') generateIDCard(); });
        if (down) {
            down.addEventListener('click', function (e) { e.preventDefault(); try { downloadIDCard(); } catch (err) { console.error(err); displayMessage('Download failed.', true); } });
            try { down.dataset.downloadBound = 'true'; } catch (e) { /* ignore if dataset unsupported */ }
        }
        if (pr) pr.addEventListener('click', function (e) { e.preventDefault(); try { printIDCard(); } catch (err) { console.error(err); displayMessage('Print failed.', true); } });
        
        // Watch CIN input: if it starts with FOP/ then clear and disable Expiry Date
        const cinInput = document.getElementById('cin');
        const expInput = document.getElementById('expDate');
        function checkCinForFop() {
            try {
                if (!cinInput || !expInput) return;
                const val = (cinInput.value || '').trim().toUpperCase();
                const hint = document.getElementById('expHint');
                if (val.startsWith('FOP/')) {
                    expInput.value = '';
                    expInput.disabled = true;
                    if (hint) hint.classList.add('visible');
                } else {
                    expInput.disabled = false;
                    if (hint) hint.classList.remove('visible');
                }
            } catch (e) { console.warn('checkCinForFop error', e); }
        }
        if (cinInput) {
            cinInput.addEventListener('input', checkCinForFop);
            cinInput.addEventListener('change', checkCinForFop);
            // run once to initialise state
            checkCinForFop();
        }
    } catch (e) {
        console.warn('initUiListeners error', e);
    }
}

window.addEventListener('DOMContentLoaded', initUiListeners);


function generateIDCard() {
    const name = document.getElementById('name').value;
    const dob = document.getElementById('dob').value;
    const bloodGroup = document.getElementById('bloodGroup').value;
    const cin = document.getElementById('cin').value;
    const photo = document.getElementById('photo').files[0];
    const photoUrlInput = document.getElementById('photoUrl');
    const photoUrlValue = photoUrlInput ? photoUrlInput.value : '';
    // Second photo
    // Removed second photo and URL logic

    if (!name || !dob || !bloodGroup || !cin || (!photo && !photoUrlValue)) {
        displayMessage('All fields are required to generate an ID card.', true);
        return;
    }

    // No second photo logic needed

    if (photo) {
        const reader = new FileReader();
        reader.onload = function (e) {
            drawIDCard(name, dob, bloodGroup, cin, e.target.result, function () {
                displayMessage('ID card generated successfully.', false);
            });
        };
        reader.onerror = function () {
            displayMessage('Failed to read the photo file.', true);
        };
        reader.readAsDataURL(photo);
    } else if (photoUrlValue) {
        drawIDCard(name, dob, bloodGroup, cin, photoUrlValue, function () {
            displayMessage('ID card generated successfully.', false);
        });
    }
}

function drawIDCard(name, dob, bloodGroup, cin, photoUrl, callback) {
    const canvas = document.getElementById('idCardCanvas');
    const ctx = canvas.getContext('2d');
    const template = new Image();

    // Use Template3.png for S-EQP, Template2.jpg for EQP, otherwise use template.jpg
    if (cin.includes('S-EQP')) {
        template.src = 'Template3.png';
    } else if (cin.includes('EQP')) {
        template.src = 'Template2.jpg';
    } else {
        template.src = 'template.jpg';
    }

    template.onload = function () {
        ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

        // Helper to load an image and call cb(img) or cb(null) on error
        function loadImage(src, cb) {
            if (!src) { cb(null); return; }
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = function () { cb(img); };
            img.onerror = function () { cb(null); };
            img.src = src;
        }

    // Load photo and then draw
    loadImage(photoUrl, function(img) {
        if (img) ctx.drawImage(img, 30, 70, 170, 190);
        // Draw text and QR
        ctx.font = 'bold 24px "Agency FB"';
        ctx.fillStyle = '#000';
        ctx.fillText(`${name.toUpperCase()}`, 290, 120);
        ctx.fillText(formatDate(dob), 370, 170);
        ctx.fillText(`${bloodGroup}`, 360, 210);
        ctx.fillText(`${cin}`, 270, 255);
        generateQRCode(cin, function(qrImage) {
            // Determine QR position and size based on CIN/template
            let qrX, qrY, qrW = 100, qrH = 100;
            if (cin.includes('S-EQP') || cin.includes('EQP')) {
                qrX = 30;
                qrY = canvas.height - 130;
            } else {
                qrX = 460;
                qrY = 290;
            }
            ctx.drawImage(qrImage, qrX, qrY, qrW, qrH);

            // Draw issuance date and optionally expiry above the QR code (use form inputs if present).
            try {
                const issInputVal = document.getElementById('issDate')?.value;
                const expElem = document.getElementById('expDate');
                const expInputVal = expElem ? expElem.value : null;
                let issued = issInputVal ? new Date(issInputVal) : new Date();

                const drawExp = !(cin.toUpperCase().startsWith('FOP/'));
                // If exp element exists but is disabled, do not draw expiry
                const expEnabled = expElem ? !expElem.disabled : false;

                // Compute texts
                const issText = 'ISS: ' + formatDate(issued.toISOString());
                let expText = '';
                if (drawExp) {
                    if (expInputVal) {
                        const expDate = new Date(expInputVal);
                        expText = 'EXP: ' + formatDate(expDate.toISOString());
                    } else {
                        const defaultExp = new Date(issued);
                        defaultExp.setFullYear(defaultExp.getFullYear() + 1);
                        expText = 'EXP: ' + formatDate(defaultExp.toISOString());
                    }
                }

                ctx.save();
                ctx.font = '12px Arial';
                ctx.fillStyle = '#000';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                const centerX = qrX + (qrW / 2);
                if (drawExp && expEnabled) {
                    const expY = qrY - 6;
                    const issY = expY - 16;
                    ctx.fillText(expText, centerX, expY);
                    ctx.fillText(issText, centerX, issY);
                } else {
                    const issY = qrY - 8;
                    ctx.fillText(issText, centerX, issY);
                }
                ctx.restore();
            } catch (e) {
                console.warn('Failed to draw ISS/EXP dates:', e);
            }
            if (callback) callback(canvas);
        });
    });
    };
}

function formatDate(dateString) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear().toString().slice();
    return `${day} ${month} ${year}`;
}

function generateQRCode(text, callback) {
    const qrContainer = document.createElement('div');
    qrContainer.style.display = 'none';
    document.body.appendChild(qrContainer);

    const qrCode = new QRCode(qrContainer, {
        text: text,
        width: 128,
        height: 128
    });

    setTimeout(() => {
        const qrCanvas = qrContainer.querySelector('canvas');
        const qrImage = new Image();
        qrImage.src = qrCanvas.toDataURL();
        qrImage.onload = function () {
            callback(qrImage);
            document.body.removeChild(qrContainer);
        };
    }, 500);
}

function downloadIDCard() {
    // Prevent re-entrant / duplicate downloads within short interval
    try {
        if (window._downloadIDCardLocked) {
            console.warn('downloadIDCard ignored: already in progress');
            return;
        }
        window._downloadIDCardLocked = true;
        setTimeout(() => { window._downloadIDCardLocked = false; }, 1500);
    } catch (e) { /* ignore */ }
    const canvas = document.getElementById('idCardCanvas');
    const cin = document.getElementById('cin').value || 'ID_Card';
    console.debug('downloadIDCard invoked for', cin);

    // Use the template's natural size for high-res download
    let template = new Image();
    if (cin.includes('S-EQP')) {
        template.src = 'Template3.png';
    } else if (cin.includes('EQP')) {
        template.src = 'Template2.jpg';
    } else {
        template.src = 'template.jpg';
    }

    template.onload = function () {
        // Create a canvas matching the template's natural size
        const highResCanvas = document.createElement('canvas');
        highResCanvas.width = template.naturalWidth;
        highResCanvas.height = template.naturalHeight;
        const ctx = highResCanvas.getContext('2d');

        // Scale factors for drawing from the on-screen canvas to the template size
        const scaleX = template.naturalWidth / canvas.width;
        const scaleY = template.naturalHeight / canvas.height;
        ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, highResCanvas.width, highResCanvas.height);

        const link = document.createElement('a');
        link.href = highResCanvas.toDataURL('image/png');
        link.download = `${cin}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
}


function printIDCard() {
    const canvas = document.getElementById('idCardCanvas');
    const dataUrl = canvas.toDataURL('image/png');
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<img src="${dataUrl}" style="width: 100%; max-width: 600px;">`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
}

async function generateBulkIDCards() {
    const bulkFileInput = document.getElementById('bulkFile');
    const file = bulkFileInput.files[0];

    if (!file) {
        displayMessage('Please upload an Excel file to generate bulk ID cards.', true);
        return;
    }

    const validExtensions = ['xlsx', 'xls'];
    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
        displayMessage('Invalid file format. Please upload a valid Excel file.', true);
        return;
    }

    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet);

            if (rows.length === 0) {
                displayMessage('The Excel file is empty.', true);
                return;
            }

            const zip = new JSZip();

            for (const row of rows) {
                if (!row.Name || !row['Date of Birth'] || !row['Blood Group'] || !row.CIN || !row['Photo URL']) {
                    displayMessage('Some rows in the Excel file are missing required fields.', true);
                    return;
                }

                await new Promise((resolve) => {
                    drawIDCard(row.Name, row['Date of Birth'], row['Blood Group'], row.CIN, row['Photo URL'], function (canvas) {
                        canvas.toBlob(function (blob) {
                            zip.file(`${row.Name}.png`, blob);
                            resolve();
                        });
                    });
                });
            }

            zip.generateAsync({ type: 'blob' }).then(function (content) {
                saveAs(content, 'IDCards.zip');
                displayMessage('Bulk ID cards generated and downloaded successfully.', false);
            });
        } catch (error) {
            displayMessage('An error occurred while processing the Excel file.', true);
        }
    };

    reader.onerror = function () {
        displayMessage('Failed to read the Excel file.', true);
    };

    reader.readAsArrayBuffer(file);
}

function displayMessage(message, isError = true) {
    const messageDiv = document.getElementById('message');
    messageDiv.style.color = isError ? 'red' : 'green';
    messageDiv.textContent = message;

    // Clear the message after 5 seconds
    setTimeout(() => {
        messageDiv.textContent = '';
    }, 5000);
}

async function searchEnrollee() {
    const cin = document.getElementById('cin').value.trim(); // Trim whitespace

    if (!cin) {
        displayMessage('Please enter CIN to search.', true);
        return;
    }

    try {
        // Try card_enrollees first
        let { data, error } = await supabaseClient
            .from('card_enrollees')
            .select('*')
            .eq('cin', cin);

        let enrollee = null;
        let foundTable = '';
        if (error) {
            displayMessage('Error fetching enrollee details from card_enrollees.', true);
            console.error(error);
            return;
        }
        if (data && data.length > 0) {
            enrollee = data[0];
            foundTable = 'card_enrollees';
        } else {
            // Try new_enrollees if not found
            let { data: data2, error: error2 } = await supabaseClient
                .from('new_enrollees')
                .select('*')
                .eq('cin', cin);
            if (error2) {
                displayMessage('Error fetching enrollee details from new_enrollees.', true);
                console.error(error2);
                return;
            }
            if (data2 && data2.length > 0) {
                enrollee = data2[0];
                foundTable = 'new_enrollees';
            } else {
                // Try card_enrollees_new if not found
                let { data: data3, error: error3 } = await supabaseClient
                    .from('card_enrollees_new')
                    .select('*')
                    .eq('cin', cin);
                if (error3) {
                    displayMessage('Error fetching enrollee details from card_enrollees_new.', true);
                    console.error(error3);
                    return;
                }
                if (data3 && data3.length > 0) {
                    enrollee = data3[0];
                    foundTable = 'card_enrollees_new';
                } else {
                    displayMessage('No enrollee found with the provided CIN.', true);
                    return;
                }
            }
        }

        // Log individual name components for debugging
        let surname = enrollee.surname || enrollee["Last Name"] || '';
        let firstname = enrollee.first_name || enrollee["First Name"] || '';
        let middleName = enrollee.middle_name || enrollee["Middle Name"] || '';
        // Fallbacks for new_enrollees table field names
        if (!surname && enrollee.lastname) surname = enrollee.lastname;
        if (!firstname && enrollee.firstname) firstname = enrollee.firstname;
        if (!middleName && enrollee.middlename) middleName = enrollee.middlename;
        // Name components extracted

        // Format full name as 'Surname (Middle Initial if long) Firstname'
        if (middleName.length > 1) {
            middleName = `${middleName.charAt(0)}.`; // Abbreviate middle name if long
        }
        const fullName = `${surname} ${middleName} ${firstname}`.trim();
        // Support DOB from dependants2 as well
        let dob = enrollee.dob || enrollee.date_of_birth || enrollee.dobirth || enrollee["Birth Date"] || '';
        document.getElementById('name').value = fullName;
        document.getElementById('dob').value = dob;
        document.getElementById('bloodGroup').value = enrollee.blood_group || enrollee.bloodgroup || enrollee["Blood Group"] || '-';
        document.getElementById('cin').value = enrollee.cin || enrollee["Enrollee ID"] || '';
        // First photo
        if (enrollee.photo_url) {
            var photoPreview = document.getElementById('photoPreview');
            var photoUrlInput = document.getElementById('photoUrl');
            if (photoPreview) {
                photoPreview.src = enrollee.photo_url;
                if (/photos\.app\.goo\.gl/.test(enrollee.photo_url)) {
                    displayMessage('Google Photos sharing links will NOT display. Please provide a direct image link (should start with https://lh3.googleusercontent.com/).', true);
                }
            }
            if (photoUrlInput) {
                photoUrlInput.value = enrollee.photo_url;
            }
        }
        // Removed second photo logic
        displayMessage('Enrollee details populated successfully from ' + foundTable + '.', false);
    } catch (err) {
        displayMessage('An unexpected error occurred. Please try again.', true);
        console.error(err);
    }
}

// ================= Dependent ID Card Printing Logic =================

async function searchDependents() {
    const principalInputElem = document.getElementById('principalSearch');
    if (!principalInputElem) {
        alert('principalSearch input not found in HTML.');
        return;
    }
    const principalInput = principalInputElem.value.trim();
    if (!principalInput) {
        alert('Please enter Principal CIN or Phone.');
        showDependentsMessage('Please enter Principal CIN or Phone.', true);
        return;
    }

    let principalDataList = [];
    let principalCINs = [];
    let foundPrincipal = false;
    let data, error;
    // Try card_enrollees by cin (no phone column)
    try {
            ({ data, error } = await supabaseClient
            .from('card_enrollees')
            .select('*')
            .eq('cin', principalInput));
    } catch (e) {
        alert('Supabase connection or query failed.');
        showDependentsMessage('Supabase connection or query failed.', true);
        return;
    }
    if (!error && data && data.length > 0) {
        principalDataList = data;
        principalCINs = data.map(d => d.cin);
        foundPrincipal = true;
    }
    // Try new_enrollees by cin or phone or phone_number
    if (!foundPrincipal || principalCINs.length === 0) {
        let data2, error2;
        try {
            ({ data: data2, error: error2 } = await supabaseClient
                .from('new_enrollees')
                .select('*')
                .or(`cin.eq.${principalInput},phone.eq.${principalInput},phone_number.eq.${principalInput}`));
        } catch (e) {
            alert('Supabase connection or query failed (new_enrollees).');
            showDependentsMessage('Supabase connection or query failed (new_enrollees).', true);
            return;
        }
        if (!error2 && data2 && data2.length > 0) {
            principalDataList = principalDataList.concat(data2);
            principalCINs = principalCINs.concat(data2.map(d => d.cin));
            foundPrincipal = true;
        }
    }
    // Try card_enrollees_new by cin or phone or phone_number
    if (!foundPrincipal || principalCINs.length === 0) {
        let data4, error4;
        try {
            ({ data: data4, error: error4 } = await supabaseClient
                .from('card_enrollees_new')
                .select('*')
                .or(`cin.eq.${principalInput},phone.eq.${principalInput},phone_number.eq.${principalInput}`));
        } catch (e) {
            alert('Supabase connection or query failed (card_enrollees_new).');
            showDependentsMessage('Supabase connection or query failed (card_enrollees_new).', true);
            return;
        }
        if (!error4 && data4 && data4.length > 0) {
            principalDataList = principalDataList.concat(data4);
            principalCINs = principalCINs.concat(data4.map(d => d.cin));
            foundPrincipal = true;
        }
    }
    // Try dependants2 by Enrollee ID or phone
    if (!foundPrincipal || principalCINs.length === 0) {
        let data3, error3;
        try {
            ({ data: data3, error: error3 } = await supabaseClient
                .from('dependants2')
                .select('*')
                .or(`Enrollee ID.eq.${principalInput},Phone Number.eq.${principalInput}`));
        } catch (e) {
            alert('Supabase connection or query failed (dependants2 principal).');
            showDependentsMessage('Supabase connection or query failed (dependants2 principal).', true);
            return;
        }
        if (!error3 && data3 && data3.length > 0) {
            principalDataList = principalDataList.concat(data3);
            principalCINs = principalCINs.concat(data3.map(d => d["Enrollee ID"]));
            foundPrincipal = true;
        }
    }
    // If input matches a dependent CIN format, search dependants2 by Enrollee ID directly
    if (/^[A-Z]+\/[A-Z]+\/\d+\/\d+$/.test(principalInput)) {
        let depData, depError;
        try {
            ({ data: depData, error: depError } = await supabaseClient
                .from('dependants2')
                .select('*')
                .eq('Enrollee ID', principalInput));
        } catch (e) {
            alert('Supabase connection or query failed (dependants2 by CIN).');
            showDependentsMessage('Supabase connection or query failed (dependants2 by CIN).', true);
            return;
        }
        if (!depError && depData && depData.length > 0) {
            // Show only this dependent
            principalDataList = [];
            principalCINs = [];
            allDependents = depData;
            dependentsSection.style.display = 'block';
            printAllBtn.style.display = 'inline-block';
            dependentsGrid.innerHTML = '';
            // ...existing code for displaying dependents...
            // Use the same forEach logic as below to display editable card
            allDependents.forEach((dep, idx) => {
                let surname = dep["Last Name"] || '';
                let firstname = dep["First Name"] || '';
                let middleName = dep["Middle Name"] || '';
                let gender = dep["Gender"] || '';
                let dob = dep["Birth Date"] || '';
                let bloodGroup = dep["Blood Group"] || '';
                let enrolleeId = dep["Enrollee ID"] || '';
                if (middleName.length > 1) middleName = `${middleName.charAt(0)}.`;
                const fullName = `${surname} ${middleName} ${firstname}`.trim();
                const photoUrl = dep.photo_url || '';
                const depCard = document.createElement('div');
                depCard.className = 'dependent-card';
                depCard.style.border = '1px solid #ccc';
                depCard.style.padding = '10px';
                depCard.style.background = '#fafbfc';
                depCard.innerHTML = `
                    <img id="depPhotoPreview_${enrolleeId}" src="${photoUrl}" alt="Photo" style="max-width:80px;max-height:80px;display:block;margin:auto;">
                    <input type="file" accept="image/*" style="margin-top:5px;" onchange="handleDependentPhotoChange('${enrolleeId}', this)">
                    <div style="font-weight:bold;margin-top:5px;">
                        <input type="text" id="depSurname_${enrolleeId}" value="${surname}" placeholder="Surname" style="width:90px;"> 
                        <input type="text" id="depMiddleName_${enrolleeId}" value="${middleName}" placeholder="Middle" style="width:40px;"> 
                        <input type="text" id="depFirstname_${enrolleeId}" value="${firstname}" placeholder="Firstname" style="width:90px;">
                    </div>
                    <div style="font-size:13px;">ID: ${enrolleeId}</div>
                    <div style="font-size:13px;">DOB: <input type="date" id="depDOB_${enrolleeId}" value="${dob}" style="width:120px;"></div>
                    <div style="font-size:13px;">Blood Group: <input type="text" id="depBlood_${enrolleeId}" value="${bloodGroup}" style="width:60px;"></div>
                    <div style="font-size:13px;">Gender: <input type="text" id="depGender_${enrolleeId}" value="${gender}" style="width:60px;"></div>
                    <div style="font-size:13px;">Relation: Dependent</div>
                    <button type="button" onclick='window.downloadDependentIDCard(${JSON.stringify(dep).replace(/'/g, "&#39;")}, "${enrolleeId}")'>Download</button>
                `;
                dependentsGrid.appendChild(depCard);
            });
            return;
        }
    }
    if (!foundPrincipal || principalCINs.length === 0) {
        alert('Principal not found.');
        showDependentsMessage('Principal not found.', true);
        return;
    }

    // Remove duplicates for principalCINs and principalDataList
    principalCINs = [...new Set(principalCINs.filter(Boolean))];
    principalDataList = principalDataList.filter((v,i,a) => v && principalCINs.includes(v.cin || v["Enrollee ID"]) && a.findIndex(t => (t.cin||t["Enrollee ID"]) === (v.cin||v["Enrollee ID"])) === i);

    // Show all principal names found (no duplicates)
    const dependentsSection = document.getElementById('dependentsSection');
    const dependentsGrid = document.getElementById('dependentsGrid');
    const printAllBtn = document.getElementById('printAllDependentsBtn');
    // Add bulk download button if not present
    let bulkZipBtn = document.getElementById('bulkZipDependentsBtn');
    if (!bulkZipBtn) {
        bulkZipBtn = document.createElement('button');
        bulkZipBtn.id = 'bulkZipDependentsBtn';
        bulkZipBtn.textContent = 'Bulk Download as ZIP';
        bulkZipBtn.style.marginLeft = '10px';
        bulkZipBtn.style.display = 'none';
        bulkZipBtn.onclick = bulkDownloadDependentsZip;
        printAllBtn.parentNode.insertBefore(bulkZipBtn, printAllBtn.nextSibling);
    }
    dependentsGrid.innerHTML = '';
    // Remove duplicate names for display
    const principalNames = principalDataList.map(p => (p.surname || p.lastname || p["Last Name"] || '') + ' ' + (p.first_name || p.firstname || p["First Name"] || '')).filter((v,i,a) => v && a.indexOf(v) === i);
    dependentsGrid.innerHTML += `<div style="grid-column:1/-1;padding:10px 0 18px 0;font-weight:bold;font-size:1.1rem;color:#1a237e;">Principals Found:<br>${principalNames.join('<br>')}</div>`;

    // For each principalCIN, search dependents
    let allDependents = [];
    for (const principalCIN of principalCINs) {
        let dependents, depError;
        try {
            ({ data: dependents, error: depError } = await supabaseClient
                .from('dependants2')
                .select('*')
                .ilike('Enrollee ID', `${principalCIN}/%`));
        } catch (e) {
            alert('Supabase connection or query failed (dependants2).');
            showDependentsMessage('Supabase connection or query failed (dependants2).', true);
            return;
        }
        if (depError) {
            alert('Error searching dependents: ' + depError.message);
            showDependentsMessage('Error searching dependents.', true);
            return;
        }
        if (dependents && dependents.length > 0) {
            allDependents = allDependents.concat(dependents);
        }
    }
    // Remove duplicate dependents by Enrollee ID
    allDependents = allDependents.filter((v,i,a) => v && v["Enrollee ID"] && a.findIndex(t => t["Enrollee ID"] === v["Enrollee ID"]) === i);
    if (allDependents.length === 0) {
        dependentsSection.style.display = 'block';
        printAllBtn.style.display = 'none';
        bulkZipBtn.style.display = 'none';
        showDependentsMessage('No dependents found for this principal/phone.', true);
        return;
    }
    dependentsSection.style.display = 'block';
    printAllBtn.style.display = 'inline-block';
    bulkZipBtn.style.display = 'inline-block';

    if (!window.dependentPhotoFiles) window.dependentPhotoFiles = {};
    allDependents.forEach((dep, idx) => {
        let surname = dep["Last Name"] || '';
        let firstname = dep["First Name"] || '';
        let middleName = dep["Middle Name"] || '';
        let gender = dep["Gender"] || '';
        let dob = dep["Birth Date"] || '';
        let bloodGroup = dep["Blood Group"] || '';
        let enrolleeId = dep["Enrollee ID"] || '';
        if (middleName.length > 1) middleName = `${middleName.charAt(0)}.`;
        const fullName = `${surname} ${middleName} ${firstname}`.trim();
        const photoUrl = dep.photo_url || '';
        const depCard = document.createElement('div');
        depCard.className = 'dependent-card';
        depCard.style.border = '1px solid #ccc';
        depCard.style.padding = '10px';
        depCard.style.background = '#fafbfc';
        depCard.innerHTML = `
            <img id="depPhotoPreview_${enrolleeId}" src="${photoUrl}" alt="Photo" style="max-width:80px;max-height:80px;display:block;margin:auto;">
            <input type="file" accept="image/*" style="margin-top:5px;" onchange="handleDependentPhotoChange('${enrolleeId}', this)">
            <div style="font-weight:bold;margin-top:5px;">
                <input type="text" id="depSurname_${enrolleeId}" value="${surname}" placeholder="Surname" style="width:90px;"> 
                <input type="text" id="depMiddleName_${enrolleeId}" value="${middleName}" placeholder="Middle" style="width:40px;"> 
                <input type="text" id="depFirstname_${enrolleeId}" value="${firstname}" placeholder="Firstname" style="width:90px;">
            </div>
            <div style="font-size:13px;">ID: ${enrolleeId}</div>
            <div style="font-size:13px;">DOB: <input type="date" id="depDOB_${enrolleeId}" value="${dob}" style="width:120px;"></div>
            <div style="font-size:13px;">Blood Group: <input type="text" id="depBlood_${enrolleeId}" value="${bloodGroup}" style="width:60px;"></div>
            <div style="font-size:13px;">Gender: <input type="text" id="depGender_${enrolleeId}" value="${gender}" style="width:60px;"></div>
            <div style="font-size:13px;">Relation: Dependent</div>
            <button type="button" onclick='window.downloadDependentIDCard(${JSON.stringify(dep).replace(/'/g, "&#39;")}, "${enrolleeId}")'>Download</button>
        `;
        dependentsGrid.appendChild(depCard);
    });

    // Expose downloadDependentIDCard globally for inline onclick
    window.downloadDependentIDCard = function(dep, enrolleeId) {
        if (typeof dep === 'string') dep = JSON.parse(dep.replace(/&#39;/g, "'"));
        // Get edited values
        let surname = document.getElementById(`depSurname_${enrolleeId}`)?.value || dep["Last Name"] || '';
        let firstname = document.getElementById(`depFirstname_${enrolleeId}`)?.value || dep["First Name"] || '';
        let middleName = document.getElementById(`depMiddleName_${enrolleeId}`)?.value || dep["Middle Name"] || '';
        if (middleName.length > 1) middleName = `${middleName.charAt(0)}.`;
        const fullName = `${surname} ${middleName} ${firstname}`.trim();
        const dob = document.getElementById(`depDOB_${enrolleeId}`)?.value || dep["Birth Date"] || '';
        const bloodGroup = document.getElementById(`depBlood_${enrolleeId}`)?.value || dep["Blood Group"] || '-';
        const cin = dep["Enrollee ID"] || '';
        let photoUrl = dep.photo_url || '';
        if (window.dependentPhotoFiles && window.dependentPhotoFiles[cin]) {
            const file = window.dependentPhotoFiles[cin];
            const reader = new FileReader();
            reader.onload = function (evt) {
                _downloadDependentCard(fullName, dob, bloodGroup, cin, evt.target.result);
            };
            reader.readAsDataURL(file);
            return;
        }
        _downloadDependentCard(fullName, dob, bloodGroup, cin, photoUrl);
    }

    function showDependentsMessage(message, isError = true) {
        let msgDiv = document.getElementById('dependentsMessage');
        if (!msgDiv) {
            const dependentsSection = document.getElementById('dependentsSection');
            msgDiv = document.createElement('div');
            msgDiv.id = 'dependentsMessage';
            msgDiv.style.margin = '10px 0 10px 0';
            msgDiv.style.fontWeight = 'bold';
            dependentsSection.insertBefore(msgDiv, dependentsSection.firstChild.nextSibling);
        }
        msgDiv.style.color = isError ? 'red' : 'green';
        msgDiv.textContent = message;
        setTimeout(() => { if (msgDiv) msgDiv.textContent = ''; }, 5000);
    }

    window.handleDependentPhotoChange = function(enrolleeId, input) {
        if (!input.files || !input.files[0]) return;
        const file = input.files[0];
        window.dependentPhotoFiles[enrolleeId] = file;
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.getElementById(`depPhotoPreview_${enrolleeId}`);
            if (img) img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };
}

function _downloadDependentCard(fullName, dob, bloodGroup, cin, photoUrl) {
    // Prevent duplicate dependent download calls
    try {
        if (!window._dependentDownloadLocks) window._dependentDownloadLocks = {};
        if (window._dependentDownloadLocks[cin]) {
            console.warn('_downloadDependentCard ignored: already downloading', cin);
            return;
        }
        window._dependentDownloadLocks[cin] = true;
        setTimeout(() => { try { delete window._dependentDownloadLocks[cin]; } catch (_) {} }, 1500);
    } catch (e) { /* ignore */ }
    const canvas = document.getElementById('dependentIdCardCanvas');
    const template = new Image();
    template.src = 'template.jpg';
    template.onload = function () {
        // Create a high-res canvas matching the template's natural size
        const highResCanvas = document.createElement('canvas');
        highResCanvas.width = template.naturalWidth || 800;
        highResCanvas.height = template.naturalHeight || 400;
        const highResCtx = highResCanvas.getContext('2d');
        // Draw template
        highResCtx.drawImage(template, 0, 0, highResCanvas.width, highResCanvas.height);
        // Load photo and draw at scaled position
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function () {
            // Scale positions and sizes from on-screen canvas to high-res
            const scaleX = highResCanvas.width / canvas.width;
            const scaleY = highResCanvas.height / canvas.height;
            highResCtx.drawImage(img, 30 * scaleX, 70 * scaleY, 170 * scaleX, 190 * scaleY);
            highResCtx.font = `bold ${24 * scaleY}px 'Agency FB'`;
            highResCtx.fillStyle = '#000';
            highResCtx.fillText(fullName.toUpperCase(), 290 * scaleX, 120 * scaleY);
            highResCtx.fillText(formatDate(dob), 370 * scaleX, 170 * scaleY);
            highResCtx.fillText(bloodGroup, 360 * scaleX, 210 * scaleY);
            highResCtx.fillText(cin, 270 * scaleX, 255 * scaleY);
            highResCtx.save();
            highResCtx.font = `bold ${32 * scaleY}px Arial`;
            highResCtx.fillStyle = '#d32f2f';
            highResCtx.rotate(-0.1);
            highResCtx.fillText('DEPENDENT', 400 * scaleX, 60 * scaleY);
            highResCtx.restore();
            generateQRCode(cin, function(qrImage) {
                // Compute properly-scaled QR position/size for high-res canvas
                const qrXhr = 460 * scaleX;
                const qrYhr = 290 * scaleY;
                const qrWhr = 100 * scaleX;
                const qrHhr = 100 * scaleY;
                highResCtx.drawImage(qrImage, qrXhr, qrYhr, qrWhr, qrHhr);

                // Draw issuance date and optionally expiry on the high-res card above the QR
                try {
                    const issInputVal = document.getElementById('issDate')?.value;
                    const expElem = document.getElementById('expDate');
                    const expInputVal = expElem ? expElem.value : null;
                    let issued = issInputVal ? new Date(issInputVal) : new Date();

                    const drawExp = !(cin.toUpperCase().startsWith('FOP/'));
                    const expEnabled = expElem ? !expElem.disabled : false;

                    const issText = 'ISS: ' + formatDate(issued.toISOString());
                    let expText = '';
                    if (drawExp) {
                        if (expInputVal) {
                            const expDate = new Date(expInputVal);
                            expText = 'EXP: ' + formatDate(expDate.toISOString());
                        } else {
                            const defaultExp = new Date(issued);
                            defaultExp.setFullYear(defaultExp.getFullYear() + 1);
                            expText = 'EXP: ' + formatDate(defaultExp.toISOString());
                        }
                    }

                    highResCtx.save();
                    highResCtx.font = `${12 * scaleY}px Arial`;
                    highResCtx.fillStyle = '#000';
                    highResCtx.textAlign = 'center';
                    highResCtx.textBaseline = 'bottom';
                    const centerX = qrXhr + (qrWhr / 2);
                    if (drawExp && expEnabled) {
                        const expY = qrYhr - (6 * scaleY);
                        const issY = expY - (16 * scaleY);
                        highResCtx.fillText(expText, centerX, expY);
                        highResCtx.fillText(issText, centerX, issY);
                    } else {
                        const issY = qrYhr - (8 * scaleY);
                        highResCtx.fillText(issText, centerX, issY);
                    }
                    highResCtx.restore();
                } catch (e) {
                    console.warn('Failed to draw high-res ISS/EXP:', e);
                }
                // Download as PNG using CIN as filename
                const dataUrl = highResCanvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = `${cin || 'Dependent_ID'}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                console.debug('_downloadDependentCard completed for', cin);
            });
        };
        img.onerror = function () {
            displayMessage('Failed to load dependent photo.', true);
        };
        img.src = photoUrl;
    };
}

function printAllDependents() {
    const dependentsGrid = document.getElementById('dependentsGrid');
    const depCards = dependentsGrid.querySelectorAll('.dependent-card');
    let dependents = [];
    depCards.forEach(card => {
        // Extract dep info from button's onclick
        const btn = card.querySelector('button');
        if (btn && btn.getAttribute('onclick')) {
            let depStr = btn.getAttribute('onclick').match(/downloadDependentIDCard\((.*)\)/);
            if (depStr && depStr[1]) {
                let depObj = depStr[1].replace(/&#39;/g, "'");
                dependents.push(depObj);
            }
        }
    });
    // Download all dependents one by one
    let idx = 0;
    function downloadNext() {
        if (idx >= dependents.length) return;
        window.downloadDependentIDCard(dependents[idx]);
        idx++;
        setTimeout(downloadNext, 1200); // Wait for download to trigger
    }
    downloadNext();
}

async function bulkDownloadDependentsZip() {
    const dependentsGrid = document.getElementById('dependentsGrid');
    const depCards = dependentsGrid.querySelectorAll('.dependent-card');
    let dependents = [];
    depCards.forEach(card => {
        const btn = card.querySelector('button');
        if (btn && btn.getAttribute('onclick')) {
            let depStr = btn.getAttribute('onclick').match(/downloadDependentIDCard\((.*)\)/);
            if (depStr && depStr[1]) {
                let depObj = depStr[1].replace(/&#39;/g, "'");
                dependents.push(depObj);
            }
        }
    });
    if (dependents.length === 0) {
        displayMessage('No dependents to download.', true);
        return;
    }
    const zip = new JSZip();
    for (let i = 0; i < dependents.length; i++) {
        let dep = dependents[i];
        if (typeof dep === 'string') dep = JSON.parse(dep.replace(/&#39;/g, "'"));
        let surname = dep["Last Name"] || '';
        let firstname = dep["First Name"] || '';
        let middleName = dep["Middle Name"] || '';
        if (middleName.length > 1) middleName = `${middleName.charAt(0)}.`;
        const fullName = `${surname} ${middleName} ${firstname}`.trim();
        const dob = dep["Birth Date"] || '';
        const bloodGroup = dep["Blood Group"] || '-';
        const cin = dep["Enrollee ID"] || '';
        let photoUrl = dep.photo_url || '';
        if (window.dependentPhotoFiles && window.dependentPhotoFiles[cin]) {
            photoUrl = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(window.dependentPhotoFiles[cin]);
            });
        }
        await new Promise(resolve => {
            const canvas = document.createElement('canvas');
            canvas.width = 600; canvas.height = 400;
            const ctx = canvas.getContext('2d');
            const template = new Image();
            template.src = 'template.jpg';
            template.onload = function () {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(template, 0, 0, canvas.width, canvas.height);
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = function () {
                    ctx.drawImage(img, 30, 70, 170, 190);
                    ctx.font = 'bold 24px "Agency FB"';
                    ctx.fillStyle = '#000';
                    ctx.fillText(fullName.toUpperCase(), 290, 120);
                    ctx.fillText(formatDate(dob), 370, 170);
                    ctx.fillText(bloodGroup, 360, 210);
                    ctx.fillText(cin, 270, 255);
                    ctx.save();
                    ctx.font = 'bold 32px Arial';
                    ctx.fillStyle = '#d32f2f';
                    ctx.rotate(-0.1);
                    ctx.fillText('DEPENDENT', 400, 60);
                    ctx.restore();
                    generateQRCode(cin, function(qrImage) {
                        ctx.drawImage(qrImage, 460, 290, 100, 100);
                        canvas.toBlob(function(blob) {
                            zip.file(`${cin || 'Dependent_ID'}.png`, blob);
                            resolve();
                        });
                    });
                };
                img.onerror = function () {
                    displayMessage('Failed to load dependent photo for ' + fullName, true);
                    resolve();
                };
                img.src = photoUrl;
            };
        });
    }
    zip.generateAsync({ type: 'blob' }).then(function (content) {
        saveAs(content, 'Dependents_IDCards.zip');
        displayMessage('Bulk dependent ID cards downloaded as ZIP.', false);
    });
}

// Expose dependent printing functions globally
if (typeof window !== 'undefined') {
    window.searchDependents = searchDependents;
    window.searchEnrollee = typeof searchEnrollee === 'function' ? searchEnrollee : undefined;
    window.printAllDependents = printAllDependents;
    window.bulkDownloadDependentsZip = bulkDownloadDependentsZip;
    // Also expose single-ID helpers so inline onclicks in HTML work reliably
    window.generateIDCard = typeof generateIDCard === 'function' ? generateIDCard : undefined;
    window.downloadIDCard = typeof downloadIDCard === 'function' ? downloadIDCard : undefined;
    window.printIDCard = typeof printIDCard === 'function' ? printIDCard : undefined;
}

// Debug: Log when the script is loaded and when the functions are attached
// script loaded

// Live preview for first and second photo handled here for maintainability
// (moved from index.html inline script)
document.addEventListener('DOMContentLoaded', function () {
    // Refresh Supabase status when DOM is ready
    if (typeof updateSupabaseStatus === 'function') updateSupabaseStatus();
    // First photo file
    var photoInput = document.getElementById('photo');
    var photoPreview = document.getElementById('photoPreview');
    if (photoInput && photoPreview) {
        photoInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (evt) {
                    photoPreview.src = evt.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
    // First photo URL
    var photoUrlInput = document.getElementById('photoUrl');
    if (photoUrlInput && photoPreview) {
        photoUrlInput.addEventListener('input', function (e) {
            const url = e.target.value;
            photoPreview.src = url;
        });
    }
    // Wire up Generate / Download / Print buttons safely (avoid inline onclick ReferenceError)
    // Attaching Generate/Download/Print buttons
    const genBtn = document.getElementById('generateBtn');
    if (genBtn) {
        genBtn.addEventListener('click', function () {
            try {
                if (typeof generateIDCard === 'function') return generateIDCard();
                displayMessage('Generate function is not available.', true);
            } catch (err) {
                console.error('Error invoking generateIDCard:', err);
                displayMessage('An error occurred while generating the ID card.', true);
            }
        });
        // Fallback: ensure the safe generator is bound directly (covers cases where other handlers fail)
        try {
            genBtn.onclick = async function (e) {
                try {
                    // simple visual feedback
                    const old = genBtn.textContent;
                    genBtn.textContent = 'Generating...';
                    genBtn.disabled = true;
                    if (typeof generateIDCardSafe === 'function') {
                        await generateIDCardSafe();
                    } else if (typeof generateIDCard === 'function') {
                        await generateIDCard();
                    } else {
                        displayMessage('No generator function available.', true);
                    }
                    genBtn.textContent = old;
                    genBtn.disabled = false;
                } catch (err) {
                    console.error('generateBtn onclick fallback error:', err);
                    try { genBtn.textContent = old; genBtn.disabled = false; } catch (_) {}
                    displayMessage('An error occurred while generating the ID card.', true);
                }
            };
        } catch (e) {
            console.warn('Could not attach onclick fallback for generateBtn:', e);
        }
        // Removed extra pointer/touch debug listeners
    }
    const dlBtn = document.getElementById('downloadBtn');
    if (dlBtn) {
        // Avoid attaching duplicate listeners if one was already added in initUiListeners
        if (!dlBtn.dataset.downloadBound) {
            dlBtn.addEventListener('click', function () {
                try {
                    if (typeof downloadIDCard === 'function') return downloadIDCard();
                    displayMessage('Download function is not available.', true);
                } catch (err) {
                    console.error('Error invoking downloadIDCard:', err);
                    displayMessage('An error occurred while downloading the ID card.', true);
                }
            });
            try { dlBtn.dataset.downloadBound = 'true'; } catch (e) { }
        }
    }
    const prBtn = document.getElementById('printBtn');
    if (prBtn) {
        prBtn.addEventListener('click', function () {
            try {
                if (typeof printIDCard === 'function') return printIDCard();
                displayMessage('Print function is not available.', true);
            } catch (err) {
                console.error('Error invoking printIDCard:', err);
                displayMessage('An error occurred while printing the ID card.', true);
            }
        });
    }
    // Wire up single search button safely
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', function () {
            try {
                    // search button clicked
                if (typeof searchEnrollee === 'function') return searchEnrollee();
                displayMessage('Search function is not available.', true);
            } catch (err) {
                console.error('Error invoking searchEnrollee:', err);
                displayMessage('An error occurred while searching enrollee.', true);
            }
        });
    }
    // Wire up Search Dependents and Download All Dependents (safe listeners)
    const searchDepsBtn = document.getElementById('searchDependentsBtn');
    if (searchDepsBtn) {
        searchDepsBtn.addEventListener('click', function () {
            try {
                // search dependents button clicked
                if (typeof searchDependents === 'function') return searchDependents();
                displayMessage('Search Dependents function is not available.', true);
            } catch (err) {
                console.error('Error invoking searchDependents:', err);
                displayMessage('An error occurred while searching dependents.', true);
            }
        });
    }
    const downloadAllDepsBtn = document.getElementById('printAllDependentsBtn');
    if (downloadAllDepsBtn) {
        downloadAllDepsBtn.addEventListener('click', function () {
            try {
                // print all dependents button clicked
                if (typeof printAllDependents === 'function') return printAllDependents();
                displayMessage('Download All Dependents function is not available.', true);
            } catch (err) {
                console.error('Error invoking printAllDependents:', err);
                displayMessage('An error occurred while downloading all dependents.', true);
            }
        });
    }

    // Replace any remaining inline onclick attributes that call the named functions
    function normalizeInlineOnclicks() {
        const mappings = {
            'generateIDCard': async (e) => { if (typeof generateIDCardSafe === 'function') await generateIDCardSafe(); else if (typeof generateIDCard === 'function') generateIDCard(); else displayMessage('Generate function not available.', true); },
            'downloadIDCard': () => { if (typeof downloadIDCard === 'function') downloadIDCard(); else displayMessage('Download function not available.', true); },
            'printIDCard': () => { if (typeof printIDCard === 'function') printIDCard(); else displayMessage('Print function not available.', true); },
            'searchEnrollee': () => { if (typeof searchEnrollee === 'function') searchEnrollee(); else displayMessage('Search function not available.', true); },
            'searchDependents': () => { if (typeof searchDependents === 'function') searchDependents(); else displayMessage('Search dependents function not available.', true); },
            'printAllDependents': () => { if (typeof printAllDependents === 'function') printAllDependents(); else displayMessage('Download dependents function not available.', true); }
        };
        for (const fnName of Object.keys(mappings)) {
            try {
                const selector = `[onclick*="${fnName}"]`;
                const els = document.querySelectorAll(selector);
                // normalized inline onclicks if present
                els.forEach(el => {
                    try {
                        el.removeAttribute('onclick');
                        el.addEventListener('click', mappings[fnName]);
                    } catch (e) {
                        console.warn('Failed to normalize onclick for', fnName, e);
                    }
                });
            } catch (e) {
                console.error('normalizeInlineOnclicks error for', fnName, e);
            }
        }
    }
    try { normalizeInlineOnclicks(); } catch (e) { console.error('normalizeInlineOnclicks failed', e); }

    // Debug helpers removed (clean mode)
    // Second photo file
    var photo2Input = document.getElementById('photo2');
    var photoPreview2 = document.getElementById('photoPreview2');
    if (photo2Input && photoPreview2) {
        photo2Input.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (evt) {
                    photoPreview2.src = evt.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
    // Second photo URL
    var photoUrl2Input = document.getElementById('photoUrl2');
    if (photoUrl2Input && photoPreview2) {
        photoUrl2Input.addEventListener('input', function (e) {
            const url = e.target.value;
            photoPreview2.src = url;
        });
    }
});
