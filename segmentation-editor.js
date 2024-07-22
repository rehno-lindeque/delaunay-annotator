
class SegmentationEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.triangles = [];
    this.selectedTool = 'point'; // Default tool
    this.render();

    // Register events
    // Toolbox selection
    const toolbox = this.shadowRoot.querySelector('annotation-toolbox');
    toolbox.addEventListener('tool-selected', (e) => {
      const { tool, brushLabel } = e.detail;
      console.log('Selected tool:', tool, 'Brush label:', brushLabel);
      this.selectedTool = tool;
      const delaunayEditor = this.shadowRoot.querySelector('delaunay-editor');
      if (delaunayEditor) {
        delaunayEditor.setAttribute('selected-tool', tool);
        if (brushLabel) {
          delaunayEditor.setAttribute('brush-label', brushLabel);
        }
      }
    });

    // Image url changed
    this.shadowRoot.querySelector('#image-url-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.loadImage();
      }
    });

    // Preview action
    this.shadowRoot.querySelector('#preview-action').addEventListener('click', async () => {
      const delaunayEditor = this.shadowRoot.querySelector('delaunay-editor');
      if (delaunayEditor) {
        try {
          const blob = await delaunayEditor.renderToImageBlob();
          const url = URL.createObjectURL(blob);
          this.shadowRoot.querySelector('#preview').src = url;
        } catch (error) {
          console.error('Error rendering image:', error);
        }
      }
    });
    // Retrieve action
    this.shadowRoot.querySelector('#retrieve-action').addEventListener('click', () => {
      const url = 'https://gpu-server.tiger-jazz.ts.net:4443/samples/372768ef-fe67-4a59-a6aa-6e32b363789d/segmentation';
      this.shadowRoot.querySelector('#preview').src = url;
    });
    this.shadowRoot.querySelector('#render-upload').addEventListener('click', async () => {
      const delaunayEditor = this.shadowRoot.querySelector('delaunay-editor');
      if (delaunayEditor) {
        try {
          const blob = await delaunayEditor.renderToImageBlob();
          const presignedUrl = await this.getPresignedUploadUrl('rendered-image.png');
          if (presignedUrl) {
            await this.uploadImageToS3(presignedUrl, blob);
          }
        } catch (error) {
          console.error('Error rendering and uploading image:', error);
        }
      }
    });
  }

  loadImage() {
    const imageUrl = this.shadowRoot.querySelector('#image-url-input').value;
    const img = this.shadowRoot.querySelector('#sample-image');
    img.onload = () => {
      const width = img.width;
      const height = img.height;
      const imageContainer = this.shadowRoot.querySelector('#image-container');
      img.width = width;
      img.height = height;

      const delaunayEditor = document.createElement('delaunay-editor');
      delaunayEditor.setAttribute('width', width);
      delaunayEditor.setAttribute('height', height);
      delaunayEditor.style.position = 'absolute';
      delaunayEditor.style.top = 0;
      delaunayEditor.style.left = 0;

      imageContainer.appendChild(img);
      delaunayEditor.setAttribute('width', width);
      delaunayEditor.setAttribute('height', height);
      imageContainer.appendChild(delaunayEditor);
    };
    img.src = imageUrl;
  }

  render() {
    this.shadowRoot.innerHTML = `
    <style>
      annotation-toolbox {
          background-color: #f0f0f0;
          border-right: 1px solid #ccc;
          height: 100%;
      }
      .control-bar {
          display: flex;
          align-items: center;
          padding: .5em;
          background-color: #f0f0f0;
          border-bottom: 1px solid #ccc;
          flex: 0 0 auto;
      }
      .control-bar input {
        flex: 1;
        margin-right: .5Em;
      }
      .image-container {
          position: relative;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          margin-top: 3em; /* Adjust based on control bar height */
          margin-left: 3em; /* Adjust based on toolbox width */
      }
      .preview-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 1em;
      }
      img#preview {
        /* checkerboard background */
        background: repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%)       50% / 20px 20px;
      }
    </style>
    <div class="control-bar">
      <input id="image-url-input" type="url" placeholder="Enter image URL" pattern="https://.*">
      <button id="render-upload">Render and Upload</button>
    </div>
    <div style="display: flex; flex: 1;">
      <annotation-toolbox></annotation-toolbox>
      <div id="image-container" style="flex: 1; position: relative;">
        <img id="sample-image" style="user-select: none;">
      </div>
      <div class="preview-container">
        <button id="preview-action">Preview png</button>
        <button id="retrieve-action">Retrieve Segmentation</button>
        <img id="preview" width="800" height="800"></img>
      </div>
    </div>
    `;
  }

  async getPresignedUploadUrl(filename) {                                 
    try {
      const response = await fetch('https://gpu-server.tiger-jazz.ts.net:4443/samples/372768ef-fe67-4a59-a6aa-6e32b363789d/segmentation/upload');
      if (!response.ok) {
          throw new Error('Failed to fetch presigned URL');
      }
      const data = await response.json();
      return data.uploadUrl;
    } catch (error) {
      console.error('Error getting presigned URL:', error);
      return null;
    }
  }

  async uploadImageToS3(url, file) {                                
    try {
      const response = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': 'image/png' },
      });

      if (response.ok) {
        console.log('Upload successful');
      } else {
        console.error('Upload failed', response.statusText);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  }
}

customElements.define('segmentation-editor', SegmentationEditor);
