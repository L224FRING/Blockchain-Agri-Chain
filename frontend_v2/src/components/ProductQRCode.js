import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './ProductQRCode.css';

const ProductQRCode = ({ product, onClose }) => {
  const [downloadFormat, setDownloadFormat] = useState('png');

  // Generate verification URL
  const verificationUrl = `${window.location.origin}/verify/${product.id}`;

  // Download QR code as image
  const handleDownload = () => {
    const svg = document.getElementById('product-qr-code');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 512;
    canvas.height = 512;

    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `product-${product.id}-qr.${downloadFormat}`;
        link.click();
        URL.revokeObjectURL(url);
      }, `image/${downloadFormat}`);
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  // Copy URL to clipboard
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(verificationUrl).then(() => {
      alert('Verification URL copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  // Print QR code
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const svg = document.getElementById('product-qr-code');
    const svgData = new XMLSerializer().serializeToString(svg);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Product QR Code - ${product.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 40px;
            }
            .qr-container {
              text-align: center;
              border: 2px solid #333;
              padding: 30px;
              border-radius: 10px;
            }
            h1 { margin: 0 0 10px 0; font-size: 24px; }
            .product-info { margin: 20px 0; font-size: 14px; color: #666; }
            .qr-code { margin: 20px 0; }
            .instructions {
              margin-top: 20px;
              font-size: 12px;
              color: #999;
              max-width: 400px;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h1>🌱 AgriChain Product</h1>
            <div class="product-info">
              <strong>${product.name}</strong><br>
              Product ID: #${product.id}<br>
              Origin: ${product.origin}
            </div>
            <div class="qr-code">
              ${svgData}
            </div>
            <div class="instructions">
              Scan this QR code to view the complete supply chain history<br>
              and verify product authenticity on the blockchain.
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="qr-modal-overlay" onClick={onClose}>
      <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="qr-modal-header">
          <h2>📱 Product QR Code</h2>
          <button className="qr-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="qr-modal-body">
          <div className="qr-product-info">
            <h3>{product.name}</h3>
            <p>Product ID: #{product.id}</p>
            <p>Origin: {product.origin}</p>
          </div>

          <div className="qr-code-container">
            <QRCodeSVG
              id="product-qr-code"
              value={verificationUrl}
              size={256}
              level="H"
              includeMargin={true}
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>

          <div className="qr-url-display">
            <input
              type="text"
              value={verificationUrl}
              readOnly
              className="qr-url-input"
            />
            <button onClick={handleCopyUrl} className="qr-copy-btn" title="Copy URL">
              📋 Copy
            </button>
          </div>

          <div className="qr-instructions">
            <p>
              <strong>How to use:</strong>
            </p>
            <ul>
              <li>Scan with any QR code reader</li>
              <li>View complete supply chain history</li>
              <li>Verify product authenticity</li>
              <li>No wallet required for viewing</li>
            </ul>
          </div>

          <div className="qr-actions">
            <button onClick={handleDownload} className="qr-action-btn qr-download-btn">
              ⬇️ Download
            </button>
            <button onClick={handlePrint} className="qr-action-btn qr-print-btn">
              🖨️ Print
            </button>
            <button onClick={handleCopyUrl} className="qr-action-btn qr-share-btn">
              🔗 Share Link
            </button>
          </div>

          <div className="qr-format-selector">
            <label>Download format:</label>
            <select
              value={downloadFormat}
              onChange={(e) => setDownloadFormat(e.target.value)}
              className="qr-format-select"
            >
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductQRCode;
