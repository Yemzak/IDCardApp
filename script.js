// Removed import statement for Supabase as we are using the global object from the CDN

const supabaseUrl = 'https://peqgqiyfpzypkjbchlco.supabase.co'; // Replace this with your actual Supabase project URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlcWdxaXlmcHp5cGtqYmNobGNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzkzMzkwMywiZXhwIjoyMDU5NTA5OTAzfQ.3UcoSGUXlDrMum3BnqYaN9Ud9HdNXos4NbfCiyiUAlk'; // Replace this with your actual Supabase anon key
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

function generateIDCard() {
    const name = document.getElementById('name').value;
    const dob = document.getElementById('dob').value;
    const bloodGroup = document.getElementById('bloodGroup').value;
    const cin = document.getElementById('cin').value;
    const photo = document.getElementById('photo').files[0];
    const photoUrlInput = document.getElementById('photoUrl');
    const photoUrlValue = photoUrlInput ? photoUrlInput.value : '';
    // Second photo
    const photo2 = document.getElementById('photo2') ? document.getElementById('photo2').files[0] : null;
    const photoUrl2Input = document.getElementById('photoUrl2');
    const photoUrl2Value = photoUrl2Input ? photoUrl2Input.value : '';

    if (!name || !dob || !bloodGroup || !cin || (!photo && !photoUrlValue)) {
        displayMessage('All fields are required to generate an ID card.', true);
        return;
    }

    // Helper to get data URL for photo2 if file, else use URL
    function getPhoto2(callback) {
        if (photo2) {
            const reader2 = new FileReader();
            reader2.onload = function (e2) {
                callback(e2.target.result);
            };
            reader2.onerror = function () {
                callback(photoUrl2Value || '');
            };
            reader2.readAsDataURL(photo2);
        } else {
            callback(photoUrl2Value || '');
        }
    }

    if (photo) {
        const reader = new FileReader();
        reader.onload = function (e) {
            getPhoto2(function(photo2Url) {
                drawIDCard(name, dob, bloodGroup, cin, e.target.result, function () {
                    displayMessage('ID card generated successfully.', false);
                }, photo2Url);
            });
        };
        reader.onerror = function () {
            displayMessage('Failed to read the photo file.', true);
        };
        reader.readAsDataURL(photo);
    } else if (photoUrlValue) {
        getPhoto2(function(photo2Url) {
            drawIDCard(name, dob, bloodGroup, cin, photoUrlValue, function () {
                displayMessage('ID card generated successfully.', false);
            }, photo2Url);
        });
    }
}

function drawIDCard(name, dob, bloodGroup, cin, photoUrl, callback, photo2Url) {
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

        // Load both photos in parallel, then draw
        let loaded1 = false, loaded2 = false;
        let img1 = null, img2 = null;
        function checkAndDraw() {
            if (!loaded1) return;
            if (!loaded2) return;
            // Draw first photo if available
            if (img1) ctx.drawImage(img1, 30, 70, 170, 190);
            // Draw second photo if available
            if (img2) ctx.drawImage(img2, 420, 70, 170, 190);
            // Draw text and QR
            ctx.font = 'bold 24px "Agency FB"';
            ctx.fillStyle = '#000';
            ctx.fillText(`${name.toUpperCase()}`, 290, 120);
            ctx.fillText(formatDate(dob), 370, 170);
            ctx.fillText(`${bloodGroup}`, 360, 210);
            ctx.fillText(`${cin}`, 270, 255);
            generateQRCode(cin, function(qrImage) {
                if (cin.includes('S-EQP')) {
                    ctx.drawImage(qrImage, 30, canvas.height - 130, 100, 100);
                } else if (cin.includes('EQP')) {
                    ctx.drawImage(qrImage, 30, canvas.height - 130, 100, 100);
                } else {
                    ctx.drawImage(qrImage, 460, 290, 100, 100);
                }
                if (callback) callback(canvas);
            });
        }
        loadImage(photoUrl, function(img) { img1 = img; loaded1 = true; checkAndDraw(); });
        loadImage(photo2Url, function(img) { img2 = img; loaded2 = true; checkAndDraw(); });
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
    const canvas = document.getElementById('idCardCanvas');
    const cin = document.getElementById('cin').value || 'ID_Card';

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
        let { data, error } = await supabase
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
            let { data: data2, error: error2 } = await supabase
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
                displayMessage('No enrollee found with the provided CIN.', true);
                return;
            }
        }

        // Log individual name components for debugging
        let surname = enrollee.surname || '';
        let firstname = enrollee.first_name || '';
        let middleName = enrollee.middle_name || '';
        // Fallbacks for new_enrollees table field names
        if (!surname && enrollee.lastname) surname = enrollee.lastname;
        if (!firstname && enrollee.firstname) firstname = enrollee.firstname;
        if (!middleName && enrollee.middlename) middleName = enrollee.middlename;
        console.log('Surname:', surname);
        console.log('First Name:', firstname);
        console.log('Middle Name:', middleName);

        // Format full name as 'Surname (Middle Initial if long) Firstname'
        if (middleName.length > 1) {
            middleName = `${middleName.charAt(0)}.`; // Abbreviate middle name if long
        }
        const fullName = `${surname} ${middleName} ${firstname}`.trim();
        document.getElementById('name').value = fullName;
        document.getElementById('dob').value = enrollee.dob || enrollee.date_of_birth || enrollee.dobirth || '';
        document.getElementById('bloodGroup').value = enrollee.blood_group || enrollee.bloodgroup || '-';
        document.getElementById('cin').value = enrollee.cin;
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
        // Second photo
        if (enrollee.photo_url2) {
            var photoPreview2 = document.getElementById('photoPreview2');
            var photoUrl2Input = document.getElementById('photoUrl2');
            if (photoPreview2) {
                photoPreview2.src = enrollee.photo_url2;
                if (/photos\.app\.goo\.gl/.test(enrollee.photo_url2)) {
                    displayMessage('Google Photos sharing links will NOT display for second photo. Please provide a direct image link.', true);
                }
            }
            if (photoUrl2Input) {
                photoUrl2Input.value = enrollee.photo_url2;
            }
        }
        displayMessage('Enrollee details populated successfully from ' + foundTable + '.', false);
    } catch (err) {
        displayMessage('An unexpected error occurred. Please try again.', true);
        console.error(err);
    }
}
