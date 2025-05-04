const dropzone = document.getElementById('dropzone');
const dropzone_certificado = document.getElementById('dropzone_certificado');
const dropzone_archivo_firma= document.getElementById('dropzone_archivo_firma');
const dropzone_certificado_firma= document.getElementById('dropzone_certificado_firma');
const dropzone_firma_firma= document.getElementById('dropzone_firma_firma');
const resultado = document.getElementById('resultado');
let archivos_para_firma = [null,null,null];

addEventsToDropzones();

async function obtenerCertificados() {
    ocultarDropzones();
    document.getElementById('resultado').innerHTML = '';
    try {
      const res = await fetch('http://localhost:3000/certificates');
      const data = await res.json();

      resultado.innerHTML = '';

      data.forEach(cert => {
        const div = document.createElement('div');
        div.className = 'cert';

        if (cert.error) {
          div.innerHTML = `<br><span class="error">${cert.error}</span>`;
        } else {
          div.innerHTML = `
            <b>Sujeto:</b> ${cert.sujeto}<br>
            <b>Válido hasta:</b> ${new Date(cert.valido_hasta).toLocaleString()}<br>
            <b>Serial:</b> ${cert.serial}
          `;
        }

        resultado.appendChild(div);
      });

    } catch (err) {
        resultado.innerHTML = `<p class="error">Error al obtener certificados.</p>`;
      console.error(err);
    }
}

async function obtenerCertificadosRevocados() {
    ocultarDropzones();
    document.getElementById('resultado').innerHTML = '';
    try {
      const res = await fetch('http://localhost:3000/revoked_list');
      const data = await res.json();

      resultado.innerHTML = '';

      data.forEach(cert => {
        const div = document.createElement('div');
        div.className = 'cert';

        if (cert.error) {
          div.innerHTML = `<br><span class="error">${cert.error}</span>`;
        } else {
          div.innerHTML = `
            <b>Sujeto:</b> ${cert.sujeto}<br>
            <b>Válido hasta:</b> ${new Date(cert.valido_hasta).toLocaleString()}<br>
            <b>Serial:</b> ${cert.serial}
          `;
        }

        resultado.appendChild(div);
      });

    } catch (err) {
        resultado.innerHTML = `<p class="error">Error al obtener certificados.</p>`;
      console.error(err);
    }
}

function mostrarDropzone() {
    ocultarDropzones();
    resultado.innerHTML = '';
    dropzone.style.display = 'block';
}

function mostrarDropzoneCertificados(){
    ocultarDropzones();
    resultado.innerHTML = '';
    dropzone_certificado.style.display = 'block';
}

function ocultarDropzones(){
    dropzone.style.display = 'none';
    dropzone.classList.remove('active');
    dropzone_certificado.style.display = 'none';
    dropzone_certificado.classList.remove('active');
    dropzone_archivo_firma.style.display = 'none';
    dropzone_archivo_firma.classList.remove('active');
    dropzone_certificado_firma.style.display = 'none';
    dropzone_certificado_firma.classList.remove('active');
    dropzone_firma_firma.style.display = 'none';
    dropzone_certificado_firma.classList.remove('active');
    dropzone_certificado_firma.style.display = 'none';

}

function mostrarDropzonesFirma(){
    ocultarDropzones();
    resultado.innerHTML = '';
    dropzone_archivo_firma.style.display = 'block';
    dropzone_certificado_firma.style.display = 'block';
    dropzone_firma_firma.style.display = 'block';
}

async function verificarFirma(){
  const formData = new FormData();
  formData.append('document', archivos_para_firma[0]);
  formData.append('signature', archivos_para_firma[1]);
  formData.append('certificate', archivos_para_firma[2]);
  try {
      const res = await fetch('http://localhost:3000/verify', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        resultado.innerHTML = `<strong>Firma válida:</strong> ${data.valid ? 'Sí' : 'No'}`;
      } else {

        resultado.innerHTML = `<span style="color:red;">Error: ${data.error}</span>`;
      }
      archivos_para_firma = [null,null,null];
    } catch (err) {
      console.error(err);
      resultado.innerHTML = `<span style="color:red;">Fallo en la solicitud.</span>`;
    }
}

function setActiveDropzone(dropzone, texto) {
  dropzone.classList.add('active');
  dropzone.textContent = texto;
}

function addEventsToDropzones(){
dropzone.addEventListener('dragover', e => {
  e.preventDefault();
  dropzone.style.borderColor = 'blue';
});

dropzone.addEventListener('dragleave', () => {
  dropzone.style.borderColor = '#666';
});

dropzone_archivo_firma.addEventListener('dragover', e => {
  e.preventDefault();
  dropzone.style.borderColor = 'blue';
});

dropzone_archivo_firma.addEventListener('dragleave', () => {
  dropzone.style.borderColor = '#666';
});
dropzone_certificado.addEventListener('dragover', e => {
  e.preventDefault();
  dropzone.style.borderColor = 'blue';
});

dropzone_certificado.addEventListener('dragleave', () => {
  dropzone.style.borderColor = '#666';
});

dropzone_certificado_firma.addEventListener('dragover', e => {
  e.preventDefault();
  dropzone.style.borderColor = 'blue';
});

dropzone_certificado_firma.addEventListener('dragleave', () => {
  dropzone.style.borderColor = '#666';
});

dropzone_firma_firma.addEventListener('dragover', e => {
  e.preventDefault();
  dropzone.style.borderColor = 'blue';
});

dropzone_firma_firma.addEventListener('dragleave', () => {
  dropzone.style.borderColor = '#666';
});
}

dropzone.addEventListener('drop', async e => {
  e.preventDefault();
  dropzone.style.borderColor = '#666';
  const file = e.dataTransfer.files[0];
  setActiveDropzone(dropzone, file.name);
  if (!file) return;
  const formData = new FormData();
  formData.append('cert', file);
  try {
    const res = await fetch('http://localhost:3000/check-revoked', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    resultado.innerHTML = '';
    if (res.ok) {
      resultado.innerHTML = `
        <strong>Serial:</strong> ${data.serialNumber}<br>
        <strong>Revocado:</strong> ${data.revoked ? 'Sí' : 'No'}
      `;
    } else {
      resultado.innerHTML = `<span style="color:red;">Error: ${data.error}</span>`;
    }
  } catch (err) {
    console.error(err);
    resultado.innerHTML = `<span style="color:red;">Fallo en la solicitud.</span>`;
  }
});

dropzone_certificado.addEventListener('drop', async e => {
  e.preventDefault();
  dropzone_certificado.style.borderColor = '#666';
  const file = e.dataTransfer.files[0];
  setActiveDropzone(dropzone_certificado, file.name);
  if (!file) return;
  const formData = new FormData();
  formData.append('cert', file);
  try {
    const res = await fetch('http://localhost:3000/to-certificate', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (res.ok) {
      resultado.innerHTML = `<strong>✅ ${data.message}</strong>`;
    } else {
      resultado.innerHTML = `<span style="color:red;">Error: ${data.error}</span>`;
    }

  } catch (err) {
    resultado.innerHTML = `<span style="color:red;">Fallo en la solicitud.</span>`;
  }
});

dropzone_archivo_firma.addEventListener('drop', async e => {
    e.preventDefault();
    dropzone_certificado.style.borderColor = '#666';
    const file = e.dataTransfer.files[0];
    setActiveDropzone(dropzone_archivo_firma, file.name);
    if (!file) return;
    archivos_para_firma[0]=file;
    if (!archivos_para_firma.includes(null)) {
        await verificarFirma();
    }
  });

dropzone_certificado_firma.addEventListener('drop', async e => {
  e.preventDefault();
  dropzone_certificado.style.borderColor = '#666';
  const file = e.dataTransfer.files[0];
  setActiveDropzone(dropzone_certificado_firma, file.name);
  if (!file) return;
  archivos_para_firma[2]=file;
  if (!archivos_para_firma.includes(null)) {
      await verificarFirma();
  }
});

dropzone_firma_firma.addEventListener('drop', async e => {
  e.preventDefault();
  dropzone_certificado.style.borderColor = '#666';
  const file = e.dataTransfer.files[0];
  if (!file) return;
  archivos_para_firma[1]=file;
  setActiveDropzone(dropzone_firma_firma, file.name);
  if (!archivos_para_firma.includes(null)) {
      await verificarFirma();
  }
});