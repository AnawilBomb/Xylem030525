document.addEventListener('DOMContentLoaded', () => {
  const plantModal = document.getElementById('plantModal');
  const addPlantBtn = document.getElementById('addPlantBtn');
  const closeModalBtn = plantModal.querySelector('.close');
  const cancelButton = document.getElementById('cancelButton');
  const savePlantBtn = document.getElementById('savePlantBtn');
  const fileInput = document.getElementById('fileElem');
  const dropArea = document.getElementById('drop-area');
  const gallery = document.getElementById('gallery');
  const progressBar = document.getElementById('progress-bar');
  const imagePreview = document.getElementById('image-preview');

  // Global variables
  let selectedFile = null;
  let editingPlantId = null;

  // Function to open modal
  function openModal(plantData = null) {
    plantModal.style.display = 'block';
    setTimeout(() => plantModal.classList.add('show'), 10);
    
    const modalTitle = plantModal.querySelector('h2');
    const plantNameInput = document.getElementById('plantName');
    const scientificNameInput = document.getElementById('scientificName');
    const descriptionInput = document.getElementById('description');
    
    // Reset form
    resetModal();
    
    if (plantData) {
      // Edit mode
      modalTitle.textContent = 'Edit Plant';
      plantNameInput.value = plantData.plant_name;
      scientificNameInput.value = plantData.scientific_name;
      descriptionInput.value = plantData.description;
      editingPlantId = plantData.plant_id;
      
      // Show current image if exists
      if (plantData.image_url) {
        imagePreview.innerHTML = `<img src="${plantData.image_url}" class="preview-image">`;
      }
    } else {
      // Add mode
      modalTitle.textContent = 'Add New Plant';
      editingPlantId = null;
    }
  }

  // Function to close modal
  function closeModal() {
    plantModal.classList.remove('show');
    setTimeout(() => {
      plantModal.style.display = 'none';
      resetModal();
    }, 300);
  }

  // Reset modal to initial state
  function resetModal() {
    const plantNameInput = document.getElementById('plantName');
    const scientificNameInput = document.getElementById('scientificName');
    const descriptionInput = document.getElementById('description');
    
    plantNameInput.value = '';
    scientificNameInput.value = '';
    descriptionInput.value = '';
    gallery.innerHTML = '';
    imagePreview.innerHTML = '';
    fileInput.value = '';
    progressBar.value = 0;
    selectedFile = null;
    editingPlantId = null;
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
    handleFiles(files);
  }

  function handleFiles(e) {
    let files;
    if (e.dataTransfer) {
        files = e.dataTransfer.files;
    } else if (e.target) {
        files = e.target.files;
    } else {
        files = e;
    }
    
    if (files.length) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            selectedFile = file;
            gallery.innerHTML = '';
            progressBar.value = 0;
            progressBar.style.display = 'block';
            
            const fileItem = document.createElement('div');
            fileItem.innerHTML = `
                <span>🖼️</span>
                <span>${file.name}</span>
                <small>(${(file.size / 1024).toFixed(2)} KB)</small>
            `;
            gallery.appendChild(fileItem);
            
            // Show image preview
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.innerHTML = `<img src="${e.target.result}" class="preview-image">`;
            };
            reader.readAsDataURL(file);
        } else {
            alert('Please upload only image files');
        }
    }
}

  // Function to handle save plant
  async function handleSavePlant() {
    const plantNameInput = document.getElementById('plantName');
    const scientificNameInput = document.getElementById('scientificName');
    const descriptionInput = document.getElementById('description');
    
    const plantName = plantNameInput.value.trim();
    const scientificName = scientificNameInput.value.trim();
    const description = descriptionInput.value.trim();
    
    if (!plantName) {
      alert('Please enter a plant name');
      return;
    }
    
    try {
      const formData = new FormData();
      
      if (editingPlantId) {
        formData.append('plant_id', editingPlantId);
      }
      
      formData.append('plant_name', plantName);
      formData.append('scientific_name', scientificName);
      formData.append('description', description);
      
      if (selectedFile) {
        formData.append('plantImage', selectedFile);
      }
      
      // Show upload progress
      const xhr = new XMLHttpRequest();
      xhr.open('POST', editingPlantId ? '/api/update-plant' : '/api/add-plant', true);
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          progressBar.value = percentComplete;
        }
      };
      
      xhr.onload = async () => {
        if (xhr.status === 200) {
          const result = JSON.parse(xhr.responseText);
          
          // If there's a selected file, upload it separately
          if (selectedFile && result.plant_id) {
            await uploadPlantImage(result.plant_id || editingPlantId);
          }
          
          alert(editingPlantId ? 'Plant updated successfully' : 'Plant added successfully');
          closeModal();
          
          // Trigger a custom event to notify the parent component to refresh
          const event = new CustomEvent('plantDataChanged');
          document.dispatchEvent(event);
        } else {
          alert(`Save failed: ${xhr.statusText}`);
        }
      };
      
      xhr.onerror = () => {
        alert('An error occurred during the upload');
      };
      
      xhr.send(formData);
      
    } catch (error) {
      console.error('Error saving plant:', error);
      alert('Error saving plant. Please try again.');
    }
  }

  // Function to upload plant image
  async function uploadPlantImage(plantId) {
    if (!selectedFile) return;
    
    const formData = new FormData();
    formData.append('plantImage', selectedFile);
    formData.append('plant_id', plantId);
    
    try {
      const response = await fetch('/api/upload-plant-image', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error uploading plant image:', error);
      throw error;
    }
  }

  // Event listeners to open and close modal
  if (addPlantBtn) {
    addPlantBtn.addEventListener('click', () => openModal());
  }
  
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
  }
  
  if (cancelButton) {
    cancelButton.addEventListener('click', closeModal);
  }
  
  if (savePlantBtn) {
    savePlantBtn.addEventListener('click', handleSavePlant);
  }

  // Close modal if user clicks outside of it
  window.addEventListener('click', (event) => {
    if (event.target === plantModal) {
      closeModal();
    }
  });

  // Escape key to close modal
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && plantModal.classList.contains('show')) {
      closeModal();
    }
  });

  // Export functions for external use
  window.PlantModalManager = {
    openModal,
    closeModal,
    resetModal,
    handleFiles,
    handleSavePlant,
    uploadPlantImage
  };
});
