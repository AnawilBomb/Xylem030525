// nav.js
const createNavBar = () => {
    const navHTML = `
      <nav class="navbar">
        <ul>
          <li>
            <a href="#" id="sidebar-toggle">
                <span class="material-symbols-rounded">menu</span> 
              
            </a>
          </li>
          <li>
            <a href="HOME.html">
               <span class="material-symbols-rounded">home</span>
               Home
            </a>
          </li>

          <li>
            <a href="Chat.html">
               <span class="material-symbols-rounded">chat</span>
              Chatbot
            </a>
          </li>
        </ul>
      </nav>
    `;
  
    // Insert the navigation bar at the start of the body
    document.body.insertAdjacentHTML('afterbegin', navHTML);
  };
  
  // Execute when DOM is fully loaded
  document.addEventListener('DOMContentLoaded', createNavBar);