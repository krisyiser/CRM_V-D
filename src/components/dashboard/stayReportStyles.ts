export const stayReportStyles = `
  @media print {
    body > * {
      display: none !important;
    }
    #tauri-printable-invoice-container {
      display: block !important;
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      background: white !important;
      color: #2D2D2D !important;
      padding: 30px !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #E8E4D9 !important;
      padding-bottom: 20px;
      margin-bottom: 25px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: bold;
      color: #A68A64 !important;
    }
    .brand-subtitle {
      font-size: 10px;
      color: #8C8C8C;
      text-transform: uppercase;
    }
    .invoice-meta {
      text-align: right;
    }
    .invoice-title {
      font-size: 18px;
      font-weight: bold;
      color: #2D2D2D;
      margin: 0;
    }
    .invoice-date {
      font-size: 11px;
      color: #8C8C8C;
    }
    .grid-cols-2, .grid {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 20px !important;
      margin-bottom: 25px !important;
    }
    .info-panel {
      background: #ffffff !important;
      border: 1px solid #E8E4D9 !important;
      border-radius: 12px !important;
      padding: 15px !important;
    }
    .info-panel-title {
      font-size: 10px;
      font-weight: bold;
      color: #A68A64 !important;
      border-bottom: 1px solid #F2EEE4 !important;
      padding-bottom: 5px;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      margin-bottom: 6px;
    }
    .info-label {
      color: #8C8C8C;
    }
    .info-value {
      font-weight: 600;
      color: #2D2D2D;
    }
    .table-section-title {
      font-size: 11px;
      font-weight: bold;
      color: #2D2D2D;
      margin-top: 25px;
      margin-bottom: 10px;
      border-left: 3px solid #A68A64;
      padding-left: 8px;
      text-transform: uppercase;
    }
    table {
      width: 100% !important;
      border-collapse: collapse !important;
      margin-bottom: 20px !important;
      font-size: 11px !important;
    }
    th {
      background-color: #F2EEE4 !important;
      color: #2D2D2D !important;
      font-weight: bold !important;
      padding: 10px !important;
      text-align: left;
      text-transform: uppercase;
    }
    td {
      padding: 10px !important;
      border-bottom: 1px solid #F2EEE4 !important;
      color: #4A4A4A !important;
    }
    .grand-total-box {
      background-color: #2D2D2D !important;
      color: #ffffff !important;
      border-radius: 12px !important;
      padding: 15px 20px !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      margin-top: 25px !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color-adjust: exact;
    }
    .grand-total-label {
      font-size: 10px;
      color: #A68A64 !important;
      text-transform: uppercase;
    }
    .grand-total-value {
      font-size: 20px;
      font-weight: bold;
      color: #F9F7F2 !important;
    }
    .stamp {
      border: 2px solid #8E9B8E !important;
      color: #8E9B8E !important;
      font-size: 10px;
      font-weight: bold;
      padding: 4px 8px;
      border-radius: 6px;
      display: inline-block;
      transform: rotate(-2deg);
    }
    .text-right {
      text-align: right !important;
    }
    .text-center {
      text-align: center !important;
    }
  }
`;
