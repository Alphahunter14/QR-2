/*document.addEventListener('DOMContentLoaded', function() {
    // Function to handle form submission
    function handleSubmit(event) {
        event.preventDefault(); // Prevent default form submission behavior

        // Get form data
        var formData = {
            itemCode: document.getElementById('item_code').value,
            itemQuantity: document.getElementById('item_quantity').value,
            grnNo: document.getElementById('grn_no').value,
            grnDate: document.getElementById('grn_date').value,
            materialType: document.getElementById('material_type').value,
            dimension: document.getElementById('dimension').value
        };

        // Generate QR code
        var qrCodeContainer = document.getElementById('qr_code');
        qrCodeContainer.innerHTML = ''; // Clear previous QR code if exists
        var qr = new QRCode(qrCodeContainer, {
            text: JSON.stringify(formData),
            width: 128,
            height: 128
        });

        // Convert QR code to data URL
        var qrDataURL = qr.toDataURL();

        // Create download button
        var downloadButton = document.createElement('button');
        downloadButton.textContent = 'Download QR Code';
        downloadButton.onclick = function() {
            // Create temporary link element
            var link = document.createElement('a');
            link.href = qrDataURL;
            link.download = 'qrcode.png';

            // Trigger click on link
            document.body.appendChild(link);
            link.click();

            // Clean up
            document.body.removeChild(link);
        };

        // Append download button
        qrCodeContainer.appendChild(downloadButton);
    }

    // Add form submission event listener
    document.getElementById('materialForm').addEventListener('submit', handleSubmit);
});*/

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const qrcode = require('qrcode');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { v4: uuidv4 } = require('uuid');

const tempDir = './temp';
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.post('/generate_qr', (req, res) => {
    const { item_code, item_quantity, grn_no, grn_date, material_type, dimension } = req.body;

    // Generate QR code data
    const date_of_arrival = new Date().toISOString().slice(0, 10);
    const serial_number = uuidv4();
    const qr_data = `Date: ${date_of_arrival}, Serial Number: ${serial_number}, Item Code: ${item_code}, Item Quantity: ${item_quantity}, GRN No.: ${grn_no}, GRN Date: ${grn_date}, Material Type: ${material_type}, Dimension: ${dimension}`;

    // Generate QR code image
    const qrCodeFilePath = `${tempDir}/QR_Code.png`;
    qrcode.toFile(qrCodeFilePath, qr_data, (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error generating QR code');
        }

        // Create PDF document
        const pdfFilePath = `${tempDir}/QR_Code.pdf`;
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(pdfFilePath);
        doc.pipe(stream);

        // Add QR code to PDF
        doc.image(qrCodeFilePath, { width: 200 });

        // Finalize PDF
        doc.end();

        // Send PDF as file download
        stream.on('finish', () => {
            res.download(pdfFilePath, 'QR_Code.pdf', (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Error downloading PDF');
                }

                // Delete temporary files
                fs.unlinkSync(qrCodeFilePath);
                fs.unlinkSync(pdfFilePath);
            });
        });
    });

    // Clear form input fields
    res.sendFile(__dirname + '/index.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

