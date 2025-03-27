function generateIDCard() {
    const name = document.getElementById('name').value;
    const dob = document.getElementById('dob').value;
    const bloodGroup = document.getElementById('bloodGroup').value;
    const cin = document.getElementById('cin').value;
    const photo = document.getElementById('photo').files[0];

    if (!photo) {
        alert("Please upload a photo.");
        return;
    }

    drawIDCard(name, dob, bloodGroup, cin, URL.createObjectURL(photo));
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
    const year = date.getFullYear().toString().slice(-2);
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
    const file = document.getElementById('bulkFile').files[0];
    if (!file) {
        alert("Please upload an Excel file.");
        return;
    }

    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = async function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        let zip = new JSZip();
        let promises = [];

        for (let row of rows) {
            let promise = new Promise((resolve) => {
                drawIDCard(row.Name, row["Date of Birth"], row["Blood Group"], row.CIN, row["Photo URL"], function(canvas) {
                    zip.file(`${row.Name}.png`, canvas.toDataURL("image/png").split(',')[1], { base64: true });
                    resolve();
                });
            });

            promises.push(promise);
        }

        await Promise.all(promises);

        zip.generateAsync({ type: "blob" }).then(function (content) {
            saveAs(content, "ID_Cards.zip");
        });
    };
}
