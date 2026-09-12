import * as XLSX from 'xlsx';
import { Exam, ExamResult, Question } from '../types';

/**
 * Clean text and escape HTML special characters for Word/HTML export
 */
function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format math in text for Word/HTML: Preserves LaTeX while keeping paragraphs clean
 */
function formatMathForHtml(text: string): string {
  if (!text) return '';
  // Convert newlines to breaks and preserve safe inline formatting tags for English & typography
  let html = escapeHtml(text).replace(/\n/g, '<br/>');
  html = html
    .replace(/&lt;u&gt;/gi, '<u style="text-decoration: underline; font-weight: 600;">')
    .replace(/&lt;\/u&gt;/gi, '</u>')
    .replace(/&lt;b&gt;/gi, '<b>')
    .replace(/&lt;\/b&gt;/gi, '</b>')
    .replace(/&lt;i&gt;/gi, '<i>')
    .replace(/&lt;\/i&gt;/gi, '</i>');
  return html;
}

/**
 * Render question leading text strictly following MOET & user requirements:
 * 1. Đoạn dẫn (Dữ kiện) nằm hoàn toàn trong câu hỏi (bắt đầu với "Câu X:")
 * 2. Trình tự hiển thị: Dữ kiện, Hình (nếu có), Nội dung câu hỏi.
 */
function renderQuestionLeadingHtml(
  q: Question,
  questionCounter: number,
  imgClassName: string = 'q-img'
): string {
  const hasStem = Boolean(q.stem && q.stem.trim());
  const audioNotice = q.audioName
    ? `<div style="font-size:10pt; font-style:italic; color:#0d9488; margin: 4px 0;">[File âm thanh nghe: ${escapeHtml(q.audioName)}]</div>`
    : '';

  if (hasStem) {
    return `
      <div class="q-stem-lead"><b>Câu ${questionCounter}:</b> ${formatMathForHtml(q.stem)}</div>
      ${q.image ? `<img src="${q.image}" class="${imgClassName}" alt="Hình minh họa" />` : ''}
      ${audioNotice}
      <div class="q-content">${formatMathForHtml(q.content)}</div>
    `;
  }
  return `
    <div class="q-content"><b>Câu ${questionCounter}:</b> ${formatMathForHtml(q.content)}</div>
    ${q.image ? `<img src="${q.image}" class="${imgClassName}" alt="Hình minh họa" />` : ''}
    ${audioNotice}
  `;
}

/**
 * EXPORT EXAM TO MICROSOFT WORD (.doc / .docx compatible with MathJax & LaTeX)
 */
export function exportExamToWord(exam: Exam, options: { includeAnswers?: boolean } = { includeAnswers: true }) {
  const { title, code, duration, questions } = exam;

  // Group questions by MOET standard parts
  const part1 = questions.filter((q) => q.type === 'mc');
  const part2 = questions.filter((q) => q.type === 'tf');
  const part3 = questions.filter((q) => q.type === 'short');
  const part4 = questions.filter((q) => q.type === 'essay');

  let questionCounter = 0;

  // Build Answer Key Matrix
  let answerKeyRows = '';
  questions.forEach((q, idx) => {
    let ansDisplay = '';
    if (q.type === 'mc') {
      ansDisplay = `<b>${q.correctAnswer || 'A'}</b>`;
    } else if (q.type === 'tf' && q.correctAnswers) {
      const { a, b, c, d } = q.correctAnswers;
      ansDisplay = `a-${a === 'true' ? 'Đ' : 'S'}, b-${b === 'true' ? 'Đ' : 'S'}, c-${c === 'true' ? 'Đ' : 'S'}, d-${d === 'true' ? 'Đ' : 'S'}`;
    } else if (q.type === 'short') {
      ansDisplay = `<b>${q.correctAnswer || ''}</b>`;
    } else if (q.type === 'essay') {
      ansDisplay = `<i>${q.guide || 'Theo thang điểm tự luận'}</i>`;
    }
    answerKeyRows += `
      <tr>
        <td style="border:1px solid #333; padding:6px; text-align:center; font-weight:bold;">Câu ${idx + 1}</td>
        <td style="border:1px solid #333; padding:6px; text-align:center;">${q.type === 'mc' ? 'Trắc nghiệm 4 lựa chọn' : q.type === 'tf' ? 'Đúng/Sai' : q.type === 'short' ? 'Trả lời ngắn' : 'Tự luận'}</td>
        <td style="border:1px solid #333; padding:6px;">${ansDisplay}</td>
      </tr>
    `;
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(title)} - Mã đề: ${escapeHtml(code)}</title>
      <!-- MathJax for rendering LaTeX math formulas in Word / Browser -->
      <script>
        window.MathJax = {
          tex: {
            inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
            displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
            processEscapes: true
          },
          options: {
            skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
          }
        };
      </script>
      <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js" async></script>
      <style>
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 13pt;
          line-height: 1.4;
          color: #000;
          margin: 20px;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .header-table td {
          vertical-align: top;
          padding: 4px;
        }
        .title-box {
          text-align: center;
          margin: 15px 0;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
        }
        .exam-title {
          font-size: 15pt;
          font-weight: bold;
          text-transform: uppercase;
        }
        .student-box {
          border: 1px dashed #444;
          padding: 8px 12px;
          margin-bottom: 20px;
          background-color: #f9f9f9;
        }
        .part-header {
          font-size: 13.5pt;
          font-weight: bold;
          margin-top: 20px;
          margin-bottom: 8px;
          color: #000;
          border-bottom: 1px solid #ccc;
          padding-bottom: 4px;
        }
        .part-desc {
          font-style: italic;
          font-size: 11.5pt;
          margin-bottom: 12px;
        }
        .question-item {
          margin-bottom: 14px;
          text-align: justify;
        }
        .q-stem, .q-stem-lead {
          margin-bottom: 4px;
        }
        .q-content {
          margin-top: 4px;
          margin-bottom: 6px;
        }
        .q-title {
          font-weight: normal;
        }
        .options-table {
          width: 100%;
          margin-top: 6px;
          margin-bottom: 6px;
          border-collapse: collapse;
        }
        .options-table td {
          width: 50%;
          padding: 4px 8px;
          vertical-align: top;
        }
        .tf-list {
          margin-left: 20px;
          margin-top: 4px;
        }
        .tf-item {
          margin-bottom: 4px;
        }
        .answer-key-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
          font-size: 11.5pt;
        }
        .page-break {
          page-break-before: always;
        }
        img.q-img {
          max-width: 450px;
          max-height: 250px;
          display: block;
          margin: 8px auto;
        }
      </style>
    </head>
    <body>
      <!-- Header Table -->
      <table class="header-table">
        <tr>
          <td style="width: 50%; text-align: center;">
            <div style="font-size: 11.5pt; text-transform: uppercase;">SỞ GIÁO DỤC VÀ ĐÀO TẠO</div>
            <div style="font-weight: bold; font-size: 12pt; text-transform: uppercase;">TRƯỜNG THPT CHUYÊN</div>
            <div style="font-size: 10.5pt; font-style: italic;">(Đề thi chính thức)</div>
          </td>
          <td style="width: 50%; text-align: center;">
            <div style="font-weight: bold; font-size: 12pt; text-transform: uppercase;">KỲ THI KHẢO SÁT CHẤT LƯỢNG</div>
            <div style="font-size: 11pt;">NĂM HỌC 2025 - 2026</div>
            <div style="font-weight: bold; font-size: 11.5pt; margin-top: 2px;">
              MÃ ĐỀ THI: <span style="border: 1px solid #000; padding: 2px 8px;">${escapeHtml(code)}</span>
            </div>
          </td>
        </tr>
      </table>

      <!-- Exam Main Title -->
      <div class="title-box">
        <div class="exam-title">${escapeHtml(title)}</div>
        <div style="font-size: 11.5pt; margin-top: 4px;">
          Thời gian làm bài: <b>${duration} phút</b> <i>(không kể thời gian phát đề)</i>
        </div>
      </div>

      <!-- Student Identification Box -->
      <div class="student-box">
        <table style="width: 100%;">
          <tr>
            <td style="width: 45%;">Họ và tên thí sinh: ..............................................................</td>
            <td style="width: 25%;">Lớp: ............................</td>
            <td style="width: 30%;"><b>Số báo danh (SBD):</b> ....................</td>
          </tr>
        </table>
      </div>

      <!-- PART I: MULTIPLE CHOICE (4 Options) -->
      ${
        part1.length > 0
          ? `
        <div class="part-header">PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn (${part1.length} câu)</div>
        <div class="part-desc">Thí sinh trả lời từ câu 1 đến câu ${part1.length}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.</div>
        ${part1
          .map((q, pIdx) => {
            questionCounter++;
            const prevQ = pIdx > 0 ? part1[pIdx - 1] : null;
            const isClusterStart = Boolean(
              q.groupStem &&
              q.groupStem.trim() &&
              (!prevQ || prevQ.groupId !== q.groupId || prevQ.groupStem !== q.groupStem)
            );
            let clusterHeaderHtml = '';
            if (isClusterStart) {
              let cEnd = pIdx;
              while (
                cEnd + 1 < part1.length &&
                part1[cEnd + 1].groupId === q.groupId &&
                part1[cEnd + 1].groupStem === q.groupStem
              ) {
                cEnd++;
              }
              const startNum = questionCounter;
              const endNum = questionCounter + (cEnd - pIdx);
              clusterHeaderHtml = `
                <div style="background-color: #f1f5f9; border: 1.5px solid #4f46e5; border-radius: 6px; padding: 10px 14px; margin: 14px 0 10px 0;">
                  <b style="color: #312e81; font-size: 11pt;">[DỮ KIỆN CHUNG CHO CÁC CÂU ${startNum} - ${endNum}]:</b>
                  <div style="font-size: 11pt; margin-top: 4px; text-align: justify;">${formatMathForHtml(q.groupStem || '')}</div>
                </div>
              `;
            }

            return `
            ${clusterHeaderHtml}
            <div class="question-item">
              ${renderQuestionLeadingHtml(q, questionCounter, 'q-img')}
              ${
                q.options
                  ? `
                <table class="options-table">
                  <tr>
                    <td><b>A.</b> ${formatMathForHtml(q.options.A)}</td>
                    <td><b>B.</b> ${formatMathForHtml(q.options.B)}</td>
                  </tr>
                  <tr>
                    <td><b>C.</b> ${formatMathForHtml(q.options.C)}</td>
                    <td><b>D.</b> ${formatMathForHtml(q.options.D)}</td>
                  </tr>
                </table>
              `
                  : ''
              }
            </div>
          `;
          })
          .join('')}
      `
          : ''
      }

      <!-- PART II: TRUE / FALSE (4 Statements per question) -->
      ${
        part2.length > 0
          ? `
        <div class="part-header">PHẦN II. Câu trắc nghiệm đúng sai (${part2.length} câu)</div>
        <div class="part-desc">Thí sinh trả lời từ câu 1 đến câu ${part2.length}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.</div>
        ${part2
          .map((q) => {
            questionCounter++;
            return `
            <div class="question-item">
              ${renderQuestionLeadingHtml(q, questionCounter, 'q-img')}
              ${
                q.statements
                  ? `
                <div class="tf-list">
                  <div class="tf-item"><b>a)</b> ${formatMathForHtml(q.statements.a)}</div>
                  <div class="tf-item"><b>b)</b> ${formatMathForHtml(q.statements.b)}</div>
                  <div class="tf-item"><b>c)</b> ${formatMathForHtml(q.statements.c)}</div>
                  <div class="tf-item"><b>d)</b> ${formatMathForHtml(q.statements.d)}</div>
                </div>
              `
                  : ''
              }
            </div>
          `;
          })
          .join('')}
      `
          : ''
      }

      <!-- PART III: SHORT ANSWER -->
      ${
        part3.length > 0
          ? `
        <div class="part-header">PHẦN III. Câu trắc nghiệm trả lời ngắn (${part3.length} câu)</div>
        <div class="part-desc">Thí sinh trả lời từ câu 1 đến câu ${part3.length}. Điền kết quả vào ô trống tương ứng.</div>
        ${part3
          .map((q) => {
            questionCounter++;
            return `
            <div class="question-item">
              ${renderQuestionLeadingHtml(q, questionCounter, 'q-img')}
              <div style="margin-top: 6px; font-style: italic;">
                <i>Trả lời: ............................................................................................................</i>
              </div>
            </div>
          `;
          })
          .join('')}
      `
          : ''
      }

      <!-- PART IV: ESSAY (If any) -->
      ${
        part4.length > 0
          ? `
        <div class="part-header">PHẦN IV. Tự luận (${part4.length} câu)</div>
        <div class="part-desc">Thí sinh trình bày chi tiết lời giải vào giấy thi.</div>
        ${part4
          .map((q) => {
            questionCounter++;
            return `
            <div class="question-item">
              ${renderQuestionLeadingHtml(q, questionCounter, 'q-img')}
            </div>
          `;
          })
          .join('')}
      `
          : ''
      }

      <div style="text-align: center; margin-top: 30px; font-weight: bold; font-size: 11pt;">
        ----------------- HẾT -----------------<br/>
        <i>Cán bộ coi thi không giải thích gì thêm.</i>
      </div>

      <!-- OPTIONAL ANSWER KEY MATRIX FOR TEACHERS -->
      ${
        options.includeAnswers
          ? `
        <div class="page-break"></div>
        <div style="text-align: center; margin-top: 30px; margin-bottom: 20px;">
          <h2 style="font-size: 14pt; text-transform: uppercase; margin: 0;">BẢNG ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM</h2>
          <div style="font-size: 11pt; margin-top: 4px;">Môn: Toán • Mã đề: <b>${escapeHtml(code)}</b></div>
        </div>

        <table class="answer-key-table">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th style="border:1px solid #333; padding:8px; width:15%;">Câu số</th>
              <th style="border:1px solid #333; padding:8px; width:30%;">Phân loại</th>
              <th style="border:1px solid #333; padding:8px; width:55%;">Đáp án chính xác / Hướng dẫn</th>
            </tr>
          </thead>
          <tbody>
            ${answerKeyRows}
          </tbody>
        </table>
      `
          : ''
      }
    </body>
    </html>
  `;

  // Create blob with MS Word compatible MIME type
  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword;charset=utf-8',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `DeThi_${code.replace(/[^a-zA-Z0-9_-]/g, '')}_${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * EXPORT EXAM TO PRINTABLE PDF (Opens dedicated print dialog with high-res KaTeX rendering)
 */
export function exportExamToPDF(exam: Exam) {
  const { title, code, duration, questions } = exam;

  const part1 = questions.filter((q) => q.type === 'mc');
  const part2 = questions.filter((q) => q.type === 'tf');
  const part3 = questions.filter((q) => q.type === 'short');
  const part4 = questions.filter((q) => q.type === 'essay');

  let questionCounter = 0;

  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (!printWindow) {
    alert('Vui lòng cho phép mở cửa sổ popup để in hoặc lưu tệp PDF!');
    return;
  }

  const printHtml = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(title)} - Mã đề: ${escapeHtml(code)}</title>
      <!-- KaTeX & MathJax for high quality math formula rendering -->
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
      <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
      <style>
        @page {
          size: A4;
          margin: 18mm 15mm 18mm 15mm;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 12.5pt;
          line-height: 1.4;
          color: #111;
          background: #fff;
          margin: 0;
          padding: 20px;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
        }
        .header-table td {
          vertical-align: top;
          padding: 2px 4px;
        }
        .exam-title-box {
          text-align: center;
          margin: 12px 0 16px 0;
          border-bottom: 2px solid #000;
          padding-bottom: 8px;
        }
        .student-info-box {
          border: 1px solid #333;
          padding: 6px 12px;
          margin-bottom: 16px;
          font-size: 11pt;
        }
        .part-heading {
          font-size: 12.5pt;
          font-weight: bold;
          margin-top: 16px;
          margin-bottom: 4px;
          text-transform: uppercase;
        }
        .part-subtext {
          font-style: italic;
          font-size: 11pt;
          margin-bottom: 10px;
          color: #444;
        }
        .q-container {
          margin-bottom: 12px;
          page-break-inside: avoid;
        }
        .q-stem-lead {
          margin-bottom: 3px;
        }
        .q-content {
          margin-top: 3px;
          margin-bottom: 4px;
        }
        .q-stem-box {
          font-style: italic;
          color: #333;
          margin-bottom: 3px;
        }
        .opt-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px 16px;
          margin-top: 4px;
        }
        .tf-grid {
          margin-left: 18px;
          margin-top: 4px;
        }
        .tf-row {
          margin-bottom: 3px;
        }
        img.q-image {
          max-width: 380px;
          max-height: 220px;
          display: block;
          margin: 6px auto;
        }
        .print-btn-bar {
          position: fixed;
          top: 12px;
          right: 12px;
          background: #1e1b4b;
          color: #fff;
          padding: 8px 16px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          cursor: pointer;
          font-family: sans-serif;
          font-size: 13px;
          font-weight: bold;
          z-index: 9999;
        }
        @media print {
          .print-btn-bar { display: none; }
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="print-btn-bar" onclick="window.print()">🖨️ Bấm Vào Đây Để In / Lưu File PDF</div>

      <!-- Header -->
      <table class="header-table">
        <tr>
          <td style="width: 52%; text-align: center;">
            <div style="font-size: 11pt; text-transform: uppercase;">SỞ GIÁO DỤC VÀ ĐÀO TẠO</div>
            <div style="font-weight: bold; font-size: 11.5pt; text-transform: uppercase;">TRƯỜNG THPT CHUYÊN</div>
            <div style="font-size: 10pt; font-style: italic;">(Đề thi chính thức)</div>
          </td>
          <td style="width: 48%; text-align: center;">
            <div style="font-weight: bold; font-size: 11.5pt; text-transform: uppercase;">KỲ THI ĐÁNH GIÁ CHẤT LƯỢNG</div>
            <div style="font-size: 10.5pt;">NĂM HỌC 2025 - 2026</div>
            <div style="font-weight: bold; font-size: 11pt; margin-top: 2px;">
              MÃ ĐỀ: <span style="border: 1.5px solid #000; padding: 1px 8px; font-family: monospace;">${escapeHtml(code)}</span>
            </div>
          </td>
        </tr>
      </table>

      <div class="exam-title-box">
        <div style="font-size: 14pt; font-weight: bold; text-transform: uppercase;">${escapeHtml(title)}</div>
        <div style="font-size: 11pt; margin-top: 3px;">
          Thời gian làm bài: <b>${duration} phút</b> <i>(không kể thời gian giao đề)</i>
        </div>
      </div>

      <!-- Student Box -->
      <div class="student-info-box">
        <table style="width: 100%;">
          <tr>
            <td style="width: 40%;">Họ, tên thí sinh: ......................................................</td>
            <td style="width: 25%;">Lớp: ............................</td>
            <td style="width: 35%;"><b>Số báo danh (SBD):</b> ....................</td>
          </tr>
        </table>
      </div>

      <!-- Part I -->
      ${
        part1.length > 0
          ? `
        <div class="part-heading">PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn (${part1.length} câu)</div>
        <div class="part-subtext">Thí sinh trả lời từ câu 1 đến câu ${part1.length}. Mỗi câu hỏi chỉ chọn một phương án.</div>
        ${part1
          .map((q, pIdx) => {
            questionCounter++;
            const prevQ = pIdx > 0 ? part1[pIdx - 1] : null;
            const isClusterStart = Boolean(
              q.groupStem &&
              q.groupStem.trim() &&
              (!prevQ || prevQ.groupId !== q.groupId || prevQ.groupStem !== q.groupStem)
            );
            let clusterHeaderHtml = '';
            if (isClusterStart) {
              let cEnd = pIdx;
              while (
                cEnd + 1 < part1.length &&
                part1[cEnd + 1].groupId === q.groupId &&
                part1[cEnd + 1].groupStem === q.groupStem
              ) {
                cEnd++;
              }
              const startNum = questionCounter;
              const endNum = questionCounter + (cEnd - pIdx);
              clusterHeaderHtml = `
                <div style="background-color: #f8fafc; border: 1.5px solid #4338ca; border-radius: 6px; padding: 8px 12px; margin: 12px 0 8px 0;">
                  <b style="color: #312e81; font-size: 11pt;">[DỮ KIỆN CHUNG CHO CÁC CÂU ${startNum} - ${endNum}]:</b>
                  <div style="font-size: 11pt; margin-top: 3px; text-align: justify;">${formatMathForHtml(q.groupStem || '')}</div>
                </div>
              `;
            }

            return `
            ${clusterHeaderHtml}
            <div class="q-container">
              ${renderQuestionLeadingHtml(q, questionCounter, 'q-image')}
              ${
                q.options
                  ? `
                <div class="opt-grid">
                  <div><b>A.</b> ${formatMathForHtml(q.options.A)}</div>
                  <div><b>B.</b> ${formatMathForHtml(q.options.B)}</div>
                  <div><b>C.</b> ${formatMathForHtml(q.options.C)}</div>
                  <div><b>D.</b> ${formatMathForHtml(q.options.D)}</div>
                </div>
              `
                  : ''
              }
            </div>
          `;
          })
          .join('')}
      `
          : ''
      }

      <!-- Part II -->
      ${
        part2.length > 0
          ? `
        <div class="part-heading">PHẦN II. Câu trắc nghiệm đúng sai (${part2.length} câu)</div>
        <div class="part-subtext">Thí sinh trả lời từ câu 1 đến câu ${part2.length}. Trong mỗi ý a), b), c), d) chọn đúng hoặc sai.</div>
        ${part2
          .map((q) => {
            questionCounter++;
            return `
            <div class="q-container">
              ${renderQuestionLeadingHtml(q, questionCounter, 'q-image')}
              ${
                q.statements
                  ? `
                <div class="tf-grid">
                  <div class="tf-row"><b>a)</b> ${formatMathForHtml(q.statements.a)}</div>
                  <div class="tf-row"><b>b)</b> ${formatMathForHtml(q.statements.b)}</div>
                  <div class="tf-row"><b>c)</b> ${formatMathForHtml(q.statements.c)}</div>
                  <div class="tf-row"><b>d)</b> ${formatMathForHtml(q.statements.d)}</div>
                </div>
              `
                  : ''
              }
            </div>
          `;
          })
          .join('')}
      `
          : ''
      }

      <!-- Part III -->
      ${
        part3.length > 0
          ? `
        <div class="part-heading">PHẦN III. Câu trắc nghiệm trả lời ngắn (${part3.length} câu)</div>
        <div class="part-subtext">Thí sinh điền kết quả vào ô trả lời tương ứng.</div>
        ${part3
          .map((q) => {
            questionCounter++;
            return `
            <div class="q-container">
              ${renderQuestionLeadingHtml(q, questionCounter, 'q-image')}
              <div style="margin-top: 4px; font-style: italic; font-size: 11pt;">
                Trả lời: ............................................................................................
              </div>
            </div>
          `;
          })
          .join('')}
      `
          : ''
      }

      <!-- Part IV -->
      ${
        part4.length > 0
          ? `
        <div class="part-heading">PHẦN IV. Tự luận (${part4.length} câu)</div>
        ${part4
          .map((q) => {
            questionCounter++;
            return `
            <div class="q-container">
              ${renderQuestionLeadingHtml(q, questionCounter, 'q-image')}
            </div>
          `;
          })
          .join('')}
      `
          : ''
      }

      <div style="text-align: center; margin-top: 24px; font-weight: bold; font-size: 11pt;">
        ----------------- HẾT -----------------
      </div>

      <script>
        document.addEventListener("DOMContentLoaded", function() {
          renderMathInElement(document.body, {
            delimiters: [
              {left: "$$", right: "$$", display: true},
              {left: "$", right: "$", display: false},
              {left: "\\\\(", right: "\\\\)", display: false},
              {left: "\\\\[", right: "\\\\]", display: true}
            ],
            throwOnError: false
          });
        });
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(printHtml);
  printWindow.document.close();
}

/**
 * EXPORT MULTI-VARIANT EXAMS (1 to 4 codes) TO A SINGLE WORD (.DOC) DOCUMENT WITH COMPARATIVE ANSWER KEY MATRIX
 */
export function exportMultiVariantExamToWord(
  variants: Exam[],
  options: { includeAnswers?: boolean } = { includeAnswers: true }
) {
  if (!variants || variants.length === 0) return;
  if (variants.length === 1) {
    exportExamToWord(variants[0], options);
    return;
  }

  const baseTitle = variants[0].title.replace(/\s*-\s*\[Mã đề\s*[^\]]+\]/i, '').replace(/\s*\(Mã đề\s*[^\)]+\)/i, '');
  const duration = variants[0].duration;
  const codes = variants.map((v) => v.code);

  // Build each variant HTML
  const variantsHtml = variants
    .map((exam, vIdx) => {
      const { code, questions } = exam;
      const part1 = questions.filter((q) => q.type === 'mc');
      const part2 = questions.filter((q) => q.type === 'tf');
      const part3 = questions.filter((q) => q.type === 'short');
      const part4 = questions.filter((q) => q.type === 'essay');
      let questionCounter = 0;

      return `
        <div class="${vIdx > 0 ? 'page-break' : ''}">
          <!-- Header Table -->
          <table class="header-table">
            <tr>
              <td style="width: 50%; text-align: center;">
                <div style="font-size: 11.5pt; text-transform: uppercase;">SỞ GIÁO DỤC VÀ ĐÀO TẠO</div>
                <div style="font-weight: bold; font-size: 12pt; text-transform: uppercase;">TRƯỜNG THPT CHUYÊN</div>
                <div style="font-size: 10.5pt; font-style: italic;">(Đề thi chính thức)</div>
              </td>
              <td style="width: 50%; text-align: center;">
                <div style="font-weight: bold; font-size: 12pt; text-transform: uppercase;">KỲ THI KHẢO SÁT CHẤT LƯỢNG</div>
                <div style="font-size: 11pt;">NĂM HỌC 2025 - 2026</div>
                <div style="font-weight: bold; font-size: 12pt; margin-top: 2px;">
                  MÃ ĐỀ THI: <span style="border: 2px solid #000; padding: 2px 10px; background-color: #f0f0f0;">${escapeHtml(code)}</span>
                </div>
              </td>
            </tr>
          </table>

          <!-- Exam Main Title -->
          <div class="title-box">
            <div class="exam-title">${escapeHtml(baseTitle)}</div>
            <div style="font-size: 11.5pt; margin-top: 4px;">
              Thời gian làm bài: <b>${duration} phút</b> <i>(không kể thời gian phát đề)</i> • <b>Mã đề: ${escapeHtml(code)}</b>
            </div>
          </div>

          <!-- Student Identification Box -->
          <div class="student-box">
            <table style="width: 100%;">
              <tr>
                <td style="width: 45%;">Họ và tên thí sinh: ..............................................................</td>
                <td style="width: 25%;">Lớp: ............................</td>
                <td style="width: 30%;"><b>Số báo danh (SBD):</b> ....................</td>
              </tr>
            </table>
          </div>

          <!-- PART I: MULTIPLE CHOICE -->
          ${
            part1.length > 0
              ? `
            <div class="part-header">PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn (${part1.length} câu)</div>
            <div class="part-desc">Thí sinh trả lời từ câu 1 đến câu ${part1.length}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.</div>
            ${part1
              .map((q) => {
                questionCounter++;
                return `
                <div class="question-item">
                  ${renderQuestionLeadingHtml(q, questionCounter, 'q-img')}
                  ${
                    q.options
                      ? `
                    <table class="options-table">
                      <tr>
                        <td><b>A.</b> ${formatMathForHtml(q.options.A)}</td>
                        <td><b>B.</b> ${formatMathForHtml(q.options.B)}</td>
                      </tr>
                      <tr>
                        <td><b>C.</b> ${formatMathForHtml(q.options.C)}</td>
                        <td><b>D.</b> ${formatMathForHtml(q.options.D)}</td>
                      </tr>
                    </table>
                  `
                      : ''
                  }
                </div>
              `;
              })
              .join('')}
          `
              : ''
          }

          <!-- PART II: TRUE / FALSE -->
          ${
            part2.length > 0
              ? `
            <div class="part-header">PHẦN II. Câu trắc nghiệm đúng sai (${part2.length} câu)</div>
            <div class="part-desc">Thí sinh trả lời từ câu 1 đến câu ${part2.length}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.</div>
            ${part2
              .map((q) => {
                questionCounter++;
                return `
                <div class="question-item">
                  ${renderQuestionLeadingHtml(q, questionCounter, 'q-img')}
                  ${
                    q.statements
                      ? `
                    <div class="tf-list">
                      <div class="tf-item"><b>a)</b> ${formatMathForHtml(q.statements.a)}</div>
                      <div class="tf-item"><b>b)</b> ${formatMathForHtml(q.statements.b)}</div>
                      <div class="tf-item"><b>c)</b> ${formatMathForHtml(q.statements.c)}</div>
                      <div class="tf-item"><b>d)</b> ${formatMathForHtml(q.statements.d)}</div>
                    </div>
                  `
                      : ''
                  }
                </div>
              `;
              })
              .join('')}
          `
              : ''
          }

          <!-- PART III: SHORT ANSWER -->
          ${
            part3.length > 0
              ? `
            <div class="part-header">PHẦN III. Câu trắc nghiệm trả lời ngắn (${part3.length} câu)</div>
            <div class="part-desc">Thí sinh trả lời từ câu 1 đến câu ${part3.length}. Điền kết quả vào ô tương ứng.</div>
            ${part3
              .map((q) => {
                questionCounter++;
                return `
                <div class="question-item">
                  ${renderQuestionLeadingHtml(q, questionCounter, 'q-img')}
                  <div style="margin-top: 6px; font-style: italic;">
                    <i>Trả lời: ............................................................................................................</i>
                  </div>
                </div>
              `;
              })
              .join('')}
          `
              : ''
          }

          <!-- PART IV: ESSAY -->
          ${
            part4.length > 0
              ? `
            <div class="part-header">PHẦN IV. Tự luận (${part4.length} câu)</div>
            <div class="part-desc">Thí sinh trình bày chi tiết lời giải vào giấy thi.</div>
            ${part4
              .map((q) => {
                questionCounter++;
                return `
                <div class="question-item">
                  ${renderQuestionLeadingHtml(q, questionCounter, 'q-img')}
                </div>
              `;
              })
              .join('')}
          `
              : ''
          }

          <div style="text-align: center; margin-top: 24px; font-weight: bold; font-size: 11pt;">
            ----------------- HẾT MÃ ĐỀ ${escapeHtml(code)} -----------------<br/>
            <i>Cán bộ coi thi không giải thích gì thêm.</i>
          </div>
        </div>
      `;
    })
    .join('\n');

  // Build Comparative Answer Matrix
  const maxQuestions = Math.max(...variants.map((v) => v.questions.length));
  let compRows = '';
  for (let qIdx = 0; qIdx < maxQuestions; qIdx++) {
    const qType = variants[0].questions[qIdx]?.type || 'mc';
    const typeLabel = qType === 'mc' ? 'Trắc nghiệm ABCD' : qType === 'tf' ? 'Đúng / Sai' : qType === 'short' ? 'Trả lời ngắn' : 'Tự luận';

    const answersCells = variants
      .map((v) => {
        const q = v.questions[qIdx];
        if (!q) return '<td style="border:1px solid #333; padding:6px; text-align:center;">--</td>';
        if (q.type === 'mc') {
          return `<td style="border:1px solid #333; padding:6px; text-align:center; font-weight:bold; font-size:12pt; color:#1e40af;">${q.correctAnswer || 'A'}</td>`;
        }
        if (q.type === 'tf' && q.correctAnswers) {
          const { a, b, c, d } = q.correctAnswers;
          return `<td style="border:1px solid #333; padding:6px; font-size:10pt;">a-${a === 'true' ? 'Đ' : 'S'}, b-${b === 'true' ? 'Đ' : 'S'}, c-${c === 'true' ? 'Đ' : 'S'}, d-${d === 'true' ? 'Đ' : 'S'}</td>`;
        }
        if (q.type === 'short') {
          return `<td style="border:1px solid #333; padding:6px; text-align:center; font-weight:bold; color:#047857;">${q.correctAnswer || '--'}</td>`;
        }
        return `<td style="border:1px solid #333; padding:6px; font-size:10pt; font-style:italic;">Theo thang điểm</td>`;
      })
      .join('');

    compRows += `
      <tr>
        <td style="border:1px solid #333; padding:6px; text-align:center; font-weight:bold;">Câu ${qIdx + 1}</td>
        <td style="border:1px solid #333; padding:6px; text-align:center; font-size:10.5pt;">${typeLabel}</td>
        ${answersCells}
      </tr>
    `;
  }

  const comparativeMatrixHtml = options.includeAnswers
    ? `
      <div class="page-break"></div>
      <div style="text-align: center; margin-top: 30px; margin-bottom: 20px;">
        <h2 style="font-size: 14pt; text-transform: uppercase; margin: 0; color:#1e3a8a;">BẢNG TỔNG HỢP ĐÁP ÁN ĐỐI CHIẾU CÁC MÃ ĐỀ THI</h2>
        <div style="font-size: 11pt; margin-top: 6px;">
          ${escapeHtml(baseTitle)} • Các mã đề: <b>${codes.map((c) => escapeHtml(c)).join(' — ')}</b>
        </div>
      </div>

      <table class="answer-key-table" style="border-collapse:collapse; width:100%;">
        <thead>
          <tr style="background-color: #e0e7ff;">
            <th style="border:1px solid #333; padding:8px; width:10%;">Câu số</th>
            <th style="border:1px solid #333; padding:8px; width:20%;">Phân loại</th>
            ${variants.map((v) => `<th style="border:1px solid #333; padding:8px; font-weight:bold; font-size:11.5pt;">Mã ${escapeHtml(v.code)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${compRows}
        </tbody>
      </table>
    `
    : '';

  const fullHtmlContent = `
    <!DOCTYPE html>
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(baseTitle)} - Trọn Bộ ${variants.length} Mã Đề</title>
      <script>
        window.MathJax = {
          tex: {
            inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
            displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
            processEscapes: true
          },
          options: {
            skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
          }
        };
      </script>
      <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js" async></script>
      <style>
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 13pt;
          line-height: 1.4;
          color: #000;
          margin: 20px;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .header-table td {
          vertical-align: top;
          padding: 4px;
        }
        .title-box {
          text-align: center;
          margin: 15px 0;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
        }
        .exam-title {
          font-size: 15pt;
          font-weight: bold;
          text-transform: uppercase;
        }
        .student-box {
          border: 1px dashed #444;
          padding: 8px 12px;
          margin-bottom: 20px;
          background-color: #f9f9f9;
        }
        .part-header {
          font-size: 13.5pt;
          font-weight: bold;
          margin-top: 20px;
          margin-bottom: 8px;
          color: #000;
          border-bottom: 1px solid #ccc;
          padding-bottom: 4px;
        }
        .part-desc {
          font-style: italic;
          font-size: 11.5pt;
          margin-bottom: 12px;
        }
        .question-item {
          margin-bottom: 14px;
          text-align: justify;
        }
        .q-stem, .q-stem-lead {
          margin-bottom: 4px;
        }
        .q-content {
          margin-top: 4px;
          margin-bottom: 6px;
        }
        .q-title {
          font-weight: normal;
        }
        .options-table {
          width: 100%;
          margin-top: 6px;
          margin-bottom: 6px;
          border-collapse: collapse;
        }
        .options-table td {
          width: 50%;
          padding: 4px 8px;
          vertical-align: top;
        }
        .tf-list {
          margin-left: 20px;
          margin-top: 4px;
        }
        .tf-item {
          margin-bottom: 4px;
        }
        .answer-key-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
          font-size: 11.5pt;
        }
        .page-break {
          page-break-before: always;
          mso-special-character: line-break;
        }
        img.q-img {
          max-width: 450px;
          max-height: 250px;
          display: block;
          margin: 8px auto;
        }
      </style>
    </head>
    <body>
      ${variantsHtml}
      ${comparativeMatrixHtml}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', fullHtmlContent], {
    type: 'application/msword;charset=utf-8',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeTitle = baseTitle.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  link.download = `TronBo_${variants.length}MaDe_${safeTitle}_${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * EXPORT MULTI-VARIANT EXAMS (1 to 4 codes) TO PRINTABLE PDF WITH CROSS-VARIANT ANSWER KEY MATRIX
 */
export function exportMultiVariantExamToPDF(variants: Exam[]) {
  if (!variants || variants.length === 0) return;
  if (variants.length === 1) {
    exportExamToPDF(variants[0]);
    return;
  }

  const baseTitle = variants[0].title.replace(/\s*-\s*\[Mã đề\s*[^\]]+\]/i, '').replace(/\s*\(Mã đề\s*[^\)]+\)/i, '');
  const duration = variants[0].duration;
  const codes = variants.map((v) => v.code);

  const printWindow = window.open('', '_blank', 'width=950,height=1000');
  if (!printWindow) {
    alert('Vui lòng cho phép mở cửa sổ popup để in hoặc lưu tệp PDF!');
    return;
  }

  // Build variants HTML
  const variantsHtml = variants
    .map((exam, vIdx) => {
      const { code, questions } = exam;
      const part1 = questions.filter((q) => q.type === 'mc');
      const part2 = questions.filter((q) => q.type === 'tf');
      const part3 = questions.filter((q) => q.type === 'short');
      const part4 = questions.filter((q) => q.type === 'essay');
      let questionCounter = 0;

      return `
        <div class="exam-section ${vIdx > 0 ? 'page-break' : ''}">
          <table class="header-table">
            <tr>
              <td style="width: 50%; text-align: center;">
                <div style="font-size: 11pt; text-transform: uppercase;">SỞ GIÁO DỤC VÀ ĐÀO TẠO</div>
                <div style="font-weight: bold; font-size: 11.5pt; text-transform: uppercase;">TRƯỜNG THPT CHUYÊN</div>
                <div style="font-size: 10pt; font-style: italic;">(Đề thi chính thức)</div>
              </td>
              <td style="width: 50%; text-align: center;">
                <div style="font-weight: bold; font-size: 11.5pt; text-transform: uppercase;">KỲ THI KHẢO SÁT CHẤT LƯỢNG</div>
                <div style="font-size: 10.5pt;">NĂM HỌC 2025 - 2026</div>
                <div style="font-weight: bold; font-size: 11.5pt; margin-top: 2px;">
                  MÃ ĐỀ THI: <span style="border: 2px solid #000; padding: 2px 10px; background-color: #f4f4f5;">${escapeHtml(code)}</span>
                </div>
              </td>
            </tr>
          </table>

          <div class="exam-title-box">
            <div style="font-size: 13.5pt; font-weight: bold; text-transform: uppercase;">${escapeHtml(baseTitle)}</div>
            <div style="font-size: 11pt; margin-top: 4px;">
              Thời gian làm bài: <b>${duration} phút</b> <i>(không kể thời gian phát đề)</i> • <b>Mã đề: ${escapeHtml(code)}</b>
            </div>
          </div>

          <div class="student-info-box">
            <table style="width: 100%;">
              <tr>
                <td style="width: 45%;">Họ và tên thí sinh: ..............................................................</td>
                <td style="width: 25%;">Lớp: ............................</td>
                <td style="width: 30%;"><b>Số báo danh (SBD):</b> ....................</td>
              </tr>
            </table>
          </div>

          <!-- PART I -->
          ${
            part1.length > 0
              ? `
            <div class="part-heading">PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn (${part1.length} câu)</div>
            <div class="part-note">Thí sinh trả lời từ câu 1 đến câu ${part1.length}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.</div>
            ${part1
              .map((q) => {
                questionCounter++;
                return `
                <div class="question-box">
                  ${renderQuestionLeadingHtml(q, questionCounter, 'q-image')}
                  ${
                    q.options
                      ? `
                    <div class="mc-options-grid">
                      <div class="mc-option"><b>A.</b> ${formatMathForHtml(q.options.A)}</div>
                      <div class="mc-option"><b>B.</b> ${formatMathForHtml(q.options.B)}</div>
                      <div class="mc-option"><b>C.</b> ${formatMathForHtml(q.options.C)}</div>
                      <div class="mc-option"><b>D.</b> ${formatMathForHtml(q.options.D)}</div>
                    </div>
                  `
                      : ''
                  }
                </div>
              `;
              })
              .join('')}
          `
              : ''
          }

          <!-- PART II -->
          ${
            part2.length > 0
              ? `
            <div class="part-heading">PHẦN II. Câu trắc nghiệm đúng sai (${part2.length} câu)</div>
            <div class="part-note">Thí sinh trả lời từ câu 1 đến câu ${part2.length}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.</div>
            ${part2
              .map((q) => {
                questionCounter++;
                return `
                <div class="question-box">
                  ${renderQuestionLeadingHtml(q, questionCounter, 'q-image')}
                  ${
                    q.statements
                      ? `
                    <div class="tf-options">
                      <div class="tf-statement"><b>a)</b> ${formatMathForHtml(q.statements.a)}</div>
                      <div class="tf-statement"><b>b)</b> ${formatMathForHtml(q.statements.b)}</div>
                      <div class="tf-statement"><b>c)</b> ${formatMathForHtml(q.statements.c)}</div>
                      <div class="tf-statement"><b>d)</b> ${formatMathForHtml(q.statements.d)}</div>
                    </div>
                  `
                      : ''
                  }
                </div>
              `;
              })
              .join('')}
          `
              : ''
          }

          <!-- PART III -->
          ${
            part3.length > 0
              ? `
            <div class="part-heading">PHẦN III. Câu trắc nghiệm trả lời ngắn (${part3.length} câu)</div>
            <div class="part-note">Thí sinh trả lời từ câu 1 đến câu ${part3.length}. Điền kết quả vào ô tương ứng.</div>
            ${part3
              .map((q) => {
                questionCounter++;
                return `
                <div class="question-box">
                  ${renderQuestionLeadingHtml(q, questionCounter, 'q-image')}
                  <div style="margin-top: 4px; font-style: italic; font-size: 11pt;">
                    <i>Trả lời: ............................................................................................................</i>
                  </div>
                </div>
              `;
              })
              .join('')}
          `
              : ''
          }

          <!-- PART IV -->
          ${
            part4.length > 0
              ? `
            <div class="part-heading">PHẦN IV. Tự luận (${part4.length} câu)</div>
            <div class="part-note">Thí sinh trình bày chi tiết lời giải vào giấy thi.</div>
            ${part4
              .map((q) => {
                questionCounter++;
                return `
                <div class="question-box">
                  ${renderQuestionLeadingHtml(q, questionCounter, 'q-image')}
                </div>
              `;
              })
              .join('')}
          `
              : ''
          }

          <div style="text-align: center; margin-top: 20px; font-weight: bold; font-size: 10.5pt;">
            ----------------- HẾT MÃ ĐỀ ${escapeHtml(code)} -----------------
          </div>
        </div>
      `;
    })
    .join('\n');

  // Build Comparative Answer Matrix
  const maxQuestions = Math.max(...variants.map((v) => v.questions.length));
  let compRows = '';
  for (let qIdx = 0; qIdx < maxQuestions; qIdx++) {
    const qType = variants[0].questions[qIdx]?.type || 'mc';
    const typeLabel = qType === 'mc' ? 'Trắc nghiệm ABCD' : qType === 'tf' ? 'Đúng / Sai' : qType === 'short' ? 'Trả lời ngắn' : 'Tự luận';

    const answersCells = variants
      .map((v) => {
        const q = v.questions[qIdx];
        if (!q) return '<td style="border:1px solid #333; padding:5px; text-align:center;">--</td>';
        if (q.type === 'mc') {
          return `<td style="border:1px solid #333; padding:5px; text-align:center; font-weight:bold; font-size:11pt; color:#1e40af;">${q.correctAnswer || 'A'}</td>`;
        }
        if (q.type === 'tf' && q.correctAnswers) {
          const { a, b, c, d } = q.correctAnswers;
          return `<td style="border:1px solid #333; padding:5px; font-size:9.5pt;">a-${a === 'true' ? 'Đ' : 'S'}, b-${b === 'true' ? 'Đ' : 'S'}, c-${c === 'true' ? 'Đ' : 'S'}, d-${d === 'true' ? 'Đ' : 'S'}</td>`;
        }
        if (q.type === 'short') {
          return `<td style="border:1px solid #333; padding:5px; text-align:center; font-weight:bold; color:#047857;">${q.correctAnswer || '--'}</td>`;
        }
        return `<td style="border:1px solid #333; padding:5px; font-size:9.5pt; font-style:italic;">Theo thang điểm</td>`;
      })
      .join('');

    compRows += `
      <tr>
        <td style="border:1px solid #333; padding:5px; text-align:center; font-weight:bold;">Câu ${qIdx + 1}</td>
        <td style="border:1px solid #333; padding:5px; text-align:center; font-size:10pt;">${typeLabel}</td>
        ${answersCells}
      </tr>
    `;
  }

  const comparativeMatrixHtml = `
    <div class="page-break">
      <div style="text-align: center; margin-top: 20px; margin-bottom: 16px;">
        <h2 style="font-size: 13pt; text-transform: uppercase; margin: 0; color:#1e3a8a;">BẢNG TỔNG HỢP ĐÁP ÁN ĐỐI CHIẾU CÁC MÃ ĐỀ THI</h2>
        <div style="font-size: 10.5pt; margin-top: 4px;">
          ${escapeHtml(baseTitle)} • Các mã đề: <b>${codes.map((c) => escapeHtml(c)).join(' — ')}</b>
        </div>
      </div>

      <table style="width:100%; border-collapse:collapse; font-size:10.5pt;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="border:1px solid #333; padding:6px; width:10%;">Câu số</th>
            <th style="border:1px solid #333; padding:6px; width:22%;">Phân loại</th>
            ${variants.map((v) => `<th style="border:1px solid #333; padding:6px; font-weight:bold; font-size:11pt;">Mã ${escapeHtml(v.code)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${compRows}
        </tbody>
      </table>
    </div>
  `;

  const printHtml = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(baseTitle)} - Bộ ${variants.length} Mã Đề</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
      <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
      <style>
        @page {
          size: A4;
          margin: 16mm 14mm 16mm 14mm;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 12pt;
          line-height: 1.35;
          color: #111;
          background: #fff;
          margin: 0;
          padding: 16px;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
        }
        .header-table td {
          vertical-align: top;
          padding: 2px 4px;
        }
        .exam-title-box {
          text-align: center;
          margin: 10px 0 14px 0;
          border-bottom: 2px solid #000;
          padding-bottom: 6px;
        }
        .student-info-box {
          border: 1px solid #333;
          padding: 5px 10px;
          margin-bottom: 14px;
          font-size: 10.5pt;
        }
        .part-heading {
          font-size: 12pt;
          font-weight: bold;
          margin-top: 14px;
          margin-bottom: 4px;
          border-bottom: 1px solid #555;
          padding-bottom: 2px;
        }
        .part-note {
          font-style: italic;
          font-size: 10.5pt;
          margin-bottom: 8px;
        }
        .question-box {
          margin-bottom: 10px;
          text-align: justify;
        }
        .q-stem-lead {
          margin-bottom: 2px;
        }
        .q-stem {
          font-style: italic;
          color: #333;
          margin-bottom: 2px;
        }
        .q-content {
          font-weight: normal;
          margin-top: 2px;
          margin-bottom: 3px;
        }
        .mc-options-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px 12px;
          margin-top: 4px;
          margin-bottom: 4px;
        }
        .tf-options {
          margin-left: 16px;
          margin-top: 3px;
        }
        .tf-statement {
          margin-bottom: 2px;
        }
        .page-break {
          page-break-before: always;
        }
        .no-print {
          display: block;
          background: #2563eb;
          color: #fff;
          text-align: center;
          padding: 10px;
          font-weight: bold;
          margin-bottom: 15px;
          border-radius: 6px;
          cursor: pointer;
        }
        @media print {
          .no-print { display: none !important; }
        }
        img.q-image {
          max-width: 400px;
          max-height: 220px;
          display: block;
          margin: 6px auto;
        }
      </style>
    </head>
    <body>
      <div class="no-print" onclick="window.print()">
        Nhấn vào đây để In Đề Thi hoặc Lưu dạng Tệp PDF (Trọn Bộ ${variants.length} Mã Đề)
      </div>

      ${variantsHtml}
      ${comparativeMatrixHtml}

      <script>
        document.addEventListener("DOMContentLoaded", function() {
          renderMathInElement(document.body, {
            delimiters: [
              {left: "$$", right: "$$", display: true},
              {left: "$", right: "$", display: false},
              {left: "\\\\(", right: "\\\\)", display: false},
              {left: "\\\\[", right: "\\\\]", display: true}
            ],
            throwOnError: false
          });
        });
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(printHtml);
  printWindow.document.close();
}


/**
 * EXPORT EXAM RESULTS REPORT TO STANDARD EXCEL (.XLSX) WITH SEPARATE COLUMNS
 */
export function exportResultsToExcel(results: ExamResult[]) {
  if (!results || results.length === 0) {
    throw new Error('Không có dữ liệu bài nộp để xuất tệp Excel!');
  }

  // 1. Prepare Main Sheet Data (Mỗi thông tin là một cột riêng biệt, chuẩn số liệu Excel)
  const excelData = results.map((r, index) => {
    const scoreNum = Number(r.score) || 0;
    let rank = 'Chưa xếp loại';
    if (scoreNum >= 8.0) rank = 'Giỏi';
    else if (scoreNum >= 6.5) rank = 'Khá';
    else if (scoreNum >= 5.0) rank = 'Trung bình';
    else rank = 'Yếu / Chưa đạt';

    const status = scoreNum >= 5.0 ? 'Đạt' : 'Chưa đạt';

    return {
      'STT': index + 1,
      'Số Báo Danh (SBD)': r.studentSbd || 'SBD-' + String(index + 1).padStart(4, '0'),
      'Họ Và Tên Thí Sinh': r.studentName || 'Thí sinh tự do',
      'Lớp / Trường': r.studentClass || 'Tự do',
      'Mã Đề Thi': r.examCode || '',
      'Tên Đề Thi': r.examTitle || '',
      'Điểm Tổng (Thang 10)': scoreNum,
      'Điểm Phần I (Trắc nghiệm)': r.scoreBreakdown?.part1Earned !== undefined ? r.scoreBreakdown.part1Earned : '',
      'Điểm Phần II (Đúng/Sai)': r.scoreBreakdown?.part2Earned !== undefined ? r.scoreBreakdown.part2Earned : '',
      'Điểm Phần III (Trả lời ngắn)': r.scoreBreakdown?.part3Earned !== undefined ? r.scoreBreakdown.part3Earned : '',
      'Xếp Loại': rank,
      'Kết Quả': status,
      'Số Lần Rời Tab (Cảnh báo)': r.tabSwitchCount || 0,
      'Thời Lượng Làm Bài (Giây)': r.durationSpentSeconds || '',
      'Thời Lượng Làm Bài (Phút)': r.durationSpentSeconds ? Math.round((r.durationSpentSeconds / 60) * 10) / 10 : '',
      'Thời Gian Nộp Bài': r.submittedAt && !isNaN(new Date(r.submittedAt).getTime()) ? new Date(r.submittedAt).toLocaleString('vi-VN') : (r.submittedAt || ''),
    };
  });

  // Create Workbook
  const workbook = XLSX.utils.book_new();

  // Create Main Results Sheet
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Set Auto Column Widths for professional Excel display
  const colWidths = [
    { wch: 6 },  // STT
    { wch: 18 }, // Số Báo Danh (SBD)
    { wch: 26 }, // Họ Và Tên Thí Sinh
    { wch: 18 }, // Lớp / Trường
    { wch: 14 }, // Mã Đề Thi
    { wch: 32 }, // Tên Đề Thi
    { wch: 20 }, // Điểm Tổng (Thang 10)
    { wch: 22 }, // Điểm Phần I
    { wch: 22 }, // Điểm Phần II
    { wch: 24 }, // Điểm Phần III
    { wch: 14 }, // Xếp Loại
    { wch: 12 }, // Kết Quả
    { wch: 24 }, // Số Lần Rời Tab
    { wch: 22 }, // Thời Lượng Giây
    { wch: 22 }, // Thời Lượng Phút
    { wch: 22 }, // Thời Gian Nộp Bài
  ];
  worksheet['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Bảng Điểm Chi Tiết');

  // 2. Prepare Summary Analytics Sheet
  const totalStudents = results.length;
  const scores = results.map((r) => Number(r.score) || 0);
  const avgScore = Math.round((scores.reduce((a, b) => a + b, 0) / Math.max(1, totalStudents)) * 100) / 100;
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const passCount = scores.filter((s) => s >= 5.0).length;
  const failCount = totalStudents - passCount;
  const passRate = Math.round((passCount / Math.max(1, totalStudents)) * 100);

  const summaryData = [
    { 'Chỉ Số Thống Kê': 'Tổng số lượt thí sinh nộp bài', 'Giá Trị': totalStudents, 'Đơn Vị': 'Thí sinh' },
    { 'Chỉ Số Thống Kê': 'Điểm trung bình toàn bài', 'Giá Trị': avgScore, 'Đơn Vị': 'Điểm' },
    { 'Chỉ Số Thống Kê': 'Điểm cao nhất (Max)', 'Giá Trị': maxScore, 'Đơn Vị': 'Điểm' },
    { 'Chỉ Số Thống Kê': 'Điểm thấp nhất (Min)', 'Giá Trị': minScore, 'Đơn Vị': 'Điểm' },
    { 'Chỉ Số Thống Kê': 'Số thí sinh đạt (>= 5.0đ)', 'Giá Trị': passCount, 'Đơn Vị': 'Thí sinh' },
    { 'Chỉ Số Thống Kê': 'Số thí sinh chưa đạt (< 5.0đ)', 'Giá Trị': failCount, 'Đơn Vị': 'Thí sinh' },
    { 'Chỉ Số Thống Kê': 'Tỉ lệ đạt tốt nghiệp / môn học', 'Giá Trị': `${passRate}%`, 'Đơn Vị': '%' },
    { 'Chỉ Số Thống Kê': 'Thời điểm xuất báo cáo', 'Giá Trị': new Date().toLocaleString('vi-VN'), 'Đơn Vị': 'Ngày giờ' },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Tổng Hợp Phổ Điểm');

  // Generate and download XLSX file
  const fileName = `BangDiem_KetQuaThi_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
