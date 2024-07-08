let globalPdfData;
let ocrAttempts = 0;

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', (event) => {
        showPreview(event);
    });
});

function showPreview(event) {
    const preview = document.getElementById('preview');
    const file = event.target.files[0];
    const reader = new FileReader();

    if (file) {
        if (file.type === 'application/pdf') {
            reader.onload = function(e) {
                globalPdfData = new Uint8Array(e.target.result);
                renderPDF(globalPdfData, 1.7);
            }
            reader.readAsArrayBuffer(file);
        } else {
            preview.innerHTML = 'Tipo de archivo no soportado para previsualización';
        }
    }
}

async function renderPDF(pdfData, scale) {
    const pdfjsLib = window['pdfjs-dist/build/pdf'];
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    
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

async function performOCR(canvas) {
    try {
        const { data: { text } } = await Tesseract.recognize(
            canvas,
            'eng',
            {
                tessedit_char_whitelist: '0123456789', // Solo números
                psm: 6, // Asumir una sola columna de texto variable
                logger: (m) => console.log(m)
            }
        );

        const numbers = text.match(/\d+/g); // Extraer todos los números del texto
        let elevenDigitNumber = '';
        if (numbers) {
            for (let number of numbers) {
                if (number.length === 11) { // Verificar si el número tiene 11 dígitos
                    elevenDigitNumber = number;
                    break; // Detener la búsqueda al encontrar el número de 11 dígitos
                }
            }
        }

        const resultElement = document.getElementById('ocr-result');
        if (elevenDigitNumber) {
            resultElement.innerText = elevenDigitNumber;
            resultElement.style.display = 'block'; // Mostrar el resultado

            // Guardar el PDF con el número obtenido
            savePDFWithNumber(globalPdfData, elevenDigitNumber);
            ocrAttempts = 0; // Reiniciar el contador de intentos
        } else {
            resultElement.style.display = 'none'; // Ocultar el resultado si no se encuentra el número
            await new Promise(resolve => setTimeout(resolve, 3000)); // Esperar 3 segundos

            if (ocrAttempts === 0) {
                ocrAttempts++;
                renderPDF(globalPdfData, 1.798); // Primer reinicio del OCR
            } else if (ocrAttempts === 1) {
                ocrAttempts++;
                renderPDF(globalPdfData, 1.77); // Segundo reinicio del OCR
            }
        }
    } catch (error) {
        console.error('Error en OCR:', error);
    }
}

function savePDFWithNumber(pdfData, number) {
    const blob = new Blob([pdfData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    const confirmDownload = confirm(`¿Deseas descargar el PDF ${number}?`);
    
    if (confirmDownload) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `declaración_No. ${number}.pdf`; // Nombre del archivo con el número
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
    }

    URL.revokeObjectURL(url);
}