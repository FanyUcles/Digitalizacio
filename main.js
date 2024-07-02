function showPreview(event) {
    const preview = document.getElementById('preview');
    const file = event.target.files[0];
    const reader = new FileReader();

    if (file) {
        if (file.type === 'application/pdf') {
            reader.onload = function(e) {
                const pdfData = new Uint8Array(e.target.result);
                renderPDF(pdfData);
            }
            reader.readAsArrayBuffer(file);
        } else {
            preview.innerHTML = 'File type not supported for preview';
        }
    }
}

async function renderPDF(pdfData) {
    const pdfjsLib = window['pdfjs-dist/build/pdf'];
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    
    const scale = 1.7;  // Aumentar la escala para mejor calidad
    const viewport = page.getViewport({ scale: scale });
    const canvas = document.getElementById('pdf-canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
        canvasContext: context,
        viewport: viewport
    };
    await page.render(renderContext).promise;

    const imgData = canvas.toDataURL();
    displayImage(imgData);
    performOCR(canvas);
}

function displayImage(imgData) {
    const preview = document.getElementById('preview');
    const img = document.createElement('img');
    img.src = imgData;
    img.style.width = '100%';
    img.style.height = 'auto';
    preview.innerHTML = '';
    preview.appendChild(img);
}

function performOCR(canvas) {
    const canvasProcessed = document.createElement('canvas');
    const ctx = canvasProcessed.getContext('2d');
    canvasProcessed.width = canvas.width;
    canvasProcessed.height = canvas.height;

    // Dibujar el canvas original en el nuevo canvas
    ctx.drawImage(canvas, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    Tesseract.recognize(
        canvasProcessed,
        'eng',
        {
            logger: (m) => console.log(m)
        }
    ).then(({ data: { text } }) => {
        document.getElementById('ocr-result').innerText = text;
    });
}
