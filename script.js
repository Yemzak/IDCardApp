// Removed import statement for Supabase as we are using the global object from the CDN

const supabaseUrl = 'https://fkiqluuhngmvfwnuferx.supabase.co'; // Replace this with your actual Supabase project URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZraXFsdXVobmdtdmZ3bnVmZXJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDEyNDM1MiwiZXhwIjoyMDU5NzAwMzUyfQ.szsCbKtpURnqkk5y9LHferyLVZEz4b-eOKAg62qzfmQ'; // Replace this with your actual Supabase anon key
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

function generateIDCard() {
    const name = document.getElementById('name').value;
    const dob = document.getElementById('dob').value;
    const bloodGroup = document.getElementById('bloodGroup').value;
    const cin = document.getElementById('cin').value;
    const photo = document.getElementById('photo').files[0];

    if (!name || !dob || !bloodGroup || !cin || !photo) {
        displayMessage('All fields are required to generate an ID card.', true);
        return;
    }

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
}

function drawIDCard(name, dob, bloodGroup, cin, photoUrl, callback) {
    const canvas = document.getElementById('idCardCanvas');
    const ctx = canvas.getContext('2d');
    const template = new Image();
    
    template.src = 'template.jpg'; 
    template.onload = function () {
        ctx.drawImage(template, 0, 0, canvas.width, canvas.height);
        
        const photoImg = new Image();
        photoImg.crossOrigin = "anonymous";
        photoImg.src = photoUrl;

        photoImg.onload = function () {
            ctx.drawImage(photoImg, 30, 70, 170, 190); // Position the photo

            ctx.font = 'bold 24px "Agency FB"'; // Custom font
            ctx.fillStyle = '#000';

            ctx.fillText(`${name.toUpperCase()}`, 290, 120);
            ctx.fillText(formatDate(dob), 370, 170);
            ctx.fillText(`${bloodGroup}`, 360, 210);
            ctx.fillText(`${cin}`, 270, 255);

            generateQRCode(cin, function(qrImage) {
                ctx.drawImage(qrImage, 460, 290, 100, 100);
                if (callback) callback(canvas);
            });
        };
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
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'id_card.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    const cin = document.getElementById('cin').value;

    if (!cin) {
        displayMessage('Please enter CIN to search.', true);
        return;
    }

    try {
        const tables = ['formal_data', 'informal_data', 'state_equity_enrollment'];
        let enrollee = null;

        for (const table of tables) {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .eq('cin', cin);

            if (error) {
                displayMessage(`Error fetching enrollee details from ${table}.`, true);
                console.error(error);
                continue;
            }

            if (data && data.length > 0) {
                console.log(`Data fetched from ${table}:`, data); // Log data for debugging
                enrollee = data[0];
                break;
            }
        }

        if (!enrollee) {
            displayMessage('No enrollee found with the provided CIN.', true);
            return;
        }

        // Log individual name components for debugging
        console.log('Surname:', enrollee.surname);
        console.log('First Name:', enrollee.first_name);
        console.log('Middle Name:', enrollee.middle_name);

        // Format full name as 'Surname (Middle Initial if long) Firstname'
        const surname = enrollee.surname || '';
        const firstname = enrollee.first_name || '';
        let middleName = enrollee.middle_name || '';

        if (middleName.length > 1) {
            middleName = `${middleName.charAt(0)}.`; // Abbreviate middle name if long
        }

        const fullName = `${surname} ${middleName} ${firstname}`.trim();

        document.getElementById('name').value = fullName;
        document.getElementById('dob').value = enrollee.dob || enrollee.date_of_birth || '';
        document.getElementById('bloodGroup').value = enrollee.blood_group || '';
        document.getElementById('cin').value = enrollee.cin;

        displayMessage('Enrollee details populated successfully.', false);
    } catch (err) {
        displayMessage('An unexpected error occurred. Please try again.', true);
        console.error(err);
    }
}
