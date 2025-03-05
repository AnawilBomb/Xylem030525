document.addEventListener('DOMContentLoaded', () => {
  const uploadModal = document.getElementById('uploadModal');
  const addDocumentBtn = document.getElementById('addDocumentBtn');
  const closeModalBtn = uploadModal.querySelector('.close');
  const cancelButton = document.getElementById('cancelButton');
  const uploadButton = document.getElementById('uploadButton');
  const fileInput = document.getElementById('fileElem');
  const dropArea = document.getElementById('drop-area');
  const gallery = document.getElementById('gallery');
  const progressBar = document.getElementById('progress-bar');

  // Function to open modal
  function openModal() {
      uploadModal.style.display = 'block';
      setTimeout(() => uploadModal.classList.add('show'), 10);
  }

  // Function to close modal
  function closeModal() {
      uploadModal.classList.remove('show');
      setTimeout(() => {
          uploadModal.style.display = 'none';
          resetModal();
      }, 300);
  }

  // Reset modal to initial state
  function resetModal() {
      gallery.innerHTML = '';
      fileInput.value = '';
      progressBar.value = 0;
  }

  // Prevent default drag behaviors
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, preventDefaults, false);
      document.body.addEventListener(eventName, preventDefaults, false);
  });

  // Highlight drop area when item is dragged over
  ['dragenter', 'dragover'].forEach(eventName => {
      dropArea.addEventListener(eventName, highlight, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, unhighlight, false);
  });

  // Handle dropped files
  dropArea.addEventListener('drop', handleDrop, false);

  // Handle file input change
  fileInput.addEventListener('change', handleFiles, false);

  function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
  }

  function highlight() {
      dropArea.classList.add('highlight');
  }

  function unhighlight() {
      dropArea.classList.remove('highlight');
  }

  function handleDrop(e) {
      const dt = e.dataTransfer;
      const files = dt.files;
      handleFiles({target: {files}});
  }

  function handleFiles(e) {
      const files = e.target.files;
      gallery.innerHTML = '';
      progressBar.value = 0;

      for (let file of files) {
          if (file.type === 'application/pdf') {
              const fileItem = document.createElement('div');
              fileItem.innerHTML = `
                  <span>📄</span>
                  <span>${file.name}</span>
                  <small>(${(file.size / 1024).toFixed(2)} KB)</small>
              `;
              gallery.appendChild(fileItem);
          } else {
              alert('Please upload only PDF files');
          }
      }
  }

  // Simulate upload process
  function simulateUpload() {
      let progress = 0;
      const interval = setInterval(() => {
          progress += 10;
          progressBar.value = progress;

          if (progress >= 100) {
              clearInterval(interval);
              setTimeout(() => {
                  alert('Upload completed successfully!');
                  closeModal();
              }, 500);
          }
      }, 200);
  }

  // Event listeners to open and close modal
  addDocumentBtn.addEventListener('click', openModal);
  closeModalBtn.addEventListener('click', closeModal);
  cancelButton.addEventListener('click', closeModal);
  uploadButton.addEventListener('click', simulateUpload);

  // Close modal if user clicks outside of it
  window.addEventListener('click', (event) => {
      if (event.target === uploadModal) {
          closeModal();
      }
  });

  // Escape key to close modal
  window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && uploadModal.classList.contains('show')) {
          closeModal();
      }
  });
});