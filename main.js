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
    
    const scale = 2;  // Aumentar la escala para mejor calidad
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

    // Convertir a escala de grises y binarizar, mientras se convierte colores específicos (como rojo) a negro
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const avg = (r + g + b) / 3;

        // Definir un umbral para detectar rojo y otros colores (esto se puede ajustar)
        if (r > 150 && g < 100 && b < 100) {
            // Convertir tonos rojos a negro
            data[i] = data[i + 1] = data[i + 2] = 0;
        } else {
            // Binarizar la imagen
            data[i] = data[i + 1] = data[i + 2] = avg > 128 ? 255 : 0;
        }
    }

    ctx.putImageData(imageData, 0, 0);

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
